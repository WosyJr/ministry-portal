const S = require('./store');

const FILE = 'activity.jsonl';

function log(user, action, target, detail) {
  S.append(FILE, { at: new Date().toISOString(), who: user ? user.username : '', name: user ? user.name : 'The public', action, target: target || '', detail: detail || '' });
}
function recent({ limit = 300, who, target, since } = {}) {
  let rows = S.lines(FILE);
  if (who) rows = rows.filter(r => r.who === who);
  if (target) rows = rows.filter(r => r.target === target || String(r.detail).includes(target));
  if (since) rows = rows.filter(r => r.at >= since);
  return rows.reverse().slice(0, limit);
}
function loggedRecently(who, action, target, withinMs) {
  const rows = S.lines(FILE);
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    if (r.target !== target || r.action !== action) continue;
    if (r.who !== (who || '')) continue;
    return Date.now() - Date.parse(r.at) < withinMs;
  }
  return false;
}

module.exports = { log, recent, loggedRecently };
