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
