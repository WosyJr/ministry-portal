const { esc } = require('./views');
const G = require('./guide');
const Ranks = require('./ranks');

const hidden = c => `<input type="hidden" name="_csrf" value="${esc(c)}">`;

const HALLS = {
  justice: 'the Ministry of Justice',
  war: 'the Imperial War Office',
  finance: 'the Ministry of Finance',
  civil: 'the Ministry of Civil & Administrative Affairs',
  general: 'the Ministry'
};

function hallNav(u) {
  try {
    if (!u || u.all) return '';
    const b = Ranks.userBranch(u);
    if (b === 'justice') return require('./justiceviews').jusNav('guide', u);
    if (b === 'war') return require('./warviews').warNav('guide', u);
    if (b === 'finance') return require('./financeviews').finNav('guide', u);
  } catch (_) { return ''; }
  return '';
}

function guidePage(u, progress, csrf) {
  const duties = G.duties(u);
  const not = G.notYours(u);
  const done = progress.filter(s => s.done).length;
  const hall = HALLS[u && u.all ? 'civil' : Ranks.userBranch(u)] || HALLS.civil;
  return `${hallNav(u)}<section>
    <div class="eyebrow">Written for your office alone</div>
    <h2>What ${esc(u.title || u.rankName || 'you')} may do</h2>
    <p class="lede">${esc(u.name)}, of ${esc(hall)}. Everything below is something you can actually do — nothing here is shut to you.</p>

    <div class="two">
      <div>
        <div class="section-label">The things you will do</div>
        ${duties.map(d => `<article class="reqcard guidecard">
          <h3>${esc(d.head)}</h3>
          <p style="margin:0">${esc(d.body)}</p>
        </article>`).join('')}

        ${not.length ? `<div class="section-label">What is not yours</div>
        <article class="reqcard dimcard">
          <ul class="plainlist">${not.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
          <p class="hint" style="margin:8px 0 0">None of this is a punishment. An office that can do everything is an office nobody can check.</p>
        </article>` : ''}
      </div>

      <div>
        <div class="section-label">Finding your feet</div>
        <article class="reqcard">
          <p class="hint" style="margin:0 0 10px">These tick themselves as you do them. Nobody is watching the list but you. ${done} of ${progress.length} so far.</p>
          <ul class="plainlist footlist">
            ${progress.map(s => `<li class="${s.done ? 'done' : ''}">
              <span class="tick">${s.done
                ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3E5A2B" stroke-width="2.3" aria-hidden="true"><path d="M4 12.5l5.5 5.5L20 7"></path></svg>'
                : '<span class="box"></span>'}</span>
              <span>${s.done ? `<s>${esc(s.what)}</s>` : (s.link ? `<a href="${esc(s.link)}">${esc(s.what)}</a>` : esc(s.what))}</span>
            </li>`).join('')}
          </ul>
        </article>

        <div class="section-label">Words you will meet</div>
        <article class="reqcard">
          <dl class="meta glossary">
            ${G.TERMS.map(([t, d]) => `<dt>${esc(t.replace(/\b\w/g, c => c.toUpperCase()))}</dt><dd>${esc(d)}</dd>`).join('')}
          </dl>
          <p class="hint" style="margin:10px 0 0">Any of these words, anywhere in the hall, has a dotted line under it. Hover or tap for this same line.</p>
        </article>

        <article class="reqcard dimcard">
          <p style="margin:0 0 10px">Want shown round the hall again?</p>
          <form method="post" action="/staff/guide/again">${hidden(csrf)}<button class="btn small" type="submit">Walk me round again</button></form>
        </article>
      </div>
    </div>
  </section>`;
}

function tourOverlay(u, csrf, back, n) {
  const steps = G.tourFor(u);
  if (!steps.length) return '';
  const i = Math.max(0, Math.min(steps.length - 1, Number(n) || 0));
  const st = steps[i];
  const last = i === steps.length - 1;
  const pct = Math.round(((i + 1) / steps.length) * 100);
  const hid = `<input type="hidden" name="_csrf" value="${esc(csrf)}">`;
  return `<div class="tourveil" id="tourveil" data-point="${esc(st.point || '')}" data-try="${esc(st.tryIt || '')}">
  <div class="tourspot" id="tourspot" hidden></div>
  <div class="tourcard" id="tourcard" role="dialog" aria-modal="true" aria-labelledby="tour-h">
    <div class="tourarrow" id="tourarrow" hidden></div>
    <div class="tourtop">
      <span class="eyebrow">${i + 1} of ${steps.length}</span>
      <span class="tbar" aria-hidden="true"><span style="width:${pct}%"></span></span>
    </div>
    <h3 id="tour-h">${esc(st.head)}</h3>
    <p class="tourbody">${esc(st.body)}</p>
    ${st.eg ? `<p class="toureg">${esc(st.eg)}</p>` : ''}
    ${st.tryIt ? `<p class="tourtry" id="tourtry"><b>Try it \u2014</b> ${esc(st.tryLabel || 'click the part lit up above.')}</p>` : ''}
    <div class="tourfoot">
      <form method="post" action="/staff/guide/step">${hid}<input type="hidden" name="n" value="${i - 1}"><button class="btn ghost small" type="submit"${i === 0 ? ' disabled' : ''}>Back</button></form>
      <form method="post" action="/staff/guide/step" id="tournextform">${hid}<input type="hidden" name="n" value="${last ? -1 : i + 1}"><button class="btn small" type="submit" id="tournext">${last ? 'Finish' : 'Next'}</button></form>
      <form method="post" action="/staff/guide/seen" class="tourleave">${hid}<button class="tourskip" type="submit">Leave the tour</button></form>
    </div>
  </div>
</div>
<script src="/tour.js?v=4" defer></script>`;
}

module.exports = { guidePage, tourOverlay };
