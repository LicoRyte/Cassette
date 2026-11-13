/* Cassette Timer: the desk. The whole screen is one big desk with the clock in the middle. Drag the empty space to move
   around (or drag with the right mouse button), scroll to zoom, double-click anywhere to pin a note there, drop photos
   straight on (they hang as Polaroids), and drag from a red pin onto something else to tie a string. Press D to draw
   (js/ui/draw-mode.js). Frames are labelled areas: drag a frame by its name and everything inside comes along.
   Shift+drag on the empty desk (or Shift+click) picks several things; Ctrl+G groups them so they move together.
   Ctrl+Z undoes, Ctrl+Shift+Z redoes. Bookmarks: Shift+1 to 9 on something picked; 1 to 9 glides there, 0 to the clock.
   Make as many boards as you like. Everything but the photos is saved with your game (S.board); photos live in the
   browser's picture storage (IndexedDB), shrunk so they never fill your save. */
'use strict';

// what's saved: { boards: [{ id, name }], cur, cam: { x, y, z }, items: [...], links: [[id, id]] }
// items: note { text, html, color, fs, w, h } | photo { text } | draw { w, h, strokes } | frame { w, h, text, color },
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
const draft = el('div', { class: 'sx-draftl' }); // the stroke you're drawing (js/ui/draw-mode.js)
world.append(frameLayer, strings, corner, layer, selBox, marquee, draft); ws.append(world);
root.append(ws); root.classList.add('sx-desk');

const cam = S.board.cam; cam.z = Math.min(1.6, Math.max(.35, +cam.z || 1));
const view = () => ({ w: ws.clientWidth || innerWidth, h: ws.clientHeight || innerHeight });
function placeCam() {
  const { w, h } = view(), tx = w / 2 - cam.x * cam.z, ty = h / 2 - cam.y * cam.z;
  world.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + cam.z + ')'; world.style.setProperty('--cz', cam.z); // (toolbars and frame names stay the same size on screen)
  const g = 44 * cam.z; ws.style.backgroundSize = g + 'px ' + g + 'px'; ws.style.backgroundPosition = tx + 'px ' + ty + 'px'; // the dots move with you
  deskHome();
}
const toWorld = (cx, cy) => { const r = ws.getBoundingClientRect(), { w, h } = view(); return { x: (cx - r.left - w / 2) / cam.z + cam.x, y: (cy - r.top - h / 2) / cam.z + cam.y }; };
let camSaveT = 0;
const camSave = () => { clearTimeout(camSaveT); camSaveT = setTimeout(save, 400); };
// gliding: the camera eases over, pulling back a little on long trips so you see where you're going
let glideRaf = 0;
function glideTo(x, y, z) {
  cancelAnimationFrame(glideRaf);
  const a = { x: cam.x, y: cam.y, z: cam.z }, d = Math.hypot(x - a.x, y - a.y), dur = Math.min(1100, 420 + d * .35), dip = Math.min(.4, d / 3500), t0 = performance.now();
  if (stillUI() || d < 1 && Math.abs(z - a.z) < .01) { Object.assign(cam, { x, y, z }); placeCam(); camSave(); return; }
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const step = now => { const t = Math.min(1, (now - t0) / dur), e = ease(t);
    cam.x = a.x + (x - a.x) * e; cam.y = a.y + (y - a.y) * e; cam.z = (a.z + (z - a.z) * e) * (1 - dip * Math.sin(Math.PI * t));
    placeCam(); if (t < 1) glideRaf = requestAnimationFrame(step); else camSave(); };
  glideRaf = requestAnimationFrame(step);
}
const glideHome = () => glideTo(0, 0, 1);
function glideToItem(it) { // a frame fills the view; anything else comes to the middle at full size
  const c = els.get(it.id); if (!c) return;
  const w = c.offsetWidth, h = c.offsetHeight, v = view();
  const z = it.type === 'frame' ? Math.min(1.6, Math.max(.35, Math.min(v.w * .86 / w, (v.h - 150) * .86 / h))) : 1;
  glideTo(it.x + w / 2, it.y + h / 2 + (it.type === 'frame' ? 20 / z : 0), z); select(it.id);
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
const deskSel = el('select', { 'aria-label': 'Which board' });
deskSel.addEventListener('change', () => { S.board.cur = deskSel.value; select(null); save(); drawBoard(); glideHome(); });
const deskBtn = (label, fn, cls, title) => el('button', { type: 'button', class: 'sx-ws-b' + (cls ? ' ' + cls : ''), title: title || null, 'aria-label': title || null, onclick: e => { e.currentTarget.blur(); fn(e); } }, label);
const deskFile = el('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
const deskKeys = el('div', { class: 'sx-ws-keys', 'aria-label': 'Bookmarks' });
const deskHomeB = deskBtn('0 · Clock', glideHome, 'sx-ws-home');
const undoB = deskBtn('↶', deskUndo, 'sx-ws-ic', 'Undo (Ctrl+Z)'), redoB = deskBtn('↷', deskRedo, 'sx-ws-ic', 'Redo (Ctrl+Shift+Z)');
function deskUndoState() { undoB.disabled = !undoS.length; redoB.disabled = !redoS.length; }
// the board menu: boards, and saving or loading them
const deskMenu = el('div', { class: 'sx-ws-menu', hidden: true, role: 'menu' });
function deskMenuOpen() {
  if (!deskMenu.hidden) { deskMenu.hidden = true; return; }
  const B = S.board, cur = B.boards.find(b => b.id === B.cur), close = () => { deskMenu.hidden = true; };
  const item = (label, fn) => el('button', { type: 'button', class: 'sx-ws-mi', role: 'menuitem', onclick: () => { close(); fn(); } }, label);
  deskMenu.replaceChildren(...[
    item('New board', () => { const name = (prompt('Name the new board:', 'Board ' + (B.boards.length + 1)) || '').trim().slice(0, 40); if (!name) return; deskMark(); const id = 'b' + Date.now(); B.boards.push({ id, name }); B.cur = id; select(null); save(); drawBoard(); glideHome(); }),
    item('Rename this board', () => { const name = (prompt('Rename this board:', cur.name) || '').trim().slice(0, 40); if (name) { deskMark(); cur.name = name; save(); deskBoardTools(); } }),
    B.boards.length > 1 ? armBtn('Delete this board', 'Sure? Everything on it goes (Undo brings it back)', () => { close(); deskMark(); const ids = new Set(B.items.filter(it => it.board === B.cur).map(it => it.id));
      B.items = B.items.filter(it => it.board !== B.cur); B.links = B.links.filter(l => !l.some(id => ids.has(id))); B.boards = B.boards.filter(b => b.id !== B.cur); B.cur = B.boards[0].id; select(null); save(); drawBoard(); glideHome(); }, 'sx-ws-mi') : null,
    el('i', { class: 'sx-ws-msep' }),
    item('Save this board as an image', () => deskExportImage()),
    item('Save a backup of all boards', () => deskExportBackup()),
    item('Load a backup...', () => deskImportBackup()),
  ].filter(Boolean));
  deskMenu.hidden = false;
  const mb = deskBar.querySelector('.sx-ws-menub'); if (mb) deskMenu.style.left = Math.max(0, mb.offsetLeft) + 'px'; // over the Board button, not the bar's far end
}
addEventListener('pointerdown', e => { if (!deskMenu.hidden && !e.target.closest('.sx-ws-menu, .sx-ws-menub')) deskMenu.hidden = true; }, true);
function deskBoardTools() { deskSel.replaceChildren(...S.board.boards.map(b => el('option', { value: b.id, selected: b.id === S.board.cur || null }, b.name))); }
// what's picked: a count, and what you can do with several things at once
const selCount = el('span', { class: 'sx-ws-n' });
const grpB = deskBtn('Group', () => deskGroup(), '', 'Group them, so they move together (Ctrl+G)'), ungrpB = deskBtn('Ungroup', () => deskUngroup(), '', 'Ungroup (Ctrl+Shift+G)');
const delSelB = deskBtn('Delete', () => deskDelete(), '', 'Delete what is picked (Delete)');
const deskSelGrp = el('div', { class: 'sx-ws-grp sx-ws-selg', hidden: true }, selCount, grpB, ungrpB, delSelB);
const drawB = deskBtn('Draw', () => drawModeSet(!drawOn), 'sx-ws-draw', 'Draw (D)');
const stickMenu = el('div', { class: 'sx-stk-menu', hidden: true, role: 'menu', 'aria-label': 'Stickers' });
const stickB = deskBtn('Sticker', () => { if (!stickMenu.hidden) { stickMenu.hidden = true; return; } stickMenu.hidden = false; stickMenu.style.left = Math.max(0, stickB.offsetLeft - 60) + 'px'; }, 'sx-ws-stickb', 'Stickers to stick on notes and photos');
const deskBar = el('div', { class: 'sx-ws-bar' },
  el('div', { class: 'sx-ws-grp' }, deskSel, deskBtn('Board ▾', deskMenuOpen, 'sx-ws-menub', 'New, rename, delete, save as image, backup')),
  el('div', { class: 'sx-ws-grp' }, deskBtn('Note', () => addNoteAt(freeSpot())), deskBtn('Photo', () => deskFile.click()), drawB, deskBtn('Frame', () => addFrameAt()), stickB, deskFile),
  el('div', { class: 'sx-ws-grp' }, undoB, redoB),
  el('div', { class: 'sx-ws-grp' }, deskHomeB, deskKeys),
  deskSelGrp,
  deskMenu, stickMenu);
ws.after(deskBar);
addEventListener('pointerdown', e => { if (!stickMenu.hidden && !e.target.closest('.sx-stk-menu, .sx-ws-stickb')) stickMenu.hidden = true; }, true); deskUndoState();

// the 0 button shows the time while the clock is out of sight
function deskHome() {
  const { w, h } = view(), off = Math.abs(cam.x) * cam.z > w / 2 || Math.abs(cam.y) * cam.z > h / 2 || cam.z < .5;
  deskHomeB.textContent = off ? '0 · ' + (timeText.textContent || 'Clock') : '0 · Clock'; deskHomeB.classList.toggle('away', off);
}
new MutationObserver(deskHome).observe(timeText, { childList: true, characterData: true, subtree: true });

/* ---------- picking things ---------- */
let selId = null; // the one you touched last (its toolbar shows, bookmarks go to it)
const picked = new Set();
const els = new Map();
const B_ = () => S.board;
const itemOf = id => B_().items.find(x => x.id === id);
const groupOf = id => { const it = itemOf(id); return it && it.group ? B_().items.filter(x => x.group === it.group && x.board === it.board).map(x => x.id) : [id]; };
function select(id, add) {
  if (id == null) { picked.clear(); selId = null; }
  else if (add && picked.has(id)) { groupOf(id).forEach(x => picked.delete(x)); selId = picked.size ? [...picked].pop() : null; }
  else { if (!add) picked.clear(); groupOf(id).forEach(x => picked.add(x)); selId = id; }
  els.forEach((c, k) => c.classList.toggle('sel', picked.has(k)));
  noteBarTo(selId); holdBarTo(selId); deskSelBar(); selBoxUpdate();
}
function deskSelBar() {
  const items = [...picked].map(itemOf).filter(Boolean), groups = new Set(items.map(i => i.group || null));
  deskSelGrp.hidden = items.length < 2;
  selCount.textContent = items.length + ' picked';
  grpB.hidden = groups.size === 1 && !groups.has(null); ungrpB.hidden = !items.some(i => i.group);
}
function selBoxUpdate() { // a dashed box around several picked things
  if (picked.size < 2) { selBox.hidden = true; return; }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  picked.forEach(id => { const c = els.get(id); if (!c) return; x0 = Math.min(x0, c.offsetLeft); y0 = Math.min(y0, c.offsetTop); x1 = Math.max(x1, c.offsetLeft + c.offsetWidth); y1 = Math.max(y1, c.offsetTop + c.offsetHeight); });
  if (!isFinite(x0)) { selBox.hidden = true; return; }
  Object.assign(selBox.style, { left: x0 - 14 + 'px', top: y0 - 14 + 'px', width: x1 - x0 + 28 + 'px', height: y1 - y0 + 28 + 'px' }); selBox.hidden = false;
}
function removeItems(ids) { const set = new Set(ids), B = B_(); B.items = B.items.filter(x => !set.has(x.id)); B.links = B.links.filter(l => !l.some(i => set.has(i))); }
function deskDelete() { if (!picked.size) return; deskMark(); deskSfx('pick'); removeItems([...picked]); select(null); save(); drawBoard(); }
function deskGroup() { if (picked.size < 2) return; deskMark(); const g = 'g' + Date.now(); picked.forEach(id => { const it = itemOf(id); if (it) it.group = g; }); save(); deskSfx('tie'); select(selId); deskSelBar(); }
function deskUngroup() { if (![...picked].some(id => (itemOf(id) || {}).group)) return; deskMark(); picked.forEach(id => { const it = itemOf(id); if (it) delete it.group; }); save(); deskSfx('tear'); deskSelBar(); } // (they stay picked, just no longer tied together)
function deskSelectAll() { picked.clear(); B_().items.filter(it => it.board === B_().cur).forEach(it => picked.add(it.id)); selId = [...picked].pop() || null; els.forEach((c, k) => c.classList.toggle('sel', picked.has(k))); noteBarTo(null); deskSelBar(); selBoxUpdate(); }

/* ---------- what's on the desk ---------- */
function deskDrawKeys() {
  const items = B_().items.filter(it => it.board === B_().cur && it.key).sort((a, b) => a.key - b.key);
  deskKeys.replaceChildren(...items.map(it => { const b = deskBtn(String(it.key), () => glideToItem(it)); b.title = (it.text || { photo: 'A photo', draw: 'A drawing', frame: 'A frame' }[it.type] || 'A note').slice(0, 60); return b; }));
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
  const txt = el('div', { class: it.type === 'photo' ? 'sx-cap-t' : 'sx-note-t', contenteditable: 'true', 'aria-label': it.type === 'photo' ? 'Caption' : 'Note', 'data-ph': it.type === 'photo' ? 'Write a caption...' : 'Write something...' }, it.text || '');
  txt.addEventListener('input', () => { it.text = txt.innerText.slice(0, 2000); save(); });
  const pin = el('span', { class: 'sx-pin', title: 'Drag to something else to tie a string' });
  const style = 'left:' + it.x + 'px;top:' + it.y + 'px;--tilt:' + tilt(it.id) + 'deg' + (it.type === 'note' ? noteStyle(it) : '');
  if (it.type === 'photo') {
    const img = el('img', { alt: it.text || 'A photo', draggable: 'false' });
    PHOTOS.get(it.id).then(src => { if (src) img.src = src; else img.alt = 'This photo is missing (it lives in the browser it was added in).'; drawStrings(); }).catch(() => {});
    const c = el('div', { class: 'sx-bcard sx-polaroid', 'data-id': it.id, 'data-hold': it.hold || 'pin', 'data-w': washiOf(it.id), style }, ...[pin, x, keyBadge(it), el('div', { class: 'sx-pol-img' }, img), txt].filter(Boolean));
    if (it.ar) polFormat(c, it.ar);
    img.addEventListener('load', () => { // the frame takes the photo's shape (measured once, then remembered)
      const ar = img.naturalWidth && img.naturalHeight ? Math.round(img.naturalWidth / img.naturalHeight * 1000) / 1000 : 1;
      if (it.ar !== ar) { it.ar = ar; save(); } polFormat(c, ar); drawStrings(); selBoxUpdate(); });
    return c;
  }
  const c = el('div', { class: 'sx-bcard sx-bnote', 'data-id': it.id, 'data-hold': it.hold || 'pin', 'data-w': washiOf(it.id), style }, ...[pin, x, keyBadge(it), txt].filter(Boolean)); noteSetup(it, txt, c); // a small document (js/ui/notes.js)
  return c;
}
const washiOf = id => { let h = 7; for (const ch of id) h = (h * 33 + ch.charCodeAt(0)) >>> 0; return h % 3; }; // which washi pattern (it stays the same)
// stickers: die-cut, a cream border, a little crooked. Drop one on a note or photo and it goes where they go
const STICKERS = [['star', 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z', 'fill', '#ffd832'],
  ['check', 'M4.5 12.5l5 5L19.5 6.5', 'line', '#9cb93b'], ['heart', 'M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 6.6 4.5 4.5 0 0 1 20 9.5c0 6.1-8 11-8 11z', 'fill', '#ff6157'],
  ['arrow', 'M4 12h14M13 6.5l5.5 5.5-5.5 5.5', 'line', '#77d6c1'], ['bang', 'M12 4v10', 'line', '#ff6157', 19.5], ['ask', 'M8.5 8.6a3.5 3.5 0 1 1 5 3.1c-1 .5-1.5 1.2-1.5 2.3v.8', 'line', '#ffb762', 19.5],
  ['smile', 'M12 3.5a8.5 8.5 0 1 0 .01 0M9 10v.6M15 10v.6M8.5 14.2a4 4 0 0 0 7 0', 'line', '#ffd832'], ['flag', 'M6 21V4M6 4.5h11l-2.5 4 2.5 4H6', 'line', '#ff6157'], ['bolt', 'M13 2L5 14h6l-1 8 8-12h-6z', 'fill', '#ffd832']];
function stickerSvg(g) { // (fixed shapes from the list above)
  const [, d, m, col, dot] = g, cream = '#ffffe4';
  const back = c => m === 'fill' ? '<path d="' + d + '" fill="' + c + '" stroke="' + c + '" stroke-width="5" stroke-linejoin="round"/>' : '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>';
  const front = m === 'fill' ? '<path d="' + d + '" fill="' + col + '"/>' : '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
  const dt = dot ? '<circle cx="12" cy="' + dot + '" r="3.6" fill="' + cream + '"/><circle cx="12" cy="' + dot + '" r="1.9" fill="' + col + '"/>' : '';
  return '<svg viewBox="-3 -3 30 30" aria-hidden="true"><g transform="translate(.9 1.3)" opacity=".4">' + back('#030710') + '</g>' + back(cream) + front + dt + '</svg>';
}
function stickerCard(it) {
  const c = el('div', { class: 'sx-bcard sx-bsticker', 'data-id': it.id, title: 'Drop it on a note or photo to stick it there', style: 'left:' + it.x + 'px;top:' + it.y + 'px;--tilt:' + (tilt(it.id) * 4) + 'deg' });
  c.innerHTML = stickerSvg(STICKERS.find(s => s[0] === it.glyph) || STICKERS[0]); return c;
}
function addSticker(glyph) {
  deskMark(); deskSfx('pin'); const id = 's' + Date.now(), p = freeSpot();
  B_().items.push({ id, type: 'sticker', board: B_().cur, glyph, x: Math.round(p.x + 60), y: Math.round(p.y + 30) }); save(); drawBoard(); select(id);
}
// the holder bar beside a picked note or photo: pin, washi tape or a clip
const HOLDS = [['pin', 'Red pin'], ['washi', 'Washi tape'], ['clip', 'Binder clip']];
const holdBar = el('div', { class: 'sx-holdbar', role: 'toolbar', 'aria-label': 'What it hangs by' }, ...HOLDS.map(([k, label]) => el('button', { type: 'button', class: 'sx-hb', 'data-h': k, title: label, 'aria-label': label }, el('i', {}))));
holdBar.addEventListener('mousedown', e => e.preventDefault()); holdBar.addEventListener('pointerdown', e => e.stopPropagation());
holdBar.addEventListener('click', e => { const b = e.target.closest('button'), it = selId && itemOf(selId); if (!b || !it) return; deskMark(); if (b.dataset.h === 'pin') delete it.hold; else it.hold = b.dataset.h; deskSfx(b.dataset.h === 'clip' ? 'drop' : 'pin'); save(); drawBoard(); });
function holdBarTo(id) {
  const it = id && itemOf(id), c = it && (it.type === 'note' || it.type === 'photo') && picked.size <= (it.group ? groupOf(id).length : 1) ? els.get(id) : null;
  if (!c) { holdBar.remove(); return; }
  if (holdBar.parentNode !== c) c.append(holdBar); holdBar.querySelectorAll('[data-h]').forEach(b => b.classList.toggle('on', b.dataset.h === (it.hold || 'pin')));
}
stickMenu.replaceChildren(...STICKERS.map(g => { const b = el('button', { type: 'button', class: 'sx-stk', role: 'menuitem', 'aria-label': g[0] + ' sticker', title: 'Add a ' + g[0] + ' sticker', onclick: () => { stickMenu.hidden = true; addSticker(g[0]); } }); b.innerHTML = stickerSvg(g); return b; })); // the sticker sheet
function drawCard(it) { // a drawing: only its strokes can be grabbed, so a circle around a note leaves the note clickable
  return el('div', { class: 'sx-bcard sx-bdraw', 'data-id': it.id, style: 'left:' + it.x + 'px;top:' + it.y + 'px;width:' + it.w + 'px;height:' + it.h + 'px;--tilt:0deg' }, ...[drawSvg(it), keyBadge(it)].filter(Boolean));
}
const FRAME_INKS = ['amber', 'mint', 'coral', 'yellow', 'cream', 'green'];
function frameCard(it) { // a frame: a labelled area. Its name is the handle; the inside lets clicks through to the desk
  const label = el('div', { class: 'sx-frame-t', contenteditable: 'true', 'aria-label': 'Frame name', 'data-ph': 'Name this frame' }, it.text || '');
  label.addEventListener('input', () => { it.text = label.textContent.replace(/\s+/g, ' ').slice(0, 80); save(); }); // (textContent: the name as typed, not as shown in capitals)
  const sws = el('span', { class: 'sx-frame-sw' }, ...FRAME_INKS.map(k => el('button', { type: 'button', class: 'sx-sw' + ((it.color || 'amber') === k ? ' on' : ''), style: 'background:' + inkOf(k), 'aria-label': k + ' frame', title: k, onclick: () => { deskMark(); it.color = k; save(); drawBoard(); } })));
  const x = el('button', { type: 'button', class: 'sx-bnote-x', 'aria-label': 'Remove the frame (what is in it stays)', title: 'Remove the frame (what is in it stays)', onclick: () => removeOne(it) }, '×');
  return el('div', { class: 'sx-bcard sx-bframe', 'data-id': it.id, style: 'left:' + it.x + 'px;top:' + it.y + 'px;width:' + it.w + 'px;height:' + it.h + 'px;--tilt:0deg;--fc:' + inkOf(it.color || 'amber') },
    el('div', { class: 'sx-frame-h' }, ...[keyBadge(it), label, sws, x].filter(Boolean)),
    ...['t', 'r', 'b', 'l'].map(k => el('span', { class: 'sx-fe sx-fe-' + k, title: 'Drag to move the frame and what is in it' })), // its edges are handles too
    el('span', { class: 'sx-resize', title: 'Drag to resize' }));
}
function drawBoard() {
  const B = B_(), items = B.items.filter(it => it.board === B.cur);
  els.clear(); layer.replaceChildren(); frameLayer.replaceChildren();
  [...picked].forEach(id => { if (!items.some(i => i.id === id)) picked.delete(id); }); if (selId && !picked.has(selId)) selId = null;
  items.forEach(it => {
    const c = it.type === 'frame' ? frameCard(it) : it.type === 'draw' ? drawCard(it) : it.type === 'sticker' ? stickerCard(it) : paperCard(it);
    if (picked.has(it.id)) c.classList.add('sel');
    els.set(it.id, c); (it.type === 'frame' ? frameLayer : layer).append(c);
  });
  deskBoardTools(); deskDrawKeys(); noteBarTo(selId); holdBarTo(selId); deskSelBar();
  requestAnimationFrame(() => { drawStrings(); selBoxUpdate(); });
}
const posOf = id => { const c = els.get(id); return c ? { x: c.offsetLeft + c.offsetWidth / 2, y: c.offsetTop + 10 } : null; };
// strings: a gentle sag between two pins, plus a wobble when either end moves
const wob = new Map(), lk = l => l[0] + '|' + l[1];
const pathD = (a, b, w) => { const mx = (a.x + b.x) / 2 + (w ? w.x : 0), my = (a.y + b.y) / 2 + 36 + Math.hypot(b.x - a.x, b.y - a.y) * .15 + (w ? w.y : 0); return 'M' + a.x + ' ' + a.y + ' Q' + mx + ' ' + my + ' ' + b.x + ' ' + b.y; };
let strNodes = [], strTemp = null, strTempP = null;
function drawStrings(temp) {
  const B = B_(); strings.replaceChildren(); strNodes = []; strTempP = null; strTemp = temp || null;
  B.links.forEach(l => {
    if (!els.has(l[0]) || !els.has(l[1])) return;
    const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('class', 'sx-string');
    const hit = document.createElementNS(SVGNS, 'path'); hit.setAttribute('class', 'sx-string-hit');
    hit.addEventListener('pointerdown', e => e.stopPropagation());
    hit.addEventListener('click', () => { deskMark(); B.links = B.links.filter(x => x !== l); wob.delete(lk(l)); deskSfx('tear'); save(); drawStrings(); });
    strings.append(hit, p); strNodes.push({ l, p, hit }); });
  strUpdate();
}
function strUpdate() {
  strNodes.forEach(n => { const a = posOf(n.l[0]), b = posOf(n.l[1]); if (!a || !b) return; const d = pathD(a, b, wob.get(lk(n.l))); n.p.setAttribute('d', d); n.hit.setAttribute('d', d); });
  if (strTemp) { if (!strTempP) { strTempP = document.createElementNS(SVGNS, 'path'); strTempP.setAttribute('class', 'sx-string sx-string-temp'); strings.append(strTempP); } strTempP.setAttribute('d', pathD(strTemp.a, strTemp.b)); }
  else if (strTempP) { strTempP.remove(); strTempP = null; }
  if (picked.size > 1) selBoxUpdate();
}
let wobRaf = 0;
function wobKick(id, vx, vy) { // the middle of the string lags behind the end you move
  if (stillUI()) return;
  B_().links.forEach(l => { if (!l.includes(id)) return; const k = lk(l), w = wob.get(k) || { x: 0, y: 0, vx: 0, vy: 0 }; w.vx -= vx * .2; w.vy -= vy * .2; wob.set(k, w); });
  if (wob.size && !wobRaf) wobRaf = requestAnimationFrame(wobStep);
}
function wobStep() {
  wobRaf = 0;
  wob.forEach((w, k) => { w.vx = (w.vx - w.x * .07) * .9; w.vy = (w.vy - w.y * .07) * .9; w.x = Math.max(-60, Math.min(60, w.x + w.vx)); w.y = Math.max(-60, Math.min(60, w.y + w.vy));
    if (Math.abs(w.x) + Math.abs(w.y) + Math.abs(w.vx) + Math.abs(w.vy) < .1) wob.delete(k); });
  strUpdate(); if (wob.size) wobRaf = requestAnimationFrame(wobStep);
}
// cards swing from their pin while you carry them, and settle when you let go
const swinging = new Set(); let swingRaf = 0;
function swingTo(c, target) {
  if (stillUI()) return;
  const s = c._sw = c._sw || { a: 0, v: 0, t: 0 }; s.t = target; swinging.add(c); c.classList.add('swinging'); if (!swingRaf) swingRaf = requestAnimationFrame(swingStep);
}
function swingStep() {
  swingRaf = 0;
  swinging.forEach(c => { const s = c._sw; s.v = (s.v + (s.t - s.a) * .1) * .87; s.a += s.v; s.t *= .86;
    if (Math.abs(s.a) + Math.abs(s.v) + Math.abs(s.t) < .06) { s.a = 0; s.v = 0; swinging.delete(c); c.classList.remove('swinging'); }
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
function addNoteAt(p) {
  deskMark(); deskSfx('pin'); const id = 'n' + Date.now(); B_().items.push({ id, type: 'note', board: B_().cur, x: Math.round(p.x), y: Math.round(p.y), text: '' }); save(); select(id); drawBoard();
  const t = layer.querySelector('[data-id="' + id + '"] .sx-note-t'); if (t) { editSnap = null; t.focus({ preventScroll: true }); }
}
function addFrameAt(r) {
  const v = view(); r = r || { x: cam.x - v.w * .3 / cam.z, y: cam.y - v.h * .26 / cam.z, w: v.w * .6 / cam.z, h: v.h * .48 / cam.z };
  deskMark(); deskSfx('pin'); const id = 'f' + Date.now();
  B_().items.push({ id, type: 'frame', board: B_().cur, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h), text: '', color: 'amber' }); save(); select(id); drawBoard();
  const t = els.get(id) && els.get(id).querySelector('.sx-frame-t'); if (t) { editSnap = null; t.focus({ preventScroll: true }); }
}
async function addPhotos(files, at) {
  let k = 0;
  for (const f of [...files].filter(f => /^image\//.test(f.type))) {
    try { const src = await shrinkPhoto(f), id = 'p' + Date.now() + '-' + k; await PHOTOS.put(id, src);
      if (!k) deskMark();
      const p = at ? { x: at.x - 120 + k * 30, y: at.y - 40 + k * 30 } : freeSpot(); B_().items.push({ id, type: 'photo', board: B_().cur, x: Math.round(p.x), y: Math.round(p.y), text: '' }); k++; }
    catch (e) { /* not a picture the browser can read: skip it */ }
  }
  if (k) { deskSfx('shutter'); save(); drawBoard(); }
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
    deskMark(); deskSfx('pin'); const id = 'n' + Date.now(), body = text.trim().slice(0, 2000);
    B_().items.push({ id, type: 'note', board: B_().cur, mt: Date.now(), x: Math.round(p.x - 100), y: Math.round(p.y - 20), text: body, html: noteFromText(body) });
    save(); drawBoard(); select(id); deskToast('Pasted as a note');
  }
}, true);

/* ---------- hands: panning, picking, dragging, strings ---------- */
let deskZ = 10;
// a click on a note's words (when you weren't already writing in it) puts the pen right there
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
  const t = e.target.closest('.sx-note-t, .sx-cap-t, .sx-frame-t');
  if (e.target.closest('.sx-bcard') && (!t || document.activeElement !== t)) e.preventDefault();
}));
ws.addEventListener('contextmenu', e => { if (!e.target.isContentEditable) e.preventDefault(); }); // the right button pans
const centreOf = id => { const c = els.get(id); return c ? { x: c.offsetLeft + c.offsetWidth / 2, y: c.offsetTop + c.offsetHeight / 2 } : null; };
function deskPan(e) {
  const s = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y }; let moved = false;
  e.preventDefault(); ws.setPointerCapture(e.pointerId); ws.classList.add('panning');
  const move = ev => { if (!moved && Math.hypot(ev.clientX - s.x, ev.clientY - s.y) < 3) return; moved = true; cam.x = s.cx - (ev.clientX - s.x) / cam.z; cam.y = s.cy - (ev.clientY - s.y) / cam.z; placeCam(); };
  const up = () => { ws.removeEventListener('pointermove', move); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(k => ws.removeEventListener(k, up)); ws.classList.remove('panning'); if (moved) camSave(); };
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
  if (e.button === 1 || e.button === 2) { if (!e.target.isContentEditable) deskPan(e); return; } // the middle or right button always moves the desk
  if (e.button !== 0) return;
  const c = e.target.closest('.sx-bcard');
  if (c) {
    const id = c.dataset.id, it = itemOf(id); if (!it) return;
    const txt = e.target.closest('.sx-note-t, .sx-cap-t, .sx-frame-t');
    if (txt && document.activeElement === txt) { if (!picked.has(id)) select(id); return; } // already writing in it: the pointer selects text as usual
    if (e.target.closest('.sx-bnote-x, .sx-fmt, .sx-frame-sw, .sx-holdbar')) { if (!picked.has(id)) select(id); return; } // taking it down, or formatting
    if (e.shiftKey && !e.target.classList.contains('sx-pin')) { e.preventDefault(); select(id, true); return; } // Shift+click: pick it too (or let it go)
    if (!picked.has(id)) select(id); else { selId = id; noteBarTo(id); }
    e.preventDefault(); c.setPointerCapture(e.pointerId);
    const start = { x: e.clientX, y: e.clientY, l: it.x, t: it.y };
    // one gesture, and it always ends: on release, on cancel, or if the browser takes the pointer away
    const track = (move, end) => {
      let over = false;
      const fin = ev => { if (over) return; over = true; c.removeEventListener('pointermove', move); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(k => c.removeEventListener(k, fin)); end(ev); };
      c.addEventListener('pointermove', move); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(k => c.addEventListener(k, fin));
    };
    if (e.target.classList.contains('sx-resize')) { // the corner: make it bigger or smaller
      const w0 = c.offsetWidth, h0 = c.offsetHeight, snap = deskSnap(), fr = it.type === 'frame', lim = fr ? [200, 6000, 140, 4000] : [160, 760, 90, 960];
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
        drawStrings(); if (wob.size && !wobRaf) wobRaf = requestAnimationFrame(wobStep); });
      return;
    }
    // anywhere else on it, the words included: a drag moves it (with everything picked, and a frame's contents);
    // a click without moving puts the pen there
    let dragging = false, lx = e.clientX, ly = e.clientY, lt = e.timeStamp, vx = 0, movers = [], snap = null;
    const swings = it.type === 'note' || it.type === 'photo';
    track(ev => {
      if (!dragging) {
        if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 4) return;
        dragging = true; snap = deskSnap(); c.classList.add('lift'); deskSfx('pick');
        const ids = new Set(picked.has(id) ? picked : [id]);
        [...ids].forEach(fid => { const f = itemOf(fid); if (!f || f.type !== 'frame') return; // a frame brings what's inside it
          const r = { x0: f.x, y0: f.y, x1: f.x + f.w, y1: f.y + f.h };
          els.forEach((cc, oid) => { const o = itemOf(oid), p = centreOf(oid); if (o && o.type !== 'frame' && p && p.x > r.x0 && p.x < r.x1 && p.y > r.y0 && p.y < r.y1) groupOf(oid).forEach(g => ids.add(g)); }); });
        B_().items.forEach(s => { if (s.type === 'sticker' && s.on && ids.has(s.on)) ids.add(s.id); }); // stickers stuck on it come along
        movers = [...ids].map(mid => ({ it: itemOf(mid), c: els.get(mid) })).filter(m => m.it && m.c).map(m => Object.assign(m, { x: m.it.x, y: m.it.y }));
        movers.forEach(m => { if (m.it.type !== 'frame') m.c.style.zIndex = String(++deskZ); }); // (raised with z-index: moving it in the page would make the browser drop the pointer)
        const ae = document.activeElement; if (ae && ae.isContentEditable && !c.contains(ae)) ae.blur();
      }
      const dx = (ev.clientX - start.x) / cam.z, dy = (ev.clientY - start.y) / cam.z;
      movers.forEach(m => { m.it.x = Math.round(m.x + dx); m.it.y = Math.round(m.y + dy); m.c.style.left = m.it.x + 'px'; m.c.style.top = m.it.y + 'px'; });
      const dt = Math.max(8, ev.timeStamp - lt), ddx = ev.clientX - lx, ddy = ev.clientY - ly; lx = ev.clientX; ly = ev.clientY; lt = ev.timeStamp;
      vx = vx * .55 + (ddx * 16 / dt) * .45; // speed per frame, smoothed, however unevenly the mouse reports
      if (swings) swingTo(c, Math.max(-16, Math.min(16, vx * 1.2)));
      movers.forEach(m => wobKick(m.it.id, ddx / cam.z, ddy / cam.z)); strUpdate();
    }, ev => {
      if (dragging) {
        c.classList.remove('lift'); if (swings) swingTo(c, 0); deskSfx('drop');
        if (it.type === 'sticker') { // dropped on a note or photo: it sticks there (and comes off when you pull it away)
          const r = c.getBoundingClientRect(), under = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).map(n => n.closest && n.closest('.sx-bnote, .sx-polaroid')).find(n => n && n !== c);
          if (under) { it.on = under.dataset.id; deskSfx('pin'); } else delete it.on; }
        const ids = new Set(movers.map(m => m.it.id)); B_().items = B_().items.filter(x => !ids.has(x.id)).concat(movers.map(m => m.it)); // what you moved is on top now
        if (snap && deskSnap() !== snap) deskMark(snap); save(); return;
      }
      if (ev.type !== 'pointerup' || !txt) return;
      if (it.type === 'note' && noteTickAt(txt, ev.clientX, ev.clientY)) return; // a checklist box
      deskEditAt(txt, ev.clientX, ev.clientY);
    });
    return;
  }
  if (e.target.closest('button, input, select, a, [contenteditable]')) return; // the clock's own buttons
  if (e.shiftKey) { deskMarquee(e); return; }
  // the empty desk (or the clock's face): let go of what's picked, and move the camera
  select(null); if (document.activeElement && document.activeElement.isContentEditable) { document.activeElement.blur(); getSelection().removeAllRanges(); } // put the pen down, and let go of any highlighted words
  deskPan(e);
});
ws.addEventListener('dblclick', e => { if (drawOn || e.target.closest('.sx-bcard, .sx-corner, .sx-tapes')) return; addNoteAt((p => ({ x: p.x - 100, y: p.y - 20 }))(toWorld(e.clientX, e.clientY))); });
ws.addEventListener('wheel', e => { // zoom around the pointer
  if (page && !page.hidden || e.target.closest('.sx-shelf, .sx-mus')) return; // (its lists scroll)
  e.preventDefault(); cancelAnimationFrame(glideRaf);
  const before = toWorld(e.clientX, e.clientY), z = Math.min(1.6, Math.max(.35, cam.z * Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0015))));
  cam.z = z; const after = toWorld(e.clientX, e.clientY); cam.x += before.x - after.x; cam.y += before.y - after.y; placeCam(); camSave();
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
    noteKeys(e, t);
    if (e.key === 'Escape') { e.preventDefault(); t.blur(); }
    e.stopPropagation(); return;
  }
  if ((t && t.closest && t.closest('input, select, textarea')) || page && !page.hidden) return;
  const stop = () => { e.preventDefault(); e.stopPropagation(); };
  if ((e.ctrlKey || e.metaKey) && !e.altKey) {
    if (e.code === 'KeyZ') { stop(); if (e.shiftKey) deskRedo(); else deskUndo(); }
    else if (e.code === 'KeyY') { stop(); deskRedo(); }
    else if (e.code === 'KeyG') { stop(); if (e.shiftKey) deskUngroup(); else deskGroup(); }
    else if (e.code === 'KeyA') { stop(); deskSelectAll(); }
    return;
  }
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (drawKeys(e)) { stop(); return; } // D, and the pen's own keys (js/ui/draw-mode.js)
  if ((e.key === 'Delete' || e.key === 'Backspace') && picked.size) { stop(); deskDelete(); return; }
  const m = /^Digit([0-9])$|^Numpad([0-9])$/.exec(e.code); if (!m) { if (e.key === 'Escape' && picked.size) select(null); return; }
  const n = +(m[1] || m[2]); stop();
  if (n === 0) { glideHome(); return; }
  if (e.shiftKey) { const it = selId && itemOf(selId); if (it) setKey(it, n); return; }
  const it = B_().items.find(x => x.board === B_().cur && x.key === n); if (it) glideToItem(it);
}, true);

drawBoard(); placeCam();
