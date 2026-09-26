const Ranks = require('./ranks');
const { DEPTS } = require('./content');
const { MONTHS, DAYS } = require('./skyrim');
const { esc, hidden } = require('./views');

const rankOptions = (ranks, value, me) => Ranks.GROUPS.map(g => {
  const list = ranks.filter(r => r.group === g && (me.all || r.id !== 'minister'));
  return list.length ? `<optgroup label="${esc(g)}">${list.map(r => `<option value="${esc(r.id)}"${r.id === value ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</optgroup>` : '';
}).join('');
const holdChecks = (name, chosen) => `<div class="opts">${Ranks.HOLDS.map(h => `<label><input type="checkbox" name="${name}" value="${h.id}"${(chosen || []).includes(h.id) ? ' checked' : ''}> ${esc(h.name)}</label>`).join('')}</div>`;

function studyNav(me, active) {
  const items = [['/admin', 'Officers', 'officers']];
  if (me.all) items.push(['/admin/ranks', 'Ranks & Access', 'ranks'], ['/admin/settings', 'Seal, Calendar & Laws', 'settings']);
  return `<div class="subnav">${items.map(([h, l, k]) => `<a href="${h}"${k === active ? ' class="on"' : ''}>${l}</a>`).join('')}</div>`;
}

function study(users, ranks, csrf, me, issued) {
  const h = hidden(csrf);
  const post = (u, act, label, cls, extra = '') => `<form method="post" action="/admin/officers/${encodeURIComponent(u)}/${act}" class="inline">${h}${extra}<button class="btn small${cls ? ' ' + cls : ''}" type="submit">${label}</button></form>`;
  const guarded = u => !me.all && u.rank === 'minister';
  const roster = users.map(u => `<tr>
    <td><b>${esc(u.name)}</b><br><span class="small">${esc(u.username)}${u.office ? ' · ' + esc(u.office) : ''}</span></td>
    <td>${esc(u.rankName)}${u.holds.length ? `<br><span class="small">${esc(u.holds.map(id => Ranks.HOLD_BY_ID[id] ? Ranks.HOLD_BY_ID[id].name : id).join(', '))}</span>` : ''}</td>
    <td>${u.active ? '' : '<span class="chip">Suspended</span> '}${u.mustChange ? '<span class="chip">New password due</span> ' : ''}${u.listed ? '' : '<span class="chip">Unlisted</span>'}<br><span class="small">${u.lastLogin ? 'Last entered ' + esc(u.lastLogin.slice(0, 10)) : 'Never entered'}</span></td>
    <td>${guarded(u) ? '<span class="small">Kept by the Minister</span>' : `<details class="edit"><summary class="btn small ghost">Edit</summary>
      <form method="post" action="/admin/officers/${encodeURIComponent(u.username)}/edit" class="stack">${h}
        <label class="l">Name <input type="text" name="name" value="${esc(u.name)}" maxlength="80" required></label>
        <label class="l">Office title <input type="text" name="office" value="${esc(u.office)}" maxlength="120" placeholder="Leave blank to use the rank"></label>
        <label class="l">Rank <select name="rank" class="sel"${u.username === me.username ? ' disabled' : ''}>${rankOptions(ranks, u.rank, me)}</select></label>
        <span class="l">Holds</span>${holdChecks('holds', u.holds)}
        <label class="checkline"><input type="checkbox" name="listed" value="1"${u.listed ? ' checked' : ''}> Listed in the public Directory</label>
        <button class="btn small" type="submit">Save</button>
      </form>
      <div class="linkrow">${post(u.username, 'reset', 'Reset password', 'ghost')}${u.username === me.username ? '' : (u.active ? post(u.username, 'suspend', 'Suspend', 'ghost') : post(u.username, 'restore', 'Restore', 'ghost'))}
      ${u.username === me.username ? '' : `<details><summary class="btn small ghost">Remove</summary>${post(u.username, 'remove', 'Confirm removal')}</details>`}</div></details>`}</td></tr>`).join('');
  const issuedBox = issued ? `<div class="card" style="margin-bottom:18px"><div class="eyebrow">${issued.fresh ? 'Officer entered upon the rolls' : 'Password reset'}</div>
    <p style="margin:8px 0">Give these to <b>${esc(issued.name)}</b> privately. This password is shown only once. They must choose their own at first entry.</p>
    <dl class="meta"><dt>Username</dt><dd><b>${esc(issued.username)}</b></dd><dt>Temporary password</dt><dd><code class="pw">${esc(issued.password)}</code></dd></dl></div>` : '';
  return `<section><h2>The Minister's Study</h2>${studyNav(me, 'officers')}
  ${issuedBox}
  <div class="section-label">Officers Upon the Rolls</div>
  <div class="tablewrap"><table class="ledger"><thead><tr><th>Officer</th><th>Rank</th><th>Standing</th><th></th></tr></thead><tbody>${roster}</tbody></table></div>
  <div class="section-label">Enter a New Officer</div>
  <form class="writ" method="post" action="/admin/officers" style="max-width:820px">${h}
    <div class="field"><label class="l" for="nu">Username <span class="req">*</span></label><input type="text" id="nu" name="username" required pattern="[A-Za-z0-9._\\-]{3,32}" placeholder="e.g. aldric.venn" autocomplete="off"></div>
    <div class="field"><label class="l" for="nn">Name <span class="req">*</span></label><input type="text" id="nn" name="name" required maxlength="80" placeholder="As it should appear on writs"></div>
    <div class="field"><label class="l" for="nr">Rank <span class="req">*</span></label><select id="nr" name="rank" class="sel" required><option value="">Choose a rank…</option>${rankOptions(ranks, '', me)}</select></div>
    <div class="field"><label class="l" for="no">Office title</label><input type="text" id="no" name="office" maxlength="120" placeholder="Leave blank to use the rank name"></div>
    <div class="field"><span class="l">Holds</span><div>${holdChecks('holds', [])}<p class="hint" style="margin-top:6px">Delegate ranks bring their own Holds if none are ticked.</p></div></div>
    <div class="submitbar"><button class="btn" type="submit">Enter upon the rolls</button><span class="hint" style="margin:0">A temporary password is issued and shown once.</span></div>
  </form></section>`;
}

function ranksPage(ranks, counts, csrf, me) {
  const h = hidden(csrf);
  const checks = r => Ranks.PERMS.map(([g, list]) => `<fieldset class="permset"><legend>${esc(g)}</legend>${list.map(([k, l]) => `<label class="checkline"><input type="checkbox" name="perms" value="${k}"${r.all || (r.perms || []).includes(k) ? ' checked' : ''}${r.locked ? ' disabled' : ''}> ${esc(l)}</label>`).join('')}</fieldset>`).join('')
    + `<fieldset class="permset"><legend>Offices (writs they may file and records they may read)</legend>${DEPTS.map(d => `<label class="checkline"><input type="checkbox" name="depts" value="${d.id}"${r.all || (r.depts || []).includes(d.id) ? ' checked' : ''}${r.locked ? ' disabled' : ''}> ${esc(d.title)}</label>`).join('')}</fieldset>`;
  const block = (r, i) => `<details class="rank"${r.id === 'new' ? ' open' : ''}><summary><span class="rk-name">${esc(r.name)}</span><span class="small">${esc(r.group)} · ${counts[r.id] || 0} officer${counts[r.id] === 1 ? '' : 's'}${r.locked ? ' · every power' : ''}</span></summary>
    <form method="post" action="/admin/ranks/${esc(r.id)}" class="rank-form">${h}
      <div class="field"><label class="l">Rank name</label><input type="text" name="name" value="${esc(r.name)}" maxlength="90" required></div>
      <div class="field"><label class="l">Second line</label><input type="text" name="subtitle" value="${esc(r.subtitle || '')}" maxlength="90" placeholder="e.g. First Ministerial Secretary"></div>
      <div class="field"><label class="l">Belongs to</label><select name="group" class="sel">${Ranks.GROUPS.map(g => `<option${g === r.group ? ' selected' : ''}>${esc(g)}</option>`).join('')}</select></div>
      <div class="field"><span class="l">Directory</span><label class="checkline"><input type="checkbox" name="directory" value="1"${r.directory ? ' checked' : ''}> Shown in the public Directory</label></div>
      ${r.locked ? '<p class="hint">The Minister holds every power and sees every tab. Only the name may be changed.</p>' : ''}
      <div class="permgrid">${checks(r)}</div>
      ${r.locked ? '' : `<div class="field"><span class="l">Holds given with the rank</span>${holdChecks('holds', r.holds)}</div>`}
      <div class="submitbar"><button class="btn" type="submit">Save the rank</button></div>
    </form>
    <div class="linkrow">${i > 0 ? `<form method="post" action="/admin/ranks/${esc(r.id)}/up" class="inline">${h}<button class="btn small ghost" type="submit">Move up</button></form>` : ''}<form method="post" action="/admin/ranks/${esc(r.id)}/down" class="inline">${h}<button class="btn small ghost" type="submit">Move down</button></form>${r.locked ? '' : `<form method="post" action="/admin/ranks/${esc(r.id)}/remove" class="inline">${h}<button class="btn small ghost" type="submit"${counts[r.id] ? ' disabled title="Officers hold this rank"' : ''}>Remove the rank</button></form>`}</div>
  </details>`;
  return `<section><h2>Ranks &amp; Access</h2>${studyNav(me, 'ranks')}
  <p class="lede">Each rank sees only the tabs and powers ticked here. Rename a rank and every officer who holds it takes the new name at once.</p>
  ${Ranks.GROUPS.map(g => { const list = ranks.filter(r => r.group === g); return list.length ? `<div class="section-label">${esc(g)}</div>${list.map(r => block(r, ranks.indexOf(r))).join('')}` : ''; }).join('')}
  <div class="section-label">Create a Rank</div>
  <form class="writ" method="post" action="/admin/ranks" style="max-width:820px">${h}
    <div class="field"><label class="l" for="rn">Rank name <span class="req">*</span></label><input type="text" id="rn" name="name" required maxlength="90"></div>
    <div class="field"><label class="l" for="rg">Belongs to</label><select id="rg" name="group" class="sel">${Ranks.GROUPS.map(g => `<option>${esc(g)}</option>`).join('')}</select></div>
    <div class="field"><label class="l" for="rc">Begin with the access of</label><select id="rc" name="copy" class="sel"><option value="">Nothing but My Desk</option>${ranks.filter(r => !r.locked).map(r => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</select></div>
    <div class="submitbar"><button class="btn" type="submit">Create the rank</button></div>
  </form></section>`;
}

function settingsPage(s, g, laws, csrf, me, today) {
  const h = hidden(csrf);
  const cal = s.calendar || {};
  return `<section><h2>Seal, Calendar &amp; Laws</h2>${studyNav(me, 'settings')}
  <div class="section-label">The Minister’s Seal</div>
  <div class="two">
    <div class="panel double" style="text-align:center"><img src="/seal/minister" alt="The seal set on writs you seal" class="seal-preview"><p class="hint">${s.ministerSeal ? 'Your own seal. It is set on every writ you seal or approve.' : 'The Ministry’s wax seal. Send your own and it will be set on every writ you seal or approve.'}</p></div>
    <form class="writ" method="post" action="/admin/settings/seal" id="sealf">${h}
      <div class="field"><label class="l" for="sf">Your seal picture</label><input type="file" id="sf" accept="image/png,image/jpeg"><input type="hidden" name="image" id="sd"></div>
      <p class="hint">A PNG with a clear background looks best. Up to 1.5 MB. Other officers’ writs keep the Ministry’s wax seal.</p>
      <div class="submitbar"><button class="btn" type="submit">Set my seal</button>${s.ministerSeal ? `<button class="btn ghost" type="submit" name="clear" value="1" formnovalidate>Go back to the Ministry seal</button>` : ''}</div>
    </form>
  </div>
  <div class="section-label">The Calendar</div>
  <form class="writ" method="post" action="/admin/settings/calendar" style="max-width:820px">${h}
    <p class="hint">Today reads: <b>${esc(today.text)}</b></p>
    <div class="field"><span class="l">Keep the date</span><div class="opts"><label><input type="radio" name="mode" value="real"${cal.mode !== 'set' ? ' checked' : ''}> By the real calendar (the 26th of September is the 26th of Hearthfire)</label><label><input type="radio" name="mode" value="set"${cal.mode === 'set' ? ' checked' : ''}> From a date I set, moving on each day</label></div></div>
    <div class="field"><label class="l" for="cy">Year of the Fourth Era</label><input type="number" id="cy" name="year" min="1" max="999" value="${esc(cal.year || '')}"></div>
    <div class="field"><span class="l">Today is (if set)</span><div class="datebox"><select name="weekday" class="sel" aria-label="Weekday">${DAYS.map((d, i) => `<option value="${i}"${String(cal.weekday) === String(i) ? ' selected' : ''}>${d}</option>`).join('')}</select><span class="dsep">the</span><input type="number" name="day" min="1" max="31" value="${esc(cal.day || today.day)}" aria-label="Day"><span class="dsep">of</span><select name="month" class="sel" aria-label="Month">${MONTHS.map((m, i) => `<option value="${i}"${String(cal.month ?? today.month) === String(i) ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select></div></div>
    <div class="field"><label class="l" for="cr">In-game days per real day</label><input type="number" id="cr" name="rate" min="0" max="30" step="0.5" value="${esc(cal.rate || 1)}"></div>
    <div class="submitbar"><button class="btn" type="submit">Set the calendar</button></div>
  </form>
  <div class="section-label">Retention of Records</div>
  <form class="writ" method="post" action="/admin/settings/retention" style="max-width:820px">${h}
    <div class="field"><label class="l" for="rd">Days a closed record waits before the Archives</label><input type="number" id="rd" name="days" min="0" max="3650" value="${esc(s.retentionDays)}"></div>
    <div class="submitbar"><button class="btn" type="submit">Set</button><a class="btn ghost" href="/staff/archive-due">See what is due</a></div>
  </form>
  <div class="section-label">The Ledger of Laws</div>
  <p class="hint">These entries make up the public Ledger of Laws.</p>
  ${laws.map((l, i) => `<details class="rank"><summary><span class="rk-name">${esc(l.title)}</span><span class="small">${esc(l.cite || '')}</span></summary>
    <form method="post" action="/admin/settings/laws/${i}" class="rank-form">${h}
      <div class="field"><label class="l">Title</label><input type="text" name="title" value="${esc(l.title)}" maxlength="120" required></div>
      <div class="field"><label class="l">Citation</label><input type="text" name="cite" value="${esc(l.cite || '')}" maxlength="120"></div>
      <div class="field"><label class="l">In plain words</label><textarea name="summary" rows="4" maxlength="2000" required>${esc(l.summary)}</textarea></div>
      <div class="field"><label class="l">Its limits</label><textarea name="limits" rows="2" maxlength="1000">${esc(l.limits || '')}</textarea></div>
      <div class="submitbar"><button class="btn" type="submit" name="act" value="save">Save</button><button class="btn ghost" type="submit" name="act" value="up" formnovalidate>Move up</button><button class="btn ghost" type="submit" name="act" value="remove" formnovalidate>Remove</button></div>
    </form></details>`).join('')}
  <form class="writ" method="post" action="/admin/settings/laws/new" style="max-width:820px;margin-top:14px">${h}
    <div class="field"><label class="l" for="lt">New entry title</label><input type="text" id="lt" name="title" maxlength="120" required></div>
    <div class="field"><label class="l" for="lc">Citation</label><input type="text" id="lc" name="cite" maxlength="120"></div>
    <div class="field"><label class="l" for="ls">In plain words</label><textarea id="ls" name="summary" rows="3" maxlength="2000" required></textarea></div>
    <div class="field"><label class="l" for="ll">Its limits</label><textarea id="ll" name="limits" rows="2" maxlength="1000"></textarea></div>
    <div class="submitbar"><button class="btn" type="submit" name="act" value="save">Add to the Ledger</button></div>
  </form>
  <div class="section-label">Google Archives</div>
  <div class="panel double">
    ${!g.configured ? '<p class="status-no" style="margin:0">Not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on Railway.</p>' : g.connected ? `<p class="status-ok" style="margin:0 0 6px">Connected${g.email ? ' as ' + esc(g.email) : ''}.</p><p style="margin:0">Filed writs are written into your Drive folders. Officers read them here without Drive access.</p>` : '<p class="status-no" style="margin:0">Not connected. Writs cannot be filed until you connect.</p>'}
    <div class="linkrow">${g.configured ? `<a class="btn" href="/admin/google/connect">${g.connected ? 'Reconnect' : 'Connect Google'}</a>` : ''}${g.connected && !g.fromEnv ? `<form method="post" action="/admin/google/disconnect" class="inline">${h}<button class="btn ghost" type="submit">Disconnect</button></form>` : ''}${g.docketId ? `<a class="btn ghost" href="https://docs.google.com/spreadsheets/d/${esc(g.docketId)}/edit" target="_blank" rel="noopener">Open the Docket sheet</a>` : ''}</div>
  </div>
  <script>document.getElementById('sf').addEventListener('change',function(){var f=this.files[0];if(!f)return;var r=new FileReader();r.onload=function(){document.getElementById('sd').value=r.result;};r.readAsDataURL(f);});</script>
  </section>`;
}

module.exports = { study, ranksPage, settingsPage };
