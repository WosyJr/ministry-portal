(function () {
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var books = [].slice.call(document.querySelectorAll('.minbook'));

  function shut(bk) {
    bk.classList.remove('open');
    var c = bk.querySelector('.bcover');
    if (c) c.setAttribute('aria-expanded', 'false');
    bk.querySelectorAll('.bleaf a').forEach(function (a) { a.setAttribute('tabindex', '-1'); });
  }
  // The cover swings toward whichever side has room inside the case, so a book
  // at the left edge opens rightward instead of hanging out over the page.
  function side(bk) {
    var face = bk.querySelector('.bookface');
    var cab = bk.closest('.cabinet');
    if (!face || !cab) return;
    var f = face.getBoundingClientRect(), c = cab.getBoundingClientRect();
    bk.classList.toggle('open-right', (f.left - c.left) < f.width + 14);
  }

  function open(bk) {
    books.forEach(function (o) { if (o !== bk) shut(o); });
    side(bk);
    bk.classList.add('open');
    var c = bk.querySelector('.bcover');
    if (c) c.setAttribute('aria-expanded', 'true');
    bk.querySelectorAll('.bleaf a').forEach(function (a) { a.removeAttribute('tabindex'); });
    var first = bk.querySelector('.bleaf a');
    if (first && !still) setTimeout(function () { first.focus({ preventScroll: true }); }, 520);
  }

  books.forEach(function (bk) {
    shut(bk);
    var cover = bk.querySelector('.bcover[data-book]');
    if (!cover) return;
    cover.addEventListener('click', function () {
      if (bk.classList.contains('open')) shut(bk); else open(bk);
    });
  });

  window.addEventListener('resize', function () {
    var o = document.querySelector('.minbook.open');
    if (o) side(o);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var o = document.querySelector('.minbook.open');
    if (!o) return;
    shut(o);
    var c = o.querySelector('.bcover');
    if (c) c.focus({ preventScroll: true });
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.minbook')) return;
    var o = document.querySelector('.minbook.open');
    if (o) shut(o);
  });
})();

(function () {
  var canvas = document.getElementById('motes');
  if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var ctx = canvas.getContext('2d');
  var motes = [];
  function size() {
    var r = window.devicePixelRatio || 1;
    canvas.width = Math.floor(innerWidth * r);
    canvas.height = Math.floor(innerHeight * r);
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    ctx.setTransform(r, 0, 0, r, 0, 0);
  }
  function seed() {
    motes = [];
    for (var i = 0; i < 46; i++) {
      motes.push({
        x: Math.random() * innerWidth, y: Math.random() * innerHeight,
        r: 0.6 + Math.random() * 1.7, a: 0.12 + Math.random() * 0.4,
        vy: -(0.06 + Math.random() * 0.22), vx: (Math.random() - 0.5) * 0.14,
        p: Math.random() * Math.PI * 2
      });
    }
  }
  function draw() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      m.y += m.vy; m.p += 0.008; m.x += m.vx + Math.sin(m.p) * 0.14;
      if (m.y < -8) { m.y = innerHeight + 8; m.x = Math.random() * innerWidth; }
      if (m.x < -8) m.x = innerWidth + 8;
      if (m.x > innerWidth + 8) m.x = -8;
      var lift = 1 - Math.min(1, Math.abs(m.x - innerWidth / 2) / (innerWidth * 0.62));
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,228,176,' + (m.a * (0.3 + lift * 0.7)).toFixed(3) + ')';
      ctx.arc(m.x, m.y, m.r, 0, 6.2832);
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  size(); seed(); draw();
  window.addEventListener('resize', function () { size(); seed(); });
})();

// The lamp on the desk leans a little toward whoever is at it.
(function () {
  if (!document.body.classList.contains('ground-desk')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var R = document.documentElement.style, pending = false, mx = 50, my = 26;
  window.addEventListener('pointermove', function (e) {
    mx = 50 + ((e.clientX / innerWidth) - 0.5) * 22;
    my = 26 + ((e.clientY / innerHeight) - 0.5) * 14;
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      R.setProperty('--lx', mx.toFixed(1) + '%');
      R.setProperty('--ly', my.toFixed(1) + '%');
    });
  }, { passive: true });
})();
