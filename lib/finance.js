const S = require('./store');

const clean = (v, max) => String(v ?? '').replace(/[\r\n]/g, ' ').trim().slice(0, max);
const text = (v, max) => String(v ?? '').replace(/\r/g, '').trim().slice(0, max);
const now = () => new Date().toISOString();

// Money is kept to the hundredth and rounded only when shown.
const money = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0; };
const pct = v => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.min(100, Math.round(n * 1000) / 1000) : 0; };
const slug = s => String(s).toLowerCase().replace(/&/g, 'and').replace(/['’‘`]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
function roman(n) { let out = '', v = Math.max(1, n); ROMAN.forEach(([k, r]) => { while (v >= k) { out += r; v -= k; } }); return out; }

const GROUPS = 'finance-groups.json';
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

// ---------------------------------------------------------------------------
// Groups: who draws from the Treasury, and on what shares
// ---------------------------------------------------------------------------

const SEED_GROUPS = [
  { name: 'Imperial Legion', account: '', fundedBy: '', eec: 10, tax: 70, mint: 80, other: 0, fixed: 0 },
  { name: 'Governor’s Office', account: '', fundedBy: '', eec: 4, tax: 30, mint: 20, other: 0, fixed: 0 },
  { name: 'Imperial Guard', account: '', fundedBy: 'imperial-legion', eec: 0, tax: 0, mint: 0, other: 0, fixed: 0 },
  { name: 'Synod', account: '', fundedBy: '', eec: 2, tax: 0, mint: 0, other: 0, fixed: 0 },
  { name: 'Penitus Oculatus', account: '', fundedBy: '', eec: 2.5, tax: 0, mint: 0, other: 0, fixed: 0 }
];

function groups() {
  const l = S.read(GROUPS, null);
  if (l === null) return S.write(GROUPS, SEED_GROUPS.map((g, i) => ({ id: slug(g.name), ...g, active: true, order: i })));
  return l.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
}
const looseId = v => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
function groupGet(id) {
  const list = groups();
  const exact = list.find(g => g.id === id);
  if (exact) return exact;
  // Ids written before apostrophes were dropped, and names typed by hand, must
  // still find their group rather than quietly falling through to another one.
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
  // A group funded under another draws nothing of its own.
  const shares = fundedBy
    ? { eec: 0, tax: 0, mint: 0, other: 0, fixed: 0 }
    : { eec: pct(b.eec), tax: pct(b.tax), mint: pct(b.mint), other: pct(b.other), fixed: money(b.fixed) };
  const fields = {
    name, account: clean(b.account, 60), fundedBy, ...shares,
    muster: [].concat(b.muster || []).map(x => clean(x, 40)).filter(x => MUSTER_IDS.includes(x)).filter((x, i, a) => a.indexOf(x) === i),
    musterPer: MUSTER_PERIODS.some(x => x[0] === clean(b.musterPer, 20)) ? clean(b.musterPer, 20) : 'week',
    musterLeave: !!b.musterLeave,
    active: b.active === undefined ? true : !!b.active
  };
  if (g) Object.assign(g, fields);
  else {
    let nid = slug(name), i = 2;
    while (list.some(x => x.id === nid)) nid = slug(name) + '-' + i++;
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

// The Treasury's cut of the Exchange is the drawing groups' shares added up.
function treasuryCut() { return pct(drawing().reduce((n, g) => n + Number(g.eec || 0), 0)); }

// ---------------------------------------------------------------------------
// Holds and what each owes in tax each month
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Months
// ---------------------------------------------------------------------------

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

// Shares are copied onto the month so a closed month never changes when the
// standing shares are later amended.
function sharesNow() {
  const out = {};
  groups().forEach(g => { out[g.id] = { eec: pct(g.eec), tax: pct(g.tax), mint: pct(g.mint), other: pct(g.other), fixed: money(g.fixed) }; });
  return out;
}

function monthOpen(key, by) {
  const k = /^\d{4}-\d{2}$/.test(String(key)) ? String(key) : monthKey();
  const list = months();
  if (list.some(m => m.key === k)) return list.find(m => m.key === k);
  // Shares carry over from the month before, if there was one.
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
  // "Hold taxes" may simply be what the Holds owe, rather than typed by hand.
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

// ---------------------------------------------------------------------------
// What each group draws
// ---------------------------------------------------------------------------

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
      under: under(g.id).map(x => x.name)
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

// ---------------------------------------------------------------------------
// Paying the draws out
// ---------------------------------------------------------------------------

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
    id: S.id(), groupId, amount,
    forWhat: clean(b.forWhat, 120) || 'Monthly draw',
    requestId: clean(b.requestId, 40),
    when: clean(b.when, 80),
    note: clean(b.note, 200),
    by: (by && by.name) || '', at: now()
  };
  m.paid = (m.paid || []).concat([entry]);
  S.write(MONTHS, list);
  if (entry.requestId) requestSetStatus(entry.requestId, 'Paid', by);
  return entry;
}

function payUndo(key, id) {
  const list = months();
  const m = list.find(x => x.key === key);
  if (!m) return null;
  if (m.status === 'Closed') throw new Error('That month is closed.');
  const gone = (m.paid || []).find(p => p.id === id);
  m.paid = (m.paid || []).filter(p => p.id !== id);
  S.write(MONTHS, list);
  if (gone && gone.requestId) requestSetStatus(gone.requestId, 'Approved', null);
  return m;
}

// ---------------------------------------------------------------------------
// Requests: money beyond the monthly draw
// ---------------------------------------------------------------------------

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
    by: (by && by.name) || '', at: now()
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

// ---------------------------------------------------------------------------
// Spending: what a group did with what it received
// ---------------------------------------------------------------------------

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
  return entry;
}
function spendRemove(id) { S.write(SPENDING, spending().filter(s => s.id !== id)); }

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

// ---------------------------------------------------------------------------
// Rosters: for the record, and to show what payroll a draw must cover
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Wages drawn off the War Office muster
// ---------------------------------------------------------------------------
// The War Office already knows who is enlisted, at what rank and at what pay.
// A group may be tied to one of its units so the pay bill follows the muster
// instead of being typed a second time here. Nothing is copied: the figures are
// read at the moment they are shown, so a promotion moves the wages by itself.

const War = require('./waroffice');

const MUSTER_PERIODS = [['week', 'a week', 4], ['fortnight', 'a fortnight', 2], ['month', 'a month', 1]];
const MUSTER_BY_ID = Object.fromEntries(MUSTER_PERIODS.map(p => [p[0], p]));
const MUSTER_UNITS = () => War.UNITS.map(u => ({ id: u.id, name: u.name }));
const MUSTER_IDS = War.UNITS.map(u => u.id);
const MUSTER_ON_LEAVE = ['LOA', 'Inactive', 'Vacant'];

function musterName(ids) {
  const list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
  return list.map(id => { const u = War.UNITS.find(x => x.id === id); return u ? u.name : ''; }).filter(Boolean).join(', ');
}

// Those on leave draw nothing unless the group says otherwise.
// A group may draw off more than one unit: the Legion's own pay bill also
// carries its Battlemages and its Scouts, which the War Office keeps apart.
function musterIds(g) {
  const raw = (g && g.muster) || [];
  return (Array.isArray(raw) ? raw : [raw]).filter(x => MUSTER_IDS.includes(x));
}

function musterFor(g) {
  const ids = musterIds(g);
  if (!ids.length) return null;
  const units = ids.map(id => War.UNITS.find(u => u.id === id)).filter(Boolean);
  if (!units.length) return null;
  const all = War.all().filter(p => ids.includes(p.unit));
  const counted = g.musterLeave ? all : all.filter(p => !MUSTER_ON_LEAVE.includes(p.activity));
  const per = MUSTER_BY_ID[g.musterPer] || MUSTER_BY_ID.week;
  const each = p => money(p.pay) + money(p.bonus);
  const period = money(counted.reduce((n, p) => n + each(p), 0));
  const byRank = {};
  counted.forEach(p => {
    const k = byRank[p.rank] || (byRank[p.rank] = { n: 0, pay: 0 });
    k.n++; k.pay = money(k.pay + each(p));
  });
  // Ordered by unit as the War Office lists them, then by rank within a unit.
  const order = p => {
    const ui = ids.indexOf(p.unit);
    const u = units.find(x => x.id === p.unit);
    const ri = u ? u.ranks.indexOf(p.rank) : 99;
    return [ui, ri < 0 ? 98 : ri];
  };
  const byUnit = {};
  units.forEach(u => {
    const mine = counted.filter(p => p.unit === u.id);
    byUnit[u.name] = { n: mine.length, period: money(mine.reduce((n, p) => n + each(p), 0)) };
  });
  return {
    unit: units.map(u => u.name).join(', '), units: units.map(u => ({ id: u.id, name: u.name })),
    unitId: units[0].id, byUnit, several: units.length > 1,
    people: counted.slice().sort((a, b) => { const x = order(a), y = order(b); return x[0] - y[0] || x[1] - y[1] || a.name.localeCompare(b.name); }),
    passedOver: all.length - counted.length,
    onRoll: all.length,
    perLabel: per[1], per: per[0],
    period,
    // However the unit's pay is declared, show it every way it gets asked for.
    weekly: money(period * per[2] / 4),
    biweekly: money(period * per[2] / 2),
    monthly: money(period * per[2]),
    byRank, countsLeave: !!g.musterLeave
  };
}

// Rows pasted out of a spreadsheet or another app. Each line is one person.
// Columns may be separated by tabs, by two or more spaces, or by a pipe, and
// the order is read from what the values look like rather than assumed, because
// no two apps put the columns in the same order.
const IMPORT_FIELDS = ['rank', 'name', 'weekly', 'account', 'note'];

function parseRoster(raw) {
  const lines = String(raw || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const out = [], skipped = [];
  lines.forEach((line, i) => {
    // A header line names columns rather than a person.
    if (/^(rank|name|weekly|position|title)\b/i.test(line) && /\b(name|pay|account)\b/i.test(line)) return;
    const cells = (line.includes('\t') ? line.split('\t') : line.includes('|') ? line.split('|') : line.split(/\s{2,}/))
      .map(c => c.replace(/^[\u2666\u25c6\u2022\u00b7*\-\s]+/, '').trim());
    // A lone cell is taken as a bare name only when it reads like one.
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
    // Of the words left, the first is the rank and the second the name, unless
    // only one is left, in which case it is the name.
    if (rest.length === 1) row.name = clean(rest[0], 120);
    else { row.rank = clean(rest[0], 90); row.name = clean(rest[1], 120); row.note = clean(rest.slice(2).join(' \u00b7 '), 200); }
    if (!row.name) { skipped.push({ line: i + 1, text: line, why: 'No name upon the line.' }); return; }
    out.push(row);
  });
  return { rows: out, skipped };
}

// Somebody already upon the roster under the same name is amended, not doubled.
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

// A group's payroll covers its own roster and any group funded under it.
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

// ---------------------------------------------------------------------------
// The arrears summons: a paper that goes out over a sum left unrendered
// ---------------------------------------------------------------------------

const SUMMONS_STATUS = ['Issued', 'Served', 'Answered', 'Satisfied', 'Referred to Justice', 'Withdrawn'];
const SUMMONS_CLASS = { Issued: 'warn', Served: 'warn', Answered: '', Satisfied: 'ok', 'Referred to Justice': 'bad', Withdrawn: '' };
const SUMMONS_LIVE = ['Issued', 'Served', 'Answered'];

function summonses() { return S.read(SUMMONS, []); }
function summonsGet(id) { return summonses().find(x => x.id === id) || null; }
function summonsFor(assessId) { return summonses().filter(x => x.assessId === assessId).reverse(); }
function summonsLiveFor(assessId) { return summonsFor(assessId).filter(x => SUMMONS_LIVE.includes(x.status)); }

// A summons may only go out over a sum that actually stands unrendered, and
// only one may run at a time upon the same assessment.
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

// Refusing to answer is what carries the matter to the bench. The reference is
// written on the summons itself so the two Ministries read the same paper.
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

// An assessment in arrears with no summons running is one nobody has chased.
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

// ---------------------------------------------------------------------------
// The strongbox: logins for the Exchange House
// ---------------------------------------------------------------------------

function vault() { return S.read(VAULT, []); }
function vaultGet(id) { return vault().find(v => v.id === id) || null; }
// A link typed as "exchange.com/login" is still meant as a web address.
// Anything that is not plainly http or https is thrown away rather than kept.
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


// ---------------------------------------------------------------------------
// The Census & Excise Office: what is assessed, what is rendered, what is owed
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Charters and licences to trade
// ---------------------------------------------------------------------------

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
  // The fee falls due when the charter is first granted, not when it is sought.
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

// ---------------------------------------------------------------------------
// The Imperial Mint
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// What the rolls say a month's income should be
// ---------------------------------------------------------------------------

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

// Each income line, what is typed against it, and what the rolls actually show.
// The month before is offered too, since taxes are collected in arrear.
function fromRolls(key) {
  const prev = shiftKey(key, -1);
  return {
    tax: { rolls: renderedIn(key), prev: renderedIn(prev), due: holdsDue(), prevLabel: monthLabel(prev) },
    mint: { rolls: mintTributeIn(key), prev: mintTributeIn(prev), prevLabel: monthLabel(prev) },
    other: { rolls: charterFeesIn(key), prev: charterFeesIn(prev), prevLabel: monthLabel(prev) }
  };
}

// ---------------------------------------------------------------------------
// The state of things
// ---------------------------------------------------------------------------

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

// What still wants doing, for the overview.
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

// ---------------------------------------------------------------------------
// The Treasurer's report: an account of the Ministry's own work
// ---------------------------------------------------------------------------
// The months are the spine of it. A span of months is named, and everything
// else is measured against the same span so the figures agree with one another.

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
  rosters, rosterFor, rosterAdd, rosterUpdate, rosterRemove, payrollFor, rosterCounts,
  MUSTER_PERIODS, MUSTER_UNITS, MUSTER_IDS, musterFor, musterName, musterIds, rosterImport,
  SUMMONS_STATUS, SUMMONS_CLASS, SUMMONS_LIVE, summonses, summonsGet, summonsFor, summonsLiveFor,
  summonsIssue, summonsServe, summonsAnswer, summonsRefer, summonsClose, summonsRemove,
  unchased, summonsTotals, report, reportSpan,
  vault, vaultGet, vaultSave, vaultRemove,
  tallies, toDo
};
