/* Solarist: drawings on the desk, the shapes themselves. Every mark looks drawn by hand: lines bow a little and
   overshoot their ends, circles don't quite close, arrows get two quick strokes for a head. The wobble comes from a
   seed saved with each stroke, so a drawing looks the same every time you open it. js/ui/draw-mode.js is the pen. */
'use strict';

// the inks: from the palette, plus a dark one for writing on notes
const INKS = [['cream', '#ffffe4'], ['amber', '#ffb762'], ['coral', '#ff6157'], ['yellow', '#ffd832'], ['mint', '#77d6c1'], ['green', '#9cb93b'], ['ink', '#34111f']];
const inkOf = k => (INKS.find(i => i[0] === k) || INKS[1])[1];

function drawRng(seed) { // a small seeded random (mulberry32)
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const f1 = n => Math.round(n * 10) / 10;
function smoothD(pts) { // through the points, softly
  if (!pts.length) return '';
  if (pts.length === 1) return 'M' + f1(pts[0][0]) + ' ' + f1(pts[0][1]) + ' l0.1 0';
  let d = 'M' + f1(pts[0][0]) + ' ' + f1(pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) { const [x, y] = pts[i], [nx, ny] = pts[i + 1]; d += ' Q' + f1(x) + ' ' + f1(y) + ' ' + f1((x + nx) / 2) + ' ' + f1((y + ny) / 2); }
  const l = pts[pts.length - 1]; return d + ' L' + f1(l[0]) + ' ' + f1(l[1]);
}
function roughLine(a, b, r) { // a straight line by hand: a slight bow, ends that overshoot a touch
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, ux = dx / len, uy = dy / len;
  const o = (r() - .5) * Math.min(8, len * .03), e1 = (r() - .3) * 3, e2 = (r() - .3) * 3;
  const A = [a[0] - ux * e1, a[1] - uy * e1], B = [b[0] + ux * e2, b[1] + uy * e2], mx = (A[0] + B[0]) / 2 + nx * o, my = (A[1] + B[1]) / 2 + ny * o;
  return 'M' + f1(A[0]) + ' ' + f1(A[1]) + ' Q' + f1(mx) + ' ' + f1(my) + ' ' + f1(B[0]) + ' ' + f1(B[1]);
}
// the marks one stroke leaves: [{ d, w, o }] (path, width, opacity)
function strokeMarks(st) {
  const r = drawRng(st.seed || 1), s = st.s || 4, p = st.p || [];
  const m = (d, w, o) => ({ d, w: w * s, o });
  if (!p.length) return [];
  const a = p[0], b = p[p.length - 1];
  if (st.t === 'pen') return [m(smoothD(p), 1, 1), m(smoothD(p.map(([x, y]) => [x + .5, y + .35])), .5, .3)]; // a second, fainter pass: ink, not vector
  if (st.t === 'line') return [m(roughLine(a, b, r), 1, 1), m(roughLine(a, b, r), .5, .4)];
  if (st.t === 'arrow') {
    const c = p.length === 3 ? p[1] : null;
    const body = c ? 'M' + f1(a[0]) + ' ' + f1(a[1]) + ' Q' + f1(c[0]) + ' ' + f1(c[1]) + ' ' + f1(b[0]) + ' ' + f1(b[1]) : roughLine(a, b, r);
    const from = c || a, ang = Math.atan2(b[1] - from[1], b[0] - from[0]), len = Math.hypot(b[0] - a[0], b[1] - a[1]), hl = Math.min(14 + s * 2.2, len * .4);
    const head = k => { const an = ang + Math.PI + k * (.46 + (r() - .5) * .1); return roughLine(b, [b[0] + Math.cos(an) * hl, b[1] + Math.sin(an) * hl], r); };
    return [m(body, 1, 1), m(head(1), 1, 1), m(head(-1), 1, 1)];
  }
  if (st.t === 'circle') {
    const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2, rx = Math.abs(b[0] - a[0]) / 2 || 1, ry = Math.abs(b[1] - a[1]) / 2 || 1;
    const t0 = r() * Math.PI * 2, span = Math.PI * 2 * (1.06 + r() * .07), n = 30, w1 = r() * 6, w2 = .02 + r() * .02, pts = [];
    for (let i = 0; i <= n; i++) { const t = t0 + span * i / n, k = 1 + Math.sin(t * 2 + w1) * w2 + (i / n) * .05; pts.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k]); } // it doesn't quite close
    return [m(smoothD(pts), 1, 1)];
  }
  if (st.t === 'box') {
    const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
    return [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]].map(([ax, ay, bx, by]) => m(roughLine([ax, ay], [bx, by], r), 1, 1));
  }
  return [];
}
// a drawing on the desk: an SVG of its strokes, each with a wide invisible edge so it's easy to grab
function drawSvg(it, live) {
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', live ? 'sx-draft' : 'sx-dsvg'); if (!live) { svg.setAttribute('width', Math.max(1, it.w)); svg.setAttribute('height', Math.max(1, it.h)); }
  (it.strokes || []).forEach((st, i) => strokeMarks(st).forEach(mk => {
    if (!live) { const hit = document.createElementNS(NS, 'path'); hit.setAttribute('d', mk.d); hit.setAttribute('class', 'sx-dhit'); hit.setAttribute('stroke-width', Math.max(14, mk.w + 10)); hit.dataset.i = i; svg.append(hit); }
    const p = document.createElementNS(NS, 'path'); p.setAttribute('d', mk.d); p.setAttribute('class', 'sx-dpath'); p.setAttribute('stroke', inkOf(st.c)); p.setAttribute('stroke-width', mk.w); if (mk.o < 1) p.setAttribute('opacity', mk.o);
    svg.append(p);
  }));
  return svg;
}
// where a stroke's points reach (in its own coordinates)
function strokeBox(st) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  (st.p || []).forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
  const pad = (st.s || 4) * 2 + (st.t === 'circle' ? Math.max(x1 - x0, y1 - y0) * .06 : 0) + 12;
  return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
}
// re-measure a drawing after strokes change: strokes come in in desk coordinates (abs), are stored relative to the drawing
function drawFit(it, abs) {
  if (!abs.length) { it.strokes = []; return; }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  abs.forEach(st => { const b = strokeBox(st); x0 = Math.min(x0, b.x0); y0 = Math.min(y0, b.y0); x1 = Math.max(x1, b.x1); y1 = Math.max(y1, b.y1); });
  it.x = Math.round(x0); it.y = Math.round(y0); it.w = Math.round(x1 - x0); it.h = Math.round(y1 - y0);
  it.strokes = abs.map(st => Object.assign({}, st, { p: st.p.map(([x, y]) => [f1(x - it.x), f1(y - it.y)]) }));
}
const drawAbs = it => (it.strokes || []).map(st => Object.assign({}, st, { p: st.p.map(([x, y]) => [x + it.x, y + it.y]) }));
