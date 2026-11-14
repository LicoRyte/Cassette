/* Cassette Timer: ways to look at the clock. The mini deck (M, or Pop out in the bar): a small window that stays on
   top of your other apps, with the time, the side, the reels and the keys, so the timer is there while you study in
   something else (Chrome and Edge; it uses Document Picture-in-Picture). Full-screen focus (F): only the clock, big,
   with nothing else on the screen; the mouse pointer hides while it's still. F or Esc to come back. */
'use strict';

/* ---------- the mini deck ---------- */
let miniWin = null;
const MINI_CSS = `
@font-face { font-family: 'Barlow C'; src: url(${new URL('fonts/barlow-condensed-latin-700-normal.woff2', location.href)}) format('woff2'); font-weight: 700; }
@font-face { font-family: 'Barlow C'; src: url(${new URL('fonts/barlow-condensed-latin-600-normal.woff2', location.href)}) format('woff2'); font-weight: 600; }
* { box-sizing: border-box; } html, body { margin: 0; height: 100%; background: #030710; color: #ffffe4; font-family: 'Barlow C', 'Arial Narrow', sans-serif; overflow: hidden; user-select: none; }
.mini { --deck: #ffb762; height: 100%; display: grid; grid-template-rows: auto 1fr auto auto; gap: 4px; padding: 10px 14px 12px; border: 2px solid var(--deck); border-radius: 8px; }
.mini-top { display: flex; justify-content: space-between; font: 700 11px/1.2 'Barlow C'; letter-spacing: .2em; text-transform: uppercase; color: #6d8a8d; }
.mini-top b { color: var(--deck); }
.mini-mid { display: flex; align-items: center; justify-content: center; gap: 10px; }
.mini-time { font: 700 64px/1 'Barlow C'; font-variant-numeric: tabular-nums; letter-spacing: -.01em; }
.mini-reel { width: 26px; height: 26px; color: var(--deck); }
.mini-reel svg { width: 100%; height: 100%; display: block; }
.mini.run .mini-reel svg { animation: spin 3s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.mini-bar { height: 6px; background: #041528; box-shadow: inset 0 0 0 1px #0b1a2b; } .mini-bar i { display: block; height: 100%; background: #ffffe4; }
.mini-keys { display: flex; justify-content: center; gap: 10px; margin-top: 4px; }
.mini-keys button { width: 52px; height: 34px; display: grid; place-items: center; background: none; border: 2px solid var(--deck); border-radius: 3px; color: var(--deck); cursor: pointer; box-shadow: 0 3px 0 color-mix(in srgb, var(--deck) 30%, transparent); }
.mini-keys button:active { transform: translateY(3px); box-shadow: none; }
.mini-keys svg { width: 18px; height: 18px; fill: currentColor; }
.mini[data-clock="break"] { --deck: #77d6c1; } .mini[data-clock="break"] .mini-time { color: #77d6c1; } .mini[data-clock="break"] .mini-bar i { background: #77d6c1; }
.mini[data-clock="paused"] .mini-time { color: #6d8a8d; } .mini[data-clock="paused"] { --deck: #ffd832; }
.mini[data-clock="last"] .mini-time { color: #ffdaac; }
@media (prefers-reduced-motion: reduce) { .mini.run .mini-reel svg { animation: none; } }`;
const MINI_REEL = '<svg viewBox="-18 -18 36 36"><circle r="16" fill="none" stroke="currentColor" stroke-width="2"/><circle r="9" fill="#73392e"/><circle r="4" fill="#030710" stroke="currentColor" stroke-width="1.5"/><path d="M0-4V-8M3.5 2L6.9 4M-3.5 2L-6.9 4" stroke="currentColor" stroke-width="1.6"/></svg>';
const MINI_ICON = { play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>', pause: '<svg viewBox="0 0 24 24"><path d="M6.5 5h4v14h-4zM13.5 5h4v14h-4z"/></svg>', rew: '<svg viewBox="0 0 24 24"><path d="M11.5 6v12L3.5 12zM20.5 6v12l-8-6z"/></svg>', next: '<svg viewBox="0 0 24 24"><path d="M3 6v12l8-6zM11 6v12l8-6zM19.5 6h2v12h-2z"/></svg>' };
function miniDraw() {
  if (!miniWin) return; const d = miniWin.document, m = d.querySelector('.mini'); if (!m) return;
  const r = remaining(), pct = Math.min(100, Math.max(0, 100 - r / length(mode) * 100)), skin = { amber: '#ffb762', mint: '#77d6c1', coral: '#ff6157', clear: '#ffffe4' }[S.opts.skin || 'amber'];
  m.dataset.clock = root.dataset.clock || 'ready'; m.classList.toggle('run', running); m.style.setProperty('--deck', skin);
  d.querySelector('.mini-time').textContent = fmt(r);
  d.querySelector('.mini-top b').textContent = 'Side ' + (mode === 'focus' ? 'A' : 'B');
  d.querySelector('.mini-top span').textContent = bigText.textContent;
  d.querySelector('.mini-bar i').style.width = pct + '%';
  d.querySelector('[data-k="go"]').innerHTML = running ? MINI_ICON.pause : MINI_ICON.play; // (fixed icons)
  d.title = document.title;
}
async function miniOpen() {
  if (miniWin) { miniWin.close(); return; }
  if (!('documentPictureInPicture' in window)) { deskToast('Your browser has no floating window. Chrome and Edge do'); return; }
  try { miniWin = await documentPictureInPicture.requestWindow({ width: 300, height: 190 }); } catch (e) { deskToast('Could not open the mini deck'); return; }
  const d = miniWin.document;
  d.head.append(Object.assign(d.createElement('style'), { textContent: MINI_CSS }));
  d.body.innerHTML = '<div class="mini"><div class="mini-top"><b></b><span></span></div><div class="mini-mid"><span class="mini-reel">' + MINI_REEL + '</span><div class="mini-time"></div><span class="mini-reel">' + MINI_REEL + '</span></div><div class="mini-bar"><i></i></div><div class="mini-keys"><button type="button" data-k="go" aria-label="Start or pause"></button><button type="button" data-k="rew" aria-label="Rewind">' + MINI_ICON.rew + '</button><button type="button" data-k="next" aria-label="Next track" title="Next track (N)">' + MINI_ICON.next + '</button></div></div>'; // (fixed markup)
  d.querySelector('[data-k="go"]').addEventListener('click', () => startB.click());
  d.querySelector('[data-k="next"]').addEventListener('click', () => nextB.click());
  const mr = d.querySelector('[data-k="rew"]'); mr.addEventListener('pointerdown', () => rewStart()); ['pointerup', 'pointerleave', 'pointercancel'].forEach(k => mr.addEventListener(k, rewStop)); // (held, like the big one)
  d.addEventListener('keydown', e => { if (e.key === ' ') { e.preventDefault(); startB.click(); } else if ((e.key === 'r' || e.key === 'R') && !e.repeat) rewStart(); else if ((e.key === 'n' || e.key === 'N') && !e.repeat) nextB.click(); });
  d.addEventListener('keyup', e => { if (e.key === 'r' || e.key === 'R') rewStop(); });
  miniWin.addEventListener('pagehide', () => { miniWin = null; miniB.classList.remove('on'); });
  miniB.classList.add('on'); miniDraw(); deskSfx('pick');
}
new MutationObserver(miniDraw).observe(timeText, { childList: true, characterData: true, subtree: true });
new MutationObserver(miniDraw).observe(root, { attributes: true, attributeFilter: ['data-clock', 'data-mode'] });
const miniB = deskBtn('Mini', () => miniOpen(), '', 'A small clock that stays on top of your other windows (M)');
tapesB.after(miniB);

/* ---------- full-screen focus: only the clock ---------- */
let fullOn = false, fullT = 0;
function fullSet(on) {
  if (on === fullOn) return; fullOn = on;
  root.classList.toggle('sx-full', on); document.body.classList.toggle('sx-full-b', on);
  if (on) {
    select(null); if (!tapesDrawer.hidden) tapesOpen(null);
    const v = view(); glideTo(0, 0, Math.max(.35, Math.min(2.2, v.w * .82 / corner.offsetWidth, v.h * .78 / corner.offsetHeight)));
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    fullIdle();
  } else {
    clearTimeout(fullT); document.body.classList.remove('sx-hidecur'); glideHome();
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  }
}
function fullIdle() { document.body.classList.remove('sx-hidecur'); clearTimeout(fullT); if (fullOn) fullT = setTimeout(() => document.body.classList.add('sx-hidecur'), 2000); } // the pointer hides while it's still
addEventListener('pointermove', () => { if (fullOn) fullIdle(); }, { passive: true });
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && fullOn) fullSet(false); }); // (Esc left the browser's full screen)
const fullB = deskBtn('Full', () => fullSet(!fullOn), '', 'Only the clock, full screen (F)');
miniB.after(fullB);

addEventListener('keydown', e => {
  const t = e.target; if (e.ctrlKey || e.metaKey || e.altKey || (t && (t.isContentEditable || t.closest && t.closest('input, select, textarea'))) || page && !page.hidden) return;
  if (e.code === 'KeyF') { e.preventDefault(); e.stopPropagation(); fullSet(!fullOn); }
  else if (e.code === 'KeyM') { e.preventDefault(); e.stopPropagation(); miniOpen(); }
  else if (e.key === 'Escape' && fullOn) { e.preventDefault(); e.stopPropagation(); fullSet(false); }
}, true);
