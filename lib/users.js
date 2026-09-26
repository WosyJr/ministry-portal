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
    listed: u.listed !== false, bio: u.bio || '', quiz: u.quiz || null,
    active: u.active !== false, mustChange: !!u.mustChange, lastLogin: u.lastLogin || ''
  };
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
}

function update(username, patch) {
  const users = load();
  const u = users.find(x => x.username === norm(username));
  if (!u) throw new Error('No such officer.');
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
  if (patch.bio !== undefined) u.bio = String(patch.bio).trim().slice(0, 600);
  if (patch.signetText !== undefined) u.signet = { ...(u.signet || {}), text: String(patch.signetText).trim().slice(0, 12) };
  if (patch.signetImg !== undefined) u.signet = { ...(u.signet || {}), img: patch.signetImg || '' };
  if (patch.quiz !== undefined) u.quiz = patch.quiz;
  if (patch.password !== undefined) {
    const pp = passwordProblem(patch.password); if (pp) throw new Error(pp);
    u.hash = hash(patch.password);
    u.mustChange = !!patch.mustChange;
  }
  save(users);
  return publicView(u);
}

function remove(username) {
  const users = load();
  const u = users.find(x => x.username === norm(username));
  if (!u) return;
  if (u.rank === 'minister' && activeMinisters(users) <= 1) throw new Error('The last Minister cannot be removed.');
  save(users.filter(x => x !== u));
}

function rankInUse(id) { return load().some(u => u.rank === id); }

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
    signet: { text: (u.signet && u.signet.text) || '', img: (u.signet && u.signet.img) || '' }, mustChange: !!u.mustChange
  };
}

module.exports = { bootstrap, list, find, view, authenticate, create, update, remove, rankInUse, tempPassword, passwordProblem, sessionUser };
