/* Cassie: writing that flows.
   - a thin cursor in the ink's colour that glides to each new letter instead of jumping, stays solid while you type and
     only blinks once you stop
   - the line you're typing stays in view: in a long note the paper scrolls under it, and near the edge of the screen the
     desk glides along
   - while writing in a note: Shift+Enter a new note tied to it, on its right (and you write on in it); a pasted picture tied
     to it (the cards tied to it are in the strip along the bottom: js/tied.js) */
'use strict';

const FLOW_PAPER = '.sx-note-t, .sx-cap-t';
const flowCaret = el('i', { class: 'sx-caret', 'aria-hidden': 'true' });
let flowIdleT = 0, flowRaf = 0;

/* ---------- the cursor ---------- */
function flowBox() { const a = document.activeElement; return a && a.isContentEditable && a.matches(FLOW_PAPER) && a.closest('.sx-world .sx-bcard') ? a : null; }
function flowCaretRect(box) { // where the cursor is, on the screen (an empty line has no letters to measure: its line is used instead)
  const s = getSelection(); if (!s.rangeCount || !s.isCollapsed || !box.contains(s.anchorNode)) return null;
  const rg = s.getRangeAt(0); let r = rg.getClientRects()[0];
  if (!r || !r.height) { const n = s.anchorNode.nodeType === 1 ? s.anchorNode.childNodes[s.anchorOffset] || s.anchorNode : s.anchorNode.parentElement;
    const e = n && n.nodeType === 1 ? n : n && n.parentElement; if (!e) return null;
    const er = e.getBoundingClientRect(), lh = parseFloat(getComputedStyle(e).lineHeight) || parseFloat(getComputedStyle(box).fontSize) * 1.5 || 22;
    const pl = parseFloat(getComputedStyle(e).paddingLeft) || 0; r = { left: er.left + pl * cam.z, top: er.top, height: Math.min(er.height || lh * cam.z, lh * cam.z) }; }
  return r;
}
function flowPlace(jump) {
  flowRaf = 0; const box = flowBox(); if (typeof flowWriting === 'function') flowWriting(); // (strings step aside while you write)
  if (!box) { flowCaret.remove(); return; }
  const r = flowCaretRect(box), card = box.closest('.sx-bcard'); if (!r) { flowCaret.remove(); return; }
  const cr = card.getBoundingClientRect(), z = cam.z || 1;
  if (flowCaret.parentNode !== card) { card.append(flowCaret); jump = true; } // (a new card, or the desk was drawn again)
  flowCaret.classList.toggle('jump', !!jump); flowCaret.style.setProperty('--cz', String(cam.z));
  flowCaret.style.color = getComputedStyle(box).color;
  flowCaret.style.height = (r.height / z).toFixed(1) + 'px';
  flowCaret.style.translate = ((r.left - cr.left) / z - card.clientLeft).toFixed(1) + 'px ' + ((r.top - cr.top) / z - card.clientTop).toFixed(1) + 'px';
  flowCaret.classList.remove('idle'); clearTimeout(flowIdleT); flowIdleT = setTimeout(() => flowCaret.classList.add('idle'), 650); // solid while you type, blinking once you stop
}
const flowSoon = jump => { if (jump) { cancelAnimationFrame(flowRaf); flowPlace(true); return; } if (!flowRaf) flowRaf = requestAnimationFrame(() => flowPlace(false)); };
document.addEventListener('selectionchange', () => flowSoon(false));
document.addEventListener('focusin', e => { if (e.target.matches && e.target.matches(FLOW_PAPER)) flowSoon(true); });
document.addEventListener('focusout', () => setTimeout(() => { if (!flowBox()) flowCaret.remove(); }, 0));
document.addEventListener('scroll', () => { if (flowBox()) flowSoon(true); }, true); // (a long note scrolled under it)
{ const settle0 = camSettle; camSettle = function () { const r = settle0.apply(this, arguments); if (flowBox()) flowSoon(true); return r; }; }

/* ---------- keeping the line you're typing in view (called once a frame while you type, from js/typing.js) ---------- */
function flowAfterType(box) {
  flowPlace(false);
  const r = flowCaretRect(box); if (!r) return;
  const card = box.closest('.sx-bcard');
  if (card.classList.contains('sized') && box.scrollHeight > box.clientHeight) { // a long note: the paper moves up under the line, like a typewriter
    const br = box.getBoundingClientRect(), y = r.top - br.top, mark = br.height * .62;
    if (y > mark) box.scrollBy({ top: (y - mark) / (cam.z || 1) + 4, behavior: stillUI() ? 'auto' : 'smooth' });
    return;
  }
  const top = 70, bottom = innerHeight - 120, left = 70, right = innerWidth - 40; // (clear of the corners and the bottom bar)
  let dx = 0, dy = 0;
  if (r.top + r.height > bottom) dy = r.top + r.height - bottom + 60; else if (r.top < top) dy = r.top - top - 40;
  if (r.left > right) dx = r.left - right + 80; else if (r.left < left) dx = r.left - left - 80;
  if (dx || dy) glideTo(cam.x + dx / cam.z, cam.y + dy / cam.z, cam.z, true);
}

/* ---------- making tied cards while you write: Shift+Enter a note to the right (and you're writing in it); a picture pasted
   while you write, tied to it (you stay where you were). New cards are added on their own, without drawing the whole desk again ---------- */
function flowAddCard(it) {
  B_().items.push(it); const c = cardMade(paperCard(it), it); els.set(it.id, c); layer.append(c); layerTop += 2; c.style.zIndex = String(layerTop); return c;
}
// a free spot next to a card, in a direction: past anything already there, and clear of the clock
function flowSpot(card, it, dir, nw, nh) {
  const B = B_(), w = card.offsetWidth, h = card.offsetHeight, gap = 70;
  let x = dir === 'right' ? it.x + w + gap : dir === 'left' ? it.x - nw - gap : it.x, y = dir === 'down' ? it.y + h + gap : dir === 'up' ? it.y - nh - gap : it.y;
  const hit = (x, y) => B.items.some(o => { if (o.board !== B.cur || o === it) return false; const c = els.get(o.id); if (!c) return false;
    return x < o.x + c.offsetWidth + 20 && x + nw > o.x - 20 && y < o.y + c.offsetHeight + 20 && y + nh > o.y - 20; });
  const cw = corner.offsetWidth / 2 + 60, ch = corner.offsetHeight / 2 + 60;
  const onClock = (x, y) => x < cw && x + nw > -cw && y < ch && y + nh > -ch;
  const across = dir === 'left' || dir === 'right'; // (blocked: step along the other way, down for a row, right for a column)
  for (let k = 0; k < 14 && (hit(x, y) || onClock(x, y)); k++) { if (across) y = onClock(x, y) ? Math.max(y + 70, ch) : y + 70; else x = onClock(x, y) ? Math.max(x + 70, cw) : x + 70; }
  return { x: Math.round(x), y: Math.round(y) };
}
function noteChain(t, dir) {
  const card = t.closest('.sx-bcard'), it = card && itemOf(card.dataset.id); if (!it) return;
  dir = dir || 'right'; const nw = it.w || 220, nh = Math.max(120, Math.min(card.offsetHeight, 220));
  deskMark(); const id = 'n' + Date.now(), p = flowSpot(card, it, dir, nw, nh);
  const n = { id, type: 'note', board: B_().cur, mt: Date.now(), x: p.x, y: p.y, text: '', html: '' };
  if (it.type === 'note') ['color', 'paper', 'fs', 'w'].forEach(k => { if (it[k] != null) n[k] = it[k]; }); // (the same paper as the note you came from)
  flowAddCard(n); B_().links.push([it.id, id]); save();
  select(id); deskWriteIn(id); deskLand(id, true); drawStrings(); flowSoon(true);
  const c = els.get(id); if (c) glideTo(n.x + c.offsetWidth / 2, n.y + c.offsetHeight / 2, cam.z, true, () => flowSoon(true)); // the view glides over to the new note (at the same zoom)
}
// photos beside the note you're in, each tied to it; the pen stays where it was
async function flowPhotos(files, card, write = true) {
  const it = card && itemOf(card.dataset.id); if (!it) return 0;
  const s = getSelection(), keep = s.rangeCount ? s.getRangeAt(0).cloneRange() : null, txt = card.querySelector('.sx-note-t');
  let k = 0;
  for (const f of [...files].filter(f => /^image\//.test(f.type))) {
    try { const src = await shrinkPhoto(f), id = 'p' + Date.now() + '-' + k; await PHOTOS.put(id, src);
      if (!k) deskMark();
      const p = flowSpot(card, it, 'right', 230, 250);
      flowAddCard({ id, type: 'photo', board: B_().cur, x: p.x, y: p.y, text: '' }); B_().links.push([it.id, id]);
      devFresh.set(id, performance.now()); setTimeout(() => devFresh.delete(id), 3000); deskLand(id); k++; }
    catch (e) { /* not a picture the browser can read */ }
  }
  if (k) { deskSfx('shutter'); save(); drawStrings(); }
  if (!write) { select(it.id); return k; } // (just picked: it stays picked)
  if (txt && txt.isConnected) { txt.focus({ preventScroll: true }); if (keep) { s.removeAllRanges(); s.addRange(keep); } flowSoon(true); } // (back to writing, where you were)
  return k;
}

/* ---------- the trail: the cards you've been on, so Back (in the Tied to strip, js/tied.js) goes to the one you came from; again, further back ---------- */
const flowTrail = [], flowAt = new Map(); let flowCur = null, flowBacking = false; // (the cards you've been on, picked or written in, oldest first; where the pen was in each note)
function flowVisit(id) { if (!id || id === flowCur) return; if (flowCur && !flowBacking) { flowTrail.push(flowCur); if (flowTrail.length > 60) flowTrail.shift(); } flowCur = id; flowBacking = false; }
{ const select0 = select; select = function (...a) { const r = select0.apply(this, a); if (picked.size === 1 && selId) flowVisit(selId); return r; }; } // (picking one card counts as being on it)
const flowOffset = box => { const s = getSelection(); if (!s.rangeCount || !box.contains(s.anchorNode)) return null; const r = document.createRange(); r.selectNodeContents(box); r.setEnd(s.anchorNode, s.anchorOffset); return r.toString().length; };
document.addEventListener('focusin', e => { const c = e.target.matches && e.target.matches('.sx-note-t') && e.target.closest('.sx-bcard'); if (!c) return;
  flowVisit(c.dataset.id); });
document.addEventListener('selectionchange', () => { const b = flowBox(); if (!b || !b.matches('.sx-note-t')) return; const at = flowOffset(b); if (at != null) flowAt.set(b.closest('.sx-bcard').dataset.id, at); });
function flowPenAt(box, off) { // the pen at a number of letters into a note
  const w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT); let n, left = off;
  while ((n = w.nextNode())) { if (left <= n.data.length) { const r = document.createRange(); r.setStart(n, left); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return; } left -= n.data.length; }
}
function flowBack(t, write = true) {
  const here = t.closest('.sx-bcard') && t.closest('.sx-bcard').dataset.id, B = B_();
  let id = null; while (flowTrail.length) { const x = flowTrail.pop(), it = itemOf(x); if (x !== here && it && it.board === B.cur && els.has(x)) { id = x; break; } }
  if (!id) { deskToast('Nothing to go back to'); return; }
  flowBacking = true; select(id); flowBacking = false; flowCur = id; const c = els.get(id); // (going back doesn't add to the trail)
  if (write) { deskWriteIn(id); const box = c.querySelector('.sx-note-t'), at = flowAt.get(id); if (box && at != null) flowPenAt(box, at); } // (just picking: it's picked)
  const it = itemOf(id); glideTo(it.x + c.offsetWidth / 2, it.y + c.offsetHeight / 2, cam.z, true, () => flowSoon(true)); flowSoon(true); deskSfx('pick');
}


// while you write on the desk's paper, the strings let clicks through to it (no cutting or plucking one by accident)
const flowWriting = () => world.classList.toggle('writing', !!flowBox());
document.addEventListener('focusin', flowWriting); document.addEventListener('focusout', () => setTimeout(flowWriting, 0));
