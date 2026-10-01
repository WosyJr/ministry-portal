const { esc } = require('./views');
const Roll = require('./roll');
const Ranks = require('./ranks');

const small = s => `<span class="small">${s}</span>`;
const day = iso => { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (_) { return ''; } };

function span(e) {
  const from = day(e.from);
  if (!e.until) return `${esc(from)} \u2014 <b>in office</b>`;
  return `${esc(from)} to ${esc(day(e.until))}`;
}

function rollPage(u, offices) {
  const filled = offices.filter(o => o.entries.length);
  const empty = offices.filter(o => !o.entries.length);
  const card = o => `<article class="reqcard rollcard">
    <div class="no">${esc(o.group || '')}${o.past.length ? ` \u00b7 ${o.past.length} before` : ''}</div>
    <h3>${esc(o.rankName)}</h3>
    ${o.now.length
      ? o.now.map(e => `<p class="rollnow"><b>${esc(e.name)}</b> ${small(span(e))}</p>`).join('')
      : '<p class="hint">Vacant.</p>'}
    ${o.past.length ? `<details class="inlinedit"><summary class="btn ghost small">Those who held it before</summary>
      <ol class="plainlist rollpast">${o.past.map(e => `<li><b>${esc(e.name)}</b><br>${small(span(e) + (e.why ? ' \u00b7 ' + esc(e.why) : ''))}</li>`).join('')}</ol>
    </details>` : ''}
  </article>`;
  return `<section>
    <h2>The Roll of Office</h2>
    <p class="lede">Every post of the Ministry and everyone who has held it. A post is not a page that empties when somebody leaves \u2014 it is a line that goes on.</p>
    <div class="board">${filled.map(card).join('')}</div>
    ${empty.length ? `<div class="section-label">Never Yet Filled</div>
      <p class="lede">${empty.map(o => esc(o.rankName)).join(' \u00b7 ')}</p>` : ''}
  </section>`;
}

function personRoll(entries) {
  if (!entries.length) return '';
  return `<div class="section-label">Offices Held</div>
    <ol class="plainlist rollpast">${entries.map(e => `<li><b>${esc(e.rankName)}</b><br>${small(span(e) + (e.why ? ' \u00b7 ' + esc(e.why) : ''))}</li>`).join('')}</ol>`;
}

module.exports = { rollPage, personRoll, span };
