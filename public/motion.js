(function () {
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.tabs-inner, .warnav, .subnav').forEach(function (row) {
    var links = row.querySelectorAll('a');
    if (!links.length) return;
    var bar = document.createElement('span');
    bar.className = 'navglide';
    row.appendChild(bar);
    var home = row.querySelector('a.on') || null;
    window.addEventListener('resize', function () { move(row.querySelector('a:hover') || home, !!home); });
    function move(a, show) {
      if (!a) { bar.style.opacity = '0'; return; }
      bar.style.width = a.offsetWidth + 'px';
      bar.style.transform = 'translate(' + a.offsetLeft + 'px,' + (a.offsetTop + a.offsetHeight - 3) + 'px)';
      bar.style.opacity = show ? '1' : '0';
    }
    links.forEach(function (a) {
      a.addEventListener('mouseenter', function () { move(a, true); });
      a.addEventListener('focus', function () { move(a, true); });
    });
    row.addEventListener('mouseleave', function () { move(home, !!home); });
    if (home) requestAnimationFrame(function () { move(home, true); });
  });

  if (!still) {
    document.querySelectorAll('[data-roll] .n').forEach(function (el) {
      var txt = el.textContent.trim();
      if (!/^\d{1,7}$/.test(txt)) return;
      var to = Number(txt);
      if (to < 2) return;
      var t0 = null, dur = 900;
      el.textContent = '0';
      function step(t) {
        if (t0 === null) t0 = t;
        var p = Math.min(1, (t - t0) / dur);
        el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  var lock = document.querySelector('form[action="/login"]');
  if (lock && !still) {
    var turn = function () { document.body.classList.add('entering'); };
    var go = lock.querySelector('button[type=submit], button:not([type])');
    if (go) go.addEventListener('pointerdown', turn);
    lock.addEventListener('submit', turn);
  }

  var body = document.body;

  function ribbon() {
    if (still || document.body.scrollHeight < innerHeight * 2.2) return;
    var r = document.createElement('div');
    r.className = 'waxribbon';
    body.appendChild(r);
    function set() {
      var max = document.body.scrollHeight - innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      r.style.height = (p * (innerHeight - 22)).toFixed(1) + 'px';
    }
    set();
    addEventListener('scroll', set, { passive: true });
    addEventListener('resize', set);
  }
  ribbon();

  var waiting = null, timer = null;
  function quill() {
    if (waiting || still) return;
    waiting = document.createElement('div');
    waiting.className = 'quillwait';
    waiting.innerHTML = '<svg viewBox="0 0 46 20" aria-hidden="true"><path d="M2 15 C7 3 11 3 14 11 C17 19 20 6 24 10 C28 14 31 4 35 9 C38 13 41 12 44 7"/></svg><span>Fetching from the rolls\u2026</span>';
    document.body.appendChild(waiting);
  }
  function leaving() {
    if (still) return;
    body.classList.add('leaving');
    clearTimeout(timer);
    timer = setTimeout(quill, 420);
  }
  addEventListener('pagehide', function () { clearTimeout(timer); body.classList.remove('leaving'); if (waiting) { waiting.remove(); waiting = null; } });
  document.addEventListener('pointerdown', function (e) {
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    var h = a.getAttribute('href') || '';
    if (!h || h.charAt(0) === '#' || /^(mailto|tel|javascript):/i.test(h)) return;
    if (a.host && a.host !== location.host) return;
    leaving();
  });
  document.addEventListener('submit', function (e) {
    if (e.target && e.target.method && e.target.method.toLowerCase() === 'post') leaving();
  }, true);

  (function badges() {
    if (still || !window.sessionStorage) return;
    document.querySelectorAll('.tabs a .badge').forEach(function (b) {
      var key = 'badge:' + (b.parentNode.getAttribute('href') || '');
      var now = b.textContent.trim(), was = null;
      try { was = sessionStorage.getItem(key); sessionStorage.setItem(key, now); } catch (_) { return; }
      if (was !== null && was !== now && Number(now) > Number(was)) b.classList.add('bumped');
    });
  })();

  document.querySelectorAll('input[id^="sig"]').forEach(function (inp) {
    if (inp.type !== 'text') return;
    var ink = document.createElement('span');
    ink.className = 'signink';
    ink.setAttribute('aria-hidden', 'true');
    inp.parentNode.insertBefore(ink, inp.nextSibling);
    function show() { ink.textContent = inp.value; }
    inp.addEventListener('input', show);
    show();
  });

  var pet = document.querySelector('form[action="/petition"]');
  if (pet && !still) {
    var drop = pet.querySelector('button[type=submit], .submitbar button');
    if (drop) drop.addEventListener('pointerdown', function () {
      if (pet.checkValidity()) pet.classList.add('petitionfold');
    });
  }

  document.querySelectorAll('table.ledger').forEach(function (tb) {
    var head = tb.tHead && tb.tHead.rows[0];
    var body2 = tb.tBodies[0];
    if (!head || !body2 || body2.rows.length < 3) return;
    var ths = head.cells;
    for (var i = 0; i < ths.length; i++) (function (idx, th) {
      if (!th.textContent.trim()) return;
      th.classList.add('sortable');
      th.setAttribute('role', 'button');
      th.tabIndex = 0;
      function key(row) {
        var c = row.cells[idx];
        var t = c ? c.textContent.replace(/\s+/g, ' ').trim() : '';
        var n = t.replace(/[^0-9.\-]/g, '');
        return (n !== '' && /^[\s0-9.,\-]+$/.test(t)) ? { n: parseFloat(n) } : { s: t.toLowerCase() };
      }
      function sort() {
        var dir = th.getAttribute('data-dir') === '1' ? -1 : 1;
        for (var j = 0; j < ths.length; j++) ths[j].removeAttribute('data-dir');
        th.setAttribute('data-dir', String(dir));
        var rows = Array.prototype.slice.call(body2.rows);
        var first = new Map();
        rows.forEach(function (r) { first.set(r, r.getBoundingClientRect().top); });
        rows.sort(function (a, b) {
          var ka = key(a), kb = key(b);
          if (ka.n !== undefined && kb.n !== undefined) return (ka.n - kb.n) * dir;
          return String(ka.s === undefined ? ka.n : ka.s).localeCompare(String(kb.s === undefined ? kb.n : kb.s)) * dir;
        });
        rows.forEach(function (r) { body2.appendChild(r); });
        if (still) return;
        rows.forEach(function (r) {
          var d = first.get(r) - r.getBoundingClientRect().top;
          if (!d) return;
          r.classList.remove('gliding');
          r.style.transform = 'translateY(' + d + 'px)';
          requestAnimationFrame(function () {
            r.classList.add('gliding');
            r.style.transform = '';
          });
        });
      }
      th.addEventListener('click', sort);
      th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sort(); } });
    })(i, ths[i]);
  });


  var doc = document;

  function el(tag, cls, html) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }

  var quill = null, quillTimer = null;
  function showQuill() {
    if (quill) return;
    quill = el('div');
    quill.id = 'quill';
    quill.setAttribute('aria-hidden', 'true');
    quill.innerHTML = '<div class="qbar"></div><div class="qnib">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="#6B1414" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 21c3-1 5-3 7-6"/><path d="M10 15c4-1 8-5 10-12-7 2-11 6-12 10z"/><path d="M13 9l3-3"/></svg>' +
      '<span>The clerk is writing…</span></div>';
    doc.body.appendChild(quill);
    requestAnimationFrame(function () { quill.classList.add('on'); });
  }
  function beginLeaving() {
    if (still) return;
    doc.body.classList.add('leaving');
    clearTimeout(quillTimer);
    quillTimer = setTimeout(showQuill, 340);
  }
  doc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    var href = a.getAttribute('href') || '';
    if (!href || href[0] === '#' || /^(mailto|tel|javascript):/i.test(href)) return;
    if (a.host && a.host !== location.host) return;
    beginLeaving();
  }, true);
  doc.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || f.getAttribute('target') === '_blank') return;
    beginLeaving();
    if (f.classList.contains('petbox') || f.closest('.petbox')) doc.body.classList.add('posting');
  }, true);
  window.addEventListener('pageshow', function (ev) {
    if (ev.persisted) { doc.body.classList.remove('leaving', 'posting'); if (quill) { quill.remove(); quill = null; } clearTimeout(quillTimer); }
  });

  if (!still && doc.documentElement.scrollHeight > innerHeight * 2.2) {
    var rib = el('div');
    rib.id = 'ribbon';
    rib.setAttribute('aria-hidden', 'true');
    rib.innerHTML = '<div class="rb"></div>';
    doc.body.appendChild(rib);
    var rb = rib.querySelector('.rb');
    var tick = function () {
      var max = doc.documentElement.scrollHeight - innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      rb.style.height = Math.round(p * (innerHeight - 22)) + 'px';
    };
    tick();
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
  }

  try {
    doc.querySelectorAll('.tabs a .badge, .tabs a .count, .badge').forEach(function (bg) {
      var link = bg.closest('a');
      var key = 'bump:' + ((link && link.getAttribute('href')) || bg.textContent);
      var now = bg.textContent.trim();
      var was = sessionStorage.getItem(key);
      if (was !== null && was !== now && !still) {
        bg.classList.add('badgebump');
        setTimeout(function () { bg.classList.remove('badgebump'); }, 600);
      }
      sessionStorage.setItem(key, now);
    });
  } catch (_) {}

  doc.querySelectorAll('input#signed, input[name=signed], input[name^="sig["]').forEach(function (inp) {
    var ghost = el('span', 'signghost');
    ghost.setAttribute('aria-hidden', 'true');
    inp.insertAdjacentElement('afterend', ghost);
    var paint = function () {
      var v = inp.value.trim();
      ghost.classList.toggle('has', !!v);
      if (still) { ghost.textContent = v; return; }
      ghost.innerHTML = '';
      v.split('').forEach(function (ch, i) {
        var sp = el('span');
        sp.textContent = ch;
        sp.style.whiteSpace = 'pre';
        sp.style.animationDelay = (i * 18) + 'ms';
        ghost.appendChild(sp);
      });
    };
    inp.addEventListener('input', paint);
    if (inp.value) paint();
  });

  doc.querySelectorAll('table.ledger').forEach(function (tb) {
    var head = tb.tHead && tb.tHead.rows[0];
    var body = tb.tBodies && tb.tBodies[0];
    if (!head || !body || body.rows.length < 3) return;
    Array.prototype.forEach.call(head.cells, function (th, col) {
      th.setAttribute('data-sortable', '');
      th.setAttribute('tabindex', '0');
      th.setAttribute('role', 'button');
      var run = function () {
        var dir = th.getAttribute('aria-sort') === 'ascending' ? -1 : 1;
        Array.prototype.forEach.call(head.cells, function (o) { o.removeAttribute('aria-sort'); });
        th.setAttribute('aria-sort', dir === 1 ? 'ascending' : 'descending');
        var rows = Array.prototype.slice.call(body.rows);
        var first = new Map();
        rows.forEach(function (r) { first.set(r, r.getBoundingClientRect().top); });
        var key = function (r) {
          var t = (r.cells[col] ? r.cells[col].textContent : '').trim();
          var n = t.replace(/[,\s]/g, '');
          return /^-?\d+(\.\d+)?$/.test(n) ? Number(n) : t.toLowerCase();
        };
        rows.sort(function (a, b) {
          var x = key(a), y = key(b);
          if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
          return String(x).localeCompare(String(y)) * dir;
        });
        rows.forEach(function (r) { body.appendChild(r); });
        if (still) return;
        rows.forEach(function (r) {
          var dy = first.get(r) - r.getBoundingClientRect().top;
          if (!dy) return;
          r.style.transition = 'none';
          r.style.transform = 'translateY(' + dy + 'px)';
          requestAnimationFrame(function () {
            r.style.transition = 'transform .42s cubic-bezier(.3,.8,.3,1)';
            r.style.transform = '';
          });
        });
      };
      th.addEventListener('click', run);
      th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); run(); } });
    });
  });

  if (!still) {
    doc.querySelectorAll('main p.lede, main p.hint').forEach(function (p) {
      var t = p.textContent.trim();
      if (!/^(nothing|no one|none|no [a-z])/i.test(t) || t.length > 130 || p.querySelector('a')) return;
      p.innerHTML = '';
      t.split('').forEach(function (ch, i) {
        var sp = el('span');
        sp.textContent = ch;
        sp.style.cssText = 'display:inline-block;white-space:pre;animation:inksoak .34s ease-out both;animation-delay:' + (200 + i * 16) + 'ms';
        p.appendChild(sp);
      });
    });
  }


  // No two sheets alike: the grain sits at a slightly different angle each load.
  try {
    var R = document.documentElement.style;
    R.setProperty('--grain', (86 + Math.floor(Math.random() * 40)) + 'deg');
    R.setProperty('--grain2', (Math.floor(Math.random() * 40) - 8) + 'deg');
    R.setProperty('--grainA', (6 + Math.floor(Math.random() * 4)) + 'px');
    R.setProperty('--grainB', (9 + Math.floor(Math.random() * 5)) + 'px');
  } catch (_) {}

  // The candle gutters when you look away and catches again when you come back.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { doc.body.classList.add('away'); doc.body.classList.remove('relit'); return; }
    doc.body.classList.remove('away');
    if (still) return;
    doc.body.classList.add('relit');
    setTimeout(function () { doc.body.classList.remove('relit'); }, 1200);
  });

  // The date turns over rather than simply being different next time you look.
  try {
    var stamp = doc.querySelector('.daystamp');
    if (stamp) {
      var day = stamp.textContent.trim();
      var last = sessionStorage.getItem('daystamp');
      if (last && last !== day && !still) {
        stamp.classList.add('turning');
        setTimeout(function () { stamp.classList.remove('turning'); }, 900);
      }
      sessionStorage.setItem('daystamp', day);
    }
  } catch (_) {}

  // The bell rings once when something new is waiting.
  try {
    var bell = doc.querySelector('.bell');
    if (bell) {
      var cnt = (bell.querySelector('.badge') || {}).textContent || '0';
      var had = sessionStorage.getItem('bellcount');
      if (had !== null && Number(cnt) > Number(had) && !still) {
        bell.classList.add('rings');
        setTimeout(function () { bell.classList.remove('rings'); }, 800);
      }
      sessionStorage.setItem('bellcount', cnt);
    }
  } catch (_) {}

  // Striking a record tears it rather than blinking it away.
  doc.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || !/\/(remove|strike)(\/|$|\?)/.test(f.getAttribute('action') || '')) return;
    if (still) return;
    var row = f.closest('tr, .reqcard, .paper, .recprev, li');
    if (row) row.classList.add('tearing');
  }, true);

  // Snow past the window, in the cold months and no others.
  if (doc.body.classList.contains('wintry') && !still) {
    var sc = el('canvas');
    sc.id = 'snow';
    sc.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(sc);
    var sx = sc.getContext('2d'), flakes = [];
    var ssize = function () {
      var r = window.devicePixelRatio || 1;
      sc.width = Math.floor(innerWidth * r); sc.height = Math.floor(innerHeight * r);
      sc.style.width = innerWidth + 'px'; sc.style.height = innerHeight + 'px';
      sx.setTransform(r, 0, 0, r, 0, 0);
    };
    var sseed = function () {
      flakes = [];
      for (var i = 0; i < 70; i++) {
        flakes.push({
          x: Math.random() * innerWidth, y: Math.random() * innerHeight,
          r: 0.8 + Math.random() * 2.1, a: 0.25 + Math.random() * 0.45,
          vy: 0.22 + Math.random() * 0.7, vx: -0.28 + Math.random() * 0.2,
          p: Math.random() * 6.28
        });
      }
    };
    var sdraw = function () {
      sx.clearRect(0, 0, innerWidth, innerHeight);
      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        f.y += f.vy; f.p += 0.012; f.x += f.vx + Math.sin(f.p) * 0.3;
        if (f.y > innerHeight + 6) { f.y = -6; f.x = Math.random() * innerWidth; }
        if (f.x < -6) f.x = innerWidth + 6;
        if (f.x > innerWidth + 6) f.x = -6;
        sx.beginPath();
        sx.fillStyle = 'rgba(255,252,245,' + f.a.toFixed(2) + ')';
        sx.arc(f.x, f.y, f.r, 0, 6.2832);
        sx.fill();
      }
      requestAnimationFrame(sdraw);
    };
    ssize(); sseed(); sdraw();
    window.addEventListener('resize', function () { ssize(); sseed(); });
  }

})();
