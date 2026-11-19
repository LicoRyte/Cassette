/* Cassie: books. A book is a hardcover on the desk: a title, a cover picture if you like, a cover colour from the note
   colours, and its pages, in order: notes, photos and tables. Click it and it opens in the middle of the screen: the
   contents on the left (every page by its first line; click one to go there, drag to reorder), and the book itself open
   on the right, two pages at a time, each a sheet of the book's paper, written in just like a note on the desk.
   ‹ › (or ← → while you're not writing) turn the pages; New page adds one just after the one you're on (Shift+Enter in a
   page does too); a note, photo or table dropped on a closed book goes in at the end; Take out puts a page back on the desk.
   A page is a card that belongs to its book (it.book): it's kept, backed up, found and copied like any other, but never
   drawn loose on the desk. The book itself (it.pages, the ids in order; it.at, the page it's open at) is one card there. */
'use strict';

const bookIcon = d => { const s = el('span', { class: 'sx-ic', 'aria-hidden': 'true' }); s.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="square">' + d + '</svg>'; return s; };
const BOOK_D = '<path d="M5 4.5h11.5a2 2 0 0 1 2 2V19.5H7a2 2 0 0 1-2-2z"/><path d="M5 17.5a2 2 0 0 1 2-2h11.5"/><path d="M9 8.5h6"/>';
const bookKey = deskBtn(bookIcon(BOOK_D), () => addBook(), 'sx-ws-ic', 'Book: notes, photos and tables bound together, in order');
tableKey.after(bookKey);

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
    el('i', { class: 'sx-book-edge', 'aria-hidden': 'true' }), el('i', { class: 'sx-book-spine', 'aria-hidden': 'true' }),
    el('b', { class: 'sx-book-title' }, it.title || 'A book'), cover,
    el('span', { class: 'sx-book-n' }, n + (n === 1 ? ' page' : ' pages')));
  return typeof bookDress === 'function' ? bookDress(c, it) : c; // (its title's look, corners, band and stickers: js/deco.js)
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

/* ---------- the open book: the contents on the left, and the book itself open on the right: two pages at a time ----------
   Each page is a whole sheet of the book's paper (plain, lined or grid), written in where it lies, scrolling on its own
   when its words don't fit; a phone shows one page at a time. b.at is the page you're on (the one you last clicked or
   wrote in): the spread is the pair it belongs to (1–2, 3–4...), and the keys at the top work on it. */
const bookView = el('div', { class: 'sx-book-view', hidden: true, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Book' });
const bookSide = el('aside', { class: 'sx-book-side' }), bookMain = el('section', { class: 'sx-book-main' });
const bookPhone = () => !!(window.matchMedia && matchMedia('(max-width: 700px)').matches); // (a phone: one page at a time)
const bookStep = () => bookPhone() ? 1 : 2;
const bookStart = i => bookPhone() ? i : i - (i % 2); // (the first page of the spread page i is in)
// the two pages: each a box of the book's paper (sx-world: a page is styled, and written in, just like a card on the desk)
const bookSlots = [0, 1].map(k => {
  const s = { k, box: el('div', { class: 'sx-book-page sx-world', 'data-slot': k }), pgEl: null, pgId: null, pgIt: null };
  s.box.addEventListener('focusin', () => { const b = bookOf(bookId), i = b && s.pgId ? b.pages.indexOf(s.pgId) : -1; if (i >= 0 && b.at !== i) { b.at = i; bookHere(); } }); // (the page you write in is the one you're on)
  s.box.addEventListener('pointerdown', () => { const b = bookOf(bookId), i = b && s.pgId ? b.pages.indexOf(s.pgId) : -1; if (i >= 0 && b.at !== i) { b.at = i; bookHere(); } });
  return s;
});
const bookSpread = el('div', { class: 'sx-book-spread' }, bookSlots[0].box, el('i', { class: 'sx-book-gutter', 'aria-hidden': 'true' }), bookSlots[1].box);
bookView.append(el('div', { class: 'sx-book-open' }, bookSide, bookMain));
document.body.append(bookView);
let bookId = null;
bookView.addEventListener('pointerdown', e => { if (e.target === bookView) bookClose(); }); // (a click on the dimmed desk closes it)
bookView.addEventListener('wheel', e => e.stopPropagation(), { passive: true });

function bookOpen(id, at) {
  const b = bookOf(id); if (!b) return;
  if (bookId !== id) { bookLeavePage(); bookId = id; }
  const n = bookPages(b).length; if (at != null) b.at = at; b.at = Math.max(0, Math.min(n - 1, b.at || 0));
  select(null); if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  bookView.hidden = false; if (!stillUI()) animAgain(bookView, 'in');
  bookDraw(true); deskSfx('flip');
}
function bookClose() {
  if (!bookId) return; bookLeavePage(); bookId = null; bookView.hidden = true; save(); drawBoard(); deskSfx('drop');
}
function bookLeave(s) { if (s.pgEl) { if (s.pgId && els.get(s.pgId) === s.pgEl) els.delete(s.pgId); s.pgEl.remove(); } s.pgEl = null; s.pgId = null; s.pgIt = null; }
function bookLeavePage() { bookSlots.forEach(bookLeave); }
function bookGo(i, write) { // to page i (and its spread)
  const b = bookOf(bookId); if (!b) return; const n = bookPages(b).length; if (!n) return;
  const to = Math.max(0, Math.min(n - 1, i)), turn = bookStart(to) !== bookStart(b.at || 0), dir = to > (b.at || 0) ? 1 : -1;
  b.at = to; save();
  if (turn) { bookDraw(false, dir); deskSfx('pick'); } else bookHere();
  if (write) bookWrite();
}
function bookWrite() { // the pen at the end of the page you're on
  const b = bookOf(bookId), p = b && bookPages(b)[b.at], s = p && bookSlots.find(x => x.pgId === p.id);
  const t = s && s.pgEl && s.pgEl.querySelector('.sx-note-t, .sx-tc'); if (!t) return;
  t.focus({ preventScroll: true }); const r = document.createRange(); r.selectNodeContents(t); r.collapse(false); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
}
function bookHere() { // the page you're on: lit in the contents, named at the top, a faint mark on the page
  const b = bookOf(bookId); if (!b) return; const s0 = bookStart(b.at || 0), step = bookStep(), n = bookPages(b).length;
  bookSide.querySelectorAll('.sx-book-row').forEach(r => { const i = +r.dataset.i; r.classList.toggle('on', i >= s0 && i < s0 + step); r.classList.toggle('here', i === b.at); });
  bookSlots.forEach(s => s.box.classList.toggle('here', !!s.pgId && b.pages[b.at] === s.pgId && bookStep() > 1));
  const pn = bookMain.querySelector('.sx-book-pn'); if (pn) pn.textContent = 'Page ' + ((b.at || 0) + 1) + ' of ' + n;
}

function bookDraw(fresh, dir) { bookSideDraw(); bookPageDraw(fresh, dir); }
function bookSideDraw() {
  const b = bookOf(bookId); if (!b) return; const pages = bookPages(b), [, bg, ink] = bookColor(b);
  [bookSide, bookSide.parentNode].forEach(n => { n.style.setProperty('--cover', bg); n.style.setProperty('--cink', ink); if (PALETTE.includes(b.spine)) n.style.setProperty('--spine', b.spine); else n.style.removeProperty('--spine'); }); // (the contents and the binding wear the cover's colour)
  const pic = el('button', { type: 'button', class: 'sx-book-thumb' + (b.cover ? '' : ' none'), title: 'Decorate the cover', 'aria-label': 'Decorate the cover', onclick: () => decoOpen(b.id) });
  if (b.cover) photoUrls(b.id).then(u => { if (u) pic.prepend(el('img', { src: u.small || u.full, alt: '' })); }); else if (!(b.stickers || []).length && !b.band && !b.corners) pic.append(bookIcon('<path d="M4 6h16v12H4z"/><path d="M4 15l5-4 4 3 3-2 4 3"/>'));
  bookDress(pic, b);
  const title = el('button', { type: 'button', class: 'sx-book-name', title: 'Rename the book', onclick: () => bookTitleEdit() }, b.title || 'A book');
  const list = el('ol', { class: 'sx-book-idx' }, ...pages.map((p, i) => {
    const row = el('li', { class: 'sx-book-row' + (p.topic ? ' topic' : ''), draggable: 'true', 'data-i': i, 'data-pid': p.id },
      el('b', {}, String(i + 1)), bookIcon(p.type === 'photo' ? '<path d="M4 6h16v12H4z"/><path d="M4 15l5-4 4 3 3-2 4 3"/>' : p.type === 'tbl' ? '<path d="M4 5h16v14H4z"/><path d="M4 10h16M4 14.5h16M10 5v14"/>' : '<path d="M6 4h9l3 3v13H6z"/><path d="M9 11h6M9 15h4"/>'),
      el('span', { class: 'sx-book-rown' }, bookName(p)));
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
  bookHere(); const on = list.querySelector('.here'); if (on) on.scrollIntoView({ block: 'nearest' });
}
function bookPageDraw(fresh, dir) {
  const b = bookOf(bookId); if (!b) return; const pages = bookPages(b), n = pages.length, s0 = bookStart(b.at || 0), step = bookStep(), phone = bookPhone();
  const close = el('button', { type: 'button', class: 'sx-book-x', title: 'Close the book (Esc)', 'aria-label': 'Close the book', onclick: () => bookClose() }, '×');
  if (!n) { bookLeavePage(); bookMain.replaceChildren(el('div', { class: 'sx-book-top' }, el('span', { class: 'sx-gap' }), close),
      el('div', { class: 'sx-book-empty' }, el('b', {}, 'An empty book'), el('span', {}, 'Add a page from the contents, or drop notes on the closed book.'))); return; }
  let armT = 0;
  const del = el('button', { type: 'button', class: 'sx-book-tb del', title: 'Delete the page you are on', onclick: () => {
    if (!del.classList.contains('arm')) { del.classList.add('arm'); del.textContent = 'Delete? Click again'; armT = setTimeout(() => { del.classList.remove('arm'); del.textContent = 'Delete'; }, 3000); return; }
    clearTimeout(armT); bookDelPage(); } }, 'Delete');
  const top = el('div', { class: 'sx-book-top' }, el('span', { class: 'sx-book-pn', title: 'The page you are on (click a page to be on it): the keys here work on it' }, 'Page ' + ((b.at || 0) + 1) + ' of ' + n), el('span', { class: 'sx-gap' }),
    typeof stkTrayOpen === 'function' ? el('button', { type: 'button', class: 'sx-book-tb', title: 'Stickers: drag one onto a page', onclick: e => stkTrayOpen(e.currentTarget) }, 'Stickers') : null,
    el('button', { type: 'button', class: 'sx-book-tb', title: 'Put the page you are on back on the desk, beside the book', onclick: () => bookTakeOut() }, 'Take out'), del, close);
  const last = Math.min(n, s0 + step);
  const nav = el('div', { class: 'sx-book-nav' },
    el('button', { type: 'button', class: 'sx-book-turn', 'aria-label': 'The pages before', title: 'The pages before (←)', disabled: s0 <= 0 || null, onclick: () => bookGo(s0 - step) }, '‹'),
    el('span', {}, (last > s0 + 1 ? (s0 + 1) + '–' + last : String(s0 + 1)) + ' / ' + n),
    el('button', { type: 'button', class: 'sx-book-turn', 'aria-label': 'The next pages', title: 'The next pages (→)', disabled: s0 + step >= n || null, onclick: () => bookGo(s0 + step) }, '›'));
  bookSpread.classList.toggle('one', phone);
  bookSlots.forEach(s => {
    const p = pages[s0 + s.k];
    s.box.hidden = phone && s.k === 1;
    if (s.box.hidden) { bookLeave(s); s.box.replaceChildren(); return; }
    if (!p) { bookLeave(s); s.box.replaceChildren(el('div', { class: 'sx-pg-blank' }, el('button', { type: 'button', class: 'sx-book-add', title: 'A new page at the end', onclick: () => { b.at = n - 1; bookAdd('note'); } }, '+ New page'))); return; } // (the blank right-hand page at the end)
    if (fresh || p.id !== s.pgId || itemOf(p.id) !== s.pgIt) { // the page itself: its card, drawn as a sheet of the book's paper
      bookLeave(s);
      const c = p.type === 'tbl' ? tblCard(p) : paperCard(p); c.classList.add('sx-book-pg'); s.pgEl = c; s.pgId = p.id; s.pgIt = p; c._snap = cardSnap(p); els.set(p.id, c);
      s.box.replaceChildren(c); s.box.scrollTop = 0;
      if (dir && !stillUI()) s.box.animate([{ opacity: 0, transform: 'translateX(' + (dir * 18) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.2, .8, .2, 1)' });
    }
  });
  bookMain.replaceChildren(top, bookSpread, nav);
  bookHere();
}

/* ---------- changing a book: adding, moving, deleting, taking out ---------- */
async function bookAdd(kind, files, after) { // a new page just after page `after` (the one you're on, if not said)
  const b = bookOf(bookId); if (!b) return; bookPages(b);
  const at = Math.min((after != null && after >= 0 ? after : (b.at || 0)) + 1, b.pages.length), t = Date.now(), made = [];
  if (kind === 'photo') {
    if (!files) { const f = el('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true }); document.body.append(f); f.addEventListener('change', () => { const fs = [...f.files]; f.remove(); if (fs.length) bookAdd('photo', fs, after); }); f.click(); return; }
    let k = 0; for (const file of [...files].filter(x => /^image\//.test(x.type))) { try { const src = await shrinkPhoto(file), id = 'p' + t + '-' + k++; await PHOTOS.put(id, src); made.push({ id, type: 'photo', board: b.board, x: 0, y: 0, text: '', book: b.id }); } catch (e) { /* not a picture */ } }
    if (!made.length) return;
  } else if (kind === 'tbl') made.push({ id: 't' + t, type: 'tbl', board: b.board, x: 0, y: 0, rows: [['Item', 'Value'], ['', ''], ['', '']], view: 'table', w: 440, book: b.id, rcd: 1 });
  else made.push({ id: 'n' + t, type: 'note', board: b.board, x: 0, y: 0, text: '', book: b.id, rcd: 1 });
  deskMark(); B_().items.push(...made); b.pages.splice(at, 0, ...made.map(m => m.id));
  const turn = bookStart(at) !== bookStart(b.at || 0); b.at = at; save();
  bookSideDraw(); bookPageDraw(!turn, turn ? 1 : 0); deskSfx(kind === 'photo' ? 'shutter' : 'pin'); if (kind !== 'photo') setTimeout(bookWrite, 30);
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
const bookPageOf = n => { const c = n && n.closest && n.closest('.sx-book-view .sx-bcard[data-id]'), b = c && bookOf(bookId); return b ? b.pages.indexOf(c.dataset.id) : -1; };
{ const nc0 = noteChain; noteChain = function (t, ...a) { if (t && t.closest && t.closest('.sx-book-view')) { bookAdd('note', null, bookPageOf(t)); return; } return nc0.call(this, t, ...a); }; }
{ const fp0 = flowPhotos; flowPhotos = function (files, card, ...a) { if (card && card.closest && card.closest('.sx-book-view')) { bookAdd('photo', files, bookPageOf(card)); return 1; } return fp0.call(this, files, card, ...a); }; }
// the desk drawn again (Undo, a change elsewhere): the open book follows; its pages stay put (the desk doesn't take them)
{ const d0 = drawBoard; drawBoard = function (...a) {
    bookSlots.forEach(s => { if (s.pgEl && s.pgId) els.delete(s.pgId); });
    const r = d0.apply(this, a);
    if (bookId) { if (!bookOf(bookId)) { bookLeavePage(); bookId = null; bookView.hidden = true; }
      else { const same = bookSlots.every(s => s.box.hidden || !s.pgEl || (itemOf(s.pgId) === s.pgIt && s.pgEl._snap === cardSnap(s.pgIt)));
        if (same) bookSlots.forEach(s => { if (s.pgEl) els.set(s.pgId, s.pgEl); });
        bookSideDraw(); bookPageDraw(!same); } } // (a page whose stickers or paper changed is made again)
    return r; }; }
// the note tools (the right-click panel, Ctrl+B and the rest) work on the open book's page: they look for "the note you're
// on" through keepNote (js/notes.js asks it first), so the page answers there, picked or written in
{ const kn0 = keepNote; keepNote = function (...a) {
    if (!bookView.hidden) for (const s of bookSlots) {
      if (s.pgEl && s.pgId && !s.box.hidden && s.pgEl.classList.contains('sx-bnote') && (selId === s.pgId || s.pgEl.contains(document.activeElement))) {
        const it = itemOf(s.pgId), t = s.pgEl.querySelector('.sx-note-t'); if (it && t) return { c: s.pgEl, t, it };
      }
    }
    return kn0.apply(this, a); }; }
// the contents follow what you write
let bookNameT = 0; bookSpread.addEventListener('input', () => { clearTimeout(bookNameT); bookNameT = setTimeout(() => bookSlots.forEach(s => { const row = s.pgId && bookSide.querySelector('.sx-book-row[data-pid="' + s.pgId + '"] .sx-book-rown'), p = s.pgId && itemOf(s.pgId); if (row && p) row.textContent = bookName(p); }), 300); });
// a phone turned sideways (or a window made narrower): one page or two
if (window.matchMedia) matchMedia('(max-width: 700px)').addEventListener('change', () => { if (bookId && !bookView.hidden) bookDraw(true); });
// keys while it's open: ← → turn the pages, two at a time (not while writing), Esc closes (once the pen is down)
addEventListener('keydown', e => {
  if (!bookId || bookView.hidden || e.defaultPrevented || (typeof decoId !== 'undefined' && decoId) || (typeof stkTray !== 'undefined' && (!stkTray.hidden || stkCarry || !stkMenu.hidden))) return; // (the decorator and the stickers take Esc first)
  const a = document.activeElement, writing = a && (a.isContentEditable || (a.closest && a.closest('input, textarea, select')));
  if (e.key === 'Escape' && !writing) { e.preventDefault(); e.stopPropagation(); bookClose(); return; }
  if (writing || e.ctrlKey || e.metaKey || e.altKey) return;
  const b = bookOf(bookId); if (!b) return; const s0 = bookStart(b.at || 0), step = bookStep();
  if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); if (s0 + step < bookPages(b).length) bookGo(s0 + step); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); if (s0 > 0) bookGo(s0 - step); }
}, true);
