const S = require('./store');

const FILE = 'heraldry.json';

const KINDS = [
  { id: 'Positional', name: 'Positional', note: 'Held with an office. It ends when the office ends.' },
  { id: 'Hereditary', name: 'Hereditary', note: 'Held by blood and passed to an heir.' },
  { id: 'Lifelong', name: 'Lifelong', note: 'Granted for the life of the holder and no further.' }
];
const KIND_IDS = KINDS.map(k => k.id);

const STANDINGS = ['In force', 'Lapsed', 'Struck'];

const clean = (v, n) => String(v === undefined || v === null ? '' : v)
  .replace(/[\r\n]/g, ' ').trim().slice(0, n);

const now = () => new Date().toISOString();

function all() {
  const raw = S.read(FILE, []);
  return Array.isArray(raw) ? raw : [];
}

function sorted() {
  const order = {};
  KIND_IDS.forEach((k, i) => { order[k] = i; });
  return all().slice().sort((a, b) =>
    (order[a.kind] ?? 9) - (order[b.kind] ?? 9) ||
    String(a.region).localeCompare(String(b.region)) ||
    (b.weight || 0) - (a.weight || 0) ||
    String(a.given).localeCompare(String(b.given)));
}

function live() {
  return sorted().filter(e => e.standing !== 'Struck');
}

function get(id) {
  return all().find(e => e.id === String(id || '')) || null;
}

function fullName(e) {
  return [e.given, e.family].filter(Boolean).join(' ').trim();
}

const RANK_WEIGHT = [
  [/emperor|empress/i, 100],
  [/high king|high queen/i, 95],
  [/jarl/i, 90],
  [/lord-regent|lady-regent/i, 88],
  [/duke|duchess/i, 80],
  [/marquis|marchioness|margrave/i, 76],
  [/earl|count|countess/i, 72],
  [/viscount/i, 68],
  [/baron|baroness/i, 64],
  [/lord-steward/i, 60],
  [/steward/i, 56],
  [/thane/i, 52],
  [/housecarl/i, 48],
  [/court mage/i, 46],
  [/councilor|councillor/i, 44],
  [/serjo|sera|cerum/i, 40],
  [/lord|lady/i, 38],
  [/marshal/i, 36],
  [/master of/i, 34],
  [/knight|sir|dame/i, 30]
];

function weigh(rank) {
  const r = String(rank || '');
  for (let i = 0; i < RANK_WEIGHT.length; i++) {
    if (RANK_WEIGHT[i][0].test(r)) return RANK_WEIGHT[i][1];
  }
  return 10;
}

function shape(b) {
  const given = clean(b.given, 90);
  if (!given) throw new Error('A given name is needed.');
  const kind = KIND_IDS.indexOf(b.kind) >= 0 ? b.kind : 'Positional';
  const rank = clean(b.rank, 120);
  return {
    given,
    family: clean(b.family, 120),
    kind,
    region: clean(b.region, 60),
    rank,
    under: clean(b.under, 140),
    fief: clean(b.fief, 200),
    registered: clean(b.registered, 90),
    standing: STANDINGS.indexOf(b.standing) >= 0 ? b.standing : 'In force',
    note: clean(b.note, 400),
    weight: weigh(rank)
  };
}

function add(b, by) {
  const rows = all();
  const row = Object.assign({ id: S.id() }, shape(b), {
    at: now(), byName: (by && by.name) || ''
  });
  rows.push(row);
  S.write(FILE, rows);
  return row;
}

function save(id, b, by) {
  const rows = all();
  const e = rows.find(x => x.id === String(id || ''));
  if (!e) throw new Error('No entry answers to that.');
  Object.assign(e, shape(Object.assign({}, e, b)));
  e.amendedAt = now();
  e.amendedBy = (by && by.name) || '';
  S.write(FILE, rows);
  return e;
}

function strike(id, why, by) {
  const rows = all();
  const e = rows.find(x => x.id === String(id || ''));
  if (!e) throw new Error('No entry answers to that.');
  e.standing = 'Struck';
  e.struckWhy = clean(why, 300);
  e.struckAt = now();
  e.struckBy = (by && by.name) || '';
  S.write(FILE, rows);
  return e;
}

function restore(id, by) {
  const rows = all();
  const e = rows.find(x => x.id === String(id || ''));
  if (!e) throw new Error('No entry answers to that.');
  e.standing = 'In force';
  e.struckWhy = '';
  e.amendedAt = now();
  e.amendedBy = (by && by.name) || '';
  S.write(FILE, rows);
  return e;
}

function drop(id) {
  S.write(FILE, all().filter(e => e.id !== String(id || '')));
}

function search(q) {
  const needle = String(q || '').trim().toLowerCase();
  const rows = live();
  if (!needle) return rows;
  return rows.filter(e => [fullName(e), e.rank, e.region, e.under, e.fief, e.kind]
    .join(' ').toLowerCase().includes(needle));
}

function regions() {
  const seen = {};
  live().forEach(e => {
    if (!e.region) return;
    seen[e.region] = (seen[e.region] || 0) + 1;
  });
  return Object.keys(seen).sort().map(r => ({ region: r, n: seen[r] }));
}

function grouped(rows) {
  const out = [];
  KIND_IDS.forEach(k => {
    const inKind = rows.filter(e => e.kind === k);
    if (!inKind.length) return;
    const regionNames = [];
    const byRegion = {};
    inKind.forEach(e => {
      const r = e.region || 'Elsewhere';
      if (!byRegion[r]) { byRegion[r] = []; regionNames.push(r); }
      byRegion[r].push(e);
    });
    regionNames.sort();
    out.push({ kind: k, note: (KINDS.find(x => x.id === k) || {}).note || '',
      regions: regionNames.map(r => ({ region: r, rows: byRegion[r] })) });
  });
  return out;
}

function summary() {
  const rows = all();
  return {
    total: rows.length,
    live: rows.filter(e => e.standing === 'In force').length,
    lapsed: rows.filter(e => e.standing === 'Lapsed').length,
    struck: rows.filter(e => e.standing === 'Struck').length,
    houses: new Set(rows.filter(e => e.family).map(e => e.family)).size,
    regions: regions().length
  };
}

function seed(list, by) {
  if (all().length) return 0;
  const rows = (list || []).map(b => Object.assign({ id: S.id() }, shape(b), {
    at: now(), byName: (by && by.name) || 'The Imperial Ledger of Heraldry'
  }));
  S.write(FILE, rows);
  return rows.length;
}

module.exports = {
  KINDS, KIND_IDS, STANDINGS, all, sorted, live, get, fullName,
  add, save, strike, restore, drop, search, regions, grouped, summary, seed, weigh
};
