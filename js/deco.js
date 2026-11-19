/* Cassie: decorating a book's cover. Right-click a book (or click the cover in an open book) and Decorate the cover opens
   a panel: the cover itself, big, on the left; on the right its colour and its title's colour (the 32 colours, and Auto
   for the title), its picture, and a tray of stickers: a cat with whiskers, an exclamation burst, a question bubble, a
   rainbow, a star, a heart and more. Click a sticker to stick it on, then drag it where you like; click a stuck one to
   turn it, size it or peel it off. The stickers show on the book on the desk, on the open book, and in Tied to.
   A book keeps them as it.stickers: [{ k, x, y, r, s }] (where on the cover, in %; turned, in degrees; how big). */
'use strict';

// the stickers: drawn here, chunky and cute, each with a white die-cut edge. (O: the edge, around the shape; then details)
const O = (inner) => '<g fill="none" stroke="#fffaf0" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">' + inner + '</g>';
const STICKERS = {
  cat: ['Cat', O('<path d="M10 18L12 6l8 7q4-1 8 0l8-7 2 12q4 8 0 15-6 8-14 8T10 33q-4-7 0-15z"/>') + '<path d="M10 18L12 6l8 7q4-1 8 0l8-7 2 12q4 8 0 15-6 8-14 8T10 33q-4-7 0-15z" fill="#ffb762"/><path d="M13 9l3 6M35 9l-3 6" stroke="#c76e46" stroke-width="1.6" stroke-linecap="round"/><circle cx="18" cy="24" r="2.5" fill="#34111f"/><circle cx="30" cy="24" r="2.5" fill="#34111f"/><circle cx="18.8" cy="23.2" r=".8" fill="#fffaf0"/><circle cx="30.8" cy="23.2" r=".8" fill="#fffaf0"/><path d="M22.4 28.5h3.2L24 30.6z" fill="#d9243c"/><path d="M20.5 31.5q1.8 2 3.5 0 1.7 2 3.5 0" stroke="#34111f" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M3 26.5l11 1.3M3 32.5l11-1.6M45 26.5l-11 1.3M45 32.5l-11-1.6" stroke="#34111f" stroke-width="1.5" stroke-linecap="round"/><ellipse cx="14.5" cy="29" rx="2.2" ry="1.3" fill="#ff88a9" opacity=".7"/><ellipse cx="33.5" cy="29" rx="2.2" ry="1.3" fill="#ff88a9" opacity=".7"/>'],
  bang: ['Exclamation', O('<path d="M24 3l5 9 10-3-3 10 9 5-9 5 3 10-10-3-5 9-5-9-10 3 3-10-9-5 9-5-3-10 10 3z"/>') + '<path d="M24 3l5 9 10-3-3 10 9 5-9 5 3 10-10-3-5 9-5-9-10 3 3-10-9-5 9-5-3-10 10 3z" fill="#ff6157"/><rect x="21.3" y="12" width="5.4" height="15" rx="2.7" fill="#fffaf0"/><circle cx="24" cy="33" r="3.1" fill="#fffaf0"/>'],
  what: ['Question', O('<path d="M9 8h30a5 5 0 0 1 5 5v18a5 5 0 0 1-5 5H23l-9 8v-8H9a5 5 0 0 1-5-5V13a5 5 0 0 1 5-5z"/>') + '<path d="M9 8h30a5 5 0 0 1 5 5v18a5 5 0 0 1-5 5H23l-9 8v-8H9a5 5 0 0 1-5-5V13a5 5 0 0 1 5-5z" fill="#1c92a7"/><path d="M18.5 18.5q0-6 5.5-6t5.5 5.4q0 4.4-5.5 5.4v3.2" stroke="#fffaf0" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="31" r="2.4" fill="#fffaf0"/>'],
  rainbow: ['Rainbow', '<path d="M5 37a19 19 0 0 1 38 0" stroke="#fffaf0" stroke-width="20" fill="none" stroke-linecap="round"/><path d="M7 37a17 17 0 0 1 34 0" stroke="#ff6157" stroke-width="4.6" fill="none"/><path d="M11.5 37a12.5 12.5 0 0 1 25 0" stroke="#ffd832" stroke-width="4.6" fill="none"/><path d="M16 37a8 8 0 0 1 16 0" stroke="#77d6c1" stroke-width="4.6" fill="none"/><g fill="#ffffe4" stroke="#bfc3c6" stroke-width="1.2"><path d="M2 41a4 4 0 0 1 3-6 5 5 0 0 1 9 1 3.5 3.5 0 0 1 0 5z"/><path d="M34 41a4 4 0 0 1 3-6 5 5 0 0 1 9 1 3.5 3.5 0 0 1 0 5z"/></g>'],
  star: ['Star', O('<path d="M24 4l5.9 12 13.1 1.9-9.5 9.3 2.3 13L24 34l-11.8 6.2 2.3-13L5 17.9 18.1 16z"/>') + '<path d="M24 4l5.9 12 13.1 1.9-9.5 9.3 2.3 13L24 34l-11.8 6.2 2.3-13L5 17.9 18.1 16z" fill="#ffd832"/><circle cx="20.5" cy="23" r="1.7" fill="#34111f"/><circle cx="27.5" cy="23" r="1.7" fill="#34111f"/><path d="M22 26.5q2 1.8 4 0" stroke="#34111f" stroke-width="1.3" fill="none" stroke-linecap="round"/><ellipse cx="17.5" cy="26" rx="1.8" ry="1.1" fill="#ff823b" opacity=".6"/><ellipse cx="30.5" cy="26" rx="1.8" ry="1.1" fill="#ff823b" opacity=".6"/>'],
  heart: ['Heart', O('<path d="M24 41S6 30 6 18a9 9 0 0 1 18-3 9 9 0 0 1 18 3c0 12-18 23-18 23z"/>') + '<path d="M24 41S6 30 6 18a9 9 0 0 1 18-3 9 9 0 0 1 18 3c0 12-18 23-18 23z" fill="#ff88a9"/><path d="M12 16q1-4 5-4" stroke="#fffaf0" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/>'],
  sparkle: ['Sparkle', O('<path d="M24 3c2 12 5 15 17 21-12 6-15 9-17 21-2-12-5-15-17-21 12-6 15-9 17-21z"/><path d="M39 5c.8 4.5 1.8 5.5 6 7-4.2 1.5-5.2 2.5-6 7-.8-4.5-1.8-5.5-6-7 4.2-1.5 5.2-2.5 6-7z"/>') + '<path d="M24 3c2 12 5 15 17 21-12 6-15 9-17 21-2-12-5-15-17-21 12-6 15-9 17-21z" fill="#ffd832"/><path d="M39 5c.8 4.5 1.8 5.5 6 7-4.2 1.5-5.2 2.5-6 7-.8-4.5-1.8-5.5-6-7 4.2-1.5 5.2-2.5 6-7z" fill="#ff88a9"/>'],
  flower: ['Flower', O('<circle cx="24" cy="12" r="8"/><circle cx="35.4" cy="20.3" r="8"/><circle cx="31" cy="33.7" r="8"/><circle cx="17" cy="33.7" r="8"/><circle cx="12.6" cy="20.3" r="8"/>') + '<g fill="#ff88a9"><circle cx="24" cy="12" r="8"/><circle cx="35.4" cy="20.3" r="8"/><circle cx="31" cy="33.7" r="8"/><circle cx="17" cy="33.7" r="8"/><circle cx="12.6" cy="20.3" r="8"/></g><circle cx="24" cy="24" r="6.5" fill="#ffd832"/><circle cx="22" cy="23" r="1.1" fill="#73392e"/><circle cx="26" cy="23" r="1.1" fill="#73392e"/><path d="M22.4 26q1.6 1.3 3.2 0" stroke="#73392e" stroke-width="1.1" fill="none" stroke-linecap="round"/>'],
  moon: ['Moon', O('<path d="M30 5a19 19 0 1 0 13 31A16 16 0 0 1 30 5z"/>') + '<path d="M30 5a19 19 0 1 0 13 31A16 16 0 0 1 30 5z" fill="#ffd832"/><path d="M15 25q2.5 2 5 0M22 31q2 1.5 4 0" stroke="#34111f" stroke-width="1.5" fill="none" stroke-linecap="round"/><circle cx="41" cy="9" r="1.6" fill="#ffd832"/><circle cx="45" cy="17" r="1.1" fill="#ffd832"/>'],
  cloud: ['Cloud', O('<path d="M13 37a8 8 0 0 1-1-16 11 11 0 0 1 21-4 9 9 0 0 1 3 20z"/>') + '<path d="M13 37a8 8 0 0 1-1-16 11 11 0 0 1 21-4 9 9 0 0 1 3 20z" fill="#ffffe4" stroke="#bfc3c6" stroke-width="1.4"/><circle cx="19" cy="27" r="1.5" fill="#34111f"/><circle cx="28" cy="27" r="1.5" fill="#34111f"/><path d="M21.5 30q2 1.6 4 0" stroke="#34111f" stroke-width="1.2" fill="none" stroke-linecap="round"/><ellipse cx="16" cy="30" rx="1.8" ry="1" fill="#ff88a9" opacity=".7"/><ellipse cx="31" cy="30" rx="1.8" ry="1" fill="#ff88a9" opacity=".7"/>'],
  note: ['Music', O('<path d="M18 34V11l20-5v23"/><circle cx="13" cy="35" r="6"/><circle cx="33" cy="30" r="6"/>') + '<path d="M18 34V11l20-5v23" stroke="#c03b94" stroke-width="4" fill="none" stroke-linejoin="round"/><path d="M18 16l20-5" stroke="#c03b94" stroke-width="4"/><circle cx="13" cy="35" r="6" fill="#c03b94"/><circle cx="33" cy="30" r="6" fill="#c03b94"/>'],
  paw: ['Paw', O('<ellipse cx="24" cy="31" rx="10" ry="8.5"/><ellipse cx="11" cy="20" rx="4.2" ry="5.2"/><ellipse cx="19" cy="12" rx="4.2" ry="5.4"/><ellipse cx="29" cy="12" rx="4.2" ry="5.4"/><ellipse cx="37" cy="20" rx="4.2" ry="5.2"/>') + '<g fill="#833f34"><ellipse cx="24" cy="31" rx="10" ry="8.5"/><ellipse cx="11" cy="20" rx="4.2" ry="5.2"/><ellipse cx="19" cy="12" rx="4.2" ry="5.4"/><ellipse cx="29" cy="12" rx="4.2" ry="5.4"/><ellipse cx="37" cy="20" rx="4.2" ry="5.2"/></g><ellipse cx="24" cy="31" rx="5.5" ry="4" fill="#ff88a9" opacity=".75"/>'],
  bolt: ['Lightning', O('<path d="M27 3L9 27h12l-4 18 20-26H25z"/>') + '<path d="M27 3L9 27h12l-4 18 20-26H25z" fill="#ffd832"/><path d="M23 10l-6 9" stroke="#fffaf0" stroke-width="2" stroke-linecap="round" opacity=".8"/>'],
  smile: ['Smile', O('<circle cx="24" cy="24" r="19"/>') + '<circle cx="24" cy="24" r="19" fill="#ffd832"/><path d="M16 21q2-3 4 0M28 21q2-3 4 0" stroke="#34111f" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M15 28q9 9 18 0" stroke="#34111f" stroke-width="2.2" fill="#d9243c" stroke-linejoin="round"/><ellipse cx="13" cy="27" rx="2.6" ry="1.5" fill="#ff823b" opacity=".6"/><ellipse cx="35" cy="27" rx="2.6" ry="1.5" fill="#ff823b" opacity=".6"/>'],
  coffee: ['Coffee', O('<path d="M10 19h24v12a9 9 0 0 1-9 9h-6a9 9 0 0 1-9-9z"/><path d="M34 22h3a5 5 0 0 1 0 10h-3"/>') + '<path d="M34 22h3a5 5 0 0 1 0 10h-3" stroke="#c76e46" stroke-width="3.4" fill="none"/><path d="M10 19h24v12a9 9 0 0 1-9 9h-6a9 9 0 0 1-9-9z" fill="#c76e46"/><path d="M10 19h24v3H10z" fill="#73392e"/><path d="M17 15q-2-3 0-6M23 15q-2-3 0-6M29 15q-2-3 0-6" stroke="#bfc3c6" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M19 29q3 2 6 0" stroke="#fffaf0" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="18" cy="26.5" r="1.1" fill="#fffaf0"/><circle cx="26" cy="26.5" r="1.1" fill="#fffaf0"/>'],
  mushroom: ['Mushroom', O('<path d="M5 24a19 16 0 0 1 38 0z"/><path d="M17 24h14l-2 15a5 5 0 0 1-10 0z"/>') + '<path d="M17 24h14l-2 15a5 5 0 0 1-10 0z" fill="#ffffe4" stroke="#e6d6b8" stroke-width="1"/><path d="M5 24a19 16 0 0 1 38 0z" fill="#d9243c"/><g fill="#fffaf0"><circle cx="16" cy="15" r="3"/><circle cx="28" cy="11" r="2.4"/><circle cx="34" cy="19" r="2.6"/><circle cx="22" cy="20" r="1.8"/></g><circle cx="21.5" cy="31" r="1.1" fill="#34111f"/><circle cx="26.5" cy="31" r="1.1" fill="#34111f"/>'],
};
const stickerSvg = k => '<svg viewBox="0 0 48 48" aria-hidden="true">' + (STICKERS[k] || STICKERS.star)[1] + '</svg>';
// what may be kept (from a backup, or a friend): known stickers, on the cover, a dozen at most
function bookStkClean(v) {
  const n = (x, lo, hi, d) => isFinite(+x) ? Math.max(lo, Math.min(hi, +x)) : d;
  return (Array.isArray(v) ? v : []).filter(s => s && STICKERS[s.k]).slice(0, 12).map(s => ({ k: s.k, x: Math.round(n(s.x, 0, 100, 50)), y: Math.round(n(s.y, 0, 100, 50)), r: Math.round(n(s.r, -180, 180, 0)), s: Math.round(n(s.s, .4, 2.5, 1) * 100) / 100 }));
}
// the stickers on a cover: a layer of them over it, placed in % so they sit the same on a big cover or a little one
function bookStk(b) {
  const layer = el('span', { class: 'sx-stks', 'aria-hidden': 'true' });
  (b.stickers || []).forEach((s, i) => { const e = el('i', { class: 'sx-stk', 'data-i': i, style: 'left:' + s.x + '%;top:' + s.y + '%;--r:' + s.r + 'deg;--s:' + s.s }); e.innerHTML = stickerSvg(s.k); layer.append(e); });
  return layer;
}

/* ---------- the panel ---------- */
const decoView = el('div', { class: 'sx-deco-view', hidden: true, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Decorate the cover' });
const decoCover = el('div', { class: 'sx-deco-cover' }), decoSide = el('div', { class: 'sx-deco-side' }), decoTools = el('div', { class: 'sx-deco-tools' });
decoView.append(el('div', { class: 'sx-deco' }, el('div', { class: 'sx-deco-left' }, decoCover, decoTools), decoSide));
document.body.append(decoView);
let decoId = null, decoSel = -1, decoMarked = false;
decoView.addEventListener('pointerdown', e => { if (e.target === decoView) decoClose(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && decoId) { e.preventDefault(); e.stopImmediatePropagation(); decoClose(); } }, true);
function decoOpen(id) { const b = bookOf(id); if (!b) return; decoId = id; decoSel = -1; decoMarked = false; decoView.hidden = false; if (!stillUI()) animAgain(decoView, 'in'); decoDraw(); deskSfx('pick'); }
function decoClose() { if (!decoId) return; decoId = null; decoView.hidden = true; drawBoard(); if (typeof bookSideDraw === 'function' && bookId) bookSideDraw(); }
const decoMark = () => { if (!decoMarked) { deskMark(); decoMarked = true; } }; // (one Undo step for a whole decorating)
function decoChanged(all) { save(); if (all) decoDraw(); else { decoCoverDraw(); decoToolsDraw(); } }

function decoDraw() { decoCoverDraw(); decoToolsDraw(); decoSideDraw(); }
// the cover, big: as it is on the desk, with its stickers to drag
function decoCoverDraw() {
  const b = bookOf(decoId); if (!b) return; const [, bg, ink] = bookColor(b);
  decoCover.style.setProperty('--cover', bg); decoCover.style.setProperty('--cink', ink);
  const pic = el('div', { class: 'sx-book-pic' + (b.cover ? '' : ' none') }); if (b.cover) photoUrls(b.id).then(u => { if (u) pic.append(el('img', { src: u.full, alt: '' })); });
  const stks = bookStk(b); stks.classList.add('live'); if (decoSel >= 0 && stks.children[decoSel]) stks.children[decoSel].classList.add('sel');
  decoCover.replaceChildren(el('i', { class: 'sx-book-spine' }), el('b', { class: 'sx-book-title' }, b.title || 'A book'), pic, el('span', { class: 'sx-book-n' }, (b.pages || []).length + ((b.pages || []).length === 1 ? ' page' : ' pages')), stks);
}
decoCover.addEventListener('pointerdown', e => {
  const b = bookOf(decoId); if (!b) return;
  const st = e.target.closest('.sx-stk'); if (!st) { if (decoSel >= 0) { decoSel = -1; decoCoverDraw(); decoToolsDraw(); } return; }
  e.preventDefault(); const i = +st.dataset.i, s = b.stickers[i]; decoSel = i; decoCoverDraw(); decoToolsDraw();
  const el2 = decoCover.querySelector('.sx-stk[data-i="' + i + '"]'), r = decoCover.getBoundingClientRect(); let moved = false;
  decoCover.setPointerCapture(e.pointerId);
  const move = ev => { const x = Math.max(0, Math.min(100, (ev.clientX - r.left) / r.width * 100)), y = Math.max(0, Math.min(100, (ev.clientY - r.top) / r.height * 100));
    if (!moved) { moved = true; decoMark(); } s.x = Math.round(x); s.y = Math.round(y); el2.style.left = s.x + '%'; el2.style.top = s.y + '%'; };
  const up = () => { decoCover.removeEventListener('pointermove', move); decoCover.removeEventListener('pointerup', up); decoCover.removeEventListener('pointercancel', up); if (moved) { save(); deskSfx('drop'); } };
  decoCover.addEventListener('pointermove', move); decoCover.addEventListener('pointerup', up); decoCover.addEventListener('pointercancel', up);
});
// under the cover: the picked sticker's keys (turn, size, peel off), or a hint
function decoToolsDraw() {
  const b = bookOf(decoId); if (!b) return; const s = decoSel >= 0 && b.stickers && b.stickers[decoSel];
  if (!s) { decoTools.replaceChildren(el('span', { class: 'sx-deco-hint' }, (b.stickers || []).length ? 'Drag a sticker to move it; click one for more' : 'Add stickers from the tray, then drag them where you like')); return; }
  const k = (label, title, fn, cls) => el('button', { type: 'button', class: 'sx-deco-k' + (cls ? ' ' + cls : ''), title, 'aria-label': title, onclick: () => { decoMark(); fn(); decoChanged(); } }, label);
  decoTools.replaceChildren(el('span', { class: 'sx-deco-hint' }, STICKERS[s.k][0]),
    k('⟲', 'Turn left', () => { s.r = Math.max(-180, s.r - 15); }), k('⟳', 'Turn right', () => { s.r = Math.min(180, s.r + 15); }),
    k('−', 'Smaller', () => { s.s = Math.max(.4, Math.round((s.s - .15) * 100) / 100); }), k('+', 'Bigger', () => { s.s = Math.min(2.5, Math.round((s.s + .15) * 100) / 100); }),
    k('To front', 'Bring it to the front', () => { b.stickers.push(b.stickers.splice(decoSel, 1)[0]); decoSel = b.stickers.length - 1; }),
    k('Peel off', 'Take it off the cover', () => { b.stickers.splice(decoSel, 1); decoSel = -1; deskSfx('pick'); }, 'del'));
}
// the side: colours, the picture, and the sticker tray
function decoSideDraw() {
  const b = bookOf(decoId); if (!b) return; const [, bg] = bookColor(b), ink = PALETTE.includes(b.ink) ? b.ink : '';
  const sq = (hex, on, fn) => el('button', { type: 'button', class: 'sx-book-sq' + (on ? ' on' : ''), style: 'background:' + hex, title: hex, 'aria-label': hex, onclick: fn });
  const sec = (label, ...kids) => el('div', { class: 'sx-deco-sec' }, el('div', { class: 'sx-deco-lbl' }, label), ...kids);
  const tray = el('div', { class: 'sx-deco-tray' }, ...Object.entries(STICKERS).map(([key, [name]]) => { const t = el('button', { type: 'button', class: 'sx-deco-st', title: name, 'aria-label': 'Add a ' + name.toLowerCase() + ' sticker', onclick: () => {
      if ((b.stickers || []).length >= 12) { deskToast('A dozen stickers at most'); return; }
      decoMark(); b.stickers = b.stickers || []; b.stickers.push({ k: key, x: 30 + Math.round(Math.random() * 40), y: 45 + Math.round(Math.random() * 30), r: Math.round(Math.random() * 30 - 15), s: 1 }); decoSel = b.stickers.length - 1; deskSfx('pin'); decoChanged(); } });
    t.innerHTML = stickerSvg(key); return t; }));
  decoSide.replaceChildren(
    el('div', { class: 'sx-deco-head' }, el('b', {}, 'Decorate the cover'), el('button', { type: 'button', class: 'sx-deco-done', onclick: () => decoClose() }, 'Done')),
    sec('Stickers', tray),
    sec('Cover colour', el('div', { class: 'sx-book-grid' }, ...PALETTE.map(hex => sq(hex, hex === bg, () => { decoMark(); b.bg = hex; delete b.color; decoChanged(true); deskSfx('pick'); })))),
    sec('Title colour', el('button', { type: 'button', class: 'sx-book-auto' + (!ink ? ' on' : ''), onclick: () => { decoMark(); delete b.ink; decoChanged(true); } }, el('i', { style: 'background:' + bookAuto(bg) }), 'Auto: readable on the cover'),
      el('div', { class: 'sx-book-grid' }, ...PALETTE.map(hex => sq(hex, hex === ink, () => { decoMark(); b.ink = hex; decoChanged(true); deskSfx('pick'); })))),
    sec('Picture', el('div', { class: 'sx-deco-row' }, el('button', { type: 'button', class: 'sx-book-tb', onclick: () => decoPic() }, b.cover ? 'Change the picture' : 'Add a picture'),
      b.cover ? el('button', { type: 'button', class: 'sx-book-tb', onclick: () => { decoMark(); delete b.cover; b.coverV = Date.now(); PHOTOS.del(b.id).catch(() => {}); photoCache.delete(b.id); decoChanged(true); } }, 'Remove') : null)));
}
function decoPic() {
  const b = bookOf(decoId); if (!b) return;
  const f = el('input', { type: 'file', accept: 'image/*', hidden: true }); document.body.append(f);
  f.addEventListener('change', async () => { const file = f.files && f.files[0]; f.remove(); if (!file) return;
    try { const src = await shrinkPhoto(file); await PHOTOS.put(b.id, src); decoMark(); b.cover = true; b.coverV = Date.now(); photoCache.delete(b.id); decoChanged(true); deskSfx('shutter'); }
    catch (e) { deskToast('That picture didn\'t work: try another'); } });
  f.click();
}
