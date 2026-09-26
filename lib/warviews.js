const { esc, hidden } = require('./views');
const W = require('./waroffice');
const { OFFICE, PATHS, CORPS } = require('./warcontent');

const money = n => Number(n || 0).toLocaleString('en-US');
const sub = (nav, body) => `${warNav(nav)}${body}`;

const TABS = [
  ['/war-office', 'The War Office', 'office'],
  ['/war-office/qualifications', 'Qualifications', 'quals'],
  ['/war-office/corps', 'Scouts & Battlemages', 'corps'],
  ['/war-office/roster', 'The Rolls', 'roster'],
  ['/war-office/treasury', 'Treasury', 'treasury']
];

function warNav(active, u) {
  const open = tab => tab[2] !== 'roster' && tab[2] !== 'treasury';
  const items = TABS.filter(t => open(t) || (u && (u.all || (u.perms || []).includes('warroster'))));
  return `<nav class="warnav" aria-label="War Office sections">${items.map(([h, l, k]) =>
    `<a href="${h}"${k === active ? ' class="on" aria-current="page"' : ''}>${esc(l)}</a>`).join('')}</nav>`;
}

function officePage(u) {
  const card = o => `<article class="warrole tone-${o.tone}">
    <h3>${esc(o.name)}</h3>
    <div class="warrole-sub">${esc(o.sub)}</div>
    <ul>${o.duties.map(d => `<li>${esc(d)}</li>`).join('')}</ul>
    ${o.requirement ? `<p class="warreq"><b>Rank required:</b> ${esc(o.requirement)}</p>` : ''}
    ${o.note ? `<p class="warnote">${esc(o.note)}</p>` : ''}
  </article>`;
  return `${warNav('office', u)}
  <section>
    <h2>The Imperial War Office</h2>
    <p class="lede">The War Office directs the Legion within the Imperial Province of Skyrim: its garrisons, its musters, its regulations and the account of its defence. What follows is the standing structure of the Office and the duties attaching to each seat.</p>
    <div class="warroles">${OFFICE.map(card).join('')}</div>
  </section>`;
}

function qualsPage(u) {
  const step = s => `<div class="qstep">
    <div class="qkey">${esc(s.key)}</div>
    <div class="qbody">
      <h4>${esc(s.name)}</h4>
      <ul>${s.learn.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
      ${s.unlocks ? `<p class="qunlock">${esc(s.unlocks)}</p>` : ''}
    </div></div>`;
  const path = p => `<section class="qpath tone-${p.tone}">
    <div class="section-label">${esc(p.name)}</div>
    <div class="qsteps">${p.steps.map(step).join('')}</div>
  </section>`;
  return `${warNav('quals', u)}
  <section>
    <h2>Qualifications of the Legion</h2>
    <p class="lede">Every legionary begins as an Auxiliary and passes the Legionnaire Exam. Beyond that, advancement runs along the lines below. A qualification is earned, recorded against the legionary upon the rolls, and unlocks both duties and equipment.</p>
    ${PATHS.map(path).join('')}
  </section>`;
}

function corpsPage(u) {
  const rung = r => `<li><b>${esc(r.rank)}</b><ul>${r.need.map(n => `<li>${esc(n)}</li>`).join('')}</ul></li>`;
  const corps = c => `<section class="qpath tone-${c.tone}">
    <div class="section-label">${esc(c.name)}</div>
    <p class="lede">${esc(c.lede)}</p>
    <ol class="warladder">${c.ladder.map(rung).join('')}</ol>
  </section>`;
  return `${warNav('corps', u)}
  <section>
    <h2>The Scout Corps and the Battlemages</h2>
    <p class="lede">Two bodies stand apart from the line of the Legion, each with its own ladder and its own conditions of entry.</p>
    ${CORPS.map(corps).join('')}
  </section>`;
}

function qualChips(list) {
  if (!list || !list.length) return '<span class="hint">—</span>';
  return `<span class="qchips">${list.map(q => `<span class="qchip">${esc(q)}</span>`).join('')}</span>`;
}

function rosterPage(u, unitId, csrf, editing, manage) {
  const unit = W.UNIT_BY_ID[unitId];
  const groups = W.grouped(unitId).filter(g => g.people.length);
  const tally = W.counts().find(c => c.id === unitId) || { total: 0, cap: unit.cap, active: 0, pay: 0, bonus: 0 };
  const unitTabs = W.UNITS.map(x => `<a href="/war-office/roster?unit=${x.id}"${x.id === unitId ? ' class="on"' : ''}>${esc(x.name)}</a>`).join('');

  const row = p => `<tr${p.activity === 'Inactive' ? ' class="dim"' : ''}>
    <td><b>${esc(p.name)}</b>${p.senior ? ' <span class="chip">Senior</span>' : ''}</td>
    <td><span class="chip ${W.ACTIVITY_CLASS[p.activity] || ''}">${esc(p.activity)}</span></td>
    <td class="num">${money(p.pay)}</td>
    <td class="num">${p.bonus ? money(p.bonus) : '—'}</td>
    <td>${p.quota ? '✔' : '—'}</td>
    <td>${esc(p.discord) || '—'}</td>
    <td>${esc(p.timezone) || '—'}</td>
    <td>${esc(p.trade) || '—'}</td>
    <td>${qualChips(p.quals)}</td>
    <td>${esc(p.garrison) || '—'}</td>
    <td>${esc(p.notes) || ''}${manage ? `<div class="linkrow tight"><a class="btn ghost small" href="/war-office/roster?unit=${unitId}&edit=${esc(p.id)}">Edit</a><form method="post" action="/war-office/roster/${esc(p.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form></div>` : ''}</td>
  </tr>`;

  const table = groups.length ? groups.map(g => `<div class="section-label">${esc(g.rank)}</div>
    <div class="tablewrap"><table class="ledger roster"><thead><tr>
      <th>Name</th><th>Activity</th><th>Pay</th><th>Bonus</th><th>Quota</th><th>Discord</th><th>Time Zone</th><th>Trade</th><th>Qualifications</th><th>Garrison</th><th>Notes</th>
    </tr></thead><tbody>${g.people.map(row).join('')}</tbody></table></div>`).join('')
    : '<p class="lede">No one is entered upon this roll yet.</p>';

  return `${warNav('roster', u)}
  <section>
    <h2>${esc(unit.name)}</h2>
    <p class="lede">${esc(unit.lede)}</p>
    <nav class="warnav sub">${unitTabs}</nav>
    <div class="warstats">
      <div class="warstat"><span class="n">${tally.total}/${tally.cap}</span><span class="t">Personnel</span></div>
      <div class="warstat"><span class="n">${tally.active}</span><span class="t">Active</span></div>
      <div class="warstat"><span class="n">${money(tally.pay)}</span><span class="t">Pay total</span></div>
      <div class="warstat"><span class="n">${money(tally.bonus)}</span><span class="t">Bonus total</span></div>
    </div>
    ${table}
    ${manage ? personForm(unitId, csrf, editing) : ''}
  </section>`;
}

function personForm(unitId, csrf, p) {
  const unit = W.UNIT_BY_ID[unitId];
  const v = p || {};
  const val = k => esc(v[k] == null ? '' : v[k]);
  const sel = (k, opts, cur) => `<select name="${k}">${opts.map(o => `<option value="${esc(o)}"${cur === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  return `<div class="section-label">${p ? 'Amend ' + esc(p.name) : 'Enter a legionary upon the roll'}</div>
  <form class="writ warform" method="post" action="/war-office/roster${p ? '/' + esc(p.id) : ''}">${hidden(csrf)}
    <input type="hidden" name="unit" value="${esc(unitId)}">
    <div class="wargrid">
      <label class="csf"><span>Name <span class="req">*</span></span><input type="text" name="name" value="${val('name')}" required maxlength="80"></label>
      <label class="csf"><span>Rank</span>${sel('rank', unit.ranks, v.rank)}</label>
      <label class="csf"><span>Activity</span>${sel('activity', W.ACTIVITY, v.activity || 'Active')}</label>
      <label class="csf"><span>Pay</span><input type="number" name="pay" value="${val('pay') || 0}" min="0" step="25"></label>
      <label class="csf"><span>Bonus pay</span><input type="number" name="bonus" value="${val('bonus') || 0}" min="0" step="25"></label>
      <label class="csf"><span>Discord</span><input type="text" name="discord" value="${val('discord')}" maxlength="60"></label>
      <label class="csf"><span>Time zone</span><input type="text" name="timezone" value="${val('timezone')}" maxlength="24" placeholder="e.g. EST, GMT"></label>
      <label class="csf"><span>Trade</span>${sel('trade', [''].concat(W.TRADES), v.trade || '')}</label>
      <label class="csf"><span>Garrison</span><input type="text" name="garrison" value="${val('garrison') || 'Fort Sungard'}" maxlength="60"></label>
      <label class="csf csf-wide"><span>Additional notes</span><input type="text" name="notes" value="${val('notes')}" maxlength="300"></label>
    </div>
    <div class="section-label">Qualifications</div>
    <div class="qpick">${W.QUALS.map(q => `<label class="qpickone"><input type="checkbox" name="quals" value="${esc(q.key)}"${(v.quals || []).includes(q.key) ? ' checked' : ''}> ${esc(q.key)}</label>`).join('')}</div>
    <div class="linkrow">
      <label class="warcheck"><input type="checkbox" name="quota"${v.quota ? ' checked' : ''}> Quota met</label>
      <label class="warcheck"><input type="checkbox" name="senior"${v.senior ? ' checked' : ''}> Senior</label>
    </div>
    <div class="linkrow"><button class="btn" type="submit">${p ? 'Save the amendment' : 'Enter upon the roll'}</button>${p ? `<a class="btn ghost" href="/war-office/roster?unit=${esc(unitId)}">Cancel</a>` : ''}</div>
  </form>`;
}

function treasuryPage(u, csrf, manage) {
  const t = W.treasury();
  const line = (x, dir) => `<tr><td>${esc(x.label)}</td><td class="num">${dir === 'out' ? '-' : ''}${money(x.amount)}</td>${manage ? `<td><form method="post" action="/war-office/treasury/${esc(x.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form></td>` : ''}</tr>`;
  const tbl = (rows, dir, title, empty) => `<div class="section-label">${title}</div>
    ${rows.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>Type</th><th>Total</th>${manage ? '<th></th>' : ''}</tr></thead><tbody>${rows.map(x => line(x, dir)).join('')}</tbody></table></div>` : `<p class="hint">${empty}</p>`}`;
  return `${warNav('treasury', u)}
  <section>
    <h2>The Legion Treasury</h2>
    <p class="lede">Every sum in and out of the Legion chest, and what stands in it today.</p>
    <div class="warstats big">
      <div class="warstat"><span class="n">${money(t.balance)}</span><span class="t">Current total</span></div>
      <div class="warstat in"><span class="n">${money(t.totalIn)}</span><span class="t">Total in</span></div>
      <div class="warstat out"><span class="n">-${money(t.totalOut)}</span><span class="t">Total out</span></div>
    </div>
    <div class="two">
      <div>${tbl(t.income, 'in', 'Treasury In', 'Nothing has come in yet.')}</div>
      <div>${tbl(t.spend, 'out', 'Treasury Out', 'Nothing has gone out yet.')}</div>
    </div>
    ${manage ? `<div class="section-label">Enter a sum</div>
    <form class="writ warform" method="post" action="/war-office/treasury">${hidden(csrf)}
      <div class="wargrid">
        <label class="csf"><span>What is it for <span class="req">*</span></span><input type="text" name="label" required maxlength="120" placeholder="e.g. Main legion Payroll 04.09.2026"></label>
        <label class="csf"><span>Sum</span><input type="number" name="amount" min="1" step="1" required></label>
        <label class="csf"><span>In or out</span><select name="dir"><option value="in">Into the chest</option><option value="out">Out of the chest</option></select></label>
      </div>
      <div class="linkrow"><button class="btn" type="submit">Enter it in the ledger</button></div>
    </form>` : ''}
  </section>`;
}

module.exports = { officePage, qualsPage, corpsPage, rosterPage, treasuryPage, warNav };
