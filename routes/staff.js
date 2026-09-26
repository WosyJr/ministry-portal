sconst express = require('express');
const C = require('../lib/config');
const V = require('../lib/views');
const SV = require('../lib/staffviews');
const A = require('../lib/auth');
const U = require('../lib/users');
const G = require('../lib/google');
const S = require('../lib/store');
const Ranks = require('../lib/ranks');
const Records = require('../lib/records');
const Settings = require('../lib/settings');
const Activity = require('../lib/activity');
const DocView = require('../lib/docview');
const { BY_KEY } = require('../lib/forms');
const { DEPTS, QUIZ } = require('../lib/content');

const clean = (s, max) => String(s ?? '').replace(/\r/g, '').trim().slice(0, max);
const splitNos = s => String(s || '').split(/[,;\n]+/).map(x => x.trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 20);

module.exports = (app, { checkCsrf, wrap, back }) => {
  const r = express.Router();
  r.use(A.requireStaff);
  const need = A.need;
  const not = (res, title, text) => res.say(title || 'Not found', text || 'Nothing in the Ministry answers to that.', 404);

  async function normalizeLinks(list) {
    const rows = await Records.all();
    return list.map(no => { const p = Records.parseRecordNo(no); if (!p) return null; const m = rows.find(x => x.Class.toLowerCase() === p.cls.toLowerCase() && parseInt(x.Number, 10) === p.n); return m ? m['Record No'] : null; });
  }
  async function findRecord(req, res) {
    const rows = await Records.allOrNull();
    if (rows === null) { res.say('The Docket is closed', 'The Minister must connect the Ministry archives to Google first.', 503); return null; }
    const rec = rows.find(x => x['Record No'] === req.params.no);
    if (!rec || !Records.canSee(req.user, rec)) { not(res, 'No such record', 'No record your rank may read answers to that number.'); return null; }
    return rec;
  }

  r.get('/', need('desk'), wrap(async (req, res) => {
    const u = req.user;
    const rows = await Records.visible(u);
    const drafts = S.read('drafts.json', []).filter(d => d.by === u.username).sort((a, b) => b.at.localeCompare(a.at));
    const d = { drafts, counts: [] };
    if (rows) {
      d.assigned = rows.filter(x => x['Assigned To'] === u.username && !Records.isClosed(x)).reverse();
      d.returned = rows.filter(x => x.Status === 'Returned' && Records.meta(x).filer === u.username).reverse();
      if (A.can(u, 'docket') || A.can(u, 'allrecords')) d.recent = rows.slice(-8).reverse();
      if (A.can(u, 'approve')) d.counts.push([rows.filter(x => x.Status === 'Awaiting Seal').length, 'awaiting a seal', '/staff/approvals']);
      if (A.can(u, 'petitions')) d.counts.push([rows.filter(x => x.Class === 'Petition' && x.Status === 'Received').length, 'new petitions', '/staff/petitions']);
      d.counts.push([d.assigned.length, 'on your desk', '/staff/docket?who=me']);
    }
    if (A.can(u, 'handover')) d.counts.push([S.read('handover.json', []).filter(n => (n.to === 'user:' + u.username || n.to === 'rank:' + u.rank) && !(n.readBy || []).includes(u.username)).length, 'handover notes', '/staff/handover']);
    if (A.can(u, 'correspondence')) d.counts.push([Records.requests().filter(q => q.status === 'Pending').length, 'ministry requests', '/staff/correspondence']);
    if (A.can(u, 'request')) d.requests = Records.requests().filter(q => q.by === u.username).reverse().slice(0, 8);
    if (A.can(u, 'bulletin')) d.bulletin = S.read('bulletin.json', []).sort((a, b) => (b.pinned - a.pinned) || b.at.localeCompare(a.at)).slice(0, 3);
    res.page({ title: 'My Desk', active: 'desk', body: SV.desk(u, d), flash: !G.connected() && u.all ? { err: true, html: 'The Ministry archives are not connected to Google yet. <a href="/admin/settings">Connect them in the Study</a>.' } : null });
  }));

  r.get('/clerk', need('clerk'), (req, res) => {
    const s = parseInt(req.query.s, 10) || 0;
    res.page({ title: 'Clerk Desk', active: 'clerk', body: SV.clerk(req.user, String(req.query.q || '').slice(0, 80), s) });
  });

  r.get('/forms', need('file'), (req, res) => res.page({ title: 'Writs & Forms', active: 'forms', body: SV.formsIndex(req.user) }));
  r.get('/forms/go', need('file'), (req, res) => {
    const key = String(req.query.key || '');
    res.redirect(`/staff/forms/${encodeURIComponent(key)}${req.query.link ? '?link=' + encodeURIComponent(String(req.query.link).slice(0, 80)) : ''}`);
  });

  function formGuard(req, res) {
    const f = BY_KEY[req.params.key];
    if (!f) { not(res, 'No such writ', 'That instrument is not kept by this Ministry.'); return null; }
    if (!SV.mayFile(req.user, f.key)) { res.say('Not your writ', 'This instrument belongs to another office or rank.', 403); return null; }
    return f;
  }
  const todayParts = () => Records.todayParts();

  r.get('/forms/:key', need('file'), (req, res) => {
    const f = formGuard(req, res); if (!f) return;
    let prev = null, opts = { today: todayParts(), linked: String(req.query.link || '').slice(0, 300) };
    if (req.query.draft) {
      const d = S.read('drafts.json', []).find(x => x.id === req.query.draft && x.by === req.user.username && x.form === f.key);
      if (d) { prev = d.body; opts = { ...opts, draftId: d.id, hold: d.body.hold || '', linked: d.body.linked || '', checks: d.body.check || {} }; }
    }
    const flash = G.connected() ? null : { err: true, text: 'The Ministry archives are not connected to Google yet, so this writ cannot be sealed. You may still keep it as a draft or practice it.' };
    res.page({ title: f.title, active: 'forms', body: SV.formPage(f, req.user, req.session.csrf, prev, opts), flash });
  });

  r.post('/forms/:key', need('file'), checkCsrf, wrap(async (req, res) => {
    const f = formGuard(req, res); if (!f) return;
    const u = req.user, b = req.body || {};
    const act = b.act || 'seal';
    const raw = { f: b.f || {}, d: b.d || {}, g: b.g || {}, sig: b.sig || [], recordDate: b.recordDate || {}, hold: clean(b.hold, 40), linked: clean(b.linked, 300), public: b.public === '1', check: b.check || {} };
    const again = (msg, status = 400) => res.page({ title: f.title, active: 'forms', flash: { err: true, text: msg }, body: SV.formPage(f, u, req.session.csrf, raw, { today: todayParts(), hold: raw.hold, linked: raw.linked, checks: raw.check, draftId: b.draftId }) }, status);

    if (act === 'draft') {
      const id = S.update('drafts.json', [], list => {
        let d = b.draftId && list.find(x => x.id === b.draftId && x.by === u.username);
        if (!d) { d = { id: S.id(), by: u.username, form: f.key }; list.push(d); }
        d.at = new Date().toISOString();
        d.label = clean(Object.values(raw.f).find(v => typeof v === 'string' && v.trim()) || '', 80);
        d.body = raw;
        const mine = list.filter(x => x.by === u.username);
        if (mine.length > 30) list.splice(list.indexOf(mine.sort((x, y) => x.at.localeCompare(y.at))[0]), 1);
        return d.id;
      });
      req.session.flash = { text: 'Kept as a draft. Take it up again from My Desk.' };
      return res.redirect(`/staff/forms/${f.key}?draft=${id}`);
    }
    const parsed = Records.parseInput(f, raw);
    if (act === 'practice') {
      if (!A.can(u, 'training')) return again('Practice is not open to your rank.');
      const html = DocView.render(f, { fields: parsed.fields, recordDate: parsed.recordDate, sigNames: parsed.sigNames, filedBy: `${u.name}, ${u.title}` });
      Activity.log(u, 'practised a writ', '', f.title);
      return res.page({ title: 'Practice', active: 'forms', body: SV.practice(f, html, f.key) });
    }
    if (parsed.missing.length) return again('Before sealing, fill in: ' + parsed.missing.join(', ') + '.');
    if (SV.CHECKLIST.some((_, i) => !raw.check[i])) return again('Confirm every line of the checklist before sealing.');
    if (!G.connected()) return again('The Ministry archives are not connected to Google yet. The Minister must connect them before writs can be filed.', 503);
    const wanted = splitNos(raw.linked);
    const linked = wanted.length ? await normalizeLinks(wanted) : [];
    const bad = wanted.filter((_, i) => !linked[i]);
    if (bad.length) return again('No record upon the Docket answers to: ' + bad.join(', ') + '.');
    try {
      const entry = await Records.file({ form: f, parsed, by: u, hold: raw.hold, linked, makePublic: f.publicCapable && A.can(u, 'publish') && raw.public });
      if (b.draftId) S.update('drafts.json', [], list => { const i = list.findIndex(x => x.id === b.draftId && x.by === u.username); if (i >= 0) list.splice(i, 1); });
      Activity.log(u, entry.Status === 'Awaiting Seal' ? 'filed for approval' : 'sealed and filed', entry['Record No'], entry.Subject);
      res.page({ title: entry['Record No'], active: 'forms', body: SV.filed(entry, u) });
    } catch (e) {
      console.error(e);
      again('The writ could not be filed: ' + (e.message || 'unknown error') + ' Nothing was numbered. Try again in a moment.', 500);
    }
  }));

  r.get('/offices', need('file', 'docket'), (req, res) => res.page({ title: 'Offices', active: 'offices', body: SV.offices(req.user) }));
  r.get('/office/:id', need('file', 'docket'), wrap(async (req, res) => {
    const d = DEPTS.find(x => x.id === req.params.id && (req.user.depts || []).includes(x.id));
    if (!d) return not(res, 'No such office', 'That office is not open to your rank.');
    const rows = await Records.visible(req.user);
    const open = rows && rows.filter(x => d.folders.includes(Records.folderKey(x)) && !Records.isClosed(x)).reverse().slice(0, 25);
    res.page({ title: d.title, active: 'offices', body: SV.office(d, req.user, open) });
  }));

  r.get('/docket', need('docket', 'allrecords'), wrap(async (req, res) => {
    const u = req.user;
    const q = String(req.query.q || '').slice(0, 80).toLowerCase();
    const f = { cls: String(req.query.class || '').slice(0, 60), status: String(req.query.status || ''), hold: String(req.query.hold || ''), who: String(req.query.who || '') };
    let rows = await Records.visible(u);
    const classes = rows ? [...new Set(rows.map(x => x.Class))].sort() : [];
    if (rows) {
      rows = rows.slice().reverse();
      if (q) rows = rows.filter(x => [x['Record No'], x.Subject, x['Filed By'], x.Summary, x.Hold, x['Date (4E)']].join(' ').toLowerCase().includes(q));
      if (f.cls) rows = rows.filter(x => x.Class === f.cls);
      if (f.status) rows = rows.filter(x => x.Status === f.status);
      if (f.hold) rows = rows.filter(x => x.Hold === f.hold);
      if (f.who === 'me') rows = rows.filter(x => x['Assigned To'] === u.username);
      if (f.who === 'none') rows = rows.filter(x => !x['Assigned To']);
      rows = rows.slice(0, 400);
    }
    res.page({ title: 'Docket', active: 'docket', body: SV.docketPage(rows, u, req.query.q, f, classes, U.list()) });
  }));
  r.get('/search', (req, res) => res.redirect('/staff/archives' + (req.query.q ? '?q=' + encodeURIComponent(String(req.query.q)) : '')));

  r.get('/records/:no', wrap(async (req, res) => {
    const rec = await findRecord(req, res); if (!rec) return;
    const rows = await Records.all();
    const linked = Records.links(rec).map(no => ({ no, row: rows.find(x => x['Record No'] === no && Records.canSee(req.user, x)) }));
    const id = Records.docId(rec);
    res.page({ title: rec['Record No'], active: 'docket', body: SV.recordPage(rec, { u: req.user, csrf: req.session.csrf, officers: U.list(), linked, history: Activity.recent({ target: rec['Record No'], limit: 40 }), docSrc: id ? `/staff/files/${encodeURIComponent(id)}/content` : '', m: Records.meta(rec) }) });
  }));

  const recPost = (perm, fn) => [perm ? need(perm) : (req, res, next) => next(), checkCsrf, wrap(async (req, res) => {
    const rec = await findRecord(req, res); if (!rec) return;
    const url = V.recUrl(rec['Record No']);
    try {
      const msg = await fn(req, rec);
      if (msg) req.session.flash = { text: msg };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect(back(req, url));
  })];

  r.post('/records/:no/status', ...recPost('status', async (req, rec) => {
    const st = String(req.body.status || '');
    if (st === 'Awaiting Seal' && rec.Status !== 'Awaiting Seal') throw new Error('Only a filing puts a record in the Approval Queue.');
    if (rec.Status === 'Awaiting Seal' && st !== 'Awaiting Seal' && !A.can(req.user, 'approve')) throw new Error('This record awaits an officer’s seal.');
    await Records.setStatus(rec['Record No'], st);
    Activity.log(req.user, 'set the state to ' + st, rec['Record No']);
    return `${rec['Record No']} is now ${st}.`;
  }));
  r.post('/records/:no/assign', ...recPost('status', async (req, rec) => {
    const un = String(req.body.username || '');
    const o = un ? U.view(un) : null;
    if (un && (!o || !o.active)) throw new Error('No such officer.');
    await Records.assign(rec['Record No'], un);
    Activity.log(req.user, un ? 'assigned it to ' + o.name : 'cleared the assignment', rec['Record No']);
    return un ? `${rec['Record No']} is laid on ${o.name}’s desk.` : 'Assignment cleared.';
  }));
  r.post('/records/:no/hold', ...recPost('status', async (req, rec) => {
    await Records.setHold(rec['Record No'], String(req.body.hold || ''));
    Activity.log(req.user, 'set the Hold', rec['Record No'], Records.holdOf(String(req.body.hold || '')) || 'none');
    return 'Hold set.';
  }));
  r.post('/records/:no/link', ...recPost('status', async (req, rec) => {
    const [other] = await normalizeLinks([clean(req.body.other, 80)]);
    if (!other) throw new Error('No record upon the Docket answers to “' + clean(req.body.other, 80) + '”.');
    await Records.link(rec['Record No'], other, true);
    Activity.log(req.user, 'linked', rec['Record No'], other);
    return `Linked to ${other}.`;
  }));
  r.post('/records/:no/unlink', ...recPost('status', async (req, rec) => {
    const other = clean(req.body.other, 80);
    await Records.link(rec['Record No'], other, false);
    Activity.log(req.user, 'unlinked', rec['Record No'], other);
    return `Unlinked from ${other}.`;
  }));
  r.post('/records/:no/public', ...recPost('publish', async (req, rec) => {
    const yes = req.body.value === 'Yes';
    await Records.setPublic(rec['Record No'], yes);
    Activity.log(req.user, yes ? 'posted it publicly' : 'withdrew it from public view', rec['Record No']);
    return yes ? 'Posted for the public.' : 'Withdrawn from public view.';
  }));
  r.post('/records/:no/approve', ...recPost('approve', async (req, rec) => {
    await Records.approve(rec['Record No'], req.user);
    Activity.log(req.user, 'approved and sealed', rec['Record No']);
    return `${rec['Record No']} is sealed.`;
  }));
  r.post('/records/:no/return', ...recPost('approve', async (req, rec) => {
    await Records.sendBack(rec['Record No'], req.user, req.body.note);
    Activity.log(req.user, 'returned for correction', rec['Record No'], clean(req.body.note, 200));
    return `${rec['Record No']} is returned to its filer.`;
  }));
  r.post('/records/:no/resubmit', ...recPost(null, async (req, rec) => {
    if (Records.meta(rec).filer !== req.user.username) throw new Error('Only the officer who filed it may send it again.');
    await Records.resubmit(rec['Record No'], req.user);
    Activity.log(req.user, 'sent it again for approval', rec['Record No']);
    return 'Sent again for approval.';
  }));
  r.post('/records/:no/catalogue', ...recPost('archive', async (req, rec) => {
    const entry = await Records.catalogue(rec['Record No'], req.user);
    Activity.log(req.user, 'catalogued for the Archives', rec['Record No'], entry['Record No']);
    return `${rec['Record No']} is archived under ${entry['Record No']}.`;
  }));
  r.post('/records/:no/delete', need('delete'), checkCsrf, wrap(async (req, res) => {
    const rec = await findRecord(req, res); if (!rec) return;
    if (req.body.confirm !== rec['Record No']) { req.session.flash = { err: true, text: 'The record was not struck.' }; return res.redirect(V.recUrl(rec['Record No'])); }
    try {
      await Records.strike(rec['Record No']);
      Activity.log(req.user, 'struck from the rolls', rec['Record No'], rec.Subject);
      req.session.flash = { text: `${rec['Record No']} is struck from the rolls. Its document is in the Drive’s bin for thirty days.` };
      res.redirect('/staff/docket');
    } catch (e) { req.session.flash = { err: true, text: e.message }; res.redirect(V.recUrl(rec['Record No'])); }
  }));

  function editGuard(req, res, rec) {
    const m = Records.meta(rec);
    const f = BY_KEY[rec.Form];
    const ok = A.can(req.user, 'edit') || (m.filer === req.user.username && rec.Status === 'Returned');
    if (!ok) { res.say('Not yours to amend', 'Only the Minister, or officers given the power to edit records, may amend a sealed record.', 403); return null; }
    if (!f || !m.input || m.tooLong) { res.say('Cannot be amended here', 'This record was not filed through the hall, or is too long to rebuild. Amend it in Google Drive.', 400); return null; }
    return { f, m };
  }
  r.get('/records/:no/edit', wrap(async (req, res) => {
    const rec = await findRecord(req, res); if (!rec) return;
    const g = editGuard(req, res, rec); if (!g) return;
    res.page({ title: 'Amend ' + rec['Record No'], active: 'docket', body: SV.formPage(g.f, req.user, req.session.csrf, g.m.input, { mode: 'edit', recordNo: rec['Record No'], hold: (Ranks.HOLD_BY_NAME[rec.Hold] || {}).id || '', today: Records.todayParts() }) });
  }));
  r.post('/records/:no/edit', checkCsrf, wrap(async (req, res) => {
    const rec = await findRecord(req, res); if (!rec) return;
    const g = editGuard(req, res, rec); if (!g) return;
    const b = req.body || {};
    const raw = { f: b.f || {}, d: b.d || {}, g: b.g || {}, sig: b.sig || [], recordDate: b.recordDate || {} };
    const again = msg => res.page({ title: 'Amend ' + rec['Record No'], active: 'docket', flash: { err: true, text: msg }, body: SV.formPage(g.f, req.user, req.session.csrf, raw, { mode: 'edit', recordNo: rec['Record No'], hold: clean(b.hold, 40), checks: b.check || {} }) }, 400);
    if (SV.CHECKLIST.some((_, i) => !(b.check || {})[i])) return again('Confirm every line of the checklist before resealing.');
    try {
      await Records.edit(rec['Record No'], raw, clean(b.hold, 40), req.user);
      Activity.log(req.user, 'amended the record', rec['Record No']);
      req.session.flash = { text: `${rec['Record No']} is amended and resealed.` };
      res.redirect(V.recUrl(rec['Record No']));
    } catch (e) { again(e.message); }
  }));

  r.get('/approvals', need('approve'), wrap(async (req, res) => {
    const rows = await Records.visible(req.user);
    res.page({ title: 'Approvals', active: 'approvals', body: SV.approvals(rows && rows.filter(x => x.Status === 'Awaiting Seal'), req.user) });
  }));

  r.get('/petitions', need('petitions'), wrap(async (req, res) => {
    const u = req.user;
    const f = { status: String(req.query.status || ''), hold: String(req.query.hold || ''), nature: String(req.query.nature || ''), show: String(req.query.show || '') };
    let rows = await Records.visible(u);
    if (rows) {
      rows = rows.filter(x => x.Class === 'Petition').reverse();
      if (f.show === 'mine') rows = rows.filter(x => x['Assigned To'] === u.username);
      else if (f.show !== 'all' && !f.status) rows = rows.filter(x => !Records.isClosed(x) && x.Status !== 'Referred');
      if (f.status) rows = rows.filter(x => x.Status === f.status);
      if (f.hold) rows = rows.filter(x => x.Hold === f.hold);
      if (f.nature) rows = rows.filter(x => ((Records.meta(x).input || {}).f || {}).nature === f.nature);
    }
    res.page({ title: 'Petitions', active: 'petitions', body: SV.petitions(rows, u, f, U.list(), req.session.csrf) });
  }));

  function holdCounts(rows) {
    const c = {};
    Ranks.HOLDS.forEach(h => { c[h.name] = { open: 0, petitions: 0, lastDispatch: null }; });
    (rows || []).forEach(x => {
      const k = c[x.Hold]; if (!k) return;
      if (!Records.isClosed(x)) { k.open++; if (x.Class === 'Petition') k.petitions++; }
      if (x.Form === 'dispatch') k.lastDispatch = x;
    });
    return c;
  }
  r.get('/holds', need('holds'), wrap(async (req, res) => {
    const rows = await Records.visible(req.user);
    res.page({ title: 'Holds', active: 'holds', body: SV.holds(holdCounts(rows), U.list()) });
  }));
  r.get('/holds/:id', need('holds'), wrap(async (req, res) => {
    const h = Ranks.HOLD_BY_ID[req.params.id];
    if (!h) return not(res, 'No such Hold', 'Skyrim has nine Holds, and that is not one of them.');
    const rows = await Records.visible(req.user);
    const here = rows && rows.filter(x => x.Hold === h.name).reverse();
    const d = { delegates: U.list().filter(o => o.active && o.holds.includes(h.id)) };
    if (here) {
      d.petitions = here.filter(x => x.Class === 'Petition' && !Records.isClosed(x));
      d.dispatches = here.filter(x => x.Form === 'dispatch').slice(0, 10);
      d.notices = here.filter(x => x.Form === 'notice').slice(0, 10);
      d.open = here.filter(x => !Records.isClosed(x) && x.Class !== 'Petition' && x.Form !== 'dispatch' && x.Form !== 'notice');
    }
    res.page({ title: h.name, active: 'holds', body: SV.holdPage(h, d, req.user) });
  }));

  const allowedFolders = u => [...Records.foldersFor(u)].filter(k => C.FOLDERS[k] && k !== 'root' || (k === 'root' && (u.all || A.can(u, 'allrecords'))));
  r.get('/archives', need('archives'), wrap(async (req, res) => {
    const q = String(req.query.q || '').slice(0, 80);
    let rows = null;
    if (q) { const all = await Records.visible(req.user); rows = all && all.filter(x => [x['Record No'], x.Subject, x['Filed By'], x.Summary, x['Date (4E)'], x.Hold].join(' ').toLowerCase().includes(q.toLowerCase())).reverse(); }
    res.page({ title: 'Archives', active: 'archives', body: SV.archives(req.user, allowedFolders(req.user), q, rows) });
  }));
  r.get('/archives/:key', need('archives'), wrap(async (req, res) => {
    const key = req.params.key;
    if (!allowedFolders(req.user).includes(key)) return not(res, 'Chest closed', 'That chest is not open to your rank.');
    if (!G.connected()) return res.page({ title: C.FOLDER_NAMES[key], active: 'archives', body: SV.folderPage(key, null) });
    let folderId = C.FOLDERS[key], sub = null;
    if (req.query.sub) {
      const m = await G.fileMeta(String(req.query.sub)).catch(() => null);
      if (!m || !/folder/.test(m.mimeType) || !(m.parents || []).includes(folderId)) return not(res, 'No such chest');
      folderId = m.id; sub = m;
    }
    const files = await G.listFolder(folderId);
    res.page({ title: sub ? sub.name : C.FOLDER_NAMES[key], active: 'archives', body: SV.folderPage(key, files, sub) });
  }));

  async function fileAllowed(u, id) {
    if (!G.connected() || !/^[\w-]{10,}$/.test(id)) return null;
    const meta = await G.fileMeta(id).catch(() => null);
    if (!meta || meta.trashed) return null;
    const ids = new Set(allowedFolders(u).map(k => C.FOLDERS[k]));
    const parents = meta.parents || [];
    if (A.can(u, 'archives') && parents.some(p => ids.has(p))) return meta;
    const rows = await Records.allOrNull();
    const rec = rows && rows.find(x => Records.docId(x) === id);
    if (rec && Records.canSee(u, rec)) return meta;
    if (A.can(u, 'archives')) {
      for (const p of parents) {
        const pm = await G.fileMeta(p).catch(() => null);
        if (pm && (pm.parents || []).some(x => ids.has(x))) return meta;
      }
    }
    return null;
  }
  const kindOf = m => /image\//.test(m.mimeType) ? 'image' : (/pdf$/.test(m.mimeType) || /google-apps\.(document|spreadsheet|presentation|drawing)$/.test(m.mimeType)) ? 'pdf' : '';
  r.get('/files/:id', wrap(async (req, res) => {
    const meta = await fileAllowed(req.user, req.params.id);
    if (!meta) return not(res, 'No such document', 'No document your rank may read answers to that.');
    Activity.log(req.user, 'read a document', '', meta.name);
    res.page({ title: meta.name, active: 'archives', body: SV.filePage(meta, req.user, kindOf(meta), req.get('referer') && /\/staff\//.test(req.get('referer')) ? new URL(req.get('referer')).pathname + (new URL(req.get('referer')).search || '') : '/staff/archives') });
  }));
  r.get('/files/:id/content', wrap(async (req, res) => {
    const meta = await fileAllowed(req.user, req.params.id);
    if (!meta) return res.status(404).send('Not found');
    const out = await G.fileContent(meta);
    if (!out) return res.status(415).send('This kind of file cannot be shown.');
    res.set('Cache-Control', 'private, max-age=60').set('Content-Disposition', 'inline').type(out.mime).send(out.data);
  }));

  r.get('/correspondence', need('correspondence'), (req, res) => {
    res.page({ title: 'Ministry Requests', active: 'correspondence', body: SV.correspondence(Records.requests().slice().reverse(), req.session.csrf, U.list()) });
  });
  r.post('/correspondence/:id', need('correspondence'), checkCsrf, wrap(async (req, res) => {
    const act = req.body.act;
    const list = Records.requests();
    const q = list.find(x => x.id === req.params.id && x.status === 'Pending');
    if (!q) return res.redirect('/staff/correspondence');
    try {
      let released = [];
      if (act === 'release') {
        const wanted = splitNos(req.body.released);
        if (!wanted.length) throw new Error('Name the records to release.');
        released = await normalizeLinks(wanted);
        const bad = wanted.filter((_, i) => !released[i]);
        if (bad.length) throw new Error('No record upon the Docket answers to: ' + bad.join(', ') + '.');
      }
      S.update('requests.json', [], l => { const x = l.find(y => y.id === q.id); Object.assign(x, { status: act === 'release' ? 'Released' : 'Declined', released, note: clean(req.body.note, 600), answeredBy: req.user.name, answeredAt: new Date().toISOString() }); });
      if (q.corrNo) { try { await Records.setStatus(q.corrNo, 'Closed'); } catch (_) {} }
      Activity.log(req.user, act === 'release' ? 'released records to ' + q.ministry : 'declined a request from ' + q.ministry, q.corrNo || '', released.join(', '));
      req.session.flash = { text: act === 'release' ? 'Released. The requester can now read those records.' : 'The request is declined.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/staff/correspondence');
  }));

  r.get('/requests', need('request'), wrap(async (req, res) => {
    const u = req.user;
    const mine = Records.requests().filter(q => q.by === u.username).reverse();
    const g = Records.granted(u);
    const rows = await Records.allOrNull();
    res.page({ title: 'Request Records', active: 'requests', body: SV.requestsPage(u, mine, (rows || []).filter(x => g.has(x['Record No'])), req.session.csrf) });
  }));
  r.post('/requests', need('request'), checkCsrf, wrap(async (req, res) => {
    const u = req.user;
    const subject = clean(req.body.subject, 160), records = clean(req.body.records, 1500), purpose = clean(req.body.purpose, 1500);
    if (!subject || !records || !purpose) { req.session.flash = { err: true, text: 'Give the subject, the records sought and the purpose.' }; return res.redirect('/staff/requests'); }
    if (!A.rateLimit('req|' + u.username, 10, 60 * 60 * 1000)) { req.session.flash = { err: true, text: 'Too many requests this hour.' }; return res.redirect('/staff/requests'); }
    const ministry = u.ministry || u.title;
    const q = { id: S.id(), by: u.username, name: u.name, title: u.title, ministry, subject, records, purpose, at: new Date().toISOString(), status: 'Pending' };
    if (G.connected()) {
      try {
        const tp = Records.todayParts();
        const form = BY_KEY.correspondence;
        const parsed = Records.parseInput(form, { f: { direction: 'Received', sender: `${u.name}, ${u.title}`, recipient: 'Ministry of Civil and Administrative Affairs', 'origin-destination': ministry, subject: 'Request for records: ' + subject, summary: `Records sought:\n${records}\n\nPurpose:\n${purpose}`, action: 'Await', 'related-record': '' }, d: { 'date-of-letter': tp }, recordDate: tp, sig: ['', ''] });
        const row = await Records.file({ form, parsed, by: u, status: 'Received', noSeal: true });
        q.corrNo = row['Record No'];
      } catch (e) { console.error(e); }
    }
    S.update('requests.json', [], l => { l.push(q); });
    Activity.log(u, 'requested records', q.corrNo || '', subject);
    req.session.flash = { text: 'Your request is sent' + (q.corrNo ? ' and logged as ' + q.corrNo : '') + '.' };
    res.redirect('/staff/requests');
  }));

  r.get('/bulletin', need('bulletin'), (req, res) => {
    const posts = S.read('bulletin.json', []).sort((a, b) => (b.pinned - a.pinned) || b.at.localeCompare(a.at));
    res.page({ title: 'Bulletin', active: 'bulletin', body: SV.bulletin(posts, req.user, req.session.csrf) });
  });
  r.post('/bulletin', need('bulletin'), checkCsrf, (req, res) => {
    const title = clean(req.body.title, 120), body = clean(req.body.body, 3000);
    if (title && body) {
      S.update('bulletin.json', [], l => { l.push({ id: S.id(), by: req.user.username, name: req.user.name, title_of: req.user.title, title, body, at: new Date().toISOString(), pinned: false }); if (l.length > 200) l.splice(0, l.length - 200); });
      Activity.log(req.user, 'posted to the Bulletin', '', title);
    }
    res.redirect('/staff/bulletin');
  });
  r.post('/bulletin/:id/:act', need('bulletin'), checkCsrf, (req, res) => {
    const u = req.user, mod = u.all || A.can(u, 'approve');
    S.update('bulletin.json', [], l => {
      const i = l.findIndex(p => p.id === req.params.id); if (i < 0) return;
      if (req.params.act === 'pin' && mod) l[i].pinned = !l[i].pinned;
      if (req.params.act === 'delete' && (mod || l[i].by === u.username)) l.splice(i, 1);
    });
    res.redirect('/staff/bulletin');
  });

  r.get('/handover', need('handover'), (req, res) => {
    const u = req.user;
    const all = S.read('handover.json', []);
    const inbox = all.filter(n => n.to === 'user:' + u.username || n.to === 'rank:' + u.rank).reverse();
    const sent = all.filter(n => n.from === u.username).reverse();
    res.page({ title: 'Handover', active: 'handover', body: SV.handover(inbox, sent, U.list(), Ranks.all().filter(x => /Ministry|Office/.test(x.group)), u, req.session.csrf) });
  });
  r.post('/handover', need('handover'), checkCsrf, (req, res) => {
    const u = req.user;
    const to = String(req.body.to || '');
    let toLabel = '';
    if (to.startsWith('user:')) { const o = U.view(to.slice(5)); if (o) toLabel = o.name; }
    if (to.startsWith('rank:')) { const rk = Ranks.get(to.slice(5)); if (rk) toLabel = 'whoever holds ' + rk.name; }
    const subject = clean(req.body.subject, 140), body = clean(req.body.body, 5000);
    if (!toLabel || !subject || !body) { req.session.flash = { err: true, text: 'Choose who the note is for, and give it a subject and some words.' }; return res.redirect('/staff/handover'); }
    S.update('handover.json', [], l => { l.push({ id: S.id(), from: u.username, fromName: u.name, fromTitle: u.title, to, toLabel, subject, body, records: clean(req.body.records, 300), at: new Date().toISOString(), readBy: [] }); });
    Activity.log(u, 'left a handover note for ' + toLabel, '', subject);
    req.session.flash = { text: 'The note is left for ' + toLabel + '.' };
    res.redirect('/staff/handover');
  });
  r.post('/handover/:id/:act', need('handover'), checkCsrf, (req, res) => {
    const u = req.user;
    S.update('handover.json', [], l => {
      const i = l.findIndex(n => n.id === req.params.id); if (i < 0) return;
      const n = l[i];
      if (req.params.act === 'read' && (n.to === 'user:' + u.username || n.to === 'rank:' + u.rank)) n.readBy = [...new Set([...(n.readBy || []), u.username])];
      if (req.params.act === 'delete' && n.from === u.username) l.splice(i, 1);
    });
    res.redirect('/staff/handover');
  });

  r.get('/training', need('training'), (req, res) => {
    const me = U.view(req.user.username);
    const scores = req.user.all || A.can(req.user, 'officers') ? U.list().filter(o => o.active && /Ministry|Office/.test((Ranks.get(o.rank) || {}).group || '')) : null;
    res.page({ title: 'Training', active: 'training', body: SV.training(req.user, me && me.quiz, scores) });
  });
  r.get('/manual', need('training', 'clerk'), (req, res) => res.page({ title: 'Manuals', active: 'training', body: SV.manual(req.user) }));
  r.get('/quiz', need('training'), (req, res) => res.page({ title: 'Handbook Quiz', active: 'training', body: SV.quiz(QUIZ, req.session.csrf) }));
  r.post('/quiz', need('training'), checkCsrf, (req, res) => {
    const answers = QUIZ.map((_, i) => String(req.body['q' + i] ?? ''));
    const score = QUIZ.filter((q, i) => answers[i] === String(q.c)).length;
    const me = U.view(req.user.username);
    const result = { score, of: QUIZ.length, answers };
    if (!me.quiz || score >= me.quiz.score) U.update(req.user.username, { quiz: { score, of: QUIZ.length, at: new Date().toISOString() } });
    Activity.log(req.user, 'took the handbook quiz', '', `${score} of ${QUIZ.length}`);
    res.page({ title: 'Handbook Quiz', active: 'training', body: SV.quiz(QUIZ, req.session.csrf, result) });
  });

  r.get('/report', need('reports'), wrap(async (req, res) => {
    const rows = await Records.visible(req.user) || [];
    const since = Date.now() - 7 * 86400000;
    const week = rows.filter(x => Date.parse(x['Filed At (UTC)']) >= since);
    const tally = (list, key) => list.reduce((m, x) => { const k = typeof key === 'function' ? key(x) : x[key]; if (k) m[k] = (m[k] || 0) + 1; return m; }, {});
    const acts = Activity.recent({ since: new Date(since).toISOString(), limit: 5000 }).filter(a => a.who);
    const open = rows.filter(x => !Records.isClosed(x));
    const s = {
      todayText: res.locals.today.text, filed: week.length, petitions: week.filter(x => x.Class === 'Petition').length,
      closed: rows.filter(x => Date.parse(x['Closed At (UTC)']) >= since).length, open: open.length,
      awaiting: rows.filter(x => x.Status === 'Awaiting Seal').length, due: Records.dueForArchive(rows).length,
      byClass: tally(week, 'Class'), byHold: tally(week, x => x.Hold || 'No particular Hold'), byOfficer: tally(acts, 'name'),
      oldest: open.slice().sort((a, b) => String(a['Filed At (UTC)']).localeCompare(String(b['Filed At (UTC)']))).slice(0, 10), week: week.slice().reverse()
    };
    res.page({ title: 'Weekly Report', active: 'report', body: SV.report(s, req.user) });
  }));
  r.get('/activity', need('reports'), (req, res) => {
    const who = String(req.query.who || '');
    res.page({ title: 'Activity Log', active: 'report', body: SV.activity(Activity.recent({ who: who || undefined, limit: 400 }), U.list(), who) });
  });
  r.get('/archive-due', need('archive'), wrap(async (req, res) => {
    const rows = await Records.visible(req.user);
    res.page({ title: 'Due for the Archives', active: 'report', body: SV.archiveDue(rows && Records.dueForArchive(rows), Number(Settings.get().retentionDays) || 0, req.user, req.session.csrf) });
  }));

  r.get('/profile', (req, res) => res.page({ title: 'Profile', body: SV.profile(req.user, U.view(req.user.username), req.session.csrf) }));
  r.post('/profile', checkCsrf, (req, res) => {
    const u = req.user;
    try {
      const patch = { signetText: req.body.signetText || '', bio: req.body.bio || '' };
      if (req.body.clearImg === '1') { const cur = U.find(u.username); if (cur.signet && cur.signet.img) S.removeFile(cur.signet.img); patch.signetImg = ''; }
      if (req.body.signetImg) {
        const im = Settings.decodeImage(req.body.signetImg, 400000);
        const rel = `assets/signets/${u.username}.${im.type}`;
        const cur = U.find(u.username);
        if (cur.signet && cur.signet.img && cur.signet.img !== rel) S.removeFile(cur.signet.img);
        S.writeBinary(rel, im.data);
        patch.signetImg = rel;
      }
      U.update(u.username, patch);
      req.session.flash = { text: 'Your profile is saved.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/staff/profile');
  });
  r.get('/signet/:username', (req, res) => {
    const o = U.find(req.params.username);
    const im = o && o.signet && Settings.loadImage(o.signet.img);
    if (!im) return res.status(404).end();
    res.set('Cache-Control', 'no-cache').type(im.type === 'jpg' ? 'image/jpeg' : 'image/png').send(im.data);
  });

  app.use('/staff', r);
};
