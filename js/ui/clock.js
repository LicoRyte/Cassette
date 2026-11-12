/* Solarist: the clock. Solarist is a timer now, and nothing else asks for your attention: one centred clock in a
   console frame, colour that tells you where you are, a breathing colon, digits that leave a faint afterglow, a
   power-on when you start, a soft landing at zero, and breaks that breathe instead of ticking. The Board stays, as a
   library of your own notes and photos. The space game is kept in git (tag: space-game); its code is still here,
   switched off. */
'use strict';

const CLOCK_ONLY = true;
root.classList.add('sx-clockonly');
// no stories, no title sequence, no crew to make: the clock is the whole thing
S.opts.reader = false; S.opts.intro = false; S.opts.aboard = true;

// the top bar keeps only the Board and Settings
[tabStories, tabAtlas, tabJournal, tabShip].forEach(b => { b.hidden = true; });
// the line above the digits
headline = function () {
  const n = S.set.every, round = mode === 'focus' ? S.cycle % n + 1 : (S.cycle % n || n), paused = !running && left > 0 && left < length(mode);
  if (mode !== 'focus') return (paused ? 'Paused · ' : '') + (mode === 'long' ? 'Long break' : 'Break');
  return (paused ? 'Paused' : running ? 'Focus' : 'Ready') + ' · session ' + round + ' of ' + n;
};
// plain words on the buttons: the space game's "Launch", "Set out" and friends all become Start
const clockLabel = () => { if (!/^(Pause|Resume|Start break|Start)$/.test(startB.textContent)) startB.textContent = 'Start'; };
new MutationObserver(clockLabel).observe(startB, { childList: true, characterData: true, subtree: true }); clockLabel();
document.querySelectorAll('.sx-page-h .btn').forEach(b => { if (b.textContent === 'Back to the voyage') b.textContent = 'Back to the clock'; });
// the browser tab: the time and plain words ("24:53 · Focus"), not the space game's "Traveling"
if (hooks.title) { const titleBase = hooks.title; hooks.title = t => titleBase(running ? t.replace(/ · .*$/, ' · ' + (mode === 'focus' ? 'Focus' : mode === 'long' ? 'Long break' : 'Break')) : 'Solarist'); }
// the small tally under the buttons
const tally = el('p', { class: 'sx-tally' });
corner.append(tally);
// the background: a slow drifting grain, and one faint line sweeping down the screen once a minute
document.body.append(el('div', { class: 'sx-grain', 'aria-hidden': 'true' }), el('div', { class: 'sx-sweep', 'aria-hidden': 'true' }));

// the state, as colour: ready, focus, last (the final minute), break, paused
let clockState = '';
function clockTick() {
  const paused = !running && left > 0 && left < length(mode), rem = remaining();
  const st = paused ? 'paused' : !running ? 'ready' : mode !== 'focus' ? 'break' : rem <= 60000 ? 'last' : 'focus';
  if (st !== clockState) { clockState = st; root.dataset.clock = st; }
  root.classList.toggle('sx-ending', running && mode === 'focus' && rem <= 10000); // the last seconds fade slower
  tally.textContent = S.todayN ? S.todayN + ' today' : '';
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
  if (was === 'focus' && !stillUI()) { digits.classList.remove('landed'); void digits.offsetWidth; digits.classList.add('landed'); setTimeout(() => digits.classList.remove('landed'), 2600); }
  clockState = ''; clockTick();
};
clockTick();
