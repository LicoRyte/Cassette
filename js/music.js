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
M.pos = Object.assign({ A: 0, B: 0 }, M.pos || {}); M.radio = Object.assign({ A: null, B: null }, M.radio || {});
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
decks.forEach(a => {
  a.addEventListener('timeupdate', () => { if (a !== player || a._xf || a.paused || !a.duration || a.duration < XF * 3 || a.duration - a.currentTime > XF) return; a._xf = true; nextTrack(XF * 1000); });
  a.addEventListener('ended', () => { if (a !== player || a._xf) return; a._xf = true; nextTrack(60); }); // (short tracks just follow on)
});
async function musicSync() {
  if (musicBusy) { musicAgain = true; return; } musicBusy = true; // (one at a time; a change that comes meanwhile runs right after)
  try {
    const side = sideNow(), st = M.radio[side], want = running && M.on && soundOn && (!!st || M[side].length > 0);
    if (!want) { decks.forEach(a => stopEl(a, 900, true)); radioOff(900, true); return; } // the tape winds down
    if (st) { decks.forEach(a => stopEl(a, 1400)); radioOn(st); return; } // this side is tuned to the radio
    radioOff(1400);
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
  duck = .2; decks.forEach(a => { if (!a.paused && a === player) fadeEl(a, vol(), 250); }); radioLevel(.08);
  clearTimeout(musicDuck.t); musicDuck.t = setTimeout(() => { duck = 1; if (!player.paused) fadeEl(player, vol(), 1600); radioLevel(.5); }, ms);
}
{ const tadaBase = hooks.tada, dingBase = hooks.ding;
  hooks.tada = () => { musicDuck(4200); if (tadaBase) tadaBase(); };
  hooks.ding = () => { musicDuck(3000); if (dingBase) dingBase(); }; }

/* ---------- the audio runs through one bus, so the VU meters can listen ---------- */
let mGraph = null;
function musicGraph() {
  if (mGraph) return mGraph; const c = feelCtx(); if (!c) return null;
  const bus = c.createGain(), an = c.createAnalyser(); an.fftSize = 512; bus.connect(an); an.connect(c.destination);
  decks.forEach(a => { try { c.createMediaElementSource(a).connect(bus); } catch (e) { /* already routed */ } });
  return mGraph = { c, bus, an, buf: new Uint8Array(512) };
}
function vuLevel() { // how loud it is right now, 0 to 1
  if (!mGraph) return 0; mGraph.an.getByteTimeDomainData(mGraph.buf); let s = 0;
  for (let i = 0; i < mGraph.buf.length; i++) { const x = (mGraph.buf[i] - 128) / 128; s += x * x; }
  return Math.min(1, Math.sqrt(s / mGraph.buf.length) * 4.5);
}

/* ---------- night radio: stations made live, no files needed. A side tuned to one plays it instead of its tracks ---------- */
const STATIONS = { rain: 'Rain on the window', cafe: 'Cafe murmur', fire: 'Fireplace' };
let radio = null; // { kind, out, nodes, timer }
function radioNoise(c, secs, brown) {
  const b = c.createBuffer(1, c.sampleRate * secs, c.sampleRate), d = b.getChannelData(0); let last = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
  const s = c.createBufferSource(); s.buffer = b; s.loop = true; return s;
}
function radioChain(c, src, nodes, out) { let n = src; nodes.forEach(x => { n.connect(x); n = x; }); n.connect(out); return src; }
function radioFilter(c, type, f, q) { const x = c.createBiquadFilter(); x.type = type; x.frequency.value = f; if (q) x.Q.value = q; return x; }
function radioGain(c, v) { const g = c.createGain(); g.gain.value = v; return g; }
function radioBurst(c, out, t, dur, type, f, v) { // one small sound: a drop, a crackle
  const s = c.createBufferSource(), fl = radioFilter(c, type, f), g = c.createGain(); s.buffer = feelNoise(c);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .002); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(fl).connect(g).connect(out); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
}
function radioOn(kind) {
  const g = musicGraph(); if (!g) return;
  if (radio && radio.kind === kind) { radioLevel(.6); return; }
  radioOff(900);
  const c = g.c, out = c.createGain(), tone = c.createBiquadFilter(); out.gain.value = 0; tone.type = 'lowpass'; out.connect(tone).connect(g.bus);
  tone.frequency.setValueAtTime(stillUI() ? 18000 : 260, c.currentTime); tone.frequency.exponentialRampToValueAtTime(18000, c.currentTime + .9); // the radio opens up as it comes on
  const nodes = []; let timer = 0;
  if (kind === 'rain') { // a steady wash, and drops on the glass
    nodes.push(radioChain(c, radioNoise(c, 5), [radioFilter(c, 'highpass', 350), radioFilter(c, 'lowpass', 1700), radioGain(c, .5)], out));
    nodes.push(radioChain(c, radioNoise(c, 4, true), [radioFilter(c, 'lowpass', 300), radioGain(c, .35)], out));
    timer = setInterval(() => { const t = c.currentTime; for (let i = 0; i < 3; i++) if (Math.random() < .45) radioBurst(c, out, t + Math.random() * .06, .012 + Math.random() * .02, 'highpass', 2500 + Math.random() * 4000, .02 + Math.random() * .07); }, 70);
  } else if (kind === 'cafe') { // the murmur of a room, rising and falling, and now and then a cup
    [[380, .8, .07], [720, 1.2, .11], [1300, 1.5, .17]].forEach(([f, q, rate]) => {
      const n = radioNoise(c, 5), bp = radioFilter(c, 'bandpass', f, q), gg = radioGain(c, .55), lfo = c.createOscillator(), lg = radioGain(c, .35);
      lfo.frequency.value = rate + Math.random() * .05; lfo.connect(lg).connect(gg.gain); lfo.start(); nodes.push(lfo, radioChain(c, n, [bp, gg], out)); });
    timer = setInterval(() => { if (Math.random() < .07) { const t = c.currentTime, f = 2200 + Math.random() * 1400, o = c.createOscillator(), gg = c.createGain();
      o.frequency.value = f; gg.gain.setValueAtTime(.0001, t); gg.gain.exponentialRampToValueAtTime(.03, t + .004); gg.gain.exponentialRampToValueAtTime(.0001, t + .5); o.connect(gg).connect(out); o.start(t); o.stop(t + .55); } }, 400);
  } else { // fire: a low rumble, crackles, now and then a pop
    nodes.push(radioChain(c, radioNoise(c, 5, true), [radioFilter(c, 'lowpass', 420), radioGain(c, .9)], out));
    nodes.push(radioChain(c, radioNoise(c, 4), [radioFilter(c, 'bandpass', 900, .6), radioGain(c, .05)], out));
    timer = setInterval(() => { const t = c.currentTime; if (Math.random() < .3) radioBurst(c, out, t + Math.random() * .04, .004 + Math.random() * .016, 'highpass', 1500 + Math.random() * 3000, .04 + Math.random() * .18);
      if (Math.random() < .015) radioBurst(c, out, t, .05, 'bandpass', 600, .25); }, 45);
  }
  nodes.forEach(n => { if (n.start && n.constructor.name === 'AudioBufferSourceNode') n.start(); });
  radio = { kind, out, tone, nodes, timer }; radioLevel(1.2);
}
function radioLevel(tc) { if (radio) radio.out.gain.setTargetAtTime(vol() * 1.1, radio.out.context.currentTime, tc || .5); }
function radioOff(ms) {
  if (!radio) return; const r = radio; radio = null; clearInterval(r.timer);
  r.out.gain.setTargetAtTime(0, r.out.context.currentTime, (ms || 700) / 3000);
  if (arguments[1] && r.tone && !stillUI()) r.tone.frequency.exponentialRampToValueAtTime(220, r.out.context.currentTime + (ms || 700) / 1000); // and closes down as it winds off
  setTimeout(() => { r.nodes.forEach(n => { try { n.stop(); } catch (e) { /* done */ } }); try { r.out.disconnect(); } catch (e) { /* gone */ } }, (ms || 700) + 400);
}

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
  if (typeof sideTagNp !== 'undefined') { const tr = !player.paused && playSide && M[playSide].find(t => t.id === playId); sideTagNp.textContent = radio ? '▸ ' + STATIONS[radio.kind] + ' (radio)' : tr ? '▸ ' + tr.name : ''; }
  if (tapesDrawer.hidden || tapesTab !== 'music') return;
  const onB = el('button', { type: 'button', class: 'sx-ws-b' + (M.on ? ' on' : ''), 'aria-pressed': String(M.on), onclick: () => { M.on = !M.on; save(); musicSync(); musicDraw(); } }, M.on ? 'Music on' : 'Music off');
  const vol = el('input', { type: 'range', min: 0, max: 100, value: Math.round(M.vol * 100), 'aria-label': 'Music volume' });
  vol.addEventListener('input', () => { M.vol = vol.value / 100; if (!player.paused) { clearInterval(player._ft); player.volume = M.vol * duck; } radioLevel(.1); save(); });
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
      el('div', { class: 'sx-radio', role: 'radiogroup', 'aria-label': 'Radio on ' + SIDE_NAME[s] }, el('span', {}, 'Radio'), ...[[null, 'Off'], ...Object.entries(STATIONS).map(([k, n]) => [k, n.split(' ')[0]])].map(([k, n]) =>
        el('button', { type: 'button', class: 'sx-rb' + (M.radio[s] === k ? ' on' : ''), role: 'radio', 'aria-checked': String(M.radio[s] === k), title: k ? STATIONS[k] + ': plays instead of the tracks on this side' : 'Play the tracks', onclick: () => { M.radio[s] = k; save(); musicSync(); musicDraw(); } }, n))),
      M[s].length ? el('ol', { class: 'sx-trks' }, ...M[s].map((t, i) => el('li', { class: (playId === t.id && !player.paused ? 'play' : i === cur ? 'next' : '') },
        el('span', { class: 'sx-trk-n', title: t.name }, t.name),
        el('button', { type: 'button', class: 'sx-trk-x', 'aria-label': 'Take ' + t.name + ' off the tape', title: 'Take it off', onclick: () => musicRemove(s, t.id) }, '×')))) : el('p', { class: 'sl-muted' }, 'Nothing on this side yet.'),
      zone);
  };
  tapesMusic.replaceChildren(el('div', { class: 'sx-mus-top' }, onB, el('label', { class: 'sx-mus-vol' }, 'Volume ', vol)), side('A'), side('B'),
    el('p', { class: 'sl-muted sx-mus-note' }, 'Music plays only while the timer runs. Files stay in this browser.'));
}
