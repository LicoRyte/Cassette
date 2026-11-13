/* Cassette Timer: Side B review. Your notes make the cards: a line "Q: ..." with "A: ..." on the next line is a card,
   and every {{word}} in braces is a card too (the line with that word blanked out). On a break, after "what do you
   remember?", the cassette offers a few cards, first the ones from notes you wrote in the session just finished.
   Enter shows the answer; then Again (left arrow) or Got it (right arrow). What you got comes back later and later
   (1, 3, 7, 14 days, then twice as long each time); what you missed comes back on your next break. That spacing,
   and answering from memory, are the two things that make learning stick. The Shelf shows how many are due. */
'use strict';

S.cards = S.cards && typeof S.cards === 'object' ? S.cards : {}; // what's been learned: { cardId: { due, ivl, n } }
const DAY = 86400000;
const cardHash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
function noteText(n) { // a note's words, a line at a time
  if (n.text) return n.text;
  const t = document.createElement('textarea'); t.innerHTML = String(n.html || '').replace(/<(br|\/div|\/p|\/li|\/h2|\/h3|\/blockquote)[^>]*>/gi, '\n').replace(/<[^>]+>/g, ''); return t.value;
}
function cardsFrom(n) {
  const lines = noteText(n).split('\n').map(l => l.trim()).filter(Boolean), out = [];
  const title = (lines[0] || 'A note').replace(/\{\{(.+?)\}\}/g, '$1').slice(0, 60);
  lines.forEach((l, i) => {
    const q = /^q\s*[:.)]\s*(.+)$/i.exec(l), a = lines[i + 1] && /^a\s*[:.)]\s*(.+)$/i.exec(lines[i + 1]);
    if (q && a) out.push({ front: q[1].trim(), back: a[1].trim() });
    [...l.matchAll(/\{\{(.+?)\}\}/g)].forEach(m => out.push({ front: l.replace(/\{\{(.+?)\}\}/g, (all, w, off) => off === m.index ? '[ ... ]' : w), back: m[1].trim(), cloze: true }));
  });
  return out.map(c => Object.assign(c, { id: 'c' + cardHash(n.id + '|' + c.front + '|' + c.back), note: n.id, title }));
}
const cardsAll = () => S.board.items.filter(i => i.type === 'note').flatMap(cardsFrom);
const cardDue = (c, now) => !S.cards[c.id] || S.cards[c.id].due <= now;
function cardsDue() { const now = Date.now(); return cardsAll().filter(c => cardDue(c, now)); }

/* ---------- picking a few for this break ---------- */
function reviewPick(limit) {
  const now = Date.now(), due = cardsAll().filter(c => cardDue(c, now)); if (!due.length) return [];
  const t = S.tapes && S.tapes[S.tapes.length - 1], last = t && t.sessions[t.sessions.length - 1];
  const from = last && now - last.at < 30 * 60000 ? last.at - (last.min || 25) * 60000 - 5 * 60000 : 0; // the session just finished
  const fresh = id => { const n = S.board.items.find(i => i.id === id); return from && n && n.mt >= from; };
  const score = c => (fresh(c.note) ? 0 : 1) * 10 + (S.cards[c.id] ? 0 : 1) + Math.random() * .5; // this session's first, then ones you've seen before, then new
  return due.sort((a, b) => score(a) - score(b)).slice(0, limit);
}

/* ---------- the review card ---------- */
const rvHead = el('span', { class: 'sx-rv-n' }), rvTitle = el('small', { class: 'sx-rv-from' });
const rvFront = el('p', { class: 'sx-rv-q' }), rvBack = el('p', { class: 'sx-rv-a', hidden: true });
const rvShow = el('button', { type: 'button', class: 'sx-ws-b', title: 'Show the answer (Enter)', onclick: () => reviewShow() }, 'Show answer');
const rvAgain = el('button', { type: 'button', class: 'sx-ws-b sx-quiet', title: 'Again: it comes back next break (left arrow)', onclick: () => reviewGrade(false), hidden: true }, 'Again');
const rvGot = el('button', { type: 'button', class: 'sx-ws-b', title: 'Got it: it comes back later (right arrow)', onclick: () => reviewGrade(true), hidden: true }, 'Got it');
const rvDone = el('button', { type: 'button', class: 'sx-rv-x', title: 'Done for now (Esc)', 'aria-label': 'Done for now', onclick: () => reviewClose() }, '×');
const rvCard = el('div', { class: 'sx-review', hidden: true, role: 'dialog', 'aria-label': 'Side B review' },
  el('div', { class: 'sx-rv-h' }, el('b', {}, 'Side B review'), rvHead, el('span', { class: 'sx-gap' }), rvDone),
  rvTitle, rvFront, rvBack, el('div', { class: 'sx-rv-b' }, el('span', { class: 'sx-gap' }), rvShow, rvAgain, rvGot));
document.body.append(rvCard);
let rvQueue = [], rvI = 0, rvGotN = 0;
function reviewStart(manual) {
  if (!manual && S.opts.review === false) return;
  rvQueue = reviewPick(manual ? 12 : (S.opts.reviewN || 4)); rvI = 0; rvGotN = 0;
  if (!rvQueue.length) { if (manual) deskToast('Nothing due. Write "Q: ..." and "A: ..." lines, or {{words}} in braces, in a note to make cards'); return; }
  if (!recallCard.hidden) return; // (after "what do you remember?")
  rvCard.hidden = false; requestAnimationFrame(() => rvCard.classList.add('on')); reviewDraw();
}
function reviewDraw() {
  const c = rvQueue[rvI];
  if (!c) { // the end
    rvHead.textContent = ''; rvTitle.textContent = ''; rvFront.textContent = rvGotN + ' of ' + rvQueue.length + ' remembered. That is all for now.'; rvBack.hidden = true;
    [rvShow, rvAgain, rvGot].forEach(b => { b.hidden = true; }); setTimeout(reviewClose, 1800); dueDraw(); return;
  }
  rvHead.textContent = (rvI + 1) + ' / ' + rvQueue.length; rvTitle.textContent = 'From: ' + c.title;
  rvFront.textContent = c.front; rvBack.textContent = c.back; rvBack.hidden = true;
  rvShow.hidden = false; rvAgain.hidden = rvGot.hidden = true; rvCard.classList.toggle('cloze', !!c.cloze);
}
function reviewShow() { if (rvCard.hidden || !rvQueue[rvI] || !rvBack.hidden) return; rvBack.hidden = false; rvShow.hidden = true; rvAgain.hidden = rvGot.hidden = false; deskSfx('pick'); }
function reviewGrade(got) {
  const c = rvQueue[rvI]; if (!c || rvBack.hidden) return;
  const s = S.cards[c.id] || { due: 0, ivl: 0, n: 0 }, now = Date.now();
  if (got) { s.n++; s.ivl = [0, 1, 3, 7, 14][s.n] || Math.min(120, Math.round(s.ivl * 2)); s.due = now + s.ivl * DAY; rvGotN++; deskSfx('pin'); }
  else { s.n = 0; s.ivl = 0; s.due = now + 10 * 60000; deskSfx('drop'); } // back on your next break
  S.cards[c.id] = s; save(); rvI++; reviewDraw();
}
function reviewClose() { rvCard.classList.remove('on'); rvCard.hidden = true; rvQueue = []; dueDraw(); }
addEventListener('keydown', e => {
  if (rvCard.hidden || e.ctrlKey || e.metaKey || e.altKey) return; const t = e.target; if (t && (t.isContentEditable || t.closest && t.closest('input, select, textarea'))) return;
  const k = e.key; if (!['Enter', 'ArrowLeft', 'ArrowRight', 'Escape'].includes(k)) return;
  e.preventDefault(); e.stopPropagation();
  if (k === 'Enter') reviewShow(); else if (k === 'ArrowLeft') reviewGrade(false); else if (k === 'ArrowRight') reviewGrade(true); else reviewClose();
}, true);

/* ---------- when it comes: on a break, after "what do you remember?" ---------- */
const recallCloseReview = recallClose;
recallClose = function () { recallCloseReview.apply(this, arguments); if (mode !== 'focus') setTimeout(() => reviewStart(false), 500); };
const finishReview = finish;
finish = function (quiet) { const was = mode; finishReview.apply(this, arguments); if (was === 'focus' && !quiet && S.opts.recall === false) setTimeout(() => reviewStart(false), 1400); };

/* ---------- how many are due: on the Tapes key, and on the Shelf ---------- */
function dueDraw() {
  const n = cardsDue().length; tapesB.textContent = n ? 'Tapes · ' + n : 'Tapes'; tapesB.title = (n ? n + ' cards due. ' : '') + 'Music and your shelf of tapes (T)';
  if (!tapesDrawer.hidden && tapesTab === 'shelf') drawShelf();
}
const drawShelfReview = drawShelf;
drawShelf = function () {
  drawShelfReview();
  const all = cardsAll(), due = all.filter(c => cardDue(c, Date.now())).length;
  tapesShelf.prepend(el('div', { class: 'sx-rv-row' },
    el('div', {}, el('b', {}, all.length ? due + ' to review' : 'No cards yet'), el('small', {}, all.length ? all.length + (all.length === 1 ? ' card' : ' cards') + ' from your notes' : 'Write "Q: ..." then "A: ..." in a note, or put {{words}} in braces')),
    all.length ? el('button', { type: 'button', class: 'sx-ws-b', disabled: !due || null, onclick: () => { tapesOpen(null); reviewStart(true); } }, 'Review now') : null));
};
setInterval(dueDraw, 60000); dueDraw();
{ let t = 0; document.addEventListener('input', e => { if (e.target.closest && e.target.closest('.sx-note-t')) { clearTimeout(t); t = setTimeout(dueDraw, 1500); } }); } // (new cards as you write them)

/* ---------- Settings, Learning ---------- */
{ const learn = [...settingsPane.querySelectorAll('.sx-sec')].find(s => (s.querySelector('h3') || {}).textContent === 'Learning');
  const box = el('input', { type: 'checkbox', checked: S.opts.review !== false || null }); box.addEventListener('change', () => { S.opts.review = box.checked; save(); });
  const n = el('select', { 'aria-label': 'Cards per break' }, [3, 4, 5, 6, 8].map(v => el('option', { value: v, selected: (S.opts.reviewN || 4) === v || null }, String(v)))); n.addEventListener('change', () => { S.opts.reviewN = +n.value; save(); });
  if (learn) learn.append(el('label', { class: 'sx-check' }, box, ' On breaks, review cards from my notes ("Q:" and "A:" lines, and {{words}} in braces):'), el('label', { class: 'sx-check sx-sub' }, n, ' cards each break')); }
