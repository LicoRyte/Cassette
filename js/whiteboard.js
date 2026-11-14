/* Cassette Timer: whiteboards made before draw mode was taken out. They stay on the desk as pictures: move one by
   its rail, resize it from its corner, Wipe cleans it, and the x takes it down. */
'use strict';

function wbCard(it) {
  const btn = (cls, label, title, fn) => el('button', { type: 'button', class: cls, title, 'aria-label': title, onclick: e => { e.stopPropagation(); fn(); } }, label);
  const wipe = btn('sx-wb-b', 'Wipe', 'Wipe it clean (Undo brings it back)', () => { if (!(it.strokes || []).length) return; deskMark(); it.strokes = []; deskSfx('tear'); save(); wbRedraw(it); });
  const x = btn('sx-bnote-x', '×', 'Take the whiteboard down', () => removeOne(it));
  return el('div', { class: 'sx-bcard sx-bwb', 'data-id': it.id, style: 'left:' + it.x + 'px;top:' + it.y + 'px;width:' + it.w + 'px;height:' + it.h + 'px;--tilt:0deg' },
    el('div', { class: 'sx-wb-h', title: 'Drag to move the whiteboard' }, ...[keyBadge(it), el('span', { class: 'sx-wb-t' }, 'Whiteboard'), el('span', { class: 'sx-gap' }), wipe, x].filter(Boolean)),
    el('div', { class: 'sx-wb-s' }, drawSvg(it)), el('i', { class: 'sx-wb-tray', 'aria-hidden': 'true' }), el('span', { class: 'sx-resize', title: 'Drag to resize' }));
}
function wbRedraw(it) { const c = els.get(it.id), s = c && c.querySelector('.sx-wb-s'); if (s) s.replaceChildren(drawSvg(it)); }
