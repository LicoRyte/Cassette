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
  let ITEM_TOTAL = ITEM_RARS.reduce((a, r) => a + ITEMS[r].length, 0);
  function applyItems(j) { // apps/solarist-items.json replaces the built-in lists (only lists of text count; anything else is ignored)
    if (!j || typeof j !== 'object') return;
    ITEM_RARS.forEach(r => { const l = j[r]; if (Array.isArray(l)) { const ok = l.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()); if (ok.length) ITEMS[r] = ok; } });
    ITEM_TOTAL = ITEM_RARS.reduce((a, r) => a + ITEMS[r].length, 0);
  }
  const ITEM_W = { normal: { Common: 55, Uncommon: 28, Rare: 13, Legendary: 4 }, better: { Common: 30, Uncommon: 38, Rare: 24, Legendary: 8 } };
  const itemName = id => { const [r, i] = id.split(':'); return (ITEMS[r] || [])[+i] || '???'; };
  function rollItem(p, better) { // pick a rarity, then any item of that rarity
    const w = ITEM_W[better ? 'better' : 'normal'];
    let x = Math.random() * ITEM_RARS.reduce((a, r) => a + w[r], 0), rar = 'Common';
    for (const r of ITEM_RARS) { if ((x -= w[r]) < 0) { rar = r; break; } }
    const i = Math.floor(Math.random() * ITEMS[rar].length);
    return { id: rar + ':' + i, name: ITEMS[rar][i], rar };
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
    incomeMultiplier: 1.3, session: { perStudyMinute: .8, minimum: 6, eventBonus: 20, rarityBonus: { Common: 0, Uncommon: 10, Rare: 30, Legendary: 80 } },
    engineBonusPerLevel: .03, fight: { min: 40, max: 80 }, fullCycle: { base: 50, perHullLevel: 15 }, bountyMultiplier: 1.5,
    encounters: { chance: .1, scale: 1, rareWorldMultiplier: 1.5 }, trade: { perFacilityLevel: 1, cap: 60 },
    sell: { rarity: { Common: 10, Uncommon: 25, Rare: 70, Legendary: 200 }, perHabitabilityPercent: .5, earthLike: 25, earthLikeAt: 80, perLifeLevel: 8, anomaly: 25, rings: 8, perMoon: 2, moonCap: 20, perRecord: 30 },
    distressRun: { base: 500, random: 200, bonusMin: 100, bonusMax: 250 }, moduleCost: { base: 50, growth: 1.25 }, facilityCost: { base: 64, growth: 1.6, maxLevel: 10 },
  };
  function mergeEcon(d, o) { // copy numbers from the JSON over the defaults, ignoring notes and anything that isn't the right type
    if (!o || typeof o !== 'object') return d;
    const out = Array.isArray(d) ? d.slice() : Object.assign({}, d);
    Object.keys(d).forEach(k => { const v = o[k]; if (v == null) return; if (typeof d[k] === 'number') { if (typeof v === 'number' && isFinite(v) && v >= 0) out[k] = v; } else if (typeof d[k] === 'object') out[k] = mergeEcon(d[k], v); });
    return out;
  }
  function mount(root, hooks, econ, items) {
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
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
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
      const j = S.job, f = byNum(j.num); if (!f) return null; const p = f.p;
      if (j.k === 'post' && !p.post) return { k: 'post', p };
      if (j.k === 'upgrade' && p.post && !p.post.tp) return { k: 'upgrade', p };
      if (j.k === 'add' && p.post && p.post.tp && FAC[j.fac] && !hasFac(p, j.fac)) return { k: 'add', p, fac: j.fac };
      return null;
    }
    const jobText = j => j.k === 'post' ? 'Building a Listening Post on ' + nm(j.p) : j.k === 'upgrade' ? 'Upgrading ' + nm(j.p) + ' to a Travelers\' Post' : 'Building a ' + FAC[j.fac][1] + ' at ' + nm(j.p);
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
    if (!S.cnt) { // lifetime counters for the Stats page, seeded from what's already in the save
      const key = t => { const x = new Date(t); return x.getFullYear() + '-' + x.getMonth() + '-' + x.getDate(); };
      S.cnt = { rar: {}, lucky: 0, outlaws: 0, enc: 0, ev: (S.events || []).filter(e => e.ic !== '⚔').length, fc: 0, charge: 0, days: new Set(S.found.map(f => key(f.at))).size || (S.total ? 1 : 0), hiDist: 0 };
      if (S.found.some(f => key(f.at) === key(Date.now()))) S.cnt.lastDay = today();
      S.found.forEach(({ p }) => { S.cnt.rar[p.rarity] = (S.cnt.rar[p.rarity] || 0) + 1; if (p.lucky) S.cnt.lucky++; if (p.outlaw) S.cnt.outlaws++; if (p.enc) S.cnt.enc++; });
    }
    const atP = () => { const f = S.at && byNum(S.at); return f ? f.p : null; };
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
    const itemCount = () => Object.keys(S.items).length;
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
    let encGot = null;
    const heldP = () => { const f = S.outlaw && byNum(S.outlaw); return f && f.p.outlaw && !f.p.outlaw.cleared ? f.p : null; };
    const held = p => !!(p.outlaw && !p.outlaw.cleared);
    if (!S.events) S.events = []; if (!S.fc) S.fc = { n: 0, broken: false };
    function rollEvent(force) {
      if (!force && Math.random() >= evChance(lvl('comms'))) return null;
      const pk = a => a[Math.floor(Math.random() * a.length)];
      const nameBit = () => { let n = ''; for (let i = 0; i < 2; i++) n += pk(SYL); return n.charAt(0).toUpperCase() + n.slice(1); };
      const pl = posts(); const pool = EVENTS.filter(e => e[1] !== 'Distress call' || pl.length);
      const [ic, title, tpl, reward] = pk(pool);
      let t = tpl.replace('{who}', pk(TITLE) + ' ' + nameBit()).replace('{msg}', pk(BOTTLE)).replace('{fix}', pk(FIX))
        .replace('{post}', pl.length ? nm(pk(pl).p) : 'nowhere').replace('{world}', S.found.length ? nm(pk(S.found).p) : nameBit());
      let got = null;
      if (reward === 'charge') { if (!S.coord) { S.coord = true; got = '🧭 The Interplanetary Coordinator is charged!'; } else t += ' (The Coordinator was already full.)'; }
      const ev = { ic, title, t, got, at: Date.now() };
      S.events.push(ev); if (S.events.length > 200) S.events.shift(); S.cnt.ev++;
      return ev;
    }
    /* ---------- Progression: Stardust (earned every study session), ship modules and facility levels to spend it on,
       growing Travelers' Posts, rotating bounties and personal records. None of it ever runs out. ---------- */
    if (S.dust == null) S.dust = 0; if (S.dustTotal == null) S.dustTotal = S.dust;
    if (!S.mods) S.mods = {}; if (!S.bounties) S.bounties = []; if (!S.rec) S.rec = {}; if (!S.bDone) S.bDone = 0;
    const lvl = k => S.mods[k] || 1;
    const evChance = l => Math.min(.2, 1 / 15 + (l - 1) * .005);
    const MODS = {
      engine: ['🚀', 'Engine', l => '+' + Math.round((l - 1) * E.engineBonusPerLevel * 100) + '%', 'resources from every session'],
      scanner: ['📡', 'Scanner', l => '+' + Math.min(20, l - 1) + '%', 'chance of an anomaly on new worlds'],
      lab: ['🧪', 'Lab', l => Math.min(50, (l - 1) * 4) + '%', 'chance of a bonus transmission from the tuned post'],
      comms: ['📻', 'Comms', l => '1 in ' + Math.round(1 / evChance(l)), 'sessions has a deep-space event'],
      hull: ['🛡', 'Hull', l => '+' + Math.round((E.fullCycle.base + (l - 1) * E.fullCycle.perHullLevel) * E.incomeMultiplier) + ' ✦', 'for every Full Cycle'],
    };
    const modCost = k => Math.round(E.moduleCost.base * Math.pow(E.moduleCost.growth, lvl(k) - 1));
    const facCost = lv => Math.round(E.facilityCost.base * Math.pow(E.facilityCost.growth, lv - 2)); // lv = the level you're upgrading to
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
        const b = lvInfo(S[k]).L; S[k] = (S[k] || 0) + n; const a = lvInfo(S[k]).L;
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
    const tradeIncome = () => Math.min(E.trade.cap, Math.round(E.trade.perFacilityLevel * posts().reduce((n, { p }) => n + (p.post.tp ? p.post.tp.fac.reduce((a, f) => a + (f.lv || 1), 0) : 0), 0)));
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
      S.events.push({ ic: '🆘', title: 'Distress Run accepted: ' + title, t: intro, at: Date.now() });
      hint.textContent = '🆘 ' + intro + ' ' + S.dr.need + ' study sessions to get there and back. No other missions until it\'s done.';
      save(); draw();
    }
    function drAbandon() { const sc = DISTRESS[S.dr.sc]; S.events.push({ ic: '🆘', title: 'Distress Run abandoned: ' + sc[1], t: 'The ship turned back. Someone else will have to answer this one.', at: Date.now() }); S.dr = null; hint.textContent = 'Distress Run abandoned. You can try again tomorrow.'; save(); draw(); }
    function drLeg(reps) { // one study session of the run; the last one pays out
      const d = S.dr, [ic, title, , beats, thanks] = DISTRESS[d.sc]; d.n++;
      const bi = d.n >= d.need ? 3 : d.n === 1 ? 0 : d.n % 2 === 0 ? 1 : 2;
      if (d.n < d.need) {
        reps.unshift({ ev: { battle: true, ic: '🆘', title: title + ' · Act ' + ROMAN(d.n), t: beats[bi] } });
        return 'Act ' + ROMAN(d.n) + ' of the Distress Run done. ' + (d.need - d.n) + (d.need - d.n === 1 ? ' act' : ' acts') + ' to go.';
      }
      const dust = Math.round(E.distressRun.base + Math.random() * E.distressRun.random); S.dust += dust; S.dustTotal += dust;
      const bonus = [];
      const opts = ['dust', 'item', 'event'].concat(S.coord ? [] : ['coord']), pick = opts[Math.floor(Math.random() * opts.length)];
      if (pick === 'dust') { const b = Math.round(E.distressRun.bonusMin + Math.random() * Math.max(0, E.distressRun.bonusMax - E.distressRun.bonusMin)); S.dust += b; S.dustTotal += b; bonus.push('a bonus of ✦ ' + b + ' from a grateful passenger'); }
      else if (pick === 'item') { const it = rollItem(atP(), true), nw = gainItem(it, atP()); bonus.push('a keepsake: ' + it.name + ' (' + it.rar + (nw ? ', new!' : '') + ')'); if (nw) award(0, 12); }
      else if (pick === 'event') { S.eventNext = true; bonus.push('a tip about something strange out there (your next trip has an event)'); }
      else { S.coord = true; bonus.push('a full charge for the Interplanetary Coordinator'); }
      award(250, 120); S.drN = (S.drN || 0) + 1; S.dr = null;
      const got = '+' + dust + ' ✦ · ' + bonus[0].replace(/^./, c => c.toUpperCase());
      reps.unshift({ ev: { battle: true, ic: '🆘', title: 'Distress Run complete: ' + title, t: beats[3] + ' ' + thanks, got } });
      S.events.push({ ic: '🆘', title: 'Distress Run complete: ' + title, t: beats[3] + ' ' + thanks, got, at: Date.now() });
      return '🆘 Distress Run complete! ✦ ' + dust + ' plus ' + bonus[0] + '.';
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
      return out.filter(x => x[1] > 0).map(([l, v]) => [l, Math.round(v * INCOME)]);
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
      let got = 0;
      list.forEach(p => { const v = sellPrice(p); got += v; S.dust += v; S.dustTotal += v; S.sold.n++; S.sold.ly += p.dist; S.found = S.found.filter(f => f.p !== p); });
      shownList = shownList.filter(f => !list.includes(f.p));
      S.sold.dust += got; award(5 * list.length, 0); flushXP([]);
      save(); return got;
    }
    // everything that happens at the end of a study session, shown together under the timer
    function sessionEnd(reps, p, ev) {
      const notes = [];
      let earned = Math.max(E.session.minimum, Math.round(S.set.focus * E.session.perStudyMinute)) + (p ? RAR_BONUS[p.rarity] || 0 : 0) + (ev ? E.session.eventBonus : 0);
      earned *= 1 + (lvl('engine') - 1) * E.engineBonusPerLevel;
      notes.push('✦ +' + addDust(earned) + ' resources');
      if (encGot) { notes.push(encGot.ic + ' +' + encGot.dust + ' resources (' + encGot.title.replace(/!$/, '') + ')'); encGot = null; }
      const trade = tradeIncome(); if (trade) notes.push('🏘 +' + addDust(trade) + ' resources in trade from your Travelers\' Posts');
      if (p) { checkRecords(p, notes); checkBounties({ planet: p }, notes); }
      checkBounties({ session: true }, notes);
      growPosts(notes);
      if (!S.rec.dayN || S.todayN > S.rec.dayN.v) { if (S.rec.dayN && S.todayN > S.rec.dayN.v) notes.push('🏆 New record! Most sessions in a day: ' + S.todayN); S.rec.dayN = { v: S.todayN, date: Date.now() }; }
      reps.forEach(({ rep }) => { if (rep) award(0, KN_REP[rep.k] || 10); }); // everything heard teaches you something
      if (ev && !ev.battle) award(10, 15);
      if (p) award(0, 10); // the new world's survey log
      flushXP(notes);
      showTrans(reps.concat(notes.length ? [{ notes }] : []));
    }
    function shopXP(n) { award(n, 0); const out = flushXP([]); const msg = out.join(' '); hint.textContent = msg; lvMsg = msg; lvMsgAt = Date.now(); }
    let lvMsg = '', lvMsgAt = 0;
    function upgradeMod(k) { const c = modCost(k); if (S.dust < c) return; S.dust -= c; S.mods[k] = lvl(k) + 1; shopXP(15); save(); draw(); }
    function upgradeFac(p, f) { const lv = f.lv || 1, c = facCost(lv + 1); if (lv >= FAC_MAX || S.dust < c) return; S.dust -= c; f.lv = lv + 1; shopXP(10 + 5 * lv); save(); draw(); }

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
    const MISSIONS = [['explore', '🚀', 'Explore', 'Find a new world'], ['discover', '🔍', 'Discover', 'Survey the world you\'re at for collectibles'], ['build', '🗼', 'Build', 'Build a Listening Post, upgrade one to a Travelers\' Post, or add a facility'], ['charge', '🧭', 'Charge', 'Charge the Interplanetary Coordinator: your next Explore is a lucky one']];
    const curMission = () => S.mission > 0 ? 'build' : S.mission === -1 ? 'charge' : S.mission === -2 ? 'discover' : 'explore';
    function setMission(m, num) {
      if (running && mode === 'focus') return;
      if (m === 'explore') S.mission = 0;
      else if (m === 'charge') { if (S.coord) return; S.mission = -1; }
      else if (m === 'discover') { const a = atP(); if (!a || held(a)) return; S.mission = -2; }
      else { if (building()) { S.mission = 1; } else { const o = buildOptions(), first = (o.Facilities[0] || o.Upgrades[0] || o['New Listening Posts'][0]); if (!first) return; S.mission = 1; S.job = { k: first.k, num: first.num, fac: first.fac }; } }
      save(); hint.textContent = ''; draw();
    }
    const MIS_ORDER = ['explore', 'discover', 'charge', 'build'];
    const misBtns = MIS_ORDER.map(k => MISSIONS.find(m => m[0] === k)).map(([k, ic, label, tip], i) => el('button', { type: 'button', class: 'sl-mis', 'data-m': k, 'data-key': i + 1, role: 'radio', title: tip + ' (key ' + (i + 1) + ')', onclick: () => setMission(k) }, el('span', { class: 'sl-mis-i', 'aria-hidden': 'true' }, ic), label));
    const buildSel = el('select', { class: 'sl-build-sel', 'aria-label': 'World to build on' });
    buildSel.addEventListener('change', () => setJob(buildSel.value));
    const mission = el('div', { class: 'sl-missions' }, el('span', { class: 'sl-mis-l' }, 'Mission:'), el('div', { class: 'sl-mis-g', role: 'radiogroup', 'aria-label': 'Mission' }, misBtns), buildSel);
    const lvStrip = el('div', { class: 'sl-lv', title: 'Captain Level (XP) and Knowledge Level. Details on Ship → Ship.' });
    function lvBar(k, ic, list, full) {
      const i = lvInfo(S[k]), pct = i.need ? Math.round(i.into / i.need * 100) : 100, t = titleOf(list, i.L);
      const bar = el('span', { class: 'sl-lv-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-label': (k === 'xp' ? 'Captain' : 'Knowledge') + ' level progress' },
        el('i', { style: 'width:' + pct + '%' }), el('em', {}, i.need ? i.into + ' / ' + i.need : 'MAX'));
      if (!full) return el('span', { class: 'sl-lv-i sl-lv-' + k }, el('b', {}, ic + ' Lv ' + i.L), el('span', { class: 'sl-lv-t' }, t), bar);
      return el('div', { class: 'sl-lv-row sl-lv-' + k },
        el('div', { class: 'sl-lv-head' }, el('b', {}, ic + ' ' + (k === 'xp' ? 'Captain' : 'Knowledge') + ' Level ' + i.L), el('span', {}, t)), bar,
        el('small', { class: 'sl-muted' }, i.need ? (i.need - i.into) + (k === 'xp' ? ' XP' : ' Knowledge') + ' to Lv ' + (i.L + 1) : 'Maxed out. ' + (S[k] || 0).toLocaleString() + ' total.'));
    }
    function drawLv() { lvStrip.replaceChildren(lvBar('xp', '⭐', CAPT), lvBar('kn', '📚', KNOW)); }
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
    const sec = (title, ...kids) => el('div', { class: 'sx-sec' }, title ? el('h3', {}, title) : null, ...kids);
    const cycleBar = el('div', { class: 'sx-cycle', 'aria-hidden': 'true' });
    const nameBox = el('button', { type: 'button', class: 'sx-name', title: 'Open in the Logbook' });
    const planetSpot = el('div', { class: 'sx-planet', 'aria-hidden': 'true' });
    const leftCol = el('section', { class: 'sx-side sx-left', 'aria-label': 'Quests' });
    const rightCol = el('section', { class: 'sx-side sx-right', 'aria-label': 'Resources and upgrades' });
    const feedLine = el('button', { type: 'button', class: 'sx-feed', title: 'All transmissions and the ship\'s log', onclick: () => { shipTab = 'Logs'; tab('ship'); } });
    const reportBtn = el('button', { type: 'button', class: 'sl-link sx-replay', hidden: true, onclick: () => openReport() }, 'Last session report');
    const report = el('div', { class: 'sx-report', hidden: true, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Session report' },
      el('div', { class: 'sx-report-in' }, el('h2', {}, 'Session report'), encBox, trans, card, el('div', { class: 'sx-report-ft' }, el('button', { type: 'button', class: 'btn sl-go', onclick: () => closeReport() }, 'Continue'))));
    report.addEventListener('click', e => { if (e.target === report) closeReport(); });
    function openReport() { if (trans.hidden && card.hidden && encBox.hidden) return; report.hidden = false; reportBtn.hidden = false; const b = report.querySelector('.sx-report-ft .btn'); if (b) b.focus({ preventScroll: true }); }
    function closeReport() { report.hidden = true; }
    const status = el('span', { class: 'sx-cap' }), status2 = el('span', { hidden: true });
    const timeBlock = el('div', { class: 'sx-clock' }, screen, cycleBar, status);
    const midCol = el('section', { class: 'sx-mid' }, nameBox, planetSpot, timeBlock, mission, el('div', { class: 'sl-btns' }, startB, resetB, skipB), hint, reportBtn);
    settings.open = true;
    const appSettings = el('div', { class: 'sx-appset' });
    const settingsPane = el('div', { class: 'sl-pane', hidden: true },
      sec('Timer', settings), sec('Switch the timer by hand', el('p', { class: 'sl-muted' }, 'Normally Solarist moves between study and breaks for you.'), el('div', { class: 'sl-modes' }, modeBtns)), sec('App', appSettings));
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
    const pageTitle = el('h2', { class: 'sx-page-t' });
    const page = el('div', { class: 'sx-page', hidden: true },
      el('div', { class: 'sx-page-h' }, pageTitle, el('button', { type: 'button', class: 'btn', onclick: () => tab('timer') }, 'Back to the voyage')),
      el('div', { class: 'sl-body' }, logPane, shipPane, itemsPane, settingsPane));
    [tabTimer, tabLog, tabShip].forEach(b => b.removeAttribute('role'));
    root.classList.add('sx');
    root.replaceChildren(el('header', { class: 'sx-top' }, lvStrip, el('nav', { class: 'sx-nav', 'aria-label': 'Pages' }, tabLog, tabShip, tabItems, tabSet)), leftCol, midCol, rightCol, feedLine, report, page, el('div', { hidden: true }, tabTimer, status2));
    function tab(t) {
      if (t === 'log' && !logPane.hidden && !page.hidden) openNum = null; // pressing Logbook again goes back to the grid
      const names = { log: 'Logbook', ship: 'Ship', items: 'Collection', settings: 'Settings' };
      page.hidden = t === 'timer'; pageTitle.textContent = names[t] || '';
      [[tabLog, 'log'], [tabShip, 'ship'], [tabItems, 'items'], [tabSet, 'settings']].forEach(([b, k]) => { if (k === t) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
      logPane.hidden = t !== 'log'; shipPane.hidden = t !== 'ship'; itemsPane.hidden = t !== 'items'; settingsPane.hidden = t !== 'settings';
      root.classList.toggle('paged', t !== 'timer');
      if (t === 'ship') drawShip();
      if (t === 'items') drawItems();
      if (t === 'log') drawLog();
      if (t === 'settings' && hooks.settings) hooks.settings(appSettings);
      if (t !== 'timer') { const bd = root.querySelector('.sl-body'); if (bd && t !== 'log') bd.scrollTop = 0; }
    }
    // the world shown in the middle of the screen
    function scenePlanet(kind) {
      const b = building();
      return kind === 'build' ? b.p : kind === 'fight' ? heldP() : kind === 'distress' ? null : kind === 'explore' && running ? null : atP();
    }
    const sceneKind = () => mode !== 'focus' ? 'break' : S.dr ? 'distress' : building() ? 'build' : charging() ? 'charge' : discovering() ? 'discover' : heldP() ? 'fight' : 'explore';
    function drawName() {
      const kind = sceneKind(), p = scenePlanet(kind);
      nameBox.disabled = !p;
      nameBox.replaceChildren(...(p ? [el('b', {}, nm(p)), el('span', {}, p.type + ' world, ', el('i', { class: 'sx-r-' + p.rarity.toLowerCase() }, p.rarity), ', ' + (p.x || (p.x = makeExtra(p))).hab + '% habitable' + (held(p) ? ', held by outlaws' : ''))]
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
      leftCol.replaceChildren(
        sec('Distress Run', drBox, drInfo),
        sec('Bounties', ...qs, el('p', { class: 'sl-muted' }, S.bDone + ' completed so far')),
        sec('Interplanetary Coordinator', el('p', {}, S.coord ? 'Charged. Your next Explore heads somewhere promising.' : 'Empty. One study session of Charge makes your next Explore a lucky one.'), coordB));
    }
    function drawRight() {
      const locked = running && mode === 'focus', bj = building(), trade = Math.round(tradeIncome() * INCOME);
      const up = (name, small, btn) => el('div', { class: 'sx-up' }, el('b', {}, name), el('small', {}, small), btn);
      const buy = (cost, onclick, label) => el('button', { type: 'button', class: 'btn sx-buy', disabled: S.dust < cost || null, onclick }, label || '✦ ' + cost.toLocaleString());
      const queue = key => { const on = bj && jobKey(bj) === key; return el('button', { type: 'button', class: 'btn sx-buy' + (on ? ' on' : ''), disabled: locked || on || !!S.dr || null, title: 'Your next study session builds it', onclick: () => setJob(key) }, on ? 'Queued' : 'Queue'); };
      const mods = Object.entries(MODS).map(([k, [, name, eff, what]]) => { const l = lvl(k), c = modCost(k); return up(name + ' ' + l, eff(l) + ' ' + what + ' (next ' + eff(l + 1) + ')', buy(c, () => upgradeMod(k))); });
      const a = atP(); let postSec = null;
      if (a) {
        const rows = [];
        if (held(a)) rows.push(el('p', { class: 'sl-muted' }, 'Outlaws hold ' + nm(a) + '. Drive them out before building here.'));
        else if (!a.post) rows.push(up('Listening Post', 'Hear transmissions from ' + nm(a) + '. Takes one study session.', queue('post:' + a.num + ':')));
        else if (!a.post.tp) rows.push(up('Travelers\' Post', 'Settlers, trade and facilities. Takes one study session.', queue('upgrade:' + a.num + ':')));
        else {
          a.post.tp.fac.forEach(f => { const lv = f.lv || 1, max = lv >= FAC_MAX; rows.push(up(FAC[f.k][1] + ' ' + lv, max ? 'Max level' : FAC_DESC[f.k], max ? el('span', { class: 'sx-max' }, 'Max') : buy(facCost(lv + 1), () => upgradeFac(a, f)))); });
          const left2 = Object.keys(FAC).filter(k => !hasFac(a, k));
          if (left2.length) {
            const pick = el('select', { 'aria-label': 'Facility to build next' }, left2.map(k => el('option', { value: k, selected: bj && bj.k === 'add' && bj.p === a && bj.fac === k || null }, FAC[k][1])));
            const qb = () => queue('add:' + a.num + ':' + pick.value);
            const holder = el('span', {}, qb()); pick.addEventListener('change', () => holder.replaceChildren(qb()));
            rows.push(el('div', { class: 'sx-up sx-newfac' }, el('b', {}, 'New facility'), el('small', {}, 'Takes one study session'), el('span', { class: 'sx-pick' }, pick, holder)));
          }
        }
        postSec = sec((a.post ? (a.post.tp ? 'Travelers\' Post' : 'Listening Post') : 'Build') + ' at ' + nm(a), ...rows);
      }
      rightCol.replaceChildren(
        el('div', { class: 'sx-res' }, el('b', {}, '✦ ' + S.dust.toLocaleString()), el('small', {}, 'resources' + (trade ? ', +' + trade + ' trade per session' : ''))),
        sec('Ship', ...mods), postSec,
        el('button', { type: 'button', class: 'sl-link sx-more', onclick: () => { shipTab = 'Posts'; tab('ship'); } }, 'All posts and facilities'));
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
      if (/^[1-4]$/.test(e.key)) { const b = misBtns[+e.key - 1]; if (b && !b.disabled && !b.hidden) { e.preventDefault(); b.click(); } }
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
          el('div', { class: 'sl-pl-t' }, el('b', { class: 'sl-name' }, nm(p), held(p) ? el('span', { class: 'sl-tag sl-tag-bad', title: 'Held by ' + p.outlaw.gang }, '🏴 Outlaws') : null, p.outlaw && p.outlaw.cleared ? el('span', { class: 'sl-tag', title: 'You drove out ' + p.outlaw.gang }, '⚔ Liberated') : null, p.lucky ? el('span', { class: 'sl-tag sl-tag-coord', title: 'Found by following the Interplanetary Coordinator' }, '🧭 Coordinated') : null, tuned ? el('span', { class: 'sl-tag' }, '📡 Tuned') : p.post ? el('span', { class: 'sl-tag off' }, p.post.tp ? '🏘 Travelers\' Post' : '🗼 Post') : null),
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
    function showTrans(list) {
      if (!list || !list.length) { trans.hidden = true; trans.replaceChildren(); return; }
      trans.hidden = false;
      trans.replaceChildren(...list.map(({ p, rep, passive, ev, notes }) => notes ? el('div', { class: 'sl-trans-i sl-notes' }, notes.map(t => el('p', {}, t))) : ev ? el('div', { class: 'sl-trans-i sl-event' },
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
        S.total++; S.todayN++; S.cycle++; S.minutes += S.set.focus; S.fc.n++;
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
        } else if (charging()) {
          S.coord = true; S.mission = 0; award(15, 0); S.cnt.charge++;
          if (!quiet && hooks.tada) hooks.tada();
          if (hooks.show) hooks.show();
          toBreak();
          hint.textContent = '🧭 Interplanetary Coordinator charged. Your next trip will head somewhere promising. Now a ' + MODES[mode].toLowerCase() + '.';
        } else if (target) {
          const tp2 = target.p; let msg;
          if (target.k === 'post') {
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
          award(target.k === 'post' ? 30 : target.k === 'upgrade' ? 40 : 25, 0);
          S.mission = 0; S.job = null;
          if (!quiet && hooks.tada) hooks.tada();
          if (hooks.show) hooks.show();
          showCard(tp2, target.k === 'post' ? 'built' : target.k === 'upgrade' ? 'upgraded' : 'opened');
          toBreak();
          hint.textContent = msg + ' Now a ' + MODES[mode].toLowerCase() + '.';
        } else if (discovering()) {
          const a = atP(), got = [rollItem(a, false)]; if (Math.random() < .3) got.push(rollItem(a, false));
          const fresh = got.map(it => gainItem(it, a));
          S.mission = 0; S.surveys = (S.surveys || 0) + 1;
          award(20 + 10 * fresh.filter(Boolean).length, 12 + 12 * fresh.filter(Boolean).length);
          if (!quiet && hooks.tada) hooks.tada();
          if (hooks.show) hooks.show();
          reps.unshift({ ev: { battle: true, ic: '🔍', title: 'Survey of ' + nm(a), t: 'The survey team combed the ' + a.biomes[Math.floor(Math.random() * a.biomes.length)].toLowerCase() + ' and came back with: ' + got.map((it, i) => it.name + ' (' + it.rar + (fresh[i] ? ', new!' : '') + ')').join(' and ') + '.', got: '🎒 Collection ' + itemCount() + ' / ' + ITEM_TOTAL } });
          showCard(a, 'last');
          toBreak();
          hint.textContent = 'Survey done: ' + got.map(it => it.name).join(' and ') + '. Now a ' + MODES[mode].toLowerCase() + '.';
        } else if (heldP()) {
          const o = heldP(), pk = a => a[Math.floor(Math.random() * a.length)];
          o.outlaw.cleared = Date.now(); S.outlaw = 0; S.fights = (S.fights || 0) + 1;
          const lootIt = rollItem(o, true), isNew = gainItem(lootIt, o), extra = addDust(E.fight.min + Math.random() * Math.max(0, E.fight.max - E.fight.min)), loot = 'their hoard: ' + lootIt.name + ' (' + lootIt.rar + (isNew ? ', new to your collection!' : '') + ')';
          S.at = o.num; award(35, isNew ? 12 : 0);
          const story = pk(FIGHT).replace('{G}', o.outlaw.gang.replace(/^the/, 'The')).replace('{g}', o.outlaw.gang).replace('{b}', o.biomes[0].toLowerCase());
          S.events.push({ ic: '⚔', title: 'Outlaws driven out of ' + nm(o), t: story + ' Found ' + loot + '.', got: '+' + extra + ' ✦', at: Date.now() });
          if (!quiet && hooks.tada) hooks.tada();
          if (hooks.show) hooks.show();
          showCard(o, 'freed'); reps.unshift({ ev: { battle: true, ic: '⚔', title: 'Victory on ' + nm(o), t: story + ' Found ' + loot + '.', got: '+' + extra + ' ✦ bounty from the outlaws' } });
          toBreak();
          hint.textContent = nm(o) + ' is free! Explore is open again. Now a ' + MODES[mode].toLowerCase() + '.';
        } else {
          const lucky = !!S.coord && !(ev && ev.got); if (lucky) S.coord = false;
          const p = makePlanet((Math.random() * 4294967296) >>> 0, S.nextNum++, lucky, Math.min(.2, (lvl('scanner') - 1) * .01));
          const outlaws = Math.random() < OUTLAW_CHANCE && p.type !== 'Rogue';
          if (outlaws) { const pk = a => a[Math.floor(Math.random() * a.length)]; p.outlaw = { gang: 'the ' + pk(GANG_A) + ' ' + pk(GANG_B), at: Date.now() }; S.outlaw = p.num; }
          S.found.push({ at: Date.now(), p }); S.at = p.num;
          S.cnt.rar[p.rarity] = (S.cnt.rar[p.rarity] || 0) + 1; if (lucky) S.cnt.lucky++; if (outlaws) S.cnt.outlaws++;
          award(20 + ({ Uncommon: 10, Rare: 25, Legendary: 60 }[p.rarity] || 0), 0);
          if (!outlaws && Math.random() < ENC_CHANCE) {
            const [ic, title, tpl, lo, hi] = ENCOUNTERS[Math.floor(Math.random() * ENCOUNTERS.length)];
            const dust = addDust((lo + Math.random() * (hi - lo)) * E.encounters.scale * (RANK[p.rarity] >= 2 ? E.encounters.rareWorldMultiplier : 1)), t = tpl.split('{p}').join(nm(p));
            p.enc = { ic, title, t, dust }; encGot = p.enc; award(10, 5); S.cnt.enc++;
            S.events.push({ ic, title, t, got: '+' + dust + ' ✦', at: Date.now() });
          }
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
        hooks.scene({ mode, kind, running, pct, paused: !running && left > 0 && left < length(mode), planet: scenePlanet(kind), coord: !!S.coord, spot: planetSpot });
      }
      if (hooks.title) hooks.title(running ? fmt(r) + ' · ' + (mode === 'focus' ? (S.dr ? 'Distress Run' : building() ? (building().k === 'upgrade' ? 'Upgrading' : 'Building') : charging() ? 'Charging' : discovering() ? 'Surveying' : heldP() ? 'Fighting' : 'Traveling') : 'Preparing') : 'Solarist');
    }
    function draw() {
      drawClock(); drawLv();
      root.dataset.mode = mode;
      modeBtns.forEach(b => { const on = b.dataset.m === mode; b.classList.toggle('on', on); b.disabled = running && !on; });
      startB.textContent = running ? 'Pause' : (left < length(mode) && left > 0 ? 'Resume' : mode === 'focus' ? (S.dr ? (S.dr.n ? 'Continue the Run' : 'Start the Run') : building() ? (building().k === 'upgrade' ? 'Upgrade' : 'Build') : charging() ? 'Charge' : discovering() ? 'Survey' : heldP() ? 'Fight' : 'Launch') : 'Start break');
      if (!hint.textContent) hint.textContent = mode === 'focus' ? (S.dr ? '🆘 ' + DISTRESS[S.dr.sc][2] + ' Finish this study session to keep going.' : building() ? 'Finish this session: ' + jobText(building()).replace(/^./, c => c.toLowerCase()) + '.' : charging() ? 'Finish this session to charge the Interplanetary Coordinator. No new world this time, but the next one will be a good one.' : discovering() ? '🔍 Finish this session to survey ' + nm(atP()) + ' (where you are now). You\'ll bring back collectibles made from its materials.' : heldP() ? '🏴 ' + heldP().outlaw.gang.replace(/^the/, 'The') + ' hold ' + nm(heldP()) + '. Finish this study session to drive them out. (Build and Charge still work.)' : S.coord ? '🧭 The Coordinator is charged: this trip has much better odds.' : 'Finish a trip (a study session) to discover a new world.') : 'Break time. The crew is getting the gear ready for the next mission.';
      if (S.mission > 0 && !building()) { S.mission = 0; S.job = null; }
      if (S.mission === -1 && S.coord) S.mission = 0;
      if (S.mission === -2 && !discovering()) S.mission = 0;
      const cm = curMission(), locked = running && mode === 'focus', canBuild = anyBuild();
      mission.classList.toggle('off', mode !== 'focus');
      mission.hidden = !!S.dr; drawDr();
      misBtns.forEach(b => {
        const k = b.dataset.m, on = k === cm;
        b.setAttribute('aria-checked', String(on)); b.classList.toggle('on', on);
        b.disabled = (locked && !on) || (k === 'build' && !canBuild) || (k === 'charge' && !!S.coord && !on) || (k === 'discover' && !on && (!atP() || held(atP())));
        if (k === 'discover') b.title = !atP() ? 'Find a world first' : held(atP()) ? 'Outlaws hold ' + nm(atP()) + '. Drive them out first' : 'Survey ' + nm(atP()) + ' (where you are now) for collectibles';
        if (k === 'explore') { const o = heldP(); b.firstChild.textContent = o ? '⚔' : '🚀'; b.lastChild.textContent = o ? 'Fight' : S.coord ? 'Explore (lucky)' : 'Explore'; b.title = o ? 'Outlaws hold ' + nm(o) + ': fight them off with one study session before you can travel again' : MISSIONS[0][3]; b.classList.toggle('sl-fight', !!o); }
        if (k === 'charge') b.title = S.coord ? 'Already charged: your next Explore is a lucky one' : MISSIONS[3][3];
        if (k === 'build') { b.title = canBuild ? MISSIONS[2][3] : 'Nothing left to build'; const bj = building(); b.lastChild.textContent = bj ? 'Build: ' + (bj.k === 'post' ? 'Listening Post' : bj.k === 'upgrade' ? 'Travelers\' Post' : FAC[bj.fac][1]) : 'Build'; b.hidden = !bj && cm !== 'build'; }
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
      drawName(); drawLeft(); drawRight(); drawFeed();
      if (!shipPane.hidden) drawShip();
    }

    /* ---------- the Ship tab: Coordinator, Listening Posts and all their transmissions in one place ---------- */
    let shipTab = 'Ship', facPost = 0;
    function drawShip() {
      const group = (title, ...kids) => el('fieldset', { class: 'sl-group' }, el('legend', {}, title), ...kids);
      const cm = curMission(), b = building(), locked = running && mode === 'focus';
      const next = cm === 'discover' && atP() ? '🔍 Survey ' + nm(atP()) + ' for collectibles' : cm === 'build' && b ? (b.k === 'upgrade' ? '🏘 ' : b.k === 'add' ? FAC[b.fac][0] + ' ' : '🗼 ') + jobText(b) : cm === 'explore' && heldP() ? '⚔ Fight ' + heldP().outlaw.gang + ' on ' + nm(heldP()) : cm === 'charge' ? '🧭 Charge the Interplanetary Coordinator' : S.coord ? '🚀 Explore (lucky, Coordinator charged)' : '🚀 Explore a new world';
      const coord = group('🧭 Interplanetary Coordinator',
        el('p', {}, S.coord ? el('b', {}, 'Charged. ') : el('b', {}, 'Empty. '), S.coord ? 'Your next Explore session heads somewhere promising: better odds of Rare and Legendary, livable worlds.' : 'Spend one study session charging it, and your next Explore is a lucky one. It holds one charge.'),
        S.coord ? null : el('button', { type: 'button', class: 'btn', disabled: locked || cm === 'charge' || null, onclick: () => { setMission('charge'); drawShip(); } }, cm === 'charge' ? 'Charging next session' : 'Charge it next session'));
      const pl = posts().slice().reverse();
      const postRows = pl.length ? el('div', { class: 'sl-posts' }, pl.map(f => {
        const p = f.p, tuned = S.tuned === p.num;
        return el('div', { class: 'sl-post' + (tuned ? ' tuned' : '') }, el('img', { src: paint(p, 32), alt: '' }),
          el('span', { class: 'sl-row-t' }, el('b', {}, (p.post.tp ? '🏘 ' : '🗼 ') + nm(p), tuned ? ' 📡' : ''), el('small', {}, pad(p.num) + ' · ' + (p.post.tp ? 'Travelers\' Post' + (p.post.tp.fac.length ? ' · ' + p.post.tp.fac.map(f => FAC[f.k][0]).join('') : '') : 'Listening Post') + ' · ' + p.post.reports.length + ' log' + (p.post.reports.length === 1 ? '' : 's'))),
          tuned ? el('button', { type: 'button', class: 'btn', onclick: () => { S.tuned = 0; save(); draw(); } }, 'Untune') : el('button', { type: 'button', class: 'btn', title: 'Only one post can be tuned at a time', onclick: () => { S.tuned = p.num; save(); draw(); } }, 'Tune'),
          p.post.tp ? el('div', { class: 'sl-post-x sl-muted' }, '🏙 ' + tierOf(p.post.tp.pop || 0) + ' · ' + (p.post.tp.pop || 0).toLocaleString() + ' settlers · ' + p.post.tp.fac.length + ' / ' + Object.keys(FAC).length + ' facilities') : null);
      })) : el('p', { class: 'sl-muted' }, 'No posts yet. Choose the 🗼 Build mission on the Voyage tab (or open a world in the Logbook).');
      const plan = Object.entries(buildOptions()).some(([g, a]) => g !== 'Facilities' && a.length) ? (() => { const s2 = el('select', { 'aria-label': 'What to build' }); fillBuildSel(s2, 'Facilities'); if (b && b.k !== 'add') s2.value = jobKey(b);
        return el('div', { class: 'sl-plan' }, 'Build: ', s2, el('button', { type: 'button', class: 'btn', disabled: locked || null, onclick: () => { setJob(s2.value); drawShip(); } }, 'Next session')); })() : null;
      const tps = pl.filter(f => f.p.post.tp);
      if (!tps.some(f => f.p.num === facPost)) facPost = tps.length ? tps[0].p.num : 0;
      const facPanel = tps.length ? (() => {
        const tp = byNum(facPost).p, sel2 = el('select', { 'aria-label': 'Travelers\' Post' }, tps.map(f => el('option', { value: f.p.num, selected: f.p.num === facPost || null }, '🏘 ' + nm(f.p) + ' (' + tierOf(f.p.post.tp.pop || 0) + ')')));
        sel2.addEventListener('change', () => { facPost = +sel2.value; drawShip(); });
        const rows = Object.keys(FAC).map(k => {
          const f = tp.post.tp.fac.find(x => x.k === k), lv = f ? (f.lv || 1) : 0, c = f ? facCost(lv + 1) : 0, max = lv >= FAC_MAX, queued = b && b.k === 'add' && b.p.num === tp.num && b.fac === k;
          return el('div', { class: 'sl-mod' + (f ? '' : ' sl-unbuilt') }, el('span', { class: 'sl-mod-i' }, FAC[k][0]),
            el('span', { class: 'sl-row-t' }, el('b', {}, FAC[k][1] + (f ? ' · Lv ' + lv : '')), el('small', {}, FAC_DESC[k] + (f && lv > 1 ? ' Level ' + lv + ': ×' + lv + ' everything.' : ''))),
            f ? el('button', { type: 'button', class: 'btn', disabled: max || S.dust < c || null, title: max ? 'Max level' : 'Bigger numbers, more settlers, and fame', onclick: () => upgradeFac(tp, f) }, max ? 'Max level' : 'Upgrade ✦ ' + c.toLocaleString())
              : el('button', { type: 'button', class: 'btn', disabled: locked || queued || null, title: 'Your next study session builds it', onclick: () => { setJob('add:' + tp.num + ':' + k); drawShip(); } }, queued ? 'Building next' : 'Build next session'));
        });
        return group('🏘 Facilities', el('div', { class: 'sl-plan' }, 'Travelers\' Post: ', sel2), el('div', { class: 'sl-mods' }, rows));
      })() : group('🏘 Facilities', el('p', { class: 'sl-muted' }, 'Upgrade a Listening Post to a Travelers\' Post (🗼 Build mission) to start adding facilities.'));
      const feed = [];
      posts().forEach(f => f.p.post.reports.forEach(r => feed.push({ p: f.p, r })));
      feed.sort((a, c) => c.r.at - a.r.at);
      const trans = group('📡 Transmissions' + (feed.length ? ' (' + feed.length + ')' : ''),
        feed.length ? renderFeed(feed.map(({ p, r }) => repItem(p, r)), 'trans', true, drawShip)
          : el('p', { class: 'sl-muted' }, 'Nothing yet. A tuned post sends one transmission every study session.'));
      const evs = S.events.slice().reverse();
      const evLog = group('📜 Ship\'s log' + (evs.length ? ' (' + evs.length + ')' : ''), evs.length ? renderFeed(evs.map(e => ({ at: e.at, k: 'ev', icon: e.ic, title: e.title, t: e.t, extra: e.got })), 'events', false, drawShip)
        : el('p', { class: 'sl-muted' }, 'No deep-space events yet. About one study session in 15 runs into something.'));
      const mods = group('✦ Resources: ' + S.dust.toLocaleString(), el('p', { class: 'sl-muted' }, 'Earned by every study session, plus extra for rarer worlds, events, arrival encounters, fights, Full Cycles, bounties and trade from your Travelers\' Posts (' + Math.round(tradeIncome() * INCOME) + ' per session now, up to ' + Math.round(E.trade.cap * INCOME) + '). ' + S.dustTotal.toLocaleString() + ' earned in total. Spend them on ship modules here and on facility upgrades under Posts.'),
        el('div', { class: 'sl-mods' }, Object.entries(MODS).map(([k, [ic, name, eff, what]]) => { const l = lvl(k), c = modCost(k);
          return el('div', { class: 'sl-mod' }, el('span', { class: 'sl-mod-i' }, ic), el('span', { class: 'sl-row-t' }, el('b', {}, name + ' · Lv ' + l), el('small', {}, eff(l) + ' ' + what + ' (next: ' + eff(l + 1) + ')')),
            el('button', { type: 'button', class: 'btn', disabled: S.dust < c || null, onclick: () => upgradeMod(k) }, 'Upgrade ✦ ' + c.toLocaleString())); })));
      const cyc = group('★ Full Cycle', el('p', {}, S.fc.broken ? 'Broken this cycle (something was skipped). A fresh cycle starts after the long break.' : 'Finish all ' + S.set.every + ' study sessions and their breaks without skipping: ' + '★'.repeat(Math.min(S.set.every, S.fc.n)) + '☆'.repeat(Math.max(0, S.set.every - S.fc.n)) + '. The long break then pays resources and charges the Coordinator (or guarantees a deep-space event).'));
      const bounties = group('🎯 Bounties', el('p', { class: 'sl-muted' }, 'Finish one and a new one takes its place. ' + S.bDone + ' completed so far.'),
        el('div', { class: 'sl-posts' }, S.bounties.map(b => el('div', { class: 'sl-post' }, el('span', { class: 'sl-mod-i' }, '🎯'), el('span', { class: 'sl-row-t' }, el('b', {}, b.t), el('small', {}, b.k === 'sessions' ? (b.prog || 0) + ' / ' + b.v + ' done' : b.k === 'cycle' ? 'finish every session and break of a cycle' : 'on any Explore trip')), el('span', { class: 'sl-reward' }, '✦ ' + Math.round(b.reward * INCOME))))));
      const recRows = REC.filter(([k]) => S.rec[k]).map(([k, ic, label, , f]) => { const r = S.rec[k], fw = byNum(r.num); return el('tr', {}, el('td', {}, ic + ' ' + label), el('td', {}, f(r.v)), el('td', {}, fw ? el('button', { type: 'button', class: 'sl-link', onclick: () => { tab('log'); openWorld(r.num); } }, nm(fw.p)) : '')); });
      if (S.rec.dayN) recRows.unshift(el('tr', {}, el('td', {}, '📅 Most sessions in a day'), el('td', {}, String(S.rec.dayN.v)), el('td', {}, new Date(S.rec.dayN.date).toLocaleDateString())));
      const records = group('🏆 Records', recRows.length ? el('table', { class: 'sl-rec' }, el('tbody', {}, recRows)) : el('p', { class: 'sl-muted' }, 'No records yet. Find some worlds.'));
      const rank = group('⭐ Captain & 📚 Knowledge', el('p', { class: 'sl-muted' }, 'XP comes from everything that moves the game forward: trips, building, upgrades, fights, surveys, bounties and Full Cycles. Knowledge comes from what you learn: transmissions, logs, events, survey logs and new collectibles. Every 10 levels earns a new title.'),
        lvMsg && Date.now() - lvMsgAt < 10000 ? el('p', { class: 'sl-lv-msg' }, lvMsg) : null, lvBar('xp', '⭐', CAPT, true), lvBar('kn', '📚', KNOW, true));
      const drGroup = group('🆘 Distress Run', el('p', {}, S.dr ? 'In progress: ' + DISTRESS[S.dr.sc][1] + ', Act ' + ROMAN(S.dr.n + 1) + ' of ' + ROMAN(S.dr.need) + '.' : S.drDay === today() ? 'Today\'s run is used up. A new distress call comes in tomorrow.' : S.fcDay === today() ? 'Available at the start of your next cycle (right after a long break).' : 'Earn a ★ Full Cycle today (no skipping for a whole cycle) and a distress call comes in when the long break ends.'),
        el('p', { class: 'sl-muted' }, 'Once a day: a whole cycle of study sessions with no other missions, for about ✦ ' + E.distressRun.base + '–' + (E.distressRun.base + E.distressRun.random) + ', a random bonus, 250 XP and 120 Knowledge. ' + (S.drN || 0) + ' completed so far.'));
      const SUB = { Ship: [rank, el('div', { class: 'sl-next' }, el('span', {}, 'Next study session: '), el('b', {}, next)), mods, cyc, coord], Goals: [drGroup, bounties, records],
        Posts: [group('🗼 Posts (' + pl.length + ')', el('p', { class: 'sl-muted' }, 'The tuned post reports every study session. Travelers\' Posts are also overheard without tuning, grow settlers every session, and a tuned one adds news from its facilities.'), postRows, plan), facPanel], Logs: [trans, evLog], Stats: statsView(group) };
      const subBtns = Object.keys(SUB).map(k => el('button', { type: 'button', role: 'tab', class: 'sl-stab', 'aria-selected': String(k === shipTab), onclick: () => { shipTab = k; drawShip(); } }, k));
      shipPane.replaceChildren(el('div', { class: 'sl-stabs sl-shiptabs', role: 'tablist' }, subBtns), el('div', { class: 'sl-subpane' }, SUB[shipTab]));
    }

    function statsView(group) { // everything you've done, for bragging rights
      const fmtN = n => (n || 0).toLocaleString(), allP = S.found.map(f => f.p), pl = posts().map(f => f.p), tps = pl.filter(p => p.post.tp);
      const facs = tps.reduce((a, p) => a.concat(p.post.tp.fac), []), facLv = facs.reduce((a, f) => a + (f.lv || 1), 0), maxed = facs.filter(f => (f.lv || 1) >= FAC_MAX).length;
      const settlers = tps.reduce((a, p) => a + (p.post.tp.pop || 0), 0), heard = pl.reduce((a, p) => a + p.post.reports.length, 0);
      const itemsGot = Object.values(S.items).reduce((a, it) => a + it.n, 0), byR = r => ITEMS[r].filter((_, i) => S.items[r + ':' + i]).length;
      const charted = Object.values(S.cnt.rar).reduce((a, n) => a + n, 0), ly = allP.reduce((a, p) => a + p.dist, 0) + S.sold.ly;
      const modLv = Object.keys(MODS).reduce((a, k) => a + lvl(k), 0), hrs = S.minutes / 60;
      const cx = lvInfo(S.xp), ck = lvInfo(S.kn);
      const T = (title, rows) => group(title, el('table', { class: 'sl-rec sl-stats' }, el('tbody', {}, rows.filter(Boolean).map(([l, v]) => el('tr', {}, el('td', {}, l), el('td', {}, String(v)))))));
      return [
        T('⭐ Captain', [['⭐ Captain Level', cx.L + ' · ' + titleOf(CAPT, cx.L)], ['📚 Knowledge Level', ck.L + ' · ' + titleOf(KNOW, ck.L)], ['Total XP', fmtN(S.xp)], ['Total Knowledge', fmtN(S.kn)]]),
        T('🚀 Voyage', [['Study sessions finished', fmtN(S.total)], ['Hours studied', Math.round(hrs * 10) / 10], ['Days you studied', fmtN(S.cnt.days)], ['Most sessions in a day', S.rec.dayN ? S.rec.dayN.v : 0], ['★ Full Cycles earned', fmtN(S.cnt.fc)], ['🆘 Distress Runs completed', fmtN(S.drN)], ['Light-years traveled', fmtN(ly)]]),
        T('🪐 Worlds', [['Worlds discovered', fmtN(charted)], ...RARITY.map(([k]) => ['· ' + k, fmtN(S.cnt.rar[k])]), ['🧭 Lucky trips', fmtN(S.cnt.lucky)], ['🧭 Coordinator charges', fmtN(S.cnt.charge)], ['In your Logbook now', fmtN(S.found.length)], ['💰 Worlds sold', fmtN(S.sold.n) + ' for ✦ ' + fmtN(S.sold.dust)], ['🏆 Records held', REC.filter(([k]) => S.rec[k]).length]]),
        T('⚠ Adventures', [['Deep-space events', fmtN(S.cnt.ev)], ['Arrival encounters', fmtN(S.cnt.enc)], ['🏴 Outlaw gangs met', fmtN(S.cnt.outlaws)], ['⚔ Outlaw gangs beaten', fmtN(S.fights)], ['🎯 Bounties completed', fmtN(S.bDone)], ['🔍 Surveys', fmtN(S.surveys)]]),
        T('🎒 Collection', [['Unique collectibles', itemCount() + ' / ' + ITEM_TOTAL + ' (' + Math.round(itemCount() / ITEM_TOTAL * 100) + '%)'], ['Collectibles received (with duplicates)', fmtN(itemsGot)], ...ITEM_RARS.map(r => ['· ' + r, byR(r) + ' / ' + ITEMS[r].length])]),
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
        bulkSell(),
        el('div', { class: 'sl-muted' }, pc ? '🗼 ' + pc + ' post' + (pc === 1 ? '' : 's') + (tp ? ' · 📡 Satellite tuned to ' + nm(tp) : ' · 📡 Satellite not tuned') : '🗼 No posts yet. Open a world and choose "Build a Listening Post here".'));
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
    function bulkSell() { // sell every world of one rarity at once (skips posts, where you are, outlaw worlds, build targets and record holders)
      const list = S.found.map(f => f.p).filter(p => p.rarity === bulkR && !sellBlock(p) && !isRecord(p)), total = list.reduce((a, p) => a + sellPrice(p), 0);
      const rs = el('select', { 'aria-label': 'Rarity to sell' }, ['Common', 'Uncommon', 'Rare', 'Legendary'].map(r => el('option', { value: r, selected: r === bulkR || null }, r)));
      rs.addEventListener('change', () => { bulkR = rs.value; drawLog(); });
      const b = el('button', { type: 'button', class: 'btn sl-sell-b', disabled: !list.length || null }, list.length ? 'Sell ' + list.length + ' for ✦ ' + total.toLocaleString() : 'Nothing to sell');
      b.addEventListener('click', () => {
        if (!b.classList.contains('arm')) { b.classList.add('arm'); b.textContent = 'Click again to sell ' + list.length + ' ' + bulkR + ' world' + (list.length === 1 ? '' : 's'); return; }
        const got = sellWorlds(list); hint.textContent = '💰 Sold ' + list.length + ' ' + bulkR + ' world' + (list.length === 1 ? '' : 's') + ' for ✦ ' + got + '.'; drawLog(); draw();
      });
      return el('div', { class: 'sl-bulk', title: 'Skips worlds with posts, where you are, outlaw worlds, your next build and record holders' }, el('span', {}, '💰 Sell all '), rs, el('span', {}, ' worlds:'), b);
    }
    function drawItems() {
      const nav = el('div', { class: 'sl-wnav' }, el('b', {}, '🎒 Collection: ' + itemCount() + ' / ' + ITEM_TOTAL), el('span', { class: 'sl-muted' }, Math.round(itemCount() / ITEM_TOTAL * 100) + '% found'));
      const groups = ITEM_RARS.map(r => {
        const list = ITEMS[r], have = list.filter((_, i) => S.items[r + ':' + i]).length;
        return el('div', { class: 'sl-col-g' }, el('div', { class: 'sl-col-h' }, el('span', { class: 'sl-rar sl-r-' + r.toLowerCase() }, r), el('span', { class: 'sl-muted' }, have + ' / ' + list.length)),
          have ? el('ul', { class: 'sl-col-l' }, list.map((name, i) => [name, S.items[r + ':' + i]]).filter(x => x[1]).sort((x, y) => x[0].localeCompare(y[0])).map(([name, it]) =>
            el('li', { class: 'sl-col-i sl-ci-' + r.toLowerCase(), title: 'First found ' + new Date(it.at).toLocaleDateString() + (it.from && byNum(it.from) ? ' on ' + nm(byNum(it.from).p) : '') }, name, it.n > 1 ? el('small', {}, ' ×' + it.n) : null))) : null,
          have < list.length ? el('div', { class: 'sl-col-more' }, '??? ' + (list.length - have) + ' more ' + r.toLowerCase() + ' item' + (list.length - have === 1 ? '' : 's') + ' still out there') : el('div', { class: 'sl-col-more done' }, '★ All ' + r.toLowerCase() + ' items found!'));
      });
      itemsPane.replaceChildren(el('div', { class: 'sl-wpage' }, nav, el('p', { class: 'sl-muted' }, ITEM_TOTAL + ' one-of-a-kind items are scattered across the universe. 🔍 Discover (surveying the world you\'re at) turns up one or two, and beating outlaws hands over their hoard, which leans toward the rarer ones.'), ...groups));
    }
    function drawWorld(f) {
      const p = f.p, tuned = S.tuned === p.num && !!p.post, busy = running && mode === 'focus';
      const list = shownList.length ? shownList : S.found.slice().reverse(), i = list.findIndex(x => x.p.num === p.num);
      const prev = i > 0 ? list[i - 1] : null, next = i >= 0 && i < list.length - 1 ? list[i + 1] : null;
      const nav = el('div', { class: 'sl-wnav' },
        el('button', { type: 'button', class: 'btn', onclick: closeWorld }, '◂ Logbook'),
        el('span', { class: 'sl-muted' }, i >= 0 ? (i + 1) + ' of ' + list.length : ''),
        el('span', { class: 'sl-wnav-r' },
          el('button', { type: 'button', class: 'btn', title: prev ? 'Previous: ' + nm(prev.p) : '', disabled: !prev || null, onclick: () => prev && openWorld(prev.p.num) }, '◂'),
          el('button', { type: 'button', class: 'btn', title: next ? 'Next: ' + nm(next.p) : '', disabled: !next || null, onclick: () => next && openWorld(next.p.num) }, '▸')));
      const acts = el('div', { class: 'sl-acts' },
        held(p) ? el('span', { class: 'sl-muted' }, '🏴 Held by ' + p.outlaw.gang + '. Drive them out (⚔ Fight on the Voyage tab) before building here.') : !p.post ? el('button', { type: 'button', class: 'btn', title: 'Your next study session builds a Listening Post here', disabled: busy || null, onclick: () => { setJob('post:' + p.num + ':'); tab('timer'); } }, S.mission > 0 && S.job && S.job.k === 'post' && S.job.num === p.num ? '🗼 Building here next' : '🗼 Build a Listening Post here')
          : !p.post.tp ? el('button', { type: 'button', class: 'btn', title: 'Your next study session upgrades this post', disabled: busy || null, onclick: () => { setJob('upgrade:' + p.num + ':'); tab('timer'); } }, '🏘 Upgrade to Travelers\' Post') : null,
        p.post ? (tuned ? el('button', { type: 'button', class: 'btn', title: 'Stop listening to this post', onclick: () => { S.tuned = 0; save(); drawLog(); draw(); } }, '📡 Untune')
          : el('button', { type: 'button', class: 'btn', title: 'Only one post can be tuned at a time', onclick: () => { S.tuned = p.num; save(); drawLog(); draw(); } }, '📡 Tune satellite')) : null,
        p.post ? el('button', { type: 'button', class: 'btn', title: 'Worlds with a post can be renamed', onclick: () => rename(p) }, 'Rename...') : null);
      const why = sellBlock(p), price = sellPrice(p);
      const sellB = el('button', { type: 'button', class: 'btn sl-sell-b', disabled: why || null, title: why ? 'Can\'t sell: ' + why : 'Sell the survey rights. The world leaves your Logbook for good.' }, '💰 Sell for ✦ ' + price.toLocaleString());
      sellB.addEventListener('click', () => {
        if (!sellB.classList.contains('arm')) { sellB.classList.add('arm'); sellB.textContent = 'Click again to sell ' + nm(p); setTimeout(() => { if (sellB.isConnected && sellB.classList.contains('arm')) { sellB.classList.remove('arm'); sellB.textContent = '💰 Sell for ✦ ' + price.toLocaleString(); } }, 4000); return; }
        const near = next || prev; const got = sellWorlds([p]);
        hint.textContent = '💰 Sold the survey rights to ' + nm(p) + ' for ✦ ' + got + '.';
        if (near) openWorld(near.p.num); else closeWorld(); draw();
      });
      const sell = el('details', { class: 'sl-sell' }, el('summary', {}, '💰 Sell this world' + (why ? ' (not now: ' + why + ')' : ' · ✦ ' + price.toLocaleString())),
        el('p', { class: 'sl-muted' }, 'The Cartographers\' Guild buys survey rights. The price follows the world\'s condition and how much it stands out. Selling removes it from your Logbook for good (records and collectibles stay).'),
        el('table', { class: 'sl-rec' }, el('tbody', {}, sellParts(p).map(([l, v]) => el('tr', {}, el('td', {}, l), el('td', {}, '✦ ' + v))))), sellB);
      const cardEl = el('div', { class: 'sl-card sl-world' }, ...planetCard(p, 'log'));
      const sv = cardEl.querySelector('details.sl-more'); if (sv) sv.open = true;
      logList.className = 'sl-wpage';
      logList.replaceChildren(nav, el('div', { class: 'sl-muted sl-found-on' }, (S.at === p.num ? '📍 You are here · ' : '') + 'Discovered ' + new Date(f.at).toLocaleString()), acts.childNodes.length ? acts : null, cardEl, sell);
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
  window.Solarist = { mount, makePlanet, makeExtra, paint, lookOf };
})();
