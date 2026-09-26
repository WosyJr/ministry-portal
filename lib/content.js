const SIT = [
  { cat: 'Petitions', t: 'Citizen wants to file a complaint or grievance', form: 'petition', handler: 'Civil Clerk', steps: [
    ['Receive the person respectfully', 'Do not promise any outcome.'],
    ['Open the Petition form and record their name, Hold, statement and the relief they seek', 'The Petition number and date are assigned when you file.'],
    ['Decide competence', 'If plainly outside the Ministry, file a Writ of Referral instead of routing it.'],
    ['Route it', 'Ordinary Hold relations go to the assigned Delegate. Significant or cross-Hold matters go to the Imperial Envoy to the Holds.'],
    ['File it', 'The record is written to Petitions & Civil Matters and entered in the Docket.']],
    caution: 'Do not open an Adjudicator Inquiry yourself. Only the Envoy to the Holds or other lawful authority may authorize one.', also: ['referral', 'matter'] },
  { cat: 'Petitions', t: 'A matter needs tracking beyond simple intake', form: 'matter', handler: 'Civil Clerk / supervising Civil officer', steps: [
    ['Open a Record of Administrative Matter', ''],
    ['Link the originating record', 'Petition, Dispatch, Correspondence or Referral number.'],
    ['Complete the competence review and routing decision', ''],
    ['File it and keep its Docket status current until closed', '']], also: ['petition'] },
  { cat: 'Inquiries', t: 'A Delegate reports suspected administrative misconduct', form: 'dispatch', handler: 'Imperial Delegate → Imperial Envoy to the Holds', steps: [
    ['File the Dispatch from the Holds', ''],
    ['Open a Record of Administrative Matter if directed', ''],
    ['Send to the Imperial Envoy to the Holds', 'The Envoy to the Holds decides whether to assign an Inquiry to the Adjudicator.']], also: ['matter'] },
  { cat: 'Inquiries', t: 'The Envoy to the Holds authorizes an administrative inquiry', form: 'inquiry', handler: 'Imperial Adjudicator', steps: [
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
  { cat: 'Licenses', t: 'Someone wants a press, printing or literature license', form: 'license', handler: 'Administrative Office / Imperial Registrar', steps: [
    ['Check the law or delegation that places this license with the Ministry', 'If none exists, refer the person to the competent body.'],
    ['Fill in the License of the Ministry with the holder, the kind of license, the premises and the governing authority', ''],
    ['Obtain the authorized decision and seal', 'A license shows on the public Register of Licenses only while it is In Force.'],
    ['When it lapses or is revoked, set its Docket state to Closed or Revoked', '']],
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
  { cat: 'Personnel', t: 'A new officer or Delegate is appointed', form: 'appointment', handler: 'Administrative Office prepares; the Minister signs', steps: [
    ['File the Writ of Appointment and Commission', ''],
    ["Obtain the Minister's signature and the appointee's acceptance", ''],
    ['Open their Register of Imperial Service', '']], also: ['service'] },
  { cat: 'Personnel', t: 'An officer is promoted, transferred, resigns or is removed', form: 'service', handler: 'Administrative Office', steps: [
    ['Update the Register of Imperial Service with the change and its authority', ''],
    ['On separation, confirm records, seals and property are returned', '']] },
  { cat: 'Envoys', t: 'Two parties want help reaching an agreement', form: 'accord', handler: 'Delegate or other authorized officer', steps: [
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
  { id: 'civil', tab: 'Civil Office', title: 'Civil Office', lede: 'Where the grievances of the Holds are heard and the Delegates sent forth. Kept by the Imperial Envoy to the Holds of Skyrim.', folders: ['petitions', 'envoys', 'inquiries', 'referrals'], forms: ['petition', 'matter', 'referral', 'dispatch', 'accord'],
    people: [['Imperial Envoy to the Holds of Skyrim', 'heads the Civil Office and relations with the Holds'], ['Imperial Adjudicator', 'neutral administrative fact-finding, appointed ad hoc'], ['Imperial Delegates', 'represent the Ministry in their assigned pair of Holds'], ['Civil Clerk', 'intake, docketing, copying and routing']] },
  { id: 'register', tab: 'Administrative Office', title: 'Administrative Office', lede: 'Keeper of the rolls, the seals, the letters and the printed word. Kept by the Imperial Registrar.', folders: ['register', 'seals', 'correspondence', 'ledgers', 'archives'], forms: ['register-entry', 'seal', 'authentication', 'correspondence', 'archive'],
    people: [['Imperial Registrar', 'heads the Administrative Office'], ['Registry Secretary', 'prepares and indexes Registry instruments'], ['Administrative Clerk', 'filing, archive work and ledger entries']] },
  { id: 'press', tab: 'Press & Literature', title: 'Press & Literature', lede: 'Authoritative word to the people, the notice boards, and lawful review of what is printed and cried in the Holds.', folders: ['press'], forms: ['notice', 'publication-review'] },
  { id: 'licenses', tab: 'Licenses', title: 'Licenses & Permits', lede: 'Leave granted only where the law places it with this Ministry. Name the governing authority before anything else.', folders: ['licenses'], forms: ['license'] },
  { id: 'personnel', tab: 'Personnel', title: 'Personnel & Appointments', lede: 'Every officer serves under a recorded appointment. Advancement and departure are written in the Register of Imperial Service.', folders: ['personnel'], forms: ['appointment', 'service'] },
  { id: 'envoys', tab: 'Envoys & Holds', title: 'Envoys & Hold Affairs', lede: 'The Delegates keep faith with Jarls, Stewards and courts, send word by Dispatch, and witness accords freely made.', folders: ['envoys'], forms: ['dispatch', 'accord'] },
  { id: 'inquiries', tab: 'Inquiries', title: 'Inquiries & Adjudicator Records', lede: 'Opened only on lawful assignment. The Adjudicator finds the facts and refers crimes; the Adjudicator does not prosecute.', folders: ['inquiries', 'referrals'], forms: ['inquiry', 'inquiry-writ', 'finding', 'referral'] },
  { id: 'heraldry', tab: 'Heraldry', title: 'Heraldry & Noble Records', lede: 'Arms are recognized by the Governor alone. The Ministry receives declarations only under written delegation.', folders: ['heraldry'], forms: ['heraldry'] },
  { id: 'directives', tab: 'Directives', title: 'Directives & Ministerial Orders', lede: 'The standing orders, memoranda and council minutes issued under the Minister’s hand.', folders: ['directives'], forms: ['directive', 'memorandum', 'proceedings'] }
];

const ROUTES = [
  ['Public Ministry notice, declaration, correction, press or literature record', 'Administrative Office / Imperial Registrar'],
  ['License expressly entrusted to Civil Affairs', 'Administrative Office / Register of Licenses'],
  ['Petition or civil concern involving Hold relations', 'Civil Clerk → Delegate / Envoy to the Holds'],
  ['Administrative misconduct within Ministry competence', 'Envoy to the Holds → Adjudicator'],
  ['Suspected crime', 'Record facts → refer to Hold, Legion or judicial authority'],
  ['Authoritative interpretation of Imperial law', 'Ministry of Justice'],
  ['Internal order / residuary matter', 'Ministry of the Interior'],
  ['Heraldry / noble recognition', "Governor's Office; Civil Affairs only under delegation"],
  ['Finance, revenues, treasury', 'Finance and Economics'],
  ['Military discipline or military judicial matter', 'Imperial Legion / military authority'],
  ['Ecclesiastical administration', 'Imperial Cult / competent authority'],
  ['Matter belonging to another Ministry or Peer Institution', 'Refer; do not assume jurisdiction']
];

const HOLDS = [
  { name: 'Haafingar', seat: 'Solitude', pts: '40,60 170,40 200,110 120,140 40,130', lx: 112, ly: 92 },
  { name: 'Hjaalmarch', seat: 'Morthal', pts: '170,40 290,50 280,130 200,110', lx: 236, ly: 84 },
  { name: 'The Pale', seat: 'Dawnstar', pts: '290,50 420,40 420,150 300,160 280,130', lx: 352, ly: 100 },
  { name: 'Winterhold', seat: 'Winterhold', pts: '420,40 560,60 560,150 420,150', lx: 490, ly: 100 },
  { name: 'The Reach', seat: 'Markarth', pts: '40,130 120,140 200,110 200,230 130,300 40,280', lx: 110, ly: 212 },
  { name: 'Whiterun', seat: 'Whiterun', pts: '200,110 280,130 300,160 360,240 280,270 200,230', lx: 272, ly: 196 },
  { name: 'Eastmarch', seat: 'Windhelm', pts: '420,150 560,150 560,240 430,250 360,240 300,160', lx: 452, ly: 200 },
  { name: 'Falkreath', seat: 'Falkreath', pts: '200,230 280,270 330,340 180,350 130,300', lx: 226, ly: 302 },
  { name: 'The Rift', seat: 'Riften', pts: '360,240 430,250 560,240 560,340 330,340 280,270', lx: 444, ly: 298 }
];
const HOLD_NAMES = HOLDS.map(h => h.name);

const LAWS = [
  { id: 'codex-iv', title: 'Codex Officiorum Provinciae', cite: 'Administratio Cyrodiilic, Article IV', summary: 'Sets out what a Minister of the province may do. A Minister orders their own office, appoints subordinates within the portfolio and its budget, issues standing orders and directives that bind those subordinates, and may demand records, accounts and cooperation from other offices when the Ministry’s work truly requires it.', limits: 'A Minister cannot create a new Ministry, change another body’s jurisdiction, or make provincial law by directive.' },
  { id: 'portfolio', title: 'Portfolio of Civil and Administrative Affairs', cite: 'Codex Officiorum Provinciae', summary: 'Names this Ministry the authoritative source of Imperial information in Skyrim. It releases public declarations, keeps the Imperial image, and reviews publications that may be false, seditious or unlawful under Imperial law.', limits: 'Nothing may be suppressed merely because it is critical, inconvenient or embarrassing. Action must rest on Imperial law.' },
  { id: 'ordo-audience', title: 'Lex Ordo Debitus', cite: 'Duty of Audience', summary: 'Every subject of the Empire may bring a lawful grievance before the Ministry and be heard. Petitions within the portfolio are received and answered in good order.', limits: 'Hearing a petition does not take jurisdiction away from a Jarl, a court, another Ministry or the Governor’s Office.' },
  { id: 'ordo-referral', title: 'Lex Ordo Debitus', cite: 'Duty of Referral', summary: 'A matter that belongs to another authority must be sent to that authority with the records it needs. Crimes go to the Hold, the Legion or the courts.', limits: 'Referral preserves jurisdiction. It never transfers a crime or a reserved matter to this Ministry.' },
  { id: 'nobilitatis', title: 'Lex de Tabulis Nobilitatis Imperii', cite: 'Sections I–II', summary: 'Noble titles, knightly station and arms are recognized through the Office of the Governor or Consul and entered in the Imperial Ledger of Heraldry.', limits: 'The Ministry may receive and prepare heraldic declarations only under written delegation from the Governor. It grants no title of its own.' },
  { id: 'promulgation', title: 'Enactment of Provincial Law', cite: 'As bound by the Codex Officiorum Provinciae', summary: 'A provincial law exists only when enacted by the Cabinet, signed as required, promulgated by the Governor and published in the Gazette.', limits: 'Ministry directives, memoranda and notices are never provincial law, and no unsigned proposal may be presented as law.' }
];

const QUIZ = [
  { q: 'A citizen brings a grievance about their Jarl’s steward. What writ does the clerk open first?', a: ['Petition Before the Ministry', 'Writ of Administrative Inquiry', 'Finding of the Imperial Adjudicator', 'Civil Affairs Standing Directive'], c: 0 },
  { q: 'Who may authorize the Imperial Adjudicator to open an Inquiry?', a: ['Any Civil Clerk', 'The Imperial Envoy to the Holds or other lawful authority', 'The petitioner', 'A Registry Secretary'], c: 1 },
  { q: 'The Adjudicator uncovers evidence of a crime. What happens?', a: ['The Adjudicator prosecutes it', 'It is ignored', 'The evidence is preserved and a Writ of Referral is filed', 'The Minister sentences the offender'], c: 2 },
  { q: 'Which of these is a correct Fourth Era date?', a: ['Fredas, the 10th day of Sun’s Height, 4E 226', 'Friday, 10 July 226', 'The 10th of Sun’s Height, 3E 226', 'Sun’s Height the 10th, year 226'], c: 0 },
  { q: 'A Standing Directive binds whom?', a: ['Every subject in Skyrim', 'Officers of the Ministry only', 'The Jarls of all nine Holds', 'The Imperial Legion'], c: 1 },
  { q: 'Someone asks whether a Ministry letter is genuine. What is filed?', a: ['Writ of Referral', 'Certificate of Administrative Authentication', 'Register of Imperial Service', 'Record of Civil Conference'], c: 1 },
  { q: 'Who recognizes a claim of noble arms?', a: ['The Imperial Registrar', 'The Civil Clerk', 'The Governor or Consul', 'Any Imperial Delegate'], c: 2 },
  { q: 'A pamphlet is critical of the Ministry but breaks no law. What may be done?', a: ['Seize every copy', 'Nothing may be suppressed merely for being critical', 'Arrest the printer', 'Fine the author'], c: 1 },
  { q: 'An authoritative interpretation of Imperial law belongs to which body?', a: ['Ministry of Justice', 'Ministry of Finance', 'Civil Office', 'Imperial War Office'], c: 0 },
  { q: 'What is the right order of a writ’s keeping?', a: ['Send, Prepare, Register', 'Prepare, Review, Authorize, Register, Send', 'Register, Send, Prepare', 'Authorize, Send, Prepare'], c: 1 },
  { q: 'Two parties want help reaching an agreement. What does a Delegate file?', a: ['Record of Civil Conference and Accord', 'Finding of the Imperial Adjudicator', 'Ministerial Requisition', 'Writ of Inquiry'], c: 0 },
  { q: 'Which Delegate answers for the Reach?', a: ['Delegate to Whiterun & Falkreath', 'Delegate to the Reach & Haafingar', 'Delegate to the Rift & Eastmarch', 'Delegate to the Pale & Hjaalmarch'], c: 1 }
];

module.exports = { SIT, DEPTS, ROUTES, HOLDS, HOLD_NAMES, LAWS, QUIZ };
