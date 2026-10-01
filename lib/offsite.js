const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const C = require('./config');
const S = require('./store');

const STATE = 'offsite-state.json';
const NEVER = ['finance-vault.json'];

const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data, 'utf8').digest();

function settings() {
  return {
    endpoint: String(C.OFFSITE_ENDPOINT || '').replace(/\/$/, ''),
    bucket: String(C.OFFSITE_BUCKET || ''),
    keyId: String(C.OFFSITE_KEY_ID || ''),
    secret: String(C.OFFSITE_SECRET || ''),
    region: String(C.OFFSITE_REGION || 'auto'),
    prefix: String(C.OFFSITE_PREFIX || 'ministry').replace(/^\/|\/$/g, ''),
    passphrase: String(C.OFFSITE_PASSPHRASE || ''),
    includeBank: String(C.OFFSITE_INCLUDE_BANK || '') === 'yes'
  };
}

function configured() {
  const s = settings();
  return !!(s.endpoint && s.bucket && s.keyId && s.secret);
}

function signingKey(secret, date, region, service) {
  return hmac(hmac(hmac(hmac('AWS4' + secret, date), region), service), 'aws4_request');
}

function signedHeaders(method, url, body, s, extra) {
  const u = new URL(url);
  const now = new Date();
  const amz = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const day = amz.slice(0, 8);
  const payload = sha256(body);

  const headers = Object.assign({
    host: u.host,
    'x-amz-content-sha256': payload,
    'x-amz-date': amz
  }, extra || {});

  const names = Object.keys(headers).map(k => k.toLowerCase()).sort();
  const canonHeaders = names.map(k => {
    const key = Object.keys(headers).find(h => h.toLowerCase() === k);
    return k + ':' + String(headers[key]).trim().replace(/\s+/g, ' ') + '\n';
  }).join('');
  const signed = names.join(';');

  const canonUri = u.pathname.split('/').map(seg => encodeURIComponent(decodeURIComponent(seg))).join('/');
  const canonQuery = [...u.searchParams.entries()].sort()
    .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');

  const canon = [method, canonUri, canonQuery, canonHeaders, signed, payload].join('\n');
  const scope = `${day}/${s.region}/s3/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amz, scope, sha256(canon)].join('\n');
  const sig = crypto.createHmac('sha256', signingKey(s.secret, day, s.region, 's3')).update(toSign, 'utf8').digest('hex');

  headers.Authorization = `AWS4-HMAC-SHA256 Credential=${s.keyId}/${scope}, SignedHeaders=${signed}, Signature=${sig}`;
  return { headers, canon, toSign, sig };
}

async function put(key, body, contentType) {
  const s = settings();
  if (!configured()) throw new Error('No off-site store is set up.');
  const url = `${s.endpoint}/${s.bucket}/${key}`;
  const { headers } = signedHeaders('PUT', url, body, s, { 'content-type': contentType || 'application/octet-stream' });
  const r = await fetch(url, { method: 'PUT', headers, body });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`The store refused it (${r.status}). ${String(t).slice(0, 200)}`);
  }
  return key;
}

function dataFiles() {
  const dir = C.DATA_DIR;
  const out = {};
  const walk = (d, rel) => {
    let names = [];
    try { names = fs.readdirSync(d); } catch (_) { return; }
    names.forEach(n => {
      const full = path.join(d, n);
      const r = rel ? rel + '/' + n : n;
      let st;
      try { st = fs.statSync(full); } catch (_) { return; }
      if (st.isDirectory()) {
        if (n === 'vault') return;
        walk(full, r);
        return;
      }
      if (!/\.(json|jsonl)$/i.test(n)) return;
      if (st.size > 12 * 1024 * 1024) { out[r] = { skipped: 'too large', bytes: st.size }; return; }
      try { out[r] = JSON.parse(fs.readFileSync(full, 'utf8')); }
      catch (_) {
        try { out[r] = fs.readFileSync(full, 'utf8').split('\n').filter(Boolean).slice(-5000); } catch (__) {}
      }
    });
  };
  walk(dir, '');
  return out;
}

function bundle() {
  const s = settings();
  const files = dataFiles();
  const left = [];
  if (!s.includeBank) {
    Object.keys(files).forEach(k => {
      if (NEVER.includes(path.basename(k))) { delete files[k]; left.push(path.basename(k)); }
    });
  }
  let docket = null;
  try { docket = require('./vault').rows(); } catch (_) {}
  return {
    body: {
      ministry: 'Civil & Administrative Affairs',
      takenAt: new Date().toISOString(),
      docket: { count: Array.isArray(docket) ? docket.length : 0, rows: docket || [] },
      files
    },
    left
  };
}

function encrypt(buf, passphrase) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(passphrase, salt, 32);
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const out = Buffer.concat([c.update(buf), c.final()]);
  const tag = c.getAuthTag();
  return Buffer.concat([Buffer.from('MINV1'), salt, iv, tag, out]);
}

function decrypt(buf, passphrase) {
  if (buf.slice(0, 5).toString() !== 'MINV1') throw new Error('That is not a Ministry bundle.');
  const salt = buf.slice(5, 21);
  const iv = buf.slice(21, 33);
  const tag = buf.slice(33, 49);
  const key = crypto.scryptSync(passphrase, salt, 32);
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(buf.slice(49)), d.final()]);
}

function stamp(d) {
  const t = d || new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

function state() {
  const d = S.read(STATE, {});
  return {
    configured: configured(),
    encrypted: !!settings().passphrase,
    includeBank: settings().includeBank,
    bucket: settings().bucket,
    prefix: settings().prefix,
    where: settings().endpoint ? new URL(settings().endpoint).host : '',
    lastDay: d.lastDay || '',
    lastAt: d.lastAt || '',
    lastKey: d.lastKey || '',
    lastBytes: Number(d.lastBytes) || 0,
    lastRecords: Number(d.lastRecords) || 0,
    lastError: d.lastError || '',
    runs: Array.isArray(d.runs) ? d.runs.slice(-14) : []
  };
}

async function send(by) {
  const s = settings();
  if (!configured()) throw new Error('No off-site store is set up. The Ministry needs an endpoint, a bucket and a key.');
  const { body, left } = bundle();
  const json = Buffer.from(JSON.stringify(body));
  let out = zlib.gzipSync(json, { level: 9 });
  let ext = 'json.gz';
  if (s.passphrase) { out = encrypt(out, s.passphrase); ext = 'json.gz.enc'; }

  const day = stamp();
  const key = `${s.prefix}/docket-${day}.${ext}`;
  await put(key, out, s.passphrase ? 'application/octet-stream' : 'application/gzip');
  await put(`${s.prefix}/latest.${ext}`, out, s.passphrase ? 'application/octet-stream' : 'application/gzip');

  const entry = {
    at: new Date().toISOString(), day, key, bytes: out.length,
    records: body.docket.count, files: Object.keys(body.files).length,
    by: (by && by.name) || 'the Ministry', left
  };
  S.update(STATE, {}, d => {
    d.lastDay = day; d.lastAt = entry.at; d.lastKey = key;
    d.lastBytes = out.length; d.lastRecords = entry.records; d.lastError = '';
    d.runs = (Array.isArray(d.runs) ? d.runs : []).concat([entry]).slice(-30);
  });
  return entry;
}

async function sendQuiet(by) {
  try { return await send(by); }
  catch (e) {
    S.update(STATE, {}, d => { d.lastError = String(e.message).slice(0, 300); d.lastErrorAt = new Date().toISOString(); });
    return null;
  }
}

function dueToday() {
  if (!configured()) return false;
  return S.read(STATE, {}).lastDay !== stamp();
}

let timer = null;
function begin() {
  if (timer || !configured()) return false;
  const tick = () => { if (dueToday()) sendQuiet(null); };
  setTimeout(tick, 90 * 1000);
  timer = setInterval(tick, 60 * 60 * 1000);
  if (timer.unref) timer.unref();
  return true;
}

async function check(by) {
  const s = settings();
  if (!configured()) throw new Error('No off-site store is set up.');
  const key = `${s.prefix}/.check`;
  const body = Buffer.from('The Ministry reached this store at ' + new Date().toISOString() + '\n');
  await put(key, body, 'text/plain');
  return { key, host: new URL(s.endpoint).host, bucket: s.bucket };
}

module.exports = { configured, settings, state, send, sendQuiet, check, dueToday, begin, bundle, encrypt, decrypt, put, signedHeaders, stamp };
