const S = require('./store');

const clean = (v, max) => String(v ?? '').replace(/[\r\n]/g, ' ').trim().slice(0, max);
const text = (v, max) => String(v ?? '').replace(/\r/g, '').trim().slice(0, max);
const now = () => new Date().toISOString();

// Money is kept to the hundredth and rounded only when shown.
const money = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0; };
const pct = v => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.min(100, Math.round(n * 1000) / 1000) : 0; };
const slug = s => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
function roman(n) { let out = '', v = Math.max(1, n); ROMAN.forEach(([k, r]) => { while (v >= k) { out += r; v -= k; } }); return out; }

const GROUPS = 'finance-groups.json';
const HOLDS = 'finance-holds.json';
const MONTHS = 'finance-months.json';
const REQUESTS = 'finance-requests.json';
const SPENDING = 'finance-spending.json';
const ROSTERS = 'finance-rosters.json';
const VAULT = 'finance-vault.json';

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
function groupGet(id) { return groups().find(g => g.id === id) || null; }
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
  const fields = { name, account: clean(b.account, 60), fundedBy, ...shares, active: b.active === undefined ? true : !!b.active };
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

// A group's payroll covers its own roster and any group funded under it.
function payrollFor(groupId) {
  const ids = [groupId].concat(under(groupId).map(g => g.id));
  const own = money(rosterFor(groupId).reduce((n, r) => n + money(r.weekly), 0));
  const all = money(ids.reduce((n, id) => n + rosterFor(id).reduce((x, r) => x + money(r.weekly), 0), 0));
  return { weekly: own, biweekly: money(own * 2), monthly: money(own * 4), withUnder: money(all * 4), hasUnder: ids.length > 1 };
}

function rosterCounts(groupId) {
  const l = rosterFor(groupId);
  const byRank = {};
  l.forEach(r => { byRank[r.rank] = (byRank[r.rank] || 0) + 1; });
  return { n: l.length, byRank };
}

// ---------------------------------------------------------------------------
// The strongbox: logins for the Exchange House
// ---------------------------------------------------------------------------

function vault() { return S.read(VAULT, []); }
function vaultGet(id) { return vault().find(v => v.id === id) || null; }
function vaultSave(id, b) {
  const list = vault();
  let v = id ? list.find(x => x.id === id) : null;
  const account = clean(b.account, 90);
  if (!account) throw new Error('Name the account.');
  const fields = {
    account, username: clean(b.username, 90),
    link: clean(b.link, 300), note: clean(b.note, 200),
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

module.exports = {
  money, pct, roman, slug, monthKey, monthLabel, shiftKey, MONTH_NAMES, STATUS, INCOME_KINDS, INCOME_IDS,
  groups, groupGet, groupName, drawing, under, groupSave, groupRemove, treasuryCut,
  holds, holdSave, holdRemove, holdsDue,
  months, monthGet, monthOpen, monthEnsure, monthSaveIncome, monthSaveShares, monthSetStatus, monthRemove, sharesNow,
  budget, payOut, payUndo,
  REQ_STATUS, REQ_CLASS, requests, requestGet, requestsFor, requestsWaiting, requestsToPay, requestAsk, requestAnswer, requestRemove,
  SPEND_ON, spending, spendingFor, spendAdd, spendRemove, spendingSummary,
  rosters, rosterFor, rosterAdd, rosterUpdate, rosterRemove, payrollFor, rosterCounts,
  vault, vaultGet, vaultSave, vaultRemove,
  tallies, toDo
};
