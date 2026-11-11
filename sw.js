// Service worker — باشگاه آرش
const VERSION = 'v3-ef31ed6f54';
const SHELL = 'gym-shell-' + VERSION;
const MUSIC = 'gym-music-v2';
const PRECACHE = [
 "./",
 "css/style.css",
 "fonts/vazirmatn-arabic-400-normal.woff2",
 "fonts/vazirmatn-arabic-500-normal.woff2",
 "fonts/vazirmatn-arabic-700-normal.woff2",
 "fonts/vazirmatn-arabic-800-normal.woff2",
 "fonts/vazirmatn-latin-400-normal.woff2",
 "fonts/vazirmatn-latin-500-normal.woff2",
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
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => (k.startsWith('gym-shell-') && k !== SHELL) || (k.startsWith('gym-music-') && k !== MUSIC)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function rangeFrom(res, range) {
  const buf = await res.arrayBuffer(); const size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range || '');
  let start = m && m[1] !== '' ? parseInt(m[1], 10) : 0;
  let end = m && m[2] !== '' ? parseInt(m[2], 10) : size - 1;
  if (m && m[1] === '' && m[2] !== '') { start = Math.max(0, size - parseInt(m[2], 10)); end = size - 1; }
  end = Math.min(end, size - 1);
  if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(buf.slice(start, end + 1), { status: 206, statusText: 'Partial Content', headers: {
    'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg', 'Content-Length': String(end - start + 1),
    'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes' } });
}

self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  if (/\/music\/[^/]+\.mp3$/.test(url.pathname)) {
    e.respondWith((async () => {
      const c = await caches.open(MUSIC); const hit = await c.match(url.href);
      if (hit) { const range = req.headers.get('range'); return range ? rangeFrom(hit, range) : hit; }
      return fetch(req);
    })());
    return;
  }
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(SHELL).then(c => c.put('./', cp)); return r; }).catch(() => caches.match('./', { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => {
    if (r.ok && r.type === 'basic') { const cp = r.clone(); caches.open(SHELL).then(c => c.put(req, cp)); }
    return r;
  })));
});
