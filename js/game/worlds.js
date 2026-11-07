/* Solarist: Selling worlds and Hyperdrive Node jumps. */
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
  if (hasT('eco1')) parts.push(['Guild Contacts (+15%)', Math.round(parts.reduce((a, x) => a + x[1], 0) * .15)]);
  return parts;
}
const sellPrice = p => Math.round(sellParts(p).reduce((a, x) => a + x[1], 0) * stSell());
const isRecord = p => REC.some(([k]) => S.rec[k] && S.rec[k].num === p.num);
// Hyperdrive Nodes: once one is installed on a world, the ship can jump straight back to it (not during a study session)
const nodes = () => S.found.filter(f => f.p.node);
const canJump = p => !!(p && p.node) && S.at !== p.num && !held(p) && !(running && mode === 'focus') && !S.dr;
function jumpTo(p) {
  if (!canJump(p)) return;
  const from = atP(); S.at = p.num; S.jumped = p.num; S.cnt.jumps = (S.cnt.jumps || 0) + 1;
  pushEv({ c: 'ship', ic: '⚡', title: 'Jumped to ' + nm(p), t: 'The Hyperdrive Node pulled the ship ' + (from ? 'from ' + nm(from) + ' ' : '') + 'straight to ' + nm(p) + '. Everyone\'s hair is standing up.', at: Date.now() });
  hint.textContent = '⚡ Jumped to ' + nm(p) + '. Discover can survey it, and deliveries can be dropped off here.'; save(); draw();
}
const jumpBtn = (p, cls) => p && p.node && S.at !== p.num ? el('button', { type: 'button', class: cls || 'btn', disabled: !canJump(p) || null, title: running && mode === 'focus' ? 'Jumps wait for the break' : 'Teleport the ship here', onclick: () => jumpTo(p) }, '⚡ Jump here') : null;
function sellBlock(p) { // why a world can't be sold, or null
  if (p.node) return 'it has a Hyperdrive Node';
  if (p.post) return 'it has a post';
  if (held(p)) return 'outlaws hold it';
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
