const { esc } = require('./views');
const C = require('./ceremony');
const Arms = require('./arms');

const hidden = c => `<input type="hidden" name="_csrf" value="${esc(c)}">`;
const day = iso => { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (_) { return ''; } };

const HALL = {
  civil: 'the Ministry of Civil and Administrative Affairs',
  justice: 'the Ministry of Justice',
  war: 'the Imperial War Office',
  finance: 'the Ministry of Finance',
  general: 'the Imperial Administration of Skyrim'
};

function ceremonyPage(u, today, csrf, minister, predecessors) {
  const articles = C.articlesFor(u);
  const hall = HALL[C.branchOf(u)] || HALL.general;
  return `<section class="ceremony">
    <div class="cerscroll">
      <div class="cerhead">
        <div class="eyebrow">By the Authority of the Governor of Skyrim</div>
        <h2>The Taking Up of an Office</h2>
        <div class="cerday">${esc((today && today.text) || 'Fourth Era')}</div>
      </div>

      <p class="cerlede">Before you are shown the hall, there is one thing to do. It takes a minute and it is not a formality the Ministry invented for its own amusement — what follows is the whole of what this office asks of you, in plain words, and nothing more will be asked of you later that is not in it.</p>

      <div class="cerwho">
        <div class="cername">${esc(u.name)}</div>
        <div class="cerrank">${esc(u.title || u.rankName)}</div>
        <div class="cerhall">of ${esc(hall)}</div>
      </div>

      ${predecessors && predecessors.length ? `<div class="cerbefore">
        <div class="section-label">Those who held it before you</div>
        <ol class="plainlist">${predecessors.map(e => `<li><b>${esc(e.name)}</b> <span class="small">${esc(day(e.from))}${e.until ? ' to ' + esc(day(e.until)) : ''}${e.why ? ' · ' + esc(e.why) : ''}</span></li>`).join('')}</ol>
        <p class="hint">Your name goes on that list today, and stays on it after you have gone.</p>
      </div>` : `<div class="cerbefore">
        <p class="hint">Nobody has held this office before you. The list begins with your name.</p>
      </div>`}

      <div class="section-label">The Articles</div>
      <ol class="ceroath">
        ${articles.map(a => `<li>${esc(a)}</li>`).join('')}
        <li>${esc(C.COMMON)}</li>
      </ol>

      <p class="cernote">Nothing here is enforced by the hall. The hall only records. These are the terms you are being asked to keep by your own word, and the only thing that makes them worth anything is that you meant it when you set your hand to them.</p>

      <form method="post" action="/staff/ceremony" class="cerform">
        ${hidden(csrf)}
        <label class="checkline"><input type="checkbox" name="read" value="1" required> I have read the Articles above and I take up this office upon them.</label>
        <div class="cersign">
          <label class="l" for="cersig">Set your hand to it — write your name</label>
          <input type="text" id="cersig" name="signature" maxlength="80" autocomplete="off" placeholder="${esc(u.name)}" required>
          <p class="hint">Write it as you would sign it. It is kept with the day and the hour.</p>
        </div>
        <div class="submitbar"><button class="btn" type="submit">I take up the office</button></div>
      </form>

      ${minister ? `<p class="hint cerfoot">Witnessed by ${esc(minister)}, and by the record itself.</p>` : ''}
    </div>
  </section>`;
}

function takenPanel(entry, arms) {
  if (!entry) return '';
  return `<article class="reqcard cerdone">
    <div class="no">${esc(entry.day || day(entry.at))}</div>
    <h3>Took up the office</h3>
    <div class="armsbeside">
      ${arms ? Arms.svg(arms, { size: 64, label: entry.name }) : ''}
      <div>
        <p style="margin:0 0 6px"><b>${esc(entry.name)}</b>, ${esc(entry.office)}, upon these articles:</p>
        <ol class="plainlist cerlist">${(entry.articles || []).concat(entry.common ? [entry.common] : []).map(a => `<li>${esc(a)}</li>`).join('')}</ol>
      </div>
    </div>
    <p class="hint" style="margin:10px 0 0">Set down ${esc(day(entry.at))}${entry.signature ? ', signed “' + esc(entry.signature) + '”' : ''}.</p>
  </article>`;
}

module.exports = { ceremonyPage, takenPanel };
