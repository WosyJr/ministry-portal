const Ranks = require('./ranks');

const isStaff = u => Ranks.isStaff(u);
const isAdmin = u => !!u && !!u.all;
const can = (u, p) => Ranks.can(u, p);

const attempts = new Map();
function throttled(key) {
  const now = Date.now();
  const a = attempts.get(key) || { n: 0, until: 0, first: now };
  if (a.until > now) return Math.ceil((a.until - now) / 1000);
  if (now - a.first > 15 * 60 * 1000) attempts.delete(key);
  return 0;
}
function failed(key) {
  const now = Date.now();
  const a = attempts.get(key) || { n: 0, until: 0, first: now };
  a.n += 1;
  if (a.n >= 5) { a.until = now + Math.min(15 * 60 * 1000, 30 * 1000 * 2 ** (a.n - 5)); }
  attempts.set(key, a);
}
function succeeded(key) { attempts.delete(key); }

const buckets = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const list = (buckets.get(key) || []).filter(t => now - t < windowMs);
  if (list.length >= max) { buckets.set(key, list); return false; }
  list.push(now);
  buckets.set(key, list);
  return true;
}

function gate(check) {
  return (req, res, next) => {
    const u = req.user;
    if (u && check(u)) {
      if (u.mustChange && !req.originalUrl.startsWith('/account')) return res.redirect('/account/password');
      return next();
    }
    if (!u) { req.session.returnTo = req.originalUrl; return res.redirect('/login'); }
    res.status(403);
    next('forbidden');
  };
}
const need = (...perms) => gate(u => perms.some(p => can(u, p)));

module.exports = { isStaff, isAdmin, can, need, requireStaff: gate(isStaff), requireAdmin: gate(isAdmin), throttled, failed, succeeded, rateLimit };
