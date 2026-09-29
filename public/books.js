(function () {
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still) return;
  document.querySelectorAll('.bookface[data-book]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      var bk = a.closest('.minbook');
      if (!bk || bk.classList.contains('opening')) return;
      e.preventDefault();
      bk.classList.add('opening');
      setTimeout(function () { window.location.href = a.getAttribute('href'); }, 520);
    });
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
