const C = require('./config');
const { FORMS, BY_KEY } = require('./forms');
const { SIT, DEPTS, ROUTES } = require('./content');
const { MONTHS, roman } = require('./skyrim');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const folderUrl = k => 'https://drive.google.com/drive/folders/' + C.FOLDERS[k];
const ext = (href, label, cls) => `<a class="btn${cls ? ' ' + cls : ''}" href="${esc(href)}" target="_blank" rel="noopener">${label}</a>`;

const SEAL = `<svg class="seal" viewBox="0 0 120 120" role="img" aria-label="Seal of the Ministry"><defs><path id="ring" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0"/></defs><circle cx="60" cy="60" r="57" fill="#6B1414"/><circle cx="60" cy="60" r="53" fill="none" stroke="#D9BE84" stroke-width="1.5"/><circle cx="60" cy="60" r="34" fill="none" stroke="#D9BE84" stroke-width="1"/><text font-family="EB Garamond, Georgia, serif" font-size="8.3" letter-spacing="1.1" fill="#F1E6CC" font-weight="600"><textPath href="#ring" startOffset="1%">MINISTRY OF CIVIL &amp; ADMINISTRATIVE AFFAIRS &#10022;</textPath></text><g fill="#D9BE84"><polygon points="60,33 64,54 85,60 64,66 60,87 56,66 35,60 56,54"/><polygon points="60,44 62.5,57.5 76,60 62.5,62.5 60,76 57.5,62.5 44,60 57.5,57.5" fill="#6B1414"/><circle cx="60" cy="60" r="3.2"/></g></svg>`;

function nav(user, active) {
  const isStaff = user && (user.role === 'staff' || user.role === 'admin');
  const items = [['/', 'The Hall', 'home'], ['/notices', 'Notice Board', 'notices']];
  if (isStaff) {
    items.push(['/staff', 'Staff Hall', 'staff'], ['/staff/clerk', 'Clerk Desk', 'clerk'], ['/staff/forms', 'Writs & Forms', 'forms']);
    DEPTS.forEach(d => items.push(['/staff/office/' + d.id, d.tab, 'office-' + d.id]));
    items.push(['/staff/docket', 'Docket', 'docket'], ['/staff/search', 'Archives', 'search'], ['/staff/manual', 'Manuals', 'manual']);
    if (user.role === 'admin') items.push(['/admin', 'Minister’s Study', 'admin']);
  }
  return `<nav class="tabs" aria-label="Ministry sections"><div class="tabs-inner">${items.map(([h, l, k]) => `<a href="${h}"${k === active ? ' class="on" aria-current="page"' : ''}>${esc(l)}</a>`).join('')}</div></nav>`;
}

function layout({ title, user, active, body, flash, csrf }) {
  const who = user
    ? `<span>${esc(user.name)} · ${user.role === 'admin' ? 'Minister' : user.role === 'staff' ? 'Ministry Staff' : 'Visitor'}</span><form method="post" action="/logout" style="display:inline"><input type="hidden" name="_csrf" value="${esc(csrf)}"><button class="btn ghost small" type="submit">Leave the Hall</button></form>`
    : `<a class="btn ghost small" href="/login">Staff Entrance</a>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title ? title + ' · ' : '')}Ministry of Civil and Administrative Affairs</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fondamento:ital@0;1&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap">
<link rel="stylesheet" href="/style.css"><link rel="icon" href="/favicon.svg"></head><body>
<div class="topbar"><span class="eyebrow">Fourth Era · Imperial Province of Skyrim</span><span style="display:flex;gap:10px;align-items:center">${who}</span></div>
<div class="wrap"><header class="mast">
<div class="eyebrow">By the Authority of the Governor</div>
<div class="admin">Cyrodilic Administration for the Imperial Province of Skyrim</div>
<div class="mast-row">${SEAL}<div><h1><a href="/">Ministry of Civil and<br>Administrative Affairs</a></h1><div class="minister">Provincial Ministry of State · Minister: <b>${esc(C.MINISTER_NAME)}</b></div></div></div>
<div class="rule"></div></header></div>
${nav(user, active)}
<div class="wrap"><main>${flash ? `<div class="flash${flash.err ? ' err' : ''}">${flash.html || esc(flash.text)}</div>` : ''}${body}</main>
<div class="foot">Imperial Province of Skyrim ✦ Ministry of Civil and Administrative Affairs ✦ Fourth Era</div></div>
</body></html>`;
}

function proclamation(n) {
  return `<article class="proclamation"><div class="no">${esc(n['Record No'])}</div><h3>${esc(n.Subject)}</h3><div class="date">${esc(n['Date (4E)'])}</div><div class="body">${esc(n.Summary)}</div></article>`;
}

function publicHome(notices) {
  return `<section>
  <h2>The Hall of Civil Affairs</h2>
  <p class="lede">By leave of the Governor and under the seal of Minister ${esc(C.MINISTER_NAME)}, these halls stand open to every subject of the Empire in Skyrim. Petitions are heard from all nine Holds, and no honest grievance is turned away.</p>
  <div class="section-label">Proclamations of the Ministry</div>
  ${notices.length ? `<div class="board">${notices.slice(0, 3).map(proclamation).join('')}</div><div class="linkrow"><a class="btn ghost" href="/notices">Read the full Notice Board</a></div>` : `<p class="lede" style="margin:0">No proclamations are posted at this hour. Return when the herald next cries the news.</p>`}
  <div class="section-label">How to Bring Your Business</div>
  <div class="two">
    <div class="panel double"><h3>Bring a Petition</h3><p style="margin:0">Seek out a clerk or Envoy of the Ministry in your Hold and state your grievance plainly. They will set it down upon a Petition Before the Ministry and see it routed to the proper office. No petitioner is punished for a lawful grievance.</p></div>
    <div class="panel double"><h3>Seek the Ministry's Word</h3><p style="margin:0">The Ministry is the authoritative voice of the Imperial administration in Skyrim. Proclamations, corrections and notices are posted on the Notice Board and cried in the Holds.</p></div>
  </div>
  <div class="section-label">Offices of the Ministry</div>
  <div class="two">
    <div class="panel"><h3>Civil Office</h3><p style="margin:0">Where the grievances of the Holds are heard and the Envoys sent forth. Kept by the Imperial Emissary.</p></div>
    <div class="panel"><h3>Imperial Register</h3><p style="margin:0">Keeper of the rolls, the seals, the letters and the printed word. Kept by the Imperial Registrar.</p></div>
  </div>
</section>`;
}

function noticeBoard(notices, note) {
  return `<section><h2>The Notice Board</h2><p class="lede">Proclamations, declarations and corrections released by the Ministry to the people of Skyrim.</p>
  ${note ? `<p class="notice">${esc(note)}</p>` : ''}
  ${notices.length ? `<div class="board">${notices.map(proclamation).join('')}</div>` : `<p class="lede">The board is bare. No proclamations have been posted.</p>`}</section>`;
}

function staffHome(user, recent) {
  const quick = [
    ['petition', 'Bring a Petition', 'A subject of the Empire seeks redress or aid from the Ministry.'],
    ['inquiry', 'Open an Inquiry', 'The Emissary has ordered the Adjudicator to look into a matter.'],
    ['correspondence', 'Log a Letter', 'A letter has come to, or goes forth from, the Ministry.'],
    ['notice', 'Proclaim a Notice', 'The Minister would have word cried in the Holds or posted on the board.'],
    ['appointment', 'Appoint an Officer', 'Commission a new Envoy, clerk or officer into Imperial service.'],
    ['dispatch', 'Send a Dispatch', 'An Envoy reports what was seen and heard in the Holds.']
  ];
  return `<section>
  <h2>The Staff Hall</h2>
  <p class="lede">Welcome, ${esc(user.name)}. Every writ filed here is written in the Ministry's hand, numbered upon the Docket, and laid in its proper chest in the Archives.</p>
  <div class="section-label">Business of the Day</div>
  <div class="actions">${quick.map(([k, t, d]) => `<a class="act" href="/staff/forms/${k}"><span class="t">${t}</span><span class="d">${d}</span><span class="n">${esc(BY_KEY[k].num)}</span></a>`).join('')}</div>
  <div class="linkrow"><a class="btn" href="/staff/clerk">Not sure which writ? Open the Clerk Desk</a><a class="btn ghost" href="/staff/forms">All writs &amp; forms</a></div>
  <div class="section-label">Latest upon the Docket</div>
  ${docketTable(recent, user, true)}
  <div class="linkrow"><a class="btn ghost" href="/staff/docket">The full Docket</a>${ext(folderUrl('root'), 'Open the Ministry Archives', 'ghost')}</div>
</section>`;
}

function clerk(q, sel) {
  const ql = (q || '').toLowerCase().trim();
  const list = SIT.map((s, i) => ({ s, i })).filter(({ s }) => !ql || (s.t + ' ' + s.cat + ' ' + (s.form ? BY_KEY[s.form].title : 'license')).toLowerCase().includes(ql));
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
      <div class="inst"><span>Use: <b>${f ? esc(f.title) : 'License Record'}</b></span>${f ? `<span class="chip">${esc(f.num)} I, II, III…</span>` : '<span class="chip warn">No form yet</span>'}</div>
      <ol class="steps">${s.steps.map(([a, b]) => `<li><span>${esc(a)}${b ? `<span class="sub">${esc(b)}</span>` : ''}</span></li>`).join('')}</ol>
      ${s.caution ? `<p class="notice" style="margin:16px 0 0"><b>Take care.</b> ${esc(s.caution)}</p>` : ''}
      <dl class="meta"><dt>Handled by</dt><dd>${esc(s.handler)}</dd><dt>Filed under</dt><dd>${f ? esc(C.FOLDER_NAMES[f.folder]) : 'Licenses & Permits'}</dd>${also ? `<dt>Related</dt><dd>${also}</dd>` : ''}</dl>
      <div class="linkrow">${f ? `<a class="btn big" href="/staff/forms/${f.key}">Fill in the ${esc(f.title)}</a>` : ext(folderUrl('licenses'), 'Open Licenses & Permits')}</div>
    </article>
  </div></section>`;
}

function formsIndex(user) {
  const groups = DEPTS.filter(d => d.forms.length);
  return `<section><h2>Writs &amp; Forms</h2><p class="lede">Choose the instrument. When filed, it is written as a Google Doc in the Ministry's hand, numbered upon the Docket, and laid in its proper folder.</p>
  ${groups.map(d => `<div class="section-label">${esc(d.title)}</div><div class="inst-grid">${d.forms.map(k => formCard(BY_KEY[k], user)).join('')}</div>`).join('')}
  <div class="section-label">Registry &amp; Archives</div><div class="inst-grid">${['archive'].map(k => formCard(BY_KEY[k], user)).join('')}</div></section>`;
}
function formCard(f, user) {
  const locked = f.adminOnly && user.role !== 'admin';
  return `<div class="inst-card"><span class="num">${esc(f.num)}</span><span class="nm">${esc(f.title)}</span><p>${esc(f.subtitle)}.</p><p style="font-size:14px;color:var(--sepia)">Filed under ${esc(C.FOLDER_NAMES[f.folder])}</p><div class="linkrow">${locked ? '<span class="chip warn">Minister only</span>' : `<a class="btn" href="/staff/forms/${f.key}">Fill in</a>`}</div></div>`;
}

function dateInput(name, required, def) {
  const d = def || {};
  return `<div class="datebox"><span class="dpre">the</span><input type="number" min="1" max="31" name="${name}[day]" value="${esc(d.day || '')}" aria-label="Day"${required ? ' required' : ''}><span class="dsep">day of</span><select name="${name}[month]" aria-label="Month"${required ? ' required' : ''}><option value="">month…</option>${MONTHS.map((m, i) => `<option value="${i}"${String(d.month) === String(i) ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select><span class="dsep">4E</span><input type="number" min="1" max="999" name="${name}[year]" value="${esc(d.year || C.CURRENT_YEAR)}" aria-label="Year"></div>`;
}

function formPage(f, user, csrf, prev) {
  const v = prev || {};
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
      return `<div class="field"><label class="l" for="${id}">${lab}</label><input type="text" id="${id}" name="f[${fl.id}]" value="${esc(val('f', fl.id))}"${fl.required ? ' required' : ''} maxlength="300"></div>`;
    }).join('');
    if (s.lines) inner += `<textarea name="f[${s.id}]" aria-label="${esc(s.h)}" rows="${s.lines + 1}" maxlength="6000">${esc(val('f', s.id))}</textarea>`;
    if (s.grid) {
      const rows = [];
      for (let i = 0; i < (s.rows || 5); i++) rows.push(`<tr>${s.grid.map((h, j) => `<td><input type="text" name="g[${s.id}][${i}][${j}]" aria-label="${esc(h)} row ${i + 1}" value="${esc(v.g && v.g[s.id] && v.g[s.id][i] && v.g[s.id][i][j] || '')}" maxlength="300"></td>`).join('')}</tr>`);
      inner += `<div class="tablewrap" style="border:0"><table class="gridin"><thead><tr>${s.grid.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
    }
    if (s.after) inner += `<p class="hint" style="color:var(--blood)">${esc(s.after)}</p>`;
    return `<fieldset><legend><span class="rn">${rn}.</span> ${esc(s.h)}</legend>${inner}</fieldset>`;
  }).join('');
  const sigs = f.sig.map((role, i) => `<div class="field"><label class="l" for="sig${i}">${esc(role)}</label><input type="text" id="sig${i}" name="sig[${i}]" value="${esc(v.sig && v.sig[i] || '')}" placeholder="Name & office, if signing now" maxlength="160"></div>`).join('');
  const canPublic = f.publicCapable && user.role === 'admin';
  return `<section>
  <p style="margin:0 0 10px"><a href="/staff/forms">← All writs &amp; forms</a></p>
  <h2>${esc(f.title)}</h2>
  <p class="lede">${esc(f.subtitle)}. When filed, this becomes ${esc(f.num)} (next number) in ${esc(C.FOLDER_NAMES[f.folder])}.</p>
  <form class="writ" method="post" action="/staff/forms/${f.key}">
    <input type="hidden" name="_csrf" value="${esc(csrf)}">
    ${f.banner ? `<p class="notice"><b>${esc(f.banner)}</b></p>` : ''}
    <p class="preamble">${esc(f.preamble)}</p>
    <fieldset><legend><span class="rn">✦</span> Date of Record</legend><div class="field"><span class="l">Entered on <span class="req">*</span></span>${dateInput('recordDate', true, v.recordDate)}</div></fieldset>
    ${secs}
    <fieldset><legend><span class="rn">✦</span> Certification</legend><p class="hint">Type a name to sign now, or leave blank to sign the finished document by hand.</p>${sigs}</fieldset>
    <div class="submitbar">
      <button class="btn big" type="submit">Seal &amp; File</button>
      ${canPublic ? `<label class="checkline"><input type="checkbox" name="public" value="1"${v.public ? ' checked' : ''}> Post on the public Notice Board</label>` : ''}
      <span class="hint" style="margin:0">Fields marked <span class="req">*</span> are required.</span>
    </div>
  </form></section>`;
}

function filed(entry) {
  return `<section><div class="card" style="max-width:760px">
  <div class="eyebrow">Sealed &amp; Filed</div>
  <h2 style="margin-top:6px">${esc(entry['Record No'])}</h2>
  <p class="lede" style="margin-bottom:10px">${esc(entry.Subject)}</p>
  <dl class="meta"><dt>Dated</dt><dd>${esc(entry['Date (4E)'])}</dd><dt>Laid in</dt><dd>${esc(entry.Folder)}</dd><dt>Entered by</dt><dd>${esc(entry['Filed By'])}</dd><dt>Notice Board</dt><dd>${entry.Public === 'Yes' ? 'Posted' : 'Not posted'}</dd></dl>
  <div class="linkrow">${ext(entry.Document, 'Open the document')}<a class="btn ghost" href="/staff/forms/${esc(entry.Form)}">File another</a><a class="btn ghost" href="/staff/docket">The Docket</a></div>
  </div></section>`;
}

function docketTable(rows, user, compact, csrf) {
  if (!rows) return `<p class="notice">The Docket cannot be read until the Minister connects the Ministry archives to Google.</p>`;
  if (!rows.length) return `<p class="lede">Nothing has been entered upon the Docket yet.</p>`;
  const admin = user.role === 'admin';
  const statuses = ['Open', 'Closed', 'Referred', 'Archived'];
  return `<div class="tablewrap"><table class="ledger"><thead><tr><th>Record</th><th>Date (4E)</th><th>Subject</th><th>Entered by</th><th>Status</th>${compact ? '' : '<th>Notice Board</th>'}<th></th></tr></thead><tbody>
  ${rows.map(r => `<tr><td class="num">${esc(r['Record No'])}</td><td>${esc(r['Date (4E)'])}</td><td>${esc(r.Subject)}<br><span style="font-size:13px;color:var(--sepia)">${esc(r.Folder)}</span></td><td>${esc(r['Filed By'])}</td>
  <td>${compact ? esc(r.Status) : `<form method="post" action="/staff/docket/${r.row}/status"><input type="hidden" name="_csrf" value="${esc(csrf)}"><select name="status" aria-label="Status" onchange="this.form.submit()">${statuses.map(s => `<option${s === r.Status ? ' selected' : ''}>${s}</option>`).join('')}</select><noscript><button class="btn small">Set</button></noscript></form>`}</td>
  ${compact ? '' : `<td>${admin ? `<form method="post" action="/staff/docket/${r.row}/public"><input type="hidden" name="_csrf" value="${esc(csrf)}"><input type="hidden" name="value" value="${r.Public === 'Yes' ? 'No' : 'Yes'}"><button class="btn small${r.Public === 'Yes' ? '' : ' ghost'}" type="submit">${r.Public === 'Yes' ? 'Posted — withdraw' : 'Post publicly'}</button></form>` : (r.Public === 'Yes' ? '<span class="chip ok">Posted</span>' : '<span class="chip">Staff only</span>')}</td>`}
  <td>${r.Document ? ext(r.Document, 'Open', 'ghost small') : ''}</td></tr>`).join('')}
  </tbody></table></div>`;
}

function docketPage(rows, user, csrf, q, cls) {
  const classes = [...new Set(FORMS.map(f => f.num))];
  return `<section><h2>The Docket</h2><p class="lede">Every writ sealed through this hall, newest first. Set a record's state as its business proceeds.${user.role === 'admin' ? ' As Minister you may post any record to the public Notice Board, or withdraw it.' : ''}</p>
  <form class="search-box" method="get" action="/staff/docket" style="margin-bottom:14px"><input type="search" name="q" value="${esc(q || '')}" placeholder="Search record, subject or officer" aria-label="Search the Docket"><select name="class" aria-label="Class" style="font-family:var(--body);font-size:16px;border:1px solid var(--gold);background:#FBF5E6;padding:8px"><option value="">All classes</option>${classes.map(c => `<option${c === cls ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select><button class="btn" type="submit">Search</button></form>
  ${docketTable(rows, user, false, csrf)}</section>`;
}

function office(d, user) {
  const sits = SIT.map((s, i) => ({ s, i })).filter(({ s }) => (s.form && d.forms.includes(s.form)) || (!s.form && d.id === 'licenses'));
  return `<section><div class="dept-head"><div><h2>${esc(d.title)}</h2><p class="lede" style="margin:0">${esc(d.lede)}</p></div>
  <div class="linkrow" style="margin:0">${d.folders.map((f, j) => ext(folderUrl(f), esc(C.FOLDER_NAMES[f]), j ? 'ghost' : '')).join('')}</div></div>
  ${d.forms.length ? `<div class="section-label">Instruments</div><div class="inst-grid">${d.forms.map(k => formCard(BY_KEY[k], user)).join('')}</div>` : `<p class="notice"><b>No license form has been issued yet.</b> Record applications in the Licenses &amp; Permits folder and identify the governing authority first.</p>`}
  ${sits.length ? `<div class="section-label">Common Business</div><div class="panel"><ul>${sits.map(({ s, i }) => `<li><a href="/staff/clerk?s=${i}">${esc(s.t)}</a></li>`).join('')}</ul></div>` : ''}
  ${d.people ? `<div class="section-label">Officers</div><div class="panel"><ul>${d.people.map(([a, b]) => `<li><b>${esc(a)}</b> — ${esc(b)}</li>`).join('')}</ul></div>` : ''}
  </section>`;
}

function manual() {
  return `<section><h2>Manuals &amp; Reference</h2><p class="lede">The standing handbook, the forms index, and the routing every officer should know by heart.</p>
  <div class="linkrow">${ext(folderUrl('manuals'), 'Open the Manual of Civil Administration')}${ext(folderUrl('templates'), 'Blank templates', 'ghost')}</div>
  <div class="section-label">Does Civil Affairs Have Authority?</div>
  <div class="tablewrap"><table class="ledger"><thead><tr><th>Matter</th><th>Ordinary route</th></tr></thead><tbody>${ROUTES.map(([a, b]) => `<tr><td><b>${esc(a)}</b></td><td>${esc(b)}</td></tr>`).join('')}</tbody></table></div>
  <div class="section-label">Prepare, Register, Send</div>
  <ol class="steps">${[['Prepare', 'Select the correct instrument. Fill only supported facts.'], ['Review', 'Names, titles, Hold, date, record numbers, authority, signer.'], ['Authorize', 'Obtain every signature, seal and approval before issue.'], ['Register', 'Sealing through this hall numbers it and enters it upon the Docket.'], ['Send', 'Deliver it and record how and when.'], ['Follow up', 'Keep the Docket status current.'], ['Archive', 'Close the entry and catalogue the file.']].map(([a, b]) => `<li><span><b>${a}</b><span class="sub">${b}</span></span></li>`).join('')}</ol>
  <div class="section-label">Dating in the Skyrim Calendar</div>
  <div class="panel"><p style="margin:0 0 6px"><b>Form:</b> Fredas, the 10th day of Sun's Height, 4E 226</p><p style="margin:0 0 6px"><b>Days:</b> Sundas, Morndas, Tirdas, Middas, Turdas, Fredas, Loredas</p><p style="margin:0"><b>Months:</b> ${MONTHS.join(', ')}</p></div></section>`;
}

function search(q, rows) {
  const drive = q ? 'https://drive.google.com/drive/search?q=' + encodeURIComponent(q) : '';
  return `<section><h2>Search the Archives</h2><p class="lede">Seek the Ministry's rolls by name, record number, Hold or matter.</p>
  <form class="search-box" method="get" action="/staff/search"><input type="search" name="q" value="${esc(q || '')}" placeholder="e.g. Petition IV, Riften, Writ of Referral" aria-label="Search"><button class="btn" type="submit">Search the Rolls</button></form>
  ${q ? `<div class="section-label">Upon the Docket</div>${rows === null ? '<p class="notice">The Docket is not connected yet.</p>' : rows.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>Record</th><th>Date (4E)</th><th>Subject</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td class="num">${esc(r['Record No'])}</td><td>${esc(r['Date (4E)'])}</td><td>${esc(r.Subject)}</td><td>${r.Document ? ext(r.Document, 'Open', 'ghost small') : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="lede">No record upon the Docket answers to that.</p>'}
  <div class="linkrow">${ext(drive, 'Search every file in Google Drive', 'ghost')}</div>` : ''}
  <div class="section-label">Browse the Chests</div>
  <div class="actions">${Object.keys(C.FOLDER_NAMES).filter(k => k !== 'root').map(k => `<a class="act" href="${folderUrl(k)}" target="_blank" rel="noopener"><span class="t">${esc(C.FOLDER_NAMES[k])}</span><span class="n">Open folder</span></a>`).join('')}</div></section>`;
}

function adminPage(g, discord, csrf) {
  return `<section><h2>The Minister's Study</h2><p class="lede">Keys and seals of the hall. Only the Minister sees this page.</p>
  <div class="two">
  <div class="panel double"><h3>Google Archives</h3>
    ${!g.configured ? '<p class="status-no">Not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on Railway.</p>' : g.connected ? `<p class="status-ok">Connected${g.email ? ' as ' + esc(g.email) : ''}.</p><p style="margin:0">Filed writs are written into your Drive folders.</p>` : '<p class="status-no">Not connected. Writs cannot be filed until you connect.</p>'}
    <div class="linkrow">${g.configured ? `<a class="btn" href="/admin/google/connect">${g.connected ? 'Reconnect' : 'Connect Google'}</a>` : ''}${g.connected && !g.fromEnv ? `<form method="post" action="/admin/google/disconnect"><input type="hidden" name="_csrf" value="${esc(csrf)}"><button class="btn ghost" type="submit">Disconnect</button></form>` : ''}${g.docketId ? ext('https://docs.google.com/spreadsheets/d/' + g.docketId + '/edit', 'Open the Docket sheet', 'ghost') : ''}</div>
  </div>
  <div class="panel double"><h3>Staff Entrance</h3>
    <p style="margin:0 0 6px">${discord.configured ? '<span class="status-ok">Discord login is active.</span>' : '<span class="status-no">Discord login is not configured.</span>'}</p>
    <p style="margin:0 0 6px">Staff by Discord ID: <b>${discord.staff}</b> · Ministers: <b>${discord.admins}</b></p>
    <p style="margin:0">${discord.guild ? 'Staff are also admitted by role in your Discord server.' : 'Role-based entry from your Discord server is off.'}</p>
    <p class="hint" style="margin-top:10px">Change who may enter in Railway → Variables: STAFF_DISCORD_IDS, ADMIN_DISCORD_IDS, or the server role settings.</p>
  </div></div></section>`;
}

function message(title, text) {
  return `<section><h2>${esc(title)}</h2><p class="lede">${text}</p><div class="linkrow"><a class="btn" href="/">Return to the Hall</a></div></section>`;
}

function loginPage(discordOk, devLogin) {
  return `<section><h2>Staff Entrance</h2><p class="lede">Officers of the Ministry enter by their Discord seal. Visitors may read the Notice Board without entering.</p>
  <div class="linkrow">${discordOk ? '<a class="btn big" href="/auth/discord">Enter with Discord</a>' : '<p class="notice">Discord login has not been configured yet.</p>'}
  ${devLogin ? '<a class="btn ghost" href="/dev-login?role=admin">Dev: enter as Minister</a><a class="btn ghost" href="/dev-login?role=staff">Dev: enter as staff</a>' : ''}</div></section>`;
}

module.exports = { layout, publicHome, noticeBoard, staffHome, clerk, formsIndex, formPage, filed, docketPage, office, manual, search, adminPage, message, loginPage, esc, SEAL };
