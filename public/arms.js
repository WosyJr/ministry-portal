(function () {
  var form = document.getElementById('armsform');
  var out = document.getElementById('armspreview');
  var dataEl = document.getElementById('armsdata');
  if (!form || !out || !dataEl) return;

  var D;
  try { D = JSON.parse(dataEl.textContent); } catch (e) { return; }

  function val(name) {
    var el = form.elements[name];
    if (!el) return '';
    if (el.length !== undefined && el.tagName === undefined) {
      for (var i = 0; i < el.length; i++) if (el[i].checked) return el[i].value;
      return '';
    }
    return el.value;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function draw() {
    var shape = val('shape') || 'heater';
    var field = val('field') || 'azure';
    var division = val('division') || 'plain';
    var second = val('second') || 'or';
    var ordinary = val('ordinary') || 'none';
    var ordTint = val('ordinaryTint') || 'argent';
    var charge = val('charge') || 'none';
    var chTint = val('chargeTint') || 'or';
    var motto = (form.elements.motto && form.elements.motto.value) || '';

    var shapeD = D.shapes[shape];
    var divD = D.divisions[division];
    var ordD = D.ordinaries[ordinary];
    var chD = D.charges[charge];
    var id = 'p' + Math.floor(Math.random() * 1e8);

    var ord = '';
    if (ordD === 'border') ord = '<path d="' + shapeD + '" fill="none" stroke="' + D.hex[ordTint] + '" stroke-width="12"></path>';
    else if (ordD) ord = '<path d="' + ordD + '" fill="' + D.hex[ordTint] + '"></path>';

    out.innerHTML = '<svg class="arms" width="220" height="260" viewBox="0 0 100 118" role="img">'
      + '<defs><clipPath id="' + id + '"><path d="' + shapeD + '"></path></clipPath></defs>'
      + '<g clip-path="url(#' + id + ')">'
      + '<rect x="0" y="0" width="100" height="118" fill="' + D.hex[field] + '"></rect>'
      + (divD ? '<path d="' + divD + '" fill="' + D.hex[second] + '"></path>' : '')
      + ord
      + (chD ? '<path d="' + chD + '" fill="' + D.hex[chTint] + '" stroke="' + D.hex[chTint] + '" stroke-width="'
          + (charge === 'stag' || charge === 'quill' ? 4 : 0) + '" stroke-linecap="round" stroke-linejoin="round" fill-rule="evenodd"></path>' : '')
      + '</g>'
      + '<path d="' + shapeD + '" fill="none" stroke="#3A2208" stroke-width="2.6" stroke-linejoin="round"></path>'
      + '</svg>';

    var parts = [];
    if (division === 'plain') parts.push(D.names.tinct[field]);
    else parts.push(D.names.division[division] + ' ' + D.names.tinct[field] + ' and ' + D.names.tinct[second]);
    if (ordinary !== 'none') parts.push(low(D.names.ordinary[ordinary]) + ' ' + D.names.tinct[ordTint]);
    if (charge !== 'none') parts.push(low(D.names.charge[charge]) + ' ' + D.names.tinct[chTint]);
    document.getElementById('armsblazon').textContent = parts.join(', ');
    document.getElementById('armsmotto').textContent = motto ? '“' + motto + '”' : '';

    var warn = [];
    if (division !== 'plain' && D.names.kind[field] === D.names.kind[second]) warn.push('the two halves of the field are both ' + D.names.kind[field] + 's');
    if (division === 'plain' && ordinary !== 'none' && D.names.kind[ordTint] === D.names.kind[field]) warn.push('the band is the same kind as the field');
    if (division === 'plain' && charge !== 'none' && D.names.kind[chTint] === D.names.kind[field]) warn.push('the charge is the same kind as the field');
    document.getElementById('armswarn').textContent = warn.length
      ? 'The heralds would grumble: ' + warn.join('; ') + '. It is allowed, and it is yours.' : '';
    void esc;

    var sw = document.getElementById('secondwrap');
    if (sw) sw.hidden = division === 'plain';
    var ow = document.getElementById('ordtintwrap');
    if (ow) ow.hidden = ordinary === 'none';
    var cw = document.getElementById('chtintwrap');
    if (cw) cw.hidden = charge === 'none';

    [].forEach.call(form.querySelectorAll('label.tinct'), function (l) {
      var i = l.querySelector('input');
      l.classList.toggle('on', !!(i && i.checked));
    });
  }

  function low(s) { return String(s).replace(/^A /, 'a ').replace(/^An /, 'an '); }

  form.addEventListener('input', draw);
  form.addEventListener('change', draw);

  var roll = document.getElementById('armsroll');
  if (roll) {
    roll.addEventListener('click', function () {
      var metals = [], colours = [];
      Object.keys(D.names.kind).forEach(function (k) { (D.names.kind[k] === 'metal' ? metals : colours).push(k); });
      var any = function (a) { return a[Math.floor(Math.random() * a.length)]; };
      var divs = Object.keys(D.divisions);
      var ords = Object.keys(D.ordinaries);
      var chs = Object.keys(D.charges).filter(function (k) { return k !== 'none'; });
      var fieldIsColour = Math.random() < 0.72;
      var field = fieldIsColour ? any(colours) : any(metals);
      var other = fieldIsColour ? metals : colours;

      set('shape', any(Object.keys(D.shapes)));
      set('division', Math.random() < 0.45 ? any(divs) : 'plain');
      set('ordinary', Math.random() < 0.45 ? any(ords) : 'none');
      set('charge', Math.random() < 0.8 ? any(chs) : 'none');
      radio('field', field);
      radio('second', any(other));
      radio('ordinaryTint', any(other));
      radio('chargeTint', any(other));
      draw();
    });
  }

  function set(name, v) { if (form.elements[name]) form.elements[name].value = v; }
  function radio(name, v) {
    var el = form.elements[name];
    if (!el || el.length === undefined) return;
    for (var i = 0; i < el.length; i++) el[i].checked = el[i].value === v;
  }

  draw();
})();
