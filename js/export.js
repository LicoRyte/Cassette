/* Cassie: taking the desk with you. Save a backup of a workspace (one JSON file, photos included), or of every workspace at
   once (from the front page), and load one: from the board manager its boards are added next to yours (Undo takes it back);
   from the front page it becomes a workspace of its own (a backup of everything brings every workspace back). */
'use strict';

function deskToast(msg) {
  document.querySelectorAll('.sx-toast').forEach(n => n.remove());
  const t = el('div', { class: 'sx-toast', role: 'status' }, msg); document.body.append(t);
  requestAnimationFrame(() => t.classList.add('on')); setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 400); }, 2600);
}
function deskDownload(blob, name) { const u = URL.createObjectURL(blob), a = el('a', { href: u, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000); }
const deskStamp = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
const deskSlug = s => String(s || 'board').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'board';


/* ---------- the backup ---------- */
// b: another workspace's desk (from the front page); without it, the one open
async function deskExportBackup(b) {
  const B = b || S.board, photos = {};
  for (const it of B.items) if (it.type === 'photo' || (it.type === 'book' && it.cover)) { /* (a book's cover picture is kept under the book's own id) */ try { const src = await PHOTOS.get(it.id); if (src) photos[it.id] = src; } catch (e) { /* skip */ } }
  const name = B.name || 'My workspace', data = { app: 'cassette-desk', v: 1, name, saved: new Date().toISOString(), boards: B.boards, items: B.items, links: B.links, photos };
  deskDownload(new Blob([JSON.stringify(data)], { type: 'application/json' }), 'cassie-' + deskSlug(name) + '-' + deskStamp() + '.json');
  B.backedAt = Date.now(); if (!b) save(); deskToast('Backup saved'); // (the front page says when you last saved one)
}
// one workspace out of a backup: every card gets a fresh name (so loading the same backup twice never mixes things up),
// and its photos are kept; null if there's nothing in it. taken: board names already there; n: keeps names apart when
// several workspaces come out of one file
async function deskReadSpace(d, taken, n) {
  if (!d || !Array.isArray(d.boards) || !Array.isArray(d.items)) return null;
  const tag = '-' + Date.now().toString(36) + (n ? 'w' + n : ''), num = v => isFinite(+v) ? Math.round(+v) : 0, str = (v, k) => typeof v === 'string' ? v.slice(0, k) : '';
  const bmap = new Map(), names = new Set(taken || []);
  const boards = d.boards.filter(b => b && b.id).slice(0, 50).map(b => { const id = 'b' + tag + bmap.size; bmap.set(b.id, id); let name = str(b.name, 40) || 'Board'; if (names.has(name)) name += ' (loaded)'; return { id, name }; });
  if (!boards.length) return null;
  const imap = new Map(), TYPES = ['note', 'photo', 'hop', 'tbl', 'book']; // (labels and drawings in an old backup stay behind)
  const items = d.items.filter(it => it && TYPES.includes(it.type) && bmap.has(it.board)).slice(0, 5000).map(it => {
    const id = String(it.id).replace(/[^\w-]/g, '').slice(0, 40) + tag; imap.set(it.id, id);
    const o = { id, type: it.type, board: bmap.get(it.board), x: num(it.x), y: num(it.y) };
    if (it.text) o.text = str(it.text, 2000);
    if (it.type === 'note') { if (it.html) o.html = noteClean(str(it.html, NOTE_MAX)); if (it.color) o.color = str(it.color, 12); if (it.fs) o.fs = num(it.fs); if (it.w) o.w = num(it.w); if (it.h) o.h = num(it.h); if (PAPERS.some(p => p[0] === it.paper)) o.paper = it.paper; if (it.topic === true) o.topic = true; }
    if (it.type === 'tbl') Object.assign(o, tblClean(it));
    if (it.type === 'photo') { if (it.ar) o.ar = Math.max(.1, Math.min(10, +it.ar || 1)); if (it.w) o.w = Math.max(120, Math.min(1600, num(it.w))); }
    if (it.type === 'hop' && bmap.has(it.to)) o.to = bmap.get(it.to); // (a folder to a board that came in the same backup)
    if (it.type === 'book') { o.title = str(it.title, 80); if (NOTE_COLORS.some(c => c[0] === it.color)) o.color = it.color; if (typeof PALETTE !== 'undefined') { if (PALETTE.includes(it.bg)) o.bg = it.bg; if (PALETTE.includes(it.ink)) o.ink = it.ink; } if (it.cover) o.cover = true; o._pages = Array.isArray(it.pages) ? it.pages.slice(0, 2000) : []; o.at = num(it.at); }
    if (typeof it.book === 'string') o._book = it.book; // (a book's page: tied back to its book below, once every card has its new name)
    if (typeof it.group === 'string' && !it.book) o.group = 'g' + tag + it.group.replace(/[^\w-]/g, '').slice(0, 20);
    return o;
  });
  items.forEach(o => { // a book and its pages, by their new names (a page whose book didn't come along is a loose card)
    if (o._book) { if (imap.has(o._book)) o.book = imap.get(o._book); delete o._book; }
    if (o._pages) { o.pages = o._pages.filter(p => imap.has(p)).map(p => imap.get(p)); delete o._pages; }
  });
  const links = (Array.isArray(d.links) ? d.links : []).filter(l => Array.isArray(l) && imap.has(l[0]) && imap.has(l[1])).map(l => [imap.get(l[0]), imap.get(l[1])]);
  for (const [old, src] of Object.entries(d.photos || {})) if (imap.has(old) && typeof src === 'string' && /^data:image\/(jpeg|png|webp|gif);base64,/.test(src) && src.length < 8e6) { try { await PHOTOS.put(imap.get(old), src); } catch (e) { /* skip */ } }
  return { name: str(d.name, 40), boards, items, links, backedAt: Date.parse(d.saved) || Date.now() };
}
// asSpace (from the front page): the backup becomes a workspace of its own, next to the others; a backup of everything
// brings back every workspace in it. From the board manager, a backup's boards are added next to yours
function deskImportBackup(asSpace) {
  const f = el('input', { type: 'file', accept: '.json,application/json' });
  f.addEventListener('change', async () => {
    const file = f.files && f.files[0]; if (!file) return;
    let d; try { d = JSON.parse(await file.text()); } catch (e) { deskToast('That file is not a Cassie backup'); return; }
    if (d && d.app === 'cassie-all' && Array.isArray(d.spaces)) { // a backup of everything: every workspace comes back, next to yours
      if (!asSpace) { deskToast('That\'s a backup of every workspace: load it from the front page'); return; }
      let k = 0; for (const [n, sp] of d.spaces.slice(0, 50).entries()) { const got = await deskReadSpace(sp, [], n + 1); if (got && await spaceAdd(got.name || 'Workspace ' + (n + 1), { boards: got.boards, cur: got.boards[0].id, items: got.items, links: got.links, backedAt: got.backedAt })) k++; }
      save(); if (typeof frontDraw === 'function' && frontOn) frontDraw();
      deskToast(k ? 'Loaded ' + k + (k === 1 ? ' workspace' : ' workspaces') + ': they\'re in the list' : 'That backup has no workspaces in it'); return;
    }
    if (!d || !['cassette-desk', 'solarist-desk'].includes(d.app)) { deskToast('That file is not a Cassie backup'); return; }
    const got = await deskReadSpace(d, asSpace ? [] : S.board.boards.map(b => b.name), 0);
    if (!got) { deskToast('That backup has no boards in it'); return; }
    if (asSpace) {
      const name = got.name || file.name.replace(/\.json$/i, '').replace(/^cassie-|^cassette-desk-?/, '').replace(/-?\d{4}-\d\d-\d\d$/, '').replace(/-/g, ' ').trim().slice(0, 40) || 'My workspace';
      spaceNew(name, { boards: got.boards, cur: got.boards[0].id, items: got.items, links: got.links, backedAt: got.backedAt }); return; // (written, listed, and opened)
    }
    deskMark();
    S.board.boards.push(...got.boards); S.board.items.push(...got.items); S.board.links.push(...got.links); S.board.cur = got.boards[0].id;
    select(null); save(); drawBoard(); glideHome();
    deskToast('Loaded ' + got.boards.length + (got.boards.length === 1 ? ' board' : ' boards'));
  });
  f.click();
}
// a backup of every workspace, in one file (each with its boards, cards, strings and photos); each is marked backed up
async function deskExportAll() {
  const now = Date.now(), spaces = [];
  for (const w of S.spaces) {
    let b = w.id === S.spaceCur ? S.board : null; if (!b) { try { b = await BOOT.get(deskKey(w.id)); } catch (e) { b = null; } }
    if (!b || !Array.isArray(b.items)) continue;
    const photos = {}; for (const it of b.items) if (it.type === 'photo' || (it.type === 'book' && it.cover)) { try { const src = await PHOTOS.get(it.id); if (src) photos[it.id] = src; } catch (e) { /* skip */ } }
    spaces.push({ name: b.name || w.name || 'Workspace', saved: new Date(now).toISOString(), boards: b.boards, items: b.items, links: b.links, photos });
    b.backedAt = now; w.backedAt = now; if (w.id !== S.spaceCur) { try { await BOOT.put(b, deskKey(w.id)); } catch (e) { /* noted in the list anyway */ } }
  }
  if (!spaces.length) { deskToast('Nothing to back up yet'); return; }
  deskDownload(new Blob([JSON.stringify({ app: 'cassie-all', v: 1, saved: new Date(now).toISOString(), spaces })], { type: 'application/json' }), 'cassie-everything-' + deskStamp() + '.json');
  save(); deskToast('Backup of ' + spaces.length + (spaces.length === 1 ? ' workspace' : ' workspaces') + ' saved');
}
