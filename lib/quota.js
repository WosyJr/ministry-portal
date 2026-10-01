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
  'Review the oldest open record in your Holds and say why it is still open.'
];

const DEFAULTS = { rounds: 3, paper: true, duty: true, duties: DUTIES };

function store() {
  const d = S.read(FILE, null);
  if (!d || typeof d !== 'object') return { settings: {}, assigned: {}, record: {} };
  return { settings: d.settings || {}, assigned: d.assigned || {}, record: d.record || {} };
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
  const waiting = (rows || []).filter(r => r['Assigned To'] === user.username && !['Closed', 'Archived', 'Revoked'].includes(r.Status));

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

  const judged = lines.filter(l => l.met !== null);
  const short = judged.filter(l => !l.met);
  return {
    week: wk, label: weekLabel(wk), current: isCurrent(wk), past: isPast(wk),
    user, holds, lines, duty, paper, rounds: rounds.length, need: cfg.rounds,
    waiting: waiting.length, met: short.length === 0, short: short.map(l => l.name)
  };
}

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
  const weeks = recentWeeks(9).filter(isPast);
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
  weekFor, recordFor, noteWeek, closePast, standing
};
