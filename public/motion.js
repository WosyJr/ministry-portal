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

  if (doc.body.classList.contains('lamplit') && !still) {
    var lamp = el('div');
    lamp.id = 'lamp';
    lamp.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(lamp);
  }

  // The date turns over when the province's day actually changes, not merely
  // the next time somebody happens to load a page.
  (function () {
    var stamp = doc.querySelector('.daystamp');
    if (!stamp) return;
    var shown = stamp.textContent.trim();
    try { sessionStorage.setItem('daystamp', shown); } catch (_) {}
    if (still) return;
    setInterval(function () {
      if (doc.hidden) return;
      fetch('/api/today', { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d || !d.text || d.text === shown) return;
          shown = d.text;
          stamp.classList.add('turning');
          setTimeout(function () { stamp.textContent = shown; }, 360);
          setTimeout(function () { stamp.classList.remove('turning'); }, 900);
          try { sessionStorage.setItem('daystamp', shown); } catch (_) {}
        })
        .catch(function () {});
    }, 60000);
  })();

  // Weather over the province, whatever the season says it is.
  (function () {
    if (still) return;
    var season = (doc.body.className.match(/season-(\w+)/) || [])[1];
    if (!season || season === 'none') return;
    var cv = el('canvas');
    cv.id = 'weather';
    cv.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(cv);
    var g = cv.getContext('2d'), bits = [], W = 0, H = 0;

    var KIND = {
      snow: { n: 80, make: function () { return { r: 0.8 + Math.random() * 2.2, a: 0.28 + Math.random() * 0.5, vy: 0.3 + Math.random() * 0.9, vx: -0.3 + Math.random() * 0.6, sway: 0.5, col: '255,252,245' }; } },
      rain: { n: 130, make: function () { return { r: 0.7 + Math.random() * 0.7, len: 9 + Math.random() * 13, a: 0.14 + Math.random() * 0.24, vy: 7 + Math.random() * 7, vx: -1.5 - Math.random() * 1.2, sway: 0, col: '198,214,236' }; } },
      sun: { n: 46, make: function () { return { r: 0.7 + Math.random() * 1.7, a: 0.1 + Math.random() * 0.3, vy: -(0.05 + Math.random() * 0.2), vx: -0.12 + Math.random() * 0.24, sway: 0.2, col: '255,232,176' }; } },
      leaf: { n: 26, make: function () { return { r: 3 + Math.random() * 4, a: 0.3 + Math.random() * 0.4, vy: 0.5 + Math.random() * 0.9, vx: -0.7 - Math.random() * 0.8, sway: 1.2, spin: -0.04 + Math.random() * 0.08, ang: Math.random() * 6.28,
        col: ['166,92,28', '140,66,22', '178,120,38', '120,52,18'][Math.floor(Math.random() * 4)] }; } }
    };
    var K = KIND[season];
    if (!K) return;

    function size() {
      var d = window.devicePixelRatio || 1;
      W = innerWidth; H = innerHeight;
      cv.width = Math.floor(W * d); cv.height = Math.floor(H * d);
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      g.setTransform(d, 0, 0, d, 0, 0);
    }
    function seed() {
      bits = [];
      for (var i = 0; i < K.n; i++) {
        var b = K.make();
        b.x = Math.random() * W; b.y = Math.random() * H; b.p = Math.random() * 6.28;
        bits.push(b);
      }
    }
    // The wind gets up and drops again over minutes. Nothing announces it; the
    // snow simply starts going sideways.
    var gust = 1, gustTo = 1, gustT = 0;
    function wind() {
      gustT -= 1;
      if (gustT <= 0) { gustTo = 0.25 + Math.random() * Math.random() * 4.2; gustT = 520 + Math.random() * 1500; }
      gust += (gustTo - gust) * 0.004;
    }

    function draw() {
      wind();
      g.clearRect(0, 0, W, H);
      for (var i = 0; i < bits.length; i++) {
        var b = bits[i];
        b.y += b.vy * (season === 'rain' ? (0.7 + gust * 0.5) : 1);
        b.p += 0.02;
        b.x += b.vx * gust + (b.sway ? Math.sin(b.p) * b.sway * gust : 0);
        if (b.spin !== undefined) b.ang += b.spin;
        if (b.y > H + 20) { b.y = -20; b.x = Math.random() * W; }
        if (b.y < -20) { b.y = H + 20; b.x = Math.random() * W; }
        if (b.x < -20) b.x = W + 20;
        if (b.x > W + 20) b.x = -20;
        if (season === 'rain') {
          g.beginPath();
          g.strokeStyle = 'rgba(' + b.col + ',' + b.a.toFixed(2) + ')';
          g.lineWidth = b.r;
          g.moveTo(b.x, b.y);
          g.lineTo(b.x - b.vx * gust * 1.6, b.y - b.len);
          g.stroke();
        } else if (season === 'leaf') {
          g.save();
          g.translate(b.x, b.y);
          g.rotate(b.ang);
          g.beginPath();
          g.fillStyle = 'rgba(' + b.col + ',' + b.a.toFixed(2) + ')';
          g.ellipse(0, 0, b.r, b.r * 0.46, 0, 0, 6.2832);
          g.fill();
          g.restore();
        } else {
          g.beginPath();
          g.fillStyle = 'rgba(' + b.col + ',' + b.a.toFixed(2) + ')';
          g.arc(b.x, b.y, b.r, 0, 6.2832);
          g.fill();
        }
      }
      requestAnimationFrame(draw);
    }
    size(); seed(); draw();
    window.addEventListener('resize', function () { size(); seed(); });
  })();

  var season = (doc.body.className.match(/season-(\w+)/) || [])[1] || 'none';

  // Frost creeps in at the corners of the glass in the deep cold, and is gone
  // by the spring.
  if (season === 'snow' && !still) {
    var fr = el('div');
    fr.id = 'frost';
    fr.setAttribute('aria-hidden', 'true');
    fr.innerHTML = '<span class="tl"></span><span class="tr"></span><span class="bl"></span><span class="br"></span>';
    doc.body.appendChild(fr);
    setTimeout(function () { fr.classList.add('on'); }, 900);
  }

  // Breath on a cold page: a fog blooms at the foot of the glass and fades.
  if (season === 'snow' && !still) {
    var br = el('div');
    br.id = 'breath';
    br.setAttribute('aria-hidden', 'true');
    br.innerHTML = '<i class="fog"></i><i class="mottle"></i><i class="runs"></i>';
    doc.body.appendChild(br);
    var puff = function () {
      if (!doc.hidden) {
        br.classList.remove('on');
        void br.offsetWidth;
        br.classList.add('on');
      }
      setTimeout(puff, 34000 + Math.random() * 26000);
    };
    setTimeout(puff, 6000 + Math.random() * 9000);
  }

  // Ink runs when it rains: now and then a heading bleeds a hair at the edge.
  if (season === 'rain' && !still) {
    var heads = [].slice.call(doc.querySelectorAll('main h1, main h2, main h3, .mast h1'));
    if (heads.length) {
      var bleed = function () {
        if (!doc.hidden) {
          var h = heads[Math.floor(Math.random() * heads.length)];
          h.classList.add('bleeding');
          setTimeout(function () { h.classList.remove('bleeding'); }, 3400);
        }
        setTimeout(bleed, 22000 + Math.random() * 26000);
      };
      setTimeout(bleed, 8000 + Math.random() * 12000);
    }
  }

  // Candlelight reaches the edges: warm at the top of the glass, cool at the foot.
  if (doc.body.classList.contains('lamplit') && !still) {
    var hearth = el('div');
    hearth.id = 'hearth';
    hearth.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(hearth);
  }

  // The lamp gutters when the door opens.
  var gutterOnce = function () {
    if (still) return;
    doc.body.classList.add('gutter');
    setTimeout(function () { doc.body.classList.remove('gutter'); }, 520);
  };
  doc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.metaKey || e.ctrlKey || e.button) return;
    var href = a.getAttribute('href') || '';
    if (!href || href[0] === '#' || /^(mailto|tel|javascript):/i.test(href)) return;
    if (a.host && a.host !== location.host) return;
    gutterOnce();
  }, true);

  // The wax cools, and if it is left alone it cracks.
  if (!still) {
    doc.querySelectorAll('.presswax').forEach(function (w) {
      var crack = el('span', 'crackline');
      crack.innerHTML = '<svg viewBox="0 0 120 120" aria-hidden="true">' +
        '<path d="M58 14 L63 38 L55 52 L66 70 L58 88 L64 106" fill="none" ' +
        'stroke="rgba(52,8,8,.55)" stroke-width="1.4" stroke-linecap="round"/>' +
        '<path d="M63 38 L78 44 M58 88 L44 94" fill="none" stroke="rgba(52,8,8,.4)" stroke-width="1"/></svg>';
      w.appendChild(crack);
      setTimeout(function () { w.classList.add('cracked'); }, 60000);
    });
  }

  // The quill runs dry as a long writ is filled, and re-inks when it is sent.
  doc.querySelectorAll('form').forEach(function (f) {
    var fields = f.querySelectorAll('input:not([type=hidden]):not([type=submit]), textarea, select');
    if (fields.length < 6) return;
    var go = f.querySelector('button[type=submit], button:not([type])');
    if (!go) return;
    go.classList.add('dryquill');
    var ink = function () {
      var n = 0;
      fields.forEach(function (x) { n += String(x.value || '').length; });
      go.style.setProperty('--dry', Math.min(.92, n / 320).toFixed(3));
    };
    f.addEventListener('input', ink);
    f.addEventListener('submit', function () {
      go.style.setProperty('--dry', '0');
      go.classList.add('reinked');
    });
    ink();
  });

  // Pages remember they were read, and a long register keeps a ribbon at the
  // last row you opened.
  (function () {
    var KEY = 'read:' + location.pathname.replace(/\/[^/]*$/, '/');
    var SEEN = 'seen';
    function load(k) { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (_) { return []; } }
    function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v.slice(-400))); } catch (_) {} }

    // What counts as "read" is the whole address, query and all. Comparing only
    // the path marked every row on a page as read the moment you opened the page.
    var here = location.pathname + location.search;
    var seen = load(SEEN);
    if (seen.indexOf(here) < 0) { seen.push(here); save(SEEN, seen); }

    doc.querySelectorAll('.ledger tbody tr, .recprev, .reqcard').forEach(function (row) {
      var a = row.querySelector('a[href]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href === here) return;
      if (seen.indexOf(href) >= 0) row.classList.add('thumbed');
    });

    var tb = doc.querySelector('.ledger tbody');
    if (!tb || tb.rows.length < 8) return;
    var rows = [].slice.call(tb.rows);
    var mark = null;
    try { mark = localStorage.getItem(KEY); } catch (_) {}
    var keyOf = function (r) { var a = r.querySelector('a[href]'); return a ? a.getAttribute('href') : (r.cells[0] || {}).textContent; };
    rows.forEach(function (r) {
      r.addEventListener('click', function () { try { localStorage.setItem(KEY, keyOf(r)); } catch (_) {} });
    });
    if (!mark) return;
    var found = rows.filter(function (r) { return keyOf(r) === mark; })[0];
    if (!found) return;
    found.classList.add('marked');
    var tab = el('button', null, 'Where you left off');
    tab.id = 'ribbon-mark';
    tab.type = 'button';
    var place = function () {
      var r = found.getBoundingClientRect();
      var t = Math.min(innerHeight - 60, Math.max(70, r.top + scrollY - scrollY));
      tab.style.top = Math.round(Math.max(70, Math.min(innerHeight - 60, r.top))) + 'px';
    };
    tab.addEventListener('click', function () {
      found.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' });
    });
    doc.body.appendChild(tab);
    place();
    window.addEventListener('scroll', place, { passive: true });
    window.addEventListener('resize', place);
  })();


  // Searching the rolls: names, ranks and rolls, with empty groups folded away.
  (function () {
    var box = doc.getElementById('peoplefind');
    var tbl = doc.getElementById('peopletable');
    if (!box || !tbl) return;
    var count = doc.getElementById('peoplecount');
    var rows = [].slice.call(tbl.querySelectorAll('tr[data-find]'));
    var groups = [].slice.call(tbl.querySelectorAll('tbody.rollgroup'));
    var run = function () {
      var q = box.value.trim().toLowerCase();
      var n = 0;
      rows.forEach(function (r) {
        var hit = !q || r.dataset.find.indexOf(q) >= 0;
        r.hidden = !hit;
        if (hit) n += 1;
      });
      groups.forEach(function (gp) {
        gp.hidden = !gp.querySelector('tr[data-find]:not([hidden])');
      });
      if (count) count.textContent = q ? (n + ' of ' + rows.length + ' upon the rolls') : (rows.length + ' upon the rolls');
    };
    box.addEventListener('input', run);
    box.addEventListener('search', run);
  })();

})();
