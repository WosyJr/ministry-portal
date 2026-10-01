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
      at: '/staff/forms', point: '.inst-card, .inst-grid, .board .reqcard, main',
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
      at: '/staff/archives', point: '.actions, .act, main',
      head: 'The Archives',
      body: 'Where old records are put away. Nothing is ever deleted — archived means at rest, not gone, and it can be read again at any time.',
      eg: ''
    });
  }

  if (can('reports')) {
    s.push({
      at: '/staff/report', point: '.tally, .grid3, .panel, main',
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
    at: '/justice', point: '.warnav.staffrow, .warnav, main',
    head: 'Two rows of doors',
    body: 'The first row is open to anyone in Skyrim — the register of judgments, the book of offences, the courts of the Holds. The second row, marked Officers only, is yours. If a page is not in your rows, your office does not hold it.',
    eg: 'Persons Sought and Verify a Paper are public on purpose: a guard should be able to check a warrant somebody waves at him.'
  });

  s.push({
    at: '/justice/principles', point: '',
    head: 'Read this one page properly',
    body: 'How Justice Is Done sets out what the Ministry may do to a person, in what order, and what it may never do. Every page in your row is one step of that order made into a door. If you read nothing else here, read this.',
    eg: 'No person is held without a record of who ordered it and why. That is why Custody is a page and not a note in somebody’s pocket.'
  });

  if (can('juscases')) {
    s.push({
      at: '/justice/cases', point: 'table.ledger tbody tr, table.ledger, main',
      head: 'The Bench is the whole docket',
      body: 'Every case before the Ministry, in one table. The box above it filters as you type — by name, by kind, by standing — so you do not have to go hunting. Open any row for that case in full.',
      eg: 'Type a surname and the table narrows to that person’s cases while you type. Nothing is submitted; it is just the list getting shorter.'
    });
  }

  if (can('jusfile')) {
    s.push({
      at: '/justice/cases', point: 'details.addwrap, form.warform, main',
      head: 'This is where a case is opened',
      body: 'Open it upon the bench, at the foot of this page. That is the only place a new case begins. Everything afterwards hangs off the case it belongs to, which is why it is worth opening the right one rather than a second one.',
      eg: 'A guard reports a theft in Riften. You open the case here, and the report, the warrant and the judgment all attach to it from then on.'
    });
    s.push({
      at: '/justice/matters', point: '.board .reqcard, .board, main',
      head: 'What the public has sent in',
      body: 'Matters Laid is the queue of things laid by people outside the Ministry, through the public page. You set a standing and write the Ministry’s answer — and the person who laid it reads that answer with the number they were given. If it belongs on the bench, raise it and write the case number in.',
      eg: 'Raising a matter does not open the case for you. Open the case on the Bench first, then put its number here so the two are tied together.'
    });
  }

  if (can('jusinquire')) {
    s.push({
      at: '/justice/inquisitions', point: '.board .reqcard, .board, main',
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
      at: '/justice/desk', point: '.board .reqcard, .board, main',
      head: 'Your own desk tells you what is unfinished',
      body: 'Only your inquisitions, and under each one the Ministry lists what is still wanting: no writ issued, no Article 11 notice sent to the Hold, lines of inquiry nobody answered, emergency measures not yet reported. It is the one page that reads your work back to you.',
      eg: 'If it says "no notice to the Hold", that is Article 11 and it is overdue. Nobody else is going to catch that for you.'
    });
  }

  if (can('jusprosecute')) {
    s.push({
      at: '/justice/cases', point: 'table.ledger tbody tr, table.ledger, main',
      head: 'You act for the Empire, not against the person',
      body: 'Bringing a charge means putting the case and proving it. The burden is yours. If what you hold does not prove it, the right act is to say so and drop it — a charge brought and lost costs the Empire more than one never brought.',
      eg: 'Anything in your hands that helps the accused goes to their advocate. Holding it back is itself a matter the bench will take up.'
    });
  }

  if (can('jusadvocate')) {
    s.push({
      at: '/justice/cases', point: 'table.ledger tbody tr, table.ledger, main',
      head: 'You speak for a party',
      body: 'Your duty is to the person you act for, and it stops where misleading the bench begins. You may argue anything arguable; you may not put a thing you know to be false.',
      eg: 'If your client tells you plainly they did it, you can still make the Empire prove it. You cannot stand up and say they did not.'
    });
  }

  if (can('jusjudge')) {
    s.push({
      at: '/justice/cases', point: 'table.ledger tbody tr, table.ledger, main',
      head: 'Giving judgment',
      body: 'You hear matters and decide them. The finding, the order and the reasons all go on the record, and published judgments can be read by anybody. Reasons matter more than the finding — a judgment nobody can follow cannot be relied on later.',
      eg: 'A judgment may be sealed by order of the bench, which withholds it from the public register until the seal is lifted.'
    });
    s.push({
      at: '/justice/warrants', point: '.board .reqcard, .board, main',
      head: 'Warrants, and the return upon them',
      body: 'A warrant makes lawful a thing that would otherwise not be — an arrest, a search, a seizure. You issue it here; whoever carries it out comes back and records what happened, served or unserved. A warrant with no return on it is an open question.',
      eg: 'Anyone in Skyrim can check a warrant against the register on the public Verify a Paper page. That is deliberate.'
    });
    s.push({
      at: '/justice/sentences', point: '.reqcard, main',
      head: 'Sentences go out and come back',
      body: 'You order a sentence here. It then sits with the Provost — the Legion — until they record that it was carried out, or that it could not be. The Legion cannot order one and you do not carry one out; each half is on a different desk on purpose.',
      eg: 'A sentence sitting in Outstanding for weeks is a question for the War Office, not a fault in the record.'
    });
    s.push({
      at: '/justice/dues', point: '.reqcard, main',
      head: 'Fines and restitution are two different debts',
      body: 'A fine is paid to the Empire. Restitution is paid to the person who was wronged. They are kept on the same roll but never added together, and part-payments are recorded against each as they come in.',
      eg: 'Paying the fine does not discharge the restitution. Somebody will tell you it does.'
    });
  }

  if (can('juscomplaints')) {
    s.push({
      at: '/justice/complaints', point: '.reqcard, main',
      head: 'Complaints against our own',
      body: 'Anyone may complain of an Inquisitor from the public page, without an account and without giving their name to the Inquisitor concerned. An office that cannot be complained of is an office nobody can check.',
      eg: 'An Inquisitor cannot examine a complaint against an Inquisitor. Reading one is not the same as answering it — that falls to the bench or to an administrator.'
    });
  }

  s.push({
    at: '/justice/custody', point: 'table.ledger tbody tr, table.ledger, main',
    head: 'Who is being held, and on whose order',
    body: 'Every person in the Empire’s keeping, with the warrant behind it, since when, until when, and what surety stands for their bail. If somebody is held and not on this page, that is the fault — not the other way about.',
    eg: 'The paper and the bail bond both print from here, so a gaoler or a family can be handed something.'
  });

  s.push({
    at: '/justice/exhibits', point: '.reqcard, main',
    head: 'Things taken and kept',
    body: 'Anything the Ministry holds because it proves something, with every hand it has passed through written down. Sign for it when you take it. A gap in that chain is worth less at the bench than no exhibit at all.',
    eg: ''
  });

  s.push({
    at: '/justice/parties', point: '.partylist, .search-box, main',
    head: 'Everything about one person, in one place',
    body: 'Parties is the join. Give a name and it gathers their cases, whether accuser or accused, the findings against them, warrants in their name and any time they have been held. Faster than four registers, and the thing to open before you write about somebody.',
    eg: 'Worth doing before you issue a warrant. Somebody already held on another matter changes what you are about to order.'
  });

  if (can('jusadmin')) {
    s.push({
      at: '/justice/officers', point: 'table.ledger, main',
      head: 'Officers of Justice',
      body: 'You enter and manage the officers and ranks of this Ministry, and only of this Ministry. You may not give a rank whose powers you do not hold yourself — nobody appoints above themselves.',
      eg: ''
    });
  }

  s.push({
    at: '/justice/standards', point: '',
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
    at: '/war-office', point: '.warnav.staffrow, .warnav, main',
    head: 'Two rows of doors',
    body: 'The first row is open to anyone — what the Office is, the qualifications it keeps, the holdings it has. The second row, marked Officers only, is yours. If a page is not in your rows, your rank does not hold it.',
    eg: 'Send a Letter is public so a soldier or a civilian can write to the Office without an account.'
  });

  if (can('warroster')) {
    s.push({
      at: '/war-office/roster', point: 'table.ledger.roster, table.ledger, main',
      head: 'The Rolls, one unit at a time',
      body: 'Every legionary serving in Skyrim, grouped by rank, with their pay, their activity, their trade and their garrison. The tabs above the table pick the unit; the box beside it filters by name as you type. This is the muster — if somebody is not here, the Empire is not paying them.',
      eg: 'The chips beside a name are their qualifications. Hover one if you do not know what it means.'
    });
    s.push({
      at: '/war-office/writs', point: 'table.ledger, main',
      head: 'Writs of the Office',
      body: 'Orders, reports and findings, kept by kind in the tabs above. A writ can be entered and it can be struck, but it cannot be edited — that is the point of it. If it was wrong, strike it and enter the right one, and both facts stay on the record.',
      eg: 'A discharge that is not upon this roll is not a discharge.'
    });
  }

  if (can('warmanage')) {
    s.push({
      at: '/war-office/roster', point: 'details.addwrap, table.ledger.roster, main',
      head: 'Entering and amending a legionary',
      body: 'You enter people on the rolls and amend them from this same page — the form at the foot, or the amend link on a row. Every change keeps what was there before, so a soldier’s record reads as a career and not as a current state.',
      eg: 'Promoting somebody does not erase the rank they held. Both stand, with the date between them.'
    });
    s.push({
      at: '/war-office/promotions', point: '.board .promo, .board, main',
      head: 'Promotions are laid before the Board',
      body: 'This page is where proposals are approved or declined — it is not where they are made. A promotion is proposed from the legionary’s own page on the Rolls, and then it appears here for somebody other than the proposer to answer.',
      eg: 'That is deliberate: the officer who wants the promotion is not the officer who grants it.'
    });
    s.push({
      at: '/war-office/quota', point: 'table.ledger, main',
      head: 'Quota is the Legion’s own measure',
      body: 'What each legionary is expected to do in the period, set against what they have actually done. You enter the count beside each name. The Legion sets this target itself and closes a period when it is done with it.',
      eg: 'Somebody short two periods running is worth a conversation, not a writ. The page is for noticing, not punishing.'
    });
    s.push({
      at: '/war-office/treasury', point: '.warstats.big, .warstats, main',
      head: 'The Legion chest is its own chest',
      body: 'Separate from the Ministry of Finance ledger entirely. Money comes in, goes out, is set aside into reserve or drawn back from it — that in/out/reserve choice is the one control that matters when you enter a sum. Entries can be struck but not edited.',
      eg: 'Finance answers for the province’s purse. This is the Office’s own working chest, so pay is not late while two Ministries write to each other.'
    });
    s.push({
      at: '/war-office/provost', point: '.board .reqcard, .board, main',
      head: 'The Provost only ever makes a return',
      body: 'Both halves of this page come from the Ministry of Justice: warrants to be served, and sentences to be carried out. The Legion cannot create either. What you do here is record what happened — served, executed, or could not be done, and by whom.',
      eg: 'If a matter is more than military discipline it belongs to Justice, and sending it there is not giving ground.'
    });
    s.push({
      at: '/war-office/post', point: '.board .reqcard, .board, main',
      head: 'Letters from outside the Legion',
      body: 'Anyone can write to the Office without an account. Each letter gets a standing, can be laid upon a named officer, and takes an answer — which the writer reads back using their letter number. An unanswered letter is visible to everyone here, which is the point.',
      eg: ''
    });
  }

  s.push({
    at: '/war-office/properties', point: '.holdings .holding-card, .holdings, main',
    head: 'What the Legion actually holds',
    body: 'Forts, garrisons, watchtowers and storehouses, with who keeps each one, how many are in it, and what it costs to keep standing. Useful before writing about a place, and useful for knowing what the Empire is answerable for maintaining.',
    eg: 'This page is open to anyone. The Legion’s presence in a Hold is not a secret from the people living in it.'
  });

  if (can('waradmin')) {
    s.push({
      at: '/war-office/officers', point: 'table.ledger, main',
      head: 'Officers are not the same as the Rolls',
      body: 'This page gives somebody a way in at the staff entrance and sets what they may do in the portal. It does not put them on the Legion rolls — that is done under The Rolls. The two lists answer different questions and plenty of people are on one and not the other.',
      eg: 'You may not give a rank whose powers you do not hold yourself.'
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
      at: '/finance/requests', point: '.reqcard, .addwrap, main',
      head: 'You may ask, and that is all',
      body: 'Your office can lay a request for money beyond your group’s monthly draw, and see what became of it. You cannot see the ledger, the rosters or anybody else’s requests — that is deliberate rather than an oversight. The purse is kept narrow on purpose.',
      eg: 'Say what the money is for and what happens if it is not granted. A request with a reason is answered faster than one with only a number.'
    });
    return s.concat(closing('/finance'));
  }

  s.push({
    at: '/finance', point: '.warnav.staffrow, .warnav, main',
    head: 'Two rows of doors',
    body: 'The first row is open to anyone — how money is kept, the account, the register of charters. The second row, marked Officers only, is yours. If a page is not in your rows, your rank does not hold it.',
    eg: 'The Account is public on purpose. A province whose books nobody may see is a province whose books nobody trusts.'
  });

  s.push({
    at: '/finance/principles', point: '',
    head: 'How money is kept here',
    body: 'Read this once and the rest of the row explains itself. Every coin in and out carries the name of whoever ordered it, nothing is entered twice, and a month that has been closed is not quietly rewritten afterwards.',
    eg: ''
  });

  if (can('finledger')) {
    s.push({
      at: '/finance/overview', point: '.todo, .drawbanner, main',
      head: 'Start here — it tells you what is undone',
      body: 'The Overview is the month at a glance, and at the top of it is a list of what still wants doing, each line linking straight to the page that does it. Start your day here rather than going down the tabs one by one.',
      eg: 'If the month has no income entered yet, the first line of that list says so and takes you to the Monthly Budget.'
    });
    s.push({
      at: '/finance/months', point: '.numbox, main',
      head: 'A month is settled in three numbered steps',
      body: 'This one page is the whole month: first what came in, then what share each group draws of it, then a check that the two balance. The steps are numbered down the page. Everything on it is locked once the month leaves Draft, so this is where the thinking happens.',
      eg: 'A month takes its own copy of the standing shares when it opens, so changing Groups & Holds later never alters a month already settled.'
    });
  }

  if (can('finrevenue')) {
    s.push({
      at: '/finance/months', point: '.numbox, form.warform, main',
      head: 'Revenue is entered here and nowhere else',
      body: 'Step one of the Monthly Budget — income this month, by kind: the Exchange, the Holds’ taxes, the Mint’s tribute, and anything else. Under each box the rolls tell you what they already show, with a link to use that figure rather than typing it.',
      eg: 'Hold taxes are rendered a month behind. "Use what is owed" fills in what the Holds actually owe rather than making you add it up.'
    });
  }

  if (can('finledger')) {
    s.push({
      at: '/finance/months', point: '.sharetable, table.ledger, main',
      head: 'Each group’s share, and closing the month',
      body: 'Step two sets what share of each kind of income a group draws, plus a fixed sum if it has one. When the figures are right, the buttons at the foot carry the month through Approve, then Close. A closed month stands; reopening one is a deliberate act with your name on it.',
      eg: 'Nothing can be paid out at all while the month is still a Draft. If Pay Out looks dead, that is why.'
    });
  }

  if (can('finpay')) {
    s.push({
      at: '/finance/payout', point: 'table.ledger, main',
      head: 'Paying out is recording what actually left',
      body: 'Three tables: what each group is owed this month, requests that were allowed and are waiting on money, and what has already gone out. You record each payment against the thing that authorised it, and Undo is there if you fat-finger a figure.',
      eg: 'Paying an allowed request here closes that request at the same time. You do not have to go back and close it separately.'
    });
    s.push({
      at: '/finance/requests', point: '.reqcard, main',
      head: 'Asking for more than the draw',
      body: 'Where a group asks for money beyond its monthly share. You allow a sum, set a day to pay it by, and write why — or you turn it down, and the reason goes on the record either way. What you allow appears on Pay Out waiting for the money.',
      eg: 'A refusal with a reason is a decision. A refusal without one is a grievance that comes back next month.'
    });
  }

  s.push({
    at: '/finance/spending', point: 'table.ledger, main',
    head: 'Spending is what they did with it afterwards',
    body: 'Not income, and not payment — this is each group accounting for how it used money the Treasury already handed over. The Treasury does not direct any of it. It records it, so that next month’s budget is argued from what was actually needed rather than what was asked for.',
    eg: 'The column that matters is "not yet accounted for". A group that never logs anything is not doing anything wrong yet, but it is the thing to ask about.'
  });

  if (can('fintax')) {
    s.push({
      at: '/finance/assessments', point: '.reqcard, .warstats, main',
      head: 'An assessment is a claim, not a receipt',
      body: 'What a person or a trade owes, reckoned before anything is paid. Payments come in against it, in parts if need be, and what is left over is the arrears. You can remit one, and restore it again if that was wrong.',
      eg: 'The bar on each card is how much of it has actually been rendered. Empty bars past their day are what the Summons Roll is built from.'
    });
    s.push({
      at: '/finance/summons', point: 'table.ledger, .reqcard, main',
      head: 'The Summons Roll chases what went unpaid',
      body: 'Everything in arrears with no summons running is listed at the top, with a button to issue one from it. After that you record that it was served, record their answer, and close it as satisfied or withdrawn — or refer it to the Ministry of Justice.',
      eg: 'Each summons prints a paper that can be handed to the person. Referring one to Justice is the end of Finance’s part in it.'
    });
  }

  if (can('fincharter')) {
    s.push({
      at: '/finance/charters', point: '.reqcard, main',
      head: 'Charters, and the conditions on them',
      body: 'Leave to trade, to hold a market or to work a thing, with its conditions written on the face of it. Granted, amended, revoked and lapsed here, and readable by anybody in the public register. The fees taken feed the month’s other income.',
      eg: 'A condition you do not write down is a condition you cannot enforce later.'
    });
  }

  if (can('finmint')) {
    s.push({
      at: '/finance/mint', point: 'table.ledger, main',
      head: 'The Mint, and the assay that vouches for it',
      body: 'Coin issued and bullion held by metal, and beneath it the assays. The assay is the whole point of the page: it is the record that a coin is what it says it is, and it is where a false one is caught and written down.',
      eg: 'What the Mint renders to the Treasury shows up as the Mint tribute in the month’s income. The two pages are the same money.'
    });
  }

  if (can('finledger')) {
    s.push({
      at: '/finance/rosters', point: 'table.ledger.roster, .warstats, main',
      head: 'Rosters are for the record, not for paying',
      body: 'Headcount and payroll per group, so the Treasury knows what a group costs. Nobody is paid from this page. Some of it is drawn straight off the War Office muster and cannot be edited here, which is right — the Legion keeps its own rolls.',
      eg: 'You can paste a roster in from a spreadsheet and it will show you a preview before anything is entered.'
    });
    s.push({
      at: '/finance/people', point: '#peopletable, table.ledger, main',
      head: 'People & Wages is who was actually handed money',
      body: 'The wage book: what each person was paid, against what the rolls say they draw. You can pay a whole roll at once or one person at a time, and each name opens a running ledger of everything they have had.',
      eg: 'Rosters say what is owed. This page says what was paid. When they disagree, this one is the fact.'
    });
  }

  if (can('finadmin')) {
    s.push({
      at: '/finance/settings', point: 'table.ledger, main',
      head: 'The standing figures behind every month',
      body: 'Groups & Holds holds the defaults: each group’s share of each kind of income, its fixed sum, its bank account and pay period, and the monthly tax set against each Hold. A month copies these when it opens, so changing them here never disturbs a month already settled.',
      eg: 'Change a share here and this month keeps the old one. That is deliberate, and it is why a settled month can be trusted.'
    });
    s.push({
      at: '/finance/officers', point: 'table.ledger, main',
      head: 'Officers of Finance',
      body: 'You enter and manage the officers and ranks of this Ministry, and only of this Ministry. You may not give a rank whose powers you do not hold yourself.',
      eg: ''
    });
  }

  if (can('finaudit')) {
    s.push({
      at: '/finance/report', point: '.warstats, main',
      head: 'The report, and what closing is for',
      body: 'Pick a span of months and this renders the Treasurer’s account of it, with a printable version for the Governor. Your office exists to examine and close: a year nobody closed is a year nobody can rely on, however neat the figures look.',
      eg: 'Close deliberately. A month is reopened by a named person on the record, which is the only thing that makes closing mean anything.'
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

function articlesOf(u) {
  try { const C = require('./ceremony'); return C.articlesFor(u).concat([C.COMMON]); } catch (_) { return []; }
}

module.exports = { TERMS, PLAIN, articlesOf, tourFor, duties, notYours, steps, progress, branchHome, hasSeenTour, markTourSeen, resetTour };
