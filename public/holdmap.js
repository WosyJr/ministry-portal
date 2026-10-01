(function () {
  var wraps = document.querySelectorAll('.holdmapwrap');
  for (var i = 0; i < wraps.length; i++) setup(wraps[i]);

  function setup(wrap) {
    var svg = wrap.querySelector('svg.holdmap');
    var card = wrap.querySelector('.hmcard');
    if (!svg || !card) return;
    var vb = svg.viewBox.baseVal;
    var holds = wrap.querySelectorAll('.hmhold');
    var open = null;

    function show(a) {
      open = a;
      card.querySelector('.hmcardname').textContent = a.getAttribute('data-name') || '';
      card.querySelector('.hmcardseat').textContent = 'Seat of ' + (a.getAttribute('data-seat') || '');
      var note = a.getAttribute('data-note') || '';
      var n = card.querySelector('.hmcardnote');
      n.textContent = note;
      n.hidden = !note;
      card.hidden = false;
      place(a);
    }

    function place(a) {
      var r = svg.getBoundingClientRect();
      if (!r.width) return;
      var sx = r.width / vb.width;
      var sy = r.height / vb.height;
      var x = Number(a.getAttribute('data-x')) * sx;
      var y = Number(a.getAttribute('data-y')) * sy;
      card.style.left = '0px';
      card.style.top = '0px';
      var w = card.offsetWidth;
      var h = card.offsetHeight;
      var left = x - w / 2;
      var top = y - h - 24;
      if (top < 4) top = y + 26;
      if (left < 4) left = 4;
      if (left + w > r.width - 4) left = r.width - w - 4;
      card.style.left = Math.round(left) + 'px';
      card.style.top = Math.round(top) + 'px';
    }

    function hide() {
      open = null;
      card.hidden = true;
    }

    for (var k = 0; k < holds.length; k++) {
      (function (a) {
        a.addEventListener('mouseenter', function () { show(a); });
        a.addEventListener('focus', function () { show(a); });
        a.addEventListener('mouseleave', function () { if (open === a) hide(); });
        a.addEventListener('blur', function () { if (open === a) hide(); });
      })(holds[k]);
    }

    wrap.addEventListener('mouseleave', hide);
    window.addEventListener('resize', function () { if (open) place(open); });
    window.addEventListener('scroll', function () { if (open) place(open); }, { passive: true });

    if (!svg.classList.contains('spotlit')) {
      var start = wrap.querySelector('.hmhold.here');
      if (start) show(start);
    }
  }
})();
