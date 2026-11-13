/* Cassette Timer: the tapes. Two sides of music: Side A plays while you focus, Side B on breaks. Drop audio files on
   a side in the Tapes drawer (or anywhere on the desk: they go to the side that's playing now). Music plays only while
   the timer runs, fades in and out, and changes sides when the deck flips. The files are kept in this browser
   (IndexedDB), like the photos. The drawer has a second tab, the Shelf (js/log.js). */
'use strict';

// the browser's music storage
const MUSIC = (() => {
  let dbp = null;
  const open = () => dbp = dbp || new Promise((res, rej) => { const r = indexedDB.open('cassette-music', 1); r.onupgradeneeded = () => r.result.createObjectStore('t'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const run = (m, fn) => open().then(db => new Promise((res, rej) => { const t = db.transaction('t', m), q = fn(t.objectStore('t')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }));
  return { put: (k, v) => run('readwrite', s => s.put(v, k)), get: k => run('readonly', s => s.get(k)), del: k => run('readwrite', s => s.delete(k)) };
})();
const M = S.music = Object.assign({ on: true, vol: .5, A: [], B: [], pos: { A: 0, B: 0 } }, S.music || {});
M.pos = Object.assign({ A: 0, B: 0 }, M.pos || {});
const sideNow = () => mode === 'focus' ? 'A' : 'B';
const SIDE_NAME = { A: 'Side A · focus', B: 'Side B · breaks' };

/* ---------- playing ---------- */
const player = new Audio(); player.preload = 'auto';
let playSide = null, playId = null, playUrl = null, fadeT = 0, musicBusy = false, musicAgain = false;
function fadeTo(v, ms, done) {
  clearInterval(fadeT); const from = player.volume, t0 = performance.now();
  fadeT = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / Math.max(1, ms)); player.volume = Math.max(0, Math.min(1, from + (v - from) * k)); if (k >= 1) { clearInterval(fadeT); if (done) done(); } }, 30);
}
async function loadTrack(side) { // the track this side is up to, ready in the player
  const list = M[side]; if (!list.length) return false;
  const i = (M.pos[side] || 0) % list.length, tr = list[i];
  if (playId === tr.id && playSide === side && playUrl) return true;
  let blob = null; try { blob = await MUSIC.get(tr.id); } catch (e) { /* gone */ }
  if (!blob) { list.splice(i, 1); save(); return loadTrack(side); } // (a file that's no longer stored)
  if (playUrl) URL.revokeObjectURL(playUrl);
  playUrl = URL.createObjectURL(blob); player.src = playUrl; playId = tr.id; playSide = side; return true;
}
player.addEventListener('ended', () => { const s = playSide; if (!s) return; M.pos[s] = ((M.pos[s] || 0) + 1) % Math.max(1, M[s].length); save(); playId = null; musicSync(true); });
async function musicSync(cont) {
  if (musicBusy) { musicAgain = true; return; } musicBusy = true; // (one at a time; a change that comes meanwhile runs right after)
  try {
    const side = sideNow(), want = running && M.on && soundOn && M[side].length > 0;
    if (!want) { if (!player.paused) fadeTo(0, 700, () => { player.pause(); musicDraw(); }); return; }
    if (playSide && playSide !== side && !player.paused) { // the deck flipped: let this side fade, then the other
      await new Promise(r => fadeTo(0, 500, r)); player.pause(); playId = null; playSide = null;
    }
    if (!(await loadTrack(side))) return;
    if (player.paused) { player.volume = cont ? M.vol : 0; try { await player.play(); } catch (e) { return; } }
    fadeTo(M.vol, cont ? 60 : 1400);
  } finally { musicBusy = false; musicDraw(); if (musicAgain) { musicAgain = false; setTimeout(() => musicSync(), 0); } }
}
new MutationObserver(() => musicSync()).observe(root, { attributes: true, attributeFilter: ['data-clock', 'data-mode'] });

/* ---------- adding and removing ---------- */
async function musicAdd(files, side) {
  const list = [...files].filter(f => /^audio\//.test(f.type) || /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i.test(f.name)); if (!list.length) return 0;
  let k = 0;
  for (const f of list) { const id = 'm' + Date.now() + '-' + k; try { await MUSIC.put(id, f); M[side].push({ id, name: f.name.replace(/\.[^.]+$/, '').slice(0, 80) }); k++; } catch (e) { /* storage full, or not allowed */ } }
  save(); musicDraw(); musicSync();
  if (typeof deskToast === 'function') deskToast(k ? 'Added ' + k + (k === 1 ? ' track' : ' tracks') + ' to ' + SIDE_NAME[side] : 'Could not keep those files');
  return k;
}
function musicRemove(side, id) {
  const i = M[side].findIndex(t => t.id === id); if (i < 0) return;
  M[side].splice(i, 1); if (M.pos[side] > i) M.pos[side]--; MUSIC.del(id).catch(() => {});
  if (playId === id) { player.pause(); playId = null; playSide = null; }
  save(); musicDraw(); musicSync();
}

/* ---------- the Tapes drawer: the Shelf (js/log.js) and the Music ---------- */
const tapesShelf = el('div', { class: 'sx-shelf' }), tapesMusic = el('div', { class: 'sx-mus' });
const tapesTabs = ['shelf', 'music'].map(k => el('button', { type: 'button', class: 'sx-tt', 'data-k': k, onclick: () => tapesOpen(k) }, k === 'shelf' ? 'Shelf' : 'Music'));
const tapesDrawer = el('div', { class: 'sx-tapes', role: 'dialog', 'aria-label': 'Tapes', hidden: true },
  el('div', { class: 'sx-tapes-h' }, ...tapesTabs, el('span', { class: 'sx-gap' }), el('button', { type: 'button', class: 'sx-tt sx-tx', 'aria-label': 'Close', title: 'Close (T or Esc)', onclick: () => tapesOpen(null) }, '×')),
  tapesShelf, tapesMusic);
document.body.append(tapesDrawer);
let tapesTab = 'shelf';
function tapesOpen(k) {
  if (k == null || (!tapesDrawer.hidden && k === true)) { tapesDrawer.hidden = true; tapesB.classList.remove('on'); return; }
  if (k !== true) tapesTab = k;
  tapesDrawer.hidden = false; tapesB.classList.add('on');
  tapesTabs.forEach(b => b.classList.toggle('on', b.dataset.k === tapesTab));
  tapesShelf.hidden = tapesTab !== 'shelf'; tapesMusic.hidden = tapesTab !== 'music';
  if (tapesTab === 'shelf' && typeof drawShelf === 'function') drawShelf(); else musicDraw();
}
const tapesB = deskBtn('Tapes', () => tapesOpen(tapesDrawer.hidden ? true : null), '', 'Music and your shelf of tapes (T)');
deskBar.querySelectorAll('.sx-ws-grp')[1].append(tapesB);
addEventListener('pointerdown', e => { if (!tapesDrawer.hidden && !e.target.closest('.sx-tapes, .sx-ws-bar, .sx-toast')) tapesOpen(null); }, true);
addEventListener('keydown', e => {
  const t = e.target; if (t && (t.isContentEditable || t.closest && t.closest('input, select, textarea')) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === 'KeyT') { e.preventDefault(); e.stopPropagation(); tapesOpen(tapesDrawer.hidden ? true : null); }
  else if (e.key === 'Escape' && !tapesDrawer.hidden) { e.preventDefault(); e.stopPropagation(); tapesOpen(null); }
}, true);

function musicDraw() {
  // the line under the clock: which side, and what's playing
  if (typeof sideTagNp !== 'undefined') { const tr = !player.paused && playSide && M[playSide].find(t => t.id === playId); sideTagNp.textContent = tr ? '▸ ' + tr.name : ''; }
  if (tapesDrawer.hidden || tapesTab !== 'music') return;
  const onB = el('button', { type: 'button', class: 'sx-ws-b' + (M.on ? ' on' : ''), 'aria-pressed': String(M.on), onclick: () => { M.on = !M.on; save(); musicSync(); musicDraw(); } }, M.on ? 'Music on' : 'Music off');
  const vol = el('input', { type: 'range', min: 0, max: 100, value: Math.round(M.vol * 100), 'aria-label': 'Music volume' });
  vol.addEventListener('input', () => { M.vol = vol.value / 100; if (!player.paused) { clearInterval(fadeT); player.volume = M.vol; } save(); });
  const side = s => {
    const file = el('input', { type: 'file', accept: 'audio/*', multiple: true, hidden: true });
    file.addEventListener('change', () => { musicAdd(file.files, s); file.value = ''; });
    const zone = el('div', { class: 'sx-mz', tabindex: '0', role: 'button', 'aria-label': 'Add music to ' + SIDE_NAME[s] }, 'Drop audio files here, or ', el('u', {}, 'choose some'), file);
    zone.addEventListener('click', e => { if (e.target !== file) file.click(); });
    zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } });
    zone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); zone.classList.add('drop'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drop'));
    zone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); zone.classList.remove('drop'); musicAdd(e.dataTransfer.files, s); });
    const cur = (M.pos[s] || 0) % Math.max(1, M[s].length);
    return el('section', { class: 'sx-ms' + (sideNow() === s ? ' now' : '') },
      el('h4', {}, el('b', {}, s === 'A' ? 'Side A' : 'Side B'), el('span', {}, s === 'A' ? 'plays while you focus' : 'plays on breaks')),
      M[s].length ? el('ol', { class: 'sx-trks' }, ...M[s].map((t, i) => el('li', { class: (playId === t.id && !player.paused ? 'play' : i === cur ? 'next' : '') },
        el('span', { class: 'sx-trk-n', title: t.name }, t.name),
        el('button', { type: 'button', class: 'sx-trk-x', 'aria-label': 'Take ' + t.name + ' off the tape', title: 'Take it off', onclick: () => musicRemove(s, t.id) }, '×')))) : el('p', { class: 'sl-muted' }, 'Nothing on this side yet.'),
      zone);
  };
  tapesMusic.replaceChildren(el('div', { class: 'sx-mus-top' }, onB, el('label', { class: 'sx-mus-vol' }, 'Volume ', vol)), side('A'), side('B'),
    el('p', { class: 'sl-muted sx-mus-note' }, 'Music plays only while the timer runs. Files stay in this browser.'));
}
