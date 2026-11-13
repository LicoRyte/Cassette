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
  if (!parRaf && !stillUI()) parRaf = requestAnimationFrame(() => { parRaf = 0; // (the two layers themselves, so nothing else has to be restyled)
    const g = document.querySelector('.sx-grain'), p = document.querySelector('.sx-par');
    if (g) g.style.translate = (parX * -8).toFixed(1) + 'px ' + (parY * -8).toFixed(1) + 'px'; if (p) p.style.translate = (parX * -22).toFixed(1) + 'px ' + (parY * -22).toFixed(1) + 'px'; }); }, { passive: true });

/* ---------- strings: in front of the paper (tied over the pins), or tucked behind it ---------- */
function stringsSet(k) {
  S.opts.strings = k === 'back' ? 'back' : 'front'; root.dataset.strings = S.opts.strings; save();
  strRow.querySelectorAll('.sx-skin').forEach(b => b.classList.toggle('on', b.dataset.k === S.opts.strings));
}
const strRow = el('div', { class: 'sx-skins', role: 'radiogroup', 'aria-label': 'Strings' }, ...[['front', 'In front of the paper'], ['back', 'Behind the paper']].map(([k, name]) =>
  el('button', { type: 'button', class: 'sx-skin', role: 'radio', 'data-k': k, style: '--sk:#d9243c', onclick: () => stringsSet(k) }, el('i', {}), name)));
settingsPane.querySelector('.sx-skins').closest('.sx-sec').append(el('p', { class: 'sl-muted', style: 'margin-top:14px' }, 'The red strings between pins:'), strRow);
stringsSet(S.opts.strings || 'front');

/* ---------- Settings, Sound levels: how loud each kind of sound is (each slider plays a little of its sound) ---------- */
{
  const LEVELS = [['master', 'Master', 'Everything at once'], ['music', 'Music and radio', 'The cassette (the same as its own volume)'], ['tick', 'Clock tick', 'Once a second while you focus'],
    ['chime', 'Chimes', 'The bell at the end of a session or a break'], ['keys', 'Tape keys', 'Play, Pause, Rewind, the flip, the eject, the counter'], ['desk', 'Desk and typing', 'Paper, pins, stickers, the typewriter'],
    ['ui', 'Buttons', 'Clicks in the bars and menus'], ['hiss', 'Tape hiss', 'The faint hiss under a focus session']];
  const get = k => k === 'music' ? M.vol / .5 : k === 'tick' ? (S.opts.tickVol != null ? S.opts.tickVol : .35) / .35 : LV[k]; // (the sliders show 100% at each sound's own default)
  const set = (k, v) => { if (k === 'music') { M.vol = v * .5; if (!player.paused) { clearInterval(player._ft); player.volume = Math.min(1, M.vol * duck); } radioLevel(.1); } else if (k === 'tick') S.opts.tickVol = v * .35; else LV[k] = v; lvApply(); save(); };
  const sample = k => { const c = feelCtx(); if (!c || !soundOn) return;
    if (k === 'chime') feelChime(true); else if (k === 'keys') tapeKeySound(resetB); else if (k === 'desk') deskSfx('pin'); else if (k === 'ui') sfxPlay('click');
    else if (k === 'tick' && tickBuf) { const s = c.createBufferSource(), g = c.createGain(); s.buffer = tickBuf; g.gain.value = S.opts.tickVol != null ? S.opts.tickVol : .35; s.connect(g).connect(soundOut(c, 'tick')); s.start(); }
    else if (k === 'master') tapeKeySound(startB); };
  const rows = LEVELS.map(([k, name, hint]) => {
    const r = el('input', { type: 'range', min: 0, max: 150, value: Math.round(get(k) * 100), 'aria-label': name + ' volume' }), out = el('output', {}, Math.round(get(k) * 100) + '%');
    let t = 0; r.addEventListener('input', () => { set(k, r.value / 100); out.textContent = r.value + '%'; clearTimeout(t); t = setTimeout(() => sample(k), 220); });
    return el('div', { class: 'sx-lv-row' }, el('label', {}, el('b', {}, name), el('small', {}, hint)), r, out);
  });
  const reset = el('button', { type: 'button', class: 'btn', onclick: () => { Object.keys(LV).forEach(k => { LV[k] = 1; }); M.vol = .5; S.opts.tickVol = .35; lvApply(); save();
    rows.forEach((row, i) => { const k = LEVELS[i][0], v = Math.round(get(k) * 100); row.querySelector('input').value = v; row.querySelector('output').textContent = v + '%'; }); } }, 'Back to the usual levels');
  const box = sec('Sound levels', el('p', { class: 'sl-muted' }, '100% is the usual level; up to 150% for louder. Sound on or off is under Sound and app.'), ...rows, el('div', { class: 'sx-row' }, reset));
  const after = [...settingsPane.querySelectorAll('.sx-sec')].find(s => (s.querySelector('h3') || {}).textContent === 'Sound and app');
  if (after) after.after(box); else settingsPane.append(box);
  lvApply();
}
