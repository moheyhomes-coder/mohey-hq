/* Mohey HQ service worker: opens instantly and works offline.
   App files: cache first, refreshed in the background. Fonts and the Excel/PDF makers: cached after first use.
   Your data never goes through here: API calls are POSTs to Google and are never cached. */
const VERSION = 'mohey-hq-1.0.0';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
const EXT = 'mohey-hq-ext';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('mohey-hq-') && k !== VERSION && k !== EXT).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'].includes(url.hostname)) {
    e.respondWith(caches.open(EXT).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }).catch(() => hit))));
    return;
  }
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL('./', self.location).pathname)) return;
  const key = req.mode === 'navigate' ? './index.html' : req;
  e.respondWith(caches.open(VERSION).then((c) => c.match(key, { ignoreSearch: req.mode === 'navigate' }).then((hit) => {
    const net = fetch(req).then((res) => { if (res.ok) c.put(req.mode === 'navigate' ? './index.html' : req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })));
});
