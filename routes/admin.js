const express = require('express');
const crypto = require('crypto');
const AV = require('../lib/adminviews');
const V = require('../lib/views');
const A = require('../lib/auth');
const U = require('../lib/users');
const G = require('../lib/google');
const Ranks = require('../lib/ranks');
const Settings = require('../lib/settings');
const Activity = require('../lib/activity');
const Forms = require('../lib/forms');
const C = require('../lib/config');

const arr = v => (Array.isArray(v) ? v : v ? [v] : []);
const clean = (s, max) => String(s ?? '').replace(/\r/g, '').trim().slice(0, max);

module.exports = (app, { checkCsrf, wrap }) => {
  const r = express.Router();
  r.use(A.need('officers'));

  // Reached from the front of the portal, not from inside a Ministry.
  const provinceBody = (req, res, issued, flash) => res.send(V.provincePage({
    today: res.locals.today, user: req.user, active: 'logins',
    ground: Settings.pageGround(), cursor: Settings.cursor(), csrf: req.session.csrf,
    body: `<main>${flash ? `<div class="flash${flash.err ? ' err' : ''}">${flash.text}</div>` : ''}${AV.peoplePage(
      U.list(), Ranks.all(), req.session.csrf, req.user, issued,
      { branch: Ranks.BRANCH_IDS.includes(String(req.query.branch || '')) ? String(req.query.branch) : '', q: String(req.query.q || '') },
      true
    )}</main>`
  }));

  const provinceGate = (req, res, next) => {
    if (!req.user) { req.session.returnTo = req.originalUrl; return res.redirect('/login'); }
    if (!req.user.all) return next('forbidden');
    next();
  };

  app.get('/province', provinceGate, (req, res) => {
    const flash = req.session.flash; req.session.flash = null;
    provinceBody(req, res, null, flash);
  });

  // The other three sections of the Study belong to the province, not to Civil
  // Affairs, so they are served in the same shell and the old paths lead here.
  const inProvince = (req, res, active, inner) => {
    const flash = req.session.flash; req.session.flash = null;
    res.send(V.provincePage({
      today: res.locals.today, user: req.user, active, ground: Settings.pageGround(), cursor: Settings.cursor(), csrf: req.session.csrf,
      body: `<main>${flash ? `<div class="flash${flash.err ? ' err' : ''}">${flash.text}</div>` : ''}${inner}</main>`
    }));
  };

  app.get('/province/ranks', provinceGate, (req, res) =>
    inProvince(req, res, 'ranks', AV.ranksPage(Ranks.all(), counts(), req.session.csrf, req.user, true)));

  app.get('/province/settings', provinceGate, (req, res) =>
    inProvince(req, res, 'settings', AV.settingsPage(Settings.get(), G.status(), Settings.laws(), req.session.csrf, req.user, res.locals.today, true, { url: res.locals.site, fixed: C.BASE_URL_SET })));

  app.get('/province/motion', provinceGate, (req, res) =>
    inProvince(req, res, 'motion', AV.motionPage(Settings.get(), res.locals.today, V.seasonOf(res.locals.today))));

  app.get('/province/forms', provinceGate, (req, res) =>
    inProvince(req, res, 'forms', AV.formsPage(Forms.listCustom(), C.FOLDER_NAMES, Forms.DEPTS, req.session.csrf, req.user, null, true)));

  app.get('/province/forms/:id/edit', provinceGate, (req, res) => {
    const entry = Forms.listCustom().find(x => x.id === req.params.id);
    if (!entry) return res.redirect('/province/forms');
    inProvince(req, res, 'forms', AV.formsPage(Forms.listCustom(), C.FOLDER_NAMES, Forms.DEPTS, req.session.csrf, req.user, entry, true));
  });

  // The Study is the Civil Affairs roll and nothing else. Officers of the other
  // Ministries are kept by those Ministries; everyone at once is under
  // /admin/people. Before each Ministry had its own door they all landed here,
  // which is why people who never served Civil Affairs still appear on its roll.
  const civilOnly = () => U.list().filter(u => Ranks.userBranch(u) === 'civil');

  function study(req, res, status, flash) {
    res.page({ title: 'Minister’s Study', active: 'admin', flash, body: AV.study(civilOnly(), Ranks.all(), req.session.csrf, req.user, res.locals.issued) }, status);
  }
  const guard = (req, who) => {
    const target = U.view(who);
    if (!target) throw new Error('No such officer.');
    if (!req.user.all && target.rank === 'minister') throw new Error('Only the Minister may change the Minister’s account.');
    return target;
  };
  const rankAllowed = (req, rank) => { if (!req.user.all && rank === 'minister') throw new Error('Only the Minister may give the Minister’s rank.'); };

  r.get('/', (req, res) => study(req, res));
  r.post('/officers', checkCsrf, (req, res) => {
    const pw = U.tempPassword();
    try {
      rankAllowed(req, req.body.rank);
      U.create({ username: req.body.username, name: req.body.name, office: req.body.office, rank: req.body.rank, holds: arr(req.body.holds), password: pw });
      if (req.body.weekly !== undefined) U.update(req.body.username, { weekly: req.body.weekly });
      const un = String(req.body.username).trim().toLowerCase();
      res.locals.issued = { username: un, name: req.body.name, password: pw, fresh: true };
      Activity.log(req.user, 'entered an officer upon the rolls', '', `${req.body.name} (${(Ranks.get(req.body.rank) || {}).name || ''})`);
      study(req, res);
    } catch (e) { study(req, res, 400, { err: true, text: e.message }); }
  });
  r.post('/officers/:username/:action', checkCsrf, (req, res) => {
    const who = req.params.username, act = req.params.action;
    try {
      const t = guard(req, who);
      if (act === 'reset') {
        const pw = U.tempPassword();
        const u = U.update(who, { password: pw, mustChange: true });
        res.locals.issued = { username: u.username, name: u.name, password: pw };
        Activity.log(req.user, 'reset a password', '', u.name);
        return study(req, res);
      }
      if (act === 'suspend') { if (who === req.user.username) throw new Error('You cannot suspend your own account.'); U.update(who, { active: false }); req.session.flash = { text: 'Suspended ' + t.name + '.' }; Activity.log(req.user, 'suspended an officer', '', t.name); }
      else if (act === 'restore') { U.update(who, { active: true }); req.session.flash = { text: 'Restored ' + t.name + '.' }; Activity.log(req.user, 'restored an officer', '', t.name); }
      else if (act === 'edit') {
        const patch = { name: req.body.name, office: req.body.office, holds: arr(req.body.holds), listed: req.body.listed === '1', weekly: req.body.weekly };
        if (req.body.rank && who !== req.user.username) { rankAllowed(req, req.body.rank); patch.rank = req.body.rank; }
        U.update(who, patch);
        req.session.flash = { text: 'Updated ' + t.name + '.' };
        Activity.log(req.user, 'updated an officer', '', t.name);
      }
      else if (act === 'remove') { if (who === req.user.username) throw new Error('You cannot strike your own name from the rolls.'); U.remove(who); req.session.flash = { text: 'Removed ' + t.name + ' from the rolls.' }; Activity.log(req.user, 'removed an officer', '', t.name); }
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/admin');
  });

  // ---- Every login in the province ----
  // Only the Minister opens this: it reaches across every Ministry's roll, so a
  // scoped admin must not be able to move people into or out of their own.
  const ministerOnly = A.requireAdmin;

  r.get('/people', ministerOnly, (req, res) => {
    const q = req.originalUrl.split('?')[1];
    res.redirect('/province' + (q ? '?' + q : ''));
  });

  r.post('/people', ministerOnly, checkCsrf, (req, res) => {
    const pw = U.tempPassword();
    try {
      rankAllowed(req, req.body.rank);
      U.create({ username: req.body.username, name: req.body.name, office: req.body.office, rank: req.body.rank, holds: [], password: pw });
      const un = String(req.body.username).trim().toLowerCase();
      Activity.log(req.user, 'gave a login', '', `${req.body.name} (${(Ranks.get(req.body.rank) || {}).name || ''})`);
      return provinceBody(req, res, { username: un, name: req.body.name, password: pw, fresh: true }, null);
    } catch (e) { return provinceBody(req, res, null, { err: true, text: e.message }); }
  });

  r.get('/vault', ministerOnly, (req, res) => {
    const V = require('../lib/vault');
    const st = V.state();
    const rows = (d) => d.map(x => `<tr><td>${x.day}</td><td class="num">${x.file}</td></tr>`).join('');
    res.page({ title: 'The Strongroom', body: `<section>
      <h2>The Strongroom</h2>
      <p class="lede">A copy of the whole Docket is kept here, outside Google. If Google cannot be reached, the hall reads from this copy rather than showing nothing.</p>
      ${st.has
        ? `<p class="notice">The last copy holds <b>${st.count} records</b>, taken ${new Date(st.at).toLocaleString('en-GB')}.</p>`
        : '<p class="notice">No copy has been kept yet. One is written the first time the Docket is read.</p>'}
      <div class="section-label">Copies by the day</div>
      ${st.days.length
        ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>Day</th><th class="num">File</th></tr></thead><tbody>${rows(st.days)}</tbody></table></div>`
        : '<p class="hint">None yet.</p>'}
      <p class="hint">One copy a day is kept, and the last ${V.KEEP} days are held. They sit in the Ministry\u2019s own data, beside the rolls \u2014 so a copy survives anything that happens to the sheet.</p>
      <p class="hint">This copy is read-only. Nothing can be filed or sealed while Google is unreachable, because a record must have a number and a place on the sheet before it is real.</p>
    </section>` });
  });

  r.post('/people/:username/:action', ministerOnly, checkCsrf, (req, res) => {
    const who = req.params.username, act = req.params.action;
    try {
      const t = guard(req, who);
      if (act === 'reset') {
        const pw = U.tempPassword();
        const u = U.update(who, { password: pw, mustChange: true });
        Activity.log(req.user, 'reset a password', '', u.name);
        return provinceBody(req, res, { username: u.username, name: u.name, password: pw }, null);
      }
      if (act === 'suspend') {
        if (who === req.user.username) throw new Error('You cannot suspend your own account.');
        U.update(who, { active: false });
        req.session.flash = { text: 'Suspended ' + t.name + '.' };
        Activity.log(req.user, 'suspended an officer', '', t.name);
      } else if (act === 'restore') {
        U.update(who, { active: true });
        req.session.flash = { text: 'Restored ' + t.name + '.' };
        Activity.log(req.user, 'restored an officer', '', t.name);
      } else if (act === 'move') {
        if (who === req.user.username) throw new Error('You cannot move your own account.');
        rankAllowed(req, req.body.rank);
        const was = Ranks.branchOf(Ranks.get(t.rank));
        U.update(who, { rank: req.body.rank, office: req.body.office, weekly: req.body.weekly });
        const now = Ranks.branchOf(Ranks.get(req.body.rank));
        const name = id => (Ranks.BRANCHES.find(b => b.id === id) || {}).short || id;
        req.session.flash = { text: was === now ? `${t.name} is amended.` : `${t.name} is moved from ${name(was)} to ${name(now)}.` };
        Activity.log(req.user, 'moved an officer', '', `${t.name}: ${name(was)} → ${name(now)}`);
      } else if (act === 'remove') {
        if (who === req.user.username) throw new Error('You cannot strike your own name from the rolls.');
        U.remove(who);
        req.session.flash = { text: `${t.name} is struck from the rolls entirely. Anything they filed stands in their name.` };
        Activity.log(req.user, 'removed an officer', '', t.name);
      } else throw new Error('No such action.');
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/province');
  });

  const minister = A.requireAdmin;
  const counts = () => U.list().reduce((m, u) => { m[u.rank] = (m[u.rank] || 0) + 1; return m; }, {});
  r.get('/ranks', minister, (req, res) => res.redirect('/province/ranks'));
  r.post('/ranks', minister, checkCsrf, (req, res) => {
    try {
      const copy = Ranks.get(req.body.copy);
      const rk = Ranks.upsert('', { name: req.body.name, group: req.body.group, perms: copy && !copy.locked ? copy.perms : ['desk'], depts: copy && !copy.locked ? copy.depts : [] });
      req.session.flash = { text: `The rank “${rk.name}” is created. Tick what it may see below.` };
      Activity.log(req.user, 'created a rank', '', rk.name);
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/admin/ranks');
  });
  r.post('/ranks/:id', minister, checkCsrf, (req, res) => {
    try {
      const rk = Ranks.upsert(req.params.id, { name: req.body.name, subtitle: req.body.subtitle, group: req.body.group, directory: req.body.directory === '1', perms: arr(req.body.perms), depts: arr(req.body.depts), holds: arr(req.body.holds) });
      req.session.flash = { text: `Saved “${rk.name}”.` };
      Activity.log(req.user, 'changed a rank', '', rk.name);
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/admin/ranks');
  });
  r.post('/ranks/:id/:act', minister, checkCsrf, (req, res) => {
    try {
      if (req.params.act === 'up') Ranks.move(req.params.id, -1);
      if (req.params.act === 'down') Ranks.move(req.params.id, 1);
      if (req.params.act === 'remove') { const rk = Ranks.get(req.params.id); Ranks.remove(req.params.id, U.rankInUse(req.params.id)); req.session.flash = { text: 'The rank is removed.' }; Activity.log(req.user, 'removed a rank', '', rk ? rk.name : ''); }
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/admin/ranks');
  });

  r.get('/settings', minister, (req, res) => res.redirect('/province/settings'));
  r.post('/settings/seal', minister, checkCsrf, (req, res) => {
    try {
      if (req.body.clear === '1') { Settings.clearMinisterSeal(); req.session.flash = { text: 'Writs you seal now carry the Ministry’s wax seal.' }; }
      else { Settings.saveMinisterSeal(req.body.image); req.session.flash = { text: 'Your seal is set. Every writ you seal from now on carries it.' }; }
      Activity.log(req.user, 'changed the Minister’s seal');
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/admin/settings');
  });
  r.post('/settings/calendar', minister, checkCsrf, (req, res) => {
    const b = req.body;
    const year = Math.min(999, Math.max(1, parseInt(b.year, 10) || 0)) || undefined;
    const cal = b.mode === 'set'
      ? { mode: 'set', year: year || 226, day: Math.min(31, Math.max(1, parseInt(b.day, 10) || 1)), month: Math.min(11, Math.max(0, parseInt(b.month, 10) || 0)), weekday: Math.min(6, Math.max(0, parseInt(b.weekday, 10) || 0)), rate: Math.min(30, Math.max(0, parseFloat(b.rate) || 1)), anchor: new Date().toISOString() }
      : { mode: 'real', year };
    Settings.set({ calendar: cal });
    Activity.log(req.user, 'set the calendar');
    req.session.flash = { text: 'The calendar is set. Today reads ' + Settings.today().text + '.' };
    res.redirect('/admin/settings');
  });
  r.post('/settings/landing', minister, checkCsrf, (req, res) => {
    const want = Settings.LANDINGS.includes(req.body.landing) ? req.body.landing : 'cards';
    const grd = Settings.GROUNDS.includes(req.body.pageGround) ? req.body.pageGround : 'lamplit';
    const cur = Settings.CURSORS.includes(req.body.cursor) ? req.body.cursor : 'quill';
    Settings.set({ landing: want, pageGround: grd, cursor: cur, cursorChosen: true });
    Activity.log(req.user, 'set the front page', want + ' on ' + grd);
    req.session.flash = { text: (want === 'books' ? 'The front page now sets out the Ministries as books.' : 'The front page is back to cards.') + ' The halls stand on ' + (grd === 'lamplit' ? 'the lamplit ground' : 'plain parchment') + '. Both are set back from here.' };
    res.redirect('/admin/settings');
  });
  r.post('/settings/retention', minister, checkCsrf, (req, res) => {
    Settings.set({ retentionDays: Math.min(3650, Math.max(0, parseInt(req.body.days, 10) || 0)) });
    req.session.flash = { text: 'The retention period is set.' };
    res.redirect('/admin/settings');
  });
  r.post('/settings/laws/:i', minister, checkCsrf, (req, res) => {
    const laws = Settings.laws().map(l => ({ ...l }));
    const i = req.params.i === 'new' ? -1 : parseInt(req.params.i, 10);
    const act = req.body.act || 'save';
    const entry = { title: clean(req.body.title, 120), cite: clean(req.body.cite, 120), summary: clean(req.body.summary, 2000), limits: clean(req.body.limits, 1000) };
    if (i === -1) { if (entry.title && entry.summary) laws.push(entry); }
    else if (laws[i]) {
      if (act === 'remove') laws.splice(i, 1);
      else if (act === 'up' && i > 0) [laws[i - 1], laws[i]] = [laws[i], laws[i - 1]];
      else if (act === 'save' && entry.title && entry.summary) laws[i] = entry;
    }
    Settings.set({ laws });
    Activity.log(req.user, 'changed the Ledger of Laws');
    req.session.flash = { text: 'The Ledger of Laws is updated.' };
    res.redirect('/admin/settings');
  });

  function parseSections(b) {
    const sections = [];
    for (let i = 0; i < 5; i++) {
      const h = clean(b[`sh${i}`], 100);
      if (!h) continue;
      if (b[`skind${i}`] === 'paragraph') {
        sections.push({ h, kind: 'paragraph', lines: Math.max(1, Math.min(10, parseInt(b[`slines${i}`], 10) || 4)) });
        continue;
      }
      const fields = [];
      for (let j = 0; j < 6; j++) {
        const label = clean(b[`f${i}_${j}_label`], 100);
        if (!label) continue;
        const type = ['text', 'date', 'options'].includes(b[`f${i}_${j}_type`]) ? b[`f${i}_${j}_type`] : 'text';
        fields.push({ label, type, options: type === 'options' ? clean(b[`f${i}_${j}_options`], 300) : '', required: b[`f${i}_${j}_required`] === '1' });
      }
      if (fields.length) sections.push({ h, kind: 'fields', fields });
    }
    return sections;
  }
  function formsPage(req, res, status, editing) {
    res.page({ title: 'Writ Templates', active: 'admin', body: AV.formsPage(Forms.listCustom(), C.FOLDER_NAMES, Forms.DEPTS, req.session.csrf, req.user, editing) }, status);
  }
  r.get('/forms', minister, (req, res) => res.redirect('/province/forms'));
  r.get('/forms/:id/edit', minister, (req, res) => {
    const entry = Forms.listCustom().find(x => x.id === req.params.id);
    if (!entry) { req.session.flash = { err: true, text: 'No such writ template.' }; return res.redirect('/admin/forms'); }
    formsPage(req, res, 200, entry);
  });
  r.post('/forms', minister, checkCsrf, (req, res) => {
    const b = req.body;
    try {
      const spec = {
        id: clean(b.id, 40) || undefined, title: clean(b.title, 140), subtitle: clean(b.subtitle, 200), tag: clean(b.tag, 80),
        num: clean(b.num, 40), folder: b.folder, preamble: clean(b.preamble, 1200), authority: clean(b.authority, 400), limitation: clean(b.limitation, 400),
        depts: arr(b.depts), publicCapable: b.publicCapable === '1',
        sig: String(b.sig || '').split(/\n|,/).map(s => s.trim()).slice(0, 4),
        sections: parseSections(b)
      };
      const entry = Forms.saveCustom(spec);
      Activity.log(req.user, spec.id ? 'amended a writ template' : 'created a writ template', '', entry.title);
      req.session.flash = { text: 'The writ template is saved. Officers of the offices you ticked may now file it.' };
      res.redirect('/admin/forms');
    } catch (e) { req.session.flash = { err: true, text: e.message }; formsPage(req, res, 400, { ...req.body, sections: parseSections(req.body) }); }
  });
  r.post('/forms/:id/delete', minister, checkCsrf, (req, res) => {
    try {
      const entry = Forms.listCustom().find(x => x.id === req.params.id);
      Forms.removeCustom(req.params.id);
      Activity.log(req.user, 'removed a writ template', '', entry ? entry.title : '');
      req.session.flash = { text: 'The writ template is removed. Records already filed under it may still be read and amended.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/admin/forms');
  });

  r.get('/google/connect', minister, (req, res) => {
    if (!G.configured()) return res.redirect('/admin/settings');
    const state = crypto.randomBytes(16).toString('hex');
    req.session.googleState = state;
    res.redirect(G.authUrl(state));
  });
  r.post('/google/disconnect', minister, checkCsrf, (req, res) => { G.disconnect(); req.session.flash = { text: 'Google disconnected.' }; res.redirect('/admin/settings'); });
  app.use('/admin', r);

  app.get('/oauth/google/callback', A.requireAdmin, wrap(async (req, res) => {
    try {
      if (!req.query.code || req.query.state !== req.session.googleState) throw new Error('The Google connection could not be verified. Try again.');
      req.session.googleState = null;
      const out = await G.handleCallback(req.query.code);
      if (!G.connected()) throw new Error('Google did not grant lasting access. Remove the app from your Google account permissions and connect again.');
      await G.ensureDocket();
      req.session.flash = { text: 'The Ministry archives are connected' + (out.email ? ' as ' + out.email : '') + '. The live Docket sheet is in Ledgers & Dockets.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/admin/settings');
  }));
};
