/* Cassette Timer: what each session is for, and what stayed with you. Before you press Play, write on the label what
   this session is for. At 00:00 a small card asks what you remember, from memory (the surest way to learn it). What you
   keep is collected behind Remembered, at the top left: open it to read them back, pin one to the desk, or let it go. */
'use strict';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
delete S.opts.recallPin; delete S.opts.shelfView; // (from when there was a shelf of tapes)
S.recalls = Array.isArray(S.recalls) ? S.recalls : []; // what you've kept: [{ id, at, about, text, notes: [note ids written in that session] }]

/* ---------- the label: what this session is for ---------- */
const intent = el('input', { class: 'sx-intent', type: 'text', maxlength: '80', placeholder: 'What is this session for?', 'aria-label': 'What this session is for', spellcheck: 'false' });
intent.value = S.intent || '';
intent.addEventListener('input', () => { S.intent = intent.value; save(); });
intent.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); intent.blur(); } });
corner.prepend(intent);
function intentDraw() { const lock = running && mode === 'focus'; intent.readOnly = lock; intent.classList.toggle('lock', lock); intent.classList.toggle('empty', !intent.value.trim()); intent.hidden = mode !== 'focus'; }
new MutationObserver(intentDraw).observe(root, { attributes: true, attributeFilter: ['data-clock', 'data-mode'] });

/* ---------- at 00:00 (or from Remembered): what do you remember? ---------- */
const recallTa = el('textarea', { class: 'sx-recall-t', rows: '4', maxlength: '1500', placeholder: 'From memory, no peeking...', 'aria-label': 'What you remember' });
const recallFor = el('small', { class: 'sx-recall-for' });
const recallKeep = el('button', { type: 'button', class: 'sx-ws-b', title: 'Keep it with the rest, under Remembered (Ctrl+Enter)', onclick: () => recallClose(true) }, 'Keep it');
const recallSkip = el('button', { type: 'button', class: 'sx-ws-b sx-quiet', title: 'Skip (Esc)', onclick: () => recallClose(false) }, 'Skip');
const recallCard = el('div', { class: 'sx-recall', hidden: true, role: 'dialog', 'aria-label': 'What do you remember?' },
  el('h3', {}, 'What do you remember?'), recallFor, recallTa,
  el('div', { class: 'sx-recall-b' }, el('small', { class: 'sl-muted' }, 'Kept under Remembered, top left'), el('span', { class: 'sx-gap' }), recallSkip, recallKeep));
document.body.append(recallCard);
let recallWhat = '', recallSince = 0;
function recallOpen(what, since) {
  memClose(); recallWhat = what || ''; recallSince = since || Date.now() - 3600e3; // (the notes written in since then are what you check against) recallFor.textContent = recallWhat ? 'About: ' + recallWhat : 'Write it the way you would explain it';
  recallTa.value = ''; recallCard.hidden = false; requestAnimationFrame(() => recallCard.classList.add('on'));
  setTimeout(() => recallTa.focus({ preventScroll: true }), 350);
}
function recallClose(keep) {
  recallCard.classList.remove('on'); recallCard.hidden = true;
  const txt = recallTa.value.trim(); if (!keep || !txt) return;
  const notes = S.board.items.filter(it => it.type === 'note' && (it.mt || 0) >= recallSince).sort((a, b) => b.mt - a.mt).slice(0, 8).map(it => it.id);
  const r = { id: 'r' + Date.now(), at: Date.now(), about: recallWhat, text: txt, notes }; S.recalls.push(r); save(); deskSfx('pin');
  if (notes.length) setTimeout(() => cmpOpen(r), 250); // check yourself: what you remembered, beside what you wrote
  memDraw(); if (!stillUI()) { memB.classList.remove('got'); void memB.offsetWidth; memB.classList.add('got'); } // (it drops into the key)
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

/* ---------- Remembered: everything you've kept, at the top left ---------- */
const memN = el('span', { class: 'sx-mem-n' });
const memB = deskBtn('Remembered', () => memList.hidden ? memOpen() : memClose(), 'sx-mem-b', 'What you remembered after your sessions');
memB.append(memN); memB.addEventListener('animationend', () => memB.classList.remove('got'));
deskKeys.before(memB);
const memList = el('div', { class: 'sx-mem', hidden: true, role: 'dialog', 'aria-label': 'Remembered' });
document.body.append(memList);
const memWhen = ts => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' · ' + new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
function memDraw() {
  memN.textContent = S.recalls.length ? String(S.recalls.length) : ''; memN.hidden = !S.recalls.length;
  if (memList.hidden) return;
  const list = S.recalls.slice().reverse().map(r => el('article', { class: 'sx-mem-i' },
    el('div', { class: 'sx-mem-h' }, el('b', {}, r.about || 'A session'), el('span', {}, memWhen(r.at))),
    el('p', {}, r.text),
    el('div', { class: 'sx-mem-a' },
      (r.notes || []).some(id => itemOf(id)) ? el('button', { type: 'button', class: 'sx-mem-ab', onclick: () => cmpOpen(r) }, 'Check') : null,
      el('button', { type: 'button', class: 'sx-mem-ab', onclick: () => { pinNote(r.about || 'What I remembered', r.text); deskToast('Pinned to the desk'); } }, 'Pin to desk'),
      armBtn('Let it go', 'Sure?', () => { S.recalls = S.recalls.filter(x => x !== r); save(); memDraw(); }, 'sx-mem-ab sx-mem-del'))));
  memList.replaceChildren(
    el('div', { class: 'sx-mem-top' }, el('h3', {}, 'Remembered'), el('span', { class: 'sx-gap' }), el('button', { type: 'button', class: 'sx-ws-b', title: 'Write one now', onclick: () => recallOpen((S.intent || '').trim()) }, '+ Write')),
    list.length ? el('div', { class: 'sx-mem-l' }, ...list) : el('p', { class: 'sl-muted sx-mem-empty' }, 'Nothing yet. When a session ends, write what you remember from memory and keep it: it collects here.'));
}
function memOpen() { recallClose(false); if (typeof tapesOpen === 'function' && !tapesDrawer.hidden) tapesOpen(null); memList.hidden = false; memB.classList.add('on'); memDraw(); requestAnimationFrame(() => memList.classList.add('on')); deskSfx('pick'); }
function memClose() { if (memList.hidden) return; memList.classList.remove('on'); memList.hidden = true; memB.classList.remove('on'); }
addEventListener('pointerdown', e => { if (!memList.hidden && !e.target.closest('.sx-mem, .sx-mem-b, .sx-recall')) memClose(); }, true);
addEventListener('keydown', e => { if (e.key === 'Escape' && !memList.hidden) { e.preventDefault(); e.stopPropagation(); memClose(); } }, true);
memDraw();

/* ---------- check yourself: what you remembered, beside the notes you wrote in that session ---------- */
const cmpBox = el('div', { class: 'sx-cmp', hidden: true, role: 'dialog', 'aria-label': 'Check yourself' });
document.body.append(cmpBox);
function cmpOpen(r) {
  memClose(); const notes = (r.notes || []).map(itemOf).filter(Boolean);
  const card = it => { const lines = String(it.text || '').split('\n').map(l => l.trim()).filter(Boolean);
    return el('article', { class: 'sx-cmp-n' }, el('b', {}, lines[0] || 'A note'), el('p', {}, lines.slice(1, 9).join('\n') || ' '),
      el('button', { type: 'button', class: 'sx-mem-ab', onclick: () => { cmpClose(); deskGoTo(it.id); } }, 'Go to note')); };
  cmpBox.replaceChildren(
    el('div', { class: 'sx-mem-top' }, el('h3', {}, 'Check yourself'), el('small', {}, r.about || ''), el('span', { class: 'sx-gap' }), el('button', { type: 'button', class: 'sx-ws-b', onclick: cmpClose }, 'Done')),
    el('div', { class: 'sx-cmp-cols' },
      el('section', {}, el('h4', {}, 'From memory'), el('p', { class: 'sx-cmp-mem' }, r.text)),
      el('section', {}, el('h4', {}, 'What you wrote'), ...(notes.length ? notes.map(card) : [el('p', { class: 'sl-muted' }, 'Those notes are no longer on the desk.')]))),
    el('p', { class: 'sx-cmp-tip' }, 'What did you miss? That is the part to go over again.'));
  cmpBox.hidden = false; requestAnimationFrame(() => cmpBox.classList.add('on')); deskSfx('pick');
}
function cmpClose() { cmpBox.classList.remove('on'); cmpBox.hidden = true; }
addEventListener('keydown', e => { if (e.key === 'Escape' && !cmpBox.hidden) { e.preventDefault(); e.stopPropagation(); cmpClose(); } }, true);

/* ---------- when a focus session ends: the label is cleared, and the question comes ---------- */
const finishLogBase = finish;
finish = function (quiet) {
  const was = mode, why = (S.intent || '').trim();
  finishLogBase.apply(this, arguments);
  if (was !== 'focus') return;
  S.intent = ''; intent.value = ''; intentDraw(); save();
  const since = Date.now() - (S.set.focus || 25) * 60e3 - 5 * 60e3; // (the session, and a little before it)
  if (!quiet && S.opts.recall !== false) setTimeout(() => recallOpen(why, since), 900); // after the chime
};

/* ---------- Settings ---------- */
{ const box = el('input', { type: 'checkbox', checked: S.opts.recall !== false || null }); box.addEventListener('change', () => { S.opts.recall = box.checked; save(); });
  settingsPane.append(sec('Learning', el('label', { class: 'sx-check' }, box, ' When a session ends, ask what I remember (written from memory, it sticks better)'))); }
intentDraw();
