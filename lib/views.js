const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const C = require('./config');
const Ranks = require('./ranks');
const Desk = require('./desk');
const TabUse = require('./tabuse');

const { MONTHS } = require('./skyrim');

const assetV = f => { try { return crypto.createHash('md5').update(fs.readFileSync(path.join(__dirname, '..', 'public', f))).digest('hex').slice(0, 10); } catch (_) { return String(Date.now()); } };
const CSS_V = assetV('style.css');
const JS_V = assetV('recsuggest.js');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hidden = csrf => `<input type="hidden" name="_csrf" value="${esc(csrf)}">`;
const recUrl = no => '/staff/records/' + encodeURIComponent(no);
const slug = v => String(v || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const can = (u, p) => Ranks.can(u, p);

const SEAL = `<svg class="seal" viewBox="0 0 120 120" role="img" aria-label="Seal of the Ministry"><defs><path id="ring" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0"/></defs><circle cx="60" cy="60" r="57" fill="#6B1414"/><circle cx="60" cy="60" r="53" fill="none" stroke="#D9BE84" stroke-width="1.5"/><circle cx="60" cy="60" r="34" fill="none" stroke="#D9BE84" stroke-width="1"/><text font-family="EB Garamond, Georgia, serif" font-size="8.3" letter-spacing="1.1" fill="#F1E6CC" font-weight="600"><textPath href="#ring" startOffset="1%">MINISTRY OF CIVIL &amp; ADMINISTRATIVE AFFAIRS &#10022;</textPath></text><g fill="#D9BE84"><polygon points="60,33 64,54 85,60 64,66 60,87 56,66 35,60 56,54"/><polygon points="60,44 62.5,57.5 76,60 62.5,62.5 60,76 57.5,62.5 44,60 57.5,57.5" fill="#6B1414"/><circle cx="60" cy="60" r="3.2"/></g></svg>`;

const STATUS_CLASS = { Received: 'ok', Open: 'ok', 'Under Review': 'ok', 'Awaiting Seal': 'warn', Returned: 'warn', Standing: 'standing', Referred: '', Revoked: 'warn', Closed: '', Archived: '' };
const statusChip = s => `<span class="chip ${STATUS_CLASS[s] || ''}">${esc(s || '—')}</span>`;

const PUBLIC_TABS = [['/hall', 'The Hall', 'home'], ['/guide', 'Questions & Answers', 'guide'], ['/notices', 'Notice Board', 'notices'], ['/petition', 'Petition Box', 'petition'], ['/records', 'Record Lookup', 'records'], ['/directory', 'Directory', 'directory'], ['/licenses', 'Register of Licenses', 'licenses'], ['/heraldry', 'Ledger of Heraldry', 'heraldry'], ['/gazette', 'The Gazette', 'gazette'], ['/seals', 'Seals', 'seals'], ['/laws', 'Ledger of Laws', 'laws']];
const STAFF_TABS = [
  ['/staff', 'My Desk', 'desk', ['desk'], 'desk'],
  ['/staff/clerk', 'Clerk Desk', 'clerk', ['clerk'], 'desk'],
  ['/staff/week', 'Your Week', 'week', ['file'], 'desk'],
  ['/staff/letters', 'Letters', 'letters', ['desk'], 'mail'],
  ['/staff/guide', 'What You May Do', 'guide', ['desk'], 'office'],
  ['/staff/roll', 'Roll of Office', 'roll', ['desk'], 'office'],
  ['/staff/forms', 'Writs', 'forms', ['file'], 'desk'],
  ['/staff/offices', 'Offices', 'offices', ['file', 'docket'], 'records'],
  ['/staff/docket', 'Docket', 'docket', ['docket', 'allrecords'], 'records'],
  ['/staff/officers', 'Officers', 'officers-desk', ['docket', 'allrecords', 'officers'], 'records'],
  ['/staff/delegates', 'The Delegates', 'delegates', ['officers'], 'records'],
  ['/staff/people', 'People', 'people', ['docket', 'allrecords', 'petitions'], 'records'],
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
const hasQuotaRank = u => { try { const r = Ranks.get(u && u.rank); return !!(r && r.quota); } catch (_) { return false; } };
const staffTabs = u => STAFF_TABS.filter(t => t[3].some(p => can(u, p)) && !(u.all && t[2] === 'requests') && !(t[2] === 'offices' && !(u.depts || []).length) && !(t[2] === 'week' && !hasQuotaRank(u)));

function tabLink(h, l, k, active, badges) {
  return `<a href="${h}"${k === active ? ' class="on" aria-current="page"' : ''}>${esc(l)}${badges && badges[k] ? ` <span class="badge">${badges[k]}</span>` : ''}</a>`;
}

const GROUP_NAMES = { desk: 'Your work', records: 'Records', mail: 'Post', office: 'The office', admin: 'The Ministry' };

function nav(user, active, badges) {
  const staffUser = user && Ranks.isStaff(user);
  const pubTabs = PUBLIC_TABS.map(([h, l, k]) => tabLink(h, l, k, active, badges)).join('');
  const pub = `<div class="tabs-inner pub${staffUser ? ' quiet' : ''}"><span class="rowtag pubtag" title="Open to anyone">Public</span>${pubTabs}</div>`;
  const staff = staffUser ? staffTabs(user) : [];
  let staffRow = '';
  if (staff.length) {
    const { out, more } = TabUse.split(user.username, staff, active);
    let html = '', lastGroup = null;
    for (const [h, l, k, , g] of out) {
      if (lastGroup !== null && g !== lastGroup) html += '<span class="tabsep" aria-hidden="true"></span>';
      html += tabLink(h, l, k, active, badges);
      lastGroup = g;
    }
    let moreHtml = '';
    if (more.length) {
      const byGroup = {};
      more.forEach(t => { (byGroup[t[4]] = byGroup[t[4]] || []).push(t); });
      const inner = Object.keys(byGroup).map(g => `<div class="mgroup"><div class="mh">${esc(GROUP_NAMES[g] || g)}</div>${byGroup[g].map(([h, l, k]) => {
        const n = badges && badges[k];
        return `<a href="${h}"${k === active ? ' class="on"' : ''}>${esc(l)}${n ? ` <span class="badge">${esc(String(n))}</span>` : ''}</a>`;
      }).join('')}</div>`).join('');
      const anyBadge = more.some(t => badges && badges[t[2]]);
      moreHtml = `<span class="tabsep" aria-hidden="true"></span><div class="moretab"><button type="button" class="morebtn" id="morebtn" aria-expanded="false" aria-controls="moremenu">More${anyBadge ? ' <span class="badge dot">\u00b7</span>' : ''} <span class="caret">\u25be</span></button><div class="moremenu" id="moremenu" hidden>${inner}</div></div>`;
    }
    const jump = `<button type="button" class="jumpbtn" id="jumpbtn" title="Go to a page, record or person"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M16 16l5 5"></path></svg> Go to\u2026 <span class="key">/</span></button>`;
    staffRow = `<div class="tabs-inner staff"><span class="rowtag stafftag" title="Only officers of the Ministry may open these">Staff</span>${html}${moreHtml}${jump}</div>`;
  }
  return `<nav class="tabs" aria-label="Ministry sections">${pub}${staffRow}</nav>${staff.length ? jumpBox(user, staff) : ''}`;
}

function jumpBox(user, staff) {
  const rows = staff.map(([h, l]) => ({ h, l }));
  return `<div class="jumpveil" id="jumpveil" hidden>
    <div class="jumpcard" role="dialog" aria-modal="true" aria-label="Go to">
      <input type="text" id="jumpinput" autocomplete="off" placeholder="A page, a record number, a person\u2026" aria-label="Go to">
      <div class="jumplist" id="jumplist"></div>
      <div class="jumphint">Enter to go \u00b7 Esc to close</div>
    </div>
    <script type="application/json" id="jumpdata">${JSON.stringify(rows)}</script>
  </div>`;
}

// The province has weather, and it knows which. Every month falls in a season:
// snow in the deep cold, rain in the growing months, a warm haze at the height
// of the year, and leaves coming down in the fall.
const SEASONS = ['snow', 'snow', 'rain', 'rain', 'rain', 'sun', 'sun', 'sun', 'leaf', 'leaf', 'leaf', 'snow'];
function seasonOf(today) {
  const m = today && typeof today.month === 'number' ? today.month : -1;
  return SEASONS[m] || 'none';
}

function layout({ title, user, active, body, flash, csrf, today, badges, head, war, justice, finance, branch, ground, siteGround, siteCursor, entered, staffRoom, desk, letter }) {
  const bodyClasses = [siteGround === 'lamplit' ? 'lamplit' : '', ground ? 'ground-' + ground : '', 'season-' + seasonOf(today), ...handClasses(siteCursor), entered ? 'entered' : ''].filter(Boolean).join(' ');
  const key = branch || (war ? 'war' : justice ? 'justice' : finance ? 'finance' : 'civil');
  const site = SITES[key] || SITES.civil;
  const own = key !== 'civil';
  const bell = user && !desk ? `<a class="bell" href="/staff/notifications" title="Notifications">\ud83d\udd14${badges && badges.notify ? ` <span class="badge">${badges.notify}</span>` : ''}</a>` : '';
  const deskBtn = user && desk ? Desk.button(desk) : '';
  const who = user
    ? `${deskBtn}${bell}<span class="who">${esc(user.name)} \u00b7 ${esc(user.title)}</span>${staffRoom ? '<a class="btn ghost small" href="/province/staff">Staff Room</a>' : ''}<a class="btn ghost small" href="/staff/profile">Profile</a><form method="post" action="/logout" style="display:inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Leave the Hall</button></form>`
    : `<a class="btn ghost small" href="/login">Staff Entrance</a>`;
  const head1 = own
    ? `<h1><a href="${site.home}">${site.h1}</a></h1><div class="minister">${esc(site.sub)}</div>`
    : `<h1><a href="/hall">${site.h1}</a></h1><div class="minister">Provincial Ministry of State \u00b7 Minister: <b>${esc(C.MINISTER_NAME)}</b></div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light">
<title>${esc(title && title !== site.name ? title + ' \u00b7 ' + site.name : site.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fondamento:ital@0;1&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap">
<link rel="stylesheet" href="/style.css?v=${CSS_V}"><link rel="icon" href="/favicon.svg"><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#6B1414"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Ministry"><meta name="application-name" content="Ministry"><script src="/recsuggest.js?v=${JS_V}" defer></script><script src="/motion.js?v=${assetV('motion.js')}" defer></script><script src="/app.js?v=${assetV('app.js')}" defer></script>${head || ''}</head><body${bodyClasses ? ` class="${esc(bodyClasses)}"` : ''}>
<div class="topbar"><span class="clock"><a class="ministries-link" href="/" title="All Imperial Ministries">\u2726 Ministries</a> <span class="eyebrow daystamp">${esc(today ? today.text : 'Fourth Era')}</span> <span id="clock" class="hour"></span></span><span class="topright">${who}</span></div>
${user && desk ? Desk.panel(desk, csrf) : ''}
<div class="wrap"><header class="mast">
<div class="eyebrow">By the Authority of the Governor</div>
<div class="admin">Cyrodilic Administration for the Imperial Province of Skyrim</div>
<div class="mast-row">${own ? ministrySeal(key, site.ring) : SEAL}<div>${head1}</div></div>
<div class="rule"></div></header></div>
${own ? '' : nav(user, active, badges)}
<div class="wrap"><main>${flash ? `<div class="flash${flash.err ? ' err' : ''}${flash.seal ? ' sealed' : ''}${flash.gavel ? ' struck' : ''}" role="status"${flash.coins ? ` data-coins="${Math.max(1, Math.min(12, Number(flash.coins) || 6))}"` : ''}>${flash.seal ? `<span class="flashwax" aria-hidden="true">${waxMark()}</span>` : ''}${flash.gavel ? gavelMark() : ''}<span>${flash.html || esc(flash.text)}</span></div>` : ''}${body}</main>
<div class="foot">Imperial Province of Skyrim \u2726 ${esc(site.name)} \u2726 Fourth Era<br><span class="footlinks"><a href="/download">Get the app</a> \u00b7 <a href="/privacy">Privacy</a> \u00b7 <a href="/terms">Terms of Use</a> \u00b7 <span class="footnote">A fan work. Not affiliated with Bethesda Softworks or ZeniMax Media.</span></span></div></div>
<script>(function(){var el=document.getElementById('clock');if(!el)return;function t(){var d=new Date(),h=d.getHours(),m=('0'+d.getMinutes()).slice(-2),p=h<5?'in the deep of night':h<12?'in the morning':h<17?'in the afternoon':h<21?'in the evening':'at night';el.textContent='\u00b7 '+((h%12)||12)+':'+m+' '+p;}t();setInterval(t,30000);})();</script>
${letter || ''}${user && desk ? Desk.SCRIPT : ''}${user ? `<script src="/nav.js?v=${assetV('nav.js')}" defer></script>` : ''}${user && (!user.prefs || user.prefs.glossary !== false) ? `<script type="application/json" id="glossary-data">${JSON.stringify(Object.fromEntries(require('./guide').TERMS))}</script><script src="/glossary.js?v=${assetV('glossary.js')}" defer></script>` : ''}
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
<script src="/vendor/html2canvas.min.js" defer></script><script src="/savepic.js" defer></script></head>
<body class="printbody"><div class="printbar"><a class="btn ghost" href="javascript:history.back()">← Back</a><button class="btn" onclick="window.print()">Print</button><button class="btn ghost" id="pic" data-target="scroll" data-scale="2" data-name="${esc(String(n['Record No']).replace(/\s+/g, '_'))}">Save as picture</button></div>
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
<script src="/vendor/html2canvas.min.js" defer></script><script src="/savepic.js" defer></script></head>
<body class="printbody"><div class="printbar noprint"><a class="btn ghost" href="javascript:history.back()">← Back</a><button class="btn" onclick="window.print()">Print</button><button class="btn ghost" id="pic" data-target="idcard" data-scale="2" data-name="${esc(String(p.username).replace(/\s+/g, '_') + '_id')}">Save as picture</button></div>
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

</body></html>`;
}

function petitionBox(csrf, v, closed, today) {
  const val = k => esc((v && v[k]) || '');
  const natures = ['Grievance', 'Request', 'Request for Records', 'License Application', 'Audience with an Officer', 'Public Information', 'Other'];
  return `<section><h2>The Petition Box</h2>
  <p class="lede">Any subject of the Empire may set down a grievance or a request here. It is entered upon the Ministry’s rolls as a Petition, given a number, and laid before the proper officer. Keep your number: with it you may ask after your petition at any time.</p>
  ${closed ? `<p class="notice"><b>The Petition Box is shut for the moment.</b> ${esc(closed)} Seek out a clerk or Delegate of the Ministry in your Hold instead.</p>` : `
  <form class="writ petbox" method="post" action="/petition">${hidden(csrf)}
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

function petitionReceived(no, date, held) {
  return sealPress({
    eyebrow: 'Received by the Ministry',
    no,
    lede: `Your petition is entered upon the rolls on ${esc(date)}. Keep this number. Give it to any officer of the Ministry, or ask after it here.${held ? ' The rolls are being copied at present, so it may be a short while before the number answers at the desk. The number is yours and will not be given to another.' : ''}`,
    links: `<a class="btn" href="/petition/status?no=${encodeURIComponent(no)}">See its status</a><a class="btn ghost" href="/hall">Return to the Hall</a>`
  });
}


const GUIDE_ASKS = [
  {
    want: 'Something set right, or something asked of the Ministry',
    how: 'Lay a petition in the Petition Box',
    href: '/petition', cta: 'The Petition Box',
    back: 'A number of your own. Keep it — with it you may ask after your petition at any time, and no officer can lose it.'
  },
  {
    want: 'To know what became of a petition you already laid',
    how: 'Give its number at the petition desk',
    href: '/petition/status', cta: 'Ask after a petition',
    back: 'Its standing only: received, under review, referred, or closed. What is written inside stays with the Ministry.'
  },
  {
    want: 'A copy of a record, or to know whether one exists',
    how: 'Search the public rolls; if it is not there, lay a petition asking for it',
    href: '/records', cta: 'Record Lookup',
    back: 'The record itself if it is public. If it is not, the Ministry will tell you whether it may be opened to you.'
  },
  {
    want: 'Leave to print, to cry news, or to carry on a trade the law entrusts to this Ministry',
    how: 'Lay a petition naming the law under which you ask',
    href: '/licenses', cta: 'Register of Licenses',
    back: 'A License of the Ministry, with its term and its conditions written on it, and your name entered in the public register.'
  },
  {
    want: 'To take a new name upon the rolls',
    how: 'Lay a petition asking for a Writ of Change of Name',
    href: '/petition', cta: 'The Petition Box',
    back: 'A Writ of Change of Name, which you fill in and sign yourself, and the Ministry’s rolls amended to answer to it.'
  },
  {
    want: 'An audience with an officer of the Ministry',
    how: 'Lay a petition, or write to the officer through the Directory',
    href: '/directory', cta: 'The Directory',
    back: 'A Request for an Audience sent to you, on which you set the day, the hour and the place, and sign.'
  },
  {
    want: 'To know what the law is',
    how: 'Read the Ledger of Laws',
    href: '/laws', cta: 'Ledger of Laws',
    back: 'The law as this Ministry holds it. For an authoritative reading of a law, the Ministry of Justice answers, not this one.'
  },
  {
    want: 'To bring a crime, a dispute, or a complaint against an official',
    how: 'Lay it before the Ministry of Justice, not this one',
    href: '/justice/lay', cta: 'Lay a Matter before Justice',
    back: 'A number and a receipt from Justice. This Ministry keeps no court and gives no judgment.'
  },
  {
    want: 'To write to the Legion — about a soldier, a garrison, or a matter of the province’s defence',
    how: 'Send a letter to the Imperial War Office',
    href: '/war-office/letters', cta: 'Send a Letter',
    back: 'An answer from the Office, and your letter entered upon its post.'
  }
];

const GUIDE_GIVES = [
  ['A Petition', 'Your own words entered upon the rolls, with a number you keep. Everything a subject asks of this Ministry begins here.'],
  ['A License of the Ministry', 'Leave to carry on an activity the law places with this Ministry — the press, printing, and the like — with its term and conditions written plainly on it.'],
  ['A Writ of Change of Name', 'The record of a subject laying down one name and taking another. You fill in your own part and sign it; the Ministry amends its rolls to answer to the new name.'],
  ['A Request for an Audience', 'Sent by the Ministry when it wishes to meet you. You set the day, the hour and the place, and sign it back.'],
  ['A Public Notice', 'What the Ministry declares to the province. These stand on the Notice Board and anyone may read them.'],
  ['A Certificate of Authentication', 'The Ministry compared a paper against its own records and certifies what it found. An administrative finding, not a judgment.'],
  ['A Finding of an Inquiry', 'What an Imperial Adjudicator established as fact. The Adjudicator finds facts and refers crimes; the Adjudicator does not prosecute.'],
  ['A Dispatch or an Accord', 'The record of what a Delegate did in your Hold, or of an understanding freely made between parties and witnessed by the Ministry.'],
  ['A Copy of a Record', 'Any record the Ministry has made public, bearing its number and the date it was entered.']
];

const GUIDE_QUESTIONS = [
  ['Does it cost anything?',
   'No. No officer of this Ministry may set a fee or a requirement by office custom. If a fee is lawful it is written in the law itself, and the officer must show you where. Anyone who asks you for coin to move your matter along is not acting for this Ministry, and you should say so in a petition.'],
  ['How long will it take?',
   'It depends on what you ask and how many matters stand ahead of yours. The Ministry does not promise a day. What it does promise is that your petition has a number from the moment it is laid, that the number does not move, and that you may ask after it whenever you like.'],
  ['Who will read what I write?',
   'The officers of the branch your matter belongs to, and those above them. A petition is not published. What appears on the public rolls is only what the Ministry has marked public, and it marks a thing public by deciding to, not by accident.'],
  ['Can I write on behalf of someone else?',
   'Yes. Name yourself and name them, and say plainly in what standing you write — kin, steward, advocate, or friend. If the matter is theirs and not yours, the Ministry may need to hear from them before it acts.'],
  ['What if my matter belongs to another Ministry?',
   'Say so or do not — the Ministry will see it either way, and refer it with its records to whoever it belongs to. You will be told where it went. The table further down shows where most things go.'],
  ['What if I am not a citizen of the Empire?',
   'The Petition Box is open to any person in the province. Some things — a license, an office, an entry upon certain rolls — the law may reserve. Where it does, the Ministry will tell you which law, not merely that the answer is no.'],
  ['Can the Ministry arrest me, fine me, or judge me?',
   'No. This Ministry keeps rolls, issues instruments, and carries word between offices. It holds no court, keeps no gaol and commands no soldier. Arrest and judgment belong to the Ministry of Justice and the Legion. If an officer of this Ministry tells you otherwise, they are exceeding their office.'],
  ['Someone showed me a paper with this Ministry’s seal. How do I know it is real?',
   'Bring it to any clerk and ask. Papers of the Ministry of Justice carry a check-number you can ask after yourself. For a record of this Ministry, search the rolls by its number — if nothing answers to it, the paper did not come from here.'],
  ['Can I see who works here?',
   'Yes. The Directory lists every officer and the office they hold, and says plainly where an office stands vacant. If an officer will not give you their name and rank, that is itself a matter you may petition about.'],
  ['I disagree with what the Ministry decided.',
   'Say so in a petition and set down why. If the decision was an administrative one of this Ministry, it will be looked at again. If it was a judgment of the bench, the appeal lies with the Ministry of Justice and not with us.']
];

function publicGuide(routes) {
  const ask = a => `<article class="askcard">
    <div class="ask-want">${esc(a.want)}</div>
    <div class="ask-how">${esc(a.how)}</div>
    <div class="ask-back"><span class="ask-lead">What you get back</span>${esc(a.back)}</div>
    <div class="linkrow"><a class="btn ghost small" href="${a.href}">${esc(a.cta)}</a></div>
  </article>`;
  return `<section>
    <h2>Questions and Answers</h2>
    <p class="lede">What this Ministry is for, what it gives out, what you may ask of it, and where to go when the matter is not ours. If your question is not answered here, lay it in the Petition Box and it will be.</p>

    <div class="section-label">Start Here</div>
    <div class="guiderow">
      <a class="guidetile" href="/petition"><span class="gt-h">Ask something of the Ministry</span><span class="gt-b">Lay a petition. You get a number the same moment, and the number is yours to keep.</span></a>
      <a class="guidetile" href="/petition/status"><span class="gt-h">Ask after a petition</span><span class="gt-b">Give the number you were issued and you will be told where your matter stands.</span></a>
      <a class="guidetile" href="/records"><span class="gt-h">Find a record</span><span class="gt-b">Every record the Ministry has made public. Start typing and the rolls will offer what they hold.</span></a>
    </div>

    <div class="section-label">What This Ministry Is</div>
    <p>The Ministry of Civil and Administrative Affairs keeps the civil rolls of the Imperial Province of Skyrim. It records what is done, issues the instruments the law places with it, carries word between the offices of the province, and sends Delegates to the Holds so that the Empire and the Jarls may deal with one another in good order.</p>
    <p>It is worth saying plainly what it is <b>not</b>. This Ministry gives no judgment and hears no trial; that is the Ministry of Justice. It commands no soldier and holds no fort; that is the Imperial War Office. It recognises no noble title and grants no arms; that rests with the Governor, and this Ministry may only receive declarations under written delegation. An officer who claims otherwise is exceeding their office, and you may say so in a petition.</p>

    <div class="section-label">What You May Ask, and What Comes Back</div>
    <div class="askgrid">${GUIDE_ASKS.map(ask).join('')}</div>

    <div class="section-label">What the Ministry Gives Out</div>
    <p class="hint">Every instrument below is a real document with a number, a date and a hand that signed it. If you are given one, it is entered upon the rolls the same day.</p>
    <div class="tablewrap"><table class="ledger"><thead><tr><th>Instrument</th><th>What it is</th></tr></thead><tbody>
      ${GUIDE_GIVES.map(([n, d]) => `<tr><td><b>${esc(n)}</b></td><td>${esc(d)}</td></tr>`).join('')}
    </tbody></table></div>

    <div class="section-label">Questions People Ask</div>
    <div class="faq">${GUIDE_QUESTIONS.map(([q, a]) => `<details class="faqitem"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>

    <div class="section-label">If the Matter Is Not Ours</div>
    <p class="hint">The Ministry will refer your matter itself and tell you where it went. This is only so you know beforehand.</p>
    <div class="tablewrap"><table class="ledger"><thead><tr><th>The matter</th><th>Where it belongs</th></tr></thead><tbody>
      ${(routes || []).map(([m, w]) => `<tr><td>${esc(m)}</td><td>${esc(w)}</td></tr>`).join('')}
    </tbody></table></div>

    <div class="section-label">The Other Ministries</div>
    <div class="guiderow">
      <a class="guidetile" href="/justice"><span class="gt-h">The Ministry of Justice</span><span class="gt-b">Crimes, disputes, appeals and complaints against officials. Lay a matter, read the judgments, check a paper you have been handed.</span></a>
      <a class="guidetile" href="/war-office"><span class="gt-h">The Imperial War Office</span><span class="gt-b">The Legion in Skyrim — its garrisons, its ranks and its holdings. Write to the Office if your matter touches a soldier.</span></a>
    </div>
  </section>`;
}

function recordCard(r) {
  return `<article class="proclamation"><div class="no">${esc(r['Record No'])}${r.Class ? ' · ' + esc(r.Class) : ''}${r.Hold ? ' · ' + esc(r.Hold) : ''}</div>
  <h3>${esc(r.Subject)}</h3>
  <div class="date">${esc(r['Date (4E)'])}</div>
  ${r.Summary ? `<div class="body">${esc(r.Summary)}</div>` : ''}
  <div class="linkrow"><a class="btn ghost small" href="/proclamation/${encodeURIComponent(r['Record No'])}">Read the full record</a></div></article>`;
}

function recordLookup(q, rows, ctx) {
  ctx = ctx || {};
  const classes = ctx.classes || [];
  const recent = ctx.recent || [];
  const cls = ctx.cls || '';
  const chip = (label, value) => `<a class="rfilter${value === cls ? ' on' : ''}" href="/records${value ? '?class=' + encodeURIComponent(value) : ''}">${esc(label)}</a>`;
  return `<section><h2>Record Lookup</h2>
  <p class="lede">Every record the Ministry has made public — proclamations, notices, released findings, licenses and other matters open to any subject. You need not know its number: start typing any part of the subject and the rolls will offer what they hold, or simply browse below. For a record not yet public, lay a petition before the Ministry.</p>

  <form class="search-box" method="get" action="/records" autocomplete="off">
    <input type="search" name="q" id="recq" value="${esc(q || '')}" list="recnos" placeholder="A name, a word from the subject, or a record number" aria-label="Search public records">
    <datalist id="recnos"></datalist>
    <button class="btn" type="submit">Search</button>
  </form>
  ${classes.length ? `<div class="rfilters">${chip('Everything', '')}${classes.map(c => chip(c.name + ' (' + c.n + ')', c.name)).join('')}</div>` : ''}

  ${rows === null ? '<p class="notice" style="margin-top:18px">The Ministry’s rolls are being prepared.</p>'
    : rows === undefined ? (recent.length
        ? `<div class="section-label">${cls ? esc(cls) : 'Lately Made Public'}</div>
           <p class="hint">${cls ? 'Every ' + esc(cls.toLowerCase()) + ' open to the public.' : 'The newest records upon the public rolls. Search above for anything older.'}</p>
           <div class="board" style="margin-top:14px">${recent.map(recordCard).join('')}</div>`
        : '<p class="notice" style="margin-top:18px">The Ministry has made nothing public yet.</p>')
    : !rows.length ? `<p class="notice" style="margin-top:18px">No public record answers to “${esc(q)}”. Try a single word — a name, a Hold, or the kind of record you want.</p>
        ${recent.length ? `<div class="section-label">Lately Made Public</div><div class="board" style="margin-top:14px">${recent.slice(0, 6).map(recordCard).join('')}</div>` : ''}`
    : `<div class="section-label">${rows.length} record${rows.length === 1 ? '' : 's'} answering to “${esc(q)}”</div><div class="board" style="margin-top:14px">${rows.map(recordCard).join('')}</div>`}

  <script>(function(){
    var i=document.getElementById('recq'),dl=document.getElementById('recnos'),t=null,cache={};
    if(!i||!dl)return;
    function put(list){dl.innerHTML='';for(var k=0;k<list.length;k++){var o=document.createElement('option');o.value=list[k].no;o.label=list[k].subject||'';dl.appendChild(o);}}
    i.addEventListener('input',function(){var v=i.value.trim();if(v.length<2){dl.innerHTML='';return;}
      if(cache[v]){put(cache[v]);return;}
      clearTimeout(t);t=setTimeout(function(){
        fetch('/records/suggest?q='+encodeURIComponent(v)).then(function(r){return r.ok?r.json():[];})
          .then(function(l){if(!Array.isArray(l))l=[];cache[v]=l;put(l);}).catch(function(){});
      },160);
    });
  })();</script>
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
    ${people.length ? people.map(p => `<div class="dir-name${p.arms ? ' witharms' : ''}">${p.arms ? require('./arms').svg(p.arms, { size: 30, label: p.name }) : ''}<span>${esc(p.name)}${p.office && p.office !== r.name ? `<span class="dir-office">${esc(p.office)}</span>` : ''}${p.holds.length ? `<span class="dir-office">${esc(holdNames(p.holds))}</span>` : ''}</span></div>`).join('') : '<div class="dir-vacant">Office vacant</div>'}</div>`;
  };
  const listed = ranks.filter(r => r.directory);
  const group = g => listed.filter(r => r.group === g);
  const holds = Ranks.HOLDS.map(h => {
    const d = officers.filter(o => o.active && o.listed && o.holds.includes(h.id));
    return `<tr><td><b>${esc(h.name)}</b><br><span class="small">${esc(h.seat)}</span></td><td>${d.length ? d.map(o => `${esc(o.name)} <span class="small">· ${esc(o.rankName)}</span>`).join('<br>') : '<i>Through the Imperial Envoy to the Holds</i>'}</td></tr>`;
  }).join('');
  const SHOWN = ['Ministry', 'Civil Office', 'Administrative Office'];
  const extras = Ranks.GROUPS.filter(g => !SHOWN.includes(g) && group(g).some(r => by(r.id).length));
  const otherGroups = extras.map(g => `<div class="dir-other${g === 'Imperial War Office' ? ' war' : ''}">
    <div class="section-label">${esc(g)}</div>
    <p class="hint">${g === 'Imperial War Office' ? 'Officers of the Legion. They keep their own hall, rolls and treasury.' : 'Recorded here for reference. They are not officers of this Ministry.'}</p>
    <div class="dir-list">${group(g).map(card).join('')}</div>
    ${g === 'Imperial War Office' ? '<div class="linkrow"><a class="btn ghost small" href="/war-office">Visit the Imperial War Office</a></div>' : ''}
  </div>`).join('');
  return `<section><h2>Directory of the Ministry</h2><p class="lede">The officers who keep the Ministry of Civil and Administrative Affairs, and the Delegate who answers for each Hold.</p>
  <div class="dir-top">${group('Ministry').map(card).join('')}</div>
  <div class="two" style="margin-top:18px">
    <div class="panel double"><h3>Civil Office</h3><div class="dir-list">${group('Civil Office').map(card).join('')}</div></div>
    <div class="panel double"><h3>Administrative Office</h3><div class="dir-list">${group('Administrative Office').map(card).join('')}</div></div>
  </div>
  <div class="section-label">The Delegate for Each Hold</div>
  <div class="tablewrap"><table class="ledger"><thead><tr><th>Hold</th><th>Answering officer</th></tr></thead><tbody>${holds}</tbody></table></div>
  ${otherGroups}</section>`;
}

function licenses(list, note, heraldry) {
  return `<section><h2>Register of Licenses</h2><p class="lede">Every license in force under the seal of this Ministry. A press or printing house not named here holds no license from the Ministry.</p>
  ${note ? `<p class="notice">${esc(note)}</p>` : ''}
  ${list && list.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>License</th><th>Holder</th><th>Kind</th><th>Hold</th><th>Issued</th><th>Expires</th></tr></thead><tbody>
  ${list.map(l => `<tr id="l-${esc(slug(l.no))}"><td class="num">${esc(l.no)}</td><td><b>${esc(l.holder)}</b>${l.press ? `<br><span class="small">${esc(l.press)}</span>` : ''}</td><td>${esc(l.kind || '—')}</td><td>${esc(l.hold || '—')}</td><td>${esc(l.issued || '—')}</td><td>${esc(l.expires || 'Until revoked')}</td></tr>`).join('')}
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

function appHandoff(code) {
  const url = 'ministry://auth?code=' + encodeURIComponent(code);
  return `<section style="text-align:center;padding:40px 0">
    <h2>Back to the Ministry</h2>
    <p class="lede" style="max-width:520px;margin:0 auto 10px">Your Discord is accepted. The hall is opening in the app.</p>
    <p class="hint" style="max-width:520px;margin:0 auto 26px">If nothing happens, the app may not be installed on this machine. You can carry on here in the browser instead.</p>
    <div class="linkrow" style="justify-content:center">
      <a class="btn" href="${esc(url)}">Open the app</a>
      <a class="btn ghost" href="/auth/app/claim?code=${encodeURIComponent(code)}">Stay in this browser</a>
    </div>
    <p class="hint" style="margin-top:22px">This one-time code lapses in two minutes and can be used once.</p>
  </section>
  <script>setTimeout(function(){location.href=${JSON.stringify(url)};},400);</script>`;
}

function message(title, text) {
  return `<section><h2>${esc(title)}</h2><p class="lede">${text}</p><div class="linkrow"><a class="btn" href="/hall">Return to the Hall</a></div></section>`;
}

const DISCORD_MARK = `<svg viewBox="0 0 24 18" width="20" height="15" aria-hidden="true" focusable="false"><path fill="currentColor" d="M20.3 1.6A19.8 19.8 0 0 0 15.4.1a14 14 0 0 0-.6 1.3 18.3 18.3 0 0 0-5.5 0A14 14 0 0 0 8.6.1 19.7 19.7 0 0 0 3.7 1.6C.6 6.2-.3 10.6.2 15a19.9 19.9 0 0 0 6 3 14.6 14.6 0 0 0 1.3-2.1 13 13 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12 0l.5.4a13 13 0 0 1-2 1 14.4 14.4 0 0 0 1.3 2.1 19.8 19.8 0 0 0 6-3c.6-5.1-.8-9.5-3.5-13.4ZM8 12.3c-1.2 0-2.1-1.1-2.1-2.4S6.8 7.5 8 7.5s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z"/></svg>`;

function loginPage(csrf, error, username, opts) {
  const o = opts || {};
  const to = o.to ? '?to=' + encodeURIComponent(o.to) : '';
  return `<section><h2>Staff Entrance</h2><p class="lede">Officers of the Ministry, and officers of the Crown and the other Ministries, enter with the name and password issued by the Minister. Visitors may read the <a href="/notices">Notice Board</a> without entering.</p>
  ${error ? `<p class="flash err">${esc(error)}</p>` : ''}
  <div class="lockplate"><i class="o"></i><i class="s"></i><span class="lockkey"><span class="bow"></span><span class="shaft"></span><span class="bit"></span></span></div>
  ${o.discord ? `<div class="entryways" style="max-width:520px">
    <a class="btn big discordbtn" href="/auth/discord/login${to}">${DISCORD_MARK} Enter with Discord</a>
    <p class="hint" style="margin:8px 0 0">Only if you have already linked it from your Profile. If you have not, enter by name below and link it once you are in.</p>
    <div class="orline"><span>or</span></div>
  </div>` : ''}
  <form class="writ" method="post" action="/login" style="max-width:520px">${hidden(csrf)}
    ${o.to ? `<input type="hidden" name="to" value="${esc(o.to)}">` : ''}
    <div class="field"><label class="l" for="u">Username</label><input type="text" id="u" name="username" value="${esc(username || '')}" required autocomplete="username" autocapitalize="none" spellcheck="false"></div>
    <div class="field"><label class="l" for="p">Password</label><input type="password" id="p" name="password" required autocomplete="current-password"></div>
    <div class="submitbar"><button class="btn big" type="submit">Enter the Hall</button><span class="hint" style="margin:0">Forgotten your password? Ask the Minister to reset it.</span></div>
  </form>
  <div class="appnote">
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="2.5" y="4" width="19" height="13" rx="1.5"/><path d="M8 20h8M12 17v3"/></svg>
    <span>The Ministry can sit on your own machine, with its own icon and a seat in the tray that tells you when something wants your hand. <a href="/download">Get the app</a>.</span>
  </div></section>`;
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
  justice: '<rect x="58.6" y="36" width="2.8" height="46" rx="1"/><rect x="44" y="80" width="32" height="3.4" rx="1.7"/><circle cx="60" cy="38" r="3.6"/><g class="scales"><rect x="36" y="44" width="48" height="2.8" rx="1.4"/><path class="pan l" d="M29 46 L45 46 L37 62 Z"/><path class="pan r" d="M75 46 L91 46 L83 62 Z"/></g>',
  war: '<path d="M38 36 L44 33 L82 79 L77 84 Z"/><path d="M82 36 L76 33 L38 79 L43 84 Z"/><rect x="33" y="72" width="20" height="3.4" rx="1.7" transform="rotate(-45 43 74)"/><rect x="67" y="72" width="20" height="3.4" rx="1.7" transform="rotate(45 77 74)"/><circle cx="60" cy="60" r="4" fill="#6B1414"/>',
  finance: '<circle cx="60" cy="52" r="17" fill="none" stroke="#D9BE84" stroke-width="3"/><circle cx="60" cy="52" r="9" fill="none" stroke="#D9BE84" stroke-width="1.6"/><circle cx="60" cy="52" r="2.6"/><ellipse cx="46" cy="76" rx="14" ry="4.6" fill="none" stroke="#D9BE84" stroke-width="2.4"/><ellipse cx="74" cy="76" rx="14" ry="4.6" fill="none" stroke="#D9BE84" stroke-width="2.4"/><rect x="58.8" y="80" width="2.4" height="8" rx="1.2"/>'
};

// Every hall the portal serves. Adding a ministry means adding a row here.
const SITES = {
  civil: { name: 'Ministry of Civil and Administrative Affairs', home: '/hall', h1: 'Ministry of Civil and<br>Administrative Affairs', ring: '' },
  war: { name: 'The Imperial War Office', home: '/war-office', h1: 'The Imperial<br>War Office', sub: 'Provincial Command \u00b7 Legion of Skyrim', ring: 'IMPERIAL WAR OFFICE' },
  justice: { name: 'The Ministry of Justice', home: '/justice', h1: 'The Ministry<br>of Justice', sub: 'Provincial Ministry of State \u00b7 The Imperial Bench', ring: 'MINISTRY OF JUSTICE' },
  finance: { name: 'The Ministry of Finance', home: '/finance', h1: 'The Ministry<br>of Finance', sub: 'Provincial Ministry of State \u00b7 The Imperial Treasury', ring: 'MINISTRY OF FINANCE' }
};

function ministrySeal(key, ring) {
  const id = 'ring-' + key;
  return `<svg class="seal" viewBox="0 0 120 120" role="img" aria-label="Seal"><defs><path id="${id}" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0"/></defs><circle cx="60" cy="60" r="57" fill="#6B1414"/><circle cx="60" cy="60" r="53" fill="none" stroke="#D9BE84" stroke-width="1.5"/><circle cx="60" cy="60" r="34" fill="none" stroke="#D9BE84" stroke-width="1"/><text font-family="EB Garamond, Georgia, serif" font-size="8.3" letter-spacing="1.1" fill="#F1E6CC" font-weight="600"><textPath href="#${id}" startOffset="1%">${esc(ring)} &#10022;</textPath></text><g fill="#D9BE84">${EMBLEM[key] || EMBLEM.civil}</g></svg>`;
}

const MINISTRIES = [
  { key: 'civil', name: 'Ministry of Civil and Administrative Affairs', ring: 'MINISTRY OF CIVIL & ADMINISTRATIVE AFFAIRS', seat: 'Provincial Ministry of State', href: '/hall', open: true,
    blurb: 'Receives the petitions of the Empire’s subjects, keeps the registers and the archives, issues licences and recognitions, and publishes the lawful notices of the Empire throughout the Holds.',
    tag: 'Petitions & Registers',
    links: [['Search the Registers', '/records'], ['Lay a Petition', '/petition'], ['Questions Answered', '/guide']] },
  { key: 'justice', name: 'Ministry of Justice', ring: 'MINISTRY OF JUSTICE', seat: 'Provincial Ministry of State', href: '/justice', open: true,
    blurb: 'Hears matters arising under Imperial law, oversees the adjudicators and the courts of the province, and answers upon questions of jurisdiction between the Holds and the Empire.',
    tag: 'The Bench & the Courts',
    links: [['The Court Calendar', '/justice/calendar'], ['Register of Judgments', '/justice/judgments'], ['The Wanted List', '/justice/wanted']] },
  { key: 'finance', name: 'Ministry of Finance', ring: 'MINISTRY OF FINANCE', seat: 'Provincial Ministry of State', href: '/finance', open: true,
    blurb: 'Keeps the purse of the province — gathers the taxes of the Holds, the tolls and excises and the tribute of the Mint, and renders them out again upon a budget the Minister approves each month.',
    tag: 'The Purse of the Province',
    links: [['The Published Account', '/finance/account'], ['Register of Charters', '/finance/register'], ['How Money Is Kept', '/finance/principles']] },
  { key: 'war', name: 'Imperial War Office', ring: 'IMPERIAL WAR OFFICE', seat: 'Provincial Command', href: '/war-office', open: true,
    blurb: 'Directs the garrisons of the Legion within Skyrim, orders the musters and the levies, and keeps the account of the province’s defence.',
    tag: 'The Legion in Skyrim',
    links: [['The Corps of the Legion', '/war-office/corps'], ['Terms of Enlistment', '/war-office/qualifications'], ['Take the Coin', '/war-office/letters']] }
];

function handClasses(cur) {
  return cur && cur !== 'standard' ? ['drawnhand', 'hand-' + cur] : [];
}

function shell({ title, today, body, wide, user, bodyClass, ground, cursor, csrf }) {
  // The landing and the province pages stand in the same weather, under the same
  // lamp, as every hall behind them.
  const desk = /ground-desk/.test(bodyClass || '');
  const cls = [bodyClass || '', ground === 'lamplit' && !desk ? 'lamplit' : '', 'season-' + seasonOf(today), ...handClasses(cursor)].filter(Boolean).join(' ');
  const right = user
    ? `<span class="who">${esc(user.name)}</span>${user.all ? '<a class="btn ghost small" href="/province">Administration</a>' : ''}<form method="post" action="/logout" style="display:inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Leave the Hall</button></form>`
    : '<a class="btn ghost small" href="/login">Staff Entrance</a>';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fondamento:ital@0;1&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap">
<link rel="stylesheet" href="/style.css?v=${CSS_V}"><link rel="icon" href="/favicon.svg"><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#6B1414"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Ministry"><meta name="application-name" content="Ministry"><script src="/motion.js?v=${assetV('motion.js')}" defer></script><script src="/app.js?v=${assetV('app.js')}" defer></script></head><body class="${esc(cls)}">
<div class="topbar"><span class="clock"><span class="eyebrow daystamp">${esc(today ? today.text : 'Fourth Era')}</span></span><span class="topright">${right}</span></div>
<div class="wrap${wide ? ' wide' : ''}">${body}
<div class="foot">Imperial Province of Skyrim ✦ Cyrodilic Administration ✦ Fourth Era<br><span class="footlinks"><a href="/download">Get the app</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms of Use</a> · <span class="footnote">A fan work. Not affiliated with Bethesda Softworks or ZeniMax Media.</span></span></div></div></body></html>`;
}

// The front page comes two ways. Cards are the plain shelf of notices; books are
// the Ministry's own library, four volumes on a desk, one to a Ministry. Which one
// shows is a setting, so it can be put back without touching the code.
function landingBooks(user) {
  return `<div class="cabinet"><div class="shelf">${MINISTRIES.map((m, n) => `<article class="minbook${m.open ? '' : ' shut'}" style="--i:${n}">
    <div class="bookface">
      <span class="bleaf">
        <span class="bleaf-in">
          <b>${esc(m.name)}</b>
          <i>${esc(m.blurb)}</i>
          ${(m.links || []).length ? `<ul>${m.links.map(([t, h]) => `<li><a href="${h}">${esc(t)}</a></li>`).join('')}</ul>` : ''}
          <a class="bgo" href="${m.href}">${m.open ? 'Enter the Hall' : 'Not yet established'} \u2192</a>
        </span>
      </span>
      <button class="bcover" type="button" aria-expanded="false"${m.open ? ' data-book' : ''}>
        <span class="bface bfront">
          <span class="bname">${esc(m.name)}</span>
          ${ministrySeal(m.key, m.ring)}
          <span class="btag">${esc(m.open ? (m.tag || '') : 'Not yet established')}</span>
        </span>
        <span class="bface bback" aria-hidden="true"></span>
        <span class="bspine" aria-hidden="true"></span>
        <span class="vh">Open ${esc(m.name)}</span>
      </button>
    </div>
    <div class="bunder"><div class="eyebrow">${esc(m.seat)}</div></div>
  </article>`).join('')}</div><span class="cabboard" aria-hidden="true"></span></div>`;
}

// The Ministry's own post-road diagram: the nine Holds and what runs between
// them. It is drawn faint and sits behind the page, never in front of it.
function roadsBackdrop() {
  const H = [
    ['Haafingar', 232, 168], ['The Pale', 420, 122], ['Winterhold', 612, 150], ['Eastmarch', 786, 214],
    ['Hjaalmarch', 300, 300], ['Whiterun', 470, 328], ['The Rift', 640, 296], ['The Reach', 268, 452], ['Falkreath', 452, 486]
  ];
  return `<div class="roadground" aria-hidden="true"><svg viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid slice">
    <g fill="none" stroke="#8C6A2F" stroke-width="1.6" stroke-linecap="round" opacity=".55">
      <path d="M232 168 L420 122 L612 150 L786 214"/>
      <path d="M232 168 L300 300 L470 328 L640 296 L786 214"/>
      <path d="M300 300 L268 452 L452 486 L470 328"/>
      <path d="M452 486 L640 296"/><path d="M612 150 L640 296"/><path d="M420 122 L470 328"/>
      <path d="M786 214 L742 404 L452 486"/>
    </g>
    <g fill="none" stroke="#8C6A2F" stroke-width="1" stroke-dasharray="5 7" opacity=".4">
      <path d="M120 250 C260 196 356 228 420 122"/><path d="M880 320 C812 250 828 176 786 214"/>
      <path d="M268 452 C340 560 560 578 742 404"/>
    </g>
    <g fill="#6B1414" opacity=".6">${H.map(([, x, y]) => `<circle cx="${x}" cy="${y}" r="6"/>`).join('')}</g>
    <g font-family="EB Garamond, Georgia, serif" font-size="15" fill="#5A4128" opacity=".7" letter-spacing="1.6">
      ${H.map(([n, x, y]) => `<text x="${x}" y="${y - 16}" text-anchor="middle">${esc(n.toUpperCase())}</text>`).join('')}
    </g>
  </svg></div>`;
}

// The gavel, for the one flash that deserves it: a judgment given.
function gavelMark() {
  return `<span class="flashgavel" aria-hidden="true"><svg viewBox="0 0 48 48" role="img">
    <g fill="none" stroke="#5A3C18" stroke-width="3.4" stroke-linecap="round">
      <path d="M14 30 L30 14"/><path d="M27 7 L41 21"/><path d="M31 3 L45 17"/>
    </g>
    <rect x="6" y="38" width="30" height="5" rx="2.5" fill="#5A3C18"/>
  </svg></span>`;
}

function waxMark() {
  return `<svg class="waxseal" viewBox="0 0 120 120" role="img" aria-label="The seal of the Ministry"><defs>
    <radialGradient id="waxg" cx="38%" cy="32%"><stop offset="0" stop-color="#9B2020"/><stop offset="62%" stop-color="#6B1414"/><stop offset="1" stop-color="#480C0C"/></radialGradient></defs>
    <path d="M60 4 C74 4 78 14 89 18 C100 22 108 20 112 32 C116 44 110 50 112 62 C114 74 120 80 112 90 C104 100 94 96 84 102 C74 108 70 118 58 116 C46 114 44 104 34 98 C24 92 14 94 9 83 C4 72 10 66 8 54 C6 42 1 36 9 26 C17 16 27 20 38 14 C49 8 50 4 60 4 Z" fill="url(#waxg)"/>
    <circle cx="60" cy="60" r="41" fill="none" stroke="rgba(255,214,180,.24)" stroke-width="1.4"/>
    <circle cx="60" cy="60" r="27" fill="none" stroke="rgba(255,214,180,.2)" stroke-width="1"/>
    <g fill="rgba(255,222,190,.34)"><polygon points="60,33 64,54 85,60 64,66 60,87 56,66 35,60 56,54"/><circle cx="60" cy="60" r="3.4" fill="rgba(72,12,12,.5)"/></g>
  </svg>`;
}

// A paper is sealed and filed. The wax comes down on it, the number soaks into
// the page, and the card takes the jolt. Nothing here is needed to read the page.
function sealPress({ eyebrow, no, lede, meta, links, note }) {
  const ink = String(no || '').split('').map((ch, i) => `<span style="--c:${i}">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');
  return `<section><div class="card presscard" style="max-width:760px">
    <span class="presswax" aria-hidden="true">${waxMark()}</span>
    <div class="eyebrow">${esc(eyebrow)}</div>
    <h2 class="pressno" aria-label="${esc(no)}">${ink}</h2>
    ${lede ? `<p class="lede presslede" style="margin-bottom:10px">${lede}</p>` : ''}
    ${meta || ''}
    ${note ? `<p class="hint presslede" style="margin-top:12px">${note}</p>` : ''}
    ${links ? `<div class="linkrow presslede">${links}</div>` : ''}
  </div></section>`;
}

function landingPage(today, user, style, ground, cursor, csrf) {
  const cards = MINISTRIES.map((m, n) => `<article class="mincard${m.open ? '' : ' shut'}" style="--i:${n}">
    <div class="mincard-seal">${ministrySeal(m.key, m.ring)}</div>
    <div class="mincard-body">
      <div class="eyebrow">${esc(m.seat)}</div>
      <h2><a href="${m.href}">${esc(m.name)}</a></h2>
      <p>${esc(m.blurb)}</p>
      ${(m.links || []).length ? `<ul class="mincard-links">${m.links.map(([t, h]) => `<li><a href="${h}">${esc(t)}</a></li>`).join('')}</ul>` : ''}
      <span class="mincard-go">${m.open ? 'Enter the Hall' : 'Not yet established'} <span class="arw">\u2192</span></span>
    </div></article>`).join('');
  const books = style === 'books';
  return shell({ title: 'The Imperial Ministries of Skyrim', today, wide: true, user, ground, cursor, csrf, bodyClass: books ? 'ground-desk' : '', body: `${books ? '<canvas id="motes" aria-hidden="true"></canvas>' : '<div class="landing-drift" aria-hidden="true"></div>'}
  <header class="mast landing-mast">
  <div class="eyebrow">By the Authority of the Governor</div>
  <div class="admin">Cyrodilic Administration for the Imperial Province of Skyrim</div>
  <h1 class="landing-title">The Imperial Ministries<br>of Skyrim</h1>
  <p class="landing-lede">Each Ministry of the province keeps its own hall, its own registers and its own officers. ${books ? 'Take down the volume whose business you seek.' : 'Choose the hall whose business you seek.'}</p>
  <div class="rule"></div></header>
  ${books ? landingBooks(user) : `<div class="ministries">${cards}</div>`}
  ${user && user.all ? `<div class="provbar">
    <div>
      <div class="eyebrow">By the Governor\u2019s Warrant</div>
      <h2>Administration of the Province</h2>
      <p>Every login in the province, the ranks each Ministry may give, the seal and calendar, and the writ templates \u2014 all of it without entering a Ministry first.</p>
    </div>
    <div class="provlinks">
      <a class="btn" href="/province">Open Administration \u2192</a>
      <a class="btn ghost" href="/province#logins">Every Login</a>
      <a class="btn ghost" href="/province/ranks">Ranks &amp; Access</a>
    </div>
  </div>` : ''}
  ${books ? `<script src="/books.js?v=${assetV('books.js')}" defer></script>` : ''}
  <p class="landing-foot">${user ? 'You are entered as <b>' + esc(user.name) + '</b>.' : 'Officers of the Ministries enter by the <a href="/login">Staff Entrance</a>.'} Every register published here may be read by any subject of the Empire, without leave and without fee.</p>` });
}


// ---------------------------------------------------------------------------
// Administration of the Province
// ---------------------------------------------------------------------------
// The Minister's Study sits inside Civil Affairs, which is the wrong door for
// work that spans every Ministry. This is the same work reached from the front.

function provincePage({ today, user, body, active, ground, cursor, csrf }) {
  // Someone let into the Staff Room but no further sees that door and no other.
  const tabs = user && !user.all
    ? [['/province/staff', 'The Staff Room', 'staff']]
    : [
      ['/province', 'Every Login', 'logins'],
      ['/province/ranks', 'Ranks & Access', 'ranks'],
      ['/province/settings', 'Seal, Calendar & Laws', 'settings'],
      ['/province/staff', 'The Staff Room', 'staff'],
      ['/province/motion', 'Motion', 'motion'],
      ['/province/forms', 'Writ Templates', 'forms']
    ];
  return shell({
    title: 'Administration of the Province', today, wide: true, user, ground, cursor, csrf, bodyClass: 'provpage',
    body: `<header class="mast landing-mast" style="padding-bottom:0">
      <div class="eyebrow">By the Governor\u2019s Warrant</div>
      <div class="admin">Cyrodilic Administration for the Imperial Province of Skyrim</div>
      <h1 class="landing-title" style="font-size:clamp(28px,4vw,44px)">Administration<br>of the Province</h1>
      <div class="rule"></div>
    </header>
    <div class="subnav provnav">${tabs.map(([h, l, k]) => `<a href="${h}"${k === active ? ' class="on"' : ''}>${esc(l)}</a>`).join('')}
      <a href="/hall">\u2190 Back to the Ministries</a></div>
    ${body}`
  });
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



// ---------------------------------------------------------------------------
// The applicant's exercise: a Dispatch, written by someone with no login
// ---------------------------------------------------------------------------

function exerciseBox(csrf, prev, today) {
  const Tr = require('./training');
  const G = require('./trainingcontent').DISPATCH_GUIDE;
  const v = prev || {};
  const val = k => esc(v[k] || '');
  const cell = (i, j) => esc(((v.g || {})[i] || {})[j] || '');
  return `<section class="petitionbox">
    <h2>The Delegate’s Exercise</h2>
    <p class="lede">${esc(G.lede)}</p>
    <p>You have been sent here because you want a Hold. Write us a Dispatch as though you already held one \u2014 invent the fortnight, invent the people, invent what went wrong. We are not testing whether you know Skyrim. We are testing whether you can tell the Ministry what happened in a way an Envoy can act upon.</p>
    <p class="hint">Nothing you write here is entered upon the rolls of the Ministry. It is read by the officers who appoint, and by nobody else.</p>

    <details class="addwrap"><summary>What goes in each part, and what we are reading for</summary>
      <div class="warform">
        ${G.sections.map(x => `<div class="section-label">${esc(x.h)}</div><p>${esc(x.t)}</p><p class="hint"><b>Written well:</b> ${esc(x.good)}</p>`).join('')}
        <div class="section-label">Six Rules</div>
        <ul class="ruleset">${G.rules.map(([h, t]) => `<li><b>${esc(h)}</b><span>${esc(t)}</span></li>`).join('')}</ul>
        <div class="section-label">The Limit of the Office</div>
        <p class="notice">${esc(G.limits)}</p>
      </div>
    </details>

    <form class="writ" method="post" action="/exercise/dispatch">${hidden(csrf)}
      <input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
      <div class="section-label">Who You Are</div>
      <div class="field"><label class="l" for="xw">Your name, as we should answer you <span class="req">*</span></label><input type="text" id="xw" name="who" required maxlength="120" value="${val('who')}" placeholder="Your own name or handle"></div>
      <div class="field"><label class="l" for="xc">Where you may be found</label>${holdSelect('contact', v.contact, '\u2014 choose a Hold \u2014', 'xc')}</div>

      <div class="section-label">The Dispatch</div>
      <div class="field"><label class="l" for="xn">The Delegate who writes it <span class="req">*</span></label><input type="text" id="xn" name="character" required maxlength="120" value="${val('character')}" placeholder="Your character’s name"></div>
      <div class="field"><label class="l" for="xh">Assigned Holds <span class="req">*</span></label><input type="text" id="xh" name="holds" required maxlength="140" value="${val('holds')}" placeholder="e.g. The Reach &amp; Haafingar"></div>
      <div class="field"><label class="l" for="xp">Reporting period</label><input type="text" id="xp" name="period" maxlength="120" value="${val('period')}" placeholder="e.g. the 1st to the 15th of Hearthfire, 4E 226"></div>

      <div class="field"><label class="l" for="x1">Public notices, declarations and information distributed</label>
        <textarea id="x1" name="notices" rows="3" maxlength="4000" placeholder="What the Ministry put before the people through you. If you posted nothing, say so.">${val('notices')}</textarea></div>

      <div class="field"><span class="l">Meetings and communications</span>
        <div>
          <p class="hint" style="margin:0 0 6px">One line for each. The date, the place, whom you met and their office, and the substance of it.</p>
          <div class="tablewrap" style="border:0"><table class="gridin meetgrid"><thead><tr>${Tr.COLS.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>
            ${[0, 1, 2, 3].map(i => `<tr>${Tr.COLS.map((c, j) => `<td data-col="${esc(c)}"><input type="text" name="g[${i}][${j}]" aria-label="${esc(c)} row ${i + 1}" maxlength="300" value="${cell(i, j)}"></td>`).join('')}</tr>`).join('')}
          </tbody></table></div>
        </div></div>

      <div class="field"><label class="l" for="x2">Public concerns, petitions and reports received</label>
        <textarea id="x2" name="concerns" rows="3" maxlength="4000" placeholder="What subjects brought to you. Write what they said, not what you concluded.">${val('concerns')}</textarea></div>

      <div class="field"><label class="l" for="x3">Publications, rumours or matter requiring lawful review</label>
        <textarea id="x3" name="review" rows="3" maxlength="4000" placeholder="What is being printed or repeated that the Ministry may need to weigh. You are not deciding whether it is false.">${val('review')}</textarea></div>

      <div class="field"><label class="l" for="x4">Recommended routing</label>
        <select id="x4" name="routing" class="sel"><option value="">— choose one —</option>${Tr.ROUTING.map(x => `<option value="${esc(x)}"${v.routing === x ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></div>
      <div class="field"><label class="l" for="x5">If it belongs to another authority, which</label><input type="text" id="x5" name="referral" maxlength="200" value="${val('referral')}"></div>

      <div class="submitbar"><button class="btn big" type="submit">Send the Dispatch</button><span class="hint" style="margin:0">Take your time. A short Dispatch written well beats a long one written badly.</span></div>
    </form>
  </section>`;
}

function exerciseDone(x) {
  return `<section class="petitionbox">
    <h2>Your Dispatch Is Received</h2>
    <p class="lede">It is entered as <b>${esc(x.no)}</b> and is waiting to be read.</p>
    <p>An officer of the Ministry will read it and answer you${x.contact ? ', who will look for you in ' + esc(x.contact) : ''}. Keep the number above if you need to ask after it.</p>
    <p class="hint">Nothing you wrote has been entered upon the rolls of the Ministry. It was an exercise, and it is read only by the officers who appoint.</p>
    <div class="linkrow"><a class="btn ghost" href="/">The Imperial Ministries</a></div>
  </section>`;
}

function blanksFor(form, input) {
  const out = [];
  // When a writ says plainly which parts belong to the other party, send them
  // those and nothing else. The Ministry's own sections stay with the Ministry
  // even while they are still blank.
  const marked = (form.sections || []).some(sec => sec.party || (sec.kv || []).some(f => f.party));
  (form.sections || []).forEach(sec => {
    const party = !!sec.party;
    if (marked && !party && !(sec.kv || []).some(f => f.party)) return;
    if (sec.kv) sec.kv.forEach(f => {
      if (f.type === 'fixed') return;
      const theirs = party || !!f.party;
      if (marked && !theirs) return;
      const has = f.type === 'date'
        ? !!(input.d && input.d[f.id] && input.d[f.id].day)
        : !!(input.f && input.f[f.id]);
      if (theirs || !has) out.push({ id: f.id, label: f.label, type: f.type, options: f.options, required: theirs && !!f.required, party: theirs });
    });
    if (sec.lines) {
      if (marked && !party) return;
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
  // Some writs are sent out only to be filled in. Nothing of theirs goes onto
  // a signature line, so do not ask them for a signature at all.
  const noHand = cs.sigIndex === null || cs.sigIndex === undefined;
  const facts = filledFor(form, input).filter(([l]) => !blanks.some(b => b.label === l)).slice(0, 18);
  const body = `<header class="mast">
  <div class="eyebrow">By the Authority of the Governor</div>
  <div class="admin">Cyrodilic Administration for the Imperial Province of Skyrim</div>
  <div class="mast-row">${SEAL}<div><h1>${esc(form.title)}</h1><div class="minister">${esc(rec['Record No'])} · laid before you by ${esc(cs.byName)}</div></div></div>
  <div class="rule"></div></header>
  <main>${err ? `<div class="flash err" role="status">${esc(err)}</div>` : ''}
  <section class="signwrap">
    <p class="lede">${esc(cs.byName)} has set down the greater part of this ${esc(form.title.toLowerCase())} and asks that you ${noHand
      ? 'complete what remains and return it to the Ministry. <b>You set no hand to it</b> — the signing of this writ is the Ministry’s own.'
      : 'complete what remains and set your hand to it as <b>' + esc(cs.role || 'the second signatory') + '</b>.'}</p>
    ${cs.note ? `<p class="notice"><b>A word from ${esc(cs.byName)}:</b> ${esc(cs.note)}</p>` : ''}
    ${viewerSrc ? `<div class="section-label">The document as it stands</div><div class="linkrow"><a class="btn ghost small" href="${esc(viewerSrc)}" target="_blank" rel="noopener">Read the whole document</a></div>` : ''}
    <div class="section-label">What is already set down</div>
    ${facts.length ? `<dl class="meta">${facts.map(([l, x]) => `<dt>${esc(l)}</dt><dd class="pre">${esc(x)}</dd>`).join('')}</dl>` : '<p class="hint">Nothing has been entered yet.</p>'}
    <form class="writ" method="post" action="/sign/${esc(cs.token)}">${hidden(csrf)}
      ${blanks.length ? `<fieldset><legend><span class="rn">✦</span> What you must complete</legend><p class="hint">Anything marked <span class="req">*</span> must be answered before you may ${noHand ? 'return it' : 'set your hand to it'}.</p>${blanks.map(b => signField(b, v)).join('')}</fieldset>` : ''}
      <fieldset><legend><span class="rn">✦</span> ${noHand ? 'Who returns it' : 'Your hand'}</legend>
        <p class="hint">${noHand
          ? 'Give your name so the Ministry knows whose hand filled this in. This is <b>not</b> a signature and it is not written onto the document — it is kept with the record.'
          : 'Type your name and office to set your hand to this document. It will be sealed into the Ministry’s record and returned to ' + esc(cs.byName) + '.'}</p>
        <div class="field"><label class="l" for="signed">${noHand ? 'Your name' : esc(cs.role || 'Your signature')} <span class="req">*</span></label><input type="text" id="signed" name="signed" value="${esc(v.signed || cs.toName || '')}" required maxlength="160" placeholder="${noHand ? 'Your name' : 'Name &amp; office'}"></div>
        <div class="field stackfield"><label class="l" for="reply">A word in reply, if you wish</label><textarea id="reply" name="reply" rows="3" maxlength="1200">${esc(v.reply || '')}</textarea></div>
      </fieldset>
      <div class="linkrow"><button class="btn" name="act" value="sign" type="submit">${noHand ? 'Return it to the Ministry' : 'Set my hand to it'}</button><button class="btn ghost" name="act" value="decline" type="submit">Decline</button></div>
    </form>
  </section></main>`;
  return shell({ title: 'For your hand · ' + rec['Record No'], today, body });
}

function signDone({ title, text, today }) {
  return shell({ title, today, body: `<header class="mast"><div class="mast-row">${SEAL}<div><h1>${esc(title)}</h1></div></div><div class="rule"></div></header>
  <main><section class="holding"><p class="lede">${esc(text)}</p></section></main>` });
}

module.exports = { appHandoff, SITES, CSS_V, assetV, slug, DISCORD_MARK, seasonOf, waxMark, gavelMark, ministrySeal, sealPress, roadsBackdrop, esc, hidden, recUrl, can, SEAL, statusChip, layout, nav, staffTabs, dateInput, holdSelect, holdNames, proclamation, publicHome, noticeBoard, proclamationPrint, idCardPrint, petitionBox, petitionReceived, exerciseBox, exerciseDone, petitionStatus, recordLookup, recordCard, publicGuide, directory, licenses, laws, message, loginPage, passwordPage, landingPage, provincePage, ministryHolding, MINISTRIES, signPage, signDone, blanksFor, filledFor };
