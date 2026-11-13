/* Cassette Timer: the screen. The clock's frame (the line above the digits, the time, the session strip, the keys),
   the top bar, Settings, the keyboard, and draw(), which brings everything up to date. */
'use strict';

/* ---------- the clock ---------- */
const bigText = el('span', {});
const timeText = el('div', { class: 'sl-time' }, fmt(left));
const screen = el('div', { class: 'sl-screen sunken', 'aria-live': 'off' }, el('div', { class: 'sl-big' }, bigText), timeText);
const cycleBar = el('div', { class: 'sx-cycle', 'aria-hidden': 'true' });
function drawCycle() { /* js/tape.js draws the session strip */ }
function headline() { // the line above the digits
  const n = S.set.every, round = mode === 'focus' ? S.cycle % n + 1 : (S.cycle % n || n), paused = !running && left > 0 && left < length(mode);
  if (mode !== 'focus') return (paused ? 'Paused · ' : '') + (mode === 'long' ? 'Long break' : 'Break');
  return (paused ? 'Paused' : running ? 'Focus' : 'Ready') + ' · session ' + round + ' of ' + n;
}
const startB = el('button', { type: 'button', class: 'btn', onclick: () => running ? pause() : start() }, 'Start');
const resetB = el('button', { type: 'button', class: 'btn', title: 'Start this part over', onclick: () => reset() }, 'Reset');
const corner = el('section', { class: 'sx-corner', 'aria-label': 'Timer' }, el('div', { class: 'sx-clock' }, screen, cycleBar), el('div', { class: 'sx-cmd' }, startB, resetB));

/* ---------- Settings ---------- */
const sec = (title, ...kids) => el('div', { class: 'sx-sec' }, title ? el('h3', {}, title) : null, ...kids);
// a button that asks once more before it does something you can't take back
const armBtn = (label, armed, act, cls) => { const b = el('button', { type: 'button', class: 'btn ' + (cls || '') }, label);
  b.addEventListener('click', () => { if (!b.classList.contains('arm')) { b.classList.add('arm'); b.textContent = armed; setTimeout(() => { if (b.isConnected) { b.classList.remove('arm'); b.textContent = label; } }, 4000); return; } act(); }); return b; };
const minutes = (k, opts) => { const s = el('select', { 'aria-label': MODES[k] || k }, opts.map(v => el('option', { value: v, selected: S.set[k] === v || null }, String(v))));
  s.addEventListener('change', () => { S.set[k] = +s.value; save(); if (!running && mode === k) { left = length(mode); persistRun(); } draw(); }); return s; };
const modeBtns = Object.keys(MODES).map(m => el('button', { type: 'button', class: 'sl-mode', 'data-m': m, onclick: () => { if (!running) setMode(m); } }, MODES[m]));
const appBox = el('div', {});
function drawAppSettings() { // sound, and installing
  const snd = el('button', { type: 'button', class: 'btn', 'aria-pressed': String(soundOn) }, soundOn ? 'Sound is on' : 'Sound is off');
  snd.addEventListener('click', () => { soundOn = !soundOn; store.set('solarist-sound', soundOn ? 'on' : 'off'); drawAppSettings(); });
  const inst = installEv ? el('button', { type: 'button', class: 'btn', onclick: async () => { installEv.prompt(); try { await installEv.userChoice; } catch (e) { /* closed */ } installEv = null; drawAppSettings(); } }, 'Install as an app') : null;
  appBox.replaceChildren(el('div', { class: 'sx-row' }, snd, inst),
    el('p', { class: 'sl-muted' }, installEv ? 'Installing gives Cassette Timer its own window and icon. It works offline either way.' : 'Cassette Timer works offline once it has loaded. To install it, use your browser menu (Install app, or Add to Home Screen on a phone).'),
    el('p', { class: 'sl-muted sx-credits' }, 'Colour palette by BurakoIRL. Fonts: Barlow Condensed and Courier Prime (OFL). Sounds: virtual_vibes, the Not-So-Awesome Archive, and the cassette key. See CREDITS.md.'));
}
const startOver = armBtn('Start over from scratch', 'Erase everything? Click again', () => { wiping = true; clearInterval(tickT); try { localStorage.removeItem(KEY); } catch (e) { /* */ } location.reload(); }, 'sx-danger');
const settingsPane = el('div', { class: 'sl-pane' },
  sec('Timer', el('div', { class: 'sl-set-row' },
    el('label', {}, 'Focus ', minutes('focus', [1, 10, 15, 20, 25, 30, 40, 45, 50, 60]), ' min'),
    el('label', {}, 'Short break ', minutes('short', [3, 5, 7, 8, 10]), ' min'),
    el('label', {}, 'Long break ', minutes('long', [10, 15, 20, 30]), ' min'),
    el('label', {}, 'Long break every ', minutes('every', [2, 3, 4, 5, 6]), ' sessions'))),
  sec('Switch by hand', el('p', { class: 'sl-muted' }, 'Normally the timer moves between focus and breaks for you.'), el('div', { class: 'sl-modes' }, modeBtns, el('button', { type: 'button', class: 'sl-mode', title: 'Skip to the next part (S)', onclick: () => skip() }, 'Skip'))),
  sec('Sound and app', appBox),
  el('div', { class: 'sx-sec sx-sec-last' }, el('h3', {}, 'Start over'), el('p', { class: 'sl-muted' }, 'Erases your settings, counts and every board. Save a backup from Board ▾ first if you might want it back.'), startOver));
// (Clock and Feel are added below these by js/digits.js and js/feel.js)
const pageTitle = el('h2', { class: 'sx-page-t' }, 'Settings');
const page = el('div', { class: 'sx-page', hidden: true },
  el('div', { class: 'sx-page-h' }, pageTitle, el('button', { type: 'button', class: 'btn', onclick: () => tab('timer') }, 'Back to the clock')),
  el('div', { class: 'sl-body' }, settingsPane));
const tabSet = el('button', { type: 'button', onclick: () => tab(page.hidden ? 'settings' : 'timer') }, 'Settings');
function tab(t) {
  page.hidden = t !== 'settings'; root.classList.toggle('paged', t === 'settings');
  if (t === 'settings') { tabSet.setAttribute('aria-current', 'page'); drawAppSettings(); const bd = page.querySelector('.sl-body'); if (bd) bd.scrollTop = 0; } else tabSet.removeAttribute('aria-current');
}

root.classList.add('sx', 'sx-v2', 'sx-clockonly');
root.replaceChildren(el('header', { class: 'sx-top' }, el('nav', { class: 'sx-nav', 'aria-label': 'Pages' }, tabSet)), el('div', { class: 'sx-rail' }, corner), page);

/* ---------- the keyboard: Space starts or pauses; S skips, only while stopped; Esc closes Settings (holding R winds back: js/tape.js) ---------- */
document.addEventListener('keydown', e => {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, select, textarea')) return;
  if (!page.hidden) { if (e.key === 'Escape') { e.preventDefault(); tab('timer'); } return; }
  if (e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); startB.click(); }
  if ((e.key === 's' || e.key === 'S') && !running) { e.preventDefault(); skip(); }
});

/* ---------- drawing ---------- */
function drawClock() {
  const r = remaining(), pct = Math.min(100, Math.max(0, 100 - (r / length(mode)) * 100));
  timeText.textContent = fmt(r);
  const hl = headline(); if (bigText.textContent !== hl) bigText.textContent = hl;
  drawCycle(pct);
  document.title = running ? fmt(r) + ' · ' + (mode === 'focus' ? (S.intent || '').trim() || 'Focus' : MODES[mode]) : 'Cassette Timer'; // the time in the browser tab (and what the session is for)
}
function draw() {
  drawClock();
  root.dataset.mode = mode;
  modeBtns.forEach(b => { const on = b.dataset.m === mode; b.classList.toggle('on', on); b.disabled = running && !on; });
  startB.textContent = running ? 'Pause' : left < length(mode) && left > 0 ? 'Resume' : mode === 'focus' ? 'Start' : 'Start break';
}
