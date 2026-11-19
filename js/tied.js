/* Cassie: tied to. Pick a card that has strings, and the cards tied to it line up in a strip along the bottom, as small
   copies of themselves: a note's paper colour and first lines, a photo's picture, a table's columns, a folder's board. It
   pairs with the kept note (js/keep.js): both live in one dock at the bottom, the kept note in the middle and this strip
   beside it on its right, the same height of header and the same bottom edge (on a narrow screen it sits just above it;
   with no kept note, it takes the middle). Click a copy and the desk glides to it (and it's picked: its own neighbours take
   their place, so you can walk along the strings); double-click to write in it. Pointing at one lights the card on the desk.
   Back goes to the card you came from (like Alt+Backspace). The row scrolls sideways (the mouse wheel does it too), and
   – folds it to its header, like the kept note's. */
'use strict';

const tiedDock = el('div', { class: 'sx-bdock' });
const tiedBox = el('section', { class: 'sx-tied', 'aria-label': 'Cards tied to this one', hidden: true });
document.getElementById('app').after(tiedDock);
keepBox.style.bottom = ''; tiedDock.append(keepBox, tiedBox); // (the kept note moves into the dock; the dock is what sits above the bar now)
let tiedSig = '', tiedFor = null;

// the cards tied to one, in order round it (clockwise, from the top), so the row reads like the strings leave it
function tiedOf(id) {
  const me = itemOf(id), c = els.get(id); if (!me || !c) return [];
  const cx = me.x + c.offsetWidth / 2, cy = me.y + c.offsetHeight / 2;
  return B_().links.filter(l => l.includes(id)).map(l => l[0] === id ? l[1] : l[0]).filter((o, i, a) => a.indexOf(o) === i && els.has(o) && itemOf(o))
    .map(o => { const oc = els.get(o), it = itemOf(o); return { it, a: (Math.atan2(it.y + oc.offsetHeight / 2 - cy, it.x + oc.offsetWidth / 2 - cx) + Math.PI * 2.5) % (Math.PI * 2) }; })
    .sort((p, q) => p.a - q.a).map(p => p.it);
}
// what a card is called here: its first line, and what follows
function tiedText(it) {
  const lines = String(it.text || '').split('\n').map(s => s.trim()).filter(Boolean);
  return { head: lines[0] || '', rest: lines.slice(1, 4).join(' ') };
}
const tiedName = it => it.type === 'note' ? tiedText(it).head || 'an empty note' : it.type === 'photo' ? (it.text ? String(it.text).slice(0, 40) : 'the photo') : it.type === 'tbl' ? 'the table' : 'the folder';
const tiedIc = d => { const s = el('span', { class: 'sx-tied-ic', 'aria-hidden': 'true' }); s.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.9">' + d + '</svg>'; return s; };
function tiedCard(it, i) {
  const card = el('button', { type: 'button', class: 'sx-tied-c t-' + it.type, 'data-id': it.id, style: '--i:' + i + ';--tilt:' + ((i % 2 ? 1 : -1) * (0.6 + (i % 3) * .3)).toFixed(2) + 'deg' },
    el('i', { class: 'sx-tied-pin', 'aria-hidden': 'true' }));
  if (it.type === 'note') {
    const [, bg, ink] = noteColor(it), t = tiedText(it); card.style.setProperty('--paper', bg); card.style.setProperty('--ink', ink);
    card.append(el('b', {}, t.head || 'An empty note'), t.rest ? el('span', {}, t.rest) : null);
    card.setAttribute('aria-label', 'Note: ' + (t.head || 'empty'));
  } else if (it.type === 'photo') {
    const src = (els.get(it.id).querySelector('img') || {}).currentSrc || '';
    card.append(src ? el('img', { src, alt: '', draggable: 'false' }) : el('span', { class: 'sx-tied-none' }, 'Photo'), it.text ? el('span', { class: 'sx-tied-cap' }, String(it.text).slice(0, 60)) : null);
    card.setAttribute('aria-label', 'Photo' + (it.text ? ': ' + it.text : ''));
  } else if (it.type === 'tbl') {
    const rows = Array.isArray(it.rows) ? it.rows : [[]], head = (rows[0] || []).filter(Boolean).slice(0, 4).join(' · ');
    card.append(el('b', {}, tiedIc('<path d="M3.5 4.5h17v15h-17z"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 4.5v15"/>'), head || 'A table'), el('span', {}, (rows.length - 1) + (rows.length === 2 ? ' row' : ' rows') + (it.view && it.view !== 'table' ? ' · ' + it.view : '')));
    card.setAttribute('aria-label', 'Table: ' + (head || 'empty'));
  } else if (it.type === 'hop') {
    const to = B_().boards.find(b => b.id === it.to);
    card.append(el('b', {}, tiedIc('<path d="M3.5 5.5h6l2 2.5h9v12h-17z"/><path d="M3.5 11h17"/>'), to ? to.name : 'A folder'), el('span', {}, 'Opens a board'));
    card.setAttribute('aria-label', 'Folder to ' + (to ? to.name : 'no board'));
  } else card.append(el('b', {}, 'A card'));
  card.title = 'Go to it (double-click to write in it)';
  return card;
}
function tiedGo(id, write) {
  const it = itemOf(id), c = els.get(id); if (!it || !c) return;
  select(id); if (write) deskWriteIn(id);
  glideTo(it.x + c.offsetWidth / 2, it.y + c.offsetHeight / 2, cam.z, true, () => { if (typeof flowSoon === 'function') flowSoon(true); });
  deskSfx('pick');
}
// a card on the desk lit while you point at its copy
const tiedLight = id => { layer.querySelectorAll('.sx-tied-hot').forEach(c => c.classList.remove('sx-tied-hot')); const c = id && els.get(id); if (c) c.classList.add('sx-tied-hot'); };
tiedBox.addEventListener('pointerover', e => { const c = e.target.closest('.sx-tied-c'); tiedLight(c && c.dataset.id); });
tiedBox.addEventListener('pointerleave', () => tiedLight(null));
tiedBox.addEventListener('click', e => { const c = e.target.closest('.sx-tied-c'); if (c) { tiedLight(null); tiedGo(c.dataset.id, false); } });
tiedBox.addEventListener('dblclick', e => { const c = e.target.closest('.sx-tied-c'); if (c) tiedGo(c.dataset.id, true); });
tiedBox.addEventListener('pointerdown', e => e.stopPropagation()); // (a click here isn't a click on the desk)
// the wheel scrolls the row sideways (not the desk's zoom)
tiedBox.addEventListener('wheel', e => { e.stopPropagation(); const row = tiedBox.querySelector('.sx-tied-list'); if (row && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); row.scrollLeft += e.deltaY; tiedEdges(row); } }, { passive: false });

// the card it's about: the one picked (just one)
function tiedNow() { return picked.size === 1 && selId && els.has(selId) ? selId : null; }
function tiedDraw() {
  const id = tiedNow(), list = id ? tiedOf(id) : [], min = !!S.opts.tiedMin;
  const back = (typeof flowTrail !== 'undefined' && flowTrail.length && [...flowTrail].reverse().find(x => x !== id && itemOf(x) && itemOf(x).board === B_().cur && els.has(x))) || null; // (null, not 0: a 0 would show up as text)
  const sig = id ? [id, min, back || '', ...list.map(it => it.id + ':' + (it.text || '').length + ':' + (it.color || '') + ':' + (it.rows ? it.rows.length : ''))].join('|') : '';
  if (sig === tiedSig) return; tiedSig = sig;
  if (!id || !list.length) { tiedBox.hidden = true; tiedFor = null; tiedPlace(); return; }
  const fresh = tiedFor !== id; tiedFor = id;
  const foldB = el('button', { type: 'button', class: 'sx-keep-b', title: min ? 'Show the tied cards' : 'Fold it to its header', 'aria-label': min ? 'Show the tied cards' : 'Fold it to its header', 'aria-expanded': String(!min),
    onclick: () => { S.opts.tiedMin = !min; if (!S.opts.tiedMin) delete S.opts.tiedMin; save(); tiedSig = ''; tiedDraw(); } }, min ? '+' : '–');
  const backB = back && el('button', { type: 'button', class: 'sx-keep-b sx-tied-back', title: 'Back to the card you came from (Alt+Backspace)', onclick: () => { const c = els.get(id); if (c) flowBack(c, false); } }, '← ', el('span', {}, tiedName(itemOf(back))));
  const head = el('div', { class: 'sx-keep-h sx-tied-h' }, el('i', { class: 'sx-tied-knot', 'aria-hidden': 'true' }), el('b', { class: 'sx-keep-n' }, 'Tied to'), el('span', { class: 'sx-tied-n' }, String(list.length)), el('span', { class: 'sx-gap' }), backB, foldB);
  const row = min ? null : el('div', { class: 'sx-tied-list' }, ...list.map(tiedCard)); if (row) row.addEventListener('scroll', () => tiedEdges(row), { passive: true });
  tiedBox.replaceChildren(head, row);
  tiedBox.classList.toggle('min', min); tiedBox.hidden = false; tiedPlace();
  if (fresh && !stillUI()) animAgain(tiedBox, 'in');
}
// the row fades at an edge that has more to scroll to
function tiedEdges(row) { row = row || tiedBox.querySelector('.sx-tied-list'); if (!row) return; const max = row.scrollWidth - row.clientWidth; row.classList.toggle('more-l', row.scrollLeft > 4); row.classList.toggle('more-r', row.scrollLeft < max - 4); }
// where the strip goes: beside the kept note on its right when there's room, else just above it; alone, in the middle
function tiedPlace() {
  tiedBox.classList.remove('side', 'above', 'tiny'); tiedBox.style.width = ''; tiedBox.style.removeProperty('--ch');
  if (tiedBox.hidden) return; requestAnimationFrame(() => tiedEdges());
  if (keepBox.hidden) return;
  const room = innerWidth / 2 - keepBox.offsetWidth / 2 - 28;
  if (room < 300) { tiedBox.classList.add('above'); return; }
  tiedBox.classList.add('side'); tiedBox.style.width = Math.min(room, 620) + 'px';
  // side by side, the strip is as tall as the kept note (its cards shrink to fit, down to a title), so the two read as a pair
  if (!keepBox.classList.contains('min') && !tiedBox.classList.contains('min')) {
    const ch = Math.max(42, Math.min(112, keepBox.offsetHeight - tiedBox.querySelector('.sx-tied-h').offsetHeight - 16));
    tiedBox.style.setProperty('--ch', ch + 'px'); tiedBox.classList.toggle('tiny', ch < 72); // (short: each card shows just its title)
  }
}
// the dock sits just above whatever is along the bottom (the bar for several picked things, or nothing)
keepPlace = function () {
  let top = innerHeight - 14;
  document.querySelectorAll('.sx-ws-ctx').forEach(e => { if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') return; const r = e.getBoundingClientRect(); if (r.height && r.top < top) top = r.top; });
  const b = Math.max(14, innerHeight - top + 10) + 'px'; if (tiedDock.style.bottom !== b) tiedDock.style.bottom = b;
  tiedPlace();
};
addEventListener('resize', () => keepPlace());
let tiedT = 0; const tiedSoon = () => { clearTimeout(tiedT); tiedT = setTimeout(tiedDraw, 60); };
{ const sel0 = select; select = function (...a) { const r = sel0.apply(this, a); tiedSoon(); return r; }; }
{ const draw0 = drawBoard; drawBoard = function (...a) { const r = draw0.apply(this, a); tiedSoon(); return r; }; }
{ const kd0 = keepDraw; keepDraw = function (...a) { const r = kd0.apply(this, a); tiedPlace(); return r; }; } // (a note kept or let go: the strip moves over)
// strings tied and cut, cards moved or written in: looked at again once things settle
['pointerup', 'keyup'].forEach(k => addEventListener(k, tiedSoon, true));
document.addEventListener('input', () => { if (tiedFor) { clearTimeout(tiedT); tiedT = setTimeout(tiedDraw, 500); } });
keepPlace(); tiedDraw();
