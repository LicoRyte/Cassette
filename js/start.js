/* Cassette Timer: start-up. Pick up a timer that was running when the page closed, then draw the first frame. */
'use strict';

if (S.run && S.run.running) {
  if (S.run.endAt > Date.now()) { running = true; endAt = S.run.endAt; loop(); }
  else finish(true); // it finished while you were away
}
draw();
document.addEventListener('visibilitychange', () => { if (!document.hidden && running && remaining() <= 0) finish(); });
