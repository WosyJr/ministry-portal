const V = require('./views');
const K = require('./staffroom');
const D = require('./staffdata');
const esc = V.esc;
const hidden = V.hidden;

const SIGIL = `<svg class="arcsigil" viewBox="0 0 120 120" aria-hidden="true">
  <g fill="none" stroke="currentColor" stroke-width="1.1">
    <circle cx="60" cy="60" r="52" opacity=".45"/>
    <circle cx="60" cy="60" r="44" opacity=".75"/>
    <circle cx="60" cy="60" r="26" opacity=".55"/>
    <path d="M60 8 L104 86 L16 86 Z" opacity=".8"/>
    <path d="M60 112 L16 34 L104 34 Z" opacity=".5"/>
  </g>
  <g fill="currentColor">
    <circle cx="60" cy="16" r="2.6"/><circle cx="104" cy="86" r="2.2"/><circle cx="16" cy="86" r="2.2"/>
    <circle cx="60" cy="104" r="2"/><circle cx="16" cy="34" r="1.8"/><circle cx="104" cy="34" r="1.8"/>
    <circle cx="60" cy="60" r="3.4"/>
  </g>
</svg>`;

function arcaneShell({ title, today, user, body, csrf, flash }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fondamento:ital@0;1&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap">
<link rel="stylesheet" href="/style.css?v=${V.CSS_V}"><link rel="icon" href="/favicon.svg">
<script src="/motion.js?v=${V.CSS_V}" defer></script></head>
<body class="arcane">
<div class="arcveil" aria-hidden="true"></div>
<canvas id="arcmotes" aria-hidden="true"></canvas>
<div class="topbar arctop">
  <span class="clock"><a class="ministries-link" href="/hall">\u2726 Back to the Ministry</a>
    <span class="eyebrow daystamp">${esc(today ? today.text : 'Fourth Era')}</span></span>
  <span class="topright">${user ? `<span class="who">${esc(user.name)}</span>
    <form method="post" action="/logout" style="display:inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Leave the Hall</button></form>` : ''}</span>
</div>
<div class="wrap arcwrap">${flash ? `<div class="flash${flash.err ? ' err' : ''}">${esc(flash.text)}</div>` : ''}${body}
<div class="foot arcfoot">Kept outside the Ministry\u2019s rolls \u2726 The Staff Room</div></div>
<script>(function(){
  // Anything that reads as a command or an id is copied by pressing it.
  function flash(el){
    el.classList.add('copied');
    setTimeout(function(){ el.classList.remove('copied'); }, 1100);
  }
  function put(text, el){
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function(){ flash(el); }, function(){ fallback(text, el); });
      return;
    }
    fallback(text, el);
  }
  function fallback(text, el){
    var a = document.createElement('textarea');
    a.value = text; a.setAttribute('readonly', '');
    a.style.position = 'fixed'; a.style.top = '-1000px';
    document.body.appendChild(a); a.select();
    try { document.execCommand('copy'); } catch (e) {}
    a.remove(); flash(el);
  }
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('.idcopy');
    if (b) { put(b.dataset.copy, b); return; }
    var c = e.target.closest && e.target.closest('.arcsection code');
    if (!c || c.closest('.idcopy')) return;
    put(c.textContent.trim(), c);
  });
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var c = e.target.closest && e.target.closest('.arcsection code');
    if (!c) return;
    e.preventDefault();
    put(c.textContent.trim(), c);
  });
  document.querySelectorAll('.arcsection code').forEach(function(c){
    if (c.closest('.idcopy')) return;
    c.tabIndex = 0;
    c.setAttribute('role', 'button');
    c.title = 'Press to copy';
  });
})();</script>
</body></html>`;
}

const TABS = [
  ['', 'Commands', 'commands'],
  ['/codes', 'Codes & Spawns', 'codes'],
  ['/hex', 'The Hex Converter', 'hex'],
  ['/orders', 'Work Orders', 'orders', false, 'sovngarde'],
  ['/guides', 'Guidelines', 'guides'],
  ['/trackers', 'Trackers', 'trackers', false, 'sovngarde'],
  ['/notices', 'Notices & Documents', 'notices'],
  ['/locations', 'Locations', 'locations'],
  ['/bestiary', 'Bestiary', 'bestiary'],
  ['/dungeons', 'Dungeons', 'dungeons'],
  ['/items', 'Item Registry', 'items'],
  ['/console', 'Console Commands', 'console'],
  ['/training', 'Staff Training', 'training'],
  ['/who', 'Who May Enter', 'who', true]
];

// One search box, one table, used by every long list in the room.
function finder(id, placeholder, note) {
  return `<div class="finder">
    <input type="search" id="${esc(id)}" class="findbox" placeholder="${esc(placeholder)}" autocomplete="off" spellcheck="false">
    <span class="findcount" id="${esc(id)}-count"></span>
    ${note ? `<span class="hint">${note}</span>` : ''}
  </div>
  <script>(function(){
    function start(){
      var box = document.getElementById(ID);
      var count = document.getElementById(ID + '-count');
      if (!box) return;
      // The table is written after this script, so the rows are only gathered
      // once the page has finished parsing.
      var rows = Array.prototype.slice.call(document.querySelectorAll('[data-find]'));
      var heads = Array.prototype.slice.call(document.querySelectorAll('[data-findgroup]'));
      var total = rows.length;
      function run(){
        var q = box.value.trim().toLowerCase();
        if (!q) {
          rows.forEach(function(r){ r.hidden = false; });
          heads.forEach(function(h){ h.hidden = false; });
          count.textContent = total + ' in all';
          return;
        }
        var terms = q.split(/\\s+/);
        var n = 0;
        rows.forEach(function(r){
          var hay = (r.getAttribute('data-find') || '').toLowerCase();
          var ok = terms.every(function(t){ return hay.indexOf(t) > -1; });
          r.hidden = !ok;
          if (ok) n++;
        });
        heads.forEach(function(h){
          var g = h.getAttribute('data-findgroup');
          h.hidden = !rows.some(function(r){ return !r.hidden && r.getAttribute('data-ingroup') === g; });
        });
        count.textContent = n + ' of ' + total;
      }
      box.addEventListener('input', run);
      run();
    }
    var ID = ${JSON.stringify(id)};
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  })();</script>`;
}

function listTable(groups, heads, opts) {
  const o = opts || {};
  return groups.map((g, gi) => `<div class="section-label" data-findgroup="g${gi}">${esc(g.group)}</div>
    ${g.note ? `<p class="hint warnline" data-findgroup="g${gi}">${esc(g.note)}</p>` : ''}
    <div class="tablewrap" data-findgroup="g${gi}"><table class="ledger listtable"><thead><tr>${heads.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>
    ${g.rows.map(r => `<tr data-find="${esc(r.join(' '))}" data-ingroup="g${gi}">
      ${r.map((c, i) => `<td${i === (o.idCol == null ? 1 : o.idCol) ? ' class="idcell"' : ''}>${i === (o.idCol == null ? 1 : o.idCol) ? `<code>${esc(c)}</code>` : esc(c)}</td>`).join('')}
    </tr>`).join('')}
    </tbody></table></div>`).join('');
}

function shows(on, server) { return on === 'both' || on === server; }

function head(active, server, minister) {
  const q = s => '?server=' + s;
  const tab = ([p, l, k]) => `<a href="/province/staff${p}${q(server)}"${k === active ? ' class="on" aria-current="page"' : ''}>${esc(l)}</a>`;
  return `<div class="serverbar">
    <span class="rowlead">❖ Server</span>
    ${K.SERVERS.map(s => `<a class="srv${s.id === server ? ' on' : ''}" href="/province/staff${(TABS.find(t => t[2] === active) || TABS[0])[0]}?server=${s.id}">
      <b>${esc(s.name)}</b><span>${esc(s.sub)}</span></a>`).join('')}
  </div>
  <div class="subnav staffnav">${TABS.filter(t => (!t[3] || minister) && (!t[4] || t[4] === server)).map(tab).join('')}</div>`;
}

function page(active, server, inner, minister) {
  return `<section class="arcsection">
    <div class="archead">${SIGIL}<div>
      <div class="arceyebrow">Outside the rolls of the Ministry</div>
      <h2>The Staff Room</h2>
    </div></div>
    <p class="lede">What a gamemaster needs at hand \u2014 the commands, the ids, the standing guidance, and whatever has been posted to the team. None of this is the Ministry\u2019s business. It is the server\u2019s own working, kept behind its own door.</p>
    ${head(active, server, minister)}
    ${inner}
  </section>`;
}

const linksFor = server => {
  const ls = K.LINKS.filter(l => shows(l.on, server));
  if (!ls.length) return '';
  return `<div class="linkrow" style="margin:0 0 16px">${ls.map(l =>
    `<a class="btn ghost small" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.name)} ↗</a>${l.note ? `<span class="chip">${esc(l.note)}</span>` : ''}`).join('')}</div>`;
};

function commandsPage(server, minister) {
  const groups = K.COMMANDS.filter(g => shows(g.on, server));
  const issues = K.KNOWN_ISSUES.filter(i => shows(i.on, server));
  return page('commands', server, `
    ${linksFor(server)}
    ${groups.map(g => `<div class="section-label">${esc(g.group)}</div>
      <div class="tablewrap"><table class="ledger cmdtable"><tbody>
      ${g.rows.map(([c, w]) => `<tr><td class="cmd"><code>${c}</code></td><td>${w}</td></tr>`).join('')}
      </tbody></table></div>`).join('')}
    ${issues.length ? `<div class="section-label">Known trouble</div>
      ${issues.map(i => `<article class="reqcard"><h3>${esc(i.head)}</h3><p class="small" style="margin:0">${i.body}</p></article>`).join('')}` : ''}
    <p class="hint">A reference id read off an object is not the id <code>/additem</code> wants. Put it through <a href="/province/staff/hex?server=${esc(server)}">The Hex Converter</a> first.</p>`, minister);
}

function codesPage(server, minister) {
  const groups = K.CODES.filter(g => shows(g.on, server));
  return page('codes', server, `
    <p class="lede" style="margin-top:0">Base ids, as they are given out. Press any id to copy it.</p>
    ${groups.map(g => `<div class="section-label">${esc(g.group)}</div>
      ${g.note ? `<p class="hint" style="margin:-4px 0 8px">${g.note}</p>` : ''}
      <div class="tablewrap"><table class="ledger codetable"><thead><tr><th>What</th><th>Id</th></tr></thead><tbody>
      ${g.rows.map(([n, id]) => `<tr><td>${esc(n)}</td><td><button type="button" class="idcopy" data-copy="${esc(id)}"><code>${esc(id)}</code></button></td></tr>`).join('')}
      </tbody></table></div>`).join('')}`, minister);
}

function ordersPage(server, minister) {
  const orders = K.WORKORDERS.filter(o => shows(o.on, server));
  return page('orders', server, `
    <p class="lede" style="margin-top:0">Work already written down, kept so the same job is not worked out twice.</p>
    ${orders.length ? orders.map(o => `<article class="reqcard">
      <h3>${esc(o.title)}</h3>
      ${o.note ? `<p class="small" style="margin:0 0 8px">${esc(o.note)}</p>` : ''}
      <div class="tablewrap"><table class="ledger cmdtable"><tbody>
      ${o.lines.map(([c, w]) => `<tr><td class="cmd"><code>${esc(c)}</code></td><td>${esc(w)}</td></tr>`).join('')}
      </tbody></table></div>
    </article>`).join('') : '<p class="lede">No work orders are written down for this server.</p>'}`, minister);
}

function hexPage(server, result, raw, csrf, minister) {
  const rows = K.REFID_SWAPS;
  return page('hex', server, `
    <p class="lede" style="margin-top:0">A reference id read off an object is not the id <code>/additem</code> takes. Put it in below and the converted command comes back. Paste a whole list and they all come back at once.</p>

    <form class="warform hexform" method="post" action="/province/staff/hex">
      ${hidden(csrf)}
      <input type="hidden" name="server" value="${esc(server)}">
      <label class="csf csf-wide"><span>Reference ids</span>
        <textarea id="hexin" name="ids" rows="4" placeholder="0x17012345&#10;21001a2b&#10;0b00cd01">${esc(raw || '')}</textarea></label>
      <div class="linkrow"><button class="btn" type="submit">Convert</button>
        <button class="btn ghost" type="button" id="hexcopy">Copy every command</button>
        <span class="hint" style="margin:0">It converts as you type. The button is only there if the page cannot run scripts.</span></div>
    </form>

    <div id="hexout" class="hexout">${result && result.length ? hexRows(result) : ''}</div>

    <div class="section-label">The swaps, as the team set them down</div>
    <p class="hint" style="margin:-4px 0 10px">If a reference starts with the byte on the left, it goes out as the byte on the right. Every one of these is the leading byte less three, so a byte nobody wrote down converts the same way — those are marked <i>by the rule</i> rather than <i>on the list</i>.</p>
    <div class="tablewrap"><table class="ledger swaptable"><thead><tr><th>Starts with</th><th>Goes out as</th><th>Starts with</th><th>Goes out as</th><th>Starts with</th><th>Goes out as</th></tr></thead><tbody>
    ${chunk(rows, 3).map(r => `<tr>${r.map(([a, b]) => `<td><code>${esc(a)}</code></td><td><code>${esc(b)}</code></td>`).join('')}${'<td></td><td></td>'.repeat(3 - r.length)}</tr>`).join('')}
    </tbody></table></div>

    <script>(function(){
      var MAP = ${JSON.stringify(Object.fromEntries(K.REFID_SWAPS.map(([a, b]) => [a.toLowerCase(), b.toLowerCase()])))};
      var KNOWN = ${JSON.stringify(Object.fromEntries(Array.from(K.lookupIndex().entries()).map(([r, v]) => [r, [v.name, v.kind]])))};
      var box = document.getElementById('hexin'), out = document.getElementById('hexout');
      if (!box || !out) return;
      function pad(h){ while (h.length < 8) h = '0' + h; return h; }
      function known(ref){ var k = KNOWN[ref]; return k ? { name: k[0], kind: k[1] } : null; }
      function one(t){
        var m = /^(?:0x)?([0-9a-f]{1,8})$/i.exec(t);
        if (!m) return { input: t, ok: false, why: 'Not a form id \\u2014 up to eight hex digits, with or without the 0x.' };
        var full = pad(m[1].toLowerCase());
        var head = full.slice(0, 2), tail = full.slice(2);
        var k = known('0x' + full);
        var listed = MAP[head], n = parseInt(head, 16);
        if (listed == null && n < 3) {
          return { input: t, ok: false, head: head, ref: '0x' + full, known: k,
            why: k ? 'Already a base id \\u2014 no conversion needed.'
                   : 'Leading byte ' + head + ' cannot go three lower, so this is not a reference id that needs converting.' };
        }
        var o = listed != null ? listed : ('0' + (n - 3).toString(16)).slice(-2);
        var made = (o + tail).toLowerCase();
        return { input: t, ok: true, head: head, out: o, listed: listed != null, ref: '0x' + made,
          known: k, becomes: known('0x' + made), command: '/additem 0x' + made + ' 1' };
      }
      function esc2(s){ return String(s).replace(/[&<>"]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); }
      function draw(){
        var parts = box.value.split(/[\\s,;]+/).filter(Boolean).slice(0, 200);
        if (!parts.length) { out.innerHTML = ''; return; }
        var html = '<div class="tablewrap"><table class="ledger hextable"><thead><tr><th>You gave</th><th>What it is</th><th>It becomes</th><th>The command</th></tr></thead><tbody>';
        function what(k){
          return k ? '<b>' + esc2(k.name) + '</b>' + (k.kind ? ' <span class="small">' + esc2(k.kind) + '</span>' : '')
                   : '<span class="small">not on our list</span>';
        }
        parts.map(one).forEach(function(r){
          if (!r.ok) {
            html += '<tr class="' + (r.known ? 'known' : 'bad') + '"><td><code>' + esc2(r.input) + '</code></td>'
              + '<td>' + what(r.known) + '</td>'
              + '<td colspan="2">' + esc2(r.why)
              + (r.ref && r.known ? ' Use <button type="button" class="idcopy" data-copy="/additem ' + esc2(r.ref) + ' 1"><code>/additem ' + esc2(r.ref) + ' 1</code></button> as it stands.' : '')
              + '</td></tr>';
            return;
          }
          html += '<tr><td><code>' + esc2(r.input) + '</code></td>'
            + '<td>' + what(r.known) + '</td>'
            + '<td><code>' + esc2(r.ref) + '</code> <span class="chip ' + (r.listed ? 'ok' : '') + '">' + (r.listed ? 'on the list' : 'by the rule') + '</span>'
            + (r.becomes ? '<br><span class="small">\\u2192 <b>' + esc2(r.becomes.name) + '</b></span>' : '')
            + '</td>'
            + '<td><button type="button" class="idcopy" data-copy="' + esc2(r.command) + '"><code>' + esc2(r.command) + '</code></button></td></tr>';
        });
        html += '</tbody></table></div>';
        out.innerHTML = html;
        out.querySelectorAll('.idcopy').forEach(function(b){
          b.addEventListener('click', function(){
            var t = b.dataset.copy;
            var done = function(){ b.classList.add('copied'); setTimeout(function(){ b.classList.remove('copied'); }, 1100); };
            if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(done, done); return; }
            var a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select();
            try { document.execCommand('copy'); } catch (e) {}
            a.remove(); done();
          });
        });
      }
      box.addEventListener('input', draw);
      draw();
      // What is converted goes on the Item Registry, quietly.
      var remembered = {}, csrfEl = document.querySelector('.hexform input[name=_csrf]');
      function remember(){
        if (!csrfEl) return;
        var body = box.value.split(/[\\s,;]+/).filter(Boolean).filter(function(t){
          if (remembered[t]) return false; remembered[t] = 1; return true; }).join('\\n');
        if (!body.trim()) return;
        var d = new URLSearchParams();
        d.set('_csrf', csrfEl.value); d.set('ids', body);
        fetch('/province/staff/hex/remember', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:d.toString() })
          .catch(function(){});
      }
      var rt = null;
      box.addEventListener('input', function(){ clearTimeout(rt); rt = setTimeout(remember, 1400); });

      var all = document.getElementById('hexcopy');
      if (all) all.addEventListener('click', function(){
        var lines = Array.prototype.map.call(out.querySelectorAll('.idcopy'), function(b){ return b.dataset.copy; }).join('\\n');
        if (!lines) return;
        var done = function(){ all.textContent = 'Copied'; setTimeout(function(){ all.textContent = 'Copy every command'; }, 1200); };
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(lines).then(done, done); return; }
        var a = document.createElement('textarea'); a.value = lines; document.body.appendChild(a); a.select();
        try { document.execCommand('copy'); } catch (e) {}
        a.remove(); done();
      });
    })();</script>`, minister);
}

function hexRows(result) {
  return `<div class="tablewrap"><table class="ledger hextable"><thead><tr><th>You gave</th><th>What it is</th><th>It becomes</th><th>The command</th></tr></thead><tbody>
  ${result.map(r => r.ok
    ? `<tr><td><code>${esc(r.input)}</code></td>
       <td>${r.known ? `<b>${esc(r.known)}</b>${r.knownKind ? ` <span class="small">${esc(r.knownKind)}</span>` : ''}` : '<span class="small">not on our list</span>'}</td>
       <td><code>${esc(r.ref)}</code> <span class="chip${r.listed ? ' ok' : ''}">${r.listed ? 'on the list' : 'by the rule'}</span>${r.becomes ? `<br><span class="small">\u2192 <b>${esc(r.becomes)}</b></span>` : ''}</td>
       <td><code>${esc(r.command)}</code></td></tr>`
    : `<tr class="${r.known ? 'known' : 'bad'}"><td><code>${esc(r.input)}</code></td>
       <td>${r.known ? `<b>${esc(r.known)}</b>${r.knownKind ? ` <span class="small">${esc(r.knownKind)}</span>` : ''}` : '<span class="small">not on our list</span>'}</td>
       <td colspan="2">${esc(r.why)}${r.ref && r.known ? ` Use <code>/additem ${esc(r.ref)} 1</code> as it stands.` : ''}</td></tr>`).join('')}
  </tbody></table></div>`;
}

function chunk(a, n) {
  const out = [];
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
  return out;
}

function guidesPage(server, minister) {
  const guides = K.GUIDES.filter(g => shows(g.on, server));
  const practices = K.PRACTICES.filter(p => shows(p.on, server));
  const rs = K.RULESETS[server] || { head: '', lines: [] };
  return page('guides', server, `
    <article class="reqcard rulesetcard">
      <h3>${esc(rs.head)}</h3>
      ${rs.lines.length
        ? `<ul class="ruleset plainlist">${rs.lines.map(l => `<li>${l}</li>`).join('')}</ul>`
        : `<p class="small" style="margin:0">${rs.empty || 'Nothing has been entered for this server yet.'}</p>`}
    </article>

    <div class="section-label">The same on both servers</div>
    ${guides.map(g => `<article class="reqcard">
      <h3>${esc(g.title)}</h3>
      <p class="small">${esc(g.lede)}</p>
      <ul class="ruleset plainlist">${g.points.map(p => `<li>${p}</li>`).join('')}</ul>
      ${(g.sub || []).map(s => `<div class="section-label">${esc(s.head)}</div>
        <ul class="ruleset plainlist">${s.points.map(p => `<li>${p}</li>`).join('')}</ul>`).join('')}
    </article>`).join('')}

    <div class="section-label">Common ticket practice</div>
    ${practices.map(p => `<article class="reqcard">
      <h3>${esc(p.head)}</h3>
      <p class="small" style="margin:0">${p.body}</p>
      ${p.pre ? `<pre class="pre">${esc(p.pre)}</pre>` : ''}
    </article>`).join('')}`, minister);
}

function trackersPage(server, minister, arts, props, csrf, editing) {
  const where = w => (w === 'skyrim' ? 'In Skyrim' : 'In Oblivion');
  const other = w => (w === 'skyrim' ? 'oblivion' : 'skyrim');
  const editA = editing && editing.kind === 'artifact' ? editing.row : null;
  const editH = editing && editing.kind === 'hq' ? editing.row : null;

  const artList = w => {
    const rows = arts.filter(a => a.where === w);
    return `<div class="planecol">
      <div class="eyebrow">${esc(where(w))} <span class="chip">${rows.length}</span></div>
      ${rows.length ? `<ul class="artlist">${rows.map(a => `<li>
        <span class="artname">${esc(a.name)}${a.note ? ` <span class="small">\u2014 ${esc(a.note)}</span>` : ''}</span>
        <span class="artacts">
          <form method="post" action="/province/staff/trackers/artifact/${esc(a.id)}/move" class="inline">${hidden(csrf)}
            <input type="hidden" name="server" value="${esc(server)}"><input type="hidden" name="to" value="${esc(other(w))}">
            <button class="btn ghost small" type="submit" title="Move it to ${esc(where(other(w)))}">${w === 'skyrim' ? '\u2190 Oblivion' : 'Skyrim \u2192'}</button></form>
          <a class="btn ghost small" href="/province/staff/trackers?server=${esc(server)}&edit=artifact:${esc(a.id)}">Amend</a>
          <form method="post" action="/province/staff/trackers/artifact/${esc(a.id)}/remove" class="inline">${hidden(csrf)}
            <input type="hidden" name="server" value="${esc(server)}"><button class="btn ghost small" type="submit">Strike</button></form>
        </span></li>`).join('')}</ul>` : '<p class="hint">None on this plane.</p>'}
    </div>`;
  };

  return page('trackers', server, `
    <div class="section-label">Property exceptions</div>
    <p class="hint" style="margin:-4px 0 10px">These properties stand outside their hold hierarchy and cannot be breached by stewards or jarls mechanically.</p>
    ${editH ? `<form class="warform" method="post" action="/province/staff/trackers/hq/${esc(editH.id)}">${hidden(csrf)}
      <input type="hidden" name="server" value="${esc(server)}">
      <div class="wargrid">
        <label class="csf"><span>Property</span><input type="text" name="place" maxlength="120" required value="${esc(editH.place)}"></label>
        <label class="csf"><span>Hold</span><input type="text" name="hold" maxlength="60" value="${esc(editH.hold)}"></label>
        <label class="csf"><span>Whose</span><input type="text" name="whose" maxlength="200" value="${esc(editH.whose)}"></label>
      </div>
      <div class="linkrow"><button class="btn" type="submit">Amend it</button>
        <a class="btn ghost" href="/province/staff/trackers?server=${esc(server)}">Leave it be</a></div></form>`
      : `<details class="addwrap"><summary>Add a property</summary>
      <form class="warform" method="post" action="/province/staff/trackers/hq">${hidden(csrf)}
        <input type="hidden" name="server" value="${esc(server)}">
        <div class="wargrid">
          <label class="csf"><span>Property <span class="req">*</span></span><input type="text" name="place" maxlength="120" required></label>
          <label class="csf"><span>Hold</span><input type="text" name="hold" maxlength="60"></label>
          <label class="csf"><span>Whose</span><input type="text" name="whose" maxlength="200"></label>
        </div>
        <div class="linkrow"><button class="btn" type="submit">Add it</button></div></form></details>`}
    <div class="tablewrap"><table class="ledger"><thead><tr><th>Property</th><th>Hold</th><th>Whose</th><th></th></tr></thead><tbody>
    ${props.map(h => `<tr><td><b>${esc(h.place)}</b></td><td>${esc(h.hold)}</td><td>${esc(h.whose)}</td>
      <td class="rowacts"><a class="btn ghost small" href="/province/staff/trackers?server=${esc(server)}&edit=hq:${esc(h.id)}">Amend</a>
      <form method="post" action="/province/staff/trackers/hq/${esc(h.id)}/remove" class="inline">${hidden(csrf)}
        <input type="hidden" name="server" value="${esc(server)}"><button class="btn ghost small" type="submit">Strike</button></form></td></tr>`).join('')}
    </tbody></table></div>

    <div class="section-label">Artifacts</div>
    <p class="hint" style="margin:-4px 0 10px">Press the arrow on an artifact to move it between the planes. It goes back the same way.</p>
    ${editA ? `<form class="warform" method="post" action="/province/staff/trackers/artifact/${esc(editA.id)}">${hidden(csrf)}
      <input type="hidden" name="server" value="${esc(server)}">
      <div class="wargrid">
        <label class="csf"><span>Artifact</span><input type="text" name="name" maxlength="120" required value="${esc(editA.name)}"></label>
        <label class="csf"><span>Where it is</span><select name="where">
          <option value="oblivion"${editA.where === 'oblivion' ? ' selected' : ''}>In Oblivion</option>
          <option value="skyrim"${editA.where === 'skyrim' ? ' selected' : ''}>In Skyrim</option></select></label>
        <label class="csf"><span>A note</span><input type="text" name="note" maxlength="200" value="${esc(editA.note || '')}"></label>
      </div>
      <div class="linkrow"><button class="btn" type="submit">Amend it</button>
        <a class="btn ghost" href="/province/staff/trackers?server=${esc(server)}">Leave it be</a></div></form>`
      : `<details class="addwrap"><summary>Add an artifact</summary>
      <form class="warform" method="post" action="/province/staff/trackers/artifact">${hidden(csrf)}
        <input type="hidden" name="server" value="${esc(server)}">
        <div class="wargrid">
          <label class="csf"><span>Artifact <span class="req">*</span></span><input type="text" name="name" maxlength="120" required></label>
          <label class="csf"><span>Where it is</span><select name="where"><option value="oblivion">In Oblivion</option><option value="skyrim">In Skyrim</option></select></label>
          <label class="csf"><span>A note</span><input type="text" name="note" maxlength="200"></label>
        </div>
        <div class="linkrow"><button class="btn" type="submit">Add it</button></div></form></details>`}
    <div class="planes">${artList('oblivion')}${artList('skyrim')}</div>`, minister);
}

function noticesPage(server, list, csrf, editing, minister) {
  const kind = k => k === 'document' ? 'Document' : k === 'note' ? 'Note' : 'Announcement';
  const when = at => { try { return new Date(at).toISOString().slice(0, 10); } catch (e) { return ''; } };
  const form = (n) => `<form class="warform" method="post" action="/province/staff/notices${n ? '/' + esc(n.id) : ''}">${hidden(csrf)}
    <input type="hidden" name="server" value="${esc(server)}">
    <div class="wargrid">
      <label class="csf"><span>Heading <span class="req">*</span></span><input type="text" name="title" maxlength="140" required value="${n ? esc(n.title) : ''}"></label>
      <label class="csf"><span>Which server</span><select name="on">
        <option value="both"${!n || n.on === 'both' ? ' selected' : ''}>Both</option>
        ${K.SERVERS.map(s => `<option value="${s.id}"${n && n.on === s.id ? ' selected' : ''}>${esc(s.name)} only</option>`).join('')}
      </select></label>
      <label class="csf"><span>What it is</span><select name="kind">
        ${['announcement', 'document', 'note'].map(k => `<option value="${k}"${n && n.kind === k ? ' selected' : ''}>${kind(k)}</option>`).join('')}
      </select></label>
      <label class="csf"><span>A link, if there is one</span><input type="text" name="link" maxlength="400" value="${n ? esc(n.link || '') : ''}" placeholder="https://"></label>
    </div>
    <label class="csf csf-wide" style="margin-top:10px"><span>The notice <span class="req">*</span></span>
      <textarea name="body" rows="${n ? 12 : 7}" maxlength="12000" required placeholder="Paste the announcement or the document here.">${n ? esc(n.body) : ''}</textarea></label>
    <label class="checkline" style="margin-top:8px"><input type="checkbox" name="pinned" value="1"${n && n.pinned ? ' checked' : ''}> Keep it at the top</label>
    <div class="linkrow"><button class="btn" type="submit">${n ? 'Amend the notice' : 'Post it'}</button>
      ${n ? `<a class="btn ghost" href="/province/staff/notices?server=${esc(server)}">Leave it be</a>` : ''}</div>
  </form>`;

  return page('notices', server, `
    <p class="lede" style="margin-top:0">Announcements and documents put where the team can find them again. What is posted to <b>Both</b> shows on either server; the rest shows only on its own.</p>
    ${editing ? `<div class="section-label">Amending a notice</div>${form(editing)}`
      : `<details class="addwrap"><summary>Post an announcement or a document</summary>${form(null)}</details>`}

    ${list.length ? list.map(n => `<article class="reqcard${n.pinned ? ' pinnednote' : ''}">
      <div class="no">${esc(kind(n.kind))} · ${esc(when(n.at))}${n.by ? ' · ' + esc(n.by) : ''} · <span class="chip">${n.on === 'both' ? 'Both servers' : esc(K.serverName(n.on))}</span>${n.pinned ? ' <span class="chip ok">Kept at the top</span>' : ''}</div>
      <h3>${esc(n.title)}</h3>
      <pre class="pre notebody">${esc(n.body)}</pre>
      ${n.link ? `<div class="linkrow"><a class="btn ghost small" href="${esc(n.link)}" target="_blank" rel="noopener">Open the link ↗</a></div>` : ''}
      <div class="linkrow">
        <a class="btn ghost small" href="/province/staff/notices?server=${esc(server)}&edit=${esc(n.id)}">Amend</a>
        <form method="post" action="/province/staff/notices/${esc(n.id)}/remove" class="inline">${hidden(csrf)}<input type="hidden" name="server" value="${esc(server)}"><button class="btn ghost small" type="submit">Take it down</button></form>
      </div>
    </article>`).join('')
      : '<p class="lede">Nothing has been posted for this server yet.</p>'}`, minister);
}

function whoPage(server, users, allowed, csrf, me) {
  const on = new Set(allowed);
  const rows = users.slice().sort((a, b) => {
    const ao = on.has(a.username) ? 0 : 1, bo = on.has(b.username) ? 0 : 1;
    return ao - bo || String(a.name).localeCompare(String(b.name));
  });
  return page('who', server, `
    <p class="lede" style="margin-top:0">The Staff Room is the Minister\u2019s by default and nobody else\u2019s. Tick anyone who should also be let in. Nothing else of the Administration opens to them \u2014 only this room.</p>
    <article class="reqcard rulesetcard">
      <h3>Who may enter at present</h3>
      <p class="small" style="margin:0">${on.size
        ? esc('The Minister, and ' + rows.filter(u => on.has(u.username)).map(u => u.name).join(', ') + '.')
        : 'The Minister alone.'}</p>
    </article>
    <form class="warform" method="post" action="/province/staff/who">${hidden(csrf)}
      <input type="hidden" name="server" value="${esc(server)}">
      <div class="section-label">Every login in the province</div>
      <div class="tablewrap"><table class="ledger"><thead><tr><th style="width:1%"></th><th>Name</th><th>Login</th><th>Rank</th></tr></thead><tbody>
      ${rows.map(u => `<tr${u.username === (me && me.username) ? ' class="marked"' : ''}>
        <td><input type="checkbox" name="allowed" value="${esc(u.username)}"${on.has(u.username) ? ' checked' : ''}${u.all ? ' disabled' : ''}></td>
        <td><b>${esc(u.name)}</b>${u.all ? ' <span class="chip ok">Minister \u2014 always</span>' : ''}</td>
        <td class="small">${esc(u.username)}</td>
        <td class="small">${esc(u.title || u.rank || '')}</td>
      </tr>`).join('')}
      </tbody></table></div>
      <div class="linkrow"><button class="btn" type="submit">Set who may enter</button>
        <span class="hint" style="margin:0">The Minister cannot be unticked.</span></div>
    </form>`, true);
}

function locationsPage(server, minister) {
  const groups = [{ group: 'Cells of Skyrim', rows: D.CELLS.map(([ed, fid, note]) => [ed, fid, note || '']) }];
  return page('locations', server, `
    <p class="lede" style="margin-top:0">Travel with <code>coc &lt;EditorID&gt;</code> from the console, or use the form id with <code>/teleport</code>. Press any name or id to copy it.</p>
    ${finder('findcell', 'Search a cell by name, id or note\u2026', 'Read out of the team\u2019s FORMID LOCATIONS sheet.')}
    ${listTable(groups, ['Editor id \u2014 use with coc', 'Form id', 'Note'], { idCol: 1 })}
    <p class="hint">Rows are added by pasting them into the <a href="/province/staff/items?server=${esc(server)}">Item Registry</a> paste box, which takes any list of names and ids.</p>`, minister);
}

function bestiaryPage(server, minister) {
  return page('bestiary', server, `
    <p class="lede" style="margin-top:0">Spawn with <code>/spawn</code>, or <code>player.placeatme &lt;baseid&gt;</code> from the console. The notes are the team\u2019s own findings.</p>
    ${finder('findbeast', 'Search a creature by name, id or note\u2026', '')}
    ${listTable(D.CREATURES, ['Creature', 'Base id', 'What the team found'], { idCol: 1 })}`, minister);
}

function dungeonsPage(server, minister) {
  return page('dungeons', server, `
    <p class="lede" style="margin-top:0">The dungeons and caves already worked on, with what was found in them. Build with <code>/createdg</code> and the rest of the dungeon commands.</p>
    ${finder('finddg', 'Search a dungeon, cave or chest\u2026', '')}
    ${listTable(D.DUNGEONS, ['Place', 'Id', 'Note'], { idCol: 1 })}`, minister);
}

function itemsPage(server, list, csrf, msg, minister) {
  const groups = [{ group: 'Every item on the roll', rows: list.map(i => [i.name, i.ref, i.note || '']) }];
  return page('items', server, `
    <p class="lede" style="margin-top:0">Every item the Ministry has a form id for. Anything put through <a href="/province/staff/hex?server=${esc(server)}">The Hex Converter</a> is added here if it was not on the list already, so the roll grows as you work.</p>
    ${msg ? `<div class="flash">${esc(msg)}</div>` : ''}
    <details class="addwrap"><summary>Add one, or paste a whole list</summary>
      <form class="warform" method="post" action="/province/staff/items">${hidden(csrf)}
        <input type="hidden" name="server" value="${esc(server)}">
        <div class="wargrid">
          <label class="csf"><span>What it is</span><input type="text" name="name" maxlength="140" placeholder="Thornblade"></label>
          <label class="csf"><span>Form id</span><input type="text" name="ref" maxlength="20" placeholder="0x060EE5C5"></label>
          <label class="csf"><span>A note</span><input type="text" name="note" maxlength="200" placeholder="Unique weapon"></label>
        </div>
        <div class="linkrow"><button class="btn" type="submit">Put it on the roll</button></div>
      </form>
      <form class="warform" method="post" action="/province/staff/items/import" style="margin-top:14px">${hidden(csrf)}
        <input type="hidden" name="server" value="${esc(server)}">
        <label class="csf csf-wide"><span>Or paste a list \u2014 one per line, however it was written down</span>
          <textarea name="dump" rows="6" placeholder="Thornblade - 0x060EE5C5&#10;0x060DF0F0 - Goldbrand&#10;Hvitbrand | 0x060D383B | unique"></textarea></label>
        <div class="linkrow"><button class="btn" type="submit">Read the list in</button>
          <span class="hint" style="margin:0">Anything already on the roll is left alone. Lines with no id are passed over.</span></div>
      </form>
    </details>
    ${finder('finditem', 'Search an item by name, id or note\u2026', '')}
    ${listTable(groups, ['Item', 'Form id', 'Note'], { idCol: 1 })}`, minister);
}

function consolePage(server, minister) {
  return page('console', server, `
    <div class="section-label">For recording</div>
    <p class="hint" style="margin:-4px 0 10px">What the team uses to film. <code>sucsm 4</code> is the freecam speed that reads properly.</p>
    <div class="tablewrap"><table class="ledger cmdtable"><tbody>
    ${D.RECORDING.map(([c, w]) => `<tr><td class="cmd"><code>${esc(c)}</code></td><td>${w}</td></tr>`).join('')}
    </tbody></table></div>

    <p class="lede">The rest of the Skyrim console. Where the server has its own command for the same job, use the server\u2019s \u2014 it is recorded and it carries to everyone.</p>
    ${finder('findcon', 'Search a console command\u2026', '')}
    ${D.CONSOLE.map((g, gi) => `<div class="section-label" data-findgroup="c${gi}">${esc(g.group)}</div>
      <div class="tablewrap" data-findgroup="c${gi}"><table class="ledger cmdtable"><tbody>
      ${g.rows.map(([c, w]) => `<tr data-find="${esc(c.replace(/&lt;|&gt;/g, '') + ' ' + w.replace(/<[^>]*>/g, ''))}" data-ingroup="c${gi}">
        <td class="cmd"><code>${c}</code></td><td>${w}</td></tr>`).join('')}
      </tbody></table></div>`).join('')}`, minister);
}

function trainingPage(server, minister) {
  const W = D.WARNINGS, B = D.BANS;
  return page('training', server, `
    <p class="lede" style="margin-top:0">The staff training document \u2014 every server command, how warnings are written, what each ban length is for, and the commands that need explaining.</p>

    <div class="section-label">Warnings</div>
    <article class="reqcard">
      <p class="small">${esc(W.lede)}</p>
      <p class="small" style="margin-bottom:6px">A warning serves three purposes:</p>
      <ul class="plainlist">${W.purposes.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <p class="small" style="margin:10px 0 4px">Every warning follows this format:</p>
      <pre class="pre">${esc(W.format)}</pre>
      <p class="small" style="margin:8px 0 0">${esc(W.note)}</p>
    </article>

    <div class="section-label">Ban lengths</div>
    <article class="reqcard">
      <p class="small">${esc(B.lede)}</p>
      <div class="tablewrap"><table class="ledger"><thead><tr><th>Length</th><th>What for</th></tr></thead><tbody>
      ${B.rows.map(([l, w]) => `<tr><td><b>${esc(l)}</b></td><td>${esc(w)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="small warnline" style="margin:10px 0 0"><b>Important.</b> ${B.important}</p>
    </article>

    <div class="section-label">Commands that need explaining</div>
    ${D.HOWTO.map(h => `<article class="reqcard">
      <h3>${esc(h.head)}</h3>
      <p class="small">${esc(h.body)}</p>
      <pre class="pre">${esc(h.pre)}</pre>
      ${h.after ? `<p class="small">${esc(h.after)}</p>` : ''}
      ${h.pre2 ? `<pre class="pre">${esc(h.pre2)}</pre>` : ''}
    </article>`).join('')}

    <div class="section-label">Every server command</div>
    ${finder('findsrv', 'Search a server command\u2026', '')}
    ${D.SERVER_COMMANDS.map((g, gi) => `<div class="section-label" data-findgroup="s${gi}">${esc(g.group)}</div>
      <div class="tablewrap" data-findgroup="s${gi}"><table class="ledger cmdtable"><tbody>
      ${g.rows.map(([c, w]) => `<tr data-find="${esc(c + ' ' + w)}" data-ingroup="s${gi}">
        <td class="cmd"><code>${esc(c)}</code></td><td>${esc(w)}</td></tr>`).join('')}
      </tbody></table></div>`).join('')}`, minister);
}

module.exports = { arcaneShell, commandsPage, codesPage, hexPage, ordersPage, guidesPage, trackersPage, noticesPage, whoPage, locationsPage, bestiaryPage, dungeonsPage, itemsPage, consolePage, trainingPage };
