/* Cassette Timer: hoppers. A hopper is a manila folder on the desk that opens another board: click it and the desk fades
   over to that board. Its tab says which board, and is where you pick it (or make a new one, which gets a folder back to
   here). Arriving through a folder puts you by the folder that leads back, if there is one. Drag it like anything else. */
'use strict';

// the tab opens a menu of boards (full size, on top of everything, whatever the zoom)
const hopMenu = el('div', { class: 'sx-hop-menu', role: 'menu', hidden: true, 'aria-label': 'Which board this folder opens' });
document.body.append(hopMenu);
function hopMenuClose() { hopMenu.hidden = true; }
function hopSet(it, v) {
  const B = S.board;
  if (v === '+') { // a new board, with a folder on it that leads back here
    const name = (prompt('Name the new board:', 'Board ' + (B.boards.length + 1)) || '').trim().slice(0, 40); if (!name) return;
    deskMark(); v = 'b' + Date.now(); B.boards.push({ id: v, name });
    B.items.push({ id: 'h' + Date.now() + 'r', type: 'hop', board: v, x: -360, y: 200, to: it.board });
  } else { if (v === it.to) return; deskMark(); }
  it.to = v; deskSfx('pin'); save(); drawBoard(); deskBoardTools();
}
function hopMenuOpen(it, tab) {
  if (!hopMenu.hidden && hopMenu.dataset.id === it.id) { hopMenuClose(); return; }
  const B = S.board, boards = B.boards.filter(b => b.id !== it.board), item = (label, v, on) => el('button', { type: 'button', role: 'menuitem', class: 'sx-hop-mi' + (on ? ' on' : ''), onclick: () => { hopMenuClose(); hopSet(it, v); } }, label);
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
      el('div', { class: 'sx-hop-front' }, el('b', { class: 'sx-hop-to' }, to ? to.name : 'No board yet'), el('small', {}, to ? 'Click to open' : 'Pick one on the tab')), keyBadge(it), x].filter(Boolean));
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
