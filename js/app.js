/* Cassette Timer: the app around the clock. The el() helper, button sounds, a notification when a session ends while
   you're in another tab, offline support and installing as an app.

   How the code fits together: index.html loads these files in order, as plain scripts that share one scope, so a
   name declared at the top of one file can be used in every file after it (and inside functions, in any of them).
     app.js     this file
     state.js   what's saved (S), and the timer: start, pause, reset, skip, finish
     screen.js  the clock's frame, the top bar, Settings, the keyboard, draw()
     digits.js  the big digits, and the tick
     feel.js    chimes and desk sounds, the green glow, the desk dimming
     typing.js  the feel of typing on paper (strikes, bell, smart punctuation)
     notes.js   rich notes        draw.js   hand-drawn shapes
     desk.js    the desk around the clock (camera, notes, photos, strings, frames, picking, undo, the bottom bar)
     pen.js     draw mode         export.js  image, backups
     clock.js   colour by state, power-on, the soft landing
     tape.js    the session strip, the tape-deck keys, the reels, the counter, the side flip
     music.js   the two sides of music, and the Tapes drawer
     log.js     the label (what a session is for), and what you remember
     look.js    cassette skins, the clock's light, parallax
     view.js    the mini deck (a floating window) and full-screen focus
     help.js    the ? card
     lively.js  small touches of life: cards land, strings draw out, keys light up
     start.js   pick up a running timer, and draw the first frame */
'use strict';

const APP_VERSION = 78; // raised with every change (the same number as VERSION in sw.js), shown at the bottom of Settings
const root = document.getElementById('app');
const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } } };
const el = (tag, attrs, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) { if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); }
  for (const k of kids.flat()) { if (k == null || k === false) continue; e.append(k.nodeType ? k : document.createTextNode(String(k))); }
  return e;
};
const stillUI = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const hooks = {}; // the chimes at the end of a session and a break (js/feel.js fills these in)

/* ---------- button sounds ---------- */
// (the storage names say "solarist": Cassette Timer grew out of it, and keeping them keeps your settings)
let soundOn = store.get('solarist-sound') !== 'off';
const SFX = { click: ['sfx/twm_mouse_click.wav', .5], ui: ['sfx/twm_notif.wav', .45] };
let actx = null; const sfxBufs = {};
function audioCtx() { if (!actx) { const A = window.AudioContext || window.webkitAudioContext; if (A) actx = new A(); } return actx; }
async function sfxLoad(k) { if (sfxBufs[k]) return sfxBufs[k]; const r = await fetch(SFX[k][0]); sfxBufs[k] = await audioCtx().decodeAudioData(await r.arrayBuffer()); return sfxBufs[k]; }
async function sfxPlay(k) {
  if (!soundOn) return;
  try { const c = audioCtx(); if (!c) return; if (c.state === 'suspended') await c.resume(); const b = await sfxLoad(k), s = c.createBufferSource(), g = c.createGain(); g.gain.value = SFX[k][1] * (S.opts.lv ? (S.opts.lv.ui != null ? S.opts.lv.ui : 1) * (S.opts.lv.master != null ? S.opts.lv.master : 1) : 1); s.buffer = b; s.connect(g).connect(c.destination); s.start(); } catch (e) { /* no audio here */ }
}
// a button clicked with the mouse lets go of the keyboard's focus afterwards, so Space always means Start/Pause
// (otherwise Space would press that button again: Reset, a mixtape button...). Keyboard users moving with Tab keep it.
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('button'); if (!b || e.detail === 0) return; // (detail 0: pressed with the keyboard)
  setTimeout(() => { if (document.activeElement === b) b.blur(); }, 0);
});
const sfxUnlock = () => { const c = audioCtx(); if (c && c.state === 'suspended') c.resume(); Object.keys(SFX).forEach(k => sfxLoad(k).catch(() => {})); };
addEventListener('pointerdown', sfxUnlock, { once: true }); addEventListener('keydown', sfxUnlock, { once: true });
// a click for buttons, a softer tick for tabs, colours and options (the tape keys have a sound of their own)
document.addEventListener('click', e => {
  const b = e.target.closest('button, select, summary'); if (!b || b.disabled || b.classList.contains('sx-tape')) return;
  sfxPlay(b.matches('.sx-nav button, .sl-mode, .sx-tt, .sx-sw, .sx-pb, .sx-fb, select, summary') ? 'ui' : 'click');
}, true);

/* ---------- a notification when a session ends while you're elsewhere ---------- */
function notifyAsk() { if ('Notification' in window && Notification.permission === 'default' && !store.get('solarist-asked')) { store.set('solarist-asked', '1'); Notification.requestPermission().catch(() => {}); } }
function notify(text) {
  if (!document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = { body: text, icon: 'icons/cassette-192.png', tag: 'cassette-timer' };
  if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(r => r.showNotification('Cassette Timer', opts)).catch(() => {});
  else try { new Notification('Cassette Timer', opts); } catch (e) { /* not allowed here */ }
}

/* ---------- offline, and installing ---------- */
let installEv = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEv = e; });
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => {}));
  // a new version took over: reload to use it (but never in the middle of a running session)
  let reloaded = false; const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadController || reloaded || (typeof running !== 'undefined' && running)) return; reloaded = true; location.reload(); });
}
