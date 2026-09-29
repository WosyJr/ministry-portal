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
  if (me.all) items.push(['/province', 'Every Login', 'people'], ['/admin/ranks', 'Ranks & Access', 'ranks'], ['/admin/settings', 'Seal, Calendar & Laws', 'settings'], ['/admin/forms', 'Writ Templates', 'forms']);
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
        <label class="l">Weekly pay <input type="number" step="0.01" min="0" name="weekly" value="${esc(String(u.weekly || 0))}"></label>
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
  <p class="lede">The officers of Civil &amp; Administrative Affairs. Officers of the other Ministries are kept by those Ministries; ${me.all ? '<a href="/province">every login in the province</a> is listed together' : 'every login is listed together in the Study'}, and a login may be given there to somebody who serves no Ministry at all.</p>
  <div class="section-label">Officers Upon the Rolls</div>
  <div class="tablewrap"><table class="ledger"><thead><tr><th>Officer</th><th>Rank</th><th>Standing</th><th></th></tr></thead><tbody>${roster}</tbody></table></div>
  <div class="section-label">Enter a New Officer</div>
  <form class="writ" method="post" action="/admin/officers" style="max-width:820px">${h}
    <div class="field"><label class="l" for="nu">Username <span class="req">*</span></label><input type="text" id="nu" name="username" required pattern="[A-Za-z0-9._\\-]{3,32}" placeholder="e.g. aldric.venn" autocomplete="off"></div>
    <div class="field"><label class="l" for="nn">Name <span class="req">*</span></label><input type="text" id="nn" name="name" required maxlength="80" placeholder="As it should appear on writs"></div>
    <div class="field"><label class="l" for="nr">Rank <span class="req">*</span></label><select id="nr" name="rank" class="sel" required><option value="">Choose a rank…</option>${rankOptions(ranks, '', me)}</select></div>
    <div class="field"><label class="l" for="no">Office title</label><input type="text" id="no" name="office" maxlength="120" placeholder="Leave blank to use the rank name"></div>
    <div class="field"><label class="l" for="nw">Weekly pay</label><input type="number" step="0.01" min="0" id="nw" name="weekly" placeholder="What the Treasury pays them each week"></div>
    <div class="field"><span class="l">Holds</span><div>${holdChecks('holds', [])}<p class="hint" style="margin-top:6px">Delegate ranks bring their own Holds if none are ticked.</p></div></div>
    <div class="submitbar"><button class="btn" type="submit">Enter upon the rolls</button><span class="hint" style="margin:0">A temporary password is issued and shown once.</span></div>
  </form></section>`;
}


// ---------------------------------------------------------------------------
// Every login in the province, wherever they serve
// ---------------------------------------------------------------------------
// Before each Ministry had its own door, the only way to give anybody a login
// was to enter them upon the Civil Affairs roll. That put Hold officers, Legion
// command and envoys on a roll they never belonged to — and now that the
// Treasury reads those rolls, on a wage bill they never belonged to either.
// This page shows every login at once and moves people where they belong.

function peoplePage(users, ranks, csrf, me, issued, filter, standalone) {
  const h = hidden(csrf);
  // The same page is served from inside the Study and from the front of the
  // portal, so every link it makes must come back to wherever it was opened.
  const here = standalone ? '/province' : '/admin/people';
  const byBranch = {};
  Ranks.BRANCHES.forEach(b => { byBranch[b.id] = []; });
  users.forEach(u => {
    const r = ranks.find(x => x.id === u.rank);
    const bid = Ranks.branchOf(r);
    (byBranch[bid] = byBranch[bid] || []).push({ ...u, rankRec: r, branch: bid });
  });
  const branchName = id => (Ranks.BRANCHES.find(b => b.id === id) || {}).name || id;
  const shortName = id => (Ranks.BRANCHES.find(b => b.id === id) || {}).short || id;

  const shown = filter.branch && byBranch[filter.branch] ? { [filter.branch]: byBranch[filter.branch] } : byBranch;
  const q = String(filter.q || '').toLowerCase();
  const match = u => !q || (u.name + ' ' + u.username + ' ' + (u.office || '') + ' ' + (u.rankName || '')).toLowerCase().includes(q);

  // A rank may only be given if it exists; the Minister may give any of them.
  const rankPicker = (name, cur) => `<select name="${name}" class="sel">${Ranks.BRANCHES.map(b => {
    const mine = ranks.filter(r => Ranks.branchOf(r) === b.id);
    return mine.length ? `<optgroup label="${esc(b.name)}">${mine.map(r => `<option value="${esc(r.id)}"${r.id === cur ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</optgroup>` : '';
  }).join('')}</select>`;

  const row = u => `<tr${u.active ? '' : ' class="dim"'}>
    <td><b>${esc(u.name)}</b><br><span class="small">${esc(u.username)}</span></td>
    <td>${esc(u.rankName)}${u.office ? `<br><span class="small">${esc(u.office)}</span>` : ''}</td>
    <td><span class="chip${u.branch === 'general' ? '' : ' ok'}">${esc(shortName(u.branch))}</span></td>
    <td class="num">${u.weekly ? Number(u.weekly).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '<span class="dash">\u2014</span>'}</td>
    <td>${u.active ? '' : '<span class="chip">Suspended</span> '}${u.mustChange ? '<span class="chip">New password due</span> ' : ''}<span class="small">${u.lastLogin ? 'Last entered ' + esc(u.lastLogin.slice(0, 10)) : 'Never entered'}</span></td>
    <td class="actions-col">
      ${u.username === me.username || (u.rank === 'minister' && !me.all) ? '<span class="small">Kept by the Minister</span>' : `
      <details class="inlinedit"><summary class="btn ghost small">Move</summary>
        <form method="post" action="/admin/people/${encodeURIComponent(u.username)}/move" class="stack">${h}
          <p class="hint">Giving them a rank of another Ministry moves them to that Ministry\u2019s roll, and off this one.</p>
          <label class="l">Rank ${rankPicker('rank', u.rank)}</label>
          <label class="l">Office title <input type="text" name="office" value="${esc(u.office || '')}" maxlength="120" placeholder="Leave blank to use the rank"></label>
          <label class="l">Weekly pay <input type="number" step="0.01" min="0" name="weekly" value="${esc(String(u.weekly || 0))}"></label>
          <button class="btn small" type="submit">Move them</button>
        </form>
      </details>
      <form method="post" action="/admin/people/${encodeURIComponent(u.username)}/reset" class="inline">${h}<button class="btn ghost small" type="submit">Reset password</button></form>
      <form method="post" action="/admin/people/${encodeURIComponent(u.username)}/${u.active ? 'suspend' : 'restore'}" class="inline">${h}<button class="btn ghost small" type="submit">${u.active ? 'Suspend' : 'Restore'}</button></form>`}
    </td></tr>`;

  const strays = (byBranch.civil || []).filter(u => {
    const g = (u.rankRec || {}).group || '';
    return g === 'Other Ministries' || g === 'Crown & Council';
  });

  const issuedBox = issued ? `<div class="card" style="margin-bottom:18px"><div class="eyebrow">${issued.fresh ? 'Login given' : 'Password reset'}</div>
    <p style="margin:8px 0">Give these to <b>${esc(issued.name)}</b> privately. This password is shown only once. They must choose their own at first entry.</p>
    <dl class="meta"><dt>Username</dt><dd><b>${esc(issued.username)}</b></dd><dt>Temporary password</dt><dd><code class="pw">${esc(issued.password)}</code></dd></dl></div>` : '';

  const counts = Ranks.BRANCHES.map(b => [b, (byBranch[b.id] || []).length]);

  return `<section>${standalone ? '' : `<h2>The Minister\u2019s Study</h2>${studyNav(me, 'people')}`}
  ${issuedBox}
  <p class="lede">Every login in the province, wherever the holder serves. A login no longer has to be a Civil Affairs appointment: give a pass to someone who serves no Ministry, or move somebody to the Ministry they actually belong to.</p>

  ${strays.length ? `<div class="notice">
    <b>${strays.length} ${strays.length === 1 ? 'person is' : 'people are'} upon the Civil Affairs roll but hold no Civil Affairs office.</b>
    <p style="margin:6px 0 0">${esc(strays.map(u => u.name).join(', '))}. They were likely entered here only to be given a login. Move them to their own Ministry, or give them a pass without one \u2014 otherwise the Treasury counts their wages against Civil Affairs.</p>
  </div>` : ''}

  <div class="rfilters" style="margin:14px 0">
    <a class="rfilter${filter.branch ? '' : ' on'}" href="${here}">All ${users.length}</a>
    ${counts.map(([b, n]) => `<a class="rfilter${filter.branch === b.id ? ' on' : ''}" href="${here}?branch=${esc(b.id)}">${esc(b.short)} ${n}</a>`).join('')}
  </div>

  <form class="filters" method="get" action="${here}">
    ${filter.branch ? `<input type="hidden" name="branch" value="${esc(filter.branch)}">` : ''}
    <input type="search" name="q" value="${esc(filter.q || '')}" placeholder="A name, a username or an office">
    <button class="btn" type="submit">Search</button>${filter.q ? `<a class="btn ghost" href="${here}${filter.branch ? '?branch=' + esc(filter.branch) : ''}">Clear</a>` : ''}
  </form>

  ${Object.keys(shown).filter(k => (shown[k] || []).filter(match).length).map(k => `
    <div class="section-label">${esc(branchName(k))}</div>
    <div class="tablewrap"><table class="ledger peopletable"><thead><tr><th>Person</th><th>Rank</th><th>Ministry</th><th class="num">Weekly pay</th><th>Standing</th><th></th></tr></thead><tbody>
      ${shown[k].filter(match).map(row).join('')}
    </tbody></table></div>`).join('') || '<p class="lede">Nobody answers to that.</p>'}

  <div class="section-label">Give a Login to Someone Who Serves No Ministry</div>
  <p class="hint">They get a way in and their own desk, and nothing else. No Ministry\u2019s roll carries them, and no wage bill counts them.</p>
  <form class="writ" method="post" action="/admin/people" style="max-width:820px">${h}
    <div class="field"><label class="l" for="pu">Username <span class="req">*</span></label><input type="text" id="pu" name="username" required pattern="[A-Za-z0-9._\\-]{3,32}" placeholder="e.g. icanth.fyndmisord" autocomplete="off"></div>
    <div class="field"><label class="l" for="pn">Name <span class="req">*</span></label><input type="text" id="pn" name="name" required maxlength="80"></div>
    <div class="field"><label class="l" for="pr">Rank <span class="req">*</span></label>${rankPicker('rank', 'pass').replace('id="pr"', '')}</div>
    <div class="field"><label class="l" for="po">Office title</label><input type="text" id="po" name="office" maxlength="120" placeholder="e.g. Imperial Guard Command"></div>
    <div class="submitbar"><button class="btn" type="submit">Give them a login</button><span class="hint" style="margin:0">A temporary password is issued and shown once.</span></div>
  </form></section>`;
}

function ranksPage(ranks, counts, csrf, me, standalone) {
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
  return `<section>${standalone ? '' : `<h2>Ranks &amp; Access</h2>${studyNav(me, 'ranks')}`}
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

function settingsPage(s, g, laws, csrf, me, today, standalone, site) {
  const h = hidden(csrf);
  const cal = s.calendar || {};
  return `<section>${standalone ? '' : `<h2>Seal, Calendar &amp; Laws</h2>${studyNav(me, 'settings')}`}
  ${site ? `<div class="section-label">Where the Portal Answers</div>
  <p class="lede">The portal is reached at <b><a href="${esc(site.url)}">${esc(site.url)}</a></b>.${site.fixed
    ? ' That address is set in <code>BASE_URL</code> and is what the portal calls itself wherever it must print its own address.'
    : ' Nothing is configured, so the portal takes the address from whatever domain it is reached through \u2014 which is what you want behind Railway and Cloudflare. Set <code>BASE_URL</code> only if you need it pinned to one address, and note that Google sign-in needs it set to match the callback you registered.'}</p>` : ''}
  <div class="section-label">The Front Page</div>
  <p class="lede">How the Ministries are set out to anyone who arrives at the portal. Either way the same halls and the same links are there; only the look changes, and it changes back the moment you set it back.</p>
  <form class="writ" method="post" action="/admin/settings/landing">${h}
    <div class="field"><label class="l" for="ldg">Show the Ministries as</label>
      <select id="ldg" name="landing">
        <option value="cards"${s.landing !== 'books' ? ' selected' : ''}>Cards — a notice for each Ministry, side by side</option>
        <option value="books"${s.landing === 'books' ? ' selected' : ''}>Books — four volumes on the desk, each opening to its hall</option>
      </select>
    </div>
    <div class="field"><label class="l" for="grd">The ground the halls stand on</label>
      <select id="grd" name="pageGround">
        <option value="lamplit"${s.pageGround !== 'parchment' ? ' selected' : ''}>Lamplit \u2014 a deeper parchment with the lamp above it</option>
        <option value="parchment"${s.pageGround === 'parchment' ? ' selected' : ''}>Plain parchment \u2014 the lighter ground the portal began with</option>
      </select>
    </div>
    <div class="linkrow"><button class="btn" type="submit">Set the front page</button><a class="btn ghost" href="/" target="_blank" rel="noopener">Look at it ↗</a></div>
  </form>

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
  <script>document.getElementById('sf').addEventListener('change',function(){var f=this.files[0];if(!f)return;if(f.size>1500000){alert('That picture is too large. Keep it under 1.5 MB.');this.value='';return;}var r=new FileReader();r.onload=function(){document.getElementById('sd').value=r.result;};r.readAsDataURL(f);});</script>
  </section>`;
}

function formsPage(list, folderNames, depts, csrf, me, editing, standalone) {
  const h = hidden(csrf);
  const e = editing || {};
  const sections = e.sections || [];
  const sig = Array.isArray(e.sig) ? e.sig.join('\n') : (e.sig || '');
  const sectionBlock = (i) => {
    const s = sections[i] || {};
    const kind = s.kind === 'paragraph' ? 'paragraph' : 'fields';
    const fields = s.fields || [];
    return `<details class="rank"${s.h ? '' : i === 0 && !sections.length ? ' open' : ''}><summary><span class="rk-name">${s.h ? esc(s.h) : 'Section ' + (i + 1) + ' (unused)'}</span></summary>
    <div class="field"><label class="l">Heading</label><input type="text" name="sh${i}" value="${esc(s.h || '')}" maxlength="100" placeholder="e.g. The Traveler"></div>
    <div class="field"><span class="l">Kind</span><div class="opts"><label><input type="radio" name="skind${i}" value="fields"${kind === 'fields' ? ' checked' : ''}> A set of fields</label><label><input type="radio" name="skind${i}" value="paragraph"${kind === 'paragraph' ? ' checked' : ''}> One open paragraph</label></div></div>
    <div class="field"><label class="l">Paragraph lines (if a paragraph)</label><input type="number" name="slines${i}" min="1" max="10" value="${esc(s.lines || 4)}" style="max-width:120px"></div>
    <p class="hint" style="margin:10px 0 6px">Fields, if this section is a set of fields:</p>
    <div class="tablewrap"><table class="gridin"><thead><tr><th>Label</th><th>Type</th><th>Choices (if Choice)</th><th>Required</th></tr></thead><tbody>
    ${[0, 1, 2, 3, 4, 5].map(j => { const f = fields[j] || {}; return `<tr><td><input type="text" name="f${i}_${j}_label" value="${esc(f.label || '')}" maxlength="100" placeholder="Field ${j + 1}"></td><td><select name="f${i}_${j}_type" class="sel"><option value="text"${(!f.type || f.type === 'text') ? ' selected' : ''}>Text</option><option value="date"${f.type === 'date' ? ' selected' : ''}>Date</option><option value="options"${f.type === 'options' ? ' selected' : ''}>Choice</option></select></td><td><input type="text" name="f${i}_${j}_options" value="${esc(f.options || '')}" placeholder="Yes, No, Other"></td><td style="text-align:center"><input type="checkbox" name="f${i}_${j}_required" value="1"${f.required ? ' checked' : ''}></td></tr>`; }).join('')}
    </tbody></table></div></details>`;
  };
  const list_ = list.map(entry => `<tr><td><b>${esc(entry.title)}</b><br><span class="small">${esc(entry.num)} · ${esc(folderNames[entry.folder] || entry.folder)}</span></td>
    <td>${(entry.depts || []).length ? esc((entry.depts || []).map(id => { const d = depts.find(x => x.id === id); return d ? d.title : id; }).join(', ')) : '<span class="small">No office may file it yet</span>'}</td>
    <td><div class="linkrow"><a class="btn small ghost" href="/admin/forms/${esc(entry.id)}/edit">Edit</a><form method="post" action="/admin/forms/${esc(entry.id)}/delete" class="inline" onsubmit="return confirm('Remove this writ template? Records already filed under it stay on the Docket.');">${h}<button class="btn small ghost" type="submit">Remove</button></form></div></td></tr>`).join('');
  return `<section>${standalone ? '' : `<h2>Writ Templates</h2>${studyNav(me, 'forms')}`}
  <p class="lede">Add a writ of your own devising, beyond the Ministry's built-in instruments. It files, seals and reads back exactly like the others, and its documents are written into a chest of the Archives you choose here.</p>
  ${list.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>Writ</th><th>May be filed by</th><th></th></tr></thead><tbody>${list_}</tbody></table></div>` : '<p class="lede">No writ template has been added yet.</p>'}
  <div class="section-label">${e.id ? 'Amend a Writ Template' : 'Add a Writ Template'}</div>
  <form class="writ" method="post" action="/admin/forms" style="max-width:900px">${h}${e.id ? `<input type="hidden" name="id" value="${esc(e.id)}">` : ''}
    <fieldset><legend><span class="rn">I.</span> The Writ</legend>
      <div class="field"><label class="l" for="ft">Title <span class="req">*</span></label><input type="text" id="ft" name="title" value="${esc(e.title || '')}" maxlength="140" required placeholder="e.g. Writ of Safe Passage"></div>
      <div class="field"><label class="l" for="fs">Subtitle</label><input type="text" id="fs" name="subtitle" value="${esc(e.subtitle || '')}" maxlength="200"></div>
      <div class="field"><label class="l" for="fn">Record class <span class="req">*</span></label><input type="text" id="fn" name="num" value="${esc(e.num || '')}" maxlength="40" required placeholder="e.g. Safe Passage — appears as “Safe Passage I”, “II”…"></div>
      <div class="field"><label class="l" for="ff">Chest of the Archives <span class="req">*</span></label><select id="ff" name="folder" class="sel" required><option value="">Choose…</option>${Object.entries(folderNames).filter(([k]) => k !== 'root' && k !== 'templates').map(([k, n]) => `<option value="${esc(k)}"${e.folder === k ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
      <div class="field"><label class="l" for="fp">Preamble</label><textarea id="fp" name="preamble" rows="3" maxlength="1200" placeholder="The opening words read at the top of the writ.">${esc(e.preamble || '')}</textarea></div>
      <div class="field"><label class="l" for="fa">Authority (optional)</label><input type="text" id="fa" name="authority" value="${esc(e.authority || '')}" maxlength="400" placeholder="What gives the Ministry the right to issue this"></div>
      <div class="field"><label class="l" for="fl">Limitation (optional)</label><input type="text" id="fl" name="limitation" value="${esc(e.limitation || '')}" maxlength="400" placeholder="What this writ cannot do"></div>
      <div class="field"><span class="l">Public</span><label class="checkline"><input type="checkbox" name="publicCapable" value="1"${e.publicCapable ? ' checked' : ''}> May be posted to the public Notice Board / Record Lookup when filed</label></div>
    </fieldset>
    <fieldset><legend><span class="rn">II.</span> Who May File It</legend>
      <p class="hint">Tick the offices whose officers may file this writ. An office not ticked cannot see or file it.</p>
      <div class="opts">${depts.map(d => `<label><input type="checkbox" name="depts" value="${esc(d.id)}"${(e.depts || []).includes(d.id) ? ' checked' : ''}> ${esc(d.title)}</label>`).join('')}</div>
    </fieldset>
    <fieldset><legend><span class="rn">III.</span> Its Sections</legend>
      <p class="hint">Up to five sections. The first field of the first fielded section becomes the record's subject; the first paragraph section becomes its public summary. Leave a heading blank to skip a section.</p>
      ${[0, 1, 2, 3, 4].map(sectionBlock).join('')}
    </fieldset>
    <fieldset><legend><span class="rn">IV.</span> Signatures</legend>
      <div class="field"><label class="l" for="fg">Who signs it, one per line <span class="req">*</span></label><textarea id="fg" name="sig" rows="3" maxlength="400" required placeholder="Issuing Officer&#10;Recipient">${esc(sig)}</textarea></div>
    </fieldset>
    <div class="submitbar"><button class="btn" type="submit">${e.id ? 'Save the writ template' : 'Add the writ template'}</button>${e.id ? '<a class="btn ghost" href="/admin/forms">Cancel</a>' : ''}</div>
  </form></section>`;
}

module.exports = { study, peoplePage, ranksPage, settingsPage, formsPage };
