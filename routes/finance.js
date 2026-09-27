const FV = require('../lib/financeviews');
const F = require('../lib/finance');
const A = require('../lib/auth');
const U = require('../lib/users');
const Ranks = require('../lib/ranks');
const Activity = require('../lib/activity');

module.exports = (app, { checkCsrf, wrap, back }) => {
  const page = (res, req, title, body) => res.page({ title, active: 'finance', body, branch: 'finance' });

  const seeLedger = A.need('findesk', 'finledger');
  const mayManage = u => !!u && (u.all || Ranks.can(u, 'finpay') || Ranks.can(u, 'finrevenue'));
  const mayPay = u => !!u && (u.all || Ranks.can(u, 'finpay'));
  const mayAudit = u => !!u && (u.all || Ranks.can(u, 'finaudit'));
  const isAdmin = u => Ranks.mayAdminBranch(u, 'finance');

  const needManage = (req, res, next) => mayManage(req.user) ? next() : next('forbidden');
  const needPay = (req, res, next) => mayPay(req.user) ? next() : next('forbidden');
  const needAdmin = (req, res, next) => {
    if (!req.user) { req.session.returnTo = req.originalUrl; return res.redirect('/finance/entrance'); }
    return isAdmin(req.user) ? next() : next('forbidden');
  };
  const needMinister = (req, res, next) => {
    if (!req.user) { req.session.returnTo = req.originalUrl; return res.redirect('/finance/entrance'); }
    return req.user.all ? next() : next('forbidden');
  };

  const finRanks = () => Ranks.all().filter(r => Ranks.branchOf(r) === 'finance');
  const finRankIds = () => new Set(finRanks().map(r => r.id));
  const finOfficers = () => { const ids = finRankIds(); return U.list().filter(o => ids.has(o.rank)); };
  const giveable = u => u.all ? finRanks() : finRanks().filter(r => (r.perms || []).every(p => (u.perms || []).includes(p)));

  const askedMonth = req => {
    const m = String(req.query.month || req.params.key || '');
    return /^\d{4}-\d{2}$/.test(m) ? m : F.monthKey();
  };
  const may = req => ({ manage: mayManage(req.user), pay: mayPay(req.user), answer: mayPay(req.user), audit: mayAudit(req.user), ask: mayManage(req.user), log: mayManage(req.user) });

  // ---- Public ----

  app.get('/finance', wrap(async (req, res) => {
    const holders = {};
    finOfficers().filter(o => o.active !== false).forEach(o => {
      const r = Ranks.get(o.rank);
      if (r) (holders[r.name] = holders[r.name] || []).push(o.name);
    });
    page(res, req, 'The Ministry of Finance', FV.hall(req.user, F.tallies(), holders));
  }));

  app.get('/finance/principles', wrap(async (req, res) => {
    page(res, req, 'How Money Is Kept', FV.principles(req.user));
  }));

  app.get('/finance/account', wrap(async (req, res) => {
    const key = askedMonth(req);
    const b = F.budget(key);
    const spread = F.months().slice(-12).reverse().map(m => {
      const x = F.budget(m);
      return { key: m.key, label: m.label, status: m.status, takesIn: x.takesIn, givenOut: x.givenOut };
    });
    page(res, req, 'The Account', FV.accountPage(req.user, key, b, spread));
  }));

  app.get('/finance/entrance', wrap(async (req, res) => {
    if (req.user && (req.user.all || Ranks.can(req.user, 'findesk') || Ranks.can(req.user, 'finledger'))) return res.redirect('/finance/overview');
    page(res, req, 'Staff Entrance', FV.entrance(req.session.csrf, '', ''));
  }));

  // ---- Overview ----

  app.get('/finance/overview', seeLedger, wrap(async (req, res) => {
    const key = askedMonth(req);
    const b = F.budget(key);
    const recent = Activity.recent({ limit: 12 }).filter(h => /finance|treasur|draw|budget|request|roster|group|hold/i.test(String(h.action) + String(h.target)));
    page(res, req, F.monthLabel(key), FV.overview(req.user, key, b, F.toDo(), recent));
  }));

  // ---- Months ----

  app.get('/finance/months', seeLedger, wrap(async (req, res) => {
    const key = askedMonth(req);
    page(res, req, F.monthLabel(key) + ' budget', FV.monthPage(req.user, key, F.budget(key), req.session.csrf, may(req)));
  }));

  app.get('/finance/months/:key', seeLedger, wrap(async (req, res) => {
    const key = askedMonth(req);
    page(res, req, F.monthLabel(key) + ' budget', FV.monthPage(req.user, key, F.budget(key), req.session.csrf, may(req)));
  }));

  const toMonth = (req, res, key, msg, err) => {
    req.session.flash = err ? { err: true, text: err } : { text: msg };
    res.redirect(back(req, '/finance/months/' + key));
  };

  app.post('/finance/months/:key/open', seeLedger, needManage, checkCsrf, wrap(async (req, res) => {
    const key = String(req.params.key);
    try {
      const m = F.monthOpen(key, req.user);
      Activity.log(req.user, 'opened the budget for', m.label);
      toMonth(req, res, key, `${m.label} is open. Its shares carry over from the month before.`);
    } catch (e) { toMonth(req, res, key, '', e.message); }
  }));

  app.post('/finance/months/:key/income', seeLedger, needManage, checkCsrf, wrap(async (req, res) => {
    const key = String(req.params.key);
    try { F.monthEnsure(key, req.user); F.monthSaveIncome(key, req.body || {}, req.user); toMonth(req, res, key, 'The income is set down.'); }
    catch (e) { toMonth(req, res, key, '', e.message); }
  }));

  // Draw an income line from the rolls rather than typing it.
  app.get('/finance/months/:key/income/from', seeLedger, needManage, wrap(async (req, res) => {
    const key = String(req.params.key);
    const line = String(req.query.line || '');
    const span = String(req.query.span || 'this');
    try {
      if (!['tax', 'mint', 'other'].includes(line)) throw new Error('That line is not kept by the rolls.');
      F.monthEnsure(key, req.user);
      const r = F.fromRolls(key)[line];
      const v = span === 'prev' ? r.prev : span === 'due' ? r.due : r.rolls;
      if (v === undefined) throw new Error('The rolls say nothing for that.');
      F.monthSaveIncome(key, { [line]: v }, req.user);
      const label = (F.INCOME_KINDS.find(k => k[0] === line) || [])[1] || line;
      req.session.flash = { text: `${label} set to ${v.toLocaleString('en-US')} from the rolls.` };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/finance/months/' + key);
  }));

  app.post('/finance/months/:key/shares', seeLedger, needManage, checkCsrf, wrap(async (req, res) => {
    const key = String(req.params.key);
    try { F.monthSaveShares(key, req.body || {}); toMonth(req, res, key, 'The shares are set down.'); }
    catch (e) { toMonth(req, res, key, '', e.message); }
  }));

  app.post('/finance/months/:key/status', seeLedger, needManage, checkCsrf, wrap(async (req, res) => {
    const key = String(req.params.key);
    try {
      const m = F.monthSetStatus(key, String((req.body || {}).status || ''), req.user);
      Activity.log(req.user, 'set the budget to ' + m.status, m.label);
      toMonth(req, res, key, `${m.label} is ${m.status.toLowerCase()}.`);
    } catch (e) { toMonth(req, res, key, '', e.message); }
  }));

  // ---- Pay out ----

  app.get('/finance/payout', seeLedger, wrap(async (req, res) => {
    const key = askedMonth(req);
    page(res, req, 'Pay Out', FV.payoutPage(req.user, key, F.budget(key), F.requestsToPay().filter(r => r.monthKey === key), req.session.csrf, may(req)));
  }));

  app.post('/finance/payout/:key', seeLedger, needPay, checkCsrf, wrap(async (req, res) => {
    const key = String(req.params.key);
    try {
      const p = F.payOut(key, req.body || {}, req.user);
      Activity.log(req.user, 'paid a draw', F.groupName(p.groupId), String(p.amount));
      req.session.flash = { text: `${F.groupName(p.groupId)} is paid ${p.amount.toLocaleString('en-US')}.` };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/finance/payout?month=' + key);
  }));

  app.post('/finance/payout/:key/:id/undo', seeLedger, needPay, checkCsrf, wrap(async (req, res) => {
    try { F.payUndo(String(req.params.key), String(req.params.id)); req.session.flash = { text: 'The payment is undone.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/finance/payout?month=' + String(req.params.key));
  }));

  // ---- Requests ----

  app.get('/finance/requests', seeLedger, wrap(async (req, res) => {
    const show = ['waiting', 'approved', 'done'].includes(String(req.query.show || '')) ? String(req.query.show) : 'waiting';
    page(res, req, 'Requests', FV.requestsPage(req.user, F.requests().slice().reverse(), show, req.session.csrf, may(req), F.groups().filter(g => g.active !== false)));
  }));

  app.post('/finance/requests', seeLedger, needManage, checkCsrf, wrap(async (req, res) => {
    try { const r = F.requestAsk(req.body || {}, req.user); req.session.flash = { text: `${r.no} is laid before the Treasury.` }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/finance/requests');
  }));

  app.post('/finance/requests/:id', seeLedger, needPay, checkCsrf, wrap(async (req, res) => {
    try {
      const r = F.requestAnswer(String(req.params.id), req.body || {}, req.user);
      Activity.log(req.user, 'answered a request', r.no, r.status);
      req.session.flash = { text: `${r.no} is ${r.status.toLowerCase()}.` };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect(back(req, '/finance/requests'));
  }));

  app.post('/finance/requests/:id/remove', seeLedger, needPay, checkCsrf, wrap(async (req, res) => {
    F.requestRemove(String(req.params.id));
    req.session.flash = { text: 'The request is struck.' };
    res.redirect('/finance/requests');
  }));

  // ---- Spending ----

  app.get('/finance/spending', seeLedger, wrap(async (req, res) => {
    const key = askedMonth(req);
    const filter = { group: String(req.query.group || ''), q: String(req.query.q || '').slice(0, 60).toLowerCase() };
    let log = F.spendingFor(key, filter.group);
    if (filter.q) log = log.filter(s => (s.what + ' ' + s.on + ' ' + F.groupName(s.groupId)).toLowerCase().includes(filter.q));
    page(res, req, 'Spending', FV.spendingPage(req.user, key, F.spendingSummary(key), log, req.session.csrf, may(req), F.groups().filter(g => g.active !== false), filter));
  }));

  app.post('/finance/spending', seeLedger, needManage, checkCsrf, wrap(async (req, res) => {
    const key = String((req.body || {}).monthKey || F.monthKey());
    try { F.spendAdd(req.body || {}, req.user); req.session.flash = { text: 'The spending is logged.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/finance/spending?month=' + key);
  }));

  app.post('/finance/spending/:id/remove', seeLedger, needManage, checkCsrf, wrap(async (req, res) => {
    F.spendRemove(String(req.params.id));
    req.session.flash = { text: 'Struck from the log.' };
    res.redirect(back(req, '/finance/spending'));
  }));

  // ---- Rosters ----

  app.get('/finance/rosters', seeLedger, wrap(async (req, res) => {
    const gs = F.groups().filter(g => g.active !== false);
    const groupId = gs.some(g => g.id === String(req.query.group || '')) ? String(req.query.group) : (gs[0] ? gs[0].id : '');
    const withInactive = !!req.query.all;
    page(res, req, 'Rosters', FV.rostersPage(req.user, groupId, F.rosterFor(groupId, withInactive), F.rosterCounts(groupId), F.payrollFor(groupId), req.session.csrf, may(req), gs, withInactive));
  }));

  app.post('/finance/rosters', seeLedger, needManage, checkCsrf, wrap(async (req, res) => {
    const g = String((req.body || {}).groupId || '');
    try { F.rosterAdd(req.body || {}, req.user); req.session.flash = { text: 'Entered upon the roster.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/finance/rosters?group=' + encodeURIComponent(g));
  }));

  app.post('/finance/rosters/:id', seeLedger, needManage, checkCsrf, wrap(async (req, res) => {
    try {
      const r = F.rosterUpdate(String(req.params.id), { ...(req.body || {}), active: !!(req.body || {}).active });
      req.session.flash = { text: `${r.name} is amended.` };
      return res.redirect('/finance/rosters?group=' + encodeURIComponent(r.groupId));
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/finance/rosters');
  }));

  app.post('/finance/rosters/:id/remove', seeLedger, needManage, checkCsrf, wrap(async (req, res) => {
    const r = F.rosters().find(x => x.id === String(req.params.id));
    F.rosterRemove(String(req.params.id));
    req.session.flash = { text: 'Struck from the roster.' };
    res.redirect('/finance/rosters' + (r ? '?group=' + encodeURIComponent(r.groupId) : ''));
  }));

  // ---- Groups and Holds ----

  app.get('/finance/settings', seeLedger, wrap(async (req, res) => {
    page(res, req, 'Groups & Holds', FV.settingsPage(req.user, req.session.csrf, may(req)));
  }));

  const toSettings = (req, res, msg, err) => {
    req.session.flash = err ? { err: true, text: err } : { text: msg };
    res.redirect('/finance/settings');
  };

  app.post('/finance/groups', seeLedger, needManage, checkCsrf, wrap(async (req, res) => {
    try { const g = F.groupSave(null, req.body || {}); toSettings(req, res, `${g.name} is added.`); }
    catch (e) { toSettings(req, res, '', e.message); }
  }));

  app.post('/finance/groups/:id', seeLedger, needManage, checkCsrf, wrap(async (req, res) => {
    try { const g = F.groupSave(String(req.params.id), { ...(req.body || {}), active: !!(req.body || {}).active }); toSettings(req, res, `${g.name} is amended.`); }
    catch (e) { toSettings(req, res, '', e.message); }
  }));

  app.post('/finance/groups/:id/remove', seeLedger, needManage, checkCsrf, wrap(async (req, res) => {
    try { F.groupRemove(String(req.params.id)); toSettings(req, res, 'The group is struck.'); }
    catch (e) { toSettings(req, res, '', e.message); }
  }));

  app.post('/finance/holds', seeLedger, needManage, checkCsrf, wrap(async (req, res) => {
    try { const h = F.holdSave(null, req.body || {}); toSettings(req, res, `${h.name} is added.`); }
    catch (e) { toSettings(req, res, '', e.message); }
  }));

  app.post('/finance/holds/:id', seeLedger, needManage, checkCsrf, wrap(async (req, res) => {
    try { const h = F.holdSave(String(req.params.id), req.body || {}); toSettings(req, res, `${h.name} owes ${h.monthly.toLocaleString('en-US')} a month.`); }
    catch (e) { toSettings(req, res, '', e.message); }
  }));

  app.post('/finance/holds/:id/remove', seeLedger, needManage, checkCsrf, wrap(async (req, res) => {
    F.holdRemove(String(req.params.id));
    toSettings(req, res, 'The Hold is struck from the roll.');
  }));


  // ---- Assessments and arrears ----

  const mayTax = u => !!u && (u.all || Ranks.can(u, 'fintax'));
  const mayCharter = u => !!u && (u.all || Ranks.can(u, 'fincharter'));
  const mayMint = u => !!u && (u.all || Ranks.can(u, 'finmint'));
  const needTax = (req, res, next) => mayTax(req.user) ? next() : next('forbidden');
  const needCharter = (req, res, next) => mayCharter(req.user) ? next() : next('forbidden');
  const needMint = (req, res, next) => mayMint(req.user) ? next() : next('forbidden');
  const census = req => ({ tax: mayTax(req.user), charter: mayCharter(req.user), mint: mayMint(req.user) });

  app.get('/finance/assessments', seeLedger, wrap(async (req, res) => {
    const q = String(req.query.q || '').slice(0, 60).toLowerCase();
    let list = F.assessments().slice().reverse();
    if (q) list = list.filter(a => (a.who + ' ' + a.trade + ' ' + a.hold + ' ' + a.kind).toLowerCase().includes(q));
    page(res, req, 'Assessments & Arrears', FV.assessmentsPage(req.user, list, F.taxTotals(), F.byHold(), req.session.csrf, census(req), { q }));
  }));

  app.post('/finance/assessments', seeLedger, needTax, checkCsrf, wrap(async (req, res) => {
    try { const a = F.assessAdd(req.body || {}, req.user); Activity.log(req.user, 'assessed a sum', a.no, a.who); req.session.flash = { text: `${a.no} is set down against ${a.who}.` }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/finance/assessments');
  }));

  app.post('/finance/assessments/:id/render', seeLedger, needTax, checkCsrf, wrap(async (req, res) => {
    try {
      const a = F.assessRender(String(req.params.id), req.body || {}, req.user);
      req.session.flash = { text: `Entered. ${F.arrearsOn(a).toLocaleString('en-US')} still in arrears upon ${a.no}.` };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/finance/assessments');
  }));

  app.post('/finance/assessments/:id/payment/:pid/remove', seeLedger, needTax, checkCsrf, wrap(async (req, res) => {
    F.assessPaymentRemove(String(req.params.id), String(req.params.pid));
    req.session.flash = { text: 'The entry is struck.' };
    res.redirect('/finance/assessments');
  }));

  app.post('/finance/assessments/:id', seeLedger, needTax, checkCsrf, wrap(async (req, res) => {
    try { const a = F.assessUpdate(String(req.params.id), { ...(req.body || {}), remitted: !!(req.body || {}).remitted }); req.session.flash = { text: a.remitted ? `${a.no} is remitted.` : `${a.no} stands again.` }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/finance/assessments');
  }));

  app.post('/finance/assessments/:id/remove', seeLedger, needTax, checkCsrf, wrap(async (req, res) => {
    F.assessRemove(String(req.params.id));
    req.session.flash = { text: 'Struck from the roll.' };
    res.redirect('/finance/assessments');
  }));

  // ---- Charters ----

  app.get('/finance/register', wrap(async (req, res) => {
    const q = String(req.query.q || '').slice(0, 60).toLowerCase();
    let list = F.chartersPublic();
    if (q) list = list.filter(c => (c.holder + ' ' + c.house + ' ' + c.trade + ' ' + c.hold + ' ' + c.kind + ' ' + c.no).toLowerCase().includes(q));
    page(res, req, 'Register of Charters', FV.registerPage(req.user, list, String(req.query.q || '')));
  }));

  app.get('/finance/charters', seeLedger, wrap(async (req, res) => {
    page(res, req, 'Charters', FV.chartersPage(req.user, F.charters().slice().reverse(), F.charterTotals(), req.session.csrf, census(req)));
  }));

  app.post('/finance/charters', seeLedger, needCharter, checkCsrf, wrap(async (req, res) => {
    try { const c = F.charterGrant(req.body || {}, req.user); Activity.log(req.user, 'granted a charter', c.no, c.holder); req.session.flash = { text: `${c.no} is granted to ${c.holder}.` }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/finance/charters');
  }));

  app.post('/finance/charters/:id', seeLedger, needCharter, checkCsrf, wrap(async (req, res) => {
    try { const c = F.charterUpdate(String(req.params.id), req.body || {}, req.user); req.session.flash = { text: `${c.no} is set down as ${c.status}.` }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/finance/charters');
  }));

  app.post('/finance/charters/:id/remove', seeLedger, needCharter, checkCsrf, wrap(async (req, res) => {
    F.charterRemove(String(req.params.id));
    req.session.flash = { text: 'The charter is struck from the register.' };
    res.redirect('/finance/charters');
  }));

  // ---- The Mint ----

  app.get('/finance/mint', seeLedger, wrap(async (req, res) => {
    page(res, req, 'The Imperial Mint', FV.mintPage(req.user, F.mint().slice().reverse(), F.assays().slice().reverse(), F.mintTotals(), req.session.csrf, census(req)));
  }));

  app.post('/finance/mint', seeLedger, needMint, checkCsrf, wrap(async (req, res) => {
    try { const e = F.mintAdd(req.body || {}, req.user); Activity.log(req.user, 'entered upon the Mint roll', e.no, e.kind); req.session.flash = { text: `${e.no} is entered.` }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/finance/mint');
  }));

  app.post('/finance/mint/:id/remove', seeLedger, needMint, checkCsrf, wrap(async (req, res) => {
    F.mintRemove(String(req.params.id));
    req.session.flash = { text: 'Struck from the Mint roll.' };
    res.redirect('/finance/mint');
  }));

  app.post('/finance/assays', seeLedger, needMint, checkCsrf, wrap(async (req, res) => {
    try { const a = F.assayAdd(req.body || {}, req.user); Activity.log(req.user, 'made an assay', a.no, a.result); req.session.flash = { text: `${a.no}: ${a.result}.` }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/finance/mint');
  }));

  app.post('/finance/assays/:id/remove', seeLedger, needMint, checkCsrf, wrap(async (req, res) => {
    F.assayRemove(String(req.params.id));
    req.session.flash = { text: 'The assay is struck.' };
    res.redirect('/finance/mint');
  }));

  // ---- Bank logins: the Minister alone ----

  app.get('/finance/vault', needMinister, wrap(async (req, res) => {
    page(res, req, 'Bank Logins', FV.vaultPage(req.user, F.vault(), req.session.csrf, String(req.query.show || '')));
  }));

  app.post('/finance/vault', needMinister, checkCsrf, wrap(async (req, res) => {
    try { F.vaultSave(null, req.body || {}); req.session.flash = { text: 'Kept.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/finance/vault');
  }));

  app.post('/finance/vault/:id', needMinister, checkCsrf, wrap(async (req, res) => {
    try { F.vaultSave(String(req.params.id), req.body || {}); req.session.flash = { text: 'Set down.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/finance/vault');
  }));

  app.post('/finance/vault/:id/remove', needMinister, checkCsrf, wrap(async (req, res) => {
    F.vaultRemove(String(req.params.id));
    req.session.flash = { text: 'Struck.' };
    res.redirect('/finance/vault');
  }));

  // ---- Officers ----

  const officersView = (req, res, issued, editing) =>
    page(res, req, 'Officers of Finance', FV.officersPage(req.user, finOfficers(), finRanks(), req.session.csrf, issued, editing, giveable(req.user)));

  app.get('/finance/officers', needAdmin, wrap(async (req, res) => {
    const editing = req.query.rank ? finRanks().find(r => r.id === String(req.query.rank)) : null;
    officersView(req, res, null, editing);
  }));

  app.post('/finance/officers', needAdmin, checkCsrf, wrap(async (req, res) => {
    const b = req.body || {};
    const pw = U.tempPassword();
    try {
      if (!finRankIds().has(String(b.rank))) throw new Error('That rank does not belong to the Ministry of Finance.');
      if (!giveable(req.user).some(r => r.id === String(b.rank))) throw new Error('That rank carries powers you do not hold. You cannot appoint above yourself.');
      U.create({ username: b.username, name: b.name, office: b.office, rank: b.rank, holds: [], password: pw });
      Activity.log(req.user, 'entered an officer of Finance', '', `${b.name} (${(Ranks.get(b.rank) || {}).name || ''})`);
      return officersView(req, res, { username: String(b.username).trim().toLowerCase(), name: b.name, password: pw }, null);
    } catch (e) {
      req.session.flash = { err: true, text: e.message };
      res.redirect('/finance/officers');
    }
  }));

  const guardOfficer = who => {
    const t = U.view(who);
    if (!t) throw new Error('No such officer.');
    if (!finRankIds().has(t.rank)) throw new Error('That officer does not belong to the Ministry of Finance.');
    return t;
  };

  app.post('/finance/officers/:username', needAdmin, checkCsrf, wrap(async (req, res) => {
    const b = req.body || {};
    try {
      const t = guardOfficer(req.params.username);
      const patch = { name: b.name, office: b.office, listed: !!b.listed };
      const want = String(b.rank || '');
      if (want && want !== t.rank) {
        if (!finRankIds().has(want)) throw new Error('That rank does not belong to the Ministry of Finance.');
        if (!giveable(req.user).some(r => r.id === want)) throw new Error('That rank carries powers you do not hold. You cannot appoint above yourself.');
        patch.rank = want;
      }
      const after = U.update(t.username, patch);
      Activity.log(req.user, 'amended an officer of Finance', '', after.name);
      req.session.flash = { text: `${after.name} is amended.` };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/finance/officers');
  }));

  app.post('/finance/officers/:username/toggle', needAdmin, checkCsrf, wrap(async (req, res) => {
    try {
      const t = guardOfficer(req.params.username);
      U.update(t.username, { active: !t.active });
      req.session.flash = { text: `${t.name} is ${t.active ? 'stood down' : 'restored to the rolls'}.` };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/finance/officers');
  }));

  app.post('/finance/officers/:username/password', needAdmin, checkCsrf, wrap(async (req, res) => {
    try {
      const t = guardOfficer(req.params.username);
      const pw = U.tempPassword();
      U.update(t.username, { password: pw, mustChange: true });
      Activity.log(req.user, 'issued a new password to an officer of Finance', '', t.name);
      return officersView(req, res, { username: t.username, name: t.name, password: pw }, null);
    } catch (e) {
      req.session.flash = { err: true, text: e.message };
      res.redirect('/finance/officers');
    }
  }));

  const rankPatch = b => ({
    name: b.name, subtitle: b.subtitle,
    group: ['Ministry of Finance', 'Imperial Treasury', 'Census & Excise Office'].includes(b.group) ? b.group : 'Ministry of Finance',
    branch: 'finance', directory: !!b.directory, perms: [].concat(b.perms || [])
  });

  app.post('/finance/ranks', needAdmin, checkCsrf, wrap(async (req, res) => {
    try { const r = Ranks.upsert(null, rankPatch(req.body || {}), req.user); req.session.flash = { text: `${r.name} is made a rank of Finance.` }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/finance/officers');
  }));

  app.post('/finance/ranks/:id', needAdmin, checkCsrf, wrap(async (req, res) => {
    try { const r = Ranks.upsert(String(req.params.id), rankPatch(req.body || {}), req.user); req.session.flash = { text: `${r.name} is amended.` }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/finance/officers');
  }));
};
