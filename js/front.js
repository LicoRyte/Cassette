/* Cassie: the front page. It opens when Cassie starts: the name and the workspaces.
   Continue goes back into the one you were in (Enter); the others are listed under it (click to open; rename, back up or
   delete from the row). New workspace starts an empty one, and Load a backup makes a backup file a workspace of its own;
   neither touches the others. Boards ▸ Front page brings it back. It loads early (after js/state.js) so its keys come
   first: while it's open, nothing reaches the desk. */
'use strict';

const front = el('div', { class: 'cz-front', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Cassie', hidden: true });
const frontMain = el('div', { class: 'cz-main' });
let frontOn = false;


// the little cassette by the name
function frontLogo() {
  const s = el('span', { class: 'cz-logo', 'aria-hidden': 'true' });
  s.innerHTML = '<svg viewBox="0 0 64 42" width="64" height="42"><rect x="1.5" y="1.5" width="61" height="39" rx="4" fill="currentColor" opacity=".14" stroke="currentColor" stroke-width="2"/>' +
    '<rect x="11" y="9" width="42" height="16" rx="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="20" cy="17" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/>' +
    '<circle cx="44" cy="17" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 40.5l3-8h26l3 8" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  return s;
}

// a workspace as the page shows it: the open one counted from its desk, the others from what was noted when they were saved
const frontWork = () => { const B = S.board || {}, items = Array.isArray(B.items) ? B.items : [];
  const loose = items.filter(i => !i.book); // (a book's pages are inside it)
  return { name: B.name || 'My workspace', boards: Array.isArray(B.boards) ? B.boards.length : 1, notes: loose.filter(i => i.type === 'note').length, books: loose.filter(i => i.type === 'book').length, things: loose.length, backed: +B.backedAt || 0 }; };
const frontMeta = w => w.id === S.spaceCur ? frontWork() : { name: w.name || 'Workspace', boards: w.boards || 1, notes: w.notes || 0, books: w.books || 0, things: w.things || 0, backed: +w.backedAt || 0, opened: +w.opened || 0 };
const frontOthers = () => S.spaces.filter(w => w.id !== S.spaceCur).sort((a, b) => (b.opened || 0) - (a.opened || 0));
const frontHas = () => { const w = frontWork(); return w.things > 0 || w.boards > 1 || S.spaces.length > 1; };
const frontPl = (n, one) => n + ' ' + one + (n === 1 ? '' : 's');
function frontAgo(t) { const d = Math.floor((Date.now() - t) / 864e5); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d + ' days ago'; }
const frontLate = w => !w.backed || Date.now() - w.backed > 14 * 864e5;
const frontStat = w => { const books = w.books || 0, rest = w.things - w.notes - books; return frontPl(w.boards, 'board') + (books ? ' · ' + frontPl(books, 'book') : '') + ' · ' + frontPl(w.notes, 'note') + (rest > 0 ? ' · ' + frontPl(rest, 'other thing') : ''); };
const frontBk = w => w.backed ? 'backed up ' + frontAgo(w.backed) : 'never backed up';

const frontBtn = (label, cls, fn, title) => el('button', { type: 'button', class: 'cz-btn' + (cls ? ' ' + cls : ''), onclick: fn, title: title || null }, label);
let frontFind = '';
function frontDraw() {
  const w = frontWork(), has = frontHas(), others = frontOthers();
  const head = [frontLogo(), el('h1', { class: 'cz-title' }, 'Cassie'), el('p', { class: 'cz-tag' }, 'A tape-deck timer, and a desk for your notes.')];
  const cont = has && el('button', { type: 'button', class: 'cz-cont', onclick: () => frontClose() },
    el('i', { class: 'cz-fpin' }),
    el('span', { class: 'cz-k' }, 'Continue', el('kbd', {}, 'Enter')),
    el('b', { class: 'cz-name' }, w.name),
    el('span', { class: 'cz-stat' }, frontStat(w)),
    el('span', { class: 'cz-bk' + (frontLate(w) ? ' late' : '') }, w.backed ? 'Backed up ' + frontAgo(w.backed) : 'Never backed up'));
  const row = el('div', { class: 'cz-row' }, frontBtn('New workspace', has ? '' : 'main', () => frontAsk('new')), frontBtn('Load a backup…', '', () => deskImportBackup(true), 'A backup file becomes a workspace of its own'));
  const list = others.length ? frontList(others) : null;
  const safe = el('p', { class: 'cz-safe' + (has && frontLate(w) ? ' late' : '') }, (S.spaces.length > 1 ? 'Your workspaces live' : 'Your workspace lives') + ' in this browser. Save backups now and then.',
    has ? el('span', { class: 'cz-links' }, el('button', { type: 'button', class: 'cz-link', onclick: async () => { await deskExportBackup(); frontDraw(); focusFirst(); } }, 'Save a backup of ' + w.name),
      el('button', { type: 'button', class: 'cz-link', onclick: () => frontAsk('rename') }, 'Rename it'),
      S.spaces.length > 1 ? el('button', { type: 'button', class: 'cz-link', title: 'Every workspace, in one file', onclick: async () => { await deskExportAll(); frontDraw(); focusFirst(); } }, 'Save a backup of everything') : null) : null);
  const use = el('p', { class: 'cz-use' }); frontUse(use);
  frontMain.replaceChildren(...head, ...[cont, row, list, safe, use].filter(Boolean));
}
// the other workspaces: click one to open it; its keys (rename, backup, delete) show when you point at it
function frontList(others) {
  const box = el('div', { class: 'cz-list' }), rows = el('ul', { class: 'cz-ws-list' });
  const fill = () => {
    const q = frontFind.trim().toLowerCase(), shown = others.filter(o => !q || (o.name || '').toLowerCase().includes(q));
    rows.replaceChildren(...shown.map(frontRow)); if (!shown.length) rows.append(el('li', { class: 'cz-ws-none' }, 'No workspace by that name'));
  };
  box.append(el('div', { class: 'cz-list-h' }, el('b', {}, 'Other workspaces'), el('span', {}, String(others.length))));
  if (others.length > 6) {
    const find = el('input', { class: 'cz-in cz-find', type: 'search', placeholder: 'Find a workspace', value: frontFind, 'aria-label': 'Find a workspace', spellcheck: 'false' });
    find.addEventListener('input', () => { frontFind = find.value; fill(); });
    find._esc = () => { if (find.value) { find.value = frontFind = ''; fill(); } else find.blur(); };
    box.append(find);
  }
  fill(); box.append(rows); return box;
}
const frontIc = d => { const s = el('span', { class: 'cz-ic', 'aria-hidden': 'true' }); s.innerHTML = '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; return s; };
function frontRow(o) {
  const m = frontMeta(o), name = el('b', { class: 'cz-ws-name' }, m.name);
  const go = el('button', { type: 'button', class: 'cz-ws-go', onclick: () => frontOpenSpace(o.id), title: 'Open ' + m.name },
    name, el('span', { class: 'cz-ws-when' }, m.opened ? frontAgo(m.opened) : ''),
    el('span', { class: 'cz-ws-stat' }, frontStat(m) + ' · ', el('span', { class: frontLate(m) ? 'late' : null }, frontBk(m))));
  const act = (label, d, fn, cls) => el('button', { type: 'button', class: 'cz-ws-a' + (cls ? ' ' + cls : ''), title: label, 'aria-label': label + ': ' + m.name, onclick: fn }, frontIc(d));
  let armT = 0;
  const del = act('Delete', '<path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10"/>', () => {
    if (!del.classList.contains('armed')) { del.classList.add('armed'); del.title = 'Delete for good? Click again'; del.querySelector('.cz-ic').replaceWith(el('span', { class: 'cz-ws-sure' }, 'Delete for good?')); clearTimeout(armT); armT = setTimeout(() => { frontDraw(); }, 3500); return; }
    clearTimeout(armT); frontDelSpace(o.id);
  }, 'bin');
  const li = el('li', { class: 'cz-ws' }, go, el('span', { class: 'cz-ws-acts' },
    act('Rename', '<path d="M12.5 4.5l3 3L8 15H5v-3z"/>', () => frontRenameRow(o, li, name)),
    act('Save a backup', '<path d="M10 3v9M6 8.5l4 4 4-4M4 16h12"/>', () => frontBackSpace(o.id)), del));
  return li;
}
function frontRenameRow(o, li, name) {
  const inp = el('input', { class: 'cz-in cz-ws-in', type: 'text', maxlength: '40', value: o.name || '', 'aria-label': 'New name', spellcheck: 'false' });
  let over = false;
  const done = keep => { if (over) return; over = true; const v = inp.value.trim().slice(0, 40); if (keep && v && v !== o.name) frontRenameSpace(o.id, v); else { frontDraw(); focusFirst(); } };
  inp._enter = () => done(true); inp._esc = () => done(false); inp.addEventListener('blur', () => done(true));
  name.replaceWith(inp); li.classList.add('editing'); inp.focus({ preventScroll: true }); inp.select();
}

// what the rows do (each other workspace's desk is read from the database only when it's needed)
function frontOpenSpace(id) { frontKeep(); if (typeof deskSfx === 'function') deskSfx('flip'); front.classList.add('out'); setTimeout(() => spaceGo(id), frontStill() ? 0 : 260); setTimeout(() => front.classList.remove('out'), 2500); } // (still here after that: it didn't open, and the banner says why)
async function frontRenameSpace(id, v) {
  const w = S.spaces.find(x => x.id === id); if (!w) return; w.name = v;
  try { const b = await BOOT.get(deskKey(id)); if (b) { b.name = v; await BOOT.put(b, deskKey(id)); } } catch (e) { /* the list has it */ }
  save(); frontDraw(); focusFirst();
}
async function frontBackSpace(id) {
  const w = S.spaces.find(x => x.id === id); let b;
  try { b = await BOOT.get(deskKey(id)); } catch (e) { b = null; }
  if (!b) { deskToast('That workspace couldn\'t be read'); return; }
  b.name = w.name || b.name; await deskExportBackup(b);
  try { await BOOT.put(b, deskKey(id)); } catch (e) { /* noted in the list anyway */ }
  w.backedAt = b.backedAt; save(); frontDraw(); focusFirst();
}
async function frontDelSpace(id) {
  if (id === S.spaceCur) return; // (the one you're in can't go: open another first)
  let b = null; try { b = await BOOT.get(deskKey(id)); } catch (e) { /* gone already */ }
  if (b && Array.isArray(b.items)) b.items.forEach(it => { if (it.type === 'photo') PHOTOS.del(it.id).catch(() => {}); });
  try { await BOOT.del(deskKey(id)); } catch (e) { deskToast('That workspace couldn\'t be deleted'); return; }
  S.spaces = S.spaces.filter(x => x.id !== id); save(); deskSfx('pick'); frontDraw(); focusFirst();
}

// New and Rename: a small card that asks for a name (New starts an empty desk; nothing else is touched)
function frontAsk(kind) {
  const w = frontWork(), fresh = kind === 'new' && !frontHas();
  const name = el('input', { class: 'cz-in', type: 'text', maxlength: '40', value: kind === 'rename' || fresh ? w.name : 'New workspace', 'aria-label': kind === 'new' ? 'Name of the new workspace' : 'New name', spellcheck: 'false' });
  const go = () => {
    const n = (name.value || '').trim().slice(0, 40) || 'My workspace';
    if (kind === 'rename' || fresh) { S.board.name = n; save(); if (fresh) frontClose(); else { frontDraw(); focusFirst(); } return; } // (an empty first desk just gets the name)
    spaceNew(n);
  };
  const back = frontBtn('Cancel', 'quiet', () => { frontDraw(); focusFirst(); });
  const keys = [frontBtn(kind === 'rename' ? 'Rename' : 'Start', 'main', go), back];
  const card = el('div', { class: 'cz-warn', role: 'group', 'aria-label': kind === 'new' ? 'A new workspace' : 'Rename' },
    el('i', { class: 'cz-fpin' }),
    el('h2', {}, kind === 'new' ? 'A new workspace' : 'Rename ' + w.name),
    el('label', { class: 'cz-lab' }, 'Its name', name),
    kind === 'new' ? el('p', {}, fresh ? 'An empty desk, ready for you.' : 'An empty desk of its own. Your other workspaces stay just as they are.') : null,
    el('div', { class: 'cz-keys' }, ...keys));
  name._enter = go; name._esc = () => { frontDraw(); focusFirst(); };
  frontMain.replaceChildren(frontLogo(), el('h1', { class: 'cz-title small' }, 'Cassie'), card);
  name.focus({ preventScroll: true }); name.select();
}

const focusFirst = () => { const b = frontMain.querySelector('.cz-cont, .cz-btn.main, .cz-btn'); if (b) b.focus({ preventScroll: true }); };
const frontStill = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function frontOpen() {
  if (frontOn) return; frontOn = true; frontDraw(); front.hidden = false; front.classList.remove('out');
  if (!frontStill()) front.classList.add('in');
  requestAnimationFrame(() => focusFirst());
}
// how much the browser holds for Cassie (notes, photos, everything), and whether it's kept for good
const frontSize = b => b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB';
function frontUse(p) {
  const st = navigator.storage; if (!st || !st.estimate) return;
  Promise.all([st.estimate(), st.persisted ? st.persisted() : Promise.resolve(false)]).then(([e, kept]) => {
    if (!e || !e.quota) return;
    p.textContent = 'Using ' + frontSize(e.usage || 0) + ' of ' + frontSize(e.quota) + (kept ? ' · kept for good' : '');
    p.title = kept ? 'This browser has agreed not to clear your workspace on its own, even when the disk is low' : 'The browser may clear this when the disk is very low: save backups';
  }).catch(() => {});
}
// asks the browser to keep the workspace for good (not cleared on its own when the disk runs low): Chrome decides by itself,
// Firefox asks you once. It's asked as you go in, so it's never a surprise on a blank page
function frontKeep() { const st = navigator.storage; if (!st || !st.persist || !st.persisted) return; st.persisted().then(p => { if (!p) return st.persist(); }).catch(() => {}); }
function frontClose() {
  if (!frontOn) return; frontOn = false; frontKeep();
  if (typeof deskSfx === 'function') deskSfx('flip');
  const done = () => { front.hidden = true; front.classList.remove('in', 'out'); if (typeof deskSfx === 'function') deskSfx('drop'); };
  if (frontStill()) { done(); return; }
  front.classList.add('out'); setTimeout(done, 300);
}

// while it's open, the keys are its own: nothing reaches the desk or the clock (Enter continues, Esc steps back)
addEventListener('keydown', e => {
  if (!frontOn) return;
  e.stopImmediatePropagation();
  const t = e.target, inMine = t && t.closest && t.closest('.cz-front button, .cz-front input');
  // (an input's own Enter and Esc: its listeners can't hear the key once it's stopped here, so they're called from here)
  if (e.key === 'Enter' && t && t._enter) { e.preventDefault(); t._enter(); return; }
  if (e.key === 'Escape' && t && t._esc) { e.preventDefault(); t._esc(); return; }
  if (e.key === 'Escape') { e.preventDefault(); if (frontMain.querySelector('.cz-warn')) { frontDraw(); focusFirst(); } else if (frontHas()) frontClose(); return; }
  if (e.key === 'Enter' && !inMine) { e.preventDefault(); const c = frontMain.querySelector('.cz-cont, .cz-btn.main'); if (c) c.click(); return; }
  if (!inMine && e.key !== 'Tab') e.preventDefault();
}, true);

front.append(frontMain);
document.body.append(front);
// on start (but not right after New or Load made a fresh workspace: that goes straight to the desk)
if (sessionStorage.getItem('cassie-in')) sessionStorage.removeItem('cassie-in'); else frontOpen();
