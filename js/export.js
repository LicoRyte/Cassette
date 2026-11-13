/* Cassette Timer: taking the desk with you. Board ▾ has three: save this board as an image (a PNG of everything on it,
   drawn flat so it reads well), save a backup of all boards (one JSON file, photos included), and load a backup (its
   boards are added next to yours, nothing is replaced; Undo takes it back). */
'use strict';

function deskToast(msg) {
  document.querySelectorAll('.sx-toast').forEach(n => n.remove());
  const t = el('div', { class: 'sx-toast', role: 'status' }, msg); document.body.append(t);
  requestAnimationFrame(() => t.classList.add('on')); setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 400); }, 2600);
}
function deskDownload(blob, name) { const u = URL.createObjectURL(blob), a = el('a', { href: u, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000); }
const deskStamp = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
const deskSlug = s => String(s || 'board').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'board';

/* ---------- the image ---------- */
// words are drawn where the page laid them out, with their own font, colour and marks
function paintText(ctx, box, o) {
  const w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) {
    if (!n.data.trim()) continue;
    const pe = n.parentElement, cs = getComputedStyle(pe); let op = 1, mark = false, code = false; const deco = new Set();
    for (let a = pe; a && a !== box.parentElement; a = a.parentElement) {
      const s = getComputedStyle(a); op *= +s.opacity || 1; String(s.textDecorationLine || '').split(' ').forEach(d => { if (d && d !== 'none') deco.add(d); });
      if (a.tagName === 'MARK') mark = true; if (a.tagName === 'CODE') code = true;
    }
    ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; if ('letterSpacing' in ctx) ctx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
    const up = cs.textTransform === 'uppercase', re = /\S+/g; let m;
    while ((m = re.exec(n.data))) {
      const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
      const rects = [...rg.getClientRects()]; if (!rects.length) continue;
      const parts = rects.length === 1 ? [[m[0], rects[0]]] : [...m[0]].map((ch, i) => { const r = document.createRange(); r.setStart(n, m.index + i); r.setEnd(n, m.index + i + 1); return [ch, r.getClientRects()[0]]; }).filter(p => p[1]); // a word broken over lines
      parts.forEach(([word, rc]) => {
        const x = rc.left - o.x, y = rc.top - o.y, txt = up ? word.toUpperCase() : word;
        ctx.globalAlpha = op; ctx.fillStyle = cs.color;
        const mt = ctx.measureText(txt), asc = mt.fontBoundingBoxAscent || parseFloat(cs.fontSize) * .8, desc = mt.fontBoundingBoxDescent || parseFloat(cs.fontSize) * .2, base = y + (rc.height - asc - desc) / 2 + asc;
        if (mark) { ctx.save(); ctx.fillStyle = 'rgba(255, 97, 87, .5)'; ctx.fillRect(x - 1, y + rc.height * .52, rc.width + 2, rc.height * .4); ctx.restore(); }
        if (code) { ctx.save(); ctx.globalAlpha = .12 * op; ctx.fillRect(x - 3, y, rc.width + 6, rc.height); ctx.restore(); }
        ctx.fillText(txt, x, base);
        if (deco.has('line-through')) ctx.fillRect(x, base - asc * .32, rc.width, 2);
        if (deco.has('underline')) ctx.fillRect(x, base + 2, rc.width, 1.5);
      });
    }
  }
  ctx.globalAlpha = 1; if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  // list markers, checkboxes, quote bars, heading rules
  box.querySelectorAll('li').forEach(li => {
    const r = li.getBoundingClientRect(), cs = getComputedStyle(li), x = r.left - o.x, y = r.top - o.y, fs = parseFloat(cs.fontSize);
    ctx.fillStyle = ctx.strokeStyle = cs.color; ctx.globalAlpha = +cs.opacity || 1;
    if (li.parentElement.classList.contains('sx-chk')) { ctx.lineWidth = 1.5; ctx.strokeRect(x + 1.5, y + fs * .32, 11, 11); if (li.classList.contains('done')) ctx.fillRect(x + 4, y + fs * .32 + 2.5, 6, 6); }
    else if (li.parentElement.tagName === 'OL') { ctx.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; ctx.textAlign = 'right'; ctx.fillText([...li.parentElement.children].indexOf(li) + 1 + '.', x - 5, y + fs * 1.1); ctx.textAlign = 'left'; }
    else { ctx.beginPath(); ctx.arc(x - 10, y + fs * .75, 2.2, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  });
  box.querySelectorAll('blockquote').forEach(q => { const r = q.getBoundingClientRect(), cs = getComputedStyle(q); ctx.fillStyle = cs.borderLeftColor; ctx.fillRect(r.left - o.x, r.top - o.y, 3, r.height); });
  box.querySelectorAll('h3').forEach(h => { const r = h.getBoundingClientRect(), cs = getComputedStyle(h); ctx.fillStyle = cs.borderBottomColor; ctx.fillRect(r.left - o.x, r.bottom - o.y - 1.5, r.width, 1.5); });
}
async function deskExportImage() {
  const B = B_(), items = B.items.filter(it => it.board === B.cur);
  if (!items.length) { deskToast('There is nothing on this board yet'); return; }
  select(null); const ae = document.activeElement; if (ae && ae.isContentEditable) ae.blur();
  // lay everything out flat (no camera, no tilt) for a moment, and measure it
  const tf = world.style.transform; root.classList.add('sx-exporting'); world.style.transform = 'none'; world.style.setProperty('--cz', 1); void world.offsetWidth;
  try {
    const w0 = world.getBoundingClientRect(), o = { x: w0.left, y: w0.top };
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    els.forEach(c => { [c, ...c.querySelectorAll('.sx-frame-h')].forEach(n => { const r = n.getBoundingClientRect(); x0 = Math.min(x0, r.left - o.x); y0 = Math.min(y0, r.top - o.y); x1 = Math.max(x1, r.right - o.x); y1 = Math.max(y1, r.bottom - o.y); }); });
    x0 -= 60; y0 -= 110; x1 += 60; y1 += 60;
    const W = x1 - x0, H = y1 - y0, k = Math.max(.25, Math.min(2, 8000 / W, 8000 / H, Math.sqrt(36e6 / (W * H))));
    const cv = document.createElement('canvas'); cv.width = Math.ceil(W * k); cv.height = Math.ceil(H * k);
    const ctx = cv.getContext('2d'); ctx.scale(k, k); ctx.translate(-x0, -y0);
    // the desk
    ctx.fillStyle = '#030710'; ctx.fillRect(x0, y0, W, H);
    ctx.fillStyle = 'rgba(109, 138, 141, .22)'; for (let gx = Math.ceil(x0 / 44) * 44; gx < x1; gx += 44) for (let gy = Math.ceil(y0 / 44) * 44; gy < y1; gy += 44) ctx.fillRect(gx - .8, gy - .8, 1.6, 1.6);
    ctx.fillStyle = '#ffb762'; ctx.font = '700 26px "Barlow C", "Arial Narrow", sans-serif'; ctx.fillText((B.boards.find(b => b.id === B.cur) || {}).name || 'Board', x0 + 40, y0 + 56);
    ctx.fillStyle = '#6d8a8d'; ctx.font = '600 14px "Barlow C", "Arial Narrow", sans-serif'; ctx.fillText('Cassette Timer · ' + deskStamp(), x0 + 40, y0 + 78);
    // frames
    items.filter(it => it.type === 'frame').forEach(it => {
      const c = els.get(it.id); if (!c) return; const col = inkOf(it.color || 'amber');
      ctx.save(); ctx.globalAlpha = .05; ctx.fillStyle = col; ctx.fillRect(it.x, it.y, it.w, it.h); ctx.restore();
      ctx.save(); ctx.globalAlpha = .55; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.strokeRect(it.x + 1, it.y + 1, it.w - 2, it.h - 2); ctx.restore();
      const lb = c.querySelector('.sx-frame-t'), r = lb.getBoundingClientRect();
      ctx.fillStyle = col; ctx.fillRect(r.left - o.x, r.top - o.y, r.width, r.height); paintText(ctx, lb, o);
    });
    // strings
    strNodes.forEach(nd => { const d = nd.p.getAttribute('d'); if (!d) return; ctx.save(); ctx.strokeStyle = '#d9243c'; ctx.lineWidth = 2.5; ctx.stroke(new Path2D(d)); ctx.restore(); });
    // notes, photos and drawings, in the order they're stacked
    const stack = [...layer.children].filter(c => els.get(c.dataset.id) === c).sort((a, b) => (+a.style.zIndex || 0) - (+b.style.zIndex || 0));
    for (const c of stack) {
      const it = itemOf(c.dataset.id); if (!it) continue;
      if (it.type === 'draw') { ctx.save(); ctx.translate(it.x, it.y); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        (it.strokes || []).forEach(st => strokeMarks(st).forEach(mk => { ctx.globalAlpha = mk.o; ctx.strokeStyle = inkOf(st.c); ctx.lineWidth = mk.w; ctx.stroke(new Path2D(mk.d)); })); ctx.restore(); continue; }
      const r = c.getBoundingClientRect(), x = r.left - o.x, y = r.top - o.y, px = x + r.width / 2, py = y + 10;
      ctx.save(); ctx.translate(px, py); ctx.rotate(tilt(it.id) * Math.PI / 180); ctx.translate(-px, -py); // hung a little crooked, like on the desk
      ctx.fillStyle = 'rgba(3, 7, 16, .55)'; ctx.fillRect(x + 3, y + 4, r.width, r.height);
      ctx.fillStyle = getComputedStyle(c).backgroundColor; ctx.fillRect(x, y, r.width, r.height);
      if (it.type === 'note' && it.paper && it.paper !== 'plain') { // the paper's lines
        const lh = (it.fs || 15) * 1.5, ink = getComputedStyle(c).color; ctx.save(); ctx.beginPath(); ctx.rect(x, y, r.width, r.height); ctx.clip(); ctx.globalAlpha = .18; ctx.fillStyle = ink;
        if (it.paper === 'dots') { for (let gy = y + 20 + lh / 2; gy < y + r.height; gy += lh) for (let gx = x + lh / 2; gx < x + r.width; gx += lh) ctx.fillRect(gx - 1, gy - 1, 2, 2); }
        else { for (let gy = y + 20 + lh - 1; gy < y + r.height; gy += lh) ctx.fillRect(x, gy, r.width, 1); if (it.paper === 'grid') for (let gx = x; gx < x + r.width; gx += lh) ctx.fillRect(gx, y, 1, r.height); }
        ctx.globalAlpha = .5; ctx.fillStyle = '#ff6157'; if (it.paper === 'lined' || it.paper === 'torn') ctx.fillRect(x + (it.paper === 'torn' ? 22 : 10), y, 1.5, r.height); if (it.paper === 'index') ctx.fillRect(x, y + 20 + lh - 1, r.width, 2); ctx.restore(); }
      const img = c.querySelector('.sx-pol-img img');
      if (img && img.complete && img.naturalWidth) { // cropped to its window like on the desk, never stretched
        const ir = img.getBoundingClientRect(), iw = img.naturalWidth, ih = img.naturalHeight, k = Math.max(ir.width / iw, ir.height / ih), sw = ir.width / k, sh = ir.height / k;
        ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, ir.left - o.x, ir.top - o.y, ir.width, ir.height); }
      const txt = c.querySelector('.sx-note-t, .sx-cap-t'); if (txt) { ctx.save(); ctx.beginPath(); ctx.rect(x, y, r.width, r.height); ctx.clip(); paintText(ctx, txt, o); ctx.restore(); }
      ctx.fillStyle = '#890027'; ctx.beginPath(); ctx.arc(px + 1, py + 2, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#d9243c'; ctx.beginPath(); ctx.arc(px, py, 6.5, 0, 7); ctx.fill(); // the pin
      ctx.restore();
    }
    const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
    if (!blob) throw new Error('no image');
    deskDownload(blob, 'cassette-' + deskSlug((B.boards.find(b => b.id === B.cur) || {}).name) + '-' + deskStamp() + '.png'); deskSfx('shutter'); deskToast('Image saved');
  } catch (e) { console.error(e); deskToast('Could not make the image'); }
  finally { root.classList.remove('sx-exporting'); world.style.transform = tf; placeCam(); }
}

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
    const imap = new Map(), TYPES = ['note', 'photo', 'draw', 'frame'], TOOLS = ['pen', 'arrow', 'line', 'circle', 'box'];
    const items = d.items.filter(it => it && TYPES.includes(it.type) && bmap.has(it.board)).slice(0, 5000).map(it => {
      const id = String(it.id).replace(/[^\w-]/g, '').slice(0, 40) + tag; imap.set(it.id, id);
      const o = { id, type: it.type, board: bmap.get(it.board), x: num(it.x), y: num(it.y) };
      if (it.key >= 1 && it.key <= 9) o.key = num(it.key); if (it.group) o.group = str(it.group, 40) + tag;
      if (it.text) o.text = str(it.text, 2000);
      if (it.type === 'note') { if (it.html) o.html = noteClean(str(it.html, 30000)); if (it.color) o.color = str(it.color, 12); if (it.fs) o.fs = num(it.fs); if (it.w) o.w = num(it.w); if (it.h) o.h = num(it.h); if (PAPERS.some(p => p[0] === it.paper)) o.paper = it.paper; if (it.fold) o.fold = true; }
      if (it.type === 'frame') Object.assign(o, { w: Math.max(200, num(it.w)), h: Math.max(140, num(it.h)), color: str(it.color, 12) || 'amber' });
      if (it.type === 'draw') Object.assign(o, { w: num(it.w), h: num(it.h), strokes: (Array.isArray(it.strokes) ? it.strokes : []).filter(s => s && TOOLS.includes(s.t) && Array.isArray(s.p)).map(s => ({ t: s.t, c: str(s.c, 12), s: Math.max(1, Math.min(12, num(s.s))), seed: num(s.seed), p: s.p.filter(q => Array.isArray(q)).slice(0, 4000).map(q => [+q[0] || 0, +q[1] || 0]) })) });
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
