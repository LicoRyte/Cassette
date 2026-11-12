/* Solarist: the Board. Every episode you've played is a card on a cork board: drag the cards anywhere, tie red string
   from one card's pin to another to connect them, pin up your own notes, and work out what it all means.
   Everything you arrange is saved (S.board: card positions, strings and notes). */
'use strict';

if (!S.board || typeof S.board !== 'object') S.board = { pos: {}, links: [], notes: [] };
['pos', 'links', 'notes'].forEach(k => { if (!S.board[k]) S.board[k] = k === 'pos' ? {} : []; });
let boardStory = null; // which story's cards are on the board; null: the one you're playing

// which story an event belongs to (choices and other logs aren't cards)
function evStory(e) {
  if (e.c === 'camp') return 'The Meridian';
  if (e.c === 'crew') return 'Crew stories';
  if (e.c !== 'season' || !e.title || /^(Your choice|A story begins)/.test(e.title)) return null;
  if (/^Season \d/.test(e.title)) return 'Voyages';
  const i = e.title.indexOf(' · '); return i > 0 ? e.title.slice(0, i) : null;
}
const evId = e => 'e' + e.at;
const evShort = e => { const parts = e.title.split(' · '); return parts.length > 2 ? parts.slice(2).join(' · ') : parts.slice(1).join(' · ') || e.title; };
const tilt = id => { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return ((h % 50) - 25) / 10; }; // each card hangs a little crooked

const boardPane = el('div', { class: 'sl-pane sx-boardpane', hidden: true });
page.querySelector('.sl-body').append(boardPane);
const tabBoard = el('button', { type: 'button', onclick: () => tab('board') }, 'Board');
tabStories.after(tabBoard);
const tabBase2 = tab;
tab = function (t) {
  if (t !== 'board') { boardPane.hidden = true; tabBoard.removeAttribute('aria-current'); return tabBase2(t); }
  tabBase2('settings'); settingsPane.hidden = true; tabSet.removeAttribute('aria-current');
  boardPane.hidden = false; tabBoard.setAttribute('aria-current', 'page'); pageTitle.textContent = 'Board'; drawBoard();
};

const SVGNS = 'http://www.w3.org/2000/svg';
function drawBoard() {
  const evs = S.events.filter(e => evStory(e)), names = [...new Set(evs.map(evStory))];
  const playing = activeStory().title, story = boardStory && names.includes(boardStory) ? boardStory : names.includes(playing) ? playing : names[0] || null;
  const cards = evs.filter(e => evStory(e) === story);
  const sel = el('select', { 'aria-label': 'Which story' }, names.map(n => el('option', { value: n, selected: n === story || null }, n)));
  sel.addEventListener('change', () => { boardStory = sel.value; drawBoard(); });
  const addNote = el('button', { type: 'button', class: 'btn' }, 'Add a note');
  const tidy = el('button', { type: 'button', class: 'btn sx-mini' }, 'Tidy up');
  const area = el('div', { class: 'sx-board' }), svg = document.createElementNS(SVGNS, 'svg'); svg.setAttribute('class', 'sx-strings'); area.append(svg);
  const wrap = el('div', { class: 'sx-board-wrap' }, area);
  boardPane.replaceChildren(
    el('div', { class: 'sx-board-bar' }, names.length ? sel : null, addNote, tidy, el('small', { class: 'sl-muted' }, 'Drag cards around. Drag from a red pin onto another card to tie a string. Click a string to cut it. Double-click a card to read it all.')),
    cards.length || S.board.notes.some(n => !n.story || n.story === story) ? wrap : el('p', { class: 'sl-muted' }, 'Nothing on the board yet. Every episode you play turns up here as a card.'));
  if (!cards.length && !S.board.notes.some(n => !n.story || n.story === story)) return;
  // the cards and the notes
  const items = new Map(); // id -> element
  const place = (id, i) => S.board.pos[id] || { x: 40 + (i % 5) * 270, y: 50 + Math.floor(i / 5) * 230 };
  cards.forEach((e, i) => {
    const id = evId(e), at = place(id, i);
    const c = el('div', { class: 'sx-bcard', 'data-id': id, style: 'left:' + at.x + 'px;top:' + at.y + 'px;--tilt:' + tilt(id) + 'deg' },
      el('span', { class: 'sx-pin', title: 'Drag to another card to tie a string' }), el('small', {}, new Date(e.at).toLocaleDateString()), el('b', {}, evShort(e)), el('p', {}, e.t));
    c.addEventListener('dblclick', () => c.classList.toggle('open'));
    items.set(id, c); area.append(c);
  });
  const notes = S.board.notes.filter(n => !n.story || n.story === story); // your notes, on the board of the story you pinned them to
  notes.forEach((n, i) => {
    const at = { x: n.x, y: n.y };
    const txt = el('div', { class: 'sx-note-t', contenteditable: 'true', 'aria-label': 'Note' }, n.text || '');
    txt.addEventListener('input', () => { n.text = txt.textContent; save(); });
    const del = el('button', { type: 'button', class: 'sx-bnote-x', 'aria-label': 'Take the note down', onclick: () => { S.board.notes = S.board.notes.filter(x => x !== n); S.board.links = S.board.links.filter(l => !l.includes(n.id)); save(); drawBoard(); } }, '×');
    const c = el('div', { class: 'sx-bcard sx-bnote', 'data-id': n.id, style: 'left:' + at.x + 'px;top:' + at.y + 'px;--tilt:' + tilt(n.id) + 'deg' }, el('span', { class: 'sx-pin' }), del, txt);
    items.set(n.id, c); area.append(c);
  });
  const posOf = id => { const c = items.get(id); return c ? { x: c.offsetLeft + c.offsetWidth / 2, y: c.offsetTop + 10 } : null; };
  // the strings: a gentle sag between two pins
  const pathD = (a, b) => { const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 + 30 + Math.hypot(b.x - a.x, b.y - a.y) * .12; return 'M' + a.x + ' ' + a.y + ' Q' + mx + ' ' + my + ' ' + b.x + ' ' + b.y; };
  function drawStrings(temp) {
    svg.replaceChildren();
    S.board.links.forEach((l, i) => { const a = posOf(l[0]), b = posOf(l[1]); if (!a || !b) return;
      const hit = document.createElementNS(SVGNS, 'path'); hit.setAttribute('d', pathD(a, b)); hit.setAttribute('class', 'sx-string-hit');
      hit.addEventListener('click', () => { S.board.links.splice(i, 1); save(); drawStrings(); });
      const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', pathD(a, b)); p.setAttribute('class', 'sx-string');
      svg.append(p, hit); });
    if (temp) { const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', pathD(temp.a, temp.b)); p.setAttribute('class', 'sx-string sx-string-temp'); svg.append(p); }
  }
  // dragging: a card moves; a pin pulls a string
  area.addEventListener('pointerdown', e => {
    const c = e.target.closest('.sx-bcard'); if (!c || e.button !== 0) return;
    if (e.target.closest('.sx-note-t, .sx-bnote-x')) return;
    const id = c.dataset.id, start = { x: e.clientX, y: e.clientY, l: c.offsetLeft, t: c.offsetTop };
    const box = area.getBoundingClientRect(), local = ev => ({ x: ev.clientX - box.left, y: ev.clientY - box.top });
    e.preventDefault(); c.setPointerCapture(e.pointerId);
    if (e.target.classList.contains('sx-pin')) { // tie a string
      const a = posOf(id);
      const move = ev => drawStrings({ a, b: local(ev) });
      const up = ev => { c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up);
        c.releasePointerCapture(e.pointerId);
        const under = document.elementsFromPoint(ev.clientX, ev.clientY).map(n => n.closest && n.closest('.sx-bcard')).find(n => n && n !== c);
        if (under && !S.board.links.some(l => l.includes(id) && l.includes(under.dataset.id))) { S.board.links.push([id, under.dataset.id]); save(); }
        drawStrings(); };
      c.addEventListener('pointermove', move); c.addEventListener('pointerup', up); return;
    }
    c.classList.add('lift');
    const move = ev => { c.style.left = Math.max(0, start.l + ev.clientX - start.x) + 'px'; c.style.top = Math.max(0, start.t + ev.clientY - start.y) + 'px'; drawStrings(); };
    const up = () => { c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); c.classList.remove('lift');
      const p = { x: c.offsetLeft, y: c.offsetTop }; const n = S.board.notes.find(x => x.id === id); if (n) Object.assign(n, p); else S.board.pos[id] = p; save(); };
    c.addEventListener('pointermove', move); c.addEventListener('pointerup', up);
  });
  addNote.addEventListener('click', () => { const x = wrap.scrollLeft + 60, y = wrap.scrollTop + 60; S.board.notes.push({ id: 'n' + Date.now(), story, text: '', x, y }); save(); drawBoard(); const all = boardPane.querySelectorAll('.sx-bnote .sx-note-t'); if (all.length) all[all.length - 1].focus(); });
  tidy.addEventListener('click', () => { cards.forEach(e => { delete S.board.pos[evId(e)]; }); save(); drawBoard(); });
  requestAnimationFrame(() => drawStrings());
}
