/* The two top corners.
   Top left: the app and the timer's keys as plain words: Settings and ?, then Tapes and Remembered, then Mini and Full.
   Top right: everything online in one line: the Room key, who's here, the message line, and your face.
   While the timer runs and you leave the mouse alone for a few seconds, both corners and the left column fade back,
   and come back the moment you move (a message from a friend brings the top right back for a moment). */

/* ---------- top left ---------- */
tabSet.classList.add('sx-ws-b', 'sx-set-b'); tabSet.title = 'Settings';
helpB.classList.add('sx-ws-b');
const chrSep = () => el('i', { class: 'sx-tray-sep', 'aria-hidden': 'true' });
const chrPair = el('span', { class: 'sx-tray-pair' }, miniB, fullB); // (Mini and Full: two ways of looking at the clock)
deskTray.prepend(tabSet, helpB, chrSep(), tapesB, memB, chrSep(), chrPair);

/* ---------- top right: the room ---------- */
roomN.remove();
const chrFaces = el('span', { class: 'sx-net-faces' });
const chrMe = el('button', { type: 'button', class: 'sx-net-me', title: 'You, and the room', 'aria-label': 'You, and the room', onclick: e => { e.currentTarget.blur(); roomPanel.hidden ? roomOpen() : roomClose(); } });
const chrNet = el('div', { class: 'sx-net', role: 'toolbar', 'aria-label': 'Online' }, roomB, chrFaces, roomTalkBox, chrMe);
document.body.append(chrNet);
roomB.title = 'A room with friends: send each other notes, photos, tables and labels, and messages';
function chrNetDraw() {
  const online = room ? roomOnline() : [], many = online.length > 1;
  roomB.replaceChildren(...(room ? [el('i', { class: 'sx-net-dot' + (online.length ? ' on' : '') }), online.length ? 'Room' : 'Room · waiting'] : ['Join a room']));
  chrNet.classList.toggle('in', !!room); chrNet.classList.toggle('with', online.length > 0);
  // the faces of who's here; with two or more, click one to write only to them (click again: everyone)
  chrFaces.replaceChildren(...online.map(([pid, p]) => {
    const on = many && roomMsgTo === pid;
    return el('button', { type: 'button', class: 'sx-net-f' + (on ? ' on' : ''), title: many ? (on ? 'Writing only to ' + p.name + ' (click for everyone)' : p.name + ': click to write only to them') : p.name, 'aria-label': p.name, 'aria-pressed': many ? String(on) : null,
      onmousedown: e => e.preventDefault(), onclick: () => { if (!many) { roomMsgI.focus(); return; } roomMsgTo = on ? null : pid; roomTalkDraw(); chrNetDraw(); roomMsgI.focus(); } }, roomAv(p, true));
  }));
  chrMe.replaceChildren(roomAv(roomMe()));
}
{ const draw0 = roomDraw; roomDraw = function (...a) { const r = draw0.apply(this, a); chrNetDraw(); return r; }; }
{ const open0 = roomOpen, close0 = roomClose;
  roomOpen = function (...a) { if (typeof tapesOpen === 'function' && !tapesDrawer.hidden) tapesOpen(null); const r = open0.apply(this, a); chrMe.classList.add('on'); return r; };
  roomClose = function (...a) { const r = close0.apply(this, a); chrMe.classList.remove('on'); return r; }; }
roomNameI.addEventListener('input', () => chrNetDraw());
chrNetDraw();

/* ---------- the corners fade while the timer runs and you leave the mouse alone ---------- */
let chrCalmT = 0, chrPingT = 0;
function chrWake() {
  document.body.classList.remove('sx-calm'); clearTimeout(chrCalmT);
  chrCalmT = setTimeout(() => {
    const ae = document.activeElement, busy = !running || fullOn || (page && !page.hidden) || !tapesDrawer.hidden || !memList.hidden || !roomPanel.hidden || !helpCard.hidden
      || (typeof picked !== 'undefined' && picked.size) || (ae && (ae.isContentEditable || (ae.closest && ae.closest('input, textarea, select'))));
    if (busy) return chrWake(); document.body.classList.add('sx-calm');
  }, 3000);
}
['pointermove', 'pointerdown', 'wheel', 'keydown'].forEach(k => addEventListener(k, chrWake, { passive: true }));
chrWake();
{ const show0 = roomMsgShow; roomMsgShow = function (...a) { chrNet.classList.add('ping'); clearTimeout(chrPingT); chrPingT = setTimeout(() => chrNet.classList.remove('ping'), 5000); return show0.apply(this, a); }; }
tapesGrip.querySelector('span').textContent = 'Tapes'; // (the panel says what the key says)
