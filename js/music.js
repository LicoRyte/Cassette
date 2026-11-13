/* Cassette Timer: the tapes. Two sides of music: Side A plays while you focus, Side B on breaks. Drop audio files on
   a side in the Tapes drawer (or anywhere on the desk: they go to the side that's playing now). Music plays only while
   the timer runs, fades in and out, and changes sides when the deck flips. The files are kept in this browser
   (IndexedDB), like the photos. The cassette opens on the desk with two panels: your music on the left, the mixtape on the right. */
'use strict';

// the browser's music storage
const MUSIC = (() => {
  let dbp = null;
  const open = () => dbp = dbp || new Promise((res, rej) => { const r = indexedDB.open('cassette-music', 1); r.onupgradeneeded = () => r.result.createObjectStore('t'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const run = (m, fn) => open().then(db => new Promise((res, rej) => { const t = db.transaction('t', m), q = fn(t.objectStore('t')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }));
  return { put: (k, v) => run('readwrite', s => s.put(v, k)), get: k => run('readonly', s => s.get(k)), del: k => run('readwrite', s => s.delete(k)) };
})();
const M = S.music = Object.assign({ on: true, vol: .5, A: [], B: [], pos: { A: 0, B: 0 } }, S.music || {});
M.pos = Object.assign({ A: 0, B: 0 }, M.pos || {}); delete M.radio; // (there was a radio once)
// your music: M.lib = [{ id, name, dur }], every file kept in this browser. Mixtapes: M.mixes = [{ id, name, A: [ids], B: [ids] }];
// M.mix is the one in the deck, and M.A / M.B are its sides as the player reads them. (Older saves: their two sides become the first mixtape.)
if (!Array.isArray(M.lib)) { const seen = new Set(); M.lib = [...M.A, ...M.B].filter(t => t && !seen.has(t.id) && seen.add(t.id)).map(t => ({ id: t.id, name: t.name })); }
if (!Array.isArray(M.mixes) || !M.mixes.length) M.mixes = [{ id: 'x' + Date.now(), name: 'My mixtape', A: M.A.map(t => t.id), B: M.B.map(t => t.id) }];
if (!M.mixes.some(m => m.id === M.mix)) M.mix = M.mixes[0].id;
const mixNow = () => M.mixes.find(m => m.id === M.mix) || M.mixes[0];
const libOf = id => M.lib.find(t => t.id === id);
{ const mx = mixNow(); M.A = mx.A.map(libOf).filter(Boolean); M.B = mx.B.map(libOf).filter(Boolean); }
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
function rampRate(a, from, to, ms) { // the motor: playback speed (and so pitch) sliding between two speeds
  clearInterval(a._rt); try { a.preservesPitch = false; } catch (e) { /* older browsers */ }
  if (stillUI()) { a.playbackRate = to; return; }
  const t0 = performance.now(); a.playbackRate = from;
  a._rt = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / ms), e = 1 - Math.pow(1 - k, 2); a.playbackRate = Math.max(.25, from + (to - from) * e); if (k >= 1) clearInterval(a._rt); }, 30);
}
async function startOn(a, side, ms, wind) { if (!(await loadInto(a, side))) return false; musicGraph(); a.volume = 0; if (wind) rampRate(a, .45, 1, 750); else { clearInterval(a._rt); a.playbackRate = 1; } try { await a.play(); } catch (e) { return false; } setActive(a); fadeEl(a, vol(), ms); return true; }
function stopEl(a, ms, wind) { if (a.paused) return; if (wind) rampRate(a, a.playbackRate || 1, .3, ms); fadeEl(a, 0, ms, () => { a.pause(); clearInterval(a._rt); a.playbackRate = 1; musicDraw(); }); }
async function nextTrack(ms) { // on to the next track: it comes in underneath while this one fades
  const was = player, s = was._side; if (!s) return;
  M.pos[s] = ((M.pos[s] || 0) + 1) % Math.max(1, M[s].length); save();
  if (await startOn(other(was), s, ms)) stopEl(was, ms); musicDraw();
}
// skip to the next track on the side that's playing (N, the deck's Next key, the mini deck, the cassette)
function musicNext() {
  const s = sideNow(); if (!M[s].length) { deskToast('Nothing on ' + SIDE_NAME[s] + ' yet: add music in Tapes'); return; }
  if (!player.paused && player._side === s) { player._xf = true; nextTrack(700); } // it fades into the next one
  else { M.pos[s] = ((M.pos[s] || 0) + 1) % M[s].length; save(); musicDraw(); } // (not playing: the next one is lined up)
  const tr = M[s][(M.pos[s] || 0) % M[s].length]; if (tr) deskToast('▸ ' + tr.name);
}
decks.forEach(a => {
  a.addEventListener('timeupdate', () => { if (a !== player || a._xf || a.paused || !a.duration || a.duration < XF * 3 || a.duration - a.currentTime > XF) return; a._xf = true; nextTrack(XF * 1000); });
  a.addEventListener('ended', () => { if (a !== player || a._xf) return; a._xf = true; nextTrack(60); }); // (short tracks just follow on)
});
async function musicSync() {
  if (musicBusy) { musicAgain = true; return; } musicBusy = true; // (one at a time; a change that comes meanwhile runs right after)
  try {
    const side = sideNow(), want = running && M.on && soundOn && M[side].length > 0;
    if (!want) { decks.forEach(a => stopEl(a, 900, true)); return; } // the tape winds down
    if (!player.paused && player._side === side) { fadeEl(player, vol(), 400); return; } // already playing this side
    const tr = trackAt(side);
    if (player.paused && player._side === side && player._url && tr && player._id === tr.id && player.currentTime > 0) { // a pause: carry on where it stopped
      player.volume = 0; rampRate(player, .45, 1, 750); try { await player.play(); } catch (e) { return; } setActive(player); fadeEl(player, vol(), 900); return; // and speeds up again
    }
    const was = player.paused ? null : player; // the deck flipped: the other side comes in as this one fades
    if (await startOn(was ? other(was) : player, side, was ? 1400 : 900, !was) && was) stopEl(was, 1400);
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

/* ---------- the audio runs through one bus, so the VU meters can listen ---------- */
let mGraph = null;
function musicGraph() {
  if (mGraph) return mGraph; const c = feelCtx(); if (!c) return null;
  const bus = c.createGain(), an = c.createAnalyser(); an.fftSize = 512; bus.connect(an); an.connect(soundOut(c));
  decks.forEach(a => { try { c.createMediaElementSource(a).connect(bus); } catch (e) { /* already routed */ } });
  return mGraph = { c, bus, an, buf: new Uint8Array(512) };
}
function vuLevel() { // how loud it is right now, 0 to 1
  if (!mGraph) return 0; mGraph.an.getByteTimeDomainData(mGraph.buf); let s = 0;
  for (let i = 0; i < mGraph.buf.length; i++) { const x = (mGraph.buf[i] - 128) / 128; s += x * x; }
  return Math.min(1, Math.sqrt(s / mGraph.buf.length) * 4.5);
}

/* ---------- the library and the mixtapes ---------- */
const AUDIO_RE = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i;
const fmtDur = sec => !isFinite(sec) || sec <= 0 ? '' : Math.floor(sec / 60) + ':' + String(Math.round(sec % 60)).padStart(2, '0');
function audioLength(blob) { // how long a file plays (read from its own header)
  return new Promise(res => { const a = new Audio(), u = URL.createObjectURL(blob); let done = false;
    const fin = v => { if (done) return; done = true; URL.revokeObjectURL(u); res(v); };
    a.preload = 'metadata'; a.addEventListener('loadedmetadata', () => fin(a.duration)); a.addEventListener('error', () => fin(0)); setTimeout(() => fin(0), 5000); a.src = u; });
}
let storeAsked = false;
async function libAdd(files) { // into this browser, and into your library; returns the new ids
  const list = [...files].filter(f => /^audio\//.test(f.type) || AUDIO_RE.test(f.name)), ids = [];
  if (!storeAsked && navigator.storage && navigator.storage.persist) { storeAsked = true; navigator.storage.persist().catch(() => {}); } // (ask the browser to keep these, not clear them to save space)
  for (const [k, f] of list.entries()) {
    const id = 'm' + Date.now() + '-' + k;
    try { await MUSIC.put(id, f); M.lib.push({ id, name: f.name.replace(/\.[^.]+$/, '').slice(0, 80), dur: Math.round(await audioLength(f)) || 0 }); ids.push(id); } catch (e) { /* storage full, or not allowed */ }
  }
  save(); return ids;
}
function mixApply(fresh) { // the mixtape in the deck becomes what the player plays (keeping your place where it can)
  const mx = mixNow();
  ['A', 'B'].forEach(sd => {
    const was = !fresh && trackAt(sd); M[sd] = mx[sd].map(libOf).filter(Boolean);
    const i = was ? M[sd].findIndex(t => t.id === was.id) : -1; M.pos[sd] = i >= 0 ? i : fresh ? 0 : Math.min(M.pos[sd] || 0, Math.max(0, M[sd].length - 1));
  });
  if (playId && playSide && (fresh || !M[playSide].some(t => t.id === playId))) { decks.forEach(a => { clearInterval(a._ft); a.pause(); a._id = null; }); playId = null; playSide = null; } // what was playing isn't on the tape any more
  save(); musicDraw(); musicSync();
}
async function musicAdd(files, side) { // new files straight onto a side (from the drawer, or dropped on the desk)
  const ids = await libAdd(files); if (!ids.length) { if ([...files].length) deskToast('Could not keep those files'); return 0; }
  mixNow()[side].push(...ids); mixApply();
  deskToast('Added ' + ids.length + (ids.length === 1 ? ' track' : ' tracks') + ' to ' + SIDE_NAME[side]); return ids.length;
}
function musicRemove(side, id) { const mx = mixNow(), i = mx[side].indexOf(id); if (i < 0) return; mx[side].splice(i, 1); mixApply(); } // off the side; the file stays in your music
function trackMove(from, fi, to, ti) { // drag and drop: within a side, between sides, from your music onto a side, or off a side
  const mx = mixNow(); let id;
  if (from === 'L') id = M.lib[fi] && M.lib[fi].id; else { id = mx[from][fi]; if (to !== 'L') { mx[from].splice(fi, 1); if (from === to && ti > fi) ti--; } }
  if (!id) return;
  if (to === 'L') { if (from !== 'L') mx[from].splice(fi, 1); } else mx[to].splice(Math.max(0, Math.min(ti, mx[to].length)), 0, id);
  deskSfx('drop'); mixApply();
}
function libDelete(id) { // gone from this browser, and from every mixtape
  M.lib = M.lib.filter(t => t.id !== id); M.mixes.forEach(m => { m.A = m.A.filter(x => x !== id); m.B = m.B.filter(x => x !== id); });
  MUSIC.del(id).catch(() => {}); mixApply();
}
function mixSwitch(id) { if (id === M.mix) return; M.mix = id; deskSfx('pin'); if (typeof tapeSound === 'function') tapeSound(); mixApply(true); }
function mixNew() { const name = (prompt('Name the new mixtape:', 'Mixtape ' + (M.mixes.length + 1)) || '').trim().slice(0, 40); if (!name) return; const id = 'x' + Date.now(); M.mixes.push({ id, name, A: [], B: [] }); M.mix = id; mixApply(true); }
function mixRename() { const mx = mixNow(), name = (prompt('Rename this mixtape:', mx.name) || '').trim().slice(0, 40); if (name) { mx.name = name; save(); musicDraw(); } }
function mixDelete() { if (M.mixes.length < 2) return; M.mixes = M.mixes.filter(m => m.id !== M.mix); M.mix = M.mixes[0].id; mixApply(true); } // (the files stay in your music)
async function libLengths() { // tracks from before lengths were kept: measure them once
  let changed = false;
  for (const t of M.lib) if (!t.dur && !t._tried) { t._tried = true; try { const b = await MUSIC.get(t.id); if (b) { t.dur = Math.round(await audioLength(b)) || 0; changed = true; } } catch (e) { /* gone */ } }
  M.lib.forEach(t => delete t._tried); if (changed) { save(); musicDraw(); }
}

/* ---------- the cassette: your music and the mixtape, side by side ---------- */
const tapesMusic = el('div', { class: 'sx-mus' });
const tapesGrip = el('div', { class: 'sx-tapes-grip', title: 'Drag to move the cassette' }, el('i', { class: 'sx-hole' }), el('span', {}, 'Cassette'), el('i', { class: 'sx-hole' }));
const tapesSave = el('button', { type: 'button', class: 'sx-ws-b sx-tapes-save', title: 'Save cassette and put it away (T or Esc)', onclick: () => tapesOpen(null) }, 'Save cassette');
const tapesDrawer = el('div', { class: 'sx-tapes', role: 'dialog', 'aria-label': 'Tapes', hidden: true },
  tapesGrip, tapesMusic, el('div', { class: 'sx-tapes-f' }, el('i', { class: 'sx-screw' }), tapesSave, el('i', { class: 'sx-screw' })));
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
function tapesOpen(k) {
  if (k == null || (!tapesDrawer.hidden && k === true)) { if (!tapesDrawer.hidden) { tapesDrawer.hidden = true; tapesB.classList.remove('on'); save(); deskSfx('drop'); if (typeof tapeSound === 'function') tapeSound(); } return; } // Save cassette: everything is already kept; it just goes away
  const was = tapesDrawer.hidden; tapesDrawer.hidden = false; tapesB.classList.add('on'); tapesPlace();
  if (was) { deskSfx('pick'); // if it's off screen, frame the clock and the cassette together
    const v = view(), cw = corner.offsetWidth / 2, ch = corner.offsetHeight / 2, L = tapesDrawer.offsetLeft, T = tapesDrawer.offsetTop, R = L + tapesDrawer.offsetWidth, Bt = T + tapesDrawer.offsetHeight;
    const inView = (L - cam.x) * cam.z > -v.w / 2 && (R - cam.x) * cam.z < v.w / 2 && (T - cam.y) * cam.z > -v.h / 2 + 50 && (Bt - cam.y) * cam.z < v.h / 2 - 80;
    if (!inView) { const x0 = Math.min(-cw, L), x1 = Math.max(cw, R), y0 = Math.min(-ch, T), y1 = Math.max(ch, Bt); glideTo((x0 + x1) / 2, (y0 + y1) / 2 + 20, Math.max(.35, Math.min(1, (v.w - 80) / (x1 - x0), (v.h - 200) / (y1 - y0)))); } }
  musicDraw();
}
const tapesB = deskBtn('Tapes', () => tapesOpen(tapesDrawer.hidden ? true : null), '', 'Your music and mixtapes (T)');
deskTray.prepend(tapesB);
addEventListener('keydown', e => {
  const t = e.target; if (t && (t.isContentEditable || t.closest && t.closest('input, select, textarea')) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === 'KeyT') { e.preventDefault(); e.stopPropagation(); tapesOpen(tapesDrawer.hidden ? true : null); }
  else if ((e.code === 'KeyN' || (e.key || '').toLowerCase() === 'n') && !e.shiftKey && !e.repeat) { e.preventDefault(); e.stopPropagation(); nextB.click(); }
  else if (e.key === 'Escape' && !tapesDrawer.hidden) { e.preventDefault(); e.stopPropagation(); tapesOpen(null); }
}, true);

let musicDrag = null; // what's being dragged: { from: 'A' | 'B' | 'L', i }
function dropTarget(list, y) { const lis = [...list.querySelectorAll(':scope > li')]; const i = lis.findIndex(li => { const r = li.getBoundingClientRect(); return y < r.top + r.height / 2; }); return i < 0 ? lis.length : i; }
function dropZone(box, list, to) { // where tracks (or files) can land
  const clear = () => box.querySelectorAll('.drop-before').forEach(n => n.classList.remove('drop-before')), mark = y => { clear(); const lis = list ? [...list.children] : [], i = list ? dropTarget(list, y) : 0; box.classList.add('drop'); if (lis[i]) lis[i].classList.add('drop-before'); };
  box.addEventListener('dragover', e => { const files = [...(e.dataTransfer.types || [])].includes('Files'); if (!files && !musicDrag) return; e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = musicDrag && musicDrag.from === 'L' ? 'copy' : 'move'; mark(e.clientY); });
  box.addEventListener('dragleave', e => { if (!box.contains(e.relatedTarget)) { box.classList.remove('drop'); clear(); } });
  box.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); box.classList.remove('drop'); clear();
    if (musicDrag) { const d = musicDrag; musicDrag = null; trackMove(d.from, d.i, to, list ? dropTarget(list, e.clientY) : 0); }
    else if (e.dataTransfer.files.length) { if (to === 'L') libAdd(e.dataTransfer.files).then(ids => { deskToast(ids.length ? 'Added ' + ids.length + ' to your music' : 'Could not keep those files'); musicDraw(); }); else musicAdd(e.dataTransfer.files, to); } });
}
function dragRow(li, from, i) { li.draggable = true; li.addEventListener('dragstart', e => { musicDrag = { from, i }; e.dataTransfer.effectAllowed = 'copyMove'; e.dataTransfer.setData('text/plain', li.dataset.name || ''); li.classList.add('dragging'); deskSfx('pick'); });
  li.addEventListener('dragend', () => { li.classList.remove('dragging'); setTimeout(() => { musicDrag = null; }, 0); }); }
function musicDraw() {
  // the line under the clock: which side, and what's playing
  if (typeof sideTagNp !== 'undefined') { const tr = !player.paused && playSide && M[playSide].find(t => t.id === playId); sideTagNp.textContent = tr ? '▸ ' + tr.name : ''; }
  if (tapesDrawer.hidden) return;
  const mx = mixNow();
  const onB = el('button', { type: 'button', class: 'sx-ws-b' + (M.on ? ' on' : ''), 'aria-pressed': String(M.on), onclick: () => { M.on = !M.on; save(); musicSync(); musicDraw(); } }, M.on ? 'Music on' : 'Music off');
  const vol = el('input', { type: 'range', min: 0, max: 100, value: Math.round(M.vol * 100), 'aria-label': 'Music volume' });
  vol.addEventListener('input', () => { M.vol = vol.value / 100; if (!player.paused) { clearInterval(player._ft); player.volume = M.vol * duck; } save(); });
  // the mixtape in the deck
  const pick = el('select', { 'aria-label': 'Mixtape in the deck' }, ...M.mixes.map(m => el('option', { value: m.id, selected: m.id === mx.id || null }, m.name)));
  pick.addEventListener('change', () => mixSwitch(pick.value));
  const mixRow = el('div', { class: 'sx-mixrow' }, pick,
    el('div', { class: 'sx-mix-acts' }, el('button', { type: 'button', class: 'sx-mini-b', title: 'A new, empty mixtape', onclick: mixNew }, 'New'), el('button', { type: 'button', class: 'sx-mini-b', title: 'Rename this mixtape', onclick: mixRename }, 'Rename'),
      M.mixes.length > 1 ? armBtn('Delete', 'Sure?', mixDelete, 'sx-mini-b') : null));
  const side = sd => {
    const cur = (M.pos[sd] || 0) % Math.max(1, M[sd].length), total = M[sd].reduce((a, t) => a + (t.dur || 0), 0);
    const list = el('ol', { class: 'sx-trks' }, ...M[sd].map((t, i) => { const li = el('li', { class: (playId === t.id && playSide === sd && !player.paused ? 'play' : i === cur ? 'next' : ''), 'data-name': t.name },
      el('span', { class: 'sx-grip', 'aria-hidden': 'true' }, '⋮⋮'), el('span', { class: 'sx-trk-n', title: t.name }, t.name), el('span', { class: 'sx-trk-d' }, fmtDur(t.dur)),
      el('button', { type: 'button', class: 'sx-trk-x', 'aria-label': 'Take ' + t.name + ' off this side', title: 'Take it off this side (it stays in your music)', onclick: () => musicRemove(sd, t.id) }, '×')); dragRow(li, sd, i); return li; }));
    const box = el('section', { class: 'sx-ms' + (sideNow() === sd ? ' now' : '') },
      el('h4', {}, el('b', {}, sd === 'A' ? 'Side A' : 'Side B'), el('span', {}, sd === 'A' ? 'Focus' : 'Breaks'), el('i', { class: 'sx-ms-t' }, total ? fmtDur(total) : '')),
      M[sd].length ? list : el('p', { class: 'sl-muted sx-empty' }, 'Drag tracks here from your music, or drop audio files.'));
    dropZone(box, M[sd].length ? list : null, sd); return box;
  };
  // your music: everything you've added, to drag onto the sides
  const file = el('input', { type: 'file', accept: 'audio/*', multiple: true, hidden: true });
  file.addEventListener('change', () => { libAdd(file.files).then(ids => { deskToast(ids.length ? 'Added ' + ids.length + ' to your music' : 'Could not keep those files'); musicDraw(); }); file.value = ''; });
  const used = id => (mx.A.includes(id) ? 'A' : '') + (mx.B.includes(id) ? 'B' : '');
  const lib = el('ul', { class: 'sx-lib' }, ...M.lib.map((t, i) => { const u = used(t.id), li = el('li', { 'data-name': t.name },
    el('span', { class: 'sx-grip', 'aria-hidden': 'true' }, '⋮⋮'),
    el('span', { class: 'sx-trk-n', title: 'Double-click to rename' }, t.name), el('span', { class: 'sx-trk-d' }, fmtDur(t.dur)),
    u ? el('span', { class: 'sx-on-tag', title: 'On this mixtape' }, u) : null,
    el('button', { type: 'button', class: 'sx-add-b', title: 'Add to Side A', onclick: () => { mx.A.push(t.id); deskSfx('pin'); mixApply(); } }, '+A'),
    el('button', { type: 'button', class: 'sx-add-b sx-add-bb', title: 'Add to Side B', onclick: () => { mx.B.push(t.id); deskSfx('pin'); mixApply(); } }, '+B'),
    armBtn('🗑', 'Delete?', () => libDelete(t.id), 'sx-trk-del')); dragRow(li, 'L', i);
    li.querySelector('.sx-trk-n').addEventListener('dblclick', () => { const n = (prompt('Rename this track:', t.name) || '').trim().slice(0, 80); if (n) { t.name = n; mixApply(); } });
    return li; }));
  const libBox = el('section', { class: 'sx-mcol sx-libbox' },
    el('div', { class: 'sx-mcol-h' }, el('b', {}, 'Your music'), el('span', { class: 'sx-store' }, M.lib.length + (M.lib.length === 1 ? ' track' : ' tracks')),
      el('button', { type: 'button', class: 'sx-mini-b sx-addf', title: 'Add audio files (or drop them here)', onclick: () => file.click() }, '+ Add'), file),
    el('div', { class: 'sx-mcol-b' }, M.lib.length ? lib : el('div', { class: 'sx-mz', tabindex: '0', role: 'button', 'aria-label': 'Add music files', onclick: () => file.click(), onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } } }, 'Drop audio files here', el('small', {}, 'or click to choose some'))),
    el('p', { class: 'sx-mus-note' }, 'Kept in this browser. Drag a track onto a side, or use +A / +B.'));
  dropZone(libBox, null, 'L');
  if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(est => { const st = libBox.querySelector('.sx-store'); if (st && est.usage) st.textContent += ' (' + Math.round(est.usage / 1048576) + ' MB used)'; }).catch(() => {});
  const mixBox = el('section', { class: 'sx-mcol sx-mixbox' },
    el('div', { class: 'sx-mcol-h' }, el('b', {}, 'Mixtape'), el('span', { class: 'sx-gap' }), el('button', { type: 'button', class: 'sx-mini-b sx-nextb', title: 'Next track (N)', 'aria-label': 'Next track', onclick: () => musicNext() }, '⏭'), onB, el('label', { class: 'sx-mus-vol', title: 'Volume' }, vol)),
    el('div', { class: 'sx-mcol-b' }, mixRow, side('A'), side('B')),
    el('p', { class: 'sx-mus-note' }, 'Plays only while the timer runs. Drag to reorder, move between sides, or off.'));
  tapesMusic.replaceChildren(libBox, mixBox);
  libLengths();
}
