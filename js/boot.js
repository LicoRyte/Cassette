/* Cassie: boot. The desk (boards, notes, tables, strings) lives in the browser's database (IndexedDB), which can hold
   far more than the small storage the settings use (that one is about 5 MB, the database often many GB). Reading the
   database takes a moment, so this runs first: it reads the desk, then loads the app's files in order, so every file can
   still find the desk ready as it starts. The settings, the timer and the tapes stay in the small storage (js/state.js).
   Each workspace's desk is its own entry, 'ws:<id>'; the small storage says which is open (spaceCur).
   BOOT.ok: the database answered. BOOT.key: the entry read. BOOT.board: the desk it had (undefined if none).
   BOOT.put(board, key), BOOT.get(key) and BOOT.del(key) give promises. */
'use strict';
const BOOT = { ok: false, board: undefined, db: null, key: 'board' }; // ('board': the one desk of version 178, before workspaces)
try { const s = JSON.parse(localStorage.getItem('lico-solarist') || 'null'); if (s && s.spaceCur) BOOT.key = 'ws:' + s.spaceCur; } catch (e) { /* no small storage: the old name */ }
(function () {
  const FILES = ['app', 'state', 'front', 'screen', 'digits', 'feel', 'notes', 'typing', 'desk', 'table', 'hopper', 'export', 'boards',
    'clock', 'tape', 'music', 'radio', 'look', 'view', 'find', 'room', 'help', 'chrome', 'lively', 'flow', 'keep', 'tied', 'tidy', 'book', 'cards', 'deco', 'player', 'tips', 'start']; // (in this order: each can use what the ones before it made)
  let started = false;
  const start = () => { if (started) return; started = true; FILES.forEach(f => { const s = document.createElement('script'); s.src = 'js/' + f + '.js'; s.async = false; document.body.append(s); }); };
  const run = (mode, fn) => new Promise((res, rej) => {
    if (!BOOT.db) { rej(new Error('no database')); return; }
    let t; try { t = BOOT.db.transaction('kv', mode); } catch (e) { rej(e); return; }
    const q = fn(t.objectStore('kv')); t.oncomplete = () => res(q && q.result); t.onerror = t.onabort = () => rej(t.error || new Error('not saved'));
  });
  BOOT.put = (board, key) => run('readwrite', s => s.put(board, key));
  BOOT.get = key => run('readonly', s => s.get(key));
  BOOT.del = key => run('readwrite', s => s.delete(key));
  BOOT.clear = () => run('readwrite', s => s.clear()); // (Start over: every workspace)
  setTimeout(start, 4000); // (a database that never answers can't hold the app up: it starts without it, and keeps the desk where it was)
  try {
    const r = indexedDB.open('cassie-desk', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => {
      if (started) return; const db = r.result;
      try {
        const q = db.transaction('kv').objectStore('kv').get(BOOT.key);
        q.onsuccess = () => { BOOT.db = db; BOOT.board = q.result; BOOT.ok = true; start(); };
        q.onerror = start;
      } catch (e) { start(); }
    };
    r.onerror = start;
  } catch (e) { start(); } // (no database at all, as in some private windows)
})();
