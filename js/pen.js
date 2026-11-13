/* Cassette Timer: the pen. Press D (or Draw on a whiteboard) and you can draw on whiteboards (js/whiteboard.js): freehand,
   or pick a tool for an arrow, a line, a circle or a box (hold Shift for straight angles, true circles and squares). Strokes drawn close together
   within a moment of each other become one drawing, so an arrow's shaft and head stay together; afterwards a drawing
   is a thing on the desk like a note: drag it, tie strings to it, bookmark it, group it. The eraser takes away the
   strokes you touch. The right mouse button still moves the desk, and the wheel still zooms. D or Esc puts the pen down.
   Keys while drawing: P pen, A arrow, L line, C circle, B box, E eraser, [ and ] for thinner and thicker. */
'use strict';

let drawOn = false;
const pen = S.opts.pen = Object.assign({ t: 'pen', c: 'amber', s: 4 }, S.opts.pen || {});
const PEN_SIZES = [2, 4, 8];
if (pen.t === 'frame') pen.t = 'pen'; // (frames are made from the bar now)
const PEN_TOOLS = [['pen', 'Pen', 'P', 'M3 15c3-9 5 1 8-7s5-3 6 4'], ['arrow', 'Arrow', 'A', 'M3 17L16 4M9 4h7v7'], ['line', 'Line', 'L', 'M3 17L17 3'],
  ['circle', 'Circle', 'C', 'M10 3.5a6.5 6.5 0 1 0 .1 0'], ['box', 'Box', 'B', 'M3.5 4.5h13v11h-13z'], ['eraser', 'Eraser', 'E', 'M5 13l7-7 5 5-7 7zM3 18h14']];
const penIcon = d => { const s = el('span', { class: 'sx-pi', 'aria-hidden': 'true' }); s.innerHTML = '<svg viewBox="0 0 20 20"><path d="' + d + '"/></svg>'; return s; }; // (fixed icons, written here)
const penBar = el('div', { class: 'sx-pen', hidden: true, role: 'toolbar', 'aria-label': 'Drawing tools' },
  el('div', { class: 'sx-pen-row' }, ...PEN_TOOLS.map(([k, label, key, d]) => el('button', { type: 'button', class: 'sx-pb', 'data-t': k, title: label + ' (' + key + ')', 'aria-label': label }, penIcon(d)))),
  el('i', { class: 'sx-fsep' }),
  el('div', { class: 'sx-pen-row' }, ...INKS.map(([k, c]) => el('button', { type: 'button', class: 'sx-sw', 'data-c': k, title: k[0].toUpperCase() + k.slice(1), 'aria-label': k + ' ink', style: 'background:' + c }))),
  el('i', { class: 'sx-fsep' }),
  el('div', { class: 'sx-pen-row' }, ...PEN_SIZES.map((s, i) => el('button', { type: 'button', class: 'sx-pb sx-ps', 'data-s': s, title: ['Thin', 'Medium', 'Thick'][i] + ' ([ and ])', 'aria-label': ['Thin', 'Medium', 'Thick'][i] }, el('i', { style: 'height:' + s + 'px' })))),
  el('i', { class: 'sx-fsep' }),
  el('button', { type: 'button', class: 'sx-pb sx-pdone', title: 'Put the pen down (D or Esc)' }, 'Done'));
deskBar.before(penBar);
penBar.addEventListener('mousedown', e => e.preventDefault());
penBar.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.classList.contains('sx-pdone')) { drawModeSet(false); return; }
  if (b.dataset.t) pen.t = b.dataset.t; if (b.dataset.c) pen.c = b.dataset.c; if (b.dataset.s) pen.s = +b.dataset.s;
  save(); penState();
});
function penState() {
  penBar.querySelectorAll('[data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === pen.t));
  penBar.querySelectorAll('[data-c]').forEach(b => b.classList.toggle('on', b.dataset.c === pen.c));
  penBar.querySelectorAll('[data-s]').forEach(b => b.classList.toggle('on', +b.dataset.s === pen.s));
  root.dataset.pen = pen.t;
}
function drawModeSet(on) {
  if (on && !drawOn && !B_().items.some(it => it.type === 'wb' && it.board === B_().cur)) { deskToast('Add a whiteboard to draw on (Whiteboard, in the bar)'); return; } // (nothing to draw on yet)
  if (on === drawOn) return; drawOn = on;
  penBar.hidden = !on; root.classList.toggle('sx-drawing', on); drawB.classList.toggle('on', on);
  if (on) { if (!(selId && (itemOf(selId) || {}).type === 'wb')) select(null); const ae = document.activeElement; if (ae && ae.isContentEditable) ae.blur(); penState(); }
  draft.replaceChildren(); deskSfx(on ? 'pin' : 'drop');
}

/* ---------- drawing a stroke ---------- */
let drawLast = null, drawLastAt = 0;
const snap15 = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy), an = Math.round(Math.atan2(dy, dx) / (Math.PI / 12)) * (Math.PI / 12); return { x: a.x + Math.cos(an) * l, y: a.y + Math.sin(an) * l }; };
function penShape(a, b, pts, shift) { // what the pen has drawn so far, as a stroke (in desk coordinates)
  const t = pen.t;
  if (t === 'pen') return { t, p: pts.map(q => [q.x, q.y]) };
  if ((t === 'line' || t === 'arrow') && shift) b = snap15(a, b);
  if ((t === 'circle' || t === 'box' || t === 'frame') && shift) { const s = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)); b = { x: a.x + Math.sign(b.x - a.x || 1) * s, y: a.y + Math.sign(b.y - a.y || 1) * s }; }
  if (t === 'arrow' && !shift) { // bend it mid-drag and the arrow curves through where you went
    const L = Math.hypot(b.x - a.x, b.y - a.y) || 1; let far = null, fd = 0;
    pts.forEach(q => { const d = Math.abs((b.x - a.x) * (a.y - q.y) - (a.x - q.x) * (b.y - a.y)) / L; if (d > fd) { fd = d; far = q; } });
    if (far && fd > 14 / cam.z && L > 30) return { t, p: [[a.x, a.y], [2 * far.x - (a.x + b.x) / 2, 2 * far.y - (a.y + b.y) / 2], [b.x, b.y]] };
  }
  return { t, p: [[a.x, a.y], [b.x, b.y]] };
}
function penCommit(st, seed) {
  const B = B_(), [x0, y0, x1, y1] = st.p.reduce((r, [x, y]) => [Math.min(r[0], x), Math.min(r[1], y), Math.max(r[2], x), Math.max(r[3], y)], [Infinity, Infinity, -Infinity, -Infinity]);
  if (st.t !== 'pen' && Math.hypot(x1 - x0, y1 - y0) < 6) return; // a slip, not a shape
  if (st.t === 'frame') { if (x1 - x0 > 40 && y1 - y0 > 30) addFrameAt({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }); return; }
  Object.assign(st, { c: pen.c, s: pen.s, seed });
  // close to the last drawing, a moment later: it's part of the same drawing
  let it = drawLast && Date.now() - drawLastAt < 1600 ? B.items.find(x => x.id === drawLast && x.board === B.cur) : null;
  if (it && !(x0 < it.x + it.w + 80 && x1 > it.x - 80 && y0 < it.y + it.h + 80 && y1 > it.y - 80)) it = null;
  deskMark();
  if (!it) { it = { id: 'd' + Date.now(), type: 'draw', board: B.cur, x: 0, y: 0, w: 0, h: 0, strokes: [] }; B.items.push(it); }
  drawFit(it, drawAbs(it).concat([st]));
  drawLast = it.id; drawLastAt = Date.now(); if (!stillUI()) drawWet = { id: it.id, i: it.strokes.length - 1, t: performance.now() }; save(); drawBoard();
}
function penErase(x, y, marked) { // the eraser: whatever stroke is under it goes
  const hit = document.elementsFromPoint(x, y).find(n => n.classList && n.classList.contains('sx-dhit')); if (!hit) return marked;
  const wb = hit.closest('.sx-bwb'), wit = wb && itemOf(wb.dataset.id);
  if (wit) { if (!marked) deskMark(); wit.strokes.splice(+hit.dataset.i, 1); deskSfx('tear'); save(); wbRedraw(wit); return true; } // on a whiteboard
  const c = hit.closest('.sx-bdraw'), it = c && itemOf(c.dataset.id); if (!it) return marked;
  if (!marked) deskMark();
  const abs = drawAbs(it); abs.splice(+hit.dataset.i, 1);
  if (abs.length) drawFit(it, abs); else removeItems([it.id]);
  deskSfx('tear'); save(); drawBoard(); return true;
}
ws.addEventListener('pointerdown', e => {
  if (!drawOn || e.button !== 0 || page && !page.hidden || e.target.closest('.sx-corner button, .sx-tapes')) return;
  // only a whiteboard's surface takes the pen (and the eraser, old drawings on the desk too); anywhere else, the desk as usual
  const surf = e.target.closest('.sx-wb-s');
  if (!surf && !(pen.t === 'eraser' && e.target.closest('.sx-bdraw'))) return;
  e.stopPropagation(); e.preventDefault(); cancelAnimationFrame(glideRaf);
  ws.setPointerCapture(e.pointerId);
  const done = (move, end) => { let over = false; const fin = ev => { if (over) return; over = true; ws.removeEventListener('pointermove', move); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(k => ws.removeEventListener(k, fin)); end(ev); };
    ws.addEventListener('pointermove', move); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(k => ws.addEventListener(k, fin)); };
  if (pen.t === 'eraser') { // every few pixels along the way, so a quick swipe still catches what it crosses
    let marked = penErase(e.clientX, e.clientY, false), lx = e.clientX, ly = e.clientY;
    done(ev => { const n = Math.max(1, Math.ceil(Math.hypot(ev.clientX - lx, ev.clientY - ly) / 5)); for (let i = 1; i <= n; i++) marked = penErase(lx + (ev.clientX - lx) * i / n, ly + (ev.clientY - ly) * i / n, marked); lx = ev.clientX; ly = ev.clientY; }, () => {});
    return;
  }
  if (surf) { wbStroke(e, surf, done); return; }
  const a = toWorld(e.clientX, e.clientY), pts = [a], seed = (Math.random() * 2 ** 31) | 0; let b = a, shift = e.shiftKey; // (one seed: what you see while drawing is what stays)
  const show = () => {
    const st = penShape(a, b, pts, shift);
    if (pen.t === 'frame') { const r = { x: Math.min(st.p[0][0], st.p[1][0]), y: Math.min(st.p[0][1], st.p[1][1]), w: Math.abs(st.p[1][0] - st.p[0][0]), h: Math.abs(st.p[1][1] - st.p[0][1]) };
      draft.replaceChildren(el('div', { class: 'sx-draft-frame', style: 'left:' + r.x + 'px;top:' + r.y + 'px;width:' + r.w + 'px;height:' + r.h + 'px' })); return; }
    draft.replaceChildren(drawSvg({ strokes: [Object.assign(st, { c: pen.c, s: pen.s, seed })] }, true));
  };
  show();
  done(ev => {
    const q = toWorld(ev.clientX, ev.clientY), last = pts[pts.length - 1]; shift = ev.shiftKey; b = q;
    if (Math.hypot(q.x - last.x, q.y - last.y) >= 1.5 / cam.z) { pts.push(q); }
    show();
  }, ev => {
    draft.replaceChildren();
    if (ev.type !== 'pointerup' && ev.type !== 'lostpointercapture') return;
    penCommit(penShape(a, b, pts, shift), seed);
  });
}, true); // (the capture phase: on a whiteboard, the pen goes first)

// the keys while drawing (called from the desk's key handler in js/ui/board.js); true when the key was the pen's
function drawKeys(e) {
  if (e.code === 'KeyD' && !e.shiftKey) { drawModeSet(!drawOn); return true; }
  if (!drawOn) return false;
  if (e.key === 'Escape') { drawModeSet(false); return true; }
  const tool = { KeyP: 'pen', KeyA: 'arrow', KeyL: 'line', KeyC: 'circle', KeyB: 'box', KeyE: 'eraser' }[e.code];
  if (tool) { pen.t = tool; save(); penState(); return true; }
  if (e.key === '[' || e.key === ']') { const i = PEN_SIZES.indexOf(pen.s); pen.s = PEN_SIZES[Math.max(0, Math.min(2, (i < 0 ? 1 : i) + (e.key === ']' ? 1 : -1)))]; save(); penState(); return true; }
  return false;
}
