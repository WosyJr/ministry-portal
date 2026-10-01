const K = require('../lib/staffroom');
const SRV = require('../lib/staffroomviews');
const RB = require('../lib/rulebook');

const V = require('../lib/views');
const Settings = require('../lib/settings');
const U = require('../lib/users');

module.exports = function (app, { checkCsrf }) {
  const gate = (req, res, next) => {
    if (!req.user) { req.session.returnTo = req.originalUrl; return res.redirect('/login'); }
    if (!K.mayEnter(req.user)) return next('forbidden');
    next();
  };
  const minister = (req, res, next) => {
    if (!req.user) { req.session.returnTo = req.originalUrl; return res.redirect('/login'); }
    if (!K.mayAssign(req.user)) return next('forbidden');
    next();
  };

  const srv = req => K.serverOf((req.query && req.query.server) || (req.body && req.body.server));

  const show = (req, res, active, inner) => {
    const flash = req.session.flash; req.session.flash = null;
    res.send(SRV.arcaneShell({
      title: 'The Staff Room', today: res.locals.today, user: req.user,
      csrf: req.session.csrf, flash, body: inner
    }));
  };

  app.get('/province/staff', gate, (req, res) => show(req, res, 'commands', SRV.commandsPage(srv(req), K.mayAssign(req.user))));
  app.get('/province/staff/codes', gate, (req, res) => show(req, res, 'codes', SRV.codesPage(srv(req), K.mayAssign(req.user))));
  app.get('/province/staff/orders', gate, (req, res, next) => (srv(req) === 'sovngarde' ? next() : res.redirect('/province/staff?server=' + srv(req))),
    (req, res) => show(req, res, 'orders', SRV.ordersPage(srv(req), K.mayAssign(req.user))));
  app.get('/province/staff/guides', gate, (req, res) => show(req, res, 'guides', SRV.guidesPage(srv(req), K.mayAssign(req.user))));
  const sovOnly = (req, res, next) => (srv(req) === 'sovngarde' ? next() : res.redirect('/province/staff?server=' + srv(req)));

  app.get('/province/staff/trackers', gate, sovOnly, (req, res) => {
    const e = String(req.query.edit || '');
    let editing = null;
    if (e.startsWith('artifact:')) { const row = K.artifacts().find(a => a.id === e.slice(9)); if (row) editing = { kind: 'artifact', row }; }
    if (e.startsWith('hq:')) { const row = K.hqs().find(h => h.id === e.slice(3)); if (row) editing = { kind: 'hq', row }; }
    show(req, res, 'trackers', SRV.trackersPage(srv(req), K.mayAssign(req.user), K.artifacts(), K.hqs(), req.session.csrf, editing));
  });

  const trackBack = req => '/province/staff/trackers?server=' + srv(req);
  const tryDo = (req, res, fn, ok) => {
    try { fn(); req.session.flash = { text: ok }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect(trackBack(req));
  };

  app.post('/province/staff/trackers/artifact', gate, checkCsrf, (req, res) =>
    tryDo(req, res, () => K.artifactAdd(req.body || {}), 'Added to the tracker.'));
  app.post('/province/staff/trackers/artifact/:id', gate, checkCsrf, (req, res) =>
    tryDo(req, res, () => K.artifactEdit(String(req.params.id), req.body || {}), 'The artifact is amended.'));
  app.post('/province/staff/trackers/artifact/:id/move', gate, checkCsrf, (req, res) =>
    tryDo(req, res, () => K.artifactMove(String(req.params.id), (req.body || {}).to), 'Moved.'));
  app.post('/province/staff/trackers/artifact/:id/remove', gate, checkCsrf, (req, res) =>
    tryDo(req, res, () => K.artifactRemove(String(req.params.id)), 'Struck from the tracker.'));

  app.post('/province/staff/trackers/hq', gate, checkCsrf, (req, res) =>
    tryDo(req, res, () => K.hqAdd(req.body || {}), 'Added to the tracker.'));
  app.post('/province/staff/trackers/hq/:id', gate, checkCsrf, (req, res) =>
    tryDo(req, res, () => K.hqEdit(String(req.params.id), req.body || {}), 'The property is amended.'));
  app.post('/province/staff/trackers/hq/:id/remove', gate, checkCsrf, (req, res) =>
    tryDo(req, res, () => K.hqRemove(String(req.params.id)), 'Struck from the tracker.'));

  app.get('/province/staff/hex', gate, (req, res) => {
    const raw = String((req.query && req.query.ids) || '');
    show(req, res, 'hex', SRV.hexPage(srv(req), raw ? K.convertMany(raw) : null, raw, req.session.csrf, K.mayAssign(req.user)));
  });
  app.post('/province/staff/hex', gate, checkCsrf, (req, res) => {
    const raw = String((req.body && req.body.ids) || '');
    const out = K.convertMany(raw);
    K.rememberConverted(out, req.user);
    show(req, res, 'hex', SRV.hexPage(srv(req), out, raw, req.session.csrf, K.mayAssign(req.user)));
  });

  app.post('/province/staff/hex/remember', gate, checkCsrf, (req, res) => {
    const out = K.convertMany((req.body || {}).ids);
    const added = K.rememberConverted(out, req.user);
    res.json({ ok: true, added, seen: out.filter(r => r.ok).length });
  });

  app.get('/province/staff/notices', gate, (req, res) => {
    const server = srv(req);
    const editing = req.query.edit ? K.noticeGet(String(req.query.edit)) : null;
    show(req, res, 'notices', SRV.noticesPage(server, K.noticesFor(server), req.session.csrf, editing, K.mayAssign(req.user)));
  });

  app.post('/province/staff/notices', gate, checkCsrf, (req, res) => {
    const server = srv(req);
    try { K.noticeAdd(req.body || {}, req.user); req.session.flash = { text: 'The notice is posted.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/province/staff/notices?server=' + server);
  });

  app.post('/province/staff/notices/:id', gate, checkCsrf, (req, res) => {
    const server = srv(req);
    try { K.noticeEdit(String(req.params.id), req.body || {}); req.session.flash = { text: 'The notice is amended.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/province/staff/notices?server=' + server);
  });

  const Ranks = require('../lib/ranks');
  const withRights = () => U.list().map(u => {
    const r = Ranks.get(u.rank);
    return { ...u, all: !!(r && r.all), title: u.rankName || (r && r.name) || '' };
  });

  app.get('/province/staff/locations', gate, (req, res) => show(req, res, 'locations', SRV.locationsPage(srv(req), K.mayAssign(req.user))));
  app.get('/province/staff/bestiary', gate, (req, res) => show(req, res, 'bestiary', SRV.bestiaryPage(srv(req), K.mayAssign(req.user))));
  app.get('/province/staff/dungeons', gate, (req, res) => show(req, res, 'dungeons', SRV.dungeonsPage(srv(req), K.mayAssign(req.user))));
  app.get('/province/staff/console', gate, (req, res) => show(req, res, 'console', SRV.consolePage(srv(req), K.mayAssign(req.user))));
  app.get('/province/staff/training', gate, (req, res) => show(req, res, 'training', SRV.trainingPage(srv(req), K.mayAssign(req.user))));

  app.get('/province/staff/items', gate, (req, res) => {
    const flash = req.session.flash; req.session.flash = null;
    show(req, res, 'items', SRV.itemsPage(srv(req), K.items(), req.session.csrf, flash && flash.text, K.mayAssign(req.user)));
  });

  app.post('/province/staff/items', gate, checkCsrf, (req, res) => {
    const b = req.body || {};
    try {
      const r = K.itemAdd(b.name, b.ref, b.note, req.user);
      req.session.flash = { text: r.added ? 'Put on the roll.' : 'That id was already on the roll, as ' + r.entry.name + '.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/province/staff/items?server=' + srv(req));
  });

  app.post('/province/staff/items/import', gate, checkCsrf, (req, res) => {
    const r = K.itemImport((req.body || {}).dump, req.user);
    req.session.flash = { text: r.added + ' added, ' + r.already + ' already on the roll, ' + r.skipped + ' line(s) passed over, out of ' + r.total + '.' };
    res.redirect('/province/staff/items?server=' + srv(req));
  });

  app.get('/province/staff/rules', gate, (req, res) => show(req, res, 'rules', SRV.rulesPage(srv(req), K.mayAssign(req.user))));

  app.get('/province/staff/desk', gate, (req, res) => {
    const q = String((req.query && req.query.q) || '');
    show(req, res, 'desk', SRV.deskPage(srv(req), K.mayAssign(req.user), req.session.csrf, q, q ? RB.assess(q, srv(req)) : null));
  });
  app.post('/province/staff/desk', gate, checkCsrf, (req, res) => {
    const q = String((req.body || {}).q || '').slice(0, 6000);
    show(req, res, 'desk', SRV.deskPage(srv(req), K.mayAssign(req.user), req.session.csrf, q, q ? RB.assess(q, srv(req)) : null));
  });

  const GameLog = require('../lib/gamelog');
  app.get('/province/staff/log', gate, (req, res) => {
    const q = String((req.query && req.query.q) || '');
    show(req, res, 'log', SRV.logPage(srv(req), req.session.csrf, q, q ? GameLog.read(q) : null));
  });
  app.post('/province/staff/log', gate, checkCsrf, (req, res) => {
    const q = String((req.body || {}).q || '').slice(0, 60000);
    show(req, res, 'log', SRV.logPage(srv(req), req.session.csrf, q, q ? GameLog.read(q) : null));
  });

  app.get('/province/staff/who', minister, (req, res) =>
    show(req, res, 'who', SRV.whoPage(srv(req), withRights(), K.allowed(), req.session.csrf, req.user)));

  app.post('/province/staff/who', minister, checkCsrf, (req, res) => {
    const server = srv(req);
    const raw = (req.body || {}).allowed;
    const names = raw == null ? [] : (Array.isArray(raw) ? raw : [raw]);
    const ministers = new Set(withRights().filter(u => u.all).map(u => u.username));
    try {
      K.setAllowed(names.filter(n => !ministers.has(String(n))));
      req.session.flash = { text: 'The door to the Staff Room is set.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/province/staff/who?server=' + server);
  });

  app.post('/province/staff/notices/:id/remove', gate, checkCsrf, (req, res) => {
    const server = srv(req);
    try { K.noticeRemove(String(req.params.id)); req.session.flash = { text: 'The notice is taken down.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/province/staff/notices?server=' + server);
  });
};
