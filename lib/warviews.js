const { esc, hidden } = require('./views');
const W = require('./waroffice');
const { OFFICE, PATHS, CORPS } = require('./warcontent');

const money = n => Number(n || 0).toLocaleString('en-US');
const small = t => `<span class="small">${t}</span>`;
const sub = (nav, body) => `${warNav(nav)}${body}`;

const TABS = [
  ['/war-office', 'The War Office', 'office', true],
  ['/war-office/qualifications', 'Qualifications', 'quals', true],
  ['/war-office/corps', 'Scouts & Battlemages', 'corps', true],
  ['/war-office/roster', 'The Rolls', 'roster', false],
  ['/war-office/promotions', 'Promotions', 'promotions', false],
  ['/war-office/quota', 'Quota', 'quota', false],
  ['/war-office/writs', 'Writs', 'writs', false],
  ['/war-office/properties', 'Holdings', 'properties', true],
  ['/war-office/treasury', 'Treasury', 'treasury', false]
];

function warNav(active, u) {
  const perms = (u && u.perms) || [];
  const inside = !!(u && (u.all || perms.includes('warroster') || perms.includes('warmanage')));
  const items = TABS.filter(t => t[3] || inside);
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
  const shown = W.displayQuals(list);
  if (!shown.length) return '<span class="dash">—</span>';
  return `<span class="qchips" title="${esc((list || []).join(', '))}">${shown.map(q => `<span class="qchip">${esc(q)}</span>`).join('')}</span>`;
}

function rosterPage(u, unitId, csrf, editing, manage) {
  const quota = W.quotaCurrent();
  const unit = W.UNIT_BY_ID[unitId];
  const groups = W.grouped(unitId).filter(g => g.people.length);
  const tally = W.counts().find(c => c.id === unitId) || { total: 0, cap: unit.cap, active: 0, pay: 0, bonus: 0 };
  const unitTabs = W.UNITS.map(x => `<a href="/war-office/roster?unit=${x.id}"${x.id === unitId ? ' class="on"' : ''}>${esc(x.name)}</a>`).join('');

  const row = p => `<tr class="prow${p.activity === 'Inactive' ? ' dim' : ''}" data-activity="${esc(p.activity)}" data-name="${esc(String(p.name).toLowerCase())}">
    <td><a class="plain" href="/war-office/roster/${esc(p.id)}"><b>${esc(p.name)}</b></a>${p.senior ? ' <span class="chip tiny">Senior</span>' : ''}</td>
    <td><span class="chip ${W.ACTIVITY_CLASS[p.activity] || ''}">${esc(p.activity)}</span></td>
    <td class="num">${p.pay ? money(p.pay) : '<span class="dash">—</span>'}</td>
    <td class="num">${p.bonus ? money(p.bonus) : '<span class="dash">—</span>'}</td>
    <td class="mid">${W.quotaMet(p, quota) ? '<span class="tick">✔</span>' : '<span class="dash">—</span>'}</td>
    <td>${esc(p.discord) || '<span class="dash">—</span>'}</td>
    <td>${esc(p.timezone) || '<span class="dash">—</span>'}</td>
    <td>${esc(p.trade) || '<span class="dash">—</span>'}</td>
    <td>${qualChips(p.quals)}</td>
    <td>${esc(p.garrison) || '<span class="dash">—</span>'}</td>
    <td class="notecell">${esc(p.notes) || ''}</td>
    ${manage ? `<td class="actions-col"><a class="btn ghost small" href="/war-office/roster?unit=${unitId}&edit=${esc(p.id)}#amend">Edit</a> <form method="post" action="/war-office/roster/${esc(p.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form></td>` : ''}
  </tr>`;

  const cols = manage ? 12 : 11;
  const table = groups.length ? `<div class="tablewrap"><table class="ledger roster"><thead><tr>
      <th>Name</th><th>Activity</th><th>Pay</th><th>Bonus</th><th class="mid">Quota</th><th>Discord</th><th>Time Zone</th><th>Trade</th><th>Qualifications</th><th>Garrison</th><th>Notes</th>${manage ? '<th></th>' : ''}
    </tr></thead><tbody>${groups.map(g => `<tr class="rankrow" data-rank="${esc(g.rank)}"><td colspan="${cols}">${esc(g.rank)} <span class="rankcount">${g.people.length}</span></td></tr>${g.people.map(row).join('')}`).join('')}</tbody></table></div>`
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
    ${groups.length ? `<div class="rosterbar">
      <input type="search" id="rfilter" placeholder="Search this roll by name…" aria-label="Search the roll">
      <span class="rfilters">${['All'].concat(W.ACTIVITY).map(a => `<button type="button" class="rfilter${a === 'All' ? ' on' : ''}" data-act="${esc(a)}">${esc(a)}</button>`).join('')}</span>
      <span class="rcount" id="rcount"></span>
    </div>` : ''}
    ${table}
    ${manage ? `<details class="addwrap" id="amend"${editing ? ' open' : ''}>
      <summary>${editing ? 'Amending ' + esc(editing.name) : 'Enter a legionary upon the roll'}</summary>
      ${personForm(unitId, csrf, editing)}
    </details>` : ''}
    <script>(function(){
      var q=document.getElementById('rfilter'); if(!q) return;
      var rows=[].slice.call(document.querySelectorAll('tr.prow')), act='All';
      var count=document.getElementById('rcount');
      function apply(){
        var n=0, t=q.value.trim().toLowerCase();
        rows.forEach(function(r){
          var okA = act==='All' || r.getAttribute('data-activity')===act;
          var okN = !t || r.getAttribute('data-name').indexOf(t)>-1;
          var show = okA && okN;
          r.style.display = show ? '' : 'none';
          if(show) n++;
        });
        [].slice.call(document.querySelectorAll('tr.rankrow')).forEach(function(h){
          var any=false, r=h.nextElementSibling;
          while(r && r.className.indexOf('rankrow')===-1){ if(r.style.display!=='none') any=true; r=r.nextElementSibling; }
          h.style.display = any ? '' : 'none';
        });
        count.textContent = n + ' shown';
      }
      q.addEventListener('input', apply);
      [].slice.call(document.querySelectorAll('.rfilter')).forEach(function(b){
        b.addEventListener('click', function(){
          [].slice.call(document.querySelectorAll('.rfilter')).forEach(function(x){x.className='rfilter';});
          b.className='rfilter on';
          act=b.getAttribute('data-act');
          apply();
        });
      });
      apply();
    })();</script>
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
    <div class="qpick">${W.TRACKS.map(t => `<div class="qtrack"><div class="qtrack-name">${esc(t.name)}${t.tiered ? '' : ''}</div><div class="qtrack-opts">${t.keys.map(k => `<label class="qpickone"><input type="checkbox" name="quals" value="${esc(k)}"${(v.quals || []).includes(k) ? ' checked' : ''}> ${esc(k)}</label>`).join('')}</div></div>`).join('')}</div>
    <div class="linkrow">
      <label class="warcheck"><input type="checkbox" name="quota"${v.quota ? ' checked' : ''}> Quota met</label>
      <label class="warcheck"><input type="checkbox" name="senior"${v.senior ? ' checked' : ''}> Senior</label>
    </div>
    <div class="linkrow"><button class="btn" type="submit">${p ? 'Save the amendment' : 'Enter upon the roll'}</button>${p ? `<a class="btn ghost" href="/war-office/roster?unit=${esc(unitId)}">Cancel</a>` : ''}</div>
  </form>`;
}

function treasuryPage(u, csrf, manage) {
  const t = W.treasury();
  const strike = x => manage ? `<td class="actions-col"><form method="post" action="/war-office/treasury/${esc(x.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form></td>` : '';
  const line = (x, sign) => `<tr><td>${esc(x.label)}</td><td class="num">${sign}${money(x.amount)}</td>${strike(x)}</tr>`;
  const tbl = (rows, sign, title, empty) => `<div class="section-label">${title}</div>
    ${rows.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>Type</th><th>Total</th>${manage ? '<th></th>' : ''}</tr></thead><tbody>${rows.map(x => line(x, sign)).join('')}</tbody></table></div>` : `<p class="hint">${empty}</p>`}`;

  const moves = t.transfers.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>Movement</th><th>Direction</th><th>Sum</th>${manage ? '<th></th>' : ''}</tr></thead><tbody>${t.transfers.map(x => `<tr>
      <td>${esc(x.label)}</td>
      <td>${x.dir === 'to-reserve' ? '<span class="chip">Chest \u2192 Reserve</span>' : '<span class="chip ok">Reserve \u2192 Chest</span>'}</td>
      <td class="num">${money(x.amount)}</td>${strike(x)}</tr>`).join('')}</tbody></table></div>`
    : '<p class="hint">Nothing has been set aside in the reserve.</p>';

  return `${warNav('treasury', u)}
  <section>
    <h2>The Legion Treasury</h2>
    <p class="lede">Every sum in and out of the Legion chest, what is held back in reserve, and what stands to the Legion today.</p>
    <div class="warstats big">
      <div class="warstat"><span class="n">${money(t.chest)}</span><span class="t">Working chest</span></div>
      <div class="warstat res"><span class="n">${money(t.reserve)}</span><span class="t">In reserve</span></div>
      <div class="warstat hold"><span class="n">${money(t.holdings)}</span><span class="t">Total holdings</span></div>
    </div>
    <div class="warstats">
      <div class="warstat in"><span class="n">${money(t.totalIn)}</span><span class="t">Total in</span></div>
      <div class="warstat out"><span class="n">-${money(t.totalOut)}</span><span class="t">Total out</span></div>
      <div class="warstat"><span class="n">${money(t.toReserve)}</span><span class="t">Set aside</span></div>
      <div class="warstat"><span class="n">${money(t.fromReserve)}</span><span class="t">Drawn back</span></div>
    </div>
    <div class="two">
      <div>${tbl(t.income, '', 'Treasury In', 'Nothing has come in yet.')}</div>
      <div>${tbl(t.spend, '-', 'Treasury Out', 'Nothing has gone out yet.')}</div>
    </div>
    <div class="section-label">The Reserve</div>
    <p class="hint">Sums set aside are taken from the working chest and held back. They still stand to the Legion, and may be drawn upon again.</p>
    ${moves}
    ${manage ? `<details class="addwrap" open>
      <summary>Enter a sum</summary>
      <form class="warform" method="post" action="/war-office/treasury">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>What is it for <span class="req">*</span></span><input type="text" name="label" required maxlength="120" placeholder="e.g. Main legion Payroll 04.09.2026"></label>
          <label class="csf"><span>Sum</span><input type="number" name="amount" min="1" step="1" required></label>
          <label class="csf"><span>Where it goes</span><select name="dir">
            <option value="in">Into the chest \u2014 income</option>
            <option value="out">Out of the chest \u2014 spent</option>
            <option value="to-reserve">Set aside into the reserve</option>
            <option value="from-reserve">Drawn back from the reserve</option>
          </select></label>
        </div>
        <div class="linkrow"><button class="btn" type="submit">Enter it in the ledger</button></div>
      </form>
    </details>` : ''}
  </section>`;
}


const when = iso => { if (!iso) return ''; const d = new Date(iso); return d.toISOString().slice(0, 10); };
const KIND_LABEL = { entered: 'Entered', amended: 'Amended', promotion: 'Promotion', writ: 'Writ', quota: 'Quota', note: 'Note' };

function personPage(u, p, ctx, csrf, manage) {
  const unit = W.UNIT_BY_ID[p.unit];
  const q = ctx.quota;
  const met = W.quotaMet(p, q);
  const hist = (p.history || []).slice().reverse();
  const fact = (l, v) => `<dt>${esc(l)}</dt><dd>${v || '<span class="dash">\u2014</span>'}</dd>`;
  return `${warNav('roster', u)}
  <section>
    <p style="margin:0 0 10px"><a href="/war-office/roster?unit=${esc(p.unit)}">\u2190 ${esc(unit.name)}</a></p>
    <h2>${esc(p.name)}</h2>
    <p class="lede">${esc(p.rank)} of ${esc(unit.name)}${p.senior ? ', senior' : ''} \u00b7 <span class="chip ${W.ACTIVITY_CLASS[p.activity] || ''}">${esc(p.activity)}</span></p>
    <div class="two">
      <div>
        <div class="section-label">Particulars</div>
        <dl class="meta">
          ${fact('Pay', p.pay ? money(p.pay) : '')}
          ${fact('Bonus pay', p.bonus ? money(p.bonus) : '')}
          ${fact('Discord', esc(p.discord))}
          ${fact('Time zone', esc(p.timezone))}
          ${fact('Trade', esc(p.trade))}
          ${fact('Garrison', esc(p.garrison))}
          ${fact('Notes', esc(p.notes))}
        </dl>
        <div class="section-label">Qualifications</div>
        ${qualChips(p.quals)}
        ${q ? `<div class="section-label">Quota \u2014 ${esc(q.label)}</div>
          <p class="${met ? 'quota-met' : 'quota-short'}">${esc(q.counts)}: <b>${(q.progress || {})[p.id] || 0}</b> of ${q.target} \u00b7 ${met ? 'met' : 'short'}</p>` : ''}
      </div>
      <div>
        ${manage ? `<div class="section-label">Lay a promotion before the Board</div>
        ${ctx.pending ? `<p class="notice">A promotion to <b>${esc(ctx.pending.toRank)}</b> already waits upon the Board.</p>` : `
        <form class="warform" method="post" action="/war-office/promotions">${hidden(csrf)}
          <input type="hidden" name="personId" value="${esc(p.id)}">
          <div class="wargrid">
            <label class="csf"><span>Raise to</span><select name="toRank">${unit.ranks.filter(r => r !== p.rank).map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join('')}</select></label>
            <label class="csf csf-wide"><span>Reason</span><input type="text" name="reason" maxlength="400" placeholder="Why the Board should raise them"></label>
          </div>
          <div class="linkrow"><button class="btn small" type="submit">Lay it before the Board</button><a class="btn ghost small" href="/war-office/roster?unit=${esc(p.unit)}&edit=${esc(p.id)}#amend">Amend particulars</a></div>
        </form>`}` : ''}
        ${ctx.writs.length ? `<div class="section-label">Writs</div><ul class="plainlist">${ctx.writs.map(w => `<li><a href="/war-office/writs/${esc(w.id)}">${esc(w.no)}</a> \u2014 ${esc(w.subject)} ${small(esc(when(w.at)))}</li>`).join('')}</ul>` : ''}
      </div>
    </div>
    <div class="section-label">Service Record</div>
    ${hist.length ? `<ul class="histlist">${hist.map(h => `<li class="h-${esc(h.kind)}">
      <span class="h-when">${esc(when(h.at))}</span>
      <span class="h-kind">${esc(KIND_LABEL[h.kind] || h.kind)}</span>
      <span class="h-text">${esc(h.text)}${h.by ? small(' \u2014 ' + esc(h.by)) : ''}</span></li>`).join('')}</ul>`
      : '<p class="hint">Nothing is yet recorded.</p>'}
  </section>`;
}

function promotionsPage(u, open, past, csrf, manage) {
  const card = e => `<article class="promo">
    <div class="promo-head"><b>${esc(e.name)}</b> <span class="chip">${esc(e.fromRank)} \u2192 ${esc(e.toRank)}</span></div>
    <p class="small">Laid before the Board by ${esc(e.byName)} \u00b7 ${esc(when(e.at))}</p>
    ${e.reason ? `<p class="pre">${esc(e.reason)}</p>` : ''}
    ${manage ? `<div class="linkrow">
      <form method="post" action="/war-office/promotions/${esc(e.id)}" class="inline">${hidden(csrf)}<input type="hidden" name="act" value="approve"><button class="btn small" type="submit">Approve</button></form>
      <form method="post" action="/war-office/promotions/${esc(e.id)}" class="inline">${hidden(csrf)}<input type="hidden" name="act" value="decline"><button class="btn ghost small" type="submit">Decline</button></form>
      <a class="btn ghost small" href="/war-office/roster/${esc(e.personId)}">Service record</a>
    </div>` : ''}
  </article>`;
  return `${warNav('promotions', u)}
  <section>
    <h2>The Imperial Legion Promotions Board</h2>
    <p class="lede">Promotions are laid before the Board and take effect only when signed off. Every decision is written into the legionary\u2019s service record.</p>
    <div class="section-label">Before the Board</div>
    ${open.length ? `<div class="board">${open.map(card).join('')}</div>` : '<p class="lede">No promotion waits upon the Board.</p>'}
    <div class="section-label">Decided</div>
    ${past.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>Legionary</th><th>Raised</th><th>Answer</th><th>By</th><th>When</th></tr></thead><tbody>${past.slice(0, 60).map(e => `<tr>
      <td><a href="/war-office/roster/${esc(e.personId)}">${esc(e.name)}</a></td>
      <td>${esc(e.fromRank)} \u2192 ${esc(e.toRank)}</td>
      <td><span class="chip ${e.status === 'Approved' ? 'ok' : 'warn'}">${esc(e.status)}</span></td>
      <td>${esc(e.decidedBy)}</td><td>${esc(when(e.decidedAt))}</td></tr>`).join('')}</tbody></table></div>` : '<p class="hint">Nothing decided yet.</p>'}
  </section>`;
}

function quotaPage(u, current, periods, people, csrf, manage) {
  const rows = people.map(p => {
    const n = current ? (current.progress || {})[p.id] || 0 : 0;
    const met = current ? W.quotaMet(p, current) : false;
    return `<tr>
      <td><a href="/war-office/roster/${esc(p.id)}">${esc(p.name)}</a> ${small(esc(p.rank))}</td>
      <td><span class="chip ${W.ACTIVITY_CLASS[p.activity] || ''}">${esc(p.activity)}</span></td>
      <td class="num">${n}</td>
      <td>${met ? '<span class="tick">\u2714 met</span>' : `<span class="quota-short">short by ${Math.max(0, (current ? current.target : 0) - n)}</span>`}</td>
      ${manage && current ? `<td><form method="post" action="/war-office/quota/count" class="inline">${hidden(csrf)}<input type="hidden" name="personId" value="${esc(p.id)}"><input class="qnum" type="number" name="count" value="${n}" min="0" max="999"><button class="btn ghost small" type="submit">Set</button></form></td>` : ''}
    </tr>`;
  }).join('');
  const metCount = current ? people.filter(p => W.quotaMet(p, current)).length : 0;
  return `${warNav('quota', u)}
  <section>
    <h2>Quota</h2>
    <p class="lede">The Legion sets its own quota: what is counted, how much of it, and over what period. Change it whenever the Legion\u2019s business changes.</p>
    ${current ? `<div class="warstats">
      <div class="warstat"><span class="n">${esc(current.target)}</span><span class="t">${esc(current.counts)}</span></div>
      <div class="warstat"><span class="n">${metCount}/${people.length}</span><span class="t">Have met it</span></div>
      <div class="warstat"><span class="n">${esc(current.label)}</span><span class="t">Period</span></div>
    </div>
    ${people.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>Legionary</th><th>Standing</th><th>Count</th><th>Quota</th>${manage ? '<th>Set</th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="lede">No one is upon the rolls.</p>'}`
      : '<p class="notice">No quota has been set. Set one below and it becomes the standing quota of the Legion.</p>'}
    ${manage ? `<details class="addwrap"${current ? '' : ' open'}>
      <summary>${current ? 'Amend the quota, or begin a new period' : 'Set the quota'}</summary>
      <form class="warform" method="post" action="/war-office/quota">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Period <span class="req">*</span></span><input type="text" name="label" maxlength="80" required value="${esc(current ? current.label : '')}" placeholder="e.g. Hearthfire 4E 226"></label>
          <label class="csf"><span>What is counted <span class="req">*</span></span><input type="text" name="counts" maxlength="80" required value="${esc(current ? current.counts : '')}" placeholder="e.g. Patrols attended"></label>
          <label class="csf"><span>How many</span><input type="number" name="target" min="0" max="999" value="${esc(current ? current.target : 2)}"></label>
        </div>
        <div class="linkrow">
          ${current ? `<button class="btn" name="mode" value="amend" type="submit">Amend this period</button><button class="btn ghost" name="mode" value="new" type="submit">Close it and begin a new period</button>`
            : '<button class="btn" name="mode" value="new" type="submit">Set the quota</button>'}
        </div>
      </form>
    </details>` : ''}
    ${periods.length > 1 ? `<div class="section-label">Periods Past</div><ul class="plainlist">${periods.filter(q => q.closed).map(q => `<li><b>${esc(q.label)}</b> \u2014 ${esc(q.counts)}, ${q.target} required ${small(Object.keys(q.progress || {}).length + ' recorded')}</li>`).join('')}</ul>` : ''}
  </section>`;
}

function writsPage(u, kind, list, csrf, manage, people) {
  const types = W.WRIT_TYPES;
  const tabs = `<nav class="warnav sub"><a href="/war-office/writs"${!kind ? ' class="on"' : ''}>All</a>${types.map(t => `<a href="/war-office/writs?kind=${t.key}"${kind === t.key ? ' class="on"' : ''}>${esc(t.name)}</a>`).join('')}</nav>`;
  const cur = kind ? W.WRIT_BY_KEY[kind] : null;
  return `${warNav('writs', u)}
  <section>
    <h2>Writs of the Legion</h2>
    <p class="lede">Orders, reports and findings of the Legion, kept upon the rolls of the War Office. They are not sealed into the Ministry archives.</p>
    ${tabs}
    ${cur ? `<p class="hint">${esc(cur.lede)}</p>` : ''}
    ${list.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>Writ</th><th>Subject</th><th>Concerning</th><th>Entered by</th><th>When</th>${manage ? '<th></th>' : ''}</tr></thead><tbody>${list.slice(0, 120).map(w => `<tr>
      <td class="num"><a href="/war-office/writs/${esc(w.id)}">${esc(w.no)}</a></td>
      <td>${esc(w.subject)}</td>
      <td>${w.personId ? `<a href="/war-office/roster/${esc(w.personId)}">${esc(w.personName)}</a>` : '<span class="dash">\u2014</span>'}</td>
      <td>${esc(w.byName)}</td><td>${esc(when(w.at))}</td>
      ${manage ? `<td class="actions-col"><form method="post" action="/war-office/writs/${esc(w.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form></td>` : ''}
    </tr>`).join('')}</tbody></table></div>` : '<p class="lede">No writ of this kind stands upon the rolls.</p>'}
    ${manage ? `<details class="addwrap">
      <summary>Enter a writ</summary>
      <form class="warform" method="post" action="/war-office/writs">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Kind</span><select name="kind">${types.map(t => `<option value="${t.key}"${kind === t.key ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>
          <label class="csf"><span>Subject <span class="req">*</span></span><input type="text" name="subject" required maxlength="140"></label>
          <label class="csf"><span>Concerning</span><select name="personId"><option value="">\u2014 no one in particular \u2014</option>${people.map(p => `<option value="${esc(p.id)}">${esc(p.name)} \u2014 ${esc(p.rank)}</option>`).join('')}</select></label>
          <label class="csf"><span>Place</span><input type="text" name="place" maxlength="120"></label>
          <label class="csf"><span>When</span><input type="text" name="when" maxlength="80" placeholder="e.g. 26th of Hearthfire"></label>
          <label class="csf"><span>Outcome</span><input type="text" name="outcome" maxlength="140"></label>
        </div>
        <label class="csf csf-wide" style="margin-top:10px"><span>The writ</span><textarea name="body" rows="5" maxlength="6000"></textarea></label>
        <div class="linkrow"><button class="btn" type="submit">Enter it upon the rolls</button></div>
      </form>
    </details>` : ''}
  </section>`;
}

function writPage(u, w, manage, csrf) {
  const t = W.WRIT_BY_KEY[w.kind];
  return `${warNav('writs', u)}
  <section>
    <p style="margin:0 0 10px"><a href="/war-office/writs?kind=${esc(w.kind)}">\u2190 ${esc(t ? t.name : 'Writs')}</a></p>
    <h2>${esc(w.no)}</h2>
    <p class="lede">${esc(w.subject)}</p>
    <dl class="meta">
      ${w.personId ? `<dt>Concerning</dt><dd><a href="/war-office/roster/${esc(w.personId)}">${esc(w.personName)}</a></dd>` : ''}
      ${w.place ? `<dt>Place</dt><dd>${esc(w.place)}</dd>` : ''}
      ${w.when ? `<dt>When</dt><dd>${esc(w.when)}</dd>` : ''}
      ${w.outcome ? `<dt>Outcome</dt><dd>${esc(w.outcome)}</dd>` : ''}
      <dt>Entered by</dt><dd>${esc(w.byName)} \u00b7 ${esc(when(w.at))}</dd>
    </dl>
    ${w.body ? `<div class="section-label">The Writ</div><p class="pre">${esc(w.body)}</p>` : ''}
  </section>`;
}

const PROP_CLASS = { Held: 'ok', Contested: 'warn', 'Under Repair': 'warn', Ruined: 'bad', Surrendered: '' };

function propertiesPage(u, list, totals, csrf, manage, editing) {
  const sel = (n, opts, cur) => `<select name="${n}">${opts.map(o => `<option value="${esc(o)}"${cur === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  const v = editing || {};
  const val = k => esc(v[k] == null ? '' : v[k]);
  const card = x => `<article class="holding-card">
    <div class="holding-head">
      <div><h3>${esc(x.name)}</h3><div class="holding-sub">${esc(x.kind)}${x.hold ? ' \u00b7 ' + esc(x.hold) : ''}</div></div>
      <span class="chip ${PROP_CLASS[x.standing] || ''}">${esc(x.standing)}</span>
    </div>
    <dl class="meta">
      ${x.keeper ? `<dt>Keeper</dt><dd>${esc(x.keeper)}</dd>` : ''}
      ${x.garrisoned ? `<dt>Garrisoned</dt><dd>${x.garrisoned}</dd>` : ''}
      ${x.upkeep ? `<dt>Upkeep</dt><dd>${money(x.upkeep)} the month</dd>` : ''}
      ${x.acquired ? `<dt>Taken</dt><dd>${esc(x.acquired)}</dd>` : ''}
      ${x.authority ? `<dt>By authority of</dt><dd>${esc(x.authority)}</dd>` : ''}
    </dl>
    ${x.notes ? `<p class="pre holding-notes">${esc(x.notes)}</p>` : ''}
    ${manage ? `<div class="linkrow tight">
      <a class="btn ghost small" href="/war-office/properties?edit=${esc(x.id)}#holding">Amend</a>
      <form method="post" action="/war-office/properties/${esc(x.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form>
    </div>` : ''}
  </article>`;

  return `${warNav('properties', u)}
  <section>
    <h2>Holdings of the Legion</h2>
    <p class="lede">Every fort, garrison, watchtower and storehouse the Imperial Legion holds within the province, and upon whose authority it is held. The Chief of the War Office oversees Imperial Legion property ownership.</p>
    ${list.length ? `<div class="warstats">
      <div class="warstat"><span class="n">${totals.total}</span><span class="t">Holdings</span></div>
      <div class="warstat"><span class="n">${totals.held}</span><span class="t">Firmly held</span></div>
      <div class="warstat"><span class="n">${totals.garrisoned}</span><span class="t">Garrisoned</span></div>
      <div class="warstat out"><span class="n">${money(totals.upkeep)}</span><span class="t">Upkeep the month</span></div>
    </div>
    <div class="holdings">${list.map(card).join('')}</div>`
      : '<p class="lede">The Legion holds nothing upon this register yet.</p>'}
    ${manage ? `<details class="addwrap" id="holding"${editing ? ' open' : ''}>
      <summary>${editing ? 'Amending ' + esc(editing.name) : 'Enter a holding upon the register'}</summary>
      <form class="warform" method="post" action="/war-office/properties${editing ? '/' + esc(editing.id) : ''}">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Name <span class="req">*</span></span><input type="text" name="name" required maxlength="90" value="${val('name')}" placeholder="e.g. Fort Sungard"></label>
          <label class="csf"><span>Kind</span>${sel('kind', W.PROP_KINDS, v.kind)}</label>
          <label class="csf"><span>Hold</span><input type="text" name="hold" maxlength="60" value="${val('hold')}" placeholder="e.g. Falkreath"></label>
          <label class="csf"><span>Standing</span>${sel('standing', W.PROP_STANDING, v.standing)}</label>
          <label class="csf"><span>Keeper</span><input type="text" name="keeper" maxlength="90" value="${val('keeper')}" placeholder="Officer answerable for it"></label>
          <label class="csf"><span>Garrisoned</span><input type="number" name="garrisoned" min="0" max="9999" value="${val('garrisoned') || 0}"></label>
          <label class="csf"><span>Upkeep the month</span><input type="number" name="upkeep" min="0" value="${val('upkeep') || 0}"></label>
          <label class="csf"><span>Taken</span><input type="text" name="acquired" maxlength="60" value="${val('acquired')}" placeholder="e.g. 4E 224"></label>
          <label class="csf csf-wide"><span>By authority of</span><input type="text" name="authority" maxlength="140" value="${val('authority')}" placeholder="Writ, treaty or grant under which it is held"></label>
        </div>
        <label class="csf csf-wide" style="margin-top:10px"><span>Notes</span><textarea name="notes" rows="3" maxlength="1200">${esc(v.notes || '')}</textarea></label>
        <div class="linkrow"><button class="btn" type="submit">${editing ? 'Save the amendment' : 'Enter it upon the register'}</button>${editing ? '<a class="btn ghost" href="/war-office/properties">Cancel</a>' : ''}</div>
      </form>
    </details>` : ''}
  </section>`;
}

module.exports = { propertiesPage, personPage, promotionsPage, quotaPage, writsPage, writPage, officePage, qualsPage, corpsPage, rosterPage, treasuryPage, warNav };
