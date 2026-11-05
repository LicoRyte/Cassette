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
  const SFX = { granted: ['sfx/granted.wav', .5], notify: ['sfx/messagebox.wav', .4] };
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
      else if (kind === 'build') { clank(); next = now + 1800 + Math.random() * 2200; }
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
    box.replaceChildren(mk('div', { class: 'sx-row' }, snd, inst || ''), ambBox, mk('p', { class: 'sl-muted' }, installEv ? 'Installing gives Solarist its own window and icon. It works offline either way.' : 'Solarist works offline once it has loaded. To install it, use your browser menu (Install app, or Add to Home Screen on a phone).'));
  }

  /* ---------- the viewport ---------- */
  const PX = 3; // one art pixel = 3 screen pixels
  const PAL = ['#000000', '#5ba675', '#6bc96c', '#abdd64', '#fcef8d', '#ffb879', '#ea6262', '#cc425e', '#a32858', '#751756', '#390947', '#611851', '#873555', '#a6555f', '#c97373', '#f2ae99', '#ffc3f2',
    '#ee8fcb', '#d46eb3', '#873e84', '#1f102a', '#4a3052', '#7b5480', '#a6859f', '#d9bdc8', '#ffffff', '#aee2ff', '#8db7ff', '#6d80fa', '#8465ec', '#834dc4', '#7d2da0', '#4e187c'];
  const rgb = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  const KINDS = { explore: 0, campaign: 0, discover: 1, build: 2, charge: 3, fight: 4, distress: 5, break: 6 };
  const cv = mk('canvas', { class: 'sx-view', 'aria-hidden': 'true' });
  document.body.prepend(cv);
  const gl = cv.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });

  const VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }';
  const FS = `precision highp float;
uniform vec2 res, ctr; uniform float R, t, tt, spin, pct, kind, run, coord;
uniform float hasP, seed, fClouds, fBands, fLava, fLocked, fSpark, fRings, fLand, tilt, sil;
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
  // stars: two layers, streaming past while you travel
  // space stays pure black
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
      if (kind == 2. && run > .5){ vec3 cell = floor(q * 7.); if (h3(cell + seed) > .965 && mod(floor(tt * 2.5 + h3(cell) * 9.), 3.) > 0. && lit > .05) col = pal[4]; }
      if (kind == 1.){ // radar sweep: a green band moving down, then back up, with a fading trail
        float ph = mod(tt * .3, 2.), y = ph < 1. ? 1. - ph : ph - 1., dir = ph < 1. ? -1. : 1.;
        float yy = (uv.y + 1.) * .5, dy = (yy - y) * -dir;
        float band = exp(-abs(yy - y) * 70.), trail = dy > 0. ? exp(-dy * 9.) * .5 : 0.;
        col = mix(col, vec3(.42, .79, .42), clamp(band * .95 + trail, 0., 1.)); }
    }
    dith = true;
    if (ringHit > .5 && ringZ > n.z * .2 && tu.y < 0.) { col = ringC * (.35 + .65 * clamp(.5 - tu.x * .3, 0., 1.)); }
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
      ['res', 'ctr', 'R', 't', 'tt', 'spin', 'pct', 'kind', 'run', 'coord', 'hasP', 'seed', 'fClouds', 'fBands', 'fLava', 'fLocked', 'fSpark', 'fRings', 'fLand', 'tilt', 'sil', 'pal', 'pc', 'lc', 'ringC'].forEach(k => { U[k] = gl.getUniformLocation(prog, k); });
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
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      } else if (g2) {
        g2.fillStyle = '#000'; g2.fillRect(0, 0, cv.width, cv.height); g2.imageSmoothingEnabled = false;
        const p = info.planet; if (p) { let im = fallbackImg.get(p.seed); if (!im) { im = new Image(); im.onload = kick; im.src = window.Solarist.paint(p, 64); fallbackImg.set(p.seed, im); }
          if (im.complete) { const s = Math.round(rad * 2.3); g2.drawImage(im, Math.round(cx - s / 2), Math.round(cv.height - cy - s / 2), s, s); } }
      }
    }
    if (now - lastShip >= 1000 / 15 - 2) { lastShip = now; drawShipSprite(now); }
    if (!document.hidden) raf = requestAnimationFrame(render);
  }
  let lastShip = 0;
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
    gs.imageSmoothingEnabled = false; gs.drawImage(img, x, y);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(render); }
  document.addEventListener('visibilitychange', () => { lastNow = 0; if (!document.hidden) kick(); });
  function scene(i) {
    const changed = !info || i.kind !== info.kind || i.running !== info.running || (i.planet && i.planet.seed) !== (info.planet && info.planet.seed);
    info = i; if (changed) { lastDraw = 0; amb.set(i.kind, i.running); }
    kick();
  }

  /* ---------- start the game ---------- */
  const optJson = f => fetch(f, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null); // optional files; bad JSON falls back to the defaults
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
