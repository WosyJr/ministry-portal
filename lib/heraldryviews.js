const V = require('./views');
const H = require('./heraldry');
const G = require('./grants');
const { roman } = require('./skyrim');

const esc = V.esc;
const hidden = V.hidden;

function chip(e) {
  if (e.standing === 'Struck') return '<span class="chip warn">Struck</span>';
  if (e.standing === 'Lapsed') return '<span class="chip">Lapsed</span>';
  return '<span class="chip ok">In force</span>';
}

function row(e, manage, csrf) {
  const name = esc(H.fullName(e));
  return `<tr${e.standing !== 'In force' ? ' class="dim"' : ''}>
    <td><b>${name}</b>${e.under ? `<br><span class="small">under ${esc(e.under)}</span>` : ''}</td>
    <td>${esc(e.rank || '—')}</td>
    <td>${esc(e.region || '—')}</td>
    <td>${esc(e.fief || '—')}</td>
    <td>${esc(e.registered || '—')}</td>
    ${manage ? `<td class="acts">${chip(e)}
      <a class="btn ghost small" href="/heraldry/manage/${esc(e.id)}">Amend</a></td>` : ''}
  </tr>`;
}

function table(rows, manage, csrf) {
  if (!rows.length) return '<p class="lede">Nothing is entered here.</p>';
  return `<div class="tablewrap"><table class="ledger"><thead><tr>
    <th>Name</th><th>Rank or Title</th><th>Province or Hold</th><th>Fiefdom</th><th>Registered</th>
    ${manage ? '<th></th>' : ''}</tr></thead><tbody>
    ${rows.map(e => row(e, manage, csrf)).join('')}</tbody></table></div>`;
}

function ledger(q, rows, s, note, mayKeep) {
  const groups = H.grouped(rows);
  return `<section><h2>Imperial Ledger of Heraldry</h2>
  <p class="lede">Every noble, knightly and positional style recognized in Skyrim and entered upon the Imperial Ledger.
  Recognition rests with the Office of the Governor under the Lex de Tabulis Nobilitatis Imperii; this Ministry keeps the roll.</p>
  ${note ? `<p class="notice">${esc(note)}</p>` : ''}
  <div class="linkrow"><a class="btn ghost" href="/heraldry/grants">What has been granted</a>${mayKeep ? '<a class="btn ghost" href="/heraldry/manage">Keep the roll</a>' : ''}</div>

  <p class="hint"><b>${s.live}</b> ${s.live === 1 ? 'style stands' : 'styles stand'} upon the Ledger,
  of <b>${s.houses}</b> ${s.houses === 1 ? 'house' : 'houses'}, across <b>${s.regions}</b>
  ${s.regions === 1 ? 'province or hold' : 'provinces and holds'}${s.lapsed + s.struck ? `. ${s.lapsed + s.struck} ${s.lapsed + s.struck === 1 ? 'is' : 'are'} lapsed or struck and no longer shown here` : ''}.</p>

  <form method="get" action="/heraldry" class="checkform" style="margin-top:18px">
    <input type="search" name="q" value="${esc(q)}" placeholder="A name, a house, a rank, a hold" aria-label="Search the Ledger" maxlength="80">
    <button class="btn ghost" type="submit">Search the Ledger</button>
    ${q ? '<a class="btn ghost small" href="/heraldry">Clear</a>' : ''}
  </form>
  ${q ? `<p class="hint">${rows.length} ${rows.length === 1 ? 'entry answers' : 'entries answer'} to “${esc(q)}”.</p>` : ''}

  ${groups.map(g => `
    <div class="section-label">${esc(g.kind)} Nobility</div>
    <p class="hint">${esc(g.note)}</p>
    ${g.regions.map(r => `<h3 class="regname">${esc(r.region)}</h3>${table(r.rows, false)}`).join('')}
  `).join('')}
  ${!groups.length ? '<p class="lede">No style is entered upon the Ledger at this time.</p>' : ''}
  </section>`;
}

function manageList(rows, s, csrf, q) {
  return `<section><h2>The Ledger of Heraldry</h2>
  <p class="lede">The roll as the Ministry keeps it. ${s.live} in force, ${s.lapsed} lapsed, ${s.struck} struck.
  Recognition itself rests with the Governor; what is kept here is the record of it.</p>

  <form method="get" action="/heraldry/manage" class="checkform">
    <input type="search" name="q" value="${esc(q || '')}" placeholder="Search the roll" maxlength="80">
    <button class="btn ghost" type="submit">Search</button>
    ${q ? '<a class="btn ghost small" href="/heraldry/manage">Clear</a>' : ''}
  </form>

  <details class="addwrap"><summary>Enter a new style upon the Ledger</summary>
    <form class="warform" method="post" action="/heraldry/manage">${hidden(csrf)}
      <div class="wargrid">
        <label class="csf"><span>Given name <span class="req">*</span></span><input type="text" name="given" required maxlength="90"></label>
        <label class="csf"><span>Family or house</span><input type="text" name="family" maxlength="120"></label>
        <label class="csf"><span>Rank or title</span><input type="text" name="rank" maxlength="120" placeholder="Thane, Baron, Serjo"></label>
      </div>
      <div class="wargrid" style="margin-top:8px">
        <label class="csf"><span>Kind</span><select name="kind">${H.KINDS.map(k => `<option value="${esc(k.id)}">${esc(k.name)}</option>`).join('')}</select></label>
        <label class="csf"><span>Province or Hold</span><input type="text" name="region" maxlength="60"></label>
        <label class="csf"><span>Registered</span><input type="text" name="registered" maxlength="90" placeholder="Loredas, 3rd day of Frost Fall, 4E 226"></label>
      </div>
      <div class="wargrid" style="margin-top:8px">
        <label class="csf"><span>Appointed or recognized under</span><input type="text" name="under" maxlength="140"></label>
        <label class="csf"><span>Fiefdom</span><input type="text" name="fief" maxlength="200"></label>
      </div>
      <div class="linkrow"><button class="btn" type="submit">Enter it</button></div>
    </form>
  </details>

  ${table(rows, true, csrf)}
  <div class="linkrow"><a class="btn" href="/heraldry/grants/new">Make a grant</a>
    <a class="btn ghost" href="/heraldry/grants">What has been granted</a></div>
  </section>`;
}

function manageOne(e, csrf) {
  return `<section><h2>${esc(H.fullName(e))}</h2>
  <p class="lede">${esc(e.rank || 'No rank set down')}${e.region ? ' · ' + esc(e.region) : ''} · ${esc(e.kind)}</p>
  <p>${chip(e)}</p>

  <form class="warform" method="post" action="/heraldry/manage/${esc(e.id)}">${hidden(csrf)}
    <div class="wargrid">
      <label class="csf"><span>Given name <span class="req">*</span></span><input type="text" name="given" required maxlength="90" value="${esc(e.given)}"></label>
      <label class="csf"><span>Family or house</span><input type="text" name="family" maxlength="120" value="${esc(e.family)}"></label>
      <label class="csf"><span>Rank or title</span><input type="text" name="rank" maxlength="120" value="${esc(e.rank)}"></label>
    </div>
    <div class="wargrid" style="margin-top:8px">
      <label class="csf"><span>Kind</span><select name="kind">${H.KINDS.map(k => `<option value="${esc(k.id)}"${k.id === e.kind ? ' selected' : ''}>${esc(k.name)}</option>`).join('')}</select></label>
      <label class="csf"><span>Province or Hold</span><input type="text" name="region" maxlength="60" value="${esc(e.region)}"></label>
      <label class="csf"><span>Standing</span><select name="standing">${H.STANDINGS.filter(x => x !== 'Struck').map(x => `<option${x === e.standing ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
    </div>
    <div class="wargrid" style="margin-top:8px">
      <label class="csf"><span>Registered</span><input type="text" name="registered" maxlength="90" value="${esc(e.registered)}"></label>
      <label class="csf"><span>Under</span><input type="text" name="under" maxlength="140" value="${esc(e.under)}"></label>
      <label class="csf"><span>Fiefdom</span><input type="text" name="fief" maxlength="200" value="${esc(e.fief)}"></label>
    </div>
    <label class="csf csf-wide" style="margin-top:8px"><span>Note upon the entry</span><textarea name="note" rows="2">${esc(e.note || '')}</textarea></label>
    <div class="linkrow"><button class="btn" type="submit">Amend the entry</button>
      <a class="btn ghost" href="/heraldry/manage">Back to the roll</a></div>
  </form>

  ${(() => { const gs = G.forEntry(e.id); return gs.length ? `<div class="section-label">Granted to them</div>
    <div class="board">${gs.map(g => grantCard(g, false, csrf)).join('')}</div>` : ''; })()}

  ${e.standing === 'Struck' ? `
  <div class="section-label">Struck from the Ledger</div>
  <p class="lede">${esc(e.struckWhy || 'No reason was set down.')}${e.struckBy ? ' — ' + esc(e.struckBy) : ''}</p>
  <form method="post" action="/heraldry/manage/${esc(e.id)}/restore">${hidden(csrf)}
    <button class="btn ghost" type="submit">Restore it to the Ledger</button></form>`
  : `
  <div class="section-label">Strike it from the Ledger</div>
  <p class="hint">A struck entry stays on the roll as a record, marked struck, and leaves the public Ledger.</p>
  <form class="warform" method="post" action="/heraldry/manage/${esc(e.id)}/strike">${hidden(csrf)}
    <label class="csf csf-wide"><span>Why it is struck <span class="req">*</span></span><input type="text" name="why" required maxlength="300" placeholder="Attainted by judgment of the Court; the line is extinct"></label>
    <div class="linkrow"><button class="btn danger" type="submit">Strike it</button></div>
  </form>`}
  </section>`;
}

module.exports = { ledger, manageList, manageOne, grants, grantForm, grantCard, patentDoc, patentNo };

function grantChip(g) {
  return g.standing === 'Revoked' ? '<span class="chip warn">Revoked</span>' : '<span class="chip ok">Granted</span>';
}

function grantCard(g, manage, csrf) {
  const k = G.KIND_BY_ID[g.kind] || { name: g.kind };
  return `<article class="paper grant">
    <div class="no">Grant ${esc(String(g.no))} \u00b7 ${esc(k.name)}</div>
    <h3>${esc(g.what)}</h3>
    <p class="lede">To <b>${esc(g.toName)}</b>, by the hand of ${esc(g.authority)}${g.dated ? ' \u00b7 ' + esc(g.dated) : ''}</p>
    ${g.wording ? `<p class="docbody">${V.esc(g.wording).replace(/\n/g, '<br>')}</p>` : ''}
    <p>${grantChip(g)}${g.standing === 'Revoked' && g.revokedWhy ? ' <span class="small">' + esc(g.revokedWhy) + '</span>' : ''}</p>
    <div class="linkrow"><a class="btn" href="/heraldry/grants/${esc(g.id)}/patent">Read the Letters Patent</a></div>
    ${manage ? `<div class="linkrow">
      ${g.standing === 'Revoked'
        ? `<form method="post" action="/heraldry/grants/${esc(g.id)}/restore">${hidden(csrf)}<button class="btn ghost small" type="submit">Grant it again</button></form>`
        : `<form class="inline" method="post" action="/heraldry/grants/${esc(g.id)}/revoke">${hidden(csrf)}
             <input type="text" name="why" maxlength="300" placeholder="Why it is revoked" required>
             <button class="btn ghost small" type="submit">Revoke</button></form>`}
    </div>` : ''}
  </article>`;
}

function grants(rows, s, manage, csrf) {
  return `<section><h2>Grants of the Ledger</h2>
  <p class="lede">What the Office of the Governor has granted and this Ministry has entered: styles and titles, arms,
  fiefdoms, honours and writs. A grant of a style enters its holder upon the Ledger; revoking one strikes them from it.</p>
  <p class="hint"><b>${s.live}</b> ${s.live === 1 ? 'grant stands' : 'grants stand'}${s.revoked ? `, ${s.revoked} revoked` : ''}.</p>
  ${manage ? `<div class="linkrow"><a class="btn" href="/heraldry/grants/new">Make a grant</a>
    <a class="btn ghost" href="/heraldry/manage">The roll</a></div>` : ''}
  ${rows.length ? `<div class="board">${rows.map(g => grantCard(g, manage, csrf)).join('')}</div>`
    : '<p class="lede">Nothing has been granted yet.</p>'}
  </section>`;
}

function grantForm(csrf, entries, v) {
  const val = k => esc((v && v[k]) || '');
  return `<section><h2>Make a grant</h2>
  <p class="lede">A grant is entered in the name of the hand that makes it. Granting a style or a fiefdom to someone
  already upon the Ledger amends their entry; granting it to a new name enters them upon it.</p>
  <form class="warform" method="post" action="/heraldry/grants">${hidden(csrf)}
    <div class="wargrid">
      <label class="csf"><span>What kind <span class="req">*</span></span><select name="kind">
        ${G.KINDS.map(k => `<option value="${esc(k.id)}">${esc(k.name)}</option>`).join('')}</select></label>
      <label class="csf csf-wide"><span>What is granted <span class="req">*</span></span>
        <input type="text" name="what" required maxlength="160" value="${val('what')}" placeholder="Baron of Riverwood; the Order of the Dragon; Oakwood Manor"></label>
    </div>
    <div class="wargrid" style="margin-top:8px">
      <label class="csf"><span>To someone already upon the Ledger</span>
        <select name="toId"><option value="">\u2014 someone new \u2014</option>
        ${entries.map(e => `<option value="${esc(e.id)}">${esc(H.fullName(e))}${e.rank ? ' \u2014 ' + esc(e.rank) : ''}</option>`).join('')}
        </select></label>
      <label class="csf"><span>Or a new name</span><input type="text" name="toName" maxlength="160" value="${val('toName')}" placeholder="Given name and house"></label>
      <label class="csf"><span>Province or Hold</span><input type="text" name="region" maxlength="60" value="${val('region')}"></label>
    </div>
    <div class="wargrid" style="margin-top:8px">
      <label class="csf"><span>By the hand of <span class="req">*</span></span><input type="text" name="authority" required maxlength="160" value="${val('authority')}" placeholder="The Governor of Skyrim"></label>
      <label class="csf"><span>Dated</span><input type="text" name="dated" maxlength="90" placeholder="Middas, 7th day of Frostfall, 4E 226" value="${val('dated')}"></label>
      <label class="csf"><span>If new, what kind of nobility</span><select name="nobleKind">
        ${H.KINDS.map(k => `<option value="${esc(k.id)}"${k.id === 'Lifelong' ? ' selected' : ''}>${esc(k.name)}</option>`).join('')}</select></label>
    </div>
    <label class="csf csf-wide" style="margin-top:8px"><span>The wording of the grant</span>
      <textarea name="wording" rows="5" placeholder="Know all who read this that...">${val('wording')}</textarea></label>
    <div class="linkrow"><button class="btn" type="submit">Make the grant</button>
      <a class="btn ghost" href="/heraldry/grants">Back</a></div>
  </form>
  </section>`;
}

function patentNo(g) {
  return 'Letters Patent ' + roman(Number(g.no) || 1);
}

const pfacts = rows => `<dl class="docfacts">${rows.filter(Boolean)
  .map(([l, v]) => `<dt>${esc(l)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;

const WORDS = {
  style: ['raised to the dignity and style of', 'and shall be so named, styled and entered upon the Imperial Ledger of Heraldry, with all the honour, precedence and burden that belongs to it.'],
  arms: ['granted and assigned the arms hereafter blazoned', 'which arms they and, where the grant is hereditary, their heirs may bear and display lawfully and without let.'],
  fief: ['seized and enfeoffed of', 'to hold of the Empire, with its rents, services and customs, and its duties of defence and good order.'],
  honour: ['admitted to', 'in recognition of service done, which carries honour and precedence but no title of nobility.'],
  writ: ['granted the liberty and privilege of', 'which no officer of the Empire shall hinder while it stands unrevoked.']
};

function patentDoc(g, entry) {
  const k = G.KIND_BY_ID[g.kind] || { name: 'Grant' };
  const w = WORDS[g.kind] || WORDS.honour;
  const revoked = g.standing === 'Revoked';

  const body = `
  <p class="docpre">To all who shall see or hear these presents, and to the officers of the Empire in every Hold and Province: <b>GREETING</b>.</p>
  <p class="docpre">Know that by the authority herein named, and entered this day upon the Imperial Ledger of Heraldry kept by this Ministry,
  <b>${esc(g.toName)}</b> is ${esc(w[0])} <b>${esc(g.what)}</b>, ${esc(w[1])}</p>
  ${pfacts([
    ['Granted to', g.toName],
    entry && entry.rank ? ['Now styled', entry.rank] : null,
    ['What is granted', g.what],
    ['Of which kind', k.name],
    entry && entry.region ? ['Province or Hold', entry.region] : null,
    entry && entry.kind ? ['Held as', entry.kind + ' nobility'] : null,
    entry && entry.fief ? ['Fiefdom', entry.fief] : null,
    ['By the hand of', g.authority],
    g.dated ? ['Dated', g.dated] : null
  ])}
  ${g.wording ? `<div class="s-hear">The words of the grant</div><p class="docbody">${esc(g.wording).replace(/\n/g, '<br>')}</p>` : ''}
  ${revoked ? `<div class="s-hear">Revoked</div><p class="docbody"><b>This grant is revoked and no longer stands.</b> ${esc(g.revokedWhy || '')}</p>` : ''}
  <p class="docpre">Recognition of noble, knightly and heraldic right rests with the Office of the Governor under the
  <i>Lex de Tabulis Nobilitatis Imperii</i>. This Ministry keeps the Ledger and issues these presents upon it.</p>`;

  const foot = `<div class="docseal">
    <div class="docseal-line">Given under the hand of</div>
    <div class="docseal-name">${esc(g.authority)}</div>
    <div class="docseal-mark">\u2766 Entered upon the Imperial Ledger of Heraldry \u2766</div>
  </div>`;

  return `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light">
<title>${esc(patentNo(g))} \u00b7 ${esc(g.toName)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fondamento:ital@0;1&family=EB+Garamond:ital,wght@0,400;0,600;1,400&display=swap">
<link rel="stylesheet" href="/style.css?v=${V.CSS_V}">
<script src="/vendor/html2canvas.min.js" defer></script><script src="/savepic.js" defer></script></head>
<body class="printbody">
<div class="printbar noprint">
  <a class="btn ghost" href="/heraldry/grants">\u2190 The grants</a>
  <button class="btn" onclick="window.print()">Print</button>
  <button class="btn ghost" id="pic" data-target="doc" data-scale="2" data-name="${esc(patentNo(g).replace(/\s+/g, '-'))}">Save as picture</button>
</div>
<article class="scroll jusdoc${revoked ? ' voided' : ''}" id="doc">
  <div class="eyebrow">By the Authority of the Governor</div>
  <div class="admin">Cyrodilic Administration for the Imperial Province of Skyrim</div>
  <div class="s-ministry">The Ministry of Civil and Administrative Affairs \u00b7 The Imperial Ledger of Heraldry</div>
  <div class="s-orn">\u2766</div>
  <div class="s-hear">${esc(k.name)}</div>
  <h1 class="s-title">${esc(g.what)}</h1>
  <div class="s-no">${esc(patentNo(g))}</div>
  ${body}
  ${foot}
  <div class="doccheck">Under the hand and number <b>${esc(patentNo(g))}</b><br>
  <span>Entered so upon the Imperial Ledger of Heraldry. Any person doubting this paper may bring it to a clerk of the
  Ministry, or search the Ledger for the name upon it, and be told whether it stands.</span></div>
</article>
</body></html>`;
}
