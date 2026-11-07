/* Solarist: Core: the el() helper, loading and saving your game (S), and the timer's state. */
'use strict';

const KEY = 'lico-solarist', OLD_KEY = 'lico-archivist'; // where the save lives in this browser
const MODES = { focus: 'Study', short: 'Short break', long: 'Long break' };
// what shell.js passed to Solarist.mount (see js/boot.js)
const { root, econ, items, camp } = SOLARIST_MOUNT, hooks = SOLARIST_MOUNT.hooks || {};

const CAMP = camp && Array.isArray(camp.logs) && camp.logs.length ? camp : null;
applyItems(items);
const E = mergeEcon(ECON, econ);
const el = (tag, attrs, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) { if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); }
  for (const k of kids.flat()) { if (k == null || k === false) continue; e.append(k.nodeType ? k : document.createTextNode(String(k))); }
  return e;
};
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

/* ---------- saved state (settings, stats and a running timer carry over from Archivist) ---------- */
let S = { found: [], tuned: 0, mission: 0, events: [], fc: { n: 0, broken: false }, total: 0, minutes: 0, day: today(), todayN: 0, cycle: 0, set: { focus: 25, short: 5, long: 15, every: 4 }, run: null };
try {
  let s = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (!s) { const old = JSON.parse(localStorage.getItem(OLD_KEY) || 'null'); if (old) { s = { total: old.total, minutes: old.minutes, day: old.day, todayN: old.todayN, cycle: old.cycle, set: old.set, run: old.run, found: [] }; } }
  if (s) S = Object.assign(S, s, { set: Object.assign(S.set, s.set || {}), found: Array.isArray(s.found) ? s.found : [] });
  localStorage.removeItem(OLD_KEY);
} catch (e) {}
// a world the old probe settled on becomes a Listening Post that has already sent its deep-scan findings
S.found.forEach(({ p }) => {
  if (p.deep && !p.post) {
    const d = p.deep, at = d.at || Date.now(), reports = [{ k: 'core', t: 'Core scan complete: ' + d.core.charAt(0).toLowerCase() + d.core.slice(1) + '.', at, day: 1 }];
    if (d.species) reports.push({ k: 'species', t: 'Native species identified and named: the ' + d.species + '.', at, day: 1 });
    if (d.oddX) reports.push({ k: 'odd', t: 'Anomaly studied. The ' + p.odd.replace(/^(a|an|the) /, '') + ' is ' + d.oddX + '.', at, day: 1 });
    p.post = { built: at, reports, core: d.core, species: d.species, oddX: d.oddX };
  }
  delete p.deep; delete p.probed; delete p.boosted;
});
if (S.probe) { if (!S.tuned) S.tuned = S.probe.num; delete S.probe; }
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
const tunedP = () => { const f = S.tuned && byNum(S.tuned); return f && f.p.post ? f.p : null; };
