const { esc, hidden } = require('./views');
const Ranks = require('./ranks');
const F = require('./finance');
const { OFFICE, WINGS, PRINCIPLES } = require('./financecontent');

const small = t => `<span class="small">${t}</span>`;
const pre = t => `<p class="pre">${esc(t)}</p>`;
const when = iso => (iso ? String(iso).slice(0, 10) : '');
const num = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = n => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const pcts = n => (Math.round(Number(n || 0) * 1000) / 1000) + '%';

const TABS = [
  ['/finance', 'The Ministry', 'hall', true],
  ['/finance/principles', 'How Money Is Kept', 'principles', true],
  ['/finance/account', 'The Account', 'account', true],
  ['/finance/overview', 'Overview', 'overview', false],
  ['/finance/months', 'Monthly Budget', 'months', false],
  ['/finance/payout', 'Pay Out', 'payout', false],
  ['/finance/requests', 'Requests', 'requests', false],
  ['/finance/spending', 'Spending', 'spending', false],
  ['/finance/rosters', 'Rosters', 'rosters', false],
  ['/finance/settings', 'Groups & Holds', 'settings', false],
  ['/finance/vault', 'Bank Logins', 'vault', false],
  ['/finance/officers', 'Officers', 'officers', false]
];

function finNav(active, u) {
  const inside = !!(u && (u.all || Ranks.can(u, 'findesk') || Ranks.can(u, 'finledger')));
  const admin = Ranks.mayAdminBranch(u, 'finance');
  const link = ([h, l, k]) => `<a href="${h}"${k === active ? ' class="on" aria-current="page"' : ''}>${esc(l)}</a>`;
  const pub = TABS.filter(t => t[3]);
  const staff = TABS.filter(t => !t[3] && (t[2] === 'officers' ? admin : t[2] === 'vault' ? !!(u && u.all) : inside));
  return `<nav class="warnav" aria-label="Finance, open to all">${pub.map(link).join('')}</nav>
  ${staff.length ? `<nav class="warnav staffrow" aria-label="Finance, officers only"><span class="rowlead">❖ Officers only</span>${staff.map(link).join('')}</nav>` : ''}`;
}

const monthPicker = (key, path) => {
  const prev = F.shiftKey(key, -1), next = F.shiftKey(key, 1);
  const all = F.months().map(m => m.key);
  if (!all.includes(key)) all.push(key);
  all.sort();
  return `<div class="monthbar">
    <a class="btn ghost small" href="${path}?month=${prev}" title="${esc(F.monthLabel(prev))}">‹</a>
    <form method="get" action="${path}" class="inline"><select name="month" class="sel" onchange="this.form.submit()">
      ${all.map(k => `<option value="${esc(k)}"${k === key ? ' selected' : ''}>${esc(F.monthLabel(k))}</option>`).join('')}
    </select></form>
    <a class="btn ghost small" href="${path}?month=${next}" title="${esc(F.monthLabel(next))}">›</a>
  </div>`;
};

const statusChip = s => `<span class="chip ${s === 'Approved' ? 'ok' : s === 'Closed' ? '' : 'warn'}">${esc(s)}</span>`;

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

function hall(u, t, holders) {
  const named = name => {
    const l = holders[name] || [];
    return l.length ? l.map(n => `<div class="dir-name">${esc(n)}</div>`).join('') : '<div class="dir-vacant">Office vacant</div>';
  };
  const card = o => `<article class="warrole tone-${o.tone}">
    <h3>${esc(o.name)}</h3>
    <div class="warrole-sub">${esc(o.sub)}</div>
    <div class="rolewho">${named(o.name)}</div>
    <ul>${o.duties.map(d => `<li>${esc(d)}</li>`).join('')}</ul>
    ${o.requirement ? `<p class="warreq"><b>Appointment:</b> ${esc(o.requirement)}</p>` : ''}
    ${o.note ? `<p class="warnote">${esc(o.note)}</p>` : ''}
  </article>`;
  const wing = w => `<div class="section-label">${esc(w.name)}</div>
    <p class="hint">${esc(w.lede)}</p>
    <div class="warroles">${OFFICE.filter(o => o.wing === w.name).map(card).join('')}</div>`;
  return `${finNav('hall', u)}
  <section>
    <h2>The Ministry of Finance</h2>
    <p class="lede">The Ministry of Finance keeps the purse of the Imperial Province of Skyrim. It gathers the revenue — the taxes of the Holds, the tolls and excises, the tribute of the Mint and the fees of charter — and it renders that revenue out again to the offices that serve the province, upon a budget the Minister approves each month.</p>
    <p>Two offices do the work. The <b>Imperial Treasury</b> keeps what has been gathered and pays it out. The <b>Census &amp; Excise Office</b> finds what is owed and collects it. The Minister of State stands over both, and the Imperial Auditor examines what both have done.</p>

    <div class="warstats">
      <div class="warstat"><div class="n">${whole(t.draws)}</div><div class="t">Drawn this month</div></div>
      <div class="warstat"><div class="n">${t.groups}</div><div class="t">Groups funded</div></div>
      <div class="warstat"><div class="n">${t.holds}</div><div class="t">Holds assessed</div></div>
      <div class="warstat"><div class="n">${esc(t.status)}</div><div class="t">${esc(t.label)}</div></div>
    </div>

    ${OFFICE.filter(o => !o.wing).map(card).join('')}
    ${WINGS.map(wing).join('')}

    <div class="linkrow" style="margin-top:20px"><a class="btn" href="/finance/account">The account rendered</a><a class="btn ghost" href="/finance/principles">How money is kept</a></div>
  </section>`;
}

function principles(u) {
  return `${finNav('principles', u)}
  <section>
    <h2>How Money Is Kept</h2>
    <p class="lede">The rules the Ministry of Finance binds itself by. They are published so that any subject may know what the Ministry may do with the province’s money, and what it may not.</p>
    ${PRINCIPLES.map(([h, b], i) => `<article class="principle">
      <div class="pnum">${esc(F.roman(i + 1))}</div>
      <div><h3>${esc(h)}</h3><p>${esc(b)}</p></div>
    </article>`).join('')}
  </section>`;
}

function accountPage(u, key, b, spread) {
  const row = (l, v, cls) => `<tr><th>${esc(l)}</th><td class="${cls || ''}">${esc(v)}</td></tr>`;
  return `${finNav('account', u)}
  <section>
    <h2>The Account of the Ministry</h2>
    <p class="lede">What the Treasury took in and what it gave out, rendered for any subject who cares to read it. The Ministry publishes this whether the figures flatter it or not.</p>
    ${monthPicker(key, '/finance/account')}
    ${!b ? `<p class="notice">No account stands for ${esc(F.monthLabel(key))}.</p>` : `
      <div class="warstats">
        <div class="warstat"><div class="n">${whole(b.takesIn)}</div><div class="t">The Treasury took in</div></div>
        <div class="warstat"><div class="n">${whole(b.givenOut)}</div><div class="t">Given out in draws</div></div>
        <div class="warstat"><div class="n">${whole(b.keeps)}</div><div class="t">The Treasury kept</div></div>
        <div class="warstat"><div class="n">${esc(b.month.status)}</div><div class="t">${esc(b.month.label)}</div></div>
      </div>

      <div class="section-label">Where It Came From</div>
      <div class="tablewrap"><table class="rpt">
        ${F.INCOME_KINDS.map(([k, l]) => row(l, num(b.month.income[k]))).join('')}
        ${row('The Treasury’s cut of the Exchange', pcts(b.cut) + ' — ' + num(b.month.income.eec * b.cut / 100))}
        ${row('Left with the Exchange', num(b.stays))}
      </table></div>

      <div class="section-label">Where It Went</div>
      <div class="tablewrap"><table class="ledger"><thead><tr><th>Group</th><th class="num">Draw</th><th class="num">Paid</th></tr></thead><tbody>
        ${b.rows.map(r => `<tr><td><b>${esc(r.group.name)}</b>${r.under.length ? `<br>${small('Includes ' + esc(r.under.join(', ')))}` : ''}</td><td class="num">${num(r.draw)}</td><td class="num">${num(r.paid)}</td></tr>`).join('')}
        <tr class="totalrow"><td><b>In all</b></td><td class="num"><b>${num(b.givenOut)}</b></td><td class="num"><b>${num(b.paidOut)}</b></td></tr>
      </tbody></table></div>

      ${spread && spread.length ? `<div class="section-label">Over the Months</div>
      <div class="tablewrap"><table class="ledger"><thead><tr><th>Month</th><th class="num">Took in</th><th class="num">Gave out</th><th>Standing</th></tr></thead><tbody>
        ${spread.map(s => `<tr><td><a href="/finance/account?month=${esc(s.key)}">${esc(s.label)}</a></td><td class="num">${num(s.takesIn)}</td><td class="num">${num(s.givenOut)}</td><td>${statusChip(s.status)}</td></tr>`).join('')}
      </tbody></table></div>` : ''}
    `}
  </section>`;
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

function overview(u, key, b, todo, recent) {
  return `${finNav('overview', u)}
  <section>
    <h2>${esc(F.monthLabel(key))}</h2>
    ${monthPicker(key, '/finance/overview')}

    <div class="todo">
      ${todo.length ? todo.map(t => `<div class="todorow">
        <div><b>${esc(t.what)}</b><br>${small(esc(t.why))}</div>
        <a class="btn ghost small" href="${esc(t.href)}">${esc(t.cta)}</a>
      </div>`).join('') : '<p class="hint" style="margin:0">Nothing needs doing right now.</p>'}
    </div>

    ${!b ? `<p class="notice">No budget stands for ${esc(F.monthLabel(key))} yet.</p>` : `
      <div class="drawbanner">
        <div>
          <div class="eyebrow">${esc(b.month.label)} draws</div>
          <div class="bignum">${num(b.givenOut)}</div>
          <div class="small">${esc(b.month.status)} budget, ${b.groupsPaid} of ${b.groupsAll} groups paid</div>
        </div>
        <table class="rpt banner">
          <tr><th>The Treasury takes in</th><td>${num(b.takesIn)}</td></tr>
          <tr><th>Paid out so far</th><td>${num(b.paidOut)}</td></tr>
          <tr><th>The Treasury keeps</th><td>${num(b.keeps)}</td></tr>
        </table>
      </div>

      <div class="section-label">${esc(b.month.label)} by Group</div>
      <div class="tablewrap"><table class="ledger"><thead><tr><th>Group</th><th class="num">Draw</th><th>Standing</th><th class="num">Left to pay</th><th class="num">Payroll a month</th></tr></thead><tbody>
        ${b.rows.map(r => `<tr>
          <td><b>${esc(r.group.name)}</b>${r.under.length ? `<br>${small('Includes ' + esc(r.under.join(', ')))}` : ''}</td>
          <td class="num">${num(r.draw)}</td>
          <td>${r.done ? '<span class="chip ok">Paid</span>' : r.paid > 0 ? '<span class="chip warn">Part paid</span>' : '<span class="chip">Not paid</span>'}</td>
          <td class="num">${r.left ? num(r.left) : '<span class="dash">—</span>'}</td>
          <td class="num">${r.payroll.hasUnder ? num(r.payroll.withUnder) : num(r.payroll.monthly)}${r.draw && (r.payroll.hasUnder ? r.payroll.withUnder : r.payroll.monthly) > r.draw ? '<br><span class="chip bad">Over the draw</span>' : ''}</td>
        </tr>`).join('')}
      </tbody></table></div>
    `}

    ${recent && recent.length ? `<div class="section-label">Lately</div>
    <ul class="plainhist">${recent.map(h => `<li><span class="ph-when">${esc(String(h.at || '').slice(0, 16).replace('T', ' '))}${h.name ? ' · ' + esc(h.name) : ''}</span>${esc(h.action || '')}${h.target ? ' · ' + esc(h.target) : ''}${h.detail ? ' — ' + esc(h.detail) : ''}</li>`).join('')}</ul>` : ''}
  </section>`;
}

// ---------------------------------------------------------------------------
// The monthly budget
// ---------------------------------------------------------------------------

function monthPage(u, key, b, csrf, may) {
  const m = b && b.month;
  const locked = !m || m.status !== 'Draft';
  const inc = m ? m.income : {};
  return `${finNav('months', u)}
  <section>
    <h2>${esc(F.monthLabel(key))} budget</h2>
    ${monthPicker(key, '/finance/months')}
    ${!m ? `<p class="lede">No budget stands for this month.</p>
      ${may.manage ? `<form method="post" action="/finance/months/${esc(key)}/open" class="inline">${hidden(csrf)}<button class="btn" type="submit">Open ${esc(F.monthLabel(key))}</button></form>
      <p class="hint">Shares carry over from the month before.</p>` : ''}`
    : `
    <p class="lede">${statusChip(m.status)} ${m.status === 'Draft' ? 'The shares may still be changed. Nothing may be paid until it is approved.'
      : m.status === 'Approved' ? 'The shares are locked. Pay each group its draw, then close the month.'
      : 'Closed by ' + esc(m.closedBy) + '. The figures stand.'}</p>

    <div class="numbox">
      <div class="numstep">1</div><div class="numbody">
      <h3>Income this month</h3>
      <form method="post" action="/finance/months/${esc(key)}/income" class="warform">${hidden(csrf)}
        <div class="wargrid">
          ${F.INCOME_KINDS.map(([k, l, note]) => `<label class="csf"><span>${esc(l)}</span>
            <input type="number" step="0.01" min="0" name="${k}" value="${esc(String(inc[k] || 0))}"${locked || !may.manage ? ' disabled' : ''}>
            <span class="hint">${esc(note)}</span></label>`).join('')}
        </div>
        ${!locked && may.manage ? `<div class="linkrow"><button class="btn small" type="submit">Set the income down</button>
          <a class="btn ghost small" href="/finance/months/${esc(key)}/income/holds">Use what the Holds owe (${num(F.holdsDue())})</a></div>` : ''}
      </form>
      <p class="hint">The Treasury’s cut of the Exchange is the drawing groups’ shares added together — <b>${pcts(b.cut)}</b>, which is <b>${num(inc.eec * b.cut / 100)}</b>. The other ${pcts(100 - b.cut)} stays with the Exchange.</p>
      </div>
    </div>

    <div class="numbox">
      <div class="numstep">2</div><div class="numbody">
      <h3>Each group’s share</h3>
      <p class="hint">A share of each kind of income, plus a fixed sum if you want one. A group funded under another draws nothing of its own.</p>
      <form method="post" action="/finance/months/${esc(key)}/shares">${hidden(csrf)}
      <div class="tablewrap"><table class="ledger sharetable"><thead><tr>
        <th>Group</th>${F.INCOME_KINDS.map(([, l]) => `<th class="num">${esc(l.replace(' income', '').replace('Hold taxes', 'Tax').replace('Mint tribute', 'Mint').replace('Other', 'Other'))}</th>`).join('')}<th class="num">Fixed</th><th class="num">Draw</th>
      </tr></thead><tbody>
        ${b.rows.map(r => `<tr>
          <td><b>${esc(r.group.name)}</b>${r.under.length ? `<br>${small('Includes ' + esc(r.under.join(', ')))}` : ''}</td>
          ${F.INCOME_IDS.map(k => `<td class="num">${locked || !may.manage
            ? pcts(r.share[k]) + '<br>' + small(num(r.parts[k]))
            : `<input class="pctin" type="number" step="0.001" min="0" max="100" name="g[${esc(r.group.id)}][${k}]" value="${esc(String(r.share[k] || 0))}"><br>${small(num(r.parts[k]))}`}</td>`).join('')}
          <td class="num">${locked || !may.manage ? (r.fixed ? num(r.fixed) : '<span class="dash">—</span>') : `<input class="pctin" type="number" step="0.01" min="0" name="g[${esc(r.group.id)}][fixed]" value="${esc(String(r.fixed || 0))}">`}</td>
          <td class="num"><b>${num(r.draw)}</b>${r.payroll.monthly ? `<br>${small('Payroll ' + num(r.payroll.hasUnder ? r.payroll.withUnder : r.payroll.monthly))}` : ''}</td>
        </tr>`).join('')}
        <tr class="totalrow"><td><b>Given out</b></td>
          ${F.INCOME_IDS.map(k => `<td class="num"><b>${pcts(b.rows.reduce((n, r) => n + Number(r.share[k] || 0), 0))}</b><br>${small(num(b.rows.reduce((n, r) => n + r.parts[k], 0)))}</td>`).join('')}
          <td class="num"><b>${num(b.rows.reduce((n, r) => n + r.fixed, 0))}</b></td>
          <td class="num"><b>${num(b.givenOut)}</b></td></tr>
      </tbody></table></div>
      ${!locked && may.manage ? '<div class="linkrow"><button class="btn small" type="submit">Set the shares down</button></div>' : ''}
      </form>
      </div>
    </div>

    <div class="numbox">
      <div class="numstep">3</div><div class="numbody">
      <h3>How it balances</h3>
      <div class="warstats">
        <div class="warstat"><div class="n">${num(b.takesIn)}</div><div class="t">The Treasury takes in</div></div>
        <div class="warstat"><div class="n">${num(b.givenOut)}</div><div class="t">Draws to groups</div></div>
        <div class="warstat"><div class="n">${num(b.keeps)}</div><div class="t">The Treasury keeps</div></div>
        <div class="warstat"><div class="n">${num(b.allowed)}</div><div class="t">Requests allowed</div></div>
      </div>
      ${b.balances ? '<p class="hint">What comes in and what goes out agree.</p>'
        : `<p class="notice">This month does not balance. The Treasury takes in ${num(b.takesIn)} and gives out ${num(b.givenOut)} — a difference of ${num(Math.abs(b.takesIn - b.givenOut))}.</p>`}
      </div>
    </div>

    ${may.manage ? `<div class="linkrow">
      ${m.status === 'Draft' ? `<form method="post" action="/finance/months/${esc(key)}/status" class="inline">${hidden(csrf)}<input type="hidden" name="status" value="Approved"><button class="btn" type="submit">Approve the budget</button></form>` : ''}
      ${m.status === 'Approved' ? `<a class="btn" href="/finance/payout?month=${esc(key)}">Pay out</a>
        <form method="post" action="/finance/months/${esc(key)}/status" class="inline">${hidden(csrf)}<input type="hidden" name="status" value="Draft"><button class="btn ghost" type="submit">Unlock to change shares</button></form>
        <form method="post" action="/finance/months/${esc(key)}/status" class="inline">${hidden(csrf)}<input type="hidden" name="status" value="Closed"><button class="btn ghost" type="submit">Close the month</button></form>` : ''}
      ${m.status === 'Closed' ? `<form method="post" action="/finance/months/${esc(key)}/status" class="inline">${hidden(csrf)}<input type="hidden" name="status" value="Approved"><button class="btn ghost" type="submit">Reopen the month</button></form>` : ''}
    </div>` : ''}
    `}
  </section>`;
}

// ---------------------------------------------------------------------------
// Pay out
// ---------------------------------------------------------------------------

function payoutPage(u, key, b, toPay, csrf, may) {
  const m = b && b.month;
  return `${finNav('payout', u)}
  <section>
    <h2>Pay Out</h2>
    ${monthPicker(key, '/finance/payout')}
    ${!m ? '<p class="notice">No budget stands for this month.</p>'
    : m.status === 'Draft' ? `<p class="notice">${esc(m.label)} is still a draft. <a href="/finance/months/${esc(key)}">Approve the budget</a> before paying anything out.</p>`
    : `
    <p class="lede">${esc(m.label)} ${statusChip(m.status)} — ${b.groupsPaid} of ${b.groupsAll} groups paid their draw.</p>

    <div class="section-label">Monthly Draws</div>
    <div class="tablewrap"><table class="ledger"><thead><tr><th>Group</th><th class="num">Draw</th><th class="num">Paid</th><th class="num">Left</th><th></th></tr></thead><tbody>
      ${b.rows.map(r => `<tr>
        <td><b>${esc(r.group.name)}</b>${r.group.account ? `<br>${small(esc(r.group.account))}` : ''}</td>
        <td class="num">${num(r.draw)}</td>
        <td class="num">${num(r.paid)}</td>
        <td class="num">${r.left ? num(r.left) : '<span class="chip ok">Paid</span>'}</td>
        <td class="actions-col">${may.pay && r.left && m.status !== 'Closed' ? `<form method="post" action="/finance/payout/${esc(key)}" class="movebar">${hidden(csrf)}
          <input type="hidden" name="groupId" value="${esc(r.group.id)}">
          <input type="number" step="0.01" min="0" name="amount" value="${esc(String(r.left))}" class="pctin" aria-label="Sum to pay ${esc(r.group.name)}">
          <button class="btn ghost small" type="submit">Record it paid</button>
        </form>` : ''}</td>
      </tr>`).join('')}
    </tbody></table></div>

    <div class="section-label">Approved Requests to Pay</div>
    ${toPay.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>Request</th><th>Group</th><th class="num">Allowed</th><th>By</th><th></th></tr></thead><tbody>
      ${toPay.map(r => `<tr>
        <td><b>${esc(r.no)}</b><br>${small(esc(r.purpose).slice(0, 80))}</td>
        <td>${esc(F.groupName(r.groupId))}</td>
        <td class="num">${num(r.approved)}</td>
        <td>${esc(r.payBy) || '<span class="dash">—</span>'}</td>
        <td class="actions-col">${may.pay && m.status !== 'Closed' ? `<form method="post" action="/finance/payout/${esc(key)}" class="inline">${hidden(csrf)}
          <input type="hidden" name="groupId" value="${esc(r.groupId)}"><input type="hidden" name="amount" value="${esc(String(r.approved))}">
          <input type="hidden" name="requestId" value="${esc(r.id)}"><input type="hidden" name="forWhat" value="${esc(r.no)}">
          <button class="btn ghost small" type="submit">Record it paid</button></form>` : ''}</td>
      </tr>`).join('')}
    </tbody></table></div>` : '<p class="hint">No approved request waits to be paid.</p>'}

    <div class="section-label">Paid Out in ${esc(m.label)}</div>
    ${(m.paid || []).length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>When</th><th>Group</th><th>For</th><th class="num">Sum</th><th></th></tr></thead><tbody>
      ${m.paid.slice().reverse().map(p => `<tr>
        <td>${esc(p.when || when(p.at))}</td>
        <td>${esc(F.groupName(p.groupId))}</td>
        <td>${esc(p.forWhat)}${p.by ? `<br>${small('Recorded by ' + esc(p.by))}` : ''}</td>
        <td class="num">${num(p.amount)}</td>
        <td class="actions-col">${may.pay && m.status !== 'Closed' ? `<form method="post" action="/finance/payout/${esc(key)}/${esc(p.id)}/undo" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Undo</button></form>` : ''}</td>
      </tr>`).join('')}
      <tr class="totalrow"><td colspan="3"><b>In all</b></td><td class="num"><b>${num(b.paidOut)}</b></td><td></td></tr>
    </tbody></table></div>` : '<p class="hint">Nothing has been paid out this month.</p>'}
    `}
  </section>`;
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

function requestsPage(u, list, show, csrf, may, groups) {
  const counts = {
    Waiting: list.filter(r => r.status === 'Waiting').length,
    Approved: list.filter(r => r.status === 'Approved').length,
    Done: list.filter(r => r.status === 'Refused' || r.status === 'Paid').length
  };
  const shown = show === 'approved' ? list.filter(r => r.status === 'Approved')
    : show === 'done' ? list.filter(r => r.status === 'Refused' || r.status === 'Paid')
    : list.filter(r => r.status === 'Waiting');
  const tab = (k, l, n) => `<a class="rfilter${(show || 'waiting') === k ? ' on' : ''}" href="/finance/requests?show=${k}">${esc(l)} ${n}</a>`;
  return `${finNav('requests', u)}
  <section>
    <h2>Requests</h2>
    <p class="lede">Groups ask for money beyond their monthly draw. Allow it with a sum and a day to pay, or turn it down. What is allowed appears on the Pay Out page.</p>
    <div class="rfilters">${tab('waiting', 'Waiting for an answer', counts.Waiting)}${tab('approved', 'Allowed, to pay', counts.Approved)}${tab('done', 'Finished', counts.Done)}</div>

    ${may.ask ? `<details class="addwrap">
      <summary>Ask for money beyond the draw</summary>
      <form class="warform" method="post" action="/finance/requests">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Which group <span class="req">*</span></span><select name="groupId" required>${groups.map(g => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('')}</select></label>
          <label class="csf"><span>Sum asked for <span class="req">*</span></span><input type="number" step="0.01" min="0" name="asked" required></label>
          <label class="csf"><span>For which month</span><input type="text" name="monthKey" value="${esc(F.monthKey())}" maxlength="10"></label>
        </div>
        <label class="csf csf-wide" style="margin-top:10px"><span>What it is for <span class="req">*</span></span><textarea name="purpose" rows="3" maxlength="1500" required></textarea></label>
        <div class="linkrow"><button class="btn" type="submit">Lay the request</button></div>
      </form>
    </details>` : ''}

    ${shown.length ? shown.map(r => `<article class="reqcard">
      <div class="no">${esc(r.no)} · ${esc(F.groupName(r.groupId))} · ${esc(F.monthLabel(r.monthKey))} · ${esc(when(r.at))} <span class="chip ${F.REQ_CLASS[r.status] || ''}">${esc(r.status)}</span></div>
      <h3>${num(r.asked)} asked${r.approved ? ` · ${num(r.approved)} allowed` : ''}</h3>
      ${pre(r.purpose)}
      ${r.note ? `<dl class="meta"><dt>Answer</dt><dd class="pre">${esc(r.note)}</dd></dl>` : ''}
      ${r.answeredBy ? `<p class="small">Answered by ${esc(r.answeredBy)}${r.payBy ? ' · to be paid by ' + esc(r.payBy) : ''}</p>` : ''}
      ${may.answer && r.status === 'Waiting' ? `<form method="post" action="/finance/requests/${esc(r.id)}" class="stack">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Allow this much</span><input type="number" step="0.01" min="0" name="approved" value="${esc(String(r.asked))}"></label>
          <label class="csf"><span>To be paid by</span><input type="text" name="payBy" maxlength="80" placeholder="a day, or a sitting"></label>
        </div>
        <label class="csf csf-wide"><span>A word in answer</span><input type="text" name="note" maxlength="600"></label>
        <div class="linkrow">
          <button class="btn small" name="status" value="Approved" type="submit">Allow it</button>
          <button class="btn ghost small" name="status" value="Refused" type="submit">Turn it down</button>
        </div>
      </form>` : ''}
      ${may.answer ? `<form method="post" action="/finance/requests/${esc(r.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form>` : ''}
    </article>`).join('') : `<p class="lede">${show === 'approved' ? 'No request waits to be paid.' : show === 'done' ? 'Nothing is finished with yet.' : 'No request waits for an answer.'}</p>`}
  </section>`;
}

// ---------------------------------------------------------------------------
// Spending
// ---------------------------------------------------------------------------

function spendingPage(u, key, rows, log, csrf, may, groups, filter) {
  return `${finNav('spending', u)}
  <section>
    <h2>Spending</h2>
    <p class="lede">How each group is using what the Treasury paid it. The Treasury does not direct this — it records it, so that the next budget is settled upon what was actually needed.</p>
    ${monthPicker(key, '/finance/spending')}

    <div class="tablewrap"><table class="ledger"><thead><tr><th>Group</th><th class="num">Received</th><th class="num">Logged as spent</th><th class="num">Not yet accounted for</th><th>Mostly on</th></tr></thead><tbody>
      ${rows.map(r => `<tr>
        <td><b>${esc(r.group.name)}</b></td>
        <td class="num">${num(r.received)}</td>
        <td class="num">${num(r.logged)}</td>
        <td class="num">${r.left ? num(r.left) : '<span class="dash">—</span>'}</td>
        <td>${esc(r.mostlyOn) || '<span class="dash">—</span>'}</td>
      </tr>`).join('')}
    </tbody></table></div>

    ${may.log ? `<details class="addwrap">
      <summary>Log what was spent</summary>
      <form class="warform" method="post" action="/finance/spending">${hidden(csrf)}
        <input type="hidden" name="monthKey" value="${esc(key)}">
        <div class="wargrid">
          <label class="csf"><span>Which group <span class="req">*</span></span><select name="groupId" required>${groups.map(g => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('')}</select></label>
          <label class="csf"><span>Sum <span class="req">*</span></span><input type="number" step="0.01" min="0" name="amount" required></label>
          <label class="csf"><span>Upon what</span><select name="on">${F.SPEND_ON.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select></label>
          <label class="csf"><span>When</span><input type="text" name="when" maxlength="80"></label>
        </div>
        <label class="csf csf-wide" style="margin-top:10px"><span>What it went on <span class="req">*</span></span><input type="text" name="what" required maxlength="200"></label>
        <div class="linkrow"><button class="btn" type="submit">Log it</button></div>
      </form>
    </details>` : ''}

    <form class="filters" method="get" action="/finance/spending">
      <input type="hidden" name="month" value="${esc(key)}">
      <select name="group" class="sel"><option value="">All groups</option>${groups.map(g => `<option value="${esc(g.id)}"${filter.group === g.id ? ' selected' : ''}>${esc(g.name)}</option>`).join('')}</select>
      <input type="search" name="q" value="${esc(filter.q || '')}" placeholder="Search spending">
      <button class="btn" type="submit">Search</button>
    </form>

    ${log.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>When</th><th>Group</th><th>Upon</th><th>What</th><th class="num">Sum</th><th></th></tr></thead><tbody>
      ${log.map(s => `<tr>
        <td>${esc(s.when || when(s.at))}</td>
        <td>${esc(F.groupName(s.groupId))}</td>
        <td>${esc(s.on)}</td>
        <td>${esc(s.what)}${s.by ? `<br>${small('Logged by ' + esc(s.by))}` : ''}</td>
        <td class="num">${num(s.amount)}</td>
        <td class="actions-col">${may.log ? `<form method="post" action="/finance/spending/${esc(s.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form>` : ''}</td>
      </tr>`).join('')}
    </tbody></table></div>` : '<p class="hint">No spending logged that matches.</p>'}
  </section>`;
}

// ---------------------------------------------------------------------------
// Rosters
// ---------------------------------------------------------------------------

function rostersPage(u, groupId, list, counts, pay, csrf, may, groups, withInactive) {
  const tab = g => `<a class="rfilter${g.id === groupId ? ' on' : ''}" href="/finance/rosters?group=${esc(g.id)}">${esc(g.name)} ${F.rosterFor(g.id).length}</a>`;
  const byRank = Object.keys(counts.byRank).map(r => counts.byRank[r] + ' ' + r).join(', ');
  return `${finNav('rosters', u)}
  <section>
    <h2>Rosters</h2>
    <p class="lede">Each group keeps its own roster. This is for the record and to show what payroll a draw must cover — nobody is paid from here.</p>
    <div class="rfilters">${groups.map(tab).join('')}</div>

    <div class="warstats">
      <div class="warstat"><div class="n">${num(pay.weekly)}</div><div class="t">Weekly payroll</div></div>
      <div class="warstat"><div class="n">${num(pay.biweekly)}</div><div class="t">Every two weeks</div></div>
      <div class="warstat"><div class="n">${num(pay.monthly)}</div><div class="t">Monthly (4 weeks)</div></div>
      ${pay.hasUnder ? `<div class="warstat"><div class="n">${num(pay.withUnder)}</div><div class="t">With those funded under it</div></div>` : ''}
    </div>
    <p class="hint">${counts.n} upon the roster${byRank ? ': ' + esc(byRank) : ''}.</p>

    ${may.manage ? `<details class="addwrap">
      <summary>Enter someone upon the roster</summary>
      <form class="warform" method="post" action="/finance/rosters">${hidden(csrf)}
        <input type="hidden" name="groupId" value="${esc(groupId)}">
        <div class="wargrid">
          <label class="csf"><span>Name <span class="req">*</span></span><input type="text" name="name" required maxlength="120"></label>
          <label class="csf"><span>Rank</span><input type="text" name="rank" maxlength="90"></label>
          <label class="csf"><span>Weekly pay</span><input type="number" step="0.01" min="0" name="weekly"></label>
          <label class="csf"><span>Bank account</span><input type="text" name="account" maxlength="60"></label>
        </div>
        <label class="csf csf-wide" style="margin-top:10px"><span>Note</span><input type="text" name="note" maxlength="200"></label>
        <div class="linkrow"><button class="btn" type="submit">Enter them</button></div>
      </form>
    </details>` : ''}

    <div class="linkrow"><a class="btn ghost small" href="/finance/rosters?group=${esc(groupId)}${withInactive ? '' : '&all=1'}">${withInactive ? 'Hide those stood down' : 'Show those stood down'}</a></div>

    ${list.length ? `<div class="tablewrap"><table class="ledger roster"><thead><tr><th>Rank</th><th>Name</th><th class="num">Weekly pay</th><th>Bank account</th><th>Note</th>${may.manage ? '<th></th>' : ''}</tr></thead><tbody>
      ${list.map(r => `<tr${r.active === false ? ' class="dim"' : ''}>
        <td>${esc(r.rank)}</td>
        <td><b>${esc(r.name)}</b></td>
        <td class="num">${r.weekly ? num(r.weekly) : '<span class="dash">—</span>'}</td>
        <td>${esc(r.account) || '<span class="dash">—</span>'}</td>
        <td>${esc(r.note) || '<span class="dash">—</span>'}</td>
        ${may.manage ? `<td class="actions-col">
          <details class="inlinedit"><summary class="btn ghost small">Amend</summary>
            <form method="post" action="/finance/rosters/${esc(r.id)}" class="stack">${hidden(csrf)}
              <label class="csf"><span>Name</span><input type="text" name="name" value="${esc(r.name)}" maxlength="120"></label>
              <label class="csf"><span>Rank</span><input type="text" name="rank" value="${esc(r.rank)}" maxlength="90"></label>
              <label class="csf"><span>Weekly pay</span><input type="number" step="0.01" min="0" name="weekly" value="${esc(String(r.weekly || 0))}"></label>
              <label class="csf"><span>Bank account</span><input type="text" name="account" value="${esc(r.account)}" maxlength="60"></label>
              <label class="csf"><span>Group</span><select name="groupId">${groups.map(g => `<option value="${esc(g.id)}"${g.id === r.groupId ? ' selected' : ''}>${esc(g.name)}</option>`).join('')}</select></label>
              <label class="csf"><span>Note</span><input type="text" name="note" value="${esc(r.note)}" maxlength="200"></label>
              <label class="checkline"><input type="checkbox" name="active" value="1"${r.active === false ? '' : ' checked'}> Still serving</label>
              <div class="linkrow"><button class="btn small" type="submit">Set it down</button></div>
            </form>
          </details>
          <form method="post" action="/finance/rosters/${esc(r.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form>
        </td>` : ''}
      </tr>`).join('')}
    </tbody></table></div>` : '<p class="lede">Nobody is upon this roster.</p>'}
  </section>`;
}

// ---------------------------------------------------------------------------
// Groups and Holds
// ---------------------------------------------------------------------------

function settingsPage(u, csrf, may) {
  const gs = F.groups(), hs = F.holds();
  return `${finNav('settings', u)}
  <section>
    <h2>Groups &amp; Holds</h2>
    <p class="lede">Who draws from the Treasury and upon what shares, and what each Hold owes in tax each month. These are the standing figures — a month takes a copy of them when it is opened, so changing them here never alters a month already settled.</p>

    <div class="section-label">Groups</div>
    <p class="hint">The Treasury’s cut of the Exchange is these shares added together: <b>${pcts(F.treasuryCut())}</b>.</p>
    <div class="tablewrap"><table class="ledger"><thead><tr><th>Name</th><th>Bank account</th><th>Funded</th><th class="num">EEC</th><th class="num">Tax</th><th class="num">Mint</th><th class="num">Other</th><th class="num">Fixed</th>${may.manage ? '<th></th>' : ''}</tr></thead><tbody>
      ${gs.map(g => `<tr${g.active === false ? ' class="dim"' : ''}>
        <td><b>${esc(g.name)}</b></td>
        <td>${esc(g.account) || '<span class="dash">—</span>'}</td>
        <td>${g.fundedBy ? small('Under ' + esc(F.groupName(g.fundedBy)) + ' — roster only') : 'Own draw'}</td>
        ${F.INCOME_IDS.map(k => `<td class="num">${g.fundedBy ? '<span class="dash">—</span>' : pcts(g[k])}</td>`).join('')}
        <td class="num">${g.fixed ? num(g.fixed) : '<span class="dash">—</span>'}</td>
        ${may.manage ? `<td class="actions-col">
          <details class="inlinedit"><summary class="btn ghost small">Amend</summary>
            <form method="post" action="/finance/groups/${esc(g.id)}" class="stack">${hidden(csrf)}
              <label class="csf"><span>Name</span><input type="text" name="name" value="${esc(g.name)}" maxlength="90"></label>
              <label class="csf"><span>Bank account</span><input type="text" name="account" value="${esc(g.account)}" maxlength="60"></label>
              <label class="csf"><span>Funded</span><select name="fundedBy"><option value="">Own draw</option>${gs.filter(x => x.id !== g.id && !x.fundedBy).map(x => `<option value="${esc(x.id)}"${x.id === g.fundedBy ? ' selected' : ''}>Under ${esc(x.name)}</option>`).join('')}</select></label>
              ${F.INCOME_KINDS.map(([k, l]) => `<label class="csf"><span>${esc(l)} share</span><input type="number" step="0.001" min="0" max="100" name="${k}" value="${esc(String(g[k] || 0))}"></label>`).join('')}
              <label class="csf"><span>Fixed sum</span><input type="number" step="0.01" min="0" name="fixed" value="${esc(String(g.fixed || 0))}"></label>
              <label class="checkline"><input type="checkbox" name="active" value="1"${g.active === false ? '' : ' checked'}> Still funded</label>
              <div class="linkrow"><button class="btn small" type="submit">Set it down</button></div>
            </form>
          </details>
          <form method="post" action="/finance/groups/${esc(g.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form>
        </td>` : ''}
      </tr>`).join('')}
    </tbody></table></div>
    ${may.manage ? `<details class="addwrap">
      <summary>Add a group</summary>
      <form class="warform" method="post" action="/finance/groups">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Name <span class="req">*</span></span><input type="text" name="name" required maxlength="90"></label>
          <label class="csf"><span>Bank account</span><input type="text" name="account" maxlength="60"></label>
          <label class="csf"><span>Funded</span><select name="fundedBy"><option value="">Own draw</option>${gs.filter(x => !x.fundedBy).map(x => `<option value="${esc(x.id)}">Under ${esc(x.name)}</option>`).join('')}</select></label>
          ${F.INCOME_KINDS.map(([k, l]) => `<label class="csf"><span>${esc(l)} share</span><input type="number" step="0.001" min="0" max="100" name="${k}" value="0"></label>`).join('')}
        </div>
        <div class="linkrow"><button class="btn" type="submit">Add it</button></div>
      </form>
    </details>` : ''}

    <div class="section-label">Holds</div>
    <p class="hint">What each Hold owes in tax each month. In all: <b>${num(F.holdsDue())}</b>.</p>
    <div class="tablewrap"><table class="ledger"><thead><tr><th>Hold</th><th class="num">Monthly tax</th>${may.manage ? '<th></th>' : ''}</tr></thead><tbody>
      ${hs.map(h => `<tr>
        <td><b>${esc(h.name)}</b></td>
        <td class="num">${num(h.monthly)}</td>
        ${may.manage ? `<td class="actions-col">
          <form method="post" action="/finance/holds/${esc(h.id)}" class="movebar">${hidden(csrf)}
            <input type="hidden" name="name" value="${esc(h.name)}">
            <input class="pctin" type="number" step="0.01" min="0" name="monthly" value="${esc(String(h.monthly))}" aria-label="Monthly tax for ${esc(h.name)}">
            <button class="btn ghost small" type="submit">Set</button>
          </form>
          <form method="post" action="/finance/holds/${esc(h.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form>
        </td>` : ''}
      </tr>`).join('')}
      <tr class="totalrow"><td><b>In all</b></td><td class="num"><b>${num(F.holdsDue())}</b></td>${may.manage ? '<td></td>' : ''}</tr>
    </tbody></table></div>
    ${may.manage ? `<details class="addwrap">
      <summary>Add a Hold</summary>
      <form class="warform" method="post" action="/finance/holds">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Hold <span class="req">*</span></span><input type="text" name="name" required maxlength="60"></label>
          <label class="csf"><span>Monthly tax</span><input type="number" step="0.01" min="0" name="monthly" value="0"></label>
        </div>
        <div class="linkrow"><button class="btn" type="submit">Add it</button></div>
      </form>
    </details>` : ''}
  </section>`;
}

// ---------------------------------------------------------------------------
// Bank logins
// ---------------------------------------------------------------------------

function vaultPage(u, list, csrf, reveal) {
  return `${finNav('vault', u)}
  <section>
    <h2>Bank Logins</h2>
    <p class="notice"><b>These are kept in plain text.</b> Anyone who can read the Ministry’s data files can read them, and they are copied into every backup. Keep here only what you would not mind losing, and change any password on the bank’s own site the moment someone who should not have it has seen it.</p>
    <p class="lede">Logins for the Imperial Exchange House. Only the Minister may open this page.</p>
    ${list.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>Account</th><th>Name</th><th>Password</th><th>Link</th><th></th></tr></thead><tbody>
      ${list.map(v => `<tr>
        <td><b>${esc(v.account)}</b><br>${small(esc(v.kind))}</td>
        <td>${esc(v.username) || '<span class="dash">—</span>'}</td>
        <td>${v.secret ? (reveal === v.id ? `<code class="codeno">${esc(v.secret)}</code> <a class="btn ghost small" href="/finance/vault">Hide</a>` : `<span class="dots">••••••••</span> <a class="btn ghost small" href="/finance/vault?show=${esc(v.id)}">Show</a>`) : '<span class="dash">—</span>'}</td>
        <td>${v.link ? `<a href="${esc(v.link)}" target="_blank" rel="noopener noreferrer">Open site</a>` : '<span class="dash">—</span>'}</td>
        <td class="actions-col">
          <details class="inlinedit"><summary class="btn ghost small">Amend</summary>
            <form method="post" action="/finance/vault/${esc(v.id)}" class="stack">${hidden(csrf)}
              <label class="csf"><span>Account</span><input type="text" name="account" value="${esc(v.account)}" maxlength="90"></label>
              <label class="csf"><span>Name</span><input type="text" name="username" value="${esc(v.username)}" maxlength="90"></label>
              <label class="csf"><span>Password</span><input type="text" name="secret" value="" placeholder="leave blank to keep it as it is" maxlength="200"></label>
              <label class="csf"><span>Link</span><input type="text" name="link" value="${esc(v.link)}" maxlength="300"></label>
              <label class="csf"><span>Note</span><input type="text" name="note" value="${esc(v.note)}" maxlength="200"></label>
              <div class="linkrow"><button class="btn small" type="submit">Set it down</button></div>
            </form>
          </details>
          <form method="post" action="/finance/vault/${esc(v.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form>
        </td>
      </tr>`).join('')}
    </tbody></table></div>` : '<p class="lede">Nothing is kept here.</p>'}
    <details class="addwrap">
      <summary>Keep another</summary>
      <form class="warform" method="post" action="/finance/vault">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Account <span class="req">*</span></span><input type="text" name="account" required maxlength="90"></label>
          <label class="csf"><span>Name</span><input type="text" name="username" maxlength="90"></label>
          <label class="csf"><span>Password</span><input type="text" name="secret" maxlength="200"></label>
          <label class="csf"><span>Link</span><input type="text" name="link" maxlength="300"></label>
        </div>
        <div class="linkrow"><button class="btn" type="submit">Keep it</button></div>
      </form>
    </details>
  </section>`;
}

// ---------------------------------------------------------------------------
// Officers and the staff entrance
// ---------------------------------------------------------------------------

function officersPage(u, officers, ranks, csrf, issued, editingRank, giveable) {
  const rankName = id => (ranks.find(r => r.id === id) || {}).name || id;
  const mine = giveable || ranks;
  const permBoxes = r => Ranks.PERMS
    .filter(([g]) => g === 'Ministry of Finance' || g === 'Across the Ministries')
    .map(([g, list]) => `<fieldset class="permset"><legend>${esc(g)}</legend>${list.map(([k, l]) => `<label class="checkline"><input type="checkbox" name="perms" value="${esc(k)}"${(r.perms || []).includes(k) ? ' checked' : ''}> ${esc(l)}</label>`).join('')}</fieldset>`).join('');
  return `${finNav('officers', u)}
  <section>
    <h2>Officers of the Ministry of Finance</h2>
    <p class="lede">Enter the officers of this Ministry and set what each rank may do. Nothing here reaches beyond Finance: a rank entered here cannot be given the powers of Civil Affairs, of Justice, or of the Legion.</p>
    ${issued ? `<div class="flash"><b>${esc(issued.name)}</b> is entered upon the rolls. Their name is <b>${esc(issued.username)}</b> and their first password is <b>${esc(issued.password)}</b>. They must change it when they first enter.</div>` : ''}

    <div class="section-label">Upon the Rolls</div>
    ${officers.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>Officer</th><th>Rank</th><th>Office</th><th>Standing</th><th></th></tr></thead><tbody>
      ${officers.map(o => `<tr${o.active ? '' : ' class="dim"'}>
        <td><b>${esc(o.name)}</b><br>${small(esc(o.username))}</td>
        <td>${esc(rankName(o.rank))}</td>
        <td>${esc(o.office) || '<span class="dash">—</span>'}</td>
        <td>${o.active ? '<span class="chip ok">Serving</span>' : '<span class="chip">Stood down</span>'}${o.mustChange ? ' <span class="chip warn">New password due</span>' : ''}</td>
        <td class="actions-col">
          <details class="inlinedit"><summary class="btn ghost small">Amend</summary>
            <form method="post" action="/finance/officers/${esc(o.username)}" class="stack">${hidden(csrf)}
              <label class="csf"><span>Name</span><input type="text" name="name" maxlength="80" value="${esc(o.name)}"></label>
              <label class="csf"><span>Rank</span><select name="rank">${mine.map(r => `<option value="${esc(r.id)}"${r.id === o.rank ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}${mine.some(r => r.id === o.rank) ? '' : `<option value="${esc(o.rank)}" selected>${esc(rankName(o.rank))} (you may not give this rank)</option>`}</select></label>
              <label class="csf"><span>Office</span><input type="text" name="office" maxlength="120" value="${esc(o.office)}"></label>
              <label class="csf"><span>Shown in the Directory</span><select name="listed"><option value="1"${o.listed ? ' selected' : ''}>Yes</option><option value=""${o.listed ? '' : ' selected'}>No</option></select></label>
              <div class="linkrow"><button class="btn small" type="submit">Set it down</button></div>
            </form>
          </details>
          <form method="post" action="/finance/officers/${esc(o.username)}/toggle" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">${o.active ? 'Stand down' : 'Restore'}</button></form>
          <form method="post" action="/finance/officers/${esc(o.username)}/password" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">New password</button></form>
        </td>
      </tr>`).join('')}
    </tbody></table></div>` : '<p class="lede">No officer of Finance is upon the rolls.</p>'}

    <details class="addwrap">
      <summary>Enter an officer of Finance</summary>
      <form class="warform" method="post" action="/finance/officers">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Name <span class="req">*</span></span><input type="text" name="name" required maxlength="80"></label>
          <label class="csf"><span>Username <span class="req">*</span></span><input type="text" name="username" required maxlength="32" placeholder="letters, numbers, dot or dash"></label>
          <label class="csf"><span>Rank</span><select name="rank">${mine.map(r => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</select></label>
          <label class="csf"><span>Office</span><input type="text" name="office" maxlength="120"></label>
        </div>
        <div class="linkrow"><button class="btn" type="submit">Enter them upon the rolls</button></div>
      </form>
    </details>

    <div class="section-label">Ranks of Finance</div>
    <div class="tablewrap"><table class="ledger"><thead><tr><th>Rank</th><th>Office</th><th>May do</th><th>Holding it</th><th></th></tr></thead><tbody>
      ${ranks.map(r => `<tr>
        <td><b>${esc(r.name)}</b>${r.subtitle ? `<br>${small(esc(r.subtitle))}` : ''}</td>
        <td>${esc(r.group)}</td>
        <td>${(r.perms || []).length ? `<span class="qchips">${(r.perms || []).map(k => `<span class="qchip">${esc(k)}</span>`).join('')}</span>` : '<span class="dash">—</span>'}</td>
        <td>${officers.filter(o => o.rank === r.id).map(o => esc(o.name)).join(', ') || '<span class="dash">—</span>'}</td>
        <td class="actions-col"><a class="btn ghost small" href="/finance/officers?rank=${esc(r.id)}#rank">Amend</a></td>
      </tr>`).join('')}
    </tbody></table></div>

    <details class="addwrap" id="rank"${editingRank ? ' open' : ''}>
      <summary>${editingRank ? 'Amending ' + esc(editingRank.name) : 'Make a new rank of Finance'}</summary>
      <form class="warform" method="post" action="/finance/ranks${editingRank ? '/' + esc(editingRank.id) : ''}">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Name <span class="req">*</span></span><input type="text" name="name" required maxlength="90" value="${esc(editingRank ? editingRank.name : '')}"></label>
          <label class="csf"><span>Under-title</span><input type="text" name="subtitle" maxlength="90" value="${esc(editingRank ? editingRank.subtitle || '' : '')}"></label>
          <label class="csf"><span>Office</span><select name="group">${['Ministry of Finance', 'Imperial Treasury', 'Census & Excise Office'].map(g => `<option value="${esc(g)}"${editingRank && editingRank.group === g ? ' selected' : ''}>${esc(g)}</option>`).join('')}</select></label>
          <label class="csf"><span>Shown in the Directory</span><select name="directory"><option value="1"${!editingRank || editingRank.directory ? ' selected' : ''}>Yes</option><option value=""${editingRank && !editingRank.directory ? ' selected' : ''}>No</option></select></label>
        </div>
        <div class="permgrid">${permBoxes(editingRank || { perms: ['findesk', 'finledger'] })}</div>
        <div class="linkrow"><button class="btn" type="submit">${editingRank ? 'Save the rank' : 'Make the rank'}</button>${editingRank ? '<a class="btn ghost" href="/finance/officers">Cancel</a>' : ''}</div>
      </form>
    </details>
    <p class="hint">Only the powers of Finance may be granted here. The Minister of State for Civil and Administrative Affairs sets everything beyond this Ministry.</p>
  </section>`;
}

function entrance(csrf, err, username) {
  return `<section class="signwrap">
    <h2>Staff Entrance of the Ministry of Finance</h2>
    <p class="lede">For the officers of the Imperial Treasury and the Census &amp; Excise Office. If you keep another Ministry, enter by its own door.</p>
    ${err ? `<div class="flash err" role="status">${esc(err)}</div>` : ''}
    <form class="writ" method="post" action="/login" style="max-width:520px">${hidden(csrf)}
      <input type="hidden" name="to" value="/finance/overview">
      <div class="field"><label class="l" for="u">Name upon the rolls</label><input type="text" id="u" name="username" required maxlength="40" value="${esc(username || '')}" autocomplete="username"></div>
      <div class="field"><label class="l" for="p">Password</label><input type="password" id="p" name="password" required autocomplete="current-password"></div>
      <div class="linkrow"><button class="btn" type="submit">Enter the Ministry</button><a class="btn ghost" href="/finance">The Ministry of Finance</a></div>
    </form>
  </section>`;
}

module.exports = {
  finNav, hall, principles, accountPage, overview, monthPage, payoutPage,
  requestsPage, spendingPage, rostersPage, settingsPage, vaultPage, officersPage, entrance
};
