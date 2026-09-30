const S = require('./store');
const D = require('./staffdata');
const SKY = require('./skyrimitems');

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

function room() { return { ...ROOM_DEFAULT, ...S.read(ROOM, ROOM_DEFAULT) }; }
function allowed() { const a = room().allowed; return Array.isArray(a) ? a : []; }
function mayEnter(u) { return !!u && (u.all || allowed().includes(u.username)); }
function mayAssign(u) { return !!u && !!u.all; }
function setAllowed(names) {
  const list = (Array.isArray(names) ? names : [names]).filter(Boolean).map(String).slice(0, 200);
  return S.update(ROOM, ROOM_DEFAULT, d => { d.allowed = [...new Set(list)]; return d; });
}

const ITEMS = 'staff-items.json';

function normId(v) {
  const m = String(v == null ? '' : v).trim().match(/^(?:0x)?([0-9a-f]{1,8})$/i);
  return m ? '0x' + m[1].toLowerCase().padStart(8, '0') : '';
}

function catalogue() {
  const out = [];
  const seen = new Set();
  D.ITEM_SEED.forEach(([name, id, note]) => {
    const ref = normId(id);
    if (!ref || seen.has(ref)) return;
    seen.add(ref);
    out.push({ name, ref, note: note || '', cat: 'Sovngarde' });
  });
  SKY.SKYRIM_ITEMS.forEach(([name, id, cat, note]) => {
    const ref = normId(id);
    if (!ref || seen.has(ref)) return;
    seen.add(ref);
    out.push({ name, ref, note: note || '', cat: cat || 'Skyrim' });
  });
  return out;
}

let topped = false;
function itemsSeeded() {
  const have = S.read(ITEMS, null);
  const list = Array.isArray(have) ? have : [];
  if (!topped) {
    topped = true;
    const seen = new Set(list.map(i => i.ref));
    const add = catalogue()
      .filter(c => !seen.has(c.ref))
      .map(c => ({ id: S.id(), name: c.name, ref: c.ref, note: c.note, cat: c.cat, by: '', at: '', seed: true }));
    if (add.length) {
      if (!list.length) {
        S.write(ITEMS, add);
        return add;
      }
      S.update(ITEMS, [], cur => { cur.push(...add); return cur; });
      return S.read(ITEMS, []);
    }
  }
  return list;
}

function items() { return itemsSeeded(); }
function itemByRef(ref) { const r = normId(ref); return r ? items().find(i => i.ref === r) || null : null; }

function itemAdd(name, ref, note, by) {
  const r = normId(ref);
  if (!r) throw new Error('That is not a form id.');
  const found = itemByRef(r);
  if (found) return { entry: found, added: false };
  const entry = {
    id: S.id(), name: clean(name, 140) || 'Unnamed', ref: r, note: clean(note, 200), cat: 'Added here',
    by: (by && by.name) || '', at: new Date().toISOString()
  };
  S.update(ITEMS, [], list => { list.push(entry); return list; });
  return { entry, added: true };
}

function itemRemove(id) { return S.update(ITEMS, [], list => { const i = list.findIndex(x => x.id === id); if (i > -1) list.splice(i, 1); return list; }); }

function itemImport(text, by) {
  const lines = String(text == null ? '' : text).split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 8000);
  let added = 0, already = 0, skipped = 0;
  const seen = new Set(items().map(i => i.ref));
  const fresh = [];
  const isId = v => /^(?:0x)?[0-9a-fA-F]{6,8}$/.test(v.trim());
  const noise = /^(CELL|WRLD|WEAP|ARMO|MISC|ALCH|BOOK|INGR|KEYM|SLGM|AMMO|NPC_|LVLI|SCRL|SPEL|LIGH|STAT)$|\.es[pml]$/i;
  for (const raw of lines) {
    const line = raw.replace(/^[-*\u2022\s]+/, '').replace(/`/g, '');
    const fields = line.split(/\s*[,|\t]\s*/).map(f => f.trim()).filter(Boolean);
    let ref = '', name = '', note = '';
    const idAt = fields.findIndex(isId);
    if (fields.length > 1 && idAt > -1) {
      ref = normId(fields[idAt]);
      const rest = fields.filter((_, i) => i !== idAt);
      name = rest.shift() || '';
      note = rest.filter(f => !noise.test(f)).join(' \u00b7 ');
    } else {
      const m = line.match(/(?:^|[\s|,:\-\u2014])(?:0x)?([0-9a-fA-F]{6,8})(?=$|[\s|,)\-\u2014])/);
      if (!m) { skipped++; continue; }
      ref = normId(m[1]);
      let left = line.replace(m[0], ' ').replace(/^[\s|,:\-\u2014]+|[\s|,:\-\u2014]+$/g, '').replace(/\s{2,}/g, ' ').trim();
      const split = left.split(/\s*[|\u2014]\s*|\s+-\s+/);
      name = (split.shift() || '').trim();
      note = split.join(' \u2014 ').trim();
    }
    if (!ref) { skipped++; continue; }
    if (!name || isId(name)) name = 'Unnamed';
    if (seen.has(ref)) { already++; continue; }
    seen.add(ref);
    fresh.push({
      id: S.id(), name: clean(name, 140), ref, note: clean(note, 200), cat: 'Read in',
      by: (by && by.name) || '', at: new Date().toISOString()
    });
    added++;
  }
  if (fresh.length) S.update(ITEMS, [], list => { list.push(...fresh); return list; });
  return { added, already, skipped, total: lines.length };
}

const ARTIFACTS_F = 'staff-artifacts.json';
const HQS_F = 'staff-hqs.json';
const WHERE = ['oblivion', 'skyrim'];
const whereName = w => (w === 'skyrim' ? 'In Skyrim' : 'In Oblivion');

function artifacts() {
  const have = S.read(ARTIFACTS_F, null);
  if (Array.isArray(have) && have.length) return have;
  const seeded = [];
  Object.entries(ARTIFACTS).forEach(([where, list]) => {
    const w = /skyrim/i.test(where) ? 'skyrim' : 'oblivion';
    list.forEach(name => seeded.push({ id: S.id(), name, where: w, note: '' }));
  });
  S.write(ARTIFACTS_F, seeded);
  return seeded;
}
function artifactsIn(w) { return artifacts().filter(a => a.where === w); }

function artifactAdd(b) {
  const name = clean(b.name, 120);
  if (!name) throw new Error('Name the artifact.');
  const where = WHERE.includes(String(b.where)) ? String(b.where) : 'oblivion';
  const entry = { id: S.id(), name, where, note: clean(b.note, 200) };
  S.update(ARTIFACTS_F, [], list => { list.push(entry); return list; });
  return entry;
}
function artifactEdit(id, b) {
  return S.update(ARTIFACTS_F, [], list => {
    const a = list.find(x => x.id === id);
    if (!a) throw new Error('No such artifact.');
    if (b.name != null) { const n = clean(b.name, 120); if (!n) throw new Error('Name the artifact.'); a.name = n; }
    if (b.note != null) a.note = clean(b.note, 200);
    if (b.where != null && WHERE.includes(String(b.where))) a.where = String(b.where);
    return list;
  });
}
function artifactMove(id, to) {
  const w = WHERE.includes(String(to)) ? String(to) : null;
  return S.update(ARTIFACTS_F, [], list => {
    const a = list.find(x => x.id === id);
    if (!a) throw new Error('No such artifact.');
    a.where = w || (a.where === 'skyrim' ? 'oblivion' : 'skyrim');
    return list;
  });
}
function artifactRemove(id) { return S.update(ARTIFACTS_F, [], list => { const i = list.findIndex(a => a.id === id); if (i > -1) list.splice(i, 1); return list; }); }

function hqs() {
  const have = S.read(HQS_F, null);
  if (Array.isArray(have) && have.length) return have;
  const seeded = HQS.map(([place, hold, whose]) => ({ id: S.id(), place, hold, whose }));
  S.write(HQS_F, seeded);
  return seeded;
}
function hqAdd(b) {
  const place = clean(b.place, 120);
  if (!place) throw new Error('Name the property.');
  const entry = { id: S.id(), place, hold: clean(b.hold, 60) || '\u2014', whose: clean(b.whose, 200) };
  S.update(HQS_F, [], list => { list.push(entry); return list; });
  return entry;
}
function hqEdit(id, b) {
  return S.update(HQS_F, [], list => {
    const h = list.find(x => x.id === id);
    if (!h) throw new Error('No such property.');
    if (b.place != null) { const p2 = clean(b.place, 120); if (!p2) throw new Error('Name the property.'); h.place = p2; }
    if (b.hold != null) h.hold = clean(b.hold, 60) || '\u2014';
    if (b.whose != null) h.whose = clean(b.whose, 200);
    return list;
  });
}
function hqRemove(id) { return S.update(HQS_F, [], list => { const i = list.findIndex(h => h.id === id); if (i > -1) list.splice(i, 1); return list; }); }

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
  return S.update(NOTICES, [], list => { const i = list.findIndex(n => n.id === id); if (i > -1) list.splice(i, 1); return list; });
}

const SWAP_MAP = Object.fromEntries(REFID_SWAPS.map(([a, b]) => [a.toLowerCase(), b.toLowerCase()]));

let LOOKUP = null;
function lookupIndex() {
  if (LOOKUP) return LOOKUP;
  const map = new Map();
  const put = (id, name, kind) => {
    const r = normId(id);
    if (r && !map.has(r)) map.set(r, { name, kind });
  };
  CODES.forEach(g => g.rows.forEach(([n, id]) => put(id, n, g.group)));
  D.CREATURES.forEach(g => g.rows.forEach(([n, id]) => put(id, n, 'Creature')));
  D.DUNGEONS.forEach(g => g.rows.forEach(([n, id]) => put(id, n, g.group)));
  D.CELLS.forEach(([ed, id]) => put(id, ed, 'Cell'));
  LOOKUP = map;
  return map;
}
function lookupId(ref) {
  const r = normId(ref);
  if (!r) return null;
  const item = itemByRef(r);
  if (item) return { name: item.name, kind: item.cat || item.note || 'On the item roll' };
  return lookupIndex().get(r) || null;
}

function convertRef(raw) {
  const text = String(raw == null ? '' : raw).trim();
  if (!text) return null;
  const m = text.match(/^(?:0x)?([0-9a-f]{1,8})$/i);
  if (!m) return { input: text, ok: false, why: 'Not a form id. Expect up to eight hex digits, with or without the 0x.' };
  const full = m[1].toLowerCase().padStart(8, '0');
  const head = full.slice(0, 2);
  const tail = full.slice(2);
  const known = lookupId('0x' + full);
  const listed = SWAP_MAP[head];
  const n = parseInt(head, 16);

  if (listed == null && n < 3) {
    return {
      input: text, ok: false, head, ref: '0x' + full, known: known ? known.name : '', knownKind: known ? known.kind : '',
      why: known
        ? 'Already a base id — no conversion needed.'
        : 'Leading byte ' + head + ' cannot go three lower, so this is not a reference id that needs converting.'
    };
  }
  const out = listed != null ? listed : (n - 3).toString(16).padStart(2, '0');
  const made = (out + tail).toLowerCase();
  const becomes = lookupId('0x' + made);
  return {
    input: text, ok: true, head, out, listed: listed != null,
    ref: '0x' + made,
    from: '0x' + full,
    known: known ? known.name : '', knownKind: known ? known.kind : '',
    becomes: becomes ? becomes.name : '', becomesKind: becomes ? becomes.kind : '',
    command: '/additem 0x' + made + ' 1'
  };
}

function rememberConverted(results, by) {
  let added = 0;
  for (const r of results) {
    if (!r || !r.ok) continue;
    try { if (itemAdd('From the converter', r.ref, 'Converted from ' + r.input, by).added) added++; }
    catch (_) {}
  }
  return added;
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
  convertRef, convertMany, rememberConverted, lookupId, lookupIndex,
  items, itemByRef, itemAdd, itemRemove, itemImport, normId,
  WHERE, whereName, artifacts, artifactsIn, artifactAdd, artifactEdit, artifactMove, artifactRemove,
  hqs, hqAdd, hqEdit, hqRemove,
  DATA: D
};
