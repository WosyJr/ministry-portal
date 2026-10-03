(function () {
  var btn = document.getElementById('pic');
  if (!btn) return;
  var was = btn.textContent;
  var resetting = null;

  function say(msg, keep) {
    btn.textContent = msg;
    btn.disabled = false;
    clearTimeout(resetting);
    if (!keep) resetting = setTimeout(function () { btn.textContent = was; }, 4500);
  }

  function flatten(doc) {
    var view = doc.defaultView || window;
    var all = doc.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var cs;
      try { cs = view.getComputedStyle(el); } catch (e) { continue; }
      if (!cs) continue;
      if (cs.backgroundImage && cs.backgroundImage.indexOf('gradient') > -1) el.style.backgroundImage = 'none';
      if (cs.borderImageSource && cs.borderImageSource.indexOf('gradient') > -1) el.style.borderImageSource = 'none';
      if (cs.maskImage && cs.maskImage.indexOf('gradient') > -1) el.style.maskImage = 'none';
    }
    if (doc.body) doc.body.style.backgroundImage = 'none';
    if (doc.documentElement) doc.documentElement.style.backgroundImage = 'none';
  }

  btn.addEventListener('click', function () {
    var id = btn.getAttribute('data-target') || 'doc';
    var name = btn.getAttribute('data-name') || 'document';
    var scale = Number(btn.getAttribute('data-scale')) || 2;
    var node = document.getElementById(id);

    if (!node) { say('Nothing here to draw'); return; }
    if (typeof html2canvas !== 'function') { say('Picture tool did not load — use Print'); return; }

    btn.disabled = true;
    btn.textContent = 'Drawing…';

    var opts = {
      scale: Math.min(scale, 2),
      backgroundColor: '#F6EDD6',
      useCORS: true,
      logging: false,
      onclone: function (doc) { try { flatten(doc); } catch (e) {} }
    };

    var done = function (canvas) {
      if (!canvas || !canvas.width || !canvas.height) { say('Could not make the picture'); return; }
      var finish = function (blob) {
        if (!blob) { say('Could not make the picture'); return; }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = name + '.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
        say('Saved', false);
      };
      if (canvas.toBlob) canvas.toBlob(finish, 'image/png');
      else {
        try {
          var data = canvas.toDataURL('image/png');
          var a = document.createElement('a');
          a.href = data;
          a.download = name + '.png';
          document.body.appendChild(a);
          a.click();
          a.remove();
          say('Saved', false);
        } catch (e) { say('Could not make the picture'); }
      }
    };

    try {
      html2canvas(node, opts).then(done, function () { say('Could not make the picture — use Print'); });
    } catch (e) {
      say('Could not make the picture — use Print');
    }
  });
})();
