/* Solarist: the globe. The planet on the main screen is the map of the world you're at: drag it to turn it, scroll
   to zoom (js/shell.js draws it and knows where things are). Its places are waypoints on the surface; places not
   found yet are faint "?" marks; a derelict, a trader, a mystery and the Meridian are pinned where they are.
   Clicking a waypoint picks the next session there: "Camp at Ford of Serand". Hidden while you study. */
'use strict';

const globeLayer = el('div', { class: 'sx-globe', role: 'group', 'aria-label': 'Waypoints on this world' });
root.append(globeLayer);
let globePins = []; // [{ b: button, x, y }]

// where a waypoint sits on the surface map (x goes round, 0 to 2; y from top to bottom): the same every time
function globeSpot(p, slot) {
  const h = rng(((p.seed >>> 0) ^ Math.imul(slot + 1, 2654435761)) >>> 0);
  return { x: ((slot * .618034 + h() * .2) % 1) * 2, y: .28 + h() * .44 };
}
// the plain activity you'd do at a place (not the expedition or the derelict)
let globeLastAct = ''; // the last plain activity you picked, so picking a place after the expedition goes back to it
function globeAct(p) {
  const L = actsFor(p).filter(a => a.id !== 'expedition' && a.id !== 'salvage'), cur = stayAct();
  if (cur && L.includes(cur)) { globeLastAct = cur.id; return cur; }
  return L.find(a => a.id === globeLastAct) || L[0] || null;
}
// the place you picked to stay at, if it's on this world
function stayPlace() {
  const p = atP(), s = S.stayAt; if (!p || !s || s.num !== p.num) return null;
  const a = stayAct(); if (!a || a.id === 'expedition' || a.id === 'salvage') return null;
  return exOf(p).poi.find(o => o.name === s.name) || null;
}
function pickPlace(p, o) {
  const a = globeAct(p); if (!a) return;
  S.stayAt = { num: p.num, name: o.name }; setMission('stay', a.id);
}
function pickUnknown(p) {
  if (canExpedition(p)) { S.stayAt = null; setMission('stay', 'expedition'); return; }
  const L = actsFor(p).filter(a => a.find), a = L.find(x => x.id === 'wander') || L[0] || globeAct(p);
  if (a) { S.stayAt = null; setMission('stay', a.id); }
}
// every waypoint on world p: { slot, kind, mark, label (what clicking does), on (picked), go }
function globeWaypoints(p) {
  const out = [], cm = curMission(), x = exOf(p), act = globeAct(p), here = stayPlace();
  const max = Math.max(placesMax(p), x.poi.length);
  for (let i = 0; i < max; i++) {
    const o = x.poi[i];
    if (o) out.push({ slot: i, kind: 'place', mark: '', name: placeName(o), label: act ? act.name + ' at ' + placeName(o) : placeName(o), on: here === o, go: () => pickPlace(p, o) });
    else out.push({ slot: i, kind: 'unknown', mark: '?', name: 'Not found yet', label: canExpedition(p) ? (gasWorld(p) ? 'Cloud dive' : 'Explore on foot') + ': somewhere not found yet' : 'Look for somewhere new',
      on: cm === 'stay' && expediting() && i === x.poi.length, go: () => pickUnknown(p) });
  }
  if (p.derelict && !p.derelict.done && S.at === p.num) out.push({ slot: 20, kind: 'derelict', mark: '', name: p.derelict.ship, label: 'Search the derelict: ' + p.derelict.ship, on: cm === 'stay' && salvaging(), go: () => { S.stayAt = null; setMission('stay', 'salvage'); } });
  if (p.trade) out.push({ slot: 21, kind: 'trader', mark: '', name: capFirst(p.trade.name), label: capFirst(p.trade.name) + ': a swap is waiting', on: false,
    go: () => { const b = bpNotes.querySelector('.sx-buy'); if (b) { b.scrollIntoView({ block: 'nearest' }); b.focus(); } } });
  if (chHere() && !atDoor()) out.push({ slot: 22, kind: 'meridian', mark: '', name: 'The Meridian', label: 'Meridian: chapter ' + (p.story.ch + 1) + ', part ' + (p.story.step + 1), on: cm === 'campaign', go: () => setMission('campaign') });
  const mo = mysPicked();
  S.mys.filter(o => o.num === p.num).forEach((o, k) => { const m = mysDef(o.id); if (m) out.push({ slot: 23 + k, kind: 'mystery', mark: '', name: m.title, label: 'Observe: ' + m.title, on: cm === 'mystery' && mo === o, go: () => setMission('mystery', o.id) }); });
  return out;
}
// rebuild the waypoints (from draw())
let globeKey = '';
function drawGlobe() {
  const p = atP(), show = !!p && !(running && mode === 'focus') && !pv;
  globeLayer.hidden = !show; if (window.SolaristGlobe) window.SolaristGlobe.onDraw = globePlace;
  if (!show) { globePins = []; globeLayer.replaceChildren(); globeKey = ''; return; }
  const wps = globeWaypoints(p), key = p.num + '|' + wps.map(w => w.slot + w.kind + w.label + w.on).join(',');
  if (key === globeKey) return; globeKey = key;
  globePins = wps.map(w => {
    const at = globeSpot(p, w.slot);
    const b = el('button', { type: 'button', class: 'sx-wp sx-wp-' + w.kind + (w.on ? ' on' : ''), 'aria-pressed': String(w.on), 'aria-label': w.label, onclick: () => { w.go(); } },
      el('span', { class: 'sx-wp-m' }, w.mark), el('span', { class: 'sx-wp-l' }, w.label));
    return { b, x: at.x, y: at.y };
  });
  globeLayer.replaceChildren(...globePins.map(g => g.b));
  globePlace();
}
// move the waypoints to where they are on the turning planet (called after every frame the planet is drawn)
function globePlace() {
  const G = window.SolaristGlobe; if (!G || globeLayer.hidden) return;
  const side = !breakPanel.hidden && breakPanel.offsetParent ? breakPanel.getBoundingClientRect() : null;
  globePins.forEach(g => {
    const q = G.project(g.x, g.y);
    const off = !q || q.z < .18 || (side && q.x > side.left - 8 && q.y > side.top && q.y < side.bottom);
    if (off) { if (!g.b.classList.contains('off')) g.b.classList.add('off'); return; }
    g.b.classList.remove('off');
    g.b.style.transform = 'translate(' + Math.round(q.x) + 'px,' + Math.round(q.y) + 'px)';
    g.b.classList.toggle('flip', q.x > (side && side.left > q.x ? side.left : innerWidth) - 240); // the label opens to the left near the right edge
    g.b.style.opacity = q.z < .35 ? String((q.z - .18) / .17) : '';
  });
}
if (window.SolaristGlobe) window.SolaristGlobe.onDraw = globePlace;
