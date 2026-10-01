(function () {
  var wrap = document.getElementById('gazrows');
  var dataEl = document.getElementById('gazsections');
  var countEl = document.querySelector('input[name="count"]');
  if (!wrap || !dataEl || !countEl) return;

  var SECTIONS;
  try { SECTIONS = JSON.parse(dataEl.textContent) || []; } catch (e) { return; }

  var groups = {};
  var out;

  function makeGroup(id, name, lead) {
    var g = document.createElement('div');
    g.className = 'gazgroup';
    g.setAttribute('data-sec', id);
    var h = document.createElement('div');
    h.className = 'gazgrouphead';
    h.innerHTML = '<span class="gazgroupname"></span><span class="gazgroupn"></span>';
    h.querySelector('.gazgroupname').textContent = name;
    g.appendChild(h);
    if (lead) {
      var p = document.createElement('p');
      p.className = 'gazgrouplead';
      p.textContent = lead;
      g.appendChild(p);
    }
    var body = document.createElement('div');
    body.className = 'gazgroupbody';
    g.appendChild(body);
    wrap.appendChild(g);
    return g;
  }

  SECTIONS.forEach(function (s) { groups[s.id] = makeGroup(s.id, s.name, s.lead); });
  out = makeGroup('__out', 'Left out of this issue', 'These stay on the form but do not go in the Gazette.');
  out.classList.add('gazout');

  function rows() { return [].slice.call(wrap.querySelectorAll('.gazrow')); }

  function sectionOf(row) {
    var s = row.querySelector('select');
    return s ? s.value : 'notes';
  }

  function dropped(row) {
    var c = row.querySelector('input[type=checkbox]');
    return !!(c && c.checked);
  }

  function blank(row) {
    var h = row.querySelector('input[name^="head_"]');
    var b = row.querySelector('textarea');
    return !(h && h.value.trim()) && !(b && b.value.trim());
  }

  function place(row, pop) {
    var g = dropped(row) ? out : (groups[sectionOf(row)] || groups[SECTIONS[SECTIONS.length - 1].id]);
    var body = g.querySelector('.gazgroupbody');
    row.classList.toggle('isout', dropped(row));
    row.classList.toggle('isblank', blank(row));
    if (row.parentNode !== body) {
      body.appendChild(row);
      if (pop) {
        row.classList.remove('popped');
        void row.offsetWidth;
        row.classList.add('popped');
        setTimeout(function () { row.classList.remove('popped'); }, 700);
      }
    }
  }

  function tally() {
    SECTIONS.concat([{ id: '__out' }]).forEach(function (s) {
      var g = groups[s.id] || out;
      if (s.id === '__out') g = out;
      var body = g.querySelector('.gazgroupbody');
      var all = body.querySelectorAll('.gazrow').length;
      var real = body.querySelectorAll('.gazrow:not(.isblank)').length;
      g.hidden = all === 0;
      var n = g.querySelector('.gazgroupn');
      n.textContent = real ? real + (real === 1 ? ' entry' : ' entries') : (all ? 'empty' : '');
    });
  }

  function arrange(pop) {
    rows().forEach(function (r) { place(r, pop); });
    tally();
  }

  function addBlank() {
    var src = rows()[0];
    if (!src) return;
    var n = parseInt(countEl.value, 10) || rows().length;
    var row = src.cloneNode(true);
    [].forEach.call(row.querySelectorAll('[name]'), function (el) {
      el.name = el.name.replace(/_\d+$/, '_' + n);
      if (el.tagName === 'TEXTAREA') el.value = '';
      else if (el.type === 'checkbox') el.checked = false;
      else if (el.tagName !== 'SELECT') el.value = '';
    });
    row.classList.remove('popped', 'isout');
    row.classList.add('isblank');
    countEl.value = String(n + 1);
    wrap.appendChild(row);
    place(row, false);
    tally();
    return row;
  }

  wrap.addEventListener('change', function (e) {
    var row = e.target.closest ? e.target.closest('.gazrow') : null;
    if (!row) return;
    place(row, true);
    tally();
  });

  wrap.addEventListener('input', function (e) {
    var row = e.target.closest ? e.target.closest('.gazrow') : null;
    if (!row) return;
    var was = row.classList.contains('isblank');
    row.classList.toggle('isblank', blank(row));
    if (was && !blank(row)) {
      var spare = rows().filter(function (r) { return r.classList.contains('isblank'); }).length;
      if (spare < 2) addBlank();
    }
    tally();
  });

  var more = document.getElementById('gazmore');
  if (more) more.addEventListener('click', function () { var r = addBlank(); if (r) r.querySelector('input[name^="head_"]').focus(); });

  arrange(false);
})();
