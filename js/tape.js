/* Cassette Timer: the tape deck. Under the digits, one strip for the whole cycle: a long segment for each study session and
   a short one for each break (a little longer for the long break), filling as you go. The buttons are hollow keys like
   a cassette deck's: Play/Pause and Rewind, with the key to press written underneath. While a session runs, Play stays
   latched down, as on a real deck. Pressing either one plays the cassette sound (sfx/cassette-play.mp3). */
'use strict';

/* ---------- the strip ---------- */
let tapeCur = -1;
drawCycle = function (pct) {
  const n = S.set.every, segs = 2 * n;
  if (cycleBar.children.length !== segs || !cycleBar.classList.contains('sx-tape-strip')) {
    cycleBar.classList.add('sx-tape-strip');
    cycleBar.replaceChildren(...Array.from({ length: segs }, (_, i) => el('span', { class: 'sg ' + (i % 2 ? (i === segs - 1 ? 'lb' : 'sb') : 'fs') })));
  }
  const cur = mode === 'focus' ? 2 * (S.cycle % n) : 2 * (S.cycle % n || n) - 1; // the part you're in: a session (even) or the break after it (odd)
  [...cycleBar.children].forEach((s, i) => { s.classList.toggle('done', i < cur); s.classList.toggle('now', i === cur); s.style.setProperty('--p', (i === cur ? pct : 0) + '%'); });
  if (tapeCur >= 0 && cur === tapeCur + 1 && !stillUI()) { const s = cycleBar.children[cur - 1]; s.classList.remove('flash'); void s.offsetWidth; s.classList.add('flash'); } // the one just finished lights up
  tapeCur = cur;
  cycleBar.classList.toggle('broken', !!S.fc.broken);
};

/* ---------- the keys ---------- */
const TAPE_ICONS = { play: 'M8 5.5v13l11-6.5z', pause: 'M6.5 5h4v14h-4zM13.5 5h4v14h-4z', rew: 'M11.5 6v12L3.5 12zM20.5 6v12l-8-6z', next: 'M3 6v12l8-6zM11 6v12l8-6zM19.5 6h2v12h-2z' };
function tapeKey(btn, icons, hint) {
  const box = el('span', { class: 'sx-tk', 'aria-hidden': 'true' });
  box.innerHTML = '<svg viewBox="0 0 24 24">' + icons.map(k => '<path class="ic-' + k + '" d="' + TAPE_ICONS[k] + '"/>').join('') + '</svg>'; // (fixed icons, written here)
  const lbl = el('span', { class: 'sx-tl' }, btn.textContent);
  btn.replaceChildren(box, el('span', { class: 'sx-tlw' }, lbl, el('small', { class: 'sx-th', 'aria-hidden': 'true' }, hint))); // the word, with the key to press under it
  btn.classList.remove('sl-go'); btn.classList.add('sx-tape');
  return lbl;
}
const tapePlayLbl = tapeKey(startB, ['play', 'pause'], 'Space');
tapeKey(resetB, ['rew'], 'R');
// Next: the next track on the side that's playing (N)
const nextB = el('button', { type: 'button', class: 'btn', title: 'Next track (N)', onclick: () => { tapeKeySound(resetB); musicNext(); } }, 'Next');
resetB.after(nextB); tapeKey(nextB, ['next'], 'N');
startB.classList.add('go');
// the timer writes the button's words (Start, Pause, Resume...); they go to the label, and the icon follows
Object.defineProperty(startB, 'textContent', {
  configurable: true,
  get: () => tapePlayLbl.textContent,
  set: v => { v = /^(Pause|Resume|Start break|Start)$/.test(v) ? v : 'Start'; if (tapePlayLbl.textContent !== v) tapePlayLbl.textContent = v; startB.dataset.act = v === 'Pause' ? 'pause' : 'play'; },
});
startB.textContent = tapePlayLbl.textContent;

/* ---------- the sound, and the key going down ---------- */
let tapeBuf = null, tapeLoading = false;
function tapeLoad() {
  if (tapeBuf || tapeLoading) return; const c = feelCtx(); if (!c) return; tapeLoading = true;
  fetch('sfx/cassette-play.mp3').then(r => r.arrayBuffer()).then(b => c.decodeAudioData(b)).then(x => { tapeBuf = x; }).catch(() => {}).finally(() => { tapeLoading = false; });
}
addEventListener('pointerdown', tapeLoad, { once: true }); addEventListener('keydown', tapeLoad, { once: true });
function tapeSound() {
  if (!feelSoundOn()) return; const c = feelCtx(); if (!c || !tapeBuf) { tapeLoad(); return; }
  const s = c.createBufferSource(), g = c.createGain(); s.buffer = tapeBuf; s.playbackRate.value = 1 + (Math.random() - .5) * .04; g.gain.value = .7; s.connect(g).connect(soundOut(c, 'keys')); s.start();
}
[startB, resetB, nextB].forEach(b => b.addEventListener('click', () => {
  if (b.disabled) return; if (b !== nextB) tapeKeySound(b);
  if (!stillUI()) { b.classList.remove('press'); void b.offsetWidth; b.classList.add('press'); setTimeout(() => b.classList.remove('press'), 180); } // (Space presses it too)
}));

/* ---------- the reels: either side of the strip, turning while the tape runs ---------- */
// the left one holds what's left of the cycle, the right one what's done; they ease to a stop on pause and spin back on Rewind
const reelSvg = () => { const s = el('span', { class: 'sx-reel', 'aria-hidden': 'true' });
  s.innerHTML = '<svg viewBox="-18 -18 36 36"><circle class="rl-rim" r="16.5"/><circle class="rl-pack" r="10"/><g class="rl-hub"><circle r="4.2"/><path d="M0-4.2V-8M3.64 2.1L6.93 4M-3.64 2.1L-6.93 4"/></g></svg>'; return s; }; // (fixed drawing, written here)
const reelL = reelSvg(), reelR = reelSvg();
const deck = el('div', { class: 'sx-deck' }); cycleBar.replaceWith(deck); deck.append(reelL, cycleBar, reelR);
let reelA = 0, reelV = 0, reelRaf = 0, reelProg = 0;
function reelPacks() { // how much tape sits on each reel
  const l = 6 + 9 * Math.sqrt(1 - reelProg), r = 6 + 9 * Math.sqrt(reelProg);
  reelL.querySelector('.rl-pack').setAttribute('r', l.toFixed(2)); reelR.querySelector('.rl-pack').setAttribute('r', r.toFixed(2));
}
function reelStep() {
  reelRaf = 0;
  const target = running ? 1.6 : 0; reelV += (target - reelV) * (reelV < 0 ? .045 : .06); // degrees a frame: up to speed, or easing down
  if (Math.abs(reelV) < .01 && !running) { reelV = 0; return; }
  reelA = (reelA + reelV) % 360;
  reelL.querySelector('.rl-hub').setAttribute('transform', 'rotate(' + (-reelA).toFixed(1) + ')'); reelR.querySelector('.rl-hub').setAttribute('transform', 'rotate(' + (-reelA * 1.3).toFixed(1) + ')'); // (shown mirrored: playing turns them counter-clockwise, the way the tape runs off the bottom)
  reelRaf = requestAnimationFrame(reelStep);
}
const reelGo = () => { if (!stillUI() && !reelRaf) reelRaf = requestAnimationFrame(reelStep); };
resetB.addEventListener('click', () => { if (!resetB.disabled && !stillUI()) { reelV = -14; reelGo(); } }); // Rewind: a quick spin back
const drawCycleTape = drawCycle;
drawCycle = function (pct) {
  drawCycleTape(pct);
  const segs = cycleBar.children.length, weights = [...cycleBar.children].map(s => s.classList.contains('fs') ? 3 : s.classList.contains('lb') ? 1.8 : 1), total = weights.reduce((a, b) => a + b, 0);
  const cur = [...cycleBar.children].findIndex(s => s.classList.contains('now')), done = weights.slice(0, Math.max(0, cur)).reduce((a, b) => a + b, 0) + (cur >= 0 ? weights[cur] * pct / 100 : 0);
  reelProg = segs ? Math.min(1, done / total) : 0; reelPacks();
  if (running) reelGo();
};
reelPacks();

/* ---------- the counter: today's sessions on three little wheels that roll up ---------- */
// (tally: the line under the keys, made in js/ui/clock.js)
const ctrWheels = el('span', { class: 'sx-ctr', 'aria-hidden': 'true' }), ctrLbl = el('span', { class: 'sx-ctr-l' }, 'today');
const ctrSr = el('span', { class: 'sx-sr' });
if (tally) tally.replaceChildren(ctrWheels, ctrLbl, ctrSr);
let ctrLast = null;
function tapeCounter(n) {
  if (n === ctrLast) return;
  const s = String(Math.max(0, n)).padStart(3, '0'), was = ctrLast == null ? null : String(ctrLast).padStart(3, '0'); ctrLast = n; ctrSr.textContent = n + ' sessions today';
  if (ctrWheels.children.length !== s.length) ctrWheels.replaceChildren(...[...s].map(() => el('span', { class: 'sx-cw' }, el('span', { class: 'sx-cs' }))));
  [...s].forEach((ch, i) => {
    const stack = ctrWheels.children[i].firstChild, old = was && was.length === s.length ? was[i] : null;
    if (old === ch) return;
    if (old == null || stillUI() || n < (+was)) { stack.replaceChildren(el('b', {}, ch)); stack.classList.remove('roll'); return; }
    stack.replaceChildren(el('b', {}, old), el('b', {}, ch)); stack.classList.remove('roll'); void stack.offsetWidth; stack.classList.add('roll'); // the wheel turns up one
    setTimeout(() => { if (stack.lastChild && stack.lastChild.textContent === ch) { stack.replaceChildren(el('b', {}, ch)); stack.classList.remove('roll'); } }, 700);
  });
}
tapeCounter(S.todayN || 0);

/* ---------- the side: A while you focus, B on breaks; the deck flips over when one turns into the other ---------- */
const sideTagB = el('b', {}), sideTagNp = el('span', { class: 'sx-np' }); // (what's playing: js/music.js)
const sideTag = el('div', { class: 'sx-sidetag' }, sideTagB, sideTagNp);
corner.append(sideTag);
let sideShown = null;
function sideDraw() {
  const s = mode === 'focus' ? 'A' : 'B'; if (s === sideShown) return;
  const first = sideShown == null; sideShown = s; root.dataset.side = s;
  if (first || stillUI()) { sideTagB.textContent = 'Side ' + s; return; }
  deck.classList.remove('flip'); sideTag.classList.remove('flip'); void deck.offsetWidth; deck.classList.add('flip'); sideTag.classList.add('flip');
  setTimeout(() => { sideTagB.textContent = 'Side ' + s; }, 280); // the label changes as the deck turns edge-on
  if (feelSoundOn() && tapeBuf) { const c = feelCtx(); if (c) { const src = c.createBufferSource(), g = c.createGain(); src.buffer = tapeBuf; src.playbackRate.value = .72; g.gain.value = .55; src.connect(g).connect(soundOut(c, 'keys')); src.start(); } } // a lower clunk: the tape turned over
}
new MutationObserver(sideDraw).observe(root, { attributes: true, attributeFilter: ['data-mode'] });
sideDraw();

/* ---------- the full rewind: hold Rewind (or Shift+R) to go back to the start of the tape: session 1, an empty strip ---------- */
// (today's count stays)
function fullRewind() {
  clearInterval(tickT); running = false; mode = 'focus'; left = length('focus'); S.cycle = 0; S.fc = { n: 0, broken: false };
  persistRun(); draw();
  if (!stillUI()) { reelV = -32; reelGo(); }
  if (feelSoundOn()) { const c = feelCtx(); if (c) { // the motor whirring back, then the clunk at the end of the tape
    const t0 = c.currentTime, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(140, t0); o.frequency.exponentialRampToValueAtTime(520, t0 + .55);
    f.type = 'lowpass'; f.frequency.value = 900; g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.03, t0 + .08); g.gain.exponentialRampToValueAtTime(.0001, t0 + .6);
    o.connect(f).connect(g).connect(soundOut(c, 'keys')); o.start(t0); o.stop(t0 + .62);
    if (tapeBuf) { const s = c.createBufferSource(), sg = c.createGain(); s.buffer = tapeBuf; s.playbackRate.value = .8; sg.gain.value = .6; s.connect(sg).connect(soundOut(c, 'keys')); s.start(t0 + .6); } } }
  if (typeof deskToast === 'function') deskToast('Rewound to the start: session 1 of ' + S.set.every);
}
// Rewind is held, not pressed: hold it (the key, R, or the mini deck's) and the time winds back while you hold, a few seconds
// at first, then faster and faster, minutes a second (never past the start of the part). A quick tap just reminds you to hold.
let rewT = 0, rewMotor = null, rewAt = 0, rewMoved = 0;
function rewWhirr(on, speed) { // the motor running backwards, higher as it speeds up
  if (!on) { if (rewMotor) { const m = rewMotor; rewMotor = null; m.g.gain.setTargetAtTime(0, m.c.currentTime, .05); setTimeout(() => { try { m.o.stop(); } catch (e) { /* done */ } }, 300); } return; }
  if (!feelSoundOn()) return; const c = feelCtx(); if (!c) return;
  if (!rewMotor) { const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = 0; o.connect(f).connect(g).connect(soundOut(c, 'keys')); o.start(); rewMotor = { c, o, g }; g.gain.setTargetAtTime(.018, c.currentTime, .05); }
  rewMotor.o.frequency.setTargetAtTime(Math.min(900, 160 + speed * 1.2), rewMotor.c.currentTime, .08);
}
function rewWind(ms) { // give back ms of this part (never past its start)
  const full = length(mode), now = remaining(), add = Math.min(ms, full - now); if (add <= 0) return 0;
  if (running) endAt += add; else left = now + add;
  drawClock(); return add;
}
// how fast it winds (seconds of timer per second held), in three stages: a steady 22 for the first couple of seconds
// (1 to 2 s held: about 20 to 48 s back), then 65 (3 to 4 s held: about 2 to 3 minutes back), then a long rewind that
// keeps speeding up (about 10 minutes back by 6 s held), up to 15 minutes a second. The stages blend into each other.
function rewSpeed(t) {
  const ease = (a, b, x) => { const k = Math.max(0, Math.min(1, x)); return a + (b - a) * k * k * (3 - 2 * k); };
  if (t < 1.6) return 22;
  if (t < 2.4) return ease(22, 65, (t - 1.6) / .8);
  if (t < 4) return 65;
  return Math.min(900, 65 + (t - 4) * (t - 4) * 130);
}
function rewStart() {
  if (rewT || rewAt) return; rewAt = performance.now(); rewMoved = 0; resetB.classList.add('holding'); tapeKeySound(resetB);
  rewT = setInterval(() => {
    const held = (performance.now() - rewAt) / 1000;
    const speed = rewSpeed(held);
    const got = rewWind(speed * 50); rewMoved += got; reelV = -Math.min(34, 3 + speed / 8); reelGo(); rewWhirr(true, speed);
    if (!got) { rewStopNow(); if (feelSoundOn()) { const c = feelCtx(); if (c) feelTone(c, c.currentTime, 110, { dur: .09, vol: .05, to: 70, cat: 'keys' }); } } // the start of the part: a soft stop
  }, 50);
}
function rewStopNow() { clearInterval(rewT); rewT = 0; rewWhirr(false); resetB.classList.remove('holding'); }
function rewStop() {
  if (!rewAt) return; const tap = performance.now() - rewAt < 220 && rewMoved < 2000; rewAt = 0; rewStopNow(); // (even when it had nothing to wind)
  if (rewMoved) persistRun();
  if (tap) deskToast('Hold Rewind to wind the time back (Shift+R rewinds the whole tape)');
}
resetB.addEventListener('pointerdown', e => { if (e.button === 0 && !resetB.disabled) rewStart(); });
['pointerup', 'pointerleave', 'pointercancel'].forEach(k => resetB.addEventListener(k, rewStop));
resetB.addEventListener('click', e => { e.stopImmediatePropagation(); e.preventDefault(); }, true); // (a press never starts the part over: only holding winds it back)
// R works the same: hold it to wind back (Shift+R is the whole tape)
addEventListener('keydown', e => {
  const t = e.target; if (e.code !== 'KeyR' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || (t && (t.isContentEditable || t.closest && t.closest('input, select, textarea'))) || page && !page.hidden) return;
  e.preventDefault(); e.stopPropagation(); if (!e.repeat) rewStart();
}, true);
addEventListener('keyup', e => { if (e.code === 'KeyR') rewStop(); }, true);
addEventListener('blur', rewStop);
resetB.title = 'Hold to wind the time back (R works too). Shift+R rewinds the whole tape to session 1';
const rewHint = resetB.querySelector('.sx-th'); if (rewHint) rewHint.textContent = 'Hold R';
addEventListener('keydown', e => {
  const t = e.target; if (e.code !== 'KeyR' || !e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || (t && (t.isContentEditable || t.closest && t.closest('input, select, textarea')))) return;
  e.preventDefault(); e.stopPropagation(); fullRewind();
}, true);
// and in Settings, under Switch by hand
{ const row = settingsPane.querySelector('.sl-modes'); if (row) row.after(el('div', { class: 'sx-row', style: 'margin-top:10px' }, armBtn('Rewind the whole tape', 'Back to session 1? Click again', () => { fullRewind(); tab('timer'); }), el('small', { class: 'sl-muted' }, 'Back to session 1 of the cycle, an empty strip. Today\'s count stays.'))); }

/* ---------- real tape: brown on the reels, and a ribbon of it running between them under the strip ---------- */
const tapeRibbon = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); tapeRibbon.setAttribute('class', 'sx-ribbon'); tapeRibbon.setAttribute('aria-hidden', 'true');
tapeRibbon.innerHTML = '<path class="rb-tape"/><path class="rb-shine"/><circle class="rb-guide" r="2.2"/><circle class="rb-guide" r="2.2"/>'; // (fixed drawing)
deck.prepend(tapeRibbon);
const reelPacksBase = reelPacks;
reelPacks = function () {
  reelPacksBase();
  const w = deck.clientWidth, h = deck.clientHeight; if (!w || !reelL.offsetWidth) return;
  const k = reelL.offsetWidth / 36, cy = reelL.offsetTop + reelL.offsetHeight / 2; // (the reels are drawn 36 units across)
  const lx = reelL.offsetLeft + reelL.offsetWidth / 2, rx = reelR.offsetLeft + reelR.offsetWidth / 2;
  const lr = +reelL.querySelector('.rl-pack').getAttribute('r') * k, rr = +reelR.querySelector('.rl-pack').getAttribute('r') * k;
  const gy = cy + 16 * k, gl = lx + 22 * k, gr = rx - 22 * k; // two guide rollers under the strip, like inside a cassette
  const d = 'M' + lx.toFixed(1) + ' ' + (cy + lr).toFixed(1) + ' L' + gl.toFixed(1) + ' ' + gy.toFixed(1) + ' L' + gr.toFixed(1) + ' ' + gy.toFixed(1) + ' L' + rx.toFixed(1) + ' ' + (cy + rr).toFixed(1);
  tapeRibbon.setAttribute('viewBox', '0 0 ' + w + ' ' + h); tapeRibbon.querySelectorAll('path').forEach(p => p.setAttribute('d', d));
  const [g1, g2] = tapeRibbon.querySelectorAll('.rb-guide'); g1.setAttribute('cx', gl); g1.setAttribute('cy', gy); g2.setAttribute('cx', gr); g2.setAttribute('cy', gy);
};
addEventListener('resize', () => reelPacks()); requestAnimationFrame(() => reelPacks());

/* ---------- VU meters: two needles that swing with the music (or flick with the tick when nothing plays) ---------- */
const vuMeter = side => { const s = el('span', { class: 'sx-vum', 'aria-hidden': 'true' });
  s.innerHTML = '<svg viewBox="0 0 44 28"><path class="vu-scale" d="M6 23 A17 17 0 0 1 38 23"/><path class="vu-red" d="M31.5 11.2 A17 17 0 0 1 38 23"/><path class="vu-ticks" d="M8.6 15.8l1.7 1M13.4 10.6l1.1 1.6M22 8v2M30.6 10.6l-1.1 1.6M35.4 15.8l-1.7 1"/><line class="vu-needle" x1="22" y1="25" x2="22" y2="9" transform="rotate(-52 22 25)"/><circle class="vu-pivot" cx="22" cy="25" r="2"/><text x="40" y="27">' + side + '</text></svg>'; return s; }; // (fixed drawing)
const vu = el('span', { class: 'sx-vu' }, vuMeter('L'), vuMeter('R'));
tally.prepend(vu);
const vuNeedles = [...vu.querySelectorAll('.vu-needle')];
let vuRaf = 0, vuKick = 0; const vuA = [-52, -52];
function vuStep() {
  vuRaf = 0;
  const lv = typeof vuLevel === 'function' ? vuLevel() : 0; vuKick *= .84;
  const base = running ? Math.max(lv, vuKick) : 0;
  vuA.forEach((a, i) => { const t = -52 + 104 * Math.min(1, base * (.88 + Math.random() * .24)); vuA[i] += (t - a) * (t > a ? .38 : .1); vuNeedles[i].setAttribute('transform', 'rotate(' + vuA[i].toFixed(1) + ' 22 25)'); }); // quick up, slow back, like a real needle
  if (running || vuA.some(a => a > -51.5)) vuRaf = requestAnimationFrame(vuStep);
}
const vuGo = () => { if (!vuRaf && !stillUI()) vuRaf = requestAnimationFrame(vuStep); };
new MutationObserver(() => { if (running && mode === 'focus') { vuKick = Math.max(vuKick, .32 + Math.random() * .12); vuGo(); } }).observe(timeText, { childList: true, characterData: true, subtree: true });
new MutationObserver(vuGo).observe(root, { attributes: true, attributeFilter: ['data-clock'] });
vuStep();

/* ---------- each key sounds like itself: Play latches, Pause pops back up, Rewind whirrs ---------- */
function tapeKeySound(b) {
  if (!feelSoundOn()) return; const c = feelCtx(); if (!c) return; const t = c.currentTime;
  const clip = (rate, gain, at) => { if (!tapeBuf) return; const s = c.createBufferSource(), g = c.createGain(); s.buffer = tapeBuf; s.playbackRate.value = rate; g.gain.value = gain; s.connect(g).connect(soundOut(c, 'keys')); s.start(at || t); };
  if (b === resetB) { // a little motor whirr under the key
    const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(210, t); o.frequency.exponentialRampToValueAtTime(470, t + .26);
    f.type = 'lowpass'; f.frequency.value = 820; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.022, t + .04); g.gain.exponentialRampToValueAtTime(.0001, t + .3);
    o.connect(f).connect(g).connect(soundOut(c, 'keys')); o.start(t); o.stop(t + .32); clip(.95, .4, t + .02); return;
  }
  if (running) { clip(1, .7); feelTone(c, t + .035, 88, { cat: 'keys', dur: .08, vol: .05, to: 58 }); } // Play: the key goes down and latches
  else { clip(1.3, .3); feelBurst(c, t, { cat: 'keys', dur: .03, type: 'highpass', f0: 2100, vol: .03 }); feelTone(c, t, 330, { cat: 'keys', dur: .05, vol: .02, to: 520 }); } // Pause: it pops back up
}


/* ---------- the counter clicks as its wheels roll, with a heavier thunk when a digit carries over ---------- */
const tapeCounterBase = tapeCounter;
tapeCounter = function (n) {
  const before = ctrLast; tapeCounterBase(n);
  if (before == null || n <= before || stillUI() || S.opts.deskSfx === false || !feelSoundOn()) return;
  const a = String(before).padStart(3, '0'), b = String(n).padStart(3, '0'), rolled = [...b].filter((ch, i) => ch !== a[i]).length;
  const c = feelCtx(); if (!c) return; const t = c.currentTime;
  feelBurst(c, t + .05, { cat: 'keys', dur: .012, type: 'highpass', f0: 2700, vol: .035 }); feelTone(c, t + .05, 620, { cat: 'keys', dur: .03, vol: .012, to: 420 }); // the wheel's click
  for (let i = 1; i < rolled; i++) feelTone(c, t + .05 + i * .07, 150, { cat: 'keys', dur: .08, vol: .04, to: 90 }); // the carry: the next wheel goes over too
};

/* ---------- the end of a tape: a cassette pops up in the middle of the screen and flies into the Tapes key ---------- */
function ejectTape() {
  if (stillUI()) return;
  const cx = innerWidth / 2, cy = innerHeight / 2, to = tapesB.getBoundingClientRect(); // (from the middle of the screen, wherever the deck is on the desk)
  const cas = el('div', { class: 'sx-eject', 'aria-hidden': 'true', style: 'left:' + (cx - 45) + 'px;top:' + (cy - 29) + 'px;--tx:' + Math.round(to.left + to.width / 2 - cx) + 'px;--ty:' + Math.round(to.top + to.height / 2 - cy) + 'px' });
  cas.innerHTML = '<svg viewBox="0 0 30 19"><rect x=".5" y=".5" width="29" height="18" rx="1.5" fill="#041528" style="stroke:var(--deck)"/><rect x="3" y="2.5" width="24" height="5" fill="#ffdaac"/><rect x="5" y="4" width="11" height="1" fill="#34111f"/><rect x="7" y="9.5" width="16" height="5" fill="#030710" stroke="#293b49" stroke-width=".6"/><circle cx="11" cy="12" r="1.7" fill="none" stroke="#ffffe4" stroke-width=".7"/><circle cx="19" cy="12" r="1.7" fill="none" stroke="#ffffe4" stroke-width=".7"/><path d="M8 18.5l1.5-2.5h11l1.5 2.5" fill="none" style="stroke:var(--deck)" stroke-width=".7"/></svg>'; // (a fixed drawing)
  document.body.append(cas); requestAnimationFrame(() => cas.classList.add('go'));
  if (feelSoundOn()) { const c = feelCtx(); if (c) { const t = c.currentTime; feelBurst(c, t, { cat: 'keys', dur: .03, type: 'highpass', f0: 1800, vol: .06 }); feelTone(c, t, 120, { cat: 'keys', dur: .09, vol: .05, to: 70 }); // the eject's clack
    if (tapeBuf) { const s = c.createBufferSource(), g = c.createGain(); s.buffer = tapeBuf; s.playbackRate.value = 1.15; g.gain.value = .45; s.connect(g).connect(soundOut(c, 'keys')); s.start(t + .03); }
    feelBurst(c, t + 1.55, { cat: 'keys', dur: .07, type: 'lowpass', f0: 900, vol: .05 }); } } // and it lands
  setTimeout(() => cas.remove(), 1800);
}
const finishEject = finish;
finish = function (quiet) { const was = mode; finishEject.apply(this, arguments); if (was === 'focus' && mode === 'long' && !quiet) setTimeout(ejectTape, 1100); };
const fullRewindEject = fullRewind;
fullRewind = function () { const had = S.cycle > 0 || mode !== 'focus' || remaining() < length(mode); fullRewindEject.apply(this, arguments); if (had) setTimeout(ejectTape, 650); };

/* ---------- keep going by itself: when a session ends the break starts on its own, and when a break ends the next session
   does (a few seconds later, after the chime). Settings, Flow ---------- */
const finishAuto = finish;
finish = function (quiet) {
  finishAuto.apply(this, arguments);
  if (quiet || !S.opts.autoGo) return;
  const was = mode; setTimeout(() => { if (S.opts.autoGo && !running && mode === was && left >= length(mode) - 1000) start(); }, 3500); // (unless you've started or changed it meanwhile)
};
{ const box = el('input', { type: 'checkbox', checked: S.opts.autoGo || null }); box.addEventListener('change', () => { S.opts.autoGo = box.checked; save(); });
  const row = settingsPane.querySelector('.sl-modes'); const sx = el('label', { class: 'sx-check', style: 'margin-top:10px' }, box, ' Keep going by itself: start each break, and the next session, a few seconds after the chime');
  if (row) row.parentNode.append(sx); else settingsPane.append(sec('Flow', sx)); }
