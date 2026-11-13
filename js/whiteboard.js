/* Cassette Timer: whiteboards. Drawing lives on a whiteboard now, not loose on the desk: add one from the bar and the pen
   comes up. With the pen down (D, or Draw on the board's rail) you draw only on a board's white surface, and the marks
   stay inside its edges; everywhere else the desk works as usual. A board moves by its rail (or anywhere with the pen
   up), resizes from its corner, and Wipe cleans it. Strokes are kept in the board's own coordinates, so they move and
   resize with it. Drawings made loose on the desk before whiteboards stay where they are (the eraser still works on them). */
'use strict';

function wbCard(it) {
  const btn = (cls, label, title, fn) => el('button', { type: 'button', class: cls, title, 'aria-label': title, onclick: e => { e.stopPropagation(); fn(); } }, label);
  const penB = btn('sx-wb-b sx-wb-pen', 'Draw', 'Draw on it (D)', () => { select(it.id); drawModeSet(!drawOn); });
  const wipe = btn('sx-wb-b', 'Wipe', 'Wipe it clean (Undo brings it back)', () => { if (!(it.strokes || []).length) return; deskMark(); it.strokes = []; deskSfx('tear'); save(); wbRedraw(it); });
  const x = btn('sx-bnote-x', '×', 'Take the whiteboard down', () => removeOne(it));
  return el('div', { class: 'sx-bcard sx-bwb', 'data-id': it.id, style: 'left:' + it.x + 'px;top:' + it.y + 'px;width:' + it.w + 'px;height:' + it.h + 'px;--tilt:0deg' },
    el('div', { class: 'sx-wb-h', title: 'Drag to move the whiteboard' }, ...[keyBadge(it), el('span', { class: 'sx-wb-t' }, 'Whiteboard'), el('span', { class: 'sx-gap' }), penB, wipe, x].filter(Boolean)),
    el('div', { class: 'sx-wb-s' }, drawSvg(it)), el('i', { class: 'sx-wb-tray', 'aria-hidden': 'true' }), el('span', { class: 'sx-resize', title: 'Drag to resize' }));
}
function wbRedraw(it) { const c = els.get(it.id), s = c && c.querySelector('.sx-wb-s'); if (s) s.replaceChildren(drawSvg(it)); }
function addWhiteboard() {
  const v = view(), w = Math.round(Math.min(760, v.w * .55 / cam.z)), h = Math.round(Math.min(520, v.h * .5 / cam.z)), p = freeSpot();
  deskMark(); deskSfx('pin'); const id = 'w' + Date.now();
  B_().items.push({ id, type: 'wb', board: B_().cur, x: Math.round(p.x - w / 2 + 100), y: Math.round(p.y - h / 2 + 60), w, h, strokes: [] }); save(); drawBoard(); select(id);
  if (!pen.c || pen.c === 'cream') { pen.c = 'ink'; save(); } // (a dark marker on a white board)
  drawModeSet(true);
}
// where a point on the desk falls on a board's surface
function wbLocal(card, surf, it, q) { return { x: q.x - it.x - card.clientLeft - surf.offsetLeft, y: q.y - it.y - card.clientTop - surf.offsetTop }; }
function wbCommit(it, st, seed) {
  const [x0, y0, x1, y1] = st.p.reduce((r, [x, y]) => [Math.min(r[0], x), Math.min(r[1], y), Math.max(r[2], x), Math.max(r[3], y)], [Infinity, Infinity, -Infinity, -Infinity]);
  if (st.t !== 'pen' && Math.hypot(x1 - x0, y1 - y0) < 6) return; // a slip, not a shape
  deskMark(); it.strokes = it.strokes || [];
  it.strokes.push({ t: st.t, c: pen.c, s: pen.s, seed, p: st.p.map(([x, y]) => [f1(x), f1(y)]) });
  if (!stillUI()) drawWet = { id: it.id, i: it.strokes.length - 1, t: performance.now() };
  save(); wbRedraw(it);
}
// the pen, on a board: called from js/pen.js when the pen goes down on a board's surface
function wbStroke(e, surf, done) {
  const card = surf.closest('.sx-bwb'), it = card && itemOf(card.dataset.id); if (!it) return;
  const at = ev => wbLocal(card, surf, it, toWorld(ev.clientX, ev.clientY));
  const a = at(e), pts = [a], seed = (Math.random() * 2 ** 31) | 0; let b = a, shift = e.shiftKey;
  const live = el('div', { class: 'sx-wb-live' }); surf.append(live);
  const show = () => live.replaceChildren(drawSvg({ strokes: [Object.assign(penShape(a, b, pts, shift), { c: pen.c, s: pen.s, seed })] }, true));
  show();
  done(ev => {
    const q = at(ev), last = pts[pts.length - 1]; shift = ev.shiftKey; b = q;
    if (Math.hypot(q.x - last.x, q.y - last.y) >= 1.5 / cam.z) { pts.push(q); if (pen.t === 'pen') deskSfx('scratch'); }
    show();
  }, ev => {
    live.remove();
    if (ev.type !== 'pointerup' && ev.type !== 'lostpointercapture') return;
    wbCommit(it, penShape(a, b, pts, shift), seed);
  });
}
