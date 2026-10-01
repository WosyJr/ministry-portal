(function () {
  var veil = document.getElementById('tourveil');
  var card = document.getElementById('tourcard');
  var spot = document.getElementById('tourspot');
  var arrow = document.getElementById('tourarrow');
  if (!veil || !card) return;

  var GAP = 14;
  var PAD = 8;
  var EDGE = 12;

  function leave() {
    var f = veil.querySelector('form[action="/staff/guide/seen"]');
    if (f) f.submit();
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); leave(); }
  });

  function pick(list) {
    if (!list) return null;
    var parts = String(list).split(',');
    for (var i = 0; i < parts.length; i++) {
      var one = parts[i].trim();
      if (!one) continue;
      var found = null;
      try { found = document.querySelector(one); } catch (e) { found = null; }
      if (found) {
        var r = found.getBoundingClientRect();
        if (r.width > 4 && r.height > 4 && r.height < window.innerHeight * 0.75) return found;
        if (i === parts.length - 1) return found;
      }
    }
    return null;
  }

  var el = pick(veil.getAttribute('data-point'));

  if (!el) {
    card.classList.add('centred');
    return;
  }

  el.classList.add('tourlit');

  function rect() { return el.getBoundingClientRect(); }

  function fits(r, w, h, side) {
    if (side === 'below') return r.bottom + GAP + h < window.innerHeight - EDGE;
    if (side === 'above') return r.top - GAP - h > EDGE;
    if (side === 'right') return r.right + GAP + w < window.innerWidth - EDGE;
    if (side === 'left') return r.left - GAP - w > EDGE;
    return false;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(v, hi)); }

  function place() {
    var r = rect();
    if (!r.width && !r.height) { card.classList.add('centred'); spot.hidden = true; return; }

    var sx = clamp(r.left - PAD, 2, window.innerWidth - 4);
    var sy = clamp(r.top - PAD, 2, window.innerHeight - 4);
    var sw = Math.min(r.width + PAD * 2, window.innerWidth - sx - 2);
    var sh = Math.min(r.height + PAD * 2, window.innerHeight - sy - 2);
    spot.hidden = false;
    spot.style.left = sx + 'px';
    spot.style.top = sy + 'px';
    spot.style.width = sw + 'px';
    spot.style.height = sh + 'px';

    card.classList.remove('centred');
    card.style.width = Math.min(360, window.innerWidth - EDGE * 2) + 'px';
    var w = card.offsetWidth || 360;
    var h = card.offsetHeight || 220;

    var order = ['below', 'above', 'right', 'left'];
    var side = null;
    for (var k = 0; k < order.length; k++) { if (fits(r, w, h, order[k])) { side = order[k]; break; } }

    var top, left, ax, ay, dir;
    if (side === 'below') {
      top = r.bottom + GAP; left = r.left + r.width / 2 - w / 2; dir = 'up';
    } else if (side === 'above') {
      top = r.top - GAP - h; left = r.left + r.width / 2 - w / 2; dir = 'down';
    } else if (side === 'right') {
      left = r.right + GAP; top = r.top + r.height / 2 - h / 2; dir = 'left';
    } else if (side === 'left') {
      left = r.left - GAP - w; top = r.top + r.height / 2 - h / 2; dir = 'right';
    } else {
      top = Math.max(EDGE, window.innerHeight - h - EDGE);
      left = window.innerWidth / 2 - w / 2;
      dir = '';
    }

    top = clamp(top, EDGE, Math.max(EDGE, window.innerHeight - h - EDGE));
    left = clamp(left, EDGE, Math.max(EDGE, window.innerWidth - w - EDGE));
    card.style.top = top + 'px';
    card.style.left = left + 'px';
    card.classList.add('placed');

    if (!arrow) return;
    if (!dir) { arrow.hidden = true; return; }
    arrow.hidden = false;
    arrow.className = 'tourarrow a-' + dir;
    if (dir === 'up' || dir === 'down') {
      ax = clamp(r.left + r.width / 2 - left, 20, w - 20);
      arrow.style.left = ax + 'px';
      arrow.style.top = '';
    } else {
      ay = clamp(r.top + r.height / 2 - top, 20, h - 20);
      arrow.style.top = ay + 'px';
      arrow.style.left = '';
    }
  }

  function settle() {
    var r = rect();
    var needs = r.top < 90 || r.bottom > window.innerHeight - 90;
    if (needs) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(place, 430);
      setTimeout(place, 760);
    } else {
      place();
    }
  }

  settle();
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, { passive: true });

  var trySel = veil.getAttribute('data-try');
  if (!trySel) return;
  var target = pick(trySel);
  if (!target) return;

  veil.classList.add('letthrough');
  var note = document.getElementById('tourtry');

  function done() {
    if (note) { note.innerHTML = '<b>Well done.</b> That is it — carry on when you are ready.'; note.classList.add('did'); }
    var f = document.getElementById('tournextform');
    if (f) setTimeout(function () { f.submit(); }, 900);
  }

  target.addEventListener('click', function () { done(); }, { once: true });
})();
