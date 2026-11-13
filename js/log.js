/* Cassette Timer: what each session is for, and what stayed with you. Before you press Play, write on the label what
   this session is for. At 00:00 a small card asks what you remember, from memory (the surest way to learn it); keep it
   and it's pinned to the desk as a note. */
'use strict';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
delete S.opts.recallPin; delete S.opts.shelfView; // (from when there was a shelf of tapes)

/* ---------- the label: what this session is for ---------- */
const intent = el('input', { class: 'sx-intent', type: 'text', maxlength: '80', placeholder: 'What is this session for?', 'aria-label': 'What this session is for', spellcheck: 'false' });
intent.value = S.intent || '';
intent.addEventListener('input', () => { S.intent = intent.value; save(); });
intent.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); intent.blur(); } });
corner.prepend(intent);
function intentDraw() { const lock = running && mode === 'focus'; intent.readOnly = lock; intent.classList.toggle('lock', lock); intent.classList.toggle('empty', !intent.value.trim()); intent.hidden = mode !== 'focus'; }
new MutationObserver(intentDraw).observe(root, { attributes: true, attributeFilter: ['data-clock', 'data-mode'] });

/* ---------- at 00:00: what do you remember? ---------- */
const recallTa = el('textarea', { class: 'sx-recall-t', rows: '4', maxlength: '1500', placeholder: 'From memory, no peeking...', 'aria-label': 'What you remember' });
const recallFor = el('small', { class: 'sx-recall-for' });
const recallKeep = el('button', { type: 'button', class: 'sx-ws-b', title: 'Pin it to the desk (Ctrl+Enter)', onclick: () => recallClose(true) }, 'Keep it');
const recallSkip = el('button', { type: 'button', class: 'sx-ws-b sx-quiet', title: 'Skip (Esc)', onclick: () => recallClose(false) }, 'Skip');
const recallCard = el('div', { class: 'sx-recall', hidden: true, role: 'dialog', 'aria-label': 'What do you remember?' },
  el('h3', {}, 'What do you remember?'), recallFor, recallTa,
  el('div', { class: 'sx-recall-b' }, el('small', { class: 'sl-muted' }, 'Kept as a note on the desk'), el('span', { class: 'sx-gap' }), recallSkip, recallKeep));
document.body.append(recallCard);
let recallWhat = '';
function recallOpen(what) {
  recallWhat = what || ''; recallFor.textContent = recallWhat ? 'This session: ' + recallWhat : 'This session';
  recallTa.value = ''; recallCard.hidden = false; requestAnimationFrame(() => recallCard.classList.add('on'));
  setTimeout(() => recallTa.focus({ preventScroll: true }), 350);
}
function recallClose(keep) {
  recallCard.classList.remove('on'); recallCard.hidden = true;
  const txt = recallTa.value.trim(); if (!keep || !txt) return;
  pinNote(recallWhat || 'What I remember', txt); deskSfx('pin'); deskToast('Pinned to the desk');
}
recallTa.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); recallClose(true); }
  else if (e.key === 'Escape') { e.preventDefault(); recallClose(false); }
});
function pinNote(title, body) { // a note on the desk, near the middle of the view
  deskMark(); const p = freeSpot(), id = 'n' + Date.now();
  B_().items.push({ id, type: 'note', board: B_().cur, mt: Date.now(), x: Math.round(p.x), y: Math.round(p.y), html: '<h2>' + esc(title) + '</h2>' + body.split('\n').map(l => '<div>' + (esc(l) || '<br>') + '</div>').join(''), text: title + '\n' + body });
  save(); drawBoard();
}

/* ---------- when a focus session ends: the label is cleared, and the question comes ---------- */
const finishLogBase = finish;
finish = function (quiet) {
  const was = mode, why = (S.intent || '').trim();
  finishLogBase.apply(this, arguments);
  if (was !== 'focus') return;
  S.intent = ''; intent.value = ''; intentDraw(); save();
  if (!quiet && S.opts.recall !== false) setTimeout(() => recallOpen(why), 900); // after the chime
};

/* ---------- Settings ---------- */
{ const box = el('input', { type: 'checkbox', checked: S.opts.recall !== false || null }); box.addEventListener('change', () => { S.opts.recall = box.checked; save(); });
  settingsPane.append(sec('Learning', el('label', { class: 'sx-check' }, box, ' When a session ends, ask what I remember (written from memory, it sticks better)'))); }
intentDraw();
