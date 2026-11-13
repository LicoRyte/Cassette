/* Cassette Timer: taking the desk with you. Board ▾ has two: save a backup of all boards (one JSON file, photos
   included), and load a backup (its boards are added next to yours, nothing is replaced; Undo takes it back). */
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
async function deskExportBackup() {
  const photos = {};
  for (const it of S.board.items) if (it.type === 'photo') { try { const src = await PHOTOS.get(it.id); if (src) photos[it.id] = src; } catch (e) { /* skip */ } }
  const data = { app: 'cassette-desk', v: 1, saved: new Date().toISOString(), boards: S.board.boards, items: S.board.items, links: S.board.links, photos };
  deskDownload(new Blob([JSON.stringify(data)], { type: 'application/json' }), 'cassette-desk-' + deskStamp() + '.json'); deskToast('Backup saved');
}
function deskImportBackup() {
  const f = el('input', { type: 'file', accept: '.json,application/json' });
  f.addEventListener('change', async () => {
    const file = f.files && f.files[0]; if (!file) return;
    let d; try { d = JSON.parse(await file.text()); } catch (e) { deskToast('That file is not a Cassette Timer backup'); return; }
    if (!d || !['cassette-desk', 'solarist-desk'].includes(d.app) || !Array.isArray(d.boards) || !Array.isArray(d.items)) { deskToast('That file is not a Cassette Timer backup'); return; }
    // everything gets fresh names, so loading the same backup twice never mixes things up
    const tag = '-' + Date.now().toString(36), num = v => isFinite(+v) ? Math.round(+v) : 0, str = (v, n) => typeof v === 'string' ? v.slice(0, n) : '';
    const bmap = new Map(), names = new Set(S.board.boards.map(b => b.name));
    const boards = d.boards.filter(b => b && b.id).slice(0, 50).map(b => { const id = 'b' + tag + bmap.size; bmap.set(b.id, id); let name = str(b.name, 40) || 'Board'; if (names.has(name)) name += ' (loaded)'; return { id, name }; });
    const imap = new Map(), TYPES = ['note', 'photo', 'draw', 'frame', 'wb', 'hop'], TOOLS = ['pen', 'arrow', 'line', 'circle', 'box'];
    const items = d.items.filter(it => it && TYPES.includes(it.type) && bmap.has(it.board)).slice(0, 5000).map(it => {
      const id = String(it.id).replace(/[^\w-]/g, '').slice(0, 40) + tag; imap.set(it.id, id);
      const o = { id, type: it.type, board: bmap.get(it.board), x: num(it.x), y: num(it.y) };
      if (it.key >= 1 && it.key <= 9) o.key = num(it.key);
      if (it.text) o.text = str(it.text, 2000);
      if (it.type === 'note') { if (it.html) o.html = noteClean(str(it.html, 30000)); if (it.color) o.color = str(it.color, 12); if (it.fs) o.fs = num(it.fs); if (it.w) o.w = num(it.w); if (it.h) o.h = num(it.h); if (PAPERS.some(p => p[0] === it.paper)) o.paper = it.paper; }
      if (it.type === 'hop' && bmap.has(it.to)) o.to = bmap.get(it.to); // (a folder to a board that came in the same backup)
      if (it.type === 'frame') Object.assign(o, { w: Math.max(200, num(it.w)), h: Math.max(140, num(it.h)), color: str(it.color, 12) || 'amber' }); if (it.type === 'frame' && it.lock === true) o.lock = true;
      if (it.type === 'draw' || it.type === 'wb') Object.assign(o, { w: num(it.w), h: num(it.h), strokes: (Array.isArray(it.strokes) ? it.strokes : []).filter(s => s && TOOLS.includes(s.t) && Array.isArray(s.p)).map(s => ({ t: s.t, c: str(s.c, 12), s: Math.max(1, Math.min(12, num(s.s))), seed: num(s.seed), p: s.p.filter(q => Array.isArray(q)).slice(0, 4000).map(q => [+q[0] || 0, +q[1] || 0]) })) });
      return o;
    });
    const links = (Array.isArray(d.links) ? d.links : []).filter(l => Array.isArray(l) && imap.has(l[0]) && imap.has(l[1])).map(l => [imap.get(l[0]), imap.get(l[1])]);
    if (!boards.length) { deskToast('That backup has no boards in it'); return; }
    deskMark();
    for (const [old, src] of Object.entries(d.photos || {})) if (imap.has(old) && typeof src === 'string' && /^data:image\/(jpeg|png|webp|gif);base64,/.test(src)) { try { await PHOTOS.put(imap.get(old), src); } catch (e) { /* skip */ } }
    S.board.boards.push(...boards); S.board.items.push(...items); S.board.links.push(...links); S.board.cur = boards[0].id;
    select(null); save(); drawBoard(); glideHome();
    deskToast('Loaded ' + boards.length + (boards.length === 1 ? ' board' : ' boards'));
  });
  f.click();
}
