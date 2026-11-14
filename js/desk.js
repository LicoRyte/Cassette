/* Cassette Timer: the desk. The whole screen is one big desk with the clock in the middle. Drag the empty space to move
   around (or drag with the right mouse button), scroll to zoom, double-click anywhere to pin a note there, drop photos
   straight on (they hang as Polaroids), and drag from a red pin onto something else to tie a string. Press D to draw
   (js/ui/draw-mode.js). Labels are light, named areas to keep a part of the desk tidy (they don't carry anything). Hoppers are folders that open another board (js/hopper.js).
   Shift+drag on the empty desk (or Shift+click) picks several things; Ctrl+G groups them so they move together.
   Ctrl+Z undoes, Ctrl+Shift+Z redoes. Bookmarks: Shift+1 to 9 on something picked; 1 to 9 glides there, 0 to the clock.
   Make as many boards as you like. Everything but the photos is saved with your game (S.board); photos live in the
   browser's picture storage (IndexedDB), shrunk so they never fill your save. */
'use strict';

// what's saved: { boards: [{ id, name }], cur, cam: { x, y, z }, items: [...], links: [[id, id]] }
// items: note { text, html, color, fs, w, h } | photo { text } | draw { w, h, strokes } | frame { w, h, text, color } (a label) | hop { to } (a folder to another board) | wb { w, h, strokes },
// and all of them { id, type, board, x, y, key?, group? }
(function boardMigrate() {
  const B = S.board = S.board && typeof S.board === 'object' ? S.board : {};
  if (!Array.isArray(B.boards) || !B.boards.length) B.boards = [{ id: 'main', name: 'My board' }];
  if (!B.cur || !B.boards.some(b => b.id === B.cur)) B.cur = B.boards[0].id;
  if (!Array.isArray(B.items)) B.items = [];
  if (Array.isArray(B.notes)) { B.notes.forEach(n => B.items.push({ id: n.id, type: 'note', board: B.boards[0].id, x: n.x, y: n.y, text: n.text || '' })); delete B.notes; } // notes from the story boards come along
  delete B.pos; // (story cards are gone with the stories)
  B.links = (Array.isArray(B.links) ? B.links : []).filter(l => l.every(id => B.items.some(it => it.id === id)));
  // the old board was a page whose top-left corner was 0,0; on the desk the clock is at 0,0, so old things move off to the right
  if (!B.desk) { B.items.forEach(it => { it.x = (+it.x || 0) + 420; it.y = (+it.y || 0) - 260; }); B.desk = 1; }
  if (!B.cam || !isFinite(B.cam.x)) B.cam = { x: 0, y: 0, z: 1 };
})();

// the browser's picture storage
const PHOTOS = (() => {
  let dbp = null;
  const open = () => dbp = dbp || new Promise((res, rej) => { const r = indexedDB.open('solarist-photos', 1); r.onupgradeneeded = () => r.result.createObjectStore('p'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const run = (mode, fn) => open().then(db => new Promise((res, rej) => { const t = db.transaction('p', mode), q = fn(t.objectStore('p')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }));
  return { put: (k, v) => run('readwrite', s => s.put(v, k)), get: k => run('readonly', s => s.get(k)), del: k => run('readwrite', s => s.delete(k)), keys: () => run('readonly', s => s.getAllKeys()) };
})();
// photos are only thrown away when the app starts (so Undo can bring a removed one back while you work)
PHOTOS.keys().then(keys => (keys || []).forEach(k => { if (!S.board.items.some(it => it.id === k)) PHOTOS.del(k).catch(() => {}); })).catch(() => {});
function shrinkPhoto(file) { // at most 640 pixels on the long side, as a JPEG
  return new Promise((res, rej) => { const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, 640 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', .85)); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('not an image')); }; img.src = url; });
}
const tilt = id => { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return ((h % 50) - 25) / 10; }; // everything hangs a little crooked

/* ---------- the desk and its camera ---------- */
const SVGNS = 'http://www.w3.org/2000/svg';
const ws = el('div', { class: 'sx-ws' }), world = el('div', { class: 'sx-world' });
const frameLayer = el('div', { class: 'sx-flayer' });
const strings = document.createElementNS(SVGNS, 'svg'); strings.setAttribute('class', 'sx-strings');
const layer = el('div', { class: 'sx-layer' });
const selBox = el('div', { class: 'sx-selbox', hidden: true }), marquee = el('div', { class: 'sx-marquee', hidden: true });
let selShift = null; // while several things are carried: where the box around them started (it moves with them)
world.append(frameLayer, strings, corner, layer, selBox, marquee); ws.append(world);
root.append(ws); root.classList.add('sx-desk');

const cam = S.board.cam; cam.z = Math.min(1.6, Math.max(.35, +cam.z || 1));
const view = () => ({ w: ws.clientWidth || innerWidth, h: ws.clientHeight || innerHeight });
// moving the camera is made cheap: while it moves, the desk is one picture the graphics card slides and scales
// (will-change), the dots are their own layer moved the same way, and the zoom that toolbars and frame names read
// (--cz) is only updated once the camera comes to rest
const deskDots = el('div', { class: 'sx-dots', 'aria-hidden': 'true' }); ws.prepend(deskDots);
let camMoveT = 0, czShown = null, dotsKey = '';
function placeCam() {
  const { w, h } = view(), tx = w / 2 - cam.x * cam.z, ty = h / 2 - cam.y * cam.z;
  world.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0) scale(' + cam.z + ')';
  world.classList.add('moving'); clearTimeout(camMoveT); camMoveT = setTimeout(camSettle, 160); // (panning too: one sliding picture)
  const g = 44 * cam.z, key = w + 'x' + h + 'x' + g.toFixed(3);
  if (key !== dotsKey) { dotsKey = key; deskDots.style.cssText = 'width:' + (w + 2 * g) + 'px;height:' + (h + 2 * g) + 'px;background-size:' + g + 'px ' + g + 'px'; }
  deskDots.style.transform = 'translate3d(' + (((tx % g) + g) % g - g) + 'px,' + (((ty % g) + g) % g - g) + 'px,0)'; // the dots move with you
}
function camSettle() { world.classList.remove('moving'); if (czShown !== cam.z) { czShown = cam.z; world.style.setProperty('--cz', cam.z); } } // (toolbars and frame names stay the same size on screen)
let placeRaf = 0;
const placeSoon = () => { if (!placeRaf) placeRaf = requestAnimationFrame(() => { placeRaf = 0; placeCam(); }); }; // (at most once a frame)
const toWorld = (cx, cy) => { const r = ws.getBoundingClientRect(), { w, h } = view(); return { x: (cx - r.left - w / 2) / cam.z + cam.x, y: (cy - r.top - h / 2) / cam.z + cam.y }; };
let camSaveT = 0;
const camSave = () => { clearTimeout(camSaveT); camSaveT = setTimeout(save, 400); };
// gliding: the camera eases over, pulling back a little on long trips so you see where you're going
let glideRaf = 0;
function glideTo(x, y, z, quick, done) { // (quick: a shorter glide that keeps the zoom as it is, no dip out and back in)
  cancelAnimationFrame(glideRaf);
  const a = { x: cam.x, y: cam.y, z: cam.z }, d = Math.hypot(x - a.x, y - a.y), dur = quick ? Math.min(560, 240 + d * .16) : Math.min(1100, 420 + d * .35), dip = quick ? 0 : Math.min(.4, d / 3500), t0 = performance.now();
  if (stillUI() || d < 1 && Math.abs(z - a.z) < .01) { Object.assign(cam, { x, y, z }); placeCam(); camSave(); if (done) done(); return; }
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const step = now => { const t = Math.min(1, (now - t0) / dur), e = ease(t);
    cam.x = a.x + (x - a.x) * e; cam.y = a.y + (y - a.y) * e; cam.z = (a.z + (z - a.z) * e) * (1 - dip * Math.sin(Math.PI * t));
    placeCam(); if (t < 1) glideRaf = requestAnimationFrame(step); else { camSave(); if (done) done(); } };
  glideRaf = requestAnimationFrame(step);
}
const glideHome = () => glideTo(0, 0, 1);
function glideToItem(it) { // a frame fills the view; anything else comes to the middle at full size
  const c = els.get(it.id); if (!c) return;
  const w = c.offsetWidth, h = c.offsetHeight, v = view();
  const z = it.type === 'frame' ? Math.min(1.6, Math.max(.35, Math.min(v.w * .86 / w, (v.h - 150) * .86 / h))) : 1;
  glideTo(it.x + w / 2, it.y + h / 2 + (it.type === 'frame' ? 20 / z : 0), z, false, () => arriveAt(it.id)); select(it.id);
}
function deskGoTo(id) { // go to something, on whichever board it is (search)
  const it = itemOf(id); if (!it) return false;
  if (it.board !== S.board.cur) { S.board.cur = it.board; select(null); save(); drawBoard(); deskBoardTools(); }
  glideToItem(it); return true;
}

/* ---------- undo: every change to the desk can be taken back (text has its own undo while you write) ---------- */
const undoS = [], redoS = [];
const deskSnap = () => JSON.stringify({ boards: S.board.boards, cur: S.board.cur, items: S.board.items, links: S.board.links });
function deskMark(snap) { if (editSnap && !snap) editCommit(); undoS.push(snap || deskSnap()); if (undoS.length > 100) undoS.shift(); redoS.length = 0; deskUndoState(); }
function deskRestore(str) { const o = JSON.parse(str); Object.assign(S.board, o); select(null); save(); drawBoard(); }
function deskUndo() { editCommit(); if (!undoS.length) return; redoS.push(deskSnap()); deskRestore(undoS.pop()); deskSfx('pick'); deskUndoState(); }
function deskRedo() { if (!redoS.length) return; undoS.push(deskSnap()); deskRestore(redoS.pop()); deskSfx('pick'); deskUndoState(); }
// writing in a note (or a frame's name) counts as one step, from when you start to when you put the pen down
let editSnap = null;
function editCommit() { if (!editSnap) return; const s = editSnap; editSnap = null; if (deskSnap() !== s) deskMark(s); } // the writing so far becomes one step
document.addEventListener('focusin', e => { if (e.target.isContentEditable && ws.contains(e.target)) editSnap = deskSnap(); });
document.addEventListener('beforeinput', e => { if (!editSnap && e.target.isContentEditable && ws.contains(e.target)) editSnap = deskSnap(); }, true); // (in case focus came without its event)
document.addEventListener('focusout', e => { if (e.target.isContentEditable && ws.contains(e.target)) editCommit(); });

/* ---------- the bar along the bottom ---------- */
function deskBoardGo(id) { if (id === S.board.cur) return; S.board.cur = id; select(null); save(); drawBoard(); deskBoardTools(); if (!boardViewBack()) glideHome(); } // (back to where you were on that board)
// the bar's icons: drawn in lines, in the button's own colour (currentColor), on a 24 px grid
const DESK_ICONS = {
  boards: '<path d="M12 3.5l8.5 4.5-8.5 4.5L3.5 8z"/><path d="M3.5 12.5l8.5 4.5 8.5-4.5"/><path d="M3.5 16.5l8.5 4.5 8.5-4.5"/>',
  note: '<path d="M5 3.5h10l4 4v13H5z"/><path d="M15 3.5v4h4"/><path d="M8.5 12h7M8.5 16h4.5"/>',
  photo: '<path d="M4 3.5h16v17H4z"/><path d="M7 6.5h10v9H7z"/><path d="M7 13.5l3-3 2.5 2.5 1.5-1.5 3 3"/>',
  table: '<path d="M3.5 4.5h17v15h-17z"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 4.5v15"/>',
  label: '<path d="M4 9v11h16V9" stroke-dasharray="2.2 2.4"/><path d="M4 4.5h9V9H4z"/>',
  folder: '<path d="M3.5 5.5h6l2 2.5h9v12h-17z"/><path d="M3.5 11h17"/>',
  find: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/>',
  undo: '<path d="M8.5 13.5L4 9l4.5-4.5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo: '<path d="M15.5 13.5L20 9l-4.5-4.5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  group: '<path d="M3 3h18v18H3z" stroke-dasharray="2.2 2.4"/><path d="M7.5 7.5h4.5V12H7.5zM12 12h4.5v4.5H12z"/>',
  ungroup: '<path d="M3.5 3.5h7v7h-7zM13.5 13.5h7v7h-7z"/><path d="M14 4h6v6M10 20H4v-6" stroke-dasharray="2 2.4"/>',
  trash: '<path d="M3.5 6.5h17"/><path d="M9 6.5V3.5h6v3"/><path d="M5.5 6.5l1 14h11l1-14"/><path d="M10 10.5v6.5M14 10.5v6.5"/>',
};
const deskIcon = k => { const s = el('span', { class: 'sx-ic', 'aria-hidden': 'true' });
  s.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="square" stroke-linejoin="miter">' + DESK_ICONS[k] + '</svg>'; return s; };
const deskBtn = (label, fn, cls, title) => el('button', { type: 'button', class: 'sx-ws-b' + (cls ? ' ' + cls : ''), title: title || null, 'aria-label': title || null, onclick: e => { e.currentTarget.blur(); fn(e); } }, label);
const deskFile = el('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
const deskKeys = el('div', { class: 'sx-ws-keys', 'aria-label': 'Bookmarks' });
const undoB = deskBtn(deskIcon('undo'), deskUndo, 'sx-ws-ic', 'Undo (Ctrl+Z)'), redoB = deskBtn(deskIcon('redo'), deskRedo, 'sx-ws-ic', 'Redo (Ctrl+Shift+Z)');
function deskUndoState() { undoB.disabled = !undoS.length; redoB.disabled = !redoS.length; }
// the board menu: boards, and saving or loading them
const deskMenu = el('div', { class: 'sx-ws-menu', hidden: true, role: 'menu' });
function deskMenuOpen() {
  if (!deskMenu.hidden) { deskMenu.hidden = true; return; }
  const B = S.board, cur = B.boards.find(b => b.id === B.cur), close = () => { deskMenu.hidden = true; };
  const item = (label, fn) => el('button', { type: 'button', class: 'sx-ws-mi', role: 'menuitem', onclick: () => { close(); fn(); } }, label);
  deskMenu.replaceChildren(...[
    el('div', { class: 'sx-ws-mh' }, 'Boards'),
    ...B.boards.map(b => el('button', { type: 'button', class: 'sx-ws-mi sx-ws-mb' + (b.id === B.cur ? ' cur' : ''), role: 'menuitemradio', 'aria-checked': String(b.id === B.cur), onclick: () => { close(); deskBoardGo(b.id); } },
      el('span', { class: 'sx-ws-tick', 'aria-hidden': 'true' }, b.id === B.cur ? '✓' : ''), b.name)),
    el('i', { class: 'sx-ws-msep' }),
    item('New board', () => { const name = (prompt('Name the new board:', 'Board ' + (B.boards.length + 1)) || '').trim().slice(0, 40); if (!name) return; deskMark(); const id = 'b' + Date.now(); B.boards.push({ id, name }); B.cur = id; select(null); save(); drawBoard(); glideHome(); }),
    item('Rename this board', () => { const name = (prompt('Rename this board:', cur.name) || '').trim().slice(0, 40); if (name) { deskMark(); cur.name = name; save(); deskBoardTools(); } }),
    B.boards.length > 1 ? armBtn('Delete this board', 'Sure? Everything on it goes (Undo brings it back)', () => { close(); deskMark(); const ids = new Set(B.items.filter(it => it.board === B.cur).map(it => it.id));
      B.items = B.items.filter(it => it.board !== B.cur); B.links = B.links.filter(l => !l.some(id => ids.has(id))); B.boards = B.boards.filter(b => b.id !== B.cur); B.cur = B.boards[0].id; select(null); save(); drawBoard(); glideHome(); }, 'sx-ws-mi') : null,
    el('i', { class: 'sx-ws-msep' }),
    item('Save a backup of all boards', () => deskExportBackup()),
    item('Load a backup...', () => deskImportBackup()),
  ].filter(Boolean));
  deskMenu.hidden = false;
  const mb = deskBar.querySelector('.sx-ws-menub'); if (mb) deskMenu.style.top = Math.max(0, mb.offsetTop) + 'px'; // beside the Boards button, opening to the right
}
addEventListener('pointerdown', e => { if (!deskMenu.hidden && !e.target.closest('.sx-ws-menu, .sx-ws-menub')) deskMenu.hidden = true; }, true);
function deskBoardTools() { // the Boards button names the board you're on
  const cur = S.board.boards.find(b => b.id === S.board.cur), t = 'Boards: on ' + (cur ? cur.name : '') + ' (switch, new, rename, delete, backup)';
  if (typeof menuB !== 'undefined') { menuB.title = t; menuB.setAttribute('aria-label', t); } }
// what's picked: a count, and what you can do with several things at once
const selCount = el('span', { class: 'sx-ws-n' });
const delSelB = deskBtn(deskIcon('trash'), () => deskDelete(), 'sx-ws-ic sx-ws-del', 'Delete what is picked (Delete)');
const grpB = deskBtn(deskIcon('group'), () => deskGroup(), 'sx-ws-ic', 'Group them, so they move together like one thing (Ctrl+G)'), ungrpB = deskBtn(deskIcon('ungroup'), () => deskUngroup(), 'sx-ws-ic', 'Ungroup (Ctrl+Shift+G)');
const deskSelGrp = el('div', { class: 'sx-ws-grp sx-ws-selg', hidden: true }, selCount, grpB, ungrpB, delSelB);
const tableKey = deskBtn(deskIcon('table'), () => addTable(), 'sx-ws-ic', 'Table: rows and columns, and a graph of them (Bars, Line, Pie)');
// the left side: a column of keys for making things, finding and undoing (the bar along the bottom holds what changes the thing you've picked)
const menuB = deskBtn([deskIcon('boards'), el('span', { class: 'sx-ic-car', 'aria-hidden': 'true' }, '▸')], deskMenuOpen, 'sx-ws-ic sx-ws-menub', 'Boards');
const deskBar = el('div', { class: 'sx-ws-bar sx-ws-side', role: 'toolbar', 'aria-orientation': 'vertical', 'aria-label': 'Desk' },
  el('div', { class: 'sx-ws-grp' }, menuB),
  el('div', { class: 'sx-ws-grp' }, deskBtn(deskIcon('note'), () => addNoteAt(freeSpot()), 'sx-ws-ic', 'Note: pin a new one (or double-click the desk)'), deskBtn(deskIcon('photo'), () => deskFile.click(), 'sx-ws-ic', 'Photo: hang one (or drop or paste it on)'), tableKey,
    deskBtn(deskIcon('label'), () => addFrameAt(), 'sx-ws-ic', 'Label: a light, named area to keep part of the desk tidy'), deskBtn(deskIcon('folder'), () => addHopper(), 'sx-ws-ic', 'Hopper: a folder that opens another board'), deskFile),
  el('div', { class: 'sx-ws-grp' }, undoB, redoB),
  deskMenu);
ws.after(deskBar);
// the bottom: what you can do with what's picked (the note's toolbar, several things at once, the pen); empty, it's not there
const deskCtx = el('div', { class: 'sx-ws-bar sx-ws-ctx', role: 'toolbar', 'aria-label': 'What is picked' }, deskSelGrp);
deskBar.after(deskCtx);
deskBoardTools();
// the top left, beside the ? key: the cassette, the views and your bookmarks (js/music.js and js/view.js add theirs)
const deskTray = el('div', { class: 'sx-tray', role: 'toolbar', 'aria-label': 'Views and bookmarks' }, deskKeys);
deskBar.after(deskTray);
deskUndoState();


/* ---------- picking things ---------- */
let selId = null; // the one you touched last (its toolbar shows, bookmarks go to it)
const picked = new Set();
const els = new Map();
const B_ = () => S.board;
const itemOf = id => B_().items.find(x => x.id === id);
// a group: picking one of them picks them all, so they move (and duplicate, and go) together
const groupOf = id => { const it = itemOf(id); return it && it.group ? B_().items.filter(x => x.group === it.group && x.board === it.board).map(x => x.id) : [id]; };
function select(id, add) {
  if (id == null) { picked.clear(); selId = null; }
  else if (add && picked.has(id)) { groupOf(id).forEach(x => picked.delete(x)); selId = picked.size ? [...picked].pop() : null; }
  else { if (!add) picked.clear(); groupOf(id).forEach(x => picked.add(x)); selId = id; }
  els.forEach((c, k) => c.classList.toggle('sel', picked.has(k)));
  noteBarTo(selId); deskSelBar(); selBoxUpdate();
}
function deskSelBar() {
  const items = [...picked].map(itemOf).filter(Boolean);
  deskSelGrp.hidden = items.length < 2;
  selCount.textContent = items.length + ' picked';
  const groups = new Set(items.map(i => i.group || null));
  grpB.hidden = items.length < 2 || groups.size === 1 && !groups.has(null); ungrpB.hidden = !items.some(i => i.group);
}
function selBoxUpdate() { // a dashed box around several picked things
  if (picked.size < 2) { selBox.hidden = true; return; }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  picked.forEach(id => { const c = els.get(id); if (!c) return; x0 = Math.min(x0, c.offsetLeft); y0 = Math.min(y0, c.offsetTop); x1 = Math.max(x1, c.offsetLeft + c.offsetWidth); y1 = Math.max(y1, c.offsetTop + c.offsetHeight); });
  if (!isFinite(x0)) { selBox.hidden = true; return; }
  Object.assign(selBox.style, { left: x0 - 14 + 'px', top: y0 - 14 + 'px', width: x1 - x0 + 28 + 'px', height: y1 - y0 + 28 + 'px' }); selBox.hidden = false;
}
function removeItems(ids) { const set = new Set(ids), B = B_(); B.items = B.items.filter(x => !set.has(x.id)); B.links = B.links.filter(l => !l.some(i => set.has(i))); }
async function deskDuplicate() { // Ctrl+D: a copy of what's picked, just beside it (photos too); strings and bookmarks stay with the original
  const B = B_(), src = [...picked].map(itemOf).filter(it => it && it.board === B.cur); if (!src.length) return;
  deskMark(); const now = Date.now(), ids = [], gmap = {};
  for (const [k, it] of src.entries()) {
    const c = JSON.parse(JSON.stringify(it)); c.id = ((String(it.id).match(/^[a-z]+/i) || ['n'])[0]) + now + '-' + k; c.x = it.x + 28; c.y = it.y + 28; delete c.key;
    if (c.group) c.group = gmap[c.group] || (gmap[c.group] = 'g' + now + '-' + k); // (a copied group is a group of its own)
    if (it.type === 'photo') { try { const p = await PHOTOS.get(it.id); if (p) await PHOTOS.put(c.id, p); } catch (e) { continue; } }
    B.items.push(c); ids.push(c.id);
  }
  save(); drawBoard(); select(ids[0]); ids.slice(1).forEach(id => { if (!picked.has(id)) select(id, true); }); deskSfx('pin');
}
function deskGroup() { if (picked.size < 2) return; deskMark(); const g = 'g' + Date.now(); picked.forEach(id => { const it = itemOf(id); if (it) it.group = g; }); save(); deskSfx('tie'); deskSelBar(); deskToast('Grouped: they move together now'); }
function deskUngroup() { if (![...picked].some(id => (itemOf(id) || {}).group)) return; deskMark(); picked.forEach(id => { const it = itemOf(id); if (it) delete it.group; }); save(); deskSfx('pick'); deskSelBar(); } // (they stay picked, just no longer tied together)
function deskDelete() { const ids = [...picked].filter(id => { const it = itemOf(id); return !(it && it.lock); }); if (!ids.length) { if (picked.size) deskToast('That label is locked'); return; } deskMark(); deskSfx('pick'); removeItems(ids); select(null); save(); drawBoard(); }
function deskSelectAll() { picked.clear(); B_().items.filter(it => it.board === B_().cur).forEach(it => picked.add(it.id)); selId = [...picked].pop() || null; els.forEach((c, k) => c.classList.toggle('sel', picked.has(k))); noteBarTo(null); deskSelBar(); selBoxUpdate(); }

/* ---------- what's on the desk ---------- */
function deskDrawKeys() {
  const items = B_().items.filter(it => it.board === B_().cur && it.key).sort((a, b) => a.key - b.key);
  deskKeys.replaceChildren(...items.map(it => { const b = deskBtn(String(it.key), () => glideToItem(it)); b.title = (it.text || { photo: 'A photo', draw: 'A drawing', frame: 'A label', hop: 'A folder', wb: 'A whiteboard' }[it.type] || 'A note').slice(0, 60); return b; }));
}
function setKey(it, n) { // one number, one thing (on this board)
  deskMark(); const had = it.key === n;
  B_().items.forEach(x => { if (x.board === it.board && x.key === n) delete x.key; });
  if (!had) it.key = n; save(); drawBoard();
}
const keyBadge = it => it.key ? el('span', { class: 'sx-bkey', title: 'Press ' + it.key + ' to come here' }, String(it.key)) : null;
function removeOne(it) { deskMark(); deskSfx('pick'); removeItems([it.id]); picked.delete(it.id); if (selId === it.id) selId = null; save(); drawBoard(); }
// instant film comes in three shapes: square (the classic), wide (for landscape photos) and mini (for tall ones).
// The photo window takes the photo's own shape within each film's range, so 16:9, 3:2, 4:3, 3:4 and 9:16 all show whole
function polFormat(c, ar) {
  const f = ar >= 1.15 ? 'wide' : ar <= .87 ? 'mini' : 'square', win = f === 'wide' ? Math.min(2, ar) : f === 'mini' ? Math.max(.56, ar) : 1;
  c.classList.toggle('sx-pol-wide', f === 'wide'); c.classList.toggle('sx-pol-mini', f === 'mini'); c.style.setProperty('--par', win);
}
function paperCard(it) { // a note or a photo
  const x = el('button', { type: 'button', class: 'sx-bnote-x', 'aria-label': it.type === 'photo' ? 'Take the photo down' : 'Take the note down', onclick: () => removeOne(it) }, '×');
  const txt = el('div', { class: it.type === 'photo' ? 'sx-cap-t' : 'sx-note-t', contenteditable: 'true', spellcheck: 'false', 'aria-label': it.type === 'photo' ? 'Caption' : 'Note', 'data-ph': it.type === 'photo' ? 'Write a caption...' : 'Write something...' }, it.text || '');
  txt.addEventListener('input', () => { it.text = txt.innerText.slice(0, 2000); save(); });
  const pin = el('span', { class: 'sx-pin', title: 'Drag to something else to tie a string' });
  const style = 'left:' + it.x + 'px;top:' + it.y + 'px;--tilt:' + tilt(it.id) + 'deg' + (it.type === 'note' ? noteStyle(it) : '');
  if (it.type === 'photo') {
    const img = el('img', { alt: it.text || 'A photo', draggable: 'false' });
    PHOTOS.get(it.id).then(src => { if (src) img.src = src; else img.alt = 'This photo is missing (it lives in the browser it was added in).'; drawStrings(); }).catch(() => {});
    const c = el('div', { class: 'sx-bcard sx-polaroid', 'data-id': it.id, style }, ...[pin, x, keyBadge(it), el('div', { class: 'sx-pol-img' }, img), txt].filter(Boolean));
    if (it.ar) polFormat(c, it.ar);
    img.addEventListener('load', () => { // the frame takes the photo's shape (measured once, then remembered)
      const ar = img.naturalWidth && img.naturalHeight ? Math.round(img.naturalWidth / img.naturalHeight * 1000) / 1000 : 1;
      if (it.ar !== ar) { it.ar = ar; save(); } polFormat(c, ar); drawStrings(); selBoxUpdate();
      const t0 = devFresh.get(it.id), age = t0 ? performance.now() - t0 : 1e9; // (a new photo develops: milky first, the picture coming up over a couple of seconds)
      if (age < 2600) { c.style.setProperty('--dev-at', -age + 'ms'); c.classList.add('sx-dev'); } });
    return c;
  }
  const c = el('div', { class: 'sx-bcard sx-bnote', 'data-id': it.id, style }, ...[pin, x, keyBadge(it), txt].filter(Boolean)); noteSetup(it, txt, c); // a small document (js/ui/notes.js)
  return c;
}
function drawCard(it) { // a drawing: only its strokes can be grabbed, so a circle around a note leaves the note clickable
  return el('div', { class: 'sx-bcard sx-bdraw', 'data-id': it.id, style: 'left:' + it.x + 'px;top:' + it.y + 'px;width:' + it.w + 'px;height:' + it.h + 'px;--tilt:0deg' }, ...[drawSvg(it), keyBadge(it)].filter(Boolean));
}
const FRAME_INKS = ['amber', 'mint', 'coral', 'yellow', 'cream', 'green'];
function frameCard(it) { // a frame: a labelled area. Its name is the handle; the inside lets clicks through to the desk
  const label = el('div', { class: 'sx-frame-t', contenteditable: 'true', spellcheck: 'false', 'aria-label': 'Label name', 'data-ph': 'Name this area' }, it.text || '');
  label.addEventListener('input', () => { it.text = label.textContent.replace(/\s+/g, ' ').slice(0, 80); save(); }); // (textContent: the name as typed, not as shown in capitals)
  const sws = el('span', { class: 'sx-frame-sw' }, ...FRAME_INKS.map(k => el('button', { type: 'button', class: 'sx-sw' + ((it.color || 'amber') === k ? ' on' : ''), style: 'background:' + inkOf(k), 'aria-label': k + ' label', title: k, onclick: () => { deskMark(); it.color = k; save(); drawBoard(); } })));
  const x = el('button', { type: 'button', class: 'sx-bnote-x', 'aria-label': 'Take the label away', title: 'Take the label away', onclick: () => removeOne(it) }, '×');
  // the lock: a locked label stays put (dragging it moves the desk instead), can't be resized, and isn't deleted with the rest
  const lk = el('button', { type: 'button', class: 'sx-frame-lock', 'aria-pressed': String(!!it.lock), 'aria-label': it.lock ? 'Unlock the label' : 'Lock the label in place', title: it.lock ? 'Locked: click to unlock' : 'Lock it in place', onclick: () => { deskMark(); if (it.lock) delete it.lock; else it.lock = true; save(); deskSfx(it.lock ? 'pin' : 'pick'); drawBoard(); } });
  lk.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="7" width="9" height="7" rx="1.5"/><path d="' + (it.lock ? 'M5.5 7V5a2.5 2.5 0 0 1 5 0v2' : 'M5.5 7V5a2.5 2.5 0 0 1 4.9-.7') + '"/></svg>';
  return el('div', { class: 'sx-bcard sx-bframe' + (it.lock ? ' locked' : ''), 'data-id': it.id, style: 'left:' + it.x + 'px;top:' + it.y + 'px;width:' + it.w + 'px;height:' + it.h + 'px;--tilt:0deg;--fc:' + inkOf(it.color || 'amber') },
    el('div', { class: 'sx-frame-h' }, ...[keyBadge(it), label, sws, lk, x].filter(Boolean)),
    ...['t', 'r', 'b', 'l'].map(k => el('span', { class: 'sx-fe sx-fe-' + k, title: 'Drag to move the label' })), // its edges are handles too
    el('span', { class: 'sx-resize', title: 'Drag to resize' }));
}
// (versions 49 and 50 lost the place of anything dragged: those come back in a neat row near the middle of their board, to be put where they belong)
{ const lost = {}; S.board.items.forEach(it => { if (Number.isFinite(it.x) && Number.isFinite(it.y)) return; const n = lost[it.board] = (lost[it.board] || 0) + 1; it.x = -300 + ((n - 1) % 4) * 340; it.y = 260 + Math.floor((n - 1) / 4) * 300; }); if (Object.keys(lost).length) save(); }
{ const B = S.board; B.items = B.items.filter(it => it.type !== 'sticker'); B.items.forEach(it => { delete it.hold; delete it.on; }); } // (stickers and holders were here once)
// the stacking: each card gets its own level, two apart in the order they lie on the desk (the last one on top), and each string
// sits one above the higher of the two cards it ties: over both of them, but under anything lying on top of them
// arriving: the card you've been brought to (a bookmark, Find, Tab along the strings) gives one small settle, so your eye lands on it
function arriveAt(id) {
  const c = els.get(id); if (!c || stillUI()) return;
  c.animate([{ scale: '1' }, { scale: '1.045', offset: .35 }, { scale: '.99', offset: .7 }, { scale: '1' }], { duration: 380, easing: 'ease-out' });
}
// each board remembers where you were on it: leaving a board keeps its view, and coming back puts you there again
function boardViewKeep(id) { const b = S.board.boards.find(x => x.id === id); if (b) b.view = { x: Math.round(cam.x), y: Math.round(cam.y), z: +cam.z.toFixed(3) }; }
function boardViewBack() {
  const b = S.board.boards.find(x => x.id === S.board.cur), v = b && b.view; if (!v || !Number.isFinite(v.x)) return false;
  cancelAnimationFrame(glideRaf); Object.assign(cam, { x: v.x, y: v.y, z: Math.min(1.6, Math.max(.35, v.z || 1)) }); placeCam(); camSettle(); camSave(); return true;
}
let layerTop = 0;
const zOf = c => +c.style.zIndex || 0;
// press a card and it comes to the front: the top level, and the end of the desk's list so it stays on top next time
// (labels are areas under everything, so they stay where they are)
function deskRaise(it, c) {
  if (it.type === 'frame') return;
  const B = B_();
  if (it.group) { // a group comes forward as one, keeping its own order inside (a small photo on a note stays on the note)
    const ms = B.items.filter(x => x.group === it.group && x.board === it.board && x.type !== 'frame' && els.get(x.id));
    if (ms.every((x, i) => zOf(els.get(x.id)) === layerTop - 2 * (ms.length - 1 - i))) return;
    ms.forEach(x => { els.get(x.id).style.zIndex = String(layerTop += 2); });
    const set = new Set(ms); B.items = B.items.filter(x => !set.has(x)).concat(ms); save(); strUpdate(); return;
  }
  if (zOf(c) === layerTop) return;
  c.style.zIndex = String(layerTop += 2);
  B.items = B.items.filter(x => x !== it); B.items.push(it); save(); strUpdate();
}
function drawBoard() {
  const B = B_(), items = B.items.filter(it => it.board === B.cur);
  els.clear(); carried.clear(); strInner.clear(); world.classList.remove('carrying'); layer.replaceChildren(); frameLayer.replaceChildren();
  [...picked].forEach(id => { if (!items.some(i => i.id === id)) picked.delete(id); }); if (selId && !picked.has(selId)) selId = null;
  items.forEach(it => {
    // (whiteboards and folders come from files loaded after this one: until they're in, those wait for start.js to draw the desk again)
    if (it.type === 'wb' && typeof wbCard !== 'function' || it.type === 'hop' && typeof hopCard !== 'function' || it.type === 'tbl' && typeof tblCard !== 'function') return;
    const c = it.type === 'frame' ? frameCard(it) : it.type === 'draw' ? drawCard(it) : it.type === 'wb' ? wbCard(it) : it.type === 'hop' ? hopCard(it) : it.type === 'tbl' ? tblCard(it) : paperCard(it);
    if (picked.has(it.id)) c.classList.add('sel');
    els.set(it.id, c); (it.type === 'frame' ? frameLayer : layer).append(c);
  });
  layerTop = 0; layer.querySelectorAll(':scope > .sx-bcard').forEach(c => { layerTop += 2; c.style.zIndex = String(layerTop); });
  deskBoardTools(); deskDrawKeys(); noteBarTo(selId); deskSelBar();
  requestAnimationFrame(() => { drawStrings(); selBoxUpdate(); });
}
const posOf = id => { const k = carried.get(id); if (k) return { x: k.it.x + k.w / 2, y: k.it.y + 10 }; // (being carried: from its own numbers, no measuring)
  const c = els.get(id); return c ? { x: c.offsetLeft + c.offsetWidth / 2, y: c.offsetTop + 10 } : null; };
// what's being carried slides as its own layer (translate) and only takes its new place on the page when you let go:
// moving it on the page every frame would make the browser lay out and repaint the desk under it every frame
const carried = new Map(); // id -> { it, w }
const strInner = new Set(); // the strings tied at both ends to carried cards: they keep their shape, so they slide instead of being redrawn
// a nudge to a card's swing (when it's picked up, and when it's put down)
function swingKick(c, v) { if (stillUI()) return; const s = c._sw = c._sw || { a: 0, v: 0, t: 0 }; s.v += v; s.t = 0; s.held = false; swinging.add(c); c.classList.add('swinging'); if (!swingRaf) swingRaf = requestAnimationFrame(swingStep); }
// strings: a gentle sag between two pins, plus a wobble when either end moves
const wob = new Map(), lk = l => l[0] + '|' + l[1];
const pathD = (a, b, w) => { const mx = (a.x + b.x) / 2 + (w ? w.x : 0), my = (a.y + b.y) / 2 + 36 + Math.hypot(b.x - a.x, b.y - a.y) * .15 + (w ? w.y : 0); return 'M' + a.x + ' ' + a.y + ' Q' + mx + ' ' + my + ' ' + b.x + ' ' + b.y; };
let strNodes = [], strTemp = null, strTempP = null;
// strings rest faint, so the words under them read; point at a card (or pick it) and its strings light up full red over everything
let strOver = null;
function strHot() {
  strNodes.forEach(n => { const on = n.l.some(id => id === strOver || picked.has(id)); if (n.hot === on) return; n.hot = on;
    n.p.classList.toggle('hot', on); });
  // and the cards tied to what you've picked get a faint red outline: the notes that go with this one
  const kin = new Set(); B_().links.forEach(l => { if (picked.has(l[0]) && !picked.has(l[1])) kin.add(l[1]); if (picked.has(l[1]) && !picked.has(l[0])) kin.add(l[0]); });
  (strKin || []).forEach(id => { if (!kin.has(id)) { const c = els.get(id); if (c) c.classList.remove('kin'); } });
  kin.forEach(id => { const c = els.get(id); if (c && !c.classList.contains('kin')) c.classList.add('kin'); }); strKin = kin;
}
var strKin; // (var: strHot can run before this line has)
// walk the strings: with a card picked, Tab goes through every card tied to it, directly or through others, one by one.
// It follows a string as far as it goes; at a dead end it goes back to the nearest card with a string not yet followed
// and takes that one, until it has been everywhere. Shift+Tab steps back through the same order.
// (where a card has several strings, it takes the shortest first: the nearest card, measured centre to centre)
const walk = { root: null, order: [], at: 0 };
function walkOrder(root) {
  const B = B_(), seen = new Set([root]), order = [root], mid = id => { const c = els.get(id); return c ? [c.offsetLeft + c.offsetWidth / 2, c.offsetTop + c.offsetHeight / 2] : [0, 0]; };
  const next = id => B.links.filter(l => l.includes(id)).map(l => l[0] === id ? l[1] : l[0]).filter(n => els.has(n) && !seen.has(n))
    .map(n => { const p = mid(id), q = mid(n); return [n, Math.hypot(q[0] - p[0], q[1] - p[1])]; }).sort((a, b) => a[1] - b[1]).map(x => x[0]);
  const go = id => next(id).forEach(n => { if (seen.has(n)) return; seen.add(n); order.push(n); go(n); });
  go(root); return order;
}
function strWalk(back) {
  const cur = selId;
  if (walk.order[walk.at] !== cur) { walk.root = cur; walk.order = walkOrder(cur); walk.at = 0; } // (a new walk starts from wherever you are)
  else { const o = walkOrder(walk.root), i = o.indexOf(cur); if (i >= 0) { walk.order = o; walk.at = i; } } // (strings tied or cut since: the order follows)
  if (walk.order.length < 2) return false; // (nothing tied to it: Tab does what it usually does)
  let i = walk.at + (back ? -1 : 1);
  if (i >= walk.order.length) { i = 0; deskToast('Been through all ' + walk.order.length + ': back to the start'); }
  if (i < 0) { i = walk.order.length - 1; deskToast('Back round to the last one'); }
  walk.at = i; const id = walk.order[i], it = itemOf(id), c = els.get(id); if (!it || !c) return true;
  select(id); deskRaise(it, c); glideTo(it.x + c.offsetWidth / 2, it.y + c.offsetHeight / 2, cam.z, true, () => arriveAt(id)); // (quietly)
  return true;
}
layer.addEventListener('pointerover', e => { const c = e.target.closest('.sx-bcard'); const id = c ? c.dataset.id : null; if (id !== strOver) { strOver = id; strHot(); if (c && !e.buttons) brushCard(c, brushV.x); } });
// brushing past: the mouse grazes a note or photo and it rocks on its pin a little; it plucks a string and the string wobbles.
// (only when the pointer comes onto one, and only while it moves: nothing runs while the desk is still)
// the mouse's speed, smoothed (the browser gives no movement on the event for arriving somewhere, only on moves)
const brushV = { x: 0, y: 0, t: 0, cx: null, cy: null };
addEventListener('pointermove', e => { const dt = Math.max(8, e.timeStamp - brushV.t), k = 16 / dt, mx = brushV.cx === null || dt > 200 ? 0 : e.clientX - brushV.cx, my = brushV.cx === null || dt > 200 ? 0 : e.clientY - brushV.cy;
  brushV.t = e.timeStamp; brushV.cx = e.clientX; brushV.cy = e.clientY; brushV.x = brushV.x * .5 + mx * k * .5; brushV.y = brushV.y * .5 + my * k * .5; }, { passive: true, capture: true });
function brushCard(c, mx) {
  if (stillUI() || !(c.classList.contains('sx-bnote') || c.classList.contains('sx-polaroid')) || c.classList.contains('lift') || c.contains(document.activeElement)) return;
  const k = Math.max(-.8, Math.min(.8, (mx || 0) * .06)); if (Math.abs(k) < .08) return;
  const s = c._sw = c._sw || { a: 0, v: 0, t: 0 }; s.v += k; s.t = 0; s.held = false;
  swinging.add(c); c.classList.add('swinging'); if (!swingRaf) swingRaf = requestAnimationFrame(swingStep);
}
function brushString(l, e) {
  if (stillUI() || e.buttons) return;
  const k = lk(l), w = wob.get(k) || { x: 0, y: 0, vx: 0, vy: 0 };
  w.vx += Math.max(-6, Math.min(6, brushV.x * .35)); w.vy += Math.max(-6, Math.min(6, brushV.y * .35)); wob.set(k, w);
  if (!wobRaf) wobRaf = requestAnimationFrame(() => wobStep());
}
layer.addEventListener('pointerleave', () => { if (strOver) { strOver = null; strHot(); } });
{ const selectStrBase = select; select = function () { const r = selectStrBase.apply(this, arguments); strHot(); return r; }; } // (picking a card lights its strings too)
function drawStrings(temp) {
  const B = B_(); strings.replaceChildren(); strNodes.forEach(n => n.sv.remove()); strNodes = []; strTempP = null; strTemp = temp || null;
  B.links.forEach(l => {
    if (!els.has(l[0]) || !els.has(l[1])) return;
    const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('class', 'sx-string');
    const hit = document.createElementNS(SVGNS, 'path'); hit.setAttribute('class', 'sx-string-hit');
    hit.addEventListener('pointerdown', e => e.stopPropagation());
    hit.addEventListener('pointerenter', e => brushString(l, e)); // (plucked as the mouse passes over it)
    hit.addEventListener('click', () => { deskMark(); B.links = B.links.filter(x => x !== l); wob.delete(lk(l)); deskSfx('tear'); save(); drawStrings(); });
    const sv = document.createElementNS(SVGNS, 'svg'); sv.setAttribute('class', 'sx-strand'); sv.append(hit, p); layer.append(sv); // (its own sheet, at its own level)
    strNodes.push({ l, p, hit, sv, z: -1 }); });
  strUpdate(); strHot();
}
function strUpdate(only) { // only: a Set of card ids, to redraw just the strings tied to them (while you carry things, or while strings sway)
  // measure every end first, then redraw: measuring after each redraw would make the browser lay the page out again every time
  let nodes = only instanceof Set ? strNodes.filter(n => only.has(n.l[0]) || only.has(n.l[1])) : strNodes;
  if (strInner.size) nodes = nodes.filter(n => !strInner.has(n)); // (a string between two carried cards just slides along with them)
  const ds = nodes.map(n => { const a = posOf(n.l[0]), b = posOf(n.l[1]); return a && b ? pathD(a, b, wob.get(lk(n.l))) : null; });
  const back = root.dataset.strings === 'back', zs = nodes.map(n => { const a = els.get(n.l[0]), b = els.get(n.l[1]); return back ? 1 : a && b ? Math.max(zOf(a), zOf(b)) + 1 : 1; }); // (behind the paper, if that's how you like it: Settings, Look)
  // (the wider line you point at, for hovering and cutting, waits until things are put down)
  nodes.forEach((n, i) => { const d = ds[i]; if (d && d !== n.d) { n.d = d; n.p.setAttribute('d', d); } if (d && !carried.size && d !== n.hd) { n.hd = d; n.hit.setAttribute('d', d); } if (zs[i] !== n.z) { n.z = zs[i]; n.sv.style.zIndex = String(n.z); } }); // (only the strings that moved)
  if (strTemp) { if (!strTempP) { strTempP = document.createElementNS(SVGNS, 'path'); strTempP.setAttribute('class', 'sx-string sx-string-temp'); strings.append(strTempP); } strTempP.setAttribute('d', pathD(strTemp.a, strTemp.b)); }
  else if (strTempP) { strTempP.remove(); strTempP = null; }
  if (picked.size > 1 && !selShift) selBoxUpdate();
}
let wobRaf = 0;
function wobKick(id, vx, vy) { // the middle of the string lags behind the end you move (id: one card, or a Set of them)
  if (stillUI()) return; const has = id instanceof Set ? x => id.has(x) : x => x === id;
  B_().links.forEach(l => { if (!has(l[0]) && !has(l[1])) return; const k = lk(l), w = wob.get(k) || { x: 0, y: 0, vx: 0, vy: 0 }; w.vx -= vx * .2; w.vy -= vy * .2; wob.set(k, w); });
  if (wob.size && !wobRaf) wobRaf = requestAnimationFrame(() => wobStep());
}
function wobStep(also) {
  wobRaf = 0; const ids = new Set(also); wob.forEach((w, k) => k.split('|').forEach(x => ids.add(x))); // (the strings that sway, and whatever is being carried)
  wob.forEach((w, k) => { w.vx = (w.vx - w.x * .07) * .9; w.vy = (w.vy - w.y * .07) * .9; w.x = Math.max(-60, Math.min(60, w.x + w.vx)); w.y = Math.max(-60, Math.min(60, w.y + w.vy));
    if (Math.abs(w.x) + Math.abs(w.y) + Math.abs(w.vx) + Math.abs(w.vy) < .1) wob.delete(k); });
  strUpdate(ids); if (wob.size) wobRaf = requestAnimationFrame(() => wobStep());
}
// cards swing from their pin while you carry them, and settle when you let go
const swinging = new Set(); let swingRaf = 0;
function swingTo(c, target, held) {
  if (stillUI()) return;
  const s = c._sw = c._sw || { a: 0, v: 0, t: 0 }; s.t = target; s.held = !!held; swinging.add(c); c.classList.add('swinging'); if (!swingRaf) swingRaf = requestAnimationFrame(swingStep);
}
function swingStep() {
  swingRaf = 0;
  // a pendulum hung from the pin: it leans toward where you're carrying it (the bottom trails behind), and when you stop,
  // the lean lets go and it swings past the middle a few times, smaller each time, before it hangs still
  swinging.forEach(c => { const s = c._sw; s.v = (s.v + (s.t - s.a) * .055) * .9; s.a += s.v; s.t *= s.held ? .8 : 0;
    if (!s.held && Math.abs(s.a) + Math.abs(s.v) < .03) { s.a = 0; s.v = 0; swinging.delete(c); c.classList.remove('swinging'); }
    c.style.setProperty('--swing', s.a.toFixed(2) + 'deg'); });
  if (swinging.size) swingRaf = requestAnimationFrame(swingStep);
}

// a free spot near the middle of the view, never on top of the clock
function freeSpot() {
  let x = cam.x - 100 + (Math.random() - .5) * 200, y = cam.y - 60 + (Math.random() - .5) * 120;
  const cw = corner.offsetWidth / 2 + 60, ch = corner.offsetHeight / 2 + 60;
  if (Math.abs(x + 100) < cw + 100 && Math.abs(y + 60) < ch + 60) x = cw + 20 + Math.random() * 60;
  return { x, y };
}
// a new note or photo lands: it drops in from a little above, its shadow tightens, and it gives a small squash as the pin goes in (with the pin's sound)
function deskLand(id, sfx) {
  const c = els.get(id); if (!c) return;
  if (stillUI()) { if (sfx) deskSfx('pin'); return; }
  c.classList.remove('sx-land'); void c.offsetWidth; c.classList.add('sx-land');
  c.addEventListener('animationend', e => { if (e.target === c) c.classList.remove('sx-land'); });
  if (sfx) setTimeout(() => deskSfx('pin'), 170);
}
function addNoteAt(p) {
  deskMark(); const id = 'n' + Date.now(); B_().items.push({ id, type: 'note', board: B_().cur, x: Math.round(p.x), y: Math.round(p.y), text: '' }); save(); select(id); drawBoard(); deskLand(id, true);
  const t = layer.querySelector('[data-id="' + id + '"] .sx-note-t'); if (t) { editSnap = null; t.focus({ preventScroll: true }); }
}
function addFrameAt(r) {
  if (!r) { const p = freeSpot(); r = { x: p.x, y: p.y - 120, w: 520, h: 340 }; } // (a set size, however far out you've zoomed, away from the clock)
  deskMark(); deskSfx('pin'); const id = 'f' + Date.now();
  B_().items.push({ id, type: 'frame', board: B_().cur, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h), text: '', color: 'amber' }); save(); select(id); drawBoard();
  const t = els.get(id) && els.get(id).querySelector('.sx-frame-t'); if (t) { editSnap = null; t.focus({ preventScroll: true }); }
}
const devFresh = new Map(); // photos just added (id -> when): they develop when they first show, picking up where they were if the desk is drawn again
async function addPhotos(files, at) {
  let k = 0; const added = [];
  for (const f of [...files].filter(f => /^image\//.test(f.type))) {
    try { const src = await shrinkPhoto(f), id = 'p' + Date.now() + '-' + k; await PHOTOS.put(id, src);
      if (!k) deskMark();
      const p = at ? { x: at.x - 120 + k * 30, y: at.y - 40 + k * 30 } : freeSpot(); B_().items.push({ id, type: 'photo', board: B_().cur, x: Math.round(p.x), y: Math.round(p.y), text: '' }); added.push(id); k++; }
    catch (e) { /* not a picture the browser can read: skip it */ }
  }
  if (k) { deskSfx('shutter'); save(); const t = performance.now(); added.forEach(id => { devFresh.set(id, t); setTimeout(() => devFresh.delete(id), 3000); }); drawBoard(); added.forEach(deskLand); }
}
deskFile.addEventListener('change', () => { addPhotos(deskFile.files); deskFile.value = ''; });

/* ---------- pasting: an image you copied (Ctrl+V) hangs as a photo where the mouse is; text on the desk becomes a note ---------- */
let deskMouse = null; // where the mouse last was on the desk (in desk coordinates)
ws.addEventListener('pointermove', e => { deskMouse = { cx: e.clientX, cy: e.clientY }; }, { passive: true });
ws.addEventListener('pointerleave', () => { deskMouse = null; });
const pasteSpot = () => deskMouse ? toWorld(deskMouse.cx, deskMouse.cy) : null;
addEventListener('paste', e => {
  if (page && !page.hidden) return;
  const t = e.target, items = [...((e.clipboardData && e.clipboardData.items) || [])];
  const imgs = items.filter(i => i.kind === 'file' && /^image\//.test(i.type)).map(i => i.getAsFile()).filter(Boolean);
  if (t && t.closest && t.closest('input, textarea')) return; // a text field: the usual paste
  if (imgs.length) { // an image wins, even while you write in a note (it hangs beside it)
    e.preventDefault(); e.stopPropagation();
    const ae = document.activeElement, card = ae && ae.isContentEditable && ae.closest('.sx-bcard');
    const at = pasteSpot() || (card ? { x: card.offsetLeft + card.offsetWidth + 160, y: card.offsetTop + 40 } : null);
    addPhotos(imgs, at).then(() => deskToast(imgs.length === 1 ? 'Pasted a photo' : 'Pasted ' + imgs.length + ' photos'));
    return;
  }
  if (t && t.isContentEditable) return; // writing in a note: its own paste (plain text)
  const text = e.clipboardData && e.clipboardData.getData('text/plain');
  if (text && text.trim()) { // text on the desk: a new note with it
    e.preventDefault(); const p = pasteSpot() || freeSpot();
    deskMark(); const id = 'n' + Date.now(), body = text.trim().slice(0, 2000);
    B_().items.push({ id, type: 'note', board: B_().cur, mt: Date.now(), x: Math.round(p.x - 100), y: Math.round(p.y - 20), text: body, html: noteFromText(body) });
    save(); drawBoard(); select(id); deskLand(id, true); deskToast('Pasted as a note');
  }
}, true);

/* ---------- hands: panning, picking, dragging, strings ---------- */
// a click on a note's words (when you weren't already writing in it) puts the pen right there
function deskWriteIn(id) {
  const c = els.get(id), txt = c && c.querySelector('.sx-note-t, .sx-cap-t, .sx-frame-t, .sx-tc'); if (!txt) return false;
  txt.focus({ preventScroll: true }); const r = document.createRange(); r.selectNodeContents(txt); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  return true;
}
function deskEditAt(txt, x, y) {
  txt.focus({ preventScroll: true });
  let r = null;
  if (document.caretRangeFromPoint) r = document.caretRangeFromPoint(x, y);
  else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); if (p) { r = document.createRange(); r.setStart(p.offsetNode, p.offset); } }
  const inside = r && txt.contains(r.startContainer);
  if (!inside) { r = document.createRange(); r.selectNodeContents(txt); }
  r.collapse(inside); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
}
// pressing on a card never starts a text selection or moves the pen by itself (the gesture decides: drag, or put the pen there)
[layer, frameLayer].forEach(L => L.addEventListener('mousedown', e => {
  if (e.button !== 0 || e.target.closest('.sx-fmt, .sx-bnote-x, .sx-frame-sw')) return;
  const t = e.target.closest('.sx-note-t, .sx-cap-t, .sx-frame-t, .sx-tc');
  if (e.target.closest('.sx-bcard') && (!t || document.activeElement !== t)) e.preventDefault();
}));
// the right button pans, over anything on the desk; only while you're writing in something does it bring up the usual menu there (copy, paste)
const writingIn = t => { const a = document.activeElement; return !!(a && a.isContentEditable && t && a.contains(t)); };
let panMovedAt = 0;
ws.addEventListener('contextmenu', e => { if (!writingIn(e.target) || performance.now() - panMovedAt < 400) e.preventDefault(); });
const centreOf = id => { const c = els.get(id); return c ? { x: c.offsetLeft + c.offsetWidth / 2, y: c.offsetTop + c.offsetHeight / 2 } : null; };
// let go of the desk while it's moving and it keeps sliding, easing to a stop (any press, scroll or glide catches it)
function deskFling(samp) {
  if (stillUI()) return false;
  const now = performance.now(), r = samp.filter(q => now - q[0] < 90); if (r.length < 2 || now - r[r.length - 1][0] > 50) return false; // (held still before letting go: no slide)
  const a = r[0], b = r[r.length - 1], dt = Math.max(8, b[0] - a[0]); let vx = (b[1] - a[1]) / dt, vy = (b[2] - a[2]) / dt;
  const sp = Math.hypot(vx, vy) * cam.z; if (sp < .3) return false; // (in screen px per ms)
  if (sp > 4) { vx *= 4 / sp; vy *= 4 / sp; }
  let prev = now; cancelAnimationFrame(glideRaf);
  const step = t => { const d = Math.min(32, Math.max(0, t - prev)); prev = t; cam.x += vx * d; cam.y += vy * d; const f = Math.pow(.5, d / 150); vx *= f; vy *= f; placeCam();
    if (Math.hypot(vx, vy) * cam.z > .02) glideRaf = requestAnimationFrame(step); else camSave(); };
  glideRaf = requestAnimationFrame(step); return true;
}
function deskPan(e) {
  const s = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y }, samp = []; let moved = false;
  e.preventDefault(); ws.setPointerCapture(e.pointerId); ws.classList.add('panning');
  const move = ev => { if (!moved && Math.hypot(ev.clientX - s.x, ev.clientY - s.y) < 3) return; moved = true; cam.x = s.cx - (ev.clientX - s.x) / cam.z; cam.y = s.cy - (ev.clientY - s.y) / cam.z; placeSoon();
    samp.push([performance.now(), cam.x, cam.y]); if (samp.length > 8) samp.shift(); };
  const up = () => { ws.removeEventListener('pointermove', move); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(k => ws.removeEventListener(k, up)); ws.classList.remove('panning'); if (moved) { panMovedAt = performance.now(); if (!deskFling(samp)) camSave(); } };
  ws.addEventListener('pointermove', move); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(k => ws.addEventListener(k, up));
}
function deskMarquee(e) { // Shift+drag on the empty desk: pick everything the box touches (frames only when wholly inside)
  const a = toWorld(e.clientX, e.clientY); let b = a;
  e.preventDefault(); ws.setPointerCapture(e.pointerId);
  const rect = () => ({ x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y) });
  const move = ev => { b = toWorld(ev.clientX, ev.clientY); const r = rect(); Object.assign(marquee.style, { left: r.x0 + 'px', top: r.y0 + 'px', width: r.x1 - r.x0 + 'px', height: r.y1 - r.y0 + 'px' }); marquee.hidden = false; };
  const up = () => {
    ws.removeEventListener('pointermove', move); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(k => ws.removeEventListener(k, up)); marquee.hidden = true;
    const r = rect(); if (r.x1 - r.x0 < 4 && r.y1 - r.y0 < 4) return;
    els.forEach((c, id) => {
      const x0 = c.offsetLeft, y0 = c.offsetTop, x1 = x0 + c.offsetWidth, y1 = y0 + c.offsetHeight, it = itemOf(id);
      const hit = it && it.type === 'frame' ? x0 >= r.x0 && y0 >= r.y0 && x1 <= r.x1 && y1 <= r.y1 : x0 < r.x1 && x1 > r.x0 && y0 < r.y1 && y1 > r.y0;
      if (hit && !picked.has(id)) select(id, true);
    });
  };
  ws.addEventListener('pointermove', move); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(k => ws.addEventListener(k, up));
}
ws.addEventListener('pointerdown', e => {
  if (page && !page.hidden || e.target.closest('.sx-tapes')) return; // (the cassette panel handles its own pointer: js/music.js)
  cancelAnimationFrame(glideRaf);
  if (e.button === 1 || e.button === 2) { if (!writingIn(e.target)) deskPan(e); return; } // the middle or right button always moves the desk, notes and all
  if (e.button !== 0) return;
  const c = e.target.closest('.sx-bcard');
  if (c) {
    const id = c.dataset.id, it = itemOf(id); if (!it) return;
    const txt = e.target.closest('.sx-note-t, .sx-cap-t, .sx-frame-t, .sx-tc');
    if (txt && document.activeElement === txt) { if (!picked.has(id)) select(id); return; } // already writing in it: the pointer selects text as usual
    if (e.target.closest('.sx-bnote-x, .sx-fmt, .sx-frame-sw, .sx-frame-lock, .sx-wb-h button, .sx-hop-tabb, .sx-tbl-v, .sx-tbl-pick, .sx-from')) { if (!picked.has(id)) select(id); return; } // taking it down, or formatting
    if (e.shiftKey && !e.target.classList.contains('sx-pin')) { e.preventDefault(); select(id, true); return; } // Shift+click: pick it too (or let it go)
    const wasPicked = picked.has(id); // (the first click picks it; a click on it once it's picked starts writing)
    if (!picked.has(id)) select(id); else { selId = id; noteBarTo(id); }
    deskRaise(it, c); // (whatever you press comes to the front)
    e.preventDefault(); c.setPointerCapture(e.pointerId);
    const start = { x: e.clientX, y: e.clientY, l: it.x, t: it.y };
    // one gesture, and it always ends: on release, on cancel, or if the browser takes the pointer away
    // (the mouse can report hundreds of moves a second: only the latest one is acted on, once a frame)
    const track = (move, end) => {
      let over = false, last = null, raf = 0;
      const step = () => { raf = 0; if (last) { const ev = last; last = null; move(ev); } };
      const queue = ev => { last = ev; if (!raf) raf = requestAnimationFrame(step); };
      const fin = ev => { if (over) return; over = true; cancelAnimationFrame(raf); step(); c.removeEventListener('pointermove', queue); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(k => c.removeEventListener(k, fin)); end(ev); };
      c.addEventListener('pointermove', queue); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(k => c.addEventListener(k, fin));
    };
    if (it.lock) { // a locked label stays put: a drag on it moves the desk, a click on its name still lets you rename it
      const s = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y }; let panned = false;
      track(ev => { if (!panned && Math.hypot(ev.clientX - s.x, ev.clientY - s.y) < 4) return; panned = true; ws.classList.add('panning'); cam.x = s.cx - (ev.clientX - s.x) / cam.z; cam.y = s.cy - (ev.clientY - s.y) / cam.z; placeSoon(); },
        ev => { ws.classList.remove('panning'); if (panned) { camSave(); return; } if (ev.type === 'pointerup' && txt && wasPicked) deskEditAt(txt, ev.clientX, ev.clientY); });
      return;
    }
    if (e.target.classList.contains('sx-resize')) { // the corner: make it bigger or smaller
      const w0 = c.offsetWidth, h0 = c.offsetHeight, snap = deskSnap(), fr = it.type === 'frame' || it.type === 'wb', lim = it.type === 'frame' ? [200, 6000, 140, 4000] : it.type === 'wb' ? [260, 4000, 180, 3000] : it.type === 'tbl' ? [240, 1400, 80, 2000] : [160, 760, 90, 960];
      c.classList.add('sizing'); if (!fr) c.classList.add('sized');
      track(ev => { it.w = Math.round(Math.max(lim[0], Math.min(lim[1], w0 + (ev.clientX - start.x) / cam.z))); it.h = Math.round(Math.max(lim[2], Math.min(lim[3], h0 + (ev.clientY - start.y) / cam.z)));
        c.style.width = it.w + 'px'; c.style.height = it.h + 'px'; strUpdate(); },
        () => { c.classList.remove('sizing'); if (deskSnap() !== snap) deskMark(snap); save(); });
      return;
    }
    if (e.target.classList.contains('sx-pin')) { // the pin: pull a string to something else
      deskSfx('pin'); const a = posOf(id);
      track(ev => { strTemp = { a, b: toWorld(ev.clientX, ev.clientY) }; strUpdate(); }, ev => {
        strTemp = null;
        const under = ev.type === 'pointerup' && document.elementsFromPoint(ev.clientX, ev.clientY).map(n => n.closest && n.closest('.sx-bcard')).find(n => n && n !== c);
        if (under && !B_().links.some(l => l.includes(id) && l.includes(under.dataset.id))) { deskMark(); const l = [id, under.dataset.id]; B_().links.push(l); save(); if (!stillUI()) wob.set(lk(l), { x: 0, y: -34, vx: 0, vy: 0 }); deskSfx('tie'); } // it drops into its sag and bounces
        drawStrings(); if (wob.size && !wobRaf) wobRaf = requestAnimationFrame(() => wobStep()); });
      return;
    }
    // anywhere else on it, the words included: a drag moves it (with everything picked);
    // a click without moving puts the pen there
    let dragging = false, lx = e.clientX, ly = e.clientY, lt = e.timeStamp, vx = 0, vy = 0, movers = [], moverIds = new Set(), snap = null;
    track(ev => {
      if (!dragging) {
        if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 4) return;
        dragging = true; snap = deskSnap(); c.classList.add('lift'); deskSfx('lift'); // (a low tock, like pulling it off its pin)
        const ids = new Set(picked.has(id) ? picked : [id]);
        const at = new Map(B_().items.map((x, i) => [x.id, i]));
        movers = [...ids].map(mid => ({ it: itemOf(mid), c: els.get(mid) })).filter(m => m.it && m.c && !m.it.lock).map(m => Object.assign(m, { x: m.it.x, y: m.it.y })) // (a locked label stays behind)
          .sort((a, b) => at.get(a.it.id) - at.get(b.it.id)); // (in the order they lie, so what was on top stays on top)
        world.classList.add('carrying'); moverIds = new Set(movers.map(m => m.it.id)); movers.forEach(m => { carried.set(m.it.id, { it: m.it, w: m.c.offsetWidth }); m.c.classList.add('carry', 'lift'); }); // (everything carried lifts off the board with its shadow) selShift = !selBox.hidden ? { x: selBox.offsetLeft, y: selBox.offsetTop } : null;
        movers.forEach(m => { if (m.it.type !== 'frame') m.c.style.zIndex = String(layerTop += 2); }); // (raised with z-index: moving it in the page would make the browser drop the pointer)
        // carried things hold still while they move (the swing and the sway play when you pick them up and put them down):
        // the cards slide as finished layers, strings inside the group slide with them, and only strings reaching out are redrawn
        B_().links.forEach(l => { if (moverIds.has(l[0]) || moverIds.has(l[1])) wob.delete(lk(l)); });
        strUpdate(moverIds); strNodes.forEach(n => { if (moverIds.has(n.l[0]) && moverIds.has(n.l[1])) strInner.add(n); });
        movers.forEach((m, i) => { if (m.it.type === 'note' || m.it.type === 'photo') swingKick(m.c, (i % 2 ? -1 : 1) * .9); }); // (a little wobble as it comes off the board)
        const ae = document.activeElement; if (ae && ae.isContentEditable && !c.contains(ae)) ae.blur();
      }
      const dx = (ev.clientX - start.x) / cam.z, dy = (ev.clientY - start.y) / cam.z;
      const rx = Math.round(dx), ry = Math.round(dy), tr = rx + 'px ' + ry + 'px';
      movers.forEach(m => { m.it.x = m.x + rx; m.it.y = m.y + ry; m.c.style.translate = tr; });
      strInner.forEach(n => { n.sv.style.translate = tr; });
      const dt = Math.max(8, ev.timeStamp - lt), ddx = ev.clientX - lx, ddy = ev.clientY - ly; lx = ev.clientX; ly = ev.clientY; lt = ev.timeStamp;
      vx = vx * .55 + (ddx * 16 / dt) * .45; vy = vy * .55 + (ddy * 16 / dt) * .45; // speed per frame, smoothed, however unevenly the mouse reports
      if (selShift) selBox.style.translate = tr; // (the box slides along as a layer: no measuring, no layout)
      strUpdate(moverIds); // (only the strings reaching out to something that stays put)
    }, ev => {
      if (dragging) {
        movers.forEach(m => { m.c.style.left = m.it.x + 'px'; m.c.style.top = m.it.y + 'px'; m.c.style.translate = ''; m.c.classList.remove('carry'); }); carried.clear(); world.classList.remove('carrying'); selBox.style.translate = ''; // (now it takes its place)
        strInner.forEach(n => { n.sv.style.translate = ''; }); strInner.clear();
        c.classList.remove('lift'); movers.forEach(m => m.c.classList.remove('lift')); selShift = null; deskSfx('drop'); strUpdate();
        // let go: each card swings on in the way it was going (more the faster it moved; a still mouse gives just a settle), and the strings bounce
        const fresh = Math.max(0, 1 - (ev.timeStamp - lt) / 120), sx = vx * fresh, sy = vy * fresh;
        movers.forEach((m, i) => { if (m.it.type === 'note' || m.it.type === 'photo') swingKick(m.c, Math.max(-2, Math.min(2, -sx * .12)) + (i % 2 ? -.5 : .5)); });
        wobKick(moverIds, sx * 1.5 / cam.z, (sy * 1.5 - 14) / cam.z);
        const ids = new Set(movers.map(m => m.it.id)); B_().items = B_().items.filter(x => !ids.has(x.id)).concat(movers.map(m => m.it)); // what you moved is on top now
        if (snap && deskSnap() !== snap) deskMark(snap); save(); return;
      }
      if (ev.type === 'pointerup' && it.type === 'hop') { hopGo(it); return; } // a click on a folder: through it
      if (ev.type !== 'pointerup' || !txt) return;
      if (it.type === 'note' && noteTickAt(txt, ev.clientX, ev.clientY)) return; // a checklist box (it ticks on the first click)
      if (wasPicked) deskEditAt(txt, ev.clientX, ev.clientY); // picked already: the pen goes where you clicked
    });
    return;
  }
  if (e.target.closest('button, input, select, a, [contenteditable]')) return; // the clock's own buttons
  if (e.shiftKey) { deskMarquee(e); return; }
  // the empty desk (or the clock's face): let go of what's picked, and move the camera
  select(null); if (document.activeElement && document.activeElement.isContentEditable) { document.activeElement.blur(); getSelection().removeAllRanges(); } // put the pen down, and let go of any highlighted words
  deskPan(e);
});
ws.addEventListener('dblclick', e => { if (e.target.closest('.sx-bcard, .sx-corner, .sx-tapes')) return; addNoteAt((p => ({ x: p.x - 100, y: p.y - 20 }))(toWorld(e.clientX, e.clientY))); });
ws.addEventListener('wheel', e => { // zoom around the pointer
  if (page && !page.hidden || e.target.closest('.sx-shelf, .sx-mus')) return; // (its lists scroll)
  e.preventDefault(); cancelAnimationFrame(glideRaf);
  const before = toWorld(e.clientX, e.clientY), z = Math.min(1.6, Math.max(.35, cam.z * Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0015))));
  cam.z = z; const after = toWorld(e.clientX, e.clientY); cam.x += before.x - after.x; cam.y += before.y - after.y; placeSoon(); camSave();
}, { passive: false });
ws.addEventListener('dragover', e => { if ([...(e.dataTransfer.items || [])].some(i => i.kind === 'file')) { e.preventDefault(); ws.classList.add('drop'); } });
ws.addEventListener('dragleave', () => ws.classList.remove('drop'));
ws.addEventListener('drop', e => { e.preventDefault(); ws.classList.remove('drop'); const fs = e.dataTransfer.files;
  if ([...fs].some(f => /^audio\//.test(f.type)) && typeof musicAdd === 'function') musicAdd(fs, mode === 'focus' ? 'A' : 'B'); // music goes on the side that's playing (js/music.js)
  addPhotos(fs, toWorld(e.clientX, e.clientY)); });
addEventListener('resize', placeCam);

/* ---------- keys ---------- */
// (registered on window in the capture phase so it runs before the timer's own keys)
addEventListener('keydown', e => {
  const t = e.target;
  if (t && t.isContentEditable) { // writing: the keys are yours, Esc puts the pen down (Enter too, for a frame's name)
    if (t.classList.contains('sx-frame-t') && e.key === 'Enter') { e.preventDefault(); t.blur(); }
    if (t.classList.contains('sx-tc')) { tblKeys(e, t); e.stopPropagation(); return; } // a table's cell: moving between cells (js/table.js)
    noteKeys(e, t);
    if (e.key === 'Escape') { e.preventDefault(); t.blur(); }
    e.stopPropagation(); return;
  }
  if ((t && t.closest && t.closest('input, select, textarea')) || page && !page.hidden) return;
  const stop = () => { e.preventDefault(); e.stopPropagation(); };
  { const k = noteShortcut(e); if (k && selNote()) { stop(); noteRunAll(k); return; } } // a note picked: its formatting keys work without clicking into it
  if ((e.ctrlKey || e.metaKey) && !e.altKey) {
    if (e.code === 'KeyZ') { stop(); if (e.shiftKey) deskRedo(); else deskUndo(); }
    else if (e.code === 'KeyY') { stop(); deskRedo(); }
    else if (e.code === 'KeyA') { stop(); deskSelectAll(); }
    else if (e.code === 'KeyG') { stop(); if (e.shiftKey) deskUngroup(); else deskGroup(); }
    else if (e.code === 'KeyD' && !e.shiftKey) { stop(); deskDuplicate(); }
    return;
  }
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if ((e.key === 'Delete' || e.key === 'Backspace') && picked.size) { stop(); deskDelete(); return; }
  if (e.key === 'Tab' && selId && strWalk(e.shiftKey)) { stop(); return; } // follow the strings from the picked card
  if (e.key === 'Enter' && !e.shiftKey && picked.size === 1 && deskWriteIn(selId)) { stop(); return; } // Enter: start writing in it, at the end
  const m = /^Digit([0-9])$|^Numpad([0-9])$/.exec(e.code); if (!m) { if (e.key === 'Escape' && picked.size) select(null); return; }
  const n = +(m[1] || m[2]); stop();
  if (n === 0) { glideHome(); return; }
  if (e.shiftKey) { const it = selId && itemOf(selId); if (it) setKey(it, n); return; }
  const it = B_().items.find(x => x.board === B_().cur && x.key === n); if (it) glideToItem(it);
}, true);

drawBoard(); placeCam(); camSettle();
