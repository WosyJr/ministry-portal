const K = require('../lib/staffroom');
const SRV = require('../lib/staffroomviews');

const V = require('../lib/views');
const Settings = require('../lib/settings');
const U = require('../lib/users');

module.exports = function (app, { checkCsrf }) {
  // The Staff Room sits inside the Administration of the Province, so it is the
  // Minister's alone, like everything else under /province.
  // The Minister always may. Anyone else must be named on the room's own list,
  // which the Minister keeps under Who May Enter.
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

  // The Staff Room is not a hall of the Ministry and does not wear its clothes.
  const show = (req, res, active, inner) => {
    const flash = req.session.flash; req.session.flash = null;
    res.send(SRV.arcaneShell({
      title: 'The Staff Room', today: res.locals.today, user: req.user,
      csrf: req.session.csrf, flash, body: inner
    }));
  };

  app.get('/province/staff', gate, (req, res) => show(req, res, 'commands', SRV.commandsPage(srv(req), K.mayAssign(req.user))));
  app.get('/province/staff/codes', gate, (req, res) => show(req, res, 'codes', SRV.codesPage(srv(req), K.mayAssign(req.user))));
  app.get('/province/staff/orders', gate, (req, res) => show(req, res, 'orders', SRV.ordersPage(srv(req), K.mayAssign(req.user))));
  app.get('/province/staff/guides', gate, (req, res) => show(req, res, 'guides', SRV.guidesPage(srv(req), K.mayAssign(req.user))));
  app.get('/province/staff/trackers', gate, (req, res) => show(req, res, 'trackers', SRV.trackersPage(srv(req), K.mayAssign(req.user))));

  app.get('/province/staff/hex', gate, (req, res) => {
    const raw = String((req.query && req.query.ids) || '');
    show(req, res, 'hex', SRV.hexPage(srv(req), raw ? K.convertMany(raw) : null, raw, req.session.csrf, K.mayAssign(req.user)));
  });
  app.post('/province/staff/hex', gate, checkCsrf, (req, res) => {
    const raw = String((req.body && req.body.ids) || '');
    show(req, res, 'hex', SRV.hexPage(srv(req), K.convertMany(raw), raw, req.session.csrf, K.mayAssign(req.user)));
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

  // The public view of a login does not carry the Minister flag, so it is read
  // off the rank here: a Minister is in the room by right and cannot be unticked.
  const Ranks = require('../lib/ranks');
  const withRights = () => U.list().map(u => {
    const r = Ranks.get(u.rank);
    return { ...u, all: !!(r && r.all), title: u.rankName || (r && r.name) || '' };
  });

  app.get('/province/staff/who', minister, (req, res) =>
    show(req, res, 'who', SRV.whoPage(srv(req), withRights(), K.allowed(), req.session.csrf, req.user)));

  app.post('/province/staff/who', minister, checkCsrf, (req, res) => {
    const server = srv(req);
    const raw = (req.body || {}).allowed;
    const names = raw == null ? [] : (Array.isArray(raw) ? raw : [raw]);
    // A Minister is on by right, never by the list, so their name never lands in it.
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
