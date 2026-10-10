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
    const q = String(req.query.q || '').slice(0, 80);
    const cat = String(req.query.cat || '').slice(0, 60);
    const from = Math.max(0, Math.min(200000, Number(req.query.from) || 0));
    const found = K.itemSearch(q, cat, 200, from);
    show(req, res, 'items', SRV.itemsPage(srv(req), found, req.session.csrf, flash && flash.text, K.mayAssign(req.user), q, cat));
  });

  app.get('/province/staff/lookup', gate, (req, res) => {
    const refs = String(req.query.refs || '').split(',').map(r => r.trim()).filter(Boolean).slice(0, 200);
    const out = {};
    refs.forEach(r => {
      const hit = K.lookupId(r);
      if (hit) out[r] = [hit.name, hit.kind || ''];
    });
    res.set('Cache-Control', 'private, max-age=300');
    res.json(out);
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

  const KL = require('../lib/keizaallog');
  const OCR = require('../lib/ocr');
  const KP = require('../lib/keizaalpull');
  const hostOf = req => String(req.get('host') || '').replace(/[^A-Za-z0-9.:-]/g, '');
  app.get('/province/staff/log', gate, (req, res) => {
    const q = String(req.query.q || '').slice(0, 400000);
    show(req, res, 'log', SRV.logPage(srv(req), req.session.csrf, q, q ? KL.read(q) : null, { host: hostOf(req), pullCount: KP.list().length }));
  });
  const pullTries = new Map();
  const pullLimited = ip => { const t = Date.now(); const l = (pullTries.get(ip) || []).filter(x => t - x < 600000); if (l.length >= 20) return true; l.push(t); pullTries.set(ip, l); if (pullTries.size > 2000) pullTries.clear(); return false; };

  app.get('/province/staff/log/pulls', gate, (req, res) => {
    show(req, res, 'log', SRV.pullsPage(srv(req), req.session.csrf, { list: KP.list(), key: KP.keyFor(req.user.username), host: hostOf(req), max: KP.MAX_ITEMS }));
  });
  app.get('/province/staff/log/person', gate, (req, res) => {
    const who = String(req.query.who || '').replace(/[\r\n<>]/g, '').trim().slice(0, 60);
    const range = ['24h', '7d', '30d'].includes(String(req.query.range)) ? String(req.query.range) : '7d';
    if (!who) return res.redirect('/province/staff/log/pulls?server=' + srv(req));
    const isId = /^\d{15,22}$/.test(who);
    const kz = (process.env.KEIZAAL_URL || 'https://keizaal.com') + '/admin/logs?server=kzl-wl&t=' + range + '&' + (isId ? 'discord=' : 'q=') + encodeURIComponent(who) + '#ministrypull=' + encodeURIComponent(JSON.stringify({ who, range }));
    res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Opening Keizaal</title><style>body{background:#0a0917;color:#e7e4ff;font:16px system-ui;padding:40px;max-width:60ch}a{color:#7fe3e0}</style></head><body>
<p>Opening Keizaal on <b>${V.esc(who)}</b>, ${range === '24h' ? 'last 24 hours' : range === '7d' ? 'last 7 days' : 'last 30 days'}. When the page is up, click your <b>Pull into the Ministry</b> bookmark and it pulls them without asking.</p>
<p><a href="${V.esc(kz)}">If nothing happens, open Keizaal here.</a></p>
<script>location.replace(${JSON.stringify(kz)});</script></body></html>`);
  });
  app.post('/province/staff/log/key', gate, checkCsrf, (req, res) => {
    KP.keyReset(req.user.username);
    req.session.flash = { text: 'Your pull button is remade. Drag the new one to your bookmarks bar; the old one no longer works.' };
    res.redirect('/province/staff/log/pulls?server=' + srv(req));
  });
  app.post('/province/staff/log/pull', (req, res) => {
    const b = req.body || {};
    if (pullLimited(req.ip)) return res.status(429).send('Too many pulls. Give it a few minutes.');
    const who = KP.userOfKey(b.key);
    if (!who) return res.status(403).send('That pull button is not known to the Ministry. Open Read a Log, go to Pulls, and drag the button to your bookmarks bar again.');
    let payload;
    try { payload = JSON.parse(String(b.payload || '')); } catch (_) { return res.status(400).send('The events did not come across whole.'); }
    try {
      const meta = KP.save(who, { items: payload, server: b.server, filters: b.filters, capped: b.capped === '1' });
      res.redirect('/province/staff/log/pull/' + meta.id + '?server=' + K.serverOf(''));
    } catch (e) { res.status(400).send(e.message); }
  });
  app.get('/province/staff/log/pull/:id', gate, (req, res) => {
    const id = String(req.params.id).replace(/[^a-z0-9]/gi, '');
    const out = KP.read(id);
    if (!out) return next404(req, res);
    show(req, res, 'log', SRV.logPage(srv(req), req.session.csrf, '', out, { host: hostOf(req), pull: out.pull }));
  });
  app.post('/province/staff/log/pull/:id/remove', gate, checkCsrf, (req, res) => {
    KP.remove(String(req.params.id).replace(/[^a-z0-9]/gi, ''));
    req.session.flash = { text: 'That pull is struck.' };
    res.redirect('/province/staff/log/pulls?server=' + srv(req));
  });
  const next404 = (req, res) => res.status(404).send('No such pull. It may have been struck, or pushed out by newer ones.');

  app.post('/province/staff/log', gate, checkCsrf, async (req, res) => {
    let q = String((req.body || {}).q || '').slice(0, 400000);
    let shot = null;
    const pic = (req.body || {}).shot;
    if (pic) {
      try {
        shot = await OCR.readImage(pic);
        q = (q.trim() ? q.trim() + '\n' : '') + shot.text;
      } catch (e) { req.session.flash = { err: true, text: e.message }; }
    }
    show(req, res, 'log', SRV.logPage(srv(req), req.session.csrf, q, q.trim() ? KL.read(q) : null, { host: hostOf(req), shot }));
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
