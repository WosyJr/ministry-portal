const S = require('./store');

const NOTICES = 'staff-notices.json';
const SERVERS = [
  { id: 'sovngarde', name: 'Sovngarde', sub: 'The main server' },
  { id: 'paarthurnax', name: 'Paarthurnax', sub: 'Its own ruleset, the same commands' }
];
const SERVER_IDS = SERVERS.map(s => s.id);
function serverOf(v) { return SERVER_IDS.includes(String(v)) ? String(v) : 'sovngarde'; }
function serverName(id) { const s = SERVERS.find(x => x.id === id); return s ? s.name : 'Sovngarde'; }

const LINKS = [
  { name: 'Magic Website — the Collegium', url: 'https://sovngarde.online/collegium', note: 'PIN 844627', on: 'sovngarde' }
];

const REFID_SWAPS = [
  ['17', '14'], ['08', '05'], ['09', '06'], ['21', '1e'], ['1d', '1a'],
  ['19', '16'], ['0c', '09'], ['15', '12'], ['20', '1d'], ['1c', '19'],
  ['1a', '17'], ['0b', '08'], ['13', '10'], ['10', '0d'], ['0e', '0b']
];

const COMMANDS = [
  {
    group: 'Giving things out',
    on: 'both',
    rows: [
      ['/additem 0x&lt;id&gt; &lt;count&gt;', 'Put an item in a hand. The id must already be converted — see The Hex Converter.'],
      ['/additem 0x1601024B 1', 'House keys.'],
      ['/horse 0x&lt;id&gt; &lt;Player Name&gt;', 'Give a saddled horse to a named player.'],
      ['/rhorse &lt;Player Name&gt;', 'Take the horse back.'],
      ['/dgmenu', 'The dungeon menu.']
    ]
  },
  {
    group: 'Portals',
    on: 'both',
    rows: [
      ['/portal from &lt;hours&gt;', 'Set the near end. The number is how long it lasts — 1 is an hour, 6 is six hours.'],
      ['/portal to', 'Set the far end.'],
      ['/portal from &lt;hours&gt; plain', 'A plain portal instead of a magic one.'],
      ['/portal base 0x&lt;baseid&gt;', 'Change the base id of the landmark the portal stands on.']
    ]
  },
  {
    group: 'Placing and clearing',
    on: 'both',
    rows: [
      ['/place 0x&lt;baseid&gt;', 'Put an object down.'],
      ['/place remove 0x&lt;refid&gt;', 'Take a placed object away.'],
      ['/placeboard remove &lt;board&gt;', 'Take a board away, e.g. <code>sungard_board</code>.'],
      ['/delete 0x&lt;refid&gt;', 'Delete a reference outright.'],
      ['Disabled ObjectReference 0x&lt;refid&gt;', 'How a disabled reference is recorded in the work orders.']
    ]
  },
  {
    group: 'Characters',
    on: 'both',
    rows: [
      ['<b>Do not</b> use /racemenu for deformed characters', 'Tell them to relog instead.']
    ]
  }
];

const CODES = [
  {
    group: 'Horses',
    note: 'Give with <code>/horse 0x23ab2 Player Name</code>, take back with <code>/rhorse Player Name</code>.',
    on: 'both',
    rows: [
      ['Brown horse (saddled)', '0x23ab2'],
      ['Black horse (saddled)', '0x68cfa'],
      ['Black and white horse (saddled)', '0x68d02'],
      ['Grey horse (saddled)', '0x68d03'],
      ['Palomino horse (saddled)', '0x68d04']
    ]
  },
  {
    group: 'Arrows and bolts',
    note: '',
    on: 'both',
    rows: [
      ['Ancient Nord Arrow', '0x00034182'],
      ['Daedric Arrow', '0x000139c0'],
      ['Dwarven Arrow', '0x000139bc'],
      ['Ebony Arrow', '0x000139bf'],
      ['Elven Arrow', '0x000139bd'],
      ['Falmer Arrow', '0x00038341'],
      ['Forsworn Arrow', '0x000cee9e'],
      ['Glass Arrow', '0x000139be'],
      ['Iron Arrow', '0x0001397d'],
      ['Nordic Arrow', '0x0402623b'],
      ['Orcish Arrow', '0x000139bb'],
      ['Practice Arrow', '0x000cab52'],
      ['Rusty Arrow', '0x000e738a'],
      ['Steel Arrow', '0x0001397f'],
      ['Steel Bolt', '0x02000BB3']
    ]
  },
  {
    group: 'Keys',
    note: '',
    on: 'both',
    rows: [['House keys', '0x1601024B']]
  },
  {
    group: 'Objects and statues',
    note: 'Base ids, for <code>/place</code>.',
    on: 'both',
    rows: [
      ['Stone brick ground block', '0x3e224'],
      ['Tiber Septim statue', '0x91712'],
      ['Rubble', '0x36ac3'],
      ['Dibella statue', '0x8f965']
    ]
  }
];

const WORKORDERS = [
  {
    title: 'Windhelm — Talos shrine destruction',
    on: 'sovngarde',
    note: 'Outer city work.',
    lines: [
      ['Disabled ObjectReference 0x1108b01e', ''],
      ['Disabled ObjectReference 0x111a0880', ''],
      ['Disabled ObjectReference 0x110b8e73', ''],
      ['/place 0x91712', 'Tiber Septim statue'],
      ['/place 0x36ac3', 'Rubble'],
      ['/delete 0xFF018C69', 'Rubble in the Talos temple'],
      ['/delete 0xFF018CBC', 'Rock on top of the Talos temple rubble']
    ]
  },
  {
    title: 'Markarth — apartment door blocker',
    on: 'sovngarde',
    note: '',
    lines: [
      ['/delete 0xFF001E00', ''],
      ['/delete 0xFF001E04', '']
    ]
  },
  {
    title: 'A facility teardown, as it is written',
    on: 'both',
    note: 'The shape a facility work order takes.',
    lines: [
      ['/placeboard remove sungard_board', ''],
      ['/place remove 0xFF01BE42', 'Oven'],
      ['/place 0x3e224', 'Stone brick ground block'],
      ['/place remove 0xFF01BF3C', 'Anvil'],
      ['/place remove 0xFF01BF68', 'Enchanter']
    ]
  }
];

const KNOWN_ISSUES = [
  {
    on: 'both',
    head: 'Deformed characters',
    body: 'Do not use <code>/racemenu</code> on them. Tell the player to relog.'
  },
  {
    on: 'both',
    head: 'Conjurations that do not work',
    body: 'Bonemen, mistmen and a few other conjurations do not work. Do not build dungeons with them. Check the dev server before an update.'
  },
  {
    on: 'both',
    head: 'Ancient falmer robes',
    body: 'Added as a craftable item by accident and removed again. Any that were crafted should be taken off whoever crafted them and the crafting materials reimbursed — 4 refined moonstone, 2 iron ingots.'
  }
];

// The two servers share their commands but not their rules, so each keeps its
// own standing differences here and the notice board carries the rest.
const RULESETS = {
  sovngarde: {
    head: 'Sovngarde — the standing ruleset',
    lines: [
      'Event master permissions are to be used on <b>this server only</b>.',
      'Antagonists may operate at their regular size limits in and around baronies or smaller; ten or more still needs coordinating.',
      'Negligence PKs are enforced when the offender trespasses into the defender\u2019s home base, unless someone is skirting the rules or it is a supernatural PK.',
      'Events around PKs or revivals need SGM+ approval. Self-PKs do not.'
    ]
  },
  paarthurnax: {
    head: 'Paarthurnax — the standing ruleset',
    lines: [],
    empty: 'Paarthurnax runs its own ruleset. Nothing has been entered for it yet — post the rules under <b>Notices &amp; Documents</b> against Paarthurnax and they will stand here for the team. The commands, ids and converter on the other tabs are the same on both servers.'
  }
};

const GUIDES = [
  {
    id: 'eventmaster',
    on: 'both',
    title: 'Eventmaster Guidelines',
    lede: 'The primary role of an Eventmaster is to provide and facilitate events for the player base. Events created by the event team should enhance and promote the roleplay currently performed on the server and should not be aimed to negatively affect someone’s experience. The goal is to enhance an individual’s roleplay while keeping things lore accurate and immersive.',
    points: [
      'If you are <b>unsure about the lore implications of an event</b>, seek confirmation from a lore master or someone on the team well versed in that background.',
      'Any issues regarding <b>rule breaks or OOC issues</b> go to the <b>gamemasters</b> — including any banning, removal or punishment of players.',
      'Most events should be the smaller scale ticket event requests first, or pop-up and random encounters around Skyrim. Any <b>large scale events</b> involving factions should be <i>planned and notified by the respective GM</i> overseeing the faction.',
      'Any events around <b>PKs or revivals require SGM+ approval</b>. Self-PKs do not require approval.',
      'You must only use your event master permissions on the Sovngarde server.'
    ],
    sub: [
      {
        head: 'Discord guidelines',
        points: [
          '<b>Tickets around event requests</b> or continuation of events are the <b>primary focus</b>. Any ticket involving rule breaks or anything outside of events should be left to the gamemasters.',
          'Event masters may assist when available in simple things such as stuck requests and horses being given. They are never expected to assist, and should always primarily be <b>focused on curating and facilitating events</b>.'
        ]
      }
    ]
  }
];

const PRACTICES = [
  {
    on: 'both',
    head: 'Tech support tickets',
    body: 'Close automatically. Do not enable people who did not read the enormous text on ticket creation. Do not engage — these bloat the queue for ages for no reason.'
  },
  {
    on: 'both',
    head: 'Unanswered tickets',
    body: 'If a ticket goes unanswered by the player for 24 hours, close it.'
  },
  {
    on: 'both',
    head: 'Warning procedure',
    body: 'Ticket, discuss what was wrong, issue the warning in the ticket, close the ticket.'
  },
  {
    on: 'both',
    head: 'Enforcing negligence PK',
    body: 'Negligence PKs are usually enforced when the offender trespasses into the defender’s home base. The only time that is really different is if someone is acting unfaithful to RP by skirting the line of the rules, or if it is a supernatural PK.'
  },
  {
    on: 'both',
    head: 'Crime in baronies',
    body: 'Antagonists may operate at their regular size limits in and around baronies or smaller. Ten or more still needs coordinating as usual. It is designed to require the jarls to actually protect their vassals and will draw the holds further into RP. The major garrisons are in the capital cities, so there needs to be a way to represent that in RP.'
  },
  {
    on: 'both',
    head: 'Brewery recipes',
    body: 'Meaderies with corresponding recipes are currently not able to craft these. Divine crafting is done on a 1‑1 ratio.'
  },
  {
    on: 'both',
    head: 'Facility request form',
    body: 'A separate entry in the ticket for each city or town:',
    pre: 'Location:\nAll Current Facilities:\nRequested Facilities:'
  }
];

const HQS = [
  ['Thalmor Embassy', 'Solitude', 'Thalmor HQ'],
  ['Dainty Sload', 'Solitude', 'Black Market HQ'],
  ['Redwater Den', 'Riften', 'Antag Liaison HQ — occupied by Sheo, for GM events until Beggars Grim return'],
  ['Castle Volkihar', 'Solitude', 'Vampire HQ'],
  ['Sky Haven Temple', 'Markarth', 'Blades HQ'],
  ['Fort Kastav', 'Winterhold', 'Stormcloak HQ'],
  ['Cistern / Ragged Flagon', 'Riften', 'Thieves Guild HQ'],
  ['Dimhollow Crypt', 'Morthal', 'Worm Cult HQ'],
  ['Deepwood Redoubt', 'Markarth', 'Forsworn HQ'],
  ['Mara’s Eye Den', 'Eastmarch', 'Krosis Dragon Cult HQ'],
  ['Japhet’s Folly', '—', 'Black Market event site']
];

const ARTIFACTS = {
  'In Oblivion': ['Masque of Clavicus Vile', 'Sanguine Rose', 'Meridia’s Beacon', 'Wabbajack', 'Mace of Molag Bal', 'Dawnbreaker', 'Black Star', 'Mehrunes’ Razor', 'Keening', 'Volendrung'],
  'In Skyrim': ['Oghma Infinium', 'Azura’s Star']
};

const ROOM = 'staff-room.json';
const ROOM_DEFAULT = { allowed: [] };

// Who may enter. The Minister always may; everyone else is named here, so the
// room stays the Minister's alone until somebody is put on the list.
function room() { return { ...ROOM_DEFAULT, ...S.read(ROOM, ROOM_DEFAULT) }; }
function allowed() { const a = room().allowed; return Array.isArray(a) ? a : []; }
function mayEnter(u) { return !!u && (u.all || allowed().includes(u.username)); }
function mayAssign(u) { return !!u && !!u.all; }
function setAllowed(names) {
  const list = (Array.isArray(names) ? names : [names]).filter(Boolean).map(String).slice(0, 200);
  return S.update(ROOM, ROOM_DEFAULT, d => { d.allowed = [...new Set(list)]; return d; });
}

function notices() { return S.read(NOTICES, []); }
function noticesFor(server) {
  return notices().filter(n => n.on === 'both' || n.on === server)
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(b.at).localeCompare(String(a.at)));
}
function noticeGet(id) { return notices().find(n => n.id === id) || null; }

function clean(v, max) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max); }
function block(v, max) { return String(v == null ? '' : v).replace(/\r\n/g, '\n').replace(/[^\S\n]+/g, ' ').trim().slice(0, max); }

function noticeAdd(b, by) {
  const title = clean(b.title, 140);
  if (!title) throw new Error('Give the notice a heading.');
  const body = block(b.body, 12000);
  if (!body) throw new Error('A notice with nothing in it is no notice.');
  const on = b.on === 'sovngarde' || b.on === 'paarthurnax' ? b.on : 'both';
  const entry = {
    id: S.id(), title, body, on,
    kind: ['announcement', 'document', 'note'].includes(String(b.kind)) ? String(b.kind) : 'announcement',
    link: clean(b.link, 400),
    pinned: !!b.pinned,
    by: (by && by.name) || '', byUser: (by && by.username) || '',
    at: new Date().toISOString()
  };
  const list = notices();
  list.push(entry);
  S.write(NOTICES, list);
  return entry;
}

function noticeEdit(id, b) {
  return S.update(NOTICES, [], list => {
    const n = list.find(x => x.id === id);
    if (!n) throw new Error('No such notice.');
    if (b.title != null) { const t = clean(b.title, 140); if (!t) throw new Error('Give the notice a heading.'); n.title = t; }
    if (b.body != null) { const t = block(b.body, 12000); if (!t) throw new Error('A notice with nothing in it is no notice.'); n.body = t; }
    if (b.on != null) n.on = b.on === 'sovngarde' || b.on === 'paarthurnax' ? b.on : 'both';
    if (b.kind != null && ['announcement', 'document', 'note'].includes(String(b.kind))) n.kind = String(b.kind);
    if (b.link != null) n.link = clean(b.link, 400);
    n.pinned = !!b.pinned;
    return list;
  });
}

function noticeRemove(id) {
  return S.update(NOTICES, [], list => list.filter(n => n.id !== id));
}

// Every pair the staff set down is the leading byte less three. The table is
// what they published; the arithmetic is what it turns out to be, so a prefix
// nobody wrote down still converts.
const SWAP_MAP = Object.fromEntries(REFID_SWAPS.map(([a, b]) => [a.toLowerCase(), b.toLowerCase()]));

function convertRef(raw) {
  const text = String(raw == null ? '' : raw).trim();
  if (!text) return null;
  const m = text.match(/^(?:0x)?([0-9a-f]{2})([0-9a-f]{1,6})$/i);
  if (!m) return { input: text, ok: false, why: 'Not a reference id. Expect eight hex digits, with or without the 0x.' };
  const head = m[1].toLowerCase();
  const tail = m[2].toLowerCase();
  const listed = SWAP_MAP[head];
  const n = parseInt(head, 16);
  if (listed == null && n < 3) {
    return { input: text, ok: false, head, why: 'That leading byte cannot go three lower.' };
  }
  const out = listed != null ? listed : (n - 3).toString(16).padStart(2, '0');
  const full = (out + tail.padStart(6, '0')).toLowerCase();
  return {
    input: text, ok: true, head, out, listed: listed != null,
    ref: '0x' + full,
    command: '/additem 0x' + full + ' 1'
  };
}

function convertMany(raw) {
  return String(raw == null ? '' : raw)
    .split(/[\s,;]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 200)
    .map(convertRef)
    .filter(Boolean);
}

module.exports = {
  SERVERS, SERVER_IDS, serverOf, serverName,
  LINKS, REFID_SWAPS, SWAP_MAP, COMMANDS, CODES, WORKORDERS, KNOWN_ISSUES, RULESETS,
  GUIDES, PRACTICES, HQS, ARTIFACTS,
  room, allowed, mayEnter, mayAssign, setAllowed,
  notices, noticesFor, noticeGet, noticeAdd, noticeEdit, noticeRemove,
  convertRef, convertMany
};
