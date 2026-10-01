const S = require('./store');

const FILE = 'tabuse.json';
const OUT = 8;

const PINNED = ['desk'];

function note(username, key) {
  if (!username || !key) return;
  S.update(FILE, {}, d => {
    d[username] = d[username] || {};
    d[username][key] = (d[username][key] || 0) + 1;
    const keys = Object.keys(d[username]);
    if (keys.length > 40) {
      keys.sort((a, b) => d[username][a] - d[username][b]).slice(0, keys.length - 40).forEach(k => delete d[username][k]);
    }
  });
}

function counts(username) {
  return (S.read(FILE, {})[username] || {});
}

function split(username, tabs, active) {
  if (tabs.length <= OUT + 2) return { out: tabs, more: [] };
  const c = counts(username);
  const score = t => (PINNED.includes(t[2]) ? 1e6 : 0) + (t[2] === active ? 5e5 : 0) + (c[t[2]] || 0);
  const ranked = tabs.slice().sort((a, b) => score(b) - score(a) || tabs.indexOf(a) - tabs.indexOf(b));
  const keep = new Set(ranked.slice(0, OUT).map(t => t[2]));
  return {
    out: tabs.filter(t => keep.has(t[2])),
    more: tabs.filter(t => !keep.has(t[2]))
  };
}

module.exports = { note, counts, split, OUT };
