/* Cassette Timer: how it works. A small ? key at the top left opens a card with every key and gesture, so the desk itself
   stays clear of instructions. ? (Shift+/) opens and closes it too; Esc or a click elsewhere closes it. */
'use strict';

const HELP = [
  ['The clock', [['Label', 'Above the digits: write what the session is for'], ['Space', 'Start or pause'], ['Hold R', 'Or hold the Rewind key: wind the time back, seconds at first, then minutes (never past the start)'], ['Shift + R', 'Rewind the whole tape: back to session 1'], ['S', 'Skip to the next part (while stopped)']]],
  ['Views', [['M', 'Pop out a mini deck that stays on top of other windows (Chrome, Edge)'], ['F', 'Full-screen focus: only the clock (F or Esc to come back)']]],
  ['Moving around', [['Drag', 'Move the desk, from anywhere empty'], ['Right-drag', 'Move the desk from anywhere, even over notes: it never picks up or moves them'], ['Wheel', 'Zoom in and out'], ['Ctrl + F', 'Find words on any board: Enter for the next one, Esc to close'], ['0', 'Back to the clock'], ['1 – 9', 'Glide to a bookmark'], ['Shift + 1 – 9', 'Bookmark what you picked']]],
  ['On the desk', [['Double-click', 'Pin a note there'], ['Click a note', 'Picks it, to move it or format it; click again (or press Enter) to write in it'], ['Drop a photo', 'It hangs as a Polaroid'], ['Ctrl + V', 'Paste a copied image: it hangs where the mouse is. Pasted text becomes a note'], ['Red pin', 'Drag to something else to tie a string; click a string to cut it (it glows white under the mouse). Strings rest faint so the words read; point at a note to light its strings; pick one and the notes tied to it get a red outline'], ['Tab', 'With a note picked: go through every note tied to it, one by one, following each string to its end before trying the next; Shift + Tab steps back'], ['Label', 'On the left: a light, named area to keep part of the desk tidy; drag it by its name or an edge; the padlock beside its name locks it in place'], ['Hopper', 'On the left: a folder that opens another board; pick which on its tab, click it to go']]],
  ['Picking', [['Shift + drag', 'Pick everything in the box'], ['Shift + click', 'Pick one more, or let it go'], ['Delete', 'Remove what is picked'], ['Ctrl + G', 'Group what is picked: they move together (Ctrl + Shift + G to ungroup)'], ['Ctrl + A', 'Pick everything on this board'], ['Ctrl + D', 'Duplicate what is picked']]],
  ['Tables', [['Table', 'On the left: rows and columns; click a picked table\'s cell to write in it'], ['Tab  Enter', 'Next cell, next row (a new row at the end); Shift goes back'], ['Arrows', 'Move between cells'], ['Table Bars Line Pie', 'At its top left: the numbers as a table or a graph'], ['Paste', 'Cells copied from a spreadsheet fill in from where you are'], ['Rows, columns', 'In the bar at the bottom: add, remove, sort, a total']]],
  ['Notes', [['# ## - 1. [] >', 'At the start of a line: title, heading, list, numbers, checklist, quote'], ['Ctrl + B I U', 'Bold, italic, underline'], ['Paper', 'In a note\'s toolbar: plain, lined or grid'], ['Esc', 'Put the pen down']]],
  ['Tapes', [['N', 'Next track (or the Next key on the deck)'], ['T', 'Open the cassette: your music on the left, the mixtape on the right'], ['Drop music', 'On a side, on your music, or on the desk: Side A plays while you focus, Side B on breaks'], ['Mixtapes', 'Named sets of sides; drag tracks to order them, between sides, or off'], ['Ctrl + Enter', 'When a session ends: keep what you remember'], ['Remembered', 'At the top left: everything you kept; pin one to the desk, or write one now']]],
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
