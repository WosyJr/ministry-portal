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
  var SKIP = /^(A|ABBR|CODE|PRE|TEXTAREA|INPUT|SELECT|SCRIPT|STYLE|OPTION|LABEL|BUTTON|TH|LEGEND|SUMMARY)$/;
  var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: function (n) {
      if (!n.nodeValue || n.nodeValue.length < 3) return NodeFilter.FILTER_REJECT;
      var p = n.parentNode;
      while (p && p !== root) {
        if (SKIP.test(p.nodeName)) return NodeFilter.FILTER_REJECT;
        p = p.parentNode;
      }
      return re.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  var hits = [], n;
  while ((n = walker.nextNode())) hits.push(n);
  var seen = {};
  hits.slice(0, 200).forEach(function (node) {
    var m = re.exec(node.nodeValue);
    if (!m) return;
    var key = m[1].toLowerCase();
    if (seen[key]) return;
    var def = T[key];
    if (!def) return;
    seen[key] = 1;
    var after = node.splitText(m.index);
    after.nodeValue = after.nodeValue.slice(m[1].length);
    var a = document.createElement('abbr');
    a.className = 'term';
    a.title = def;
    a.textContent = m[1];
    node.parentNode.insertBefore(a, after);
  });
})();
