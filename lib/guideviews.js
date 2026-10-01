const { esc } = require('./views');
const G = require('./guide');

const hidden = c => `<input type="hidden" name="_csrf" value="${esc(c)}">`;

function guidePage(u, progress, csrf) {
  const duties = G.duties(u);
  const not = G.notYours(u);
  const done = progress.filter(s => s.done).length;
  return `<section>
    <div class="eyebrow">Written for your office alone</div>
    <h2>What ${esc(u.title || u.rankName || 'you')} may do</h2>
    <p class="lede">${esc(u.name)}. Everything below is something you can actually do — nothing here is shut to you.</p>

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

function tourOverlay(u, csrf, back) {
  const steps = G.tourFor(u);
  if (!steps.length) return '';
  const dots = steps.map((s, i) => `<span class="tdot${i === 0 ? ' on' : ''}"></span>`).join('');
  return `<div class="tourveil" id="tourveil">
    <article class="tourcard" role="dialog" aria-modal="true" aria-labelledby="tour-h">
      <div class="tourtop">
        <span class="eyebrow" id="tourcount">Step 1 of ${steps.length}</span>
        <span class="small">Shown once</span>
      </div>
      <h3 id="tour-h"></h3>
      <p id="tourbody"></p>
      <div class="tourfoot">
        <button class="btn" type="button" id="tournext">Next</button>
        <form method="post" action="/staff/guide/seen" class="inline">${hidden(csrf)}<input type="hidden" name="back" value="${esc(back || '/staff')}"><button class="btn ghost small" type="submit">Skip</button></form>
        <span class="tdots" id="tourdots">${dots}</span>
      </div>
    </article>
  </div>
  <script>(function(){
    var S=${JSON.stringify(steps.map(s => ({ h: s.head, b: s.body })))},i=0;
    var h=document.getElementById('tour-h'),b=document.getElementById('tourbody'),c=document.getElementById('tourcount'),
        n=document.getElementById('tournext'),d=document.getElementById('tourdots'),v=document.getElementById('tourveil');
    function draw(){h.textContent=S[i].h;b.textContent=S[i].b;c.textContent='Step '+(i+1)+' of '+S.length;
      [].forEach.call(d.children,function(x,j){x.className='tdot'+(j<=i?' on':'');});
      n.textContent=i===S.length-1?'Done':'Next';}
    n.addEventListener('click',function(){if(i<S.length-1){i++;draw();}else{
      var f=v.querySelector('form');if(f)f.submit();}});
    draw();document.body.classList.add('veiled');
  })();</script>`;
}

module.exports = { guidePage, tourOverlay };
