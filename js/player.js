/* Cassette Timer: the player. The deck is one portable cassette player: a dark glass window with the cassette inside
   (its shell and two big reels, turning, dimmed behind the glass) and the time over it in big digits, with the session
   strip along the bottom. Above the window, printed on the body: the side on the left, the session on the right. Under the window, a row of five piano keys:
   Play/Pause, Rew (hold it: the time winds back), Prev (the track before), F.F (the next track) and Reset (this part
   from the start, at once). */
'use strict';

corner.classList.add('sx-player');

/* ---------- the window ---------- */
const plCas = el('div', { class: 'sx-pl-cas', 'aria-hidden': 'true' }, el('i', { class: 'sx-pl-lab' }), el('i', { class: 'sx-pl-slot' }));
const plTop = el('div', { class: 'sx-pl-top' }, sideTag, corner.querySelector('.sl-big'));
const plWin = el('div', { class: 'sx-pl-win' }, plCas, reelL, reelR, digits, deck);
corner.querySelector('.sx-cmd').before(plTop, plWin);
reelL.classList.add('sx-pl-reel', 'l'); reelR.classList.add('sx-pl-reel', 'r');
requestAnimationFrame(fitDigits);

/* ---------- the keys ---------- */
TAPE_ICONS.reset = 'M12 4.5a7.5 7.5 0 1 1-7.1 5.1l2.2.7A5.2 5.2 0 1 0 12 6.8V10L6.8 5.65 12 1.3z';
TAPE_ICONS.prev = 'M21 6v12l-8-6zM13 6v12l-8-6zM2.5 6h2v12h-2z';
// Play/Pause: one key. It says Play while stopped and Pause while it plays (the icon follows), and stays down while it plays
Object.defineProperty(startB, 'textContent', { configurable: true, get: () => tapePlayLbl.textContent,
  set: v => { const act = v === 'Pause' ? 'pause' : 'play'; startB.dataset.act = act; const w = act === 'pause' ? 'Pause' : 'Play'; if (tapePlayLbl.textContent !== w) tapePlayLbl.textContent = w; } });
startB.textContent = running ? 'Pause' : 'Start'; startB.title = 'Play or pause (Space)';
// Prev: the track before, on the side that's playing (Shift+N)
function musicPrev() {
  const s = sideNow(), n = M[s].length; if (!n) { deskToast('Nothing on ' + SIDE_NAME[s] + ' yet: add music in Tapes'); return; }
  if (!player.paused && player._side === s) { M.pos[s] = ((M.pos[s] || 0) - 2 + 2 * n) % n; player._xf = true; nextTrack(700); } // (it steps on by one from here: the track before fades in)
  else { M.pos[s] = ((M.pos[s] || 0) - 1 + n) % n; save(); musicDraw(); } // (not playing: the one before is lined up)
  const tr = M[s][(M.pos[s] || 0) % n]; if (tr) deskToast('◂ ' + tr.name);
}
const prevB = el('button', { type: 'button', class: 'btn', title: 'Previous track (Shift+N)', onclick: () => { tapeKeySound(resetB); plPress(prevB); musicPrev(); } }, 'Prev');
resetB.after(prevB); tapeKey(prevB, ['prev'], 'Shift N');
addEventListener('keydown', e => {
  const t = e.target; if (e.code !== 'KeyN' || !e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || e.repeat || (t && (t.isContentEditable || t.closest && t.closest('input, select, textarea'))) || page && !page.hidden) return;
  e.preventDefault(); e.stopPropagation(); prevB.click();
}, true);
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
function plPress(b) { if (stillUI()) return; animAgain(b, 'press'); setTimeout(() => b.classList.remove('press'), 180); }

/* ---------- the keys don't keep the focus: a click leaves no box around the key, and Space is always Play/Pause ---------- */
const plCmd = corner.querySelector('.sx-cmd');
plCmd.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); }); // (a click doesn't focus the key; holding Rew still works)
addEventListener('keydown', e => {
  if (e.key !== ' ' || !e.target.closest || !e.target.closest('.sx-player .sx-cmd')) return; // (a key reached with Tab: Space still plays or pauses)
  e.preventDefault(); e.stopPropagation(); if (!e.repeat) startB.click();
}, true);
addEventListener('keyup', e => { if (e.key === ' ' && e.target.closest && e.target.closest('.sx-player .sx-cmd')) e.preventDefault(); }, true);

/* ---------- the tape moves from reel to reel through each part: the left one full when a part starts, the right one full
   at its end (then the tape turns over for the next part). Wider than the old deck's, so you can see it go ---------- */
reelPacks = function () {
  const l = 4.5 + 11 * Math.sqrt(1 - reelProg), r = 4.5 + 11 * Math.sqrt(reelProg); // (the square root keeps the tape's area even)
  reelL.querySelector('.rl-pack').setAttribute('r', l.toFixed(2)); reelR.querySelector('.rl-pack').setAttribute('r', r.toFixed(2));
};
{ const draw0 = drawCycle; drawCycle = function (pct) { draw0(pct); reelProg = Math.max(0, Math.min(1, (pct || 0) / 100)); reelPacks(); }; }
drawClock();

/* ---------- the cassette's label: the side's big letter, and the track playing in handwriting (or what the side is for) ---------- */
const plLabSide = el('b', {}), plLabTrack = el('span', {});
plCas.append(el('div', { class: 'sx-pl-lt' }, plLabSide, plLabTrack));
function plLabDraw() {
  const s = root.dataset.side || (mode === 'focus' ? 'A' : 'B'), np = sideTagNp.textContent.trim();
  plLabSide.textContent = s; plLabTrack.textContent = np || (s === 'A' ? 'focus' : 'breaks');
}
new MutationObserver(plLabDraw).observe(sideTag, { childList: true, characterData: true, subtree: true });
new MutationObserver(plLabDraw).observe(root, { attributes: true, attributeFilter: ['data-side'] });
plLabDraw();

/* ---------- a little light beside the side: on in the key colour while it plays, blinking while paused, green on breaks ---------- */
plTop.prepend(el('i', { class: 'sx-pl-led', 'aria-hidden': 'true' }));
