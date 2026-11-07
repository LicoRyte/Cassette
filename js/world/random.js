/* Solarist: Seeded random numbers and small helpers for picking from lists and nudging colours. */
'use strict';

function rng(seed) { // mulberry32
  let a = Math.imul((seed >>> 0) ^ 0x9E3779B9, 0x85EBCA6B) >>> 0; // scramble the seed so neighbouring seeds look nothing alike
  const next = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = 0; i < 6; i++) next();
  return next;
}

function weighted(r, list) { const total = list.reduce((a, x) => a + x[1], 0); let x = r() * total; for (const it of list) { if ((x -= it[1]) < 0) return it[0]; } return list[0][0]; }
const pick = (r, a) => a[Math.floor(r() * a.length)];
const between = (r, a, b) => a + r() * (b - a);
function shiftHex(hex, deg, light) { // nudge a colour's hue and lightness for slight variation
  const n = parseInt(hex.slice(1), 16), R = (n >> 16 & 255) / 255, G = (n >> 8 & 255) / 255, B = (n & 255) / 255;
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B); let h = 0, s = 0; const l0 = (mx + mn) / 2, d = mx - mn;
  if (d) { s = l0 > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === R ? (G - B) / d + (G < B ? 6 : 0) : mx === G ? (B - R) / d + 2 : (R - G) / d + 4; h *= 60; }
  h = (h + deg + 360) % 360; const l = Math.max(0, Math.min(1, l0 + light));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(h / 60 % 2 - 1)), m = l - c / 2;
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r1, g1, b1].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}
