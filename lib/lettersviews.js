const { esc } = require('./views');
const Ranks = require('./ranks');

const small = s => `<span class="small">${s}</span>`;
const hidden = c => `<input type="hidden" name="_csrf" value="${esc(c)}">`;
const when = iso => { try { return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); } catch (_) { return ''; } };
const pre = t => `<div class="pre">${esc(t)}</div>`;

function hallNav(u) {
  try {
    if (!u || u.all) return '';
    const Ranks = require('./ranks');
    const b = Ranks.userBranch(u);
    if (b === 'justice') return require('./justiceviews').jusNav('', u);
    if (b === 'war') return require('./warviews').warNav('', u);
    if (b === 'finance') return require('./financeviews').finNav('', u);
  } catch (_) { return ''; }
  return '';
}

function deskFull(u, d) {
  const nav = hallNav(u);
  if (!d || !d.groups.length) return `${nav}<section class="deskclear"><h2>Your Desk</h2><p class="lede writtenin">Nothing wants your hand today. The desk is clear.</p></section>`;
  const item = i => `<a class="deskitem${i.urgent ? ' urgent' : ''}" href="${esc(i.link)}">
    <span class="dt">${esc(i.title)}</span>${i.note ? `<span class="dn">${esc(i.note)}</span>` : ''}</a>`;
  return `${nav}<section>
    <h2>Your Desk</h2>
    <p class="lede">Everything the Ministry wants of you. ${d.count === 1 ? 'One thing waits.' : d.count + ' things wait.'}</p>
    ${d.groups.map(g => `<div class="section-label">${esc(g.head)}</div><div class="deskgroup plainfull">${g.items.map(item).join('')}</div>`).join('')}
  </section>`;
}

function letterPage(u, l, mine, csrf) {
  const done = !!l.read[u.username];
  return `${hallNav(u)}<section class="letterwrap">
    <p style="margin:0 0 10px"><a href="/staff/desk">← Your Desk</a></p>
    <article class="letter">
      <div class="letterhead">
        <div class="eyebrow">Under the hand of ${esc(l.byName)}</div>
        <h2>${esc(l.subject)}</h2>
        <p class="lede">To ${esc(l.toLabel)} · ${esc(when(l.at))}${l.must ? ' · <span class="chip warn">must be acknowledged</span>' : ''}</p>
      </div>
      ${pre(l.body)}
      <p class="small" style="margin-top:14px">${esc(l.byName)}${l.byTitle ? ', ' + esc(l.byTitle) : ''}</p>
      ${mine ? `<div class="linkrow" style="margin-top:14px">
        ${done
          ? '<span class="chip ok">You have set your hand to this</span>'
          : `<form method="post" action="/staff/letters/${esc(l.id)}/read">${hidden(csrf)}<input type="hidden" name="back" value="/staff/letters/${esc(l.id)}"><button class="btn" type="submit">I have read this</button></form>`}
      </div>` : ''}
      ${l.by === u.username || u.all ? `<div class="linkrow" style="margin-top:12px"><a class="btn ghost small" href="/staff/letters/${esc(l.id)}/who">Who has read it</a></div>` : ''}
    </article>
  </section>`;
}

function overlay(l, csrf, back, queue) {
  const more = Math.max(0, (queue || 1) - 1);
  return `<div class="letterveil" id="letterveil">
    <article class="letter sealed" role="dialog" aria-modal="true" aria-labelledby="lv-h">
      <div class="letterwax" aria-hidden="true"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#F1D9A8" stroke-width="1.3"><path d="M12 3l2.2 4.8L19.5 8l-3.8 3.6.9 5.3L12 14.4 7.4 16.9l.9-5.3L4.5 8l5.3-.2z"/></svg></div>
      <div class="letterhead">
        <div class="eyebrow">Under the hand of ${esc(l.byName)}</div>
        <h2 id="lv-h">${esc(l.subject)}</h2>
        <p class="lede">${esc(when(l.at))}${l.must ? ' · must be acknowledged' : ''}${queue > 1 ? ` · <b>letter 1 of ${queue} waiting on you</b>` : ''}</p>
      </div>
      ${pre(l.body)}
      <p class="small" style="margin-top:12px">${esc(l.byName)}${l.byTitle ? ', ' + esc(l.byTitle) : ''}</p>
      <div class="letterfoot">
        <span class="small">${l.must ? 'This letter will not close until you set your hand to it.' : 'It will keep on your Desk if you want it again.'}${more ? ` There ${more === 1 ? 'is one more letter' : 'are ' + more + ' more letters'} behind this one.` : ''}</span>
        <span class="linkrow">
          ${l.must ? '' : `<button class="btn ghost small" type="button" id="letterlater">Close</button>`}
          <form method="post" action="/staff/letters/${esc(l.id)}/read">${hidden(csrf)}<input type="hidden" name="back" value="${esc(back || '/staff')}"><button class="btn" type="submit">I have read this</button></form>
        </span>
      </div>
    </article>
  </div>
  <script>(function(){var b=document.getElementById('letterlater'),v=document.getElementById('letterveil');if(b&&v)b.addEventListener('click',function(){v.remove();document.body.classList.remove('veiled');});document.body.classList.add('veiled');})();</script>`;
}

function lettersPage(u, sent, waiting, csrf, officers, ranks) {
  const mayWrite = u.all || Ranks.can(u, 'officers');
  const mine = Ranks.userBranch(u);
  const people = officers.filter(o => o.active !== false && (u.all || Ranks.userBranch(o) === mine) && o.username !== u.username);
  const rankList = ranks.filter(r => u.all || Ranks.branchOf(r) === mine);
  return `${hallNav(u)}<section>
    <h2>Letters</h2>
    <p class="lede">A letter opens on their screen the next time they enter the hall. They need not be here now.</p>

    ${waiting.length ? `<div class="section-label">Waiting on You</div>
      ${waiting.map(l => `<article class="reqcard">
        <div class="no">${esc(l.byName)} · ${esc(when(l.at))}${l.must ? ' <span class="chip warn">must be acknowledged</span>' : ''}</div>
        <h3><a href="/staff/letters/${esc(l.id)}">${esc(l.subject)}</a></h3>
      </article>`).join('')}` : ''}

    ${mayWrite ? `<div class="section-label">Write to the Ministry</div>
    <form class="warform" method="post" action="/staff/letters">${hidden(csrf)}
      <fieldset class="permset"><legend>To whom</legend>
        <label class="checkline"><input type="radio" name="to" value="named" checked> <b>Named officers</b></label>
        <label class="csf csf-wide" style="margin:6px 0 10px">
          <span class="say">Tick everyone this should go to.</span>
          <span class="checklist lettertargets">${people.map(o => `<label class="checkline"><input type="checkbox" name="who" value="${esc(o.username)}"> ${esc(o.name)} <span class="small">— ${esc(o.rankName)}</span></label>`).join('') || '<span class="hint">No other officer is on the rolls.</span>'}</span>
        </label>
        <label class="checkline"><input type="radio" name="to" value="rank"> <b>Everyone of a rank</b>
          <select name="rank" class="sel" style="margin-left:8px;max-width:320px">${rankList.map(r => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</select></label>
        <label class="checkline" style="margin-top:6px"><input type="radio" name="to" value="ministry"> <b>Everyone of my Ministry</b></label>
        ${u.all ? `<label class="checkline" style="margin-top:6px"><input type="radio" name="to" value="everyone"> <b>Every officer on the rolls</b> <span class="small">— every hall, yours alone to send</span></label>` : ''}
      </fieldset>
      <label class="csf csf-wide" style="margin-top:10px"><span>Subject <span class="req">*</span></span>
        <span class="say">What it is about, in a few words. They see this before they open it.</span>
        <input type="text" name="subject" required maxlength="160" placeholder="e.g. Upon the state of the Reach"></label>
      <label class="csf csf-wide" style="margin-top:10px"><span>The letter <span class="req">*</span></span>
        <textarea name="body" rows="7" maxlength="6000" required></textarea></label>
      <fieldset class="permset" style="margin-top:10px"><legend>How it is to be taken</legend>
        <label class="checkline"><input type="radio" name="must" value=""checked> <b>An ordinary letter</b> <span class="small">— they may close it; it stays on their Desk</span></label>
        <label class="checkline" style="margin-top:6px"><input type="radio" name="must" value="1"> <b>Must be acknowledged</b> <span class="small">— it will not close until they set their hand to it, and you will see who has</span></label>
      </fieldset>
      <div class="linkrow"><button class="btn" type="submit">Send it</button></div>
    </form>` : ''}

    ${sent.length ? `<div class="section-label">Letters You Have Sent</div>
      <div class="tablewrap"><table class="ledger"><thead><tr><th>Subject</th><th>To</th><th>Sent</th><th>Read</th><th></th></tr></thead><tbody>
      ${sent.map(l => {
        const n = l.names.length;
        const done = l.names.filter(x => l.read[x]).length;
        return `<tr><td><a href="/staff/letters/${esc(l.id)}">${esc(l.subject)}</a>${l.must ? ' <span class="chip warn">acknowledge</span>' : ''}</td>
          <td>${esc(l.toLabel)}</td><td>${esc(when(l.at))}</td>
          <td>${done === n ? `<span class="chip ok">all ${n}</span>` : `<span class="chip${done ? '' : ' warn'}">${done} of ${n}</span>`}</td>
          <td><a class="btn ghost small" href="/staff/letters/${esc(l.id)}/who">Who</a></td></tr>`;
      }).join('')}
      </tbody></table></div>` : ''}
  </section>`;
}

function receiptsPage(u, got, csrf) {
  const l = got.letter;
  const n = l.names.length;
  return `${hallNav(u)}<section>
    <p style="margin:0 0 10px"><a href="/staff/letters">← Letters</a></p>
    <h2>${esc(l.subject)}</h2>
    <p class="lede">Sent ${esc(when(l.at))} to ${esc(l.toLabel)}${l.must ? ' · must be acknowledged' : ''}</p>
    <p style="margin:0 0 16px"><span class="chip${got.done === n ? ' ok' : ' warn'}">${got.done} of ${n} ${got.done === 1 ? 'has' : 'have'} read it</span></p>

    <div class="tablewrap"><table class="ledger"><thead><tr><th>Officer</th><th>Rank</th><th>Standing</th></tr></thead><tbody>
      ${got.rows.map(r => `<tr>
        <td><b>${esc(r.user.name)}</b><br>${small(esc(r.user.username))}</td>
        <td>${esc(r.user.rankName || '')}</td>
        <td><span class="chip${r.read ? ' ok' : r.seen ? '' : ' warn'}">${esc(r.standing)}</span>${r.read ? `<br>${small(esc(when(r.read)))}` : r.seen ? `<br>${small('seen ' + esc(when(r.seen)))}` : ''}</td>
      </tr>`).join('')}
    </tbody></table></div>

    ${got.done < n ? `<p class="hint">Those who have not opened it will see it the next time they enter the hall. There is nothing to send again.</p>` : ''}
    <div class="linkrow" style="margin-top:14px">
      <a class="btn ghost small" href="/staff/letters/${esc(l.id)}">Read the letter</a>
      <form method="post" action="/staff/letters/${esc(l.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small danger" type="submit">Withdraw it</button></form>
    </div>
  </section>`;
}

module.exports = { deskFull, letterPage, overlay, lettersPage, receiptsPage };
