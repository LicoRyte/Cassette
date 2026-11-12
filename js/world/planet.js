/* Solarist: makePlanet (a whole world from one seed) and makeExtra (the extended survey numbers).
   A world starts as a few settings from 0 to 1 (heat, water, air, life, age); its type is whichever fits them best,
   and its temperature, life, colours and survey numbers all come from the same settings, so they agree. */
'use strict';

// heat (0 to 1) as degrees: frozen at 0, Earth-like around .5, molten near 1
const HEAT_C = [[0, -235], [.2, -150], [.32, -40], [.42, 5], [.55, 28], [.65, 60], [.78, 250], [.9, 700], [1, 1300]];
function heatToC(h) { for (let i = 1; i < HEAT_C.length; i++) { const [x1, y1] = HEAT_C[i], [x0, y0] = HEAT_C[i - 1]; if (h <= x1) return y0 + (y1 - y0) * (h - x0) / (x1 - x0); } return HEAT_C[HEAT_C.length - 1][1]; }
function cToHeat(t) { for (let i = 1; i < HEAT_C.length; i++) { const [x1, y1] = HEAT_C[i], [x0, y0] = HEAT_C[i - 1]; if (t <= y1) return Math.max(0, x0 + (x1 - x0) * (t - y0) / (y1 - y0)); } return 1; }
// how much of the surface is water, by type (percent); types not listed have none to speak of
const TYPE_WATER = { Ocean: [85, 99], Garden: [55, 80], Jungle: [20, 50], Desert: [0, 3], Rocky: [0, 12], Toxic: [0, 8], 'Tidally locked': [2, 25], Savanna: [5, 25], Tundra: [10, 40], Swamp: [40, 70], Fungal: [15, 40], Hycean: [96, 100], Iron: [0, 2], Carbon: [0, 5], Crystal: [0, 6] };
const TYPE_LIFE = { Garden: .6, Jungle: .5, Savanna: .4, Swamp: .4, Fungal: .4, Hycean: .3 }; // types that need living things
// the type that fits a world's settings: every type is scored, and the good fits are picked by their usual weights
function fitType(r, s, giant, lucky) {
  const LUCK = { Garden: 3, Ocean: 1.6, Jungle: 2, Savanna: 2.2, Fungal: 2, Swamp: 1.5, Tundra: 1.5, Hycean: 1.5, Crystal: 1.5, Lava: .3, Toxic: .3, Rogue: .3, Shattered: .3, 'Glass storm': .3, Dwarf: .5, 'Gas giant': .5, 'Ice giant': .5 };
  const t = heatToC(s.heat);
  const scored = Object.entries(TYPES).map(([k, T]) => {
    if (giant !== !!T.noGround) return [k, 0];
    const tFit = t >= T.t[0] && t <= T.t[1] ? 1 : Math.exp(-Math.min(Math.abs(t - T.t[0]), Math.abs(t - T.t[1])) / 60);
    const W = TYPE_WATER[k], w = s.water * 100, wFit = !W || T.noGround ? (w < 20 ? 1 : .5) : w >= W[0] - 5 && w <= W[1] + 5 ? 1 : Math.exp(-Math.min(Math.abs(w - W[0]), Math.abs(w - W[1])) / 15);
    const need = TYPE_LIFE[k], lFit = need ? (s.life >= need ? 1 : .15) : s.life > .6 ? .5 : 1;
    const score = tFit * wFit * lFit * Math.min(1, Math.sqrt(150 / Math.max(1, T.t[1] - T.t[0]))); // types that fit almost anything count a little less
    return [k, T.w * (lucky ? LUCK[k] || 1 : 1) * score * score];
  });
  const good = scored.filter(([, v]) => v > 0);
  return good.length ? weighted(r, good) : weighted(r, Object.entries(TYPES).filter(([, T]) => giant === !!T.noGround).map(([k, T]) => [k, T.w]));
}
// a world's settings: stored on worlds made since they existed, worked out from the numbers for older ones
function worldSet(p) {
  if (p.set) return p.set;
  const x = p.x || (p.x = makeExtra(p));
  return { heat: cToHeat(p.tempNight != null ? (p.temp + p.tempNight) / 2 : p.temp), water: (x.water || 0) / 100, air: .5, life: Math.min(1, (p.lifeLvl || 0) / 6), age: Math.max(0, Math.min(1, ((x.age || 4) - .4) / 12.4)) };
}
// "Cold, wet, young ocean world": the settings in words, then the type
function worldLabel(p) {
  const s = worldSet(p), gas = !!(TYPES[p.type] || {}).noGround;
  const heat = s.heat < .2 ? 'frozen' : s.heat < .36 ? 'cold' : s.heat < .47 ? 'cool' : s.heat < .58 ? 'mild' : s.heat < .68 ? 'warm' : s.heat < .82 ? 'hot' : 'burning';
  const water = gas ? (s.air > .66 ? 'stormy' : '') : s.water < .08 ? 'dry' : s.water < .35 ? '' : s.water < .8 ? 'wet' : 'drowned';
  const age = s.age < .3 ? 'young' : s.age > .78 ? 'ancient' : '';
  const words = [heat, water, age].filter(Boolean).join(', ');
  return words.charAt(0).toUpperCase() + words.slice(1) + ' ' + p.type.toLowerCase() + ' world';
}

function makePlanet(seed, num, lucky, oddBoost) {
  const r = rng(seed);
  // settings first: how hot, wet, alive, old and airy it is (0 to 1); liquid water and life need middling heat
  // most ground worlds land somewhere in the middle (freezing to scorching); the rest anywhere at all
  const giant = r() < .15, heat = giant || r() < .4 ? r() : .3 + (r() + r()) * .17, liquid = heat > .38 && heat < .66;
  const set = { heat, water: giant ? 0 : liquid ? (r() < .4 ? r() * .12 : Math.pow(r(), .7)) : r() * .25, air: r(), age: r(), life: 0 };
  set.life = giant ? r() * .05 : (liquid ? r() : r() * .2) * (set.water > .05 ? 1 : .35);
  const type = fitType(r, set, giant, lucky), T = TYPES[type];
  const rarity = weighted(r, lucky ? RARITY_LUCKY : RARITY); // a charged Interplanetary Coordinator steers toward better worlds
  // name: 2-3 made-up syllables + a numeral or letter; plus a survey catalog code
  let name = ''; const ns = r() < .6 ? 2 : 3; for (let i = 0; i < ns; i++) name += pick(r, SYL);
  name = name.charAt(0).toUpperCase() + name.slice(1);
  const suf = r(); if (suf < .45) name += ' ' + pick(r, ROMAN); else if (suf < .65) name += '-' + (1 + Math.floor(r() * 99)); else if (suf < .8) name += ' ' + 'bcdef'[Math.floor(r() * 5)];
  const code = pick(r, CATALOG) + '-' + (100 + Math.floor(r() * 9900)) + ' ' + 'bcdefg'[Math.floor(r() * 6)];
  const star = T.rogue ? 'none (drifting alone)' : weighted(r, STARS);
  // stats lean toward friendly, Earth-like numbers (but anything can still happen)
  const lean = (lo, hi, a, b) => { const l = Math.max(lo, a), h = Math.min(hi, b); return r() < (lucky ? .5 : .25) && l < h ? between(r, l, h) : between(r, lo, hi); };
  const temp = Math.round(Math.max(T.t[0], Math.min(T.t[1], heatToC(set.heat) + between(r, -12, 12))));
  set.heat = cToHeat(temp); // what the type allowed
  const tempNight = T.locked ? Math.round(between(r, -200, -60)) : null;
  const gravity = T.noGround ? +(between(r, 0.9, 3.4)).toFixed(2) : +(lean(0.15, 2.4, 0.75, 1.35)).toFixed(2);
  const day = T.locked ? null : +(T.noGround ? between(r, 8, 18) : lean(6, 90, 18, 32)).toFixed(1);
  const year = Math.round(T.rogue ? 0 : (star === 'red dwarf' ? between(r, 3, 60) : between(r, 40, 4000)));
  const moons = T.noGround ? Math.floor(between(r, 2, 90)) : Math.floor(r() * r() * 8);
  const rings = r() < (T.noGround ? .55 : .1) || (rarity === 'Legendary' && r() < .5);
  const dist = Math.round(Math.pow(10, between(r, 0.8, 4.4))); // 6 to 25,000 light-years
  const b = T.bio.slice().sort(() => r() - .5);
  const atm = pick(r, T.atm);
  const mild = !T.noGround && temp > -15 && temp < 45 && type !== 'Toxic' && type !== 'Lava';
  let lifeLvl = r() < Math.min(.98, T.life * .5 + set.life * .9 + (mild ? .05 : 0)) ? Math.min(6, 1 + Math.floor(set.life * (rarity === 'Legendary' ? 6 : rarity === 'Rare' ? 5 : 4) + r() * 1.5)) : 0;
  if (type === 'Garden' && lifeLvl < 3) lifeLvl = 3;
  const life = LIFE[Math.min(6, lifeLvl)][0];
  const pool = T.noGround ? WEATHER.gas : WEATHER.any.concat( temp > 80 ? WEATHER.hot : temp < -20 ? WEATHER.cold : (type === 'Ocean' || type === 'Jungle' || type === 'Garden') ? WEATHER.wet : []);
  const weather = pick(r, pool);
  const res = RES.slice().sort(() => r() - .5).slice(0, 1 + Math.floor(r() * 3));
  const odd = rarity === 'Rare' || rarity === 'Legendary' ? pick(r, ODD) : (r() < .12 + (oddBoost || 0) ? pick(r, ODD) : null);
  // the written log, built from pieces
  const fill = s => s.replaceAll('{n}', name).replaceAll('{star}', star.replace(' (drifting alone)', '') === 'none' ? 'nothing' : star).replaceAll('{b1}', b[0].toLowerCase()).replaceAll('{b2}', (b[1] || b[0]).toLowerCase()).replaceAll('{w}', weather);
  const lines = [fill(T.rogue ? '{n} drifts through deep space with no star at all. The ship nearly flew past it.' : pick(r, OPEN)), fill(T.noGround ? pick(r, GAS) : pick(r, GROUND))];
  if (STAR_LINE[star] && r() < .45) lines.push(pick(r, [].concat(STAR_LINE[star])));
  lines.push(fill(pick(r, SKY)));
  if (mild && gravity > .6 && gravity < 1.6 && (type === 'Garden' || type === 'Jungle' || type === 'Ocean') && r() < .7) lines.push(pick(r, HAB_LINE));
  if (odd) lines.push(pick(r, ['Most striking: ', 'The highlight: ', 'Strangest of all: ', 'Nobody expected ']) + odd + '.');
  if (lifeLvl && r() < (lifeLvl >= 3 ? .9 : .5)) lines.push(pick(r, LIFE_LINE[Math.min(6, lifeLvl)]));
  lines.push(pick(r, NOTE[rarity]));
  // look: colours from the Resurrect 64 families that suit its settings (with a wild one now and then)
  const W = TYPE_WATER[type]; if (W) set.water = Math.max(W[0], Math.min(W[1], set.water * 100)) / 100; else set.water = 0;
  set.life = Math.max(set.life, lifeLvl / 6 * .8);
  const LK = pickLook(r, set, type), pal = LK.pal, land = T.land ? LK.land : null;
  const planet = {
    v: 2, set: Object.fromEntries(Object.entries(set).map(([k, v]) => [k, +v.toFixed(3)])), seed, num, lucky: !!lucky || undefined, type, rarity, name, code, star, temp, tempNight, gravity, day, year, moons, rings, dist, atm, life, lifeLvl, weather,
    biomes: b.slice(0, 2), res, odd, log: lines.join(' '),
    look: { pv: 3, pal, land, clouds: !!T.clouds || (type === 'Ocean' && r() < .4), bands: !!T.noGround, locked: !!T.locked, lava: type === 'Lava' || type === 'Shattered', sparkle: !!T.sparkle || type === 'Crystal', crystal: type === 'Crystal', tilt: between(r, -0.35, 0.35), ringCol: LK.ringCol, noise: Math.floor(r() * 1e9) },
  };
  planet.x = makeExtra(planet);
  return planet;
}

/* ---------- the extended survey (orbit, size, climate numbers, biodiversity, habitability). Worked out from the
   planet's own seed and stats, so worlds found before this existed get the same numbers every time. ---------- */
const HZ = { 'red dwarf': [0.1, 0.25], 'orange dwarf': [0.45, 0.85], 'yellow dwarf': [0.95, 1.67], 'white dwarf': [0.008, 0.02], 'blue giant': [20, 50], 'red giant': [10, 25], 'binary pair': [1.1, 2.2], pulsar: [0.3, 0.6] };
const LEVEL = ['None', 'Weak', 'Moderate', 'Strong', 'Extreme'];
function makeExtra(p) {
  const r = rng((p.seed ^ 0xA11CE5) >>> 0), T = TYPES[p.type] || {}, gas = !!T.noGround, x = {};
  // orbit: the hotter the planet, the closer to its star; is it inside the habitable zone?
  if (p.star.startsWith('none')) { x.au = null; x.zone = 'no star'; }
  else {
    const hz = HZ[p.star] || [0.9, 1.6], mid = Math.sqrt(hz[0] * hz[1]);
    const k = Math.max(25, (p.tempNight != null ? (p.temp + p.tempNight) / 2 : p.temp) + 273);
    const au = mid * Math.pow(288 / k, 2) * between(r, .85, 1.15);
    x.au = +au.toPrecision(3); x.zone = au < hz[0] ? 'too close' : au > hz[1] ? 'too far' : 'habitable';
  }
  // size and mass (mass follows from gravity and radius, so the numbers agree with each other)
  x.radius = +(gas ? (p.type === 'Ice giant' ? between(r, 3.2, 4.6) : between(r, 6, 13)) : r() < .55 ? between(r, .75, 1.4) : between(r, .25, 2.3)).toFixed(2);
  x.mass = +(p.gravity * x.radius * x.radius).toFixed(2);
  x.escape = +(11.19 * Math.sqrt(x.mass / x.radius)).toFixed(1);
  x.tilt = Math.round(r() < .7 ? between(r, 3, 35) : between(r, 0, 98));
  x.age = +between(r, .4, 12.8).toFixed(1);
  if (p.set) x.age = +(.4 + p.set.age * 12.4).toFixed(1);
  const a = p.atm.toLowerCase();
  x.pressure = gas ? null : (a.includes('almost none') || a.includes('frozen')) ? +between(r, 0, .01).toFixed(3) : a.includes('thin') ? +between(r, .05, .6).toFixed(2) : (a.includes('thick') || a.includes('sulfuric') || a.includes('chlorine')) ? +between(r, 4, 92).toFixed(1) : +(r() < .6 ? between(r, .8, 1.3) : between(r, .5, 3)).toFixed(2);
  const W = { Ocean: [85, 99], Garden: [55, 80], Jungle: [20, 50], Desert: [0, 3], Rocky: [0, 12], Toxic: [0, 8], 'Tidally locked': [2, 25], Savanna: [5, 25], Tundra: [10, 40], Swamp: [40, 70], Fungal: [15, 40], Hycean: [96, 100], Iron: [0, 2], Carbon: [0, 5], Crystal: [0, 6] };
  x.water = gas || !W[p.type] ? 0 : Math.round(between(r, W[p.type][0], W[p.type][1]));
  if (p.set && W[p.type]) x.water = Math.round(Math.max(W[p.type][0], Math.min(W[p.type][1], p.set.water * 100)));
  const O = { Garden: [18, 24], Jungle: [22, 33], Ocean: [6, 21], 'Tidally locked': [0, 12], Savanna: [16, 23], Tundra: [12, 21], Swamp: [14, 22], Fungal: [8, 18], Hycean: [0, 4] };
  x.oxygen = +(O[p.type] ? between(r, O[p.type][0], O[p.type][1]) : between(r, 0, 1.5)).toFixed(1);
  x.clouds = Math.round(gas ? between(r, 90, 100) : p.type === 'Toxic' ? between(r, 70, 100) : between(r, 0, 80));
  x.peak = gas ? null : +between(r, .5, 2 + 22 / Math.max(.3, p.gravity)).toFixed(1);
  x.depth = x.water > 0 ? +between(r, .2, 12).toFixed(1) : null;
  x.magnet = gas ? LEVEL[3 + Math.floor(r() * 2)] : LEVEL[Math.floor(r() * 5)];
  let rad = (p.star === 'blue giant' || p.star === 'pulsar') ? 2 : p.star === 'red dwarf' ? 1 : 0;
  if (x.magnet === 'None' || x.magnet === 'Weak') rad++; if (x.pressure != null && x.pressure > 1.5) rad--;
  x.radiation = ['Low', 'Moderate', 'High', 'Lethal'][Math.max(0, Math.min(3, rad))];
  x.albedo = +(p.type === 'Ice' || p.type === 'Ice giant' || p.type === 'Tundra' || p.type === 'Glass storm' ? between(r, .5, .9) : p.type === 'Lava' || p.type === 'Rogue' || p.type === 'Carbon' || p.type === 'Shattered' ? between(r, .02, .12) : between(r, .1, .5)).toFixed(2);
  // biodiversity: a 0-100 index and a rough species count, from how complex its life is
  const lv = Math.min(6, p.lifeLvl || 0), BIO = [[0, 0], [100, 900], [1000, 12000], [10000, 250000], [50000, 1200000], [200000, 5000000], [1000000, 20000000]];
  x.species = lv ? Math.round(Math.exp(between(r, Math.log(BIO[lv][0]), Math.log(BIO[lv][1])))) : 0;
  x.bio = lv ? Math.min(100, Math.round(lv * 14 + between(r, 0, 14))) : 0;
  // habitability: how close it is to somewhere people could live
  const near = (v, ideal, span) => Math.max(0, 1 - Math.abs(v - ideal) / span);
  let h = gas ? .02 : near(p.temp, 15, 60) * .3 + near(p.gravity, 1, 1.5) * .15 + (x.pressure == null ? 0 : near(Math.log10(Math.max(x.pressure, .001)), 0, 2)) * .15
    + Math.min(1, x.oxygen / 21) * .15 + Math.min(1, x.water / 70) * .1 + (x.zone === 'habitable' ? .1 : 0) + (x.radiation === 'Low' ? .05 : x.radiation === 'Moderate' ? .025 : 0);
  if (p.type === 'Lava' || p.type === 'Toxic' || p.type === 'Shattered') h *= .3;
  if (p.tempNight != null) h *= .7;
  h *= x.oxygen < 5 ? .55 : x.oxygen < 12 ? .8 : 1; // no breathable air: much harder to live on
  if (x.water < 5) h *= .85; // and almost no water
  x.hab = Math.round(Math.min(1, h) * 100);
  return x;
}
