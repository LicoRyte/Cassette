/* Cassette Timer: writing on paper should feel like a typewriter. In a note (or a caption, or a label's name):
   - each key strikes the paper: it gives a tiny nudge down and back
   - the space bar has a deeper thunk than the letters (and every letter's click is a little different)
   - near the right margin a soft bell rings, once a line, like a typewriter warning you
   - the note eases taller (or shorter) as lines come and go, instead of jumping
   - "--" becomes an em dash, "->" an arrow, and straight quotes curl the right way
   (the ink-coloured selection and no spellcheck squiggles are in style.css and js/desk.js) */
'use strict';

const typePaper = t => t && t.closest && t.closest('.sx-world .sx-bcard') && t.closest('.sx-note-t, .sx-cap-t, .sx-frame-t');

// the sounds: a thunk for the space bar, and the margin bell
DESK_SFX.space = c => { const t = c.currentTime; feelBurst(c, t, { dur: .03, type: 'lowpass', f0: 900 + Math.random() * 200, vol: .05 }); feelTone(c, t, 105 + Math.random() * 12, { dur: .06, vol: .022, to: 70 }); };
DESK_SFX.bell = c => { const t = c.currentTime; feelTone(c, t, 2093, { dur: .7, vol: .02, attack: .003 }); feelTone(c, t, 4186, { dur: .35, vol: .006, attack: .003 }); feelTone(c, t, 3136, { dur: .2, vol: .004, attack: .003 }); };
// every letter a little different: pitch and weight wander
DESK_SFX.key = c => { const t = c.currentTime, w = .8 + Math.random() * .45; feelBurst(c, t, { dur: .014 + Math.random() * .01, type: 'highpass', f0: 1600 + Math.random() * 1100, vol: .025 * w }); feelTone(c, t, 160 + Math.random() * 80, { dur: .03, vol: .012 * w, to: 110 + Math.random() * 20 }); };

// (on the window, so it comes before js/feel.js's letter click and can stand in for it)
addEventListener('input', e => {
  const box = typePaper(e.target); if (!box || e.inputType !== 'insertText') return;
  const card = box.closest('.sx-bcard');
  // the space bar thunks instead of clicking
  if (e.data === ' ') { deskSfx('space'); deskSfxLast.key = performance.now(); }
  if (stillUI()) return;
  // the key strikes the paper
  card.animate([{ translate: '0 0' }, { translate: '0 1.2px' }, { translate: '0 0' }], { duration: 90, easing: 'ease-out' });
  // the margin bell: once a line, when the caret comes close to the right edge
  const s = getSelection(); if (!s.rangeCount) return;
  const r = s.getRangeAt(0).getClientRects()[0]; if (!r) return;
  const bb = box.getBoundingClientRect(), edge = bb.right, fs = parseFloat(getComputedStyle(box).fontSize) || 15, line = Math.round((r.top - bb.top) / (fs * cam.z * .8));
  if (box._bellLine !== line && edge - r.right < fs * 2.6 * cam.z) { box._bellLine = line; deskSfx('bell'); }
}, true);

// the note eases to its new height as lines come and go
document.addEventListener('focusin', e => { const b = typePaper(e.target); if (b) { const c = b.closest('.sx-bcard'); c._h = c.offsetHeight; } });
document.addEventListener('input', e => {
  const box = typePaper(e.target); if (!box) return;
  const c = box.closest('.sx-bcard'); if (c.classList.contains('sized') || !c.classList.contains('sx-bnote')) return;
  if (c._hA) { c._hA.cancel(); c._hA = null; } // (measure the real height, not one mid-animation)
  const h = c.offsetHeight, was = c._h; c._h = h;
  if (!was || was === h || Math.abs(h - was) > 240 || stillUI()) return; // (a big paste just arrives)
  c._hA = c.animate([{ height: was + 'px' }, { height: h + 'px' }], { duration: 160, easing: 'cubic-bezier(.3, .9, .4, 1)' });
  c._hA.onfinish = () => { c._hA = null; };
});

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
