(function () {
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.tabs-inner, .warnav, .subnav').forEach(function (row) {
    var links = row.querySelectorAll('a');
    if (!links.length) return;
    var bar = document.createElement('span');
    bar.className = 'navglide';
    row.appendChild(bar);
    var home = row.querySelector('a.on') || null;
    function move(a, show) {
      if (!a) { bar.style.opacity = '0'; return; }
      bar.style.width = a.offsetWidth + 'px';
      bar.style.transform = 'translateX(' + a.offsetLeft + 'px)';
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
})();
