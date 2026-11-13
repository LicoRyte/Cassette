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
