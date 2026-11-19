/* Cassie: tidy, and topics.
   Tidy: with several things picked, the Tidy key in the bar along the bottom lines them up: in a row, a column or a grid,
   in the order they already sit (left to right, top to bottom), starting where the top-left one is. They glide there, the
   strings follow, and Ctrl+Z puts them back.
   Topics: a note can be a topic card (Topic, in its right-click panel): a heading for the board. Its first line is set big
   in the condensed capitals, fitted to the card's width, with a short rule under it; anything after is a small subtitle.
   It's marked TOPIC in a corner, and shows how many cards are tied to it. */
'use strict';

/* ---------- tidy ---------- */
const TIDY_GAP = 28;
const tidyIc = d => { const s = el('span', { class: 'sx-ic', 'aria-hidden': 'true' }); s.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="square">' + d + '</svg>'; return s; };
const tidyB = deskBtn(tidyIc('<path d="M3.5 4h7v7h-7zM13.5 4h7v7h-7zM3.5 14h7v7h-7zM13.5 14h7v7h-7z"/>'), () => tidyOpen(), 'sx-ws-ic', 'Tidy: line them up in a row, a column or a grid');
deskSelGrp.insertBefore(tidyB, delSelB);
const tidyMenu = el('div', { class: 'sx-hop-menu sx-tidy-menu', role: 'menu', hidden: true, 'aria-label': 'Tidy' });
document.body.append(tidyMenu);
function tidyOpen() {
  if (!tidyMenu.hidden) { tidyMenu.hidden = true; return; }
  const item = (label, d, how, tip) => el('button', { type: 'button', role: 'menuitem', class: 'sx-hop-mi sx-tidy-mi', title: tip, onclick: () => { tidyMenu.hidden = true; tidy(how); } }, tidyIc(d), label);
  tidyMenu.replaceChildren(el('div', { class: 'sx-hop-mh' }, 'Tidy ' + picked.size + ' things'),
    item('Row', '<path d="M2.5 8h5v8h-5zM9.5 8h5v8h-5zM16.5 8h5v8h-5z"/>', 'row', 'Side by side, left to right'),
    item('Column', '<path d="M8 2.5h8v5H8zM8 9.5h8v5H8zM8 16.5h8v5H8z"/>', 'col', 'One under another, top to bottom'),
    item('Grid', '<path d="M3.5 4h7v7h-7zM13.5 4h7v7h-7zM3.5 14h7v7h-7zM13.5 14h7v7h-7z"/>', 'grid', 'In rows and columns, as square as it can be'));
  tidyMenu.hidden = false;
  const r = tidyB.getBoundingClientRect(), w = tidyMenu.offsetWidth, h = tidyMenu.offsetHeight;
  tidyMenu.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
  tidyMenu.style.top = Math.max(8, r.top - h - 8) + 'px';
  deskSfx('pick'); const f = tidyMenu.querySelector('.sx-tidy-mi'); if (f) f.focus({ preventScroll: true });
}
addEventListener('pointerdown', e => { if (!tidyMenu.hidden && !e.target.closest('.sx-tidy-menu') && !tidyB.contains(e.target)) tidyMenu.hidden = true; }, true);
addEventListener('keydown', e => {
  if (tidyMenu.hidden) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); tidyMenu.hidden = true; return; }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); const bs = [...tidyMenu.querySelectorAll('.sx-tidy-mi')], i = bs.indexOf(document.activeElement); (bs[(i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length] || bs[0]).focus({ preventScroll: true }); }
}, true);

function tidy(how) {
  const list = [...picked].map(id => ({ it: itemOf(id), c: els.get(id) })).filter(o => o.it && o.c).map(o => ({ it: o.it, w: o.c.offsetWidth, h: o.c.offsetHeight }));
  if (list.length < 2) return;
  const x0 = Math.min(...list.map(o => o.it.x)), y0 = Math.min(...list.map(o => o.it.y)), at = new Map();
  if (how === 'row') { list.sort((a, b) => a.it.x - b.it.x); let x = x0; list.forEach(o => { at.set(o.it, [x, y0]); x += o.w + TIDY_GAP; }); }
  else if (how === 'col') { list.sort((a, b) => a.it.y - b.it.y); let y = y0; list.forEach(o => { at.set(o.it, [x0, y]); y += o.h + TIDY_GAP; }); }
  else { // reading order (rows of things at about the same height, left to right), then as square a grid as fits
    const band = Math.max(60, Math.min(...list.map(o => o.h)) * .6);
    list.sort((a, b) => Math.round(a.it.y / band) - Math.round(b.it.y / band) || a.it.x - b.it.x);
    const cols = Math.ceil(Math.sqrt(list.length)), rows = Math.ceil(list.length / cols);
    const cw = Array(cols).fill(0), rh = Array(rows).fill(0);
    list.forEach((o, i) => { cw[i % cols] = Math.max(cw[i % cols], o.w); rh[Math.floor(i / cols)] = Math.max(rh[Math.floor(i / cols)], o.h); });
    list.forEach((o, i) => { const ci = i % cols, ri = Math.floor(i / cols); at.set(o.it, [x0 + cw.slice(0, ci).reduce((s, v) => s + v + TIDY_GAP, 0), y0 + rh.slice(0, ri).reduce((s, v) => s + v + TIDY_GAP, 0)]); });
  }
  if (list.every(o => { const p = at.get(o.it); return Math.round(p[0]) === o.it.x && Math.round(p[1]) === o.it.y; })) { deskToast('Already tidy'); return; }
  deskMark();
  if (!stillUI()) world.classList.add('tidying');
  at.forEach((p, it) => { it.x = Math.round(p[0]); it.y = Math.round(p[1]); });
  save(); drawBoard(); deskSfx('drop');
  // the strings (and the group's name) follow the cards as they glide
  const t0 = performance.now(), step = () => { strUpdate(); selBoxUpdate(); if (typeof gtagSync === 'function') gtagSync(); if (performance.now() - t0 < 480) requestAnimationFrame(step); else world.classList.remove('tidying'); };
  requestAnimationFrame(step);
}

/* ---------- topics ---------- */
const topicB = fbtn('topic', 'Topic', 'A topic card: its first line big, a heading for the board');
noteBar.querySelector('[data-k="fit"]').after(topicB);
noteBar.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.dataset.k !== 'topic') return; e.stopImmediatePropagation();
  const n = selNote(); if (!n) return;
  deskMark(); n.it.topic = !n.it.topic; if (!n.it.topic) delete n.it.topic;
  const c = els.get(n.it.id); if (c) { c.classList.toggle('topic', !!n.it.topic); c._snap = cardSnap(n.it); } // (the card stays as it is, pen and all)
  save(); topicCounts(); strUpdate(); noteBarState(); deskSfx('pick');
}, true);
{ const nbs0 = noteBarState; noteBarState = function () { nbs0(); const n = selNote(); if (n) topicB.classList.toggle('on', !!n.it.topic); }; }
{ const ns0 = noteSetup; noteSetup = function (it, txt, c) { ns0(it, txt, c); c.classList.toggle('topic', !!it.topic); }; }
// how many cards are tied to each topic (in its corner)
function topicCounts() {
  const links = B_().links;
  layer.querySelectorAll('.sx-bnote.topic').forEach(c => { const n = links.filter(l => l.includes(c.dataset.id)).length, v = n ? ' · ' + n + ' tied' : ''; if (c.dataset.count !== v) c.dataset.count = v; });
}
{ const d0 = drawBoard; drawBoard = function (...a) { const r = d0.apply(this, a); topicCounts(); return r; }; }
addEventListener('pointerup', () => setTimeout(topicCounts, 0), true);
layer.querySelectorAll('.sx-bnote[data-id]').forEach(c => { const it = itemOf(c.dataset.id); if (it) c.classList.toggle('topic', !!it.topic); }); // (cards drawn before this file was in)
topicCounts();
