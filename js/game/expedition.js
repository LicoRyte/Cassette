/* Solarist: Planet expeditions (3 legs per world, each charts a Point of Interest) and derelict salvage.
   The text comes from expeditions.json; each leg is built from the world itself: landing from its type,
   crossing from its biomes and weather, finale from its oddity (or its rarity). */
'use strict';

const EXD = SOLARIST_MOUNT.expd && SOLARIST_MOUNT.expd.landing ? SOLARIST_MOUNT.expd : null;
const EX_PLAIN = ['The crew sets out to explore.', ['Play it safe', 'A careful, steady part.'], ['Take a risk', 'A bolder route, and a better view.']];
const EX_LEN = 3, EX_PARTS = ['Landing', 'Crossing', 'Finale'];
const EXP = E.expedition;
const gasWorld = p => !!(TYPES[p.type] || {}).noGround;
const exOf = p => (p && p.ex) || { step: 0, pick: 0, poi: [] };
const exDone = p => !!(p && p.ex && p.ex.step >= EX_LEN);
const canExpedition = p => !!p && !exDone(p) && !p.story;
const expediting = () => S.mission === -4 && canExpedition(atP());
const capFirst = s => s.charAt(0).toUpperCase() + s.slice(1);

// one leg of a world's expedition: [scene, [safe choice, result], [risky choice, result]], the same every time for that world and leg
function exLeg(p, step) {
  const r = rng((p.seed ^ Math.imul(step + 1, 0x9E3779B1)) >>> 0), pk = a => a[Math.floor(r() * a.length)], gas = gasWorld(p);
  let pool = null;
  if (EXD) {
    if (step === 0) pool = EXD.landing[p.type] || EXD.landing.any;
    else if (step === 1) pool = EXD.crossing[gas ? 'gas' : 'ground'];
    else pool = p.odd ? EXD.finale.odd : gas ? EXD.finale.gas : EXD.finale[p.rarity];
  }
  const leg = pool && pool.length ? pk(pool) : EX_PLAIN, biome = pk(p.biomes).toLowerCase();
  const fill = s => capFirst(String(s).split('{biome}').join(biome).split('{weather}').join(p.weather).split('{odd}').join(p.odd || 'something strange').split('{p}').join(nm(p)));
  return [fill(leg[0]), [leg[1][0], fill(leg[1][1])], [leg[2][0], fill(leg[2][1])]];
}
// a Point of Interest name that isn't used anywhere else in the Logbook, like "Whispering Basin of Kesra"
function poiName(p, step) {
  const D = EXD && EXD.poi; if (!D) return EX_PARTS[step] + ' Site ' + (S.cnt.poi || 0);
  const pk = a => a[Math.floor(Math.random() * a.length)], forms = D.forms[gasWorld(p) ? 'gas' : EX_PARTS[step].toLowerCase()] || D.forms.landing;
  const used = new Set(); S.found.forEach(f => exOf(f.p).poi.forEach(x => used.add(x.name)));
  let n = '';
  for (let k = 0; k < 60; k++) {
    const name = capFirst(pk(D.nameStart) + pk(D.nameEnd)), form = pk(forms), d = Math.random() < .6 ? pk(D.descriptors) + ' ' : '', st = Math.random();
    n = st < .6 ? d + form + ' of ' + name : name + ' ' + form;
    if (!used.has(n)) return n;
  }
  return n + ' ' + roman((S.cnt.poi || 0) % 9 + 2);
}
// what a leg pays and might find, shown on the path buttons
const exPathTip = (step, bold) => step === EX_LEN - 1 ? (bold ? 'A guaranteed find, better odds of a rare one' : 'A guaranteed find')
  : bold ? 'The bold way: better odds of a find' : 'The careful way: maybe a find';
// a finished expedition session: maybe a collectible, and a new Point of Interest
function exLegDone(reps) {
  const p = atP(), x = p.ex = p.ex || { step: 0, pick: 0, poi: [] }, step = x.step, leg = exLeg(p, step), bold = x.pick === 1, opt = leg[bold ? 2 : 1], fin = step === EX_LEN - 1, gas = gasWorld(p);
  S.cnt.expSteps = (S.cnt.expSteps || 0) + 1; S.cnt.poi = (S.cnt.poi || 0) + 1;
  const better = bold || (hasT('scan3') && Math.random() < 1 / 3), got = [];
  if (fin || Math.random() < (bold ? EXP.findBold : EXP.findSafe) + (hasT('scan1') ? .15 : 0)) got.push(rollItem(p, better, 'survey'));
  if (hasT('scan4') && Math.random() < .2) got.push(rollItem(p, better, 'survey'));
  const fresh = got.map(it => gainItem(it, p)), nNew = fresh.filter(Boolean).length;
  award(25 + 10 * nNew + (fin ? 40 : 0), 12 + 12 * nNew + (hasT('scan2') ? 10 : 0) + (hasT('scan4') ? 15 : 0) + (fin ? 20 : 0));
  const poi = { name: poiName(p, step), note: opt[1], leg: step, at: Date.now() }; placeDesc(p, poi);
  x.poi.push(poi); x.bold = (x.bold || 0) + (bold ? 1 : 0); x.step++; x.pick = 0;
  if (fin) { S.expDone = (S.expDone || 0) + 1; if (x.bold === EX_LEN) S.cnt.allBold = (S.cnt.allBold || 0) + 1; else if (!x.bold) S.cnt.allSafe = (S.cnt.allSafe || 0) + 1; S.mission = 0; }
  const ic = gas ? '🎈' : '🗺', head = (gas ? 'Cloud dive' : 'Expedition') + ' on ' + nm(p) + ' · ' + EX_PARTS[step] + ' (' + x.step + ' of ' + EX_LEN + ')';
  const gotTxt = '📍 ' + poi.name + (got.length ? ' · 🎒 ' + got.map((it, i) => it.name + ' (' + it.rar + (fresh[i] ? ', new!' : '') + ')').join(', ') : '');
  reps.unshift({ ev: { battle: true, ic, title: head, t: leg[0] + ' ' + opt[1], got: gotTxt } });
  pushEv({ c: 'quest', ic, title: head, t: leg[0] + ' (' + opt[0] + ') ' + opt[1], got: gotTxt, at: Date.now() });
  return fin ? ic + ' ' + nm(p) + ' is fully explored! You charted ' + x.poi.length + ' Points of Interest.' : '📍 Charted ' + poi.name + '. ' + (EX_LEN - x.step) + ' part' + (EX_LEN - x.step === 1 ? '' : 's') + ' to go.';
}

// ---------- Derelict ship: a rare arrival encounter. One session of salvage, one find. ----------
const derelictHere = () => { const p = atP(); return p && p.derelict && !p.derelict.done ? p : null; };
const salvaging = () => S.mission === -7 && !!derelictHere();
function makeDerelict(p) {
  const D = EXD && EXD.derelict, ships = D && D.ships && D.ships.length ? D.ships : ['an old freighter'];
  p.derelict = { ship: ships[Math.floor(Math.random() * ships.length)], leg: D && D.legs ? Math.floor(Math.random() * D.legs.length) : 0, pick: 0, done: false };
  S.cnt.derelicts = (S.cnt.derelicts || 0) + 1;
}
function derelictLeg(p) {
  const d = p.derelict, leg = (EXD && EXD.derelict && EXD.derelict.legs[d.leg]) || ['{ship} drifts nearby, dark and silent.', ['Dock carefully', 'A slow, safe docking.'], ['Cut your way in', 'Quick and loud.']];
  const fill = s => capFirst(s.split('{ship}').join(d.ship));
  return [fill(leg[0]), [leg[1][0], fill(leg[1][1])], [leg[2][0], fill(leg[2][1])]];
}
function salvageDone(reps) {
  const p = derelictHere(), d = p.derelict, leg = derelictLeg(p), bold = d.pick === 1, opt = leg[bold ? 2 : 1];
  const it = bold ? rareFind(p, 'loot') : rollItem(p, false, 'loot'), nw = gainItem(it, p);
  d.done = true; S.mission = 0; S.cnt.salvage = (S.cnt.salvage || 0) + 1; award(30 + (nw ? 10 : 0), 10 + (nw ? 12 : 0));
  const got = '🎒 ' + it.name + ' (' + it.rar + (nw ? ', new!' : '') + ')', title = 'Salvage: ' + capFirst(d.ship.replace(/^the /, ''));
  reps.unshift({ ev: { battle: true, ic: '🛸', title, t: leg[0] + ' ' + opt[1], got } });
  pushEv({ c: 'quest', ic: '🛸', title, t: leg[0] + ' (' + opt[0] + ') ' + opt[1], got, at: Date.now() });
  return '🛸 Salvage done: ' + it.name + '.';
}

// ---------- once: the switch from daily expeditions and Discover to planet expeditions ----------
if (!S.rw1) {
  if (S.exp) {
    const legs = S.exp.step || 0;
    pushEv({ c: 'quest', ic: '🗺', title: 'Expeditions belong to worlds now', t: 'Every world has its own expedition, three study sessions long, and each part charts a Point of Interest. Discover is gone: its finds, Knowledge and pay come from expeditions now. Your daily expedition was closed' + (legs ? ' and its ' + legs + ' finished part' + (legs === 1 ? ' was' : 's were') + ' logged.' : '.'), at: Date.now() });
    S.exp = null;
  }
  if (S.mission === -2 || S.mission === -4) S.mission = 0;
  delete S.expDay;
  S.rw1 = 1;
}
