/* Cassette Timer: bringing in a Markdown file. Each heading starts a note (its title on top, the words under it below),
   tied to the next by a red string, in reading order. What sits under a heading hangs beneath its note, tied to it:
   a table becomes a table card; a graph (a mermaid flowchart) becomes small white notes tied as its arrows go, and a
   mermaid pie becomes a table shown as a pie; a picture the text shows (from the same folder) hangs as a photo.
   All of it lands in a Label named after the file, to the right of what's on the board; one Undo takes it all back.
   Boards ▾ has Import Markdown; dropping a .md file (with its pictures, or its folder) on the desk works too. */
'use strict';

const MD_MAX = { notes: 150, nodes: 60, photos: 60, tables: 40 };
const mdEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const mdBase = p => decodeURIComponent(String(p).split(/[?#]/)[0].replace(/^<|>$/g, '')).split(/[\\/]/).pop().toLowerCase();

/* ---------- words: bold, italic, code, strikethrough, highlight; links keep their words ---------- */
function mdInline(s) {
  const codes = []; s = String(s).replace(/`([^`]+)`/g, (_, c) => '\u0000' + (codes.push(c) - 1) + '\u0000');
  s = mdEsc(s)
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1') // [[page|words]] → words
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // [words](link) → words
    .replace(/(\*\*|__)(?=\S)(.+?)\1/g, '<b>$2</b>').replace(/(^|[^\w*])\*(?=\S)([^*]+?)\*/g, '$1<i>$2</i>').replace(/(^|[^\w])_(?=\S)([^_]+?)_(?!\w)/g, '$1<i>$2</i>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>').replace(/==(.+?)==/g, '<mark>$1</mark>').replace(/&lt;br\s*\/?&gt;/gi, '<br>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => '<code>' + mdEsc(codes[i]) + '</code>');
}
const mdPlain = s => { const d = document.createElement('div'); d.innerHTML = mdInline(s); return d.textContent.trim(); };

/* ---------- the file, cut at its headings ---------- */
function mdParse(text) {
  let lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  if (lines[0] === '---') { const e = lines.indexOf('---', 1); if (e > 0) lines = lines.slice(e + 1); } // (front matter)
  const secs = []; let cur = { title: '', lines: [], att: [] };
  const push = () => { if (cur.title || cur.lines.some(l => l.trim()) || cur.att.length) secs.push(cur); };
  const isSep = l => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l) && l.includes('-');
  const cells = l => l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => mdPlain(c.trim().replace(/\\\|/g, '|')));
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i], fence = l.match(/^\s*(```+|~~~+)\s*([\w-]*)/);
    if (fence) { // a fenced block: a graph if it's mermaid, otherwise code
      const body = []; i++; while (i < lines.length && !lines[i].trim().startsWith(fence[1])) body.push(lines[i++]);
      if (fence[2].toLowerCase() === 'mermaid') cur.att.push({ k: 'graph', src: body.join('\n') });
      else cur.lines.push({ code: body }); continue;
    }
    const h = l.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (h) { push(); cur = { title: h[2], lines: [], att: [] }; continue; }
    if (l.includes('|') && i + 1 < lines.length && isSep(lines[i + 1])) { // a table
      const rows = [cells(l)]; i += 2; while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(cells(lines[i++])); i--;
      cur.att.push({ k: 'table', rows }); continue;
    }
    // pictures the line shows: ![words](file) and ![[file]]
    const line = l.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, src) => { cur.att.push({ k: 'photo', src, alt }); return ''; })
      .replace(/!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, (_, src) => { cur.att.push({ k: 'photo', src, alt: '' }); return ''; });
    if (line.trim() || !l.trim()) cur.lines.push(line);
  }
  push(); return secs;
}

/* ---------- a section's words as a note (the same few things a note can show) ---------- */
function mdNoteHtml(sec) {
  const out = []; let list = null;
  const close = () => { if (list) { out.push('</' + list + '>'); list = null; } };
  const open = (tag, cls) => { const k = tag + (cls || ''); if (list !== k) { close(); out.push('<' + tag + (cls ? ' class="' + cls + '"' : '') + '>'); list = k; } };
  if (sec.title) out.push('<h2>' + mdInline(sec.title) + '</h2>');
  for (const l of sec.lines) {
    if (l && l.code) { close(); l.code.forEach(c => out.push('<div><code>' + (mdEsc(c) || ' ') + '</code></div>')); continue; }
    let m;
    if ((m = l.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*)/))) { open('ul', 'sx-chk'); out.push('<li' + (m[1] !== ' ' ? ' class="done"' : '') + '>' + mdInline(m[2]) + '</li>'); list = 'ulsx-chk'; }
    else if ((m = l.match(/^\s*[-*+]\s+(.*)/))) { open('ul'); out.push('<li>' + mdInline(m[1]) + '</li>'); }
    else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { open('ol'); out.push('<li>' + mdInline(m[1]) + '</li>'); }
    else if ((m = l.match(/^\s*>\s?(.*)/))) { close(); out.push('<blockquote>' + mdInline(m[1]) + '</blockquote>'); }
    else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)) { close(); out.push('<hr>'); }
    else if (!l.trim()) { close(); if (out.length && out[out.length - 1] !== '<div><br></div>' && !/^<h2/.test(out[out.length - 1])) out.push('<div><br></div>'); }
    else { close(); out.push('<div>' + mdInline(l) + '</div>'); }
  }
  close(); while (out.length && out[out.length - 1] === '<div><br></div>') out.pop();
  return noteClean(out.join('')).slice(0, 30000);
}

/* ---------- a mermaid flowchart: its boxes and arrows (and a mermaid pie, as a table) ---------- */
function mdGraph(src) {
  const lines = src.split('\n').map(l => l.replace(/%%.*$/, '').trim()).filter(Boolean);
  if (!lines.length) return null;
  if (/^pie\b/i.test(lines[0])) { // pie: "name" : value
    const rows = [['Slice', 'Value']]; lines.slice(1).forEach(l => { const m = l.match(/^"?([^":]+)"?\s*:\s*([\d.]+)/); if (m) rows.push([m[1].trim(), m[2]]); });
    const t = lines[0].match(/title\s+(.*)/i) || (lines.find(l => /^title\s/i.test(l)) || '').match(/title\s+(.*)/i);
    return rows.length > 1 ? { pie: rows, title: t ? t[1] : '' } : null;
  }
  const head = lines[0].match(/^(graph|flowchart)\s*(TD|TB|BT|RL|LR)?/i); if (!head) return null;
  const dir = (head[2] || 'TD').toUpperCase(), nodes = new Map(), edges = [];
  const NODE = /^\s*([\wÀ-￿]+)\s*(\(\(([^)]*)\)\)|\(\[([^\]]*)\]\)|\[\[([^\]]*)\]\]|\[\(([^)]*)\)\]|\[\/([^\]]*)\/\]|\[([^\]]*)\]|\(([^)]*)\)|\{\{([^}]*)\}\}|\{([^}]*)\}|>([^\]]*)\])?/;
  const ARROW = /^\s*<?(?:-\.+-*|-{2,}|={2,})[->ox]?(?:\|([^|]*)\|)?/;
  const node = s => { const m = s.match(NODE); if (!m || !m[1]) return null;
    const label = m.slice(3).find(x => x != null); const id = m[1];
    if (!nodes.has(id)) nodes.set(id, id); if (label != null) nodes.set(id, label.replace(/^"|"$/g, '').replace(/<br\s*\/?>/gi, '\n').trim() || id);
    return { id, rest: s.slice(m[0].length) }; };
  const group = s => { const ids = []; let r = s; for (;;) { const n = node(r); if (!n) break; ids.push(n.id); r = n.rest; const amp = r.match(/^\s*&\s*/); if (!amp) break; r = r.slice(amp[0].length); } return { ids, rest: r }; };
  for (const raw of lines.slice(1)) {
    if (/^(subgraph|end\b|style|classDef|class\s|click|linkStyle|direction)/.test(raw)) continue;
    let l = raw.replace(/--\s+([^->|][^>]*?)\s+-->/g, '-->|$1|').replace(/;$/, ''), g = group(l); if (!g.ids.length) continue;
    for (;;) { const a = g.rest.match(ARROW); if (!a) break; const nx = group(g.rest.slice(a[0].length)); if (!nx.ids.length) break;
      g.ids.forEach(x => nx.ids.forEach(y => edges.push([x, y]))); g = nx; }
  }
  return nodes.size ? { dir, nodes, edges } : null;
}
function mdGraphPlace(g) { // each box goes one step further along than the one before it (the first ones at the start)
  const ids = [...g.nodes.keys()].slice(0, MD_MAX.nodes), into = new Map(ids.map(id => [id, 0])), depth = new Map();
  g.edges.forEach(([, b]) => into.set(b, (into.get(b) || 0) + 1));
  const queue = ids.filter(id => !into.get(id)); if (!queue.length) queue.push(ids[0]); queue.forEach(id => depth.set(id, 0));
  for (let k = 0; k < queue.length; k++) { const a = queue[k]; g.edges.forEach(([x, y]) => { if (x === a && ids.includes(y) && !depth.has(y)) { depth.set(y, depth.get(a) + 1); queue.push(y); } }); }
  ids.forEach(id => { if (!depth.has(id)) depth.set(id, 0); });
  const rows = new Map(); ids.forEach(id => { const d = depth.get(id); rows.set(d, (rows.get(d) || []).concat(id)); });
  const across = /LR|RL/.test(g.dir), back = /BT|RL/.test(g.dir), maxD = Math.max(...depth.values()), pos = new Map();
  rows.forEach((row, d) => row.forEach((id, i) => { const step = back ? maxD - d : d;
    pos.set(id, across ? { x: step * 240, y: i * 150 } : { x: i * 210, y: step * 160 }); }));
  return { ids, pos, roots: ids.filter(id => depth.get(id) === 0) };
}

/* ---------- reading what was picked or dropped ---------- */
async function mdFromEntries(entries) { // a dropped folder: the files at its top (not inside folders within it)
  const files = [];
  for (const en of entries) {
    if (en.isFile) files.push(await new Promise(r => en.file(r, () => r(null))));
    else if (en.isDirectory) { const rd = en.createReader(); for (;;) { const batch = await new Promise(r => rd.readEntries(r, () => r([]))); if (!batch.length) break;
      for (const f of batch) if (f.isFile) files.push(await new Promise(r => f.file(r, () => r(null)))); } }
  }
  return files.filter(Boolean);
}
const mdIsMd = f => /\.(md|markdown|mdown|mkd)$/i.test(f.name);
// the desk's drop (js/desk.js): a .md file, or a folder with one, comes in here; anything else goes on as before
function mdDrop(e) {
  const items = [...(e.dataTransfer.items || [])].filter(i => i.kind === 'file'), entries = items.map(i => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
  const files = [...e.dataTransfer.files];
  if (!files.some(mdIsMd) && !entries.some(en => en.isDirectory)) return false;
  const at = toWorld(e.clientX, e.clientY);
  (entries.length ? mdFromEntries(entries) : Promise.resolve(files)).then(fs => mdImport(fs, at));
  return true;
}
const mdPick = el('input', { type: 'file', accept: '.md,.markdown,image/*', multiple: true, hidden: true });
const mdPickDir = el('input', { type: 'file', hidden: true, webkitdirectory: '' });
document.body.append(mdPick, mdPickDir);
mdPick.addEventListener('change', () => { const fs = [...mdPick.files]; mdPick.value = ''; mdImport(fs); });
mdPickDir.addEventListener('change', () => { const fs = [...mdPickDir.files].filter(f => (f.webkitRelativePath || '').split('/').length <= 2); mdPickDir.value = ''; mdImport(fs); });
function mdImportAsk() { mdPick.click(); }
function mdImportFolder() { mdPickDir.click(); }

/* ---------- putting it on the desk ---------- */
async function mdImport(files, at) {
  const mds = files.filter(mdIsMd); if (!mds.length) { deskToast('Pick a Markdown (.md) file'); return; }
  const pics = new Map(files.filter(f => /^image\//.test(f.type)).map(f => [f.name.toLowerCase(), f]));
  const B = B_(), mine = B.items.filter(it => it.board === B.cur && it.type !== 'frame');
  let ox = Math.max(400, ...mine.map(it => it.x + 420)) + 160, oy = at ? at.y : Math.min(-300, ...mine.map(it => it.y)); // to the right of what's there
  if (at && !mine.length) ox = at.x;
  deskMark(); const made = { notes: 0, photos: 0, tables: 0, graphs: 0, left: 0 }, frames = [];
  for (const f of mds) {
    const r = await mdOne(f, pics, ox, oy, made); if (!r) continue;
    frames.push(r.frame); ox = r.right + 220;
  }
  save(); drawBoard();
  if (!frames.length) { deskToast('Nothing to bring in from that file'); return; }
  const fr = itemOf(frames[0]); if (fr) setTimeout(() => glideToItem(fr), 120);
  const bits = [made.notes + (made.notes === 1 ? ' note' : ' notes'), made.tables && made.tables + (made.tables === 1 ? ' table' : ' tables'), made.graphs && made.graphs + (made.graphs === 1 ? ' graph' : ' graphs'), made.photos && made.photos + (made.photos === 1 ? ' photo' : ' photos')].filter(Boolean);
  deskToast('Brought in ' + bits.join(', ') + (made.left ? ' (' + made.left + ' left out: too many)' : ''));
}
async function mdOne(file, pics, ox, oy, made) {
  let text = ''; try { text = await file.text(); } catch (e) { return null; }
  const secs = mdParse(text); if (!secs.length) return null;
  const B = B_(), stamp = Date.now() + '-' + Math.floor(Math.random() * 1e4); let n = 0;
  const nid = p => p + stamp + '-' + (n++);
  const add = it => { B.items.push(Object.assign({ board: B.cur, x: 0, y: 0 }, it)); return it.id; };
  const tie = (a, b) => { if (a && b && a !== b) B.links.push([a, b]); };
  const cols = []; let prev = null;
  for (const sec of secs) {
    const col = { note: null, blocks: [] };
    const html = mdNoteHtml(sec);
    if (html.replace(/<[^>]+>/g, '').trim()) {
      if (made.notes >= MD_MAX.notes) made.left++;
      else { const d = document.createElement('div'); d.innerHTML = html; const words = d.textContent.length;
        col.note = add({ id: nid('n'), type: 'note', mt: Date.now(), html, text: d.innerText.slice(0, 2000), w: words > 600 ? 340 : 280, ...(words > 1400 ? { h: 520 } : {}) });
        made.notes++; tie(prev, col.note); prev = col.note; }
    }
    for (const a of sec.att) {
      if (a.k === 'table') { if (made.tables >= MD_MAX.tables) { made.left++; continue; }
        const t = { id: nid('t'), type: 'tbl', view: 'table', rows: a.rows, w: Math.min(720, 120 + 110 * a.rows[0].length) }; tblFix(t); col.blocks.push({ ids: [add(t)], tie: t.id }); made.tables++; }
      else if (a.k === 'graph') { const g = mdGraph(a.src); if (!g) continue;
        if (g.pie) { const t = { id: nid('t'), type: 'tbl', view: 'pie', rows: g.pie, w: 360 }; tblFix(t); col.blocks.push({ ids: [add(t)], tie: t.id }); made.tables++; continue; }
        const pl = mdGraphPlace(g), map = new Map();
        pl.ids.forEach(id => { const label = g.nodes.get(id) || id; map.set(id, add({ id: nid('n'), type: 'note', color: 'cream', mt: Date.now(), w: 170, fs: 14, html: noteClean('<div><b>' + mdEsc(label).replace(/\n/g, '<br>') + '</b></div>'), text: label, _gx: pl.pos.get(id).x, _gy: pl.pos.get(id).y })); });
        g.edges.forEach(([x, y]) => tie(map.get(x), map.get(y)));
        made.left += Math.max(0, g.nodes.size - pl.ids.length);
        col.blocks.push({ ids: [...map.values()], graph: true, tie: map.get(pl.roots[0]) }); made.graphs++; }
      else if (a.k === 'photo') { const f = pics.get(mdBase(a.src)); if (!f) continue;
        if (made.photos >= MD_MAX.photos) { made.left++; continue; }
        try { const src = await shrinkPhoto(f), id = nid('p'); await PHOTOS.put(id, src);
          const ar = await new Promise(r => { const im = new Image(); im.onload = () => r(im.naturalWidth / im.naturalHeight || 1); im.onerror = () => r(1); im.src = src; });
          add({ id, type: 'photo', text: a.alt || '', ar: Math.round(ar * 1000) / 1000 }); col.blocks.push({ ids: [id], tie: id }); made.photos++; } catch (e) { /* not a picture the browser can read */ } }
    }
    col.blocks.forEach(b => tie(col.note || prev, b.tie));
    if (col.note || col.blocks.length) cols.push(col);
  }
  if (!cols.length) return null;
  // first draw them where they'll be measured, then lay them out by their real sizes
  drawBoard();
  const size = id => { const c = els.get(id); return c ? { w: c.offsetWidth, h: c.offsetHeight } : { w: 280, h: 160 }; };
  const GAP = 60, ROW_W = 2400, PAD = 70; let x = ox + PAD, y = oy + PAD + 30, rowH = 0, right = x;
  for (const col of cols) {
    const parts = []; let cw = 0, ch = 0;
    const put = (ids, graph) => { if (graph) { const bx = ids.map(id => { const it = itemOf(id), s = size(id); return { it, s }; });
        const w = Math.max(...bx.map(b => b.it._gx + b.s.w)), h = Math.max(...bx.map(b => b.it._gy + b.s.h)); parts.push({ ids, graph: true, w, h }); cw = Math.max(cw, w); ch += h + GAP; }
      else { const s = size(ids[0]); parts.push({ ids, w: s.w, h: s.h }); cw = Math.max(cw, s.w); ch += s.h + GAP; } };
    if (col.note) put([col.note]); col.blocks.forEach(b => put(b.ids, b.graph));
    if (x > ox + PAD && x + cw > ox + PAD + ROW_W) { x = ox + PAD; y += rowH + GAP * 1.6; rowH = 0; } // a new row
    let cy = y; parts.forEach(p => { if (p.graph) p.ids.forEach(id => { const it = itemOf(id); it.x = Math.round(x + it._gx); it.y = Math.round(cy + it._gy); delete it._gx; delete it._gy; });
      else { const it = itemOf(p.ids[0]); it.x = Math.round(x); it.y = Math.round(cy); } cy += p.h + GAP; });
    x += cw + GAP * 1.6; right = Math.max(right, x); rowH = Math.max(rowH, ch);
  }
  const fid = nid('f'), name = file.name.replace(/\.[^.]+$/, '').slice(0, 80);
  B.items.unshift({ id: fid, type: 'frame', board: B.cur, x: ox, y: oy, w: Math.min(6000, Math.round(right - ox + PAD - GAP)), h: Math.min(4000, Math.round(y + rowH - oy + PAD)), text: name, color: 'amber' }); // (first: under the cards)
  return { frame: fid, right: right + PAD };
}
