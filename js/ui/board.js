/* Solarist: the workspace. The whole screen is one big desk with the clock in the middle. Drag the empty space to move
   around, scroll to zoom, double-click anywhere to pin a note there, drop photos straight on (they hang as Polaroids),
   and drag from a red pin onto something else to tie a string. Bookmarks: select a note or photo and press Shift+1 to 9
   to give it a number; then 1 to 9 glides the camera there, and 0 glides back to the clock. Make as many boards (desks)
   as you like. Everything but the photos is saved with your game (S.board); the photos live in the browser's picture
   storage (IndexedDB), shrunk so they never fill your save. */
'use strict';

// what's saved: { boards: [{ id, name }], cur, cam: { x, y, z }, items: [{ id, type: 'note' | 'photo', board, x, y, text, key }], links: [[id, id]] }
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
  return { put: (k, v) => run('readwrite', s => s.put(v, k)), get: k => run('readonly', s => s.get(k)), del: k => run('readwrite', s => s.delete(k)) };
})();
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
const strings = document.createElementNS(SVGNS, 'svg'); strings.setAttribute('class', 'sx-strings');
const layer = el('div', { class: 'sx-layer' });
world.append(strings, corner, layer); ws.append(world);
root.append(ws); root.classList.add('sx-desk');
const tabBoard = el('button', { type: 'button', hidden: true }); // (the Board is the desk itself now)
const tabBase2 = tab;
tab = function (t) { return tabBase2(t === 'board' ? 'timer' : t); };

const cam = S.board.cam; cam.z = Math.min(1.6, Math.max(.35, +cam.z || 1));
const view = () => ({ w: ws.clientWidth || innerWidth, h: ws.clientHeight || innerHeight });
function placeCam() {
  const { w, h } = view(), tx = w / 2 - cam.x * cam.z, ty = h / 2 - cam.y * cam.z;
  world.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + cam.z + ')';
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
function glideToItem(it) {
  const c = layer.querySelector('[data-id="' + it.id + '"]'); if (!c) return;
  glideTo(it.x + c.offsetWidth / 2, it.y + c.offsetHeight / 2, 1); select(it.id);
}

/* ---------- the bar along the bottom ---------- */
const deskSel = el('select', { 'aria-label': 'Which board' });
deskSel.addEventListener('change', () => { S.board.cur = deskSel.value; selId = null; save(); drawBoard(); glideHome(); });
const deskBtn = (label, fn, cls) => el('button', { type: 'button', class: 'sx-ws-b' + (cls ? ' ' + cls : ''), onclick: e => { e.currentTarget.blur(); fn(); } }, label);
const deskFile = el('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
const deskKeys = el('div', { class: 'sx-ws-keys', 'aria-label': 'Bookmarks' });
const deskHomeB = deskBtn('0 · Clock', glideHome, 'sx-ws-home');
let deskDel = null;
function deskBoardTools() {
  const B = S.board, cur = B.boards.find(b => b.id === B.cur);
  deskSel.replaceChildren(...B.boards.map(b => el('option', { value: b.id, selected: b.id === B.cur || null }, b.name)));
  const del = B.boards.length > 1 ? armBtn('Delete', 'Sure? Everything on it goes', () => {
    const items = B.items.filter(it => it.board === B.cur), ids = new Set(items.map(it => it.id));
    items.forEach(it => { if (it.type === 'photo') PHOTOS.del(it.id).catch(() => {}); });
    B.items = B.items.filter(it => it.board !== B.cur); B.links = B.links.filter(l => !l.some(id => ids.has(id))); B.boards = B.boards.filter(b => b.id !== B.cur); B.cur = B.boards[0].id; save(); drawBoard(); glideHome(); }, 'sx-ws-b') : el('span', { hidden: true });
  if (deskDel) deskDel.replaceWith(del); deskDel = del;
  void cur;
}
const deskBar = el('div', { class: 'sx-ws-bar' },
  el('div', { class: 'sx-ws-grp' }, deskSel,
    deskBtn('New', () => { const B = S.board, name = (prompt('Name the new board:', 'Board ' + (B.boards.length + 1)) || '').trim().slice(0, 40); if (!name) return; const id = 'b' + Date.now(); B.boards.push({ id, name }); B.cur = id; save(); drawBoard(); glideHome(); }),
    deskBtn('Rename', () => { const B = S.board, cur = B.boards.find(b => b.id === B.cur), name = (prompt('Rename this board:', cur.name) || '').trim().slice(0, 40); if (name) { cur.name = name; save(); deskBoardTools(); } }),
    (deskDel = el('span', { hidden: true }))),
  el('div', { class: 'sx-ws-grp' }, deskBtn('Note', () => addNoteAt(freeSpot())), deskBtn('Photo', () => deskFile.click()), deskFile),
  el('div', { class: 'sx-ws-grp' }, deskHomeB, deskKeys),
  el('small', { class: 'sx-ws-help' }, 'Drag to move · scroll to zoom · double-click for a note · select one and Shift+1-9 to bookmark it'));
ws.after(deskBar);

// the 0 button shows the time while the clock is out of sight
function deskHome() {
  const { w, h } = view(), off = Math.abs(cam.x) * cam.z > w / 2 || Math.abs(cam.y) * cam.z > h / 2 || cam.z < .5;
  deskHomeB.textContent = off ? '0 · ' + (timeText.textContent || 'Clock') : '0 · Clock'; deskHomeB.classList.toggle('away', off);
}
new MutationObserver(deskHome).observe(timeText, { childList: true, characterData: true, subtree: true });

/* ---------- what's on the desk ---------- */
let selId = null;
const els = new Map();
const B_ = () => S.board;
function select(id) { selId = id; layer.querySelectorAll('.sx-bcard').forEach(c => c.classList.toggle('sel', c.dataset.id === id)); }
function deskDrawKeys() {
  const items = B_().items.filter(it => it.board === B_().cur && it.key).sort((a, b) => a.key - b.key);
  deskKeys.replaceChildren(...items.map(it => { const b = deskBtn(String(it.key), () => glideToItem(it)); b.title = (it.text || (it.type === 'photo' ? 'A photo' : 'A note')).slice(0, 60); return b; }));
}
function setKey(it, n) { // one number, one thing (on this board)
  const had = it.key === n;
  B_().items.forEach(x => { if (x.board === it.board && x.key === n) delete x.key; });
  if (!had) it.key = n; save(); drawBoard();
}
function drawBoard() {
  const B = B_(), items = B.items.filter(it => it.board === B.cur);
  els.clear(); layer.replaceChildren();
  const remove = it => { deskSfx('pick'); B.items = B.items.filter(x => x !== it); B.links = B.links.filter(l => !l.includes(it.id)); if (it.type === 'photo') PHOTOS.del(it.id).catch(() => {}); if (selId === it.id) selId = null; save(); drawBoard(); };
  items.forEach(it => {
    const x = el('button', { type: 'button', class: 'sx-bnote-x', 'aria-label': it.type === 'photo' ? 'Take the photo down' : 'Take the note down', onclick: () => remove(it) }, '×');
    const txt = el('div', { class: it.type === 'photo' ? 'sx-cap-t' : 'sx-note-t', contenteditable: 'true', 'aria-label': it.type === 'photo' ? 'Caption' : 'Note', 'data-ph': it.type === 'photo' ? 'Write a caption...' : 'Write something...' }, it.text || '');
    txt.addEventListener('input', () => { it.text = txt.innerText.slice(0, 2000); save(); });
    const pin = el('span', { class: 'sx-pin', title: 'Drag to something else to tie a string' });
    const key = it.key ? el('span', { class: 'sx-bkey', title: 'Press ' + it.key + ' to come here' }, String(it.key)) : null;
    const style = 'left:' + it.x + 'px;top:' + it.y + 'px;--tilt:' + tilt(it.id) + 'deg';
    let c;
    if (it.type === 'photo') {
      const img = el('img', { alt: it.text || 'A photo', draggable: 'false' });
      PHOTOS.get(it.id).then(src => { if (src) img.src = src; else img.alt = 'This photo is missing (it lives in the browser it was added in).'; drawStrings(); }).catch(() => {});
      img.addEventListener('load', () => drawStrings());
      c = el('div', { class: 'sx-bcard sx-polaroid', 'data-id': it.id, style }, ...[pin, x, key, el('div', { class: 'sx-pol-img' }, img), txt].filter(Boolean));
    } else c = el('div', { class: 'sx-bcard sx-bnote', 'data-id': it.id, style }, ...[pin, x, key, txt].filter(Boolean));
    if (it.id === selId) c.classList.add('sel');
    els.set(it.id, c); layer.append(c);
  });
  deskBoardTools(); deskDrawKeys();
  requestAnimationFrame(() => drawStrings());
}
const posOf = id => { const c = els.get(id); return c ? { x: c.offsetLeft + c.offsetWidth / 2, y: c.offsetTop + 10 } : null; };
// strings: a gentle sag between two pins, plus a wobble when either end moves
const wob = new Map(), lk = l => l[0] + '|' + l[1];
const pathD = (a, b, w) => { const mx = (a.x + b.x) / 2 + (w ? w.x : 0), my = (a.y + b.y) / 2 + 36 + Math.hypot(b.x - a.x, b.y - a.y) * .15 + (w ? w.y : 0); return 'M' + a.x + ' ' + a.y + ' Q' + mx + ' ' + my + ' ' + b.x + ' ' + b.y; };
let strNodes = [], strTemp = null, strTempP = null;
function drawStrings(temp) {
  const B = B_(); strings.replaceChildren(); strNodes = []; strTempP = null; strTemp = temp || null;
  B.links.forEach(l => {
    const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('class', 'sx-string');
    const hit = document.createElementNS(SVGNS, 'path'); hit.setAttribute('class', 'sx-string-hit');
    hit.addEventListener('pointerdown', e => e.stopPropagation());
    hit.addEventListener('click', () => { B.links = B.links.filter(x => x !== l); wob.delete(lk(l)); deskSfx('tear'); save(); drawStrings(); });
    strings.append(hit, p); strNodes.push({ l, p, hit }); });
  strUpdate();
}
function strUpdate() {
  strNodes.forEach(n => { const a = posOf(n.l[0]), b = posOf(n.l[1]); if (!a || !b) return; const d = pathD(a, b, wob.get(lk(n.l))); n.p.setAttribute('d', d); n.hit.setAttribute('d', d); });
  if (strTemp) { if (!strTempP) { strTempP = document.createElementNS(SVGNS, 'path'); strTempP.setAttribute('class', 'sx-string sx-string-temp'); strings.append(strTempP); } strTempP.setAttribute('d', pathD(strTemp.a, strTemp.b)); }
  else if (strTempP) { strTempP.remove(); strTempP = null; }
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
  const s = c._sw = c._sw || { a: 0, v: 0, t: 0 }; s.t = target; swinging.add(c); if (!swingRaf) swingRaf = requestAnimationFrame(swingStep);
}
function swingStep() {
  swingRaf = 0;
  swinging.forEach(c => { const s = c._sw; s.v = (s.v + (s.t - s.a) * .1) * .87; s.a += s.v; s.t *= .86;
    if (Math.abs(s.a) + Math.abs(s.v) + Math.abs(s.t) < .06) { s.a = 0; s.v = 0; swinging.delete(c); }
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
  deskSfx('pin'); const id = 'n' + Date.now(); B_().items.push({ id, type: 'note', board: B_().cur, x: Math.round(p.x), y: Math.round(p.y), text: '' }); save(); select(id); drawBoard();
  const t = layer.querySelector('[data-id="' + id + '"] .sx-note-t'); if (t) t.focus({ preventScroll: true });
}
async function addPhotos(files, at) {
  let k = 0;
  for (const f of [...files].filter(f => /^image\//.test(f.type))) {
    try { const src = await shrinkPhoto(f), id = 'p' + Date.now() + '-' + k; await PHOTOS.put(id, src);
      const p = at ? { x: at.x - 120 + k * 30, y: at.y - 40 + k * 30 } : freeSpot(); B_().items.push({ id, type: 'photo', board: B_().cur, x: Math.round(p.x), y: Math.round(p.y), text: '' }); k++; }
    catch (e) { /* not a picture the browser can read: skip it */ }
  }
  if (k) { deskSfx('shutter'); save(); drawBoard(); }
}
deskFile.addEventListener('change', () => { addPhotos(deskFile.files); deskFile.value = ''; });

/* ---------- hands: panning, dragging, strings ---------- */
ws.addEventListener('pointerdown', e => {
  if (e.button !== 0 || page && !page.hidden) return;
  cancelAnimationFrame(glideRaf);
  const c = e.target.closest('.sx-bcard');
  if (c) {
    select(c.dataset.id);
    if (e.target.closest('.sx-note-t, .sx-cap-t, .sx-bnote-x')) return; // writing, or taking it down
    const id = c.dataset.id, it = B_().items.find(x => x.id === id), start = { x: e.clientX, y: e.clientY, l: it.x, t: it.y };
    e.preventDefault(); c.setPointerCapture(e.pointerId);
    if (e.target.classList.contains('sx-pin')) {
      deskSfx('pin'); const a = posOf(id), move = ev => { strTemp = { a, b: toWorld(ev.clientX, ev.clientY) }; strUpdate(); };
      const up = ev => { c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up);
        const under = document.elementsFromPoint(ev.clientX, ev.clientY).map(n => n.closest && n.closest('.sx-bcard')).find(n => n && n !== c);
        strTemp = null;
        if (under && !B_().links.some(l => l.includes(id) && l.includes(under.dataset.id))) { const l = [id, under.dataset.id]; B_().links.push(l); save(); if (!stillUI()) wob.set(lk(l), { x: 0, y: -34, vx: 0, vy: 0 }); deskSfx('tie'); } // it drops into its sag and bounces
        drawStrings(); if (wob.size && !wobRaf) wobRaf = requestAnimationFrame(wobStep); };
      c.addEventListener('pointermove', move); c.addEventListener('pointerup', up); return;
    }
    c.classList.add('lift'); layer.append(c); deskSfx('pick'); // the one you pick up comes to the top
    let lx = e.clientX, ly = e.clientY;
    const move = ev => { it.x = Math.round(start.l + (ev.clientX - start.x) / cam.z); it.y = Math.round(start.t + (ev.clientY - start.y) / cam.z); c.style.left = it.x + 'px'; c.style.top = it.y + 'px';
      const vx = ev.clientX - lx, vy = ev.clientY - ly; lx = ev.clientX; ly = ev.clientY;
      swingTo(c, Math.max(-16, Math.min(16, vx * 1.2))); wobKick(id, vx / cam.z, vy / cam.z); strUpdate(); };
    const up = () => { c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); c.classList.remove('lift'); swingTo(c, 0); deskSfx('drop'); B_().items = B_().items.filter(x => x !== it).concat(it); save(); };
    c.addEventListener('pointermove', move); c.addEventListener('pointerup', up);
    return;
  }
  if (e.target.closest('button, input, select, a, [contenteditable]')) return; // the clock's own buttons
  // the empty desk (or the clock's face): move the camera
  select(null); if (document.activeElement && document.activeElement.isContentEditable) document.activeElement.blur();
  const s = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y }; let moved = false;
  ws.setPointerCapture(e.pointerId); ws.classList.add('panning');
  const move = ev => { if (!moved && Math.hypot(ev.clientX - s.x, ev.clientY - s.y) < 3) return; moved = true; cam.x = s.cx - (ev.clientX - s.x) / cam.z; cam.y = s.cy - (ev.clientY - s.y) / cam.z; placeCam(); };
  const up = () => { ws.removeEventListener('pointermove', move); ws.removeEventListener('pointerup', up); ws.removeEventListener('pointercancel', up); ws.classList.remove('panning'); if (moved) camSave(); };
  ws.addEventListener('pointermove', move); ws.addEventListener('pointerup', up); ws.addEventListener('pointercancel', up);
});
ws.addEventListener('dblclick', e => { if (e.target.closest('.sx-bcard, .sx-corner')) return; addNoteAt((p => ({ x: p.x - 100, y: p.y - 20 }))(toWorld(e.clientX, e.clientY))); });
ws.addEventListener('wheel', e => { // zoom around the pointer
  if (page && !page.hidden) return;
  e.preventDefault(); cancelAnimationFrame(glideRaf);
  const before = toWorld(e.clientX, e.clientY), z = Math.min(1.6, Math.max(.35, cam.z * Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0015))));
  cam.z = z; const after = toWorld(e.clientX, e.clientY); cam.x += before.x - after.x; cam.y += before.y - after.y; placeCam(); camSave();
}, { passive: false });
ws.addEventListener('dragover', e => { if ([...(e.dataTransfer.items || [])].some(i => i.kind === 'file')) { e.preventDefault(); ws.classList.add('drop'); } });
ws.addEventListener('dragleave', () => ws.classList.remove('drop'));
ws.addEventListener('drop', e => { e.preventDefault(); ws.classList.remove('drop'); addPhotos(e.dataTransfer.files, toWorld(e.clientX, e.clientY)); });
addEventListener('resize', placeCam);

/* ---------- keys: 1-9 go to a bookmark, Shift+1-9 sets one, 0 goes home ---------- */
// (registered on window in the capture phase so it runs before the timer's own keys)
addEventListener('keydown', e => {
  const t = e.target;
  if (t && t.isContentEditable) { // writing a note: the keys are yours, Esc puts the pen down
    if (e.key === 'Escape') { e.preventDefault(); t.blur(); }
    e.stopPropagation(); return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey || (t && t.closest && t.closest('input, select, textarea')) || page && !page.hidden) return;
  const m = /^Digit([0-9])$|^Numpad([0-9])$/.exec(e.code); if (!m) { if (e.key === 'Escape' && selId) { select(null); } return; }
  const n = +(m[1] || m[2]); e.preventDefault(); e.stopPropagation();
  if (n === 0) { glideHome(); return; }
  if (e.shiftKey) { const it = selId && B_().items.find(x => x.id === selId); if (it) setKey(it, n); return; }
  const it = B_().items.find(x => x.board === B_().cur && x.key === n); if (it) glideToItem(it);
}, true);

drawBoard(); placeCam();
