/* Solarist: notes worth reading. A note on the desk is a small document: titles and headings, bold, italic, underline,
   strikethrough, a highlighter, inline code, bullet, numbered and check lists, quotes; eight paper colours, a text
   size, and a corner to drag it bigger. Select a note and its toolbar sits above it. Typing shortcuts work too:
   "# " a title, "## " a heading, "- " a list, "1. " a numbered list, "[] " a checklist, "> " a quote.
   Notes are saved as a small, cleaned subset of HTML (it.html); it.text keeps the plain words for tooltips. */
'use strict';

// paper colours from the palette: [key, paper, ink]
const NOTE_COLORS = [['yellow', '#ffd832', '#34111f'], ['cream', '#ffffe4', '#293b49'], ['peach', '#ffdaac', '#34111f'], ['amber', '#ffb762', '#34111f'],
  ['coral', '#ff6157', '#34111f'], ['mint', '#77d6c1', '#041528'], ['green', '#9cb93b', '#041528'], ['slate', '#293b49', '#ffffe4']];
const noteColor = it => NOTE_COLORS.find(c => c[0] === it.color) || NOTE_COLORS[0];
function noteStyle(it) {
  const [, bg, ink] = noteColor(it);
  return ';--note:' + bg + ';--ink:' + ink + ';--fs:' + (it.fs || 15) + 'px' + (it.w ? ';width:' + it.w + 'px' : '') + (it.h ? ';height:' + it.h + 'px' : '');
}

/* ---------- only the tags a note uses survive (pasting is plain text anyway) ---------- */
const NOTE_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'MARK', 'CODE', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'BR', 'DIV', 'P']);
function noteClean(html) {
  const t = document.createElement('template'); t.innerHTML = String(html || ''); // (a template's content is inert: nothing in it loads or runs)
  const walk = node => [...node.childNodes].forEach(n => {
    if (n.nodeType === 3) return;
    if (n.nodeType !== 1) { n.remove(); return; }
    walk(n);
    if (n.tagName === 'SPAN' && n.style) { // the browser sometimes writes bold as a styled span: keep the meaning as a real tag
      const st = n.style, tags = [];
      if (/^(bold|[6-9]00)$/.test(st.fontWeight)) tags.push('b'); if (st.fontStyle === 'italic') tags.push('i');
      if (/line-through/.test(st.textDecorationLine || st.textDecoration)) tags.push('s'); if (/underline/.test(st.textDecorationLine || st.textDecoration)) tags.push('u');
      if (tags.length) { let inner = [...n.childNodes]; tags.forEach(tg => { const w = document.createElement(tg); w.append(...inner); inner = [w]; }); n.replaceWith(...inner); return; }
    }
    if (!NOTE_TAGS.has(n.tagName)) { if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|SVG|IMG|VIDEO|AUDIO|TEMPLATE|LINK|META)$/i.test(n.tagName)) n.remove(); else n.replaceWith(...n.childNodes); return; }
    const keep = n.tagName === 'UL' && n.classList.contains('sx-chk') ? 'sx-chk' : n.tagName === 'LI' && n.classList.contains('done') ? 'done' : '';
    [...n.attributes].forEach(a => n.removeAttribute(a.name)); if (keep) n.className = keep;
  });
  walk(t.content); const d = document.createElement('div'); d.append(t.content); return d.innerHTML;
}
const noteFromText = s => { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML.replace(/\n/g, '<br>'); };

/* ---------- a note's body ---------- */
function noteSetup(it, txt, c) {
  txt.innerHTML = noteClean(it.html != null ? it.html : noteFromText(it.text));
  txt.addEventListener('input', e => {
    if (e.inputType === 'insertText' && e.data === ' ') Promise.resolve().then(() => { noteMarkdown(txt); it.html = txt.innerHTML.slice(0, 30000); save(); }); // (after the typing itself has finished: the browser runs one edit at a time)
    if (e.inputType === 'insertParagraph') { const li = noteClosest(txt, 'li'); if (li) li.classList.remove('done'); } // a new checklist line starts unticked
    it.html = txt.innerHTML.slice(0, 30000); it.text = txt.innerText.slice(0, 2000); save();
  });
  txt.addEventListener('paste', e => { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); });
  // ticking a checklist line: click its box
  txt.addEventListener('mousedown', e => { const li = e.target.closest('ul.sx-chk > li'); if (li && e.clientX - li.getBoundingClientRect().left < 22 * cam.z) e.preventDefault(); });
  txt.addEventListener('click', e => {
    const li = e.target.closest('ul.sx-chk > li'); if (!li || e.clientX - li.getBoundingClientRect().left >= 22 * cam.z) return;
    li.classList.toggle('done'); deskSfx('pin'); txt.dispatchEvent(new Event('input'));
  });
  c.append(el('span', { class: 'sx-resize', title: 'Drag to resize', 'aria-hidden': 'true' }));
  if (it.h) c.classList.add('sized');
}
// ticking a checklist box under the pointer (the desk calls this for a click on a note you weren't writing in)
function noteTickAt(txt, x, y) {
  const n = document.elementFromPoint(x, y), li = n && n.closest && n.closest('ul.sx-chk > li');
  if (!li || !txt.contains(li) || x - li.getBoundingClientRect().left >= 22 * cam.z) return false;
  deskMark(); li.classList.toggle('done'); deskSfx('pin'); txt.dispatchEvent(new Event('input')); return true;
}
function noteClosest(txt, sel) { const s = getSelection(); let n = s && s.anchorNode; if (!n) return null; if (n.nodeType === 3) n = n.parentNode; const hit = n.closest && n.closest(sel); return hit && txt.contains(hit) ? hit : null; }

/* ---------- the commands ---------- */
const selNote = () => { const c = selId && layer.querySelector('.sx-bnote[data-id="' + selId + '"]'); return c ? { c, t: c.querySelector('.sx-note-t'), it: B_().items.find(x => x.id === selId) } : null; };
function noteFocus(t) { // put the pen in the note (at the end) if it isn't there already
  if (t.contains(getSelection().anchorNode)) return;
  t.focus({ preventScroll: true }); const r = document.createRange(); r.selectNodeContents(t); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
}
function noteBlock(t, tag) { const cur = (document.queryCommandValue('formatBlock') || '').toLowerCase(); document.execCommand('formatBlock', false, cur === tag ? 'div' : tag); }
function noteCheck(t) {
  const ul = noteClosest(t, 'ul');
  if (ul && ul.classList.contains('sx-chk')) { document.execCommand('insertUnorderedList'); return; }
  if (!ul) document.execCommand('insertUnorderedList');
  const u2 = noteClosest(t, 'ul'); if (u2) u2.classList.add('sx-chk');
}
function noteInline(t, tag) { // the highlighter and inline code: wrap the selection, or unwrap it
  const s = getSelection(); if (!s.rangeCount) return;
  const on = noteClosest(t, tag); if (on) { on.replaceWith(...on.childNodes); return; }
  const r = s.getRangeAt(0); if (r.collapsed) return;
  const w = document.createElement(tag); w.append(r.extractContents()); r.insertNode(w);
  const r2 = document.createRange(); r2.selectNodeContents(w); s.removeAllRanges(); s.addRange(r2);
}
function noteClear(t) {
  document.execCommand('removeFormat'); document.execCommand('formatBlock', false, 'div');
  const r = getSelection().rangeCount ? getSelection().getRangeAt(0) : null;
  t.querySelectorAll('mark, code').forEach(n => { if (r && r.intersectsNode(n)) n.replaceWith(...n.childNodes); });
}
const NOTE_CMDS = {
  title: t => noteBlock(t, 'h2'), head: t => noteBlock(t, 'h3'),
  bold: () => document.execCommand('bold'), italic: () => document.execCommand('italic'), under: () => document.execCommand('underline'), strike: () => document.execCommand('strikeThrough'),
  mark: t => noteInline(t, 'mark'), code: t => noteInline(t, 'code'),
  bullet: () => document.execCommand('insertUnorderedList'), num: () => document.execCommand('insertOrderedList'), check: t => noteCheck(t), quote: t => noteBlock(t, 'blockquote'),
  clear: t => noteClear(t),
};
function noteRun(k) {
  const n = selNote(); if (!n) return;
  noteFocus(n.t); NOTE_CMDS[k](n.t); n.t.dispatchEvent(new Event('input')); noteBarState();
}
// typing shortcuts at the start of a line
function noteMarkdown(t) {
  const s = getSelection(), n = s.anchorNode; if (!n || n.nodeType !== 3) return;
  const before = n.data.slice(0, s.anchorOffset).replace(/ /g, ' ');
  const m = /^(##|#|[-*]|1\.|\[ ?\]|>) $/.exec(before); if (!m) return;
  let p = n; while (!p.previousSibling && p.parentNode !== t && !/^(DIV|P|LI|H2|H3|BLOCKQUOTE)$/.test(p.parentNode.nodeName)) p = p.parentNode;
  if (p.previousSibling && p.previousSibling.nodeName !== 'BR') return; // only at the very start of a line
  // format the line first (the browser needs something there to format), then take the typed marks off its start
  NOTE_CMDS[NOTE_MD[m[1]]](t);
  const blk = noteClosest(t, 'h2, h3, li, blockquote, div, p') || t, w = document.createTreeWalker(blk, NodeFilter.SHOW_TEXT); let tn = w.nextNode();
  while (tn && !tn.data.length) tn = w.nextNode();
  if (!tn) return;
  const cut = Math.min(m[0].length, tn.data.length), at = getSelection().anchorNode === tn ? Math.max(0, getSelection().anchorOffset - cut) : 0;
  tn.data = tn.data.slice(cut);
  const r = document.createRange(); r.setStart(tn, Math.min(at, tn.data.length)); r.collapse(true); getSelection().removeAllRanges(); getSelection().addRange(r);
  if (!tn.data.length && tn.parentNode && !tn.parentNode.querySelector('br')) tn.parentNode.append(document.createElement('br')); // an empty line keeps its height
}
const NOTE_MD = { '#': 'title', '##': 'head', '-': 'bullet', '*': 'bullet', '1.': 'num', '[]': 'check', '[ ]': 'check', '>': 'quote' };
// keys while writing (called from the desk's key handler in js/ui/board.js)
function noteKeys(e, t) {
  if (!t.classList.contains('sx-note-t')) return;
  const mod = e.ctrlKey || e.metaKey;
  const k = mod && e.shiftKey ? { KeyX: 'strike', KeyH: 'mark', Digit7: 'num', Digit8: 'bullet', Digit9: 'check', Period: 'quote' }[e.code]
    : mod && e.altKey ? { Digit1: 'title', Digit2: 'head', Digit0: 'clear' }[e.code] : mod && e.code === 'Backquote' ? 'code' : null;
  if (k) { e.preventDefault(); noteRun(k); return; }
  if (e.key === 'Tab' && noteClosest(t, 'li')) { e.preventDefault(); document.execCommand(e.shiftKey ? 'outdent' : 'indent'); t.dispatchEvent(new Event('input')); }
}

/* ---------- the toolbar above the selected note ---------- */
const fbtn = (k, label, title, cls) => el('button', { type: 'button', class: 'sx-fb' + (cls ? ' ' + cls : ''), 'data-k': k, title, 'aria-label': title }, label);
const noteBar = el('div', { class: 'sx-fmt', role: 'toolbar', 'aria-label': 'Format this note' },
  el('div', { class: 'sx-fmt-row' },
    fbtn('title', 'H1', 'Title (# then space, or Ctrl+Alt+1)'), fbtn('head', 'H2', 'Heading (## then space, or Ctrl+Alt+2)'),
    el('i', { class: 'sx-fsep' }),
    fbtn('bold', 'B', 'Bold (Ctrl+B)', 'b'), fbtn('italic', 'I', 'Italic (Ctrl+I)', 'i'), fbtn('under', 'U', 'Underline (Ctrl+U)', 'u'), fbtn('strike', 'S', 'Strikethrough (Ctrl+Shift+X)', 's'),
    fbtn('mark', 'Mark', 'Highlight (Ctrl+Shift+H)', 'mk'), fbtn('code', '</>', 'Code (Ctrl+`)'),
    el('i', { class: 'sx-fsep' }),
    fbtn('bullet', '•', 'Bullet list (- then space)'), fbtn('num', '1.', 'Numbered list (1. then space)'), fbtn('check', '☐', 'Checklist ([] then space)'), fbtn('quote', '❝', 'Quote (> then space)'),
    fbtn('clear', 'Tx', 'Clear formatting (Ctrl+Alt+0)')),
  el('div', { class: 'sx-fmt-row' },
    ...NOTE_COLORS.map(([k, bg]) => el('button', { type: 'button', class: 'sx-sw', 'data-c': k, title: k[0].toUpperCase() + k.slice(1), 'aria-label': k + ' paper', style: 'background:' + bg })),
    el('i', { class: 'sx-fsep' }),
    fbtn('smaller', 'A−', 'Smaller text'), fbtn('bigger', 'A+', 'Bigger text'), fbtn('fit', 'Fit', 'Fit the note to its words (drag the corner to size it yourself)')));
noteBar.addEventListener('mousedown', e => e.preventDefault()); // keep the pen (and the selection) in the note
noteBar.addEventListener('pointerdown', e => e.stopPropagation());
noteBar.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; const n = selNote(); if (!n) return;
  if (b.dataset.c || b.dataset.k === 'smaller' || b.dataset.k === 'bigger' || b.dataset.k === 'fit') deskMark();
  if (b.dataset.c) { n.it.color = b.dataset.c; if (b.dataset.c === 'yellow') delete n.it.color; n.c.setAttribute('style', n.c.getAttribute('style').replace(/;--note:[^;]*;--ink:[^;]*/, '') + ';--note:' + noteColor(n.it)[1] + ';--ink:' + noteColor(n.it)[2]); deskSfx('pick'); save(); noteBarState(); return; }
  const k = b.dataset.k;
  if (k === 'smaller' || k === 'bigger') { n.it.fs = Math.max(12, Math.min(26, (n.it.fs || 15) + (k === 'bigger' ? 1 : -1))); n.c.style.setProperty('--fs', n.it.fs + 'px'); save(); strUpdate(); return; }
  if (k === 'fit') { delete n.it.h; n.c.style.height = ''; n.c.classList.remove('sized'); save(); strUpdate(); return; }
  noteRun(k);
});
function noteBarState() { // light up what's on where the pen is
  const n = selNote(); if (!n) return;
  const inNote = n.t.contains(getSelection().anchorNode), q = c => { try { return inNote && document.queryCommandState(c); } catch (e) { return false; } };
  const blk = inNote ? (document.queryCommandValue('formatBlock') || '').toLowerCase() : '';
  const on = { title: blk === 'h2', head: blk === 'h3', quote: blk === 'blockquote', bold: q('bold'), italic: q('italic'), under: q('underline'), strike: q('strikeThrough'),
    mark: inNote && !!noteClosest(n.t, 'mark'), code: inNote && !!noteClosest(n.t, 'code'), num: q('insertOrderedList'),
    check: inNote && !!(noteClosest(n.t, 'ul') || { classList: { contains: () => false } }).classList.contains('sx-chk') };
  on.bullet = q('insertUnorderedList') && !on.check;
  noteBar.querySelectorAll('[data-k]').forEach(b => b.classList.toggle('on', !!on[b.dataset.k]));
  noteBar.querySelectorAll('[data-c]').forEach(b => b.classList.toggle('on', b.dataset.c === noteColor(n.it)[0]));
}
document.addEventListener('selectionchange', () => { if (noteBar.isConnected) noteBarState(); });
function noteBarTo(id) { // the toolbar follows the selected note
  const c = id && layer.querySelector('.sx-bnote[data-id="' + id + '"]');
  if (c) { if (noteBar.parentNode !== c) c.append(noteBar); noteBarState(); } else noteBar.remove();
}
