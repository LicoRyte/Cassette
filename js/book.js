/* Cassie: books. A book is a hardcover on the desk: a title, a cover picture if you like, a cover colour from the note
   colours, and its pages, in order: notes, photos and tables. Click it and it opens in the middle of the screen as a
   spread: the contents on the left (every page by its first line; click one to go there, drag to reorder; the cover's
   title, colour and picture are set there too), the page itself on the right, written in just like a note on the desk.
   ‹ › (or ← → while you're not writing) turn the pages; New page adds one just after the one you're on (Shift+Enter in a
   page does too); a note, photo or table dropped on a closed book goes in at the end; Take out puts a page back on the desk.
   A page is a card that belongs to its book (it.book): it's kept, backed up, found and copied like any other, but never
   drawn loose on the desk. The book itself (it.pages, the ids in order; it.at, the page it's open at) is one card there. */
'use strict';

const bookIcon = d => { const s = el('span', { class: 'sx-ic', 'aria-hidden': 'true' }); s.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="square">' + d + '</svg>'; return s; };
const BOOK_D = '<path d="M5 4.5h11.5a2 2 0 0 1 2 2V19.5H7a2 2 0 0 1-2-2z"/><path d="M5 17.5a2 2 0 0 1 2-2h11.5"/><path d="M9 8.5h6"/>';
const bookKey = deskBtn(bookIcon(BOOK_D), () => addBook(), 'sx-ws-ic', 'Book: notes, photos and tables bound together, in order');
tableKey.after(bookKey);

const BOOK_FLAGS = ['#ff6157', '#ffb762', '#ffd832', '#9cb93b', '#77d6c1', '#1c92a7', '#ff88a9', '#c03b94']; // (a flagged page's sticky tab: one of these, all from the 32)
const bookOf = id => { const it = itemOf(id); return it && it.type === 'book' ? it : null; };
const bookPages = b => { const ids = Array.isArray(b.pages) ? b.pages : []; const out = ids.map(itemOf).filter(p => p && p.book === b.id); if (out.length !== ids.length) b.pages = out.map(p => p.id); return out; };
// the cover's colours: any of the 32 in Cassie's palette (PALETTE, in js/notes.js); the title's colour is one of them too, or
// Auto (cream on a dark cover, dark ink on a light one). b.bg and b.ink are kept; b.color is a book from before
function bookColor(b) {
  const named = NOTE_COLORS.find(c => c[0] === b.color) || NOTE_COLORS.find(c => c[0] === 'slate');
  const bg = PALETTE.includes(b.bg) ? b.bg : named[1];
  return [b.color || '', bg, PALETTE.includes(b.ink) ? b.ink : (PALETTE.includes(b.bg) ? bookAuto(bg) : named[2])];
}
function bookName(p) { // a page as the contents list it
  if (p.type === 'photo') return p.text ? String(p.text).split('\n')[0].slice(0, 60) : 'A photo';
  if (p.type === 'tbl') return ((p.rows && p.rows[0]) || []).filter(Boolean).slice(0, 3).join(' · ') || 'A table';
  return String(p.text || '').split('\n').map(s => s.trim()).filter(Boolean)[0] || 'An empty page';
}

/* ---------- the book on the desk, closed ---------- */
function bookCard(it) {
  const [, bg, ink] = bookColor(it), n = bookPages(it).length;
  const cover = el('div', { class: 'sx-book-pic' + (it.cover ? '' : ' none') });
  if (it.cover) photoUrls(it.id).then(u => { if (u) cover.append(el('img', { src: u.small || u.full, alt: '', draggable: 'false' })); });
  const x = el('button', { type: 'button', class: 'sx-bnote-x', 'aria-label': 'Take the book away', title: 'Take the book away (its pages too)', onclick: () => removeOne(it) }, '×');
  const c = el('div', { class: 'sx-bcard sx-bbook', 'data-id': it.id, title: 'Open ' + (it.title || 'the book'),
      style: 'left:' + it.x + 'px;top:' + it.y + 'px;--tilt:' + (tilt(it.id) / 2).toFixed(2) + 'deg;--cover:' + bg + ';--cink:' + ink + ';--edge:' + Math.min(9, 2 + n * .6).toFixed(1) + 'px' },
    el('span', { class: 'sx-pin', title: 'Drag to something else to tie a string' }), x,
    el('i', { class: 'sx-book-edge', 'aria-hidden': 'true' }), el('i', { class: 'sx-book-base', 'aria-hidden': 'true' }), el('i', { class: 'sx-book-spine', 'aria-hidden': 'true' }),
    el('b', { class: 'sx-book-title' }, it.title || 'A book'), cover,
    el('span', { class: 'sx-book-n' }, n + (n === 1 ? ' page' : ' pages')));
  if (typeof bookDress === 'function') bookDress(c, it); // (its title's look, corners, band and stickers: js/deco.js)
  // page flags: a sticky tab poking out of the edge for every flagged page, as far down as the page is far through the book
  const pgs = bookPages(it); pgs.forEach((p, i) => { if (!PALETTE.includes(p.flag)) return;
    c.append(el('i', { class: 'sx-flag', 'data-i': i, title: 'Page ' + (i + 1) + ': ' + bookName(p), style: '--flag:' + p.flag + ';top:' + (9 + 76 * i / Math.max(1, pgs.length - 1)).toFixed(1) + '%' })); });
  return c;
}
// (before version 197 a book could be drawn as a note after a reload, and words typed into it were kept on the book: they're let go)
S.board.items.forEach(it => { if (it.type === 'book') ['html', 'text', 'fs', 'h', 'paper', 'rcd', 'mt'].forEach(k => delete it[k]); });
{ const pc0 = paperCard; paperCard = function (it, ...a) { return it.type === 'book' ? bookCard(it) : pc0.call(this, it, ...a); }; }
function addBook() {
  const p = freeSpot(), t = Date.now(), id = 'k' + t, pg = 'n' + t + 'p';
  deskMark(); deskSfx('pin');
  B_().items.push({ id: pg, type: 'note', board: B_().cur, x: 0, y: 0, text: '', book: id, rcd: 1 },
    { id, type: 'book', board: B_().cur, x: Math.round(p.x), y: Math.round(p.y), title: 'A book', color: 'slate', pages: [pg], at: 0 });
  save(); drawBoard(); deskLand(id, true); bookOpen(id); setTimeout(() => bookTitleEdit(), 60);
}

/* ---------- the open book: the contents on the left, the page on the right ---------- */
const bookView = el('div', { class: 'sx-book-view', hidden: true, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Book' });
const bookSide = el('aside', { class: 'sx-book-side' }), bookMain = el('section', { class: 'sx-book-main' });
const bookPageBox = el('div', { class: 'sx-book-page sx-world' }); // (sx-world: a page is styled, and written in, just like a card on the desk)
bookView.append(el('div', { class: 'sx-book-open' }, bookSide, bookMain));
document.body.append(bookView);
let bookId = null, bookPgEl = null, bookPgId = null, bookPgIt = null;
bookView.addEventListener('pointerdown', e => { if (e.target === bookView) bookClose(); }); // (a click on the dimmed desk closes it)
bookView.addEventListener('wheel', e => e.stopPropagation(), { passive: true });

function bookOpen(id, at) {
  const b = bookOf(id); if (!b) return;
  if (bookId !== id) { bookLeavePage(); bookId = id; }
  const n = bookPages(b).length; if (at != null) b.at = at; b.at = Math.max(0, Math.min(n - 1, b.at || 0));
  select(null); if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  const was = bookView.hidden; bookView.hidden = false; if (!stillUI()) animAgain(bookView, 'in');
  bookDraw(true); deskSfx('flip');
  if (was && !stillUI()) bookSwing(b);
}
// opening a book: its cover swings open on the binding, as the pages come into view
function bookSwing(b) {
  const box = bookView.querySelector('.sx-book-open'); if (!box) return; const r = box.getBoundingClientRect(), [, bg, ink] = bookColor(b);
  const sw = el('div', { class: 'sx-book-swing', 'aria-hidden': 'true', style: 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;--cover:' + bg + ';--cink:' + ink },
    el('i', { class: 'sx-book-spine' }), el('b', { class: 'sx-book-title' }, b.title || 'A book'));
  if (b.cover) { const pic = el('div', { class: 'sx-book-pic sx-swing-pic' }); sw.append(pic); photoUrls(b.id).then(u => { if (u) pic.append(el('img', { src: u.full, alt: '' })); }); } // (and its picture)
  sw.style.setProperty('--edge', Math.min(10, 3 + (b.pages || []).length * .6).toFixed(1) + 'px');
  if (typeof bookDress === 'function') bookDress(sw, b);
  document.body.append(sw);
  const a = sw.animate([{ transform: 'perspective(2200px) rotateY(0deg)', opacity: 1 }, { transform: 'perspective(2200px) rotateY(-92deg)', opacity: 1, offset: .62 }, { transform: 'perspective(2200px) rotateY(-150deg)', opacity: 0 }], { duration: 720, easing: 'cubic-bezier(.45, 0, .3, 1)' });
  a.onfinish = a.oncancel = () => sw.remove(); setTimeout(() => sw.remove(), 1200); // (and gone in any case, even where animations are held up)
}
function bookClose() {
  if (!bookId) return; bookLeavePage(); bookId = null; bookView.hidden = true; save(); drawBoard(); deskSfx('drop');
}
function bookLeavePage() { if (bookPgEl) { if (bookPgId && els.get(bookPgId) === bookPgEl) els.delete(bookPgId); bookPgEl.remove(); } bookPgEl = null; bookPgId = null; bookPgIt = null; }
function bookGo(i, write) {
  const b = bookOf(bookId); if (!b) return; const n = bookPages(b).length; if (!n) return;
  const to = Math.max(0, Math.min(n - 1, i)); const dir = to > (b.at || 0) ? 1 : -1; if (to === b.at && bookPgEl) return;
  b.at = to; save(); bookDraw(false, dir); deskSfx('page'); if (write) bookWrite();
}
function bookWrite() { const t = bookPgEl && bookPgEl.querySelector('.sx-note-t, .sx-tc'); if (!t) return; t.focus({ preventScroll: true }); const r = document.createRange(); r.selectNodeContents(t); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }

function bookDraw(fresh, dir) { bookSideDraw(); bookPageDraw(fresh, dir); }
function bookSideDraw() {
  const b = bookOf(bookId); if (!b) return; const pages = bookPages(b), [, bg, ink] = bookColor(b);
  [bookSide, bookSide.parentNode].forEach(n => { n.style.setProperty('--cover', bg); n.style.setProperty('--cink', ink); if (PALETTE.includes(b.spine)) n.style.setProperty('--spine', b.spine); else n.style.removeProperty('--spine'); }); // (the contents and the binding wear the cover's colour)
  const pic = el('button', { type: 'button', class: 'sx-book-thumb' + (b.cover ? '' : ' none'), title: 'Decorate the cover', 'aria-label': 'Decorate the cover', onclick: () => decoOpen(b.id) });
  if (b.cover) photoUrls(b.id).then(u => { if (u) pic.prepend(el('img', { src: u.small || u.full, alt: '' })); }); else if (!(b.stickers || []).length && !b.band && !b.corners) pic.append(bookIcon('<path d="M4 6h16v12H4z"/><path d="M4 15l5-4 4 3 3-2 4 3"/>'));
  bookDress(pic, b);
  const title = el('button', { type: 'button', class: 'sx-book-name', title: 'Rename the book', onclick: () => bookTitleEdit() }, b.title || 'A book');
  const list = el('ol', { class: 'sx-book-idx' }, ...pages.map((p, i) => {
    const row = el('li', { class: 'sx-book-row' + (i === b.at ? ' on' : '') + (p.topic ? ' topic' : ''), draggable: 'true', 'data-i': i },
      el('b', {}, String(i + 1)), bookIcon(p.type === 'photo' ? '<path d="M4 6h16v12H4z"/><path d="M4 15l5-4 4 3 3-2 4 3"/>' : p.type === 'tbl' ? '<path d="M4 5h16v14H4z"/><path d="M4 10h16M4 14.5h16M10 5v14"/>' : '<path d="M6 4h9l3 3v13H6z"/><path d="M9 11h6M9 15h4"/>'),
      el('span', {}, bookName(p)), PALETTE.includes(p.flag) ? el('i', { class: 'sx-book-rflag', style: '--flag:' + p.flag, title: 'Flagged' }) : null);
    row.addEventListener('click', () => bookGo(i));
    row.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; row.classList.add('drag'); });
    row.addEventListener('dragend', () => row.classList.remove('drag'));
    row.addEventListener('dragover', e => { e.preventDefault(); const r = row.getBoundingClientRect(), after = e.clientY > r.top + r.height / 2; list.querySelectorAll('.over-t, .over-b').forEach(n => n.classList.remove('over-t', 'over-b')); row.classList.add(after ? 'over-b' : 'over-t'); });
    row.addEventListener('drop', e => { e.preventDefault(); const from = +e.dataTransfer.getData('text/plain'), r = row.getBoundingClientRect(); let to = i + (e.clientY > r.top + r.height / 2 ? 1 : 0); bookMove(from, to); });
    return row; }));
  list.addEventListener('dragleave', e => { if (!list.contains(e.relatedTarget)) list.querySelectorAll('.over-t, .over-b').forEach(n => n.classList.remove('over-t', 'over-b')); });
  const add = (label, kind, tip) => el('button', { type: 'button', class: 'sx-book-add', title: tip, onclick: () => bookAdd(kind) }, '+ ' + label);
  bookSide.replaceChildren(el('div', { class: 'sx-book-head' }, pic, el('div', { class: 'sx-book-headt' }, title, el('span', {}, pages.length + (pages.length === 1 ? ' page' : ' pages')))),
    el('div', { class: 'sx-book-lbl' }, 'Contents'), list,
    el('div', { class: 'sx-book-adds' }, add('Note', 'note', 'A new page just after this one (Shift+Enter in a page does too)'), add('Photo', 'photo', 'A photo page just after this one'), add('Table', 'tbl', 'A table page just after this one')));
  const on = list.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' });
}
function bookPageDraw(fresh, dir) {
  const b = bookOf(bookId); if (!b) return; const pages = bookPages(b), p = pages[b.at];
  const close = el('button', { type: 'button', class: 'sx-book-x', title: 'Close the book (Esc)', 'aria-label': 'Close the book', onclick: () => bookClose() }, '×');
  if (!p) { bookLeavePage(); bookMain.replaceChildren(el('div', { class: 'sx-book-top' }, el('span', { class: 'sx-gap' }), close),
      el('div', { class: 'sx-book-empty' }, el('b', {}, 'An empty book'), el('span', {}, 'Add a page from the contents, or drop notes on the closed book.'))); return; }
  let armT = 0;
  const del = el('button', { type: 'button', class: 'sx-book-tb del', title: 'Delete this page', onclick: () => {
    if (!del.classList.contains('arm')) { del.classList.add('arm'); del.textContent = 'Delete? Click again'; armT = setTimeout(() => { del.classList.remove('arm'); del.textContent = 'Delete'; }, 3000); return; }
    clearTimeout(armT); bookDelPage(); } }, 'Delete');
  const top = el('div', { class: 'sx-book-top' }, el('span', { class: 'sx-book-pn' }, 'Page ' + (b.at + 1) + ' of ' + pages.length), el('span', { class: 'sx-gap' }),
    typeof stkTrayOpen === 'function' ? el('button', { type: 'button', class: 'sx-book-tb', title: 'Stickers: drag one onto the page', onclick: e => stkTrayOpen(e.currentTarget) }, 'Stickers') : null,
    el('button', { type: 'button', class: 'sx-book-tb sx-book-flagb' + (PALETTE.includes(p.flag) ? ' on' : ''), style: PALETTE.includes(p.flag) ? '--flag:' + p.flag : null, title: 'Flag this page: a sticky tab pokes out of the closed book, to open it right here', onclick: e => bookFlagPop(e.currentTarget, p) }, PALETTE.includes(p.flag) ? 'Flagged' : 'Flag'),
    el('button', { type: 'button', class: 'sx-book-tb', title: 'Put this page back on the desk, beside the book', onclick: () => bookTakeOut() }, 'Take out'), del, close);
  const nav = el('div', { class: 'sx-book-nav' },
    el('button', { type: 'button', class: 'sx-book-turn', 'aria-label': 'The page before', title: 'The page before (←)', disabled: b.at <= 0 || null, onclick: () => bookGo(b.at - 1) }, '‹'),
    el('span', {}, (b.at + 1) + ' / ' + pages.length),
    el('button', { type: 'button', class: 'sx-book-turn', 'aria-label': 'The next page', title: 'The next page (→)', disabled: b.at >= pages.length - 1 || null, onclick: () => bookGo(b.at + 1) }, '›'));
  let turned = null;
  if (fresh || p.id !== bookPgId || itemOf(p.id) !== bookPgIt) { // the page itself: a card, just like on the desk
    const was = dir && bookPgEl && !stillUI() ? bookPgEl.cloneNode(true) : null; // (the page you're leaving, for it to turn over)
    bookLeavePage();
    const c = p.type === 'tbl' ? tblCard(p) : paperCard(p); c.classList.add('sx-book-pg'); bookPgEl = c; bookPgId = p.id; bookPgIt = p; c._snap = cardSnap(p); els.set(p.id, c);
    bookPageBox.replaceChildren(c); bookPageBox.scrollTop = 0;
    if (dir && !stillUI()) turned = { dir, was, now: c };
  }
  // the ribbon inside: it lies down the page you're on, in its own colour (or the cover's), and lifts and settles as you turn
  const rib = b.ribbon === 'none' ? null : el('i', { class: 'sx-book-rib', style: '--rib:' + (PALETTE.includes(b.ribbon) ? b.ribbon : bookColor(b)[1]), 'aria-hidden': 'true' });
  const folio = el('span', { class: 'sx-book-folio', 'aria-hidden': 'true' }, String(b.at + 1)); // (the page number, printed at its foot)
  bookMain.replaceChildren(...[top, bookPageBox, folio, nav, rib].filter(Boolean));
  if (turned) bookTurn(turned.dir, turned.was, turned.now);
  if (rib && dir && !stillUI()) rib.animate([{ transform: 'translateY(-26px)', opacity: 0 }, { transform: 'translateY(-26px)', opacity: 0, offset: .45 }, { transform: 'none', opacity: 1 }], { duration: 640, easing: 'cubic-bezier(.3, 1.4, .5, 1)' });
}
// a page turning over: forward, the page you leave lifts from the right and folds over to the left; back, the page you
// return to comes over from the left and lies down. (Only the turning sheet moves: the page under it is already there)
function bookTurn(dir, was, now) {
  const h = bookMain.getBoundingClientRect(), r = bookPageBox.getBoundingClientRect(); if (!r.width) return;
  const sheet = (dir > 0 ? was : now.cloneNode(true)); if (!sheet) return;
  sheet.removeAttribute('data-id'); sheet.querySelectorAll('[contenteditable]').forEach(n => n.removeAttribute('contenteditable'));
  const turn = el('div', { class: 'sx-turn', 'aria-hidden': 'true', inert: '', style: 'left:' + (r.left - h.left) + 'px;top:' + (r.top - h.top) + 'px;width:' + r.width + 'px;height:' + r.height + 'px' },
    el('div', { class: 'sx-turn-in' }, sheet), el('i', { class: 'sx-turn-shade' }));
  bookMain.append(turn);
  const fwd = dir > 0, flat = 'perspective(3200px) rotateY(0deg)', up = 'perspective(3200px) rotateY(-90deg)';
  const a = turn.animate(fwd ? [{ transform: flat }, { transform: up }] : [{ transform: up }, { transform: flat }], { duration: 430, easing: fwd ? 'cubic-bezier(.45, 0, .8, .6)' : 'cubic-bezier(.2, .5, .4, 1)' });
  turn.lastChild.animate(fwd ? [{ opacity: 0 }, { opacity: .55 }] : [{ opacity: .55 }, { opacity: 0 }], { duration: 430 });
  if (!fwd) now.animate([{ opacity: 0 }, { opacity: 0, offset: .9 }, { opacity: 1 }], { duration: 430 }); // (the page under it shows once the sheet has landed)
  a.onfinish = a.oncancel = () => turn.remove(); setTimeout(() => turn.remove(), 900);
}

// flagging a page: a little row of flag colours under the button (or no flag)
function bookFlagPop(btn, p) {
  document.querySelectorAll('.sx-flag-pop').forEach(n => n.remove());
  const pick = hex => { deskMark(); if (hex) p.flag = hex; else delete p.flag; save(); const c = els.get(bookId); if (c) c._snap = ''; pop.remove(); bookSideDraw(); bookPageDraw(false); deskSfx(hex ? 'pin' : 'pick'); };
  const pop = el('div', { class: 'sx-flag-pop', role: 'menu' },
    ...BOOK_FLAGS.map(hex => el('button', { type: 'button', class: 'sx-flag-sw' + (p.flag === hex ? ' on' : ''), style: '--flag:' + hex, 'aria-label': 'Flag it ' + hex, onclick: () => pick(hex) })),
    el('button', { type: 'button', class: 'sx-flag-none', onclick: () => pick(null) }, 'No flag'));
  const r = btn.getBoundingClientRect(), h = bookMain.getBoundingClientRect();
  pop.style.top = (r.bottom - h.top + 6) + 'px'; pop.style.right = Math.max(8, h.right - r.right) + 'px';
  bookMain.append(pop);
  const off = e => { if (!pop.contains(e.target) && e.target !== btn) { pop.remove(); removeEventListener('pointerdown', off, true); } };
  setTimeout(() => addEventListener('pointerdown', off, true), 0);
}

/* ---------- changing a book: adding, moving, deleting, taking out ---------- */
async function bookAdd(kind, files) {
  const b = bookOf(bookId); if (!b) return; bookPages(b);
  const at = Math.min((b.at || 0) + 1, b.pages.length), t = Date.now(), made = [];
  if (kind === 'photo') {
    if (!files) { const f = el('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true }); document.body.append(f); f.addEventListener('change', () => { const fs = [...f.files]; f.remove(); if (fs.length) bookAdd('photo', fs); }); f.click(); return; }
    let k = 0; for (const file of [...files].filter(x => /^image\//.test(x.type))) { try { const src = await shrinkPhoto(file), id = 'p' + t + '-' + k++; await PHOTOS.put(id, src); made.push({ id, type: 'photo', board: b.board, x: 0, y: 0, text: '', book: b.id }); } catch (e) { /* not a picture */ } }
    if (!made.length) return;
  } else if (kind === 'tbl') made.push({ id: 't' + t, type: 'tbl', board: b.board, x: 0, y: 0, rows: [['Item', 'Value'], ['', ''], ['', '']], view: 'table', w: 440, book: b.id, rcd: 1 });
  else made.push({ id: 'n' + t, type: 'note', board: b.board, x: 0, y: 0, text: '', book: b.id, rcd: 1 });
  deskMark(); B_().items.push(...made); b.pages.splice(at, 0, ...made.map(m => m.id)); b.at = at; save();
  bookDraw(false, 1); deskSfx(kind === 'photo' ? 'shutter' : 'pin'); if (kind !== 'photo') setTimeout(bookWrite, 30);
}
function bookMove(from, to) {
  const b = bookOf(bookId); if (!b) return; bookPages(b); if (from === to || from + 1 === to) { bookSideDraw(); return; }
  deskMark(); const cur = b.pages[b.at], [id] = b.pages.splice(from, 1); b.pages.splice(to > from ? to - 1 : to, 0, id); b.at = b.pages.indexOf(cur); save(); bookSideDraw(); bookPageDraw(false); deskSfx('drop');
}
function bookDelPage() {
  const b = bookOf(bookId); if (!b) return; const pages = bookPages(b), p = pages[b.at]; if (!p) return;
  deskMark(); removeItems([p.id]); b.at = Math.max(0, Math.min(b.at, b.pages.length - 1)); save(); bookLeavePage(); bookDraw(false); deskSfx('pick');
}
function bookTakeOut() {
  const b = bookOf(bookId); if (!b) return; const p = bookPages(b)[b.at]; if (!p) return;
  deskMark(); delete p.book; b.pages = b.pages.filter(x => x !== p.id); p.board = b.board; p.x = b.x + 230; p.y = b.y + 20; b.at = Math.max(0, Math.min(b.at, b.pages.length - 1));
  save(); bookLeavePage(); drawBoard(); bookDraw(false); deskToast('Taken out: it\'s on the desk beside the book');
}
function bookTitleEdit() {
  const b = bookOf(bookId); if (!b) return; const old = bookSide.querySelector('.sx-book-name'); if (!old) return;
  const inp = el('input', { class: 'sx-book-namei', type: 'text', maxlength: '80', value: b.title || '', 'aria-label': 'The book\'s title', spellcheck: 'false' });
  let done = false; const fin = keep => { if (done) return; done = true; const v = inp.value.trim().slice(0, 80); if (keep && v && v !== b.title) { deskMark(); b.title = v; save(); drawBoard(); } bookSideDraw(); };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); fin(true); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fin(false); } });
  inp.addEventListener('blur', () => fin(true));
  old.replaceWith(inp); inp.focus(); inp.select();
}

/* ---------- a card dropped on a closed book goes in, at the end ---------- */
function bookDropAt(ev, its) {
  const moved = new Set(its.map(i => i.id));
  const under = document.elementsFromPoint(ev.clientX, ev.clientY).map(n => n.closest && n.closest('.sx-bbook')).find(n => n && !moved.has(n.dataset.id));
  const b = under && bookOf(under.dataset.id); if (!b) return;
  const into = its.filter(i => ['note', 'photo', 'tbl'].includes(i.type)); if (!into.length) return;
  const ids = new Set(into.map(i => i.id)); bookPages(b);
  into.forEach(i => { i.book = b.id; delete i.group; b.pages.push(i.id); });
  B_().links = B_().links.filter(l => !ids.has(l[0]) && !ids.has(l[1])); // (a page has no strings)
  select(null); drawBoard(); deskSfx('flip');
  const c = els.get(b.id); if (c && !stillUI()) c.animate([{ scale: 1 }, { scale: 1.06 }, { scale: 1 }], { duration: 260, easing: 'ease-out' });
  deskToast('Into ' + (b.title || 'the book') + ': ' + into.length + (into.length === 1 ? ' page' : ' pages'));
}

/* ---------- books and their pages, wherever cards are copied, deleted or found ---------- */
async function bookCopyOf(src, copy, tag) { // a duplicated book brings its pages and cover; a duplicated page goes just after it, in its book
  const B = B_();
  if (src.type === 'book') {
    copy.pages = []; let k = 0;
    for (const p of bookPages(src)) { const c = JSON.parse(JSON.stringify(p)); c.id = ((String(p.id).match(/^[a-z]+/i) || ['n'])[0]) + tag + 'p' + k++; c.book = copy.id;
      if (p.type === 'photo') { try { const s = await PHOTOS.get(p.id); if (s) await PHOTOS.put(c.id, s); } catch (e) { continue; } }
      B.items.push(c); copy.pages.push(c.id); }
    if (src.cover) { try { const s = await PHOTOS.get(src.id); if (s) await PHOTOS.put(copy.id, s); } catch (e) { delete copy.cover; } }
  } else if (src.book) { const b = bookOf(src.book); if (b) { bookPages(b); b.pages.splice(b.pages.indexOf(src.id) + 1, 0, copy.id); } }
}
async function bookRemap(out, imap) { // a copied board: books point at their own copied pages, and their covers come along
  const back = new Map([...imap].map(([o, n]) => [n, o]));
  for (const o of out) {
    if (o.book) { if (imap.has(o.book)) o.book = imap.get(o.book); else delete o.book; }
    if (o.type === 'book') { o.pages = (o.pages || []).filter(p => imap.has(p)).map(p => imap.get(p));
      if (o.cover) { try { const s = await PHOTOS.get(back.get(o.id)); if (s) await PHOTOS.put(o.id, s); else delete o.cover; } catch (e) { delete o.cover; } } }
  }
}
{ const rm0 = removeItems; removeItems = function (ids, ...a) { // a book goes with its pages; a page that goes leaves its book
    const set = new Set(ids); B_().items.forEach(x => { if (x.book && set.has(x.book)) set.add(x.id); });
    const r = rm0.call(this, [...set], ...a);
    B_().items.forEach(x => { if (x.type === 'book' && Array.isArray(x.pages)) x.pages = x.pages.filter(p => !set.has(p)); });
    if (bookId && set.has(bookId)) { bookLeavePage(); bookId = null; bookView.hidden = true; }
    return r; }; }
{ const go0 = deskGoTo; deskGoTo = function (id, ...a) { // Find, and Go to: a page opens its book at that page
    const it = itemOf(id); if (!it || !it.book) return go0.call(this, id, ...a);
    const b = bookOf(it.book); if (!b) return false;
    if (b.board !== S.board.cur) { S.board.cur = b.board; select(null); save(); drawBoard(); deskBoardTools(); }
    bookOpen(b.id, bookPages(b).findIndex(p => p.id === id)); return true; }; }
// Shift+Enter in a page: a new page just after it (not a tied note on the desk); a picture pasted in a page: photo pages
{ const nc0 = noteChain; noteChain = function (t, ...a) { if (t && t.closest && t.closest('.sx-book-view')) { bookAdd('note'); return; } return nc0.call(this, t, ...a); }; }
{ const fp0 = flowPhotos; flowPhotos = function (files, card, ...a) { if (card && card.closest && card.closest('.sx-book-view')) { bookAdd('photo', files); return 1; } return fp0.call(this, files, card, ...a); }; }
// the desk drawn again (Undo, a change elsewhere): the open book follows; its page stays put (the desk doesn't take it)
{ const d0 = drawBoard; drawBoard = function (...a) {
    if (bookPgEl && bookPgId) els.delete(bookPgId);
    const r = d0.apply(this, a);
    if (bookId) { if (!bookOf(bookId)) { bookLeavePage(); bookId = null; bookView.hidden = true; }
      else { if (bookPgEl && bookPgId && itemOf(bookPgId) === bookPgIt && bookPgEl._snap === cardSnap(bookPgIt)) els.set(bookPgId, bookPgEl); else bookPageDraw(true); bookSideDraw(); } } // (a page whose stickers or colour changed is made again)
    return r; }; }
// the note tools (the right-click panel, Ctrl+B and the rest) work on the open book's page: they look for "the note you're
// on" through keepNote (js/notes.js asks it first), so the page answers there, picked or written in
{ const kn0 = keepNote; keepNote = function (...a) {
    if (bookPgEl && bookPgId && !bookView.hidden && bookPgEl.classList.contains('sx-bnote') && (selId === bookPgId || bookPgEl.contains(document.activeElement))) {
      const it = itemOf(bookPgId), t = bookPgEl.querySelector('.sx-note-t'); if (it && t) return { c: bookPgEl, t, it };
    }
    return kn0.apply(this, a); }; }
// the contents follow what you write
let bookNameT = 0; bookPageBox.addEventListener('input', () => { clearTimeout(bookNameT); bookNameT = setTimeout(() => { const b = bookOf(bookId), row = bookSide.querySelector('.sx-book-row.on span'), p = b && bookPages(b)[b.at]; if (row && p) row.textContent = bookName(p); }, 300); });
// keys while it's open: ← → turn the pages (not while writing), Esc closes (once the pen is down)
addEventListener('keydown', e => {
  if (!bookId || bookView.hidden || e.defaultPrevented || (typeof decoId !== 'undefined' && decoId) || (typeof stkTray !== 'undefined' && (!stkTray.hidden || stkCarry || !stkMenu.hidden))) return; // (the decorator and the stickers take Esc first)
  const a = document.activeElement, writing = a && (a.isContentEditable || (a.closest && a.closest('input, textarea, select')));
  if (e.key === 'Escape' && !writing) { e.preventDefault(); e.stopPropagation(); bookClose(); return; }
  if (writing || e.ctrlKey || e.metaKey || e.altKey) return;
  const b = bookOf(bookId); if (!b) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); bookGo((b.at || 0) + 1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); bookGo((b.at || 0) - 1); }
}, true);
