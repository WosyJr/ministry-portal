const { esc, hidden } = require('./views');

function owedLevel(at) {
  if (!at) return 0;
  const t = Date.parse(at);
  if (!t) return 0;
  const days = (Date.now() - t) / 86400000;
  return days < 14 ? 0 : days < 30 ? 1 : days < 60 ? 2 : days < 120 ? 3 : 4;
}

const J = require('./justice');
const Ranks = require('./ranks');
const { OFFICE, JUDICIAL, PRINCIPLES } = require('./justicecontent');
const JC = require('./justicecontent');

const small = t => `<span class="small">${t}</span>`;
const when = iso => (iso ? new Date(iso).toISOString().slice(0, 10) : '');
const pre = t => `<p class="pre">${esc(t)}</p>`;

const partyList = () => `<datalist id="jparties">${J.partyNames().map(n => `<option value="${esc(n)}"></option>`).join('')}</datalist>`;

const TABS = [
  ['/justice', 'The Ministry', 'hall', true],
  ['/justice/principles', 'How Justice Is Done', 'principles', true],
  ['/justice/standards', 'The Inquisitors\u2019 Standards', 'standards', true],
  ['/justice/judgments', 'Register of Judgments', 'judgments', true],
  ['/justice/offences', 'Book of Offences', 'offences', true],
  ['/justice/calendar', 'Calendar', 'calendar', true],
  ['/justice/wanted', 'Persons Sought', 'wanted', true],
  ['/justice/verify', 'Verify a Paper', 'verify', true],
  ['/justice/courts', 'Courts of the Holds', 'courts', true],
  ['/justice/lay', 'Lay a Matter', 'lay', true],
  ['/justice/complaints/lay', 'Complain of an Inquisitor', 'complainlay', true],
  ['/justice/desk', 'My Desk', 'desk', false],
  ['/justice/cases', 'The Bench', 'cases', false],
  ['/justice/warrants', 'Warrants', 'warrants', false],
  ['/justice/inquisitions', 'Inquisitions', 'inquisitions', false],
  ['/justice/custody', 'Custody', 'custody', false],
  ['/justice/exhibits', 'Exhibits', 'exhibits', false],
  ['/justice/dues', 'Fines & Restitution', 'dues', false],
  ['/justice/sentences', 'Sentences', 'sentences', false],
  ['/justice/parties', 'Parties', 'parties', false],
  ['/justice/matters', 'Matters Laid', 'matters', false],
  ['/justice/complaints', 'Complaints of Inquisitors', 'complaints', false],
  ['/justice/report', 'The Report', 'report', false],
  ['/justice/officers', 'Officers', 'officers', false],
  ['/staff/guide', 'What You May Do', 'guide', false]
];

function jusNav(active, u) {
  const inside = !!(u && (u.all || Ranks.can(u, 'jusdesk') || Ranks.can(u, 'juscases')));
  const admin = Ranks.mayAdminBranch(u, 'justice');
  const link = ([h, l, k]) => `<a href="${h}"${k === active ? ' class="on" aria-current="page"' : ''}>${esc(l)}</a>`;
  const pub = TABS.filter(t => t[3]);
  const inquire = !!(u && (u.all || Ranks.can(u, 'jusinquire')));
  const staff = TABS.filter(t => !t[3] && (t[2] === 'officers' ? admin : t[2] === 'desk' ? inquire : t[2] === 'guide' ? !!u : inside));
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
        <div class="field stackfield"><label class="l" for="j-body">Set down the matter <span class="req">*</span></label><textarea id="j-body" name="body" rows="9" required>${esc(v.body || '')}</textarea></div>
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
        <label class="csf csf-wide" style="margin-top:10px"><span>The matter</span><textarea name="summary" rows="5"></textarea></label>
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
          <label class="csf csf-wide" style="margin-top:10px"><span>Note</span><textarea name="pleaNote" rows="2">${esc(c.pleaNote || '')}</textarea></label>
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
          <label class="csf csf-wide" style="margin-top:10px"><span>The matter</span><textarea name="summary" rows="4">${esc(c.summary)}</textarea></label>
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
          <label class="csf csf-wide" style="margin-top:10px"><span>Note</span><textarea name="note" rows="2"></textarea></label>
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
          <label class="csf csf-wide" style="margin-top:10px"><span>Note</span><textarea name="note" rows="2"></textarea></label>
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
      <label class="csf csf-wide" style="margin-top:10px"><span>The paper</span><textarea name="body" rows="5"></textarea></label>
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
        <label class="csf csf-wide" style="margin-top:10px"><span>Reasons <span class="req">*</span></span><textarea name="reasons" rows="6" required></textarea></label>
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
      <label class="csf csf-wide"><span>The answer of the Ministry</span><textarea name="reply" rows="3">${esc(m.reply)}</textarea></label>
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
        <label class="csf csf-wide" style="margin-top:10px"><span>What the bench may order</span><textarea name="penalty" rows="2">${esc(v.penalty || '')}</textarea></label>
        <label class="csf csf-wide" style="margin-top:10px"><span>Note</span><textarea name="note" rows="2">${esc(v.note || '')}</textarea></label>
        <div class="linkrow"><button class="btn" type="submit">${editing ? 'Save it' : 'Enter it in the Book'}</button>${editing ? '<a class="btn ghost" href="/justice/offences">Cancel</a>' : ''}</div>
      </form>
    </details>` : ''}
  </section>`;
}

function warrantsPage(u, list, csrf, mayIssue, cases, officers, notices) {
  const open = list.filter(w => w.status === 'Issued');
  const done = list.filter(w => w.status !== 'Issued');
  const all = notices || [];
  const noticeOf = w => all.find(n => n.warrantId === w.id && n.status !== 'Withdrawn') || null;
  const noticeBlock = w => {
    const n = noticeOf(w);
    if (n) return `<div class="noticebox">
      <div class="nbhead"><span class="nbno">${esc(n.no)}</span><span class="chip ${J.NOTICE_CLASS[n.status] || ''}">${esc(n.status)}</span>${n.bounty ? `<span class="nbbounty">${esc(Number(n.bounty).toLocaleString('en-US'))} septims</span>` : ''}</div>
      <p class="small">Wanted for ${esc(n.crime)} · ${esc(n.condition)} · delivered to ${esc(n.deliverTo)}</p>
      <div class="linkrow"><a class="btn small" href="/justice/notices/${esc(n.id)}/doc" target="_blank" rel="noopener">The notice to post up ↗</a></div>
      ${mayIssue ? `<form method="post" action="/justice/notices/${esc(n.id)}" class="stack">${hidden(csrf)}
        <input type="hidden" name="back" value="/justice/warrants">
        <div class="wargrid">
          <label class="csf"><span>Standing of the notice</span><select name="status">${J.NOTICE_STATUS.map(x => `<option value="${esc(x)}"${x === n.status ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
          <label class="csf"><span>Note upon it</span><input type="text" name="note" maxlength="300" value="${esc(n.note)}" placeholder="Taken at Pale Pass"></label>
        </div>
        <div class="linkrow"><button class="btn small" type="submit">Set it down</button></div>
      </form>
      <form method="post" action="/justice/notices/${esc(n.id)}/remove" class="inline">${hidden(csrf)}<input type="hidden" name="back" value="/justice/warrants"><button class="btn ghost small" type="submit">Take it down</button></form>` : ''}
    </div>`;
    if (!mayIssue || w.status !== 'Issued') return '';
    return `<details class="noticewrap">
      <summary>Raise an Imperial Notice upon this warrant</summary>
      <p class="hint">Only warrants that cannot be served in the ordinary way need a notice. Posting one offers a bounty in the name of the Empire.</p>
      <form method="post" action="/justice/warrants/${esc(w.id)}/notice" class="stack">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Wanted for <span class="req">*</span></span><input type="text" name="crime" required maxlength="160" placeholder="High treason"></label>
          <label class="csf"><span>Bounty in septims</span><input type="number" name="bounty" min="0" step="50" value="0"></label>
          <label class="csf"><span>Condition</span><select name="condition">${J.NOTICE_CONDITION.map(x => `<option value="${esc(x)}"${x === 'Alive' ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
          <label class="csf"><span>Delivered to</span><input type="text" name="deliverTo" maxlength="140" value="${esc(w.toWhom) || 'The Provosts of the Imperial Legion'}"></label>
          <label class="csf"><span>Last seen</span><input type="text" name="lastSeen" maxlength="160" placeholder="The Jerall road, below Bruma"></label>
          <label class="csf"><span>Resisted the warrant</span><select name="refused"><option value="1" selected>Yes — refused to answer</option><option value="">No — cannot be found</option></select></label>
        </div>
        <label class="csf csf-wide" style="margin-top:10px"><span>Ground of the notice <span class="req">*</span></span><textarea name="ground" rows="4" required placeholder="What the notice must say to those who read it.">${esc(w.reason)}</textarea></label>
        <div class="linkrow"><button class="btn" type="submit">Post the notice</button></div>
      </form>
    </details>`;
  };
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
      <label class="csf csf-wide"><span>Return upon the warrant</span><textarea name="note" rows="2">${esc(w.note)}</textarea></label>
      <div class="linkrow"><button class="btn small" type="submit">Set it down</button></div>
    </form>
    <form method="post" action="/justice/warrants/${esc(w.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form>` : ''}
    ${noticeBlock(w)}
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
        <label class="csf csf-wide" style="margin-top:10px"><span>Ground of the warrant <span class="req">*</span></span><textarea name="reason" rows="4" required></textarea></label>
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
          <label class="csf"><span>Terms of the bail</span><textarea name="bailTerms" rows="2">${esc(x.bailTerms || '')}</textarea></label>
          <label class="csf"><span>Note</span><textarea name="note" rows="2">${esc(x.note)}</textarea></label>
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
        <label class="csf csf-wide" style="margin-top:10px"><span>Note</span><textarea name="note" rows="2"></textarea></label>
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
    <p class="small">Opened by ${esc(i.byName)}${i.into ? ' \u00b7 into ' + esc(i.into) : ''} \u00b7 ${(i.lines || []).length} line${(i.lines || []).length === 1 ? '' : 's'} of inquiry, ${(i.statements || []).length} statement${(i.statements || []).length === 1 ? '' : 's'}${J.inqSeesAll(u) ? (i.open ? ' \u00b7 <span class="chip warn">Open to every officer</span>' : ' \u00b7 <span class="chip">' + J.inqAssigned(i).length + ' assigned</span>') : ''}</p>
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
        <label class="csf csf-wide" style="margin-top:10px"><span>Scope of the inquisition</span><textarea name="scope" rows="3"></textarea></label>
        <div class="linkrow"><button class="btn" type="submit">Open it</button></div>
      </form></details>` : ''}
  </section>`;
}

// The writ that sends an Inquisitor out. Until it is issued the inquisition is
// the Ministry's own business; once issued, the Inquisitor carries a paper that
// says exactly how far they may go, and what they may not do.

// The Standards themselves, open to anyone. A subject who is told an Inquisitor
// may do a thing should be able to read whether that is so.
function standardsPage(u) {
  return `${jusNav('standards', u)}
  <section>
    <h2>The Inquisitors\u2019 Standards</h2>
    <p class="lede">Standards for the Operation and Limits of Authority of every Imperial Inquisitor of this Ministry, set out by the Governor of the Province. They bind the Inquisitor, and they are published so that any subject, any steward and any court may read what an Inquisitor may and may not do.</p>
    <p class="notice">${esc(JC.STANDARDS_PREAMBLE)}</p>
    <p class="hint">Where a Commission conflicts with these Standards, the Standards govern. An Inquisitor who acts materially outside lawful authority may be removed, suspended, dismissed, disciplined or put to criminal process (Article 28).</p>

    <div class="section-label">Contents</div>
    <ul class="plainlist">${JC.STANDARDS.map(sec => `<li><a href="#s${esc(sec.n)}"><b>Section ${esc(sec.n)}</b> \u2014 ${esc(sec.h)}</a> ${small('Articles ' + sec.arts[0][0] + (sec.arts.length > 1 ? '\u2013' + sec.arts[sec.arts.length - 1][0] : ''))}</li>`).join('')}</ul>

    ${JC.STANDARDS.map(sec => `<div class="section-label" id="s${esc(sec.n)}">Section ${esc(sec.n)} \u2014 ${esc(sec.h)}</div>
      ${sec.arts.map(([n, h, t]) => `<article class="reqcard">
        <div class="no">Article ${esc(n)}</div>
        <h3>${esc(h)}</h3>
        <p>${esc(t)}</p>
      </article>`).join('')}`).join('')}

    <div class="docseal" style="margin-top:26px">
      <div class="docseal-line">Set out by</div>
      <div class="docseal-name">${esc(JC.STANDARDS_SEAL)}</div>
    </div>
  </section>`;
}

function commissionPanel(i, csrf, mayEdit, roster) {
  const c = i.commission;
  const inqs = (roster && roster.inquisitors) || [];
  const offs = (roster && roster.officers) || [];
  const styled = o => (o.rankName && o.rankName !== 'Unranked' ? o.rankName + ' ' : '') + o.name;
  const REPORT_TO = ['The Provincial Minister of State for Justice', 'The Provincial Governor', 'The Imperial Bench'];
  const chips = inqs.length
    ? `<div class="linkrow namepick" style="margin:6px 0 0">${small('Add an Inquisitor:')} ${inqs.map(o => `<button type="button" class="btn ghost small" data-for="inquisitors" data-add="${esc(styled(o))}">${esc(o.name)}</button>`).join(' ')}</div>`
    : '';
  const lists = `<datalist id="inqnames">${inqs.map(o => `<option value="${esc(styled(o))}"></option>`).join('')}</datalist>
    <datalist id="offnames">${offs.map(o => `<option value="${esc(styled(o))}"></option>`).join('')}</datalist>
    <datalist id="reportto">${REPORT_TO.concat(offs.map(styled)).map(x => `<option value="${esc(x)}"></option>`).join('')}</datalist>
    <script>(function(){if(window.__namepick)return;window.__namepick=1;
    document.addEventListener('click',function(e){
      var b=e.target.closest&&e.target.closest('[data-add]');if(!b)return;
      var f=b.closest('form');if(!f)return;
      var el=f.querySelector('[name="'+b.getAttribute('data-for')+'"]');if(!el)return;
      var add=b.getAttribute('data-add');
      var have=el.value.split(',').map(function(s){return s.trim();}).filter(Boolean);
      var at=have.indexOf(add);
      if(at>=0){have.splice(at,1);}else{have.push(add);}
      el.value=have.join(', ');
      b.classList.toggle('on',at<0);
      el.focus();
    });})();</script>`;
  const form = (cur, open) => `<details class="addwrap"${open ? ' open' : ''}>
    <summary>${cur ? 'Amend the commission' : 'Commission an Inquisitor'}</summary>
    <form class="warform" method="post" action="/justice/inquisitions/${esc(i.id)}/commission">${hidden(csrf)}
      <label class="csf csf-wide"><span>Allegation(s) or matter to be examined <span class="req">*</span></span><textarea name="allegations" rows="3" required placeholder="The charges by their formal names, and any other complaint that may become a charge upon further inquiry.">${esc((cur && cur.allegations) || '')}</textarea></label>
      <label class="csf csf-wide" style="margin-top:8px"><span>The persons, institutions, territory and events within the scope</span><textarea name="cscope" rows="3">${esc((cur && cur.scope) || i.scope || '')}</textarea></label>
      <fieldset class="permset" style="margin-top:10px"><legend>Ground of Imperial jurisdiction \u2014 Article 7</legend>
        <p class="hint" style="margin:0 0 6px">At least one must answer. <b>Article 8:</b> political inconvenience, dissatisfaction with a Jarl\u2019s decision, or the Ministry\u2019s belief that it would investigate better are <i>not</i> grounds. Where the ground is doubtful, refer the question to the Minister before any coercive measure.</p>
        ${J.JURISDICTION.map(([id, h, t]) => `<label class="checkline"><input type="checkbox" name="grounds" value="${esc(id)}"${cur && (cur.grounds || []).includes(id) ? ' checked' : ''}> <b>${esc(h)}</b><br>${small(esc(t))}</label>`).join('')}
      </fieldset>
      <label class="csf csf-wide" style="margin-top:8px"><span>Summary basis for Imperial jurisdiction</span><textarea name="jurisdiction" rows="2" placeholder="Say in a line how this matter answers to the ground ticked above.">${esc((cur && cur.jurisdiction) || '')}</textarea></label>
      <fieldset class="permset" style="margin-top:10px"><legend>Extraordinary powers conferred \u2014 Article 10</legend>
        <p class="hint" style="margin:0 0 6px">These are the compulsory measures. Each requires specific authority, and an Inquisitor shall not presume any of them from the office title. Everything left unticked is written upon the writ as expressly denied.</p>
        ${J.POWERS.map(x => `<label class="checkline"><input type="checkbox" name="conferred" value="${esc(x)}"${cur && (cur.conferred || []).includes(x) ? ' checked' : ''}> ${esc(x)}</label>`).join('')}
      </fieldset>
      <details class="inlinedit" style="margin-top:8px"><summary class="btn ghost small">What the Commission carries without ticking \u2014 Article 9</summary>
        <ul class="plainlist">${J.ORDINARY_POWERS.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      </details>
      <label class="csf csf-wide" style="margin-top:8px"><span>Anything further expressly denied</span><textarea name="otherDenied" rows="2">${esc((cur && cur.otherDenied) || '')}</textarea></label>
      <div class="wargrid" style="margin-top:8px">
        <label class="csf csf-wide"><span>Rank(s) and name(s) of the assigned Inquisitor(s) <span class="req">*</span></span><input type="text" name="inquisitors" maxlength="300" required list="inqnames" autocomplete="off" value="${esc((cur && cur.inquisitors) || '')}">${chips}<span class="csfnote">Whoever you name here is given sight of this inquisition the moment the writ is issued \u2014 you need not set it a second time below. Use the buttons so the name matches the roll exactly.</span></label>
        <label class="csf"><span>Issued by</span><input type="text" name="issuedBy" maxlength="140" list="offnames" autocomplete="off" value="${esc((cur && cur.issuedBy) || '')}"></label>
        <label class="csf"><span>Title of the issuing authority</span><input type="text" name="issuingTitle" maxlength="160" value="${esc((cur && cur.issuingTitle) || 'Provincial Minister of State for Justice')}"></label>
        <label class="csf"><span>Entered on</span><input type="text" name="issuedOn" maxlength="80" placeholder="e.g. 17th of Hearthfire, 4E 226" value="${esc((cur && cur.issuedOn) || '')}"></label>
        <label class="csf"><span>Findings reported to <span class="req">*</span></span><input type="text" name="reportTo" maxlength="160" list="reportto" autocomplete="off" value="${esc((cur && cur.reportTo) || 'The Provincial Minister of State for Justice')}"></label>
      </div>
      ${lists}
      <fieldset class="permset" style="margin-top:10px"><legend>A reigning Jarl or Lord-Regent \u2014 Article 24</legend>
        <p class="hint" style="margin:0 0 6px">The office is not the person: an inquiry into the administration of a Hold is not an inquiry into the ruler. But no <b>extraordinary</b> investigation into the personal conduct of a reigning Jarl or Lord-Regent may be begun without the prior authorisation of the Minister or the Governor, and the writ must say who gave it.</p>
        <label class="checkline"><input type="checkbox" name="touchesRuler" value="1"${cur && cur.touchesRuler ? ' checked' : ''}> This touches the personal conduct of a reigning Jarl or Lord-Regent</label>
        <label class="csf csf-wide" style="margin-top:8px"><span>Authorised beforehand by</span><input type="text" name="rulerAuthBy" maxlength="160" placeholder="The Minister or the Governor, by name" value="${esc((cur && cur.rulerAuthBy) || '')}"></label>
      </fieldset>
      <div class="linkrow"><button class="btn" type="submit">${cur ? 'Set it down' : 'Issue the commission'}</button></div>
    </form></details>`;

  if (!c) return `<div class="section-label">Commission</div>
    <p class="hint">No Inquisitor has been commissioned upon this inquisition. Until one is, nobody carries authority to go out upon it.</p>
    ${mayEdit ? form(null, false) : ''}`;

  const powers = list => list.length ? `<ul class="plainlist">${list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="hint">None.</p>';
  return `<div class="section-label">Commission</div>
  <article class="reqcard">
    <div class="no">${esc(c.no)} \u00b7 ${esc(when(c.at))} <span class="chip ${J.COMMISSION_CLASS[c.state || (c.revoked ? 'Terminated' : 'In force')] || ''}">${esc(c.state || (c.revoked ? 'Terminated' : 'In force'))}</span></div>
    <h3>${esc(c.inquisitors)}</h3>
    <p class="small">Issued by ${esc(c.issuedBy)}${c.issuingTitle ? ', ' + esc(c.issuingTitle) : ''}${c.issuedOn ? ' \u00b7 entered on ' + esc(c.issuedOn) : ''}${c.amendedAt ? ' \u00b7 amended ' + esc(when(c.amendedAt)) : ''}</p>
    <div class="section-label">Alleged</div>${pre(c.allegations)}
    <div class="section-label">Ground of Imperial jurisdiction</div>
    ${(c.grounds || []).length ? `<ul class="plainlist">${c.grounds.map(g => { const j = J.JURISDICTION_BY_ID[g]; return j ? `<li><b>${esc(j[1])}</b><br>${small(esc(j[2]))}</li>` : ''; }).join('')}</ul>` : '<p class="hint">None was named.</p>'}
    ${c.jurisdiction ? pre(c.jurisdiction) : ''}
    <p class="small">Findings reported to <b>${esc(c.reportTo || 'The Minister')}</b>.</p>
    ${c.touchesRuler ? `<p class="small"><b>Article 24.</b> This touches the personal conduct of a reigning Jarl or Lord-Regent. Authorised beforehand by ${esc(c.rulerAuthBy || 'nobody named')}.</p>` : ''}
    <div class="two">
      <div><div class="section-label">Powers conferred</div>${powers(c.conferred || [])}</div>
      <div><div class="section-label">Powers denied</div>${powers(c.denied || [])}${c.otherDenied ? pre(c.otherDenied) : ''}</div>
    </div>
    ${c.revoked && c.revokedNote ? `<div class="section-label">Upon the change of standing</div>${pre(c.revokedNote)}${small('Set by ' + esc(c.revokedBy || '') + (c.revokedAt ? ' \u00b7 ' + esc(when(c.revokedAt)) : ''))}` : ''}
    <div class="linkrow">
      <a class="btn ghost small" href="/justice/inquisitions/${esc(i.id)}/commission/doc" target="_blank" rel="noopener">The writ to give out \u2197</a>
      ${mayEdit ? `<details class="inlinedit"><summary class="btn ghost small">Set its standing</summary>
        <form method="post" action="/justice/inquisitions/${esc(i.id)}/commission/state" class="stack">${hidden(csrf)}
          <p class="hint" style="margin:0 0 6px">Article 3: the Minister may modify, restrict, suspend or terminate a Commission at any time. These are different things, so the writ says which. Extraordinary power ceases upon suspension or termination; ordinary powers under Article 9 fall with it.</p>
          <label class="csf"><span>Standing</span><select name="state">${J.COMMISSION_STATES.map(x => `<option value="${esc(x)}"${(c.state || (c.revoked ? 'Terminated' : 'In force')) === x ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
          <label class="csf csf-wide"><span>Upon what ground</span><textarea name="note" rows="2">${esc(c.revokedNote || '')}</textarea></label>
          <div class="linkrow"><button class="btn small" type="submit">Set it down</button></div>
        </form></details>` : ''}
    </div>
  </article>
  ${mayEdit ? form(c, false) : ''}`;
}

// Article 26. Twelve heads, asked for by name. The evidence for and the evidence
// against sit in separate boxes because Article 12 forbids leaving out what
// favours the person investigated, and a single box hides that.
const REPORT_HEADS = [
  ['under', 'The Commission or authority it proceeded under', 1, false],
  ['allegations', 'The allegations investigated', 2, false],
  ['jurisdiction', 'The jurisdictional ground for Imperial action', 2, false],
  ['course', 'Summary of the course of the investigation', 4, false],
  ['facts', 'Facts determined by the investigation', 5, true],
  ['disputed', 'Disputed facts material to the case', 3, false],
  ['evidenceFor', 'Evidence material in support of the allegations', 4, false],
  ['evidenceAgainst', 'Evidence material against the allegations', 4, true],
  ['credibility', 'Assessment of credibility, where needed', 3, false],
  ['jurisdictionQuestion', 'Any relevant question of jurisdiction', 2, false],
  ['conclusions', 'The conclusions of the Inquisitor', 4, false]
];

// Articles 11, 3, 19-20 and 25: what was told to the Hold, what the
// investigation was widened to, what was done before authority could be had,
// and who is said to have obstructed it.
function conductPanel(i, csrf, mayEdit) {
  const c = i.commission;
  const notices = (c && c.notices) || [];
  const exts = (c && c.extensions) || [];
  const emg = i.emergencies || [];
  const obs = i.obstructions || [];
  const help = i.assistance || [];
  const mayHold = c && (c.conferred || []).some(x => x === 'Detention' || x === 'Arrest');

  const noticeForm = `<details class="addwrap"><summary>Enter notice to the Hold \u2014 Article 11</summary>
    <form class="warform" method="post" action="/justice/inquisitions/${esc(i.id)}/notice">${hidden(csrf)}
      <p class="hint">Where secrecy or urgency does not forbid it, the Jarl, Lord-Regent, Steward or court is told of an Imperial investigation within their Hold. Cooperation is sought before compulsion.</p>
      <label class="checkline"><input type="checkbox" name="told" value="1"> The Hold was informed</label>
      <div class="wargrid" style="margin-top:8px">
        <label class="csf"><span>Whom was told</span><input type="text" name="toWhom" maxlength="160" placeholder="e.g. Steward Raerek of the Reach"></label>
        <label class="csf"><span>When</span><input type="text" name="when" maxlength="80"></label>
      </div>
      <fieldset class="permset" style="margin-top:10px"><legend>If they were not told, upon which ground</legend>
        <p class="hint" style="margin:0 0 6px">These four, and nothing else, may be withheld.</p>
        ${J.WITHHOLD_GROUNDS.map(x => `<label class="checkline"><input type="checkbox" name="withheld" value="${esc(x)}"> ${esc(x)}</label>`).join('')}
      </fieldset>
      ${c && c.touchesRuler ? `<label class="csf csf-wide" style="margin-top:8px"><span>The subject is a ruler or their court, so withholding needs the Minister\u2019s authority <span class="req">*</span></span><input type="text" name="ministerLeave" maxlength="160" placeholder="Who authorised it"></label>` : ''}
      <label class="csf csf-wide" style="margin-top:8px"><span>Note</span><textarea name="note" rows="2"></textarea></label>
      <div class="linkrow"><button class="btn small" type="submit">Enter it</button></div>
    </form></details>`;

  const extForm = `<details class="addwrap"><summary>Extend the subject matter \u2014 Article 3</summary>
    <form class="warform" method="post" action="/justice/inquisitions/${esc(i.id)}/extend">${hidden(csrf)}
      <p class="hint">The subject matter is not widened without authority unless new facts carry it upon one of three grounds, and any extension is reported to the Minister at the earliest opportunity.</p>
      <label class="csf csf-wide"><span>What it is extended to <span class="req">*</span></span><textarea name="what" rows="2" required></textarea></label>
      <label class="csf" style="margin-top:8px"><span>Upon which ground</span><select name="ground">${J.EXTENSION_GROUNDS.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select></label>
      <label class="checkline" style="margin-top:8px"><input type="checkbox" name="reported" value="1"> Reported to the Minister</label>
      <label class="csf" style="margin-top:8px"><span>Reported to</span><input type="text" name="reportedTo" maxlength="160"></label>
      <div class="linkrow"><button class="btn small" type="submit">Set it down</button></div>
    </form></details>`;

  const emgForm = `<details class="addwrap"><summary>Enter an emergency measure \u2014 Articles 19 and 20</summary>
    <form class="warform" method="post" action="/justice/inquisitions/${esc(i.id)}/emergency">${hidden(csrf)}
      <p class="hint">Emergency authority is read narrowly. What is done must be necessary, proportional to the immediate danger, temporary, and reported to the Minister as soon as may be. An emergency shall not be created or prolonged to avoid the ordinary requirements of jurisdiction.</p>
      <fieldset class="permset"><legend>The danger</legend>
        ${J.EMERGENCY_GROUNDS.map(x => `<label class="checkline"><input type="checkbox" name="danger" value="${esc(x)}"> ${esc(x)}</label>`).join('')}
      </fieldset>
      <label class="csf csf-wide" style="margin-top:8px"><span>What was done <span class="req">*</span></span><textarea name="measure" rows="2" required></textarea></label>
      <label class="csf csf-wide" style="margin-top:8px"><span>Why it was necessary</span><textarea name="necessary" rows="2"></textarea></label>
      <label class="csf csf-wide" style="margin-top:8px"><span>Why it was proportional</span><textarea name="proportional" rows="2"></textarea></label>
      <div class="wargrid" style="margin-top:8px">
        <label class="csf"><span>Temporary until <span class="req">*</span></span><input type="text" name="until" maxlength="200" required placeholder="e.g. the Minister answers, and not beyond three days"></label>
        <label class="csf"><span>Reported when</span><input type="text" name="reportedAt" maxlength="80"></label>
      </div>
      <label class="checkline" style="margin-top:8px"><input type="checkbox" name="reported" value="1"> Reported to the Minister</label>
      <div class="linkrow"><button class="btn small" type="submit">Enter it</button></div>
    </form></details>`;

  const helpForm = `<details class="addwrap"><summary>Ask the help of another authority \u2014 Articles 21 to 23</summary>
    <form class="warform" method="post" action="/justice/inquisitions/${esc(i.id)}/assist">${hidden(csrf)}
      <p class="hint">An Inquisitor commands no Legion unit and speaks for no other department. Assistance is <b>requested</b>, upon one of the grounds below, and command of another body\u2019s people stays in their own chain. Where another department holds primary jurisdiction, the Inquisitor cooperates or joins with it and does not claim to act on its behalf.</p>
      <div class="wargrid">
        <label class="csf"><span>Which authority <span class="req">*</span></span><select name="who">${J.AUTHORITIES.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select></label>
        <label class="csf"><span>Authorised by</span><input type="text" name="authorisedBy" maxlength="160" placeholder="Where the Minister or the Governor gave leave"></label>
      </div>
      <label class="csf csf-wide" style="margin-top:8px"><span>Upon which ground <span class="req">*</span></span><select name="ground">${J.ASSIST_GROUNDS.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select></label>
      <label class="csf csf-wide" style="margin-top:8px"><span>What was asked of them <span class="req">*</span></span><textarea name="what" rows="2" required></textarea></label>
      <label class="csf csf-wide" style="margin-top:8px"><span>What they answered</span><textarea name="answer" rows="2"></textarea></label>
      <label class="checkline" style="margin-top:8px"><input type="checkbox" name="primary" value="1"> That authority holds primary jurisdiction here \u2014 Article 22</label>
      <div class="linkrow"><button class="btn small" type="submit">Set it down</button></div>
    </form></details>`;

  const obsForm = `<details class="addwrap"><summary>Charge obstruction \u2014 Article 25</summary>
    <form class="warform" method="post" action="/justice/inquisitions/${esc(i.id)}/obstruction">${hidden(csrf)}
      <p class="hint">Refusal, disagreement, a challenge to jurisdiction or protest is <b>not</b> obstruction. A ruler who raises a good-faith challenge is not an insurgent because the challenge fails. All three below must be shown.</p>
      <label class="csf"><span>Who <span class="req">*</span></span><input type="text" name="who" maxlength="140" required></label>
      <fieldset class="permset" style="margin-top:8px"><legend>Shown</legend>
        ${J.OBSTRUCTION_TESTS.map(x => `<label class="checkline"><input type="checkbox" name="shown" value="${esc(x)}"> ${esc(x)}</label>`).join('')}
      </fieldset>
      <label class="csf csf-wide" style="margin-top:8px"><span>What was done</span><textarea name="what" rows="2"></textarea></label>
      <label class="csf" style="margin-top:8px"><span>Referred to</span><input type="text" name="referred" maxlength="160"></label>
      <div class="linkrow"><button class="btn small" type="submit">Set it down</button></div>
    </form></details>`;

  return `<div class="section-label">The Conduct of the Inquisition</div>

  <div class="section-label">Notice to the Hold \u2014 Article 11</div>
  ${notices.length ? `<ul class="plainlist">${notices.map(n => `<li class="lined">${n.told ? `<b>Informed</b>${n.toWhom ? ' \u2014 ' + esc(n.toWhom) : ''}${n.when ? ' on ' + esc(n.when) : ''}` : `<b>Withheld</b> \u2014 ${esc((n.withheld || []).join('; '))}${n.ministerLeave ? ' (authorised by ' + esc(n.ministerLeave) + ')' : ''}`}${n.note ? '<br>' + esc(n.note) : ''} ${small(esc(when(n.at)) + ' \u00b7 ' + esc(n.by))}</li>`).join('')}</ul>` : '<p class="hint">Nothing is set down. Article 11 asks that the Hold be told, unless secrecy or urgency forbids it.</p>'}
  ${mayEdit && i.commission ? noticeForm : ''}

  ${exts.length ? `<div class="section-label">Extensions of the Subject Matter \u2014 Article 3</div>
  <ul class="plainlist">${exts.map(x => `<li class="lined">${esc(x.what)}<br>${small('Upon: ' + esc(x.ground) + (x.reported ? ' \u00b7 reported' + (x.reportedTo ? ' to ' + esc(x.reportedTo) : '') : ' \u00b7 <b>not yet reported</b>'))}</li>`).join('')}</ul>` : ''}
  ${mayEdit && i.commission ? extForm : ''}

  ${emg.length ? `<div class="section-label">Emergency Measures \u2014 Articles 19 and 20</div>
  ${emg.map(e => `<article class="reqcard">
    <div class="no">${esc(when(e.at))} \u00b7 ${esc(e.by)} ${e.reported ? '<span class="chip ok">Reported</span>' : '<span class="chip bad">Not yet reported to the Minister</span>'}</div>
    <p><b>Danger:</b> ${esc((e.danger || []).join('; '))}</p>
    ${pre(e.measure)}
    <p class="small">Temporary until ${esc(e.until)}.${e.necessary ? ' Necessary: ' + esc(e.necessary) : ''}${e.proportional ? ' Proportional: ' + esc(e.proportional) : ''}</p>
  </article>`).join('')}` : ''}
  ${mayEdit ? emgForm : ''}

  ${help.length ? `<div class="section-label">Assistance of Other Authorities \u2014 Articles 21 to 23</div>
  <ul class="plainlist">${help.map(x => `<li class="lined"><b>${esc(x.who)}</b>${x.primary ? ' <span class="chip warn">Holds primary jurisdiction</span>' : ''}<br>${esc(x.what)}<br>${small('Upon: ' + esc(x.ground) + (x.authorisedBy ? ' \u00b7 authorised by ' + esc(x.authorisedBy) : ''))}${x.answer ? '<br>' + small('They answered: ' + esc(x.answer)) : ''}</li>`).join('')}</ul>` : ''}
  ${mayEdit ? helpForm : ''}

  ${mayHold ? `<div class="section-label">Detention and Arrest \u2014 Article 16</div>
  <p class="hint">This Commission confers a power of detention or arrest. There is still no inherent power of imprisonment: it follows only from this writ, a valid Imperial warrant, cooperation with an authority that holds lawful powers of arrest, or the emergency provisions of Articles 19 and 20. Where the offence belongs to the Hold, the arrest is better referred to the Hold. Anybody held is entered upon <a href="/justice/custody">the register of custody</a>, and a warrant upon <a href="/justice/warrants">the register of warrants</a>.</p>` : ''}

  ${obs.length ? `<div class="section-label">Obstruction \u2014 Article 25</div>
  <ul class="plainlist">${obs.map(o => `<li class="lined"><b>${esc(o.who)}</b>${o.what ? '<br>' + esc(o.what) : ''}<br>${small('All three of Article 25 shown' + (o.referred ? ' \u00b7 referred to ' + esc(o.referred) : '') + ' \u00b7 ' + esc(when(o.at)))}</li>`).join('')}</ul>` : ''}
  ${mayEdit ? obsForm : ''}`;
}

function reportPanel(i, csrf, mayEdit) {
  const r = i.report;
  const old = typeof r === 'string' ? r : '';
  const has = r && typeof r === 'object' && r.facts;
  const val = k => esc((r && typeof r === 'object' && r[k]) || '');
  const form = `<details class="addwrap"${has ? '' : ''}>
    <summary>${has ? 'Amend the report' : 'Lay the report \u2014 Article 26'}</summary>
    <form class="warform" method="post" action="/justice/inquisitions/${esc(i.id)}/report">${hidden(csrf)}
      <p class="hint">Article 12: seek the evidence that would disprove a material allegation as well as the evidence that supports it, and do not leave out what favours the person investigated. The two are asked for separately here for that reason.</p>
      ${REPORT_HEADS.map(([k, h, rows, req]) => `<label class="csf csf-wide" style="margin-top:8px"><span>${esc(h)}${req ? ' <span class="req">*</span>' : ''}</span><textarea name="${k}" rows="${rows}"${req ? ' required' : ''}>${val(k)}</textarea></label>`).join('')}
      <fieldset class="permset" style="margin-top:10px"><legend>Recommendations \u2014 Article 14</legend>
        <p class="hint" style="margin:0 0 6px">A recommendation does not itself commence proceedings. The decision to indict rests with the competent Imperial authority.</p>
        ${J.RECOMMENDATIONS.map(x => `<label class="checkline"><input type="checkbox" name="recommendations" value="${esc(x)}"${r && typeof r === 'object' && (r.recommendations || []).includes(x) ? ' checked' : ''}> ${esc(x)}</label>`).join('')}
      </fieldset>
      <div class="linkrow"><button class="btn" type="submit">${has ? 'Set it down' : 'Lay the report'}</button></div>
    </form></details>`;

  if (!has) return `<div class="section-label">The Inquisitorial Report</div>
    ${old ? `<p class="hint">An older report stands upon this inquisition, laid before the Standards were set out here.</p>${pre(old)}` : '<p class="hint">No report has been laid. Article 26 sets out what one must contain.</p>'}
    ${mayEdit ? form : ''}`;

  const part = (k, h) => r[k] ? `<div class="section-label">${esc(h)}</div>${pre(r[k])}` : '';
  const forced = J.coercedStatements(i);
  return `<div class="section-label">The Inquisitorial Report</div>
  <article class="reqcard">
    <div class="no">Laid ${esc(when(r.laidAt))} by ${esc(r.laidBy)}${r.under ? ' \u00b7 under ' + esc(r.under) : ''}</div>
    ${REPORT_HEADS.filter(([k]) => k !== 'under').map(([k, h]) => part(k, h)).join('')}
    ${forced.length ? `<div class="section-label">Statements Obtained Under Compulsion \u2014 Article 15</div>
    <ul class="plainlist">${forced.map(x => `<li class="lined"><b>${esc(x.from)}</b><br>${esc(x.coercion || 'No account of the compulsion was set down.')}</li>`).join('')}</ul>` : ''}
    <div class="section-label">Recommendations</div>
    <ul class="plainlist">${(r.recommendations || []).map(x => `<li>${esc(x)}</li>`).join('') || '<li class="hint">None.</li>'}</ul>
    <div class="linkrow"><a class="btn ghost small" href="/justice/inquisitions/${esc(i.id)}/report/doc" target="_blank" rel="noopener">The report to give out \u2197</a></div>
  </article>
  ${mayEdit ? form : ''}`;
}

// Article 27. What the Minister does upon it.
function reviewPanel(i, csrf, mayEdit) {
  const has = i.report && typeof i.report === 'object' && i.report.facts;
  if (!has) return '';
  const v = i.review;
  return `<div class="section-label">Ministerial Review \u2014 Article 27</div>
  ${v ? `<article class="reqcard">
    <div class="no">${esc(when(v.at))} \u00b7 ${esc(v.by)}</div>
    <h3>${esc(v.outcome)}</h3>
    ${v.note ? pre(v.note) : ''}
    ${v.toGovernor ? `<p class="small"><b>Reported to the Governor.</b>${v.governorNote ? ' ' + esc(v.governorNote) : ''}</p>` : ''}
  </article>` : '<p class="hint">The report awaits the Minister.</p>'}
  ${mayEdit ? `<details class="addwrap"><summary>${v ? 'Amend the review' : 'Answer upon the report'}</summary>
    <form class="warform" method="post" action="/justice/inquisitions/${esc(i.id)}/review">${hidden(csrf)}
      <label class="csf"><span>The Minister</span><select name="outcome">${J.MINISTER_OUTCOMES.map(x => `<option value="${esc(x)}"${v && v.outcome === x ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
      <label class="csf csf-wide" style="margin-top:8px"><span>Upon what ground</span><textarea name="note" rows="3">${esc((v && v.note) || '')}</textarea></label>
      <label class="checkline" style="margin-top:8px"><input type="checkbox" name="toGovernor" value="1"${v && v.toGovernor ? ' checked' : ''}> The Governor granted the Commission; the findings are reported to them</label>
      <label class="csf csf-wide" style="margin-top:8px"><span>What was reported to the Governor</span><textarea name="governorNote" rows="2">${esc((v && v.governorNote) || '')}</textarea></label>
      <div class="linkrow"><button class="btn" type="submit">Set it down</button></div>
    </form></details>` : ''}`;
}

function assignPanel(i, csrf, assign) {
  const held = J.inqAssigned(i);
  const names = (assign || []).filter(o => held.includes(String(o.username).toLowerCase())).map(o => o.name);
  const who = i.open
    ? '<span class="chip warn">Open to every officer</span>'
    : names.length
      ? names.map(n => `<span class="chip">${esc(n)}</span>`).join(' ')
      : '<span class="chip bad">Nobody but the Minister</span>';
  return `<div class="section-label">Who May See This Inquisition</div>
  <p class="hint">An Inquisitor sees an inquisition only where they are assigned to it. Two Inquisitors assigned to the same inquisition see each other’s lines, statements and report upon it, and nothing of any other. The Minister of State for Justice sees all.</p>
  <p class="hint">You will not often need this. Naming an Inquisitor on the Commission below assigns them here by itself. Use this to add someone the writ does not name, to take sight away again, or to throw the whole inquisition open.</p>
  <p style="margin:0 0 10px">${who}</p>
  <details class="addwrap"><summary>Set who may see it</summary>
    <form class="warform" method="post" action="/justice/inquisitions/${esc(i.id)}/assign">${hidden(csrf)}
      <div class="checklist">
        ${(assign || []).map(o => `<label class="checkline"><input type="checkbox" name="assigned" value="${esc(o.username)}"${held.includes(String(o.username).toLowerCase()) ? ' checked' : ''}> ${esc(o.name)} <span class="small">— ${esc(o.rankName)}</span></label>`).join('') || '<p class="hint">No officer holds a rank that may conduct an inquisition.</p>'}
      </div>
      <label class="checkline" style="margin-top:10px"><input type="checkbox" name="openall" value="1"${i.open ? ' checked' : ''}> <b>Open it to every officer of the Ministry</b> — anyone who may see cases reads it, assigned or not</label>
      <div class="linkrow"><button class="btn small" type="submit">Set it</button></div>
    </form></details>`;
}

function deskWants(i) {
  const c = i.commission;
  const state = c && (c.state || (c.revoked ? 'Terminated' : 'In force'));
  const live = i.status !== 'Closed' && i.status !== 'Abandoned';
  const w = [];
  if (live && !c) w.push(['bad', 'No writ is issued. Nothing may be done upon it but an emergency measure under Article 19.']);
  if (live && c && (state === 'Suspended' || state === 'Terminated')) w.push(['bad', `The writ is ${state.toLowerCase()} — extraordinary power under it has ceased.`]);
  if (live && c && state === 'In force' && !(c.notices || []).length) w.push(['warn', 'No notice to the Hold is entered — Article 11.']);
  const unanswered = (i.lines || []).filter(l => !l.answer).length;
  if (unanswered) w.push(['warn', `${unanswered} line${unanswered === 1 ? '' : 's'} of inquiry not yet answered.`]);
  const unreported = (i.emergencies || []).filter(e => !e.reported);
  if (unreported.length) w.push(['bad', `${unreported.length} emergency measure${unreported.length === 1 ? '' : 's'} not yet reported to the Minister — Article 20.`]);
  if (live && i.status === 'Reported' && !i.report) w.push(['warn', 'Set down as Reported, but no report is laid under Article 26.']);
  if (i.report && i.status !== 'Reported' && live) w.push(['warn', 'A report is laid, but the inquisition is not set down as Reported.']);
  return w;
}

function deskPage(u, list) {
  const live = list.filter(i => i.status !== 'Closed' && i.status !== 'Abandoned');
  const done = list.filter(i => !live.includes(i));
  const card = i => {
    const c = i.commission;
    const state = c && (c.state || (c.revoked ? 'Terminated' : 'In force'));
    const wants = deskWants(i);
    const lines = (i.lines || []).length;
    const answered = (i.lines || []).filter(l => l.answer).length;
    return `<article class="reqcard">
      <div class="no">${esc(i.no)}${i.hold ? ' · ' + esc(i.hold) : ''} <span class="chip ${J.INQ_CLASS[i.status] || ''}">${esc(i.status)}</span>${c ? ` <span class="chip ${J.COMMISSION_CLASS[state] || ''}">${esc(state)}</span>` : ' <span class="chip bad">No writ</span>'}</div>
      <h3><a href="/justice/inquisitions/${esc(i.id)}">${esc(i.subject)}</a></h3>
      ${i.into ? `<p class="small">Into ${esc(i.into)}</p>` : ''}
      <p class="small">${answered} of ${lines} line${lines === 1 ? '' : 's'} answered · ${(i.statements || []).length} statement${(i.statements || []).length === 1 ? '' : 's'} · ${i.report ? 'report laid' : 'no report'}</p>
      ${wants.length ? `<ul class="plainlist wants">${wants.map(([k, t]) => `<li class="${k}"><span class="flagmark">⚑</span> ${esc(t)}</li>`).join('')}</ul>` : '<p class="small ok-note">Nothing wants your hand.</p>'}
      <div class="linkrow">
        <a class="btn ghost small" href="/justice/inquisitions/${esc(i.id)}">Open it</a>
        ${c ? `<a class="btn ghost small" href="/justice/inquisitions/${esc(i.id)}/commission/doc" target="_blank" rel="noopener">The writ ↗</a>` : ''}
        ${i.report ? `<a class="btn ghost small" href="/justice/inquisitions/${esc(i.id)}/report/doc" target="_blank" rel="noopener">The report ↗</a>` : ''}
      </div>
    </article>`;
  };
  const flagged = live.filter(i => deskWants(i).length).length;
  return `${jusNav('desk', u)}
  <section>
    <h2>My Desk</h2>
    <p class="lede">Every inquisition committed to ${esc((u && u.name) || 'you')}, and what each one wants next. An inquisition you are not assigned to does not appear here and cannot be opened.</p>
    ${live.length ? `<p class="notice">${live.length} in hand${flagged ? `, ${flagged} wanting your hand` : ', nothing outstanding'}.</p>` : ''}
    <div class="section-label">In Hand</div>
    ${live.length ? `<div class="board">${live.map(card).join('')}</div>` : '<p class="lede">Nothing is committed to you. The Minister assigns an inquisition upon its own page.</p>'}
    ${done.length ? `<div class="section-label">Concluded</div><div class="board">${done.slice(0, 20).map(card).join('')}</div>` : ''}
  </section>`;
}

function inquisitionPage(u, i, csrf, mayEdit, cases, assign, roster) {
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

    ${assign ? assignPanel(i, csrf, assign) : ''}

    ${commissionPanel(i, csrf, mayEdit, roster)}

    <div class="section-label">Lines of Inquiry</div>
    <p class="hint">Article 12: each answer is marked for what it is. An Inquisitor shall not present suspicion as fact, inference as testimony, or an allegation as a finding.</p>
    ${(i.lines || []).length ? `<ul class="plainlist">${i.lines.map(l => `<li class="lined"><b>${esc(l.line)}</b> <span class="chip ${J.FACT_CLASS[l.kind] || ''}">${esc(l.kind || 'Allegation')}</span>${l.answer ? `<br>${esc(l.answer)}` : small('<br>Not yet answered.')}${l.source ? small('<br>Upon: ' + esc(l.source)) : ''}${mayEdit ? ` <form method="post" action="/justice/inquisitions/${esc(i.id)}/line/${esc(l.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form>` : ''}</li>`).join('')}</ul>` : '<p class="hint">No line of inquiry is set down.</p>'}
    ${mayEdit ? `<details class="addwrap"><summary>Set down a line of inquiry</summary>
      <form class="warform" method="post" action="/justice/inquisitions/${esc(i.id)}/line">${hidden(csrf)}
        <label class="csf csf-wide"><span>The question <span class="req">*</span></span><input type="text" name="line" required maxlength="300"></label>
        <label class="csf csf-wide" style="margin-top:8px"><span>What was found</span><textarea name="answer" rows="2"></textarea></label>
        <div class="wargrid" style="margin-top:8px">
          <label class="csf"><span>What that answer is \u2014 Article 12</span><select name="kind">${J.FACT_KINDS.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select></label>
          <label class="csf"><span>Upon what it rests</span><input type="text" name="source" maxlength="200" placeholder="The document, the witness, the record"></label>
        </div>
        <div class="linkrow"><button class="btn small" type="submit">Set it down</button></div>
      </form></details>` : ''}

    <div class="section-label">Statements Taken</div>
    <p class="hint">Article 13: a statement is recorded with the circumstances of its taking, and whether the person spoke of their own knowledge. <b>Article 15:</b> nothing is obtained by torture, and where any compulsion was used it is reported as such \u2014 a statement whose weight cannot be judged is worth nothing to the Bench.</p>
    ${(i.statements || []).length ? `<div class="folded">${i.statements.map(st => `<details class="paper fold">
      <summary><b>${esc(st.from)}</b>${st.standing ? ' \u00b7 ' + esc(st.standing) : ''} \u00b7 taken by ${esc(st.by)}${st.taken ? ' \u00b7 ' + esc(st.taken) : ''} <span class="chip">${esc(st.knowledge || 'Cannot be determined')}</span>${st.coerced ? ' <span class="chip bad">Compulsion used</span>' : ''}${st.favourable ? ' <span class="chip ok">Favours the subject</span>' : ''}</summary>
      <div class="foldbody">
        ${pre(st.body)}
        ${st.circumstances ? `<div class="section-label">Circumstances of the taking</div>${pre(st.circumstances)}` : ''}
        ${st.coerced ? `<div class="section-label">Compulsion reported \u2014 Article 15</div>${pre(st.coercion || 'No account of it was set down.')}` : ''}
        ${mayEdit ? `<form method="post" action="/justice/inquisitions/${esc(i.id)}/statement/${esc(st.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike</button></form>` : ''}
      </div>
    </details>`).join('')}</div>` : '<p class="hint">No statement has been taken.</p>'}
    ${mayEdit ? `<details class="addwrap"><summary>Take a statement</summary>
      <form class="warform" method="post" action="/justice/inquisitions/${esc(i.id)}/statement">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>From <span class="req">*</span></span><input type="text" name="from" required maxlength="140"></label>
          <label class="csf"><span>Their standing</span><input type="text" name="standing" maxlength="120"></label>
          <label class="csf"><span>Taken</span><input type="text" name="taken" maxlength="80" placeholder="e.g. 26th of Hearthfire"></label>
        </div>
        <label class="csf csf-wide" style="margin-top:8px"><span>What they said <span class="req">*</span></span><textarea name="body" rows="4" required></textarea></label>
        <div class="wargrid" style="margin-top:8px">
          <label class="csf"><span>Spoken of \u2014 Article 13</span><select name="knowledge">${J.KNOWLEDGE.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select></label>
        </div>
        <label class="csf csf-wide" style="margin-top:8px"><span>Circumstances of the taking</span><textarea name="circumstances" rows="2" placeholder="Where, before whom, and in what condition the person was."></textarea></label>
        <label class="checkline" style="margin-top:8px"><input type="checkbox" name="coerced" value="1"> Some compulsion was used in obtaining this \u2014 Article 15</label>
        <label class="csf csf-wide" style="margin-top:8px"><span>If so, what compulsion, plainly</span><textarea name="coercion" rows="2"></textarea></label>
        <label class="checkline" style="margin-top:8px"><input type="checkbox" name="favourable" value="1"> This tends to favour the person investigated \u2014 Article 12</label>
        <div class="linkrow"><button class="btn small" type="submit">Take it down</button></div>
      </form></details>` : ''}

    ${conductPanel(i, csrf, mayEdit)}
    ${reportPanel(i, csrf, mayEdit)}
    ${reviewPanel(i, csrf, mayEdit)}

    ${mayEdit ? `<details class="addwrap"><summary>Set the standing of the inquisition</summary>
      <form class="warform" method="post" action="/justice/inquisitions/${esc(i.id)}">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>Standing</span><select name="status">${J.INQ_STATUS.map(x => `<option value="${esc(x)}"${x === i.status ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
          <label class="csf"><span>Upon the matter</span><input type="text" name="caseNo" value="${esc(i.caseNo)}" maxlength="40" list="jcaselist3"></label>
          <label class="csf csf-wide"><span>Conclusion in a line</span><input type="text" name="conclusion" value="${esc(i.conclusion)}" maxlength="300"></label>
        </div>
        <datalist id="jcaselist3">${cases.map(c => `<option value="${esc(c.no)}"></option>`).join('')}</datalist>
        <div class="linkrow"><button class="btn" type="submit">Set it down</button></div>
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
<script src="/vendor/html2canvas.min.js" defer></script><script src="/savepic.js" defer></script></head>
<body class="printbody">
<div class="printbar noprint"><a class="btn ghost" href="javascript:history.back()">← Back</a><button class="btn" onclick="window.print()">Print</button><button class="btn ghost" id="pic" data-target="doc" data-scale="2" data-name="${JSON.stringify(String(id || 'document')).slice(1, -1)}">Save as picture</button></div>
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


function noticeDoc(n, warrant) {
  const body = `<p class="docpre">By order of the Empire, <b>${esc(n.against)}</b> is hereby declared wanted for <b>${esc(n.crime)}</b> against the Empire.</p>

  ${n.bounty ? `<div class="wantband">
    <span class="wk">Bounty</span>
    <span class="wv">${n.bounty.toLocaleString('en-GB')} Septims</span>
    <span class="wn">for capture and delivery into the custody of ${esc(n.deliverTo || 'Imperial forces')}</span>
  </div>` : ''}

  <div class="wantrow">
    <div><span class="wk">Condition</span><span class="wv">${esc(n.condition)}</span></div>
    <div><span class="wk">Deliver to</span><span class="wv">${esc(n.deliverTo || 'Imperial forces')}</span></div>
    <div><span class="wk">Last seen</span><span class="wv">${esc(n.lastSeen || 'Not known')}</span></div>
  </div>

  ${facts([
    n.hold && ['Within the Hold of', n.hold],
    n.warrantNo && ['Upon the warrant', n.warrantNo],
    n.caseNo && ['Upon the matter', n.caseNo],
    ['Posted by', n.issuedBy],
    ['Standing', n.status]
  ])}

  <div class="s-hear">The Ground of this Notice</div>
  <p class="docbody">${esc(n.ground)}</p>

  ${n.refused ? `<p class="docbody"><b>${esc(n.against)}</b> was formally offered the right to stand trial and answer the charges brought. They refused to attend, and by that continued defiance stand in open contempt of Imperial authority.</p>` : ''}

  <div class="s-hear">Upon all Subjects of the Empire</div>
  <div class="warnbox">
    <p class="docbody">No citizen, noble, guard, soldier, merchant, or other subject of the Empire is to <b>shelter, conceal, transport, supply, warn, or otherwise aid</b> ${esc(n.against)} in avoiding Imperial justice.</p>
    <p class="docbody">Any person found knowingly assisting them shall be considered an <b>accomplice</b> to the offence named above, and may face prosecution under Imperial law.</p>
  </div>

  <div class="closing">By order of the Empire.<small>Obey the law \u00b7 Aid no traitor</small></div>

  ${n.note ? `<div class="s-hear">Return upon the Notice</div><p class="docbody">${esc(n.note)}</p>` : ''}`;

  return docShell({
    title: 'Wanted for ' + n.crime, kind: 'An Imperial Notice', no: n.no + ' \u00b7 ' + n.against,
    id: n.no.replace(/\s+/g, '_'),
    body, code: n.code, foot: seal('Given under my hand, by order of the bench', n.issuedBy)
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


function commissionDoc(i) {
  const c = i.commission || {};
  const lines = list => (list || []).length ? (list || []).map(x => esc(x)).join('\n') : 'None.';
  const body = `<p class="docpre">To the Inquisitor here named, and to all officers of the Empire: <b>GREETING</b>.</p>
  <p class="docpre">You are hereby <b>COMMISSIONED</b> to examine the matter set down below, within the scope here written and no further, and to make true report of what you find to the Imperial Bench.</p>
  ${facts([
    ['Upon the inquisition', i.no],
    ['Subject', i.subject],
    i.caseNo && ['Upon the matter', i.caseNo],
    i.hold && ['Within the Hold of', i.hold],
    ['Issued by', c.issuedBy || ''],
    c.issuingTitle && ['Title of the issuing authority', c.issuingTitle],
    c.issuedOn && ['Entered on', c.issuedOn],
    ['Findings to be reported to', c.reportTo || 'The Provincial Minister of State for Justice'],
    ['Standing', c.revoked ? 'Revoked' : 'In force']
  ])}
  <div class="s-hear">Allegation(s) or Matter to be Examined</div>
  <p class="docbody">${esc(c.allegations || '')}</p>
  ${c.scope ? `<div class="s-hear">The Persons, Institutions, Territory and Events within the Scope</div><p class="docbody">${esc(c.scope)}</p>` : ''}
  <div class="s-hear">Ground of Imperial Jurisdiction \u2014 Article 7</div>
  <p class="docbody">${(c.grounds || []).length ? (c.grounds || []).map(g => { const j = J.JURISDICTION_BY_ID[g]; return j ? esc(j[1]) : ''; }).filter(Boolean).join('\n') : 'None named.'}</p>
  ${c.jurisdiction ? `<p class="docbody">${esc(c.jurisdiction)}</p>` : ''}
  <div class="s-hear">Extraordinary Powers Conferred \u2014 Article 10</div>
  <p class="docbody">${lines(c.conferred)}</p>
  <div class="s-hear">Extraordinary Powers Denied</div>
  <p class="docbody">${lines(c.denied)}${c.otherDenied ? '\n' + esc(c.otherDenied) : ''}</p>
  <div class="s-hear">Ordinary Powers Carried by Any Lawful Commission \u2014 Article 9</div>
  <p class="docbody">${J.ORDINARY_POWERS.map(x => esc(x)).join('\n')}</p>
  <div class="s-hear">Rank(s) and Name of Assigned Inquisitor(s)</div>
  <p class="docbody">${esc(c.inquisitors || '')}</p>
  <div class="s-hear">What This Commission Does Not Confer \u2014 Article 17</div>
  <p class="docbody">${J.PROHIBITED.map(x => esc(x)).join('\n')}</p>
  ${c.revoked ? `<div class="s-hear">Revoked</div><p class="docbody">This commission is revoked and carries no authority.${c.revokedNote ? ' ' + esc(c.revokedNote) : ''}</p>` : ''}
  <p class="docpre">The primary responsibility of an Inquisitor is the discovery, verification, preservation and reporting of facts, that the competent Imperial authority may decide what further action is warranted. A power not conferred above is denied. The customary right of the Jarls and Lord-Regents to hear ordinary offences in the first instance is not displaced by this writ, and extraordinary power ceases upon its termination.</p>`;
  return docShell({
    title: 'Commission of Inquisition', kind: 'Issued under the Inquisitors\u2019 Standards for Operation & Limits of Authority',
    no: c.no || i.no, id: String(c.no || i.no).replace(/\s+/g, '_'),
    body, code: c.code,
    foot: seal('Given under my hand', (c.issuedBy || '') + (c.issuingTitle ? ', ' + c.issuingTitle : ''))
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
      <label class="csf csf-wide"><span>Note</span><textarea name="note" rows="2">${esc(e.note)}</textarea></label>
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
        <label class="csf csf-wide" style="margin-top:10px"><span>Note</span><textarea name="note" rows="2"></textarea></label>
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
    <p class="small">Rendered ${money(paid)} · still owing <b data-owed="${owedLevel(d.at)}"${owedLevel(d.at) >= 2 ? ` title="Standing unpaid for some time"` : ''}>${money(left)}</b></p>
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
        <label class="csf csf-wide" style="margin-top:10px"><span>Note</span><textarea name="note" rows="2"></textarea></label>
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
      <label class="csf csf-wide"><span>Return upon the sentence</span><textarea name="ret" rows="2">${esc(x.ret)}</textarea></label>
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
        <label class="csf csf-wide" style="margin-top:10px"><span>The sentence <span class="req">*</span></span><textarea name="sentence" rows="3" required></textarea></label>
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
              <label class="csf"><span>Note</span><textarea name="note" rows="2">${esc(c.note)}</textarea></label>
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
        <label class="csf csf-wide" style="margin-top:10px"><span>Note</span><textarea name="note" rows="2"></textarea></label>
        <div class="linkrow"><button class="btn" type="submit">Enter it</button></div>
      </form>
    </details>` : ''}
  </section>`;
}

function wantedPage(u, list, notices) {
  const posted = notices || [];
  const money = n => Number(n || 0).toLocaleString('en-US');
  const noticeCard = n => `<article class="wantcard">
    <div class="wchead"><span class="wcno">${esc(n.no)}</span>${n.bounty ? `<span class="wcbounty">${esc(money(n.bounty))} septims</span>` : ''}</div>
    <h3>${esc(n.against)}</h3>
    <p class="wcfor">Wanted for ${esc(n.crime)}</p>
    <dl class="meta">
      <dt>Condition</dt><dd>${esc(n.condition)}</dd>
      <dt>Deliver to</dt><dd>${esc(n.deliverTo)}</dd>
      ${n.lastSeen ? `<dt>Last seen</dt><dd>${esc(n.lastSeen)}</dd>` : ''}
      ${n.hold ? `<dt>Hold</dt><dd>${esc(n.hold)}</dd>` : ''}
      ${n.warrantNo ? `<dt>Upon</dt><dd>${esc(n.warrantNo)}</dd>` : ''}
    </dl>
    <div class="linkrow"><a class="btn ghost small" href="/justice/notices/${esc(n.id)}/doc" target="_blank" rel="noopener">Read the notice ↗</a></div>
  </article>`;
  return `${jusNav('wanted', u)}
  ${posted.length ? `<section>
    <h2>Imperial Notices</h2>
    <p class="lede">These notices stand posted in the name of the Empire. A bounty is offered upon each. Bring word to the nearest officer of the Legion — do not take them yourself.</p>
    <div class="board wantboard">${posted.map(noticeCard).join('')}</div>
  </section>` : ''}
  <section>
    <h2>Persons Sought</h2>
    <p class="lede">Warrants of arrest that stand unanswered. If you know where any of these may be found, tell the nearest officer of the Legion or lay a matter before this Ministry. Do not lay hands on them yourself.</p>
    ${list.length ? `<div class="tablewrap" data-nail><table class="ledger roster"><thead><tr><th>Sought</th><th>For</th><th>Hold</th><th>Warrant</th><th>Since</th></tr></thead><tbody>
      ${list.map(w => `<tr class="nailed">
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
      <p style="margin:2px 0 12px"><span class="verdictstamp" style="color:${result.inForce ? 'rgba(62,90,43,.85)' : 'rgba(138,30,30,.85)'}">${esc(String(result.standing || '').toUpperCase())}</span></p>
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
    <div class="warstats" data-roll>${stat(r.opened, 'Opened')}${stat(r.judged, 'Judged')}${stat(r.pending, 'Pending')}${stat(r.sittings, 'Sittings set')}${stat(r.sealed, 'Sealed')}</div>
    <div class="two">
      <div><div class="section-label">By kind</div>${brk(r.byKind)}</div>
      <div><div class="section-label">Findings given</div>${brk(r.findings)}</div>
    </div>

    <div class="section-label">Laid by the Public</div>
    <div class="warstats" data-roll>${stat(r.mattersLaid, 'Laid')}${stat(r.mattersWaiting, 'Awaiting an answer')}</div>

    <div class="section-label">Warrants and Custody</div>
    <div class="warstats" data-roll>${stat(r.warrants, 'Warrants issued')}${stat(r.warrantsOpen, 'Still running')}${stat(r.committed, 'Committed')}${stat(r.held, 'Held now')}</div>
    <div class="section-label">Warrants by kind</div>${brk(r.warrantKinds)}

    <div class="section-label">Inquisitions and Exhibits</div>
    <div class="warstats" data-roll>${stat(r.inquisitions, 'Inquisitions')}${stat(r.inquisitionsOpen, 'Still running')}${stat(r.exhibits, 'Things taken')}${stat(r.exhibitsHeld, 'Still held')}</div>

    <div class="section-label">Sentence and Satisfaction</div>
    <div class="warstats" data-roll>${stat(r.sentences, 'Sentences')}${stat(r.sentencesCarried, 'Carried out')}${stat(r.sentencesOutstanding, 'Outstanding')}</div>
    <div class="warstats" data-roll>${stat(money(r.dues.ordered), 'Septims ordered')}${stat(money(r.dues.rendered), 'Rendered')}${stat(money(r.dues.outstanding), 'Outstanding')}</div>
  </section>`;
}


// Article 26. The report as a paper that leaves the building: the same twelve
// heads, in the same order, with the evidence for and the evidence against kept
// visibly apart, and the recommendations marked for what they are not.
function inqReportDoc(i) {
  const r = (i && i.report) || {};
  const c = i.commission || {};
  const head = (h, v) => v ? `<div class="s-hear">${esc(h)}</div><p class="docbody">${esc(v)}</p>` : '';
  const body = `<p class="docpre">To the authority here named: this is the <b>TRUE REPORT</b> of the Inquisitor upon the matter committed to them, rendered under Article 26 of the Standards, that the competent Imperial authority may decide what further action is warranted.</p>
  ${facts([
    ['Upon the inquisition', i.no],
    ['Subject', i.subject],
    ['Under the authority of', r.under || c.no || ''],
    i.into && ['Into', i.into],
    i.caseNo && ['Upon the matter', i.caseNo],
    i.hold && ['Within the Hold of', i.hold],
    ['Rendered by', r.laidBy || ''],
    ['Rendered to', c.reportTo || 'The Provincial Minister of State for Justice']
  ])}
  ${head('The Allegations Investigated', r.allegations)}
  ${head('The Jurisdictional Ground for Imperial Action', r.jurisdiction)}
  ${head('Summary of the Course of the Investigation', r.course)}
  ${head('Facts Determined by the Investigation', r.facts)}
  ${head('Disputed Facts Material to the Case', r.disputed)}
  ${head('Evidence Material in Support of the Allegations', r.evidenceFor)}
  <div class="s-hear">Evidence Material Against the Allegations</div>
  <p class="docbody">${esc(r.evidenceAgainst || 'None was set down.')}</p>
  ${head('Assessment of Credibility', r.credibility)}
  ${head('Questions of Jurisdiction Arising', r.jurisdictionQuestion)}
  ${head('The Conclusions of the Inquisitor', r.conclusions)}
  <div class="s-hear">Recommendations — Article 14</div>
  <p class="docbody">${(r.recommendations || []).length ? (r.recommendations || []).map(x => esc(x)).join('\n') : 'None.'}</p>
  ${(i.emergencies || []).length ? `<div class="s-hear">Emergency Measures Taken — Articles 19 and 20</div>
  <p class="docbody">${i.emergencies.map(e => esc(e.measure + ' — ' + (e.danger || []).join('; ') + '; temporary until ' + e.until + (e.reported ? '; reported to the Minister' : '; NOT YET REPORTED'))).join('\n')}</p>` : ''}
  ${(c.extensions || []).length ? `<div class="s-hear">Extensions of the Subject Matter — Article 3</div>
  <p class="docbody">${c.extensions.map(x => esc(x.what + ' — ' + x.ground)).join('\n')}</p>` : ''}
  ${(i.assistance || []).length ? `<div class="s-hear">Assistance of Other Authorities — Articles 21 to 23</div>
  <p class="docbody">${i.assistance.map(x => esc(x.who + ' — ' + x.what + ' (upon: ' + x.ground + ')')).join('\n')}</p>` : ''}
  <div class="s-hear">Compulsion — Article 15</div>
  <p class="docbody">${J.coercedStatements(i).length ? J.coercedStatements(i).map(x => esc(x.from + ': ' + (x.coercion || 'no account of it was set down'))).join('\n') : 'No statement in this matter was obtained under any compulsion.'}</p>
  <p class="docpre">A recommendation in this report does not itself commence proceedings, and is not a finding of guilt. The decision to indict, to charge or to punish rests with the competent Imperial authority and not with the Inquisitor. Material evidence favourable to the person investigated is set out above as Article 12 requires; where the head is empty, none was found.</p>`;
  return docShell({
    title: 'Inquisitorial Report', kind: 'Rendered under Article 26 of the Inquisitors’ Standards',
    no: String(i.no || '').replace('Inquisition', 'Report'),
    id: String(i.no || 'report').replace(/\s+/g, '_') + '_Report',
    body, code: c.code,
    foot: seal('Rendered under my hand', r.laidBy || '')
  });
}

// Article 28. A complaint against an Inquisitor. It is not a matter for the
// Bench: it goes to the Minister, or past the Minister to the Governor where
// examining it through the Ministry would be conflicted.
function complaintsPage(u, list, csrf, mayEdit) {
  const card = x => `<article class="reqcard">
    <div class="no">${esc(x.no)} · ${esc(when(x.at))} <span class="chip ${J.COMPLAINT_CLASS[x.status] || ''}">${esc(x.status)}</span>${x.conflicted ? ' <span class="chip warn">To the Governor — the Ministry is conflicted</span>' : ''}</div>
    <h3>Against ${esc(x.against)}</h3>
    <p class="small">${esc((x.kinds || []).join(' · '))}${x.inqNo ? ' · upon ' + esc(x.inqNo) : ''}${x.by ? ' · laid by ' + esc(x.by) : ' · laid without a name'}</p>
    ${pre(x.what)}
    ${x.finding ? `<div class="section-label">Finding</div>${pre(x.finding)}` : ''}
    ${(x.sanctions || []).length ? `<div class="section-label">Ordered</div><ul class="plainlist">${x.sanctions.map(v => `<li>${esc(v)}</li>`).join('')}</ul>` : ''}
    <p class="small">Under the number <b>${esc(x.code || '')}</b>${x.handledBy ? ' · last touched by ' + esc(x.handledBy) : ''}</p>
    ${mayEdit ? `<details class="inlinedit"><summary class="btn ghost small">Answer upon it</summary>
      <form class="warform" method="post" action="/justice/complaints/${esc(x.id)}">${hidden(csrf)}
        <label class="csf"><span>Standing</span><select name="status">${J.COMPLAINT_STATUS.map(v => `<option value="${esc(v)}"${v === x.status ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
        <label class="csf csf-wide" style="margin-top:8px"><span>Finding</span><textarea name="finding" rows="3">${esc(x.finding || '')}</textarea></label>
        <fieldset class="permset" style="margin-top:10px"><legend>Where it is upheld — Article 28</legend>
          <p class="hint" style="margin:0 0 6px">An Inquisitor who acts materially outside lawful authority may be any of these. Good faith is not a defence to acting outside the Commission; it may be a mitigation.</p>
          ${J.SANCTIONS.map(v => `<label class="checkline"><input type="checkbox" name="sanctions" value="${esc(v)}"${(x.sanctions || []).includes(v) ? ' checked' : ''}> ${esc(v)}</label>`).join('')}
        </fieldset>
        <div class="linkrow"><button class="btn small" type="submit">Set it down</button></div>
      </form>
      <form method="post" action="/justice/complaints/${esc(x.id)}/remove" class="inline" style="margin-top:8px">${hidden(csrf)}<button class="btn ghost small" type="submit">Strike it</button></form>
    </details>` : ''}
  </article>`;

  return `${jusNav('complaints', u)}
  <section>
    <h2>Complaints of Inquisitors</h2>
    <p class="lede">Article 28. Any person may complain that an Inquisitor has exceeded their Commission, abused an extraordinary power, fabricated evidence, or acted for an improper purpose. The complaint is examined by the Minister; where examining it through the Ministry would itself be conflicted, it goes to the Governor.</p>
    <p class="notice">The Standards bind the Inquisitor whether or not anybody complains. But an office with no way to be complained of is an office with no limits, so this register exists and is kept.</p>
    ${list.length ? list.map(card).join('') : '<p class="hint">No complaint stands against any Inquisitor.</p>'}

    <details class="addwrap"><summary>Lay a complaint under Article 28</summary>
      <form class="warform" method="post" action="/justice/complaints">${hidden(csrf)}
        <div class="wargrid">
          <label class="csf"><span>The Inquisitor complained of <span class="req">*</span></span><input type="text" name="against" maxlength="140" required></label>
          <label class="csf"><span>Upon which inquisition or commission</span><input type="text" name="inqNo" maxlength="60"></label>
          <label class="csf"><span>Laid by</span><input type="text" name="by" maxlength="140" placeholder="Leave it empty to lay it without a name"></label>
        </div>
        <fieldset class="permset" style="margin-top:10px"><legend>What is alleged <span class="req">*</span></legend>
          ${J.COMPLAINT_KINDS.map(v => `<label class="checkline"><input type="checkbox" name="kinds" value="${esc(v)}"> ${esc(v)}</label>`).join('')}
        </fieldset>
        <label class="csf csf-wide" style="margin-top:8px"><span>What is complained of <span class="req">*</span></span><textarea name="what" rows="4" required placeholder="What was done, when, and by what authority it was said to be done."></textarea></label>
        <label class="checkline" style="margin-top:8px"><input type="checkbox" name="conflicted" value="1"> Examining this through the Ministry would be conflicted; it should go to the Governor</label>
        <div class="linkrow"><button class="btn" type="submit">Lay it</button></div>
      </form></details>
  </section>`;
}


// Article 28, to the public. An office that cannot be complained of is an office
// without limits, so the form is open to anybody and asks for no name.
function complaintLayBox(u, csrf, prev, err) {
  const v = prev || {};
  const val = k => esc(v[k] == null ? '' : v[k]);
  return `${jusNav('complainlay', u)}
  <section class="signwrap">
    <h2>Complain of an Inquisitor</h2>
    <p class="lede">Under Article 28 of the Inquisitors’ Standards, any person may complain that an Imperial Inquisitor has exceeded their Commission, abused an extraordinary power, fabricated evidence, or acted for an improper purpose. The complaint is examined by the Provincial Minister of State for Justice, and where examining it through the Ministry would itself be conflicted, it goes to the Governor.</p>
    <p class="notice">You need not give your name. You will be given a number; keep it, and you may ask after the complaint at <a href="/justice/verify">Verify a Paper</a> without naming yourself to anybody.</p>
    <p class="hint">Read <a href="/justice/standards">the Standards</a> first if you wish. They set out what an Inquisitor may and may not do, and Article 17 lists what no Commission confers upon one — among other things: no power to try, sentence or punish; no power to depose a Jarl; no power to obtain anything by torture.</p>
    ${err ? `<div class="flash err" role="status">${esc(err)}</div>` : ''}
    <form class="writ" method="post" action="/justice/complaints/lay">${hidden(csrf)}
      <input type="text" name="website" value="" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">
      <label class="csf csf-wide"><span>The Inquisitor complained of <span class="req">*</span></span><input type="text" name="against" maxlength="140" required value="${val('against')}" placeholder="Their name, or their rank and whatever you were told"></label>
      <label class="csf csf-wide" style="margin-top:8px"><span>Upon which inquisition or commission, if you know it</span><input type="text" name="inqNo" maxlength="60" value="${val('inqNo')}" placeholder="The number upon the writ they showed you"></label>
      <fieldset class="permset" style="margin-top:10px"><legend>What is alleged <span class="req">*</span></legend>
        ${J.COMPLAINT_KINDS.map(x => `<label class="checkline"><input type="checkbox" name="kinds" value="${esc(x)}"> ${esc(x)}</label>`).join('')}
      </fieldset>
      <label class="csf csf-wide" style="margin-top:8px"><span>What was done <span class="req">*</span></span><textarea name="what" rows="5" required placeholder="What happened, when, where, who else saw it, and by what authority it was said to be done.">${val('what')}</textarea></label>
      <label class="csf csf-wide" style="margin-top:8px"><span>Your name, if you wish to give one</span><input type="text" name="by" maxlength="140" value="${val('by')}" placeholder="Leave this empty to complain without a name"></label>
      <label class="checkline" style="margin-top:8px"><input type="checkbox" name="conflicted" value="1"> I believe the Ministry itself is too close to this to examine it, and it should go to the Governor</label>
      <div class="linkrow"><button class="btn" type="submit">Lay the complaint</button></div>
    </form>
  </section>`;
}

function complaintLayDone(u, x) {
  return `${jusNav('complainlay', u)}
  <section class="signwrap">
    <h2>Your complaint is received</h2>
    <p class="lede">It is entered as <b>${esc(x.no)}</b>, under the number <b>${esc(x.code)}</b>. Keep that number: it is how you ask after this without giving your name.</p>
    <dl class="meta">
      <dt>Number</dt><dd><b>${esc(x.code)}</b></dd>
      <dt>Against</dt><dd>${esc(x.against)}</dd>
      <dt>What is alleged</dt><dd>${esc((x.kinds || []).join('; '))}</dd>
      <dt>Standing</dt><dd>${esc(x.status)}</dd>
      ${x.conflicted ? '<dt>Marked</dt><dd>For the Governor, the Ministry being too close to it</dd>' : ''}
    </dl>
    <p class="hint">A complaint being received is not a finding against anybody. It will be read, and the Inquisitor complained of will answer it.</p>
    <div class="linkrow"><a class="btn" href="/justice/verify?code=${encodeURIComponent(x.code)}">Ask after it</a><a class="btn ghost" href="/justice/standards">The Standards</a><a class="btn ghost" href="/justice">The Ministry of Justice</a></div>
  </section>`;
}

module.exports = { noticeDoc, inqReportDoc, complaintsPage, complaintLayBox, complaintLayDone, standardsPage, reportPanel, reviewPanel, conductPanel, commissionDoc, commissionPanel, exhibitsPage, duesPage, sentencesPage, courtsPage, wantedPage, verifyPage, reportPage, witnessSummonsDoc, bailDoc, exhibitDoc, dueDoc, sentenceDoc, reportDoc, warrantDoc, judgmentDoc, summonsDoc, custodyDoc, matterDoc, custodyPage, inquisitionsPage, inquisitionPage, deskPage, partiesPage, offencesPage, warrantsPage, calendarPage, jusNav, hall, principles, judgmentsPage, layBox, layDone, layStatus, docket, casePage, mattersPage, officersPage, entrance };
