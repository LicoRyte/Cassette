/* Cassie: writing on paper should feel like a typewriter. In a note (or a caption):
   - the space bar has a deeper thunk than the letters (and every letter's click is a little different)
   - the note eases taller (or shorter) as lines come and go, instead of jumping
   - "--" becomes an em dash, "->" an arrow, and straight quotes curl the right way
   - each new letter settles from light to full ink, and the note gives a typewriter's small sideways knock
   - the typing shortcuts (# - [] >) ease the line into its new style; a ticked box gets a drawn line, a soft tick, a
     done/total count in the note's corner, and a warm glow when the last one is ticked
   (the ink-coloured selection and no spellcheck squiggles are in style.css and js/desk.js) */
'use strict';

const typePaper = t => t && t.closest && t.closest('.sx-world .sx-bcard') && t.closest('.sx-note-t, .sx-cap-t');

// the sounds: a thunk for the space bar
DESK_SFX.space = c => { const t = c.currentTime; feelBurst(c, t, { dur: .03, type: 'lowpass', f0: 900 + Math.random() * 200, vol: .05 }); feelTone(c, t, 105 + Math.random() * 12, { dur: .06, vol: .022, to: 70 }); };
// every letter a little different: pitch and weight wander
DESK_SFX.key = c => { const t = c.currentTime, w = .8 + Math.random() * .45; feelBurst(c, t, { dur: .014 + Math.random() * .01, type: 'highpass', f0: 1600 + Math.random() * 1100, vol: .025 * w }); feelTone(c, t, 160 + Math.random() * 80, { dur: .03, vol: .012 * w, to: 110 + Math.random() * 20 }); };

// (on the window, so it comes before js/feel.js's letter click and can stand in for it)
// a letter only marks the note; what needs measuring (the note's height) is done once a frame,
// just before it's drawn, instead of the browser measuring the page several times for every key
let typeBox = null, typeRaf = 0, typeInkBox = null;
addEventListener('input', e => {
  const box = typePaper(e.target); if (!box) return;
  if (e.inputType === 'insertText') {
    if (e.data === ' ') { deskSfx('space'); deskSfxLast.key = performance.now(); } // the space bar thunks instead of clicking
  }
  typeBox = box; if (!typeRaf) typeRaf = requestAnimationFrame(typeFrame);
}, true);
function typeFrame() {
  typeRaf = 0; const box = typeBox; typeBox = null; if (!box || !box.isConnected) return;
  const card = box.closest('.sx-bcard'), still = stillUI();
  // read everything first...
  const grow = card.classList.contains('sx-bnote') && !card.classList.contains('sized');
  if (grow && card._hA) { card._hA.cancel(); card._hA = null; } // (measure the real height, not one mid-animation)
  const h = grow ? card.offsetHeight : 0;
  // ...then change things
  if (grow) { const was = card._h; card._h = h; // the note eases to its new height as lines come and go
    if (was && was !== h && Math.abs(h - was) <= 240 && !still) { card._hA = card.animate([{ height: was + 'px' }, { height: h + 'px' }], { duration: 160, easing: 'cubic-bezier(.3, .9, .4, 1)' }); card._hA.onfinish = () => { card._hA = null; }; } }
  if (typeof flowAfterType === 'function') flowAfterType(box); // the caret and the view (js/flow.js)
  if (typeInkBox) { const b = typeInkBox; typeInkBox = null; if (b.isConnected) typeInk(b); } // (the new letter's ink, measured now: the page is laid out for this frame already)
}
document.addEventListener('focusin', e => { const b = typePaper(e.target); if (b) { const c = b.closest('.sx-bcard'); c._h = c.offsetHeight; } });

// smart punctuation: -- to —, -> to →, and curly quotes (not inside code)
function typeSmart(box) {
  const s = getSelection(); if (!s.rangeCount || !s.isCollapsed) return; const n = s.anchorNode, o = s.anchorOffset;
  if (!n || n.nodeType !== 3 || !box.contains(n) || (n.parentElement && n.parentElement.closest('code'))) return;
  const before = n.data.slice(0, o), last2 = before.slice(-2), last = before.slice(-1), prev = before.slice(-2, -1);
  const swap = (len, txt) => { const r = document.createRange(); r.setStart(n, o - len); r.setEnd(n, o); s.removeAllRanges(); s.addRange(r); document.execCommand('insertText', false, txt); };
  if (last2 === '--') swap(2, '—');
  else if (last2 === '->') swap(2, '→');
  else if (last === '"') swap(1, !prev || /[\s(\[{— ]/.test(prev) ? '“' : '”');
  else if (last === "'") swap(1, !prev || /[\s(\[{— ]/.test(prev) ? '‘' : '’');
}
document.addEventListener('input', e => {
  const box = typePaper(e.target); if (!box || e.inputType !== 'insertText' || !/^[-">']$/.test(e.data || '')) return;
  Promise.resolve().then(() => typeSmart(box)); // (after the typing itself has finished)
});

/* ---------- more feel while you write: ink that settles, a typewriter's jolt, shortcuts that grow into place, and
   checklists that answer back ---------- */
// ink that settles: each new letter shows a moment lighter, then darkens to full ink (a wash of the paper's own colour
// over it fades away, so the words themselves are never touched)
function typeInk(box) {
  const s = getSelection(); if (!s.rangeCount || !s.isCollapsed) return; const n = s.anchorNode, o = s.anchorOffset;
  if (!n || n.nodeType !== 3 || o < 1 || /\s/.test(n.data[o - 1])) return;
  const r = document.createRange(); r.setStart(n, o - 1); r.setEnd(n, o); const rc = r.getBoundingClientRect(); if (!rc.width) return;
  const card = box.closest('.sx-bcard'), bg = getComputedStyle(card).backgroundColor;
  const v = el('i', { class: 'sx-ink', 'aria-hidden': 'true' });
  v.style.cssText = 'left:' + rc.left + 'px;top:' + rc.top + 'px;width:' + (rc.width + 1) + 'px;height:' + rc.height + 'px;background:' + bg;
  document.body.append(v); v.animate([{ opacity: .62 }, { opacity: 0 }], { duration: 170, easing: 'ease-out' }).onfinish = () => v.remove();
}
// the typewriter's jolt: the note you're writing in gives a small sideways knock with each letter
// (a style the browser takes up with the frame it draws anyway; an animation started here would have it recalculate the
// whole desk on the spot, which slowed typing on a big board)
function typeJolt(card) {
  const k = .7 + Math.random() * .5; card.classList.add('jolt');
  card.style.translate = (1.1 * k).toFixed(2) + 'px 0';
  clearTimeout(card._jt); card._jt = setTimeout(() => { card.style.translate = ''; card._jt = setTimeout(() => card.classList.remove('jolt'), 120); }, 45);
}
addEventListener('input', e => {
  const box = typePaper(e.target); if (!box || e.inputType !== 'insertText' || stillUI()) return;
  typeInkBox = box; if (!typeRaf) typeRaf = requestAnimationFrame(typeFrame); // (once the letter is in, with the frame: measuring it now would lay the whole desk out twice)
  const card = box.closest('.sx-bnote'); if (card) typeJolt(card);
}, true);

// shortcuts that grow into place: # becoming a title, - a bullet, [] a box, > a quote; the line eases into its new self
function typeBlockAt() { const s = getSelection(); let n = s && s.anchorNode; if (!n) return null; if (n.nodeType === 3) n = n.parentNode; return n.closest ? n.closest('h2, h3, li, blockquote, div, p') : null; }
{ const md0 = noteMarkdown; noteMarkdown = function (t, ...a) {
    const b0 = typeBlockAt(), tag0 = b0 && b0.tagName, r = md0.call(this, t, ...a), b1 = typeBlockAt();
    if (b1 && t.contains(b1) && b1 !== t && (b1 !== b0 || b1.tagName !== tag0) && !stillUI()) {
      const big = /^H[23]$/.test(b1.tagName); b1.style.transformOrigin = '0 70%';
      b1.animate([{ opacity: .3, transform: 'translateY(3px) scale(' + (big ? .82 : .96) + ')' }, { opacity: 1, transform: 'none' }], { duration: big ? 260 : 200, easing: 'cubic-bezier(.2, .9, .3, 1.25)' });
    }
    return r; }; }

// checklists: a soft tick (and a lower tock when you take one back); how many are done, in the note's corner; and the
// whole note glows warm for a moment when the last box is ticked
DESK_SFX.check = c => { const t = c.currentTime; feelBurst(c, t, { dur: .012, type: 'highpass', f0: 3000, vol: .03 }); feelTone(c, t, 1180, { dur: .08, vol: .02, to: 1560 }); };
DESK_SFX.uncheck = c => { const t = c.currentTime; feelBurst(c, t, { dur: .012, type: 'highpass', f0: 2200, vol: .022 }); feelTone(c, t, 900, { dur: .07, vol: .014, to: 700 }); };
DESK_SFX.alldone = c => { const t = c.currentTime; [880, 1175, 1568].forEach((f, i) => feelTone(c, t + i * .07, f, { dur: .22, vol: .018 })); };
function typeChecks(card) {
  if (!card) return null;
  const lis = card.querySelectorAll('.sx-note-t ul.sx-chk > li'), done = [...lis].filter(li => li.classList.contains('done')).length;
  let b = card.querySelector(':scope > .sx-chk-n');
  if (!lis.length) { if (b) b.remove(); return null; }
  if (!b) { b = el('span', { class: 'sx-chk-n', 'aria-hidden': 'true' }); card.append(b); }
  const txt = done + '/' + lis.length; if (b.textContent !== txt) b.textContent = txt; b.classList.toggle('all', done === lis.length);
  return { done, all: lis.length };
}
{ const ns0 = noteSetup; noteSetup = function (it, txt, c) { ns0(it, txt, c); typeChecks(c); }; }
document.addEventListener('input', e => { const c = e.target.closest && e.target.closest('.sx-world .sx-bnote'); if (c) typeChecks(c); });
{ const tick0 = noteTickAt; noteTickAt = function (txt, x, y) {
    const card = txt.closest('.sx-bnote'), before = typeChecks(card), r = tick0(txt, x, y); if (!r) return r;
    const after = typeChecks(card), allNow = after && after.done === after.all, was = before && before.done === before.all;
    if (allNow && !was && after.all > 1) { deskSfx('alldone'); if (!stillUI()) card.animate([{ boxShadow: '0 0 0 0 rgb(255 183 98 / 0)' }, { boxShadow: '0 0 0 10px rgb(255 183 98 / .55)', offset: .35 }, { boxShadow: '0 0 0 18px rgb(255 183 98 / 0)' }], { duration: 700, easing: 'ease-out' }); }
    return r; }; }
