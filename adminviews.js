const Ranks = require('./ranks');
const V = require('./views');
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
      ${u.discord ? `<p class="hint" style="margin:10px 0 0">Discord: <b>${esc(u.discord.name || u.discord.username)}</b>${u.discord.username ? ' (@' + esc(u.discord.username) + ')' : ''}. They may enter the hall with it.</p>` : '<p class="hint" style="margin:10px 0 0">No Discord linked. They enter by name and password.</p>'}
      <div class="linkrow">${post(u.username, 'reset', 'Reset password', 'ghost')}${u.discord && me.all ? post(u.username, 'unlink-discord', 'Unlink Discord', 'ghost') : ''}${u.username === me.username ? '' : (u.active ? post(u.username, 'suspend', 'Suspend', 'ghost') : post(u.username, 'restore', 'Restore', 'ghost'))}
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
      <form method="post" action="/admin/people/${encodeURIComponent(u.username)}/${u.active ? 'suspend' : 'restore'}" class="inline">${h}<button class="btn ghost small" type="submit">${u.active ? 'Suspend' : 'Restore'}</button></form>
      <details class="inlinedit"><summary class="btn ghost small danger">Remove</summary>
        <form method="post" action="/admin/people/${encodeURIComponent(u.username)}/remove" class="stack">${h}
          <p class="hint"><b>${esc(u.name)}</b> is struck from the rolls entirely: the login stops working and the name leaves every roster and picker. Records they filed stay on the docket in their name, and this cannot be undone. To keep the name but stop the login, suspend them instead.</p>
          <button class="btn small danger" type="submit">Strike ${esc(u.name)} from the rolls</button>
        </form>
      </details>`}
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
    <div class="field"><label class="l" for="cur">The pointer</label>
      <select id="cur" name="cursor">
        <option value="standard"${s.cursor === 'standard' ? ' selected' : ''}>The ordinary arrow \u2014 whatever your own machine draws</option>
        <option value="quill"${s.cursor === 'quill' ? ' selected' : ''}>A quill \u2014 ink gathers at the nib over anything you may press</option>
        <option value="signet"${s.cursor === 'signet' ? ' selected' : ''}>The Minister\u2019s signet \u2014 the wax brightens over anything you may press</option>
        <option value="sword"${s.cursor === 'sword' ? ' selected' : ''}>An Imperial blade \u2014 it takes the light over anything you may press</option>
        <option value="key"${s.cursor === 'key' ? ' selected' : ''}>The Hall key \u2014 it brightens at a door you may open</option>
        <option value="candle"${s.cursor === 'candle' ? ' selected' : ''}>A taper \u2014 the flame flares over anything you may press</option>
        <option value="writ"${s.cursor === 'writ' ? ' selected' : ''}>A sealed writ \u2014 the wax lights over anything you may press</option>
        <option value="arrow"${s.cursor === 'arrow' ? ' selected' : ''}>The Ministry\u2019s own arrow \u2014 the plain pointer in the Ministry\u2019s colours</option>
      </select>
      <p class="hint">A drawn pointer is a matter of taste and it is the one thing on the portal that follows a person everywhere \u2014 the front page included. Each one has a second drawing for when it is over something you may press. Anyone whose own setting asks for less motion, and anyone on a touchscreen, still gets their own ordinary arrow.</p>
      <div class="handrow">${['quill','signet','sword','key','candle','writ','arrow'].map(k => `<figure class="handswatch${s.cursor === k ? ' on' : ''}"><span><img src="/cursor-${k}.png" alt="" width="32" height="32"><img src="/cursor-${k === 'quill' ? 'quill-ink' : k + '-press'}.png" alt="" width="32" height="32"></span><figcaption>${k === 'writ' ? 'Writ' : k === 'signet' ? 'Signet' : k.charAt(0).toUpperCase() + k.slice(1)}</figcaption></figure>`).join('')}</div>
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


// Every motion the portal makes, what sets it off, and a way to set it off here.
// Half of these only happen when something real happens, so this page is the
// only honest way to see them all without waiting for the weather to change.
function motionPage(set, today, season) {
  const SEASON = { snow: 'Snow', rain: 'Rain', sun: 'A warm haze', leaf: 'Falling leaves', none: 'Nothing' };
  const row = (name, where, id, note) => `<article class="reqcard motionrow">
    <div class="no">${esc(where)}</div>
    <h3>${esc(name)}</h3>
    ${note ? `<p class="hint">${note}</p>` : ''}
    ${id ? `<div class="linkrow"><button class="btn small" type="button" data-fire="${esc(id)}">Show me</button></div>
    <div class="motionstage" hidden></div>` : ''}
  </article>`;

  return `<section>
    <h2>The Motion of the Portal</h2>
    <p class="lede">Everything the portal does that moves, what sets it off, and a button to set it off here. Nothing on this page changes any setting; it only performs.</p>
    <p class="notice">Anyone whose own device asks for less motion gets none of this, on every page. That is not a setting of yours and it should not be.</p>

    <div class="section-label">What is running right now</div>
    <div class="warstats">
      <div class="warstat"><div class="n">${esc(SEASON[season] || 'Nothing')}</div><div class="t">The weather, from ${esc(today ? today.text.replace(/^[^,]+, the /, '') : 'the calendar')}</div></div>
      <div class="warstat"><div class="n">${set.pageGround === 'parchment' ? 'Plain' : 'Lamplit'}</div><div class="t">The ground under the halls</div></div>
      <div class="warstat"><div class="n">${set.landing === 'books' ? 'Books' : 'Cards'}</div><div class="t">The front page</div></div>
      <div class="warstat"><div class="n">${set.cursor === 'quill' ? 'A quill' : 'The arrow'}</div><div class="t">The pointer</div></div>
    </div>

    <div class="section-label">Always running, nothing to press</div>
    ${row('Candlelight reaches the edges', 'Every lamplit page', 'hearth', 'The top of the glass is a hair warmer than the foot, and the foot a hair cooler. It is meant to be felt rather than seen. Press to take it away and put it back.')}
    ${row('Lamplight on the seal', 'The masthead of every page', '', 'The seal at the top of this page is breathing. Watch it for six seconds.')}
    ${row('The weather', 'Every page, all year', '', 'It is <b>' + esc(today ? today.text : '') + '</b>, so the portal is giving you <b>' + esc((SEASON[season] || 'nothing').toLowerCase()) + '</b>. Set the month in Seal, Calendar &amp; Laws to see another season.')}

    <div class="section-label">Set off by something you do</div>
    ${row('The light gutters', 'Following any link', 'gutter', 'The candlelight ducks for half a second, as if a draught came through the door.')}
    ${row('The clerk is writing', 'Any link or writ that takes a moment', 'clerk', 'If the portal is more than a third of a second answering you, a card comes up in the middle of the window with a quill scratching away at it, so you know the request was heard. It clears itself when the next page arrives.')}
    ${row('The seal presses down', 'Filing or sealing any paper', 'press', 'The wax comes down on the card and the number soaks into the page after it.')}
    ${row('The seal cracks', 'A minute after it was pressed', 'crack', 'Fresh wax is whole. Left alone for a minute, it develops a hairline.')}
    ${row('A note under the door', 'Every message the portal gives back', 'flash', 'It comes in under the door rather than appearing.')}
    ${row('The bell rings', 'When something new is waiting', 'bell', 'Only when the count actually goes up, never on an ordinary page load.')}
    ${row('The standing lands', 'Verify a Paper, and on judgments', 'stamp', 'It lands crooked, as a real stamp does.')}
    ${row('Striking tears the record', 'Striking anything from a register', 'tear', 'A jagged edge, and it drops away.')}
    ${row('The rule glides', 'Every tab row', '', 'Run your pointer along the tabs at the top of this page. The gold rule travels to the tab under your hand, and drops to the second line if the row has wrapped.')}
    ${row('The quill runs dry', 'Any writ of six fields or more', '', 'The ink bar under the send button drains as you fill the form in, and re-inks the moment you send it. Open the <a href="/staff/forms">Writs</a> and start typing into a long one.')}
    ${row('Buttons press like a stamp', 'Everywhere', '', 'Press and hold any button on this page. It goes down 2px and its shadow collapses under it.')}
    ${row('Focus draws an ink line', 'Every field', '', 'Tab into a field. An ink line is drawn under it rather than a ring appearing around it.')}
    ${row('The tick is drawn by hand', 'Every checklist on a writ', '', 'A pen stroke is drawn across the box rather than a checkbox filling in.')}
    ${row('The corner curls', 'Any printable writ', '', 'Open any paper’s printable version and hover the bottom-right corner of the sheet.')}

    <div class="section-label">Set off by the page you are on</div>
    ${row('Papers settle', 'Every register', '', 'Rows drop in and straighten, one after another, on <a href="/staff/docket">the Docket</a> or any ledger.')}
    ${row('Rows glide when sorted', 'Every register', '', 'Click a column heading on <a href="/staff/docket">the Docket</a>. The rows travel to their new places rather than snapping.')}
    ${row('Records age', 'Every long register', '', 'Further down a ledger the rows sit slightly more yellowed. It reads on a register of twenty rows or more — try <a href="/finance/people">People &amp; Wages</a>.')}
    ${row('Pages remember they were read', 'Every register', '', 'Open a record from <a href="/finance/people">People &amp; Wages</a> or <a href="/staff/docket">the Docket</a>, then go back. That row is now tinted, edged, and marked <i>read</i>. It is remembered in your own browser and nowhere else.')}
    ${row('The ledger’s ribbon', 'Registers of eight rows or more', '', 'Open a row from <a href="/finance/people">People &amp; Wages</a>, then come back to it. A red ribbon is tucked against the right-hand edge of the window — pull it and it takes you to the row you left.')}
    ${row('The hold map washes in', 'The Holds', '', 'Each Hold bleeds in from its seat, one after another, on <a href="/staff/holds">the Holds</a>.')}
    ${row('The tallies run up', 'The Report', '', 'The figures count up from nothing on <a href="/justice/report">the Report</a>. Money never does this — a figure that is briefly wrong is no use on an account.')}
    ${row('The writ unrolls', 'Every printable paper', '', 'Any paper’s printable version unrolls from the top, and the name at the foot writes itself in after it.')}
    ${row('The book opens', 'The front page, set to books', '', 'Press a volume on <a href="/">the front page</a> and it opens onto its own options.')}
    ${row('A ribbon of wax down the margin', 'Long documents', '', 'Open <a href="/justice/standards">the Inquisitors’ Standards</a> and scroll. A wax ribbon down the right-hand edge shows how far through you are.')}

    <div class="section-label">The office itself</div>
    ${row('The key turns in the lock', 'The Staff Entrance', 'keyturn', 'Press <i>Enter the Hall</i> and the key in the lockplate turns a full quarter before the hall opens, and the plate warms under it.')}
    ${row('The door swings', 'The first page after entering', 'door', 'You do not simply arrive. Two leaves of a door swing back and the hall comes up behind them. Leaving the Hall shuts them again.')}
    ${row('The hour tells', 'Every page, all day', 'hourcast', 'The pages take a cool cast in the small hours, a pale one at first light, nothing at all through the working day, amber at dusk and cool again at night. It is meant to be felt and not noticed.')}
    ${row('A draught stirs the papers', 'Any page, left alone', 'draught', 'Leave the portal untouched for three minutes and the cards lift and settle a hair, one after another, as if air moved through the room. It comes back every few minutes until you touch something.')}

    <div class="section-label">Filing and paper</div>
    ${row('The blotter comes down', 'Filing or sealing any paper', 'blotter', 'A sheet of blotting paper presses down over the fresh ink, takes a little of it up, and lifts away.')}
    ${row('A record is filed away', 'Setting a record to Archived', 'fileaway', 'The row slides down out of the register and the rows above close over the gap.')}
    ${row('Dust lifts off an old record', 'Opening anything closed or archived', 'dust', 'A drift of dust lifts off the top edge as the page opens. An archived record raises more of it than one merely closed.')}
    ${row('A pin through the corner', 'Linking one record to another', 'pin', 'A brass pin is driven through the corner and settles.')}
    ${row('A second sheet peels off', 'Referring a record to another office', 'peel', 'A duplicate peels off the back of the paper and slides away to be sent on.')}

    <div class="section-label">Registers</div>
    ${row('The ledger rules itself', 'Every register of three rows or more', 'rules', 'The column rules are drawn down the page, one after another from the left, before the rows drop into them.')}
    ${row('A line is ruled through', 'Striking anything from a register', 'ruleline', 'An ink line is drawn through the row first. Only then does it tear away.')}
    ${row('The heading presses down', 'Every sortable column', 'headpress', 'Click a column heading and it goes down like a struck key before the rows travel.')}
    ${row('Overdue bleeds redder', 'Arrears and dues', 'overdue', 'A sum still owing sits a shade deeper in red the longer it has stood unpaid \u2014 a fortnight, a month, two months, four. Past four it takes a faint wash behind it as well. It is set once when the page loads and never moves.')}

    <div class="section-label">Justice and Finance</div>
    ${row('The gavel falls', 'Giving judgment', 'gavel', 'The gavel comes down on the notice and the whole page jolts a single pixel under it.')}
    ${row('The scales settle', 'Giving judgment', 'scales', 'The scales on the Ministry of Justice\u2019s own seal rock and come to rest.')}
    ${row('Coins counted out', 'Paying anyone out of the treasury', 'coins', 'Coins are stacked beside the notice, one per beat \u2014 more of them for a larger sum, or one for each head paid on a roll.')}

    <div class="section-label">Set off by the season</div>
    ${row('Frost on the glass', 'Evening Star, Morning Star, Sun’s Dawn', '', 'Ferns creep in at all four corners, and are gone by the spring.')}
    ${row('Breath on a cold page', 'The same three months', 'breath', 'A faint fog gathers in the middle of the glass every half-minute or so, spreads over the whole window in patches as real condensation does, runs a little, and thins away from the middle outward over nine seconds. It is meant to be barely there. It only exists in the deep cold; the button here shows it whatever the month.')}
    ${row('The wind gets up', 'Whenever there is weather', '', 'The gust drifts on its own over minutes. Watch the weather for a while and it will start going sideways without being told to.')}
    ${row('Rain beads on the glass', 'First Seed, Rain\u2019s Hand, Second Seed', 'beads', 'Drops catch near the top of the window, hang there a moment, then run down and leave a wet track behind them that fades. They keep coming while it rains.')}
    ${row('Ink runs when it rains', 'First Seed, Rain’s Hand, Second Seed', 'bleed', 'A heading bleeds a hair at the edge every half-minute, then dries.')}
    ${row('The date turns over', 'Midnight, in the province', 'dayturn', 'The portal asks the province for the date once a minute and rolls it the moment it changes, while you are looking at it. Press here and a date is raised beside the button and rolled over to the next day.')}

    <div class="section-label" hidden></div>
    <div id="demo-pool" hidden aria-hidden="true">
    <div class="card presscard" id="demo-press" hidden style="max-width:520px">
      <span class="presswax" aria-hidden="true">${V.waxMark()}</span>
      <div class="eyebrow">Sealed &amp; Filed</div>
      <h2 class="pressno">${'Dispatch XII'.split('').map((c, i) => `<span style="--c:${i}">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('')}</h2>
      <p class="lede presslede" style="margin:6px 0 0">A writ filed and sealed, for the look of the thing.</p>
    </div>
    <div class="flash sealed" id="demo-flash" hidden><span class="flashwax" aria-hidden="true">${V.waxMark()}</span><span>Commission I is issued to Inquisitor Valen Cassius.</span></div>
    <p id="demo-stamp" hidden><span class="verdictstamp" style="color:rgba(138,30,30,.85)">TERMINATED</span></p>
    <p style="margin:10px 0 0"><span class="bell" id="demo-bell" style="font-size:22px">\ud83d\udd14</span> <span class="hint">the bell, for the button above</span></p>
    <div class="recprev" id="demo-tear" hidden><span class="recprev-no">Warrant VII</span><span class="recprev-sub">Struck from the register</span></div>
    <h2 id="demo-bleed" hidden style="margin:0">A Writ of Inquiry, Rain\u2019s Hand</h2>
    <p id="demo-day" hidden style="margin:0"><span class="eyebrow daystamp demostamp">Tirdas, the 29th day of Hearthfire, 4E 226</span></p>
    <div class="card" id="demo-blot" hidden style="max-width:460px"><div class="eyebrow">Writ of Inquiry</div><h3 style="margin:2px 0 4px">Upon the matter of the Falkreath dispatch</h3><p class="small" style="margin:0">Entered and sealed this day by the Recording Clerk.</p></div>
    <div class="tablewrap" id="demo-rows" hidden style="max-width:560px"><table class="ledger"><thead><tr><th data-sortable>Record</th><th data-sortable>Subject</th><th data-sortable>State</th></tr></thead><tbody><tr><td>Writ I</td><td>Tolls at Dragon Bridge</td><td>Open</td></tr><tr><td>Writ II</td><td>A grant of common land</td><td>Standing</td></tr><tr><td>Writ III</td><td>The Falkreath dispatch</td><td>Closed</td></tr></tbody></table></div>
    <div class="card" id="demo-old" hidden style="max-width:460px"><div class="eyebrow">Archived \u00b7 4E 219</div><h3 style="margin:2px 0 4px">Petition XIV</h3><p class="small" style="margin:0">Taken down from the shelf after seven years.</p></div>
    <div class="card" id="demo-pin" hidden style="max-width:460px"><div class="eyebrow">Linked Records</div><h3 style="margin:2px 0 4px">Writ IX \u2014 Inquiry II</h3><p class="small" style="margin:0">Pinned one to the other.</p></div>
    <div class="card" id="demo-peel" hidden style="max-width:460px"><div class="eyebrow">Referred</div><h3 style="margin:2px 0 4px">Dispatch VII</h3><p class="small" style="margin:0">A copy goes to the Imperial War Office.</p></div>
    <p id="demo-owed" hidden style="margin:0"><span class="small">Standing unpaid:</span> <b data-owed="0">400</b> &middot; <b data-owed="1">400</b> &middot; <b data-owed="2">400</b> &middot; <b data-owed="3">400</b> &middot; <b data-owed="4">400</b> <span class="hint" style="display:block;margin-top:4px">fresh &middot; a fortnight &middot; a month &middot; two months &middot; four months</span></p>
    <div id="demo-lock" hidden><div class="lockplate"><i class="o"></i><i class="s"></i><span class="lockkey"><span class="bow"></span><span class="shaft"></span><span class="bit"></span></span></div></div>
    <div class="flash struck" id="demo-gavel" hidden>${V.gavelMark()}<span>Judgment given upon Cause IV.</span></div>
    <div id="demo-scales" hidden style="width:104px">${V.ministrySeal('justice', 'MINISTRY OF JUSTICE')}</div>
    <div class="flash sealed" id="demo-coins" hidden><span class="flashwax" aria-hidden="true">${V.waxMark()}</span><span>Nine paid, 4,050 septims in all.</span></div>
    <div id="demo-clerk" hidden><div class="qnib-demo"><svg viewBox="0 0 24 24" fill="none" stroke="#6B1414" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3-1 5-3 7-6"/><path d="M10 15c4-1 8-5 10-12-7 2-11 6-12 10z"/><path d="M13 9l3-3"/></svg><span>The clerk is writing…</span></div></div>
    </div>

    <div class="linkrow" style="margin-top:20px"><a class="btn ghost" href="/province/settings">Seal, Calendar &amp; Laws</a></div>
  </section>

  <script>(function(){
    function q(id){ return document.getElementById(id) || document.querySelector('[data-demo="'+id+'"]'); }
    function MM(){ return window.MinistryMotion || {}; }
    var f = {
      beads: function(){ var w=document.getElementById('beads');
        if(!w){ w=document.createElement('div'); w.id='beads'; w.setAttribute('aria-hidden','true'); document.body.appendChild(w); }
        for(var i=0;i<7;i++){ (function(n){ setTimeout(function(){
          var b=document.createElement('div'); b.className='bead';
          var r=5+Math.random()*6, fall=26+Math.random()*46;
          b.style.setProperty('--r', r.toFixed(1)+'px');
          b.style.setProperty('--fall', fall.toFixed(1)+'vh');
          b.style.setProperty('--dur', (3.6+Math.random()*4).toFixed(2)+'s');
          b.style.left=(4+Math.random()*92).toFixed(1)+'%';
          b.style.top=(1+Math.random()*22).toFixed(1)+'%';
          w.appendChild(b);
          b.addEventListener('animationend', function(e){ if(e.animationName==='beadrun') b.remove(); });
        }, n*260); })(i); }
        return 'Seven drops, over the whole window \u2014 look at the top of the glass.'; },
      hourcast: function(){
        var bands=['hour-deep','hour-dawn','hour-day','hour-dusk','hour-night'], was='';
        bands.forEach(function(b){ if(document.body.classList.contains(b)) was=b; });
        document.body.classList.remove.apply(document.body.classList, bands);
        bands.forEach(function(b,i){ setTimeout(function(){
          document.body.classList.remove.apply(document.body.classList, bands);
          document.body.classList.add(b);
        }, i*1500); });
        setTimeout(function(){
          document.body.classList.remove.apply(document.body.classList, bands);
          if(was) document.body.classList.add(was);
        }, bands.length*1500+1400);
        return 'The small hours, first light, the working day, dusk and night \u2014 one and a half seconds each, over the whole window.'; },
      draught: function(){ var n=0;
        document.querySelectorAll('.card,.panel,.reqcard,.scroll,.mincard,.act,.presscard').forEach(function(c){ c.style.setProperty('--stir',(n++)%9); });
        document.body.classList.remove('draught'); void document.body.offsetWidth;
        document.body.classList.add('draught');
        setTimeout(function(){ document.body.classList.remove('draught'); }, 2200);
        return 'Every card on this page, not only the one below.'; },
      blotter: function(st){ var c=st.querySelector('[data-demo="demo-blot"]'); if(c && MM().blotter) MM().blotter(c); },
      fileaway: function(st){ var t=st.querySelector('[data-demo="demo-rows"]'); if(!t||!MM().fileAway) return;
        var tr=t.querySelector('tbody tr:nth-child(2)'); if(!tr) return;
        MM().fileAway(tr, function(){ setTimeout(function(){ tr.classList.remove('filedaway'); tr.removeAttribute('style'); }, 900); }); },
      dust: function(st){ var c=st.querySelector('[data-demo="demo-old"]'); if(c && MM().dust) MM().dust(c, true); },
      pin: function(st){ var c=st.querySelector('[data-demo="demo-pin"]'); if(c && MM().pin) MM().pin(c); },
      peel: function(st){ var c=st.querySelector('[data-demo="demo-peel"]'); if(c && MM().peel) MM().peel(c); },
      rules: function(st){ var t=st.querySelector('[data-demo="demo-rows"]'); if(t && MM().ruleLedger) MM().ruleLedger(t); },
      ruleline: function(st){ var t=st.querySelector('[data-demo="demo-rows"]'); if(!t) return;
        var tr=t.querySelector('tbody tr:nth-child(3)'); if(!tr) return;
        tr.classList.remove('ruledthrough','tearing'); void tr.offsetWidth;
        tr.classList.add('ruledthrough');
        setTimeout(function(){ tr.classList.remove('ruledthrough'); tr.classList.add('tearing'); }, 340);
        setTimeout(function(){ tr.classList.remove('tearing'); }, 1500); },
      headpress: function(st){ var t=st.querySelector('[data-demo="demo-rows"]'); if(!t) return;
        var ths=t.querySelectorAll('th[data-sortable]');
        ths.forEach(function(th,i){ setTimeout(function(){
          th.classList.add('struck'); setTimeout(function(){ th.classList.remove('struck'); }, 200);
        }, i*320); }); },
      overdue: function(){ return 'Set once when the page loads \u2014 nothing moves.'; },
      keyturn: function(st){ var l=st.querySelector('[data-demo="demo-lock"]'); if(!l) return;
        l.classList.remove('entering'); void l.offsetWidth; l.classList.add('entering');
        setTimeout(function(){ l.classList.remove('entering'); }, 1300); },
      door: function(){ if(MM().door) MM().door(false);
        return 'Over the whole window, as it is when you first enter.'; },
      gavel: function(st){ if(MM().gavel) MM().gavel(st); },
      scales: function(st){ if(MM().scales) MM().scales(st); },
      coins: function(st){ var d=st.querySelector('[data-demo="demo-coins"]'); if(!d||!MM().coins) return;
        MM().coins(d.querySelector('span:last-of-type')||d, 9); },
      clerk: function(st){ var n=st.querySelector('[data-demo="demo-clerk"]'); if(!n) return;
        var s=n.querySelector('.qnib-demo'); s.style.animation='none'; void s.offsetWidth; s.style.animation=''; },
      hearth: function(){ var h=document.getElementById('hearth'); if(!h) return 'There is no hearth on this ground.';
        h.style.transition='opacity .5s'; h.style.opacity='0';
        setTimeout(function(){ h.style.opacity=''; }, 1600); },
      gutter: function(){ document.body.classList.add('gutter');
        setTimeout(function(){ document.body.classList.remove('gutter'); }, 520); },
      press: function(){ var c=q('demo-press'); c.hidden=false;
        c.classList.remove('presscard'); void c.offsetWidth; c.classList.add('presscard');
        var w=c.querySelector('.presswax'); w.classList.remove('cracked');
        w.style.animation='none'; void w.offsetWidth; w.style.animation='';
        c.querySelectorAll('.pressno span,.presslede').forEach(function(x){ x.style.animation='none'; void x.offsetWidth; x.style.animation=''; }); },
      crack: function(){ var c=q('demo-press'); c.hidden=false;
        c.querySelector('.presswax').classList.add('cracked'); },
      flash: function(){ var d=q('demo-flash'); d.hidden=false;
        d.style.animation='none'; void d.offsetWidth; d.style.animation=''; },
      bell: function(){ var b=q('demo-bell'); if(!b) return;
        b.classList.remove('rings'); void b.offsetWidth; b.classList.add('rings');
        setTimeout(function(){ b.classList.remove('rings'); }, 800); },
      stamp: function(){ var d=q('demo-stamp'); d.hidden=false;
        var b=d.querySelector('.verdictstamp'); b.style.animation='none'; void b.offsetWidth; b.style.animation=''; },
      tear: function(){ var d=q('demo-tear'); d.hidden=false;
        d.classList.remove('tearing'); void d.offsetWidth; d.classList.add('tearing');
        setTimeout(function(){ d.classList.remove('tearing'); }, 900); },
      breath: function(){ var b=document.getElementById('breath');
        if(!b){ b=document.createElement('div'); b.id='breath'; b.setAttribute('aria-hidden','true');
          b.innerHTML='<i class="fog"></i><i class="mottle"></i><i class="runs"></i>'; document.body.appendChild(b); }
        if(!b.children.length) b.innerHTML='<i class="fog"></i><i class="mottle"></i><i class="runs"></i>';
        b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); },
      bleed: function(st){ var h=st.querySelector('[data-demo="demo-bleed"]'); if(!h) return;
        h.classList.remove('bleeding'); void h.offsetWidth; h.classList.add('bleeding');
        var top=document.querySelector('main h2, .wrap > section h2');
        if(top){ top.classList.remove('bleeding'); void top.offsetWidth; top.classList.add('bleeding');
          setTimeout(function(){ top.classList.remove('bleeding'); }, 3400); }
        setTimeout(function(){ h.classList.remove('bleeding'); }, 3400); },
      dayturn: function(st){ var d=st.querySelector('[data-demo="demo-day"]'); if(!d) return;
        var one=d.querySelector('.daystamp');
        var days=['Sundas','Morndas','Tirdas','Middas','Turdas','Fredas','Loredas'];
        var now=one.textContent, n=(days.indexOf(now.split(',')[0])+1)%7;
        var num=parseInt((now.match(/the (\d+)/)||[0,29])[1],10)+1;
        one.classList.remove('turning'); void one.offsetWidth; one.classList.add('turning');
        setTimeout(function(){ one.textContent=days[n]+', the '+num+(num%10===1&&num!==11?'st':num%10===2&&num!==12?'nd':num%10===3&&num!==13?'rd':'th')+' day of Hearthfire, 4E 226'; }, 260);
        var top=document.querySelector('.topbar .daystamp');
        if(top){ top.classList.remove('turning'); void top.offsetWidth; top.classList.add('turning');
          setTimeout(function(){ top.classList.remove('turning'); }, 900); }
        setTimeout(function(){ one.classList.remove('turning'); }, 900); }
    };
    var needs = { press:['demo-press'], crack:['demo-press'], flash:['demo-flash'],
      stamp:['demo-stamp'], tear:['demo-tear'], bell:['demo-bell'], clerk:['demo-clerk'],
      bleed:['demo-bleed'], dayturn:['demo-day'],
      blotter:['demo-blot'], fileaway:['demo-rows'], dust:['demo-old'], pin:['demo-pin'], peel:['demo-peel'],
      rules:['demo-rows'], ruleline:['demo-rows'], headpress:['demo-rows'], overdue:['demo-owed'],
      keyturn:['demo-lock'], gavel:['demo-gavel'], scales:['demo-scales'], coins:['demo-coins'] };
    var openStage = null;
    function park(st){
      if (!st) return;
      var pool = document.getElementById('demo-pool');
      Array.prototype.slice.call(st.children).forEach(function(n){
        if (n.getAttribute('data-demo')) { n.hidden = true; pool.appendChild(n); } else { n.remove(); }
      });
      st.hidden = true;
    }
    function bring(b){
      var st = b.closest('.motionrow').querySelector('.motionstage');
      if (openStage && openStage !== st) park(openStage);
      park(st);
      var want = needs[b.dataset.fire] || [];
      want.forEach(function(id){
        var n = q(id);
        if (!n) return;
        n.setAttribute('data-demo', id); n.removeAttribute('id');
        n.hidden = false; st.appendChild(n);
      });
      st.hidden = !want.length;
      openStage = want.length ? st : null;
      return st;
    }
    document.querySelectorAll('[data-fire]').forEach(function(b){
      b.addEventListener('click', function(){
        var st = bring(b);
        var msg = f[b.dataset.fire] && f[b.dataset.fire](st);
        st.querySelectorAll('.note').forEach(function(n){ n.remove(); });
        if (msg) {
          st.hidden = false;
          st.insertAdjacentHTML('beforeend', '<p class="hint note" style="margin:6px 0 0">'+msg+'</p>');
        }
        var r = st.getBoundingClientRect();
        if (r.top < 0 || r.bottom > innerHeight) st.scrollIntoView({ block:'nearest', behavior:'smooth' });
      });
    });
  })();</script>`;
}

module.exports = { motionPage, study, peoplePage, ranksPage, settingsPage, formsPage };
