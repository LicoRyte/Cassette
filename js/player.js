/* Cassette Timer: the player. The deck is one portable cassette player: a dark glass window with the cassette inside
   (its shell and two big reels, turning, dimmed behind the glass) and the time over it in big digits, the side and the
   session along the top of the glass and the session strip along the bottom. Under the window, a row of five piano keys:
   Play, Pause, Rew (hold it: the time winds back), F.F (the next track) and Reset (this part from the start, at once). */
'use strict';

corner.classList.add('sx-player');

/* ---------- the window ---------- */
const plCas = el('div', { class: 'sx-pl-cas', 'aria-hidden': 'true' }, el('i', { class: 'sx-pl-lab' }), el('i', { class: 'sx-pl-slot' }));
const plTop = el('div', { class: 'sx-pl-top' }, sideTag, corner.querySelector('.sl-big'));
const plWin = el('div', { class: 'sx-pl-win' }, plCas, reelL, reelR, plTop, digits, deck);
corner.querySelector('.sx-cmd').before(plWin);
reelL.classList.add('sx-pl-reel', 'l'); reelR.classList.add('sx-pl-reel', 'r');
requestAnimationFrame(fitDigits);

/* ---------- the keys: Play and Pause apart, as on a real deck ---------- */
TAPE_ICONS.reset = 'M12 4.5a7.5 7.5 0 1 1-7.1 5.1l2.2.7A5.2 5.2 0 1 0 12 6.8V10L6.8 5.65 12 1.3z';
// Play only plays: the timer's own words (Start, Resume, Pause...) no longer change it
Object.defineProperty(startB, 'textContent', { configurable: true, get: () => tapePlayLbl.textContent, set: () => { startB.dataset.act = 'play'; } });
tapePlayLbl.textContent = 'Play'; startB.dataset.act = 'play'; startB.title = 'Play (Space)';
startB.addEventListener('click', e => { if (running && e.isTrusted) { e.stopImmediatePropagation(); e.preventDefault(); } }, true); // (pressing Play while it plays does nothing; Space still pauses)
// Pause: holds the tape; press it again (or Play) to go on
const pauseB = el('button', { type: 'button', class: 'btn sx-pause-k', title: 'Pause (Space)', onclick: () => {
  const paused = !running && left > 0 && left < length(mode);
  if (running) pause(); else if (paused) start(); else return;
  tapeKeySound(pauseB); plPress(pauseB);
} }, 'Pause');
startB.after(pauseB); tapeKey(pauseB, ['pause'], 'Space'); pauseB.dataset.act = 'pause';
// Rew and F.F: the keys that were there, under their deck names
resetB.querySelector('.sx-tl').textContent = 'Rew';
nextB.querySelector('.sx-tl').textContent = 'F.F'; nextB.title = 'Fast forward: the next track (N)';
// Reset: this part from the start, at once (no winding)
const plResetB = el('button', { type: 'button', class: 'btn sx-reset-k', title: 'Reset: this part from the start', onclick: () => {
  if (!running && left >= length(mode)) { deskToast('Already at the start of this part'); return; }
  reset(); tapeKeySound(plResetB); plPress(plResetB);
  if (feelSoundOn()) { const c = feelCtx(); if (c) feelTone(c, c.currentTime + .03, 96, { cat: 'keys', dur: .1, vol: .05, to: 60 }); } // the stop's clunk
} }, 'Reset');
nextB.after(plResetB); tapeKey(plResetB, ['reset'], 'This part');
function plPress(b) { if (stillUI()) return; b.classList.remove('press'); void b.offsetWidth; b.classList.add('press'); setTimeout(() => b.classList.remove('press'), 180); }
