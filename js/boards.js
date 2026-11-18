/* Cassie: the board manager (the Boards key at the top of the left column). Every board is a row: click it to go
   there (the desk fades over to it with a flip of paper, like through a folder); its pencil (or a double-click on its name, or F2) renames it right in the row; its copy key makes a copy (cards,
   strings, groups and photos); its bin deletes it. The board you're on can't be deleted: go to another board first.
   Drag a row to reorder. A box at the bottom makes a new board (type its name, Enter). Up and Down move through the rows,
   Enter opens one, Esc closes. With more than eight boards, a search box finds one by name. Backups are at the very bottom. */
'use strict';

const BM_ICONS = {
  edit: '<path d="M11.5 3.5l3 3L7 14H4v-3z"/><path d="M10 5l3 3"/>',
  copy: '<rect x="6" y="6" width="8.5" height="8.5" rx="1.5"/><path d="M3.5 11V4.5a1 1 0 0 1 1-1H11"/>',
  bin: '<path d="M3.5 5h11M7 5V3.5h4V5M5 5l.8 9.5h6.4L13 5"/><path d="M7.7 7.5v4.5M10.3 7.5v4.5"/>',
};
const bmIcon = k => { const s = el('span', { class: 'sx-bm-ic', 'aria-hidden': 'true' }); s.innerHTML = '<svg viewBox="0 0 18 18">' + BM_ICONS[k] + '</svg>'; return s; }; // (fixed drawings)
let bmFilter = '', bmEdit = null, bmFocus = null, bmDrag = null;
const bmCount = id => S.board.items.filter(it => it.board === id).length;
const bmClose = () => { deskMenu.hidden = true; bmEdit = null; };

deskMenuOpen = function () {
  if (!deskMenu.hidden) { bmClose(); return; }
  bmFilter = ''; bmEdit = null; bmFocus = S.board.cur; bmDraw(); deskMenu.hidden = false;
  const mb = deskBar.querySelector('.sx-ws-menub'); if (mb) deskMenu.style.top = Math.max(0, mb.offsetTop) + 'px'; // beside the Boards key, opening to the right
  const row = deskMenu.querySelector('.sx-bm-row.cur'); if (row) row.focus({ preventScroll: true });
};

function bmDraw() {
  const B = S.board, q = bmFilter.trim().toLowerCase(), many = B.boards.length > 8;
  const shown = B.boards.filter(b => !q || b.name.toLowerCase().includes(q));
  const search = many ? el('input', { class: 'sx-bm-search', type: 'search', placeholder: 'Find a board...', value: bmFilter, 'aria-label': 'Find a board',
    oninput: e => { bmFilter = e.target.value; bmDraw(); const s = deskMenu.querySelector('.sx-bm-search'); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); } },
    onkeydown: e => { if (e.key === 'Enter' && shown[0]) { e.preventDefault(); bmGo(shown[0].id); } else if (e.key === 'ArrowDown') { e.preventDefault(); bmMove(0, true); } } }) : null;
  const list = el('ul', { class: 'sx-bm-list', role: 'listbox', 'aria-label': 'Boards' }, ...shown.map(b => bmRow(b)));
  const fresh = el('input', { class: 'sx-bm-new', type: 'text', maxlength: '40', placeholder: '+ New board (type a name, Enter)', 'aria-label': 'New board name',
    onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); bmNew(e.target.value); } else if (e.key === 'Escape') { e.preventDefault(); e.target.blur(); bmClose(); } } });
  const link = (label, fn) => el('button', { type: 'button', class: 'sx-bm-link', onclick: () => { bmClose(); fn(); } }, label);
  deskMenu.replaceChildren(
    el('div', { class: 'sx-bm-head' }, el('b', {}, 'Boards'), el('span', {}, B.boards.length + (B.boards.length === 1 ? ' board' : ' boards'))),
    ...[search, list, fresh].filter(Boolean),
    el('div', { class: 'sx-bm-foot' }, link('Save a backup', () => deskExportBackup()), el('i', { 'aria-hidden': 'true' }, '·'), link('Load a backup...', () => deskImportBackup())));
  if (bmEdit) { const inp = deskMenu.querySelector('.sx-bm-name input'); if (inp) { inp.focus(); inp.select(); } }
}

function bmRow(b) {
  const B = S.board, cur = b.id === B.cur, n = bmCount(b.id);
  const act = (k, title, fn, dis) => el('button', { type: 'button', class: 'sx-bm-a sx-bm-' + k, title, 'aria-label': title, disabled: dis || null, tabindex: '-1',
    onclick: e => { e.stopPropagation(); if (!dis) fn(); } }, bmIcon(k));
  let name;
  if (bmEdit === b.id) {
    const done = keepIt => { if (bmEdit !== b.id) return; const v = inp.value.trim().slice(0, 40); bmEdit = null; if (keepIt && v && v !== b.name) { deskMark(); b.name = v; save(); deskBoardTools(); } bmDraw(); bmFocusRow(b.id); };
    const inp = el('input', { type: 'text', value: b.name, maxlength: '40', 'aria-label': 'Board name', onclick: e => e.stopPropagation(),
      onkeydown: e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); done(true); } else if (e.key === 'Escape') { e.preventDefault(); done(false); } }, onblur: () => done(true) });
    name = el('span', { class: 'sx-bm-name' }, inp);
  } else name = el('span', { class: 'sx-bm-name', title: 'Double-click to rename', ondblclick: e => { e.stopPropagation(); bmRename(b.id); } }, b.name);
  const row = el('li', { class: 'sx-bm-row' + (cur ? ' cur' : '') + (bmFocus === b.id ? ' foc' : ''), role: 'option', 'aria-selected': String(cur), tabindex: bmFocus === b.id ? '0' : '-1', 'data-id': b.id, draggable: bmEdit ? 'false' : 'true',
    onclick: () => bmGo(b.id), onfocus: () => { bmFocus = b.id; deskMenu.querySelectorAll('.sx-bm-row.foc').forEach(r => r.classList.remove('foc')); row.classList.add('foc'); } },
    el('i', { class: 'sx-bm-dot', 'aria-hidden': 'true' }), name, el('small', { class: 'sx-bm-n' }, n ? n + (n === 1 ? ' card' : ' cards') : 'empty'),
    el('span', { class: 'sx-bm-acts' },
      act('edit', 'Rename (F2)', () => bmRename(b.id)),
      act('copy', 'Make a copy of this board', () => bmCopy(b.id)),
      act('bin', cur ? "You're on this board: go to another one to delete it" : 'Delete this board and everything on it', () => bmDelete(b.id), cur || B.boards.length < 2)));
  // drag a row to put it somewhere else in the list
  row.addEventListener('dragstart', e => { bmDrag = b.id; row.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', b.name); } catch (er) { /* */ } });
  row.addEventListener('dragend', () => { bmDrag = null; deskMenu.querySelectorAll('.sx-bm-row').forEach(r => r.classList.remove('drag', 'over-t', 'over-b')); });
  row.addEventListener('dragover', e => { if (!bmDrag || bmDrag === b.id) return; e.preventDefault(); const r = row.getBoundingClientRect(), top = e.clientY < r.top + r.height / 2; row.classList.toggle('over-t', top); row.classList.toggle('over-b', !top); });
  row.addEventListener('dragleave', () => row.classList.remove('over-t', 'over-b'));
  row.addEventListener('drop', e => { if (!bmDrag || bmDrag === b.id) return; e.preventDefault(); const r = row.getBoundingClientRect(); bmReorder(bmDrag, b.id, e.clientY >= r.top + r.height / 2); });
  return row;
}

// going to a board feels like going through a folder: the paper flips, the desk fades out, the board changes, and it
// fades back in with the board's name (js/hopper.js does the same)
function bmSwap(go, name) {
  deskSfx('flip');
  const done = () => { go(); deskSfx('drop'); if (name) deskToast(name); };
  if (stillUI()) { done(); return; }
  cancelAnimationFrame(glideRaf);
  const out = world.animate([{ opacity: 1, filter: 'blur(0)' }, { opacity: 0, filter: 'blur(4px)' }], { duration: 200, easing: 'ease-in', fill: 'forwards' });
  setTimeout(() => { out.cancel(); done(); world.animate([{ opacity: 0, filter: 'blur(4px)' }, { opacity: 1, filter: 'blur(0)' }], { duration: 280, easing: 'ease-out' }); }, 210);
}
function bmGo(id) { bmClose(); if (id === S.board.cur) return; const b = S.board.boards.find(x => x.id === id); bmSwap(() => deskBoardGo(id), b && b.name); }
function bmRename(id) { bmEdit = id; bmFocus = id; bmDraw(); }
function bmFocusRow(id) { const r = deskMenu.querySelector('.sx-bm-row[data-id="' + id + '"]'); if (r) r.focus({ preventScroll: true }); }
function bmMove(step, first) { // Up and Down through the rows that are showing
  const rows = [...deskMenu.querySelectorAll('.sx-bm-row')]; if (!rows.length) return;
  const i = first ? 0 : Math.max(0, Math.min(rows.length - 1, rows.findIndex(r => r.dataset.id === bmFocus) + step));
  rows[i].focus({ preventScroll: false });
}
function bmNew(name) {
  const B = S.board; name = String(name || '').trim().slice(0, 40) || 'Board ' + (B.boards.length + 1);
  deskMark(); const id = 'b' + Date.now(); B.boards.push({ id, name }); save(); bmClose(); bmSwap(() => deskBoardGo(id), 'Made "' + name + '"');
}
function bmDelete(id) {
  const B = S.board; if (id === B.cur || B.boards.length < 2) return; const b = B.boards.find(x => x.id === id); if (!b) return;
  deskMark(); const ids = new Set(B.items.filter(it => it.board === id).map(it => it.id));
  B.items = B.items.filter(it => it.board !== id); B.links = B.links.filter(l => !l.some(x => ids.has(x))); B.boards = B.boards.filter(x => x.id !== id);
  save(); deskSfx('tear'); const rows = [...deskMenu.querySelectorAll('.sx-bm-row')], i = rows.findIndex(r => r.dataset.id === id);
  bmFocus = (rows[i + 1] || rows[i - 1] || {}).dataset ? (rows[i + 1] || rows[i - 1]).dataset.id : B.cur; bmDraw(); bmFocusRow(bmFocus);
  deskToast('Deleted "' + b.name + '"');
}
async function bmCopy(id) { // a copy, just after it: its cards (photos too), strings, groups and their names; bookmarks stay with the original
  const B = S.board, b = B.boards.find(x => x.id === id); if (!b) return;
  deskMark(); const nb = 'b' + Date.now(), now = Date.now(), imap = new Map(), gmap = {};
  const src = B.items.filter(it => it.board === id), out = [];
  for (const [k, it] of src.entries()) {
    const c = JSON.parse(JSON.stringify(it)); c.id = ((String(it.id).match(/^[a-z]+/i) || ['n'])[0]) + now + '-' + k; c.board = nb; delete c.key;
    if (c.group) { const g0 = c.group; c.group = gmap[g0] || (gmap[g0] = 'g' + now + '-' + k); if (B.gnames && B.gnames[g0]) B.gnames[c.group] = B.gnames[g0]; }
    if (it.type === 'photo') { try { const p = await PHOTOS.get(it.id); if (p) await PHOTOS.put(c.id, p); } catch (e) { continue; } }
    imap.set(it.id, c.id); out.push(c);
  }
  B.items.push(...out);
  B.links.push(...B.links.filter(l => imap.has(l[0]) && imap.has(l[1])).map(l => [imap.get(l[0]), imap.get(l[1])]));
  const at = B.boards.indexOf(b); B.boards.splice(at + 1, 0, { id: nb, name: (b.name + ' copy').slice(0, 40) });
  save(); deskSfx('pick'); bmFocus = nb; bmDraw(); bmFocusRow(nb); deskToast('Copied "' + b.name + '"');
}
function bmReorder(from, to, after) {
  const B = S.board, a = B.boards.find(x => x.id === from); if (!a || from === to) return;
  deskMark(); B.boards = B.boards.filter(x => x !== a); const i = B.boards.findIndex(x => x.id === to); B.boards.splice(i + (after ? 1 : 0), 0, a);
  save(); bmFocus = from; bmDraw(); bmFocusRow(from);
}

// keys inside the manager: Up/Down, Enter, F2, Delete, Esc (the desk's own keys keep out of it: js/desk.js)
deskMenu.addEventListener('keydown', e => {
  const t = e.target; if (t.tagName === 'INPUT') { if (e.key === 'Escape' && !t.closest('.sx-bm-name')) { e.preventDefault(); bmClose(); } return; }
  const r = t.closest && t.closest('.sx-bm-row'), id = r ? r.dataset.id : bmFocus; if (r) bmFocus = id; // (the row the keys are on)
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); bmMove(e.key === 'ArrowDown' ? 1 : -1); }
  else if (e.key === 'Enter' && id) { e.preventDefault(); bmGo(id); }
  else if (e.key === 'F2' && id) { e.preventDefault(); bmRename(id); }
  else if ((e.key === 'Delete' || e.key === 'Backspace') && id) { e.preventDefault(); if (id === S.board.cur) deskToast("You're on this board: go to another one to delete it"); else bmDelete(id); }
  else if (e.key === 'Escape') { e.preventDefault(); bmClose(); }
});
