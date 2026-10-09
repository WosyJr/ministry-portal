const C = require('./config');
const Activity = require('./activity');

const SITES = () => [
  { id: 'penoc', name: 'Penitus Oculatus', url: C.PENOC_URL },
  { id: 'bruma', name: 'County of Bruma', url: C.BRUMA_URL }
];

function kindOf(action) {
  const a = String(action || '').toLowerCase();
  if (/entered the hall|signed in|logged in/.test(a)) return 'entered';
  if (/left the hall|signed out/.test(a)) return 'left';
  if (/struck|struck out|removed|destroy|took down/.test(a)) return 'struck';
  if (/redact|withheld|lifted/.test(a)) return 'redacted';
  if (/drew|read|took a copy|looked/.test(a)) return 'drew';
  if (/laid|issued|sealed|gave|set|posted|entered a|appointed|granted|wrote|raised|released|committed/.test(a)) return 'laid';
  return 'other';
}

function own(sinceIso, limit) {
  const rows = Activity.recent({ limit: Math.max(1, Math.min(2000, Number(limit) || 500)), since: sinceIso || undefined });
  return rows.map(r => ({ at: r.at, who: r.who || '', name: r.name || r.who || 'The public', act: r.action, what: [r.target, r.detail].filter(Boolean).join(' · '), link: '', kind: kindOf(r.action) }));
}

const cache = {};
async function fetchSite(site, sinceIso) {
  if (!site.url || !C.AUDIT_KEY) return { site: site.id, name: site.name, events: [], error: !site.url ? 'no address set' : 'no AUDIT_KEY set' };
  const key = site.id + '|' + (sinceIso || '');
  const hit = cache[key];
  if (hit && Date.now() - hit.at < 60 * 1000) return hit.value;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 6000);
  let value;
  try {
    const r = await fetch(site.url.replace(/\/$/, '') + '/audit.json?limit=1000' + (sinceIso ? '&since=' + encodeURIComponent(sinceIso) : ''), {
      headers: { authorization: 'Bearer ' + C.AUDIT_KEY, accept: 'application/json' }, signal: ctl.signal
    });
    if (!r.ok) value = { site: site.id, name: site.name, events: [], error: r.status === 404 ? 'the key was refused, or the site has no feed yet' : 'answered ' + r.status };
    else {
      const j = await r.json();
      value = { site: site.id, name: site.name, events: Array.isArray(j.events) ? j.events : [], error: '' };
    }
  } catch (e) {
    value = { site: site.id, name: site.name, events: [], error: 'could not be reached' };
  } finally { clearTimeout(t); }
  cache[key] = { at: Date.now(), value };
  return value;
}

async function gather(days) {
  const d = Math.max(1, Math.min(90, Number(days) || 7));
  const since = new Date(Date.now() - d * 24 * 3600 * 1000).toISOString();
  const mine = { site: 'ministry', name: 'The Ministries', events: own(since, 1000), error: '' };
  const others = await Promise.all(SITES().map(s => fetchSite(s, since)));
  const feeds = [mine].concat(others);
  const events = [];
  feeds.forEach(f => f.events.forEach(e => events.push(Object.assign({}, e, { site: f.site, siteName: f.name, kind: e.kind || kindOf(e.act) }))));
  events.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return { since, days: d, feeds: feeds.map(f => ({ site: f.site, name: f.name, n: f.events.length, error: f.error, url: f.site === 'ministry' ? '' : (SITES().find(s => s.id === f.site) || {}).url })), events };
}

module.exports = { own, gather, kindOf, SITES };
