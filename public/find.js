(function () {
  document.querySelectorAll('[data-findbox]').forEach(function (box) {
    var input = box.querySelector('input');
    var say = box.querySelector('[data-findsay]');
    var scope = document.querySelector(box.getAttribute('data-findbox')) || document;
    var sel = box.getAttribute('data-finditems') || '[data-finditem]';
    var word = box.getAttribute('data-findword') || 'entries';
    var one = box.getAttribute('data-findone') || word.replace(/ies$/, 'y').replace(/s$/, '');
    var reveal = box.getAttribute('data-findreveal');
    var items = Array.prototype.slice.call(scope.querySelectorAll(sel));
    var text = items.map(function (it) { return (it.getAttribute('data-findtext') || it.textContent).replace(/\s+/g, ' ').toLowerCase(); });
    var groups = Array.prototype.slice.call(scope.querySelectorAll('[data-findgroup]'));
    var t = null;
    function run() {
      var v = (input.value || '').trim().toLowerCase();
      var n = 0;
      items.forEach(function (it, i) {
        var hit = !v || text[i].indexOf(v) >= 0;
        it.hidden = !hit;
        if (hit) n += 1;
      });
      groups.forEach(function (g) {
        if (!v) { g.hidden = false; return; }
        g.hidden = !g.querySelector(sel + ':not([hidden])');
      });
      if (reveal) document.querySelectorAll(reveal).forEach(function (el) { el.hidden = !v; });
      scope.classList.toggle('finding', !!v);
      if (say) say.textContent = v ? (n ? n + ' ' + (n === 1 ? one : word) + (n === 1 ? ' names' : ' name') + ' that.' : 'Nothing here names that.') : '';
      try { if (history.replaceState) history.replaceState(null, '', v ? '#find=' + encodeURIComponent(v) : location.pathname + location.search); } catch (e) {}
    }
    input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(run, 110); });
    var m = /#find=([^&]+)/.exec(location.hash);
    if (m) { try { input.value = decodeURIComponent(m[1]); } catch (e) {} }
    if (input.value) run();
  });
})();
