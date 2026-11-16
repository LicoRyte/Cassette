/* Cassette Timer: the desk. The whole screen is one big desk with the clock in the middle. Drag the empty space to move
   around (or drag with the right mouse button), scroll to zoom, double-click anywhere to pin a note there, drop photos
   straight on (they hang whole, in their own shape: as Polaroids, taped prints or clipped sheets), and drag from a red pin onto something else to tie a string. Press D to draw
   (js/ui/draw-mode.js). Labels are light, named areas to keep a part of the desk tidy (they don't carry anything). Hoppers are folders that open another board (js/hopper.js).
   Shift+drag on the empty desk (or Shift+click) picks several things; Ctrl+G groups them so they move together.
   Ctrl+Z undoes, Ctrl+Shift+Z redoes. Bookmarks: Shift+1 to 9 on something picked; 1 to 9 glides there, 0 to the clock.
   Make as many boards as you like. Everything but the photos is saved with your game (S.board); photos live in the
   browser's picture storage (IndexedDB), shrunk so they never fill your save. */
'use strict';

// what's saved: { boards: [{ id, name }], cur, cam: { x, y, z }, items: [...], links: [[id, id]] }
// items: note { text, html, color, fs, w, h } | photo { text } | hop { to } (a folder to another board) | wb { w, h, strokes },
// and all of them { id, type, board, x, y, key?, group? }
(function boardMigrate() {
  const B = S.board = S.board && typeof S.board === 'object' ? S.board : {};
  if (!Array.isArray(B.boards) || !B.boards.length) B.boards = [{ id: 'main', name: 'My board' }];
  if (!B.cur || !B.boards.some(b => b.id === B.cur)) B.cur = B.boards[0].id;
  if (!Array.isArray(B.items)) B.items = [];
  if (Array.isArray(B.notes)) { B.notes.forEach(n => B.items.push({ id: n.id, type: 'note', board: B.boards[0].id, x: n.x, y: n.y, text: n.text || '' })); delete B.notes; } // notes from the story boards come along
  delete B.pos; // (story cards are gone with the stories)
  B.items = B.items.filter(it => it.type !== 'frame' && it.type !== 'draw' && it.type !== 'wb'); // (labels and drawings were here once)
  B.links = (Array.isArray(B.links) ? B.links : []).filter(l => l.every(id => B.items.some(it => it.id === id)));
  if (!B.gnames || typeof B.gnames !== 'object') B.gnames = {}; // a group's nickname, by its id
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
// a photo is kept sharp: up to 2000 pixels on the long side. A file already that small (and not huge) is kept exactly as
// it came, so a PNG screenshot stays crisp and an animated GIF keeps moving; a bigger one is scaled down (a PNG stays a PNG
// when it can, so text stays sharp; otherwise a good JPEG)
const PHOTO_MAX = 2000, PHOTO_KEEP = 2.5e6;
const fileUrl = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(f); });
function photoScale(img, max, png) { // a picture drawn smaller (at most max on the long side), as a data URL
  const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  let out = png ? c.toDataURL('image/png') : ''; if (!out || out.length > 3e6) out = c.toDataURL('image/jpeg', .88); return out;
}
function shrinkPhoto(file) {
  return new Promise((res, rej) => { const img = new Image(), url = URL.createObjectURL(file);
    img.onload = async () => { URL.revokeObjectURL(url);
      const kind = /^image\/(png|jpeg|webp|gif)$/.test(file.type), small = Math.max(img.width, img.height) <= PHOTO_MAX || file.type === 'image/gif';
      if (kind && small && file.size <= PHOTO_KEEP) { try { res(await fileUrl(file)); return; } catch (e) { /* draw it instead */ } }
      res(photoScale(img, PHOTO_MAX, file.type === 'image/png')); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('not an image')); }; img.src = url; });
}
// each photo, made once per session: its full picture and (for a big one) a lighter copy, kept as files in memory
// (not as long text), so drawing the desk again reuses them; the browser picks which to show from how big it is on screen
const PHOTO_VIEW = 900, photoCache = new Map();
function photoUrls(id) {
  if (!photoCache.has(id)) photoCache.set(id, (async () => {
    const src = await PHOTOS.get(id); if (!src) { photoCache.delete(id); return null; }
    const blob = await (await fetch(src)).blob(), full = URL.createObjectURL(blob);
    const img = new Image(); if (!(await new Promise(r => { img.onload = () => r(true); img.onerror = () => r(false); img.src = full; }))) return { full, w: 0 }; // (its size is known once it has loaded)
    const w = img.naturalWidth, h = img.naturalHeight, long = Math.max(w, h);
    if (long <= PHOTO_VIEW * 1.25 || blob.type === 'image/gif') return { full, w }; // (small enough, or it moves)
    const k = PHOTO_VIEW / long, c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const sb = await new Promise(r => c.toBlob(r, blob.type === 'image/png' ? 'image/png' : 'image/jpeg', .9));
    return sb ? { full, w, small: URL.createObjectURL(sb), sw: c.width } : { full, w };
  })());
  return photoCache.get(id);
}
// how wide a photo is on the screen right now (its width times the zoom): the browser takes the copy that's sharp enough
function photoSizes(img, it) { const c = img.closest('.sx-bcard'), w = (it && it.w) || (c && c.offsetWidth) || 300; img.sizes = Math.max(60, Math.round(w * cam.z)) + 'px'; }
function photoSizesAll() { layer.querySelectorAll('.sx-polaroid img[srcset]').forEach(img => { const c = img.closest('.sx-bcard'); photoSizes(img, c && itemOf(c.dataset.id)); }); }
function shrinkSrc(src, max) { // a stored picture made smaller (for sending to a friend)
  return new Promise(res => { const img = new Image(); img.onload = () => res(photoScale(img, max, false)); img.onerror = () => res(src); img.src = src; });
}
const tilt = id => { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return ((h % 50) - 25) / 10; }; // everything hangs a little crooked

/* ---------- the desk and its camera ---------- */
const SVGNS = 'http://www.w3.org/2000/svg';
const ws = el('div', { class: 'sx-ws' }), world = el('div', { class: 'sx-world' });
const strings = document.createElementNS(SVGNS, 'svg'); strings.setAttribute('class', 'sx-strings');
const layer = el('div', { class: 'sx-layer' });
const selBox = el('div', { class: 'sx-selbox', hidden: true }), marquee = el('div', { class: 'sx-marquee', hidden: true });
let selShift = null; // while several things are carried: where the box around them started (it moves with them)
world.append(strings, corner, layer, selBox, marquee); ws.append(world);
root.append(ws); root.classList.add('sx-desk');

const cam = S.board.cam; cam.z = Math.min(1.6, Math.max(.35, +cam.z || 1));
const view = () => ({ w: ws.clientWidth || innerWidth, h: ws.clientHeight || innerHeight });
// moving the camera is made cheap: while it moves, the desk is one picture the graphics card slides and scales
// (will-change), the dots are their own layer moved the same way, and the zoom that toolbars and group names read
// (--cz) is only updated once the camera comes to rest
const deskDots = el('div', { class: 'sx-dots', 'aria-hidden': 'true' }); ws.prepend(deskDots);
let camMoveT = 0, czShown = null, dotsKey = '';
function placeCam() {
  const { w, h } = view(), tx = w / 2 - cam.x * cam.z, ty = h / 2 - cam.y * cam.z;
  world.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0) scale(' + cam.z + ')';
  clearTimeout(camMoveT); camMoveT = setTimeout(camSettle, 160); clearTimeout(sharpT);
  const g = 44 * cam.z, key = w + 'x' + h + 'x' + g.toFixed(3);
  if (key !== dotsKey) { dotsKey = key; deskDots.style.cssText = 'width:' + (w + 2 * g) + 'px;height:' + (h + 2 * g) + 'px;background-size:' + g + 'px ' + g + 'px'; }
  deskDots.style.transform = 'translate3d(' + (((tx % g) + g) % g - g) + 'px,' + (((ty % g) + g) % g - g) + 'px,0)'; // the dots move with you
}
// the desk is always one picture the graphics card slides and scales, so starting and stopping a move costs nothing; after a
// zoom it's painted again once, at the new size, so words come back sharp (a pan needs no repaint at all)
function camSettle() { if (czShown !== cam.z) { czShown = cam.z; czApply(); if (typeof photoSizesAll === 'function') photoSizesAll(); clearTimeout(sharpT); sharpT = setTimeout(camSharpen, 450); } }
// (only once the camera has been still a while, and only if the zoom has changed enough to show: zooming in steps, or
// moving on right after a zoom, doesn't run into a repaint)
let sharpRaf = 0, sharpT = 0, sharpZ = 1;
function camSharpen() { if (Math.abs(Math.log(cam.z / sharpZ)) < .08 || world.classList.contains('sharpen')) return; sharpZ = cam.z;
  world.classList.add('sharpen'); sharpRaf = requestAnimationFrame(() => { sharpRaf = requestAnimationFrame(() => { sharpRaf = 0; world.classList.remove('sharpen'); }); }); }
// the zoom, for the few things that stay the same size on screen (a group's name, the note toolbar, the cursor):
// set on just those, since a value set on the whole desk makes the browser restyle every element in it
const CZ_SEL = '.sx-fmt, .sx-caret, .sx-gtag';
function czApply(within) { const z = String(cam.z); (within || world).querySelectorAll(CZ_SEL).forEach(e => { if (e.style.getPropertyValue('--cz') !== z) e.style.setProperty('--cz', z); }); } // (toolbars and group names stay the same size on screen)
let placeRaf = 0;
const placeSoon = () => { if (!placeRaf) placeRaf = requestAnimationFrame(() => { placeRaf = 0; placeCam(); }); }; // (at most once a frame)
const toWorld = (cx, cy) => { const r = ws.getBoundingClientRect(), { w, h } = view(); return { x: (cx - r.left - w / 2) / cam.z + cam.x, y: (cy - r.top - h / 2) / cam.z + cam.y }; };
let camSaveT = 0;
const camSave = () => { clearTimeout(camSaveT); camSaveT = setTimeout(save, 400); };
// gliding: the camera eases over, pulling back a little on long trips so you see where you're going
let glideRaf = 0;
function glideTo(x, y, z, quick, done) { // (quick: a shorter glide that keeps the zoom as it is, no dip out and back in)
  cancelAnimationFrame(glideRaf); if (typeof zoomStop === 'function') zoomStop();
  const a = { x: cam.x, y: cam.y, z: cam.z }, d = Math.hypot(x - a.x, y - a.y), dur = quick ? Math.min(560, 240 + d * .16) : Math.min(1100, 420 + d * .35), dip = quick ? 0 : Math.min(.4, d / 3500), t0 = performance.now();
  if (stillUI() || d < 1 && Math.abs(z - a.z) < .01) { Object.assign(cam, { x, y, z }); placeCam(); camSave(); if (done) done(); return; }
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const step = now => { const t = Math.min(1, (now - t0) / dur), e = ease(t);
    cam.x = a.x + (x - a.x) * e; cam.y = a.y + (y - a.y) * e; cam.z = (a.z + (z - a.z) * e) * (1 - dip * Math.sin(Math.PI * t));
    placeCam(); if (t < 1) glideRaf = requestAnimationFrame(step); else { camSave(); if (done) done(); } };
  glideRaf = requestAnimationFrame(step);
}
const glideHome = () => glideTo(0, 0, 1);
function glideToItem(it) { // it comes to the middle at full size
  const c = els.get(it.id); if (!c) return;
  const w = c.offsetWidth, h = c.offsetHeight, v = view();
  glideTo(it.x + w / 2, it.y + h / 2, 1, false, () => arriveAt(it.id)); select(it.id);
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
// writing in a note (or a caption) counts as one step, from when you start to when you put the pen down
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
let deskMenuOpen = () => {}; // (the board manager: js/boards.js)
addEventListener('pointerdown', e => { if (!deskMenu.hidden && !e.target.closest('.sx-ws-menu, .sx-ws-menub')) deskMenu.hidden = true; }, true);
function deskBoardTools() { // the Boards button names the board you're on
  const cur = S.board.boards.find(b => b.id === S.board.cur), t = 'Boards: on ' + (cur ? cur.name : '') + ' (go to, rename, copy, delete, reorder, new, backups)';
  if (typeof menuB !== 'undefined') { menuB.title = t; menuB.setAttribute('aria-label', t); } }
// what's picked: a count, and what you can do with several things at once
const selCount = el('span', { class: 'sx-ws-n' });
const delSelB = deskBtn(deskIcon('trash'), () => deskDelete(), 'sx-ws-ic sx-ws-del', 'Delete what is picked (Delete)');
const grpB = deskBtn(deskIcon('group'), () => deskGroup(), 'sx-ws-ic', 'Group them, so they move together like one thing (Ctrl+G)'), ungrpB = deskBtn(deskIcon('ungroup'), () => deskUngroup(), 'sx-ws-ic', 'Ungroup (Ctrl+Shift+G)');
const deskSelGrp = el('div', { class: 'sx-ws-grp sx-ws-selg', hidden: true }, selCount, grpB, ungrpB, delSelB);
const tableKey = deskBtn(deskIcon('table'), () => addTable(), 'sx-ws-ic', 'Table: rows and columns, and a graph of them (Bars, Line, Pie)');
// the left side: a column of keys for making things, finding and undoing (the bar along the bottom holds what changes the thing you've picked)
const menuB = deskBtn([deskIcon('boards'), el('span', { class: 'sx-ic-car', 'aria-hidden': 'true' }, '▸')], () => deskMenuOpen(), 'sx-ws-ic sx-ws-menub', 'Boards');
const deskBar = el('div', { class: 'sx-ws-bar sx-ws-side', role: 'toolbar', 'aria-orientation': 'vertical', 'aria-label': 'Desk' },
  el('div', { class: 'sx-ws-grp' }, menuB),
  el('div', { class: 'sx-ws-grp' }, deskBtn(deskIcon('note'), () => addNoteAt(freeSpot()), 'sx-ws-ic', 'Note: pin a new one (or double-click the desk)'), deskBtn(deskIcon('photo'), () => deskFile.click(), 'sx-ws-ic', 'Photo: hang one (or drop or paste it on)'), tableKey, deskBtn(deskIcon('folder'), () => addHopper(), 'sx-ws-ic', 'Hopper: a folder that opens another board'), deskFile),
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
  noteBarTo(selId); deskSelBar(); selBoxUpdate(); if (typeof gtagSync === 'function') gtagSync();
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
    if (c.group) { const g0 = c.group; c.group = gmap[g0] || (gmap[g0] = 'g' + now + '-' + k); if (B.gnames[g0]) B.gnames[c.group] = B.gnames[g0]; } // (a copied group is a group of its own, with the same name)
    if (it.type === 'photo') { try { const p = await PHOTOS.get(it.id); if (p) await PHOTOS.put(c.id, p); } catch (e) { continue; } }
    B.items.push(c); ids.push(c.id);
  }
  save(); drawBoard(); select(ids[0]); ids.slice(1).forEach(id => { if (!picked.has(id)) select(id, true); }); deskSfx('pin');
}
function deskGroup() { if (picked.size < 2) return; deskMark(); const g = 'g' + Date.now(); picked.forEach(id => { const it = itemOf(id); if (it) it.group = g; }); save(); deskSfx('tie'); setTimeout(() => { gtagSync(); if (!gtag.hidden) { gtagT.focus(); const r = document.createRange(); r.selectNodeContents(gtagT); r.collapse(false); getSelection().removeAllRanges(); getSelection().addRange(r); } }, 0); deskSelBar(); deskToast('Grouped: they move together now'); }
function deskUngroup() { if (![...picked].some(id => (itemOf(id) || {}).group)) return; deskMark(); picked.forEach(id => { const it = itemOf(id); if (it) { delete B_().gnames[it.group]; delete it.group; } }); save(); deskSfx('pick'); deskSelBar(); } // (they stay picked, just no longer tied together)
/* ---------- a group's name: a small tag over the group's top left. Point at a card in a named group and its name shows;
   pick the whole group and the tag is there to name or rename it (grouping with Ctrl+G starts you writing it) ---------- */
const gtagT = el('span', { class: 'sx-gtag-t', spellcheck: 'false', 'aria-label': 'Group name', 'data-ph': 'Name this group' });
const gtag = el('div', { class: 'sx-gtag', hidden: true }, gtagT);
world.append(gtag);
let gtagG = null, gtagHover = null, gtagCarry = false;
gtag.addEventListener('pointerdown', e => e.stopPropagation()); // (writing in it doesn't pick up or move the desk)
gtagT.addEventListener('input', () => { if (!gtagG) return; const t = gtagT.textContent.replace(/\s+/g, ' ').trim().slice(0, 60); if (t) B_().gnames[gtagG] = t; else delete B_().gnames[gtagG]; saveSoon(); });
gtagT.addEventListener('blur', () => setTimeout(gtagSync, 0));
function groupPicked() { // the group, when what's picked is exactly one whole group
  const its = [...picked].map(itemOf), g = its[0] && its[0].group; if (!g || its.some(i => !i || i.group !== g)) return null;
  return groupOf(its[0].id).every(id => picked.has(id)) ? g : null;
}
function gtagSync() {
  const pickedG = groupPicked(), g = pickedG || gtagHover, name = g && B_().gnames[g];
  if (document.activeElement === gtagT) { if (gtagG) gtagPlace(); return; } // (being written in: it stays)
  if (gtagCarry) return; // (being carried along: it's put in its new place when they're put down)
  if (!g || !pickedG && !name) { gtag.hidden = true; gtagG = null; return; }
  gtagG = g; gtagT.contentEditable = pickedG ? 'true' : 'false'; gtag.classList.toggle('edit', !!pickedG);
  if (gtagT.textContent !== (name || '')) gtagT.textContent = name || '';
  gtag.hidden = false; gtagPlace();
}
function gtagPlace() {
  let x0 = Infinity, y0 = Infinity; const B = B_();
  B.items.forEach(i => { if (i.group !== gtagG || i.board !== B.cur) return; const c = els.get(i.id); if (!c) return; x0 = Math.min(x0, c.offsetLeft); y0 = Math.min(y0, c.offsetTop); });
  if (!isFinite(x0)) { gtag.hidden = true; return; }
  gtag.style.left = x0 + 'px'; gtag.style.top = y0 + 'px'; gtag.style.setProperty('--cz', String(cam.z));
}
ws.addEventListener('pointerover', e => { const c = e.target.closest && e.target.closest('.sx-world .sx-bcard'), it = c && itemOf(c.dataset.id), g = it && it.group || null; if (g !== gtagHover) { gtagHover = g; gtagSync(); } });
ws.addEventListener('pointerleave', () => { if (gtagHover) { gtagHover = null; gtagSync(); } });
function deskDelete() { const ids = [...picked]; if (!ids.length) return; deskMark(); deskSfx('pick'); removeItems(ids); select(null); save(); drawBoard(); }
function deskSelectAll() { picked.clear(); B_().items.filter(it => it.board === B_().cur).forEach(it => picked.add(it.id)); selId = [...picked].pop() || null; els.forEach((c, k) => c.classList.toggle('sel', picked.has(k))); noteBarTo(null); deskSelBar(); selBoxUpdate(); }

/* ---------- what's on the desk ---------- */
function deskDrawKeys() {
  const items = B_().items.filter(it => it.board === B_().cur && it.key).sort((a, b) => a.key - b.key);
  deskKeys.replaceChildren(...items.map(it => { const b = deskBtn(String(it.key), () => glideToItem(it)); b.title = (it.text || { photo: 'A photo', hop: 'A folder', tbl: 'A table' }[it.type] || 'A note').slice(0, 60); return b; }));
}
function setKey(it, n) { // one number, one thing (on this board)
  deskMark(); const had = it.key === n;
  B_().items.forEach(x => { if (x.board === it.board && x.key === n) delete x.key; });
  if (!had) it.key = n; save(); drawBoard();
}
const keyBadge = it => it.key ? el('span', { class: 'sx-bkey', title: 'Press ' + it.key + ' to come here' }, String(it.key)) : null;
function removeOne(it) { deskMark(); deskSfx('pick'); removeItems([it.id]); picked.delete(it.id); if (selId === it.id) selId = null; save(); drawBoard(); }
// a picture always shows whole, in its own shape; what it hangs in follows that shape: instant film for everyday ones
// (square, wide for landscape, mini for tall), a print held up with two strips of tape for a long panorama, and a sheet
// hung from a binder clip for a very tall one (a phone screenshot, a page)
function polFormat(c, ar) {
  const f = ar > 2.1 ? 'print' : ar < .5 ? 'clip' : ar >= 1.15 ? 'wide' : ar <= .87 ? 'mini' : 'square';
  ['wide', 'mini', 'print', 'clip'].forEach(k => c.classList.toggle('sx-pol-' + k, f === k)); c.style.setProperty('--par', ar);
}
function paperCard(it) { // a note or a photo
  const x = el('button', { type: 'button', class: 'sx-bnote-x', 'aria-label': it.type === 'photo' ? 'Take the photo down' : 'Take the note down', onclick: () => removeOne(it) }, '×');
  const txt = el('div', { class: it.type === 'photo' ? 'sx-cap-t' : 'sx-note-t', contenteditable: 'true', spellcheck: 'false', 'aria-label': it.type === 'photo' ? 'Caption' : 'Note', 'data-ph': it.type === 'photo' ? 'Write a caption...' : 'Write something...' }, it.text || '');
  txt.addEventListener('input', () => { it.text = txt.innerText.slice(0, 2000); saveSoon(); });
  const pin = el('span', { class: 'sx-pin', title: 'Drag to something else to tie a string' });
  const style = 'left:' + it.x + 'px;top:' + it.y + 'px;--tilt:' + tilt(it.id) + 'deg' + (it.type === 'note' ? noteStyle(it) : it.w ? ';width:' + it.w + 'px' : '');
  if (it.type === 'photo') {
    const img = el('img', { alt: it.text || 'A photo', draggable: 'false' });
    img.decoding = 'async'; img.loading = 'lazy';
    photoUrls(it.id).then(u => { if (!u) { img.alt = 'This photo is missing (it lives in the browser it was added in).'; return; }
      if (u.small) { img.srcset = u.small + ' ' + u.sw + 'w, ' + u.full + ' ' + u.w + 'w'; photoSizes(img, it); } img.src = u.small || u.full; drawStrings(); }).catch(() => {});
    const c = el('div', { class: 'sx-bcard sx-polaroid', 'data-id': it.id, style }, ...[el('i', { class: 'sx-pol-hold', 'aria-hidden': 'true' }), pin, x, keyBadge(it), el('div', { class: 'sx-pol-img' }, img), txt,
      el('span', { class: 'sx-resize', title: 'Drag to make it bigger or smaller' })].filter(Boolean)); // (the tape or the clip it hangs by, when it has one)
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
  const B = B_();
  if (it.group) { // a group comes forward as one, keeping its own order inside (a small photo on a note stays on the note)
    const ms = B.items.filter(x => x.group === it.group && x.board === it.board && els.get(x.id));
    if (ms.every((x, i) => zOf(els.get(x.id)) === layerTop - 2 * (ms.length - 1 - i))) return;
    ms.forEach(x => { els.get(x.id).style.zIndex = String(layerTop += 2); });
    const set = new Set(ms); B.items = B.items.filter(x => !set.has(x)).concat(ms); save(); strUpdate(); return;
  }
  if (zOf(c) === layerTop) return;
  c.style.zIndex = String(layerTop += 2);
  B.items = B.items.filter(x => x !== it); B.items.push(it); save(); strUpdate();
}
// a card that hasn't changed since it was made is kept as it is: making and restyling every card each time is the costly
// part of drawing the desk. It's kept only if it's the very same item (Undo and a friend's cards bring new ones) and nothing
// about it has changed but where it sits and the words typed into it (which the card already shows)
const cardSnap = it => JSON.stringify(it, (k, v) => k === 'x' || k === 'y' || k === 'mt' || k === 'html' || k === 'text' ? undefined : v);
function cardMade(c, it) { c._it = it; c._snap = cardSnap(it); return c; }
function drawBoard() {
  const B = B_(), items = B.items.filter(it => it.board === B.cur);
  const old = new Map(els), keep = new Map();
  items.forEach(it => { const c = old.get(it.id); if (c && c._it === it && it.type !== 'hop' && c.isConnected && c._snap === cardSnap(it)) keep.set(it.id, c); });
  old.forEach((c, id) => { if (keep.get(id) !== c) c.remove(); });
  [...layer.children].forEach(c => { if (c.classList.contains('sx-bcard') && !keep.has(c.dataset.id)) c.remove(); }); // (anything left over)
  els.clear(); carried.clear(); strInner.clear(); world.classList.remove('carrying');
  [...picked].forEach(id => { if (!items.some(i => i.id === id)) picked.delete(id); }); if (selId && !picked.has(selId)) selId = null;
  items.forEach(it => {
    // (folders and tables come from files loaded after this one: until they're in, those wait for start.js to draw the desk again)
    if (it.type === 'hop' && typeof hopCard !== 'function' || it.type === 'tbl' && typeof tblCard !== 'function') return; 
    let c = keep.get(it.id);
    if (c) { const l = it.x + 'px', t = it.y + 'px'; if (c.style.left !== l) c.style.left = l; if (c.style.top !== t) c.style.top = t; }
    else { c = cardMade(it.type === 'hop' ? hopCard(it) : it.type === 'tbl' ? tblCard(it) : paperCard(it), it);
      layer.append(c); }
    c.classList.toggle('sel', picked.has(it.id));
    els.set(it.id, c);
  });
  layerTop = 0; items.forEach(it => { const c = els.get(it.id); if (!c) return; layerTop += 2; const z = String(layerTop); if (c.style.zIndex !== z) c.style.zIndex = z; }); // (stacked in the desk's order)
  czApply();
  deskBoardTools(); deskDrawKeys(); noteBarTo(selId); deskSelBar();
  requestAnimationFrame(() => { drawStrings(); selBoxUpdate(); });
  if (typeof gtagSync === 'function') gtagSync();
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
layer.addEventListener('pointerover', e => { const c = e.target.closest('.sx-bcard'); const id = c ? c.dataset.id : null; if (id !== strOver) { strOver = id; strHot(); if (c && !e.buttons) brushCard(c, brushV.x); } });
// brushing past: the mouse grazes a note or photo and it rocks on its pin a little; it plucks a string and the string wobbles.
// (only when the pointer comes onto one, and only while it moves: nothing runs while the desk is still)
// the mouse's speed, smoothed (the browser gives no movement on the event for arriving somewhere, only on moves)
const brushV = { x: 0, y: 0, t: 0, cx: null, cy: null };
addEventListener('pointermove', e => { const dt = Math.max(8, e.timeStamp - brushV.t), k = 16 / dt, mx = brushV.cx === null || dt > 200 ? 0 : e.clientX - brushV.cx, my = brushV.cx === null || dt > 200 ? 0 : e.clientY - brushV.cy;
  brushV.t = e.timeStamp; brushV.cx = e.clientX; brushV.cy = e.clientY; brushV.x = brushV.x * .5 + mx * k * .5; brushV.y = brushV.y * .5 + my * k * .5; }, { passive: true, capture: true });
function brushCard(c, mx) {
  if (stillUI() || !(c.classList.contains('sx-bnote') || c.classList.contains('sx-polaroid') || c.classList.contains('sx-btbl')) || c.classList.contains('lift') || c.contains(document.activeElement)) return;
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
  const B = B_(); strings.replaceChildren(); strTempP = null; strTemp = temp || null;
  const was = new Map(strNodes.map(n => [n.l, n])), next = [];
  B.links.forEach(l => {
    if (!els.has(l[0]) || !els.has(l[1])) return;
    let n = was.get(l);
    if (n) was.delete(l);
    else { const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('class', 'sx-string');
      const hit = document.createElementNS(SVGNS, 'path'); hit.setAttribute('class', 'sx-string-hit'); hit._l = l;
      const sv = document.createElementNS(SVGNS, 'svg'); sv.setAttribute('class', 'sx-strand'); sv.append(hit, p); // (its own sheet, at its own level)
      n = { l, p, hit, sv, z: -1 }; }
    if (!n.sv.isConnected) layer.append(n.sv);
    next.push(n); });
  was.forEach(n => n.sv.remove()); strNodes = next;
  strUpdate(); strHot();
}
// every string's wider hover line, through one listener each: pressing it doesn't pan, passing over it plucks it, a click cuts it
const strHitOf = e => e.target && e.target.classList && e.target.classList.contains('sx-string-hit') ? e.target : null;
// a press near a pin goes to the pin, not to a string ending there: tying a new string comes first
const strPinNear = (h, x, y) => { for (const id of h._l) { const c = els.get(id), pin = c && c.querySelector(':scope > .sx-pin'); if (!pin) continue;
  const r = pin.getBoundingClientRect(); if (Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) < Math.max(16, r.width)) return pin; } return null; };
layer.addEventListener('pointerdown', e => { const h = strHitOf(e); if (!h) return; e.stopPropagation(); h._toPin = false;
  const pin = strPinNear(h, e.clientX, e.clientY); if (!pin) return;
  e.preventDefault(); h._toPin = true; pin.dispatchEvent(new PointerEvent('pointerdown', e)); }); // (as if the pin itself was pressed)
layer.addEventListener('pointerover', e => { const h = strHitOf(e); if (h && e.relatedTarget !== h) brushString(h._l, e); }); // (plucked as the mouse passes over it)
layer.addEventListener('click', e => { const h = strHitOf(e); if (!h) return; if (h._toPin) { h._toPin = false; return; } /* (that press went to the pin) */ const l = h._l, B = B_(); deskMark(); B.links = B.links.filter(x => x !== l); wob.delete(lk(l)); deskSfx('tear'); save(); drawStrings(); });
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
  if (!(only instanceof Set) && typeof gtagSync === 'function') gtagSync(); // (things put down: the group's name follows)
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
  animAgain(c, 'sx-land');
  c.addEventListener('animationend', e => { if (e.target === c) c.classList.remove('sx-land'); });
  if (sfx) setTimeout(() => deskSfx('pin'), 170);
}
function addNoteAt(p) {
  deskMark(); const id = 'n' + Date.now(); B_().items.push({ id, type: 'note', board: B_().cur, x: Math.round(p.x), y: Math.round(p.y), text: '' }); save(); select(id); drawBoard(); deskLand(id, true);
  const t = layer.querySelector('[data-id="' + id + '"] .sx-note-t'); if (t) { editSnap = null; t.focus({ preventScroll: true }); }
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
    if (card && card.classList.contains('sx-bnote') && typeof flowPhotos === 'function') { flowPhotos(imgs, card).then(k => { if (k) deskToast(k === 1 ? 'Pasted a photo, tied to this note' : 'Pasted ' + k + ' photos, tied to this note'); }); return; }
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
  const c = els.get(id), txt = c && c.querySelector('.sx-note-t, .sx-cap-t, .sx-tc'); if (!txt) return false;
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
[layer].forEach(L => L.addEventListener('mousedown', e => {
  if (e.button !== 0 || e.target.closest('.sx-fmt, .sx-bnote-x')) return;
  const t = e.target.closest('.sx-note-t, .sx-cap-t, .sx-tc');
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
function deskMarquee(e) { // Shift+drag on the empty desk: pick everything the box touches
  const a = toWorld(e.clientX, e.clientY); let b = a;
  e.preventDefault(); ws.setPointerCapture(e.pointerId);
  const rect = () => ({ x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y) });
  const move = ev => { b = toWorld(ev.clientX, ev.clientY); const r = rect(); Object.assign(marquee.style, { left: r.x0 + 'px', top: r.y0 + 'px', width: r.x1 - r.x0 + 'px', height: r.y1 - r.y0 + 'px' }); marquee.hidden = false; };
  const up = () => {
    ws.removeEventListener('pointermove', move); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(k => ws.removeEventListener(k, up)); marquee.hidden = true;
    const r = rect(); if (r.x1 - r.x0 < 4 && r.y1 - r.y0 < 4) return;
    els.forEach((c, id) => {
      const x0 = c.offsetLeft, y0 = c.offsetTop, x1 = x0 + c.offsetWidth, y1 = y0 + c.offsetHeight, it = itemOf(id);
      const hit = x0 < r.x1 && x1 > r.x0 && y0 < r.y1 && y1 > r.y0;
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
    const txt = e.target.closest('.sx-note-t, .sx-cap-t, .sx-tc');
    if (txt && document.activeElement === txt) { if (!picked.has(id)) select(id); return; } // already writing in it: the pointer selects text as usual
    if (e.target.closest('.sx-bnote-x, .sx-fmt, .sx-hop-tabb, .sx-tbl-v, .sx-tbl-pick, .sx-from')) { if (!picked.has(id)) select(id); return; } // taking it down, or formatting
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
    if (e.target.classList.contains('sx-resize') && it.type === 'photo') { // a photo's corner: bigger or smaller, keeping its shape
      const w0 = c.offsetWidth, snap = deskSnap(); c.classList.add('sizing');
      track(ev => { it.w = Math.round(Math.max(120, Math.min(1600, w0 + (ev.clientX - start.x) / cam.z))); c.style.width = it.w + 'px'; strUpdate(); },
        () => { c.classList.remove('sizing'); const im = c.querySelector('img[srcset]'); if (im) photoSizes(im, it); if (deskSnap() !== snap) deskMark(snap); save(); });
      return;
    }
    if (e.target.classList.contains('sx-resize')) { // the corner: make it bigger or smaller
      const w0 = c.offsetWidth, h0 = c.offsetHeight, snap = deskSnap(), lim = it.type === 'tbl' ? [240, 1400, 80, 2000] : [160, 760, 90, 960];
      c.classList.add('sizing', 'sized');
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
        movers = [...ids].map(mid => ({ it: itemOf(mid), c: els.get(mid) })).filter(m => m.it && m.c).map(m => Object.assign(m, { x: m.it.x, y: m.it.y })) // (a locked label stays behind)
          .sort((a, b) => at.get(a.it.id) - at.get(b.it.id)); // (in the order they lie, so what was on top stays on top)
        if (picked.size > 1 && !selBox.hidden) selShift = true; // (the box around them slides along)
        gtagCarry = !!(gtagG && !gtag.hidden && movers.some(m => m.it.group === gtagG)); // (and so does the group's name)
        world.classList.add('carrying'); moverIds = new Set(movers.map(m => m.it.id)); movers.forEach(m => { carried.set(m.it.id, { it: m.it, w: m.c.offsetWidth }); m.c.classList.add('carry', 'lift'); }); // (everything carried lifts off the board with its shadow) selShift = !selBox.hidden ? { x: selBox.offsetLeft, y: selBox.offsetTop } : null;
        movers.forEach(m => { m.c.style.zIndex = String(layerTop += 2); }); // (raised with z-index: moving it in the page would make the browser drop the pointer)
        // carried things hold still while they move (the swing and the sway play when you pick them up and put them down):
        // the cards slide as finished layers, strings inside the group slide with them, and only strings reaching out are redrawn
        B_().links.forEach(l => { if (moverIds.has(l[0]) || moverIds.has(l[1])) wob.delete(lk(l)); });
        strUpdate(moverIds); strNodes.forEach(n => { if (moverIds.has(n.l[0]) && moverIds.has(n.l[1])) strInner.add(n); });
        movers.forEach((m, i) => { if (m.it.type === 'note' || m.it.type === 'photo' || m.it.type === 'tbl') swingKick(m.c, (i % 2 ? -1 : 1) * .9); }); // (a little wobble as it comes off the board)
        const ae = document.activeElement; if (ae && ae.isContentEditable && !c.contains(ae)) ae.blur();
      }
      const dx = (ev.clientX - start.x) / cam.z, dy = (ev.clientY - start.y) / cam.z;
      const rx = Math.round(dx), ry = Math.round(dy), tr = rx + 'px ' + ry + 'px';
      movers.forEach(m => { m.it.x = m.x + rx; m.it.y = m.y + ry; m.c.style.translate = tr; });
      strInner.forEach(n => { n.sv.style.translate = tr; });
      const dt = Math.max(8, ev.timeStamp - lt), ddx = ev.clientX - lx, ddy = ev.clientY - ly; lx = ev.clientX; ly = ev.clientY; lt = ev.timeStamp;
      vx = vx * .55 + (ddx * 16 / dt) * .45; vy = vy * .55 + (ddy * 16 / dt) * .45; // speed per frame, smoothed, however unevenly the mouse reports
      if (selShift) selBox.style.translate = tr; // (the box slides along as a layer: no measuring, no layout)
      if (gtagCarry) gtag.style.translate = tr;
      strUpdate(moverIds); // (only the strings reaching out to something that stays put)
    }, ev => {
      if (dragging) {
        movers.forEach(m => { m.c.style.left = m.it.x + 'px'; m.c.style.top = m.it.y + 'px'; m.c.style.translate = ''; m.c.classList.remove('carry'); }); carried.clear(); world.classList.remove('carrying'); selBox.style.translate = ''; gtag.style.translate = ''; gtagCarry = false; // (now it takes its place)
        strInner.forEach(n => { n.sv.style.translate = ''; }); strInner.clear();
        c.classList.remove('lift'); movers.forEach(m => m.c.classList.remove('lift')); selShift = null; deskSfx('drop'); strUpdate(); selBoxUpdate();
        // let go: each card swings on in the way it was going (more the faster it moved; a still mouse gives just a settle), and the strings bounce
        const fresh = Math.max(0, 1 - (ev.timeStamp - lt) / 120), sx = vx * fresh, sy = vy * fresh;
        movers.forEach((m, i) => { if (m.it.type === 'note' || m.it.type === 'photo' || m.it.type === 'tbl') swingKick(m.c, Math.max(-2, Math.min(2, -sx * .12)) + (i % 2 ? -.5 : .5)); });
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
// zooming eases: the wheel sets where the zoom is heading, and each frame it moves part of the way there, the spot under the
// pointer staying under it the whole time (more turns of the wheel just move where it's heading)
let zoomTo = null, zoomRaf = 0, zoomAt = null, zoomT = 0;
function zoomStop() { cancelAnimationFrame(zoomRaf); zoomRaf = 0; zoomTo = null; }
function zoomStep(now) {
  zoomRaf = 0; if (zoomTo == null) return;
  const dt = Math.min(64, now - (zoomT || now - 16)); zoomT = now;
  const k = 1 - Math.pow(1 - .2, dt / 16.7); // (the same feel at any frame rate)
  let z = cam.z + (zoomTo - cam.z) * k; if (Math.abs(zoomTo - z) < .0008) z = zoomTo;
  const r = ws.getBoundingClientRect(), { w, h } = view(); cam.z = z;
  cam.x = zoomAt.wx - (zoomAt.cx - r.left - w / 2) / z; cam.y = zoomAt.wy - (zoomAt.cy - r.top - h / 2) / z; // (the spot under the pointer stays put)
  placeCam();
  if (z !== zoomTo) zoomRaf = requestAnimationFrame(zoomStep); else { zoomTo = null; camSave(); }
}
ws.addEventListener('wheel', e => { // zoom around the pointer
  if (page && !page.hidden || e.target.closest('.sx-shelf, .sx-mus')) return; // (its lists scroll)
  e.preventDefault(); cancelAnimationFrame(glideRaf);
  const from = zoomTo == null ? cam.z : zoomTo, z = Math.min(1.6, Math.max(.35, from * Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0015))));
  const p = toWorld(e.clientX, e.clientY); zoomAt = { cx: e.clientX, cy: e.clientY, wx: p.x, wy: p.y };
  if (stillUI()) { zoomTo = z; zoomT = 0; zoomStep(performance.now()); return; } // (reduced motion: straight there)
  zoomTo = z; if (!zoomRaf) { zoomT = 0; zoomRaf = requestAnimationFrame(zoomStep); }
}, { passive: false });
ws.addEventListener('pointerdown', zoomStop, true); // (grabbing the desk stops a zoom that's still easing)
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
  if (t && t.isContentEditable) { // writing: the keys are yours, Esc puts the pen down (Enter too, for a group's name)
    if (t.classList.contains('sx-gtag-t') && e.key === 'Enter') { e.preventDefault(); t.blur(); } // (a group's name: Enter is done)
    if (t.classList.contains('sx-tc')) { tblKeys(e, t); e.stopPropagation(); return; } // a table's cell: moving between cells (js/table.js)
    noteKeys(e, t);
    if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); t.blur(); }
    e.stopPropagation(); return;
  }
  if ((t && t.closest && t.closest('input, select, textarea, .sx-ws-menu')) || page && !page.hidden) return; // (the board manager has its own keys)
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
  if (e.key === 'Enter' && !e.shiftKey && picked.size === 1 && deskWriteIn(selId)) { stop(); return; } // Enter: start writing in it, at the end
  const m = /^Digit([0-9])$|^Numpad([0-9])$/.exec(e.code); if (!m) { if (e.key === 'Escape' && picked.size && !(typeof flowCyc !== 'undefined' && flowCyc)) select(null); return; }
  const n = +(m[1] || m[2]); stop();
  if (n === 0) { glideHome(); return; }
  if (e.shiftKey) { const it = selId && itemOf(selId); if (it) setKey(it, n); return; }
  const it = B_().items.find(x => x.board === B_().cur && x.key === n); if (it) glideToItem(it);
}, true);

drawBoard(); placeCam(); camSettle();
