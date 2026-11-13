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
const TAPE_ICONS = { play: 'M8 5.5v13l11-6.5z', pause: 'M6.5 5h4v14h-4zM13.5 5h4v14h-4z', rew: 'M11.5 6v12L3.5 12zM20.5 6v12l-8-6z' };
function tapeKey(btn, icons, hint) {
  const box = el('span', { class: 'sx-tk', 'aria-hidden': 'true' });
  box.innerHTML = '<svg viewBox="0 0 24 24">' + icons.map(k => '<path class="ic-' + k + '" d="' + TAPE_ICONS[k] + '"/>').join('') + '</svg>'; // (fixed icons, written here)
  const lbl = el('span', { class: 'sx-tl' }, btn.textContent);
  btn.replaceChildren(box, lbl, el('small', { class: 'sx-th', 'aria-hidden': 'true' }, hint));
  btn.classList.remove('sl-go'); btn.classList.add('sx-tape');
  return lbl;
}
const tapePlayLbl = tapeKey(startB, ['play', 'pause'], 'Space');
tapeKey(resetB, ['rew'], 'R');
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
  const s = c.createBufferSource(), g = c.createGain(); s.buffer = tapeBuf; s.playbackRate.value = 1 + (Math.random() - .5) * .04; g.gain.value = .7; s.connect(g).connect(c.destination); s.start();
}
[startB, resetB].forEach(b => b.addEventListener('click', () => {
  if (b.disabled) return; tapeSound();
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
  reelL.querySelector('.rl-hub').setAttribute('transform', 'rotate(' + reelA.toFixed(1) + ')'); reelR.querySelector('.rl-hub').setAttribute('transform', 'rotate(' + (reelA * 1.3).toFixed(1) + ')');
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
  if (feelSoundOn() && tapeBuf) { const c = feelCtx(); if (c) { const src = c.createBufferSource(), g = c.createGain(); src.buffer = tapeBuf; src.playbackRate.value = .72; g.gain.value = .55; src.connect(g).connect(c.destination); src.start(); } } // a lower clunk: the tape turned over
}
new MutationObserver(sideDraw).observe(root, { attributes: true, attributeFilter: ['data-mode'] });
sideDraw();
