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

module.exports = { log, recent };
