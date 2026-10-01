const Ranks = require('./ranks');
const S = require('./store');

const FILE = 'guide-seen.json';

const TERMS = [
  ['docket', 'The list of every record the Ministry has ever filed, newest first.'],
  ['standing', 'Where a thing has got to — Open, Closed, Awaiting Seal, and so on.'],
  ['awaiting seal', 'You have written it; the Minister has not stamped it yet. It is not a real paper until they do.'],
  ['hold', 'One of the nine regions of Skyrim. A Delegate is given some of them to look after.'],
  ['writ', 'A formal paper of the Ministry. Every form you fill in becomes one.'],
  ['petition', 'A subject of the Empire asking the Ministry for something.'],
  ['commission', 'The writ that sends an Inquisitor out and says exactly what they may do.'],
  ['seal', 'The Minister’s wax. It is what turns a draft into a document that counts.'],
  ['signet', 'Your own small mark, printed beside your name on what you file.'],
  ['the bench', 'The Imperial Justices, who judge matters. Not the same as the Ministry.'],
  ['referred', 'Sent on to somebody else to deal with, because it is not yours to decide.'],
  ['struck', 'Removed from the rolls. The record is gone, not merely closed.'],
  ['return', 'A Delegate’s weekly written account of their Holds.'],
  ['rounds', 'The records a Delegate is expected to file in their own Holds each week.']
];

const PLAIN = {
  desk: ['Your Desk', 'Everything meant for you lands here — letters, papers waiting on your hand, what you owe this week. You do not have to hunt through the tabs for it.'],
  file: ['Filing a record', 'Pick the form that fits, fill it in, send it. It goes to the Minister for a seal, and you are told when it is stamped.'],
  docket: ['The Docket', 'Every record the Ministry holds. You see the ones your office is allowed to see, not all of them.'],
  petitions: ['Petitions', 'Somebody has asked the Ministry for something. You answer it and set its standing. You do not judge it.'],
  approve: ['Sealing', 'Putting the Ministry’s wax on somebody else’s work. Until you do, what they filed is not a real paper.'],
  holds: ['Holds', 'The regions. If some are given to your rank, that is where your work belongs — not in somebody else’s.'],
  archives: ['The Archives', 'Where old records go to rest. Nothing is deleted, only put away.'],
  officers: ['Officers', 'The rolls of who serves, what rank they hold, and what they may do.'],
  jusinquire: ['Inquisitions', 'You gather facts under a writ. You do not prosecute and you do not judge — you find out what happened and report it.'],
  jusjudge: ['The Bench', 'You hear matters and give judgment. What you decide stands until it is appealed.'],
  juscases: ['Matters', 'The cases before the Ministry of Justice.'],
  correspondence: ['Ministry Requests', 'Other Ministries asking something of this one, and the answers given.'],
  reports: ['Reports', 'What the Ministry has been doing, counted up by week.']
};

function tourFor(u) {
  if (!u) return [];
  const can = p => Ranks.can(u, p);
  const steps = [];
  steps.push({
    head: 'This is your Desk',
    body: 'Anything meant for you arrives here — a letter from the Minister, a paper waiting on your hand, the work you owe this week. It sits in the top bar on every page, so it follows you about. You do not have to go looking through the tabs for it.',
    at: 'desk'
  });
  const rank = Ranks.get(u.rank);
  const holds = (rank && rank.holds) || u.holds || [];
  if (holds.length) {
    const names = holds.map(h => (Ranks.HOLD_BY_ID[h] || {}).name || h).join(', ');
    steps.push({
      head: 'These Holds are yours',
      body: `${names}. Work filed in somebody else's Holds is not your business, and it does not count toward what you owe. If something from another Hold lands on you, pass it to whoever holds it.`,
      at: 'holds'
    });
  }
  if (can('petitions')) {
    steps.push({
      head: 'A petition comes in here',
      body: 'Somebody has asked the Ministry for something. You open it, write what you found, and set its standing. You answer it — you do not judge it. If it needs deciding, refer it.',
      at: 'petitions'
    });
  }
  if (can('jusinquire')) {
    steps.push({
      head: 'You go out under a writ, never on your own word',
      body: 'An inquisition needs a Commission from the Minister saying what you may do. Anything not ticked on that writ is printed on it as forbidden. Holding the office is not the same as holding the power.',
      at: 'inquisitions'
    });
  }
  if (rank && rank.quota) {
    steps.push({
      head: 'Every Sunday you owe a Return',
      body: 'A written page on your Holds — what you saw, what you did, what the Hold wants of the Ministry. Plus a few records filed in your own Holds, and one duty drawn for you. Your Week page shows what is still owed.',
      at: 'week'
    });
  }
  if (can('approve')) {
    steps.push({
      head: 'Yours is the hand that seals',
      body: 'What other officers file is not a real paper until you put the wax on it. The Approvals tab is the queue; the Desk shows you the count without going there.',
      at: 'approvals'
    });
  }
  steps.push({
    head: 'If you are ever unsure',
    body: 'The What You May Do page lists everything your office can actually do, in plain words, with what is not yours set out beside it. Any word you do not know has a dotted line under it — hover or tap it.',
    at: 'guide'
  });
  return steps.slice(0, 6);
}

function duties(u) {
  if (!u) return [];
  const out = [];
  const seen = new Set();
  const add = key => {
    if (seen.has(key) || !PLAIN[key]) return;
    seen.add(key);
    out.push({ key, head: PLAIN[key][0], body: PLAIN[key][1] });
  };
  add('desk');
  ['file', 'petitions', 'docket', 'jusinquire', 'jusjudge', 'approve', 'holds', 'correspondence', 'archives', 'officers', 'reports']
    .forEach(p => { if (Ranks.can(u, p)) add(p); });
  return out;
}

function notYours(u) {
  if (!u) return [];
  const out = [];
  const cannot = p => !Ranks.can(u, p);
  if (cannot('approve')) out.push('You cannot put the seal on a record. That is the Minister’s hand, and it is what makes a paper real.');
  if (cannot('jusjudge')) out.push('You cannot judge a matter or give a punishment. That is the Bench.');
  if (cannot('officers')) out.push('You cannot appoint anyone, change a rank, or alter what another officer may do.');
  if (cannot('archive')) out.push('You cannot put a record into the Archives or take one out.');
  const rank = Ranks.get(u.rank);
  if (rank && (rank.holds || []).length) out.push('You cannot work in another Delegate’s Holds unless you are asked to. Pass it to whoever holds them.');
  if (cannot('allrecords')) out.push('You cannot see every record — only what your office is given. That is not a fault, it is the point.');
  return out;
}

function steps(u) {
  if (!u) return [];
  const list = [];
  list.push({ id: 'entered', what: 'Enter the hall for the first time', done: true });
  if (Ranks.can(u, 'petitions')) list.push({ id: 'petition', what: 'Answer your first petition', done: false, link: '/staff/petitions' });
  if (Ranks.can(u, 'file')) list.push({ id: 'file', what: 'File your first record', done: false, link: '/staff/forms' });
  const rank = Ranks.get(u.rank);
  if (rank && rank.quota) list.push({ id: 'return', what: 'Write your first Weekly Return', done: false, link: '/staff/forms/weekly-return' });
  if (Ranks.can(u, 'jusinquire')) list.push({ id: 'inq', what: 'Open your first inquisition', done: false, link: '/justice/inquisitions' });
  return list;
}

function progress(u, rows, readMeta) {
  const list = steps(u);
  const mine = (rows || []).filter(r => {
    const m = readMeta ? (readMeta(r) || {}) : {};
    return m.filer === u.username;
  });
  return list.map(s => {
    if (s.id === 'file') return { ...s, done: mine.length > 0 };
    if (s.id === 'return') return { ...s, done: mine.some(r => r.Form === 'weekly-return') };
    if (s.id === 'petition') return { ...s, done: mine.some(r => r.Form === 'petition') || (rows || []).some(r => r.Form === 'petition' && r['Assigned To'] === u.username && r.Status !== 'Received') };
    return s;
  });
}

function hasSeenTour(u) {
  if (!u) return true;
  return !!(S.read(FILE, {})[u.username]);
}

function markTourSeen(u) {
  if (!u) return;
  S.update(FILE, {}, d => { d[u.username] = new Date().toISOString(); });
}

function resetTour(u) {
  if (!u) return;
  S.update(FILE, {}, d => { delete d[u.username]; });
}

module.exports = { TERMS, PLAIN, tourFor, duties, notYours, steps, progress, hasSeenTour, markTourSeen, resetTour };
