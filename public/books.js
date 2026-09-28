(function () {
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still) return;
  document.querySelectorAll('.bookface[data-book]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      var bk = a.closest('.minbook');
      if (!bk || bk.classList.contains('opening')) return;
      e.preventDefault();
      bk.classList.add('opening');
      setTimeout(function () { window.location.href = a.getAttribute('href'); }, 520);
    });
  });
})();
