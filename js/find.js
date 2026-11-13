/* Cassette Timer: finding things, and keeping them safe.
   Find (Ctrl+F, or Find in the bar): type a word and the camera flies to every note, caption and frame that has it, on
   any board, with the words lit up where they are. Enter goes to the next one, Shift+Enter back, Esc closes.
   The backup reminder: everything lives in this browser only, so once a week (never in the middle of a focus session)
   a small card asks to save a backup file. Settings, Backup turns it off and shows when the last one was saved. */
'use strict';

/* ---------- find ---------- */
const findIn = el('input', { type: 'search', class: 'sx-find-i', placeholder: 'Find on your boards', 'aria-label': 'Find on your boards', spellcheck: 'false', autocomplete: 'off' });
const findN = el('span', { class: 'sx-find-n', 'aria-live': 'polite' });
const findBtn = (label, title, fn) => el('button', { type: 'button', class: 'sx-find-b', title, 'aria-label': title, onclick: fn }, label);
const findBar = el('div', { class: 'sx-find', role: 'search', hidden: true }, findIn, findN,
  findBtn('↑', 'Previous (Shift+Enter)', () => findStep(-1)), findBtn('↓', 'Next (Enter)', () => findStep(1)), findBtn('×', 'Close (Esc)', () => findClose()));
document.body.append(findBar);
findBar.addEventListener('pointerdown', e => e.stopPropagation());

let findHits = [], findAt = -1, findQ = '', findT = 0;
const findHL = typeof Highlight === 'function' && window.CSS && CSS.highlights; // (the words are lit without touching the notes themselves)
function findWords(it) { // the plain words of a note, caption or frame name
  if (it.text) return String(it.text);
  if (it.html) { const t = document.createElement('template'); t.innerHTML = it.html; return t.content.textContent || ''; }
  return '';
}
function findRun() {
  const q = findIn.value.trim().toLowerCase(); findQ = q;
  if (!q) { findHits = []; findAt = -1; findDraw(); return; }
  const B = S.board, order = new Map(B.boards.map((b, i) => [b.id, b.id === B.cur ? -1 : i])); // this board first, then the others in order
  findHits = B.items.filter(it => (it.type === 'note' || it.type === 'photo' || it.type === 'frame') && findWords(it).toLowerCase().includes(q))
    .sort((a, b) => (order.get(a.board) - order.get(b.board)) || (a.y - b.y) || (a.x - b.x));
  findAt = findHits.length ? 0 : -1; findDraw(); if (findAt >= 0) findGo();
}
function findStep(d) { if (!findHits.length) return; findAt = (findAt + d + findHits.length) % findHits.length; findDraw(); findGo(); }
function findGo() { const it = findHits[findAt]; if (it && deskGoTo(it.id)) { deskSfx('pick'); findMark(); } }
function findDraw() {
  findN.textContent = !findQ ? '' : findHits.length ? (findAt + 1) + ' of ' + findHits.length : 'Not found';
  findBar.classList.toggle('none', !!findQ && !findHits.length);
  findMark();
}
function findMark() { // light up the words on this board; the one you're on, brighter
  if (!findHL) return; CSS.highlights.delete('sx-find'); CSS.highlights.delete('sx-find-now');
  if (!findQ || findBar.hidden) return;
  const all = new Highlight(), now = new Highlight(), cur = findHits[findAt];
  findHits.forEach(it => {
    const c = els.get(it.id); if (!c) return; const box = c.querySelector('.sx-note-t, .sx-cap-t, .sx-frame-t'); if (!box) return;
    const w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const s = n.data.toLowerCase(); let i = s.indexOf(findQ);
      while (i >= 0) { const r = new Range(); r.setStart(n, i); r.setEnd(n, i + findQ.length); (cur && cur.id === it.id ? now : all).add(r); i = s.indexOf(findQ, i + findQ.length); } }
  });
  CSS.highlights.set('sx-find', all); CSS.highlights.set('sx-find-now', now);
}
function findOpen() {
  findBar.hidden = false; requestAnimationFrame(() => findBar.classList.add('on'));
  findIn.focus(); findIn.select(); if (findIn.value.trim()) findRun();
}
function findClose() {
  findBar.classList.remove('on'); findBar.hidden = true; findIn.blur();
  if (findHL) { CSS.highlights.delete('sx-find'); CSS.highlights.delete('sx-find-now'); }
}
findIn.addEventListener('input', () => { clearTimeout(findT); findT = setTimeout(findRun, 220); }); // (it goes as you type, after a short pause)
findIn.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); clearTimeout(findT); if (findIn.value.trim().toLowerCase() !== findQ) findRun(); else findStep(e.shiftKey ? -1 : 1); }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); findClose(); }
});
// Ctrl+F opens it (pressed again while you're in it, the browser's own find opens instead)
addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || (e.key || '').toLowerCase() !== 'f' && e.code !== 'KeyF') return;
  if (!page.hidden || document.activeElement === findIn) return;
  e.preventDefault(); e.stopPropagation(); findOpen();
}, true);
// the lit words follow the notes: when the desk is drawn again, or you write
const drawBoardFind = drawBoard;
drawBoard = function () { drawBoardFind.apply(this, arguments); if (!findBar.hidden && findQ) requestAnimationFrame(findMark); };
{ let t = 0; document.addEventListener('input', e => { if (findBar.hidden || !findQ || e.target === findIn) return; clearTimeout(t); t = setTimeout(findMark, 300); }); }
// a key for it in the bar, beside Undo
{ const b = deskBtn('Find', () => findBar.hidden ? findOpen() : findClose(), 'sx-ws-findb', 'Find on your boards (Ctrl+F)'); undoB.parentNode.insertBefore(b, undoB); }

/* ---------- the backup reminder ---------- */
const BACKUP_DAY = 864e5;
if (!S.opts.backupSince) { S.opts.backupSince = Date.now(); save(); } // (a week from when you started, if you've never saved one)
const backupDeskExport = deskExportBackup;
deskExportBackup = async function () { await backupDeskExport.apply(this, arguments); S.opts.backupAt = Date.now(); delete S.opts.backupSnooze; save(); nudgeClose(); backupDraw(); };
const nudgeTxt = el('p', {});
const nudge = el('div', { class: 'sx-nudge', role: 'status', hidden: true },
  el('b', {}, 'Save a backup?'), nudgeTxt,
  el('div', { class: 'sx-row' }, el('button', { type: 'button', class: 'sx-ws-b sx-quiet', onclick: () => { S.opts.backupSnooze = Date.now() + 3 * BACKUP_DAY; save(); nudgeClose(); } }, 'Later'),
    el('button', { type: 'button', class: 'sx-ws-b', onclick: () => deskExportBackup() }, 'Save backup')));
document.body.append(nudge);
function nudgeClose() { nudge.classList.remove('on'); nudge.hidden = true; }
const backupAge = () => Math.floor((Date.now() - (S.opts.backupAt || S.opts.backupSince)) / BACKUP_DAY);
function backupCheck() {
  if (S.opts.backupNag === false || !nudge.hidden || (S.opts.backupSnooze || 0) > Date.now()) return;
  if (running && mode === 'focus') return; // never in the middle of focusing
  if (!S.board.items.some(it => it.type !== 'sticker') || backupAge() < 7) return;
  const d = backupAge();
  nudgeTxt.textContent = (S.opts.backupAt ? 'Your last backup was ' + d + ' days ago.' : 'You have not saved a backup yet.') + ' Your notes and photos live only in this browser, so a backup file keeps them safe if its data is ever cleared.';
  nudge.hidden = false; requestAnimationFrame(() => nudge.classList.add('on'));
}
setTimeout(backupCheck, 8000); setInterval(backupCheck, 30 * 60000);
new MutationObserver(() => { if (!(running && mode === 'focus')) setTimeout(backupCheck, 2500); }).observe(root, { attributes: true, attributeFilter: ['data-clock'] }); // (a break is a good moment)
// Settings: Backup
const backupWhen = el('p', { class: 'sl-muted' });
function backupDraw() { backupWhen.textContent = S.opts.backupAt ? 'Last backup: ' + (backupAge() ? backupAge() + (backupAge() === 1 ? ' day ago' : ' days ago') : 'today') + '.' : 'No backup saved yet.'; }
{ const box = el('input', { type: 'checkbox', checked: S.opts.backupNag !== false || null }); box.addEventListener('change', () => { S.opts.backupNag = box.checked; save(); });
  settingsPane.append(sec('Backup', el('label', { class: 'sx-check' }, box, ' Remind me once a week to save a backup (your desk lives only in this browser)'), backupWhen,
    el('div', { class: 'sx-row' }, el('button', { type: 'button', class: 'sx-ws-b', onclick: () => deskExportBackup() }, 'Save a backup now')))); }
backupDraw();
