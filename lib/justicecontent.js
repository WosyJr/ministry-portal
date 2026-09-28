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
  { id: 'inquisitor', name: 'Imperial Inquisitor', sub: 'Directed and supervised by the Minister', tone: 'quill', rank: 'imperial-inquisitor',
    duties: [
      'Verifies serious allegations which may become grounds for action by the Empire.',
      'Investigates matters which may involve a superseding or prior Imperial jurisdiction.',
      'Examines conspiracies, insurrection, corruption, organised crime, and offences spanning more than one Hold.',
      'Investigates allegations against a Jarl, court or official where ordinary investigation is not possible or appropriate.',
      'Discovers, verifies, preserves and reports facts, that the competent authority may decide what follows.'
    ],
    note: 'An Inquisitor is not by virtue of the office a judge, magistrate, prosecutor, commander or ordinary constable. Their authority is extraordinary rather than general: there is no power to investigate anyone at their own discretion, and every exercise of it stems from a Commission. (Standards, Articles 1 and 2.)' }
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
  { h: 'Jurisdiction before coercion', t: 'The more serious the intrusion into local jurisdiction or a subject\u2019s freedom, the clearer the ground for Imperial jurisdiction must be. (Standards, Article 29.)' },
  { h: 'Verification before accusation', t: 'The role of inquiry is to discover the truth of an allegation, not to prove an assertion already decided upon. (Standards, Article 29.)' },
  { h: 'Every party may be spoken for', t: 'An Imperial Advocate may act for any party before the bench, and is assigned where a party cannot find one.' },
  { h: 'The reasons are set down', t: 'A judgment carries the reasons for it, so that the parties and the province may know upon what ground it stands.' },
  { h: 'Jurisdiction is not taken by hearing', t: 'A matter belonging to a Jarl’s court, to another Ministry or to the Legion is referred there. Hearing it here does not take it from them.' },
  { h: 'The judgments are published', t: 'Judgments of the bench are entered in a public register, that the law may be known and not guessed at.' }
];


// ---------------------------------------------------------------------------
// The Inquisitors' Standards for Operation & Limits of Authority
// ---------------------------------------------------------------------------
// Set out by the Governor. Kept here so an officer, a Jarl's steward or a
// subject may read the article rather than take somebody's word for it. This is
// a faithful digest for the hall; the sealed instrument governs.

const STANDARDS_PREAMBLE = 'Whereas the just dispensation of the laws of the Empire in Skyrim requires that certain allegations be heard apart from any provincial authority whose usual powers may be insufficient, conflicted or implicated; and whereas the ancient right of the Jarls and Lord-Regents to hear first-instance offences in their own Holds is nevertheless preserved; these Standards are set out for the control, conduct, jurisdiction and limitation of every Imperial Inquisitor of this Ministry.';

const STANDARDS = [
  { n: 'I', h: 'The Office and Its Role', arts: [
    ['1', 'Nature of the office', 'An Imperial Inquisitor is an extraordinary investigative official of this Ministry, holding office under the direction and supervision of the Minister. The office exists to verify serious allegations, to investigate matters of superseding Imperial jurisdiction, to examine conspiracy, insurrection, corruption, organised crime and offences spanning more than one Hold, and to investigate allegations against a Jarl, court or official where ordinary investigation is not possible. An Inquisitor is not, by the office alone, a judge, magistrate, prosecutor, commander or constable. Their primary responsibility is the discovery, verification, preservation and reporting of facts.'],
    ['2', 'The authority is extraordinary, not general', 'There is no general power to investigate any person, court or Hold at an Inquisitor\u2019s own discretion. Every exercise of extraordinary power stems from a delegation by the Minister, a delegation through the Governor\u2019s instruction, an express authority of standing Imperial law, or the urgent circumstances of Section IX. To act above a local law means to disregard obstructive local law where properly commissioned; it never places an Inquisitor above Imperial law, their Commission, these Standards, or the lawful instructions of the Minister or Governor.']
  ] },
  { n: 'II', h: 'Commission and Delegation', arts: [
    ['3', 'A Commission is necessary', 'An Inquisitor acts upon a Commission, instruction or warrant of this Ministry. It should state the allegation, the persons, institutions, territory or events in scope, the basis for Imperial jurisdiction, the powers conferred, the powers specifically denied, and the authority to whom findings are reported. The Minister may modify, restrict, suspend or terminate it at any time. The subject matter is not extended without authority unless new facts connect it to the original matter, to another serious Imperial offence, or to an immediate threat \u2014 and any such extension is reported at the earliest opportunity.'],
    ['4', 'Delegation from the Governor', 'A matter entrusted by the Governor to the Minister may be delegated to an Inquisitor. The Minister remains answerable to the Governor for it, and the Inquisitor acts as an officer of this Ministry, not on the Governor\u2019s behalf, unless so empowered.']
  ] },
  { n: 'III', h: 'The Ordinary Jurisdiction of the Holds', arts: [
    ['5', 'The first instance is presumed local', 'The rulers and courts of the Holds keep their right to hear ordinary crimes committed within their borders. Inquisitorial jurisdiction is not exercised merely because an offence is serious, an Imperial citizen is involved, an Imperial officer is interested, or the Ministry believes it would investigate better. Where a matter belongs to the Hold, an Inquisitor makes the allegation known to the local authority, asks its cooperation, and does not supersede it without lawful basis.'],
    ['6', 'No interference with ordinary local justice', 'Except where Imperial jurisdiction lawfully attaches, an Inquisitor shall not command a Hold\u2019s guard, countermand a Jarl or court, remove an accused from local custody, compel local records, halt a local prosecution, search or seize against local procedure, set up a tribunal within the Hold, or otherwise put Imperial authority in the place of local justice.']
  ] },
  { n: 'IV', h: 'Superseding Imperial Jurisdiction', arts: [
    ['7', 'When the Empire may hear it first', 'A matter may belong to a superseding Imperial first instance where one of six grounds is credibly alleged: provincial character; offences against the Empire; insurrection and provincial security; allegations against local government; Imperial reserved jurisdiction; or the failure or incapacity of the local jurisdiction.'],
    ['8', 'Imperial interest alone is not enough', 'Political inconvenience, dissatisfaction with a Jarl\u2019s decision, or disagreement with local discretion establish nothing. Jurisdiction rests on the legal character of the matter, not the preference of the Provincial Government. Where it is doubtful, the question goes to the Minister before any coercive measure.']
  ] },
  { n: 'V', h: 'Investigative Powers', arts: [
    ['9', 'Ordinary powers', 'Within a lawful Commission an Inquisitor may receive allegations and testimony, interview willing witnesses, ask the testimony of Imperial officials, inspect Imperial records, request records of local governments and private persons, inspect relevant sites where access is lawful, preserve evidence, compare testimony against documents, seek the help of authorised officers, identify persons holding information, preserve confidential sources, and prepare findings and referrals.'],
    ['10', 'Compulsory measures', 'Compelled testimony, compulsory production of records, search and seizure of private property, detention, arrest, interception of correspondence, sealing of premises, restriction upon travel, compulsory summons and forced entry all require specific legal authority. An Inquisitor shall not presume such powers from the office title.'],
    ['11', 'Cooperation with the Hold', 'Where secrecy or urgency does not forbid it, an Inquisitor informs the Jarl, Steward or court of an Imperial investigation within their Hold. Confidential witnesses, matter that would compromise the investigation or a security operation, and anything creating a risk of destroyed evidence, flight, retaliation or obstruction need not be disclosed. Where the ruler or court is themself the subject, disclosure is made only with the Minister\u2019s authority. Cooperation is sought before compulsion.']
  ] },
  { n: 'VI', h: 'Fact Finding and Evidence', arts: [
    ['12', 'Neutral verification', 'Assigning an allegation to an Inquisitor is not a finding that it is true. An Inquisitor distinguishes allegation, suspicion, corroborated fact, disputed fact, inference and legal conclusion; seeks evidence that would disprove a material allegation as well as evidence that supports it; does not leave out material evidence favourable to the person investigated; and discloses a material conflict of testimony rather than covering it by selective reporting.'],
    ['13', 'Evidentiary integrity', 'Record the source of material evidence; distinguish direct knowledge from hearsay; keep originals or true copies; record the possession and transfer of seized evidence; record the circumstances of material interviews; mark uncertainty where certainty cannot be had; and never present speculation as verified fact.'],
    ['14', 'The threshold for Imperial action', 'An Inquisitor may recommend no further action, continued investigation, referral to a Hold authority, indictment by the Empire, a judicial inquiry, administrative sanction, protective measures, or other proceedings. A recommendation does not itself commence proceedings, and the decision to indict remains with the competent Imperial authority.']
  ] },
  { n: 'VII', h: 'Persons Under Investigation', arts: [
    ['15', 'The status of the subject', 'A person is not convicted by being investigated. Firmness, secrecy, surveillance and strategic questioning are legitimate. No Inquisitor shall invent evidence, testimony, confession or record, nor threaten a punishment the Empire has no authority to impose. Coercion is reported as such in the final report.'],
    ['16', 'Detention and arrest', 'There is no inherent power of imprisonment. Arrest or detention follows only from express legal or Commission authority, a valid Imperial warrant, cooperation with an authority holding lawful arrest powers, or the emergency provisions of these Standards. Where the offence belongs to the Hold, arrest is better referred to the Hold.']
  ] },
  { n: 'VIII', h: 'Limits of Authority', arts: [
    ['17', 'What an Inquisitor shall not do', 'Investigate for private revenge, political rivalry, profit or faction; demand obedience in unrelated matters; appropriate property; punish without lawful adjudication; declare anyone guilty by decree; usurp the Governor, the Minister or a lawful local ruler; conceal exculpatory evidence; create offences not established by law; treat non-cooperation as proof of guilt where it could not lawfully be compelled; invoke the Emperor, Governor or Minister to claim powers not delegated; interfere with a lawful local proceeding for a political result; or exercise extraordinary power after the Commission ends.'],
    ['18', 'No power to make law', 'Inquisitors investigate and enforce law; they do not create it. An Inquisitor may interpret the extent of their own operational authority where necessary, but shall not make new rules, offences, penalties or jurisdictional doctrine. Questions of Imperial jurisdiction go to the Minister.']
  ] },
  { n: 'IX', h: 'Urgent and Exceptional Circumstances', arts: [
    ['19', 'Immediate protective action', 'Where delay would create substantial and imminent danger of death or serious harm, destruction of material evidence, the flight of a person accused of a serious Imperial offence, insurrection, destruction of critical Imperial property, or immediate interference with an authorised Imperial operation, an Inquisitor may take such temporary measures as are necessary until competent authority is available.'],
    ['20', 'The limits of emergency authority', 'Emergency authority is read narrowly. What is done must be necessary, proportional to the immediate danger, temporary, and reported to the Minister as soon as may be. An emergency shall not be created or prolonged to avoid the ordinary requirements of jurisdiction.']
  ] },
  { n: 'X', h: 'Other Imperial Authorities', arts: [
    ['21', 'The Imperial Legion', 'There is no general authority to command Legion units. Assistance may be requested where the Minister or Governor authorises it, where law or departmental agreement provides, or where a clear and imminent danger requires it. Command of Legion personnel stays within its own chain.'],
    ['22', 'Penitus Oculatus and other departments', 'A Commission does not displace the lawful jurisdiction of the Penitus Oculatus or any other competent Imperial department. Where another holds primary jurisdiction, the Inquisitor cooperates or joins with it as directed, and shall not claim to act on its behalf.'],
    ['23', 'Provincial departments and officers', 'Provincial departments and officers shall give reasonable cooperation to a lawful inquisitorial investigation, within their competence and short of any breach of superior law or privilege.']
  ] },
  { n: 'XI', h: 'Investigating Jarls, Lord-Regents and Hold Courts', arts: [
    ['24', 'Additional protection of sovereign power', 'An investigation into the personal conduct of a reigning Jarl or Lord-Regent requires the prior authorisation of the Minister or the Governor. Commencing it does not suspend the ruler, impair their power, void the acts of their government, or pronounce guilt. A local court may be gone around where it is implicated, subordinate to the subject, necessarily conflicted, or unable to investigate without aid. Where the matter proves an ordinary crime with no Imperial ground, it is remitted to the local authority.']
  ] },
  { n: 'XII', h: 'Obstruction', arts: [
    ['25', 'Lawful resistance is not obstruction', 'Refusal, disagreement, a challenge to jurisdiction or protest is not obstruction. Before charging obstruction the Inquisitor must show that the original act was within lawful Imperial authority, that the person knew or ought to have known it, and that they deliberately interfered. A ruler who raises a good-faith challenge to jurisdiction is not an insurgent because the challenge fails.']
  ] },
  { n: 'XIII', h: 'Reporting and Accountability', arts: [
    ['26', 'The Inquisitorial report', 'A substantial investigation is reported: the Commission or authority it proceeded under, the allegations investigated, the jurisdictional ground, the course of the investigation, the facts determined, the material disputed facts, the evidence for and the evidence against, an assessment of credibility where needed, any question of jurisdiction, the Inquisitor\u2019s conclusions, and their recommendations.'],
    ['27', 'Ministerial review', 'The report goes to the Minister, who may accept the findings, order a supplementary investigation, reject findings not founded in fact, forward the matter elsewhere, recommend legal action to the Governor or a judicial authority, or close it. Where the Governor granted the Commission, the Minister reports the findings to the Governor.'],
    ['28', 'Complaints against an Inquisitor', 'Any allegation of exceeding a Commission, abusing extraordinary powers, fabricating evidence or acting for an improper purpose falls to the Minister, and may go directly to the Governor where the Ministry would be conflicted. An Inquisitor who acts materially outside lawful authority may be removed from the investigation, suspended, dismissed, disciplined, or put to criminal process.']
  ] },
  { n: 'XIV', h: 'Governing Principles', arts: [
    ['29', 'The six principles', 'First, Imperial supremacy where legally established. Second, respect for the local right-to-rule. Third, jurisdiction before coercion. Fourth, verification before accusation. Fifth, necessity and proportionality. Sixth, accountability through delegation \u2014 an Inquisitor holds delegated authority and answers to the authority that delegated it.']
  ] },
  { n: 'XV', h: 'Final Rule of Construction', arts: [
    ['30', 'What acting outside local law means', 'It means that, where lawfully authorised in a matter within Imperial jurisdiction, an Inquisitor may act despite any local rule, privilege or assertion of jurisdiction that would otherwise prevent the carrying out of the Commission. It does not mean that an Inquisitor holds authority apart from law, disregards Imperial limits, displaces a Hold without just cause, or coerces upon the strength of the office alone.']
  ] }
];

const STANDARDS_SEAL = 'His Illustriousness, Count of Leyawiin Oceanus Venator, Governor of the Imperial Province of Skyrim, Knight-Commander of the Order of the White Stallion, GSCL, OES';

module.exports = { OFFICE, JUDICIAL, PRINCIPLES, STANDARDS, STANDARDS_PREAMBLE, STANDARDS_SEAL };
