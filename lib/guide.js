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
  ['rounds', 'The records a Delegate is expected to file in their own Holds each week.'],
  ['inquisition', 'A formal investigation by an Inquisitor, opened under a Commission and ending in a report.'],
  ['warrant', 'A paper that permits something which would otherwise be unlawful — an arrest, a search, a seizure.'],
  ['custody', 'A person held by the Empire, and the record of why, by whose order, and until when.'],
  ['exhibit', 'A thing taken and kept because it proves something. Every hand it passes through is written down.'],
  ['judgment', 'What the bench decided, the order it made, and the reasons for both.'],
  ['restitution', 'Money a wrongdoer is ordered to pay the person they wronged, as distinct from a fine paid to the Empire.'],
  ['muster', 'The roll of who is actually serving, where, and under whom.'],
  ['quota', 'What an officer or a garrison is expected to produce or hold over a set period.'],
  ['charter', 'Leave granted by the Empire to trade, to hold a market, or to work a thing — and the conditions upon it.'],
  ['assessment', 'The Ministry’s reckoning of what somebody owes in tax, made before anything is paid.'],
  ['levy', 'A charge laid upon a place or a trade, as opposed to a tax upon a person.'],
  ['assay', 'The test of how much true metal is in a coin or a bar, and the record of the result.'],
  ['arrears', 'What was assessed and has not been paid.'],
  ['roll of office', 'The lineage of a post — everyone who has held it, since when, and why each one left it.']
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
  correspondence: ['Ministry Requests', 'Other Ministries asking something of this one, and the answers given.'],
  reports: ['Reports', 'What the Ministry has been doing, counted up by week.'],

  jusdesk: ['The Hall of Justice', 'Your own desk in Justice — what is set to your hand, and what is waiting on you.'],
  juscases: ['The Bench', 'The matters before the Ministry of Justice. You may read the ones your office is allowed to read.'],
  jusfile: ['Opening a matter', 'You can open a new matter and enter papers upon one already open. Everything you enter is dated and carries your name.'],
  jusinquire: ['Inquisitions', 'You gather facts under a Commission. You do not prosecute and you do not judge — you find out what happened and report it.'],
  jusprosecute: ['Bringing a charge', 'You act for the Empire. You put the case, and the burden of proving it is yours, not the accused’s.'],
  jusadvocate: ['Acting for a party', 'You speak for someone before the bench. Your duty to them is real, and it stops at the point of misleading the court.'],
  jusjudge: ['Judgment', 'You hear matters and decide them. The finding, the order and the reasons all go on the record.'],
  juscomplaints: ['Complaints', 'Matters laid by the public, including complaints against Inquisitors. You answer them.'],
  jusadmin: ['Officers of Justice', 'Entering and managing the officers and ranks of the Ministry of Justice.'],

  warroster: ['The Rolls', 'The Legion in Skyrim — who serves, where, at what rank, and what they are paid.'],
  warmanage: ['Entering and moving soldiers', 'You can enter people on the rolls, promote them, move them between garrisons, and keep the Office treasury straight.'],
  waradmin: ['Officers of the War Office', 'Entering and managing the officers and ranks of the War Office itself.'],

  finask: ['Asking for money', 'You may lay a request for money and see what became of it. You see nothing else of Finance, and that is deliberate.'],
  findesk: ['The Hall of Finance', 'Your own desk in Finance — requests waiting, and what is owed in and out.'],
  finledger: ['The Ledger', 'Every coin in and out of the provincial purse, with what it was for and who ordered it.'],
  finrevenue: ['Entering revenue', 'Money that has come in. You write down what arrived, from whom, and against what.'],
  finpay: ['Paying out', 'Ordering money out of the treasury. Nothing leaves without an order with a name on it.'],
  fintax: ['Assessments', 'Reckoning what a person or a trade owes, and entering what is actually rendered.'],
  fincharter: ['Charters', 'Granting and amending leave to trade, with the conditions written on the face of it.'],
  finmint: ['The Mint', 'Issuing coin, keeping the bullion, and recording every assay.'],
  finaudit: ['Audit', 'Examining the accounts and closing them. A closed month cannot be quietly rewritten afterwards.'],
  finadmin: ['Officers of Finance', 'Entering and managing the officers and ranks of the Ministry of Finance.']
};

const ROW = '.warnav.staffrow a, .warnav a, main';
const LEDGER = '.ledger tbody tr, .ledger, .board .reqcard, main';
const BOARD = '.board .reqcard, .board, main';

function opening(u, where, what) {
  return {
    at: where, point: '',
    head: 'Welcome to the hall',
    body: `You are ${u.name}, ${u.title || u.rankName}. This takes a few minutes and shows you everything your office can do — not everything ${what} can do, only what is actually yours. You can stop at any point and pick it up again from What You May Do.`,
    eg: ''
  };
}

function deskStep(where) {
  return {
    at: where, point: '#deskbtn', tryIt: '#deskbtn', tryLabel: 'open your Desk with the button lit above. It closes again with the ✕.',
    head: 'Start here: your Desk',
    body: 'The button at the top of every page, with a number on it. Everything meant for you lands there — letters, papers waiting on your hand, what you owe this week. You never have to hunt through the tabs for work that is yours.',
    eg: 'If the Minister writes to you, it opens on your screen the next time you come in, and then keeps on your Desk so you can read it again.'
  };
}

function closing(where) {
  return [
    {
      at: where, point: '',
      head: 'Words you do not know',
      body: 'Any term the Ministry uses has a dotted line under it wherever it appears. Hover or tap it and you get one plain sentence. Nobody expects you to have learned the vocabulary first.',
      eg: 'Docket, standing, awaiting seal, writ, signet — all of them are explained this way, and listed together on your What You May Do page.'
    },
    {
      at: '/staff/guide', point: '.footlist, .glossary, main',
      head: 'That is the whole of it',
      body: 'What You May Do has all of this written out, plus what is NOT yours and why. There is a checklist on it that ticks itself as you do each thing for the first time, and you can be walked round again whenever you like, from your Profile.',
      eg: ''
    }
  ];
}

function civilTour(u) {
  const can = p => Ranks.can(u, p);
  const rank = Ranks.get(u.rank);
  const holds = (rank && rank.holds) || u.holds || [];
  const holdNames = holds.map(h => (Ranks.HOLD_BY_ID[h] || {}).name || h);
  const first = holdNames[0] || 'your Hold';
  const seat = (Ranks.HOLD_BY_ID[holds[0]] || {}).seat || 'the Hold seat';
  const s = [];

  s.push(opening(u, '/staff', 'the Ministry'));
  s.push(deskStep('/staff'));

  if (holdNames.length) {
    s.push({
      at: '/staff/holds', point: '.board .reqcard, .ledger tbody tr, main',
      head: 'These Holds are yours',
      body: `${holdNames.join(', ')}. That is your patch. Work filed in another Delegate's Holds is not your business and does not count toward what you owe. If something from elsewhere lands on you, pass it to whoever holds it rather than dealing with it yourself.`,
      eg: `Somebody in ${first} wants the Ministry to do something — that is yours. The same request from a Hold on your list's other side is not.`
    });
  }

  if (can('file')) {
    s.push({
      at: '/staff/forms', point: '.board .reqcard, .board a, .formlist, main',
      head: 'Filing a record',
      body: 'Writs is the drawer of blank forms. Pick the one that fits what happened, fill it in, send it. Each field tells you in plain words what it wants and shows an example in the box. You cannot break anything — nothing is final until it is sealed.',
      eg: 'Two people argued over a fishing stretch and you sat them down: that is a Record of Civil Conference and Accord. You write who was there, what each said, and what they agreed.'
    });
    s.push({
      at: '/staff/forms', point: '',
      head: 'What happens after you file',
      body: 'It goes to the Minister with the standing "Awaiting Seal". It is not yet a real paper. When they put the wax on it, you are told, and it becomes a document that counts. If something is wrong they send it back with a note, and you fix it and send it again.',
      eg: 'Save and finish later keeps a draft nobody else can see. Nothing is lost if you are called away mid-form.'
    });
  }

  if (can('petitions')) {
    s.push({
      at: '/staff/petitions', point: LEDGER,
      head: 'Answering a petition',
      body: 'A subject of the Empire has asked the Ministry for something. You open it, find out, write down what you found, and set its standing. You answer it — you do not judge it. If it needs deciding rather than answering, refer it upward and say who to.',
      eg: 'Somebody asks for a copy of a land grant. You look, you find it, you say where it is and close it. If instead they are disputing who owns the land, that is not yours to settle — refer it.'
    });
  }

  if (can('docket')) {
    s.push({
      at: '/staff/docket', point: LEDGER,
      head: 'Finding anything again',
      body: 'The Docket is every record the Ministry holds, newest first. You see the ones your office is allowed to see, which is not all of them — that is by design, not a fault. Every record has a number, and numbers are how papers refer to each other.',
      eg: 'Searching for a person’s name on the People page is usually faster than the Docket. It shows everything that names them and how they were involved.'
    });
  }

  if (can('holds')) {
    s.push({
      at: '/staff/holds', point: '.board .reqcard, .ledger tbody tr, main',
      head: 'The Holds pages',
      body: 'Each Hold has a page: who rules it, who the Ministry deals with there, and every record touching it. It is the quickest way to see the state of a place before you go or before you write about it.',
      eg: `Before riding to ${seat}, open the ${first} page and see what is already outstanding there.`
    });
  }

  if (can('approve')) {
    s.push({
      at: '/staff/approvals', point: LEDGER,
      head: 'Yours is the hand that seals',
      body: 'What other officers file is not a real paper until you put the wax on it. The Approvals queue holds what is waiting, and the Desk shows you the count without going there. You can seal it, or send it back with a note saying what to fix.',
      eg: 'You can also set a seal on anything already signed, at any time, from the record itself — it does not have to be sitting in the queue.'
    });
  }

  if (rank && rank.quota) {
    s.push({
      at: '/staff/week', point: '.weeklist li, .weeklist, main',
      head: 'What you owe each week',
      body: 'Every week runs Monday to Sunday. You owe a written Weekly Return on your Holds, a few records filed in them, and one duty drawn for you. Your Week shows what is done and what is still owed, and it fills itself in as you work — nothing to tick.',
      eg: 'The duty changes every Monday. One week it might be attending a Jarl’s court and writing up what was heard; the Minister can also set you a particular one.'
    });
    s.push({
      at: '/staff/week', point: '',
      head: 'When a week closes',
      body: 'On Sunday night the week is written into your record as met or short, and it does not change afterwards. The Minister is told if you came up short. This is not meant as a trap — it is so a quiet Hold is noticed before the Jarl writes to the Minister about it.',
      eg: 'If you cannot do something, write that in the Return and say why. An honest short week with a reason is worth more than a silent one.'
    });
  }

  if (can('officers')) {
    s.push({
      at: '/staff/officers', point: LEDGER,
      head: 'The rolls',
      body: 'Officers shows who serves, at what rank, and what each may do. You can appoint, amend and stand people down — but you may only give a rank whose powers you already hold yourself. Nobody can appoint above themselves.',
      eg: 'Setting somebody to "not shown in the Directory" keeps them on the rolls but takes their name off the public hall.'
    });
  }

  if (can('correspondence')) {
    s.push({
      at: '/staff/letters', point: '.warform fieldset, .warform, main',
      head: 'Letters and requests',
      body: 'Letters is for writing to officers of the Ministry — it opens on their screen next time they come in, and you can mark one that must be acknowledged before it will close. Ministry Requests is the separate business of other Ministries asking something of this one.',
      eg: 'A letter marked "must be acknowledged" shows you exactly who has set their hand to it and who has not yet entered the hall.'
    });
  }

  if (can('archives')) {
    s.push({
      at: '/staff/archives', point: LEDGER,
      head: 'The Archives',
      body: 'Where old records are put away. Nothing is ever deleted — archived means at rest, not gone, and it can be read again at any time.',
      eg: ''
    });
  }

  if (can('reports')) {
    s.push({
      at: '/staff/report', point: BOARD,
      head: 'Reports',
      body: 'What the Ministry has been doing, counted up by week — what was filed, what is still open, what is oldest. Useful for seeing where work has quietly stopped.',
      eg: ''
    });
  }

  s.push({
    at: '/staff/roll', point: '.rollcard, .board .reqcard, main',
    head: 'The hall remembers who came before you',
    body: 'Every post of the Ministry keeps its lineage — who holds it, since when, and everyone before them. When you leave it, your name stays on the roll. You are not the first to sit in your chair and you will not be the last.',
    eg: 'Open any office here and you can read the whole succession, with the dates and why each one left it.'
  });

  s.push({
    at: '/staff', point: '#jumpbtn', tryIt: '#jumpbtn', tryLabel: 'open it — then type three letters of any page and press Enter.',
    head: 'The fastest way about the hall',
    body: 'Press the / key anywhere and type a few letters. It finds pages, and it finds records by their number. Once you know the hall, this is quicker than the tabs will ever be.',
    eg: 'Press / and type "doc" for the Docket, or type a record number like "Petition XII" to open it straight away.'
  });

  return s.concat(closing('/staff/guide'));
}

function justiceTour(u) {
  const can = p => Ranks.can(u, p);
  const s = [];
  s.push(opening(u, '/justice', 'the Ministry of Justice'));
  s.push(deskStep('/justice'));

  s.push({
    at: '/justice', point: ROW,
    head: 'Two rows of doors',
    body: 'The first row is open to anyone in Skyrim — the register of judgments, the book of offences, the courts of the Holds. The second row, marked Officers only, is yours. If a page is not in your rows, your office does not hold it.',
    eg: 'Persons Sought and Verify a Paper are public on purpose: a common soldier should be able to check a warrant somebody waves at him.'
  });

  s.push({
    at: '/justice/principles', point: 'main',
    head: 'How Justice is done here',
    body: 'Read this once and the rest follows. It sets out what the Ministry may do to a person, in what order, and what it may never do. Everything in the officers’ row is a step of that order, made into a door.',
    eg: 'No person is held without a record of who ordered it and why. That is why Custody is a page and not a note in somebody’s pocket.'
  });

  if (can('juscases')) {
    s.push({
      at: '/justice/cases', point: LEDGER,
      head: 'The Bench',
      body: 'Every matter before the Ministry, newest first. You can read the ones your office is allowed to read. Each carries its papers, its parties, and everything done to it in order, with dates.',
      eg: 'If a matter is not here, it has not been opened — a conversation in a tavern is not a matter until somebody files it.'
    });
  }

  if (can('jusfile')) {
    s.push({
      at: '/justice/matters', point: LEDGER,
      head: 'Opening a matter and entering papers',
      body: 'Matters Laid is where things arrive. You open a new matter, or add a paper to one already open. Everything you enter is dated and carries your name, and it cannot be quietly taken out again afterwards.',
      eg: 'A guard reports a theft in Riften. You open the matter, enter the report as the first paper, and it has a number from that moment.'
    });
  }

  if (can('jusinquire')) {
    s.push({
      at: '/justice/inquisitions', point: BOARD,
      head: 'You go out under a writ, never on your own word',
      body: 'An inquisition needs a Commission from the Minister. It names the matter, the ground of Imperial jurisdiction, and exactly which powers you hold. Anything left unticked is printed on the writ as expressly forbidden. Holding the office is not the same as holding the power.',
      eg: 'Without "searches of private property" ticked on your writ, you may not search, however obvious it seems. Ask the Minister to amend the commission instead.'
    });
    s.push({
      at: '/justice/inquisitions', point: '',
      head: 'What you may see of another Inquisitor’s work',
      body: 'Nothing, unless the Minister set you both to it or opened it to everyone. An inquisition is not a notice board. If one is missing from your list it is not a fault — it is not yours.',
      eg: 'Two Inquisitors can be set on the same matter deliberately, and then each sees everything the other enters.'
    });
    s.push({
      at: '/justice/inquisitions', point: '',
      head: 'Setting down what you find',
      body: 'Every answer is marked for what it is — allegation, suspicion, corroborated fact, disputed fact, inference, or legal conclusion. You must look for what disproves the allegation as hard as what supports it, and anything favourable to the person investigated goes in the report whether you like it or not.',
      eg: 'A witness says they heard it from someone else. That is hearsay, not direct knowledge, and the statement is marked so — a statement whose weight cannot be judged is worth nothing to the bench.'
    });
    s.push({
      at: '/justice/desk', point: BOARD,
      head: 'Your own desk in Justice',
      body: 'Everything set to your hand in one place — your inquisitions, what is waiting on you, and nothing belonging to anybody else. Start here rather than going down the tabs one by one.',
      eg: ''
    });
  }

  if (can('jusprosecute')) {
    s.push({
      at: '/justice/cases', point: LEDGER,
      head: 'You act for the Empire, not against the person',
      body: 'Bringing a charge means putting the case and proving it. The burden is yours. If what you hold does not prove it, the right act is to say so and drop it — a charge brought and lost costs the Empire more than one never brought.',
      eg: 'Anything in your hands that helps the accused goes to their advocate. Holding it back is itself a matter the bench will take up.'
    });
  }

  if (can('jusadvocate')) {
    s.push({
      at: '/justice/cases', point: LEDGER,
      head: 'You speak for a party',
      body: 'Your duty is to the person you act for, and it stops where misleading the bench begins. You may argue anything arguable; you may not put a thing you know to be false.',
      eg: 'If your client tells you plainly they did it, you can still make the Empire prove it. You cannot stand up and say they did not.'
    });
  }

  if (can('jusjudge')) {
    s.push({
      at: '/justice/cases', point: LEDGER,
      head: 'Giving judgment',
      body: 'You hear matters and decide them. The finding, the order and the reasons all go on the record, and published judgments can be read by anybody. Reasons matter more than the finding — a judgment nobody can follow cannot be relied on later.',
      eg: 'A judgment may be sealed by order of the bench, which withholds it from the public register until the seal is lifted.'
    });
    s.push({
      at: '/justice/warrants', point: LEDGER,
      head: 'Warrants',
      body: 'A warrant is what makes lawful a thing that would otherwise not be — an arrest, a search, a seizure. It names what is permitted and for how long. When it lapses it stops working, and nobody has to remember to say so.',
      eg: 'Anyone in Skyrim can check a warrant against the register on the public Verify a Paper page. That is deliberate.'
    });
    s.push({
      at: '/justice/sentences', point: LEDGER,
      head: 'Sentences and what follows',
      body: 'A sentence passed is recorded with its term and its conditions. Fines and restitution go on their own roll, so that what is owed to the Empire and what is owed to the wronged person are never confused.',
      eg: 'A fine paid to the Empire does not discharge restitution owed to the person robbed. They are two debts.'
    });
  }

  if (can('juscomplaints')) {
    s.push({
      at: '/justice/complaints', point: LEDGER,
      head: 'Complaints against our own',
      body: 'Anyone may complain of an Inquisitor from the public page, without an account and without giving their name to the Inquisitor concerned. You answer these. An office that cannot be complained of is an office nobody can check.',
      eg: 'A complaint can be answered or struck, and either way the reason is written down and kept.'
    });
  }

  s.push({
    at: '/justice/custody', point: LEDGER,
    head: 'Custody and exhibits',
    body: 'A person held by the Empire has a record of who ordered it, why, and until when. A thing taken and kept has a record of every hand it has passed through. Both exist so nobody has to take an officer’s word for it later.',
    eg: 'An exhibit with a gap in its chain of hands is worth less at the bench than one with none. Sign for it when you take it.'
  });

  if (can('jusadmin')) {
    s.push({
      at: '/justice/officers', point: LEDGER,
      head: 'Officers of Justice',
      body: 'You enter and manage the officers and ranks of this Ministry, and only of this Ministry. You may not give a rank whose powers you do not hold yourself.',
      eg: ''
    });
  }

  s.push({
    at: '/justice/standards', point: 'main',
    head: 'The Inquisitors’ Standards',
    body: 'The standing orders every Inquisitor works under, in full and in public. Read them before your first commission and keep them to hand. The parts about what must not be done matter more than the parts about what may.',
    eg: 'They are public on purpose. A person being investigated is entitled to know the rules their investigator is bound by.'
  });

  return s.concat(closing('/justice'));
}

function warTour(u) {
  const can = p => Ranks.can(u, p);
  const s = [];
  s.push(opening(u, '/war-office', 'the War Office'));
  s.push(deskStep('/war-office'));

  s.push({
    at: '/war-office', point: ROW,
    head: 'Two rows of doors',
    body: 'The first row is open to anyone — what the Office is, what qualifications it keeps, what holdings it has. The second row, marked Officers only, is yours. If a page is not in your rows, your rank does not hold it.',
    eg: 'Send a Letter is public so a soldier or a civilian can write to the Office without an account.'
  });

  if (can('warroster')) {
    s.push({
      at: '/war-office/roster', point: LEDGER,
      head: 'The Rolls',
      body: 'Every soldier of the Legion in Skyrim — rank, garrison, when they came on, and what they are paid. This is the muster. If somebody is not here, the Empire is not paying them and does not owe them.',
      eg: 'Search by name or by garrison. Opening a soldier shows their whole service, promotions and all.'
    });
    s.push({
      at: '/war-office/writs', point: LEDGER,
      head: 'Writs of the Office',
      body: 'Orders, commissions, discharges and leave — every paper the Office issues, kept by kind. A soldier holding a paper can have it checked against this roll.',
      eg: 'A discharge that is not upon this roll is not a discharge.'
    });
  }

  if (can('warmanage')) {
    s.push({
      at: '/war-office/promotions', point: LEDGER,
      head: 'Promotions and movements',
      body: 'You can enter people on the rolls, promote them, and move them between garrisons. Every change is dated and keeps the old entry, so a soldier’s record reads as a career and not as a current state.',
      eg: 'Promoting somebody does not erase the rank they held. Both stand on the record, with the date between them.'
    });
    s.push({
      at: '/war-office/quota', point: LEDGER,
      head: 'Quota',
      body: 'What each garrison is expected to hold and produce, set against what it actually has. This is where a garrison quietly running under strength becomes visible before it becomes a problem.',
      eg: 'A garrison short three for two months running is worth a letter to its commander, not a note in a drawer.'
    });
    s.push({
      at: '/war-office/treasury', point: LEDGER,
      head: 'The Office treasury',
      body: 'Pay, supply, and what the Office holds. It answers to Finance in the end, but the day-to-day reckoning is kept here so that pay is not late while two Ministries write to each other.',
      eg: ''
    });
    s.push({
      at: '/war-office/provost', point: LEDGER,
      head: 'Provost warrants',
      body: 'Discipline within the Legion. A warrant names the soldier, the matter, and who ordered it. A soldier is not held on somebody’s say-so, the same as anybody else.',
      eg: 'Where a matter is more than military discipline, it goes to the Ministry of Justice. Say so on the warrant rather than keeping it in-house.'
    });
  }

  s.push({
    at: '/war-office/properties', point: LEDGER,
    head: 'Holdings',
    body: 'Forts, camps, towers and what the Legion keeps in them. Useful before writing about a place, and useful for knowing what the Empire is actually answerable for maintaining.',
    eg: ''
  });

  if (can('waradmin')) {
    s.push({
      at: '/war-office/officers', point: LEDGER,
      head: 'Officers of the War Office',
      body: 'You enter and manage the officers and ranks of the War Office, and only of the War Office. You may not give a rank whose powers you do not hold yourself.',
      eg: ''
    });
  }

  return s.concat(closing('/war-office'));
}

function financeTour(u) {
  const can = p => Ranks.can(u, p);
  const s = [];
  s.push(opening(u, '/finance', 'the Ministry of Finance'));
  s.push(deskStep('/finance'));

  if (!can('findesk') && can('finask')) {
    s.push({
      at: '/finance/requests', point: LEDGER,
      head: 'You may ask, and that is all',
      body: 'Your office can lay a request for money and see what became of it. You cannot see the ledger, the rosters, or anybody else’s requests — that is deliberate rather than an oversight. The purse is kept narrow on purpose.',
      eg: 'Say plainly what the money is for and what happens if it is not granted. A request with a reason is answered faster than one with only a number.'
    });
    return s.concat(closing('/finance'));
  }

  s.push({
    at: '/finance', point: ROW,
    head: 'Two rows of doors',
    body: 'The first row is open to anyone — how money is kept, the account, the register of charters. The second row, marked Officers only, is yours. If a page is not in your rows, your rank does not hold it.',
    eg: 'The Account is public on purpose. A province whose books nobody may see is a province whose books nobody trusts.'
  });

  s.push({
    at: '/finance/principles', point: 'main',
    head: 'How money is kept',
    body: 'Read this once. Every coin in and out has an order with a name on it, nothing is entered twice, and a closed month cannot be quietly rewritten. The pages that follow are those rules made into doors.',
    eg: ''
  });

  if (can('finledger')) {
    s.push({
      at: '/finance/overview', point: BOARD,
      head: 'Where the purse stands',
      body: 'What is in, what is out, what is owed and what is expected. Start here before answering anybody who asks whether the Ministry can afford a thing.',
      eg: ''
    });
    s.push({
      at: '/finance/months', point: LEDGER,
      head: 'The month',
      body: 'Money is kept by month. Within an open month entries can be corrected; once a month is closed by audit it stands, and a correction becomes its own dated entry in the next one.',
      eg: 'That is why an error found late appears twice — once wrong, once put right. Both are meant to be visible.'
    });
  }

  if (can('finrevenue')) {
    s.push({
      at: '/finance/spending', point: LEDGER,
      head: 'Entering what comes in',
      body: 'Write down what arrived, from whom, and against what. Money with no stated source is the thing an auditor will stop on, and rightly.',
      eg: 'Tax rendered goes against its assessment, so that what was owed and what was paid can be read side by side.'
    });
  }

  if (can('finpay')) {
    s.push({
      at: '/finance/payout', point: LEDGER,
      head: 'Paying out',
      body: 'Nothing leaves the treasury without an order carrying a name. You order the payment, it is recorded against whatever authorised it, and the request it answers is marked.',
      eg: 'Paying a request from another Ministry closes that request at the same time. You do not have to go and close it separately.'
    });
    s.push({
      at: '/finance/requests', point: LEDGER,
      head: 'Requests from elsewhere',
      body: 'Other Ministries and officers asking for money. You grant, refuse or part-grant, and the reason goes on the record either way. A refusal with a reason is a decision; a refusal without one is a grievance.',
      eg: ''
    });
  }

  if (can('fintax')) {
    s.push({
      at: '/finance/assessments', point: LEDGER,
      head: 'Assessments',
      body: 'The reckoning of what is owed, made before anything is paid. It is a claim, not a receipt. When payment comes in it goes against the assessment, and what is left over is the arrears.',
      eg: 'The Summons Roll is what is left unpaid past its day. Work from that rather than from memory.'
    });
  }

  if (can('fincharter')) {
    s.push({
      at: '/finance/charters', point: LEDGER,
      head: 'Charters',
      body: 'Leave to trade, to hold a market, or to work a thing — with its conditions written on the face of it. Granted, amended and revoked here, and readable by anybody in the public register.',
      eg: 'A condition you do not write down is a condition you cannot enforce later.'
    });
  }

  if (can('finmint')) {
    s.push({
      at: '/finance/mint', point: LEDGER,
      head: 'The Mint',
      body: 'Coin issued, bullion held, and every assay recorded. The assay is the point of the page: it is the record that the coin is what it says it is.',
      eg: ''
    });
  }

  if (can('finaudit')) {
    s.push({
      at: '/finance/report', point: BOARD,
      head: 'Audit and closing',
      body: 'You examine the accounts and close them. A closed month is fixed. Close deliberately — closing is the whole value of the office, and an unclosed year is a year nobody can rely on.',
      eg: ''
    });
  }

  if (can('finadmin')) {
    s.push({
      at: '/finance/officers', point: LEDGER,
      head: 'Officers of Finance',
      body: 'You enter and manage the officers and ranks of this Ministry, and only of this Ministry. You may not give a rank whose powers you do not hold yourself.',
      eg: ''
    });
  }

  return s.concat(closing('/finance'));
}

function passTour(u) {
  return [
    opening(u, '/hall', 'the Ministry'),
    deskStep('/hall'),
    {
      at: '/hall', point: '',
      head: 'You hold a pass, and no office',
      body: 'A pass is a way in. It carries none of the Ministry’s powers, and nothing here is broken — your rank simply holds no doors yet. If you are given an office, the hall opens for it and this tour will have a great deal more in it.',
      eg: 'Everything in the public rows is open to you, the same as to anybody in Skyrim.'
    }
  ].concat(closing('/hall'));
}

function tourFor(u) {
  if (!u) return [];
  if (u.all) return civilTour(u);
  const branch = Ranks.userBranch(u);
  if (branch === 'justice') return justiceTour(u);
  if (branch === 'war') return warTour(u);
  if (branch === 'finance') return financeTour(u);
  if (!Ranks.can(u, 'docket') && !Ranks.can(u, 'file') && !Ranks.can(u, 'petitions')) return passTour(u);
  return civilTour(u);
}

const CIVIL_ORDER = ['file', 'petitions', 'docket', 'approve', 'holds', 'correspondence', 'archives', 'officers', 'reports'];
const JUSTICE_ORDER = ['jusdesk', 'juscases', 'jusfile', 'jusinquire', 'jusprosecute', 'jusadvocate', 'jusjudge', 'juscomplaints', 'jusadmin'];
const WAR_ORDER = ['warroster', 'warmanage', 'waradmin'];
const FINANCE_ORDER = ['finask', 'findesk', 'finledger', 'finrevenue', 'finpay', 'fintax', 'fincharter', 'finmint', 'finaudit', 'finadmin'];

function orderFor(u) {
  if (u && u.all) return [...CIVIL_ORDER, ...JUSTICE_ORDER, ...WAR_ORDER, ...FINANCE_ORDER];
  const branch = Ranks.userBranch(u);
  if (branch === 'justice') return JUSTICE_ORDER;
  if (branch === 'war') return WAR_ORDER;
  if (branch === 'finance') return FINANCE_ORDER;
  return CIVIL_ORDER;
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
  if (Ranks.can(u, 'desk')) add('desk');
  orderFor(u).forEach(p => { if (Ranks.can(u, p)) add(p); });
  return out;
}

function notYours(u) {
  if (!u) return [];
  const out = [];
  const cannot = p => !Ranks.can(u, p);
  const branch = Ranks.userBranch(u);

  if (branch === 'justice' && !u.all) {
    if (cannot('jusjudge')) out.push('You cannot judge a matter, set a hearing, or give a sentence. That is the bench.');
    if (cannot('jusinquire')) out.push('You cannot open or conduct an inquisition. That is an Inquisitor, under a Commission from the Minister.');
    if (cannot('jusprosecute')) out.push('You cannot bring a charge or act for the Empire against a person.');
    if (cannot('jusadvocate')) out.push('You cannot act for a party before the bench.');
    if (cannot('juscomplaints')) out.push('You cannot answer or strike a complaint laid by the public.');
    if (cannot('jusadmin')) out.push('You cannot appoint anyone in Justice or change what another officer may do.');
    if (Ranks.can(u, 'jusinquire')) out.push('You cannot see another Inquisitor’s work unless the Minister set you both to it or opened it to everyone.');
    out.push('You hold nothing in the other Ministries. Civil Affairs, Finance and the War Office keep their own rolls, and theirs are shut to you as yours are to them.');
    return out;
  }

  if (branch === 'war' && !u.all) {
    if (cannot('warmanage')) out.push('You cannot enter, promote or move anybody upon the rolls. You may read them.');
    if (cannot('waradmin')) out.push('You cannot appoint officers of the War Office or change what they may do.');
    out.push('You cannot discipline a soldier for a matter that is more than military. That belongs to the Ministry of Justice, and sending it there is not giving ground.');
    out.push('You hold nothing in the other Ministries. Civil Affairs, Justice and Finance keep their own rolls.');
    return out;
  }

  if (branch === 'finance' && !u.all) {
    if (cannot('finledger')) out.push('You cannot read the treasury ledger or the accounts.');
    if (cannot('finpay')) out.push('You cannot order money out of the treasury.');
    if (cannot('finrevenue')) out.push('You cannot enter revenue received.');
    if (cannot('fintax')) out.push('You cannot assess a tax or a levy.');
    if (cannot('finaudit')) out.push('You cannot close an accounting month. Once it is closed, it stands.');
    if (cannot('finadmin')) out.push('You cannot appoint anyone in Finance or change what another officer may do.');
    out.push('You hold nothing in the other Ministries. Civil Affairs, Justice and the War Office keep their own rolls.');
    return out;
  }

  if (cannot('approve')) out.push('You cannot put the seal on a record. That is the Minister’s hand, and it is what makes a paper real.');
  if (cannot('jusjudge')) out.push('You cannot judge a matter or give a punishment. That is the Ministry of Justice and its bench.');
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
  const branch = Ranks.userBranch(u);

  if (branch === 'justice' && !u.all) {
    if (Ranks.can(u, 'juscases')) list.push({ id: 'readcase', what: 'Open a matter on the bench and read it through', done: false, link: '/justice/cases' });
    if (Ranks.can(u, 'jusinquire')) list.push({ id: 'inq', what: 'Open your first inquisition', done: false, link: '/justice/inquisitions' });
    if (Ranks.can(u, 'jusfile')) list.push({ id: 'jusfile', what: 'Enter your first paper upon a matter', done: false, link: '/justice/matters' });
    list.push({ id: 'standards', what: 'Read the Inquisitors’ Standards once through', done: false, link: '/justice/standards' });
    return list;
  }
  if (branch === 'war' && !u.all) {
    if (Ranks.can(u, 'warroster')) list.push({ id: 'roster', what: 'Find somebody upon the rolls', done: false, link: '/war-office/roster' });
    if (Ranks.can(u, 'warmanage')) list.push({ id: 'promote', what: 'Enter or promote your first soldier', done: false, link: '/war-office/promotions' });
    list.push({ id: 'holdings', what: 'Look over the Legion’s holdings', done: false, link: '/war-office/properties' });
    return list;
  }
  if (branch === 'finance' && !u.all) {
    if (Ranks.can(u, 'finask') && !Ranks.can(u, 'findesk')) {
      list.push({ id: 'ask', what: 'Lay your first request for money', done: false, link: '/finance/requests' });
      return list;
    }
    if (Ranks.can(u, 'finledger')) list.push({ id: 'ledger', what: 'Read a month through in the ledger', done: false, link: '/finance/months' });
    if (Ranks.can(u, 'finrevenue') || Ranks.can(u, 'finpay')) list.push({ id: 'entry', what: 'Make your first entry', done: false, link: '/finance/overview' });
    if (Ranks.can(u, 'finaudit')) list.push({ id: 'close', what: 'Close your first month', done: false, link: '/finance/report' });
    return list;
  }

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

function branchHome(u) {
  if (!u) return '/';
  if (u.all) return '/staff';
  const branch = Ranks.userBranch(u);
  if (branch === 'justice') return '/justice';
  if (branch === 'war') return '/war-office';
  if (branch === 'finance') return '/finance';
  if (Ranks.can(u, 'desk')) return '/staff';
  return '/hall';
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

module.exports = { TERMS, PLAIN, tourFor, duties, notYours, steps, progress, branchHome, hasSeenTour, markTourSeen, resetTour };
