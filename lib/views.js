const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const C = require('./config');
const Ranks = require('./ranks');
const { MONTHS } = require('./skyrim');

const assetV = f => { try { return crypto.createHash('md5').update(fs.readFileSync(path.join(__dirname, '..', 'public', f))).digest('hex').slice(0, 10); } catch (_) { return String(Date.now()); } };
const CSS_V = assetV('style.css');
const JS_V = assetV('recsuggest.js');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hidden = csrf => `<input type="hidden" name="_csrf" value="${esc(csrf)}">`;
const recUrl = no => '/staff/records/' + encodeURIComponent(no);
const can = (u, p) => Ranks.can(u, p);

const SEAL = `<svg class="seal" viewBox="0 0 120 120" role="img" aria-label="Seal of the Ministry"><defs><path id="ring" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0"/></defs><circle cx="60" cy="60" r="57" fill="#6B1414"/><circle cx="60" cy="60" r="53" fill="none" stroke="#D9BE84" stroke-width="1.5"/><circle cx="60" cy="60" r="34" fill="none" stroke="#D9BE84" stroke-width="1"/><text font-family="EB Garamond, Georgia, serif" font-size="8.3" letter-spacing="1.1" fill="#F1E6CC" font-weight="600"><textPath href="#ring" startOffset="1%">MINISTRY OF CIVIL &amp; ADMINISTRATIVE AFFAIRS &#10022;</textPath></text><g fill="#D9BE84"><polygon points="60,33 64,54 85,60 64,66 60,87 56,66 35,60 56,54"/><polygon points="60,44 62.5,57.5 76,60 62.5,62.5 60,76 57.5,62.5 44,60 57.5,57.5" fill="#6B1414"/><circle cx="60" cy="60" r="3.2"/></g></svg>`;

const STATUS_CLASS = { Received: 'ok', Open: 'ok', 'Under Review': 'ok', 'Awaiting Seal': 'warn', Returned: 'warn', Referred: '', Revoked: 'warn', Closed: '', Archived: '' };
const statusChip = s => `<span class="chip ${STATUS_CLASS[s] || ''}">${esc(s || '—')}</span>`;

const PUBLIC_TABS = [['/hall', 'The Hall', 'home'], ['/notices', 'Notice Board', 'notices'], ['/petition', 'Petition Box', 'petition'], ['/records', 'Record Lookup', 'records'], ['/directory', 'Directory', 'directory'], ['/licenses', 'Register of Licenses', 'licenses'], ['/laws', 'Ledger of Laws', 'laws']];
const STAFF_TABS = [
  ['/staff', 'My Desk', 'desk', ['desk'], 'desk'],
  ['/staff/clerk', 'Clerk Desk', 'clerk', ['clerk'], 'desk'],
  ['/staff/forms', 'Writs', 'forms', ['file'], 'desk'],
  ['/staff/offices', 'Offices', 'offices', ['file', 'docket'], 'records'],
  ['/staff/docket', 'Docket', 'docket', ['docket', 'allrecords'], 'records'],
  ['/staff/petitions', 'Petitions', 'petitions', ['petitions'], 'records'],
  ['/staff/approvals', 'Approvals', 'approvals', ['approve'], 'records'],
  ['/staff/holds', 'Holds', 'holds', ['holds'], 'records'],
  ['/staff/archives', 'Archives', 'archives', ['archives'], 'records'],
  ['/staff/correspondence', 'Ministry Requests', 'correspondence', ['correspondence'], 'mail'],
  ['/staff/requests', 'Request Records', 'requests', ['request'], 'mail'],
  ['/staff/bulletin', 'Bulletin', 'bulletin', ['bulletin'], 'office'],
  ['/staff/handover', 'Handover', 'handover', ['handover'], 'office'],
  ['/staff/training', 'Training', 'training', ['training'], 'office'],
  ['/staff/report', 'Reports', 'report', ['reports'], 'office'],
  ['/admin', 'Minister’s Study', 'admin', ['officers'], 'admin']
];
const staffTabs = u => STAFF_TABS.filter(t => t[3].some(p => can(u, p)) && !(u.all && t[2] === 'requests') && !(t[2] === 'offices' && !(u.depts || []).length));

function tabLink(h, l, k, active, badges) {
  return `<a href="${h}"${k === active ? ' class="on" aria-current="page"' : ''}>${esc(l)}${badges && badges[k] ? ` <span class="badge">${badges[k]}</span>` : ''}</a>`;
}

function nav(user, active, badges) {
  const pub = `<div class="tabs-inner pub">${PUBLIC_TABS.map(([h, l, k]) => tabLink(h, l, k, active, badges)).join('')}</div>`;
  const staff = user && Ranks.isStaff(user) ? staffTabs(user) : [];
  let staffRow = '';
  if (staff.length) {
    let html = '', lastGroup = null;
    for (const [h, l, k, , g] of staff) {
      if (lastGroup !== null && g !== lastGroup) html += '<span class="tabsep" aria-hidden="true"></span>';
      html += tabLink(h, l, k, active, badges);
      lastGroup = g;
    }
    staffRow = `<div class="tabs-inner staff">${html}</div>`;
  }
  return `<nav class="tabs" aria-label="Ministry sections">${pub}${staffRow}</nav>`;
}

function layout({ title, user, active, body, flash, csrf, today, badges, head, war }) {
  const bell = user ? `<a class="bell" href="/staff/notifications" title="Notifications">🔔${badges && badges.notify ? ` <span class="badge">${badges.notify}</span>` : ''}</a>` : '';
  const who = user
    ? `${bell}<span class="who">${esc(user.name)} · ${esc(user.title)}</span><a class="btn ghost small" href="/staff/profile">Profile</a><form method="post" action="/logout" style="display:inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Leave the Hall</button></form>`
    : `<a class="btn ghost small" href="/login">Staff Entrance</a>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light">
<title>${esc(title ? title + ' · ' : '')}${war ? 'The Imperial War Office' : 'Ministry of Civil and Administrative Affairs'}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fondamento:ital@0;1&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap">
<link rel="stylesheet" href="/style.css?v=${CSS_V}"><link rel="icon" href="/favicon.svg"><script src="/recsuggest.js?v=${JS_V}" defer></script>${head || ''}</head><body>
<div class="topbar"><span class="clock"><a class="ministries-link" href="/" title="All Imperial Ministries">✦ Ministries</a> <span class="eyebrow">${esc(today ? today.text : 'Fourth Era')}</span> <span id="clock" class="hour"></span></span><span class="topright">${who}</span></div>
<div class="wrap"><header class="mast">
<div class="eyebrow">By the Authority of the Governor</div>
<div class="admin">Cyrodilic Administration for the Imperial Province of Skyrim</div>
<div class="mast-row">${war ? ministrySeal('war', 'IMPERIAL WAR OFFICE') : SEAL}<div>${war ? `<h1><a href="/war-office">The Imperial<br>War Office</a></h1><div class="minister">Provincial Command · Legion of Skyrim</div>` : `<h1><a href="/hall">Ministry of Civil and<br>Administrative Affairs</a></h1><div class="minister">Provincial Ministry of State · Minister: <b>${esc(C.MINISTER_NAME)}</b></div>`}</div></div>
<div class="rule"></div></header></div>
${war ? '' : nav(user, active, badges)}
<div class="wrap"><main>${flash ? `<div class="flash${flash.err ? ' err' : ''}" role="status">${flash.html || esc(flash.text)}</div>` : ''}${body}</main>
<div class="foot">Imperial Province of Skyrim ✦ ${war ? 'The Imperial War Office' : 'Ministry of Civil and Administrative Affairs'} ✦ Fourth Era</div></div>
<script>(function(){var el=document.getElementById('clock');if(!el)return;function t(){var d=new Date(),h=d.getHours(),m=('0'+d.getMinutes()).slice(-2),p=h<5?'in the deep of night':h<12?'in the morning':h<17?'in the afternoon':h<21?'in the evening':'at night';el.textContent='· '+((h%12)||12)+':'+m+' '+p;}t();setInterval(t,30000);})();</script>
</body></html>`;
}

function dateInput(name, required, def) {
  const d = def || {};
  return `<div class="datebox"><span class="dpre">the</span><input type="number" min="1" max="31" name="${name}[day]" value="${esc(d.day || '')}" aria-label="Day"${required ? ' required' : ''}><span class="dsep">day of</span><select name="${name}[month]" aria-label="Month"${required ? ' required' : ''}><option value="">month…</option>${MONTHS.map((m, i) => `<option value="${i}"${d.month !== undefined && d.month !== '' && String(d.month) === String(i) ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select><span class="dsep">4E</span><input type="number" min="1" max="999" name="${name}[year]" value="${esc(d.year || C.CURRENT_YEAR)}" aria-label="Year"></div>`;
}
function holdSelect(name, value, blank = 'No particular Hold', id) {
  return `<select name="${name}"${id ? ` id="${id}"` : ''} class="sel"><option value="">${esc(blank)}</option>${Ranks.HOLDS.map(h => `<option value="${h.id}"${value === h.id || value === h.name ? ' selected' : ''}>${esc(h.name)}</option>`).join('')}</select>`;
}
const holdNames = ids => (ids || []).map(id => Ranks.HOLD_BY_ID[id] ? Ranks.HOLD_BY_ID[id].name : id).join(' & ');

function proclamation(n) {
  return `<article class="proclamation"><div class="no">${esc(n['Record No'])}${n.Hold ? ' · ' + esc(n.Hold) : ''}</div><h3>${esc(n.Subject)}</h3><div class="date">${esc(n['Date (4E)'])}</div><div class="body">${esc(n.Summary)}</div><div class="linkrow"><a class="btn ghost small" href="/proclamation/${encodeURIComponent(n['Record No'])}">Printable proclamation</a></div></article>`;
}

function publicHome(notices, today) {
  return `<section>
  <h2>The Hall of Civil Affairs</h2>
  <p class="lede">By leave of the Governor and under the seal of Minister ${esc(C.MINISTER_NAME)}, these halls stand open to every subject of the Empire in Skyrim. Petitions are heard from all nine Holds, and no honest grievance is turned away.</p>
  <div class="actions">
    <a class="act" href="/petition"><span class="t">Bring a Petition</span><span class="d">Set down your grievance or request and drop it in the Ministry’s Petition Box.</span><span class="n">Petition Box</span></a>
    <a class="act" href="/petition/status"><span class="t">Ask After a Petition</span><span class="d">Give your petition’s number and learn where it stands.</span><span class="n">Petition status</span></a>
    <a class="act" href="/directory"><span class="t">Officers of the Ministry</span><span class="d">Who keeps each office, and which Delegate answers for your Hold.</span><span class="n">Directory</span></a>
    <a class="act" href="/laws"><span class="t">The Laws We Keep</span><span class="d">The codes this Ministry works under, set out in plain words.</span><span class="n">Ledger of Laws</span></a>
  </div>
  <div class="section-label">Proclamations of the Ministry</div>
  ${notices.length ? `<div class="board">${notices.slice(0, 3).map(proclamation).join('')}</div><div class="linkrow"><a class="btn ghost" href="/notices">Read the full Notice Board</a></div>` : `<p class="lede" style="margin:0">No proclamations are posted at this hour. Return when the herald next cries the news.</p>`}
  <div class="section-label">Offices of the Ministry</div>
  <div class="two">
    <div class="panel"><h3>Civil Office</h3><p style="margin:0">Where the grievances of the Holds are heard and the Delegates sent forth. Kept by the Imperial Envoy to the Holds of Skyrim.</p></div>
    <div class="panel"><h3>Administrative Office</h3><p style="margin:0">Keeper of the rolls, the seals, the letters, the licenses and the printed word. Kept by the Imperial Registrar.</p></div>
  </div>
</section>`;
}

function noticeBoard(notices, note) {
  return `<section><h2>The Notice Board</h2><p class="lede">Proclamations, declarations and corrections released by the Ministry to the people of Skyrim.</p>
  ${note ? `<p class="notice">${esc(note)}</p>` : ''}
  ${notices.length ? `<div class="board">${notices.map(proclamation).join('')}</div>` : `<p class="lede">The board is bare. No proclamations have been posted.</p>`}</section>`;
}

function proclamationPrint(n, wax) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(n['Record No'])} · Proclamation</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fondamento:ital@0;1&family=EB+Garamond:ital,wght@0,400;0,600;1,400&display=swap"><link rel="stylesheet" href="/style.css?v=${CSS_V}">
<script src="/vendor/html2canvas.min.js" defer></script></head>
<body class="printbody"><div class="printbar"><a class="btn ghost" href="javascript:history.back()">← Back</a><button class="btn" onclick="window.print()">Print</button><button class="btn ghost" id="pic">Save as picture</button></div>
<article class="scroll" id="scroll">
<div class="eyebrow">By the Authority of the Governor</div>
<div class="admin">Cyrodilic Administration for the Imperial Province of Skyrim</div>
<div class="s-ministry">Provincial Ministry of Civil and Administrative Affairs</div>
<div class="s-orn">❧ ✦ ☙</div>
<div class="s-hear">Hear Ye, Hear Ye</div>
<h1 class="s-title">${esc(n.Subject)}</h1>
<div class="s-no">${esc(n['Record No'])}${n.Hold ? ' · To the people of ' + esc(n.Hold) : ' · To all the Holds of Skyrim'}</div>
<div class="s-body">${esc(n.Summary)}</div>
<div class="s-given">Given under the seal of the Ministry on ${esc(n['Date (4E)'])}</div>
<div class="s-foot"><div><div class="s-sig">${esc(C.MINISTER_NAME)}</div><div class="s-role">Minister of State for Civil &amp; Administrative Affairs</div></div><img class="s-wax" src="${wax}" alt="Wax seal of the Ministry"></div>
</article>
<script>document.getElementById('pic').addEventListener('click',function(){var b=this;b.disabled=true;html2canvas(document.getElementById('scroll'),{scale:2,backgroundColor:null,useCORS:true}).then(function(c){c.toBlob(function(bl){var a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download=${JSON.stringify(String(n['Record No']).replace(/\s+/g, '_'))}+'.png';document.body.appendChild(a);a.click();a.remove();b.disabled=false;});});});</script>
</body></html>`;
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function idCardPrint(p, wax, today) {
  const sigil = p.signet.img ? `<img class="idc-sigil-img" src="/staff/signet/${esc(p.username)}" alt="">` : `<span class="idc-sigil-text">${esc(p.signet.text || initials(p.name))}</span>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(p.name)} · Identification Card</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fondamento:ital@0;1&family=EB+Garamond:ital,wght@0,400;0,600;1,400&display=swap"><link rel="stylesheet" href="/style.css?v=${CSS_V}">
<script src="/vendor/html2canvas.min.js" defer></script></head>
<body class="printbody"><div class="printbar noprint"><a class="btn ghost" href="javascript:history.back()">← Back</a><button class="btn" onclick="window.print()">Print</button><button class="btn ghost" id="pic">Save as picture</button></div>
<div class="idcwrap" id="idcwrap">
<article class="idcard" id="idcard">
  <div class="idc-band">Cyrodilic Administration for the Imperial Province of Skyrim</div>
  <div class="idc-head">${SEAL}<div class="idc-h"><div class="idc-ministry">Ministry of Civil &amp;<br>Administrative Affairs</div><div class="idc-sub">Official Identification</div></div></div>
  <div class="idc-body">
    <div class="idc-sigilbox">${sigil}</div>
    <div class="idc-fields">
      <div class="idc-name">${esc(p.name)}</div>
      <div class="idc-rank">${esc(p.rankName)}</div>
      ${p.office ? `<div class="idc-office">${esc(p.office)}</div>` : ''}
      <dl class="idc-meta">
        <dt>Hold(s)</dt><dd>${p.holds.length ? esc(holdNames(p.holds)) : 'All Holds'}</dd>
        <dt>Officer No.</dt><dd>${esc(p.username)}</dd>
        <dt>Issued</dt><dd>${esc(today.text)}</dd>
      </dl>
    </div>
  </div>
  <div class="idc-foot"><img class="idc-wax" src="${wax}" alt="Wax seal of the Ministry"><p class="idc-foot-text">This card is the property of the Ministry of Civil and Administrative Affairs and must be surrendered upon leaving its service.</p></div>
</article>
</div>
<script>document.getElementById('pic').addEventListener('click',function(){var b=this;b.disabled=true;html2canvas(document.getElementById('idcard'),{scale:3,backgroundColor:null,useCORS:true}).then(function(c){c.toBlob(function(bl){var a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download=${JSON.stringify(String(p.username).replace(/\s+/g, '_'))}+'_id.png';document.body.appendChild(a);a.click();a.remove();b.disabled=false;});});});</script>
</body></html>`;
}

function petitionBox(csrf, v, closed, today) {
  const val = k => esc((v && v[k]) || '');
  const natures = ['Grievance', 'Request', 'Request for Records', 'License Application', 'Audience with an Officer', 'Public Information', 'Other'];
  return `<section><h2>The Petition Box</h2>
  <p class="lede">Any subject of the Empire may set down a grievance or a request here. It is entered upon the Ministry’s rolls as a Petition, given a number, and laid before the proper officer. Keep your number: with it you may ask after your petition at any time.</p>
  ${closed ? `<p class="notice"><b>The Petition Box is shut for the moment.</b> ${esc(closed)} Seek out a clerk or Delegate of the Ministry in your Hold instead.</p>` : `
  <form class="writ" method="post" action="/petition">${hidden(csrf)}
    <p class="preamble">To the Honourable Minister of Civil and Administrative Affairs and the officers of the Ministry: the petitioner named below humbly sets forth the following matter and prays the attention of the Ministry thereto.</p>
    <fieldset><legend><span class="rn">I.</span> The Petitioner</legend>
      <div class="field"><label class="l" for="p-name">Your name <span class="req">*</span></label><input type="text" id="p-name" name="name" required maxlength="120" value="${val('name')}"></div>
      <div class="field"><label class="l" for="p-hold">Your Hold <span class="req">*</span></label>${holdSelect('hold', v && v.hold, 'Choose your Hold…', 'p-hold').replace('<select', '<select required')}</div>
      <div class="field"><label class="l" for="p-standing">Standing or occupation</label><input type="text" id="p-standing" name="standing" maxlength="120" value="${val('standing')}"></div>
      <div class="field"><label class="l" for="p-where">Where you may be found <span class="req">*</span></label><input type="text" id="p-where" name="where" required maxlength="200" value="${val('where')}" placeholder="e.g. the Bannered Mare, Whiterun, most evenings"></div>
      <div class="field"><span class="l">How we should answer</span><div class="opts">${['Courier', 'In Person', 'Through a Delegate', 'Other'].map(o => `<label><input type="radio" name="reply" value="${o}"${(v && v.reply) === o ? ' checked' : ''}> ${o}</label>`).join('')}</div></div>
    </fieldset>
    <fieldset><legend><span class="rn">II.</span> The Matter</legend>
      <div class="field"><span class="l">Nature of the petition <span class="req">*</span></span><div class="opts">${natures.map(o => `<label><input type="radio" name="nature" value="${o}" required${(v && v.nature) === o ? ' checked' : ''}> ${o}</label>`).join('')}</div></div>
      <div class="field"><label class="l" for="p-concerned">Persons or offices concerned</label><input type="text" id="p-concerned" name="concerned" maxlength="200" value="${val('concerned')}"></div>
      <div class="field"><label class="l" for="p-statement">Your statement <span class="req">*</span></label><textarea id="p-statement" name="statement" required rows="7" maxlength="4000">${val('statement')}</textarea></div>
      <div class="field"><label class="l" for="p-relief">What you ask of the Ministry</label><textarea id="p-relief" name="relief" rows="3" maxlength="1500">${val('relief')}</textarea></div>
      <div class="hp" aria-hidden="true"><label>Leave this empty <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
    </fieldset>
    <div class="submitbar"><button class="btn big" type="submit">Drop in the Petition Box</button><span class="hint" style="margin:0">Dated ${esc(today.text)}. No petitioner is punished for a lawful grievance.</span></div>
  </form>`}
  <div class="linkrow"><a class="btn ghost" href="/petition/status">Ask after a petition you have already brought</a></div></section>`;
}

function petitionReceived(no, date) {
  return `<section><div class="card" style="max-width:720px"><div class="eyebrow">Received by the Ministry</div>
  <h2 style="margin-top:6px">${esc(no)}</h2>
  <p class="lede" style="margin-bottom:10px">Your petition is entered upon the rolls on ${esc(date)}. Keep this number. Give it to any officer of the Ministry, or ask after it here.</p>
  <div class="linkrow"><a class="btn" href="/petition/status?no=${encodeURIComponent(no)}">See its status</a><a class="btn ghost" href="/hall">Return to the Hall</a></div></div></section>`;
}

function recordLookup(q, rows) {
  return `<section><h2>Record Lookup</h2>
  <p class="lede">Search records the Ministry has made public — proclamations, released findings, licenses and other matters open to any subject or ministry. For a record not yet public, bring a petition or write to the Ministry through your own office to request it.</p>
  <form class="search-box" method="get" action="/records"><input type="search" name="q" value="${esc(q || '')}" placeholder="Record number, or a word from its subject" aria-label="Search public records" required><button class="btn" type="submit">Search</button></form>
  ${rows === null ? '<p class="notice" style="margin-top:18px">The Ministry’s rolls are being prepared.</p>' : rows === undefined ? '' : !rows.length ? `<p class="notice" style="margin-top:18px">No public record answers to “${esc(q)}”.</p>` : `<div class="board" style="margin-top:18px">${rows.map(r => `<article class="proclamation"><div class="no">${esc(r['Record No'])}${r.Hold ? ' · ' + esc(r.Hold) : ''}</div><h3>${esc(r.Subject)}</h3><div class="date">${esc(r['Date (4E)'])}</div>${r.Summary ? `<div class="body">${esc(r.Summary)}</div>` : ''}<div class="linkrow"><a class="btn ghost small" href="/proclamation/${encodeURIComponent(r['Record No'])}">Read the full record</a></div></article>`).join('')}</div>`}
  </section>`;
}

function petitionStatus(q, result) {
  const steps = ['Received', 'Under Review', 'Referred', 'Closed'];
  return `<section><h2>Ask After a Petition</h2>
  <p class="lede">Give the number of your petition, such as <i>Petition IV</i>. Only its standing is shown here. Its contents are kept by the Ministry.</p>
  <form class="search-box" method="get" action="/petition/status"><input type="search" name="no" value="${esc(q || '')}" placeholder="Petition IV" aria-label="Petition number" required><button class="btn" type="submit">Ask</button></form>
  ${result === undefined ? '' : result === null ? `<p class="notice" style="margin-top:18px">No petition upon the rolls answers to that number. Check the number and ask again.</p>` : `
  <div class="card" style="max-width:720px;margin-top:18px"><div class="eyebrow">${esc(result.no)}</div>
  <h3 style="font-size:26px;margin:6px 0 4px">${esc(result.status)}</h3>
  <p style="margin:0;color:var(--sepia)">Entered upon the rolls ${esc(result.date)}.</p>
  <ol class="track">${steps.map(s => `<li class="${s === result.status ? 'on' : steps.indexOf(s) < steps.indexOf(result.status) && result.status !== 'Referred' ? 'done' : ''}">${s}</li>`).join('')}</ol>
  <p class="hint" style="margin-top:12px">${esc({ Received: 'Your petition is in the Ministry’s hands and waits to be taken up.', 'Under Review': 'An officer of the Ministry is looking into your petition.', Referred: 'Your petition belongs to another authority and has been sent to them with its records.', Closed: 'The Ministry has finished with your petition. If you were promised an answer, it has gone by the means you asked.' }[result.status])}</p></div>`}
  </section>`;
}

function directory(ranks, officers) {
  const by = id => officers.filter(o => o.rank === id && o.active && o.listed);
  const card = r => {
    const people = by(r.id);
    return `<div class="dir-card"><div class="dir-rank">${esc(r.name)}</div>${r.subtitle ? `<div class="dir-sub">${esc(r.subtitle)}</div>` : ''}
    ${people.length ? people.map(p => `<div class="dir-name">${esc(p.name)}${p.office && p.office !== r.name ? `<span class="dir-office">${esc(p.office)}</span>` : ''}${p.holds.length ? `<span class="dir-office">${esc(holdNames(p.holds))}</span>` : ''}</div>`).join('') : '<div class="dir-vacant">Office vacant</div>'}</div>`;
  };
  const listed = ranks.filter(r => r.directory);
  const group = g => listed.filter(r => r.group === g);
  const holds = Ranks.HOLDS.map(h => {
    const d = officers.filter(o => o.active && o.listed && o.holds.includes(h.id));
    return `<tr><td><b>${esc(h.name)}</b><br><span class="small">${esc(h.seat)}</span></td><td>${d.length ? d.map(o => `${esc(o.name)} <span class="small">· ${esc(o.rankName)}</span>`).join('<br>') : '<i>Through the Imperial Envoy to the Holds</i>'}</td></tr>`;
  }).join('');
  return `<section><h2>Directory of the Ministry</h2><p class="lede">The officers who keep the Ministry of Civil and Administrative Affairs, and the Delegate who answers for each Hold.</p>
  <div class="dir-top">${group('Ministry').map(card).join('')}</div>
  <div class="two" style="margin-top:18px">
    <div class="panel double"><h3>Civil Office</h3><div class="dir-list">${group('Civil Office').map(card).join('')}</div></div>
    <div class="panel double"><h3>Administrative Office</h3><div class="dir-list">${group('Administrative Office').map(card).join('')}</div></div>
  </div>
  <div class="section-label">The Delegate for Each Hold</div>
  <div class="tablewrap"><table class="ledger"><thead><tr><th>Hold</th><th>Answering officer</th></tr></thead><tbody>${holds}</tbody></table></div></section>`;
}

function licenses(list, note, heraldry) {
  return `<section><h2>Register of Licenses</h2><p class="lede">Every license in force under the seal of this Ministry. A press or printing house not named here holds no license from the Ministry.</p>
  ${note ? `<p class="notice">${esc(note)}</p>` : ''}
  ${list && list.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>License</th><th>Holder</th><th>Kind</th><th>Hold</th><th>Issued</th><th>Expires</th></tr></thead><tbody>
  ${list.map(l => `<tr><td class="num">${esc(l.no)}</td><td><b>${esc(l.holder)}</b>${l.press ? `<br><span class="small">${esc(l.press)}</span>` : ''}</td><td>${esc(l.kind || '—')}</td><td>${esc(l.hold || '—')}</td><td>${esc(l.issued || '—')}</td><td>${esc(l.expires || 'Until revoked')}</td></tr>`).join('')}
  </tbody></table></div>` : note ? '' : `<p class="lede">No license is in force at this time.</p>`}
  <div class="section-label">Heraldic Recognitions</div>
  <p class="lede">Arms and styles recognized under the Governor's authority and entered upon the Imperial Ledger of Heraldry through this Ministry.</p>
  ${heraldry && heraldry.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>Claimant</th><th>Claim</th><th>Home Province / Hold</th><th>Ledger Entry</th><th>Recognized</th></tr></thead><tbody>
  ${heraldry.map(x => `<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.claim || '—')}</td><td>${esc(x.hold || '—')}</td><td>${esc(x.ledger || '—')}</td><td>${esc(x.date || '—')}</td></tr>`).join('')}
  </tbody></table></div>` : note ? '' : `<p class="lede">No arms or style has yet been recognized through this Ministry.</p>`}</section>`;
}

function laws(list, directives) {
  return `<section><h2>Ledger of Laws</h2><p class="lede">The codes under which this Ministry works, set out in plain words. The Ministry is the authoritative source of Imperial information in Skyrim; where these summaries and the law differ, the law governs.</p>
  <div class="board">${list.map(l => `<article class="proclamation law"><div class="no">${esc(l.cite || l.sub || '')}</div><h3>${esc(l.title)}</h3><div class="body">${esc(l.summary)}</div>${l.limits ? `<p class="limits"><b>Its limits.</b> ${esc(l.limits)}</p>` : ''}</article>`).join('')}</div>
  ${directives && directives.length ? `<div class="section-label">Standing Directives in Force</div><p class="hint">These bind the officers of this Ministry only. They are not provincial law.</p><div class="board">${directives.map(proclamation).join('')}</div>` : ''}</section>`;
}

function message(title, text) {
  return `<section><h2>${esc(title)}</h2><p class="lede">${text}</p><div class="linkrow"><a class="btn" href="/hall">Return to the Hall</a></div></section>`;
}

function loginPage(csrf, error, username) {
  return `<section><h2>Staff Entrance</h2><p class="lede">Officers of the Ministry, and officers of the Crown and the other Ministries, enter with the name and password issued by the Minister. Visitors may read the <a href="/notices">Notice Board</a> without entering.</p>
  ${error ? `<p class="flash err">${esc(error)}</p>` : ''}
  <form class="writ" method="post" action="/login" style="max-width:520px">${hidden(csrf)}
    <div class="field"><label class="l" for="u">Username</label><input type="text" id="u" name="username" value="${esc(username || '')}" required autocomplete="username" autocapitalize="none" spellcheck="false"></div>
    <div class="field"><label class="l" for="p">Password</label><input type="password" id="p" name="password" required autocomplete="current-password"></div>
    <div class="submitbar"><button class="btn big" type="submit">Enter the Hall</button><span class="hint" style="margin:0">Forgotten your password? Ask the Minister to reset it.</span></div>
  </form></section>`;
}

function passwordPage(csrf, forced, error) {
  return `<section><h2>${forced ? 'Choose Your Own Password' : 'Change Your Password'}</h2><p class="lede">${forced ? 'You entered with a temporary password. Set your own before taking up the Ministry’s business.' : 'At least 10 characters. A short phrase of several words is best.'}</p>
  ${error ? `<p class="flash err">${esc(error)}</p>` : ''}
  <form class="writ" method="post" action="/account/password" style="max-width:560px">${hidden(csrf)}
    <div class="field"><label class="l" for="c">Current password</label><input type="password" id="c" name="current" required autocomplete="current-password"></div>
    <div class="field"><label class="l" for="n">New password</label><input type="password" id="n" name="password" required minlength="10" autocomplete="new-password"></div>
    <div class="field"><label class="l" for="r">New password again</label><input type="password" id="r" name="confirm" required minlength="10" autocomplete="new-password"></div>
    <div class="submitbar"><button class="btn" type="submit">Set password</button></div>
  </form></section>`;
}


const EMBLEM = {
  civil: '<polygon points="60,33 64,54 85,60 64,66 60,87 56,66 35,60 56,54"/><polygon points="60,44 62.5,57.5 76,60 62.5,62.5 60,76 57.5,62.5 44,60 57.5,57.5" fill="#6B1414"/><circle cx="60" cy="60" r="3.2"/>',
  justice: '<rect x="58.6" y="38" width="2.8" height="44" rx="1"/><rect x="44" y="80" width="32" height="3" rx="1.5"/><rect x="38" y="45" width="44" height="2.6" rx="1.3"/><circle cx="60" cy="40" r="3.4"/><path d="M31 47 L45 47 L38 61 Z"/><path d="M75 47 L89 47 L82 61 Z"/>',
  war: '<path d="M38 36 L44 33 L82 79 L77 84 Z"/><path d="M82 36 L76 33 L38 79 L43 84 Z"/><rect x="33" y="72" width="20" height="3.4" rx="1.7" transform="rotate(-45 43 74)"/><rect x="67" y="72" width="20" height="3.4" rx="1.7" transform="rotate(45 77 74)"/><circle cx="60" cy="60" r="4" fill="#6B1414"/>'
};

function ministrySeal(key, ring) {
  const id = 'ring-' + key;
  return `<svg class="seal" viewBox="0 0 120 120" role="img" aria-label="Seal"><defs><path id="${id}" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0"/></defs><circle cx="60" cy="60" r="57" fill="#6B1414"/><circle cx="60" cy="60" r="53" fill="none" stroke="#D9BE84" stroke-width="1.5"/><circle cx="60" cy="60" r="34" fill="none" stroke="#D9BE84" stroke-width="1"/><text font-family="EB Garamond, Georgia, serif" font-size="8.3" letter-spacing="1.1" fill="#F1E6CC" font-weight="600"><textPath href="#${id}" startOffset="1%">${esc(ring)} &#10022;</textPath></text><g fill="#D9BE84">${EMBLEM[key] || EMBLEM.civil}</g></svg>`;
}

const MINISTRIES = [
  { key: 'civil', name: 'Ministry of Civil and Administrative Affairs', ring: 'MINISTRY OF CIVIL & ADMINISTRATIVE AFFAIRS', seat: 'Provincial Ministry of State', href: '/hall', open: true,
    blurb: 'Receives the petitions of the Empire’s subjects, keeps the registers and the archives, issues licences and recognitions, and publishes the lawful notices of the Empire throughout the Holds.' },
  { key: 'justice', name: 'Ministry of Justice', ring: 'MINISTRY OF JUSTICE', seat: 'Provincial Ministry of State', href: '/justice', open: false,
    blurb: 'Hears matters arising under Imperial law, oversees the adjudicators and the courts of the province, and answers upon questions of jurisdiction between the Holds and the Empire.' },
  { key: 'war', name: 'Imperial War Office', ring: 'IMPERIAL WAR OFFICE', seat: 'Provincial Command', href: '/war-office', open: true,
    blurb: 'Directs the garrisons of the Legion within Skyrim, orders the musters and the levies, and keeps the account of the province’s defence.' }
];

function shell({ title, today, body, wide }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fondamento:ital@0;1&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap">
<link rel="stylesheet" href="/style.css?v=${CSS_V}"><link rel="icon" href="/favicon.svg"></head><body>
<div class="topbar"><span class="clock"><span class="eyebrow">${esc(today ? today.text : 'Fourth Era')}</span></span><span class="topright"><a class="btn ghost small" href="/login">Staff Entrance</a></span></div>
<div class="wrap${wide ? ' wide' : ''}">${body}
<div class="foot">Imperial Province of Skyrim ✦ Cyrodilic Administration ✦ Fourth Era</div></div></body></html>`;
}

function landingPage(today) {
  const cards = MINISTRIES.map(m => `<a class="mincard${m.open ? '' : ' shut'}" href="${m.href}">
    <div class="mincard-seal">${ministrySeal(m.key, m.ring)}</div>
    <div class="mincard-body">
      <div class="eyebrow">${esc(m.seat)}</div>
      <h2>${esc(m.name)}</h2>
      <p>${esc(m.blurb)}</p>
      <span class="mincard-go">${m.open ? 'Enter the Hall →' : 'Not yet established →'}</span>
    </div></a>`).join('');
  return shell({ title: 'The Imperial Ministries of Skyrim', today, wide: true, body: `<header class="mast landing-mast">
  <div class="eyebrow">By the Authority of the Governor</div>
  <div class="admin">Cyrodilic Administration for the Imperial Province of Skyrim</div>
  <h1 class="landing-title">The Imperial Ministries<br>of Skyrim</h1>
  <p class="landing-lede">Each Ministry of the province keeps its own hall, its own registers and its own officers. Choose the hall whose business you seek.</p>
  <div class="rule"></div></header>
  <div class="ministries">${cards}</div>` });
}

function ministryHolding(key, today) {
  const m = MINISTRIES.find(x => x.key === key);
  if (!m) return null;
  return shell({ title: m.name, today, body: `<header class="mast">
  <div class="eyebrow">By the Authority of the Governor</div>
  <div class="admin">Cyrodilic Administration for the Imperial Province of Skyrim</div>
  <div class="mast-row">${ministrySeal(m.key, m.ring)}<div><h1>${esc(m.name)}</h1><div class="minister">${esc(m.seat)}</div></div></div>
  <div class="rule"></div></header>
  <main><section class="holding">
    <h2>This hall is not yet open</h2>
    <p class="lede">${esc(m.blurb)}</p>
    <p class="notice">The ${esc(m.name)} has not yet been established upon this portal. Its registers, its officers and its writs will be entered here when the Governor’s Office establishes it.</p>
    <div class="linkrow"><a class="btn" href="/">← All Ministries</a><a class="btn ghost" href="/hall">Civil &amp; Administrative Affairs</a></div>
  </section></main>` });
}


function blanksFor(form, input) {
  const out = [];
  (form.sections || []).forEach(sec => {
    const party = !!sec.party;
    if (sec.kv) sec.kv.forEach(f => {
      if (f.type === 'fixed') return;
      const has = f.type === 'date'
        ? !!(input.d && input.d[f.id] && input.d[f.id].day)
        : !!(input.f && input.f[f.id]);
      if (party || !has) out.push({ id: f.id, label: f.label, type: f.type, options: f.options, required: party && !!f.required, party });
    });
    if (sec.lines) {
      const has = !!(input.f && input.f[sec.id]);
      if (party || !has) out.push({ id: sec.id, label: sec.h, type: 'para', lines: sec.lines, party });
    }
  });
  return out;
}

function filledFor(form, input) {
  const out = [];
  (form.sections || []).forEach(sec => {
    if (sec.kv) sec.kv.forEach(f => {
      if (f.type === 'fixed') { if (f.value) out.push([f.label, f.value]); return; }
      const v = f.type === 'date' ? (input.d && input.d[f.id]) : (input.f && input.f[f.id]);
      if (v) out.push([f.label, typeof v === 'object' ? [v.day, MONTHS[v.month] || v.month, '4E ' + v.year].filter(Boolean).join(' ') : v]);
    });
    if (sec.lines && input.f && input.f[sec.id]) out.push([sec.h, input.f[sec.id]]);
  });
  return out;
}

function signField(b, v) {
  const id = 'b_' + b.id;
  const lab = `${esc(b.label)}${b.required ? ' <span class="req">*</span>' : ''}`;
  if (b.type === 'para') return `<div class="field stackfield"><label class="l" for="${id}">${lab}</label><textarea id="${id}" name="f[${b.id}]" rows="${(b.lines || 4) + 1}" maxlength="6000">${esc((v.f && v.f[b.id]) || '')}</textarea></div>`;
  if (b.type === 'date') return `<div class="field"><span class="l">${lab}</span>${dateInput('d[' + b.id + ']', b.required, v.d && v.d[b.id])}</div>`;
  if (b.type === 'options') return `<div class="field"><span class="l">${lab}</span><div class="opts" role="radiogroup" aria-label="${esc(b.label)}">${(b.options || []).map(o => `<label><input type="radio" name="f[${b.id}]" value="${esc(o)}"${((v.f && v.f[b.id]) === o) ? ' checked' : ''}${b.required ? ' required' : ''}> ${esc(o)}</label>`).join('')}</div></div>`;
  return `<div class="field"><label class="l" for="${id}">${lab}</label><input type="text" id="${id}" name="f[${b.id}]" value="${esc((v.f && v.f[b.id]) || '')}"${b.required ? ' required' : ''} maxlength="300"></div>`;
}

function signPage({ cs, form, rec, input, blanks, csrf, today, prev, err, viewerSrc }) {
  const v = prev || { f: { ...(input.f || {}) }, d: { ...(input.d || {}) } };
  const facts = filledFor(form, input).filter(([l]) => !blanks.some(b => b.label === l)).slice(0, 18);
  const body = `<header class="mast">
  <div class="eyebrow">By the Authority of the Governor</div>
  <div class="admin">Cyrodilic Administration for the Imperial Province of Skyrim</div>
  <div class="mast-row">${SEAL}<div><h1>${esc(form.title)}</h1><div class="minister">${esc(rec['Record No'])} · laid before you by ${esc(cs.byName)}</div></div></div>
  <div class="rule"></div></header>
  <main>${err ? `<div class="flash err" role="status">${esc(err)}</div>` : ''}
  <section class="signwrap">
    <p class="lede">${esc(cs.byName)} has set down the greater part of this ${esc(form.title.toLowerCase())} and asks that you complete what remains and set your hand to it as <b>${esc(cs.role || 'the second signatory')}</b>.</p>
    ${cs.note ? `<p class="notice"><b>A word from ${esc(cs.byName)}:</b> ${esc(cs.note)}</p>` : ''}
    ${viewerSrc ? `<div class="section-label">The document as it stands</div><div class="linkrow"><a class="btn ghost small" href="${esc(viewerSrc)}" target="_blank" rel="noopener">Read the whole document</a></div>` : ''}
    <div class="section-label">What is already set down</div>
    ${facts.length ? `<dl class="meta">${facts.map(([l, x]) => `<dt>${esc(l)}</dt><dd class="pre">${esc(x)}</dd>`).join('')}</dl>` : '<p class="hint">Nothing has been entered yet.</p>'}
    <form class="writ" method="post" action="/sign/${esc(cs.token)}">${hidden(csrf)}
      ${blanks.length ? `<fieldset><legend><span class="rn">✦</span> What you must complete</legend><p class="hint">Anything marked <span class="req">*</span> must be answered before you may set your hand to it.</p>${blanks.map(b => signField(b, v)).join('')}</fieldset>` : ''}
      <fieldset><legend><span class="rn">✦</span> Your hand</legend>
        <p class="hint">Type your name and office to set your hand to this document. It will be sealed into the Ministry’s record and returned to ${esc(cs.byName)}.</p>
        <div class="field"><label class="l" for="signed">${esc(cs.role || 'Your signature')} <span class="req">*</span></label><input type="text" id="signed" name="signed" value="${esc(v.signed || cs.toName || '')}" required maxlength="160" placeholder="Name &amp; office"></div>
        <div class="field stackfield"><label class="l" for="reply">A word in reply, if you wish</label><textarea id="reply" name="reply" rows="3" maxlength="1200">${esc(v.reply || '')}</textarea></div>
      </fieldset>
      <div class="linkrow"><button class="btn" name="act" value="sign" type="submit">Set my hand to it</button><button class="btn ghost" name="act" value="decline" type="submit">Decline</button></div>
    </form>
  </section></main>`;
  return shell({ title: 'For your hand · ' + rec['Record No'], today, body });
}

function signDone({ title, text, today }) {
  return shell({ title, today, body: `<header class="mast"><div class="mast-row">${SEAL}<div><h1>${esc(title)}</h1></div></div><div class="rule"></div></header>
  <main><section class="holding"><p class="lede">${esc(text)}</p></section></main>` });
}

module.exports = { esc, hidden, recUrl, can, SEAL, statusChip, layout, nav, staffTabs, dateInput, holdSelect, holdNames, proclamation, publicHome, noticeBoard, proclamationPrint, idCardPrint, petitionBox, petitionReceived, petitionStatus, recordLookup, directory, licenses, laws, message, loginPage, passwordPage, landingPage, ministryHolding, MINISTRIES, signPage, signDone, blanksFor, filledFor };
