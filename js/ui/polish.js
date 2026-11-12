/* Solarist: small satisfactions. The timer drawn in chunky pixel digits (the text stays underneath for screen
   readers), the minute rolling over, a shine along a session bar when it fills, a stamp over the planet when the
   story arrives somewhere new, and the first start ending on the Stories page. Reduced motion keeps all of it still. */
'use strict';

const stillUI = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ---------- the timer in pixel digits ---------- */
const PIX = { // 5 wide, 7 tall
  '0': ['01110', '10001', '10001', '10001', '10001', '10001', '01110'], '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'], '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'], '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'], '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'], '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ':': ['0', '0', '1', '0', '1', '0', '0'] };
const pixTime = el('canvas', { class: 'sx-pixtime', 'aria-hidden': 'true' });
timeText.after(pixTime); timeText.classList.add('sx-sr');
let pixLast = '';
function drawPix() {
  const t = timeText.textContent || ''; if (t === pixLast) return;
  const minOld = pixLast.split(':').slice(0, -1).join(':'), minNew = t.split(':').slice(0, -1).join(':');
  pixLast = t;
  const glyphs = [...t].map(ch => PIX[ch]).filter(Boolean), w = glyphs.reduce((a, g) => a + g[0].length, 0) + Math.max(0, glyphs.length - 1);
  pixTime.width = Math.max(1, w); pixTime.height = 7;
  const g = pixTime.getContext('2d'); g.clearRect(0, 0, pixTime.width, 7); g.fillStyle = '#ffffe4'; // the palette's cream white
  let x = 0; glyphs.forEach(gl => { gl.forEach((row, y) => [...row].forEach((b, i) => { if (b === '1') g.fillRect(x + i, y, 1, 1); })); x += gl[0].length + 1; });
  pixTime.style.setProperty('--units', w);
  if (minOld && minOld !== minNew && !stillUI()) { pixTime.classList.remove('roll'); void pixTime.offsetWidth; pixTime.classList.add('roll'); } // the minute rolls over
}
new MutationObserver(drawPix).observe(timeText, { childList: true, characterData: true, subtree: true });
// the digits take the timer's colour (green on breaks), so redraw when the mode changes
new MutationObserver(() => { pixLast = ''; drawPix(); }).observe(root, { attributes: true, attributeFilter: ['data-mode'] });
drawPix();

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
