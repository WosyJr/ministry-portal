const S = require('./store');

const FILE = 'notifications.json';
const MAX = 600;

function push(to, text, link) {
  S.update(FILE, [], l => {
    l.push({ id: S.id(), to, text: String(text || '').slice(0, 300), link: link || '', at: new Date().toISOString(), readBy: [] });
    if (l.length > MAX) l.splice(0, l.length - MAX);
  });
}
function notifyUser(username, text, link) { if (username) push('user:' + username, text, link); }
function notifyRank(rank, text, link) { if (rank) push('rank:' + rank, text, link); }

function forUser(u) {
  if (!u) return [];
  return S.read(FILE, []).filter(n => n.to === 'user:' + u.username || n.to === 'rank:' + u.rank).sort((a, b) => b.at.localeCompare(a.at));
}
function unreadCount(u) {
  if (!u) return 0;
  return forUser(u).filter(n => !(n.readBy || []).includes(u.username)).length;
}
function markAllRead(u) {
  if (!u) return;
  S.update(FILE, [], l => {
    l.forEach(n => {
      if ((n.to === 'user:' + u.username || n.to === 'rank:' + u.rank) && !(n.readBy || []).includes(u.username)) {
        n.readBy = (n.readBy || []).concat(u.username);
      }
    });
  });
}

module.exports = { notifyUser, notifyRank, forUser, unreadCount, markAllRead };
