(function () {
  var cache = {};

  function render(list, dl) {
    dl.innerHTML = '';
    for (var i = 0; i < list.length; i++) {
      var o = document.createElement('option');
      o.value = list[i].no;
      var label = list[i].subject || '';
      if (list[i].status) label = label ? label + ' — ' + list[i].status : list[i].status;
      if (label) o.label = label;
      dl.appendChild(o);
    }
  }

  function load(q, dl) {
    if (cache[q]) { render(cache[q], dl); return; }
    fetch('/staff/record-suggest?q=' + encodeURIComponent(q), { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (list) { if (!Array.isArray(list)) list = []; cache[q] = list; render(list, dl); })
      .catch(function () {});
  }

  function attach(input) {
    var dl = document.createElement('datalist');
    dl.id = 'rs-' + Math.random().toString(36).slice(2, 10);
    input.setAttribute('list', dl.id);
    input.setAttribute('autocomplete', 'off');
    if (input.parentNode) input.parentNode.insertBefore(dl, input.nextSibling);

    var multi = input.getAttribute('data-rec-suggest') === 'multi';
    var prefix = '';
    var timer = null;

    input.addEventListener('input', function () {
      var v = input.value;

      if (multi && prefix && v.indexOf(prefix) !== 0) {
        input.value = prefix + (prefix.charAt(prefix.length - 1) === ',' ? ' ' : '') + v;
        v = input.value;
      }

      var term = v;
      if (multi) {
        var idx = v.lastIndexOf(',');
        prefix = idx >= 0 ? v.slice(0, idx + 1) : '';
        term = v.slice(idx + 1);
      }
      term = term.trim();

      if (term.length < 2) { dl.innerHTML = ''; return; }
      clearTimeout(timer);
      timer = setTimeout(function () { load(term, dl); }, 180);
    });
  }

  function init() {
    var nodes = document.querySelectorAll('[data-rec-suggest]');
    for (var i = 0; i < nodes.length; i++) attach(nodes[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
