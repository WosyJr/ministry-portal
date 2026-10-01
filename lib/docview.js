const { esc } = require('./views');

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function render(spec, v) {
  const vals = v.fields || {};
  const val = (f) => {
    if (f.type === 'fixed') return esc(f.value);
    if (f.type === 'options') return f.options.map(o => `<span class="${vals[f.id] === o ? 'dv-on' : 'dv-off'}">${vals[f.id] === o ? '☒' : '☐'} ${esc(o)}</span>`).join(' ');
    return vals[f.id] ? `<span class="dv-ink">${esc(vals[f.id])}</span>` : '<span class="dv-blank">&nbsp;</span>';
  };
  let n = 0;
  const secs = spec.sections.map(s => {
    let inner = '';
    if (s.note) inner += `<p class="dv-note">${esc(s.note)}</p>`;
    if (s.kv) inner += `<table class="dv-kv">${s.kv.map(f => `<tr><th>${esc(f.label)}</th><td>${val(f)}</td></tr>`).join('')}</table>`;
    if (s.lines) {
      const lines = String(vals[s.id] || '').split('\n');
      while (lines.length < s.lines) lines.push('');
      inner += `<div class="dv-lines">${lines.map(l => `<div>${l ? `<span class="dv-ink">${esc(l)}</span>` : '&nbsp;'}</div>`).join('')}</div>`;
    }
    if (s.grid) {
      const rows = (vals[s.id] || []).filter(r => r.some(Boolean));
      while (rows.length < (s.rows || 5)) rows.push(s.grid.map(() => ''));
      inner += `<table class="dv-grid"><tr>${s.grid.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${rows.map(r => `<tr>${s.grid.map((_, j) => `<td><span class="dv-ink">${esc(r[j] || '')}</span></td>`).join('')}</tr>`).join('')}</table>`;
    }
    if (s.after) inner += `<p class="dv-after">${esc(s.after)}</p>`;
    return `<h4 class="dv-h"><span>${ROMAN[n++]}.</span> ${esc(s.h)}</h4>${inner}`;
  }).join('');
  const sigs = spec.sig.map((role, i) => `<div class="dv-sig"><div class="dv-signame">${esc(((v.sigNames || [])[i] || '').split(',')[0]) || '&nbsp;'}</div><div class="dv-sigline">Signature</div><b>${esc(role)}</b></div>`).join('');
  return `<div class="docview">
    <div class="dv-auth">By the Authority of the Governor</div>
    <div class="dv-admin">Cyrodilic Administration for the Imperial Province of Skyrim</div>
    <div class="dv-ministry">Provincial Ministry of Civil and Administrative Affairs</div>
    <div class="dv-orn">❧ ✦ ☙</div>
    <div class="dv-title">${esc(spec.title)}</div>
    <div class="dv-sub">${esc(spec.subtitle)}</div>
    ${spec.banner ? `<div class="dv-banner">${esc(spec.banner)}</div>` : ''}
    <table class="dv-head"><tr><td><b>${esc(spec.num)} No.</b><br>${esc(v.recordNo || '— assigned when filed —')}</td><td><b>Date of Record</b><br><span class="dv-ink">${esc(v.recordDate || '')}</span></td><td><b>Record State</b><br>☒ Open ☐ Closed ☐ Archived</td></tr></table>
    <p class="dv-pre">${esc(spec.preamble)}</p>
    ${secs}
    <h4 class="dv-h"><span>${ROMAN[n++]}.</span> Certification</h4>
    <p class="dv-cert">Given under hand and entered upon the rolls of the Ministry on <span class="dv-ink">${esc(v.recordDate || '')}</span></p>
    ${v.filedBy ? `<p class="dv-cert small">Entered by <span class="dv-ink">${esc(v.filedBy)}</span></p>` : ''}
    <div class="dv-sigs">${sigs}</div>
    <div class="dv-seal">L. S.<br><small>Place of the Seal or Signet</small></div>
  </div>`;
}

module.exports = { render };
