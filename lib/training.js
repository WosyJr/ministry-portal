const S = require('./store');
const Ranks = require('./ranks');

// The applicant's exercise. Somebody who wants a Hold is sent a link, writes a
// Dispatch upon it, and the Ministry reads what comes back. Nothing here touches
// the Docket: an exercise is not a record, and an applicant is not an officer.

const FILE = 'training-exercises.json';

const clean = (v, max) => String(v ?? '').replace(/[\r\n]/g, ' ').trim().slice(0, max);
const text = (v, max) => String(v ?? '').replace(/\r/g, '').trim().slice(0, max);
const now = () => new Date().toISOString();

const VERDICTS = ['Not yet read', 'Promising', 'Wants work', 'Not suitable', 'Appointed'];
const VERDICT_CLASS = { 'Not yet read': 'warn', Promising: 'ok', 'Wants work': 'warn', 'Not suitable': 'bad', Appointed: 'ok' };
const ROUTING = ['Publish', 'Clarify', 'Monitor', 'Internal Inquiry', 'Refer'];

const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
function roman(n) { let out = '', v = Math.max(1, n); ROMAN.forEach(([k, r]) => { while (v >= k) { out += r; v -= k; } }); return out; }

function all() { return S.read(FILE, []); }
function get(id) { return all().find(x => x.id === id) || null; }

// The grid of meetings, as the real Dispatch keeps it.
const COLS = ['Date (4E)', 'Hold / Place', 'Persons Met', 'Substance'];

function rowsFrom(g) {
  const out = [];
  for (let i = 0; i < 8; i++) {
    const row = COLS.map((_, j) => clean(g && g[i] && g[i][j], 300));
    if (row.some(Boolean)) out.push(row);
  }
  return out;
}

function add(b) {
  const who = clean(b.who, 120);
  const character = clean(b.character, 120);
  if (!who) throw new Error('Give the name we should answer to.');
  if (!character) throw new Error('Give the name of the character who writes this Dispatch.');
  const holds = clean(b.holds, 140);
  if (!holds) throw new Error('Name the Holds this Dispatch comes from.');
  const meetings = rowsFrom(b.g);
  const body = [b.notices, b.concerns, b.review].map(x => text(x, 4000));
  if (!meetings.length && !body.some(x => x.length > 20)) {
    throw new Error('A Dispatch that reports nothing is not a Dispatch. Set down at least what you did and whom you met.');
  }
  const list = all();
  const entry = {
    id: S.id(),
    no: 'Exercise ' + roman(list.length + 1),
    who, character,
    contact: clean(b.contact, 140),
    holds,
    period: clean(b.period, 120),
    sentTo: clean(b.sentTo, 120) || 'Imperial Envoy to the Holds',
    notices: body[0], concerns: body[1], review: body[2],
    meetings,
    routing: ROUTING.includes(b.routing) ? b.routing : '',
    referral: clean(b.referral, 200),
    verdict: 'Not yet read', note: '', readBy: '', readAt: '',
    at: now()
  };
  list.push(entry);
  S.write(FILE, list);
  return entry;
}

function mark(id, b, by) {
  const list = all();
  const x = list.find(v => v.id === id);
  if (!x) throw new Error('No exercise answers to that.');
  if (VERDICTS.includes(b.verdict)) x.verdict = b.verdict;
  if (b.note !== undefined) x.note = text(b.note, 2000);
  x.readBy = (by && by.name) || '';
  x.readAt = now();
  S.write(FILE, list);
  return x;
}

function remove(id) { S.write(FILE, all().filter(x => x.id !== id)); }

function counts() {
  const l = all();
  const by = {};
  VERDICTS.forEach(v => { by[v] = l.filter(x => x.verdict === v).length; });
  return { n: l.length, waiting: by['Not yet read'] || 0, by };
}

// Only an officer who may enter people upon the rolls should read the
// interview script, or the questions are worth nothing the first time they leak.
function mayJudge(u) { return !!u && (u.all || Ranks.can(u, 'officers') || Ranks.can(u, 'ministryadmin')); }

module.exports = { VERDICTS, VERDICT_CLASS, ROUTING, COLS, all, get, add, mark, remove, counts, mayJudge };
