/* Cassette Timer: tables. A paper card of rows and columns (the top row names the columns, the first column names the
   rows) that turns into a graph of its numbers: Bars, Line or Pie, switched at the card's top left. Click a picked
   table's cell to write in it; Tab and Enter move on (and make a new row at the end), the arrows move around, and cells
   copied from a spreadsheet paste in from where you are. The bar along the bottom adds and removes rows and columns,
   sorts, and adds a total. Graphs grow in when you switch to them: bars rise one after another, a line draws itself,
   a pie sweeps round. Every column with numbers in it can be on the graph: the chips above it pick which (a pie shows one). */
'use strict';

// series colours: palette colours that read on cream paper
const TBL_INK = ['#1c92a7', '#d1401f', '#458239', '#c76e46', '#833f34', '#ff6157', '#77d6c1', '#ffb762'];
const TBL_VIEWS = [['table', 'Table', '<path d="M2.5 3.5h15v13h-15z"/><path d="M2.5 8h15M2.5 12.3h15M7.5 3.5v13"/>'],
  ['bars', 'Bars', '<path d="M3 17h14"/><path d="M4.5 17V10h3v7M8.5 17V5h3v12M12.5 17v-5h3v5"/>'],
  ['line', 'Line', '<path d="M3 17h14"/><path d="M3.5 13.5l4-5 3.5 3 5.5-7"/>'],
  ['pie', 'Pie', '<path d="M10 3.5a6.5 6.5 0 1 0 6.5 6.5H10z"/><path d="M12 2v6h6a6 6 0 0 0-6-6z"/>']];
const tblAnim = new Set(); // tables whose graph should grow in the next time it's drawn
let tblCur = null; // the cell you're in: { id, r, c }

const tblEsc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
function tblNum(s) { // a cell as a number, or null: 1,200 / 3.5 / -4 / 12% / $30 all count
  const t = String(s == null ? '' : s).trim().replace(/^[$€£¥฿]/, '').replace(/[,\s]/g, '').replace(/%$/, '');
  return /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t) ? parseFloat(t) : null;
}
const tblFmt = v => Math.abs(v) >= 1e6 || (v !== 0 && Math.abs(v) < .01) ? v.toPrecision(3) : String(Math.round(v * 100) / 100);
function tblFix(it) { // always a rectangle of strings, at least a header and one row
  if (!Array.isArray(it.rows) || !it.rows.length) it.rows = [['Item', 'Value'], ['', '']];
  const nc = Math.max(1, Math.min(26, Math.max(...it.rows.map(r => Array.isArray(r) ? r.length : 0))));
  it.rows = it.rows.slice(0, 200).map(r => Array.from({ length: nc }, (_, j) => String((Array.isArray(r) ? r[j] : '') ?? '').slice(0, 200)));
  if (it.rows.length < 2) it.rows.push(Array(nc).fill(''));
  if (!TBL_VIEWS.some(v => v[0] === it.view)) it.view = 'table';
  it.w = Math.max(240, Math.min(1400, +it.w || 360));
}
function tblClean(it) { const o = { rows: it.rows, view: it.view, w: it.w, total: it.total === true }; tblFix(o); if (!o.total) delete o.total;
  const col = j => Number.isInteger(j) && j >= 0 && j < 26; if (Array.isArray(it.hide)) { const h = it.hide.filter(col).slice(0, 26); if (h.length) o.hide = h; } if (col(it.pie)) o.pie = it.pie; return o; } // (for backups, js/export.js)
const tblNumCols = it => it.rows[0].map((_, j) => it.rows.slice(1).some(r => tblNum(r[j]) !== null));

/* ---------- the card ---------- */
function tblCard(it) {
  tblFix(it);
  const icon = d => { const s = el('span', { class: 'sx-tbl-ic', 'aria-hidden': 'true' }); s.innerHTML = '<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">' + d + '</svg>'; return s; };
  const tabs = el('div', { class: 'sx-tbl-v', role: 'radiogroup', 'aria-label': 'Show it as' }, ...TBL_VIEWS.map(([k, name, d]) =>
    el('button', { type: 'button', class: k === it.view ? 'on' : null, role: 'radio', 'aria-checked': String(k === it.view), 'data-v': k, title: name, 'aria-label': name, onclick: e => { e.stopPropagation(); tblView(it, k); } }, icon(d))));
  const c = el('div', { class: 'sx-bcard sx-btbl', 'data-id': it.id, 'data-view': it.view, style: 'left:' + it.x + 'px;top:' + it.y + 'px;width:' + it.w + 'px;--tilt:0deg' },
    ...[el('span', { class: 'sx-pin', title: 'Drag to something else to tie a string' }), el('button', { type: 'button', class: 'sx-bnote-x', 'aria-label': 'Take the table down', onclick: () => removeOne(it) }, '×'),
      keyBadge(it), tabs, el('div', { class: 'sx-tbl-in' }, tblBody(it)), el('span', { class: 'sx-resize', title: 'Drag to make it wider or narrower' })].filter(Boolean));
  c.addEventListener('input', e => { const t = e.target.closest && e.target.closest('.sx-tc'); if (!t) return;
    it.rows[+t.dataset.r][+t.dataset.c] = t.innerText.replace(/\n+/g, ' ').slice(0, 200); save(); tblLive(it, c); });
  c.addEventListener('focusin', e => { const t = e.target.closest && e.target.closest('.sx-tc'); if (t) tblCur = { id: it.id, r: +t.dataset.r, c: +t.dataset.c }; });
  c.addEventListener('paste', e => tblPaste(e, it));
  return c;
}
function tblBody(it) { return it.view === 'table' ? tblGrid(it) : tblChart(it); }
function tblGrid(it) {
  const R = it.rows, nums = tblNumCols(it);
  const cell = (tag, i, j, v) => el(tag, { class: nums[j] ? 'n' : null }, el('div', { class: 'sx-tc', contenteditable: 'true', spellcheck: 'false', 'data-r': i, 'data-c': j,
    'aria-label': (i ? 'Row ' + i : 'Header') + ', column ' + (j + 1) }, v));
  const rows = R.map((r, i) => el('tr', {}, ...r.map((v, j) => cell(i ? 'td' : 'th', i, j, v))));
  if (it.total) rows.push(el('tr', { class: 'sx-tbl-tot' }, ...R[0].map((_, j) => el('td', { class: nums[j] ? 'n' : null }, j ? '' : 'Total'))));
  const t = el('table', { class: 'sx-tbl' }, el('tbody', {}, ...rows)); tblTotals(it, t); return t;
}
function tblTotals(it, t) { // the total row and which columns line up as numbers, as you type
  const nums = tblNumCols(it), tot = t.querySelector('.sx-tbl-tot');
  t.querySelectorAll('tr').forEach(tr => [...tr.children].forEach((td, j) => td.classList.toggle('n', !!nums[j])));
  if (tot) [...tot.children].forEach((td, j) => { if (j) td.textContent = nums[j] ? tblFmt(it.rows.slice(1).reduce((s, r) => s + (tblNum(r[j]) || 0), 0)) : ''; });
}
function tblLive(it, c) { const t = c.querySelector('.sx-tbl'); if (t) tblTotals(it, t); strUpdate(); selBoxUpdate(); }
function tblRedraw(it, anim) {
  const c = els.get(it.id); if (!c) return;
  if (anim && !stillUI()) tblAnim.add(it.id);
  c.dataset.view = it.view; c.style.width = it.w + 'px';
  c.querySelectorAll('.sx-tbl-v button').forEach(b => { const on = b.dataset.v === it.view; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
  c.querySelector('.sx-tbl-in').replaceChildren(tblBody(it)); strUpdate(); selBoxUpdate(); tblBarState();
}
function tblView(it, k) { if (it.view === k) return; deskMark(); it.view = k; save(); select(it.id); tblRedraw(it, true); deskSfx('pick'); }
function tblFocus(it, r, c, end) {
  const card = els.get(it.id), t = card && card.querySelector('.sx-tc[data-r="' + r + '"][data-c="' + c + '"]'); if (!t) return;
  t.focus({ preventScroll: true }); const rg = document.createRange(); rg.selectNodeContents(t); if (end) rg.collapse(false);
  const s = getSelection(); s.removeAllRanges(); s.addRange(rg);
}

/* ---------- writing in it: the keys between cells (called from js/desk.js while a cell has the pen) ---------- */
function tblKeys(e, t) {
  const card = t.closest('.sx-btbl'), it = card && itemOf(card.dataset.id); if (!it) return;
  const r = +t.dataset.r, c = +t.dataset.c, nr = it.rows.length, nc = it.rows[0].length;
  const go = (r2, c2) => { e.preventDefault(); tblFocus(it, r2, c2); };
  const caret = () => { const s = getSelection(); if (!s.rangeCount || !s.isCollapsed) return null; const rg = document.createRange(); rg.selectNodeContents(t); rg.setEnd(s.getRangeAt(0).startContainer, s.getRangeAt(0).startOffset); return rg.toString().length; };
  if (e.key === 'Escape') { e.preventDefault(); t.blur(); return; }
  if (e.key === 'Tab') {
    if (e.shiftKey) { if (c > 0) go(r, c - 1); else if (r > 0) go(r - 1, nc - 1); else e.preventDefault(); return; }
    if (c < nc - 1) go(r, c + 1); else if (r < nr - 1) go(r + 1, 0); else { e.preventDefault(); tblAddRow(it, r); tblFocus(it, r + 1, 0); }
    return;
  }
  if (e.key === 'Enter') { if (e.shiftKey) { if (r > 0) go(r - 1, c); else e.preventDefault(); return; }
    if (r < nr - 1) go(r + 1, c); else { e.preventDefault(); tblAddRow(it, r); tblFocus(it, r + 1, c); } return; }
  if (e.key === 'ArrowUp' && r > 0) { go(r - 1, c); return; }
  if (e.key === 'ArrowDown' && r < nr - 1) { go(r + 1, c); return; }
  if (e.key === 'ArrowLeft' && c > 0 && caret() === 0) { e.preventDefault(); tblFocus(it, r, c - 1, true); return; }
  if (e.key === 'ArrowRight' && c < nc - 1 && caret() === t.textContent.length) { go(r, c + 1); return; }
}
// pasting: plain words; cells copied from a spreadsheet (tabs and lines) fill in from the cell you're in, growing the table
function tblPaste(e, it) {
  const t = e.target.closest && e.target.closest('.sx-tc'); if (!t) return;
  const text = (e.clipboardData && e.clipboardData.getData('text/plain')) || ''; e.preventDefault(); e.stopPropagation();
  if (!/[\t\n]/.test(text.replace(/\n+$/, ''))) { document.execCommand('insertText', false, text.replace(/\s+/g, ' ')); return; }
  const grid = text.replace(/\r/g, '').replace(/\n+$/, '').split('\n').slice(0, 200).map(l => l.split('\t').slice(0, 26));
  const r0 = +t.dataset.r, c0 = +t.dataset.c; deskMark();
  const nc = Math.min(26, Math.max(it.rows[0].length, c0 + Math.max(...grid.map(l => l.length))));
  it.rows.forEach(r => { while (r.length < nc) r.push(''); });
  while (it.rows.length < Math.min(200, r0 + grid.length)) it.rows.push(Array(nc).fill(''));
  grid.forEach((l, i) => l.forEach((v, j) => { const r = it.rows[r0 + i]; if (r && c0 + j < nc) r[c0 + j] = v.trim().slice(0, 200); }));
  save(); tblRedraw(it); tblFocus(it, r0, c0); deskToast('Pasted ' + grid.length + (grid.length === 1 ? ' row' : ' rows'));
}

/* ---------- changing its shape (the bar along the bottom) ---------- */
const tblOf = () => { const it = selId && itemOf(selId); return it && it.type === 'tbl' ? it : null; };
const tblAt = it => tblCur && tblCur.id === it.id ? tblCur : null;
function tblAddRow(it, after) { deskMark(); const r = after == null ? it.rows.length - 1 : after; it.rows.splice(r + 1, 0, Array(it.rows[0].length).fill('')); save(); tblRedraw(it); }
function tblAddCol(it, after) { if (it.rows[0].length >= 26) return; deskMark(); const c = after == null ? it.rows[0].length - 1 : after; it.rows.forEach((r, i) => r.splice(c + 1, 0, i ? '' : 'Column ' + (it.rows[0].length + 1))); tblShift(it, c, 1); save(); tblRedraw(it); }
function tblDelRow(it, r) { if (it.rows.length <= 2) return; if (r == null || r < 1) r = it.rows.length - 1; deskMark(); it.rows.splice(r, 1); save(); tblRedraw(it); tblCur = null; }
function tblDelCol(it, c) { if (it.rows[0].length <= 1) return; if (c == null) c = it.rows[0].length - 1; deskMark(); it.rows.forEach(r => r.splice(c, 1)); tblShift(it, c, -1); save(); tblRedraw(it); tblCur = null; }
function tblSort(it, c) { // by the column you're in (or the first with numbers): high to low, then low to high
  if (c == null) { const n = tblNumCols(it).indexOf(true); c = n < 0 ? 0 : n; }
  const body = it.rows.slice(1), key = r => tblNum(r[c]) ?? String(r[c]).toLowerCase();
  const cmp = (a, b) => { const x = key(a), y = key(b); return typeof x === 'number' && typeof y === 'number' ? y - x : String(x).localeCompare(String(y)); };
  let sorted = body.slice().sort(cmp); if (JSON.stringify(sorted) === JSON.stringify(body)) sorted.reverse();
  deskMark(); it.rows = [it.rows[0], ...sorted]; save(); tblRedraw(it, true);
}
function tblTotal(it) { deskMark(); it.total = !it.total; if (!it.total) delete it.total; save(); tblRedraw(it); }

const tblB = (label, title, fn, cls) => el('button', { type: 'button', class: 'sx-fb' + (cls ? ' ' + cls : ''), title, 'aria-label': title, onclick: () => { const it = tblOf(); if (it) fn(it); } }, label);
const tblViewBs = TBL_VIEWS.map(([k, name]) => tblB(name, 'Show it as ' + name.toLowerCase(), it => tblView(it, k), 'sx-tbl-vb'));
const tblBar = el('div', { class: 'sx-fmt sx-tblbar', role: 'toolbar', 'aria-label': 'Table' },
  el('div', { class: 'sx-fmt-row' },
    tblB('+ Row', 'A new row under the one you are in (or at the end)', it => { const a = tblAt(it); tblAddRow(it, a ? Math.max(a.r, 0) : null); }),
    tblB('+ Column', 'A new column after the one you are in (or at the end)', it => { const a = tblAt(it); tblAddCol(it, a ? a.c : null); }),
    tblB('− Row', 'Take away the row you are in (or the last)', it => { const a = tblAt(it); tblDelRow(it, a ? a.r : null); }),
    tblB('− Column', 'Take away the column you are in (or the last)', it => { const a = tblAt(it); tblDelCol(it, a ? a.c : null); }),
    el('i', { class: 'sx-fsep' }),
    tblB('Sort', 'Sort the rows by the column you are in: high to low, again for low to high', it => { const a = tblAt(it); tblSort(it, a ? a.c : null); }),
    tblB('Total', 'A total row at the bottom', it => tblTotal(it), 'sx-tbl-totb'),
    el('i', { class: 'sx-fsep' }), ...tblViewBs,
    el('i', { class: 'sx-fsep' }),
    tblB('Duplicate', 'Duplicate (Ctrl+D)', () => deskDuplicate()), tblB('Delete', 'Delete (Delete)', () => deskDelete(), 'del')));
tblBar.addEventListener('mousedown', e => e.preventDefault()); // (the pen stays in the cell you're in)
function tblBarState() { const it = tblOf(); if (!it) return;
  tblViewBs.forEach((b, i) => b.classList.toggle('on', TBL_VIEWS[i][0] === it.view)); tblBar.querySelector('.sx-tbl-totb').classList.toggle('on', !!it.total); }
function tblBarTo(id) { const it = id && itemOf(id); if (it && it.type === 'tbl' && els.get(id)) { if (tblBar.parentNode !== deskCtx) deskCtx.prepend(tblBar); tblBarState(); } else tblBar.remove(); }
const noteBarToT = noteBarTo;
noteBarTo = function (id) { noteBarToT(id); tblBarTo(id); };

/* ---------- graphs ---------- */
function tblSeries(it) {
  const R = it.rows, body = R.slice(1), labels = body.map((r, i) => String(r[0] || '').trim() || '#' + (i + 1)), series = [];
  for (let j = 1; j < R[0].length; j++) { const v = body.map(r => tblNum(r[j]));
    if (v.some(x => x !== null)) series.push({ j, name: String(R[0][j] || '').trim() || 'Column ' + (j + 1), vals: v.map(x => x ?? 0), col: TBL_INK[series.length % TBL_INK.length] }); }
  if (!series.length && body.some(r => tblNum(r[0]) !== null)) return { labels: body.map((_, i) => '#' + (i + 1)), series: [{ j: 0, name: String(R[0][0] || 'Values'), vals: body.map(r => tblNum(r[0]) ?? 0), col: TBL_INK[0] }] };
  return { labels, series };
}
function tblTicks(lo, hi) { // round steps for the side of the graph
  if (lo === hi) hi = lo + 1;
  const raw = (hi - lo) / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag, step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  const out = []; for (let v = Math.floor(lo / step) * step; v <= Math.ceil(hi / step) * step + step / 2; v += step) out.push(+v.toFixed(10));
  return out;
}
const tblCut = (s, n) => s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s;
// which columns a graph shows: chips above it, one per column with numbers (Bars and Line: any of them; Pie: one)
const tblPieCol = (it, all) => all.some(s => s.j === it.pie) ? it.pie : all[0].j;
function tblPick(it, j, all) {
  if (it.view === 'pie') { if (tblPieCol(it, all) === j) return; deskMark(); it.pie = j; }
  else { const hide = new Set(it.hide || []); if (!hide.has(j) && all.filter(s => !hide.has(s.j)).length <= 1) { deskToast('One column at least stays on the graph'); return; }
    deskMark(); if (hide.has(j)) hide.delete(j); else hide.add(j); it.hide = [...hide].sort((a, b) => a - b); if (!it.hide.length) delete it.hide; }
  save(); tblRedraw(it, true); deskSfx('pick');
}
function tblShift(it, at, d) { // a column added (d 1, after at) or taken away (d -1, at): the picks follow their columns
  const f = j => d > 0 ? (j > at ? j + 1 : j) : (j === at ? null : j > at ? j - 1 : j);
  if (it.hide) { it.hide = it.hide.map(f).filter(j => j != null); if (!it.hide.length) delete it.hide; }
  if (it.pie != null) { const p = f(it.pie); if (p == null) delete it.pie; else it.pie = p; }
}
function tblChart(it) {
  const { labels, series: all } = tblSeries(it), wrap = el('div', { class: 'sx-tbl-g' + (tblAnim.has(it.id) ? ' sx-tbl-anim' : '') }); tblAnim.delete(it.id);
  if (!all.length || !labels.length) { wrap.append(el('p', { class: 'sx-tbl-empty' }, 'Put some numbers in the table and they show here.')); return wrap; }
  const pie = it.view === 'pie', hide = new Set(it.hide || []), pj = tblPieCol(it, all);
  let series = pie ? all.filter(s => s.j === pj) : all.filter(s => !hide.has(s.j)); if (!series.length) series = [all[0]];
  if (all.length > 1) wrap.append(el('div', { class: 'sx-tbl-pick' + (pie ? ' one' : ''), role: 'group', 'aria-label': pie ? 'Which column the pie shows' : 'Which columns the graph shows' },
    ...all.map(s => { const on = series.includes(s);
      return el('button', { type: 'button', class: on ? 'on' : null, 'aria-pressed': String(on), title: pie ? 'Show ' + s.name + ' as the pie' : (on ? 'Take ' + s.name + ' off the graph' : 'Put ' + s.name + ' on the graph'),
        onclick: e => { e.stopPropagation(); tblPick(it, s.j, all); } }, el('i', { style: pie ? null : 'background:' + s.col }), s.name); })));
  const W = 400, box = el('div'); box.innerHTML = pie ? tblPie(it, labels, series[0], W) : tblAxes(it.view, labels, series, W); wrap.append(...box.childNodes);
  const keys = pie ? labels.map((l, i) => [l, TBL_INK[i % TBL_INK.length]]) : [];
  if (it.view === 'pie') { const tot = series[0].vals.reduce((a, v) => a + Math.max(0, v), 0); keys.forEach((k, i) => { const v = Math.max(0, series[0].vals[i]); k[0] += ' · ' + (tot ? Math.round(v / tot * 100) : 0) + '%'; }); }
  if (keys.length) wrap.append(el('div', { class: 'sx-tbl-key' }, ...keys.filter((k, i) => it.view !== 'pie' || series[0].vals[i] > 0).map(([n, col], i) => el('span', { style: '--d:' + i }, el('i', { style: 'background:' + col }), n))));
  else if (all.length === 1) wrap.append(el('div', { class: 'sx-tbl-key one' }, series[0].name));
  return wrap;
}
function tblAxes(kind, labels, series, W) {
  const H = 250, pl = 40, pr = 10, pt = 14, pb = 30, pw = W - pl - pr, ph = H - pt - pb, n = labels.length;
  const all = series.flatMap(s => s.vals), ticks = tblTicks(Math.min(0, ...all), Math.max(0, ...all)), lo = ticks[0], hi = ticks[ticks.length - 1];
  const y = v => pt + (hi - v) / (hi - lo) * ph;
  let g = ticks.map(t => '<line class="gl' + (t === 0 ? ' z' : '') + '" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(t).toFixed(1) + '" y2="' + y(t).toFixed(1) + '"/><text class="yl" x="' + (pl - 6) + '" y="' + (y(t) + 4).toFixed(1) + '">' + tblFmt(t) + '</text>').join('');
  const step = n > 14 ? Math.ceil(n / 14) : 1, gw = pw / n, chars = Math.max(2, Math.floor(gw * step / 7));
  if (kind === 'bars') {
    const bw = Math.min(46, gw * .72 / series.length), few = n * series.length <= 16; let k = 0;
    series.forEach((s, si) => s.vals.forEach((v, i) => {
      const x = pl + gw * i + (gw - bw * series.length) / 2 + bw * si, y0 = y(Math.max(v, 0)), y1 = y(Math.min(v, 0)), d = k++;
      g += '<rect class="bar' + (v < 0 ? ' neg' : '') + '" style="--i:' + d + '" x="' + x.toFixed(1) + '" y="' + y0.toFixed(1) + '" width="' + Math.max(1, bw - 2).toFixed(1) + '" height="' + Math.max(.5, y1 - y0).toFixed(1) + '" rx="1.5" fill="' + s.col + '"><title>' + tblEsc(labels[i] + ' · ' + s.name + ': ' + tblFmt(v)) + '</title></rect>';
      if (few) g += '<text class="vl" style="--i:' + d + '" x="' + (x + (bw - 2) / 2).toFixed(1) + '" y="' + (v < 0 ? y1 + 12 : y0 - 4).toFixed(1) + '">' + tblFmt(v) + '</text>';
    }));
  } else {
    const xs = i => n === 1 ? pl + pw / 2 : pl + 12 + (pw - 24) * i / (n - 1);
    series.forEach((s, si) => {
      const pts = s.vals.map((v, i) => [xs(i), y(v)]), d = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
      if (series.length === 1 && n > 1) g += '<path class="area" d="' + d + ' L' + xs(n - 1).toFixed(1) + ' ' + y(Math.max(lo, 0)).toFixed(1) + ' L' + xs(0).toFixed(1) + ' ' + y(Math.max(lo, 0)).toFixed(1) + 'Z" fill="' + s.col + '"/>';
      g += '<path class="ln" style="--s:' + si + '" d="' + d + '" pathLength="1" stroke="' + s.col + '"/>';
      g += pts.map((p, i) => '<circle class="dot" style="--i:' + i + ';--n:' + n + ';--s:' + si + '" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.6" fill="' + s.col + '"><title>' + tblEsc(labels[i] + ' · ' + s.name + ': ' + tblFmt(s.vals[i])) + '</title></circle>').join('');
    });
    labels.forEach((l, i) => { if (i % step === 0) g += '<text class="xl" x="' + xs(i).toFixed(1) + '" y="' + (H - 10) + '">' + tblEsc(tblCut(l, chars)) + '</text>'; });
    return '<svg class="sx-tbl-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Line graph">' + g + '</svg>';
  }
  labels.forEach((l, i) => { if (i % step === 0) g += '<text class="xl" x="' + (pl + gw * (i + .5)).toFixed(1) + '" y="' + (H - 10) + '">' + tblEsc(tblCut(l, chars)) + '</text>'; });
  return '<svg class="sx-tbl-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Bar graph">' + g + '</svg>';
}
function tblPie(it, labels, s, W) {
  const H = 230, cx = W / 2, cy = H / 2, R = 98, vals = s.vals.map(v => Math.max(0, v)), tot = vals.reduce((a, v) => a + v, 0);
  if (!tot) return '<svg class="sx-tbl-svg" viewBox="0 0 ' + W + ' ' + H + '"><text class="xl" x="' + cx + '" y="' + cy + '">Nothing above zero to share out</text></svg>';
  const P = a => [cx + R * Math.sin(a), cy - R * Math.cos(a)];
  let a = 0, g = '', t = '';
  vals.forEach((v, i) => { if (!v) return;
    const a2 = a + v / tot * Math.PI * 2, mid = (a + a2) / 2, col = TBL_INK[i % TBL_INK.length], [x1, y1] = P(a), [x2, y2] = P(a2);
    const d = v === tot ? 'M' + cx + ' ' + (cy - R) + ' A' + R + ' ' + R + ' 0 1 1 ' + (cx - .01) + ' ' + (cy - R) + 'Z'
      : 'M' + cx + ' ' + cy + ' L' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' A' + R + ' ' + R + ' 0 ' + (a2 - a > Math.PI ? 1 : 0) + ' 1 ' + x2.toFixed(2) + ' ' + y2.toFixed(2) + 'Z';
    g += '<path class="sl" style="--dx:' + (Math.sin(mid) * 6).toFixed(1) + 'px;--dy:' + (-Math.cos(mid) * 6).toFixed(1) + 'px" d="' + d + '" fill="' + col + '"><title>' + tblEsc(labels[i] + ': ' + tblFmt(s.vals[i]) + ' (' + Math.round(v / tot * 100) + '%)') + '</title></path>';
    if (v / tot >= .07) t += '<text class="pl" x="' + (cx + Math.sin(mid) * R * .64).toFixed(1) + '" y="' + (cy - Math.cos(mid) * R * .64 + 4).toFixed(1) + '">' + Math.round(v / tot * 100) + '%</text>';
    a = a2; });
  const mid = 'tm' + String(it.id).replace(/\W/g, '');
  const mask = '<mask id="' + mid + '"><circle class="sweep" cx="' + cx + '" cy="' + cy + '" r="' + (R / 2 + 4) + '" fill="none" stroke="#fff" stroke-width="' + (R + 12) + '" pathLength="1" transform="rotate(-90 ' + cx + ' ' + cy + ')"/></mask>';
  return '<svg class="sx-tbl-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Pie graph of ' + tblEsc(s.name) + '"><defs>' + mask + '</defs><g class="pie" mask="url(#' + mid + ')">' + g + '</g><g class="pls">' + t + '</g></svg>';
}

/* ---------- a new table ---------- */
function addTable() {
  const p = freeSpot(); deskMark(); const id = 't' + Date.now();
  B_().items.push({ id, type: 'tbl', board: B_().cur, x: Math.round(p.x), y: Math.round(p.y), w: 360, view: 'table', rows: [['Item', 'Value'], ['First', '3'], ['Second', '5'], ['Third', '4']] });
  save(); drawBoard(); select(id); deskLand(id, true);
  setTimeout(() => tblFocus(itemOf(id) || {}, 0, 0), 60); // (the pen in its first cell, the words picked so typing replaces them)
}
