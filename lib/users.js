const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const C = require('./config');

const FILE = () => path.join(C.DATA_DIR, 'users.json');
const ROLES = ['staff', 'admin'];

function load() {
  try { return JSON.parse(fs.readFileSync(FILE(), 'utf8')); } catch (_) { return []; }
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

function bootstrap() {
  const users = load();
  if (users.length) return;
  const u = norm(C.ADMIN_USERNAME), p = C.ADMIN_PASSWORD;
  if (!u || !p) return;
  if (!validUsername(u) || passwordProblem(p)) { console.error('ADMIN_USERNAME or ADMIN_PASSWORD is not valid; the first Minister account was not created.'); return; }
  save([{ username: u, name: C.MINISTER_NAME, office: 'Minister of Civil and Administrative Affairs', role: 'admin', hash: hash(p), mustChange: false, active: true, created: new Date().toISOString() }]);
  console.log('Created the first Minister account: ' + u);
}

function publicView(u) { return { username: u.username, name: u.name, office: u.office || '', role: u.role, active: u.active !== false, mustChange: !!u.mustChange, lastLogin: u.lastLogin || '' }; }
function list() { return load().map(publicView); }
function find(username) { return load().find(u => u.username === norm(username)); }

function authenticate(username, password) {
  const users = load();
  const u = users.find(x => x.username === norm(username));
  const ok = u && u.active !== false && verify(String(password || ''), u.hash);
  if (!ok) { if (!u) verify('x', hash('y')); return null; }
  u.lastLogin = new Date().toISOString();
  save(users);
  return publicView(u);
}

function create({ username, name, office, role, password }) {
  const users = load();
  const un = norm(username);
  if (!validUsername(un)) throw new Error('Usernames are 3–32 characters: letters, numbers, dot, dash or underscore.');
  if (users.some(u => u.username === un)) throw new Error('That username is already on the rolls.');
  if (!String(name || '').trim()) throw new Error('Give the officer a name.');
  const pp = passwordProblem(password); if (pp) throw new Error(pp);
  users.push({ username: un, name: String(name).trim().slice(0, 80), office: String(office || '').trim().slice(0, 120), role: ROLES.includes(role) ? role : 'staff', hash: hash(password), mustChange: true, active: true, created: new Date().toISOString() });
  save(users);
}

function update(username, patch) {
  const users = load();
  const u = users.find(x => x.username === norm(username));
  if (!u) throw new Error('No such officer.');
  if (patch.role !== undefined) {
    const role = ROLES.includes(patch.role) ? patch.role : 'staff';
    if (u.role === 'admin' && role !== 'admin' && users.filter(x => x.role === 'admin' && x.active !== false).length <= 1) throw new Error('The last Minister account cannot be demoted.');
    u.role = role;
  }
  if (patch.active !== undefined) {
    if (!patch.active && u.role === 'admin' && users.filter(x => x.role === 'admin' && x.active !== false).length <= 1) throw new Error('The last Minister account cannot be suspended.');
    u.active = !!patch.active;
  }
  if (patch.name !== undefined) u.name = String(patch.name).trim().slice(0, 80) || u.name;
  if (patch.office !== undefined) u.office = String(patch.office).trim().slice(0, 120);
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
  if (u.role === 'admin' && users.filter(x => x.role === 'admin' && x.active !== false).length <= 1) throw new Error('The last Minister account cannot be removed.');
  save(users.filter(x => x !== u));
}

function tempPassword() {
  const words = ['ember', 'frost', 'stone', 'raven', 'amber', 'river', 'thane', 'oaken', 'sable', 'wyrm', 'hearth', 'dusk', 'crown', 'lantern', 'mead', 'pine'];
  const pick = () => words[crypto.randomInt(words.length)];
  return `${pick()}-${pick()}-${pick()}-${crypto.randomInt(10, 99)}`;
}

module.exports = { bootstrap, list, find, authenticate, create, update, remove, tempPassword, passwordProblem, ROLES };
