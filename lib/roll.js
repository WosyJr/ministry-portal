const S = require('./store');
const Ranks = require('./ranks');
const U = require('./users');

const FILE = 'roll-of-office.json';
const MAX = 2000;

const clean = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);

function all() { return S.read(FILE, []); }

function open(rank, username, name, by, note) {
  const r = Ranks.get(rank);
  if (!r) return null;
  const list = all();
  const standing = list.find(e => e.rank === rank && e.username === username && !e.until);
  if (standing) return standing;
  const entry = {
    id: S.id(),
    rank, rankName: r.name,
    username: clean(username, 60), name: clean(name, 80),
    from: new Date().toISOString(), until: '',
    by: (by && by.name) || '', note: clean(note, 200)
  };
  S.update(FILE, [], l => { l.push(entry); if (l.length > MAX) l.splice(0, l.length - MAX); });
  return entry;
}

function close(rank, username, by, why) {
  S.update(FILE, [], l => {
    const e = l.find(x => x.rank === rank && x.username === username && !x.until);
    if (!e) return;
    e.until = new Date().toISOString();
    e.untilBy = (by && by.name) || '';
    e.why = clean(why, 160);
  });
}

function moved(username, fromRank, toRank, name, by) {
  if (fromRank && fromRank !== toRank) close(fromRank, username, by, 'Moved to ' + ((Ranks.get(toRank) || {}).name || toRank));
  if (toRank) open(toRank, username, name, by, '');
}

function forRank(rank) {
  return all().filter(e => e.rank === rank).sort((a, b) => String(b.from).localeCompare(String(a.from)));
}

function forPerson(username) {
  return all().filter(e => e.username === username).sort((a, b) => String(b.from).localeCompare(String(a.from)));
}

function holders(rank) {
  return forRank(rank).filter(e => !e.until);
}

function seed() {
  const list = all();
  if (list.length) return 0;
  let n = 0;
  U.list().forEach(o => {
    if (o.active === false || !o.rank) return;
    const r = Ranks.get(o.rank);
    if (!r || !r.directory) return;
    list.push({
      id: S.id(), rank: o.rank, rankName: r.name, username: o.username, name: o.name,
      from: o.created || new Date().toISOString(), until: '', by: '', note: 'Entered upon the roll when the roll was begun.'
    });
    n++;
  });
  if (n) S.write(FILE, list);
  return n;
}

function offices() {
  const seen = {};
  all().forEach(e => {
    seen[e.rank] = seen[e.rank] || { rank: e.rank, rankName: e.rankName, entries: [] };
    seen[e.rank].entries.push(e);
  });
  Ranks.all().filter(r => r.directory).forEach(r => {
    seen[r.id] = seen[r.id] || { rank: r.id, rankName: r.name, entries: [] };
    seen[r.id].rankName = r.name;
    seen[r.id].group = r.group || '';
    seen[r.id].branch = Ranks.branchOf(r);
  });
  return Object.values(seen).map(o => {
    const entries = o.entries.sort((a, b) => String(b.from).localeCompare(String(a.from)));
    return { ...o, entries, now: entries.filter(e => !e.until), past: entries.filter(e => e.until) };
  }).sort((a, b) => String(a.rankName).localeCompare(String(b.rankName)));
}

module.exports = { all, open, close, moved, forRank, forPerson, holders, seed, offices };
