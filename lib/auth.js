const isStaff = u => !!u && (u.role === 'staff' || u.role === 'admin');
const isAdmin = u => !!u && u.role === 'admin';

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

function gate(check) {
  return (req, res, next) => {
    const u = req.session.user;
    if (check(u)) {
      if (u.mustChange && !req.path.startsWith('/account')) return res.redirect('/account/password');
      return next();
    }
    if (!u) { req.session.returnTo = req.originalUrl; return res.redirect('/login'); }
    res.status(403);
    next('forbidden');
  };
}

module.exports = { isStaff, isAdmin, requireStaff: gate(isStaff), requireAdmin: gate(isAdmin), throttled, failed, succeeded };
