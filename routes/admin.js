const express = require('express');
const crypto = require('crypto');
const AV = require('../lib/adminviews');
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

  function study(req, res, status, flash) {
    res.page({ title: 'Minister’s Study', active: 'admin', flash, body: AV.study(U.list(), Ranks.all(), req.session.csrf, req.user, res.locals.issued) }, status);
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
        const patch = { name: req.body.name, office: req.body.office, holds: arr(req.body.holds), listed: req.body.listed === '1' };
        if (req.body.rank && who !== req.user.username) { rankAllowed(req, req.body.rank); patch.rank = req.body.rank; }
        U.update(who, patch);
        req.session.flash = { text: 'Updated ' + t.name + '.' };
        Activity.log(req.user, 'updated an officer', '', t.name);
      }
      else if (act === 'remove') { if (who === req.user.username) throw new Error('You cannot strike your own name from the rolls.'); U.remove(who); req.session.flash = { text: 'Removed ' + t.name + ' from the rolls.' }; Activity.log(req.user, 'removed an officer', '', t.name); }
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/admin');
  });

  const minister = A.requireAdmin;
  const counts = () => U.list().reduce((m, u) => { m[u.rank] = (m[u.rank] || 0) + 1; return m; }, {});
  r.get('/ranks', minister, (req, res) => res.page({ title: 'Ranks & Access', active: 'admin', body: AV.ranksPage(Ranks.all(), counts(), req.session.csrf, req.user) }));
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

  r.get('/settings', minister, (req, res) => res.page({ title: 'Seal, Calendar & Laws', active: 'admin', body: AV.settingsPage(Settings.get(), G.status(), Settings.laws(), req.session.csrf, req.user, res.locals.today) }));
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
  r.get('/forms', minister, (req, res) => formsPage(req, res));
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
