const V = require('../lib/views');
const JV = require('../lib/justiceviews');
const J = require('../lib/justice');
const A = require('../lib/auth');
const U = require('../lib/users');
const Ranks = require('../lib/ranks');
const Activity = require('../lib/activity');

module.exports = (app, { checkCsrf, wrap }) => {
  const page = (res, req, title, body) => res.page({ title, active: 'justice', body, justice: true });

  const seeCases = A.need('juscases', 'jusdesk');
  const mayFile = u => !!u && (u.all || Ranks.can(u, 'jusfile'));
  const mayJudge = u => !!u && (u.all || Ranks.can(u, 'jusjudge'));
  const mayComplaints = u => !!u && (u.all || Ranks.can(u, 'juscomplaints') || Ranks.can(u, 'jusfile'));
  const isAdmin = u => Ranks.mayAdminBranch(u, 'justice');

  const needFile = (req, res, next) => mayFile(req.user) ? next() : next('forbidden');
  const needJudge = (req, res, next) => mayJudge(req.user) ? next() : next('forbidden');
  const needComplaints = (req, res, next) => mayComplaints(req.user) ? next() : next('forbidden');
  const needAdmin = (req, res, next) => {
    if (!req.user) { req.session.returnTo = req.originalUrl; return res.redirect('/justice/entrance'); }
    return isAdmin(req.user) ? next() : next('forbidden');
  };

  const jusRanks = () => Ranks.all().filter(r => Ranks.branchOf(r) === 'justice');
  const jusRankIds = () => new Set(jusRanks().map(r => r.id));
  const jusOfficers = () => { const ids = jusRankIds(); return U.list().filter(o => ids.has(o.rank)); };
  const benchOfficers = () => jusOfficers().filter(o => o.active !== false);

  app.get('/justice', wrap(async (req, res) => {
    const holders = {};
    jusOfficers().filter(o => o.active !== false).forEach(o => { (holders[o.rank] = holders[o.rank] || []).push(o.name); });
    page(res, req, 'The Ministry of Justice', JV.hall(req.user, J.tallies(), holders));
  }));

  app.get('/justice/principles', wrap(async (req, res) => {
    page(res, req, 'How Justice Is Done', JV.principles(req.user));
  }));

  app.get('/justice/judgments', wrap(async (req, res) => {
    page(res, req, 'Register of Judgments', JV.judgmentsPage(req.user, J.judged().filter(c => c.published)));
  }));

  app.get('/justice/entrance', wrap(async (req, res) => {
    if (req.user && (req.user.all || Ranks.can(req.user, 'juscases') || Ranks.can(req.user, 'jusdesk'))) return res.redirect('/justice/cases');
    page(res, req, 'Staff Entrance', JV.entrance(req.session.csrf, '', ''));
  }));

  app.get('/justice/lay', wrap(async (req, res) => {
    page(res, req, 'Lay a Matter before Justice', JV.layBox(req.user, req.session.csrf, null, '', J.mattersWaiting().length));
  }));

  app.get('/justice/lay/status', wrap(async (req, res) => {
    const q = String(req.query.no || '').slice(0, 40);
    let found = null, missing = false;
    if (q) {
      if (!A.rateLimit('juslook|' + req.ip, 40, 10 * 60 * 1000)) return res.say('Too many questions', 'Wait a little and ask again.', 429);
      found = J.matterByNo(q);
      missing = !found;
    }
    page(res, req, 'Ask after a Matter', JV.layStatus(req.user, q, found, missing));
  }));

  app.post('/justice/lay', checkCsrf, wrap(async (req, res) => {
    const b = req.body || {};
    if (b.website) return res.redirect('/justice/lay');
    if (!A.rateLimit('juslay|' + req.ip, 4, 60 * 60 * 1000)) {
      return page(res, req, 'Lay a Matter', JV.layBox(req.user, req.session.csrf, b, 'The Ministry has had matters enough from your hand this hour. Return later.', J.mattersWaiting().length));
    }
    try {
      const m = J.matterAdd(b);
      Activity.log(null, 'laid a matter before Justice', m.no, m.kind);
      page(res, req, m.no, JV.layDone(req.user, m));
    } catch (e) {
      page(res, req, 'Lay a Matter', JV.layBox(req.user, req.session.csrf, b, e.message, J.mattersWaiting().length));
    }
  }));

  app.get('/justice/offences', wrap(async (req, res) => {
    const editing = req.query.edit && isAdmin(req.user) ? J.offenceGet(String(req.query.edit)) : null;
    page(res, req, 'Book of Offences', JV.offencesPage(req.user, J.offences(), req.session.csrf, isAdmin(req.user), editing));
  }));

  app.post('/justice/offences', needAdmin, checkCsrf, wrap(async (req, res) => {
    try { const o = J.offenceSave(null, req.body || {}); req.session.flash = { text: `${o.name} is entered in the Book of Offences.` }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/justice/offences');
  }));

  app.post('/justice/offences/:id', needAdmin, checkCsrf, wrap(async (req, res) => {
    try { const o = J.offenceSave(String(req.params.id), req.body || {}); req.session.flash = { text: `${o.name} is amended.` }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/justice/offences');
  }));

  app.post('/justice/offences/:id/remove', needAdmin, checkCsrf, wrap(async (req, res) => {
    J.offenceRemove(String(req.params.id));
    req.session.flash = { text: 'Struck from the Book of Offences.' };
    res.redirect('/justice/offences');
  }));

  app.get('/justice/warrants', seeCases, wrap(async (req, res) => {
    page(res, req, 'Warrants', JV.warrantsPage(req.user, J.warrants().slice().reverse(), req.session.csrf, mayJudge(req.user), J.cases(), benchOfficers()));
  }));

  app.post('/justice/warrants', seeCases, needJudge, checkCsrf, wrap(async (req, res) => {
    try {
      const w = J.warrantIssue(req.body || {}, req.user);
      Activity.log(req.user, 'issued a warrant', w.no, w.against);
      req.session.flash = { text: `${w.no} is issued.` };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/justice/warrants');
  }));

  app.post('/justice/warrants/:id', seeCases, needFile, checkCsrf, wrap(async (req, res) => {
    try {
      const w = J.warrantUpdate(String(req.params.id), req.body || {}, req.user);
      req.session.flash = { text: `${w.no} is set down as ${w.status}.` };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/justice/warrants');
  }));

  app.post('/justice/warrants/:id/remove', seeCases, needJudge, checkCsrf, wrap(async (req, res) => {
    J.warrantRemove(String(req.params.id));
    req.session.flash = { text: 'The warrant is struck.' };
    res.redirect('/justice/warrants');
  }));

  app.get('/justice/calendar', seeCases, wrap(async (req, res) => {
    page(res, req, 'Calendar of Sittings', JV.calendarPage(req.user, J.calendar()));
  }));

  app.get('/justice/cases', seeCases, wrap(async (req, res) => {
    page(res, req, 'The Bench', JV.docket(req.user, J.cases().slice().reverse(), J.tallies(), req.session.csrf, mayFile(req.user), benchOfficers()));
  }));

  app.post('/justice/cases', seeCases, needFile, checkCsrf, wrap(async (req, res) => {
    try {
      const c = J.caseOpen(req.body || {}, req.user);
      Activity.log(req.user, 'opened a matter upon the bench', c.no, c.subject);
      req.session.flash = { text: `${c.no} stands upon the bench.` };
      res.redirect('/justice/cases/' + encodeURIComponent(c.id));
    } catch (e) {
      req.session.flash = { err: true, text: e.message };
      res.redirect('/justice/cases');
    }
  }));

  app.get('/justice/cases/:id', seeCases, wrap(async (req, res) => {
    const c = J.caseGet(String(req.params.id));
    if (!c) return res.say('No such matter', 'No matter upon the bench answers to that.', 404);
    page(res, req, c.no, JV.casePage(req.user, c, req.session.csrf, { file: mayFile(req.user), judge: mayJudge(req.user) }, benchOfficers()));
  }));

  const back = (req, res, id, msg, err) => {
    req.session.flash = err ? { err: true, text: err } : { text: msg };
    res.redirect('/justice/cases/' + encodeURIComponent(id));
  };

  app.post('/justice/cases/:id', seeCases, needFile, checkCsrf, wrap(async (req, res) => {
    const id = String(req.params.id);
    try { const c = J.caseUpdate(id, req.body || {}, req.user); back(req, res, id, `${c.no} is amended.`); }
    catch (e) { back(req, res, id, '', e.message); }
  }));

  app.post('/justice/cases/:id/hearing', seeCases, needJudge, checkCsrf, wrap(async (req, res) => {
    const id = String(req.params.id);
    try { const c = J.hearingAdd(id, req.body || {}, req.user); Activity.log(req.user, 'set the bench to sit', c.no); back(req, res, id, 'The sitting is set.'); }
    catch (e) { back(req, res, id, '', e.message); }
  }));

  app.post('/justice/cases/:id/hearing/:hid/remove', seeCases, needJudge, checkCsrf, wrap(async (req, res) => {
    const id = String(req.params.id);
    J.hearingRemove(id, String(req.params.hid));
    back(req, res, id, 'The sitting is struck.');
  }));

  app.post('/justice/cases/:id/paper', seeCases, needFile, checkCsrf, wrap(async (req, res) => {
    const id = String(req.params.id);
    try { const c = J.paperAdd(id, req.body || {}, req.user); Activity.log(req.user, 'entered a paper upon a matter', c.no); back(req, res, id, 'The paper is entered.'); }
    catch (e) { back(req, res, id, '', e.message); }
  }));

  app.post('/justice/cases/:id/paper/:pid/remove', seeCases, needFile, checkCsrf, wrap(async (req, res) => {
    const id = String(req.params.id);
    J.paperRemove(id, String(req.params.pid));
    back(req, res, id, 'The paper is struck.');
  }));

  app.post('/justice/cases/:id/judgment', seeCases, needJudge, checkCsrf, wrap(async (req, res) => {
    const id = String(req.params.id);
    try {
      const c = J.judgmentGive(id, { ...(req.body || {}), published: !!(req.body || {}).published }, req.user);
      Activity.log(req.user, 'gave judgment', c.no, c.judgment.finding);
      back(req, res, id, `Judgment given upon ${c.no}.`);
    } catch (e) { back(req, res, id, '', e.message); }
  }));

  app.get('/justice/matters', seeCases, needComplaints, wrap(async (req, res) => {
    page(res, req, 'Matters Laid before Justice', JV.mattersPage(req.user, J.matters().slice().reverse(), req.session.csrf, mayComplaints(req.user), J.cases()));
  }));

  app.post('/justice/matters/:id', seeCases, needComplaints, checkCsrf, wrap(async (req, res) => {
    try { const m = J.matterHandle(String(req.params.id), req.body || {}, req.user); req.session.flash = { text: `${m.no} is set down as ${m.status}.` }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/justice/matters');
  }));

  app.post('/justice/matters/:id/remove', seeCases, needComplaints, checkCsrf, wrap(async (req, res) => {
    const m = J.matterGet(String(req.params.id));
    if (m) { J.matterRemove(m.id); req.session.flash = { text: `${m.no} is struck.` }; }
    res.redirect('/justice/matters');
  }));

  app.get('/justice/officers', needAdmin, wrap(async (req, res) => {
    const editing = req.query.rank ? jusRanks().find(r => r.id === String(req.query.rank)) : null;
    page(res, req, 'Officers of Justice', JV.officersPage(req.user, jusOfficers(), jusRanks(), req.session.csrf, res.locals.issued, editing));
  }));

  app.post('/justice/officers', needAdmin, checkCsrf, wrap(async (req, res) => {
    const b = req.body || {};
    const pw = U.tempPassword();
    try {
      if (!jusRankIds().has(String(b.rank))) throw new Error('That rank does not belong to the Ministry of Justice.');
      U.create({ username: b.username, name: b.name, office: b.office, rank: b.rank, holds: [], password: pw });
      res.locals.issued = { username: String(b.username).trim().toLowerCase(), name: b.name, password: pw };
      Activity.log(req.user, 'entered an officer of Justice', '', `${b.name} (${(Ranks.get(b.rank) || {}).name || ''})`);
      const editing = null;
      return page(res, req, 'Officers of Justice', JV.officersPage(req.user, jusOfficers(), jusRanks(), req.session.csrf, res.locals.issued, editing));
    } catch (e) {
      req.session.flash = { err: true, text: e.message };
      res.redirect('/justice/officers');
    }
  }));

  const guardOfficer = (req, who) => {
    const target = U.view(who);
    if (!target) throw new Error('No such officer.');
    if (!jusRankIds().has(target.rank)) throw new Error('That officer does not belong to the Ministry of Justice.');
    return target;
  };

  app.post('/justice/officers/:username/toggle', needAdmin, checkCsrf, wrap(async (req, res) => {
    try {
      const t = guardOfficer(req, req.params.username);
      U.update(t.username, { active: !t.active });
      req.session.flash = { text: `${t.name} is ${t.active ? 'stood down' : 'restored to the rolls'}.` };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/justice/officers');
  }));

  app.post('/justice/officers/:username/password', needAdmin, checkCsrf, wrap(async (req, res) => {
    try {
      const t = guardOfficer(req, req.params.username);
      const pw = U.tempPassword();
      U.update(t.username, { password: pw, mustChange: true });
      Activity.log(req.user, 'issued a new password to an officer of Justice', '', t.name);
      res.locals.issued = { username: t.username, name: t.name, password: pw };
      return page(res, req, 'Officers of Justice', JV.officersPage(req.user, jusOfficers(), jusRanks(), req.session.csrf, res.locals.issued, null));
    } catch (e) {
      req.session.flash = { err: true, text: e.message };
      res.redirect('/justice/officers');
    }
  }));

  app.post('/justice/ranks', needAdmin, checkCsrf, wrap(async (req, res) => {
    const b = req.body || {};
    try {
      const r = Ranks.upsert(null, {
        name: b.name, subtitle: b.subtitle, group: b.group, directory: !!b.directory,
        perms: [].concat(b.perms || [])
      }, req.user);
      req.session.flash = { text: `${r.name} is made a rank of Justice.` };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/justice/officers');
  }));

  app.post('/justice/ranks/:id', needAdmin, checkCsrf, wrap(async (req, res) => {
    const b = req.body || {};
    try {
      const r = Ranks.upsert(String(req.params.id), {
        name: b.name, subtitle: b.subtitle, group: b.group, directory: !!b.directory,
        perms: [].concat(b.perms || [])
      }, req.user);
      req.session.flash = { text: `${r.name} is amended.` };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/justice/officers');
  }));
};
