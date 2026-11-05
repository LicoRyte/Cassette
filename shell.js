/* Solarist page shell: sounds, notifications, the install button, offline support, and the pixel flight scene
   drawn behind the clock. The game itself lives in solarist.js. */
(() => {
  'use strict';
  const root = document.getElementById('slRoot');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } } };

  /* ---------- sound ---------- */
  const SFX = { granted: ['sfx/granted.wav', .5], notify: ['sfx/messagebox.wav', .4] };
  let soundOn = store.get('solarist-sound') !== 'off', actx = null; const bufs = {};
  const soundBtn = document.getElementById('soundBtn');
  function drawSoundBtn() { soundBtn.textContent = soundOn ? 'Sound on' : 'Sound off'; soundBtn.setAttribute('aria-pressed', String(soundOn)); }
  soundBtn.addEventListener('click', () => { soundOn = !soundOn; store.set('solarist-sound', soundOn ? 'on' : 'off'); drawSoundBtn(); if (soundOn) play('notify'); });
  drawSoundBtn();
  function ctx() { if (!actx) { const A = window.AudioContext || window.webkitAudioContext; if (A) actx = new A(); } return actx; }
  async function load(k) {
    if (bufs[k]) return bufs[k];
    const r = await fetch(SFX[k][0]); bufs[k] = await ctx().decodeAudioData(await r.arrayBuffer()); return bufs[k];
  }
  async function play(k) {
    if (!soundOn) return;
    try { const c = ctx(); if (!c) return; if (c.state === 'suspended') await c.resume(); const b = await load(k), s = c.createBufferSource(), g = c.createGain(); g.gain.value = SFX[k][1]; s.buffer = b; s.connect(g).connect(c.destination); s.start(); } catch (e) { /* no audio here */ }
  }
  // browsers only allow sound after the first tap or key press
  const unlock = () => { const c = ctx(); if (c && c.state === 'suspended') c.resume(); Object.keys(SFX).forEach(k => load(k).catch(() => {})); };
  window.addEventListener('pointerdown', unlock, { once: true }); window.addEventListener('keydown', unlock, { once: true });

  /* ---------- "session finished" notification while the app is in the background ---------- */
  root.addEventListener('click', e => { // ask once, the first time a session is started
    const b = e.target.closest('.sl-go');
    if (b && 'Notification' in window && Notification.permission === 'default' && !store.get('solarist-asked')) { store.set('solarist-asked', '1'); Notification.requestPermission().catch(() => {}); }
  });
  function notify(text) {
    if (!document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return;
    const opts = { body: text, icon: 'icons/icon-192.png', tag: 'solarist' };
    if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(r => r.showNotification('Solarist', opts)).catch(() => {});
    else try { new Notification('Solarist', opts); } catch (e) { /* not allowed here */ }
  }

  /* ---------- install button ---------- */
  let installEv = null; const installBtn = document.getElementById('installBtn');
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEv = e; installBtn.hidden = false; });
  installBtn.addEventListener('click', async () => { if (!installEv) return; installEv.prompt(); try { await installEv.userChoice; } catch (e) { /* closed */ } installEv = null; installBtn.hidden = true; });
  window.addEventListener('appinstalled', () => { installBtn.hidden = true; });

  /* ---------- offline: cache everything with a service worker ---------- */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

  /* ---------- the flight scene (192 x 96 pixels, scaled up) ---------- */
  const W = 192, H = 96;
  const C = { void: '#1f102a', night: '#390947', plum: '#4a3052', mauve: '#7b5480', dusk: '#a6859f', lilac: '#d9bdc8', white: '#ffffff', sky: '#aee2ff', blue: '#8db7ff', indigo: '#6d80fa', violet: '#8465ec', peach: '#ffb879', butter: '#fcef8d', red: '#ea6262', wine: '#873555', green: '#6bc96c', lime: '#abdd64', pink: '#ee8fcb' };
  // the ship, facing right. . empty, d dark hull, s hull shade, h hull, c cockpit, r stripe
  const SHIP = [
    '.....ddd..........',
    '....dssdd.........',
    '..r.dhhhhdd.......',
    '.rrdhhhhhhhccd....',
    'rrrdhhhhhhhcccchh.',
    '.rrdsssssssssssd..',
    '..r.dssssdd.......',
    '....dssdd.........',
    '.....ddd..........',
  ];
  const SHIP_C = { d: C.mauve, s: C.dusk, h: C.lilac, c: C.sky, r: C.red };
  const RAIDER = ['..rr..', 'rrwwrr', '.rrrr.']; // outlaw fighters
  let cv = null, g = null, info = null, last = 0, t0 = performance.now(), raf = 0;
  const stars = [[], [], []]; // far, mid, near
  const seedStars = () => { const n = [40, 22, 10]; stars.forEach((l, i) => { for (let k = 0; k < n[i]; k++) l.push({ x: Math.random() * W, y: Math.random() * H, tw: Math.random() * 6 }); }); };
  seedStars();
  const planetImg = new Map();
  function imgFor(p) {
    if (!p) return null;
    let im = planetImg.get(p.seed);
    if (!im) { im = new Image(); im.onload = kick; im.src = window.Solarist.paint(p, 48); planetImg.set(p.seed, im); }
    return im.complete && im.naturalWidth ? im : null;
  }
  function px(x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }
  function sprite(rows, map, x, y) { rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const k = row[i]; if (k !== '.') px(x + i, y + j, 1, 1, map[k]); } }); }
  function disc(cx, cy, r, fill, rim) { // a pixel circle with a lit left edge
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = x * x + y * y; if (d <= r * r) px(cx + x, cy + y, 1, 1, rim && d > (r - 1.2) * (r - 1.2) && x < r * .3 ? rim : fill); }
  }

  function frame(now) {
    raf = 0;
    if (!cv || !info) return;
    const dt = Math.min(.1, (now - (last || now)) / 1000); last = now;
    const t = (now - t0) / 1000, moving = info.running && !reduceMotion.matches;
    const travel = moving && (info.kind === 'explore' || info.kind === 'distress' || info.kind === 'fight');
    const speed = !moving ? 0 : travel ? 1 : .15;
    // sky: two bands with a dithered seam
    px(0, 0, W, H, C.void);
    for (let y = 58; y < H; y++) for (let x = (y % 2); x < W; x += 2) if (y > 70 || (x + y) % 4 === 0) px(x, y, 1, 1, C.night);
    // stars
    const sp = [3, 9, 26], col = [C.plum, C.mauve, C.lilac];
    stars.forEach((l, i) => l.forEach(s => {
      s.x -= sp[i] * speed * dt; if (s.x < -4) { s.x += W + 4; s.y = Math.random() * H; }
      const blink = !moving && i === 0 && ((t + s.tw) % 6) < .25;
      if (blink) return;
      if (travel && i === 2) px(s.x, s.y, 4, 1, C.dusk);
      px(s.x, s.y, 1, 1, i === 2 && Math.floor(t * 2 + s.tw) % 7 === 0 ? C.white : col[i]);
    }));
    const pct = info.pct / 100, bob = moving ? Math.round(Math.sin(t * 2.2)) : 0;
    let shipX = 30, shipY = 30 + bob;
    const p = imgFor(info.planet);
    if (info.kind === 'break') {
      // docked beside the world you reached
      if (p) g.drawImage(p, 118, 14);
      shipX = 72; shipY = 34 + (moving ? Math.round(Math.sin(t)) : 0);
    } else if (info.kind === 'explore' || info.kind === 'distress') {
      // the destination grows as the session goes on
      const r = Math.round(3 + pct * 20), cx = 160 - Math.round(pct * 10), cy = 34;
      if (info.kind === 'distress') {
        disc(cx, cy, Math.max(2, Math.round(r * .5)), C.night, C.wine);
        if (Math.floor(t * 2) % 2 === 0 || !moving) px(cx - 1, cy - 1, 3, 3, C.red);
      } else disc(cx, cy, r, C.night, info.coord ? C.peach : C.indigo);
    } else if (info.kind === 'build') {
      if (p) g.drawImage(p, 118, 14);
      shipX = 78;
      // construction lights blinking on the surface
      [[134, 30], [146, 40], [138, 50], [152, 28]].forEach(([x, y], i) => { if (!moving || Math.floor(t * 3 + i) % 3 !== 0) px(x, y, 2, 2, C.butter); });
    } else if (info.kind === 'discover') {
      if (p) g.drawImage(p, 118, 14);
      shipX = 72;
      // scanning beam sweeping the surface
      const sweep = moving ? Math.sin(t * 1.5) * 16 : 0;
      for (let k = 0; k < 40; k += 2) px(92 + k, 34 + Math.round(sweep * k / 40), 1, 1, k % 4 ? C.sky : C.blue);
    } else if (info.kind === 'charge') {
      // energy rings around the ship
      const ph = moving ? (t * 14) % 22 : 10;
      [ph, (ph + 11) % 22].forEach(rr => { for (let a = 0; a < 6.28; a += .18) px(shipX + 9 + Math.cos(a) * (rr + 4), shipY + 4 + Math.sin(a) * (rr + 4) * .6, 1, 1, C.violet); });
    } else if (info.kind === 'fight') {
      if (p) g.drawImage(p, 130, 20, 40, 40);
      for (let k = 0; k < 3; k++) {
        const ex = 112 + ((moving ? t * 30 : 0) + k * 31) % 60, ey = 18 + k * 18 + (moving ? Math.round(Math.sin(t * 3 + k) * 4) : 0);
        sprite(RAIDER, { r: C.red, w: C.butter }, ex, ey);
        if (moving && Math.floor(t * 4 + k) % 4 === 0) px(shipX + 20, shipY + 4, ex - shipX - 22, 1, C.peach); // laser
      }
    }
    // engine flame when moving
    if (moving && info.kind !== 'break') {
      const f = 2 + Math.floor((t * 12) % 3);
      px(shipX - f, shipY + 3, f, 3, C.peach); px(shipX - f - 1, shipY + 4, 2, 1, C.butter);
    }
    sprite(SHIP, SHIP_C, shipX, shipY);
    if (moving) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
  document.addEventListener('visibilitychange', () => { last = 0; kick(); });
  reduceMotion.addEventListener && reduceMotion.addEventListener('change', kick);
  function scene(i) {
    if (!cv) {
      const screen = root.querySelector('.sl-screen'); if (!screen) return;
      cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.setAttribute('aria-hidden', 'true');
      g = cv.getContext('2d'); g.imageSmoothingEnabled = false; screen.prepend(cv);
    }
    const changed = !info || i.kind !== info.kind || i.running !== info.running || (i.planet && i.planet.seed) !== (info.planet && info.planet.seed) || Math.round(i.pct) !== Math.round(info.pct);
    info = i;
    if (changed || i.running) kick();
  }

  /* ---------- start the game ---------- */
  const optJson = f => fetch(f, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null); // optional files; bad JSON falls back to the defaults
  Promise.all([optJson('economy.json'), optJson('items.json')]).then(([econ, items]) => {
    root.replaceChildren();
    window.Solarist.mount(root, {
      tada: () => play('granted'),
      ding: () => play('notify'),
      show: () => setTimeout(() => { const h = root.querySelector('.sl-hint'); notify(h && h.textContent ? h.textContent : 'Session finished.'); }, 0),
      title: t => { document.title = t; },
      scene,
    }, econ, items);
  }).catch(() => { root.innerHTML = '<p class="boot">Solarist couldn\'t start. Reload the page to try again.</p>'; });
})();
