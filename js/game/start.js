/* Solarist: Start-up: resume a timer that was running when the page closed, then draw. */
'use strict';

/* ---------- resume a timer that was running when the page closed ---------- */
if (S.run && S.run.running) {
  if (S.run.endAt > Date.now()) { running = true; endAt = S.run.endAt; loop(); }
  else { const was = S.run.mode; mode = was; finish(true); hint.textContent = was === 'focus' ? 'Your session finished while you were away.' : 'Your break finished while you were away. Equipment ready.'; }
}
if (S.found.length && card.hidden) showCard(S.found[S.found.length - 1].p, 'last');
draw();
document.addEventListener('visibilitychange', () => { if (!document.hidden && running && remaining() <= 0) finish(); });
