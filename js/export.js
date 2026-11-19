/* Cassie: taking the desk with you. Save a backup of a workspace (one JSON file, photos included), and load one: from the board manager its
   boards are added next to yours (Undo takes it back); from the front page it becomes a workspace of its own. */
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
  for (const it of B.items) if (it.type === 'photo') { try { const src = await PHOTOS.get(it.id); if (src) photos[it.id] = src; } catch (e) { /* skip */ } }
  const name = B.name || 'My workspace', data = { app: 'cassette-desk', v: 1, name, saved: new Date().toISOString(), boards: B.boards, items: B.items, links: B.links, photos };
  deskDownload(new Blob([JSON.stringify(data)], { type: 'application/json' }), 'cassie-' + deskSlug(name) + '-' + deskStamp() + '.json');
  B.backedAt = Date.now(); if (!b) save(); deskToast('Backup saved'); // (the front page says when you last saved one)
}
// asSpace (from the front page): the backup becomes a workspace of its own, next to the others
function deskImportBackup(asSpace) {
  const f = el('input', { type: 'file', accept: '.json,application/json' });
  f.addEventListener('change', async () => {
    const file = f.files && f.files[0]; if (!file) return;
    let d; try { d = JSON.parse(await file.text()); } catch (e) { deskToast('That file is not a Cassie backup'); return; }
    if (!d || !['cassette-desk', 'solarist-desk'].includes(d.app) || !Array.isArray(d.boards) || !Array.isArray(d.items)) { deskToast('That file is not a Cassie backup'); return; }
    // everything gets fresh names, so loading the same backup twice never mixes things up
    const tag = '-' + Date.now().toString(36), num = v => isFinite(+v) ? Math.round(+v) : 0, str = (v, n) => typeof v === 'string' ? v.slice(0, n) : '';
    const bmap = new Map(), names = new Set(asSpace ? [] : S.board.boards.map(b => b.name));
    const boards = d.boards.filter(b => b && b.id).slice(0, 50).map(b => { const id = 'b' + tag + bmap.size; bmap.set(b.id, id); let name = str(b.name, 40) || 'Board'; if (names.has(name)) name += ' (loaded)'; return { id, name }; });
    const imap = new Map(), TYPES = ['note', 'photo', 'hop', 'tbl']; // (labels and drawings in an old backup stay behind)
    const items = d.items.filter(it => it && TYPES.includes(it.type) && bmap.has(it.board)).slice(0, 5000).map(it => {
      const id = String(it.id).replace(/[^\w-]/g, '').slice(0, 40) + tag; imap.set(it.id, id);
      const o = { id, type: it.type, board: bmap.get(it.board), x: num(it.x), y: num(it.y) };
      if (it.key >= 1 && it.key <= 9) o.key = num(it.key);
      if (it.text) o.text = str(it.text, 2000);
      if (it.type === 'note') { if (it.html) o.html = noteClean(str(it.html, NOTE_MAX)); if (it.color) o.color = str(it.color, 12); if (it.fs) o.fs = num(it.fs); if (it.w) o.w = num(it.w); if (it.h) o.h = num(it.h); if (PAPERS.some(p => p[0] === it.paper)) o.paper = it.paper; if (it.topic === true) o.topic = true; }
      if (it.type === 'tbl') Object.assign(o, tblClean(it));
      if (it.type === 'hop' && bmap.has(it.to)) o.to = bmap.get(it.to); // (a folder to a board that came in the same backup)
      return o;
    });
    const links = (Array.isArray(d.links) ? d.links : []).filter(l => Array.isArray(l) && imap.has(l[0]) && imap.has(l[1])).map(l => [imap.get(l[0]), imap.get(l[1])]);
    if (!boards.length) { deskToast('That backup has no boards in it'); return; }
    if (asSpace) {
      for (const [old, src] of Object.entries(d.photos || {})) if (imap.has(old) && typeof src === 'string' && /^data:image\/(jpeg|png|webp|gif);base64,/.test(src)) { try { await PHOTOS.put(imap.get(old), src); } catch (e) { /* skip */ } }
      const name = str(d.name, 40) || file.name.replace(/\.json$/i, '').replace(/^cassie-|^cassette-desk-?/, '').replace(/-?\d{4}-\d\d-\d\d$/, '').replace(/-/g, ' ').trim().slice(0, 40) || 'My workspace';
      spaceNew(name, { boards, cur: boards[0].id, items, links, backedAt: Date.parse(d.saved) || Date.now() }); return; // (written, listed, and opened)
    }
    deskMark();
    for (const [old, src] of Object.entries(d.photos || {})) if (imap.has(old) && typeof src === 'string' && /^data:image\/(jpeg|png|webp|gif);base64,/.test(src)) { try { await PHOTOS.put(imap.get(old), src); } catch (e) { /* skip */ } }
    S.board.boards.push(...boards); S.board.items.push(...items); S.board.links.push(...links); S.board.cur = boards[0].id;
    select(null); save(); drawBoard(); glideHome();
    deskToast('Loaded ' + boards.length + (boards.length === 1 ? ' board' : ' boards'));
  });
  f.click();
}
