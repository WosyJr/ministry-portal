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
  const rank = Ranks.get(u.rank);
  const holds = (rank && rank.holds) || u.holds || [];
  const holdNames = holds.map(h => (Ranks.HOLD_BY_ID[h] || {}).name || h);
  const first = holdNames[0] || 'your Hold';
  const seat = (Ranks.HOLD_BY_ID[holds[0]] || {}).seat || 'the Hold seat';
  const s = [];

  s.push({
    head: 'Welcome to the hall',
    body: `You are ${u.name}, ${u.title || u.rankName}. This takes a few minutes and shows you everything your office can do — not everything the Ministry can do, only what is actually yours. You can stop at any point and pick it up again from What You May Do.`,
    eg: ''
  });

  s.push({
    head: 'Start here: your Desk',
    body: 'The button at the top of every page, with a number on it. Everything meant for you lands there — letters, papers waiting on your hand, what you owe this week. You never have to hunt through the tabs for work that is yours.',
    eg: 'If the Minister writes to you, it opens on your screen the next time you come in, and then keeps on your Desk so you can read it again.'
  });

  if (holdNames.length) {
    s.push({
      head: 'These Holds are yours',
      body: `${holdNames.join(', ')}. That is your patch. Work filed in another Delegate's Holds is not your business and does not count toward what you owe. If something from elsewhere lands on you, pass it to whoever holds it rather than dealing with it yourself.`,
      eg: `Somebody in ${first} wants the Ministry to do something — that is yours. The same request from a Hold on your list's other side is not.`
    });
  }

  if (can('file')) {
    s.push({
      head: 'Filing a record',
      body: 'Writs is the drawer of blank forms. Pick the one that fits what happened, fill it in, send it. Each field tells you in plain words what it wants and shows an example in the box. You cannot break anything — nothing is final until it is sealed.',
      eg: 'Two people argued over a fishing stretch and you sat them down: that is a Record of Civil Conference and Accord. You write who was there, what each said, and what they agreed.'
    });
    s.push({
      head: 'What happens after you file',
      body: 'It goes to the Minister with the standing "Awaiting Seal". It is not yet a real paper. When they put the wax on it, you are told, and it becomes a document that counts. If something is wrong they send it back with a note, and you fix it and send it again.',
      eg: 'Save and finish later keeps a draft nobody else can see. Nothing is lost if you are called away mid-form.'
    });
  }

  if (can('petitions')) {
    s.push({
      head: 'Answering a petition',
      body: 'A subject of the Empire has asked the Ministry for something. You open it, find out, write down what you found, and set its standing. You answer it — you do not judge it. If it needs deciding rather than answering, refer it upward and say who to.',
      eg: 'Somebody asks for a copy of a land grant. You look, you find it, you say where it is and close it. If instead they are disputing who owns the land, that is not yours to settle — refer it.'
    });
  }

  if (can('docket')) {
    s.push({
      head: 'Finding anything again',
      body: 'The Docket is every record the Ministry holds, newest first. You see the ones your office is allowed to see, which is not all of them — that is by design, not a fault. Every record has a number, and numbers are how papers refer to each other.',
      eg: 'Searching for a person’s name on the People page is usually faster than the Docket. It shows everything that names them and how they were involved.'
    });
  }

  if (can('holds')) {
    s.push({
      head: 'The Holds pages',
      body: `Each Hold has a page: who rules it, who the Ministry deals with there, and every record touching it. It is the quickest way to see the state of a place before you go or before you write about it.`,
      eg: `Before riding to ${seat}, open the ${first} page and see what is already outstanding there.`
    });
  }

  if (can('jusinquire')) {
    s.push({
      head: 'You go out under a writ, never on your own word',
      body: 'An inquisition needs a Commission from the Minister. It names the matter, the ground of Imperial jurisdiction, and exactly which powers you hold. Anything left unticked is printed on the writ as expressly forbidden. Holding the office is not the same as holding the power.',
      eg: 'Without "searches of private property" ticked on your writ, you may not search, however obvious it seems. Ask the Minister to amend the commission instead.'
    });
    s.push({
      head: 'Setting down what you find',
      body: 'Every answer is marked for what it is — allegation, suspicion, corroborated fact, disputed fact, inference, or legal conclusion. You must look for what disproves the allegation as hard as what supports it, and anything favourable to the person investigated goes in the report whether you like it or not.',
      eg: 'A witness says they heard it from someone else. That is hearsay, not direct knowledge, and the statement is marked so — a statement whose weight cannot be judged is worth nothing to the Bench.'
    });
  }

  if (can('jusjudge')) {
    s.push({
      head: 'Giving judgment',
      body: 'You hear matters and decide them. The finding, the order and the reasons all go on the record, and published judgments can be read by anybody. Reasons matter more than the finding — a judgment nobody can follow cannot be relied on later.',
      eg: 'A judgment may be sealed by order of the bench, which withholds it from the public register until the seal is lifted.'
    });
  }

  if (can('approve')) {
    s.push({
      head: 'Yours is the hand that seals',
      body: 'What other officers file is not a real paper until you put the wax on it. The Approvals queue holds what is waiting, and the Desk shows you the count without going there. You can seal it, or send it back with a note saying what to fix.',
      eg: 'You can also set a seal on anything already signed, at any time, from the record itself — it does not have to be sitting in the queue.'
    });
  }

  if (rank && rank.quota) {
    s.push({
      head: 'What you owe each week',
      body: 'Every week runs Monday to Sunday. You owe a written Weekly Return on your Holds, a few records filed in them, and one duty drawn for you. Your Week shows what is done and what is still owed, and it fills itself in as you work — nothing to tick.',
      eg: 'The duty changes every Monday. One week it might be attending a Jarl’s court and writing up what was heard; the Minister can also set you a particular one.'
    });
    s.push({
      head: 'When a week closes',
      body: 'On Sunday night the week is written into your record as met or short, and it does not change afterwards. The Minister is told if you came up short. This is not meant as a trap — it is so a quiet Hold is noticed before the Jarl writes to the Minister about it.',
      eg: 'If you cannot do something, write that in the Return and say why. An honest short week with a reason is worth more than a silent one.'
    });
  }

  if (can('officers')) {
    s.push({
      head: 'The rolls',
      body: 'Officers shows who serves, at what rank, and what each may do. You can appoint, amend and stand people down — but you may only give a rank whose powers you already hold yourself. Nobody can appoint above themselves.',
      eg: 'Setting somebody to "not shown in the Directory" keeps them on the rolls but takes their name off the public hall.'
    });
  }

  if (can('correspondence')) {
    s.push({
      head: 'Letters and requests',
      body: 'Letters is for writing to officers of the Ministry — it opens on their screen next time they come in, and you can mark one that must be acknowledged before it will close. Ministry Requests is the separate business of other Ministries asking something of this one.',
      eg: 'A letter marked "must be acknowledged" shows you exactly who has set their hand to it and who has not yet entered the hall.'
    });
  }

  if (can('archives')) {
    s.push({
      head: 'The Archives',
      body: 'Where old records are put away. Nothing is ever deleted — archived means at rest, not gone, and it can be read again at any time.',
      eg: ''
    });
  }

  if (can('reports')) {
    s.push({
      head: 'Reports',
      body: 'What the Ministry has been doing, counted up by week — what was filed, what is still open, what is oldest. Useful for seeing where work has quietly stopped.',
      eg: ''
    });
  }

  s.push({
    head: 'Words you do not know',
    body: 'Any term the Ministry uses has a dotted line under it wherever it appears. Hover or tap it and you get one plain sentence. Nobody expects you to have learned the vocabulary first.',
    eg: 'Docket, standing, awaiting seal, writ, signet — all of them are explained this way, and listed together on your What You May Do page.'
  });

  s.push({
    head: 'That is the whole of it',
    body: 'What You May Do, under The Office, has all of this written out, plus what is NOT yours and why. There is a checklist on it that ticks itself as you do each thing for the first time. You can come back and be walked round again whenever you like.',
    eg: ''
  });

  return s;
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
