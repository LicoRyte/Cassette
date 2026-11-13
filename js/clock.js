/* Cassette Timer: the clock's moods. Colour tells you where you are (ready, focus, the last minute, a break, paused),
   the colon beats once a second, Start switches the digits on like an old screen, the last ten seconds fade slower,
   and at 00:00 the digits hold and glow while the screen breathes out. Breaks don't tick: the digits breathe. */
'use strict';

// the small tally under the buttons
const tally = el('p', { class: 'sx-tally' });
corner.append(tally);
// the background: a slow drifting grain, and one faint line sweeping down the screen once a minute
document.body.append(el('div', { class: 'sx-grain', 'aria-hidden': 'true' }), el('div', { class: 'sx-sweep', 'aria-hidden': 'true' }));
const vignette = el('div', { class: 'sx-vig', 'aria-hidden': 'true' }); document.body.append(vignette); // (the end of a session)

// the state, as colour: ready, focus, last (the final minute), break, paused
let clockState = '';
function clockTick() {
  const paused = !running && left > 0 && left < length(mode), rem = remaining();
  const st = paused ? 'paused' : !running ? 'ready' : mode !== 'focus' ? 'break' : rem <= 60000 ? 'last' : 'focus';
  if (st !== clockState) { clockState = st; root.dataset.clock = st; }
  root.classList.toggle('sx-ending', running && mode === 'focus' && rem <= 10000); // the last seconds fade slower
  if (typeof tapeCounter === 'function') tapeCounter(S.todayN || 0); else tally.textContent = S.todayN ? S.todayN + ' today' : ''; // (the tape counter, js/ui/tape.js)
  const colon = digits.querySelector('.sx-colon');
  if (colon && running && mode === 'focus' && !stillUI()) { colon.classList.remove('beat'); void colon.offsetWidth; colon.classList.add('beat'); } // the colon's heartbeat
}
let clockLastText = '';
new MutationObserver(() => { const t = timeText.textContent; if (t !== clockLastText) { clockLastText = t; clockTick(); } }).observe(timeText, { childList: true, characterData: true, subtree: true });
new MutationObserver(() => { clockState = ''; clockTick(); }).observe(root, { attributes: true, attributeFilter: ['data-mode'] });

// the power-on: pressing Start switches the digits on like an old screen
const startClockBase = start;
start = function () {
  const was = running; startClockBase.apply(this, arguments);
  if (!was && running && !stillUI()) { digits.classList.remove('poweron'); void digits.offsetWidth; digits.classList.add('poweron'); }
  clockState = ''; clockTick();
};
const pauseClockBase = pause;
pause = function () { pauseClockBase.apply(this, arguments); clockState = ''; clockTick(); };
// the soft landing: 00:00 glows, then lets go (the session chime plays as it always has)
const finishClockBase = finish;
finish = function () {
  const was = mode; finishClockBase.apply(this, arguments);
  if (was === 'focus') { digitsHold = Date.now() + 2600; digitsHoldText = digLast.replace(/\d/g, '0'); digLast = ''; drawDigits(); setTimeout(() => { digitsHold = 0; drawDigits(); }, 2650); }
  if (was === 'focus' && !stillUI() && S.opts.glow !== false) { vignette.classList.remove('on'); void vignette.offsetWidth; vignette.classList.add('on'); } // the screen breathes out
  if (was === 'focus' && !stillUI()) { digits.classList.remove('landed'); void digits.offsetWidth; digits.classList.add('landed'); setTimeout(() => digits.classList.remove('landed'), 2600); }
  clockState = ''; clockTick();
};
clockTick();
