(function () {
  var veil = document.getElementById('tourveil');
  var card = document.getElementById('tourcard');
  var spot = document.getElementById('tourspot');
  if (!veil || !card) return;
  document.body.classList.add('veiled');

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var f = veil.querySelector('form[action="/staff/guide/seen"]');
    if (f) f.submit();
  });

  var sel = veil.getAttribute('data-point');
  if (!sel) return;

  var el = null;
  try { el = document.querySelector(sel); } catch (e) { el = null; }
  if (!el) return;

  function place() {
    var r = el.getBoundingClientRect();
    if (!r.width && !r.height) return;
    var pad = 8;
    var top = Math.max(4, r.top - pad);
    var left = Math.max(4, r.left - pad);
    var w = Math.min(r.width + pad * 2, window.innerWidth - 8);
    var h = Math.min(r.height + pad * 2, window.innerHeight * 0.62);
    spot.hidden = false;
    spot.style.top = top + 'px';
    spot.style.left = left + 'px';
    spot.style.width = w + 'px';
    spot.style.height = h + 'px';

    var cw = Math.min(430, window.innerWidth - 32);
    card.style.width = cw + 'px';
    var below = top + h + 14;
    var ch = card.offsetHeight || 260;
    if (below + ch < window.innerHeight - 10) {
      card.style.top = below + 'px';
    } else if (top - ch - 14 > 10) {
      card.style.top = (top - ch - 14) + 'px';
    } else {
      card.style.top = Math.max(10, (window.innerHeight - ch) / 2) + 'px';
    }
    if (parseFloat(card.style.top) + ch > window.innerHeight - 6) {
      card.style.top = Math.max(6, window.innerHeight - ch - 6) + 'px';
    }
    var cl = left + w / 2 - cw / 2;
    card.style.left = Math.max(12, Math.min(cl, window.innerWidth - cw - 12)) + 'px';
    card.classList.add('placed');
  }

  var r0 = el.getBoundingClientRect();
  if (r0.top < 60 || r0.bottom > window.innerHeight - 60) {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(place, 420);
  } else {
    place();
  }
  window.addEventListener('resize', place);
})();
