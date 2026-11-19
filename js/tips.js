/* Cassie: the keys' own tooltips. Point at a key in the left column, the bar along the bottom or the two top
   corners and a small card shows at once beside it: the key's name, what it does, and its shortcut. It takes the place of
   the browser's slow grey title box (the title moves into the card; icon keys keep it as their spoken name). */
'use strict';

const TIP_KEYS = '.sx-ws-bar button, .sx-tray button, .sx-net button';
const tipName = el('b', { class: 'sx-tip-n' }), tipDesc = el('span', { class: 'sx-tip-d' }), tipKbd = el('kbd', { class: 'sx-tip-k' });
const tipBox = el('div', { class: 'sx-tip', role: 'tooltip', id: 'sx-tip', hidden: true }, el('div', { class: 'sx-tip-h' }, tipName, tipKbd), tipDesc);
document.body.append(tipBox);
let tipOn = null;
// the keys whose titles are a bare phrase get a name and a line on what they do
const TIP_WORDS = {
  'Find on your boards': 'Find: words on any of your boards',
  'Undo (Ctrl+Z)': 'Undo: take back the last change (Ctrl+Z)',
  'Redo (Ctrl+Shift+Z)': 'Redo: put it back again (Ctrl+Shift+Z)',
  'Settings': 'Settings: the timer, sounds, the look and the desk',
  'How it works (?)': 'How it works: every key and gesture (?)',
  'Your music and mixtapes': 'Tapes: your music and mixtapes',
  'A small clock that stays on top of your other windows': 'Mini: a small deck that stays on top of your other windows',
  'Only the clock, full screen': 'Full: only the clock, full screen',
  'Group them, so they move together like one thing': 'Group: they move together like one thing',
  'Ungroup': 'Ungroup: each moves on its own again',
  'Delete what is picked (Delete)': 'Delete: what is picked (Delete)',
  'A room with friends: send each other notes, photos, tables and labels, and messages': 'Room: send friends notes, photos, tables, labels and messages',
  'You, and the room': 'You: your name, your picture and the room panel',
};

// "Note: pin a new one (or double-click the desk)" → Note / Pin a new one (or double-click the desk); "Undo (Ctrl+Z)" → Undo / Ctrl+Z
function tipParts(t) {
  let kbd = '', extra = '';
  const isKey = x => /^(Ctrl|Shift|Alt|Space|Hold|Esc|Enter|Tab|Delete|[A-Z0-9?/]([ +]|$))/.test(x.trim());
  const m = t.match(/\s*\(([^()]{1,60})\)\s*$/);
  if (m) { // what's in brackets at the end: a key goes in the little key; anything else ("# then space", "or drop it on") joins the line below
    t = t.slice(0, m.index);
    m[1].split(/,\s*|\s+or\s+/).map(x => x.replace(/^or\s+/, '').trim()).filter(Boolean).forEach(x => { if (!kbd && isKey(x)) kbd = x; else extra += (extra ? ', ' : '') + x; });
    if (!kbd) extra = m[1].trim(); // (no key in it: the words as they were)
    if (extra && /then space/.test(extra)) extra = 'or type ' + extra; // (a typing shortcut)
  }
  const i = t.indexOf(': '), cap = s => s ? s[0].toUpperCase() + s.slice(1) : '';
  const name = i > 0 && i < 28 ? t.slice(0, i) : t, desc = i > 0 && i < 28 ? t.slice(i + 2) : '';
  return { name: cap(name), desc: cap([desc, extra && (desc ? '(' + extra + ')' : extra)].filter(Boolean).join(' ')), kbd };
}
function tipShow(b) {
  if (b.title) { // (the browser's own box would show too: the words move into ours)
    b.dataset.tip = b.title; if (!b.getAttribute('aria-label') && !b.textContent.trim()) b.setAttribute('aria-label', b.title); b.removeAttribute('title'); }
  const t = TIP_WORDS[b.dataset.tip] || b.dataset.tip; if (!t) { tipHide(); return; }
  const p = tipParts(t); tipName.textContent = p.name; tipDesc.textContent = p.desc; tipDesc.hidden = !p.desc; tipKbd.textContent = p.kbd; tipKbd.hidden = !p.kbd;
  tipOn = b; b.setAttribute('aria-describedby', 'sx-tip');
  tipBox.hidden = false; tipBox.classList.remove('on');
  // beside the left column, under the top corners, above the bottom bar; always on the screen
  const r = b.getBoundingClientRect(), w = tipBox.offsetWidth, h = tipBox.offsetHeight, gap = 10;
  const side = b.closest('.sx-ws-side') ? 'r' : r.top < innerHeight / 2 ? 'b' : 't';
  let x = side === 'r' ? r.right + gap : r.left + r.width / 2 - w / 2, y = side === 'r' ? r.top + r.height / 2 - h / 2 : side === 'b' ? r.bottom + gap : r.top - h - gap;
  x = Math.max(8, Math.min(innerWidth - w - 8, x)); y = Math.max(8, Math.min(innerHeight - h - 8, y));
  tipBox.dataset.side = side; tipBox.style.left = Math.round(x) + 'px'; tipBox.style.top = Math.round(y) + 'px';
  tipBox.style.setProperty('--ax', Math.round(r.left + r.width / 2 - x) + 'px'); tipBox.style.setProperty('--ay', Math.round(r.top + r.height / 2 - y) + 'px'); // (where the little arrow points)
  requestAnimationFrame(() => tipBox.classList.add('on'));
}
function tipHide() { if (tipOn) tipOn.removeAttribute('aria-describedby'); tipOn = null; tipBox.classList.remove('on'); tipBox.hidden = true; }
addEventListener('pointerover', e => { if (e.pointerType === 'touch') return; const b = e.target.closest && e.target.closest(TIP_KEYS); if (b && b !== tipOn) tipShow(b); else if (!b && tipOn) tipHide(); });
addEventListener('pointerdown', tipHide, true);
addEventListener('focusin', e => { const b = e.target.closest && e.target.closest(TIP_KEYS); if (b && b.matches(':focus-visible')) tipShow(b); });
addEventListener('focusout', e => { if (e.target === tipOn) tipHide(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && tipOn) tipHide(); }, true);
addEventListener('wheel', tipHide, { passive: true }); addEventListener('blur', tipHide);
document.addEventListener('pointerleave', tipHide);
