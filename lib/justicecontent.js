const OFFICE = [
  { id: 'minister', name: 'Minister of State for Justice', sub: 'Head of the Ministry', tone: 'blood', rank: 'justice-minister',
    duties: [
      'Directs the Ministry of Justice and answers for it before the Governor.',
      'Appoints the officers of the Ministry and the Judicial Office.',
      'Develops and approves the law and procedure of the Imperial courts in the province.',
      'Attends Cabinet as Minister of State.',
      'May not sit in judgment upon a matter they have caused to be brought.'
    ] },
  { id: 'secretary', name: 'Private Secretary', sub: 'To the Minister of State', tone: 'green', rank: 'justice-secretary',
    duties: [
      'Serves as secretary to the Minister of State for Justice.',
      'Keeps the correspondence and the appointments of the Ministry.',
      'Receives matters laid before the Ministry by the public and lays them before the proper officer.'
    ] },
  { id: 'inquisitor', name: 'Imperial Inquisitor', sub: 'Answerable to the Minister', tone: 'quill', rank: 'imperial-inquisitor',
    duties: [
      'Opens and conducts inquisitions into matters before the Ministry.',
      'Gathers evidence and takes the statements of witnesses.',
      'Reports findings to the Judicial Office and to the Minister.',
      'Does not prosecute, and does not sit in judgment.'
    ],
    note: 'The Inquisitor stands outside the Judicial Office so that the finding of fact and the judgment upon it are not in one hand.' }
];

const JUDICIAL = [
  { id: 'justice', name: 'Imperial Justice', sub: 'Head of the Judicial Office', tone: 'blood', rank: 'imperial-justice',
    duties: [
      'Sits in judgment upon matters brought before the bench.',
      'Sets hearings and orders the conduct of a matter.',
      'Gives judgment, and sets down the reasons for it.',
      'Directs the Prosecutor, the Advocate and the Court Clerk in the business of the Office.'
    ] },
  { id: 'prosecutor', name: 'Imperial Prosecutor', sub: 'Acts for the Empire', tone: 'quill', rank: 'imperial-prosecutor',
    duties: [
      'Brings charges at the suit of the Empire.',
      'Lays the case for the prosecution before the bench.',
      'May decline to prosecute where the evidence does not bear it.'
    ] },
  { id: 'advocate', name: 'Imperial Advocate', sub: 'Acts for a party', tone: 'quill', rank: 'imperial-advocate',
    duties: [
      'Acts for a party before the bench, whether accused or complainant.',
      'Answers the charge and lays the case for the party.',
      'Every subject of the Empire may have an Advocate assigned where they cannot find one.'
    ] },
  { id: 'clerk', name: 'Court Clerk', sub: 'Keeper of the bench', tone: 'green', rank: 'court-clerk',
    duties: [
      'Keeps the docket of matters and the papers entered upon them.',
      'Records the sittings of the bench and what passed at them.',
      'Answers matters laid by the public and tells them where their matter stands.'
    ] }
];

const PRINCIPLES = [
  { h: 'A matter is heard before it is judged', t: 'No judgment is given upon a matter until the bench has sat upon it and both parties have been heard, save where a party will not come.' },
  { h: 'The finder of fact is not the judge of it', t: 'The Imperial Inquisitor gathers the facts. The Imperial Justice weighs them. The two offices are kept apart.' },
  { h: 'Every party may be spoken for', t: 'An Imperial Advocate may act for any party before the bench, and is assigned where a party cannot find one.' },
  { h: 'The reasons are set down', t: 'A judgment carries the reasons for it, so that the parties and the province may know upon what ground it stands.' },
  { h: 'Jurisdiction is not taken by hearing', t: 'A matter belonging to a Jarl’s court, to another Ministry or to the Legion is referred there. Hearing it here does not take it from them.' },
  { h: 'The judgments are published', t: 'Judgments of the bench are entered in a public register, that the law may be known and not guessed at.' }
];

module.exports = { OFFICE, JUDICIAL, PRINCIPLES };
