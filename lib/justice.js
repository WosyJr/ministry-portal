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
    report: null, conclusion: '',
    review: null, commission: null,
    emergencies: [], obstructions: [],
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
  // The report is laid under Article 26 now, not typed into a single box. An
  // older inquisition may still hold a plain string; it is left as it stands
  // until a proper report is laid over it.
  if (b.report !== undefined && typeof i.report === 'string') i.report = text(b.report, 8000);
  if (b.conclusion !== undefined) i.conclusion = clean(b.conclusion, 300);
  S.write(INQUISITIONS, list);
  return i;
}

// ---------------------------------------------------------------------------
// The Writ of Commission of Inquisition
// ---------------------------------------------------------------------------
// An Inquisitor does not go out upon their own word. The Minister commissions
// them by writ, and the writ says plainly what is alleged, how far the
// inquisition may reach, upon what ground the Empire claims to hear it, and
// which extraordinary powers are given and which are expressly withheld.

// Article 10 of the Standards. These are the compulsory measures: each requires
// specific legal authority, and an Inquisitor shall not presume any of them from
// the office title alone. Everything not granted here is denied.
const POWERS = [
  'Compelled testimony',
  'Compulsory production of records',
  'Search of private property',
  'Seizure of private property',
  'Detention',
  'Arrest',
  'Interception or seizure of correspondence',
  'Sealing of premises',
  'Restriction upon travel',
  'Compulsory summons',
  'Forced entry'
];

// Article 9. These come with any lawful Commission and are not granted one by
// one; they are printed upon the writ so the Inquisitor and the Hold both know
// what needs no special leave.
const ORDINARY_POWERS = [
  'Receive allegations, complaints, petitions, reports and testimonies',
  'Interview willing witnesses',
  'Ask the testimony of Imperial officials upon matters within their competence',
  'Inspect Imperial records accessible to the Ministry',
  'Request records and evidence of local governments, guilds, companies and private persons',
  'Inspect sites relevant to the investigation where lawful access is established',
  'Preserve evidence willingly surrendered or lawfully seized',
  'Compare testimony against documentary evidence',
  'Seek the help of Imperial civil officers, guards and Legion officers where authorised',
  'Identify persons reasonably believed to hold relevant information',
  'Preserve confidential sources where necessary',
  'Prepare findings, assessments, recommendations and referrals'
];

// Article 7. A matter belongs to a superseding Imperial first instance only on
// one of these grounds. Article 8: Imperial interest alone is not a ground.
const JURISDICTION = [
  ['provincial', 'I. Provincial Character', 'Conduct across several Holds, a coordinated enterprise beyond one Hold, substantial consequences throughout the Province, or a matter no one local jurisdiction can reasonably investigate.'],
  ['empire', 'II. Offences Against the Empire', 'Conduct directed against the Emperor or Crown, the Governor or Provincial Government in an Imperial capacity, the Legion, an Imperial Ministry or official, Imperial property, records or revenues, or the exercise of Imperial authority.'],
  ['security', 'III. Insurrection and Provincial Security', 'Rebellion, sedition or insurrection, conspiracy against the Imperial government, organised assistance to insurgents, or attempts to overthrow Imperial authority.'],
  ['local-government', 'IV. Allegations Against Local Government', 'A Jarl or Lord-Regent, the court of a Hold, the very authority that would otherwise investigate, or officials involved to a degree that ordinary local procedure would be plainly conflicted.'],
  ['reserved', 'V. Imperial Reserved Jurisdiction', 'Standing Imperial law, treaty, charter or decree reserving first-instance Imperial jurisdiction.'],
  ['failure', 'VI. Failure or Incapacity of Local Jurisdiction', 'No local authority exists, the local authority is unwilling, local proceedings are being frustrated, or an extraordinary circumstance requires temporary Imperial assumption.']
];
const JURISDICTION_BY_ID = Object.fromEntries(JURISDICTION.map(j => [j[0], j]));

// Article 12. Every fact an Inquisitor sets down is one of these, and saying
// which is the difference between an inquiry and an accusation.
const FACT_KINDS = ['Allegation', 'Suspicion', 'Corroborated fact', 'Disputed fact', 'Inference', 'Legal conclusion'];
const FACT_CLASS = { Allegation: 'warn', Suspicion: 'warn', 'Corroborated fact': 'ok', 'Disputed fact': 'bad', Inference: '', 'Legal conclusion': '' };

// Article 13. How a piece of testimony stands as evidence.
const KNOWLEDGE = ['Direct knowledge', 'Hearsay', 'Document produced', 'Cannot be determined'];

// Article 11. What need not be disclosed to the Hold, and nothing else.
const WITHHOLD_GROUNDS = [
  'A confidential witness',
  'Matter that would compromise the investigation',
  'Matter concerning an ongoing security operation',
  'Risk of destroyed evidence, flight, retaliation or obstruction'
];

// Article 14. The recommendations an Inquisitor may make, and no others.
const RECOMMENDATIONS = [
  'No further action',
  'Continuation of the investigation',
  'Referral of the matter to a Hold authority',
  'Indictment by the Empire',
  'A judicial inquiry',
  'Administrative sanction',
  'Protective or security measures',
  'Other appropriate legal proceedings'
];

// Article 27. What the Minister may do upon a report.
const MINISTER_OUTCOMES = [
  'Accept the findings',
  'Order a supplementary investigation',
  'Reject findings not founded in fact',
  'Forward the matter elsewhere',
  'Recommend legal action to the Governor or a judicial authority',
  'Close the matter'
];

// Article 19. The dangers that alone permit action before authority is had.
const EMERGENCY_GROUNDS = [
  'Death or serious bodily harm',
  'Destruction of material evidence',
  'Flight of a person accused of a serious Imperial offence',
  'Insurrection',
  'Destruction of critical Imperial property',
  'Immediate interference with an authorised Imperial operation'
];

// Article 3. The Minister may modify, restrict, suspend or terminate.
const COMMISSION_STATES = ['In force', 'Restricted', 'Suspended', 'Terminated'];
const COMMISSION_CLASS = { 'In force': 'ok', Restricted: 'warn', Suspended: 'warn', Terminated: 'bad' };

// Article 17. What no Commission may confer.
const PROHIBITED = [
  'Investigate for private revenge, political rivalry, personal profit or factional advantage',
  'Demand obedience in matters unrelated to the authorised investigation',
  'Appropriate property for personal or departmental gain',
  'Punish a person without lawful adjudication',
  'Declare a Jarl, court, guild, institution or citizen guilty by inquisitorial decree',
  'Usurp the authority of the Governor, the Minister, or a lawful local ruler',
  'Knowingly conceal exculpatory evidence',
  'Create offences not established by law',
  'Treat non-cooperation as proof of guilt where it could not lawfully be compelled',
  'Invoke the Emperor, the Governor or the Minister to claim powers not actually delegated',
  'Interfere with a lawful local proceeding to achieve a political result',
  'Exercise extraordinary power after this Commission is terminated'
];

function inqCommission(id, b, by) {
  const list = inquisitions();
  const i = list.find(x => x.id === id);
  if (!i) throw new Error('No inquisition answers to that.');
  const allegations = text(b.allegations, 3000);
  if (!allegations) throw new Error('Set down what is alleged, or what is to be examined.');
  const inquisitors = clean(b.inquisitors, 300);
  if (!inquisitors) throw new Error('Name the Inquisitor or Inquisitors commissioned.');
  const pick = v => [].concat(v || []).map(x => clean(x, 120)).filter(x => POWERS.includes(x));
  const conferred = pick(b.conferred);
  const denied = POWERS.filter(x => !conferred.includes(x));
  // Article 7: a ground must be named. Article 8: Imperial interest is not one.
  const grounds = [].concat(b.grounds || []).map(x => clean(x, 40)).filter(x => JURISDICTION_BY_ID[x]);
  if (!grounds.length) throw new Error('Name the ground of Imperial jurisdiction under Article 7. A matter that answers to none of them belongs to the Hold.');
  // Article 24: no extraordinary investigation into the personal conduct of a
  // reigning Jarl or Lord-Regent without the Minister's or Governor's leave.
  if (b.touchesRuler && !clean(b.rulerAuthBy, 160)) {
    throw new Error('This touches the personal conduct of a reigning Jarl or Lord-Regent. Article 24 requires the prior authorisation of the Minister or the Governor; name who gave it.');
  }
  i.commission = {
    no: i.no.replace('Inquisition', 'Commission'),
    allegations,
    scope: text(b.cscope, 3000) || i.scope,
    jurisdiction: text(b.jurisdiction, 2000),
    grounds,
    conferred, denied,
    // Article 3(f): the Commission states to whom findings are reported.
    reportTo: clean(b.reportTo, 160) || 'The Provincial Minister of State for Justice',
    otherDenied: text(b.otherDenied, 1000),
    inquisitors,
    issuedBy: clean(b.issuedBy, 140) || ((by && by.name) || ''),
    issuingTitle: clean(b.issuingTitle, 160) || 'Provincial Minister of State for Justice',
    issuedOn: clean(b.issuedOn, 80),
    code: (i.commission && i.commission.code) || mintCode(),
    state: (i.commission && i.commission.state) || 'In force',
    revoked: false, revokedNote: '',
    // Article 24: an investigation into a reigning Jarl or Lord-Regent needs
    // prior authorisation, and the writ says who gave it.
    touchesRuler: !!b.touchesRuler,
    rulerAuthBy: clean(b.rulerAuthBy, 160),
    notices: (i.commission && i.commission.notices) || [],
    extensions: (i.commission && i.commission.extensions) || [],
    emergencies: (i.commission && i.commission.emergencies) || [],
    at: (i.commission && i.commission.at) || now(),
    amendedAt: i.commission ? now() : ''
  };
  S.write(INQUISITIONS, list);
  return i;
}

function inqCommissionRevoke(id, b, by) {
  const list = inquisitions();
  const i = list.find(x => x.id === id);
  if (!i || !i.commission) throw new Error('No commission answers to that.');
  i.commission.revoked = !i.commission.revoked;
  i.commission.revokedNote = text(b.note, 1000);
  i.commission.revokedBy = (by && by.name) || '';
  i.commission.revokedAt = i.commission.revoked ? now() : '';
  S.write(INQUISITIONS, list);
  return i;
}

// Article 3: the Minister may modify, restrict, suspend or terminate. These are
// different things and the writ should say which, not merely that it is off.
function inqCommissionState(id, b, by) {
  const list = inquisitions();
  const i = list.find(v => v.id === id);
  if (!i || !i.commission) throw new Error('No commission answers to that.');
  const to = COMMISSION_STATES.includes(b.state) ? b.state : 'In force';
  i.commission.state = to;
  i.commission.revoked = to === 'Suspended' || to === 'Terminated';
  i.commission.revokedNote = text(b.note, 1000);
  i.commission.revokedBy = (by && by.name) || '';
  i.commission.revokedAt = i.commission.revoked ? now() : '';
  S.write(INQUISITIONS, list);
  return i;
}

// Article 11: what the Hold was told, or the ground upon which it was not.
function inqNotice(id, b, by) {
  const list = inquisitions();
  const i = list.find(v => v.id === id);
  if (!i) throw new Error('No inquisition answers to that.');
  if (!i.commission) throw new Error('Issue the Commission before giving notice to the Hold.');
  const told = b.told === '1' || b.told === true;
  const withheld = [].concat(b.withheld || []).map(x => clean(x, 160)).filter(x => WITHHOLD_GROUNDS.includes(x));
  if (!told && !withheld.length) {
    throw new Error('Article 11 asks that the Hold be informed unless secrecy or urgency forbids it. Either set down that they were told, or name the ground upon which they were not.');
  }
  // Where the ruler or court is the subject, only the Minister may authorise
  // telling them nothing.
  if (!told && i.commission.touchesRuler && !clean(b.ministerLeave, 160)) {
    throw new Error('The subject is a ruler or their court, so withholding notice needs the Minister\u2019s authority. Name who gave it.');
  }
  i.commission.notices = (i.commission.notices || []).concat([{
    id: S.id(), told, toWhom: clean(b.toWhom, 160), when: clean(b.when, 80),
    withheld, ministerLeave: clean(b.ministerLeave, 160), note: text(b.note, 1500),
    by: (by && by.name) || '', at: now()
  }]);
  S.write(INQUISITIONS, list);
  return i;
}

// Article 3: the subject matter is not widened without authority unless new
// facts connect it, and any such extension is reported at the first chance.
const EXTENSION_GROUNDS = ['Connected with the original matter', 'Another serious Imperial offence', 'An immediate threat to Imperial authority or public safety'];
function inqExtend(id, b, by) {
  const list = inquisitions();
  const i = list.find(v => v.id === id);
  if (!i || !i.commission) throw new Error('No commission answers to that.');
  const ground = EXTENSION_GROUNDS.includes(b.ground) ? b.ground : '';
  if (!ground) throw new Error('Name which of the three grounds of Article 3 carries this extension.');
  const what = text(b.what, 2000);
  if (!what) throw new Error('Set down what the investigation is extended to.');
  i.commission.extensions = (i.commission.extensions || []).concat([{
    id: S.id(), what, ground, reported: !!b.reported, reportedTo: clean(b.reportedTo, 160),
    by: (by && by.name) || '', at: now()
  }]);
  S.write(INQUISITIONS, list);
  return i;
}

// Articles 19 and 20: what was done before authority could be had, and why it
// was necessary, proportional and temporary.
function inqEmergency(id, b, by) {
  const list = inquisitions();
  const i = list.find(v => v.id === id);
  if (!i) throw new Error('No inquisition answers to that.');
  const danger = [].concat(b.danger || []).map(x => clean(x, 160)).filter(x => EMERGENCY_GROUNDS.includes(x));
  if (!danger.length) throw new Error('Article 19 permits immediate action only against the dangers it names. Name the danger.');
  const measure = text(b.measure, 2000);
  if (!measure) throw new Error('Set down what was done.');
  if (!clean(b.until, 200)) throw new Error('Article 20 requires the measure be temporary. Say until when, or until what.');
  i.emergencies = (i.emergencies || []).concat([{
    id: S.id(), danger, measure,
    necessary: text(b.necessary, 1000), proportional: text(b.proportional, 1000),
    until: clean(b.until, 200),
    reported: !!b.reported, reportedAt: clean(b.reportedAt, 80),
    by: (by && by.name) || '', at: now()
  }]);
  S.write(INQUISITIONS, list);
  return i;
}

// Article 26: the report. Its twelve heads are asked for by name, and the
// evidence for and the evidence against are kept in separate hands so that
// Article 12 — material evidence favourable to the subject shall not be left
// out — is something the paper can actually hold you to.
function inqReport(id, b, by) {
  const list = inquisitions();
  const i = list.find(v => v.id === id);
  if (!i) throw new Error('No inquisition answers to that.');
  const R = k => text(b[k], 8000);
  const facts = R('facts');
  if (!facts) throw new Error('Article 26 asks for the facts determined by the investigation. Set them down.');
  const recs = [].concat(b.recommendations || []).map(x => clean(x, 160)).filter(x => RECOMMENDATIONS.includes(x));
  if (!recs.length) throw new Error('Article 14 gives the recommendations an Inquisitor may make. Choose at least one.');
  const forAlleg = R('evidenceFor'), against = R('evidenceAgainst');
  if (!against) {
    throw new Error('Article 12 forbids leaving out material evidence favourable to the person investigated. Set down the evidence against the allegations, or say plainly that none was found.');
  }
  i.report = {
    under: clean(b.under, 200) || (i.commission ? i.commission.no : ''),
    allegations: R('allegations') || (i.commission ? i.commission.allegations : ''),
    jurisdiction: R('jurisdiction'),
    course: R('course'),
    facts,
    disputed: R('disputed'),
    evidenceFor: forAlleg,
    evidenceAgainst: against,
    credibility: R('credibility'),
    jurisdictionQuestion: R('jurisdictionQuestion'),
    conclusions: R('conclusions'),
    recommendations: recs,
    laidBy: (by && by.name) || '', laidAt: now()
  };
  if (i.status === 'Open' || i.status === 'Gathering') i.status = 'Reported';
  S.write(INQUISITIONS, list);
  return i;
}

// Article 27: the Minister's answer upon the report, and what follows from it.
function inqReview(id, b, by) {
  const list = inquisitions();
  const i = list.find(v => v.id === id);
  if (!i) throw new Error('No inquisition answers to that.');
  if (!i.report || !i.report.facts) throw new Error('There is no report to review.');
  const outcome = MINISTER_OUTCOMES.includes(b.outcome) ? b.outcome : '';
  if (!outcome) throw new Error('Choose what the Minister does upon this report.');
  i.review = {
    outcome, note: text(b.note, 4000),
    // Where the Governor granted the Commission, the findings go back to them.
    toGovernor: !!b.toGovernor, governorNote: text(b.governorNote, 2000),
    by: (by && by.name) || '', at: now()
  };
  if (outcome === 'Close the matter') i.status = 'Closed';
  else if (outcome === 'Order a supplementary investigation') i.status = 'Gathering';
  S.write(INQUISITIONS, list);
  return i;
}

// Article 25: obstruction is not mere refusal. All three must be shown first.
const OBSTRUCTION_TESTS = [
  'The inquisitorial act was within lawful Imperial authority',
  'The person knew or ought to have known of that authority',
  'The person deliberately interfered with it'
];
function inqObstruction(id, b, by) {
  const list = inquisitions();
  const i = list.find(v => v.id === id);
  if (!i) throw new Error('No inquisition answers to that.');
  const who = clean(b.who, 140);
  if (!who) throw new Error('Name who is said to have obstructed.');
  const shown = [].concat(b.shown || []).map(x => clean(x, 200)).filter(x => OBSTRUCTION_TESTS.includes(x));
  if (shown.length < OBSTRUCTION_TESTS.length) {
    throw new Error('Article 25: all three must be shown before a charge of obstruction. A good-faith challenge to jurisdiction is not obstruction, even where it fails.');
  }
  i.obstructions = (i.obstructions || []).concat([{
    id: S.id(), who, shown, what: text(b.what, 2000),
    referred: clean(b.referred, 160), by: (by && by.name) || '', at: now()
  }]);
  S.write(INQUISITIONS, list);
  return i;
}

// Articles 21 to 23: the help of another Imperial authority. An Inquisitor
// commands none of them. Assistance is requested, upon a ground, and the
// asking is written down so that nobody may later claim to have acted for a
// department that never agreed to it.
const AUTHORITIES = ['The Imperial Legion', 'The Penitus Oculatus', 'Another competent Imperial department', 'A provincial department or officer', 'The authorities of the Hold'];
const ASSIST_GROUNDS = [
  'Authorised by the Minister or the Governor',
  'Provided for by law or by departmental agreement',
  'A clear and imminent danger required it',
  'That authority holds primary jurisdiction and directed the joining'
];
function inqAssist(id, b, by) {
  const list = inquisitions();
  const i = list.find(v => v.id === id);
  if (!i) throw new Error('No inquisition answers to that.');
  const who = AUTHORITIES.includes(b.who) ? b.who : '';
  if (!who) throw new Error('Name which authority was asked.');
  const ground = ASSIST_GROUNDS.includes(b.ground) ? b.ground : '';
  if (!ground) throw new Error('Articles 21 to 23: assistance is requested upon a ground, not commanded. Name the ground.');
  const what = text(b.what, 2000);
  if (!what) throw new Error('Set down what was asked of them.');
  i.assistance = (i.assistance || []).concat([{
    id: S.id(), who, ground, what,
    authorisedBy: clean(b.authorisedBy, 160),
    answer: text(b.answer, 1000),
    // Article 22: where another department holds primary jurisdiction the
    // Inquisitor cooperates or joins with it, and does not speak for it.
    primary: !!b.primary,
    by: (by && by.name) || '', at: now()
  }]);
  S.write(INQUISITIONS, list);
  return i;
}

// Article 15: coercion is reported as such in the final report, so the report
// reads it off the statements rather than trusting anyone to remember.
function coercedStatements(i) {
  return (i.statements || []).filter(s => s.coerced);
}

// Article 28: a complaint against an Inquisitor. It goes to the Minister, or
// past them to the Governor where the Ministry itself would be conflicted.
const COMPLAINTS = 'justice-complaints.json';
const COMPLAINT_KINDS = ['Exceeding the Commission', 'Abuse of extraordinary powers', 'Fabrication of evidence', 'Acting for an improper purpose'];
const COMPLAINT_STATUS = ['Received', 'Under examination', 'Referred to the Governor', 'Upheld', 'Not upheld'];
const COMPLAINT_CLASS = { Received: 'warn', 'Under examination': 'warn', 'Referred to the Governor': '', Upheld: 'bad', 'Not upheld': 'ok' };
const SANCTIONS = ['Removed from the investigation', 'Suspended from office', 'Dismissed from office', 'Disciplined', 'Put to criminal process'];

function complaints() { return S.read(COMPLAINTS, []); }
function complaintGet(id) { return complaints().find(x => x.id === id) || null; }

function complaintLay(b, by) {
  const against = clean(b.against, 140);
  if (!against) throw new Error('Name the Inquisitor complained of.');
  const kinds = [].concat(b.kinds || []).map(x => clean(x, 120)).filter(x => COMPLAINT_KINDS.includes(x));
  if (!kinds.length) throw new Error('Name what is alleged under Article 28.');
  const what = text(b.what, 4000);
  if (!what) throw new Error('Set down what is complained of.');
  const list = complaints();
  const entry = {
    id: S.id(), no: 'Complaint ' + roman(list.length + 1),
    against, kinds, what,
    by: clean(b.by, 140), inqNo: clean(b.inqNo, 60),
    status: 'Received', finding: '', sanctions: [],
    // Where examining it through the Ministry would be conflicted, it may go
    // straight to the Governor.
    conflicted: !!b.conflicted,
    code: mintCode(), at: now()
  };
  list.push(entry);
  S.write(COMPLAINTS, list);
  return entry;
}

function complaintUpdate(id, b, by) {
  const list = complaints();
  const x = list.find(v => v.id === id);
  if (!x) throw new Error('No complaint answers to that.');
  if (COMPLAINT_STATUS.includes(b.status)) x.status = b.status;
  if (b.finding !== undefined) x.finding = text(b.finding, 4000);
  if (b.sanctions !== undefined) x.sanctions = [].concat(b.sanctions || []).map(v => clean(v, 120)).filter(v => SANCTIONS.includes(v));
  x.handledBy = (by && by.name) || '';
  x.handledAt = now();
  S.write(COMPLAINTS, list);
  return x;
}

function complaintRemove(id) { S.write(COMPLAINTS, complaints().filter(x => x.id !== id)); }

function commissions() {
  return inquisitions().filter(i => i.commission).map(i => ({ ...i.commission, inqId: i.id, inqNo: i.no, subject: i.subject, status: i.status }));
}

function inqLineAdd(id, b) {
  const list = inquisitions();
  const i = list.find(x => x.id === id);
  if (!i) throw new Error('No inquisition answers to that.');
  const q = clean(b.line, 300);
  if (!q) throw new Error('Set down the line of inquiry.');
  i.lines = (i.lines || []).concat([{
    id: S.id(), line: q, answer: text(b.answer, 2000),
    // Article 12: say what the answer is, not merely what it says.
    kind: FACT_KINDS.includes(b.kind) ? b.kind : 'Allegation',
    source: clean(b.source, 200),
    at: now()
  }]);
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
    // Article 13: the integrity of the thing as evidence.
    knowledge: KNOWLEDGE.includes(b.knowledge) ? b.knowledge : 'Cannot be determined',
    circumstances: text(b.circumstances, 1000),
    // Article 15: coercion, where any was used, is reported as such.
    coerced: !!b.coerced, coercion: text(b.coercion, 1000),
    favourable: !!b.favourable,
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
  const ci = inquisitions().find(v => v.commission && v.commission.code === want);
  if (ci) {
    const cm = ci.commission;
    const state = cm.state || (cm.revoked ? 'Terminated' : 'In force');
    return {
      found: true, kind: 'A writ commissioning an Inquisitor', no: cm.no, code: want,
      standing: state, inForce: state === 'In force' || state === 'Restricted',
      rows: [['Commission', cm.no], ['Upon the inquisition', ci.no], ['Assigned to', cm.inquisitors],
        ['Issued by', cm.issuedBy + (cm.issuingTitle ? ', ' + cm.issuingTitle : '')],
        cm.issuedOn && ['Entered on', cm.issuedOn],
        ['Findings reported to', cm.reportTo || 'The Minister'],
        ['Powers conferred', (cm.conferred || []).length ? (cm.conferred || []).join('; ') : 'None'],
        ['Powers expressly denied', (cm.denied || []).length ? (cm.denied || []).join('; ') : 'None'],
        ['Standing', state === 'In force' ? 'In force' : state + ' \u2014 extraordinary power under it has ceased']]
    };
  }
  const cp = complaints().find(v => v.code === want);
  if (cp) return {
    found: true, kind: 'A complaint against an Inquisitor, under Article 28', no: cp.no, code: want,
    standing: cp.status, inForce: cp.status !== 'Not upheld',
    rows: [['Complaint', cp.no], ['Against', cp.against], ['What is alleged', (cp.kinds || []).join('; ')],
      cp.inqNo && ['Upon the inquisition', cp.inqNo], ['Standing', cp.status],
      cp.status === 'Upheld' && (cp.sanctions || []).length && ['Ordered', (cp.sanctions || []).join('; ')]]
  };
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
  POWERS, ORDINARY_POWERS, JURISDICTION, JURISDICTION_BY_ID, PROHIBITED,
  FACT_KINDS, FACT_CLASS, KNOWLEDGE, WITHHOLD_GROUNDS, RECOMMENDATIONS, MINISTER_OUTCOMES,
  EMERGENCY_GROUNDS, EXTENSION_GROUNDS, COMMISSION_STATES, COMMISSION_CLASS, OBSTRUCTION_TESTS,
  COMPLAINT_KINDS, COMPLAINT_STATUS, COMPLAINT_CLASS, SANCTIONS,
  inqCommissionState, inqNotice, inqExtend, inqEmergency, inqReport, inqReview, inqObstruction,
  AUTHORITIES, ASSIST_GROUNDS, inqAssist, coercedStatements,
  complaints, complaintGet, complaintLay, complaintUpdate, complaintRemove,
  inqCommission, inqCommissionRevoke, commissions,
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
