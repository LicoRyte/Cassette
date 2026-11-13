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

/* ---------- playing: two decks, so one track can fade into the next ---------- */
const decks = [0, 1].map(() => { const a = new Audio(); a.preload = 'auto'; a._ft = 0; a._url = null; a._id = null; a._side = null; a._xf = false; return a; });
let player = decks[0], playSide = null, playId = null, musicBusy = false, musicAgain = false, duck = 1;
const XF = 2.6; // seconds tracks overlap
const vol = () => M.vol * duck;
const other = a => decks[0] === a ? decks[1] : decks[0];
function fadeEl(a, v, ms, done) {
  clearInterval(a._ft); const from = a.volume, t0 = performance.now();
  a._ft = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / Math.max(1, ms)); a.volume = Math.max(0, Math.min(1, from + (v - from) * k)); if (k >= 1) { clearInterval(a._ft); if (done) done(); } }, 30);
}
const trackAt = side => M[side].length ? M[side][(M.pos[side] || 0) % M[side].length] : null;
async function loadInto(a, side) { // the track this side is up to, ready on deck a (from the start)
  const list = M[side]; if (!list.length) return false;
  const i = (M.pos[side] || 0) % list.length, tr = list[i];
  if (a._id === tr.id && a._url) a.currentTime = 0;
  else {
    let blob = null; try { blob = await MUSIC.get(tr.id); } catch (e) { /* gone */ }
    if (!blob) { list.splice(i, 1); save(); return loadInto(a, side); } // (a file that's no longer stored)
    if (a._url) URL.revokeObjectURL(a._url);
    a._url = URL.createObjectURL(blob); a.src = a._url; a._id = tr.id;
  }
  a._side = side; a._xf = false; return true;
}
function setActive(a) { player = a; playSide = a._side; playId = a._id; }
async function startOn(a, side, ms) { if (!(await loadInto(a, side))) return false; a.volume = 0; try { await a.play(); } catch (e) { return false; } setActive(a); fadeEl(a, vol(), ms); return true; }
function stopEl(a, ms) { if (a.paused) return; fadeEl(a, 0, ms, () => { a.pause(); musicDraw(); }); }
async function nextTrack(ms) { // on to the next track: it comes in underneath while this one fades
  const was = player, s = was._side; if (!s) return;
  M.pos[s] = ((M.pos[s] || 0) + 1) % Math.max(1, M[s].length); save();
  if (await startOn(other(was), s, ms)) stopEl(was, ms); musicDraw();
}
decks.forEach(a => {
  a.addEventListener('timeupdate', () => { if (a !== player || a._xf || a.paused || !a.duration || a.duration < XF * 3 || a.duration - a.currentTime > XF) return; a._xf = true; nextTrack(XF * 1000); });
  a.addEventListener('ended', () => { if (a !== player || a._xf) return; a._xf = true; nextTrack(60); }); // (short tracks just follow on)
});
async function musicSync() {
  if (musicBusy) { musicAgain = true; return; } musicBusy = true; // (one at a time; a change that comes meanwhile runs right after)
  try {
    const side = sideNow(), want = running && M.on && soundOn && M[side].length > 0;
    if (!want) { decks.forEach(a => stopEl(a, 700)); return; }
    if (!player.paused && player._side === side) { fadeEl(player, vol(), 400); return; } // already playing this side
    const tr = trackAt(side);
    if (player.paused && player._side === side && player._url && tr && player._id === tr.id && player.currentTime > 0) { // a pause: carry on where it stopped
      player.volume = 0; try { await player.play(); } catch (e) { return; } setActive(player); fadeEl(player, vol(), 1400); return;
    }
    const was = player.paused ? null : player; // the deck flipped: the other side comes in as this one fades
    if (await startOn(was ? other(was) : player, side, 1400) && was) stopEl(was, 1400);
  } finally { musicBusy = false; musicDraw(); if (musicAgain) { musicAgain = false; setTimeout(() => musicSync(), 0); } }
}
new MutationObserver(() => musicSync()).observe(root, { attributes: true, attributeFilter: ['data-clock', 'data-mode'] });
// the chime always comes through: the music dips while it rings, then comes back
function musicDuck(ms) {
  duck = .2; decks.forEach(a => { if (!a.paused && a === player) fadeEl(a, vol(), 250); });
  clearTimeout(musicDuck.t); musicDuck.t = setTimeout(() => { duck = 1; if (!player.paused) fadeEl(player, vol(), 1600); }, ms);
}
{ const tadaBase = hooks.tada, dingBase = hooks.ding;
  hooks.tada = () => { musicDuck(4200); if (tadaBase) tadaBase(); };
  hooks.ding = () => { musicDuck(3000); if (dingBase) dingBase(); }; }

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
  decks.forEach(a => { if (a._id === id) { clearInterval(a._ft); a.pause(); a._id = null; } }); if (playId === id) { playId = null; playSide = null; }
  save(); musicDraw(); musicSync();
}

/* ---------- the Tapes drawer: the Shelf (js/log.js) and the Music ---------- */
const tapesShelf = el('div', { class: 'sx-shelf' }), tapesMusic = el('div', { class: 'sx-mus' });
const tapesTabs = ['shelf', 'music'].map(k => el('button', { type: 'button', class: 'sx-tt', 'data-k': k, onclick: () => tapesOpen(k) }, k === 'shelf' ? 'Shelf' : 'Music'));
const tapesGrip = el('div', { class: 'sx-tapes-grip', title: 'Drag to move the cassette' }, el('i', { class: 'sx-hole' }), el('span', {}, 'Cassette'), el('i', { class: 'sx-hole' }));
const tapesSave = el('button', { type: 'button', class: 'sx-ws-b sx-tapes-save', title: 'Save cassette and put it away (T or Esc)', onclick: () => tapesOpen(null) }, 'Save cassette');
const tapesDrawer = el('div', { class: 'sx-tapes', role: 'dialog', 'aria-label': 'Tapes', hidden: true },
  tapesGrip, el('div', { class: 'sx-tapes-h' }, ...tapesTabs),
  tapesShelf, tapesMusic, el('div', { class: 'sx-tapes-f' }, el('i', { class: 'sx-screw' }), tapesSave, el('i', { class: 'sx-screw' })));
world.append(tapesDrawer); // it lives on the desk, next to the clock, and moves and zooms with it
// where it sits on the desk (remembered); dragged by its top
M.panel = M.panel && isFinite(M.panel.x) ? M.panel : null;
function tapesPlace() { const p = M.panel || { x: Math.round(corner.offsetWidth / 2 + 90), y: -280 }; tapesDrawer.style.left = p.x + 'px'; tapesDrawer.style.top = p.y + 'px'; }
tapesGrip.addEventListener('pointerdown', e => {
  if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); tapesGrip.setPointerCapture(e.pointerId);
  const s = { x: e.clientX, y: e.clientY, l: tapesDrawer.offsetLeft, t: tapesDrawer.offsetTop }; tapesDrawer.classList.add('lift'); deskSfx('pick');
  const move = ev => { M.panel = { x: Math.round(s.l + (ev.clientX - s.x) / cam.z), y: Math.round(s.t + (ev.clientY - s.y) / cam.z) }; tapesPlace(); };
  const end = () => { tapesGrip.removeEventListener('pointermove', move); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(k => tapesGrip.removeEventListener(k, end)); tapesDrawer.classList.remove('lift'); deskSfx('drop'); save(); };
  tapesGrip.addEventListener('pointermove', move); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(k => tapesGrip.addEventListener(k, end));
});
tapesPlace();
let tapesTab = 'shelf';
function tapesOpen(k) {
  if (k == null || (!tapesDrawer.hidden && k === true)) { if (!tapesDrawer.hidden) { tapesDrawer.hidden = true; tapesB.classList.remove('on'); save(); deskSfx('drop'); if (typeof tapeSound === 'function') tapeSound(); } return; } // Save cassette: everything is already kept; it just goes away
  if (k !== true) tapesTab = k;
  const was = tapesDrawer.hidden; tapesDrawer.hidden = false; tapesB.classList.add('on'); tapesPlace();
  if (was) { deskSfx('pick'); // if it's off screen, frame the clock and the cassette together
    const v = view(), cw = corner.offsetWidth / 2, ch = corner.offsetHeight / 2, L = tapesDrawer.offsetLeft, T = tapesDrawer.offsetTop, R = L + tapesDrawer.offsetWidth, Bt = T + tapesDrawer.offsetHeight;
    const inView = (L - cam.x) * cam.z > -v.w / 2 && (R - cam.x) * cam.z < v.w / 2 && (T - cam.y) * cam.z > -v.h / 2 + 50 && (Bt - cam.y) * cam.z < v.h / 2 - 80;
    if (!inView) { const x0 = Math.min(-cw, L), x1 = Math.max(cw, R), y0 = Math.min(-ch, T), y1 = Math.max(ch, Bt); glideTo((x0 + x1) / 2, (y0 + y1) / 2 + 20, Math.max(.35, Math.min(1, (v.w - 80) / (x1 - x0), (v.h - 200) / (y1 - y0)))); } }
  tapesTabs.forEach(b => b.classList.toggle('on', b.dataset.k === tapesTab));
  tapesShelf.hidden = tapesTab !== 'shelf'; tapesMusic.hidden = tapesTab !== 'music';
  if (tapesTab === 'shelf' && typeof drawShelf === 'function') drawShelf(); else musicDraw();
}
const tapesB = deskBtn('Tapes', () => tapesOpen(tapesDrawer.hidden ? true : null), '', 'Music and your shelf of tapes (T)');
deskBar.querySelectorAll('.sx-ws-grp')[1].append(tapesB);
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
  vol.addEventListener('input', () => { M.vol = vol.value / 100; if (!player.paused) { clearInterval(player._ft); player.volume = M.vol * duck; } save(); });
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
