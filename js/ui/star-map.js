/* Solarist: The star map. */
'use strict';

// ---------- star map: every world you've charted, placed by its distance from Earth, with your route ----------
const mapView = { zoom: 1, x: 0, y: 0 }; let mapCv = null, mapPts = [], mapHover = null;
const RCOL = { Common: '#819796', Uncommon: '#a8ca58', Rare: '#a4dddb', Legendary: '#d0da91' };
function mapPos(p) { // the same spot every time: direction from the seed, distance on a log scale
  const a = ((p.seed * 2654435761) >>> 0) / 4294967296 * Math.PI * 2, r = Math.log10(Math.max(6, p.dist)) / 4.45;
  return [Math.cos(a) * r, Math.sin(a) * r * .78];
}
function drawMap() {
  if (!mapCv) {
    mapCv = el('canvas', { class: 'sx-map', role: 'img', 'aria-label': 'Star map of your charted worlds' });
    const tip = el('div', { class: 'sx-maptip', hidden: true });
    const zoomB = (label, f) => el('button', { type: 'button', class: 'btn', onclick: () => { if (f) mapView.zoom = Math.min(12, Math.max(.6, mapView.zoom * f)); else { mapView.zoom = 1; mapView.x = mapView.y = 0; } renderMap(); } }, label);
    const legend = el('div', { class: 'sx-maplegend' }, ...['Common', 'Uncommon', 'Rare', 'Legendary'].map(r => el('span', {}, el('i', { style: 'background:' + RCOL[r] }), r)),
      el('span', {}, el('i', { class: 'sq' }), 'Post'), el('span', {}, el('i', { style: 'background:#cf573c' }), 'Outlaws'), el('span', {}, el('i', { class: 'ring' }), 'You are here'));
    mapPane.replaceChildren(el('div', { class: 'sx-maptools' }, zoomB('+', 1.5), zoomB('−', 1 / 1.5), zoomB('Reset'), el('span', { class: 'sl-muted' }, 'Drag to move, scroll to zoom, point at a world to see it.')), el('div', { class: 'sx-mapwrap' }, mapCv, tip), legend, el('p', { class: 'sl-muted sx-mapnote' }));
    let drag = null;
    mapCv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, vx: mapView.x, vy: mapView.y, moved: false }; mapCv.setPointerCapture(e.pointerId); });
    mapCv.addEventListener('pointermove', e => {
      if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true; if (drag.moved) { mapView.x = drag.vx + dx; mapView.y = drag.vy + dy; renderMap(); } return; }
      const r = mapCv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      const hit = mapPts.find(q => Math.hypot(q.x - mx, q.y - my) < 9);
      const hp = hit ? hit.p : null;
      if (hp !== mapHover) { mapHover = hp; if (hp) { const x = hp.x || (hp.x = makeExtra(hp)), first = (hp.log.match(/^[^.!?]*[.!?]/) || [hp.log])[0];
        tip.replaceChildren(el('img', { src: paint(hp, 64), alt: '' }), el('div', {}, el('b', {}, nm(hp)), el('span', {}, hp.type + ' world, ', el('i', { class: 'sx-r-' + hp.rarity.toLowerCase() }, hp.rarity)),
          el('small', {}, x.hab + '% habitable, ' + hp.dist.toLocaleString() + ' light-years from Earth' + (hp.post ? (hp.post.tp ? '. Travelers\' Post' : '. Listening Post') : '') + (held(hp) ? '. Held by outlaws' : '') + (S.at === hp.num ? '. You are here' : '')), el('p', {}, first))); } }
      tip.hidden = !hit; if (hit) { tip.style.left = Math.max(8, Math.min(r.width - 340, mx + 16)) + 'px'; tip.style.top = Math.max(8, Math.min(r.height - 150, my + 12)) + 'px'; }
    });
    mapCv.addEventListener('pointerup', () => { const click = drag && !drag.moved; drag = null; if (click && mapHover) { tab('log'); openWorld(mapHover.num); } }); // click a world: open its page (and its jump button)
    mapCv.addEventListener('pointerleave', () => { tip.hidden = true; mapHover = null; });
    mapCv.addEventListener('wheel', e => { e.preventDefault(); mapView.zoom = Math.min(12, Math.max(.6, mapView.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); renderMap(); }, { passive: false });
    addEventListener('resize', () => { if (!mapPane.hidden) renderMap(); });
  }
  renderMap();
  mapPane.querySelector('.sx-mapnote').textContent = S.found.length + ' worlds charted. Distance from Earth (the center) is on a log scale: each ring is ten times farther than the one inside it.';
}
function renderMap() {
  const wrap = mapCv.parentNode, W = wrap.clientWidth, H = Math.max(320, Math.min(innerHeight - 260, W * .7)), dpr = Math.min(2, devicePixelRatio || 1);
  mapCv.width = W * dpr; mapCv.height = H * dpr; mapCv.style.width = W + 'px'; mapCv.style.height = H + 'px';
  const g = mapCv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const sc = Math.min(W, H / .8) * .46 * mapView.zoom, cx = W / 2 + mapView.x, cy = H / 2 + mapView.y;
  const P = p => { const [x, y] = mapPos(p); return [cx + x * sc, cy + y * sc]; };
  g.strokeStyle = '#241527'; g.lineWidth = 1; g.fillStyle = '#402751'; g.font = '12px "Barlow C", sans-serif';
  [1, 2, 3, 4].forEach(k => { const r = k / 4.45 * sc; g.beginPath(); g.ellipse(cx, cy, r, r * .78, 0, 0, Math.PI * 2); g.stroke(); g.fillText(Math.pow(10, k).toLocaleString() + ' ly', cx + r + 4, cy - 2); });
  g.fillStyle = '#ebede9'; g.fillRect(cx - 2, cy - 2, 4, 4); g.fillStyle = '#7a367b'; g.fillText('Earth', cx + 6, cy + 14);
  const list = S.found.map(f => f.p);
  g.strokeStyle = '#402751'; g.beginPath(); list.forEach((p, i) => { const [x, y] = P(p); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke();
  mapPts = [];
  list.forEach(p => {
    const [x, y] = P(p); mapPts.push({ x, y, p });
    const big = p.rarity === 'Legendary' ? 4 : p.rarity === 'Rare' ? 3 : 2.5;
    g.fillStyle = held(p) ? '#cf573c' : RCOL[p.rarity] || '#819796';
    if (p.post) { g.fillStyle = '#e8c170'; g.fillRect(x - big - 1, y - big - 1, (big + 1) * 2, (big + 1) * 2); if (p.post.tp) { g.strokeStyle = '#e8c170'; g.strokeRect(x - big - 4, y - big - 4, (big + 4) * 2, (big + 4) * 2); } }
    else { g.beginPath(); g.arc(x, y, big, 0, Math.PI * 2); g.fill(); }
    if (S.at === p.num) { g.strokeStyle = '#a8ca58'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, big + 7, 0, Math.PI * 2); g.stroke(); g.lineWidth = 1; }
    if (mapView.zoom >= 2.5 || p.post || p.rarity === 'Legendary' || S.at === p.num) { g.fillStyle = '#819796'; g.fillText(nm(p), x + 8, y - 6); }
  });
}
