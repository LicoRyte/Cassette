/* Cassette Timer: the look. Cassette skins: the console's accent colour (the keys, the reels, the frame's outline, the
   cassette on the desk, the bar), in classic amber, mint, coral, or clear plastic you can see through. */
'use strict';

const SKINS = [['amber', 'Classic', '#1c92a7'], ['mint', 'Mint', '#77d6c1'], ['coral', 'Coral', '#ff6157'], ['clear', 'Clear plastic', '#ffffe4']];
function skinSet(k) {
  if (!SKINS.some(s => s[0] === k)) k = 'amber';
  S.opts.skin = k; document.documentElement.dataset.skin = k; save();
  skinRow.querySelectorAll('.sx-skin').forEach(b => b.classList.toggle('on', b.dataset.k === k));
}
const skinRow = el('div', { class: 'sx-skins', role: 'radiogroup', 'aria-label': 'Cassette skin' }, ...SKINS.map(([k, name, col]) =>
  el('button', { type: 'button', class: 'sx-skin', role: 'radio', 'data-k': k, style: '--sk:' + col, onclick: () => { skinSet(k); if (typeof tapeSound === 'function') tapeSound(); } }, el('i', {}), name)));
settingsPane.append(sec('Look', el('p', { class: 'sl-muted' }, 'The cassette skin: the colour of the keys, the reels, the frame and the cassette on the desk.'), skinRow));
skinSet(S.opts.skin || 'amber');

// the desk: dark (night) or white; on white, the deck, the bars and the panels turn cream and ink to match
function deskTheme(k) {
  k = k === 'night' ? 'night' : 'white'; S.opts.desk = k; document.documentElement.dataset.desk = k; save();
  deskRow.querySelectorAll('.sx-skin').forEach(b => b.classList.toggle('on', b.dataset.k === k));
}
const deskRow = el('div', { class: 'sx-skins sx-desks', role: 'radiogroup', 'aria-label': 'Desk' }, ...[['night', 'Dark', '#030710'], ['white', 'White', '#f4f6f1']].map(([k, name, col]) =>
  el('button', { type: 'button', class: 'sx-skin', role: 'radio', 'data-k': k, style: '--sk:' + col, onclick: () => deskTheme(k) }, el('i', {}), name)));
settingsPane.querySelector('.sx-skins').closest('.sx-sec').append(el('p', { class: 'sl-muted', style: 'margin-top:14px' }, 'The desk:'), deskRow);
deskTheme(S.opts.desk);


/* ---------- the paper's grain: made once, at the start, into a plain picture every note and photo shares. (As a drawn
   noise filter it was worked out again for every card each time the desk was painted at a new size, which is costly) ---------- */
{ const img = new Image();
  img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 140; c.getContext('2d').drawImage(img, 0, 0);
    c.toBlob(b => { if (b) document.documentElement.style.setProperty('--paper-grain', 'url(' + URL.createObjectURL(b) + ')'); }); };
  img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .2  0 0 0 0 .1  0 0 0 0 .05  0 0 0 .11 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"; }

root.dataset.strings = 'front'; delete S.opts.strings; // (the red strings run in front of the paper, tied over the pins)

/* ---------- Settings, Sound levels: how loud each kind of sound is (each slider plays a little of its sound) ---------- */
{
  const LEVELS = [['master', 'Master', 'Everything at once'], ['music', 'Music', 'The cassette (the same as its own volume)'], ['tick', 'Clock tick', 'Once a second while you focus'],
    ['chime', 'Chimes', 'The bell at the end of a session or a break'], ['keys', 'Tape keys', 'Play/Pause, Rew, Prev, F.F, Reset, the flip, the eject'], ['desk', 'Desk and typing', 'Paper, pins, the typewriter'],
    ['ui', 'Buttons', 'Clicks in the bars and menus']];
  const get = k => k === 'music' ? M.vol / .5 : k === 'tick' ? (S.opts.tickVol != null ? S.opts.tickVol : .35) / .35 : LV[k]; // (the sliders show 100% at each sound's own default)
  const set = (k, v) => { if (k === 'music') { M.vol = v * .5; if (!player.paused) { clearInterval(player._ft); player.volume = Math.min(1, M.vol * duck); } } else if (k === 'tick') S.opts.tickVol = v * .35; else LV[k] = v; lvApply(); save(); };
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
