const crypto = require('crypto');
const C = require('../lib/config');
const V = require('../lib/views');
const A = require('../lib/auth');
const U = require('../lib/users');
const G = require('../lib/google');
const Ranks = require('../lib/ranks');
const Tr = require('../lib/training');
const Records = require('../lib/records');
const Settings = require('../lib/settings');
const Activity = require('../lib/activity');
const { BY_KEY } = require('../lib/forms');
const Counter = require('../lib/countersign');
const Notify = require('../lib/notify');
const Ranks2 = require('../lib/ranks');
const { formatDate } = require('../lib/skyrim');
const { ROUTES } = require('../lib/content');

module.exports = (app, { checkCsrf, wrap }) => {
  async function publicRows() {
    if (!G.connected()) return null;
    try { return await Records.all(); } catch (e) { console.error(e.message); return null; }
  }
  const notices = rows => (rows || []).filter(r => r.Public === 'Yes' && r.Form !== 'directive' && !['Awaiting Seal', 'Returned'].includes(r.Status)).reverse();

  app.get('/', (req, res) => res.send(V.landingPage(res.locals.today, req.user, Settings.landing(), Settings.pageGround(), Settings.cursor(), req.session.csrf)));

  // The province's own clock, so the date on the page can turn over while
  // somebody is still looking at it.
  app.get('/api/today', (req, res) => {
    res.set('Cache-Control', 'no-store');
    const t = Settings.today();
    res.json({ text: t.text, day: t.day, month: t.month, year: t.year });
  });

  app.get('/hall', wrap(async (req, res) => {
    res.page({ title: 'The Hall', active: 'home', body: V.publicHome(notices(await publicRows()), res.locals.today) });
  }));
  app.get('/notices', wrap(async (req, res) => {
    const rows = await publicRows();
    res.page({ title: 'Notice Board', active: 'notices', body: V.noticeBoard(notices(rows), rows === null ? 'The Notice Board is being prepared.' : '') });
  }));
  app.get('/proclamation/:no', wrap(async (req, res) => {
    const rows = await publicRows();
    const r = rows && rows.find(x => x['Record No'] === req.params.no);
    if (!r || !(r.Public === 'Yes' || Records.canSee(req.user, r))) return res.say('No such proclamation', 'Nothing posted by the Ministry answers to that number.', 404);
    res.send(V.proclamationPrint(r, '/seal/minister'));
  }));
  app.get('/seal/minister', (req, res) => {
    const im = Settings.ministerSeal() || Settings.ministryWax();
    res.set('Cache-Control', 'no-cache').type(im.type === 'jpg' ? 'image/jpeg' : 'image/png').send(im.data);
  });

  // The Delegate's exercise. Open to anyone with the link, needs no login, and
  // nothing filed upon it touches the Docket — it is not a record of the
  // Ministry, it is somebody showing they can write one.
  app.get('/exercise/dispatch', (req, res) => {
    res.page({ title: 'The Delegate\u2019s Exercise', active: '', body: V.exerciseBox(req.session.csrf, null, res.locals.today) });
  });

  app.post('/exercise/dispatch', checkCsrf, wrap(async (req, res) => {
    const b = req.body || {};
    if (b.website) return res.redirect('/exercise/dispatch');
    const again = (msg, status = 400) => res.page({ title: 'The Delegate\u2019s Exercise', active: '', flash: { err: true, text: msg }, body: V.exerciseBox(req.session.csrf, b, res.locals.today) }, status);
    if (!A.rateLimit('exercise|' + req.ip, 5, 60 * 60 * 1000)) return again('That is enough from your hand for this hour. Return later.', 429);
    try {
      const x = Tr.add(b);
      res.page({ title: 'Received', active: '', body: V.exerciseDone(x) });
    } catch (e) { again(e.message); }
  }));

  app.get('/petition', (req, res) => {
    res.page({ title: 'Petition Box', active: 'petition', body: V.petitionBox(req.session.csrf, null, G.connected() ? '' : 'The Ministry’s rolls are being prepared.', res.locals.today) });
  });
  app.post('/petition', checkCsrf, wrap(async (req, res) => {
    const b = req.body || {};
    const again = (msg, status = 400) => res.page({ title: 'Petition Box', active: 'petition', flash: { err: true, text: msg }, body: V.petitionBox(req.session.csrf, b, '', res.locals.today) }, status);
    if (b.website) return res.redirect('/petition');
    if (!G.connected()) return again('The Petition Box is shut for the moment. Seek out a clerk of the Ministry instead.', 503);
    const hold = Ranks.HOLD_BY_ID[b.hold];
    const txt = (k, n) => String(b[k] || '').replace(/\r/g, '').trim().slice(0, n);
    const natures = ['Grievance', 'Request', 'Request for Records', 'License Application', 'Audience with an Officer', 'Public Information', 'Other'];
    if (!txt('name', 120) || !hold || !txt('where', 200) || !natures.includes(b.nature) || txt('statement', 4000).length < 10) return again('Give your name, your Hold, where you may be found, the nature of your petition and your statement.');
    if (!A.rateLimit('petition|' + req.ip, 3, 60 * 60 * 1000)) return again('The Petition Box is full from your hand for this hour. Return later.', 429);
    const tp = Records.todayParts();
    const form = BY_KEY.petition;
    const parsed = Records.parseInput(form, {
      f: {
        name: txt('name', 120), 'residence-hold': hold.name, 'standing-occupation': txt('standing', 120), 'means-of-reply': ['Courier', 'In Person', 'Through a Delegate', 'Other'].includes(b.reply) ? b.reply : '',
        'where-the-petitioner-may-be-found': txt('where', 200), nature: b.nature, 'persons-offices-concerned': txt('concerned', 200), 'hold-s': hold.name,
        statement: txt('statement', 4000), 'relief-or-action-requested': txt('relief', 1500)
      },
      recordDate: tp, sig: [txt('name', 120), '']
    });
    try {
      const row = await Records.file({ form, parsed, by: null, hold: hold.id, linked: [], status: 'Received', noSeal: true, extraMeta: { publicBox: true } });
      Activity.log(null, 'dropped a petition in the Box', row['Record No'], hold.name);
      res.page({ title: row['Record No'], active: 'petition', body: V.petitionReceived(row['Record No'], row['Date (4E)']) });
    } catch (e) {
      console.error(e);
      again('The Petition Box could not take your petition just now. Try again in a moment.', 500);
    }
  }));

  app.get('/petition/status', wrap(async (req, res) => {
    const q = String(req.query.no || '').slice(0, 40);
    let result;
    if (q) {
      if (!A.rateLimit('lookup|' + req.ip, 40, 10 * 60 * 1000)) return res.say('Too many questions', 'Wait a little and ask again.', 429);
      const p = Records.parseRecordNo(q, 'Petition');
      const rows = await publicRows();
      const r = p && /^petition$/i.test(p.cls) && rows && rows.find(x => x.Class === 'Petition' && parseInt(x.Number, 10) === p.n);
      result = r ? { no: r['Record No'], status: Records.PUBLIC_STATUS[r.Status] || 'Under Review', date: r['Date (4E)'] } : null;
    }
    res.page({ title: 'Petition status', active: 'petition', body: V.petitionStatus(q, result) });
  }));

  const publicOnly = rows => (rows || []).filter(r => r.Public === 'Yes');
  const newestFirst = rows => rows.slice().reverse();

  app.get('/guide', wrap(async (req, res) => {
    res.page({ title: 'Questions & Answers', active: 'guide', body: V.publicGuide(ROUTES) });
  }));

  app.get('/records', wrap(async (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 80);
    const cls = String(req.query.class || '').trim().slice(0, 40);
    const rows = await publicRows();
    const open = rows === null ? null : newestFirst(publicOnly(rows));

    const classes = [];
    if (open) {
      const seen = new Map();
      open.forEach(r => { const c = String(r.Class || '').trim(); if (c) seen.set(c, (seen.get(c) || 0) + 1); });
      Array.from(seen.entries()).sort((a, b) => b[1] - a[1]).forEach(([name, n]) => classes.push({ name, n }));
    }

    let results;
    if (q) {
      if (!A.rateLimit('reclookup|' + req.ip, 40, 10 * 60 * 1000)) return res.say('Too many searches', 'Wait a little and search again.', 429);
      const needle = q.toLowerCase();
      results = open === null ? null : open.filter(r => [r['Record No'], r.Subject, r.Summary, r.Hold, r.Class].some(v => String(v || '').toLowerCase().includes(needle))).slice(0, 40);
    }

    const recent = open === null ? [] : (cls ? open.filter(r => String(r.Class || '') === cls) : open).slice(0, 24);
    res.page({ title: 'Record Lookup', active: 'records', body: V.recordLookup(q, results, { classes, recent, cls }) });
  }));

  app.get('/records/suggest', wrap(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const q = String(req.query.q || '').trim().slice(0, 60);
    if (q.length < 2) return res.json([]);
    if (!A.rateLimit('recsugpub|' + req.ip, 120, 60 * 1000)) return res.json([]);
    const rows = await publicRows();
    if (rows === null) return res.json([]);
    const needle = q.toLowerCase();
    const byNo = [], bySubject = [];
    for (const r of newestFirst(publicOnly(rows))) {
      const no = String(r['Record No'] || '');
      const subject = String(r.Subject || '');
      if (no.toLowerCase().includes(needle)) byNo.push({ no, subject: subject.slice(0, 70) });
      else if ((subject + ' ' + (r.Hold || '') + ' ' + (r.Class || '')).toLowerCase().includes(needle)) bySubject.push({ no, subject: subject.slice(0, 70) });
      if (byNo.length >= 12) break;
    }
    res.json(byNo.concat(bySubject).slice(0, 12));
  }));

  async function signCtx(req, res) {
    const cs = Counter.byToken(String(req.params.token || ''));
    if (!cs) { res.status(404).send(V.signDone({ title: 'No such request', text: 'That link answers to nothing. It may have been withdrawn, or already answered.', today: res.locals.today })); return null; }
    if (cs.status !== 'Sent') { res.send(V.signDone({ title: 'Already answered', text: `This document was ${cs.status.toLowerCase()} on ${(cs.doneAt || '').slice(0, 10)}. Nothing further is asked of you.`, today: res.locals.today })); return null; }
    const form = BY_KEY[cs.formKey];
    const rows = await Records.allOrNull();
    const rec = rows && rows.find(x => x['Record No'] === cs.recordNo);
    if (!form || !rec) { res.status(404).send(V.signDone({ title: 'The record cannot be read', text: 'The Ministry cannot lay hands on that record just now. Tell the officer who sent you this link.', today: res.locals.today })); return null; }
    return { cs, form, rec, input: (Records.meta(rec).input || { f: {}, d: {}, g: {}, sig: [] }) };
  }

  app.get('/sign/:token', wrap(async (req, res) => {
    if (!A.rateLimit('sign|' + req.ip, 60, 10 * 60 * 1000)) return res.status(429).send(V.signDone({ title: 'Too many attempts', text: 'Wait a little and open the link again.', today: res.locals.today }));
    const ctx = await signCtx(req, res); if (!ctx) return;
    res.send(V.signPage({ ...ctx, blanks: V.blanksFor(ctx.form, ctx.input), csrf: req.session.csrf, today: res.locals.today }));
  }));

  app.post('/sign/:token', checkCsrf, wrap(async (req, res) => {
    if (!A.rateLimit('signpost|' + req.ip, 30, 10 * 60 * 1000)) return res.status(429).send(V.signDone({ title: 'Too many attempts', text: 'Wait a little and try again.', today: res.locals.today }));
    const ctx = await signCtx(req, res); if (!ctx) return;
    const { cs, form, rec, input } = ctx;
    const b = req.body || {};
    const blanks = V.blanksFor(form, input);
    const prev = { f: b.f || {}, d: b.d || {}, signed: String(b.signed || '').slice(0, 160), reply: String(b.reply || '').slice(0, 1200) };
    const again = msg => res.status(400).send(V.signPage({ ...ctx, blanks, csrf: req.session.csrf, today: res.locals.today, prev, err: msg }));

    if (b.act === 'decline') {
      Counter.finish(cs.id, 'Declined', { reply: prev.reply });
      Notify.notifyUser(cs.by, `${cs.toName || 'The other party'} declined to sign ${cs.recordNo}`, V.recUrl(cs.recordNo));
      Activity.log(null, 'declined to sign', cs.recordNo, cs.toName);
      return res.send(V.signDone({ title: 'Declined', text: 'Your answer is entered upon the Ministry’s record and the officer who asked has been told.', today: res.locals.today }));
    }
    const noHand = cs.sigIndex === null || cs.sigIndex === undefined;
    if (!prev.signed.trim()) return again(noHand ? 'Set down your name before you return it.' : 'Set down your name and office before you sign.');
    const owed = blanks.filter(bl => bl.required && !(bl.type === 'date'
      ? ((b.d || {})[bl.id] || {}).day
      : String(((b.f || {})[bl.id]) || '').trim())).map(bl => bl.label);
    if (owed.length) return again((noHand ? 'Before you return it, answer: ' : 'Before you set your hand to it, answer: ') + owed.join(', ') + '.');

    const merged = {
      f: { ...(input.f || {}), ...(b.f || {}) },
      d: { ...(input.d || {}), ...(b.d || {}) },
      g: input.g || {},
      sig: (input.sig || []).slice(),
      recordDate: input.recordDate || {}
    };
    if (!noHand) merged.sig[cs.sigIndex] = prev.signed.trim();
    const holdId = (Ranks2.HOLD_BY_NAME[rec.Hold] || {}).id || '';
    try {
      await Records.edit(cs.recordNo, merged, holdId, { username: 'hand of ' + (cs.toName || 'another party') }, { keepHold: true, keepStatus: true });
    } catch (e) {
      return again(e.message);
    }
    Counter.finish(cs.id, noHand ? 'Returned' : 'Signed', { signedName: prev.signed.trim(), reply: prev.reply });
    Notify.notifyUser(cs.by, noHand
      ? `${prev.signed.trim()} filled in and returned ${cs.recordNo}`
      : `${prev.signed.trim()} set their hand to ${cs.recordNo}`, V.recUrl(cs.recordNo));
    Activity.log(null, noHand ? 'filled in and returned' : 'set their hand to', cs.recordNo, prev.signed.trim());
    res.send(V.signDone({
      title: noHand ? 'It is returned' : 'It is done',
      text: noHand
        ? `What you set down is entered upon ${cs.recordNo} and ${cs.byName} has been told. You set no hand to it — the Ministry signs it from its own side.`
        : `Your hand is set to ${cs.recordNo}. The document is sealed back into the Ministry’s record and ${cs.byName} has been told.`,
      today: res.locals.today
    }));
  }));

  app.get('/directory', (req, res) => {
    res.page({ title: 'Directory', active: 'directory', body: V.directory(Ranks.all(), U.list()) });
  });

  app.get('/licenses', wrap(async (req, res) => {
    const rows = await publicRows();
    const list = (rows || []).filter(r => r.Form === 'license' && !['Awaiting Seal', 'Returned', 'Revoked', 'Closed', 'Archived'].includes(r.Status)).map(r => {
      const i = Records.meta(r).input || { f: {}, d: {} };
      const f = i.f || {}, d = i.d || {};
      const dt = x => x ? formatDate(x.day, x.month, x.year) : '';
      return { no: r['Record No'], holder: f.holder || r.Subject, press: f['press-or-trading-name'], kind: f.kind, standing: f.standing, hold: r.Hold || f['residence-hold'], issued: dt(d['date-issued']) || r['Date (4E)'], expires: dt(d.expires) };
    }).filter(l => !['Suspended', 'Revoked', 'Lapsed'].includes(l.standing));
    const heraldry = (rows || []).filter(r => r.Form === 'heraldry' && !['Awaiting Seal', 'Returned'].includes(r.Status)).map(r => {
      const f = (Records.meta(r).input || {}).f || {};
      return { no: r['Record No'], name: f.name || r.Subject, claim: f.claim, hold: f['home-province-hold'], ledger: f['imperial-ledger-entry'], recommendation: f.recommendation, date: r['Date (4E)'] };
    }).filter(h => h.recommendation === 'Forward for Recognition');
    res.page({ title: 'Register of Licenses', active: 'licenses', body: V.licenses(list, rows === null ? 'The Register is being prepared.' : '', heraldry) });
  }));

  app.get('/laws', wrap(async (req, res) => {
    const rows = await publicRows();
    const directives = (rows || []).filter(r => r.Form === 'directive' && r.Public === 'Yes' && !Records.isClosed(r)).reverse();
    res.page({ title: 'Ledger of Laws', active: 'laws', body: V.laws(Settings.laws(), directives) });
  }));

  app.get('/login', (req, res) => {
    if (A.isStaff(req.user)) return res.redirect('/staff');
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
    const to = req.session.returnTo || String(req.body.to || ''); req.session.returnTo = null;
    req.session.csrf = crypto.randomBytes(18).toString('hex');
    req.session.username = user.username;
    req.session.entered = true;
    Activity.log(user, 'entered the hall');
    if (user.mustChange) return res.redirect('/account/password');
    res.redirect(to && to.startsWith('/') && !to.startsWith('//') ? to : A.homeFor(U.sessionUser(user.username)));
  });
  app.get('/account/password', A.requireStaff, (req, res) => res.page({ title: 'Change password', body: V.passwordPage(req.session.csrf, req.user.mustChange) }));
  app.post('/account/password', A.requireStaff, checkCsrf, (req, res) => {
    const u = req.user;
    const cur = String(req.body.current || ''), next = String(req.body.password || ''), again = String(req.body.confirm || '');
    const fail = msg => res.page({ title: 'Change password', body: V.passwordPage(req.session.csrf, u.mustChange, msg) }, 400);
    if (!U.authenticate(u.username, cur)) return fail('Your current password is not correct.');
    if (next !== again) return fail('The two new passwords do not match.');
    if (next === cur) return fail('Choose a password different from the current one.');
    const wasFirst = !!u.mustChange;
    try { U.update(u.username, { password: next, mustChange: false }); } catch (e) { return fail(e.message); }
    if (wasFirst) {
      try {
        const Guide = require('../lib/guide');
        const fresh = U.sessionUser(u.username);
        if (!Guide.hasSeenTour(fresh)) {
          req.session.tourStep = 0;
          const steps = Guide.tourFor(fresh);
          req.session.flash = { text: 'Your password is set. Welcome \u2014 here is the hall.' };
          return res.redirect((steps[0] && steps[0].at) || A.homeFor(fresh));
        }
      } catch (_) {}
    }
    req.session.flash = { text: 'Your password is changed.' };
    res.redirect(A.homeFor(U.sessionUser(u.username)));
  });
  app.post('/logout', checkCsrf, (req, res) => { req.session = null; res.redirect('/'); });
};
