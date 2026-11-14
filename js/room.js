/* Cassette Timer: rooms. Make a room (or join one with its code) and the friends in it show up as online; pick a note,
   photo, table or label and send it to one of them, or to everyone, and it pops onto their desk with a "from" tag.
   Nothing is kept in sync: a sent card is a copy. Cards go straight from browser to browser (WebRTC, encrypted); public
   WebTorrent trackers only introduce the browsers to each other, and the room code is the password, so only people who
   have it can join. The room parts (js/vendor/trystero, MIT) load only when you join, so the app stays offline otherwise.
   You can send once every few seconds, a friend's cards are taken at most every few seconds, and you can block someone.
   A message over 5 MB is let go while it arrives (a small change in js/vendor/trystero/room.js). */
'use strict';

const ROOM = S.opts.room = Object.assign({ name: '', me: '', block: [], last: '' }, S.opts.room || {});
if (!ROOM.me) { ROOM.me = 'u' + Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(36)).join('').slice(0, 14); save(); }
const ROOM_COOL = 8000, ROOM_GAP = 4000, ROOM_MAX = 20; // you: one send every 8 s; each friend: one delivery taken every 4 s; at most 20 cards at once
const ROOM_TYPES = ['note', 'photo', 'tbl', 'frame'];
const ROOM_DOTS = ['#77d6c1', '#ffb762', '#ff6157', '#9cb93b', '#ffd832', '#1c92a7', '#eb9c6e'];
let room = null, roomCode = '', roomBusy = false, roomSay = null, roomCard = null, roomSentAt = 0, roomTick = 0;
const roomPeers = new Map(); // their browser's id -> { id, name } (id: who they are, kept across visits, for blocking)
const roomGot = new Map(); // friend id -> when their last card was taken

const roomBlocked = id => ROOM.block.some(b => b.id === id);
const roomDot = id => ROOM_DOTS[[...String(id)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % ROOM_DOTS.length];
const roomOnline = () => [...roomPeers.entries()].filter(([, p]) => !roomBlocked(p.id));
// a room code is 12 letters and numbers (31 kinds: no 0, O, 1, I or L to mix up), in fours: TAPE-K7Q2-MX4R-9WPD.
// The code is the room's name and its password; that many makes it too many to guess (about 8 x 10^17)
const ROOM_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function roomNewCode() { const v = new Uint32Array(12); crypto.getRandomValues(v); return roomNorm(Array.from(v, n => ROOM_ABC[n % ROOM_ABC.length]).join('')); }
function roomNorm(s) { // however it's typed or pasted (spaces, no dashes, small letters): TAPE-XXXX-XXXX-XXXX, or '' if it isn't one
  const t = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^TAPE/, '');
  return t.length === 12 && [...t].every(ch => ROOM_ABC.includes(ch)) ? 'TAPE-' + t.match(/.{4}/g).join('-') : ''; }
const roomHello = () => ({ id: ROOM.me, name: (ROOM.name || '').trim().slice(0, 24) || 'A friend' });

/* ---------- how the connecting is going (shown in the panel, so a room that stays empty says why) ---------- */
// every direct connection the room parts open goes through this: "connecting" means a friend's browser was found and
// answered, "connected" that it worked, "failed" that your two networks wouldn't let the browsers reach each other
let roomLib = null, roomWatchT = 0;
const roomDiag = { at: 0, found: 0, ok: 0, failed: 0, insecure: false };
const RoomPC = typeof RTCPeerConnection === 'function' ? class extends RTCPeerConnection {
  constructor(c) { super(c); let seen = false;
    this.addEventListener('connectionstatechange', () => { const s = this.connectionState;
      if (s === 'connecting' && !seen) { seen = true; roomDiag.found++; } else if (s === 'connected') roomDiag.ok++; else if (s === 'failed') roomDiag.failed++; else return;
      roomDraw(); }); }
} : undefined;
function roomTrackers() { // how many of the trackers answered: [open, all]
  try { const ss = Object.values(roomLib.getRelaySockets()); return [ss.filter(s => s && s.readyState === 1).length, ss.length]; } catch (e) { return [0, 0]; }
}
function roomWatch() { clearTimeout(roomWatchT); if (!room) return; if (!roomPanel.hidden) roomDraw(); roomWatchT = setTimeout(roomWatch, 2000); }
function roomStatus() { // one line of how it's going, and what to try
  if (roomDiag.insecure) return ['bad', 'This page is ' + location.origin + ', a plain http:// address, so the browser turns off the encryption rooms need. Open the app from https:// or from localhost on each computer.'];
  if (!room) return null;
  const [open, all] = roomTrackers(), secs = (Date.now() - roomDiag.at) / 1000, n = roomOnline().length;
  const line = 'Trackers ' + open + ' of ' + all + ' · found ' + roomDiag.found + ' · connected ' + roomDiag.ok + (roomDiag.failed ? ' · failed ' + roomDiag.failed : '');
  if (n) return ['ok', line];
  if (!open && secs > 8) return ['bad', line + '. Can\'t reach any tracker: you may be offline, or this network blocks them (try another Wi-Fi or a phone hotspot).'];
  if (roomDiag.failed && !roomDiag.ok) return ['bad', line + '. A friend\'s browser was found, but your two networks wouldn\'t let them connect directly. This happens on some school, office and mobile networks: try both on the same Wi-Fi, or another network.'];
  if (roomDiag.found > roomDiag.ok + roomDiag.failed) return ['wait', line + '. Found someone, connecting...'];
  if (secs > 25) return ['wait', line + '. Nobody found with this code yet. Check you both have the same code, and the same version (' + APP_VERSION + ' here, at the bottom of Settings).'];
  return ['wait', line + '. Looking for friends with this code...'];
}

/* ---------- joining and leaving ---------- */
async function roomJoin(code) {
  code = roomNorm(code); if (!code) { deskToast('That room code doesn\'t look right (it\'s like TAPE-K7Q2-MX4R-9WPD)'); return; }
  if (!(ROOM.name || '').trim()) { deskToast('Give yourself a name first, so friends know who you are'); roomDraw(true); return; }
  if (!window.isSecureContext || !(window.crypto && crypto.subtle)) { // (the browser turns off the encryption rooms use on a plain http:// page)
    roomDiag.insecure = true; roomOpen(); roomDraw(); deskToast('Rooms need the app opened from https:// or localhost'); return; }
  if (roomBusy) return; roomLeave(true); roomBusy = true; roomDraw();
  let lib; try { lib = await import(new URL('js/vendor/trystero/torrent.js', document.baseURI).href); }
  catch (e) { roomBusy = false; roomDraw(); deskToast('Could not load the room parts'); return; }
  roomLib = lib; Object.assign(roomDiag, { at: Date.now(), found: 0, ok: 0, failed: 0, insecure: false });
  const relayUrls = ['wss://tracker.webtorrent.dev', 'wss://tracker.openwebtorrent.com']; // (the trackers that answer; two of the library's own don't, Nov 2026)
  try { room = lib.joinRoom({ appId: 'cassette-timer-rooms', password: code, relayUrls, rtcPolyfill: RoomPC }, code); }
  catch (e) { roomBusy = false; room = null; roomDraw(); deskToast('Could not open the room (are you online?)'); return; }
  roomBusy = false; roomCode = code; ROOM.last = code; save(); roomWatch();
  const [say, hear] = room.makeAction('hi'), [send, get] = room.makeAction('card');
  roomSay = say; roomCard = send;
  room.onPeerJoin(pid => say(roomHello(), pid));
  room.onPeerLeave(pid => { const p = roomPeers.get(pid); roomPeers.delete(pid); if (p && !roomBlocked(p.id)) deskToast(p.name + ' left the room'); roomDraw(); roomSendState(); });
  hear((d, pid) => { if (!d || typeof d.id !== 'string') return;
    const p = { id: d.id.slice(0, 24), name: String(d.name || '').trim().slice(0, 24) || 'A friend' }, had = roomPeers.get(pid);
    roomPeers.set(pid, p); if (!had && !roomBlocked(p.id)) { deskToast(p.name + ' is here'); deskSfx('pin'); }
    roomDraw(); roomSendState(); });
  get((d, pid) => roomReceive(d, pid));
  say(roomHello()); roomDraw(); roomSendState(); deskToast('You\'re in ' + code + ': give friends the code');
}
function roomLeave(quiet) {
  if (!room) return; try { room.leave(); } catch (e) { /* already gone */ }
  clearTimeout(roomWatchT); room = null; roomCode = ''; roomSay = roomCard = null; roomPeers.clear(); roomDraw(); roomSendState(); if (!quiet) deskToast('You left the room');
}
addEventListener('pagehide', () => roomLeave(true));

/* ---------- sending ---------- */
async function roomSend(to) { // to: one friend's browser id, or null for everyone
  if (!room || !roomCard) return;
  const left = ROOM_COOL - (Date.now() - roomSentAt); if (left > 0) { deskToast('Wait ' + Math.ceil(left / 1000) + ' s before sending again'); return; }
  const its = [...picked].map(itemOf).filter(it => it && ROOM_TYPES.includes(it.type)).slice(0, ROOM_MAX);
  if (!its.length) { deskToast('Notes, photos, tables and labels can be sent'); return; }
  const targets = to ? [to] : roomOnline().map(([pid]) => pid); if (!targets.length) return;
  const ids = new Set(its.map(it => it.id)), x0 = Math.min(...its.map(it => it.x)), y0 = Math.min(...its.map(it => it.y));
  const items = its.map(it => { const o = JSON.parse(JSON.stringify(it)); o.x -= x0; o.y -= y0; delete o.key; delete o.board; delete o.from; return o; });
  const photos = {}; for (const it of its) if (it.type === 'photo') { try { const src = await PHOTOS.get(it.id); if (src) photos[it.id] = src; } catch (e) { /* skip */ } }
  roomSentAt = Date.now(); roomSendState();
  try { await roomCard({ name: roomHello().name, items, links: B_().links.filter(l => ids.has(l[0]) && ids.has(l[1])), photos }, targets); }
  catch (e) { deskToast('That didn\'t send: try again in a moment'); return; }
  const what = its.length > 1 ? its.length + ' cards' : { note: 'a note', photo: 'a photo', tbl: 'a table', frame: 'a label' }[its[0].type];
  deskSfx('lift'); deskToast('Sent ' + what + ' to ' + (to ? (roomPeers.get(to) || {}).name || 'your friend' : 'everyone'));
}
// the row in the bar along the bottom while something is picked: who to send it to (and how long until you can send again)
const roomSendRow = el('div', { class: 'sx-ws-grp sx-room-send', hidden: true, role: 'group', 'aria-label': 'Send to a friend' });
deskCtx.append(roomSendRow);
function roomSendState() {
  clearTimeout(roomTick);
  const online = roomOnline(), can = room && picked.size && [...picked].some(id => ROOM_TYPES.includes((itemOf(id) || {}).type));
  roomSendRow.hidden = !(can && online.length); if (roomSendRow.hidden) return;
  const left = ROOM_COOL - (Date.now() - roomSentAt), cool = left > 0;
  const b = (label, title, fn, dot) => { const x = deskBtn([dot ? el('i', { class: 'sx-room-dot', style: 'background:' + dot }) : null, label], fn, 'sx-room-b', title); x.disabled = cool; return x; };
  roomSendRow.replaceChildren(el('span', { class: 'sx-ws-n' }, cool ? 'Send again in ' + Math.ceil(left / 1000) + ' s' : 'Send to'),
    ...online.map(([pid, p]) => b(p.name, 'Send what is picked to ' + p.name, () => roomSend(pid), roomDot(p.id))),
    ...(online.length > 1 ? [b('Everyone', 'Send what is picked to everyone in the room', () => roomSend(null))] : []));
  if (cool) roomTick = setTimeout(roomSendState, Math.min(1000, left % 1000 || 1000));
}
const deskSelBarR = deskSelBar;
deskSelBar = function () { deskSelBarR.apply(this, arguments); roomSendState(); };

/* ---------- receiving: it pops onto your desk, in the middle of what you're looking at ---------- */
async function roomReceive(d, pid) {
  const p = roomPeers.get(pid); if (!p || roomBlocked(p.id) || !d || !Array.isArray(d.items)) return; // (someone who hasn't said hello, or blocked)
  const now = Date.now(); if (now - (roomGot.get(p.id) || 0) < ROOM_GAP) return; roomGot.set(p.id, now); // (too fast: let it go)
  const tag = '-r' + now.toString(36), num = v => isFinite(+v) ? Math.round(+v) : 0, str = (v, n) => typeof v === 'string' ? v.slice(0, n) : '';
  const imap = new Map(), gmap = {}, out = [];
  for (const it of d.items.slice(0, ROOM_MAX)) {
    if (!it || !ROOM_TYPES.includes(it.type)) continue;
    const id = (it.type === 'tbl' ? 't' : it.type === 'photo' ? 'p' : it.type === 'frame' ? 'f' : 'n') + now + '-' + out.length;
    const o = { id, type: it.type, board: B_().cur, x: Math.max(-4000, Math.min(4000, num(it.x))), y: Math.max(-4000, Math.min(4000, num(it.y))), from: p.name };
    if (it.text) o.text = str(it.text, 2000);
    if (it.type === 'note') { if (it.html) o.html = noteClean(str(it.html, 30000)); if (it.color) o.color = str(it.color, 12); if (it.fs) o.fs = num(it.fs); if (it.w) o.w = num(it.w); if (it.h) o.h = num(it.h); if (PAPERS.some(q => q[0] === it.paper)) o.paper = it.paper; }
    if (it.type === 'tbl') Object.assign(o, tblClean(it));
    if (it.type === 'frame') Object.assign(o, { w: Math.max(200, Math.min(6000, num(it.w))), h: Math.max(140, Math.min(4000, num(it.h))), color: str(it.color, 12) || 'amber' });
    if (it.type === 'photo') { const src = d.photos && d.photos[it.id]; if (typeof src !== 'string' || !/^data:image\/(jpeg|png|webp|gif);base64,/.test(src) || src.length > 3e6) continue;
      if (it.ar) o.ar = Math.max(.2, Math.min(5, +it.ar || 1)); try { await PHOTOS.put(id, src); } catch (e) { continue; } }
    if (typeof it.group === 'string') o.group = gmap[it.group] || (gmap[it.group] = 'g' + tag + out.length);
    imap.set(it.id, id); out.push(o);
  }
  if (!out.length) return;
  const w = Math.max(...out.map(o => o.x + (o.w || 220))), h = Math.max(...out.map(o => o.y + (o.h || 160)));
  out.forEach(o => { o.x = Math.round(cam.x - w / 2 + o.x); o.y = Math.round(cam.y - h / 2 + o.y); });
  deskMark(); B_().items.push(...out);
  (Array.isArray(d.links) ? d.links : []).forEach(l => { if (Array.isArray(l) && imap.has(l[0]) && imap.has(l[1])) B_().links.push([imap.get(l[0]), imap.get(l[1])]); });
  save(); drawBoard(); out.forEach((o, i) => setTimeout(() => deskLand(o.id, i === 0), i * 70));
  const what = out.length > 1 ? out.length + ' cards' : { note: 'a note', photo: 'a photo', tbl: 'a table', frame: 'a label' }[out[0].type];
  deskToast(p.name + ' sent you ' + what);
}
// a received card wears a small "from" tag until you take it off (click it)
const drawBoardRoom = drawBoard;
drawBoard = function () {
  drawBoardRoom.apply(this, arguments);
  B_().items.forEach(it => { if (!it.from || it.board !== B_().cur) return; const c = els.get(it.id); if (!c) return;
    c.append(el('button', { type: 'button', class: 'sx-from', title: 'From ' + it.from + ': click to take the tag off', onclick: e => { e.stopPropagation(); deskMark(); delete it.from; save(); e.currentTarget.remove(); } }, 'from ' + it.from)); });
};

/* ---------- the Room key (top left) and its panel ---------- */
const roomN = el('span', { class: 'sx-mem-n', hidden: true });
const roomB = deskBtn('Room', () => roomPanel.hidden ? roomOpen() : roomClose(), 'sx-room-key', 'A room with friends: send each other notes, photos, tables and labels');
roomB.append(roomN); memB.after(roomB);
const roomPanel = el('div', { class: 'sx-mem sx-room', hidden: true, role: 'dialog', 'aria-label': 'Room' });
document.body.append(roomPanel);
function roomOpen() { if (typeof memClose === 'function') memClose(); roomPanel.hidden = false; roomB.classList.add('on'); roomDraw(); requestAnimationFrame(() => roomPanel.classList.add('on')); deskSfx('pick'); }
function roomClose() { if (roomPanel.hidden) return; roomPanel.classList.remove('on'); roomPanel.hidden = true; roomB.classList.remove('on'); }
memB.addEventListener('click', () => roomClose(), true);
function roomDraw(focusName) {
  const online = roomOnline(); roomN.textContent = room ? String(online.length) : ''; roomN.hidden = !room || !online.length;
  roomB.classList.toggle('live', !!room);
  if (roomPanel.hidden) return;
  const btn = (label, fn, cls, title) => el('button', { type: 'button', class: 'sx-ws-b' + (cls ? ' ' + cls : ''), title: title || null, onclick: fn }, label);
  const name = el('input', { class: 'sx-room-i', type: 'text', maxlength: 24, placeholder: 'Your name', value: ROOM.name || '', 'aria-label': 'Your name in rooms' });
  let nameT = 0; name.addEventListener('input', () => { ROOM.name = name.value.slice(0, 24); save(); clearTimeout(nameT); nameT = setTimeout(() => { if (roomSay) roomSay(roomHello()); }, 600); });
  const parts = [el('div', { class: 'sx-mem-top' }, el('h3', {}, 'Room'), el('span', { class: 'sx-gap' }), room ? el('span', { class: 'sx-room-live' }, el('i', {}), 'Online') : null),
    el('label', { class: 'sx-room-row' }, el('span', {}, 'You are'), name)];
  const st = roomStatus(); if (st) parts.push(el('p', { class: 'sx-room-st ' + st[0], role: 'status' }, st[1]));
  if (!room) {
    const code = el('input', { class: 'sx-room-i sx-room-code-i', type: 'text', maxlength: 30, placeholder: 'TAPE-K7Q2-MX4R-9WPD', value: roomNorm(ROOM.last) || '', 'aria-label': 'Room code', spellcheck: 'false' });
    code.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); roomJoin(code.value); } });
    parts.push(
      el('div', { class: 'sx-room-sec' }, btn(roomBusy ? 'Opening...' : 'Make a room', () => roomJoin(roomNewCode()), 'sx-room-go')),
      el('div', { class: 'sx-room-sec' }, el('p', { class: 'sl-muted' }, 'Or join a friend\'s room with its code:'), el('div', { class: 'sx-room-row' }, code, btn('Join', () => roomJoin(code.value)))),
      el('p', { class: 'sl-muted sx-room-note' }, 'In a room you can send notes, photos, tables and labels to friends; they pop onto their desk. Cards go straight between your browsers, and only people with the code can join.'));
  } else {
    parts.push(
      el('div', { class: 'sx-room-sec sx-room-codebox' }, el('b', { class: 'sx-room-code' }, roomCode),
        btn('Copy', () => { navigator.clipboard && navigator.clipboard.writeText(roomCode).then(() => deskToast('Copied the room code'), () => {}); }, '', 'Copy the code to give to friends'),
        btn('Leave', () => roomLeave(), 'sx-room-leave')),
      el('div', { class: 'sx-room-sec' }, el('h4', {}, 'Here now'),
        online.length ? el('ul', { class: 'sx-room-list' }, ...online.map(([pid, p]) => el('li', {}, el('i', { class: 'sx-room-dot', style: 'background:' + roomDot(p.id) }), el('b', {}, p.name), el('span', { class: 'sx-gap' }),
          btn('Block', () => { ROOM.block.push({ id: p.id, name: p.name }); save(); deskToast('Blocked ' + p.name + ': their cards won\'t reach you'); roomDraw(); roomSendState(); }, 'sx-room-block', 'Stop cards from ' + p.name))))
          : el('p', { class: 'sl-muted' }, 'Nobody else yet. Give friends the code, and they show up here.')),
      el('p', { class: 'sl-muted sx-room-note' }, 'Pick a card on your desk and choose who to send it to in the bar at the bottom. You can send once every ' + ROOM_COOL / 1000 + ' seconds; a friend\'s cards come at most every ' + ROOM_GAP / 1000 + ' seconds.'));
  }
  if (ROOM.block.length) parts.push(el('div', { class: 'sx-room-sec' }, el('h4', {}, 'Blocked'), el('ul', { class: 'sx-room-list' }, ...ROOM.block.map(b => el('li', {}, el('b', {}, b.name), el('span', { class: 'sx-gap' }),
    btn('Unblock', () => { ROOM.block = ROOM.block.filter(x => x !== b); S.opts.room.block = ROOM.block; save(); roomDraw(); roomSendState(); }, 'sx-room-block'))))));
  roomPanel.replaceChildren(...parts);
  if (focusName) name.focus();
}
roomDraw();
