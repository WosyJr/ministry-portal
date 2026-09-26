const { esc, hidden } = require('./views');
const J = require('./justice');
const Ranks = require('./ranks');
const { OFFICE, JUDICIAL, PRINCIPLES } = require('./justicecontent');

const small = t => `<span class="small">${t}</span>`;
const when = iso => (iso ? new Date(iso).toISOString().slice(0, 10) : '');
const pre = t => `<p class="pre">${esc(t)}</p>`;

const TABS = [
  ['/justice', 'The Ministry', 'hall', true],
  ['/justice/principles', 'How Justice Is Done', 'principles', true],
  ['/justice/judgments', 'Register of Judgments', 'judgments', true],
  ['/justice/offences', 'Book of Offences', 'offences', true],
  ['/justice/lay', 'Lay a Matter', 'lay', true],
  ['/justice/cases', 'The Bench', 'cases', false],
  ['/justice/warrants', 'Warrants', 'warrants', false],
  ['/justice/calendar', 'Calendar', 'calendar', false],
  ['/justice/inquisitions', 'Inquisitions', 'inquisitions', false],
  ['/justice/custody', 'Custody', 'custody', false],
  ['/justice/parties', 'Parties', 'parties', false],
  ['/justice/matters', 'Matters Laid', 'matters', false],
  ['/justice/officers', 'Officers', 'officers', false]
];

function jusNav(active, u) {
  const inside = !!(u && (u.all || Ranks.can(u, 'jusdesk') || Ranks.can(u, 'juscases')));
  const admin = Ranks.mayAdminBranch(u, 'justice');
  const items = TABS.filter(t => t[3] || (t[2] === 'officers' ? admin : inside));
  return `<nav class="warnav" aria-label="Justice sections">${items.map(([h, l, k, open]) =>
    `<a href="${h}"${k === active ? ' class="on" aria-current="page"' : ''}${open ? '' : ' data-staff="1"'}>${esc(l)}${open ? '' : '<span class="tabmark" title="Officers only">❖</span>'}</a>`).join('')}${(inside || admin) ? '<span class="navkey">❖ officers only</span>' : ''}</nav>`;
}

function roleCard(o) {
  return `<article class="warrole tone-${o.tone}">
    <h3>${esc(o.name)}</h3>
    <div class="warrole-sub">${esc(o.sub)}</div>
    <ul>${o.duties.map(d => `<li>${esc(d)}</li>`).join('')}</ul>
    ${o.note ? `<p class="warnote">${esc(o.note)}</p>` : ''}
  </article>`;
}

function hall(u, tally, holders) {
  const named = id => {
    const list = holders[id] || [];
    return list.length ? `<div class="holders">${list.map(n => `<span class="chip">${esc(n)}</span>`).join('')}</div>` : '<div class="holders"><span class="hint">Office vacant</span></div>';
  };
  const card = o => roleCard(o).replace('</article>', named(o.rank) + '</article>');
  return `${jusNav('hall', u)}
  <section>
    <h2>The Ministry of Justice</h2>
    <p class="lede">The Ministry of Justice keeps the Imperial law within the province of Skyrim. It hears prosecutions at the suit of the Empire, suits between parties, appeals from the courts of the Holds, and complaints against those who hold office. Its judgments are published, that the law may be known.</p>
    <div class="warstats">
      <div class="warstat"><span class="n">${tally.open}</span><span class="t">Matters upon the bench</span></div>
      <div class="warstat"><span class="n">${tally.hearing}</span><span class="t">Set for hearing</span></div>
      <div class="warstat"><span class="n">${tally.judged}</span><span class="t">Judgments given</span></div>
    </div>
    <div class="section-label">The Ministry</div>
    <div class="warroles">${OFFICE.map(card).join('')}</div>
    <div class="section-label">The Judicial Office</div>
    <p class="hint">The bench and those who appear before it. The Judicial Office is answerable to the Minister of State, but no one may direct the Imperial Justice in the judgment they give.</p>
    <div class="warroles">${JUDICIAL.map(card).join('')}</div>
    <div class="linkrow" style="margin-top:20px"><a class="btn" href="/justice/lay">Lay a matter before Justice</a><a class="btn ghost" href="/justice/judgments">Register of Judgments</a></div>
  </section>`;
}

function principles(u) {
  return `${jusNav('principles', u)}
  <section>
    <h2>How Justice Is Done</h2>
    <p class="lede">The rules by which the Ministry takes a matter, hears it and judges it. They bind the bench as much as the parties who come before it.</p>
    <div class="warroles">${PRINCIPLES.map(p => `<article class="warrole tone-quill"><h3>${esc(p.h)}</h3><p style="margin:8px 0 0">${esc(p.t)}</p></article>`).join('')}</div>
    <div class="section-label">What the Ministry Hears</div>
    <div class="tablewrap"><table class="ledger"><thead><tr><th>Kind</th><th>What it is</th><th>Who stands</th></tr></thead><tbody>
      ${J.KINDS.map(k => `<tr><td><b>${esc(k.name)}</b></td><td>${esc(k.label)}</td><td>${esc(k.accuser)} · ${esc(k.accused)}</td></tr>`).join('')}
    </tbody></table></div>
  </section>`;
}

function judgmentsPage(u, list) {
  return `${jusNav('judgments', u)}
  <section>
    <h2>Register of Judgments</h2>
    <p class="lede">Every judgment the bench has given and ordered published, with the finding and the reasons upon which it stands.</p>
    ${list.length ? list.map(c => `<article class="judgment">
      <div class="no">${esc(c.no)} · ${esc(J.KIND_BY_ID[c.kind].label)}${c.hold ? ' · ' + esc(c.hold) : ''} · ${esc(when(c.judgment.at))}</div>
      <h3>${esc(c.subject)}</h3>
      <dl class="meta">
        ${c.accuser ? `<dt>${esc(J.KIND_BY_ID[c.kind].accuser)}</dt><dd>${esc(c.accuser)}</dd>` : ''}
        ${c.accused ? `<dt>${esc(J.KIND_BY_ID[c.kind].accused)}</dt><dd>${esc(c.accused)}</dd>` : ''}
        <dt>Finding</dt><dd><b>${esc(c.judgment.finding)}</b></dd>
        ${c.judgment.penalty ? `<dt>Order</dt><dd>${esc(c.judgment.penalty)}</dd>` : ''}
        <dt>Given by</dt><dd>${esc(c.judgment.by)}</dd>
      </dl>
      ${c.judgment.reasons ? `<div class="section-label">Reasons</div>${pre(c.judgment.reasons)}` : ''}
    </article>`).join('') : '<p class="lede">No judgment has yet been published.</p>'}
  </section>`;
}

function layBox(u, csrf, prev, err, waiting) {
  const v = prev || {};
  const val = k => esc(v[k] == null ? '' : v[k]);
  return `${jusNav('lay', u)}
  <section class="signwrap">
    <h2>Lay a Matter before Justice</h2>
    <p class="lede">Any subject of the Empire may bring a matter to the Ministry of Justice: a crime to be answered for, a dispute with another, an appeal from the court of a Hold, or a complaint against one who holds office. A Court Clerk will read it and tell you where it stands.</p>
    ${err ? `<div class="flash err" role="status">${esc(err)}</div>` : ''}
    <form class="writ" method="post" action="/justice/lay">${hidden(csrf)}
      <div class="hp"><label>Leave this empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
      <fieldset><legend><span class="rn">I.</span> Who comes</legend>
        <div class="field"><label class="l" for="j-name">Your name <span class="req">*</span></label><input type="text" id="j-name" name="name" required maxlength="90" value="${val('name')}"></div>
        <div class="field"><label class="l" for="j-style">Your standing or office</label><input type="text" id="j-style" name="style" maxlength="90" value="${val('style')}"></div>
        <div class="field"><label class="l" for="j-hold">Your Hold</label><input type="text" id="j-hold" name="hold" maxlength="60" value="${val('hold')}"></div>
        <div class="field"><label class="l" for="j-where">Where you may be found</label><input type="text" id="j-where" name="where" maxlength="140" value="${val('where')}"></div>
      </fieldset>
      <fieldset><legend><span class="rn">II.</span> The matter</legend>
        <div class="field"><span class="l">What you bring</span><div class="opts" role="radiogroup" aria-label="Nature of the matter">${J.MATTER_KINDS.map(k => `<label><input type="radio" name="kind" value="${esc(k)}"${v.kind === k ? ' checked' : ''}> ${esc(k)}</label>`).join('')}</div></div>
        <div class="field"><label class="l" for="j-against">Against whom, if any</label><input type="text" id="j-against" name="against" maxlength="140" value="${val('against')}" placeholder="A person, a court, or an officer"></div>
        <div class="field"><label class="l" for="j-subject">Subject <span class="req">*</span></label><input type="text" id="j-subject" name="subject" required maxlength="160" value="${val('subject')}"></div>
        <div class="field stackfield"><label class="l" for="j-body">Set down the matter <span class="req">*</span></label><textarea id="j-body" name="body" rows="9" required maxlength="6000">${esc(v.body || '')}</textarea></div>
      </fieldset>
      <div class="linkrow"><button class="btn" type="submit">Lay it before Justice</button><a class="btn ghost" href="/justice/lay/status">Ask after a matter</a></div>
    </form>
    <p class="hint">${waiting ? waiting + ' matter' + (waiting === 1 ? '' : 's') + ' presently await an answer. ' : ''}Keep the number you are given. Bringing a matter here does not take it from the court of your Jarl.</p>
  </section>`;
}

function layDone(u, m) {
  return `${jusNav('lay', u)}
  <section class="signwrap">
    <h2>Your matter is received</h2>
    <p class="lede">It is entered upon the roll of the Ministry of Justice as <b>${esc(m.no)}</b>. Keep that number.</p>
    <dl class="meta"><dt>Number</dt><dd><b>${esc(m.no)}</b></dd><dt>Subject</dt><dd>${esc(m.subject)}</dd><dt>What you bring</dt><dd>${esc(m.kind)}</dd></dl>
    <div class="linkrow"><a class="btn" href="/justice/lay/doc?no=${encodeURIComponent(m.no)}" target="_blank" rel="noopener">Your receipt ↗</a><a class="btn ghost" href="/justice/lay/status?no=${encodeURIComponent(m.no)}">Ask after it</a><a class="btn ghost" href="/justice">The Ministry of Justice</a></div>
  </section>`;
}

function layStatus(u, q, found, missing) {
  return `${jusNav('lay', u)}
  <section class="signwrap">
    <h2>Ask after a Matter</h2>
    <p class="lede">Give the number your matter was entered under.</p>
    <form class="search-box" method="get" action="/justice/lay/status">
      <input type="search" name="no" value="${esc(q || '')}" placeholder="e.g. Matter IV" aria-label="Matter number" required>
      <button class="btn" type="submit">Ask</button>
    </form>
    ${missing ? '<p class="notice">No matter upon the roll answers to that number.</p>' : ''}
    ${found ? `<div class="section-label">${esc(found.no)}</div>
      <dl class="meta">
        <dt>Subject</dt><dd>${esc(found.subject)}</dd>
        <dt>What was brought</dt><dd>${esc(found.kind)}</dd>
        <dt>Standing</dt><dd><span class="chip ${J.MATTER_STATUS_CLASS[found.status] || ''}">${esc(found.status)}</span></dd>
        ${found.caseNo ? `<dt>Upon the bench as</dt><dd><b>${esc(found.caseNo)}</b></dd>` : ''}
      </dl>
      ${found.reply ? `<div class="section-label">The answer of the Ministry</div>${pre(found.reply)}` : '<p class="hint">No answer has yet been set down.</p>'}
      <div class="linkrow"><a class="btn ghost" href="/justice/lay/doc?no=${encodeURIComponent(found.no)}" target="_blank" rel="noopener">Your receipt ↗</a></div>` : ''}
  </section>`;
}

function docket(u, list, tally, csrf, mayFile, officers, judgedList) {
  const row = c => `<tr class="prow" data-kind="${esc(c.kind)}" data-status="${esc(c.status)}" data-name="${esc((c.subject + ' ' + c.accuser + ' ' + c.accused).toLowerCase())}">
    <td class="num"><a href="/justice/cases/${esc(c.id)}">${esc(c.no)}</a></td>
    <td>${esc(c.subject)}</td>
    <td>${esc(c.accuser) || '<span class="dash">—</span>'}</td>
    <td>${esc(c.accused) || '<span class="dash">—</span>'}</td>
    <td><span class="chip ${J.STATUS_CLASS[c.status] || ''}">${esc(c.status)}</span></td>
    <td>${esc(c.justice) || '<span class="dash">—</span>'}</td>
    <td>${esc(when(c.opened))}</td>
  </tr>`;
  const open = list.filter(c => !J.isClosed(c));
  const closed = list.filter(c => J.isClosed(c));
  const table = (rows, empty) => rows.length ? `<div class="tablewrap"><table class="ledger roster"><thead><tr>
      <th>Matter</th><th>Subject</th><th>Brought by</th><th>Against</th><th>Standing</th><th>Before</th><th>Opened</th>
    </tr></thead><tbody>${rows.map(row).join('')}</tbody></table></div>` : `<p class="lede">${empty}</p>`;
  const pick = (n, opts) => `<select name="${n}"><option value="">— none yet —</option>${officers.map(o => `<option value="${esc(o.name)}, ${esc(o.rankName)}">${esc(o.name)} — ${esc(o.rankName)}</option>`).join('')}</select>`;
  return `${jusNav('cases', u)}
  <section>
    <h2>The Bench</h2>
    <p class="lede">Every matter before the Ministry of Justice, and where each one stands.</p>
    <div class="warstats">
      <div class="warstat"><span class="n">${tally.open}</span><span class="t">Upon the bench</span></div>
      <div class="warstat"><span class="n">${tally.hearing}</span><span class="t">Set for hearing</span></div>
      <div class="warstat"><span class="n">${tally.judged}</span><span class="t">Judged</span></div>
      <div class="warstat"><span class="n">${tally.waiting}</span><span class="t">Matters awaiting</span></div>
    </div>
    <div class="rosterbar">
      <input type="search" id="rfilter" placeholder="Search the bench…" aria-label="Search the bench">
      <span class="rfilters"><button type="button" class="rfilter on" data-k="All">All</button>${J.KINDS.map(k => `<button type="button" class="rfilter" data-k="${esc(k.id)}">${esc(k.name)}</button>`).join('')}</span>
      <span class="rcount" id="rcount"></span>
    </div>
    <div class="section-label">Before the Bench</div>
    ${table(open, 'No matter stands before the bench.')}
    <div class="section-label">Concluded</div>
    ${table(closed, 'Nothing concluded yet.')}
    ${mayFile ? `<details class="addwrap">
      <summary>Open a matter upon the bench</summary>
      <form class="warform" method="post" action="/justice/cases">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Kind</span><select name="kind">${J.KINDS.map(k => `<option value="${k.id}">${esc(k.label)}</option>`).join('')}</select></label>
          <label class="csf csf-wide"><span>Subject <span class="req">*</span></span><input type="text" name="subject" required maxlength="160"></label>
          <label class="csf"><span>Brought by</span><input type="text" name="accuser" maxlength="140"></label>
          <label class="csf"><span>Against</span><input type="text" name="accused" maxlength="140"></label>
          <label class="csf"><span>Hold</span><input type="text" name="hold" maxlength="60"></label>
          <label class="csf"><span>If an appeal, from which judgment</span><input type="text" name="appealOf" maxlength="40" list="jjudged" placeholder="e.g. Prosecution I"></label>
          <label class="csf"><span>Before which Justice</span>${pick('justice')}</label>
          <label class="csf"><span>Prosecutor</span>${pick('prosecutor')}</label>
          <label class="csf"><span>Advocate</span>${pick('advocate')}</label>
          <label class="csf"><span>Clerk</span>${pick('clerk')}</label>
        </div>
        <label class="csf csf-wide" style="margin-top:10px"><span>The matter</span><textarea name="summary" rows="5" maxlength="6000"></textarea></label>
        <datalist id="jjudged">${(judgedList || []).map(c => `<option value="${esc(c.no)}">${esc(c.subject)}</option>`).join('')}</datalist>
        <div class="linkrow"><button class="btn" type="submit">Open it upon the bench</button></div>
      </form>
    </details>` : ''}
    <script>(function(){
      var q=document.getElementById('rfilter'); if(!q) return;
      var rows=[].slice.call(document.querySelectorAll('tr.prow')), k='All', c=document.getElementById('rcount');
      function apply(){var n=0,t=q.value.trim().toLowerCase();
        rows.forEach(function(r){var okK=k==='All'||r.getAttribute('data-kind')===k;
          var okN=!t||r.getAttribute('data-name').indexOf(t)>-1;var show=okK&&okN;
          r.style.display=show?'':'none'; if(show)n++;});
        c.textContent=n+' shown';}
      q.addEventListener('input',apply);
      [].slice.call(document.querySelectorAll('.rfilter')).forEach(function(b){b.addEventListener('click',function(){
        [].slice.call(document.querySelectorAll('.rfilter')).forEach(function(x){x.className='rfilter';});
        b.className='rfilter on'; k=b.getAttribute('data-k'); apply();});});
      apply();
    })();</script>
  </section>`;
}

function casePage(u, c, csrf, perms, officers, ctx) {
  ctx = ctx || {};
  const K = J.KIND_BY_ID[c.kind];
  const pick = (n, cur) => `<select name="${n}"><option value="">— none —</option>${officers.map(o => { const v = o.name + ', ' + o.rankName; return `<option value="${esc(v)}"${cur === v ? ' selected' : ''}>${esc(o.name)} — ${esc(o.rankName)}</option>`; }).join('')}</select>`;
  const hist = (c.history || []).slice().reverse();
  return `${jusNav('cases', u)}
  <section>
    <p style="margin:0 0 10px"><a href="/justice/cases">← The Bench</a></p>
    <h2>${esc(c.no)}</h2>
    <p class="lede">${esc(c.subject)} · <span class="chip ${J.STATUS_CLASS[c.status] || ''}">${esc(c.status)}</span></p>
    <div class="two">
      <div>
        <div class="section-label">The Matter</div>
        <dl class="meta">
          <dt>Kind</dt><dd>${esc(K.label)}</dd>
          <dt>${esc(K.accuser)}</dt><dd>${c.accuser ? `<a href="/justice/parties?name=${encodeURIComponent(c.accuser)}">${esc(c.accuser)}</a>` : '<span class="dash">—</span>'}</dd>
          <dt>${esc(K.accused)}</dt><dd>${c.accused ? `<a href="/justice/parties?name=${encodeURIComponent(c.accused)}">${esc(c.accused)}</a>` : '<span class="dash">—</span>'}</dd>
          ${c.appealOf ? `<dt>Appeal from</dt><dd><b>${esc(c.appealOf)}</b></dd>` : ''}
          ${(ctx.appealedIn || []).length ? `<dt>Appealed in</dt><dd>${ctx.appealedIn.map(x => `<a href="/justice/cases/${esc(x.id)}">${esc(x.no)}</a>`).join(', ')}</dd>` : ''}
          <dt>Hold</dt><dd>${esc(c.hold) || '<span class="dash">—</span>'}</dd>
          <dt>Opened</dt><dd>${esc(when(c.opened))} by ${esc(c.openedByName)}</dd>
          ${c.fromMatter ? `<dt>Raised from</dt><dd>${esc(c.fromMatter)}</dd>` : ''}
        </dl>
        ${c.summary ? pre(c.summary) : ''}
        <div class="section-label">Before the Bench</div>
        <dl class="meta">
          <dt>Justice</dt><dd>${esc(c.justice) || '<span class="dash">—</span>'}</dd>
          <dt>Prosecutor</dt><dd>${esc(c.prosecutor) || '<span class="dash">—</span>'}</dd>
          <dt>Advocate</dt><dd>${esc(c.advocate) || '<span class="dash">—</span>'}</dd>
          <dt>Clerk</dt><dd>${esc(c.clerk) || '<span class="dash">—</span>'}</dd>
        </dl>
        ${perms.file ? `<details class="addwrap"><summary>Amend the matter</summary>
        <form class="warform" method="post" action="/justice/cases/${esc(c.id)}">${hidden(csrf)}
          <div class="wargrid">
            <label class="csf"><span>Standing</span><select name="status">${J.STATUS.map(x => `<option value="${esc(x)}"${x === c.status ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
            <label class="csf"><span>${esc(K.accuser)}</span><input type="text" name="accuser" maxlength="140" value="${esc(c.accuser)}"></label>
            <label class="csf"><span>${esc(K.accused)}</span><input type="text" name="accused" maxlength="140" value="${esc(c.accused)}"></label>
            <label class="csf"><span>Hold</span><input type="text" name="hold" maxlength="60" value="${esc(c.hold)}"></label>
            <label class="csf"><span>Justice</span>${pick('justice', c.justice)}</label>
            <label class="csf"><span>Prosecutor</span>${pick('prosecutor', c.prosecutor)}</label>
            <label class="csf"><span>Advocate</span>${pick('advocate', c.advocate)}</label>
            <label class="csf"><span>Clerk</span>${pick('clerk', c.clerk)}</label>
          </div>
          <label class="csf csf-wide" style="margin-top:10px"><span>The matter</span><textarea name="summary" rows="4" maxlength="6000">${esc(c.summary)}</textarea></label>
          <div class="linkrow"><button class="btn small" type="submit">Set it down</button></div>
        </form></details>` : ''}
      </div>
      <div>
        <div class="section-label">Sittings of the Bench</div>
        ${(c.hearings || []).length ? `<ul class="plainlist">${c.hearings.map(h => `<li><b>${esc(h.when)}</b>${h.place ? ' · ' + esc(h.place) : ''}${h.before ? ' · before ' + esc(h.before) : ''}${h.note ? `<br>${small(esc(h.note))}` : ''} <a class="btn ghost small" href="/justice/cases/${esc(c.id)}/summons/${esc(h.id)}" target="_blank" rel="noopener">Summons ↗</a>${perms.judge ? ` <form method="post" action="/justice/cases/${esc(c.id)}/hearing/${esc(h.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form>` : ''}</li>`).join('')}</ul>` : '<p class="hint">The bench has not yet been set to sit.</p>'}
        ${perms.judge ? `<details class="addwrap"><summary>Set the bench to sit</summary>
        <form class="warform" method="post" action="/justice/cases/${esc(c.id)}/hearing">${hidden(csrf)}
          <div class="wargrid">
            <label class="csf"><span>When <span class="req">*</span></span><input type="text" name="when" required maxlength="80" placeholder="e.g. the 2nd of Frostfall, 4E 226"></label>
            <label class="csf"><span>Place</span><input type="text" name="place" maxlength="120"></label>
            <label class="csf"><span>Before</span>${pick('before', c.justice)}</label>
          </div>
          <label class="csf csf-wide" style="margin-top:10px"><span>Note</span><textarea name="note" rows="2" maxlength="2000"></textarea></label>
          <div class="linkrow"><button class="btn small" type="submit">Set the sitting</button></div>
        </form></details>` : ''}
      </div>
    </div>

    <div class="section-label">Papers upon the Matter</div>
    ${(c.papers || []).length ? c.papers.map(p => `<article class="paper">
      <div class="no">${esc(p.kind)} · ${esc(p.by)} · ${esc(when(p.at))}</div>
      <h4>${esc(p.title)}</h4>
      ${(() => { const o = p.offenceId && (ctx.offences || []).find(x => x.id === p.offenceId); return o ? `<p class="cited"><b>${esc(o.name)}</b> · ${esc(o.gravity)} · ${esc(o.authority)}<br>${small(esc(o.penalty))}</p>` : ''; })()}
      ${p.body ? pre(p.body) : ''}
      ${perms.file ? `<form method="post" action="/justice/cases/${esc(c.id)}/paper/${esc(p.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form>` : ''}
    </article>`).join('') : '<p class="hint">No paper has been entered upon this matter.</p>'}
    ${perms.file ? `<details class="addwrap"><summary>Enter a paper</summary>
    <form class="warform" method="post" action="/justice/cases/${esc(c.id)}/paper">${hidden(csrf)}
      <div class="wargrid">
        <label class="csf"><span>Kind</span><select name="kind">${J.PAPER_KINDS.map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join('')}</select></label>
        <label class="csf"><span>Cite an offence</span><select name="offenceId"><option value="">— none —</option>${(ctx.offences || []).map(o => `<option value="${esc(o.id)}">${esc(o.name)} — ${esc(o.gravity)}</option>`).join('')}</select></label>
        <label class="csf csf-wide"><span>Title <span class="req">*</span></span><input type="text" name="title" required maxlength="140"></label>
      </div>
      <label class="csf csf-wide" style="margin-top:10px"><span>The paper</span><textarea name="body" rows="5" maxlength="8000"></textarea></label>
      <div class="linkrow"><button class="btn small" type="submit">Enter it</button></div>
    </form></details>` : ''}

    <div class="section-label">Judgment</div>
    ${c.judgment && c.judgment.given ? `<article class="judgment">
      <dl class="meta">
        <dt>Finding</dt><dd><b>${esc(c.judgment.finding)}</b></dd>
        ${c.judgment.penalty ? `<dt>Order</dt><dd>${esc(c.judgment.penalty)}</dd>` : ''}
        <dt>Given by</dt><dd>${esc(c.judgment.by)} · ${esc(when(c.judgment.at))}</dd>
        <dt>Published</dt><dd>${c.published ? 'Yes, in the Register of Judgments' : 'No'}</dd>
      </dl>
      ${c.judgment.reasons ? `<div class="section-label">Reasons</div>${pre(c.judgment.reasons)}` : ''}
      <div class="linkrow"><a class="btn" href="/justice/cases/${esc(c.id)}/judgment/doc" target="_blank" rel="noopener">The judgment to give out ↗</a></div>
    </article>` : perms.judge ? `<details class="addwrap"><summary>Give judgment</summary>
      <form class="warform" method="post" action="/justice/cases/${esc(c.id)}/judgment">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Finding <span class="req">*</span></span><select name="finding" required>${J.FINDINGS.map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join('')}</select></label>
          <label class="csf csf-wide"><span>Order of the bench</span><input type="text" name="penalty" maxlength="200" placeholder="e.g. A fine of 500 septims and restitution"></label>
        </div>
        <label class="csf csf-wide" style="margin-top:10px"><span>Reasons <span class="req">*</span></span><textarea name="reasons" rows="6" maxlength="8000" required></textarea></label>
        <div class="linkrow"><label class="warcheck"><input type="checkbox" name="published" checked> Publish it in the Register of Judgments</label></div>
        <div class="linkrow"><button class="btn" type="submit">Give judgment</button></div>
      </form></details>` : '<p class="hint">No judgment has been given.</p>'}

    ${perms.judge ? `<div class="section-label">Strike the Matter</div>
    <p class="hint">Striking removes this matter, its papers, sittings and judgment from the rolls entirely. It cannot be undone.</p>
    <form method="post" action="/justice/cases/${esc(c.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike ${esc(c.no)} entirely</button></form>` : ''}

    <div class="section-label">Record of the Matter</div>
    <ul class="histlist">${hist.map(h => `<li><span class="h-when">${esc(when(h.at))}</span><span class="h-kind">Entered</span><span class="h-text">${esc(h.text)}${h.by ? small(' — ' + esc(h.by)) : ''}</span></li>`).join('')}</ul>
  </section>`;
}

function mattersPage(u, list, csrf, mayHandle, cases) {
  const waiting = list.filter(m => m.status === 'Received' || m.status === 'Under Consideration');
  const done = list.filter(m => !waiting.includes(m));
  const card = m => `<article class="reqcard">
    <div class="no">${esc(m.no)} · ${esc(m.kind)} · ${esc(when(m.at))} <span class="chip ${J.MATTER_STATUS_CLASS[m.status] || ''}">${esc(m.status)}</span></div>
    <h3>${esc(m.subject)}</h3>
    <p class="small">From ${esc(m.name)}${m.style ? ', ' + esc(m.style) : ''}${m.hold ? ' · ' + esc(m.hold) : ''}${m.against ? ' · against ' + esc(m.against) : ''}</p>
    ${pre(m.body)}
    ${m.reply ? `<dl class="meta"><dt>Answered</dt><dd class="pre">${esc(m.reply)}</dd></dl>` : ''}
    ${m.caseNo ? `<p class="small">Raised to the bench as <b>${esc(m.caseNo)}</b></p>` : ''}
    ${mayHandle ? `<form method="post" action="/justice/matters/${esc(m.id)}" class="stack">${hidden(csrf)}
      <div class="wargrid">
        <label class="csf"><span>Standing</span><select name="status">${J.MATTER_STATUS.map(x => `<option value="${esc(x)}"${x === m.status ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
        <label class="csf"><span>Raised to the bench as</span><input type="text" name="caseNo" maxlength="40" value="${esc(m.caseNo)}" list="jcases" placeholder="e.g. Suit II"></label>
      </div>
      <label class="csf csf-wide"><span>The answer of the Ministry</span><textarea name="reply" rows="3" maxlength="4000">${esc(m.reply)}</textarea></label>
      <div class="linkrow"><button class="btn small" type="submit">Set it down</button></div>
    </form>
    <form method="post" action="/justice/matters/${esc(m.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form>` : ''}
  </article>`;
  return `${jusNav('matters', u)}
  <section>
    <h2>Matters Laid before Justice</h2>
    <p class="lede">What the public has brought to the Ministry. Answer it, raise it to the bench, or refer it where it belongs. Whoever brought it may read your answer with the number they were given.</p>
    <datalist id="jcases">${cases.map(c => `<option value="${esc(c.no)}"></option>`).join('')}</datalist>
    <div class="warstats">
      <div class="warstat"><span class="n">${waiting.length}</span><span class="t">Awaiting an answer</span></div>
      <div class="warstat"><span class="n">${list.filter(m => m.status === 'Raised to the Bench').length}</span><span class="t">Raised to the bench</span></div>
      <div class="warstat"><span class="n">${list.length}</span><span class="t">Brought in all</span></div>
    </div>
    <div class="section-label">Awaiting an Answer</div>
    ${waiting.length ? `<div class="board">${waiting.map(card).join('')}</div>` : '<p class="lede">No matter waits.</p>'}
    <div class="section-label">Dealt With</div>
    ${done.length ? `<div class="board">${done.slice(0, 40).map(card).join('')}</div>` : '<p class="hint">Nothing yet.</p>'}
  </section>`;
}

function officersPage(u, officers, ranks, csrf, issued, editingRank, giveable) {
  const rankName = id => (ranks.find(r => r.id === id) || {}).name || id;
  const mine = giveable || ranks;
  const byRank = ranks.map(r => ({ rank: r, people: officers.filter(o => o.rank === r.id) }));
  const permBoxes = r => Ranks.PERMS
    .filter(([g]) => g === 'Ministry of Justice' || g === 'Across the Ministries')
    .map(([g, list]) => `<fieldset class="permset"><legend>${esc(g)}</legend>${list.map(([k, l]) => `<label class="checkline"><input type="checkbox" name="perms" value="${esc(k)}"${(r.perms || []).includes(k) ? ' checked' : ''}> ${esc(l)}</label>`).join('')}</fieldset>`).join('');
  return `${jusNav('officers', u)}
  <section>
    <h2>Officers of the Ministry of Justice</h2>
    <p class="lede">Enter the officers of this Ministry and set what each rank may do. Nothing here reaches beyond the Ministry of Justice: a rank entered here cannot be given the powers of Civil Affairs or of the Legion.</p>
    ${issued ? `<div class="flash"><b>${esc(issued.name)}</b> is entered upon the rolls. Their name is <b>${esc(issued.username)}</b> and their first password is <b>${esc(issued.password)}</b>. They must change it when they first enter.</div>` : ''}

    <div class="section-label">Upon the Rolls</div>
    ${officers.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>Officer</th><th>Rank</th><th>Office</th><th>Standing</th><th></th></tr></thead><tbody>
      ${officers.map(o => `<tr${o.active ? '' : ' class="dim"'}>
        <td><b>${esc(o.name)}</b><br>${small(esc(o.username))}</td>
        <td>${esc(rankName(o.rank))}</td>
        <td>${esc(o.office) || '<span class="dash">—</span>'}</td>
        <td>${o.active ? '<span class="chip ok">Serving</span>' : '<span class="chip">Stood down</span>'}${o.mustChange ? ' <span class="chip warn">New password due</span>' : ''}</td>
        <td class="actions-col">
          <form method="post" action="/justice/officers/${esc(o.username)}/toggle" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">${o.active ? 'Stand down' : 'Restore'}</button></form>
          <form method="post" action="/justice/officers/${esc(o.username)}/password" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">New password</button></form>
        </td>
      </tr>`).join('')}
    </tbody></table></div>` : '<p class="lede">No officer of Justice is upon the rolls.</p>'}

    <details class="addwrap">
      <summary>Enter an officer of Justice</summary>
      <form class="warform" method="post" action="/justice/officers">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Name <span class="req">*</span></span><input type="text" name="name" required maxlength="80"></label>
          <label class="csf"><span>Username <span class="req">*</span></span><input type="text" name="username" required maxlength="32" placeholder="letters, numbers, dot or dash"></label>
          <label class="csf"><span>Rank</span><select name="rank">${mine.map(r => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</select></label>
          <label class="csf"><span>Office</span><input type="text" name="office" maxlength="120"></label>
        </div>
        <div class="linkrow"><button class="btn" type="submit">Enter them upon the rolls</button></div>
      </form>
    </details>

    <div class="section-label">Ranks of Justice</div>
    <div class="tablewrap"><table class="ledger"><thead><tr><th>Rank</th><th>Office</th><th>May do</th><th>Holding it</th><th></th></tr></thead><tbody>
      ${byRank.map(({ rank: r, people }) => `<tr>
        <td><b>${esc(r.name)}</b>${r.subtitle ? `<br>${small(esc(r.subtitle))}` : ''}</td>
        <td>${esc(r.group)}</td>
        <td>${(r.perms || []).length ? `<span class="qchips">${(r.perms || []).map(k => `<span class="qchip">${esc(k)}</span>`).join('')}</span>` : '<span class="dash">—</span>'}</td>
        <td>${people.length ? people.map(p => esc(p.name)).join(', ') : '<span class="dash">—</span>'}</td>
        <td class="actions-col"><a class="btn ghost small" href="/justice/officers?rank=${esc(r.id)}#rank">Amend</a></td>
      </tr>`).join('')}
    </tbody></table></div>

    <details class="addwrap" id="rank"${editingRank ? ' open' : ''}>
      <summary>${editingRank ? 'Amending ' + esc(editingRank.name) : 'Make a new rank of Justice'}</summary>
      <form class="warform" method="post" action="/justice/ranks${editingRank ? '/' + esc(editingRank.id) : ''}">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Name <span class="req">*</span></span><input type="text" name="name" required maxlength="90" value="${esc(editingRank ? editingRank.name : '')}"></label>
          <label class="csf"><span>Under-title</span><input type="text" name="subtitle" maxlength="90" value="${esc(editingRank ? editingRank.subtitle || '' : '')}"></label>
          <label class="csf"><span>Shown in the Directory</span><select name="directory"><option value="1"${!editingRank || editingRank.directory ? ' selected' : ''}>Yes</option><option value=""${editingRank && !editingRank.directory ? ' selected' : ''}>No</option></select></label>
          <label class="csf"><span>Office</span><select name="group"><option value="Ministry of Justice"${editingRank && editingRank.group === 'Ministry of Justice' ? ' selected' : ''}>Ministry of Justice</option><option value="Judicial Office"${editingRank && editingRank.group === 'Judicial Office' ? ' selected' : ''}>Judicial Office</option></select></label>
        </div>
        <div class="permgrid">${permBoxes(editingRank || { perms: ['jusdesk', 'juscases'] })}</div>
        <div class="linkrow"><button class="btn" type="submit">${editingRank ? 'Save the rank' : 'Make the rank'}</button>${editingRank ? '<a class="btn ghost" href="/justice/officers">Cancel</a>' : ''}</div>
      </form>
    </details>
    <p class="hint">Only the powers of Justice may be granted here. The Minister of State for Civil and Administrative Affairs sets everything beyond this Ministry.</p>
  </section>`;
}

function entrance(csrf, err, username) {
  return `<section class="signwrap">
    <h2>Staff Entrance of the Ministry of Justice</h2>
    <p class="lede">For the officers of the Ministry of Justice and of the Judicial Office. If you keep another Ministry, enter by its own door.</p>
    ${err ? `<div class="flash err" role="status">${esc(err)}</div>` : ''}
    <form class="writ" method="post" action="/login" style="max-width:520px">${hidden(csrf)}
      <input type="hidden" name="to" value="/justice/cases">
      <div class="field"><label class="l" for="u">Name upon the rolls</label><input type="text" id="u" name="username" required maxlength="40" value="${esc(username || '')}" autocomplete="username"></div>
      <div class="field"><label class="l" for="p">Password</label><input type="password" id="p" name="password" required autocomplete="current-password"></div>
      <div class="linkrow"><button class="btn" type="submit">Enter the Ministry</button><a class="btn ghost" href="/justice">The Hall of Justice</a></div>
    </form>
  </section>`;
}

const GRAVITY_CLASS = { Minor: '', Grave: 'warn', Capital: 'bad' };

function offencesPage(u, list, csrf, manage, editing) {
  const byClass = J.OFFENCE_CLASSES.map(c => ({ cls: c, rows: list.filter(o => o.cls === c) })).filter(g => g.rows.length);
  const v = editing || {};
  const sel = (n, opts, cur) => `<select name="${n}">${opts.map(o => `<option value="${esc(o)}"${cur === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  return `${jusNav('offences', u)}
  <section>
    <h2>The Book of Offences</h2>
    <p class="lede">What the Imperial law forbids within the province, upon what authority, and what the bench may order in answer. The penalties given here are the bounds within which a Justice may act, not a tariff to be applied without thought.</p>
    ${byClass.map(g => `<div class="section-label">${esc(g.cls)}</div>
      <div class="tablewrap"><table class="ledger"><thead><tr><th>Offence</th><th>Gravity</th><th>Authority</th><th>What the bench may order</th>${manage ? '<th></th>' : ''}</tr></thead><tbody>
        ${g.rows.map(o => `<tr>
          <td><b>${esc(o.name)}</b>${o.note ? `<br>${small(esc(o.note))}` : ''}</td>
          <td><span class="chip ${GRAVITY_CLASS[o.gravity] || ''}">${esc(o.gravity)}</span></td>
          <td>${esc(o.authority) || '<span class="dash">\u2014</span>'}</td>
          <td>${esc(o.penalty) || '<span class="dash">\u2014</span>'}</td>
          ${manage ? `<td class="actions-col"><a class="btn ghost small" href="/justice/offences?edit=${esc(o.id)}#offence">Amend</a><form method="post" action="/justice/offences/${esc(o.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form></td>` : ''}
        </tr>`).join('')}
      </tbody></table></div>`).join('')}
    ${manage ? `<details class="addwrap" id="offence"${editing ? ' open' : ''}>
      <summary>${editing ? 'Amending ' + esc(editing.name) : 'Enter an offence in the Book'}</summary>
      <form class="warform" method="post" action="/justice/offences${editing ? '/' + esc(editing.id) : ''}">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Offence <span class="req">*</span></span><input type="text" name="name" required maxlength="90" value="${esc(v.name || '')}"></label>
          <label class="csf"><span>Class</span>${sel('cls', J.OFFENCE_CLASSES, v.cls)}</label>
          <label class="csf"><span>Gravity</span>${sel('gravity', J.GRAVITY, v.gravity)}</label>
          <label class="csf csf-wide"><span>Authority</span><input type="text" name="authority" maxlength="160" value="${esc(v.authority || '')}" placeholder="The law or ordinance it rests upon"></label>
        </div>
        <label class="csf csf-wide" style="margin-top:10px"><span>What the bench may order</span><textarea name="penalty" rows="2" maxlength="500">${esc(v.penalty || '')}</textarea></label>
        <label class="csf csf-wide" style="margin-top:10px"><span>Note</span><textarea name="note" rows="2" maxlength="800">${esc(v.note || '')}</textarea></label>
        <div class="linkrow"><button class="btn" type="submit">${editing ? 'Save it' : 'Enter it in the Book'}</button>${editing ? '<a class="btn ghost" href="/justice/offences">Cancel</a>' : ''}</div>
      </form>
    </details>` : ''}
  </section>`;
}

function warrantsPage(u, list, csrf, mayIssue, cases, officers) {
  const open = list.filter(w => w.status === 'Issued');
  const done = list.filter(w => w.status !== 'Issued');
  const card = w => `<article class="reqcard">
    <div class="no">${esc(w.no)}${w.caseNo ? ' \u00b7 upon ' + esc(w.caseNo) : ''}${w.hold ? ' \u00b7 ' + esc(w.hold) : ''} \u00b7 ${esc(when(w.issuedAt))} <span class="chip ${J.WARRANT_CLASS[w.status] || ''}">${esc(w.status)}</span></div>
    <h3>Against ${esc(w.against)}</h3>
    <p class="small">Issued by ${esc(w.issuedBy)}${w.toWhom ? ' \u00b7 directed to ' + esc(w.toWhom) : ''}${w.expires ? ' \u00b7 runs until ' + esc(w.expires) : ''}</p>
    ${pre(w.reason)}
    ${w.servedBy ? `<p class="small">Served by ${esc(w.servedBy)}${w.servedAt ? ' on ' + esc(when(w.servedAt)) : ''}</p>` : ''}
    ${w.note ? `<dl class="meta"><dt>Return</dt><dd class="pre">${esc(w.note)}</dd></dl>` : ''}
    <div class="linkrow"><a class="btn ghost small" href="/justice/warrants/${esc(w.id)}/doc" target="_blank" rel="noopener">The warrant to give out ↗</a></div>
    ${mayIssue ? `<form method="post" action="/justice/warrants/${esc(w.id)}" class="stack">${hidden(csrf)}
      <div class="wargrid">
        <label class="csf"><span>Standing</span><select name="status">${J.WARRANT_STATUS.map(x => `<option value="${esc(x)}"${x === w.status ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
        <label class="csf"><span>Served by</span><input type="text" name="servedBy" maxlength="120" value="${esc(w.servedBy)}" placeholder="Who executed it"></label>
      </div>
      <label class="csf csf-wide"><span>Return upon the warrant</span><textarea name="note" rows="2" maxlength="1000">${esc(w.note)}</textarea></label>
      <div class="linkrow"><button class="btn small" type="submit">Set it down</button></div>
    </form>
    <form method="post" action="/justice/warrants/${esc(w.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form>` : ''}
  </article>`;
  return `${jusNav('warrants', u)}
  <section>
    <h2>Warrants of the Bench</h2>
    <p class="lede">Warrants run in the name of the Empire. They are directed to those who may execute them \u2014 commonly the Provosts of the Legion \u2014 and a return is made upon each when it is served or comes back unserved.</p>
    <div class="warstats">
      <div class="warstat"><span class="n">${open.length}</span><span class="t">Running</span></div>
      <div class="warstat"><span class="n">${list.filter(w => w.status === 'Served' || w.status === 'Executed').length}</span><span class="t">Served</span></div>
      <div class="warstat"><span class="n">${list.length}</span><span class="t">Issued in all</span></div>
    </div>
    <div class="section-label">Running</div>
    ${open.length ? `<div class="board">${open.map(card).join('')}</div>` : '<p class="lede">No warrant presently runs.</p>'}
    <div class="section-label">Returned</div>
    ${done.length ? `<div class="board">${done.slice(0, 40).map(card).join('')}</div>` : '<p class="hint">Nothing returned yet.</p>'}
    ${mayIssue ? `<details class="addwrap">
      <summary>Issue a warrant</summary>
      <form class="warform" method="post" action="/justice/warrants">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Kind</span><select name="kind">${J.WARRANT_KINDS.map(k => `<option value="${esc(k)}">Warrant of ${esc(k)}</option>`).join('')}</select></label>
          <label class="csf"><span>Against <span class="req">*</span></span><input type="text" name="against" required maxlength="140"></label>
          <label class="csf"><span>Upon which matter</span><select name="caseId"><option value="">\u2014 none \u2014</option>${cases.map(c => `<option value="${esc(c.id)}">${esc(c.no)} \u2014 ${esc(c.subject)}</option>`).join('')}</select></label>
          <label class="csf"><span>Hold</span><input type="text" name="hold" maxlength="60"></label>
          <label class="csf"><span>Directed to</span><input type="text" name="toWhom" maxlength="120" value="The Provosts of the Imperial Legion"></label>
          <label class="csf"><span>Runs until</span><input type="text" name="expires" maxlength="80" placeholder="e.g. the 30th of Frostfall"></label>
        </div>
        <label class="csf csf-wide" style="margin-top:10px"><span>Ground of the warrant <span class="req">*</span></span><textarea name="reason" rows="4" maxlength="2000" required></textarea></label>
        <div class="linkrow"><button class="btn" type="submit">Issue it</button></div>
      </form>
    </details>` : ''}
  </section>`;
}

function calendarPage(u, rows) {
  return `${jusNav('calendar', u)}
  <section>
    <h2>Calendar of the Bench</h2>
    <p class="lede">Every sitting set across all matters, newest first.</p>
    ${rows.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>When</th><th>Matter</th><th>Subject</th><th>Place</th><th>Before</th><th>Standing</th></tr></thead><tbody>
      ${rows.map(r => `<tr>
        <td><b>${esc(r.when)}</b></td>
        <td class="num"><a href="/justice/cases/${esc(r.caseId)}">${esc(r.no)}</a></td>
        <td>${esc(r.subject)}${r.note ? `<br>${small(esc(r.note))}` : ''}</td>
        <td>${esc(r.place) || '<span class="dash">\u2014</span>'}</td>
        <td>${esc(r.before) || '<span class="dash">\u2014</span>'}</td>
        <td><span class="chip ${J.STATUS_CLASS[r.status] || ''}">${esc(r.status)}</span></td>
      </tr>`).join('')}
    </tbody></table></div>` : '<p class="lede">The bench is not set to sit upon anything.</p>'}
  </section>`;
}

function custodyPage(u, list, csrf, manage, cases, warrants) {
  const held = list.filter(x => x.status === 'Held');
  const past = list.filter(x => x.status !== 'Held');
  const row = x => `<tr>
    <td class="num">${esc(x.no)}</td>
    <td><a href="/justice/parties?name=${encodeURIComponent(x.name)}"><b>${esc(x.name)}</b></a></td>
    <td>${esc(x.place) || '<span class="dash">\u2014</span>'}${x.hold ? small('<br>' + esc(x.hold)) : ''}</td>
    <td>${x.caseNo ? esc(x.caseNo) : '<span class="dash">\u2014</span>'}${x.warrantNo ? small('<br>' + esc(x.warrantNo)) : ''}</td>
    <td>${esc(x.since) || '<span class="dash">\u2014</span>'}</td>
    <td>${esc(x.until) || '<span class="dash">\u2014</span>'}</td>
    <td><span class="chip ${J.CUSTODY_CLASS[x.status] || ''}">${esc(x.status)}</span></td>
    ${manage ? `<td class="actions-col">
      <a class="btn ghost small" href="/justice/custody/${esc(x.id)}/doc" target="_blank" rel="noopener">Paper ↗</a>
      <details class="inlinedit"><summary class="btn ghost small">Amend</summary>
        <form method="post" action="/justice/custody/${esc(x.id)}" class="stack">${hidden(csrf)}
          <label class="csf"><span>Standing</span><select name="status">${J.CUSTODY_STATUS.map(v => `<option value="${esc(v)}"${v === x.status ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
          <label class="csf"><span>Held at</span><input type="text" name="place" value="${esc(x.place)}" maxlength="120"></label>
          <label class="csf"><span>Until</span><input type="text" name="until" value="${esc(x.until)}" maxlength="80"></label>
          <label class="csf"><span>Note</span><textarea name="note" rows="2" maxlength="1500">${esc(x.note)}</textarea></label>
          <div class="linkrow"><button class="btn small" type="submit">Set it down</button></div>
        </form>
      </details>
      <form method="post" action="/justice/custody/${esc(x.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form>
    </td>` : ''}
  </tr>`;
  const tbl = (rows, empty) => rows.length ? `<div class="tablewrap"><table class="ledger roster"><thead><tr>
    <th>No.</th><th>Who</th><th>Held at</th><th>Upon</th><th>Since</th><th>Until</th><th>Standing</th>${manage ? '<th></th>' : ''}
  </tr></thead><tbody>${rows.map(row).join('')}</tbody></table></div>` : `<p class="lede">${empty}</p>`;
  return `${jusNav('custody', u)}
  <section>
    <h2>Register of Custody</h2>
    <p class="lede">Every person held upon the order of the bench: where they are kept, upon what warrant, since when, and until what.</p>
    <div class="warstats">
      <div class="warstat"><span class="n">${held.length}</span><span class="t">Presently held</span></div>
      <div class="warstat"><span class="n">${list.filter(x => x.status === 'Released' || x.status === 'Bailed').length}</span><span class="t">Released or bailed</span></div>
      <div class="warstat"><span class="n">${list.length}</span><span class="t">Entered in all</span></div>
    </div>
    <div class="section-label">Presently Held</div>
    ${tbl(held, 'No one is held.')}
    <div class="section-label">No Longer Held</div>
    ${tbl(past, 'Nothing past.')}
    ${manage ? `<details class="addwrap"><summary>Commit someone to custody</summary>
      <form class="warform" method="post" action="/justice/custody">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Who <span class="req">*</span></span><input type="text" name="name" required maxlength="140"></label>
          <label class="csf"><span>Held at</span><input type="text" name="place" maxlength="120" placeholder="e.g. The gaol at Solitude"></label>
          <label class="csf"><span>Hold</span><input type="text" name="hold" maxlength="60"></label>
          <label class="csf"><span>Upon the matter</span><input type="text" name="caseNo" maxlength="40" list="jcaselist"></label>
          <label class="csf"><span>Upon the warrant</span><input type="text" name="warrantNo" maxlength="40" list="jwarrantlist"></label>
          <label class="csf"><span>Since</span><input type="text" name="since" maxlength="80"></label>
          <label class="csf"><span>Until</span><input type="text" name="until" maxlength="80" placeholder="e.g. the sitting of the bench"></label>
          <label class="csf"><span>Keeper</span><input type="text" name="keeper" maxlength="120"></label>
        </div>
        <datalist id="jcaselist">${cases.map(c => `<option value="${esc(c.no)}"></option>`).join('')}</datalist>
        <datalist id="jwarrantlist">${warrants.map(w => `<option value="${esc(w.no)}"></option>`).join('')}</datalist>
        <label class="csf csf-wide" style="margin-top:10px"><span>Note</span><textarea name="note" rows="2" maxlength="1500"></textarea></label>
        <div class="linkrow"><button class="btn" type="submit">Commit to custody</button></div>
      </form></details>` : ''}
  </section>`;
}

function inquisitionsPage(u, list, csrf, mayOpen, cases) {
  const open = list.filter(i => i.status !== 'Closed' && i.status !== 'Abandoned');
  const done = list.filter(i => !open.includes(i));
  const card = i => `<article class="reqcard">
    <div class="no">${esc(i.no)}${i.caseNo ? ' \u00b7 upon ' + esc(i.caseNo) : ''}${i.hold ? ' \u00b7 ' + esc(i.hold) : ''} \u00b7 ${esc(when(i.at))} <span class="chip ${J.INQ_CLASS[i.status] || ''}">${esc(i.status)}</span></div>
    <h3><a href="/justice/inquisitions/${esc(i.id)}">${esc(i.subject)}</a></h3>
    <p class="small">Opened by ${esc(i.byName)}${i.into ? ' \u00b7 into ' + esc(i.into) : ''} \u00b7 ${(i.lines || []).length} line${(i.lines || []).length === 1 ? '' : 's'} of inquiry, ${(i.statements || []).length} statement${(i.statements || []).length === 1 ? '' : 's'}</p>
    ${i.conclusion ? `<p class="pre"><b>Concluded:</b> ${esc(i.conclusion)}</p>` : ''}
  </article>`;
  return `${jusNav('inquisitions', u)}
  <section>
    <h2>Inquisitions</h2>
    <p class="lede">The Imperial Inquisitor gathers the facts of a matter: the lines of inquiry pursued, the statements taken, and the report laid before the bench. The Inquisitor does not prosecute, and does not judge.</p>
    <div class="section-label">In Hand</div>
    ${open.length ? `<div class="board">${open.map(card).join('')}</div>` : '<p class="lede">No inquisition is in hand.</p>'}
    <div class="section-label">Concluded</div>
    ${done.length ? `<div class="board">${done.slice(0, 40).map(card).join('')}</div>` : '<p class="hint">Nothing concluded.</p>'}
    ${mayOpen ? `<details class="addwrap"><summary>Open an inquisition</summary>
      <form class="warform" method="post" action="/justice/inquisitions">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf csf-wide"><span>Subject <span class="req">*</span></span><input type="text" name="subject" required maxlength="160"></label>
          <label class="csf"><span>Into whom or what</span><input type="text" name="into" maxlength="140"></label>
          <label class="csf"><span>Upon the matter</span><input type="text" name="caseNo" maxlength="40" list="jcaselist2"></label>
          <label class="csf"><span>Hold</span><input type="text" name="hold" maxlength="60"></label>
        </div>
        <datalist id="jcaselist2">${cases.map(c => `<option value="${esc(c.no)}"></option>`).join('')}</datalist>
        <label class="csf csf-wide" style="margin-top:10px"><span>Scope of the inquisition</span><textarea name="scope" rows="3" maxlength="3000"></textarea></label>
        <div class="linkrow"><button class="btn" type="submit">Open it</button></div>
      </form></details>` : ''}
  </section>`;
}

function inquisitionPage(u, i, csrf, mayEdit, cases) {
  return `${jusNav('inquisitions', u)}
  <section>
    <p style="margin:0 0 10px"><a href="/justice/inquisitions">\u2190 Inquisitions</a></p>
    <h2>${esc(i.no)}</h2>
    <p class="lede">${esc(i.subject)} \u00b7 <span class="chip ${J.INQ_CLASS[i.status] || ''}">${esc(i.status)}</span></p>
    <dl class="meta">
      ${i.into ? `<dt>Into</dt><dd><a href="/justice/parties?name=${encodeURIComponent(i.into)}">${esc(i.into)}</a></dd>` : ''}
      ${i.caseNo ? `<dt>Upon the matter</dt><dd>${esc(i.caseNo)}</dd>` : ''}
      ${i.hold ? `<dt>Hold</dt><dd>${esc(i.hold)}</dd>` : ''}
      <dt>Opened</dt><dd>${esc(when(i.at))} by ${esc(i.byName)}</dd>
    </dl>
    ${i.scope ? `<div class="section-label">Scope</div>${pre(i.scope)}` : ''}

    <div class="section-label">Lines of Inquiry</div>
    ${(i.lines || []).length ? `<ul class="plainlist">${i.lines.map(l => `<li><b>${esc(l.line)}</b>${l.answer ? `<br>${esc(l.answer)}` : small('<br>Not yet answered.')}${mayEdit ? ` <form method="post" action="/justice/inquisitions/${esc(i.id)}/line/${esc(l.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form>` : ''}</li>`).join('')}</ul>` : '<p class="hint">No line of inquiry is set down.</p>'}
    ${mayEdit ? `<details class="addwrap"><summary>Set down a line of inquiry</summary>
      <form class="warform" method="post" action="/justice/inquisitions/${esc(i.id)}/line">${hidden(csrf)}
        <label class="csf csf-wide"><span>The question <span class="req">*</span></span><input type="text" name="line" required maxlength="300"></label>
        <label class="csf csf-wide" style="margin-top:8px"><span>What was found</span><textarea name="answer" rows="2" maxlength="2000"></textarea></label>
        <div class="linkrow"><button class="btn small" type="submit">Set it down</button></div>
      </form></details>` : ''}

    <div class="section-label">Statements Taken</div>
    ${(i.statements || []).length ? i.statements.map(st => `<article class="paper">
      <div class="no">${esc(st.from)}${st.standing ? ' \u00b7 ' + esc(st.standing) : ''} \u00b7 taken by ${esc(st.by)}${st.taken ? ' \u00b7 ' + esc(st.taken) : ''}</div>
      ${pre(st.body)}
      ${mayEdit ? `<form method="post" action="/justice/inquisitions/${esc(i.id)}/statement/${esc(st.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form>` : ''}
    </article>`).join('') : '<p class="hint">No statement has been taken.</p>'}
    ${mayEdit ? `<details class="addwrap"><summary>Take a statement</summary>
      <form class="warform" method="post" action="/justice/inquisitions/${esc(i.id)}/statement">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>From <span class="req">*</span></span><input type="text" name="from" required maxlength="140"></label>
          <label class="csf"><span>Their standing</span><input type="text" name="standing" maxlength="120"></label>
          <label class="csf"><span>Taken</span><input type="text" name="taken" maxlength="80" placeholder="e.g. 26th of Hearthfire"></label>
        </div>
        <label class="csf csf-wide" style="margin-top:8px"><span>What they said <span class="req">*</span></span><textarea name="body" rows="4" maxlength="6000" required></textarea></label>
        <div class="linkrow"><button class="btn small" type="submit">Take it down</button></div>
      </form></details>` : ''}

    <div class="section-label">Report to the Bench</div>
    ${i.report ? pre(i.report) : '<p class="hint">No report has been laid.</p>'}
    ${mayEdit ? `<details class="addwrap"><summary>Lay the report and set the standing</summary>
      <form class="warform" method="post" action="/justice/inquisitions/${esc(i.id)}">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Standing</span><select name="status">${J.INQ_STATUS.map(x => `<option value="${esc(x)}"${x === i.status ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
          <label class="csf"><span>Upon the matter</span><input type="text" name="caseNo" value="${esc(i.caseNo)}" maxlength="40" list="jcaselist3"></label>
          <label class="csf csf-wide"><span>Conclusion in a line</span><input type="text" name="conclusion" value="${esc(i.conclusion)}" maxlength="300"></label>
        </div>
        <datalist id="jcaselist3">${cases.map(c => `<option value="${esc(c.no)}"></option>`).join('')}</datalist>
        <label class="csf csf-wide" style="margin-top:8px"><span>The report</span><textarea name="report" rows="6" maxlength="8000">${esc(i.report)}</textarea></label>
        <div class="linkrow"><button class="btn" type="submit">Lay it</button>
        </div>
      </form></details>
      <form method="post" action="/justice/inquisitions/${esc(i.id)}/remove" class="inline" style="margin-top:10px">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike this inquisition entirely</button></form>` : ''}
  </section>`;
}

function partiesPage(u, names, rec) {
  const list = `<div class="section-label">Parties Known to the Bench</div>
    ${names.length ? `<div class="partylist">${names.map(n => `<a class="chip" href="/justice/parties?name=${encodeURIComponent(n)}">${esc(n)}</a>`).join('')}</div>` : '<p class="hint">No party is yet known.</p>'}`;
  if (!rec) {
    return `${jusNav('parties', u)}
    <section>
      <h2>Parties</h2>
      <p class="lede">Every person or body that has stood before the bench, been named in a warrant, or been held. Choose a name to see everything recorded of them.</p>
      <form class="search-box" method="get" action="/justice/parties"><input type="search" name="name" placeholder="A name\u2026" aria-label="Party name" required><button class="btn" type="submit">Look</button></form>
      ${list}
    </section>`;
  }
  return `${jusNav('parties', u)}
  <section>
    <p style="margin:0 0 10px"><a href="/justice/parties">\u2190 Parties</a></p>
    <h2>${esc(rec.name)}</h2>
    <p class="lede">Everything the Ministry of Justice records of this party.</p>
    <div class="warstats">
      <div class="warstat"><span class="n">${rec.cases.length}</span><span class="t">Matters stood in</span></div>
      <div class="warstat"><span class="n">${rec.asAccused}</span><span class="t">As the party answering</span></div>
      <div class="warstat"><span class="n">${rec.findings.length}</span><span class="t">Findings</span></div>
      <div class="warstat"><span class="n">${rec.custody.filter(c => c.status === 'Held').length}</span><span class="t">Presently held</span></div>
    </div>
    <div class="section-label">Matters</div>
    ${rec.cases.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>Matter</th><th>Subject</th><th>Stood as</th><th>Standing</th></tr></thead><tbody>
      ${rec.cases.map(c => `<tr><td class="num"><a href="/justice/cases/${esc(c.id)}">${esc(c.no)}</a></td><td>${esc(c.subject)}</td><td>${String(c.accused).toLowerCase() === rec.name.toLowerCase() ? esc(J.KIND_BY_ID[c.kind].accused) : esc(J.KIND_BY_ID[c.kind].accuser)}</td><td><span class="chip ${J.STATUS_CLASS[c.status] || ''}">${esc(c.status)}</span></td></tr>`).join('')}
    </tbody></table></div>` : '<p class="hint">They have stood in no matter.</p>'}
    <div class="section-label">Findings</div>
    ${rec.findings.length ? `<ul class="plainlist">${rec.findings.map(f => `<li><a href="/justice/cases/${esc(f.id)}">${esc(f.no)}</a> \u2014 <b>${esc(f.finding)}</b>${f.penalty ? ' \u00b7 ' + esc(f.penalty) : ''} ${small(esc(when(f.at)))}</li>`).join('')}</ul>` : '<p class="hint">No finding stands against them.</p>'}
    <div class="section-label">Warrants</div>
    ${rec.warrants.length ? `<ul class="plainlist">${rec.warrants.map(w => `<li>${esc(w.no)} \u2014 ${esc(w.reason)} <span class="chip ${J.WARRANT_CLASS[w.status] || ''}">${esc(w.status)}</span></li>`).join('')}</ul>` : '<p class="hint">No warrant has run against them.</p>'}
    <div class="section-label">Custody</div>
    ${rec.custody.length ? `<ul class="plainlist">${rec.custody.map(c => `<li>${esc(c.no)} \u2014 ${esc(c.place) || 'place not set down'}${c.since ? ' since ' + esc(c.since) : ''} <span class="chip ${J.CUSTODY_CLASS[c.status] || ''}">${esc(c.status)}</span></li>`).join('')}</ul>` : '<p class="hint">They have not been held.</p>'}
  </section>`;
}

const V = require('./views');

function docShell({ title, kind, no, body, foot, id }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light">
<title>${esc(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fondamento:ital@0;1&family=EB+Garamond:ital,wght@0,400;0,600;1,400&display=swap">
<link rel="stylesheet" href="/style.css?v=${V.CSS_V}">
<script src="/vendor/html2canvas.min.js" defer></script></head>
<body class="printbody">
<div class="printbar noprint"><a class="btn ghost" href="javascript:history.back()">← Back</a><button class="btn" onclick="window.print()">Print</button><button class="btn ghost" id="pic">Save as picture</button></div>
<article class="scroll jusdoc" id="doc">
  <div class="eyebrow">By the Authority of the Governor</div>
  <div class="admin">Cyrodilic Administration for the Imperial Province of Skyrim</div>
  <div class="s-ministry">The Ministry of Justice · The Imperial Bench</div>
  <div class="s-orn">❦</div>
  <div class="s-hear">${esc(kind)}</div>
  <h1 class="s-title">${esc(title)}</h1>
  <div class="s-no">${esc(no)}</div>
  ${body}
  ${foot || ''}
</article>
<script>document.getElementById('pic').addEventListener('click',function(){var b=this;b.disabled=true;html2canvas(document.getElementById('doc'),{scale:2,backgroundColor:null,useCORS:true}).then(function(c){c.toBlob(function(bl){var a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download=${JSON.stringify(String(id || 'document'))}+'.png';document.body.appendChild(a);a.click();a.remove();b.disabled=false;});});});</script>
</body></html>`;
}

const facts = rows => `<dl class="docfacts">${rows.filter(Boolean).map(([l, v]) => `<dt>${esc(l)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
const seal = (line, who) => `<div class="docseal"><div class="docseal-line">${esc(line)}</div><div class="docseal-name">${esc(who)}</div><div class="docseal-mark">❦ Under the seal of the Imperial Bench ❦</div></div>`;

function warrantDoc(w, offence) {
  const body = `<p class="docpre">To the officers of the Empire and to all whom it may concern: <b>GREETING</b>.</p>
  <p class="docpre">You are hereby commanded, upon the authority of the Imperial Bench and under the law of the Empire, to execute this warrant of <b>${esc(w.kind)}</b> against the party named below, and to make due return upon it.</p>
  ${facts([
    ['Against', w.against],
    w.caseNo && ['Upon the matter', w.caseNo],
    w.hold && ['Within the Hold of', w.hold],
    w.toWhom && ['Directed to', w.toWhom],
    ['Issued by', w.issuedBy],
    w.expires && ['Runs until', w.expires],
    ['Standing', w.status]
  ])}
  <div class="s-hear">The Ground of this Warrant</div>
  <p class="docbody">${esc(w.reason)}</p>
  ${offence ? `<div class="s-hear">The Offence Alleged</div><p class="docbody"><b>${esc(offence.name)}</b> — ${esc(offence.gravity)}<br>${esc(offence.authority)}<br><i>${esc(offence.penalty)}</i></p>` : ''}
  ${w.note ? `<div class="s-hear">Return upon the Warrant</div><p class="docbody">${esc(w.note)}${w.servedBy ? `<br><i>Executed by ${esc(w.servedBy)}</i>` : ''}</p>` : ''}`;
  return docShell({
    title: 'Warrant of ' + w.kind, kind: 'A Warrant of the Imperial Bench', no: w.no, id: w.no.replace(/\s+/g, '_'),
    body, foot: seal('Given under my hand, by order of the bench', w.issuedBy)
  });
}

function judgmentDoc(c) {
  const K = J.KIND_BY_ID[c.kind];
  const j = c.judgment || {};
  const body = `<p class="docpre">Be it known that the Imperial Bench, sitting upon the matter named below, having heard what was laid before it, gives judgment in these terms.</p>
  ${facts([
    ['The matter', c.subject],
    ['Kind', K.label],
    c.accuser && [K.accuser, c.accuser],
    c.accused && [K.accused, c.accused],
    c.hold && ['Within the Hold of', c.hold],
    c.appealOf && ['Upon appeal from', c.appealOf],
    ['Finding of the bench', j.finding || ''],
    j.penalty && ['Order of the bench', j.penalty]
  ])}
  ${j.reasons ? `<div class="s-hear">Reasons of the Bench</div><p class="docbody">${esc(j.reasons)}</p>` : ''}
  <p class="docpre">This judgment stands upon the rolls of the Ministry of Justice and is entered in the Register of Judgments, that the law may be known and not guessed at.</p>`;
  return docShell({
    title: 'Judgment upon ' + c.no, kind: 'A Judgment of the Imperial Bench', no: c.no, id: c.no.replace(/\s+/g, '_') + '_judgment',
    body, foot: seal('Given upon the bench', j.by || '')
  });
}

function summonsDoc(c, h) {
  const K = J.KIND_BY_ID[c.kind];
  const body = `<p class="docpre">To the parties in the matter named below: <b>YOU ARE SUMMONED</b> to appear before the Imperial Bench at the time and place here set down, to answer and be heard upon this matter.</p>
  ${facts([
    ['The matter', c.no + ' — ' + c.subject],
    ['Kind', K.label],
    c.accuser && [K.accuser, c.accuser],
    c.accused && [K.accused, c.accused],
    ['The bench will sit', h.when],
    h.place && ['At', h.place],
    h.before && ['Before', h.before]
  ])}
  ${h.note ? `<div class="s-hear">Note</div><p class="docbody">${esc(h.note)}</p>` : ''}
  <p class="docpre">A party who does not come may be heard against in their absence, or a warrant may run against them.</p>`;
  return docShell({
    title: 'Summons to the Bench', kind: 'A Summons of the Imperial Bench', no: c.no, id: c.no.replace(/\s+/g, '_') + '_summons',
    body, foot: seal('By order of the bench', h.before || c.justice || '')
  });
}

function custodyDoc(x) {
  const body = `<p class="docpre">To the keeper of the place named below: you are commanded to receive and hold the party here named, upon the authority of the Imperial Bench, and to produce them before the bench when required.</p>
  ${facts([
    ['Who is held', x.name],
    x.place && ['Held at', x.place],
    x.hold && ['Within the Hold of', x.hold],
    x.caseNo && ['Upon the matter', x.caseNo],
    x.warrantNo && ['Upon the warrant', x.warrantNo],
    x.since && ['Since', x.since],
    x.until && ['Until', x.until],
    x.keeper && ['Keeper', x.keeper],
    ['Standing', x.status]
  ])}
  ${x.note ? `<div class="s-hear">Note</div><p class="docbody">${esc(x.note)}</p>` : ''}
  <p class="docpre">No person may be held beyond what the bench has ordered. The keeper answers for their safety.</p>`;
  return docShell({
    title: 'Order of Custody', kind: 'An Order of the Imperial Bench', no: x.no, id: x.no.replace(/\s+/g, '_'),
    body, foot: seal('By order of the bench', x.by || '')
  });
}

function matterDoc(m) {
  const body = `<p class="docpre">This is the acknowledgement of the Ministry of Justice that the matter below was laid before it and entered upon its roll.</p>
  ${facts([
    ['Brought by', m.name + (m.style ? ', ' + m.style : '')],
    m.hold && ['Of the Hold of', m.hold],
    ['What was brought', m.kind],
    m.against && ['Against', m.against],
    ['Subject', m.subject],
    ['Standing', m.status],
    m.caseNo && ['Raised to the bench as', m.caseNo]
  ])}
  <div class="s-hear">As it was set down</div>
  <p class="docbody">${esc(m.body)}</p>
  ${m.reply ? `<div class="s-hear">The Answer of the Ministry</div><p class="docbody">${esc(m.reply)}</p>` : ''}
  <p class="docpre">Keep this paper and the number upon it. With it you may ask after your matter at any time.</p>`;
  return docShell({
    title: 'Acknowledgement of a Matter', kind: 'A Paper of the Ministry of Justice', no: m.no, id: m.no.replace(/\s+/g, '_'),
    body, foot: seal('Entered upon the roll', m.handledBy || 'The Court Clerk')
  });
}

module.exports = { warrantDoc, judgmentDoc, summonsDoc, custodyDoc, matterDoc, custodyPage, inquisitionsPage, inquisitionPage, partiesPage, offencesPage, warrantsPage, calendarPage, jusNav, hall, principles, judgmentsPage, layBox, layDone, layStatus, docket, casePage, mattersPage, officersPage, entrance };
