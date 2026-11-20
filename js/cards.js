/* Cassie: every card, the same way. Notes and tables have their own right-click tools (js/notes.js, js/table.js); here
   photos, folders and books get theirs, in the same small menu: a caption, a book to go into, the board a folder opens,
   opening and renaming a book, and for all of them Make a board, Duplicate and Delete. And the ways cards come together
   into books: Put in a book (any note, photo or table), Bind (several picked cards become a book, in reading order),
   Make a book (a note and the cards tied to it, the note first: its words become the title), and photo files dropped on
   a closed book become its pages. */
'use strict';

const CARD_INTO = ['note', 'photo', 'tbl']; // (what can be a page)
const cardMenu = el('div', { class: 'sx-hop-menu sx-card-menu', role: 'menu', hidden: true, 'aria-label': 'Card' });
document.body.append(cardMenu);
cardMenu.addEventListener('mousedown', e => e.preventDefault());
function cardMenuClose() { cardMenu.hidden = true; }
function cardMenuAt(x, y) { const w = cardMenu.offsetWidth, h = cardMenu.offsetHeight; cardMenu.style.left = Math.max(8, Math.min(innerWidth - w - 8, x)) + 'px'; cardMenu.style.top = Math.max(8, Math.min(innerHeight - h - 8, y)) + 'px'; }
const cardItem = (label, fn, cls, off) => el('button', { type: 'button', role: 'menuitem', class: 'sx-hop-mi' + (cls ? ' ' + cls : ''), disabled: off || null, onclick: () => { cardMenuClose(); fn(); } }, label);
const cardSep = () => el('i', { class: 'sx-hop-msep' });
const cardBooks = () => B_().items.filter(it => it.type === 'book' && it.board === B_().cur);

function cardMenuOpen(it, x, y) {
  const rows = [];
  if (it.type === 'photo') rows.push(cardItem(it.text ? 'Edit the caption' : 'Write a caption', () => { select(it.id); deskWriteIn(it.id); }), cardItem('Put in a book…', () => cardBookPick([it.id], x, y)));
  if (it.type === 'hop') rows.push(cardItem('Open its board', () => hopGo(it), '', !it.to), cardItem('Pick its board…', () => { const c = els.get(it.id), tab = c && c.querySelector('.sx-hop-tabb'); if (tab) hopMenuOpen(it, tab); }));
  if (it.type === 'book') { const n = (it.pages || []).length; rows.push(cardItem('Open', () => bookOpen(it.id)), cardItem('Rename', () => { bookOpen(it.id); setTimeout(bookTitleEdit, 60); }), cardItem('Decorate the cover…', () => decoOpen(it.id)), cardItem('Copy its look', () => bookLookCopy(it.id)), cardItem('Paste the look', () => bookLookPaste(it.id), '', !bookLookCopied), cardItem('Take all its pages out', () => cardUnbind(it.id), '', !n)); }
  rows.push(cardSep());
  if (it.type !== 'hop') rows.push(cardItem('Make a board', () => noteToBoard(it.id)));
  rows.push(cardItem('Duplicate', () => { select(it.id); deskDuplicate(); }), cardItem('Delete', () => { select(it.id); deskDelete(); }, 'del'));
  cardMenu.replaceChildren(el('div', { class: 'sx-hop-mh' }, { photo: 'Photo', hop: 'Folder', book: it.title || 'Book' }[it.type]), ...rows);
  cardMenu.hidden = false; cardMenuAt(x, y);
  if (typeof toolHintUsed === 'function') toolHintUsed(it.id);
}
addEventListener('contextmenu', e => {
  if (e.shiftKey || (e.target.closest && e.target.closest('.sx-cstk'))) return; const c = e.target.closest && e.target.closest('.sx-world .sx-bcard[data-id]'); if (!c || !layer.contains(c)) return;
  const it = itemOf(c.dataset.id); if (!it || !['photo', 'hop', 'book'].includes(it.type)) return;
  if (typeof panMovedAt !== 'undefined' && performance.now() - panMovedAt < 400) return; // (that was a right-drag across the desk)
  e.preventDefault(); e.stopPropagation(); if (selId !== it.id) select(it.id);
  const kb = !e.clientX && !e.clientY, r = c.getBoundingClientRect();
  cardMenuOpen(it, kb ? r.left : e.clientX + 2, kb ? r.top + 24 : e.clientY + 2);
}, true);
addEventListener('pointerdown', e => { if (!cardMenu.hidden && !e.target.closest('.sx-card-menu')) cardMenuClose(); }, true);
addEventListener('wheel', cardMenuClose, { passive: true });
addEventListener('keydown', e => {
  if (cardMenu.hidden) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cardMenuClose(); return; }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); const bs = [...cardMenu.querySelectorAll('.sx-hop-mi:not(:disabled)')], i = bs.indexOf(document.activeElement); (bs[(i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length] || bs[0]).focus({ preventScroll: true }); }
}, true);

/* ---------- into books ---------- */
// which book: the ones on this board, or a new one
function cardBookPick(ids, x, y) {
  const books = cardBooks();
  cardMenu.replaceChildren(...[el('div', { class: 'sx-hop-mh' }, 'Put in which book?'),
    ...books.map(b => cardItem(b.title || 'A book', () => cardIntoBook(ids, b.id))), books.length ? cardSep() : null,
    cardItem('+ A new book', () => cardBind(ids.map(itemOf).filter(Boolean), null))].filter(Boolean)); // (the page's own replaceChildren writes a missing one as null)
  cardMenu.hidden = false; cardMenuAt(x, y);
}
// strings: between the cards that become pages, they go; from them to anything else, they move onto the book
function cardRetie(ids, bid) {
  const B = B_(), out = [];
  B.links.forEach(l => { const a = ids.has(l[0]), b = ids.has(l[1]); if (!a && !b) { out.push(l); return; } if (a && b) return; const other = a ? l[1] : l[0]; if (bid && other !== bid && !out.some(k => k.includes(bid) && k.includes(other))) out.push([bid, other]); });
  B.links = out;
}
function cardIntoBook(ids, bid) {
  const b = itemOf(bid), its = ids.map(itemOf).filter(it => it && CARD_INTO.includes(it.type) && !it.book); if (!b || !its.length) return;
  deskMark(); if (!Array.isArray(b.pages)) b.pages = [];
  its.forEach(it => { it.book = b.id; delete it.group; b.pages.push(it.id); });
  cardRetie(new Set(its.map(i => i.id)), b.id); select(null); save(); drawBoard(); deskSfx('flip');
  const c = els.get(b.id); if (c && !stillUI()) c.animate([{ scale: 1 }, { scale: 1.06 }, { scale: 1 }], { duration: 260, easing: 'ease-out' });
  deskToast('Into ' + (b.title || 'the book') + ': ' + its.length + (its.length === 1 ? ' page' : ' pages'));
}
// cards bound into a new book, in the order given (or reading order: rows, then left to right); it sits where the first was
function cardBind(its, title, order) {
  its = its.filter(it => it && CARD_INTO.includes(it.type) && !it.book); if (!its.length) { deskToast('Notes, photos and tables can go in a book'); return null; }
  if (!order) { const band = 90; its.sort((a, b) => Math.round(a.y / band) - Math.round(b.y / band) || a.x - b.x); }
  const x0 = order ? its[0].x : Math.min(...its.map(i => i.x)), y0 = order ? its[0].y : Math.min(...its.map(i => i.y));
  deskMark(); const id = 'k' + Date.now(), ids = new Set(its.map(i => i.id));
  const first = its[0], name = title || (first.type === 'note' ? String(first.text || '').split('\n').map(s => s.trim()).filter(Boolean)[0] : '') || 'A book';
  its.forEach(it => { it.book = id; delete it.group; });
  B_().items.push({ id, type: 'book', board: B_().cur, x: Math.round(x0), y: Math.round(y0), title: name.slice(0, 80), color: 'slate', pages: its.map(i => i.id), at: 0 });
  cardRetie(ids, id); select(id); save(); drawBoard(); deskLand(id, true); deskSfx('flip');
  deskToast('Bound into a book: ' + its.length + (its.length === 1 ? ' page' : ' pages') + ' (click it to open)');
  return id;
}
// a book's pages, all back out on the desk (in a row beside it); the book stays, empty
function cardUnbind(bid) {
  const b = itemOf(bid); if (!b) return; const ps = (b.pages || []).map(itemOf).filter(p => p && p.book === bid); if (!ps.length) return;
  deskMark(); ps.forEach((p, i) => { delete p.book; p.board = b.board; p.x = b.x + 230 + (i % 5) * 240; p.y = b.y + Math.floor(i / 5) * 200; });
  b.pages = []; b.at = 0; save(); drawBoard(); deskToast(ps.length + (ps.length === 1 ? ' page is' : ' pages are') + ' back on the desk');
}
// Bind, in the bar for several picked cards (beside Tidy)
const bindB = deskBtn(bookIcon(BOOK_D), () => cardBind([...picked].map(itemOf), null), 'sx-ws-ic', 'Bind: the picked notes, photos and tables become a book, in reading order');
deskSelGrp.insertBefore(bindB, delSelB);
// Make a book, and Put in a book, in a note's right-click panel (and Put in a book in a table's menu)
const mkBookB = fbtn('mkbook', 'Make a book', 'This note and the cards tied to it become a book: this note first, its words the title');
const toBookB = fbtn('tobook', 'Put in a book', 'This note goes into a book on this board (or a new one)');
noteBar.querySelector('[data-k="board"]').after(mkBookB, toBookB);
noteBar.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || (b.dataset.k !== 'mkbook' && b.dataset.k !== 'tobook')) return; e.stopImmediatePropagation();
  const n = selNote(); if (!n || !els.has(n.it.id) || n.it.book) { if (n && n.it.book) deskToast('It\'s in a book already'); return; }
  const r = b.getBoundingClientRect(); if (typeof noteMenuClose === 'function') noteMenuClose();
  if (b.dataset.k === 'tobook') { cardBookPick([n.it.id], r.left, r.bottom + 4); return; }
  const kids = (typeof tiedOf === 'function' ? tiedOf(n.it.id) : []).filter(it => CARD_INTO.includes(it.type) && !it.book);
  cardBind([n.it, ...kids], null, true);
}, true);

/* ---------- photo files dropped on a closed book: its pages ---------- */
async function cardPhotosInto(bid, files) {
  const b = itemOf(bid); if (!b) return; let k = 0; const made = [];
  for (const f of [...files].filter(f => /^image\//.test(f.type))) { try { const src = await shrinkPhoto(f), id = 'p' + Date.now() + '-' + k++; await PHOTOS.put(id, src); made.push({ id, type: 'photo', board: b.board, x: 0, y: 0, text: '', book: b.id }); } catch (e) { /* not a picture */ } }
  if (!made.length) return; deskMark(); B_().items.push(...made); if (!Array.isArray(b.pages)) b.pages = []; b.pages.push(...made.map(m => m.id));
  save(); drawBoard(); deskSfx('shutter'); deskToast('Into ' + (b.title || 'the book') + ': ' + made.length + (made.length === 1 ? ' photo' : ' photos'));
}
ws.addEventListener('drop', e => {
  const fs = e.dataTransfer && e.dataTransfer.files; if (!fs || !fs.length) return;
  const c = document.elementsFromPoint(e.clientX, e.clientY).map(n => n.closest && n.closest('.sx-bbook')).find(Boolean); if (!c) return;
  e.preventDefault(); e.stopImmediatePropagation(); ws.classList.remove('drop'); cardPhotosInto(c.dataset.id, fs);
}, true);
