const S = require('./store');
const Ranks = require('./ranks');
const U = require('./users');

const FILE = 'roll-of-office.json';
const STRUCK = 'roll-struck.json';
const MAX = 2000;

function struck() {
  const d = S.read(STRUCK, {});
  return { keys: Array.isArray(d.keys) ? d.keys : [], people: Array.isArray(d.people) ? d.people : [] };
}

function suppressed(rank, username) {
  const d = struck();
  return d.people.includes(username) || d.keys.includes(rank + '|' + username);
}

function strike(id) {
  let gone = null;
  S.update(FILE, [], l => {
    const i = l.findIndex(x => x.id === id);
    if (i < 0) return;
    gone = l[i];
    l.splice(i, 1);
  });
  if (gone && !gone.until) {
    S.update(STRUCK, {}, d => {
      d.keys = Array.isArray(d.keys) ? d.keys : [];
      const k = gone.rank + '|' + gone.username;
      if (!d.keys.includes(k)) d.keys.push(k);
    });
  }
  return gone;
}

function forget(username) {
  let n = 0;
  S.update(FILE, [], l => {
    for (let i = l.length - 1; i >= 0; i--) {
      if (l[i].username === username) { l.splice(i, 1); n++; }
    }
  });
  S.update(STRUCK, {}, d => {
    d.people = Array.isArray(d.people) ? d.people : [];
    if (!d.people.includes(username)) d.people.push(username);
  });
  return n;
}

function restore(username) {
  S.update(STRUCK, {}, d => {
    d.people = (Array.isArray(d.people) ? d.people : []).filter(x => x !== username);
    d.keys = (Array.isArray(d.keys) ? d.keys : []).filter(k => k.split('|')[1] !== username);
  });
}

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
    if (suppressed(o.rank, o.username)) return;
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

function reconcile() {
  let changed = false;
  const list = all();
  const live = {};
  U.list().forEach(o => { if (o.active !== false) live[o.username] = o.rank; });
  list.forEach(e => {
    if (e.until) return;
    const now = live[e.username];
    if (now === undefined) { e.until = new Date().toISOString(); e.why = 'No longer upon the rolls'; changed = true; return; }
    if (now !== e.rank) { e.until = new Date().toISOString(); e.why = 'Moved to ' + ((Ranks.get(now) || {}).name || now); changed = true; }
  });
  Object.keys(live).forEach(un => {
    const rank = live[un];
    if (list.some(e => e.username === un && e.rank === rank && !e.until)) return;
    if (suppressed(rank, un)) return;
    const r = Ranks.get(rank);
    if (!r || !r.directory) return;
    const who = U.list().find(o => o.username === un) || {};
    list.push({ id: S.id(), rank, rankName: r.name, username: un, name: who.name || un, from: new Date().toISOString(), until: '', by: '', note: '' });
    changed = true;
  });
  if (changed) S.write(FILE, list);
  return changed;
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

function people() {
  const seen = {};
  all().forEach(e => { seen[e.username] = seen[e.username] || e.name || e.username; });
  return Object.keys(seen).sort().map(un => ({ username: un, name: seen[un] }));
}

module.exports = { all, open, close, moved, forRank, forPerson, holders, seed, reconcile, offices, strike, forget, restore, struck, people };
