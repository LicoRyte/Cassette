/* Solarist: Coordinator Panel: chips that nudge what the next Explore trip finds. */
'use strict';

// ---------- Coordinator Panel: put chips into fields to nudge what the next Explore trip finds ----------
// World fields: each chip is a per-chip chance that the Coordinator "insists" on that trait and picks a world that has it.
// Event fields: each chip adds straight to the chance of that thing happening on arrival.
// A charged Interplanetary Coordinator doubles every chip for one trip (and still steers toward better worlds).
const MINERAL = ['Iron', 'Carbon', 'Crystal', 'Lava', 'Shattered'], WATERY = ['Ocean', 'Hycean', 'Swamp'], PLAIN_STARS = ['red dwarf', 'orange dwarf', 'yellow dwarf'];
const CHIP_F = [ // [key, icon, name, what it nudges, group, per chip, test (worlds only, 0..1)]
  ['life', '🌱', 'Lifeform Pylon', 'worlds with life on them (the more chips, the richer the life)', 'w', .035, p => p.lifeLvl ? .6 + p.lifeLvl / 15 : 0],
  ['hab', '🏡', 'Habitat Beacon', 'worlds at least 60% habitable', 'w', .035, p => (p.x || (p.x = makeExtra(p))).hab >= 60 ? 1 : 0],
  ['rare', '💎', 'Rarity Lens', 'Rare and Legendary worlds', 'w', .025, p => p.rarity === 'Legendary' ? 1 : p.rarity === 'Rare' ? .85 : 0],
  ['odd', '🌀', 'Anomaly Antenna', 'worlds with an anomaly', 'w', .035, p => p.odd ? 1 : 0],
  ['rings', '💫', 'Ring Resonator', 'worlds with rings', 'w', .035, p => p.rings ? 1 : 0],
  ['moons', '🌙', 'Moon Magnet', 'worlds with four or more moons', 'w', .035, p => p.moons >= 4 ? 1 : 0],
  ['giant', '🎈', 'Gas Harp', 'giants and other worlds with no ground', 'w', .035, p => (TYPES[p.type] || {}).noGround ? 1 : 0],
  ['ore', '⛏', 'Ore Sieve', 'Iron, Carbon, Crystal, Lava and Shattered worlds', 'w', .035, p => MINERAL.includes(p.type) ? 1 : 0],
  ['water', '🌊', 'Tide Bell', 'Ocean, Hycean and Swamp worlds', 'w', .035, p => WATERY.includes(p.type) ? 1 : 0],
  ['star', '🔆', 'Strange Light', 'giant, white dwarf, binary and pulsar suns', 'w', .035, p => !PLAIN_STARS.includes(p.star) && !p.star.startsWith('none') ? 1 : 0],
  ['far', '🔭', 'Deep Range', 'worlds more than 2,000 light-years out', 'w', .035, p => p.dist >= 2000 ? 1 : 0],
  ['siren', '🏴', 'Siren', 'outlaw gangs holding the world', 'e', .02],
  ['hush', '🕊', 'Hush Beacon', 'fewer outlaws (takes chance away)', 'e', .008],
  ['lantern', '🏮', 'Welcome Lantern', 'arrival encounters', 'e', .015],
  ['market', '🏪', 'Market Flare', 'a Trade Station docked at the world', 'e', .01],
  ['storm', '☄', 'Storm Rod', 'deep-space events during any session', 'e', .01],
];
const CHIP_MAX = 10;
if (!S.chips) S.chips = { own: Math.round(E.coordChips.start), put: {} };
const chipsPut = () => Object.values(S.chips.put).reduce((a, n) => a + n, 0);
const chipsFree = () => S.chips.own + (S.chips.temp || 0) - chipsPut();
const chipAmp = () => S.coord ? 2 : 1;
const chipP = (k, amp) => { const f = CHIP_F.find(x => x[0] === k); return f ? Math.min(f[4] === 'w' ? .95 : .6, (S.chips.put[k] || 0) * f[5] * (amp || 1)) : 0; };
const chipCost = () => Math.round(E.coordChips.base * Math.pow(E.coordChips.growth, Math.max(0, S.chips.own - E.coordChips.start)));
function chipMove(k, d) {
  if (running && mode === 'focus') return;
  const n = S.chips.put[k] || 0;
  if (d > 0 && (n >= CHIP_MAX || chipsFree() <= 0)) return;
  if (d < 0 && n <= 0) return;
  S.chips.put[k] = n + d; if (!S.chips.put[k]) delete S.chips.put[k]; save(); drawRight(); drawLeft();
}
function chipBuy() { const c = chipCost(); if (S.dust < c || S.chips.own >= E.coordChips.max) return; S.dust -= c; S.chips.own++; S.cnt.chipsBought = (S.cnt.chipsBought || 0) + 1; shopXP(20); save(); draw(); }
function nudgedPlanet(lucky, oddBoost, amp) { // roll the world, then let the chips pick among a few candidates
  const num = S.nextNum++, seed = () => (Math.random() * 4294967296) >>> 0;
  const want = CHIP_F.filter(f => f[4] === 'w' && S.chips.put[f[0]] && Math.random() < chipP(f[0], amp));
  let best = makePlanet(seed(), num, lucky, oddBoost);
  if (!want.length) return best;
  const score = p => want.reduce((a, f) => a + f[6](p), 0);
  let bs = score(best);
  for (let i = 0; i < 60 && bs < want.length; i++) { const c = makePlanet(seed(), num, lucky, oddBoost), cs = score(c); if (cs > bs) { best = c; bs = cs; } }
  best.nudged = want.filter(f => f[6](best) > 0).map(f => f[0]);
  return best;
}
function coordView() {
  const lock = running && mode === 'focus', out = [], amp = chipAmp(), cost = chipCost(), maxed = S.chips.own >= E.coordChips.max;
  out.push(el('div', { class: 'sx-res sx-chipres' }, el('b', {}, chipsFree() + ' / ' + S.chips.own), el('small', {}, 'chips free. Put them into fields to nudge what your next Explore trip finds. Move them any time you\'re not studying.')));
  out.push(el('div', { class: 'sx-queue' + (S.coord ? ' on' : '') }, el('small', {}, 'Interplanetary Coordinator'), el('b', {}, S.coord ? 'Charged: every chip counts double next trip' : 'Not charged'),
    el('span', { class: 'sl-muted' }, S.coord ? 'It also steers toward better, livable worlds.' : 'One study session of Charge doubles every chip for one Explore trip, and steers toward better worlds.')));
  out.push(el('div', { class: 'sx-up sx-chipbuy' }, el('b', {}, 'Buy a chip'), el('small', {}, maxed ? 'You have every chip there is.' : 'Expensive. Each one costs more than the last.'),
    maxed ? el('span', { class: 'sx-done' }, 'Max') : el('button', { type: 'button', class: 'btn sx-buy', disabled: S.dust < cost || null, onclick: chipBuy }, '✦ ' + cost.toLocaleString())));
  [['w', 'Worlds', 'Each chip is a chance the Coordinator insists on that kind of world.'], ['e', 'On arrival', 'Each chip adds straight to the chance.']].forEach(([g, h, note]) => {
    out.push(el('div', { class: 'sx-sec' }, el('h3', {}, h), el('p', { class: 'sl-muted' }, note), ...CHIP_F.filter(f => f[4] === g).map(([k, ic, name, what]) => {
      const n = S.chips.put[k] || 0, pc = Math.round(chipP(k, amp) * 100);
      return el('div', { class: 'sx-chiprow' + (n ? ' on' : '') },
        el('div', { class: 'sx-chip-t' }, el('b', {}, ic + ' ' + name), el('small', {}, (n ? (g === 'w' ? pc + '% chance to steer toward ' : (k === 'hush' ? '-' : '+') + pc + '% ') : 'Nudges ') + what)),
        el('div', { class: 'sx-chip-c' }, el('button', { type: 'button', class: 'btn sx-mini', 'aria-label': 'Take a chip out of ' + name, disabled: lock || !n || null, onclick: () => chipMove(k, -1) }, '−'),
          el('span', { class: 'sx-pips', role: 'img', 'aria-label': n + ' of ' + CHIP_MAX + ' chips' }, Array.from({ length: CHIP_MAX }, (_, i) => el('i', { class: i < n ? 'on' : '' }))),
          el('button', { type: 'button', class: 'btn sx-mini', 'aria-label': 'Put a chip into ' + name, disabled: lock || n >= CHIP_MAX || chipsFree() <= 0 || null, onclick: () => chipMove(k, 1) }, '+')));
    })));
  });
  return out;
}
