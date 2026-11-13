/* Cassette Timer: what each session was for, and what stayed with you. Before you press Play, write on the label what
   this session is for. At 00:00 a small card asks what you remember, from memory (the surest way to learn it), and
   both go on the tape as one track. A full cycle is one tape: when the long break starts, it goes on the Shelf (in the
   Tapes drawer), where its track listing and your notes stay to look back on. */
'use strict';

S.tapes = Array.isArray(S.tapes) ? S.tapes : [];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

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
const recallPin = el('input', { type: 'checkbox' }); recallPin.checked = !!S.opts.recallPin;
recallPin.addEventListener('change', () => { S.opts.recallPin = recallPin.checked; save(); });
const recallKeep = el('button', { type: 'button', class: 'sx-ws-b', title: 'Keep it (Ctrl+Enter)', onclick: () => recallClose(true) }, 'Keep it');
const recallSkip = el('button', { type: 'button', class: 'sx-ws-b sx-quiet', title: 'Skip (Esc)', onclick: () => recallClose(false) }, 'Skip');
const recallCard = el('div', { class: 'sx-recall', hidden: true, role: 'dialog', 'aria-label': 'What do you remember?' },
  el('h3', {}, 'What do you remember?'), recallFor, recallTa,
  el('div', { class: 'sx-recall-b' }, el('label', { class: 'sx-check' }, recallPin, ' Pin it to the desk too'), el('span', { class: 'sx-gap' }), recallSkip, recallKeep));
document.body.append(recallCard);
let recallEntry = null;
function recallOpen(entry) {
  recallEntry = entry; recallFor.textContent = entry.intent ? 'Track: ' + entry.intent : 'This session';
  recallTa.value = ''; recallCard.hidden = false; requestAnimationFrame(() => recallCard.classList.add('on'));
  setTimeout(() => recallTa.focus({ preventScroll: true }), 350);
}
function recallClose(keep) {
  const e = recallEntry; recallEntry = null; recallCard.classList.remove('on'); recallCard.hidden = true;
  const txt = recallTa.value.trim(); if (!keep || !e || !txt) return;
  e.recall = txt; save(); deskSfx('pin');
  if (recallPin.checked) pinNote(e.intent || 'What I remember', txt);
  deskToast('Kept on the tape'); if (!tapesDrawer.hidden) drawShelf();
}
recallTa.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); recallClose(true); }
  else if (e.key === 'Escape') { e.preventDefault(); recallClose(false); }
});
function pinNote(title, body) { // a note on the desk, near the middle of the view
  deskMark(); const p = freeSpot(), id = 'n' + Date.now();
  B_().items.push({ id, type: 'note', board: B_().cur, x: Math.round(p.x), y: Math.round(p.y), html: '<h2>' + esc(title) + '</h2>' + body.split('\n').map(l => '<div>' + (esc(l) || '<br>') + '</div>').join(''), text: title + '\n' + body });
  save(); drawBoard();
}

/* ---------- the tape: every focus session is a track, a cycle is a tape ---------- */
function tapeNow() { let t = S.tapes[S.tapes.length - 1]; if (!t || t.done) { t = { id: 't' + Date.now(), at: Date.now(), sessions: [] }; S.tapes.push(t); } return t; }
const finishLogBase = finish;
finish = function (quiet) {
  const was = mode, why = (S.intent || '').trim();
  finishLogBase.apply(this, arguments);
  if (was !== 'focus') return;
  const t = tapeNow(), e = { at: Date.now(), min: S.set.focus, intent: why, recall: '' }; t.sessions.push(e);
  S.intent = ''; intent.value = ''; intentDraw();
  if (mode === 'long') { t.done = true; setTimeout(() => deskToast('That tape is full. It is on your shelf now (Tapes)'), 1600); } // a cycle done: on the shelf
  save(); if (!tapesDrawer.hidden) drawShelf();
  if (!quiet && S.opts.recall !== false) setTimeout(() => recallOpen(e), 900); // after the chime
};

/* ---------- the Shelf ---------- */
const fmtDay = ts => new Date(ts).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtTime = ts => new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
let shelfOpenId = null;
function drawShelf() {
  const tapes = S.tapes.filter(t => t.sessions.length).slice().reverse();
  if (!tapes.length) { tapesShelf.replaceChildren(el('p', { class: 'sl-muted sx-shelf-empty' }, 'Nothing recorded yet. Every session you finish goes on a tape as a track, with what it was for and what you remembered. A full cycle is one tape on this shelf.')); return; }
  tapesShelf.replaceChildren(...tapes.map(t => {
    const mins = t.sessions.reduce((a, s) => a + (s.min || 0), 0), open = shelfOpenId === t.id;
    const title = (t.sessions.find(s => s.intent) || {}).intent || 'Untitled tape';
    const spine = el('button', { type: 'button', class: 'sx-spine' + (t.done ? '' : ' in') + (open ? ' open' : ''), 'aria-expanded': String(open), onclick: () => { shelfOpenId = open ? null : t.id; drawShelf(); } },
      el('span', { class: 'sx-spine-t' }, title), el('span', { class: 'sx-spine-m' }, fmtDay(t.at) + ' · ' + t.sessions.length + (t.sessions.length === 1 ? ' track · ' : ' tracks · ') + mins + ' min' + (t.done ? '' : ' · in the deck')));
    if (!open) return spine;
    const index = el('ol', { class: 'sx-index' }, ...t.sessions.map(s => el('li', {},
      el('div', { class: 'sx-index-h' }, el('b', {}, s.intent || 'Untitled'), el('span', {}, s.min + ':00 · ' + fmtTime(s.at))),
      s.recall ? el('p', {}, s.recall) : el('p', { class: 'sl-muted' }, 'Nothing written after this one.'))));
    const pin = el('button', { type: 'button', class: 'sx-ws-b', onclick: () => { pinNote(title + ' · ' + fmtDay(t.at), t.sessions.map((s, i) => (i + 1) + '. ' + (s.intent || 'Untitled') + (s.recall ? '\n' + s.recall : '')).join('\n')); deskToast('Pinned to the desk'); } }, 'Pin to the desk');
    const del = armBtn('Throw it away', 'Sure? Click again', () => { S.tapes = S.tapes.filter(x => x !== t); shelfOpenId = null; save(); drawShelf(); }, 'sx-ws-b sx-quiet');
    return el('div', { class: 'sx-tape-open' }, spine, el('div', { class: 'sx-index-side' }, 'Side A'), index, el('div', { class: 'sx-row' }, pin, del));
  }));
}

/* ---------- Settings ---------- */
{ const box = el('input', { type: 'checkbox', checked: S.opts.recall !== false || null }); box.addEventListener('change', () => { S.opts.recall = box.checked; save(); });
  settingsPane.append(sec('Learning', el('label', { class: 'sx-check' }, box, ' When a session ends, ask what I remember (written from memory, it sticks better)'))); }
intentDraw();
