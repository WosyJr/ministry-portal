const SIT = [
  { cat: 'Petitions', t: 'Citizen wants to file a complaint or grievance', form: 'petition', handler: 'Civil Clerk', steps: [
    ['Receive the person respectfully', 'Do not promise any outcome.'],
    ['Open the Petition form and record their name, Hold, statement and the relief they seek', 'The Petition number and date are assigned when you file.'],
    ['Decide competence', 'If plainly outside the Ministry, file a Writ of Referral instead of routing it.'],
    ['Route it', 'Ordinary Hold relations go to the assigned Envoy. Significant or cross-Hold matters go to the Imperial Emissary.'],
    ['File it', 'The record is written to Petitions & Civil Matters and entered in the Docket.']],
    caution: 'Do not open an Adjudicator Inquiry yourself. Only the Emissary or other lawful authority may authorize one.', also: ['referral', 'matter'] },
  { cat: 'Petitions', t: 'A matter needs tracking beyond simple intake', form: 'matter', handler: 'Civil Clerk / supervising Civil officer', steps: [
    ['Open a Record of Administrative Matter', ''],
    ['Link the originating record', 'Petition, Dispatch, Correspondence or Referral number.'],
    ['Complete the competence review and routing decision', ''],
    ['File it and keep its Docket status current until closed', '']], also: ['petition'] },
  { cat: 'Inquiries', t: 'Envoy reports suspected administrative misconduct', form: 'dispatch', handler: 'Imperial Envoy → Imperial Emissary', steps: [
    ['File the Dispatch from the Holds', ''],
    ['Open a Record of Administrative Matter if directed', ''],
    ['Send to the Imperial Emissary', 'The Emissary decides whether to assign an Inquiry to the Adjudicator.']], also: ['matter'] },
  { cat: 'Inquiries', t: 'The Emissary authorizes an administrative inquiry', form: 'inquiry', handler: 'Imperial Adjudicator', steps: [
    ["Open the Adjudicator's Book with the authorizing officer and precise scope", ''],
    ['Issue a Writ of Administrative Inquiry if the subject should receive formal notice', ''],
    ['Gather records and statements, noting each source and date', 'Remain neutral. Weigh each allegation separately.'],
    ['If a crime appears, preserve the evidence and file a Writ of Referral', 'The Adjudicator does not prosecute.'],
    ['Close with a Finding of the Imperial Adjudicator', 'Supported, Partially Supported, Unsupported, or Inconclusive.']],
    caution: 'The Adjudicator is not an Imperial Inquisitor, judge, prosecutor or peace officer.', also: ['inquiry-writ', 'finding', 'referral'] },
  { cat: 'Inquiries', t: 'The Adjudicator discovers evidence of a crime', form: 'referral', handler: 'Imperial Adjudicator / responsible officer', steps: [
    ['Keep the evidence in the Inquiry record', ''],
    ['File a Writ of Referral naming the competent Hold, Legion or judicial authority', ''],
    ['List the records transmitted and obtain senior approval', ''],
    ['Record the acknowledgment when it returns', '']],
    caution: 'Referral preserves jurisdiction; it does not transfer the crime to the Ministry.', also: ['inquiry'] },
  { cat: 'Correspondence', t: "A Jarl's office or other authority sends an official letter", form: 'correspondence', handler: 'Registry Secretary / Clerk', steps: [
    ['File the letter in the Register of Imperial Correspondence', 'Record sender, recipient, date, subject and a summary.'],
    ['Route it to the responsible officer and record the action', 'Reply, File, Publish, Refer or Await.']] },
  { cat: 'Correspondence', t: 'The Ministry needs records held by another office', form: 'requisition', handler: 'Minister or properly delegated official', steps: [
    ['File a Ministerial Requisition stating the Ministry function that requires the records', ''],
    ["Obtain the Minister's or delegated official's signature", ''],
    ['Dispatch it and log it in the Register of Imperial Correspondence', '']],
    caution: 'A Requisition cannot seize jurisdiction or replace judicial process.', also: ['correspondence'] },
  { cat: 'Press & Literature', t: 'The Minister approves a public notice or correction', form: 'notice', handler: 'Administrative Office / Imperial Registrar', steps: [
    ['File the Public Notice with the exact approved text and audience', ''],
    ["Tick “Post on the public notice board” if the people should read it on this site", 'The Minister can post or withdraw it later from the Docket.'],
    ['Release it through the authorized channel', 'Notice boards, courier or herald.']],
    caution: 'Never present an unsigned or unpromulgated proposal as law.' },
  { cat: 'Press & Literature', t: 'A publication is reported as false, seditious or unlawful', form: 'publication-review', handler: 'Administrative Office / Imperial Registrar', steps: [
    ['File a Record of Publication Review', 'Record the material, where it was found, and who reported it.'],
    ['Identify the specific Imperial law implicated', "Seek the Ministry of Justice's interpretation when needed."],
    ['Record the analysis and disposition', ''],
    ['Refer any suspected crime with a Writ of Referral', '']],
    caution: 'Material may not be suppressed merely because it is critical, inconvenient or embarrassing.', also: ['referral'] },
  { cat: 'Licenses', t: 'Someone wants a press, literature or other license', form: null, handler: 'Administrative Office / Imperial Register', steps: [
    ['Check the law or delegation that places this license with the Ministry', 'If none exists, refer the person to the competent body.'],
    ['Record the application in the Licenses & Permits folder', 'No license form has been issued yet.'],
    ['Obtain the authorized decision and signature, then issue the license', '']],
    caution: 'Do not invent a license requirement or fee by office custom.', also: ['referral'] },
  { cat: 'Registry', t: 'Someone asks whether a Ministry document is genuine', form: 'authentication', handler: 'Imperial Registrar / authorized Registry officer', steps: [
    ['Compare the instrument against the Registry', 'Record match, seal, hand, and any alteration.'],
    ['File the Certificate of Administrative Authentication with the limited result', ''],
    ['Refer to Justice, Legion or another authority if needed', '']],
    caution: 'Authentication is administrative. It does not decide criminal guilt.' },
  { cat: 'Registry', t: 'A new instrument, notice or delegated matter must be registered', form: 'register-entry', handler: 'Imperial Registrar', steps: [
    ['Verify the legal basis for registration', ''],
    ['File the Entry in the Ministry Administrative Register', '']] },
  { cat: 'Registry', t: 'A Ministry seal is issued, replaced or retired', form: 'seal', handler: 'Imperial Registrar', steps: [
    ['Describe the seal fully', ''],
    ['Record the custodian, authority for use and status, then file', '']] },
  { cat: 'Heraldry', t: 'Someone applies for arms or noble recognition', form: 'heraldry', handler: "Processing officer under the Governor's delegation", steps: [
    ["Confirm a written delegation from the Governor's Office exists", "Without it, send the person to the Governor's Office."],
    ['File the Declaration for Heraldic Registration with lineage, proof and blazon', ''],
    ["Forward to the Governor's Office for determination", '']],
    caution: 'Never promise recognition. Only the Governor or Consul recognizes arms.' },
  { cat: 'Personnel', t: 'A new officer or Envoy is appointed', form: 'appointment', handler: 'Administrative Office prepares; the Minister signs', steps: [
    ['File the Writ of Appointment and Commission', ''],
    ["Obtain the Minister's signature and the appointee's acceptance", ''],
    ['Open their Register of Imperial Service', '']], also: ['service'] },
  { cat: 'Personnel', t: 'An officer is promoted, transferred, resigns or is removed', form: 'service', handler: 'Administrative Office', steps: [
    ['Update the Register of Imperial Service with the change and its authority', ''],
    ['On separation, confirm records, seals and property are returned', '']] },
  { cat: 'Envoys', t: 'Two parties want help reaching an agreement', form: 'accord', handler: 'Envoy or other authorized officer', steps: [
    ['Confirm the matter may properly be mediated', 'No reserved judicial function may be exercised.'],
    ['File the Record of Civil Conference and Accord with the parties, positions and understanding', ''],
    ['Obtain both signatures and distribute copies', '']],
    caution: 'Any accord is voluntary unless separately enforceable under competent law.' },
  { cat: 'Directives', t: 'The Minister issues a standing rule for officers', form: 'directive', handler: 'Minister of Civil and Administrative Affairs', steps: [
    ['File the Civil Affairs Standing Directive with its legal basis', ''],
    ['Distribute it to affected offices', '']],
    caution: 'A Directive binds Ministry officers only. It is never provincial legislation.' },
  { cat: 'Directives', t: 'An internal instruction needs to go out in writing', form: 'memorandum', handler: 'Minister or authorized senior official', steps: [
    ['File the Ministerial Memorandum with the required action and due date', ''],
    ["Record the recipient's acknowledgment", '']] },
  { cat: 'Directives', t: 'The Minister holds a council or senior meeting', form: 'proceedings', handler: 'Designated recorder; presiding officer confirms', steps: [
    ['File the Record of Ministry Proceedings with attendees, matters and decisions', ''],
    ['Open follow-up records for each action assigned', '']] },
  { cat: 'Registry', t: 'A closed record is sent to the archives', form: 'archive', handler: 'Administrative Office / Archives', steps: [
    ['File the Catalogue of Ministry Archives entry', ''],
    ['Mark the original Docket entry Closed', '']] }
];

const DEPTS = [
  { id: 'civil', tab: 'Civil Office', title: 'Civil Office', lede: 'Where the grievances of the Holds are heard and the Envoys sent forth. Kept by the Imperial Emissary.', folders: ['petitions', 'envoys', 'inquiries', 'referrals'], forms: ['petition', 'matter', 'referral', 'dispatch', 'accord'],
    people: [['Imperial Emissary', 'heads Civil Office operations and relations with the Holds'], ['Imperial Adjudicator', 'neutral administrative fact-finding'], ['Imperial Envoys', 'represent the Ministry in assigned Holds'], ['Civil Clerk', 'intake, docketing, copying and routing']] },
  { id: 'register', tab: 'Imperial Register', title: 'Imperial Register', lede: 'Keeper of the rolls, the seals, the letters and the printed word. Kept by the Imperial Registrar.', folders: ['register', 'seals', 'correspondence', 'ledgers', 'archives'], forms: ['register-entry', 'seal', 'authentication', 'correspondence', 'archive'],
    people: [['Imperial Registrar', 'heads the Administrative Office'], ['Registry Secretary', 'prepares and indexes Registry instruments'], ['Administrative Clerk', 'filing, archive work and ledger entries']] },
  { id: 'press', tab: 'Press & Literature', title: 'Press & Literature', lede: 'Authoritative word to the people, the notice boards, and lawful review of what is printed and cried in the Holds.', folders: ['press'], forms: ['notice', 'publication-review'] },
  { id: 'licenses', tab: 'Licenses', title: 'Licenses & Permits', lede: 'Leave granted only where the law places it with this Ministry. Name the governing authority before anything else.', folders: ['licenses'], forms: [] },
  { id: 'personnel', tab: 'Personnel', title: 'Personnel & Appointments', lede: 'Every officer serves under a recorded appointment. Advancement and departure are written in the Register of Imperial Service.', folders: ['personnel'], forms: ['appointment', 'service'] },
  { id: 'envoys', tab: 'Envoys & Holds', title: 'Envoys & Hold Affairs', lede: 'The Envoys keep faith with Jarls, Stewards and courts, send word by Dispatch, and witness accords freely made.', folders: ['envoys'], forms: ['dispatch', 'accord'] },
  { id: 'inquiries', tab: 'Inquiries', title: 'Inquiries & Adjudicator Records', lede: 'Opened only on lawful assignment. The Adjudicator finds the facts and refers crimes; the Adjudicator does not prosecute.', folders: ['inquiries', 'referrals'], forms: ['inquiry', 'inquiry-writ', 'finding', 'referral'] },
  { id: 'heraldry', tab: 'Heraldry', title: 'Heraldry & Noble Records', lede: 'Arms are recognized by the Governor alone. The Ministry receives declarations only under written delegation.', folders: ['heraldry'], forms: ['heraldry'] },
  { id: 'directives', tab: 'Directives', title: 'Directives & Ministerial Orders', lede: 'The standing orders, memoranda and council minutes issued under the Minister’s hand.', folders: ['directives'], forms: ['directive', 'memorandum', 'proceedings'] }
];

const ROUTES = [
  ['Public Ministry notice, declaration, correction, press or literature record', 'Administrative Office / Imperial Registrar'],
  ['License expressly entrusted to Civil Affairs', 'Administrative Office / Register of Licenses'],
  ['Petition or civil concern involving Hold relations', 'Civil Clerk → Envoy / Emissary'],
  ['Administrative misconduct within Ministry competence', 'Emissary → Adjudicator'],
  ['Suspected crime', 'Record facts → refer to Hold, Legion or judicial authority'],
  ['Authoritative interpretation of Imperial law', 'Ministry of Justice'],
  ['Internal order / residuary matter', 'Ministry of the Interior'],
  ['Heraldry / noble recognition', "Governor's Office; Civil Affairs only under delegation"],
  ['Finance, revenues, treasury', 'Finance and Economics'],
  ['Military discipline or military judicial matter', 'Imperial Legion / military authority'],
  ['Ecclesiastical administration', 'Imperial Cult / competent authority'],
  ['Matter belonging to another Ministry or Peer Institution', 'Refer; do not assume jurisdiction']
];

module.exports = { SIT, DEPTS, ROUTES };
