const S = require('./store');
const Ranks = require('./ranks');

const FILE = 'gazette.json';
const MAX = 200;

const clean = (v, n) => String(v == null ? '' : v).replace(/\r/g, '').trim().slice(0, n);

const SECTIONS = [
  { id: 'notices', name: 'Notices from the Ministry', lead: 'What the Ministry has put before the province this week.' },
  { id: 'sealed', name: 'Papers Sealed', lead: 'Writs that took the Minister’s wax and are now in force.' },
  { id: 'appointments', name: 'Appointments and Departures', lead: 'Who has taken up an office and who has laid one down.' },
  { id: 'judgments', name: 'From the Bench', lead: 'Judgments given by the Ministry of Justice and published.' },
  { id: 'licences', name: 'Licences and Charters', lead: 'Leave granted to trade, to carry, to build or to gather.' },
  { id: 'holds', name: 'From the Holds', lead: 'What the Delegates have sent in from their own Holds.' },
  { id: 'notes', name: 'Set Down by the Editor', lead: 'Anything else the province should know.' }
];
const SECTION = Object.fromEntries(SECTIONS.map(s => [s.id, s]));

function store() {
  const d = S.read(FILE, null);
  if (!d || typeof d !== 'object') return { issues: [], next: 1 };
  return { issues: Array.isArray(d.issues) ? d.issues : [], next: Number(d.next) || 1 };
}

function issues() {
  return store().issues.slice().sort((a, b) => Number(b.no) - Number(a.no));
}

function published() { return issues().filter(i => i.published); }

function get(no) { return store().issues.find(i => String(i.no) === String(no)) || null; }

function latest() { return published()[0] || null; }

function roman(n) {
  const T = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '', v = Math.max(1, Math.min(3999, Math.floor(Number(n) || 1)));
  T.forEach(([x, s]) => { while (v >= x) { out += s; v -= x; } });
  return out;
}

function shapeItem(x) {
  return {
    section: SECTION[x.section] ? x.section : 'notes',
    head: clean(x.head, 160),
    body: clean(x.body, 1600),
    link: clean(x.link, 240),
    ref: clean(x.ref, 60)
  };
}

function create(b, by, today) {
  const st = store();
  const no = Number(b.no) || st.next;
  const issue = {
    no,
    numeral: roman(no),
    title: clean(b.title, 120) || 'The Provincial Gazette',
    day: clean(b.day, 80) || (today && today.text) || '',
    from: clean(b.from, 20),
    to: clean(b.to, 20),
    lead: clean(b.lead, 1200),
    items: Array.isArray(b.items) ? b.items.map(shapeItem).filter(x => x.head || x.body) : [],
    published: false,
    at: new Date().toISOString(),
    by: (by && by.name) || ''
  };
  S.update(FILE, { issues: [], next: 1 }, d => {
    d.issues = Array.isArray(d.issues) ? d.issues : [];
    d.issues = d.issues.filter(i => Number(i.no) !== no);
    d.issues.push(issue);
    if (d.issues.length > MAX) d.issues.splice(0, d.issues.length - MAX);
    d.next = Math.max(Number(d.next) || 1, no + 1);
  });
  return issue;
}

function update(no, b, by) {
  let out = null;
  S.update(FILE, { issues: [], next: 1 }, d => {
    const i = (d.issues || []).find(x => String(x.no) === String(no));
    if (!i) return;
    if (b.title !== undefined) i.title = clean(b.title, 120) || i.title;
    if (b.day !== undefined) i.day = clean(b.day, 80);
    if (b.lead !== undefined) i.lead = clean(b.lead, 1200);
    if (b.items !== undefined) i.items = (Array.isArray(b.items) ? b.items : []).map(shapeItem).filter(x => x.head || x.body);
    i.editedAt = new Date().toISOString();
    i.editedBy = (by && by.name) || '';
    out = i;
  });
  return out;
}

function publish(no, by, on) {
  let out = null;
  S.update(FILE, { issues: [], next: 1 }, d => {
    const i = (d.issues || []).find(x => String(x.no) === String(no));
    if (!i) return;
    i.published = on !== false;
    i.publishedAt = i.published ? new Date().toISOString() : '';
    i.publishedBy = i.published ? ((by && by.name) || '') : '';
    out = i;
  });
  return out;
}

function remove(no) {
  let gone = null;
  S.update(FILE, { issues: [], next: 1 }, d => {
    const ix = (d.issues || []).findIndex(x => String(x.no) === String(no));
    if (ix < 0) return;
    gone = d.issues[ix];
    d.issues.splice(ix, 1);
  });
  return gone;
}

function nextNo() { return store().next; }

function inRange(iso, from, to) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  const a = Date.parse(from + 'T00:00:00');
  const b = Date.parse(to + 'T23:59:59');
  return (!Number.isFinite(a) || t >= a) && (!Number.isFinite(b) || t <= b);
}

function gather(rows, from, to, extra) {
  const e = extra || {};
  const out = [];
  const seen = new Set();
  const push = (section, head, body, link, ref) => {
    const key = section + '|' + head + '|' + ref;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ section, head, body, link, ref });
  };

  const DEAD = ['Awaiting Seal', 'Returned', 'Revoked', 'Closed', 'Archived'];
  const slug = v => String(v || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  (rows || []).forEach(r => {
    const no = r['Record No'] || '';
    const when = r['Sealed At (UTC)'] || r['Filed At (UTC)'] || '';
    if (!inRange(when, from, to)) return;
    const subject = r.Subject || '';
    const hold = r.Hold ? ` \u00b7 ${r.Hold}` : '';
    const form = String(r.Form || '');
    const kind = String(r.Class || '');
    const open = r.Public === 'Yes';
    const lookup = open && no ? '/records?q=' + encodeURIComponent(no) : '';

    if (form === 'license') {
      if (DEAD.includes(r.Status)) return;
      push('licences', subject || no, `${no}${hold}`, '/licenses#l-' + slug(no), no);
    } else if (/charter|permit/i.test(form + ' ' + kind)) {
      push('licences', subject || no, `${no}${hold}`, lookup, no);
    } else if (open && /notice|proclamation|directive/i.test(form + ' ' + kind)) {
      push('notices', subject || no, `${no}${hold}`, /directive/i.test(form + ' ' + kind) ? '/laws' : '/notices', no);
    } else if (form === 'weekly-return') {
      push('holds', subject || ('Weekly Return' + hold), `${no}${hold}`, '', no);
    } else if (r.Status === 'Sealed' || r['Sealed At (UTC)']) {
      push('sealed', subject || no, `${no}${hold}`, lookup, no);
    }
  });

  (e.roll || []).forEach(x => {
    if (!inRange(x.from, from, to) && !inRange(x.until, from, to)) return;
    if (inRange(x.from, from, to)) push('appointments', `${x.name} takes up ${x.rankName}`, '', '/directory', x.id);
    if (x.until && inRange(x.until, from, to)) push('appointments', `${x.name} lays down ${x.rankName}`, x.why || '', '/directory', x.id + 'u');
  });

  (e.judgments || []).forEach(j => {
    if (!inRange(j.at || j.given, from, to)) return;
    push('judgments', j.title || j.no || 'A judgment', j.summary || '', j.no ? '/justice/judgments' : '', j.no || j.id || '');
  });

  return out;
}

function draftFor(rows, from, to, extra, today, no) {
  const items = gather(rows, from, to, extra);
  return {
    no: no || nextNo(),
    numeral: roman(no || nextNo()),
    title: 'The Provincial Gazette',
    day: (today && today.text) || '',
    from, to,
    lead: '',
    items,
    published: false
  };
}

module.exports = { SECTIONS, SECTION, issues, published, get, latest, create, update, publish, remove, nextNo, gather, draftFor, roman };
