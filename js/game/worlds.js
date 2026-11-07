/* Solarist: Selling worlds and hyperdrive jumps. */
'use strict';

// Selling a world: the survey rights go to the Cartographers' Guild for stardust, and the world leaves your Logbook.
// The price follows its overall condition and how much it stands out.
const SL = E.sell, SELL_RAR = SL.rarity;
function sellParts(p) {
  const out = [[p.rarity + ' world', SELL_RAR[p.rarity]]], hab = p.x ? p.x.hab : 0;
  if (hab) out.push(['Habitability ' + hab + '%', Math.round(hab * SL.perHabitabilityPercent)]);
  if (hab >= SL.earthLikeAt) out.push(['Earth-like', SL.earthLike]);
  if (p.lifeLvl) out.push([p.life, p.lifeLvl * SL.perLifeLevel]);
  if (p.odd) out.push(['Anomaly', SL.anomaly]);
  if (p.rings) out.push(['Rings', SL.rings]);
  if (p.moons) out.push([p.moons + ' moon' + (p.moons === 1 ? '' : 's'), Math.min(SL.moonCap, p.moons * SL.perMoon)]);
  REC.forEach(([k, , label]) => { if (S.rec[k] && S.rec[k].num === p.num) out.push(['Record: ' + label, SL.perRecord]); });
  const parts = out.filter(x => x[1] > 0).map(([l, v]) => [l, Math.round(v * INCOME)]);
  const nPoi = exOf(p).poi.length; if (nPoi) parts.push(['Points of Interest (' + nPoi + ')', Math.round(parts.reduce((a, x) => a + x[1], 0) * EXP.poiSellBonus * nPoi)]);
  if (hasT('eco1')) parts.push(['Guild Contacts (+15%)', Math.round(parts.reduce((a, x) => a + x[1], 0) * .15)]);
  return parts;
}
const sellPrice = p => Math.round(sellParts(p).reduce((a, x) => a + x[1], 0) * stSell());
const isRecord = p => REC.some(([k]) => S.rec[k] && S.rec[k].num === p.num);
// Hyperdrive: a charge (made with the Charge mission) jumps the ship to any world you've visited. Not during a study session.
if (S.hyper == null) S.hyper = 0;
const canJump = p => !!p && S.hyper > 0 && S.at !== p.num && !held(p) && !(running && mode === 'focus') && !S.dr;
function jumpTo(p) {
  if (!canJump(p)) return;
  const from = atP(); S.hyper--; S.at = p.num; S.jumped = p.num; S.cnt.jumps = (S.cnt.jumps || 0) + 1; (S.cnt.jumpTypes = S.cnt.jumpTypes || {})[p.type] = 1;
  pushEv({ c: 'ship', ic: '⚡', title: 'Jumped to ' + nm(p), t: 'The hyperdrive pulled the ship ' + (from ? 'from ' + nm(from) + ' ' : '') + 'straight to ' + nm(p) + '. Everyone\'s hair is standing up. ' + S.hyper + ' charge' + (S.hyper === 1 ? '' : 's') + ' left.', at: Date.now() });
  hint.textContent = '⚡ Jumped to ' + nm(p) + '. Everything you can do here is on the left, under Here.'; save(); draw();
}
const jumpTip = p => running && mode === 'focus' ? 'Jumps wait for the break' : !S.hyper ? 'No hyperdrive charges. Charge one with the Charge mission' : held(p) ? 'Outlaws hold it' : S.dr ? 'Not during a Distress Run' : 'Spend a hyperdrive charge to jump here';
const jumpBtn = (p, cls) => p && S.at !== p.num ? el('button', { type: 'button', class: cls || 'btn', disabled: !canJump(p) || null, title: jumpTip(p), onclick: () => jumpTo(p) }, '⚡ Jump here (' + S.hyper + ')') : null;
// once: built Hyperdrive Nodes are removed; each refunds resources, and they fill up the hyperdrive
if (!S.rw2hd) {
  const had = S.found.filter(f => f.p.node);
  if (had.length) {
    had.forEach(f => { delete f.p.node; });
    S.hyper = Math.min(Math.round(E.hyperdrive.max), had.length); const back = addDust(E.hyperdrive.nodeRefund * had.length);
    pushEv({ c: 'ship', ic: '⚡', title: 'Hyperdrive Nodes became hyperdrive charges', t: 'The ship now jumps with charges instead of Nodes: one study session of Charge (pick Hyperdrive) makes one, up to ' + Math.round(E.hyperdrive.max) + ', and a charge jumps you to any world you have visited. Your ' + had.length + ' Node' + (had.length === 1 ? ' was' : 's were') + ' refunded, and the hyperdrive starts with ' + S.hyper + ' charge' + (S.hyper === 1 ? '' : 's') + '.', got: '+' + back + ' ✦', at: Date.now() });
  }
  if (S.job && S.job.k === 'node') { S.job = null; if (S.mission > 0) S.mission = 0; }
  S.rw2hd = 1;
}
function sellBlock(p) { // why a world can't be sold, or null
  if (p.story) return 'it is part of the Meridian story';
  if (p.post) return 'it has a post';
  if (held(p)) return 'outlaws hold it';
  if (S.mw && S.mw.sighted === p.num) return 'your Most Wanted was sighted here';
  if (S.at === p.num) return 'you are here';
  if (S.mission > 0 && S.job && S.job.num === p.num) return 'you\'re building here next';
  return null;
}
function sellWorlds(list) {
  let got = 0; if (list.length >= 10) S.cnt.bigSale = (S.cnt.bigSale || 0) + 1; if (list.some(p => p.rarity === 'Legendary')) S.cnt.soldLeg = (S.cnt.soldLeg || 0) + 1;
  list.forEach(p => { const v = sellPrice(p); got += v; S.dust += v; S.dustTotal += v; S.sold.n++; S.sold.ly += p.dist; S.found = S.found.filter(f => f.p !== p); });
  shownList = shownList.filter(f => !list.includes(f.p));
  S.sold.dust += got; award(5 * list.length, 0); flushXP([]);
  save(); return got;
}
