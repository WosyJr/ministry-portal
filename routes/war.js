const V = require('../lib/views');
const WV = require('../lib/warviews');
const W = require('../lib/waroffice');
const A = require('../lib/auth');
const Ranks = require('../lib/ranks');
const Activity = require('../lib/activity');

module.exports = (app, { checkCsrf, wrap }) => {
  const canManage = u => !!u && (u.all || Ranks.can(u, 'warmanage'));
  const seeRoster = A.need('warroster', 'warmanage');
  const manageRoster = A.need('warmanage');

  const page = (res, req, title, active, body) => res.page({ title, active, body, war: true });


  app.get('/war-office', wrap(async (req, res) => {
    page(res, req, 'The Imperial War Office', 'waroffice', WV.officePage(req.user));
  }));

  app.get('/war-office/qualifications', wrap(async (req, res) => {
    page(res, req, 'Qualifications of the Legion', 'waroffice', WV.qualsPage(req.user));
  }));

  app.get('/war-office/corps', wrap(async (req, res) => {
    page(res, req, 'Scouts and Battlemages', 'waroffice', WV.corpsPage(req.user));
  }));

  app.get('/war-office/roster', seeRoster, wrap(async (req, res) => {
    const unit = W.UNIT_BY_ID[String(req.query.unit || '')] ? String(req.query.unit) : 'legion';
    const editing = req.query.edit ? W.get(String(req.query.edit)) : null;
    page(res, req, 'The Rolls of the Legion', 'waroffice', WV.rosterPage(req.user, unit, req.session.csrf, editing, canManage(req.user)));
  }));

  app.post('/war-office/roster', manageRoster, checkCsrf, wrap(async (req, res) => {
    const b = req.body || {};
    const unit = W.UNIT_BY_ID[String(b.unit || '')] ? String(b.unit) : 'legion';
    try {
      const p = W.add({ ...b, quals: [].concat(b.quals || []), quota: !!b.quota, senior: !!b.senior, by: req.user.username });
      Activity.log(req.user, 'entered upon the Legion roll', p.name, W.UNIT_BY_ID[unit].name);
      req.session.flash = { text: `${p.name} is entered upon the roll.` };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/war-office/roster?unit=' + unit);
  }));

  app.post('/war-office/roster/:id', manageRoster, checkCsrf, wrap(async (req, res) => {
    const b = req.body || {};
    const unit = W.UNIT_BY_ID[String(b.unit || '')] ? String(b.unit) : 'legion';
    try {
      const p = W.update(String(req.params.id), { ...b, quals: [].concat(b.quals || []), quota: !!b.quota, senior: !!b.senior }, req.user.username);
      Activity.log(req.user, 'amended the Legion roll', p.name);
      req.session.flash = { text: `${p.name} is amended.` };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/war-office/roster?unit=' + unit);
  }));

  app.post('/war-office/roster/:id/remove', manageRoster, checkCsrf, wrap(async (req, res) => {
    const p = W.get(String(req.params.id));
    const unit = p ? p.unit : 'legion';
    if (p) { W.remove(p.id); Activity.log(req.user, 'struck from the Legion roll', p.name); req.session.flash = { text: `${p.name} is struck from the roll.` }; }
    res.redirect('/war-office/roster?unit=' + unit);
  }));

  app.get('/war-office/properties', wrap(async (req, res) => {
    const editing = req.query.edit && canManage(req.user) ? W.propertyGet(String(req.query.edit)) : null;
    page(res, req, 'Holdings of the Legion', 'waroffice',
      WV.propertiesPage(req.user, W.properties(), W.propertyTotals(), req.session.csrf, canManage(req.user), editing));
  }));

  app.post('/war-office/properties', manageRoster, checkCsrf, wrap(async (req, res) => {
    try {
      const x = W.propertyAdd(req.body || {});
      Activity.log(req.user, 'entered a holding of the Legion', x.name, x.hold);
      req.session.flash = { text: `${x.name} stands upon the register.` };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/war-office/properties');
  }));

  app.post('/war-office/properties/:id', manageRoster, checkCsrf, wrap(async (req, res) => {
    try {
      const x = W.propertyUpdate(String(req.params.id), req.body || {});
      Activity.log(req.user, 'amended a holding of the Legion', x.name);
      req.session.flash = { text: `${x.name} is amended.` };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/war-office/properties');
  }));

  app.post('/war-office/properties/:id/remove', manageRoster, checkCsrf, wrap(async (req, res) => {
    const x = W.propertyGet(String(req.params.id));
    if (x) { W.propertyRemove(x.id); Activity.log(req.user, 'struck a holding from the register', x.name); req.session.flash = { text: `${x.name} is struck from the register.` }; }
    res.redirect('/war-office/properties');
  }));

  app.get('/war-office/roster/:id', seeRoster, wrap(async (req, res) => {
    const p = W.get(String(req.params.id));
    if (!p) return res.say('No such legionary', 'No one upon the rolls answers to that.', 404);
    const ctx = { quota: W.quotaCurrent(), writs: W.writsFor(p.id), pending: W.promotionsOpen().find(x => x.personId === p.id) || null };
    page(res, req, p.name, 'waroffice', WV.personPage(req.user, p, ctx, req.session.csrf, canManage(req.user)));
  }));

  app.get('/war-office/promotions', seeRoster, wrap(async (req, res) => {
    const all = W.promotions().slice().reverse();
    page(res, req, 'The Promotions Board', 'waroffice',
      WV.promotionsPage(req.user, W.promotionsOpen(), all.filter(x => x.status !== 'Proposed'), req.session.csrf, canManage(req.user)));
  }));

  app.post('/war-office/promotions', manageRoster, checkCsrf, wrap(async (req, res) => {
    const b = req.body || {};
    try {
      const e = W.proposePromotion({ personId: String(b.personId || ''), toRank: String(b.toRank || ''), reason: b.reason, by: req.user.username, byName: req.user.name });
      Activity.log(req.user, 'laid a promotion before the Board', e.name, e.toRank);
      req.session.flash = { text: `${e.name} is laid before the Board for ${e.toRank}.` };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect(b.personId ? '/war-office/roster/' + encodeURIComponent(String(b.personId)) : '/war-office/promotions');
  }));

  app.post('/war-office/promotions/:id', manageRoster, checkCsrf, wrap(async (req, res) => {
    const approve = (req.body || {}).act === 'approve';
    try {
      const e = W.decidePromotion(String(req.params.id), approve, { by: req.user.username, byName: req.user.name, note: (req.body || {}).note });
      Activity.log(req.user, approve ? 'approved a promotion' : 'declined a promotion', e.name, e.toRank);
      req.session.flash = { text: approve ? `${e.name} is raised to ${e.toRank}.` : `The promotion of ${e.name} is declined.` };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/war-office/promotions');
  }));

  app.get('/war-office/quota', seeRoster, wrap(async (req, res) => {
    const people = W.all().filter(p => p.activity !== 'Vacant').sort((a, b) => String(a.name).localeCompare(String(b.name)));
    page(res, req, 'Quota', 'waroffice', WV.quotaPage(req.user, W.quotaCurrent(), W.quotaAll(), people, req.session.csrf, canManage(req.user)));
  }));

  app.post('/war-office/quota', manageRoster, checkCsrf, wrap(async (req, res) => {
    const b = req.body || {};
    try {
      const cur = W.quotaCurrent();
      W.quotaSave(b.mode === 'amend' && cur ? cur.id : null, b);
      req.session.flash = { text: b.mode === 'amend' ? 'The quota is amended.' : 'A new quota period stands.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/war-office/quota');
  }));

  app.post('/war-office/quota/count', manageRoster, checkCsrf, wrap(async (req, res) => {
    const b = req.body || {};
    const cur = W.quotaCurrent();
    try { if (cur) W.quotaSet(cur.id, String(b.personId || ''), b.count); }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/war-office/quota');
  }));

  app.get('/war-office/writs', seeRoster, wrap(async (req, res) => {
    const kind = W.WRIT_BY_KEY[String(req.query.kind || '')] ? String(req.query.kind) : '';
    const people = W.all().sort((a, b) => String(a.name).localeCompare(String(b.name)));
    page(res, req, 'Writs of the Legion', 'waroffice', WV.writsPage(req.user, kind, W.writList(kind), req.session.csrf, canManage(req.user), people));
  }));

  app.post('/war-office/writs', manageRoster, checkCsrf, wrap(async (req, res) => {
    const b = req.body || {};
    try {
      const w = W.writAdd({ ...b, by: req.user.username, byName: req.user.name });
      Activity.log(req.user, 'entered a writ of the Legion', w.no, w.subject);
      req.session.flash = { text: `${w.no} stands upon the rolls.` };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/war-office/writs' + (W.WRIT_BY_KEY[String(b.kind || '')] ? '?kind=' + encodeURIComponent(String(b.kind)) : ''));
  }));

  app.get('/war-office/writs/:id', seeRoster, wrap(async (req, res) => {
    const w = W.writGet(String(req.params.id));
    if (!w) return res.say('No such writ', 'No writ of the Legion answers to that.', 404);
    page(res, req, w.no, 'waroffice', WV.writPage(req.user, w, canManage(req.user), req.session.csrf));
  }));

  app.post('/war-office/writs/:id/remove', manageRoster, checkCsrf, wrap(async (req, res) => {
    W.writRemove(String(req.params.id));
    req.session.flash = { text: 'Struck from the rolls.' };
    res.redirect('/war-office/writs');
  }));

  app.get('/war-office/treasury', seeRoster, wrap(async (req, res) => {
    page(res, req, 'The Legion Treasury', 'waroffice', WV.treasuryPage(req.user, req.session.csrf, canManage(req.user)));
  }));

  app.post('/war-office/treasury', manageRoster, checkCsrf, wrap(async (req, res) => {
    try {
      const e = W.ledgerAdd(req.body || {});
      Activity.log(req.user, 'entered a sum in the Legion treasury', e.label, String(e.amount));
      req.session.flash = { text: 'Entered in the ledger.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/war-office/treasury');
  }));

  app.post('/war-office/treasury/:id/remove', manageRoster, checkCsrf, wrap(async (req, res) => {
    W.ledgerRemove(String(req.params.id));
    req.session.flash = { text: 'Struck from the ledger.' };
    res.redirect('/war-office/treasury');
  }));
};
