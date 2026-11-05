/* Solarist page shell: sounds, notifications, the install button, offline support, and the planet viewport:
   a full-screen WebGL scene behind the HUD. The planet is a real sphere with 3D-noise terrain, lit, then
   ordered-dithered and snapped to the 32-colour palette at 1/3 resolution. The game itself lives in solarist.js. */
(() => {
  'use strict';
  const root = document.getElementById('slRoot');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } } };
  const mk = (tag, attrs, ...kids) => { const e = document.createElement(tag); Object.entries(attrs || {}).forEach(([k, v]) => { if (k === 'onclick') e.addEventListener('click', v); else if (v != null) e.setAttribute(k, v); }); kids.forEach(c => e.append(c)); return e; };

  /* ---------- sound ---------- */
  const SFX = { granted: ['sfx/granted.wav', .5], notify: ['sfx/messagebox.wav', .4], click: ['sfx/twm_mouse_click.wav', .5], ui: ['sfx/twm_notif.wav', .45] };
  let soundOn = store.get('solarist-sound') !== 'off', actx = null; const bufs = {};
  function ctx() { if (!actx) { const A = window.AudioContext || window.webkitAudioContext; if (A) actx = new A(); } return actx; }
  async function load(k) { if (bufs[k]) return bufs[k]; const r = await fetch(SFX[k][0]); bufs[k] = await ctx().decodeAudioData(await r.arrayBuffer()); return bufs[k]; }
  async function play(k) {
    if (!soundOn) return;
    try { const c = ctx(); if (!c) return; if (c.state === 'suspended') await c.resume(); const b = await load(k), s = c.createBufferSource(), g = c.createGain(); g.gain.value = SFX[k][1]; s.buffer = b; s.connect(g).connect(c.destination); s.start(); } catch (e) { /* no audio here */ }
  }
  const unlock = () => { const c = ctx(); if (c && c.state === 'suspended') c.resume(); Object.keys(SFX).forEach(k => load(k).catch(() => {})); };
  window.addEventListener('pointerdown', unlock, { once: true }); window.addEventListener('keydown', unlock, { once: true });

  /* ---------- ambient space sound: generated live, so it works offline. A low drone, engine rumble while traveling,
     scanner pings while surveying, a soft alarm during a Distress Run, thumps in a fight, shimmer while charging. ---------- */
  const amb = (() => {
    let on = store.get('solarist-amb') !== 'off', vol = +(store.get('solarist-amb-vol') || 35) / 100, nodes = null, kind = 'break', run = false, next = 0, tick = 0;
    function build() {
      const c = ctx(); if (!c || nodes) return;
      const master = c.createGain(); master.gain.value = 0; master.connect(c.destination);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = .7; lp.connect(master);
      const drone = c.createGain(); drone.gain.value = .5; drone.connect(lp);
      [55, 82.4, 110.3].forEach((f, i) => { const o = c.createOscillator(); o.type = i === 1 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = i * 4 - 4; const g = c.createGain(); g.gain.value = i === 2 ? .18 : .35; o.connect(g).connect(drone); o.start(); });
      const lfo = c.createOscillator(), lfoG = c.createGain(); lfo.frequency.value = .05; lfoG.gain.value = 90; lfo.connect(lfoG).connect(lp.frequency); lfo.start();
      const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = nb.getChannelData(0); let last = 0; for (let i = 0; i < d.length; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
      const noise = c.createBufferSource(); noise.buffer = nb; noise.loop = true; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 180; bp.Q.value = .8;
      const rumble = c.createGain(); rumble.gain.value = 0; noise.connect(bp).connect(rumble).connect(master); noise.start();
      const fx = c.createGain(); fx.gain.value = .6; fx.connect(master);
      nodes = { c, master, lp, drone, rumble, fx };
      tick = setInterval(step, 120);
    }
    function blip(f1, f2, dur, gain, type) { const { c, fx } = nodes, t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g).connect(fx); o.start(t); o.stop(t + dur + .05); }
    function clank() { const { c, fx } = nodes, t = c.currentTime, b = c.createBuffer(1, c.sampleRate * .25, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
      const s2 = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s2.buffer = b; f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 600; f.Q.value = 6; g.gain.value = .25; s2.connect(f).connect(g).connect(fx); s2.start(t); }
    function apply() {
      if (!nodes) return; const { c, master, lp, rumble } = nodes, t = c.currentTime;
      const target = !on ? 0 : vol * (kind === 'break' ? .1 : run ? .16 : .11);
      master.gain.cancelScheduledValues(t); master.gain.setTargetAtTime(target, t, .8);
      rumble.gain.setTargetAtTime(run && (kind === 'explore' || kind === 'campaign' || kind === 'distress' || kind === 'fight') ? .55 : 0, t, 1.2);
      lp.frequency.setTargetAtTime(kind === 'break' ? 170 : kind === 'distress' || kind === 'fight' ? 340 : 260, t, 1.5);
    }
    function step() {
      if (!nodes || !on || !run || document.hidden) return;
      const now = performance.now(); if (now < next) return;
      if (kind === 'discover') { blip(1400, 900, .35, .22); next = now + 2300; }
      else if (kind === 'distress') { blip(660, 640, .22, .12, 'triangle'); setTimeout(() => nodes && on && blip(520, 500, .3, .12, 'triangle'), 280); next = now + 3200; }
      else if (kind === 'fight') { blip(90, 38, .4, .5); next = now + 1500 + Math.random() * 700; }
      else if (kind === 'charge') { blip(300, 640, 1.6, .08, 'triangle'); next = now + 2600; }
      else if (kind === 'build' || kind === 'shipbuild') { clank(); next = now + 1800 + Math.random() * 2200; }
      else next = now + 1000;
    }
    return {
      start() { if (on) { build(); apply(); } },
      set(k, r) { kind = k; run = r; if (on && nodes) apply(); },
      settings(box) {
        const tg = mk('button', { type: 'button', class: 'btn', 'aria-pressed': String(on) }, on ? 'Ambient sound is on' : 'Ambient sound is off');
        tg.addEventListener('click', () => { on = !on; store.set('solarist-amb', on ? 'on' : 'off'); if (on) build(); apply(); amb.settings(box); });
        const sl = mk('input', { type: 'range', min: 0, max: 100, value: Math.round(vol * 100), 'aria-label': 'Ambient volume' });
        sl.addEventListener('input', () => { vol = sl.value / 100; store.set('solarist-amb-vol', sl.value); apply(); });
        box.replaceChildren(tg, mk('label', { class: 'sx-vol' }, 'Volume ', sl));
      },
    };
  })();
  window.addEventListener('pointerdown', () => amb.start(), { once: true }); window.addEventListener('keydown', () => amb.start(), { once: true });

  /* ---------- music: study ambience during study sessions, music during breaks. The playlists live in music.json
     (paths to files in the music folder). Empty lists = no music. Tracks are fetched once and kept, so they play offline too. ---------- */
  const music = (() => {
    const lists = { study: [], break: [] }, pos = { study: -1, break: -1 }, players = { study: null, break: null }, blobs = new Map();
    let on = store.get('solarist-music') !== 'off', vol = +(store.get('solarist-music-vol') || 50) / 100, want = null, live = null, unlocked = false;
    const fades = new Map();
    function fade(a, to, ms, done) {
      clearInterval(fades.get(a)); const from = a.volume, t0 = performance.now();
      fades.set(a, setInterval(() => { const k = Math.min(1, (performance.now() - t0) / ms); a.volume = Math.max(0, Math.min(1, from + (to - from) * k)); if (k >= 1) { clearInterval(fades.get(a)); if (done) done(); } }, 40));
    }
    const src = f => blobs.has(f) ? Promise.resolve(blobs.get(f)) : fetch(f).then(r => { if (!r.ok) throw new Error(f); return r.blob(); }).then(b => { const u = URL.createObjectURL(b); blobs.set(f, u); return u; });
    function nextTrack(k) { const L = lists[k]; if (!L.length) return null; pos[k] = pos[k] < 0 ? Math.floor(Math.random() * L.length) : (pos[k] + 1) % L.length; return L[pos[k]]; }
    function load(k) { // put the next track of list k into its player (keeps going round the list)
      const f = nextTrack(k); if (!f) return Promise.resolve(null);
      return src(f).then(u => { let a = players[k]; if (!a) { a = players[k] = new Audio(); a.addEventListener('ended', () => { load(k).then(() => { if (live === k) { a.volume = vol; a.play().catch(() => {}); } }); }); } a.loop = lists[k].length === 1; a.src = u; a.volume = 0; return a; })
        .catch(() => { lists[k] = lists[k].filter(x => x !== f); pos[k] = -1; return lists[k].length ? load(k) : null; }); // a missing file is skipped
    }
    function apply() {
      const k = on && unlocked && want && lists[want].length ? want : null;
      Object.keys(players).forEach(n => { const a = players[n]; if (a && n !== k && !a.paused) fade(a, 0, 1200, () => a.pause()); });
      live = k; if (!k) return;
      const go = a => { if (!a || live !== k) return; a.play().then(() => fade(a, vol, 1500)).catch(() => {}); };
      if (players[k] && players[k].src) go(players[k]); else load(k).then(go);
    }
    return {
      lists(j) { if (j && typeof j === 'object') Object.keys(lists).forEach(k => { if (Array.isArray(j[k])) lists[k] = j[k].filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()); }); apply(); },
      set(k) { if (k !== want) { want = k; apply(); } },
      start() { if (!unlocked) { unlocked = true; apply(); } },
      settings(box) {
        const n = lists.study.length + lists.break.length;
        const tg = mk('button', { type: 'button', class: 'btn', 'aria-pressed': String(on), disabled: n ? null : true }, !n ? 'Music: none added yet' : on ? 'Music is on' : 'Music is off');
        tg.addEventListener('click', () => { on = !on; store.set('solarist-music', on ? 'on' : 'off'); apply(); music.settings(box); });
        const sl = mk('input', { type: 'range', min: 0, max: 100, value: Math.round(vol * 100), 'aria-label': 'Music volume', disabled: n ? null : true });
        sl.addEventListener('input', () => { vol = sl.value / 100; store.set('solarist-music-vol', sl.value); if (live && players[live]) { clearInterval(fades.get(players[live])); players[live].volume = vol; } });
        box.replaceChildren(tg, mk('label', { class: 'sx-vol' }, 'Volume ', sl), n ? mk('span', { class: 'sl-muted' }, lists.study.length + ' study, ' + lists.break.length + ' break track' + (n === 1 ? '' : 's')) : '');
      },
    };
  })();
  window.addEventListener('pointerdown', () => music.start(), { once: true }); window.addEventListener('keydown', () => music.start(), { once: true });

  // interface sounds, same as the archive: a click for buttons, a softer tick for tabs and options
  document.addEventListener('click', e => {
    const b = e.target.closest('button, select, summary'); if (!b || b.disabled) return;
    play(b.matches('.sx-nav button, .sx-rtabs button, .sl-stab, .sl-mis, .sl-mode, .sx-swatch, .sx-design, summary, select') ? 'ui' : 'click');
  }, true);

  /* ---------- notification when a session ends while the app is in the background ---------- */
  root.addEventListener('click', e => { // ask once, the first time a session is started
    if (e.target.closest('.sl-go') && 'Notification' in window && Notification.permission === 'default' && !store.get('solarist-asked')) { store.set('solarist-asked', '1'); Notification.requestPermission().catch(() => {}); }
  });
  function notify(text) {
    if (!document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return;
    const opts = { body: text, icon: 'icons/icon-192.png', tag: 'solarist' };
    if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(r => r.showNotification('Solarist', opts)).catch(() => {});
    else try { new Notification('Solarist', opts); } catch (e) { /* not allowed here */ }
  }

  /* ---------- install + offline ---------- */
  let installEv = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEv = e; });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => {}));
    // when a newer version takes over, reload once so you're not stuck on the old one (never in the middle of a running timer)
    let reloaded = false; const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadController || reloaded) return; const st = (() => { try { return JSON.parse(localStorage.getItem('lico-solarist')); } catch (e) { return null; } })(); if (st && st.run && st.run.running) return; reloaded = true; location.reload(); });
  }
  function appSettings(box) { // filled in when Settings opens
    const snd = mk('button', { type: 'button', class: 'btn', 'aria-pressed': String(soundOn) }, soundOn ? 'Sound is on' : 'Sound is off');
    snd.addEventListener('click', () => { soundOn = !soundOn; store.set('solarist-sound', soundOn ? 'on' : 'off'); appSettings(box); if (soundOn) play('notify'); });
    const inst = installEv ? mk('button', { type: 'button', class: 'btn', onclick: async () => { installEv.prompt(); try { await installEv.userChoice; } catch (e) { /* closed */ } installEv = null; appSettings(box); } }, 'Install as an app') : null;
    const ambBox = mk('div', { class: 'sx-row' }); amb.settings(ambBox);
    const musBox = mk('div', { class: 'sx-row' }); music.settings(musBox);
    box.replaceChildren(mk('div', { class: 'sx-row' }, snd, inst || ''), ambBox, musBox, mk('p', { class: 'sl-muted' }, installEv ? 'Installing gives Solarist its own window and icon. It works offline either way.' : 'Solarist works offline once it has loaded. To install it, use your browser menu (Install app, or Add to Home Screen on a phone).'));
  }

  /* ---------- the viewport ---------- */
  const PX = 3; // one art pixel = 3 screen pixels
  const PAL = ['#000000', '#5ba675', '#6bc96c', '#abdd64', '#fcef8d', '#ffb879', '#ea6262', '#cc425e', '#a32858', '#751756', '#390947', '#611851', '#873555', '#a6555f', '#c97373', '#f2ae99', '#ffc3f2',
    '#ee8fcb', '#d46eb3', '#873e84', '#1f102a', '#4a3052', '#7b5480', '#a6859f', '#d9bdc8', '#ffffff', '#aee2ff', '#8db7ff', '#6d80fa', '#8465ec', '#834dc4', '#7d2da0', '#4e187c'];
  const rgb = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  const KINDS = { explore: 0, campaign: 0, discover: 1, build: 2, charge: 3, fight: 4, distress: 5, break: 6, shipbuild: 7 };
  const cv = mk('canvas', { class: 'sx-view', 'aria-hidden': 'true' });
  document.body.prepend(cv);
  const gl = cv.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });

  const VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }';
  const FS = `precision highp float;
uniform vec2 res, ctr; uniform float R, t, tt, spin, pct, kind, run, coord;
uniform float hasP, seed, fClouds, fBands, fLava, fLocked, fSpark, fRings, fLand, tilt, sil, postLv, atmOn, reveal, warp, neb; uniform vec3 atmC;
uniform vec3 pal[33]; uniform vec3 pc[4]; uniform vec3 lc[2]; uniform vec3 ringC;
float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float h3(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a * n3(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= .5; } return s; }
float bayer(vec2 p){ vec2 q = mod(floor(p), 4.); float x = q.x, y = q.y;
  float v = mod(x, 2.) * 2. + mod(y, 2.) * 3. - mod(x, 2.) * mod(y, 2.) * 4.; // 2x2 pattern 0 2 3 1
  float w = floor(x / 2.) * 2. + floor(y / 2.) * 3. - floor(x / 2.) * floor(y / 2.) * 4.;
  return (v * 4. + w) / 16. - .47; }
vec3 snap(vec3 c){ vec3 b = pal[0]; float bd = 1e9; for (int i = 0; i < 33; i++){ vec3 d = c - pal[i]; float e = dot(d * d, vec3(.3, .59, .11)); if (e < bd){ bd = e; b = pal[i]; } } return b; }
vec3 surface(vec3 q, out float emit){
  emit = 0.; float h = fbm(q * 2.2 + seed); vec3 c;
  if (fBands > .5){ float b = fract(q.y * 1.9 + fbm(q * vec3(1., 3., 1.) + seed) * .9); c = b < .25 ? pc[0] : b < .5 ? pc[1] : b < .75 ? pc[2] : pc[3]; }
  else if (fLand > .5){ if (h < .52){ float k = (.52 - h) * 6.; c = k < .25 ? pc[0] : k < .55 ? pc[1] : k < .85 ? pc[2] : pc[3]; } else c = h < .6 ? lc[0] : lc[1]; }
  else { c = h < .4 ? pc[3] : h < .5 ? pc[2] : h < .6 ? pc[1] : pc[0]; }
  if (fLava > .5){ float r = abs(fbm(q * 3. + seed + 7.) - .5); if (r < .035){ c = r < .015 ? pc[0] : pc[1]; emit = 1.; } else c = h < .5 ? pc[3] : pc[2]; }
  if (fLand > .5 || fClouds > .5) if (fLava < .5 && fLocked < .5 && abs(q.y) > 1.33) c = vec3(1.);
  if (fClouds > .5){ float cl = fbm(q * 3. + vec3(tt * .03, 0., 0.) + seed + 20.); if (cl > .6) c = mix(c, vec3(1.), .85); }
  if (fSpark > .5 && h3(floor(q * 40.)) > .985) { c = vec3(1.); emit = 1.; }
  return c; }
void main(){
  vec2 fc = gl_FragCoord.xy; vec3 col = vec3(0.); bool dith = false;
  // a faint nebula behind some worlds: dithered so only a few of its pixels light up
  if (neb > .5){ float nf = fbm(vec3(fc / res.y * 2.4, seed * .7 + 3.)); float nb = smoothstep(.56, .72, nf) * .55; if (nb > 0. && bayer(fc) + .47 < nb * .6) { col = nf > .66 ? pal[32] : pal[20]; } }
  // a few stars, drifting slowly (faster while you travel) on black space
  for (int l = 0; l < 2; l++){ float fl = float(l); vec2 sp = floor(fc + vec2(tt * (1.5 + fl * 3.5) * (1. + run * (kind < .5 || kind == 4. || kind == 5. ? 5. : 0.)) + fl * 91., fl * 37.));
    float s = h3(vec3(mod(sp, 4096.), fl * 7. + 3.)); if (s > (fl < .5 ? .9988 : .9994)) col = fl < .5 ? pal[21] : (h3(vec3(mod(sp, 4096.), 11.)) > .6 ? vec3(1.) : pal[23]); }
  // the jump: for a moment every star stretches into a streak
  if (warp > 0.) for (int k = 1; k < 24; k++){ float fk = float(k); if (fk > warp * 23.) break; vec2 sp = floor(fc + vec2(fk + tt * 40., 37.) + vec2(91., 0.)); if (h3(vec3(mod(sp, 4096.), 10.)) > .9994) { col = mix(pal[23], vec3(1.), 1. - fk / 24.); } }
  vec2 uv = (fc - ctr) / R; float d2 = dot(uv, uv);
  float tl = tilt; mat2 rz = mat2(cos(tl), -sin(tl), sin(tl), cos(tl)); vec2 tu = rz * uv;
  // rings (an ellipse in a plane tilted towards you); the part behind the planet is hidden
  float ringZ = -9., ringHit = 0.;
  if (fRings > .5 && hasP > .5 && sil < .5){ float rr = length(vec2(tu.x, tu.y / .32)); if (rr > 1.35 && rr < 2.1){ float band = fract(rr * 7.); if (band > .18){ ringHit = 1.; ringZ = tu.y / .32 * -.4; } } }
  if (hasP > .5 && d2 <= 1.){
    vec3 n = vec3(uv, sqrt(1. - d2));
    // fake spin: map the disc to longitude/latitude and slide a flat noise texture sideways
    float lon = atan(n.x, n.z), lat = asin(clamp(n.y, -1., 1.));
    vec3 q = vec3(lon * 1.25 + spin * (fLocked > .5 ? .05 : .16), lat * 1.25, 0.);
    vec3 L = normalize(fLocked > .5 ? vec3(-1., .1, .25) : vec3(-.55, .35, .75)); float lit = clamp(dot(n, L), 0., 1.);
    if (sil > .5){ col = pal[20] * (.3 + .2 * lit); float rim = pow(1. - n.z, 5.) * lit; if (rim > .08) col = coord > .5 ? pal[5] : pal[28]; }
    else {
      float emit; vec3 c = surface(q, emit);
      col = c * (.08 + 1.02 * lit); col = mix(col, c, emit * .9);
      col += vec3(.35, .45, .9) * pow(1. - n.z, 3.) * .45 * (lit + .15);
      // your post's lights on the night side, more of them as the settlers grow
      if (postLv > 0. && lit < .12){ vec3 cell = floor(q * 9.); if (h3(cell + seed + 4.) > 1. - postLv * .045) col = h3(cell + 9.) > .5 ? pal[5] : pal[4]; }
      if (kind == 2. && run > .5){ vec3 cell = floor(q * 26.); if (h3(cell + seed) > .982 && mod(floor(tt * 2.5 + h3(cell) * 9.), 3.) > 0.) col = h3(cell + 3.) > .5 ? pal[4] : pal[3]; } // little work lights on the build site
      if (kind == 1.){ // radar sweep: a green band moving down, then back up, with a fading trail
        float ph = mod(tt * .3, 2.), y = ph < 1. ? 1. - ph : ph - 1., dir = ph < 1. ? -1. : 1.;
        float yy = (uv.y + 1.) * .5, dy = (yy - y) * -dir;
        float band = exp(-abs(yy - y) * 70.), trail = dy > 0. ? exp(-dy * 9.) * .5 : 0.;
        col = mix(col, vec3(.42, .79, .42), clamp(band * .95 + trail, 0., 1.)); }
    }
    // arrival reveal: the dark silhouette dissolves into the real world through the dither
    if (reveal < 1. && sil < .5 && bayer(fc) + .47 > reveal) { col = pal[20] * (.3 + .2 * lit); float rim = pow(1. - n.z, 5.) * lit; if (rim > .08) col = pal[28]; }
    dith = true;
    if (ringHit > .5 && ringZ > n.z * .2 && tu.y < 0.) { col = ringC * (.35 + .65 * clamp(.5 - tu.x * .3, 0., 1.)); }
  } else if (hasP > .5 && sil < .5 && atmOn > 0. && d2 < 1.075 && reveal >= 1.) { // a thin atmosphere rim, brightest on the lit side
    vec2 dirL = normalize(vec2(-.55, .35)); float side = dot(normalize(uv), dirL) * .5 + .5; side *= side; if (d2 < 1.045 && side * atmOn > .28 + bayer(fc) * .5) { col = atmC; dith = true; }
  } else if (ringHit > .5) { col = ringC * (.4 + .6 * clamp(.5 - tu.x * .3, 0., 1.)) * (d2 < 1.6 && tu.y > 0. ? .45 : 1.); dith = true; }
  // distress: a red beacon ahead that pulses and grows
  if (kind == 5.){ float r = .05 + pct * .0012; float d = length(uv); float pulse = fract(tt * .6);
    if (d < r) col = mod(floor(tt * 2.), 2.) > 0. || run < .5 ? pal[6] : pal[12];
    if (abs(d - (r + pulse * .9)) < .012) { col = pal[6] * (1. - pulse); dith = true; } }
  // charging: violet rings pulsing out from the planet
  if (kind == 3.){ float d = length(uv); for (int k = 0; k < 2; k++){ float ph = fract(tt * .25 * run + float(k) * .5); if (abs(d - (1.15 + ph * 1.1)) < .014) { col = mix(col, pal[29], 1. - ph); dith = true; } } }
  // outlaws: raider blips circling, red at the edges of the screen
  if (kind == 4.){ for (int k = 0; k < 4; k++){ float fk = float(k), an = tt * (.5 + fk * .13) * (run * .9 + .1) + fk * 1.7;
      vec2 bp = vec2(cos(an) * 1.45, sin(an) * .55); if (length((uv - bp) * R) < 2.2) { col = pal[6]; dith = false; } }
    vec2 e = fc / res; float v = min(min(e.x, 1. - e.x), min(e.y, 1. - e.y)); if (v < .025 && h1(floor(fc / 2.) + floor(tt * 3.)) > .55 + v * 18.) col = pal[11]; }
  gl_FragColor = vec4(dith ? snap(col + bayer(fc) * .16) : col, 1.);
}`;
  let prog = null, U = {}, ok = false;
  if (gl) {
    try {
      const sh = (ty, src) => { const s = gl.createShader(ty); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      ['res', 'ctr', 'R', 't', 'tt', 'spin', 'pct', 'kind', 'run', 'coord', 'hasP', 'seed', 'fClouds', 'fBands', 'fLava', 'fLocked', 'fSpark', 'fRings', 'fLand', 'tilt', 'sil', 'pal', 'pc', 'lc', 'ringC', 'postLv', 'atmOn', 'atmC', 'reveal', 'warp', 'neb'].forEach(k => { U[k] = gl.getUniformLocation(prog, k); });
      gl.uniform3fv(U.pal, PAL.flatMap(rgb));
      ok = true;
    } catch (e) { ok = false; }
  }
  const g2 = ok ? null : cv.getContext('2d'); // fallback: the pixel portrait, no shader
  const sv = mk('canvas', { class: 'sx-view sx-shipview', 'aria-hidden': 'true' }); cv.after(sv); const gs = sv.getContext('2d'); // your ship, drawn over the planet scene
  let info = null, raf = 0, lastDraw = 0, simT = 0, spinT = 0, lastNow = 0, curSeed = null;
  const fallbackImg = new Map();
  function size() { cv.width = sv.width = Math.max(1, Math.round(innerWidth / PX)); cv.height = sv.height = Math.max(1, Math.round(innerHeight / PX)); }
  size(); addEventListener('resize', () => { size(); lastDraw = 0; kick(); });
  addEventListener('scroll', () => { lastDraw = 0; kick(); }, { passive: true }); // on phones the planet scrolls with the page
  const ATM = a => !a || /^(Almost none|Frozen solid|None)/i.test(a) ? [0, '#000000'] : /methane|spore/i.test(a) ? [.8, '#abdd64'] : /sulfur|ash|chlorine|carbon dioxide|CO₂|acid/i.test(a) ? [.8, '#ffb879'] : /hydrogen|helium|neon|argon/i.test(a) ? [.9, '#8465ec'] : [/thin/i.test(a) ? .6 : 1, '#8db7ff'];
  const STAR_C = { 'red dwarf': '#ea6262', 'orange dwarf': '#ffb879', 'yellow dwarf': '#fcef8d', 'white dwarf': '#ffffff', 'blue giant': '#aee2ff', 'red giant': '#cc425e', 'binary pair': '#fcef8d', 'pulsar': '#aee2ff' };
  function setPlanet(p) {
    if (!ok) return;
    const seed = p ? p.seed : null; if (seed === curSeed) return; curSeed = seed;
    gl.uniform1f(U.hasP, p ? 1 : 0); if (!p) return;
    const L = window.Solarist.lookOf ? window.Solarist.lookOf(p) : p.look;
    const four = (L.pal || []).concat(L.pal || []).slice(0, 4);
    gl.uniform3fv(U.pc, four.flatMap(rgb)); gl.uniform3fv(U.lc, (L.land || [four[1], four[2]]).slice(0, 2).flatMap(rgb));
    gl.uniform3fv(U.ringC, rgb(L.ringCol || '#a6859f'));
    gl.uniform1f(U.seed, (L.noise % 997) / 37); gl.uniform1f(U.tilt, L.tilt || 0);
    gl.uniform1f(U.fClouds, L.clouds ? 1 : 0); gl.uniform1f(U.fBands, L.bands ? 1 : 0); gl.uniform1f(U.fLava, L.lava ? 1 : 0); gl.uniform1f(U.fLocked, L.locked ? 1 : 0);
    const [ao, ac] = ATM(p.atm); gl.uniform1f(U.atmOn, ao); gl.uniform3fv(U.atmC, rgb(ac)); gl.uniform1f(U.neb, (p.seed % 3) === 0 ? 1 : 0);
    gl.uniform1f(U.fSpark, L.sparkle ? 1 : 0); gl.uniform1f(U.fRings, p.rings ? 1 : 0); gl.uniform1f(U.fLand, L.land ? 1 : 0);
  }
  function render(now) {
    raf = 0; if (!info) return;
    const moving = !reduceMotion.matches; // effects (radar, rings, raiders) stop when reduced motion is on; the slow spin keeps going
    const dt = lastNow ? Math.min(.1, (now - lastNow) / 1000) : 0; lastNow = now;
    if (moving) simT += dt;
    spinT += dt * (moving ? 1 : .5); // the planet always turns, timer running or not
    const fps = info.running ? 30 : 15;
    if (now - lastDraw >= 1000 / fps - 2) {
      lastDraw = now;
      const r = info.spot && info.spot.getBoundingClientRect(), rings = info.planet && info.planet.rings;
      const cx = r && r.width ? (r.left + r.width / 2) / PX : cv.width / 2, cy = r && r.height ? cv.height - (r.top + r.height / 2) / PX : cv.height / 2;
      let rad = r && r.width ? Math.min(r.width, r.height) / PX * (rings ? .25 : .44) : cv.height * .2;
      const sil = (info.kind === 'explore' || info.kind === 'campaign') && info.running ? 1 : 0;
      if (sil) rad *= .25 + .75 * info.pct / 100;
      if (ok) {
        gl.viewport(0, 0, cv.width, cv.height);
        setPlanet(info.planet); if (sil) gl.uniform1f(U.hasP, 1);
        gl.uniform2f(U.res, cv.width, cv.height); gl.uniform2f(U.ctr, cx, cy); gl.uniform1f(U.R, Math.max(4, rad));
        gl.uniform1f(U.t, now / 1000); gl.uniform1f(U.tt, simT + 40); gl.uniform1f(U.spin, spinT); gl.uniform1f(U.pct, info.pct);
        gl.uniform1f(U.kind, KINDS[info.kind] || 0); gl.uniform1f(U.run, info.running ? 1 : 0); gl.uniform1f(U.coord, info.coord ? 1 : 0); gl.uniform1f(U.sil, sil);
        const pl = info.planet, post = pl && pl.post; gl.uniform1f(U.postLv, !post ? 0 : post.tp ? 1 + Math.min(2, (post.tp.pop || 0) / 4000) : .6);
        gl.uniform1f(U.reveal, revealAt ? Math.min(1, (now - revealAt) / 1700) : 1);
        const wt = warpAt ? (now - warpAt) / 1300 : 1; gl.uniform1f(U.warp, wt < 1 ? (wt < .25 ? wt / .25 : 1 - (wt - .25) / .75) : 0);
        if (!pl && !sil) gl.uniform1f(U.neb, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      } else if (g2) {
        g2.fillStyle = '#000'; g2.fillRect(0, 0, cv.width, cv.height); g2.imageSmoothingEnabled = false;
        const p = info.planet; if (p) { let im = fallbackImg.get(p.seed); if (!im) { im = new Image(); im.onload = kick; im.src = window.Solarist.paint(p, 64); fallbackImg.set(p.seed, im); }
          if (im.complete) { const s = Math.round(rad * 2.3); g2.drawImage(im, Math.round(cx - s / 2), Math.round(cv.height - cy - s / 2), s, s); } }
      }
    }
    if (now - lastShip >= 1000 / 24 - 2) { lastShip = now; drawShipSprite(now); }
    if (!document.hidden) raf = requestAnimationFrame(render);
  }
  let lastShip = 0;
  let revealAt = 0, warpAt = 0, shootAt = performance.now() + 20000 + Math.random() * 40000, shoot = null;
  function dot(x, y, c, sz) { gs.fillStyle = c; gs.fillRect(Math.round(x), Math.round(y), sz || 1, sz || 1); }
  function drawExtras(now, cx, cy, rad, r) {
    const p = info.planet, sil = (info.kind === 'explore' || info.kind === 'campaign') && info.running, still = reduceMotion.matches, t = now / 1000;
    // the planet's own sun, up and to the left where the light comes from
    if (p && !sil && p.type !== 'Rogue') {
      const sx = r.left / PX + Math.max(14, r.width / PX * .12), sy = r.top / PX + Math.max(14, r.height / PX * .14), c = STAR_C[p.star] || '#fcef8d';
      const blink = p.star === 'pulsar' && !still && Math.floor(t * 3) % 3 === 0;
      if (!blink) { dot(sx - 1, sy - 1, c, 3); [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, 2], [-2, 2], [2, -2]].forEach(([dx, dy]) => dot(sx + dx, sy + dy, '#4a3052')); }
      if (p.star === 'binary pair') dot(sx + 6, sy + 3, '#ffb879', 2);
    }
    // moons on tilted orbits; the far half of each orbit goes behind the planet
    if (p && !sil) {
      const n = Math.min(6, p.moons || 0), base = p.rings ? 2.25 : 1.35;
      for (let i = 0; i < n; i++) {
        const a = rad * (base + i * .16), b = a * .3, ang = (still ? 0 : t) * (.22 / (1 + i * .45)) + i * 2.1 + (p.seed % 628) / 100;
        const mx = cx + Math.cos(ang) * a, my = cy + Math.sin(ang) * b, behind = Math.sin(ang) < 0;
        if (behind && Math.hypot(mx - cx, my - cy) < rad) continue;
        const sz = i === 0 ? 3 : 2; dot(mx - 1, my - 1, behind ? '#7b5480' : '#d9bdc8', sz); if (!behind && sz === 3) dot(mx + 1, my + 1, '#7b5480');
      }
    }
    // now and then a shooting star
    if (!still && now > shootAt && !shoot) { shoot = { x: Math.random() * sv.width * .8, y: Math.random() * sv.height * .35, at: now }; shootAt = now + 45000 + Math.random() * 75000; }
    if (shoot) { const u = (now - shoot.at) / 900; if (u > 1) shoot = null; else { const hx = shoot.x + u * 70, hy = shoot.y + u * 26; for (let j = 0; j < 9; j++) dot(hx - j * 2.7, hy - j, j < 2 ? '#ffffff' : j < 5 ? '#a6859f' : '#4a3052'); } }
  }
  function drawShipSprite(now) { // the ship sits to the left of the planet; it bobs while the timer runs and leaves a flame while traveling
    gs.clearRect(0, 0, sv.width, sv.height);
    if (!info || !info.ship || !window.Solarist.shipSprite) return;
    const r = info.spot && info.spot.getBoundingClientRect(); if (!r || !r.width) return;
    const img = window.Solarist.shipSprite(info.ship.design, info.ship.color, 1);
    const cx = (r.left + r.width / 2) / PX, cy = (r.top + r.height / 2) / PX, rad = Math.min(r.width, r.height) / PX * .44;
    const moving = info.running && !reduceMotion.matches, t = now / 1000;
    const bob = moving ? Math.round(Math.sin(t * 2.2)) : 0;
    const travel = info.running && (info.kind === 'explore' || info.kind === 'campaign' || info.kind === 'distress' || info.kind === 'fight');
    const half = r.width / PX / 2;
    let x = Math.round(cx - Math.min(rad * (travel ? 1.25 : 1.2), half - 4) - 18), y = Math.round(cy + (travel ? 0 : rad * .6) - 4 + bob);
    x = Math.max(Math.round(r.left / PX) + 4, x);
    if (travel && moving) { const f = 2 + Math.floor((t * 12) % 3); gs.fillStyle = '#ffb879'; gs.fillRect(x - f, y + 3, f, 3); gs.fillStyle = '#fcef8d'; gs.fillRect(x - f - 1, y + 4, 2, 1); }
    drawExtras(now, cx, cy, rad, r);
    gs.imageSmoothingEnabled = false; gs.drawImage(img, x, y);
    if (info.kind === 'shipbuild' && info.running) { // building a room: welding sparks on the hull
      const fr = Math.floor(t * 8); for (let i = 0; i < 3; i++) { const h = Math.sin((fr + i * 7) * 12.9898) * 43758.5453, k = h - Math.floor(h); if (k < .45) continue; const sx = x + 3 + Math.floor(k * 13), sy = y + 1 + Math.floor((k * 7.3 % 1) * 7); gs.fillStyle = k > .8 ? '#ffffff' : '#fcef8d'; gs.fillRect(sx, sy, 1, 1); if (k > .7) { gs.fillStyle = '#ffb879'; gs.fillRect(sx + 1, sy - 1, 1, 1); } }
    }
  }
  function typeName() { // the new world's name types itself out
    setTimeout(() => { const b = root.querySelector('.sx-name b'); if (!b) return; const full = b.textContent; let k = 0; b.textContent = '';
      const iv = setInterval(() => { k++; b.textContent = full.slice(0, k); if (k >= full.length) clearInterval(iv); }, 60); }, 300);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(render); }
  document.addEventListener('visibilitychange', () => { lastNow = 0; if (!document.hidden) kick(); });
  function scene(i) {
    const changed = !info || i.kind !== info.kind || i.running !== info.running || (i.planet && i.planet.seed) !== (info.planet && info.planet.seed);
    const still = reduceMotion.matches, travel = k => k === 'explore' || k === 'campaign' || k === 'distress' || k === 'fight';
    if (info && !still) {
      if (i.running && !info.running && i.mode === 'focus' && travel(i.kind) && !i.paused) warpAt = performance.now(); // the jump
      const newWorld = i.planet && (!info.planet || i.planet.seed !== info.planet.seed) && i.kind === 'break' && info.mode === 'focus';
      if (newWorld) { revealAt = performance.now(); typeName(); } // just arrived: reveal the world
    }
    info = i; if (changed) { lastDraw = 0; amb.set(i.kind, i.running); }
    music.set(i.running ? (i.mode === 'focus' ? 'study' : 'break') : null);
    kick();
  }

  /* ---------- start the game ---------- */
  const optJson = f => fetch(f, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null); // optional files; bad JSON falls back to the defaults
  optJson('music.json').then(j => music.lists(j));
  Promise.all([optJson('economy.json'), optJson('items.json'), optJson('campaign.json')]).then(([econ, items, camp]) => {
    root.replaceChildren();
    window.Solarist.mount(root, {
      tada: () => play('granted'),
      ding: () => play('notify'),
      show: () => setTimeout(() => { const h = root.querySelector('.sl-hint'); notify(h && h.textContent ? h.textContent : 'Session finished.'); }, 0),
      title: t => { document.title = t; },
      scene,
      settings: appSettings,
    }, econ, items, camp);
  }).catch(() => { root.innerHTML = '<p class="boot">Solarist couldn\'t start. Reload the page to try again.</p>'; });
})();
