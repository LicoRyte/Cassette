/* Solarist offline support. Every file is fetched fresh when online (so updates show up on the next reload)
   and saved, so the app also works offline. VERSION only needs bumping when this list of files changes. */
const VERSION = 'solarist-53';
const FILES = [
  './', 'index.html', 'style.css', 'manifest.webmanifest', 'expeditions.json',
  'js/world/random.js', 'js/world/text.js', 'content/items.json', 'content/lines.json', 'content/activities.json', 'content/traders.json', 'content/mysteries.json', 'content/wonders.json', 'content/extras.json', 'content/stories.json', 'content/seasons.json', 'content/stories/windtrap.json', 'content/stories/second-solarist.json', 'content/stories/lantern.json', 'content/stories/tidebreak.json', 'content/stories/small-hours.json', 'content/reactions.json', 'js/world/planet-data.js', 'js/world/planet.js', 'js/world/events.js', 'js/world/items.js',
  'js/world/paint.js', 'js/world/economy.js', 'js/boot.js', 'js/shell.js', 'js/game/core.js',
  'js/game/voyage.js', 'js/game/encounters.js', 'js/game/research.js', 'js/game/ship.js', 'js/game/levels.js', 'js/game/people.js',
  'js/game/expedition.js', 'js/game/investigate.js', 'js/game/stay.js', 'js/game/traders.js', 'js/game/mysteries.js', 'js/game/crewstories.js', 'js/game/season.js', 'js/game/wonders.js', 'js/game/extras.js', 'js/game/story.js', 'js/game/campaign.js',
  'js/game/session.js', 'js/ui/controls.js', 'js/ui/hud.js', 'js/ui/learning.js', 'js/ui/ship-interior.js', 'js/ui/layout.js',
  'js/ui/main-screen.js', 'js/ui/breakpanel.js', 'js/ui/globe.js', 'js/ui/right-panel.js', 'js/ui/panels.js', 'js/ui/keyboard.js', 'js/ui/planetarium.js', 'js/ui/reports.js',
  'js/game/timer.js', 'js/ui/ship-page.js', 'js/ui/star-map.js', 'js/game/achievements.js', 'js/ui/ship-views.js', 'js/ui/crew.js', 'js/ui/logbook.js', 'js/ui/album.js',
  'js/ui/reader.js', 'js/ui/intro.js', 'js/ui/aboard.js', 'js/ui/season-ui.js', 'js/ui/polish.js', 'js/ui/feel.js', 'js/ui/notes.js', 'js/ui/draw.js', 'js/ui/board.js', 'js/ui/draw-mode.js', 'js/ui/export.js', 'js/ui/clock.js', 'js/ui/tape.js', 'js/game/start.js', 'economy.json', 'items.json', 'story.json', 'music.json', 'CREDITS.md',
  'fonts/barlow-condensed-latin-400-normal.woff2', 'fonts/barlow-condensed-latin-500-normal.woff2', 'fonts/barlow-condensed-latin-600-normal.woff2', 'fonts/barlow-condensed-latin-700-normal.woff2',
  'fonts/courier-prime-latin-400-normal.woff2', 'fonts/courier-prime-latin-700-normal.woff2', 'fonts/courier-prime-latin-400-italic.woff2',
  'sfx/clock-tick.mp3', 'sfx/cassette-play.mp3', 'sfx/granted.wav', 'sfx/messagebox.wav', 'sfx/twm_mouse_click.wav', 'sfx/twm_notif.wav',
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
