// The Ministry of Finance as the org chart sets it out: the Minister, the
// Imperial Treasury, and the Census & Excise Office.

const OFFICE = [
  {
    name: 'Minister of State for the Finance', sub: 'Head of the Ministry', tone: 'blood', wing: '',
    duties: [
      'Answers to the Governor for the whole of the province’s money.',
      'Approves each month’s budget before a coin leaves the Treasury.',
      'Settles what share of the revenue each group draws.',
      'Hears what the Treasurer and the Inspector bring, and decides between them.'
    ]
  },
  {
    name: 'Imperial Treasurer', sub: 'Keeper of the provincial purse', tone: 'quill', wing: 'Imperial Treasury',
    duties: [
      'Keeps the Treasury and everything paid into or out of it.',
      'Prepares each month’s budget and sets the draws before it.',
      'Pays each group its draw and records the payment.',
      'Answers requests for money beyond the monthly draw.'
    ],
    requirement: 'Appointed by the Minister'
  },
  {
    name: 'Imperial Auditor', sub: 'Examines the accounts and closes them', tone: 'gold', wing: 'Imperial Treasury',
    duties: [
      'Examines every entry before the month is closed.',
      'Allows or refuses a warrant for payment upon the Treasury.',
      'Reports to the Minister where the accounts do not balance.',
      'May question any sum, however it was ordered.'
    ],
    note: 'The Auditor answers to the Minister, not to the Treasurer whose books they examine.'
  },
  {
    name: 'Treasury Secretary', sub: 'To the Imperial Treasurer', tone: 'green', wing: 'Imperial Treasury',
    duties: [
      'Draws up the month’s account and keeps the ledger true.',
      'Enters revenues as they are received.',
      'Prepares the payments the Treasurer orders.',
      'Keeps the rolls of who is paid what.'
    ]
  },
  {
    name: 'Treasury Clerk', sub: 'The Treasury’s hand', tone: 'mint', wing: 'Imperial Treasury',
    duties: [
      'Enters receipts as they come in.',
      'Copies and files the Treasury’s papers.',
      'Keeps the group rosters current.',
      'Attends the Secretary in all ordinary business.'
    ]
  },
  {
    name: 'Imperial Inspector of the Census and Excise Office', sub: 'Head of the Census & Excise Office', tone: 'quill', wing: 'Census & Excise Office',
    duties: [
      'Settles what each Hold and each trade owes.',
      'Sends the Officers and Agents into the Holds to collect it.',
      'Grants and revokes charters and licences to trade.',
      'Reports the province’s wealth to the Minister.'
    ],
    requirement: 'Appointed by the Minister'
  },
  {
    name: 'Census & Excise Officer', sub: 'In a Hold or upon a trade', tone: 'gold', wing: 'Census & Excise Office',
    duties: [
      'Assesses what is owed within their charge.',
      'Receives what is rendered and gives a receipt for it.',
      'Keeps the roll of arrears and pursues it.',
      'Examines charters and the goods that pass under them.'
    ]
  },
  {
    name: 'Agent', sub: 'In the field, for the Census & Excise Office', tone: 'green', wing: 'Census & Excise Office',
    duties: [
      'Goes where the Officer sends them and counts what is there.',
      'Carries demands and receipts between the Office and the subject.',
      'Reports smuggling, false weight and unchartered trade.',
      'Has no power to seize; that belongs to the Legion upon a warrant.'
    ],
    note: 'An Agent may ask and may look. An Agent may not take.'
  }
];

const WINGS = [
  { name: 'Imperial Treasury', lede: 'Keeps the purse. Receives the revenue, sets the budget, pays the groups their draws, and renders the account.' },
  { name: 'Census & Excise Office', lede: 'Finds the revenue. Assesses the Holds and the trades, collects what is owed, and charters those who trade under the Empire’s leave.' }
];

const PRINCIPLES = [
  ['Nothing leaves the purse but upon an order written down',
   'Every coin paid out of the Treasury stands against a draw the Minister approved or a request the Treasurer allowed. There is no other way for money to leave, and no officer, however high, may take from the purse by word alone.'],
  ['The month is a closed book once closed',
   'A month’s shares are settled before it is approved and cannot be changed after. When the month is closed its figures stand for good. If a mistake is found, it is corrected in the month that follows, plainly and with a note — never by altering what is already written.'],
  ['The Auditor is not the Treasurer’s servant',
   'The officer who keeps the money and the officer who checks it answer separately to the Minister. The Auditor may question any sum, whoever ordered it, and refuse any warrant that does not stand upon a lawful order.'],
  ['What is assessed is not what is taken',
   'The Census & Excise Office sets down what is owed and what has been rendered, and the difference between them is arrears, kept openly. Nothing may be demanded that was not first assessed, and nothing assessed may be quietly forgotten.'],
  ['An Agent may ask and look; an Agent may not take',
   'The Office’s people in the field count, question and report. Seizure is the Legion’s work and requires a warrant of the Imperial Bench. An Agent who takes upon their own authority has committed an offence of office.'],
  ['The account is rendered whether it is flattering or not',
   'The Ministry renders its account to the Governor at the end of each span, showing what came in, what went out and what stands unpaid. An account that shows only what is comfortable is not an account.']
];

module.exports = { OFFICE, WINGS, PRINCIPLES };
