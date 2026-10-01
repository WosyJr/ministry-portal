const S = require('./store');

const PEOPLE = 'war-personnel.json';
const LEDGER = 'war-treasury.json';

const UNITS = [
  { id: 'legion', name: 'Legion XII', lede: 'The standing Legion of the province, garrisoned and paid from the Imperial treasury.', cap: 45,
    ranks: ['Consul’s Representative', 'Legate', 'Tribune', 'Centurion', 'Optio', 'Legionnaire', 'Auxiliary'] },
  { id: 'battlemages', name: 'Cohort of Imperial Battlemages', lede: 'Magi attached to the Legion. Capped at three Palatine, six Battlemages and eleven Aspirants.', cap: 20,
    ranks: ['Palatine', 'Battle Mage', 'Aspirant'] },
  { id: 'scouts', name: 'Scout Corps', lede: 'Eyes of the Legion. Speculators and scouts under the Scout Marshal.', cap: 45,
    ranks: ['Scout Marshal', 'Chief Speculator', 'Speculator', 'Scout'] }
];
const UNIT_BY_ID = Object.fromEntries(UNITS.map(u => [u.id, u]));

const ACTIVITY = ['Active', 'Semi-Active', 'LOA', 'Inactive', 'Vacant'];
const ACTIVITY_CLASS = { Active: 'ok', 'Semi-Active': 'warn', LOA: 'warn', Inactive: 'bad', Vacant: '' };

const TRADES = ['Warrior', 'Hunter', 'Blacksmith', 'Alchemist', 'Enchanter', 'Cook', 'Miner', 'Scribe'];

const TRACKS = [
  { id: 'infantry', name: 'Infantry', tiered: true, keys: ['INFAN I', 'INFAN II', 'INFAN III'] },
  { id: 'archery', name: 'Archery', tiered: true, keys: ['ARC I', 'ARC II', 'ARC III'] },
  { id: 'leadership', name: 'Leadership', tiered: false, keys: ['JLD', 'INST', 'CMD'] },
  { id: 'quartermaster', name: 'Quartermaster', tiered: true, keys: ['QM I', 'QM II', 'QM III'] },
  { id: 'provost', name: 'Provost', tiered: true, keys: ['PRO I', 'PRO II', 'PRO III'] },
  { id: 'recruiting', name: 'Recruiting', tiered: true, keys: ['REC I', 'REC II'] }
];
const QUALS = TRACKS.flatMap(t => t.keys.map(key => ({ key, group: t.name })));
const QUAL_KEYS = QUALS.map(q => q.key);

function displayQuals(held) {
  const set = new Set(held || []);
  const out = [];
  TRACKS.forEach(t => {
    const mine = t.keys.filter(k => set.has(k));
    if (!mine.length) return;
    if (t.tiered) out.push(mine[mine.length - 1]);
    else mine.forEach(k => out.push(k));
  });
  return out;
}

function all() { return S.read(PEOPLE, []); }
function saveAll(list) { S.write(PEOPLE, list); }

function forUnit(unitId) {
  const unit = UNIT_BY_ID[unitId];
  if (!unit) return [];
  const order = Object.fromEntries(unit.ranks.map((r, i) => [r, i]));
  return all().filter(p => p.unit === unitId)
    .sort((a, b) => (order[a.rank] ?? 99) - (order[b.rank] ?? 99) || String(a.name).localeCompare(String(b.name)));
}

function grouped(unitId) {
  const unit = UNIT_BY_ID[unitId];
  if (!unit) return [];
  const rows = forUnit(unitId);
  const known = unit.ranks.map(r => ({ rank: r, people: rows.filter(p => p.rank === r) }));
  const other = rows.filter(p => !unit.ranks.includes(p.rank));
  if (other.length) known.push({ rank: 'Other', people: other });
  return known;
}

function num(v, max) {
  const n = Math.round(Number(String(v ?? '').replace(/[^0-9.-]/g, '')) || 0);
  if (!isFinite(n)) return 0;
  return Math.max(-max, Math.min(max, n));
}
function clean(v, max) { return String(v ?? '').replace(/[\r\n]/g, ' ').trim().slice(0, max); }

function normalize(b) {
  const unit = UNIT_BY_ID[b.unit] ? b.unit : 'legion';
  const quals = []
    .concat(b.quals || [])
    .map(q => clean(q, 12))
    .filter(q => QUAL_KEYS.includes(q));
  return {
    unit,
    rank: UNIT_BY_ID[unit].ranks.includes(b.rank) ? b.rank : clean(b.rank, 60) || UNIT_BY_ID[unit].ranks[UNIT_BY_ID[unit].ranks.length - 1],
    name: clean(b.name, 80),
    activity: ACTIVITY.includes(b.activity) ? b.activity : 'Active',
    pay: num(b.pay, 1000000),
    bonus: num(b.bonus, 1000000),
    quota: !!b.quota,
    discord: clean(b.discord, 60),
    timezone: clean(b.timezone, 24),
    trade: TRADES.includes(b.trade) ? b.trade : '',
    quals: Array.from(new Set(quals)),
    garrison: clean(b.garrison, 60),
    senior: !!b.senior,
    notes: clean(b.notes, 300)
  };
}

function add(b) {
  const p = normalize(b);
  if (!p.name) throw new Error('Give the legionary a name.');
  const list = all();
  if (list.length >= 400) throw new Error('The rolls are full.');
  const entry = { id: S.id(), ...p, added: new Date().toISOString(), history: [] };
  logFor(entry, 'entered', `Entered upon the roll of ${UNIT_BY_ID[p.unit].name} as ${p.rank}.`, b.by);
  list.push(entry);
  saveAll(list);
  return entry;
}

const FIELD_LABELS = {
  rank: 'Rank', activity: 'Standing', pay: 'Pay', bonus: 'Bonus pay', discord: 'Discord',
  timezone: 'Time zone', trade: 'Trade', garrison: 'Garrison', notes: 'Notes', senior: 'Senior', quota: 'Quota'
};

function logFor(p, kind, text, by) {
  p.history = (p.history || []).concat([{ at: new Date().toISOString(), kind, text, by: by || '' }]).slice(-80);
}

function note(id, kind, text, by) {
  const list = all();
  const p = list.find(x => x.id === id);
  if (!p) return null;
  logFor(p, kind, text, by);
  saveAll(list);
  return p;
}

function update(id, b, by) {
  const list = all();
  const p = list.find(x => x.id === id);
  if (!p) throw new Error('No one upon the rolls answers to that.');
  const next = normalize({ ...p, ...b });
  if (!next.name) throw new Error('Give the legionary a name.');

  const changes = [];
  Object.keys(FIELD_LABELS).forEach(k => {
    const before = p[k], after = next[k];
    if (String(before ?? '') !== String(after ?? '')) {
      changes.push(`${FIELD_LABELS[k]}: ${fmtVal(before)} \u2192 ${fmtVal(after)}`);
    }
  });
  const qBefore = (p.quals || []).join(','), qAfter = (next.quals || []).join(',');
  if (qBefore !== qAfter) {
    const gained = next.quals.filter(q => !(p.quals || []).includes(q));
    const lost = (p.quals || []).filter(q => !next.quals.includes(q));
    if (gained.length) changes.push('Qualified: ' + gained.join(', '));
    if (lost.length) changes.push('Struck of qualification: ' + lost.join(', '));
  }
  if (next.name !== p.name) changes.push(`Name: ${p.name} \u2192 ${next.name}`);

  Object.assign(p, next);
  if (changes.length) logFor(p, 'amended', changes.join(' \u00b7 '), by);
  saveAll(list);
  return p;
}

function fmtVal(v) {
  if (v === true) return 'yes';
  if (v === false) return 'no';
  if (v === '' || v == null) return '\u2014';
  return String(v);
}

function remove(id) {
  const list = all().filter(x => x.id !== id);
  saveAll(list);
}

function get(id) { return all().find(x => x.id === id) || null; }

function counts() {
  const rows = all();
  return UNITS.map(u => {
    const mine = rows.filter(p => p.unit === u.id);
    return {
      id: u.id, name: u.name, cap: u.cap, total: mine.length,
      active: mine.filter(p => p.activity === 'Active').length,
      pay: mine.reduce((n, p) => n + (p.pay || 0), 0),
      bonus: mine.reduce((n, p) => n + (p.bonus || 0), 0)
    };
  });
}

function ledger() { return S.read(LEDGER, []); }

const LEDGER_DIRS = ['in', 'out', 'to-reserve', 'from-reserve'];

function ledgerAdd(b) {
  const dir = LEDGER_DIRS.includes(b.dir) ? b.dir : 'in';
  const label = clean(b.label, 120);
  const amount = Math.abs(num(b.amount, 100000000));
  if (!label) throw new Error('Say what the sum is for.');
  if (!amount) throw new Error('Give a sum greater than nothing.');
  if (dir === 'from-reserve' && amount > treasury().reserve) {
    throw new Error('The reserve does not hold that much. It stands at ' + treasury().reserve.toLocaleString('en-US') + '.');
  }
  const list = ledger();
  if (list.length >= 1000) throw new Error('The ledger is full.');
  const entry = { id: S.id(), dir, label, amount, at: new Date().toISOString() };
  list.push(entry);
  S.write(LEDGER, list);
  return entry;
}

function ledgerRemove(id) { S.write(LEDGER, ledger().filter(x => x.id !== id)); }

function treasury() {
  const list = ledger();
  const sum = d => list.filter(x => x.dir === d).reduce((n, x) => n + x.amount, 0);
  const totalIn = sum('in');
  const totalOut = sum('out');
  const toReserve = sum('to-reserve');
  const fromReserve = sum('from-reserve');
  const reserve = toReserve - fromReserve;
  const chest = totalIn - totalOut - reserve;
  return {
    income: list.filter(x => x.dir === 'in').reverse(),
    spend: list.filter(x => x.dir === 'out').reverse(),
    transfers: list.filter(x => x.dir === 'to-reserve' || x.dir === 'from-reserve').reverse(),
    totalIn, totalOut, toReserve, fromReserve, reserve, chest,
    holdings: chest + reserve,
    balance: chest
  };
}

const PROMO = 'war-promotions.json';
const QUOTA = 'war-quota.json';
const WRITS = 'war-writs.json';

function promotions() { return S.read(PROMO, []); }
function promotionsOpen() { return promotions().filter(x => x.status === 'Proposed').reverse(); }
function promotionsFor(personId) { return promotions().filter(x => x.personId === personId).reverse(); }

function proposePromotion({ personId, toRank, reason, by, byName }) {
  const p = get(personId);
  if (!p) throw new Error('No one upon the rolls answers to that.');
  const unit = UNIT_BY_ID[p.unit];
  if (!unit.ranks.includes(toRank)) throw new Error('That is not a rank of ' + unit.name + '.');
  if (toRank === p.rank) throw new Error(p.name + ' already holds that rank.');
  if (promotions().some(x => x.personId === personId && x.status === 'Proposed')) throw new Error('A promotion for ' + p.name + ' already waits upon the Board.');
  const list = promotions();
  const entry = { id: S.id(), personId, name: p.name, unit: p.unit, fromRank: p.rank, toRank, reason: clean(reason, 400), by, byName: byName || by, at: new Date().toISOString(), status: 'Proposed', decidedBy: '', decidedAt: '', note: '' };
  list.push(entry);
  S.write(PROMO, list.slice(-500));
  note(personId, 'promotion', `Promotion to ${toRank} laid before the Board by ${entry.byName}.`, by);
  return entry;
}

function decidePromotion(id, approve, { by, byName, note: reply }) {
  const list = promotions();
  const e = list.find(x => x.id === id);
  if (!e || e.status !== 'Proposed') throw new Error('That promotion is not before the Board.');
  e.status = approve ? 'Approved' : 'Declined';
  e.decidedBy = byName || by;
  e.decidedAt = new Date().toISOString();
  e.note = clean(reply, 400);
  S.write(PROMO, list);
  if (approve) {
    const people = all();
    const p = people.find(x => x.id === e.personId);
    if (p) {
      p.rank = e.toRank;
      logFor(p, 'promotion', `Raised from ${e.fromRank} to ${e.toRank} by order of the Board (${e.decidedBy}).`, by);
      saveAll(people);
    }
  } else {
    note(e.personId, 'promotion', `Promotion to ${e.toRank} declined by ${e.decidedBy}.`, by);
  }
  return e;
}

function quotaAll() { return S.read(QUOTA, []); }
function quotaCurrent() { return quotaAll().find(q => !q.closed) || null; }

function quotaSave(id, b) {
  const list = quotaAll();
  let q = id ? list.find(x => x.id === id) : null;
  const label = clean(b.label, 80);
  const counts = clean(b.counts, 80);
  const target = Math.max(0, Math.min(999, parseInt(b.target, 10) || 0));
  if (!label) throw new Error('Give the period a name.');
  if (!counts) throw new Error('Say what the quota counts.');
  if (!q) {
    q = { id: S.id(), label, counts, target, closed: false, progress: {}, at: new Date().toISOString() };
    list.forEach(x => { x.closed = true; });
    list.push(q);
  } else {
    q.label = label; q.counts = counts; q.target = target;
    if (b.closed !== undefined) q.closed = !!b.closed;
  }
  S.write(QUOTA, list.slice(-60));
  return q;
}

function quotaSet(periodId, personId, count) {
  const list = quotaAll();
  const q = list.find(x => x.id === periodId);
  if (!q) throw new Error('No such quota period.');
  q.progress = q.progress || {};
  const n = Math.max(0, Math.min(999, parseInt(count, 10) || 0));
  if (n) q.progress[personId] = n; else delete q.progress[personId];
  S.write(QUOTA, list);
  return q;
}

function quotaMet(person, q) {
  if (!q) return !!person.quota;
  const n = (q.progress || {})[person.id] || 0;
  return q.target > 0 ? n >= q.target : n > 0;
}

const WRIT_TYPES = [
  { key: 'muster', name: 'Muster Order', lede: 'A call to muster, with the place, the hour and who is called.', person: false },
  { key: 'patrol', name: 'Patrol Report', lede: 'What a patrol saw and did.', person: true },
  { key: 'commendation', name: 'Commendation', lede: 'Honour recorded for a legionary.', person: true },
  { key: 'discipline', name: 'Disciplinary Finding', lede: 'A finding of the Military Tribunal against a legionary.', person: true },
  { key: 'leave', name: 'Leave of Absence', lede: 'Leave granted, with the period and the reason.', person: true },
  { key: 'requisition', name: 'Equipment Requisition', lede: 'Equipment sought from the Quartermaster.', person: true }
];
const WRIT_BY_KEY = Object.fromEntries(WRIT_TYPES.map(w => [w.key, w]));

function writs() { return S.read(WRITS, []); }
function writsFor(personId) { return writs().filter(w => w.personId === personId).reverse(); }
function writList(kind) { const l = writs().reverse(); return kind ? l.filter(w => w.kind === kind) : l; }
function writGet(id) { return writs().find(w => w.id === id) || null; }

function writAdd(b) {
  const type = WRIT_BY_KEY[b.kind];
  if (!type) throw new Error('That is not a writ of the Legion.');
  const subject = clean(b.subject, 140);
  if (!subject) throw new Error('Give the writ a subject.');
  const person = b.personId ? get(b.personId) : null;
  const list = writs();
  const n = list.filter(w => w.kind === b.kind).length + 1;
  const entry = {
    id: S.id(), kind: b.kind, no: type.name + ' ' + n, subject,
    personId: person ? person.id : '', personName: person ? person.name : '',
    place: clean(b.place, 120), when: clean(b.when, 80),
    body: String(b.body ?? '').replace(/\r/g, '').trim().slice(0, 6000),
    outcome: clean(b.outcome, 140),
    by: b.by || '', byName: b.byName || b.by || '', at: new Date().toISOString()
  };
  list.push(entry);
  S.write(WRITS, list.slice(-1200));
  if (person) note(person.id, 'writ', `${entry.no} \u2014 ${entry.subject}`, b.by);
  return entry;
}

function writRemove(id) {
  S.write(WRITS, writs().filter(w => w.id !== id));
}

const PROPS = 'war-properties.json';

const PROP_KINDS = ['Fort', 'Garrison', 'Watchtower', 'Camp', 'Armoury', 'Stables', 'Quarters', 'Storehouse', 'Other'];
const PROP_STANDING = ['Held', 'Contested', 'Under Repair', 'Ruined', 'Surrendered'];

function properties() { return S.read(PROPS, []); }
function propertyGet(id) { return properties().find(x => x.id === id) || null; }

function normalizeProp(b) {
  return {
    name: clean(b.name, 90),
    kind: PROP_KINDS.includes(b.kind) ? b.kind : 'Other',
    hold: clean(b.hold, 60),
    standing: PROP_STANDING.includes(b.standing) ? b.standing : 'Held',
    keeper: clean(b.keeper, 90),
    garrisoned: Math.max(0, Math.min(9999, parseInt(b.garrisoned, 10) || 0)),
    upkeep: Math.max(0, Math.min(10000000, parseInt(String(b.upkeep ?? '').replace(/[^0-9]/g, ''), 10) || 0)),
    acquired: clean(b.acquired, 60),
    authority: clean(b.authority, 140),
    notes: String(b.notes ?? '').replace(/\r/g, '').trim().slice(0, 1200)
  };
}

function propertyAdd(b) {
  const p = normalizeProp(b);
  if (!p.name) throw new Error('Give the holding a name.');
  const list = properties();
  if (list.length >= 300) throw new Error('The register of holdings is full.');
  const entry = { id: S.id(), ...p, at: new Date().toISOString() };
  list.push(entry);
  S.write(PROPS, list);
  return entry;
}

function propertyUpdate(id, b) {
  const list = properties();
  const p = list.find(x => x.id === id);
  if (!p) throw new Error('No holding answers to that.');
  const next = normalizeProp({ ...p, ...b });
  if (!next.name) throw new Error('Give the holding a name.');
  Object.assign(p, next);
  S.write(PROPS, list);
  return p;
}

function propertyRemove(id) { S.write(PROPS, properties().filter(x => x.id !== id)); }

function propertyTotals() {
  const list = properties();
  return {
    total: list.length,
    held: list.filter(x => x.standing === 'Held').length,
    garrisoned: list.reduce((n, x) => n + (x.garrisoned || 0), 0),
    upkeep: list.reduce((n, x) => n + (x.upkeep || 0), 0)
  };
}

const LETTERS = 'war-letters.json';

const LETTER_KINDS = [
  'Report of banditry or raiding',
  'Petition for protection or escort',
  'Offer of service to the Legion',
  'Complaint against a legionary',
  'Claim for loss or damage',
  'Word from a Hold or House',
  'Other business'
];
const LETTER_STATUS = ['Received', 'Under Consideration', 'Answered', 'Declined', 'Referred'];
const LETTER_STATUS_CLASS = { Received: 'ok', 'Under Consideration': 'warn', Answered: '', Declined: 'warn', Referred: '' };

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
function roman(n) {
  if (n <= 10) return ROMAN[n] || String(n);
  const map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '', v = n;
  map.forEach(([k, r]) => { while (v >= k) { out += r; v -= k; } });
  return out;
}

function letters() { return S.read(LETTERS, []); }
function letterGet(id) { return letters().find(x => x.id === id) || null; }
function letterByNo(no) {
  const want = String(no || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return letters().find(x => x.no.toLowerCase() === want) || null;
}
function lettersWaiting() { return letters().filter(x => x.status === 'Received' || x.status === 'Under Consideration'); }

function letterAdd(b) {
  const name = clean(b.name, 90);
  const subject = clean(b.subject, 140);
  const body = String(b.body ?? '').replace(/\r/g, '').trim().slice(0, 5000);
  if (!name) throw new Error('Set down your name.');
  if (!subject) throw new Error('Give your letter a subject.');
  if (body.length < 10) throw new Error('Set down your business in the letter itself.');
  const list = letters();
  if (list.length >= 2000) throw new Error('The post is full. Seek out an officer of the Legion instead.');
  const entry = {
    id: S.id(),
    no: 'Letter ' + roman(list.length + 1),
    name,
    style: clean(b.style, 90),
    where: clean(b.where, 140),
    hold: clean(b.hold, 60),
    kind: LETTER_KINDS.includes(b.kind) ? b.kind : 'Other business',
    subject, body,
    at: new Date().toISOString(),
    status: 'Received',
    assigned: '', handledBy: '', handledAt: '', reply: ''
  };
  list.push(entry);
  S.write(LETTERS, list);
  return entry;
}

function letterHandle(id, b, by) {
  const list = letters();
  const e = list.find(x => x.id === id);
  if (!e) throw new Error('No letter answers to that.');
  if (b.status && LETTER_STATUS.includes(b.status)) e.status = b.status;
  if (b.assigned !== undefined) e.assigned = clean(b.assigned, 90);
  if (b.reply !== undefined) e.reply = String(b.reply ?? '').replace(/\r/g, '').trim().slice(0, 4000);
  e.handledBy = by || e.handledBy;
  e.handledAt = new Date().toISOString();
  S.write(LETTERS, list);
  return e;
}

function letterRemove(id) { S.write(LETTERS, letters().filter(x => x.id !== id)); }

module.exports = { LETTER_KINDS, LETTER_STATUS, LETTER_STATUS_CLASS, letters, letterGet, letterByNo, lettersWaiting, letterAdd, letterHandle, letterRemove, LEDGER_DIRS, PROP_KINDS, PROP_STANDING, properties, propertyGet, propertyAdd, propertyUpdate, propertyRemove, propertyTotals, note, promotions, promotionsOpen, promotionsFor, proposePromotion, decidePromotion, quotaAll, quotaCurrent, quotaSave, quotaSet, quotaMet, WRIT_TYPES, WRIT_BY_KEY, writs, writsFor, writList, writGet, writAdd, writRemove, FIELD_LABELS, UNITS, UNIT_BY_ID, ACTIVITY, ACTIVITY_CLASS, TRADES, QUALS, QUAL_KEYS, TRACKS, displayQuals, all, forUnit, grouped, add, update, remove, get, counts, ledger, ledgerAdd, ledgerRemove, treasury };
