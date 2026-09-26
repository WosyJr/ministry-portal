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

  function drawPreview(box, list) {
    box.innerHTML = '';
    if (!list.length) return;
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      var card = document.createElement('div');
      card.className = 'recprev' + (it.found ? '' : ' missing');
      if (it.found) {
        var a = document.createElement('a');
        a.href = it.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.className = 'recprev-no';
        a.textContent = it.no;
        card.appendChild(a);
        var sub = document.createElement('span');
        sub.className = 'recprev-sub';
        sub.textContent = it.subject || '';
        card.appendChild(sub);
        if (it.status) {
          var st = document.createElement('span');
          st.className = 'recprev-status';
          st.textContent = it.status;
          card.appendChild(st);
        }
        var read = document.createElement('a');
        read.href = it.url;
        read.target = '_blank';
        read.rel = 'noopener';
        read.className = 'btn ghost small';
        read.textContent = 'Read the document';
        card.appendChild(read);
      } else {
        card.textContent = '"' + it.asked + '" is not upon the Docket';
      }
      box.appendChild(card);
    }
  }

  function attachPreview(input) {
    var box = document.getElementById(input.getAttribute('data-rec-preview'));
    if (!box) return;
    var timer = null;
    var last = '';
    function refresh() {
      var v = input.value.trim();
      if (v === last) return;
      last = v;
      if (!v) { box.innerHTML = ''; return; }
      fetch('/staff/record-brief?nos=' + encodeURIComponent(v), { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (list) { if (Array.isArray(list)) drawPreview(box, list); })
        .catch(function () {});
    }
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(refresh, 350); });
    input.addEventListener('change', refresh);
    refresh();
  }

  function init() {
    var nodes = document.querySelectorAll('[data-rec-suggest]');
    for (var i = 0; i < nodes.length; i++) attach(nodes[i]);
    var prev = document.querySelectorAll('[data-rec-preview]');
    for (var j = 0; j < prev.length; j++) attachPreview(prev[j]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
