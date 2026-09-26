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
  const mayInquire = u => !!u && (u.all || Ranks.can(u, 'jusinquire'));
  const isAdmin = u => Ranks.mayAdminBranch(u, 'justice');

  const needFile = (req, res, next) => mayFile(req.user) ? next() : next('forbidden');
  const needJudge = (req, res, next) => mayJudge(req.user) ? next() : next('forbidden');
  const needComplaints = (req, res, next) => mayComplaints(req.user) ? next() : next('forbidden');
  const needInquire = (req, res, next) => mayInquire(req.user) ? next() : next('forbidden');
  const needAdmin = (req, res, next) => {
    if (!req.user) { req.session.returnTo = req.originalUrl; return res.redirect('/justice/entrance'); }
    return isAdmin(req.user) ? next() : next('forbidden');
  };

  const jusRanks = () => Ranks.all().filter(r => Ranks.branchOf(r) === 'justice');
  const jusRankIds = () => new Set(jusRanks().map(r => r.id));
  const jusOfficers = () => { const ids = jusRankIds(); return U.list().filter(o => ids.has(o.rank)); };
  // No one may appoint above themselves: a rank is theirs to give only if they
  // already hold every power it carries.
  const giveable = u => u.all ? jusRanks() : jusRanks().filter(r => (r.perms || []).every(p => (u.perms || []).includes(p)));
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
    const shown = J.judged().filter(c => c.published && !c.sealed);
    const withheld = J.judged().filter(c => c.published && c.sealed).length;
    page(res, req, 'Register of Judgments', JV.judgmentsPage(req.user, shown, withheld));
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

  app.get('/justice/calendar', wrap(async (req, res) => {
    const inside = !!(req.user && (req.user.all || Ranks.can(req.user, 'juscases') || Ranks.can(req.user, 'jusdesk')));
    page(res, req, 'Calendar of Sittings', JV.calendarPage(req.user, J.calendar(), inside));
  }));

  app.get('/justice/cases', seeCases, wrap(async (req, res) => {
    page(res, req, 'The Bench', JV.docket(req.user, J.cases().slice().reverse(), J.tallies(), req.session.csrf, mayFile(req.user), benchOfficers(), J.judgedCases()));
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
    const byNo = {};
    J.cases().forEach(x => { byNo[x.no.toLowerCase()] = { id: x.id, no: x.no }; });
    page(res, req, c.no, JV.casePage(req.user, c, req.session.csrf, { file: mayFile(req.user), judge: mayJudge(req.user) }, benchOfficers(), {
      offences: J.offences(), appealedIn: J.appealedIn(c.no),
      courts: J.holdCourts(), citable: J.citable(c.id), citedBy: J.citedBy(c.no), byNo,
      exhibits: J.exhibitsFor(c.no), dues: J.duesFor(c.no), sentences: J.sentencesFor(c.no)
    }));
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
      const c = J.judgmentGive(id, { ...(req.body || {}), cites: [].concat((req.body || {}).cites || []), published: !!(req.body || {}).published }, req.user);
      Activity.log(req.user, 'gave judgment', c.no, c.judgment.finding);
      back(req, res, id, `Judgment given upon ${c.no}.`);
    } catch (e) { back(req, res, id, '', e.message); }
  }));

  app.post('/justice/cases/:id/remove', seeCases, needJudge, checkCsrf, wrap(async (req, res) => {
    const c = J.caseGet(String(req.params.id));
    if (c) { J.caseRemove(c.id); Activity.log(req.user, 'struck a matter from the bench', c.no, c.subject); req.session.flash = { text: `${c.no} is struck from the bench entirely.` }; }
    res.redirect('/justice/cases');
  }));

  app.get('/justice/custody', seeCases, wrap(async (req, res) => {
    page(res, req, 'Register of Custody', JV.custodyPage(req.user, J.custody().slice().reverse(), req.session.csrf, mayFile(req.user), J.cases(), J.warrants()));
  }));

  app.post('/justice/custody', seeCases, needFile, checkCsrf, wrap(async (req, res) => {
    try { const c = J.custodyCommit(req.body || {}, req.user); Activity.log(req.user, 'committed to custody', c.no, c.name); req.session.flash = { text: `${c.name} is entered upon the register.` }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/justice/custody');
  }));

  app.post('/justice/custody/:id', seeCases, needFile, checkCsrf, wrap(async (req, res) => {
    try { const c = J.custodyUpdate(String(req.params.id), req.body || {}, req.user); req.session.flash = { text: `${c.name} is set down as ${c.status}.` }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/justice/custody');
  }));

  app.post('/justice/custody/:id/remove', seeCases, needFile, checkCsrf, wrap(async (req, res) => {
    J.custodyRemove(String(req.params.id));
    req.session.flash = { text: 'Struck from the register of custody.' };
    res.redirect('/justice/custody');
  }));

  app.get('/justice/inquisitions', seeCases, wrap(async (req, res) => {
    page(res, req, 'Inquisitions', JV.inquisitionsPage(req.user, J.inquisitions().slice().reverse(), req.session.csrf, mayInquire(req.user), J.cases()));
  }));

  app.post('/justice/inquisitions', seeCases, needInquire, checkCsrf, wrap(async (req, res) => {
    try {
      const i = J.inqOpen(req.body || {}, req.user);
      Activity.log(req.user, 'opened an inquisition', i.no, i.subject);
      return res.redirect('/justice/inquisitions/' + encodeURIComponent(i.id));
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/justice/inquisitions');
  }));

  app.get('/justice/inquisitions/:id', seeCases, wrap(async (req, res) => {
    const i = J.inqGet(String(req.params.id));
    if (!i) return res.say('No such inquisition', 'No inquisition answers to that.', 404);
    page(res, req, i.no, JV.inquisitionPage(req.user, i, req.session.csrf, mayInquire(req.user), J.cases()));
  }));

  const backInq = (req, res, id, msg, err) => {
    req.session.flash = err ? { err: true, text: err } : { text: msg };
    res.redirect('/justice/inquisitions/' + encodeURIComponent(id));
  };

  app.post('/justice/inquisitions/:id', seeCases, needInquire, checkCsrf, wrap(async (req, res) => {
    const id = String(req.params.id);
    try { const i = J.inqUpdate(id, req.body || {}, req.user); backInq(req, res, id, `${i.no} is set down as ${i.status}.`); }
    catch (e) { backInq(req, res, id, '', e.message); }
  }));

  app.post('/justice/inquisitions/:id/line', seeCases, needInquire, checkCsrf, wrap(async (req, res) => {
    const id = String(req.params.id);
    try { J.inqLineAdd(id, req.body || {}); backInq(req, res, id, 'The line of inquiry is set down.'); }
    catch (e) { backInq(req, res, id, '', e.message); }
  }));

  app.post('/justice/inquisitions/:id/line/:lid/remove', seeCases, needInquire, checkCsrf, wrap(async (req, res) => {
    const id = String(req.params.id);
    J.inqLineRemove(id, String(req.params.lid));
    backInq(req, res, id, 'Struck.');
  }));

  app.post('/justice/inquisitions/:id/statement', seeCases, needInquire, checkCsrf, wrap(async (req, res) => {
    const id = String(req.params.id);
    try { J.inqStatementAdd(id, req.body || {}, req.user); backInq(req, res, id, 'The statement is taken down.'); }
    catch (e) { backInq(req, res, id, '', e.message); }
  }));

  app.post('/justice/inquisitions/:id/statement/:sid/remove', seeCases, needInquire, checkCsrf, wrap(async (req, res) => {
    const id = String(req.params.id);
    J.inqStatementRemove(id, String(req.params.sid));
    backInq(req, res, id, 'Struck.');
  }));

  app.post('/justice/inquisitions/:id/remove', seeCases, needInquire, checkCsrf, wrap(async (req, res) => {
    const i = J.inqGet(String(req.params.id));
    if (i) { J.inqRemove(i.id); Activity.log(req.user, 'struck an inquisition', i.no); req.session.flash = { text: `${i.no} is struck entirely.` }; }
    res.redirect('/justice/inquisitions');
  }));

  app.get('/justice/parties', seeCases, wrap(async (req, res) => {
    const name = String(req.query.name || '').slice(0, 140);
    const rec = name ? J.partyRecord(name) : null;
    page(res, req, rec ? rec.name : 'Parties', JV.partiesPage(req.user, J.partyNames(), rec && rec.cases.length + rec.warrants.length + rec.custody.length ? rec : (name ? rec : null)));
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


  app.post('/justice/cases/:id/plea', seeCases, needFile, checkCsrf, wrap(async (req, res) => {
    const id = String(req.params.id);
    try { J.pleaEnter(id, req.body || {}, req.user); back(req, res, id, 'The plea is set down.'); }
    catch (e) { back(req, res, id, '', e.message); }
  }));

  app.post('/justice/cases/:id/seal', seeCases, needJudge, checkCsrf, wrap(async (req, res) => {
    const id = String(req.params.id);
    try {
      const c = J.sealSet(id, { sealed: !!(req.body || {}).sealed, sealReason: (req.body || {}).sealReason }, req.user);
      Activity.log(req.user, c.sealed ? 'sealed a matter' : 'lifted the seal on a matter', c.no);
      back(req, res, id, c.sealed ? 'The matter is sealed.' : 'The seal is lifted.');
    } catch (e) { back(req, res, id, '', e.message); }
  }));

  app.post('/justice/cases/:id/witness', seeCases, needFile, checkCsrf, wrap(async (req, res) => {
    const id = String(req.params.id);
    try { J.witnessAdd(id, req.body || {}, req.user); back(req, res, id, 'The witness is called.'); }
    catch (e) { back(req, res, id, '', e.message); }
  }));

  app.post('/justice/cases/:id/witness/:wid', seeCases, needFile, checkCsrf, wrap(async (req, res) => {
    const id = String(req.params.id);
    try { J.witnessUpdate(id, String(req.params.wid), { ...(req.body || {}), sworn: !!(req.body || {}).sworn }, req.user); back(req, res, id, 'Set down.'); }
    catch (e) { back(req, res, id, '', e.message); }
  }));

  app.post('/justice/cases/:id/witness/:wid/remove', seeCases, needFile, checkCsrf, wrap(async (req, res) => {
    const id = String(req.params.id);
    J.witnessRemove(id, String(req.params.wid));
    back(req, res, id, 'The witness is struck.');
  }));

  app.get('/justice/cases/:id/witness/:wid/summons', seeCases, wrap(async (req, res) => {
    const c = J.caseGet(String(req.params.id));
    const w = c && (c.witnesses || []).find(x => x.id === String(req.params.wid));
    if (!w) return res.status(404).send('No such witness.');
    sendDoc(res, JV.witnessSummonsDoc(c, w));
  }));

  // ---- Documents that may be given out ----

  const sendDoc = (res, html) => { res.set('Content-Type', 'text/html; charset=utf-8'); res.send(html); };

  app.get('/justice/warrants/:id/doc', seeCases, wrap(async (req, res) => {
    const w = J.warrantGet(String(req.params.id));
    if (!w) return res.status(404).send('No such warrant.');
    sendDoc(res, JV.warrantDoc(w, w.offenceId ? J.offenceGet(w.offenceId) : null));
  }));

  app.get('/justice/cases/:id/judgment/doc', seeCases, wrap(async (req, res) => {
    const c = J.caseGet(String(req.params.id));
    if (!c || !c.judgment || !c.judgment.given) return res.status(404).send('No judgment has been given upon that matter.');
    sendDoc(res, JV.judgmentDoc(c));
  }));

  app.get('/justice/cases/:id/summons/:hid', seeCases, wrap(async (req, res) => {
    const c = J.caseGet(String(req.params.id));
    const h = c && (c.hearings || []).find(x => x.id === String(req.params.hid));
    if (!h) return res.status(404).send('No such sitting.');
    sendDoc(res, JV.summonsDoc(c, h));
  }));

  app.get('/justice/custody/:id/doc', seeCases, wrap(async (req, res) => {
    const x = J.custodyGet(String(req.params.id));
    if (!x) return res.status(404).send('No such entry upon the register.');
    sendDoc(res, JV.custodyDoc(x));
  }));


  app.get('/justice/exhibits/:id/doc', seeCases, wrap(async (req, res) => {
    const e = J.exhibitGet(String(req.params.id));
    if (!e) return res.status(404).send('No such exhibit.');
    sendDoc(res, JV.exhibitDoc(e));
  }));

  app.get('/justice/dues/:id/doc', seeCases, wrap(async (req, res) => {
    const d = J.dueGet(String(req.params.id));
    if (!d) return res.status(404).send('No such sum.');
    sendDoc(res, JV.dueDoc(d, J.owingOf(d), J.paidOf(d)));
  }));

  app.get('/justice/sentences/:id/doc', seeCases, wrap(async (req, res) => {
    const x = J.sentenceGet(String(req.params.id));
    if (!x) return res.status(404).send('No such sentence.');
    sendDoc(res, JV.sentenceDoc(x));
  }));

  app.get('/justice/custody/:id/bail', seeCases, wrap(async (req, res) => {
    const x = J.custodyGet(String(req.params.id));
    if (!x) return res.status(404).send('No such entry upon the register.');
    sendDoc(res, JV.bailDoc(x));
  }));

  app.get('/justice/lay/doc', wrap(async (req, res) => {
    const m = J.matterByNo(String(req.query.no || ''));
    if (!m) return res.status(404).send('No matter stands under that number.');
    sendDoc(res, JV.matterDoc(m));
  }));


  // ---- Public: verify a paper, persons sought, the calendar ----

  app.get('/justice/verify', wrap(async (req, res) => {
    const code = String(req.query.code || '').slice(0, 12);
    const result = code ? J.verify(code) : null;
    page(res, req, 'Verify a Paper', JV.verifyPage(req.user, code, result));
  }));

  app.get('/justice/wanted', wrap(async (req, res) => {
    page(res, req, 'Persons Sought', JV.wantedPage(req.user, J.wanted()));
  }));

  app.get('/justice/courts', wrap(async (req, res) => {
    const counts = {};
    J.holdCourts().forEach(c => { counts[c.court] = J.appealsFrom(c.court).filter(x => !x.sealed).map(x => ({ id: x.id, no: x.no })); });
    page(res, req, 'Courts of the Holds', JV.courtsPage(req.user, J.holdCourts(), req.session.csrf, mayJudge(req.user), counts));
  }));

  app.post('/justice/courts', seeCases, needJudge, checkCsrf, wrap(async (req, res) => {
    try { const c = J.holdCourtSave(null, req.body || {}); req.session.flash = { text: `${c.court} is entered.` }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/justice/courts');
  }));

  app.post('/justice/courts/:id', seeCases, needJudge, checkCsrf, wrap(async (req, res) => {
    try { const c = J.holdCourtSave(String(req.params.id), req.body || {}); req.session.flash = { text: `${c.court} is amended.` }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/justice/courts');
  }));

  app.post('/justice/courts/:id/remove', seeCases, needJudge, checkCsrf, wrap(async (req, res) => {
    J.holdCourtRemove(String(req.params.id));
    req.session.flash = { text: 'The court is struck from the register.' };
    res.redirect('/justice/courts');
  }));

  // ---- Evidence and exhibits ----

  app.get('/justice/exhibits', seeCases, wrap(async (req, res) => {
    page(res, req, 'Evidence and Exhibits', JV.exhibitsPage(req.user, J.exhibits().slice().reverse(), req.session.csrf, mayFile(req.user), J.cases(), J.warrants()));
  }));

  app.post('/justice/exhibits', seeCases, needFile, checkCsrf, wrap(async (req, res) => {
    try { const e = J.exhibitTake(req.body || {}, req.user); Activity.log(req.user, 'took a thing into the keeping of Justice', e.no, e.what); req.session.flash = { text: `${e.no} is taken into keeping.` }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/justice/exhibits');
  }));

  app.post('/justice/exhibits/:id', seeCases, needFile, checkCsrf, wrap(async (req, res) => {
    try { const e = J.exhibitUpdate(String(req.params.id), req.body || {}, req.user); req.session.flash = { text: `${e.no} is set down as ${e.status}.` }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/justice/exhibits');
  }));

  app.post('/justice/exhibits/:id/remove', seeCases, needFile, checkCsrf, wrap(async (req, res) => {
    J.exhibitRemove(String(req.params.id));
    req.session.flash = { text: 'Struck from the register of exhibits.' };
    res.redirect('/justice/exhibits');
  }));

  // ---- Fines and restitution ----

  app.get('/justice/dues', seeCases, wrap(async (req, res) => {
    page(res, req, 'Fines and Restitution', JV.duesPage(req.user, J.dues().slice().reverse(), req.session.csrf, mayFile(req.user), J.cases(), J.duesTotals()));
  }));

  app.post('/justice/dues', seeCases, needJudge, checkCsrf, wrap(async (req, res) => {
    try { const d = J.dueOrder(req.body || {}, req.user); Activity.log(req.user, 'ordered a sum', d.no, `${d.who} — ${d.amount}`); req.session.flash = { text: `${d.no} is ordered against ${d.who}.` }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/justice/dues');
  }));

  app.post('/justice/dues/:id/payment', seeCases, needFile, checkCsrf, wrap(async (req, res) => {
    try { const d = J.dueRender(String(req.params.id), req.body || {}, req.user); req.session.flash = { text: `Entered. ${J.owingOf(d)} septims still owing upon ${d.no}.` }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/justice/dues');
  }));

  app.post('/justice/dues/:id/payment/:pid/remove', seeCases, needFile, checkCsrf, wrap(async (req, res) => {
    J.duePaymentRemove(String(req.params.id), String(req.params.pid));
    req.session.flash = { text: 'The entry is struck.' };
    res.redirect('/justice/dues');
  }));

  app.post('/justice/dues/:id', seeCases, needJudge, checkCsrf, wrap(async (req, res) => {
    try { const d = J.dueUpdate(String(req.params.id), { ...(req.body || {}), remitted: !!(req.body || {}).remitted }, req.user); req.session.flash = { text: d.remitted ? `${d.no} is remitted.` : `${d.no} stands again.` }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/justice/dues');
  }));

  app.post('/justice/dues/:id/remove', seeCases, needJudge, checkCsrf, wrap(async (req, res) => {
    J.dueRemove(String(req.params.id));
    req.session.flash = { text: 'Struck from the register.' };
    res.redirect('/justice/dues');
  }));

  // ---- Sentences ----

  app.get('/justice/sentences', seeCases, wrap(async (req, res) => {
    page(res, req, 'Sentences of the Bench', JV.sentencesPage(req.user, J.sentences().slice().reverse(), req.session.csrf, mayJudge(req.user), J.cases()));
  }));

  app.post('/justice/sentences', seeCases, needJudge, checkCsrf, wrap(async (req, res) => {
    try { const x = J.sentenceOrder(req.body || {}, req.user); Activity.log(req.user, 'ordered a sentence', x.no, `${x.kind} upon ${x.who}`); req.session.flash = { text: `${x.no} is ordered.` }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/justice/sentences');
  }));

  app.post('/justice/sentences/:id', seeCases, needJudge, checkCsrf, wrap(async (req, res) => {
    try { const x = J.sentenceUpdate(String(req.params.id), req.body || {}, req.user); req.session.flash = { text: `${x.no} is set down as ${x.status}.` }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/justice/sentences');
  }));

  app.post('/justice/sentences/:id/remove', seeCases, needJudge, checkCsrf, wrap(async (req, res) => {
    J.sentenceRemove(String(req.params.id));
    req.session.flash = { text: 'The sentence is struck.' };
    res.redirect('/justice/sentences');
  }));

  // ---- The report ----

  app.get('/justice/report', seeCases, wrap(async (req, res) => {
    const from = String(req.query.from || ''), to = String(req.query.to || '');
    page(res, req, 'The Report of the Ministry', JV.reportPage(req.user, J.report(from, to), from, to, req.user.name));
  }));

  app.get('/justice/report/doc', seeCases, wrap(async (req, res) => {
    const from = String(req.query.from || ''), to = String(req.query.to || '');
    sendDoc(res, JV.reportDoc(J.report(from, to), req.user.name));
  }));

  app.get('/justice/officers', needAdmin, wrap(async (req, res) => {
    const editing = req.query.rank ? jusRanks().find(r => r.id === String(req.query.rank)) : null;
    page(res, req, 'Officers of Justice', JV.officersPage(req.user, jusOfficers(), jusRanks(), req.session.csrf, res.locals.issued, editing, giveable(req.user)));
  }));

  app.post('/justice/officers', needAdmin, checkCsrf, wrap(async (req, res) => {
    const b = req.body || {};
    const pw = U.tempPassword();
    try {
      if (!jusRankIds().has(String(b.rank))) throw new Error('That rank does not belong to the Ministry of Justice.');
      if (!giveable(req.user).some(r => r.id === String(b.rank))) throw new Error('That rank carries powers you do not hold. You cannot appoint above yourself.');
      U.create({ username: b.username, name: b.name, office: b.office, rank: b.rank, holds: [], password: pw });
      res.locals.issued = { username: String(b.username).trim().toLowerCase(), name: b.name, password: pw };
      Activity.log(req.user, 'entered an officer of Justice', '', `${b.name} (${(Ranks.get(b.rank) || {}).name || ''})`);
      const editing = null;
      return page(res, req, 'Officers of Justice', JV.officersPage(req.user, jusOfficers(), jusRanks(), req.session.csrf, res.locals.issued, editing, giveable(req.user)));
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
      return page(res, req, 'Officers of Justice', JV.officersPage(req.user, jusOfficers(), jusRanks(), req.session.csrf, res.locals.issued, null, giveable(req.user)));
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
        branch: 'justice', perms: [].concat(b.perms || [])
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
        branch: 'justice', perms: [].concat(b.perms || [])
      }, req.user);
      req.session.flash = { text: `${r.name} is amended.` };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/justice/officers');
  }));
};
