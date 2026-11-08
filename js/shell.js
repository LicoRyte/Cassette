/* Solarist page shell: sounds, notifications, the install button, offline support, and the planet viewport:
   a full-screen WebGL scene behind the HUD. The planet is a real sphere with 3D-noise terrain, lit, then
   ordered-dithered and snapped to the 32-colour palette at 1/3 resolution. The game itself lives in js/game and js/ui (started by js/boot.js). */
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
  // a tiny typewriter blip for text that types itself out: a soft square beep, slightly different each time, at most ~20 a second
  let lastTick = 0;
  function typeTick() {
    if (!soundOn || document.hidden) return;
    const c = ctx(); if (!c || c.state !== 'running') return;

    const now = performance.now(); if (now - lastTick < 60) return; lastTick = now;

    const t = c.currentTime, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
//820 + Math.random() * 260;
    o.type = 'square'; o.frequency.value = 300 + Math.random() * 80;

    f.type = 'lowpass'; f.frequency.value = 2400;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.035, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .035);
    o.connect(f).connect(g).connect(c.destination); o.start(t); o.stop(t + .04);
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
    const view = mk('button', { type: 'button', class: 'btn', 'aria-pressed': String(bigView), title: 'Big: a huge planet in the bottom-right corner, seen from its top-left' }, bigView ? 'Planet view: big horizon' : 'Planet view: classic');
    view.addEventListener('click', () => { bigView = !bigView; store.set('solarist-view', bigView ? 'big' : 'classic'); applyView(); kick(); appSettings(box); });
    const ambBox = mk('div', { class: 'sx-row' }); amb.settings(ambBox);
    const musBox = mk('div', { class: 'sx-row' }); music.settings(musBox);
    const credits = mk('p', { class: 'sl-muted sx-credits' }, 'Colour palette: Apollo by AdamCYounis. Planet shader based on PixelPlanets by Deep-Fold (MIT). Fonts: Barlow Condensed, Courier Prime (OFL). Sounds: NightMargin and the Not-So-Awesome Archive. Break music: "Night Stars" by Hiroki971.');
    box.replaceChildren(mk('div', { class: 'sx-row' }, snd, inst || ''), mk('div', { class: 'sx-row' }, view), ambBox, musBox, mk('p', { class: 'sl-muted' }, installEv ? 'Installing gives Solarist its own window and icon. It works offline either way.' : 'Solarist works offline once it has loaded. To install it, use your browser menu (Install app, or Add to Home Screen on a phone).'), credits);
  }

  /* ---------- the viewport ---------- */
  const PX = 3; // one art pixel = 3 screen pixels
  const PAL = ['#000000', '#172038', '#253a5e', '#3c5e8b', '#4f8fba', '#73bed3', '#a4dddb', '#19332d', '#25562e', '#468232', '#75a743', '#a8ca58', '#d0da91', '#4d2b32', '#7a4841', '#ad7757', '#c09473', '#d7b594', '#e7d5b3', '#341c27', '#602c2c', '#884b2b', '#be772b', '#de9e41', '#e8c170', '#241527', '#411d31', '#752438', '#a53030', '#cf573c', '#de9e41', '#1e1d39', '#402751', '#7a367b', '#a23e8c', '#c65197', '#df84a5', '#090a14', '#10141f', '#151d28', '#202e37', '#394a50', '#577277', '#819796', '#a8b5b2', '#c7cfcc', '#ebede9'];
  const rgb = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  const KINDS = { explore: 0, campaign: 0, discover: 1, build: 2, charge: 3, fight: 4, distress: 5, break: 6, shipbuild: 7, view: 8 };
  const cv = mk('canvas', { class: 'sx-view', 'aria-hidden': 'true' });
  document.body.prepend(cv);
  const gl = cv.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });

  const VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }';
  const FS = `precision highp float;
uniform vec2 res, ctr; uniform float R, t, tt, spin, pct, kind, run, coord;
uniform float hasP, seed, fClouds, fBands, fLava, fLocked, fSpark, fRings, fLand, tilt, sil, postLv, atmOn, reveal, warp, neb, fIce, fStorm, fSpot; uniform vec3 atmC;
uniform vec3 pal[47]; uniform vec3 pc[4]; uniform vec3 lc[2]; uniform vec3 ringC;
uniform float fStyle, dfCut; uniform vec3 ca[5]; uniform vec3 cb[3]; uniform vec3 ck[4]; uniform vec3 rc[6];
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
vec3 snap(vec3 c){ vec3 b = pal[0]; float bd = 1e9; for (int i = 0; i < 47; i++){ vec3 d = c - pal[i]; float e = dot(d * d, vec3(.3, .59, .11)); if (e < bd){ bd = e; b = pal[i]; } } return b; }
/* Planet surfaces ported from PixelPlanets by Deep-Fold (MIT License, Copyright (c) 2020 Deep-Fold),
   https://github.com/Deep-Fold/PixelPlanets. uv: 0..1 across the planet, y down. Styles: 0 land and sea, 1 rivers,
   2 dry, 3 airless with craters, 4 lava, 5 ice, 6 gas giant. */
float dSeed = 1., dSize = 5., dTx = 2.;
float dRand(vec2 c){ c = mod(c, vec2(dTx, 1.) * floor(dSize + .5)); return fract(sin(dot(c, vec2(12.9898, 78.233))) * 15.5453 * dSeed); }
float dNoise(vec2 c){ vec2 i = floor(c), f = fract(c); float a = dRand(i), b = dRand(i + vec2(1., 0.)), e = dRand(i + vec2(0., 1.)), d = dRand(i + vec2(1., 1.));
  vec2 u = f * f * (3. - 2. * f); return mix(a, b, u.x) + (e - a) * u.y * (1. - u.x) + (d - b) * u.x * u.y; }
float dFbm(vec2 c, int oc){ float v = 0., s = .5; for (int i = 0; i < 6; i++){ if (i >= oc) break; v += dNoise(c) * s; c *= 2.; s *= .5; } return v; }
float dCirc(vec2 uv, float hard){ float y = floor(uv.y); uv.x += y * .31; vec2 f = fract(uv); float h = dRand(vec2(floor(uv.x), y));
  float m = length(f - .25 - h * .5), r = h * .25; return hard > .5 ? smoothstep(r - .1 * r, r, m) : smoothstep(0., r, m * .75); }
vec2 dSph(vec2 uv){ vec2 c = uv * 2. - 1.; float z = sqrt(max(0., 1. - dot(c, c))); return c / (z + 1.) * .5 + .5; }
vec2 dRot(vec2 c, float a){ c -= .5; c = mat2(cos(a), -sin(a), sin(a), cos(a)) * c; return c + .5; }
vec3 pick3(vec3 a, vec3 b, vec3 c, float i){ return i < .5 ? a : i < 1.5 ? b : c; }
float dOff(float sz, float k){ return fLocked > .5 ? 0. : spin * k * sz; } // the planet turning: the noise slides sideways
float dCloudV(vec2 su, float sz, int oc, float st, float sp){ // how thick one cloud layer is here
  dSize = sz; dTx = 1.; vec2 cu = su; cu.y += smoothstep(0., 1.3, abs(cu.x - .4)); cu *= vec2(1., st); float o = spin * sp;
  float cn = 0.; for (int i = 0; i < 9; i++) cn += dCirc(cu * dSize * .3 + float(i + 11) + vec2(o, 0.), 0.);
  float c = dFbm(cu * dSize + cn + vec2(o, 0.), oc); dTx = 2.; return c; }
vec3 dCloudC(float c, float dl, float cover, float b1, float b2, vec3 k0, vec3 k1, vec3 k2, vec3 k3){ // its colour: lit tops, shaded edges
  vec3 k = k0; if (c < cover + .03) k = k1; if (dl + c * .2 > b1) k = k2; if (dl + c * .2 > b2) k = k3; return k; }
vec3 dClouds(vec2 su, float dl, vec3 under, float cover){
  float c = dCloudV(su, 7.745, 2, 2., .46); return c < cover ? under : dCloudC(c, dl, cover, .52, .62, ck[0], ck[1], ck[2], ck[3]); }
// rings (Ring.gdshader): a wide band 3x the planet's size, tilted towards you; its back half hides behind the planet
float dRing(vec2 uv, out vec3 rcol, out float back){ // uv: planet radius 1, y up
  vec2 lo = fLocked > .5 ? vec2(.12, .45) : vec2(.39, .39);
  vec2 ru = vec2(uv.x, -uv.y) / 6. + .5; float ld = distance(ru, .5 + (lo - .5) / 3.);
  ru = dRot(ru, tilt);
  vec2 uc = (ru - vec2(0., .5)) * vec2(1., 6.); float cd = distance(uc, vec2(.5, 0.)), w = .127;
  float ring = smoothstep(.5 - w * 2., .5 - w, cd) * smoothstep(cd - w, cd, .4);
  back = ru.y < .5 && distance(ru, vec2(.5)) < 1. / 6. ? 1. : 0.;
  dSeed = 1. + mod(seed * 1.7, 9.); dSize = 15.; dTx = 2.;
  uc = dRot(uc + vec2(0., .5), spin * .08);
  ring *= dFbm(uc * dSize, 4);
  float pz = min(floor((ring + ld * ld * 2.) * 4.) / 4., 2.);
  rcol = pz <= 1. ? pick3(rc[0], rc[1], rc[2], floor(pz * 2.)) : pick3(rc[3], rc[4], rc[5], floor((pz - 1.) * 2.));
  return step(.28, ring); }
vec3 dUnder(vec2 su, float dl, bool dith, float db, float sz, int oc, float b1, float b2, vec3 c0, vec3 c1, vec3 c2){ // a three-colour lit ground or sea
  dSize = sz; float d = dl + dFbm(su * dSize + vec2(dOff(dSize, .04), 0.), oc) * .3; vec3 c = c0;
  if (d > b1) c = (d < b1 + db && dith) ? c0 : c1; if (d > b2) c = (d < b2 + db && dith) ? c1 : c2; return c; }
float dCrater(vec2 uv){ float c = 1.; for (int i = 0; i < 2; i++) c *= dCirc(uv * dSize + float(i + 11) + vec2(dOff(dSize, .04), 0.), 1.); return 1. - c; }
vec3 dfPlanet(vec2 u0, vec2 fc, float px, out float glow){
  glow = 0.; bool dith = mod(floor(fc.x) + floor(fc.y), 2.) < 1.; float db = 2. / px;
  vec2 lo = fLocked > .5 ? vec2(.12, .45) : vec2(.39, .39);
  vec2 su = dSph(dRot(u0, tilt)); float dl = distance(u0, lo); dSeed = 1. + mod(seed, 9.);
  vec3 c = ca[0];
  if (fStyle < .5 || fStyle > 4.5 && fStyle < 5.5) { // land and sea (5: ice with lakes)
    bool ice = fStyle > 4.5; c = dUnder(su, dl, dith, db, 5.228, 3, .4, .6, cb[0], cb[1], cb[2]);
    dSize = 4.292; vec2 bu = su * dSize + vec2(dOff(dSize, .04), 0.);
    float f1 = dFbm(bu, 5), f2 = dFbm(bu - lo * f1, 5), f3 = dFbm(bu - lo * 1.5 * f1, 5), f4 = dFbm(bu - lo * 2. * f1, 5);
    if (dl < .32) f4 *= .9; if (dl > .32) { f2 *= 1.05; f3 *= 1.05; f4 *= 1.05; } if (dl > .534) { f2 *= 1.3; f3 *= 1.4; f4 *= 1.8; }
    float dd = dl * dl * .1;
    if (f1 > dfCut) { vec3 g = ca[3]; if (f4 + dd < f1) g = ca[2]; if (f3 + dd < f1) g = ca[1]; if (f2 + dd < f1) g = ca[0]; if (ice) g = f2 + dd < f1 ? ca[0] : f3 + dd < f1 ? ca[1] : ca[2]; c = g; }
    if (fClouds > .5) c = dClouds(su, dl, c, ice ? .5 : .415);
  } else if (fStyle < 1.5) { // land crossed by rivers
    dSize = 4.6; vec2 bu = su * dSize + vec2(dOff(dSize, .04), 0.);
    float f1 = dFbm(bu, 5), f2 = dFbm(bu - lo * f1, 5), f3 = dFbm(bu - lo * 1.5 * f1, 5), f4 = dFbm(bu - lo * 2. * f1, 5);
    float rf = step(dfCut, dFbm(bu + f1 * 6., 5));
    if (dl < .32) f4 *= .9; if (dl > .32) { f2 *= 1.05; f3 *= 1.05; f4 *= 1.05; }
    if (dl > .534) { f2 *= 1.3; f3 *= 1.4; f4 *= 1.8; if (dl < .534 + db && dith) f4 *= .5; }
    float dd = dl * dl * .4; c = ca[3]; if (f4 + dd < f1 * 1.5) c = ca[2]; if (f3 + dd < f1) c = ca[1]; if (f2 + dd < f1) c = ca[0];
    if (rf < f1 * .5) { c = cb[1]; if (f4 + dd < f1 * 1.5) c = cb[0]; }
    if (fClouds > .5) c = dClouds(su, dl, c, .47);
  } else if (fStyle < 2.5) { // dry: a smooth gradient in five bands
    dSize = 8.; float f = dFbm(su * dSize + vec2(dOff(dSize, .04), 0.), 3), d = smoothstep(-.3, 1.2, dl);
    if (d < .362) d *= .9; if (d < .525) d *= .9;
    float v = d * pow(f, .8) * 3.5; if (dith) { v += .02; v *= 1.05; }
    float i = min(floor(v * 4.) / 4., 1.) * 4.; c = i < .5 ? ca[0] : i < 1.5 ? ca[1] : i < 2.5 ? ca[2] : i < 3.5 ? ca[3] : ca[4];
    if (fClouds > .5) c = dClouds(su, dl, c, .5);
  } else if (fStyle < 4.5) { // airless (3) and lava (4): ground, craters, then lava rivers
    c = dUnder(su, dl, dith, db, 8., 4, .615, .729, ca[0], ca[1], ca[2]);
    dSize = 5.; float c1 = dCrater(su), c2 = dCrater(su + (lo - .5) * .03);
    if (c1 > .5) { c = cb[0]; if (c2 < c1 - (.5 - dl) * 2.) c = cb[1]; if (dl > .465) c = cb[1]; }
    if (fStyle > 3.5) { dSize = 10.; float lf = dFbm(su * dSize + vec2(dOff(dSize, .04), 0.), 4), rf = dFbm(su + lf * 2.5, 4), dd = dl * dl * .4; dd -= dd * rf;
      if (rf > dfCut) { c = ck[0]; if (dd > .019) c = ck[1]; if (dd > .05) c = ck[2]; glow = 1.; } }
  } else if (fStyle > 6.5) { // cloud giant: a dark base layer, bright cloud tops drifting faster over it
    float dg = distance(u0, fLocked > .5 ? lo : vec2(.25));
    float c1 = dCloudV(su, 9., 5, 1., .7); c = dCloudC(c1, dg, 0., .692, .666, ck[0], ck[1], ck[2], ck[3]);
    float c2 = dCloudV(su, 9., 5, 1., .47); if (c2 > dfCut) c = dCloudC(c2, dg, dfCut, .439, .746, ca[0], ca[1], ca[2], ca[3]);
  } else { // gas giant: bands stirred by turbulence
    dSize = 10.107; float o = dOff(dSize, .04), band = dFbm(vec2(0., su.y * dSize * .892), 3), turb = 0.;
    for (int i = 0; i < 10; i++) turb += dCirc(su * dSize * .3 + float(i + 11) + vec2(o, 0.), 0.);
    float g1 = dFbm(su * dSize, 3), g2 = dFbm(su * vec2(1., 2.) * dSize + g1 + vec2(-o, 0.) + turb, 3);
    g2 *= pow(band, 2.) * 7.; float li = g2 + dl * 1.8; g2 += dl - .3; g2 = smoothstep(-.2, 4. - g2, li); if (dith) g2 *= 1.1;
    float pz = floor(g2 * 4.) / 2.; c = g2 < .625 ? pick3(ca[0], ca[1], ca[2], pz * 2.) : pick3(cb[0], cb[1], cb[2], (pz - 1.) * 2.);
  }
  return c; }
void main(){
  vec2 fc = gl_FragCoord.xy; vec3 col = vec3(0.); bool dith = false, flatC = false;
  // a faint nebula behind some worlds: dithered so only a few of its pixels light up
  if (neb > .5){ float nf = fbm(vec3(fc / res.y * 2.4, seed * .7 + 3.)); float nb = smoothstep(.56, .72, nf) * .55; if (nb > 0. && bayer(fc) + .47 < nb * .6) { col = nf > .66 ? pal[25] : pal[39]; } }
  // a few stars, drifting slowly (faster while you travel) on black space
  for (int l = 0; l < 2; l++){ float fl = float(l); vec2 sp = floor(fc + vec2(tt * (1.5 + fl * 3.5) * (1. + run * (kind < .5 || kind == 4. || kind == 5. ? 5. : 0.)) + fl * 91., fl * 37.));
    float s = h3(vec3(mod(sp, 4096.), fl * 7. + 3.)); if (s > (fl < .5 ? .9988 : .9994)) col = fl < .5 ? pal[32] : (h3(vec3(mod(sp, 4096.), 11.)) > .6 ? vec3(1.) : pal[43]); }
  // the jump: for a moment every star stretches into a streak
  if (warp > 0.) for (int k = 1; k < 24; k++){ float fk = float(k); if (fk > warp * 23.) break; vec2 sp = floor(fc + vec2(fk + tt * 40., 37.) + vec2(91., 0.)); if (h3(vec3(mod(sp, 4096.), 10.)) > .9994) { col = mix(pal[43], vec3(1.), 1. - fk / 24.); } }
  vec2 uv = (fc - ctr) / R; float d2 = dot(uv, uv);
  float tl = tilt; mat2 rz = mat2(cos(tl), -sin(tl), sin(tl), cos(tl)); vec2 tu = rz * uv;
  // rings (an ellipse in a plane tilted towards you); the part behind the planet is hidden
  float ringHit = 0., ringBack = 0.; vec3 ringCol = vec3(0.);
  if (fRings > .5 && hasP > .5 && sil < .5 && d2 < 7.) ringHit = dRing(uv, ringCol, ringBack);
  if (hasP > .5 && d2 <= 1.){
    vec3 n = vec3(uv, sqrt(1. - d2));
    // fake spin: map the disc to longitude/latitude and slide a flat noise texture sideways
    float lon = atan(n.x, n.z), lat = asin(clamp(n.y, -1., 1.));
    vec3 q = vec3(lon * 1.25 + spin * (fLocked > .5 ? .05 : .16), lat * 1.25, 0.);
    vec3 L = normalize(fLocked > .5 ? vec3(-1., .1, .25) : vec3(-.55, .35, .75)); float lit = clamp(dot(n, L), 0., 1.);
    if (sil > .5){ col = pal[25] * (.3 + .2 * lit); float rim = pow(1. - n.z, 5.) * lit; if (rim > .08) col = coord > .5 ? pal[24] : pal[4]; }
    else {
      float glow; col = dfPlanet(vec2(uv.x, -uv.y) * .5 + .5, fc, R * 2., glow); flatC = true;
      // world-type effects: glowing lava, glittering ice, lightning in storms
      if (glow > .5) col *= .85 + .2 * sin(tt * 1.6 + uv.x * 9. + uv.y * 7.);
      if (fIce > .5){ vec3 cell = floor(q * 34.); float g = h3(cell + seed + 5.); if (g > .978 && lit > .2 && fract(tt * .45 + g * 13.) < .16) col = vec3(1.); }
      if (fStorm > .5 && lit < .45){ vec3 cell = floor(q * 6.); float fl = floor(tt * 1.1); float hh = h3(cell + fl + seed); if (hh > .93 && fract(tt * 1.1) < .22 && h3(floor(q * 30.) + fl) > .45) col = mix(col, vec3(.88, .93, 1.), .85); }
      // your post's lights on the night side, more of them as the settlers grow
      if (postLv > 9.){ vec3 cell = floor(q * 9.); if (h3(cell + seed + 4.) > 1. - postLv * .045) col = h3(cell + 9.) > .5 ? pal[24] : pal[12]; }
      if (kind == 99.){ vec3 cell = floor(q * 26.); if (h3(cell + seed) > .982 && mod(floor(tt * 2.5 + h3(cell) * 9.), 3.) > 0.) col = h3(cell + 3.) > .5 ? pal[12] : pal[11]; } // little work lights on the build site
      if (kind == 1.){ // radar sweep: a green band moving down, then back up, with a fading trail
        float ph = mod(tt * .3, 2.), y = ph < 1. ? 1. - ph : ph - 1., dir = ph < 1. ? -1. : 1.;
        float yy = (uv.y + 1.) * .5, dy = (yy - y) * -dir;
        float band = exp(-abs(yy - y) * 70.), trail = dy > 0. ? exp(-dy * 9.) * .5 : 0.;
        col = mix(col, vec3(.42, .79, .42), clamp(band * .95 + trail, 0., 1.)); }
    }
    // arrival reveal: the dark silhouette dissolves into the real world through the dither
    if (reveal < 1. && sil < .5 && bayer(fc) + .47 > reveal) { col = pal[25] * (.3 + .2 * lit); float rim = pow(1. - n.z, 5.) * lit; if (rim > .08) col = pal[4]; flatC = false; }
    dith = !flatC;
    if (ringHit > .5 && ringBack < .5) { col = ringCol; dith = false; flatC = true; }
  } else if (hasP > .5 && sil < .5 && atmOn > 0. && d2 < 1.075 && reveal >= 1.) { // a thin atmosphere rim, brightest on the lit side
    vec2 dirL = normalize(vec2(-.55, .35)); float side = dot(normalize(uv), dirL) * .5 + .5; side *= side; if (d2 < 1.045 && side * atmOn > .28 + bayer(fc) * .5) { col = atmC; dith = true; }
  } else if (ringHit > .5) { col = ringCol; flatC = true; }
  // distress: a red beacon ahead that pulses and grows
  if (kind == 5.){ float r = .05 + pct * .0012; float d = length(uv); float pulse = fract(tt * .6);
    if (d < r) col = mod(floor(tt * 2.), 2.) > 0. || run < .5 ? pal[29] : pal[27];
    if (abs(d - (r + pulse * .9)) < .012) { col = pal[29] * (1. - pulse); dith = true; } }
  // charging: violet rings pulsing out from the planet
  if (kind == 3.){ float d = length(uv); for (int k = 0; k < 2; k++){ float ph = fract(tt * .25 * run + float(k) * .5); if (abs(d - (1.15 + ph * 1.1)) < .014) { col = mix(col, pal[4], 1. - ph); dith = true; } } }
  // outlaws: raider blips circling, red at the edges of the screen
  if (kind == 4.){ for (int k = 0; k < 4; k++){ float fk = float(k), an = tt * (.5 + fk * .13) * (run * .9 + .1) + fk * 1.7;
      vec2 bp = vec2(cos(an) * 1.45, sin(an) * .55); if (length((uv - bp) * R) < 2.2) { col = pal[29]; dith = false; } }
    vec2 e = fc / res; float v = min(min(e.x, 1. - e.x), min(e.y, 1. - e.y)); if (v < .025 && h1(floor(fc / 2.) + floor(tt * 3.)) > .55 + v * 18.) col = pal[32]; }
  gl_FragColor = vec4(dith ? snap(col + bayer(fc) * .16) : flatC ? snap(col) : col, 1.);
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
      ['res', 'ctr', 'R', 't', 'tt', 'spin', 'pct', 'kind', 'run', 'coord', 'hasP', 'seed', 'fClouds', 'fBands', 'fLava', 'fLocked', 'fSpark', 'fRings', 'fLand', 'tilt', 'sil', 'pal', 'pc', 'lc', 'ringC', 'postLv', 'fIce', 'fStorm', 'fSpot', 'atmOn', 'atmC', 'reveal', 'warp', 'neb', 'fStyle', 'dfCut', 'ca', 'cb', 'ck', 'rc'].forEach(k => { U[k] = gl.getUniformLocation(prog, k); });
      gl.uniform3fv(U.pal, PAL.flatMap(rgb));
      ok = true;
    } catch (e) { ok = false; }
  }
  const g2 = ok ? null : cv.getContext('2d'); // fallback: the pixel portrait, no shader
  const sv = mk('canvas', { class: 'sx-view sx-shipview', 'aria-hidden': 'true' }); cv.after(sv); const gs = sv.getContext('2d'); // your ship, drawn over the planet scene
  let info = null, raf = 0, lastDraw = 0, simT = 0, spinT = 0, lastNow = 0, curSeed = null;
  // planet view: 'classic' (in the middle of the screen) or 'big' (a huge planet in the bottom-right corner, seen from its top-left)
  let bigView = store.get('solarist-view') === 'big';
  const applyView = () => { root.classList.toggle('sx-bigview', bigView); lastDraw = 0; };
  applyView();
  function geom(r, rings, overlay) { // centre (art pixels, y down) and radius
    // big: the rim runs from about a third in along the bottom edge up to halfway up the right edge
    if (bigView) { const W = cv.width, H = cv.height; return { cx: W * 1.1, cy: H * 1.7, rad: Math.hypot(W * .75, H * .7) }; }
    const cx = r && r.width ? (r.left + r.width / 2) / PX : cv.width / 2, cy = r && r.height ? (r.top + r.height / 2) / PX : cv.height / 2;
    return { cx, cy, rad: r && r.width ? (rings && !overlay ? Math.min(r.height * .38, r.width * .2) : Math.min(r.width, r.height) * .44) / PX : cv.height * .2 }; // a ring reaches 2.4x the radius sideways but is flat
  }
  const fallbackImg = new Map();
  function size() { cv.width = sv.width = Math.max(1, Math.round(innerWidth / PX)); cv.height = sv.height = Math.max(1, Math.round(innerHeight / PX)); }
  size(); addEventListener('resize', () => { size(); lastDraw = 0; kick(); });
  addEventListener('scroll', () => { lastDraw = 0; kick(); }, { passive: true }); // on phones the planet scrolls with the page
  const ATM = a => !a || /^(Almost none|Frozen solid|None)/i.test(a) ? [0, '#000000'] : /methane|spore/i.test(a) ? [.8, '#a8ca58'] : /sulfur|ash|chlorine|carbon dioxide|CO₂|acid/i.test(a) ? [.8, '#e8c170'] : /hydrogen|helium|neon|argon/i.test(a) ? [.9, '#4f8fba'] : [/thin/i.test(a) ? .6 : 1, '#73bed3'];
  const STAR_C = { 'red dwarf': '#cf573c', 'orange dwarf': '#e8c170', 'yellow dwarf': '#d0da91', 'white dwarf': '#ebede9', 'blue giant': '#a4dddb', 'red giant': '#cf573c', 'binary pair': '#d0da91', 'pulsar': '#a4dddb' };
  // Deep-Fold styles per planet type, and their colours from the planet's own palette (snapped to the game palette)
  const DF_STYLE = { Ocean: 0, Garden: 0, Hycean: 0, Fungal: 0, Jungle: 1, Swamp: 1, Savanna: 1, Desert: 2, Toxic: 2, Iron: 2, 'Tidally locked': 2,
    Rocky: 3, Dwarf: 3, Carbon: 3, Rogue: 3, Lava: 4, Shattered: 4, Ice: 5, Tundra: 5, Crystal: 5, 'Gas giant': 6, 'Ice giant': 7, 'Glass storm': 7 };
  const near = h => { const [r, g, b] = rgb(h); let best = PAL[0], bd = 1e9; PAL.forEach(q => { const [x, y, z] = rgb(q), d = (r - x) ** 2 * .3 + (g - y) ** 2 * .59 + (b - z) ** 2 * .11; if (d < bd) { bd = d; best = q; } }); return best; };
  const shade = (h, f) => { const c = rgb(h).map(v => f >= 1 ? v + (1 - v) * (f - 1) : v * f); return near('#' + c.map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('')); };
  function dfLook(p, L) {
    const st = DF_STYLE[p.type] != null ? DF_STYLE[p.type] : 3, P = (L.pal || ['#819796', '#7a367b', '#752438', '#402751']).map(near), land = L.land ? L.land.map(near) : null;
    const WHITE = ['#ebede9', '#c7cfcc', '#819796', '#577277'];
    let ca = [P[0], P[1], P[2], P[3], P[3]], cb = [P[1], P[2], P[3]], ck = WHITE, cut = .6, clouds = false;
    if (st === 0) { const w = p.type === 'Fungal' ? P[2] : P[0], l = land || [P[0], P[1]]; cb = [shade(w, 1.25), w, shade(w, .65)]; ca = [shade(l[0], 1.2), l[0], l[1], shade(l[1], .6), P[3]];
      cut = { Ocean: .66, Garden: .58, Hycean: .68, Fungal: .55 }[p.type] || .6; clouds = true; }
    else if (st === 1) { const a = land ? land[1] : P[0], b2 = P[1] !== P[0] ? P[1] : P[2]; ca = [shade(a, 1.2), a, b2, shade(b2, .6), P[3]]; cb = p.type === 'Swamp' ? ['#3c5e8b', '#253a5e', '#172038'] : ['#73bed3', '#4f8fba', '#3c5e8b']; cut = .368; clouds = !!L.clouds || p.type === 'Jungle'; }
    else if (st === 2) { ca = [shade(P[0], 1.15), P[0], P[1], P[2], P[3]]; if (p.type === 'Toxic') { clouds = true; ck = ['#d0da91', '#a8ca58', '#75a743', '#468232']; } }
    else if (st === 3) { ca = [P[0], P[1], P[2], P[3], P[3]]; cb = [shade(P[1], .8), P[3], P[3]]; }
    else if (st === 4) { ca = [shade(P[2], 1.3), P[2], P[3], P[3], P[3]]; cb = [P[3], shade(P[3], .7), P[3]]; ck = [P[0], P[1], shade(P[1], .7), P[3]]; cut = .579; }
    else if (st === 5) { cb = [P[0], P[1], P[2]]; ca = [P[2], P[3], shade(P[3], .7), P[3], P[3]]; cut = .62; clouds = true; }
    else if (st === 6) { ca = [P[0], P[1], P[2], P[3], P[3]]; cb = [P[2], P[3], shade(P[3], .6)]; }
    else { ca = [shade(P[0], 1.2), P[0], P[1], P[2], P[3]]; ck = [shade(P[2], .5), shade(P[2], .5), shade(P[3], .35), shade(P[3], .25)]; cut = .28 + (p.seed % 23) / 23 * .22; }
    // ring colours: a gas giant's ring shares its bands' colours; others use the planet's ring colour, light to dark
    const rk = L.ringCol ? near(L.ringCol) : P[0];
    const rc = st === 6 ? [ca[0], ca[1], ca[2], cb[0], cb[1], cb[2]] : [shade(rk, 1.25), rk, shade(rk, .75), shade(rk, .55), shade(rk, .4), shade(rk, .28)];
    return { st, ca, cb, ck, cut, clouds, rc };
  }
  function setPlanet(p) {
    if (!ok) return;
    const seed = p ? p.seed : null; if (seed === curSeed) return; curSeed = seed;
    gl.uniform1f(U.hasP, p ? 1 : 0); if (!p) return;
    const L = window.Solarist.lookOf ? window.Solarist.lookOf(p) : p.look;
    const four = (L.pal || []).concat(L.pal || []).slice(0, 4);
    gl.uniform3fv(U.pc, four.flatMap(rgb)); gl.uniform3fv(U.lc, (L.land || [four[1], four[2]]).slice(0, 2).flatMap(rgb));
    gl.uniform3fv(U.ringC, rgb(L.ringCol || '#819796'));
    gl.uniform1f(U.seed, (L.noise % 997) / 37); gl.uniform1f(U.tilt, L.tilt || 0);
    gl.uniform1f(U.fClouds, L.clouds ? 1 : 0); gl.uniform1f(U.fBands, L.bands ? 1 : 0); gl.uniform1f(U.fLava, L.lava ? 1 : 0); gl.uniform1f(U.fLocked, L.locked ? 1 : 0);
    const [ao, ac] = ATM(p.atm); gl.uniform1f(U.atmOn, ao); gl.uniform3fv(U.atmC, rgb(ac)); gl.uniform1f(U.neb, (p.seed % 3) === 0 ? 1 : 0);
    gl.uniform1f(U.fSpark, L.sparkle ? 1 : 0); gl.uniform1f(U.fRings, p.rings ? 1 : 0); gl.uniform1f(U.fLand, L.land ? 1 : 0);
    gl.uniform1f(U.fIce, /^(Ice|Crystal|Ice giant)$/.test(p.type) ? 1 : 0); gl.uniform1f(U.fStorm, /^(Toxic|Glass storm)$/.test(p.type) ? 1 : 0);
    gl.uniform1f(U.fSpot, L.bands && (p.seed % 2) === 0 ? 1 : 0);
    const D = dfLook(p, L); gl.uniform1f(U.fStyle, D.st); gl.uniform1f(U.dfCut, D.cut); gl.uniform3fv(U.ca, D.ca.flatMap(rgb)); gl.uniform3fv(U.cb, D.cb.flatMap(rgb)); gl.uniform3fv(U.ck, D.ck.flatMap(rgb)); gl.uniform3fv(U.rc, D.rc.flatMap(rgb));
    gl.uniform1f(U.fClouds, D.clouds ? 1 : 0);
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
      const G = geom(r, rings), cx = G.cx, cy = cv.height - G.cy;
      let rad = G.rad;
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
      const sx = r.left / PX + Math.max(14, r.width / PX * .12), sy = r.top / PX + Math.max(14, r.height / PX * .14), c = STAR_C[p.star] || '#d0da91';
      const blink = p.star === 'pulsar' && !still && Math.floor(t * 3) % 3 === 0;
      // a dithered pixel glow around the sun: bigger for giants, a soft breathing pulse, a strong one for pulsars
      const big = /giant/.test(p.star) ? 1.5 : p.star === 'white dwarf' ? .75 : 1, pulse = still ? 1 : p.star === 'pulsar' ? (blink ? .35 : 1.1) : 1 + Math.sin(t * 1.3) * .08;
      const R = Math.round(11 * big * pulse), gx = Math.round(sx), gy = Math.round(sy);
      const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
        const d = Math.hypot(x, y) / R; if (d > 1) continue;
        const k = Math.pow(1 - d, 1.7) * 1.15, th = (B4[((gy + y) & 3) * 4 + ((gx + x) & 3)] + .5) / 16;
        if (d < .3 || k > th) { gs.globalAlpha = d < .3 ? .95 : d < .45 ? .8 : d < .7 ? .5 : .28; dot(gx + x, gy + y, c); }
      }
      gs.globalAlpha = 1;
      if (!blink) {
        const ray = Math.round((3 + (still ? 0 : Math.sin(t * 2.1) * 1)) * big); // little light spikes
        for (let i = 2; i <= 2 + ray; i++) { gs.globalAlpha = 1 - (i - 2) / (ray + 1) * .8; [[i, 0], [-i, 0], [0, i], [0, -i]].forEach(([dx, dy]) => dot(gx + dx, gy + dy, c)); }
        gs.globalAlpha = 1; dot(gx - 1, gy - 1, '#ebede9', 3); dot(gx, gy, '#ebede9');
      }
      if (p.star === 'binary pair') dot(sx + 6, sy + 3, '#e8c170', 2);
    }
    // moons on tilted orbits; the far half of each orbit goes behind the planet
    if (p && !sil) {
      const n = Math.min(6, p.moons || 0), base = p.rings ? 2.6 : 1.35;
      for (let i = 0; i < n; i++) {
        const a = rad * (base + i * .16), b = a * .3, ang = (still ? 0 : t) * (.22 / (1 + i * .45)) + i * 2.1 + (p.seed % 628) / 100;
        const mx = cx + Math.cos(ang) * a, my = cy + Math.sin(ang) * b, behind = Math.sin(ang) < 0;
        if (behind && Math.hypot(mx - cx, my - cy) < rad) continue;
        const sz = i === 0 ? 3 : 2; dot(mx - 1, my - 1, behind ? '#7a367b' : '#c7cfcc', sz); if (!behind && sz === 3) dot(mx + 1, my + 1, '#7a367b');
      }
    }
    // now and then a shooting star
    if (!still && now > shootAt && !shoot) { shoot = { x: Math.random() * sv.width * .8, y: Math.random() * sv.height * .35, at: now }; shootAt = now + 45000 + Math.random() * 75000; }
    if (shoot) { const u = (now - shoot.at) / 900; if (u > 1) shoot = null; else { const hx = shoot.x + u * 70, hy = shoot.y + u * 26; for (let j = 0; j < 9; j++) dot(hx - j * 2.7, hy - j, j < 2 ? '#ebede9' : j < 5 ? '#819796' : '#402751'); } }
  }
  /* ---------- the post island: a floating rock next to the planet with one little isometric building per facility ---------- */
  const THEME_C = { // [top, left face, right face, accent]
    food: ['#e8c170', '#cf573c', '#cf573c', '#d0da91'], sci: ['#a4dddb', '#4f8fba', '#73bed3', '#ebede9'], fun: ['#c7cfcc', '#c65197', '#df84a5', '#d0da91'],
    rest: ['#a8ca58', '#75a743', '#a8ca58', '#ebede9'], work: ['#819796', '#402751', '#7a367b', '#e8c170'], art: ['#c7cfcc', '#a23e8c', '#4f8fba', '#d0da91'] };
  const hashK = k => { let h = 7; for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  function isoBox(bx, by, a, b, h, C, style, t) { // base centre (bx,by), footprint half-size a x b (2:1), height h
    for (let x = -a; x < a; x++) { // the two side faces, one column at a time
      const e = Math.round((a - Math.abs(x + .5)) * b / a), y0 = by + e - h;
      gs.fillStyle = x < 0 ? C[1] : C[2]; gs.fillRect(bx + x, y0, 1, h);
      if (style % 4 === 0 && h > 4) { gs.fillStyle = C[3]; for (let y = 2; y < h - 1; y += 3) if ((x & 1) === 0 && Math.abs(x) > 1) gs.fillRect(bx + x, y0 + y, 1, 1); } // windows
      if (style % 4 === 1) { gs.fillStyle = C[3]; gs.fillRect(bx + x, y0 + 1, 1, 1); } // a stripe under the roof
    }
    if (style % 4 === 2) { gs.fillStyle = '#241527'; gs.fillRect(bx + 1, by + b - 3, 1, 2); gs.fillRect(bx + 2, by + b - 3, 1, 2); } // a door
    for (let y = -b; y < b; y++) { const w = Math.round((b - Math.abs(y + .5)) * a / b); gs.fillStyle = C[0]; gs.fillRect(bx - w, by - h + y, w * 2, 1); } // the roof
    const ry = by - h - b; // roof features
    const f = (style >> 2) % 5;
    if (f === 0) { gs.fillStyle = C[3]; gs.fillRect(bx - 1, ry, 2, 2); gs.fillRect(bx - 2, ry + 1, 4, 1); } // dome
    else if (f === 1) { gs.fillStyle = '#c7cfcc'; gs.fillRect(bx, ry - 3, 1, 4); gs.fillStyle = (Math.floor(t * 1.5) & 1) ? '#cf573c' : '#752438'; gs.fillRect(bx, ry - 4, 1, 1); } // antenna with a blinking tip
    else if (f === 2) { gs.fillStyle = '#402751'; gs.fillRect(bx + 2, ry - 1, 2, 3); gs.fillStyle = '#819796'; const k = Math.floor(t * 3) % 3; gs.fillRect(bx + 2 + (k > 1 ? 1 : 0), ry - 3 - k, 1, 1); } // chimney and smoke
    else if (f === 3) { gs.fillStyle = '#c7cfcc'; gs.fillRect(bx - 2, ry - 3, 1, 4); gs.fillStyle = C[3]; gs.fillRect(bx - 1, ry - 3, 2, 1); gs.fillRect(bx - 1, ry - 2, 1, 1); } // flag
  }
  let islandAt = null; // where the island floats this frame (the ship docks next to it on breaks)
  function drawIsland(now, cx, cy, rad, r) {
    const pl = info.planet, post = pl && pl.post, bj = info.build; islandAt = null;
    if (!post && !(bj && bj.k === 'post')) return;
    const t = now / 1000, still = reduceMotion.matches, bob = still ? 0 : Math.round(Math.sin(t * 1.1) * 1.2);
    const tp = post && post.tp, fac = tp ? tp.fac.slice(0, 12) : [], adding = bj && bj.k === 'add', building = bj && (bj.k === 'upgrade' || bj.k === 'post');
    const n = fac.length + (adding ? 1 : 0), cols = tp || (bj && bj.k === 'upgrade') ? Math.max(2, Math.min(4, Math.ceil(Math.sqrt(Math.max(1, n) * 1.4)))) : 1, rows = tp || (bj && bj.k === 'upgrade') ? Math.max(1, Math.ceil(Math.max(1, n) / cols)) : 1;
    const A = 8, B = 4, depth = Math.round(7 + (cols + rows) * 2.6);
    // float just outside the planet's lower right edge (inside the planet's box on the screen)
    let ox = Math.round(cx + rad * .92 + rows * A - A + 4), oy = Math.round(cy + rad * .5 - (cols + rows) * B / 2) + bob;
    const right = (r.left + r.width) / PX - 4; if (ox + cols * A > right) ox = Math.round(right - cols * A);
    const cell = (i, j) => [ox + (i - j) * A, oy + (i + j) * B]; // centre of tile (i = column, j = row)
    // rock underneath: a rough dithered cone hanging below the plate
    const [lcx, lcy] = cell(0, rows - 1), [rcx, rcy] = cell(cols - 1, 0), [bcx, bcy] = cell(cols - 1, rows - 1);
    const L = [lcx - A, lcy], R = [rcx + A, rcy], Bt = [bcx, bcy + B]; islandAt = { x: L[0], y: L[1] };
    const edge = x => x < Bt[0] ? L[1] + (x - L[0]) * (Bt[1] - L[1]) / Math.max(1, Bt[0] - L[0]) : Bt[1] + (x - Bt[0]) * (R[1] - Bt[1]) / Math.max(1, R[0] - Bt[0]);
    for (let x = L[0]; x < R[0]; x++) {
      const u = x < Bt[0] ? (Bt[0] - x) / Math.max(1, Bt[0] - L[0]) : (x - Bt[0]) / Math.max(1, R[0] - Bt[0]);
      const d = Math.round(depth * Math.pow(Math.max(0, 1 - u), .7) + (hashK('r' + x) % 3)), top = Math.round(edge(x + .5)) - 1;
      for (let y = 0; y < d; y++) { gs.fillStyle = y < 2 ? '#7a367b' : ((x + y) & 1) && y > d * .55 ? '#241527' : y > d * .8 ? '#402751' : '#402751'; gs.fillRect(x, top + y, 1, 1); }
    }
    // the plate: one stone tile per cell
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const [tx, ty] = cell(i, j);
      for (let y = -B; y < B; y++) { const w = Math.round((B - Math.abs(y + .5)) * A / B); gs.fillStyle = (i + j) & 1 ? '#819796' : '#819796'; gs.fillRect(tx - w, ty + y, w * 2, 1); } }
    if (building && (Math.floor(t * 2) & 1)) { gs.fillStyle = '#d0da91'; for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const [tx, ty] = cell(i, j); gs.fillRect(tx, ty, 1, 1); } }
    if (!tp) { // just a Listening Post: an antenna on a small rock
      const [tx, ty] = cell(0, 0); gs.fillStyle = '#c7cfcc'; gs.fillRect(tx, ty - 9, 1, 9); gs.fillRect(tx - 2, ty - 7, 5, 1); gs.fillRect(tx - 1, ty - 5, 3, 1);
      gs.fillStyle = (Math.floor(t * 1.5) & 1) ? '#cf573c' : '#752438'; gs.fillRect(tx, ty - 10, 1, 1);
      if (bj && bj.k === 'post' && (Math.floor(t * 3) & 1)) { gs.fillStyle = '#d0da91'; gs.fillRect(tx - 2, ty - 11, 1, 1); gs.fillRect(tx + 2, ty - 8, 1, 1); }
      return;
    }
    // buildings, back to front
    const slots = fac.map((f, k) => ({ f, i: k % cols, j: Math.floor(k / cols) }));
    if (adding) slots.push({ f: { k: bj.fac, lv: 1 }, i: fac.length % cols, j: Math.floor(fac.length / cols), wip: true });
    slots.sort((p, q) => (p.i + p.j) - (q.i + q.j) || p.i - q.i).forEach(({ f, i, j, wip }) => {
      const [bx, by] = cell(i, j), th = (window.Solarist.facTheme || {})[f.k] || 'work', C = THEME_C[th] || THEME_C.work, h = 4 + Math.min(9, Math.round((f.lv || 1) * .8)), style = hashK(f.k);
      if (wip) { if (Math.floor(t * 2) & 1) { gs.fillStyle = '#d0da91'; [[-6, 0], [6, 0], [0, 3], [0, -3]].forEach(([dx, dy]) => gs.fillRect(bx + dx, by + dy - 6, 1, 6)); gs.fillRect(bx - 6, by - 6, 13, 1); } return; } // scaffolding
      isoBox(bx, by + 1, 6, 3, h, C, style, t);
    });
    // shuttles hop between the island and the planet: busier posts, more traffic
    if (!still) { const n = Math.min(4, 1 + Math.floor(fac.length / 3)), sx0 = (L[0] + R[0]) / 2, sy0 = oy - 8;
      for (let k = 0; k < n; k++) { const u = (t * .09 + k / n) % 1, s2 = u < .5 ? u * 2 : 2 - u * 2, e = s2 * s2 * (3 - 2 * s2);
        const tx = cx + rad * (.35 + .12 * k), ty = cy - rad * (.15 - .18 * k), mx = (sx0 + tx) / 2, my = Math.min(sy0, ty) - 14 - k * 4;
        const x = (1 - e) * (1 - e) * sx0 + 2 * (1 - e) * e * mx + e * e * tx, y = (1 - e) * (1 - e) * sy0 + 2 * (1 - e) * e * my + e * e * ty;
        if (Math.hypot(x - cx, y - cy) < rad * .97 && e > .9) continue; // landing: it disappears into the atmosphere
        const dir = u < .5 ? -1 : 1; gs.fillStyle = '#d0da91'; gs.fillRect(Math.round(x), Math.round(y), 2, 1); gs.fillStyle = '#e8c170'; gs.fillRect(Math.round(x) - dir * 2 + (dir > 0 ? 0 : 1), Math.round(y), 1, 1); } }
  }
  /* ---------- the Interplanetary Station: a fixed isometric city block on a floating metal deck ---------- */
  const ST_C = { hull: ['#c7cfcc', '#577277', '#819796', '#73bed3'], hab: ['#ebede9', '#4f8fba', '#73bed3', '#e8c170'], shop: ['#e8c170', '#be772b', '#de9e41', '#ebede9'],
    dome: ['#a4dddb', '#3c5e8b', '#4f8fba', '#ebede9'], dark: ['#819796', '#394a50', '#577277', '#d0da91'], red: ['#df84a5', '#a23e8c', '#c65197', '#ebede9'] };
  const ST_BLOCK = [ // [column, row, palette, height, style] on a 4 x 3 deck, drawn back to front
    [0, 0, 'hab', 14, 0], [1, 0, 'shop', 6, 1], [2, 0, 'dark', 9, 4], [3, 0, 'hab', 11, 8],
    [0, 1, 'dome', 5, 0], [1, 1, 'tower', 0, 0], [2, 1, 'red', 7, 5], [3, 1, 'shop', 5, 6],
    [0, 2, 'dark', 4, 12], [1, 2, 'pad', 0, 0], [2, 2, 'hull', 8, 2], [3, 2, 'dome', 4, 0]];
  function drawStation(now, cx, cy, rad) {
    const t = now / 1000, still = reduceMotion.matches, bob = still ? 0 : Math.round(Math.sin(t * .7) * 1.4), A = 7, B = 3.5, cols = 4, rows = 3;
    let ox = Math.round(cx + rad * .9 + rows * A), oy = Math.round(cy - rad * .5) + bob; // off the upper right of the planet, clear of its disc
    const r = info.spot && info.spot.getBoundingClientRect(); if (r) { const right = (r.left + r.width) / PX - 40, top = r.top / PX + 36; if (ox + cols * A > right) ox = Math.round(right - cols * A); if (oy < top) oy = Math.round(top); }
    const cell = (i, j) => [Math.round(ox + (i - j) * A), Math.round(oy + (i + j) * B)];
    const [lx, ly] = cell(0, rows - 1), [rx, ry] = cell(cols - 1, 0), [bx0, by0] = cell(cols - 1, rows - 1);
    const L = [lx - A, ly], R = [rx + A, ry], Bt = [bx0, by0 + B];
    const edge = x => x < Bt[0] ? L[1] + (x - L[0]) * (Bt[1] - L[1]) / Math.max(1, Bt[0] - L[0]) : Bt[1] + (x - Bt[0]) * (R[1] - Bt[1]) / Math.max(1, R[0] - Bt[0]);
    // underside: a stepped machine hull with a row of lit portholes and thruster glow
    for (let x = L[0]; x < R[0]; x++) {
      const u = x < Bt[0] ? (Bt[0] - x) / Math.max(1, Bt[0] - L[0]) : (x - Bt[0]) / Math.max(1, R[0] - Bt[0]);
      const d = Math.round(3 + 9 * Math.max(0, 1 - u * 1.15)), top = Math.round(edge(x + .5)) - 1, left = x < Bt[0];
      for (let y = 0; y < d; y++) { gs.fillStyle = y < 2 ? (left ? '#577277' : '#819796') : y === 2 ? '#394a50' : (left ? '#253a5e' : '#3c5e8b'); gs.fillRect(x, top + y, 1, 1); }
      if (d > 5 && x % 3 === 0) { gs.fillStyle = (Math.floor(t * 1.2) + x) % 7 ? '#e8c170' : '#ebede9'; gs.fillRect(x, top + 4, 1, 1); }
    }
    const [mx, my] = [Bt[0], Bt[1] + 12]; gs.fillStyle = '#394a50'; gs.fillRect(mx - 2, my - 4, 5, 4); gs.fillStyle = '#253a5e'; gs.fillRect(mx - 1, my, 3, 2); // keel antenna pod
    if (!still) { gs.fillStyle = Math.floor(t * 6) & 1 ? '#73bed3' : '#a4dddb'; gs.fillRect(mx - 1, my + 2, 3, 1); gs.globalAlpha = .5; gs.fillRect(mx, my + 3, 1, 2); gs.globalAlpha = 1; }
    // the deck: alternating steel plates, with a light at each outer corner
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const [tx, ty] = cell(i, j);
      for (let y = -B; y < B; y++) { const w = Math.round((B - Math.abs(y + .5)) * A / B); gs.fillStyle = (i + j) & 1 ? '#a8b5b2' : '#c7cfcc'; gs.fillRect(tx - w, Math.round(ty + y), w * 2, 1); } }
    const blink = Math.floor(t * 1.4) & 1; [L, R, Bt, [cell(0, 0)[0], cell(0, 0)[1] - B]].forEach(([x, y], k) => { gs.fillStyle = (blink + k) & 1 ? '#cf573c' : '#752438'; gs.fillRect(Math.round(x), Math.round(y) - 1, 1, 1); });
    // the fixed buildings
    ST_BLOCK.slice().sort((p, q) => (p[0] + p[1]) - (q[0] + q[1]) || p[0] - q[0]).forEach(([i, j, kind, h, style]) => {
      const [x, y] = cell(i, j);
      if (kind === 'pad') { // landing pad with a shuttle that comes and goes
        gs.fillStyle = '#394a50'; for (let yy = -2; yy < 2; yy++) { const w = Math.round((2 - Math.abs(yy + .5)) * 2); gs.fillRect(x - w, y + yy, w * 2, 1); }
        gs.fillStyle = '#e8c170'; gs.fillRect(x - 1, y - 1, 1, 2); gs.fillRect(x + 1, y - 1, 1, 2); gs.fillRect(x, y, 1, 1);
        const u = still ? 0 : (t * .12) % 1, lift = u < .6 ? 0 : Math.round((u - .6) * 60); if (lift < 22) { gs.fillStyle = '#ebede9'; gs.fillRect(x - 2, y - 3 - lift, 4, 2); gs.fillStyle = '#4f8fba'; gs.fillRect(x - 1, y - 3 - lift, 1, 1); if (lift) { gs.fillStyle = '#e8c170'; gs.fillRect(x - 1, y - 1 - lift, 2, 1); } }
        return;
      }
      if (kind === 'tower') { // the control spire: tall mast, a glass ring and a rotating beacon
        isoBox(x, y + 1, 3, 1.5, 22, ST_C.hull, 1, t);
        gs.fillStyle = '#73bed3'; gs.fillRect(x - 4, y - 20, 9, 2); gs.fillStyle = '#ebede9'; gs.fillRect(x - 3, y - 20, 1, 1); gs.fillRect(x + 2, y - 20, 1, 1);
        gs.fillStyle = '#c7cfcc'; gs.fillRect(x, y - 30, 1, 8); gs.fillRect(x - 2, y - 27, 5, 1);
        gs.fillStyle = blink ? '#ebede9' : '#e8c170'; gs.fillRect(x, y - 31, 1, 1);
        if (!still) { const k = Math.cos(t * 2.2); gs.globalAlpha = .55; gs.fillStyle = '#ebede9'; for (let q = 1; q < 7; q++) gs.fillRect(Math.round(x + k * q * 2), y - 31, 1, 1); gs.globalAlpha = 1; }
        return;
      }
      isoBox(x, y + 1, 5, 2.5, h, ST_C[kind], style, t);
      if (kind === 'dome') { gs.fillStyle = '#a4dddb'; gs.fillRect(x - 3, y - h - 3, 6, 2); gs.fillRect(x - 2, y - h - 4, 4, 1); gs.fillStyle = '#ebede9'; gs.fillRect(x - 2, y - h - 3, 1, 1); }
      if (kind === 'shop') { gs.fillStyle = (Math.floor(t * 2) + i) % 3 ? '#df84a5' : '#ebede9'; gs.fillRect(x - 3, y - h + 3, 3, 1); } // a neon sign
    });
    // the docking arm off the right edge, where your ship ties up
    const [dx, dy] = [R[0] + 1, R[1] + 1]; gs.fillStyle = '#577277'; gs.fillRect(dx, dy, 4, 1); gs.fillRect(dx, dy, 8, 1); gs.fillRect(dx + 7, dy, 1, 5); stationDock = { x: dx, y: dy };
  }
  // what's going on around the world: outlaw ships, a Trade Station, a distress beacon
  function drawStatus(now, cx, cy, rad) {
    const pl = info.planet, t = now / 1000, still = reduceMotion.matches;
    if (pl && pl.outlaw && !pl.outlaw.cleared) for (let k = 0; k < 3; k++) { const a = (still ? 0 : t * .55) + k * 2.1, x = cx + Math.cos(a) * rad * 1.12, y = cy + Math.sin(a) * rad * .28;
      if (Math.sin(a) < 0 && Math.hypot(x - cx, y - cy) < rad) continue; const dir = -Math.sin(a) >= 0 ? 1 : -1;
      gs.fillStyle = '#a53030'; gs.fillRect(Math.round(x) - 3, Math.round(y), 6, 2); gs.fillStyle = '#cf573c'; gs.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 1); gs.fillStyle = '#d0da91'; gs.fillRect(Math.round(x) + (dir > 0 ? 3 : -4), Math.round(y), 1, 1); gs.fillStyle = '#402751'; gs.fillRect(Math.round(x) - 3, Math.round(y) + 2, 6, 1); }
    if (info.trader != null && pl && pl.num === info.trader) { const x = Math.round(cx + rad * 1.02), y = Math.round(cy - rad * .7 + (still ? 0 : Math.sin(t * .9) * 1.2));
      gs.fillStyle = '#402751'; gs.fillRect(x - 6, y - 2, 12, 5); gs.fillStyle = '#819796'; gs.fillRect(x - 5, y - 3, 10, 2); gs.fillRect(x - 1, y - 6, 2, 3);
      gs.fillStyle = '#7a367b'; gs.fillRect(x - 8, y, 2, 2); gs.fillRect(x + 6, y, 2, 2);
      for (let i = 0; i < 4; i++) { gs.fillStyle = (Math.floor(t * 2) + i) % 3 ? '#d0da91' : '#e8c170'; gs.fillRect(x - 4 + i * 3, y, 1, 1); }
      gs.fillStyle = (Math.floor(t * 1.5) & 1) ? '#a8ca58' : '#75a743'; gs.fillRect(x, y - 7, 1, 1); }
    if (info.station != null && pl && pl.num === info.station) drawStation(now, cx, cy, rad);
    if (info.kind === 'distress' && info.running) { const x = Math.round(cx + rad * .85), y = Math.round(cy - rad * .85), on = Math.floor(t * 2) & 1;
      gs.fillStyle = on ? '#cf573c' : '#752438'; gs.fillRect(x - 1, y - 1, 3, 3); gs.fillStyle = '#ebede9'; if (on) gs.fillRect(x, y, 1, 1);
      if (!still) { const k = (t * .7) % 1, rr = 3 + k * 16; gs.fillStyle = '#cf573c'; gs.globalAlpha = 1 - k; for (let q = 0; q < 24; q++) { const a = q / 24 * Math.PI * 2; gs.fillRect(Math.round(x + Math.cos(a) * rr), Math.round(y + Math.sin(a) * rr * .8), 1, 1); } gs.globalAlpha = 1; } }
  }
  let stationDock = null; // where your ship docks at the Interplanetary Station this frame
  function drawShipSprite(now) { // the scene overlay: your Post's island, the station and other things around the world
    gs.clearRect(0, 0, sv.width, sv.height);
    if (!info) return;
    const r = info.spot && info.spot.getBoundingClientRect(); if (!r || !r.width) return;
    const G = geom(r, false, true), cx = G.cx, cy = G.cy, rad = G.rad;
    const t = now / 1000, still = reduceMotion.matches, half = r.width / PX / 2;
    stationDock = null;
    drawExtras(now, cx, cy, rad, r);
    drawIsland(now, cx, cy, rad, r);
    drawStatus(now, cx, cy, rad);
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
      if (i.kind === 'view' && i.planet && (!info.planet || i.planet.seed !== info.planet.seed)) { revealAt = performance.now(); typeName(); } // Planetarium: each world fades in
    }
    info = i; if (changed) { lastDraw = 0; amb.set(i.kind, i.running); }
    music.set(i.running ? (i.mode === 'focus' ? 'study' : 'break') : null);
    kick();
  }

  /* ---------- start the game ---------- */
  const optJson = f => fetch(f, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null); // optional files; bad JSON falls back to the defaults
  optJson('music.json').then(j => music.lists(j));
  Promise.all([optJson('economy.json'), optJson('items.json')]).then(([econ, items]) => {
    root.replaceChildren();
    return window.Solarist.mount(root, { // a promise: if a game file fails, the catch below shows the error message
      tada: () => play('granted'),
      ding: () => play('notify'),
      show: () => setTimeout(() => { const h = root.querySelector('.sl-hint'); notify(h && h.textContent ? h.textContent : 'Session finished.'); }, 0),
      title: t => { document.title = t; },
      scene,
      tick: typeTick,
      settings: appSettings,
    }, econ, items);
  }).catch(e => { console.error('Solarist failed to start:', e); root.innerHTML = '<p class="boot">Solarist couldn\'t start. Reload the page to try again.</p>'; });
})();
