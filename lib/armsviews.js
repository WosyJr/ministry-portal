const { esc } = require('./views');
const A = require('./arms');

const hidden = c => `<input type="hidden" name="_csrf" value="${esc(c)}">`;

const tinctOptions = (sel, only) => A.TINCTURES
  .filter(t => !only || only === t.kind)
  .map(t => `<option value="${esc(t.id)}"${t.id === sel ? ' selected' : ''}>${esc(t.name)} — ${esc(t.plain)}</option>`).join('');

function swatchRow(name, sel) {
  return `<div class="tinctrow" role="radiogroup" aria-label="${esc(name)}">
    ${A.TINCTURES.map(t => `<label class="tinct${t.id === sel ? ' on' : ''}" title="${esc(t.name)} — ${esc(t.plain)}">
      <input type="radio" name="${esc(name)}" value="${esc(t.id)}"${t.id === sel ? ' checked' : ''}>
      <span class="chip-sw" style="background:${t.hex}"></span>
      <span class="tn">${esc(t.name)}</span>
    </label>`).join('')}
  </div>`;
}

function armsPage(u, arms, csrf, who) {
  const c = A.clean(arms);
  const warn = A.clash(c);
  const mine = !who || who.username === u.username;
  const subject = who || u;
  return `<section class="armswrap">
    <div class="eyebrow">Heraldry</div>
    <h2>${mine ? 'Your Arms' : 'Arms of ' + esc(subject.name)}</h2>
    <p class="lede">A shield of your own. It goes beside your name in the Directory, on the Roll of Office, and on the papers you file. Nothing about it carries any authority — it is simply yours.</p>

    <div class="armsrow">
      <div class="armsshow">
        <div id="armspreview">${A.svg(c, { size: 220, label: subject.name })}</div>
        <p class="blazon" id="armsblazon">${esc(A.blazon(c))}</p>
        ${c.motto ? `<p class="motto" id="armsmotto">“${esc(c.motto)}”</p>` : '<p class="motto" id="armsmotto"></p>'}
        <p class="hint" id="armswarn">${warn.length ? 'The heralds would grumble: ' + esc(warn.join('; ')) + '. It is allowed, and it is yours.' : ''}</p>
      </div>

      <form method="post" action="/staff/arms" class="warform armsform" id="armsform">
        ${hidden(csrf)}
        ${who && !mine ? `<input type="hidden" name="username" value="${esc(who.username)}">` : ''}

        <label class="csf"><span>The shape of it</span>
          <span class="say">What the shield itself looks like. Nothing else changes.</span>
          <select name="shape" class="sel">${A.SHAPES.map(s => `<option value="${esc(s.id)}"${s.id === c.shape ? ' selected' : ''}>${esc(s.name)} — ${esc(s.plain)}</option>`).join('')}</select></label>

        <div class="section-label">The field</div>
        <p class="say">The background. Pick how it is divided, then the colours.</p>
        <label class="csf"><span>How it is divided</span>
          <select name="division" class="sel">${A.DIVISIONS.map(d => `<option value="${esc(d.id)}"${d.id === c.division ? ' selected' : ''}>${esc(d.name)} — ${esc(d.plain)}</option>`).join('')}</select></label>
        <label class="l">First colour</label>
        ${swatchRow('field', c.field)}
        <div id="secondwrap"${c.division === 'plain' ? ' hidden' : ''}>
          <label class="l">Second colour</label>
          ${swatchRow('second', c.second)}
        </div>

        <div class="section-label">A band across it</div>
        <p class="say">Optional. A plain shape laid over the field — heralds call these ordinaries.</p>
        <label class="csf"><span>The band</span>
          <select name="ordinary" class="sel">${A.ORDINARIES.map(o => `<option value="${esc(o.id)}"${o.id === c.ordinary ? ' selected' : ''}>${esc(o.name)} — ${esc(o.plain)}</option>`).join('')}</select></label>
        <div id="ordtintwrap"${c.ordinary === 'none' ? ' hidden' : ''}>
          <label class="l">Its colour</label>
          ${swatchRow('ordinaryTint', c.ordinaryTint)}
        </div>

        <div class="section-label">What is on it</div>
        <p class="say">Optional. One charge, sitting over everything else.</p>
        <label class="csf"><span>The charge</span>
          <select name="charge" class="sel">
            <option value="none"${c.charge === 'none' ? ' selected' : ''}>Nothing</option>
            ${A.CHARGE_GROUPS.map(g => `<optgroup label="${esc(g.name)}">${g.items.map(x => `<option value="${esc(x.id)}"${x.id === c.charge ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</optgroup>`).join('')}
          </select></label>
        <div id="chtintwrap"${c.charge === 'none' ? ' hidden' : ''}>
          <label class="l">Its colour</label>
          ${swatchRow('chargeTint', c.chargeTint)}
        </div>

        <label class="csf csf-wide"><span>A motto</span>
          <span class="say">A few words under the shield. Leave it empty if you would rather not.</span>
          <input type="text" name="motto" maxlength="60" value="${esc(c.motto)}" placeholder="e.g. Nothing written is ever lost"></label>

        <div class="linkrow">
          <button class="btn" type="submit">Set these arms down</button>
          <button class="btn ghost small" name="clear" value="1" type="submit">Take my arms away</button>
          <button class="btn ghost small" type="button" id="armsroll">Pick some for me</button>
        </div>
      </form>
    </div>

    <script type="application/json" id="armsdata">${JSON.stringify({
      shapes: Object.fromEntries(A.SHAPES.map(s => [s.id, s.d])),
      divisions: Object.fromEntries(A.DIVISIONS.map(d => [d.id, d.d])),
      ordinaries: Object.fromEntries(A.ORDINARIES.map(o => [o.id, o.d])),
      charges: Object.fromEntries(A.CHARGES.map(x => [x.id, x.d])),
      names: {
        tinct: Object.fromEntries(A.TINCTURES.map(t => [t.id, t.name])),
        kind: Object.fromEntries(A.TINCTURES.map(t => [t.id, t.kind])),
        division: Object.fromEntries(A.DIVISIONS.map(d => [d.id, d.name])),
        ordinary: Object.fromEntries(A.ORDINARIES.map(o => [o.id, o.name])),
        charge: Object.fromEntries(A.CHARGES.map(x => [x.id, x.name]))
      },
      hex: Object.fromEntries(A.TINCTURES.map(t => [t.id, t.hex]))
    })}</script>
    <script src="/arms.js" defer></script>
  </section>`;
}

function badge(arms, opts) {
  if (!arms) return '';
  return A.svg(arms, { size: (opts && opts.size) || 34, label: opts && opts.label });
}

module.exports = { armsPage, badge, swatchRow };
