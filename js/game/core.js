/* Solarist: Core: the el() helper, loading and saving your game (S), and the timer's state. */
'use strict';

const KEY = 'lico-solarist', OLD_KEY = 'lico-archivist'; // where the save lives in this browser
const MODES = { focus: 'Study', short: 'Short break', long: 'Long break' };
// what shell.js passed to Solarist.mount (see js/boot.js)
const { root, econ, items } = SOLARIST_MOUNT, hooks = SOLARIST_MOUNT.hooks || {};

applyItems(items);
const E = mergeEcon(ECON, econ);
// plain text on screen: emoji are dropped wherever text is drawn (saved logs keep them); these marks stay
const PLAIN_KEEP = new Set(['★', '☆', '✎', '✓', '↔', '◂', '▸']);
const plain = s => String(s).replace(/\p{Extended_Pictographic}[\uFE0F\u200D\u{1F3FB}-\u{1F3FF}\p{Extended_Pictographic}]*\s?/gu, m => PLAIN_KEEP.has(m.trim()) ? m : '').replace(/\uFE0F/g, '');
const el = (tag, attrs, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) { if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); }
  for (const k of kids.flat()) { if (k == null || k === false) continue; e.append(k.nodeType ? k : document.createTextNode(plain(k))); }
  return e;
};
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

/* ---------- saved state (settings, stats and a running timer carry over from Archivist) ---------- */
let S = { found: [], mission: 0, events: [], fc: { n: 0, broken: false }, total: 0, minutes: 0, day: today(), todayN: 0, cycle: 0, set: { focus: 25, short: 5, long: 15, every: 4 }, run: null };
try {
  let s = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (!s) { const old = JSON.parse(localStorage.getItem(OLD_KEY) || 'null'); if (old) { s = { total: old.total, minutes: old.minutes, day: old.day, todayN: old.todayN, cycle: old.cycle, set: old.set, run: old.run, found: [] }; } }
  if (s) S = Object.assign(S, s, { set: Object.assign(S.set, s.set || {}), found: Array.isArray(s.found) ? s.found : [] });
  localStorage.removeItem(OLD_KEY);
} catch (e) {}
S.found.forEach(({ p }) => { delete p.deep; delete p.probed; delete p.boosted; }); // leftovers from the old probe
delete S.probe;
S.found.forEach(({ p }) => { if (!p.x) p.x = makeExtra(p); }); // worlds found before the extended survey existed
let wiping = false;
const save = () => { if (wiping) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
save();
const rollDay = () => { if (S.day !== today()) { S.day = today(); S.todayN = 0; } };
rollDay();

let mode = (S.run && S.run.mode) || 'focus';
let running = false, endAt = 0, left = 0, tickT = 0;
const length = m => S.set[m] * 60000;
left = (S.run && S.run.left) || length(mode);
const byNum = n => S.found.find(f => f.p.num === n);
const nm = p => p.custom || p.name;
