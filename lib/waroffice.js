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

const QUALS = [
  { key: 'INFAN I', group: 'Infantry' }, { key: 'INFAN II', group: 'Infantry' }, { key: 'INFAN III', group: 'Infantry' },
  { key: 'ARC I', group: 'Archery' }, { key: 'ARC II', group: 'Archery' }, { key: 'ARC III', group: 'Archery' },
  { key: 'JLD', group: 'Leadership' }, { key: 'INST', group: 'Leadership' }, { key: 'CMD', group: 'Leadership' },
  { key: 'QM I', group: 'Quartermaster' }, { key: 'QM II', group: 'Quartermaster' }, { key: 'QM III', group: 'Quartermaster' },
  { key: 'PRO I', group: 'Provost' }, { key: 'PRO II', group: 'Provost' }, { key: 'PRO III', group: 'Provost' },
  { key: 'REC I', group: 'Recruiting' }, { key: 'REC II', group: 'Recruiting' }
];
const QUAL_KEYS = QUALS.map(q => q.key);

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
  const entry = { id: S.id(), ...p, added: new Date().toISOString() };
  list.push(entry);
  saveAll(list);
  return entry;
}

function update(id, b) {
  const list = all();
  const p = list.find(x => x.id === id);
  if (!p) throw new Error('No one upon the rolls answers to that.');
  const next = normalize({ ...p, ...b });
  if (!next.name) throw new Error('Give the legionary a name.');
  Object.assign(p, next);
  saveAll(list);
  return p;
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

function ledgerAdd(b) {
  const dir = b.dir === 'out' ? 'out' : 'in';
  const label = clean(b.label, 120);
  const amount = Math.abs(num(b.amount, 100000000));
  if (!label) throw new Error('Say what the sum is for.');
  if (!amount) throw new Error('Give a sum greater than nothing.');
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
  const income = list.filter(x => x.dir === 'in');
  const spend = list.filter(x => x.dir === 'out');
  const totalIn = income.reduce((n, x) => n + x.amount, 0);
  const totalOut = spend.reduce((n, x) => n + x.amount, 0);
  return { income: income.slice().reverse(), spend: spend.slice().reverse(), totalIn, totalOut, balance: totalIn - totalOut };
}

module.exports = { UNITS, UNIT_BY_ID, ACTIVITY, ACTIVITY_CLASS, TRADES, QUALS, QUAL_KEYS, all, forUnit, grouped, add, update, remove, get, counts, ledger, ledgerAdd, ledgerRemove, treasury };
