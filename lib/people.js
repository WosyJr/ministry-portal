const S = require('./store');
const Ranks = require('./ranks');
const { BY_KEY } = require('./forms');

// Which field on each writ names a person, and in what standing they appear.
// A record can name several people in several standings; each becomes an entry.
// Only fields that name a PARTY. Fields that name an office, an authority or a
// subject-matter are deliberately absent — a Register of Seals names a
// custodian's office, a Finding names its subject, a Referral names the body it
// went to, and an Inquiry names a topic. None of those are people.
const NAMED = {
  service: [['full-name', 'Officer of the Ministry']],
  appointment: [['appointee', 'Appointed to office']],
  heraldry: [['name', 'Claimant of arms']],
  authentication: [['presented-by', 'Presented a paper for examination']],
  correspondence: [['sender', 'Wrote to the Ministry'], ['recipient', 'Written to by the Ministry']],
  petition: [['name', 'Petitioner']],
  matter: [['principal-parties', 'Party to a matter']],
  license: [['holder', 'Holder of a licence']],
  meeting: [['party-sought', 'Sought for an audience']],
  'name-change': [['the-name-hitherto-borne', 'Name laid down'], ['the-name-now-taken', 'Name taken up']],
  accord: [['parties', 'Party to an accord']]
};

// Several of those fields hold a person on one record and a House, an office or
// a broadsheet on the next. The index guesses, and an officer can correct it;
// a correction is remembered and always wins.
const KINDS = ['Person', 'Office', 'House or company', 'Publication', 'Other party'];
const KINDS_FILE = 'people-kinds.json';

const OFFICEY = /\b(ministry|ministries|office|offices|affairs|bureau|department|chancery|registry|court|council|board|commission|synod|college|temple|chapel|order|guard|legion|watch|garrison|cohort|guild|company|trading|house of|exchange|bank|treasury|mint|estate|hold of|the crown|governor'?s|penitus)\b/i;
const PRESSY = /\b(daily|weekly|gazette|herald|courier|chronicle|times|tribune|press|broadsheet|crier|news)\b/i;

function kindsStored() { return S.read(KINDS_FILE, {}); }
function setKind(name, kind) {
  const k = key(name);
  if (!k) return null;
  const all = kindsStored();
  if (!kind || kind === 'auto') delete all[k];
  else all[k] = KINDS.includes(kind) ? kind : 'Other party';
  S.write(KINDS_FILE, all);
  return all[k] || null;
}

function guessKind(name) {
  const n = clean(name);
  if (PRESSY.test(n)) return 'Publication';
  if (OFFICEY.test(n)) return 'Office';
  try {
    const rankNames = Ranks.all().map(r => String(r.name).toLowerCase());
    if (rankNames.includes(n.toLowerCase())) return 'Office';
  } catch (_) { /* ranks unreadable; fall through */ }
  return 'Person';
}

function kindOf(name, stored) {
  const all = stored || kindsStored();
  return all[key(name)] || guessKind(name);
}

const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim();
const key = n => clean(n).toLowerCase();

function meta(rec, readMeta) {
  const m = readMeta(rec) || {};
  return (m.input && m.input.f) || {};
}

// The names of the Ministries themselves, their officers' ranks, and the short
// forms people actually write. A record naming one of these is naming an office,
// not a party, and the name must never be broken apart on the "and" inside it.
function ourNames() {
  const out = new Set();
  const add = v => { const k = key(v); if (k.length > 2) out.add(k); };
  try {
    Ranks.BRANCHES.forEach(b => {
      add(b.name);
      add(String(b.name).replace(/^The\s+/i, ''));
      add(b.short);
    });
    Ranks.all().forEach(r => { add(r.name); if (r.subtitle) add(r.subtitle); });
  } catch (_) { /* ranks unreadable; fall through */ }
  return out;
}

// A name that reads as an institution is never split: "Ministry of Civil and
// Administrative Affairs" is one party, not two. Only a list of what look like
// people is broken apart, and a comma is trusted more than an "and".
const PERSONISH = n => {
  const w = clean(n).split(' ').filter(Boolean);
  return w.length >= 1 && w.length <= 4 && !OFFICEY.test(n) && !PRESSY.test(n) && !/\bof\b|\bfor\b/i.test(n);
};

// What an institution's name starts with. A string that OPENS this way is one
// body's name and is never broken on the "and" inside it; a string that merely
// mentions one further along is a list, and is.
const INSTITUTION_HEAD = /^(?:the\s+)?(?:imperial\s+|provincial\s+|cyrodilic\s+)?(ministry|ministries|minister|office|bureau|department|chancery|registry|court|council|board|commission|synod|college|temple|chapel|order|guard|legion|watch|garrison|cohort|guild|company|house|exchange|bank|treasury|mint|governor)/i;
const isInstitution = (n, mine) => mine.has(key(n)) || INSTITUTION_HEAD.test(clean(n));

function split(value, known) {
  const whole = clean(value);
  if (!whole || whole.length > 200) return whole && whole.length > 2 ? [whole] : [];
  const mine = known || ourNames();
  if (isInstitution(whole, mine)) return [whole];

  const out = [];
  whole.split(/\s*[,;]\s*/).map(clean).filter(Boolean).forEach(part => {
    if (isInstitution(part, mine)) { out.push(part); return; }
    const halves = part.split(/\s+(?:and|&)\s+/i).map(clean).filter(Boolean);
    // Break on "and" only where each side can stand as a party of its own.
    if (halves.length > 1 && halves.every(h => PERSONISH(h) || isInstitution(h, mine))) out.push(...halves);
    else out.push(part);
  });
  return out.filter(n => n.length > 2 && n.length < 120);
}

function namesOn(rec, readMeta, known) {
  const spec = NAMED[rec.Form];
  if (!spec) return [];
  const f = meta(rec, readMeta);
  const out = [];
  const mine = known || ourNames();
  spec.forEach(([id, standing]) => {
    split(f[id], mine).forEach(name => out.push({ name, standing, field: id }));
  });
  return out;
}

// Somebody upon the Ministry's own rolls is not a stranger who wrote in.
function officersByName() {
  const out = new Map();
  try {
    require('./users').list().forEach(o => { if (o.name) out.set(key(o.name), o); });
  } catch (_) { /* users unreadable; fall through */ }
  return out;
}

// A Writ of Change of Name ties two names to one person. Build those pairs so
// a search for either name finds the other.
function aliasPairs(rows, readMeta) {
  const pairs = [];
  (rows || []).forEach(rec => {
    if (rec.Form !== 'name-change') return;
    const f = meta(rec, readMeta);
    const was = clean(f['the-name-hitherto-borne']);
    const now = clean(f['the-name-now-taken']);
    if (was && now) pairs.push({ was, now, no: rec['Record No'] });
  });
  return pairs;
}

function index(rows, readMeta) {
  const people = new Map();
  const mine = ourNames();
  (rows || []).forEach(rec => {
    namesOn(rec, readMeta, mine).forEach(({ name, standing }) => {
      const k = key(name);
      if (!people.has(k)) people.set(k, { name, standings: new Set(), records: [], last: '' });
      const p = people.get(k);
      p.standings.add(standing);
      p.records.push({ rec, standing });
      const at = rec['Filed At (UTC)'] || '';
      if (at > p.last) p.last = at;
    });
  });
  return people;
}

function list(rows, readMeta) {
  const people = index(rows, readMeta);
  const stored = kindsStored();
  const mine = ourNames();
  const officers = officersByName();
  return Array.from(people.values())
    .map(p => {
      // Somebody on our own rolls is an officer, not a stranger; and one of the
      // Ministries' own names is this administration, not an outside party.
      const officer = officers.get(key(p.name)) || null;
      const ours = mine.has(key(p.name));
      return {
        name: p.name, standings: Array.from(p.standings), count: p.records.length, last: p.last,
        kind: officer ? 'Person' : kindOf(p.name, stored),
        fixed: !!stored[key(p.name)],
        officer: officer ? { username: officer.username, rankName: officer.rankName, office: officer.office } : null,
        ours
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function record(rows, readMeta, name) {
  const want = key(name);
  if (!want) return null;
  const people = index(rows, readMeta);
  const p = people.get(want);

  const pairs = aliasPairs(rows, readMeta);
  const aliases = [];
  pairs.forEach(x => {
    if (key(x.was) === want && !aliases.some(a => key(a.name) === key(x.now))) aliases.push({ name: x.now, how: 'Now known as', no: x.no });
    if (key(x.now) === want && !aliases.some(a => key(a.name) === key(x.was))) aliases.push({ name: x.was, how: 'Formerly', no: x.no });
  });

  if (!p && !aliases.length) return null;

  const records = p ? p.records.slice() : [];
  records.sort((a, b) => String(b.rec['Filed At (UTC)'] || '').localeCompare(String(a.rec['Filed At (UTC)'] || '')));

  const byStanding = {};
  records.forEach(({ rec, standing }) => { (byStanding[standing] = byStanding[standing] || []).push(rec); });

  const holds = Array.from(new Set(records.map(({ rec }) => rec.Hold).filter(Boolean)));
  const titleOf = k => (BY_KEY[k] || {}).title || k;

  return {
    name: p ? p.name : (aliases[0] ? name : name),
    kind: kindOf(p ? p.name : name),
    fixed: !!kindsStored()[key(p ? p.name : name)],
    aliases,
    records,
    byStanding,
    holds,
    kinds: Array.from(new Set(records.map(({ rec }) => titleOf(rec.Form)))),
    open: records.filter(({ rec }) => rec.Status !== 'Closed' && rec.Status !== 'Archived' && rec.Status !== 'Revoked').length
  };
}

function suggest(rows, readMeta, q) {
  const needle = key(q);
  if (needle.length < 2) return [];
  const out = [];
  index(rows, readMeta).forEach(p => {
    if (key(p.name).includes(needle)) out.push({ name: p.name, n: p.records.length });
  });
  return out.sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).slice(0, 12);
}

module.exports = { NAMED, KINDS, namesOn, index, list, record, suggest, aliasPairs, kindOf, guessKind, setKind };
