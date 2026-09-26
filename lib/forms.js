const S = require('./store');
const C = require('./config');
const { DEPTS } = require('./content');

const MINISTER = 'Minister of Civil and Administrative Affairs';

const slug = s => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const T = (label, o = {}) => ({ type: 'text', label, ...o });
const D = (label, o = {}) => ({ type: 'date', label, ...o });
const O = (label, options, o = {}) => ({ type: 'options', label, options, ...o });
const F = (label, value) => ({ type: 'fixed', label, value });
const auth = (a, l) => ({ h: 'Legal Authority and Limitation', kv: [F('Authority / Basis', a), F('Limitation', l)] });

const RAW = [
  {
    key: 'service', file: '01', folder: 'personnel', num: 'Service Record', subject: 'full-name',
    title: 'Register of Imperial Service', subtitle: 'Permanent personnel record for officers and staff of the Ministry', tag: 'Register of Imperial Service',
    preamble: 'Let it be recorded upon the rolls of the Ministry that the person here named hath entered into the civil service of the Empire, and that their service, advancement, and departure shall be faithfully set down below.',
    sections: [
      auth('Codex Officiorum Provinciae, Administratio Cyrodiilic, Article IV (ministerial ordering, staffing and appointment of subordinates).', 'This record evidences Ministry service only. It does not create noble rank, military commission, judicial office, or an office reserved to another Ministry or Peer Institution.'),
      { h: 'Officeholder', kv: [T('Full Name', { required: true }), T('Office / Rank'), T('Ministry Branch'), T('Appointing Minister / Authority'), D('Date Appointed'), O('Current Status', ['Active', 'Acting', 'Leave', 'Resigned', 'Removed', 'Vacant'])] },
      { h: 'Service History, Promotions and Transfers', grid: ['Date (4E)', 'Office / Change', 'Authority / Writ', 'Remarks'], rows: 5, widths: [1900, 3000, 2600, 2580] },
      { h: 'Censures, Commendations and Administrative Notes', lines: 4 },
      { h: 'Separation', kv: [O('Cause', ['Resignation', 'Removal', 'Transfer', 'Other']), D('Effective Date'), T('Authority'), O('Records / Property Returned', ['Yes', 'No', 'Partial'])] }
    ],
    sig: ['Registry Secretary', 'Minister or Authorized Superior']
  },
  {
    key: 'appointment', file: '02', folder: 'personnel', num: 'Writ', subject: 'appointee', summary: 'charge-of-office',
    title: 'Writ of Appointment and Commission', subtitle: 'Ministerial appointment of a subordinate within the portfolio', tag: 'Writ of Appointment',
    preamble: 'To all who shall see these presents, greeting. Know ye that the ' + MINISTER + ', reposing special trust and confidence in the fidelity and ability of the person here named, doth appoint and commission them to the office set forth below, to hold the same within the lawful bounds of the portfolio.',
    sections: [
      auth('Codex Officiorum Provinciae, Article IV on ministerial competence.', "The Minister may appoint subordinates within the portfolio and budget, but this writ cannot create a Ministry of State, alter statutory jurisdiction, confer police/judicial powers, or appoint to another Ministry, Peer Institution, Hold office, or the Governor's personal staff."),
      { h: 'Appointment', kv: [T('Appointee', { required: true }), T('Office Conferred', { required: true }), T('Branch / Assignment'), D('Effective Date'), F('Appointing Authority', MINISTER), O('Term', ['At pleasure', 'Fixed term if lawfully authorized'])] },
      { h: 'Charge of Office', lines: 4 },
      { h: 'Delegated Functions and Express Limitations', note: 'List only functions within the Ministry portfolio or separately delegated in writing by competent authority.', lines: 4 },
      { h: 'Acceptance', kv: [F('Oath of Acceptance', 'I accept the office and shall act within Imperial law and the lawful bounds of the portfolio.'), T('Appointee Signature'), D('Date Accepted')] }
    ],
    sig: ['Minister / Authorized Appointer', 'Recording Officer']
  },
  {
    key: 'register-entry', file: '03', folder: 'register', num: 'Register Entry', subject: 'name-style-of-record', summary: 'description-and-disposition',
    title: 'Entry in the Ministry Administrative Register', subtitle: 'Internal record of Ministry instruments, notices, publications, and delegated matters', tag: 'Administrative Register',
    preamble: 'Entered this day into the Administrative Register of the Ministry, there to stand as a true record until lawfully amended or superseded, and never to be erased.',
    sections: [
      auth('Codex Officiorum Provinciae, Article IV; portfolio scope for public declarations, authoritative information, Imperial image, and unlawful publications.', 'This Ministry register is not the Imperial Ledger of Heraldry and does not itself confer noble, knightly, heraldic, commercial, ecclesiastical, military, or judicial recognition.'),
      { h: 'Entry', kv: [T('Name / Style of Record', { required: true }), O('Class', ['Directive', 'Notice', 'Publication', 'Correspondence', 'Delegated Matter', 'Other']), T('Originating Office'), D('Date Entered'), T('Related Authority'), T('Related Records')] },
      { h: 'Description and Disposition', lines: 5 }
    ],
    sig: ['Registry Secretary', 'Imperial Registrar / Records Officer']
  },
  {
    key: 'heraldry', file: '04', folder: 'heraldry', num: 'Heraldic Declaration', subject: 'name', summary: 'lineage-and-ancestral-claim',
    title: 'Declaration for Heraldic Registration', subtitle: 'Intake and processing record for the Imperial Ledger of Heraldry', tag: 'Heraldic Declaration',
    banner: 'Delegated Gubernatorial Function  ✦  Valid Only When Authorized',
    preamble: "Declaration made before an officer of the Ministry, acting solely under the delegation of the Governor, touching a claim of arms, lineage, or knightly station. Nothing herein shall be taken as recognition until the Governor's Office hath so determined.",
    sections: [
      auth('Lex de Tabulis Nobilitatis Imperii, Sections I–II: heraldry and noble recognition are governed through the Provincial Office of the Governor or Consul.', "Ministry personnel may receive, copy, investigate, or prepare this declaration only under written delegation from the Governor or authorized Governor's Office. Final recognition remains where the Lex places it. This instrument alone grants no title or heraldic right."),
      { h: 'Claimant', kv: [T('Name', { required: true }), O('Claim', ['Noble Lineage', 'Knightly Status', 'Heraldic Right']), T('Home Province / Hold'), T('Existing Title or Style Claimed'), T("Governor's Delegation / File Reference")] },
      { h: 'Lineage and Ancestral Claim', lines: 4 },
      { h: 'Proof Submitted', lines: 3 },
      { h: 'Heraldic Symbols and Description', note: 'Blazon the arms in plain words: field, charges, colours, and any motto.', lines: 4 },
      { h: 'Required Review', kv: [O('Official Interview', ['Completed', 'Pending']), O('Oath / Allegiance Evidence', ['Verified', 'Pending', 'Not Applicable']), O('Forgery / Misrepresentation Concern', ['None', 'Referred'])] },
      { h: 'Disposition', kv: [O('Recommendation', ['Forward for Recognition', 'Return for Evidence', 'Refer for Review']), T("Governor's Office Determination"), T('Imperial Ledger Entry')] }
    ],
    sig: ['Processing Officer', 'Governor / Authorized Heraldic Authority']
  },
  {
    key: 'seal', file: '05', folder: 'seals', num: 'Seal Entry', subject: 'office-custodian', summary: 'specimen-or-detailed-description',
    title: 'Register of Ministry Seals and Signets', subtitle: 'Custody record for seals authorized for Ministry use', tag: 'Register of Seals',
    preamble: 'Here is recorded the seal or signet named below, its keeper, and the lawful bounds of its use. No seal shall be set to any instrument save by the hand entrusted with it, and a seal shall never cure an instrument issued without lawful authority.',
    sections: [
      auth('Codex Officiorum Provinciae, Article IV (ordering of the Ministerial Office and instruments required to execute the portfolio).', 'Registration here authenticates only Ministry seals/signets placed under Ministry custody. It does not validate seals belonging to the Governor, Hold courts, Legion, other Ministries, or Peer Institutions unless that authority supplies a lawful specimen or delegates verification.'),
      { h: 'Seal', kv: [T('Office / Custodian', { required: true }), O('Seal Type', ['Ministry', 'Branch', 'Officer Signet']), T('Authority for Use'), D('Date Entered'), O('Status', ['Active', 'Suspended', 'Revoked', 'Replaced'])] },
      { h: 'Specimen or Detailed Description', note: 'Describe the seal fully, or impress it on the finished record.', lines: 5 },
      { h: 'Permitted Uses and Restrictions', lines: 4 }
    ],
    sig: ['Custodian', 'Imperial Registrar / Records Officer']
  },
  {
    key: 'authentication', file: '06', folder: 'seals', num: 'Authentication', subject: 'instrument-examined', summary: 'observations',
    title: 'Certificate of Administrative Authentication', subtitle: 'Comparison of a Ministry instrument against official records', tag: 'Certificate of Authentication',
    preamble: 'Be it known that the instrument described below was laid before the Registry and compared against the records lawfully kept therein, and that the result of that comparison is here truly certified.',
    sections: [
      auth('Codex Officiorum Provinciae, Article IV (execution of the portfolio and demand/keeping of records as lawfully required).', "The certificate authenticates Ministry records or records lawfully supplied for comparison. It is an administrative finding, not a judicial determination of forgery, criminal guilt, noble status, or legal validity outside the Ministry's competence."),
      { h: 'Instrument', kv: [T('Instrument Examined', { required: true }), T('Presented By'), T('Purported Issuer'), T('Purported Date'), T('Registry / Record Reference')] },
      { h: 'Comparison', kv: [O('Record Match', ['Match', 'Partial', 'None', 'No Record']), O('Seal / Signet', ['Consistent', 'Inconsistent', 'Not Examined']), O('Signature / Hand', ['Consistent', 'Inconsistent', 'Not Examined']), O('Alteration Observed', ['No', 'Yes', 'Indeterminate'])] },
      { h: 'Observations', lines: 4 },
      { h: 'Administrative Result', kv: [O('Finding', ['Authenticated as Ministry Record', 'Unable to Authenticate', 'Inconsistent with Ministry Record', 'Refer to Competent Authority']), O('Referral', ['Justice', 'Interior', "Governor's Office", 'Legion', 'Hold', 'Other'])] }
    ],
    sig: ['Examining Officer', 'Supervising Records Officer']
  },
  {
    key: 'correspondence', file: '07', folder: 'correspondence', num: 'Correspondence', subject: 'subject', summary: 'summary',
    title: 'Register of Imperial Correspondence', subtitle: 'Incoming and outgoing correspondence of the Ministry', tag: 'Register of Correspondence',
    preamble: 'Entry of a letter or message received by, or sent forth from, the Ministry, that its course, its keeper, and its answer may be known to all officers who come after.',
    sections: [
      auth('Codex Officiorum Provinciae, Article IV and the Ministry portfolio for public-facing declarations and information.', 'Correspondence does not itself enlarge Ministry jurisdiction. Diplomatic, judicial, military, financial, ecclesiastical, or gubernatorial matters must be routed to the competent body.'),
      { h: 'Correspondence', kv: [O('Direction', ['Received', 'Dispatched']), T('Sender'), T('Recipient'), T('Origin / Destination'), D('Date of Letter'), T('Subject', { required: true })] },
      { h: 'Summary', lines: 4 },
      { h: 'Routing', kv: [T('Assigned To'), O('Action', ['Reply', 'File', 'Publish', 'Refer', 'Await']), T('Referred Authority, if any'), T('Related Record')] }
    ],
    sig: ['Recording Clerk', 'Supervising Officer']
  },
  {
    key: 'proceedings', file: '08', folder: 'directives', num: 'Proceeding', subject: 'place', summary: 'decisions-and-internal-directions',
    title: 'Record of Ministry Proceedings', subtitle: 'Minutes of Ministry councils and internal administrative meetings', tag: 'Record of Proceedings',
    preamble: 'Minutes of the sitting of the Ministry here recorded, faithfully taken by the Recorder and attested by the Presiding Officer, that what was decided may be known and carried out.',
    sections: [
      auth('Codex Officiorum Provinciae, Article IV (ordering of the Office and directives binding subordinates).', 'These proceedings record Ministry business only. They are not Cabinet enactments and do not become provincial law without the statutory enactment and promulgation process.'),
      { h: 'Sitting', kv: [D('Date of Sitting'), T('Hour'), T('Place', { required: true }), T('Presiding Officer'), T('Recorder'), T('Attendees')] },
      { h: 'Matters Presented', lines: 5 },
      { h: 'Decisions and Internal Directions', lines: 5 },
      { h: 'Referrals and Actions Assigned', grid: ['Action', 'Assigned To', 'Due (4E)', 'Related Record'], rows: 4, widths: [3780, 2400, 1900, 2000] }
    ],
    sig: ['Recorder', 'Presiding Officer']
  },
  {
    key: 'archive', file: '09', folder: 'archives', num: 'Archive Entry', subject: 'title', summary: 'archivist-notes',
    title: 'Catalogue of Ministry Archives', subtitle: 'Index and custody record of preserved Ministry documents', tag: 'Catalogue of Archives',
    preamble: 'Entry of a record committed to the keeping of the Ministry Archives, that it be preserved against loss and found again by any officer lawfully entitled to consult it.',
    sections: [
      auth('Codex Officiorum Provinciae, Article IV (ordering of the Office and instruments required for execution).', "The catalogue covers Ministry-held records. Records belonging legally to the Governor's Office, Justice, Interior, Finance, Legion, Hold courts, or Peer Institutions remain under their lawful custodians unless transferred or copied by authority."),
      { h: 'Archived Record', kv: [T('Title', { required: true }), O('Class', ['Directive', 'Writ', 'Register', 'Notice', 'Publication', 'Petition', 'Inquiry', 'Other']), T('Original Date'), T('Originating Office'), T('Related Records'), T('Repository Location')] },
      { h: 'Custody', kv: [O('Condition', ['Good', 'Worn', 'Damaged', 'Fragmentary']), O('Access', ['Open', 'Restricted', 'Sealed']), D('Date Archived')] },
      { h: 'Archivist Notes', lines: 4 }
    ],
    sig: ['Archive Clerk', 'Records Officer']
  },
  {
    key: 'petition', file: '10', folder: 'petitions', num: 'Petition', subject: 'name', summary: 'statement',
    title: 'Petition Before the Ministry', subtitle: 'Petition concerning matters within, or properly referable from, the Ministry portfolio', tag: 'Petition',
    preamble: 'To the Honourable ' + MINISTER + ' and the officers of the Ministry: the petitioner named below humbly sets forth the following matter and prays the attention of the Ministry thereto.',
    sections: [
      auth('Lex Ordo Debitus, Duty of Audience; Codex Officiorum Provinciae, ministerial competence and portfolio scope.', "The Ministry may hear petitions within its portfolio and route other petitions. Filing does not transfer jurisdiction from a Jarl, court, Ministry, Governor's Office, Legion, or Peer Institution."),
      { h: 'Petitioner', kv: [T('Name', { required: true }), T('Residence / Hold'), T('Standing / Occupation'), T('Representative'), O('Means of Reply', ['Courier', 'In Person', 'Through a Delegate', 'Other']), T('Where the Petitioner May Be Found')] },
      { h: 'Matter', kv: [O('Nature', ['Grievance', 'Request', 'Request for Records', 'License Application', 'Audience with an Officer', 'Public Information', 'Publication', 'Ministry Conduct', 'Other']), T('Persons / Offices Concerned'), T('Hold(s)')] },
      { h: 'Statement', lines: 6 },
      { h: 'Relief or Action Requested', lines: 3 },
      { h: 'Disposition', note: 'For Ministry use only.', kv: [O('Within Portfolio', ['Yes', 'No', 'Partial']), O('Action', ['Accept', 'Refer', 'Return', 'File']), T('Referred To'), T('Related Record')] }
    ],
    sig: ['Petitioner', 'Receiving Officer']
  },
  {
    key: 'matter', file: '11', folder: 'petitions', num: 'Administrative Matter', subject: 'principal-parties', summary: 'issue-presented',
    title: 'Record of Administrative Matter', subtitle: 'Opening record for a matter handled or routed by the Ministry', tag: 'Administrative Matter',
    preamble: 'Opening of a matter upon the rolls of the Ministry, to be carried in good order until its lawful close or referral to the authority rightly holding it.',
    sections: [
      auth('Codex Officiorum Provinciae, Article IV.', 'Opening a record does not create substantive jurisdiction. Matters outside the Civil and Administrative Affairs portfolio must be referred unless a competent authority has expressly delegated the function.'),
      { h: 'Matter', kv: [O('Origin', ['Petition', 'Correspondence', 'Publication', 'Internal Report', 'Delegation']), T('Related Record'), T('Principal Parties', { required: true }), T('Assigned Officer'), O('Priority', ['Routine', 'Urgent']), T('Delegation Reference, if applicable')] },
      { h: 'Issue Presented', lines: 4 },
      { h: 'Competence Review', kv: [O('Within Portfolio', ['Yes', 'No', 'Partial']), O('Competent Authority if Outside', ['Interior', 'Justice', 'Finance', 'Governor', 'Legion', 'Hold', 'Peer Institution', 'Other']), O('Routing Decision', ['Retain', 'Refer', 'Jointly Assist by Authorization'])] },
      { h: 'Actions and Disposition', grid: ['Date (4E)', 'Action Taken', 'Officer'], rows: 5, widths: [1900, 5780, 2400] }
    ],
    sig: ['Opening Clerk', 'Supervising Officer']
  },
  {
    key: 'inquiry', file: '12', folder: 'inquiries', num: 'Inquiry', subject: 'subject-matter', summary: 'questions-and-scope',
    title: "Adjudicator's Book of Administrative Inquiry", subtitle: 'Internal fact-finding or specially delegated administrative inquiry', tag: "Adjudicator's Book",
    preamble: 'The Book of the Imperial Adjudicator, wherein all questions, witnesses, and evidence touching this Inquiry are to be set down truly, in order, and without favour to any party.',
    sections: [
      auth('Codex Officiorum Provinciae, Article IV permits execution within portfolio and directives to subordinates. Justice retains interpretation of Imperial law, direction of Imperial Inquisitors, and legal-compliance oversight; Interior retains internal order/residuum.', 'The Imperial Adjudicator is not an Imperial Inquisitor, judge, prosecutor, or peace officer. Inquiry is limited to Ministry internal conduct, publication/record facts within portfolio, or a matter expressly delegated by competent authority. Suspected crimes and reserved matters must be referred.'),
      { h: 'Inquiry', kv: [T('Subject / Matter', { required: true }), T('Origin'), T('Assigned Adjudicator'), T('Authorizing Officer'), D('Date Opened'), T('Delegation / Jurisdiction Basis')] },
      { h: 'Questions and Scope', lines: 4 },
      { h: 'Witnesses / Sources', grid: ['Name / Record', 'Date Heard (4E)', 'Relevance'], rows: 5, widths: [3600, 2000, 4480] },
      { h: 'Evidence and Administrative Notes', grid: ['Exhibit', 'Description', 'Source / Custody'], rows: 5, widths: [1300, 5380, 3400] },
      { h: 'Chronology of the Inquiry', lines: 4 },
      { h: 'Closure', kv: [D('Date Closed'), T('Finding Issued'), O('Referral', ['None', 'Justice', 'Interior', 'Legion', 'Hold', 'Governor', 'Other'])] }
    ],
    sig: ['Imperial Adjudicator', 'Authorizing Officer']
  },
  {
    key: 'inquiry-writ', file: '13', folder: 'inquiries', num: 'Writ of Inquiry', subject: 'to', summary: 'scope',
    title: 'Writ of Administrative Inquiry', subtitle: 'Notice of Ministry administrative fact-finding', tag: 'Writ of Inquiry',
    preamble: 'To the person or office named below, greeting. Take notice that the Ministry hath opened an administrative inquiry within the bounds set out herein, and requests your cooperation accordingly.',
    sections: [
      auth('Codex Officiorum Provinciae, Article IV, only within the Ministry portfolio or written delegation.', 'This is not a criminal summons, arrest warrant, judicial subpoena, or Imperial Inquisitor process. It does not compel persons beyond authority granted by law or written delegation.'),
      { h: 'Notice', kv: [T('To', { required: true }), T('Inquiry No.'), T('Issued By'), D('Date Issued'), T('Authority / Delegation')] },
      { h: 'Scope', lines: 4, after: 'Issuance of this writ is not a finding of wrongdoing.' },
      { h: 'Voluntary or Lawfully Required Records / Cooperation', lines: 4 },
      { h: 'Routing Notice', kv: [F('Reserved Matter Discovered', 'Refer to competent authority'), F('Criminal Conduct Suspected', 'Refer to appropriate Hold / Legion / judicial authority')] },
      { h: 'Record of Service', kv: [T('Delivered To'), O('Means', ['By Hand', 'Courier', 'Through a Delegate', 'Other']), D('Date Delivered')] }
    ],
    sig: ['Imperial Adjudicator', 'Authorizing Officer']
  },
  {
    key: 'finding', file: '14', folder: 'inquiries', num: 'Finding', subject: 'subject', summary: 'facts-established',
    title: 'Finding of the Imperial Adjudicator', subtitle: 'Administrative finding arising from a lawful Ministry inquiry', tag: 'Finding of the Adjudicator',
    preamble: 'Having heard the matter and weighed the records laid before this office, the Imperial Adjudicator sets down the following Finding for the consideration of the Ministry.',
    sections: [
      auth('Authority is derivative of the underlying lawful Inquiry and Codex Officiorum Provinciae, Article IV.', 'A Finding is advisory/administrative within Ministry competence. It does not convict, sentence, remove a Hold officer, interpret Imperial law authoritatively, or bind another Ministry or Peer Institution absent lawful authority.'),
      { h: 'Origin', kv: [T('Inquiry'), T('Subject', { required: true }), T('Adjudicator'), D('Date of Finding'), T('Authority / Delegation')] },
      { h: 'Questions Presented', lines: 3 },
      { h: 'Facts Established', lines: 5 },
      { h: 'Administrative Findings', kv: [O('Issue I', ['Supported', 'Partially Supported', 'Unsupported', 'Inconclusive']), O('Issue II', ['Supported', 'Partially Supported', 'Unsupported', 'Inconclusive']), O('Issue III', ['Supported', 'Partially Supported', 'Unsupported', 'Inconclusive'])] },
      { h: 'Basis and Reasoning', lines: 5 },
      { h: 'Recommendations / Referral', lines: 3 }
    ],
    sig: ['Imperial Adjudicator', 'Receiving Superior']
  },
  {
    key: 'referral', file: '15', folder: 'referrals', num: 'Referral', subject: 'referred-to', summary: 'matter-referred',
    title: 'Writ of Referral', subtitle: 'Transfer or referral to the authority holding lawful competence', tag: 'Writ of Referral',
    preamble: 'To the authority named below, greeting. The matter here described lies beyond, or in part beyond, the competence of this Ministry, and is therefore respectfully referred to you for such action as your lawful office permits.',
    sections: [
      auth('Lex Ordo Debitus, Duty of Referral; Codex Officiorum Provinciae boundaries of ministerial competence.', 'Referral preserves rather than transfers legal jurisdiction. The receiving authority determines action under its own lawful powers.'),
      { h: 'Referral', kv: [T('Referred To', { required: true }), T('Authority / Office'), T('Originating Office'), T('Related Matter / Inquiry'), D('Date of Referral')] },
      { h: 'Matter Referred', lines: 4 },
      { h: 'Reason and Jurisdictional Basis', lines: 3 },
      { h: 'Records Transmitted', grid: ['No.', 'Record', 'Original / Copy'], rows: 4, widths: [900, 6680, 2500] },
      { h: 'Ministry Status', kv: [O('Status', ['Closed', 'Suspended Pending Response', 'Retained Only for Ministry Portion']), O('Acknowledgment Requested', ['Yes', 'No'])] }
    ],
    sig: ['Referring Officer', 'Receiving Authority / Acknowledgment']
  },
  {
    key: 'dispatch', file: '16', folder: 'envoys', num: 'Dispatch', subject: 'assigned-holds-route', summary: 'meetings-and-communications-notes',
    title: 'Dispatch from the Holds', subtitle: 'Report of a Ministry envoy concerning public information and Ministry liaison', tag: 'Dispatch from the Holds',
    preamble: 'From the Imperial Delegate of the Ministry, in the field among the Holds of Skyrim, to the Imperial Envoy to the Holds: this Dispatch, faithfully rendered, of all that was seen, heard, and done in the period below.',
    sections: [
      auth('Civil and Administrative Affairs portfolio under Codex Officiorum Provinciae; ministerial staffing under Article IV.', "An Imperial Delegate of this Ministry is a civil-information liaison unless separately commissioned. The office does not independently exercise the Governor's diplomatic portfolio, command Hold authorities, investigate crimes, or bind a Jarl or peer institution."),
      { h: 'Delegate', kv: [T('Delegate'), T('Assigned Holds / Route', { required: true }), T('Reporting Period'), O('Sent To', ['Imperial Envoy to the Holds', 'Ministry Superior'])] },
      { h: 'Public Notices, Declarations and Information Distributed', lines: 3 },
      { h: 'Meetings and Communications', grid: ['Date (4E)', 'Hold / Place', 'Persons Met', 'Substance'], rows: 4, widths: [1500, 2000, 2600, 3980] },
      { h: 'Meetings and Communications Notes', lines: 2 },
      { h: 'Public Concerns, Petitions and Reports Received', lines: 3 },
      { h: 'Publications, Rumors or False/Seditious Material Requiring Lawful Review', lines: 3 },
      { h: 'Recommended Routing', kv: [O('Ministry Action', ['Publish', 'Clarify', 'Monitor', 'Internal Inquiry', 'Refer']), T('Referral if Outside Portfolio')] }
    ],
    sig: ['Imperial Delegate', 'Receiving Superior']
  },
  {
    key: 'accord', file: '17', folder: 'envoys', num: 'Accord', subject: 'parties', summary: 'voluntary-understanding-accord',
    title: 'Record of Civil Conference and Accord', subtitle: 'Non-judicial record of voluntary conference or communication facilitated by Ministry personnel', tag: 'Conference and Accord',
    preamble: 'Record of a conference freely entered by the parties named below, held in the presence of an officer of the Ministry, and of such understanding as they reached of their own accord.',
    sections: [
      auth('Ministerial competence to execute portfolio functions and communicate public-facing Imperial information.', 'The Ministry does not adjudicate private rights or exercise judicial mediation authority by this form. Any accord is voluntary unless independently enforceable under competent law or approved by the proper authority.'),
      { h: 'Conference', kv: [T('Parties', { required: true }), T('Ministry Officer'), T('Place / Hold'), D('Date of Conference'), T('Related Matter')] },
      { h: 'Matter Discussed', lines: 4 },
      { h: 'Positions Recorded', lines: 4 },
      { h: 'Voluntary Understanding / Accord', lines: 5 },
      { h: 'Result', kv: [O('Result', ['Understanding Reached', 'No Accord', 'Referred']), T('Competent Authority for Further Action')] }
    ],
    sig: ['First Party', 'Second Party', 'Ministry Witness']
  },
  {
    key: 'directive', file: '18', folder: 'directives', num: 'Directive', subject: 'title', summary: 'standing-direction', adminOnly: true,
    title: 'Civil Affairs Standing Directive', subtitle: 'Internal executive instrument of the portfolio', tag: 'Standing Directive',
    preamble: 'By command of the ' + MINISTER + ', the following Standing Directive is issued to all officers of the Ministry, to be observed within the lawful bounds of the portfolio until amended or revoked.',
    sections: [
      auth('Codex Officiorum Provinciae, Article IV: Ministers may create regulations, standing orders or instruments required to execute laws within their portfolio and issue directives binding subordinates.', 'A Standing Directive is executive, not legislation. It binds Ministry subordinates within lawful competence and cannot amend provincial law, encroach another Ministry/Peer Institution, or become provincial law without Cabinet enactment, required signatures, Governor promulgation, and Gazette publication.'),
      { h: 'Directive', kv: [T('Title', { required: true }), F('Issued By', MINISTER), D('Effective Date'), T('Legal Basis')] },
      { h: 'Purpose', lines: 3 },
      { h: 'Standing Direction', lines: 6 },
      { h: 'Implementation and Responsible Officers', lines: 4 },
      { h: 'Effect', kv: [O('Duration', ['Until amended or revoked', 'Other lawful term']), T('Supersedes')] }
    ],
    sig: [MINISTER, 'Recording Officer']
  },
  {
    key: 'memorandum', file: '19', folder: 'directives', num: 'Memorandum', subject: 'subject', summary: 'message-instruction',
    title: 'Ministerial Memorandum', subtitle: 'Internal communication of the Ministry', tag: 'Ministerial Memorandum',
    preamble: 'From the office named below, to the officer or officers addressed: this Memorandum, to be read, acted upon, and acknowledged as set forth herein.',
    sections: [
      auth('Codex Officiorum Provinciae, Article IV.', 'A memorandum communicates or records internal business; it is not legislation and does not create powers beyond existing law or delegation.'),
      { h: 'Memorandum', kv: [T('To'), T('From'), D('Date of Memorandum'), T('Subject', { required: true }), T('Related Record')] },
      { h: 'Message / Instruction', lines: 7 },
      { h: 'Action', kv: [T('Required Action'), T('Responsible Officer'), D('Review / Due Date'), T('Disposition')] }
    ],
    sig: ['Author', 'Recipient / Acknowledgment']
  },
  {
    key: 'requisition', file: '20', folder: 'referrals', num: 'Requisition', subject: 'office-custodian', summary: 'records-cooperation-required',
    title: 'Ministerial Requisition for Records and Cooperation', subtitle: 'Administrative requisition issued within lawful ministerial competence', tag: 'Requisition for Records',
    preamble: 'To the office or custodian named below, greeting. The records and cooperation described herein being required for the lawful work of this Ministry, you are requested to furnish them within the bounds of your own office and the law.',
    sections: [
      auth('Codex Officiorum Provinciae, Article IV expressly permits a Minister, as required by function, to demand records, accounts and cooperation from other offices of the province.', 'The requisition must be genuinely required by the Ministry function and may not be used to seize jurisdiction, override privileges/reservations of law, command Peer Institutions beyond lawful reach, or substitute for criminal/judicial process.'),
      { h: 'Directed To', kv: [T('Office / Custodian', { required: true }), T('Related Matter'), T('Issuing Authority'), D('Date of Requisition'), T('Portfolio Purpose')] },
      { h: 'Records / Cooperation Required', lines: 5 },
      { h: 'Necessity to Ministry Function', lines: 3 },
      { h: 'Return', kv: [O('Method', ['Inspection', 'Copy', 'Account', 'Written Cooperation']), D('Requested Return'), D('Received'), T('Objection / Limitation Raised')] }
    ],
    sig: ['Issuing Minister / Authorized Officer', 'Receiving Custodian']
  },
  {
    key: 'notice', file: '21', folder: 'press', num: 'Public Notice', subject: 'title', summary: 'authorized-text-summary', publicCapable: true,
    title: 'Imperial Public Notice and Declaration Register', subtitle: 'Register of public-facing Imperial notices released through the Ministry', tag: 'Public Notice Register',
    preamble: 'Hear ye, and let it be recorded: the notice or declaration set down below was verified, approved, and released to the people of Skyrim through this Ministry in the manner here described.',
    sections: [
      auth('Codex Officiorum Provinciae: the Ministry is the authoritative source of information and manages release of public-facing Imperial declarations.', 'The Ministry may distribute and curate authorized information; it may not invent legal enactments or represent an unsigned/unpromulgated proposal as law.'),
      { h: 'Notice', kv: [T('Title', { required: true }), T('Originating Authority'), T('Authority Verified By'), D('Release Date'), T('Audience / Holds'), T('Gazette Reference, if law')] },
      { h: 'Authorized Text / Summary', lines: 7 },
      { h: 'Release Control', kv: [O('Status', ['Approved', 'Held', 'Corrected', 'Withdrawn']), O('Distribution', ['Notice Boards', 'Courier', 'Herald', 'Other']), T('Supersedes')] }
    ],
    sig: ['Release Officer', 'Minister / Authorized Approver']
  },
  {
    key: 'publication-review', file: '22', folder: 'press', num: 'Publication Review', subject: 'title-description', summary: 'analysis',
    title: 'Record of Publication Review', subtitle: 'Administrative review of a publication within the Ministry portfolio', tag: 'Publication Review',
    preamble: 'The publication described below having been laid before the Ministry, it was examined against Imperial law and not against any officer’s favour or displeasure, and the review is here recorded.',
    sections: [
      auth('Codex Officiorum Provinciae: curation of Imperial image, authoritative information, and suppression of unlawful publications within Imperial law.', 'No publication may be suppressed merely because it is unfavorable. Action must be grounded in Imperial law. Criminal, constitutional, or legal-interpretation questions are referred to Justice or other competent authority as appropriate.'),
      { h: 'Publication', kv: [T('Title / Description', { required: true }), T('Author / Publisher if Known'), T('Place Found / Distributed'), D('Date Received'), T('Reviewing Officer')] },
      { h: 'Content at Issue', lines: 4 },
      { h: 'Legal Basis Review', kv: [T('Potential Law / Rule Implicated'), T('Evidence of False / Seditious / Unlawful Content')] },
      { h: 'Analysis', lines: 5 },
      { h: 'Disposition', kv: [O('Result', ['No Action', 'Correction Requested', 'Public Clarification', 'Refer to Justice', 'Refer to Enforcement', 'Other']), T('Authority for Action')] }
    ],
    sig: ['Reviewing Officer', 'Minister / Authorized Superior']
  },
  {
    key: 'license', file: '23', folder: 'licenses', num: 'License', subject: 'holder', summary: 'conditions-of-license',
    title: 'License of the Ministry', subtitle: 'Grant of leave for press, printing or other activity entrusted to the Ministry by law', tag: 'License',
    preamble: 'Know all by these presents that the holder named below, having applied to the Ministry and satisfied the conditions of law, is granted leave to carry on the activity here described, within the bounds set out and until the term expires or the license is revoked.',
    sections: [
      auth('The law or written delegation placing this license with the Ministry, as named below.', 'The Ministry grants only those licenses that law or a competent delegation places with it. No fee or requirement may be set by office custom. A license does not excuse the holder from any other law.'),
      { h: 'Holder', kv: [T('Holder', { required: true }), T('Press or Trading Name'), T('Residence / Hold'), T('Premises')] },
      { h: 'License', kv: [O('Kind', ['Press License', 'Printing License', 'Literature License', 'Other']), T('Governing Law / Delegation', { required: true }), D('Date Issued'), D('Expires'), O('Standing', ['In Force', 'Suspended', 'Revoked', 'Lapsed'])] },
      { h: 'Conditions of License', lines: 4 }
    ],
    sig: ['Issuing Officer', 'Imperial Registrar / Minister']
  }
];

function prepare(form) {
  const used = new Set();
  const uid = s => { let b = slug(s) || 'field', k = b, i = 2; while (used.has(k)) k = b + '-' + i++; used.add(k); return k; };
  form.sections.forEach(s => {
    if (s.kv) s.kv.forEach(f => { f.id = uid(f.label); });
    if (s.lines || s.grid) s.id = uid(s.h);
  });
  return form;
}

const FORMS = RAW.map(prepare);
const BY_KEY = Object.fromEntries(FORMS.map(f => [f.key, f]));
const BASE_KEYS = new Set(FORMS.map(f => f.key));

const CUSTOM_FILE = 'customforms.json';
const listCustom = () => S.read(CUSTOM_FILE, []);

function uniqueKey(title) {
  const base = slug(title) || 'writ';
  let k = base, i = 2;
  while (BY_KEY[k]) k = base + '-' + i++;
  return k;
}

function buildFromSpec(spec) {
  const userSections = [];
  (spec.sections || []).forEach(s => {
    if (s.kind === 'paragraph') userSections.push({ h: s.h, lines: Math.max(1, Math.min(10, parseInt(s.lines, 10) || 4)) });
    else {
      const kv = (s.fields || []).map(f => f.type === 'date' ? D(f.label, { required: !!f.required }) : f.type === 'options' ? O(f.label, String(f.options || '').split(',').map(x => x.trim()).filter(Boolean), { required: !!f.required }) : T(f.label, { required: !!f.required }));
      if (kv.length) userSections.push({ h: s.h, kv });
    }
  });
  const sections = [auth(spec.authority || 'Established by the Minister for the use of this writ.', spec.limitation || 'This writ carries only the authority the Minister has granted it here, and no more.'), ...userSections];
  const form = prepare({
    key: spec.key, file: 'custom', custom: true, folder: spec.folder, num: spec.num, title: spec.title, subtitle: spec.subtitle || '', tag: spec.tag || spec.title,
    preamble: spec.preamble, sections, sig: (spec.sig || []).filter(Boolean), publicCapable: !!spec.publicCapable
  });
  const firstKv = userSections.find(s => s.kv && s.kv.length);
  form.subject = firstKv ? firstKv.kv[0].id : '';
  const firstLines = userSections.find(s => s.lines);
  form.summary = firstLines ? firstLines.id : '';
  return form;
}

function reload() {
  const oldKeys = new Set(FORMS.filter(f => f.custom).map(f => f.key));
  DEPTS.forEach(d => { d.forms = d.forms.filter(k => !oldKeys.has(k)); });
  for (let i = FORMS.length - 1; i >= 0; i--) if (FORMS[i].custom) FORMS.splice(i, 1);
  oldKeys.forEach(k => delete BY_KEY[k]);
  listCustom().forEach(spec => {
    try {
      const form = buildFromSpec(spec);
      FORMS.push(form);
      BY_KEY[form.key] = form;
      (spec.depts || []).forEach(id => { const d = DEPTS.find(x => x.id === id); if (d && !d.forms.includes(form.key)) d.forms.push(form.key); });
    } catch (e) { console.error('A writ template failed to load (' + (spec.title || spec.key) + '): ' + e.message); }
  });
}

function saveCustom(spec) {
  const list = listCustom();
  const title = String(spec.title || '').trim().slice(0, 140);
  if (!title) throw new Error('Give the writ a title.');
  if (!spec.num || !String(spec.num).trim()) throw new Error('Give the writ a record class, such as “Custom Writ”.');
  if (!C.FOLDERS[spec.folder]) throw new Error('Choose which chest of the Archives holds this writ.');
  const sig = (spec.sig || []).filter(Boolean);
  if (!sig.length) throw new Error('Name at least one signer.');
  const sections = (spec.sections || []).filter(s => s.kind === 'paragraph' || (s.fields || []).length);
  if (!sections.length) throw new Error('Add at least one section with a field or a paragraph.');
  let entry;
  if (spec.id) {
    const i = list.findIndex(x => x.id === spec.id);
    if (i === -1) throw new Error('No such writ template.');
    entry = { ...list[i], ...spec, title, sections, sig, key: list[i].key };
    list[i] = entry;
  } else {
    entry = { ...spec, id: S.id(), key: uniqueKey(title), title, sections, sig };
    if (BASE_KEYS.has(entry.key)) throw new Error('A built-in writ already answers to that name.');
    list.push(entry);
  }
  S.write(CUSTOM_FILE, list);
  reload();
  return entry;
}
function removeCustom(id) {
  const list = listCustom();
  if (!list.some(x => x.id === id)) throw new Error('No such writ template.');
  S.write(CUSTOM_FILE, list.filter(x => x.id !== id));
  reload();
}

reload();

module.exports = { FORMS, BY_KEY, MINISTER, slug, DEPTS, listCustom, saveCustom, removeCustom };
