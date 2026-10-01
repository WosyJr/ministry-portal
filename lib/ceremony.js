const S = require('./store');
const Ranks = require('./ranks');

const FILE = 'oaths.json';

const BRANCH_OATH = {
  civil: [
    'I will keep the Ministry’s record truly, and set down what happened rather than what I should have liked to happen.',
    'I will not use this office for my own gain, nor for the gain of any house, hold or faction.',
    'I will answer those who come to the Ministry, whether or not I can give them what they ask.',
    'I will not exceed the powers written against my office, and where I am uncertain I will ask rather than assume.'
  ],
  justice: [
    'I will look for what disproves an allegation as hard as for what supports it.',
    'I will set down what is favourable to the person investigated whether it suits me or not.',
    'I will go out only under a writ, and will not take a power that is not written upon it.',
    'I will remember that the Ministry’s purpose is that the truth be found, not that someone be punished.'
  ],
  war: [
    'I will keep the rolls of the Legion truly, so that no soldier of the Empire is forgotten or unpaid.',
    'I will not hold a soldier, nor punish one, but upon a warrant that names the matter and the hand that ordered it.',
    'I will send on to the Ministry of Justice what is more than a matter of military discipline.',
    'I will remember that the Legion is in Skyrim for Skyrim, and answer to the people of the province accordingly.'
  ],
  finance: [
    'I will enter every coin that comes in and every coin that goes out, with the name of whoever ordered it.',
    'I will not pay out upon a word alone, nor enter a sum I have not seen rendered.',
    'I will close the accounts honestly, and will not quietly amend a month that has been closed.',
    'I will remember that the purse is the province’s and not the Ministry’s.'
  ],
  general: [
    'I will keep what is given me in confidence, and will not trade upon my access to this hall.',
    'I will not represent myself as holding an office I do not hold.'
  ]
};

const COMMON = 'I take up this office under the authority of the Governor of Skyrim, and I will lay it down when I am asked to, without grievance.';

function all() { return S.read(FILE, {}); }

function taken(username) {
  if (!username) return null;
  return all()[String(username).toLowerCase()] || null;
}

function branchOf(u) {
  if (!u) return 'general';
  if (u.all) return 'civil';
  const b = Ranks.userBranch(u);
  return BRANCH_OATH[b] ? b : 'general';
}

function articlesFor(u) {
  return BRANCH_OATH[branchOf(u)] || BRANCH_OATH.general;
}

function take(u, today, signature) {
  if (!u) return null;
  const who = String(u.username).toLowerCase();
  const entry = {
    username: u.username,
    name: u.name,
    signature: String(signature || '').replace(/\s+/g, ' ').trim().slice(0, 80),
    rank: u.rank,
    office: u.title || u.rankName || '',
    branch: branchOf(u),
    articles: articlesFor(u),
    common: COMMON,
    day: (today && today.text) || '',
    at: new Date().toISOString()
  };
  S.update(FILE, {}, d => { d[who] = entry; });
  return entry;
}

function forget(username) {
  S.update(FILE, {}, d => { delete d[String(username).toLowerCase()]; });
}

module.exports = { BRANCH_OATH, COMMON, all, taken, branchOf, articlesFor, take, forget };
