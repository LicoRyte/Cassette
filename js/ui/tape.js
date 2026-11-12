/* Solarist: the tape deck. Under the digits, one strip for the whole cycle: a long segment for each study session and
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
