/* Cassette Timer: the look. Cassette skins: the console's accent colour (the keys, the reels, the frame's brackets, the
   cassette on the desk, the bar), in classic amber, mint, coral, or clear plastic you can see through. */
'use strict';

const SKINS = [['amber', 'Classic amber', '#ffb762'], ['mint', 'Mint', '#77d6c1'], ['coral', 'Coral', '#ff6157'], ['clear', 'Clear plastic', '#ffffe4']];
function skinSet(k) {
  if (!SKINS.some(s => s[0] === k)) k = 'amber';
  S.opts.skin = k; document.documentElement.dataset.skin = k; save();
  skinRow.querySelectorAll('.sx-skin').forEach(b => b.classList.toggle('on', b.dataset.k === k));
}
const skinRow = el('div', { class: 'sx-skins', role: 'radiogroup', 'aria-label': 'Cassette skin' }, ...SKINS.map(([k, name, col]) =>
  el('button', { type: 'button', class: 'sx-skin', role: 'radio', 'data-k': k, style: '--sk:' + col, onclick: () => { skinSet(k); if (typeof tapeSound === 'function') tapeSound(); } }, el('i', {}), name)));
settingsPane.append(sec('Look', el('p', { class: 'sl-muted' }, 'The cassette skin: the colour of the keys, the reels, the frame and the cassette on the desk.'), skinRow));
skinSet(S.opts.skin || 'amber');

/* ---------- the clock's light: every note and photo is lit on the side facing the clock, more the closer it is ---------- */
function lightCards() {
  els.forEach((c, id) => {
    if (!c.classList.contains('sx-bnote') && !c.classList.contains('sx-polaroid')) return;
    const x = c.offsetLeft + c.offsetWidth / 2, y = c.offsetTop + c.offsetHeight / 2, d = Math.hypot(x, y);
    const lit = Math.pow(Math.max(0, 1 - d / 950), 1.4);
    c.style.setProperty('--lit', lit.toFixed(3)); c.style.setProperty('--lang', (Math.atan2(x, -y) * 180 / Math.PI).toFixed(0) + 'deg'); // (the gradient runs away from the clock)
  });
}
const strUpdateLight = strUpdate;
strUpdate = function () { strUpdateLight.apply(this, arguments); lightCards(); };
requestAnimationFrame(lightCards);

/* ---------- parallax: the grain and a far layer of dots drift a little as you move the mouse ---------- */
document.body.append(el('div', { class: 'sx-par', 'aria-hidden': 'true' }));
let parRaf = 0, parX = 0, parY = 0;
addEventListener('pointermove', e => { parX = e.clientX / innerWidth * 2 - 1; parY = e.clientY / innerHeight * 2 - 1;
  if (!parRaf && !stillUI()) parRaf = requestAnimationFrame(() => { parRaf = 0; document.documentElement.style.setProperty('--px', parX.toFixed(3)); document.documentElement.style.setProperty('--py', parY.toFixed(3)); }); }, { passive: true });

/* ---------- strings: in front of the paper (tied over the pins), or tucked behind it ---------- */
function stringsSet(k) {
  S.opts.strings = k === 'back' ? 'back' : 'front'; root.dataset.strings = S.opts.strings; save();
  strRow.querySelectorAll('.sx-skin').forEach(b => b.classList.toggle('on', b.dataset.k === S.opts.strings));
}
const strRow = el('div', { class: 'sx-skins', role: 'radiogroup', 'aria-label': 'Strings' }, ...[['front', 'In front of the paper'], ['back', 'Behind the paper']].map(([k, name]) =>
  el('button', { type: 'button', class: 'sx-skin', role: 'radio', 'data-k': k, style: '--sk:#d9243c', onclick: () => stringsSet(k) }, el('i', {}), name)));
settingsPane.querySelector('.sx-skins').closest('.sx-sec').append(el('p', { class: 'sl-muted', style: 'margin-top:14px' }, 'The red strings between pins:'), strRow);
stringsSet(S.opts.strings || 'front');
