const { esc } = require('./views');
const Seals = require('./seals');
const Arms = require('./arms');
const ArmsV = require('./armsviews');

const hidden = c => `<input type="hidden" name="_csrf" value="${esc(c)}">`;
const day = iso => { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (_) { return ''; } };

function chip(s) {
  const st = Seals.STATUS[s.status] || Seals.STATUS.recorded;
  return `<span class="chip${st.tone ? ' ' + st.tone : ''}">${esc(st.name)}</span>`;
}

function card(s, opts) {
  const o = opts || {};
  return `<article class="reqcard sealcard">
    <div class="no">${esc((Seals.KIND[s.kind] || {}).name || '')} ${chip(s)}</div>
    <div class="armsbeside">
      ${s.arms ? Arms.svg(s.arms, { size: 64, label: s.power }) : '<span class="sealblank" aria-hidden="true">?</span>'}
      <div>
        <h3 style="margin:0 0 4px"><a href="/seals/${esc(s.id)}">${esc(s.power)}</a></h3>
        ${s.holder ? `<p class="small" style="margin:0 0 6px">Kept by ${esc(s.holder)}</p>` : ''}
        ${s.description ? `<p style="margin:0">${esc(s.description)}</p>` : ''}
      </div>
    </div>
    ${o.manage ? `<div class="linkrow"><a class="btn ghost small" href="/staff/seals/${esc(s.id)}">Amend</a></div>` : ''}
  </article>`;
}

function indexPage(groups, q, manage) {
  const n = groups.reduce((a, g) => a + g.items.length, 0);
  return `<section>
    <h2>Seals of Other Powers</h2>
    <p class="lede">If somebody hands you a paper under a seal that is not the Ministry’s, this is where you check it. The Ministry records what each seal looks like, what to look for on a true one, and what it is worth.</p>
    <form class="search-box" method="get" action="/seals"><input type="search" name="q" value="${esc(q || '')}" placeholder="e.g. Whiterun, Legion, a horse’s head" aria-label="Search the seals"><button class="btn" type="submit">Search the Register</button></form>
    ${q ? `<p class="hint">${n} ${n === 1 ? 'seal answers' : 'seals answer'} to that.</p>` : ''}
    ${manage ? `<div class="linkrow"><a class="btn small" href="/staff/seals/new">Enter a seal</a><a class="btn ghost small" href="/staff/seals">Keep the register</a></div>` : ''}
    ${groups.length ? groups.map(g => `<div class="section-label">${esc(g.name)}</div>
      <p class="hint" style="margin:-4px 0 10px">${esc(g.plain)}</p>
      <div class="board">${g.items.map(s => card(s, { manage })).join('')}</div>`).join('')
      : '<p class="lede">No seal has been entered upon the register yet.</p>'}
    <div class="section-label">What the Standings Mean</div>
    <dl class="meta">${Seals.STATUSES.map(s => `<dt>${esc(s.name)}</dt><dd>${esc(s.plain)}</dd>`).join('')}</dl>
    <p class="hint">A seal on this register is not a promise that any particular paper is genuine. It is a description of what a genuine one looks like. If a paper does not match, bring it to the Ministry.</p>
  </section>`;
}

function sealPage(s, manage) {
  const st = Seals.STATUS[s.status] || Seals.STATUS.recorded;
  return `<section>
    <p style="margin:0 0 10px"><a href="/seals">← The register of seals</a></p>
    <div class="two">
      <div>
        <div class="eyebrow">${esc((Seals.KIND[s.kind] || {}).name || '')}</div>
        <h2>${esc(s.power)}</h2>
        ${s.holder ? `<p class="lede">Kept by ${esc(s.holder)}.</p>` : ''}
        <p>${chip(s)} ${esc(st.plain)}</p>
        ${s.description ? `<div class="section-label">What it looks like</div><p>${esc(s.description)}</p>` : ''}
        ${s.marks ? `<div class="section-label">How to tell a true one</div><p>${esc(s.marks)}</p>` : ''}
        ${s.papers ? `<div class="section-label">What it appears on</div><p>${esc(s.papers)}</p>` : ''}
        ${s.note ? `<div class="section-label">The Ministry’s note</div><p>${esc(s.note)}</p>` : ''}
        <p class="hint">Entered ${esc(day(s.at))}${s.by ? ' by ' + esc(s.by) : ''}${s.editedAt ? ' · last amended ' + esc(day(s.editedAt)) + (s.editedBy ? ' by ' + esc(s.editedBy) : '') : ''}${s.verifiedAt ? ' · last seen against a true impression ' + esc(s.verifiedAt) : ''}.</p>
        ${manage ? `<div class="linkrow"><a class="btn ghost small" href="/staff/seals/${esc(s.id)}">Amend this entry</a></div>` : ''}
      </div>
      <div class="sealshow">
        ${s.arms ? Arms.svg(s.arms, { size: 200, label: s.power }) : '<p class="hint">No impression has been drawn for this seal.</p>'}
        ${s.arms ? `<p class="blazon">${esc(Arms.blazon(s.arms))}</p>` : ''}
      </div>
    </div>
  </section>`;
}

function editPage(s, csrf, isNew) {
  const a = Arms.clean((s && s.arms) || {});
  return `<section class="armswrap">
    <p style="margin:0 0 10px"><a href="/staff/seals">← Keep the register</a></p>
    <h2>${isNew ? 'Enter a Seal' : 'Amend: ' + esc(s.power)}</h2>
    <p class="lede">Describe the seal as somebody holding a paper would see it, and say plainly what the Ministry will and will not do about a paper under it.</p>
    <div class="armsrow">
      <div class="armsshow">
        <div id="armspreview">${Arms.svg(a, { size: 200, label: (s && s.power) || 'The impression' })}</div>
        <p class="blazon" id="armsblazon">${esc(Arms.blazon(a))}</p>
        <p class="motto" id="armsmotto"></p>
        <p class="hint" id="armswarn"></p>
      </div>
      <form method="post" action="${isNew ? '/staff/seals/new' : '/staff/seals/' + esc(s.id)}" class="warform armsform" id="armsform">
        ${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Whose seal it is</span>
            <span class="say">The power itself, not the person who happens to hold it today.</span>
            <input type="text" name="power" maxlength="120" required value="${esc((s && s.power) || '')}" placeholder="e.g. The Jarl of Falkreath"></label>
          <label class="csf"><span>Who keeps it</span>
            <span class="say">The office that actually presses it. Leave empty if unknown.</span>
            <input type="text" name="holder" maxlength="120" value="${esc((s && s.holder) || '')}" placeholder="e.g. The Steward of Falkreath"></label>
          <label class="csf"><span>What kind of power</span>
            <select name="kind" class="sel">${Seals.KINDS.map(k => `<option value="${esc(k.id)}"${s && s.kind === k.id ? ' selected' : ''}>${esc(k.name)} — ${esc(k.plain)}</option>`).join('')}</select></label>
          <label class="csf"><span>What the Ministry makes of it</span>
            <select name="status" class="sel">${Seals.STATUSES.map(x => `<option value="${esc(x.id)}"${s && s.status === x.id ? ' selected' : ''}>${esc(x.name)} — ${esc(x.plain)}</option>`).join('')}</select></label>
        </div>
        <label class="csf csf-wide"><span>What it looks like</span>
          <span class="say">Plain description: the device, the border, the colour of the wax.</span>
          <textarea name="description" rows="3" maxlength="600" placeholder="e.g. A stag’s head within a ring of oak leaves, pressed in green wax.">${esc((s && s.description) || '')}</textarea></label>
        <label class="csf csf-wide"><span>How to tell a true one</span>
          <span class="say">The detail a forger gets wrong. This is the useful part.</span>
          <textarea name="marks" rows="3" maxlength="600" placeholder="e.g. The oak ring has nine leaves. A true impression breaks the ring at the top.">${esc((s && s.marks) || '')}</textarea></label>
        <label class="csf csf-wide"><span>What it appears on</span>
          <span class="say">The kinds of paper this seal is properly used for.</span>
          <textarea name="papers" rows="2" maxlength="400" placeholder="e.g. Writs of the Hold, grants of hunting rights.">${esc((s && s.papers) || '')}</textarea></label>
        <label class="csf csf-wide"><span>The Ministry’s note</span>
          <span class="say">Anything an officer handed this paper ought to know. Shown publicly.</span>
          <textarea name="note" rows="2" maxlength="600">${esc((s && s.note) || '')}</textarea></label>
        <div class="wargrid">
          <label class="csf"><span>Last seen against a true impression</span>
            <span class="say">Write it however you like — a date, a season, or "not yet".</span>
            <input type="text" name="verifiedAt" maxlength="40" value="${esc((s && s.verifiedAt) || '')}" placeholder="e.g. Last of Frostfall, 4E 226"></label>
        </div>

        <div class="section-label">Draw the impression</div>
        <p class="say">A rough likeness is worth more than none. The same shapes your own arms are made from.</p>
        <label class="csf"><span>The shape</span>
          <select name="shape" class="sel">${Arms.SHAPES.map(x => `<option value="${esc(x.id)}"${x.id === a.shape ? ' selected' : ''}>${esc(x.name)} — ${esc(x.plain)}</option>`).join('')}</select></label>
        <label class="csf"><span>How the field is divided</span>
          <select name="division" class="sel">${Arms.DIVISIONS.map(d => `<option value="${esc(d.id)}"${d.id === a.division ? ' selected' : ''}>${esc(d.name)} — ${esc(d.plain)}</option>`).join('')}</select></label>
        <label class="l">First colour</label>
        ${ArmsV.swatchRow('field', a.field)}
        <div id="secondwrap"${a.division === 'plain' ? ' hidden' : ''}><label class="l">Second colour</label>${ArmsV.swatchRow('second', a.second)}</div>
        <label class="csf"><span>A band across it</span>
          <select name="ordinary" class="sel">${Arms.ORDINARIES.map(x => `<option value="${esc(x.id)}"${x.id === a.ordinary ? ' selected' : ''}>${esc(x.name)} — ${esc(x.plain)}</option>`).join('')}</select></label>
        <div id="ordtintwrap"${a.ordinary === 'none' ? ' hidden' : ''}><label class="l">Its colour</label>${ArmsV.swatchRow('ordinaryTint', a.ordinaryTint)}</div>
        <label class="csf"><span>The device on it</span>
          <select name="charge" class="sel">
            <option value="none"${a.charge === 'none' ? ' selected' : ''}>Nothing</option>
            ${Arms.CHARGE_GROUPS.map(g => `<optgroup label="${esc(g.name)}">${g.items.map(x => `<option value="${esc(x.id)}"${x.id === a.charge ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</optgroup>`).join('')}
          </select></label>
        <div id="chtintwrap"${a.charge === 'none' ? ' hidden' : ''}><label class="l">Its colour</label>${ArmsV.swatchRow('chargeTint', a.chargeTint)}</div>
        <input type="hidden" name="motto" value="">

        <div class="linkrow">
          <button class="btn" type="submit">${isNew ? 'Enter it upon the register' : 'Set the amendment down'}</button>
          ${isNew ? '' : `<button class="btn ghost small" name="strike" value="1" type="submit">Strike it from the register</button>`}
        </div>
      </form>
    </div>
    <script type="application/json" id="armsdata">${JSON.stringify({
      shapes: Object.fromEntries(Arms.SHAPES.map(x => [x.id, x.d])),
      divisions: Object.fromEntries(Arms.DIVISIONS.map(d => [d.id, d.d])),
      ordinaries: Object.fromEntries(Arms.ORDINARIES.map(x => [x.id, x.d])),
      charges: Object.fromEntries(Arms.CHARGES.map(x => [x.id, x.d])),
      names: {
        tinct: Object.fromEntries(Arms.TINCTURES.map(t => [t.id, t.name])),
        kind: Object.fromEntries(Arms.TINCTURES.map(t => [t.id, t.kind])),
        division: Object.fromEntries(Arms.DIVISIONS.map(d => [d.id, d.name])),
        ordinary: Object.fromEntries(Arms.ORDINARIES.map(x => [x.id, x.name])),
        charge: Object.fromEntries(Arms.CHARGES.map(x => [x.id, x.name]))
      },
      hex: Object.fromEntries(Arms.TINCTURES.map(t => [t.id, t.hex]))
    })}</script>
    <script src="/arms.js" defer></script>
  </section>`;
}

function managePage(list, csrf) {
  return `<section>
    <h2>The Register of Seals</h2>
    <p class="lede">Every seal the Ministry has written down, and what it told the public about each. Anyone may read the register; only officers may change it.</p>
    <div class="linkrow"><a class="btn small" href="/staff/seals/new">Enter a seal</a><a class="btn ghost small" href="/seals">The public register</a></div>
    <div class="tablewrap"><table class="ledger"><thead><tr><th>Whose</th><th>Kind</th><th>Standing</th><th>Last amended</th><th></th></tr></thead><tbody>
      ${list.length ? list.map(s => `<tr>
        <td>${s.arms ? Arms.svg(s.arms, { size: 26, label: s.power }) : ''} <b>${esc(s.power)}</b>${s.holder ? `<br><span class="small">${esc(s.holder)}</span>` : ''}</td>
        <td>${esc((Seals.KIND[s.kind] || {}).name || '')}</td>
        <td>${chip(s)}</td>
        <td>${esc(day(s.editedAt || s.at))}</td>
        <td><a class="btn ghost small" href="/staff/seals/${esc(s.id)}">Amend</a></td>
      </tr>`).join('') : '<tr><td colspan="5"><span class="hint">Nothing upon the register yet.</span></td></tr>'}
    </tbody></table></div>
    <form method="post" action="/staff/seals/seed" class="inline" style="margin-top:12px">${hidden(csrf)}
      <button class="linkbtn tiny" type="submit">Enter the powers the Ministry already knows of</button></form>
    <p class="hint">That puts the Jarls, the Legion, the College and a few others on the register with what the Ministry has on file. It does nothing if the register is not empty.</p>
  </section>`;
}

module.exports = { indexPage, sealPage, editPage, managePage, card };
