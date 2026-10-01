(function () {
  var holder = document.getElementById('glossary-data');
  if (!holder) return;
  var T;
  try { T = JSON.parse(holder.textContent); } catch (e) { return; }
  var keys = Object.keys(T).sort(function (a, b) { return b.length - a.length; });
  if (!keys.length) return;

  var esc = function (k) { return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
  var re = new RegExp('\\b(' + keys.map(esc).join('|') + ')\\b', 'i');
  var root = document.querySelector('main');
  if (!root) return;

  var SKIP = /^(A|ABBR|CODE|PRE|TEXTAREA|INPUT|SELECT|SCRIPT|STYLE|OPTION|LABEL|BUTTON|TH|LEGEND|SUMMARY|H1|H2)$/;
  var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: function (n) {
      if (!n.nodeValue || n.nodeValue.length < 3) return NodeFilter.FILTER_REJECT;
      var p = n.parentNode;
      while (p && p !== root) {
        if (SKIP.test(p.nodeName)) return NodeFilter.FILTER_REJECT;
        if (p.classList && p.classList.contains('noterm')) return NodeFilter.FILTER_REJECT;
        p = p.parentNode;
      }
      return re.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });

  var hits = [], n;
  while ((n = walker.nextNode())) hits.push(n);

  var seen = {};
  hits.slice(0, 300).forEach(function (node) {
    var m = re.exec(node.nodeValue);
    if (!m) return;
    var key = m[1].toLowerCase();
    if (seen[key]) return;
    var def = T[key];
    if (!def) return;
    seen[key] = 1;
    var after = node.splitText(m.index);
    after.nodeValue = after.nodeValue.slice(m[1].length);
    var a = document.createElement('span');
    a.className = 'term';
    a.setAttribute('tabindex', '0');
    a.setAttribute('role', 'button');
    a.setAttribute('aria-label', m[1] + ' — what this means');
    a.setAttribute('data-def', def);
    a.appendChild(document.createTextNode(m[1]));
    var q = document.createElement('span');
    q.className = 'termq';
    q.setAttribute('aria-hidden', 'true');
    q.textContent = '?';
    a.appendChild(q);
    node.parentNode.insertBefore(a, after);
  });

  var tip = document.createElement('div');
  tip.className = 'termtip';
  tip.id = 'termtip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.appendChild(tip);

  var open = null, timer = null;

  function place(el) {
    var r = el.getBoundingClientRect();
    tip.style.left = '0px';
    tip.style.top = '0px';
    tip.style.maxWidth = Math.min(300, window.innerWidth - 24) + 'px';
    var w = tip.offsetWidth, h = tip.offsetHeight;
    var left = r.left + r.width / 2 - w / 2;
    var top = r.top - h - 10;
    var below = false;
    if (top < 8) { top = r.bottom + 10; below = true; }
    if (left < 8) left = 8;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    tip.classList.toggle('below', below);
    tip.style.left = Math.round(left + window.scrollX) + 'px';
    tip.style.top = Math.round(top + window.scrollY) + 'px';
    var ax = r.left + r.width / 2 - left;
    tip.style.setProperty('--ax', Math.max(12, Math.min(w - 12, ax)) + 'px');
  }

  function show(el) {
    open = el;
    tip.textContent = el.getAttribute('data-def') || '';
    tip.hidden = false;
    el.classList.add('on');
    place(el);
  }

  function hide() {
    if (open) open.classList.remove('on');
    open = null;
    tip.hidden = true;
    clearTimeout(timer);
  }

  document.addEventListener('mouseover', function (e) {
    var el = e.target.closest ? e.target.closest('.term') : null;
    if (!el) return;
    clearTimeout(timer);
    timer = setTimeout(function () { show(el); }, 70);
  });

  document.addEventListener('mouseout', function (e) {
    var el = e.target.closest ? e.target.closest('.term') : null;
    if (!el || el !== open) { clearTimeout(timer); return; }
    clearTimeout(timer);
    timer = setTimeout(function () { if (open === el) hide(); }, 120);
  });

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('.term') : null;
    if (el) {
      e.preventDefault();
      e.stopPropagation();
      if (open === el) hide(); else show(el);
      return;
    }
    if (open && !tip.contains(e.target)) hide();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && open) hide();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('term')) {
      e.preventDefault();
      if (open === e.target) hide(); else show(e.target);
    }
  });

  document.addEventListener('focusin', function (e) {
    var el = e.target.classList && e.target.classList.contains('term') ? e.target : null;
    if (el) show(el);
    else if (open && !tip.contains(e.target)) hide();
  });

  window.addEventListener('scroll', function () { if (open) place(open); }, { passive: true });
  window.addEventListener('resize', function () { if (open) place(open); });
})();
