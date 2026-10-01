const { esc } = require('./views');
const small = s => '<span class="small">' + s + '</span>';
const Q = require('./quota');

function mark(met) {
  if (met === null) return '<span class="chip">—</span>';
  return met ? '<span class="chip ok">Done</span>' : '<span class="chip warn">Still owed</span>';
}

function lineRow(l) {
  return `<li class="weekline">
    <span class="weekmark">${mark(l.met)}</span>
    <span class="weekbody">
      <b>${esc(l.name)}</b>
      <span class="small">${esc(l.what)}</span>
      <span class="small dim">${esc(l.detail)}</span>
    </span>
    ${l.link ? `<a class="btn ghost small" href="${esc(l.link)}">Open</a>` : ''}
  </li>`;
}

function weekPage(u, w, history, cfg) {
  const owed = w.lines.filter(l => l.met === false).length;
  return `<section>
    <h2>Your Week</h2>
    <p class="lede">${esc(w.holds.join(', ') || 'No Holds are set against your rank')} · the week of ${esc(w.label)}.</p>
    ${owed
      ? `<p class="notice">${owed === 1 ? 'One thing is' : owed + ' things are'} still owed this week.</p>`
      : '<p class="notice">Nothing is owed. The week is met.</p>'}

    <div class="section-label">This Week</div>
    <ul class="plainlist weeklist">${w.lines.map(lineRow).join('')}</ul>

    ${w.duty ? `<div class="section-label">The Duty Drawn</div>
      <article class="reqcard">
        <p style="margin:0 0 4px"><b>${esc(w.duty.text)}</b></p>
        <p class="hint" style="margin:0">${w.duty.assigned
          ? 'Set for you by the Minister this week.'
          : 'Drawn for you this week. It changes every Monday.'} Write what came of it into your Return.</p>
      </article>` : ''}

    <div class="section-label">Weeks Behind You</div>
    ${history.length ? `<div class="tablewrap"><table class="ledger"><thead><tr><th>Week</th><th>Standing</th><th>What was short</th></tr></thead><tbody>
      ${history.map(h => `<tr><td>${esc(Q.weekLabel(h.week))}</td>
        <td>${h.met ? '<span class="chip ok">Met</span>' : '<span class="chip warn">Short</span>'}</td>
        <td>${h.met ? small('—') : esc((h.short || []).join(', '))}</td></tr>`).join('')}
    </tbody></table></div>` : '<p class="hint">No week has closed yet.</p>'}

    <p class="hint">A week closes on Sunday night. What stands here then goes on your record and does not change afterwards.</p>
  </section>`;
}

function standingPage(u, rows, cfg, csrf, week, startWeek) {
  const card = w => `<article class="reqcard${w.met ? '' : ' rulesetcard'}">
    <div class="no">${esc(w.user.rankName)} · ${esc(w.holds.join(', '))} ${w.met ? '<span class="chip ok">Met</span>' : '<span class="chip warn">Short</span>'}${w.missed ? ` <span class="chip bad">${w.missed} missed before</span>` : ''}</div>
    <h3><a href="/staff/officers/${esc(w.user.username)}">${esc(w.user.name)}</a></h3>
    <ul class="plainlist weeklist tight">${w.lines.map(lineRow).join('')}</ul>
    <details class="inlinedit"><summary class="btn ghost small">Set their duty this week</summary>
      <form method="post" action="/staff/delegates/${esc(w.user.username)}/duty" class="stack">
        <input type="hidden" name="_csrf" value="${esc(csrf)}">
        <input type="hidden" name="week" value="${esc(week)}">
        <p class="hint">Leave it empty to put them back on the rotation.</p>
        <label class="l" for="d_${esc(w.user.username)}">The duty</label>
        <input type="text" id="d_${esc(w.user.username)}" name="duty" maxlength="300" value="${esc(w.duty && w.duty.assigned ? w.duty.text : '')}" placeholder="${esc(w.duty ? w.duty.text : '')}">
        <button class="btn small" type="submit">Set it</button>
      </form>
    </details>
    ${w.history.length ? `<details class="inlinedit" style="margin-top:8px"><summary class="btn ghost small">Weeks behind them · ${w.history.filter(h => !h.met).length} short</summary>
      <table class="ledger tight"><thead><tr><th>Week</th><th>Standing</th><th>Set it</th></tr></thead><tbody>
      ${w.history.map(h => `<tr>
        <td>${esc(Q.weekLabel(h.week))}</td>
        <td>${h.met ? '<span class="chip ok">Met</span>' : '<span class="chip warn">Short</span>'}${h.byHand ? '<br>' + small('by ' + esc(h.byHand)) : ''}</td>
        <td><form method="post" action="/staff/delegates/${esc(w.user.username)}/week" class="inline">
          <input type="hidden" name="_csrf" value="${esc(csrf)}">
          <input type="hidden" name="week" value="${esc(h.week)}">
          <button class="btn ghost small" name="met" value="${h.met ? '' : '1'}" type="submit">${h.met ? 'Mark short' : 'Mark met'}</button>
        </form></td></tr>`).join('')}
      </tbody></table>
    </details>` : ''}
  </article>`;

  const short = rows.filter(w => !w.met).length;
  return `<section>
    <h2>The Delegates</h2>
    <p class="lede">What each Delegate owes this week, and what they have done about it. The week of ${esc(Q.weekLabel(week))}.</p>
    ${rows.length
      ? (short ? `<p class="notice">${short} of ${rows.length} ${short === 1 ? 'is' : 'are'} short with the week part gone.</p>` : '<p class="notice">All are met.</p>')
      : '<p class="lede">No officer holds a rank that carries a weekly quota.</p>'}
    <div class="board">${rows.map(card).join('')}</div>

    <div class="section-label">What a Week Asks</div>
    <article class="reqcard">
      <form method="post" action="/staff/delegates/settings" class="warform">
        <input type="hidden" name="_csrf" value="${esc(csrf)}">
        <div class="wargrid">
          <label class="csf"><span>Rounds owed each week</span>
            <span class="say">Records they must file in their own Holds. Nought turns it off.</span>
            <input type="number" min="0" max="20" name="rounds" value="${esc(String(cfg.rounds))}"></label>
        </div>
        <label class="checkline" style="margin-top:10px"><input type="checkbox" name="paper" value="1"${cfg.paper ? ' checked' : ''}> <b>A Weekly Return is owed</b> — the written paper, which comes to you for a seal</label>
        <label class="checkline" style="margin-top:6px"><input type="checkbox" name="duty" value="1"${cfg.duty ? ' checked' : ''}> <b>Draw a duty each week</b> — one task from the list below, rotating</label>
        <label class="csf csf-wide" style="margin-top:12px"><span>The duties drawn from</span>
          <span class="say">One to a line. They rotate, so each Delegate gets a different one each week.</span>
          <textarea name="duties" rows="8" maxlength="6000">${esc(cfg.duties.join('\n'))}</textarea></label>
        <div class="linkrow"><button class="btn" type="submit">Set it down</button></div>
      </form>
    </article>

    <div class="section-label">Where the Record Begins</div>
    <article class="reqcard">
      <p style="margin:0 0 8px">Weeks before the Ministry kept this record were counted as short, because nothing was filed in them. ${startWeek ? `The record now begins at <b>${esc(Q.weekLabel(startWeek))}</b>.` : 'Set where the record begins and everything before it is struck — nobody is marked short for a week nobody was asked about.'}</p>
      <form method="post" action="/staff/delegates/start" class="warform">
        <input type="hidden" name="_csrf" value="${esc(csrf)}">
        <div class="wargrid">
          <label class="csf"><span>Begin the record at</span>
            <select name="week" class="sel">${Q.recentWeeks(12).map(k => `<option value="${esc(k)}"${k === startWeek ? ' selected' : ''}>${esc(Q.weekLabel(k))}</option>`).join('')}</select></label>
        </div>
        <div class="linkrow"><button class="btn small" type="submit">Begin it here</button>
          ${startWeek ? `<button class="btn ghost small" name="week" value="" type="submit">Count every week again</button>` : ''}</div>
      </form>
      <p class="hint" style="margin:10px 0 0">You can also set any single week by hand, met or short, from <i>Weeks behind them</i> on each Delegate.</p>
    </article>

    <p class="hint">A week closes on Sunday night. Anyone short is written into their record and you are told. After that it stands unless you set it by hand.</p>
  </section>`;
}

module.exports = { weekPage, standingPage };
