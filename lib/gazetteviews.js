const V = require('./views');
const { esc } = require('./views');
const G = require('./gazette');

const hidden = c => `<input type="hidden" name="_csrf" value="${esc(c)}">`;
const day = iso => { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (_) { return ''; } };

function masthead(i) {
  return `<div class="gazhead">
    <div class="gazrule"></div>
    <div class="gaztitle">${esc(i.title || 'The Provincial Gazette')}</div>
    <div class="gazsub">
      <span>Published by the Ministry of Civil &amp; Administrative Affairs</span>
      <span class="gazno">No. ${esc(i.numeral || i.no)}</span>
      <span>${esc(i.day || day(i.publishedAt || i.at))}</span>
    </div>
    <div class="gazrule"></div>
  </div>`;
}

function body(i) {
  const bySection = {};
  (i.items || []).forEach(x => { (bySection[x.section] = bySection[x.section] || []).push(x); });
  const cols = G.SECTIONS.filter(s => (bySection[s.id] || []).length).map(s => `<section class="gazsec">
    <h3>${esc(s.name)}</h3>
    <p class="gazlead">${esc(s.lead)}</p>
    ${bySection[s.id].map(x => `<article class="gazitem" id="e${(i.items || []).indexOf(x)}">
      <h4>${x.link ? `<a href="${esc(x.link)}">${esc(x.head)}</a>` : esc(x.head)}</h4>
      ${x.body ? `<p>${esc(x.body)}</p>` : ''}
    </article>`).join('')}
  </section>`).join('');
  return `${i.lead ? `<p class="gazstand">${esc(i.lead)}</p>` : ''}
    ${cols || '<p class="hint">Nothing was set down in this issue.</p>'}`;
}

function issuePage(i, canEdit) {
  return `<section class="gazette">
    <p style="margin:0 0 10px"><a href="/gazette">← Every issue</a></p>
    <div class="gazsheet">
      ${masthead(i)}
      ${body(i)}
      <div class="gazfoot">Set down at the Ministry${i.by ? ' by ' + esc(i.by) : ''}${i.publishedAt ? ', published ' + esc(day(i.publishedAt)) : ''}. The Gazette records; it does not decide.</div>
    </div>
    ${canEdit ? `<div class="linkrow"><a class="btn ghost small" href="/staff/gazette/${esc(i.no)}">Amend this issue</a></div>` : ''}
  </section>`;
}

function sectionName(id) { const sec = (G.SECTIONS || []).find(x => x.id === id); return sec ? sec.name : ''; }

function indexPage(list, canEdit) {
  const latest = list[0];
  return `<section class="gazette">
    <h2>The Provincial Gazette</h2>
    <p class="lede">What the Ministry has done, issue by issue. Everything here was public already — the Gazette only gathers it into one place so a person does not have to watch six registers to know what happened.</p>
    ${canEdit ? `<div class="linkrow"><a class="btn small" href="/staff/gazette">Set an issue</a></div>` : ''}
    ${latest ? `<div class="gazsheet">
      ${masthead(latest)}
      ${body(latest)}
      <div class="gazfoot">Set down at the Ministry${latest.by ? ' by ' + esc(latest.by) : ''}${latest.publishedAt ? ', published ' + esc(day(latest.publishedAt)) : ''}.</div>
    </div>` : '<p class="notice">No issue has been published yet.</p>'}
    ${list.length ? `<div class="section-label">Find in every issue</div>
      ${V.findBox({ scope: '#gazfind', items: '.gazhit', word: 'entries', one: 'entry', label: 'Find across the Gazette', placeholder: 'A name, a place, a record number…', reveal: '#gazfind' })}
      <div id="gazfind" hidden>${list.map(i => (i.items || []).map((x, n) => `<article class="reqcard gazhit" data-finditem>
        <div class="no">No. ${esc(i.numeral || i.no)} · ${esc(i.day || day(i.publishedAt || i.at))}${x.section ? ' · ' + esc(sectionName(x.section)) : ''}</div>
        <h3><a href="/gazette/${esc(i.no)}#e${n}">${esc(x.head)}</a></h3>
        ${x.body ? `<p>${esc(x.body)}</p>` : ''}
      </article>`).join('')).join('')}</div>` : ''}
    ${list.length > 1 ? `<div class="section-label">Issues Behind This One</div>
      <div class="tablewrap"><table class="ledger"><thead><tr><th>Issue</th><th>Day</th><th>What was in it</th></tr></thead><tbody>
      ${list.slice(1).map(i => `<tr>
        <td><a href="/gazette/${esc(i.no)}"><b>No. ${esc(i.numeral || i.no)}</b></a></td>
        <td>${esc(i.day || day(i.publishedAt || i.at))}</td>
        <td>${(i.items || []).length} ${(i.items || []).length === 1 ? 'entry' : 'entries'}</td>
      </tr>`).join('')}
      </tbody></table></div>` : ''}
  </section>`;
}

function itemRow(x, n) {
  return `<div class="gazrow" data-n="${n}">
    <select name="section_${n}" class="sel">${G.SECTIONS.map(s => `<option value="${esc(s.id)}"${x && x.section === s.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
    <input type="text" name="head_${n}" maxlength="160" value="${esc((x && x.head) || '')}" placeholder="The heading">
    <textarea name="body_${n}" rows="2" maxlength="1600" placeholder="A line or two. Leave empty for a bare heading.">${esc((x && x.body) || '')}</textarea>
    <input type="text" name="link_${n}" maxlength="240" value="${esc((x && x.link) || '')}" placeholder="/records/Writ-IV (optional)">
    <label class="checkline"><input type="checkbox" name="drop_${n}" value="1"> Leave this one out</label>
  </div>`;
}

function editPage(i, csrf, isNew, range) {
  const items = (i.items || []).slice(0, 60);
  const blanks = 4;
  return `<section class="gazette">
    <p style="margin:0 0 10px"><a href="/gazette">← The Gazette</a></p>
    <h2>${isNew ? 'Set an Issue' : 'Amend Issue No. ' + esc(i.numeral || i.no)}</h2>
    <p class="lede">The Ministry gathers the week itself. Strike out what should not go in, write the standfirst, and publish it. Nothing here is published until you say so.</p>

    ${isNew ? `<article class="reqcard">
      <form method="get" action="/staff/gazette" class="rowform">
        <label>From<input type="date" name="from" value="${esc((range && range.from) || '')}" class="sel"></label>
        <label>To<input type="date" name="to" value="${esc((range && range.to) || '')}" class="sel"></label>
        <button class="btn small" type="submit">Gather that week</button>
      </form>
      <p class="hint" style="margin:10px 0 0">Gathering reads the public record between those days: notices, sealed papers, appointments and departures, licences and the Delegates’ returns.</p>
    </article>` : ''}

    <form method="post" action="${isNew ? '/staff/gazette' : '/staff/gazette/' + esc(i.no)}" class="warform">
      ${hidden(csrf)}
      <input type="hidden" name="no" value="${esc(i.no)}">
      <input type="hidden" name="from" value="${esc(i.from || '')}">
      <input type="hidden" name="to" value="${esc(i.to || '')}">
      <input type="hidden" name="count" value="${items.length + blanks}">
      <div class="wargrid">
        <label class="csf"><span>The title on the masthead</span>
          <input type="text" name="title" maxlength="120" value="${esc(i.title || 'The Provincial Gazette')}"></label>
        <label class="csf"><span>The day it carries</span>
          <span class="say">In the province’s own reckoning.</span>
          <input type="text" name="day" maxlength="80" value="${esc(i.day || '')}"></label>
      </div>
      <label class="csf csf-wide"><span>The standfirst</span>
        <span class="say">A short paragraph at the top saying what kind of week it was. Optional.</span>
        <textarea name="lead" rows="3" maxlength="1200">${esc(i.lead || '')}</textarea></label>

      <div class="section-label">What Goes In</div>
      <p class="hint" style="margin:-4px 0 12px">Change a row\u2019s section and it moves under that heading straight away, so you can see the issue taking shape. Tick <i>leave this one out</i> and it drops to the bottom.</p>
      <div class="gazrows" id="gazrows">
        ${items.map((x, n) => itemRow(x, n)).join('')}
        ${Array.from({ length: blanks }, (_, k) => itemRow(null, items.length + k)).join('')}
      </div>
      <div class="linkrow" style="margin:-4px 0 18px"><button class="btn ghost small" type="button" id="gazmore">Another entry</button></div>
      <script type="application/json" id="gazsections">${JSON.stringify(G.SECTIONS)}</script>
      <script src="/gazette.js" defer></script>

      <div class="linkrow">
        <button class="btn" type="submit">${isNew ? 'Set it down' : 'Save the amendment'}</button>
        <button class="btn ghost small" name="publish" value="1" type="submit">${i.published ? 'Save and keep it published' : 'Set it down and publish it'}</button>
        ${!isNew && i.published ? `<button class="btn ghost small" name="unpublish" value="1" type="submit">Take it back off the page</button>` : ''}
        ${!isNew ? `<button class="btn ghost small" name="strike" value="1" type="submit">Strike this issue</button>` : ''}
      </div>
    </form>
  </section>`;
}

function managePage(list, csrf) {
  return `<section class="gazette">
    <h2>The Gazette</h2>
    <p class="lede">Every issue, published or not. Only the Minister may publish one.</p>
    <div class="linkrow"><a class="btn small" href="/staff/gazette?new=1">Set a new issue</a><a class="btn ghost small" href="/gazette">The public Gazette</a></div>
    <div class="tablewrap"><table class="ledger"><thead><tr><th>Issue</th><th>Day</th><th>Entries</th><th>Standing</th><th></th></tr></thead><tbody>
      ${list.length ? list.map(i => `<tr>
        <td><b>No. ${esc(i.numeral || i.no)}</b></td>
        <td>${esc(i.day || day(i.at))}</td>
        <td>${(i.items || []).length}</td>
        <td>${i.published ? '<span class="chip ok">Published</span>' : '<span class="chip">In the drawer</span>'}</td>
        <td><a class="btn ghost small" href="/staff/gazette/${esc(i.no)}">Open</a>${i.published ? ` <a class="btn ghost small" href="/gazette/${esc(i.no)}">Read</a>` : ''}</td>
      </tr>`).join('') : '<tr><td colspan="5"><span class="hint">No issue has been set yet.</span></td></tr>'}
    </tbody></table></div>
  </section>`;
}

module.exports = { indexPage, issuePage, editPage, managePage };
