const { esc, hidden } = require('./views');
const J = require('./justice');
const Ranks = require('./ranks');
const { OFFICE, JUDICIAL, PRINCIPLES } = require('./justicecontent');

const small = t => `<span class="small">${t}</span>`;
const when = iso => (iso ? new Date(iso).toISOString().slice(0, 10) : '');
const pre = t => `<p class="pre">${esc(t)}</p>`;

const partyList = () => `<datalist id="jparties">${J.partyNames().map(n => `<option value="${esc(n)}"></option>`).join('')}</datalist>`;

const TABS = [
  ['/justice', 'The Ministry', 'hall', true],
  ['/justice/principles', 'How Justice Is Done', 'principles', true],
  ['/justice/judgments', 'Register of Judgments', 'judgments', true],
  ['/justice/offences', 'Book of Offences', 'offences', true],
  ['/justice/calendar', 'Calendar', 'calendar', true],
  ['/justice/wanted', 'Persons Sought', 'wanted', true],
  ['/justice/verify', 'Verify a Paper', 'verify', true],
  ['/justice/courts', 'Courts of the Holds', 'courts', true],
  ['/justice/lay', 'Lay a Matter', 'lay', true],
  ['/justice/cases', 'The Bench', 'cases', false],
  ['/justice/warrants', 'Warrants', 'warrants', false],
  ['/justice/inquisitions', 'Inquisitions', 'inquisitions', false],
  ['/justice/custody', 'Custody', 'custody', false],
  ['/justice/exhibits', 'Exhibits', 'exhibits', false],
  ['/justice/dues', 'Fines & Restitution', 'dues', false],
  ['/justice/sentences', 'Sentences', 'sentences', false],
  ['/justice/parties', 'Parties', 'parties', false],
  ['/justice/matters', 'Matters Laid', 'matters', false],
  ['/justice/report', 'The Report', 'report', false],
  ['/justice/officers', 'Officers', 'officers', false]
];

function jusNav(active, u) {
  const inside = !!(u && (u.all || Ranks.can(u, 'jusdesk') || Ranks.can(u, 'juscases')));
  const admin = Ranks.mayAdminBranch(u, 'justice');
  const link = ([h, l, k]) => `<a href="${h}"${k === active ? ' class="on" aria-current="page"' : ''}>${esc(l)}</a>`;
  const pub = TABS.filter(t => t[3]);
  const staff = TABS.filter(t => !t[3] && (t[2] === 'officers' ? admin : inside));
  return `<nav class="warnav" aria-label="Justice, open to all">${pub.map(link).join('')}</nav>
  ${staff.length ? `<nav class="warnav staffrow" aria-label="Justice, officers only"><span class="rowlead">❖ Officers only</span>${staff.map(link).join('')}</nav>` : ''}`;
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
    <div class="linkrow" style="margin-top:20px"><a class="btn" href="/justice/lay">Lay a matter before Justice</a><a class="btn ghost" href="/justice/judgments">Register of Judgments</a><a class="btn ghost" href="/justice/calendar">When the bench sits</a><a class="btn ghost" href="/justice/verify">Verify a paper</a><a class="btn ghost" href="/justice/wanted">Persons sought</a></div>
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

function judgmentsPage(u, list, withheld) {
  return `${jusNav('judgments', u)}
  <section>
    <h2>Register of Judgments</h2>
    <p class="lede">Every judgment the bench has given and ordered published, with the finding and the reasons upon which it stands.</p>
    ${withheld ? `<p class="notice">${withheld === 1 ? 'One judgment is' : withheld + ' judgments are'} sealed by order of the bench and withheld from this register until the seal is lifted.</p>` : ''}
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
          ${c.fromCourt ? `<dt>Came up from</dt><dd>${esc(c.fromCourt)}</dd>` : ''}
          <dt>Opened</dt><dd>${esc(when(c.opened))} by ${esc(c.openedByName)}</dd>
          ${c.fromMatter ? `<dt>Raised from</dt><dd>${esc(c.fromMatter)}</dd>` : ''}
        </dl>
        ${c.sealed ? `<p class="sealnote"><b>Sealed by order of the bench.</b>${c.sealReason ? ' ' + esc(c.sealReason) : ''}${c.sealedBy ? small('<br>Sealed by ' + esc(c.sealedBy) + ' · ' + esc(when(c.sealedAt))) : ''}</p>` : ''}

        <div class="section-label">The Plea</div>
        ${c.plea ? `<dl class="meta">
          <dt>The accused answers</dt><dd><b>${esc(c.plea)}</b></dd>
          <dt>Entered</dt><dd>${esc(when(c.pleaAt))}${c.pleaBy ? ' by ' + esc(c.pleaBy) : ''}</dd>
        </dl>${c.pleaNote ? pre(c.pleaNote) : ''}` : '<p class="hint">The accused has not yet answered the charge.</p>'}
        ${perms.file ? `<details class="addwrap"${c.plea ? '' : ' open'}><summary>${c.plea ? 'Amend the plea' : 'Enter the plea'}</summary>
        <form class="warform" method="post" action="/justice/cases/${esc(c.id)}/plea">${hidden(csrf)}
          <label class="csf"><span>How the accused answers <span class="req">*</span></span><select name="plea" required>${J.PLEAS.map(x => `<option value="${esc(x)}"${x === c.plea ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
          <label class="csf csf-wide" style="margin-top:10px"><span>Note</span><textarea name="pleaNote" rows="2" maxlength="1000">${esc(c.pleaNote || '')}</textarea></label>
          <div class="linkrow"><button class="btn small" type="submit">Set the plea down</button></div>
        </form></details>` : ''}
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
            <label class="csf"><span>Came up from the court of</span><select name="fromCourt"><option value="">— none —</option>${(ctx.courts || []).map(x => `<option value="${esc(x.court)}"${x.court === c.fromCourt ? ' selected' : ''}>${esc(x.court)}</option>`).join('')}</select></label>
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

        <div class="section-label">Witnesses</div>
        ${(c.witnesses || []).length ? `<ul class="plainlist">${c.witnesses.map(w => `<li>
          <b>${esc(w.name)}</b>${w.standing ? ' · ' + esc(w.standing) : ''}${w.forWhom ? ' · called by ' + esc(w.forWhom) : ''}
          ${w.sworn ? '<span class="chip ok">Sworn</span>' : ''}
          ${w.called ? small('<br>To attend ' + esc(w.called)) : ''}${w.note ? `<br>${small(esc(w.note))}` : ''}
          <span class="linkrow"><a class="btn ghost small" href="/justice/cases/${esc(c.id)}/witness/${esc(w.id)}/summons" target="_blank" rel="noopener">Summons ↗</a>${perms.file ? `
          <form method="post" action="/justice/cases/${esc(c.id)}/witness/${esc(w.id)}" class="inline">${hidden(csrf)}<input type="hidden" name="sworn" value="${w.sworn ? '' : '1'}"><button class="btn ghost small" type="submit">${w.sworn ? 'Unswear' : 'Mark sworn'}</button></form>
          <form method="post" action="/justice/cases/${esc(c.id)}/witness/${esc(w.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form>` : ''}</span>
        </li>`).join('')}</ul>` : '<p class="hint">No witness has been called.</p>'}
        ${perms.file ? `<details class="addwrap"><summary>Call a witness</summary>
        <form class="warform" method="post" action="/justice/cases/${esc(c.id)}/witness">${hidden(csrf)}
          <div class="wargrid">
            <label class="csf"><span>Name <span class="req">*</span></span><input type="text" name="name" required maxlength="140"></label>
            <label class="csf"><span>Standing</span><input type="text" name="standing" maxlength="120" placeholder="e.g. Quartermaster of the Legion"></label>
            <label class="csf"><span>Called by</span><input type="text" name="forWhom" maxlength="90" placeholder="e.g. the Prosecutor"></label>
            <label class="csf"><span>To attend</span><input type="text" name="called" maxlength="80" placeholder="which sitting"></label>
          </div>
          <label class="csf csf-wide" style="margin-top:10px"><span>Note</span><textarea name="note" rows="2" maxlength="1500"></textarea></label>
          <div class="linkrow"><button class="btn small" type="submit">Call them</button></div>
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
      ${(c.judgment.cites || []).length ? `<p class="cited"><b>Standing upon</b> · ${c.judgment.cites.map(x => { const t = (ctx.byNo || {})[String(x).toLowerCase()]; return t ? `<a href="/justice/cases/${esc(t.id)}">${esc(x)}</a>` : esc(x); }).join(' · ')}</p>` : ''}
      ${(ctx.citedBy || []).length ? `<p class="cited"><b>Cited since in</b> · ${ctx.citedBy.map(x => `<a href="/justice/cases/${esc(x.id)}">${esc(x.no)}</a>`).join(' · ')}</p>` : ''}
      ${c.judgment.code ? `<p class="hint">Check-number on the paper given out: <b class="codeno">${esc(c.judgment.code)}</b></p>` : ''}
      <div class="linkrow"><a class="btn" href="/justice/cases/${esc(c.id)}/judgment/doc" target="_blank" rel="noopener">The judgment to give out ↗</a></div>
    </article>` : perms.judge ? `<details class="addwrap"><summary>Give judgment</summary>
      <form class="warform" method="post" action="/justice/cases/${esc(c.id)}/judgment">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Finding <span class="req">*</span></span><select name="finding" required>${J.FINDINGS.map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join('')}</select></label>
          <label class="csf csf-wide"><span>Order of the bench</span><input type="text" name="penalty" maxlength="200" placeholder="e.g. A fine of 500 septims and restitution"></label>
        </div>
        <label class="csf csf-wide" style="margin-top:10px"><span>Reasons <span class="req">*</span></span><textarea name="reasons" rows="6" maxlength="8000" required></textarea></label>
        ${(ctx.citable || []).length ? `<label class="csf csf-wide" style="margin-top:10px"><span>Standing upon these judgments</span>
          <select name="cites" multiple size="${Math.min(6, (ctx.citable || []).length)}">${ctx.citable.map(x => `<option value="${esc(x.no)}">${esc(x.no)} — ${esc(x.finding)} — ${esc(x.subject)}</option>`).join('')}</select></label>
        <p class="hint">Hold control to cite more than one.</p>` : ''}
        <div class="linkrow"><label class="warcheck"><input type="checkbox" name="published" checked> Publish it in the Register of Judgments</label></div>
        <div class="linkrow"><button class="btn" type="submit">Give judgment</button></div>
      </form></details>` : '<p class="hint">No judgment has been given.</p>'}

    ${perms.judge ? `<div class="section-label">The Seal</div>
    <p class="hint">A sealed matter keeps its number on the public register and nothing else — no subject, no parties, no judgment — until the seal is lifted.</p>
    <form method="post" action="/justice/cases/${esc(c.id)}/seal" class="stack" style="max-width:560px">${hidden(csrf)}
      <input type="hidden" name="sealed" value="${c.sealed ? '' : '1'}">
      ${c.sealed ? '' : `<label class="csf"><span>Why it is sealed</span><input type="text" name="sealReason" maxlength="200" placeholder="e.g. A witness stands in danger"></label>`}
      <div class="linkrow"><button class="btn ghost small" type="submit">${c.sealed ? 'Lift the seal' : 'Seal this matter'}</button></div>
    </form>` : ''}

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
    ${officers.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>Officer</th><th>Rank</th><th>Office</th><th class="num">Weekly pay</th><th>Standing</th><th></th></tr></thead><tbody>
      ${officers.map(o => `<tr${o.active ? '' : ' class="dim"'}>
        <td><b>${esc(o.name)}</b><br>${small(esc(o.username))}</td>
        <td>${esc(rankName(o.rank))}</td>
        <td>${esc(o.office) || '<span class="dash">—</span>'}</td>
        <td class="num">${o.weekly ? Number(o.weekly).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '<span class="dash">—</span>'}</td>
        <td>${o.active ? '<span class="chip ok">Serving</span>' : '<span class="chip">Stood down</span>'}${o.mustChange ? ' <span class="chip warn">New password due</span>' : ''}</td>
        <td class="actions-col">
          <details class="inlinedit"><summary class="btn ghost small">Amend</summary>
            <form method="post" action="/justice/officers/${esc(o.username)}" class="stack">${hidden(csrf)}
              <label class="csf"><span>Name</span><input type="text" name="name" maxlength="80" value="${esc(o.name)}"></label>
              <label class="csf"><span>Rank</span><select name="rank">${mine.map(r => `<option value="${esc(r.id)}"${r.id === o.rank ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}${mine.some(r => r.id === o.rank) ? '' : `<option value="${esc(o.rank)}" selected>${esc(rankName(o.rank))} (you may not give this rank)</option>`}</select></label>
              <label class="csf"><span>Office</span><input type="text" name="office" maxlength="120" value="${esc(o.office)}"></label>
              <label class="csf"><span>Weekly pay</span><input type="number" step="0.01" min="0" name="weekly" value="${esc(String(o.weekly || 0))}"></label>
              <label class="csf"><span>Shown in the Directory</span><select name="listed"><option value="1"${o.listed ? ' selected' : ''}>Yes</option><option value=""${o.listed ? '' : ' selected'}>No</option></select></label>
              <div class="linkrow"><button class="btn small" type="submit">Set it down</button></div>
            </form>
          </details>
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
          <label class="csf"><span>Weekly pay</span><input type="number" step="0.01" min="0" name="weekly"></label>
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

function calendarPage(u, rows, inside) {
  const line = r => {
    if (r.sealed && !inside) return `<tr class="dim">
      <td><b>${esc(r.when)}</b></td>
      <td class="num">${esc(r.no)}</td>
      <td colspan="3"><span class="dash">Sealed by order of the bench \u2014 heard in closed sitting</span></td>
      <td><span class="chip">Sealed</span></td>
    </tr>`;
    return `<tr>
      <td><b>${esc(r.when)}</b></td>
      <td class="num">${inside ? `<a href="/justice/cases/${esc(r.caseId)}">${esc(r.no)}</a>` : esc(r.no)}</td>
      <td>${esc(r.subject)}${r.note && inside ? `<br>${small(esc(r.note))}` : ''}${!inside && (r.accuser || r.accused) ? `<br>${small(esc([r.accuser, r.accused].filter(Boolean).join(' \u2014 ')))}` : ''}</td>
      <td>${esc(r.place) || '<span class="dash">\u2014</span>'}</td>
      <td>${esc(r.before) || '<span class="dash">\u2014</span>'}</td>
      <td><span class="chip ${J.STATUS_CLASS[r.status] || ''}">${esc(r.status)}</span></td>
    </tr>`;
  };
  return `${jusNav('calendar', u)}
  <section>
    <h2>Calendar of the Bench</h2>
    <p class="lede">Every sitting the Imperial Bench has set, newest first. Sittings are open to any person of the province unless the bench has ordered otherwise \u2014 come and hear, but keep silence while the bench sits.</p>
    ${rows.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>When</th><th>Matter</th><th>Subject</th><th>Place</th><th>Before</th><th>Standing</th></tr></thead><tbody>
      ${rows.map(line).join('')}
    </tbody></table></div>` : '<p class="lede">The bench is not set to sit upon anything.</p>'}
    ${inside ? '' : '<p class="hint">A matter marked sealed is heard in closed sitting. Its number stands here so the roll is complete, and nothing more is told of it until the seal is lifted.</p>'}
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
    <td>${esc(x.until) || '<span class="dash">\u2014</span>'}${x.bailSurety ? small('<br>Surety: ' + esc(x.bailSurety) + (x.bailSum ? ' (' + esc(x.bailSum) + ')' : '')) : ''}</td>
    <td><span class="chip ${J.CUSTODY_CLASS[x.status] || ''}">${esc(x.status)}</span></td>
    ${manage ? `<td class="actions-col">
      <a class="btn ghost small" href="/justice/custody/${esc(x.id)}/doc" target="_blank" rel="noopener">Paper ↗</a>
      ${x.status === 'Bailed' || x.bailSurety ? `<a class="btn ghost small" href="/justice/custody/${esc(x.id)}/bail" target="_blank" rel="noopener">Bond ↗</a>` : ''}
      <details class="inlinedit"><summary class="btn ghost small">Amend</summary>
        <form method="post" action="/justice/custody/${esc(x.id)}" class="stack">${hidden(csrf)}
          <label class="csf"><span>Standing</span><select name="status">${J.CUSTODY_STATUS.map(v => `<option value="${esc(v)}"${v === x.status ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
          <label class="csf"><span>Held at</span><input type="text" name="place" value="${esc(x.place)}" maxlength="120"></label>
          <label class="csf"><span>Until</span><input type="text" name="until" value="${esc(x.until)}" maxlength="80"></label>
          <label class="csf"><span>Surety</span><input type="text" name="bailSurety" value="${esc(x.bailSurety || '')}" maxlength="140" placeholder="who stands for them"></label>
          <label class="csf"><span>Sum pledged</span><input type="text" name="bailSum" value="${esc(x.bailSum || '')}" maxlength="40" placeholder="septims"></label>
          <label class="csf"><span>Terms of the bail</span><textarea name="bailTerms" rows="2" maxlength="1000">${esc(x.bailTerms || '')}</textarea></label>
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

function docShell({ title, kind, no, body, foot, id, code }) {
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
  ${code ? `<div class="doccheck">Under the hand and number <b>${esc(code)}</b><br><span>Entered so upon the rolls of the Ministry. Any person doubting this paper may bring it to a Court Clerk, or ask after this number at the Hall of Justice, and be told whether it is genuine and what standing it has.</span></div>` : ''}
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
    body, code: w.code, foot: seal('Given under my hand, by order of the bench', w.issuedBy)
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
    body, code: j.code, foot: seal('Given upon the bench', j.by || '')
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
    body, code: x.code, foot: seal('By order of the bench', x.by || '')
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
    body, code: m.code, foot: seal('Entered upon the roll', m.handledBy || 'The Court Clerk')
  });
}


function witnessSummonsDoc(c, w) {
  const K = J.KIND_BY_ID[c.kind];
  const body = `<p class="docpre">To <b>${esc(w.name)}</b>: <b>YOU ARE SUMMONED</b> to attend upon the Imperial Bench and to give such testimony as you are able touching the matter named below.</p>
  ${facts([
    ['Witness', w.name],
    w.standing && ['Standing', w.standing],
    ['The matter', c.no + ' — ' + c.subject],
    ['Kind', K.label],
    w.forWhom && ['Called by', w.forWhom],
    w.called && ['To attend', w.called],
    c.hold && ['Within the Hold of', c.hold]
  ])}
  ${w.note ? `<div class="s-hear">Note</div><p class="docbody">${esc(w.note)}</p>` : ''}
  <div class="s-hear">Upon the Giving of Testimony</div>
  <p class="docbody">You will be sworn before you speak. A witness who gives false testimony answers for it as though they had done the act themselves, and may be barred from the courts of the Empire. A witness who does not come when summoned may be brought by warrant.</p>`;
  return docShell({
    title: 'Summons of a Witness', kind: 'A Summons of the Imperial Bench', no: c.no,
    id: c.no.replace(/\s+/g, '_') + '_witness', code: w.code,
    body, foot: seal('By order of the bench', c.justice || '')
  });
}

function bailDoc(x) {
  const body = `<p class="docpre">Be it known that the party named below, standing committed upon the order of the Imperial Bench, is admitted to bail upon the surety and terms here set down.</p>
  ${facts([
    ['Who is bailed', x.name],
    x.caseNo && ['Upon the matter', x.caseNo],
    x.warrantNo && ['Upon the warrant', x.warrantNo],
    ['Surety', x.bailSurety || '—'],
    ['Sum pledged', x.bailSum ? x.bailSum + ' septims' : '—'],
    x.hold && ['Within the Hold of', x.hold],
    ['Standing', x.status]
  ])}
  ${x.bailTerms ? `<div class="s-hear">Terms of the Bail</div><p class="docbody">${esc(x.bailTerms)}</p>` : ''}
  <p class="docpre">The surety stands bound in the sum above. Should the party fail to appear when the bench sits, the sum is forfeit to the Empire and a warrant of arrest runs against them both.</p>`;
  return docShell({
    title: 'Bond of Bail', kind: 'A Bond of the Imperial Bench', no: x.no,
    id: x.no.replace(/\s+/g, '_') + '_bail', code: x.code,
    body, foot: seal('Taken and allowed by', x.by || '')
  });
}

function exhibitDoc(e) {
  const body = `<p class="docpre">This is the receipt of the Ministry of Justice for the thing named below, taken into its keeping. Present this paper when you seek its return.</p>
  ${facts([
    ['Exhibit', e.no],
    ['What was taken', e.what],
    e.takenFrom && ['Taken from', e.takenFrom],
    e.takenBy && ['Taken by', e.takenBy],
    e.takenAt && ['Taken', e.takenAt],
    e.where && ['Taken at', e.where],
    e.warrantNo && ['Under the warrant', e.warrantNo],
    e.caseNo && ['Upon the matter', e.caseNo],
    e.holder && ['Now in the keeping of', e.holder],
    ['Standing', e.status]
  ])}
  ${e.note ? `<div class="s-hear">Note</div><p class="docbody">${esc(e.note)}</p>` : ''}
  <p class="docpre">A thing taken is held only so long as the bench has need of it. What is not forfeit is returned when the matter is done.</p>`;
  return docShell({
    title: 'Receipt for a Thing Taken', kind: 'A Receipt of the Ministry of Justice', no: e.no,
    id: e.no.replace(/\s+/g, '_'), code: e.code,
    body, foot: seal('Taken into keeping by', e.by || '')
  });
}

function dueDoc(d, owing, paid) {
  const body = `<p class="docpre">The Imperial Bench, having given judgment upon the matter named below, requires of you the sum here set down. This paper is your account of it.</p>
  ${facts([
    ['Owed by', d.who],
    ['What is owed', d.kind],
    d.toWhom && ['Payable to', d.toWhom],
    d.caseNo && ['Upon the matter', d.caseNo],
    ['Sum ordered', Number(d.amount || 0).toLocaleString('en-US') + ' septims'],
    ['Rendered so far', Number(paid || 0).toLocaleString('en-US') + ' septims'],
    ['Still owing', Number(owing || 0).toLocaleString('en-US') + ' septims'],
    d.due && ['To be rendered by', d.due]
  ])}
  ${(d.payments || []).length ? `<div class="s-hear">What Has Been Rendered</div><p class="docbody">${d.payments.map(pm => esc((pm.when || '') + ' — ' + Number(pm.amount).toLocaleString('en-US') + ' septims' + (pm.note ? ' (' + pm.note + ')' : ''))).join('\n')}</p>` : ''}
  ${d.note ? `<div class="s-hear">Note</div><p class="docbody">${esc(d.note)}</p>` : ''}
  <p class="docpre">A sum unrendered may be levied by distraint upon your goods, and the bench may commit you until it is satisfied.</p>`;
  return docShell({
    title: 'Account of a Sum Ordered', kind: 'A Demand of the Imperial Bench', no: d.no,
    id: d.no.replace(/\s+/g, '_'),
    body, foot: seal('Ordered by the bench', d.by || '')
  });
}

function sentenceDoc(x) {
  const body = `<p class="docpre">To the Provost of the Imperial Legion and to all officers of the Empire: you are commanded to carry out the sentence of the Imperial Bench upon the party named below, and to make due return of what was done.</p>
  ${facts([
    ['Upon', x.who],
    ['Sentence', x.kind],
    x.term && ['Term', x.term],
    x.caseNo && ['Upon the matter', x.caseNo],
    x.hold && ['Within the Hold of', x.hold],
    x.toWhom && ['Directed to', x.toWhom],
    ['Standing', x.status]
  ])}
  <div class="s-hear">The Sentence of the Bench</div>
  <p class="docbody">${esc(x.sentence)}</p>
  ${x.ret ? `<div class="s-hear">Return upon the Sentence</div><p class="docbody">${esc(x.ret)}${x.carriedBy ? `<br><i>Carried out by ${esc(x.carriedBy)}</i>` : ''}</p>` : ''}
  <p class="docpre">No sentence may be exceeded in its carrying out. What is done beyond this order is itself an offence of office.</p>`;
  return docShell({
    title: 'Warrant to Carry Out Sentence', kind: 'An Order of the Imperial Bench', no: x.no,
    id: x.no.replace(/\s+/g, '_'), code: x.code,
    body, foot: seal('By order of the bench', x.by || '')
  });
}

function reportDoc(r, byName) {
  const span = r.from || r.to ? `${r.from || 'the beginning'} to ${r.to || 'this day'}` : 'the whole of the rolls';
  const tally = rows => `<table class="rpt"><tbody>${rows.filter(Boolean).map(([l, v]) => `<tr><th>${esc(l)}</th><td>${esc(String(v))}</td></tr>`).join('')}</tbody></table>`;
  const breakdown = o => {
    const k = Object.keys(o || {});
    return k.length ? `<p class="docbody">${k.map(x => esc(x + ': ' + o[x])).join('\n')}</p>` : '<p class="docbody">None.</p>';
  };
  const body = `<p class="docpre">This is the account of the work of the Ministry of Justice within the Imperial Province of Skyrim, rendered for <b>${esc(span)}</b>.</p>

  <div class="s-hear">Matters upon the Bench</div>
  ${tally([
    ['Opened in this span', r.opened],
    ['Judged in this span', r.judged],
    ['Still pending', r.pending],
    ['Sealed by order', r.sealed],
    ['Sittings set', r.sittings]
  ])}
  <div class="section-label">By kind</div>${breakdown(r.byKind)}
  <div class="section-label">Findings given</div>${breakdown(r.findings)}

  <div class="s-hear">Matters Laid by the Public</div>
  ${tally([['Laid in this span', r.mattersLaid], ['Awaiting an answer', r.mattersWaiting]])}

  <div class="s-hear">Warrants and Custody</div>
  ${tally([
    ['Warrants issued', r.warrants],
    ['Warrants still running', r.warrantsOpen],
    ['Committed to custody', r.committed],
    ['Held at this hour', r.held]
  ])}
  <div class="section-label">Warrants by kind</div>${breakdown(r.warrantKinds)}

  <div class="s-hear">Inquisitions and Exhibits</div>
  ${tally([
    ['Inquisitions opened', r.inquisitions],
    ['Inquisitions still running', r.inquisitionsOpen],
    ['Things taken into keeping', r.exhibits],
    ['Things still held', r.exhibitsHeld]
  ])}

  <div class="s-hear">Sentence and Satisfaction</div>
  ${tally([
    ['Sentences ordered', r.sentences],
    ['Sentences carried out', r.sentencesCarried],
    ['Sentences outstanding', r.sentencesOutstanding],
    ['Sums ordered', Number(r.dues.ordered || 0).toLocaleString('en-US') + ' septims'],
    ['Sums rendered', Number(r.dues.rendered || 0).toLocaleString('en-US') + ' septims'],
    ['Still outstanding', Number(r.dues.outstanding || 0).toLocaleString('en-US') + ' septims']
  ])}

  <p class="docpre">The law is kept where it is seen to be kept. This account is rendered that the Governor and the province may judge whether it is.</p>`;
  return docShell({
    title: 'Report of the Ministry of Justice', kind: 'An Account Rendered to the Governor',
    no: span, id: 'justice_report', body,
    foot: seal('Rendered by', byName || 'The Minister of State for Justice')
  });
}


function exhibitsPage(u, list, csrf, manage, cases, warrants) {
  const held = list.filter(e => e.status === 'Held' || e.status === 'Produced before the bench');
  const gone = list.filter(e => !(e.status === 'Held' || e.status === 'Produced before the bench'));
  const card = e => `<article class="reqcard">
    <div class="no">${esc(e.no)}${e.caseNo ? ' · upon ' + esc(e.caseNo) : ''}${e.warrantNo ? ' · under ' + esc(e.warrantNo) : ''} · ${esc(when(e.at))} <span class="chip ${J.EXHIBIT_CLASS[e.status] || ''}">${esc(e.status)}</span></div>
    <h3>${esc(e.what)}</h3>
    <dl class="meta">
      ${e.takenFrom ? `<dt>Taken from</dt><dd><a href="/justice/parties?name=${encodeURIComponent(e.takenFrom)}">${esc(e.takenFrom)}</a></dd>` : ''}
      ${e.takenBy ? `<dt>Taken by</dt><dd>${esc(e.takenBy)}</dd>` : ''}
      ${e.where ? `<dt>Taken at</dt><dd>${esc(e.where)}</dd>` : ''}
      ${e.takenAt ? `<dt>Taken</dt><dd>${esc(e.takenAt)}</dd>` : ''}
      <dt>In the keeping of</dt><dd>${esc(e.holder) || 'The Ministry'}</dd>
    </dl>
    ${e.note ? pre(e.note) : ''}
    ${(e.chain || []).length ? `<details class="inlinedit"><summary class="btn ghost small">Whose hands it has passed through</summary>
      <ul class="plainhist">${e.chain.map(h => `<li><span class="ph-when">${esc(when(h.at))}${h.by ? ' · ' + esc(h.by) : ''}</span>${esc(h.text)}</li>`).join('')}</ul>
    </details>` : ''}
    <div class="linkrow"><a class="btn ghost small" href="/justice/exhibits/${esc(e.id)}/doc" target="_blank" rel="noopener">Receipt to give out ↗</a></div>
    ${manage ? `<form method="post" action="/justice/exhibits/${esc(e.id)}" class="stack">${hidden(csrf)}
      <div class="wargrid">
        <label class="csf"><span>Standing</span><select name="status">${J.EXHIBIT_STATUS.map(x => `<option value="${esc(x)}"${x === e.status ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
        <label class="csf"><span>In the keeping of</span><input type="text" name="holder" maxlength="140" value="${esc(e.holder)}"></label>
        <label class="csf"><span>Kept at</span><input type="text" name="where" maxlength="140" value="${esc(e.where)}"></label>
      </div>
      <label class="csf csf-wide"><span>Note</span><textarea name="note" rows="2" maxlength="1500">${esc(e.note)}</textarea></label>
      <div class="linkrow"><button class="btn small" type="submit">Set it down</button></div>
    </form>
    <form method="post" action="/justice/exhibits/${esc(e.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form>` : ''}
  </article>`;
  return `${jusNav('exhibits', u)}${partyList()}
  <section>
    <h2>Evidence and Exhibits</h2>
    <p class="lede">Everything taken into the keeping of the Ministry — under a warrant of seizure or brought in upon a matter — with whose hands it has passed through and where it stands now. What is not forfeit is returned when the matter is done.</p>
    <div class="warstats">
      <div class="warstat"><div class="n">${held.length}</div><div class="t">In keeping</div></div>
      <div class="warstat"><div class="n">${list.filter(e => e.status === 'Returned').length}</div><div class="t">Returned</div></div>
      <div class="warstat"><div class="n">${list.filter(e => e.status === 'Forfeit to the Empire').length}</div><div class="t">Forfeit</div></div>
      <div class="warstat"><div class="n">${list.length}</div><div class="t">In all</div></div>
    </div>
    ${manage ? `<details class="addwrap">
      <summary>Take a thing into keeping</summary>
      <form class="warform" method="post" action="/justice/exhibits">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf csf-wide"><span>What was taken <span class="req">*</span></span><input type="text" name="what" required maxlength="160" placeholder="e.g. A steel war axe, notched upon the haft"></label>
          <label class="csf"><span>Taken from</span><input type="text" name="takenFrom" maxlength="140" list="jparties"></label>
          <label class="csf"><span>Taken by</span><input type="text" name="takenBy" maxlength="140"></label>
          <label class="csf"><span>Taken at</span><input type="text" name="where" maxlength="140" placeholder="the place"></label>
          <label class="csf"><span>Taken</span><input type="text" name="takenAt" maxlength="80" placeholder="the day"></label>
          <label class="csf"><span>Upon the matter</span><select name="caseNo"><option value="">— none —</option>${cases.map(c => `<option value="${esc(c.no)}">${esc(c.no)} — ${esc(c.subject)}</option>`).join('')}</select></label>
          <label class="csf"><span>Under the warrant</span><select name="warrantNo"><option value="">— none —</option>${warrants.map(w => `<option value="${esc(w.no)}">${esc(w.no)} — ${esc(w.against)}</option>`).join('')}</select></label>
          <label class="csf"><span>In the keeping of</span><input type="text" name="holder" maxlength="140"></label>
        </div>
        <label class="csf csf-wide" style="margin-top:10px"><span>Note</span><textarea name="note" rows="2" maxlength="1500"></textarea></label>
        <div class="linkrow"><button class="btn" type="submit">Take it into keeping</button></div>
      </form>
    </details>` : ''}
    <div class="section-label">In the Keeping of the Ministry</div>
    ${held.length ? held.map(card).join('') : '<p class="lede">Nothing is held.</p>'}
    ${gone.length ? `<div class="section-label">No Longer Held</div>${gone.map(card).join('')}` : ''}
  </section>`;
}

function duesPage(u, list, csrf, manage, cases, totals) {
  const owing = list.filter(d => !d.remitted && J.owingOf(d) > 0);
  const done = list.filter(d => d.remitted || J.owingOf(d) <= 0);
  const money = n => Number(n || 0).toLocaleString('en-US');
  const card = d => {
    const paid = J.paidOf(d), left = J.owingOf(d), standing = J.dueStanding(d);
    return `<article class="reqcard">
    <div class="no">${esc(d.no)}${d.caseNo ? ' · upon ' + esc(d.caseNo) : ''} · ${esc(when(d.at))} <span class="chip ${J.DUE_CLASS[standing] || ''}">${esc(standing)}</span></div>
    <h3>${esc(d.who)} — ${money(d.amount)} septims</h3>
    <p class="small">${esc(d.kind)}${d.toWhom ? ' · payable to ' + esc(d.toWhom) : ''}${d.due ? ' · to be rendered by ' + esc(d.due) : ''} · ordered by ${esc(d.by)}</p>
    <div class="duebar"><span style="width:${d.amount ? Math.min(100, Math.round(paid / d.amount * 100)) : 0}%"></span></div>
    <p class="small">Rendered ${money(paid)} · still owing <b>${money(left)}</b></p>
    ${(d.payments || []).length ? `<ul class="plainhist">${d.payments.map(pm => `<li><span class="ph-when">${esc(pm.when || when(pm.at))}${pm.by ? ' · ' + esc(pm.by) : ''}</span><b>${money(pm.amount)} septims</b>${pm.note ? ' — ' + esc(pm.note) : ''}
      ${manage ? `<form method="post" action="/justice/dues/${esc(d.id)}/payment/${esc(pm.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form>` : ''}</li>`).join('')}</ul>` : ''}
    ${d.note ? pre(d.note) : ''}
    <div class="linkrow"><a class="btn ghost small" href="/justice/dues/${esc(d.id)}/doc" target="_blank" rel="noopener">Account to give out ↗</a></div>
    ${manage ? `<form method="post" action="/justice/dues/${esc(d.id)}/payment" class="stack">${hidden(csrf)}
      <div class="wargrid">
        <label class="csf"><span>Rendered <span class="req">*</span></span><input type="number" name="amount" min="1" required placeholder="septims"></label>
        <label class="csf"><span>When</span><input type="text" name="when" maxlength="80"></label>
        <label class="csf"><span>Note</span><input type="text" name="note" maxlength="200"></label>
      </div>
      <div class="linkrow"><button class="btn small" type="submit">Enter what was rendered</button></div>
    </form>
    <form method="post" action="/justice/dues/${esc(d.id)}" class="inline">${hidden(csrf)}<input type="hidden" name="remitted" value="${d.remitted ? '' : '1'}"><button class="btn ghost small" type="submit">${d.remitted ? 'Restore the sum' : 'Remit it'}</button></form>
    <form method="post" action="/justice/dues/${esc(d.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form>` : ''}
  </article>`;
  };
  return `${jusNav('dues', u)}${partyList()}
  <section>
    <h2>Fines and Restitution</h2>
    <p class="lede">A judgment that orders a sum is not done when it is given — it is done when the sum is rendered. Everything the bench has ordered paid stands here until it is satisfied.</p>
    <div class="warstats">
      <div class="warstat"><div class="n">${money(totals.ordered)}</div><div class="t">Ordered</div></div>
      <div class="warstat"><div class="n">${money(totals.rendered)}</div><div class="t">Rendered</div></div>
      <div class="warstat"><div class="n">${money(totals.outstanding)}</div><div class="t">Outstanding</div></div>
      <div class="warstat"><div class="n">${totals.count}</div><div class="t">Sums unpaid</div></div>
    </div>
    ${manage ? `<details class="addwrap">
      <summary>Order a sum</summary>
      <form class="warform" method="post" action="/justice/dues">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Owed by <span class="req">*</span></span><input type="text" name="who" required maxlength="140" list="jparties"></label>
          <label class="csf"><span>What is owed</span><select name="kind">${J.DUE_KINDS.map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join('')}</select></label>
          <label class="csf"><span>Sum <span class="req">*</span></span><input type="number" name="amount" min="1" required placeholder="septims"></label>
          <label class="csf"><span>Payable to</span><input type="text" name="toWhom" maxlength="140" placeholder="the Empire, or the injured party"></label>
          <label class="csf"><span>Upon the matter</span><select name="caseNo"><option value="">— none —</option>${cases.map(c => `<option value="${esc(c.no)}">${esc(c.no)} — ${esc(c.subject)}</option>`).join('')}</select></label>
          <label class="csf"><span>To be rendered by</span><input type="text" name="due" maxlength="80"></label>
        </div>
        <label class="csf csf-wide" style="margin-top:10px"><span>Note</span><textarea name="note" rows="2" maxlength="1000"></textarea></label>
        <div class="linkrow"><button class="btn" type="submit">Order it</button></div>
      </form>
    </details>` : ''}
    <div class="section-label">Still Owing</div>
    ${owing.length ? owing.map(card).join('') : '<p class="lede">Nothing stands unpaid.</p>'}
    ${done.length ? `<div class="section-label">Satisfied or Remitted</div>${done.map(card).join('')}` : ''}
  </section>`;
}

function sentencesPage(u, list, csrf, manage, cases) {
  const live = list.filter(x => x.status === 'Ordered' || x.status === 'With the Provost');
  const done = list.filter(x => !(x.status === 'Ordered' || x.status === 'With the Provost'));
  const card = x => `<article class="reqcard">
    <div class="no">${esc(x.no)}${x.caseNo ? ' · upon ' + esc(x.caseNo) : ''}${x.hold ? ' · ' + esc(x.hold) : ''} · ${esc(when(x.at))} <span class="chip ${J.SENTENCE_CLASS[x.status] || ''}">${esc(x.status)}</span></div>
    <h3>${esc(x.kind)} upon ${esc(x.who)}</h3>
    <p class="small">${x.term ? 'Term: ' + esc(x.term) + ' · ' : ''}Ordered by ${esc(x.by)}${x.toWhom ? ' · directed to ' + esc(x.toWhom) : ''}</p>
    ${pre(x.sentence)}
    ${x.ret ? `<dl class="meta"><dt>Return</dt><dd class="pre">${esc(x.ret)}</dd>${x.carriedBy ? `<dt>Carried out by</dt><dd>${esc(x.carriedBy)}</dd>` : ''}</dl>` : ''}
    <div class="linkrow"><a class="btn ghost small" href="/justice/sentences/${esc(x.id)}/doc" target="_blank" rel="noopener">Order to give out ↗</a></div>
    ${manage ? `<form method="post" action="/justice/sentences/${esc(x.id)}" class="stack">${hidden(csrf)}
      <div class="wargrid">
        <label class="csf"><span>Standing</span><select name="status">${J.SENTENCE_STATUS.map(v => `<option value="${esc(v)}"${v === x.status ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
        <label class="csf"><span>Directed to</span><input type="text" name="toWhom" maxlength="140" value="${esc(x.toWhom)}" placeholder="the Provost, or a keeper"></label>
      </div>
      <label class="csf csf-wide"><span>Return upon the sentence</span><textarea name="ret" rows="2" maxlength="1500">${esc(x.ret)}</textarea></label>
      <div class="linkrow"><button class="btn small" type="submit">Set it down</button></div>
    </form>
    <form method="post" action="/justice/sentences/${esc(x.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form>` : ''}
  </article>`;
  return `${jusNav('sentences', u)}${partyList()}
  <section>
    <h2>Sentences of the Bench</h2>
    <p class="lede">A sentence ordered, sent to the Provost of the Legion to be carried out, and returned with an account of what was done. Until the return is made the sentence stands outstanding.</p>
    <div class="warstats">
      <div class="warstat"><div class="n">${list.filter(x => x.status === 'Ordered').length}</div><div class="t">Ordered</div></div>
      <div class="warstat"><div class="n">${list.filter(x => x.status === 'With the Provost').length}</div><div class="t">With the Provost</div></div>
      <div class="warstat"><div class="n">${list.filter(x => x.status === 'Carried out').length}</div><div class="t">Carried out</div></div>
      <div class="warstat"><div class="n">${list.length}</div><div class="t">In all</div></div>
    </div>
    ${manage ? `<details class="addwrap">
      <summary>Order a sentence</summary>
      <form class="warform" method="post" action="/justice/sentences">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Upon <span class="req">*</span></span><input type="text" name="who" required maxlength="140" list="jparties"></label>
          <label class="csf"><span>Sentence</span><select name="kind">${J.SENTENCE_KINDS.map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join('')}</select></label>
          <label class="csf"><span>Term</span><input type="text" name="term" maxlength="90" placeholder="e.g. two years"></label>
          <label class="csf"><span>Upon the matter</span><select name="caseNo"><option value="">— none —</option>${cases.map(c => `<option value="${esc(c.no)}">${esc(c.no)} — ${esc(c.subject)}</option>`).join('')}</select></label>
          <label class="csf"><span>Within the Hold of</span><input type="text" name="hold" maxlength="60"></label>
          <label class="csf"><span>Directed to</span><input type="text" name="toWhom" maxlength="140" placeholder="the Provost of the Legion"></label>
        </div>
        <label class="csf csf-wide" style="margin-top:10px"><span>The sentence <span class="req">*</span></span><textarea name="sentence" rows="3" maxlength="1000" required></textarea></label>
        <div class="linkrow"><button class="btn" type="submit">Order it</button></div>
      </form>
    </details>` : ''}
    <div class="section-label">Outstanding</div>
    ${live.length ? live.map(card).join('') : '<p class="lede">No sentence stands outstanding.</p>'}
    ${done.length ? `<div class="section-label">Done With</div>${done.map(card).join('')}` : ''}
  </section>`;
}

function courtsPage(u, list, csrf, manage, counts) {
  return `${jusNav('courts', u)}
  <section>
    <h2>The Courts of the Holds</h2>
    <p class="lede">Each Hold keeps its own court, and the Jarl or their appointed justice sits in it. Small matters are heard there. An appeal from any of them comes up to the Imperial Bench, and this is where you find who sits where.</p>
    <div class="tablewrap"><table class="ledger roster"><thead><tr><th>Court</th><th>Hold</th><th>Seat</th><th>Who sits</th><th>Appeals up</th>${manage ? '<th></th>' : ''}</tr></thead><tbody>
      ${list.map(c => `<tr>
        <td><b>${esc(c.court)}</b>${c.note ? `<br>${small(esc(c.note))}` : ''}</td>
        <td>${esc(c.hold) || '<span class="dash">—</span>'}</td>
        <td>${esc(c.seat) || '<span class="dash">—</span>'}</td>
        <td>${esc(c.justice) || '<span class="dash">not named</span>'}</td>
        <td>${(counts[c.court] || []).length ? (counts[c.court]).map(x => `<a href="/justice/cases/${esc(x.id)}">${esc(x.no)}</a>`).join(', ') : '<span class="dash">—</span>'}</td>
        ${manage ? `<td class="actions-col">
          <details class="inlinedit"><summary class="btn ghost small">Amend</summary>
            <form method="post" action="/justice/courts/${esc(c.id)}" class="stack">${hidden(csrf)}
              <label class="csf"><span>Court</span><input type="text" name="court" maxlength="120" value="${esc(c.court)}"></label>
              <label class="csf"><span>Hold</span><input type="text" name="hold" maxlength="60" value="${esc(c.hold)}"></label>
              <label class="csf"><span>Seat</span><input type="text" name="seat" maxlength="90" value="${esc(c.seat)}"></label>
              <label class="csf"><span>Who sits</span><input type="text" name="justice" maxlength="120" value="${esc(c.justice)}"></label>
              <label class="csf"><span>Note</span><textarea name="note" rows="2" maxlength="800">${esc(c.note)}</textarea></label>
              <div class="linkrow"><button class="btn small" type="submit">Set it down</button></div>
            </form>
          </details>
          <form method="post" action="/justice/courts/${esc(c.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form>
        </td>` : ''}
      </tr>`).join('')}
    </tbody></table></div>
    ${manage ? `<details class="addwrap">
      <summary>Enter a court</summary>
      <form class="warform" method="post" action="/justice/courts">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Court <span class="req">*</span></span><input type="text" name="court" required maxlength="120"></label>
          <label class="csf"><span>Hold</span><input type="text" name="hold" maxlength="60"></label>
          <label class="csf"><span>Seat</span><input type="text" name="seat" maxlength="90"></label>
          <label class="csf"><span>Who sits</span><input type="text" name="justice" maxlength="120"></label>
        </div>
        <label class="csf csf-wide" style="margin-top:10px"><span>Note</span><textarea name="note" rows="2" maxlength="800"></textarea></label>
        <div class="linkrow"><button class="btn" type="submit">Enter it</button></div>
      </form>
    </details>` : ''}
  </section>`;
}

function wantedPage(u, list) {
  return `${jusNav('wanted', u)}
  <section>
    <h2>Persons Sought</h2>
    <p class="lede">Warrants of arrest that stand unanswered. If you know where any of these may be found, tell the nearest officer of the Legion or lay a matter before this Ministry. Do not lay hands on them yourself.</p>
    ${list.length ? `<div class="tablewrap"><table class="ledger roster"><thead><tr><th>Sought</th><th>For</th><th>Hold</th><th>Warrant</th><th>Since</th></tr></thead><tbody>
      ${list.map(w => `<tr>
        <td><b>${esc(w.against)}</b></td>
        <td>${w.offence ? `${esc(w.offence)} <span class="chip ${w.gravity === 'Capital' ? 'bad' : w.gravity === 'Grave' ? 'warn' : ''}">${esc(w.gravity)}</span><br>` : ''}${small(esc(w.reason))}</td>
        <td>${esc(w.hold) || '<span class="dash">—</span>'}</td>
        <td>${esc(w.no)}${w.caseNo ? `<br>${small(esc(w.caseNo))}` : ''}</td>
        <td>${esc(when(w.issuedAt))}${w.status === 'Returned unserved' ? '<br><span class="chip warn">Returned unserved</span>' : ''}</td>
      </tr>`).join('')}
    </tbody></table></div>` : '<p class="lede">No warrant of arrest stands unanswered. The province is quiet.</p>'}
    <p class="hint">A person named here has not been found guilty of anything. A warrant requires them to come and answer, no more.</p>
  </section>`;
}

function verifyPage(u, code, result) {
  return `${jusNav('verify', u)}
  <section class="signwrap">
    <h2>Verify a Paper</h2>
    <p class="lede">Every warrant, judgment, order and receipt this Ministry gives out carries a check-number. Give that number here and you will be told whether the paper is genuine and what standing it has.</p>
    <form class="search-box" method="get" action="/justice/verify">
      <input type="search" name="code" value="${esc(code || '')}" placeholder="e.g. K6D-PQR" aria-label="Check-number" required maxlength="12">
      <button class="btn" type="submit">Check it</button>
    </form>
    ${result && result.found ? `<div class="verified">
      <div class="vmark">✓</div>
      <div class="section-label">${esc(result.kind)}</div>
      <p class="lede"><b>${esc(result.no)}</b> — this paper stands upon the rolls of the Ministry of Justice.</p>
      <dl class="meta">${result.rows.filter(Boolean).map(([l, v]) => `<dt>${esc(l)}</dt><dd>${esc(String(v))}</dd>`).join('')}</dl>
      ${result.sealed ? '<p class="hint">This matter is sealed by order of the bench. Nothing further may be told of it here.</p>' : ''}
      ${result.inForce ? '' : '<p class="hint">Note the standing above. A paper upon the rolls is not always still in force.</p>'}
    </div>` : result ? `<div class="notfound">
      <div class="vmark">✗</div>
      <p class="lede">No paper of this Ministry answers to <b>${esc(result.code || code)}</b>.</p>
      <p class="hint">Check the number again. If it is right as written, the paper did not come from this Ministry, and you should bring it to a Court Clerk.</p>
    </div>` : ''}
  </section>`;
}

function reportPage(u, r, from, to, byName) {
  const money = n => Number(n || 0).toLocaleString('en-US');
  const stat = (n, t) => `<div class="warstat"><div class="n">${esc(String(n))}</div><div class="t">${esc(t)}</div></div>`;
  const brk = o => { const k = Object.keys(o || {}); return k.length ? `<ul class="plainlist">${k.map(x => `<li>${esc(x)} — <b>${esc(String(o[x]))}</b></li>`).join('')}</ul>` : '<p class="hint">None in this span.</p>'; };
  return `${jusNav('report', u)}
  <section>
    <h2>The Report of the Ministry</h2>
    <p class="lede">An account of the bench's work, to be rendered to the Governor. Set a span or leave it empty for the whole of the rolls.</p>
    <form class="warform" method="get" action="/justice/report">
      <div class="wargrid">
        <label class="csf"><span>From</span><input type="date" name="from" value="${esc(from || '')}"></label>
        <label class="csf"><span>To</span><input type="date" name="to" value="${esc(to || '')}"></label>
      </div>
      <div class="linkrow"><button class="btn" type="submit">Render the account</button>
        <a class="btn ghost" href="/justice/report/doc?from=${encodeURIComponent(from || '')}&to=${encodeURIComponent(to || '')}" target="_blank" rel="noopener">The report to give out ↗</a></div>
    </form>

    <div class="section-label">Matters upon the Bench</div>
    <div class="warstats">${stat(r.opened, 'Opened')}${stat(r.judged, 'Judged')}${stat(r.pending, 'Pending')}${stat(r.sittings, 'Sittings set')}${stat(r.sealed, 'Sealed')}</div>
    <div class="two">
      <div><div class="section-label">By kind</div>${brk(r.byKind)}</div>
      <div><div class="section-label">Findings given</div>${brk(r.findings)}</div>
    </div>

    <div class="section-label">Laid by the Public</div>
    <div class="warstats">${stat(r.mattersLaid, 'Laid')}${stat(r.mattersWaiting, 'Awaiting an answer')}</div>

    <div class="section-label">Warrants and Custody</div>
    <div class="warstats">${stat(r.warrants, 'Warrants issued')}${stat(r.warrantsOpen, 'Still running')}${stat(r.committed, 'Committed')}${stat(r.held, 'Held now')}</div>
    <div class="section-label">Warrants by kind</div>${brk(r.warrantKinds)}

    <div class="section-label">Inquisitions and Exhibits</div>
    <div class="warstats">${stat(r.inquisitions, 'Inquisitions')}${stat(r.inquisitionsOpen, 'Still running')}${stat(r.exhibits, 'Things taken')}${stat(r.exhibitsHeld, 'Still held')}</div>

    <div class="section-label">Sentence and Satisfaction</div>
    <div class="warstats">${stat(r.sentences, 'Sentences')}${stat(r.sentencesCarried, 'Carried out')}${stat(r.sentencesOutstanding, 'Outstanding')}</div>
    <div class="warstats">${stat(money(r.dues.ordered), 'Septims ordered')}${stat(money(r.dues.rendered), 'Rendered')}${stat(money(r.dues.outstanding), 'Outstanding')}</div>
  </section>`;
}

module.exports = { exhibitsPage, duesPage, sentencesPage, courtsPage, wantedPage, verifyPage, reportPage, witnessSummonsDoc, bailDoc, exhibitDoc, dueDoc, sentenceDoc, reportDoc, warrantDoc, judgmentDoc, summonsDoc, custodyDoc, matterDoc, custodyPage, inquisitionsPage, inquisitionPage, partiesPage, offencesPage, warrantsPage, calendarPage, jusNav, hall, principles, judgmentsPage, layBox, layDone, layStatus, docket, casePage, mattersPage, officersPage, entrance };
