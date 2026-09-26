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
    at: now(), status: 'Received', reply: '', handledBy: '', handledAt: '', caseNo: ''
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
      when: h.when, place: h.place, before: h.before, note: h.note, set: h.at
    }));
  });
  return out.sort((a, b) => String(b.set).localeCompare(String(a.set)));
}

module.exports = {
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
