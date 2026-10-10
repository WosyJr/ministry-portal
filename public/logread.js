(function () {
  var form = document.getElementById('lgform');
  if (!form || form.dataset.ready) return;
  form.dataset.ready = '1';
  var ta = form.querySelector('textarea[name="q"]');

  if (location.hash.length > 1 && /from=page/.test(location.search)) {
    var text = '';
    try { text = decodeURIComponent(location.hash.slice(1)); } catch (e) { text = location.hash.slice(1); }
    if (text.trim()) {
      ta.value = text;
      history.replaceState(null, '', location.pathname + location.search.replace(/[?&]from=page/, '').replace(/^&/, '?'));
      form.submit();
      return;
    }
  }

  var shotIn = form.querySelector('[data-shot]');
  var shotOut = form.querySelector('input[name="shot"]');
  var shotNote = form.querySelector('[data-shot-note]');
  if (shotIn) {
    shotIn.addEventListener('change', function () {
      var f = shotIn.files && shotIn.files[0];
      if (!f) return;
      if (f.size > 6 * 1024 * 1024) { shotNote.textContent = 'That screenshot is over 6 MB. Crop it to the log and try again.'; shotIn.value = ''; return; }
      var r = new FileReader();
      r.onload = function () {
        shotOut.value = r.result;
        shotNote.textContent = 'Reading ' + f.name + '… this takes a few seconds.';
        form.querySelectorAll('button[type=submit]').forEach(function (b) { b.disabled = true; });
        form.submit();
      };
      r.readAsDataURL(f);
    });
  }

  var feed = document.querySelector('[data-feed]');
  if (!feed) return;
  var rows = [].slice.call(feed.querySelectorAll('.lgev'));
  var days = [].slice.call(feed.querySelectorAll('.lgday'));
  var shown = document.querySelector('[data-shown]');
  var none = document.querySelector('[data-none]');
  var kind = 'all', who = 'all', q = '';
  function apply() {
    var n = 0;
    rows.forEach(function (r) {
      var ok = (kind === 'all' || r.getAttribute('data-k') === kind) && (who === 'all' || r.getAttribute('data-p') === who) && (!q || (r.getAttribute('data-text') || '').indexOf(q) > -1);
      r.hidden = !ok;
      if (ok) n++;
    });
    days.forEach(function (d) {
      var el = d.nextElementSibling, any = false;
      while (el && !el.classList.contains('lgday')) { if (!el.hidden) { any = true; break; } el = el.nextElementSibling; }
      d.hidden = !any;
    });
    if (shown) shown.textContent = n + (n === 1 ? ' event shown' : ' events shown');
    if (none) none.hidden = n > 0;
  }
  function pick(wrap, attr, val) {
    var box = document.querySelector(wrap);
    if (!box) return;
    box.querySelectorAll('.lgchip').forEach(function (c) { c.classList.toggle('on', c.getAttribute(attr) === val); });
  }
  var kinds = document.querySelector('[data-kinds]');
  var people = document.querySelector('[data-people]');
  if (kinds) kinds.addEventListener('click', function (e) { var b = e.target.closest('.lgchip'); if (!b) return; kind = b.getAttribute('data-k'); pick('[data-kinds]', 'data-k', kind); apply(); });
  if (people) people.addEventListener('click', function (e) { var b = e.target.closest('.lgchip'); if (!b) return; who = b.getAttribute('data-p'); pick('[data-people]', 'data-p', who); apply(); });
  var search = document.querySelector('[data-search]');
  if (search) search.addEventListener('input', function () { q = search.value.trim().toLowerCase(); apply(); });

  var tabs = [].slice.call(document.querySelectorAll('.lgtab'));
  function showTab(name) {
    tabs.forEach(function (t) { t.classList.toggle('on', t.getAttribute('data-tab') === name); });
    document.querySelectorAll('[data-pane]').forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== name; });
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { showTab(t.getAttribute('data-tab')); }); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-pick]');
    if (!b) return;
    who = b.getAttribute('data-pick');
    if (people && !people.querySelector('.lgchip[data-p="' + who.replace(/"/g, '\\"') + '"]')) {
      var c = document.createElement('button'); c.type = 'button'; c.className = 'lgchip'; c.setAttribute('data-p', who); c.textContent = who; people.appendChild(c);
    }
    pick('[data-people]', 'data-p', who);
    showTab('feed');
    apply();
    feed.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  apply();
})();
