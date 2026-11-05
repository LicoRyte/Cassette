/* Solarist offline support. Bump VERSION whenever any file changes, so phones and installed apps pick up the update. */
const VERSION = 'solarist-3';
const FILES = [
  './', 'index.html', 'style.css', 'shell.js', 'solarist.js', 'manifest.webmanifest', 'economy.json', 'items.json',
  'fonts/barlow-condensed-latin-400-normal.woff2', 'fonts/barlow-condensed-latin-500-normal.woff2', 'fonts/barlow-condensed-latin-600-normal.woff2', 'fonts/barlow-condensed-latin-700-normal.woff2',
  'fonts/barlow-latin-400-normal.woff2', 'fonts/barlow-latin-500-normal.woff2', 'fonts/barlow-latin-400-italic.woff2',
  'sfx/granted.wav', 'sfx/messagebox.wav',
  'icons/icon-32.png', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // the two settings files: try the network first so your edits show up, fall back to the saved copy offline
  if (/\/(economy|items)\.json$/.test(url.pathname)) {
    e.respondWith(fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(url.pathname.replace(/^.*\//, ''), copy)); } return r; })
      .catch(() => caches.match(url.pathname.replace(/^.*\//, ''), { ignoreSearch: true })));
    return;
  }
  // everything else: the saved copy first (works offline), the network if it isn't saved yet
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => {
    if (r.ok && url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return r;
  }).catch(() => req.mode === 'navigate' ? caches.match('index.html') : Response.error())));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => list.length ? list[0].focus() : self.clients.openWindow('./')));
});
