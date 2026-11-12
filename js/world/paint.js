/* Solarist: Colours and pixel art: the palette, hull colours, the satellite sprite and the planet portrait painter. */
'use strict';

const HULL_COLORS = { Lilac: '#c7cfcc', White: '#ebede9', Sky: '#a4dddb', Peach: '#e8c170', Rose: '#df84a5', Lime: '#a8ca58', Indigo: '#4f8fba', Crimson: '#cf573c', Steel: '#819796', Copper: '#be772b', Navy: '#3c5e8b' }; // Steel, Copper and Navy are only sold at Interplanetary Stations
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); return snap([(n >> 16 & 255) * f, (n >> 8 & 255) * f, (n & 255) * f]); };

// the ship's satellite: a tiny pixel sprite (made once)
let satUrl = null;
function satSprite() {
  if (satUrl) return satUrl;
  const rows = ['....r....', '....g....', 'bb.ggg.bb', 'bbbgwgbbb', 'bb.ggg.bb', '...g.g...'], col = { b: '#3c5e8b', g: '#c7cfcc', w: '#ebede9', r: '#cf573c' };
  const cv = document.createElement('canvas'); cv.width = 9; cv.height = 6; const x = cv.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((c, i) => { if (col[c]) { x.fillStyle = col[c]; x.fillRect(i, y, 1, 1); } }));
  satUrl = cv.toDataURL(); return satUrl;
}

// the planet palette: every pixel of every portrait is snapped to one of these 32 colours
// Resurrect 64 by Kerrie Lake (lospec.com/palette-list/resurrect-64): every planet is painted with these colours
const RES64 = ['#2e222f', '#3e3546', '#625565', '#966c6c', '#ab947a', '#694f62', '#7f708a', '#9babb2', '#c7dcd0', '#ffffff', '#6e2727', '#b33831', '#ea4f36', '#f57d4a', '#ae2334', '#e83b3b',
  '#fb6b1d', '#f79617', '#f9c22b', '#7a3045', '#9e4539', '#cd683d', '#e6904e', '#fbb954', '#4c3e24', '#676633', '#a2a947', '#d5e04b', '#fbff86', '#165a4c', '#239063', '#1ebc73',
  '#91db69', '#cddf6c', '#313638', '#374e4a', '#547e64', '#92a984', '#b2ba90', '#0b5e65', '#0b8a8f', '#0eaf9b', '#30e1b9', '#8ff8e2', '#323353', '#484a77', '#4d65b4', '#4d9be6',
  '#8fd3ff', '#45293f', '#6b3e75', '#905ea9', '#a884f3', '#eaaded', '#753c54', '#a24b6f', '#cf657f', '#ed8099', '#831c5d', '#c32454', '#f04f78', '#f68181', '#fca790', '#fdcbb0'];
const PALETTE = RES64.map(h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }); // the portrait painter snaps to this
// the palette as colour families, each a ramp from dark to light. A world picks families its settings like (and sometimes a wild one)
const FAM = {
  ash: ['#2e222f', '#3e3546', '#625565', '#966c6c', '#ab947a'], fog: ['#694f62', '#7f708a', '#9babb2', '#c7dcd0', '#ffffff'],
  ember: ['#6e2727', '#b33831', '#ea4f36', '#f57d4a'], fire: ['#ae2334', '#e83b3b', '#fb6b1d', '#f79617', '#f9c22b'], clay: ['#7a3045', '#9e4539', '#cd683d', '#e6904e', '#fbb954'],
  moss: ['#4c3e24', '#676633', '#a2a947', '#d5e04b', '#fbff86'], leaf: ['#165a4c', '#239063', '#1ebc73', '#91db69', '#cddf6c'], sage: ['#313638', '#374e4a', '#547e64', '#92a984', '#b2ba90'],
  sea: ['#0b5e65', '#0b8a8f', '#0eaf9b', '#30e1b9', '#8ff8e2'], sky: ['#323353', '#484a77', '#4d65b4', '#4d9be6', '#8fd3ff'], dusk: ['#45293f', '#6b3e75', '#905ea9', '#a884f3', '#eaaded'],
  rose: ['#753c54', '#a24b6f', '#cf657f', '#ed8099'], bloom: ['#831c5d', '#c32454', '#f04f78', '#f68181', '#fca790', '#fdcbb0'],
};
// which families suit a world: s is its settings (heat, water, life, age from 0 to 1)
function famWeights(s, type) {
  const cold = Math.max(0, .45 - s.heat) * 2.2, hot = Math.max(0, s.heat - .6) * 2.5, mild = 1 - Math.min(1, Math.abs(s.heat - .52) * 4), wet = s.water, dry = 1 - s.water, life = s.life;
  const w = { ash: .4 + dry * .4 + s.age * .5, fog: .3 + cold * 1.2, ember: hot * 1.2, fire: hot * 1.5, clay: .2 + dry * .8 + hot * .5, moss: .2 + dry * .4 + life * .5,
    leaf: life * 2 * mild, sage: .2 + life * 1.2, sea: wet * 1.5 + cold * .5, sky: wet * 1.2 + cold * 1.4, dusk: .35 + cold * .4, rose: .3, bloom: .25 + (type === 'Fungal' || type === 'Crystal' ? 2 : 0) };
  if (type === 'Lava' || type === 'Shattered') { w.fire += 3; w.ember += 2; w.ash += 1; }
  if (type === 'Ice' || type === 'Ice giant' || type === 'Tundra') { w.fog += 1.5; w.sky += 1; w.sea += .8; }
  if (type === 'Toxic') { w.moss += 2; w.leaf += 1; }
  return Object.entries(w).map(([k, v]) => [k, Math.max(.05, v)]);
}
// a world's colours: 4 for its surface (light to dark), 2 for its land, and a ring colour
function pickLook(r, s, type, boost) { // boost: extra weight for some families (a star region's taste)
  const fw = famWeights(s, type).map(([k, v]) => [k, v + ((boost || {})[k] || 0)]), wild = r() < .22; // now and then, anything goes
  const one = skip => { const list = fw.filter(([k]) => k !== skip).map(([k, v]) => [k, wild ? 1 : v]); return weighted(r, list); };
  const a = one(), b = one(a), A = FAM[a], B = FAM[b], n = A.length;
  const top = Math.min(n - 1, 2 + Math.floor(r() * (n - 2))); // how light the brightest colour goes
  const pal = [A[top], A[Math.max(1, top - 1)], r() < .5 ? B[Math.min(B.length - 1, 2)] : A[Math.max(1, top - 2)], r() < .6 ? A[0] : B[0]];
  const land = [B[Math.min(B.length - 1, 3)], B[Math.min(B.length - 1, 2)]];
  const rc = FAM[one()]; return { pal, land, ringCol: rc[Math.min(rc.length - 1, 3)], fam: [a, b] };
}
const snapCache = new Map();
function snap(c) { // nearest palette colour (weighted RGB distance, close to how eyes see it)
  const r = Math.max(0, Math.min(255, c[0] | 0)), g = Math.max(0, Math.min(255, c[1] | 0)), b = Math.max(0, Math.min(255, c[2] | 0)), key = (r >> 2) << 12 | (g >> 2) << 6 | (b >> 2);
  let hit = snapCache.get(key); if (hit) return hit;
  let best = PALETTE[0], bd = Infinity;
  for (const q of PALETTE) { const rm = (r + q[0]) / 2, dr = r - q[0], dg = g - q[1], db = b - q[2]; const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db; if (d < bd) { bd = d; best = q; } }
  snapCache.set(key, best); return best;
}
/* ---------- pixel-art planet painter (deterministic, so the same planet always looks the same) ---------- */
const paintCache = new Map();
function lookOf(p) { // worlds saved before the palette change: redo their colours from the seed (same shapes, new colours)
  const L = p.look; if (L.pv === 3) return L; // older worlds: same shapes, colours redone for the current palette
  if (L._nl) return L._nl;
  const T = TYPES[p.type]; let nl = null;
  try { const q = makePlanet(p.seed, p.num, p.lucky, 0); if (q.type === p.type) nl = Object.assign({}, L, { pal: q.look.pal, land: q.look.land, ringCol: q.look.ringCol }); } catch (e) { /* fall through */ }
  if (!nl) nl = Object.assign({}, L, { pal: T.pal.slice(), land: T.land ? T.land.slice() : L.land, ringCol: '#819796' });
  Object.defineProperty(L, '_nl', { value: nl, enumerable: false }); return nl;
}
function paint(p, size) {
  const key = p.seed + ':' + size; if (paintCache.has(key)) return paintCache.get(key);
  const S = size, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const x = cv.getContext('2d'), img = x.createImageData(S, S), L = lookOf(p), r = rng(L.noise); const sr = rng((L.noise ^ 0x51A4) >>> 0);
  // value noise
  const G = 16, grid = Array.from({ length: (G + 1) * (G + 1) }, () => r());
  const vn = (u, v) => { u = ((u % G) + G) % G; v = Math.max(0, Math.min(G - .001, v)); const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, su = fu * fu * (3 - 2 * fu), sv = fv * fv * (3 - 2 * fv); const g = (a, b) => grid[(b % (G + 1)) * (G + 1) + (a % G)]; const a = g(i, j), b2 = g(i + 1, j), c = g(i, j + 1), d = g(i + 1, j + 1); return a + (b2 - a) * su + (c - a) * sv + (a - b2 - c + d) * su * sv; };
  const fbm = (u, v) => vn(u, v) * .55 + vn(u * 2.1, v * 2.1) * .28 + vn(u * 4.3, v * 4.3) * .17;
  const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const pal = L.pal.map(hex), land = L.land && L.land.map(hex);
  const R0 = S * (p.rings ? .27 : .38), cx = S / 2, cy = S / 2, ringR = R0 * 1.75; // ringed planets are drawn smaller so the rings fit
  const put = (i, c0, a = 255) => { const c = snap(c0); img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = a; };
  const ringAt = (px, py, front) => { // a flat, tilted ellipse
    if (!p.rings) return null;
    const dx = px - cx, dy = py - cy, ct = Math.cos(L.tilt), st = Math.sin(L.tilt);
    const rx = dx * ct + dy * st, ry = (-dx * st + dy * ct) / .28;
    const d = Math.sqrt(rx * rx + ry * ry);
    if (d < R0 * 1.28 || d > ringR) return null;
    if (front !== (ry > 0)) return null;
    const band = Math.floor((d - R0 * 1.28) / (ringR - R0 * 1.28) * 5);
    return band === 2 ? null : (band % 2 ? .75 : 1);
  };
  const ringCol = hex(L.ringCol);
  for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
    const i = (py * S + px) * 4, dx = (px + .5 - cx) / R0, dy = (py + .5 - cy) / R0, d2 = dx * dx + dy * dy;
    const back = ringAt(px + .5, py + .5, false);
    if (d2 > 1) { if (back) put(i, ringCol.map(c => c * back * .8)); continue; }
    const dz = Math.sqrt(1 - d2);
    const lon = Math.atan2(dx, dz) / Math.PI * G * .5 + 3, lat = dy;
    let c;
    if (L.bands) { // gas / ice giants: wavy cloud bands
      const n = fbm(lon * .6, (lat + 1) * 3) * .35 + (Math.sin((lat * 7 + fbm(lon, (lat + 1) * 4) * 2.2)) * .5 + .5) * .65;
      c = pal[Math.min(3, Math.floor(n * 4))];
    } else {
      const n = fbm(lon, (lat + 1) * 4);
      if (land) c = n > .56 ? land[n > .66 ? 1 : 0] : pal[n > .46 ? 1 : n > .38 ? 2 : 3];
      else if (L.lava) c = n > .62 ? pal[0] : n > .55 ? pal[1] : n > .4 ? pal[2] : pal[3];
      else c = pal[Math.min(3, Math.floor((1 - n) * 4.2))];
      if (L.locked) { const night = Math.max(0, Math.min(1, (dx + .2) * 1.8)); c = c.map((v, k) => v * (1 - night) + [31, 16, 42][k] * night); }
      if (!L.lava && !L.locked && Math.abs(lat) > .8 && (land || L.clouds)) c = [255, 255, 255]; // ice caps
      if (L.clouds && fbm(lon * 1.7 + 9, (lat + 1) * 6) > .62) c = [255, 255, 255];
    }
    // light from the upper left, in 4 chunky steps with a little dithering
    const lightDot = Math.max(0, -dx * .55 - dy * .45 + dz * .7);
    let shade = lightDot + ((px + py) % 2 ? .04 : -.04);
    shade = shade > .75 ? 1.12 : shade > .45 ? 1 : shade > .2 ? .72 : .45;
    if (L.lava && c === pal[0]) shade = Math.max(shade, 1);
    if (L.sparkle && sr() < .035) { c = [255, 255, 255]; shade = Math.max(shade, .9); } // glints of diamond and crystal
    put(i, c.map(v => Math.min(255, v * shade)));
    const front = ringAt(px + .5, py + .5, true); if (front) put(i, ringCol.map(v => v * front));
  }
  // rings in front of the planet's disk outside it too
  for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) { const i = (py * S + px) * 4; const f = ringAt(px + .5, py + .5, true); if (f && img.data[i + 3] === 0) put(i, ringCol.map(v => v * f)); }
  // dark outline
  const out = new Uint8ClampedArray(img.data);
  for (let py = 1; py < S - 1; py++) for (let px = 1; px < S - 1; px++) {
    const i = (py * S + px) * 4; if (img.data[i + 3]) continue;
    if (img.data[i + 4 + 3] || img.data[i - 4 + 3] || img.data[i + S * 4 + 3] || img.data[i - S * 4 + 3]) { out[i] = 18; out[i + 1] = 14; out[i + 2] = 35; out[i + 3] = 255; }
  }
  img.data.set(out); x.putImageData(img, 0, 0);
  const url = cv.toDataURL(); cv.width = cv.height = 0;
  paintCache.set(key, url); if (paintCache.size > 200) paintCache.delete(paintCache.keys().next().value);
  return url;
}
