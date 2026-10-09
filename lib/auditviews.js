const { esc } = require('./views');
const { inworld } = require('./skyrim');
const C = require('./config');

const KINDS = [
  ['', 'Everything'], ['entered', 'Sign-ins'], ['left', 'Sign-outs'], ['drew', 'Drew / read'],
  ['laid', 'Laid / issued'], ['redacted', 'Redacted'], ['struck', 'Struck / destroyed'], ['other', 'Other']
];
const SITE_WORD = { ministry: 'Ministry', penoc: 'PenOc', bruma: 'Bruma' };

function clock(iso) {
  try {
    const d = new Date(iso);
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(d).map(x => [x.type, x.value]));
    return p.hour + ':' + p.minute + ' ' + String(p.dayPeriod || '').toLowerCase();
  } catch (_) { return ''; }
}

function auditPage(data, q, csrf) {
  const f = {
    site: String(q.site || ''), kind: String(q.kind || ''), who: String(q.who || '').trim().toLowerCase(),
    q: String(q.q || '').trim().toLowerCase(), days: data.days
  };
  let rows = data.events;
  if (f.site) rows = rows.filter(e => e.site === f.site);
  if (f.kind) rows = rows.filter(e => e.kind === f.kind);
  if (f.who) rows = rows.filter(e => String(e.who).toLowerCase() === f.who || String(e.name).toLowerCase().indexOf(f.who) >= 0);
  if (f.q) rows = rows.filter(e => (e.act + ' ' + e.what + ' ' + e.name).toLowerCase().indexOf(f.q) >= 0);
  const shown = rows.slice(0, 400);

  const people = {};
  data.events.forEach(e => { const k = (e.name || e.who || '').trim(); if (k) people[k] = (people[k] || 0) + 1; });
  const top = Object.entries(people).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const byKind = {};
  data.events.forEach(e => { byKind[e.kind] = (byKind[e.kind] || 0) + 1; });

  let lastDay = '';
  const lines = shown.map(e => {
    const day = inworld(e.at, C.CURRENT_YEAR);
    const head = day !== lastDay ? `<tr class="auditday"><td colspan="5">${esc(day)}</td></tr>` : '';
    lastDay = day;
    const base = e.site === 'ministry' ? '' : (data.feeds.find(x => x.site === e.site) || {}).url || '';
    const what = e.link && base !== undefined ? `<a href="${esc(base + e.link)}"${e.site === 'ministry' ? '' : ' target="_blank" rel="noopener"'}>${esc(e.what)}</a>` : esc(e.what);
    return head + `<tr class="k-${esc(e.kind)}">
      <td class="num">${esc(clock(e.at))}</td>
      <td><span class="chip site-${esc(e.site)}">${esc(SITE_WORD[e.site] || e.site)}</span></td>
      <td><b>${esc(e.name || e.who || 'The public')}</b></td>
      <td>${esc(e.act)}</td>
      <td>${what}</td>
    </tr>`;
  }).join('');

  return `<section>
    <h2>Every Hand</h2>
    <p class="lede">Who came in, what they drew, what they laid, what they struck, across the Ministries, the Penitus Oculatus and the County of Bruma, in one place. Newest first. Times are Eastern.</p>
    <div class="warstats">
      ${data.feeds.map(fd => `<div class="warstat${fd.error ? ' bad' : ''}"><span class="n">${fd.error ? '—' : fd.n}</span><span class="t">${esc(fd.name)}</span>${fd.error ? `<span class="warstat-note">${esc(fd.error)}</span>` : ''}</div>`).join('')}
      <div class="warstat"><span class="n">${byKind.entered || 0}</span><span class="t">Sign-ins</span></div>
      <div class="warstat"><span class="n">${byKind.struck || 0}</span><span class="t">Struck</span></div>
    </div>
    ${!C.AUDIT_KEY ? '<p class="notice"><b>AUDIT_KEY is not set</b> on this service, so only the Ministry’s own doings show. Set the same AUDIT_KEY on the ministry, penoc and bruma services in Railway and the other two halls will answer.</p>' : ''}
    <form method="get" action="/province/audit" class="form auditfilter">
      <div class="wargrid">
        <label class="csf"><span>Hall</span><select name="site"><option value="">All three</option>${['ministry', 'penoc', 'bruma'].map(s => `<option value="${s}"${f.site === s ? ' selected' : ''}>${esc(SITE_WORD[s])}</option>`).join('')}</select></label>
        <label class="csf"><span>What</span><select name="kind">${KINDS.map(([v, l]) => `<option value="${v}"${f.kind === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
        <label class="csf"><span>Who</span><input type="text" name="who" value="${esc(q.who || '')}" placeholder="A name on any roll" list="auditpeople"></label>
        <label class="csf"><span>Find</span><input type="search" name="q" value="${esc(q.q || '')}" placeholder="A record number, a word"></label>
        <label class="csf"><span>Looking back</span><select name="days">${[1, 3, 7, 30, 90].map(d => `<option value="${d}"${f.days === d ? ' selected' : ''}>${d === 1 ? 'Today and yesterday' : d + ' days'}</option>`).join('')}</select></label>
      </div>
      <datalist id="auditpeople">${top.map(([n]) => `<option value="${esc(n)}">`).join('')}</datalist>
      <div class="linkrow"><button class="btn small" type="submit">Look</button><a class="btn ghost small" href="/province/audit">Clear</a></div>
    </form>
    <div class="section-label">${rows.length} ${rows.length === 1 ? 'thing' : 'things'} done${rows.length > 400 ? ', the latest 400 shown' : ''}</div>
    ${shown.length ? `<div class="tablewrap"><table class="audit"><thead><tr><th>When</th><th>Hall</th><th>Who</th><th>Did</th><th>To</th></tr></thead><tbody>${lines}</tbody></table></div>`
      : '<p class="lede">Nothing in that time answers to those filters.</p>'}
    ${top.length ? `<div class="section-label">Busiest hands in this time</div><p class="small">${top.map(([n, c]) => `<a href="/province/audit?who=${encodeURIComponent(n)}&days=${f.days}">${esc(n)}</a> <span class="chip tiny">${c}</span>`).join(' &nbsp; ')}</p>` : ''}
  </section>`;
}

module.exports = { auditPage, KINDS };
