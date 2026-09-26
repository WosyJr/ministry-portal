const OFFICE = [
  { id: 'general', name: 'General of the Imperial Province', sub: 'Commander of the Legion', tone: 'dark',
    duties: [
      'Oversees all Legion forces in the province as its strategic leader.',
      'Develops and approves Imperial military regulations and policy.',
      'Manages relations with local rulers and leaders.',
      'Chairs the Military Tribunal.',
      'Signs off on all promotions within the Imperial War Office.',
      'Budget holder for the Imperial Legion.',
      'Attends Cabinet as Minister-without-portfolio.'
    ],
    note: 'If the General is vacant, the Legate assumes these responsibilities.' },
  { id: 'legate', name: 'Legate', sub: 'Operational leader of the Legion', tone: 'blood',
    duties: [
      'Oversees all Legion forces in the province as its operational leader.',
      'Manages the day to day operations of the Legion.',
      'Develops and implements Imperial military regulations and policy.',
      'Deputy budget holder for the Imperial Legion.',
      'Attends Cabinet as a non-voting member.',
      'Chairs the Imperial Legion Promotions Board.',
      'Signs off on all promotions within the Imperial Legion.'
    ] },
  { id: 'chief', name: 'Chief of the Imperial War Office', sub: 'Civil head of the War Office', tone: 'quill',
    duties: [
      'Oversees the civil elements of the Imperial War Office.',
      'Legal advisement to the Imperial Legion.',
      'Imperial Civil Liaison.',
      'Provides advice and guidance to the General and Legate.',
      'Develops Imperial military regulations and policy.',
      'Oversees Imperial Legion property ownership.',
      'Attends Cabinet as a non-voting member.'
    ] },
  { id: 'aide', name: 'Aide-de-Camp', sub: 'Secretary to the General and Legate', tone: 'green',
    duties: [
      'Serves as Secretary to the General and Legate.',
      'Appointed by the General or Legate.'
    ],
    requirement: 'Clerk or any Legion rank.' },
  { id: 'tribune', name: 'Tribune', sub: 'Advisor and deputy of operations', tone: 'gold',
    duties: [
      'Assists with the day to day operations of the Legion.',
      'Implements Imperial military regulations and policy.',
      'Attends Cabinet as advisor.',
      'Attends the Imperial Legion Promotions Board.'
    ] },
  { id: 'praefect', name: 'Praefect', sub: 'Diplomatic officer', tone: 'quill',
    duties: [
      'Assists with managing relations with local rulers and leaders.',
      'Provides diplomatic advice to the Imperial War Office.',
      'Serves as a point of contact for diplomatic affairs for the Legion.'
    ],
    requirement: 'Probationary Praefect. Any Centurion and above.' },
  { id: 'quaestor', name: 'Quaestor', sub: 'Keeper of the record', tone: 'quill',
    duties: [
      'Carries out the record keeping for the Imperial War Office.',
      'Assists with writing Imperial military regulations and policy.'
    ],
    requirement: 'Clerk and above, or any Legion rank.' },
  { id: 'palatine', name: 'Imperial Palatine', sub: 'Head of the Battlemage cohort', tone: 'violet',
    duties: [
      'Direction of the Battlemages out of character.',
      'The Palatine has final say on spells.',
      'Maximum of a Tier 4 spell.'
    ] }
];

const PATHS = [
  { id: 'infantry', name: 'Infantry Progression', tone: 'blood',
    steps: [
      { key: 'INFAN I', name: 'Basic Infantry Qualification', unlocks: 'Unlocks Orcish tier weapons.',
        learn: ['Learns how to play their role or job as infantry.', 'Learns basic formations.', 'Competent use of Legionary weapons.', 'Learns the arrest protocols and procedures.'] },
      { key: 'INFAN II', name: 'Advanced Infantry Qualification', unlocks: 'Unlocks up to Elven tier weapons.',
        learn: ['Knows how to use and fight in multiple formations.', 'Knows how to write reports.', 'Disciplined in Legion combat doctrine.', 'Works well in team tactics, and is competent in combat.'] },
      { key: 'INFAN III', name: 'Veteran Legionnaire Qualification', unlocks: 'Essential in the trials to earn Nordic tier weapons.',
        learn: ['Has their JLD qualification.', 'Is a Master Warrior, ideally.', 'Can write reports with detail and effectively.', 'Knows how to lead patrols, follow up on reports, run checkpoints.', 'Mastery of their chosen weapon class.', 'Disciplined in Legion combat doctrine.', 'Ability to instruct INFAN I clearly and effectively.', 'Effective in leading troops into combat.'] }
    ] },
  { id: 'archery', name: 'Archer Progression', tone: 'green',
    steps: [
      { key: 'ARC I', name: 'Basic Bowman Qualification', unlocks: 'Unlocks Orcish tier weapons.',
        learn: ['Learns how to play their role or job as an archer.', 'Basic formations and positioning.', 'Target identification and communication.', 'Target prioritisation.'] },
      { key: 'ARC II', name: 'Bowman Qualification', unlocks: 'Unlocks up to Elven tier weapons.',
        learn: ['Knows how to use and fight in multiple formations.', 'Knows how to reposition under pressure.', 'Knows how to write reports.', 'Disciplined in Legion combat doctrine, the Archer section.', 'Works well in team based tactics, and is competent in combat.', 'Proven as a competent marksman.'] },
      { key: 'ARC III', name: 'Veteran Markman Qualification', unlocks: 'Essential in the trials to earn the Nordic bow.',
        learn: ['Has their JLD qualification.', 'Is a Master Hunter, ideally.', 'Can write reports with detail and effectively.', 'Knows how to lead patrols, follow up on reports, run checkpoints.', 'Expertise with a bow.', 'Ability to instruct ARC I clearly and effectively.', 'Effective in leading archers in battle, coordination and positioning.'] }
    ] },
  { id: 'leadership', name: 'Leadership Progression', tone: 'quill',
    steps: [
      { key: 'JLD', name: 'Junior Leadership', unlocks: 'LDR — Patrol Leadership. This becomes the rank Decanus.',
        learn: ['Detail Leader qualification.', 'Authority to lead routine patrols, watches, escorts, checkpoints, and small details when delegated.', 'May brief and account for a small group of Legionaries.', 'May assist with recruit instruction.'] },
      { key: 'INST', name: 'Instructor', unlocks: 'Legion Instructor qualification.',
        learn: ['Eligible for more elaborate equipment cosmetic distinctions.', 'May formally teach Legion qualifications.', 'May administer evaluations.', 'May operate scheduled training days and classes.'] },
      { key: 'CMD', name: 'Operations', unlocks: 'CMD — Operations Leader, Officer and above.',
        learn: ['Mission Lead and Acting Commander qualification.', 'May plan multi-element operations when appointed.', 'May assign qualified patrol leaders to subordinate tasks.', 'Access to command planning maps and reports.'] }
    ] },
  { id: 'quartermaster', name: 'Quartermaster Progression', tone: 'gold',
    steps: [
      { key: 'QM I', name: 'Quartermaster Assistant', unlocks: 'Quartermaster Assistant qualification.',
        learn: ['Assists inventory.', 'Issues basic supplies under supervision.', 'Helps move supplies between garrisons.', 'Keeps simple logs.', 'Prepares partial kits and rations.'] },
      { key: 'QM II', name: 'Quartermaster', unlocks: 'Quartermaster qualification.',
        learn: ['Independently issues and requisitions equipment.', 'Maintains stock records.', 'Organises resupply.', 'Manages damaged or lost equipment.', 'Supports field operations.', 'Access to authority to issue normal equipment, and ability to approve requisitions.'] },
      { key: 'QM III', name: 'Senior Quartermaster', unlocks: 'Senior Quartermaster and Master of Stores qualification.',
        learn: ['Manages larger inventories.', 'Coordinates multiple supply locations.', 'Plans campaign logistics.', 'Trains assistants.', 'Handles unusual and special equipment requests.', 'Expanded acquisition authority, prestige administrative insignia, and may oversee Quartermaster trainees.'] }
    ] },
  { id: 'provost', name: 'Provost Progression', tone: 'quill',
    steps: [
      { key: 'PRO I', name: 'Provost Assistant', unlocks: '',
        learn: ['Prisoner handling.', 'Basic arrest procedure.', 'Warrant writing.', 'Searching and evidence handling.', 'Observing interviews.'] },
      { key: 'PRO II', name: 'Provost', unlocks: '',
        learn: ['Conducts lawful arrests.', 'Processes prisoners.', 'Serves warrants.', 'Conducts interviews and investigations.', 'Maintains evidence.'] },
      { key: 'PRO III', name: 'Senior Provost', unlocks: '',
        learn: ['Supervises sensitive investigations.', 'Trains Provosts.', 'Reviews warrants and evidence.', 'Coordinates major prisoner and security matters.'] }
    ] },
  { id: 'recruiting', name: 'Recruiter Progression', tone: 'gold',
    steps: [
      { key: 'REC I', name: 'Recruiter', unlocks: 'Legion Recruiter qualification.',
        learn: ['Explains Legion expectations in character.', 'Conducts the introductory questionnaire.', 'Brings candidates to the proper authority.'] },
      { key: 'REC II', name: 'Senior Recruiter', unlocks: 'Legion Senior Recruiter qualification.',
        learn: ['Supervises recruiters.', 'Organises recruitment drives.', 'Coordinates onboarding.'] }
    ] }
];

const CORPS = [
  { id: 'scouts', name: 'The Scout Corps', tone: 'green',
    lede: 'The eyes of the Legion. Entry is by the Scout Entry Exam, and requires PRO I and either ARC I or INFAN I.',
    ladder: [
      { rank: 'Scout', need: ['PRO 2', 'Advancement of INFAN 2 or ARC 2, whichever was chosen.'] },
      { rank: 'Speculator', need: ['PRO 2', 'INFAN 2 or ARC 2, whichever was chosen.', 'JLD'] },
      { rank: 'Chief Speculator', need: ['PRO 3', 'Advancement to INFAN 3 or ARC 3, whichever was chosen.', 'INST, for administering the scout entry exam.'] },
      { rank: 'Scout Marshal', need: ['PRO 3', 'INFAN 3 or ARC 3, whichever was chosen.', 'INST, for administering the scout entry exam.', 'CMD'] }
    ] },
  { id: 'battlemages', name: 'The Cohort of Imperial Battlemages', tone: 'violet',
    lede: 'Magi attached to the Legion, under an overall cap of twenty: three Palatine, six Battlemages and eleven Aspirants.',
    ladder: [
      { rank: 'Imperial Battlemage Aspirant', need: ['No more than Tier 2 spells may be cast by normal legionnaires, if they show promise.', 'Primarily healing magic and backline support.', 'Apprenticed to the Imperial Battlemages, only two per Battlemage.'] },
      { rank: 'Imperial Battlemage', need: ['Maximum of Tier 3 magic. May teach Tier 2 magic to Aspirants.', 'Expected to join regular Legion patrols.', 'Expected to take Aspirants and teach them the basics of magic.'] },
      { rank: 'Battlemage Palatine', need: ['Direction of the Battlemages out of character.', 'The Palatine has final say on spells.', 'Maximum of a Tier 4 spell.'] }
    ] }
];

module.exports = { OFFICE, PATHS, CORPS };
