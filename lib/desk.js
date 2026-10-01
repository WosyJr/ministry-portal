const Notify = require('./notify');
const Ranks = require('./ranks');
const A = require('./auth');

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function gather(u, rows, extra = {}) {
  if (!u) return null;
  const groups = [];

  const letters = extra.letters || [];
  if (letters.length) {
    groups.push({
      key: 'letters', head: 'Sent to you',
      items: letters.map(l => ({
        title: l.subject || 'A letter',
        note: `${l.byName || 'The Ministry'}${l.must ? ' — must be acknowledged' : ''}`,
        link: '/staff/letters/' + encodeURIComponent(l.id),
        urgent: !!l.must
      }))
    });
  }

  const notes = Notify.forUser(u).filter(n => !(n.readBy || []).includes(u.username)).slice(0, 6);
  if (notes.length) {
    groups.push({
      key: 'word', head: 'Word for you',
      items: notes.map(n => ({ title: n.text, note: '', link: n.link || '/staff/notifications' }))
    });
  }

  const week = extra.week;
  if (week && week.lines) {
    const owed = week.lines.filter(l => l.met === false);
    if (owed.length) {
      groups.push({
        key: 'owed', head: 'Owed by you this week',
        items: owed.map(l => ({ title: l.name, note: l.detail, link: l.link || '/staff/week' }))
      });
    }
  }

  if (rows && A.can(u, 'approve')) {
    const seal = rows.filter(r => r.Status === 'Awaiting Seal').slice(0, 6);
    if (seal.length) {
      groups.push({
        key: 'seal', head: 'Awaiting your seal',
        items: seal.map(r => ({ title: r['Record No'], note: r.Subject, link: '/staff/records/' + encodeURIComponent(r['Record No']) }))
      });
    }
  }

  if (rows) {
    const mine = rows.filter(r => r['Assigned To'] === u.username && !['Closed', 'Archived', 'Revoked', 'Standing'].includes(r.Status)).slice(0, 6);
    if (mine.length) {
      groups.push({
        key: 'assigned', head: 'Left on your hands',
        items: mine.map(r => ({ title: r['Record No'], note: r.Subject, link: '/staff/records/' + encodeURIComponent(r['Record No']) }))
      });
    }
  }

  const count = groups.reduce((n, g) => n + g.items.length, 0);
  const urgent = groups.some(g => g.items.some(i => i.urgent));
  return { groups, count, urgent };
}

function button(desk) {
  if (!desk) return '';
  const n = desk.count;
  return `<button type="button" class="deskbtn${desk.urgent ? ' urgent' : ''}" id="deskbtn" aria-expanded="false" aria-controls="deskpanel">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16v12H4z"></path><path d="M4 7l8 6 8-6"></path></svg>
    The Desk${n ? ` <span class="badge">${n}</span>` : ''}
  </button>`;
}

function panel(desk) {
  if (!desk) return '';
  const item = i => `<a class="deskitem${i.urgent ? ' urgent' : ''}" href="${esc(i.link)}">
    <span class="dt">${esc(i.title)}</span>
    ${i.note ? `<span class="dn">${esc(i.note)}</span>` : ''}
  </a>`;
  const body = desk.groups.length
    ? desk.groups.map(g => `<div class="deskgroup"><div class="dh">${esc(g.head)}</div>${g.items.map(item).join('')}</div>`).join('')
    : '<p class="deskempty">Nothing wants your hand. The desk is clear.</p>';
  return `<div class="deskpanel" id="deskpanel" hidden>
    <div class="deskhead">
      <b>Your Desk</b>
      <span>${desk.count ? (desk.count === 1 ? 'one thing' : desk.count + ' things') : 'clear'}</span>
      <button type="button" class="deskclose" id="deskclose" aria-label="Close the Desk">✕</button>
    </div>
    <div class="deskbody">${body}</div>
    <div class="deskfoot"><a href="/staff/desk">Open it in full</a></div>
  </div>`;
}

const SCRIPT = `<script>(function(){var b=document.getElementById('deskbtn'),p=document.getElementById('deskpanel'),c=document.getElementById('deskclose');if(!b||!p)return;
function open(v){p.hidden=!v;b.setAttribute('aria-expanded',v?'true':'false');document.body.classList.toggle('desk-open',!!v);}
b.addEventListener('click',function(e){e.stopPropagation();open(p.hidden);});
if(c)c.addEventListener('click',function(){open(false);b.focus();});
document.addEventListener('click',function(e){if(!p.hidden&&!p.contains(e.target)&&e.target!==b)open(false);});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!p.hidden){open(false);b.focus();}});
})();</script>`;

module.exports = { gather, button, panel, SCRIPT };
