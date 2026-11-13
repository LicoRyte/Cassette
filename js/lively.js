/* Cassette Timer: small touches of life. Each runs once, when something happens, and then nothing runs at all:
   - a new card (note, photo, whiteboard, label, folder) drops onto the desk with a little bounce
   - a new string draws itself out from the pin to the other card, then drops into its sag
   - a key gives off a soft ring of light when you press it, like an LED blinking
   (the folder's flap lifting on hover is all in style.css) */
'use strict';

// what was on the desk last time it was drawn: anything new since then lands. (Not on the first draw, or on another board)
let liveSeen = null, liveBoard = null;
const drawBoardLively = drawBoard;
drawBoard = function () {
  const r = drawBoardLively.apply(this, arguments), B = B_(), ids = new Set(B.items.filter(it => it.board === B.cur).map(it => it.id));
  if (liveSeen && liveBoard === B.cur && !stillUI())
    ids.forEach(id => { if (liveSeen.has(id)) return; const c = els.get(id); if (!c) return;
      c.animate([{ translate: '0 -26px', opacity: 0, scale: 1.05 }, { translate: '0 3px', opacity: 1, scale: 1, offset: .62 }, { translate: '0 0', opacity: 1, scale: 1 }],
        { duration: 420, easing: 'cubic-bezier(.3, .7, .4, 1)' }); });
  liveSeen = ids; liveBoard = B.cur; return r;
};

// strings: a new one is drawn out from the first pin to the second (its sag bounce is in js/desk.js)
let liveLinks = null, liveLinkBoard = null;
const drawStringsLively = drawStrings;
drawStrings = function () {
  const r = drawStringsLively.apply(this, arguments), B = B_(), keys = new Set(B.links.map(lk));
  if (liveLinks && liveLinkBoard === B.cur && !stillUI())
    strNodes.forEach(n => { if (liveLinks.has(lk(n.l))) return; const p = n.p;
      p.setAttribute('pathLength', '1'); p.style.strokeDasharray = '1 1';
      p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 340, easing: 'cubic-bezier(.2, .7, .3, 1)' })
        .onfinish = () => { p.removeAttribute('pathLength'); p.style.strokeDasharray = ''; }; });
  liveLinks = keys; liveLinkBoard = B.cur; return r;
};

// keys: a ring of light spreads from the key you press, and fades
const LIVE_KEYS = '.sx-ws-bar .sx-ws-b, .sx-tray .sx-ws-b, .sx-tapes .sx-ws-b, .sx-recall .sx-ws-b, .sx-mem .sx-ws-b, .sx-cmp .sx-ws-b, .sx-find-b';
addEventListener('pointerdown', e => {
  const b = e.target.closest && e.target.closest(LIVE_KEYS); if (!b || b.disabled || e.button !== 0 || stillUI()) return;
  b.classList.remove('lit'); void b.offsetWidth; b.classList.add('lit');
}, true);
addEventListener('animationend', e => { if (e.animationName === 'sx-key-lit') e.target.classList.remove('lit'); });
