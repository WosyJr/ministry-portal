const S = require('./store');
const U = require('./users');
const Ranks = require('./ranks');

const FILE = 'letters.json';
const MAX = 400;

const clean = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
const text = (v, n) => String(v == null ? '' : v).replace(/\r\n/g, '\n').trim().slice(0, n);

function all() { return S.read(FILE, []); }
function get(id) { return all().find(l => l.id === id) || null; }

function branchOf(u) { return Ranks.userBranch(u); }

function audience(by, b) {
  const to = String(b.to || 'named');
  const people = U.list().filter(o => o.active !== false);
  if (to === 'everyone') {
    if (!by.all) throw new Error('Only the Minister of the whole province may write to every hall.');
    return { kind: 'everyone', names: people.map(o => o.username), label: 'every officer on the rolls' };
  }
  if (to === 'ministry') {
    const branch = by.all ? clean(b.branch, 20) : branchOf(by);
    const list = people.filter(o => Ranks.userBranch(o) === branch);
    const name = (Ranks.BRANCHES.find(x => x.id === branch) || {}).short || branch;
    return { kind: 'ministry', branch, names: list.map(o => o.username), label: 'everyone of ' + name };
  }
  if (to === 'rank') {
    const rank = clean(b.rank, 60);
    const r = Ranks.get(rank);
    if (!r) throw new Error('No such rank.');
    if (!by.all && Ranks.branchOf(r) !== branchOf(by)) throw new Error('That rank is not of your Ministry.');
    const list = people.filter(o => o.rank === rank);
    return { kind: 'rank', rank, names: list.map(o => o.username), label: 'every ' + r.name };
  }
  const want = [].concat(b.who || []).map(x => clean(x, 60)).filter(Boolean);
  const list = people.filter(o => want.includes(o.username));
  if (!list.length) throw new Error('Name at least one officer to write to.');
  if (!by.all) {
    const mine = branchOf(by);
    const stray = list.find(o => Ranks.userBranch(o) !== mine);
    if (stray) throw new Error(`${stray.name} is not of your Ministry. Only the Minister of the province may write across the halls.`);
  }
  return { kind: 'named', names: list.map(o => o.username), label: list.map(o => o.name).join(', ') };
}

function write(b, by) {
  const subject = clean(b.subject, 160);
  if (!subject) throw new Error('Give the letter a subject.');
  const body = text(b.body, 6000);
  if (!body) throw new Error('A letter wants something written in it.');
  const aud = audience(by, b);
  if (!aud.names.length) throw new Error('Nobody answers to that — the letter would go to no one.');
  const entry = {
    id: S.id(),
    subject, body,
    must: !!b.must,
    sealed: !!b.sealed,
    by: by.username, byName: by.name, byTitle: by.title || '',
    to: aud.kind, toLabel: aud.label, rank: aud.rank || '', branch: aud.branch || '',
    names: aud.names.filter(n => n !== by.username),
    seen: {}, read: {},
    at: new Date().toISOString()
  };
  S.update(FILE, [], l => { l.push(entry); if (l.length > MAX) l.splice(0, l.length - MAX); });
  return entry;
}

function waitingFor(u) {
  if (!u) return [];
  const me = u.username;
  return all()
    .filter(l => l.names.includes(me) && !l.read[me])
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

function nextFor(u) {
  const list = waitingFor(u);
  return list.length ? list[0] : null;
}

function markSeen(id, u) {
  if (!u) return;
  S.update(FILE, [], l => {
    const x = l.find(v => v.id === id);
    if (x && x.names.includes(u.username) && !x.seen[u.username]) x.seen[u.username] = new Date().toISOString();
  });
}

function acknowledge(id, u) {
  if (!u) return null;
  let out = null;
  S.update(FILE, [], l => {
    const x = l.find(v => v.id === id);
    if (!x || !x.names.includes(u.username)) return;
    if (!x.read[u.username]) x.read[u.username] = new Date().toISOString();
    out = x;
  });
  return out;
}

function sentBy(username) {
  return all().filter(l => l.by === username).sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

function receipts(id) {
  const l = get(id);
  if (!l) return null;
  const people = U.list();
  const rows = l.names.map(n => {
    const o = people.find(p => p.username === n) || { username: n, name: n, rankName: '' };
    return {
      user: o,
      read: l.read[n] || '',
      seen: l.seen[n] || '',
      standing: l.read[n] ? 'Set their hand to it' : l.seen[n] ? 'Opened, not yet answered' : (o.lastLogin ? 'Has not opened it' : 'Has not entered the hall')
    };
  });
  return { letter: l, rows, done: rows.filter(r => r.read).length };
}

function remove(id, by) {
  let ok = false;
  S.update(FILE, [], l => {
    const i = l.findIndex(v => v.id === id);
    if (i < 0) return;
    if (l[i].by !== by.username && !by.all) return;
    l.splice(i, 1);
    ok = true;
  });
  return ok;
}

module.exports = { all, get, write, waitingFor, nextFor, markSeen, acknowledge, sentBy, receipts, remove };
