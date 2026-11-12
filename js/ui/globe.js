/* Solarist: the globe. The planet on the main screen is the map of the world you're at: drag it to turn it, scroll
   to zoom (js/shell.js draws it and knows where things are). Its places are waypoints on the surface; places not
   found yet are faint "?" marks; a derelict, a trader, a mystery and the Meridian are pinned where they are; and two
   markers wait in orbit: Travel on, and mysteries from other worlds. Clicking one opens its title card, which says
   what it is and picks the next session there ("Camp at Ford of Serand"). Hidden while you study. */
'use strict';

const globeLayer = el('div', { class: 'sx-globe', role: 'group', 'aria-label': 'Waypoints on this world' });
const wpCard = el('div', { class: 'sx-wpcard', role: 'dialog', 'aria-label': 'Waypoint', hidden: true });
root.append(globeLayer, wpCard);
let globePins = []; // [{ b: button, w: waypoint, x, y (on the surface) or orbit (an angle beside the planet) }]
let wpSel = null; // the id of the waypoint whose card is open

// where a waypoint sits on the surface map (x goes round, 0 to 2; y from top to bottom): the same every time
function globeSpot(p, slot) {
  const h = rng(((p.seed >>> 0) ^ Math.imul(slot + 1, 2654435761)) >>> 0);
  return { x: ((slot * .618034 + h() * .2) % 1) * 2, y: .28 + h() * .44 };
}
// the plain activity you'd do at a place (not the expedition or the derelict)
let globeLastAct = ''; // the last plain activity you picked, so picking a place after the expedition goes back to it
const plainActs = p => actsFor(p).filter(a => a.id !== 'expedition' && a.id !== 'salvage');
function globeAct(p) {
  const L = plainActs(p), cur = stayAct();
  if (cur && L.includes(cur)) { globeLastAct = cur.id; return cur; }
  return L.find(a => a.id === globeLastAct) || L[0] || null;
}
// the place you picked to stay at, if it's on this world
function stayPlace() {
  const p = atP(), s = S.stayAt; if (!p || !s || s.num !== p.num) return null;
  const a = stayAct(); if (!a || a.id === 'expedition' || a.id === 'salvage') return null;
  return exOf(p).poi.find(o => o.name === s.name) || null;
}
function pickPlace(p, o, actId) {
  const a = plainActs(p).find(x => x.id === actId) || globeAct(p); if (!a) return;
  globeLastAct = a.id; S.stayAt = { num: p.num, name: o.name }; setMission('stay', a.id);
}
function pickUnknown(p) {
  if (canExpedition(p)) { S.stayAt = null; setMission('stay', 'expedition'); return; }
  const L = actsFor(p).filter(a => a.find), a = L.find(x => x.id === 'wander') || L[0] || globeAct(p);
  if (a) { S.stayAt = null; setMission('stay', a.id); }
}

/* ---------- the title cards ---------- */
const wpLock = () => running && mode === 'focus';
const wpText = (t, cls) => el('p', { class: cls || '' }, t);
// the button that picks it: once it's picked, it says so
const wpGo = (label, on, go) => el('button', { type: 'button', class: 'btn sx-wp-go' + (on ? ' on' : ''), disabled: wpLock() || null, onclick: () => { if (!on) go(); } }, on ? 'Picked for your next session' : label);
const wpSelect = (label, opts, value, change) => { const s = el('select', { class: 'sx-wp-sel', 'aria-label': label }, opts.map(([v, t, off]) => el('option', { value: v, disabled: off || null }, t))); if (value != null) s.value = value; s.addEventListener('change', () => change(s.value)); return s; };
function placeCard(p, o, on) {
  const acts = plainActs(p); let actId = (globeAct(p) || {}).id;
  const go = wpGo(acts.length ? (acts.find(a => a.id === actId) || acts[0]).name + ' here' : 'Stay here', on, () => pickPlace(p, o, actId));
  const sel = acts.length > 1 ? wpSelect('What to do there', acts.map(a => [a.id, a.name]), actId, v => { actId = v; globeLastAct = v; if (on) pickPlace(p, o, v); else go.textContent = acts.find(a => a.id === v).name + ' here'; }) : null;
  return ['Place on ' + nm(p), placeName(o), wpText(placeDesc(p, o)), sel, go];
}
function unknownCard(p, on) {
  const left = placesUnfound(p), body = [wpText(left + ' place' + (left === 1 ? ' is' : 's are') + ' still waiting to be found on ' + nm(p) + '.', 'sl-muted')];
  if (canExpedition(p)) { const x = exOf(p), leg = exLeg(p, x.step);
    body.push(bpLegBar(x.step, x.step, EX_LEN, k => EX_PARTS[k]), wpText(leg[0]), pathPick(x.pick, wpLock(), leg, bold => exPathTip(x.step, bold), v => { (p.ex = p.ex || { step: 0, pick: 0, poi: [] }).pick = v; save(); wpRefresh(); }));
    return ['Not found yet', gasWorld(p) ? 'A cloud dive' : 'An expedition', ...body, wpGo(gasWorld(p) ? 'Dive into the clouds' : 'Explore on foot', on, () => pickUnknown(p))]; }
  const L = actsFor(p).filter(a => a.find), a = L.find(x => x.id === 'wander') || L[0];
  return ['Not found yet', 'Somewhere new', ...body, wpGo(a ? a.name + ' and look around' : 'Look around', on, () => pickUnknown(p))];
}
function derelictCard(p, on) {
  const leg = derelictLeg(p);
  return ['Derelict', p.derelict.ship, wpText(leg[0]), pathPick(p.derelict.pick, wpLock(), leg, bold => bold ? 'A riskier search, a rarer find' : 'A careful search, a sure find', v => { p.derelict.pick = v; save(); wpRefresh(); }),
    wpGo('Search the derelict', on, () => { S.stayAt = null; setMission('stay', 'salvage'); })];
}
function traderCard(p) {
  const o = p.trade, w = itemById(o.want), g = itemById(o.give);
  return ['A swap is waiting', capFirst(o.name), wpText(o.t), wpText('You give: ' + (w ? w.name : '?') + '. You get: ' + (g ? g.name : '?') + '.', 'sl-muted'),
    el('div', { class: 'sx-wp-two' }, el('button', { type: 'button', class: 'btn sx-wp-go', disabled: wpLock() || null, onclick: () => answerTrade(p, true) }, 'Swap'), el('button', { type: 'button', class: 'btn', disabled: wpLock() || null, onclick: () => answerTrade(p, false) }, 'No thanks'))];
}
function mysteryCard(o, on) {
  const m = mysDef(o.id);
  return ['Mystery · ' + o.step + ' of ' + m.steps.length + ' observed', m.title, wpText(o.log.length ? o.log[o.log.length - 1] : 'Found on ' + o.origin + '. Nobody knows what it is yet.'), wpGo('Observe it', on, () => setMission('mystery', o.id))];
}
function meridianCard(p, on) {
  return ['The Meridian', 'Chapter ' + (p.story.ch + 1) + ', part ' + (p.story.step + 1), ...chapterBits(p, wpLock(), bpLegBar), wpGo('Follow the Meridian', on, () => setMission('campaign'))];
}
function travelCard(on) {
  const back = returnPlaces().sort((a, b) => (S.home === b.num) - (S.home === a.num)), regs = regions().filter(regionOpen);
  let where = S.exploreKind === 'signal' && signalOn() ? 'signal' : returning() ? 'ret:' + S.returnTo : 'random';
  const whereOpts = [['random', 'A new world']].concat(signalOn() ? [['signal', 'Follow the Meridian signal']] : [], back.map(x => ['ret:' + x.num, (S.home === x.num ? 'Home to ' : 'Back to ') + nm(x)]));
  const reg = regionNow(); let region = reg ? reg.id : '';
  const regSel = regs.length > 1 ? wpSelect('Which region', regions().map(x => [x.id, x.name + (regionOpen(x) ? '' : ' (opens at ' + x.hours + ' hours)'), !regionOpen(x)]), region, v => { region = v; if (on) { S.region = v; save(); draw(); } }) : null;
  const go = () => { if (region) S.region = region; setMission('explore', where); };
  const whereSel = whereOpts.length > 1 ? wpSelect('Where to', whereOpts, where, v => { where = v; if (regSel) regSel.hidden = v !== 'random'; if (on) go(); }) : null;
  if (regSel) regSel.hidden = where !== 'random';
  return ['Leave orbit', 'Travel on', wpText(misGives('explore') || 'A new world. Now and then something is waiting there.'), whereSel, regSel, wpGo('Travel on', on, go)];
}
function elsewhereCard(list, on) {
  const mo = mysPicked(); let id = mo && list.includes(mo) ? mo.id : list[0].id;
  const sel = list.length > 1 ? wpSelect('Which mystery', list.map(o => [o.id, mysDef(o.id).title + ' (' + o.origin + ')']), id, v => { id = v; if (on) setMission('mystery', v); }) : null;
  return ['Observe', list.length === 1 ? mysDef(list[0].id).title : 'Mysteries from other worlds', wpText(list.length === 1 ? 'Found on ' + list[0].origin + '. You can keep watching it from here.' : list.length + ' mysteries found on other worlds. You can keep watching them from here.', 'sl-muted'), sel, wpGo('Observe it', on, () => setMission('mystery', id))];
}

/* ---------- the waypoints ---------- */
// every waypoint: { id, slot (on the surface) or orbit (an angle beside the planet), kind, mark, label, on (picked), card }
function globeWaypoints(p) {
  const out = [], cm = curMission(), mo = mysPicked();
  if (p) {
    const x = exOf(p), act = globeAct(p), here = stayPlace(), max = Math.max(placesMax(p), x.poi.length);
    for (let i = 0; i < max; i++) {
      const o = x.poi[i];
      if (o) { const on = here === o; out.push({ id: 'place' + i, slot: i, kind: 'place', mark: '', label: act ? act.name + ' at ' + placeName(o) : placeName(o), on, card: () => placeCard(p, o, on) }); }
      else { const on = cm === 'stay' && expediting() && i === x.poi.length;
        out.push({ id: 'unknown' + i, slot: i, kind: 'unknown', mark: '?', label: 'Not found yet', on, card: () => unknownCard(p, cm === 'stay' && expediting()) }); }
    }
    if (p.derelict && !p.derelict.done && S.at === p.num) { const on = cm === 'stay' && salvaging(); out.push({ id: 'derelict', slot: 20, kind: 'derelict', mark: '', label: p.derelict.ship, on, card: () => derelictCard(p, on) }); }
    if (p.trade) out.push({ id: 'trader', slot: 21, kind: 'trader', mark: '', label: capFirst(p.trade.name) + ': a swap is waiting', on: false, card: () => traderCard(p) });
    if (chHere() && !atDoor()) { const on = cm === 'campaign'; out.push({ id: 'meridian', slot: 22, kind: 'meridian', mark: '', label: 'Meridian: chapter ' + (p.story.ch + 1), on, card: () => meridianCard(p, on) }); }
    S.mys.filter(o => o.num === p.num && mysDef(o.id)).forEach((o, k) => { const on = cm === 'mystery' && mo === o; out.push({ id: 'mys' + o.id, slot: 23 + k, kind: 'mystery', mark: '', label: mysDef(o.id).title, on, card: () => mysteryCard(o, on) }); });
  }
  // in orbit, beside the planet
  { const on = cm === 'explore'; out.push({ id: 'travel', orbit: -38, kind: 'travel', mark: '▸', label: 'Travel on', on, card: () => travelCard(on) }); }
  const away = S.mys.filter(o => mysDef(o.id) && (!p || o.num !== p.num));
  if (away.length) { const on = cm === 'mystery' && away.includes(mo); out.push({ id: 'away', orbit: 32, kind: 'mystery', mark: '', label: away.length === 1 ? 'Observe: ' + mysDef(away[0].id).title : 'Mysteries from other worlds', on, card: () => elsewhereCard(away, on) }); }
  return out;
}
// rebuild the waypoints (from draw())
let globeKey = '';
function drawGlobe() {
  const p = atP(), show = !wpLock() && !pv;
  globeLayer.hidden = !show; if (window.SolaristGlobe) window.SolaristGlobe.onDraw = globePlace;
  if (!show) { globePins = []; globeLayer.replaceChildren(); globeKey = ''; wpClose(); return; }
  const wps = globeWaypoints(p), key = (p ? p.num : 0) + '|' + wps.map(w => w.id + w.label + w.on).join(',') + '|' + curMission() + (S.stayAct || '') + (S.exploreKind || '') + (S.region || '');
  if (key === globeKey) return; globeKey = key;
  globePins = wps.map(w => {
    const at = w.orbit == null ? globeSpot(p, w.slot) : null;
    const b = el('button', { type: 'button', class: 'sx-wp sx-wp-' + w.kind + (w.orbit == null ? '' : ' sx-wp-orbit') + (w.on ? ' on' : '') + (w.id === wpSel ? ' sel' : ''), 'aria-pressed': String(w.on), 'aria-expanded': String(w.id === wpSel), 'aria-label': w.label,
      onclick: e => { e.stopPropagation(); if (wpSel === w.id) wpClose(); else wpOpen(w.id); } },
      el('span', { class: 'sx-wp-m' }, w.mark), el('span', { class: 'sx-wp-l' }, w.label));
    return { b, w, x: at && at.x, y: at && at.y, orbit: w.orbit };
  });
  globeLayer.replaceChildren(...globePins.map(g => g.b));
  if (wpSel && !globePins.some(g => g.w.id === wpSel)) wpClose(); else wpFill();
  globePlace();
}
// the card: open, fill, close
function wpOpen(id) { wpSel = id; globePins.forEach(g => { g.b.classList.toggle('sel', g.w.id === id); g.b.setAttribute('aria-expanded', String(g.w.id === id)); }); if (window.SolaristGlobe) window.SolaristGlobe.hold = true; wpFill(); globePlace(); const f = wpCard.querySelector('button.sx-wp-go:not(:disabled), select'); if (f) f.focus({ preventScroll: true }); }
function wpClose() { if (!wpSel && wpCard.hidden) return; wpSel = null; wpCard.hidden = true; globePins.forEach(g => { g.b.classList.remove('sel'); g.b.setAttribute('aria-expanded', 'false'); }); if (window.SolaristGlobe) window.SolaristGlobe.hold = false; }
function wpFill() {
  const g = wpSel && globePins.find(x => x.w.id === wpSel); if (!g) { wpCard.hidden = true; return; }
  const [kicker, title, ...body] = g.w.card();
  wpCard.replaceChildren(el('button', { type: 'button', class: 'sx-wp-x', 'aria-label': 'Close', onclick: wpClose }, '×'), el('small', { class: 'sx-wp-k' }, kicker), el('h3', {}, title), ...body.filter(Boolean));
  wpCard.setAttribute('aria-label', title); wpCard.hidden = false;
}
const wpRefresh = () => { globeKey = ''; drawGlobe(); };
document.addEventListener('pointerdown', e => { if (wpSel && !e.target.closest('.sx-wpcard, .sx-wp')) wpClose(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && wpSel) { e.preventDefault(); wpClose(); } });
// move the waypoints to where they are on the turning planet (called after every frame the planet is drawn), and the card beside its waypoint
function globePlace() {
  const G = window.SolaristGlobe; if (!G || globeLayer.hidden) return;
  const sides = [corner, bpNotes, storyPanel].filter(b => !b.hidden && b.offsetParent).map(b => b.getBoundingClientRect());
  const under = q => sides.some(r => q.x > r.left - 8 && q.x < r.right + 8 && q.y > r.top - 8 && q.y < r.bottom + 8); // a waypoint never hides behind the timer or the story
  let selQ = null;
  globePins.forEach(g => {
    const q = g.orbit == null ? G.project(g.x, g.y) : G.orbit && G.orbit(g.orbit, 1.22);
    const off = !q || q.z < .18 || under(q);
    if (g.w.id === wpSel && q && !off) selQ = q;
    if (off) { if (!g.b.classList.contains('off')) g.b.classList.add('off'); return; }
    g.b.classList.remove('off');
    g.b.style.transform = 'translate(' + Math.round(q.x) + 'px,' + Math.round(q.y) + 'px)';
    g.b.classList.toggle('flip', q.x > innerWidth - 240); // the label opens to the left near the right edge
    g.b.style.opacity = q.z < .35 ? String((q.z - .18) / .17) : '';
  });
  if (selQ && !wpCard.hidden && innerWidth > 700) { // beside its waypoint, on whichever side has room
    const w = wpCard.offsetWidth, h = wpCard.offsetHeight, right = selQ.x + 28 + w < innerWidth - 16;
    wpCard.style.left = Math.round(right ? selQ.x + 28 : selQ.x - 28 - w) + 'px';
    wpCard.style.top = Math.round(Math.max(70, Math.min(innerHeight - h - 16, selQ.y - 40))) + 'px';
  }
}
if (window.SolaristGlobe) window.SolaristGlobe.onDraw = globePlace;
