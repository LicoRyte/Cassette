/* Solarist offline support. Every file is fetched fresh when online (so updates show up on the next reload)
   and saved, so the app also works offline. VERSION only needs bumping when this list of files changes. */
const VERSION = 'solarist-16';
const FILES = [
  './', 'index.html', 'style.css', 'shell.js', 'solarist.js', 'manifest.webmanifest', 'economy.json', 'items.json', 'campaign.json', 'music.json', 'CREDITS.md',
  'fonts/barlow-condensed-latin-400-normal.woff2', 'fonts/barlow-condensed-latin-500-normal.woff2', 'fonts/barlow-condensed-latin-600-normal.woff2', 'fonts/barlow-condensed-latin-700-normal.woff2',
  'fonts/courier-prime-latin-400-normal.woff2', 'fonts/courier-prime-latin-700-normal.woff2', 'fonts/courier-prime-latin-400-italic.woff2',
  'sfx/granted.wav', 'sfx/messagebox.wav', 'sfx/twm_mouse_click.wav', 'sfx/twm_notif.wav',
  'icons/icon-32.png', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // network first, so a new version shows up on the next reload; the saved copy is used only when offline
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return r;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => list.length ? list[0].focus() : self.clients.openWindow('./')));
});
