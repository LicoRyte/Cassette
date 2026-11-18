/* Cassie: what's saved, and the timer itself. */
'use strict';

/* ---------- saved in this browser ---------- */
// (the key is Solarist's: Cassie grew out of it, and keeping it keeps your settings, desk and counts)
const KEY = 'lico-solarist';
const MODES = { focus: 'Focus', short: 'Short break', long: 'Long break' };
let S = { set: { focus: 25, short: 5, long: 15, every: 4 }, run: null, cycle: 0, fc: { n: 0, broken: false }, opts: {} };
try {
  const s = JSON.parse(store.get(KEY) || 'null');
  if (s) S = Object.assign(S, s, { set: Object.assign(S.set, s.set || {}), opts: Object.assign({}, s.opts || {}), fc: Object.assign({ n: 0, broken: false }, s.fc || {}) });
} catch (e) { /* a broken save starts fresh */ }
// what Cassie keeps; anything else in an older save (worlds, crew, stories...) is put aside once, untouched,
// under its own key, so the space game (git tag space-game) could still pick it up
if (S.found && !store.get(KEY + '-space')) store.set(KEY + '-space', store.get(KEY));
const KEEP = ['set', 'run', 'cycle', 'fc', 'opts', 'board', 'music', 'spaces', 'spaceCur']; // (what's not on this list is let go: old counts, old Remembered entries)
// the desk lives in the browser's database (js/boot.js read it before anything else started). An older save still has it
// here, in the small storage: it moves over on the first save, and leaves the small storage only once the database has it
const deskWas = S.boardIn === 'idb'; // (this save says the desk is in the database)
let deskInDB = deskWas && BOOT.ok && BOOT.board !== undefined;
if (deskInDB) S.board = BOOT.board;
// the database should have the desk but couldn't be read: the desk isn't saved at all until a reload, so nothing is lost
let deskLocked = deskWas && !deskInDB;
// workspaces: S.spaces lists them (name, counts, when opened and backed up), S.spaceCur is the one open; each desk is its
// own entry in the database, 'ws:<id>'. The one desk from before workspaces becomes the first, moving to its new entry
let deskMoveOld = null; // (the entry it's moving from, until the new one is written)
if (!Array.isArray(S.spaces)) S.spaces = [];
if (!S.spaceCur) { S.spaceCur = 'w' + Date.now().toString(36); if (deskInDB) { deskMoveOld = BOOT.key; deskInDB = false; } }
if (!S.spaces.some(w => w && w.id === S.spaceCur)) S.spaces.push({ id: S.spaceCur });
S.spaces = S.spaces.filter(w => w && w.id);
const spaceMe = () => S.spaces.find(w => w.id === S.spaceCur);
const deskKey = id => 'ws:' + (id || S.spaceCur);
spaceMe().opened = Date.now();
Object.keys(S).forEach(k => { if (!KEEP.includes(k)) delete S[k]; });
['reader', 'intro', 'aboard', 'typeSnd'].forEach(k => delete S.opts[k]);
let wiping = false;
let saveT = 0;
// save: the small things to the small storage, the desk to the database. It gives a promise that's done once the desk is
// written (so a reload can wait for it). Without a database (some private windows), the desk stays in the small storage
function save() {
  clearTimeout(saveT); saveT = 0; if (wiping) return Promise.resolve();
  const small = Object.assign({}, S); delete small.board;
  let desk = Promise.resolve();
  if (deskLocked) small.boardIn = 'idb';
  else if (BOOT.db) {
    spaceNote(spaceMe(), S.board);
    if (deskInDB || deskMoveOld) small.boardIn = 'idb'; else small.board = S.board; // (until the database has it, the old copy stays too)
    if (!deskInDB) { delete small.spaces; delete small.spaceCur; } // (and the next start still reads it from where it was)
    desk = BOOT.put(S.board, deskKey()).then(() => {
      saveWarn('db', false);
      if (!deskInDB) { deskInDB = true; const old = deskMoveOld; deskMoveOld = null; save(); if (old) BOOT.del(old).catch(() => {}); }
    }, e => { saveWarn('db', true, e); });
  } else small.board = S.board;
  saveWarn('small', !store.set(KEY, JSON.stringify(small)));
  return desk;
}
// what the front page lists for a workspace, from its desk
function spaceNote(w, b) {
  if (!w || !b) return; const items = Array.isArray(b.items) ? b.items : [];
  Object.assign(w, { name: b.name || w.name || 'My workspace', boards: Array.isArray(b.boards) ? b.boards.length : 1, notes: items.filter(i => i.type === 'note').length, things: items.length });
  if (b.backedAt) w.backedAt = b.backedAt;
}
// open another workspace: this one is saved first (and nothing moves if that didn't work), then Cassie starts again with it
function spaceGo(id) {
  const go = () => {
    if (saveFail.db) return;
    S.spaceCur = id; const w = spaceMe(); if (w) w.opened = Date.now();
    const small = Object.assign({}, S); delete small.board; small.boardIn = 'idb';
    if (!store.set(KEY, JSON.stringify(small))) { saveWarn('small', true); return; }
    wiping = true; sessionStorage.setItem('cassie-in', '1'); location.reload();
  };
  (deskLocked ? Promise.resolve() : save()).then(go, go);
}
// a new workspace with this desk (an empty one, or a backup's): written to the database, then opened
async function spaceNew(name, board) {
  if (!BOOT.db) { if (typeof deskToast === 'function') deskToast('This browser can only keep one workspace here (no database)'); return; }
  const id = 'w' + Date.now().toString(36);
  board = Object.assign({ boards: [{ id: 'main', name: 'My board' }], cur: 'main', items: [], links: [], gnames: {}, desk: 1, cam: { x: 0, y: 0, z: 1 } }, board || {}, { name });
  try { await BOOT.put(board, deskKey(id)); } catch (e) { saveWarn('db', true, e); return; }
  const w = { id }; spaceNote(w, board); S.spaces.push(w); spaceGo(id);
}
// a save that didn't fit (or a desk that couldn't be read): a banner says so, with Save a backup right in it
let saveBar = null;
const saveFail = { small: false, db: false };
function saveWarn(where, full) {
  saveFail[where] = full;
  if (!saveFail.small && !saveFail.db && !deskLocked) { if (saveBar) { saveBar.remove(); saveBar = null; } return; }
  if (saveBar || !document.body) return;
  const msg = deskLocked ? ' Your desk\'s storage couldn\'t be opened just now, so nothing on the desk is saved. Reload the page to try again.'
    : ' This browser\'s storage is full, so your latest changes aren\'t kept yet. Save a backup now, then make room (big notes, photos, old boards).';
  saveBar = el('div', { class: 'sx-savefail', role: 'alert' },
    el('b', {}, deskLocked ? 'Can\'t open your desk.' : 'Couldn\'t save.'), el('span', {}, msg),
    deskLocked ? el('button', { type: 'button', class: 'sx-savefail-b', onclick: () => location.reload() }, 'Reload')
      : el('button', { type: 'button', class: 'sx-savefail-b', onclick: () => { if (typeof deskExportBackup === 'function') deskExportBackup(); } }, 'Save a backup'),
    el('button', { type: 'button', class: 'sx-savefail-x', 'aria-label': 'Hide this', title: 'Hide this (it comes back if a save fails again)', onclick: () => { saveBar.remove(); saveBar = null; } }, '×'));
  document.body.append(saveBar);
}
// while you type: the whole desk is written once you pause, not on every letter (and right away if the page is going)
const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(save, 450); };
addEventListener('pagehide', () => { if (saveT) save(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && saveT) save(); });
save();

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
// it checks four times a second, but only redraws when the shown second changes (everything that watches the time wakes once a second)
let loopSec = -1;
function loop() { clearInterval(tickT); loopSec = -1; tickT = setInterval(() => { const r = remaining(); if (r <= 0) { finish(); return; } const s = Math.ceil(r / 1000); if (s !== loopSec) { loopSec = s; drawClock(); } }, 250); }
// the end of a session or a break: a chime, a note if you're elsewhere, and on to the next part
function finish(quiet) {
  clearInterval(tickT); running = false; left = 0;
  if (mode === 'focus') {
    S.cycle++; S.fc.n++;
    if (!quiet && hooks.tada) hooks.tada(); notify('Session done. Time for a break.');
    toBreak();
  } else {
    if (!quiet && hooks.ding) hooks.ding(); notify('Break over. Ready when you are.');
    const wasLong = mode === 'long'; setMode('focus');
    if (wasLong) S.fc = { n: 0, broken: false }; // a new cycle
  }
  persistRun(); draw();
}
document.documentElement.dataset.desk = S.opts && S.opts.desk === 'night' ? 'night' : 'white'; // (set early, so the desk doesn't flash the wrong colour while loading; white unless you chose dark; js/look.js)
