/* Solarist: a Pomodoro timer for space explorers. Every finished study session is a jump through deep space that ends
   at a brand-new, randomly generated planet (name, class, climate, biomes, life, a pixel-art portrait...).
   Breaks are spent preparing equipment for the next mission. Every world you find goes in your Logbook. Build a Listening Post on a world and tune the
   ship's satellite to it, and it sends back a transmission every study session (purely for fun: no effect on finds).
   Saved in this browser: the logbook, today's count, settings and a running timer.
   The page shell (index.html + shell.js) mounts it and draws the flight scene from the hooks.scene info. */
(() => {
  'use strict';
  const KEY = 'lico-solarist', OLD_KEY = 'lico-archivist';
  const MODES = { focus: 'Study', short: 'Short break', long: 'Long break' };

  /* =====================================================================
     Planet generator. Everything comes from one random seed, and the finished planet is saved as data,
     so editing these lists later only changes future discoveries, never the ones already in a logbook.
     ===================================================================== */
  function rng(seed) { // mulberry32
    let a = Math.imul((seed >>> 0) ^ 0x9E3779B9, 0x85EBCA6B) >>> 0; // scramble the seed so neighbouring seeds look nothing alike
    const next = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    for (let i = 0; i < 6; i++) next();
    return next;
  }
  const SYL = ['ka', 've', 'lor', 'thi', 'xan', 'mo', 'ri', 'zeph', 'ul', 'dra', 'ny', 'os', 'cae', 'ta', 'vel', 'qui', 'bar', 'ish', 'on', 'ae', 'sol', 'mir', 'dun', 'kel', 'sa', 'tor', 'fen', 'ix', 'yra', 'go', 'lu', 'ne', 'ar', 'em', 'phi', 'rho', 'zan', 'tue', 'il', 'cor', 'mae', 'ost', 'vry', 'hal', 'ena', 'kor', 'syl', 'tav'];
  const CATALOG = ['KS', 'HX', 'TRA', 'VND', 'OGL', 'SLR', 'GX', 'PMR', 'NEB', 'K2', 'TOI', 'QZ'];
  const ROMAN = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const RARITY = [['Common', 60], ['Uncommon', 26], ['Rare', 11], ['Legendary', 3]];
  const RARITY_LUCKY = [['Common', 36], ['Uncommon', 38], ['Rare', 20], ['Legendary', 6]];
  const STARS = [['red dwarf', 34], ['orange dwarf', 22], ['yellow dwarf', 18], ['white dwarf', 6], ['blue giant', 5], ['red giant', 6], ['binary pair', 7], ['pulsar', 2]];
  // class: weight, temperature range (°C), palette (light -> dark), biomes, atmospheres, life chance, has a surface
  const TYPES = {
    Rocky: { w: 14, t: [-80, 60], pal: ['#a6859f', '#7b5480', '#873555', '#4a3052'], bio: ['Rocky plains', 'Canyon mazes', 'Cratered highlands', 'Dust basins', 'Stone arches', 'Boulder fields'], atm: ['Thin nitrogen', 'Carbon dioxide', 'Almost none', 'Argon haze'], life: .15 },
    Ocean: { w: 9, t: [2, 34], pal: ['#6d80fa', '#6d80fa', '#8465ec', '#4e187c'], land: ['#6bc96c', '#f2ae99'], bio: ['Endless ocean', 'Island chains', 'Reef shallows', 'Storm seas', 'Kelp-like forests', 'Floating ice rafts'], atm: ['Nitrogen and oxygen', 'Humid nitrogen', 'Thick water vapor'], life: .7 },
    Jungle: { w: 7, t: [18, 48], pal: ['#abdd64', '#6bc96c', '#5ba675', '#4a3052'], bio: ['Dense jungle', 'Giant fungus forests', 'Swamp deltas', 'Vine canopies', 'Glowing moss valleys', 'Bamboo-like towers'], atm: ['Oxygen-rich', 'Humid nitrogen and oxygen', 'Spore-heavy air'], life: .92 },
    Desert: { w: 10, t: [25, 95], pal: ['#ffb879', '#f2ae99', '#c97373', '#a6555f'], bio: ['Dune seas', 'Salt flats', 'Glass deserts', 'Mesa country', 'Dry riverbeds', 'Rust plains'], atm: ['Dry carbon dioxide', 'Thin nitrogen', 'Dusty nitrogen'], life: .25 },
    Ice: { w: 11, t: [-220, -25], pal: ['#ffffff', '#aee2ff', '#8db7ff', '#6d80fa'], bio: ['Glacier fields', 'Frozen oceans', 'Ice caves', 'Snow plains', 'Cryovolcano fields', 'Blue ice cliffs'], atm: ['Thin nitrogen', 'Methane traces', 'Almost none'], life: .12 },
    Lava: { w: 7, t: [350, 1500], pal: ['#ffb879', '#ea6262', '#611851', '#1f102a'], bio: ['Lava seas', 'Volcanic chains', 'Obsidian plains', 'Ash fields', 'Magma rivers', 'Basalt towers'], atm: ['Sulfur dioxide', 'Volcanic ash and CO₂', 'Almost none'], life: .02 },
    'Gas giant': { w: 10, t: [-170, 900], pal: ['#f2ae99', '#c97373', '#a6555f', '#873555'], bio: ['Banded cloud belts', 'Endless storms', 'Ammonia skies', 'Hydrogen depths'], atm: ['Hydrogen and helium'], life: .04, noGround: true },
    'Ice giant': { w: 6, t: [-225, -170], pal: ['#aee2ff', '#8db7ff', '#6d80fa', '#4e187c'], bio: ['Methane haze', 'Diamond rain layers', 'Deep water-ice mantle', 'Supersonic winds'], atm: ['Hydrogen, helium and methane'], life: .01, noGround: true },
    Toxic: { w: 5, t: [60, 480], pal: ['#abdd64', '#6bc96c', '#5ba675', '#611851'], bio: ['Acid lakes', 'Sulfur fields', 'Yellow haze plains', 'Corroded canyons', 'Bubbling mud pits'], atm: ['Sulfuric acid clouds', 'Chlorine haze', 'Thick carbon dioxide'], life: .06 },
    Crystal: { w: 3, t: [-120, 40], pal: ['#ffc3f2', '#ee8fcb', '#d46eb3', '#873e84'], bio: ['Crystal spires', 'Mirror plains', 'Prism caves', 'Singing quartz forests', 'Geode valleys'], atm: ['Thin neon', 'Almost none', 'Argon and nitrogen'], life: .1 },
    'Tidally locked': { w: 5, t: [-140, 260], pal: ['#ffb879', '#c97373', '#4a3052', '#1f102a'], bio: ['Twilight band', 'Scorched dayside', 'Frozen nightside', 'Eternal sunset strip'], atm: ['Nitrogen', 'Thin carbon dioxide', 'Wind-whipped nitrogen'], life: .3, locked: true },
    Garden: { w: 3, t: [6, 28], pal: ['#8db7ff', '#6d80fa', '#8465ec', '#4e187c'], land: ['#5ba675', '#6bc96c'], clouds: true, bio: ['Temperate forests', 'Rolling grasslands', 'River valleys', 'Flower meadows', 'Misty mountains', 'Calm lakes'], atm: ['Nitrogen and oxygen, breathable'], life: .97 },
    Savanna: { w: 4, t: [15, 42], pal: ['#fcef8d', '#ffb879', '#abdd64', '#5ba675'], bio: ['Golden grasslands', 'Lone giant trees', 'Termite-mound fields', 'Seasonal watering holes', 'Red-rock outcrops', 'Dry riverbeds'], atm: ['Nitrogen and oxygen, dry', 'Warm nitrogen and oxygen'], life: .85 },
    Tundra: { w: 5, t: [-40, 8], pal: ['#ffffff', '#d9bdc8', '#a6859f', '#5ba675'], bio: ['Frozen moss plains', 'Permafrost bogs', 'Rocky taiga', 'Snowy foothills', 'Frost-cracked flats', 'Ice-edged lakes'], atm: ['Cold nitrogen and oxygen', 'Thin, crisp nitrogen'], life: .45 },
    Swamp: { w: 4, t: [12, 38], pal: ['#5ba675', '#4a3052', '#611851', '#390947'], land: ['#873555', '#5ba675'], bio: ['Mangrove-like mazes', 'Steaming bogs', 'Reed marshes', 'Floating plant mats', 'Muddy deltas', 'Fog-filled hollows'], atm: ['Humid, methane-scented air', 'Thick, wet nitrogen and oxygen'], life: .85 },
    Fungal: { w: 3, t: [5, 30], pal: ['#ee8fcb', '#d46eb3', '#7b5480', '#390947'], bio: ['Giant mushroom forests', 'Spore meadows', 'Glowing mycelium caves', 'Puffball plains', 'Shelf-fungus cliffs'], atm: ['Spore-heavy nitrogen', 'Damp carbon dioxide and oxygen'], life: .95 },
    Hycean: { w: 4, t: [-10, 60], pal: ['#aee2ff', '#6bc96c', '#6d80fa', '#4e187c'], clouds: true, bio: ['Warm global ocean', 'Hydrogen sky', 'Deep thermal vents', 'Glowing plankton seas'], atm: ['Thick hydrogen over a warm ocean'], life: .6 },
    Iron: { w: 3, t: [-50, 300], pal: ['#d9bdc8', '#a6859f', '#7b5480', '#4a3052'], bio: ['Metal plains', 'Rust canyons', 'Magnetite dunes', 'Mirror-bright craters', 'Iron spire fields'], atm: ['Almost none', 'Thin argon'], life: .05 },
    Carbon: { w: 2, t: [-80, 600], pal: ['#7b5480', '#4a3052', '#390947', '#1f102a'], sparkle: true, bio: ['Graphite plains', 'Diamond-studded cliffs', 'Tar lakes', 'Soot deserts', 'Carbide mountains'], atm: ['Carbon monoxide haze', 'Thick methane'], life: .05 },
    Shattered: { w: 2, t: [100, 900], pal: ['#ea6262', '#cc425e', '#751756', '#1f102a'], bio: ['Broken crust plates', 'Glowing fault lines', 'Floating rock shards', 'Magma rifts'], atm: ['Almost none', 'Volcanic ash and CO₂'], life: .01 },
    Dwarf: { w: 5, t: [-230, -60], pal: ['#d9bdc8', '#a6859f', '#7b5480', '#4a3052'], bio: ['Cratered plains', 'Frozen nitrogen fields', 'Dusty highlands', 'Tiny ice volcanoes'], atm: ['Almost none', 'Frozen solid'], life: .03 },
    'Glass storm': { w: 2, t: [700, 1100], pal: ['#ffffff', '#aee2ff', '#8465ec', '#4e187c'], bio: ['Silicate cloud bands', 'Sideways glass rain', 'Supersonic winds', 'Molten silicate depths'], atm: ['Hydrogen with silicate clouds'], life: 0, noGround: true },
    Rogue: { w: 2, t: [-235, -205], pal: ['#4a3052', '#390947', '#4e187c', '#1f102a'], bio: ['Eternal night', 'Frozen crust', 'Geothermal hot spots', 'Black ice plains'], atm: ['Frozen solid', 'Almost none'], life: .05, rogue: true },
  };
  const LIFE = [['No signs of life', 0], ['Microbial traces', 1], ['Moss-like mats', 2], ['Plant-like life', 3], ['Swimming creatures', 4], ['Large animal herds', 5], ['Signs of intelligence', 6]];
  const WEATHER = {
    any: ['calm, still air', 'gentle winds', 'sudden dust devils', 'aurora storms near the poles', 'long, quiet nights', 'electrical storms', 'thick morning fog'],
    hot: ['heat shimmer all day', 'firestorms', 'ash rain', 'scorching winds'],
    cold: ['snow that never stops', 'hurricanes of ice crystals', 'frost that cracks rock', 'nitrogen snow'],
    wet: ['warm rain every afternoon', 'monsoon seasons', 'rainbow mists', 'endless drizzle'],
    gas: ['a storm larger than Earth', 'jet streams faster than sound', 'lightning bigger than continents', 'cloud bands that shift every hour'],
  };
  const RES = ['iron', 'nickel', 'water ice', 'helium-3', 'titanium', 'silicon', 'carbon', 'rare-earth metals', 'diamond dust', 'platinum', 'deuterium', 'lithium', 'unknown crystals'];
  const OPEN = [
    'Sensors locked onto {n} as the ship dropped out of the jump.',
    'Long-range scans picked up {n} glinting near its {star}.',
    'After a long haul through empty space, {n} filled the viewport.',
    'The navigation computer flagged {n} as uncharted. Not anymore.',
    'A faint signal led the ship straight to {n}.',
    '{n} appeared out of the dark, right where the charts showed nothing.',
    'The autopilot slowed down on its own when {n} came into range.',
    'A course correction brought the ship around, and there was {n}.',
    'The star charts had a smudge here. The smudge turned out to be {n}.',
    'The night shift woke everyone up: {n} was on the scanners.',
    'Gravity readings tugged the ship toward {n} before anyone saw it.',
    'Exiting the jump, the first thing in the window was {n}.',
  ];
  const GROUND = [
    'Most of the surface is {b1}, broken up by {b2}.',
    'Survey drones mapped {b1} stretching to the horizon, with patches of {b2}.',
    'From orbit it looks like {b1}; up close, there are {b2} too.',
    'The landing team reported {b1} and, further out, {b2}.',
    'Low passes over the surface showed {b1} giving way to {b2}.',
    'The map is mostly {b1}, stitched together by {b2}.',
    'Sensors picked out {b1} in the north and {b2} toward the equator.',
    'Every photo from the surface shows {b1}. A few show {b2}.',
    'Half of it is {b1}. The other half is {b2}, which nobody expected.',
    'The rover got stuck twice in the {b1}, then found {b2}.',
  ];
  const SKY = [
    'The weather: {w}.',
    'Expect {w} on any visit.',
    'Atmospheric readings show {w}.',
    'The crew logged {w} during the flyby.',
    'Local forecast: {w}.',
    'The sensors kept reporting {w}.',
    'It\'s a world of {w}.',
    'The drones came back reporting {w}.',
  ];
  const GAS = [
    'There is no solid ground, just {b1} sinking into {b2}.',
    'Probes dropped into {b1} and were lost somewhere in the {b2}.',
    'Below the {b1}, the pressure climbs until the probes go quiet in the {b2}.',
    'You could fall forever here: {b1} above, {b2} below, and no floor.',
    'From orbit you can watch {b1} curl into {b2}.',
  ];
  const NOTE = {
    Common: ['A quiet world. Worth a pin on the map.', 'Nothing unusual, which is its own kind of nice.', 'Logged and catalogued. On to the next one.', 'A good place to stretch your legs.', 'Ordinary, in the most relaxing way.', 'One more dot on the map. A nice dot.', 'The crew took a group photo and moved on.'],
    Uncommon: ['Scientists back home will want a closer look.', 'The readings here are a little strange. In a good way.', 'One of the crew has already asked to come back.', 'Worth a second visit.', 'There is more going on here than it first looks like.', 'The sample drawers are full of interesting rocks.'],
    Rare: ['The ship\'s instruments have never recorded anything like it.', 'Mission control asked for the data three times to be sure.', 'A world like this turns up maybe once in a hundred jumps.', 'Three different sensors had to agree before anyone believed it.', 'The science team is arguing about it already.'],
    Legendary: ['Old star maps mention a world like this, but nobody believed them.', 'The crew went completely silent at the viewport.', 'This one goes on the front page of every science journal back home.', 'Once in a lifetime. Maybe once in several.', 'Nobody on board will forget this one.'],
  };
  const ODD = ['a perfectly round lake', 'ruins of an ancient structure', 'a second, tiny star in its sky', 'rings that glow at night', 'a mountain taller than Olympus Mons', 'a canyon that circles the whole planet', 'a moon that orbits backwards', 'a magnetic field strong enough to scramble the compass', 'a repeating radio pulse from the surface', 'giant crystal arches', 'a crater shaped like a heart', 'a storm that has not moved in centuries', 'a lake that glows at night', 'floating rock islands', 'a geyser taller than any mountain', 'a perfectly straight canyon', 'spiral-shaped dunes', 'mirror-smooth salt plains that reflect the stars', 'trees of pure crystal', 'a waterfall that falls upward in the wind'];
  // extra lines for variety: the star's light, how livable it feels, and what the bio-scanner says
  const STAR_LINE = { 'red dwarf': 'Its red dwarf sun turns every shadow a deep crimson.', 'orange dwarf': 'Amber light from its star makes every afternoon look like sunset.', 'yellow dwarf': 'Its yellow sun feels almost familiar.', 'white dwarf': 'A tiny, fierce white star gives it a cold, clinical light.', 'blue giant': 'A huge blue sun fills the sky and bleaches every color.', 'red giant': 'A swollen red giant takes up a third of the sky.', 'binary pair': 'Two suns cast double shadows on everything.', 'pulsar': 'The pulsar ticks overhead like a cosmic clock.' };
  const HAB_LINE = ['You could almost walk around without a suit.', 'Someone should bring a tent.', 'It looks a lot like home, if home were a bit stranger.', 'The air readings came back almost breathable.', 'The crew is already arguing about who gets to live here.'];
  const LIFE_LINE = [null, ['The bio-scanner found microbes clinging to the rocks.', 'Something tiny is alive down there.'], ['Patches of moss-like life cover the sheltered valleys.', 'The ground is furred with something green-ish.'], ['Whole forests of strange plants sway below.', 'Things are growing everywhere you look.'], ['Shapes move under the water. Big ones.', 'The seas are full of swimmers.'], ['Herds of large animals crossed the plains below.', 'The bio-scanner would not stop beeping.'], ['Something down there is watching us back.', 'There are lights on the night side. Regular, patterned lights.']];

  function weighted(r, list) { const total = list.reduce((a, x) => a + x[1], 0); let x = r() * total; for (const it of list) { if ((x -= it[1]) < 0) return it[0]; } return list[0][0]; }
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const between = (r, a, b) => a + r() * (b - a);
  function shiftHex(hex, deg, light) { // nudge a colour's hue and lightness for slight variation
    const n = parseInt(hex.slice(1), 16), R = (n >> 16 & 255) / 255, G = (n >> 8 & 255) / 255, B = (n & 255) / 255;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B); let h = 0, s = 0; const l0 = (mx + mn) / 2, d = mx - mn;
    if (d) { s = l0 > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === R ? (G - B) / d + (G < B ? 6 : 0) : mx === G ? (B - R) / d + 2 : (R - G) / d + 4; h *= 60; }
    h = (h + deg + 360) % 360; const l = Math.max(0, Math.min(1, l0 + light));
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(h / 60 % 2 - 1)), m = l - c / 2;
    const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return '#' + [r1, g1, b1].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
  }

  function makePlanet(seed, num, lucky, oddBoost) {
    const r = rng(seed);
    const LUCK = { Garden: 3, Ocean: 1.6, Jungle: 2, Savanna: 2.2, Fungal: 2, Swamp: 1.5, Tundra: 1.5, Hycean: 1.5, Crystal: 1.5, Lava: .3, Toxic: .3, Rogue: .3, Shattered: .3, 'Glass storm': .3, Dwarf: .5, 'Gas giant': .5, 'Ice giant': .5 }; // a lucky trip favours livable worlds
    const type = weighted(r, Object.entries(TYPES).map(([k, v]) => [k, v.w * (lucky ? LUCK[k] || 1 : 1)])), T = TYPES[type];
    const rarity = weighted(r, lucky ? RARITY_LUCKY : RARITY); // a charged Interplanetary Coordinator steers toward better worlds
    // name: 2-3 made-up syllables + a numeral or letter; plus a survey catalog code
    let name = ''; const ns = r() < .6 ? 2 : 3; for (let i = 0; i < ns; i++) name += pick(r, SYL);
    name = name.charAt(0).toUpperCase() + name.slice(1);
    const suf = r(); if (suf < .45) name += ' ' + pick(r, ROMAN); else if (suf < .65) name += '-' + (1 + Math.floor(r() * 99)); else if (suf < .8) name += ' ' + 'bcdef'[Math.floor(r() * 5)];
    const code = pick(r, CATALOG) + '-' + (100 + Math.floor(r() * 9900)) + ' ' + 'bcdefg'[Math.floor(r() * 6)];
    const star = T.rogue ? 'none (drifting alone)' : weighted(r, STARS);
    // stats lean toward friendly, Earth-like numbers (but anything can still happen)
    const lean = (lo, hi, a, b) => { const l = Math.max(lo, a), h = Math.min(hi, b); return r() < (lucky ? .5 : .25) && l < h ? between(r, l, h) : between(r, lo, hi); };
    const temp = Math.round(lean(T.t[0], T.t[1], -10, 32));
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
    let lifeLvl = r() < Math.min(.98, T.life + (mild ? .08 : 0) + (lucky ? .15 : 0)) ? 1 + Math.floor(r() * (rarity === 'Legendary' ? 6 : rarity === 'Rare' ? 5 : 4)) : 0;
    if (type === 'Garden' && lifeLvl < 3) lifeLvl = 3;
    const life = LIFE[Math.min(6, lifeLvl)][0];
    const pool = T.noGround ? WEATHER.gas : WEATHER.any.concat( temp > 80 ? WEATHER.hot : temp < -20 ? WEATHER.cold : (type === 'Ocean' || type === 'Jungle' || type === 'Garden') ? WEATHER.wet : []);
    const weather = pick(r, pool);
    const res = RES.slice().sort(() => r() - .5).slice(0, 1 + Math.floor(r() * 3));
    const odd = rarity === 'Rare' || rarity === 'Legendary' ? pick(r, ODD) : (r() < .12 + (oddBoost || 0) ? pick(r, ODD) : null);
    // the written log, built from pieces
    const fill = s => s.replace('{n}', name).replace('{star}', star.replace(' (drifting alone)', '') === 'none' ? 'nothing' : star).replace('{b1}', b[0].toLowerCase()).replace('{b2}', (b[1] || b[0]).toLowerCase()).replace('{w}', weather);
    const lines = [fill(T.rogue ? '{n} drifts through deep space with no star at all. The ship nearly flew past it.' : pick(r, OPEN)), fill(T.noGround ? pick(r, GAS) : pick(r, GROUND))];
    if (STAR_LINE[star] && r() < .45) lines.push(STAR_LINE[star]);
    lines.push(fill(pick(r, SKY)));
    if (mild && gravity > .6 && gravity < 1.6 && (type === 'Garden' || type === 'Jungle' || type === 'Ocean') && r() < .7) lines.push(pick(r, HAB_LINE));
    if (odd) lines.push(pick(r, ['Most striking: ', 'The highlight: ', 'Strangest of all: ', 'Nobody expected ']) + odd + '.');
    if (lifeLvl && r() < (lifeLvl >= 3 ? .9 : .5)) lines.push(pick(r, LIFE_LINE[Math.min(6, lifeLvl)]));
    lines.push(pick(r, NOTE[rarity]));
    // look: palette with a little random variation
    const hue = between(r, -18, 18), lit = between(r, -.05, .05);
    const pal = T.pal.map(c => shiftHex(c, hue, lit));
    const land = T.land ? T.land.map(c => shiftHex(c, hue / 2, lit)) : null;
    const planet = {
      v: 1, seed, num, lucky: !!lucky || undefined, type, rarity, name, code, star, temp, tempNight, gravity, day, year, moons, rings, dist, atm, life, lifeLvl, weather,
      biomes: b.slice(0, 2), res, odd, log: lines.join(' '),
      look: { pv: 2, pal, land, clouds: !!T.clouds || (type === 'Ocean' && r() < .4), bands: !!T.noGround, locked: !!T.locked, lava: type === 'Lava' || type === 'Shattered', sparkle: !!T.sparkle || type === 'Crystal', crystal: type === 'Crystal', tilt: between(r, -0.35, 0.35), ringCol: pick(r, ['#d9bdc8', '#a6859f', '#ee8fcb', '#ffb879', '#8db7ff', '#c97373']), noise: Math.floor(r() * 1e9) },
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
    const a = p.atm.toLowerCase();
    x.pressure = gas ? null : (a.includes('almost none') || a.includes('frozen')) ? +between(r, 0, .01).toFixed(3) : a.includes('thin') ? +between(r, .05, .6).toFixed(2) : (a.includes('thick') || a.includes('sulfuric') || a.includes('chlorine')) ? +between(r, 4, 92).toFixed(1) : +(r() < .6 ? between(r, .8, 1.3) : between(r, .5, 3)).toFixed(2);
    const W = { Ocean: [85, 99], Garden: [55, 80], Jungle: [20, 50], Desert: [0, 3], Rocky: [0, 12], Toxic: [0, 8], 'Tidally locked': [2, 25], Savanna: [5, 25], Tundra: [10, 40], Swamp: [40, 70], Fungal: [15, 40], Hycean: [96, 100], Iron: [0, 2], Carbon: [0, 5], Crystal: [0, 6] };
    x.water = gas || !W[p.type] ? 0 : Math.round(between(r, W[p.type][0], W[p.type][1]));
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

  /* ---------- Listening Posts: build one on a world, tune the ship's satellite to it, and it reports back.
     Each study session while tuned brings one transmission: first the deep-scan findings (core, native species,
     what the anomaly really is, hidden secrets), then an endless trickle of daily logs. ---------- */
  const CORES = ['Molten iron core', 'Solid iron-nickel core', 'Diamond-rich core', 'Frozen rock core', 'Liquid metallic hydrogen', 'Radioactive core, warm to the touch', 'Strangely hollow-sounding mantle', 'Crystal lattice core', 'Ocean of liquid water under the crust', 'Slowly cooling magma core'];
  const SPECIES = [null,
    ['mat colonies', 'spore clouds', 'slime films', 'micro-blooms'],
    ['moss carpets', 'lichen crusts', 'creeping mats', 'stone moss'],
    ['bloomcaps', 'reed-trees', 'glass ferns', 'lantern vines', 'sun-cups'],
    ['glidefins', 'ribbon eels', 'shell swimmers', 'drift jellies', 'bubble rays'],
    ['striders', 'longnecks', 'burrowers', 'six-legged grazers', 'shell-backs'],
    ['builders', 'watchers', 'singers', 'tool-makers', 'stargazers']];
  const ODD_X = ['completely natural, though nobody can explain how it formed', 'almost certainly natural. Almost', 'artificial. Someone was here long before us', 'a trick of the light from the local star', 'older than the planet\'s own crust', 'still changing, very slowly', 'linked to something deep underground'];
  const SECRETS = ['The post recorded a low hum coming from underground.', 'At night, the ground glows faintly around the post.', 'Something left tracks around the post overnight.', 'A huge cave system runs under most of the surface.', 'Found a meteorite that came from another star system.', 'Wind here whistles through the rocks, almost like music.', 'The compass points at the same mountain no matter where you stand.', 'Rock layers show the climate flips every few thousand years.', 'There is liquid water deep underground, kept warm by the core.', 'Picked up a faint signal that repeats every 42 minutes.', 'The soil is full of tiny, perfect glass spheres.', 'Sunsets here last almost an hour.', 'A shooting star crosses the sky every few minutes.', 'Gravity dips slightly over one region, as if something huge is buried there.'];
  const DAILY = {
    any: ['All systems green. Nothing to report, which is nice.', 'Antenna realigned after a small quake.', 'Recorded {w} again today.', 'Counted {m} moons rising tonight.', 'Dust cleaned off the solar panels. Again.', 'Measured the day: {d}. The post\'s clock agrees.', 'Temperature holding at {t}.', 'Took a panorama of the {b}. It\'s beautiful out here.', 'Drilled a core sample: mostly {r}.', 'Quiet night. The stars look different from here.', 'A small rockslide near the post. No damage.', 'Signal strength perfect. Hello from {n}.'],
    life: ['The {s} came closer to the post today.', 'Recorded the {s} making a new sound.', 'A group of {s} seems to be nesting nearby.', 'The {s} avoid the post at night. Curious.'],
    gas: ['The post\'s balloon drifted through another storm band.', 'Lightning flashes lit up the cloud deck for an hour.', 'Wind speed hit a new record today.'],
    star: ['The {star} flared briefly. Shields held.', 'Watched the {star} set behind the {b}.'],
  };
  function scanQueue(p) { // the first transmissions from a new post: the deep-scan findings, in order
    const r = rng((p.seed ^ 0x5EEDBEEF) >>> 0), q = [];
    q.push({ k: 'core', v: pick(r, CORES) });
    if (p.lifeLvl > 0) { let n = ''; for (let i = 0; i < 2; i++) n += pick(r, SYL); q.push({ k: 'species', v: n.charAt(0).toUpperCase() + n.slice(1) + ' ' + pick(r, SPECIES[Math.min(6, p.lifeLvl)]) }); }
    if (p.odd) q.push({ k: 'odd', v: pick(r, ODD_X) });
    SECRETS.slice().sort(() => r() - .5).slice(0, 3).forEach(v => q.push({ k: 'secret', v }));
    return q;
  }
  function daily(p, post, r) {
    const sp = post.species, pk = a => a[Math.floor(r() * a.length)];
    const pool = DAILY.any.concat(sp ? DAILY.life : [], (p.type === 'Gas giant' || p.type === 'Ice giant' || p.type === 'Glass storm') ? DAILY.gas : [], p.star.startsWith('none') ? [] : DAILY.star);
    return pk(pool).replace('{w}', p.weather).replace('{m}', String(p.moons)).replace('{d}', p.day == null ? 'endless' : p.day + ' hours').replace('{t}', p.temp + ' °C')
      .replace('{b}', p.biomes[0].toLowerCase()).replace('{r}', pk(p.res)).replace('{n}', p.custom || p.name).replace('{s}', sp || 'locals').replace('{star}', p.star);
  }
  // the next transmission from a post (adds it to the post's log and returns it)
  function transmit(p) {
    const post = p.post, q = scanQueue(p), i = post.reports.filter(x => x.k !== 'log').length;
    let rep;
    if (i < q.length) {
      const it = q[i];
      if (it.k === 'core') { post.core = it.v; rep = { k: 'core', t: 'Core scan complete: ' + it.v.charAt(0).toLowerCase() + it.v.slice(1) + '.' }; }
      else if (it.k === 'species') { post.species = it.v; rep = { k: 'species', t: 'Native species identified and named: the ' + it.v + '.' }; }
      else if (it.k === 'odd') { post.oddX = it.v; rep = { k: 'odd', t: 'Anomaly studied. The ' + p.odd.replace(/^(a|an|the) /, '') + ' is ' + it.v + '.' }; }
      else rep = { k: 'secret', t: it.v };
    } else {
      const r = rng((p.seed + post.reports.length * 7919) >>> 0);
      rep = { k: 'log', t: daily(p, post, r) };
    }
    rep.at = Date.now(); rep.day = Math.max(1, Math.round((Date.now() - post.built) / 86400000) + 1);
    post.reports.push(rep);
    return rep;
  }
  /* ---------- Travelers' Posts: an upgraded Listening Post that ships and travelers stop at. You can add facilities
     (one of each), and when it's tuned they send logs of what's going on there. Purely for fun. ---------- */
  const FAC = {
    diner: ['🍜', 'Diner', ['The Diner served {num} bowls of {food} today.', '{who} ordered the "{n} Special" and asked for seconds.', 'A freighter crew from {from} ate everything on the menu.', 'The cook tried a new recipe with local {res}. Results: mixed.', '{who} left a very big tip at the Diner.']],
    depot: ['📦', 'Depot', ['The Depot shipped {num} crates of {res} toward {from}.', 'A cargo hauler unloaded spare parts for the whole post.', '{who} spent all morning counting boxes. Two are missing. Again.', 'The Depot is almost full. Someone ordered {num} cans of {food}.', 'A mystery crate arrived. Nobody wants to open it.']],
    hangar: ['🛩', 'Hangar', ['{num} ships docked at the Hangar today.', '{who} fixed a scout ship with tape and hope.', 'A racer from {from} set a new docking speed record.', 'The Hangar doors got stuck open during {w}.', 'An old transport limped in and the mechanics cheered when it landed.']],
    greenhouse: ['🌱', 'Greenhouse', ['The Greenhouse grew its first {plant}.', '{who} swears the {plant} hum when it\'s quiet.', 'Harvest day: {num} kilos of fresh {plant}.', 'A seed swap with travelers from {from} brought something new.', 'The tomatoes are winning. Nobody is sure what they are winning.']],
    observatory: ['🔭', 'Observatory', ['The Observatory spotted a comet heading past {from}.', '{who} stayed up all night watching the {star}.', 'Counted {num} shooting stars tonight.', 'A new nebula photo is pinned on the noticeboard.', 'Someone thinks they saw the ship from here. It was a smudge on the lens.']],
    clinic: ['🩹', 'Clinic', ['The Clinic patched up {num} travelers. Mostly sunburn.', '{who} came in with a bump from low gravity and a funny story.', 'Quiet day at the Clinic. The doctor reorganized the bandages twice.', 'A crew from {from} got their checkups before the next jump.']],
    lounge: ['🛋', 'Lounge', ['Music night at the Lounge. {who} played until sunrise.', 'Travelers from {from} told stories about {from}.', 'Someone started a chess tournament. {num} players so far.', 'The Lounge window has the best view of the {b}.', 'Movie night got cancelled when {w} knocked out the projector.']],
    radio: ['📻', 'Radio Shack', ['The Radio Shack picked up a signal from {from}: "say hi to {n}".', '{who} hosts a call-in show now. {num} callers today.', 'Static all day because of {w}.', 'Played the same song {num} times by request.']],
    workshop: ['🔧', 'Workshop', ['The Workshop built a new rover from spare parts.', '{who} invented a gadget nobody understands yet.', 'Repaired {num} broken scanners for passing ships.', 'Somebody made a statue out of {res} scraps.']],
    library: ['📚', 'Library', ['The Library got {num} new books from travelers.', '{who} fell asleep in the reading corner again.', 'A traveler from {from} donated a map of the old routes.', 'Story hour was full today.']],
    market: ['🛒', 'Market', ['Market day: traders swapped {res} for {food}.', '{who} sold souvenir snow globes of {n}.', 'Prices went up after a trader from {from} bought everything.', '{num} stalls opened this morning.']],
    bathhouse: ['♨', 'Hot Spring Bath', ['The Hot Spring Bath was packed after the long jump from {from}.', '{who} stayed in the bath for {num} minutes and came out very calm.', 'Someone left a rubber duck in the bath. It stays.', 'Steam from the bath froze into tiny crystals outside.']],
    arcade: ['🕹', 'Arcade', ['{who} beat the high score on the Arcade cabinet.', 'Arcade tournament: travelers from {from} took first place.', 'The claw machine finally gave out a prize.', '{num} coins jammed the old pinball table.']],
    inn: ['🛏', 'Inn', ['The Inn had {num} guests tonight.', '{who} checked in for one night and stayed a week.', 'A traveling crew from {from} took every room.', 'The Inn\'s guestbook is filling up with doodles of {n}.']],
  };
  const FAC_DESC = { diner: 'Hot food for tired travelers.', depot: 'Stores cargo and ships it across the sector.', hangar: 'Docking and repairs for passing ships.', greenhouse: 'Grows fresh food under glass.',
    observatory: 'Watches the sky for comets and far-off stars.', clinic: 'Patches travelers up after long jumps.', lounge: 'Music, games and stories late into the night.', radio: 'Picks up signals and runs a call-in show.',
    workshop: 'Builds and fixes anything with spare parts.', library: 'Books, old maps and a cozy reading corner.', market: 'Traders swap goods from many worlds.', bathhouse: 'Hot springs for sore explorers.',
    arcade: 'Old cabinets and fierce high-score battles.', inn: 'Beds for travelers who stay the night.' };
  const FOOD = ['noodles', 'dumplings', 'space soup', 'fried rice', 'pancakes', 'curry', 'moon pie', 'tea', 'hot cocoa', 'grilled fish', 'mystery stew', 'sticky rice'];
  const PLANT = ['glow-beans', 'blue melons', 'star lettuce', 'spiral carrots', 'purple chilies', 'moss tea leaves', 'crystal berries'];
  const TITLE = ['Captain', 'Pilot', 'Trader', 'Engineer', 'Doctor', 'Old', 'Navigator', 'Cook', 'Miner'];
  function facLog(p, k, r, worlds) {
    const pk = a => a[Math.floor(r() * a.length)];
    const nameBit = () => { let n = ''; for (let i = 0; i < 2; i++) n += pk(SYL); return n.charAt(0).toUpperCase() + n.slice(1); };
    const from = worlds.length > 1 && r() < .7 ? pk(worlds) : nameBit();
    return pk(FAC[k][2]).replace(/\{who\}/g, () => pk(TITLE) + ' ' + nameBit()).replace(/\{from\}/g, from).replace(/\{num\}/g, () => String(2 + Math.floor(r() * 40)))
      .replace(/\{food\}/g, () => pk(FOOD)).replace(/\{plant\}/g, () => pk(PLANT)).replace(/\{res\}/g, () => pk(p.res)).replace(/\{n\}/g, p.custom || p.name)
      .replace(/\{w\}/g, p.weather).replace(/\{b\}/g, p.biomes[0].toLowerCase()).replace(/\{star\}/g, p.star.startsWith('none') ? 'darkness' : p.star);
  }

  /* ---------- Deep-space events: about 1 study session in 15 ends with a little surprise. Mostly flavor;
     a few of them refill the Interplanetary Coordinator for free. ---------- */
  const EVENTS = [
    ['🛰', 'Derelict ship', 'A derelict freighter was drifting off the bow. The crew salvaged its old navigation core.', 'charge'],
    ['📦', 'Lost cargo pod', 'A lost cargo pod floated by, packed with spare Coordinator cells. Finders keepers.', 'charge'],
    ['☄', 'Comet flyby', 'A comet passed close enough to light up the whole cabin. {who} took about a hundred photos.'],
    ['📨', 'Message in a bottle', 'A sealed capsule drifted past the window. Inside, a note: "{msg}" Signed, {who}.'],
    ['🆘', 'Distress call', 'A distress call came in from {post}. False alarm: {fix}.'],
    ['🐋', 'Space whale', 'Something enormous swam past in the dark. The sensors said "unknown". The crew said "space whale".'],
    ['⚡', 'Ion storm', 'An ion storm rattled the hull for an hour. Everyone is fine. The coffee machine is not.'],
    ['🎶', 'Strange signal', 'The radio picked up a slow melody from deep space. {who} has been humming it ever since.'],
    ['🌌', 'Nebula crossing', 'The ship drifted through a glowing nebula. Nobody said a word for ten minutes.'],
    ['🛸', 'Fellow explorer', 'Passed another explorer, {who}, heading toward {world}. They waved. We waved back.'],
    ['🪨', 'Asteroid shower', 'Dodged an asteroid shower. The autopilot is very proud of itself.'],
    ['🔭', 'Supernova', 'A star exploded somewhere far away. For one night it was the brightest thing in the sky.'],
    ['🧊', 'Ice comet', 'Topped up the water tanks from a passing ice comet. Showers for everyone.'],
    ['🌠', 'Meteor storm', 'A meteor storm streaked past for hours. {who} made a wish on every single one.'],
  ];
  const BOTTLE = ['If you found this, keep going.', 'The view from here is worth the trip.', 'Anyone else out here? Say hi.', 'Took a wrong turn at the last nebula. Worth it.', 'Remember to drink water.', 'The best world is the next one.'];
  const FIX = ['someone left the Diner\'s oven on', 'a traveler locked themselves out of the Inn', 'the antenna was pointing the wrong way', 'a very loud bird sat on the transmitter', 'the Arcade high score got beaten and someone panicked'];

  /* ---------- Collectibles: 96 one-of-a-kind items scattered across the universe, each with its own rarity.
     ADD NEW ONES AT THE END OF A LIST ONLY: your collection remembers items by their place in these lists. ---------- */
  const ITEMS = {
    Common: ['Bent Spoon from a Space Diner', 'Faded Star Map', 'Cracked Helmet Visor', 'Rusty Docking Bolt', 'Compass That Points Nowhere', 'Jar of Moon Dust', 'Lost Glove (Left)', 'Spare Antenna',
      'Freeze-Dried Ice Cream', 'Smooth River Pebble', 'Old Ration Bar', 'Torn Mission Patch', 'Flickering Flashlight', 'Postcard from a Gas Giant', 'Wind-Up Robot Toy', 'Tin of Glow Paint',
      'Chipped Coffee Mug', 'Unlabeled Data Chip', 'Meteorite Fragment', 'Bag of Alien Seeds', 'Rubber Duck in a Space Suit', 'Spool of Copper Wire', 'Burned-Out Fuse', 'Souvenir Snow Globe',
      'Lucky Space Dice', 'Bottle of Recycled Water', 'Sketch of a Sunset', 'Broken Pocket Watch', 'Fossil Shell', 'Pilot\'s Logbook Page', 'Fuzzy Moss Sample', 'Old Radio Tube',
      'Vial of Sea Water', 'Dented Thermos', 'Tiny Solar Panel', 'Hand-Knitted Scarf', 'Crystal Pebble', 'Box of Mismatched Screws', 'Weathered Flag', 'Sticky Note Saying "Back in 5"'],
    Uncommon: ['Glowing Jellyfish in a Jar', 'Singing Seashell', 'Ice That Never Melts', 'Brass Telescope', 'Holographic Trading Card', 'Petrified Alien Feather', 'Music Box with No Song',
      'Map of a Hidden Cave', 'Clockwork Beetle', 'Bottled Lightning', 'Captain\'s Medal', 'Pressed Glow-Flower', 'Mirror That Shows Stars', 'Gravity-Defying Marble', 'Thread from a Comet\'s Tail',
      'Old Explorer\'s Journal', 'Carved Bone Flute', 'Self-Heating Teapot', 'Bubble That Won\'t Pop', 'Seed That Hums', 'Rainbow Quartz', 'Outlaw Wanted Poster', 'Antique Space Helmet',
      'Tiny Terrarium', 'Living Stone', 'Echo in a Box', 'The Diner\'s Secret Recipe', 'Lantern of Captured Aurora'],
    Rare: ['Fragment of a Shooting Star', 'Crown of an Outlaw King', 'Compass That Points Home', 'Ancient Alien Coin', 'Feather of a Space Whale', 'Clock That Runs Backwards', 'Map Drawn by Another Explorer',
      'Hourglass of Black Sand', 'Bell That Rings in Silence', 'Starfish Fossil the Size of a Plate', 'Dreamcatcher of Nebula Thread', 'Glass Rose from a Glass Storm', 'Golden Gear from a Lost Ship',
      'Sealed Letter from the Future', 'Moonstone Locket', 'A Robot\'s First Painting'],
    Legendary: ['Heart of a Dying Star', 'The First Explorer\'s Helmet', 'Seed of the Last Garden', 'A Piece of the Big Bang', 'Crown of Saturn\'s Rings', 'Pocket Black Hole (Stable, Probably)',
      'Song of the Space Whales', 'Key to an Unknown Door', 'Map of the Whole Galaxy', 'An Egg That Is Still Warm', 'Mirror of Another Universe', 'Dave\'s Lost Coffee Mug'],
  };
  const ITEM_RARS = ['Common', 'Uncommon', 'Rare', 'Legendary'];
  // More categories. The original 96 are "Curiosities" and keep their old ids (Rarity:index); the rest use cat:Rarity:index.
  const CATS = [['cur', 'Curiosities', 'Odds and ends from every corner of space'], ['mat', 'Materials', 'Raw stuff the universe is made of'], ['art', 'Artifacts', 'Things made by people long gone'],
    ['wpn', 'Weapon Parts', 'Pieces of things that go boom (safely disassembled)'], ['tec', 'Tech Parts', 'Machines, chips and clever leftovers'], ['spc', 'Specimens', 'Living (or once-living) samples'],
    ['rel', 'Relics', 'Holy objects of travelers and pilgrims'], ['map', 'Star Charts', 'Maps of places nobody should be able to map'],
    // these four only turn up after the matching Xenology research
    ["sig", "Signals", "Recordings of sounds nobody should be able to hear", "xen1"], ["fos", "Fossils", "Living things that kept their shape for a very long time", "xen2"], ["coin", "Coins", "Money from places that stopped needing it", "xen3"], ["ano", "Anomalies", "Things that break the rules, kept in sealed boxes", "xen4"]];
  const CAT_ITEMS = {
    sig: {"Common": ["Static from a Dead Moon", "Radio Jingle for a Closed Diner", "Weather Report from Nowhere", "Morse Code Grocery List", "Hum of a Gas Giant", "Ice Cracking on a Frozen Sea", "Someone Practicing the Trumpet", "Ten Minutes of Solar Wind"], "Uncommon": ["Whale Song from a Gas Giant", "Lullaby in an Unknown Language", "Countdown That Never Finishes", "Pulsar Played Backwards", "Applause from an Empty Stadium", "Ship Horn from 300 Years Ago"], "Rare": ["A Voice That Says Your Name", "Choir of a Thousand Antennas", "Last Broadcast of a Lost Colony", "The Seven-Note Song"], "Legendary": ["Echo of the First Star", "The Keeper's Call"]},
    fos: {"Common": ["Spiral Shell in Sandstone", "Fern Print on Slate", "Tiny Trilobite-ish Thing", "Petrified Tentacle Tip", "Three-Toed Footprint", "Stone Seed Pod", "Ancient Coral Branch", "Fossil Fish with Too Many Fins"], "Uncommon": ["Skull of a Long-Necked Swimmer", "Amber with a Glowing Bug", "Fossil Egg Cluster", "Wing Bone the Size of a Door", "Stone Jellyfish", "Slice of a Petrified Tree"], "Rare": ["Skeleton of a Sky Grazer", "Fossilized Brain (It Was Big)", "Fossil That Is Still Warm", "Imprint of a Hand Like Ours"], "Legendary": ["The First Living Cell, in Stone", "Fossil of Something Not Yet Born"]},
    coin: {"Common": ["Square Copper Coin", "Coin with a Hole in the Middle", "Plastic Arcade Token", "Wooden Trade Chit", "Bent Station Credit", "Coin Stamped with a Fish", "Ration Ticket", "Bus Fare to a Ruined City"], "Uncommon": ["Silver Coin of the Ring Kingdoms", "Glass Coin That Hums", "Outlaw Bounty Token", "Guild Founder's Medal", "Coin Minted on a Comet", "Triangular Moon Dollar"], "Rare": ["Coin Worth a Whole Planet", "Gold Coin from a Drowned Empire", "The Ferryman's Coin", "Two-Headed Coin of Fate"], "Legendary": ["The First Coin Ever Struck", "Coin That Pays for Itself"]},
    ano: {"Common": ["Rock That Falls Up", "Pebble That Is Always Cold", "Puddle with No Bottom", "Stick with Only One End", "Cube with Seven Sides", "Shadow Without an Owner", "Ticking Stone", "Sand That Spells Words"], "Uncommon": ["Jar of Slowed Time", "Mirror That Lags Behind", "Door Frame to the Same Room", "Compass That Points at You", "Feather Heavier Than Lead", "Box Bigger on the Inside"], "Rare": ["Hole in the Air (Small)", "Clock Running Backwards Forever", "Photograph of Tomorrow", "Loop of Yesterday"], "Legendary": ["A Second That Lasts an Hour", "Tear in Space (Framed)"]},
    mat: { Common: ['Scrap Iron Plate', 'Bundle of Carbon Fiber', 'Raw Copper Nugget', 'Bag of Silica Sand', 'Ice Core Sample', 'Chunk of Basalt', 'Coil of Nylon Rope', 'Tin Ingot', 'Sheet of Hull Foil', 'Jar of Sulfur Crystals'],
      Uncommon: ['Titanium Bar', 'Superconducting Wire', 'Spool of Spider Silk', 'Block of Glacier Glass', 'Cobalt Ore', 'Vial of Liquid Helium', 'Plate of Meteoric Iron'],
      Rare: ['Shard of Living Crystal', 'Ingot of Star Gold', 'Neutron Glass Pane', 'Bottle of Liquid Light'], Legendary: ['Chunk of Pure Dark Matter', 'Diamond from a Carbon World\'s Core', 'Ring of Frozen Starlight'] },
    art: { Common: ['Clay Tablet with Strange Marks', 'Carved Wooden Mask', 'Stone Arrowhead', 'Copper Bracelet', 'Painted Pottery Shard', 'Bone Comb', 'Woven Basket', 'Tiny Stone Idol', 'Bead Necklace', 'Rusted Bell'],
      Uncommon: ['Engraved Silver Cup', 'Obsidian Mirror', 'Star-Shaped Amulet', 'Bronze Astrolabe', 'Jade Figurine', 'Ceremonial Dagger (Blunt)', 'Stone That Hums When Touched'],
      Rare: ['Crown of Woven Light', 'Map Carved in Bone', 'Mask of the Twin Moons', 'Lantern That Never Goes Out'], Legendary: ['Throne Fragment of a Lost Empire', 'The Speaking Stone', 'Orrery of an Unknown System'] },
    wpn: { Common: ['Bent Blaster Barrel', 'Cracked Power Cell', 'Loose Trigger Spring', 'Scratched Scope Lens', 'Spent Plasma Cartridge', 'Torn Holster', 'Roll of Grip Tape', 'Rusty Bayonet Mount', 'Safety Switch', 'Bag of Rivets'],
      Uncommon: ['Railgun Coil', 'Shield Emitter Core', 'Targeting Chip', 'Ion Capacitor', 'Heat Sink Fin', 'Recoil Dampener', 'Outlaw\'s Custom Grip'],
      Rare: ['Plasma Lance Focus', 'Gravity Hammer Head', 'Cloaking Field Module', 'Pirate Captain\'s Cutlass'], Legendary: ['Core of a Star-Killer Cannon', 'Unbreakable Energy Blade', 'The Last Peacemaker'] },
    tec: { Common: ['Burned Circuit Board', 'Loose Microchip', 'Tangled Fiber Optic', 'Old Battery Pack', 'Cooling Fan', 'Cracked Display Panel', 'Bag of Resistors', 'Servo Motor', 'Antenna Tip', 'Worn Keyboard Key'],
      Uncommon: ['Quantum Memory Stick', 'Holo Projector Lens', 'Miniature Fusion Cell', 'Robot Arm Joint', 'Navigation Gyroscope', 'Translator Chip', 'Self-Repairing Wire'],
      Rare: ['AI Personality Core', 'Warp Coil Fragment', 'Fold-Space Beacon', 'Time-Stamped Black Box'], Legendary: ['Seed of a Dyson Sphere', 'Sentient Toolbox', 'Engine of the First Starship'] },
    spc: { Common: ['Jar of Glowing Moss', 'Dried Alien Leaf', 'Spore Pod', 'Shell of a Rock Crab', 'Feather of a Sky Lizard', 'Tooth of a Swamp Fish', 'Cactus Cutting', 'Pressed Fern', 'Mushroom Cap', 'Water Bug in Amber'],
      Uncommon: ['Egg of a Cloud Ray', 'Singing Coral Branch', 'Fruit That Tastes Like Thunder', 'Sleeping Glow Squid', 'Fur of a Snow Beast', 'Seed Bank Capsule', 'Crystal Beetle'],
      Rare: ['Skull of a Dune Leviathan', 'Living Gemstone Plant', 'Heart-Flower from a Garden World', 'Hatchling of a Void Moth'], Legendary: ['Tear of a Space Whale', 'The Oldest Tree Seed', 'Embryo of an Unknown Species'] },
    rel: { Common: ['Prayer Beads of a Pilgrim Fleet', 'Faded Banner', 'Pilgrim\'s Walking Stick', 'Candle Stub from a Temple Ship', 'Votive Coin', 'Prayer Card'],
      Uncommon: ['Reliquary Box', 'Saint\'s Compass', 'Hymn Disc', 'Pilgrim Map of Holy Comets', 'Temple Bell Clapper'],
      Rare: ['Halo of a Sun Priest', 'Book of the First Voyage', 'Chalice of the Comet Feast'], Legendary: ['The Unlit Candle', 'Relic of the Wanderer'] },
    map: { Common: ['Chart of a Local Cluster', 'Torn Nav Map', 'Asteroid Belt Survey', 'Comet Timetable', 'Moon Phase Table', 'Smuggler\'s Shortcut Sketch'],
      Uncommon: ['Chart of a Hidden Nebula', 'Pulsar Timing Table', 'Outlaw Patrol Routes', 'Map of Derelict Ships', 'Wormhole Rumor Chart'],
      Rare: ['Chart of the Galactic Rim', 'Map of a Pocket Universe', 'Route of the Lost Explorers'], Legendary: ['Chart of the Center of Everything', 'The Map That Draws Itself'] },
  };
  const catList = (c, r) => (c === 'cur' ? ITEMS[r] : (CAT_ITEMS[c] && CAT_ITEMS[c][r])) || [];
  const itemId = (c, r, i) => c === 'cur' ? r + ':' + i : c + ':' + r + ':' + i;
  const parseId = id => { const a = id.split(':'); return a.length === 2 ? { c: 'cur', r: a[0], i: +a[1] } : { c: a[0], r: a[1], i: +a[2] }; };
  const catTotal = c => ITEM_RARS.reduce((a, r) => a + catList(c, r).length, 0);
  let TECH = {}; // researched techs (set when the game starts)
  const catOpen = c => { const x = CATS.find(k => k[0] === c); return !x || !x[3] || !!TECH[x[3]]; }; // some categories need research first
  let ITEM_TOTAL = 0, ITEM_ALL = 0; const countItems = () => { ITEM_TOTAL = CATS.reduce((a, [c]) => a + (catOpen(c) ? catTotal(c) : 0), 0); ITEM_ALL = CATS.reduce((a, [c]) => a + catTotal(c), 0); }; countItems();
  function applyItems(j) { // items.json replaces the built-in lists (only lists of text count; anything else is ignored)
    if (!j || typeof j !== 'object') return;
    const take = (l, set) => { if (Array.isArray(l)) { const ok = l.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()); if (ok.length) set(ok); } };
    ITEM_RARS.forEach(r => take(j[r], ok => { ITEMS[r] = ok; })); // the old format: the Curiosities lists at the top level
    CATS.forEach(([c, name]) => { const g = j[name]; if (g && typeof g === 'object') ITEM_RARS.forEach(r => take(g[r], ok => { if (c === 'cur') ITEMS[r] = ok; else (CAT_ITEMS[c] = CAT_ITEMS[c] || {})[r] = ok; })); });
    countItems();
  }
  const ITEM_W = { normal: { Common: 55, Uncommon: 28, Rare: 13, Legendary: 4 }, better: { Common: 30, Uncommon: 38, Rare: 24, Legendary: 8 } };
  const itemName = id => { const { c, r, i } = parseId(id); return catList(c, r)[i] || '???'; };
  const itemCat = id => CATS.find(([c]) => c === parseId(id).c) || CATS[0];
  // where it was found decides what kind of thing it is: living worlds give specimens, outlaws give weapon parts...
  // Ship designs (18 x 9 pixels, facing right). h hull, s hull shade, d dark trim, c cockpit, r accent stripe
  const SHIP_DESIGNS = {
    Scout: ['.....ddd..........', '....dssdd.........', '..r.dhhhhdd.......', '.rrdhhhhhhhccd....', 'rrrdhhhhhhhcccchh.', '.rrdsssssssssssd..', '..r.dssssdd.......', '....dssdd.........', '.....ddd..........'],
    Hauler: ['..................', '.dddddddddd.......', 'rdhhhhhhhhhdd.....', 'rdhhshhshhhhccd...', 'rdhhshhshhhhcccdd.', 'rdssssssssssssd...', 'rdddddddddddd.....', '.r..r..r..........', '..................'],
    Needle: ['..................', '..................', 'r..dd.............', 'rrdhhhhhhhhhhhd...', 'rrdhhhhhhhhhhccchh', 'rrdssssssssssssd..', 'r..dd.............', '..................', '..................'],
    Saucer: ['......dddddd......', '....ddhhhhhhdd....', '...dhhhccccchhd...', '.ddhhhhhhhhhhhhdd.', 'rhhhhhhhhhhhhhhhhr', '.ddssssssssssssdd.', '...ddssssssssdd...', '.....r..r..r......', '..................'],
    Manta: ['d.................', 'dsd...............', 'dhhsd.............', '.dhhhhhhhhhdd.....', 'rrhhhhhhhhhhcccdd.', '.dsssssssssdd.....', 'dsssd.............', 'dsd...............', 'd.................'],
  };
  const HULL_COLORS = { Lilac: '#d9bdc8', White: '#ffffff', Sky: '#aee2ff', Peach: '#ffb879', Rose: '#ee8fcb', Lime: '#abdd64', Indigo: '#6d80fa', Crimson: '#ea6262' };
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); return snap([(n >> 16 & 255) * f, (n >> 8 & 255) * f, (n & 255) * f]); };
  const shipCache = new Map();
  function shipSprite(design, color, scale) { // returns a canvas with the ship drawn, palette-snapped
    const key = design + color + scale; if (shipCache.has(key)) return shipCache.get(key);
    const rows = SHIP_DESIGNS[design] || SHIP_DESIGNS.Scout, hull = HULL_COLORS[color] || HULL_COLORS.Lilac, sc = scale || 1;
    const cv = document.createElement('canvas'); cv.width = 18 * sc; cv.height = 9 * sc; const g = cv.getContext('2d');
    const rgbS = c => 'rgb(' + c.join(',') + ')';
    const map = { h: hull, s: rgbS(shade(hull, .72)), d: rgbS(shade(hull, .45)), c: '#aee2ff', r: color === 'Crimson' ? '#ffb879' : '#ea6262' };
    rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const k = row[i]; if (k !== '.') { g.fillStyle = map[k]; g.fillRect(i * sc, j * sc, sc, sc); } } });
    shipCache.set(key, cv); return cv;
  }
  function catWeights(p, kind) {
    let w;
    if (kind === 'loot') w = { wpn: 5, tec: 3, cur: 1, mat: 1, map: 1, coin: 2, ano: .5, sig: .3 };
    else if (kind === 'gift') w = { cur: 2, art: 2, rel: 2, map: 1, tec: 1, coin: 2, sig: 1, fos: .5 };
    else if (kind === 'trade') w = { cur: 1, mat: 1, art: 1, wpn: 1, tec: 1, spc: 1, rel: 1, map: 1, sig: 1, fos: 1, coin: 1, ano: 1 };
    else {
      w = { cur: 3, mat: 3, art: 1.2, wpn: .5, tec: 1, spc: .6, rel: .6, map: 1, sig: .8, fos: .4, coin: .3, ano: .4 };
      if (p) { if (p.lifeLvl) { w.spc = 1 + p.lifeLvl * .8; w.fos = 1.2 + p.lifeLvl * .2; } if (p.odd) { w.art += 1.5; w.rel += 1; w.ano = 2; } if (p.lifeLvl >= 6) { w.art += 2; w.rel += 1.5; } if (['Iron', 'Carbon', 'Crystal', 'Shattered', 'Lava'].includes(p.type)) w.mat += 2; }
      if (TECH.scan2 && p && p.lifeLvl) w.spc *= 2;
      if (TECH.scan3) { w.art += 2; w.rel += 1.5; }
    }
    Object.keys(w).forEach(k => { if (!catOpen(k)) w[k] = 0; });
    return w;
  }
  function rollItem(p, better, kind) { // pick a category, then a rarity, then any item of that rarity
    const pickW = w => { const ks = Object.keys(w).filter(k => w[k] > 0); let x = Math.random() * ks.reduce((a, k) => a + w[k], 0); for (const k of ks) { if ((x -= w[k]) < 0) return k; } return ks[0]; };
    const cw = catWeights(p, kind || (better ? 'loot' : 'survey')), w = ITEM_W[better ? 'better' : 'normal'];
    for (let tries = 0; tries < 6; tries++) {
      const c = pickW(cw), rar = pickW(w), list = catList(c, rar);
      if (!list.length) continue;
      const i = Math.floor(Math.random() * list.length);
      return { id: itemId(c, rar, i), name: list[i], rar, cat: c };
    }
    const i = Math.floor(Math.random() * ITEMS.Common.length); return { id: 'Common:' + i, name: ITEMS.Common[i], rar: 'Common', cat: 'cur' };
  }

  // the ship's satellite: a tiny pixel sprite (made once)
  let satUrl = null;
  function satSprite() {
    if (satUrl) return satUrl;
    const rows = ['....r....', '....g....', 'bb.ggg.bb', 'bbbgwgbbb', 'bb.ggg.bb', '...g.g...'], col = { b: '#3a6ad8', g: '#c8c8c8', w: '#ffffff', r: '#ff3030' };
    const cv = document.createElement('canvas'); cv.width = 9; cv.height = 6; const x = cv.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((c, i) => { if (col[c]) { x.fillStyle = col[c]; x.fillRect(i, y, 1, 1); } }));
    satUrl = cv.toDataURL(); return satUrl;
  }

  // the planet palette: every pixel of every portrait is snapped to one of these 32 colours
  const PALETTE = ['#5ba675', '#6bc96c', '#abdd64', '#fcef8d', '#ffb879', '#ea6262', '#cc425e', '#a32858', '#751756', '#390947', '#611851', '#873555', '#a6555f', '#c97373', '#f2ae99', '#ffc3f2',
    '#ee8fcb', '#d46eb3', '#873e84', '#1f102a', '#4a3052', '#7b5480', '#a6859f', '#d9bdc8', '#ffffff', '#aee2ff', '#8db7ff', '#6d80fa', '#8465ec', '#834dc4', '#7d2da0', '#4e187c'].map(h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; });
  const snapCache = new Map();
  function snap(c) { // nearest palette colour (weighted RGB distance, close to how eyes see it)
    const r = Math.max(0, Math.min(255, c[0] | 0)), g = Math.max(0, Math.min(255, c[1] | 0)), b = Math.max(0, Math.min(255, c[2] | 0)), key = (r >> 2) << 12 | (g >> 2) << 6 | (b >> 2);
    let hit = snapCache.get(key); if (hit) return hit;
    let best = PALETTE[0], bd = Infinity;
    for (const q of PALETTE) { const rm = (r + q[0]) / 2, dr = r - q[0], dg = g - q[1], db = b - q[2]; const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db; if (d < bd) { bd = d; best = q; } }
    snapCache.set(key, best); return best;
  }
  /* ---------- pixel-art planet painter (deterministic, so the same planet always looks the same) ---------- */
  const cache = new Map();
  function lookOf(p) { // worlds saved before the palette change: redo their colours from the seed (same shapes, new colours)
    const L = p.look; if (L.pv === 2) return L;
    if (L._nl) return L._nl;
    const T = TYPES[p.type]; let nl = null;
    try { const q = makePlanet(p.seed, p.num, p.lucky, 0); if (q.type === p.type) nl = Object.assign({}, L, { pal: q.look.pal, land: q.look.land, ringCol: q.look.ringCol }); } catch (e) { /* fall through */ }
    if (!nl) nl = Object.assign({}, L, { pal: T.pal.slice(), land: T.land ? T.land.slice() : L.land, ringCol: '#a6859f' });
    Object.defineProperty(L, '_nl', { value: nl, enumerable: false }); return nl;
  }
  function paint(p, size) {
    const key = p.seed + ':' + size; if (cache.has(key)) return cache.get(key);
    const S = size, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const x = cv.getContext('2d'), img = x.createImageData(S, S), L = lookOf(p), r = rng(L.noise); const sr = rng((L.noise ^ 0x51A4) >>> 0);
    // value noise
    const G = 16, grid = Array.from({ length: (G + 1) * (G + 1) }, () => r());
    const vn = (u, v) => { u = ((u % G) + G) % G; v = Math.max(0, Math.min(G - .001, v)); const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, su = fu * fu * (3 - 2 * fu), sv = fv * fv * (3 - 2 * fv); const g = (a, b) => grid[(b % (G + 1)) * (G + 1) + (a % G)]; const a = g(i, j), b2 = g(i + 1, j), c = g(i, j + 1), d = g(i + 1, j + 1); return a + (b2 - a) * su + (c - a) * sv + (a - b2 - c + d) * su * sv; };
    const fbm = (u, v) => vn(u, v) * .55 + vn(u * 2.1, v * 2.1) * .28 + vn(u * 4.3, v * 4.3) * .17;
    const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
    const pal = L.pal.map(hex), land = L.land && L.land.map(hex);
    const R0 = S * (p.rings ? .27 : .38), cx = S / 2, cy = S / 2, ringR = R0 * 1.75; // ringed planets are drawn smaller so the rings fit
    const put = (i, c0, a = 255) => { const c = snap(c0); img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = a; };
    const ringAt = (px, py, front) => { // a flat, tilted ellipse
      if (!p.rings) return null;
      const dx = px - cx, dy = py - cy, ct = Math.cos(L.tilt), st = Math.sin(L.tilt);
      const rx = dx * ct + dy * st, ry = (-dx * st + dy * ct) / .28;
      const d = Math.sqrt(rx * rx + ry * ry);
      if (d < R0 * 1.28 || d > ringR) return null;
      if (front !== (ry > 0)) return null;
      const band = Math.floor((d - R0 * 1.28) / (ringR - R0 * 1.28) * 5);
      return band === 2 ? null : (band % 2 ? .75 : 1);
    };
    const ringCol = hex(L.ringCol);
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      const i = (py * S + px) * 4, dx = (px + .5 - cx) / R0, dy = (py + .5 - cy) / R0, d2 = dx * dx + dy * dy;
      const back = ringAt(px + .5, py + .5, false);
      if (d2 > 1) { if (back) put(i, ringCol.map(c => c * back * .8)); continue; }
      const dz = Math.sqrt(1 - d2);
      const lon = Math.atan2(dx, dz) / Math.PI * G * .5 + 3, lat = dy;
      let c;
      if (L.bands) { // gas / ice giants: wavy cloud bands
        const n = fbm(lon * .6, (lat + 1) * 3) * .35 + (Math.sin((lat * 7 + fbm(lon, (lat + 1) * 4) * 2.2)) * .5 + .5) * .65;
        c = pal[Math.min(3, Math.floor(n * 4))];
      } else {
        const n = fbm(lon, (lat + 1) * 4);
        if (land) c = n > .56 ? land[n > .66 ? 1 : 0] : pal[n > .46 ? 1 : n > .38 ? 2 : 3];
        else if (L.lava) c = n > .62 ? pal[0] : n > .55 ? pal[1] : n > .4 ? pal[2] : pal[3];
        else c = pal[Math.min(3, Math.floor((1 - n) * 4.2))];
        if (L.locked) { const night = Math.max(0, Math.min(1, (dx + .2) * 1.8)); c = c.map((v, k) => v * (1 - night) + [31, 16, 42][k] * night); }
        if (!L.lava && !L.locked && Math.abs(lat) > .8 && (land || L.clouds)) c = [255, 255, 255]; // ice caps
        if (L.clouds && fbm(lon * 1.7 + 9, (lat + 1) * 6) > .62) c = [255, 255, 255];
      }
      // light from the upper left, in 4 chunky steps with a little dithering
      const lightDot = Math.max(0, -dx * .55 - dy * .45 + dz * .7);
      let shade = lightDot + ((px + py) % 2 ? .04 : -.04);
      shade = shade > .75 ? 1.12 : shade > .45 ? 1 : shade > .2 ? .72 : .45;
      if (L.lava && c === pal[0]) shade = Math.max(shade, 1);
      if (L.sparkle && sr() < .035) { c = [255, 255, 255]; shade = Math.max(shade, .9); } // glints of diamond and crystal
      put(i, c.map(v => Math.min(255, v * shade)));
      const front = ringAt(px + .5, py + .5, true); if (front) put(i, ringCol.map(v => v * front));
    }
    // rings in front of the planet's disk outside it too
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) { const i = (py * S + px) * 4; const f = ringAt(px + .5, py + .5, true); if (f && img.data[i + 3] === 0) put(i, ringCol.map(v => v * f)); }
    // dark outline
    const out = new Uint8ClampedArray(img.data);
    for (let py = 1; py < S - 1; py++) for (let px = 1; px < S - 1; px++) {
      const i = (py * S + px) * 4; if (img.data[i + 3]) continue;
      if (img.data[i + 4 + 3] || img.data[i - 4 + 3] || img.data[i + S * 4 + 3] || img.data[i - S * 4 + 3]) { out[i] = 18; out[i + 1] = 14; out[i + 2] = 35; out[i + 3] = 255; }
    }
    img.data.set(out); x.putImageData(img, 0, 0);
    const url = cv.toDataURL(); cv.width = cv.height = 0;
    cache.set(key, url); if (cache.size > 200) cache.delete(cache.keys().next().value);
    return url;
  }


  /* ===================================================================== the app ===================================================================== */
  // economy defaults; apps/solarist-economy.json (loaded by the page) overrides any of these
  const ECON = {
    incomeMultiplier: 1.3, researchCost: 1.5, session: { perStudyMinute: .8, minimum: 6, eventBonus: 20, rarityBonus: { Common: 0, Uncommon: 10, Rare: 30, Legendary: 80 } },
    engineBonusPerLevel: .03, fight: { min: 40, max: 80 }, fullCycle: { base: 50, perHullLevel: 15 }, bountyMultiplier: 1.5,
    encounters: { chance: .1, scale: 1, rareWorldMultiplier: 1.5 }, trade: { perFacilityLevel: 1, cap: 60 },
    sell: { rarity: { Common: 10, Uncommon: 25, Rare: 70, Legendary: 200 }, perHabitabilityPercent: .5, earthLike: 25, earthLikeAt: 80, perLifeLevel: 8, anomaly: 25, rings: 8, perMoon: 2, moonCap: 20, perRecord: 30 },
    distressRun: { base: 500, random: 200, bonusMin: 100, bonusMax: 250 }, tradeStation: { chance: .12, prices: { Common: 75, Uncommon: 190, Rare: 500, Legendary: 1500 }, sellRatio: .3 }, roomCost: { base: 160, growth: 1.7, maxLevel: 5 }, campaign: { base: 40, perLog: 2 }, crewCost: { base: 200, perCrew: 160 }, shipStyleCost: { color: 300, design: 800 }, moduleCost: { base: 70, growth: 1.27, maxLevel: { engine: 30, scanner: 21, lab: 14, comms: 25, hull: 30 } }, facilityCost: { base: 80, growth: 1.6, maxLevel: 10 },
    coordChips: { start: 5, base: 1500, growth: 1.25, max: 60 },
    quests: { delivery: 110, expedition: 450, expeditionSafe: 60, expeditionBold: 15, contract: 900, contractKnowledge: 250, bossBase: 700, bossPerCatch: 150 },
  };
  function mergeEcon(d, o) { // copy numbers from the JSON over the defaults, ignoring notes and anything that isn't the right type
    if (!o || typeof o !== 'object') return d;
    const out = Array.isArray(d) ? d.slice() : Object.assign({}, d);
    Object.keys(d).forEach(k => { const v = o[k]; if (v == null) return; if (typeof d[k] === 'number') { if (typeof v === 'number' && isFinite(v) && v >= 0) out[k] = v; } else if (typeof d[k] === 'object') out[k] = mergeEcon(d[k], v); });
    return out;
  }
  function mount(root, hooks, econ, items, camp) {
    const CAMP = camp && Array.isArray(camp.logs) && camp.logs.length ? camp : null;
    applyItems(items);
    const E = mergeEcon(ECON, econ);
    hooks = hooks || {};
    const el = (tag, attrs, ...kids) => {
      const e = document.createElement(tag);
      for (const [k, v] of Object.entries(attrs || {})) { if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); }
      for (const k of kids.flat()) { if (k == null || k === false) continue; e.append(k.nodeType ? k : document.createTextNode(String(k))); }
      return e;
    };
    const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

    /* ---------- saved state (settings, stats and a running timer carry over from Archivist) ---------- */
    let S = { found: [], tuned: 0, mission: 0, events: [], fc: { n: 0, broken: false }, total: 0, minutes: 0, day: today(), todayN: 0, cycle: 0, set: { focus: 25, short: 5, long: 15, every: 4 }, run: null };
    try {
      let s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!s) { const old = JSON.parse(localStorage.getItem(OLD_KEY) || 'null'); if (old) { s = { total: old.total, minutes: old.minutes, day: old.day, todayN: old.todayN, cycle: old.cycle, set: old.set, run: old.run, found: [] }; } }
      if (s) S = Object.assign(S, s, { set: Object.assign(S.set, s.set || {}), found: Array.isArray(s.found) ? s.found : [] });
      localStorage.removeItem(OLD_KEY);
    } catch (e) {}
    // a world the old probe settled on becomes a Listening Post that has already sent its deep-scan findings
    S.found.forEach(({ p }) => {
      if (p.deep && !p.post) {
        const d = p.deep, at = d.at || Date.now(), reports = [{ k: 'core', t: 'Core scan complete: ' + d.core.charAt(0).toLowerCase() + d.core.slice(1) + '.', at, day: 1 }];
        if (d.species) reports.push({ k: 'species', t: 'Native species identified and named: the ' + d.species + '.', at, day: 1 });
        if (d.oddX) reports.push({ k: 'odd', t: 'Anomaly studied. The ' + p.odd.replace(/^(a|an|the) /, '') + ' is ' + d.oddX + '.', at, day: 1 });
        p.post = { built: at, reports, core: d.core, species: d.species, oddX: d.oddX };
      }
      delete p.deep; delete p.probed; delete p.boosted;
    });
    if (S.probe) { if (!S.tuned) S.tuned = S.probe.num; delete S.probe; }
    S.found.forEach(({ p }) => { if (!p.x) p.x = makeExtra(p); }); // worlds found before the extended survey existed
    let wiping = false;
    const save = () => { if (wiping) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
    save();
    const rollDay = () => { if (S.day !== today()) { S.day = today(); S.todayN = 0; } };
    rollDay();

    let mode = (S.run && S.run.mode) || 'focus';
    let running = false, endAt = 0, left = 0, tickT = 0;
    const length = m => S.set[m] * 60000;
    left = (S.run && S.run.left) || length(mode);
    const byNum = n => S.found.find(f => f.p.num === n);
    const nm = p => p.custom || p.name;
    const tunedP = () => { const f = S.tuned && byNum(S.tuned); return f && f.p.post ? f.p : null; };
    // the Build mission is a "job": a new Listening Post, an upgrade to a Travelers' Post, or a facility at one
    if (S.mission > 0 && !S.job) S.job = { k: 'post', num: S.mission };
    const hasFac = (p, k) => !!(p.post && p.post.tp && p.post.tp.fac.some(x => x.k === k));
    function building() {
      if (!(S.mission > 0) || !S.job) return null;
      if (S.job.k === 'room') return ROOMS[S.job.fac] && !roomLv(S.job.fac) ? { k: 'room', fac: S.job.fac, p: null, num: 0 } : null;
      const j = S.job, f = byNum(j.num); if (!f) return null; const p = f.p;
      if (j.k === 'post' && !p.post) return { k: 'post', p };
      if (j.k === 'upgrade' && p.post && !p.post.tp) return { k: 'upgrade', p };
      if (j.k === 'add' && p.post && p.post.tp && FAC[j.fac] && !hasFac(p, j.fac)) return { k: 'add', p, fac: j.fac };
      return null;
    }
    const jobText = j => j.k === 'room' ? 'Building the ' + ROOMS[j.fac][1] + ' on your ship' : j.k === 'post' ? 'Building a Listening Post on ' + nm(j.p) : j.k === 'upgrade' ? 'Upgrading ' + nm(j.p) + ' to a Travelers\' Post' : 'Building a ' + FAC[j.fac][1] + ' at ' + nm(j.p);
    const jobKey = j => j.k + ':' + (j.p ? j.p.num : j.num) + ':' + (j.fac || '');
    function buildOptions() { // every job you could do next, grouped
      const out = { Facilities: [], Upgrades: [], 'New Listening Posts': [] };
      S.found.slice().reverse().forEach(({ p }) => {
        if (held(p)) return;
        if (!p.post) out['New Listening Posts'].push({ k: 'post', num: p.num, label: '🗼 Listening Post on ' + nm(p) + ' (' + pad(p.num) + ')' });
        else if (!p.post.tp) out.Upgrades.push({ k: 'upgrade', num: p.num, label: '🏘 Upgrade ' + nm(p) + ' to a Travelers\' Post' });
        else Object.keys(FAC).filter(k => !hasFac(p, k)).forEach(k => out.Facilities.push({ k: 'add', num: p.num, fac: k, label: FAC[k][0] + ' ' + FAC[k][1] + ' at ' + nm(p) }));
      });
      return out;
    }
    const anyBuild = () => { const o = buildOptions(); return Object.values(o).some(a => a.length); };
    function fillBuildSel(selEl, skip) {
      const o = buildOptions();
      selEl.replaceChildren(...Object.entries(o).filter(([g, a]) => a.length && g !== skip).map(([g, a]) => el('optgroup', { label: g }, a.slice(0, 300).map(j => el('option', { value: j.k + ':' + j.num + ':' + (j.fac || '') }, j.label)))));
    }
    function setJob(key) { const [k, n, fac] = key.split(':'); S.mission = 1; S.job = { k, num: +n, fac: fac || undefined }; save(); hint.textContent = ''; draw(); }
    // Interplanetary Coordinator: spend one study session charging it, and your next trip is a lucky one (one charge, no stacking)
    const charging = () => S.mission === -1 && !S.coord;
    // where the ship is right now: the last world you reached. Discover surveys it for collectibles.
    if (!S.items) S.items = {};
    if (S.at == null && S.found.length) S.at = S.found[S.found.length - 1].p.num;
    if (!S.nextNum) S.nextNum = S.found.reduce((m, f) => Math.max(m, f.p.num), 0) + 1; // numbers keep counting up even after selling
    if (!S.sold) S.sold = { n: 0, dust: 0, ly: 0 };
    if (S.txSeen == null) S.txSeen = Date.now();
    if (!S.cnt) { // lifetime counters for the Stats page, seeded from what's already in the save
      const key = t => { const x = new Date(t); return x.getFullYear() + '-' + x.getMonth() + '-' + x.getDate(); };
      S.cnt = { rar: {}, lucky: 0, outlaws: 0, enc: 0, ev: (S.events || []).filter(e => e.ic !== '⚔').length, fc: 0, charge: 0, days: new Set(S.found.map(f => key(f.at))).size || (S.total ? 1 : 0), hiDist: 0 };
      if (S.found.some(f => key(f.at) === key(Date.now()))) S.cnt.lastDay = today();
      S.found.forEach(({ p }) => { S.cnt.rar[p.rarity] = (S.cnt.rar[p.rarity] || 0) + 1; if (p.lucky) S.cnt.lucky++; if (p.outlaw) S.cnt.outlaws++; if (p.enc) S.cnt.enc++; });
    }
    const atP = () => { const f = S.at && byNum(S.at); return f ? f.p : null; };
    if (!S.camp) S.camp = { n: 0 };
    if (!Array.isArray(S.camp.at)) S.camp.at = [];
    { const base = (S.found[0] && S.found[0].at) || 1; for (let i = 0; i < S.camp.n; i++) if (!S.camp.at[i]) S.camp.at[i] = base + i; }
    const campDone = () => !CAMP || S.camp.n >= CAMP.logs.length;
    const campaigning = () => S.mission === -3 && !campDone() && !S.dr;
    const discovering = () => S.mission === -2 && !!atP() && !(atP().outlaw && !atP().outlaw.cleared);
    // the old material × object collection becomes the same number of new items, of the same rarity
    const OLD_FORM_R = { Shard: 'Common', Nugget: 'Common', Coin: 'Common', Marble: 'Common', Dice: 'Common', Ring: 'Uncommon', Gear: 'Uncommon', Key: 'Uncommon', Bell: 'Uncommon', Arrowhead: 'Uncommon', Lens: 'Rare', Locket: 'Rare', Compass: 'Rare', Figurine: 'Rare', Idol: 'Legendary', 'Music Box': 'Legendary' };
    Object.keys(S.items).filter(k => k.includes('|')).forEach(k => {
      const old = S.items[k], rar = OLD_FORM_R[k.split('|')[1]] || 'Common'; let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const id = rar + ':' + (h % ITEMS[rar].length); delete S.items[k];
      S.items[id] = S.items[id] ? Object.assign(S.items[id], { n: S.items[id].n + old.n }) : old;
    });
    function gainItem(it, fromP) {
      const k = it.id, cur = S.items[k];
      S.items[k] = cur ? Object.assign(cur, { n: cur.n + 1 }) : { n: 1, at: Date.now(), from: fromP ? fromP.num : 0 };
      return !cur; // true = new to the collection
    }
    const itemCount = () => Object.keys(S.items).filter(k => itemName(k) !== '???').length;
    const posts = () => S.found.filter(f => f.p.post);
    // Outlaws: some new worlds are held by a gang. While one is, Explore turns into Fight: one study session drives them out.
    const OUTLAW_CHANCE = 1 / 8;
    const GANG_A = ['Rust', 'Void', 'Red Comet', 'Dust', 'Iron', 'Grinning', 'Black Sun', 'Scrap', 'Howling', 'Neon'], GANG_B = ['Jackals', 'Raiders', 'Vultures', 'Syndicate', 'Rats', 'Wolves', 'Pirates', 'Crows', 'Gang', 'Marauders'];
    const FIGHT = ['{G} put up a fight, but the crew drove them off the {b}.', 'A long standoff over the {b}. {G} blinked first and fled.', '{G} tried an ambush in the {b}. It did not go well for them.', 'After a tense chase through the {b}, {g} gave up and jumped away.', '{G} surrendered once the ship\'s floodlights hit their camp in the {b}.'];
    // Arrival encounters: about 1 trip in 10, something near the new world pays out a little stardust. {p} = the world's name.
    const ENC_CHANCE = E.encounters.chance;
    const ENCOUNTERS = [
      ['🔬', 'Intergalactic Research Station Nearby!', 'You settled near an Intergalactic Research Station, reported your findings on {p} and traded a few spare parts.', 40, 90],
      ['🐫', 'Trading Caravan Passing By!', 'A long caravan of cargo haulers drifted past {p}. You swapped star charts for a crate of supplies.', 30, 70],
      ['⛏', 'Abandoned Mining Rig!', 'An old mining rig was still parked in orbit around {p}. Its hoppers weren\'t quite empty.', 50, 110],
      ['🍜', 'Space Diner in Orbit!', 'A floating diner circles {p}. The cook paid the crew to review the soup. (It was fine.)', 20, 50],
      ['🗺', 'Cartographers\' Guild Outpost!', 'The Guild bought your survey of {p} for their next atlas edition.', 40, 100],
      ['☄', 'Comet Tail Harvest!', 'A comet swept past {p} just as you arrived. The crew scooped rare ice and metals straight out of its tail.', 30, 80],
      ['🛰', 'Derelict Satellite Salvaged!', 'A dead satellite was tumbling around {p}. Its solar panels sold for a decent price.', 30, 70],
      ['🎥', 'Film Crew on Location!', 'A film crew is shooting a space opera on {p}. They paid for the use of your ship as a background prop.', 40, 90],
      ['🙏', 'Pilgrim Fleet Blessing!', 'A fleet of pilgrims on their way to {p} shared supplies and wished the crew safe travels.', 20, 60],
      ['📦', 'Lost Cargo Pod!', 'A drifting cargo pod near {p} still had its delivery fee attached. Finders keepers.', 30, 80],
      ['🏛', 'Museum Curator Visit!', 'A museum curator bought your first photos of {p} for a new exhibit.', 40, 100],
      ['🎟', 'Space Lottery Ticket!', 'A ticket stuck to the hull since three jumps ago turned out to be a winner. Small prize, but a prize.', 20, 120],
      ['📮', 'Postal Drone Delivery!', 'A postal drone caught up with the ship near {p} with a refund from a very old order.', 20, 50],
      ['🧪', 'Scientists Rent Your Sensors!', 'A science team stuck near {p} with broken gear rented your scanners for a day.', 40, 90],
      ['🌋', 'Mineral Geyser!', 'One of {p}\'s moons vents glittering dust every few hours. The crew filled every container on board.', 50, 120],
      ['🤝', 'Friendly Smugglers!', 'A smuggler crew near {p} paid well for a "no questions asked" fuel top-up.', 30, 90],
      ['🎓', 'Academy Field Trip!', 'A class of cadets on a field trip to {p} paid for a tour of the ship.', 20, 60],
      ['📡', 'Signal Bounty!', 'The signal you picked up near {p} matched an old bounty notice. Someone had been looking for it.', 40, 100],
      ['🏪', 'Wandering Market!', 'A wandering market set up its stalls in orbit around {p}. You sold off the junk from the cargo bay.', 30, 70],
      ['⚙', 'Mining Guild Finder\'s Fee!', 'The Mining Guild paid a finder\'s fee for the resources you charted on {p}.', 40, 110],
    ];
    let encGot = null, traderNew = null;
    const heldP = () => { const f = S.outlaw && byNum(S.outlaw); return f && f.p.outlaw && !f.p.outlaw.cleared ? f.p : null; };
    const held = p => !!(p.outlaw && !p.outlaw.cleared);
    if (!S.events) S.events = []; if (!S.fc) S.fc = { n: 0, broken: false };
    function rollEvent(force) {
      if (!force && Math.random() >= evChance(lvl('comms')) + chipP('storm', chipAmp())) return null;
      const pk = a => a[Math.floor(Math.random() * a.length)];
      const nameBit = () => { let n = ''; for (let i = 0; i < 2; i++) n += pk(SYL); return n.charAt(0).toUpperCase() + n.slice(1); };
      const pl = posts(); const pool = EVENTS.filter(e => e[1] !== 'Distress call' || pl.length);
      const [ic, title, tpl, reward] = pk(pool);
      let t = tpl.replace('{who}', pk(TITLE) + ' ' + nameBit()).replace('{msg}', pk(BOTTLE)).replace('{fix}', pk(FIX))
        .replace('{post}', pl.length ? nm(pk(pl).p) : 'nowhere').replace('{world}', S.found.length ? nm(pk(S.found).p) : nameBit());
      let got = null;
      if (reward === 'charge') { if (!S.coord) { S.coord = true; got = '🧭 The Interplanetary Coordinator is charged!'; } else t += ' (The Coordinator was already full.)'; }
      const ev = { ic, title, t, got, at: Date.now() };
      pushEv(ev); S.cnt.ev++;
      return ev;
    }
    /* ---------- Progression: Stardust (earned every study session), ship modules and facility levels to spend it on,
       growing Travelers' Posts, rotating bounties and personal records. None of it ever runs out. ---------- */
    if (S.dust == null) S.dust = 0; if (S.dustTotal == null) S.dustTotal = S.dust;
    if (!S.mods) S.mods = {}; if (!S.bounties) S.bounties = []; if (!S.rec) S.rec = {}; if (!S.bDone) S.bDone = 0;
    const lvl = k => S.mods[k] || 1;
    // Research: spend Knowledge points (you earn one for every point of Knowledge) on techs with real effects
    if (!S.tech) S.tech = {}; TECH = S.tech; countItems();
    if (!S.slog) S.slog = {}; // Ship Logs unlocked by research, by id
    let SEEN_T = null; // titles of arrival encounters and deep-space events, counted for the side challenges
    const pushEv = e => { if (!SEEN_T) SEEN_T = new Set(ENCOUNTERS.map(x => x[1]).concat(EVENTS.map(x => x[1]))); if (SEEN_T.has(e.title)) { S.cnt.seen = S.cnt.seen || {}; S.cnt.seen[e.title] = (S.cnt.seen[e.title] || 0) + 1; } S.events.push(e); if (S.events.length > 800) S.events.splice(0, S.events.length - 800); };
    if (S.kp == null) S.kp = S.kn || 0;
    const hasT = id => !!S.tech[id];
    // Research: [id, name, base cost, what it does, what it unlocks]. Costs are base x researchCost from economy.json.
    const RESEARCH = [
      ['Survey', [['scan1', 'Deep Scanners', 40, 'Surveys bring back a second collectible more often (55% instead of 30%).'], ['scan2', 'Xenobiology', 150, 'Living worlds give twice as many specimens, and every survey teaches +10 Knowledge.'], ['scan3', 'Archaeology', 320, 'Artifacts and relics turn up far more often, and one survey in three digs up rarer things.'],
        ['scan4', 'Core Sampling', 560, 'Surveys teach +15 more Knowledge, and one in five brings back an extra collectible.', { logs: ['s1'] }]]],
      ['Navigation', [['nav1', 'Star Charting', 40, 'Arrival encounters happen more often (+5 percentage points).'], ['nav2', 'Coordinator Tuning', 180, 'Charging the Interplanetary Coordinator also pays 40 resources.'], ['nav3', 'Signal Triangulation', 320, 'Trade Stations show up twice as often.'],
        ['nav4', 'Stellar Cartography', 600, 'Reveals the Star medals: find a world around every kind of star.', { logs: ['n1'] }]]],
      ['Economy', [['eco1', 'Guild Contacts', 50, 'The Cartographers\' Guild pays 15% more for worlds you sell.'], ['eco2', 'Trade Routes', 200, 'Travelers\' Posts pay 50% more trade, and the trade cap goes up by 40.'], ['eco3', 'Master Builders', 400, 'Facility upgrades cost 15% less.'],
        ['eco4', 'Collector\'s License', 580, 'Trade Stations pay 25% more for your spares.', { logs: ['e1'] }]]],
      ['Ship', [['shp1', 'Efficient Engines', 50, 'Every study session pays 10% more resources.'], ['shp2', 'Reinforced Hull', 220, 'Driving out outlaws pays 50% more.'], ['shp3', 'Long-Range Comms', 350, 'Deep-space events happen 50% more often.'],
        ['shp4', 'Black Box Decoder', 640, 'Every Meridian log pays 25% more resources.', { logs: ['k1'] }]]],
      ['Xenology', [['xen1', 'Signal Recording', 80, 'Your antennas start catching old broadcasts on every survey.', { cat: 'sig', logs: ['x1'] }], ['xen2', 'Paleontology', 240, 'Surveys can dig up the remains of ancient life, especially on living worlds.', { cat: 'fos', logs: ['x2'] }],
        ['xen3', 'Numismatics', 400, 'Traders, outlaws and grateful strangers start carrying old money.', { cat: 'coin', logs: ['x3'] }], ['xen4', 'Anomaly Containment', 700, 'Strange worlds give up their strangest things.', { cat: 'ano', logs: ['x4'] }]]],
      ['Archives', [['arc1', 'Guild Records', 60, 'Open the Cartographers\' Guild archive.', { logs: ['g1', 'g2'] }], ['arc2', 'Outlaw Dossiers', 180, 'What the Guild knows about the gangs.', { logs: ['o1', 'o2'] }], ['arc3', 'Coordinator Schematics', 320, 'What is actually inside the lucky box.', { logs: ['c1', 'c2'] }],
        ['arc4', 'Founders\' Tapes', 520, 'Recordings from the people who built the first Listening Post.', { logs: ['f1', 'f2'] }], ['arc5', 'The Blank Page', 800, 'The last file in the archive.', { logs: ['b1'] }]]],
    ];
    const SHIP_LOGS = { // [title, text]. {ship} becomes your ship's name
      g1: ['Charter of the Cartographers\' Guild', 'Article One: whoever finds a world may name it. Article Two: whoever names it must write down what they saw, honestly, even if it was boring. Article Three: especially if it was boring. Boring worlds are where people end up living.'],
      g2: ['Guild Memo, Survey Department', 'Reminder to all surveyors: "looks fine" is not a planetary description. Neither is "rock". We received four hundred reports this quarter that just say "rock". One of them was about a gas giant. Please try harder.'],
      o1: ['Dossier: Where Outlaws Come From', 'Most gangs out here started as stranded crews. A ship breaks down, nobody comes, and after a few years you stop waiting for the rules to arrive. That doesn\'t make them right. It does explain why they\'re so angry about it.'],
      o2: ['Dossier: The Code', 'Even outlaws have rules. No raiding a Travelers\' Post on market day. No touching medical supplies. Always leave a ship enough fuel to get home. Gangs that break the code don\'t last long. The other gangs see to that.'],
      c1: ['How the Coordinator Works', 'Nobody fully knows. The Coordinator listens to the faint pull of every world nearby and points at the one that pulls back hardest. The manual calls this "gravitational intuition". The engineers call it "the lucky box".'],
      c2: ['Coordinator, Maker\'s Note', 'Scratched inside the casing, where only a repair crew would ever look: "If it ever points somewhere strange, follow it. It isn\'t broken. It found someone who needs you." No signature. Just seven little notches in a row.'],
      f1: ['Founders\' Tape 1: The First Post', 'We built the first Listening Post out of a cargo pod and a radio from a junkyard. It caught exactly one message in its first year. It was a wrong number. We were so happy we cried.'],
      f2: ['Founders\' Tape 2: Why We Listen', 'People ask why we put ears on every world. It\'s simple. Space is big and quiet, and the worst thing that can happen out here is to call for help and have nobody hear it. So we hear it. All of it. Even the wrong numbers.'],
      b1: ['The Blank Page', 'The last file in the archive is empty except for one line: "This page is for whoever comes next. Write down what you saw. Honestly. Even if it was boring." Below it, someone has started a list of ships. The {ship} is already on it.'],
      s1: ['Field Notes: What\'s Underneath', 'Every world has a heartbeat if you drill deep enough. Iron worlds thud, slow and heavy. Ocean worlds slosh. Crystal worlds ring like a bell somebody struck a million years ago and nobody ever stopped.'],
      n1: ['The Edge of the Map', 'Every chart ends somewhere. Past the last line, old sea maps used to draw monsters. Ours just say "Quiet Zone". A few ships went in to see what was there. The ones that came back never mention monsters. They talk about a light.'],
      e1: ['License Terms, Fine Print', 'The holder may buy, sell and trade curiosities of any origin, provided they do not sell anything that is still alive, still ticking, or still politely asking to be taken home.'],
      k1: ['Black Box: Meridian, Partial', 'Decoded fragment, badly damaged: "...day 412... five crew... coffee supply..." The rest of the recording is a song. Seven notes, played over and over, slower each time, like someone humming themselves to sleep.'],
      x1: ['Listening Notes', 'Space isn\'t silent. It\'s just far apart. Every radio show, every engine, every lullaby anyone ever broadcast is still out there, getting quieter forever. With the right gear you can catch some of them on the way past.'],
      x2: ['On Fossils', 'A fossil is a living thing that kept a promise: it stayed. Long after the rest of its world forgot it, it held its shape, waiting for somebody to come along and say "oh, there you are".'],
      x3: ['A Short History of Money', 'Every civilization invents money eventually. Most invent it twice: once to trade, and once more after the first kind falls apart. The coins that survive say a lot about what people thought was worth keeping.'],
      x4: ['Containment Protocol', 'Anomalies must be kept in a sealed box, clearly labeled, and never, under any circumstances, observed on a Monday. Nobody remembers why. The rule stays. Nobody has volunteered to find out.'],
    };
    const RC = typeof E.researchCost === 'number' ? E.researchCost : 1.5;
    const rcost = n => Math.max(5, Math.round(n[2] * RC / 5) * 5);
    const RES_ALL = RESEARCH.flatMap(([, list]) => list);
    const catName = c => (CATS.find(x => x[0] === c) || [, c])[1];
    const slogText = t => t.replace('{ship}', S.ship && S.ship.name ? S.ship.name : 'your ship');
    function doResearch(id) {
      const br = RESEARCH.find(([, l]) => l.some(n => n[0] === id)); if (!br || hasT(id)) return;
      const list = br[1], i = list.findIndex(n => n[0] === id), node = list[i], prev = list[i - 1], cost = rcost(node);
      if (prev && !hasT(prev[0])) return;
      if (S.kp < cost) return;
      S.kp -= cost; S.tech[id] = Date.now(); award(25, 0); shopXP(0);
      const un = node[4] || {}, bits = [];
      if (un.cat) { countItems(); bits.push('new collectibles (' + catName(un.cat) + ')'); }
      if (un.logs) { un.logs.forEach(k => { S.slog[k] = Date.now(); }); bits.push(un.logs.length + ' Ship Log' + (un.logs.length > 1 ? 's' : '')); }
      const md = ACH.filter(a => a.req === id).length; if (md) bits.push(md + ' new medal' + (md > 1 ? 's' : ''));
      const t = node[3] + (bits.length ? ' Unlocked: ' + bits.join(', ') + '.' : '');
      pushEv({ c: 'res', ic: '🔬', title: 'Research complete: ' + node[1], t, at: Date.now() });
      hint.textContent = 'Research complete: ' + node[1] + '. ' + t;
      save(); draw();
    }
    const evChance = l => Math.min(.3, (1 / 15 + (l - 1) * .005) * (hasT('shp3') ? 1.5 : 1));
    const MODS = {
      engine: ['🚀', 'Engine', l => '+' + Math.round((l - 1) * E.engineBonusPerLevel * 100) + '%', 'resources from every session'],
      scanner: ['📡', 'Scanner', l => '+' + Math.min(20, l - 1) + '%', 'chance of an anomaly on new worlds'],
      lab: ['🧪', 'Lab', l => Math.min(50, (l - 1) * 4) + '%', 'chance of a bonus transmission from the tuned post'],
      comms: ['📻', 'Comms', l => '1 in ' + Math.round(1 / evChance(l)), 'sessions has a deep-space event'],
      hull: ['🛡', 'Hull', l => '+' + Math.round((E.fullCycle.base + (l - 1) * E.fullCycle.perHullLevel) * E.incomeMultiplier) + ' ✦', 'for every Full Cycle'],
    };
    // ---------- your ship: rooms (built with a study session, upgraded with resources), crew, and its look ----------
    const ROOMS = {
      quarters: ['🛏', 'Crew Quarters', 'Two bunks per level, so you can recruit crew'],
      galley: ['🍳', 'Galley', 'Good food: +5% resources from every session per level'],
      lab: ['🧪', 'Science Lab', '+4 Knowledge from every session per level'],
      workshop: ['🔧', 'Workshop', 'Ship module upgrades cost 5% less per level'],
      deck: ['🔭', 'Observation Deck', 'Arrival encounters 2 percentage points more likely per level'],
      hold: ['📦', 'Cargo Hold', 'Trade Stations stock one more item per level, and pay 5% more for spares'],
      medbay: ['🩹', 'Med Bay', 'Distress Runs pay 5% more per level'],
    };
    if (!S.rooms) S.rooms = {}; if (!S.crew) S.crew = []; if (!S.ship) S.ship = { name: 'The Lantern', color: 'Lilac', design: 'Scout', colors: ['Lilac'], designs: ['Scout'] };
    const roomLv = k => S.rooms[k] || 0, ROOM_MAX = Math.max(1, Math.round(E.roomCost.maxLevel));
    const roomCost = lv => Math.round(E.roomCost.base * Math.pow(E.roomCost.growth, lv - 1)); // lv = level you upgrade to
    const bunks = () => roomLv('quarters') * 2;
    function upgradeRoom(k) { const lv = roomLv(k), c = roomCost(lv + 1); if (!lv || lv >= ROOM_MAX || S.dust < c) return; S.dust -= c; S.rooms[k] = lv + 1; shopXP(12); save(); draw(); }
    const ROLES = {
      Engineer: ['🔧', '+8 resources every session', ['{n} rewired the coffee machine. It now makes tea, which is worse.', '{n} spent the session inside an engine panel and came out humming.', '{n} found one loose bolt in the reactor housing and kept it as a lucky charm.', '{n} tuned the thrusters by ear. Nobody knows how.']],
      Cook: ['🍳', '+6 XP every session', ['{n} made soup out of whatever was left. Everyone asked for seconds.', '{n} burned the toast on purpose. "Character," they said.', '{n} grew basil in a helmet. The galley smells amazing.', '{n} held a tasting of mystery sauces. Two crew members are still thinking about sauce #3.']],
      Scientist: ['🔬', '+6 Knowledge every session', ['{n} filled three whiteboards with equations and then erased them, satisfied.', '{n} named a microbe after the ship\'s cat. The ship has no cat.', '{n} spent the session staring at the planet through a spectrometer.', '{n} wrote a paper titled "Probably Not Aliens: A Study".']],
      Pilot: ['🧑‍✈️', '+5 resources and +4 XP every session', ['{n} flew the whole stretch with one hand and a sandwich in the other.', '{n} found a shortcut through an asteroid field. The rest of the crew screamed politely.', '{n} practiced barrel rolls in the simulator for an hour.', '{n} insists the ship pulls slightly to the left.']],
      Scout: ['🛰', 'Arrival encounters 3 points more likely', ['{n} spotted something shiny on the scanners and won\'t stop talking about it.', '{n} mapped three nearby comets just for fun.', '{n} kept watch at the window the whole session. Saw a lot of space.', '{n} marked a "probably interesting" spot on the chart.']],
      Trader: ['💰', 'Trade Station prices 10% lower', ['{n} haggled with the vending machine and won.', '{n} reorganized the cargo hold by resale value.', '{n} sold a story about the last planet to a passing freighter.', '{n} practiced their "I\'m walking away" face in the mirror.']],
      Medic: ['🩹', 'Distress Runs pay 10% more', ['{n} ran a check-up on everyone. Prescription: more sleep.', '{n} reorganized the Med Bay by color.', '{n} patched up a crew member who lost a fight with a door.', '{n} taught a first-aid class. Attendance was mandatory and cookies were provided.']],
      Storyteller: ['📖', '+4 Knowledge and +3 XP every session', ['{n} told the story of the first explorer during dinner. Nobody moved.', '{n} wrote a song about the last outlaw fight. It has nine verses.', '{n} read old transmissions aloud with dramatic voices.', '{n} started a book club. The book is the ship\'s manual.']],
    };
    const CREW_FIRST = ['Ines', 'Tomo', 'Ruth', 'Oskar', 'Mira', 'Juno', 'Sol', 'Kit', 'Ada', 'Bram', 'Lio', 'Noor', 'Pim', 'Vera', 'Dex', 'Haru', 'Zia', 'Otto', 'Wen', 'Esme', 'Rafi', 'Yuki', 'Bo', 'Cass'];
    const CREW_LAST = ['Varga', 'Okafor', 'Lindqvist', 'Moreau', 'Tanaka', 'Reyes', 'Kowalski', 'Achebe', 'Haddad', 'Novak', 'Sato', 'Brandt', 'Quinn', 'Ferro', 'Ishii', 'Dunmore'];
    const TRAITS = ['hums while working', 'is afraid of comets', 'collects rocks from every world', 'never takes off their jacket', 'talks to the ship', 'keeps a plant named Gerald', 'can\'t sleep without the engine noise', 'writes letters nobody will read', 'laughs at their own jokes first', 'has a different hat every day', 'is very good at cards', 'claims to have been born on a comet'];
    const crewCost = () => Math.round(E.crewCost.base + E.crewCost.perCrew * S.crew.length);
    function crewPool() { // three people looking for work, refreshed every day
      if (S.crewPool && S.crewPool.day === today()) return S.crewPool.list;
      const pk = a => a[Math.floor(Math.random() * a.length)], roles = Object.keys(ROLES).sort(() => Math.random() - .5);
      S.crewPool = { day: today(), list: roles.slice(0, 3).map(role => ({ name: pk(CREW_FIRST) + ' ' + pk(CREW_LAST), role, trait: pk(TRAITS) })) }; save();
      return S.crewPool.list;
    }
    function recruit(i) { const c = crewPool()[i], cost = crewCost(); if (!c || S.crew.length >= bunks() || S.dust < cost) return; S.dust -= cost; S.crew.push(Object.assign({ joined: Date.now() }, c)); S.crewPool.list.splice(i, 1);
      pushEv({ ic: ROLES[c.role][0], title: c.name + ' joined the crew', t: c.name + ' (' + c.role.toLowerCase() + ') ' + c.trait + '.', at: Date.now() }); shopXP(20); save(); draw(); }
    function dismiss(i) { const c = S.crew[i]; if (!c) return; S.crew.splice(i, 1); S.cnt.fired = (S.cnt.fired || 0) + 1; pushEv({ ic: '👋', title: c.name + ' left the crew', t: 'They\'ll find another ship. Probably a worse one.', at: Date.now() }); save(); draw(); }
    const crewN = role => S.crew.filter(c => c.role === role).length;
    function shipActivity(reps) { // what the crew got up to this session, with their small bonuses
      if (!S.crew.length) return;
      const pk = a => a[Math.floor(Math.random() * a.length)];
      let res = crewN('Engineer') * 8 + crewN('Pilot') * 5, xp = crewN('Cook') * 6 + crewN('Pilot') * 4 + crewN('Storyteller') * 3, kn = crewN('Scientist') * 6 + crewN('Storyteller') * 4;
      if (res) addDust(res); award(xp, kn);
      const who = S.crew.slice().sort(() => Math.random() - .5).slice(0, S.crew.length > 2 ? 2 : 1);
      who.forEach(c => { const t = pk(ROLES[c.role][2]).replace('{n}', c.name.split(' ')[0]); reps.push({ ev: { battle: true, ic: ROLES[c.role][0], title: 'Ship activity', t } }); pushEv({ ic: ROLES[c.role][0], title: 'Ship activity: ' + c.name, t, at: Date.now() }); });
    }
    function buyStyle(kind, v) { const cost = kind === 'color' ? E.shipStyleCost.color : E.shipStyleCost.design, list = kind === 'color' ? S.ship.colors : S.ship.designs;
      if (!list.includes(v)) { if (S.dust < cost) return; S.dust -= cost; list.push(v); shopXP(10); }
      S.ship[kind] = v; save(); draw(); }
    const modCost = k => Math.round(E.moduleCost.base * Math.pow(E.moduleCost.growth, lvl(k) - 1) * (1 - .05 * roomLv('workshop')));
    const facCost = lv => Math.round(E.facilityCost.base * Math.pow(E.facilityCost.growth, lv - 2) * (hasT('eco3') ? .85 : 1)); // lv = the level you're upgrading to
    const FAC_MAX = Math.max(1, Math.round(E.facilityCost.maxLevel));
    const INCOME = E.incomeMultiplier; // every stardust payout is multiplied by this (apps/solarist-economy.json)
    function addDust(n) { n = Math.max(0, Math.round(n * INCOME)); S.dust += n; S.dustTotal += n; return n; }
    // Captain Level (XP: everything that moves the game forward) and Knowledge Level (what you learn). 1-100, a new title every 10.
    const LV_MAX = 100, lvNeed = L => 40 + L * 6;
    const CAPT = ['Cadet', 'Ensign', 'Pilot', 'Navigator', 'Lieutenant', 'Captain', 'Commander', 'Commodore', 'Admiral', 'Fleet Admiral', 'Star Legend'];
    const KNOW = ['Curious Mind', 'Student', 'Apprentice Scholar', 'Scholar', 'Researcher', 'Scientist', 'Archivist', 'Professor', 'Sage', 'Oracle', 'Keeper of the Cosmos'];
    function lvInfo(total) { let L = 1, t = total || 0; while (L < LV_MAX && t >= lvNeed(L)) { t -= lvNeed(L); L++; } return { L, into: t, need: L < LV_MAX ? lvNeed(L) : 0 }; }
    const titleOf = (list, L) => list[Math.min(10, Math.floor(L / 10))];
    let pend = { xp: 0, kn: 0 };
    const award = (xp, kn) => { pend.xp += xp || 0; pend.kn += kn || 0; };
    function flushXP(notes) { // add what's pending; level-ups go into notes
      const { xp, kn } = pend; pend = { xp: 0, kn: 0 };
      if (!xp && !kn) return;
      const out = notes || [], ups = [];
      [['xp', xp, CAPT, '⭐ Captain'], ['kn', kn, KNOW, '📚 Knowledge']].forEach(([k, n, list, label]) => {
        if (!n) return;
        const b = lvInfo(S[k]).L; S[k] = (S[k] || 0) + n; const a = lvInfo(S[k]).L; if (k === 'kn') S.kp = (S.kp || 0) + n;
        if (a > b) ups.push('🎉 ' + label + ' Level ' + a + '!' + (titleOf(list, a) !== titleOf(list, b) ? ' New title: ' + titleOf(list, a) + '.' : ''));
      });
      out.push((xp ? '⭐ +' + xp + ' XP' : '') + (xp && kn ? ' · ' : '') + (kn ? '📚 +' + kn + ' Knowledge' : ''), ...ups);
      return out;
    }
    const KN_REP = { core: 25, species: 25, odd: 25, secret: 18, log: 10, fac: 8 };
    const RAR_BONUS = E.session.rarityBonus, RANK = { Common: 0, Uncommon: 1, Rare: 2, Legendary: 3 };
    // settlements: Travelers' Posts grow a population every study session (faster with more and better facilities)
    const TIERS = [[0, 'Outpost'], [100, 'Village'], [1000, 'Town'], [10000, 'City'], [100000, 'Metropolis'], [1000000, 'Megacity']];
    const tierOf = n => TIERS.filter(t => n >= t[0]).pop()[1];
    // Travelers' Posts pay a little trade every study session: 1 per facility level, at most 60
    const tradeIncome = () => Math.min(E.trade.cap + (hasT('eco2') ? 40 : 0), Math.round(E.trade.perFacilityLevel * (hasT('eco2') ? 1.5 : 1) * posts().reduce((n, { p }) => n + (p.post.tp ? p.post.tp.fac.reduce((a, f) => a + (f.lv || 1), 0) : 0), 0)));
    function growPosts(notes) {
      posts().forEach(({ p }) => {
        const t = p.post.tp; if (!t) return;
        const before = t.pop || 0, power = t.fac.reduce((a, f) => a + (f.lv || 1), 0);
        t.pop = before + Math.round((3 + Math.random() * 6) * (1 + power) * (S.tuned === p.num ? 2 : 1) * (1 + before / 2000));
        if (tierOf(before) !== tierOf(t.pop)) notes.push('🏙 ' + nm(p) + ' grew into a ' + tierOf(t.pop) + '! (' + t.pop.toLocaleString() + ' settlers)');
      });
    }
    // bounties: three small goals at a time; finishing one pays stardust and rolls a new one
    const CLASSES = Object.keys(TYPES);
    function newBounty() {
      const pk = a => a[Math.floor(Math.random() * a.length)];
      for (let tries = 0; tries < 8; tries++) {
        const k = pk(['class', 'class', 'rarity', 'hab', 'moons', 'rings', 'life', 'sessions', 'sessions', 'cycle', 'temp']); let b;
        if (k === 'class') { const c = pk(CLASSES); b = { v: c, t: 'Find ' + (/^[AEIOU]/.test(c) ? 'an ' : 'a ') + c + ' world', reward: 25 + Math.round(70 / TYPES[c].w) }; }
        else if (k === 'rarity') { const v = pk(['Uncommon', 'Uncommon', 'Rare']); b = { v, t: 'Find ' + (/^[AEIOU]/.test(v) ? 'an ' : 'a ') + v + ' (or rarer) world', reward: v === 'Rare' ? 70 : 35 }; }
        else if (k === 'hab') { const v = pk([60, 70, 80]); b = { v, t: 'Find a world at least ' + v + '% habitable', reward: v - 25 }; }
        else if (k === 'moons') { const v = 3 + Math.floor(Math.random() * 6); b = { v, t: 'Find a world with ' + v + ' or more moons', reward: 20 + v * 4 }; }
        else if (k === 'rings') b = { t: 'Find a ringed world', reward: 35 };
        else if (k === 'life') { const v = pk([3, 4, 5]); b = { v, t: 'Find a world with ' + LIFE[v][0].toLowerCase() + ' (or more)', reward: 20 + v * 10 }; }
        else if (k === 'sessions') { const v = 2 + Math.floor(Math.random() * 4); b = { v, t: 'Finish ' + v + ' study sessions', reward: 15 * v, prog: 0 }; }
        else if (k === 'cycle') b = { t: 'Finish a Full Cycle (nothing skipped)', reward: 60 };
        else { const v = pk(['hot', 'cold']); b = { v, t: v === 'hot' ? 'Find a world hotter than 500 °C' : 'Find a world colder than −150 °C', reward: 35 }; }
        b.k = k; b.id = Date.now() + '' + Math.random(); b.reward = Math.round(b.reward * E.bountyMultiplier);
        if (!S.bounties.some(x => x.t === b.t)) return b;
      }
      return { k: 'sessions', v: 3, t: 'Finish 3 study sessions', reward: 70, prog: 0, id: Date.now() + '' + Math.random() };
    }
    while (S.bounties.length < 3) S.bounties.push(newBounty());
    function bountyHit(b, ctx) {
      const p = ctx.planet;
      if (b.k === 'sessions') { if (ctx.session) b.prog = (b.prog || 0) + 1; return b.prog >= b.v; }
      if (b.k === 'cycle') return !!ctx.cycle;
      if (!p) return false;
      const coldest = p.tempNight != null ? Math.min(p.temp, p.tempNight) : p.temp;
      return b.k === 'class' ? p.type === b.v : b.k === 'rarity' ? RANK[p.rarity] >= RANK[b.v] : b.k === 'hab' ? p.x.hab >= b.v : b.k === 'moons' ? p.moons >= b.v
        : b.k === 'rings' ? p.rings : b.k === 'life' ? (p.lifeLvl || 0) >= b.v : b.k === 'temp' ? (b.v === 'hot' ? p.temp > 500 : coldest < -150) : false;
    }
    function checkBounties(ctx, notes) {
      S.bounties.forEach((b, i) => { if (bountyHit(b, ctx)) { const got = addDust(b.reward); notes.push('🎯 Bounty complete: ' + b.t + ' (+' + got + ' ✦)'); award(30, 0); S.bDone++; S.bounties[i] = newBounty(); } });
    }
    // personal records: the extremes of everything you've found
    const REC = [
      ['hottest', '🔥', 'Hottest world', p => p.temp, v => v + ' °C', 1], ['coldest', '❄', 'Coldest world', p => p.tempNight != null ? Math.min(p.temp, p.tempNight) : p.temp, v => v + ' °C', -1],
      ['biggest', '🪐', 'Biggest world', p => p.x.radius, v => v + '× Earth', 1], ['smallest', '🪨', 'Smallest world', p => p.x.radius, v => v + '× Earth', -1],
      ['moons', '🌙', 'Most moons', p => p.moons, v => String(v), 1], ['far', '🔭', 'Farthest from Earth', p => p.dist, v => v.toLocaleString() + ' ly', 1],
      ['species', '🦎', 'Most species', p => p.x.species || null, v => 'about ' + Number(v.toPrecision(2)).toLocaleString(), 1], ['hab', '🏡', 'Most habitable', p => p.x.hab, v => v + '%', 1],
      ['gravity', '🏋', 'Strongest gravity', p => p.gravity, v => v + ' g', 1], ['day', '⏳', 'Longest day', p => p.day, v => v + ' hours', 1],
    ];
    function checkRecords(p, notes) {
      REC.forEach(([k, , label, get, f, dir]) => {
        const v = get(p); if (v == null) return;
        const cur = S.rec[k];
        if (!cur || (dir > 0 ? v > cur.v : v < cur.v)) { if (cur && notes && S.found.length > 10) notes.push('🏆 New record! ' + label + ': ' + nm(p) + ' (' + f(v) + ')'); S.rec[k] = { v, num: p.num }; }
      });
    }
    S.found.forEach(({ p }) => checkRecords(p, null)); // fill records from worlds found before this existed
    if (S.xp == null) { // credit saves from before levels existed for what they've already done
      const pl = posts().map(f => f.p), tps = pl.filter(p => p.post.tp), facs = tps.reduce((n, p) => n + p.post.tp.fac.length, 0);
      const modUps = Object.keys(MODS).reduce((n, k) => n + lvl(k) - 1, 0), heard = pl.reduce((n, p) => n + p.post.reports.length, 0);
      S.xp = S.found.length * 20 + pl.length * 30 + tps.length * 40 + facs * 25 + modUps * 15 + (S.fights || 0) * 35 + (S.surveys || 0) * 20 + (S.bDone || 0) * 30;
      S.kn = S.found.length * 10 + heard * 15 + itemCount() * 12 + (S.events || []).length * 15;
    }
    save();
    // Distress Run: once a day, right after you earn a Full Cycle, you can answer a distress call.
    // It takes one whole cycle of study sessions, and nothing else can be done until it's over.
    const DISTRESS = [
      ['🚢', 'The Adrift Freighter', 'The freighter Moth of Kessa lost its reactor and is drifting toward an asteroid field.', ['Locked onto the freighter\'s beacon and burned hard to close the distance.', 'Threaded the edge of the asteroid field without losing the signal.', 'Docked with the freighter and patched the reactor with spare parts.', 'Towed the Moth of Kessa clear of the rocks. Its crew cheered over the radio.'], 'The freighter\'s captain paid you out of the cargo hold.'],
      ['⛏', 'The Mining Colony Blackout', 'A mining colony on a dark asteroid lost power. Life support has a few hours of battery left.', ['Plotted the fastest route to the colony and pushed the engines.', 'Arrived to a dead station. Not a single light on.', 'Ran a power line from the ship and got the air scrubbers turning again.', 'The colony\'s lights came back on, one tunnel at a time.'], 'The miners chipped in from their latest haul.'],
      ['🔬', 'The Lost Science Vessel', 'A research ship went silent inside a nebula three days ago. Its last message was cut off mid-sentence.', ['Picked up a faint echo of the science ship\'s transponder.', 'Flew into the nebula on instruments alone. Sensors full of static.', 'Found the ship stuck in an ion storm and shielded it with your hull.', 'Guided the scientists out of the nebula. They kept every sample.'], 'The research institute sent a generous thank-you grant.'],
      ['☄', 'The Comet-Struck Liner', 'A passenger liner was clipped by a comet fragment. Hundreds of tourists are aboard and very upset.', ['Answered the liner\'s mayday and set course at full burn.', 'Matched the liner\'s spin so the crew could get close.', 'Sealed the hull breach and calmed down a lot of tourists.', 'Escorted the liner to the nearest port. Somebody asked for an autograph.'], 'The cruise company paid a rescue fee (and sent free buffet coupons).'],
      ['🙏', 'The Stranded Pilgrims', 'A pilgrim fleet ran out of fuel halfway to a holy comet. Their engines are cold.', ['Followed the pilgrims\' prayer-song broadcast to their fleet.', 'Shared fuel ship by ship across the whole convoy.', 'Fixed a cracked fuel line on their oldest ship with tape and hope.', 'The fleet reached the holy comet just in time for the sunrise ceremony.'], 'The pilgrims passed around the collection plate for you.'],
      ['🛰', 'The Falling Station', 'An old relay station lost its thrusters and is slowly falling toward its star.', ['Plotted an intercept course before the station got too hot.', 'Matched orbit with the station. The hull was already glowing.', 'Clamped on and fired the ship\'s engines to slow its fall.', 'Pushed the station back into a safe orbit. The keepers can breathe again.'], 'The relay network paid a salvage-and-rescue bounty.'],
    ];
    const ROMAN = n => ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n - 1] || String(n);
    const drAvail = () => !S.dr && S.drDay !== today() && S.fcDay === today() && mode === 'focus' && S.cycle % S.set.every === 0 && !running && !(left > 0 && left < length(mode));
    function drAccept() {
      if (!drAvail()) return;
      const sc = Math.floor(Math.random() * DISTRESS.length);
      S.dr = { sc, n: 0, need: S.set.every, at: Date.now() }; S.drDay = today();
      const [ic, title, intro] = DISTRESS[sc];
      pushEv({ ic: '🆘', title: 'Distress Run accepted: ' + title, t: intro, at: Date.now() });
      hint.textContent = '🆘 ' + intro + ' ' + S.dr.need + ' study sessions to get there and back. No other missions until it\'s done.';
      save(); draw();
    }
    function drAbandon() { const sc = DISTRESS[S.dr.sc]; pushEv({ ic: '🆘', title: 'Distress Run abandoned: ' + sc[1], t: 'The ship turned back. Someone else will have to answer this one.', at: Date.now() }); S.dr = null; hint.textContent = 'Distress Run abandoned. You can try again tomorrow.'; save(); draw(); }
    function drLeg(reps) { // one study session of the run; the last one pays out
      const d = S.dr, [ic, title, , beats, thanks] = DISTRESS[d.sc]; d.n++;
      const bi = d.n >= d.need ? 3 : d.n === 1 ? 0 : d.n % 2 === 0 ? 1 : 2;
      if (d.n < d.need) {
        reps.unshift({ ev: { battle: true, ic: '🆘', title: title + ' · Act ' + ROMAN(d.n), t: beats[bi] } });
        return 'Act ' + ROMAN(d.n) + ' of the Distress Run done. ' + (d.need - d.n) + (d.need - d.n === 1 ? ' act' : ' acts') + ' to go.';
      }
      const dust = Math.round((E.distressRun.base + Math.random() * E.distressRun.random) * (1 + .05 * roomLv('medbay') + Math.min(.3, .1 * crewN('Medic')))); S.dust += dust; S.dustTotal += dust;
      const bonus = [];
      const opts = ['dust', 'item', 'event'].concat(S.coord ? [] : ['coord']), pick = opts[Math.floor(Math.random() * opts.length)];
      if (pick === 'dust') { const b = Math.round(E.distressRun.bonusMin + Math.random() * Math.max(0, E.distressRun.bonusMax - E.distressRun.bonusMin)); S.dust += b; S.dustTotal += b; bonus.push('a bonus of ✦ ' + b + ' from a grateful passenger'); }
      else if (pick === 'item') { const it = rollItem(atP(), true, 'gift'), nw = gainItem(it, atP()); bonus.push('a keepsake: ' + it.name + ' (' + it.rar + (nw ? ', new!' : '') + ')'); if (nw) award(0, 12); }
      else if (pick === 'event') { S.eventNext = true; bonus.push('a tip about something strange out there (your next trip has an event)'); }
      else { S.coord = true; bonus.push('a full charge for the Interplanetary Coordinator'); }
      award(250, 120); S.drN = (S.drN || 0) + 1; S.dr = null;
      const got = '+' + dust + ' ✦ · ' + bonus[0].replace(/^./, c => c.toUpperCase());
      reps.unshift({ ev: { battle: true, ic: '🆘', title: 'Distress Run complete: ' + title, t: beats[3] + ' ' + thanks, got } });
      pushEv({ ic: '🆘', title: 'Distress Run complete: ' + title, t: beats[3] + ' ' + thanks, got, at: Date.now() });
      return '🆘 Distress Run complete! ✦ ' + dust + ' plus ' + bonus[0] + '.';
    }
    // ---------- Quests: Expeditions, the Guild's weekly contract, and the Most Wanted ----------
    // Expedition: [icon, title, intro, four legs of [scene, [safe choice, result], [bold choice, result]], ending]. The fifth session is the ending.
    const EXPED = [
      ['🏔', 'The Glass Mountains', 'A Guild scout spotted a range of glass peaks on a moon nobody has named. They want someone to map the way up.', [
        ['The foothills are covered in loose glass. Every step crunches.', ['Take the marked trail', 'The old trail held. Slow, but nobody got cut.'], ['Climb the shard field', 'A shortcut over the shards, and something shiny wedged between them.']],
        ['A storm of glass dust rolls in from the west.', ['Wait it out in a cave', 'The cave was dry and the storm was gone by morning.'], ['Push through it', 'Visibility zero, but the wind uncovered something buried.']],
        ['A frozen waterfall blocks the path.', ['Go around', 'The long way round took a day, but it was easy.'], ['Climb it', 'Ice axes out. Halfway up, something was frozen inside the ice.']],
        ['Near the top the crew finds an old camp. Someone else made it this far.', ['Leave it alone', 'You left it as you found it, and marked it on the map.'], ['Search the tents', 'The tents were empty, except for a small box nobody came back for.']]],
        'The summit. From up here the whole valley glitters like a spilled jar of stars. The Glass Mountains are on the map now, with your ship\'s name next to the peak.'],
      ['🌊', 'The Drowned Archive', 'A Guild probe found a building at the bottom of an ocean world. A library, maybe. Its lights are still on.', [
        ['The dive starts at a reef that glows wherever you touch it.', ['Follow the reef down', 'The reef lit the way like a runway.'], ['Dive straight down', 'The fast way. Something glinted on the sea floor.']],
        ['A school of fish the size of buses circles the sub.', ['Cut the engines and wait', 'They lost interest and drifted off.'], ['Follow them', 'They led you into a cave full of things that sank long ago.']],
        ['The archive doors are sealed with a lock of seven symbols.', ['Try the symbols one by one', 'It took hours. The doors opened with a long sigh of bubbles.'], ['Cut through the wall', 'The wall gave way, and so did a shelf of very old things.']],
        ['Inside: shelves of glass books. Most crumble when touched.', ['Scan every page', 'Thousands of pages, safely copied.'], ['Take one book with you', 'One book survived the trip up. Nobody can read it yet.']]],
        'You surface with the archive\'s floor plan and enough pages to keep the Guild busy for a decade.'],
      ['🏜', 'The Long Caravan', 'A caravan of settlers is crossing a desert world to a new Travelers\' Post. They asked for an escort.', [
        ['Day one. Sixty wagons, three hundred people, one very loud goat.', ['Ride at the back', 'Nobody got left behind. Not even the goat.'], ['Scout ahead', 'You found a dry riverbed full of old things.']],
        ['A sandstorm on the horizon, heading straight for the caravan.', ['Circle the wagons', 'Everyone sheltered together. Someone told stories all night.'], ['Find a way around', 'A path between two dunes, and something half-buried in one of them.']],
        ['Raiders watch from a ridge, counting wagons.', ['Show them your ship', 'They took one look at your hull and decided it wasn\'t worth it.'], ['Go and talk to them', 'They were just hungry. You traded food for an old trinket.']],
        ['The water is running low.', ['Ration it carefully', 'Everyone got by. Barely.'], ['Dig for a spring', 'You found water, and something that had been sitting at the bottom of it for a long time.']]],
        'The caravan rolls into the post at sunset. Three hundred people wave as you lift off. The goat does not wave, but it seems fine.'],
      ['🌑', 'The Hollow Moon', 'Radar makes a small moon ring like a bell. The Guild thinks it might be hollow.', [
        ['The surface is covered in perfectly round holes.', ['Land near the biggest one', 'A clean landing on solid rock.'], ['Fly down a hole', 'It went deeper than expected, and the walls were lined with something.']],
        ['The tunnels branch in every direction.', ['Drop a trail of beacons', 'You will always find the way back.'], ['Follow the warm air', 'The warmth led to a small chamber with a strange object in it.']],
        ['Something huge moves in the dark, very slowly.', ['Stay very still', 'It passed by. You think it was just curious.'], ['Light it up', 'For one second you saw it. It dropped something as it fled.']],
        ['At the center of the moon: a room full of machines, still humming.', ['Log it and leave', 'The Guild will want to see this untouched.'], ['Pull a part out', 'The humming stopped. The part is still glowing.']]],
        'The Hollow Moon is charted. Nobody knows who built the machines inside. Everybody wants to.'],
    ];
    const EXP_LEN = 5, RANKI = r => ITEM_RARS.indexOf(r);
    let qNotes = []; // quest lines for this session's report
    const rareFind = (p, kind) => { for (let k = 0; k < 40; k++) { const r = rollItem(p, true, kind); if (RANKI(r.rar) >= 2) return r; } return rollItem(p, true, kind); };
    const expediting = () => S.mission === -4 && !!S.exp && !S.dr;
    const expAvail = () => !S.exp && S.expDay !== today();
    const expOffer = () => { let h = 0; for (const ch of today()) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return (h + (S.expDone || 0)) % EXPED.length; };
    function expStart() {
      if (!expAvail() || (running && mode === 'focus')) return;
      const id = expOffer(), [ic, title, intro] = EXPED[id]; S.exp = { id, step: 0, pick: 0 }; S.mission = -4;
      pushEv({ c: 'quest', ic, title: 'Expedition started: ' + title, t: intro, at: Date.now() });
      hint.textContent = ic + ' ' + intro + ' ' + EXP_LEN + ' study sessions, whenever you like.'; save(); draw();
    }
    function expAbandon() { const [ic, title] = EXPED[S.exp.id]; pushEv({ c: 'quest', ic, title: 'Expedition abandoned: ' + title, t: 'The crew packed up and went home. A new offer comes tomorrow.', at: Date.now() }); S.exp = null; S.expDay = today(); if (S.mission === -4) S.mission = 0; hint.textContent = 'Expedition abandoned.'; save(); draw(); }
    function expLeg(reps) {
      const x = S.exp, [ic, title, , legs, ending] = EXPED[x.id], here = atP();
      S.cnt.expSteps = (S.cnt.expSteps || 0) + 1;
      if (x.step < legs.length) {
        const lg = legs[x.step], opt = lg[x.pick ? 2 : 1];
        let got;
        if (x.pick) { if (Math.random() < .45) { const it = rollItem(here, true, 'gift'), nw = gainItem(it, here); if (nw) award(0, 12); got = '🎒 ' + it.name + ' (' + it.rar + (nw ? ', new!' : '') + ')'; } else got = '+' + addDust(E.quests.expeditionBold) + ' ✦. Nothing else this time.'; }
        else got = '+' + addDust(E.quests.expeditionSafe) + ' ✦';
        award(25, 15); x.bold = (x.bold || 0) + (x.pick ? 1 : 0); x.step++; x.pick = 0;
        const head = title + ' · Leg ' + x.step + ' of ' + EXP_LEN;
        reps.unshift({ ev: { battle: true, ic, title: head, t: lg[0] + ' ' + opt[1], got } });
        pushEv({ c: 'quest', ic, title: 'Expedition: ' + head, t: lg[0] + ' (' + opt[0] + ') ' + opt[1], got, at: Date.now() });
        return 'Leg ' + x.step + ' of ' + EXP_LEN + ' done.' + (x.step < legs.length ? ' Pick the next path on the left.' : ' One more session to finish.');
      }
      const it = rareFind(here, 'gift'), nw = gainItem(it, here); if (nw) award(0, 12);
      const dust = addDust(E.quests.expedition);
      if (x.bold === legs.length) S.cnt.allBold = (S.cnt.allBold || 0) + 1; else if (!x.bold) S.cnt.allSafe = (S.cnt.allSafe || 0) + 1;
      award(150, 80); S.exp = null; S.expDay = today(); S.expDone = (S.expDone || 0) + 1; S.mission = 0;
      const got = '+' + dust + ' ✦ · 🎒 ' + it.name + ' (' + it.rar + (nw ? ', new!' : '') + ')';
      reps.unshift({ ev: { battle: true, ic, title: 'Expedition complete: ' + title, t: ending, got } });
      pushEv({ c: 'quest', ic, title: 'Expedition complete: ' + title, t: ending, got, at: Date.now() });
      return ic + ' Expedition complete! ✦ ' + dust + ' and ' + it.name + '.';
    }
    // Guild contract: three goals a week, a fresh one every Monday
    const dayKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const weekKey = () => { const d = new Date(); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return dayKey(d); };
    const WK_GOALS = { // [what, counter, smallest, biggest]
      hours: ['Study for {n} hours', () => S.minutes / 60, 5, 8],
      worlds: ['Discover {n} worlds', () => Object.values(S.cnt.rar).reduce((a, n) => a + n, 0), 5, 9],
      surveys: ['Survey {n} worlds', () => S.surveys || 0, 2, 4],
      fc: ['Earn {n} Full Cycles', () => S.cnt.fc, 2, 3],
      builds: ['Finish {n} builds', () => S.cnt.builds || 0, 1, 3],
      camp: ['Recover {n} Meridian logs', () => S.camp.n, 3, 5],
      bounty: ['Complete {n} bounties', () => S.bDone || 0, 2, 4],
      fights: ['Drive out {n} outlaw gangs', () => S.fights || 0, 1, 2],
      exp: ['Finish {n} expedition legs', () => S.cnt.expSteps || 0, 3, 5],
    };
    function wkCheck() {
      const w = weekKey(); if (S.wk && S.wk.wk === w) return;
      const keys = Object.keys(WK_GOALS).filter(k => !(k === 'camp' && (!CAMP || S.camp.n + 5 > CAMP.logs.length))).sort(() => Math.random() - .5).slice(0, 3);
      S.wk = { wk: w, claimed: false, goals: keys.map(k => { const [, f, lo, hi] = WK_GOALS[k]; return { k, n: lo + Math.floor(Math.random() * (hi - lo + 1)), base: f() }; }) };
    }
    const wkProg = g => Math.max(0, Math.min(g.n, Math.floor(WK_GOALS[g.k][1]() - g.base + 1e-9)));
    const wkDone = () => !!S.wk && S.wk.goals.every(g => wkProg(g) >= g.n);
    function wkClaim(kind) {
      if (!wkDone() || S.wk.claimed) return;
      S.wk.claimed = true; S.cnt.wk = (S.cnt.wk || 0) + 1; award(200, 40);
      let t;
      if (kind === 'dust') t = '✦ ' + addDust(E.quests.contract).toLocaleString() + ' resources';
      else if (kind === 'kp') { const k = Math.round(E.quests.contractKnowledge); S.kp += k; t = k + ' Knowledge points'; }
      else { const it = rareFind(null, 'trade'), nw = gainItem(it, null); if (nw) award(0, 12); t = it.name + ' (' + it.rar + (nw ? ', new!' : '') + ')'; }
      pushEv({ c: 'quest', ic: '📜', title: 'Guild contract complete', t: 'The Cartographers\' Guild paid out: ' + t + '.', at: Date.now() });
      hint.textContent = '📜 Contract complete. The Guild paid out ' + t + '. A new contract comes on Monday.'; save(); draw();
    }
    // Most Wanted: beat enough gangs and a named boss shows up. Collect clues, then hunt them down (two study sessions).
    const BOSS_F = ['Vex', 'Marlo', 'Ingrid', 'Duke', 'Sable', 'Kaz', 'Odessa', 'Rook', 'Juno', 'Brask', 'Tamsin', 'Gideon'], BOSS_N = ['Rustjaw', 'the Comet', 'Two-Suns', 'Old Smoke', 'Glass Eye', 'the Quiet', 'Mother Static', 'Ninefingers', 'the Last Laugh', 'Halfmoon', 'Velvet', 'Crowbar'];
    const CLUES = ['A bartender on {p} remembers {b} and a ship with no running lights.', 'Scratched into a rock on {p}: "{g} were here".', 'A trader on {p} sold {b} fuel and got paid in fake coins.', 'Someone on {p} heard {b} laughing on an open channel.', 'Burn marks on {p} match the engines of {b}\'s ship.', 'A wanted poster on {p} has been drawn on. Someone gave {b} a mustache.', 'Settlers on {p} saw {g} heading for the edge of the map.', 'A dropped glove on {p} has {b}\'s initials stitched inside.'];
    const HUNT = [['You tracked {b} to an old mining station. The docking lights are off, and the airlock is open. Too easy.', '{b} tried to slip out through the cargo bay. The crew was waiting there with the lights on. "Fine," said {b}. "Fine."'],
      ['{b}\'s ship is hiding in the tail of a comet. You follow it into the ice.', 'A chase through the comet\'s tail, ice ringing off the hull. {b}\'s engines gave out first. They surrendered over the radio, very politely.'],
      ['The trail ends at a casino station where {g} spend their winnings. {b} is at the big table.', 'You bet the Guild\'s bounty against {b}\'s freedom on one hand of cards. You won. {b} is still arguing about it in the brig.']];
    const pk1 = a => a[Math.floor(Math.random() * a.length)];
    const mwAt = () => 3 + 5 * (S.mwDone || 0); // gangs beaten before the next boss shows up
    const mwReady = () => !!S.mw && S.mw.clues >= S.mw.need;
    const hunting = () => S.mission === -5 && mwReady() && !S.dr;
    function mwSpawn() {
      if (S.mw || (S.fights || 0) < mwAt()) return;
      S.mw = { name: pk1(BOSS_F) + ' "' + pk1(BOSS_N) + '"', gang: 'the ' + pk1(GANG_A) + ' ' + pk1(GANG_B), clues: 0, need: 4, act: 0, sc: Math.floor(Math.random() * HUNT.length), at: Date.now() };
      const t = S.mw.gang.replace(/^the/, 'The') + ' have a new boss, and the Guild wants them gone. Explore, survey and fight to pick up clues.';
      pushEv({ c: 'quest', ic: '🎯', title: 'Most Wanted: ' + S.mw.name, t, at: Date.now() }); qNotes.push('🎯 New Most Wanted poster: ' + S.mw.name + '. ' + t);
    }
    function mwClue(p, n) {
      const m = S.mw; if (!m || m.clues >= m.need || !p) return;
      m.clues = Math.min(m.need, m.clues + n);
      const t = pk1(CLUES).replace('{p}', nm(p)).split('{b}').join(m.name).split('{g}').join(m.gang);
      pushEv({ c: 'quest', ic: '🔎', title: 'Clue ' + m.clues + ' of ' + m.need + ': ' + m.name, t, at: Date.now() });
      qNotes.push('🔎 Clue ' + m.clues + ' of ' + m.need + ': ' + t + (m.clues >= m.need ? ' That\'s enough to find them. Start the hunt from the left.' : ''));
    }
    function mwLeg(reps) {
      const m = S.mw, [a1, a2] = HUNT[m.sc], fill = s => s.split('{b}').join(m.name).split('{g}').join(m.gang);
      m.act++; award(30, 10);
      if (m.act < 2) { reps.unshift({ ev: { battle: true, ic: '🎯', title: 'Most Wanted: ' + m.name + ' · Act I', t: fill(a1) } }); return 'Act I of the hunt done. One more session to catch them.'; }
      const it = rareFind(null, 'loot'), nw = gainItem(it, null); if (nw) award(0, 12);
      const dust = addDust(E.quests.bossBase + E.quests.bossPerCatch * (S.mwDone || 0));
      award(250, 60); S.mwDone = (S.mwDone || 0) + 1; S.mw = null; S.mission = 0;
      const got = '+' + dust + ' ✦ · 🎒 ' + it.name + ' (' + it.rar + (nw ? ', new!' : '') + ')';
      reps.unshift({ ev: { battle: true, ic: '🎯', title: 'Caught: ' + m.name, t: fill(a2), got } });
      pushEv({ c: 'quest', ic: '🎯', title: 'Most Wanted caught: ' + m.name, t: fill(a2), got, at: Date.now() });
      return '🎯 ' + m.name + ' is in the brig! ✦ ' + dust + ' and ' + it.name + '.';
    }
    // ---------- Interstellar Delivery: carry cargo to a world that fits the client's wishes ----------
    // Each requirement: [group, label, name word, picks a value, met?, how close (0..1)]. Groups never repeat in one delivery.
    const NUMW = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'];
    const hab = p => (p.x || (p.x = makeExtra(p))).hab, rnd = (a, b, st) => a + Math.floor(Math.random() * (Math.floor((b - a) / st) + 1)) * st, clamp01 = x => Math.max(0, Math.min(1, x));
    const STAR_W = { 'red dwarf': 'Ember', 'orange dwarf': 'Amber', 'yellow dwarf': 'Sunny', 'white dwarf': 'Pale-Star', 'blue giant': 'Blue-Sun', 'red giant': 'Old-Sun', 'binary pair': 'Twin-Sun', 'pulsar': 'Pulse' };
    const DREQ = {
      hab: ['hab', v => 'Habitability ' + v + '% or more', v => v >= 80 ? 'Paradise' : v >= 60 ? 'Good-Life' : v >= 40 ? 'Fair-Air' : 'Livable', () => rnd(30, 80, 10), (p, v) => hab(p) >= v, (p, v) => 1 - Math.max(0, v - hab(p)) / 60],
      moons: ['moons', v => v + ' or more moons', v => NUMW[v] + '-Moon', () => rnd(1, 6, 1), (p, v) => p.moons >= v, (p, v) => p.moons / v],
      life: ['life', v => LIFE[v][0] + ' (or more)', v => ['', 'Microbe', 'Mossy', 'Green', 'Swimmer', 'Herd', 'Watcher'][v], () => rnd(1, 5, 1), (p, v) => p.lifeLvl >= v, (p, v) => p.lifeLvl / v],
      hot: ['temp', v => 'Hotter than ' + v + ' °C', () => 'Scorch', () => rnd(60, 400, 20), (p, v) => p.temp > v, (p, v) => 1 - Math.max(0, v - p.temp) / 250],
      cold: ['temp', v => 'Colder than ' + v + ' °C', () => 'Frost', () => -rnd(40, 180, 20), (p, v) => p.temp < v, (p, v) => 1 - Math.max(0, p.temp - v) / 150],
      lowg: ['grav', v => 'Gravity under ' + v + ' g', () => 'Feather', () => rnd(4, 8, 1) / 10, (p, v) => p.gravity < v, (p, v) => 1 - Math.max(0, p.gravity - v)],
      highg: ['grav', v => 'Gravity over ' + v + ' g', () => 'Heavy', () => rnd(16, 26, 2) / 10, (p, v) => p.gravity > v, (p, v) => 1 - Math.max(0, v - p.gravity) / 1.5],
      rings: ['rings', () => 'Has rings', () => 'Ringed', () => 1, p => !!p.rings, p => p.rings ? 1 : 0],
      rare: ['rare', v => v + ' or rarer', v => v === 'Rare' ? 'Rare-Gem' : 'Fine', () => Math.random() < .6 ? 'Uncommon' : 'Rare', (p, v) => RANK[p.rarity] >= RANK[v], (p, v) => RANK[p.rarity] / RANK[v]],
      far: ['dist', v => 'More than ' + v.toLocaleString() + ' ly from Earth', () => 'Far-Reach', () => rnd(2000, 12000, 1000), (p, v) => p.dist > v, (p, v) => p.dist / v],
      near: ['dist', v => 'Within ' + v + ' ly of Earth', () => 'Home-Side', () => rnd(100, 500, 50), (p, v) => p.dist <= v, (p, v) => v / p.dist],
      star: ['star', v => 'Orbits a ' + v, v => STAR_W[v] || 'Star', () => pk1(STARS.slice(0, 7))[0], (p, v) => p.star === v, (p, v) => p.star === v ? 1 : 0],
      odd: ['odd', () => 'Has an anomaly', () => 'Strange', () => 1, p => !!p.odd, p => p.odd ? 1 : 0],
      longday: ['day', v => 'Days longer than ' + v + ' hours', () => 'Long-Day', () => rnd(40, 80, 10), (p, v) => p.day > v, (p, v) => p.day ? p.day / v : 0],
      shortday: ['day', v => 'Days shorter than ' + v + ' hours', () => 'Quick-Day', () => rnd(10, 16, 2), (p, v) => p.day != null && p.day < v, (p, v) => p.day ? v / p.day : 0],
    };
    const CARGO = ['seed stock', 'medical crates', 'a grand piano', 'a three-tier wedding cake', 'spare reactor parts', 'fresh water', 'ten thousand rubber ducks', 'library books', 'a very patient cat', 'mail from home', 'solar panels', 'festival fireworks', 'a time capsule', 'telescope mirrors', 'a crate of hot sauce', 'the Guild\'s lost paperwork'];
    const CLIENT = ['The Halvorsen family', 'A retired pilot', 'The Guild survey office', 'A traveling circus', 'A quiet monastery', 'A brand-new colony', 'A botanist', 'A very famous poet', 'An old couple', 'A school on a moon', 'A mysterious stranger', 'The Comet Racing League'];
    let DSAMPLE = null; // random worlds, used to judge how hard a set of wishes is
    const dSample = () => DSAMPLE || (DSAMPLE = Array.from({ length: 400 }, (_, i) => makePlanet((Math.random() * 4294967296) >>> 0, 0, false, 0)));
    const dMet = (p, r) => DREQ[r.k][4](p, r.v), dClose = (p, r) => dMet(p, r) ? 1 : clamp01(DREQ[r.k][5](p, r.v));
    const dName = d => { const w = d.reqs.map(r => DREQ[r.k][2](r.v)); return w[0] + ' by ' + w.slice(1).join(' & '); };
    function makeDelivery() {
      for (let t = 0; t < 40; t++) {
        const n = Math.random() < .3 ? 3 : 2, keys = Object.keys(DREQ).sort(() => Math.random() - .5), reqs = [], groups = new Set();
        for (const k of keys) { if (reqs.length >= n) break; const g = DREQ[k][0]; if (groups.has(g)) continue; groups.add(g); reqs.push({ k, v: DREQ[k][3]() }); }
        const hits = dSample().filter(p => reqs.every(r => dMet(p, r))).length, chance = hits / dSample().length;
        if (chance < 1 / 120 || chance > .5) continue; // not impossible, not trivial
        const mult = Math.min(14, Math.pow(1 / Math.max(chance, 1 / 400), .55));
        return { reqs, chance, pay: Math.round(E.quests.delivery * mult), cargo: pk1(CARGO), client: pk1(CLIENT) };
      }
      return { reqs: [{ k: 'hab', v: 40 }, { k: 'moons', v: 1 }], chance: .2, pay: Math.round(E.quests.delivery * 2.4), cargo: pk1(CARGO), client: pk1(CLIENT) };
    }
    function dlCheck() { // three offers a day
      if (!S.dl) S.dl = { day: '', offers: [], active: null, done: 0 };
      if (S.dl.day !== today()) { S.dl.day = today(); S.dl.offers = Array.from({ length: 3 }, makeDelivery); }
    }
    const dlScore = p => { const d = S.dl.active; if (!d || !p) return 0; const c = d.reqs.reduce((a, r) => a + dClose(p, r), 0) / d.reqs.length; return d.reqs.every(r => dMet(p, r)) ? 1 : c; };
    const dlPayAt = p => { const sc = dlScore(p); return sc >= 1 ? S.dl.active.pay : Math.max(Math.round(S.dl.active.pay * .1), Math.round(S.dl.active.pay * sc * sc * .8)); };
    function dlAccept(i) { if (focusLock() || S.dl.active) return; const d = S.dl.offers.splice(i, 1)[0]; if (!d) return; d.from = S.at; d.at = Date.now(); S.dl.active = d;
      pushEv({ c: 'quest', ic: '📦', title: 'Delivery accepted: ' + dName(d), t: d.client + ' wants ' + d.cargo + ' taken to a world with: ' + d.reqs.map(r => DREQ[r.k][1](r.v)).join(', ') + '.', at: Date.now() }); save(); draw(); }
    function dlAbandon() { const d = S.dl.active; if (!d) return; pushEv({ c: 'quest', ic: '📦', title: 'Delivery abandoned: ' + dName(d), t: 'The ' + d.cargo + ' went back to the depot.', at: Date.now() }); S.dl.active = null; save(); draw(); }
    function dlDeliver(p, auto) {
      const d = S.dl.active; if (!d || !p || p.num === d.from) return null;
      const sc = dlScore(p), full = sc >= 1, pay = addDust(dlPayAt(p));
      award(full ? 60 : 25, full ? 30 : 10); S.dl.done++; S.dl.active = null;
      if (full) S.cnt.dlPerfect = (S.cnt.dlPerfect || 0) + 1; else if (sc < .5) S.cnt.dlClose = (S.cnt.dlClose || 0) + 1;
      let extra = ''; if (full && d.chance < .05) { const it = rareFind(p, 'gift'), nw = gainItem(it, p); if (nw) award(0, 12); extra = ' They threw in a tip: ' + it.name + ' (' + it.rar + (nw ? ', new!' : '') + ').'; }
      const t = (full ? 'Delivered ' + d.cargo + ' to ' + nm(p) + '. ' + d.client + ' is delighted.' : 'Dropped ' + d.cargo + ' off early at ' + nm(p) + ' (' + Math.round(sc * 100) + '% of what they asked for). ' + d.client + ' paid, grumbling.') + extra;
      pushEv({ c: 'quest', ic: '📦', title: (full ? 'Delivered: ' : 'Delivered early: ') + dName(d), t, got: '+' + pay + ' ✦', at: Date.now() });
      if (auto) qNotes.push('📦 ' + t + ' +' + pay + ' ✦'); else hint.textContent = '📦 ' + t + ' +' + pay + ' ✦';
      save(); if (!auto) draw(); return pay;
    }
    function dlArrive(p) { if (S.dl && S.dl.active && p && p.num !== S.dl.active.from && dlScore(p) >= 1) dlDeliver(p, true); } // a perfect match delivers by itself
    dlCheck();
    // ---------- Rating: one number that only goes up as you play ----------
    const RATING = [ // [group, what, points each, how many]
      ['Study', 'Study sessions', 10, () => S.total], ['Study', 'Minutes studied', 1, () => S.minutes], ['Study', 'Full Cycles', 20, () => S.cnt.fc],
      ['Exploration', 'Common worlds', 5, () => S.cnt.rar.Common || 0], ['Exploration', 'Uncommon worlds', 12, () => S.cnt.rar.Uncommon || 0], ['Exploration', 'Rare worlds', 30, () => S.cnt.rar.Rare || 0], ['Exploration', 'Legendary worlds', 80, () => S.cnt.rar.Legendary || 0],
      ['Exploration', 'Surveys', 10, () => S.surveys || 0], ['Exploration', 'Deep-space events', 5, () => S.cnt.ev], ['Exploration', 'Arrival encounters', 10, () => S.cnt.enc],
      ['Adventure', 'Outlaw gangs beaten', 25, () => S.fights || 0], ['Adventure', 'Bounties', 30, () => S.bDone || 0], ['Adventure', 'Distress Runs', 120, () => S.drN || 0], ['Adventure', 'Expedition legs', 20, () => S.cnt.expSteps || 0],
      ['Adventure', 'Expeditions', 200, () => S.expDone || 0], ['Adventure', 'Guild contracts', 250, () => S.cnt.wk || 0], ['Adventure', 'Most Wanted caught', 300, () => S.mwDone || 0], ['Adventure', 'Deliveries', 40, () => (S.dl && S.dl.done) || 0], ['Adventure', 'Meridian logs', 15, () => S.camp.n],
      ['Building', 'Listening Posts', 40, () => posts().length], ['Building', 'Travelers\' Posts', 80, () => posts().filter(f => f.p.post.tp).length], ['Building', 'Facility levels', 15, () => posts().reduce((a, f) => a + (f.p.post.tp ? f.p.post.tp.fac.reduce((b, x) => b + (x.lv || 1), 0) : 0), 0)],
      ['Building', 'Ship room levels', 30, () => Object.keys(ROOMS).reduce((a, k) => a + roomLv(k), 0)], ['Building', 'Ship module upgrades', 8, () => Object.keys(MODS).reduce((a, k) => a + lvl(k) - 1, 0)], ['Building', 'Crew aboard', 25, () => S.crew.length], ['Building', 'Coordinator chips', 30, () => S.chips.own],
      ['Knowledge', 'Research done', 50, () => Object.keys(S.tech).length], ['Knowledge', 'Common collectibles', 3, () => itemsOf('Common')], ['Knowledge', 'Uncommon collectibles', 6, () => itemsOf('Uncommon')], ['Knowledge', 'Rare collectibles', 15, () => itemsOf('Rare')],
      ['Knowledge', 'Legendary collectibles', 40, () => itemsOf('Legendary')], ['Knowledge', 'Medals', 20, () => Object.keys(S.ach).length],
    ];
    const itemsOf = r => Object.keys(S.items).filter(k => parseId(k).r === r && itemName(k) !== '???').length;
    const rating = () => RATING.reduce((a, [, , per, f]) => { try { return a + per * (f() || 0); } catch (e) { return a; } }, 0);
    const RANKS = [[0, 'Stowaway'], [300, 'Deckhand'], [1000, 'Drifter'], [2500, 'Wayfarer'], [5000, 'Surveyor'], [9000, 'Pathfinder'], [15000, 'Voyager'], [25000, 'Star Captain'], [40000, 'Trailblazer'], [65000, 'Living Legend'], [100000, 'Myth of the Void']];
    const rankOf = v => { let i = 0; while (i + 1 < RANKS.length && v >= RANKS[i + 1][0]) i++; return i; };
    let rt0 = 0; // the rating when this session ended, before its rewards
    wkCheck();

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
    const chipsFree = () => S.chips.own - chipsPut();
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
    const sellPrice = p => sellParts(p).reduce((a, x) => a + x[1], 0);
    const isRecord = p => REC.some(([k]) => S.rec[k] && S.rec[k].num === p.num);
    function sellBlock(p) { // why a world can't be sold, or null
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
    // Trade Stations: sometimes one is docked at the world you reach. It sells collectibles, swaps them for ones it wants,
    // and buys your spares. It leaves when you travel on.
    const TRADERS = ['The Wandering Bazaar', 'Kessa Freeport', 'The Rusty Ledger', 'Station Halfway', 'The Collector\'s Barge', 'Moonlight Exchange', 'The Last Stop Market', 'Brother Ilo\'s Curio Shop', 'The Orbit Swap', 'Dockside Antiques'];
    const TPRICE = r => Math.round(E.tradeStation.prices[r] || 100);
    const buyDisc = () => 1 - Math.min(.3, .1 * crewN('Trader'));
    function loseItem(id) { const it = S.items[id]; if (!it) return; it.n -= 1; if (it.n <= 0) delete S.items[id]; }
    function makeTrader(p) {
      const stock = [], seen = new Set();
      for (let k = 0; k < 16 && stock.length < 4 + roomLv('hold'); k++) { const it = rollItem(p, true, 'trade'); if (seen.has(it.id)) continue; seen.add(it.id); stock.push({ id: it.id, price: Math.round(TPRICE(it.rar) * (.85 + Math.random() * .3) * buyDisc()) }); }
      const owned = Object.keys(S.items).filter(k => itemName(k) !== '???').sort((a, b) => S.items[b].n - S.items[a].n), wants = [];
      owned.slice(0, 6).sort(() => Math.random() - .5).slice(0, 2).forEach(want => {
        const r = parseId(want).r, up = ITEM_RARS[Math.min(3, ITEM_RARS.indexOf(r) + (Math.random() < .35 ? 1 : 0))];
        for (let k = 0; k < 30; k++) { const it = rollItem(p, true, 'trade'); if (it.rar === up && !S.items[it.id] && !seen.has(it.id)) { seen.add(it.id); wants.push({ want, give: it.id }); break; } }
      });
      S.trader = { num: p.num, name: TRADERS[Math.floor(Math.random() * TRADERS.length)], stock, wants, at: Date.now() };
      S.cnt.traders = (S.cnt.traders || 0) + 1;
    }
    function tradeLog(t) { pushEv({ ic: '🏪', title: S.trader.name, t, at: Date.now() }); }
    function traderBuy(i) { const o = S.trader.stock[i]; if (!o || S.dust < o.price) return; S.dust -= o.price; const nw = gainItem({ id: o.id }, byNum(S.trader.num) && byNum(S.trader.num).p); if (nw) award(0, 12); award(5, 0); S.trader.stock.splice(i, 1); S.cnt.bought = (S.cnt.bought || 0) + 1; tradeLog('Bought ' + itemName(o.id) + ' for ✦ ' + o.price + '.'); shopXP(0); save(); draw(); }
    function traderSwap(i) { const w = S.trader.wants[i]; if (!w || !S.items[w.want]) return; loseItem(w.want); const nw = gainItem({ id: w.give }, byNum(S.trader.num) && byNum(S.trader.num).p); if (nw) award(0, 12); award(8, 0); S.trader.wants.splice(i, 1); S.cnt.swaps = (S.cnt.swaps || 0) + 1; tradeLog('Swapped ' + itemName(w.want) + ' for ' + itemName(w.give) + '.'); shopXP(0); save(); draw(); }
    const spareP = id => Math.round(TPRICE(parseId(id).r) * E.tradeStation.sellRatio * INCOME * (1 + .05 * roomLv('hold')) * (hasT('eco4') ? 1.25 : 1));
    function traderSell(id) { const it = S.items[id]; if (!it || it.n < 2) return; const v = spareP(id); loseItem(id); S.dust += v; S.dustTotal += v; S.cnt.spares = (S.cnt.spares || 0) + 1; save(); draw(); }
    // everything that happens at the end of a study session, shown together under the timer
    function sessionEnd(reps, p, ev) {
      const notes = [];
      let earned = Math.max(E.session.minimum, Math.round(S.set.focus * E.session.perStudyMinute)) + (p ? RAR_BONUS[p.rarity] || 0 : 0) + (ev ? E.session.eventBonus : 0);
      earned *= (1 + (lvl('engine') - 1) * E.engineBonusPerLevel) * (hasT('shp1') ? 1.1 : 1) * (1 + .05 * roomLv('galley'));
      notes.push('✦ +' + addDust(earned) + ' resources');
      if (traderNew) { notes.push('🏪 ' + traderNew.name + ' is docked at ' + nm(p) + '. Visit it under Trade on the right before you travel on.'); traderNew = null; }
      if (encGot) { notes.push(encGot.ic + ' +' + encGot.dust + ' resources (' + encGot.title.replace(/!$/, '') + ')'); encGot = null; }
      const trade = tradeIncome(); if (trade) notes.push('🏘 +' + addDust(trade) + ' resources in trade from your Travelers\' Posts');
      if (p) { checkRecords(p, notes); checkBounties({ planet: p }, notes); }
      checkBounties({ session: true }, notes);
      growPosts(notes);
      shipActivity(reps); if (roomLv('lab')) award(0, 4 * roomLv('lab'));
      if (!S.rec.dayN || S.todayN > S.rec.dayN.v) { if (S.rec.dayN && S.todayN > S.rec.dayN.v) notes.push('🏆 New record! Most sessions in a day: ' + S.todayN); S.rec.dayN = { v: S.todayN, date: Date.now() }; }
      reps.forEach(({ rep }) => { if (rep) award(0, KN_REP[rep.k] || 10); }); // everything heard teaches you something
      if (ev && !ev.battle) award(10, 15);
      if (p) award(0, 10); // the new world's survey log
      mwSpawn(); notes.push(...qNotes); qNotes = []; wkCheck();
      checkAch(); const rt1 = rating(), rk0 = rankOf(rt0), rk1 = rankOf(rt1);
      notes.push('◆ +' + (rt1 - rt0).toLocaleString() + ' Rating (' + rt1.toLocaleString() + ')' + (rk1 > rk0 ? '. New rank: ' + RANKS[rk1][1] + '!' : ''));
      flushXP(notes);
      showTrans(reps.concat(notes.length ? [{ notes }] : []));
    }
    function shopXP(n) { award(n, 0); const out = flushXP([]); const msg = out.join(' '); hint.textContent = msg; lvMsg = msg; lvMsgAt = Date.now(); }
    let lvMsg = '', lvMsgAt = 0;
    const modMax = k => Math.max(2, Math.round((E.moduleCost.maxLevel || {})[k] || 30));
    function upgradeMod(k) { const c = modCost(k); if (S.dust < c || lvl(k) >= modMax(k)) return; S.dust -= c; S.mods[k] = lvl(k) + 1; shopXP(15); save(); draw(); }
    function upgradeFac(p, f) { const lv = f.lv || 1, c = facCost(lv + 1); if (lv >= FAC_MAX || S.dust < c) return; S.dust -= c; f.lv = lv + 1;
      const st = S.cnt.facRow = S.cnt.facRow || { k: null, n: 0, best: {} }; st.n = st.k === f.k ? st.n + 1 : 1; st.k = f.k; st.best[f.k] = Math.max(st.best[f.k] || 0, st.n); shopXP(10 + 5 * lv); save(); draw(); }

    /* ---------- UI ---------- */
    const tabTimer = el('button', { type: 'button', role: 'tab', 'aria-selected': 'true', onclick: () => tab('timer') }, 'Voyage');
    const tabLog = el('button', { type: 'button', role: 'tab', 'aria-selected': 'false', onclick: () => tab('log') }, 'Logbook');
    const tabShip = el('button', { type: 'button', role: 'tab', 'aria-selected': 'false', onclick: () => tab('ship') }, 'Ship');
    const modeBtns = Object.keys(MODES).map(m => el('button', { type: 'button', class: 'sl-mode', 'data-m': m, onclick: () => { if (!running) setMode(m); } }, MODES[m]));
    const bigText = el('span', {}), dots = el('span', { class: 'sl-dots', 'aria-hidden': 'true' });
    const timeText = el('div', { class: 'sl-time' }, '25:00');
    const screen = el('div', { class: 'sl-screen sunken', 'aria-live': 'off' }, el('div', { class: 'sl-big' }, bigText, dots), timeText);
    let dotN = 0, dotT = 0;
    function headline() {
      if (expediting() && mode === 'focus') return !running ? (left > 0 && left < length(mode) ? 'Holding position' : 'Expedition: leg ' + (S.exp.step + 1) + ' of ' + EXP_LEN) : 'On the expedition';
      if (hunting() && mode === 'focus') return !running ? (left > 0 && left < length(mode) ? 'Holding position' : 'Ready to hunt ' + S.mw.name) : 'Hunting ' + S.mw.name;
      if (campaigning() && mode === 'focus') return !running ? (left > 0 && left < length(mode) ? 'Holding position' : 'Ready to follow the trail') : 'Following the Meridian\'s trail';
      if (S.dr && mode === 'focus') return !running ? (left > 0 && left < length(mode) ? 'Holding position' : 'Distress Run: Act ' + ROMAN(S.dr.n + 1)) : 'Answering the distress call';
      const b = building(), c = charging(), d = !b && !c && discovering() && atP(), o = !b && !c && !d && heldP();
      if (d) return !running ? (left > 0 && left < length(mode) ? 'Holding position' : 'Ready to survey') : 'Surveying ' + nm(d) + ' for collectibles';
      if (!running) return left > 0 && left < length(mode) ? 'Holding position' : mode === 'focus' ? (b ? (b.k === 'upgrade' ? 'Ready to upgrade' : 'Ready to build') : c ? 'Ready to charge' : o ? 'Outlaws ahead' : S.coord ? 'Ready for a lucky launch' : 'Ready for launch') : 'Docked. Take a breather';
      return mode === 'focus' ? (b ? jobText(b) : c ? 'Recharging Interplanetary Coordinator' : o ? 'Fighting ' + o.outlaw.gang + ' on ' + nm(o) : S.coord ? 'Following the Coordinator to a promising world' : 'Traveling to an uncharted world') : 'Preparing equipment for the next mission';
    }
    function drawDots() { const n = running ? dotN % 4 : 0; dots.replaceChildren(...[0, 1, 2].map(i => el('i', { class: i < n ? '' : 'off' }, '.'))); }
    const barFill = el('div', { class: 'sl-fill' });
    const bar = el('div', { class: 'sl-bar sunken', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100 }, barFill);
    const startB = el('button', { type: 'button', class: 'btn sl-go', onclick: () => running ? pause() : start() }, 'Launch');
    const resetB = el('button', { type: 'button', class: 'btn', title: 'Start this leg over (a trip stopped early finds nothing)', onclick: () => reset() }, 'Reset');
    const skipB = el('button', { type: 'button', class: 'btn', title: 'Skip to the next part', onclick: () => skip() }, 'Skip');
    const hint = el('div', { class: 'sl-hint' });
    const trans = el('div', { class: 'sl-trans', hidden: true });
    const card = el('div', { class: 'sl-card', hidden: true });
    const encBox = el('div', { class: 'sl-enc', hidden: true, 'aria-live': 'polite' });
    const sel = (k, opts) => { const s = el('select', { 'aria-label': k }, opts.map(v => el('option', { value: v, selected: S.set[k] === v || null }, String(v)))); s.addEventListener('change', () => { S.set[k] = +s.value; save(); if (!running && mode === k) { left = length(mode); persistRun(); } draw(); }); return s; };
    const settings = el('details', { class: 'sl-set' }, el('summary', {}, 'Settings'),
      el('div', { class: 'sl-set-row' },
        el('label', {}, 'Study ', sel('focus', [1, 10, 15, 20, 25, 30, 40, 45, 50, 60]), ' min'),
        el('label', {}, 'Short break ', sel('short', [3, 5, 7, 8, 10]), ' min'),
        el('label', {}, 'Long break ', sel('long', [10, 15, 20, 30]), ' min'),
        el('label', {}, 'Long break every ', sel('every', [2, 3, 4, 5, 6]), ' study sessions')));
    // what the next study session is for: travel to a new world, or build a Listening Post on one you've found
    // the mission: what this study session is for. Exactly one is pressed.
    const MISSIONS = [['explore', '🚀', 'Explore', 'Find a new world'], ['discover', '🔍', 'Discover', 'Survey the world you\'re at for collectibles'], ['build', '🗼', 'Build', 'Build a Listening Post, upgrade one to a Travelers\' Post, or add a facility'], ['charge', '🧭', 'Charge', 'Charge the Interplanetary Coordinator: your chips count double on the next Explore, and it steers toward better worlds'], ['campaign', '📼', 'Campaign', 'Follow the Meridian\'s trail to their next log'], ['expedition', '🗺', 'Expedition', 'Take the next leg of your expedition'], ['hunt', '🎯', 'Hunt', 'Track down the Most Wanted (two sessions)']];
    const curMission = () => S.mission > 0 ? 'build' : S.mission === -1 ? 'charge' : S.mission === -2 ? 'discover' : S.mission === -3 ? 'campaign' : S.mission === -4 ? 'expedition' : S.mission === -5 ? 'hunt' : 'explore';
    function setMission(m, num) {
      if (running && mode === 'focus') return;
      if (m === 'explore') S.mission = 0;
      else if (m === 'charge') { if (S.coord) return; S.mission = -1; }
      else if (m === 'discover') { const a = atP(); if (!a || held(a)) return; S.mission = -2; }
      else if (m === 'campaign') { if (campDone()) return; S.mission = -3; }
      else if (m === 'expedition') { if (!S.exp) return; S.mission = -4; }
      else if (m === 'hunt') { if (!mwReady()) return; S.mission = -5; }
      else { if (building()) { S.mission = 1; } else { const o = buildOptions(), first = (o.Facilities[0] || o.Upgrades[0] || o['New Listening Posts'][0]); if (!first) return; S.mission = 1; S.job = { k: first.k, num: first.num, fac: first.fac }; } }
      save(); hint.textContent = ''; draw();
    }
    const MIS_ORDER = ['explore', 'discover', 'charge', 'build', 'campaign', 'expedition', 'hunt'];
    const misBtns = MIS_ORDER.map(k => MISSIONS.find(m => m[0] === k)).map(([k, ic, label, tip], i) => el('button', { type: 'button', class: 'sl-mis', 'data-m': k, 'data-key': i + 1, role: 'radio', title: tip + ' (key ' + (i + 1) + ')', onclick: () => setMission(k) }, el('span', { class: 'sl-mis-i', 'aria-hidden': 'true' }, ic), label));
    const buildSel = el('select', { class: 'sl-build-sel', 'aria-label': 'World to build on' });
    buildSel.addEventListener('change', () => setJob(buildSel.value));
    const mission = el('div', { class: 'sl-missions' }, el('span', { class: 'sl-mis-l' }, 'Mission:'), el('div', { class: 'sl-mis-g', role: 'radiogroup', 'aria-label': 'Mission' }, misBtns), buildSel);
    const lvStrip = el('div', { class: 'sl-lv', title: 'Captain Level (XP) and Knowledge Level. Details on Ship → Captain.' });
    function lvBar(k, ic, list, full) {
      const i = lvInfo(S[k]), pct = i.need ? Math.round(i.into / i.need * 100) : 100, t = titleOf(list, i.L);
      const bar = el('span', { class: 'sl-lv-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-label': (k === 'xp' ? 'Captain' : 'Knowledge') + ' level progress' },
        el('i', { style: 'width:' + pct + '%' }), el('em', {}, i.need ? i.into + ' / ' + i.need : 'MAX'));
      if (!full) return el('span', { class: 'sl-lv-i sl-lv-' + k }, el('b', {}, ic + ' Lv ' + i.L), el('span', { class: 'sl-lv-t' }, t), bar);
      return el('div', { class: 'sl-lv-row sl-lv-' + k },
        el('div', { class: 'sl-lv-head' }, el('b', {}, ic + ' ' + (k === 'xp' ? 'Captain' : 'Knowledge') + ' Level ' + i.L), el('span', {}, t)), bar,
        el('small', { class: 'sl-muted' }, i.need ? (i.need - i.into) + (k === 'xp' ? ' XP' : ' Knowledge') + ' to Lv ' + (i.L + 1) : 'Maxed out. ' + (S[k] || 0).toLocaleString() + ' total.'));
    }
    function rtBar(full) {
      const v = rating(), i = rankOf(v), lo = RANKS[i][0], hi = RANKS[i + 1] ? RANKS[i + 1][0] : 0, pct = hi ? Math.round((v - lo) / (hi - lo) * 100) : 100;
      const bar = el('span', { class: 'sl-lv-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-label': 'Rating progress to the next rank' }, el('i', { style: 'width:' + pct + '%' }), el('em', {}, hi ? (v - lo) + ' / ' + (hi - lo) : 'MAX'));
      if (!full) return el('span', { class: 'sl-lv-i sl-lv-rt', title: 'Rating: everything you have done, added up. Details on Ship → Captain.' }, el('b', {}, '◆ ' + v.toLocaleString()), el('span', { class: 'sl-lv-t' }, RANKS[i][1]), bar);
      return el('div', { class: 'sl-lv-row sl-lv-rt' }, el('div', { class: 'sl-lv-head' }, el('b', { class: 'sx-rt-n' }, v.toLocaleString()), el('span', {}, RANKS[i][1])), bar,
        el('small', { class: 'sl-muted' }, hi ? (hi - v).toLocaleString() + ' to ' + RANKS[i + 1][1] : 'The highest rank there is.'));
    }
    function drawLv() { lvStrip.replaceChildren(rtBar(), lvBar('xp', '⭐', CAPT), lvBar('kn', '📚', KNOW)); }
    const drBox = el('div', { class: 'sl-dr', hidden: true });
    function drawDr() {
      if (S.dr) {
        const [ic, title] = DISTRESS[S.dr.sc], ab = el('button', { type: 'button', class: 'btn', disabled: (running && mode === 'focus') || null, title: 'Give up today\'s run (no reward, and it still counts as today\'s)' }, 'Abandon');
        ab.addEventListener('click', () => { if (!ab.classList.contains('arm')) { ab.classList.add('arm'); ab.textContent = 'Click again to abandon'; return; } drAbandon(); });
        drBox.hidden = false; drBox.className = 'sl-dr on';
        drBox.replaceChildren(el('div', { class: 'sl-dr-h' }, '🆘 Distress Run: ' + title), el('div', { class: 'sl-dr-legs' }, Array.from({ length: S.dr.need }, (_, i) => el('span', { class: i < S.dr.n ? 'done' : i === S.dr.n ? 'now' : '' }, 'Act ' + ROMAN(i + 1)))), el('div', { class: 'sl-dr-row' }, el('span', { class: 'sl-muted' }, 'Other missions are locked until the run is over.'), ab));
      } else if (drAvail()) {
        drBox.hidden = false; drBox.className = 'sl-dr offer';
        drBox.replaceChildren(el('div', { class: 'sl-dr-h' }, '🆘 Distress call received!'), el('p', {}, 'Someone out there needs help. Answering takes this whole cycle (' + S.set.every + ' study sessions) with no other missions, and pays about ✦ ' + E.distressRun.base + '–' + (E.distressRun.base + E.distressRun.random) + ' plus a random bonus, XP and Knowledge. One run a day.'),
          el('div', { class: 'sl-dr-row' }, el('button', { type: 'button', class: 'btn sl-go', onclick: drAccept }, 'Accept Distress Run')));
      } else { drBox.hidden = true; drBox.replaceChildren(); }
    }
    // ---------- the HUD: everything floats on black space. The page shell draws the planet into .sx-planet ----------
    // backup, restore and a fresh start
    function saveTools() {
      const box = el('div', {});
      const dl = el('button', { type: 'button', class: 'btn', onclick: () => {
        save(); const blob = new Blob([localStorage.getItem(KEY) || '{}'], { type: 'application/json' }), a = el('a', { href: URL.createObjectURL(blob), download: 'solarist-save-' + today() + '.json' });
        document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); } }, 'Download a backup');
      const file = el('input', { type: 'file', accept: '.json,application/json', hidden: true });
      file.addEventListener('change', () => { const f = file.files[0]; if (!f) return; f.text().then(t => { const d = JSON.parse(t); if (!d || typeof d !== 'object' || !Array.isArray(d.found)) throw new Error('not a save');
        wiping = true; localStorage.setItem(KEY, t); location.reload(); }).catch(() => { msg.textContent = 'That file isn\'t a Solarist save.'; }); });
      const up = el('button', { type: 'button', class: 'btn', onclick: () => file.click() }, 'Restore a backup');
      const wipe = el('button', { type: 'button', class: 'btn sx-danger' }, 'Start over from scratch');
      let stage = 0;
      wipe.addEventListener('click', () => {
        if (stage === 0) { stage = 1; wipe.classList.add('arm'); wipe.textContent = 'Erase everything? Click again'; setTimeout(() => { if (stage === 1) { stage = 0; wipe.classList.remove('arm'); wipe.textContent = 'Start over from scratch'; } }, 5000); return; }
        wiping = true; clearInterval(tickT); try { localStorage.removeItem(KEY); localStorage.removeItem(OLD_KEY); } catch (e) {} location.reload();
      });
      const msg = el('p', { class: 'sl-muted' }, 'Starting over erases every world, item, post, crew member and level. Download a backup first if you might want it back.');
      box.append(el('div', { class: 'sx-row' }, dl, up, wipe, file), msg);
      return box;
    }
    const sec = (title, ...kids) => el('div', { class: 'sx-sec' }, title ? el('h3', {}, title) : null, ...kids);
    const cycleBar = el('div', { class: 'sx-cycle', 'aria-hidden': 'true' });
    const nameBox = el('button', { type: 'button', class: 'sx-name', title: 'Open in the Logbook' });
    const planetSpot = el('div', { class: 'sx-planet', 'aria-hidden': 'true' });
    const leftCol = el('section', { class: 'sx-side sx-left', 'aria-label': 'Quests' });
    const rightCol = el('section', { class: 'sx-side sx-right', 'aria-label': 'Resources and upgrades' });
    const feedLine = el('button', { type: 'button', class: 'sx-feed', title: 'All transmissions and the ship\'s log', onclick: () => { rightTab = 'tx'; txFilter = 'all'; tab('timer'); drawRight(); } });
    const reportBtn = el('button', { type: 'button', class: 'sl-link sx-replay', hidden: true, onclick: () => openReport(true) }, 'Last session report');
    const reportSide = el('aside', { class: 'sx-report-side', hidden: true, 'aria-label': 'Survey data' });
    const report = el('div', { class: 'sx-report', hidden: true, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Session report' },
      el('div', { class: 'sx-report-row' }, el('div', { class: 'sx-report-in' }, el('h2', {}, 'Session report'), encBox, trans, card, el('div', { class: 'sx-report-ft' }, el('button', { type: 'button', class: 'btn sl-go', onclick: () => closeReport() }, 'Continue'))), reportSide));
    report.addEventListener('click', e => { if (e.target === report) closeReport(); });
    let typeT = 0;
    function typeOut() { // campaign logs and transmissions print like an old ship terminal; a click on the report finishes them
      clearInterval(typeT);
      if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const ps = [...trans.querySelectorAll('.sx-camp p:not(.sl-ev-got), .sl-trans-i:not(.sl-notes):not(.sl-event) > p')].filter(p => p.textContent.length > 0);
      const full = ps.map(p => p.textContent); ps.forEach(p => { p.textContent = ''; p.classList.add('sx-type'); });
      let i = 0, k = 0;
      const done = () => { clearInterval(typeT); ps.forEach((p, j) => { p.textContent = full[j]; p.classList.remove('sx-type'); }); report.removeEventListener('pointerdown', done); };
      report.addEventListener('pointerdown', done);
      typeT = setInterval(() => { if (i >= ps.length) return done(); k += 2; ps[i].textContent = full[i].slice(0, k); if (k >= full[i].length) { ps[i].classList.remove('sx-type'); i++; k = 0; } }, 22);
    }
    function openReport(replay) { if (trans.hidden && card.hidden && encBox.hidden) return; report.hidden = false; reportBtn.hidden = false; if (!replay) typeOut(); const b = report.querySelector('.sx-report-ft .btn'); if (b) b.focus({ preventScroll: true }); }
    function closeReport() { report.hidden = true; }
    const status = el('span', { class: 'sx-cap' }), status2 = el('span', { hidden: true });
    const timeBlock = el('div', { class: 'sx-clock' }, screen, cycleBar, status);
    const midCol = el('section', { class: 'sx-mid' }, nameBox, planetSpot, timeBlock, mission, el('div', { class: 'sl-btns' }, startB, resetB, skipB), hint, reportBtn);
    settings.open = true;
    const appSettings = el('div', { class: 'sx-appset' });
    const settingsPane = el('div', { class: 'sl-pane', hidden: true },
      sec('Timer', settings), sec('Your save', saveTools()), sec('Switch the timer by hand', el('p', { class: 'sl-muted' }, 'Normally Solarist moves between study and breaks for you.'), el('div', { class: 'sl-modes' }, modeBtns)), sec('App', appSettings));
    const find = el('input', { type: 'search', class: 'sl-find', placeholder: 'Search worlds...', 'aria-label': 'Search your logbook' });
    const typeSel = el('select', { 'aria-label': 'Planet class' }, el('option', { value: '' }, 'All classes'), el('option', { value: '@post' }, 'With a Listening Post'), ...Object.keys(TYPES).map(t => el('option', { value: t }, t)));
    const rarSel = el('select', { 'aria-label': 'Rarity' }, el('option', { value: '' }, 'Any rarity'), ...RARITY.map(([k]) => el('option', { value: k }, k)));
    const logHead = el('div', { class: 'sl-ahead' });
    const logList = el('div', { class: 'sl-list' });
    const logPane = el('div', { class: 'sl-pane', hidden: true }, logHead, el('div', { class: 'sl-tools' }, typeSel, rarSel, find), logList);
    const shipPane = el('div', { class: 'sl-pane', hidden: true });
    const itemsPane = el('div', { class: 'sl-pane', hidden: true });
    const tabItems = el('button', { type: 'button', onclick: () => tab('items') }, 'Collection');
    const tabSet = el('button', { type: 'button', onclick: () => tab('settings') }, 'Settings');
    const tabMap = el('button', { type: 'button', onclick: () => tab('map') }, 'Star map');
    const mapPane = el('div', { class: 'sl-pane sx-mappane', hidden: true });
    const pageTitle = el('h2', { class: 'sx-page-t' });
    const page = el('div', { class: 'sx-page', hidden: true },
      el('div', { class: 'sx-page-h' }, pageTitle, el('button', { type: 'button', class: 'btn', onclick: () => tab('timer') }, 'Back to the voyage')),
      el('div', { class: 'sl-body' }, logPane, shipPane, itemsPane, mapPane, settingsPane));
    [tabTimer, tabLog, tabShip].forEach(b => b.removeAttribute('role'));
    root.classList.add('sx');
    root.replaceChildren(el('header', { class: 'sx-top' }, lvStrip, el('nav', { class: 'sx-nav', 'aria-label': 'Pages' }, tabLog, tabMap, tabShip, tabItems, tabSet)), leftCol, midCol, rightCol, feedLine, report, page, el('div', { hidden: true }, tabTimer, status2));
    function tab(t) {
      if (t === 'log' && !logPane.hidden && !page.hidden) openNum = null; // pressing Logbook again goes back to the grid
      const names = { log: 'Logbook', ship: 'Ship', items: 'Collection', settings: 'Settings', map: 'Star map' };
      page.hidden = t === 'timer'; pageTitle.textContent = names[t] || '';
      [[tabLog, 'log'], [tabMap, 'map'], [tabShip, 'ship'], [tabItems, 'items'], [tabSet, 'settings']].forEach(([b, k]) => { if (k === t) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
      logPane.hidden = t !== 'log'; shipPane.hidden = t !== 'ship'; itemsPane.hidden = t !== 'items'; settingsPane.hidden = t !== 'settings'; mapPane.hidden = t !== 'map';
      root.classList.toggle('paged', t !== 'timer');
      if (t === 'ship') drawShip();
      if (t === 'items') drawItems();
      if (t === 'log') drawLog();
      if (t === 'map') drawMap();
      if (t === 'settings' && hooks.settings) hooks.settings(appSettings);
      if (t !== 'timer') { const bd = root.querySelector('.sl-body'); if (bd && t !== 'log') bd.scrollTop = 0; }
    }
    // the world shown in the middle of the screen
    function scenePlanet(kind) {
      const b = building();
      return kind === 'build' ? (b.p || atP()) : kind === 'fight' ? heldP() : kind === 'distress' || (kind === 'campaign' && running) ? null : kind === 'explore' && running ? null : atP();
    }
    const sceneKind = () => mode !== 'focus' ? 'break' : S.dr ? 'distress' : campaigning() || expediting() ? 'campaign' : hunting() ? 'fight' : building() ? (building().k === 'room' ? 'shipbuild' : 'build') : charging() ? 'charge' : discovering() ? 'discover' : heldP() ? 'fight' : 'explore';
    function drawName() {
      const kind = sceneKind(), p = scenePlanet(kind);
      nameBox.disabled = !p;
      nameBox.replaceChildren(...(p ? [el('b', {}, nm(p)), el('span', {}, p.type + ' world, ', el('i', { class: 'sx-r-' + p.rarity.toLowerCase() }, p.rarity), ', ' + (p.x || (p.x = makeExtra(p))).hab + '% habitable' + (held(p) ? ', held by outlaws' : ''))]
        : hunting() && mode === 'focus' ? [el('b', {}, S.mw.name), el('span', {}, 'Most Wanted hunt, Act ' + ROMAN(S.mw.act + 1) + ' of II')]
        : expediting() && mode === 'focus' && !p ? [el('b', {}, EXPED[S.exp.id][1]), el('span', {}, 'Expedition, leg ' + (S.exp.step + 1) + ' of ' + EXP_LEN)]
        : kind === 'distress' ? [el('b', {}, DISTRESS[S.dr.sc][1]), el('span', {}, 'Distress Run, Act ' + ROMAN(S.dr.n + 1) + ' of ' + ROMAN(S.dr.need))]
          : [el('b', {}, 'Uncharted world'), el('span', {}, S.coord ? 'Following the Coordinator' : 'Somewhere ahead')]));
      nameBox.onclick = p ? () => { tab('log'); openWorld(p.num); } : null;
    }
    function drawCycle(pct) { // one segment per study session, a short tick per short break, a long one for the long break
      const n = S.set.every, done = mode === 'focus' ? S.cycle % n : (S.cycle % n || n), kids = [];
      for (let i = 0; i < n; i++) {
        const st = i < done ? 'done' : i === done && mode === 'focus' ? 'now' : '';
        kids.push(el('span', { class: 'st ' + st, style: st === 'now' ? '--p:' + pct + '%' : null }));
        const bst = mode !== 'focus' && i === done - 1 ? 'now' : i < done - 1 ? 'done' : '';
        kids.push(el('span', { class: (i === n - 1 ? 'lb ' : 'sb ') + bst, style: bst === 'now' ? '--p:' + pct + '%' : null }));
      }
      cycleBar.replaceChildren(...kids);
      cycleBar.classList.toggle('broken', !!S.fc.broken);
    }
    function drawLeft() {
      const drInfo = !S.dr && !drAvail() ? el('p', { class: 'sl-muted' }, S.drDay === today() ? 'Today\'s run is done. A new distress call comes in tomorrow.' : S.fcDay === today() ? 'A distress call comes in at the start of your next cycle.' : 'Finish a whole cycle without skipping (a Full Cycle) and a distress call comes in after the long break.') : null;
      const qs = S.bounties.map(b => el('div', { class: 'sx-q' }, el('span', {}, b.t, el('small', {}, b.k === 'sessions' ? (b.prog || 0) + ' of ' + b.v + ' done' : b.k === 'cycle' ? 'finish a whole cycle, nothing skipped' : 'on any Explore trip')), el('em', {}, '✦ ' + Math.round(b.reward * INCOME))));
      const coordB = !S.coord && !S.dr ? el('button', { type: 'button', class: 'sl-link', disabled: (running && mode === 'focus') || charging() || null, onclick: () => setMission('charge') }, charging() ? 'Charging next session' : 'Charge it next session') : null;
      const lock = running && mode === 'focus';
      const legBar = (n, now, total, label) => el('div', { class: 'sl-dr-legs sx-legs' }, Array.from({ length: total }, (_, k) => el('span', { class: k < n ? 'done' : k === now ? 'now' : '' }, label(k))));
      let expSec;
      if (S.exp) {
        const [ic, title, , legs] = EXPED[S.exp.id], st = S.exp.step, lg = legs[st];
        expSec = sec('Expedition', el('p', { class: 'sx-q-h' }, ic + ' ' + title), legBar(st, st, EXP_LEN, k => k < EXP_LEN - 1 ? String(k + 1) : '★'),
          lg ? el('p', {}, lg[0]) : el('p', {}, 'The last leg. One more session to finish and collect.'),
          lg ? el('div', { class: 'sx-paths', role: 'radiogroup', 'aria-label': 'Path' }, [1, 2].map(o => el('button', { type: 'button', role: 'radio', 'aria-checked': String(S.exp.pick === o - 1), disabled: lock || null, onclick: () => { S.exp.pick = o - 1; save(); drawLeft(); } },
            el('b', {}, lg[o][0]), el('small', {}, o === 1 ? 'Safe: ✦ ' + Math.round(E.quests.expeditionSafe * INCOME) : 'Bold: maybe a collectible')))) : null,
          el('div', { class: 'sx-row-l' }, expediting() ? el('span', { class: 'sl-muted' }, 'Next session continues it. ') : el('button', { type: 'button', class: 'sl-link', disabled: lock || !!S.dr || null, onclick: () => setMission('expedition') }, 'Continue next session'),
            expediting() ? el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => { S.mission = 0; save(); hint.textContent = ''; draw(); } }, 'Pause it') : null, armBtn('Abandon', 'Sure?', expAbandon, 'sx-mini')));
      } else if (expAvail()) {
        const [ic, title, intro] = EXPED[expOffer()];
        expSec = sec('Expedition', el('p', { class: 'sx-q-h' }, ic + ' ' + title), el('p', {}, intro),
          el('p', { class: 'sl-muted' }, EXP_LEN + ' study sessions, any time you like. Pays ✦ ' + Math.round(E.quests.expedition * INCOME) + ' and a Rare or better find.'),
          el('button', { type: 'button', class: 'sl-link', disabled: lock || !!S.dr || null, onclick: expStart }, 'Start the expedition'));
      } else expSec = sec('Expedition', el('p', { class: 'sl-muted' }, 'Back from the last one. A new expedition offer comes tomorrow. ' + (S.expDone || 0) + ' completed so far.'));
      dlCheck();
      const dlRow = r => el('li', {}, DREQ[r.k][1](r.v)), here = atP(), dA = S.dl.active;
      const dlSec = dA ? sec('Interstellar Delivery', el('p', { class: 'sx-q-h' }, '📦 ' + dName(dA)), el('p', { class: 'sl-muted' }, dA.client + ' wants ' + dA.cargo + ' taken to a world with:'),
          el('ul', { class: 'sx-reqs' }, dA.reqs.map(r => el('li', { class: here && here.num !== dA.from && dMet(here, r) ? 'ok' : '' }, DREQ[r.k][1](r.v)))),
          el('p', { class: 'sl-muted' }, 'Pays ✦ ' + Math.round(dA.pay * INCOME) + ' on a perfect match (it delivers itself when you arrive at one).'),
          el('div', { class: 'sx-row-l' }, here && here.num !== dA.from ? el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => dlDeliver(here) }, 'Deliver at ' + nm(here) + ' now (' + Math.round(dlScore(here) * 100) + '% match, ✦ ' + Math.round(dlPayAt(here) * INCOME) + ')') : el('span', { class: 'sl-muted' }, 'Travel somewhere new to deliver. '),
            armBtn('Abandon', 'Sure?', dlAbandon, 'sx-mini')))
        : sec('Interstellar Delivery', S.dl.offers.length ? el('p', { class: 'sl-muted' }, 'Pick one job. ' + S.dl.offers.length + ' left today.') : el('p', { class: 'sl-muted' }, 'No more jobs today. New ones come tomorrow. ' + S.dl.done + ' delivered so far.'),
          ...S.dl.offers.map((d, i) => el('div', { class: 'sx-offer' }, el('div', { class: 'sx-q' }, el('span', {}, '📦 ' + dName(d), el('small', {}, d.cargo)), el('em', {}, '✦ ' + Math.round(d.pay * INCOME))),
            el('ul', { class: 'sx-reqs' }, d.reqs.map(dlRow)), el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => dlAccept(i) }, 'Take this job'))));
      const m = S.mw, mwSec = m ? sec('Most Wanted', el('p', { class: 'sx-q-h' }, '🎯 ' + m.name), el('p', { class: 'sl-muted' }, 'Boss of ' + m.gang + '.'),
          legBar(m.clues, m.clues, m.need, () => '🔎'),
          mwReady() ? (hunting() ? el('p', { class: 'sl-muted' }, m.act ? 'Act II next session. ' : 'The hunt starts next session (two sessions). ', el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => { S.mission = 0; save(); hint.textContent = ''; draw(); } }, 'Not yet'))
            : el('button', { type: 'button', class: 'sl-link', disabled: lock || !!S.dr || null, onclick: () => setMission('hunt') }, m.act ? 'Finish the hunt next session' : 'Hunt them down next session'))
            : el('p', { class: 'sl-muted' }, 'Clues ' + m.clues + ' of ' + m.need + '. Explore, survey and fight outlaws to find more.'))
        : sec('Most Wanted', el('p', { class: 'sl-muted' }, 'No poster yet. Drive out ' + Math.max(1, mwAt() - (S.fights || 0)) + ' more outlaw gang' + (mwAt() - (S.fights || 0) === 1 ? '' : 's') + ' and the Guild names a boss to hunt. ' + (S.mwDone || 0) + ' caught so far.'));
      wkCheck();
      const wk = S.wk, wkSec = sec('Guild Contract', ...wk.goals.map(g => { const pr = wkProg(g); return el('div', { class: 'sx-q' + (pr >= g.n ? ' done' : '') }, el('span', {}, WK_GOALS[g.k][0].replace('{n}', g.n)), el('em', {}, pr >= g.n ? '✓' : pr + ' / ' + g.n)); }),
        wk.claimed ? el('p', { class: 'sl-muted' }, 'Paid out. A new contract comes on Monday.')
          : wkDone() ? el('div', { class: 'sx-claim' }, el('p', {}, 'All done! Pick your pay:'), el('div', { class: 'sx-row-l' },
            el('button', { type: 'button', class: 'btn sx-buy', onclick: () => wkClaim('dust') }, '✦ ' + Math.round(E.quests.contract * INCOME)), el('button', { type: 'button', class: 'btn sx-buy', onclick: () => wkClaim('kp') }, E.quests.contractKnowledge + ' Knowledge'), el('button', { type: 'button', class: 'btn sx-buy', onclick: () => wkClaim('item') }, 'A Rare find')))
            : el('p', { class: 'sl-muted' }, 'Finish all three this week (resets Monday).'));
      leftCol.replaceChildren(
        sec('Distress Run', drBox, drInfo), expSec, dlSec, mwSec, wkSec,
        sec('Bounties', ...qs, el('p', { class: 'sl-muted' }, S.bDone + ' completed so far')),
        CAMP ? sec(CAMP.title || 'Campaign', el('div', { class: 'sx-camp-bar' }, el('i', { style: 'width:' + Math.round(S.camp.n / CAMP.logs.length * 100) + '%' })),
          el('p', {}, campDone() ? 'Complete. All ' + CAMP.logs.length + ' logs recovered.' : 'Log ' + S.camp.n + ' of ' + CAMP.logs.length + (S.camp.n ? '. ' + actOf(S.camp.n) : '. A trail of old log beacons left by the lost survey ship Meridian.')),
          campDone() ? null : campaigning() ? el('p', { class: 'sl-muted' }, 'Following the trail next session. ', el('button', { type: 'button', class: 'sl-link', disabled: (running && mode === 'focus') || null, onclick: () => { S.mission = 0; save(); hint.textContent = ''; draw(); } }, 'Stop'))
            : el('button', { type: 'button', class: 'sl-link', disabled: (running && mode === 'focus') || !!S.dr || null, onclick: () => setMission('campaign') }, S.camp.n ? 'Continue next session' : 'Start the campaign next session'),
          S.camp.n ? el('div', {}, el('button', { type: 'button', class: 'sl-link sx-readlogs', onclick: () => { rightTab = 'tx'; txFilter = 'camp'; drawRight(); } }, 'Read the logs')) : null) : null,
        sec('Interplanetary Coordinator', el('p', {}, S.coord ? 'Charged. Next Explore, every chip counts double.' : 'Empty. One study session of Charge doubles your chips for the next Explore.'),
          el('p', { class: 'sl-muted' }, chipsPut() + ' of ' + S.chips.own + ' chips placed' + (chipsPut() ? ': ' + CHIP_F.filter(f => S.chips.put[f[0]]).map(f => f[1] + ' ' + S.chips.put[f[0]]).join('  ') : '.')),
          el('div', { class: 'sx-row-l' }, coordB, el('button', { type: 'button', class: 'sl-link', onclick: () => { rightTab = 'coord'; drawRight(); } }, 'Open the panel'))));
    }
    // the right side has two tabs: Upgrades (what resources buy) and Transmissions (everything your posts and the ship heard)
    let rightTab = 'up';
    // every kind of log in one place: post transmissions, the ship's log, Meridian logs, Ship Logs from research, medals
    const TXF = [['all', 'All'], ['post', 'Posts'], ['camp', 'Meridian'], ['arc', 'Ship Logs'], ['quest', 'Quests'], ['ship', 'Ship'], ['ev', 'Events'], ['res', 'Research'], ['ach', 'Medals']];
    let txFilter = 'all';
    const evCat = e => e.c || (/^Research/.test(e.title || '') ? 'res' : /^Achievement/.test(e.title || '') ? 'ach' : /^Ship activity|joined the crew|left the crew|^New room/.test(e.title || '') ? 'ship' : /^Distress/.test(e.title || '') ? 'quest' : 'ev');
    const whoOf = lg => (CAMP && CAMP.crew && CAMP.crew[lg.who]) || lg.who;
    function txFeed() {
      const feed = [];
      posts().forEach(f => f.p.post.reports.forEach(r => feed.push(Object.assign(repItem(f.p, r), { c: 'post' }))));
      S.events.forEach(e => feed.push({ at: e.at, k: 'ev', icon: e.ic, title: e.title, t: e.t, extra: e.got, c: evCat(e) }));
      if (CAMP) for (let i = 0; i < S.camp.n && CAMP.logs[i]; i++) feed.push({ at: S.camp.at[i] || 0, k: 'ev', icon: '📼', title: 'Meridian log ' + (i + 1) + ' · ' + whoOf(CAMP.logs[i]), t: CAMP.logs[i].t, c: 'camp' });
      Object.keys(S.slog).forEach(k => { const L = SHIP_LOGS[k]; if (L) feed.push({ at: S.slog[k], k: 'ev', icon: '🗄', title: L[0], t: slogText(L[1]), c: 'arc' }); });
      return feed.sort((a, b) => b.at - a.at);
    }
    function shipLogsView() { // Ship Logs read like a book: grouped by the research that unlocked them, locked ones listed at the end
      const out = [], locked = [];
      RESEARCH.forEach(([branch, list]) => list.forEach(([id, name, , , un]) => { if (!un || !un.logs) return;
        const got = un.logs.filter(k => S.slog[k] && SHIP_LOGS[k]);
        if (!got.length) { locked.push([name, branch, un.logs.length]); return; }
        out.push(el('div', { class: 'sx-arc' }, el('div', { class: 'sx-arc-h' }, el('span', {}, name), el('small', {}, branch)),
          got.map(k => el('div', { class: 'sx-arc-i' }, el('b', {}, SHIP_LOGS[k][0]), el('p', {}, slogText(SHIP_LOGS[k][1]))))));
      }));
      if (!out.length) out.push(el('p', { class: 'sl-muted' }, 'No Ship Logs yet. Research unlocks them: try Guild Records in the Archives branch.'));
      if (locked.length) out.push(el('div', { class: 'sx-arc locked' }, el('div', { class: 'sx-arc-h' }, el('span', {}, '🔒 ' + locked.reduce((a, l) => a + l[2], 0) + ' more in the Research tab')),
        el('p', { class: 'sl-muted' }, locked.map(([n, b]) => n + ' (' + b + ')').join(' · '))));
      return out;
    }
    function meridianView() { // the campaign, oldest first, by act
      if (!CAMP) return [el('p', { class: 'sl-muted' }, 'The campaign file (campaign.json) could not be loaded.')];
      if (!S.camp.n) return [el('p', { class: 'sl-muted' }, 'No Meridian logs yet. Start the campaign from the left side.')];
      const out = [], per = Math.ceil(CAMP.logs.length / (CAMP.acts || [1]).length);
      for (let a = 0; a * per < S.camp.n; a++) {
        const logs = CAMP.logs.slice(a * per, Math.min(S.camp.n, (a + 1) * per));
        out.push(el('div', { class: 'sx-sec' }, el('h3', {}, (CAMP.acts || [])[a] || 'Logs'), ...logs.map((lg, i) => campLog(lg, a * per + i + 1))));
      }
      return out;
    }
    const txUnread = () => txFeed().filter(it => it.at > (S.txSeen || 0)).length;
    function drawRight() {
      const unread = txUnread();
      if (rightTab === 'tx' && unread) { S.txPrev = S.txSeen || 0; S.txSeen = Date.now(); save(); }
      const rt = (k, label, extra) => el('button', { type: 'button', role: 'tab', 'aria-selected': String(rightTab === k), onclick: () => { rightTab = k; drawRight(); } }, label, extra || null);
      const tabsR = focusLock() ? el('div', { class: 'sx-rtabs', role: 'tablist' }, rt('tx', 'Transmissions'), el('span', { class: 'sx-locknote' }, '🔒 Everything else is back at the break'))
        : el('div', { class: 'sx-rtabs', role: 'tablist' }, rt('up', 'Upgrades'), rt('build', 'Build'), rt('coord', 'Coordinator'), rt('research', 'Research'), rt('hangar', 'Hangar'), rt('sell', 'Sell'),
        el('i', { class: 'sx-rbreak', 'aria-hidden': 'true' }), rt('tx', '📡 Transmissions', rightTab !== 'tx' && unread ? el('i', { class: 'sx-dot', 'aria-label': unread + ' new' }, String(unread)) : null),
        S.trader ? rt('trade', '🏪 Trade', rightTab !== 'trade' ? el('i', { class: 'sx-dot sx-dot-amber' }, '!') : null) : null);
      if (rightTab === 'build') { rightCol.replaceChildren(tabsR, ...buildView()); return; }
      if (rightTab === 'sell') { rightCol.replaceChildren(tabsR, ...sellView()); return; }
      if (rightTab === 'research') { rightCol.replaceChildren(tabsR, ...researchView()); return; }
      if (rightTab === 'coord') { rightCol.replaceChildren(tabsR, ...coordView()); return; }
      if (rightTab === 'hangar') { rightCol.replaceChildren(tabsR, ...hangarView()); return; }
      if (rightTab === 'trade' && S.trader) { rightCol.replaceChildren(tabsR, ...tradeView()); return; }
      if (rightTab === 'trade') rightTab = 'up';
      if (rightTab === 'tx') {
        const feed = txFeed(), seen = S.txPrev || 0, cnt = {}, fresh = {};
        feed.forEach(it => { cnt[it.c] = (cnt[it.c] || 0) + 1; if (it.at > seen) fresh[it.c] = 1; });
        const chips = el('div', { class: 'sx-chips', role: 'tablist' }, TXF.filter(([k]) => k === 'all' || cnt[k] || k === 'camp' || k === 'arc').map(([k, label]) =>
          el('button', { type: 'button', role: 'tab', 'aria-selected': String(txFilter === k), class: fresh[k] || (k === 'all' && Object.keys(fresh).length) ? 'new' : null, onclick: () => { txFilter = k; drawRight(); rightCol.scrollTop = 0; } }, label, el('small', {}, String(k === 'all' ? feed.length : cnt[k] || 0)))));
        let body;
        if (txFilter === 'camp') body = meridianView();
        else if (txFilter === 'arc') body = shipLogsView();
        else { const list = txFilter === 'all' ? feed : feed.filter(it => it.c === txFilter);
          body = [list.length ? el('div', { class: 'sx-tx' }, renderFeed(list, 'rtx' + txFilter, true, drawRight))
            : el('p', { class: 'sl-muted' }, txFilter === 'all' ? 'Nothing yet. Build a Listening Post on a world and it sends a transmission every study session. Deep-space events, crew chatter, Meridian logs and medals all land here too.' : 'Nothing here yet.')]; }
        rightCol.replaceChildren(el('div', { class: 'sx-rhead' }, tabsR, chips), ...body);
        return;
      }
      const newTx = unread ? el('button', { type: 'button', class: 'sx-newtx', onclick: () => { rightTab = 'tx'; drawRight(); } }, el('b', {}, 'New transmission received'), el('span', {}, unread === 1 ? '1 new message' : unread + ' new messages')) : null;
      const trade = Math.round(tradeIncome() * INCOME);
      const up = (name, small, btn) => el('div', { class: 'sx-up' }, el('b', {}, name), el('small', {}, small), btn);
      const buy = (cost, onclick, label) => el('button', { type: 'button', class: 'btn sx-buy', disabled: S.dust < cost || null, onclick }, label || '✦ ' + cost.toLocaleString());
      const mods = Object.entries(MODS).map(([k, [, name, eff, what]]) => { const l = lvl(k), c = modCost(k), mx = l >= modMax(k); return up(name + ' ' + l + ' / ' + modMax(k), eff(l) + ' ' + what + (mx ? ' (max level)' : ' (next ' + eff(l + 1) + ')'), mx ? el('span', { class: 'sx-done' }, 'Max') : buy(c, () => upgradeMod(k))); });
      rightCol.replaceChildren(...[tabsR, newTx].filter(Boolean),
        el('div', { class: 'sx-res' }, el('b', {}, '✦ ' + S.dust.toLocaleString()), el('small', {}, 'resources' + (trade ? ', +' + trade + ' trade per session' : ''))),
        sec('Ship modules', ...mods));
    }
    // two-click buttons for things that can't be undone
    const armBtn = (label, armed, act, cls) => { const b = el('button', { type: 'button', class: 'btn ' + (cls || '') }, label);
      b.addEventListener('click', () => { if (!b.classList.contains('arm')) { b.classList.add('arm'); b.textContent = armed; setTimeout(() => { if (b.isConnected) { b.classList.remove('arm'); b.textContent = label; } }, 4000); return; } act(); }); return b; };
    // Build: pick a world, then everything you can build or upgrade there, in order
    let buildNum = null;
    function buildView() {
      const locked = running && mode === 'focus', bj = building(), out = [];
      const up = (name, small, btn, cls) => el('div', { class: 'sx-up' + (cls ? ' ' + cls : '') }, el('b', {}, name), small ? el('small', {}, small) : null, btn || null);
      const queue = key => { const on = bj && jobKey(bj) === key; return el('button', { type: 'button', class: 'btn sx-buy' + (on ? ' on' : ''), disabled: locked || on || !!S.dr || null, title: 'Your next study session builds it', onclick: () => setJob(key) }, on ? 'Queued' : 'Queue'); };
      // what's queued
      out.push(el('div', { class: 'sx-queue' + (bj ? ' on' : '') }, el('small', {}, 'Next study session'),
        el('b', {}, bj ? jobText(bj) : S.dr ? 'The Distress Run comes first' : 'Nothing queued'),
        bj && !locked ? el('button', { type: 'button', class: 'sl-link', onclick: () => { S.mission = 0; S.job = null; save(); hint.textContent = ''; draw(); } }, 'Cancel') : null));
      const all = S.found.slice().reverse().map(f => f.p);
      if (!all.length) buildNum = 0;
      if (buildNum == null || (buildNum !== 0 && !byNum(buildNum))) { const a = atP(); buildNum = (a && !held(a) ? a : posts().length ? posts()[posts().length - 1].p : all[0]).num; }
      const label = p => nm(p) + (S.at === p.num ? ' (here)' : '') + (p.post ? (p.post.tp ? ', Travelers\' Post' : ', Listening Post') : '') + (held(p) ? ', outlaws' : '');
      const withPost = all.filter(p => p.post), without = all.filter(p => !p.post);
      const pick = el('select', { class: 'sx-wpick', 'aria-label': 'World to build on' },
        el('option', { value: 0, selected: buildNum === 0 || null }, 'Your ship: ' + S.ship.name),
        withPost.length ? el('optgroup', { label: 'Your posts' }, withPost.map(p => el('option', { value: p.num, selected: p.num === buildNum || null }, label(p)))) : null,
        without.length ? el('optgroup', { label: 'Other worlds' }, without.slice(0, 300).map(p => el('option', { value: p.num, selected: p.num === buildNum || null }, label(p)))) : null);
      pick.addEventListener('change', () => { buildNum = +pick.value; drawRight(); });
      out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Where'), pick));
      if (buildNum === 0) { // rooms on your own ship
        const rows = Object.entries(ROOMS).map(([k, [ic, name, what]]) => { const lv = roomLv(k), c = roomCost(lv + 1);
          return up(ic + ' ' + name + (lv ? ' ' + lv : ''), what + (lv ? '' : '. Takes one study session.'), !lv ? queue('room:0:' + k) : lv >= ROOM_MAX ? el('span', { class: 'sx-done' }, 'Max') : el('button', { type: 'button', class: 'btn sx-buy', disabled: S.dust < c || null, onclick: () => upgradeRoom(k) }, '✦ ' + c.toLocaleString()), lv ? '' : 'unbuilt'); });
        out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Rooms'), el('p', { class: 'sl-muted' }, 'New rooms take a study session. Upgrades cost resources. Crew live in the Crew Quarters (Ship page, Crew).'), ...rows));
        return out;
      }
      const p = byNum(buildNum).p, rows = [];
      if (held(p)) rows.push(el('p', { class: 'sl-muted' }, 'Outlaws hold ' + nm(p) + '. Fight them off (Explore turns into Fight) before building here.'));
      else {
        // step 1 and 2: the post itself
        rows.push(p.post ? up('Listening Post', 'Built. ' + p.post.reports.length + ' transmissions so far.', el('span', { class: 'sx-done' }, 'Built'), 'built')
          : up('Listening Post', 'Hear transmissions from this world. One study session.', queue('post:' + p.num + ':')));
        rows.push(p.post && p.post.tp ? up('Travelers\' Post', tierOf(p.post.tp.pop || 0) + ', ' + (p.post.tp.pop || 0).toLocaleString() + ' settlers. Pays trade every session.', el('span', { class: 'sx-done' }, 'Built'), 'built')
          : p.post ? up('Travelers\' Post', 'Settlers, trade and facilities. One study session.', queue('upgrade:' + p.num + ':'))
            : up('Travelers\' Post', 'Needs a Listening Post first.', null, 'locked'));
        if (p.post) rows.push(el('div', { class: 'sx-row sx-postact' },
          S.tuned === p.num ? el('button', { type: 'button', class: 'btn', onclick: () => { S.tuned = 0; save(); draw(); } }, 'Untune satellite') : el('button', { type: 'button', class: 'btn', title: 'The tuned post reports every study session', onclick: () => { S.tuned = p.num; save(); draw(); } }, 'Tune satellite here'),
          el('button', { type: 'button', class: 'btn', onclick: () => rename(p) }, 'Rename')));
        out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Post'), ...rows));
        // step 3: facilities
        if (p.post && p.post.tp) {
          const built = p.post.tp.fac, frows = [];
          built.forEach(f => { const lv = f.lv || 1, max = lv >= FAC_MAX, c = facCost(lv + 1);
            frows.push(up(FAC[f.k][0] + ' ' + FAC[f.k][1] + ' ' + lv, max ? 'Max level' : 'Level ' + (lv + 1) + ': bigger numbers in its logs', max ? el('span', { class: 'sx-done' }, 'Max') : el('button', { type: 'button', class: 'btn sx-buy', disabled: S.dust < c || null, onclick: () => upgradeFac(p, f) }, '✦ ' + c.toLocaleString()))); });
          Object.keys(FAC).filter(k => !hasFac(p, k)).forEach(k => frows.push(up(FAC[k][0] + ' ' + FAC[k][1], FAC_DESC[k], queue('add:' + p.num + ':' + k), 'unbuilt')));
          out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Facilities ' + built.length + ' of ' + Object.keys(FAC).length), el('p', { class: 'sl-muted' }, 'New ones take a study session. Upgrades cost resources.'), ...frows));
        }
      }
      return out;
    }
    // Sell: survey rights go to the Cartographers' Guild
    let sellShow = 20;
    function sellView() {
      const out = [el('p', { class: 'sl-muted' }, 'The Cartographers\' Guild buys survey rights. The price follows the world\'s condition and how much it stands out. A sold world leaves your Logbook; records and collectibles stay.')];
      const list = S.found.map(f => f.p).filter(p => p.rarity === bulkR && !sellBlock(p) && !isRecord(p)), total = list.reduce((a, p) => a + sellPrice(p), 0);
      const rs = el('select', { 'aria-label': 'Rarity to sell' }, ['Common', 'Uncommon', 'Rare', 'Legendary'].map(r => el('option', { value: r, selected: r === bulkR || null }, r)));
      rs.addEventListener('change', () => { bulkR = rs.value; drawRight(); });
      out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Sell many at once'), el('div', { class: 'sx-row' }, rs, list.length ? armBtn('Sell ' + list.length + ' for ✦ ' + total.toLocaleString(), 'Click again to sell ' + list.length, () => { const got = sellWorlds(list); hint.textContent = 'Sold ' + list.length + ' ' + bulkR + ' world' + (list.length === 1 ? '' : 's') + ' for ✦ ' + got + '.'; draw(); }, 'sx-buy') : el('span', { class: 'sl-muted' }, 'None to sell')),
        el('p', { class: 'sl-muted' }, 'Skips posts, where you are, outlaw worlds, your next build and record holders.')));
      const sellable = S.found.slice().reverse().map(f => f.p).filter(p => !sellBlock(p)).map(p => [p, sellPrice(p)]).sort((a, b) => b[1] - a[1]);
      const rows = sellable.slice(0, sellShow).map(([p, v]) => el('div', { class: 'sx-up sx-sellrow' }, el('b', {}, nm(p)), el('small', {}, el('i', { class: 'sx-r-' + p.rarity.toLowerCase() }, p.rarity), ' ' + p.type + ', ' + p.x.hab + '% habitable' + (isRecord(p) ? ', holds a record' : '')),
        armBtn('✦ ' + v.toLocaleString(), 'Sell?', () => { const got = sellWorlds([p]); hint.textContent = 'Sold the survey rights to ' + nm(p) + ' for ✦ ' + got + '.'; draw(); }, 'sx-buy')));
      out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'One at a time'), sellable.length ? null : el('p', { class: 'sl-muted' }, 'Nothing to sell right now.'), ...rows,
        sellable.length > sellShow ? el('button', { type: 'button', class: 'sl-link', onclick: () => { sellShow += 20; drawRight(); } }, 'Show more (' + (sellable.length - sellShow) + ')') : null));
      return out;
    }
    function researchView() {
      const out = [el('div', { class: 'sx-res sx-kp' }, el('b', {}, S.kp.toLocaleString()), el('small', {}, 'Knowledge points. You earn one for every point of Knowledge.'))];
      RESEARCH.forEach(([branch, list]) => {
        const nDone = list.filter(n => hasT(n[0])).length;
        out.push(el('div', { class: 'sx-sec' }, el('h3', {}, branch, el('small', { class: 'sx-h-n' }, ' ' + nDone + ' / ' + list.length)), ...list.map((node, i) => {
          const [id, name, , what, un] = node, cost = rcost(node);
          const done = hasT(id), prev = list[i - 1], lockedBy = prev && !hasT(prev[0]) ? prev[1] : null;
          const u = un || {}, md = ACH.filter(a => a.req === id).length, tags = [];
          if (u.cat) tags.push('🎒 ' + catName(u.cat));
          if (u.logs) tags.push('🗄 ' + u.logs.length + ' Ship Log' + (u.logs.length > 1 ? 's' : ''));
          if (md) tags.push('🏅 ' + md + ' medal' + (md > 1 ? 's' : ''));
          const unl = tags.length ? el('span', { class: 'sx-unl' }, (done ? 'Unlocked: ' : 'Unlocks: ') + tags.join(' · '),
            done && u.logs ? el('button', { type: 'button', class: 'sl-link', onclick: () => { rightTab = 'tx'; txFilter = 'arc'; drawRight(); } }, 'Read') : null) : null;
          return el('div', { class: 'sx-up' + (done ? ' built' : lockedBy ? ' locked' : '') }, el('b', {}, name), el('small', {}, lockedBy ? 'Needs ' + lockedBy + '. ' + what : what, unl),
            done ? el('span', { class: 'sx-done' }, 'Done') : lockedBy ? el('span', { class: 'sx-max' }, cost + ' pts') : el('button', { type: 'button', class: 'btn sx-buy', disabled: S.kp < cost || null, onclick: () => doResearch(id) }, cost + ' pts'));
        })));
      });
      return out;
    }
    function tradeView() {
      const T = S.trader, here = byNum(T.num), out = [];
      const desc = id => { const { c, r } = parseId(id); return el('small', {}, el('i', { class: 'sx-r-' + r.toLowerCase() }, r), ' ' + ({ cur: 'curiosity', mat: 'material', art: 'artifact', wpn: 'weapon part', tec: 'tech part', spc: 'specimen', rel: 'relic', map: 'star chart', sig: 'signal', fos: 'fossil', coin: 'coin', ano: 'anomaly' }[c] || 'item') + (S.items[id] ? ', you have ' + S.items[id].n : ', new to you')); };
      out.push(el('div', { class: 'sx-queue on sx-trader' }, el('small', {}, 'Trade Station'), el('b', {}, T.name), el('span', { class: 'sl-muted' }, 'Docked at ' + (here ? nm(here.p) : 'a world') + '. It leaves when you travel on.')));
      out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'For sale'), T.stock.length ? null : el('p', { class: 'sl-muted' }, 'Sold out.'),
        ...T.stock.map((o, i) => el('div', { class: 'sx-up' }, el('b', {}, itemName(o.id)), desc(o.id), el('button', { type: 'button', class: 'btn sx-buy', disabled: S.dust < o.price || null, onclick: () => traderBuy(i) }, '✦ ' + o.price.toLocaleString())))));
      out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Swaps'), T.wants.length ? el('p', { class: 'sl-muted' }, 'They want something you have, and give something in return.') : el('p', { class: 'sl-muted' }, 'Nothing they want right now.'),
        ...T.wants.map((w, i) => { const has = S.items[w.want], only = has && has.n === 1;
          const act = () => traderSwap(i);
          return el('div', { class: 'sx-up sx-swap' }, el('b', {}, itemName(w.give)), el('small', {}, 'for your ' + itemName(w.want) + (has ? (only ? ' (your only one)' : ' (you have ' + has.n + ')') : ' (you don\'t have it)')),
            !has ? el('span', { class: 'sx-max' }, 'Need it') : only ? armBtn('Swap', 'Sure?', act, 'sx-buy') : el('button', { type: 'button', class: 'btn sx-buy', onclick: act }, 'Swap')); })));
      const spares = Object.keys(S.items).filter(k => S.items[k].n > 1 && itemName(k) !== '???').sort((a, b) => ITEM_RARS.indexOf(parseId(b).r) - ITEM_RARS.indexOf(parseId(a).r));
      out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Sell spares'), spares.length ? el('p', { class: 'sl-muted' }, 'Duplicates only. You always keep at least one.') : el('p', { class: 'sl-muted' }, 'No duplicates to sell.'),
        ...spares.slice(0, 12).map(id => el('div', { class: 'sx-up' }, el('b', {}, itemName(id) + ' ×' + S.items[id].n), desc(id), el('button', { type: 'button', class: 'btn sx-buy', onclick: () => traderSell(id) }, '+✦ ' + spareP(id))))));
      return out;
    }
    function drawFeed() {
      let best = null;
      posts().forEach(f => { const r = f.p.post.reports[f.p.post.reports.length - 1]; if (r && (!best || r.at > best.at)) best = { at: r.at, h: nm(f.p) + ', day ' + r.day, t: r.t }; });
      const e = S.events[S.events.length - 1]; if (e && (!best || e.at > best.at)) best = { at: e.at, h: e.title, t: e.t };
      feedLine.hidden = !best; if (best) feedLine.replaceChildren(el('b', {}, best.h + ': '), best.t);
    }
    // keyboard: 1-4 pick the mission, Space starts or pauses, Esc closes a report or page
    document.addEventListener('keydown', e => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, select, textarea')) return;
      if (!report.hidden) { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); closeReport(); } return; }
      if (!page.hidden) { if (e.key === 'Escape') { e.preventDefault(); tab('timer'); } return; }
      if (/^[1-5]$/.test(e.key)) { const b = misBtns[+e.key - 1]; if (b && !b.disabled && !b.hidden) { e.preventDefault(); b.click(); } }
      else if (e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); startB.click(); }
    });

    /* ---------- planet card / details ---------- */
    const fmtTemp = p => p.tempNight != null ? p.temp + ' °C day side / ' + p.tempNight + ' °C night side' : p.temp + ' °C';
    const pad = n => '#' + String(n).padStart(4, '0');
    const logText = p => p.custom ? p.log.split(p.name).join(p.custom) : p.log;
    // survey data, split into tabs so the list stays short
    const num = n => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    const habLabel = h => h >= 80 ? 'Earth-like: you could live here' : h >= 60 ? 'Livable, with a little help' : h >= 35 ? 'Survivable in a sealed base' : h >= 15 ? 'Hostile' : 'Deadly';
    const zoneLabel = { habitable: 'inside the habitable zone ✓', 'too close': 'too close: scorched', 'too far': 'too far: frozen', 'no star': '' };
    const meter = (v, cls) => el('span', { class: 'sl-meter' + (cls ? ' ' + cls : '') }, el('i', { style: 'width:' + v + '%' }));
    let surveyTab = 'Overview';
    function facts(p) {
      if (!p.x) p.x = makeExtra(p);
      const x = p.x, post = p.post, gas = (p.type === 'Gas giant' || p.type === 'Ice giant' || p.type === 'Glass storm');
      const T = {
        Overview: [['Class', p.type + (p.rings ? ', ringed' : '')], ['Habitability', [meter(x.hab, x.hab >= 60 ? 'ok' : x.hab >= 35 ? 'mid' : 'bad'), ' ' + x.hab + '% · ' + habLabel(x.hab)]], ['Star', p.star],
          ['Distance from star', x.au == null ? 'none, it drifts alone' : num(x.au) + ' AU · ' + zoneLabel[x.zone]], ['Distance from Earth', p.dist.toLocaleString() + ' light-years'],
          ['Year', p.year ? p.year.toLocaleString() + ' days' : 'no orbit'], ['Day', p.day == null ? 'never ends on one side' : p.day + ' hours'], ['Age', x.age + ' billion years']],
        Physical: [['Radius', x.radius + '× Earth (' + Math.round(x.radius * 6371).toLocaleString() + ' km)'], ['Mass', num(x.mass) + '× Earth'], ['Gravity', p.gravity + ' g'], ['Escape velocity', x.escape + ' km/s'],
          ['Axial tilt', x.tilt + '°' + (x.tilt < 4 ? ' (no seasons)' : x.tilt < 15 ? ' (mild seasons)' : x.tilt < 35 ? ' (clear seasons)' : x.tilt < 60 ? ' (strong seasons)' : ' (wild seasons)')], ['Moons', String(p.moons)], ['Rings', p.rings ? 'Yes' : 'No'],
          ['Highest peak', x.peak == null ? 'no solid surface' : x.peak + ' km'], ['Magnetic field', x.magnet], ['Albedo', x.albedo + ' (how much light it reflects)']],
        Climate: [['Temperature', fmtTemp(p)], ['Surface pressure', x.pressure == null ? 'no surface' : x.pressure + ' atm'], ['Atmosphere', p.atm], ['Oxygen', x.oxygen + '%'], ['Surface water', x.water + '%'],
          ['Deepest ocean', x.depth == null ? 'none' : x.depth + ' km'], ['Cloud cover', x.clouds + '%'], ['Weather', p.weather], [gas ? 'Layers' : 'Biomes', p.biomes.join(', ')], ['Radiation', x.radiation]],
        Life: [['Life', p.life], ['Biodiversity', x.bio ? [meter(x.bio, 'bio'), ' ' + x.bio + ' / 100'] : 'none detected'], ['Known species', x.species ? 'about ' + Number(x.species.toPrecision(2)).toLocaleString() : '0'],
          ['Native species', post && post.species ? post.species : p.lifeLvl ? (post ? 'still being studied' : 'needs a Listening Post to identify') : 'none']],
        Extra: [['Resources', p.res.join(', ')], ['Core', post && post.core ? post.core : post ? 'scan in progress' : 'needs a Listening Post to scan'], ['Anomaly', p.odd ? p.odd + (post && post.oddX ? ': ' + post.oddX : '') : 'none'],
          [post && post.tp ? 'Travelers\' Post' : 'Listening Post', post ? 'built ' + new Date(post.built).toLocaleDateString() + ', ' + post.reports.length + ' transmission' + (post.reports.length === 1 ? '' : 's') + (post.tp ? ', ' + post.tp.fac.length + ' facilit' + (post.tp.fac.length === 1 ? 'y' : 'ies') : '') : 'none'], ['Catalog code', p.code]].concat(p.custom ? [['Charted as', p.name]] : []),
      };
      const panel = el('dl', { class: 'sl-facts' });
      const tabs = Object.keys(T).map(k => el('button', { type: 'button', role: 'tab', class: 'sl-stab', 'aria-selected': String(k === surveyTab), onclick: () => show(k) }, k));
      function show(k) { surveyTab = k; tabs.forEach(b => b.setAttribute('aria-selected', String(b.textContent === k))); panel.replaceChildren(...T[k].flatMap(([a, b]) => [el('dt', {}, a), el('dd', {}, b)])); }
      show(surveyTab);
      return el('div', { class: 'sl-survey' }, el('div', { class: 'sl-stabs', role: 'tablist' }, tabs), panel);
    }
    /* ---------- log feeds: grouped by day, one tidy row per message, 20 at a time ---------- */
    const KIND = { core: ['🔬', 'sci'], species: ['🔬', 'sci'], odd: ['🔬', 'sci'], secret: ['🤫', 'sec'], log: ['📜', 'log'], fac: ['🏘', 'fac'], ev: ['⚠', 'ev'] };
    const dayLabel = t => { const d = new Date(t), a = new Date(); a.setHours(0, 0, 0, 0); const diff = Math.round((a - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
      return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: d.getFullYear() === a.getFullYear() ? undefined : 'numeric' }); };
    const hhmm = t => new Date(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const feedLimit = {};
    // items: [{ at, p (world, optional), k (kind), icon (optional), title (optional), t (text), extra (optional) }], newest first
    function renderFeed(items, key, showWorld, redraw) {
      const lim = feedLimit[key] || 20, out = [];
      let day = null;
      items.slice(0, lim).forEach(it => {
        const d = dayLabel(it.at); if (d !== day) { day = d; out.push(el('div', { class: 'sl-day' }, d)); }
        const [ic, cls] = KIND[it.k] || ['•', 'log'];
        let text = it.t; if (it.k === 'fac' && it.icon) text = text.replace(it.icon + ' ', '');
        out.push(el('div', { class: 'sl-msg sl-m-' + cls },
          showWorld && it.p ? el('img', { class: 'sl-msg-pic', src: paint(it.p, 32), alt: '' }) : el('span', { class: 'sl-msg-ic' }, it.icon || ic),
          el('div', { class: 'sl-msg-b' },
            el('div', { class: 'sl-msg-h' }, showWorld && it.p ? el('b', {}, nm(it.p)) : it.title ? el('b', {}, it.title) : null, showWorld && it.p ? el('span', { class: 'sl-msg-k' }, it.icon || ic) : null,
              it.day ? el('span', { class: 'sl-muted' }, 'Day ' + it.day) : null, el('span', { class: 'sl-msg-t' }, hhmm(it.at))),
            el('div', { class: 'sl-msg-x' }, text, it.extra ? el('b', {}, ' ' + it.extra) : null))));
      });
      if (items.length > lim) out.push(el('button', { type: 'button', class: 'btn sl-older', onclick: () => { feedLimit[key] = lim + 20; redraw(); } }, 'Show older (' + (items.length - lim) + ' more)'));
      return el('div', { class: 'sl-feedbox' }, out);
    }
    const repItem = (p, r) => ({ at: r.at, p, k: r.k, icon: r.k === 'fac' && r.f && FAC[r.f] ? FAC[r.f][0] : null, t: r.t, day: r.day });
    function postLog(p) {
      const reps = p.post.reports.slice().reverse();
      const box = el('details', { class: 'sl-more sl-postlog' }, el('summary', {}, (p.post.tp ? '🏘 Travelers\' Post log (' : '🗼 Listening Post log (') + reps.length + ')'));
      const fill = () => { box.replaceChildren(box.firstChild, reps.length ? renderFeed(reps.map(r => repItem(p, r)), 'post' + p.num, false, () => { const o = box.open; fill(); box.open = o; }) : el('p', { class: 'sl-muted' }, 'No transmissions yet. Tune the satellite here and study.')); };
      fill();
      return box;
    }
    const HEAD = { outlaw: '🏴 Outlaw-held world · ', freed: '⚔ World liberated · ', new: '★ New world discovered · ', log: 'World ', lucky: '🧭 Coordinator-guided discovery · ', built: '🗼 Listening Post built · ', upgraded: '🏘 Travelers\' Post opened · ', opened: '🏗 New facility · ', last: 'Last discovery · ' };
    function planetCard(p, kind) {
      const tuned = S.tuned === p.num && !!p.post;
      const pic = el('div', { class: 'sl-picwrap' }, el('img', { class: 'sl-pic', src: paint(p, 64), alt: 'Pixel portrait of ' + nm(p), width: 128, height: 128 }),
        p.post ? el('span', { class: 'sl-tower', title: p.post.tp ? 'Travelers\' Post' : 'Listening Post' }, p.post.tp ? '🏘' : '🗼') : null,
        tuned ? el('span', { class: 'sl-orbit', title: 'The ship\'s satellite is tuned to this world' }, el('img', { src: satSprite(), alt: 'Satellite' })) : null);
      return [
        el('div', { class: 'sl-card-h' }, el('span', {}, (HEAD[kind] || '') + pad(p.num)), el('span', { class: 'sl-rar sl-r-' + p.rarity.toLowerCase() }, p.rarity)),
        el('div', { class: 'sl-pl' }, pic,
          el('div', { class: 'sl-pl-t' }, el('b', { class: 'sl-name' }, nm(p), held(p) ? el('span', { class: 'sl-tag sl-tag-bad', title: 'Held by ' + p.outlaw.gang }, '🏴 Outlaws') : null, p.outlaw && p.outlaw.cleared ? el('span', { class: 'sl-tag', title: 'You drove out ' + p.outlaw.gang }, '⚔ Liberated') : null, p.lucky ? el('span', { class: 'sl-tag sl-tag-coord', title: 'Found by following the Interplanetary Coordinator' }, '🧭 Coordinated') : null, p.nudged && p.nudged.length ? el('span', { class: 'sl-tag sl-tag-coord', title: 'Steered by your Coordinator chips' }, '🎛 Steered') : null, tuned ? el('span', { class: 'sl-tag' }, '📡 Tuned') : p.post ? el('span', { class: 'sl-tag off' }, p.post.tp ? '🏘 Travelers\' Post' : '🗼 Post') : null),
            el('div', { class: 'sl-code' }, p.code + ' · ' + p.type + ' · ' + (p.x || (p.x = makeExtra(p))).hab + '% habitable'), el('p', {}, logText(p)))),
        el('details', { class: 'sl-more' }, el('summary', {}, 'Survey data'), facts(p)),
        p.post && p.post.tp ? el('div', { class: 'sl-facs', title: 'Facilities at this Travelers\' Post' }, [el('span', { class: 'sl-fac sl-popl' }, '🏙 ' + tierOf(p.post.tp.pop || 0) + ' · ' + (p.post.tp.pop || 0).toLocaleString() + ' settlers'), ...p.post.tp.fac.map(f => el('span', { class: 'sl-fac' }, FAC[f.k][0] + ' ' + FAC[f.k][1] + ((f.lv || 1) > 1 ? ' ' + '★'.repeat(Math.min(5, f.lv - 1)) + (f.lv > 6 ? '+' : '') : '')))]) : null,
        p.post ? postLog(p) : null,
      ].filter(Boolean);
    }
    function showCard(p, kind) {
      const e = p && p.enc && (kind === 'new' || kind === 'lucky') ? p.enc : null;
      encBox.hidden = !e; encBox.replaceChildren(...(e ? [el('div', { class: 'sl-enc-h' }, '- ' + e.ic + ' ' + e.title + ' -'), el('p', {}, e.t), el('p', { class: 'sl-enc-got' }, 'You gain ✦ ' + e.dust + ' resources')] : []));
      if (!p) { card.hidden = true; card.replaceChildren(); return; }
      card.hidden = false; card.className = 'sl-card' + (kind === 'new' || kind === 'built' || kind === 'lucky' || kind === 'upgraded' || kind === 'opened' || kind === 'freed' ? ' new' : kind === 'outlaw' ? ' new sl-held' : '');
      card.replaceChildren(...planetCard(p, kind));
      // in the report, Survey data opens as a panel to the right instead of growing the report downward
      reportSide.hidden = true; reportSide.replaceChildren();
      const sv = card.querySelector('details.sl-more:not(.sl-postlog)');
      if (sv) {
        const btn = el('button', { type: 'button', class: 'sl-link sx-svbtn', 'aria-expanded': 'false' }, 'Survey data ▸');
        btn.addEventListener('click', () => { const open = reportSide.hidden; reportSide.hidden = !open; btn.setAttribute('aria-expanded', String(open)); btn.textContent = open ? 'Survey data ◂' : 'Survey data ▸';
          if (open && !reportSide.firstChild) reportSide.replaceChildren(el('h3', {}, 'Survey data · ' + nm(p)), facts(p)); });
        sv.replaceWith(btn);
      }
    }
    function facReport(p) { // a log from one of a Travelers' Post's facilities
      const fac = p.post.tp.fac; if (!fac.length) return null;
      const r = rng((p.seed * 31 + p.post.reports.length * 7919 + Date.now() % 100000) >>> 0);
      const fo = fac[Math.floor(r() * fac.length)], k = fo.k, lv = fo.lv || 1;
      const FAME = ['The ' + FAC[k][1] + ' is famous across the sector now.', 'Travelers line up outside the ' + FAC[k][1] + ' every evening.', 'The ' + FAC[k][1] + ' hired ' + (lv * 3) + ' new staff this week.', 'A travel guide gave the ' + FAC[k][1] + ' ' + Math.min(5, lv) + ' stars.'];
      let text = lv >= 3 && r() < .3 ? FAME[Math.floor(r() * FAME.length)] : facLog(p, k, r, S.found.map(f => nm(f.p)).filter(x => x !== nm(p)));
      if (lv > 1) text = text.replace(/\b(\d+)\b/, (m0, d) => String(+d * lv)); // a bigger facility does more of everything
      const rep = { k: 'fac', f: k, t: FAC[k][0] + ' ' + text, at: Date.now(), day: Math.max(1, Math.round((Date.now() - p.post.built) / 86400000) + 1) };
      p.post.reports.push(rep); return rep;
    }
    function sessionReports() { // what the satellite hears at the end of a study session
      const out = [], tp = tunedP();
      if (tp) { out.push({ p: tp, rep: transmit(tp) }); if (Math.random() < Math.min(.5, (lvl('lab') - 1) * .04)) out.push({ p: tp, rep: transmit(tp) }); if (tp.post.tp) { const fr = facReport(tp); if (fr) out.push({ p: tp, rep: fr }); } }
      const others = posts().map(f => f.p).filter(p => p.post.tp && p !== tp); // Travelers' Posts are busy enough to be heard without tuning
      if (others.length) { const o = others[Math.floor(Math.random() * others.length)]; const fr = o.post.tp.fac.length && Math.random() < .6 ? facReport(o) : null; out.push({ p: o, rep: fr || transmit(o), passive: true }); }
      return out;
    }
    const KIND_LABEL = { talk: 'Conversation', action: 'Ship recorder', thought: 'Private diary' };
    function actOf(n) { const per = Math.ceil(CAMP.logs.length / (CAMP.acts || [1]).length); return (CAMP.acts || [])[Math.floor((n - 1) / per)] || ''; }
    function campLog(lg, n, got) { // one recovered Meridian log
      const who = (CAMP.crew && CAMP.crew[lg.who]) || lg.who;
      return el('div', { class: 'sl-trans-i sx-camp sx-camp-' + (lg.kind || 'talk') },
        el('div', { class: 'sx-camp-h' }, el('span', {}, (CAMP.title || 'Campaign') + ', log ' + n + ' of ' + CAMP.logs.length), el('small', {}, actOf(n))),
        el('div', { class: 'sx-camp-who' }, who, el('small', {}, KIND_LABEL[lg.kind] || '')),
        el('p', {}, lg.t), got ? el('p', { class: 'sl-ev-got' }, '+' + got + ' ✦ for recovering the log') : null);
    }
    function showTrans(list) {
      if (!list || !list.length) { trans.hidden = true; trans.replaceChildren(); return; }
      trans.hidden = false;
      trans.replaceChildren(...list.map(({ p, rep, passive, ev, notes, camp: lg, n: ln, got: lgot }) => lg ? campLog(lg, ln, lgot) : notes ? el('div', { class: 'sl-trans-i sl-notes' }, notes.map(t => el('p', {}, t))) : ev ? el('div', { class: 'sl-trans-i sl-event' },
          el('div', { class: 'sl-trans-h' }, el('span', { class: 'sl-ev-i' }, ev.ic), (ev.battle ? ' ' : ' Deep-space event: ') + ev.title), el('p', {}, ev.t), ev.got ? el('p', { class: 'sl-ev-got' }, ev.got) : null)
        : el('div', { class: 'sl-trans-i' },
        el('div', { class: 'sl-trans-h' }, el('img', { src: satSprite(), alt: '' }), (passive ? ' Overheard from ' : ' Transmission from ') + nm(p) + ' · Day ' + rep.day), el('p', {}, rep.t))));
    }

    /* ---------- timer ---------- */
    const fmt = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
    function remaining() { return running ? Math.max(0, endAt - Date.now()) : left; }
    function persistRun() { S.run = { mode, left: remaining(), endAt: running ? endAt : 0, running }; save(); }
    function setMode(m) { mode = m; left = length(m); hint.textContent = ''; draw(); persistRun(); }
    function start() { if (running) return; if (left <= 0) left = length(mode); running = true; endAt = Date.now() + left; persistRun(); loop(); draw(); }
    function pause() { if (!running) return; left = remaining(); running = false; clearInterval(tickT); persistRun(); draw(); }
    function reset() { running = false; clearInterval(tickT); left = length(mode); persistRun(); draw(); }
    function skip() {
      running = false; clearInterval(tickT);
      S.cnt.skips = (S.cnt.skips || 0) + 1;
      S.fc.broken = true; // skipping anything breaks this cycle's Full Cycle bonus
      const wasBuilding = mode === 'focus' && building(), wasCharging = mode === 'focus' && charging();
      if (mode === 'focus') toBreak(); else setMode('focus');
      hint.textContent = mode === 'focus' ? 'Break skipped. Ready for the next session.' : wasBuilding ? 'Construction stopped early. Nothing was built.' : wasCharging ? 'Charging stopped early. The Coordinator is still empty.' : 'Turned back early. No new world this time.';
      persistRun();
    }
    function toBreak() { setMode(S.cycle > 0 && S.cycle % S.set.every === 0 ? 'long' : 'short'); }
    function loop() { clearInterval(tickT); tickT = setInterval(() => { if (remaining() <= 0) finish(); else drawClock(); }, 250); }
    function finish(quiet) {
      clearInterval(tickT); running = false; left = 0;
      if (mode === 'focus') {
        rollDay(); if (S.cnt.lastDay !== today()) { S.cnt.lastDay = today(); S.cnt.days++; }
        rt0 = rating();
        S.total++; S.todayN++; S.cycle++; S.minutes += S.set.focus; S.fc.n++;
        { S.cnt.maxFocus = Math.max(S.cnt.maxFocus || 0, S.set.focus); const st = S.cnt.streak = S.cnt.streak || { last: '', n: 0, best: 0 }, td = today(); if (st.last !== td) { const y = new Date(); y.setDate(y.getDate() - 1); st.n = st.last === dayKey(y) ? st.n + 1 : 1; st.last = td; st.best = Math.max(st.best, st.n); } }
        { (S.cnt.dow = S.cnt.dow || {})[new Date().getDay()] = 1; const hr = new Date().getHours(); if (hr < 4) S.cnt.night = (S.cnt.night || 0) + 1; else if (hr < 7) S.cnt.early = (S.cnt.early || 0) + 1; }
        const target = building();
        // the tuned post reports in every study session (also while building somewhere else)
        const tp = tunedP(), reps = sessionReports();
        const forced = !!S.eventNext; S.eventNext = false;
        const ev = rollEvent(forced); if (ev) reps.unshift({ ev });
        let foundP = null;
        if (S.dr) {
          const msg = drLeg(reps); award(15, 5); showCard(null);
          if (!quiet && hooks.tada) hooks.tada();
          if (hooks.show) hooks.show();
          toBreak();
          hint.textContent = msg + ' Now a ' + MODES[mode].toLowerCase() + '.';
        } else if (campaigning()) {
          const n = S.camp.n, log = CAMP.logs[n]; S.camp.n++; { const cd = S.cnt.campDay = S.cnt.campDay || { d: '', n: 0, best: 0 }; if (cd.d !== today()) { cd.d = today(); cd.n = 0; } cd.n++; cd.best = Math.max(cd.best, cd.n); }
          const got = addDust((E.campaign.base + E.campaign.perLog * n) * (hasT('shp4') ? 1.25 : 1)); S.camp.at[n] = Date.now(); award(15, 20);
          reps.unshift({ camp: log, n: n + 1, got });
          if (!quiet && hooks.tada) hooks.tada();
          if (hooks.show) hooks.show();
          showCard(null); toBreak();
          hint.textContent = (campDone() ? 'That was the last log. The campaign is complete.' : 'Log ' + (n + 1) + ' of ' + CAMP.logs.length + ' recovered.') + ' Now a ' + MODES[mode].toLowerCase() + '.';
        } else if (expediting() || hunting()) {
          const msg = expediting() ? expLeg(reps) : mwLeg(reps);
          if (!quiet && hooks.tada) hooks.tada();
          if (hooks.show) hooks.show();
          showCard(null); toBreak();
          hint.textContent = msg + ' Now a ' + MODES[mode].toLowerCase() + '.';
        } else if (charging()) {
          S.coord = true; S.mission = 0; award(15, 0); S.cnt.charge++; if (hasT('nav2')) addDust(40 / INCOME);
          if (!quiet && hooks.tada) hooks.tada();
          if (hooks.show) hooks.show();
          toBreak();
          hint.textContent = '🧭 Interplanetary Coordinator charged. Your next trip will head somewhere promising. Now a ' + MODES[mode].toLowerCase() + '.';
        } else if (target) {
          const tp2 = target.p; let msg;
          if (target.k === 'room') {
            S.rooms[target.fac] = 1;
            msg = 'The ' + ROOMS[target.fac][1] + ' is ready. ' + ROOMS[target.fac][2] + '.';
          } else if (target.k === 'post') {
            tp2.post = { built: Date.now(), reports: [] };
            const autoTune = !tp; if (autoTune) S.tuned = tp2.num;
            msg = 'Listening Post built on ' + nm(tp2) + '. ' + (autoTune ? 'The satellite is tuned to it, so it reports in every study session.' : 'Tune the satellite to it on the Ship tab to hear from it.');
          } else if (target.k === 'upgrade') {
            tp2.post.tp = { at: Date.now(), fac: [] };
            msg = nm(tp2) + ' is now a Travelers\' Post. It\'ll be heard even when the satellite isn\'t tuned to it, and you can add facilities with the Build mission.';
          } else {
            tp2.post.tp.fac.push({ k: target.fac, at: Date.now() });
            msg = FAC[target.fac][0] + ' ' + FAC[target.fac][1] + ' opened at ' + nm(tp2) + '. When the post is tuned, you\'ll hear what goes on there.';
          }
          award(target.k === 'post' ? 30 : target.k === 'upgrade' ? 40 : 25, 0); S.cnt.builds = (S.cnt.builds || 0) + 1; if (target.k === 'room') pushEv({ ic: ROOMS[target.fac][0], title: 'New room: ' + ROOMS[target.fac][1], t: msg, at: Date.now() });
          S.mission = 0; S.job = null;
          if (!quiet && hooks.tada) hooks.tada();
          if (hooks.show) hooks.show();
          showCard(tp2 || null, target.k === 'post' ? 'built' : target.k === 'upgrade' ? 'upgraded' : 'opened');
          toBreak();
          hint.textContent = msg + ' Now a ' + MODES[mode].toLowerCase() + '.';
        } else if (discovering()) {
          const a = atP(), better = hasT('scan3') && Math.random() < 1 / 3, got = [rollItem(a, better, 'survey')]; if (Math.random() < (hasT('scan1') ? .55 : .3)) got.push(rollItem(a, better, 'survey')); if (hasT('scan4') && Math.random() < .2) got.push(rollItem(a, better, 'survey'));
          const fresh = got.map(it => gainItem(it, a));
          S.mission = 0; S.surveys = (S.surveys || 0) + 1; mwClue(a, 1);
          award(20 + 10 * fresh.filter(Boolean).length, 12 + 12 * fresh.filter(Boolean).length + (hasT('scan2') ? 10 : 0) + (hasT('scan4') ? 15 : 0));
          if (!quiet && hooks.tada) hooks.tada();
          if (hooks.show) hooks.show();
          reps.unshift({ ev: { battle: true, ic: '🔍', title: 'Survey of ' + nm(a), t: 'The survey team combed the ' + a.biomes[Math.floor(Math.random() * a.biomes.length)].toLowerCase() + ' and came back with: ' + got.map((it, i) => it.name + ' (' + it.rar + (fresh[i] ? ', new!' : '') + ')').join(' and ') + '.', got: '🎒 Collection ' + itemCount() + ' / ' + ITEM_TOTAL } });
          showCard(a, 'last');
          toBreak();
          hint.textContent = 'Survey done: ' + got.map(it => it.name).join(' and ') + '. Now a ' + MODES[mode].toLowerCase() + '.';
        } else if (heldP()) {
          const o = heldP(), pk = a => a[Math.floor(Math.random() * a.length)];
          o.outlaw.cleared = Date.now(); S.outlaw = 0; S.fights = (S.fights || 0) + 1; mwSpawn(); mwClue(o, 2);
          const lootIt = rollItem(o, true), isNew = gainItem(lootIt, o), extra = addDust((E.fight.min + Math.random() * Math.max(0, E.fight.max - E.fight.min)) * (hasT('shp2') ? 1.5 : 1)), loot = 'their hoard: ' + lootIt.name + ' (' + lootIt.rar + (isNew ? ', new to your collection!' : '') + ')';
          S.at = o.num; award(35, isNew ? 12 : 0);
          const story = pk(FIGHT).replace('{G}', o.outlaw.gang.replace(/^the/, 'The')).replace('{g}', o.outlaw.gang).replace('{b}', o.biomes[0].toLowerCase());
          pushEv({ ic: '⚔', title: 'Outlaws driven out of ' + nm(o), t: story + ' Found ' + loot + '.', got: '+' + extra + ' ✦', at: Date.now() });
          if (!quiet && hooks.tada) hooks.tada();
          if (hooks.show) hooks.show();
          showCard(o, 'freed'); reps.unshift({ ev: { battle: true, ic: '⚔', title: 'Victory on ' + nm(o), t: story + ' Found ' + loot + '.', got: '+' + extra + ' ✦ bounty from the outlaws' } });
          toBreak();
          hint.textContent = nm(o) + ' is free! Explore is open again. Now a ' + MODES[mode].toLowerCase() + '.';
        } else {
          const amp = chipAmp(), lucky = !!S.coord && !(ev && ev.got); if (lucky) S.coord = false;
          const p = nudgedPlanet(lucky, Math.min(.2, (lvl('scanner') - 1) * .01), amp);
          const outlaws = Math.random() < Math.max(0, OUTLAW_CHANCE + chipP('siren', amp) - chipP('hush', amp)) && p.type !== 'Rogue';
          if (outlaws) { const pk = a => a[Math.floor(Math.random() * a.length)]; p.outlaw = { gang: 'the ' + pk(GANG_A) + ' ' + pk(GANG_B), at: Date.now() }; S.outlaw = p.num; }
          S.found.push({ at: Date.now(), p }); S.at = p.num; mwClue(p, 1); dlArrive(p);
          if (p.nudged && p.nudged.length) qNotes.push('🎛 Your Coordinator chips steered this trip: ' + p.nudged.map(k => { const f = CHIP_F.find(x => x[0] === k); return f[1] + ' ' + f[2]; }).join(', ') + '.');
          S.cnt.rar[p.rarity] = (S.cnt.rar[p.rarity] || 0) + 1; if (lucky) S.cnt.lucky++; if (outlaws) S.cnt.outlaws++;
          award(20 + ({ Uncommon: 10, Rare: 25, Legendary: 60 }[p.rarity] || 0), 0);
          if (!outlaws && Math.random() < ENC_CHANCE + chipP('lantern', amp) + (hasT('nav1') ? .05 : 0) + .02 * roomLv('deck') + .03 * crewN('Scout')) {
            const [ic, title, tpl, lo, hi] = ENCOUNTERS[Math.floor(Math.random() * ENCOUNTERS.length)];
            const dust = addDust((lo + Math.random() * (hi - lo)) * E.encounters.scale * (RANK[p.rarity] >= 2 ? E.encounters.rareWorldMultiplier : 1)), t = tpl.split('{p}').join(nm(p));
            p.enc = { ic, title, t, dust }; encGot = p.enc; award(10, 5); S.cnt.enc++;
            pushEv({ ic, title, t, got: '+' + dust + ' ✦', at: Date.now() });
          }
          if (!outlaws && Math.random() < E.tradeStation.chance * (hasT('nav3') ? 2 : 1) + chipP('market', amp)) { makeTrader(p); traderNew = S.trader; }
          if (!quiet && hooks.tada) hooks.tada();
          if (hooks.show) hooks.show();
          showCard(p, outlaws ? 'outlaw' : lucky ? 'lucky' : 'new'); foundP = p;
          toBreak();
          hint.textContent = outlaws ? '🏴 Arrived, but ' + p.outlaw.gang + ' control this world! Explore is blocked until you fight them off (one study session). Building and charging still work.'
            : 'Arrived! ' + (lucky ? 'The Coordinator\'s charge is spent. ' : '') + 'Time for a ' + MODES[mode].toLowerCase() + ': stand up, stretch, drink some water.';
        }
        sessionEnd(reps, foundP, ev);
        openReport();
      } else {
        S.cnt.breaks = (S.cnt.breaks || 0) + 1;
        if (!quiet && hooks.ding) hooks.ding();
        if (hooks.show) hooks.show();
        const wasLong = mode === 'long';
        setMode('focus');
        hint.textContent = 'Equipment ready. Pick a mission and press Start.';
        if (wasLong) { // Full Cycle: every session and break of the cycle finished, nothing skipped
          if (!S.fc.broken && S.fc.n >= S.set.every) {
            S.fcDay = today(); S.cnt.fc++;
            if (!S.coord) { S.coord = true; hint.textContent = '★ Full Cycle bonus! Nothing skipped all cycle, so the Interplanetary Coordinator is charged for free.'; }
            else { S.eventNext = true; hint.textContent = '★ Full Cycle bonus! Nothing skipped all cycle: something interesting is waiting on your next trip.'; }
            const notes = ['✦ +' + addDust(E.fullCycle.base + (lvl('hull') - 1) * E.fullCycle.perHullLevel) + ' resources (Full Cycle)'];
            checkBounties({ cycle: true }, notes);
            award(40, 0); flushXP(notes);
            showTrans([{ notes }]); showCard(null); encBox.hidden = true; openReport();
          }
          S.fc = { n: 0, broken: false };
        }
      }
      persistRun(); draw();
    }
    function drawClock() {
      const r = remaining(), pct = Math.min(100, Math.max(0, 100 - (r / length(mode)) * 100));
      timeText.textContent = fmt(r);
      const hl = headline(); if (bigText.textContent !== hl) bigText.textContent = hl;
      if (running && !dotT) dotT = setInterval(() => { dotN++; drawDots(); }, 450);
      if (!running && dotT) { clearInterval(dotT); dotT = 0; dotN = 0; }
      drawDots(); drawCycle(pct);
      barFill.style.width = pct + '%'; bar.setAttribute('aria-valuenow', Math.round(pct));
      if (hooks.scene) { // what the flight scene should show
        const kind = sceneKind();
        hooks.scene({ mode, kind, running, pct, paused: !running && left > 0 && left < length(mode), planet: scenePlanet(kind), coord: !!S.coord, spot: planetSpot, ship: S.ship });
      }
      if (hooks.title) hooks.title(running ? fmt(r) + ' · ' + (mode === 'focus' ? (S.dr ? 'Distress Run' : campaigning() ? 'Following the trail' : expediting() ? 'Expedition' : hunting() ? 'Hunting' : building() ? (building().k === 'upgrade' ? 'Upgrading' : 'Building') : charging() ? 'Charging' : discovering() ? 'Surveying' : heldP() ? 'Fighting' : 'Traveling') : 'Preparing') : 'Solarist');
    }
    // while a study session runs, everything that isn't pure data is put away (back at the break)
    let wasLocked = false, rightPrev = 'up';
    const focusLock = () => running && mode === 'focus';
    function draw() {
      const lk = focusLock();
      if (lk !== wasLocked) { wasLocked = lk; if (lk) { rightPrev = rightTab; rightTab = 'tx'; if (!settingsPane.hidden) tab('timer'); } else rightTab = rightPrev || 'up'; }
      root.classList.toggle('sx-lock', lk); tabSet.disabled = lk; tabSet.title = lk ? 'Settings open again at the break' : '';
      drawClock(); drawLv();
      root.dataset.mode = mode;
      modeBtns.forEach(b => { const on = b.dataset.m === mode; b.classList.toggle('on', on); b.disabled = running && !on; });
      startB.textContent = running ? 'Pause' : (left < length(mode) && left > 0 ? 'Resume' : mode === 'focus' ? (S.dr ? (S.dr.n ? 'Continue the Run' : 'Start the Run') : campaigning() ? 'Follow the trail' : expediting() ? 'Continue' : hunting() ? 'Start the hunt' : building() ? (building().k === 'upgrade' ? 'Upgrade' : 'Build') : charging() ? 'Charge' : discovering() ? 'Survey' : heldP() ? 'Fight' : 'Launch') : 'Start break');
      if (!hint.textContent) hint.textContent = mode === 'focus' ? (S.dr ? '🆘 ' + DISTRESS[S.dr.sc][2] + ' Finish this study session to keep going.' : expediting() ? EXPED[S.exp.id][0] + ' Finish this session for leg ' + (S.exp.step + 1) + ' of ' + EXPED[S.exp.id][1] + '.' : hunting() ? '🎯 Finish this session to close in on ' + S.mw.name + '.' : campaigning() ? 'Finish this session to reach the Meridian\'s next log beacon (log ' + (S.camp.n + 1) + ' of ' + CAMP.logs.length + ').' : building() ? 'Finish this session: ' + jobText(building()).replace(/^./, c => c.toLowerCase()) + '.' : charging() ? 'Finish this session to charge the Interplanetary Coordinator. No new world this time, but the next one will be a good one.' : discovering() ? '🔍 Finish this session to survey ' + nm(atP()) + ' (where you are now). You\'ll bring back collectibles made from its materials.' : heldP() ? '🏴 ' + heldP().outlaw.gang.replace(/^the/, 'The') + ' hold ' + nm(heldP()) + '. Finish this study session to drive them out. (Build and Charge still work.)' : S.coord ? '🧭 The Coordinator is charged: this trip has much better odds.' : 'Finish a trip (a study session) to discover a new world.') : 'Break time. The crew is getting the gear ready for the next mission.';
      if (S.mission > 0 && !building()) { S.mission = 0; S.job = null; }
      if (S.mission === -1 && S.coord) S.mission = 0;
      if (S.mission === -2 && !discovering()) S.mission = 0;
      if (S.mission === -3 && campDone()) S.mission = 0;
      if (S.mission === -4 && !S.exp) S.mission = 0;
      if (S.mission === -5 && !mwReady()) S.mission = 0;
      const cm = curMission(), locked = running && mode === 'focus', canBuild = anyBuild();
      mission.classList.toggle('off', mode !== 'focus');
      mission.hidden = !!S.dr; drawDr();
      misBtns.forEach(b => {
        const k = b.dataset.m, on = k === cm;
        b.setAttribute('aria-checked', String(on)); b.classList.toggle('on', on);
        b.disabled = (locked && !on) || (k === 'build' && !canBuild) || (k === 'charge' && !!S.coord && !on) || (k === 'discover' && !on && (!atP() || held(atP())));
        if (k === 'discover') b.title = !atP() ? 'Find a world first' : held(atP()) ? 'Outlaws hold ' + nm(atP()) + '. Drive them out first' : 'Survey ' + nm(atP()) + ' (where you are now) for collectibles';
        if (k === 'explore') { const o = heldP(); b.firstChild.textContent = o ? '⚔' : '🚀'; b.lastChild.textContent = o ? 'Fight' : S.coord ? 'Explore (lucky)' : 'Explore'; b.title = o ? 'Outlaws hold ' + nm(o) + ': fight them off with one study session before you can travel again' : MISSIONS[0][3]; b.classList.toggle('sl-fight', !!o); }
        if (k === 'campaign') { b.hidden = !campaigning(); }
        if (k === 'expedition') { b.hidden = !expediting(); }
        if (k === 'hunt') { b.hidden = !hunting(); }
        if (k === 'charge') b.title = S.coord ? 'Already charged: your next Explore is a lucky one' : MISSIONS[3][3];
        if (k === 'build') { b.title = canBuild ? MISSIONS[2][3] : 'Nothing left to build'; const bj = building(); b.lastChild.textContent = bj ? 'Build: ' + (bj.k === 'room' ? ROOMS[bj.fac][1] : bj.k === 'post' ? 'Listening Post' : bj.k === 'upgrade' ? 'Travelers\' Post' : FAC[bj.fac][1]) : 'Build'; b.hidden = !bj && cm !== 'build'; }
      });
      buildSel.hidden = cm !== 'build'; buildSel.disabled = locked;
      if (cm === 'build') { fillBuildSel(buildSel); buildSel.value = jobKey(building()); }
      const round = mode === 'focus' ? S.cycle % S.set.every + 1 : (S.cycle % S.set.every || S.set.every);
      const stars = S.fc.broken ? '' : ' ' + '★'.repeat(Math.min(S.set.every, S.fc.n)) + '☆'.repeat(Math.max(0, S.set.every - S.fc.n));
      status.textContent = (mode === 'focus' ? 'Study session ' + round + ' of ' + S.set.every : mode === 'long' ? 'Long break' : 'Short break') + (S.fc.broken ? '. Full Cycle broken' : '. Full Cycle on track') + '. ' + S.todayN + ' today';
      void stars;
      status.title = S.fc.broken ? 'Full Cycle broken this time (something was skipped). It resets after the long break.' : 'Full Cycle: finish every session and break of this cycle without skipping for a bonus after the long break';
      const tp = tunedP();
      status2.textContent = '✦ ' + S.dust.toLocaleString() + ' · ' + S.found.length + ' world' + (S.found.length === 1 ? '' : 's') + (tp ? ' · 📡 ' + nm(tp) : '') + (S.coord ? ' · 🧭 charged' : '');
      tabLog.textContent = 'Logbook ' + S.found.length;
      if (S.trader && S.at !== S.trader.num) S.trader = null;
      drawName(); drawLeft(); drawRight(); drawFeed(); checkAch();
      if (!shipPane.hidden) drawShip();
    }

    /* ---------- the Ship tab: Coordinator, Listening Posts and all their transmissions in one place ---------- */
    let shipTab = 'Captain', facPost = 0;
    function drawShip() {
      const group = (title, ...kids) => el('fieldset', { class: 'sl-group' }, el('legend', {}, title), ...kids);
      const cm = curMission(), b = building(), locked = running && mode === 'focus';
      const next = cm === 'discover' && atP() ? '🔍 Survey ' + nm(atP()) + ' for collectibles' : cm === 'build' && b ? (b.k === 'upgrade' ? '🏘 ' : b.k === 'add' ? FAC[b.fac][0] + ' ' : '🗼 ') + jobText(b) : cm === 'explore' && heldP() ? '⚔ Fight ' + heldP().outlaw.gang + ' on ' + nm(heldP()) : cm === 'charge' ? '🧭 Charge the Interplanetary Coordinator' : S.coord ? '🚀 Explore (lucky, Coordinator charged)' : '🚀 Explore a new world';
      const bounties = group('🎯 Bounties', el('p', { class: 'sl-muted' }, 'Finish one and a new one takes its place. ' + S.bDone + ' completed so far.'),
        el('div', { class: 'sl-posts' }, S.bounties.map(b => el('div', { class: 'sl-post' }, el('span', { class: 'sl-mod-i' }, '🎯'), el('span', { class: 'sl-row-t' }, el('b', {}, b.t), el('small', {}, b.k === 'sessions' ? (b.prog || 0) + ' / ' + b.v + ' done' : b.k === 'cycle' ? 'finish every session and break of a cycle' : 'on any Explore trip')), el('span', { class: 'sl-reward' }, '✦ ' + Math.round(b.reward * INCOME))))));
      const recRows = REC.filter(([k]) => S.rec[k]).map(([k, ic, label, , f]) => { const r = S.rec[k], fw = byNum(r.num); return el('tr', {}, el('td', {}, ic + ' ' + label), el('td', {}, f(r.v)), el('td', {}, fw ? el('button', { type: 'button', class: 'sl-link', onclick: () => { tab('log'); openWorld(r.num); } }, nm(fw.p)) : '')); });
      if (S.rec.dayN) recRows.unshift(el('tr', {}, el('td', {}, '📅 Most sessions in a day'), el('td', {}, String(S.rec.dayN.v)), el('td', {}, new Date(S.rec.dayN.date).toLocaleDateString())));
      const records = group('🏆 Records', recRows.length ? el('table', { class: 'sl-rec' }, el('tbody', {}, recRows)) : el('p', { class: 'sl-muted' }, 'No records yet. Find some worlds.'));
      const rank = group('⭐ Captain & 📚 Knowledge', el('p', { class: 'sl-muted' }, 'XP comes from everything that moves the game forward: trips, building, upgrades, fights, surveys, bounties and Full Cycles. Knowledge comes from what you learn: transmissions, logs, events, survey logs and new collectibles. Every 10 levels earns a new title.'),
        lvMsg && Date.now() - lvMsgAt < 10000 ? el('p', { class: 'sl-lv-msg' }, lvMsg) : null, lvBar('xp', '⭐', CAPT, true), lvBar('kn', '📚', KNOW, true));
      const drGroup = group('🆘 Distress Run', el('p', {}, S.dr ? 'In progress: ' + DISTRESS[S.dr.sc][1] + ', Act ' + ROMAN(S.dr.n + 1) + ' of ' + ROMAN(S.dr.need) + '.' : S.drDay === today() ? 'Today\'s run is used up. A new distress call comes in tomorrow.' : S.fcDay === today() ? 'Available at the start of your next cycle (right after a long break).' : 'Earn a ★ Full Cycle today (no skipping for a whole cycle) and a distress call comes in when the long break ends.'),
        el('p', { class: 'sl-muted' }, 'Once a day: a whole cycle of study sessions with no other missions, for about ✦ ' + E.distressRun.base + '–' + (E.distressRun.base + E.distressRun.random) + ', a random bonus, 250 XP and 120 Knowledge. ' + (S.drN || 0) + ' completed so far.'));
      const rtNow = rating(), parts = {};
      RATING.forEach(([g, what, per, f]) => { let n = 0; try { n = f() || 0; } catch (e) { } (parts[g] = parts[g] || []).push([what, n, per * n]); });
      const rtGroup = group('◆ Rating', el('p', { class: 'sl-muted' }, 'One number for how far you have come. Everything counts: every session, world, build, find, quest and medal. It only goes up while you keep playing.'), rtBar(true),
        el('div', { class: 'sx-ranks' }, RANKS.map(([at, name], k) => el('span', { class: rtNow >= at ? 'on' : '' }, el('b', {}, name), el('small', {}, at.toLocaleString())))),
        ...Object.keys(parts).map(g => el('table', { class: 'sl-rec sl-stats sx-rtab' }, el('thead', {}, el('tr', {}, el('th', {}, g), el('th', {}, ''), el('th', {}, parts[g].reduce((a, x) => a + x[2], 0).toLocaleString()))),
          el('tbody', {}, parts[g].filter(x => x[1]).map(([what, n, pts]) => el('tr', {}, el('td', {}, what), el('td', {}, '×' + n.toLocaleString()), el('td', {}, pts.toLocaleString())))))));
      const quests = group('🗺 Quests', el('table', { class: 'sl-rec sl-stats' }, el('tbody', {}, [['Expeditions finished', S.expDone || 0], ['Expedition legs', S.cnt.expSteps || 0], ['Guild contracts paid', S.cnt.wk || 0], ['Most Wanted caught', S.mwDone || 0], ['Deliveries', (S.dl && S.dl.done) || 0], ['Distress Runs', S.drN || 0]].map(([a, b]) => el('tr', {}, el('td', {}, a), el('td', {}, String(b)))))));
      const SUB = { Captain: [rtGroup, rank], Medals: medalsView(group), Crew: crewView(group), Ship: shipView(group), Goals: [quests, drGroup, bounties, records], Stats: statsView(group) };
      if (!SUB[shipTab]) shipTab = 'Captain';
      const subBtns = Object.keys(SUB).map(k => el('button', { type: 'button', role: 'tab', class: 'sl-stab', 'aria-selected': String(k === shipTab), onclick: () => { shipTab = k; drawShip(); } }, k));
      shipPane.replaceChildren(el('div', { class: 'sl-stabs sl-shiptabs', role: 'tablist' }, subBtns), el('div', { class: 'sl-subpane' }, SUB[shipTab]));
    }

    // ---------- star map: every world you've charted, placed by its distance from Earth, with your route ----------
    const mapView = { zoom: 1, x: 0, y: 0 }; let mapCv = null, mapPts = [], mapHover = null;
    const RCOL = { Common: '#a6859f', Uncommon: '#6bc96c', Rare: '#aee2ff', Legendary: '#fcef8d' };
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
          el('span', {}, el('i', { class: 'sq' }), 'Post'), el('span', {}, el('i', { style: 'background:#ea6262' }), 'Outlaws'), el('span', {}, el('i', { class: 'ring' }), 'You are here'));
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
        mapCv.addEventListener('pointerup', () => { drag = null; });
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
      g.strokeStyle = '#1f102a'; g.lineWidth = 1; g.fillStyle = '#4a3052'; g.font = '12px "Barlow C", sans-serif';
      [1, 2, 3, 4].forEach(k => { const r = k / 4.45 * sc; g.beginPath(); g.ellipse(cx, cy, r, r * .78, 0, 0, Math.PI * 2); g.stroke(); g.fillText(Math.pow(10, k).toLocaleString() + ' ly', cx + r + 4, cy - 2); });
      g.fillStyle = '#ffffff'; g.fillRect(cx - 2, cy - 2, 4, 4); g.fillStyle = '#7b5480'; g.fillText('Earth', cx + 6, cy + 14);
      const list = S.found.map(f => f.p);
      g.strokeStyle = '#4a3052'; g.beginPath(); list.forEach((p, i) => { const [x, y] = P(p); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke();
      mapPts = [];
      list.forEach(p => {
        const [x, y] = P(p); mapPts.push({ x, y, p });
        const big = p.rarity === 'Legendary' ? 4 : p.rarity === 'Rare' ? 3 : 2.5;
        g.fillStyle = held(p) ? '#ea6262' : RCOL[p.rarity] || '#a6859f';
        if (p.post) { g.fillStyle = '#ffb879'; g.fillRect(x - big - 1, y - big - 1, (big + 1) * 2, (big + 1) * 2); if (p.post.tp) { g.strokeStyle = '#ffb879'; g.strokeRect(x - big - 4, y - big - 4, (big + 4) * 2, (big + 4) * 2); } }
        else { g.beginPath(); g.arc(x, y, big, 0, Math.PI * 2); g.fill(); }
        if (S.at === p.num) { g.strokeStyle = '#6bc96c'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, big + 7, 0, Math.PI * 2); g.stroke(); g.lineWidth = 1; }
        if (mapView.zoom >= 2.5 || p.post || p.rarity === 'Legendary' || S.at === p.num) { g.fillStyle = '#a6859f'; g.fillText(nm(p), x + 8, y - 6); }
      });
    }
    // ---------- achievements ----------
    if (!S.ach) S.ach = {};
    const ACH = [];
    const A = (grp, id, ic, name, desc, test, req) => ACH.push({ grp, id, ic, name, desc, test, req }); // req: a research that reveals the medal
    const tiers = (grp, key, ic, list, val, fmt) => list.forEach(([n, name]) => A(grp, key + n, ic, name, fmt(n), () => val() >= n));
    const facAll = () => posts().reduce((a, f) => a.concat(f.p.post.tp ? f.p.post.tp.fac : []), []);
    const charted = () => Object.values(S.cnt.rar).reduce((a, n) => a + n, 0);
    tiers('Study', 'ses', '⏱', [[1, 'First Light'], [10, 'Getting Started'], [50, 'Regular'], [100, 'Centurion'], [250, 'Devoted'], [500, 'Unstoppable'], [1000, 'Legend of Focus']], () => S.total, n => 'Finish ' + n + ' study session' + (n === 1 ? '' : 's'));
    tiers('Study', 'hrs', '⌛', [[10, 'Ten Hours In'], [50, 'Fifty Hours'], [100, 'Hundred Hours'], [250, 'Deep Space Scholar'], [500, 'Five Hundred Hours']], () => S.minutes / 60, n => 'Study for ' + n + ' hours in total');
    tiers('Study', 'days', '📅', [[3, 'Three Days'], [7, 'A Week of Voyages'], [30, 'A Month Aboard'], [100, 'Hundred Days']], () => S.cnt.days, n => 'Study on ' + n + ' different days');
    tiers('Study', 'day', '🔥', [[4, 'Busy Day'], [8, 'Marathon'], [12, 'Overdrive']], () => S.rec.dayN ? S.rec.dayN.v : 0, n => 'Finish ' + n + ' sessions in one day');
    tiers('Study', 'fc', '★', [[1, 'Full Cycle'], [10, 'Steady Hands'], [50, 'Clockwork']], () => S.cnt.fc, n => 'Earn ' + n + ' Full Cycle' + (n === 1 ? '' : 's') + ' (no skipping)');
    tiers('Worlds', 'wld', '🪐', [[1, 'First Contact'], [10, 'Explorer'], [50, 'Cartographer'], [100, 'Pathfinder'], [250, 'Star Charter'], [500, 'Galaxy Mapper']], charted, n => 'Discover ' + n + ' world' + (n === 1 ? '' : 's'));
    tiers('Worlds', 'rare', '💎', [[1, 'Something Rare'], [10, 'Rare Taste']], () => (S.cnt.rar.Rare || 0) + (S.cnt.rar.Legendary || 0), n => 'Discover ' + n + ' Rare or Legendary world' + (n === 1 ? '' : 's'));
    tiers('Worlds', 'leg', '👑', [[1, 'Legendary Find'], [5, 'Legend Hunter'], [20, 'Myth Maker']], () => S.cnt.rar.Legendary || 0, n => 'Discover ' + n + ' Legendary world' + (n === 1 ? '' : 's'));
    A('Worlds', 'earth', '🌍', 'Home Away from Home', 'Find a world at least 80% habitable', () => S.rec.hab && S.rec.hab.v >= 80);
    A('Worlds', 'intel', '👽', 'We Are Not Alone', 'Find a world with signs of intelligence', () => S.found.some(f => (f.p.lifeLvl || 0) >= 6));
    A('Worlds', 'far', '🔭', 'The Far Edge', 'Find a world more than 10,000 light-years from Earth', () => S.rec.far && S.rec.far.v >= 10000);
    A('Worlds', 'allrec', '🏆', 'Record Keeper', 'Hold every world record at once, with 25 or more worlds charted', () => S.found.length >= 25 && REC.every(([k]) => S.rec[k]) && REC.every(([k]) => byNum(S.rec[k].num)));
    tiers('Worlds', 'luck', '🧭', [[1, 'Lucky Break'], [10, 'Fortune Favors']], () => S.cnt.lucky, n => 'Make ' + n + ' lucky Coordinator trip' + (n === 1 ? '' : 's'));
    tiers('Worlds', 'sold', '💰', [[1, 'First Sale'], [25, 'Guild Regular'], [100, 'Real Estate Mogul']], () => S.sold.n, n => 'Sell ' + n + ' world' + (n === 1 ? '' : 's'));
    tiers('Posts', 'post', '🗼', [[1, 'Listening In'], [3, 'Network'], [5, 'Wide Net'], [10, 'Everywhere at Once']], () => posts().length, n => 'Own ' + n + ' Listening Post' + (n === 1 ? '' : 's'));
    tiers('Posts', 'tp', '🏘', [[1, 'Settler'], [3, 'Founder'], [5, 'Colonial Office']], () => posts().filter(f => f.p.post.tp).length, n => 'Own ' + n + ' Travelers\' Post' + (n === 1 ? '' : 's'));
    tiers('Posts', 'fac', '🏗', [[1, 'Open for Business'], [14, 'Fully Built'], [42, 'Three Full Posts']], () => facAll().length, n => 'Build ' + n + ' facilit' + (n === 1 ? 'y' : 'ies'));
    tiers('Posts', 'max', '⭐', [[1, 'Top Shelf'], [14, 'Five Star Post']], () => facAll().filter(f => (f.lv || 1) >= FAC_MAX).length, n => 'Upgrade ' + n + ' facilit' + (n === 1 ? 'y' : 'ies') + ' to the max level');
    tiers('Posts', 'city', '🏙', [[1, 'City Lights']], () => posts().filter(f => f.p.post.tp && (f.p.post.tp.pop || 0) >= 5000).length, () => 'Grow a Travelers\' Post to 5,000 settlers');
    tiers('Adventure', 'bty', '🎯', [[1, 'Bounty Hunter'], [10, 'Contract Work'], [50, 'Professional'], [100, 'Most Wanted List']], () => S.bDone, n => 'Complete ' + n + ' bount' + (n === 1 ? 'y' : 'ies'));
    tiers('Adventure', 'fight', '⚔', [[1, 'Sheriff'], [10, 'Outlaw Bane'], [50, 'Peacekeeper']], () => S.fights || 0, n => 'Drive out ' + n + ' outlaw gang' + (n === 1 ? '' : 's'));
    tiers('Adventure', 'dr', '🆘', [[1, 'First Responder'], [10, 'Search and Rescue'], [30, 'Guardian']], () => S.drN || 0, n => 'Complete ' + n + ' Distress Run' + (n === 1 ? '' : 's'));
    tiers('Adventure', 'exp', '🗺', [[1, 'Into the Unknown'], [10, 'Seasoned Explorer'], [30, 'Mapmaker of Legend']], () => S.expDone || 0, n => 'Finish ' + n + ' expedition' + (n === 1 ? '' : 's'));
    tiers('Adventure', 'wk', '📜', [[1, 'Guild Member'], [10, 'Guild Favorite'], [26, 'Half a Year of Contracts']], () => S.cnt.wk || 0, n => 'Get paid for ' + n + ' Guild contract' + (n === 1 ? '' : 's'));
    tiers('Adventure', 'mw', '🎯', [[1, 'Wanted: Caught'], [5, 'Bounty Legend'], [15, 'The Last Sheriff']], () => S.mwDone || 0, n => 'Catch ' + n + ' Most Wanted boss' + (n === 1 ? '' : 'es'));
    tiers('Worlds', 'chip', '🎛', [[10, 'Fine Tuner'], [25, 'Control Freak'], [60, 'Master of Chance']], () => S.chips.own, n => 'Own ' + n + ' Coordinator chips');
    A('Worlds', 'chipfull', '🎚', 'Turned to Eleven', 'Fill one Coordinator field with all ' + 10 + ' chips', () => Object.values(S.chips.put).some(n => n >= 10));
    A('Worlds', 'nudge', '🎯', 'Exactly What I Ordered', 'Find a world the Coordinator chips steered you to', () => S.found.some(f => f.p.nudged && f.p.nudged.length));

    // Side Quests: silly little challenges, just for fun
    const SQ = (id, ic, name, desc, test) => A('Side Quests', 'sq-' + id, ic, name, desc, test);
    const anyW = f => S.found.some(x => f(x.p)), seen = t => (S.cnt.seen && S.cnt.seen[t]) || 0;
    const postHas = (...ks) => posts().some(x => x.p.post.tp && ks.every(k => x.p.post.tp.fac.some(f => f.k === k)));
    const lastN = (n, f) => S.found.length >= n && S.found.slice(-n).every(x => f(x.p, S.found[S.found.length - 1].p));
    SQ('swim', '🐟', 'There Goes Swimmer', 'Find a world with swimming creatures', () => anyW(p => p.lifeLvl === 4));
    SQ('herd', '🦬', 'Big Herd Energy', 'Find a world with large animal herds', () => anyW(p => p.lifeLvl === 5));
    SQ('watch', '👀', 'They\'re Watching Us', 'Find a world with signs of intelligence', () => anyW(p => p.lifeLvl >= 6));
    SQ('earth', '🌍', 'Is This Earth?', 'Find a world at least 95% habitable', () => anyW(p => (p.x || (p.x = makeExtra(p))).hab >= 95));
    SQ('cold', '🧊', 'Chill Out', 'Find a world colder than −200 °C', () => anyW(p => p.temp < -200));
    SQ('hot', '🔥', 'Hot Take', 'Find a world hotter than 1,000 °C', () => anyW(p => p.temp > 1000));
    SQ('moons', '🌙', 'Moon Hoarder', 'Find a world with 50 or more moons', () => anyW(p => p.moons >= 50));
    SQ('rings', '💍', 'Put a Ring on It', 'Have 5 ringed worlds in your Logbook', () => S.found.filter(x => x.p.rings).length >= 5);
    SQ('rogue', '🪨', 'Lone Wanderer', 'Find a rogue world drifting with no star', () => anyW(p => p.type === 'Rogue'));
    SQ('tour', '🧳', 'Tourist', 'Discover worlds of 10 different classes', () => new Set(S.found.map(x => x.p.type)).size >= 10);
    SQ('same', '🫠', 'Déjà View', 'Discover 3 worlds of the same class in a row', () => lastN(3, (p, q) => p.type === q.type));
    SQ('rough', '🏴', 'Rough Neighborhood', 'Arrive at 2 outlaw-held worlds in a row', () => lastN(2, p => !!p.outlaw));
    SQ('name', '✏', 'I Name Thee', 'Give a world a name of your own', () => anyW(p => !!p.custom));
    SQ('ship', '🏷', 'Main Character', 'Rename your ship', () => S.ship.name !== 'The Lantern');
    SQ('diner', '🍜', 'Diner First!', 'Upgrade the Diner 3 times in a row', () => !!S.cnt.facRow && (S.cnt.facRow.best.diner || 0) >= 3);
    SQ('arcade', '🕹', 'High Score', 'Get an Arcade to level 5', () => posts().some(x => x.p.post.tp && x.p.post.tp.fac.some(f => f.k === 'arcade' && (f.lv || 1) >= 5)));
    SQ('spa', '♨', 'Spa Day', 'Have a Hot Spring Bath and a Lounge at the same post', () => postHas('bathhouse', 'lounge'));
    SQ('noise', '📻', 'Noise Complaint', 'Have a Radio Shack and a Library at the same post', () => postHas('radio', 'library'));
    SQ('whale', '🐋', 'Whale Watcher', 'See a space whale', () => seen('Space whale') >= 1);
    SQ('meteor', '🌠', 'Make a Wish', 'Fly through a meteor storm', () => seen('Meteor storm') >= 1);
    SQ('hello', '🛸', 'Hello Neighbor', 'Pass a fellow explorer 3 times', () => seen('Fellow explorer') >= 3);
    SQ('diner2', '🥞', 'Second Breakfast', 'Visit the Space Diner in Orbit 3 times', () => seen('Space Diner in Orbit!') >= 3);
    SQ('lotto', '🎟', 'Feeling Lucky', 'Find a space lottery ticket stuck to the hull', () => seen('Space Lottery Ticket!') >= 1);
    SQ('film', '🎥', 'Background Extra', 'Wander into a film shoot', () => seen('Film Crew on Location!') >= 1);
    SQ('night', '🦉', 'Night Owl', 'Finish a study session between midnight and 4 AM', () => (S.cnt.night || 0) >= 1);
    SQ('early', '🐓', 'Early Bird', 'Finish a study session between 4 and 7 AM', () => (S.cnt.early || 0) >= 1);
    SQ('binge', '📼', 'Binge Watcher', 'Recover 5 Meridian logs in one day', () => !!S.cnt.campDay && S.cnt.campDay.best >= 5);
    SQ('bold', '🎲', 'Fortune Favors the Bold', 'Take the bold path on every leg of an expedition', () => (S.cnt.allBold || 0) >= 1);
    SQ('safe', '🐢', 'Slow and Steady', 'Take the safe path on every leg of an expedition', () => (S.cnt.allSafe || 0) >= 1);
    SQ('broke', '💸', 'Big Spender', 'Spend every last resource (have exactly 0)', () => S.dust === 0 && S.dustTotal > 0);
    SQ('hoard', '🐉', 'Dragon\'s Hoard', 'Hold 10,000 resources at once', () => S.dust >= 10000);
    SQ('sale', '🧹', 'Spring Cleaning', 'Sell 10 or more worlds in one go', () => (S.cnt.bigSale || 0) >= 1);
    SQ('dupe', '🔁', 'Not Another One', 'Own 5 copies of the same collectible', () => Object.values(S.items).some(it => it.n >= 5));
    SQ('mad', '🧪', 'Mad Science', 'Have 3 Scientists aboard at once', () => crewN('Scientist') >= 3);
    SQ('fired', '👋', 'You\'re Fired', 'Let a crew member go', () => (S.cnt.fired || 0) >= 1);
    SQ('feather', '🪶', 'Featherweight', 'Find a world with less than 0.3 g of gravity', () => anyW(p => p.gravity < .3));
    SQ('legday', '🏋', 'Never Skip Leg Day', 'Find a world with more than 3 g of gravity', () => anyW(p => p.gravity > 3));
    SQ('longday', '😴', 'Five More Minutes', 'Find a world whose day lasts over 80 hours', () => anyW(p => p.day > 80));
    SQ('spin', '🌀', 'Spin Cycle', 'Find a world whose day is under 8 hours', () => anyW(p => p.day != null && p.day < 8));
    SQ('bday', '🎂', 'Birthday Every Week', 'Find a world whose year is shorter than 10 days', () => anyW(p => p.year > 0 && p.year < 10));
    SQ('oldyear', '👴', 'Back in My Day', 'Find a world whose year lasts over 3,000 days', () => anyW(p => p.year > 3000));
    SQ('near', '🏡', 'Practically Next Door', 'Find a world less than 10 light-years from Earth', () => anyW(p => p.dist < 10));
    SQ('edge', '🛰', 'Middle of Nowhere', 'Find a world more than 20,000 light-years out', () => anyW(p => p.dist > 20000));
    SQ('sunset', '🌅', 'Double Sunset', 'Find a world at least 60% habitable with two suns', () => anyW(p => p.star === 'binary pair' && (p.x || (p.x = makeExtra(p))).hab >= 60));
    SQ('tick', '⏱', 'Tick Tock', 'Find life on a world that orbits a pulsar', () => anyW(p => p.star === 'pulsar' && p.lifeLvl > 0));
    SQ('crown', '👑', 'Crown Jewel', 'Find a Legendary world with rings', () => anyW(p => p.rarity === 'Legendary' && p.rings));
    SQ('b2b', '💎', 'Back to Back', 'Find 2 Rare or Legendary worlds in a row', () => lastN(2, p => p.rarity === 'Rare' || p.rarity === 'Legendary'));
    SQ('mid', '😐', 'Mid', 'Find 5 Common worlds in a row', () => lastN(5, p => p.rarity === 'Common'));
    SQ('quiet', '🔇', 'Dead Quiet', 'Find 5 lifeless worlds in a row', () => lastN(5, p => !p.lifeLvl));
    SQ('lava', '🌋', 'The Floor Is Lava', 'Have 3 Lava worlds in your Logbook', () => S.found.filter(x => x.p.type === 'Lava').length >= 3);
    SQ('shroom', '🍄', 'Shroom Room', 'Find a Fungal world with life on it', () => anyW(p => p.type === 'Fungal' && p.lifeLvl > 0));
    SQ('steer3', '🎛', 'Overachiever', 'Get a world steered by 3 Coordinator fields at once', () => anyW(p => p.nudged && p.nudged.length >= 3));
    SQ('city', '🏙', 'Big City Lights', 'Grow a Travelers\' Post to 10,000 settlers', () => posts().some(x => x.p.post.tp && (x.p.post.tp.pop || 0) >= 10000));
    SQ('dinermax', '🧑‍🍳', 'Diner Supremacy', 'Get a Diner to the max level', () => posts().some(x => x.p.post.tp && x.p.post.tp.fac.some(f => f.k === 'diner' && (f.lv || 1) >= FAC_MAX)));
    SQ('mall', '🛍', 'Everything Store', 'Build every kind of facility at one post', () => posts().some(x => x.p.post.tp && x.p.post.tp.fac.length >= Object.keys(FAC).length));
    SQ('cooks', '🍳', 'Too Many Cooks', 'Have 3 Cooks aboard at once', () => crewN('Cook') >= 3);
    SQ('house', '🎭', 'Full House', 'Have one of every crew role aboard', () => Object.keys(ROLES).every(r => crewN(r) > 0));
    SQ('fashion', '🖌', 'Fashionista', 'Own every hull color', () => Object.keys(HULL_COLORS).every(k => S.ship.colors.includes(k)));
    SQ('overtime', '☕', 'Overtime', 'Finish 16 study sessions in one day', () => !!S.rec.dayN && S.rec.dayN.v >= 16);
    SQ('weekend', '📆', 'Weekend Warrior', 'Study on a Saturday and on a Sunday', () => !!S.cnt.dow && S.cnt.dow[6] && S.cnt.dow[0]);
    SQ('nap', '🛌', 'Professional Napper', 'Finish 25 breaks without skipping them', () => (S.cnt.breaks || 0) >= 25);
    SQ('skip', '⏭', 'Speedrunner', 'Skip 10 times (we saw that)', () => (S.cnt.skips || 0) >= 10);
    SQ('miles', '🗺', 'Frequent Flyer', 'Travel 100,000 light-years in total', () => S.found.reduce((a, x) => a + x.p.dist, 0) + (S.sold.ly || 0) >= 100000);
    SQ('firesale', '💥', 'Fire Sale', 'Sell a Legendary world (are you sure?)', () => (S.cnt.soldLeg || 0) >= 1);
    const typeN = t => S.found.filter(x => x.p.type === t).length, catN = c => Object.keys(S.items).filter(k => parseId(k).c === c && itemName(k) !== '???').length;
    SQ('ocean', '🌊', 'Water World', 'Have 3 Ocean worlds in your Logbook', () => typeN('Ocean') >= 3);
    SQ('snow', '☃', 'Snowball Fight', 'Find life on an Ice world', () => anyW(p => p.type === 'Ice' && p.lifeLvl > 0));
    SQ('toxic', '☠', 'Breathe at Your Own Risk', 'Find life on a Toxic world', () => anyW(p => p.type === 'Toxic' && p.lifeLvl > 0));
    SQ('microbe', '🦠', 'Tiny Neighbors', 'Find a world with microbial traces', () => anyW(p => p.lifeLvl === 1));
    SQ('moss', '🧽', 'Fuzzy', 'Find a world covered in moss-like mats', () => anyW(p => p.lifeLvl === 2));
    SQ('grass', '🌿', 'Touch Grass', 'Find a world with plant-like life', () => anyW(p => p.lifeLvl === 3));
    SQ('crystal', '💠', 'Shiny!', 'Find a Crystal world', () => typeN('Crystal') > 0);
    SQ('iron', '🤘', 'Heavy Metal', 'Find an Iron world', () => typeN('Iron') > 0);
    SQ('carbon', '🖤', 'Diamonds Are Forever', 'Find a Carbon world', () => typeN('Carbon') > 0);
    SQ('shatter', '🧩', 'Some Assembly Required', 'Find a Shattered world', () => typeN('Shattered') > 0);
    SQ('glass', '🏖', 'Sandblasted', 'Find a Glass storm world', () => typeN('Glass storm') > 0);
    SQ('locked', '🌗', 'Half and Half', 'Find a Tidally locked world', () => typeN('Tidally locked') > 0);
    SQ('icegiant', '🥶', 'Cool Blue', 'Find an Ice giant', () => typeN('Ice giant') > 0);
    SQ('dwarf', '🐣', 'Small but Mighty', 'Find life on a Dwarf world', () => anyW(p => p.type === 'Dwarf' && p.lifeLvl > 0));
    SQ('ruins', '🗿', 'Who Built That?', 'Find a world with ruins of an ancient structure', () => anyW(p => p.odd && p.odd.includes('ruins')));
    SQ('round', '⭕', 'Suspiciously Round', 'Find a world with a perfectly round lake', () => anyW(p => p.odd === 'a perfectly round lake'));
    SQ('rainbow', '🌈', 'Taste the Rainbow', 'Have a world of every rarity in your Logbook', () => RARITY.every(([r]) => S.found.some(x => x.p.rarity === r)));
    SQ('snob', '🧐', 'Rarity Snob', 'Have 10 Rare or Legendary worlds in your Logbook', () => S.found.filter(x => x.p.rarity === 'Rare' || x.p.rarity === 'Legendary').length >= 10);
    SQ('hundred', '💯', 'Centennial', 'Discover world #0100', () => anyW(p => p.num === 100));
    SQ('records', '🏆', 'Record Breaker', 'Hold 5 records at once', () => Object.keys(S.rec).length >= 5);
    SQ('lucky2', '🍀', 'Lucky Streak', 'Make 2 lucky Coordinator trips in a row', () => lastN(2, p => !!p.lucky));
    SQ('allin', '🎰', 'All In', 'Have the Coordinator charged with every chip placed', () => S.coord && S.chips.own > 0 && chipsFree() === 0);
    SQ('chatter', '📡', 'Chatterbox', 'Hear 100 transmissions from your posts', () => posts().reduce((a, x) => a + x.p.post.reports.length, 0) >= 100);
    SQ('mug', '☕', 'Found It!', 'Find Dave\'s Lost Coffee Mug (he\'s been looking everywhere)', () => Object.keys(S.items).some(k => itemName(k) === 'Dave\'s Lost Coffee Mug'));
    SQ('hoarder', '🧺', 'Hoarder', 'Receive 300 collectibles, duplicates included', () => Object.values(S.items).reduce((a, it) => a + it.n, 0) >= 300);
    SQ('variety', '🗃', 'A Bit of Everything', 'Own a collectible from every category you can find', () => CATS.filter(([c]) => catOpen(c)).every(([c]) => catN(c) > 0));
    SQ('dino', '🦴', 'Dino Nerd', 'Own 5 different Fossils', () => catN('fos') >= 5);
    SQ('mixtape', '🎧', 'Mixtape', 'Own 5 different Signals', () => catN('sig') >= 5);
    SQ('purse', '🪙', 'Coin Purse', 'Own 5 different Coins', () => catN('coin') >= 5);
    SQ('weird', '📦', 'Box of Weird', 'Own 5 different Anomalies', () => catN('ano') >= 5);
    SQ('nerd', '🤓', 'Book Smart', 'Reach Knowledge Level 15 while it is 5 above your Captain Level', () => lvInfo(S.kn).L >= 15 && lvInfo(S.kn).L - lvInfo(S.xp).L >= 5);
    SQ('jock', '💪', 'Street Smart', 'Reach Captain Level 30 with a Knowledge Level half as high (or less)', () => lvInfo(S.xp).L >= 30 && lvInfo(S.kn).L * 2 <= lvInfo(S.xp).L);
    SQ('rack', '🎖', 'Medal Rack', 'Unlock 50 medals', () => Object.keys(S.ach).length >= 50);
    SQ('ride', '🚀', 'New Ride', 'Fly any design other than the Scout', () => S.ship.design !== 'Scout');
    SQ('deep', '🧘', 'Deep Work', 'Finish a 60-minute study session', () => (S.cnt.maxFocus || 0) >= 60);
    SQ('habit', '📈', 'Habit Forming', 'Study 7 days in a row', () => !!S.cnt.streak && S.cnt.streak.best >= 7);
    tiers('Adventure', 'dl', '📦', [[1, 'First Delivery'], [10, 'Courier'], [50, 'Express Service'], [150, 'Postmaster of the Stars']], () => (S.dl && S.dl.done) || 0, n => 'Finish ' + n + ' deliver' + (n === 1 ? 'y' : 'ies'));
    SQ('perfect', '📬', 'Signed, Sealed, Delivered', 'Make 10 perfect deliveries', () => (S.cnt.dlPerfect || 0) >= 10);
    SQ('closeenough', '🤷', 'Close Enough', 'Deliver early at a world that is less than half of what they asked for', () => (S.cnt.dlClose || 0) >= 1);
    tiers('Rating', 'rt', '◆', RANKS.slice(2).map(([at, name]) => [at, name]), () => rating(), n => 'Reach a Rating of ' + n.toLocaleString());
    tiers('Adventure', 'enc', '✨', [[1, 'Fancy Meeting You'], [10, 'Well Connected'], [50, 'Everyone Knows You']], () => S.cnt.enc, n => 'Have ' + n + ' arrival encounter' + (n === 1 ? '' : 's'));
    tiers('Adventure', 'ev', '☄', [[1, 'Strange Skies'], [25, 'Seen It All']], () => S.cnt.ev, n => 'Witness ' + n + ' deep-space event' + (n === 1 ? '' : 's'));
    tiers('Adventure', 'srv', '🔍', [[1, 'Surveyor'], [25, 'Field Researcher'], [100, 'Planetary Scientist']], () => S.surveys || 0, n => 'Survey ' + n + ' world' + (n === 1 ? '' : 's'));
    tiers('Collection', 'itm', '🎒', [[10, 'Pack Rat'], [50, 'Curator'], [100, 'Museum Wing'], [200, 'Grand Museum']], () => itemCount(), n => 'Own ' + n + ' different collectibles');
    A('Collection', 'itmall', '🏛', 'The Complete Collection', 'Own every collectible in the universe', () => itemCount() >= ITEM_ALL);
    CATS.forEach(([c, name, , need]) => A('Collection', 'cat-' + c, '📚', 'All the ' + name, 'Own every item in ' + name, () => catTotal(c) > 0 && ITEM_RARS.every(r => catList(c, r).every((_, i) => S.items[itemId(c, r, i)])), need));
    const hasCat = c => Object.keys(S.items).some(k => parseId(k).c === c && itemName(k) !== '???');
    [['sig', '📻', 'Tuned In', 'Find your first Signal'], ['fos', '🦴', 'Bone Collector', 'Find your first Fossil'], ['coin', '🪙', 'Spare Change', 'Find your first Coin'], ['ano', '🌀', 'Please Don\'t Open', 'Find your first Anomaly']].forEach(([c, ic, name, desc]) => A('Collection', 'first-' + c, ic, name, desc, () => hasCat(c), CATS.find(x => x[0] === c)[3]));
    const STAR_MEDAL = { 'red dwarf': 'Crimson Shadows', 'orange dwarf': 'Endless Afternoon', 'yellow dwarf': 'Almost Home', 'white dwarf': 'Cold Light', 'blue giant': 'Blue Sky', 'red giant': 'Swollen Sun', 'binary pair': 'Double Shadows', 'pulsar': 'Cosmic Clock' };
    STARS.forEach(([st]) => A('Stars', 'star-' + st.replace(' ', '-'), '☀', STAR_MEDAL[st] || st, 'Discover a world around a ' + st, () => S.found.some(f => f.p.star === st), 'nav4'));
    A('Stars', 'star-all', '🌌', 'Every Kind of Light', 'Discover a world around every kind of star', () => STARS.every(([st]) => S.found.some(f => f.p.star === st)), 'nav4');
    A('Knowledge', 'story', '📖', 'The Whole Story', 'Read every Ship Log and all ' + (CAMP ? CAMP.logs.length : 100) + ' Meridian logs', () => campDone() && Object.keys(SHIP_LOGS).every(k => S.slog[k]), 'arc5');
    A('Collection', 'legit', '🌟', 'Legendary Curator', 'Own 10 Legendary collectibles', () => Object.keys(S.items).filter(k => parseId(k).r === 'Legendary' && itemName(k) !== '???').length >= 10);
    tiers('Collection', 'trade', '🏪', [[1, 'Window Shopper'], [10, 'Haggler']], () => (S.cnt.bought || 0) + (S.cnt.swaps || 0), n => 'Buy or swap ' + n + ' item' + (n === 1 ? '' : 's') + ' at Trade Stations');
    tiers('Ship', 'room', '🛠', [[1, 'Home Improvement'], [7, 'Fully Fitted']], () => Object.keys(S.rooms).length, n => 'Build ' + n + ' room' + (n === 1 ? '' : 's') + ' on your ship');
    A('Ship', 'roommax', '🏰', 'Luxury Liner', 'Upgrade every room to the max level', () => Object.keys(ROOMS).every(k => roomLv(k) >= ROOM_MAX));
    tiers('Ship', 'crew', '👥', [[1, 'Not Alone Anymore'], [4, 'Full Table'], [8, 'Big Family']], () => S.crew.length, n => 'Have ' + n + ' crew aboard');
    A('Ship', 'roles', '🎭', 'A Bit of Everyone', 'Have one crew member of every role aboard', () => Object.keys(ROLES).every(r => crewN(r) > 0));
    A('Ship', 'color', '🎨', 'Fresh Paint', 'Paint your ship a new color', () => S.ship.colors.length > 1);
    A('Ship', 'design', '🚀', 'New Ride', 'Fly a new ship design', () => S.ship.designs.length > 1);
    A('Ship', 'designs', '🛸', 'Collector\'s Hangar', 'Own every ship design', () => Object.keys(SHIP_DESIGNS).every(k => S.ship.designs.includes(k)));
    tiers('Ship', 'mods', '⚙', [[10, 'Tinkerer'], [30, 'Overclocked'], [60, 'Ship of Theseus']], () => Object.keys(MODS).reduce((a, k) => a + lvl(k) - 1, 0), n => 'Buy ' + n + ' ship module upgrades');
    tiers('Knowledge', 'tech', '🔬', [[1, 'Eureka'], [6, 'Lab Coat'], [12, 'Department Head'], [RES_ALL.length, 'Everything Researched']], () => Object.keys(S.tech).length, n => 'Finish ' + n + ' research' + (n === 1 ? '' : 'es'));
    tiers('Knowledge', 'cap', '⭐', [[10, 'Ensign'], [25, 'Seasoned'], [50, 'Veteran'], [100, 'Star Legend']], () => lvInfo(S.xp).L, n => 'Reach Captain Level ' + n);
    tiers('Knowledge', 'kn', '📚', [[10, 'Bookworm'], [25, 'Well Read'], [50, 'Sage of the Stars'], [100, 'Keeper of the Cosmos']], () => lvInfo(S.kn).L, n => 'Reach Knowledge Level ' + n);
    tiers('Knowledge', 'camp', '📼', [[1, 'The First Log'], [20, 'The Signal'], [40, 'The Long Way'], [60, 'The Quiet Zone'], [80, 'Echoes'], [100, 'The Light Is On']], () => S.camp.n, n => n === 1 ? 'Recover the first Meridian log' : 'Recover ' + n + ' Meridian logs');
    tiers('Knowledge', 'dust', '✦', [[1000, 'Pocket Money'], [10000, 'Well Funded'], [100000, 'Rich Beyond Measure']], () => S.dustTotal, n => 'Earn ' + n.toLocaleString() + ' resources in total');
    const toast = el('div', { class: 'sx-toast', 'aria-live': 'polite', hidden: true }); root.append(toast);
    let toastT = 0;
    function showToast(lines) { toast.replaceChildren(...lines.map(t => el('div', {}, t))); toast.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { toast.hidden = true; }, 6000); }
    let achFirst = true;
    function checkAch() {
      const fresh = ACH.filter(a => !S.ach[a.id] && (!a.req || hasT(a.req)) && (() => { try { return !!a.test(); } catch (e) { return false; } })());
      if (!fresh.length) { achFirst = false; return; }
      fresh.forEach(a => { S.ach[a.id] = Date.now(); });
      if (achFirst && fresh.length > 2) { showToast(['🏅 ' + fresh.length + ' achievements unlocked', 'See them on the Ship page, under Medals.']); }
      else { fresh.forEach(a => pushEv({ ic: '🏅', title: 'Achievement: ' + a.name, t: a.desc + '.', at: Date.now() })); award(10 * fresh.length, 0); flushXP([]); showToast(fresh.slice(0, 3).map(a => '🏅 ' + a.name + ': ' + a.desc)); }
      achFirst = false; save();
    }
    function medalsView(group) {
      const VIS = ACH.filter(a => !a.req || hasT(a.req) || S.ach[a.id]), hid = ACH.length - VIS.length, got = VIS.filter(a => S.ach[a.id]).length;
      const out = [el('p', { class: 'sl-muted' }, got + ' of ' + VIS.length + ' unlocked.' + (hid ? ' ' + hid + ' more are hidden until you research the right things.' : ''))];
      [...new Set(VIS.map(a => a.grp))].forEach(g => { const list = VIS.filter(a => a.grp === g);
        out.push(group(g + ' (' + list.filter(a => S.ach[a.id]).length + ' / ' + list.length + ')', el('div', { class: 'sx-medals' }, list.map(a => el('div', { class: 'sx-medal' + (S.ach[a.id] ? ' on' : '') }, el('span', { class: 'sx-medal-i' }, a.ic), el('b', {}, a.name), el('small', {}, a.desc + (S.ach[a.id] ? '. ' + new Date(S.ach[a.id]).toLocaleDateString() : '')))))));
      });
      return out;
    }
    function crewView(group) { // who's aboard (hiring happens in the Hangar tab on the right)
      const out = [];
      out.push(group('Your crew (' + S.crew.length + ' / ' + bunks() + ' bunks)', S.crew.length ? el('div', { class: 'sl-mods' }, S.crew.map(c => el('div', { class: 'sl-mod' }, el('span', { class: 'sl-mod-i' }, ROLES[c.role][0]),
          el('span', { class: 'sl-row-t' }, el('b', {}, c.name), el('small', {}, c.role + '. ' + c.name.split(' ')[0] + ' ' + c.trait + '. ' + ROLES[c.role][1] + '.'))))) : el('p', { class: 'sl-muted' }, 'Nobody aboard yet. Hire crew from the Hangar tab on the right (you need Crew Quarters first). Each one adds a Ship Activity: a little story and a small bonus every session.')));
      return out;
    }
    function shipView(group) { // the ship itself, as data
      const big = el('img', { class: 'sx-shipbig', src: shipSprite(S.ship.design, S.ship.color, 12).toDataURL(), alt: S.ship.design + ' in ' + S.ship.color });
      const nameIn = el('input', { type: 'text', class: 'sl-find', value: S.ship.name, maxlength: 28, 'aria-label': 'Ship name' });
      nameIn.addEventListener('change', () => { S.ship.name = nameIn.value.trim().slice(0, 28) || 'The Lantern'; save(); draw(); });
      const rooms = Object.entries(ROOMS).map(([k, [ic, name, what]]) => { const l = roomLv(k); return el('tr', {}, el('td', {}, ic + ' ' + name), el('td', {}, l ? 'Lv ' + l : '-'), el('td', {}, what)); });
      const mods = Object.entries(MODS).map(([k, [ic, name, eff, what]]) => el('tr', {}, el('td', {}, ic + ' ' + name), el('td', {}, 'Lv ' + lvl(k) + ' / ' + modMax(k)), el('td', {}, eff(lvl(k)) + ' ' + what)));
      return [group('Your ship', el('div', { class: 'sx-hangar' }, big, el('div', {}, el('label', { class: 'sl-muted' }, 'Name'), nameIn, el('p', { class: 'sl-muted' }, S.ship.design + ', ' + S.ship.color.toLowerCase() + ' hull. ' + Object.keys(S.rooms).length + ' rooms, ' + S.crew.length + ' crew. New colors and designs are in the Hangar tab on the right.')))),
        group('Rooms', el('table', { class: 'sl-rec sl-stats' }, el('tbody', {}, rooms))), group('Modules', el('table', { class: 'sl-rec sl-stats' }, el('tbody', {}, mods)))];
    }
    function hangarView() { // right side: hire crew, buy hull colors and designs
      const out = [], cost = crewCost(), free = bunks() - S.crew.length, pool = crewPool();
      out.push(el('div', { class: 'sx-res' }, el('b', {}, '✦ ' + S.dust.toLocaleString()), el('small', {}, 'resources')));
      out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Hire crew', el('small', { class: 'sx-h-n' }, ' ' + S.crew.length + ' / ' + bunks() + ' bunks')),
        el('p', { class: 'sl-muted' }, !bunks() ? 'Build the Crew Quarters first (Build tab, "Your ship").' : free > 0 ? 'New faces every day.' : 'No free bunks. Upgrade the Crew Quarters.'),
        ...(pool.length ? pool.map((c, i) => el('div', { class: 'sx-up' }, el('b', {}, ROLES[c.role][0] + ' ' + c.name), el('small', {}, c.role + ', says they ' + c.trait + '. ' + ROLES[c.role][1] + '.'),
          el('button', { type: 'button', class: 'btn sx-buy', disabled: free <= 0 || S.dust < cost || null, onclick: () => recruit(i) }, '✦ ' + cost.toLocaleString()))) : [el('p', { class: 'sl-muted' }, 'Everyone today has been hired. Check back tomorrow.')])));
      if (S.crew.length) out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Aboard'), ...S.crew.map((c, i) => el('div', { class: 'sx-up' }, el('b', {}, ROLES[c.role][0] + ' ' + c.name), el('small', {}, c.role), armBtn('Let go', 'Sure?', () => dismiss(i), 'sx-buy')))));
      const capL = lvInfo(S.xp).L, DES_LV = { Scout: 1, Hauler: 5, Needle: 10, Saucer: 15, Manta: 20 };
      const colors = Object.entries(HULL_COLORS).map(([k, hex]) => { const own = S.ship.colors.includes(k), on = S.ship.color === k;
        return el('button', { type: 'button', class: 'sx-swatch' + (on ? ' on' : ''), title: k + (own ? '' : ' (✦ ' + E.shipStyleCost.color + ')'), disabled: (!own && S.dust < E.shipStyleCost.color) || null, onclick: () => buyStyle('color', k) }, el('i', { style: 'background:' + hex }), el('span', {}, own ? k : '✦ ' + E.shipStyleCost.color)); });
      const designs = Object.keys(SHIP_DESIGNS).map(k => { const own = S.ship.designs.includes(k), on = S.ship.design === k, lvOk = capL >= DES_LV[k];
        return el('button', { type: 'button', class: 'sx-design' + (on ? ' on' : ''), disabled: (!own && (!lvOk || S.dust < E.shipStyleCost.design)) || null, onclick: () => buyStyle('design', k) },
          el('img', { src: shipSprite(k, S.ship.color, 4).toDataURL(), alt: '' }), el('b', {}, k), el('small', {}, own ? (on ? 'Flying it' : 'Owned') : lvOk ? '✦ ' + E.shipStyleCost.design : 'Captain Lv ' + DES_LV[k])); });
      out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Hull color'), el('div', { class: 'sx-swatches' }, colors)));
      out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Design'), el('p', { class: 'sl-muted' }, 'New designs unlock at higher Captain levels.'), el('div', { class: 'sx-designs' }, designs)));
      return out;
    }
    function statsView(group) { // everything you've done, for bragging rights
      const fmtN = n => (n || 0).toLocaleString(), allP = S.found.map(f => f.p), pl = posts().map(f => f.p), tps = pl.filter(p => p.post.tp);
      const facs = tps.reduce((a, p) => a.concat(p.post.tp.fac), []), facLv = facs.reduce((a, f) => a + (f.lv || 1), 0), maxed = facs.filter(f => (f.lv || 1) >= FAC_MAX).length;
      const settlers = tps.reduce((a, p) => a + (p.post.tp.pop || 0), 0), heard = pl.reduce((a, p) => a + p.post.reports.length, 0);
      const itemsGot = Object.values(S.items).reduce((a, it) => a + it.n, 0), byR = r => CATS.reduce((a, [c]) => a + catList(c, r).filter((_, i) => S.items[itemId(c, r, i)]).length, 0);
      const charted = Object.values(S.cnt.rar).reduce((a, n) => a + n, 0), ly = allP.reduce((a, p) => a + p.dist, 0) + S.sold.ly;
      const modLv = Object.keys(MODS).reduce((a, k) => a + lvl(k), 0), hrs = S.minutes / 60;
      const cx = lvInfo(S.xp), ck = lvInfo(S.kn);
      const T = (title, rows) => group(title, el('table', { class: 'sl-rec sl-stats' }, el('tbody', {}, rows.filter(Boolean).map(([l, v]) => el('tr', {}, el('td', {}, l), el('td', {}, String(v)))))));
      return [
        T('⭐ Captain', [['⭐ Captain Level', cx.L + ' · ' + titleOf(CAPT, cx.L)], ['📚 Knowledge Level', ck.L + ' · ' + titleOf(KNOW, ck.L)], ['Total XP', fmtN(S.xp)], ['Total Knowledge', fmtN(S.kn)]]),
        T('🚀 Voyage', [['Study sessions finished', fmtN(S.total)], ['Hours studied', Math.round(hrs * 10) / 10], ['Days you studied', fmtN(S.cnt.days)], ['Most sessions in a day', S.rec.dayN ? S.rec.dayN.v : 0], ['★ Full Cycles earned', fmtN(S.cnt.fc)], ['🆘 Distress Runs completed', fmtN(S.drN)], ['Light-years traveled', fmtN(ly)]]),
        T('🪐 Worlds', [['Worlds discovered', fmtN(charted)], ...RARITY.map(([k]) => ['· ' + k, fmtN(S.cnt.rar[k])]), ['🧭 Lucky trips', fmtN(S.cnt.lucky)], ['🧭 Coordinator charges', fmtN(S.cnt.charge)], ['In your Logbook now', fmtN(S.found.length)], ['💰 Worlds sold', fmtN(S.sold.n) + ' for ✦ ' + fmtN(S.sold.dust)], ['🏆 Records held', REC.filter(([k]) => S.rec[k]).length]]),
        T('⚠ Adventures', [['Deep-space events', fmtN(S.cnt.ev)], ['Arrival encounters', fmtN(S.cnt.enc)], ['🏴 Outlaw gangs met', fmtN(S.cnt.outlaws)], ['⚔ Outlaw gangs beaten', fmtN(S.fights)], ['🎯 Bounties completed', fmtN(S.bDone)], ['🔍 Surveys', fmtN(S.surveys)]]),
        T('🎒 Collection', [['Unique collectibles', itemCount() + ' / ' + ITEM_TOTAL + ' (' + Math.round(itemCount() / ITEM_TOTAL * 100) + '%)'], ['Collectibles received (with duplicates)', fmtN(itemsGot)], ...ITEM_RARS.map(r => ['· ' + r, byR(r) + ' / ' + CATS.reduce((a, [c]) => a + (catOpen(c) ? catList(c, r).length : 0), 0)]), ...CATS.filter(([c]) => catOpen(c)).map(([c, name]) => ['· ' + name, ITEM_RARS.reduce((a, r) => a + catList(c, r).filter((_, i) => S.items[itemId(c, r, i)]).length, 0) + ' / ' + catTotal(c)])]),
        T('🏘 Posts', [['🗼 Listening Posts', fmtN(pl.length)], ['🏘 Travelers\' Posts', fmtN(tps.length)], ['Facilities built', fmtN(facs.length)], ['Facility levels (total)', fmtN(facLv)], ['Facilities at level ' + FAC_MAX, fmtN(maxed)], ['Settlers', fmtN(settlers)], ['📡 Transmissions heard', fmtN(heard)]]),
        T('✦ Economy', [['Resources now', fmtN(S.dust)], ['Resources earned (all time)', fmtN(S.dustTotal)], ['Resources spent', fmtN(S.dustTotal - S.dust)], ['Ship module levels (total)', fmtN(modLv)], ['Trade per session', fmtN(Math.round(tradeIncome() * INCOME))]]),
      ];
    }

    /* ---------- logbook ---------- */
    // the Logbook: a grid of every world you've found; click one to open its own page (Back returns to the grid)
    let openNum = null, gridScroll = 0, shownList = [];
    const body = () => root.querySelector('.sl-body');
    function openWorld(n) { if (openNum == null) gridScroll = body().scrollTop; openNum = n; drawLog(); body().scrollTop = 0; }
    function closeWorld() { openNum = null; drawLog(); body().scrollTop = gridScroll; }
    function drawLog() {
      const tools = logPane.querySelector('.sl-tools');
      if (openNum === 'items') openNum = null;
      const f0 = openNum != null && byNum(openNum);
      logHead.hidden = tools.hidden = !!f0;
      if (f0) { drawWorld(f0); return; }
      openNum = null;
      const ly = S.found.reduce((a, f) => a + f.p.dist, 0);
      const counts = {}; S.found.forEach(f => { counts[f.p.rarity] = (counts[f.p.rarity] || 0) + 1; });
      const tp = tunedP(), pc = posts().length;
      logHead.replaceChildren(
        el('div', {}, el('b', {}, S.found.length + ' world' + (S.found.length === 1 ? '' : 's') + ' charted')),
        el('div', { class: 'sl-muted' }, (ly + S.sold.ly).toLocaleString() + ' light-years of travel · ' + Math.round(S.minutes / 60 * 10) / 10 + ' hours studying' + (S.sold.n ? ' · 💰 ' + S.sold.n + ' sold for ✦ ' + S.sold.dust.toLocaleString() : '')),
        el('div', { class: 'sl-rarcount' }, RARITY.map(([k]) => el('span', { class: 'sl-rar sl-r-' + k.toLowerCase() }, k + ' ' + (counts[k] || 0)))),
        el('div', { class: 'sl-muted' }, pc ? pc + ' post' + (pc === 1 ? '' : 's') + (tp ? '. Satellite tuned to ' + nm(tp) : '. Satellite not tuned') + '. Manage them under Build on the main screen.' : 'No posts yet. Use Build on the right side of the main screen.'));
      logList.className = 'sl-list';
      if (!S.found.length) { logList.replaceChildren(el('p', { class: 'sl-empty' }, 'No worlds yet. Finish a trip on the Voyage tab to discover your first planet.')); return; }
      const q = find.value.trim().toLowerCase(), ty = typeSel.value, ra = rarSel.value;
      shownList = S.found.slice().reverse().filter(f => (!ty || (ty === '@post' ? !!f.p.post : f.p.type === ty)) && (!ra || f.p.rarity === ra) && (!q || ((f.p.custom || '') + ' ' + f.p.name + ' ' + f.p.code + ' ' + f.p.log + ' ' + f.p.biomes.join(' ')).toLowerCase().includes(q)));
      if (!shownList.length) { logList.replaceChildren(el('p', { class: 'sl-empty' }, 'No worlds match.')); return; }
      logList.className = 'sl-grid';
      const plain = !q && !ty && !ra, ROW = 12, blanks = plain ? Math.max(ROW, Math.ceil((shownList.length + 1) / ROW) * ROW) - shownList.length : 0;
      const unknown = () => el('span', { class: 'sl-tile sl-unknown', title: 'Still out there. Finish a study session to find it.' }, el('span', { class: 'sl-tile-pic' }, '???'), el('b', {}, '???'), el('small', {}, 'uncharted'));
      logList.replaceChildren(...shownList.slice(0, 400).map(f => {
        const p = f.p, tuned = S.tuned === p.num && !!p.post;
        const marks = (held(p) ? '🏴' : '') + (p.post ? (p.post.tp ? '🏘' : '🗼') : '') + (tuned ? '📡' : '');
        return el('button', { type: 'button', class: 'sl-tile sl-t-' + p.rarity.toLowerCase(), title: nm(p) + ' · ' + p.type + ' · ' + p.rarity, onclick: () => openWorld(p.num) },
          el('span', { class: 'sl-tile-pic' }, el('img', { src: paint(p, 32), alt: '' }), marks ? el('span', { class: 'sl-tile-m' }, marks) : null),
          el('b', {}, nm(p)), el('small', {}, pad(p.num) + ' · ' + p.type));
      }), ...Array.from({ length: blanks }, unknown));
    }
    let bulkR = 'Common';
    let itemCatTab = 'cur';
    function drawItems() {
      const have = (c, r) => catList(c, r).filter((_, i) => S.items[itemId(c, r, i)]).length, catHave = c => ITEM_RARS.reduce((a, r) => a + have(c, r), 0);
      const nav = el('div', { class: 'sl-wnav' }, el('b', {}, 'Collection: ' + itemCount() + ' / ' + ITEM_TOTAL), el('span', { class: 'sl-muted' }, Math.round(itemCount() / ITEM_TOTAL * 100) + '% found'));
      const tabs = el('div', { class: 'sl-stabs', role: 'tablist' }, CATS.map(([c, name]) => el('button', { type: 'button', role: 'tab', class: 'sl-stab' + (catOpen(c) ? '' : ' sx-lockt'), 'aria-selected': String(c === itemCatTab), onclick: () => { itemCatTab = c; drawItems(); } }, catOpen(c) ? name + ' ' + catHave(c) + '/' + catTotal(c) : '🔒 ' + name)));
      const [c, cname, blurb, need] = CATS.find(x => x[0] === itemCatTab) || CATS[0];
      const needN = need && !catOpen(c) ? RES_ALL.find(n => n[0] === need) : null;
      const groups = needN ? [el('p', { class: 'sx-lockmsg' }, '🔒 ' + catTotal(c) + ' ' + cname.toLowerCase() + ' to find. Research ' + needN[1] + ' (Xenology, ' + rcost(needN) + ' pts) and they start turning up.')] : ITEM_RARS.filter(r => catList(c, r).length).map(r => {
        const list = catList(c, r), h = have(c, r);
        return el('div', { class: 'sl-col-g' }, el('div', { class: 'sl-col-h' }, el('span', { class: 'sl-rar sl-r-' + r.toLowerCase() }, r), el('span', { class: 'sl-muted' }, h + ' / ' + list.length)),
          h ? el('ul', { class: 'sl-col-l' }, list.map((name, i) => [name, S.items[itemId(c, r, i)]]).filter(x => x[1]).sort((x, y) => x[0].localeCompare(y[0])).map(([name, it]) =>
            el('li', { class: 'sl-col-i sl-ci-' + r.toLowerCase(), title: 'First found ' + new Date(it.at).toLocaleDateString() + (it.from && byNum(it.from) ? ' on ' + nm(byNum(it.from).p) : '') }, name, it.n > 1 ? el('small', {}, ' ×' + it.n) : null))) : null,
          h < list.length ? el('div', { class: 'sl-col-more' }, (list.length - h) + ' more ' + r.toLowerCase() + ' ' + (list.length - h === 1 ? 'item' : 'items') + ' still out there') : el('div', { class: 'sl-col-more done' }, 'All ' + r.toLowerCase() + ' ' + cname.toLowerCase() + ' found!'));
      });
      itemsPane.replaceChildren(el('div', { class: 'sl-wpage' }, nav, el('p', { class: 'sl-muted' }, 'Discover (surveying the world you\'re at) turns up one or two. What you find depends on the world: living worlds give specimens, strange ones give artifacts and relics. Outlaws drop weapon and tech parts. Trade Stations sell and swap them.'), tabs, el('p', { class: 'sl-muted' }, blurb + '.'), ...groups));
    }
    function drawWorld(f) {
      const p = f.p;
      const list = shownList.length ? shownList : S.found.slice().reverse(), i = list.findIndex(x => x.p.num === p.num);
      const prev = i > 0 ? list[i - 1] : null, next = i >= 0 && i < list.length - 1 ? list[i + 1] : null;
      const nav = el('div', { class: 'sl-wnav' },
        el('button', { type: 'button', class: 'btn', onclick: closeWorld }, '◂ Logbook'),
        el('span', { class: 'sl-muted' }, i >= 0 ? (i + 1) + ' of ' + list.length : ''),
        el('span', { class: 'sl-wnav-r' },
          el('button', { type: 'button', class: 'btn', title: prev ? 'Previous: ' + nm(prev.p) : '', disabled: !prev || null, onclick: () => prev && openWorld(prev.p.num) }, '◂'),
          el('button', { type: 'button', class: 'btn', title: next ? 'Next: ' + nm(next.p) : '', disabled: !next || null, onclick: () => next && openWorld(next.p.num) }, '▸')));
      const cardEl = el('div', { class: 'sl-card sl-world' }, ...planetCard(p, 'log'));
      const sv = cardEl.querySelector('details.sl-more'); if (sv) sv.open = true;
      logList.className = 'sl-wpage';
      logList.replaceChildren(nav, el('div', { class: 'sl-muted sl-found-on' }, (S.at === p.num ? '📍 You are here · ' : '') + 'Discovered ' + new Date(f.at).toLocaleString()), cardEl);
    }
    logPane.addEventListener('keydown', e => { if (openNum == null || e.target.closest('input, select')) return; if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); closeWorld(); } });
    function rename(p) {
      const v = window.prompt('Name this world (leave empty to restore "' + p.name + '"):', nm(p));
      if (v == null) return;
      const t = v.trim().slice(0, 32);
      if (t && t !== p.name) p.custom = t; else delete p.custom;
      save(); drawLog(); draw();
    }
    find.addEventListener('input', drawLog); typeSel.addEventListener('change', drawLog); rarSel.addEventListener('change', drawLog);

    /* ---------- resume a timer that was running when the page closed ---------- */
    if (S.run && S.run.running) {
      if (S.run.endAt > Date.now()) { running = true; endAt = S.run.endAt; loop(); }
      else { const was = S.run.mode; mode = was; finish(true); hint.textContent = was === 'focus' ? 'Your session finished while you were away.' : 'Your break finished while you were away. Equipment ready.'; }
    }
    if (S.found.length && card.hidden) showCard(S.found[S.found.length - 1].p, 'last');
    draw();
    document.addEventListener('visibilitychange', () => { if (!document.hidden && running && remaining() <= 0) finish(); });
    return { running: () => running };
  }
  window.Solarist = { mount, makePlanet, makeExtra, paint, lookOf, shipSprite };
})();
