/* Solarist: small satisfactions. The timer's digits filling the panel and fading in as they change (the text stays
   underneath for screen readers), a shine along a session bar when it fills, a stamp over the planet when the
   story arrives somewhere new, and the first start ending on the Stories page. Reduced motion keeps all of it still. */
'use strict';

const stillUI = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ---------- the timer: big digits that fill the panel, each one fading in when it changes ---------- */
const digits = el('div', { class: 'sx-digits', 'aria-hidden': 'true' });
timeText.after(digits); timeText.classList.add('sx-sr'); // the plain text stays underneath for screen readers
let digLast = '';
let digW = 0; // the panel width the digits were last fitted to
function fitDigits() { // as big as the panel is wide: measure the digits at 100px, then scale to the panel
  const w = corner.clientWidth; if (!w) return; digW = w;
  digits.style.fontSize = '100px'; const k = digits.children; if (!k.length) return;
  const natural = (k[k.length - 1].getBoundingClientRect().right - k[0].getBoundingClientRect().left) || 1; // the digits themselves, not their box
  digits.style.fontSize = Math.floor(100 * Math.min(w, 380) / natural) + 'px';
}
function drawDigits() {
  if (corner.clientWidth && corner.clientWidth !== digW) fitDigits(); // the panel changed size (or wasn't laid out yet)
  const t = timeText.textContent || ''; if (t === digLast) return;
  const old = digLast; digLast = t;
  if (digits.children.length !== t.length) { digits.replaceChildren(...[...t].map(ch => el('span', { class: ch === ':' ? 'sx-dig sx-colon' : 'sx-dig' }, ch))); fitDigits(); return; }
  [...t].forEach((ch, i) => { const sp = digits.children[i]; if (sp.textContent === ch) return;
    sp.textContent = ch; if (!old || stillUI()) return;
    sp.classList.remove('chg'); void sp.offsetWidth; sp.classList.add('chg'); }); // only the digits that changed fade in
}
new MutationObserver(drawDigits).observe(timeText, { childList: true, characterData: true, subtree: true });
addEventListener('resize', fitDigits);
drawDigits(); requestAnimationFrame(fitDigits);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitDigits); // once the font has loaded, measure again

/* ---------- a shine along a session bar when it fills ---------- */
let barsDone = -1;
const drawCycleBase = drawCycle;
drawCycle = function (pct) {
  drawCycleBase(pct);
  const n = cycleBar.querySelectorAll('.done').length;
  if (barsDone >= 0 && n > barsDone && !stillUI()) { cycleBar.dataset.shine = String(n); clearTimeout(cycleBar._sh); cycleBar._sh = setTimeout(() => { delete cycleBar.dataset.shine; }, 1200); }
  barsDone = n;
};

/* ---------- a stamp over the planet when the story arrives somewhere new ---------- */
function arrivalStamp(p) {
  const show = () => {
    if (document.querySelector('.sx-rdr')) return setTimeout(show, 500); // after the episode has been read
    document.querySelectorAll('.sx-stamp').forEach(n => n.remove());
    const s = el('div', { class: 'sx-stamp', role: 'status' }, el('small', {}, 'New world'), el('b', {}, nm(p)), el('span', {}, worldLabel(p)));
    document.body.append(s); requestAnimationFrame(() => s.classList.add('on'));
    setTimeout(() => { s.classList.remove('on'); setTimeout(() => s.remove(), 600); }, 3600);
  };
  setTimeout(show, 300);
}
const showCardBase = showCard;
showCard = function (p, how) { showCardBase(p, how); if (p && (how === 'new' || how === 'story')) arrivalStamp(p); };

/* ---------- a first start ends on the Stories page, so you choose your story ---------- */
if (typeof showAboard === 'function') {
  const aboardBase = showAboard;
  showAboard = function () {
    const was = aboardOn; aboardBase();
    if (!was && aboardOn) { const wait = () => { if (aboardOn) return setTimeout(wait, 300); tab('stories'); }; setTimeout(wait, 300); }
  };
}

/* ---------- the clock ticking: once a second while the timer runs, only when Solarist is the window in front ---------- */
let tickCtx = null, tickBuf = null;
const tickWanted = () => S.opts.tick !== false && (localStorage.getItem('solarist-sound') !== 'off');
function tickLoad() { // the browser lets sound start only after you've clicked or pressed a key
  if (tickCtx || !(window.AudioContext || window.webkitAudioContext)) return;
  tickCtx = new (window.AudioContext || window.webkitAudioContext)();
  fetch('sfx/clock-tick.mp3').then(r => r.arrayBuffer()).then(b => tickCtx.decodeAudioData(b)).then(x => { tickBuf = x; }).catch(() => {});
}
addEventListener('pointerdown', tickLoad, { once: true }); addEventListener('keydown', tickLoad, { once: true });
function tickPlay() {
  if (!tickBuf || !running || !tickWanted() || document.hidden || !document.hasFocus()) return;
  if (tickCtx.state === 'suspended') tickCtx.resume();
  const src = tickCtx.createBufferSource(), g = tickCtx.createGain(); src.buffer = tickBuf;
  g.gain.value = S.opts.tickVol != null ? S.opts.tickVol : .35; src.connect(g); g.connect(tickCtx.destination); src.start();
}
let tickLast = '';
new MutationObserver(() => { const t = timeText.textContent; if (t !== tickLast) { tickLast = t; tickPlay(); } }).observe(timeText, { childList: true, characterData: true, subtree: true });
// Settings: turn it off, or quieter
{ const box = el('input', { type: 'checkbox', checked: S.opts.tick !== false || null });
  box.addEventListener('change', () => { S.opts.tick = box.checked; save(); });
  const vol = el('input', { type: 'range', min: 0, max: 100, value: Math.round((S.opts.tickVol != null ? S.opts.tickVol : .35) * 100), 'aria-label': 'Clock tick volume' });
  vol.addEventListener('input', () => { S.opts.tickVol = vol.value / 100; save(); });
  settingsPane.append(sec('Clock', el('label', { class: 'sx-check' }, box, ' The clock ticks while a session runs (only when Solarist is the window in front)'), el('label', { class: 'sx-check' }, 'Volume ', vol))); }
