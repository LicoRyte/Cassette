/* Solarist: how it works. A small ? key at the top left opens a card with every key and gesture, so the desk itself
   stays clear of instructions. ? (Shift+/) opens and closes it too; Esc or a click elsewhere closes it. */
'use strict';

const HELP = [
  ['The clock', [['Space', 'Start or pause'], ['R', 'Rewind: start this part over (while stopped)'], ['S', 'Skip to the next part (while stopped)']]],
  ['Moving around', [['Drag', 'Move the desk (anywhere empty, or with the right button)'], ['Wheel', 'Zoom in and out'], ['0', 'Back to the clock'], ['1 – 9', 'Glide to a bookmark'], ['Shift + 1 – 9', 'Bookmark what you picked']]],
  ['On the desk', [['Double-click', 'Pin a note there'], ['Drop a photo', 'It hangs as a Polaroid'], ['Red pin', 'Drag to something else to tie a string; click a string to cut it'], ['Frame', 'Drag it by its name or an edge: what is inside comes along']]],
  ['Picking', [['Shift + drag', 'Pick everything in the box'], ['Shift + click', 'Pick one more, or let it go'], ['Ctrl + G', 'Group (Ctrl + Shift + G to ungroup)'], ['Delete', 'Remove what is picked'], ['Ctrl + A', 'Pick everything on this board']]],
  ['Drawing', [['D', 'Pen up or down'], ['P A L C B F', 'Pen, arrow, line, circle, box, frame'], ['E', 'Eraser'], ['[  ]', 'Thinner, thicker'], ['Shift', 'Straight angles, true circles and squares']]],
  ['Notes', [['# ## - 1. [] >', 'At the start of a line: title, heading, list, numbers, checklist, quote'], ['Ctrl + B I U', 'Bold, italic, underline'], ['Esc', 'Put the pen down']]],
  ['Everything', [['Ctrl + Z', 'Undo (Ctrl + Shift + Z to redo)'], ['Board ▾', 'Boards, save as an image, backups']]],
];
const keysOf = s => s.split(/(\s\+\s|\s–\s)/).map(p => /^\s[+–]\s$/.test(p) ? ' ' + p.trim() + ' ' : el('kbd', {}, p)); // each key in its own little key
const helpCard = el('div', { class: 'sx-help', role: 'dialog', 'aria-label': 'How it works', hidden: true },
  el('h2', {}, 'How it works'),
  ...HELP.flatMap(([h, rows]) => [el('h3', {}, h), el('dl', {}, ...rows.flatMap(([k, d]) => [el('dt', {}, ...keysOf(k)), el('dd', {}, d)]))]),
  el('p', {}, 'Press ? to open or close this.'));
const helpB = el('button', { type: 'button', class: 'sx-help-b', title: 'How it works (?)', 'aria-label': 'How it works', 'aria-expanded': 'false' }, '?');
document.body.append(helpB, helpCard);
function helpSet(on) { helpCard.hidden = !on; helpB.classList.toggle('on', on); helpB.setAttribute('aria-expanded', String(on)); }
helpB.addEventListener('click', () => { helpB.blur(); helpSet(helpCard.hidden); });
addEventListener('pointerdown', e => { if (!helpCard.hidden && !e.target.closest('.sx-help, .sx-help-b')) helpSet(false); }, true);
addEventListener('keydown', e => {
  const t = e.target; if (t && (t.isContentEditable || t.closest && t.closest('input, select, textarea'))) return;
  if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); e.stopPropagation(); helpSet(helpCard.hidden); return; }
  if (e.key === 'Escape' && !helpCard.hidden) { e.preventDefault(); e.stopPropagation(); helpSet(false); }
}, true);
