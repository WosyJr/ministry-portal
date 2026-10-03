const https = require('https');
const fs = require('fs');
const path = require('path');
const C = require('./config');

const OWNER = process.env.RELEASE_OWNER || 'WosyJr';
const REPO = process.env.RELEASE_REPO || 'ministry-portal-app';
const FILE = 'MinistryPortalSetup.exe';
const LOCAL = () => path.join(__dirname, '..', 'public', 'downloads', FILE);
const LIFE = 600000;

let cache = { at: 0, data: null };

function localCopy() {
  try {
    const p = LOCAL();
    const st = fs.statSync(p);
    if (st.isFile() && st.size > 0) return { kind: 'local', path: p, size: st.size, at: st.mtime.toISOString(), version: '' };
  } catch (_) {}
  return null;
}

function api(urlStr) {
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': 'ministry-portal', Accept: 'application/vnd.github+json' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
    const req = https.get(urlStr, { headers, timeout: 8000 }, res => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('GitHub answered ' + res.statusCode)); }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', d => { body += d; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    });
    req.on('timeout', () => { req.destroy(new Error('GitHub did not answer in time')); });
    req.on('error', reject);
  });
}

async function fromGithub() {
  const rel = await api(`https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`);
  const assets = Array.isArray(rel.assets) ? rel.assets : [];
  const exe = assets.find(a => /\.exe$/i.test(a.name || '')) || null;
  if (!exe) return null;
  return {
    kind: 'github',
    url: process.env.GITHUB_TOKEN ? exe.url : exe.browser_download_url,
    name: exe.name,
    size: exe.size,
    version: String(rel.tag_name || '').replace(/^v/, ''),
    at: rel.published_at || rel.created_at || ''
  };
}

async function latest(force) {
  const local = localCopy();
  if (local) return local;
  if (!force && cache.data && Date.now() - cache.at < LIFE) return cache.data;
  if (!force && !cache.data && Date.now() - cache.at < 60000) return null;
  try {
    const found = await fromGithub();
    cache = { at: Date.now(), data: found };
    return found;
  } catch (_) {
    cache = { at: Date.now(), data: cache.data };
    return cache.data;
  }
}

function stream(info, res) {
  if (info.kind === 'local') {
    res.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
    res.setHeader('Content-Length', info.size);
    res.setHeader('Content-Disposition', `attachment; filename="${FILE}"`);
    return fs.createReadStream(info.path).pipe(res);
  }
  const headers = { 'User-Agent': 'ministry-portal' };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
    headers.Accept = 'application/octet-stream';
  }
  const hop = (target, left) => {
    if (left < 0) { res.status(502).end(); return; }
    https.get(target, { headers, timeout: 15000 }, up => {
      if (up.statusCode >= 300 && up.statusCode < 400 && up.headers.location) {
        up.resume();
        return hop(up.headers.location, left - 1);
      }
      if (up.statusCode !== 200) { up.resume(); res.status(502).end(); return; }
      res.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
      if (up.headers['content-length']) res.setHeader('Content-Length', up.headers['content-length']);
      res.setHeader('Content-Disposition', `attachment; filename="${FILE}"`);
      up.pipe(res);
    }).on('error', () => { if (!res.headersSent) res.status(502).end(); });
  };
  hop(info.url, 5);
}

function size(n) {
  const b = Number(n) || 0;
  if (!b) return '';
  if (b >= 1073741824) return (b / 1073741824).toFixed(1) + ' GB';
  if (b >= 1048576) return Math.round(b / 1048576) + ' MB';
  return Math.round(b / 1024) + ' KB';
}

module.exports = { latest, stream, size, FILE, OWNER, REPO };
