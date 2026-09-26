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
      const p = W.add({ ...b, quals: [].concat(b.quals || []), quota: !!b.quota, senior: !!b.senior });
      Activity.log(req.user, 'entered upon the Legion roll', p.name, W.UNIT_BY_ID[unit].name);
      req.session.flash = { text: `${p.name} is entered upon the roll.` };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/war-office/roster?unit=' + unit);
  }));

  app.post('/war-office/roster/:id', manageRoster, checkCsrf, wrap(async (req, res) => {
    const b = req.body || {};
    const unit = W.UNIT_BY_ID[String(b.unit || '')] ? String(b.unit) : 'legion';
    try {
      const p = W.update(String(req.params.id), { ...b, quals: [].concat(b.quals || []), quota: !!b.quota, senior: !!b.senior });
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
