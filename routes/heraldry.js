const H = require('../lib/heraldry');
const HV = require('../lib/heraldryviews');
const A = require('../lib/auth');
const Ranks = require('../lib/ranks');
const Activity = require('../lib/activity');

module.exports = (app, { checkCsrf, wrap }) => {
  const mayKeep = u => !!u && (u.all || Ranks.can(u, 'heraldry') || Ranks.can(u, 'clerk'));
  const needKeep = (req, res, next) => mayKeep(req.user) ? next() : next('forbidden');

  app.get('/heraldry', (req, res) => {
    const q = String(req.query.q || '').slice(0, 80);
    const rows = H.search(q);
    res.page({
      title: 'Imperial Ledger of Heraldry',
      active: 'heraldry',
      body: HV.ledger(q, rows, H.summary(), '', mayKeep(req.user))
    });
  });

  app.get('/heraldry/manage', A.gate(mayKeep), (req, res) => {
    const q = String(req.query.q || '').slice(0, 80);
    const rows = q ? H.sorted().filter(e => [H.fullName(e), e.rank, e.region, e.under, e.fief]
      .join(' ').toLowerCase().includes(q.toLowerCase())) : H.sorted();
    res.page({
      title: 'The Ledger of Heraldry',
      active: 'heraldry',
      body: HV.manageList(rows, H.summary(), req.session.csrf, q)
    });
  });

  app.post('/heraldry/manage', A.gate(mayKeep), checkCsrf, wrap((req, res) => {
    try {
      const e = H.add(req.body || {}, req.user);
      Activity.log(req.user, 'entered a style upon the Ledger of Heraldry', H.fullName(e), e.region);
      req.session.flash = { text: H.fullName(e) + ' is entered upon the Ledger.' };
    } catch (err) {
      req.session.flash = { err: true, text: err.message };
    }
    res.redirect('/heraldry/manage');
  }));

  app.get('/heraldry/manage/:id', A.gate(mayKeep), (req, res, next) => {
    const e = H.get(req.params.id);
    if (!e) return next();
    res.page({
      title: H.fullName(e),
      active: 'heraldry',
      body: HV.manageOne(e, req.session.csrf)
    });
  });

  app.post('/heraldry/manage/:id', A.gate(mayKeep), checkCsrf, wrap((req, res) => {
    const id = String(req.params.id);
    try {
      const e = H.save(id, req.body || {}, req.user);
      Activity.log(req.user, 'amended an entry upon the Ledger of Heraldry', H.fullName(e), e.region);
      req.session.flash = { text: 'The entry is amended.' };
    } catch (err) {
      req.session.flash = { err: true, text: err.message };
    }
    res.redirect('/heraldry/manage/' + id);
  }));

  app.post('/heraldry/manage/:id/strike', A.gate(mayKeep), checkCsrf, wrap((req, res) => {
    const id = String(req.params.id);
    try {
      const why = String((req.body || {}).why || '').trim();
      if (!why) throw new Error('Set down why it is struck.');
      const e = H.strike(id, why, req.user);
      Activity.log(req.user, 'struck a style from the Ledger of Heraldry', H.fullName(e), e.region);
      req.session.flash = { text: H.fullName(e) + ' is struck from the Ledger.' };
    } catch (err) {
      req.session.flash = { err: true, text: err.message };
    }
    res.redirect('/heraldry/manage/' + id);
  }));

  app.post('/heraldry/manage/:id/restore', A.gate(mayKeep), checkCsrf, wrap((req, res) => {
    const id = String(req.params.id);
    try {
      const e = H.restore(id, req.user);
      Activity.log(req.user, 'restored a style to the Ledger of Heraldry', H.fullName(e), e.region);
      req.session.flash = { text: 'It stands upon the Ledger again.' };
    } catch (err) {
      req.session.flash = { err: true, text: err.message };
    }
    res.redirect('/heraldry/manage/' + id);
  }));
};
