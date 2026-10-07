const S = require('./store');
const H = require('./heraldry');

const FILE = 'heraldry-grants.json';

const KINDS = [
  { id: 'style', name: 'A style or title', note: 'A rank upon the Ledger. Granting it enters or amends the holder.' },
  { id: 'arms', name: 'Arms', note: 'A coat of arms, blazoned in words.' },
  { id: 'fief', name: 'A fiefdom or land', note: 'A hold, barony, manor or keep, set against the holder on the Ledger.' },
  { id: 'honour', name: 'An honour or decoration', note: 'A mark of favour that carries no rank.' },
  { id: 'writ', name: 'A writ or privilege', note: 'A right or liberty granted by the hand of the Governor.' }
];
const KIND_BY_ID = Object.fromEntries(KINDS.map(k => [k.id, k]));

const clean = (v, n) => String(v === undefined || v === null ? '' : v)
  .replace(/[\r\n]/g, ' ').trim().slice(0, n);
const text = (v, n) => String(v === undefined || v === null ? '' : v)
  .replace(/\r/g, '').trim().slice(0, n);
const now = () => new Date().toISOString();

function all() {
  const raw = S.read(FILE, []);
  return Array.isArray(raw) ? raw : [];
}

function sorted() {
  return all().slice().sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

function live() {
  return sorted().filter(g => g.standing !== 'Revoked');
}

function get(id) {
  return all().find(g => g.id === String(id || '')) || null;
}

function forEntry(entryId) {
  return sorted().filter(g => g.toId === String(entryId || ''));
}

function nextNo(rows) {
  return rows.reduce((m, g) => Math.max(m, Number(g.no) || 0), 0) + 1;
}

function give(b, by) {
  const kind = KIND_BY_ID[b.kind] ? b.kind : 'honour';
  const what = clean(b.what, 160);
  if (!what) throw new Error('Say what is granted.');
  const authority = clean(b.authority, 160);
  if (!authority) throw new Error('Name the hand it is granted by.');

  let toId = clean(b.toId, 40);
  let entry = toId ? H.get(toId) : null;
  let toName = clean(b.toName, 160);

  if (!entry && !toName) throw new Error('Name who receives it.');

  if (!entry && (kind === 'style' || kind === 'fief')) {
    const parts = toName.split(/\s+/);
    const given = parts.shift();
    entry = H.add({
      given,
      family: parts.join(' '),
      kind: clean(b.nobleKind, 20) || 'Lifelong',
      region: clean(b.region, 60),
      rank: kind === 'style' ? what : '',
      fief: kind === 'fief' ? what : '',
      under: authority,
      registered: clean(b.dated, 90),
      standing: 'In force'
    }, by);
    toId = entry.id;
  }

  if (entry) {
    toName = H.fullName(entry);
    if (kind === 'style') H.save(entry.id, { rank: what, under: authority }, by);
    if (kind === 'fief') H.save(entry.id, { fief: what }, by);
  }

  const rows = all();
  const row = {
    id: S.id(),
    no: nextNo(rows),
    kind, what, authority,
    toId: toId || '',
    toName,
    wording: text(b.wording, 3000),
    dated: clean(b.dated, 90),
    standing: 'Granted',
    at: now(),
    byName: (by && by.name) || ''
  };
  rows.push(row);
  S.write(FILE, rows);
  return row;
}

function revoke(id, why, by) {
  const rows = all();
  const g = rows.find(x => x.id === String(id || ''));
  if (!g) throw new Error('No grant answers to that.');
  const reason = clean(why, 300);
  if (!reason) throw new Error('Set down why it is revoked.');
  g.standing = 'Revoked';
  g.revokedWhy = reason;
  g.revokedAt = now();
  g.revokedBy = (by && by.name) || '';
  S.write(FILE, rows);

  if (g.kind === 'style' && g.toId) {
    try { H.strike(g.toId, 'The style granted to them is revoked: ' + reason, by); } catch (_) {}
  }
  if (g.kind === 'fief' && g.toId) {
    try { H.save(g.toId, { fief: '' }, by); } catch (_) {}
  }
  return g;
}

function restore(id, by) {
  const rows = all();
  const g = rows.find(x => x.id === String(id || ''));
  if (!g) throw new Error('No grant answers to that.');
  g.standing = 'Granted';
  g.revokedWhy = '';
  S.write(FILE, rows);
  if (g.kind === 'style' && g.toId) {
    try { H.restore(g.toId, by); H.save(g.toId, { rank: g.what }, by); } catch (_) {}
  }
  if (g.kind === 'fief' && g.toId) {
    try { H.save(g.toId, { fief: g.what }, by); } catch (_) {}
  }
  return g;
}

function summary() {
  const rows = all();
  const by = {};
  KINDS.forEach(k => { by[k.id] = rows.filter(g => g.kind === k.id && g.standing !== 'Revoked').length; });
  return {
    total: rows.length,
    live: rows.filter(g => g.standing !== 'Revoked').length,
    revoked: rows.filter(g => g.standing === 'Revoked').length,
    byKind: by
  };
}

module.exports = { KINDS, KIND_BY_ID, all, sorted, live, get, forEntry, give, revoke, restore, summary };
