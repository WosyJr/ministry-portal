const V = require('./views');
const H = require('./heraldry');

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
  ${mayKeep ? '<div class="linkrow"><a class="btn ghost" href="/heraldry/manage">Keep the roll</a></div>' : ''}

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

module.exports = { ledger, manageList, manageOne };
