const { esc } = require('./views');
const Roll = require('./roll');
const Ranks = require('./ranks');

const small = s => `<span class="small">${s}</span>`;
const hidden = c => `<input type="hidden" name="_csrf" value="${esc(c)}">`;
const day = iso => { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (_) { return ''; } };

function span(e) {
  const from = day(e.from);
  if (!e.until) return `${esc(from)} \u2014 <b>in office</b>`;
  return `${esc(from)} to ${esc(day(e.until))}`;
}

function rollPage(u, offices, csrf, roll, armsBy) {
  const arms = un => (armsBy && armsBy[un]) || null;
  const mine = !!(u && u.all);
  const filled = offices.filter(o => o.entries.length);
  const empty = offices.filter(o => !o.entries.length);
  const strike = e => mine
    ? `<form method="post" action="/staff/roll/strike" class="inline rollstrike">${hidden(csrf)}<input type="hidden" name="id" value="${esc(e.id)}"><button class="linkbtn tiny" type="submit" title="Take this line off the roll">Strike</button></form>`
    : '';
  const card = o => `<article class="reqcard rollcard">
    <div class="no">${esc(o.group || '')}${o.past.length ? ` \u00b7 ${o.past.length} before` : ''}</div>
    <h3>${esc(o.rankName)}</h3>
    ${o.now.length
      ? o.now.map(e => `<p class="rollnow">${arms(e.username) ? require('./arms').svg(arms(e.username), { size: 30, label: e.name }) : ''}<b>${esc(e.name)}</b> ${small(span(e))} ${strike(e)}</p>`).join('')
      : '<p class="hint">Vacant.</p>'}
    ${o.past.length ? `<details class="inlinedit"><summary class="btn ghost small">Those who held it before</summary>
      <ol class="plainlist rollpast">${o.past.map(e => `<li><b>${esc(e.name)}</b><br>${small(span(e) + (e.why ? ' \u00b7 ' + esc(e.why) : ''))} ${strike(e)}</li>`).join('')}</ol>
    </details>` : ''}
  </article>`;
  const r = roll || { people: [], struck: { people: [], keys: [] } };
  const keeper = mine ? `<div class="section-label">Keeping the roll straight</div>
    <article class="reqcard dimcard">
      <p style="margin:0 0 10px">Striking a line takes it off the roll and does not put it back. Use it for test accounts and for entries made in error \u2014 not for somebody who truly held the office, who should be stood down instead so the dates stay true.</p>
      <form method="post" action="/staff/roll/forget" class="rowform">${hidden(csrf)}
        <label>Take a person off the roll entirely
          <select name="username" class="sel">
            <option value="">Choose a name\u2026</option>
            ${r.people.map(p => `<option value="${esc(p.username)}">${esc(p.name)} (${esc(p.username)})</option>`).join('')}
          </select>
        </label>
        <button class="btn small" type="submit">Take off the roll</button>
      </form>
      ${r.struck.people.length || r.struck.keys.length ? `<p class="hint" style="margin:12px 0 6px"><b>Kept off the roll:</b></p>
        <ul class="plainlist">
          ${r.struck.people.map(p => `<li>${esc(p)} \u2014 every office <form method="post" action="/staff/roll/restore" class="inline">${hidden(csrf)}<input type="hidden" name="username" value="${esc(p)}"><button class="linkbtn tiny" type="submit">put back</button></form></li>`).join('')}
          ${r.struck.keys.map(k => {
            const [rank, un] = k.split('|');
            const rn = (Ranks.get(rank) || {}).name || rank;
            return `<li>${esc(un)} \u2014 ${esc(rn)} <form method="post" action="/staff/roll/restore" class="inline">${hidden(csrf)}<input type="hidden" name="username" value="${esc(un)}"><button class="linkbtn tiny" type="submit">put back</button></form></li>`;
          }).join('')}
        </ul>
        <p class="hint" style="margin:0">Put back means the roll may enter them again from the live rolls the next time this page is opened.</p>` : ''}
    </article>` : '';
  return `<section>
    <h2>The Roll of Office</h2>
    <p class="lede">Every post of the Ministry and everyone who has held it. A post is not a page that empties when somebody leaves \u2014 it is a line that goes on.</p>
    <div class="board">${filled.map(card).join('')}</div>
    ${empty.length ? `<div class="section-label">Never Yet Filled</div>
      <p class="lede">${empty.map(o => esc(o.rankName)).join(' \u00b7 ')}</p>` : ''}
    ${keeper}
  </section>`;
}

function personRoll(entries) {
  if (!entries.length) return '';
  return `<div class="section-label">Offices Held</div>
    <ol class="plainlist rollpast">${entries.map(e => `<li><b>${esc(e.rankName)}</b><br>${small(span(e) + (e.why ? ' \u00b7 ' + esc(e.why) : ''))}</li>`).join('')}</ol>`;
}

module.exports = { rollPage, personRoll, span };
