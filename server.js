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
const StaffRoom = require('./lib/staffroom');
const Notify = require('./lib/notify');
const Ranks = require('./lib/ranks');
const Desk = require('./lib/desk');
const Quota = require('./lib/quota');
const Letters = require('./lib/letters');
const Lapse = require('./lib/lapse');
const LV = require('./lib/lettersviews');
const Guide = require('./lib/guide');
const GV = require('./lib/guideviews');

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

function tourVeil(req, opts) {
  try {
    if (!req.user || opts.noVeil || !A.isStaff(req.user)) return '';
    if (req.user.mustChange) return '';
    if (String(req.originalUrl || '').indexOf('/account/password') === 0) return '';
    if (Guide.hasSeenTour(req.user)) return '';
    const n = Number.isFinite(Number(req.session.tourStep)) && req.session.tourStep !== null ? Number(req.session.tourStep) : 0;
    return GV.tourOverlay(req.user, req.session.csrf, req.originalUrl || '/staff', n);
  } catch (_) { return ''; }
}

function letterVeil(req, opts) {
  try {
    if (!req.user || opts.noVeil || req.user.mustChange) return '';
    const queue = Letters.mustFor(req.user);
    if (!queue.length) return '';
    const l = queue[0];
    if (String(req.originalUrl || '').indexOf('/staff/letters') === 0) return '';
    Letters.markSeen(l.id, req.user);
    return LV.overlay(l, req.session.csrf, req.originalUrl || '/staff', queue.length);
  } catch (_) { return ''; }
}

async function deskFor(u) {
  if (!u || !A.isStaff(u)) return null;
  let rows = null;
  try { rows = G.connected() ? (await Records.all() || []).filter(r => Records.canSee(u, r)) : null; } catch (_) {}
  let week = null;
  try {
    const rank = Ranks.get(u.rank);
    if (rank && rank.quota) week = Quota.weekFor(u, rows || [], Quota.weekKey(new Date()), Records.meta);
  } catch (_) {}
  let letters = [];
  try { letters = Letters.waitingFor(u); } catch (_) {}
  let due = [];
  try { due = Lapse.comingDue(rows, Records.meta, u); } catch (_) {}
  try { return Desk.gather(u, rows, { week, letters, due }); } catch (_) { return null; }
}

app.use((req, res, next) => {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(18).toString('hex');
  if (req.session.user && !req.session.username) { req.session.username = req.session.user.username; req.session.user = null; }
  req.user = req.session.username ? U.sessionUser(req.session.username) : null;
  if (req.session.username && !req.user) req.session.username = null;
  res.locals.today = Settings.today();
  // What the portal calls itself when it must print its own address. The
  // configured BASE_URL wins; otherwise the request says where we are, which is
  // the custom domain once Railway and Cloudflare are pointed at it.
  res.locals.site = C.BASE_URL || (req.protocol + '://' + req.get('host'));
  res.page = async (opts, status) => {
    const flash = req.session.flash; req.session.flash = null;
    const b = await badges(req.user);
    if (!opts.flash && req.user && Records.readingFromVault()) {
      const v = Records.Vault.state();
      let waiting = 0;
      try { waiting = Records.Spool.state().count; } catch (_) {}
      opts.flash = { err: true, html: 'The Ministry archives cannot be reached. You are reading the <b>last copy kept here</b>'
        + (v.at ? ', taken ' + new Date(v.at).toLocaleString('en-GB') : '')
        + '. You may still lay and seal records \u2014 they are <b>held here</b> and entered upon the Docket the moment Google answers.'
        + (waiting ? ' <b>' + waiting + (waiting === 1 ? ' piece</b> of work waits' : ' pieces</b> of work wait') + ' to be sent.' : '') };
    }
    const entered = req.session.entered; req.session.entered = null;
    // opts is spread first so an explicit flash that is undefined cannot wipe
    // the one waiting in the session after a redirect.
    try { if (req.user && opts.active) require('./lib/tabuse').note(req.user.username, opts.active); } catch (_) {}
    res.status(status || 200).send(V.layout({ ...opts, user: req.user, csrf: req.session.csrf, flash: opts.flash || flash, today: res.locals.today, badges: b, siteGround: Settings.pageGround(), siteCursor: Settings.cursor(), entered, staffRoom: StaffRoom.mayEnter(req.user), desk: await deskFor(req.user), letter: tourVeil(req, opts) || letterVeil(req, opts) }));
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
require('./routes/staffroom')(app, ctx);
require('./routes/war')(app, ctx);
require('./routes/justice')(app, ctx);
require('./routes/finance')(app, ctx);

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
require('./lib/warseed').seedIfEmpty();
try { require('./lib/offsite').begin(); } catch (_) {}
try { require('./lib/records'); require('./lib/spool').resume(); } catch (_) {}
if (require.main === module) app.listen(C.PORT, () => console.log(`Ministry portal listening on ${C.PORT}`));
module.exports = app;
