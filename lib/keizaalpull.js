const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const S = require('./store');
const C = require('./config');
const KL = require('./keizaallog');

const KEYS = 'keizaal-keys.json';
const PULLS = 'keizaal-pulls.json';
const DIR = () => path.join(C.DATA_DIR, 'keizaal-pulls');
const KEEP = 40;
const MAX_ITEMS = 8000;
const TZ = process.env.KEIZAAL_TZ || 'America/New_York';

function keyFor(username) {
  const all = S.read(KEYS, {});
  let k = Object.keys(all).find(x => all[x] === username);
  if (!k) {
    k = crypto.randomBytes(18).toString('base64url');
    all[k] = username;
    S.write(KEYS, all);
  }
  return k;
}
function userOfKey(key) {
  if (!key || String(key).length < 16) return null;
  return S.read(KEYS, {})[String(key)] || null;
}
function keyReset(username) {
  const all = S.read(KEYS, {});
  Object.keys(all).forEach(k => { if (all[k] === username) delete all[k]; });
  S.write(KEYS, all);
  return keyFor(username);
}

const dtf = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour12: false, year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' });
function parts(ts) {
  const p = {};
  dtf.formatToParts(new Date(ts)).forEach(x => { p[x.type] = x.value; });
  const hour = p.hour === '24' ? '00' : p.hour;
  return { time: `${hour}:${p.minute}:${p.second}`, day: `${p.weekday} ${p.month} ${p.day}, ${p.year}`, dayKey: `${p.year}-${p.month}-${p.day}` };
}

const VERBS = {
  take_item: 'Take item', pickup_item: 'Take item', drop_item: 'Drop item', trade: 'Trade', loot_player: 'Loot player', item_remove: 'Item removed',
  chest_open: 'Chest open', chest_diff: 'Chest change', chest_lock: 'Chest lock', craft: 'Craft', mine_ore: 'Mine ore', mine_ore_bonus: 'Mine ore',
  kill_npc: 'Killed NPC', kill: 'Killed', death: 'Died', missive_courier_died: 'Courier died', player_join: 'Joined', player_leave: 'Left'
};

function itemsToText(items) {
  return items.map(it => {
    const t = parts(it.timestamp);
    const d = it.details || {};
    const label = VERBS[it.actionType] || it.actionType;
    return `${t.time}  ${label}  ${it.characterName || 'Unnamed'}  @  ${it.actionType}\n${JSON.stringify(d)}`;
  });
}

function pretty(type) {
  return String(type || '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
}

function rowsFrom(items) {
  const byDay = new Map();
  items.forEach(it => { const p = parts(Number(it.timestamp) || 0); if (!byDay.has(p.dayKey)) byDay.set(p.dayKey, { day: p.day, items: [] }); byDay.get(p.dayKey).items.push(Object.assign({ _t: p.time }, it)); });
  const chunks = [];
  Array.from(byDay.entries()).sort((a, b) => b[0].localeCompare(a[0])).forEach(([, v]) => {
    chunks.push(v.day + ' ' + v.items.length);
    v.items.forEach(it => {
      const d = it.details && typeof it.details === 'object' ? it.details : {};
      const label = VERBS[it.actionType] || pretty(it.actionType);
      const extra = Object.assign({}, d);
      if (it.discordId) extra.discordId = String(it.discordId);
      if (it.actorId) extra.actorId = it.actorId;
      chunks.push(`${it._t}  ${label}  ${it.characterName || 'Unnamed'}  @  ${summaryOf(it.actionType, d)}`);
      chunks.push(JSON.stringify(extra));
    });
  });
  return chunks.join('\n');
}

function summaryOf(type, d) {
  switch (type) {
    case 'craft': return 'crafted ' + (d.name || d.item || 'something');
    case 'mine_ore': case 'mine_ore_bonus': return 'mined ' + (d.name || d.ore || 'ore');
    case 'kill_npc': return 'killed an NPC';
    case 'kill': return 'killed ' + (d.target || 'someone');
    case 'chest_open': return 'opened a chest';
    case 'chest_diff': return 'chest contents changed';
    case 'chest_lock': return d.locked === false ? 'unlocked a chest' : 'locked a chest';
    case 'take_item': case 'pickup_item': return 'name ' + (d.name || '') + ' · count ' + (d.count || 1);
    case 'trade': return 'traded with ' + (d.partnerName || 'someone');
    case 'chat': return 'said';
    case 'command': return 'ran';
    default: return pretty(type).toLowerCase();
  }
}

function save(user, body) {
  if (!body || !Array.isArray(body.items)) throw new Error('No events came across.');
  const items = body.items.filter(x => x && typeof x === 'object' && x.timestamp).slice(0, MAX_ITEMS)
    .map(x => ({ id: x.id, timestamp: Number(x.timestamp), actorId: x.actorId, discordId: x.discordId ? String(x.discordId) : '', characterName: String(x.characterName || '').slice(0, 80), actionType: String(x.actionType || '').slice(0, 60), details: x.details && typeof x.details === 'object' ? x.details : {} }));
  if (!items.length) throw new Error('No events came across.');
  items.sort((a, b) => b.timestamp - a.timestamp);
  const id = Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
  fs.mkdirSync(DIR(), { recursive: true });
  fs.writeFileSync(path.join(DIR(), id + '.json'), JSON.stringify(items));
  const meta = { id, at: new Date().toISOString(), by: user, server: String(body.server || '').slice(0, 40), count: items.length, from: items[items.length - 1].timestamp, to: items[0].timestamp, filters: String(body.filters || '').slice(0, 300), capped: body.items.length > MAX_ITEMS || !!body.capped };
  const list = S.read(PULLS, []);
  list.unshift(meta);
  const gone = list.splice(KEEP);
  gone.forEach(g => { try { fs.unlinkSync(path.join(DIR(), g.id + '.json')); } catch (_) {} });
  S.write(PULLS, list);
  return meta;
}

function list() { return S.read(PULLS, []); }
function get(id) {
  const meta = list().find(p => p.id === id);
  if (!meta) return null;
  try { return { meta, items: JSON.parse(fs.readFileSync(path.join(DIR(), id + '.json'), 'utf8')) }; } catch (_) { return null; }
}
function remove(id) {
  const l = list().filter(p => p.id !== id);
  S.write(PULLS, l);
  try { fs.unlinkSync(path.join(DIR(), id + '.json')); } catch (_) {}
}
function read(id) {
  const p = get(id);
  if (!p) return null;
  const out = KL.read(rowsFrom(p.items));
  out.pull = p.meta;
  out.discord = {};
  p.items.forEach(it => { if (it.characterName && it.discordId) out.discord[it.characterName] = it.discordId; });
  return out;
}

function bookmarklet(host, key, server) {
  const proto = /^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? 'http' : 'https';
  const code = `(async()=>{var H='${proto}://${host}';var K='${key}';var MAX=${MAX_ITEMS};
try{
if(!location.pathname.startsWith('/admin/logs')){alert('Open the Keizaal admin logs page first, then click this.');return;}
var sp=new URLSearchParams(location.search);var srv=sp.get('server')||'kzl-wl';
var ents=performance.getEntriesByType('resource').map(function(e){return e.name}).filter(function(n){return n.indexOf('/api/admin/logs/')>-1&&n.indexOf('mode=')<0});
var base=ents.length?new URL(ents[ents.length-1]):new URL(location.origin+'/api/admin/logs/'+srv);
var known={'5m':3e5,'1h':36e5,'24h':864e5,'7d':7*864e5,'30d':30*864e5};
var want=/^#ministrypull=/.test(location.hash)?decodeURIComponent(location.hash.slice(14)):'';if(want)history.replaceState(null,'',location.pathname+location.search);
var old=document.getElementById('ministry-pull');if(old)old.remove();
function pull(url,label,filters){
  url.searchParams.delete('newerThan');url.searchParams.delete('mode');url.searchParams.set('limit','200');
  var tag=document.createElement('div');tag.style.cssText='position:fixed;top:12px;right:12px;z-index:99999;background:#1b1637;color:#e7e4ff;border:1px solid #7fe3e0;padding:10px 14px;font:14px system-ui;border-radius:4px';document.body.appendChild(tag);
  (async function(){var items=[],seen={},cursor='',pages=0;
  while(pages<60&&items.length<MAX){var q=new URL(url);if(cursor)q.searchParams.set('cursor',cursor);tag.textContent='Pulling '+label+' for the Ministry… '+items.length+' events';
  var r=await fetch(q.toString(),{credentials:'include'});if(!r.ok){tag.textContent='Keizaal answered '+r.status+'. Are you signed in?';return;}
  var j=await r.json();var got=(j.items||[]).filter(function(x){return !seen[x.id]});got.forEach(function(x){seen[x.id]=1});if(!got.length)break;items=items.concat(got);pages++;if(!j.nextCursor||j.nextCursor===cursor)break;cursor=j.nextCursor;}
  if(!items.length){tag.textContent='Keizaal has nothing for '+label+' in that range.';setTimeout(function(){tag.remove()},4000);return;}
  tag.textContent='Sending '+items.length+' events to the Ministry…';
  var f=document.createElement('form');f.method='POST';f.action=H+'/province/staff/log/pull';f.style.display='none';
  function add(n,v){var i=document.createElement('input');i.type='hidden';i.name=n;i.value=v;f.appendChild(i);}
  add('key',K);add('server',srv);add('filters',filters);add('capped',items.length>=MAX?'1':'');add('payload',JSON.stringify(items));document.body.appendChild(f);f.submit();})();
}
function pageUrl(){var u=new URL(base);var t=sp.get('t')||'7d';if(known[t])u.searchParams.set('from',String(Date.now()-known[t]));else if(!u.searchParams.get('from'))u.searchParams.set('from',String(Date.now()-7*864e5));
  ['q','discord','character','action'].forEach(function(k){var api={q:'q',discord:'discordId',character:'character',action:'actionType'}[k];if(sp.get(k))u.searchParams.set(api,sp.get(k));else u.searchParams.delete(api);});return u;}
function personUrl(who,range){var u=new URL(location.origin+'/api/admin/logs/'+srv);u.searchParams.set('from',String(Date.now()-(known[range]||7*864e5)));if(/^\\d{15,22}$/.test(who))u.searchParams.set('discordId',who);else u.searchParams.set('character',who);return u;}
if(want){try{var w=JSON.parse(want);pull(personUrl(w.who,w.range),w.who,'person='+w.who+' t='+w.range);return;}catch(e){}}
var box=document.createElement('div');box.id='ministry-pull';box.style.cssText='position:fixed;top:12px;right:12px;z-index:99999;width:340px;background:#1b1637;color:#e7e4ff;border:1px solid #7fe3e0;padding:14px 16px;font:14px system-ui;border-radius:6px;box-shadow:0 12px 30px rgba(0,0,0,.5)';
var has=sp.get('q')||sp.get('discord')||sp.get('character')||sp.get('action');
box.innerHTML='<div style="font-weight:600;margin-bottom:8px">Pull into the Ministry</div>'
 +'<button id="mp-page" style="display:block;width:100%;text-align:left;margin:0 0 8px;padding:8px 10px;background:#7fe3e0;color:#0c1a1a;border:0;border-radius:4px;font:600 14px system-ui;cursor:pointer">What this page shows'+(has?' (with its filters)':'')+'</button>'
 +'<div style="margin:10px 0 6px;color:#a7a2ce">Or one person, whatever the page shows:</div>'
 +'<input id="mp-who" list="mp-list" placeholder="Character name or Discord ID" style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #3d3570;border-radius:4px;background:#0e0b19;color:#e7e4ff;font:14px system-ui"><datalist id="mp-list"></datalist>'
 +'<div style="display:flex;gap:6px;margin:8px 0"><select id="mp-range" style="flex:1;padding:7px;border:1px solid #3d3570;border-radius:4px;background:#0e0b19;color:#e7e4ff"><option value="24h">Last 24 hours</option><option value="7d" selected>Last 7 days</option><option value="30d">Last 30 days</option></select><button id="mp-go" style="padding:7px 12px;background:#7fe3e0;color:#0c1a1a;border:0;border-radius:4px;font:600 14px system-ui;cursor:pointer">Pull</button></div>'
 +'<div id="mp-note" style="color:#a7a2ce;font-size:12.5px;min-height:1.2em"></div>'
 +'<button id="mp-x" style="position:absolute;top:6px;right:8px;background:none;border:0;color:#a7a2ce;font-size:18px;cursor:pointer">×</button>';
document.body.appendChild(box);
var who=document.getElementById('mp-who'),list=document.getElementById('mp-list'),note=document.getElementById('mp-note');
var seed=sp.get('character')||sp.get('q')||sp.get('discord')||'';if(seed)who.value=seed;who.focus();
var timer;who.addEventListener('input',function(){clearTimeout(timer);var v=who.value.trim();if(v.length<2||/^\\d+$/.test(v))return;timer=setTimeout(async function(){try{var j=await fetch(location.origin+'/api/admin/logs/'+srv+'?mode=characters&prefix='+encodeURIComponent(v),{credentials:'include'}).then(function(r){return r.json()});list.innerHTML='';(j.characters||[]).slice(0,12).forEach(function(c){var o=document.createElement('option');o.value=c;list.appendChild(o);});note.textContent=(j.characters||[]).length?'':'No character starts with that. Names must match exactly.';}catch(e){}},250);});
document.getElementById('mp-x').onclick=function(){box.remove()};
document.getElementById('mp-page').onclick=function(){box.remove();pull(pageUrl(),'this page',location.search);};
document.getElementById('mp-go').onclick=function(){var v=who.value.trim();var rg=document.getElementById('mp-range').value;if(!v){note.textContent='Type a character name or a Discord ID.';return;}box.remove();pull(personUrl(v,rg),v,'person='+v+' t='+rg);};
who.addEventListener('keydown',function(e){if(e.key==='Enter')document.getElementById('mp-go').click();});
}catch(e){alert('The pull failed: '+e.message);}})();`;
  return 'javascript:' + encodeURIComponent(code.replace(/\n\s*/g, ''));
}

module.exports = { keyFor, keyReset, userOfKey, save, list, get, remove, read, rowsFrom, bookmarklet, MAX_ITEMS, TZ };
