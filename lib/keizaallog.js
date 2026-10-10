const GL = require('./gamelog');

const KINDS = [
  ['kill_npc', 'combat', 'Killed NPC', /^killed\s+npc$|^kill[_ ]npc$/i],
  ['kill', 'combat', 'Killed', /^(killed|kill)$/i],
  ['death', 'death', 'Died', /^(death|died)$/i],
  ['missive_courier_died', 'death', 'Courier died', /^missive[_ ]courier[_ ]died$|^courier died$/i],
  ['player_join', 'session', 'Joined', /^(player[_ ]join|joined|join|came in)$/i],
  ['player_leave', 'session', 'Left', /^(player[_ ]leave|left|leave|went out)$/i],
  ['take_item', 'items', 'Take item', /^(take[_ ]item|took item|takeitem)$/i],
  ['drop_item', 'items', 'Drop item', /^(drop[_ ]item|dropped item|dropitem)$/i],
  ['trade', 'items', 'Trade', /^(trade|traded)$/i],
  ['loot_player', 'items', 'Loot player', /^(loot[_ ]player|looted player|lootplayer)$/i],
  ['item_remove', 'items', 'Item removed', /^(item[_ ]remove|item removed|itemremove)$/i],
  ['chest_open', 'chest', 'Chest open', /^(chest[_ ]open|chestopen|opened chest)$/i],
  ['chest_diff', 'chest', 'Chest change', /^(chest[_ ]change|chest[_ ]diff|chestchange|chestdiff)$/i],
  ['chest_lock', 'chest', 'Chest lock', /^(chest[_ ]lock|chestlock|chest[_ ]unlock)$/i],
  ['craft', 'craft', 'Craft', /^(craft|crafted)$/i],
  ['mine_ore', 'ore', 'Mine ore', /^(mine[_ ]ore|mined ore|mineore|mine ore bonus)$/i],
  ['chat', 'talk', 'Said', /^(chat|said)$/i],
  ['command', 'talk', 'Command', /^(command|ran)$/i],
  ['roll', 'talk', 'Rolled', /^(roll|rolled)$/i],
  ['lockpick', 'items', 'Lockpick', /^(lockpick|picked a lock)$/i],
  ['eat_item', 'items', 'Ate', /^(eat[_ ]item|ate)$/i],
  ['enchant_item', 'craft', 'Enchanted', /^(enchant[_ ]item|enchanted)$/i],
  ['repair_item', 'craft', 'Repaired', /^(repair[_ ]item|repaired)$/i],
  ['gear_loss', 'death', 'Gear lost', /^(gear[_ ]loss|gear lost)$/i],
  ['new_player', 'session', 'New player', /^(new[_ ]player|new player)$/i],
  ['house', 'house', 'House', /^house[_ ]|^admin[_ ]house/i],
  ['missive', 'talk', 'Missive', /^missive[_ ](sent|delivered|courier[_ ]left)$/i],
  ['admin', 'admin', 'Admin', /^admin[_ ]/i],
  ['anticheat', 'admin', 'Anticheat', /^anticheat[_ ]/i]
];
const LABEL_RE = /\b(Killed\s*NPC|kill_npc|Killed|Kill\b|Death|Died|Missive[_ ]courier[_ ]died|Courier died|Player[_ ]join|Player[_ ]leave|Joined|Left|Take\s*item|take_item|Drop\s*item|drop_item|Trade|Traded|Loot\s*player|loot_player|Item\s*remove|item_remove|Chest\s*open|chest_open|Chest\s*change|chest_diff|chest_change|Chest\s*lock|chest_lock|Craft|Crafted|Mine\s*ore(?:\s*bonus)?|mine_ore(?:_bonus)?|Chat|Said|Command|Roll|Rolled|Lockpick|Eat_item|Ate|Enchant_item|Enchanted|Repair_item|Repaired|Gear_loss|Gear lost|New_player|New player|house_[a-z_]+|admin_[a-z_]+|anticheat_[a-z_]+|missive_[a-z_]+)\b/i;
const CATS = { combat: 'Combat', death: 'Deaths', session: 'Sessions', items: 'Items', chest: 'Chests', craft: 'Crafting', ore: 'Mining', talk: 'Chat & commands', house: 'Houses', admin: 'Admin', other: 'Other' };
const TIME_RE = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/;
const DAY_RE = /^\s*(Today|Yesterday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,?\s+\d{4})?|\d{4}-\d{2}-\d{2})\s*(\d+)?\s*$/i;

const fmt = n => Number(n).toLocaleString('en-US');

function clean(s) {
  return String(s || '')
    .replace(/[“”″˝]/g, '"').replace(/[‘’′]/g, "'")
    .replace(/\bbase[l1I]d\b/gi, 'baseId').replace(/\btarget[Bb]ase[l1I]d\b/g, 'targetBaseId').replace(/\bsource[Rr]efr[l1I]d\b/g, 'sourceRefrId')
    .replace(/\btarget[l1I]d\b/g, 'targetId').replace(/\bchest[l1I]d\b/gi, 'chestId').replace(/\bpartner[l1I]d\b/g, 'partnerId')
    .replace(/ /g, ' ');
}

function kindOf(label) {
  const l = String(label || '').trim();
  for (const [id, cat, name, re] of KINDS) if (re.test(l)) return { id, cat, name };
  return { id: 'other', cat: 'other', name: l || 'Event' };
}

function parseJson(raw) {
  let s = clean(raw).replace(/,\s*([\]}])/g, '$1').replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":');
  try { return JSON.parse(s); } catch (_) {}
  const flat = {};
  const re = /"([A-Za-z_][A-Za-z0-9_]*)"\s*:\s*("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|true|false|null)/g;
  const actorAt = s.search(/"actor"\s*:/);
  const items = [];
  let cur = null;
  let m, any = false;
  while ((m = re.exec(s))) {
    any = true;
    let v = m[2];
    try { v = JSON.parse(v); } catch (_) {}
    if (!(m[1] in flat)) flat[m[1]] = v;
    if (m[1] === 'baseId' || m[1] === 'formId') { cur = { baseId: v, side: actorAt >= 0 && m.index > actorAt ? 'actor' : 'container' }; items.push(cur); }
    else if (cur && (m[1] === 'name' || m[1] === 'delta' || m[1] === 'count')) cur[m[1]] = v;
  }
  if (!any) return null;
  const moved = items.filter(x => x.delta !== undefined || x.count !== undefined);
  if (moved.length && (flat.chestId !== undefined || actorAt >= 0 || /"container"/.test(s))) {
    const act = moved.filter(x => x.side === 'actor'), con = moved.filter(x => x.side === 'container');
    if (act.length) flat.actor = act; else if (con.length) flat.container = con;
    delete flat.baseId; delete flat.name; delete flat.delta;
  } else if (moved.length && (/"gave"/.test(s) || /"received"/.test(s))) {
    const gaveAt = s.search(/"gave"\s*:/), recAt = s.search(/"received"\s*:/);
    flat.gave = []; flat.received = [];
    moved.forEach(x => { const idx = s.indexOf('"baseId"', 0); (recAt >= 0 && gaveAt >= 0 ? (s.indexOf(String(x.baseId)) > Math.max(gaveAt, recAt) ? (recAt > gaveAt ? flat.received : flat.gave) : (recAt > gaveAt ? flat.gave : flat.received)) : flat.received).push(x); });
  }
  return Object.assign(flat, { _partial: true });
}

function blocks(text) {
  const src = clean(text);
  const out = [];
  let i = 0;
  const flush = (a, b) => src.slice(a, b).split('\n').forEach(l => out.push({ line: l }));
  while (i < src.length) {
    const open = src.indexOf('{', i);
    if (open < 0) { flush(i, src.length); break; }
    flush(i, open);
    let depth = 0, inStr = false, escp = false, end = -1;
    for (let k = open; k < src.length; k++) {
      const ch = src[k];
      if (inStr) { if (escp) escp = false; else if (ch === '\\') escp = true; else if (ch === '"') inStr = false; continue; }
      if (ch === '"') inStr = true;
      else if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) { end = k; break; } }
    }
    if (end < 0) { out.push({ json: src.slice(open), loose: true }); flush(open, src.length); break; }
    out.push({ json: src.slice(open, end + 1) });
    i = end + 1;
  }
  return out;
}

function headline(line) {
  const raw = line.replace(/\s+/g, ' ').trim();
  const m = LABEL_RE.exec(line);
  if (!m) return null;
  const before = line.slice(0, m.index);
  const after = line.slice(m.index + m[0].length);
  const times = before.match(new RegExp(TIME_RE.source, 'g')) || [];
  let time = times.length ? times[times.length - 1] : '';
  let rest = after;
  if (!time) { const ts = after.match(/(?:^|\s)(\d{1,2}:\d{2}(?::\d{2})?)(?!\d)/g); if (ts) { time = ts[ts.length - 1].trim(); rest = after.replace(/(?:^|\s)\d{1,2}:\d{2}(?::\d{2})?(?!\d)\s*\S{0,3}\s*$/, ''); } }
  time = time.replace(/^(\d):/, '0$1:');
  const kind = kindOf(m[0]);
  rest = rest.replace(/^[\s:@»·|\-–—]+/, '');
  let parts = rest.split(/\s*@\s*|\s{2,}|\t+/).map(p => p.replace(/^[\s:»·|\-–—]+|[\s:»·|\-–—]+$/g, '')).filter(p => p && !/^[a-z]$/i.test(p));
  let actor = parts.shift() || '';
  if (/^(killed an npc|chest contents changed|opened a chest|crafted|mined|source refr id)/i.test(actor)) { parts.unshift(actor); actor = ''; }
  const summary = parts.join(' ').replace(/\s+/g, ' ').trim();
  if (/^[\d.,]+\s*[kKmM]?$/.test(actor) || (!time && !summary && !actor)) return LABEL_RE.test(after) ? headline(after) : null;
  if (/\d{5,}/.test(actor) || actor.length > 48) { return { time, kind, actor: '', summary: (actor + ' ' + summary).trim(), raw }; }
  if (!time && /^[\d.,]+\s*[kKmM]?$/.test(summary)) return null;
  return { time, kind, actor: actor.replace(/\s+/g, ' '), summary, raw };
}

function itemName(it) {
  const found = GL.itemOf(it.baseId !== undefined ? it.baseId : it.formId);
  const name = String(it.name || '').trim() || (found && found.name) || '';
  if (it.name && (it.baseId !== undefined || it.formId !== undefined)) GL.learn(it.baseId !== undefined ? it.baseId : it.formId, it.name);
  return { name: name || (found && found.hex ? 'item ' + found.hex : 'an unnamed item'), found, known: !!name };
}

function summaryFields(summary) {
  const o = {};
  String(summary || '').split(/\s*[··|]\s*|\s+-\s+/).forEach(p => {
    const m = /^([a-z][a-z ]+?)\s+(.+)$/i.exec(p.trim());
    if (!m) return;
    const k = m[1].toLowerCase().replace(/\s+/g, '');
    o[k] = m[2].trim();
  });
  return o;
}

const S = (t, k) => ({ t: String(t), k: k || '' });
const WHO = who => S(who || 'Somebody', 'who');
const ITEM = (n, name) => n > 1 ? S(fmt(n) + ' ' + name, 'b') : S(name, 'b');

function listOf(arr, sign) {
  if (!Array.isArray(arr)) return [];
  return arr.map(it => {
    const n = Number(it.delta !== undefined ? it.delta : it.count !== undefined ? it.count : 1);
    if (!Number.isFinite(n) || n === 0) return null;
    if (sign && Math.sign(n) !== sign) return null;
    const nm = itemName(it);
    return { name: nm.name, n: Math.abs(n), found: nm.found, known: nm.known, baseId: it.baseId };
  }).filter(Boolean);
}

function joinItems(list, max) {
  const segs = [];
  const shown = list.slice(0, max || 4);
  shown.forEach((x, i) => {
    if (i) segs.push(S(i === shown.length - 1 && list.length <= (max || 4) ? ' and ' : ', '));
    segs.push(ITEM(x.n, x.name));
  });
  if (list.length > shown.length) segs.push(S(' and ' + (list.length - shown.length) + ' more'));
  return segs;
}

function sentence(ev) {
  const b = ev.body || {};
  const h = ev.head;
  const who = h.actor;
  const sf = summaryFields(h.summary);
  const facts = [];
  const fact = (k, v, note) => { if (v !== undefined && v !== null && v !== '') facts.push({ k, v: typeof v === 'object' ? JSON.stringify(v) : String(v), note: note || '' }); };
  let segs = [], sub = '', ledger = null, key = '';
  const k = h.kind.id;

  if (k === 'take_item' || k === 'drop_item' || k === 'item_remove') {
    const count = Number(b.count !== undefined ? b.count : sf.count !== undefined ? sf.count : 1) || 1;
    const nm = b.baseId !== undefined || b.name ? itemName(b) : { name: sf.name || '', found: null, known: !!sf.name };
    const name = nm.name || 'an item';
    const verb = k === 'take_item' ? ' picked up ' : k === 'drop_item' ? ' dropped ' : ' had ';
    segs = [WHO(who), S(verb), ITEM(count, name)];
    if (k === 'item_remove') segs.push(S(' taken away'));
    segs.push(S('.'));
    key = k + '|' + name;
    fact('sourceRefrId', b.sourceRefrId || sf.sourcerefrid, 'that exact object in the world, not the kind of thing');
    fact('baseId', b.baseId, nm.found && nm.found.name ? nm.found.name + ' · ' + nm.found.hex + ' · ' + nm.found.from : nm.found ? nm.found.hex + ' · not on the registry' : '');
    fact('count', b.count, 'how many');
  } else if (k === 'kill_npc' || k === 'kill') {
    const target = b.target && !/^unknown$/i.test(String(b.target)) ? String(b.target) : (sf.target || '');
    segs = [WHO(who), S(' killed '), target ? S(target, 'b') : S(k === 'kill' ? 'someone' : 'an NPC')];
    segs.push(S('.'));
    key = k + '|' + target;
    fact('target', b.target, /^unknown$/i.test(String(b.target || '')) ? 'the game did not record the name' : '');
    fact('targetId', b.targetId, 'that one creature or person in the world');
    fact('targetBaseId', b.targetBaseId, b.targetBaseId === null ? 'no kind recorded, so it cannot be named' : 'the kind of creature');
  } else if (k === 'death' || k === 'missive_courier_died') {
    const by = b.killer || b.killedBy || b.by || sf.killer || sf.by || '';
    segs = k === 'death' ? [WHO(who), S(' died'), by ? S(', killed by ') : S(''), by ? S(by, 'b') : S(''), S('.')] : [WHO(who), S('’s courier died.')];
    key = k + '|' + by;
    fact('killer', by);
    fact('cause', b.cause || b.reason);
  } else if (k === 'player_join' || k === 'player_leave') {
    segs = [WHO(who), S(k === 'player_join' ? ' came into the server.' : ' left the server.')];
    key = k;
  } else if (k === 'chest_open') {
    segs = [WHO(who), S(' opened a chest')];
    if (b.chestId) segs.push(S(' '), S(String(b.chestId), 'n'));
    segs.push(S('.'));
    key = k + '|' + (b.chestId || '');
    fact('chestId', b.chestId, 'the chest’s own number; the same chest always has the same one');
  } else if (k === 'chest_lock') {
    const un = /unlock/i.test(h.raw) || b.locked === false;
    segs = [WHO(who), S(un ? ' unlocked a chest' : ' locked a chest')];
    if (b.chestId) segs.push(S(' '), S(String(b.chestId), 'n'));
    segs.push(S('.'));
    key = k + '|' + (b.chestId || '');
    fact('chestId', b.chestId, 'the chest’s own number');
  } else if (k === 'chest_diff') {
    const actorSide = Array.isArray(b.actor) ? b.actor : null;
    const contSide = Array.isArray(b.container) ? b.container : null;
    let took = [], put = [];
    if (actorSide) { took = listOf(actorSide, -1); put = listOf(actorSide, 1); }
    else if (contSide) { took = listOf(contSide, 1); put = listOf(contSide, -1); }
    const chest = b.chestId ? [S(' chest '), S(String(b.chestId), 'n')] : [S(' a chest')];
    if (took.length && put.length) segs = [WHO(who), S(' took ')].concat(joinItems(took, 3), [S(' out of')], chest, [S(' and put in ')], joinItems(put, 3), [S('.')]);
    else if (took.length) segs = [WHO(who), S(' took ')].concat(joinItems(took), [S(' out of')], chest, [S('.')]);
    else if (put.length) segs = [WHO(who), S(' put ')].concat(joinItems(put), [S(' into')], chest, [S('.')]);
    else if (b.chestId || actorSide || contSide) segs = [WHO(who), S(' opened and closed')].concat(chest, [S(' without moving anything.')]);
    else { segs = [WHO(who), S(' changed what was in a chest.')]; sub = 'The numbers were not in the paste. On Keizaal, click the row to open them, then copy again.'; }
    if (took.length || put.length) ledger = { took, put, who };
    if (b.reason) sub = /menu closed/i.test(String(b.reason)) ? 'Written when the chest menu closed.' : 'Reason given: ' + b.reason + '.';
    if (b._partial) sub = (sub ? sub + ' ' : '') + 'The numbers under this line were broken up, so only part of the change could be read.';
    key = k + '|' + (b.chestId || '') + '|' + took.map(x => x.name + x.n).join() + '|' + put.map(x => x.name + x.n).join();
    fact('chestId', b.chestId, 'the chest’s own number; the same chest always has the same one, so you can follow it across days');
    fact('reason', b.reason, 'why the game wrote the change down');
    if (actorSide || contSide) facts.push({ k: 'container / actor', v: 'two sides of one move', note: 'a plus on one side is a minus on the other; the actor side is the person’s own inventory' });
    took.concat(put).forEach(x => { if (x.found) facts.push({ k: x.name, v: 'baseId ' + String(x.baseId) + ' · ' + x.found.hex, note: x.found.name ? x.found.from : (x.known ? 'named by the log itself' : 'not on the registry') }); });
  } else if (k === 'craft') {
    const what = b.name || b.item || (h.summary.replace(/^crafted\s+/i, '') || 'something');
    const n = Number(b.count || 1) || 1;
    segs = [WHO(who), S(' crafted '), ITEM(n, what), S('.')];
    key = k + '|' + what;
    fact('baseId', b.baseId);
  } else if (k === 'mine_ore') {
    const what = b.name || b.ore || (h.summary.replace(/^mined\s+/i, '') || 'ore');
    segs = [WHO(who), S(' mined '), S(what, 'b'), S('.')];
    key = k + '|' + what;
  } else if (k === 'trade') {
    const partner = b.partnerName || sf.with || sf.partner || (h.summary.replace(/^traded with\s+/i, '') !== h.summary ? h.summary.replace(/^traded with\s+/i, '') : '') || (b.partnerId ? 'account ' + b.partnerId : 'someone');
    const gave = listOf(b.gave), got = listOf(b.received);
    segs = [WHO(who), S(' traded with '), S(partner, 'b')];
    if (gave.length || got.length) { segs.push(S(': gave ')); segs = segs.concat(gave.length ? joinItems(gave, 3) : [S('nothing')], [S(', received ')], got.length ? joinItems(got, 3) : [S('nothing')]); }
    segs.push(S('.'));
    if (gave.length || got.length) ledger = { took: got, put: gave, who, trade: true };
    key = k + '|' + partner;
    fact('partnerId', b.partnerId, 'the other person’s account number');
  } else if (k === 'loot_player') {
    const target = b.target || b.victim || sf.looted || (h.summary.replace(/^looted\s+/i, '') !== h.summary ? h.summary.replace(/^looted\s+/i, '') : '') || 'someone';
    const items = listOf(b.items || b.received || b.loot);
    segs = [WHO(who), S(' looted '), S(target, 'b')];
    if (items.length) segs = segs.concat([S(' and took ')], joinItems(items));
    segs.push(S('.'));
    if (items.length) ledger = { took: items, put: [], who };
    key = k + '|' + target;
  } else if (k === 'chat') {
    const msg = String(b.message || b.text || h.summary || '');
    segs = [WHO(who), S(' said '), S('“' + msg + '”', 'b')];
    key = 'chat|' + msg;
  } else if (k === 'command') {
    const cmd = String(b.command || b.text || h.summary || '');
    segs = [WHO(who), S(' ran '), S(cmd, 'n')];
    key = 'command|' + cmd;
  } else if (k === 'roll') {
    segs = [WHO(who), S(' rolled '), S(String(b.result !== undefined ? b.result : b.roll !== undefined ? b.roll : h.summary || 'the dice'), 'b'), S(b.max ? ' of ' + b.max : ''), S('.')];
    key = 'roll';
  } else {
    const label = h.kind.name === 'Event' || h.kind.id === 'other' ? (h.summary || 'did something') : h.kind.name.toLowerCase() + (h.summary && h.summary !== h.kind.name.toLowerCase() ? ' — ' + h.summary : '');
    segs = [WHO(who), S(' — ' + label.replace(/_/g, ' ')), S('.')];
    key = 'other|' + h.kind.name + '|' + h.summary;
  }

  const KNOWN = new Set(['message', 'text', 'command', 'result', 'roll', 'max', 'sourceRefrId', 'baseId', 'name', 'count', 'target', 'targetId', 'targetBaseId', 'chestId', 'reason', 'container', 'actor', 'partnerId', 'partnerName', 'gave', 'received', 'killer', 'killedBy', 'by', 'cause', 'item', 'ore', 'items', 'loot', 'victim', 'locked', '_partial']);
  Object.keys(b).filter(x => !KNOWN.has(x)).forEach(x => fact(x, b[x]));
  const text = segs.map(s => s.t).join('');
  return { segs, text, sub, ledger, key, facts };
}

function fold(events) {
  const out = [];
  const open = new Map();
  const secs = t => { const m = TIME_RE.exec(t || ''); return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] || 0) : null; };
  events.forEach(ev => {
    const id = ev.day + '|' + (ev.head.actor || '') + '|' + ev.key;
    const prev = open.get(id);
    const s = secs(ev.time);
    if (prev && prev.secsLast !== null && s !== null && Math.abs(prev.secsLast - s) <= 180 && !ev.ledger) {
      prev.n += 1;
      prev.times.push(ev.time);
      prev.secsLast = s;
      prev.raws.push(ev.raw);
      return;
    }
    const row = Object.assign({}, ev, { n: 1, times: [ev.time], secsLast: s, raws: [ev.raw] });
    open.set(id, row);
    out.push(row);
  });
  out.forEach(r => {
    const ts = r.times.filter(Boolean).sort();
    r.from = ts[0] || '';
    r.to = ts[ts.length - 1] || '';
    delete r.secsLast;
  });
  return out;
}

function read(text) {
  const bl = blocks(text);
  const events = [];
  let day = '';
  let unread = 0, lines = 0;
  const unreadLines = [];
  let last = null;
  bl.forEach(part => {
    if (part.json !== undefined) {
      const body = parseJson(part.json);
      if (part.loose) { if (body && last && !last.body && Object.keys(body).length > 2) { last.body = body; last.raw = part.json.slice(0, 1200); } return; }
      if (last && !last.body) { last.body = body; last.raw = part.json; }
      else if (body) { events.push({ head: { time: last ? last.head.time : '', kind: guessKind(body), actor: '', summary: '', raw: '' }, body, raw: part.json, day }); last = events[events.length - 1]; }
      return;
    }
    const line = part.line;
    if (!line.trim()) return;
    const d = DAY_RE.exec(line);
    if (d) { day = d[1].replace(/\s+/g, ' '); return; }
    if (/^\s*[\d,.]+k?\s+new events?\s*$/i.test(line) || /new events?\s*$/i.test(line) && line.length < 24) return;
    const h = headline(line);
    if (h) { lines++; events.push({ head: h, body: null, raw: '', day }); last = events[events.length - 1]; return; }
    if (TIME_RE.test(line) && line.replace(TIME_RE, '').trim().length > 3) { unread++; if (unreadLines.length < 12) unreadLines.push(line.trim().slice(0, 140)); }
  });
  const rows = events.map(ev => {
    const s = sentence(ev);
    return { day: ev.day, time: ev.head.time, kind: ev.head.kind, actor: ev.head.actor, segs: s.segs, text: s.text, sub: s.sub, ledger: s.ledger, key: s.key, facts: s.facts, raw: ev.raw, line: ev.head.raw, head: ev.head };
  });
  const folded = fold(rows);
  const people = tallyPeople(folded);
  const chests = tallyChests(folded);
  const kinds = {};
  folded.forEach(r => { kinds[r.kind.cat] = (kinds[r.kind.cat] || 0) + r.n; });
  const times = folded.map(r => r.time).filter(Boolean).sort();
  const days = Array.from(new Set(folded.map(r => r.day).filter(Boolean)));
  return { rows: folded, count: rows.length, people, chests, kinds, cats: CATS, span: times.length ? { from: times[0], to: times[times.length - 1] } : null, days, unread, unreadLines, fields: FIELDS };
}

function guessKind(b) {
  if (b.chestId !== undefined && (b.container || b.actor)) return kindOf('Chest change');
  if (b.chestId !== undefined) return kindOf('Chest open');
  if (b.targetId !== undefined || b.target !== undefined) return kindOf('Killed NPC');
  if (b.sourceRefrId !== undefined) return kindOf('Take item');
  if (b.partnerId !== undefined || b.gave || b.received) return kindOf('Trade');
  return { id: 'other', cat: 'other', name: 'Numbers only' };
}

function tallyPeople(rows) {
  const by = {};
  rows.forEach(r => {
    const who = r.actor || 'Unnamed';
    const p = by[who] = by[who] || { name: who, events: 0, counts: {}, took: {}, put: {}, crafted: {}, mined: {}, kills: 0, deaths: 0 };
    p.events += r.n;
    p.counts[r.kind.cat] = (p.counts[r.kind.cat] || 0) + r.n;
    if (r.kind.id === 'kill_npc' || r.kind.id === 'kill') p.kills += r.n;
    if (r.kind.id === 'death') p.deaths += r.n;
    if (r.ledger && !r.ledger.trade) { r.ledger.took.forEach(x => { p.took[x.name] = (p.took[x.name] || 0) + x.n; }); r.ledger.put.forEach(x => { p.put[x.name] = (p.put[x.name] || 0) + x.n; }); }
    if (r.kind.id === 'craft') { const nm = r.segs.find(s => s.k === 'b'); if (nm) p.crafted[nm.t.replace(/^[\d,]+ /, '')] = (p.crafted[nm.t.replace(/^[\d,]+ /, '')] || 0) + r.n; }
    if (r.kind.id === 'mine_ore') { const nm = r.segs.find(s => s.k === 'b'); if (nm) p.mined[nm.t] = (p.mined[nm.t] || 0) + r.n; }
  });
  const list = v => Object.entries(v).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n }));
  return Object.values(by).map(p => Object.assign(p, { took: list(p.took), put: list(p.put), crafted: list(p.crafted), mined: list(p.mined) })).sort((a, b) => b.events - a.events);
}

function tallyChests(rows) {
  const by = {};
  rows.forEach(r => {
    if (r.kind.cat !== 'chest') return;
    const id = r.facts.find(f => f.k === 'chestId');
    if (!id) return;
    const c = by[id.v] = by[id.v] || { id: id.v, changes: [], opens: 0, people: new Set(), net: {} };
    c.people.add(r.actor || 'Unnamed');
    if (r.kind.id === 'chest_open') { c.opens += r.n; return; }
    if (r.kind.id === 'chest_diff' && r.ledger) {
      c.changes.push({ time: r.time, day: r.day, who: r.actor, took: r.ledger.took, put: r.ledger.put });
      r.ledger.took.forEach(x => { c.net[x.name] = (c.net[x.name] || 0) - x.n; });
      r.ledger.put.forEach(x => { c.net[x.name] = (c.net[x.name] || 0) + x.n; });
    }
  });
  return Object.values(by).map(c => Object.assign(c, { people: Array.from(c.people), net: Object.entries(c.net).filter(([, n]) => n).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).map(([name, n]) => ({ name, n })) }))
    .sort((a, b) => b.changes.length - a.changes.length);
}

const FIELDS = [
  ['sourceRefrId / targetId', 'That exact object or creature in the world, not the kind of thing. Two swords of the same kind have different ones.'],
  ['baseId', 'Which kind of thing it is. Every Elven Sword shares one. The Ministry turns it into a name where it can.'],
  ['chestId', 'The chest’s own number. The same chest always has the same one, so you can follow it across days and pastes.'],
  ['reason', 'Why the game wrote a chest change down. “menu closed” means the player shut the chest.'],
  ['container / actor', 'The two sides of one chest change. “container” is the chest, “actor” is the person’s own inventory. A plus on one side is a minus on the other.'],
  ['delta', 'How many more or fewer. Minus on the actor side means the person handed it over; plus means they took it.'],
  ['count', 'How many.'],
  ['target', 'What was killed. “Unknown” means the game had no name for it.'],
  ['targetBaseId', 'What kind of creature was killed. null means the game did not record it.'],
  ['partnerId / partnerName', 'The other person in a trade.'],
  ['gave / received', 'What each side of a trade handed over.'],
  ['enchantmentId', 'Which enchantment is on an item, named from the enchantment register where it can be.'],
  ['health', 'An item’s quality as a multiplier. 1.0 is plain; above it has been tempered.'],
  ['chargePercent', 'How full an enchanted item is, out of a hundred.']
];

module.exports = { read, blocks, headline, parseJson, clean, kindOf, CATS, FIELDS };
