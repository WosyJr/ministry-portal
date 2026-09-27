const { BY_KEY } = require('./forms');

// Which field on each writ names a person, and in what standing they appear.
// A record can name several people in several standings; each becomes an entry.
const NAMED = {
  service: [['full-name', 'Officer of the Ministry']],
  appointment: [['appointee', 'Appointed to office']],
  heraldry: [['name', 'Claimant of arms']],
  seal: [['office-custodian', 'Keeper of a seal']],
  authentication: [['presented-by', 'Presented a paper for examination']],
  correspondence: [['sender', 'Wrote to the Ministry'], ['recipient', 'Written to by the Ministry']],
  petition: [['name', 'Petitioner']],
  matter: [['principal-parties', 'Party to a matter']],
  finding: [['subject', 'Subject of a finding']],
  license: [['holder', 'Holder of a licence']],
  meeting: [['party-sought', 'Sought for an audience']],
  'name-change': [['the-name-hitherto-borne', 'Name laid down'], ['the-name-now-taken', 'Name taken up']],
  accord: [['parties', 'Party to an accord']],
  referral: [['referred-to', 'Referred to']],
  inquiry: [['subject-matter', 'Subject of an inquiry']]
};

const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim();
const key = n => clean(n).toLowerCase();

function meta(rec, readMeta) {
  const m = readMeta(rec) || {};
  return (m.input && m.input.f) || {};
}

// Several names may sit in one field, separated by commas or "and".
function split(value) {
  return clean(value)
    .split(/\s*(?:,|;| and | & )\s*/i)
    .map(clean)
    .filter(n => n.length > 2 && n.length < 120);
}

function namesOn(rec, readMeta) {
  const spec = NAMED[rec.Form];
  if (!spec) return [];
  const f = meta(rec, readMeta);
  const out = [];
  spec.forEach(([id, standing]) => {
    split(f[id]).forEach(name => out.push({ name, standing, field: id }));
  });
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
  (rows || []).forEach(rec => {
    namesOn(rec, readMeta).forEach(({ name, standing }) => {
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
  return Array.from(people.values())
    .map(p => ({ name: p.name, standings: Array.from(p.standings), count: p.records.length, last: p.last }))
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

module.exports = { NAMED, namesOn, index, list, record, suggest, aliasPairs };
