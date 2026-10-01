(function () {
  var box = document.getElementById('viewer');
  if (!box || !window.pdfjsLib) {
    if (box) box.querySelector('.vstatus').textContent = 'The document reader could not be loaded. Reload the page to try again.';
    return;
  }
  var src = box.getAttribute('data-src');
  var name = box.getAttribute('data-name') || 'document';
  var status = box.querySelector('.vstatus');
  var pages = [];
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.js';

  function enable() {
    var b = document.querySelectorAll('[data-picture],[data-print]');
    for (var i = 0; i < b.length; i++) b[i].disabled = false;
  }
  function fileName() {
    return name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'document';
  }

  pdfjsLib.getDocument({ url: src, withCredentials: true }).promise.then(function (pdf) {
    var chain = Promise.resolve();
    for (var n = 1; n <= pdf.numPages; n++) {
      (function (i) {
        chain = chain.then(function () {
          return pdf.getPage(i).then(function (page) {
            var vp = page.getViewport({ scale: 2 });
            var c = document.createElement('canvas');
            c.width = vp.width;
            c.height = vp.height;
            c.className = 'vpage';
            c.setAttribute('aria-label', name + ', page ' + i);
            box.appendChild(c);
            pages.push(c);
            return page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
          });
        });
      })(n);
    }
    return chain.then(function () { status.remove(); enable(); });
  }).catch(function () {
    status.textContent = 'The document could not be unrolled. It may have been moved or removed from the Archives.';
  });

  var pb = document.querySelectorAll('[data-picture]');
  for (var i = 0; i < pb.length; i++) {
    pb[i].addEventListener('click', function () {
      var list = this.getAttribute('data-picture') === 'first' ? pages.slice(0, 1) : pages;
      if (!list.length) return;
      var gap = 24, w = 0, h = 0;
      list.forEach(function (c) { w = Math.max(w, c.width); h += c.height; });
      h += gap * (list.length - 1);
      var out = document.createElement('canvas');
      out.width = w;
      out.height = h;
      var ctx = out.getContext('2d');
      ctx.fillStyle = '#5A4128';
      ctx.fillRect(0, 0, w, h);
      var y = 0;
      list.forEach(function (c) { ctx.drawImage(c, (w - c.width) / 2, y); y += c.height + gap; });
      out.toBlob(function (blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName() + (list.length === 1 && pages.length > 1 ? '_page1' : '') + '.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
      }, 'image/png');
    });
  }
  var pr = document.querySelector('[data-print]');
  if (pr) pr.addEventListener('click', function () {
    var w = window.open('', '_blank');
    if (!w) return;
    w.document.write('<!doctype html><title>' + fileName() + '</title><style>body{margin:0}img{width:100%;display:block;page-break-after:always}</style>');
    pages.forEach(function (c) { w.document.write('<img src="' + c.toDataURL('image/png') + '">'); });
    w.document.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 800);
  });
})();
