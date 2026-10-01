(function () {
  var btn = document.getElementById('morebtn');
  var menu = document.getElementById('moremenu');
  if (btn && menu) {
    var show = function (v) {
      menu.hidden = !v;
      btn.setAttribute('aria-expanded', v ? 'true' : 'false');
    };
    btn.addEventListener('click', function (e) { e.stopPropagation(); show(menu.hidden); });
    document.addEventListener('click', function (e) {
      if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) show(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) { show(false); btn.focus(); }
    });
  }

  var veil = document.getElementById('jumpveil');
  var input = document.getElementById('jumpinput');
  var list = document.getElementById('jumplist');
  var data = document.getElementById('jumpdata');
  if (!veil || !input || !list || !data) return;

  var pages = [];
  try { pages = JSON.parse(data.textContent) || []; } catch (e) { pages = []; }

  var open = function (v) {
    veil.hidden = !v;
    document.body.classList.toggle('jumping', !!v);
    if (v) { input.value = ''; draw(''); input.focus(); }
  };

  var hits = [], pick = 0;

  function score(label, q) {
    var l = label.toLowerCase();
    var i = l.indexOf(q);
    if (i === 0) return 100;
    if (i > 0) return 60 - i;
    var parts = l.split(/\s+/);
    for (var k = 0; k < parts.length; k++) if (parts[k].indexOf(q) === 0) return 50;
    return -1;
  }

  function draw(q) {
    q = String(q || '').trim().toLowerCase();
    hits = [];
    if (!q) {
      hits = pages.slice(0, 7).map(function (p) { return { h: p.h, l: p.l, note: '' }; });
    } else {
      var rec = /^([a-z' ]+)\s+([ivxlcdm]+|\d+)$/i.exec(q);
      if (rec) {
        var no = q.replace(/\s+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
        hits.push({ h: '/staff/records/' + encodeURIComponent(no), l: no, note: 'open this record' });
      }
      pages.forEach(function (p) {
        var sc = score(p.l, q);
        if (sc > 0) hits.push({ h: p.h, l: p.l, note: '', sc: sc });
      });
      hits.sort(function (a, b) { return (b.sc || 999) - (a.sc || 999); });
      hits.push({ h: '/staff/people?q=' + encodeURIComponent(q), l: 'Search people for “' + q + '”', note: '' });
      hits.push({ h: '/staff/docket?q=' + encodeURIComponent(q), l: 'Search the docket for “' + q + '”', note: '' });
      hits = hits.slice(0, 8);
    }
    pick = 0;
    render();
  }

  function render() {
    list.innerHTML = '';
    hits.forEach(function (x, i) {
      var a = document.createElement('a');
      a.href = x.h;
      a.className = 'jumpitem' + (i === pick ? ' on' : '');
      a.textContent = x.l;
      if (x.note) {
        var s = document.createElement('span');
        s.className = 'jn';
        s.textContent = x.note;
        a.appendChild(s);
      }
      list.appendChild(a);
    });
  }

  input.addEventListener('input', function () { draw(input.value); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); pick = Math.min(pick + 1, hits.length - 1); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); pick = Math.max(pick - 1, 0); render(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (hits[pick]) window.location.href = hits[pick].h; }
    else if (e.key === 'Escape') { open(false); }
  });

  veil.addEventListener('click', function (e) { if (e.target === veil) open(false); });

  var jb = document.getElementById('jumpbtn');
  if (jb) jb.addEventListener('click', function () { open(true); });

  document.addEventListener('keydown', function (e) {
    var t = e.target || {};
    var tag = t.tagName || '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || t.isContentEditable) return;
    if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); open(true); }
  });
})();
