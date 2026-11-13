/* Cassette Timer: what's saved, and the timer itself. */
'use strict';

/* ---------- saved in this browser ---------- */
// (the key is Solarist's: Cassette Timer grew out of it, and keeping it keeps your settings, desk and counts)
const KEY = 'lico-solarist';
const MODES = { focus: 'Focus', short: 'Short break', long: 'Long break' };
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
let S = { set: { focus: 25, short: 5, long: 15, every: 4 }, run: null, cycle: 0, day: today(), todayN: 0, total: 0, minutes: 0, fc: { n: 0, broken: false }, opts: {} };
try {
  const s = JSON.parse(store.get(KEY) || 'null');
  if (s) S = Object.assign(S, s, { set: Object.assign(S.set, s.set || {}), opts: Object.assign({}, s.opts || {}), fc: Object.assign({ n: 0, broken: false }, s.fc || {}) });
} catch (e) { /* a broken save starts fresh */ }
// what Cassette Timer keeps; anything else in an older save (worlds, crew, stories...) is put aside once, untouched,
// under its own key, so the space game (git tag space-game) could still pick it up
if (S.found && !store.get(KEY + '-space')) store.set(KEY + '-space', store.get(KEY));
const KEEP = ['set', 'run', 'cycle', 'day', 'todayN', 'total', 'minutes', 'fc', 'opts', 'board', 'intent', 'music', 'recalls'];
Object.keys(S).forEach(k => { if (!KEEP.includes(k)) delete S[k]; });
['reader', 'intro', 'aboard', 'typeSnd'].forEach(k => delete S.opts[k]);
let wiping = false;
const save = () => { if (wiping) return; store.set(KEY, JSON.stringify(S)); };
const rollDay = () => { if (S.day !== today()) { S.day = today(); S.todayN = 0; } };
rollDay(); save();

/* ---------- the timer ---------- */
let mode = (S.run && MODES[S.run.mode] && S.run.mode) || 'focus';
let running = false, endAt = 0, tickT = 0;
const length = m => S.set[m] * 60000;
let left = (S.run && S.run.left) || length(mode);
const fmt = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
function remaining() { return running ? Math.max(0, endAt - Date.now()) : left; }
function persistRun() { S.run = { mode, left: remaining(), endAt: running ? endAt : 0, running }; save(); }
function setMode(m) { mode = m; left = length(m); draw(); persistRun(); }
function start() { if (running) return; notifyAsk(); if (left <= 0) left = length(mode); running = true; endAt = Date.now() + left; persistRun(); loop(); draw(); }
function pause() { if (!running) return; left = remaining(); running = false; clearInterval(tickT); persistRun(); draw(); }
function reset() { running = false; clearInterval(tickT); left = length(mode); persistRun(); draw(); }
function skip() { running = false; clearInterval(tickT); S.fc.broken = true; if (mode === 'focus') toBreak(); else setMode('focus'); persistRun(); }
function toBreak() { setMode(S.cycle > 0 && S.cycle % S.set.every === 0 ? 'long' : 'short'); }
function loop() { clearInterval(tickT); tickT = setInterval(() => { if (remaining() <= 0) finish(); else drawClock(); }, 250); }
// the end of a session or a break: a chime, a note if you're elsewhere, and on to the next part
function finish(quiet) {
  clearInterval(tickT); running = false; left = 0;
  if (mode === 'focus') {
    rollDay(); S.total++; S.todayN++; S.cycle++; S.minutes += S.set.focus; S.fc.n++;
    if (!quiet && hooks.tada) hooks.tada(); notify('Session done. Time for a break.');
    toBreak();
  } else {
    if (!quiet && hooks.ding) hooks.ding(); notify('Break over. Ready when you are.');
    const wasLong = mode === 'long'; setMode('focus');
    if (wasLong) S.fc = { n: 0, broken: false }; // a new cycle
  }
  persistRun(); draw();
}
