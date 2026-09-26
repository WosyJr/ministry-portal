const S = require('./store');

const CASES = 'justice-cases.json';
const MATTERS = 'justice-matters.json';

const KINDS = [
  { id: 'prosecution', name: 'Prosecution', label: 'Prosecution at the suit of the Empire', accuser: 'Brought by', accused: 'The accused' },
  { id: 'suit', name: 'Suit', label: 'Suit between parties', accuser: 'Complainant', accused: 'Respondent' },
  { id: 'appeal', name: 'Appeal', label: 'Appeal from the court of a Hold', accuser: 'Appellant', accused: 'Court appealed from' },
  { id: 'complaint', name: 'Complaint', label: 'Complaint against an official', accuser: 'Complainant', accused: 'Official complained of' }
];
const KIND_BY_ID = Object.fromEntries(KINDS.map(k => [k.id, k]));

const STATUS = ['Opened', 'Under Inquisition', 'Set for Hearing', 'Heard', 'Judged', 'Dismissed', 'Withdrawn', 'Referred'];
const STATUS_CLASS = { Opened: 'ok', 'Under Inquisition': 'warn', 'Set for Hearing': 'warn', Heard: 'warn', Judged: '', Dismissed: '', Withdrawn: '', Referred: '' };
const CLOSED = ['Judged', 'Dismissed', 'Withdrawn', 'Referred'];

const FINDINGS = ['Guilty', 'Not guilty', 'For the complainant', 'For the respondent', 'Appeal allowed', 'Appeal refused', 'Complaint upheld', 'Complaint not upheld', 'No case to answer'];

const PAPER_KINDS = ['Charge', 'Answer', 'Evidence', 'Witness Statement', 'Inquisitor’s Report', 'Motion', 'Order of the Bench', 'Note'];

const MATTER_KINDS = [
  'A crime to be answered for',
  'A dispute with another party',
  'An appeal from the court of a Hold',
  'A complaint against an official',
  'Other business of the law'
];
const MATTER_STATUS = ['Received', 'Under Consideration', 'Raised to the Bench', 'Answered', 'Declined'];
const MATTER_STATUS_CLASS = { Received: 'ok', 'Under Consideration': 'warn', 'Raised to the Bench': '', Answered: '', Declined: 'warn' };

const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
function roman(n) { let out = '', v = Math.max(1, n); ROMAN.forEach(([k, r]) => { while (v >= k) { out += r; v -= k; } }); return out; }

const clean = (v, max) => String(v ?? '').replace(/[\r\n]/g, ' ').trim().slice(0, max);
const text = (v, max) => String(v ?? '').replace(/\r/g, '').trim().slice(0, max);
const now = () => new Date().toISOString();

function cases() { return S.read(CASES, []); }
function saveCases(l) { S.write(CASES, l); }
function caseGet(id) { return cases().find(c => c.id === id) || null; }
function caseByNo(no) {
  const want = clean(no, 40).toLowerCase().replace(/\s+/g, ' ');
  return cases().find(c => c.no.toLowerCase() === want) || null;
}
function isClosed(c) { return CLOSED.includes(c.status); }
function openCases() { return cases().filter(c => !isClosed(c)).reverse(); }
function judged() { return cases().filter(c => c.status === 'Judged' && c.judgment && c.judgment.given).reverse(); }

function caseOpen(b, by) {
  const kind = KIND_BY_ID[b.kind] ? b.kind : 'suit';
  const subject = clean(b.subject, 160);
  if (!subject) throw new Error('Give the matter a subject.');
  const list = cases();
  const n = list.filter(c => c.kind === kind).length + 1;
  const entry = {
    id: S.id(),
    no: KIND_BY_ID[kind].name + ' ' + roman(n),
    kind, subject,
    accuser: clean(b.accuser, 140),
    accused: clean(b.accused, 140),
    hold: clean(b.hold, 60),
    summary: text(b.summary, 6000),
    status: 'Opened',
    justice: clean(b.justice, 90),
    prosecutor: clean(b.prosecutor, 90),
    advocate: clean(b.advocate, 90),
    clerk: clean(b.clerk, 90),
    fromMatter: clean(b.fromMatter, 40),
    appealOf: clean(b.appealOf, 40),
    offenceId: clean(b.offenceId, 40),
    fromCourt: clean(b.fromCourt, 60),
    plea: '', pleaAt: '', pleaBy: '', pleaNote: '',
    sealed: false, sealedBy: '', sealedAt: '', sealReason: '',
    witnesses: [],
    opened: now(),
    openedBy: (by && by.username) || '',
    openedByName: (by && by.name) || '',
    hearings: [],
    papers: [],
    judgment: null,
    published: false,
    history: [{ at: now(), text: 'The matter was opened upon the bench.', by: (by && by.name) || '' }]
  };
  list.push(entry);
  saveCases(list);
  return entry;
}

function caseLog(c, txt, by) {
  c.history = (c.history || []).concat([{ at: now(), text: txt, by: (by && by.name) || '' }]).slice(-120);
}

function caseUpdate(id, b, by) {
  const list = cases();
  const c = list.find(x => x.id === id);
  if (!c) throw new Error('No matter answers to that.');
  const changes = [];
  const setIf = (k, label, max) => {
    if (b[k] === undefined) return;
    const v = clean(b[k], max);
    if (v !== c[k]) { changes.push(`${label}: ${c[k] || '—'} → ${v || '—'}`); c[k] = v; }
  };
  setIf('justice', 'Justice', 90);
  setIf('prosecutor', 'Prosecutor', 90);
  setIf('advocate', 'Advocate', 90);
  setIf('clerk', 'Clerk', 90);
  setIf('hold', 'Hold', 60);
  setIf('accuser', 'Party', 140);
  setIf('accused', 'Party', 140);
  if (b.summary !== undefined) c.summary = text(b.summary, 6000);
  if (b.status && STATUS.includes(b.status) && b.status !== c.status) {
    changes.push(`Standing: ${c.status} → ${b.status}`);
    c.status = b.status;
  }
  if (b.appealOf !== undefined) c.appealOf = clean(b.appealOf, 40);
  if (b.offenceId !== undefined) c.offenceId = clean(b.offenceId, 40);
  if (b.fromCourt !== undefined) c.fromCourt = clean(b.fromCourt, 60);
  if (b.published !== undefined) c.published = !!b.published;
  if (changes.length) caseLog(c, changes.join(' · '), by);
  saveCases(list);
  return c;
}

function hearingAdd(id, b, by) {
  const list = cases();
  const c = list.find(x => x.id === id);
  if (!c) throw new Error('No matter answers to that.');
  const when = clean(b.when, 80);
  if (!when) throw new Error('Say when the bench will sit.');
  const h = { id: S.id(), when, place: clean(b.place, 120), before: clean(b.before, 90), note: text(b.note, 2000), at: now(), by: (by && by.name) || '' };
  c.hearings = (c.hearings || []).concat([h]);
  if (!CLOSED.includes(c.status)) c.status = 'Set for Hearing';
  caseLog(c, `A hearing is set for ${when}${h.place ? ' at ' + h.place : ''}.`, by);
  saveCases(list);
  return c;
}

function hearingRemove(id, hid) {
  const list = cases();
  const c = list.find(x => x.id === id);
  if (!c) return null;
  c.hearings = (c.hearings || []).filter(h => h.id !== hid);
  saveCases(list);
  return c;
}

function paperAdd(id, b, by) {
  const list = cases();
  const c = list.find(x => x.id === id);
  if (!c) throw new Error('No matter answers to that.');
  const title = clean(b.title, 140);
  if (!title) throw new Error('Give the paper a title.');
  const p = {
    id: S.id(),
    kind: PAPER_KINDS.includes(b.kind) ? b.kind : 'Note',
    title, body: text(b.body, 8000),
    offenceId: clean(b.offenceId, 40),
    by: (by && by.name) || '', at: now()
  };
  c.papers = (c.papers || []).concat([p]);
  caseLog(c, `${p.kind} entered: ${p.title}`, by);
  saveCases(list);
  return c;
}

function paperRemove(id, pid) {
  const list = cases();
  const c = list.find(x => x.id === id);
  if (!c) return null;
  c.papers = (c.papers || []).filter(p => p.id !== pid);
  saveCases(list);
  return c;
}

function judgmentGive(id, b, by) {
  const list = cases();
  const c = list.find(x => x.id === id);
  if (!c) throw new Error('No matter answers to that.');
  const finding = FINDINGS.includes(b.finding) ? b.finding : '';
  if (!finding) throw new Error('Set down the finding of the bench.');
  c.judgment = {
    given: true,
    finding,
    penalty: clean(b.penalty, 200),
    reasons: text(b.reasons, 8000),
    cites: citeList(b.cites),
    code: (c.judgment && c.judgment.code) || mintCode(),
    by: (by && by.name) || '',
    at: now()
  };
  c.status = 'Judged';
  c.published = !!b.published;
  caseLog(c, `Judgment given: ${finding}${c.judgment.penalty ? ' — ' + c.judgment.penalty : ''}.`, by);
  saveCases(list);
  return c;
}

function caseRemove(id) { saveCases(cases().filter(c => c.id !== id)); }

function matters() { return S.read(MATTERS, []); }
function matterGet(id) { return matters().find(m => m.id === id) || null; }
function matterByNo(no) {
  const want = clean(no, 40).toLowerCase().replace(/\s+/g, ' ');
  return matters().find(m => m.no.toLowerCase() === want) || null;
}
function mattersWaiting() { return matters().filter(m => m.status === 'Received' || m.status === 'Under Consideration'); }

function matterAdd(b) {
  const name = clean(b.name, 90);
  const subject = clean(b.subject, 160);
  const body = text(b.body, 6000);
  if (!name) throw new Error('Set down your name.');
  if (!subject) throw new Error('Give your matter a subject.');
  if (body.length < 10) throw new Error('Set down the matter itself.');
  const list = matters();
  if (list.length >= 2000) throw new Error('The office is full. Seek out a Court Clerk instead.');
  const entry = {
    id: S.id(),
    no: 'Matter ' + roman(list.length + 1),
    name, style: clean(b.style, 90), hold: clean(b.hold, 60), where: clean(b.where, 140),
    against: clean(b.against, 140),
    kind: MATTER_KINDS.includes(b.kind) ? b.kind : 'Other business of the law',
    subject, body,
    at: now(), status: 'Received', reply: '', handledBy: '', handledAt: '', caseNo: '', code: mintCode()
  };
  list.push(entry);
  S.write(MATTERS, list);
  return entry;
}

function matterHandle(id, b, by) {
  const list = matters();
  const m = list.find(x => x.id === id);
  if (!m) throw new Error('No matter answers to that.');
  if (b.status && MATTER_STATUS.includes(b.status)) m.status = b.status;
  if (b.reply !== undefined) m.reply = text(b.reply, 4000);
  if (b.caseNo !== undefined) m.caseNo = clean(b.caseNo, 40);
  m.handledBy = (by && by.name) || m.handledBy;
  m.handledAt = now();
  S.write(MATTERS, list);
  return m;
}

function matterRemove(id) { S.write(MATTERS, matters().filter(m => m.id !== id)); }

function tallies() {
  const list = cases();
  return {
    open: list.filter(c => !isClosed(c)).length,
    hearing: list.filter(c => c.status === 'Set for Hearing').length,
    judged: list.filter(c => c.status === 'Judged').length,
    total: list.length,
    waiting: mattersWaiting().length
  };
}

const OFFENCES = 'justice-offences.json';
const WARRANTS = 'justice-warrants.json';

const OFFENCE_CLASSES = ['Against the person', 'Against property', 'Against the peace', 'Against the Empire', 'Of office', 'Of the law itself'];
const GRAVITY = ['Minor', 'Grave', 'Capital'];

const SEED_OFFENCES = [
  { name: 'Theft', cls: 'Against property', gravity: 'Minor', authority: 'Imperial Penal Code, on the taking of goods', penalty: 'Restitution and a fine to twice the value; gaol for a repeated hand.' },
  { name: 'Assault', cls: 'Against the person', gravity: 'Grave', authority: 'Imperial Penal Code, on violence to the person', penalty: 'A fine, amends to the injured, and gaol at the discretion of the bench.' },
  { name: 'Murder', cls: 'Against the person', gravity: 'Capital', authority: 'Imperial Penal Code, on the unlawful killing', penalty: 'Death, or life at hard labour where the bench finds cause to spare.' },
  { name: 'Banditry upon the roads', cls: 'Against the peace', gravity: 'Capital', authority: 'Lex Viarum, on the keeping of the Imperial roads', penalty: 'Death or hard labour, and forfeiture of all taken.' },
  { name: 'Sedition', cls: 'Against the Empire', gravity: 'Capital', authority: 'Imperial Penal Code, on words and acts against the Empire', penalty: 'At the pleasure of the bench, to death where arms were raised.' },
  { name: 'Smuggling', cls: 'Against the Empire', gravity: 'Grave', authority: 'Imperial Customs Ordinance', penalty: 'Forfeiture of the goods and a fine to thrice their value.' },
  { name: 'Corruption in office', cls: 'Of office', gravity: 'Grave', authority: 'Codex Officiorum Provinciae, on the duty of officers', penalty: 'Removal from office, restitution, and a bar from Imperial service.' },
  { name: 'False witness', cls: 'Of the law itself', gravity: 'Grave', authority: 'Imperial Penal Code, on the giving of testimony', penalty: 'The penalty the accused would have borne, and a bar from the courts.' },
  { name: 'Contempt of the bench', cls: 'Of the law itself', gravity: 'Minor', authority: 'Standing orders of the Judicial Office', penalty: 'A fine, or confinement until the sitting is done.' },
  { name: 'Breach of the peace', cls: 'Against the peace', gravity: 'Minor', authority: 'Imperial Penal Code, on public order', penalty: 'A fine, or binding over to keep the peace.' }
];

function offences() {
  const l = S.read(OFFENCES, null);
  if (l === null) return S.write(OFFENCES, SEED_OFFENCES.map(o => ({ id: S.id(), ...o, note: '' })));
  return l;
}
function offenceGet(id) { return offences().find(o => o.id === id) || null; }
function offenceSave(id, b) {
  const list = offences();
  let o = id ? list.find(x => x.id === id) : null;
  const name = clean(b.name, 90);
  if (!name) throw new Error('Give the offence a name.');
  const fields = {
    name,
    cls: OFFENCE_CLASSES.includes(b.cls) ? b.cls : 'Against the peace',
    gravity: GRAVITY.includes(b.gravity) ? b.gravity : 'Minor',
    authority: clean(b.authority, 160),
    penalty: text(b.penalty, 500),
    note: text(b.note, 800)
  };
  if (o) Object.assign(o, fields);
  else { o = { id: S.id(), ...fields }; list.push(o); }
  S.write(OFFENCES, list);
  return o;
}
function offenceRemove(id) { S.write(OFFENCES, offences().filter(o => o.id !== id)); }

const WARRANT_KINDS = ['Arrest', 'Search', 'Summons', 'Seizure', 'Release'];
const WARRANT_STATUS = ['Issued', 'Served', 'Executed', 'Returned unserved', 'Recalled'];
const WARRANT_CLASS = { Issued: 'warn', Served: 'ok', Executed: '', 'Returned unserved': 'warn', Recalled: '' };

function warrants() { return S.read(WARRANTS, []); }
function warrantGet(id) { return warrants().find(w => w.id === id) || null; }
function warrantsFor(caseId) { return warrants().filter(w => w.caseId === caseId).reverse(); }
function warrantsOpen() { return warrants().filter(w => w.status === 'Issued').reverse(); }

function warrantIssue(b, by) {
  const kind = WARRANT_KINDS.includes(b.kind) ? b.kind : 'Arrest';
  const against = clean(b.against, 140);
  if (!against) throw new Error('Name who or what the warrant runs against.');
  const reason = text(b.reason, 2000);
  if (!reason) throw new Error('Set down the ground of the warrant.');
  const list = warrants();
  const n = list.filter(w => w.kind === kind).length + 1;
  const c = b.caseId ? caseGet(b.caseId) : null;
  const entry = {
    id: S.id(),
    no: 'Warrant of ' + kind + ' ' + roman(n),
    kind, against, reason,
    hold: clean(b.hold, 60),
    caseId: c ? c.id : '',
    caseNo: c ? c.no : '',
    toWhom: clean(b.toWhom, 120),
    expires: clean(b.expires, 80),
    status: 'Issued',
    code: mintCode(),
    issuedBy: (by && by.name) || '',
    issuedAt: now(),
    servedBy: '', servedAt: '', note: ''
  };
  list.push(entry);
  S.write(WARRANTS, list);
  if (c) {
    const all = cases();
    const target = all.find(x => x.id === c.id);
    if (target) { caseLog(target, `${entry.no} issued against ${against}.`, by); saveCases(all); }
  }
  return entry;
}

function warrantUpdate(id, b, by) {
  const list = warrants();
  const w = list.find(x => x.id === id);
  if (!w) throw new Error('No warrant answers to that.');
  if (b.status && WARRANT_STATUS.includes(b.status)) w.status = b.status;
  if (b.note !== undefined) w.note = text(b.note, 1000);
  if (b.servedBy !== undefined) w.servedBy = clean(b.servedBy, 120);
  if (w.status !== 'Issued' && !w.servedAt) w.servedAt = now();
  S.write(WARRANTS, list);
  return w;
}
function warrantRemove(id) { S.write(WARRANTS, warrants().filter(w => w.id !== id)); }

function calendar() {
  const out = [];
  cases().forEach(c => {
    (c.hearings || []).forEach(h => out.push({
      caseId: c.id, no: c.no, subject: c.subject, kind: c.kind, status: c.status,
      sealed: !!c.sealed, accuser: c.accuser, accused: c.accused, hold: c.hold,
      when: h.when, place: h.place, before: h.before, note: h.note, set: h.at
    }));
  });
  return out.sort((a, b) => String(b.set).localeCompare(String(a.set)));
}

const CUSTODY = 'justice-custody.json';
const INQUISITIONS = 'justice-inquisitions.json';

const CUSTODY_STATUS = ['Held', 'Released', 'Bailed', 'Sentenced', 'Transferred', 'Escaped'];
const CUSTODY_CLASS = { Held: 'warn', Released: 'ok', Bailed: 'ok', Sentenced: '', Transferred: '', Escaped: 'bad' };

function custody() { return S.read(CUSTODY, []); }
function custodyGet(id) { return custody().find(x => x.id === id) || null; }
function custodyHeld() { return custody().filter(x => x.status === 'Held'); }
function custodyFor(name) {
  const w = clean(name, 140).toLowerCase();
  return w ? custody().filter(x => x.name.toLowerCase() === w).reverse() : [];
}

function custodyCommit(b, by) {
  const name = clean(b.name, 140);
  if (!name) throw new Error('Name who is held.');
  const list = custody();
  const entry = {
    id: S.id(),
    no: 'Custody ' + roman(list.length + 1),
    name,
    place: clean(b.place, 120),
    hold: clean(b.hold, 60),
    warrantNo: clean(b.warrantNo, 40),
    caseNo: clean(b.caseNo, 40),
    since: clean(b.since, 80),
    until: clean(b.until, 80),
    keeper: clean(b.keeper, 120),
    status: CUSTODY_STATUS.includes(b.status) ? b.status : 'Held',
    note: text(b.note, 1500),
    code: mintCode(),
    bailSurety: '', bailSum: '', bailTerms: '', bailAt: '',
    by: (by && by.name) || '', at: now()
  };
  list.push(entry);
  S.write(CUSTODY, list);
  return entry;
}

function custodyUpdate(id, b, by) {
  const list = custody();
  const c = list.find(x => x.id === id);
  if (!c) throw new Error('No one answers to that in the register.');
  if (b.status && CUSTODY_STATUS.includes(b.status)) c.status = b.status;
  ['place', 'hold', 'until', 'keeper', 'warrantNo', 'caseNo', 'bailSurety', 'bailSum'].forEach(k => { if (b[k] !== undefined) c[k] = clean(b[k], 140); });
  if (b.bailTerms !== undefined) c.bailTerms = text(b.bailTerms, 1000);
  if (c.status === 'Bailed' && !c.bailAt) c.bailAt = now();
  if (b.note !== undefined) c.note = text(b.note, 1500);
  c.by = (by && by.name) || c.by;
  S.write(CUSTODY, list);
  return c;
}

function custodyRemove(id) { S.write(CUSTODY, custody().filter(x => x.id !== id)); }

const INQ_STATUS = ['Open', 'Gathering', 'Reported', 'Closed', 'Abandoned'];
const INQ_CLASS = { Open: 'ok', Gathering: 'warn', Reported: '', Closed: '', Abandoned: 'warn' };

function inquisitions() { return S.read(INQUISITIONS, []); }
function inqGet(id) { return inquisitions().find(i => i.id === id) || null; }
function inqOpenList() { return inquisitions().filter(i => i.status !== 'Closed' && i.status !== 'Abandoned').reverse(); }
function inqForCase(caseNo) { const w = clean(caseNo, 40).toLowerCase(); return w ? inquisitions().filter(i => (i.caseNo || '').toLowerCase() === w) : []; }

function inqOpen(b, by) {
  const subject = clean(b.subject, 160);
  if (!subject) throw new Error('Give the inquisition a subject.');
  const list = inquisitions();
  const entry = {
    id: S.id(),
    no: 'Inquisition ' + roman(list.length + 1),
    subject,
    into: clean(b.into, 140),
    caseNo: clean(b.caseNo, 40),
    hold: clean(b.hold, 60),
    status: 'Open',
    scope: text(b.scope, 3000),
    lines: [], statements: [],
    report: '', conclusion: '',
    by: (by && by.username) || '', byName: (by && by.name) || '',
    at: now()
  };
  list.push(entry);
  S.write(INQUISITIONS, list);
  return entry;
}

function inqUpdate(id, b, by) {
  const list = inquisitions();
  const i = list.find(x => x.id === id);
  if (!i) throw new Error('No inquisition answers to that.');
  if (b.status && INQ_STATUS.includes(b.status)) i.status = b.status;
  ['into', 'caseNo', 'hold'].forEach(k => { if (b[k] !== undefined) i[k] = clean(b[k], 140); });
  if (b.scope !== undefined) i.scope = text(b.scope, 3000);
  if (b.report !== undefined) i.report = text(b.report, 8000);
  if (b.conclusion !== undefined) i.conclusion = clean(b.conclusion, 300);
  S.write(INQUISITIONS, list);
  return i;
}

function inqLineAdd(id, b) {
  const list = inquisitions();
  const i = list.find(x => x.id === id);
  if (!i) throw new Error('No inquisition answers to that.');
  const q = clean(b.line, 300);
  if (!q) throw new Error('Set down the line of inquiry.');
  i.lines = (i.lines || []).concat([{ id: S.id(), line: q, answer: text(b.answer, 2000), at: now() }]);
  S.write(INQUISITIONS, list);
  return i;
}

function inqLineRemove(id, lid) {
  const list = inquisitions();
  const i = list.find(x => x.id === id);
  if (!i) return null;
  i.lines = (i.lines || []).filter(l => l.id !== lid);
  S.write(INQUISITIONS, list);
  return i;
}

function inqStatementAdd(id, b, by) {
  const list = inquisitions();
  const i = list.find(x => x.id === id);
  if (!i) throw new Error('No inquisition answers to that.');
  const from = clean(b.from, 140);
  if (!from) throw new Error('Name who gave the statement.');
  i.statements = (i.statements || []).concat([{
    id: S.id(), from, standing: clean(b.standing, 120),
    body: text(b.body, 6000), taken: clean(b.taken, 80),
    by: (by && by.name) || '', at: now()
  }]);
  if (i.status === 'Open') i.status = 'Gathering';
  S.write(INQUISITIONS, list);
  return i;
}

function inqStatementRemove(id, sid) {
  const list = inquisitions();
  const i = list.find(x => x.id === id);
  if (!i) return null;
  i.statements = (i.statements || []).filter(x => x.id !== sid);
  S.write(INQUISITIONS, list);
  return i;
}

function inqRemove(id) { S.write(INQUISITIONS, inquisitions().filter(i => i.id !== id)); }

function partyNames() {
  const seen = new Map();
  const add = n => { const k = clean(n, 140); if (!k) return; const low = k.toLowerCase(); if (!seen.has(low)) seen.set(low, k); };
  cases().forEach(c => { add(c.accuser); add(c.accused); });
  warrants().forEach(w => add(w.against));
  custody().forEach(x => add(x.name));
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}

function partyRecord(name) {
  const w = clean(name, 140).toLowerCase();
  if (!w) return null;
  const mine = cases().filter(c => String(c.accuser).toLowerCase() === w || String(c.accused).toLowerCase() === w);
  const asAccused = mine.filter(c => String(c.accused).toLowerCase() === w);
  return {
    name: (cases().find(c => String(c.accuser).toLowerCase() === w) || {}).accuser
      || (cases().find(c => String(c.accused).toLowerCase() === w) || {}).accused
      || (warrants().find(x => String(x.against).toLowerCase() === w) || {}).against
      || (custody().find(x => String(x.name).toLowerCase() === w) || {}).name
      || name,
    cases: mine.slice().reverse(),
    asAccused: asAccused.length,
    findings: mine.filter(c => c.judgment && c.judgment.given).map(c => ({ no: c.no, id: c.id, finding: c.judgment.finding, at: c.judgment.at, penalty: c.judgment.penalty })).reverse(),
    warrants: warrants().filter(x => String(x.against).toLowerCase() === w).reverse(),
    custody: custody().filter(x => String(x.name).toLowerCase() === w).reverse()
  };
}

function appealedIn(caseNo) {
  const w = clean(caseNo, 40).toLowerCase();
  return w ? cases().filter(c => String(c.appealOf || '').toLowerCase() === w) : [];
}

function judgedCases() { return cases().filter(c => c.judgment && c.judgment.given).reverse(); }


// ---------------------------------------------------------------------------
// Check-numbers: every paper the Ministry hands out carries one, so a person
// holding it can be told whether it is genuine and what standing it has.
// ---------------------------------------------------------------------------

const CODE_ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY34679';
function mintCode() {
  let out = '';
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return out.slice(0, 3) + '-' + out.slice(3);
}
function normCode(v) {
  const raw = String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return raw.length === 6 ? raw.slice(0, 3) + '-' + raw.slice(3) : '';
}

// Papers made before check-numbers existed are given one the first time they
// are looked at, so nothing on the rolls is left unverifiable.
function ensureCodes() {
  let w = warrants(), touched = false;
  w.forEach(x => { if (!x.code) { x.code = mintCode(); touched = true; } });
  if (touched) S.write(WARRANTS, w);
  let cu = custody(); touched = false;
  cu.forEach(x => { if (!x.code) { x.code = mintCode(); touched = true; } });
  if (touched) S.write(CUSTODY, cu);
  let m = matters(); touched = false;
  m.forEach(x => { if (!x.code) { x.code = mintCode(); touched = true; } });
  if (touched) S.write(MATTERS, m);
  let ex = exhibits(); touched = false;
  ex.forEach(e => { if (!e.code) { e.code = mintCode(); touched = true; } });
  if (touched) S.write(EXHIBITS, ex);
  let sn = sentences(); touched = false;
  sn.forEach(v => { if (!v.code) { v.code = mintCode(); touched = true; } });
  if (touched) S.write(SENTENCES, sn);
  let cs = cases(); touched = false;
  cs.forEach(c => {
    if (c.judgment && c.judgment.given && !c.judgment.code) { c.judgment.code = mintCode(); touched = true; }
    (c.witnesses || []).forEach(w2 => { if (!w2.code) { w2.code = mintCode(); touched = true; } });
  });
  if (touched) saveCases(cs);
}

function verify(code) {
  const want = normCode(code);
  if (!want) return null;
  ensureCodes();
  const w = warrants().find(x => x.code === want);
  if (w) return {
    found: true, kind: 'A warrant of the Imperial Bench', no: w.no, code: want,
    standing: w.status, inForce: w.status === 'Issued' || w.status === 'Served',
    rows: [['Warrant', w.no], ['Of', w.kind], ['Against', w.against], w.hold && ['Within the Hold of', w.hold],
      ['Issued by', w.issuedBy], ['Issued', shortDate(w.issuedAt)], w.expires && ['Runs until', w.expires], ['Standing', w.status]]
  };
  const sx = sentences().find(v => v.code === want);
  if (sx) return {
    found: true, kind: 'An order of the Imperial Bench', no: sx.no, code: want,
    standing: sx.status, inForce: sx.status === 'Ordered' || sx.status === 'With the Provost',
    rows: [['Order', sx.no], ['Upon', sx.who], ['Sentence', sx.kind], sx.term && ['Term', sx.term], sx.caseNo && ['Upon the matter', sx.caseNo], ['Standing', sx.status]]
  };
  const ex = exhibits().find(v => v.code === want);
  if (ex) return {
    found: true, kind: 'A receipt of the Ministry of Justice', no: ex.no, code: want,
    standing: ex.status, inForce: ex.status === 'Held' || ex.status === 'Produced before the bench',
    rows: [['Receipt', ex.no], ['What was taken', ex.what], ex.takenFrom && ['Taken from', ex.takenFrom], ex.caseNo && ['Upon the matter', ex.caseNo], ['Standing', ex.status]]
  };
  const x = custody().find(v => v.code === want);
  if (x) return {
    found: true, kind: 'An order of custody', no: x.no, code: want,
    standing: x.status, inForce: x.status === 'Held',
    rows: [['Order', x.no], ['Who is held', x.name], x.place && ['Held at', x.place], x.caseNo && ['Upon the matter', x.caseNo], x.since && ['Since', x.since], ['Standing', x.status]]
  };
  const c = cases().find(v => v.judgment && v.judgment.code === want);
  if (c) return {
    found: true, kind: 'A judgment of the Imperial Bench', no: c.no, code: want,
    standing: c.sealed ? 'Sealed by order of the bench' : 'Given', inForce: true, sealed: !!c.sealed,
    rows: c.sealed
      ? [['Judgment upon', c.no], ['Standing', 'Sealed by order of the bench'], ['Given', shortDate(c.judgment.at)]]
      : [['Judgment upon', c.no], ['The matter', c.subject], ['Finding', c.judgment.finding],
         c.judgment.penalty && ['Order of the bench', c.judgment.penalty], ['Given by', c.judgment.by], ['Given', shortDate(c.judgment.at)]]
  };
  for (const c2 of cases()) {
    const wit = (c2.witnesses || []).find(v => v.code === want);
    if (wit) return {
      found: true, kind: 'A summons of a witness', no: c2.no, code: want,
      standing: isClosed(c2) ? 'The matter is done with' : 'Standing', inForce: !isClosed(c2), sealed: !!c2.sealed,
      rows: c2.sealed
        ? [['Summons upon', c2.no], ['Witness', wit.name], ['Standing', 'Sealed by order of the bench']]
        : [['Summons upon', c2.no], ['The matter', c2.subject], ['Witness', wit.name],
           wit.forWhom && ['Called by', wit.forWhom], wit.called && ['To attend', wit.called], ['Standing of the matter', c2.status]]
    };
  }
  const m = matters().find(v => v.code === want);
  if (m) return {
    found: true, kind: 'A paper of the Ministry of Justice', no: m.no, code: want,
    standing: m.status, inForce: true,
    rows: [['Matter', m.no], ['Brought by', m.name], ['Subject', m.subject], ['Standing', m.status], m.caseNo && ['Raised to the bench as', m.caseNo]]
  };
  return { found: false, code: want };
}
function shortDate(iso) { try { return new Date(iso).toISOString().slice(0, 10); } catch (_) { return ''; } }

// ---------------------------------------------------------------------------
// The plea, the seal, and the witnesses upon a matter
// ---------------------------------------------------------------------------

const PLEAS = ['Guilty', 'Not guilty', 'Guilty in part', 'Stood mute', 'No plea required'];

function pleaEnter(id, b, by) {
  const list = cases();
  const c = list.find(x => x.id === id);
  if (!c) throw new Error('No matter answers to that.');
  const plea = PLEAS.includes(b.plea) ? b.plea : '';
  if (!plea) throw new Error('Set down how the accused answers.');
  c.plea = plea;
  c.pleaNote = text(b.pleaNote, 1000);
  c.pleaAt = now();
  c.pleaBy = (by && by.name) || '';
  caseLog(c, `The accused answers: ${plea}.`, by);
  saveCases(list);
  return c;
}

function sealSet(id, b, by) {
  const list = cases();
  const c = list.find(x => x.id === id);
  if (!c) throw new Error('No matter answers to that.');
  const want = !!b.sealed;
  if (want === !!c.sealed) return c;
  c.sealed = want;
  c.sealReason = want ? clean(b.sealReason, 200) : '';
  c.sealedBy = want ? ((by && by.name) || '') : '';
  c.sealedAt = want ? now() : '';
  caseLog(c, want ? 'The matter is sealed by order of the bench.' : 'The seal is lifted.', by);
  saveCases(list);
  return c;
}

function witnessAdd(id, b, by) {
  const list = cases();
  const c = list.find(x => x.id === id);
  if (!c) throw new Error('No matter answers to that.');
  const name = clean(b.name, 140);
  if (!name) throw new Error('Name the witness.');
  c.witnesses = (c.witnesses || []).concat([{
    id: S.id(), name,
    standing: clean(b.standing, 120),
    forWhom: clean(b.forWhom, 90),
    called: clean(b.called, 80),
    note: text(b.note, 1500),
    sworn: false,
    code: mintCode(),
    by: (by && by.name) || '', at: now()
  }]);
  caseLog(c, `${name} is called as a witness.`, by);
  saveCases(list);
  return c;
}

function witnessUpdate(id, wid, b, by) {
  const list = cases();
  const c = list.find(x => x.id === id);
  if (!c) throw new Error('No matter answers to that.');
  const w = (c.witnesses || []).find(x => x.id === wid);
  if (!w) throw new Error('No such witness.');
  ['standing', 'forWhom', 'called'].forEach(k => { if (b[k] !== undefined) w[k] = clean(b[k], 140); });
  if (b.note !== undefined) w.note = text(b.note, 1500);
  if (b.sworn !== undefined) w.sworn = !!b.sworn;
  saveCases(list);
  return c;
}

function witnessRemove(id, wid) {
  const list = cases();
  const c = list.find(x => x.id === id);
  if (!c) return null;
  c.witnesses = (c.witnesses || []).filter(w => w.id !== wid);
  saveCases(list);
  return c;
}

// Judgments cited as authority in a later judgment.
function citeList(v) {
  return [].concat(v || []).map(x => clean(x, 40)).filter(Boolean).slice(0, 12);
}
function citedBy(no) {
  const w = clean(no, 40).toLowerCase();
  if (!w) return [];
  return cases().filter(c => c.judgment && (c.judgment.cites || []).some(x => String(x).toLowerCase() === w)).reverse();
}
function citable(exceptId) {
  return cases().filter(c => c.judgment && c.judgment.given && !c.sealed && c.id !== exceptId)
    .map(c => ({ no: c.no, subject: c.subject, finding: c.judgment.finding }))
    .reverse();
}

// ---------------------------------------------------------------------------
// The courts of the Holds
// ---------------------------------------------------------------------------

const HOLDCOURTS = 'justice-holdcourts.json';
const SEED_COURTS = [
  { hold: 'Haafingar', court: 'The Court of Solitude', seat: 'Solitude', justice: '', note: 'Sits within the Blue Palace precinct.' },
  { hold: 'Eastmarch', court: 'The Court of Windhelm', seat: 'Windhelm', justice: '', note: '' },
  { hold: 'Whiterun', court: 'The Court of Whiterun', seat: 'Whiterun', justice: '', note: '' },
  { hold: 'The Reach', court: 'The Court of Markarth', seat: 'Markarth', justice: '', note: '' },
  { hold: 'The Rift', court: 'The Court of Riften', seat: 'Riften', justice: '', note: '' },
  { hold: 'Falkreath', court: 'The Court of Falkreath', seat: 'Falkreath', justice: '', note: '' },
  { hold: 'Hjaalmarch', court: 'The Court of Morthal', seat: 'Morthal', justice: '', note: '' },
  { hold: 'The Pale', court: 'The Court of Dawnstar', seat: 'Dawnstar', justice: '', note: '' },
  { hold: 'Winterhold', court: 'The Court of Winterhold', seat: 'Winterhold', justice: '', note: '' }
];

function holdCourts() {
  const l = S.read(HOLDCOURTS, null);
  if (l === null) return S.write(HOLDCOURTS, SEED_COURTS.map(c => ({ id: S.id(), ...c })));
  return l;
}
function holdCourtGet(id) { return holdCourts().find(c => c.id === id) || null; }
function holdCourtSave(id, b) {
  const list = holdCourts();
  let c = id ? list.find(x => x.id === id) : null;
  const court = clean(b.court, 120);
  if (!court) throw new Error('Give the court a name.');
  const fields = {
    court, hold: clean(b.hold, 60), seat: clean(b.seat, 90),
    justice: clean(b.justice, 120), note: text(b.note, 800)
  };
  if (c) Object.assign(c, fields);
  else { c = { id: S.id(), ...fields }; list.push(c); }
  S.write(HOLDCOURTS, list);
  return c;
}
function holdCourtRemove(id) { S.write(HOLDCOURTS, holdCourts().filter(c => c.id !== id)); }
function appealsFrom(court) {
  const w = clean(court, 60).toLowerCase();
  return w ? cases().filter(c => String(c.fromCourt || '').toLowerCase() === w).reverse() : [];
}

// ---------------------------------------------------------------------------
// Evidence and exhibits
// ---------------------------------------------------------------------------

const EXHIBITS = 'justice-exhibits.json';
const EXHIBIT_STATUS = ['Held', 'Produced before the bench', 'Returned', 'Forfeit to the Empire', 'Destroyed', 'Lost'];
const EXHIBIT_CLASS = { Held: 'warn', 'Produced before the bench': 'ok', Returned: 'ok', 'Forfeit to the Empire': '', Destroyed: '', Lost: 'bad' };

function exhibits() { return S.read(EXHIBITS, []); }
function exhibitGet(id) { return exhibits().find(e => e.id === id) || null; }
function exhibitsFor(caseNo) {
  const w = clean(caseNo, 40).toLowerCase();
  return w ? exhibits().filter(e => String(e.caseNo || '').toLowerCase() === w) : [];
}

function exhibitTake(b, by) {
  const what = clean(b.what, 160);
  if (!what) throw new Error('Say what was taken.');
  const list = exhibits();
  const entry = {
    id: S.id(),
    no: 'Exhibit ' + roman(list.length + 1),
    what,
    caseNo: clean(b.caseNo, 40),
    warrantNo: clean(b.warrantNo, 40),
    takenFrom: clean(b.takenFrom, 140),
    takenBy: clean(b.takenBy, 140),
    takenAt: clean(b.takenAt, 80),
    where: clean(b.where, 140),
    holder: clean(b.holder, 140),
    status: EXHIBIT_STATUS.includes(b.status) ? b.status : 'Held',
    note: text(b.note, 1500),
    chain: [],
    code: mintCode(),
    by: (by && by.name) || '', at: now()
  };
  entry.chain.push({ id: S.id(), at: now(), text: `Taken into the keeping of the Ministry${entry.holder ? ' by ' + entry.holder : ''}.`, by: (by && by.name) || '' });
  list.push(entry);
  S.write(EXHIBITS, list);
  return entry;
}

function exhibitUpdate(id, b, by) {
  const list = exhibits();
  const e = list.find(x => x.id === id);
  if (!e) throw new Error('No exhibit answers to that.');
  const wasHolder = e.holder, wasStatus = e.status;
  if (b.status && EXHIBIT_STATUS.includes(b.status)) e.status = b.status;
  ['caseNo', 'warrantNo', 'where', 'holder'].forEach(k => { if (b[k] !== undefined) e[k] = clean(b[k], 140); });
  if (b.note !== undefined) e.note = text(b.note, 1500);
  const moves = [];
  if (e.holder !== wasHolder) moves.push(`Passed from ${wasHolder || 'the Ministry'} to ${e.holder || 'the Ministry'}.`);
  if (e.status !== wasStatus) moves.push(`Set down as ${e.status}.`);
  if (moves.length) e.chain = (e.chain || []).concat([{ id: S.id(), at: now(), text: moves.join(' '), by: (by && by.name) || '' }]).slice(-60);
  S.write(EXHIBITS, list);
  return e;
}

function exhibitRemove(id) { S.write(EXHIBITS, exhibits().filter(e => e.id !== id)); }

// ---------------------------------------------------------------------------
// Fines and restitution: what the bench ordered, and what has been rendered
// ---------------------------------------------------------------------------

const DUES = 'justice-dues.json';
const DUE_KINDS = ['Fine to the Empire', 'Restitution to the injured', 'Costs of the court', 'Amends', 'Forfeiture'];

function dues() { return S.read(DUES, []); }
function dueGet(id) { return dues().find(d => d.id === id) || null; }
function duesFor(caseNo) {
  const w = clean(caseNo, 40).toLowerCase();
  return w ? dues().filter(d => String(d.caseNo || '').toLowerCase() === w) : [];
}
function paidOf(d) { return (d.payments || []).reduce((n, p) => n + Number(p.amount || 0), 0); }
function owingOf(d) { return Math.max(0, Number(d.amount || 0) - paidOf(d)); }
function dueStanding(d) {
  if (d.remitted) return 'Remitted';
  if (owingOf(d) <= 0) return 'Satisfied';
  return paidOf(d) > 0 ? 'Part rendered' : 'Outstanding';
}
const DUE_CLASS = { Satisfied: 'ok', 'Part rendered': 'warn', Outstanding: 'bad', Remitted: '' };

function dueOrder(b, by) {
  const who = clean(b.who, 140);
  if (!who) throw new Error('Name who owes it.');
  const amount = Math.max(0, Math.round(Number(b.amount || 0)));
  if (!amount) throw new Error('Set down the sum.');
  const list = dues();
  const entry = {
    id: S.id(),
    no: 'Due ' + roman(list.length + 1),
    who,
    kind: DUE_KINDS.includes(b.kind) ? b.kind : 'Fine to the Empire',
    amount,
    toWhom: clean(b.toWhom, 140),
    caseNo: clean(b.caseNo, 40),
    due: clean(b.due, 80),
    note: text(b.note, 1000),
    payments: [],
    remitted: false,
    by: (by && by.name) || '', at: now()
  };
  list.push(entry);
  S.write(DUES, list);
  return entry;
}

function dueRender(id, b, by) {
  const list = dues();
  const d = list.find(x => x.id === id);
  if (!d) throw new Error('No sum answers to that.');
  const amount = Math.max(0, Math.round(Number(b.amount || 0)));
  if (!amount) throw new Error('Set down what was rendered.');
  d.payments = (d.payments || []).concat([{
    id: S.id(), amount, at: now(),
    when: clean(b.when, 80),
    note: clean(b.note, 200),
    by: (by && by.name) || ''
  }]);
  S.write(DUES, list);
  return d;
}

function dueUpdate(id, b, by) {
  const list = dues();
  const d = list.find(x => x.id === id);
  if (!d) throw new Error('No sum answers to that.');
  if (b.remitted !== undefined) d.remitted = !!b.remitted;
  if (b.due !== undefined) d.due = clean(b.due, 80);
  if (b.note !== undefined) d.note = text(b.note, 1000);
  S.write(DUES, list);
  return d;
}

function duePaymentRemove(id, pid) {
  const list = dues();
  const d = list.find(x => x.id === id);
  if (!d) return null;
  d.payments = (d.payments || []).filter(p => p.id !== pid);
  S.write(DUES, list);
  return d;
}

function dueRemove(id) { S.write(DUES, dues().filter(d => d.id !== id)); }

function duesTotals() {
  const l = dues().filter(d => !d.remitted);
  return {
    ordered: l.reduce((n, d) => n + Number(d.amount || 0), 0),
    rendered: l.reduce((n, d) => n + paidOf(d), 0),
    outstanding: l.reduce((n, d) => n + owingOf(d), 0),
    count: l.filter(d => owingOf(d) > 0).length
  };
}

// ---------------------------------------------------------------------------
// Carrying out sentence: ordered by the bench, sent to the Provost, returned
// ---------------------------------------------------------------------------

const SENTENCES = 'justice-sentences.json';
const SENTENCE_KINDS = ['Gaol', 'Hard labour', 'Fine levied by distraint', 'Corporal punishment', 'Banishment from the Hold', 'Bound over to keep the peace', 'Forfeiture', 'Death'];
const SENTENCE_STATUS = ['Ordered', 'With the Provost', 'Carried out', 'Stayed by the bench', 'Remitted', 'Could not be carried out'];
const SENTENCE_CLASS = { Ordered: 'warn', 'With the Provost': 'warn', 'Carried out': 'ok', 'Stayed by the bench': '', Remitted: '', 'Could not be carried out': 'bad' };

function sentences() { return S.read(SENTENCES, []); }
function sentenceGet(id) { return sentences().find(x => x.id === id) || null; }
function sentencesFor(caseNo) {
  const w = clean(caseNo, 40).toLowerCase();
  return w ? sentences().filter(x => String(x.caseNo || '').toLowerCase() === w) : [];
}
function sentencesWithProvost() { return sentences().filter(x => x.status === 'With the Provost').reverse(); }

function sentenceOrder(b, by) {
  const who = clean(b.who, 140);
  if (!who) throw new Error('Name who is sentenced.');
  const sentence = text(b.sentence, 1000);
  if (!sentence) throw new Error('Set down the sentence.');
  const list = sentences();
  const entry = {
    id: S.id(),
    no: 'Sentence ' + roman(list.length + 1),
    who, sentence,
    kind: SENTENCE_KINDS.includes(b.kind) ? b.kind : 'Gaol',
    caseNo: clean(b.caseNo, 40),
    hold: clean(b.hold, 60),
    term: clean(b.term, 90),
    status: 'Ordered',
    toWhom: clean(b.toWhom, 140),
    carriedBy: '', carriedAt: '', ret: '',
    code: mintCode(),
    by: (by && by.name) || '', at: now()
  };
  list.push(entry);
  S.write(SENTENCES, list);
  return entry;
}

function sentenceUpdate(id, b, by) {
  const list = sentences();
  const x = list.find(v => v.id === id);
  if (!x) throw new Error('No sentence answers to that.');
  if (b.status && SENTENCE_STATUS.includes(b.status)) x.status = b.status;
  ['toWhom', 'term', 'hold'].forEach(k => { if (b[k] !== undefined) x[k] = clean(b[k], 140); });
  if (b.carriedBy !== undefined) x.carriedBy = clean(b.carriedBy, 140);
  if (b.ret !== undefined) x.ret = text(b.ret, 1500);
  if ((x.status === 'Carried out' || x.status === 'Could not be carried out') && !x.carriedAt) x.carriedAt = now();
  S.write(SENTENCES, list);
  return x;
}

function sentenceRemove(id) { S.write(SENTENCES, sentences().filter(x => x.id !== id)); }

// ---------------------------------------------------------------------------
// Persons sought: arrest warrants that have not been answered
// ---------------------------------------------------------------------------

function wanted() {
  return warrants()
    .filter(w => w.kind === 'Arrest' && (w.status === 'Issued' || w.status === 'Returned unserved'))
    .map(w => {
      const c = w.caseNo ? caseByNo(w.caseNo) : null;
      const off = c && c.offenceId ? offenceGet(c.offenceId) : null;
      return {
        no: w.no, against: w.against, hold: w.hold, reason: w.reason,
        issuedAt: w.issuedAt, issuedBy: w.issuedBy, status: w.status,
        caseNo: (c && c.sealed) ? '' : w.caseNo,
        offence: off ? off.name : '', gravity: off ? off.gravity : ''
      };
    })
    .reverse();
}

// ---------------------------------------------------------------------------
// The report of the Ministry's work
// ---------------------------------------------------------------------------

function report(fromISO, toISO) {
  const from = fromISO ? new Date(fromISO).getTime() : 0;
  const to = toISO ? new Date(toISO).getTime() + 86400000 : Date.now() + 86400000;
  const within = t => { const v = new Date(t || 0).getTime(); return v >= from && v <= to; };

  const cs = cases();
  const opened = cs.filter(c => within(c.opened));
  const givenJ = cs.filter(c => c.judgment && c.judgment.given && within(c.judgment.at));
  const findings = {};
  givenJ.forEach(c => { findings[c.judgment.finding] = (findings[c.judgment.finding] || 0) + 1; });
  const byKind = {};
  opened.forEach(c => { const k = KIND_BY_ID[c.kind] ? KIND_BY_ID[c.kind].name : c.kind; byKind[k] = (byKind[k] || 0) + 1; });
  const ws = warrants().filter(w => within(w.issuedAt));
  const warrantKinds = {};
  ws.forEach(w => { warrantKinds[w.kind] = (warrantKinds[w.kind] || 0) + 1; });
  const d = duesTotals();

  return {
    from: fromISO || '', to: toISO || '',
    opened: opened.length,
    byKind,
    judged: givenJ.length,
    findings,
    pending: cs.filter(c => !isClosed(c)).length,
    sealed: cs.filter(c => c.sealed).length,
    mattersLaid: matters().filter(m => within(m.at)).length,
    mattersWaiting: mattersWaiting().length,
    warrants: ws.length,
    warrantKinds,
    warrantsOpen: warrants().filter(w => w.status === 'Issued').length,
    held: custodyHeld().length,
    committed: custody().filter(x => within(x.at)).length,
    inquisitions: inquisitions().filter(i => within(i.at)).length,
    inquisitionsOpen: inqOpenList().length,
    exhibits: exhibits().filter(e => within(e.at)).length,
    exhibitsHeld: exhibits().filter(e => e.status === 'Held').length,
    sentences: sentences().filter(x => within(x.at)).length,
    sentencesCarried: sentences().filter(x => x.status === 'Carried out' && within(x.carriedAt)).length,
    sentencesOutstanding: sentences().filter(x => x.status === 'Ordered' || x.status === 'With the Provost').length,
    dues: d,
    sittings: calendar().filter(h => within(h.set)).length
  };
}

module.exports = {
  mintCode, normCode, ensureCodes, verify,
  PLEAS, pleaEnter, sealSet, witnessAdd, witnessUpdate, witnessRemove,
  citedBy, citable,
  holdCourts, holdCourtGet, holdCourtSave, holdCourtRemove, appealsFrom,
  EXHIBIT_STATUS, EXHIBIT_CLASS, exhibits, exhibitGet, exhibitsFor, exhibitTake, exhibitUpdate, exhibitRemove,
  DUE_KINDS, DUE_CLASS, dues, dueGet, duesFor, paidOf, owingOf, dueStanding, dueOrder, dueRender, dueUpdate, duePaymentRemove, dueRemove, duesTotals,
  SENTENCE_KINDS, SENTENCE_STATUS, SENTENCE_CLASS, sentences, sentenceGet, sentencesFor, sentencesWithProvost, sentenceOrder, sentenceUpdate, sentenceRemove,
  wanted, report,
  appealedIn, judgedCases,
  CUSTODY_STATUS, CUSTODY_CLASS, custody, custodyGet, custodyHeld, custodyFor, custodyCommit, custodyUpdate, custodyRemove,
  INQ_STATUS, INQ_CLASS, inquisitions, inqGet, inqOpenList, inqForCase, inqOpen, inqUpdate, inqLineAdd, inqLineRemove, inqStatementAdd, inqStatementRemove, inqRemove,
  partyNames, partyRecord,
  OFFENCE_CLASSES, GRAVITY, offences, offenceGet, offenceSave, offenceRemove,
  WARRANT_KINDS, WARRANT_STATUS, WARRANT_CLASS, warrants, warrantGet, warrantsFor, warrantsOpen, warrantIssue, warrantUpdate, warrantRemove,
  calendar,
  KINDS, KIND_BY_ID, STATUS, STATUS_CLASS, CLOSED, FINDINGS, PAPER_KINDS,
  MATTER_KINDS, MATTER_STATUS, MATTER_STATUS_CLASS,
  cases, caseGet, caseByNo, openCases, judged, isClosed,
  caseOpen, caseUpdate, caseRemove, hearingAdd, hearingRemove, paperAdd, paperRemove, judgmentGive,
  matters, matterGet, matterByNo, mattersWaiting, matterAdd, matterHandle, matterRemove,
  tallies, roman
};
