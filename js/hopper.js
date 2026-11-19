/* Cassie: hoppers. A hopper is a manila folder on the desk that opens another board: click it and the desk fades
   over to that board. Its tab says which board, and is where you pick it (or make a new one, which gets a folder back to
   here). Arriving through a folder puts you by the folder that leads back, if there is one. Drag it like anything else. */
'use strict';

// the tab opens a menu of boards (full size, on top of everything, whatever the zoom)
const hopMenu = el('div', { class: 'sx-hop-menu', role: 'menu', hidden: true, 'aria-label': 'Which board this folder opens' });
document.body.append(hopMenu);
function hopMenuClose() { hopMenu.hidden = true; }
function hopSet(it, v) {
  const B = S.board;
  if (v === '+') { hopMenuName(it); return; } // (named right in the menu)
  if (typeof v === 'object') { // a new board, with a folder on it that leads back here
    const name = v.name; deskMark(); v = 'b' + Date.now(); B.boards.push({ id: v, name });
    B.items.push({ id: 'h' + Date.now() + 'r', type: 'hop', board: v, x: -360, y: 200, to: it.board });
  } else { if (v === it.to) return; deskMark(); }
  it.to = v; deskSfx('pin'); save(); drawBoard(); deskBoardTools();
}
// a new board's name, typed right in the menu (Enter makes it, Esc goes back to the list)
function hopMenuName(it) {
  const inp = el('input', { class: 'sx-hop-in', type: 'text', maxlength: '40', value: 'Board ' + (S.board.boards.length + 1), 'aria-label': 'Name of the new board', spellcheck: 'false' });
  const make = () => { const name = inp.value.trim().slice(0, 40); if (!name) return; hopMenuClose(); hopSet(it, { name }); };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); make(); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hopMenuClose(); } });
  hopMenu.replaceChildren(el('div', { class: 'sx-hop-mh' }, 'Name the new board'), inp, el('div', { class: 'sx-hop-keys' },
    el('button', { type: 'button', class: 'sx-hop-mi on-k', onclick: make }, 'Make it'), el('button', { type: 'button', class: 'sx-hop-mi', onclick: hopMenuClose }, 'Cancel')));
  inp.focus({ preventScroll: true }); inp.select();
}
function hopMenuOpen(it, tab) {
  if (!hopMenu.hidden && hopMenu.dataset.id === it.id) { hopMenuClose(); return; }
  const B = S.board, boards = B.boards.filter(b => b.id !== it.board), item = (label, v, on) => el('button', { type: 'button', role: 'menuitem', class: 'sx-hop-mi' + (on ? ' on' : ''), onclick: () => { if (v !== '+') hopMenuClose(); hopSet(it, v); } }, label);
  hopMenu.replaceChildren(el('div', { class: 'sx-hop-mh' }, 'This folder opens'), ...boards.map(b => item(b.name, b.id, b.id === it.to)), el('i', { class: 'sx-hop-msep' }), item('+ New board…', '+'));
  hopMenu.dataset.id = it.id; hopMenu.hidden = false;
  const r = tab.getBoundingClientRect(), w = hopMenu.offsetWidth, h = hopMenu.offsetHeight;
  hopMenu.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left)) + 'px';
  hopMenu.style.top = (r.bottom + 6 + h < innerHeight - 8 ? r.bottom + 6 : Math.max(8, r.top - h - 6)) + 'px';
  deskSfx('pick');
}
addEventListener('pointerdown', e => { if (!hopMenu.hidden && !e.target.closest('.sx-hop-menu, .sx-hop-tabb')) hopMenuClose(); }, true);
addEventListener('keydown', e => { if (e.key === 'Escape' && !hopMenu.hidden) { e.preventDefault(); e.stopPropagation(); hopMenuClose(); } }, true);
addEventListener('wheel', hopMenuClose, { passive: true });
function hopCard(it) {
  const B = S.board, to = B.boards.find(b => b.id === it.to);
  const tab = el('button', { type: 'button', class: 'sx-hop-tabb', title: 'Pick the board this folder opens', 'aria-haspopup': 'menu' }, to ? to.name : 'Pick a board', el('span', { 'aria-hidden': 'true' }, ' ▾'));
  tab.addEventListener('click', e => { e.stopPropagation(); hopMenuOpen(it, tab); });
  const x = el('button', { type: 'button', class: 'sx-bnote-x', 'aria-label': 'Take the folder away', title: 'Take the folder away', onclick: () => removeOne(it) }, '×');
  return el('div', { class: 'sx-bcard sx-bhop' + (to ? '' : ' empty'), 'data-id': it.id, title: to ? 'Open ' + to.name : 'Pick a board on the tab', style: 'left:' + it.x + 'px;top:' + it.y + 'px;--tilt:' + (tilt(it.id) / 2).toFixed(2) + 'deg' },
    ...[el('div', { class: 'sx-hop-tab' }, tab), el('div', { class: 'sx-hop-back', 'aria-hidden': 'true' }), el('i', { class: 'sx-hop-paper', 'aria-hidden': 'true' }),
      el('div', { class: 'sx-hop-front' }, el('b', { class: 'sx-hop-to' }, to ? to.name : 'No board yet'), el('small', {}, to ? 'Click to open' : 'Pick one on the tab')), x].filter(Boolean));
}
function addHopper() {
  const p = freeSpot(), B = S.board, other = B.boards.find(b => b.id !== B.cur);
  deskMark(); deskSfx('pin'); const id = 'h' + Date.now();
  B.items.push(Object.assign({ id, type: 'hop', board: B.cur, x: Math.round(p.x), y: Math.round(p.y) }, other ? { to: other.id } : {})); save(); drawBoard(); select(id);
  if (!other) deskToast('Pick a board on the folder\'s tab (or make a new one there)');
}
// through the folder: the desk fades out, the board changes, and it fades back in by the folder that leads back
function hopGo(it) {
  const B = S.board, to = B.boards.find(b => b.id === it.to); if (!to) { deskToast('Pick a board on the folder\'s tab'); return; }
  const from = B.cur; deskSfx('flip');
  const go = () => {
    B.cur = to.id; select(null); save(); drawBoard(); deskBoardTools();
    if (boardViewBack()) { deskSfx('drop'); deskToast(to.name); return; } // (back to where you were on that board)
    const back = B.items.find(x => x.type === 'hop' && x.board === to.id && x.to === from), c = back && els.get(back.id);
    if (c) Object.assign(cam, { x: back.x + c.offsetWidth / 2, y: back.y + c.offsetHeight / 2 + 140, z: 1 }); else Object.assign(cam, { x: 0, y: 0, z: 1 });
    placeCam(); camSettle(); camSave(); deskSfx('drop'); deskToast(to.name);
  };
  if (stillUI()) { go(); return; }
  cancelAnimationFrame(glideRaf);
  const out = world.animate([{ opacity: 1, filter: 'blur(0)' }, { opacity: 0, filter: 'blur(4px)' }], { duration: 200, easing: 'ease-in', fill: 'forwards' });
  setTimeout(() => { out.cancel(); go(); world.animate([{ opacity: 0, filter: 'blur(4px)' }, { opacity: 1, filter: 'blur(0)' }], { duration: 280, easing: 'ease-out' }); }, 210);
}

/* ---------- a note into a board: Make a board, in a note's right-click panel. The note and every card tied to it (and the cards
   tied to those, all along the strings) move to a new board named after the note's first line, keeping how they sit; a folder
   to that board takes the note's place here, and the new board gets a folder back. Ctrl+Z undoes it all ---------- */
function noteToBoard(id) {
  const B = S.board, me = itemOf(id); if (!me || me.type !== 'note') return;
  const seen = new Set([id]), queue = [id];
  while (queue.length) { const x = queue.shift(); B.links.forEach(l => { if (!l.includes(x)) return; const o = l[0] === x ? l[1] : l[0], it = itemOf(o); if (it && it.board === me.board && !seen.has(o)) { seen.add(o); queue.push(o); } }); }
  const name = (String(me.text || '').split('\n').map(s => s.trim()).filter(Boolean)[0] || 'New board').slice(0, 40);
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  deskMark();
  const t = Date.now(), nb = 'b' + t, from = me.board, ox = me.x, oy = me.y;
  B.boards.push({ id: nb, name });
  const dx = 380 - me.x, dy = -200 - me.y; // (on the new board the note sits just right of the clock, the rest around it as they were)
  seen.forEach(x => { const it = itemOf(x); it.board = nb; it.x = Math.round(it.x + dx); it.y = Math.round(it.y + dy); });
  B.items.push({ id: 'h' + t, type: 'hop', board: from, x: ox, y: oy, to: nb }, { id: 'h' + t + 'r', type: 'hop', board: nb, x: 380, y: -460, to: from });
  select('h' + t); save(); drawBoard(); deskBoardTools(); deskSfx('flip');
  deskToast('Made a board: ' + name + ' (' + seen.size + (seen.size === 1 ? ' card' : ' cards') + '). The folder opens it');
}
const boardB = fbtn('board', 'Make a board', 'Turn this note and every card tied to it into a board of its own (a folder to it takes its place)');
noteBar.querySelector('[data-k="keep"]').after(boardB);
noteBar.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.dataset.k !== 'board') return; e.stopImmediatePropagation();
  const n = selNote(); if (!n || !els.has(n.it.id)) return; // (not the kept note's strip on another board)
  if (typeof noteMenuClose === 'function') noteMenuClose(); noteToBoard(n.it.id);
}, true);
