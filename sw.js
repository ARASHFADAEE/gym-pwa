// Service worker — باشگاه آرش
const VERSION = 'v5-39c8f910d8';
const SHELL = 'gym-shell-' + VERSION;
const OFF = 'gym-offline-v1'; // user-downloaded copies of built-in tracks (opaque responses)
const MEDIA_HOST = 'dl.sevilmusics.com';
// URLs with an offline copy; anything else on MEDIA_HOST is NOT intercepted (straight to network, Range intact)
const offline = new Set();
const offReady = caches.open(OFF).then(c => c.keys()).then(ks => ks.forEach(r => offline.add(r.url))).catch(() => { });
self.addEventListener('message', (e) => { const d = e.data || {}; if (d.type === 'off-add') offline.add(d.url); if (d.type === 'off-del') offline.delete(d.url); });
const PRECACHE = [
 "./",
 "css/style.css",
 "fonts/vazirmatn-arabic-400-normal.woff2",
 "fonts/vazirmatn-arabic-700-normal.woff2",
 "fonts/vazirmatn-arabic-800-normal.woff2",
 "fonts/vazirmatn-latin-400-normal.woff2",
 "fonts/vazirmatn-latin-700-normal.woff2",
 "fonts/vazirmatn-latin-800-normal.woff2",
 "icons/apple-touch-icon.png",
 "icons/favicon-32.png",
 "icons/icon-192.png",
 "icons/icon-512.png",
 "icons/logo.svg",
 "icons/maskable-192.png",
 "icons/maskable-512.png",
 "index.html",
 "js/app.js",
 "js/data.js",
 "manifest.webmanifest"
];

self.addEventListener('install', (e) => {
  e.waitUntil(offReady.then(() => caches.open(SHELL).then(c => c.addAll(PRECACHE))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => (k.startsWith('gym-shell-') && k !== SHELL) || k.startsWith('gym-music-')).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === MEDIA_HOST) {
    if (offline.has(url.href)) e.respondWith(caches.open(OFF).then(c => c.match(url.href)).then(hit => hit || fetch(req)));
    return; // not downloaded: browser handles it natively
  }
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // cache-first app shell: opens instantly even on slow/filtered networks; refreshed in background
    e.respondWith(caches.open(SHELL).then(async c => {
      const hit = await c.match('./') || await c.match('index.html');
      const net = fetch(req).then(r => { if (r.ok) c.put('./', r.clone()); return r; }).catch(() => null);
      if (hit) { e.waitUntil(net); return hit; }
      return (await net) || Response.error();
    }));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => {
    if (r.ok && r.type === 'basic') { const cp = r.clone(); caches.open(SHELL).then(c => c.put(req, cp)); }
    return r;
  })));
});
