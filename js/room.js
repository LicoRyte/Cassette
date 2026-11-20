/* Cassie: rooms. Make a room (or join one with its code) and the friends in it show up as online; pick a note,
   photo, table or book and send it to one of them, or to everyone, and it pops onto their desk with a "from" tag.
   Nothing is kept in sync: a sent card is a copy. Cards go straight from browser to browser (WebRTC, encrypted); public
   WebTorrent trackers only introduce the browsers to each other, and the room code is the password, so only people who
   have it can join. The room parts (js/vendor/trystero, MIT) load only when you join, so the app stays offline otherwise.
   You can send once every few seconds, a friend's cards are taken at most every few seconds, and you can block someone.
   A message over 5 MB is let go while it arrives (a small change in js/vendor/trystero/room.js). */
'use strict';

const ROOM = S.opts.room = Object.assign({ name: '', me: '', block: [], last: '', pic: '' }, S.opts.room || {}); delete ROOM.msgs; // (messages always stay as history now)
if (!ROOM.me) { ROOM.me = 'u' + Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(36)).join('').slice(0, 14); save(); }
const ROOM_COOL = 8000, ROOM_GAP = 4000, ROOM_MAX = 20; // you: one send every 8 s; each friend: one delivery taken every 4 s; at most 20 cards at once
const ROOM_TYPES = ['note', 'photo', 'tbl', 'book']; // (a book goes with its pages and cover)
const ROOM_DOTS = ['#77d6c1', '#ffb762', '#ff6157', '#9cb93b', '#ffd832', '#1c92a7', '#eb9c6e'];
let room = null, roomCode = '', roomBusy = false, roomSay = null, roomCard = null, roomTell = null, roomSentAt = 0, roomTick = 0;
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
const roomHello = () => ({ id: ROOM.me, name: (ROOM.name || '').trim().slice(0, 24) || 'A friend', pic: ROOM.pic || '' });
// a picture is a small square image (96 px, a few KB); one from a friend is only ever shown as an image, and only if it is one
const roomPicOk = v => typeof v === 'string' && v.length < 40000 && /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(v);
// someone's round face: their picture, or the first letter of their name in their colour (s: the small one)
function roomAv(p, small) {
  const a = el('span', { class: 'sx-av' + (small ? ' s' : ''), style: 'background:' + roomDot(p.id), 'aria-hidden': 'true' });
  if (roomPicOk(p.pic)) a.append(el('img', { src: p.pic, alt: '' })); else a.textContent = (Array.from(String(p.name || '?').trim())[0] || '?').toUpperCase();
  return a;
}
const roomMe = () => ({ id: ROOM.me, name: roomHello().name, pic: ROOM.pic });
const roomPicFile = el('input', { type: 'file', accept: 'image/*', hidden: true });
document.body.append(roomPicFile);
roomPicFile.addEventListener('change', async () => {
  const f = roomPicFile.files && roomPicFile.files[0]; roomPicFile.value = ''; if (!f || !/^image\//.test(f.type)) return;
  try {
    const url = URL.createObjectURL(f), img = new Image(); await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = url; }); URL.revokeObjectURL(url);
    const c = document.createElement('canvas'), S2 = 96; c.width = c.height = S2; const g = c.getContext('2d'), m = Math.min(img.naturalWidth, img.naturalHeight);
    g.drawImage(img, (img.naturalWidth - m) / 2, (img.naturalHeight - m) / 2, m, m, 0, 0, S2, S2); // (the middle square, like a face crop)
    let out = c.toDataURL('image/webp', .82); if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/jpeg', .82);
    if (!roomPicOk(out)) out = c.toDataURL('image/jpeg', .6);
    if (!roomPicOk(out)) { deskToast('That picture didn\'t work: try another'); return; }
    ROOM.pic = out; save(); if (roomSay) roomSay(roomHello()); roomDraw(); deskToast('Your picture is set');
  } catch (e) { deskToast('That picture didn\'t work: try another'); }
});
function roomPicRemove() { ROOM.pic = ''; save(); if (roomSay) roomSay(roomHello()); roomDraw(); }

/* ---------- how the connecting is going (shown in the panel, so a room that stays empty says why) ---------- */
// every direct connection the room parts open goes through this: "connecting" means a friend's browser was found and
// answered, "connected" that it worked, "failed" that your two networks wouldn't let the browsers reach each other
let roomLib = null, roomWatchT = 0;
const roomDiag = { at: 0, found: 0, ok: 0, failed: 0, insecure: false };
const RoomPC = typeof RTCPeerConnection === 'function' ? class extends RTCPeerConnection {
  constructor(c) { super(c); let seen = false;
    this.addEventListener('connectionstatechange', () => { const s = this.connectionState;
      if (s === 'connecting' && !seen) { seen = true; roomDiag.found++; } else if (s === 'connected') roomDiag.ok++; else if (s === 'failed') roomDiag.failed++; else return;
      roomWatch(); }); }
} : undefined;
function roomTrackers() { // how many of the trackers answered: [open, all]
  try { const ss = Object.values(roomLib.getRelaySockets()); return [ss.filter(s => s && s.readyState === 1).length, ss.length]; } catch (e) { return [0, 0]; }
}
function roomWatch() { clearTimeout(roomWatchT); if (!room) return;
  const old = !roomPanel.hidden && roomPanel.querySelector('.sx-rp-st'), now = roomStatusEl();
  if (old && now) old.replaceWith(now); else if (!!old !== !!now && !roomPanel.hidden) roomDraw();
  roomWatchT = setTimeout(roomWatch, 2000); }
let roomDiagOpen = false;
function roomStatus() { // how it's going while you wait: { kind: 'wait' or 'bad', text, more }; nothing once friends are here
  if (roomDiag.insecure) return { kind: 'bad', text: 'Rooms need https:// or localhost', more: 'This page is ' + location.origin + ', a plain http:// address, so the browser turns off the encryption rooms need. Open the app from https:// or from localhost on each computer.' };
  if (!room || roomOnline().length) return null;
  const [open, all] = roomTrackers(), secs = (Date.now() - roomDiag.at) / 1000;
  const nums = 'Trackers ' + open + ' of ' + all + ' · found ' + roomDiag.found + ' · connected ' + roomDiag.ok + (roomDiag.failed ? ' · failed ' + roomDiag.failed : '') + '.';
  if (!open && secs > 8) return { kind: 'bad', text: 'Can\'t reach the trackers', more: nums + ' You may be offline, or this network blocks them: try another Wi-Fi or a phone hotspot.' };
  if (roomDiag.failed && !roomDiag.ok) return { kind: 'bad', text: 'Found a friend, but couldn\'t connect', more: nums + ' Your two networks wouldn\'t let the browsers reach each other directly. This happens on some school, office and mobile networks: try both on the same Wi-Fi, or another network.' };
  if (roomDiag.found > roomDiag.ok + roomDiag.failed) return { kind: 'wait', text: 'Found someone, connecting...', more: nums };
  if (secs > 25) return { kind: 'wait', text: 'Nobody here with this code yet', more: nums + ' Check you both have the same code, and the same version (' + APP_VERSION + ' here, at the bottom of Settings).' };
  return { kind: 'wait', text: 'Looking for friends...', more: nums };
}
function roomStatusEl() {
  const st = roomStatus(); if (!st) return null;
  return el('div', { class: 'sx-rp-st ' + st.kind, role: 'status' }, el('i', {}), el('span', {}, st.text),
    el('button', { type: 'button', 'aria-expanded': String(roomDiagOpen), onclick: () => { roomDiagOpen = !roomDiagOpen; roomWatch(); } }, roomDiagOpen ? 'hide' : 'details'),
    roomDiagOpen ? el('p', {}, st.more) : null);
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
  const [say, hear] = room.makeAction('hi'), [send, get] = room.makeAction('card'), [tell, heard] = room.makeAction('msg');
  roomSay = say; roomCard = send; roomTell = tell;
  heard((d, pid) => roomHeard(d, pid));
  room.onPeerJoin(pid => say(roomHello(), pid));
  room.onPeerLeave(pid => { const p = roomPeers.get(pid); roomPeers.delete(pid); if (p && !roomBlocked(p.id)) deskToast(p.name + ' left the room'); roomDraw(); roomSendState(); });
  hear((d, pid) => { if (!d || typeof d.id !== 'string') return;
    const p = { id: d.id.slice(0, 24), name: String(d.name || '').trim().slice(0, 24) || 'A friend', pic: roomPicOk(d.pic) ? d.pic : '' }, had = roomPeers.get(pid);
    roomPeers.set(pid, p); if (!had && !roomBlocked(p.id)) { deskToast(p.name + ' is here'); deskSfx('pin'); }
    roomDraw(); roomSendState(); });
  get((d, pid) => roomReceive(d, pid));
  say(roomHello()); roomDraw(); roomSendState(); deskToast('You\'re in ' + code + ': give friends the code');
}
function roomLeave(quiet) {
  if (!room) return; try { room.leave(); } catch (e) { /* already gone */ }
  clearTimeout(roomWatchT); room = null; roomCode = ''; roomSay = roomCard = roomTell = null; roomMsgTo = null; roomPeers.clear(); roomDraw(); roomSendState(); if (!quiet) deskToast('You left the room');
}
addEventListener('pagehide', () => roomLeave(true));

/* ---------- sending ---------- */
async function roomSend(to) { // to: one friend's browser id, or null for everyone
  if (!room || !roomCard) return;
  const left = ROOM_COOL - (Date.now() - roomSentAt); if (left > 0) { deskToast('Wait ' + Math.ceil(left / 1000) + ' s before sending again'); return; }
  const its = [...picked].map(itemOf).filter(it => it && ROOM_TYPES.includes(it.type)).slice(0, ROOM_MAX);
  if (!its.length) { deskToast('Notes, photos, tables and books can be sent'); return; }
  const targets = to ? [to] : roomOnline().map(([pid]) => pid); if (!targets.length) return;
  const ids = new Set(its.map(it => it.id)), x0 = Math.min(...its.map(it => it.x)), y0 = Math.min(...its.map(it => it.y));
  const items = its.map(it => { const o = JSON.parse(JSON.stringify(it)); o.x -= x0; o.y -= y0; delete o.key; delete o.board; delete o.from; return o; });
  const pages = its.filter(it => it.type === 'book').flatMap(b => (b.pages || []).map(itemOf).filter(p => p && p.book === b.id)).slice(0, 400); // (a book's pages go along)
  pages.forEach(p => { const o = JSON.parse(JSON.stringify(p)); delete o.board; delete o.from; o.x = 0; o.y = 0; items.push(o); });
  const photos = {}; for (const it of [...its, ...pages]) if (it.type === 'photo' || (it.type === 'book' && it.cover)) { try { let src = await PHOTOS.get(it.id); if (src && src.length > 2.9e6) src = await shrinkSrc(src, 1400); if (src) photos[it.id] = src; } catch (e) { /* skip */ } } // (a big one goes smaller)
  roomSentAt = Date.now(); roomSendState();
  try { await roomCard({ name: roomHello().name, items, links: B_().links.filter(l => ids.has(l[0]) && ids.has(l[1])), photos }, targets); }
  catch (e) { deskToast('That didn\'t send: try again in a moment'); return; }
  const what = its.length > 1 ? its.length + ' cards' : { note: 'a note', photo: 'a photo', tbl: 'a table', book: 'a book' }[its[0].type];
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
  const b = (label, title, fn, who) => { const x = deskBtn([who ? roomAv(who, true) : null, label], fn, 'sx-room-b', title); x.disabled = cool; return x; };
  roomSendRow.replaceChildren(el('span', { class: 'sx-ws-n' }, cool ? 'Send again in ' + Math.ceil(left / 1000) + ' s' : 'Send to'),
    ...online.map(([pid, p]) => b(p.name, 'Send what is picked to ' + p.name, () => roomSend(pid), p)),
    ...(online.length > 1 ? [b('Everyone', 'Send what is picked to everyone in the room', () => roomSend(null))] : []));
  if (cool) roomTick = setTimeout(roomSendState, Math.min(1000, left % 1000 || 1000));
}
const deskSelBarR = deskSelBar;
deskSelBar = function () { deskSelBarR.apply(this, arguments); roomSendState(); };

/* ---------- messages: a line of words to a friend (or everyone) that slides in at their top right. The bubbles stay:
   the last twenty, the newest on top pushing the others down; scroll the column to read back. Leaving the room clears them ---------- */
const ROOM_MSG_LEN = 140, ROOM_MSG_COOL = 1200, ROOM_MSG_GAP = 800; // you: one every 1.2 s; each friend: one taken every 0.8 s
let roomMsgTo = null, roomMsgAt = 0; const roomHeardAt = new Map();
// the talk line, at the top right (js/chrome.js moves the box into it): the box to write in (while friends are here), and the messages under it
const roomMsgs = el('div', { class: 'sx-msgs', role: 'log', 'aria-live': 'polite', 'aria-label': 'Messages from friends' });
const roomTalkBox = el('div', { class: 'sx-talk-box', hidden: true });
const roomTalkEl = el('div', { class: 'sx-talk' }, roomTalkBox, roomMsgs);
document.body.append(roomTalkEl);
const ROOM_MSG_KEEP = 20;
// the last twenty messages stay, newest on top; scroll the column to read back
function roomMsgShow(who, to, text, person, mine) {
  const when = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const slip = el('div', { class: 'sx-msg' + (mine ? ' mine' : '') },
    el('div', { class: 'sx-msg-in' }, el('div', { class: 'sx-msg-h' }, roomAv(person, true), el('b', {}, who), el('span', {}, to + ' \u00b7 ' + when)), el('p', { class: 'sx-msg-b' }, text)));
  roomMsgs.prepend(slip); requestAnimationFrame(() => requestAnimationFrame(() => slip.classList.add('on')));
  [...roomMsgs.children].slice(ROOM_MSG_KEEP).forEach(x => x.remove()); // (the oldest go)
}
function roomTalk(text) {
  text = String(text || '').replace(/\s+/g, ' ').trim().slice(0, ROOM_MSG_LEN); if (!text || !room || !roomTell) return false;
  const left = ROOM_MSG_COOL - (Date.now() - roomMsgAt); if (left > 0) return false;
  const online = roomOnline(), to = roomMsgTo && roomPeers.has(roomMsgTo) && !roomBlocked(roomPeers.get(roomMsgTo).id) ? roomMsgTo : null;
  const targets = to ? [to] : online.map(([pid]) => pid); if (!targets.length) { deskToast('Nobody in the room to hear it yet'); return false; }
  roomMsgAt = Date.now(); roomTell({ text, all: !to }, targets).catch(() => {});
  roomMsgShow('You', to ? 'to ' + roomPeers.get(to).name : 'to everyone', text, roomMe(), true);
  return true;
}
function roomHeard(d, pid) {
  const p = roomPeers.get(pid); if (!p || roomBlocked(p.id) || !d || typeof d.text !== 'string') return;
  const now = Date.now(); if (now - (roomHeardAt.get(p.id) || 0) < ROOM_MSG_GAP) return; roomHeardAt.set(p.id, now);
  const text = d.text.replace(/\s+/g, ' ').trim().slice(0, ROOM_MSG_LEN); if (!text) return;
  roomMsgShow(p.name, d.all ? 'to everyone' : 'to you', text, p);
  if (typeof sfxPlay === 'function') sfxPlay('ui'); // (the soft notification blip)
}

/* ---------- receiving: it pops onto your desk, in the middle of what you're looking at ---------- */
async function roomReceive(d, pid) {
  const p = roomPeers.get(pid); if (!p || roomBlocked(p.id) || !d || !Array.isArray(d.items)) return; // (someone who hasn't said hello, or blocked)
  const now = Date.now(); if (now - (roomGot.get(p.id) || 0) < ROOM_GAP) return; roomGot.set(p.id, now); // (too fast: let it go)
  const tag = '-r' + now.toString(36), num = v => isFinite(+v) ? Math.round(+v) : 0, str = (v, n) => typeof v === 'string' ? v.slice(0, n) : '';
  const imap = new Map(), gmap = {}, out = [];
  const refs = new Map(); // (a book's pages: tied to it below, once everything has its new name)
  for (const it of d.items.slice(0, ROOM_MAX + 400)) {
    if (!it || !ROOM_TYPES.includes(it.type) || (it.type === 'book' && typeof it.book === 'string')) continue;
    const id = (it.type === 'tbl' ? 't' : it.type === 'photo' ? 'p' : it.type === 'book' ? 'k' : 'n') + now + '-' + out.length;
    const o = { id, type: it.type, board: B_().cur, x: Math.max(-4000, Math.min(4000, num(it.x))), y: Math.max(-4000, Math.min(4000, num(it.y))), from: p.name };
    if (it.text) o.text = str(it.text, 2000);
    if (it.type === 'note') { if (it.html) o.html = noteClean(str(it.html, NOTE_MAX)); if (it.color) o.color = str(it.color, 12); if (PALETTE.includes(it.bg)) o.bg = it.bg; if (it.fs) o.fs = num(it.fs); if (it.w) o.w = num(it.w); if (it.h) o.h = num(it.h); if (PAPERS.some(q => q[0] === it.paper)) o.paper = it.paper; if (it.topic === true) o.topic = true; }
    if (it.type === 'tbl') Object.assign(o, tblClean(it));
    if (it.type === 'photo') { const src = d.photos && d.photos[it.id]; if (typeof src !== 'string' || !/^data:image\/(jpeg|png|webp|gif);base64,/.test(src) || src.length > 3e6) continue;
      if (it.ar) o.ar = Math.max(.1, Math.min(10, +it.ar || 1)); if (it.w) o.w = Math.max(120, Math.min(1600, num(it.w))); try { await PHOTOS.put(id, src); } catch (e) { continue; } }
    if (it.type === 'book') { o.title = str(it.title, 80); if (NOTE_COLORS.some(c => c[0] === it.color)) o.color = it.color; if (typeof PALETTE !== 'undefined') { if (PALETTE.includes(it.bg)) o.bg = it.bg; if (PALETTE.includes(it.ink)) o.ink = it.ink; } if (typeof bookDecoClean === 'function') bookDecoClean(it, o); o.at = 0;
      const src = d.photos && d.photos[it.id]; if (it.cover && typeof src === 'string' && /^data:image\/(jpeg|png|webp|gif);base64,/.test(src) && src.length <= 3e6) { try { await PHOTOS.put(id, src); o.cover = true; } catch (e) { /* no cover */ } }
      refs.set(o, Array.isArray(it.pages) ? it.pages.slice(0, 400) : []); }
    if (typeof it.book === 'string') { refs.set(o, it.book); delete o.from; if (PALETTE.includes(it.flag)) o.flag = it.flag; }
    if (it.type !== 'book' && Array.isArray(it.stickers) && it.stickers.length && typeof bookStkClean === 'function') o.stickers = bookStkClean(it.stickers); // (stickers on any card)
    if (typeof it.group === 'string' && typeof it.book !== 'string') o.group = gmap[it.group] || (gmap[it.group] = 'g' + tag + out.length);
    imap.set(it.id, id); out.push(o);
  }
  refs.forEach((r, o) => { if (Array.isArray(r)) o.pages = r.filter(x => imap.has(x)).map(x => imap.get(x)); else if (imap.has(r)) o.book = imap.get(r); }); // (a page whose book didn't come is a loose card)
  const loose = out.filter(o => !o.book); if (!loose.length) return;
  const w = Math.max(...loose.map(o => o.x + (o.w || 220))), h = Math.max(...loose.map(o => o.y + (o.h || 160)));
  loose.forEach(o => { o.x = Math.round(cam.x - w / 2 + o.x); o.y = Math.round(cam.y - h / 2 + o.y); });
  deskMark(); B_().items.push(...out);
  (Array.isArray(d.links) ? d.links : []).forEach(l => { if (Array.isArray(l) && imap.has(l[0]) && imap.has(l[1])) B_().links.push([imap.get(l[0]), imap.get(l[1])]); });
  save(); drawBoard();
  loose.forEach((o, i) => setTimeout(() => deskLand(o.id, i === 0), i * 70)); // (they land one after another, with the pin)
  const what = loose.length > 1 ? loose.length + ' cards' : { note: 'a note', photo: 'a photo', tbl: 'a table', book: 'a book' }[loose[0].type];
  deskToast(p.name + ' sent you ' + what);
}
// a received card wears a small "from" tag until you take it off (click it)
const drawBoardRoom = drawBoard;
drawBoard = function () {
  drawBoardRoom.apply(this, arguments);
  B_().items.forEach(it => { if (!it.from || it.board !== B_().cur) return; const c = els.get(it.id); if (!c || c.querySelector(':scope > .sx-from')) return; // (a kept card has it already)
    c.append(el('button', { type: 'button', class: 'sx-from', title: 'From ' + it.from + ': click to take the tag off', onclick: e => { e.stopPropagation(); deskMark(); delete it.from; save(); e.currentTarget.remove(); } }, 'from ' + it.from)); });
};

/* ---------- the Room key (top right, js/chrome.js) and its panel ---------- */
const roomN = el('span', { class: 'sx-mem-n', hidden: true });
const roomB = deskBtn('Room', () => roomPanel.hidden ? roomOpen() : roomClose(), 'sx-room-key', 'A room with friends: send each other notes, photos and tables');
roomB.append(roomN); deskTray.append(roomB);
const roomPanel = el('div', { class: 'sx-mem sx-room', hidden: true, role: 'dialog', 'aria-label': 'Room' });
document.body.append(roomPanel);
function roomOpen() { roomPanel.hidden = false; roomB.classList.add('on'); roomDraw(); requestAnimationFrame(() => roomPanel.classList.add('on')); deskSfx('pick'); }
function roomClose() { if (roomPanel.hidden) return; roomPanel.classList.remove('on'); roomPanel.hidden = true; roomB.classList.remove('on'); }
const roomNameI = el('input', { class: 'sx-room-i', type: 'text', maxlength: 24, placeholder: 'Your name', value: ROOM.name || '', 'aria-label': 'Your name in rooms' });
let roomNameT = 0; roomNameI.addEventListener('input', () => { ROOM.name = roomNameI.value.slice(0, 24); save(); clearTimeout(roomNameT); roomNameT = setTimeout(() => { if (roomSay) roomSay(roomHello()); }, 600); });
const roomMsgI = el('input', { class: 'sx-talk-i', type: 'text', maxlength: ROOM_MSG_LEN, placeholder: 'Say something...', 'aria-label': 'A message to friends', enterkeyhint: 'send' });
roomMsgI.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); if (roomTalk(roomMsgI.value)) roomMsgI.value = ''; } else if (e.key === 'Escape') { e.preventDefault(); roomMsgI.blur(); } });
function roomTalkDraw() { // the box shows while you're in a room with someone; with two or more, who it's to
  const online = room ? roomOnline() : [], show = online.length > 0; roomTalkBox.hidden = !show; if (!show) return;
  if (roomMsgTo && !online.some(([pid]) => pid === roomMsgTo)) roomMsgTo = null;
  const keep = document.activeElement === roomMsgI && [roomMsgI.selectionStart, roomMsgI.selectionEnd];
  const to = online.length > 1 ? el('div', { class: 'sx-talk-to', role: 'radiogroup', 'aria-label': 'Who to' }, ...[[null, 'Everyone', null]].concat(online.map(([pid, p]) => [pid, p.name, p])).map(([pid, n, who]) => {
    const on = roomMsgTo === pid;
    return el('button', { type: 'button', class: on ? 'on' : null, role: 'radio', 'aria-checked': String(on), onmousedown: e => e.preventDefault(), onclick: () => { roomMsgTo = pid; roomTalkDraw(); roomMsgI.focus(); } }, who ? roomAv(who, true) : null, n); })) : null;
  roomMsgI.placeholder = online.length > 1 ? (roomMsgTo ? 'To ' + roomPeers.get(roomMsgTo).name + '...' : 'To everyone...') : 'To ' + online[0][1].name + '...';
  roomTalkBox.replaceChildren(...[to, el('div', { class: 'sx-talk-row' }, roomMsgI,
    el('button', { type: 'button', class: 'sx-talk-send', title: 'Send (Enter)', 'aria-label': 'Send', onmousedown: e => e.preventDefault(), onclick: () => { if (roomTalk(roomMsgI.value)) roomMsgI.value = ''; } }, '\u27a4'))].filter(Boolean));
  if (keep) { roomMsgI.focus(); try { roomMsgI.setSelectionRange(keep[0], keep[1]); } catch (e) { /* fine */ } }
}
let roomEditName = false;
roomNameI.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); if (room && ROOM.name.trim()) { roomEditName = false; roomDraw(); } } });
roomNameI.addEventListener('blur', () => { if (room && roomEditName && ROOM.name.trim()) setTimeout(() => { if (document.activeElement !== roomNameI) { roomEditName = false; roomDraw(); } }, 0); });
const roomSvg = d => { const s2 = el('span', { class: 'sx-rp-svg', 'aria-hidden': 'true' }); s2.innerHTML = '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">' + d + '</svg>'; return s2; };
const ROOM_ICON = { copy: '<rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 3.5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v6.5a1 1 0 0 0 1 1h.5"/>', ban: '<circle cx="8" cy="8" r="6"/><path d="M3.8 12.2l8.4-8.4"/>' };
function roomCopy() { if (navigator.clipboard) navigator.clipboard.writeText(roomCode).then(() => deskToast('Copied the room code'), () => {}); }
function roomDraw(focusName) {
  const online = roomOnline(); roomN.textContent = room ? String(online.length) : ''; roomN.hidden = !room || !online.length;
  roomB.classList.toggle('live', !!room); roomTalkDraw();
  if (roomPanel.hidden) return;
  const btn = (label, fn, cls, title) => el('button', { type: 'button', class: 'sx-ws-b' + (cls ? ' ' + cls : ''), title: title || null, 'aria-label': title || null, onclick: fn }, label);
  const sec = (cls, ...kids) => el('div', { class: 'sx-rp-sec' + (cls ? ' ' + cls : '') }, ...kids);
  const ae = document.activeElement, keep = ae === roomNameI && [roomNameI.selectionStart, roomNameI.selectionEnd];
  // your face: click it to pick a picture (and the small x takes it off)
  const face = el('span', { class: 'sx-rp-face' }, el('button', { type: 'button', class: 'sx-rp-avb', title: ROOM.pic ? 'Change your picture' : 'Add a picture', 'aria-label': ROOM.pic ? 'Change your picture' : 'Add a picture', onclick: () => roomPicFile.click() }, roomAv(roomMe())),
    ROOM.pic ? el('button', { type: 'button', class: 'sx-rp-avx', title: 'Take your picture off', 'aria-label': 'Take your picture off', onclick: roomPicRemove }, '\u00d7') : null);
  const state = room ? el('span', { class: 'sx-rp-state on' }, el('i', {}), online.length ? online.length + (online.length === 1 ? ' friend here' : ' friends here') : 'online') : el('span', { class: 'sx-rp-state' }, 'offline');
  const parts = [el('div', { class: 'sx-mem-top' }, el('h3', {}, 'Room'), el('span', { class: 'sx-gap' }), state)];
  if (!room) {
    const code = el('input', { class: 'sx-room-i sx-room-code-i', type: 'text', maxlength: 30, placeholder: 'TAPE-XXXX-XXXX-XXXX', value: roomNorm(ROOM.last) || '', 'aria-label': 'Room code', spellcheck: 'false' });
    code.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); roomJoin(code.value); } });
    parts.push(sec('', el('div', { class: 'sx-rp-lbl' }, 'You appear as'), el('div', { class: 'sx-rp-row' }, face, roomNameI)));
    const st = roomStatusEl(); if (st) parts.push(st);
    parts.push(sec('', btn(roomBusy ? 'Opening...' : 'Make a room', () => roomJoin(roomNewCode()), 'sx-rp-go'),
      el('div', { class: 'sx-rp-or' }, 'or join one'), el('div', { class: 'sx-rp-row' }, code, btn('Join', () => roomJoin(code.value)))),
      el('p', { class: 'sx-rp-foot-note' }, 'Only people with the code can join. Cards and messages go straight between your browsers.'));
  } else {
    if (!online.length) parts.push(sec('sx-rp-code', el('div', { class: 'sx-rp-lbl' }, 'Share this code'), el('b', {}, roomCode), btn([roomSvg(ROOM_ICON.copy), 'Copy'], roomCopy, 'sx-rp-copy', 'Copy the code to give to friends')));
    const st = roomStatusEl(); if (st) parts.push(st);
    parts.push(sec('', el('div', { class: 'sx-rp-lbl' }, 'Here now'), online.length
      ? el('ul', { class: 'sx-rp-friends' }, ...online.map(([pid, p]) => { let armT = 0;
          const ban = el('button', { type: 'button', class: 'sx-rp-ban', title: 'Block ' + p.name, 'aria-label': 'Block ' + p.name, onclick: () => {
            if (!ban.classList.contains('arm')) { ban.classList.add('arm'); ban.lastChild.textContent = 'Block?'; armT = setTimeout(() => { ban.classList.remove('arm'); ban.lastChild.textContent = ''; }, 3000); return; }
            clearTimeout(armT); ROOM.block.push({ id: p.id, name: p.name }); save(); deskToast('Blocked ' + p.name + ': their cards and messages won\'t reach you'); roomDraw(); roomSendState(); } }, roomSvg(ROOM_ICON.ban), el('span', {}, ''));
          return el('li', {}, roomAv(p), el('b', {}, p.name), ban); }))
      : el('p', { class: 'sx-rp-empty' }, 'Nobody yet. Send them the code.')));
    if (online.length) parts.push(sec('', el('div', { class: 'sx-rp-hint' }, 'Chat with them in the line at the top'),
      el('div', { class: 'sx-rp-hint' }, el('kbd', {}, '\u2197'), 'pick a card, then Send to'),
      el('div', { class: 'sx-rp-mini' }, el('code', {}, roomCode), el('button', { type: 'button', class: 'sx-rp-icon', title: 'Copy the room code', 'aria-label': 'Copy the room code', onclick: roomCopy }, roomSvg(ROOM_ICON.copy)))));
    const me = roomEditName || !(ROOM.name || '').trim() ? roomNameI
      : el('button', { type: 'button', class: 'sx-rp-me', title: 'Change your name', onclick: () => { roomEditName = true; roomDraw(); roomNameI.focus(); roomNameI.select(); } }, 'You appear as ', el('b', {}, ROOM.name), ' \u270e');
    parts.push(sec('sx-rp-foot', face, me, btn('Leave', () => roomLeave(), 'sx-rp-leave', 'Leave the room')));
  }
  if (ROOM.block.length) parts.push(sec('', el('div', { class: 'sx-rp-lbl' }, 'Blocked'), el('ul', { class: 'sx-rp-friends' }, ...ROOM.block.map(b => el('li', {}, roomAv(b), el('b', {}, b.name),
    btn('Unblock', () => { ROOM.block = ROOM.block.filter(x => x !== b); save(); roomDraw(); roomSendState(); }, 'sx-rp-unblock'))))));
  roomPanel.replaceChildren(...parts);
  if (keep) { roomNameI.focus(); try { roomNameI.setSelectionRange(keep[0], keep[1]); } catch (e) { /* fine */ } } else if (focusName) roomNameI.focus();
}
roomDraw();
