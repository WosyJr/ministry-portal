(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
    });
  }

  var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (standalone) {
    document.documentElement.classList.add('installed');
    return;
  }

  var deferred = null;
  var bar = null;

  function dismissed() {
    try { return localStorage.getItem('ministry-install-hidden') === '1'; } catch (e) { return false; }
  }
  function hide(remember) {
    if (bar) { bar.remove(); bar = null; }
    if (remember) { try { localStorage.setItem('ministry-install-hidden', '1'); } catch (e) {} }
  }

  function show() {
    if (bar || dismissed()) return;
    bar = document.createElement('div');
    bar.className = 'installbar';
    bar.innerHTML = '<span class="installtext">Put the Ministry on this machine — it opens in its own window, without a browser round it.</span>';

    var go = document.createElement('button');
    go.type = 'button';
    go.className = 'btn small';
    go.textContent = 'Install it';
    go.addEventListener('click', function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.then(function (choice) {
        if (choice && choice.outcome === 'accepted') hide(true);
        deferred = null;
      }).catch(function () {});
    });

    var no = document.createElement('button');
    no.type = 'button';
    no.className = 'btn ghost small';
    no.textContent = 'Not now';
    no.addEventListener('click', function () { hide(true); });

    bar.appendChild(go);
    bar.appendChild(no);
    document.body.appendChild(bar);
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    show();
  });

  window.addEventListener('appinstalled', function () { hide(true); });
})();

(function () {
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function night() {
    var t = root.getAttribute('data-theme');
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return !!(mq && mq.matches);
  }
  function label() {
    var n = night();
    document.querySelectorAll('[data-theme-toggle] .themelabel').forEach(function (el) { el.textContent = n ? 'Day' : 'Night'; });
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) { b.setAttribute('aria-pressed', n ? 'true' : 'false'); });
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var to = night() ? 'light' : 'dark';
      root.setAttribute('data-theme', to);
      try { localStorage.setItem('ministry-theme', to); } catch (e) {}
      label();
    });
  });
  if (mq && mq.addEventListener) mq.addEventListener('change', label);
  label();
})();

(function () {
  var LINES = 7;
  document.querySelectorAll('.reqcard .pre, .judgment .pre').forEach(function (el) {
    if (el.closest('.printbody') || el.querySelector('.foldbtn')) return;
    var lh = parseFloat(getComputedStyle(el).lineHeight) || 24;
    if (el.scrollHeight <= lh * (LINES + 2)) return;
    el.classList.add('folded');
    el.style.setProperty('--fold', (lh * LINES) + 'px');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn ghost small foldbtn';
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = 'Read it all';
    el.insertAdjacentElement('afterend', btn);
    btn.addEventListener('click', function () {
      var open = el.classList.toggle('open');
      el.classList.toggle('folded', !open);
      btn.textContent = open ? 'Fold it up' : 'Read it all';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (!open) el.scrollIntoView({ block: 'nearest' });
    });
  });
})();
(function () {
  document.querySelectorAll('ul[data-fold]').forEach(function (ul) {
    var keep = Number(ul.getAttribute('data-fold')) || 3;
    var items = ul.querySelectorAll(':scope > li');
    if (items.length <= keep + 1) return;
    for (var n = keep; n < items.length; n++) items[n].hidden = true;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ghost small foldmore';
    var shut = '+ ' + (items.length - keep) + ' more';
    b.textContent = shut;
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') === 'true';
      for (var n = keep; n < items.length; n++) items[n].hidden = open;
      b.setAttribute('aria-expanded', open ? 'false' : 'true');
      b.textContent = open ? shut : 'Show fewer';
    });
    ul.after(b);
  });
})();
