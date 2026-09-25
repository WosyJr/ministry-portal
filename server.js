const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookieSession = require('cookie-session');
const C = require('./lib/config');
const V = require('./lib/views');
const A = require('./lib/auth');
const U = require('./lib/users');
const G = require('./lib/google');
const { BY_KEY } = require('./lib/forms');
const { DEPTS } = require('./lib/content');
const { build } = require('./lib/docgen');
const { formatDate, roman } = require('./lib/skyrim');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.urlencoded({ extended: true, limit: '200kb' }));
app.use(cookieSession({ name: 'ministry', keys: [C.SESSION_SECRET], maxAge: 1000 * 60 * 60 * 24 * 14, sameSite: 'lax', secure: C.PRODUCTION, httpOnly: true }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

app.use((req, res, next) => {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(18).toString('hex');
  if (req.session.user) {
    const cur = U.find(req.session.user.username);
    if (!cur || cur.active === false) req.session.user = null;
    else req.session.user = { username: cur.username, name: cur.name, office: cur.office || '', role: cur.role, mustChange: !!cur.mustChange };
  }
  res.page = (opts, status) => {
    const flash = req.session.flash; req.session.flash = null;
    res.status(status || 200).send(V.layout({ user: req.session.user, csrf: req.session.csrf, flash: opts.flash || flash, ...opts }));
  };
  next();
});

function checkCsrf(req, res, next) {
  if (req.body && req.body._csrf && req.body._csrf === req.session.csrf) return next();
  res.page({ title: 'Seal broken', body: V.message('The seal is broken', 'This page was open too long or came from elsewhere. Go back, reload the page, and try again.') }, 403);
}

let noticeCache = { at: 0, rows: null };
async function publicNotices(force) {
  if (!G.connected()) return null;
  if (!force && noticeCache.rows && Date.now() - noticeCache.at < 60000) return noticeCache.rows;
  const rows = (await G.readDocket()).filter(r => r.Public === 'Yes').reverse();
  noticeCache = { at: Date.now(), rows };
  return rows;
}

app.get('/', async (req, res) => {
  let notices = [];
  try { notices = (await publicNotices()) || []; } catch (e) { console.error(e.message); }
  res.page({ title: 'The Hall', active: 'home', body: V.publicHome(notices) });
});

app.get('/notices', async (req, res) => {
  let notices = [], note = '';
  try { const n = await publicNotices(); if (n === null) note = 'The Notice Board is being prepared.'; else notices = n; } catch (e) { note = 'The Notice Board could not be read just now.'; console.error(e.message); }
  res.page({ title: 'Notice Board', active: 'notices', body: V.noticeBoard(notices, note) });
});

app.get('/login', (req, res) => {
  if (A.isStaff(req.session.user)) return res.redirect('/staff');
  res.page({ title: 'Staff Entrance', body: V.loginPage(req.session.csrf) });
});
app.post('/login', checkCsrf, (req, res) => {
  const username = String(req.body.username || '').slice(0, 40);
  const key = (req.ip || '') + '|' + username.toLowerCase();
  const wait = A.throttled(key);
  if (wait) return res.page({ title: 'Staff Entrance', body: V.loginPage(req.session.csrf, `Too many attempts. Wait ${wait} seconds and try again.`, username) }, 429);
  const user = U.authenticate(username, String(req.body.password || ''));
  if (!user) { A.failed(key); return res.page({ title: 'Staff Entrance', body: V.loginPage(req.session.csrf, 'That name and password do not match the rolls.', username) }, 401); }
  A.succeeded(key);
  const to = req.session.returnTo; req.session.returnTo = null;
  req.session.csrf = crypto.randomBytes(18).toString('hex');
  req.session.user = { username: user.username, name: user.name, office: user.office, role: user.role, mustChange: user.mustChange };
  if (user.mustChange) return res.redirect('/account/password');
  res.redirect(to && to.startsWith('/') && !to.startsWith('//') ? to : '/staff');
});
app.get('/account/password', A.requireStaff, (req, res) => res.page({ title: 'Change password', body: V.passwordPage(req.session.csrf, req.session.user.mustChange) }));
app.post('/account/password', A.requireStaff, checkCsrf, (req, res) => {
  const u = req.session.user;
  const cur = String(req.body.current || ''), next = String(req.body.password || ''), again = String(req.body.confirm || '');
  const fail = msg => res.page({ title: 'Change password', body: V.passwordPage(req.session.csrf, u.mustChange, msg) }, 400);
  if (!U.authenticate(u.username, cur)) return fail('Your current password is not correct.');
  if (next !== again) return fail('The two new passwords do not match.');
  if (next === cur) return fail('Choose a password different from the current one.');
  try { U.update(u.username, { password: next, mustChange: false }); } catch (e) { return fail(e.message); }
  req.session.user = { ...u, mustChange: false };
  req.session.flash = { text: 'Your password is changed.' };
  res.redirect('/staff');
});
app.post('/logout', checkCsrf, (req, res) => { req.session = null; res.redirect('/'); });

const staff = express.Router();
staff.use(A.requireStaff);

async function docketOrNull() {
  if (!G.connected()) return null;
  try { return await G.readDocket(); } catch (e) { console.error(e.message); return null; }
}

staff.get('/', async (req, res) => {
  const rows = await docketOrNull();
  res.page({ title: 'Staff Hall', active: 'staff', body: V.staffHome(req.session.user, rows && rows.slice(-8).reverse()) });
});
staff.get('/clerk', (req, res) => {
  const s = parseInt(req.query.s, 10) || 0;
  res.page({ title: 'Clerk Desk', active: 'clerk', body: V.clerk(String(req.query.q || '').slice(0, 80), s) });
});
staff.get('/forms', (req, res) => res.page({ title: 'Writs & Forms', active: 'forms', body: V.formsIndex(req.session.user) }));

function formGuard(req, res) {
  const f = BY_KEY[req.params.key];
  if (!f) { res.page({ title: 'Not found', body: V.message('No such writ', 'That instrument is not kept by this Ministry.') }, 404); return null; }
  if (f.adminOnly && !A.isAdmin(req.session.user)) { res.page({ title: 'Minister only', body: V.message('Reserved to the Minister', 'Only the Minister may issue this instrument.') }, 403); return null; }
  return f;
}

staff.get('/forms/:key', (req, res) => {
  const f = formGuard(req, res); if (!f) return;
  const flash = G.connected() ? null : { err: true, text: 'The Ministry archives are not connected to Google yet, so this writ cannot be filed. The Minister can connect them in the Minister’s Study.' };
  res.page({ title: f.title, active: 'forms', body: V.formPage(f, req.session.user, req.session.csrf), flash });
});

const clean = (s, max = 6000) => String(s ?? '').replace(/\r/g, '').slice(0, max).trim();

staff.post('/forms/:key', checkCsrf, async (req, res) => {
  const f = formGuard(req, res); if (!f) return;
  const b = req.body || {};
  const fIn = b.f || {}, dIn = b.d || {}, gIn = b.g || {};
  const fields = {};
  const missing = [];
  for (const s of f.sections) {
    if (s.kv) for (const fl of s.kv) {
      if (fl.type === 'text') fields[fl.id] = clean(fIn[fl.id], 300);
      if (fl.type === 'options') fields[fl.id] = fl.options.includes(fIn[fl.id]) ? fIn[fl.id] : '';
      if (fl.type === 'date') { const d = dIn[fl.id] || {}; fields[fl.id] = formatDate(d.day, d.month, d.year); }
      if (fl.required && !fields[fl.id]) missing.push(fl.label);
    }
    if (s.lines) fields[s.id] = clean(fIn[s.id]);
    if (s.grid) {
      const rows = [];
      for (let i = 0; i < (s.rows || 5); i++) rows.push(s.grid.map((_, j) => clean(gIn[s.id] && gIn[s.id][i] && gIn[s.id][i][j], 300)));
      fields[s.id] = rows;
    }
  }
  const rd = b.recordDate || {};
  const recordDate = formatDate(rd.day, rd.month, rd.year);
  if (!recordDate) missing.push('Date of Record');
  const sigNames = f.sig.map((_, i) => clean(b.sig && b.sig[i], 160));
  const makePublic = f.publicCapable && A.isAdmin(req.session.user) && b.public === '1';
  const again = (msg) => res.page({ title: f.title, active: 'forms', flash: { err: true, text: msg }, body: V.formPage(f, req.session.user, req.session.csrf, { f: fIn, d: dIn, g: gIn, sig: b.sig, recordDate: rd, public: b.public === '1' }) }, 400);
  if (missing.length) return again('Before sealing, fill in: ' + missing.join(', ') + '.');
  if (!G.connected()) return again('The Ministry archives are not connected to Google yet. The Minister must connect them before writs can be filed.');

  try {
    const entry = await G.serial(async () => {
      const n = await G.nextNumber(f.num);
      const recordNo = `${f.num} ${roman(n)}`;
      const subject = fields[f.subject] || f.title;
      const buffer = await build(f, { fields, recordNo, recordDate, filedBy: req.session.user.name + (req.session.user.office ? ', ' + req.session.user.office : ''), sigNames });
      const doc = await G.uploadAsGoogleDoc(buffer, `${recordNo} — ${subject}`.slice(0, 180), C.FOLDERS[f.folder]);
      const summary = f.summary ? String(fields[f.summary] || '').slice(0, 4000) : '';
      const row = {
        'Record No': recordNo, Class: f.num, Number: n, 'Date (4E)': recordDate, Subject: subject, 'Filed By': req.session.user.name + (req.session.user.office ? ', ' + req.session.user.office : ''),
        Folder: C.FOLDER_NAMES[f.folder], Document: doc.webViewLink, Status: 'Open', Public: makePublic ? 'Yes' : 'No', Summary: summary,
        'Filed At (UTC)': new Date().toISOString(), Form: f.key
      };
      await G.appendDocket(row);
      return row;
    });
    if (makePublic) noticeCache.at = 0;
    res.page({ title: entry['Record No'], active: 'forms', body: V.filed(entry) });
  } catch (e) {
    console.error(e);
    again('The writ could not be filed: ' + (e.message || 'unknown error') + ' Nothing was numbered. Try again in a moment.');
  }
});

staff.get('/docket', async (req, res) => {
  const q = String(req.query.q || '').slice(0, 80).toLowerCase();
  const cls = String(req.query.class || '').slice(0, 60);
  let rows = await docketOrNull();
  if (rows) {
    rows = rows.slice().reverse();
    if (q) rows = rows.filter(r => [r['Record No'], r.Subject, r['Filed By'], r.Summary].join(' ').toLowerCase().includes(q));
    if (cls) rows = rows.filter(r => r.Class === cls);
  }
  res.page({ title: 'Docket', active: 'docket', body: V.docketPage(rows, req.session.user, req.session.csrf, req.query.q, cls) });
});
staff.post('/docket/:row/status', checkCsrf, async (req, res) => {
  const row = parseInt(req.params.row, 10), status = ['Open', 'Closed', 'Referred', 'Archived'].includes(req.body.status) ? req.body.status : null;
  if (row >= 2 && status) { try { await G.updateCell(row, 'Status', status); } catch (e) { req.session.flash = { err: true, text: 'Could not update the Docket: ' + e.message }; } }
  res.redirect('/staff/docket');
});
staff.post('/docket/:row/public', checkCsrf, A.requireAdmin, async (req, res) => {
  const row = parseInt(req.params.row, 10), value = req.body.value === 'Yes' ? 'Yes' : 'No';
  if (row >= 2) { try { await G.updateCell(row, 'Public', value); noticeCache.at = 0; req.session.flash = { text: value === 'Yes' ? 'Posted to the public Notice Board.' : 'Withdrawn from the public Notice Board.' }; } catch (e) { req.session.flash = { err: true, text: 'Could not update the Docket: ' + e.message }; } }
  res.redirect('/staff/docket');
});

staff.get('/office/:id', (req, res) => {
  const d = DEPTS.find(x => x.id === req.params.id);
  if (!d) return res.page({ title: 'Not found', body: V.message('No such office', 'That office is not part of this Ministry.') }, 404);
  res.page({ title: d.title, active: 'office-' + d.id, body: V.office(d, req.session.user) });
});
staff.get('/manual', (req, res) => res.page({ title: 'Manuals', active: 'manual', body: V.manual() }));
staff.get('/search', async (req, res) => {
  const q = String(req.query.q || '').slice(0, 80);
  let rows = [];
  if (q) {
    const all = await docketOrNull();
    rows = all === null ? null : all.filter(r => [r['Record No'], r.Subject, r['Filed By'], r.Summary, r['Date (4E)']].join(' ').toLowerCase().includes(q.toLowerCase())).reverse();
  }
  res.page({ title: 'Archives', active: 'search', body: V.search(q, rows) });
});
app.use('/staff', staff);

const admin = express.Router();
admin.use(A.requireAdmin);
function study(req, res, status) {
  res.page({ title: 'Minister\u2019s Study', active: 'admin', body: V.adminPage(G.status(), U.list(), req.session.csrf, req.session.user, res.locals.issued) }, status);
}
admin.get('/', (req, res) => study(req, res));
admin.post('/officers', checkCsrf, (req, res) => {
  const pw = U.tempPassword();
  try {
    U.create({ username: req.body.username, name: req.body.name, office: req.body.office, role: req.body.role, password: pw });
    res.locals.issued = { username: String(req.body.username).trim().toLowerCase(), name: req.body.name, password: pw, fresh: true };
    study(req, res);
  } catch (e) { res.page({ title: 'Minister\u2019s Study', active: 'admin', flash: { err: true, text: e.message }, body: V.adminPage(G.status(), U.list(), req.session.csrf, req.session.user) }, 400); }
});
admin.post('/officers/:username/:action', checkCsrf, (req, res) => {
  const who = req.params.username, act = req.params.action;
  try {
    if (act === 'reset') {
      const pw = U.tempPassword();
      const u = U.update(who, { password: pw, mustChange: true });
      res.locals.issued = { username: u.username, name: u.name, password: pw };
      return study(req, res);
    }
    if (act === 'suspend') { if (who === req.session.user.username) throw new Error('You cannot suspend your own account.'); U.update(who, { active: false }); req.session.flash = { text: 'Suspended ' + who + '.' }; }
    else if (act === 'restore') { U.update(who, { active: true }); req.session.flash = { text: 'Restored ' + who + '.' }; }
    else if (act === 'role') { if (who === req.session.user.username && req.body.role !== 'admin') throw new Error('You cannot remove your own Minister rank.'); U.update(who, { role: req.body.role }); req.session.flash = { text: 'Rank updated for ' + who + '.' }; }
    else if (act === 'edit') { U.update(who, { name: req.body.name, office: req.body.office }); req.session.flash = { text: 'Updated ' + who + '.' }; }
    else if (act === 'remove') { if (who === req.session.user.username) throw new Error('You cannot strike your own name from the rolls.'); U.remove(who); req.session.flash = { text: 'Removed ' + who + ' from the rolls.' }; }
  } catch (e) { req.session.flash = { err: true, text: e.message }; }
  res.redirect('/admin');
});
admin.get('/google/connect', (req, res) => {
  if (!G.configured()) return res.redirect('/admin');
  const state = crypto.randomBytes(16).toString('hex');
  req.session.googleState = state;
  res.redirect(G.authUrl(state));
});
admin.post('/google/disconnect', checkCsrf, (req, res) => { G.disconnect(); req.session.flash = { text: 'Google disconnected.' }; res.redirect('/admin'); });
app.use('/admin', admin);

app.get('/oauth/google/callback', A.requireAdmin, async (req, res) => {
  try {
    if (!req.query.code || req.query.state !== req.session.googleState) throw new Error('The Google connection could not be verified. Try again.');
    req.session.googleState = null;
    const out = await G.handleCallback(req.query.code);
    if (!G.connected()) throw new Error('Google did not grant lasting access. Remove the app from your Google account permissions and connect again.');
    await G.ensureDocket();
    req.session.flash = { text: 'The Ministry archives are connected' + (out.email ? ' as ' + out.email : '') + '. The live Docket sheet is in Ledgers & Dockets.' };
    res.redirect('/admin');
  } catch (e) {
    req.session.flash = { err: true, text: e.message };
    res.redirect('/admin');
  }
});

app.get('/healthz', (req, res) => res.json({ ok: true }));

app.use((req, res) => res.page({ title: 'Not found', body: V.message('No such hall', 'Nothing in the Ministry answers to that path.') }, 404));
app.use((err, req, res, next) => {
  if (err === 'forbidden') return res.page({ title: 'Not admitted', body: V.message('These halls are closed to you', 'This part of the Ministry is reserved to its officers. You may still read the <a href="/notices">Notice Board</a>.') }, 403);
  console.error(err);
  res.page({ title: 'Error', body: V.message('Something went amiss', 'The clerks could not complete that request. Try again shortly.') }, 500);
});

U.bootstrap();
app.listen(C.PORT, () => console.log(`Ministry portal listening on ${C.PORT}`));
