/* Solarist: the album side of the Logbook: favourite worlds, a home planet, a row of planet types still to find,
   and postcards (a pixel card of a world with a caption, signed by the crew, to keep or save as an image). */
'use strict';

if (!Array.isArray(S.cards)) S.cards = []; // kept postcards: { num, caption, at }
const isHome = p => S.home === p.num;
function toggleFav(p) { if (p.fav) delete p.fav; else p.fav = Date.now(); save(); drawLog(); }
function setHome(p) { S.home = isHome(p) ? null : p.num; save(); drawLog(); }

// under the Logbook header: every planet type, the ones not found yet as "?", and the postcard album
function albumBar() {
  const seen = new Set(S.found.map(f => f.p.type)), types = Object.keys(TYPES);
  const strip = el('div', { class: 'sx-types', title: 'Planet types: ' + types.filter(t => seen.has(t)).length + ' of ' + types.length + ' found' },
    types.map(t => el('span', { class: 'sx-ptype' + (seen.has(t) ? ' on' : '') }, seen.has(t) ? t : '?')));
  const favN = S.found.filter(f => f.p.fav).length, home = S.home != null && byNum(S.home);
  return el('div', { class: 'sx-albumbar' }, strip, el('div', { class: 'sx-row-l' },
    el('button', { type: 'button', class: 'btn', onclick: openAlbum }, '📮 Postcards (' + S.cards.length + ')'),
    favN ? el('button', { type: 'button', class: 'sl-link', onclick: () => { typeSel.value = '@fav'; drawLog(); } }, '★ ' + favN + ' favourite' + (favN === 1 ? '' : 's')) : null,
    home ? el('button', { type: 'button', class: 'sl-link', onclick: () => openWorld(home.p.num) }, '🏠 Home: ' + nm(home.p)) : null));
}
// the buttons on a world's page
function worldButtons(p) {
  return [el('button', { type: 'button', class: 'btn' + (p.fav ? ' on' : ''), title: 'Favourite world', 'aria-pressed': String(!!p.fav), onclick: () => toggleFav(p) }, p.fav ? '★ Favourite' : '☆ Favourite'),
    el('button', { type: 'button', class: 'btn' + (isHome(p) ? ' on' : ''), title: 'Your home planet', 'aria-pressed': String(isHome(p)), onclick: () => setHome(p) }, isHome(p) ? '🏠 Home' : '🏠 Make it home'),
    el('button', { type: 'button', class: 'btn', onclick: () => openCard(p) }, '📮 Postcard')];
}

// ---------- postcards ----------
const cardBox = el('div', { class: 'sx-report sx-cardbox', hidden: true, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Postcard' });
root.append(cardBox);
cardBox.addEventListener('click', e => { if (e.target === cardBox) cardBox.hidden = true; });
const cardImg = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
function wrapText(g, text, maxW) { const out = []; let line = ''; text.split(' ').forEach(w => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }); if (line) out.push(line); return out; }
async function cardCanvas(p, caption, at) { // a 480 x 300 card in the planet palette
  const W = 480, H = 300, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.fillStyle = '#34111f'; g.fillRect(0, 0, W, H);
  const r = rng((p.seed ^ 0xCA4D) >>> 0); for (let i = 0; i < 90; i++) { g.fillStyle = r() < .75 ? '#833f34' : '#bfc3c6'; g.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1, 1); }
  g.strokeStyle = '#ffb762'; g.lineWidth = 2; g.strokeRect(8, 8, W - 16, H - 16);
  const img = await cardImg(paint(p, 64)); if (img) g.drawImage(img, 24, 56, 192, 192);
  g.fillStyle = '#ffffe4'; g.font = '600 30px "Barlow Condensed", sans-serif'; g.fillText(nm(p), 236, 70);
  g.fillStyle = '#bfc3c6'; g.font = '16px "Barlow Condensed", sans-serif'; g.fillText(worldLabel(p), 236, 94);
  g.fillStyle = '#ffb762'; g.font = '15px "Courier Prime", monospace'; wrapText(g, caption, W - 260).slice(0, 7).forEach((l, i) => g.fillText(l, 236, 128 + i * 19));
  const names = [meName()].concat(S.crew.map(x => firstName(x))).filter(Boolean), sig = '— ' + (names.length > 4 ? names.slice(0, 4).join(', ') + ' and co.' : names.join(', '));
  g.fillStyle = '#bfc3c6'; g.font = '14px "Barlow Condensed", sans-serif'; g.fillText(capFirst(sig.replace('— the captain', '— The captain')), 236, H - 30);
  g.fillStyle = '#77d6c1'; g.font = '12px "Barlow Condensed", sans-serif'; g.fillText('SOLARIST · ' + S.ship.name.toUpperCase() + ' · ' + new Date(at || Date.now()).toLocaleDateString(), 24, 36);
  return c;
}
function cardCaption(p) {
  const people = S.crew.length ? S.crew : [S.me], c = people[Math.floor(Math.random() * people.length)];
  return txLine('postcard', Object.assign(worldCtx(p), { crew: personCtx(c) })) || 'Wish you were here.';
}
const cardFile = p => 'solarist-' + nm(p).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
function saveCard(c, p) { const a = el('a', { href: c.toDataURL('image/png'), download: cardFile(p) }); document.body.append(a); a.click(); a.remove(); }
async function openCard(p) { // a new postcard of world p
  const caption = cardCaption(p), c = await cardCanvas(p, caption);
  const keep = el('button', { type: 'button', class: 'btn sl-go', onclick: () => { S.cards.push({ num: p.num, caption, at: Date.now() }); S.cnt.cards = (S.cnt.cards || 0) + 1; save(); keep.disabled = true; keep.textContent = 'Kept in the album'; } }, 'Keep in the album');
  cardBox.replaceChildren(el('div', { class: 'sx-report-in sx-card-in' }, el('h2', {}, '📮 A postcard from ' + nm(p)), el('img', { class: 'sx-cardimg', src: c.toDataURL('image/png'), alt: 'Postcard: ' + nm(p) + '. ' + caption }),
    el('div', { class: 'sx-row-l' }, keep, el('button', { type: 'button', class: 'btn', onclick: () => openCard(p) }, 'Another caption'), el('button', { type: 'button', class: 'btn', onclick: () => saveCard(c, p) }, 'Save image'), el('button', { type: 'button', class: 'btn', onclick: () => { cardBox.hidden = true; } }, 'Close'))));
  cardBox.hidden = false;
}
async function openAlbum() { // every kept postcard
  const list = S.cards.slice().reverse().filter(k => byNum(k.num));
  const grid = el('div', { class: 'sx-album' }, list.length ? null : el('p', { class: 'sl-muted' }, 'No postcards yet. Open a world in the Logbook and press 📮 Postcard.'));
  cardBox.replaceChildren(el('div', { class: 'sx-report-in sx-card-in' }, el('h2', {}, '📮 Postcards (' + list.length + ')'), grid, el('div', { class: 'sx-row-l' }, el('button', { type: 'button', class: 'btn', onclick: () => { cardBox.hidden = true; } }, 'Close'))));
  cardBox.hidden = false;
  for (const k of list) {
    const p = byNum(k.num).p, c = await cardCanvas(p, k.caption, k.at);
    grid.append(el('div', { class: 'sx-album-i' }, el('img', { class: 'sx-cardimg', src: c.toDataURL('image/png'), alt: 'Postcard: ' + nm(p) + '. ' + k.caption }),
      el('div', { class: 'sx-row-l' }, el('button', { type: 'button', class: 'sl-link', onclick: () => saveCard(c, p) }, 'Save image'), el('button', { type: 'button', class: 'sl-link', onclick: () => { cardBox.hidden = true; tab('log'); openWorld(p.num); } }, 'Open ' + nm(p)),
        armBtn('Remove', 'Sure?', () => { S.cards.splice(S.cards.indexOf(k), 1); save(); openAlbum(); }, 'sx-mini'))));
  }
}
