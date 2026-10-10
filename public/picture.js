(function () {
  var MAX = 1600;
  function shrink(file, done) {
    var r = new FileReader();
    r.onload = function () {
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, MAX / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * k));
        c.height = Math.max(1, Math.round(h * k));
        var x = c.getContext('2d');
        x.fillStyle = '#fff';
        x.fillRect(0, 0, c.width, c.height);
        x.drawImage(img, 0, 0, c.width, c.height);
        done(null, c.toDataURL('image/jpeg', 0.86));
      };
      img.onerror = function () { done('That file is not a picture this browser can read.'); };
      img.src = r.result;
    };
    r.onerror = function () { done('The picture could not be read.'); };
    r.readAsDataURL(file);
  }
  document.addEventListener('change', function (e) {
    var input = e.target;
    if (!input.matches || !input.matches('input[type=file][data-picture]')) return;
    var form = input.closest('form');
    var out = form && form.querySelector('input[name="' + input.getAttribute('data-picture') + '"]');
    var view = form && form.querySelector('[data-picture-view]');
    var note = form && form.querySelector('[data-picture-note]');
    var btn = form && form.querySelector('button[type=submit]');
    if (!out) return;
    out.value = '';
    if (view) { view.removeAttribute('src'); view.hidden = true; }
    var f = input.files && input.files[0];
    if (!f) return;
    if (f.size > 25000000) { if (note) note.textContent = 'That picture is too large.'; input.value = ''; return; }
    if (btn) btn.disabled = true;
    if (note) note.textContent = 'Preparing the picture…';
    shrink(f, function (err, url) {
      if (btn) btn.disabled = false;
      if (err) { if (note) note.textContent = err; input.value = ''; return; }
      out.value = url;
      if (view) { view.src = url; view.hidden = false; }
      if (note) note.textContent = 'Ready. ' + Math.round(url.length * 0.75 / 1024) + ' KB once sent.';
    });
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-lightbox]');
    if (!a) return;
    e.preventDefault();
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.innerHTML = '<figure><img alt=""><figcaption></figcaption></figure>';
    box.querySelector('img').src = a.getAttribute('href');
    box.querySelector('figcaption').textContent = a.getAttribute('data-lightbox') || '';
    box.addEventListener('click', function () { box.remove(); });
    document.addEventListener('keydown', function esc(k) { if (k.key === 'Escape') { box.remove(); document.removeEventListener('keydown', esc); } });
    document.body.appendChild(box);
  });
})();
