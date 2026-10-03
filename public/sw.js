const CACHE = 'ministry-shell-v1';
const OFFLINE = '/offline.html';

const STATIC = /^\/(style\.css|favicon\.svg|offline\.html|manifest\.webmanifest|icons\/|seals\/|vendor\/|[a-z0-9_-]+\.js)/i;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll([OFFLINE, '/style.css', '/favicon.svg', '/icons/icon-192.png']))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('ministry-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE).then(r => r || new Response(
        '<h1>The hall cannot be reached</h1><p>You appear to be without a connection.</p>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
      )))
    );
    return;
  }

  if (!STATIC.test(url.pathname)) return;

  event.respondWith(
    caches.match(request).then(cached => {
      const net = fetch(request).then(res => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached || Response.error());
      return cached || net;
    })
  );
});
