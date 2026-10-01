const S = require('./store');
const Arms = require('./arms');

const FILE = 'other-seals.json';
const MAX = 400;

const KINDS = [
  { id: 'hold', name: 'A Hold', plain: 'A Jarl, a steward, or the seat of a Hold.' },
  { id: 'court', name: 'A court', plain: 'A Hold court or any bench that is not the Ministry’s.' },
  { id: 'ministry', name: 'Another Ministry', plain: 'An Imperial office that is not this one.' },
  { id: 'legion', name: 'The Legion', plain: 'The Imperial Legion and its garrisons.' },
  { id: 'order', name: 'An order or college', plain: 'A sworn body, a college, a temple.' },
  { id: 'guild', name: 'A trade or company', plain: 'A chartered company, a trading house, a guild.' },
  { id: 'foreign', name: 'A power outside Skyrim', plain: 'The Dominion, Morrowind, High Rock, and so on.' },
  { id: 'other', name: 'Something else', plain: 'Anything that does not fit above.' }
];
const KIND = Object.fromEntries(KINDS.map(k => [k.id, k]));

const STATUSES = [
  { id: 'honoured', name: 'Honoured', plain: 'The Ministry treats a paper under this seal as genuine until shown otherwise.', tone: 'ok' },
  { id: 'recorded', name: 'Recorded only', plain: 'We know the seal. We make no promise about what it is worth.', tone: '' },
  { id: 'doubted', name: 'Doubted', plain: 'Something is wrong with it. Do not act on a paper under it without asking.', tone: 'warn' },
  { id: 'withdrawn', name: 'Withdrawn', plain: 'It was honoured and is no longer. Papers under it are void from the day given.', tone: 'warn' },
  { id: 'forged', name: 'Known forgery', plain: 'Copies of this seal are in circulation. Treat any paper bearing it as suspect and report it.', tone: 'bad' }
];
const STATUS = Object.fromEntries(STATUSES.map(s => [s.id, s]));

const clean = (v, n) => String(v == null ? '' : v).replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim().slice(0, n);

function all() { return S.read(FILE, []); }

function sorted() {
  return all().slice().sort((a, b) => String(a.power).localeCompare(String(b.power)));
}

function get(id) { return all().find(s => s.id === id) || null; }

function shape(b, by) {
  return {
    power: clean(b.power, 120),
    kind: KIND[b.kind] ? b.kind : 'other',
    holder: clean(b.holder, 120),
    description: clean(b.description, 600),
    marks: clean(b.marks, 600),
    papers: clean(b.papers, 400),
    status: STATUS[b.status] ? b.status : 'recorded',
    note: clean(b.note, 600),
    arms: b.arms ? Arms.clean(b.arms) : null,
    verifiedAt: b.verifiedAt ? clean(b.verifiedAt, 40) : '',
    verifiedBy: (by && by.name) || clean(b.verifiedBy, 80)
  };
}

function add(b, by) {
  const s = shape(b, by);
  if (!s.power) throw new Error('A seal needs the name of whose it is.');
  const entry = { id: S.id(), ...s, at: new Date().toISOString(), by: (by && by.name) || '' };
  S.update(FILE, [], l => { l.push(entry); if (l.length > MAX) l.splice(0, l.length - MAX); });
  return entry;
}

function edit(id, b, by) {
  let out = null;
  S.update(FILE, [], l => {
    const e = l.find(x => x.id === id);
    if (!e) return;
    const s = shape(b, by);
    if (!s.power) return;
    Object.assign(e, s, { editedAt: new Date().toISOString(), editedBy: (by && by.name) || '' });
    out = e;
  });
  return out;
}

function remove(id) {
  let gone = null;
  S.update(FILE, [], l => {
    const i = l.findIndex(x => x.id === id);
    if (i < 0) return;
    gone = l[i];
    l.splice(i, 1);
  });
  return gone;
}

function search(q) {
  const t = String(q || '').trim().toLowerCase();
  if (!t) return sorted();
  return sorted().filter(s => [s.power, s.holder, s.description, s.marks, s.papers, (KIND[s.kind] || {}).name]
    .join(' ').toLowerCase().includes(t));
}

function byKind() {
  const out = KINDS.map(k => ({ ...k, items: [] }));
  const ix = Object.fromEntries(out.map(k => [k.id, k]));
  sorted().forEach(s => { (ix[s.kind] || ix.other).items.push(s); });
  return out.filter(k => k.items.length);
}

const SEED = [
  { power: 'The Jarl of Whiterun', kind: 'hold', holder: 'The Jarl and the Steward of Dragonsreach', status: 'honoured',
    description: 'A horse’s head within a plain ring, pressed in dark blue wax.',
    marks: 'The ring is unbroken. A seal with a split ring is an old one from before the Jarl’s hall was rebuilt and is no longer used.',
    papers: 'Writs of the Hold, grants of land, summonses to the Jarl’s court.',
    arms: { shape: 'heater', field: 'azure', division: 'plain', ordinary: 'none', charge: 'horse', chargeTint: 'argent', motto: '' } },
  { power: 'The Jarl of the Rift', kind: 'hold', holder: 'The Jarl and the Steward of Mistveil Keep', status: 'honoured',
    description: 'A crowned bird within a wreath, pressed in black wax.',
    marks: 'The wreath has seven leaves to a side. Count them.',
    papers: 'Writs of the Hold, leave to trade at Riften, summonses.',
    arms: { shape: 'heater', field: 'sable', division: 'plain', ordinary: 'none', charge: 'raven', chargeTint: 'or', motto: '' } },
  { power: 'The Imperial Legion in Skyrim', kind: 'legion', holder: 'The General of the Imperial Province', status: 'honoured',
    description: 'The dragon of the Empire over crossed blades, in red wax.',
    marks: 'Orders of the Legion carry both this seal and the signature of the issuing officer. One without the other is not an order.',
    papers: 'Orders, commissions, discharges, leave, provost warrants.',
    arms: { shape: 'heater', field: 'gules', division: 'plain', ordinary: 'none', charge: 'dragon', chargeTint: 'or', motto: '' } },
  { power: 'The Ministry of Justice', kind: 'ministry', holder: 'The Minister of State for Justice', status: 'honoured',
    description: 'A balance beneath a crown, in dark red wax.',
    marks: 'A judgment under this seal can be checked against the public Register of Judgments. If it is not there, it is not a judgment.',
    papers: 'Judgments, warrants, commissions of inquisition, summonses.',
    arms: { shape: 'heater', field: 'murrey', division: 'plain', ordinary: 'none', charge: 'scales', chargeTint: 'argent', motto: '' } },
  { power: 'The College of Winterhold', kind: 'order', holder: 'The Arch-Mage', status: 'recorded',
    description: 'An open eye within a circle of script, in blue-grey wax.',
    marks: 'The script runs widdershins. A seal with the script the other way about is not the College’s.',
    papers: 'Letters of introduction, licences to practise, requests to the Ministry.',
    arms: { shape: 'oval', field: 'azure', division: 'plain', ordinary: 'none', charge: 'eye', chargeTint: 'argent', motto: '' } },
  { power: 'The East Empire Company', kind: 'guild', holder: 'The Factor at Solitude', status: 'honoured',
    description: 'A ship under sail within a rope border, in green wax.',
    marks: 'Company papers are countersigned by the Factor. An uncountersigned paper is a draft, not a bill.',
    papers: 'Bills of lading, charters, warehouse receipts.',
    arms: { shape: 'heater', field: 'vert', division: 'plain', ordinary: 'bordure', ordinaryTint: 'or', charge: 'ship', chargeTint: 'or', motto: '' } },
  { power: 'The Aldmeri Dominion', kind: 'foreign', holder: 'The Thalmor Embassy in Skyrim', status: 'recorded',
    description: 'A sun in splendour, pressed in gold wax.',
    marks: 'The Ministry records this seal. It does not undertake to honour anything under it without instruction.',
    papers: 'Demands, notices, requests under the Concordat.',
    arms: { shape: 'lozenge', field: 'or', division: 'plain', ordinary: 'none', charge: 'sun', chargeTint: 'gules', motto: '' } }
];

function seed(by) {
  if (all().length) return 0;
  let n = 0;
  SEED.forEach(s => { try { add(s, by); n++; } catch (_) {} });
  return n;
}

module.exports = { KINDS, KIND, STATUSES, STATUS, all, sorted, get, add, edit, remove, search, byKind, seed };
