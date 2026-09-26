const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookieSession = require('cookie-session');
const C = require('./lib/config');
const V = require('./lib/views');
const A = require('./lib/auth');
const U = require('./lib/users');
const G = require('./lib/google');
const S = require('./lib/store');
const Records = require('./lib/records');
const Settings = require('./lib/settings');
const Notify = require('./lib/notify');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(cookieSession({ name: 'ministry', keys: [C.SESSION_SECRET], maxAge: 1000 * 60 * 60 * 24 * 14, sameSite: 'lax', secure: C.PRODUCTION, httpOnly: true }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
const VENDOR = { 'pdf.min.js': 'pdfjs-dist/build/pdf.min.js', 'pdf.worker.min.js': 'pdfjs-dist/build/pdf.worker.min.js', 'html2canvas.min.js': 'html2canvas/dist/html2canvas.min.js' };
app.get('/vendor/:file', (req, res, next) => VENDOR[req.params.file] ? res.set('Cache-Control', 'public, max-age=604800').type('application/javascript').sendFile(require.resolve(VENDOR[req.params.file])) : next());

async function badges(u) {
  if (!u || !A.isStaff(u)) return null;
  const b = {};
  try {
    const rows = G.connected() ? await Records.all() : null;
    if (rows) {
      if (A.can(u, 'approve')) b.approvals = rows.filter(r => r.Status === 'Awaiting Seal' && Records.canSee(u, r)).length || '';
      if (A.can(u, 'petitions')) b.petitions = rows.filter(r => r.Class === 'Petition' && r.Status === 'Received' && Records.canSee(u, r)).length || '';
      if (A.can(u, 'correspondence')) b.correspondence = Records.requests().filter(q => q.status === 'Pending').length || '';
    }
  } catch (_) {}
  if (A.can(u, 'handover')) b.handover = S.read('handover.json', []).filter(n => (n.to === 'user:' + u.username || n.to === 'rank:' + u.rank) && !(n.readBy || []).includes(u.username)).length || '';
  b.notify = Notify.unreadCount(u) || '';
  return b;
}

app.use((req, res, next) => {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(18).toString('hex');
  if (req.session.user && !req.session.username) { req.session.username = req.session.user.username; req.session.user = null; }
  req.user = req.session.username ? U.sessionUser(req.session.username) : null;
  if (req.session.username && !req.user) req.session.username = null;
  res.locals.today = Settings.today();
  res.page = async (opts, status) => {
    const flash = req.session.flash; req.session.flash = null;
    const b = await badges(req.user);
    res.status(status || 200).send(V.layout({ user: req.user, csrf: req.session.csrf, flash: opts.flash || flash, today: res.locals.today, badges: b, ...opts }));
  };
  res.say = (title, text, status) => res.page({ title, body: V.message(title, text) }, status);
  next();
});
app.use(express.urlencoded({ extended: true, limit: '8mb', parameterLimit: 5000 }));

function checkCsrf(req, res, next) {
  if (req.body && req.body._csrf && req.body._csrf === req.session.csrf) return next();
  res.say('The seal is broken', 'This page was open too long or came from elsewhere. Go back, reload the page, and try again.', 403);
}
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const back = (req, fallback) => { const b = String((req.body && req.body.back) || ''); return b.startsWith('/') && !b.startsWith('//') ? b : fallback; };

const ctx = { checkCsrf, wrap, back };
require('./routes/public')(app, ctx);
require('./routes/staff')(app, ctx);
require('./routes/admin')(app, ctx);

app.get('/healthz', (req, res) => res.json({ ok: true }));

app.use((req, res) => res.say('No such hall', 'Nothing in the Ministry answers to that path.', 404));
app.use((err, req, res, next) => {
  if (typeof res.say !== 'function') {
    console.error(err);
    const status = (err && err.status) || (err && err.type === 'entity.too.large' ? 413 : 500);
    return res.status(status).type('html').send('<!doctype html><title>Something went amiss</title><body style="font-family:Georgia,serif;max-width:640px;margin:60px auto;padding:0 20px"><h1>Something went amiss</h1><p>The clerks could not complete that request. Try again shortly.</p></body>');
  }
  if (err === 'forbidden') return res.say('These halls are closed to you', 'Your rank does not open this part of the Ministry. If you need it, ask the Minister.', 403);
  if (err && (err.type === 'entity.too.large' || err.status === 413)) return res.say('That picture is too large', 'Seal and signet pictures must be under a few megabytes. Choose a smaller picture, or crop and re-save it, then try again.', 413);
  console.error(err);
  res.say('Something went amiss', 'The clerks could not complete that request. ' + V.esc(err && err.message ? err.message : '') + ' Try again shortly.', 500);
});

U.bootstrap();
if (require.main === module) app.listen(C.PORT, () => console.log(`Ministry portal listening on ${C.PORT}`));
module.exports = app;
