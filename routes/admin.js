const express = require('express');
const crypto = require('crypto');
const AV = require('../lib/adminviews');
const V = require('../lib/views');
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

  // Reached from the front of the portal, not from inside a Ministry.
  const provinceBody = (req, res, issued, flash) => res.send(V.provincePage({
    today: res.locals.today, user: req.user, active: 'logins',
    ground: Settings.pageGround(), cursor: Settings.cursor(), csrf: req.session.csrf,
    body: `<main>${flash ? `<div class="flash${flash.err ? ' err' : ''}">${flash.text}</div>` : ''}${AV.peoplePage(
      U.list(), Ranks.all(), req.session.csrf, req.user, issued,
      { branch: Ranks.BRANCH_IDS.includes(String(req.query.branch || '')) ? String(req.query.branch) : '', q: String(req.query.q || '') },
      true
    )}</main>`
  }));

  const provinceGate = (req, res, next) => {
    if (!req.user) { req.session.returnTo = req.originalUrl; return res.redirect('/login'); }
    if (!req.user.all) return next('forbidden');
    next();
  };

  app.get('/province', provinceGate, (req, res) => {
    const flash = req.session.flash; req.session.flash = null;
    provinceBody(req, res, null, flash);
  });

  // The other three sections of the Study belong to the province, not to Civil
  // Affairs, so they are served in the same shell and the old paths lead here.
  const inProvince = (req, res, active, inner) => {
    const flash = req.session.flash; req.session.flash = null;
    res.send(V.provincePage({
      today: res.locals.today, user: req.user, active, ground: Settings.pageGround(), cursor: Settings.cursor(), csrf: req.session.csrf,
      body: `<main>${flash ? `<div class="flash${flash.err ? ' err' : ''}">${flash.text}</div>` : ''}${inner}</main>`
    }));
  };

  app.get('/province/ranks', provinceGate, (req, res) =>
    inProvince(req, res, 'ranks', AV.ranksPage(Ranks.all(), counts(), req.session.csrf, req.user, true)));

  app.get('/province/settings', provinceGate, (req, res) =>
    inProvince(req, res, 'settings', AV.settingsPage(Settings.get(), G.status(), Settings.laws(), req.session.csrf, req.user, res.locals.today, true, { url: res.locals.site, fixed: C.BASE_URL_SET })));

  app.get('/province/motion', provinceGate, (req, res) =>
    inProvince(req, res, 'motion', AV.motionPage(Settings.get(), res.locals.today, V.seasonOf(res.locals.today))));

  app.get('/province/forms', provinceGate, (req, res) =>
    inProvince(req, res, 'forms', AV.formsPage(Forms.listCustom(), C.FOLDER_NAMES, Forms.DEPTS, req.session.csrf, req.user, null, true)));

  app.get('/province/forms/:id/edit', provinceGate, (req, res) => {
    const entry = Forms.listCustom().find(x => x.id === req.params.id);
    if (!entry) return res.redirect('/province/forms');
    inProvince(req, res, 'forms', AV.formsPage(Forms.listCustom(), C.FOLDER_NAMES, Forms.DEPTS, req.session.csrf, req.user, entry, true));
  });

  // The Study is the Civil Affairs roll and nothing else. Officers of the other
  // Ministries are kept by those Ministries; everyone at once is under
  // /admin/people. Before each Ministry had its own door they all landed here,
  // which is why people who never served Civil Affairs still appear on its roll.
  const civilOnly = () => U.list().filter(u => Ranks.userBranch(u) === 'civil');

  function study(req, res, status, flash) {
    res.page({ title: 'Minister’s Study', active: 'admin', flash, body: AV.study(civilOnly(), Ranks.all(), req.session.csrf, req.user, res.locals.issued) }, status);
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
      if (req.body.weekly !== undefined) U.update(req.body.username, { weekly: req.body.weekly });
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
        const patch = { name: req.body.name, office: req.body.office, holds: arr(req.body.holds), listed: req.body.listed === '1', weekly: req.body.weekly };
        if (req.body.rank && who !== req.user.username) { rankAllowed(req, req.body.rank); patch.rank = req.body.rank; }
        U.update(who, patch);
        req.session.flash = { text: 'Updated ' + t.name + '.' };
        Activity.log(req.user, 'updated an officer', '', t.name);
      }
      else if (act === 'unlink-discord') {
        if (!req.user.all) throw new Error('Only the Minister may unlink a Discord.');
        const was = U.unlinkDiscord(who);
        req.session.flash = was
          ? { text: `${t.name} is no longer linked to Discord (${was.name || was.username}). They enter by name and password until they link it again.` }
          : { err: true, text: `${t.name} has no Discord linked.` };
        if (was) Activity.log(req.user, 'unlinked a Discord', '', t.name);
      }
      else if (act === 'remove') { if (who === req.user.username) throw new Error('You cannot strike your own name from the rolls.'); U.remove(who); req.session.flash = { text: 'Removed ' + t.name + ' from the rolls.' }; Activity.log(req.user, 'removed an officer', '', t.name); }
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/admin');
  });

  // ---- Every login in the province ----
  // Only the Minister opens this: it reaches across every Ministry's roll, so a
  // scoped admin must not be able to move people into or out of their own.
  const ministerOnly = A.requireAdmin;

  r.get('/people', ministerOnly, (req, res) => {
    const q = req.originalUrl.split('?')[1];
    res.redirect('/province' + (q ? '?' + q : ''));
  });

  r.post('/people', ministerOnly, checkCsrf, (req, res) => {
    const pw = U.tempPassword();
    try {
      rankAllowed(req, req.body.rank);
      U.create({ username: req.body.username, name: req.body.name, office: req.body.office, rank: req.body.rank, holds: [], password: pw });
      const un = String(req.body.username).trim().toLowerCase();
      Activity.log(req.user, 'gave a login', '', `${req.body.name} (${(Ranks.get(req.body.rank) || {}).name || ''})`);
      return provinceBody(req, res, { username: un, name: req.body.name, password: pw, fresh: true }, null);
    } catch (e) { return provinceBody(req, res, null, { err: true, text: e.message }); }
  });

  const Off = require('../lib/offsite');

  function vaultBody(req, res, flash) {
    const V = require('../lib/vault');
    const st = V.state();
    const off = Off.state();
    const h = `<input type="hidden" name="_csrf" value="${req.session.csrf}">`;
    const when = iso => { try { return new Date(iso).toLocaleString('en-GB'); } catch (_) { return ''; } };
    const size = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
    const rows = d => d.map(x => `<tr><td>${V_esc(x.day)}</td><td class="num">${V_esc(x.file)}</td></tr>`).join('');

    res.page({ title: 'The Strongroom', flash, body: `<section>
      <h2>The Strongroom</h2>
      <p class="lede">Where a copy of the Ministry\u2019s rolls is kept, so that losing one thing never loses everything.</p>

      <div class="section-label">The Copy Kept Here</div>
      ${st.has
        ? `<p class="notice">The last copy holds <b>${st.count} records</b>, taken ${when(st.at)}.</p>`
        : '<p class="notice">No copy has been kept yet. One is written the first time the Docket is read.</p>'}
      ${st.days.length
        ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>Day</th><th class="num">File</th></tr></thead><tbody>${rows(st.days)}</tbody></table></div>`
        : '<p class="hint">None yet.</p>'}
      <p class="hint">One copy a day, the last ${V.KEEP} days held. If Google cannot be reached the hall reads from this copy rather than showing nothing \u2014 read-only, because a record must have a number upon the sheet before it is real.</p>
      <p class="notice">This copy sits on the same machine as the hall itself. That is enough for a bad morning at Google. It is <b>not</b> enough for a bad day at Railway, which is what the next part is for.</p>

      <div class="section-label">The Copy Kept Elsewhere</div>
      ${!off.configured
        ? `<article class="reqcard rulesetcard">
            <p style="margin:0 0 10px"><b>Nothing is being sent off-site.</b> Everything the Ministry has \u2014 the Docket, the rolls, the ranks, the Gazette, the oaths \u2014 exists in exactly two places that can both fail on the same afternoon.</p>
            <p class="hint" style="margin:0">Set these in Railway and a copy goes out nightly, on its own. Cloudflare R2 and Backblaze B2 both give 10 GB free, which is some thousands of nights at the size this Ministry runs to.</p>
            <dl class="meta" style="margin-top:12px">
              <dt><code>OFFSITE_ENDPOINT</code></dt><dd>e.g. <code>https://&lt;account&gt;.r2.cloudflarestorage.com</code></dd>
              <dt><code>OFFSITE_BUCKET</code></dt><dd>the bucket you made</dd>
              <dt><code>OFFSITE_KEY_ID</code> and <code>OFFSITE_SECRET</code></dt><dd>an access key with write on that bucket, and nothing else</dd>
              <dt><code>OFFSITE_PASSPHRASE</code></dt><dd><b>Set this.</b> The bundle is encrypted with it before it leaves. Without it the bundle goes out readable, and it contains your officers\u2019 password hashes. Keep a copy of the passphrase somewhere that is not Railway and not this hall \u2014 without it the bundle cannot be opened again, by you or by anyone.</dd>
              <dt><code>OFFSITE_REGION</code></dt><dd>optional \u2014 <code>auto</code> for R2, the bucket\u2019s region for B2</dd>
            </dl>
          </article>`
        : `<article class="reqcard">
            <div class="no">${V_esc(off.where)} \u00b7 ${V_esc(off.bucket)}/${V_esc(off.prefix)}</div>
            <p style="margin:0 0 8px">${off.lastAt
              ? `Last sent <b>${when(off.lastAt)}</b> \u2014 ${off.lastRecords} records, ${size(off.lastBytes)}.`
              : 'Set up, but nothing has been sent yet.'}</p>
            <p class="hint" style="margin:0 0 4px">
              ${off.encrypted
                ? 'The bundle is <b>encrypted</b> before it leaves. It cannot be opened without the passphrase \u2014 keep that somewhere that is not Railway.'
                : '<b>The bundle goes out readable.</b> It holds your officers\u2019 password hashes. Set <code>OFFSITE_PASSPHRASE</code> in Railway and it will be encrypted from the next run.'}
            </p>
            <p class="hint" style="margin:0">
              ${off.includeBank
                ? 'The Finance bank logins <b>are</b> in the bundle, because <code>OFFSITE_INCLUDE_BANK</code> is set to yes. Those are stored in plain words. Do not do this without a passphrase.'
                : 'The Finance bank logins are <b>left out</b> of the bundle on purpose \u2014 they are kept in plain words, and sending them anywhere widens the harm if the store is ever read by somebody else.'}
            </p>
            ${off.lastError ? `<p class="notice" style="margin:10px 0 0"><b>The last attempt failed:</b> ${V_esc(off.lastError)}</p>` : ''}
            <div class="linkrow">
              <form method="post" action="/admin/vault/send" class="inline">${h}<button class="btn small" type="submit">Send a copy now</button></form>
              <form method="post" action="/admin/vault/check" class="inline">${h}<button class="btn ghost small" type="submit">Just test the connection</button></form>
            </div>
          </article>
          ${off.runs.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>Sent</th><th>Records</th><th>Files</th><th class="num">Size</th><th>By</th></tr></thead><tbody>
            ${off.runs.slice().reverse().map(r => `<tr><td>${when(r.at)}</td><td>${r.records}</td><td>${r.files}</td><td class="num">${size(r.bytes)}</td><td>${V_esc(r.by || '')}</td></tr>`).join('')}
          </tbody></table></div>` : ''}
          <p class="hint">A copy goes out once a day on its own, and again whenever you press the button. Each day keeps its own file, and <code>latest</code> is always the newest.</p>`}

      <div class="section-label">Getting It Back</div>
      <article class="reqcard dimcard">
        <p style="margin:0 0 8px">A bundle is gzipped JSON holding the whole Docket and every roll the Ministry keeps. To read one back:</p>
        <pre class="codeblock">node -e "const O=require('./lib/offsite'),z=require('zlib'),f=require('fs');
const b=f.readFileSync('latest.json.gz.enc');
f.writeFileSync('out.json', z.gunzipSync(O.decrypt(b, process.env.OFFSITE_PASSPHRASE)));"</pre>
        <p class="hint" style="margin:8px 0 0">Drop <code>O.decrypt(...)</code> and just gunzip if no passphrase was set. Worth doing once now, while nothing is wrong \u2014 a backup nobody has ever opened is a rumour, not a backup.</p>
      </article>
    </section>` });
  }

  const V_esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  r.get('/vault', ministerOnly, (req, res) => vaultBody(req, res, null));

  r.post('/vault/send', ministerOnly, checkCsrf, wrap(async (req, res) => {
    try {
      const e = await Off.send(req.user);
      Activity.log(req.user, 'sent a copy of the rolls off-site', e.key);
      req.session.flash = { text: `Sent. ${e.records} records and ${e.files} rolls, ${Math.max(1, Math.round(e.bytes / 1024))} KB, as ${e.key}.` };
    } catch (e) {
      req.session.flash = { err: true, text: e.message };
    }
    res.redirect('/admin/vault');
  }));

  r.post('/vault/check', ministerOnly, checkCsrf, wrap(async (req, res) => {
    try {
      const c = await Off.check(req.user);
      req.session.flash = { text: `The store answered. ${c.host} took a test file into ${c.bucket}.` };
    } catch (e) {
      req.session.flash = { err: true, text: e.message };
    }
    res.redirect('/admin/vault');
  }));

  r.post('/people/:username/:action', ministerOnly, checkCsrf, (req, res) => {
    const who = req.params.username, act = req.params.action;
    try {
      const t = guard(req, who);
      if (act === 'reset') {
        const pw = U.tempPassword();
        const u = U.update(who, { password: pw, mustChange: true });
        Activity.log(req.user, 'reset a password', '', u.name);
        return provinceBody(req, res, { username: u.username, name: u.name, password: pw }, null);
      }
      if (act === 'suspend') {
        if (who === req.user.username) throw new Error('You cannot suspend your own account.');
        U.update(who, { active: false });
        req.session.flash = { text: 'Suspended ' + t.name + '.' };
        Activity.log(req.user, 'suspended an officer', '', t.name);
      } else if (act === 'restore') {
        U.update(who, { active: true });
        req.session.flash = { text: 'Restored ' + t.name + '.' };
        Activity.log(req.user, 'restored an officer', '', t.name);
      } else if (act === 'move') {
        if (who === req.user.username) throw new Error('You cannot move your own account.');
        rankAllowed(req, req.body.rank);
        const was = Ranks.branchOf(Ranks.get(t.rank));
        U.update(who, { rank: req.body.rank, office: req.body.office, weekly: req.body.weekly });
        const now = Ranks.branchOf(Ranks.get(req.body.rank));
        const name = id => (Ranks.BRANCHES.find(b => b.id === id) || {}).short || id;
        req.session.flash = { text: was === now ? `${t.name} is amended.` : `${t.name} is moved from ${name(was)} to ${name(now)}.` };
        Activity.log(req.user, 'moved an officer', '', `${t.name}: ${name(was)} → ${name(now)}`);
      } else if (act === 'remove') {
        if (who === req.user.username) throw new Error('You cannot strike your own name from the rolls.');
        U.remove(who);
        req.session.flash = { text: `${t.name} is struck from the rolls entirely. Anything they filed stands in their name.` };
        Activity.log(req.user, 'removed an officer', '', t.name);
      } else throw new Error('No such action.');
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/province');
  });

  const minister = A.requireAdmin;
  const counts = () => U.list().reduce((m, u) => { m[u.rank] = (m[u.rank] || 0) + 1; return m; }, {});
  r.get('/ranks', minister, (req, res) => res.redirect('/province/ranks'));
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

  r.get('/settings', minister, (req, res) => res.redirect('/province/settings'));
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
  r.post('/settings/landing', minister, checkCsrf, (req, res) => {
    const want = Settings.LANDINGS.includes(req.body.landing) ? req.body.landing : 'cards';
    const grd = Settings.GROUNDS.includes(req.body.pageGround) ? req.body.pageGround : 'lamplit';
    const cur = Settings.CURSORS.includes(req.body.cursor) ? req.body.cursor : 'quill';
    Settings.set({ landing: want, pageGround: grd, cursor: cur, cursorChosen: true });
    Activity.log(req.user, 'set the front page', want + ' on ' + grd);
    req.session.flash = { text: (want === 'books' ? 'The front page now sets out the Ministries as books.' : 'The front page is back to cards.') + ' The halls stand on ' + (grd === 'lamplit' ? 'the lamplit ground' : 'plain parchment') + '. Both are set back from here.' };
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
  r.get('/forms', minister, (req, res) => res.redirect('/province/forms'));
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
