/* Cassette Timer: a note kept on screen. Alt+K (writing in a note, or with it picked), or Keep in a note's toolbar, keeps
   that note at the bottom of the screen on every board: a slim strip of its own paper showing its title and a few lines
   (it scrolls inside, so even a long note never covers the desk). Writing in the strip is writing in the note itself, and
   the other way round. Its header: Go to (the note, on whichever board it is), fold it to just its title, or let it go.
   One note at a time: keeping another one swaps it; Alt+K on the kept note lets it go. */
'use strict';

const keepT = el('div', { class: 'sx-keep-t', contenteditable: 'true', spellcheck: 'false', 'aria-label': 'The kept note', 'data-ph': 'Write something...' });
const keepTitle = el('b', { class: 'sx-keep-n' });
const keepBtn = (label, title, fn) => el('button', { type: 'button', class: 'sx-keep-b', title, 'aria-label': title, onclick: e => { e.stopPropagation(); fn(); } }, label);
const keepFoldB = keepBtn('–', 'Fold it to its title', () => { S.board.keepMin = !S.board.keepMin; save(); keepDraw(); });
const keepBox = el('section', { class: 'sx-keep', role: 'region', 'aria-label': 'Kept note', hidden: true },
  el('div', { class: 'sx-keep-h' }, el('i', { class: 'sx-keep-pin', 'aria-hidden': 'true' }), keepTitle, el('span', { class: 'sx-gap' }),
    keepBtn('Go to', 'Go to the note', () => { const id = S.board.keep; if (id) deskGoTo(id); }), keepFoldB,
    keepBtn('×', 'Stop keeping it on screen (Alt+K)', () => keepSet(null))),
  keepT);
document.body.append(keepBox);
keepBox.addEventListener('pointerdown', e => e.stopPropagation());
const keepItem = () => { const id = S.board.keep; return id ? S.board.items.find(x => x.id === id && x.type === 'note') || null : null; };

function keepSet(id) { // keep this note on screen (null: none)
  const was = S.board.keep; if (document.activeElement === keepT) keepT.blur(); // (writing in the strip: the pen comes out first)
  S.board.keep = id && id !== was ? id : null; if (!S.board.keep) delete S.board.keep;
  save(); keepDraw(true); deskSfx('pin'); if (typeof noteBarState === 'function') noteBarState(); setTimeout(keepPlace, 220);
  if (S.board.keep) deskToast('Kept on screen: it stays at the bottom, on every board (Alt+K lets it go)'); else if (was) deskToast('No longer kept on screen');
}
function keepToggle(id) { keepSet(S.board.keep === id ? null : id); }

function keepDraw(fresh) {
  const it = keepItem();
  if (!it) { keepBox.hidden = true; if (S.board.keep) { delete S.board.keep; save(); } return; }
  const [, bg, ink] = noteColor(it);
  keepBox.style.setProperty('--note', bg); keepBox.style.setProperty('--ink', ink);
  keepBox.classList.toggle('min', !!S.board.keepMin); keepFoldB.textContent = S.board.keepMin ? '+' : '–'; keepFoldB.title = S.board.keepMin ? 'Show its words' : 'Fold it to its title';
  const words = String(it.text || '').split('\n').map(l => l.trim()).filter(Boolean);
  keepTitle.textContent = words[0] || 'A note';
  if (fresh || document.activeElement !== keepT) { const h = noteClean(it.html != null ? it.html : noteFromText(it.text)); if (keepT.innerHTML !== h) keepT.innerHTML = h; }
  keepBox.hidden = false; keepPlace();
}
// it sits just above whatever is along the bottom: the note toolbar, the bar, or nothing
function keepPlace() {
  if (keepBox.hidden) return;
  let top = innerHeight - 14;
  document.querySelectorAll('.sx-ws-ctx, .sx-ws-ctx > .sx-fmt').forEach(e => { if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') return; const r = e.getBoundingClientRect(); if (r.height && r.top < top) top = r.top; });
  const b = Math.max(14, innerHeight - top + 10) + 'px'; if (keepBox.style.bottom !== b) keepBox.style.bottom = b;
}

// writing in the strip is writing in the note: the note's card follows, and so does what's saved
let keepMarked = false;
keepT.addEventListener('focus', () => { keepMarked = false; });
keepT.addEventListener('input', e => {
  const it = keepItem(); if (!it) return;
  if (!keepMarked) { keepMarked = true; deskMark(); } // (one Undo step for a stretch of writing)
  if (e.inputType === 'insertText' && e.data === ' ') Promise.resolve().then(() => { noteMarkdown(keepT); keepSync(it); });
  keepSync(it);
});
function keepSync(it) {
  it.html = keepT.innerHTML.slice(0, 30000); it.text = keepT.innerText.slice(0, 2000); it.mt = Date.now(); saveSoon();
  const c = els.get(it.id), t = c && c.querySelector('.sx-note-t'); if (t && document.activeElement !== t) t.innerHTML = it.html;
  const w = String(it.text || '').split('\n').map(l => l.trim()).filter(Boolean)[0]; keepTitle.textContent = w || 'A note';
}
keepT.addEventListener('paste', e => { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); });
keepT.addEventListener('mousedown', e => { const li = e.target.closest('ul.sx-chk > li'); if (li && e.clientX - li.getBoundingClientRect().left < 22) e.preventDefault(); });
keepT.addEventListener('click', e => { const li = e.target.closest('ul.sx-chk > li'); if (!li || e.clientX - li.getBoundingClientRect().left >= 22) return; li.classList.toggle('done'); deskSfx('pin'); keepT.dispatchEvent(new Event('input')); });
keepT.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); keepT.blur(); } }, true);
// and writing in the note's card shows in the strip
document.addEventListener('input', e => { const t = e.target; if (!t.matches || !t.matches('.sx-note-t') || t === keepT) return; const c = t.closest('.sx-bcard'); if (c && c.dataset.id === S.board.keep) keepDraw(); });

// Alt+K: keep the note you're writing in (or the picked one) on screen; on the kept one, let it go
addEventListener('keydown', e => {
  if (!e.altKey || e.ctrlKey || e.metaKey || e.code !== 'KeyK' || e.repeat) return;
  const a = document.activeElement, card = a && a.isContentEditable && a.matches('.sx-note-t') && a.closest('.sx-world .sx-bcard');
  let id = card ? card.dataset.id : null;
  if (!id) { const t = e.target; if (t && (t.isContentEditable || t.closest && t.closest('input, select, textarea')) || page && !page.hidden) return; const it = selId && picked.size === 1 && itemOf(selId); if (it && it.type === 'note') id = it.id; }
  if (a === keepT) id = S.board.keep;
  if (!id) return; e.preventDefault(); e.stopPropagation(); keepToggle(id);
}, true);

// kept up to date: when the desk is drawn again (Undo, a friend's card...), when what's picked changes, when the window changes size
{ const draw0 = drawBoard; drawBoard = function (...a) { const r = draw0.apply(this, a); keepDraw(); if (document.activeElement === keepT && typeof keepTools === 'function') keepTools(); return r; }; } // (writing in the strip: the toolbar stays on it)
{ const sel0 = select; select = function (...a) { const r = sel0.apply(this, a); if (document.activeElement === keepT && typeof keepTools === 'function') keepTools(); keepPlace(); requestAnimationFrame(keepPlace); setTimeout(keepPlace, 220); return r; }; } // (again once the bar has settled)
addEventListener('resize', keepPlace);
keepDraw(true);

/* ---------- the note toolbar works on the strip too: it comes up over the strip while you write in it, and every button
   and shortcut (bold, headings, lists, paper colour, text size...) goes to the kept note ---------- */
const keepOn = () => document.activeElement === keepT || noteBar.parentNode === keepBox && keepBox.contains(document.activeElement);
function keepNote() { // the kept note, for the toolbar, while the strip is being written in
  if (!keepOn()) return null; const it = keepItem(); if (!it) return null;
  return { c: els.get(it.id) || keepBox, t: keepT, it };
}
function keepTools() { if (noteBar.parentNode !== keepBox) { keepBox.insertBefore(noteBar, keepT); keepBox.classList.add('tools'); } noteBarState(); }
keepT.addEventListener('focus', keepTools);
keepT.addEventListener('pointerdown', () => setTimeout(keepTools, 0));
document.addEventListener('selectionchange', () => { const n = getSelection().anchorNode; if (n && keepT.contains(n) && noteBar.parentNode !== keepBox) keepTools(); }); // (however the pen got there)
keepT.addEventListener('blur', () => setTimeout(() => { if (document.activeElement === keepT) return; keepBox.classList.remove('tools'); if (noteBar.parentNode === keepBox) { noteBar.remove(); noteBarTo(selId); } keepPlace(); }, 0));
// a button that changes the note's paper or its size: the card on the desk is drawn again to match, and so is the strip
noteBar.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || noteBar.parentNode !== keepBox) return;
  if (b.dataset.c || b.dataset.k === 'smaller' || b.dataset.k === 'bigger') { const it = keepItem(); if (it && els.has(it.id)) drawBoard(); keepDraw(); keepT.focus({ preventScroll: true }); }
});
