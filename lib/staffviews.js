const C = require('./config');
const Ranks = require('./ranks');
const { FORMS, BY_KEY } = require('./forms');
const { SIT, DEPTS, ROUTES, HOLDS: MAP } = require('./content');
const { MONTHS, roman } = require('./skyrim');
const { esc, hidden, recUrl, can, statusChip, dateInput, holdSelect, holdNames } = require('./views');
const Settings = require('./settings');
const Users = require('./users');

const STATUSES = ['Received', 'Open', 'Under Review', 'Awaiting Seal', 'Returned', 'Referred', 'Revoked', 'Closed', 'Archived'];
const CLOSED = ['Closed', 'Archived', 'Revoked'];
const small = t => `<span class="small">${t}</span>`;
const ago = iso => { if (!iso) return ''; const d = Math.floor((Date.now() - Date.parse(iso)) / 86400000); return d <= 0 ? 'today' : d === 1 ? 'a day ago' : d + ' days ago'; };
const nameOf = (officers, un) => { const o = officers && officers.find(x => x.username === un); return o ? o.name : un; };
const meta = r => { try { return JSON.parse(r.Fields || '{}') || {}; } catch (_) { return {}; } };

function suggestList(kind) {
  try {
    if (kind === 'laws') return Settings.laws().map(l => (l.cite ? l.title + ' \u2014 ' + l.cite : l.title)).filter(Boolean);
    if (kind === 'officers') return Users.list().filter(o => o.active !== false).map(o => (o.rankName ? o.name + ', ' + o.rankName : o.name)).filter(Boolean);
  } catch (_) {}
  return [];
}
function dataListFor(domId, kind) {
  const items = suggestList(kind);
  if (!items.length) return { attr: '', el: '' };
  return { attr: ' list="' + domId + '" autocomplete="off"', el: '<datalist id="' + domId + '">' + items.map(o => '<option value="' + esc(o) + '"></option>').join('') + '</datalist>' };
}

function formsFor(u) {
  if (!can(u, 'file')) return [];
  const ids = new Set();
  DEPTS.filter(d => (u.depts || []).includes(d.id)).forEach(d => d.forms.forEach(k => ids.add(k)));
  if ((u.depts || []).includes('register')) ids.add('archive');
  return FORMS.filter(f => ids.has(f.key) && (!f.adminOnly || u.all));
}
const mayFile = (u, key) => formsFor(u).some(f => f.key === key);

function recordTable(rows, u, opts = {}) {
  if (!rows) return `<p class="notice">The Docket cannot be read until the Minister connects the Ministry archives to Google.</p>`;
  if (!rows.length) return `<p class="lede">${esc(opts.empty || 'Nothing is entered here.')}</p>`;
  return `<div class="tablewrap"><table class="ledger"><thead><tr><th>Record</th><th>Date (4E)</th><th>Subject</th>${opts.noFiler ? '' : '<th>Entered by</th>'}<th>State</th>${opts.assigned ? '<th>Assigned</th>' : ''}</tr></thead><tbody>
  ${rows.map(r => `<tr><td class="num"><a href="${recUrl(r['Record No'])}">${esc(r['Record No'])}</a></td><td>${esc(r['Date (4E)'])}</td><td><a class="plain" href="${recUrl(r['Record No'])}">${esc(r.Subject)}</a><br>${small(esc(r.Folder) + (r.Hold ? ' · ' + esc(r.Hold) : ''))}</td>${opts.noFiler ? '' : `<td>${esc(r['Filed By'])}</td>`}<td>${statusChip(r.Status)}${r.Public === 'Yes' ? ' <span class="chip ok">Public</span>' : ''}</td>${opts.assigned ? `<td>${r['Assigned To'] ? esc(nameOf(opts.officers, r['Assigned To'])) : small('—')}</td>` : ''}</tr>`).join('')}
  </tbody></table></div>`;
}

function desk(u, d) {
  const quick = [
    ['petition', 'Bring a Petition', 'A subject of the Empire seeks redress or aid.'],
    ['dispatch', 'Send a Dispatch', 'Report what was seen and heard in the Holds.'],
    ['correspondence', 'Log a Letter', 'A letter has come to, or goes forth from, the Ministry.'],
    ['license', 'Issue a License', 'Grant leave to a press or printing house.'],
    ['inquiry', 'Open an Inquiry', 'The Envoy to the Holds has ordered an inquiry.'],
    ['notice', 'Proclaim a Notice', 'Word to be cried in the Holds or posted on the board.'],
    ['appointment', 'Appoint an Officer', 'Commission a new officer into Imperial service.'],
    ['memorandum', 'Write a Memorandum', 'An instruction goes out in writing.']
  ].filter(([k]) => mayFile(u, k)).slice(0, 6);
  const panels = [];
  if (d.assigned) panels.push(`<div class="section-label">Laid Upon Your Desk</div>${recordTable(d.assigned, u, { empty: 'No record is assigned to you.' })}`);
  if (d.returned && d.returned.length) panels.push(`<div class="section-label">Returned to You for Correction</div>${recordTable(d.returned, u, { noFiler: true })}`);
  if (d.drafts && d.drafts.length) panels.push(`<div class="section-label">Your Unfinished Drafts</div><div class="tablewrap"><table class="ledger"><thead><tr><th>Writ</th><th>Begun</th><th></th></tr></thead><tbody>${d.drafts.map(x => `<tr><td><b>${esc(BY_KEY[x.form] ? BY_KEY[x.form].title : x.form)}</b>${x.label ? '<br>' + small(esc(x.label)) : ''}</td><td>${esc(ago(x.at))}</td><td><a class="btn small" href="/staff/forms/${esc(x.form)}?draft=${esc(x.id)}">Take it up again</a></td></tr>`).join('')}</tbody></table></div>`);
  if (d.requests) panels.push(`<div class="section-label">Your Requests for Records</div>${d.requests.length ? `<ul class="plainlist">${d.requests.map(q => `<li><b>${esc(q.subject)}</b> — ${statusChip(q.status)} ${small(esc(ago(q.at)))}</li>`).join('')}</ul>` : '<p class="lede">You have made no requests.</p>'}<div class="linkrow"><a class="btn" href="/staff/requests">Request records</a></div>`);
  return `<section>
  <h2>My Desk</h2>
  <p class="lede">Welcome, ${esc(u.name)}, ${esc(u.title)}${u.holds.length ? ' for ' + esc(holdNames(u.holds)) : ''}.</p>
  ${d.counts.length ? `<div class="tally">${d.counts.map(([n, l, h]) => `<a class="tal" href="${h}"><span class="tn">${n}</span><span class="tl">${esc(l)}</span></a>`).join('')}</div>` : ''}
  ${quick.length ? `<div class="section-label">Business of the Day</div><div class="actions">${quick.map(([k, t, dd]) => `<a class="act" href="/staff/forms/${k}"><span class="t">${t}</span><span class="d">${dd}</span><span class="n">${esc(BY_KEY[k].num)}</span></a>`).join('')}</div>` : ''}
  ${panels.join('')}
  ${d.bulletin && d.bulletin.length ? `<div class="section-label">From the Bulletin</div><div class="board">${d.bulletin.map(b => `<article class="post${b.pinned ? ' pinned' : ''}"><div class="no">${esc(b.name)} · ${esc(ago(b.at))}${b.pinned ? ' · Pinned' : ''}</div><h3>${esc(b.title)}</h3><div class="body">${esc(b.body)}</div></article>`).join('')}</div><div class="linkrow"><a class="btn ghost" href="/staff/bulletin">The whole Bulletin</a></div>` : ''}
  ${d.recent ? `<div class="section-label">Latest Upon the Docket</div>${recordTable(d.recent, u)}` : ''}
</section>`;
}

function clerk(u, q, sel) {
  const ql = (q || '').toLowerCase().trim();
  const list = SIT.map((s, i) => ({ s, i })).filter(({ s }) => !ql || (s.t + ' ' + s.cat + ' ' + (s.form ? BY_KEY[s.form].title : '')).toLowerCase().includes(ql));
  const s = SIT[sel] || SIT[0];
  const f = s.form ? BY_KEY[s.form] : null;
  const also = (s.also || []).map(k => `<a href="/staff/forms/${k}">${esc(BY_KEY[k].title)}</a>`).join(' · ');
  return `<section>
  <h2>Clerk Desk</h2>
  <p class="lede">The clerk's ledger of common business. Find what the one before you seeks, and the ledger names the writ to use, the order of its keeping, and the officer who answers for it.</p>
  <div class="clerk">
    <div class="finder">
      <form method="get" action="/staff/clerk"><label for="q" class="eyebrow" style="display:block;margin-bottom:6px">What business brings them here?</label>
      <input id="q" name="q" type="search" value="${esc(q || '')}" placeholder="e.g. complaint, license, forged, letter" autocomplete="off"></form>
      <ul class="sitlist">${list.length ? list.map(({ s: x, i }) => `<li><a href="/staff/clerk?s=${i}${q ? '&q=' + encodeURIComponent(q) : ''}"${i === sel ? ' class="on"' : ''}><span class="cat">${esc(x.cat)}</span>${esc(x.t)}</a></li>`).join('') : `<li class="empty">No such business is written in the ledger. Try another word, or consult the Manuals.</li>`}</ul>
    </div>
    <article class="card">
      <div class="eyebrow">${esc(s.cat)}</div>
      <h3 style="font-size:24px;margin-top:4px">${esc(s.t)}</h3>
      <div class="inst"><span>Use: <b>${f ? esc(f.title) : '—'}</b></span>${f ? `<span class="chip">${esc(f.num)} I, II, III…</span>` : ''}</div>
      <ol class="steps">${s.steps.map(([a, b]) => `<li><span>${esc(a)}${b ? `<span class="sub">${esc(b)}</span>` : ''}</span></li>`).join('')}</ol>
      ${s.caution ? `<p class="notice" style="margin:16px 0 0"><b>Take care.</b> ${esc(s.caution)}</p>` : ''}
      <dl class="meta"><dt>Handled by</dt><dd>${esc(s.handler)}</dd>${f ? `<dt>Filed under</dt><dd>${esc(C.FOLDER_NAMES[f.folder])}</dd>` : ''}${also ? `<dt>Related</dt><dd>${also}</dd>` : ''}</dl>
      <div class="linkrow">${f && mayFile(u, f.key) ? `<a class="btn big" href="/staff/forms/${f.key}">Fill in the ${esc(f.title)}</a>` : f ? `<span class="chip">Filed by another office</span>` : ''}</div>
    </article>
  </div></section>`;
}

function formCard(f) {
  return `<div class="inst-card"><span class="num">${esc(f.num)}</span><span class="nm">${esc(f.title)}</span><p>${esc(f.subtitle)}.</p><p class="small">Filed under ${esc(C.FOLDER_NAMES[f.folder])}</p><div class="linkrow"><a class="btn" href="/staff/forms/${f.key}">Fill in</a></div></div>`;
}
function formsIndex(u) {
  const mine = new Set(formsFor(u).map(f => f.key));
  const groups = DEPTS.filter(d => (u.depts || []).includes(d.id)).map(d => [d.title, d.forms.filter(k => mine.has(k))]).filter(g => g[1].length);
  if (mine.has('archive')) groups.push(['Registry & Archives', ['archive']]);
  return `<section><h2>Writs &amp; Forms</h2><p class="lede">The instruments of your offices. When sealed, each is written in the Ministry's hand, numbered upon the Docket, and laid in its proper chest.${can(u, 'selfseal') ? '' : ' Your writs go to the Approval Queue for an officer’s seal before they stand.'}</p>
  ${groups.length ? groups.map(([t, keys]) => `<div class="section-label">${esc(t)}</div><div class="inst-grid">${keys.map(k => formCard(BY_KEY[k])).join('')}</div>`).join('') : '<p class="lede">No writs belong to your rank.</p>'}</section>`;
}

const CHECKLIST = [
  'Names, titles and offices are written as the rolls have them',
  'The Hold, the dates and every record number are right',
  'This lies within the Ministry’s authority, or it is being referred',
  'Every signature and seal it needs is given, or will be sought'
];

function prefill(f, u) {
  const out = { f: {}, sig: [] };
  const me = `${u.name}, ${u.title}`;
  const SELF = ['Delegate', 'Ministry Officer', 'Reviewing Officer', 'Examining Officer', 'Issued By', 'From', 'Recorder', 'Assigned Officer', 'Processing Officer', 'Issuing Authority'];
  f.sections.forEach(s => s.kv && s.kv.forEach(fl => {
    if (fl.type !== 'text') return;
    if (SELF.includes(fl.label)) out.f[fl.id] = me;
    if (fl.label === 'Assigned Holds / Route' && u.holds.length) out.f[fl.id] = holdNames(u.holds);
    if (fl.label === 'Assigned Adjudicator' && u.rank === 'adjudicator') out.f[fl.id] = me;
  }));
  const rn = String(u.rankName || '').toLowerCase();
  const FILER = ['Receiving Officer', 'Recording Clerk', 'Opening Clerk', 'Examining Officer', 'Reviewing Officer', 'Referring Officer', 'Release Officer', 'Archive Clerk', 'Processing Officer', 'Recorder', 'Author', 'Issuing Officer', 'Registry Secretary', 'Custodian'];
  let i = f.sig.findIndex(r => { const x = r.toLowerCase(); return rn.startsWith(x) || x.startsWith(rn) || (u.all && x.includes('minister')); });
  if (i < 0) i = f.sig.findIndex(r => FILER.includes(r));
  if (i >= 0) out.sig[i] = me;
  return out;
}

function formPage(f, u, csrf, prev, opts = {}) {
  const edit = opts.mode === 'edit';
  const v = prev || prefill(f, u);
  const val = (group, id) => (v[group] && v[group][id]) || '';
  let n = 0;
  const secs = f.sections.map(s => {
    const rn = roman(++n);
    let inner = '';
    if (s.note) inner += `<p class="hint">${esc(s.note)}</p>`;
    if (s.kv) inner += s.kv.map(fl => {
      const id = 'f_' + fl.id;
      const lab = `${esc(fl.label)}${fl.required ? ' <span class="req">*</span>' : ''}`;
      if (fl.type === 'fixed') return `<div class="field"><span class="l">${lab}</span><div class="fixed">${esc(fl.value)}</div></div>`;
      if (fl.type === 'options') return `<div class="field"><span class="l">${lab}</span><div class="opts" role="radiogroup" aria-label="${esc(fl.label)}">${fl.options.map(o => `<label><input type="radio" name="f[${fl.id}]" value="${esc(o)}"${val('f', fl.id) === o ? ' checked' : ''}> ${esc(o)}</label>`).join('')}</div></div>`;
      if (fl.type === 'date') return `<div class="field"><span class="l">${lab}</span>${dateInput('d[' + fl.id + ']', fl.required, v.d && v.d[fl.id])}</div>`;
      const dl = fl.list ? dataListFor('dl_' + fl.id, fl.list) : { attr: '', el: '' };
      return `<div class="field"><label class="l" for="${id}">${lab}</label><input type="text" id="${id}" name="f[${fl.id}]" value="${esc(val('f', fl.id))}"${fl.required ? ' required' : ''} maxlength="300"${dl.attr}>${dl.el}</div>`;
    }).join('');
    if (s.lines) inner += `<textarea name="f[${s.id}]" aria-label="${esc(s.h)}" rows="${s.lines + 1}" maxlength="6000">${esc(val('f', s.id))}</textarea>`;
    if (s.grid) {
      const have = (v.g && v.g[s.id]) || [];
      const count = Math.max(s.rows || 5, have.filter(r => r && r.some(Boolean)).length);
      const rows = [];
      for (let i = 0; i < count; i++) rows.push(`<tr>${s.grid.map((h, j) => `<td><input type="text" name="g[${s.id}][${i}][${j}]" aria-label="${esc(h)} row ${i + 1}" value="${esc(have[i] && have[i][j] || '')}" maxlength="300"></td>`).join('')}</tr>`);
      inner += `<div class="tablewrap" style="border:0"><table class="gridin"><thead><tr>${s.grid.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
    }
    if (s.after) inner += `<p class="hint" style="color:var(--blood)">${esc(s.after)}</p>`;
    return `<fieldset><legend><span class="rn">${rn}.</span> ${esc(s.h)}</legend>${inner}</fieldset>`;
  }).join('');
  const sigs = f.sig.map((role, i) => {
    const dl = dataListFor('dl_sig' + i, 'officers');
    return `<div class="field"><label class="l" for="sig${i}">${esc(role)}</label><input type="text" id="sig${i}" name="sig[${i}]" value="${esc(v.sig && v.sig[i] || '')}" placeholder="Start typing an officer's name" maxlength="160"${dl.attr}>${dl.el}</div>`;
  }).join('');
  const canPublic = f.publicCapable && can(u, 'publish') && !edit;
  const hold = opts.hold !== undefined ? opts.hold : (u.holds[0] || '');
  const checks = opts.checks || {};
  const action = edit ? `${recUrl(opts.recordNo)}/edit` : `/staff/forms/${f.key}`;
  return `<section>
  <p style="margin:0 0 10px"><a href="${edit ? recUrl(opts.recordNo) : '/staff/forms'}">← ${edit ? 'Back to ' + esc(opts.recordNo) : 'All writs &amp; forms'}</a></p>
  <h2>${edit ? 'Amend ' + esc(opts.recordNo) : esc(f.title)}</h2>
  <p class="lede">${edit ? 'Change what must be changed and reseal. The old document is set aside in the Drive’s bin and a fresh one takes its place under the same number.' : `${esc(f.subtitle)}. When sealed, this becomes ${esc(f.num)} (next number) in ${esc(C.FOLDER_NAMES[f.folder])}.`}</p>
  <form class="writ" method="post" action="${action}" id="writ">
    ${hidden(csrf)}${opts.draftId ? `<input type="hidden" name="draftId" value="${esc(opts.draftId)}">` : ''}
    ${f.banner ? `<p class="notice"><b>${esc(f.banner)}</b></p>` : ''}
    <p class="preamble">${esc(f.preamble)}</p>
    <fieldset><legend><span class="rn">✦</span> Date and Place of Record</legend>
      <div class="field"><span class="l">Entered on <span class="req">*</span></span>${dateInput('recordDate', true, v.recordDate || opts.today)}</div>
      <div class="field"><label class="l" for="hold">Hold concerned</label>${holdSelect('hold', hold, 'No particular Hold', 'hold')}</div>
      ${edit ? '' : `<div class="field"><label class="l" for="linked">Linked to record(s)</label><input type="text" id="linked" name="linked" value="${esc(opts.linked || '')}" placeholder="Start typing a record no. or subject" maxlength="300" data-rec-suggest="multi"></div>`}
    </fieldset>
    ${secs}
    <fieldset><legend><span class="rn">✦</span> Certification</legend><p class="hint">Type a name to sign now, or leave blank to sign the finished document by hand.</p>${sigs}</fieldset>
    <fieldset class="checklist"><legend><span class="rn">✦</span> Before Sealing</legend><p class="hint">The seal never cures an error. Confirm each of these.</p>
      ${CHECKLIST.map((t, i) => `<label class="checkline"><input type="checkbox" name="check[${i}]" value="1"${checks[i] ? ' checked' : ''}> ${esc(t)}</label>`).join('')}
    </fieldset>
    <div class="submitbar">
      <button class="btn big" type="submit" name="act" value="seal">${edit ? 'Reseal the record' : can(u, 'selfseal') ? 'Seal &amp; File' : 'File for Approval'}</button>
      ${edit ? '' : `<button class="btn ghost" type="submit" name="act" value="draft" formnovalidate>Keep as draft</button>`}
      ${edit || !can(u, 'training') ? '' : `<button class="btn ghost" type="submit" name="act" value="practice" formnovalidate>Practice — show me the writ</button>`}
      ${canPublic ? `<label class="checkline"><input type="checkbox" name="public" value="1"${v.public ? ' checked' : ''}> Post on the public Notice Board</label>` : ''}
      <span class="hint" style="margin:0">Fields marked <span class="req">*</span> are required.</span>
    </div>
  </form>
  <script>document.getElementById('writ').addEventListener('submit',function(e){var b=e.submitter;if(!b||b.value!=='seal')return;var boxes=this.querySelectorAll('.checklist input[type=checkbox]');for(var i=0;i<boxes.length;i++){if(!boxes[i].checked){e.preventDefault();boxes[i].focus();boxes[i].closest('fieldset').classList.add('warn');return;}}});</script>
  </section>`;
}

function practice(f, html, key) {
  return `<section><p style="margin:0 0 10px"><a href="javascript:history.back()">← Back to the writ</a></p>
  <h2>Practice Writ</h2><p class="lede">This is how your ${esc(f.title)} would read. Nothing was numbered, filed or sent to the Archives.</p>
  <p class="notice"><b>Practice copy.</b> Go back to change it, then seal it for real when it is right.</p>
  ${html}
  <div class="linkrow"><a class="btn" href="javascript:history.back()">Back to the writ</a><a class="btn ghost" href="/staff/forms/${esc(key)}">Start fresh</a></div></section>`;
}

function filed(entry, u) {
  const awaiting = entry.Status === 'Awaiting Seal';
  return `<section><div class="card" style="max-width:760px">
  <div class="eyebrow">${awaiting ? 'Filed — awaiting an officer’s seal' : 'Sealed &amp; Filed'}</div>
  <h2 style="margin-top:6px">${esc(entry['Record No'])}</h2>
  <p class="lede" style="margin-bottom:10px">${esc(entry.Subject)}</p>
  <dl class="meta"><dt>Dated</dt><dd>${esc(entry['Date (4E)'])}</dd><dt>Laid in</dt><dd>${esc(entry.Folder)}</dd><dt>Entered by</dt><dd>${esc(entry['Filed By'])}</dd><dt>State</dt><dd>${statusChip(entry.Status)}</dd>${entry.Hold ? `<dt>Hold</dt><dd>${esc(entry.Hold)}</dd>` : ''}${entry.Linked ? `<dt>Linked</dt><dd>${esc(entry.Linked)}</dd>` : ''}</dl>
  ${awaiting ? '<p class="hint" style="margin-top:12px">It stands in the Approval Queue. When sealed, the wax seal is set upon it.</p>' : ''}
  <div class="linkrow"><a class="btn" href="${recUrl(entry['Record No'])}">Read the record</a><a class="btn ghost" href="/staff/forms/${esc(entry.Form)}">File another</a></div>
  </div></section>`;
}

function docketPage(rows, u, q, f, classes, officers) {
  const sel = (name, opts, value, label) => `<select name="${name}" aria-label="${label}" class="sel"><option value="">${label}</option>${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
  return `<section><h2>The Docket</h2><p class="lede">Every writ upon the rolls that your rank may read, newest first. Open a record to read it, set its state, assign it or link it.</p>
  <form class="filters" method="get" action="/staff/docket">
    <input type="search" name="q" value="${esc(q || '')}" placeholder="Search record, subject, officer or Hold" aria-label="Search the Docket">
    ${sel('class', classes, f.cls, 'All classes')}
    ${sel('status', STATUSES, f.status, 'Any state')}
    ${sel('hold', Ranks.HOLDS.map(h => h.name), f.hold, 'Any Hold')}
    ${sel('who', [['me', 'Assigned to me'], ['none', 'Unassigned']], f.who, 'Anyone')}
    <button class="btn" type="submit">Search</button>${q || f.cls || f.status || f.hold || f.who ? '<a class="btn ghost" href="/staff/docket">Clear</a>' : ''}
  </form>
  ${recordTable(rows, u, { assigned: true, officers })}</section>`;
}

function offices(u) {
  const list = DEPTS.filter(d => (u.depts || []).includes(d.id));
  return `<section><h2>Offices of the Ministry</h2><p class="lede">The offices your rank serves in.</p>
  ${list.length ? `<div class="actions">${list.map(d => `<a class="act" href="/staff/office/${d.id}"><span class="t">${esc(d.title)}</span><span class="d">${esc(d.lede)}</span><span class="n">${d.forms.length} writ${d.forms.length === 1 ? '' : 's'}</span></a>`).join('')}</div>` : '<p class="lede">Your rank serves in no office of this Ministry.</p>'}</section>`;
}
function office(d, u, rows) {
  const sits = SIT.map((s, i) => ({ s, i })).filter(({ s }) => s.form && d.forms.includes(s.form));
  const forms = d.forms.filter(k => mayFile(u, k));
  return `<section><div class="dept-head"><div><h2>${esc(d.title)}</h2><p class="lede" style="margin:0">${esc(d.lede)}</p></div>
  ${can(u, 'archives') ? `<div class="linkrow" style="margin:0">${d.folders.map((f, j) => `<a class="btn${j ? ' ghost' : ''}" href="/staff/archives/${f}">${esc(C.FOLDER_NAMES[f])}</a>`).join('')}</div>` : ''}</div>
  ${forms.length ? `<div class="section-label">Instruments</div><div class="inst-grid">${forms.map(k => formCard(BY_KEY[k])).join('')}</div>` : ''}
  ${rows ? `<div class="section-label">Open Business of this Office</div>${recordTable(rows, u, { empty: 'Nothing is open in this office.' })}` : ''}
  ${sits.length ? `<div class="section-label">Common Business</div><div class="panel"><ul>${sits.map(({ s, i }) => `<li><a href="/staff/clerk?s=${i}">${esc(s.t)}</a></li>`).join('')}</ul></div>` : ''}
  ${d.people ? `<div class="section-label">Officers</div><div class="panel"><ul>${d.people.map(([a, b]) => `<li><b>${esc(a)}</b> — ${esc(b)}</li>`).join('')}</ul></div>` : ''}
  </section>`;
}

function viewer(src, name, u, kind) {
  const pic = can(u, 'picture');
  if (kind === 'image') return `<div class="viewer-bar">${pic ? `<a class="btn" href="${esc(src)}" download="${esc(name)}">Save the picture</a>` : ''}</div><div class="viewer"><img class="vpage" src="${esc(src)}" alt="${esc(name)}"></div>`;
  return `<div class="viewer-bar">${pic ? `<button class="btn" type="button" data-picture="all" disabled>Save as picture</button><button class="btn ghost" type="button" data-picture="first" disabled>First page only</button>` : ''}<button class="btn ghost" type="button" data-print disabled>Print</button></div>
  <div class="viewer" id="viewer" data-src="${esc(src)}" data-name="${esc(name)}"><p class="vstatus">Unrolling the document…</p></div>
  <script src="/vendor/pdf.min.js"></script><script src="/viewer.js"></script>`;
}

function countersignBlock(r, ctx, url) {
  const { u, csrf, countersigns = [], baseUrl = '' } = ctx;
  const form = BY_KEY[r.Form];
  if (!form || !can(u, 'status')) return '';
  const open = countersigns.filter(c => c.status === 'Sent');
  const past = countersigns.filter(c => c.status !== 'Sent');
  const roles = (form.sig || []).map((role, i) => `<option value="${i}">${esc(role)}</option>`).join('');
  const link = c => `${baseUrl}/sign/${c.token}`;
  return `<div class="section-label">Awaiting a Hand</div>
  ${open.length ? `<ul class="plainlist">${open.map(c => `<li class="csrow">
    <div><b>${esc(c.toName)}</b> ${small('as ' + esc(c.role || 'signatory') + ' · sent ' + esc(ago(c.at)))}</div>
    <div class="cslink"><input type="text" readonly value="${esc(link(c))}" aria-label="Private signing link" onfocus="this.select()"><span class="hint">Copy this and send it to them. Whoever holds it may sign once.</span></div>
    <form method="post" action="/staff/countersign/${esc(c.id)}/withdraw" class="inline">${hidden(csrf)}<button class="btn small ghost" type="submit">Withdraw</button></form>
  </li>`).join('')}</ul>` : '<p class="hint">No one has been asked to set their hand to this record.</p>'}
  <form method="post" action="${url}/countersign" class="csform">${hidden(csrf)}
    <p class="hint">This makes a private link for someone outside the Ministry. Officers of the Ministry sign from their own desk and need no link.</p>
    <div class="csgrid">
      <label class="csf"><span>Who must set their hand to it <span class="req">*</span></span><input type="text" name="toName" required maxlength="120" placeholder="e.g. Rhorlak gro-Shul, Appointee"></label>
      <label class="csf"><span>They sign as</span><select name="sigIndex">${roles}</select></label>
      <label class="csf csf-wide"><span>A word to them</span><input type="text" name="note" maxlength="600" placeholder="Optional — shown above the document"></label>
    </div>
    <div class="linkrow"><button class="btn small" type="submit">Make a signing link</button></div>
  </form>
  ${past.length ? `<details class="csdone"><summary>${past.length} earlier request${past.length === 1 ? '' : 's'}</summary><ul class="plainlist">${past.map(c => `<li>${esc(c.toName)} — <b>${esc(c.status)}</b>${c.signedName ? ' as ' + esc(c.signedName) : ''} ${small(esc(ago(c.doneAt || c.at)))}${c.reply ? `<br>${small(esc(c.reply))}` : ''}</li>`).join('')}</ul></details>` : ''}`;
}

function recordPage(r, ctx) {
  const { u, csrf, officers, linked, history, docSrc, m } = ctx;
  const no = r['Record No'];
  const url = recUrl(no);
  const post = (path, inner, label, cls = '') => `<form method="post" action="${url}/${path}" class="inline">${hidden(csrf)}${inner}<button class="btn small ${cls}" type="submit">${label}</button></form>`;
  const staffOfficers = officers.filter(o => o.active && Ranks.isStaff({ perms: (Ranks.get(o.rank) || {}).perms, all: (Ranks.get(o.rank) || {}).all }) && ((Ranks.get(o.rank) || {}).group || '').match(/Ministry|Office/));
  const acts = [];
  if (r.Status === 'Awaiting Seal' && can(u, 'approve')) acts.push(`<div class="actbox approve"><h3>Awaiting Your Seal</h3><p class="hint">Sealing sets the wax seal upon the document${u.all ? ' — your own seal, if you have given one in the Study' : ''}.</p><div class="linkrow">${post('approve', '', 'Approve &amp; seal')}</div><form method="post" action="${url}/return" class="stack">${hidden(csrf)}<label class="l" for="rn">Or send it back with a note</label><input type="text" id="rn" name="note" maxlength="600" placeholder="What must be corrected" required><button class="btn small ghost" type="submit">Return for correction</button></form></div>`);
  if (r.Status === 'Returned' && m.returnNote) acts.push(`<p class="notice"><b>Returned by ${esc(m.returnNote.by)}:</b> ${esc(m.returnNote.note)}</p>`);
  const mine = m.filer === u.username;
  const canEdit = m.input && !m.tooLong && (can(u, 'edit') || (mine && r.Status === 'Returned'));
  const side = [];
  if (can(u, 'status')) {
    side.push(`<form method="post" action="${url}/status" class="stack">${hidden(csrf)}<label class="l" for="st">State</label><select id="st" name="status" class="sel">${STATUSES.filter(s => s !== 'Awaiting Seal' || r.Status === 'Awaiting Seal').map(s => `<option${s === r.Status ? ' selected' : ''}>${s}</option>`).join('')}</select><button class="btn small" type="submit">Set state</button></form>`);
    side.push(`<form method="post" action="${url}/assign" class="stack">${hidden(csrf)}<label class="l" for="as">Assigned to</label><select id="as" name="username" class="sel"><option value="">No one</option>${staffOfficers.map(o => `<option value="${esc(o.username)}"${o.username === r['Assigned To'] ? ' selected' : ''}>${esc(o.name)} — ${esc(o.rankName)}</option>`).join('')}</select><button class="btn small" type="submit">Assign</button></form>`);
    side.push(`<form method="post" action="${url}/hold" class="stack">${hidden(csrf)}<label class="l" for="hd">Hold</label>${holdSelect('hold', r.Hold, 'No particular Hold', 'hd')}<button class="btn small" type="submit">Set Hold</button></form>`);
  } else {
    side.push(`<dl class="meta"><dt>State</dt><dd>${statusChip(r.Status)}</dd><dt>Assigned</dt><dd>${r['Assigned To'] ? esc(nameOf(officers, r['Assigned To'])) : '—'}</dd></dl>`);
  }
  if (can(u, 'publish')) side.push(`<form method="post" action="${url}/public" class="stack">${hidden(csrf)}<input type="hidden" name="value" value="${r.Public === 'Yes' ? 'No' : 'Yes'}"><span class="l">Notice Board</span><button class="btn small${r.Public === 'Yes' ? '' : ' ghost'}" type="submit">${r.Public === 'Yes' ? 'Posted — withdraw it' : 'Post publicly'}</button></form>`);
  const tools = [];
  if (canEdit) tools.push(`<a class="btn small" href="${url}/edit">Amend the record</a>`);
  if (mine && r.Status === 'Returned') tools.push(post('resubmit', '', 'Send again for approval', 'ghost'));
  const follow = formsFor(u);
  if (follow.length) tools.push(`<form method="get" action="/staff/forms/go" class="inline"><input type="hidden" name="link" value="${esc(no)}"><select name="key" aria-label="Follow-up writ" class="sel">${follow.map(f => `<option value="${f.key}">${esc(f.title)}</option>`).join('')}</select><button class="btn small ghost" type="submit">File a follow-up writ</button></form>`);
  if (r.Form === 'notice' || r.Form === 'directive') tools.push(`<a class="btn small ghost" href="/proclamation/${encodeURIComponent(no)}">Printable proclamation</a>`);
  if (can(u, 'archive') && r.Status === 'Closed') tools.push(post('catalogue', '', 'Catalogue for the Archives', 'ghost'));
  if (can(u, 'delete')) tools.push(`<details class="danger"><summary class="btn small ghost">Strike from the rolls</summary><div class="actbox"><p>This removes ${esc(no)} from the Docket and moves its document to the Drive’s bin, where it can be recovered for thirty days. The number is not given out again.</p>${post('delete', '<input type="hidden" name="confirm" value="' + esc(no) + '">', 'Strike ' + esc(no))}</div></details>`);
  const inp = (m.input && m.input.f) || {};
  const form = BY_KEY[r.Form];
  const particularItems = [];
  if (form) form.sections.forEach(s => { if (s.kv) s.kv.forEach(f => { if (f.type !== 'fixed' && inp[f.id]) particularItems.push([f.label, inp[f.id]]); }); });
  const petitionFacts = r.Form === 'petition'
    ? `<dl class="meta"><dt>Petitioner</dt><dd>${esc(inp.name || r.Subject)}</dd>${inp['where-the-petitioner-may-be-found'] ? `<dt>Found at</dt><dd>${esc(inp['where-the-petitioner-may-be-found'])}</dd>` : ''}${inp.nature ? `<dt>Nature</dt><dd>${esc(inp.nature)}</dd>` : ''}${inp['means-of-reply'] ? `<dt>Reply by</dt><dd>${esc(inp['means-of-reply'])}</dd>` : ''}<dt>Came by</dt><dd>${m.publicBox ? 'The Petition Box' : 'An officer of the Ministry'}</dd></dl>`
    : particularItems.length ? `<div class="section-label" style="margin-top:14px">Particulars</div><dl class="meta">${particularItems.slice(0, 10).map(([l, v]) => `<dt>${esc(l)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : '';
  return `<section class="record">
  <p style="margin:0 0 10px"><a href="/staff/docket">← The Docket</a></p>
  <div class="rec-head"><div><div class="eyebrow">${esc(r.Folder)}${r.Hold ? ' · ' + esc(r.Hold) : ''}</div><h2>${esc(no)}</h2><p class="lede" style="margin:0">${esc(r.Subject)}</p></div><div>${statusChip(r.Status)}${r.Public === 'Yes' ? ' <span class="chip ok">On the Notice Board</span>' : ''}</div></div>
  ${acts.join('')}
  <div class="rec-grid">
    <div>
      <dl class="meta"><dt>Dated</dt><dd>${esc(r['Date (4E)'])}</dd><dt>Entered by</dt><dd>${esc(r['Filed By'])}</dd>${r['Sealed By'] ? `<dt>Sealed by</dt><dd>${esc(r['Sealed By'])}</dd>` : ''}${r.Summary ? `<dt>In brief</dt><dd class="pre">${esc(r.Summary.slice(0, 600))}${r.Summary.length > 600 ? '…' : ''}</dd>` : ''}</dl>
      ${petitionFacts}
      ${tools.length ? `<div class="linkrow">${tools.join('')}</div>` : ''}
    </div>
    <aside class="rec-side">${side.join('')}</aside>
  </div>
  <div class="section-label">Linked Records</div>
  ${linked.length ? `<ul class="plainlist">${linked.map(l => `<li>${l.row ? `<a href="${recUrl(l.no)}">${esc(l.no)}</a> — ${esc(l.row.Subject)} ${statusChip(l.row.Status)}` : `${esc(l.no)} ${small('(not upon the Docket)')}`}${can(u, 'status') ? ` ${post('unlink', `<input type="hidden" name="other" value="${esc(l.no)}">`, 'Unlink', 'ghost')}` : ''}</li>`).join('')}</ul>` : '<p class="hint">No record is linked to this one.</p>'}
  ${countersignBlock(r, ctx, url)}
  ${can(u, 'status') ? `<form method="post" action="${url}/link" class="inline-form">${hidden(csrf)}<input type="text" name="other" placeholder="Start typing a record no. or subject" aria-label="Record to link" maxlength="80" required data-rec-suggest="one"><button class="btn small ghost" type="submit">Link a record</button></form>` : ''}
  <div class="section-label">The Document</div>
  ${docSrc ? viewer(docSrc, no, u) : '<p class="notice">This record has no document the hall can read.</p>'}
  <div class="section-label">History</div>
  ${history.length ? `<ul class="plainlist history">${history.map(h => `<li><span class="small">${esc(h.at.slice(0, 16).replace('T', ' '))} UTC</span> — <b>${esc(h.name)}</b> ${esc(h.action)}${h.detail ? ': ' + esc(h.detail) : ''}</li>`).join('')}</ul>` : '<p class="hint">No history is kept for this record yet.</p>'}
  </section>`;
}

function approvals(rows, u) {
  return `<section><h2>Approval Queue</h2><p class="lede">Writs filed by officers who may not seal their own. Read each, then approve and seal it, or return it with a note.</p>
  ${recordTable(rows, u, { empty: 'Nothing awaits a seal.' })}</section>`;
}

function petitions(rows, u, f, officers, csrf) {
  const natures = ['Grievance', 'Request', 'Request for Records', 'License Application', 'Audience with an Officer', 'Public Information', 'Publication', 'Ministry Conduct', 'Other'];
  const sel = (name, opts, value, label) => `<select name="${name}" aria-label="${label}" class="sel"><option value="">${label}</option>${opts.map(o => `<option${o === value ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  const body = !rows ? `<p class="notice">The Docket cannot be read until the Minister connects the Ministry archives to Google.</p>` : !rows.length ? '<p class="lede">No petition answers to that.</p>' : `<div class="tablewrap"><table class="ledger"><thead><tr><th>Petition</th><th>Petitioner</th><th>Nature</th><th>Hold</th><th>State</th><th>Assigned</th></tr></thead><tbody>
  ${rows.map(r => { const i = (meta(r).input || {}).f || {}; return `<tr><td class="num"><a href="${recUrl(r['Record No'])}">${esc(r['Record No'])}</a><br>${small(esc(ago(r['Filed At (UTC)'])))}</td><td><a class="plain" href="${recUrl(r['Record No'])}">${esc(r.Subject)}</a>${meta(r).publicBox ? '<br>' + small('Petition Box') : ''}</td><td>${esc(i.nature || '—')}</td><td>${esc(r.Hold || '—')}</td><td>${can(u, 'status') ? `<form method="post" action="${recUrl(r['Record No'])}/status">${hidden(csrf)}<input type="hidden" name="back" value="/staff/petitions"><select name="status" class="sel" aria-label="State" onchange="this.form.submit()">${['Received', 'Under Review', 'Referred', 'Closed'].concat(['Received', 'Under Review', 'Referred', 'Closed'].includes(r.Status) ? [] : [r.Status]).map(s => `<option${s === r.Status ? ' selected' : ''}>${s}</option>`).join('')}</select><noscript><button class="btn small">Set</button></noscript></form>` : statusChip(r.Status)}</td><td>${r['Assigned To'] ? esc(nameOf(officers, r['Assigned To'])) : small('—')}</td></tr>`; }).join('')}
  </tbody></table></div>`;
  return `<section><h2>The Petition Box</h2><p class="lede">Petitions from the people, whether dropped in the Box on the public side or taken down by an officer. The petitioner may ask after the state of their petition by its number and sees only its state.</p>
  <form class="filters" method="get" action="/staff/petitions">
    ${sel('status', ['Received', 'Under Review', 'Referred', 'Closed', 'Open', 'Awaiting Seal', 'Archived'], f.status, 'Any state')}
    ${sel('hold', Ranks.HOLDS.map(h => h.name), f.hold, 'Any Hold')}
    ${sel('nature', natures, f.nature, 'Any nature')}
    <select name="show" class="sel" aria-label="Which"><option value="">Still open</option><option value="all"${f.show === 'all' ? ' selected' : ''}>All petitions</option><option value="mine"${f.show === 'mine' ? ' selected' : ''}>Assigned to me</option></select>
    <button class="btn" type="submit">Sort</button>
  </form>${body}
  ${mayFile(u, 'petition') ? '<div class="linkrow"><a class="btn" href="/staff/forms/petition">Take down a petition in person</a></div>' : ''}</section>`;
}

function holdMap(counts) {
  const max = Math.max(1, ...Object.values(counts).map(c => c.open));
  return `<svg class="holdmap" viewBox="30 30 540 330" role="img" aria-label="Map of the Holds of Skyrim">
  ${MAP.map(h => { const hd = Ranks.HOLD_BY_NAME[h.name]; const c = counts[h.name] || { open: 0 }; const a = 0.12 + 0.55 * (c.open / max); return `<a href="/staff/holds/${hd.id}"><polygon points="${h.pts}" fill="rgba(107,20,20,${a.toFixed(2)})" stroke="#8C6A2F" stroke-width="2"/><text x="${h.lx}" y="${h.ly}" text-anchor="middle" class="hm-name">${esc(h.name)}</text><text x="${h.lx}" y="${h.ly + 16}" text-anchor="middle" class="hm-count">${c.open} open</text></a>`; }).join('')}
  </svg>`;
}
function holds(counts, officers) {
  return `<section><h2>The Holds of Skyrim</h2><p class="lede">Open business in each Hold. The deeper the red, the more that waits. Choose a Hold to see its petitions, dispatches, notices and Delegate.</p>
  <div class="mapwrap">${holdMap(counts)}</div>
  <div class="tablewrap"><table class="ledger"><thead><tr><th>Hold</th><th>Delegate</th><th>Open petitions</th><th>Open records</th><th>Last dispatch</th></tr></thead><tbody>
  ${Ranks.HOLDS.map(h => { const c = counts[h.name] || {}; const d = officers.filter(o => o.active && o.holds.includes(h.id)); return `<tr><td><a href="/staff/holds/${h.id}"><b>${esc(h.name)}</b></a><br>${small(esc(h.seat))}</td><td>${d.length ? d.map(o => esc(o.name)).join(', ') : small('None assigned')}</td><td>${c.petitions || 0}</td><td>${c.open || 0}</td><td>${c.lastDispatch ? `<a href="${recUrl(c.lastDispatch['Record No'])}">${esc(c.lastDispatch['Record No'])}</a>` : small('—')}</td></tr>`; }).join('')}
  </tbody></table></div></section>`;
}
function holdPage(h, d, u) {
  return `<section><p style="margin:0 0 10px"><a href="/staff/holds">← All Holds</a></p>
  <h2>${esc(h.name)}</h2><p class="lede">Seat of ${esc(h.seat)}.</p>
  <div class="two"><div class="panel double"><h3>Answering Officer</h3>${d.delegates.length ? `<ul>${d.delegates.map(o => `<li><b>${esc(o.name)}</b> — ${esc(o.rankName)}</li>`).join('')}</ul>` : '<p style="margin:0">No Delegate is assigned. The Imperial Envoy to the Holds answers for it.</p>'}</div>
  <div class="panel double"><h3>At a Glance</h3><p style="margin:0">${d.petitions ? d.petitions.length : 0} open petitions · ${d.open ? d.open.length : 0} open records · ${d.dispatches ? d.dispatches.length : 0} recent dispatches</p></div></div>
  <div class="section-label">Open Petitions</div>${recordTable(d.petitions, u, { empty: 'No petition is open for this Hold.' })}
  <div class="section-label">Recent Dispatches</div>${recordTable(d.dispatches, u, { empty: 'No dispatch has come from this Hold.' })}
  <div class="section-label">Notices Posted Here</div>${recordTable(d.notices, u, { empty: 'No notice has been posted for this Hold.' })}
  <div class="section-label">Other Open Business</div>${recordTable(d.open, u, { empty: 'Nothing else is open.' })}</section>`;
}

const ICON = m => /document/.test(m) ? 'Writ' : /spreadsheet/.test(m) ? 'Ledger' : /pdf/.test(m) ? 'Scroll' : /image/.test(m) ? 'Picture' : /folder/.test(m) ? 'Chest' : 'File';
function archives(u, folders, q, rows) {
  return `<section><h2>The Archives</h2><p class="lede">Every chest your rank may open. Documents are read here in the hall; no one needs to be let into the Ministry’s Drive.</p>
  <form class="search-box" method="get" action="/staff/archives"><input type="search" name="q" value="${esc(q || '')}" placeholder="e.g. Petition IV, Riften, Writ of Referral" aria-label="Search the rolls"><button class="btn" type="submit">Search the Rolls</button></form>
  ${q ? `<div class="section-label">Upon the Docket</div>${recordTable(rows, u, { empty: 'No record upon the Docket answers to that.' })}` : ''}
  <div class="section-label">The Chests</div>
  <div class="actions">${folders.map(k => `<a class="act" href="/staff/archives/${k}"><span class="t">${esc(C.FOLDER_NAMES[k])}</span><span class="n">Open the chest</span></a>`).join('')}</div></section>`;
}
function folderPage(key, files, sub) {
  return `<section><p style="margin:0 0 10px"><a href="/staff/archives">← The Archives</a></p><h2>${esc(sub ? sub.name : C.FOLDER_NAMES[key])}</h2>
  ${files === null ? '<p class="notice">The Archives are not connected to Google yet.</p>' : files.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>Document</th><th>Kind</th><th>Last changed</th></tr></thead><tbody>${files.map(f => `<tr><td><a href="${/folder/.test(f.mimeType) ? `/staff/archives/${key}?sub=${encodeURIComponent(f.id)}` : `/staff/files/${encodeURIComponent(f.id)}`}">${esc(f.name)}</a></td><td>${ICON(f.mimeType)}</td><td>${esc((f.modifiedTime || '').slice(0, 10))}</td></tr>`).join('')}</tbody></table></div>` : '<p class="lede">No document has been laid in this chest yet.</p>'}${chestExtras(key, sub)}</section>`;
}

const CHEST_EXTRAS = {
  manuals: {
    note: 'The Ministry\u2019s standing reference is kept in the hall itself and needs no chest.',
    items: [
      ['/staff/manual', 'Manual of Civil Administration', 'How the Ministry works: ranks, routes, the order of a matter, and what each office may do.'],
      ['/laws', 'Ledger of Laws', 'The Codex, the portfolio, and every authority the Ministry acts under, with its limits.'],
      ['/staff/training', 'Training & Examination', 'The course every officer sits, and the examination that follows it.'],
      ['/staff/forms', 'The Writs', 'Every writ and form the Ministry may enter, with the authority each one rests upon.']
    ]
  },
  templates: {
    note: 'Templates are generated by the hall when a writ is entered.',
    items: [['/staff/forms', 'The Writs', 'Choose a writ and the hall builds the document for you.']]
  }
};

function chestExtras(key, sub) {
  const x = !sub && CHEST_EXTRAS[key];
  if (!x) return '';
  return `<div class="section-label">Kept in the Hall</div><p class="hint">${esc(x.note)}</p>
  <div class="actions">${x.items.map(([href, title, blurb]) => `<a class="act" href="${href}"><span class="t">${esc(title)}</span><span class="n">${esc(blurb)}</span></a>`).join('')}</div>`;
}

function filePage(f, u, kind, back) {
  return `<section><p style="margin:0 0 10px"><a href="${esc(back)}">← Back</a></p><h2>${esc(f.name)}</h2><p class="lede">Last changed ${esc((f.modifiedTime || '').slice(0, 10))}.</p>
  ${kind ? viewer(`/staff/files/${encodeURIComponent(f.id)}/content`, f.name, u, kind) : '<p class="notice">This kind of file cannot be shown in the hall.</p>'}</section>`;
}

function correspondence(list, csrf, officers) {
  const pending = list.filter(q => q.status === 'Pending');
  const done = list.filter(q => q.status !== 'Pending');
  const row = q => `<article class="reqcard"><div class="no">${esc(q.ministry || 'Another office')} · ${esc(ago(q.at))}${q.corrNo ? ` · logged as <a href="${recUrl(q.corrNo)}">${esc(q.corrNo)}</a>` : ''}</div>
    <h3>${esc(q.subject)}</h3><p class="small">Asked by ${esc(q.name)}, ${esc(q.title)}</p>
    <dl class="meta"><dt>Records sought</dt><dd class="pre">${esc(q.records)}</dd><dt>Purpose</dt><dd class="pre">${esc(q.purpose)}</dd>${q.status !== 'Pending' ? `<dt>Answer</dt><dd>${statusChip(q.status)} ${q.released && q.released.length ? esc(q.released.join(', ')) : ''} ${q.note ? '— ' + esc(q.note) : ''}${q.answeredBy ? small(' by ' + esc(q.answeredBy)) : ''}</dd>` : ''}</dl>
    ${q.status === 'Pending' ? `<form method="post" action="/staff/correspondence/${esc(q.id)}" class="stack">${hidden(csrf)}<label class="l" for="rel-${esc(q.id)}">Release these records</label><input type="text" id="rel-${esc(q.id)}" name="released" placeholder="Start typing a record no. or subject" maxlength="400" data-rec-suggest="multi" data-rec-preview="relprev-${esc(q.id)}"><div class="recprev-box" id="relprev-${esc(q.id)}"></div><label class="l" for="note-${esc(q.id)}">Note to the requester</label><input type="text" id="note-${esc(q.id)}" name="note" maxlength="600"><div class="linkrow"><button class="btn small" name="act" value="release" type="submit">Release</button><button class="btn small ghost" name="act" value="decline" type="submit">Decline</button></div></form>` : ''}</article>`;
  return `<section><h2>Requests from Other Ministries</h2><p class="lede">When Justice, the Interior, Finance, the War Office or the Governor’s Office asks for a record, the request is logged here and in the Register of Imperial Correspondence. Release only what the request lawfully needs.</p>
  <div class="section-label">Awaiting an Answer</div>${pending.length ? `<div class="board">${pending.map(row).join('')}</div>` : '<p class="lede">No request waits.</p>'}
  <div class="section-label">Answered</div>${done.length ? `<div class="board">${done.slice(0, 40).map(row).join('')}</div>` : '<p class="lede">None yet.</p>'}</section>`;
}
function requestsPage(u, mine, released, csrf) {
  return `<section><h2>Request Records of the Ministry</h2><p class="lede">Ask the Ministry of Civil and Administrative Affairs for a record. Your request is entered in its Register of Imperial Correspondence and answered by the Registry. Records released to you can be read here.</p>
  <form class="writ" method="post" action="/staff/requests" style="max-width:820px">${hidden(csrf)}
    <div class="field"><span class="l">Requesting office</span><div class="fixed">${esc(u.ministry || u.title)}</div></div>
    <div class="field"><label class="l" for="rq-s">Subject <span class="req">*</span></label><input type="text" id="rq-s" name="subject" required maxlength="160"></div>
    <div class="field"><label class="l" for="rq-r">Records sought <span class="req">*</span></label><textarea id="rq-r" name="records" required rows="3" maxlength="1500" placeholder="Name the records, or give their numbers if known (e.g. Petition IV)"></textarea></div>
    <div class="field"><label class="l" for="rq-p">Purpose <span class="req">*</span></label><textarea id="rq-p" name="purpose" required rows="3" maxlength="1500" placeholder="Why your office needs them"></textarea></div>
    <div class="submitbar"><button class="btn" type="submit">Send the request</button></div>
  </form>
  <div class="section-label">Your Requests</div>
  ${mine.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>Subject</th><th>Asked</th><th>Answer</th></tr></thead><tbody>${mine.map(q => `<tr><td><b>${esc(q.subject)}</b>${q.corrNo ? '<br>' + small('Logged as ' + esc(q.corrNo)) : ''}</td><td>${esc(ago(q.at))}</td><td>${statusChip(q.status)}${q.note ? '<br>' + small(esc(q.note)) : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="lede">You have asked for nothing yet.</p>'}
  <div class="section-label">Records Released to You</div>
  ${released.length ? recordTable(released, u, { noFiler: true }) : '<p class="lede">No record has been released to you.</p>'}</section>`;
}

function bulletin(posts, u, csrf) {
  const mod = u.all || can(u, 'approve');
  return `<section><h2>The Bulletin</h2><p class="lede">Word among the officers. Orders of the day, reminders, and news from the Holds.</p>
  <form class="writ" method="post" action="/staff/bulletin" style="max-width:820px">${hidden(csrf)}
    <div class="field"><label class="l" for="bt">Heading</label><input type="text" id="bt" name="title" required maxlength="120"></div>
    <div class="field"><label class="l" for="bb">Word</label><textarea id="bb" name="body" required rows="4" maxlength="3000"></textarea></div>
    <div class="submitbar"><button class="btn" type="submit">Post to the Bulletin</button></div>
  </form>
  <div class="section-label">Posted</div>
  ${posts.length ? `<div class="board">${posts.map(p => `<article class="post${p.pinned ? ' pinned' : ''}"><div class="no">${esc(p.name)} · ${esc(p.title_of || '')} · ${esc(ago(p.at))}${p.pinned ? ' · Pinned' : ''}</div><h3>${esc(p.title)}</h3><div class="body">${esc(p.body)}</div>
  <div class="linkrow">${mod ? `<form method="post" action="/staff/bulletin/${esc(p.id)}/pin" class="inline">${hidden(csrf)}<button class="btn small ghost" type="submit">${p.pinned ? 'Unpin' : 'Pin'}</button></form>` : ''}${mod || p.by === u.username ? `<form method="post" action="/staff/bulletin/${esc(p.id)}/delete" class="inline">${hidden(csrf)}<button class="btn small ghost" type="submit">Take down</button></form>` : ''}</div></article>`).join('')}</div>` : '<p class="lede">The Bulletin is bare.</p>'}</section>`;
}

function handover(inbox, sent, officers, ranks, u, csrf) {
  const note = (n, out) => `<article class="post${!out && !(n.readBy || []).includes(u.username) ? ' unread' : ''}"><div class="no">${out ? 'To ' + esc(n.toLabel) : 'From ' + esc(n.fromName) + ' · ' + esc(n.fromTitle)} · ${esc(ago(n.at))}</div><h3>${esc(n.subject)}</h3><div class="body">${esc(n.body)}</div>${n.records ? `<p class="small">Records: ${esc(n.records)}</p>` : ''}
  <div class="linkrow">${!out && !(n.readBy || []).includes(u.username) ? `<form method="post" action="/staff/handover/${esc(n.id)}/read" class="inline">${hidden(csrf)}<button class="btn small" type="submit">Mark as read</button></form>` : ''}${out ? `<form method="post" action="/staff/handover/${esc(n.id)}/delete" class="inline">${hidden(csrf)}<button class="btn small ghost" type="submit">Withdraw</button></form>` : ''}</div></article>`;
  return `<section><h2>Handover Notes</h2><p class="lede">When you leave a post, go on leave, or hand a matter to another officer, write what they must know: open matters, promises made, where things stand.</p>
  <form class="writ" method="post" action="/staff/handover" style="max-width:820px">${hidden(csrf)}
    <div class="field"><label class="l" for="ht">To</label><select id="ht" name="to" class="sel" required><option value="">Choose…</option><optgroup label="Whoever holds the rank">${ranks.map(r => `<option value="rank:${esc(r.id)}">${esc(r.name)}</option>`).join('')}</optgroup><optgroup label="An officer">${officers.filter(o => o.active && o.username !== u.username).map(o => `<option value="user:${esc(o.username)}">${esc(o.name)} — ${esc(o.rankName)}</option>`).join('')}</optgroup></select></div>
    <div class="field"><label class="l" for="hs">Subject</label><input type="text" id="hs" name="subject" required maxlength="140"></div>
    <div class="field"><label class="l" for="hb">Note</label><textarea id="hb" name="body" required rows="6" maxlength="5000"></textarea></div>
    <div class="field"><label class="l" for="hr">Records concerned</label><input type="text" id="hr" name="records" maxlength="300" placeholder="e.g. Petition IV, Inquiry II"></div>
    <div class="submitbar"><button class="btn" type="submit">Leave the note</button></div>
  </form>
  <div class="section-label">Left for You</div>${inbox.length ? `<div class="board">${inbox.map(n => note(n, false)).join('')}</div>` : '<p class="lede">No note waits for you.</p>'}
  <div class="section-label">Notes You Left</div>${sent.length ? `<div class="board">${sent.map(n => note(n, true)).join('')}</div>` : '<p class="lede">You have left no notes.</p>'}</section>`;
}

function training(u, best, scores) {
  return `<section><h2>Training of Officers</h2><p class="lede">Learn the Ministry’s paperwork before you put your name to it.</p>
  <div class="actions">
    <a class="act" href="/staff/quiz"><span class="t">The Officer’s Handbook Quiz</span><span class="d">Twelve questions on the laws, the routes and the forms of the Ministry.</span><span class="n">${best ? `Your best: ${best.score} of ${best.of}` : 'Not yet taken'}</span></a>
    ${can(u, 'file') ? `<a class="act" href="/staff/forms"><span class="t">Practice a Writ</span><span class="d">Fill in any writ and press “Practice”. You see the finished document; nothing is numbered or filed.</span><span class="n">Practice mode</span></a>` : ''}
    <a class="act" href="/staff/manual"><span class="t">Manual and Routes</span><span class="d">Which office has authority, the order of a writ’s keeping, and how to date a record.</span><span class="n">Reference</span></a>
    ${can(u, 'archives') ? `<a class="act" href="/staff/archives/manuals"><span class="t">The Manual of Civil Administration</span><span class="d">The full handbook, read here in the hall.</span><span class="n">Manuals chest</span></a>` : ''}
  </div>
  ${scores ? `<div class="section-label">Scores of the Officers</div><div class="tablewrap"><table class="ledger"><thead><tr><th>Officer</th><th>Rank</th><th>Best score</th><th>Taken</th></tr></thead><tbody>${scores.map(o => `<tr><td>${esc(o.name)}</td><td>${esc(o.rankName)}</td><td>${o.quiz ? `${o.quiz.score} of ${o.quiz.of}${o.quiz.score / o.quiz.of >= 0.75 ? ' <span class="chip ok">Passed</span>' : ''}` : '—'}</td><td>${o.quiz ? esc(ago(o.quiz.at)) : '—'}</td></tr>`).join('')}</tbody></table></div>` : ''}</section>`;
}
function quiz(questions, csrf, result) {
  return `<section><p style="margin:0 0 10px"><a href="/staff/training">← Training</a></p><h2>The Officer’s Handbook Quiz</h2>
  ${result ? `<div class="card" style="margin-bottom:18px"><div class="eyebrow">${result.score / result.of >= 0.75 ? 'Passed' : 'Not yet passed'}</div><h3 style="font-size:26px;margin:6px 0">${result.score} of ${result.of}</h3><p class="hint" style="margin:0">Three in four are needed to pass. The right answers are marked below.</p></div>` : '<p class="lede">Choose one answer to each. Three in four right is a pass.</p>'}
  <form class="writ" method="post" action="/staff/quiz">${hidden(csrf)}
  ${questions.map((q, i) => { const got = result && result.answers[i]; return `<fieldset><legend><span class="rn">${roman(i + 1)}.</span> ${esc(q.q)}</legend><div class="qopts">${q.a.map((a, j) => { const cls = result ? (j === q.c ? ' right' : String(j) === got ? ' wrong' : '') : ''; return `<label class="qopt${cls}"><input type="radio" name="q${i}" value="${j}"${String(j) === got ? ' checked' : ''}${result ? ' disabled' : ' required'}> ${esc(a)}</label>`; }).join('')}</div>${result && q.why ? `<p class="hint">${esc(q.why)}</p>` : ''}</fieldset>`; }).join('')}
  <div class="submitbar">${result ? '<a class="btn" href="/staff/quiz">Take it again</a>' : '<button class="btn big" type="submit">Hand in the answers</button>'}</div></form></section>`;
}

function manual(u) {
  return `<section><h2>Manuals &amp; Reference</h2><p class="lede">The standing handbook, the forms index, and the routing every officer should know by heart.</p>
  ${can(u, 'archives') ? `<div class="linkrow"><a class="btn" href="/staff/archives/manuals">Read the Manual of Civil Administration</a><a class="btn ghost" href="/staff/archives/templates">Blank templates</a></div>` : ''}
  <div class="section-label">Does Civil Affairs Have Authority?</div>
  <div class="tablewrap"><table class="ledger"><thead><tr><th>Matter</th><th>Ordinary route</th></tr></thead><tbody>${ROUTES.map(([a, b]) => `<tr><td><b>${esc(a)}</b></td><td>${esc(b)}</td></tr>`).join('')}</tbody></table></div>
  <div class="section-label">Prepare, Register, Send</div>
  <ol class="steps">${[['Prepare', 'Select the correct instrument. Fill only supported facts.'], ['Review', 'Names, titles, Hold, date, record numbers, authority, signer.'], ['Authorize', 'Obtain every signature, seal and approval before issue.'], ['Register', 'Sealing through this hall numbers it and enters it upon the Docket.'], ['Send', 'Deliver it and record how and when.'], ['Follow up', 'Keep the Docket state current.'], ['Archive', 'Closed records are flagged for the Archives after the retention period.']].map(([a, b]) => `<li><span><b>${a}</b><span class="sub">${b}</span></span></li>`).join('')}</ol>
  <div class="section-label">Dating in the Skyrim Calendar</div>
  <div class="panel"><p style="margin:0 0 6px"><b>Form:</b> Fredas, the 10th day of Sun's Height, 4E 226</p><p style="margin:0 0 6px"><b>Days:</b> Sundas, Morndas, Tirdas, Middas, Turdas, Fredas, Loredas</p><p style="margin:0"><b>Months:</b> ${MONTHS.join(', ')}</p></div></section>`;
}

function report(s, u) {
  const tbl = (title, obj) => { const e = Object.entries(obj).sort((a, b) => b[1] - a[1]); return `<div class="panel"><h3>${esc(title)}</h3>${e.length ? `<table class="mini">${e.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num">${v}</td></tr>`).join('')}</table>` : '<p class="hint" style="margin:0">None.</p>'}</div>`; };
  return `<section class="report"><div class="dept-head"><div><h2>Weekly Report of the Ministry</h2><p class="lede" style="margin:0">The seven days ending ${esc(s.todayText)}.</p></div><div class="linkrow noprint"><button class="btn" onclick="window.print()">Print</button><a class="btn ghost" href="/staff/activity">Activity log</a>${can(u, 'archive') ? '<a class="btn ghost" href="/staff/archive-due">Due for the Archives</a>' : ''}</div></div>
  <div class="tally">${[[s.filed, 'writs filed'], [s.petitions, 'petitions received'], [s.closed, 'records closed'], [s.open, 'open in all'], [s.awaiting, 'awaiting a seal'], [s.due, 'due for the Archives']].map(([n, l]) => `<div class="tal"><span class="tn">${n}</span><span class="tl">${l}</span></div>`).join('')}</div>
  <div class="grid3">${tbl('Filed by class', s.byClass)}${tbl('Filed by Hold', s.byHold)}${tbl('Most active officers', s.byOfficer)}</div>
  <div class="section-label">Oldest Open Business</div>${recordTable(s.oldest, u, { empty: 'Nothing is open.' })}
  <div class="section-label">Filed This Week</div>${recordTable(s.week, u, { empty: 'Nothing was filed this week.' })}</section>`;
}
function activity(rows, officers, who) {
  return `<section><h2>Activity Log</h2><p class="lede">Who did what, and when. Kept for the Minister and those who report on the Ministry’s work.</p>
  <form class="filters" method="get" action="/staff/activity"><select name="who" class="sel" aria-label="Officer"><option value="">Every officer</option>${officers.map(o => `<option value="${esc(o.username)}"${o.username === who ? ' selected' : ''}>${esc(o.name)}</option>`).join('')}</select><button class="btn" type="submit">Show</button></form>
  ${rows.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>When (UTC)</th><th>Officer</th><th>Did</th><th>Record</th><th>Detail</th></tr></thead><tbody>${rows.map(r => `<tr><td style="white-space:nowrap">${esc(r.at.slice(0, 16).replace('T', ' '))}</td><td>${esc(r.name)}</td><td>${esc(r.action)}</td><td>${r.target && /\s[IVXLCDM]+$/.test(r.target) ? `<a href="${recUrl(r.target)}">${esc(r.target)}</a>` : esc(r.target)}</td><td>${esc(r.detail)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="lede">Nothing is written in the log.</p>'}</section>`;
}
function archiveDue(rows, days, u, csrf) {
  return `<section><h2>Due for the Archives</h2><p class="lede">Records closed for ${days} day${days === 1 ? '' : 's'} or more. Cataloguing one files a Catalogue of Ministry Archives entry linked to it, and marks it Archived.${u.all ? ' The period is set in the Minister’s Study.' : ''}</p>
  ${!rows ? '<p class="notice">The Docket cannot be read until the archives are connected.</p>' : rows.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>Record</th><th>Subject</th><th>Closed</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td class="num"><a href="${recUrl(r['Record No'])}">${esc(r['Record No'])}</a></td><td>${esc(r.Subject)}<br>${small(esc(r.Folder))}</td><td>${esc(ago(r['Closed At (UTC)'] || r['Updated At (UTC)']))}</td><td><form method="post" action="${recUrl(r['Record No'])}/catalogue" class="inline">${hidden(csrf)}<input type="hidden" name="back" value="/staff/archive-due"><button class="btn small" type="submit">Catalogue</button></form></td></tr>`).join('')}</tbody></table></div>` : '<p class="lede">Nothing is due. The Archives are in good order.</p>'}</section>`;
}

function search(res, u) {
  if (!res) return `<section><h2>Search</h2><p class="lede">Find a record, an officer, or a Hold, all in one place.</p>
  <form class="search-box" method="get" action="/staff/search"><input type="search" name="q" placeholder="Search records, officers, Holds…" aria-label="Search" required><button class="btn" type="submit">Search</button></form></section>`;
  const { q, records, officers, holds, bulletin } = res;
  const empty = !records.length && !officers.length && !holds.length && !bulletin.length;
  return `<section><h2>Search</h2>
  <form class="search-box" method="get" action="/staff/search"><input type="search" name="q" value="${esc(q)}" placeholder="Search records, officers, Holds…" aria-label="Search"><button class="btn" type="submit">Search</button></form>
  ${empty ? `<p class="lede" style="margin-top:18px">Nothing on the rolls answers to “${esc(q)}”.</p>` : ''}
  ${records.length ? `<div class="section-label">Records</div>${recordTable(records, u)}` : ''}
  ${officers.length ? `<div class="section-label">Officers</div><div class="dir-list">${officers.map(o => `<div class="dir-card"><div class="dir-rank">${esc(o.name)}</div><div class="dir-sub">${esc(o.rankName)}${o.office ? ' · ' + esc(o.office) : ''}</div>${o.holds.length ? `<div class="dir-office">${esc(holdNames(o.holds))}</div>` : ''}</div>`).join('')}</div>` : ''}
  ${holds.length ? `<div class="section-label">Holds</div><div class="tablewrap"><table class="ledger"><thead><tr><th>Hold</th><th>Seat</th></tr></thead><tbody>${holds.map(h => `<tr><td><a href="/directory">${esc(h.name)}</a></td><td>${esc(h.seat)}</td></tr>`).join('')}</tbody></table></div>` : ''}
  ${bulletin.length ? `<div class="section-label">Bulletin</div><ul class="plainlist">${bulletin.map(p => `<li><a href="/staff/bulletin">${esc(p.title)}</a> ${small(esc(ago(p.at)))}</li>`).join('')}</ul>` : ''}
  </section>`;
}

function notifications(list) {
  return `<section><h2>Notifications</h2><p class="lede">Pings for records laid on your desk, sealed, or returned for correction.</p>
  ${list.length ? `<ul class="plainlist history notif-list">${list.map(n => `<li class="${n.read ? '' : 'unread'}">${small(esc(ago(n.at)))} — ${n.link ? `<a href="${esc(n.link)}">${esc(n.text)}</a>` : esc(n.text)}</li>`).join('')}</ul>` : '<p class="lede">Nothing has come to you yet.</p>'}
  </section>`;
}

function profile(u, p, csrf) {
  return `<section><h2>Your Profile</h2><p class="lede">How you appear on the rolls, and the signet set beside your name on every writ you enter.</p>
  <div class="two">
    <div class="card"><div class="eyebrow">On the rolls</div><h3 style="font-size:24px;margin:6px 0">${esc(p.name)}</h3>
      <dl class="meta"><dt>Rank</dt><dd>${esc(p.rankName)}</dd>${p.office ? `<dt>Office</dt><dd>${esc(p.office)}</dd>` : ''}<dt>Holds</dt><dd>${p.holds.length ? esc(holdNames(p.holds)) : '—'}</dd><dt>Directory</dt><dd>${p.listed ? 'Listed publicly' : 'Not listed'}</dd>${p.quiz ? `<dt>Handbook quiz</dt><dd>${p.quiz.score} of ${p.quiz.of}</dd>` : ''}</dl>
      <p class="hint" style="margin-top:12px">Your rank, office and Holds are set by the Minister.</p>
      <div class="linkrow"><a class="btn ghost" href="/account/password">Change your password</a><a class="btn ghost" href="/staff/id-card" target="_blank" rel="noopener">Printable ID card</a></div></div>
    <form class="writ" method="post" action="/staff/profile" id="pf">${hidden(csrf)}
      <div class="eyebrow">Your signet</div>
      <div class="signet-show">${p.signet.img ? `<img src="/staff/signet/${esc(p.username)}" alt="Your signet" class="signet-img">` : p.signet.text ? `<span class="signet-text">✠ ${esc(p.signet.text)} ✠</span>` : '<span class="hint">No signet yet.</span>'}</div>
      <div class="field"><label class="l" for="sgt">Signet letters</label><input type="text" id="sgt" name="signetText" maxlength="12" value="${esc(p.signet.text)}" placeholder="e.g. N·S"></div>
      <div class="field"><label class="l" for="sgf">Or a signet picture</label><input type="file" id="sgf" accept="image/png,image/jpeg"><input type="hidden" name="signetImg" id="sgd"></div>
      ${p.signet.img ? '<label class="checkline"><input type="checkbox" name="clearImg" value="1"> Remove the signet picture</label>' : ''}
      <div class="field"><label class="l" for="bio">A line about you</label><textarea id="bio" name="bio" rows="3" maxlength="600">${esc(p.bio)}</textarea></div>
      <div class="submitbar"><button class="btn" type="submit">Save</button><span class="hint" style="margin:0">PNG or JPG, under 400 KB. A square picture works best.</span></div>
    </form>
  </div>
  <script>document.getElementById('sgf').addEventListener('change',function(){var f=this.files[0];if(!f)return;if(f.size>400000){alert('That picture is too large. Keep it under 400 KB.');this.value='';return;}var r=new FileReader();r.onload=function(){document.getElementById('sgd').value=r.result;};r.readAsDataURL(f);});</script></section>`;
}

module.exports = { formsFor, mayFile, recordTable, desk, clerk, formsIndex, formPage, practice, filed, docketPage, offices, office, recordPage, approvals, petitions, holds, holdPage, archives, folderPage, filePage, correspondence, requestsPage, bulletin, handover, training, quiz, manual, report, activity, archiveDue, profile, search, notifications, CHECKLIST, prefill };
