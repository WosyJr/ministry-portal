const V = require('./views');
const K = require('./staffroom');
const D = require('./staffdata');
const RB = require('./rulebook');
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
  return `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fondamento:ital@0;1&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap">
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
  ['/rules', 'The Rules', 'rules'],
  ['/desk', 'The Ruling Desk', 'desk'],
  ['/log', 'Read a Log', 'log'],
  ['/who', 'Who May Enter', 'who', true]
];

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
  const strip = t => String(t).replace(/<[^>]*>/g, '').replace(/&lt;|&gt;/g, '');
  return page('commands', server, `
    ${linksFor(server)}
    ${finder('findcmd', 'Search every command\u2026', 'The ones in frequent use first, then every command the server takes.')}

    <div class="section-label" data-findgroup="q">In frequent use</div>
    ${groups.map((g, gi) => `<div class="section-label" data-findgroup="q${gi}">${esc(g.group)}</div>
      <div class="tablewrap" data-findgroup="q${gi}"><table class="ledger cmdtable"><tbody>
      ${g.rows.map(([c, w]) => `<tr data-find="${esc(strip(c) + ' ' + strip(w))}" data-ingroup="q${gi}">
        <td class="cmd"><code>${c}</code></td><td>${w}</td></tr>`).join('')}
      </tbody></table></div>`).join('')}

    ${K.DATA.SERVER_COMMANDS.map((g, gi) => `<div class="section-label" data-findgroup="s${gi}">${esc(g.group)}</div>
      <div class="tablewrap" data-findgroup="s${gi}"><table class="ledger cmdtable"><tbody>
      ${g.rows.map(([c, w]) => `<tr data-find="${esc(c + ' ' + w)}" data-ingroup="s${gi}">
        <td class="cmd"><code>${esc(c)}</code></td><td>${esc(w)}</td></tr>`).join('')}
      </tbody></table></div>`).join('')}

    ${issues.length ? `<div class="section-label">Known trouble</div>
      ${issues.map(i => `<article class="reqcard"><h3>${esc(i.head)}</h3><p class="small" style="margin:0">${i.body}</p></article>`).join('')}` : ''}
    <p class="hint">A reference id read off an object is not the id <code>/additem</code> wants. Put it through <a href="/province/staff/hex?server=${esc(server)}">The Hex Converter</a> first. The Skyrim console\u2019s own commands are under <a href="/province/staff/console?server=${esc(server)}">Console Commands</a>.</p>`, minister);
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
      var KNOWN = {}, PENDING = {}, TIMER = null;
      var box = document.getElementById('hexin'), out = document.getElementById('hexout');
      if (!box || !out) return;
      function pad(h){ while (h.length < 8) h = '0' + h; return h; }
      function known(ref){ var k = KNOWN[ref]; return k && k.length ? { name: k[0], kind: k[1] } : null; }
      function needs(ref){ if (KNOWN[ref] === undefined && !PENDING[ref]) { PENDING[ref] = 1; return true; } return false; }
      function askServer(refs){
        if (!refs.length) return;
        fetch('/province/staff/lookup?refs=' + encodeURIComponent(refs.join(',')), { credentials: 'same-origin' })
          .then(function(r){ return r.ok ? r.json() : null; })
          .then(function(d){
            if (!d) return;
            refs.forEach(function(r){ KNOWN[r] = d[r] || []; delete PENDING[r]; });
            draw();
          })
          .catch(function(){ refs.forEach(function(r){ KNOWN[r] = []; delete PENDING[r]; }); });
      }
      function one(t){
        var m = /^(?:0x)?([0-9a-f]{1,8})$/i.exec(t);
        if (!m) return { input: t, ok: false, why: 'Not a form id \\u2014 up to eight hex digits, with or without the 0x.' };
        var full = pad(m[1].toLowerCase());
        var head = full.slice(0, 2), tail = full.slice(2);
        var k = known('0x' + full);
        var listed = MAP[head], n = parseInt(head, 16);
        if (listed == null && n < 3) {
          return { input: t, ok: false, head: head, ref: '0x' + full, srcRef: '0x' + full, known: k,
            why: k ? 'Already a base id \\u2014 no conversion needed.'
                   : 'Leading byte ' + head + ' cannot go three lower, so this is not a reference id that needs converting.' };
        }
        var o = listed != null ? listed : ('0' + (n - 3).toString(16)).slice(-2);
        var made = (o + tail).toLowerCase();
        return { input: t, ok: true, head: head, out: o, listed: listed != null, ref: '0x' + made, srcRef: '0x' + full,
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
        var want = [];
        parts.map(one).forEach(function(r){
          if (r.srcRef && needs(r.srcRef)) want.push(r.srcRef);
          if (r.ok && r.ref && needs(r.ref)) want.push(r.ref);
        });
        if (want.length) { clearTimeout(TIMER); TIMER = setTimeout(function(){ askServer(want.slice(0, 200)); }, 120); }
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
    <div class="planes">${artList('oblivion')}${artList('skyrim')}</div>

    <div class="section-label">What each one does</div>
    <p class="hint" style="margin:-4px 0 10px">${esc(D.ARTIFACT_NOTE)}</p>
    ${Object.entries(D.ARTIFACT_EFFECTS).map(([n, e]) => `<article class="reqcard">
      <div class="no">${esc(e.tag)}</div><h3>${esc(n)}</h3>
      <p class="small" style="margin:0">${esc(e.text)}</p></article>`).join('')}`, minister);
}

function noticesPage(server, list, csrf, editing, minister) {
  const kind = k => k === 'document' ? 'Document' : k === 'note' ? 'Note' : 'Announcement';
  const when = at => { try { return require('./skyrim').inworld(at, require('./config').CURRENT_YEAR); } catch (e) { return ''; } };
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
  const cells = D.CELLS.filter(c => c[2] === 'CELL');
  const worlds = D.CELLS.filter(c => c[2] === 'WRLD');
  const row = ([ed, fid, , note]) => [ed, fid, note || ''];
  const groups = [
    { group: 'Interiors and cells \u2014 ' + cells.length, rows: cells.map(row) },
    { group: 'Worldspaces \u2014 ' + worlds.length, note: 'These are worldspaces, not cells. Travel with cow, not coc.', rows: worlds.map(row) }
  ];
  return page('locations', server, `
    <p class="lede" style="margin-top:0">Every cell and worldspace in base Skyrim. Travel to a cell with <code>coc &lt;EditorID&gt;</code>, to a worldspace with <code>cow &lt;EditorID&gt; 0 0</code>. The form id is there for <code>/teleport</code>. Press any name or id to copy it.</p>
    ${finder('findcell', 'Search by name, id or note\u2026', 'From the team\u2019s FORMID LOCATIONS sheet \u2014 all ' + D.CELLS.length + ' rows.')}
    ${listTable(groups, ['Editor id', 'Form id', 'Note'], { idCol: 1 })}`, minister);
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

function itemsPage(server, found, csrf, msg, minister, q, cat) {
  const esq = v => encodeURIComponent(String(v == null ? '' : v));
  const link = (nq, nc, off) => `/province/staff/items?server=${esq(server)}${nq ? '&q=' + esq(nq) : ''}${nc ? '&cat=' + esq(nc) : ''}${off ? '&from=' + off : ''}`;
  const rows = found.rows.map(i => `<tr>
    <td>${esc(i.name)}</td>
    <td class="idcell"><code>${esc(i.port || i.ref)}</code>${i.port ? `<span class="small"> · ${esc(i.ref)}</span>` : ''}</td>
    <td>${esc(i.cat || 'Other')}</td>
    <td>${esc(i.note || '')}</td>
  </tr>`).join('');
  const shown = found.rows.length;
  const first = found.total ? found.offset + 1 : 0;
  const last = found.offset + shown;
  const prev = found.offset > 0 ? Math.max(0, found.offset - found.limit) : null;
  const next = last < found.total ? found.offset + found.limit : null;
  const chips = found.groups.map(([g, n]) => `<a class="btn ghost small${g === cat ? ' on' : ''}" href="${link(q, g === cat ? '' : g, 0)}">${esc(g)} · ${n}</a>`).join(' ');
  return page('items', server, `
    <p class="lede" style="margin-top:0">Every item, enchantment and Bruma record the Ministry has a form id for — <b>${found.all.toLocaleString('en-GB')}</b> of them. Anything put through <a href="/province/staff/hex?server=${esc(server)}">The Hex Converter</a> is added here if it was not on the list already, so the roll grows as you work.</p>
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
        <label class="csf csf-wide"><span>Or paste a list — one per line, however it was written down</span>
          <textarea name="dump" rows="6" placeholder="Thornblade - 0x060EE5C5&#10;0x060DF0F0 - Goldbrand&#10;Hvitbrand | 0x060D383B | unique"></textarea></label>
        <div class="linkrow"><button class="btn" type="submit">Read the list in</button>
          <span class="hint" style="margin:0">Anything already on the roll is left alone. Lines with no id are passed over.</span></div>
      </form>
    </details>

    <form class="finder" method="get" action="/province/staff/items">
      <input type="hidden" name="server" value="${esc(server)}">
      ${cat ? `<input type="hidden" name="cat" value="${esc(cat)}">` : ''}
      <input type="search" name="q" class="findbox" value="${esc(q || '')}" placeholder="Search by name, id or note…" autocomplete="off" spellcheck="false">
      <button class="btn small" type="submit">Search</button>
      ${(q || cat) ? `<a class="btn ghost small" href="${link('', '', 0)}">Clear</a>` : ''}
      <span class="findcount">${found.total.toLocaleString('en-GB')} found</span>
    </form>
    <p class="hint" style="margin:-2px 0 10px">A Bruma or add-on id is found by its last six digits too, so <code>xx05BC3B</code>, <code>0205BC3B</code> and <code>05BC3B</code> all reach the same record.</p>
    <div class="linkrow" style="flex-wrap:wrap;gap:6px;margin:0 0 12px">${chips}</div>

    ${found.total ? `<div class="tablewrap"><table class="ledger listtable"><thead><tr><th>Item</th><th>Form id</th><th>Group</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="linkrow" style="margin-top:10px">
        ${prev == null ? '' : `<a class="btn ghost small" href="${link(q, cat, prev)}">← Back</a>`}
        <span class="hint" style="margin:0">Showing ${first.toLocaleString('en-GB')}–${last.toLocaleString('en-GB')} of ${found.total.toLocaleString('en-GB')}</span>
        ${next == null ? '' : `<a class="btn ghost small" href="${link(q, cat, next)}">More →</a>`}
      </div>` : '<p class="hint">Nothing on the roll answers to that.</p>'}`, minister);
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
    <p class="lede" style="margin-top:0">How warnings are written, what each ban length is for, and the commands that need explaining. The commands themselves are under <a href="/province/staff?server=${esc(server)}">Commands</a>.</p>

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

    <p class="hint">Every server command is under <a href="/province/staff?server=${esc(server)}">Commands</a>.</p>`, minister);
}

function rulesPage(server, minister) {
  const rules = RB.RULES.filter(r => r.on === 'both' || r.on === server);
  const cats = [];
  rules.forEach(r => { let c = cats.find(x => x.group === r.cat); if (!c) { c = { group: r.cat, rows: [] }; cats.push(c); } c.rows.push(r); });
  return page('rules', server, `
    <p class="lede" style="margin-top:0">The written ruleset, as it stands, with the band each break usually carries. Staff may adjust for context, prior offences and overall impact. Where nothing is written, the catch-all applies: behaviour clearly against the good nature of roleplay may still be actioned.</p>
    ${finder('findrule', 'Search a rule by name, what it covers, or a word from it\u2026', '')}
    ${cats.map((c, ci) => `<div class="section-label" data-findgroup="r${ci}">${esc(c.group)}</div>
      ${c.rows.map(r => `<article class="reqcard" data-find="${esc(r.name + ' ' + r.cat + ' ' + r.what + ' ' + r.detail + ' ' + r.signals.join(' '))}" data-ingroup="r${ci}">
        <div class="no">${esc(r.cat)} \u00b7 <span class="chip ${RB.BANDS[r.band].tone}">${esc(RB.BANDS[r.band].label)}</span>${r.on !== 'both' ? ` <span class="chip">${esc(K.serverName(r.on))} only</span>` : ''}</div>
        <h3>${esc(r.name)}</h3>
        <p class="small" style="margin:0 0 6px"><b>${esc(r.what)}</b></p>
        ${r.detail ? `<p class="small" style="margin:0">${esc(r.detail)}</p>` : ''}
      </article>`).join('')}`).join('')}

    <div class="section-label">Ticket terms</div>
    ${RB.CANNED.map(c => `<article class="reqcard" data-find="${esc(c.head + ' ' + c.say + ' ' + c.trigger.join(' '))}" data-ingroup="canned">
      <h3>${esc(c.head)}</h3><p class="small" style="margin:0">${esc(c.say)}</p></article>`).join('')}

    <div class="section-label">${esc(RB.STALE.head)}</div>
    <article class="reqcard"><ul class="plainlist">${RB.STALE.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ul></article>

    <div class="section-label">Speaking in character about out-of-character things</div>
    <div class="tablewrap"><table class="ledger"><thead><tr><th>Out of character</th><th>In character</th></tr></thead><tbody>
    ${RB.TERMS.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}
    </tbody></table></div>`, minister);
}

function deskPage(server, minister, csrf, text, out) {
  const band = out ? RB.BANDS[out.band] : null;
  return page('desk', server, `
    <p class="lede" style="margin-top:0">Put anything in below \u2014 a report, a question, an appeal, a bug \u2014 and it works out what kind of thing it is before it goes near the rules, then reads it against the written ruleset accordingly. It weighs wording, nothing more: it does not understand the situation and it does not decide anything. Treat it as a first sort, then read the rule yourself and rule as you see fit.</p>

    <form class="warform" method="post" action="/province/staff/desk">${hidden(csrf)}
      <input type="hidden" name="server" value="${esc(server)}">
      <label class="csf csf-wide"><span>What has been put to you</span>
        <textarea name="q" rows="6" placeholder="He walked up and killed me with no rp at all, I have a clip of it">${esc(text || '')}</textarea></label>
      <div class="linkrow"><button class="btn" type="submit">Read it</button>
        ${text ? `<a class="btn ghost" href="/province/staff/desk?server=${esc(server)}">Clear it</a>` : ''}</div>
    </form>

    ${out ? `
      ${out.ticket && out.ticket.isTicket ? `<div class="section-label">The ticket</div>
        <article class="reqcard">
          <div class="no">Read off the ticket form</div>
          <dl class="meta ticketmeta">
            ${out.ticket.fields.reported
              ? `<dt>Reported</dt><dd><b>${esc(out.ticket.fields.reported)}</b>${out.ticket.fields.reportedId ? ' · <code>' + esc(out.ticket.fields.reportedId) + '</code>' : ''}</dd>`
              : out.kind === 'report' ? '<dt>Reported</dt><dd><span class="chip bad">nobody named</span></dd>' : ''}
            ${out.ticket.fields.yourName ? `<dt>Reported by</dt><dd>${esc(out.ticket.fields.yourName)}</dd>` : ''}
            ${out.ticket.fields.server ? `<dt>Server</dt><dd>${esc(out.ticket.fields.server)}</dd>` : ''}
            ${out.ticket.fields.category ? `<dt>Category</dt><dd>${esc(out.ticket.fields.category)}</dd>` : ''}
            ${out.ticket.fields.when ? `<dt>When</dt><dd>${esc(out.ticket.fields.when)}</dd>` : ''}
            ${out.ticket.fields.what ? `<dt>They wrote</dt><dd>${esc(out.ticket.fields.what)}</dd>` : ''}
            ${out.ticket.discussion ? `<dt>Said after</dt><dd>${esc(out.ticket.discussion.slice(0, 400))}</dd>` : ''}
            ${out.kind === 'report' || out.ticket.fields.evidence ? `<dt>Evidence</dt><dd>${out.evidence
              ? (String(out.ticket.fields.evidence || '').match(/https?:\/\/\S+/g) || []).map(u => `<a href="${esc(u.replace(/[,&]+$/, ''))}" target="_blank" rel="noopener noreferrer">${esc(u.replace(/[,&]+$/, '').slice(0, 52))}</a>`).join('<br>') || '<span class="chip ok">offered</span>'
              : '<span class="chip bad">none attached</span>'}</dd>` : ''}
          </dl>
          <p class="hint" style="margin:8px 0 0">Only what they wrote under <i>what rules were broken</i> was read against the ruleset — the form’s own headings were set aside.</p>
        </article>` : ''}

      <div class="section-label">What this is</div>
      <article class="reqcard rulesetcard readcard">
        <div class="no">Read as \u00b7 <span class="chip ${out.kindInfo.tone}">${esc(out.kindInfo.label)}</span> \u00b7 <span class="chip${out.sure === 'high' ? ' ok' : out.sure === 'low' ? ' bad' : ''}">${out.sure === 'high' ? 'confident' : out.sure === 'fair' ? 'fairly sure' : 'not sure'}</span></div>
        <p class="small" style="margin:0 0 8px"><b>${esc(out.kindInfo.lede)}</b></p>
        ${out.why.length ? `<p class="hint" style="margin:0 0 6px">Because it ${out.why.slice(0, 4).map(esc).join(', it ')}.</p>` : ''}
        ${out.altInfo ? `<p class="hint" style="margin:0">It could also be read as <b>${esc(out.altInfo.label.toLowerCase())}</b>.</p>` : ''}
      </article>

      ${out.next.length ? `<div class="section-label">What to do with it</div>
        <article class="reqcard"><ul class="plainlist">${out.next.map(n => `<li>${esc(n)}</li>`).join('')}</ul></article>` : ''}

      <div class="section-label">${out.kind === 'report' ? 'What it looks like' : 'What the rules say about it'}</div>
      ${out.hits.length ? out.hits.map((h, i) => `<article class="reqcard${i === 0 ? ' rulesetcard' : ''}">
        <div class="no">${i === 0 ? 'Closest match' : 'Also touches'} \u00b7 ${esc(h.rule.cat)} \u00b7 <span class="chip ${RB.BANDS[h.rule.band].tone}">${esc(RB.BANDS[h.rule.band].label)}</span></div>
        <h3>${esc(h.rule.name)}</h3>
        <p class="small" style="margin:0 0 6px"><b>${esc(h.rule.what)}</b></p>
        ${h.rule.detail ? `<p class="small" style="margin:0 0 6px">${esc(h.rule.detail)}</p>` : ''}
        <p class="hint" style="margin:0">Matched on: ${h.matched.map(x => `<code>${esc(x)}</code>`).join(' ')}</p>
      </article>`).join('') : '<p class="lede">Nothing in the written rules matched the wording.</p>'}

      ${out.canned.length ? `<div class="section-label">This looks like a common ticket</div>
        ${out.canned.map(c => `<article class="reqcard">
          <div class="no">${c.close ? 'Close the ticket with this reason' : 'Reply'}</div>
          <h3>${esc(c.head)}</h3>
          <pre class="pre">${esc(c.say)}</pre>
        </article>`).join('')}` : ''}

      ${out.hits.length && out.kind === 'report' ? `<div class="section-label">Where that usually lands</div>
        <article class="reqcard rulesetcard">
          <h3><span class="chip ${band.tone}">${esc(band.label)}</span></h3>
          <p class="small" style="margin:6px 0 0">First offence in an isolated case should be a warning. Use your judgement.</p>
        </article>` : ''}

      ${out.needs.length ? `<div class="section-label">Before you rule</div>
        <article class="reqcard"><ul class="plainlist">${out.needs.map(n => `<li>${esc(n)}</li>`).join('')}</ul></article>` : ''}

      ${out.notes.length ? `<div class="section-label">Worth knowing</div>
        <article class="reqcard"><ul class="plainlist">${out.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></article>` : ''}

      ${out.hits.length && out.kind === 'report' ? `<div class="section-label">Something you could send</div>
        <article class="reqcard">
          <p class="hint" style="margin:0 0 8px">A draft, not a verdict. Read it before you send it. It is written as though the report stands — do not send it until you have checked that it does.</p>
          <pre class="pre">${esc(out.hits[0].rule.say)}</pre>
        </article>` : ''}
    ` : ''}`, minister);
}

function pullsPage(server, csrf, d) {
  const KP = require('./keizaalpull');
  const mark = KP.bookmarklet(d.host, d.key, 'kzl-wl');
  const when = ms => new Date(ms).toLocaleString('en-US', { timeZone: KP.TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const max = d.max.toLocaleString('en-US');
  return page('log', server, `
    <p class="lede" style="margin-top:0">One click on Keizaal brings the log straight here, numbers and all, with the exact time and the Discord id on every event. The Ministry keeps the last forty pulls so you can come back to them.</p>
    <article class="reqcard">
      <div class="section-label" style="margin-top:0">Your pull button</div>
      <p>Drag this to your bookmarks bar once. Then, on the <b>Keizaal admin logs page</b>, click it. It pulls whatever the page is showing \u2014 the time range, the search box and the action type you have set there \u2014 up to ${max} events, and brings it here.</p>
      <p><a class="btn" href="${esc(mark)}" draggable="true" onclick="return false">\u2726 Pull into the Ministry</a></p>
      <p class="hint">The button carries a key that is yours alone: it lets Keizaal\u2019s events in, nothing else, and it works whether or not you are signed in here at the time. If the button ever gets out, remake it and the old one dies.</p>
      <form method="post" action="/province/staff/log/key" class="inline">${hidden(csrf)}<input type="hidden" name="server" value="${esc(server)}"><button class="btn ghost small" type="submit">Remake my button</button></form>
      <p class="hint" style="margin-top:12px">To narrow a pull, set the filters on Keizaal first: pick a player, an action type or a shorter time range, then click. A whole week of everything is far more than ${max} events, so the pull stops at the newest ${max} and says so.</p>
    </article>
    <div class="section-label">Pulls kept</div>
    ${d.list.length ? `<div class="tablewrap"><table class="ledger listtable"><thead><tr><th>When pulled</th><th>By</th><th>Covers</th><th>Events</th><th>Filters</th><th></th></tr></thead><tbody>
      ${d.list.map(p => `<tr>
        <td><a href="/province/staff/log/pull/${esc(p.id)}?server=${esc(server)}">${esc(when(Date.parse(p.at)))}</a></td>
        <td>${esc(p.by)}</td>
        <td>${esc(when(p.from))} \u2192 ${esc(when(p.to))}</td>
        <td class="num">${p.count.toLocaleString('en-US')}${p.capped ? ' <span class="chip warn">capped</span>' : ''}</td>
        <td><code>${esc((p.filters || '').replace(/^\?/, '').replace(/&/g, ' ')) || '\u2014'}</code></td>
        <td><form method="post" action="/province/staff/log/pull/${esc(p.id)}/remove" class="inline">${hidden(csrf)}<input type="hidden" name="server" value="${esc(server)}"><button class="btn ghost small" type="submit">Strike</button></form></td>
      </tr>`).join('')}
    </tbody></table></div>` : '<p class="lede">Nothing pulled yet. Drag the button up, go to Keizaal, click it.</p>'}
    <p style="margin-top:16px"><a class="btn ghost small" href="/province/staff/log?server=${esc(server)}">\u2190 Paste or screenshot instead</a></p>
  `);
}

function logPage(server, csrf, text, out, opts) {
  const KL = require('./keizaallog');
  const o = opts || {};
  const host = o.host || '';
  const fmt = n => Number(n).toLocaleString('en-US');
  const seg = x => x.k === 'who' ? `<span class="lgwho">${esc(x.t)}</span>` : x.k === 'b' ? `<b>${esc(x.t)}</b>` : x.k === 'n' ? `<span class="lgn">${esc(x.t)}</span>` : esc(x.t);
  const ledger = l => `<div class="lgledger">
      <div class="out"><div class="h">${l.trade ? 'Received' : 'Out of the chest, into ' + esc(l.who || 'their hands')}</div>${l.took.length ? `<ul>${l.took.map(x => `<li><span>${esc(x.name)}</span><b>${fmt(x.n)}</b></li>`).join('')}</ul>` : '<p class="empty">Nothing taken.</p>'}</div>
      <div class="in"><div class="h">${l.trade ? 'Gave' : 'Into the chest'}</div>${l.put.length ? `<ul>${l.put.map(x => `<li><span>${esc(x.name)}</span><b>${fmt(x.n)}</b></li>`).join('')}</ul>` : '<p class="empty">Nothing put in.</p>'}</div>
    </div>`;
  const row = r => `<article class="lgev" data-k="${esc(r.kind.cat)}" data-p="${esc(r.actor || 'Unnamed')}" data-text="${esc((r.text + ' ' + r.facts.map(f => f.v).join(' ')).toLowerCase())}">
    <span class="lgt">${esc(r.time || '')}</span>
    <span class="lgbadge k-${esc(r.kind.cat)}"><i></i>${esc(r.kind.name)}</span>
    <div class="lgm">
      <p class="lgsaid">${r.segs.map(seg).join('')}${out.discord && r.actor && out.discord[r.actor] ? ` <span class="lgdid" title="Discord id">${esc(out.discord[r.actor])}</span>` : ''}${r.n > 1 ? ` <span class="lgsub">×${r.n}${r.from && r.to && r.from !== r.to ? ' between ' + esc(r.from) + ' and ' + esc(r.to) : ''}</span>` : ''}</p>
      ${r.sub ? `<p class="lgsub">${esc(r.sub)}</p>` : ''}
      ${r.ledger ? ledger(r.ledger) : ''}
      ${r.facts.length || r.raw ? `<details class="lgmore"><summary>What the numbers say</summary>
        ${r.facts.length ? `<dl>${r.facts.map(f => `<dt>${esc(f.k)}</dt><dd>${esc(f.v)}${f.note ? ` <em>— ${esc(f.note)}</em>` : ''}</dd>`).join('')}</dl>` : ''}
        ${r.raw || r.line ? `<pre>${esc(r.line || '')}${r.raw ? (r.line ? '\n' : '') + esc(r.raw) : ''}</pre>` : ''}
      </details>` : ''}
    </div>
  </article>`;
  const feed = out ? (() => {
    let day = null;
    return out.rows.map(r => {
      let h = '';
      if (r.day !== day) { day = r.day; h = `<div class="lgday">${esc(day || 'Day not given')}</div>`; }
      return h + row(r);
    }).join('');
  })() : '';
  const catsUsed = out ? Object.entries(out.kinds).sort((a, b) => b[1] - a[1]) : [];
  const peopleChips = out ? out.people.slice(0, 24) : [];
  const personCard = p => `<div class="lgperson"><h4>${esc(p.name)}</h4>
    <div class="line"><span>Events</span><b>${fmt(p.events)}</b></div>
    ${Object.entries(p.counts).sort((a, b) => b[1] - a[1]).map(([c, n]) => `<div class="line"><span>${esc(out.cats[c] || c)}</span><b>${fmt(n)}</b></div>`).join('')}
    ${p.kills ? `<div class="line"><span>Kills</span><b>${fmt(p.kills)}</b></div>` : ''}
    ${p.took.length ? `<p class="moved"><span>Took from chests:</span> ${p.took.slice(0, 8).map(x => fmt(x.n) + ' ' + esc(x.name)).join(', ')}${p.took.length > 8 ? ' …' : ''}</p>` : ''}
    ${p.put.length ? `<p class="moved"><span>Put in chests:</span> ${p.put.slice(0, 8).map(x => fmt(x.n) + ' ' + esc(x.name)).join(', ')}${p.put.length > 8 ? ' …' : ''}</p>` : ''}
    ${p.crafted.length ? `<p class="moved"><span>Crafted:</span> ${p.crafted.slice(0, 6).map(x => fmt(x.n) + ' ' + esc(x.name)).join(', ')}</p>` : ''}
    ${p.mined.length ? `<p class="moved"><span>Mined:</span> ${p.mined.slice(0, 6).map(x => fmt(x.n) + ' ' + esc(x.name)).join(', ')}</p>` : ''}
    <button type="button" class="btn ghost small" data-pick="${esc(p.name)}">Only ${esc(p.name)} in the feed</button>
  </div>`;
  const chestCard = c => `<div class="lgchest">
    <div class="id">Chest ${esc(c.id)}<small>${c.changes.length} ${c.changes.length === 1 ? 'change' : 'changes'}${c.opens ? ' · opened ' + c.opens + (c.opens === 1 ? ' time' : ' times') : ''} · ${c.people.map(esc).join(', ')}</small></div>
    <ul>${c.changes.slice(0, 20).map(ch => `<li><span>${esc(ch.day ? ch.day + ' ' : '')}${esc(ch.time || '')} · ${esc(ch.who || 'Unnamed')}</span> ${ch.took.map(x => `<span class="neg">−${fmt(x.n)} ${esc(x.name)}</span>`).join(', ')}${ch.took.length && ch.put.length ? ', ' : ''}${ch.put.map(x => `<span class="pos">+${fmt(x.n)} ${esc(x.name)}</span>`).join(', ')}</li>`).join('')}
    ${c.changes.length > 20 ? `<li><span>and ${c.changes.length - 20} more</span></li>` : ''}
    ${c.net.length ? `<li><span>Net over this paste:</span> ${c.net.map(x => `<span class="${x.n < 0 ? 'neg' : 'pos'}">${x.n < 0 ? '−' : '+'}${fmt(Math.abs(x.n))} ${esc(x.name)}</span>`).join(', ')}</li>` : ''}
    </ul></div>`;

  return page('log', server, `
    <p class="lede" style="margin-top:0">Paste the Keizaal admin log in as it comes — the day headings, the rows, the blocks of numbers — and this writes it out one plain sentence at a time, names the items where the registry knows them, and tallies it by person and by chest. It reads; it does not judge.</p>

    <form class="warform lgform" method="post" action="/province/staff/log" id="lgform"${o.pull ? ' hidden' : ''}>${hidden(csrf)}
      <input type="hidden" name="server" value="${esc(server)}">
      <label class="csf csf-wide"><span>The log, as you copied it</span>
        <span class="say">Select the rows on Keizaal, copy, paste. Headings like “Today 109” are read as the day. Click a row on Keizaal first if you want its numbers in.</span>
        <textarea name="q" rows="${text ? 6 : 10}" spellcheck="false" placeholder='15:42:51  Chest change  Kairos  @  chest contents changed&#10;{&#10;  "chestId": 381687,&#10;  "reason": "menu closed",&#10;  "container": [ { "baseId": 216287, "name": "Salt Pile", "delta": 488 } ]&#10;}'>${esc(text || '')}</textarea></label>
      <div class="lgtools">
        <label class="btn ghost small lgshot"><input type="file" accept="image/png,image/jpeg,image/webp" data-shot hidden><input type="hidden" name="shot">Or read a screenshot</label>
        <span class="hint" data-shot-note>${o.shot ? `Read from a screenshot in ${(o.shot.ms / 1000).toFixed(1)}s, ${o.shot.confidence}% sure of the letters. Check names and numbers before you act on them.` : 'A screenshot of the Keizaal log page. Names and actions read well; small numbers are worth a second look.'}</span>
      </div>
      <div class="linkrow"><button class="btn" type="submit">Read it out</button>
        ${text ? `<a class="btn ghost" href="/province/staff/log?server=${esc(server)}">Clear it</a>` : ''}
        <a class="btn ghost" href="/province/staff/log/pulls?server=${esc(server)}">Pulls from Keizaal${o.pullCount ? ' · ' + o.pullCount : ''}</a></div>
    </form>

    ${out ? `
      ${o.pull ? `<div class="lgpullnote"><b>Pulled from Keizaal</b> ${esc(new Date(o.pull.at).toLocaleString('en-US', { timeZone: require('./keizaalpull').TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))} by ${esc(o.pull.by)}${o.pull.filters ? ' · filters <code>' + esc(o.pull.filters.replace(/^\?/, '').replace(/&/g, ' ')) + '</code>' : ''}${o.pull.capped ? ' · <span class="chip warn">stopped at the newest ' + o.pull.count.toLocaleString('en-US') + '</span>' : ''} · <a href="/province/staff/log/pulls?server=${esc(server)}">All pulls</a></div>` : ''}
      <div class="lgstrip">
        <div class="stat"><b>${fmt(out.count)}</b><span>${out.count === 1 ? 'event' : 'events'} read</span></div>
        <div class="stat"><b>${fmt(out.people.length)}</b><span>${out.people.length === 1 ? 'person' : 'people'}</span></div>
        <div class="stat"><b>${out.span ? esc(out.span.from) + ' → ' + esc(out.span.to) : '—'}</b><span>${out.days.length ? esc(out.days.join(', ')) : 'span'}</span></div>
        <div class="stat"><b>${fmt(out.chests.length)}</b><span>${out.chests.length === 1 ? 'chest' : 'chests'} touched</span></div>
        <div class="stat${out.unread ? ' warn' : ''}"><b>${fmt(out.unread)}</b><span>${out.unread === 1 ? 'line' : 'lines'} it could not read</span></div>
      </div>
      ${out.unread ? `<details class="lgmore" style="margin-bottom:14px"><summary>The lines it could not read</summary><pre>${out.unreadLines.map(esc).join('\n')}</pre></details>` : ''}

      ${out.count ? `
      <div class="lgtabs" role="tablist">
        <button type="button" class="lgtab on" data-tab="feed">The feed</button>
        <button type="button" class="lgtab" data-tab="people">By person <small>${out.people.length}</small></button>
        <button type="button" class="lgtab" data-tab="chests">By chest <small>${out.chests.length}</small></button>
      </div>

      <div data-pane="feed">
        <div class="reqcard lgfilters">
          <div class="lgsearch"><input type="search" placeholder="Find a name, an item, a chest number…" data-search aria-label="Search the feed"><span class="hint" data-shown></span></div>
          <div class="lgchips" data-kinds><span class="lab">Kind</span><button type="button" class="lgchip on" data-k="all">Everything</button>${catsUsed.map(([c, n]) => `<button type="button" class="lgchip" data-k="${esc(c)}"><i class="k-${esc(c)}"></i>${esc(out.cats[c] || c)} <small>${fmt(n)}</small></button>`).join('')}</div>
          <div class="lgchips" data-people><span class="lab">Person</span><button type="button" class="lgchip on" data-p="all">Everyone</button>${peopleChips.map(p => `<button type="button" class="lgchip" data-p="${esc(p.name)}">${esc(p.name)} <small>${fmt(p.events)}</small></button>`).join('')}${out.people.length > 24 ? `<span class="hint">and ${out.people.length - 24} more, in By person</span>` : ''}</div>
        </div>
        <div class="lgfeed" data-feed>${feed}</div>
        <p class="hint lgnone" data-none hidden>Nothing matches that.</p>
      </div>

      <div data-pane="people" hidden><div class="lgpeople">${out.people.map(personCard).join('')}</div></div>

      <div data-pane="chests" hidden>
        ${out.chests.length ? `<div class="lgchests">${out.chests.map(chestCard).join('')}</div>` : '<p class="lede">No chest changes with numbers in this paste. On Keizaal, click a chest change row to open its numbers, then copy again.</p>'}
        <p class="hint" style="margin-top:12px">Chest numbers stay the same from day to day, so you can paste next week and compare.</p>
      </div>` : '<p class="lede">Nothing in that could be read as a log entry.</p>'}
    ` : ''}

    <div class="section-label">What the numbers mean</div>
    <article class="reqcard">
      <dl class="meta">
        ${KL.FIELDS.map(([k, v]) => `<dt><code>${esc(k)}</code></dt><dd>${esc(v)}</dd>`).join('')}
      </dl>
    </article>
    <script src="/logread.js?v=${V.CSS_V}" defer></script>
  `);
}

module.exports = { arcaneShell, rulesPage, deskPage, logPage, pullsPage, commandsPage, codesPage, hexPage, ordersPage, guidesPage, trackersPage, noticesPage, whoPage, locationsPage, bestiaryPage, dungeonsPage, itemsPage, consolePage, trainingPage };
