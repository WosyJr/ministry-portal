const S = require('./store');

const clean = (v, max) => String(v ?? '').replace(/[\r\n]/g, ' ').trim().slice(0, max);
const text = (v, max) => String(v ?? '').replace(/\r/g, '').trim().slice(0, max);
const now = () => new Date().toISOString();

const money = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0; };
const pct = v => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.min(100, Math.round(n * 1000) / 1000) : 0; };
const slug = s => String(s).toLowerCase().replace(/&/g, 'and').replace(/['’‘`]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
function roman(n) { let out = '', v = Math.max(1, n); ROMAN.forEach(([k, r]) => { while (v >= k) { out += r; v -= k; } }); return out; }

const GROUPS = 'finance-groups.json';
const SPLITS = 'finance-splits.json';
const ROLLNOTES = 'finance-rollnotes.json';
const HOLDS = 'finance-holds.json';
const MONTHS = 'finance-months.json';
const REQUESTS = 'finance-requests.json';
const SPENDING = 'finance-spending.json';
const ROSTERS = 'finance-rosters.json';
const VAULT = 'finance-vault.json';
const SUMMONS = 'finance-summons.json';

const INCOME_KINDS = [
  ['eec', 'EEC income', 'The Exchange’s gross income. The Treasury takes only its cut.'],
  ['tax', 'Hold taxes', 'What the Holds rendered, collected the month before.'],
  ['mint', 'Mint tribute', 'What the Mint rendered to the Treasury.'],
  ['other', 'Other income', 'Charter fees, forfeitures and anything else.']
];
const INCOME_IDS = INCOME_KINDS.map(k => k[0]);


const SEED_GROUPS = [
  { name: 'Imperial Legion', account: '', fundedBy: '', eec: 10, tax: 70, mint: 80, other: 0, fixed: 0 },
  { name: 'Governor’s Office', account: '', fundedBy: '', eec: 4, tax: 30, mint: 20, other: 0, fixed: 0 },
  { name: 'Imperial Guard', account: '', fundedBy: 'imperial-legion', eec: 0, tax: 0, mint: 0, other: 0, fixed: 0 },
  { name: 'Synod', account: '', fundedBy: '', eec: 2, tax: 0, mint: 0, other: 0, fixed: 0 },
  { name: 'Penitus Oculatus', account: '', fundedBy: '', eec: 2.5, tax: 0, mint: 0, other: 0, fixed: 0 }
];

function tieMinistriesToTheOffice(list) {
  const office = list.find(g => /governor/i.test(String(g.name || '')) && !g.fundedBy);
  if (!office) return false;
  let moved = false;
  list.forEach(g => {
    if (g === office || g.fundedBy) return;
    if (!/^(the\s+)?ministry of\s+/i.test(String(g.name || ''))) return;
    g.fundedBy = office.id;
    g.eec = 0; g.tax = 0; g.mint = 0; g.other = 0; g.fixed = 0;
    moved = true;
  });
  return moved;
}

function groups() {
  const l = S.read(GROUPS, null);
  if (l === null) return S.write(GROUPS, SEED_GROUPS.map((g, i) => ({ id: slug(g.name), ...g, active: true, order: i })));
  const list = l.slice();
  if (tieMinistriesToTheOffice(list)) S.write(GROUPS, list);
  return list.sort((a, b) => (a.order || 0) - (b.order || 0));
}
const looseId = v => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
function groupGet(id) {
  const list = groups();
  const exact = list.find(g => g.id === id);
  if (exact) return exact;
  const loose = looseId(id);
  if (!loose) return null;
  return list.find(g => looseId(g.id) === loose) || list.find(g => looseId(g.name) === loose) || null;
}
function groupName(id) { const g = groupGet(id); return g ? g.name : ''; }
function drawing() { return groups().filter(g => g.active !== false && !g.fundedBy); }
function under(id) { return groups().filter(g => g.fundedBy === id && g.active !== false); }

function groupSave(id, b) {
  const list = groups();
  let g = id ? list.find(x => x.id === id) : null;
  const name = clean(b.name, 90);
  if (!name) throw new Error('Give the group a name.');
  const fundedBy = clean(b.fundedBy, 40);
  if (fundedBy && g && fundedBy === g.id) throw new Error('A group cannot be funded under itself.');
  if (fundedBy && !list.some(x => x.id === fundedBy)) throw new Error('No such group to be funded under.');
  const shares = fundedBy
    ? { eec: 0, tax: 0, mint: 0, other: 0, fixed: 0 }
    : { eec: pct(b.eec), tax: pct(b.tax), mint: pct(b.mint), other: pct(b.other), fixed: money(b.fixed) };
  const fields = {
    name, account: clean(b.account, 60), fundedBy, ...shares,
    muster: musterIds({ muster: [].concat(b.muster || []).map(x => clean(x, 40)) }).filter((x, i, a) => a.indexOf(x) === i),
    musterPer: MUSTER_PERIODS.some(x => x[0] === clean(b.musterPer, 20)) ? clean(b.musterPer, 20) : 'week',
    musterLeave: !!b.musterLeave,
    active: b.active === undefined ? true : !!b.active
  };
  if (g) Object.assign(g, fields);
  else {
    let nid = slug(name), i = 2;
    while (list.some(x => x.id === nid)) nid = slug(name) + '-' + i++;
    if (!fields.muster.length && b.muster === undefined) {
      fields.muster = rollForName(name).filter(k => !list.some(x => musterIds(x).includes(k)));
    }
    g = { id: nid, ...fields, order: list.length };
    list.push(g);
  }
  S.write(GROUPS, list);
  return g;
}

function groupRemove(id) {
  if (under(id).length) throw new Error('Another group is funded under this one. Move it first.');
  S.write(GROUPS, groups().filter(g => g.id !== id));
}

function treasuryCut() { return pct(drawing().reduce((n, g) => n + Number(g.eec || 0), 0)); }


const SEED_HOLDS = [
  { name: 'Markarth', monthly: 20000 }, { name: 'Riften', monthly: 20000 },
  { name: 'Solitude', monthly: 20000 }, { name: 'Whiterun', monthly: 20000 },
  { name: 'Windhelm', monthly: 20000 }, { name: 'Falkreath', monthly: 12500 },
  { name: 'Dawnstar', monthly: 12500 }, { name: 'Morthal', monthly: 12500 }
];

function holds() {
  const l = S.read(HOLDS, null);
  if (l === null) return S.write(HOLDS, SEED_HOLDS.map(h => ({ id: slug(h.name), ...h })));
  return l;
}
function holdSave(id, b) {
  const list = holds();
  let h = id ? list.find(x => x.id === id) : null;
  const name = clean(b.name, 60);
  if (!name) throw new Error('Name the Hold.');
  const fields = { name, monthly: money(b.monthly) };
  if (h) Object.assign(h, fields);
  else {
    let nid = slug(name), i = 2;
    while (list.some(x => x.id === nid)) nid = slug(name) + '-' + i++;
    h = { id: nid, ...fields };
    list.push(h);
  }
  S.write(HOLDS, list);
  return h;
}
function holdRemove(id) { S.write(HOLDS, holds().filter(h => h.id !== id)); }
function holdsDue() { return holds().reduce((n, h) => n + money(h.monthly), 0); }


const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const STATUS = ['Draft', 'Approved', 'Closed'];

function monthKey(d) { const x = d || new Date(); return x.getUTCFullYear() + '-' + String(x.getUTCMonth() + 1).padStart(2, '0'); }
function monthLabel(key) {
  const [y, m] = String(key).split('-');
  return (MONTH_NAMES[Number(m) - 1] || '?') + ' ' + y;
}
function shiftKey(key, by) {
  const [y, m] = String(key).split('-').map(Number);
  const d = new Date(Date.UTC(y, (m - 1) + by, 1));
  return monthKey(d);
}

function months() { return S.read(MONTHS, []); }
function monthGet(key) { return months().find(m => m.key === key) || null; }

function sharesNow() {
  const out = {};
  groups().forEach(g => { out[g.id] = { eec: pct(g.eec), tax: pct(g.tax), mint: pct(g.mint), other: pct(g.other), fixed: money(g.fixed) }; });
  return out;
}

function monthOpen(key, by) {
  const k = /^\d{4}-\d{2}$/.test(String(key)) ? String(key) : monthKey();
  const list = months();
  if (list.some(m => m.key === k)) return list.find(m => m.key === k);
  const prev = list.find(m => m.key === shiftKey(k, -1));
  const entry = {
    key: k, label: monthLabel(k), status: 'Draft',
    income: { eec: 0, tax: 0, mint: 0, other: 0 },
    useHoldsFor: 'tax',
    shares: prev ? JSON.parse(JSON.stringify(prev.shares || {})) : sharesNow(),
    paid: [],
    approvedBy: '', approvedAt: '', closedBy: '', closedAt: '',
    by: (by && by.name) || '', at: now()
  };
  list.push(entry);
  list.sort((a, b) => a.key.localeCompare(b.key));
  S.write(MONTHS, list);
  return entry;
}

function monthEnsure(key, by) { return monthGet(key) || monthOpen(key, by); }

function monthSaveIncome(key, b, by) {
  const list = months();
  const m = list.find(x => x.key === key);
  if (!m) throw new Error('No such month.');
  if (m.status === 'Closed') throw new Error('That month is closed. Reopen it before changing anything.');
  INCOME_IDS.forEach(k => { if (b[k] !== undefined) m.income[k] = money(b[k]); });
  if (b.useHolds !== undefined) m.useHoldsFor = b.useHolds ? 'tax' : '';
  if (m.useHoldsFor === 'tax' && b.tax === undefined) m.income.tax = holdsDue();
  S.write(MONTHS, list);
  return m;
}

function monthSaveShares(key, b) {
  const list = months();
  const m = list.find(x => x.key === key);
  if (!m) throw new Error('No such month.');
  if (m.status !== 'Draft') throw new Error('The shares are locked. Unlock the month to change them.');
  const s = m.shares || (m.shares = {});
  groups().forEach(g => {
    const row = (b.g && b.g[g.id]) || {};
    s[g.id] = g.fundedBy
      ? { eec: 0, tax: 0, mint: 0, other: 0, fixed: 0 }
      : { eec: pct(row.eec), tax: pct(row.tax), mint: pct(row.mint), other: pct(row.other), fixed: money(row.fixed) };
  });
  S.write(MONTHS, list);
  return m;
}

function monthSetStatus(key, status, by) {
  const list = months();
  const m = list.find(x => x.key === key);
  if (!m) throw new Error('No such month.');
  if (!STATUS.includes(status)) throw new Error('No such state.');
  if (status === 'Closed') {
    const b = budget(m);
    if (b.leftToPay > 0.005) throw new Error('Every group must have its draw before the month is closed. ' + b.leftToPay.toFixed(2) + ' is still to pay.');
  }
  m.status = status;
  if (status === 'Approved') { m.approvedBy = (by && by.name) || ''; m.approvedAt = now(); }
  if (status === 'Closed') { m.closedBy = (by && by.name) || ''; m.closedAt = now(); }
  if (status === 'Draft') { m.approvedBy = ''; m.approvedAt = ''; m.closedBy = ''; m.closedAt = ''; }
  S.write(MONTHS, list);
  return m;
}

function monthRemove(key) { S.write(MONTHS, months().filter(m => m.key !== key)); }


function budget(monthOrKey) {
  const m = typeof monthOrKey === 'string' ? monthGet(monthOrKey) : monthOrKey;
  if (!m) return null;
  const inc = m.income || { eec: 0, tax: 0, mint: 0, other: 0 };
  const shares = m.shares || {};
  const paid = m.paid || [];
  const list = drawing();

  const cut = pct(list.reduce((n, g) => n + Number((shares[g.id] || {}).eec || 0), 0));
  const takesIn = money(inc.eec * cut / 100) + money(inc.tax) + money(inc.mint) + money(inc.other);

  const rows = list.map(g => {
    const s = shares[g.id] || { eec: 0, tax: 0, mint: 0, other: 0, fixed: 0 };
    const parts = {
      eec: money(inc.eec * Number(s.eec || 0) / 100),
      tax: money(inc.tax * Number(s.tax || 0) / 100),
      mint: money(inc.mint * Number(s.mint || 0) / 100),
      other: money(inc.out === undefined ? inc.other * Number(s.other || 0) / 100 : 0)
    };
    const draw = money(parts.eec + parts.tax + parts.mint + parts.other + money(s.fixed));
    const got = money(paid.filter(p => p.groupId === g.id && !p.requestId).reduce((n, p) => n + money(p.amount), 0));
    return {
      group: g, share: s, parts, fixed: money(s.fixed), draw,
      paid: got, left: money(Math.max(0, draw - got)),
      done: draw > 0 ? got + 0.005 >= draw : true,
      payroll: payrollFor(g.id),
      under: under(g.id).map(x => x.name),
      split: splittable(g.id) ? splitFor(m.key, g.id, draw) : null
    };
  });

  const givenOut = money(rows.reduce((n, r) => n + r.draw, 0));
  const paidOut = money(paid.reduce((n, p) => n + money(p.amount), 0));
  const reqPaid = money(paid.filter(p => p.requestId).reduce((n, p) => n + money(p.amount), 0));
  const allowed = money(requestsFor(m.key).filter(r => r.status === 'Approved' || r.status === 'Paid').reduce((n, r) => n + money(r.approved), 0));

  return {
    month: m, rows, cut, takesIn, givenOut,
    keeps: money(Math.max(0, takesIn - givenOut)),
    stays: money(inc.eec - money(inc.eec * cut / 100)),
    paidOut, reqPaid, allowed,
    leftToPay: money(rows.reduce((n, r) => n + r.left, 0)),
    groupsPaid: rows.filter(r => r.done).length,
    groupsAll: rows.length,
    balances: Math.abs(takesIn - givenOut) < 0.005
  };
}


const rollNoteKey = (rollId, name) =>
  String(rollId || '') + '|' + String(name || '').trim().toLowerCase();

function rollNotes() { return S.read(ROLLNOTES, {}); }

function rollNoteFor(rollId, name) {
  return rollNotes()[rollNoteKey(rollId, name)] || { account: '', note: '' };
}

function rollNoteSet(rollId, name, b, by) {
  const nm = clean(name, 120);
  if (!nm) throw new Error('Name who it is against.');
  if (!MUSTER_IDS.includes(String(rollId || ''))) throw new Error('No such roll.');
  const all = rollNotes();
  const k = rollNoteKey(rollId, nm);
  const account = clean(b && b.account, 60);
  const note = clean(b && b.note, 200);
  if (!account && !note) delete all[k];
  else all[k] = { account, note, name: nm, by: (by && by.name) || '', at: new Date().toISOString() };
  S.write(ROLLNOTES, all);
  return { account, note };
}

function rollNoteCounts(rollIds) {
  const all = rollNotes();
  const ids = [].concat(rollIds || []);
  let withAccount = 0, total = 0;
  Object.keys(all).forEach(k => {
    const id = k.slice(0, k.lastIndexOf('|'));
    if (ids.length && !ids.includes(id)) return;
    total += 1;
    if (all[k].account) withAccount += 1;
  });
  return { total, withAccount };
}


const SPLIT_MODES = [
  ['auto', 'By what the roll costs'],
  ['pct', 'A set share of the draw'],
  ['fixed', 'A flat sum off the top'],
  ['none', 'Nothing']
];
const SPLIT_MODE_BY_ID = Object.fromEntries(SPLIT_MODES);
const splitKey = (key, groupId) => String(key || '') + '|' + String(groupId || '');

function splits() { return S.read(SPLITS, {}); }

function splitSaved(key, groupId) {
  const all = splits();
  return all[splitKey(key, groupId)] || { parts: {}, note: '' };
}

function splitParts(groupId) {
  const g = groupGet(groupId);
  if (!g) return [];
  const by = MUSTER_BY_KEY();
  const per = MUSTER_BY_ID[g.musterPer] || MUSTER_BY_ID.week;
  const out = musterIds(g).map(id => {
    const unit = by[id];
    if (!unit) return null;
    const all = rollHeads(id);
    const counted = g.musterLeave ? all : all.filter(p => !MUSTER_ON_LEAVE.includes(p.activity));
    const period = money(counted.reduce((n, p) => n + money(p.pay) + money(p.bonus), 0));
    return {
      id, name: unit.name, full: unit.full || unit.name, kind: unit.kind,
      where: unit.where, heads: counted.length, onRoll: all.length,
      cost: money(period * per[2])
    };
  }).filter(Boolean);

  under(groupId).forEach(child => {
    const p = payrollFor(child.id);
    out.push({
      id: 'group:' + child.id, name: child.name, full: child.name, kind: 'group',
      where: '/finance/rosters?group=' + child.id,
      heads: rosterFor(child.id).length + (musterFor(child) ? musterFor(child).people.length : 0),
      onRoll: rosterFor(child.id).length + (musterFor(child) ? musterFor(child).onRoll : 0),
      cost: p.hasUnder ? p.withUnder : p.allMonthly
    });
  });

  const hand = rosterFor(groupId);
  if (hand.length) {
    out.push({
      id: 'hand', name: 'Kept by hand', full: 'Kept by hand', kind: 'hand',
      where: '/finance/rosters?group=' + groupId, heads: hand.length, onRoll: hand.length,
      cost: money(hand.reduce((n, r) => n + money(r.weekly), 0) * 4)
    });
  }
  return out;
}

function splitFor(key, groupId, drawOverride) {
  const g = groupGet(groupId);
  if (!g) return null;
  const saved = splitSaved(key, groupId);
  const parts = splitParts(groupId);

  let draw = Number(drawOverride);
  if (!Number.isFinite(draw)) {
    const b = budget(key);
    const row = b && b.rows.find(r => r.group.id === groupId);
    draw = row ? row.draw : 0;
  }
  draw = money(draw);

  const set = parts.map(p => {
    const o = saved.parts[p.id] || {};
    const mode = SPLIT_MODE_BY_ID[o.mode] ? o.mode : 'auto';
    return { ...p, mode, pct: Number(o.pct || 0), fixedSet: money(o.fixed), note: clean(o.note, 300) };
  });

  const fixedTotal = money(set.filter(p => p.mode === 'fixed').reduce((n, p) => n + p.fixedSet, 0));
  const pctTotal = set.filter(p => p.mode === 'pct').reduce((n, p) => n + Number(p.pct || 0), 0);
  const pctSum = money(draw * Math.min(100, Math.max(0, pctTotal)) / 100);
  const forAuto = money(Math.max(0, draw - fixedTotal - pctSum));
  const autoCost = money(set.filter(p => p.mode === 'auto').reduce((n, p) => n + p.cost, 0));

  const rows = set.map(p => {
    let gets = 0;
    if (p.mode === 'fixed') gets = p.fixedSet;
    else if (p.mode === 'pct') gets = money(draw * Math.min(100, Math.max(0, p.pct)) / 100);
    else if (p.mode === 'auto') gets = autoCost > 0 ? money(forAuto * p.cost / autoCost) : 0;
    return {
      ...p, gets,
      share: draw > 0 ? Math.round((gets / draw) * 10000) / 100 : 0,
      covers: p.cost > 0 ? Math.round((gets / p.cost) * 1000) / 10 : null,
      short: money(Math.max(0, p.cost - gets)),
      spare: money(Math.max(0, gets - p.cost))
    };
  });

  const allotted = money(rows.reduce((n, r) => n + r.gets, 0));
  const costAll = money(rows.reduce((n, r) => n + r.cost, 0));
  return {
    groupId, group: g, key, draw, rows,
    allotted, unallotted: money(Math.max(0, draw - allotted)),
    over: money(Math.max(0, allotted - draw)),
    costAll, shortAll: money(rows.reduce((n, r) => n + r.short, 0)),
    covered: costAll > 0 ? Math.round((allotted / costAll) * 1000) / 10 : null,
    anyOverride: rows.some(r => r.mode !== 'auto'),
    overspent: allotted > draw + 0.005,
    note: saved.note || '',
    setBy: saved.setBy || '', setAt: saved.setAt || ''
  };
}

function setSplit(key, groupId, body, by) {
  if (!groupGet(groupId)) throw new Error('No such group.');
  const all = splits();
  const parts = splitParts(groupId);
  const raw = (body && body.p) || {};
  const out = {};
  parts.forEach(p => {
    const o = raw[p.id] || {};
    const askedFixed = money(o.fixed);
    const askedPct = Math.min(100, Math.max(0, Number(o.pct) || 0));
    let mode = SPLIT_MODE_BY_ID[o.mode] ? o.mode : 'auto';
    if (mode === 'auto' && askedFixed > 0) mode = 'fixed';
    else if (mode === 'auto' && askedPct > 0) mode = 'pct';
    const row = { mode };
    if (mode === 'pct') row.pct = askedPct;
    if (mode === 'fixed') row.fixed = askedFixed;
    const n = clean(o.note, 300);
    if (n) row.note = n;
    out[p.id] = row;
  });
  all[splitKey(key, groupId)] = {
    parts: out,
    note: clean(body && body.note, 600),
    setBy: (by && by.name) || '',
    setAt: new Date().toISOString()
  };
  S.write(SPLITS, all);
  return splitFor(key, groupId);
}

function clearSplit(key, groupId) {
  const all = splits();
  delete all[splitKey(key, groupId)];
  S.write(SPLITS, all);
}

function splittable(groupId) {
  return splitParts(groupId).length > 1;
}


function payOut(key, b, by) {
  const list = months();
  const m = list.find(x => x.key === key);
  if (!m) throw new Error('No such month.');
  if (m.status === 'Draft') throw new Error('Approve the budget before paying anything out.');
  if (m.status === 'Closed') throw new Error('That month is closed.');
  const groupId = clean(b.groupId, 40);
  if (!groupGet(groupId)) throw new Error('No such group.');
  const amount = money(b.amount);
  if (!amount) throw new Error('Set down the sum paid.');
  const entry = {
    id: S.id(), groupId, amount, monthKey: key,
    forWhat: clean(b.forWhat, 120) || 'Monthly draw',
    requestId: clean(b.requestId, 40),
    when: clean(b.when, 80),
    note: clean(b.note, 200),
    by: (by && by.name) || '', at: now()
  };
  m.paid = (m.paid || []).concat([entry]);
  S.write(MONTHS, list);
  if (entry.requestId) requestSetStatus(entry.requestId, 'Paid', by);
  entry.wages = wagesFromPayout(entry, by);
  if (entry.wages.length) {
    const l2 = months();
    const m2 = l2.find(x => x.key === key);
    const e2 = m2 && (m2.paid || []).find(p => p.id === entry.id);
    if (e2) { e2.wages = entry.wages; S.write(MONTHS, l2); }
  }
  return entry;
}

function groupOwningRoll(rollName, fallbackId) {
  const name = String(rollName || '');
  if (!name) return fallbackId;
  const by = MUSTER_BY_KEY();
  const key = Object.keys(by).find(k => by[k] && by[k].name === name);
  if (!key) return fallbackId;
  const owners = groups().filter(g => g.active !== false && musterIds(g).includes(key));
  if (!owners.length) return fallbackId;
  const child = owners.find(g => g.fundedBy);
  return (child || owners[0]).id;
}

function wagesFromPayout(entry, by) {
  const g = groupGet(entry.groupId);
  if (!g) return [];
  const mus = musterFor(g);
  if (!mus || !mus.people.length) return [];
  const per = MUSTER_BY_ID[g.musterPer] || MUSTER_BY_ID.week;
  const heads = mus.people
    .map(p => ({ p, owed: money((money(p.pay) + money(p.bonus)) * per[2]) }))
    .filter(x => x.owed > 0);
  if (!heads.length) return [];
  const bill = money(heads.reduce((n, x) => n + x.owed, 0));
  if (!bill) return [];

  const short = entry.amount < bill;
  const scale = short ? entry.amount / bill : 1;
  const list = wages();
  const made = [];
  let given = 0;
  heads.forEach((x, i) => {
    const last = i === heads.length - 1;
    const share = short && last
      ? money(entry.amount - given)
      : money(x.owed * scale);
    given = money(given + share);
    if (!share) return;
    const w = wageEntry({
      name: x.p.name, rank: x.p.rank,
      groupId: groupOwningRoll(x.p.source, entry.groupId),
      roll: x.p.source,
      amount: share,
      forWhat: short ? 'Wages, short of the bill' : 'Wages for the month',
      when: entry.when, monthKey: entry.monthKey || monthKey()
    }, by, { payoutId: entry.id });
    list.push(w);
    made.push(w.id);
  });
  if (made.length) S.write(WAGES, list);
  return made;
}

function payUndo(key, id) {
  const list = months();
  const m = list.find(x => x.key === key);
  if (!m) return null;
  if (m.status === 'Closed') throw new Error('That month is closed.');
  const gone = (m.paid || []).find(p => p.id === id);
  m.paid = (m.paid || []).filter(p => p.id !== id);
  S.write(MONTHS, list);
  if (gone) S.write(WAGES, wages().filter(w => w.payoutId !== gone.id));
  if (gone && gone.requestId) requestSetStatus(gone.requestId, 'Approved', null);
  return m;
}


const REQ_STATUS = ['Waiting', 'Approved', 'Refused', 'Paid'];
const REQ_CLASS = { Waiting: 'warn', Approved: 'ok', Refused: 'bad', Paid: '' };

function requests() { return S.read(REQUESTS, []); }
function requestGet(id) { return requests().find(r => r.id === id) || null; }
function requestsFor(key) { return requests().filter(r => r.monthKey === key); }
function requestsWaiting() { return requests().filter(r => r.status === 'Waiting').reverse(); }
function requestsToPay() { return requests().filter(r => r.status === 'Approved').reverse(); }

function requestAsk(b, by) {
  const groupId = clean(b.groupId, 40);
  if (!groupGet(groupId)) throw new Error('Name the group asking.');
  const asked = money(b.asked);
  if (!asked) throw new Error('Set down the sum asked for.');
  const purpose = text(b.purpose, 1500);
  if (!purpose) throw new Error('Say what it is for.');
  const list = requests();
  const entry = {
    id: S.id(), no: 'Request ' + roman(list.length + 1),
    groupId, monthKey: clean(b.monthKey, 10) || monthKey(),
    asked, purpose, approved: 0, payBy: '',
    status: 'Waiting', answeredBy: '', answeredAt: '', note: '',
    by: (by && by.name) || '', byUser: (by && by.username) || '', at: now()
  };
  list.push(entry);
  S.write(REQUESTS, list);
  return entry;
}

function requestAnswer(id, b, by) {
  const list = requests();
  const r = list.find(x => x.id === id);
  if (!r) throw new Error('No request answers to that.');
  const want = REQ_STATUS.includes(b.status) ? b.status : 'Waiting';
  if (want === 'Approved') {
    const approved = money(b.approved !== undefined && b.approved !== '' ? b.approved : r.asked);
    if (!approved) throw new Error('Set down what is allowed.');
    r.approved = approved;
    r.payBy = clean(b.payBy, 80);
  }
  if (want === 'Refused') r.approved = 0;
  r.status = want;
  r.note = text(b.note, 600);
  r.answeredBy = (by && by.name) || r.answeredBy;
  r.answeredAt = now();
  S.write(REQUESTS, list);
  return r;
}

function requestSetStatus(id, status, by) {
  const list = requests();
  const r = list.find(x => x.id === id);
  if (!r || !REQ_STATUS.includes(status)) return null;
  r.status = status;
  if (by) { r.answeredBy = by.name || r.answeredBy; r.answeredAt = now(); }
  S.write(REQUESTS, list);
  return r;
}

function requestRemove(id) { S.write(REQUESTS, requests().filter(r => r.id !== id)); }


const SPEND_ON = ['Pay and wages', 'Supply and provision', 'Arms and armour', 'Horses and carriage', 'Works and repair', 'Hire of persons', 'Gifts and bounties', 'Other'];

function spending() { return S.read(SPENDING, []); }
function spendingFor(key, groupId) {
  return spending().filter(s => (!key || s.monthKey === key) && (!groupId || s.groupId === groupId)).reverse();
}
function spendAdd(b, by) {
  const groupId = clean(b.groupId, 40);
  if (!groupGet(groupId)) throw new Error('Name the group.');
  const amount = money(b.amount);
  if (!amount) throw new Error('Set down the sum spent.');
  const what = clean(b.what, 200);
  if (!what) throw new Error('Say what it went on.');
  const list = spending();
  const entry = {
    id: S.id(), groupId, monthKey: clean(b.monthKey, 10) || monthKey(),
    amount, what,
    on: SPEND_ON.includes(b.on) ? b.on : 'Other',
    when: clean(b.when, 80),
    by: (by && by.name) || '', at: now()
  };
  list.push(entry);
  S.write(SPENDING, list);
  try { if (S.read(BOOK_OPENED, null)) bookAdd(groupId, 'out', { amount, what, on: entry.on }, by, { spend: entry.id }); } catch (_) {}
  return entry;
}
function spendRemove(id) { S.write(SPENDING, spending().filter(s => s.id !== id)); try { bookUnlink('spend', id); } catch (_) {} }

function spendingSummary(key) {
  const b = budget(key);
  const spent = spendingFor(key);
  return (b ? b.rows : []).map(r => {
    const mine = spent.filter(s => s.groupId === r.group.id);
    const logged = money(mine.reduce((n, s) => n + money(s.amount), 0));
    const byOn = {};
    mine.forEach(s => { byOn[s.on] = money((byOn[s.on] || 0) + money(s.amount)); });
    const top = Object.keys(byOn).sort((x, y) => byOn[y] - byOn[x])[0] || '';
    return { group: r.group, received: r.paid, logged, left: money(Math.max(0, r.paid - logged)), mostlyOn: top };
  });
}


function sliceOfParent(key, parentId, childId) {
  const sp = splitFor(key, parentId);
  if (!sp || !sp.draw) return 0;
  const row = sp.rows.find(r => r.id === 'group:' + childId);
  if (!row) return 0;
  return row.gets / sp.draw;
}

function paidInto(groupId) {
  const g = groupGet(groupId);
  if (!g) return [];
  const out = [];
  months().forEach(m => {
    (m.paid || []).forEach(p => {
      if (p.groupId !== groupId) return;
      out.push({
        key: m.key, amount: money(p.amount), direct: true,
        forWhat: p.forWhat || 'Monthly draw', when: p.when || '', at: p.at || '',
        by: p.by || '', from: ''
      });
    });
    if (!g.fundedBy) return;
    const parent = groupGet(g.fundedBy);
    if (!parent) return;
    const share = sliceOfParent(m.key, parent.id, groupId);
    if (!share) return;
    (m.paid || []).forEach(p => {
      if (p.groupId !== parent.id) return;
      const cut = money(money(p.amount) * share);
      if (!cut) return;
      out.push({
        key: m.key, amount: cut, direct: false,
        forWhat: p.forWhat || 'Monthly draw', when: p.when || '', at: p.at || '',
        by: p.by || '', from: parent.name, share: Math.round(share * 10000) / 100
      });
    });
  });
  return out;
}

function accountFor(groupId) {
  const g = groupGet(groupId);
  if (!g) return null;
  const inRows = paidInto(groupId);
  const outRows = spending().filter(s => s.groupId === groupId);
  const wageRows = wages().filter(w => w.groupId === groupId);

  const keys = {};
  const touch = k => {
    if (!keys[k]) keys[k] = { key: k, label: monthLabel(k), inAmt: 0, outAmt: 0, inN: 0, outN: 0, wageAmt: 0, spendAmt: 0 };
    return keys[k];
  };
  inRows.forEach(r => { const k = touch(r.key); k.inAmt = money(k.inAmt + r.amount); k.inN += 1; });
  outRows.forEach(r => {
    const k = touch(r.monthKey || monthKey());
    const a = money(r.amount);
    k.outAmt = money(k.outAmt + a); k.spendAmt = money(k.spendAmt + a); k.outN += 1;
  });
  wageRows.forEach(r => {
    const k = touch(r.monthKey || monthKey());
    const a = money(r.amount);
    k.outAmt = money(k.outAmt + a); k.wageAmt = money(k.wageAmt + a); k.outN += 1;
  });

  const ledger = Object.keys(keys).sort().map(k => keys[k]);
  let run = 0;
  ledger.forEach(row => {
    run = Math.round((run + row.inAmt - row.outAmt) * 100) / 100;
    row.balance = run;
    row.overdrawn = run < -0.005;
  });

  const paidIn = money(inRows.reduce((n, r) => n + r.amount, 0));
  const inWages = money(wageRows.reduce((n, r) => n + money(r.amount), 0));
  const inSpending = money(outRows.reduce((n, r) => n + money(r.amount), 0));
  const spent = money(inWages + inSpending);
  const inHand = Math.round((paidIn - spent) * 100) / 100;
  const pay = payrollFor(groupId);
  const monthly = pay.hasUnder ? pay.withUnder : pay.allMonthly;
  const last = inRows.slice().sort((a, b) => String(a.at).localeCompare(String(b.at))).pop() || null;

  const byOn = {};
  outRows.forEach(r => { byOn[r.on] = money((byOn[r.on] || 0) + money(r.amount)); });
  const mostlyOn = Object.keys(byOn).sort((a, b) => byOn[b] - byOn[a])[0] || '';

  return {
    group: g, paidIn, spent, inHand,
    wages: inWages, spending: inSpending,
    wagePeople: new Set(wageRows.map(r => r.name)).size,
    overdrawn: inHand < -0.005,
    over: inHand < 0 ? Math.round(-inHand * 100) / 100 : 0,
    usedPct: paidIn > 0 ? Math.min(100, Math.round((spent / paidIn) * 1000) / 10) : 0,
    months: ledger.length,
    monthly, mostlyOn, byOn,
    holdsMonths: monthly > 0 ? Math.round((inHand / monthly) * 10) / 10 : null,
    last, ledger: ledger.slice().reverse(),
    paidRows: inRows.length, spentRows: outRows.length + wageRows.length,
    anyShared: inRows.some(r => !r.direct),
    fundedBy: g.fundedBy ? groupName(g.fundedBy) : ''
  };
}


const BOOK = 'finance-book.json';
const BOOK_OPENED = 'finance-book-opened.json';
const BOOK_KINDS = ['out', 'in', 'set', 'open'];
const cents = v => { const n = Number(String(v ?? '').replace(/[,\s]/g, '')); return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN; };
const r2 = n => Math.round(n * 100) / 100;

function bookRaw() { return S.read(BOOK, []); }

function bookOpen() {
  if (S.read(BOOK_OPENED, null)) return;
  const list = bookRaw();
  const at = now();
  groups().forEach(g => {
    if (list.some(e => e.groupId === g.id)) return;
    let a = null;
    try { a = accountFor(g.id); } catch (_) { a = null; }
    if (!a || !(a.paidRows || a.spentRows)) return;
    list.push({ id: S.id(), groupId: g.id, kind: 'open', amount: r2(a.inHand), what: 'Carried over from the old account', on: '', forWhom: '', by: '', at,
      history: (a.ledger || []).slice().reverse().map(r => ({ label: r.label, inAmt: r.inAmt, outAmt: r.outAmt, balance: r.balance })) });
  });
  S.write(BOOK, list);
  S.write(BOOK_OPENED, { at });
}

function bookFor(groupId) {
  bookOpen();
  const g = groupGet(groupId);
  if (!g) return null;
  const mine = bookRaw().filter(e => e.groupId === groupId).sort((a, b) => String(a.at).localeCompare(String(b.at)));
  let bal = 0;
  const lines = mine.map(e => {
    const before = bal;
    if (!e.struck) {
      if (e.kind === 'set' || e.kind === 'open') bal = r2(Number(e.amount) || 0);
      else if (e.kind === 'in') bal = r2(bal + (Number(e.amount) || 0));
      else bal = r2(bal - (Number(e.amount) || 0));
    }
    return Object.assign({}, e, { before, after: bal, delta: r2(bal - before) });
  });
  const live = lines.filter(e => !e.struck);
  const pay = payrollFor(groupId);
  const monthly = pay.hasUnder ? pay.withUnder : pay.allMonthly;
  const opened = lines.find(e => e.kind === 'open');
  return {
    group: g, balance: bal, set: live.length > 0, lines: lines.slice().reverse(), last: live[live.length - 1] || null,
    monthly, weekly: pay.allWeekly, biweekly: pay.allBiweekly, monthlyOwn: pay.allMonthly,
    lasts: monthly > 0 && bal > 0 ? Math.round((bal / monthly) * 10) / 10 : null,
    overdrawn: bal < -0.005,
    before: opened && opened.history ? opened.history : []
  };
}

function bookAdd(groupId, kind, b, by, link) {
  bookOpen();
  if (!groupGet(groupId)) throw new Error('No such account.');
  if (!BOOK_KINDS.includes(kind) || kind === 'open') throw new Error('Say whether money is going out, coming in, or the balance is being set.');
  const amount = cents(b.amount);
  if (!Number.isFinite(amount)) throw new Error('Set down the sum as a number.');
  if (kind !== 'set' && amount <= 0) throw new Error('Set down a sum above nothing.');
  const what = clean(b.what, 200);
  if (kind === 'out' && !what) throw new Error('Say what the money went on.');
  const entry = {
    id: S.id(), groupId, kind, amount: kind === 'set' ? amount : Math.abs(amount),
    what: what || (kind === 'in' ? 'Paid in' : kind === 'set' ? 'Balance set' : ''),
    on: kind === 'out' ? (SPEND_ON.includes(b.on) ? b.on : 'Other') : '',
    forWhom: clean(b.forWhom, 140),
    by: (by && by.name) || '', at: now(),
    ...(link || {})
  };
  const list = bookRaw();
  list.push(entry);
  S.write(BOOK, list);
  return entry;
}

function bookSetMany(values, why, by) {
  bookOpen();
  const changed = [];
  Object.keys(values || {}).forEach(groupId => {
    const raw = String(values[groupId] ?? '').trim();
    if (!raw || !groupGet(groupId)) return;
    const want = cents(raw);
    if (!Number.isFinite(want)) throw new Error('"' + raw + '" is not a sum.');
    const cur = bookFor(groupId);
    if (cur.set && Math.abs(cur.balance - want) < 0.005) return;
    changed.push(bookAdd(groupId, 'set', { amount: want, what: clean(why, 200) || 'Balance set' }, by));
  });
  return changed;
}

function bookStrike(id, by) {
  const list = bookRaw();
  const e = list.find(x => x.id === id);
  if (!e || e.kind === 'open') return null;
  e.struck = { by: (by && by.name) || '', at: now() };
  S.write(BOOK, list);
  return e;
}

function bookUnlink(field, id, amount) {
  const list = bookRaw();
  let touched = false;
  list.forEach(e => {
    if (e.struck) return;
    if (e[field] === id) { e.struck = { by: '', at: now(), why: 'Struck where it was entered' }; touched = true; }
    if (Array.isArray(e[field + 's']) && e[field + 's'].includes(id)) {
      e[field + 's'] = e[field + 's'].filter(x => x !== id);
      e.amount = r2(Math.max(0, (Number(e.amount) || 0) - (Number(amount) || 0)));
      if (!e[field + 's'].length || e.amount <= 0) e.struck = { by: '', at: now(), why: 'Struck where it was entered' };
      touched = true;
    }
  });
  if (touched) S.write(BOOK, list);
}

function accountsAll() {
  bookOpen();
  return groups().filter(g => g.active !== false).sort((a, c) => a.name.localeCompare(c.name)).map(g => Object.assign({ heads: (rosterFor(g.id).length + ((musterFor(g) || {}).people || []).length) }, bookFor(g.id)));
}

function rosters() { return S.read(ROSTERS, []); }
function rosterFor(groupId, withInactive) {
  return rosters().filter(r => r.groupId === groupId && (withInactive || r.active !== false));
}
function rosterAdd(b, by) {
  const groupId = clean(b.groupId, 40);
  if (!groupGet(groupId)) throw new Error('Name the group.');
  const name = clean(b.name, 120);
  if (!name) throw new Error('Name them.');
  const list = rosters();
  const entry = {
    id: S.id(), groupId, name,
    rank: clean(b.rank, 90) || 'Unassigned',
    weekly: money(b.weekly),
    account: clean(b.account, 60),
    note: clean(b.note, 200),
    active: true, by: (by && by.name) || '', at: now()
  };
  list.push(entry);
  S.write(ROSTERS, list);
  return entry;
}
function rosterUpdate(id, b) {
  const list = rosters();
  const r = list.find(x => x.id === id);
  if (!r) throw new Error('No one answers to that.');
  ['name', 'rank', 'account', 'note'].forEach(k => { if (b[k] !== undefined) r[k] = clean(b[k], 200); });
  if (b.weekly !== undefined) r.weekly = money(b.weekly);
  if (b.active !== undefined) r.active = !!b.active;
  if (b.groupId !== undefined && groupGet(clean(b.groupId, 40))) r.groupId = clean(b.groupId, 40);
  S.write(ROSTERS, list);
  return r;
}
function rosterRemove(id) { S.write(ROSTERS, rosters().filter(r => r.id !== id)); }


const War = require('./waroffice');
const Ranks = require('./ranks');
const Users = require('./users');

const MUSTER_PERIODS = [['week', 'a week', 4], ['fortnight', 'a fortnight', 2], ['month', 'a month', 1]];
const MUSTER_BY_ID = Object.fromEntries(MUSTER_PERIODS.map(p => [p[0], p]));
const MUSTER_ON_LEAVE = ['LOA', 'Inactive', 'Vacant'];

const MUSTER_UNITS = () => [].concat(
  War.UNITS.map(u => ({ id: 'unit:' + u.id, name: u.name, kind: 'unit', where: '/war-office/roster' })),
  Ranks.BRANCHES.filter(b => !b.outside).map(b => ({ id: 'roll:' + b.id, name: 'Officers of ' + b.short, full: b.name, kind: 'roll', where: b.home === '/hall' ? '/admin' : b.home + '/officers' }))
);
const MUSTER_IDS = MUSTER_UNITS().map(u => u.id);
const MUSTER_BY_KEY = () => Object.fromEntries(MUSTER_UNITS().map(u => [u.id, u]));

function musterName(ids) {
  const by = MUSTER_BY_KEY();
  return (Array.isArray(ids) ? ids : [ids]).filter(Boolean).map(id => (by[id] || {}).name || '').filter(Boolean).join(', ');
}

function rollHeads(key) {
  const src = MUSTER_BY_KEY()[key];
  if (!src) return [];
  if (src.kind === 'unit') {
    const unit = War.UNITS.find(u => 'unit:' + u.id === key);
    return War.all().filter(p => p.unit === unit.id).map(p => ({
      name: p.name, rank: p.rank, activity: p.activity,
      pay: money(p.pay), bonus: money(p.bonus), source: src.name,
      order: unit.ranks.indexOf(p.rank),
      roll: key, ...rollNoteFor(key, p.name)
    }));
  }
  const branch = key.slice(5);
  return Users.list()
    .filter(o => Ranks.userBranch(o) === branch)
    .map(o => ({
      name: o.name, rank: o.rankName || o.rank,
      activity: o.active === false ? 'Inactive' : 'Active',
      pay: money(o.weekly), bonus: 0, source: src.name, order: 0,
      roll: key, ...rollNoteFor(key, o.name)
    }));
}

function rollForName(name) {
  const bare = String(name || '').toLowerCase()
    .replace(/\b(the|ministry|of|office|imperial|provincial|cohort|corps)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ').trim();
  if (!bare) return [];
  return MUSTER_UNITS().filter(un => {
    const theirs = un.name.toLowerCase()
      .replace(/\b(the|officers|of|ministry|imperial|cohort|corps|office)\b/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ').trim();
    if (!theirs) return false;
    return bare === theirs || bare.split(' ').some(w => w.length > 3 && theirs.split(' ').includes(w));
  }).map(un => un.id);
}

function ministriesWithoutAGroup() {
  const taken = groups().flatMap(g => musterIds(g));
  return MUSTER_UNITS()
    .filter(un => un.kind === 'roll' && !taken.includes(un.id))
    .map(un => ({ ...un, heads: rollHeads(un.id).filter(p => p.activity !== 'Inactive').length }))
    .filter(un => un.heads > 0);
}

function groupForRoll(key) {
  const src = MUSTER_BY_KEY()[key];
  if (!src) throw new Error('No roll answers to that.');
  if (groups().some(g => musterIds(g).includes(key))) throw new Error('A group already draws off that roll.');
  const name = src.full || src.name;
  return groupSave(null, { name, muster: [key], musterPer: 'week', eec: 0, tax: 0, mint: 0, other: 0, fixed: 0 });
}

function musterIds(g) {
  const raw = (g && g.muster) || [];
  const ids = MUSTER_IDS;
  return (Array.isArray(raw) ? raw : [raw])
    .map(x => (ids.includes(x) ? x : ids.includes('unit:' + x) ? 'unit:' + x : ''))
    .filter(Boolean);
}

function musterFor(g) {
  const ids = musterIds(g);
  if (!ids.length) return null;
  const by = MUSTER_BY_KEY();
  const units = ids.map(id => by[id]).filter(Boolean);
  if (!units.length) return null;
  const all = ids.flatMap(id => rollHeads(id));
  const counted = g.musterLeave ? all : all.filter(p => !MUSTER_ON_LEAVE.includes(p.activity));
  const per = MUSTER_BY_ID[g.musterPer] || MUSTER_BY_ID.week;
  const each = p => money(p.pay) + money(p.bonus);
  const period = money(counted.reduce((n, p) => n + each(p), 0));
  const byRank = {};
  counted.forEach(p => {
    const k = byRank[p.rank] || (byRank[p.rank] = { n: 0, pay: 0 });
    k.n++; k.pay = money(k.pay + each(p));
  });
  const order = p => [units.findIndex(u => u.name === p.source), p.order < 0 ? 98 : p.order];
  const byUnit = {};
  units.forEach(u => {
    const mine = counted.filter(p => p.source === u.name);
    byUnit[u.name] = { n: mine.length, period: money(mine.reduce((n, p) => n + each(p), 0)), where: u.where };
  });
  return {
    unit: units.map(u => u.name).join(', '), units: units.map(u => ({ id: u.id, name: u.name, where: u.where })),
    unitId: units[0].id, byUnit, several: units.length > 1,
    where: units[0].where,
    people: counted.slice().sort((a, b) => { const x = order(a), y = order(b); return x[0] - y[0] || x[1] - y[1] || a.name.localeCompare(b.name); }),
    passedOver: all.length - counted.length,
    onRoll: all.length,
    perLabel: per[1], per: per[0],
    period,
    weekly: money(period * per[2] / 4),
    biweekly: money(period * per[2] / 2),
    monthly: money(period * per[2]),
    byRank, countsLeave: !!g.musterLeave
  };
}

const IMPORT_FIELDS = ['rank', 'name', 'weekly', 'account', 'note'];

function parseRoster(raw) {
  const lines = String(raw || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const out = [], skipped = [];
  lines.forEach((line, i) => {
    if (/^(rank|name|weekly|position|title)\b/i.test(line) && /\b(name|pay|account)\b/i.test(line)) return;
    const cells = (line.includes('\t') ? line.split('\t') : line.includes('|') ? line.split('|') : line.split(/\s{2,}/))
      .map(c => c.replace(/^[\u2666\u25c6\u2022\u00b7*\-\s]+/, '').trim());
    if (cells.length < 2 && !/^[^\d]+\s+\S/.test(cells[0] || '')) {
      skipped.push({ line: i + 1, text: line, why: 'Could not tell the columns apart.' });
      return;
    }
    const row = { rank: '', name: '', weekly: 0, account: '', note: '' };
    const rest = [];
    cells.forEach(c => {
      if (!c || c === '\u2014' || c === '-') return;
      if (!row.account && /^[A-Z]{2,4}\d{6,}$/.test(c.replace(/\s/g, ''))) { row.account = c.replace(/\s/g, ''); return; }
      if (!row.weekly && /^[\d,]+(\.\d+)?$/.test(c)) { row.weekly = money(c.replace(/,/g, '')); return; }
      rest.push(c);
    });
    if (!rest.length) { skipped.push({ line: i + 1, text: line, why: 'No name upon the line.' }); return; }
    if (rest.length === 1) row.name = clean(rest[0], 120);
    else { row.rank = clean(rest[0], 90); row.name = clean(rest[1], 120); row.note = clean(rest.slice(2).join(' \u00b7 '), 200); }
    if (!row.name) { skipped.push({ line: i + 1, text: line, why: 'No name upon the line.' }); return; }
    out.push(row);
  });
  return { rows: out, skipped };
}

function rosterImport(groupId, raw, by, commit) {
  if (!groupGet(groupId)) throw new Error('Name the group.');
  const { rows, skipped } = parseRoster(raw);
  if (!rows.length && !skipped.length) throw new Error('Nothing was pasted.');
  const have = rosterFor(groupId, true);
  const key = n => String(n || '').toLowerCase().trim();
  const seen = {};
  const plan = rows.map(r => {
    const dup = seen[key(r.name)];
    seen[key(r.name)] = true;
    const old = have.find(x => key(x.name) === key(r.name));
    return { ...r, was: old || null, action: dup ? 'twice in the paste' : old ? 'amend' : 'enter' };
  });
  if (!commit) return { plan, skipped, entered: 0, amended: 0 };
  let entered = 0, amended = 0;
  plan.forEach(r => {
    if (r.action === 'twice in the paste') return;
    if (r.was) { rosterUpdate(r.was.id, { rank: r.rank || r.was.rank, weekly: r.weekly, account: r.account, note: r.note }); amended++; }
    else { rosterAdd({ groupId, name: r.name, rank: r.rank, weekly: r.weekly, account: r.account, note: r.note }, by); entered++; }
  });
  return { plan, skipped, entered, amended };
}

function payrollFor(groupId) {
  const ids = [groupId].concat(under(groupId).map(g => g.id));
  const own = money(rosterFor(groupId).reduce((n, r) => n + money(r.weekly), 0));
  const all = money(ids.reduce((n, id) => n + rosterFor(id).reduce((x, r) => x + money(r.weekly), 0), 0));
  const mine = musterFor(groupGet(groupId));
  const musterAll = money(ids.reduce((n, id) => { const m = musterFor(groupGet(id)); return n + (m ? m.monthly : 0); }, 0));
  const m = mine ? mine.monthly : 0;
  return {
    weekly: own, biweekly: money(own * 2), monthly: money(own * 4),
    withUnder: money(all * 4 + musterAll), hasUnder: ids.length > 1,
    muster: m, hasMuster: !!mine,
    together: money(own * 4 + m),
    allWeekly: money(own + m / 4), allBiweekly: money(own * 2 + m / 2), allMonthly: money(own * 4 + m)
  };
}

function rosterCounts(groupId) {
  const l = rosterFor(groupId);
  const byRank = {};
  l.forEach(r => { byRank[r.rank] = (byRank[r.rank] || 0) + 1; });
  return { n: l.length, byRank };
}


const SUMMONS_STATUS = ['Issued', 'Served', 'Answered', 'Satisfied', 'Referred to Justice', 'Withdrawn'];
const SUMMONS_CLASS = { Issued: 'warn', Served: 'warn', Answered: '', Satisfied: 'ok', 'Referred to Justice': 'bad', Withdrawn: '' };
const SUMMONS_LIVE = ['Issued', 'Served', 'Answered'];

function summonses() { return S.read(SUMMONS, []); }
function summonsGet(id) { return summonses().find(x => x.id === id) || null; }
function summonsFor(assessId) { return summonses().filter(x => x.assessId === assessId).reverse(); }
function summonsLiveFor(assessId) { return summonsFor(assessId).filter(x => SUMMONS_LIVE.includes(x.status)); }

function summonsIssue(assessId, b, by) {
  const a = assessGet(assessId);
  if (!a) throw new Error('No assessment answers to that.');
  if (a.remitted) throw new Error('That assessment was remitted. Nothing stands owing upon it.');
  const owing = arrearsOn(a);
  if (owing <= 0.005) throw new Error('Nothing stands in arrears upon that assessment.');
  if (summonsLiveFor(assessId).length) throw new Error('A summons already runs upon that assessment.');
  const list = summonses();
  const entry = {
    id: S.id(), no: 'Summons ' + roman(list.length + 1),
    assessId, assessNo: a.no, who: a.who, hold: a.hold, kind: a.kind,
    sum: owing,
    returnBy: clean(b.returnBy, 80),
    ground: text(b.ground, 1500) || 'The sum assessed stands unrendered and is now demanded.',
    issuedBy: clean(b.issuedBy, 120) || ((by && by.name) || ''),
    status: 'Issued', served: '', servedAt: '', servedBy: '',
    answer: '', answeredAt: '', referredTo: '', referredAt: '', closedNote: '',
    by: (by && by.name) || '', at: now()
  };
  list.push(entry);
  S.write(SUMMONS, list);
  return entry;
}

function summonsServe(id, b, by) {
  const list = summonses();
  const x = list.find(v => v.id === id);
  if (!x) throw new Error('No summons answers to that.');
  if (x.status !== 'Issued') throw new Error('That summons has already been served or is closed.');
  x.status = 'Served';
  x.served = clean(b.served, 140) || 'Into their own hand';
  x.servedBy = clean(b.servedBy, 120) || ((by && by.name) || '');
  x.servedAt = clean(b.servedAt, 80) || when(now());
  S.write(SUMMONS, list);
  return x;
}

function summonsAnswer(id, b, by) {
  const list = summonses();
  const x = list.find(v => v.id === id);
  if (!x) throw new Error('No summons answers to that.');
  if (!SUMMONS_LIVE.includes(x.status)) throw new Error('That summons is closed.');
  x.status = 'Answered';
  x.answer = text(b.answer, 1500);
  x.answeredAt = clean(b.answeredAt, 80) || when(now());
  x.answeredBy = (by && by.name) || '';
  S.write(SUMMONS, list);
  return x;
}

function summonsRefer(id, b, by) {
  const list = summonses();
  const x = list.find(v => v.id === id);
  if (!x) throw new Error('No summons answers to that.');
  if (!SUMMONS_LIVE.includes(x.status)) throw new Error('That summons is closed.');
  if (x.status === 'Issued') throw new Error('Serve the summons before referring it. A paper never served cannot be said to have been ignored.');
  const a = assessGet(x.assessId);
  if (a && arrearsOn(a) <= 0.005) throw new Error('The sum has since been rendered. There is nothing to refer.');
  x.status = 'Referred to Justice';
  x.referredTo = clean(b.referredTo, 140) || 'The Ministry of Justice';
  x.referredAt = clean(b.referredAt, 80) || when(now());
  x.referredBy = (by && by.name) || '';
  x.closedNote = text(b.note, 1000);
  S.write(SUMMONS, list);
  return x;
}

function summonsClose(id, b, by) {
  const list = summonses();
  const x = list.find(v => v.id === id);
  if (!x) throw new Error('No summons answers to that.');
  const to = SUMMONS_STATUS.includes(b.status) ? b.status : 'Withdrawn';
  if (to !== 'Satisfied' && to !== 'Withdrawn') throw new Error('A summons is closed as satisfied or withdrawn.');
  x.status = to;
  x.closedNote = text(b.note, 1000);
  x.closedBy = (by && by.name) || '';
  x.closedAt = now();
  S.write(SUMMONS, list);
  return x;
}

function summonsRemove(id) { S.write(SUMMONS, summonses().filter(x => x.id !== id)); }

function unchased() {
  return assessments().filter(a => !a.remitted && arrearsOn(a) > 0.005 && !summonsLiveFor(a.id).length);
}

function summonsTotals() {
  const l = summonses();
  const live = l.filter(x => SUMMONS_LIVE.includes(x.status));
  return {
    n: l.length,
    running: live.length,
    unserved: l.filter(x => x.status === 'Issued').length,
    referred: l.filter(x => x.status === 'Referred to Justice').length,
    satisfied: l.filter(x => x.status === 'Satisfied').length,
    demanded: money(live.reduce((n, x) => n + money(x.sum), 0)),
    unchased: unchased().length
  };
}

const when = iso => String(iso || '').slice(0, 10);


function vault() { return S.read(VAULT, []); }
function vaultGet(id) { return vault().find(v => v.id === id) || null; }
function webLink(raw) {
  const s = clean(raw, 300);
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return '';
  return 'https://' + s.replace(/^\/+/, '');
}

function vaultSave(id, b) {
  const list = vault();
  let v = id ? list.find(x => x.id === id) : null;
  const account = clean(b.account, 90);
  if (!account) throw new Error('Name the account.');
  const fields = {
    account, username: clean(b.username, 90),
    link: webLink(b.link), note: clean(b.note, 200),
    kind: clean(b.kind, 40) || 'Business'
  };
  if (b.secret !== undefined && String(b.secret).length) fields.secret = clean(b.secret, 200);
  if (v) Object.assign(v, fields);
  else { v = { id: S.id(), secret: '', ...fields }; list.push(v); }
  S.write(VAULT, list);
  return v;
}
function vaultRemove(id) { S.write(VAULT, vault().filter(v => v.id !== id)); }




const WAGES = 'finance-wages.json';

function wages() { return S.read(WAGES, []); }
function wageGet(id) { return wages().find(w => w.id === id) || null; }

function wageEntry(b, by, extra) {
  const name = clean(b.name, 140);
  if (!name) throw new Error('Name the person paid.');
  const amount = money(b.amount);
  if (!amount) throw new Error('Set down the sum paid.');
  return {
    id: S.id(), name,
    rank: clean(b.rank, 120),
    groupId: clean(b.groupId, 40),
    roll: clean(b.roll, 60),
    amount,
    forWhat: clean(b.forWhat, 120) || 'Wages',
    when: clean(b.when, 80),
    monthKey: clean(b.monthKey, 10) || monthKey(),
    note: clean(b.note, 200),
    by: (by && by.name) || '', at: now(),
    ...(extra || {})
  };
}

function wagePay(b, by) {
  const list = wages();
  const entry = wageEntry(b, by);
  list.push(entry);
  S.write(WAGES, list);
  try { if (entry.groupId && groupGet(entry.groupId) && S.read(BOOK_OPENED, null)) bookAdd(entry.groupId, 'out', { amount: entry.amount, what: (entry.forWhat || 'Wages') + ' to ' + entry.name, on: 'Pay and wages', forWhom: entry.name }, by, { wage: entry.id }); } catch (_) {}
  return entry;
}

function wagePayRoll(groupId, b, by) {
  const g = groupGet(groupId);
  if (!g) throw new Error('No such group.');
  const m = musterFor(g);
  if (!m || !m.people.length) throw new Error('That group draws off no roll, so there is nobody to pay. Tie it to a roll first.');
  const want = MUSTER_BY_ID[clean(b.period, 20)] || MUSTER_BY_ID[g.musterPer] || MUSTER_BY_ID.week;
  const mine = MUSTER_BY_ID[g.musterPer] || MUSTER_BY_ID.week;
  const scale = mine[2] / want[2];
  const list = wages();
  const when = clean(b.when, 80);
  const key = clean(b.monthKey, 10) || monthKey();
  const made = m.people
    .map(p => ({ p, amount: money((money(p.pay) + money(p.bonus)) * scale) }))
    .filter(x => x.amount > 0)
    .map(x => wageEntry({
      name: x.p.name, rank: x.p.rank, groupId, roll: x.p.source,
      amount: x.amount,
      forWhat: 'Wages, ' + want[1], when, monthKey: key
    }, by));
  if (!made.length) throw new Error('Nobody on that roll draws anything. Set their pay upon the roll first.');
  made.forEach(e => list.push(e));
  S.write(WAGES, list);
  try { if (S.read(BOOK_OPENED, null)) bookAdd(groupId, 'out', { amount: r2(made.reduce((n, e) => n + e.amount, 0)), what: 'Wages to ' + made.length + (made.length === 1 ? ' person' : ' people') + ', ' + want[1], on: 'Pay and wages' }, by, { wages: made.map(e => e.id) }); } catch (_) {}
  return made;
}

function wageRemove(id) { const w = wageGet(id); S.write(WAGES, wages().filter(x => x.id !== id)); try { bookUnlink('wage', id, w && w.amount); } catch (_) {} }

function wagePeople() {
  const paid = wages();
  const seen = {};
  const put = (name, rank, roll, rate) => {
    const k = name.toLowerCase();
    const row = seen[k] || (seen[k] = { name, rank: rank || '', rolls: [], rate: 0, paid: 0, times: 0, last: null, onRoll: false });
    if (rank && !row.rank) row.rank = rank;
    if (roll && !row.rolls.includes(roll)) row.rolls.push(roll);
    row.rate = money(row.rate + money(rate || 0));
    row.onRoll = true;
  };
  MUSTER_IDS.forEach(id => {
    const src = MUSTER_BY_KEY()[id];
    rollHeads(id).forEach(p => put(p.name, p.rank, (src || {}).name || '', money(p.pay) + money(p.bonus)));
  });
  paid.forEach(w => {
    const k = w.name.toLowerCase();
    const row = seen[k] || (seen[k] = { name: w.name, rank: w.rank || '', rolls: w.roll ? [w.roll] : [], rate: 0, paid: 0, times: 0, last: null, onRoll: false });
    row.paid = money(row.paid + money(w.amount));
    row.times += 1;
    if (!row.last || w.at > row.last.at) row.last = w;
    if (w.rank && !row.rank) row.rank = w.rank;
    if (w.roll && !row.rolls.includes(w.roll)) row.rolls.push(w.roll);
  });
  return Object.values(seen).sort((a, b) => b.paid - a.paid || a.name.localeCompare(b.name));
}

function wageFor(name) {
  const want = String(name || '').toLowerCase();
  const mine = wages().filter(w => w.name.toLowerCase() === want).sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  if (!mine.length && !wagePeople().some(p => p.name.toLowerCase() === want)) return null;
  const row = wagePeople().find(p => p.name.toLowerCase() === want) || { name, rank: '', rolls: [], rate: 0, paid: 0, times: 0 };
  return { ...row, payments: mine };
}

function wageTotals() {
  const all = wages();
  const people = wagePeople();
  const key = monthKey();
  return {
    paidAll: money(all.reduce((n, w) => n + money(w.amount), 0)),
    paidMonth: money(all.filter(w => w.monthKey === key).reduce((n, w) => n + money(w.amount), 0)),
    entries: all.length,
    heads: people.length,
    onRoll: people.filter(p => p.onRoll).length,
    neverPaid: people.filter(p => p.onRoll && !p.times).length,
    ratePeriod: money(people.reduce((n, p) => n + money(p.rate), 0))
  };
}

function groupsSorted() {
  const kindOf = g => {
    const hits = rollForName(g.name);
    if (hits.some(id => id.indexOf('roll:') === 0)) return 0;
    if (hits.some(id => id.indexOf('unit:') === 0)) return 1;
    const ids = musterIds(g);
    if (ids.some(id => id.indexOf('roll:') === 0)) return 0;
    if (ids.some(id => id.indexOf('unit:') === 0)) return 1;
    return 2;
  };
  const BAND = ['Ministries of the Province', 'The Legion in Skyrim', 'Commands & Offices'];
  const out = BAND.map(name => ({ name, groups: [] }));
  groups().forEach(g => { out[kindOf(g)].groups.push(g); });
  out.forEach(b => b.groups.sort((a, c) => a.name.localeCompare(c.name)));
  return out.filter(b => b.groups.length);
}

const ASSESS = 'finance-assessments.json';
const TAX_KINDS = ['Hold tax', 'Hearth tax', 'Toll of the roads', 'Toll of the harbour', 'Excise upon goods', 'Excise upon drink', 'Levy upon a trade', 'Market due', 'Extraordinary levy'];
const TAX_PERIODS = ['This month', 'This season', 'This year', 'One time'];
const ASSESS_CLASS = { 'Rendered in full': 'ok', 'Part rendered': 'warn', 'In arrears': 'bad', Remitted: '' };

function assessments() { return S.read(ASSESS, []); }
function assessGet(id) { return assessments().find(a => a.id === id) || null; }
function renderedOn(a) { return money((a.payments || []).reduce((n, p) => n + money(p.amount), 0)); }
function arrearsOn(a) { return money(Math.max(0, money(a.amount) - renderedOn(a))); }
function assessStanding(a) {
  if (a.remitted) return 'Remitted';
  if (arrearsOn(a) <= 0.005) return 'Rendered in full';
  return renderedOn(a) > 0 ? 'Part rendered' : 'In arrears';
}

function assessAdd(b, by) {
  const who = clean(b.who, 140);
  if (!who) throw new Error('Name who is assessed.');
  const amount = money(b.amount);
  if (!amount) throw new Error('Set down the sum assessed.');
  const list = assessments();
  const entry = {
    id: S.id(), no: 'Assessment ' + roman(list.length + 1),
    who, amount,
    kind: TAX_KINDS.includes(b.kind) ? b.kind : 'Hold tax',
    period: TAX_PERIODS.includes(b.period) ? b.period : 'This month',
    hold: clean(b.hold, 60), trade: clean(b.trade, 140),
    due: clean(b.due, 80), basis: text(b.basis, 1000),
    officer: clean(b.officer, 120) || ((by && by.name) || ''),
    payments: [], remitted: false,
    by: (by && by.name) || '', at: now()
  };
  list.push(entry);
  S.write(ASSESS, list);
  return entry;
}

function assessRender(id, b, by) {
  const list = assessments();
  const a = list.find(x => x.id === id);
  if (!a) throw new Error('No assessment answers to that.');
  const amount = money(b.amount);
  if (!amount) throw new Error('Set down what was rendered.');
  a.payments = (a.payments || []).concat([{
    id: S.id(), amount, when: clean(b.when, 80), note: clean(b.note, 200),
    by: (by && by.name) || '', at: now()
  }]);
  S.write(ASSESS, list);
  return a;
}

function assessUpdate(id, b) {
  const list = assessments();
  const a = list.find(x => x.id === id);
  if (!a) throw new Error('No assessment answers to that.');
  if (b.remitted !== undefined) a.remitted = !!b.remitted;
  ['due', 'hold', 'trade', 'officer'].forEach(k => { if (b[k] !== undefined) a[k] = clean(b[k], 140); });
  if (b.basis !== undefined) a.basis = text(b.basis, 1000);
  S.write(ASSESS, list);
  return a;
}

function assessPaymentRemove(id, pid) {
  const list = assessments();
  const a = list.find(x => x.id === id);
  if (!a) return null;
  a.payments = (a.payments || []).filter(p => p.id !== pid);
  S.write(ASSESS, list);
  return a;
}
function assessRemove(id) { S.write(ASSESS, assessments().filter(a => a.id !== id)); }

function taxTotals() {
  const l = assessments().filter(a => !a.remitted);
  return {
    assessed: money(l.reduce((n, a) => n + money(a.amount), 0)),
    rendered: money(l.reduce((n, a) => n + renderedOn(a), 0)),
    arrears: money(l.reduce((n, a) => n + arrearsOn(a), 0)),
    inArrears: l.filter(a => arrearsOn(a) > 0.005).length,
    n: l.length
  };
}

function byHold() {
  const out = {};
  holds().forEach(h => { out[h.name] = { assessed: 0, rendered: 0, arrears: 0, n: 0, due: money(h.monthly) }; });
  assessments().forEach(a => {
    if (a.remitted) return;
    const k = out[a.hold] || (out[a.hold || 'Not set down'] = { assessed: 0, rendered: 0, arrears: 0, n: 0, due: 0 });
    k.assessed = money(k.assessed + money(a.amount));
    k.rendered = money(k.rendered + renderedOn(a));
    k.arrears = money(k.arrears + arrearsOn(a));
    k.n++;
  });
  return out;
}


const CHARTERS = 'finance-charters.json';
const CHARTER_KINDS = ['Charter of a guild', 'Licence to trade', 'Market right', 'Right of carriage', 'Right of the harbour', 'Leave to hold a fair', 'Monopoly by grant'];
const CHARTER_STATUS = ['Sought', 'In force', 'Suspended', 'Revoked', 'Lapsed'];
const CHARTER_CLASS = { 'In force': 'ok', Suspended: 'warn', Revoked: 'bad', Lapsed: 'warn', Sought: '' };

function charters() { return S.read(CHARTERS, []); }
function charterGet(id) { return charters().find(c => c.id === id) || null; }
function chartersPublic() { return charters().filter(c => c.status !== 'Sought').slice().reverse(); }

function charterGrant(b, by) {
  const holder = clean(b.holder, 140);
  if (!holder) throw new Error('Name who holds it.');
  const list = charters();
  const status = CHARTER_STATUS.includes(b.status) ? b.status : 'In force';
  const fee = money(b.fee);
  const entry = {
    id: S.id(), no: 'Charter ' + roman(list.length + 1),
    holder, house: clean(b.house, 140),
    kind: CHARTER_KINDS.includes(b.kind) ? b.kind : 'Licence to trade',
    trade: clean(b.trade, 160), hold: clean(b.hold, 60), seat: clean(b.seat, 140),
    granted: clean(b.granted, 80), expires: clean(b.expires, 80),
    fee, feeAt: fee && status !== 'Sought' ? now() : '',
    status, conditions: text(b.conditions, 2000), note: text(b.note, 1000),
    by: (by && by.name) || '', at: now()
  };
  list.push(entry);
  S.write(CHARTERS, list);
  return entry;
}

function charterUpdate(id, b, by) {
  const list = charters();
  const c = list.find(x => x.id === id);
  if (!c) throw new Error('No charter answers to that.');
  const wasSought = c.status === 'Sought';
  if (b.status && CHARTER_STATUS.includes(b.status)) c.status = b.status;
  ['holder', 'house', 'trade', 'hold', 'seat', 'expires', 'granted'].forEach(k => { if (b[k] !== undefined) c[k] = clean(b[k], 160); });
  if (b.kind !== undefined && CHARTER_KINDS.includes(b.kind)) c.kind = b.kind;
  if (b.fee !== undefined) c.fee = money(b.fee);
  if (b.conditions !== undefined) c.conditions = text(b.conditions, 2000);
  if (b.note !== undefined) c.note = text(b.note, 1000);
  if (wasSought && c.status !== 'Sought' && c.fee && !c.feeAt) c.feeAt = now();
  S.write(CHARTERS, list);
  return c;
}
function charterRemove(id) { S.write(CHARTERS, charters().filter(c => c.id !== id)); }

function charterTotals() {
  const l = charters();
  return {
    inForce: l.filter(c => c.status === 'In force').length,
    sought: l.filter(c => c.status === 'Sought').length,
    revoked: l.filter(c => c.status === 'Revoked').length,
    fees: money(l.filter(c => c.feeAt).reduce((n, c) => n + money(c.fee), 0)),
    n: l.length
  };
}


const MINT = 'finance-mint.json';
const ASSAYS = 'finance-assays.json';
const METALS = ['Gold', 'Silver', 'Electrum', 'Copper', 'Moonstone', 'Ebony'];
const MINT_KINDS = ['Coin struck', 'Coin withdrawn', 'Bullion received', 'Bullion issued', 'Tribute rendered to the Treasury'];
const ASSAY_RESULTS = ['True to the standard', 'Light of the standard', 'Debased', 'Counterfeit', 'Cannot be determined'];
const ASSAY_CLASS = { 'True to the standard': 'ok', 'Light of the standard': 'warn', Debased: 'bad', Counterfeit: 'bad', 'Cannot be determined': '' };

function mint() { return S.read(MINT, []); }
function mintGet(id) { return mint().find(m => m.id === id) || null; }

function mintAdd(b, by) {
  const kind = MINT_KINDS.includes(b.kind) ? b.kind : 'Coin struck';
  const count = money(b.count);
  if (!count) throw new Error('Set down how much.');
  const list = mint();
  const entry = {
    id: S.id(), no: 'Mint ' + roman(list.length + 1),
    kind, count,
    metal: METALS.includes(b.metal) ? b.metal : 'Gold',
    weight: clean(b.weight, 60), standard: clean(b.standard, 120),
    die: clean(b.die, 90), where: clean(b.where, 120),
    note: text(b.note, 1000),
    by: (by && by.name) || '', at: now()
  };
  list.push(entry);
  S.write(MINT, list);
  return entry;
}
function mintRemove(id) { S.write(MINT, mint().filter(m => m.id !== id)); }

function mintStock() {
  const out = {};
  METALS.forEach(m => { out[m] = { struck: 0, withdrawn: 0, received: 0, issued: 0, held: 0, inCoin: 0 }; });
  mint().forEach(e => {
    const k = out[e.metal]; if (!k) return;
    if (e.kind === 'Coin struck') k.struck = money(k.struck + e.count);
    if (e.kind === 'Coin withdrawn') k.withdrawn = money(k.withdrawn + e.count);
    if (e.kind === 'Bullion received') k.received = money(k.received + e.count);
    if (e.kind === 'Bullion issued') k.issued = money(k.issued + e.count);
    k.held = money(k.received - k.issued);
    k.inCoin = money(k.struck - k.withdrawn);
  });
  return out;
}

function assays() { return S.read(ASSAYS, []); }
function assayGet(id) { return assays().find(a => a.id === id) || null; }
function assayAdd(b, by) {
  const what = clean(b.what, 160);
  if (!what) throw new Error('Say what was brought for assay.');
  const list = assays();
  const entry = {
    id: S.id(), no: 'Assay ' + roman(list.length + 1),
    what, broughtBy: clean(b.broughtBy, 140),
    metal: METALS.includes(b.metal) ? b.metal : 'Gold',
    count: money(b.count),
    result: ASSAY_RESULTS.includes(b.result) ? b.result : 'Cannot be determined',
    fineness: clean(b.fineness, 60), finding: text(b.finding, 1500),
    referred: clean(b.referred, 140),
    by: (by && by.name) || '', at: now()
  };
  list.push(entry);
  S.write(ASSAYS, list);
  return entry;
}
function assayRemove(id) { S.write(ASSAYS, assays().filter(a => a.id !== id)); }

function mintTotals() {
  const st = mintStock();
  return {
    inCoin: money(METALS.reduce((n, m) => n + st[m].inCoin, 0)),
    tribute: money(mint().filter(e => e.kind === 'Tribute rendered to the Treasury').reduce((n, e) => n + e.count, 0)),
    assays: assays().length,
    bad: assays().filter(a => a.result === 'Debased' || a.result === 'Counterfeit').length,
    stock: st
  };
}


const inMonth = (iso, key) => String(iso || '').slice(0, 7) === key;

function renderedIn(key) {
  return money(assessments().reduce((n, a) =>
    n + (a.payments || []).reduce((x, p) => x + (inMonth(p.at, key) ? money(p.amount) : 0), 0), 0));
}
function charterFeesIn(key) {
  return money(charters().reduce((n, c) => n + (c.feeAt && inMonth(c.feeAt, key) ? money(c.fee) : 0), 0));
}
function mintTributeIn(key) {
  return money(mint().reduce((n, e) => n + (e.kind === 'Tribute rendered to the Treasury' && inMonth(e.at, key) ? e.count : 0), 0));
}

function fromRolls(key) {
  const prev = shiftKey(key, -1);
  return {
    tax: { rolls: renderedIn(key), prev: renderedIn(prev), due: holdsDue(), prevLabel: monthLabel(prev) },
    mint: { rolls: mintTributeIn(key), prev: mintTributeIn(prev), prevLabel: monthLabel(prev) },
    other: { rolls: charterFeesIn(key), prev: charterFeesIn(prev), prevLabel: monthLabel(prev) }
  };
}


function tallies() {
  const key = monthKey();
  const m = monthGet(key);
  const b = m ? budget(m) : null;
  return {
    month: key, label: monthLabel(key),
    status: m ? m.status : 'Not opened',
    draws: b ? b.givenOut : 0,
    paid: b ? b.paidOut : 0,
    left: b ? b.leftToPay : 0,
    waiting: requestsWaiting().length,
    groups: drawing().length,
    holds: holds().length
  };
}

function toDo() {
  const out = [];
  const key = monthKey();
  const m = monthGet(key);
  if (!m) out.push({ what: 'Open ' + monthLabel(key), why: 'No budget stands for this month yet.', href: '/finance/months/' + key, cta: 'Open it' });
  else {
    const b = budget(m);
    if (m.status === 'Draft') out.push({ what: 'Approve ' + m.label, why: 'The shares are still open to change and nothing may be paid.', href: '/finance/months/' + key, cta: 'Open budget' });
    if (m.status === 'Approved' && b.leftToPay > 0.005) out.push({ what: 'Pay the draws for ' + m.label, why: b.groupsPaid + ' of ' + b.groupsAll + ' groups are paid.', href: '/finance/payout?month=' + key, cta: 'Pay out' });
    if (m.status === 'Approved' && b.leftToPay <= 0.005) out.push({ what: 'Close ' + m.label, why: 'Every group has its draw.', href: '/finance/months/' + key, cta: 'Close month' });
    if (!b.balances) out.push({ what: 'The month does not balance', why: 'What the Treasury takes in and what it gives out differ.', href: '/finance/months/' + key, cta: 'Look at it' });
  }
  const w = requestsWaiting().length;
  if (w) out.push({ what: w + ' request' + (w === 1 ? '' : 's') + ' waiting for an answer', why: 'Groups have asked for money beyond their draw.', href: '/finance/requests', cta: 'Answer them' });
  return out;
}


function reportSpan(fromKey, toKey) {
  const keys = months().map(m => m.key).sort();
  const from = fromKey || keys[0] || monthKey();
  const to = toKey || keys[keys.length - 1] || monthKey();
  return { from: from <= to ? from : to, to: from <= to ? to : from };
}

function report(fromKey, toKey) {
  const { from, to } = reportSpan(fromKey, toKey);
  const inSpan = key => key >= from && key <= to;
  const atIn = iso => { const k = String(iso || '').slice(0, 7); return !!k && inSpan(k); };

  const ms = months().filter(m => inSpan(m.key)).sort((a, b) => a.key.localeCompare(b.key));
  const books = ms.map(m => ({ month: m, b: budget(m) })).filter(x => x.b);

  const income = { eec: 0, tax: 0, mint: 0, other: 0 };
  let takesIn = 0, givenOut = 0, paidOut = 0, leftToPay = 0;
  const byGroup = {};
  books.forEach(({ b }) => {
    INCOME_IDS.forEach(k => { income[k] = money(income[k] + money(((b.month || {}).income || {})[k])); });
    takesIn = money(takesIn + money(b.takesIn));
    givenOut = money(givenOut + money(b.givenOut));
    paidOut = money(paidOut + money(b.paidOut));
    leftToPay = money(leftToPay + money(b.leftToPay));
    (b.rows || []).forEach(r => {
      const k = byGroup[r.group.name] || (byGroup[r.group.name] = { draw: 0, paid: 0 });
      k.draw = money(k.draw + money(r.draw));
      k.paid = money(k.paid + money(r.paid));
    });
  });

  const asr = assessments();
  const laid = asr.filter(a => atIn(a.at));
  const renderedInSpan = money(asr.reduce((n, a) =>
    n + (a.payments || []).reduce((x, p) => x + (atIn(p.at) ? money(p.amount) : 0), 0), 0));
  const tax = taxTotals();

  const sm = summonses();
  const ch = charters();
  const ay = assays();

  const spent = spending().filter(x => atIn(x.at));
  const bySpendGroup = {};
  spent.forEach(x => {
    const g = groupGet(x.groupId);
    const k = (g && g.name) || 'Not set down';
    bySpendGroup[k] = money((bySpendGroup[k] || 0) + money(x.amount));
  });

  const rq = requests().filter(r => atIn(r.at));
  const kinds = {};
  laid.forEach(a => { kinds[a.kind] = (kinds[a.kind] || 0) + 1; });

  return {
    from, to,
    fromLabel: monthLabel(from), toLabel: monthLabel(to),
    months: ms.length,
    closed: ms.filter(m => m.status === 'Closed').length,
    open: ms.filter(m => m.status !== 'Closed').length,
    income, takesIn, givenOut, paidOut, leftToPay,
    kept: money(takesIn - givenOut),
    byGroup,
    assessments: { laid: laid.length, sum: money(laid.reduce((n, a) => n + money(a.amount), 0)), rendered: renderedInSpan, kinds },
    arrears: { standing: tax.arrears, n: tax.inArrears, unchased: unchased().length },
    summonses: {
      issued: sm.filter(x => atIn(x.at)).length,
      running: sm.filter(x => SUMMONS_LIVE.includes(x.status)).length,
      referred: sm.filter(x => x.status === 'Referred to Justice').length,
      satisfied: sm.filter(x => x.status === 'Satisfied').length
    },
    charters: {
      granted: ch.filter(c => atIn(c.feeAt)).length,
      revoked: ch.filter(c => c.status === 'Revoked').length,
      inForce: ch.filter(c => c.status === 'In force').length,
      fees: money(ch.reduce((n, c) => n + (atIn(c.feeAt) ? money(c.fee) : 0), 0))
    },
    mint: {
      tribute: money(mint().filter(e => e.kind === 'Tribute rendered to the Treasury' && atIn(e.at)).reduce((n, e) => n + money(e.count), 0)),
      struck: money(mint().filter(e => e.kind === 'Coin struck' && atIn(e.at)).reduce((n, e) => n + money(e.count), 0)),
      assays: ay.filter(a => atIn(a.at)).length,
      false: ay.filter(a => atIn(a.at) && (a.result === 'Debased' || a.result === 'Counterfeit')).length
    },
    spending: { n: spent.length, sum: money(spent.reduce((n, x) => n + money(x.amount), 0)), byGroup: bySpendGroup },
    requests: {
      laid: rq.length,
      allowed: rq.filter(r => r.status === 'Approved' || r.status === 'Paid').length,
      refused: rq.filter(r => r.status === 'Refused').length,
      asked: money(rq.reduce((n, r) => n + money(r.asked), 0)),
      granted: money(rq.reduce((n, r) => n + money(r.approved), 0))
    },
    wages: drawing().map(g => {
      const m = musterFor(g);
      return m ? { group: g.name, unit: m.unit, heads: m.people.length, monthly: m.monthly } : null;
    }).filter(Boolean)
  };
}

module.exports = {
  BOOK_KINDS, bookFor, bookAdd, bookSetMany, bookStrike, accountsAll, bookOpen,
  TAX_KINDS, TAX_PERIODS, ASSESS_CLASS, assessments, assessGet, renderedOn, arrearsOn, assessStanding,
  assessAdd, assessRender, assessUpdate, assessPaymentRemove, assessRemove, taxTotals, byHold,
  CHARTER_KINDS, CHARTER_STATUS, CHARTER_CLASS, charters, charterGet, chartersPublic, charterGrant, charterUpdate, charterRemove, charterTotals,
  METALS, MINT_KINDS, ASSAY_RESULTS, ASSAY_CLASS, mint, mintGet, mintAdd, mintRemove, mintStock, mintTotals,
  assays, assayGet, assayAdd, assayRemove,
  renderedIn, charterFeesIn, mintTributeIn, fromRolls,
  money, pct, roman, slug, monthKey, monthLabel, shiftKey, MONTH_NAMES, STATUS, INCOME_KINDS, INCOME_IDS,
  groups, groupGet, groupName, drawing, under, groupSave, groupRemove, treasuryCut,
  holds, holdSave, holdRemove, holdsDue,
  months, monthGet, monthOpen, monthEnsure, monthSaveIncome, monthSaveShares, monthSetStatus, monthRemove, sharesNow,
  budget, payOut, payUndo,
  REQ_STATUS, REQ_CLASS, requests, requestGet, requestsFor, requestsWaiting, requestsToPay, requestAsk, requestAnswer, requestRemove,
  SPEND_ON, spending, spendingFor, spendAdd, spendRemove, spendingSummary,
  accountFor, paidInto,
  rosters, rosterFor, rosterAdd, rosterUpdate, rosterRemove, payrollFor, rosterCounts,
  MUSTER_PERIODS, MUSTER_UNITS, MUSTER_IDS, musterFor, musterName, musterIds, rosterImport,
  wages, wageGet, wagePay, wagePayRoll, wageRemove, wagePeople, wageFor, wageTotals, groupsSorted, wagesFromPayout,
  rollForName, ministriesWithoutAGroup, groupForRoll, groupOwningRoll, rollHeads,
  SPLIT_MODES, SPLIT_MODE_BY_ID, splits, splitSaved, splitParts, splitFor, setSplit, clearSplit, splittable,
  rollNotes, rollNoteFor, rollNoteSet, rollNoteCounts,
  SUMMONS_STATUS, SUMMONS_CLASS, SUMMONS_LIVE, summonses, summonsGet, summonsFor, summonsLiveFor,
  summonsIssue, summonsServe, summonsAnswer, summonsRefer, summonsClose, summonsRemove,
  unchased, summonsTotals, report, reportSpan,
  vault, vaultGet, vaultSave, vaultRemove,
  tallies, toDo
};
