const S = require('./store');
const Ranks = require('./ranks');
const U = require('./users');

const FILE = 'quota.json';

const DUTIES = [
  'Attend a Jarl’s court in one of your Holds and record what was heard.',
  'Take one petition in person rather than by courier, and say so in the record.',
  'Examine one licence or charter in force in your Holds and report whether it still answers.',
  'Report on one dispute between two of your Holds that the Ministry has not yet heard of.',
  'Verify a seal or signet in use in your Holds against the register.',
  'Call upon one steward you have not spoken with this month.',
  'Write up one matter the Ministry has no record of at all.',
  'Walk one road or crossing in your Holds and report its condition and who keeps it.',
  'Ask one Hold what it wants of the Ministry, and bring the answer back whole.',
  'Review the oldest open record in your Holds and say why it is still open.',
  'Sit with one Hold guard captain and write down what they say the Ministry gets wrong.',
  'Count the Imperial papers actually posted in one settlement and report which are missing or out of date.',
  'Take the account of one traveller newly come into your Holds — where from, by which road, and what they met on it.',
  'Find one person in your Holds the Ministry has a record of and has not heard from in a year, and ask after them.',
  'Read one of the Ledger of Laws through and report whether it is kept in your Holds or quietly ignored.',
  'Visit one mill, mine or farmstead and write down what it produces and what it is short of.',
  'Record the going price of bread, ale and a night’s lodging in one settlement of your Holds.',
  'Speak with one priest or temple keeper and record what the people bring to them that they do not bring to us.',
  'Report on one bridge, ferry or pass in your Holds — whether it stands, who keeps it, and what it costs to cross.',
  'Find one dispute settled outside the Ministry altogether, and write down how it was settled and why they did not come to us.',
  'Call upon one innkeeper and take the plain account of who has passed through this month.',
  'Check one boundary between two of your Holds against the record and report any disagreement.',
  'Attend one market day and record what is sold, what is scarce, and what is being sold that ought not to be.',
  'Write up one grievance against the Ministry itself, in the complainant’s own words, without softening it.',
  'Take the account of one Legion officer stationed in your Holds on what the Ministry could do for them.',
  'Find one standing Imperial order in your Holds that nobody is any longer obeying, and report why.',
  'Sit through one Hold court session end to end and record what was decided and on what grounds.',
  'Report on the state of one Imperial building in your Holds — roof, door, ledger, and whoever keeps it.',
  'Record one custom of your Holds that the Ministry has no written note of.',
  'Find one person doing the Ministry’s work without the Ministry’s paper, and enter them properly.',
  'Report which roads in your Holds are unsafe this week, and on whose word.',
  'Take one sworn statement in full, read it back to the person, and have them set their mark on it.',
  'Report on one matter you referred elsewhere last month, and say what became of it.',
  'Write a plain account of one thing in your Holds that is going right, with the names of who is doing it.',
  'Visit the most distant settlement in your Holds that you have not been to this season.',
  'Ask one Jarl’s steward directly what they would have the Ministry stop doing.'
];

const DEFAULTS = { rounds: 3, paper: true, duty: true, duties: DUTIES };

const BLANK = { settings: {}, assigned: {}, record: {}, hand: {} };

function store() {
  const d = S.read(FILE, null);
  if (!d || typeof d !== 'object') return { settings: {}, assigned: {}, record: {}, hand: {} };
  return { settings: d.settings || {}, assigned: d.assigned || {}, record: d.record || {}, hand: d.hand || {} };
}

function handFor(username, key) {
  const who = (store().hand || {})[String(username).toLowerCase()] || {};
  return who[key] || {};
}

function markLine(username, key, lineId, met, by) {
  const who = String(username).toLowerCase();
  const id = String(lineId || '').slice(0, 24);
  if (!id) return {};
  S.update(FILE, BLANK, d => {
    d.hand = d.hand || {};
    d.hand[who] = d.hand[who] || {};
    d.hand[who][key] = d.hand[who][key] || {};
    if (met === null || met === undefined) delete d.hand[who][key][id];
    else d.hand[who][key][id] = { met: !!met, by: (by && by.name) || 'the Minister', at: new Date().toISOString() };
    if (!Object.keys(d.hand[who][key]).length) delete d.hand[who][key];
    if (!Object.keys(d.hand[who]).length) delete d.hand[who];
  });
  return handFor(username, key);
}

function clearHand(username, key) {
  const who = String(username).toLowerCase();
  S.update(FILE, BLANK, d => {
    if (d.hand && d.hand[who]) delete d.hand[who][key];
  });
}

function settings() {
  const s = store().settings;
  const list = Array.isArray(s.duties) && s.duties.length ? s.duties : DUTIES;
  return {
    rounds: Number.isFinite(Number(s.rounds)) ? Math.max(0, Math.min(20, Number(s.rounds))) : DEFAULTS.rounds,
    paper: s.paper === undefined ? DEFAULTS.paper : !!s.paper,
    duty: s.duty === undefined ? DEFAULTS.duty : !!s.duty,
    duties: list.map(x => String(x).slice(0, 300)).filter(Boolean)
  };
}

function setSettings(patch) {
  S.update(FILE, { settings: {}, assigned: {}, record: {} }, d => {
    d.settings = d.settings || {};
    if (patch.rounds !== undefined) d.settings.rounds = Math.max(0, Math.min(20, parseInt(patch.rounds, 10) || 0));
    if (patch.paper !== undefined) d.settings.paper = !!patch.paper;
    if (patch.duty !== undefined) d.settings.duty = !!patch.duty;
    if (patch.duties !== undefined) {
      const list = String(patch.duties).split('\n').map(x => x.trim().slice(0, 300)).filter(Boolean);
      d.settings.duties = list.length ? list : DUTIES;
    }
  });
  return settings();
}

function mondayOf(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function weekKey(date) {
  const m = mondayOf(date || new Date());
  const y = m.getFullYear();
  const mm = String(m.getMonth() + 1).padStart(2, '0');
  const dd = String(m.getDate()).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function weekRange(key) {
  const parts = String(key).split('-').map(Number);
  const start = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1, 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

function weekLabel(key) {
  const { start, end } = weekRange(key);
  const f = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const last = new Date(end);
  last.setDate(last.getDate() - 1);
  return `${f(start)} to ${f(last)}`;
}

function recentWeeks(n) {
  const out = [];
  const m = mondayOf(new Date());
  for (let i = 0; i < (n || 8); i++) {
    out.push(weekKey(m));
    m.setDate(m.getDate() - 7);
  }
  return out;
}

function isCurrent(key) { return key === weekKey(new Date()); }
function isPast(key) { return weekRange(key).end <= new Date(); }

function quotaRanks() {
  return Ranks.all().filter(r => r.quota);
}

function quotaRankIds() {
  return new Set(quotaRanks().map(r => r.id));
}

function bearers() {
  const ids = quotaRankIds();
  return U.list().filter(o => o.active !== false && ids.has(o.rank));
}

function holdsFor(user) {
  const r = Ranks.get(user && user.rank);
  const own = Array.isArray(user && user.holds) && user.holds.length ? user.holds : null;
  const list = own || (r && Array.isArray(r.holds) ? r.holds : []);
  return list.map(h => (Ranks.HOLD_BY_ID[h] ? Ranks.HOLD_BY_ID[h].name : h)).filter(Boolean);
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < String(s).length; i++) h = (h * 31 + String(s).charCodeAt(i)) >>> 0;
  return h;
}

function weekIndex(key) {
  const { start } = weekRange(key);
  return Math.floor(start.getTime() / (7 * 86400000));
}

function drawnFor(username, key) {
  const cfg = settings();
  if (!cfg.duty || !cfg.duties.length) return null;
  const set = store().assigned[String(username).toLowerCase()] || {};
  if (set[key]) return { text: set[key], assigned: true };
  const ix = (weekIndex(key) + hash(username)) % cfg.duties.length;
  return { text: cfg.duties[ix], assigned: false };
}

function assignDuty(username, key, text) {
  const who = String(username).toLowerCase();
  const t = String(text || '').trim().slice(0, 300);
  S.update(FILE, { settings: {}, assigned: {}, record: {} }, d => {
    d.assigned = d.assigned || {};
    d.assigned[who] = d.assigned[who] || {};
    if (t) d.assigned[who][key] = t;
    else delete d.assigned[who][key];
  });
  return drawnFor(username, key);
}

function inWeek(iso, key) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  const { start, end } = weekRange(key);
  return t >= start.getTime() && t < end.getTime();
}

function weekFor(user, rows, key, readMeta) {
  const cfg = settings();
  const wk = key || weekKey(new Date());
  const holds = holdsFor(user);
  const mine = (rows || []).filter(r => {
    const m = readMeta ? (readMeta(r) || {}) : {};
    return m.filer === user.username;
  });
  const thisWeek = mine.filter(r => inWeek(r['Filed At (UTC)'], wk));
  const inMyHolds = thisWeek.filter(r => !holds.length || holds.includes(r.Hold));
  const paper = thisWeek.find(r => r.Form === 'weekly-return') || null;
  const rounds = inMyHolds.filter(r => r.Form !== 'weekly-return');
  const waiting = (rows || []).filter(r => r['Assigned To'] === user.username && !['Closed', 'Archived', 'Revoked', 'Standing'].includes(r.Status));

  const lines = [];
  if (cfg.paper) {
    lines.push({
      id: 'paper', name: 'The Weekly Return',
      what: 'the paper on your Holds',
      met: !!paper,
      detail: paper ? `${paper['Record No']} — ${paper.Status === 'Awaiting Seal' ? 'with the Minister for a seal' : paper.Status}` : 'not yet written',
      link: paper ? '/staff/records/' + encodeURIComponent(paper['Record No']) : '/staff/file/weekly-return'
    });
  }
  if (cfg.rounds > 0) {
    lines.push({
      id: 'rounds', name: 'Rounds in your Holds',
      what: `${cfg.rounds} record${cfg.rounds === 1 ? '' : 's'} filed in your own Holds`,
      met: rounds.length >= cfg.rounds,
      detail: `${rounds.length} of ${cfg.rounds}`,
      link: '/staff/file'
    });
  }
  const duty = cfg.duty ? drawnFor(user.username, wk) : null;
  if (duty) {
    lines.push({
      id: 'duty', name: duty.assigned ? 'Your duty this week (set by the Minister)' : 'Your duty this week',
      what: duty.text,
      met: null,
      detail: duty.assigned ? 'assigned' : 'drawn',
      link: ''
    });
  }
  if (waiting.length) {
    lines.push({
      id: 'waiting', name: 'Left on your hands',
      what: 'records assigned to you and still open',
      met: false,
      detail: `${waiting.length} outstanding`,
      link: '/staff/docket'
    });
  }

  const hand = handFor(user.username, wk);
  lines.forEach(l => {
    const h = hand[l.id];
    if (!h) return;
    l.met = !!h.met;
    l.byHand = h.by || 'the Minister';
    l.handAt = h.at || '';
    l.detail = `${l.detail} · set ${h.met ? 'done' : 'still owed'} by ${h.by || 'the Minister'}`;
  });

  const judged = lines.filter(l => l.met !== null);
  const short = judged.filter(l => !l.met);
  return {
    week: wk, label: weekLabel(wk), current: isCurrent(wk), past: isPast(wk),
    user, holds, lines, duty, paper, rounds: rounds.length, need: cfg.rounds,
    waiting: waiting.length, met: short.length === 0, short: short.map(l => l.name), hand
  };
}

function setWeek(username, key, met, by, note) {
  const who = String(username).toLowerCase();
  S.update(FILE, { settings: {}, assigned: {}, record: {} }, d => {
    d.record = d.record || {};
    d.record[who] = d.record[who] || [];
    const x = d.record[who].find(v => v.week === key);
    const entry = {
      week: key, met: !!met, short: met ? [] : (x ? x.short || [] : ['Set down by the Minister']),
      at: (x && x.at) || new Date().toISOString(),
      byHand: (by && by.name) || 'the Minister', handAt: new Date().toISOString(),
      note: String(note || '').slice(0, 200)
    };
    if (x) Object.assign(x, entry);
    else d.record[who].push(entry);
  });
  return recordFor(username);
}

function forgetWeek(username, key) {
  const who = String(username).toLowerCase();
  S.update(FILE, { settings: {}, assigned: {}, record: {} }, d => {
    if (!d.record || !d.record[who]) return;
    const i = d.record[who].findIndex(v => v.week === key);
    if (i >= 0) d.record[who].splice(i, 1);
  });
}

function startFrom(key) {
  let wiped = 0;
  S.update(FILE, { settings: {}, assigned: {}, record: {} }, d => {
    d.record = d.record || {};
    Object.keys(d.record).forEach(who => {
      const keep = d.record[who].filter(v => String(v.week) >= String(key));
      wiped += d.record[who].length - keep.length;
      d.record[who] = keep;
    });
    d.settings = d.settings || {};
    d.settings.startWeek = key;
  });
  return wiped;
}

function startWeek() { return store().settings.startWeek || ''; }

function recordFor(username) {
  return (store().record[String(username).toLowerCase()] || []).slice().sort((a, b) => String(b.week).localeCompare(String(a.week)));
}

function noteWeek(username, key, met, short) {
  const who = String(username).toLowerCase();
  let wrote = false;
  S.update(FILE, { settings: {}, assigned: {}, record: {} }, d => {
    d.record = d.record || {};
    d.record[who] = d.record[who] || [];
    if (d.record[who].some(x => x.week === key)) return;
    d.record[who].push({ week: key, met: !!met, short: short || [], at: new Date().toISOString() });
    d.record[who] = d.record[who].slice(-200);
    wrote = true;
  });
  return wrote;
}

function closePast(rows, readMeta, notify) {
  const from = startWeek();
  const weeks = recentWeeks(9).filter(isPast).filter(w => !from || String(w) >= String(from));
  const out = [];
  bearers().forEach(o => {
    weeks.forEach(wk => {
      const w = weekFor(o, rows, wk, readMeta);
      if (noteWeek(o.username, wk, w.met, w.short) && !w.met) {
        out.push({ who: o, week: wk, label: w.label, short: w.short });
      }
    });
  });
  if (notify) {
    out.forEach(x => notify(`${x.who.name} came up short for the week of ${x.label}: ${x.short.join(', ')}.`, '/staff/delegates'));
  }
  return out;
}

function standing(rows, readMeta) {
  const wk = weekKey(new Date());
  return bearers().map(o => {
    const w = weekFor(o, rows, wk, readMeta);
    const past = recordFor(o.username);
    const missed = past.filter(x => !x.met).length;
    return { ...w, history: past.slice(0, 8), missed, total: past.length };
  });
}

module.exports = {
  DUTIES, DEFAULTS, settings, setSettings, weekKey, weekRange, weekLabel, recentWeeks,
  isCurrent, isPast, quotaRanks, bearers, holdsFor, drawnFor, assignDuty,
  weekFor, recordFor, noteWeek, closePast, standing, setWeek, forgetWeek, startFrom, startWeek,
  handFor, markLine, clearHand
};
