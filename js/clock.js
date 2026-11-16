/* Cassette Timer: the clock's moods. Colour tells you where you are (ready, focus, the last minute, a break, paused),
   the colon beats once a second, the colour eases between paused and playing, the last ten seconds fade slower,
   and at 00:00 the digits hold and glow while the screen breathes out. Breaks don't tick: the digits breathe. */
'use strict';

// the background: a slow drifting grain
document.body.append(el('div', { class: 'sx-grain', 'aria-hidden': 'true' }));

// the state, as colour: ready, focus, last (the final minute), break, paused
let clockState = '';
function clockTick() {
  const paused = !running && left > 0 && left < length(mode), rem = remaining();
  const st = paused ? 'paused' : !running ? 'ready' : mode !== 'focus' ? 'break' : rem <= 60000 ? 'last' : 'focus';
  if (st !== clockState) { clockState = st; root.dataset.clock = st; }
  root.classList.toggle('sx-ending', running && mode === 'focus' && rem <= 10000); // the last seconds fade slower
  const colon = digits.querySelector('.sx-colon');
  if (colon && running && mode === 'focus' && !stillUI()) { animAgain(colon, 'beat'); } // the colon's heartbeat
}
let clockLastText = '';
new MutationObserver(() => { const t = timeText.textContent; if (t !== clockLastText) { clockLastText = t; clockTick(); } }).observe(timeText, { childList: true, characterData: true, subtree: true });
new MutationObserver(() => { clockState = ''; clockTick(); }).observe(root, { attributes: true, attributeFilter: ['data-mode'] });

// pressing Play: the digits' colour eases from paused to playing (style.css), like pausing does the other way
const startClockBase = start;
start = function () {
  startClockBase.apply(this, arguments);
  clockState = ''; clockTick();
};
const pauseClockBase = pause;
pause = function () { pauseClockBase.apply(this, arguments); clockState = ''; clockTick(); };
// the soft landing: 00:00 glows, then lets go (the session chime plays as it always has)
const finishClockBase = finish;
finish = function () {
  const was = mode; finishClockBase.apply(this, arguments);
  if (was === 'focus') { digitsHold = Date.now() + 2600; digitsHoldText = digLast.replace(/\d/g, '0'); digLast = ''; drawDigits(); setTimeout(() => { digitsHold = 0; drawDigits(); }, 2650); }
  if (was === 'focus' && !stillUI()) { animAgain(digits, 'landed'); setTimeout(() => digits.classList.remove('landed'), 2600); }
  clockState = ''; clockTick();
};
clockTick();
