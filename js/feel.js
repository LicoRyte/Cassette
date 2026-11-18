/* Cassie: the feel. Sounds made live in the browser (so they work offline): a soft chime when a session lands, paper
   and pin sounds on the desk, a quiet key click while you write. Settings, Sound levels sets how loud each is (0 is off). */
'use strict';

/* ---------- sound levels: every sound goes through its kind's volume, then the master volume (Settings, Sound levels) ---------- */
S.opts.lv = Object.assign({ master: 1, chime: 1, keys: 1, desk: 1, ui: 1, tick: 1 }, S.opts.lv || {}); delete S.opts.lv.hiss;
// (the old on/off boxes: a sound that was turned off is now its slider at 0)
if (S.opts.deskSfx === false) S.opts.lv.desk = 0; if (S.opts.tick === false) S.opts.tickVol = 0; ['deskSfx', 'tick', 'glow', 'hiss'].forEach(k => delete S.opts[k]);
const LV = S.opts.lv;
let feelCat = 'desk'; // the kind of sound being made right now
function soundOut(c, cat) {
  if (!c._master) { c._master = c.createGain(); c._master.gain.value = LV.master; c._master.connect(c.destination); c._cats = {}; }
  if (!cat) return c._master;
  if (!c._cats[cat]) { const g = c.createGain(); g.gain.value = LV[cat] != null ? LV[cat] : 1; g.connect(c._master); c._cats[cat] = g; }
  return c._cats[cat];
}
function lvApply() { const c = tickCtx; if (!c || !c._master) return; c._master.gain.value = LV.master; Object.entries(c._cats).forEach(([k, g]) => { g.gain.value = LV[k] != null ? LV[k] : 1; }); }

/* ---------- sound, made live ---------- */
const feelSoundOn = () => soundOn;
function feelCtx() { tickLoad(); const c = tickCtx; if (!c) return null; if (c.state === 'suspended') c.resume(); return c.state === 'closed' ? null : c; }
let feelNoiseBuf = null;
function feelNoise(c) { // one second of white noise, made once
  if (feelNoiseBuf) return feelNoiseBuf;
  const b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return feelNoiseBuf = b;
}
// a burst of filtered noise: the base of every paper sound
function feelBurst(c, t, { dur, type = 'bandpass', f0, f1, q = 1, vol, attack = .004, grain = 0, cat }) {
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = feelNoise(c); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack);
  if (grain) for (let k = 1; k < grain; k++) g.gain.setValueAtTime(vol * (.25 + Math.random() * .75), t + dur * k / grain); // the crackle of fibres giving way
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f).connect(g).connect(soundOut(c, cat || feelCat)); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
}
function feelTone(c, t, freq, { dur, vol, type = 'sine', attack = .005, to, lp, cat }) {
  const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  let out = o.connect(g); if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; out = out.connect(f); }
  out.connect(soundOut(c, cat || feelCat)); o.start(t); o.stop(t + dur + .02);
}
// a bell heard through a wall: a few slow-dying partials, the bright ones muffled
function feelChime(high) {
  feelCat = 'chime'; try { feelChimeRing(high); } finally { feelCat = 'desk'; }
}
function feelChimeRing(high) {
  if (!feelSoundOn()) return; const c = feelCtx(); if (!c) return;
  const t = c.currentTime + .02, base = high ? 392 : 196, v = high ? .05 : .09;
  [[1, 1, 4.2], [2.01, .5, 3.2], [2.76, .32, 2.4], [5.4, .12, 1.4]].forEach(([r, a, d]) => feelTone(c, t, base * r, { dur: d, vol: v * a, attack: .012, lp: 1500 }));
  if (!high) [[1, 1, 3.4], [2.76, .3, 2]].forEach(([r, a, d]) => feelTone(c, t + .9, base * 1.5 * r, { dur: d, vol: v * .55 * a, attack: .012, lp: 1500 })); // and a second, answering note
}
// the desk's sounds
const DESK_SFX = {
  pick: c => { const t = c.currentTime; feelBurst(c, t, { dur: .12, f0: 2600, f1: 1800, q: .8, vol: .05, grain: 5 }); },
  lift: c => { const t = c.currentTime; feelTone(c, t, 150 + Math.random() * 20, { dur: .07, vol: .075, to: 95 }); feelBurst(c, t, { dur: .02, type: 'lowpass', f0: 700, vol: .05 }); }, // a pinned note pulled off the board: a low, soft tock
  flip: c => { const t = c.currentTime; [0, .045, .09].forEach((d, i) => feelBurst(c, t + d, { dur: .05, type: 'lowpass', f0: 1500 - i * 250, vol: .04 - i * .008 })); feelTone(c, t + .1, 130, { dur: .06, vol: .02, to: 90 }); }, // a folder's pages riffling: soft, low, no hiss
  drop: c => { const t = c.currentTime; feelBurst(c, t, { dur: .07, type: 'lowpass', f0: 900, vol: .07 }); feelTone(c, t, 110, { dur: .06, vol: .03, to: 70 }); },
  pin: c => { const t = c.currentTime; feelTone(c, t, 2100, { dur: .03, vol: .065, to: 1300 }); feelBurst(c, t, { dur: .02, type: 'highpass', f0: 3000, vol: .05 }); },
  tie: c => { const t = c.currentTime; feelTone(c, t, 1900, { dur: .03, vol: .06, to: 1200 }); feelTone(c, t + .06, 330, { dur: .25, vol: .03, type: 'triangle', to: 300 }); }, // a pin, then the string going taut
  tear: c => { const t = c.currentTime; feelBurst(c, t, { dur: .26, f0: 3200, f1: 800, q: 1.4, vol: .07, grain: 14 }); },
  shutter: c => { const t = c.currentTime; feelBurst(c, t, { dur: .025, type: 'highpass', f0: 2400, vol: .09 }); feelTone(c, t, 160, { dur: .04, vol: .04, to: 90 });
    feelBurst(c, t + .075, { dur: .03, type: 'highpass', f0: 2000, vol: .07 }); feelBurst(c, t + .09, { dur: .12, f0: 4000, f1: 2500, vol: .02 }); },
  back: c => { const t = c.currentTime; feelBurst(c, t, { dur: .035, type: 'lowpass', f0: 1300 + Math.random() * 300, vol: .045 }); feelTone(c, t, 125 + Math.random() * 20, { dur: .055, vol: .022, to: 80 }); }, // backspace: a duller, heavier clack
  ret: c => { const t = c.currentTime; for (let i = 0; i < 4; i++) feelBurst(c, t + i * .028, { dur: .014, type: 'highpass', f0: 2600 + i * 180, vol: .02 - i * .003 }); // the carriage return: a quick ratchet...
    feelTone(c, t + .13, 2093, { dur: .5, vol: .012, attack: .004 }); feelTone(c, t + .13, 4186, { dur: .25, vol: .004, attack: .004 }); }, // ...and a faint bell
  key: c => { const t = c.currentTime; feelBurst(c, t, { dur: .018, type: 'highpass', f0: 1800 + Math.random() * 600, vol: .025 }); feelTone(c, t, 180 + Math.random() * 40, { dur: .03, vol: .012, to: 120 }); },
};
let deskSfxLast = {};
function deskSfx(k) {
  if (!feelSoundOn() || document.hidden) return;
  const now = performance.now(); if (now - (deskSfxLast[k] || 0) < (k === 'key' ? 35 : k === 'back' ? 45 : 60)) return; deskSfxLast[k] = now;
  const c = feelCtx(); if (c && c.state === 'running') try { DESK_SFX[k](c); } catch (e) { /* no audio here */ }
}
// the session's end: the chime instead of the old fanfare; a lighter one when a break ends
hooks.tada = () => feelChime(false);
hooks.ding = () => feelChime(true);
// writing on a note: a soft key click (not for every character of a paste)
// typing anywhere (notes, captions, frame names, any text field): a typewriter
const typingIn = t => !!t && (t.isContentEditable || (t.matches && t.matches('textarea, input:not([type]), input[type="text"], input[type="search"]')));
document.addEventListener('input', e => { // a letter (the input event, so it follows what was really typed)
  const k = e.inputType || ''; if (typingIn(e.target) && k.startsWith('insert') && !/^insert(FromPaste|FromDrop|Paragraph|LineBreak)$/.test(k)) deskSfx('key');
}, true);
addEventListener('keydown', e => { // backspace and delete clack even with nothing left to take away; Enter returns the carriage
  if (!typingIn(e.target) || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
  if (e.key === 'Backspace' || e.key === 'Delete') deskSfx('back'); else if (e.key === 'Enter' && !e.repeat) deskSfx('ret');
}, true);

