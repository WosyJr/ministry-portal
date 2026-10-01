const S = require('./store');
const { SKYRIM_ITEMS } = require('./skyrimitems');

const LEARNED = 'game-item-names.json';

const BY_ID = {};
SKYRIM_ITEMS.forEach(([name, id, kind]) => {
  const k = String(id).toLowerCase();
  if (!BY_ID[k]) BY_ID[k] = { name, kind };
});

const hexOf = n => '0x' + (Number(n) >>> 0).toString(16).padStart(8, '0');

function learned() { return S.read(LEARNED, {}); }

function learn(baseId, name) {
  const id = String(Number(baseId) >>> 0);
  const nm = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!id || !nm || id === '0') return;
  if (BY_ID[hexOf(baseId)]) return;
  S.update(LEARNED, {}, d => { d[id] = nm; });
}

function itemOf(baseId) {
  if (baseId === undefined || baseId === null || baseId === '') return null;
  const n = Number(baseId);
  if (!Number.isFinite(n)) return null;
  const hex = hexOf(n);
  const known = BY_ID[hex];
  if (known) return { name: known.name, kind: known.kind, hex, from: 'the Ministry’s item registry' };
  const mine = learned()[String(n >>> 0)];
  if (mine) return { name: mine, kind: '', hex, from: 'a log that named it earlier' };
  return { name: '', kind: '', hex, from: '' };
}

const FIELDS = [
  ['baseId', 'Which item it is. Every kind of thing in the game has one of these numbers — all Elven Swords share it. The Ministry turns it into a name where it can.'],
  ['formId', 'The same idea as baseId: the game’s number for a kind of thing.'],
  ['enchantmentId', 'Which enchantment is on the item. The Ministry does not hold a register of these, so it is shown as a number. The same number always means the same enchantment, so two items with it carry the same magic.'],
  ['maxCharge', 'How much magic the item holds when it is full.'],
  ['chargePercent', 'How full it is now, out of a hundred. 100 is freshly charged; 0 is spent and will not fire.'],
  ['health', 'The item’s quality, as a multiplier. 1.0 is a plain one; above 1.0 has been improved at a grindstone or workbench. 1.6 is a well-tempered weapon.'],
  ['key', 'A fingerprint of the exact item — its kind, its enchantment, its quality and its charge joined together. Two items with the same key are the same thing in every respect.'],
  ['count', 'How many.'],
  ['partnerId', 'The account number of the other person in the trade.'],
  ['partnerName', 'What that person was called at the time.'],
  ['gave', 'What the person named at the top handed over.'],
  ['received', 'What they were handed.'],
  ['name', 'The item’s name, when the log bothered to write it down.'],
  ['gold', 'Coin, in septims.'],
  ['value', 'What the game reckons it is worth.'],
  ['x', 'Where it happened, east to west.'],
  ['y', 'Where it happened, north to south.'],
  ['z', 'How high up.'],
  ['cell', 'Which part of the world — a town, an interior, a wilderness square.']
];
const FIELD = Object.fromEntries(FIELDS);

function round(n, p) {
  const f = Math.pow(10, p || 0);
  return Math.round(Number(n) * f) / f;
}

function describeItem(it) {
  if (!it || typeof it !== 'object') return '';
  const bits = [];
  const count = Number(it.count || 1);
  const found = itemOf(it.baseId !== undefined ? it.baseId : it.formId);
  const name = String(it.name || '').trim() || (found && found.name) || '';
  if (it.name && (it.baseId !== undefined || it.formId !== undefined)) learn(it.baseId !== undefined ? it.baseId : it.formId, it.name);

  let head;
  if (name) head = count > 1 ? `${count} × ${name}` : name;
  else head = count > 1 ? `${count} × an unnamed item (${found ? found.hex : '?'})` : `an unnamed item (${found ? found.hex : '?'})`;

  if (found && found.kind) bits.push(found.kind.toLowerCase().replace(/s$/, ''));

  if (it.enchantmentId) bits.push(`enchanted (no. ${it.enchantmentId})`);
  if (it.chargePercent !== undefined) {
    const c = Number(it.chargePercent);
    bits.push(c >= 99 ? 'fully charged' : c <= 0 ? 'spent, it will not fire' : `${round(c, 0)}% charged`);
  }
  if (it.health !== undefined) {
    const h = Number(it.health);
    bits.push(h > 1.01 ? `tempered to ${round(h, 2)}× quality` : h < 0.99 ? `worn, ${round(h, 2)}× quality` : 'plain, untempered');
  }
  if (it.gold !== undefined) bits.push(`${it.gold} septims`);
  return { head, bits, name, found };
}

function listItems(arr) {
  if (!Array.isArray(arr) || !arr.length) return [];
  return arr.map(describeItem).filter(Boolean);
}

const KINDS = [
  [/\btrade/i, 'trade', 'Traded'],
  [/\bdrop/i, 'drop', 'Dropped'],
  [/\b(pick ?up|picked up|take item|take|took)\b/i, 'pickup', 'Picked up'],
  [/\b(unequip|removed|put away)/i, 'unequip', 'Put away'],
  [/\b(equip)/i, 'equip', 'Equipped'],
  [/\b(buy|bought|purchase)/i, 'buy', 'Bought'],
  [/\b(sell|sold)/i, 'sell', 'Sold'],
  [/\b(craft|forge|smith)/i, 'craft', 'Made'],
  [/\b(die|died|death|killed)/i, 'death', 'Died'],
  [/\b(container|chest|stored)\b/i, 'container', 'Put into a container'],
  [/\b(spawn|placed)/i, 'spawn', 'Spawned'],
  [/\b(login|logged in|joined)/i, 'login', 'Came in'],
  [/\b(logout|logged out|left)/i, 'logout', 'Went out']
];

const FIELDY = /^(name|count|base ?id|form ?id|source ?refr? ?id|refr? ?id|enchantment ?id|charge|health|key|partner ?id|partner ?name|gold|value|cell|x|y|z)\b/i;

function split(text) {
  const out = [];
  const src = String(text || '');
  let i = 0;
  let pending = [];
  while (i < src.length) {
    const open = src.indexOf('{', i);
    if (open < 0) {
      src.slice(i).split('\n').map(s2 => s2.trim()).filter(Boolean).forEach(l => pending.push(l));
      break;
    }
    src.slice(i, open).split('\n').map(s2 => s2.trim()).filter(Boolean).forEach(l => pending.push(l));
    let depth = 0, end = -1, inStr = false, esc2 = false;
    for (let k = open; k < src.length; k++) {
      const ch = src[k];
      if (inStr) {
        if (esc2) esc2 = false;
        else if (ch === '\\') esc2 = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) { end = k; break; } }
    }
    if (end < 0) { pending.push(src.slice(open).trim()); break; }
    const raw = src.slice(open, end + 1);
    let body = null;
    try { body = JSON.parse(raw); } catch (_) { body = null; }
    out.push({ lines: pending.slice(), body, raw });
    pending = [];
    i = end + 1;
  }
  if (pending.length) out.push({ lines: pending, body: null, raw: '' });
  return out.filter(e => e.body || e.lines.length);
}

function headerOf(lines) {
  const all = lines.join(' \u00b7 ');
  const time = (all.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/) || [''])[0];
  let kind = '', verb = '';
  for (const [re, k, v] of KINDS) { if (re.test(all)) { kind = k; verb = v; break; } }

  const bits = all
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/, '')
    .split(/\s*[\u00b7\u2014@|]+\s*/)
    .map(x => x.trim())
    .filter(Boolean);

  let actor = '';
  for (const b of bits) {
    if (FIELDY.test(b)) continue;
    if (/[=:{}\[\]]/.test(b)) continue;
    const bare = b.replace(/^(take item|drop item|pick ?up|trade[d]?|equip|unequip|buy|sell|craft|login|logout)\s*/i, '').trim();
    if (!bare) continue;
    if (/\d/.test(bare)) continue;
    const words = bare.split(/\s+/);
    if (words.length > 6) continue;
    actor = bare;
    break;
  }

  const line = all.replace(/\s+/g, ' ').replace(/\s*\u00b7\s*/g, ' \u00b7 ').trim();
  return { time, kind, verb, actor, line };
}

function sentence(ev) {
  const h = ev.header;
  const b = ev.body || {};
  const who = h.actor || 'Somebody';
  const gave = listItems(b.gave);
  const got = listItems(b.received);
  const facts = [];
  let headline = '';

  if (h.kind === 'trade' || b.partnerName || b.partnerId) {
    const partner = b.partnerName || (b.partnerId ? 'account ' + b.partnerId : 'somebody');
    headline = `${who} traded with ${partner}.`;
    facts.push({ label: 'Gave', value: gave.length ? gave.map(x => x.head).join('; ') : 'nothing' });
    facts.push({ label: 'Received', value: got.length ? got.map(x => x.head).join('; ') : 'nothing' });
    if (b.partnerId) facts.push({ label: 'Their account', value: String(b.partnerId) });
  } else if (b.name !== undefined || b.baseId !== undefined || b.formId !== undefined) {
    const one = describeItem(b);
    headline = `${who} ${(h.verb || 'handled').toLowerCase()} ${one.head}.`;
  } else {
    headline = h.verb ? `${who} \u2014 ${h.verb.toLowerCase()}.` : `${who}.`;
  }

  const detail = [];
  const seen = new Set();
  const addDetail = x => {
    if (!x || !x.bits.length) return;
    const key = x.head + '|' + x.bits.join(',');
    if (seen.has(key)) return;
    seen.add(key);
    detail.push({ head: x.head, bits: x.bits.join(', ') });
  };
  gave.forEach(addDetail);
  got.forEach(addDetail);
  if (!gave.length && !got.length && (b.name !== undefined || b.baseId !== undefined || b.formId !== undefined)) addDetail(describeItem(b));

  if (b.cell) facts.push({ label: 'Where', value: String(b.cell) });
  if (b.x !== undefined && b.y !== undefined) facts.push({ label: 'Position', value: `${round(b.x, 0)}, ${round(b.y, 0)}` });
  if (b.gold !== undefined) facts.push({ label: 'Coin', value: `${b.gold} septims` });

  const KNOWN = ['gave', 'received', 'partnerId', 'partnerName', 'baseId', 'formId', 'name', 'count',
    'enchantmentId', 'maxCharge', 'chargePercent', 'health', 'key', 'cell', 'x', 'y', 'z', 'gold'];
  const extra = Object.keys(b).filter(k => !KNOWN.includes(k))
    .map(k => ({ label: k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase()), value: typeof b[k] === 'object' ? JSON.stringify(b[k]) : String(b[k]) }));

  return { time: h.time, kind: h.kind, verb: h.verb, who, headline, facts, detail, extra, line: h.line, raw: ev.raw };
}

function read(text) {
  const chunks = split(text);
  const events = chunks.map(c => ({ header: headerOf(c.lines), body: c.body, raw: c.raw }));
  const out = events.map(sentence);
  const names = {};
  out.forEach(() => {});
  events.forEach(e => {
    const b = e.body || {};
    const seen = [].concat(b.gave || [], b.received || [], b.baseId !== undefined ? [b] : []);
    seen.forEach(it => {
      const f = itemOf(it.baseId !== undefined ? it.baseId : it.formId);
      const nm = String(it.name || '').trim() || (f && f.name) || '';
      if (f && f.hex) names[f.hex] = { name: nm, from: f.from, id: it.baseId !== undefined ? it.baseId : it.formId };
    });
  });
  const unknown = Object.values(names).filter(n => !n.name);
  const ench = [];
  events.forEach(e => {
    const b = e.body || {};
    [].concat(b.gave || [], b.received || [], [b]).forEach(it => {
      if (it && it.enchantmentId && !ench.includes(it.enchantmentId)) ench.push(it.enchantmentId);
    });
  });
  return { events: out, names: Object.entries(names), unknown, enchantments: ench, count: out.length };
}

module.exports = { read, split, itemOf, learn, learned, describeItem, FIELDS, FIELD, hexOf };
