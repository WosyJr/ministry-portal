const crypto = require('crypto');
const S = require('./store');

const FILE = 'countersign.json';
const CAP = 800;

function all() { return S.read(FILE, []); }
function save(list) { S.write(FILE, list.slice(-CAP)); }

function create({ recordNo, formKey, by, byName, toUser, toName, role, sigIndex, note }) {
  const list = all();
  const entry = {
    id: S.id(),
    token: crypto.randomBytes(24).toString('hex'),
    recordNo, formKey,
    by, byName: byName || by,
    toUser: toUser || '',
    toName: toName || '',
    role: role || '',
    sigIndex: Number(sigIndex) || 0,
    note: note || '',
    status: 'Sent',
    at: new Date().toISOString(),
    doneAt: '', signedName: '', reply: ''
  };
  list.push(entry);
  save(list);
  return entry;
}

function byToken(token) {
  if (!token || typeof token !== 'string' || token.length < 20) return null;
  return all().find(x => x.token === token) || null;
}
function byId(id) { return all().find(x => x.id === id) || null; }
function forUser(username) { return all().filter(x => x.toUser === username && x.status === 'Sent').reverse(); }
function forRecord(no) { return all().filter(x => x.recordNo === no).reverse(); }
function sentBy(username) { return all().filter(x => x.by === username).reverse(); }
function openForRecord(no) { return all().filter(x => x.recordNo === no && x.status === 'Sent'); }

function finish(id, status, { signedName, reply } = {}) {
  const list = all();
  const e = list.find(x => x.id === id);
  if (!e) return null;
  e.status = status;
  e.doneAt = new Date().toISOString();
  if (signedName) e.signedName = signedName;
  if (reply) e.reply = reply;
  save(list);
  return e;
}

module.exports = { create, byToken, byId, forUser, forRecord, sentBy, openForRecord, finish, all };
