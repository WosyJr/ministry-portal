const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const C = require('./config');
const Ranks = require('./ranks');

const FILE = () => path.join(C.DATA_DIR, 'users.json');

function migrate(u) {
  if (!u.rank) u.rank = u.role === 'admin' ? 'minister' : 'civil-clerk';
  delete u.role;
  if (!Array.isArray(u.holds)) u.holds = [];
  if (u.listed === undefined) u.listed = true;
  if (!u.signet) u.signet = { text: '' };
  return u;
}
function load() {
  try { return JSON.parse(fs.readFileSync(FILE(), 'utf8')).map(migrate); } catch (_) { return []; }
}
function save(users) {
  fs.mkdirSync(C.DATA_DIR, { recursive: true });
  const tmp = FILE() + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(users, null, 2));
  fs.renameSync(tmp, FILE());
}

function hash(password, salt = crypto.randomBytes(16).toString('hex')) {
  const h = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${h}`;
}
function verify(password, stored) {
  const [alg, salt, h] = String(stored || '').split('$');
  if (alg !== 'scrypt' || !salt || !h) return false;
  const test = crypto.scryptSync(password, salt, 64);
  const known = Buffer.from(h, 'hex');
  return known.length === test.length && crypto.timingSafeEqual(known, test);
}

const norm = u => String(u || '').trim().toLowerCase();
const validUsername = u => /^[a-z0-9._-]{3,32}$/.test(u);
function passwordProblem(p) {
  if (!p || p.length < 10) return 'Passwords must be at least 10 characters.';
  if (p.length > 200) return 'That password is too long.';
  return '';
}
const activeMinisters = users => users.filter(x => x.rank === 'minister' && x.active !== false).length;

function bootstrap() {
  const users = load();
  if (users.length) { save(users); return; }
  const u = norm(C.ADMIN_USERNAME), p = C.ADMIN_PASSWORD;
  if (!u || !p) return;
  if (!validUsername(u) || passwordProblem(p)) { console.error('ADMIN_USERNAME or ADMIN_PASSWORD is not valid; the first Minister account was not created.'); return; }
  save([migrate({ username: u, name: C.MINISTER_NAME, office: '', rank: 'minister', hash: hash(p), mustChange: false, active: true, created: new Date().toISOString() })]);
  console.log('Created the first Minister account: ' + u);
}

function publicView(u) {
  const rank = Ranks.get(u.rank);
  return {
    username: u.username, name: u.name, office: u.office || '', rank: u.rank, rankName: rank ? rank.name : 'Unranked',
    holds: u.holds || [], signet: { text: (u.signet && u.signet.text) || '', img: !!(u.signet && u.signet.img) },
    listed: u.listed !== false, bio: u.bio || '', quiz: u.quiz || null, prefs: u.prefs || {}, arms: u.arms || null,
    discord: u.discord ? { id: u.discord.id, name: u.discord.name, username: u.discord.username } : null,
    active: u.active !== false, mustChange: !!u.mustChange, lastLogin: u.lastLogin || '',
    weekly: Number(u.weekly) > 0 ? Math.round(Number(u.weekly) * 100) / 100 : 0
  };
}
function discordOf(username) {
  const u = find(username);
  return (u && u.discord) || null;
}

function findByDiscord(id) {
  const key = String(id || '');
  if (!key) return null;
  const u = load().find(x => x.discord && String(x.discord.id) === key);
  return u ? publicView(u) : null;
}

function linkDiscord(username, profile) {
  const un = norm(username);
  const id = String((profile && profile.id) || '');
  if (!id) throw new Error('Discord gave back no account.');
  const users = load();
  const taken = users.find(x => x.discord && String(x.discord.id) === id && x.username !== un);
  if (taken) throw new Error('That Discord account is already set against ' + taken.name + '. One Discord, one officer.');
  const u = users.find(x => x.username === un);
  if (!u) throw new Error('No officer answers to that name.');
  u.discord = {
    id,
    username: String(profile.username || '').slice(0, 60),
    name: String(profile.name || profile.username || '').slice(0, 80),
    avatar: String(profile.avatar || '').slice(0, 80),
    at: new Date().toISOString()
  };
  save(users);
  return u.discord;
}

function unlinkDiscord(username) {
  const un = norm(username);
  const users = load();
  const u = users.find(x => x.username === un);
  if (!u || !u.discord) return null;
  const was = u.discord;
  delete u.discord;
  save(users);
  return was;
}

function list() { return load().map(publicView); }
function find(username) { return load().find(u => u.username === norm(username)); }
function view(username) { const u = find(username); return u ? publicView(u) : null; }

function authenticate(username, password) {
  const users = load();
  const u = users.find(x => x.username === norm(username));
  const ok = u && u.active !== false && verify(String(password || ''), u.hash);
  if (!ok) { if (!u) verify('x', hash('y')); return null; }
  u.lastLogin = new Date().toISOString();
  save(users);
  return publicView(u);
}

const cleanHolds = h => (Array.isArray(h) ? h : h ? [h] : []).filter(x => Ranks.HOLD_BY_ID[x]);

function create({ username, name, office, rank, holds, password }) {
  const users = load();
  const un = norm(username);
  if (!validUsername(un)) throw new Error('Usernames are 3–32 characters: letters, numbers, dot, dash or underscore.');
  if (users.some(u => u.username === un)) throw new Error('That username is already on the rolls.');
  if (!String(name || '').trim()) throw new Error('Give the officer a name.');
  const r = Ranks.get(rank);
  if (!r) throw new Error('Choose a rank for the officer.');
  const pp = passwordProblem(password); if (pp) throw new Error(pp);
  const h = cleanHolds(holds);
  users.push({ username: un, name: String(name).trim().slice(0, 80), office: String(office || '').trim().slice(0, 120), rank: r.id, holds: h.length ? h : (r.holds || []), signet: { text: '' }, listed: true, hash: hash(password), mustChange: true, active: true, created: new Date().toISOString() });
  save(users);
  try { require('./roll').open(r.id, un, String(name).trim().slice(0, 80), null, 'Entered upon the rolls.'); } catch (_) {}
}

function update(username, patch) {
  const users = load();
  const u = users.find(x => x.username === norm(username));
  if (!u) throw new Error('No such officer.');
  const wasRank = u.rank;
  const wasActive = u.active !== false;
  if (patch.rank !== undefined) {
    const r = Ranks.get(patch.rank);
    if (!r) throw new Error('No such rank.');
    if (u.rank === 'minister' && r.id !== 'minister' && activeMinisters(users) <= 1) throw new Error('The last Minister cannot be given another rank.');
    if (u.rank !== r.id && r.holds && r.holds.length && !(u.holds || []).length) u.holds = r.holds.slice();
    u.rank = r.id;
  }
  if (patch.active !== undefined) {
    if (!patch.active && u.rank === 'minister' && activeMinisters(users) <= 1) throw new Error('The last Minister cannot be suspended.');
    u.active = !!patch.active;
  }
  if (patch.name !== undefined) u.name = String(patch.name).trim().slice(0, 80) || u.name;
  if (patch.office !== undefined) u.office = String(patch.office).trim().slice(0, 120);
  if (patch.holds !== undefined) u.holds = cleanHolds(patch.holds);
  if (patch.listed !== undefined) u.listed = !!patch.listed;
  if (patch.prefs !== undefined && patch.prefs && typeof patch.prefs === 'object') {
    u.prefs = u.prefs || {};
    ['plain', 'glossary'].forEach(k => { if (patch.prefs[k] !== undefined) u.prefs[k] = !!patch.prefs[k]; });
  }
  if (patch.bio !== undefined) u.bio = String(patch.bio).trim().slice(0, 600);
  // What the Treasury pays them each week. Kept on the officer's own record so
  // the Ministry that appoints them sets it, and Finance only reads it.
  if (patch.weekly !== undefined) {
    const n = Number(patch.weekly);
    u.weekly = Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
  }
  if (patch.arms !== undefined) {
    u.arms = patch.arms === null ? null : require('./arms').clean(patch.arms);
  }
  if (patch.signetText !== undefined) u.signet = { ...(u.signet || {}), text: String(patch.signetText).trim().slice(0, 12) };
  if (patch.signetImg !== undefined) u.signet = { ...(u.signet || {}), img: patch.signetImg || '' };
  if (patch.quiz !== undefined) u.quiz = patch.quiz;
  if (patch.password !== undefined) {
    const pp = passwordProblem(patch.password); if (pp) throw new Error(pp);
    u.hash = hash(patch.password);
    u.mustChange = !!patch.mustChange;
  }
  save(users);
  try {
    const Roll = require('./roll');
    const nowActive = u.active !== false;
    if (wasRank !== u.rank) Roll.moved(u.username, wasRank, u.rank, u.name, null);
    else if (wasActive && !nowActive) Roll.close(u.rank, u.username, null, 'Stood down');
    else if (!wasActive && nowActive) Roll.open(u.rank, u.username, u.name, null, 'Restored to the rolls.');
  } catch (_) {}
  return publicView(u);
}

function remove(username) {
  const users = load();
  const u = users.find(x => x.username === norm(username));
  if (!u) return;
  if (u.rank === 'minister' && activeMinisters(users) <= 1) throw new Error('The last Minister cannot be removed.');
  save(users.filter(x => x !== u));
  try { require('./roll').close(u.rank, u.username, null, 'Struck from the rolls'); } catch (_) {}
}

function rankInUse(id) { return load().some(u => u.rank === id); }

function ranksHeld() {
  const out = new Set();
  load().forEach(u => { if (u.rank) out.add(u.rank); });
  return out;
}

function movedRanks(map) {
  const users = load();
  let changed = false;
  users.forEach(u => { if (map[u.rank]) { u.rank = map[u.rank]; changed = true; } });
  if (changed) save(users);
  return changed;
}

function tempPassword() {
  const words = ['ember', 'frost', 'stone', 'raven', 'amber', 'river', 'thane', 'oaken', 'sable', 'wyrm', 'hearth', 'dusk', 'crown', 'lantern', 'mead', 'pine'];
  const pick = () => words[crypto.randomInt(words.length)];
  return `${pick()}-${pick()}-${pick()}-${crypto.randomInt(10, 99)}`;
}

function sessionUser(username) {
  const u = find(username);
  if (!u || u.active === false) return null;
  const r = Ranks.get(u.rank) || { id: u.rank, name: 'Unranked', perms: [], depts: [] };
  return {
    username: u.username, name: u.name, office: u.office || '', rank: r.id, rankName: r.name, title: u.office || r.name,
    all: !!r.all, perms: r.perms || [], depts: r.all ? Ranks.DEPT_IDS : (r.depts || []), holds: u.holds || [], ministry: r.ministry || '',
    signet: { text: (u.signet && u.signet.text) || '', img: (u.signet && u.signet.img) || '' }, mustChange: !!u.mustChange,
    prefs: u.prefs || {}, arms: u.arms || null, discord: u.discord ? { id: u.discord.id, name: u.discord.name, username: u.discord.username, avatar: u.discord.avatar } : null
  };
}

module.exports = { bootstrap, list, find, view, authenticate, discordOf, findByDiscord, linkDiscord, unlinkDiscord, create, update, remove, rankInUse, ranksHeld, movedRanks, tempPassword, passwordProblem, sessionUser };
