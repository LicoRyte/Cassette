/* The two top corners.
   Top left: the app and the timer's keys as plain words: Settings and ?, then Tapes, then Mini and Full.
   Top right: everything online in one line: the Room key, who's here, the message line, and your face.
   Nothing on the screen ever fades: the keys, the panels and the desk stay as they are while you focus. */

/* ---------- top left ---------- */
tabSet.classList.add('sx-ws-b', 'sx-set-b'); tabSet.title = 'Settings';
helpB.classList.add('sx-ws-b');
const chrSep = () => el('i', { class: 'sx-tray-sep', 'aria-hidden': 'true' });
const chrPair = el('span', { class: 'sx-tray-pair' }, miniB, fullB); // (Mini and Full: two ways of looking at the clock)
deskTray.prepend(tabSet, helpB, chrSep(), tapesB, chrSep(), chrPair);

/* ---------- top right: the room ---------- */
roomN.remove();
const chrFaces = el('span', { class: 'sx-net-faces' });
const chrMe = el('button', { type: 'button', class: 'sx-net-me', title: 'You, and the room', 'aria-label': 'You, and the room', onclick: e => { e.currentTarget.blur(); roomPanel.hidden ? roomOpen() : roomClose(); } });
const chrNet = el('div', { class: 'sx-net', role: 'toolbar', 'aria-label': 'Online' }, roomB, chrFaces, roomTalkBox, chrMe);
document.body.append(chrNet);
roomB.title = 'A room with friends: send each other notes, photos, tables and labels, and messages';
let chrSeen = null; // (who was here at the last look: null until the first, so nobody hops on load)
function chrNetDraw() {
  const online = room ? roomOnline() : [], many = online.length > 1;
  roomB.replaceChildren(...(room ? [el('i', { class: 'sx-net-dot' + (online.length ? ' on' : '') }), online.length ? 'Room' : 'Room · waiting'] : ['Join a room']));
  chrNet.classList.toggle('in', !!room); chrNet.classList.toggle('with', online.length > 0);
  // the faces of who's here; with two or more, click one to write only to them (click again: everyone)
  // a friend who just came in drops into the line with a little hop; one who left shrinks away
  const now = new Set(online.map(([pid]) => pid)), fresh = chrSeen ? online.filter(([pid]) => !chrSeen.has(pid)).map(([pid]) => pid) : [];
  const gone = chrSeen ? [...chrFaces.querySelectorAll('.sx-net-f[data-pid]')].filter(b => !now.has(b.dataset.pid)) : [];
  chrSeen = now;
  chrFaces.replaceChildren(...online.map(([pid, p]) => {
    const on = many && roomMsgTo === pid;
    return el('button', { type: 'button', 'data-pid': pid, class: 'sx-net-f' + (on ? ' on' : '') + (fresh.includes(pid) ? ' hi' : ''), title: many ? (on ? 'Writing only to ' + p.name + ' (click for everyone)' : p.name + ': click to write only to them') : p.name, 'aria-label': p.name, 'aria-pressed': many ? String(on) : null,
      onmousedown: e => e.preventDefault(), onclick: () => { if (!many) { roomMsgI.focus(); return; } roomMsgTo = on ? null : pid; roomTalkDraw(); chrNetDraw(); roomMsgI.focus(); } }, roomAv(p, true));
  }));
  gone.forEach(b => { if (stillUI()) return; b.classList.remove('hi', 'on'); b.classList.add('bye'); b.disabled = true; chrFaces.append(b); setTimeout(() => b.remove(), 320); });
  chrMe.replaceChildren(roomAv(roomMe()));
}
{ const draw0 = roomDraw; roomDraw = function (...a) { const r = draw0.apply(this, a); chrNetDraw(); return r; }; }
{ const open0 = roomOpen, close0 = roomClose;
  roomOpen = function (...a) { if (typeof tapesOpen === 'function' && !tapesDrawer.hidden) tapesOpen(null); const r = open0.apply(this, a); chrMe.classList.add('on'); return r; };
  roomClose = function (...a) { const r = close0.apply(this, a); chrMe.classList.remove('on'); return r; }; }
roomNameI.addEventListener('input', () => chrNetDraw());
// like the other panels: a click anywhere else, or Esc, puts the room panel away (the online line toggles it itself)
addEventListener('pointerdown', e => { if (!roomPanel.hidden && !e.target.closest('.sx-room, .sx-net')) roomClose(); }, true);
addEventListener('keydown', e => { if (e.key === 'Escape' && !roomPanel.hidden && !e.target.closest('.sx-net')) { e.preventDefault(); e.stopPropagation(); roomClose(); } }, true);
chrNetDraw();

/* ---------- copying the room code: the copy icon itself turns into a tick for a moment ---------- */
const CHR_TICK = '<path d="M3 8.5l3.2 3.2L13 4.8"/>';
roomCopy = function (e) {
  const b = e && e.currentTarget, ic = b && b.querySelector('.sx-rp-svg svg');
  const done = () => { if (!ic || b.classList.contains('done')) return; const was = ic.innerHTML, word = [...b.childNodes].find(n => n.nodeType === 3 && n.textContent.trim() === 'Copy');
    ic.innerHTML = CHR_TICK; b.classList.add('done'); if (word) word.textContent = 'Copied';
    setTimeout(() => { ic.innerHTML = was; b.classList.remove('done'); if (word) word.textContent = 'Copy'; }, 1400); };
  if (navigator.clipboard) navigator.clipboard.writeText(roomCode).then(() => { if (ic) done(); else deskToast('Copied the room code'); }, () => deskToast('Could not copy: select the code and copy it'));
};

/* ---------- messages: a friend's also shows on the mini deck; leaving the room clears the bubbles ---------- */
{ const show0 = roomMsgShow; roomMsgShow = function (who, to, text, person, mine) { if (!mine && typeof miniMsg === 'function') miniMsg(who, text); return show0.apply(this, arguments); }; }
{ const leave0 = roomLeave; roomLeave = function (...a) { roomMsgs.replaceChildren(); return leave0.apply(this, a); }; }
tapesGrip.querySelector('span').textContent = 'Tapes'; // (the panel says what the key says)
// the bubbles' column fades at its bottom edge while there are older ones further down to scroll to
function chrMsgsMore() { roomMsgs.classList.toggle('more', roomMsgs.scrollHeight - roomMsgs.scrollTop - roomMsgs.clientHeight > 4); }
roomMsgs.addEventListener('scroll', chrMsgsMore, { passive: true });
new MutationObserver(() => setTimeout(chrMsgsMore, 450)).observe(roomMsgs, { childList: true });
