const Notify = require('./notify');
const Ranks = require('./ranks');
const A = require('./auth');

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const DAY = 86400000;
const PRESSING_AFTER = 3;
const DUE_WITHIN = 1;

function ageOf(iso) {
  const t = Date.parse(iso || '');
  if (!t) return { days: 0, text: 'Today' };
  const ms = Date.now() - t;
  const days = Math.floor(ms / DAY);
  if (days < 1) { const h = Math.floor(ms / 3600000); return { days: 0, text: h < 1 ? 'Just now' : h + (h === 1 ? ' hour' : ' hours') }; }
  return { days, text: days + (days === 1 ? ' day' : ' days') };
}

function gather(u, rows, extra = {}) {
  if (!u) return null;
  const groups = [];
  const meta = typeof extra.meta === 'function' ? extra.meta : (() => ({}));

  try {
    const Cer = require('./ceremony');
    if (!Cer.taken(u.username)) {
      groups.push({
        key: 'oath', head: 'Before anything else',
        items: [{
          title: 'Take up your office',
          note: 'The Articles your office is held upon \u2014 four lines, and your hand to them. It takes a minute.',
          link: '/staff/ceremony',
          urgent: true, lane: 'do', on: 'you', act: 'Sign them', since: ''
        }]
      });
    }
  } catch (_) {}

  const letters = extra.letters || [];
  if (letters.length) {
    groups.push({
      key: 'letters', head: 'Sent to you',
      items: letters.map(l => ({
        title: l.subject || 'A letter',
        note: `${l.byName || 'The Ministry'}${l.must ? ' — must be acknowledged' : ''}`,
        link: '/staff/letters/' + encodeURIComponent(l.id),
        urgent: !!l.must, lane: 'do', on: 'you', act: l.must ? 'Read and acknowledge' : 'Read it', since: l.at
      }))
    });
  }

  const notes = Notify.forUser(u).filter(n => !(n.readBy || []).includes(u.username)).slice(0, 6);
  if (notes.length) {
    groups.push({
      key: 'word', head: 'Word for you', clearAll: true,
      items: notes.map(n => ({ title: n.text, note: '', link: n.link || '/staff/notifications', id: n.id, lane: 'word', since: n.at }))
    });
  }

  const week = extra.week;
  if (week && week.lines) {
    const owed = week.lines.filter(l => l.met === false);
    if (owed.length) {
      groups.push({
        key: 'owed', head: 'Owed by you this week',
        items: owed.map(l => ({ title: l.name, note: l.detail, link: l.link || '/staff/week', lane: 'due', on: 'you', act: 'See the week', since: '' }))
      });
    }
  }

  if (rows && A.can(u, 'approve')) {
    const seal = rows.filter(r => r.Status === 'Awaiting Seal').slice(0, 6);
    if (seal.length) {
      groups.push({
        key: 'seal', head: 'Awaiting your seal',
        items: seal.map(r => ({ title: r['Record No'] + ' \u2014 ' + r.Subject, note: 'Waits on your seal. Filed by ' + (r['Filed By'] || 'an officer') + '.', link: '/staff/records/' + encodeURIComponent(r['Record No']), lane: 'do', on: 'you', act: 'Seal it', since: r['Updated At (UTC)'] }))
      });
    }
  }

  const due = extra.due || [];
  if (due.length) {
    groups.push({
      key: 'due', head: 'Falling due',
      items: due.slice(0, 6).map(x => ({
        title: x.rec['Record No'] + ' \u2014 ' + x.rec.Subject,
        note: x.label + ' \u00b7 ran to ' + x.due.text,
        link: '/staff/records/' + encodeURIComponent(x.rec['Record No']),
        urgent: x.lapsed, lane: 'due', left: x.left, on: 'you', act: 'See the record', since: x.rec['Updated At (UTC)']
      }))
    });
  }

  if (rows) {
    const mine = rows.filter(r => r['Assigned To'] === u.username && !['Closed', 'Archived', 'Revoked', 'Standing'].includes(r.Status)).slice(0, 6);
    if (mine.length) {
      groups.push({
        key: 'assigned', head: 'Left on your hands',
        items: mine.map(r => ({ title: r['Record No'] + ' \u2014 ' + r.Subject, note: 'Left on your hands \u00b7 ' + r.Status, link: '/staff/records/' + encodeURIComponent(r['Record No']), lane: 'do', on: 'you', act: 'Take it up', since: r['Updated At (UTC)'] }))
      });
    }
    const WAIT = { 'Awaiting Seal': 'the seal', 'Under Review': 'the reviewer', Received: 'the registry', Referred: 'the office it was referred to' };
    const waiting = rows.filter(r => WAIT[r.Status] && !(r.Status === 'Awaiting Seal' && A.can(u, 'approve')) && r['Assigned To'] !== u.username && (meta(r) || {}).filer === u.username).slice(0, 8);
    if (waiting.length) {
      groups.push({
        key: 'waiting', head: 'Waiting on others',
        items: waiting.map(r => ({ title: r['Record No'] + ' \u2014 ' + r.Subject, note: 'Filed by you \u00b7 waits on ' + WAIT[r.Status] + '.', link: '/staff/records/' + encodeURIComponent(r['Record No']), lane: 'waiting', on: WAIT[r.Status], act: 'Open it', since: r['Updated At (UTC)'] }))
      });
    }
  }

  groups.forEach(g => g.items.forEach(i => {
    const age = ageOf(i.since);
    i.age = age.text;
    i.days = age.days;
    i.pressing = !!i.urgent || age.days > PRESSING_AFTER || (typeof i.left === 'number' && i.left <= DUE_WITHIN);
  }));
  const count = groups.reduce((n, g) => n + g.items.length, 0);
  const urgent = groups.some(g => g.items.some(i => i.urgent));
  const pressing = groups.reduce((n, g) => n + g.items.filter(i => i.pressing).length, 0);
  const oldest = groups.reduce((m, g) => Math.max(m, ...g.items.map(i => i.days)), 0);
  return { groups, count, urgent, pressing, oldest };
}

function lanes(d) {
  const lane = { do: [], waiting: [], due: [], word: [] };
  d.groups.forEach(g => g.items.forEach(i => (lane[i.lane] || lane.do).push(Object.assign({ group: g.head }, i))));
  const order = (a, b) => Number(b.pressing) - Number(a.pressing) || (typeof a.left === 'number' && typeof b.left === 'number' ? a.left - b.left : b.days - a.days);
  Object.keys(lane).forEach(k => lane[k].sort(order));
  return lane;
}

function button(desk) {
  if (!desk) return '';
  const n = desk.count;
  return `<button type="button" class="deskbtn${desk.urgent ? ' urgent' : ''}" id="deskbtn" aria-expanded="false" aria-controls="deskpanel">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16v12H4z"></path><path d="M4 7l8 6 8-6"></path></svg>
    The Desk${n ? ` <span class="badge">${n}</span>` : ''}
  </button>`;
}

function panel(desk, csrf) {
  if (!desk) return '';
  const item = i => `<div class="deskrow"><a class="deskitem${i.urgent ? ' urgent' : ''}" href="${esc(i.link)}">
    <span class="dt">${esc(i.title)}</span>
    ${i.note ? `<span class="dn">${esc(i.note)}</span>` : ''}
  </a>${i.id ? `<form method="post" action="/staff/desk/read" class="deskdone"><input type="hidden" name="_csrf" value="${esc(csrf)}"><input type="hidden" name="id" value="${esc(i.id)}"><button type="submit" title="I have seen this" aria-label="I have seen this">\u2713</button></form>` : ''}</div>`;
  const body = desk.groups.length
    ? desk.groups.map(g => `<div class="deskgroup"><div class="dh">${esc(g.head)}${g.clearAll ? `<form method="post" action="/staff/desk/read" class="clearall"><input type="hidden" name="_csrf" value="${esc(csrf)}"><input type="hidden" name="all" value="1"><button type="submit">clear all</button></form>` : ''}</div>${g.items.map(item).join('')}</div>`).join('')
    : '<p class="deskempty">Nothing wants your hand. The desk is clear.</p>';
  return `<div class="deskpanel" id="deskpanel" hidden>
    <div class="deskhead">
      <b>Your Desk</b>
      <span>${desk.count ? (desk.count === 1 ? 'one thing' : desk.count + ' things') : 'clear'}</span>
      <button type="button" class="deskclose" id="deskclose" aria-label="Close the Desk">✕</button>
    </div>
    <div class="deskbody">${body}</div>
    <div class="deskfoot"><a href="/staff/desk">Open it in full on My Desk</a></div>
  </div>`;
}

const SCRIPT = `<script>(function(){var b=document.getElementById('deskbtn'),p=document.getElementById('deskpanel'),c=document.getElementById('deskclose');if(!b||!p)return;
function open(v){p.hidden=!v;b.setAttribute('aria-expanded',v?'true':'false');document.body.classList.toggle('desk-open',!!v);}
b.addEventListener('click',function(e){e.stopPropagation();open(p.hidden);});
if(c)c.addEventListener('click',function(){open(false);b.focus();});
document.addEventListener('click',function(e){if(!p.hidden&&!p.contains(e.target)&&e.target!==b)open(false);});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!p.hidden){open(false);b.focus();}});
})();</script>`;

module.exports = { gather, lanes, button, panel, SCRIPT, PRESSING_AFTER, DUE_WITHIN };
