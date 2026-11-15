/* The two top corners.
   Top left: the app and the timer's keys as plain words: Settings and ?, then Tapes and Remembered, then Mini and Full.
   Top right: everything online in one line: the Room key, who's here, the message line, and your face.
   Nothing on the screen ever fades: the keys, the panels and the desk stay as they are while you focus. */

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
// like Remembered and the others: a click anywhere else, or Esc, puts the room panel away (the online line toggles it itself)
addEventListener('pointerdown', e => { if (!roomPanel.hidden && !e.target.closest('.sx-room, .sx-net')) roomClose(); }, true);
addEventListener('keydown', e => { if (e.key === 'Escape' && !roomPanel.hidden && !e.target.closest('.sx-net')) { e.preventDefault(); e.stopPropagation(); roomClose(); } }, true);
chrNetDraw();

tapesGrip.querySelector('span').textContent = 'Tapes'; // (the panel says what the key says)
