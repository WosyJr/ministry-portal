const C = require('./config');
const G = require('./google');
const S = require('./store');
const U = require('./users');
const Ranks = require('./ranks');
const Settings = require('./settings');
const { BY_KEY } = require('./forms');
const { DEPTS } = require('./content');
const { build } = require('./docgen');
const { formatDate, roman, fromRoman, MONTHS } = require('./skyrim');

const STATUSES = ['Received', 'Open', 'Under Review', 'Awaiting Seal', 'Returned', 'Referred', 'Revoked', 'Closed', 'Archived'];
const CLOSED = ['Closed', 'Archived', 'Revoked'];
const PUBLIC_STATUS = { Received: 'Received', Open: 'Under Review', 'Under Review': 'Under Review', 'Awaiting Seal': 'Under Review', Returned: 'Under Review', Referred: 'Referred', Closed: 'Closed', Archived: 'Closed', Revoked: 'Closed' };
const FOLDER_KEY = Object.fromEntries(Object.entries(C.FOLDER_NAMES).map(([k, v]) => [v, k]));

const clean = (s, max = 6000) => String(s ?? '').replace(/\r/g, '').slice(0, max).trim();
const now = () => new Date().toISOString();

let cache = { at: 0, rows: null };
async function all(force) {
  if (!G.connected()) return null;
  if (!force && cache.rows && Date.now() - cache.at < 8000) return cache.rows;
  const rows = await G.readDocket();
  cache = { at: Date.now(), rows };
  return rows;
}
async function allOrNull() { try { return await all(); } catch (e) { console.error(e.message); return null; } }
function invalidate() { cache.at = 0; }

function meta(r) { try { return JSON.parse(r.Fields || '{}') || {}; } catch (_) { return {}; } }
function docId(r) { return r['Doc Id'] || ((r.Document || '').match(/\/d\/([\w-]+)/) || [])[1] || ''; }
function links(r) { return String(r.Linked || '').split(',').map(s => s.trim()).filter(Boolean); }
function folderKey(r) { return FOLDER_KEY[r.Folder] || ''; }
function isClosed(r) { return CLOSED.includes(r.Status); }

function foldersFor(u) {
  if (!u) return new Set();
  if (u.all || Ranks.can(u, 'allrecords')) return new Set(Object.keys(C.FOLDERS));
  const set = new Set();
  DEPTS.filter(d => (u.depts || []).includes(d.id)).forEach(d => d.folders.forEach(f => set.add(f)));
  if (Ranks.can(u, 'training')) { set.add('manuals'); set.add('templates'); }
  return set;
}

function requests() { return S.read('requests.json', []); }
function granted(u) {
  const set = new Set();
  if (!u) return set;
  requests().filter(q => q.by === u.username && q.status === 'Released').forEach(q => (q.released || []).forEach(n => set.add(n)));
  return set;
}

function canSee(u, r) {
  if (!u || !r) return false;
  if (u.all || Ranks.can(u, 'allrecords')) return true;
  if (r['Assigned To'] === u.username) return true;
  const m = meta(r);
  if (m.filer && m.filer === u.username) return true;
  if (granted(u).has(r['Record No'])) return true;
  if (Ranks.can(u, 'docket')) {
    const fk = folderKey(r);
    return DEPTS.some(d => (u.depts || []).includes(d.id) && d.folders.includes(fk));
  }
  return false;
}
async function visible(u) {
  const rows = await allOrNull();
  return rows === null ? null : rows.filter(r => canSee(u, r));
}

function parseRecordNo(input, cls) {
  const s = String(input || '').trim().replace(/\s+/g, ' ');
  const m = /^(?:(.*?)\s+)?(?:no\.?\s*)?([ivxlcdm]+|\d+)$/i.exec(s);
  if (!m) return null;
  const n = /^\d+$/.test(m[2]) ? parseInt(m[2], 10) : fromRoman(m[2]);
  if (!n) return null;
  const c = (m[1] || cls || '').trim();
  return { cls: c, n };
}

function parseInput(form, body) {
  const fIn = (body && body.f) || {}, dIn = (body && body.d) || {}, gIn = (body && body.g) || {};
  const fields = {}, missing = [];
  const input = { f: {}, d: {}, g: {}, sig: [], recordDate: {} };
  for (const s of form.sections) {
    if (s.kv) for (const fl of s.kv) {
      if (fl.type === 'text') { fields[fl.id] = clean(fIn[fl.id], 300); input.f[fl.id] = fields[fl.id]; }
      if (fl.type === 'options') { fields[fl.id] = fl.options.includes(fIn[fl.id]) ? fIn[fl.id] : ''; input.f[fl.id] = fields[fl.id]; }
      if (fl.type === 'date') {
        const d = dIn[fl.id] || {};
        input.d[fl.id] = { day: clean(d.day, 3), month: clean(d.month, 3), year: clean(d.year, 4) };
        fields[fl.id] = formatDate(d.day, d.month, d.year);
      }
      if (fl.required && !fields[fl.id]) missing.push(fl.label);
    }
    if (s.lines) { fields[s.id] = clean(fIn[s.id]); input.f[s.id] = fields[s.id]; }
    if (s.grid) {
      const rows = [];
      for (let i = 0; i < (s.rows || 5) + 6; i++) {
        const row = s.grid.map((_, j) => clean(gIn[s.id] && gIn[s.id][i] && gIn[s.id][i][j], 300));
        if (i < (s.rows || 5) || row.some(Boolean)) rows.push(row);
      }
      fields[s.id] = rows;
      input.g[s.id] = rows;
    }
  }
  const rd = (body && body.recordDate) || {};
  input.recordDate = { day: clean(rd.day, 3), month: clean(rd.month, 3), year: clean(rd.year, 4) };
  const recordDate = formatDate(rd.day, rd.month, rd.year);
  if (!recordDate) missing.push('Date of Record');
  input.sig = form.sig.map((_, i) => clean(body && body.sig && body.sig[i], 160));
  return { input, fields, missing, recordDate, sigNames: input.sig };
}

function signetFor(username) {
  const u = username && U.find(username);
  if (!u || !u.signet) return null;
  return { text: u.signet.text || '', img: Settings.loadImage(u.signet.img) };
}
function sealFor(sealer, fallbackName) {
  if (!sealer && !fallbackName) return null;
  const custom = sealer && sealer.all ? Settings.ministerSeal() : null;
  const im = custom || Settings.ministryWax();
  const who = sealer ? `${sealer.name}, ${sealer.title}` : fallbackName;
  return { ...im, label: 'Sealed under the hand of ' + who };
}
function docState(status) { return status === 'Archived' ? 'Archived' : CLOSED.includes(status) ? 'Closed' : 'Open'; }

function pack(m) {
  const s = JSON.stringify(m);
  if (s.length < 48000) return s;
  const { input, ...rest } = m;
  return JSON.stringify({ ...rest, tooLong: true });
}

async function peekNumber(cls, rows) {
  const max = rows.filter(r => r.Class === cls).reduce((m, r) => Math.max(m, parseInt(r.Number, 10) || 0), 0);
  const counters = S.read('counters.json', {});
  return Math.max(max, counters[cls] || 0) + 1;
}
function commitNumber(cls, n) { S.update('counters.json', {}, c => { c[cls] = Math.max(c[cls] || 0, n); }); }

function holdOf(value) { return Ranks.HOLD_BY_ID[value] ? Ranks.HOLD_BY_ID[value].name : (Ranks.HOLD_BY_NAME[value] ? value : ''); }

async function file({ form, parsed, by, hold, linked, makePublic, status, noSeal, extraMeta }) {
  return G.serial(async () => {
    const rows = await G.readDocket();
    const n = await peekNumber(form.num, rows);
    const recordNo = `${form.num} ${roman(n)}`;
    const fields = parsed.fields;
    const subject = fields[form.subject] || form.title;
    const selfseal = !!by && !noSeal && Ranks.can(by, 'selfseal');
    const st = status || (!selfseal && by && !noSeal ? 'Awaiting Seal' : form.key === 'petition' ? 'Received' : 'Open');
    const filedBy = by ? `${by.name}, ${by.title}` : 'The Petition Box of the Ministry';
    const seal = selfseal ? sealFor(by) : (st === 'Awaiting Seal' ? false : null);
    const signet = by ? signetFor(by.username) : null;
    const buffer = await build(form, { fields, recordNo, recordDate: parsed.recordDate, filedBy, sigNames: parsed.sigNames, seal, signet, state: docState(st) });
    const doc = await G.uploadAsGoogleDoc(buffer, `${recordNo} — ${subject}`.slice(0, 180), C.FOLDERS[form.folder]);
    const m = { v: 1, input: parsed.input, filer: by ? by.username : '', filedBy, sealer: selfseal ? by.username : '', ...(extraMeta || {}) };
    const row = {
      'Record No': recordNo, Class: form.num, Number: n, 'Date (4E)': parsed.recordDate, Subject: subject, 'Filed By': filedBy,
      Folder: C.FOLDER_NAMES[form.folder], Document: doc.webViewLink, Status: st, Public: makePublic ? 'Yes' : 'No',
      Summary: form.summary ? String(fields[form.summary] || '').slice(0, 4000) : '', 'Filed At (UTC)': now(), Form: form.key,
      Hold: holdOf(hold), 'Assigned To': '', Linked: (linked || []).join(', '), 'Sealed By': selfseal ? by.name : '', 'Doc Id': doc.id,
      'Closed At (UTC)': CLOSED.includes(st) ? now() : '', 'Updated At (UTC)': now(), Fields: pack(m)
    };
    await G.appendDocket(row);
    commitNumber(form.num, n);
    for (const other of linked || []) {
      const o = rows.find(x => x['Record No'] === other);
      if (o && !links(o).includes(recordNo)) await G.updateRow(o.row, { Linked: [...links(o), recordNo].join(', ') });
    }
    invalidate();
    return row;
  });
}

async function mutate(no, fn) {
  return G.serial(async () => {
    const rows = await G.readDocket();
    const r = rows.find(x => x['Record No'] === no);
    if (!r) throw new Error('No such record is upon the Docket.');
    const out = await fn(r, rows);
    invalidate();
    return out;
  });
}

async function regenerate(r, m, parsed, extra = {}) {
  const form = BY_KEY[r.Form];
  if (!form) throw new Error('This record was not filed through the hall and cannot be rebuilt here.');
  const status = extra.status || r.Status;
  const sealerName = extra.sealer !== undefined ? extra.sealer : m.sealer;
  let seal = null;
  if (sealerName) seal = sealFor(U.sessionUser(sealerName), r['Sealed By'] || 'an officer of the Ministry');
  else if (status === 'Awaiting Seal') seal = false;
  const buffer = await build(form, { fields: parsed.fields, recordNo: r['Record No'], recordDate: parsed.recordDate, filedBy: m.filedBy || r['Filed By'], sigNames: parsed.sigNames, seal, signet: signetFor(m.filer), state: docState(status) });
  const subject = parsed.fields[form.subject] || form.title;
  const doc = await G.uploadAsGoogleDoc(buffer, `${r['Record No']} — ${subject}`.slice(0, 180), C.FOLDERS[form.folder]);
  const old = docId(r);
  if (old && old !== doc.id) { try { await G.trash(old); } catch (e) { console.error('trash failed', e.message); } }
  return { doc, subject, summary: form.summary ? String(parsed.fields[form.summary] || '').slice(0, 4000) : r.Summary };
}

async function edit(no, body, hold, by) {
  return mutate(no, async r => {
    const form = BY_KEY[r.Form];
    if (!form) throw new Error('This record was not filed through the hall and cannot be edited here.');
    const parsed = parseInput(form, body);
    if (parsed.missing.length) throw new Error('Before sealing, fill in: ' + parsed.missing.join(', ') + '.');
    const m = meta(r);
    const out = await regenerate(r, m, parsed);
    m.input = parsed.input;
    m.edits = (m.edits || []).concat([{ by: by.username, at: now() }]).slice(-20);
    await G.updateRow(r.row, { Subject: out.subject, Summary: out.summary, 'Date (4E)': parsed.recordDate, Hold: holdOf(hold), Document: out.doc.webViewLink, 'Doc Id': out.doc.id, 'Updated At (UTC)': now(), Fields: pack(m) });
    return r['Record No'];
  });
}

async function approve(no, by) {
  return mutate(no, async r => {
    if (r.Status !== 'Awaiting Seal') throw new Error('That record is not awaiting a seal.');
    const m = meta(r);
    const form = BY_KEY[r.Form];
    const next = r.Form === 'petition' ? 'Received' : 'Open';
    if (form && m.input) {
      const parsed = parseInput(form, m.input);
      m.sealer = by.username;
      const out = await regenerate({ ...r, 'Sealed By': by.name }, m, parsed, { status: next, sealer: by.username });
      await G.updateRow(r.row, { Status: next, 'Sealed By': by.name, Document: out.doc.webViewLink, 'Doc Id': out.doc.id, 'Updated At (UTC)': now(), Fields: pack(m) });
    } else {
      await G.updateRow(r.row, { Status: next, 'Sealed By': by.name, 'Updated At (UTC)': now() });
    }
    return r;
  });
}
async function sendBack(no, by, note) {
  return mutate(no, async r => {
    const m = meta(r);
    m.returnNote = { by: by.name, at: now(), note: clean(note, 600) };
    await G.updateRow(r.row, { Status: 'Returned', 'Updated At (UTC)': now(), Fields: pack(m) });
    return r;
  });
}
async function resubmit(no, by) {
  return mutate(no, async r => {
    if (r.Status !== 'Returned') throw new Error('Only a returned writ may be sent again.');
    const m = meta(r);
    delete m.returnNote;
    await G.updateRow(r.row, { Status: 'Awaiting Seal', 'Updated At (UTC)': now(), Fields: pack(m) });
    return r;
  });
}

async function setStatus(no, status) {
  if (!STATUSES.includes(status)) throw new Error('No such state.');
  return mutate(no, async r => {
    const patch = { Status: status, 'Updated At (UTC)': now() };
    if (CLOSED.includes(status)) { if (!r['Closed At (UTC)']) patch['Closed At (UTC)'] = now(); } else patch['Closed At (UTC)'] = '';
    await G.updateRow(r.row, patch);
    return r;
  });
}
async function assign(no, username) {
  return mutate(no, async r => { await G.updateRow(r.row, { 'Assigned To': username || '', 'Updated At (UTC)': now() }); return r; });
}
async function setPublic(no, yes) {
  return mutate(no, async r => { await G.updateRow(r.row, { Public: yes ? 'Yes' : 'No', 'Updated At (UTC)': now() }); return r; });
}
async function setHold(no, hold) {
  return mutate(no, async r => { await G.updateRow(r.row, { Hold: holdOf(hold), 'Updated At (UTC)': now() }); return r; });
}
async function link(no, other, add) {
  return mutate(no, async (r, rows) => {
    const o = rows.find(x => x['Record No'] === other);
    if (!o) throw new Error('No record upon the Docket answers to “' + other + '”.');
    if (o === r) throw new Error('A record cannot be linked to itself.');
    const a = new Set(links(r)), b = new Set(links(o));
    if (add) { a.add(other); b.add(no); } else { a.delete(other); b.delete(no); }
    await G.updateRow(r.row, { Linked: [...a].join(', ') });
    await G.updateRow(o.row, { Linked: [...b].join(', ') });
    return r;
  });
}
async function strike(no) {
  return mutate(no, async (r, rows) => {
    const id = docId(r);
    if (id) { try { await G.trash(id); } catch (e) { console.error('trash failed', e.message); } }
    for (const other of links(r)) {
      const o = rows.find(x => x['Record No'] === other);
      if (o) await G.updateRow(o.row, { Linked: links(o).filter(x => x !== no).join(', ') });
    }
    await G.deleteRow(r.row);
    return r;
  });
}

const ARCHIVE_CLASS = { Directive: 'Directive', Writ: 'Writ', Referral: 'Writ', 'Writ of Inquiry': 'Writ', Requisition: 'Writ', 'Register Entry': 'Register', 'Service Record': 'Register', 'Seal Entry': 'Register', Correspondence: 'Register', 'Public Notice': 'Notice', 'Publication Review': 'Publication', Petition: 'Petition', 'Administrative Matter': 'Petition', Inquiry: 'Inquiry', Finding: 'Inquiry' };

function dueForArchive(rows) {
  const days = Math.max(0, Number(Settings.get().retentionDays) || 0);
  const cutoff = Date.now() - days * 86400000;
  return rows.filter(r => r.Status === 'Closed').filter(r => {
    const t = Date.parse(r['Closed At (UTC)'] || r['Updated At (UTC)'] || r['Filed At (UTC)'] || '');
    return !isNaN(t) && t <= cutoff;
  });
}

async function catalogue(no, by) {
  const rows = await all(true);
  const r = rows && rows.find(x => x['Record No'] === no);
  if (!r) throw new Error('No such record is upon the Docket.');
  if (r.Status === 'Archived') throw new Error('That record is already archived.');
  const t = Settings.today();
  const tp = { day: String(t.day), month: String(t.month), year: String(t.year) };
  const form = BY_KEY.archive;
  const body = {
    f: {
      title: `${r['Record No']} — ${r.Subject}`.slice(0, 300), class: ARCHIVE_CLASS[r.Class] || 'Other', 'original-date': r['Date (4E)'],
      'originating-office': r.Folder, 'related-records': r['Record No'], 'repository-location': `${r.Folder}, Ministry Archives`,
      condition: 'Good', access: 'Restricted',
      'archivist-notes': `Closed and held for the Ministry’s retention period, then committed to the Archives by ${by.name}, ${by.title}.`
    },
    d: { 'date-archived': tp }, recordDate: tp, sig: [`${by.name}, ${by.title}`, '']
  };
  const parsed = parseInput(form, body);
  const entry = await file({ form, parsed, by, hold: r.Hold, linked: [r['Record No']] });
  await setStatus(no, 'Archived');
  return entry;
}

function todayParts() { const t = Settings.today(); return { day: String(t.day), month: String(t.month), year: String(t.year) }; }

module.exports = {
  STATUSES, CLOSED, PUBLIC_STATUS, MONTHS, all, allOrNull, visible, invalidate, meta, docId, links, folderKey, isClosed, foldersFor, canSee, granted, requests,
  parseRecordNo, parseInput, file, edit, approve, sendBack, resubmit, setStatus, assign, setPublic, setHold, link, strike, dueForArchive, catalogue, holdOf, todayParts
};
