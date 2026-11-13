/* Cassette Timer offline support. Every file is fetched fresh when online (so updates show up on the next reload)
   and saved, so the app also works offline. VERSION only needs bumping when this list of files changes. */
const VERSION = 'cassette-17';
const FILES = [
  './', 'index.html', 'style.css', 'manifest.webmanifest', 'CREDITS.md',
  'js/app.js', 'js/state.js', 'js/screen.js', 'js/digits.js', 'js/feel.js', 'js/notes.js', 'js/draw.js', 'js/desk.js', 'js/pen.js', 'js/export.js', 'js/clock.js', 'js/tape.js', 'js/music.js', 'js/log.js', 'js/review.js', 'js/look.js', 'js/view.js', 'js/help.js', 'js/start.js',
  'fonts/barlow-condensed-latin-400-normal.woff2', 'fonts/barlow-condensed-latin-500-normal.woff2', 'fonts/barlow-condensed-latin-600-normal.woff2', 'fonts/barlow-condensed-latin-700-normal.woff2',
  'fonts/courier-prime-latin-400-normal.woff2', 'fonts/courier-prime-latin-700-normal.woff2', 'fonts/courier-prime-latin-400-italic.woff2',
  'sfx/clock-tick.mp3', 'sfx/cassette-play.mp3', 'sfx/twm_mouse_click.wav', 'sfx/twm_notif.wav',
  'icons/cassette-32.png', 'icons/cassette-180.png', 'icons/cassette-192.png', 'icons/cassette-512.png', 'icons/cassette-maskable-512.png',
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
