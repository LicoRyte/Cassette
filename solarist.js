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
    Rocky: { w: 14, t: [-80, 60], pal: ['#819796', '#7a367b', '#752438', '#402751'], bio: ['Rocky plains', 'Canyon mazes', 'Cratered highlands', 'Dust basins', 'Stone arches', 'Boulder fields'], atm: ['Thin nitrogen', 'Carbon dioxide', 'Almost none', 'Argon haze'], life: .15 },
    Ocean: { w: 9, t: [2, 34], pal: ['#4f8fba', '#4f8fba', '#4f8fba', '#402751'], land: ['#a8ca58', '#d7b594'], bio: ['Endless ocean', 'Island chains', 'Reef shallows', 'Storm seas', 'Kelp-like forests', 'Floating ice rafts'], atm: ['Nitrogen and oxygen', 'Humid nitrogen', 'Thick water vapor'], life: .7 },
    Jungle: { w: 7, t: [18, 48], pal: ['#a8ca58', '#a8ca58', '#75a743', '#402751'], bio: ['Dense jungle', 'Giant fungus forests', 'Swamp deltas', 'Vine canopies', 'Glowing moss valleys', 'Bamboo-like towers'], atm: ['Oxygen-rich', 'Humid nitrogen and oxygen', 'Spore-heavy air'], life: .92 },
    Desert: { w: 10, t: [25, 95], pal: ['#e8c170', '#d7b594', '#ad7757', '#a53030'], bio: ['Dune seas', 'Salt flats', 'Glass deserts', 'Mesa country', 'Dry riverbeds', 'Rust plains'], atm: ['Dry carbon dioxide', 'Thin nitrogen', 'Dusty nitrogen'], life: .25 },
    Ice: { w: 11, t: [-220, -25], pal: ['#ebede9', '#a4dddb', '#73bed3', '#4f8fba'], bio: ['Glacier fields', 'Frozen oceans', 'Ice caves', 'Snow plains', 'Cryovolcano fields', 'Blue ice cliffs'], atm: ['Thin nitrogen', 'Methane traces', 'Almost none'], life: .12 },
    Lava: { w: 7, t: [350, 1500], pal: ['#e8c170', '#cf573c', '#402751', '#241527'], bio: ['Lava seas', 'Volcanic chains', 'Obsidian plains', 'Ash fields', 'Magma rivers', 'Basalt towers'], atm: ['Sulfur dioxide', 'Volcanic ash and CO₂', 'Almost none'], life: .02 },
    'Gas giant': { w: 10, t: [-170, 900], pal: ['#d7b594', '#ad7757', '#a53030', '#752438'], bio: ['Banded cloud belts', 'Endless storms', 'Ammonia skies', 'Hydrogen depths'], atm: ['Hydrogen and helium'], life: .04, noGround: true },
    'Ice giant': { w: 6, t: [-225, -170], pal: ['#a4dddb', '#73bed3', '#4f8fba', '#402751'], bio: ['Methane haze', 'Diamond rain layers', 'Deep water-ice mantle', 'Supersonic winds'], atm: ['Hydrogen, helium and methane'], life: .01, noGround: true },
    Toxic: { w: 5, t: [60, 480], pal: ['#a8ca58', '#a8ca58', '#75a743', '#402751'], bio: ['Acid lakes', 'Sulfur fields', 'Yellow haze plains', 'Corroded canyons', 'Bubbling mud pits'], atm: ['Sulfuric acid clouds', 'Chlorine haze', 'Thick carbon dioxide'], life: .06 },
    Crystal: { w: 3, t: [-120, 40], pal: ['#c7cfcc', '#df84a5', '#c65197', '#7a367b'], bio: ['Crystal spires', 'Mirror plains', 'Prism caves', 'Singing quartz forests', 'Geode valleys'], atm: ['Thin neon', 'Almost none', 'Argon and nitrogen'], life: .1 },
    'Tidally locked': { w: 5, t: [-140, 260], pal: ['#e8c170', '#ad7757', '#402751', '#241527'], bio: ['Twilight band', 'Scorched dayside', 'Frozen nightside', 'Eternal sunset strip'], atm: ['Nitrogen', 'Thin carbon dioxide', 'Wind-whipped nitrogen'], life: .3, locked: true },
    Garden: { w: 3, t: [6, 28], pal: ['#73bed3', '#4f8fba', '#4f8fba', '#402751'], land: ['#75a743', '#a8ca58'], clouds: true, bio: ['Temperate forests', 'Rolling grasslands', 'River valleys', 'Flower meadows', 'Misty mountains', 'Calm lakes'], atm: ['Nitrogen and oxygen, breathable'], life: .97 },
    Savanna: { w: 4, t: [15, 42], pal: ['#d0da91', '#e8c170', '#a8ca58', '#75a743'], bio: ['Golden grasslands', 'Lone giant trees', 'Termite-mound fields', 'Seasonal watering holes', 'Red-rock outcrops', 'Dry riverbeds'], atm: ['Nitrogen and oxygen, dry', 'Warm nitrogen and oxygen'], life: .85 },
    Tundra: { w: 5, t: [-40, 8], pal: ['#ebede9', '#c7cfcc', '#819796', '#75a743'], bio: ['Frozen moss plains', 'Permafrost bogs', 'Rocky taiga', 'Snowy foothills', 'Frost-cracked flats', 'Ice-edged lakes'], atm: ['Cold nitrogen and oxygen', 'Thin, crisp nitrogen'], life: .45 },
    Swamp: { w: 4, t: [12, 38], pal: ['#75a743', '#402751', '#402751', '#402751'], land: ['#752438', '#75a743'], bio: ['Mangrove-like mazes', 'Steaming bogs', 'Reed marshes', 'Floating plant mats', 'Muddy deltas', 'Fog-filled hollows'], atm: ['Humid, methane-scented air', 'Thick, wet nitrogen and oxygen'], life: .85 },
    Fungal: { w: 3, t: [5, 30], pal: ['#df84a5', '#c65197', '#7a367b', '#402751'], bio: ['Giant mushroom forests', 'Spore meadows', 'Glowing mycelium caves', 'Puffball plains', 'Shelf-fungus cliffs'], atm: ['Spore-heavy nitrogen', 'Damp carbon dioxide and oxygen'], life: .95 },
    Hycean: { w: 4, t: [-10, 60], pal: ['#a4dddb', '#a8ca58', '#4f8fba', '#402751'], clouds: true, bio: ['Warm global ocean', 'Hydrogen sky', 'Deep thermal vents', 'Glowing plankton seas'], atm: ['Thick hydrogen over a warm ocean'], life: .6 },
    Iron: { w: 3, t: [-50, 300], pal: ['#c7cfcc', '#819796', '#7a367b', '#402751'], bio: ['Metal plains', 'Rust canyons', 'Magnetite dunes', 'Mirror-bright craters', 'Iron spire fields'], atm: ['Almost none', 'Thin argon'], life: .05 },
    Carbon: { w: 2, t: [-80, 600], pal: ['#7a367b', '#402751', '#402751', '#241527'], sparkle: true, bio: ['Graphite plains', 'Diamond-studded cliffs', 'Tar lakes', 'Soot deserts', 'Carbide mountains'], atm: ['Carbon monoxide haze', 'Thick methane'], life: .05 },
    Shattered: { w: 2, t: [100, 900], pal: ['#cf573c', '#cf573c', '#752438', '#241527'], bio: ['Broken crust plates', 'Glowing fault lines', 'Floating rock shards', 'Magma rifts'], atm: ['Almost none', 'Volcanic ash and CO₂'], life: .01 },
    Dwarf: { w: 5, t: [-230, -60], pal: ['#c7cfcc', '#819796', '#7a367b', '#402751'], bio: ['Cratered plains', 'Frozen nitrogen fields', 'Dusty highlands', 'Tiny ice volcanoes'], atm: ['Almost none', 'Frozen solid'], life: .03 },
    'Glass storm': { w: 2, t: [700, 1100], pal: ['#ebede9', '#a4dddb', '#4f8fba', '#402751'], bio: ['Silicate cloud bands', 'Sideways glass rain', 'Supersonic winds', 'Molten silicate depths'], atm: ['Hydrogen with silicate clouds'], life: 0, noGround: true },
    Rogue: { w: 2, t: [-235, -205], pal: ['#402751', '#402751', '#402751', '#241527'], bio: ['Eternal night', 'Frozen crust', 'Geothermal hot spots', 'Black ice plains'], atm: ['Frozen solid', 'Almost none'], life: .05, rogue: true },
  };
  const LIFE = [['No signs of life', 0], ['Microbial traces', 1], ['Moss-like mats', 2], ['Plant-like life', 3], ['Swimming creatures', 4], ['Large animal herds', 5], ['Signs of intelligence', 6]];
  const WEATHER = {
    any: ['calm, still air', 'gentle winds', 'sudden dust devils', 'aurora storms near the poles', 'long, quiet nights', 'electrical storms', 'thick morning fog', "drizzle that never quite becomes rain", "clear skies and very sharp shadows", "strong evening winds", "slow-moving fog banks", "dry thunder with no rain", "a haze that turns the sky violet", "sudden hailstorms", "gusts that change direction every minute", "drifting clouds of pollen", "slow orange sunsets", "a steady breeze that never stops", "short, sharp downpours"],
    hot: ['heat shimmer all day', 'firestorms', 'ash rain', 'scorching winds', "rains of molten glass", "dust storms that last for weeks", "air that ripples like water", "volcanic thunderstorms", "sulfur clouds", "heat lightning every night", "sand that sings in the heat", "dry storms full of static", "a sky the color of rust", "glowing ash at night"],
    cold: ['snow that never stops', 'hurricanes of ice crystals', 'frost that cracks rock', 'nitrogen snow', "diamond-dust snowfall", "blizzards that bury everything overnight", "skies so clear the stars never twinkle", "freezing mist", "ice storms that coat everything in glass", "silent snow that falls sideways", "frost flowers that bloom on every surface", "ice fog thick enough to lean on", "auroras of falling snow", "winds that whistle through ice caves"],
    wet: ['warm rain every afternoon', 'monsoon seasons', 'rainbow mists', 'endless drizzle', "thunderstorms every evening", "warm steam rising from the ground", "showers of glowing pollen", "mild rain and double rainbows", "humid mornings and bright afternoons", "tropical squalls", "fat warm raindrops", "morning mist over the jungles", "sudden flash floods", "gentle rain that smells like flowers"],
    gas: ['a storm larger than Earth', 'jet streams faster than sound', 'lightning bigger than continents', 'cloud bands that shift every hour', "hurricanes that never end", "rains of liquid helium", "vortexes that swallow whole moons' worth of cloud", "aurora-lit storm fronts", "deep thunder you can feel through the hull", "colored hail of ammonia ice", "storms that flicker like neon", "clouds that rain diamonds", "winds that circle the planet in a day", "endless thunder"],
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
    "The scanners chirped twice, which means something big. It was {n}.",
    "{n} rose over the edge of its {star}'s glare like a coin being flipped.",
    "Halfway through someone's sandwich, {n} slid into view.",
    "The ship's computer added {n} to the chart and asked, very politely, to be thanked.",
    "A faint wobble in the {star}'s light gave {n} away.",
    "The jump ended early. The reason was sitting right there: {n}.",
    "Nobody was watching the window when {n} showed up. Everyone was watching it a minute later.",
    "Radio static turned into a low hum as the ship drifted toward {n}.",
    "The trail of a comet pointed straight at {n}, like it was trying to help.",
    "Two jumps of nothing, then {n}.",
    "A Guild beacon from a hundred years ago said \"keep going\". So the ship did, and found {n}.",
    "{n} was hiding behind its own moon. Not very well.",
    "The first sign of {n} was its shadow sliding across the stars.",
    "Someone had to wipe the window to make sure {n} wasn't a smudge. It wasn't.",
    "The ship coasted the last stretch with engines off, and {n} grew slowly in the window.",
    "The navigator called it a sensor glitch. The sensor glitch was {n}.",
    "Out here, past the last Guild marker, the ship found {n}.",
    "A flock of tiny ice moons led the way to {n}.",
    "The proximity alarm went off. Not danger, just {n}, being very large.",
    "{n} had been on the long-range scope for an hour before anyone believed it.",
    "The {star} flared, and for a second {n} lit up like a lantern.",
    "The cabin went quiet the way it always does when a new world turns up. This time: {n}.",
    "Fuel was getting low and spirits were getting lower. Then {n}.",
    "The charts ended. The ship kept going. {n} was waiting just past the edge.",
    "The ship's cat-shaped air freshener swung toward the window. Outside: {n}.",
    "Someone tapped the glass and said \"is that... yes\". It was {n}.",
    "{n} answered the ship's ping with an echo off its mountains.",
    "The ship rolled over, and {n} rolled into view.",
    "A gap in the dust cloud opened just long enough to show {n}.",
    "{n} had a moon peeking over its shoulder as the ship arrived.",
    "The ship's lights flickered, then steadied, as if bowing to {n}.",
    "A new name went into the chart in big letters: {n}.",
    "The jump drive hiccupped and dropped the ship right next to {n}. Lucky hiccup.",
    "Following the {star}'s glow, the ship found {n} tucked into its orbit.",
    "After a quiet night watch, morning came with {n} in the window.",
    "The long-range camera blurred, refocused, and there was {n}.",
    "{n} was so dark at first that only the hole it made in the starfield gave it away.",
    "The crew had a bet on what the next world would look like. Nobody guessed {n}.",
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
    "Wherever you land, it's {b1}. Wherever you walk to, it's {b2}.",
    "The surveyors drew {b1} in green pencil and {b2} in blue, and ran out of both.",
    "The landing gear sank into {b1}, then climbed out onto {b2}.",
    "Orbital photos show {b1} wrapped around the equator like a belt, with {b2} near the poles.",
    "A long walk across {b1} ended at the edge of {b2}. The drones went on alone.",
    "There's {b1} as far as the cameras can see, and {b2} where they can't quite reach.",
    "The terrain map looks like a quilt: {b1} squares, stitched with {b2}.",
    "Every hill seems to be {b1}. Every valley seems to be {b2}.",
    "The rover's tyre tracks run through {b1} for miles before vanishing into {b2}.",
    "From the shuttle window: {b1}, {b1}, more {b1}, then suddenly {b2}.",
    "Geologists would call it {b1} with intrusions of {b2}. Everyone else would call it pretty.",
    "The drones mapped the {b1} in an afternoon. The {b2} took the rest of the week.",
    "Some of the {b1} has slid into the {b2}, very slowly, over a very long time.",
    "A ridge of {b1} splits the continent in two. On the far side: {b2}.",
    "The landing team planted a flag in the {b1}. The wind carried it off toward the {b2}.",
    "Seen from the night side, the {b1} reflect starlight. The {b2} don't.",
    "The surface is young: fresh {b1} poured over older {b2}.",
    "The crew's boots came back covered in {b1}. Their notes came back covered in {b2}.",
    "It's mostly {b1}, which sounds dull until you see the {b2}.",
    "There are paths through the {b1} that look almost planned. They all lead to {b2}.",
    "Most of {n} seems to be {b1}, with {b2} filling in the gaps.",
    "The {b1} crack and shift like old paint. Underneath: {b2}.",
    "Walking the {b1} feels like walking on a drum. The {b2} is quieter.",
    "Rivers cut through the {b1} and spill out into {b2}.",
    "The highlands are {b1}. The lowlands, {b2}. The middle can't decide.",
    "Some kind of giant once stomped all over the {b1}. Probably erosion. Probably.",
    "The rover found the {b1} easy going and the {b2} impossible.",
    "The coastline is {b1} on one side and {b2} on the other, with a long beach in between.",
    "Satellite photos make the {b1} look like fingerprints. The {b2} looks like a smudge.",
    "From pole to pole: {b1}, then {b2}, then {b1} again.",
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
    "Today's sky: {w}. Tomorrow's sky: probably {w}.",
    "The weather balloon reported {w} and then popped.",
    "Nobody packed for {w}. Nobody ever does.",
    "Pilots out here talk about the {w}. Now we know why.",
    "Long-term readings show {w}, season after season.",
    "The landing window opened between bouts of {w}.",
    "The crew stood at the window and watched the {w} for a while.",
    "Anyone camping here should expect {w}.",
    "The atmosphere probe beeped about {w} all the way down.",
    "The climate model has one word for it: {w}. Well, a few words.",
    "A permanent fixture of the sky: {w}.",
    "{w}, more or less every day. Locals, if there were any, would be used to it.",
    "Bring an umbrella. Or several. Expect {w}.",
    "Weather report from the landing site: {w}. Morale: fine.",
    "The sky has a mood, and the mood is {w}.",
    "{w}. Then more {w}. Then a short break, then {w}.",
    "Shuttle pilots grumble about the {w}, but they keep going down.",
    "Every photo from the surface shows the same thing: {w}.",
    "The night shift logged {w} until sunrise.",
    "Even the sensors seem tired of the {w}.",
  ];
  const GAS = [
    'There is no solid ground, just {b1} sinking into {b2}.',
    'Probes dropped into {b1} and were lost somewhere in the {b2}.',
    'Below the {b1}, the pressure climbs until the probes go quiet in the {b2}.',
    'You could fall forever here: {b1} above, {b2} below, and no floor.',
    'From orbit you can watch {b1} curl into {b2}.',
    "Cloud cities would float nicely in the {b1}, if anyone dared. Below them: {b2}.",
    "The drop probe broadcast all the way through the {b1}, then sang one long note in the {b2}.",
    "Bands of {b1} race past bands of {b2} at speeds that make the instruments nervous.",
    "Nothing here holds still. {b1} chases {b2} around the planet forever.",
    "Deep down, the {b2} turns into something that is neither gas nor liquid.",
    "The top of the {b1} is calm. The {b2} underneath is anything but.",
    "Lightning lights up the {b1} from inside, like a lamp under a blanket of {b2}.",
    "The ship skimmed the {b1} and came back with a tank full of {b2}.",
    "Storm after storm rolls through the {b1}, some of them older than the Guild.",
    "From close up it's {b1}. From far away it's a striped marble. Inside, it's {b2} all the way down.",
    "The {b1} is thin enough to see through for a few kilometres, then the {b2} swallows everything.",
    "Somewhere in the {b2}, the probe recorded what sounded like a whale. Probably wind.",
    "The {b1} rotate in opposite directions. Where they meet: {b2}.",
    "A storm in the {b1} has been going since before anyone was born. The {b2} beneath it is calm.",
    "Light from the sun glows orange in the {b1} and green in the {b2}.",
  ];
  const NOTE = {
    Common: ['A quiet world. Worth a pin on the map.', 'Nothing unusual, which is its own kind of nice.', 'Logged and catalogued. On to the next one.', 'A good place to stretch your legs.', 'Ordinary, in the most relaxing way.', 'One more dot on the map. A nice dot.', 'The crew took a group photo and moved on.', "Filed under 'nice, but not urgent'.", "A world for a quiet afternoon.", "Nothing to write home about. Wrote home anyway.", "Not every world has to be famous.", "Solid, dependable, round. Good planet.", "The kind of place you forget and then miss.", "It does the job of being a planet very well.", "Every map needs a few of these.", "A world that doesn't need to prove anything.", "Ordinary, and quietly proud of it.", "It goes in the log with a little smiley face.", "Good for a stop, a snack and a stretch.", "Plain on the outside. Probably plain on the inside too. That's fine."],
    Uncommon: ['Scientists back home will want a closer look.', 'The readings here are a little strange. In a good way.', 'One of the crew has already asked to come back.', 'Worth a second visit.', 'There is more going on here than it first looks like.', 'The sample drawers are full of interesting rocks.', "A few readings don't add up yet. They will.", "The Guild will send a second team.", "There's a story here. Someone just has to find it.", "Better than average, and it knows it.", "A world with a bit of a secret.", "Somebody back home is going to write a paper on this.", "The crew kept finding excuses to look out the window.", "Unusual enough to argue about over dinner.", "One reading stuck out. The scientist circled it three times.", "The crew agreed it was the best world this week.", "It has a few surprises. More than it lets on.", "The Guild atlas will need a whole paragraph.", "Worth bringing a friend back to see."],
    Rare: ['The ship\'s instruments have never recorded anything like it.', 'Mission control asked for the data three times to be sure.', 'A world like this turns up maybe once in a hundred jumps.', 'Three different sensors had to agree before anyone believed it.', 'The science team is arguing about it already.', "The instruments were recalibrated twice. The numbers stayed the same.", "There may not be another one like it in this sector.", "The data packet home was marked urgent.", "Worth a detour from anywhere.", "The kind of world that changes textbooks.", "Even the autopilot slowed down to look.", "Few explorers ever see a world like this.", "The Guild will name a medal after this one.", "The ship's computer asked if it should start a new folder just for this.", "Rare enough that the crew double-checked the date on the calendar.", "Somebody back home is going to be very jealous.", "A world that turns explorers into storytellers.", "The kind of place that ends up on posters."],
    Legendary: ['Old star maps mention a world like this, but nobody believed them.', 'The crew went completely silent at the viewport.', 'This one goes on the front page of every science journal back home.', 'Once in a lifetime. Maybe once in several.', 'Nobody on board will forget this one.', "Someday, people will ask where you were when this was found.", "A world from the old stories, real after all.", "Not a single word in the log seems big enough.", "The ship drifted for an hour while everyone just looked.", "This one gets a chapter of its own in the history books.", "The kind of discovery that ends a career happily.", "You will tell this story for the rest of your life.", "Mission control asked for a picture. Then they asked for another one.", "The Guild will want to hear this one in person.", "Stories about this world will outlive the ship.", "Even the stars seem to point at it.", "If you never find anything else, this was enough.", "History, quietly sitting there, waiting to be found."],
  };
  const ODD = ['a perfectly round lake', 'ruins of an ancient structure', 'a second, tiny star in its sky', 'rings that glow at night', 'a mountain taller than Olympus Mons', 'a canyon that circles the whole planet', 'a moon that orbits backwards', 'a magnetic field strong enough to scramble the compass', 'a repeating radio pulse from the surface', 'giant crystal arches', 'a crater shaped like a heart', 'a storm that has not moved in centuries', 'a lake that glows at night', 'floating rock islands', 'a geyser taller than any mountain', 'a perfectly straight canyon', 'spiral-shaped dunes', 'mirror-smooth salt plains that reflect the stars', 'trees of pure crystal', 'a waterfall that falls upward in the wind', "a desert that sings when the wind changes", "a valley where it always rains, and only there", "a forest of stone trees", "a sea that freezes every night and melts every morning", "a crater lake shaped like a perfect star", "a volcano made of ice", "rivers that run in a circle", "sand that glows when you step on it", "a mountain with a hole straight through it", "clouds that form the same shape every afternoon", "an island that drifts across the ocean", "a canyon that echoes for a full minute", "a field of hexagonal stone columns", "a moon that eclipses the sun every single day", "a shadow on the ground with nothing to cast it", "pink snow on the highest peaks", "a hot spring that bubbles in rhythm", "a lake of liquid glass", "a glacier the color of rust", "a single tree taller than a skyscraper", "lightning that only strikes one hill", "a ring of standing stones nobody put there", "a beach of black pearls", "fog that flows uphill", "a plain covered in perfectly round boulders", "a tide that comes in once a year", "a sunrise in the west", "a cliff that hums at sunset", "a meteor crater with a second, smaller crater exactly in the middle", "stars visible in the middle of the day", "a beach where the waves come in sideways", "a lake that tastes like lemonade (do not drink it)", "a valley full of floating pebbles", "a mountain shaped like a sleeping cat", "a forest that only grows in perfect circles", "cliffs that ring like bells in the wind", "an ocean with a whirlpool the size of a country", "a moon close enough to see its craters with your eyes", "a cave full of glow-worms that spell out patterns", "a sand dune taller than the clouds", "a geyser that erupts every 7 minutes exactly", "a crystal tower that splits sunlight into rainbows over the whole valley", "a river of mercury-bright water", "a field where the grass grows downward from the cliffs", "a sky with three moons that line up every evening", "a canyon with its own weather", "a giant stone arch, perfectly smooth", "a frozen ocean with fish visible under the ice", "a ring of volcanoes around a calm blue lake", "petrified lightning sticking out of the sand", "a mountain range that looks like the edge of a saw", "an island shaped exactly like a question mark", "fields of bubbles that never pop", "trees with leaves like silver coins", "a cave that breathes in and out with the tide", "a single cloud that never moves", "a hill covered in what look like enormous footprints", "a waterfall with no visible source", "a lake with a perfect reflection, even in wind", "a meadow of glowing blue flowers that close when you watch"];
  // extra lines for variety: the star's light, how livable it feels, and what the bio-scanner says
  const STAR_LINE = { 'red dwarf': ['Its red dwarf sun turns every shadow a deep crimson.', "The red dwarf hangs huge and dim in the sky, like a lamp turned down low.", "Under a red sun, even the snow looks warm.", "The red dwarf flickers now and then. The crew stopped flinching after a day."], 'orange dwarf': ['Amber light from its star makes every afternoon look like sunset.', "The orange sun makes everything look like an old photograph.", "Long golden evenings, courtesy of its orange star.", "The orange star is calm and steady. Good neighbor."], 'yellow dwarf': ['Its yellow sun feels almost familiar.', "A yellow sun, a blue-ish sky. Some of the crew got a bit homesick.", "Its sun rises and sets in a way that feels completely normal, which is strange out here.", "The yellow star is just the right distance away. Lucky world."], 'white dwarf': ['A tiny, fierce white star gives it a cold, clinical light.', "The white dwarf is tiny but blinding. Everyone wears sunglasses on deck.", "Its tiny white star throws hard, cold light.", "A white dwarf: the leftover heart of a star that used to be much bigger."], 'blue giant': ['A huge blue sun fills the sky and bleaches every color.', "The blue giant fills a huge part of the sky and hums with radiation.", "Its blue star burns so hot that shadows look blue too.", "The blue giant will not last forever. Nothing that bright does."], 'red giant': ['A swollen red giant takes up a third of the sky.', "The red giant is swollen and tired, glowing across half the sky.", "Its old red star has seen a lot. It shows.", "Sunsets under a red giant take most of an afternoon."], 'binary pair': ['Two suns cast double shadows on everything.', "Two suns, two shadows, twice the sunsets.", "The twin stars dance around each other every few days.", "Nobody can agree which of the two suns is the 'main' one."], 'pulsar': ['The pulsar ticks overhead like a cosmic clock.', "The pulsar blinks like a lighthouse, many times a second.", "Every instrument on board ticks in time with the pulsar.", "A dead star spinning fast, flashing across the sky like a strobe."] };
  const HAB_LINE = ['You could almost walk around without a suit.', 'Someone should bring a tent.', 'It looks a lot like home, if home were a bit stranger.', 'The air readings came back almost breathable.', 'The crew is already arguing about who gets to live here.', "The crew voted: if they ever retire, it's here.", "There's a meadow down there that is basically begging for a picnic.", "Fresh water, mild air, decent gravity. Real estate agents would cry.", "One of the crew already picked out a spot for a cabin.", "The air smells like rain and something sweet.", "A garden would grow here without much fuss.", "If you squint, it's a postcard from home.", "Walking around down there would feel almost normal.", "The Guild will want to put a settlement here. Quickly.", "It's the kind of place you send a letter from.", "The crew packed a picnic before the shuttle even landed.", "Kids would love it down there. Grown-ups too.", "Birds (or something like birds) sing in the morning.", "A soft breeze, a warm sun and nowhere to be. Bliss.", "Someone is already drafting a brochure."];
  const LIFE_LINE = [null, ['The bio-scanner found microbes clinging to the rocks.', 'Something tiny is alive down there.', "Under the microscope, the rocks are crawling with tiny, busy life.", "The water samples came back slightly alive.", "Bacteria here have learned to eat rocks, apparently.", "The microbe count went up every time the scientist looked.", "Even the ice has tiny passengers."], ['Patches of moss-like life cover the sheltered valleys.', 'The ground is furred with something green-ish.', "Lichen-like growths paint the rocks in orange and green.", "Little carpets of moss creep toward the warmer side.", "Some of the stones are covered in something soft that wasn't there yesterday.", "Mossy carpets ripple when the wind passes.", "Something low and green is slowly winning the rocks over."], ['Whole forests of strange plants sway below.', 'Things are growing everywhere you look.', "Tall, swaying plants follow the sun across the sky.", "The forests are so thick the drones bumped into them.", "Flowers the size of umbrellas open every morning.", "Trees here have leaves the size of sails.", "The forest canopy is so thick it has its own weather."], ['Shapes move under the water. Big ones.', 'The seas are full of swimmers.', "Something in the oceans sings at night, and something else answers.", "Glowing schools of fish turn the bays bright blue.", "Huge shapes glide under the waves, minding their own business.", "Shoals of silver fish flash in the shallows.", "Something with a lot of tentacles waved at the drone. Probably friendly."], ['Herds of large animals crossed the plains below.', 'The bio-scanner would not stop beeping.', "Flocks of flying things blacken the sky at dusk.", "Footprints the size of dinner plates cross the riverbanks.", "Animals gathered at the waterholes to watch the shuttle land.", "Big grazing animals move in slow herds across the plains.", "Nests the size of houses dot the cliffs."], ['Something down there is watching us back.', 'There are lights on the night side. Regular, patterned lights.', "There are roads down there. Nobody on board built them.", "A structure on the coast blinks in a pattern. It might be saying hello.", "The radio keeps picking up chatter in a language nobody knows.", "Lights blink on and off along the coast, in rhythm.", "There's a carved stone face on the hillside. It's smiling."]];

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
    const fill = s => s.replaceAll('{n}', name).replaceAll('{star}', star.replace(' (drifting alone)', '') === 'none' ? 'nothing' : star).replaceAll('{b1}', b[0].toLowerCase()).replaceAll('{b2}', (b[1] || b[0]).toLowerCase()).replaceAll('{w}', weather);
    const lines = [fill(T.rogue ? '{n} drifts through deep space with no star at all. The ship nearly flew past it.' : pick(r, OPEN)), fill(T.noGround ? pick(r, GAS) : pick(r, GROUND))];
    if (STAR_LINE[star] && r() < .45) lines.push(pick(r, [].concat(STAR_LINE[star])));
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
      look: { pv: 3, pal, land, clouds: !!T.clouds || (type === 'Ocean' && r() < .4), bands: !!T.noGround, locked: !!T.locked, lava: type === 'Lava' || type === 'Shattered', sparkle: !!T.sparkle || type === 'Crystal', crystal: type === 'Crystal', tilt: between(r, -0.35, 0.35), ringCol: pick(r, ['#c7cfcc', '#819796', '#df84a5', '#e8c170', '#73bed3', '#ad7757']), noise: Math.floor(r() * 1e9) },
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
  const SECRETS = ['The post recorded a low hum coming from underground.', 'At night, the ground glows faintly around the post.', 'Something left tracks around the post overnight.', 'A huge cave system runs under most of the surface.', 'Found a meteorite that came from another star system.', 'Wind here whistles through the rocks, almost like music.', 'The compass points at the same mountain no matter where you stand.', 'Rock layers show the climate flips every few thousand years.', 'There is liquid water deep underground, kept warm by the core.', 'Picked up a faint signal that repeats every 42 minutes.', 'The soil is full of tiny, perfect glass spheres.', 'Sunsets here last almost an hour.', 'A shooting star crosses the sky every few minutes.', 'Gravity dips slightly over one region, as if something huge is buried there.', "The post found an old Guild flag buried under the landing pad.", "On clear nights the post's radio picks up a lullaby from the north.", "The local water tastes faintly of mint. Nobody knows why.", "A single flower blooms by the post every year, always on the same day.", "The post's walls are slowly being covered by a friendly vine.", "Something taps on the roof every night at exactly midnight.", "There's a cave nearby with handprints on the walls. Very old ones.", "The ground near the post is warm, as if something sleeps beneath it.", "A family of small animals has moved into the post's storage shed.", "The sky here turns green for a few seconds at sunset.", "Old coins keep turning up in the garden.", "The post's clock runs a few seconds fast. Every clock here does.", "A rock near the post looks exactly like a sleeping dog. Everyone pats it.", "A stream near the post flows uphill for a hundred metres, then gives up.", "On windy days, the hills sound like an orchestra tuning up.", "The post's pantry door opens on its own at breakfast time.", "A comet passes over the post every spring, right on schedule.", "The post's dog digs up a new fossil every week.", "Somebody planted a tree here long before the post was built.", "On quiet nights you can hear the planet's core rumble, very faintly.", "The post's well water has tiny glittering flecks in it. Harmless. Pretty.", "A huge shadow passes over the post once a year. Nobody has seen what casts it.", "The local soil makes tomatoes grow twice as big.", "There's an echo here that answers a few seconds too late.", "The post's weathervane always points at the same star.", "Lost things turn up here. Mostly keys. Not always the post's keys.", "A family of birds nests in the radio dish every year.", "The rocks near the post are warm to the touch at night.", "If you whistle near the cliffs, something whistles back.", "The post's oldest building has initials carved into the doorframe. Nobody knows whose."];
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
    museum: ['🏛', 'Museum', ['The Museum opened a new wing about {from}.', '{who} stared at the same painting for three hours.', 'A school trip from {from} touched everything. Twice.', 'The Museum bought a rock from {b}. It is a very nice rock.', '{num} visitors came to see the exhibit on {star}s.']],
    school: ['🏫', 'School', ['The School taught {num} kids about {star}s today.', '{who} gave a guest lecture. Nobody fell asleep (almost).', 'Field trip to the {b}. Everyone came back muddy.', 'The science fair winner built a tiny rocket out of {res}.', 'Homework: name every moon you can. {who} named {num}.']],
    theater: ['🎭', 'Theater', ['Tonight\'s play: "The Lost Ship of {from}". Standing ovation.', '{who} forgot every line and improvised. It was better.', 'The Theater sold {num} tickets for the comedy night.', 'A touring troupe from {from} performed in the {w}.', 'The stage lights blew a fuse in the second act. Nobody minded.']],
    gym: ['🏋', 'Gym', ['{who} lifted {num} kilos in low gravity and is very proud.', 'Spin class in the {w}. Everyone survived.', 'The Gym started a running club around the {b}.', '{num} people signed up for the new year. {num} quit by Tuesday.', 'A pilot from {from} challenged everyone to push-ups.']],
    bakery: ['🥐', 'Bakery', ['The Bakery sold out of {food} buns by noon.', '{who} tried to bake bread with {res}. Do not try this.', 'Fresh bread smell reached all the way to the Depot.', 'A ship from {from} ordered {num} cakes for a wedding.', 'The baker made a cake shaped like {n}. Very accurate.']],
    lab: ['🧪', 'Research Lab', ['The Research Lab studied samples of {res} all day.', '{who} published a paper. Three people read it. All good reviews.', 'An experiment turned the lab {w}. Briefly.', 'The Lab found {num} new microbes in the {b}.', 'Scientists from {from} came to compare notes.']],
    shrine: ['⛩', 'Shrine', ['Pilgrims from {from} lit {num} candles at the Shrine.', '{who} sat by the Shrine and watched the {star} rise.', 'The Shrine bell rang at dawn. Everyone woke up. Some were grateful.', 'Travelers left small gifts of {food} at the Shrine.', 'A quiet festival at the Shrine. No speeches, just lanterns.']],
    park: ['🎡', 'Fun Park', ['The Fun Park\'s big wheel gave {num} rides today.', '{who} won a stuffed space whale at the ring toss.', 'The low-gravity roller coaster opened. Screams were heard on {from}.', 'Cotton candy flavor of the week: {food}. Controversial.', 'A rain of {w} closed the park early. Kids were upset.']],
    zoo: ['🦒', 'Xeno Zoo', ['The Xeno Zoo welcomed a new creature from {from}.', '{who} got licked by something with six legs.', 'Feeding time: {num} kilos of {plant}.', 'Something escaped from the Zoo. It came back for dinner.', 'The keeper swears the {b} creatures can count to {num}.']],
    forge: ['⚒', 'Forge', ['The Forge hammered out {num} new hull plates.', '{who} made a sword out of {res}. Nobody asked why.', 'Sparks from the Forge lit up the {w}.', 'A freighter from {from} ordered custom engine parts.', 'The smith melted down an old satellite and made spoons.']],
    studio: ['🎨', 'Art Studio', ['The Art Studio painted the {b} at sunset.', '{who} made a sculpture of {n}. It looks like a potato.', 'An art show about {from} sold {num} pieces.', 'Someone painted the whole Depot. Purple.', 'A painter from {from} is staying for the light of the {star}.']],
    farm: ['🌾', 'Farm', ['The Farm harvested {num} crates of {plant}.', '{who} named every cow. There are {num} cows.', 'Irrigation channels now reach the {b}.', 'The {w} was good for the crops this week.', 'Fresh {plant} went out to the Diner and to {from}.']],
    teahouse: ['🍵', 'Tea House', ['The Tea House brewed {num} pots of moss tea today.', '{who} sat in the Tea House all afternoon and finished one cup.', 'A tea master from {from} judged the new blend. "Acceptable."', 'Rain of {w} on the roof. Best day of the year at the Tea House.', 'The Tea House started serving {food} on the side. Purists are upset.']],
    icecream: ['🍦', 'Ice Cream Parlor', ['The Ice Cream Parlor sold {num} cones. Flavor of the day: {plant}.', '{who} dropped a full cone and cried a little. Free refill.', 'A heat wave pushed the line out the door.', 'Someone ordered {food} ice cream. They regretted it.', 'A kid from {from} tried every flavor in one visit.']],
    fishmarket: ['🐟', 'Fish Market', ['The Fish Market sold {num} crates of something with fins.', '{who} caught a fish bigger than the boat. Again.', 'A fisher from {from} swears the {b} fish can talk.', 'The Fish Market smells. Everyone agrees. Nobody leaves.', 'Today\'s catch was mostly boots. Old boots from {from}.']],
    dish: ['🛰', 'Satellite Dish', ['The Satellite Dish caught a signal from {from}. It was an ad.', '{who} pointed the Dish at the {star} and heard humming.', 'The Dish picked up {num} new signals overnight.', 'A bird built a nest in the Satellite Dish. Signal improved.', 'Static from deep space spelled something. Probably nothing.']],
    weather: ['⛅', 'Weather Station', ['The Weather Station predicts {w}. It is usually right.', '{who} launched {num} weather balloons. {num} came back.', 'Forecast: {w}, then more {w}. Bring a jacket.', 'The Weather Station measured the strongest wind on record over the {b}.', 'A storm chaser from {from} moved in next door.']],
    genebank: ['🧬', 'Gene Bank', ['The Gene Bank stored {num} new seed samples of {plant}.', '{who} labeled every jar. Twice. Just in case.', 'A biologist from {from} brought frozen samples to swap.', 'The freezers hummed all night. Everything is safe.', 'The Gene Bank found a seed nobody can identify. It is growing.']],
    robotics: ['🤖', 'Robotics Lab', ['The Robotics Lab built {num} cleaning bots. One cleans only the ceiling.', '{who} taught a robot to wave. It will not stop waving.', 'A robot from {from} came to visit its cousin.', 'The Lab\'s mining bot went missing in the {b}. It sent a postcard.', 'A robot made {food}. It was surprisingly good.']],
    bowling: ['🎳', 'Bowling Alley', ['The Bowling Alley hosted {num} games tonight.', '{who} bowled a perfect game, then claimed it never happened.', 'In low gravity, the ball took four minutes to reach the pins.', 'A team from {from} won the league with matching shirts.', 'The pin machine jammed again. Everyone cheered anyway.']],
    karaoke: ['🎤', 'Karaoke Bar', ['The Karaoke Bar heard {num} songs tonight, {num} of them on key.', '{who} sang the seven-note song from the old logs. The room went quiet.', 'A crew from {from} did a group song. Loudly.', 'The microphone broke in the middle of a ballad. The crowd finished it.', '{who} has sung the same song every night for a month.']],
    stadium: ['🏟', 'Stadium', ['The Stadium filled {num} seats for the derby.', '{who} scored in the last second. The post went wild.', 'A team from {from} came to play. They lost, but they brought snacks.', 'Game delayed by {w}. Fans stayed anyway.', 'The Stadium lights can be seen from orbit now.']],
    cards: ['🃏', 'Card Club', ['The Card Club ran {num} tables tonight.', '{who} won with a terrible hand and a very straight face.', 'A gambler from {from} lost a hat, a coat and a small moon map.', 'The Card Club invented a new game. Nobody understands the rules.', 'Tournament night. {who} came second. Again.']],
    playground: ['🛝', 'Playground', ['{num} kids played at the Playground today.', '{who} went down the slide too. Nobody judged. Much.', 'The low-gravity swing set is the most popular thing on the post.', 'Kids from {from} built a sandcastle of {res}.', 'The Playground lost a ball. It is in orbit now.']],
    spa: ['💆', 'Spa', ['The Spa booked {num} massages today.', '{who} fell asleep in the mud bath. Woke up relaxed and sticky.', 'A pilot from {from} came in sore and left floating.', 'The Spa started a new treatment with local {res}. Results: glowing.', 'Quiet hours at the Spa. Even the robots whisper.']],
    campground: ['🏕', 'Campground', ['The Campground had {num} tents up tonight.', '{who} told ghost stories about the Quiet Zone. Everyone slept badly.', 'Campers watched the {star} set over the {b}.', 'A family from {from} roasted {food} over the fire.', 'Someone forgot to close a tent. Something got in. It was friendly.']],
    zen: ['🧘', 'Meditation Garden', ['{num} visitors meditated in the garden today.', '{who} raked the stones into the shape of {n}.', 'A monk from {from} sat still for a whole day. A bird sat on them.', 'The {w} made the garden very peaceful.', 'The garden\'s fountain went quiet. Somehow that was even nicer.']],
    mine: ['⛏', 'Mine', ['The Mine dug up {num} tons of {res}.', '{who} found a cave full of crystals and named it after their mom.', 'A drill from {from} broke through to an underground lake.', 'The Mine canaries are all fine. They\'re robot canaries.', 'Miners sang the whole shift. Productivity went up.']],
    refinery: ['🏭', 'Refinery', ['The Refinery processed {num} loads of {res}.', '{who} invented a cleaner filter. The air smells like pine now.', 'A shipment of refined metal went out to {from}.', 'The Refinery\'s chimney puffed a smoke ring. Probably on purpose.', 'Overtime at the Refinery. The canteen ran out of {food}.']],
    launchpad: ['🚀', 'Launch Pad', ['The Launch Pad sent {num} rockets up today.', '{who} counted down from ten. Twice. The rocket was patient.', 'A cargo rocket to {from} lifted off through the {w}.', 'Kids lined the fence to watch the launch.', 'A rocket came back early. It forgot something.']],
    recycle: ['♻', 'Recycling Center', ['The Recycling Center turned {num} old crates into new ones.', '{who} found a working radio in the scrap pile.', 'A ship from {from} dropped off a whole broken satellite.', 'The Recycling Center made benches out of old hull plates.', 'Sorting day. {who} found three socks. None match.']],
    paper: ['📰', 'Newspaper', ['The Newspaper printed {num} copies today. Headline: "{n} Still Great".', '{who} wrote an angry letter about the {w}. It got printed.', 'A reporter from {from} came to cover the Diner\'s new menu.', 'Today\'s crossword had the word "{res}" in it. Nobody got it.', 'Breaking news: a cat was rescued from the Satellite Dish.']],
    cinema: ['🎬', 'Cinema', ['The Cinema sold {num} tickets for the space western.', '{who} cried at the end. Everyone pretended not to notice.', 'A film crew from {from} premiered their movie here.', 'The projector broke. The crowd acted out the ending.', 'Popcorn flavor of the week: {food}. Mixed reviews.']],
    music: ['🎶', 'Music Hall', ['The Music Hall played to {num} people tonight.', '{who} played a solo that made the lights flicker.', 'An orchestra from {from} played the seven-note song as an encore.', 'Choir practice ran late. The whole post listened from outside.', 'A band named themselves after {n}. They are not good yet.']],
    photo: ['📷', 'Photo Studio', ['The Photo Studio printed {num} postcards of {n}.', '{who} took a photo of the {star} that will be famous one day.', 'A couple from {from} had their wedding photos taken in the {b}.', 'The darkroom ran out of film. Everyone posed anyway.', 'A photo of the {w} won a sector-wide contest.']],
    sculpt: ['🗿', 'Sculpture Garden', ['The Sculpture Garden added a statue carved from {res}.', '{who} posed for a statue for {num} hours.', 'An artist from {from} carved a giant duck. It is everyone\'s favorite.', 'The {w} weathered the statues into something new.', 'Kids climbed the statues again. The statues didn\'t mind.']],
    inn: ['🛏', 'Inn', ['The Inn had {num} guests tonight.', '{who} checked in for one night and stayed a week.', 'A traveling crew from {from} took every room.', 'The Inn\'s guestbook is filling up with doodles of {n}.']],
  };
  const FAC_DESC = { diner: 'Hot food for tired travelers.', depot: 'Stores cargo and ships it across the sector.', hangar: 'Docking and repairs for passing ships.', greenhouse: 'Grows fresh food under glass.',
    observatory: 'Watches the sky for comets and far-off stars.', clinic: 'Patches travelers up after long jumps.', lounge: 'Music, games and stories late into the night.', radio: 'Picks up signals and runs a call-in show.',
    workshop: 'Builds and fixes anything with spare parts.', library: 'Books, old maps and a cozy reading corner.', market: 'Traders swap goods from many worlds.', bathhouse: 'Hot springs for sore explorers.',
    arcade: 'Old cabinets and fierce high-score battles.', inn: 'Beds for travelers who stay the night.', museum: 'Treasures and oddities from across the stars.', school: 'Lessons for the post\'s kids (and curious adults).',
    theater: 'Plays, comedy nights and touring troupes.', gym: 'Keeps bones strong in strange gravity.', bakery: 'Fresh bread and very questionable cakes.', lab: 'Real science on local samples.', shrine: 'A quiet place for pilgrims and tired pilots.',
    park: 'Rides, games and cotton candy.', zoo: 'Friendly (mostly) creatures from many worlds.', forge: 'Hull plates, engine parts and the odd spoon.', studio: 'Paint, clay and a lot of purple.', farm: 'Grows food for the whole post.',
    teahouse: 'Slow tea and slower conversations.', icecream: 'Frozen treats, even on frozen worlds.', fishmarket: 'Fresh catch from local seas (if any).', dish: 'Listens to the sky, all day and night.', weather: 'Forecasts for skies nobody can predict.', genebank: 'Seeds and samples, saved for the future.', robotics: 'Builds helper bots (and a few troublemakers).', bowling: 'Low-gravity bowling. Strikes are rare. Chaos is common.', karaoke: 'Singing, ready or not.', stadium: 'Big games under alien skies.', cards: 'Card games and friendly bluffing.', playground: 'Swings, slides and very tired parents.', spa: 'Massages, masks and quiet music.', campground: 'Tents under strange stars.', zen: 'Raked stones and long breaths.', mine: 'Digs deep for ore and other treasures.', refinery: 'Turns raw rock into useful stuff.', launchpad: 'Sends cargo and dreams to orbit.', recycle: 'Nothing gets wasted out here.', paper: 'Daily news, local gossip and a crossword.', cinema: 'Old movies, new movies and too much popcorn.', music: 'Orchestras, bands and the occasional choir.', photo: 'Portraits and postcards from the edge of the map.', sculpt: 'Statues of heroes, explorers and one very large duck.' };
  // every facility has a theme; a post whose facilities share one gets that theme's name
  const FAC_THEME = { diner: 'food', bakery: 'food', farm: 'food', greenhouse: 'food', market: 'food', observatory: 'sci', lab: 'sci', school: 'sci', radio: 'sci', library: 'sci',
    arcade: 'fun', park: 'fun', lounge: 'fun', theater: 'fun', clinic: 'rest', bathhouse: 'rest', gym: 'rest', inn: 'rest', shrine: 'rest', depot: 'work', hangar: 'work', workshop: 'work', forge: 'work', museum: 'art', studio: 'art', zoo: 'art',
    teahouse: 'food', icecream: 'food', fishmarket: 'food', dish: 'sci', weather: 'sci', genebank: 'sci', robotics: 'sci', bowling: 'fun', karaoke: 'fun', stadium: 'fun', cards: 'fun', playground: 'fun', spa: 'rest', campground: 'rest', zen: 'rest', mine: 'work', refinery: 'work', launchpad: 'work', recycle: 'work', paper: 'art', cinema: 'art', music: 'art', photo: 'art', sculpt: 'art' };
  const THEME_LOG = {"food": ["The smell of {food} drifted all the way to the landing pad today.", "{who} from {from} asked for the recipe. The cook said no, kindly.", "The {fac} ran out of plates at lunch. People ate off spare hull panels.", "A food critic from {from} gave the {fac} four stars and a nap.", "Fresh {plant} came in from the fields. Everything tasted greener.", "{num} bowls of {food} were served before noon.", "The {fac} tried a new spice from {from}. Half the post is still sneezing.", "Leftovers from the {fac} fed a whole crew of passing miners.", "The {fac} ran a 'guess the soup' contest. Nobody won. The soup did.", "A traveler from {from} cried over a bowl of {food}. Happy tears.", "The {fac} had a cook-off. {who} won with a dish called \"Comet\".", "The {fac} stayed open late for a crew of miners from {from}.", "{num} people asked for seconds at the {fac}. Then thirds.", "The {fac} tried growing {plant} on the roof. It worked."], "sci": ["The {fac} logged {num} new readings about the {w}.", "{who} published a paper on the {b}. It has three readers and they all loved it.", "A student from {from} spent the night at the {fac}, asking questions.", "The {fac}'s instruments picked up something odd near the {star}. Probably nothing. Probably.", "Someone wrote \"science!\" on the {fac}'s whiteboard and nobody erased it.", "The {fac} traded data with a lab on {from}. Both sides think they got the better deal.", "{who} measured the {res} deposits again, just to be sure.", "The {fac}'s coffee machine is now considered a scientific instrument.", "The {fac} detected a tiny quake under the {b}.", "{who} ran an experiment at the {fac} that made a loud pop and a lot of smiles.", "A visiting professor from {from} gave a talk at the {fac}. {num} people came.", "The {fac}'s computers worked out exactly how long the {w} will last. Forever, roughly.", "The {fac} sent its data off to {from}. Big file.", "Someone left a microscope at the {fac} pointed at a cookie crumb."], "fun": ["The {fac} was packed tonight. {num} people, one very loud song.", "{who} from {from} set a new record at the {fac}. There was a parade (small).", "Someone at the {fac} started a dance that the whole post now knows.", "The {fac} hosted a tournament. The winner got a hat.", "Kids from {from} came to the {fac} on a school trip and refused to leave.", "Laughter from the {fac} could be heard over the {w}.", "The {fac} ran out of tickets, prizes and patience, in that order.", "{who} lost at the {fac} and demanded a rematch. Tomorrow at noon.", "The {fac} held a costume party. Three people came as the {star}.", "{who} beat everyone at the {fac} and then bought them all a drink.", "A band from {from} played a surprise set at the {fac}.", "The {fac} had its quietest night ever. Then a birthday party arrived.", "The {fac}'s high-score board was reset. Chaos.", "Even the post's grumpiest resident cracked a smile at the {fac} today."], "rest": ["The {fac} was quiet today. That's the point.", "A tired pilot from {from} slept fourteen hours at the {fac}.", "{who} came in grumpy and left the {fac} smiling.", "The {fac} handed out {num} warm towels.", "Someone left a thank-you note on the {fac}'s door.", "The {fac} had a waiting list today. The {w} made everyone want a break.", "Travelers from {from} said the {fac} was the best part of their trip.", "Even the post's robot took an afternoon off at the {fac}.", "Someone at the {fac} fell asleep mid-sentence. Nobody woke them.", "The {fac} ran out of pillows. People brought their own.", "A crew from {from} spent the whole day at the {fac} and left glowing.", "The {fac} played soft music over the {w}.", "{who} wrote in the {fac}'s guestbook: 'Best nap of my life.'", "The {fac} got new blankets from {from}. They're very fluffy."], "work": ["The {fac} worked through the {w} without stopping.", "{who} hauled {num} crates of {res} before lunch.", "A ship from {from} limped in. The {fac} sent it out good as new.", "The {fac}'s machines hummed all night.", "Someone at the {fac} invented a better wrench. It's just a bigger wrench.", "The {fac} took on a rush order from {from} and finished early.", "{who} found a spare part at the {fac} they'd been looking for for a year.", "Grease, sparks and good work at the {fac} today.", "The {fac} fixed {num} broken things today, and broke only one.", "{who} at the {fac} worked through lunch, then ate two lunches.", "A shipment of {res} from {from} arrived at the {fac} early.", "The {fac} built a ramp for the post's robot. It loves the ramp.", "The {fac}'s crew finished early and went to watch the {star} set.", "Loud clanging from the {fac} all day. Good clanging."], "art": ["The {fac} put up a new exhibit about the {b}.", "{who} from {from} sold a painting of the {star} at the {fac}.", "A crowd of {num} gathered at the {fac} to see something new.", "Kids from the post made art out of {res} at the {fac}.", "The {fac} got a visit from a famous artist from {from}. They left a doodle on the wall.", "Someone at the {fac} made a sculpture of the post's cat. The cat is unimpressed.", "The {fac} stayed open late. Nobody wanted to leave.", "A new piece at the {fac} is called \"{w}\". It's very blue.", "{who} painted the {fac}'s door bright yellow. People love it.", "The {fac} showed a film about the history of {from}.", "A poet from {from} read at the {fac}. Someone fainted (it was hot).", "Children's drawings of the {w} now cover a whole wall of the {fac}.", "The {fac} commissioned a statue of a famous local goat.", "{num} visitors left notes in the {fac}'s suggestion box. Most said 'more'."]};
  const GEN_LOG = ["{num} travelers from {from} stopped at the {fac} today.", "{who} has been coming to the {fac} every day for a month.", "The {w} kept people inside the {fac} all afternoon.", "A sign at the {fac} now reads \"Welcome to {n}\". It's hand-painted.", "The {fac} got a fresh coat of paint, mostly on purpose.", "A ship from {from} brought news, letters and one confused goat to the {fac}.", "The {fac}'s lights stayed on all night, just in case.", "Someone tied a ribbon to the {fac}'s door. Nobody knows who.", "{who} told a story at the {fac} about the {b}. It got taller every time.", "The {fac} smelled faintly of {food} again today.", "A postcard from {from} arrived at the {fac}. It said \"wish you were here\".", "The {fac} had its busiest day since opening.", "It was a slow day at the {fac}. Someone did a crossword.", "The {star} set over the {fac}, and everyone stopped to look.", "A lost traveler from {from} found their way to the {fac}, then found their way home.", "The {fac} had a new visitor every hour today.", "A traveling musician played outside the {fac} for tips.", "The post's cat napped on the {fac}'s roof all afternoon.", "A delivery from {from} arrived at the {fac}, mostly intact.", "{who} fixed the {fac}'s sign. It was crooked for a year.", "The {fac} hung lanterns for a festival nobody remembers the reason for.", "A rainbow ended right at the {fac}. No gold. Still nice.", "Somebody planted flowers around the {fac} overnight.", "The {fac} hosted a meeting about the {w}. Nothing was decided.", "A tired traveler from {from} sat outside the {fac} and watched the {star} for an hour."];
  const THEMES = { food: ['🍜', 'Food Stop'], sci: ['🔬', 'Research Post'], fun: ['🕹', 'Fun Post'], rest: ['♨', 'Rest Stop'], work: ['🔧', 'Work Post'], art: ['🎨', 'Culture Post'] };
  const FOOD = ['noodles', 'dumplings', 'space soup', 'fried rice', 'pancakes', 'curry', 'moon pie', 'tea', 'hot cocoa', 'grilled fish', 'mystery stew', 'sticky rice'];
  const PLANT = ['glow-beans', 'blue melons', 'star lettuce', 'spiral carrots', 'purple chilies', 'moss tea leaves', 'crystal berries'];
  const TITLE = ['Captain', 'Pilot', 'Trader', 'Engineer', 'Doctor', 'Old', 'Navigator', 'Cook', 'Miner'];
  function facLog(p, k, r, worlds) {
    const pk = a => a[Math.floor(r() * a.length)];
    const nameBit = () => { let n = ''; for (let i = 0; i < 2; i++) n += pk(SYL); return n.charAt(0).toUpperCase() + n.slice(1); };
    const from = worlds.length > 1 && r() < .7 ? pk(worlds) : nameBit();
    const roll = r(), th = THEME_LOG[FAC_THEME[k]], tpl = roll < .62 || !th ? pk(FAC[k][2]) : roll < .86 ? pk(th) : pk(GEN_LOG);
    return tpl.replace(/\{fac\}/g, FAC[k][1]).replace(/\{who\}/g, () => pk(TITLE) + ' ' + nameBit()).replace(/\{from\}/g, from).replace(/\{num\}/g, () => String(2 + Math.floor(r() * 40)))
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
    ["🌑", "Eclipse", "A moon slid in front of a distant star. The whole cabin went dark for a minute. Very dramatic."],
    ["📻", "Old broadcast", "The radio caught a cooking show from a hundred years ago. {who} wrote down the recipe."],
    ["🪐", "Rogue moon", "A moon with no planet drifted by, looking lost. The crew waved."],
    ["🧲", "Magnetic hiccup", "A magnetic storm spun every compass on board. {who} got lost on the way to the galley."],
    ["🦠", "Space mold", "Something fuzzy was growing in the air vents. {who} cleaned it out. It may have been sentient."],
    ["🎁", "Care package", "A drifting supply crate turned out to be a care package. Inside: socks, tea, and a note that said \"for whoever\"."],
    ["🛟", "Escape pod", "An empty escape pod tumbled past. Its log said its passenger got picked up years ago. Happy ending."],
    ["🌈", "Light show", "Sunlight hit a cloud of ice crystals and painted the hull in rainbow stripes."],
    ["🔊", "Echo", "The hull rang like a bell for no reason at all. {who} swears it played a C sharp."],
    ["🦋", "Solar sail", "A delicate solar-sail ship floated by, silver and enormous. Its crew blinked their lights hello."],
    ["🧭", "Old Guild marker", "Passed a Guild marker buoy from the first survey. Someone had left a sticker on it."],
    ["🍀", "Lucky streak", "Three good omens in one session: a falling star, a smooth jump, and fresh coffee."],
    ["🎈", "Lost balloon", "A weather balloon from {world} floated past, very far from home."],
    ["💤", "Quiet stretch", "Nothing happened for the whole session. It was lovely."],
    ["🌀", "Gravity well", "The ship skirted a tiny black hole. Clocks on board are now four seconds behind."],
    ["🎤", "Karaoke signal", "Someone on {post} broadcast karaoke on every channel. {who} sang along. Everyone heard."],
    ["🪐", "Ring crossing", "Cut straight through a planet's rings. Tiny ice pebbles rattled off the hull like rain."],
    ["🐦", "Space bird", "A shimmering creature with long fins followed the ship for an hour, then turned back."],
    ["📡", "Wrong number", "A call came in for \"Mister Wobbles\". Nobody on board is called Mister Wobbles."],
    ["🌟", "New star", "A brand-new star was born on the long-range scope. The crew named it after {who}."],
    ["🧳", "Hitchhiker", "Picked up a hitchhiker at a buoy and dropped them at {post}. They paid in stories."],
    ["⏰", "Time drift", "Every clock on board disagrees by a few minutes. {who} decided they're all correct."],
    ["🎆", "Fireworks", "Fireworks lit up the sky over {world}. Some festival. The crew watched from orbit."],
    ["🐟", "Ice fish", "A chunk of comet ice had a tiny frozen fish inside. Nobody knows how it got there."],
    ["🗿", "Space statue", "A stone face, ten metres tall, drifted past in silence. It looked mildly disappointed."],
    ["☕", "Coffee crisis", "The coffee ran out for one terrible hour. {who} found an emergency stash. Hero."],
    ["🌊", "Solar wind", "A gust of solar wind pushed the ship along for free. Fuel gauge: happy."],
    ["🕯", "Power dip", "The lights went out for a minute. {who} told a ghost story in the dark. Everyone stayed close."],
    ["🎵", "Hull music", "Micrometeorites pattered on the hull in a rhythm. {who} swore it was a waltz."],
    ["🧑‍🚀", "Spacewalk", "{who} went outside to fix an antenna and stayed out an extra ten minutes, just looking."],
    ["📸", "Perfect photo", "{who} took a photo of the {world} system that might be the best photo ever taken. They printed it."],
    ["🌫", "Dust cloud", "The ship flew through a cloud of fine dust. Everything is slightly glittery now."],
    ["🛸", "Mystery lights", "Three lights moved in a triangle past the window, then left. Nobody wants to talk about it."],
    ["🥚", "Odd egg", "Something egg-shaped stuck to the hull. It fell off before anyone could look. Probably for the best."],
    ["📬", "Late letter", "A letter caught up with the ship, addressed to a crew member who left years ago. {who} kept it safe."],
    ["🧩", "Puzzle night", "The crew finished a thousand-piece puzzle of {world}. One piece is missing. Of course."],
    ["🌋", "Volcanic moon", "A moon erupted as the ship passed. Ash and sparks for miles. Spectacular."],
    ["💌", "Fan mail", "Someone on {post} wrote to say they follow the ship's journey on the radio. {who} blushed."],
    ["🚥", "Traffic jam", "Three cargo haulers and a tour bus all tried to use the same jump lane. The ship waited."],
    ["🌕", "Full moon", "Every moon in the system was full at once. {who} howled. Nobody joined in. Then everybody did."],
    ["🔋", "Battery bonus", "A surge from a passing star topped up the batteries. Free power for a day."],
    ["🧽", "Cleaning day", "{who} declared a cleaning day. Found: two socks, a fork, and the TV remote from three months ago."],
    ["🎂", "Birthday", "It was {who}'s birthday. Cake, candles, and a song that echoed down every corridor."],
    ["🌠", "Wishing star", "A single shooting star crossed the window. The whole crew made the same wish."],
    ["🔍", "Stowaway mouse", "A tiny mouse was found in the galley. {who} named it and now it has its own bowl."],
    ["🗺", "Old map", "Found an old paper map tucked behind a panel. It shows {world}, drawn by hand, long before anyone visited."],
  ];
  const BOTTLE = ['If you found this, keep going.', 'The view from here is worth the trip.', 'Anyone else out here? Say hi.', 'Took a wrong turn at the last nebula. Worth it.', 'Remember to drink water.', 'The best world is the next one.', "Please feed my plants if you pass {world}.", "I left the lights on. Sorry.", "Space is big. You're doing great.", "If you see a ship called the Meridian, tell them we're still listening.", "Today I saw a comet and thought of you, whoever you are.", "This bottle has been to more worlds than I have.", "Don't forget to look out the window sometimes.", "The coffee at Halfway Station is terrible. Go anyway.", "We were here. It was nice.", "Keep a sock in every jacket pocket. Trust me.", "To whoever finds this: happy birthday, probably.", "I named a star after my dog. It's the blinky one.", "The answer is seven. I forgot the question.", "Go home sometimes. Then come back out.", "Whoever finds this: look up. No, more up.", "I'm on my way home. Hope you are too.", "Don't trust the vending machine at Port Lantern.", "This note was written in zero gravity. Sorry about the handwriting.", "The seven notes go: low, low, high, low, high, high, low.", "Be the kind of explorer you'd want to meet.", "I left a cookie at the next buoy. It's probably gone.", "If you're lonely out here, you're in good company.", "Somebody, somewhere, is proud of you.", "Write things down. You'll forget otherwise."];
  const FIX = ['someone left the Diner\'s oven on', 'a traveler locked themselves out of the Inn', 'the antenna was pointing the wrong way', 'a very loud bird sat on the transmitter', 'the Arcade high score got beaten and someone panicked', "the radio was tuned to a cooking channel", "a kid was playing with the emergency button", "a goat got into the comms room", "the Greenhouse sprinklers hit the alarm sensor", "a traveler sneezed on the panic switch", "the Observatory saw a comet and got excited", "someone confused the doorbell with the distress beacon", "a robot vacuum got stuck in the transmitter shed", "the Music Hall's drummer hit the wrong switch", "the night shift just wanted someone to talk to", "the Bakery's oven timer sounded like an alarm", "two pilots were arguing on the emergency channel", "a cat sat on the transmit button", "the Library's quiet alarm was too loud", "a kite got tangled in the antenna"];

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
    ["sig", "Signals", "Recordings of sounds nobody should be able to hear", "xen1"], ["fos", "Fossils", "Living things that kept their shape for a very long time", "xen2"], ["coin", "Coins", "Money from places that stopped needing it", "xen3"], ["ano", "Anomalies", "Things that break the rules, kept in sealed boxes", "xen4"], ["stn", "Station Souvenirs", "Only sold at Interplanetary Stations", "shop"]];
  const CAT_ITEMS = {
    stn: {"Common": ["Big Wheel Snow Globe", "\"I Survived the Big Wheel\" Mug", "Station Keychain", "Docking Bay Postcard", "Foam Space Helmet", "Food Court Chopsticks", "Tiny Solar Panel Magnet", "Station Map (Slightly Wrong)"], "Uncommon": ["Signed Pilot Photo", "Glow-in-the-Dark Ring Model", "Commemorative Ration Bar", "Station Choir Recording", "Collector's Docking Pass", "Plush Space Whale"], "Rare": ["Piece of the Original Hull", "Station Founder's Pin", "First-Day Ticket Stub", "Golden Airlock Handle"], "Legendary": ["Keys to the Station", "The Station Cat (Very Real)"]},
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
  const catOpen = c => { const x = CATS.find(k => k[0] === c); return !x || !x[3] || x[3] === 'shop' || !!TECH[x[3]]; }; // some categories need research first
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
  const HULL_COLORS = { Lilac: '#c7cfcc', White: '#ebede9', Sky: '#a4dddb', Peach: '#e8c170', Rose: '#df84a5', Lime: '#a8ca58', Indigo: '#4f8fba', Crimson: '#cf573c', Steel: '#819796', Copper: '#be772b', Navy: '#3c5e8b' }; // Steel, Copper and Navy are only sold at Interplanetary Stations
  const STATION_ONLY = { colors: ['Steel', 'Copper', 'Navy'] };
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); return snap([(n >> 16 & 255) * f, (n >> 8 & 255) * f, (n & 255) * f]); };
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
    const rows = ['....r....', '....g....', 'bb.ggg.bb', 'bbbgwgbbb', 'bb.ggg.bb', '...g.g...'], col = { b: '#3c5e8b', g: '#c7cfcc', w: '#ebede9', r: '#cf573c' };
    const cv = document.createElement('canvas'); cv.width = 9; cv.height = 6; const x = cv.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((c, i) => { if (col[c]) { x.fillStyle = col[c]; x.fillRect(i, y, 1, 1); } }));
    satUrl = cv.toDataURL(); return satUrl;
  }

  // the planet palette: every pixel of every portrait is snapped to one of these 32 colours
  const PALETTE = ['#75a743', '#a8ca58', '#a8ca58', '#d0da91', '#e8c170', '#cf573c', '#cf573c', '#a53030', '#752438', '#402751', '#402751', '#752438', '#a53030', '#ad7757', '#d7b594', '#c7cfcc',
    '#df84a5', '#c65197', '#7a367b', '#241527', '#402751', '#7a367b', '#819796', '#c7cfcc', '#ebede9', '#a4dddb', '#73bed3', '#4f8fba', '#4f8fba', '#a23e8c', '#7a367b', '#402751'].map(h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; });
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
    const L = p.look; if (L.pv === 3) return L; // older worlds: same shapes, colours redone for the current palette
    if (L._nl) return L._nl;
    const T = TYPES[p.type]; let nl = null;
    try { const q = makePlanet(p.seed, p.num, p.lucky, 0); if (q.type === p.type) nl = Object.assign({}, L, { pal: q.look.pal, land: q.look.land, ringCol: q.look.ringCol }); } catch (e) { /* fall through */ }
    if (!nl) nl = Object.assign({}, L, { pal: T.pal.slice(), land: T.land ? T.land.slice() : L.land, ringCol: '#819796' });
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
    sell: { rarity: { Common: 6, Uncommon: 15, Rare: 45, Legendary: 140 }, perHabitabilityPercent: .25, earthLike: 15, earthLikeAt: 80, perLifeLevel: 4, anomaly: 15, rings: 5, perMoon: 1, moonCap: 10, perRecord: 30 },
    distressRun: { base: 500, random: 200, bonusMin: 100, bonusMax: 250 }, tradeStation: { chance: .12, prices: { Common: 75, Uncommon: 190, Rare: 500, Legendary: 1500 }, sellRatio: .3 }, roomCost: { base: 160, growth: 1.7, maxLevel: 5 }, campaign: { base: 30, perLog: .7 }, survey: { pay: 20 }, crewCost: { base: 200, perCrew: 160 }, diaryEvery: 8, decorCost: { t1: 150, t2: 400, t3: 900, t4: 1800, station: 2500 }, shipStyleCost: { color: 300, design: 800 }, moduleCost: { base: 70, growth: 1.27, maxLevel: { engine: 30, scanner: 21, lab: 14, comms: 25, hull: 30 } }, facilityCost: { base: 80, growth: 1.6, maxLevel: 10 },
    levels: { base: 40, perLevel: 4, perLevelSquared: .2 }, ratingRanks: [0, 400, 1500, 4000, 9000, 18000, 32000, 55000, 90000, 140000, 220000],
    station: { chance: .0375, discount: .2, sellBonus: .25, charge: 600, satellite: 1500, contract: 300, intel: 400, chipDiscount: .25, steel: 1000, design: 2500, veteran: 2500, shift: 220 },
    coordChips: { start: 5, base: 1500, growth: 1.25, max: 60 }, facilitySlots: { base: 5, atTown: 1, max: 10, buyBase: 1500, buyGrowth: 1.8 },
    quests: { delivery: 55, deliveryViaJump: .7, expedition: 350, expeditionSafe: 50, expeditionBold: 20, contract: 900, contractKnowledge: 250, bossBase: 700, bossPerCatch: 150 },
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
    // a Travelers' Post only has room for a few facilities: 5, and one more once it grows into a Town
    const FS = E.facilitySlots, slotBuyMax = () => Math.max(0, Math.round(FS.max - FS.base - FS.atTown));
    const facSlots = p => Math.min(Math.round(FS.max), Math.round(FS.base + ((p.post.tp.pop || 0) >= 1000 ? FS.atTown : 0) + (p.post.tp.extra || 0)));
    const slotCost = p => Math.round(FS.buyBase * Math.pow(FS.buyGrowth, p.post.tp.extra || 0));
    function buySlot(p) { const tp = p.post.tp, c = slotCost(p); if ((tp.extra || 0) >= slotBuyMax() || S.dust < c) return; S.dust -= c; tp.extra = (tp.extra || 0) + 1; S.cnt.slots = (S.cnt.slots || 0) + 1; shopXP(15); save(); draw(); }
    const slotFree = p => !!(p.post && p.post.tp) && p.post.tp.fac.length < facSlots(p);
    const facName = f => f.name || FAC[f.k][1];
    function postTheme(p) { const c = {}; p.post.tp.fac.forEach(f => { const t = FAC_THEME[f.k]; if (t) c[t] = (c[t] || 0) + 1; }); const top = Object.entries(c).sort((a, b) => b[1] - a[1]); return top.length && top[0][1] >= 2 && (!top[1] || top[0][1] > top[1][1]) ? THEMES[top[0][0]] : null; }
    const postName = p => p.post.tp.name || (postTheme(p) ? postTheme(p)[1] + ' on ' + nm(p) : 'Travelers\' Post on ' + nm(p));
    function building() {
      if (!(S.mission > 0) || !S.job) return null;
      if (S.job.k === 'room') return ROOMS[S.job.fac] && !roomLv(S.job.fac) ? { k: 'room', fac: S.job.fac, p: null, num: 0 } : null;
      const j = S.job, f = byNum(j.num); if (!f) return null; const p = f.p;
      if (j.k === 'post' && !p.post && !stationAt(p)) return { k: 'post', p };
      if (j.k === 'node' && !p.node && !held(p) && !stationAt(p)) return { k: 'node', p };
      if (j.k === 'upgrade' && p.post && !p.post.tp) return { k: 'upgrade', p };
      if (j.k === 'add' && p.post && p.post.tp && FAC[j.fac] && !hasFac(p, j.fac) && slotFree(p)) return { k: 'add', p, fac: j.fac };
      return null;
    }
    const jobText = j => j.k === 'room' ? 'Building the ' + ROOMS[j.fac][1] + ' on your ship' : j.k === 'node' ? 'Installing a Hyperdrive Node on ' + nm(j.p) : j.k === 'post' ? 'Building a Listening Post on ' + nm(j.p) : j.k === 'upgrade' ? 'Upgrading ' + nm(j.p) + ' to a Travelers\' Post' : 'Building a ' + FAC[j.fac][1] + ' at ' + nm(j.p);
    const jobKey = j => j.k + ':' + (j.p ? j.p.num : j.num) + ':' + (j.fac || '');
    function buildOptions() { // every job you could do next, grouped
      const out = { Facilities: [], Upgrades: [], 'New Listening Posts': [], 'Hyperdrive Nodes': [] };
      S.found.slice().reverse().forEach(({ p }) => {
        if (held(p)) return;
        if (!p.node && !stationAt(p)) out['Hyperdrive Nodes'].push({ k: 'node', num: p.num, label: 'Hyperdrive Node on ' + nm(p) + ' (' + pad(p.num) + ')' });
        if (!p.post) { if (!stationAt(p)) out['New Listening Posts'].push({ k: 'post', num: p.num, label: '🗼 Listening Post on ' + nm(p) + ' (' + pad(p.num) + ')' }); }
        else if (!p.post.tp) out.Upgrades.push({ k: 'upgrade', num: p.num, label: '🏘 Upgrade ' + nm(p) + ' to a Travelers\' Post' });
        else if (slotFree(p)) Object.keys(FAC).filter(k => !hasFac(p, k)).forEach(k => out.Facilities.push({ k: 'add', num: p.num, fac: k, label: FAC[k][0] + ' ' + FAC[k][1] + ' at ' + nm(p) }));
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
    const FIGHT = ['{G} put up a fight, but the crew drove them off the {b}.', 'A long standoff over the {b}. {G} blinked first and fled.', '{G} tried an ambush in the {b}. It did not go well for them.', 'After a tense chase through the {b}, {g} gave up and jumped away.', '{G} surrendered once the ship\'s floodlights hit their camp in the {b}.', "{G} tried to bluff their way out over the {b}. The crew called the bluff.", "{G} hid in the {b} and waited. The crew waited longer.", "The crew cut {g}'s fuel line in the {b}. They had to walk home.", "{G} threw everything they had at the ship over the {b}. It wasn't enough.", "A short, loud fight over the {b}. Then a long, quiet retreat from {g}.", "{G} ran out of ammunition before the crew ran out of patience.", "{G} tried to outrun the ship through the {b}. They tripped over a rock.", "{G} set up a trap in the {b}. The crew stepped around it.", "The crew lit up the {b} like a stage, and {g} lost their nerve.", "{G} called for backup. Backup didn't come.", "A tense game of hide-and-seek in the {b}. The crew won. {G} went home.", "{G} gave up as soon as the ship's cook started yelling."];
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
      ["🚑", "Ambulance Ship Refuel!", "A hospital ship near {p} was running low on fuel. They paid double for a top-up and threw in some vitamins.", 30, 80],
      ["🎻", "Traveling Orchestra!", "An orchestra touring {p}'s moons needed a ride for their tuba. They paid in cash and one private concert.", 30, 70],
      ["🛠", "Repair Job!", "A small freighter broke down in orbit around {p}. The crew fixed it in an afternoon and got paid for the parts.", 40, 90],
      ["🐾", "Lost Pet Reward!", "Someone's escaped robot cat was floating near {p}. The reward poster was very generous.", 20, 70],
      ["📚", "Library Ship!", "A library ship orbiting {p} bought your old survey reports. Librarians love a good map.", 30, 70],
      ["🏁", "Comet Race Sponsor!", "The Comet Racing League was practicing near {p}. They paid to put a sticker on your hull.", 40, 100],
      ["🧊", "Ice Hauler Trade!", "An ice hauler around {p} swapped water for some of your spare parts. Good deal for both.", 30, 70],
      ["🎨", "Painter's Commission!", "A painter wanted your ship in the foreground of a painting of {p}. They paid for the pose.", 20, 60],
      ["🔭", "Amateur Astronomers!", "A club of amateur astronomers near {p} paid to borrow your telescope for a night.", 20, 60],
      ["🪙", "Old Coin Cache!", "A hollow asteroid near {p} had a stash of old coins inside. Somebody's savings, long forgotten.", 50, 120],
      ["🍲", "Soup Kitchen Donation!", "A soup kitchen ship near {p} got a hand from the crew, and insisted on paying them back.", 20, 50],
      ["🧯", "Fire Drill Fee!", "A station near {p} hired the crew to test their fire drills. Nobody was harmed. One toaster was.", 30, 70],
      ["🗳", "Census Help!", "The Guild census office paid you to count the settlements on {p}. There were more than expected.", 40, 90],
      ["🎒", "Tour Guide Gig!", "A group of tourists heading for {p} hired the crew as guides for a day. Tips were good.", 30, 80],
      ["🚚", "Moving Day!", "A family moving to {p} needed help with their furniture. The piano was the hard part.", 30, 70],
      ["🧳", "Lost Luggage Reward!", "A suitcase drifting near {p} belonged to a rich tourist. They paid a big reward to get their socks back.", 30, 90],
      ["🔧", "Spare Parts Swap!", "A tinkerer near {p} swapped a box of rare parts for your old junk. They think they won.", 30, 80],
      ["📻", "Radio Show Guest!", "A radio station on {p} paid the crew to tell travel stories live on air.", 20, 60],
      ["🌾", "Harvest Helpers!", "Farmers on {p} needed extra hands for the harvest. They paid in coins and fresh bread.", 30, 70],
      ["🐉", "Kite Festival Prize!", "The ship accidentally won {p}'s kite festival by flying past at the right moment. Prize accepted.", 20, 80],
      ["🚿", "Water Delivery Tip!", "A thirsty mining camp near {p} tipped big for a tank of fresh water.", 30, 80],
      ["🧭", "Navigation Lessons!", "A rookie pilot near {p} paid for a crash course (no crashing) in navigation.", 30, 70],
      ["🎠", "Fairground Ride!", "A traveling fair orbiting {p} hired the ship as a backdrop for its rides.", 20, 60],
      ["🪐", "Ring Ice Sale!", "Ice from {p}'s rings sold for a good price to a passing cocktail bar.", 40, 90],
      ["📷", "Postcard Rights!", "A postcard company bought the rights to your best photos of {p}.", 30, 80],
      ["🏺", "Antique Dealer!", "An antique dealer near {p} paid for an old cup the crew had been using as a pen holder.", 40, 110],
      ["🥫", "Food Drive!", "A charity ship near {p} paid the crew to help hand out meals. Good work, good pay.", 20, 60],
      ["⛽", "Fuel Price Glitch!", "A fuel station near {p} had a pricing glitch. The ship filled up and sold the extra.", 40, 100],
      ["🧑‍🏫", "Guest Lecture!", "A school on {p}'s moon paid the Captain to give a talk. Questions included \"is space cold?\".", 20, 60],
      ["🎣", "Space Fishing Contest!", "A fishing contest in {p}'s ice rings. The crew caught a frozen boot and won \"most creative\".", 20, 70],
    ];
    let encGot = null, traderNew = null;
    const heldP = () => { const f = S.outlaw && byNum(S.outlaw); return f && f.p.outlaw && !f.p.outlaw.cleared ? f.p : null; };
    const held = p => !!(p.outlaw && !p.outlaw.cleared);
    if (!S.events) S.events = []; if (!S.fc) S.fc = { n: 0, broken: false };
    function rollEvent(force) {
      if (!force && Math.random() >= evChance(lvl('comms')) + chipP('storm', chipAmp())) return null;
      const pk = a => a[Math.floor(Math.random() * a.length)];
      const nameBit = () => { let n = ''; for (let i = 0; i < 2; i++) n += pk(SYL); return n.charAt(0).toUpperCase() + n.slice(1); };
      const pl = posts(); const pool = EVENTS.filter(e => !e[2].includes('{post}') || pl.length);
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
      d1: ["Old Logbook, page 1", "Found a logbook wedged behind the bridge console. The first page says: \"Property of Captain Imre Sallow. If you're reading this, the ship is yours now. Be nice to her. She pulls a little to the left.\""],
      d2: ["Old Logbook, page 2", "\"Day one with the new ship. She's older than me and twice as stubborn. The coffee machine works on the third try. The engine works on the second. I'm calling that a good start.\""],
      d3: ["Old Logbook, page 3", "\"Found my first world today. Grey, cold, nothing on it. I named it anyway. Wrote a whole page about it. The Guild says boring worlds are important. I'm starting to believe them.\""],
      d4: ["Old Logbook, page 4", "\"Picked up a hitchhiker at a buoy. Said her name was Odessa and that she was 'between careers'. She fixed the toaster and stole my good socks. Fair trade.\""],
      d5: ["Old Logbook, page 5", "\"Odessa left at a Trade Station. Took the socks. Left a note: 'Keep flying left. It suits you.' I miss her a little. I miss the socks more.\""],
      d6: ["Old Logbook, page 6", "\"Got lost in a nebula for three days. Sang every song I know to keep the lights company. When I came out, there was a planet made of blue glass. Worth it.\""],
      d7: ["Old Logbook, page 7", "\"Built my first Travelers' Post today. A radio, a kettle and a chair. Somebody called in on the first night just to say the stars looked nice. I said they did.\""],
      d8: ["Old Logbook, page 8", "\"Outlaws again. They wanted the cargo. The cargo was soup. They took the soup. I hope they enjoyed it. I really do. It was good soup.\""],
      d9: ["Old Logbook, page 9", "\"Heard a song on the radio tonight. Seven notes, very slow, from nowhere I could find. Played it back forty times. Couldn't sleep. Didn't want to.\""],
      d10: ["Old Logbook, page 10", "\"The Guild gave me a medal. It's small and it pinches. I wear it on Sundays. Mostly I keep it in the cup holder next to a pebble from my first world.\""],
      d11: ["Old Logbook, page 11", "\"Had a bad week. Lost a crewmate to a better ship and a better job. Good for him. The galley feels too big now. I'm making too much soup.\""],
      d12: ["Old Logbook, page 12", "\"Decided to stop chasing the biggest discoveries. Started chasing the nicest sunsets instead. Logbook's getting happier. So am I.\""],
      d13: ["Old Logbook, page 13", "\"Saw a space whale. I know. I KNOW. It was the size of a moon and it looked at me like I was a small, interesting bug. I cried. Nobody has to know.\""],
      d14: ["Old Logbook, page 14", "\"Followed the seven-note song toward the Quiet Zone. Turned back at the edge. Not ready. Some doors are for later.\""],
      d15: ["Old Logbook, page 15", "\"A kid at one of my Posts asked how to become an explorer. I said: be curious, be kind, and write things down. Then I gave her my second-best pen.\""],
      d16: ["Old Logbook, page 16", "\"The ship and I are both getting slower. She makes a new noise every month. I make two. We understand each other.\""],
      d17: ["Old Logbook, page 17", "\"Counted my worlds tonight. Not as many as the famous captains. But every single one has a page, and every page is honest. That's the job.\""],
      d18: ["Old Logbook, page 18", "\"Got a letter from Odessa. Still has my socks. Says she's got a ship of her own now, and that it pulls to the left. I laughed for a long time.\""],
      d19: ["Old Logbook, page 19", "\"I'm going to leave the ship at a Guild dock and take up gardening. Somebody new will get her. I hope they're curious. I hope they write things down.\""],
      d20: ["Old Logbook, last page", "\"To whoever has my ship now: the coffee machine works on the third try. The engine on the second. Keep flying left. Look out the window sometimes. And if you ever hear seven slow notes on the radio, say hello for me.\" There's a pressed flower between the last two pages."],
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
    if (!S.rooms) S.rooms = {}; if (!S.crew) S.crew = []; if (!S.ship) S.ship = { name: 'The Lantern', color: 'Lilac', colors: ['Lilac'] };
    const roomLv = k => S.rooms[k] || 0, ROOM_MAX = Math.max(1, Math.round(E.roomCost.maxLevel));
    const roomCost = lv => Math.round(E.roomCost.base * Math.pow(E.roomCost.growth, lv - 1) * stDisc()); // lv = level you upgrade to
    const bunks = () => roomLv('quarters') * 2;
    function upgradeRoom(k) { const lv = roomLv(k), c = roomCost(lv + 1); if (!lv || lv >= ROOM_MAX || S.dust < c) return; S.dust -= c; S.rooms[k] = lv + 1; shopXP(12); save(); draw(); }
    const ROLES = {
      Engineer: ['🔧', '+8 resources every session', ['{n} rewired the coffee machine. It now makes tea, which is worse.', '{n} spent the session inside an engine panel and came out humming.', '{n} found one loose bolt in the reactor housing and kept it as a lucky charm.', '{n} tuned the thrusters by ear. Nobody knows how.', "{n} labelled every wire in the ship. The labels say things like \"probably fine\".", "{n} fixed the squeaky hatch. The silence is eerie now.", "{n} built a tiny robot out of spare parts. It follows them around.", "{n} took apart the toaster to see how it worked. It now has three settings: off, on, and \"why\".", "{n} spent the whole session under the floor plates. Occasionally, a wrench appeared.", "{n} gave the engines a pep talk. Fuel efficiency went up 2%.", "{n} replaced a fuse with a paperclip \"temporarily\". It has been six weeks.", "{n} found a mystery button on the bridge. They are not allowed to press it.", "{n} oiled every hinge on the ship. It now opens doors with a whisper.", "{n} built a shelf. It holds one wrench. It is perfect.", "{n} got stuck in a maintenance tunnel and decided to fix it while they were there.", "{n} gave the reactor a name. It's \"Big Steve\".", "{n} upgraded the doorbell. It now plays the seven-note song.", "{n} made a spare part out of a spoon. The spoon is happier now.", "{n} spent the session listening to the hull with a stethoscope.", "{n} rewired the cabin lights to dim at bedtime. Sleep quality: up."]],
      Cook: ['🍳', '+6 XP every session', ['{n} made soup out of whatever was left. Everyone asked for seconds.', '{n} burned the toast on purpose. "Character," they said.', '{n} grew basil in a helmet. The galley smells amazing.', '{n} held a tasting of mystery sauces. Two crew members are still thinking about sauce #3.', "{n} tried to make bread in zero gravity. The bread is now on the ceiling.", "{n} invented a dish called \"Thursday\". Nobody knows what's in it. Everyone likes it.", "{n} baked a cake shaped like the last planet. It was eaten in four minutes.", "{n} made breakfast for dinner. Morale is at an all-time high.", "{n} has been fermenting something in the back of the galley. It smells like ambition.", "{n} hosted a noodle-slurping contest. The ship's walls will never be clean again.", "{n} put hot sauce in the pancakes. It was a mistake. It was also kind of great.", "{n} wrote the week's menu on the fridge. Every day just says \"soup?\"", "{n} cooked a stew so good that someone proposed to it.", "{n} turned old rations into a surprisingly fancy salad.", "{n} made popcorn in the engine room. Everyone came running.", "{n} baked cookies shaped like the crew. Nobody could eat their own face.", "{n} declared Tuesday \"Taco Tuesday\". It is Thursday.", "{n} found a new use for space potatoes: everything.", "{n} made tea so strong the spoon stood up.", "{n} cooked a five-course dinner. Course four was a mystery. It was delicious."]],
      Scientist: ['🔬', '+6 Knowledge every session', ['{n} filled three whiteboards with equations and then erased them, satisfied.', '{n} named a microbe after the ship\'s cat. The ship has no cat.', '{n} spent the session staring at the planet through a spectrometer.', '{n} wrote a paper titled "Probably Not Aliens: A Study".', "{n} measured the ship's gravity for an hour and announced it is \"basically fine\".", "{n} grew crystals in a coffee mug. Nobody is allowed to drink from it now.", "{n} spent the session arguing with a computer simulation. The simulation won.", "{n} catalogued every rock on board. There are 412. Most of them are in their bunk.", "{n} has a theory about the seven-note song. They won't share it yet.", "{n} built a model of the solar system out of fruit. The moon was a grape.", "{n} ran an experiment on the crew's sleep. Conclusion: everyone needs more of it.", "{n} discovered a new shade of blue on the last planet and named it after their mom.", "{n} built a tiny weather station in a jar.", "{n} watched a single drop of water for an hour and took notes.", "{n} taught the ship's computer to make terrible puns.", "{n} discovered that the coffee is slightly radioactive. They're fine with it.", "{n} labelled every sample with a small drawing of its face.", "{n} measured how long it takes toast to fall in this gravity. Results pending.", "{n} found a bug in the star charts and fixed it. A real bug. It had legs.", "{n} built a model volcano. It erupted twice. Once on purpose."]],
      Pilot: ['🧑‍✈️', '+5 resources and +4 XP every session', ['{n} flew the whole stretch with one hand and a sandwich in the other.', '{n} found a shortcut through an asteroid field. The rest of the crew screamed politely.', '{n} practiced barrel rolls in the simulator for an hour.', '{n} insists the ship pulls slightly to the left.', "{n} parked the ship perfectly between two asteroids, then took a nap.", "{n} drew a smiley face in space with the engine trail.", "{n} claims they can fly the ship blindfolded. Nobody has let them try.", "{n} talked to traffic control for an hour. There was no traffic. There was no control.", "{n} named every switch on the dashboard. The big red one is called Gary.", "{n} flew through a comet's tail just to see what it would sound like.", "{n} spent the session polishing the windscreen. The stars look sharper now.", "{n} taught the autopilot a new trick. It now lands with a little wiggle.", "{n} flew the ship backwards for a bit, just to see if they could.", "{n} wrote a song about the last jump. It's mostly engine noises.", "{n} landed a practice shuttle on a coin. A big coin.", "{n} insists the ship flies better when they wear their lucky jacket.", "{n} spent the session tracing new routes on the map with their finger.", "{n} raced a comet. Called it a draw.", "{n} took the long way round because the view was better.", "{n} tuned the radio to a music station from three systems away."]],
      Scout: ['🛰', 'Arrival encounters 3 points more likely', ['{n} spotted something shiny on the scanners and won\'t stop talking about it.', '{n} mapped three nearby comets just for fun.', '{n} kept watch at the window the whole session. Saw a lot of space.', '{n} marked a "probably interesting" spot on the chart.', "{n} counted every star in one corner of the window. They lost count at 9,000.", "{n} drew a map of the last world from memory. It was mostly right.", "{n} spotted a satellite older than the Guild drifting past.", "{n} kept the long-range scope pointed at a blinking light for the whole session.", "{n} brought back a pocketful of rocks and a pocketful of rumors.", "{n} found a way through the next nebula that nobody else noticed.", "{n} set up a camera at the window. It took 3,000 pictures of nothing, then one great one.", "{n} swore they saw a space whale. They now carry a sketchbook everywhere.", "{n} found a spot on the chart where three routes meet. They named it after themselves.", "{n} counted the craters on a passing moon. There are 4,112. Or 4,113.", "{n} left a little flag on a passing asteroid.", "{n} drew a picture of every planet they've ever seen. The wall is full.", "{n} heard a rumor about a world made of chocolate. They're looking.", "{n} spent the session with the ship's telescope and came back with stars in their eyes.", "{n} spotted a ship in the distance that blinked twice and vanished.", "{n} found a shortcut. It was longer. They're calling it \"scenic\"."]],
      Trader: ['💰', 'Trade Station prices 10% lower', ['{n} haggled with the vending machine and won.', '{n} reorganized the cargo hold by resale value.', '{n} sold a story about the last planet to a passing freighter.', '{n} practiced their "I\'m walking away" face in the mirror.', "{n} sold the ship's old coffee grounds as \"rare soil\". They made a profit.", "{n} counted the money twice and then once more, for luck.", "{n} traded a joke for a crate of oranges. Good deal.", "{n} spent the session writing price tags for things that aren't for sale.", "{n} bought something weird at the last market and refuses to say what it is.", "{n} haggled with another trader over the radio for three hours. Both lost.", "{n} keeps a little notebook of who owes them favors. It is very thick.", "{n} rearranged the shop window. The ship doesn't have a shop window.", "{n} sold a used toothbrush to a collector. Don't ask.", "{n} spent the session polishing coins until they looked rarer.", "{n} drew up a contract to buy the next planet. The planet did not sign.", "{n} found a typo in a price tag and made a small fortune.", "{n} traded stories with a passing freighter. Came out two stories ahead.", "{n} taught the crew how to bargain. Now everyone bargains for dessert.", "{n} built a little stall in the cargo bay. Business is slow but steady.", "{n} sold the idea of a planet to a museum. Just the idea."]],
      Medic: ['🩹', 'Distress Runs pay 10% more', ['{n} ran a check-up on everyone. Prescription: more sleep.', '{n} reorganized the Med Bay by color.', '{n} patched up a crew member who lost a fight with a door.', '{n} taught a first-aid class. Attendance was mandatory and cookies were provided.', "{n} made everyone drink a glass of water. Then another one.", "{n} spent the session restocking bandages and humming.", "{n} checked the Captain's posture and sighed deeply.", "{n} treated a sprained ankle, a paper cut and one very dramatic hiccup.", "{n} put up a poster that says \"Stretch!\". Nobody has stretched.", "{n} ran a fire drill. Everyone passed except the toaster.", "{n} made a herbal tea that tastes like a forest. A wet one.", "{n} took everyone's temperature. The ship is running a little warm. The crew is fine.", "{n} prescribed a nap to the whole crew. Compliance was 100%.", "{n} brewed a soup that cured three colds and one bad mood.", "{n} wrote \"wash your hands\" on every mirror on the ship.", "{n} fixed a sprained wrist and a wobbly chair in the same visit.", "{n} counted everyone's heartbeats. All present, all correct.", "{n} gave the ship's robot a check-up. It's in great shape. Emotionally, too.", "{n} organized a stretching session. Two people pulled something. Irony.", "{n} restocked the first-aid kit with bandages shaped like stars."]],
      Storyteller: ['📖', '+4 Knowledge and +3 XP every session', ['{n} told the story of the first explorer during dinner. Nobody moved.', '{n} wrote a song about the last outlaw fight. It has nine verses.', '{n} read old transmissions aloud with dramatic voices.', '{n} started a book club. The book is the ship\'s manual.', "{n} told the story of the space whale again, but bigger.", "{n} started writing a novel about the crew. Everyone wants to know their character.", "{n} did impressions of every outlaw they've ever met. Uncanny.", "{n} recorded an audio diary of the trip so far. It's mostly sighs and good jokes.", "{n} invented a legend about the last planet. Now the whole crew half-believes it.", "{n} read bedtime stories over the intercom. The engineer fell asleep in a vent.", "{n} turned the last Trade Station haggle into an epic poem.", "{n} wrote a play. Rehearsals start tomorrow. Attendance is mandatory again.", "{n} told a ghost story so good the lights flickered on cue.", "{n} turned the ship's maintenance log into an adventure novel.", "{n} interviewed every crew member for a podcast nobody will hear.", "{n} made up a story about the stars in the window. Now everyone sees a dragon.", "{n} told a joke so long the punchline arrived next session.", "{n} sang the ballad of the space cows. Everyone joined the chorus.", "{n} wrote a poem about the coffee machine. It was touching.", "{n} acted out every role in the last Distress Run. Standing ovation."]],
    };
    const CREW_FIRST = ['Ines', 'Tomo', 'Ruth', 'Oskar', 'Mira', 'Juno', 'Sol', 'Kit', 'Ada', 'Bram', 'Lio', 'Noor', 'Pim', 'Vera', 'Dex', 'Haru', 'Zia', 'Otto', 'Wen', 'Esme', 'Rafi', 'Yuki', 'Bo', 'Cass', "Arlo", "Bea", "Coral", "Dario", "Edda", "Finn", "Greta", "Hugo", "Ilse", "Jasper", "Kiri", "Lumi", "Mateo", "Nell", "Orin", "Priya", "Quill", "Rosa", "Sami", "Teo", "Uma", "Vik", "Wren", "Ximena", "Alma", "Bastian", "Cleo", "Dov", "Elio", "Freya", "Gus", "Hana", "Ivo", "Jun", "Kaya", "Leif", "Mina", "Nico", "Opal", "Pax"];
    const CREW_LAST = ['Varga', 'Okafor', 'Lindqvist', 'Moreau', 'Tanaka', 'Reyes', 'Kowalski', 'Achebe', 'Haddad', 'Novak', 'Sato', 'Brandt', 'Quinn', 'Ferro', 'Ishii', 'Dunmore', "Abara", "Bergström", "Castell", "Dahl", "Eze", "Fontaine", "Grieve", "Hollis", "Iwata", "Jovanovic", "Kahale", "Lacroix", "Mbeki", "Nakamura", "Oyelaran", "Petrov", "Quintero", "Rask", "Silva", "Thorne", "Ulloa", "Voss", "Whitlow", "Yilmaz", "Zamora", "Aaltonen", "Bianchi", "Calloway"];
    const TRAITS = ['hums while working', 'is afraid of comets', 'collects rocks from every world', 'never takes off their jacket', 'talks to the ship', 'keeps a plant named Gerald', 'can\'t sleep without the engine noise', 'writes letters nobody will read', 'laughs at their own jokes first', 'has a different hat every day', 'is very good at cards', 'claims to have been born on a comet', "sings in the shower, badly", "keeps a lucky sock", "is learning the harmonica", "always knows what time it is back home", "names every plant on board", "collects bottle caps from every station", "can sleep anywhere, including standing up", "is terrified of the toaster", "draws comics about the crew", "drinks eleven cups of tea a day", "never loses at rock-paper-scissors", "talks in their sleep about cheese", "folds tiny paper cranes", "claims to have met a space whale", "keeps a diary in a code nobody can read", "is secretly a very good dancer", "salutes the coffee machine every morning", "has seen every space western ever made", "hums the seven-note song without knowing why", "is allergic to stardust (mildly)", "carries a spoon at all times, just in case", "knows the names of four hundred stars", "can't whistle and is very upset about it", "brought their grandmother's teapot aboard", "keeps a jar of sand from every beach", "can't tell left from right in zero gravity", "whistles when nervous", "writes poems on napkins", "is on a first-name basis with the ship's computer", "knits during emergencies", "reads the manual for fun", "has a lucky pebble from their home world", "loses at cards on purpose to be nice", "has a pet rock called Captain", "wakes up at exactly 6 every day, alarm or not", "collects postcards from every Travelers' Post", "is learning to juggle, badly", "eats dessert first, always"];
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
    const crewN = role => S.crew.reduce((a, c) => a + (c.role === role ? (c.vet ? 2 : 1) : 0), 0); // veterans count twice
    function shipActivity(reps) { // what the crew got up to this session, with their small bonuses
      if (!S.crew.length) return;
      shuffleCrewRooms();
      const pk = a => a[Math.floor(Math.random() * a.length)];
      let res = crewN('Engineer') * 8 + crewN('Pilot') * 5, xp = crewN('Cook') * 6 + crewN('Pilot') * 4 + crewN('Storyteller') * 3, kn = crewN('Scientist') * 6 + crewN('Storyteller') * 4;
      if (res) addDust(res); award(xp, kn);
      const who = S.crew.slice().sort(() => Math.random() - .5).slice(0, S.crew.length > 2 ? 2 : 1);
      who.forEach(c => { const t = pk(ROLES[c.role][2]).replace('{n}', c.name.split(' ')[0]); reps.push({ ev: { battle: true, ic: ROLES[c.role][0], title: 'Ship activity', t } }); pushEv({ ic: ROLES[c.role][0], title: 'Ship activity: ' + c.name, t, at: Date.now() }); });
    }
    function buyStyle(kind, v) { if (focusLock()) return; const cost = E.shipStyleCost.color, list = S.ship.colors;
      if (!list.includes(v)) { if (S.dust < cost) return; S.dust -= cost; list.push(v); shopXP(10); }
      S.ship.color = v; save(); draw(); }
    const modCost = k => Math.round(E.moduleCost.base * Math.pow(E.moduleCost.growth, lvl(k) - 1) * (1 - .05 * roomLv('workshop')) * stDisc());
    const facCost = lv => Math.round(E.facilityCost.base * Math.pow(E.facilityCost.growth, lv - 2) * (hasT('eco3') ? .85 : 1) * stDisc()); // lv = the level you're upgrading to
    const FAC_MAX = Math.max(1, Math.round(E.facilityCost.maxLevel));
    const INCOME = E.incomeMultiplier; // every stardust payout is multiplied by this (apps/solarist-economy.json)
    function addDust(n) { n = Math.max(0, Math.round(n * INCOME)); S.dust += n; S.dustTotal += n; return n; }
    // Captain Level (XP: everything that moves the game forward) and Knowledge Level (what you learn). 1-100, a new title every 10.
    const LV_MAX = 100, lvNeed = L => Math.round(E.levels.base + E.levels.perLevel * L + E.levels.perLevelSquared * L * L); // XP from level L to L+1: gentle at first, steep later
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
      ["🧒", "The Runaway Shuttle", "A shuttle full of school kids on a field trip lost its autopilot and is heading out of the system.", ["Picked up the shuttle's beacon. It was playing a kids' song on loop.", "Caught up with the shuttle and matched its speed. The kids waved.", "Talked the teacher through a manual override, one switch at a time.", "Brought the shuttle home. The kids want to be pilots now."], "The school's parents' committee sent a thank-you fund (and a lot of drawings)."],
      ["🐄", "The Space Ranch Stampede", "A ranch ship's cargo hold popped open. Two hundred space cows are drifting into the void.", ["Answered the rancher's very panicked call.", "Rounded up the first cows with the ship's tractor beam. They mooed in protest.", "Herded the stragglers back with gentle engine bursts.", "Every cow back on board. The rancher cried a little."], "The rancher paid you, plus a year's supply of cheese."],
      ["🎪", "The Stalled Circus", "A circus ship's engines died between shows. The acrobats are bored and the elephants (robotic) are restless.", ["Followed the circus music to the stalled ship.", "Found the engine problem: a juggling pin jammed in the intake.", "Jump-started the engines with a cable and a lot of hope.", "The circus made its next show with ten minutes to spare. You got front-row seats."], "The ringmaster paid you out of the ticket sales."],
      ["❄", "The Frozen Outpost", "A research outpost on an ice moon lost its heating. The scientists are wearing everything they own.", ["Plotted a course through a hailstorm of ice pebbles.", "Landed on the ice next to the outpost. Even the door was frozen.", "Hooked the outpost up to the ship's reactor for warmth.", "Fixed the heater for good. The scientists made hot cocoa for everyone."], "The research fund wired a thank-you grant."],
      ["🎵", "The Silent Radio Tower", "A radio tower that guides ships through a nebula went silent. Three freighters are lost inside.", ["Flew to the edge of the nebula and listened. Nothing.", "Found the tower: its dish had been knocked crooked by a meteor.", "Bent it back into place by hand, in a spacesuit, very carefully.", "The tower spoke again. One by one, the freighters found their way out."], "The freight union paid a navigation-safety bounty."],
      ["🌱", "The Wilting Greenhouse Ship", "A seed-vault ship's life support is failing. The last seeds of a dozen worlds are at risk.", ["Raced to the seed vault, which was drifting with its lights flickering.", "Docked and found the air pumps clogged with pollen.", "Cleaned the pumps one by one while the gardeners cheered you on.", "The greenhouse is breathing again. Every seed is safe."], "The seed vault's keepers paid you, and gave you a packet of very rare beans."],
      ["🚀", "The Overconfident Racer", "A Comet League racer tried a shortcut through a planet's rings and got stuck. Their ego is bruised.", ["Picked up the racer's mayday. They insisted it was 'not a mayday'.", "Found their ship wedged between two ice chunks.", "Carefully nudged the ice apart with the ship's hull.", "Towed the racer out. They promised to never do that again (they will)."], "The Comet Racing League paid your recovery fee."],
      ["🏮", "The Lantern Festival Mishap", "A floating lantern festival over a gas giant lost its anchor. Hundreds of lantern-boats are sinking into the clouds.", ["Dove into the upper clouds following the glow.", "Found the festival boats linked together in a long chain.", "Hooked the chain to the ship and climbed out of the clouds, slowly.", "The festival continued, a little higher up. The lanterns were beautiful."], "The festival committee paid you, and named a lantern after the ship."],
      ["🦖", "The Escaped Zoo Exhibit", "A zoo ship's prize creature, a very large and very friendly lizard, escaped into a nearby moon's caves.", ["Took the zoo keeper's frantic call and set course.", "Landed at the cave mouth. Something huge snored inside.", "Coaxed the lizard out with forty pounds of fruit.", "Loaded the lizard back aboard. It licked the Captain on the way in."], "The zoo paid a reward, and named a baby lizard after the ship."],
      ["🎓", "The Lost Graduation Ship", "A ship of students heading to their graduation got lost in a dust storm. The ceremony starts in six hours.", ["Tracked their signal through the storm static.", "Found the ship spinning slowly, lights blinking SOS.", "Calibrated their compass with yours, one heading at a time.", "Delivered every student to the ceremony, robes and all. They threw their hats at the ship."], "The school paid you, and gave the crew honorary degrees."],
      ["🍰", "The Wedding Cake Emergency", "A wedding barge's cake freezer broke. The ceremony is tomorrow. The cake is seven tiers tall.", ["Raced to the barge before the frosting could melt.", "Cooled the freezer room with the ship's coolant lines.", "Fixed the freezer's compressor with a hairpin and a prayer.", "The wedding went perfectly. The crew got the second-biggest slices."], "The happy couple paid you, and you're in the wedding photos."],
      ["🌑", "The Eclipsed Colony", "A colony's sun is blocked by a passing moon for a week. Their solar power is failing.", ["Answered the colony's dim, flickering call.", "Arrived to a town lit only by candles.", "Strung the ship's spare batteries across the town square.", "Kept the lights on until the moon moved on. The colony threw a party at sunrise."], "The colony council paid from their emergency fund."],
      ["🐝", "The Bee Freighter", "A freighter carrying ten million pollinator bees cracked its hive container. The pilot is surrounded.", ["Got a very buzzy distress call. Mostly buzzing.", "Docked carefully and suited up. The bees were everywhere.", "Played calm music over the intercom until the bees settled.", "Sealed the hive and saved every bee. The pilot is fine, if a bit puffy."], "The farming co-op paid you in coins and a lifetime of honey."],
      ["📡", "The Stuck Satellite Crew", "A repair crew got locked outside their satellite when the door jammed. Their air is running low.", ["Picked up three very calm, very worried voices.", "Pulled alongside the satellite and found the door frozen shut.", "Heated the hinges with the ship's thrusters, very gently.", "The door swung open and the crew tumbled inside. Air for everyone."], "The satellite company paid a hefty rescue fee."],
    ];
    const ROMAN = n => ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n - 1] || String(n);
    const drAvail = () => !S.dr && (S.drSat || (S.drDay !== today() && S.fcDay === today() && S.cycle % S.set.every === 0)) && mode === 'focus' && !running && !(left > 0 && left < length(mode));
    function drAccept() {
      if (!drAvail()) return;
      const sc = Math.floor(Math.random() * DISTRESS.length);
      S.dr = { sc, n: 0, need: S.set.every, at: Date.now() }; S.drDay = today(); S.drSat = false;
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
      ["🌋", "The Ember Caves", "A Guild survey picked up warm air coming out of a cave system on a lava world. Something down there is breathing.", [["The cave mouth is too hot to touch. The air shimmers.", ["Wait for night", "The rock cooled enough to walk on by midnight."], ["Go in now, with cooling suits", "Sweaty, but fast. A glint caught your eye near the entrance."]], ["A river of slow lava cuts the tunnel in half.", ["Find a bridge of cooled rock", "There was one, thin but solid."], ["Jump it with thrusters", "A clean jump, and a souvenir stuck to your boot on the other side."]], ["The tunnel opens into a chamber full of glowing crystals.", ["Photograph and move on", "Hundreds of photos. The Guild will love them."], ["Take a sample", "You chipped off a crystal. It's still warm."]], ["At the bottom, something huge breathes slowly in the dark: a vent, pulsing like a heartbeat.", ["Measure it from a distance", "The readings will keep scientists busy for years."], ["Go closer", "Close enough to see the rock was carved. Someone was here first."]]], "You climb out at sunrise, sooty and grinning. The Ember Caves are on the map, and the vent's heartbeat is on tape."],
      ["🌌", "The Silent Nebula", "A nebula where every radio goes quiet. Ships avoid it. The Guild wants to know why.", [["Inside the nebula, every channel is static.", ["Fly by instruments", "Slow, careful, and nobody got lost."], ["Fly by sight", "The glowing clouds showed you a shortcut, and something drifting in it."]], ["A wreck floats ahead, very old, completely dark.", ["Scan it and leave it be", "The scan says it's been here two hundred years."], ["Board it", "Empty corridors, and one sealed locker."]], ["The static changes. It almost sounds like music.", ["Record it", "Forty minutes of eerie, beautiful noise."], ["Follow the sound", "It led you to a quiet pocket in the clouds, and something shiny."]], ["At the center: a tiny, perfect star, humming to itself.", ["Watch from a distance", "The crew watched it for an hour. Nobody spoke."], ["Fly closer", "Close enough to see the hum was coming from a crystal orbiting it."]]], "You leave the nebula with a recording nobody can explain. The Guild calls it 'the lullaby'. The Silent Nebula is charted."],
      ["🐚", "The Shell Beaches", "A planet with beaches made entirely of giant seashells. Some of them are bigger than houses.", [["The first beach crunches loudly underfoot.", ["Walk along the shore", "Easy going. The waves were warm."], ["Climb the biggest shell", "From the top, you spotted something half-buried down the coast."]], ["A tide comes in fast, much faster than it should.", ["Head for high ground", "Safe and dry. You watched the sea rise and fall in minutes."], ["Wade through it", "Soaked to the knees, and the water carried something to your feet."]], ["A shell the size of a cathedral, with a door-sized opening.", ["Peek inside", "Pink and glowing inside, like the inside of a sunset."], ["Go all the way in", "At the very back, something was tucked away, like a pearl."]], ["Something in the water is singing. Low, slow, enormous.", ["Listen from the beach", "The song went on until the stars came out."], ["Swim out", "A huge, gentle eye watched you from beneath the waves, then blinked."]]], "You leave with sand in everything and a recording of the song. The Shell Beaches are on the map, with a note: 'be nice to whatever lives here'."],
      ["🏚", "The Ghost Colony", "A colony that went quiet fifty years ago. Its lights still turn on at night.", [["The landing pad is cracked, but the lights blink a welcome.", ["Land carefully", "A soft landing, and the lights blinked twice, like they were pleased."], ["Land on the main street", "Bumpy, but you spotted something in a shop window on the way down."]], ["The streets are empty. Tables are still set for dinner.", ["Leave everything as it is", "You walked through quietly, like visitors in a museum."], ["Check the houses", "Most were empty. One had a little box on the windowsill."]], ["The town hall has a working computer.", ["Read the last entries", "Everyone left on purpose, for somewhere better. No mystery, just moving day."], ["Download everything", "A huge archive, and a hidden folder of photos."]], ["The town's lights are run by an old robot, still doing its rounds.", ["Thank it and leave", "It beeped happily and kept working."], ["Ask it to come with you", "It politely declined, then gave you a gift from its storage hatch."]]], "The Ghost Colony isn't a ghost story after all. Just a town that moved on, and a robot that stayed to keep the lights on. It's on the map now."],
      ["🌲", "The Whispering Forest", "On a jungle world, explorers keep reporting that the forest talks back. The Guild wants proof, or a good explanation.", [["The trees are taller than towers, and the air hums.", ["Stick to the river", "The river was a safe path in."], ["Cut straight through", "Slow going, but the forest opened up around something shiny."]], ["The whispering starts. Soft, everywhere, almost like words.", ["Record it", "Hours of recordings. Some of it sounds like your names."], ["Answer back", "You said hello. The forest went quiet, then the leaves rustled in a pattern."]], ["A clearing full of glowing flowers that turn to face you.", ["Walk around it", "You circled the clearing. The flowers followed you politely."], ["Walk through it", "Petals clung to your boots, and something was waiting in the middle."]], ["At the heart of the forest, one ancient tree holds the others' roots together.", ["Take measurements", "The tree is older than the Guild by a long way."], ["Touch the bark", "It was warm. It hummed. You felt very welcome."]]], "The whispers were the trees talking to each other through their roots, and maybe, a little, to you. The Whispering Forest is on the map."],
      ["🏰", "The Floating Castle", "A structure is drifting in the upper clouds of a gas giant. It looks, impossibly, like a castle.", [["The clouds around the castle are thick and stormy.", ["Fly above the storm", "A long way round, but smooth."], ["Fly through it", "Bumpy ride, but the lightning lit up a shortcut and a glint of metal."]], ["The castle's gate is open, and a bridge hangs over the clouds.", ["Walk the bridge carefully", "It swayed, but it held."], ["Use jetpacks", "You flew past the bridge and spotted a window full of treasure."]], ["Inside: halls of carved stone, floating in midair.", ["Map every hall", "The castle is bigger inside than outside. Somehow."], ["Search the throne room", "The throne was empty. The crown on it was not."]], ["The top of the tower holds a huge engine, still keeping the castle afloat.", ["Leave it running", "You left the castle floating, as it has for centuries."], ["Study it closely", "You copied its design. The Guild engineers will be very excited."]]], "Nobody knows who built it, but now everyone knows where it is. The Floating Castle has your ship's name carved on its gate, in very small letters."],
      ["🧊", "The Ice Library", "Under the ice of a frozen moon, someone stored books in frozen blocks. Thousands of them.", [["The moon's surface is a sheet of white ice with no landmarks.", ["Follow the old beacon", "The beacon led you straight to the entrance."], ["Drill straight down", "You hit a pocket of air, and something frozen in the wall."]], ["A long tunnel of ice, lit blue from above.", ["Walk slowly", "Your footsteps echoed for minutes."], ["Slide down", "Fast and fun, and you landed next to a forgotten crate."]], ["Rooms of books, each one sealed in a clear block of ice.", ["Photograph the covers", "Thousands of titles, all safely recorded."], ["Thaw one block", "Inside: a book of maps, and a pressed flower between the pages."]], ["The last room has a single desk with a note frozen on it.", ["Read it through the ice", "It says: 'For whoever is curious enough to come this far.'"], ["Take the note home", "You thawed it carefully. On the back is a map of another library."]]], "The Ice Library is real, and it's very cold, and it's full of stories. It's on the map now, with a note to bring warm socks."],
      ["⚙", "The Clockwork Moon", "A small moon that ticks. Literally. Scanners pick up a regular, mechanical heartbeat.", [["The surface is covered in huge, slowly turning gears.", ["Land between them", "A careful landing in a gap between giant teeth."], ["Ride a gear", "You rode a gear around the moon and saw something in a crevice."]], ["A hatch in the ground opens every 7 minutes, for 7 seconds.", ["Time it perfectly", "In and through, on the dot."], ["Jam it open", "It stayed open, and something rolled out to greet you."]], ["Inside, a maze of shafts and pendulums.", ["Follow the biggest pendulum", "It led you down, slow and steady."], ["Climb the gears", "Hard climbing, but from the top you spotted a hidden room."]], ["At the center: a giant clock face with no hands.", ["Leave it be", "You let it keep its own time."], ["Wind it up", "It chimed seven times. Somewhere far above, the gears sped up a little."]]], "The Clockwork Moon is still ticking, and now it's on the map. Nobody knows what it's counting down to. Hopefully something nice."],
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
    const CLUES = ['A bartender on {p} remembers {b} and a ship with no running lights.', 'Scratched into a rock on {p}: "{g} were here".', 'A trader on {p} sold {b} fuel and got paid in fake coins.', 'Someone on {p} heard {b} laughing on an open channel.', 'Burn marks on {p} match the engines of {b}\'s ship.', 'A wanted poster on {p} has been drawn on. Someone gave {b} a mustache.', 'Settlers on {p} saw {g} heading for the edge of the map.', 'A dropped glove on {p} has {b}\'s initials stitched inside.', "A mechanic on {p} fixed {b}'s engine and never got paid.", "A kid on {p} swears {b} gave them candy. Suspicious.", "Fresh boot prints on {p} lead to an empty hideout. The tea is still warm.", "A radio operator on {p} recorded {b} singing badly on an open channel.", "{g}'s flag was found buried on {p}, along with a half-eaten sandwich.", "A pawnshop on {p} bought a stolen clock from {b}. The clock is still ticking.", "Locals on {p} say {b} left in a hurry, heading for the next system.", "A fuel receipt on {p} is signed with {b}'s name. Very careless.", "A café owner on {p} says {b} never tips.", "Someone on {p} saw {g}'s ship parked behind a moon.", "A tattoo artist on {p} remembers inking {g}'s logo.", "A map left on {p} has a circle drawn around a hiding spot. Empty, but recently used.", "{b}'s autograph is on the wall of a bar on {p}. Of course it is.", "A kid on {p} traded {b} a slingshot for a stolen watch.", "Old engine oil on {p} matches the leak from {b}'s ship.", "A shopkeeper on {p} says {b} bought forty cans of beans. They're planning a long trip."];
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
    const CARGO = ['seed stock', 'medical crates', 'a grand piano', 'a three-tier wedding cake', 'spare reactor parts', 'fresh water', 'ten thousand rubber ducks', 'library books', 'a very patient cat', 'mail from home', 'solar panels', 'festival fireworks', 'a time capsule', 'telescope mirrors', 'a crate of hot sauce', 'the Guild\'s lost paperwork', "a crate of birthday candles", "a prize-winning pumpkin", "the world's largest rubber band ball", "a hundred potted cacti", "a sealed love letter", "a box of lost socks", "a whole orchestra's instruments", "a museum's dinosaur skeleton", "a very old grandfather clock", "a pallet of fortune cookies", "a crate of glow-in-the-dark paint", "an antique telescope", "a box of baby chicks", "replacement windows for a lighthouse", "a set of bowling pins", "a whole wedding dress", "a sack of mail from a lost ship", "a giant cheese wheel", "a crate of grandma's jam", "a robot that only speaks in rhymes"];
    const CLIENT = ['The Halvorsen family', 'A retired pilot', 'The Guild survey office', 'A traveling circus', 'A quiet monastery', 'A brand-new colony', 'A botanist', 'A very famous poet', 'An old couple', 'A school on a moon', 'A mysterious stranger', 'The Comet Racing League', "A lonely lighthouse keeper", "The Moonbase Bakers' Union", "A grumpy retired admiral", "A pair of newlyweds", "The Interstellar Postal Service", "A traveling theater troupe", "A collector of strange things", "A small-town mayor", "The Guild history department", "An eight-year-old with savings", "A worried grandmother", "The Lighthouse Keepers' Club", "A tiny bakery", "A brand-new parent", "The Annual Comet Fair", "A shy inventor", "A retired outlaw (reformed)", "The Station Choir"];
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
        const mult = Math.min(45, Math.pow(1 / Math.max(chance, 1 / 400), .9)); // pays about the same per trip it takes, a bit less for the very hard ones
        return { reqs, chance, pay: Math.round(E.quests.delivery * mult), cargo: pk1(CARGO), client: pk1(CLIENT) };
      }
      return { reqs: [{ k: 'hab', v: 40 }, { k: 'moons', v: 1 }], chance: .2, pay: Math.round(E.quests.delivery * 2.4), cargo: pk1(CARGO), client: pk1(CLIENT) };
    }
    function dlCheck() { // three offers a day
      if (!S.dl) S.dl = { day: '', offers: [], active: null, done: 0 };
      if (S.dl.day !== today()) { S.dl.day = today(); S.dl.offers = Array.from({ length: 3 }, makeDelivery); }
    }
    const dlScore = p => { const d = S.dl.active; if (!d || !p) return 0; const c = d.reqs.reduce((a, r) => a + dClose(p, r), 0) / d.reqs.length; return d.reqs.every(r => dMet(p, r)) ? 1 : c; };
    const viaJump = p => !!p && S.jumped === p.num && S.at === p.num; // dropped off at a world you teleported to: pays less, so a node network can't farm deliveries
    const dlPayAt = p => { const sc = dlScore(p), base = sc >= 1 ? S.dl.active.pay : Math.max(Math.round(S.dl.active.pay * .1), Math.round(S.dl.active.pay * sc * sc * .8)); return Math.round(base * (viaJump(p) ? E.quests.deliveryViaJump : 1)); };
    function dlAccept(i) { if (focusLock() || S.dl.active) return; const d = S.dl.offers.splice(i, 1)[0]; if (!d) return; d.from = S.at; d.at = Date.now(); S.dl.active = d;
      pushEv({ c: 'quest', ic: '📦', title: 'Delivery accepted: ' + dName(d), t: d.client + ' wants ' + d.cargo + ' taken to a world with: ' + d.reqs.map(r => DREQ[r.k][1](r.v)).join(', ') + '.', at: Date.now() }); save(); draw(); }
    function dlAbandon() { const d = S.dl.active; if (!d) return; pushEv({ c: 'quest', ic: '📦', title: 'Delivery abandoned: ' + dName(d), t: 'The ' + d.cargo + ' went back to the depot.', at: Date.now() }); S.dl.active = null; save(); draw(); }
    function dlDeliver(p, auto) {
      const d = S.dl.active; if (!d || !p || p.num === d.from) return null;
      const sc = dlScore(p), full = sc >= 1, pay = addDust(dlPayAt(p));
      award(full ? 60 : 25, full ? 30 : 10); S.dl.done++; S.dl.active = null;
      if (full) { S.cnt.dlPerfect = (S.cnt.dlPerfect || 0) + 1; (S.cnt.cargo = S.cnt.cargo || {})[d.cargo] = (S.cnt.cargo[d.cargo] || 0) + 1; } else if (sc < .5) S.cnt.dlClose = (S.cnt.dlClose || 0) + 1;
      let extra = ''; if (full && d.chance < .05) { const it = rareFind(p, 'gift'), nw = gainItem(it, p); if (nw) award(0, 12); extra = ' They threw in a tip: ' + it.name + ' (' + it.rar + (nw ? ', new!' : '') + ').'; }
      const t = (full ? 'Delivered ' + d.cargo + ' to ' + nm(p) + '. ' + d.client + ' is delighted.' : 'Dropped ' + d.cargo + ' off early at ' + nm(p) + ' (' + Math.round(sc * 100) + '% of what they asked for). ' + d.client + ' paid, grumbling.') + extra;
      pushEv({ c: 'quest', ic: '📦', title: (full ? 'Delivered: ' : 'Delivered early: ') + dName(d), t, got: '+' + pay + ' ✦', at: Date.now() });
      if (auto) qNotes.push('📦 ' + t + ' +' + pay + ' ✦'); else hint.textContent = '📦 ' + t + ' +' + pay + ' ✦';
      save(); if (!auto) draw(); return pay;
    }
    function dlArrive(p) { if (S.dl && S.dl.active && p && p.num !== S.dl.active.from && dlScore(p) >= 1) dlDeliver(p, true); } // a perfect match delivers by itself
    dlCheck();
    // ---------- Interplanetary Station: a rare giant station in orbit. It stays until you travel on. ----------
    const STATION_NAMES = ['Halcyon Ring', 'Port Lantern', 'Crossroads Station', 'The Big Wheel', 'Haven Nine', 'Orrery Station', 'Waypoint Grand', 'Brightwater Hub', 'Saint Elmo Station', 'The Long Table', "Orbital Nine", "The Copper Wheel", "Junction Bright", "Saint Vela Station", "The Hearthring", "Wayfarer's Rest", "Outpost Sundial", "The Lantern Spindle", "Kettle Station", "The Long Rest", "Meridian Point", "Brightwater Ring", "Starlight Junction", "The Old Spindle"];
    const STATION_PA = ['The PA system is playing the seven-note song again.', 'A sign by the docks says "Lost and found: one rubber duck. Also 9,999 more."', 'The food court smells like noodles and engine grease.', 'Somebody is selling souvenir mugs that say "I survived the Big Wheel".', 'Kids are racing tiny drones along the ring.', 'An announcer reminds everyone that the observation deck closes at "whenever".', "A busker by the airlock is playing a song about a space whale.", "The station's cat is asleep on the info desk. Nobody dares move it.", "The noodle stand has a line all the way around the ring.", "A notice says the Big Wheel will spin \"a little faster on Tuesdays\".", "Someone is giving free tours of the reactor. Hard hats provided.", "A dozen ships are queued at the docks. Pilots are trading snacks through the windows.", "The PA announces a lost child. Then a found child. Everyone claps.", "A street magician is making stardust disappear. Mostly into his pocket.", "The station orchestra is rehearsing in the atrium. Loudly.", "There's a farmers' market in the hydroponic dome. The tomatoes are huge.", "The station's clocks are all set to a different planet's time. Nobody is ever on time.", "A choir is singing in the docking bay. The acoustics are amazing.", "There's a queue for the zero-g swimming pool. It's mostly floating water.", "A sign says \"Please do not feed the maintenance robots\". Someone has.", "The arcade on deck three is hosting a tournament. Very loud.", "A tiny robot is selling flowers by the airlock.", "The station's mascot, a person in a big foam planet suit, waves at every ship.", "The observation deck is full of people watching a comet go by."];
    const stationAt = p => !!(S.station && p && S.station.num === p.num);
    const stHere = () => stationAt(atP());
    const stDisc = () => stHere() ? 1 - E.station.discount : 1, stSell = () => stHere() ? 1 + E.station.sellBonus : 1;
    function stationArrive(p, reps) {
      S.station = { num: p.num, name: pk1(STATION_NAMES), at: Date.now(), bought: {}, chips: false, stock: [], souv: [] };
      for (let k = 0; k < 3; k++) { const it = rareFind(p, 'trade'); S.station.stock.push({ id: it.id, price: Math.round(TPRICE(it.rar) * .9) }); }
      stationExtras(S.station);
      S.cnt.stations = (S.cnt.stations || 0) + 1;
      const t = 'An Interplanetary Station, ' + S.station.name + ', is parked in orbit around ' + nm(p) + '. While you stay, upgrades are cheaper and everything sells for more. ' + pk1(STATION_PA);
      reps.unshift({ ev: { battle: true, ic: '🛰', title: 'Interplanetary Station: ' + S.station.name, t } });
      pushEv({ c: 'ev', ic: '🛰', title: 'Interplanetary Station: ' + S.station.name, t, at: Date.now() });
    }
    function stationCheck() { // it stays until you leave its world
      if (S.station && S.at !== S.station.num) { pushEv({ c: 'ev', ic: '🛰', title: S.station.name + ' is behind you', t: 'You left the station\'s world. It will move on before you could ever come back.', at: Date.now() }); S.station = null; if (rightTab === 'station') rightTab = 'up'; }
    }
    function stBuy(key, cost, fn) { if (!stHere() || S.dust < cost || (running && mode === 'focus')) return; S.dust -= cost; S.station.bought[key] = (S.station.bought[key] || 0) + 1; S.cnt.stBuys = (S.cnt.stBuys || 0) + 1; fn(); shopXP(10); save(); draw(); }
    function stLoanChips() { if (!stHere() || S.station.chips) return; S.station.chips = true; S.chips.temp = 5; S.cnt.loaned = (S.cnt.loaned || 0) + 1;
      hint.textContent = '🎛 5 loaner Coordinator chips! Place them on the Coordinator tab. They go back after your next finished Explore trip.'; save(); draw(); }
    function chipsReturn() { // loaner chips go back after a finished trip: take placed chips off the fullest fields until it fits again
      if (!S.chips.temp) return; S.chips.temp = 0;
      while (chipsPut() > S.chips.own) { const k = Object.keys(S.chips.put).sort((a, b) => S.chips.put[b] - S.chips.put[a])[0]; if (!k) break; S.chips.put[k]--; if (!S.chips.put[k]) delete S.chips.put[k]; }
      qNotes.push('🎛 The station\'s loaner chips went back.');
    }

    const SHIFTS = ['You fixed the food court\'s noodle robot. It now says "thank you".', 'You helped dock a freighter with a sticky airlock.', 'You ran the souvenir stand for an afternoon and sold forty snow globes.', 'You guided a tour group along the ring walk. Nobody got lost (for long).', 'You repainted the lane markings in docking bay six.', 'You taught station kids how to read a star chart.', 'You stood in for the night-shift traffic controller. Only one near-miss.', 'You helped the station choir carry a piano. Up four decks.', "You spent the shift sorting lost luggage. One bag contained 40 rubber ducks.", "You helped the station chef with the lunch rush. Two hundred bowls of noodles.", "You fixed the zero-gravity fountain. It now sprays in a perfect sphere.", "You worked the information desk. Most common question: \"where's the bathroom?\"", "You re-tuned the docking beacons so they stop playing jazz.", "You helped a lost tourist find their ship. It was the ship they were standing in.", "You cleaned the observation windows. All 300 of them.", "You fed the station's hydroponic fish. They seem happier now.", "You fixed the souvenir printer. It was printing everything upside down.", "You stood in for the station mascot. The costume was very warm.", "You helped calibrate the artificial gravity. Everyone is a little lighter now.", "You taught a cooking class in the food court. Mostly about not setting things on fire.", "You ran the night market's lost and found. Someone lost a whole spaceship. You found it.", "You helped a family move into the habitat ring. They had four cats and a piano.", "You walked the ring with the security robot. It told you all its favorite stars.", "You helped paint a mural of the station's founders. Your handprint is in the corner.", "You helped the station's gardener repot two hundred tiny trees.", "You worked the ticket booth at the station cinema. The movie was about you. Sort of.", "You guided a lost cargo drone back to its dock. It beeped a thank-you.", "You helped run a bake sale for the station school. The cookies sold out in an hour.", "You fixed the escalator to the observation deck. Everyone cheered.", "You tested the new zero-g swimming pool. It's mostly water floating in blobs.", "You helped the station librarian shelve books in the right order (alphabetical, by color).", "You played the bad guy in the station's community theater. Great reviews."];
    const shifting = () => S.mission === -6 && stHere() && !S.dr;
    function stationExtras(st) { // station-only goods: souvenirs, a veteran for hire, a rare color and design
      st.souv = []; const pickR = () => { const r = Math.random(); return r < .5 ? 'Common' : r < .8 ? 'Uncommon' : r < .95 ? 'Rare' : 'Legendary'; };
      for (let k = 0, tries = 0; k < 3 && tries < 30; tries++) { const r = pickR(), L = catList('stn', r); if (!L.length) continue; const id = itemId('stn', r, Math.floor(Math.random() * L.length)); if (st.souv.some(o => o.id === id)) continue; st.souv.push({ id, price: Math.round(TPRICE(r) * 1.2) }); k++; }
      const role = pk1(Object.keys(ROLES)); st.vet = { name: pk1(CREW_FIRST) + ' ' + pk1(CREW_LAST), role, trait: pk1(TRAITS), vet: true };
      st.color = pk1(STATION_ONLY.colors.filter(c => !S.ship.colors.includes(c)).concat(['Steel'])); const pool = decStation().sort(() => Math.random() - .5); st.decor = pool.slice(0, 3);
    }
    function stShift(reps) {
      const pay = addDust(E.station.shift), t = pk1(SHIFTS); award(40, 10); S.cnt.shifts = (S.cnt.shifts || 0) + 1;
      reps.unshift({ ev: { battle: true, ic: '🛠', title: 'Station shift at ' + S.station.name, t, got: '+' + pay + ' ✦' } });
      pushEv({ c: 'ev', ic: '🛠', title: 'Station shift: ' + S.station.name, t, got: '+' + pay + ' ✦', at: Date.now() });
      return '🛠 Shift done: +' + pay + ' ✦. The station is still here.';
    }
    const DONATE = { Common: 4, Uncommon: 10, Rare: 25, Legendary: 60 };
    function stDonate(id) { if (!stHere() || !S.items[id] || S.items[id].n < 2) return; const r = parseId(id).r, k = DONATE[r] || 4; S.items[id].n--; S.kp += k; S.cnt.donated = (S.cnt.donated || 0) + 1; award(5, 0);
      pushEv({ c: 'ev', ic: '🏛', title: 'Donated to the station museum', t: itemName(id) + ' is on display at ' + S.station.name + ' now. The curator gave you ' + k + ' Knowledge points.', at: Date.now() }); save(); draw(); }
    function stHire() { const st = S.station, c = st && st.vet, cost = E.station.veteran; if (!c || S.crew.length >= bunks() || S.dust < cost) return; S.dust -= cost; S.crew.push(Object.assign({ joined: Date.now() }, c)); st.vet = null; S.cnt.vets = (S.cnt.vets || 0) + 1;
      pushEv({ ic: '★', title: c.name + ' (veteran) joined the crew', t: 'A ' + c.role.toLowerCase() + ' with decades of flying behind them. Their bonus counts twice.', at: Date.now() }); shopXP(20); save(); draw(); }
    function stationView() {
      const st = S.station, here = byNum(st.num), out = [], lock = running && mode === 'focus', b = k => st.bought[k] || 0;
      const row = (name, what, key, cost, fn, ok, limit) => el('div', { class: 'sx-up' }, el('b', {}, name), el('small', {}, what), (limit && b(key) >= limit) ? el('span', { class: 'sx-done' }, 'Bought') : el('button', { type: 'button', class: 'btn sx-buy', disabled: lock || S.dust < cost || !ok || null, onclick: () => stBuy(key, cost, fn) }, '✦ ' + cost.toLocaleString()));
      out.push(el('div', { class: 'sx-queue on sx-trader' }, el('small', {}, 'Interplanetary Station'), el('b', {}, '🛰 ' + st.name), el('span', { class: 'sl-muted' }, 'In orbit around ' + (here ? nm(here.p) : 'this world') + '. It stays until you travel on.')));
      out.push(el('p', { class: 'sl-muted' }, 'While you are here: ship and facility upgrades cost ' + Math.round(E.station.discount * 100) + '% less, and worlds and spares sell for ' + Math.round(E.station.sellBonus * 100) + '% more. You can\'t build a post or a Hyperdrive Node at a world with a station.'));
      out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Loaner chips'), el('div', { class: 'sx-up' }, el('b', {}, '🎛 5 free Coordinator chips'), el('small', {}, st.chips ? (S.chips.temp ? 'On loan now. They go back after your next finished Explore trip.' : 'Already used here.') : 'Borrow 5 extra chips for one trip. Place them on the Coordinator tab.'),
        st.chips ? el('span', { class: 'sx-done' }, S.chips.temp ? 'On loan' : 'Used') : el('button', { type: 'button', class: 'btn sx-buy', disabled: lock || null, onclick: stLoanChips }, 'Borrow'))));
      out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Services'),
        row('🧭 Coordinator Charge', S.coord ? 'Already charged.' : 'Charge the Coordinator now, no study session needed.', 'charge', E.station.charge, () => { S.coord = true; hint.textContent = '🧭 Charged. Your next Explore counts every chip double.'; }, !S.coord, 1),
        row('🛰 Distress satellite', S.dr ? 'A run is already going.' : S.drSat ? 'Ready: a distress call is waiting on the left.' : 'Patch into the distress network: another Distress Run is available right away (it still takes its study sessions).', 'sat', E.station.satellite, () => { S.drSat = true; hint.textContent = '🛰 A distress call is waiting. Start it from the left.'; }, !S.dr && !S.drSat, 1),
        row('📦 Station courier job', !S.dl ? '' : 'One more Interstellar Delivery offer today, and it pays 30% better.', 'job', E.station.contract, () => { const d = makeDelivery(); d.pay = Math.round(d.pay * 1.3); d.client = 'The ' + st.name; S.dl.offers.push(d); hint.textContent = '📦 New delivery offer on the left: ' + dName(d) + '.'; }, true, 2),
        row('🔎 Most Wanted intel', !S.mw ? 'No Most Wanted to look for yet.' : S.mw.clues >= S.mw.need ? 'You already know where they are.' : 'A station informant sells you one clue about ' + S.mw.name + '.', 'intel', E.station.intel, () => mwClue(atP(), 1), !!S.mw && S.mw.clues < S.mw.need, 2),
        row('🎛 Coordinator chip', S.chips.own >= E.coordChips.max ? 'You have every chip there is.' : 'A permanent chip, ' + Math.round(E.station.chipDiscount * 100) + '% off the usual price.', 'chip', Math.round(chipCost() * (1 - E.station.chipDiscount)), () => { S.chips.own++; S.cnt.chipsBought = (S.cnt.chipsBought || 0) + 1; }, S.chips.own < E.coordChips.max, 3)));
      out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Station shift'), el('div', { class: 'sx-up' }, el('b', {}, '🛠 Work a shift'), el('small', {}, 'Spend a study session working on the station: ✦ ' + Math.round(E.station.shift * INCOME) + ', some XP and Knowledge. Pick the Shift mission.'),
        shifting() ? el('span', { class: 'sx-done' }, 'Next session') : el('button', { type: 'button', class: 'btn sx-buy', disabled: lock || !!S.dr || null, onclick: () => setMission('shift') }, 'Pick'))));
      if (!st.souv) stationExtras(st);
      const owns = k => S.ship.colors.includes(k), cosm = [];
      if (st.color && !owns(st.color)) cosm.push(row('🎨 ' + st.color + ' hull', 'A hull color only stations sell.', 'color', E.station.steel, () => { S.ship.colors.push(st.color); S.ship.color = st.color; }, true, 1));
      if (!st.decor) st.decor = decStation().sort(() => Math.random() - .5).slice(0, 3);
      st.decor.forEach(([c, id]) => { const it = decItem(c, id), k = decKey(c, id); if (S.decor.own[k]) return; cosm.push(row('🛋 ' + it[1], DEC_ALL[c][0] + ' decoration you can only buy at stations. Use it on the Ship page.', 'dec-' + k, decTier(5) , () => { S.decor.own[k] = Date.now(); S.cnt.decor = (S.cnt.decor || 0) + 1; pushEv({ ic: '🛋', title: 'New decoration: ' + it[1], t: 'A station-only find. It works in every room (Ship page).', at: Date.now() }); }, true, 1)); });
      const vet = st.vet;
      out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Station exclusives'), el('p', { class: 'sl-muted' }, 'Things you can only get here.'), ...cosm,
        vet ? el('div', { class: 'sx-up' }, el('b', {}, '★ ' + ROLES[vet.role][0] + ' ' + vet.name), el('small', {}, 'Veteran ' + vet.role.toLowerCase() + ', says they ' + vet.trait + '. ' + ROLES[vet.role][1] + ', counted twice.' + (S.crew.length >= bunks() ? ' (No free bunk.)' : '')),
          el('button', { type: 'button', class: 'btn sx-buy', disabled: lock || S.dust < E.station.veteran || S.crew.length >= bunks() || null, onclick: stHire }, '✦ ' + E.station.veteran.toLocaleString())) : el('p', { class: 'sl-muted' }, 'The veteran signed on with you.'),
        ...st.souv.map((o, i) => el('div', { class: 'sx-up' }, el('b', {}, '🎁 ' + itemName(o.id)), el('small', {}, el('i', { class: 'sx-r-' + parseId(o.id).r.toLowerCase() }, parseId(o.id).r), ' souvenir'),
          el('button', { type: 'button', class: 'btn sx-buy', disabled: lock || S.dust < o.price || null, onclick: () => stBuy('souv', o.price, () => { const nw = !S.items[o.id]; S.items[o.id] = S.items[o.id] || { n: 0, at: Date.now() }; S.items[o.id].n++; if (nw) award(0, 12); st.souv.splice(i, 1); }) }, '✦ ' + o.price.toLocaleString())))));
      out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Rare goods'), st.stock.length ? null : el('p', { class: 'sl-muted' }, 'Sold out.'),
        ...st.stock.map((o, i) => el('div', { class: 'sx-up' }, el('b', {}, itemName(o.id)), el('small', {}, el('i', { class: 'sx-r-' + parseId(o.id).r.toLowerCase() }, parseId(o.id).r)),
          el('button', { type: 'button', class: 'btn sx-buy', disabled: lock || S.dust < o.price || null, onclick: () => stBuy('item', o.price, () => { const nw = !S.items[o.id] || itemName(o.id) === '???'; S.items[o.id] = S.items[o.id] || { n: 0, at: Date.now() }; S.items[o.id].n++; if (nw) award(0, 12); st.stock.splice(i, 1); }) }, '✦ ' + o.price.toLocaleString())))));
      const spares = Object.keys(S.items).filter(k => S.items[k].n > 1 && itemName(k) !== '???').sort((a, b) => ITEM_RARS.indexOf(parseId(b).r) - ITEM_RARS.indexOf(parseId(a).r));
      out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Station museum'), spares.length ? el('p', { class: 'sl-muted' }, 'Donate a duplicate and the curator pays you in Knowledge points. You always keep at least one.') : el('p', { class: 'sl-muted' }, 'No duplicates to donate.'),
        ...spares.slice(0, 8).map(id => el('div', { class: 'sx-up' }, el('b', {}, itemName(id) + ' ×' + S.items[id].n), el('small', {}, parseId(id).r), el('button', { type: 'button', class: 'btn sx-buy', disabled: lock || null, onclick: () => stDonate(id) }, '+' + (DONATE[parseId(id).r] || 4) + ' Knowledge')))));
      out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Sell spares'), spares.length ? el('p', { class: 'sl-muted' }, 'Duplicates only, for ' + Math.round(E.station.sellBonus * 100) + '% more than a Trade Station.') : el('p', { class: 'sl-muted' }, 'No duplicates to sell.'),
        ...spares.slice(0, 12).map(id => el('div', { class: 'sx-up' }, el('b', {}, itemName(id) + ' ×' + S.items[id].n), el('small', {}, parseId(id).r), el('button', { type: 'button', class: 'btn sx-buy', disabled: lock || null, onclick: () => { const v = spareP(id); S.items[id].n--; S.dust += v; S.dustTotal += v; S.sold = S.sold || {}; save(); draw(); } }, '+✦ ' + spareP(id))))));
      return out;
    }
    // ---------- Rating: one number that only goes up as you play ----------
    const RATING = [ // [group, what, points each, how many]
      ['Study', 'Study sessions', 10, () => S.total], ['Study', 'Minutes studied', 1, () => S.minutes], ['Study', 'Full Cycles', 20, () => S.cnt.fc],
      ['Exploration', 'Common worlds', 5, () => S.cnt.rar.Common || 0], ['Exploration', 'Uncommon worlds', 12, () => S.cnt.rar.Uncommon || 0], ['Exploration', 'Rare worlds', 30, () => S.cnt.rar.Rare || 0], ['Exploration', 'Legendary worlds', 80, () => S.cnt.rar.Legendary || 0],
      ['Exploration', 'Surveys', 10, () => S.surveys || 0], ['Exploration', 'Deep-space events', 5, () => S.cnt.ev], ['Exploration', 'Arrival encounters', 10, () => S.cnt.enc],
      ['Adventure', 'Outlaw gangs beaten', 25, () => S.fights || 0], ['Adventure', 'Bounties', 30, () => S.bDone || 0], ['Adventure', 'Distress Runs', 120, () => S.drN || 0], ['Adventure', 'Expedition legs', 20, () => S.cnt.expSteps || 0],
      ['Adventure', 'Expeditions', 200, () => S.expDone || 0], ['Adventure', 'Guild contracts', 250, () => S.cnt.wk || 0], ['Adventure', 'Most Wanted caught', 300, () => S.mwDone || 0], ['Adventure', 'Deliveries', 40, () => (S.dl && S.dl.done) || 0], ['Adventure', 'Meridian logs', 15, () => S.camp.n],
      ['Building', 'Listening Posts', 40, () => posts().length], ['Building', 'Travelers\' Posts', 80, () => posts().filter(f => f.p.post.tp).length], ['Building', 'Hyperdrive Nodes', 30, () => nodes().length], ['Exploration', 'Interplanetary Stations found', 100, () => S.cnt.stations || 0], ['Adventure', 'Station shifts', 15, () => S.cnt.shifts || 0], ['Exploration', 'Museum donations', 5, () => S.cnt.donated || 0], ['Building', 'Facility slots bought', 20, () => S.cnt.slots || 0], ['Building', 'Facility levels', 15, () => posts().reduce((a, f) => a + (f.p.post.tp ? f.p.post.tp.fac.reduce((b, x) => b + (x.lv || 1), 0) : 0), 0)],
      ['Building', 'Decorations owned', 12, () => decOwned()], ['Building', 'Ship room levels', 30, () => Object.keys(ROOMS).reduce((a, k) => a + roomLv(k), 0)], ['Building', 'Ship module upgrades', 8, () => Object.keys(MODS).reduce((a, k) => a + lvl(k) - 1, 0)], ['Building', 'Crew aboard', 25, () => S.crew.length], ['Building', 'Coordinator chips', 30, () => S.chips.own],
      ['Knowledge', 'Research done', 50, () => Object.keys(S.tech).length], ['Knowledge', 'Common collectibles', 3, () => itemsOf('Common')], ['Knowledge', 'Uncommon collectibles', 6, () => itemsOf('Uncommon')], ['Knowledge', 'Rare collectibles', 15, () => itemsOf('Rare')],
      ['Knowledge', 'Legendary collectibles', 40, () => itemsOf('Legendary')], ['Knowledge', 'Medals', 20, () => Object.keys(S.ach).length],
    ];
    const itemsOf = r => Object.keys(S.items).filter(k => parseId(k).r === r && itemName(k) !== '???').length;
    const rating = () => RATING.reduce((a, [, , per, f]) => { try { return a + per * (f() || 0); } catch (e) { return a; } }, 0);
    const RANKS = ['Stowaway', 'Deckhand', 'Drifter', 'Wayfarer', 'Surveyor', 'Pathfinder', 'Voyager', 'Star Captain', 'Trailblazer', 'Living Legend', 'Myth of the Void'].map((n, i) => [i ? Math.max(1, Math.round(E.ratingRanks[i] || 0)) : 0, n]); // Rating needed for each rank (economy.json ratingRanks)
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
    // Trade Stations: sometimes one is docked at the world you reach. It sells collectibles, swaps them for ones it wants,
    // and buys your spares. It leaves when you travel on.
    const TRADERS = ['The Wandering Bazaar', 'Kessa Freeport', 'The Rusty Ledger', 'Station Halfway', 'The Collector\'s Barge', 'Moonlight Exchange', 'The Last Stop Market', 'Brother Ilo\'s Curio Shop', 'The Orbit Swap', 'Dockside Antiques', "The Lucky Magpie", "Grandma Tova's Odds and Ends", "Sector Seven Swap Meet", "The Floating Pawnshop", "Copperhead Trading Co.", "The Velvet Hold", "Old Man Ruskin's Barge", "The Midnight Bazaar", "The Tin Lantern", "Odessa's Odds", "The Crossroads Cart", "Galactic Flea Market", "The Patchwork Barge", "Mother Kessa's Pantry"];
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
    const spareP = id => Math.round(TPRICE(parseId(id).r) * E.tradeStation.sellRatio * INCOME * (1 + .05 * roomLv('hold')) * (hasT('eco4') ? 1.25 : 1) * stSell());
    function traderSell(id) { const it = S.items[id]; if (!it || it.n < 2) return; const v = spareP(id); loseItem(id); S.dust += v; S.dustTotal += v; S.cnt.spares = (S.cnt.spares || 0) + 1; save(); draw(); }
    // everything that happens at the end of a study session, shown together under the timer
    function sessionEnd(reps, p, ev) {
      const notes = [];
      S.cnt.sess = (S.cnt.sess || 0) + 1; { const pg = Math.min(20, 1 + Math.floor(S.cnt.sess / E.diaryEvery)); for (let n = 1; n <= pg; n++) if (!S.slog['d' + n]) { S.slog['d' + n] = Date.now(); notes.push('🗄 Found a page of the old logbook: ' + SHIP_LOGS['d' + n][0] + ' (Transmissions, Archive).'); } }
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
      if (shifting() && mode === 'focus') return !running ? (left > 0 && left < length(mode) ? 'Holding position' : 'Ready for a shift at ' + S.station.name) : 'Working a shift at ' + S.station.name;
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
    const MISSIONS = [['explore', '🚀', 'Explore', 'Find a new world'], ['discover', '🔍', 'Discover', 'Survey the world you\'re at for collectibles'], ['build', '🗼', 'Build', 'Build a Listening Post, upgrade one to a Travelers\' Post, or add a facility'], ['charge', '🧭', 'Charge', 'Charge the Interplanetary Coordinator: your chips count double on the next Explore, and it steers toward better worlds'], ['campaign', '📼', 'Campaign', 'Follow the Meridian\'s trail to their next log'], ['expedition', '🗺', 'Expedition', 'Take the next leg of your expedition'], ['hunt', '🎯', 'Hunt', 'Track down the Most Wanted (two sessions)'], ['shift', '🛠', 'Shift', 'Work a shift at the Interplanetary Station']];
    const curMission = () => S.mission > 0 ? 'build' : S.mission === -1 ? 'charge' : S.mission === -2 ? 'discover' : S.mission === -3 ? 'campaign' : S.mission === -4 ? 'expedition' : S.mission === -5 ? 'hunt' : S.mission === -6 ? 'shift' : 'explore';
    function setMission(m, num) {
      if (running && mode === 'focus') return;
      if (m === 'explore') S.mission = 0;
      else if (m === 'charge') { if (S.coord) return; S.mission = -1; }
      else if (m === 'discover') { const a = atP(); if (!a || held(a)) return; S.mission = -2; }
      else if (m === 'campaign') { if (campDone()) return; S.mission = -3; }
      else if (m === 'expedition') { if (!S.exp) return; S.mission = -4; }
      else if (m === 'hunt') { if (!mwReady()) return; S.mission = -5; }
      else if (m === 'shift') { if (!stHere()) return; S.mission = -6; }
      else { if (building()) { S.mission = 1; } else { const o = buildOptions(), first = (o.Facilities[0] || o.Upgrades[0] || o['New Listening Posts'][0]); if (!first) return; S.mission = 1; S.job = { k: first.k, num: first.num, fac: first.fac }; } }
      save(); hint.textContent = ''; draw();
    }
    const MIS_ORDER = ['explore', 'discover', 'charge', 'build', 'campaign', 'expedition', 'hunt', 'shift'];
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
    const pvBar = el('div', { class: 'sx-pvbar', hidden: true, role: 'region', 'aria-label': 'Planetarium' });
    let pv = null; // Planetarium: { list: [found entries], i }
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
    // ---------- Ship interior: a 2D side-view cutaway on the Ship page, rooms you decorate, crew who stay put ----------
    const ROOM_SPOTS = ['bridge', 'quarters', 'galley', 'lab', 'workshop', 'deck', 'hold', 'medbay'];
    const DECKS = [['quarters', 'galley', 'lab', 'bridge'], ['hold', 'workshop', 'medbay', 'deck']]; // top deck, bottom deck; the nose is on the right
    const ROLE_C = { Engineer: '#e8c170', Cook: '#ebede9', Scientist: '#a4dddb', Pilot: '#4f8fba', Scout: '#a8ca58', Trader: '#d0da91', Medic: '#cf573c', Storyteller: '#df84a5' };
    const ROOM_NAME = k => k === 'bridge' ? ['🧭', 'Bridge', 'Where the ship is flown from'] : ROOMS[k];
    const roomAt = k => k === 'bridge' ? 1 : roomLv(k);
    // decorations: [id, name, price tier (0 free), station only, ...look]. Buy once, use in every room. 15 regular + 5 station-only per category
    const DECOR = {
      wall: ['Wall', [['panels', 'Steel panels', 0, 0, 'seams', '#394a50', '#253a5e'], ['navy', 'Navy plating', 1, 0, 'rivets', '#253a5e', '#3c5e8b'], ['wood', 'Walnut paneling', 2, 0, 'planks', '#7a4841', '#4d2b32'], ['birch', 'Birch paneling', 2, 0, 'planks', '#d7b594', '#c09473'],
        ['brick', 'Red brick', 2, 0, 'brick', '#884b2b', '#602c2c'], ['wbrick', 'White brick', 2, 0, 'brick', '#c7cfcc', '#a8b5b2'], ['stripe', 'Pink stripes', 1, 0, 'stripe', '#c65197', '#a23e8c'], ['mstripe', 'Mint stripes', 1, 0, 'stripe', '#a8ca58', '#75a743'],
        ['dots', 'Polka dots', 1, 0, 'dots', '#4f8fba', '#73bed3'], ['stars', 'Starry wallpaper', 3, 0, 'stars', '#172038', '#e8c170'], ['checker', 'Checker tiles', 2, 0, 'checker', '#c7cfcc', '#a8b5b2'], ['mint', 'Green diamonds', 3, 0, 'diamond', '#75a743', '#a8ca58'],
        ['waves', 'Ocean waves', 3, 0, 'waves', '#3c5e8b', '#4f8fba'], ['hex', 'Hex plating', 2, 0, 'hex', '#577277', '#819796'], ['plaid', 'Cabin plaid', 3, 0, 'plaid', '#a53030', '#752438'],
        ['chrome', 'Station chrome', 5, 1, 'sheen', '#819796', '#c7cfcc'], ['circuit', 'Circuit board', 5, 1, 'circuit', '#19332d', '#a8ca58'], ['marble', 'Marble', 5, 1, 'veins', '#ebede9', '#a8b5b2'], ['nebula', 'Nebula bubbles', 5, 1, 'bubbles', '#402751', '#a23e8c'], ['goldleaf', 'Gold leaf', 5, 1, 'diamond', '#de9e41', '#e8c170']]],
      floor: ['Floor', [['grate', 'Steel grate', 0, 0, 'grate', '#577277', '#394a50'], ['planks', 'Oak planks', 1, 0, 'planks', '#be772b', '#884b2b'], ['dark', 'Dark planks', 1, 0, 'planks', '#7a4841', '#4d2b32'], ['chess', 'Checkerboard', 2, 0, 'chess', '#ebede9', '#241527'],
        ['red', 'Red carpet', 2, 0, 'edge', '#a53030', '#cf573c'], ['blue', 'Blue carpet', 2, 0, 'edge', '#3c5e8b', '#4f8fba'], ['purple', 'Purple carpet', 2, 0, 'edge', '#7a367b', '#a23e8c'], ['grass', 'Grass mat', 3, 0, 'tufts', '#75a743', '#a8ca58'],
        ['tiles', 'White tiles', 1, 0, 'tiles', '#c7cfcc', '#a8b5b2'], ['terra', 'Terracotta', 2, 0, 'tiles', '#cf573c', '#884b2b'], ['herring', 'Herringbone', 3, 0, 'herring', '#c09473', '#ad7757'], ['mosaic', 'Blue mosaic', 3, 0, 'dots', '#73bed3', '#3c5e8b'],
        ['rubber', 'Rubber mat', 1, 0, 'dots', '#394a50', '#202e37'], ['sand', 'Beach sand', 3, 0, 'dots', '#d7b594', '#e7d5b3'], ['ice', 'Ice tiles', 3, 0, 'tiles', '#a4dddb', '#ebede9'],
        ['gold', 'Gold tiles', 5, 1, 'tiles', '#de9e41', '#e8c170'], ['grid', 'Neon grid', 5, 1, 'grid', '#10141f', '#df84a5'], ['fmarble', 'Marble floor', 5, 1, 'veins', '#ebede9', '#a8b5b2'], ['fstars', 'Glass over stars', 5, 1, 'stars', '#090a14', '#ebede9'], ['moss', 'Living moss', 5, 1, 'tufts', '#25562e', '#468232']]],
      light: ['Light', [['bulb', 'Bare bulb', 0, 0, 'bulb', '#e8c170'], ['pblue', 'Blue pendant', 1, 0, 'pendant', '#e8c170', '#4f8fba'], ['pred', 'Red pendant', 1, 0, 'pendant', '#e8c170', '#a53030'], ['strip', 'Strip light', 1, 0, 'strip', '#ebede9'],
        ['lantern', 'Paper lantern', 2, 0, 'lantern', '#de9e41', '#cf573c'], ['plantern', 'Pink lantern', 2, 0, 'lantern', '#df84a5', '#c65197'], ['fairy', 'Fairy lights', 3, 0, 'fairy', '#e8c170'], ['neon', 'Pink neon ring', 3, 0, 'neon', '#df84a5'],
        ['neonb', 'Blue neon ring', 3, 0, 'neon', '#73bed3'], ['orb', 'Ice orb', 2, 0, 'orb', '#a4dddb', '#ebede9'], ['sun', 'Sun orb', 2, 0, 'orb', '#e8c170', '#ebede9'], ['cage', 'Cage lamp', 2, 0, 'cage', '#e8c170', '#577277'],
        ['spots', 'Spotlights', 3, 0, 'spots', '#ebede9', '#394a50'], ['chand', 'Chandelier', 4, 0, 'chand', '#e8c170', '#de9e41'], ['candles', 'Candle ring', 4, 0, 'candles', '#de9e41', '#7a4841'],
        ['disco', 'Disco ball', 5, 1, 'disco', '#ebede9'], ['jelly', 'Jellyfish lamp', 5, 1, 'jelly', '#df84a5', '#c65197'], ['star', 'Star lamp', 5, 1, 'star', '#e8c170'], ['moon', 'Crescent moon', 5, 1, 'moon', '#a4dddb'], ['plasma', 'Plasma globe', 5, 1, 'plasma', '#df84a5', '#a23e8c']]],
      plant: ['Plant', [['none', 'No plant', 0, 0, 'none'], ['cactus', 'Little cactus', 1, 0, 'cactus', '#75a743', '#df84a5'], ['fern', 'Potted fern', 1, 0, 'fern', '#75a743', '#a8ca58'], ['sunflower', 'Sunflower', 2, 0, 'sunflower', '#e8c170', '#7a4841'],
        ['ivy', 'Hanging ivy', 2, 0, 'ivy', '#75a743', '#a8ca58'], ['bonsai', 'Bonsai', 3, 0, 'bonsai', '#75a743', '#a8ca58'], ['palm', 'Tall palm', 3, 0, 'palm', '#75a743', '#884b2b'], ['tulips', 'Red tulips', 2, 0, 'tulips', '#cf573c', '#75a743'],
        ['ytulips', 'Yellow tulips', 2, 0, 'tulips', '#e8c170', '#75a743'], ['succ', 'Succulents', 1, 0, 'succ', '#a8ca58', '#73bed3'], ['snake', 'Snake plant', 2, 0, 'snake', '#468232', '#d0da91'], ['monstera', 'Monstera', 3, 0, 'monstera', '#468232', '#75a743'],
        ['bamboo', 'Lucky bamboo', 2, 0, 'bamboo', '#a8ca58', '#75a743'], ['rose', 'Rose bush', 3, 0, 'rose', '#a53030', '#468232'], ['herbs', 'Herb box', 1, 0, 'herbs', '#75a743', '#a8ca58'],
        ['shroom', 'Glow mushrooms', 5, 1, 'shroom', '#73bed3', '#a4dddb'], ['crystal', 'Crystal sprout', 5, 1, 'crystal', '#a4dddb', '#df84a5'], ['tentacle', 'Alien tendril', 5, 1, 'tentacle', '#a23e8c', '#df84a5'], ['trap', 'Space flytrap', 5, 1, 'trap', '#75a743', '#cf573c'], ['lily', 'Star lily', 5, 1, 'lily', '#ebede9', '#e8c170']]],
      art: ['Wall art', [['none', 'Bare wall', 0, 0, 'none'], ['chart', 'Star chart', 1, 0, 'chart', '#e8c170', '#253a5e'], ['photo', 'Crew photo', 1, 0, 'photo', '#ebede9', '#73bed3'], ['cat', 'Cat poster', 2, 0, 'cat', '#df84a5', '#241527'],
        ['clock', 'Wall clock', 2, 0, 'clock', '#c7cfcc', '#ebede9'], ['planet', 'Planet painting', 3, 0, 'planet', '#be772b', '#cf573c'], ['pennant', 'Pennant', 1, 0, 'pennant', '#cf573c', '#c7cfcc'], ['mirror', 'Round mirror', 2, 0, 'mirror', '#de9e41', '#a4dddb'],
        ['land', 'Landscape', 3, 0, 'land', '#7a4841', '#75a743'], ['abstract', 'Abstract art', 3, 0, 'abstract', '#ebede9', '#cf573c'], ['map', 'Old map', 2, 0, 'map', '#d7b594', '#884b2b'], ['cert', 'Pilot license', 1, 0, 'cert', '#ebede9', '#de9e41'],
        ['guitar', 'Wall guitar', 3, 0, 'guitar', '#be772b', '#4d2b32'], ['dart', 'Dartboard', 2, 0, 'dart', '#241527', '#cf573c'], ['kid', 'Kid\'s drawing', 1, 0, 'kid', '#ebede9', '#4f8fba'],
        ['open', 'Neon "OPEN" sign', 5, 1, 'open', '#df84a5', '#241527'], ['heart', 'Neon heart', 5, 1, 'heart', '#cf573c', '#241527'], ['gold', 'Gold record', 5, 1, 'goldrec', '#e8c170', '#241527'], ['wanted', 'Wanted poster', 5, 1, 'wanted', '#d7b594', '#4d2b32'], ['tickets', 'Ticket stub wall', 5, 1, 'tickets', '#e8c170', '#df84a5']]],
      ceil: ['Ceiling', [['none', 'Plain ceiling', 0, 0, 'none'], ['vent', 'Air vents', 1, 0, 'vent', '#819796'], ['pipes', 'Steel pipes', 1, 0, 'pipes', '#819796'], ['copper', 'Copper pipes', 2, 0, 'pipes', '#be772b'], ['ac', 'Air conditioners', 2, 0, 'ac', '#c7cfcc'],
        ['fan', 'Ceiling fans', 3, 0, 'fan', '#c7cfcc'], ['cables', 'Cable trays', 2, 0, 'cables', '#394a50'], ['sprink', 'Sprinklers', 1, 0, 'sprink', '#cf573c'], ['duct', 'Big duct', 2, 0, 'duct', '#577277'], ['chains', 'Hanging chains', 2, 0, 'chains', '#819796'],
        ['bunting', 'Party bunting', 2, 0, 'bunting', '#cf573c'], ['hangp', 'Hanging plants', 3, 0, 'hangp', '#75a743'], ['wires', 'Messy wires', 1, 0, 'wires', '#241527'], ['mobile', 'Planet mobile', 3, 0, 'mobile', '#e8c170'], ['beams', 'Wooden beams', 2, 0, 'beams', '#7a4841'],
        ['tubes', 'Neon tubes', 5, 1, 'tubes', '#df84a5'], ['proj', 'Star projector', 5, 1, 'proj', '#ebede9'], ['ticker', 'News ticker', 5, 1, 'ticker', '#a8ca58'], ['gtrim', 'Gold trim', 5, 1, 'gtrim', '#e8c170'], ['bubbles', 'Bubble machine', 5, 1, 'bubbles', '#a4dddb']]],
      lights: ['Hull lights', [['none', 'No hull lights', 0, 0, 'none'], ['white', 'White', 1, 0, 'steady', '#ebede9'], ['amber', 'Amber', 1, 0, 'steady', '#e8c170'], ['red', 'Red', 1, 0, 'steady', '#cf573c'], ['green', 'Green', 1, 0, 'steady', '#a8ca58'],
        ['blue', 'Blue', 1, 0, 'steady', '#73bed3'], ['pink', 'Pink', 1, 0, 'steady', '#df84a5'], ['purple', 'Purple', 1, 0, 'steady', '#a23e8c'], ['nav', 'Red and green', 2, 0, 'alt', '#cf573c', '#a8ca58'], ['twinkle', 'Twinkling white', 2, 0, 'twinkle', '#ebede9'],
        ['pulse', 'Pulsing blue', 2, 0, 'pulse', '#73bed3'], ['gold', 'Gold', 3, 0, 'steady', '#de9e41'], ['ice', 'Ice', 3, 0, 'twinkle', '#a4dddb'], ['xmas', 'Holiday', 3, 0, 'chase', '#cf573c', '#a8ca58', '#e8c170'], ['chase', 'Rainbow chase', 4, 0, 'chase', '#cf573c', '#e8c170', '#a8ca58', '#73bed3', '#df84a5'],
        ['police', 'Patrol strobes', 5, 1, 'strobe', '#cf573c', '#4f8fba'], ['sweep', 'Lightning sweep', 5, 1, 'sweep', '#ebede9'], ['comet', 'Comet trail', 5, 1, 'comet', '#e8c170'], ['neon', 'Neon pink chase', 5, 1, 'chase', '#df84a5', '#a23e8c'], ['beacon', 'Station beacons', 5, 1, 'pulse', '#e8c170']]],
      furn: ['Furniture', [['none', 'Nothing extra', 0, 0, 'none'], ['chair', 'Armchair', 1, 0, 'chair', '#a23e8c', '#c65197'], ['beanbag', 'Beanbag', 1, 0, 'beanbag', '#4f8fba', '#73bed3'], ['books', 'Bookshelf', 2, 0, 'books', '#4d2b32'],
        ['records', 'Record player', 2, 0, 'records', '#7a4841', '#cf573c'], ['lava', 'Lava lamp', 2, 0, 'lava', '#a23e8c', '#de9e41'], ['tank', 'Fish tank', 3, 0, 'tank', '#4f8fba', '#de9e41'], ['sofa', 'Little sofa', 2, 0, 'sofa', '#468232', '#75a743'],
        ['globe', 'Globe', 2, 0, 'globe', '#4f8fba', '#75a743'], ['tv', 'Old TV', 2, 0, 'tv', '#7a4841', '#73bed3'], ['coffee', 'Coffee machine', 3, 0, 'coffee', '#394a50', '#cf573c'], ['easel', 'Easel', 2, 0, 'easel', '#be772b', '#df84a5'],
        ['punch', 'Punching bag', 2, 0, 'punch', '#a53030', '#394a50'], ['piano', 'Upright piano', 4, 0, 'piano', '#241527', '#ebede9'], ['arcade', 'Arcade cabinet', 4, 0, 'arcade', '#3c5e8b', '#df84a5'],
        ['catbed', 'Station cat (with bed)', 5, 1, 'catbed', '#a53030', '#e8c170'], ['robodog', 'Robot dog', 5, 1, 'robodog', '#c7cfcc', '#73bed3'], ['jukebox', 'Jukebox', 5, 1, 'jukebox', '#a53030', '#e8c170'], ['gumball', 'Gumball machine', 5, 1, 'gumball', '#cf573c', '#ebede9'], ['holo', 'Hologram projector', 5, 1, 'holo', '#394a50', '#73bed3']]],
      window: ['Window', [['none', 'No window', 0, 0, 'none'], ['port', 'Porthole', 1, 0, 'port', '#819796', 'stars'], ['brass', 'Brass porthole', 2, 0, 'port', '#de9e41', 'stars'], ['ports', 'Twin portholes', 2, 0, 'ports', '#819796', 'stars'],
        ['wide', 'Wide window', 3, 0, 'wide', '#819796', 'planet'], ['dawn', 'Sunrise window', 3, 0, 'wide', '#819796', 'dawn'], ['tall', 'Tall window', 2, 0, 'tall', '#819796', 'stars'], ['arch', 'Arched window', 3, 0, 'arch', '#c7cfcc', 'stars'],
        ['hexw', 'Hex window', 2, 0, 'hexw', '#577277', 'stars'], ['triple', 'Triple portholes', 3, 0, 'triple', '#819796', 'stars'], ['diamond', 'Diamond window', 2, 0, 'diam', '#c7cfcc', 'stars'], ['big', 'Big porthole', 3, 0, 'big', '#819796', 'planet'],
        ['slit', 'Slit window', 1, 0, 'slit', '#577277', 'stars'], ['cred', 'Porthole, red curtains', 2, 0, 'curt', '#a53030', 'stars'], ['cblue', 'Porthole, blue curtains', 2, 0, 'curt', '#3c5e8b', 'stars'],
        ['neb', 'Nebula view', 5, 1, 'wide', '#c7cfcc', 'nebula'], ['rings', 'Ringed planet view', 5, 1, 'wide', '#e8c170', 'rings'], ['comet', 'Comet porthole', 5, 1, 'big', '#e8c170', 'comet'], ['stview', 'Station lights view', 5, 1, 'wide', '#819796', 'station'], ['galaxy', 'Galaxy porthole', 5, 1, 'big', '#de9e41', 'galaxy']]],
    };
    const SHIP_DECOR = {}; // (ceiling and hull lights used to be ship-wide; they're per room now)
    const DEC_ALL = Object.assign({}, DECOR, SHIP_DECOR);
    // your own art: art/decor/decor.json lists PNGs that replace a built-in decoration ("replace") or add new ones ("custom")
    const DEC_IMG = {}; // 'cat:id' -> { img, frames, fps }
    fetch('art/decor/decor.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(j => {
      if (!j) return;
      const load = (key, file, o) => { const img = new Image(); img.onload = () => { DEC_IMG[key] = { img, frames: Math.max(1, o.frames | 0 || 1), fps: +o.fps || 4 }; }; img.onerror = () => console.warn('Solarist: could not load decoration art', file); img.src = 'art/decor/' + file; };
      Object.entries(j.replace || {}).forEach(([k, o]) => { const [cat, id] = k.split('/'); if (!DEC_ALL[cat] || !DEC_ALL[cat][1].some(x => x[0] === id)) return console.warn('Solarist: no decoration called', k); load(cat + ':' + id, (o && o.file) || k + '.png', o || {}); });
      (j.custom || []).forEach(o => { if (!o || !DEC_ALL[o.cat] || !o.id || DEC_ALL[o.cat][1].some(x => x[0] === o.id)) return console.warn('Solarist: skipped custom decoration', o && o.id);
        DEC_ALL[o.cat][1].push([o.id, o.name || o.id, Math.max(1, Math.min(5, o.tier | 0 || 1)), o.station ? 1 : 0, 'img', o.cat === 'light' || o.cat === 'lights' ? (o.glow || '#e8c170') : undefined]); load(o.cat + ':' + o.id, o.file || o.cat + '/' + o.id + '.png', o); });
      if (typeof drawShip === 'function' && !shipPane.hidden) drawShip();
    }).catch(() => { });
    const decTier = t => [0, E.decorCost.t1, E.decorCost.t2, E.decorCost.t3, E.decorCost.t4, E.decorCost.station][t] || 0;
    const decItem = (cat, id) => DEC_ALL[cat][1].find(x => x[0] === id) || DEC_ALL[cat][1][0];
    const decKey = (cat, id) => cat + ':' + id;
    if (!S.decor) S.decor = { own: {}, room: {}, ship: {} };
    const decOwn = (cat, id) => { const it = decItem(cat, id); return !it[2] || !!S.decor.own[decKey(cat, it[0])]; };
    const decOf = (k, cat) => (S.decor.room[k] && S.decor.room[k][cat]) || DECOR[cat][1][0][0];
    if (S.decor.ship && (S.decor.ship.ceil || S.decor.ship.lights)) { ROOM_SPOTS.forEach(r => { S.decor.room[r] = S.decor.room[r] || {}; ['ceil', 'lights'].forEach(c => { if (S.decor.ship[c] && !S.decor.room[r][c]) S.decor.room[r][c] = S.decor.ship[c]; }); }); S.decor.ship = {}; }
    const decOwned = () => Object.keys(S.decor.own).length;
    const decTotal = () => Object.values(DEC_ALL).reduce((a, [, L]) => a + L.filter(x => x[2]).length, 0);
    const decStOwned = () => Object.entries(DEC_ALL).reduce((a, [c, [, L]]) => a + L.filter(x => x[3] && S.decor.own[decKey(c, x[0])]).length, 0);
    const decStation = () => { const out = []; Object.entries(DEC_ALL).forEach(([c, [, L]]) => L.forEach(x => { if (x[3] && !S.decor.own[decKey(c, x[0])]) out.push([c, x[0]]); })); return out; };
    const decFull = k => Object.keys(DECOR).every(c => decOf(k, c) !== DECOR[c][1][0][0]);
    // one-time move off ship designs: designs you bought are refunded, hull colors stay as the ship's paint
    if (S.ship.designs && !S.ship.desRefund) { const paid = S.ship.designs.filter(d => d !== 'Scout').reduce((a, d) => a + (d === 'Ring Runner' ? E.station.design : E.shipStyleCost.design), 0);
      S.ship.desRefund = true; if (paid) { S.dust += paid; pushEv({ ic: '🛠', title: 'Ship designs retired', t: 'The ship is decorated room by room now. The designs you bought were refunded: +' + paid + ' ✦.', at: Date.now() }); } }
    function decBuy(cat, id, cost, roomK) { // buy (if needed) and use
      const ship = !!SHIP_DECOR[cat], k = decKey(cat, id), it = decItem(cat, id);
      if (focusLock() && cost == null) return;
      if (it[2] && !S.decor.own[k]) { const c = cost != null ? cost : decTier(it[2]); if (S.dust < c || (it[3] && cost == null)) return; S.dust -= c; S.decor.own[k] = Date.now(); S.cnt.decor = (S.cnt.decor || 0) + 1; shopXP(8);
        pushEv({ ic: '🛋', title: 'New decoration: ' + it[1], t: 'Bought for ' + c.toLocaleString() + ' ✦. It works in every room (Ship page).', at: Date.now() }); }
      if (roomK !== false) { if (ship) S.decor.ship[cat] = id; else { const r = roomK || inSel; S.decor.room[r] = S.decor.room[r] || {}; S.decor.room[r][cat] = id; } }
      save(); draw();
    }
    // crew stay in one room per session; the rooms shuffle after every session
    function shuffleCrewRooms() { const built = ROOM_SPOTS.filter(k => roomAt(k)); S.crewRoom = {}; S.crew.forEach(c => { S.crewRoom[c.name] = built[Math.floor(Math.random() * built.length)]; }); }
    const ROLE_ROOM = { Engineer: 'workshop', Cook: 'galley', Scientist: 'lab', Pilot: 'bridge', Scout: 'deck', Trader: 'hold', Medic: 'medbay', Storyteller: 'quarters' };
    const crewRoomOf = c => { const r = S.crewRoom && S.crewRoom[c.name]; return r && roomAt(r) ? r : (roomAt(ROLE_ROOM[c.role]) ? ROLE_ROOM[c.role] : 'bridge'); };
    function crewIn(k) { return S.crew.filter(c => crewRoomOf(c) === k); }
    // ---- drawing ----
    const RW = 44, RH = 30, IX = 22, IY = 8; // room size and where the first room sits
    const inCv = el('canvas', { class: 'sx-incv', width: IX + RW * 4 + 28, height: IY * 2 + RH * 2 + 2, role: 'img', 'aria-label': 'Cutaway of your ship' });
    const inTip = el('p', { class: 'sx-intip' });
    let inRaf = 0, inHover = null, inSel = 'quarters', inCat = 'wall', inPrev = null;
    const Z = { g: null, t: 0, still: false };
    const px = (x, y, c, w, h) => { Z.g.fillStyle = c; Z.g.fillRect(Math.round(x), Math.round(y), w || 1, h || 1); };
    const blink = (f, k) => Z.still ? 0 : Math.floor(Z.t * f + (k || 0)) & 1;
    const alpha = (a, fn) => { Z.g.globalAlpha = a; fn(); Z.g.globalAlpha = 1; };
    const decArt = (cat, id) => DEC_IMG[cat + ':' + id];
    function artFrame(a) { const fw = Math.floor(a.img.width / a.frames); return [fw, a.img.height, (Z.still ? 0 : Math.floor(Z.t * a.fps) % a.frames) * fw]; }
    function artAt(a, x, y) { const [w, h, sx] = artFrame(a); Z.g.drawImage(a.img, sx, 0, w, h, Math.round(x), Math.round(y), w, h); return [w, h]; }
    function artTile(a, x, y, W, H) { const [w, h, sx] = artFrame(a); for (let yy = 0; yy < H; yy += h) for (let xx = 0; xx < W; xx += w) { const cw = Math.min(w, W - xx), ch = Math.min(h, H - yy); Z.g.drawImage(a.img, sx, 0, cw, ch, x + xx, y + yy, cw, ch); } }
    const PAT = {
      seams: (x, y) => x % 11 === 10, rivets: (x, y) => x % 8 === 3 && y % 6 === 2, planks: (x, y) => y % 4 === 3 || (x + (y >> 2) * 7) % 15 === 0, brick: (x, y) => y % 4 === 3 || (x + ((y >> 2) & 1) * 3) % 6 === 0,
      stripe: x => x % 4 < 2, dots: (x, y) => x % 5 === 2 && y % 5 === 2, stars: (x, y) => (x * 7 + y * 13) % 41 === 0, checker: (x, y) => ((x / 3 | 0) + (y / 3 | 0)) & 1, diamond: (x, y) => (x + y) % 6 === 0 || (x - y + 60) % 6 === 0,
      waves: (x, y) => (y + Math.round(Math.sin(x / 2) * 1.2) + 60) % 5 === 0, hex: (x, y) => { const r = (y / 4 | 0) & 1, xx = (x + r * 3) % 6; return y % 4 === 0 ? xx < 3 : xx === 3 && y % 4 === 2; },
      plaid: (x, y) => x % 6 === 0 || y % 6 === 0 || (x % 6 === 3 && y % 2 === 0), sheen: (x, y) => (x - y + 60) % 14 < 2, circuit: (x, y) => (y % 7 === 3 && x % 9 < 6) || (x % 9 === 5 && y % 7 < 4) || (x % 9 === 0 && y % 7 === 3),
      bubbles: (x, y) => { const a = x % 9 - 4, b = (y + (x / 9 | 0) * 3) % 9 - 4, d = a * a + b * b; return d >= 8 && d <= 10; }, veins: (x, y) => (x * 3 + y * 5 + Math.round(Math.sin(y * .7) * 3) + 100) % 23 === 0 || (x + y * 2) % 31 === 0,
      grate: (x, y) => x % 3 === 1 && y % 2 === 1, chess: (x, y) => ((x >> 1) + (y >> 1)) & 1, edge: (x, y) => y === 0, tufts: (x, y) => y === 0 && x % 3 === 0, tiles: (x, y) => x % 6 === 0 || y === 0, herring: (x, y) => (x + y) % 4 === 0 || (x - y + 40) % 8 === 0, grid: (x, y) => x % 5 === 0 || y === 0 || y === 3,
    };
    const VIEW = (v, sx, sy, w, h) => { // what you see through a window
      const t = Z.t, bg = v === 'nebula' ? '#1e1d39' : v === 'dawn' ? '#411d31' : '#090a14'; px(sx, sy, bg, w, h);
      if (v === 'dawn') { px(sx, sy + h - 3, '#cf573c', w, 1); px(sx, sy + h - 2, '#de9e41', w, 2); px(sx + w / 2 - 2, sy + h - 4, '#e8c170', 4, 2); }
      if (v === 'nebula') { px(sx + 2, sy + 2, '#402751', w - 4, h - 4); px(sx + 4, sy + 3, '#7a367b', w / 2, h / 2); px(sx + w / 2, sy + h / 2, '#a23e8c', 3, 2); }
      if (v === 'galaxy') { for (let q = -4; q <= 4; q++) px(sx + w / 2 + q, sy + h / 2 + Math.round(q * .4), Math.abs(q) < 2 ? '#ebede9' : '#c65197'); px(sx + w / 2 - 1, sy + h / 2 - 1, '#e8c170', 2, 2); }
      for (let q = 0; q < w * h / 9; q++) { const a = (q * 37 + sx * 3) % w, b = (q * 19 + sy) % h; if ((q + Math.floor(t * .5)) % 7 && !(q % 3)) px(sx + a, sy + b, '#ebede9'); }
      if (v === 'planet') { px(sx + w - 7, sy + h - 4, '#4f8fba', 7, 4); px(sx + w - 5, sy + h - 5, '#4f8fba', 5, 1); px(sx + w - 6, sy + h - 4, '#73bed3', 2, 1); }
      if (v === 'rings') { px(sx + w / 2 - 2, sy + 2, '#de9e41', 5, 5); px(sx + w / 2 - 6, sy + 4, '#e8c170', 13, 1); px(sx + w / 2 - 1, sy + 3, '#e8c170'); }
      if (v === 'comet') { const u = Z.still ? .5 : (t * .15) % 1, cxp = sx + Math.round(u * (w + 6)) - 3, cyp = sy + 2 + Math.round(u * (h - 4)); for (let q = 0; q < 4; q++) px(cxp - q, cyp - Math.round(q / 2), q ? '#a4dddb' : '#ebede9'); }
      if (v === 'station') { px(sx + 2, sy + h - 4, '#394a50', w - 4, 3); for (let q = 3; q < w - 3; q += 3) px(sx + q, sy + h - 3, (q + Math.floor(t)) % 4 ? '#e8c170' : '#73bed3'); }
    };
    const WIN = (s, rx, ry, fr, v) => {
      const hole = (x, y, n) => { px(x - 1, y - 1, fr, n + 2, n + 2); VIEW(v, x, y, n, n); px(x, y, fr); px(x + n - 1, y, fr); px(x, y + n - 1, fr); px(x + n - 1, y + n - 1, fr); };
      if (s === 'port') hole(rx + 8, ry + 6, 7); if (s === 'ports') { hole(rx + 5, ry + 6, 7); hole(rx + 14, ry + 6, 7); }
      if (s === 'triple') [rx + 3, rx + 10, rx + 17].forEach(x => hole(x, ry + 7, 5)); if (s === 'big') hole(rx + 6, ry + 4, 11);
      if (s === 'wide') { px(rx + 3, ry + 4, fr, 20, 11); VIEW(v, rx + 4, ry + 5, 18, 9); }
      if (s === 'tall') { px(rx + 9, ry + 3, fr, 8, 18); VIEW(v, rx + 10, ry + 4, 6, 16); px(rx + 9, ry + 12, fr, 8, 1); }
      if (s === 'arch') { px(rx + 6, ry + 5, fr, 13, 14); VIEW(v, rx + 7, ry + 7, 11, 11); px(rx + 8, ry + 6, fr === '#c7cfcc' ? '#090a14' : '#090a14', 9, 1); px(rx + 7, ry + 7, fr); px(rx + 17, ry + 7, fr); px(rx + 12, ry + 7, fr, 1, 11); }
      if (s === 'hexw') { px(rx + 7, ry + 5, fr, 11, 11); VIEW(v, rx + 8, ry + 6, 9, 9); [[0, 0], [1, 0], [0, 1], [8, 0], [7, 0], [8, 1], [0, 8], [0, 7], [1, 8], [8, 8], [7, 8], [8, 7]].forEach(([a, b]) => px(rx + 8 + a, ry + 6 + b, fr)); }
      if (s === 'diam') { for (let y = -6; y <= 6; y++) { const w = 6 - Math.abs(y); px(rx + 12 - w - 1, ry + 11 + y, fr, w * 2 + 3, 1); } for (let y = -5; y <= 5; y++) { const w = 5 - Math.abs(y); VIEW(v, rx + 12 - w, ry + 11 + y, w * 2 + 1, 1); } }
      if (s === 'slit') { px(rx + 3, ry + 8, fr, 22, 4); VIEW(v, rx + 4, ry + 9, 20, 2); }
      if (s === 'curt') { hole(rx + 9, ry + 6, 7); px(rx + 6, ry + 4, '#577277', 14, 1); px(rx + 6, ry + 5, fr, 3, 11); px(rx + 17, ry + 5, fr, 3, 11); px(rx + 7, ry + 5, '#ebede9', 1, 11); }
    };
    const ART = (s, ax, ay, a, b) => {
      const t = Z.t;
      if (s === 'chart') { px(ax, ay, a, 11, 8); px(ax + 1, ay + 1, b, 9, 6); [[2, 2], [5, 4], [7, 2], [3, 5]].forEach(([u, v]) => px(ax + u, ay + v, '#ebede9')); px(ax + 3, ay + 3, '#73bed3', 2, 1); }
      if (s === 'photo') { px(ax + 1, ay, a, 8, 7); px(ax + 2, ay + 1, b, 6, 3); px(ax + 3, ay + 3, '#4d2b32', 1, 2); px(ax + 5, ay + 3, '#4d2b32', 1, 2); px(ax + 7, ay + 3, '#4d2b32', 1, 2); px(ax + 2, ay + 4, '#75a743', 6, 2); }
      if (s === 'cat') { px(ax, ay, a, 9, 11); px(ax + 2, ay + 3, b, 5, 4); px(ax + 2, ay + 2, b); px(ax + 6, ay + 2, b); px(ax + 3, ay + 4, '#e8c170'); px(ax + 5, ay + 4, '#e8c170'); px(ax + 1, ay + 8, '#ebede9', 7, 1); }
      if (s === 'clock') { px(ax + 2, ay, a, 7, 7); px(ax + 3, ay + 1, b, 5, 5); px(ax + 5, ay + 2, '#241527', 1, 2); const m = Math.floor(t) % 4; px(ax + 5 + [0, 1, 0, -1][m], ay + 3 + [-1, 0, 1, 0][m], '#cf573c'); }
      if (s === 'planet') { px(ax - 1, ay, a, 13, 10); px(ax, ay + 1, '#172038', 11, 8); px(ax + 3, ay + 3, b, 5, 4); px(ax + 4, ay + 2, b, 3, 6); px(ax + 4, ay + 3, '#e8c170', 2, 1); px(ax + 1, ay + 5, '#e8c170', 9, 1); }
      if (s === 'pennant') { px(ax, ay, b, 1, 8); for (let q = 0; q < 8; q++) px(ax + 1 + q, ay + Math.round(q / 3), a, 1, Math.max(1, 6 - Math.round(q * .7))); }
      if (s === 'mirror') { px(ax + 1, ay, a, 8, 9); px(ax, ay + 1, a, 10, 7); px(ax + 2, ay + 1, b, 6, 7); px(ax + 1, ay + 2, b, 8, 5); px(ax + 3, ay + 2, '#ebede9', 1, 3); }
      if (s === 'land') { px(ax - 1, ay, a, 13, 10); px(ax, ay + 1, '#73bed3', 11, 5); px(ax, ay + 6, b, 11, 3); px(ax + 3, ay + 3, '#577277', 3, 3); px(ax + 4, ay + 2, '#ebede9'); px(ax + 8, ay + 2, '#e8c170', 2, 2); }
      if (s === 'abstract') { px(ax, ay, a, 10, 10); px(ax + 1, ay + 1, b, 4, 4); px(ax + 5, ay + 5, '#4f8fba', 4, 4); px(ax + 6, ay + 1, '#e8c170', 3, 2); px(ax + 1, ay + 7, '#241527', 3, 1); }
      if (s === 'map') { px(ax, ay, a, 11, 8); px(ax + 1, ay + 2, b, 4, 3); px(ax + 6, ay + 4, b, 3, 2); for (let q = 0; q < 4; q++) px(ax + 4 + q, ay + 5 - (q & 1), '#a53030'); px(ax, ay, '#c09473', 1, 8); }
      if (s === 'cert') { px(ax, ay + 1, '#4d2b32', 11, 8); px(ax + 1, ay + 2, a, 9, 6); px(ax + 2, ay + 3, '#577277', 6, 1); px(ax + 2, ay + 5, '#577277', 4, 1); px(ax + 7, ay + 5, b, 2, 2); }
      if (s === 'guitar') { px(ax + 2, ay + 5, a, 5, 5); px(ax + 3, ay + 4, a, 3, 1); px(ax + 4, ay - 2, b, 1, 7); px(ax + 4, ay + 7, b); px(ax + 3, ay - 3, b, 3, 1); }
      if (s === 'dart') { px(ax + 2, ay, a, 7, 7); px(ax + 1, ay + 1, a, 9, 5); px(ax + 3, ay + 1, b, 5, 5); px(ax + 4, ay + 2, '#ebede9', 3, 3); px(ax + 5, ay + 3, b); px(ax + 7, ay + 2, '#e8c170', 2, 1); }
      if (s === 'kid') { px(ax, ay, a, 10, 9); px(ax + 2, ay + 2, '#e8c170', 2, 2); px(ax + 1, ay + 7, '#75a743', 8, 1); px(ax + 5, ay + 4, b, 3, 3); px(ax + 6, ay + 3, '#cf573c'); }
      if (s === 'open') { const on = Z.still || (Math.floor(t * 1.3) % 5); px(ax - 1, ay + 1, b, 13, 6); px(ax, ay + 2, on ? a : '#a23e8c', 11, 1); px(ax, ay + 5, on ? a : '#a23e8c', 11, 1); [0, 3, 6, 9].forEach(q => px(ax + q, ay + 3, on ? '#ebede9' : '#c65197', 2, 2)); }
      if (s === 'heart') { const on = Z.still || (Math.floor(t * 1.1) % 4); px(ax, ay, b, 11, 9); const c = on ? a : '#752438'; px(ax + 2, ay + 2, c, 3, 2); px(ax + 6, ay + 2, c, 3, 2); px(ax + 2, ay + 4, c, 7, 1); px(ax + 3, ay + 5, c, 5, 1); px(ax + 4, ay + 6, c, 3, 1); px(ax + 5, ay + 7, c); }
      if (s === 'goldrec') { px(ax, ay, '#4d2b32', 11, 10); px(ax + 1, ay + 1, b, 9, 8); px(ax + 3, ay + 2, a, 5, 5); px(ax + 2, ay + 3, a, 7, 3); px(ax + 5, ay + 4, b); px(ax + 4, ay + 2, '#ebede9'); }
      if (s === 'wanted') { px(ax, ay, a, 9, 11); px(ax + 1, ay + 1, b, 7, 1); px(ax + 3, ay + 3, b, 3, 3); px(ax + 2, ay + 6, b, 5, 2); px(ax + 1, ay + 9, '#a53030', 7, 1); }
      if (s === 'tickets') { [[0, 0, a], [5, 1, b], [2, 5, '#73bed3'], [7, 6, '#a8ca58']].forEach(([u, v, c]) => { px(ax + u, ay + v, c, 5, 3); px(ax + u + 1, ay + v + 1, '#241527', 2, 1); }); }
    };
    const LIGHT = (s, lx, ry, a, b) => {
      const t = Z.t, glowC = s === 'disco' || s === 'spots' ? '#ebede9' : a; alpha(.12, () => { for (let y = 0; y < RH - 6; y++) { const w = 3 + y * .9; px(lx - w, ry + 3 + y, glowC, w * 2, 1); } });
      const cord = n => px(lx, ry, '#394a50', 1, n);
      if (s === 'bulb') { cord(3); px(lx - 1, ry + 3, a, 3, 2); }
      if (s === 'pendant') { cord(4); px(lx - 3, ry + 4, b, 7, 2); px(lx - 2, ry + 3, b, 5, 1); px(lx - 1, ry + 6, a, 3, 1); }
      if (s === 'strip') { px(lx - 8, ry, '#c7cfcc', 17, 1); px(lx - 7, ry + 1, a, 15, 1); }
      if (s === 'lantern') { cord(3); px(lx - 2, ry + 3, b, 5, 5); px(lx - 1, ry + 4, a, 3, 3); px(lx - 2, ry + 5, b, 5, 1); }
      if (s === 'fairy') for (let x = -16; x <= 16; x += 4) { const y = ry + 2 + Math.round(Math.abs(Math.sin((x + 16) / 32 * Math.PI)) * 3); px(lx + x, y - 1, '#394a50'); px(lx + x, y, ['#cf573c', '#e8c170', '#a8ca58', '#73bed3'][((x + 16) / 4 + (Z.still ? 0 : Math.floor(t * 2))) % 4]); }
      if (s === 'neon') { cord(2); px(lx - 3, ry + 2, a, 7, 1); px(lx - 3, ry + 6, a, 7, 1); px(lx - 4, ry + 3, a, 1, 3); px(lx + 4, ry + 3, a, 1, 3); }
      if (s === 'orb') { cord(3); px(lx - 2, ry + 3, a, 5, 5); px(lx - 3, ry + 4, a, 7, 3); px(lx - 1, ry + 4, b, 2, 2); }
      if (s === 'cage') { cord(2); px(lx - 2, ry + 2, b, 5, 6); px(lx - 1, ry + 3, a, 3, 4); px(lx - 2, ry + 4, b, 5, 1); px(lx, ry + 3, b, 1, 4); }
      if (s === 'spots') { px(lx - 10, ry, b, 21, 1); [-8, 0, 8].forEach(q => { px(lx + q - 1, ry + 1, b, 3, 2); px(lx + q, ry + 3, a); }); }
      if (s === 'chand') { cord(3); px(lx - 5, ry + 3, b, 11, 1); [-5, -2, 1, 4].forEach(q => { px(lx + q, ry + 2, a, 2, 1); px(lx + q, ry + 4, b, 2, 1); }); px(lx, ry + 5, a, 1, 2); }
      if (s === 'candles') { cord(3); px(lx - 4, ry + 3, b, 9, 1); [-4, -1, 2, 4].forEach((q, n) => { px(lx + q, ry + 1, '#ebede9', 1, 2); px(lx + q, ry, blink(3, n) ? a : '#e8c170'); }); }
      if (s === 'disco') { cord(3); px(lx - 2, ry + 3, '#c7cfcc', 5, 5); px(lx - 1, ry + 4, a); if (!Z.still) for (let q = 0; q < 6; q++) { const u = t * 1.5 + q; px(lx - RW / 2 + 4 + 2 + ((Math.sin(u) * .5 + .5) * (RW - 8)), ry + 8 + ((q * 5) % 14), ['#df84a5', '#73bed3', '#e8c170', '#a8ca58'][q % 4], 2, 1); } }
      if (s === 'jelly') { cord(2); const w = Z.still ? 0 : Math.round(Math.sin(t * 2)); px(lx - 3, ry + 2, a, 7, 3); px(lx - 2, ry + 1, a, 5, 1); for (let q = -2; q <= 2; q += 2) px(lx + q + (q ? w : 0), ry + 5, b, 1, 3 + (q ? 0 : 1)); }
      if (s === 'star') { cord(2); px(lx, ry + 2, a, 1, 7); px(lx - 3, ry + 5, a, 7, 1); px(lx - 1, ry + 4, a, 3, 3); }
      if (s === 'moon') { cord(2); px(lx - 2, ry + 2, a, 3, 7); px(lx - 3, ry + 3, a, 1, 5); px(lx + 1, ry + 2, a, 2, 1); px(lx + 1, ry + 8, a, 2, 1); }
      if (s === 'plasma') { cord(2); px(lx - 3, ry + 2, '#402751', 7, 6); px(lx, ry + 4, b, 1, 2); if (!Z.still) for (let q = 0; q < 3; q++) { const u = t * 3 + q * 2; px(lx + Math.round(Math.cos(u) * 2.5), ry + 3 + Math.round(Math.sin(u) * 2) + 1, a); } }
    };
    const PLANT = (s, qx, FY, ry, rx, a, b) => {
      const t = Z.t, pot = (c) => { px(qx, FY - 3, c || '#be772b', 5, 3); px(qx - 1, FY - 4, c ? '#394a50' : '#884b2b', 7, 1); };
      if (s === 'cactus') { pot(); px(qx + 2, FY - 9, a, 2, 5); px(qx + 1, FY - 7, a, 1, 2); px(qx + 4, FY - 8, a, 1, 2); px(qx + 2, FY - 10, b); }
      if (s === 'fern') { pot(); [[-2, -6], [-1, -8], [1, -9], [3, -8], [5, -6], [2, -7]].forEach(([u, v]) => { px(qx + 2 + u / 2, FY - 4 + v / 2, b); px(qx + 2 + u, FY - 4 + v, a, 2, 1); }); px(qx + 2, FY - 8, a, 1, 4); }
      if (s === 'sunflower') { pot(); px(qx + 2, FY - 12, '#75a743', 1, 8); px(qx + 3, FY - 8, '#a8ca58', 2, 1); px(qx, FY - 16, a, 5, 5); px(qx + 1, FY - 15, b, 3, 3); }
      if (s === 'bonsai') { px(qx - 1, FY - 2, '#577277', 7, 2); px(qx + 2, FY - 6, '#7a4841', 1, 4); px(qx + 1, FY - 6, '#7a4841'); px(qx - 1, FY - 9, a, 5, 3); px(qx + 2, FY - 10, b, 4, 3); }
      if (s === 'palm') { pot(); px(qx + 2, FY - 18, b, 1, 14); [[-4, 2], [-3, -1], [3, -1], [4, 2], [-2, -2], [2, -2], [0, -3]].forEach(([u, v]) => px(qx + 2 + u, FY - 18 + v, a, 2, 1)); }
      if (s === 'tulips') { pot(); [0, 2, 4].forEach((u, n) => { px(qx + u, FY - 9 + (n & 1), b, 1, 5); px(qx + u, FY - 11 + (n & 1), a, 1, 2); px(qx + u - (n ? 0 : 0), FY - 11 + (n & 1), a, 1, 1); }); }
      if (s === 'succ') { px(qx - 1, FY - 3, '#c7cfcc', 7, 3); px(qx, FY - 5, a, 2, 2); px(qx + 3, FY - 6, b, 2, 3); px(qx + 1, FY - 6, a); }
      if (s === 'snake') { pot(); [0, 2, 4].forEach((u, n) => { const h = [8, 11, 7][n]; px(qx + u, FY - 4 - h, a, 1, h); px(qx + u, FY - 4 - h, b); }); }
      if (s === 'monstera') { pot(); px(qx + 2, FY - 9, '#468232', 1, 5); [[-3, -12], [2, -14], [-1, -10]].forEach(([u, v]) => { px(qx + 2 + u, FY + v, a, 4, 3); px(qx + 3 + u, FY + v + 1, '#241527'); px(qx + 2 + u, FY + v, b); }); }
      if (s === 'bamboo') { px(qx, FY - 3, '#a4dddb', 5, 3); [1, 3].forEach((u, n) => { px(qx + u, FY - 13 + n * 2, a, 1, 10 - n * 2); px(qx + u, FY - 9, '#468232'); px(qx + u + 1, FY - 12 + n * 2, b); }); }
      if (s === 'rose') { pot(); px(qx - 1, FY - 9, b, 7, 5); [[0, -9], [3, -8], [1, -6], [4, -6]].forEach(([u, v]) => px(qx + u, FY + v, a, 2, 1)); }
      if (s === 'herbs') { px(qx - 2, FY - 3, '#7a4841', 9, 3); for (let q = 0; q < 8; q += 2) { px(qx - 2 + q, FY - 6 + (q % 4 ? 1 : 0), a, 1, 3); px(qx - 1 + q, FY - 5, b); } }
      if (s === 'ivy') { px(rx + RW - 8, ry, '#be772b', 5, 2); for (let q = 0; q < 10; q++) { px(rx + RW - 6 + (q % 2), ry + 2 + q, a); if (q % 2) px(rx + RW - 7 + (q % 3), ry + 2 + q, b); } }
      if (s === 'shroom') { const gl = Z.still ? 1 : .6 + .4 * Math.sin(t * 1.5); alpha(.25 * gl, () => px(qx - 3, FY - 10, a, 11, 10)); [[0, 5], [3, 7], [5, 4]].forEach(([u, h]) => { px(qx + u + 1, FY - h + 2, '#c7cfcc', 1, h - 2); px(qx + u, FY - h, a, 3, 2); px(qx + u + 1, FY - h, b); }); }
      if (s === 'crystal') { pot('#577277'); px(qx + 1, FY - 10, a, 2, 6); px(qx + 3, FY - 8, b, 2, 4); px(qx + 1, FY - 11, '#ebede9'); if (blink(1.3)) px(qx + 4, FY - 9, '#ebede9'); }
      if (s === 'tentacle') { pot('#402751'); for (let q = 0; q < 3; q++) for (let y = 0; y < 9; y++) px(qx + q * 2 + Math.round(Math.sin(t * 1.5 + y * .6 + q) * (y / 6)), FY - 4 - y, y > 6 ? b : a); }
      if (s === 'trap') { pot(); px(qx + 2, FY - 8, '#468232', 1, 4); const o = blink(.4) ? 1 : 0; px(qx, FY - 11 - o, a, 5, 2); px(qx, FY - 9 + o, a, 5, 1); px(qx + 1, FY - 10, b, 3, 1); }
      if (s === 'lily') { pot('#577277'); px(qx + 2, FY - 10, '#468232', 1, 6); alpha(.3, () => px(qx - 2, FY - 15, b, 9, 7)); px(qx + 2, FY - 14, a, 1, 5); px(qx, FY - 12, a, 5, 1); px(qx + 2, FY - 12, b); }
    };
    const FURN = (s, fx, FY, a, b) => {
      const t = Z.t;
      if (s === 'chair') { px(fx, FY - 8, a, 3, 8); px(fx, FY - 4, b, 9, 2); px(fx + 7, FY - 6, a, 2, 4); px(fx + 1, FY - 2, '#241527', 1, 2); px(fx + 7, FY - 2, '#241527', 1, 2); }
      if (s === 'beanbag') { px(fx + 1, FY - 4, a, 8, 4); px(fx + 2, FY - 5, a, 6, 1); px(fx + 2, FY - 4, b, 3, 1); }
      if (s === 'books') { px(fx, FY - 16, a, 10, 16); [[-15, ['#cf573c', '#4f8fba', '#e8c170', '#75a743']], [-10, ['#df84a5', '#73bed3', '#a8ca58']], [-5, ['#e8c170', '#a53030', '#3c5e8b', '#ebede9']]].forEach(([oy, cs]) => cs.forEach((c, q) => px(fx + 1 + q * 2, FY + oy, c, 2, 4))); }
      if (s === 'records') { px(fx, FY - 6, a, 9, 6); px(fx + 1, FY - 8, '#241527', 7, 2); px(fx + 3 + (Z.still ? 0 : Math.floor(t * 4) % 3), FY - 8, b); if (blink(1)) px(fx + 8, FY - 12, '#ebede9'); }
      if (s === 'lava') { px(fx + 3, FY - 2, '#577277', 4, 2); px(fx + 3, FY - 10, a, 4, 8); const q = Z.still ? 0 : Math.round(Math.sin(t * .8) * 2); px(fx + 4, FY - 7 + q, b, 2, 2); px(fx + 4, FY - 4 - q, '#e8c170', 2, 1); px(fx + 3, FY - 11, '#577277', 4, 1); }
      if (s === 'tank') { px(fx, FY - 8, '#577277', 11, 8); px(fx + 1, FY - 9, a, 9, 6); px(fx + 1, FY - 9, '#73bed3', 9, 1); const f = Z.still ? 3 : Math.floor((t * 3) % 14), q = f < 7 ? f : 13 - f; px(fx + 2 + q, FY - 6, b, 2, 1); px(fx + 5, FY - 5, '#75a743', 1, 2); }
      if (s === 'sofa') { px(fx, FY - 7, a, 12, 4); px(fx, FY - 4, b, 12, 2); px(fx, FY - 6, a, 2, 4); px(fx + 10, FY - 6, a, 2, 4); px(fx + 1, FY - 2, '#241527', 1, 2); px(fx + 10, FY - 2, '#241527', 1, 2); }
      if (s === 'globe') { px(fx + 2, FY - 2, '#7a4841', 6, 2); px(fx + 4, FY - 4, '#7a4841', 2, 2); px(fx + 2, FY - 10, a, 6, 6); px(fx + 3, FY - 9, b, 2, 2); px(fx + 5, FY - 7, b, 2, 2); px(fx + 1, FY - 10, '#de9e41', 1, 6); }
      if (s === 'tv') { px(fx, FY - 3, '#4d2b32', 10, 3); px(fx, FY - 11, a, 10, 8); px(fx + 1, FY - 10, blink(.7) ? b : '#a4dddb', 7, 6); px(fx + 8, FY - 9, '#e8c170'); px(fx + 3, FY - 13, '#577277', 1, 2); px(fx + 6, FY - 13, '#577277', 1, 2); }
      if (s === 'coffee') { px(fx + 1, FY - 11, a, 8, 11); px(fx + 2, FY - 10, '#202e37', 6, 3); px(fx + 3, FY - 5, '#ebede9', 3, 3); px(fx + 7, FY - 9, b); if (!Z.still && Math.floor(t * 2) % 3) px(fx + 4, FY - 7 - Math.floor(t * 3) % 2, '#c7cfcc'); }
      if (s === 'easel') { px(fx + 2, FY - 13, a, 1, 13); px(fx + 7, FY - 13, a, 1, 13); px(fx + 1, FY - 13, '#ebede9', 8, 7); px(fx + 2, FY - 12, b, 3, 2); px(fx + 5, FY - 10, '#73bed3', 3, 2); }
      if (s === 'punch') { px(fx + 4, FY - 22, '#577277', 1, 4); const w = Z.still ? 0 : Math.round(Math.sin(t * 1.4)); px(fx + 2 + w, FY - 18, a, 5, 10); px(fx + 2 + w, FY - 18, b, 5, 1); px(fx + 2 + w, FY - 9, b, 5, 1); }
      if (s === 'piano') { px(fx, FY - 13, a, 12, 13); px(fx - 1, FY - 6, a, 14, 1); px(fx, FY - 7, b, 12, 1); for (let q = 1; q < 12; q += 2) px(fx + q, FY - 7, '#241527'); px(fx + 2, FY - 11, '#4d2b32', 8, 3); }
      if (s === 'arcade') { px(fx, FY - 15, a, 9, 15); px(fx + 1, FY - 13, blink(3) ? '#a8ca58' : '#73bed3', 7, 5); px(fx + 1, FY - 6, '#241527', 7, 2); px(fx + 2, FY - 6, '#cf573c'); px(fx + 5, FY - 6, '#e8c170'); px(fx + 1, FY - 15, b, 7, 1); }
      if (s === 'catbed') { px(fx, FY - 3, a, 11, 3); px(fx + 1, FY - 4, '#cf573c', 9, 1); px(fx + 3, FY - 6, b, 5, 3); px(fx + 3, FY - 7, b); px(fx + 7, FY - 7, b); px(fx + 7, FY - 5, '#241527'); if (!Z.still && Math.floor(t * .6) % 4 === 0) px(fx + 9, FY - 9, '#ebede9'); }
      if (s === 'robodog') { const w = Z.still ? 0 : Math.round(Math.sin(t * 1.2) * 2); const x = fx + 2 + w; px(x, FY - 5, a, 7, 3); px(x + 6, FY - 7, a, 3, 3); px(x + 7, FY - 6, b); px(x, FY - 2, '#577277', 1, 2); px(x + 5, FY - 2, '#577277', 1, 2); px(x - 1, FY - 6, a); }
      if (s === 'jukebox') { px(fx, FY - 14, a, 10, 14); px(fx + 1, FY - 13, b, 8, 3); px(fx + 2, FY - 9, '#241527', 6, 4); for (let q = 0; q < 4; q++) px(fx + 1 + q * 2, FY - 4, ['#cf573c', '#e8c170', '#a8ca58', '#73bed3'][(q + Math.floor(t * 3)) % 4], 1, 2); }
      if (s === 'gumball') { px(fx + 3, FY - 3, a, 5, 3); px(fx + 4, FY - 4, '#577277', 3, 1); px(fx + 2, FY - 11, b, 7, 7); [[3, -10, '#cf573c'], [5, -9, '#e8c170'], [4, -7, '#73bed3'], [6, -6, '#a8ca58'], [3, -6, '#df84a5']].forEach(([u, v, c]) => px(fx + u, FY + v, c)); }
      if (s === 'holo') { px(fx + 2, FY - 2, a, 7, 2); alpha(Z.still ? .6 : .45 + .2 * Math.sin(t * 3), () => { px(fx + 3, FY - 10, b, 5, 8); px(fx + 4, FY - 12, b, 3, 2); }); px(fx + 5, FY - 9, '#ebede9'); }
    };
    const CEIL = (s, rx, ry, a) => {
      const t = Z.t, cx2 = rx + 5;
      if (s === 'vent') { px(cx2, ry, a, 8, 3); px(cx2 + 1, ry + 1, '#394a50', 6, 1); }
      if (s === 'ac') { px(cx2, ry, a, 10, 4); px(cx2 + 1, ry + 3, '#819796', 8, 1); px(cx2 + 8, ry + 1, blink(1.5) ? '#a8ca58' : '#75a743'); if (!Z.still && Math.floor(t * 2) % 3 === 0) px(cx2 + 3, ry + 5 + Math.floor(t * 4) % 2, '#a4dddb'); }
      if (s === 'fan') { px(cx2 + 4, ry, '#819796', 1, 2); const f = blink(8); px(cx2 + (f ? 1 : 0), ry + 2, a, f ? 7 : 9, 1); px(cx2 + 3, ry + 2, '#577277', 3, 1); }
      if (s === 'cables') { px(rx, ry + 1, a, RW, 1); for (let x = 0; x < RW; x += 4) px(rx + x, ry + 2, ['#cf573c', '#4f8fba', '#e8c170'][(x / 4) % 3], 2, 1); }
      if (s === 'pipes') { px(rx, ry, a, RW, 2); px(rx, ry + 2, '#394a50', RW, 1); for (let x = 3; x < RW; x += 14) px(rx + x, ry, '#c7cfcc', 2, 3); }
      if (s === 'sprink') [10, 32].forEach(x => { px(rx + x, ry, '#c7cfcc', 1, 2); px(rx + x - 1, ry + 2, a, 3, 1); });
      if (s === 'duct') { px(rx, ry, a, RW, 3); for (let x = 5; x < RW; x += 10) px(rx + x, ry, '#819796', 1, 3); }
      if (s === 'chains') [6, 14].forEach((x, n) => { for (let y = 0; y < 5 + n * 2; y += 2) px(rx + x, ry + y, a); px(rx + x - 1, ry + 6 + n * 2, '#577277', 3, 1); });
      if (s === 'bunting') for (let x = 0; x < RW; x += 4) { const y = ry + 1 + Math.round(Math.sin(x / RW * Math.PI) * 3); px(rx + x, y, '#394a50', 4, 1); px(rx + x + 1, y + 1, ['#cf573c', '#e8c170', '#73bed3', '#a8ca58'][(x / 4) % 4], 2, 2); }
      if (s === 'hangp') [8, 20].forEach(x => { px(rx + x, ry, '#c7cfcc', 1, 3); px(rx + x - 2, ry + 3, '#be772b', 5, 2); px(rx + x - 2, ry + 5, a, 1, 3); px(rx + x + 2, ry + 5, a, 1, 2); px(rx + x, ry + 5, '#a8ca58', 1, 4); });
      if (s === 'wires') for (let x = 0; x < RW; x++) { px(rx + x, ry + 1 + Math.round(Math.abs(Math.sin(x / 7)) * 2), a); px(rx + x, ry + 2 + Math.round(Math.abs(Math.sin(x / 5 + 1)) * 2), '#a53030'); }
      if (s === 'mobile') { px(cx2 + 4, ry, '#819796', 1, 3); px(cx2, ry + 3, '#819796', 9, 1); const w = Z.still ? 0 : Math.round(Math.sin(t)); [[0, a], [4, '#73bed3'], [8, '#cf573c']].forEach(([u, c], n) => { px(cx2 + u, ry + 4, '#819796', 1, 2 + n); px(cx2 + u - 1 + w * (n - 1), ry + 6 + n, c, 2, 2); }); }
      if (s === 'beams') { px(rx, ry, a, RW, 2); [4, 22, 38].forEach(x => px(rx + x, ry + 2, '#4d2b32', 2, 2)); }
      if (s === 'tubes') { px(rx + 2, ry + 1, blink(.5) || Z.still ? a : '#c65197', RW - 4, 1); px(rx + 2, ry, '#394a50', 1, 2); px(rx + RW - 3, ry, '#394a50', 1, 2); }
      if (s === 'proj') { px(cx2 + 2, ry, '#394a50', 3, 2); for (let q = 0; q < 7; q++) { const x = (q * 13 + Math.floor(t * 2) * 3) % (RW - 4), y = 4 + (q * 7) % 16; if ((q + Math.floor(t)) % 3) px(rx + 2 + x, ry + y, a); } }
      if (s === 'ticker') { px(rx + 2, ry, '#241527', RW - 4, 3); for (let x = 0; x < RW - 6; x++) if (((x + Math.floor(t * 8)) % 7) < 4 && x % 2) px(rx + 3 + x, ry + 1, a); }
      if (s === 'gtrim') { px(rx, ry, a, RW, 1); for (let x = 1; x < RW; x += 3) px(rx + x, ry + 1, '#de9e41'); }
      if (s === 'bubbles') { px(cx2, ry, '#577277', 5, 3); if (!Z.still) for (let q = 0; q < 4; q++) { const u = (t * .4 + q * .25) % 1; px(cx2 + 3 + Math.round(u * 26 + Math.sin(t * 3 + q) * 2), ry + 3 + Math.round(u * 16), a); } }
    };
    function drawInterior(now) {
      if (!inCv.isConnected) { inRaf = 0; return; }
      const g = inCv.getContext('2d'), t = now / 1000, W = inCv.width, H = inCv.height; Z.g = g; Z.t = t; Z.still = matchMedia('(prefers-reduced-motion: reduce)').matches; const still = Z.still;
      g.clearRect(0, 0, W, H);
      const hull = HULL_COLORS[S.ship.color] || '#c7cfcc', P = k => inPrev && inPrev[0] === k ? inPrev : null;
      // the hull: a body around both decks, an engine at the back and a pointed nose up front
      const x0 = IX - 4, x1 = IX + RW * 4 + 3, y0 = IY - 4, y1 = IY + RH * 2 + 2 + 3, mid = (y0 + y1) / 2;
      px(x0, y0, hull, x1 - x0, y1 - y0); px(x0 + 1, y1 - 2, 'rgba(0,0,0,.25)', x1 - x0 - 1, 2);
      for (let y = y0; y < y1; y++) { const w = Math.max(0, Math.round(20 - Math.abs(y - mid) * 20 / ((y1 - y0) / 2))); px(x1, y, hull, w, 1); if (w) px(x1 + w - 1, y, 'rgba(0,0,0,.2)'); } // nose
      px(x0 - 8, y0 + 8, '#577277', 8, y1 - y0 - 16); px(x0 - 10, y0 + 10, '#394a50', 2, y1 - y0 - 20); // engine block
      if (!still) { px(x0 - 13 - blink(5), y0 + 14, '#73bed3', 3 + blink(5), y1 - y0 - 28); px(x0 - 15 - blink(5) * 2, y0 + 16, '#a4dddb', 2, y1 - y0 - 32); }
      DECKS.forEach(row => row.forEach(k => {
        const [rx, ry] = roomXY(k), lv = roomAt(k);
        const d = cat => { const p = P(k), id = p && p[1] === cat ? p[2] : decOf(k, cat); return decItem(cat, id); };
        if (!lv) { // locked: a metal shutter with hazard stripes and a padlock
          px(rx, ry, '#577277', RW, RH); for (let y = 2; y < RH - 4; y += 3) px(rx, ry + y, '#394a50', RW, 1);
          for (let x = 0; x < RW; x++) px(rx + x, ry + RH - 4, ((x >> 2) & 1) ? '#e8c170' : '#172038', 1, 4);
          const lx = rx + RW / 2 - 3, ly = ry + RH / 2 - 4; px(lx + 1, ly - 3, '#c7cfcc', 1, 3); px(lx + 4, ly - 3, '#c7cfcc', 1, 3); px(lx + 1, ly - 3, '#c7cfcc', 4, 1); px(lx, ly, '#e8c170', 6, 5); px(lx + 2, ly + 2, '#7a4841', 2, 2);
          if (inHover === k) alpha(.18, () => px(rx, ry, '#e8c170', RW, RH));
          px(rx + RW - 1, ry, 'rgba(0,0,0,.35)', 1, RH); return;
        }
        const wl = d('wall'), pw = PAT[wl[4]], wa = decArt('wall', wl[0]); if (wa) artTile(wa, rx, ry, RW, RH - 4); else { px(rx, ry, wl[5] || '#394a50', RW, RH - 4); for (let y = 0; y < RH - 4; y++) for (let x = 0; x < RW; x++) if (pw && pw(x, y)) px(rx + x, ry + y, wl[6]); }
        const wn = d('window'), wnA = decArt('window', wn[0]); if (wnA) { const [w, h] = artFrame(wnA); artAt(wnA, rx + 13 - w / 2, ry + 10 - h / 2); } else if (wn[4] !== 'none') WIN(wn[4], rx, ry, wn[5], wn[6]);
        const ar = d('art'), arA = decArt('art', ar[0]); if (arA) { const [w, h] = artFrame(arA); artAt(arA, rx + 32 - w / 2, ry + 10 - h / 2); } else if (ar[4] !== 'none') ART(ar[4], rx + 27, ry + 5, ar[5], ar[6]);
        const fl = d('floor'), pf = PAT[fl[4]], flA = decArt('floor', fl[0]); if (flA) artTile(flA, rx, ry + RH - 4, RW, 4); else { px(rx, ry + RH - 4, fl[5] || '#577277', RW, 4); for (let x = 0; x < RW; x++) for (let y = 0; y < 4; y++) if (pf && pf(x, y)) px(rx + x, ry + RH - 4 + y, fl[6]); }
        px(rx, ry + RH - 5, 'rgba(0,0,0,.25)', RW, 1);
        const FY = ry + RH - 4, mx = rx + 15; // floor line, and where the room's own furniture stands
        const F = {
          bridge: () => { px(mx + 2, FY - 7, '#394a50', 16, 7); px(mx + 3, FY - 6, '#73bed3', 6, 2); px(mx + 11, FY - 6, blink(2) ? '#a8ca58' : '#75a743', 5, 2); px(mx + 4, FY - 3, '#e8c170'); px(mx + 7, FY - 3, '#cf573c'); px(mx + 10, FY - 3, '#a8ca58'); px(mx - 3, FY - 6, '#a53030', 4, 4); px(mx - 3, FY - 2, '#241527', 1, 2); },
          quarters: () => { const n = Math.min(3, Math.ceil(roomLv('quarters') / 2)); for (let b = 0; b < n; b++) { const by = FY - 4 - b * 6; px(mx, by, '#819796', 16, 1); px(mx, by - 2, '#ebede9', 16, 2); px(mx, by - 2, '#73bed3', 4, 2); px(mx, by, '#577277', 1, 4 + b * 6); px(mx + 15, by, '#577277', 1, 4 + b * 6); } },
          galley: () => { px(mx, FY - 8, '#c7cfcc', 18, 1); px(mx, FY - 7, '#7a4841', 18, 7); px(mx + 2, FY - 10, '#394a50', 5, 2); px(mx + 11, FY - 9, '#cf573c', 4, 1); if (!still && Math.floor(t * 3) % 3) px(mx + 4, FY - 12 - (Math.floor(t * 3) & 1), '#c7cfcc'); },
          lab: () => { px(mx, FY - 7, '#c7cfcc', 18, 1); px(mx + 1, FY - 6, '#577277', 1, 6); px(mx + 16, FY - 6, '#577277', 1, 6); px(mx + 3, FY - 10, '#a8ca58', 2, 3); px(mx + 7, FY - 11, '#73bed3', 2, 4); px(mx + 11, FY - 9, '#df84a5', 3, 2); if (blink(1.5)) px(mx + 7, FY - 13, '#a4dddb'); },
          workshop: () => { px(mx, FY - 6, '#a53030', 18, 2); px(mx + 1, FY - 4, '#602c2c', 2, 4); px(mx + 15, FY - 4, '#602c2c', 2, 4); px(mx + 4, FY - 8, '#819796', 5, 2); px(mx + 12, FY - 9, '#e8c170', 1, 3); if (!still && Math.floor(t * 6) % 5 === 0) { px(mx + 8, FY - 10, '#d0da91'); px(mx + 10, FY - 9, '#ebede9'); } },
          deck: () => { px(mx + 6, FY - 2, '#577277', 6, 2); px(mx + 8, FY - 9, '#577277', 2, 7); px(mx + 4, FY - 13, '#c7cfcc', 9, 3); px(mx + 12, FY - 14, '#73bed3', 2, 5); },
          hold: () => { const n = Math.min(6, roomLv('hold') + 1); for (let b = 0; b < n; b++) { const bx = mx + (b % 3) * 6, by = FY - 5 - Math.floor(b / 3) * 5; px(bx, by, '#be772b', 5, 5); px(bx, by, '#de9e41', 5, 1); px(bx + 2, by + 1, '#884b2b', 1, 4); } },
          medbay: () => { px(mx, FY - 5, '#ebede9', 16, 2); px(mx, FY - 6, '#c7cfcc', 4, 1); px(mx + 1, FY - 3, '#819796', 1, 3); px(mx + 14, FY - 3, '#819796', 1, 3); px(mx + 7, FY - 15, '#cf573c', 4, 1); px(mx + 8, FY - 16, '#cf573c', 2, 3); },
        };
        F[k] && F[k]();
        const fu = d('furn'), fuA = decArt('furn', fu[0]); if (fuA) { const [, h] = artFrame(fuA); artAt(fuA, rx + 2, FY - h); } else if (fu[4] !== 'none') FURN(fu[4], rx + 2, FY, fu[5], fu[6]);
        const pl = d('plant'), plA = decArt('plant', pl[0]); if (plA) { const [w, h] = artFrame(plA); artAt(plA, rx + RW - 2 - w, FY - h); } else if (pl[4] !== 'none') PLANT(pl[4], rx + RW - 8, FY, ry, rx, pl[5], pl[6]);
        const ce = d('ceil'), ceA = decArt('ceil', ce[0]); if (ceA) { const [w] = artFrame(ceA); artAt(ceA, w >= RW ? rx : rx + 5, ry); } else if (ce[4] !== 'none') CEIL(ce[4], rx, ry, ce[5]);
        const li = d('light'), liA = decArt('light', li[0]), lx = rx + RW / 2 + 4; if (liA) { const [w] = artFrame(liA); alpha(.12, () => { for (let y = 0; y < RH - 6; y++) { const gw = 3 + y * .9; px(lx - gw, ry + 3 + y, li[5] || '#e8c170', gw * 2, 1); } }); artAt(liA, lx - Math.floor(w / 2), ry); } else LIGHT(li[4], lx, ry, li[5], li[6]);
        // crew: they stay in their room this session, shuffling about a little
        crewIn(k).forEach((c, m, all) => {
          const ph = m * 2.1 + c.name.length, base = rx + 8 + (m + 1) * (RW - 16) / (all.length + 1), bx = Math.round(base + (still ? 0 : Math.sin(t * .5 + ph) * 3)), step = !still && Math.abs(Math.cos(t * .5 + ph)) > .3 ? blink(4, m) : 0;
          px(bx, FY - 9, '#4d2b32', 2, 1); px(bx, FY - 8, '#e8c170', 2, 2); px(bx, FY - 6, ROLE_C[c.role] || '#c7cfcc', 2, 4); px(bx + step, FY - 2, '#241527', 1, 2); px(bx + 1 - step, FY - 2, '#241527', 1, 2); if (c.vet) px(bx, FY - 10, '#e8c170', 2, 1);
        });
        // this room's stretch of hull lights: along the top edge for the upper deck, the bottom edge for the lower deck
        const hl = d('lights'), hlA = decArt('lights', hl[0]), hm = hlA && hl[4] === 'img' ? 'steady' : hl[4], deck = DECKS[0].includes(k) ? 0 : 1, col = DECKS[deck].indexOf(k);
        if (hm !== 'none') { const cs = hl.slice(5), N = Math.floor(RW / 6), hy = deck ? IY + RH * 2 + 2 + 1 : IY - 3;
          for (let q = 0; q < N; q++) { const n = col * N + q, x = rx + 3 + q * 6; let c = cs[0] || '#e8c170', on = true;
            if (hm === 'alt') c = cs[n % 2]; if (hm === 'twinkle') on = still || ((n * 7 + Math.floor(t * 2)) % 5) > 0; if (hm === 'pulse') on = still || Math.floor(t * 1.5) % 2 === 0;
            if (hm === 'chase') c = cs[(n + Math.floor(t * 4)) % cs.length]; if (hm === 'strobe') { c = cs[Math.floor(t * 4) % 2]; on = still || (n % 2) === Math.floor(t * 4) % 2; }
            if (hm === 'sweep') on = still || Math.abs(q - (t * 10) % (N + 4)) < 1.5; if (hm === 'comet') { const dd = ((t * 6) % (N + 4)) - q; on = still || (dd >= 0 && dd < 4); if (dd > 0) c = dd < 1 ? '#ebede9' : cs[0]; }
            if (on) { if (hlA) { const [w, h] = artFrame(hlA); artAt(hlA, x - Math.floor(w / 2), hy - Math.floor(h / 2)); } else px(x, hy, c); } } }
        const edge = c => { px(rx, ry, c, RW, 1); px(rx, ry + RH - 1, c, RW, 1); px(rx, ry, c, 1, RH); px(rx + RW - 1, ry, c, 1, RH); };
        if (inSel === k) edge('#e8c170'); else if (inHover === k) alpha(.5, () => edge('#d0da91'));
        px(rx + RW - 1, ry, 'rgba(0,0,0,.35)', 1, RH); // the wall between rooms
      }));
      inRaf = requestAnimationFrame(drawInterior);
    }
    const roomXY = k => { for (let d = 0; d < 2; d++) { const c = DECKS[d].indexOf(k); if (c >= 0) return [IX + c * RW, IY + d * (RH + 2)]; } return [0, 0]; };
    function inTipFor(k) {
      if (!k) return 'Click a room to decorate it.';
      const lv = roomAt(k), who = crewIn(k).map(c => c.name.split(' ')[0] + ' (' + c.role + ')'), [ic, name, what] = ROOM_NAME(k);
      return lv ? ic + ' ' + name + (k === 'bridge' ? '. ' : ' · Lv ' + lv + '. ') + what + '.' + (who.length ? ' In here this session: ' + who.join(', ') + '.' : '') : '🔒 ' + name + ': locked. Build it from the Build tab (Your ship).';
    }
    const inRoomAt = e => { const b = inCv.getBoundingClientRect(), x = (e.clientX - b.left) / b.width * inCv.width, y = (e.clientY - b.top) / b.height * inCv.height;
      for (let d = 0; d < 2; d++) for (let c = 0; c < 4; c++) { const rx = IX + c * RW, ry = IY + d * (RH + 2); if (x >= rx && x < rx + RW && y >= ry && y < ry + RH) return DECKS[d][c]; } return null; };
    inCv.addEventListener('mousemove', e => { const k = inRoomAt(e); if (k !== inHover) { inHover = k; inTip.textContent = inTipFor(k || inSel); inCv.style.cursor = k ? 'pointer' : ''; } });
    inCv.addEventListener('mouseleave', () => { inHover = null; inTip.textContent = inTipFor(inSel); });
    inCv.addEventListener('click', e => { const k = inRoomAt(e); if (!k) return; if (!roomAt(k)) { inTip.textContent = inTipFor(k); return; } inSel = k; drawShip(); });
    function interiorView() { // the Ship page: cutaway on top, decorating below
      if (!roomAt(inSel)) inSel = 'bridge';
      if (!inRaf) inRaf = requestAnimationFrame(drawInterior);
      inTip.textContent = inTipFor(inSel);
      const lock = focusLock(), [ic, name] = ROOM_NAME(inSel);
      const itemBtn = (cat, it, on) => { const own = decOwn(cat, it[0]), cost = decTier(it[2]);
        const b = el('button', { type: 'button', class: 'sx-dec' + (on ? ' on' : '') + (it[3] ? ' st' : ''), disabled: lock || (!own && (S.dust < cost || it[3])) || null, onclick: () => decBuy(cat, it[0]) },
          el('b', {}, it[1]), el('small', {}, on ? 'In use' : own ? (it[3] ? '🛰 Station find' : 'Owned') : it[3] ? '🛰 Stations only' : '✦ ' + cost.toLocaleString()));
        const prev = () => { inPrev = SHIP_DECOR[cat] ? null : [inSel, cat, it[0]]; }, unprev = () => { inPrev = null; };
        b.addEventListener('mouseenter', prev); b.addEventListener('mouseleave', unprev); b.addEventListener('focus', prev); b.addEventListener('blur', unprev);
        return b; };
      const catBtns = ['wall', 'floor', 'window', 'art', 'light', 'plant', 'furn', 'ceil', 'lights'].map(k => [k, DECOR[k]]).map(([k, [label]]) => el('button', { type: 'button', role: 'tab', class: 'sl-stab', 'aria-selected': String(k === inCat), onclick: () => { inCat = k; drawShip(); } }, label));
      const colors = Object.entries(HULL_COLORS).filter(([k]) => !STATION_ONLY.colors.includes(k) || S.ship.colors.includes(k)).map(([k, hex]) => { const own = S.ship.colors.includes(k), on = S.ship.color === k;
        return el('button', { type: 'button', class: 'sx-swatch' + (on ? ' on' : ''), title: k + (own ? '' : ' (✦ ' + E.shipStyleCost.color + ')'), disabled: lock || (!own && S.dust < E.shipStyleCost.color) || null, onclick: () => buyStyle('color', k) }, el('i', { style: 'background:' + hex }), el('span', {}, k)); });
      return [el('div', { class: 'sx-interior' }, inCv, inTip),
        el('div', { class: 'sx-sec' }, el('h3', {}, 'Decorate: ' + ic + ' ' + name, el('small', { class: 'sx-h-n' }, '  ✦ ' + S.dust.toLocaleString())), el('p', { class: 'sl-muted' }, lock ? 'Decorating waits until the study session is over. You can still look.' : 'Buy a decoration once and use it in every room. Hover one to preview it. Click a room above to pick it.'),
          el('div', { class: 'sl-stabs', role: 'tablist' }, catBtns), el('div', { class: 'sx-decs' }, DECOR[inCat][1].map(it => itemBtn(inCat, it, decOf(inSel, inCat) === it[0])))),
        el('div', { class: 'sx-sec' }, el('h3', {}, 'Whole ship'), el('div', { class: 'sx-decrow' }, el('h4', {}, 'Hull paint'), el('div', { class: 'sx-swatches' }, colors)),
          el('p', { class: 'sl-muted' }, decOwned() + ' of ' + decTotal() + ' decorations owned. The 🛰 ones only turn up at Interplanetary Stations.'))];
    }

    const status = el('span', { class: 'sx-cap' }), status2 = el('span', { hidden: true });
    const timeBlock = el('div', { class: 'sx-clock' }, screen, cycleBar, status);
    const midCol = el('section', { class: 'sx-mid' }, nameBox, planetSpot, pvBar, timeBlock, mission, el('div', { class: 'sl-btns' }, startB, resetB, skipB), hint, reportBtn);
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
    // clean view: hide the quest and resource panels (levels, pages, timer and controls stay)
    let clean = false; try { clean = localStorage.getItem('solarist-clean') === '1'; } catch (e) { }
    const cleanB = el('button', { type: 'button', class: 'sx-cleanb', title: 'Hide or show the side panels (H)' });
    function setClean(v) { clean = v; root.classList.toggle('sx-clean', v); cleanB.replaceChildren(v ? '◨' : '◧', el('span', { class: 'sx-cleant' }, v ? ' Show panels' : ' Hide panels')); cleanB.setAttribute('aria-label', v ? 'Show panels' : 'Hide panels'); cleanB.setAttribute('aria-pressed', String(v)); try { localStorage.setItem('solarist-clean', v ? '1' : '0'); } catch (e) { } }
    cleanB.addEventListener('click', () => setClean(!clean)); setClean(clean);
    const tabMap = el('button', { type: 'button', onclick: () => tab('map') }, 'Star map');
    const mapPane = el('div', { class: 'sl-pane sx-mappane', hidden: true });
    const pageTitle = el('h2', { class: 'sx-page-t' });
    const page = el('div', { class: 'sx-page', hidden: true },
      el('div', { class: 'sx-page-h' }, pageTitle, el('button', { type: 'button', class: 'btn', onclick: () => tab('timer') }, 'Back to the voyage')),
      el('div', { class: 'sl-body' }, logPane, shipPane, itemsPane, mapPane, settingsPane));
    [tabTimer, tabLog, tabShip].forEach(b => b.removeAttribute('role'));
    root.classList.add('sx');
    root.replaceChildren(el('header', { class: 'sx-top' }, lvStrip, el('nav', { class: 'sx-nav', 'aria-label': 'Pages' }, cleanB, tabLog, tabMap, tabShip, tabItems, tabSet)), leftCol, midCol, rightCol, feedLine, report, page, el('div', { hidden: true }, tabTimer, status2));
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
    const sceneKind = () => mode !== 'focus' ? 'break' : S.dr ? 'distress' : campaigning() || expediting() ? 'campaign' : hunting() ? 'fight' : shifting() ? 'view' : building() ? (building().k === 'room' ? 'shipbuild' : 'build') : charging() ? 'charge' : discovering() ? 'discover' : heldP() ? 'fight' : 'explore';
    function drawName() {
      if (pv && pvP()) { const p = pvP(); nameBox.disabled = false; nameBox.replaceChildren(el('b', {}, nm(p)), el('span', {}, p.type + ' world, ', el('i', { class: 'sx-r-' + p.rarity.toLowerCase() }, p.rarity), ', ' + (p.x || (p.x = makeExtra(p))).hab + '% habitable')); nameBox.onclick = () => { pvClose(true); tab('log'); openWorld(p.num); }; return; }
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
          el('div', { class: 'sx-row-l' }, here && here.num !== dA.from ? el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => dlDeliver(here) }, 'Deliver at ' + nm(here) + ' now (' + Math.round(dlScore(here) * 100) + '% match, ✦ ' + Math.round(dlPayAt(here) * INCOME) + (viaJump(here) ? ', −' + Math.round((1 - E.quests.deliveryViaJump) * 100) + '% jumped here' : '') + ')') : el('span', { class: 'sl-muted' }, 'Travel somewhere new to deliver. '),
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
        : el('div', { class: 'sx-rtabs', role: 'tablist' }, rt('up', 'Upgrades'), rt('build', 'Build'), rt('coord', 'Coordinator'), rt('research', 'Research'), rt('hangar', 'Crew'), rt('sell', 'Sell'),
        el('i', { class: 'sx-rbreak', 'aria-hidden': 'true' }), rt('tx', '📡 Transmissions', rightTab !== 'tx' && unread ? el('i', { class: 'sx-dot', 'aria-label': unread + ' new' }, String(unread)) : null),
        S.trader ? rt('trade', '🏪 Trade', rightTab !== 'trade' ? el('i', { class: 'sx-dot sx-dot-amber' }, '!') : null) : null,
        S.station ? rt('station', '🛰 Station', rightTab !== 'station' ? el('i', { class: 'sx-dot sx-dot-amber' }, '!') : null) : null);
      if (rightTab === 'build') { rightCol.replaceChildren(tabsR, ...buildView()); return; }
      if (rightTab === 'sell') { rightCol.replaceChildren(tabsR, ...sellView()); return; }
      if (rightTab === 'research') { rightCol.replaceChildren(tabsR, ...researchView()); return; }
      if (rightTab === 'coord') { rightCol.replaceChildren(tabsR, ...coordView()); return; }
      if (rightTab === 'hangar') { rightCol.replaceChildren(tabsR, ...hangarView()); return; }
      if (rightTab === 'station' && S.station) { rightCol.replaceChildren(tabsR, ...stationView()); return; }
      if (rightTab === 'station') rightTab = 'up';
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
      const label = p => nm(p) + (S.at === p.num ? ' (here)' : '') + (p.post ? (p.post.tp ? ', Travelers\' Post' : ', Listening Post') : '') + (p.node ? ', Node' : '') + (held(p) ? ', outlaws' : '');
      const withPost = all.filter(p => p.post || p.node), without = all.filter(p => !p.post && !p.node);
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
          : stationAt(p) ? up('Listening Post', 'Not while an Interplanetary Station is parked here.', null, 'locked') : up('Listening Post', 'Hear transmissions from this world. One study session.', queue('post:' + p.num + ':')));
        rows.push(p.post && p.post.tp ? up('Travelers\' Post', tierOf(p.post.tp.pop || 0) + ', ' + (p.post.tp.pop || 0).toLocaleString() + ' settlers. Pays trade every session.', el('span', { class: 'sx-done' }, 'Built'), 'built')
          : p.post ? up('Travelers\' Post', 'Settlers, trade and facilities. One study session.', queue('upgrade:' + p.num + ':'))
            : up('Travelers\' Post', 'Needs a Listening Post first.', null, 'locked'));
        if (p.post) rows.push(el('div', { class: 'sx-row sx-postact' },
          S.tuned === p.num ? el('button', { type: 'button', class: 'btn', onclick: () => { S.tuned = 0; save(); draw(); } }, 'Untune satellite') : el('button', { type: 'button', class: 'btn', title: 'The tuned post reports every study session', onclick: () => { S.tuned = p.num; save(); draw(); } }, 'Tune satellite here'),
          el('button', { type: 'button', class: 'btn', onclick: () => rename(p) }, 'Rename world')));
        rows.push(p.node ? up('Hyperdrive Node', S.at === p.num ? 'Installed. You are here.' : 'Installed. Jump back any time.', jumpBtn(p, 'btn sx-buy') || el('span', { class: 'sx-done' }, 'Built'), 'built')
          : stationAt(p) ? up('Hyperdrive Node', 'Not while an Interplanetary Station is parked here.', null, 'locked') : up('Hyperdrive Node', 'Lets the ship jump back here from anywhere. One study session.', queue('node:' + p.num + ':')));
        out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Post'), ...rows));
        // step 3: facilities
        if (p.post && p.post.tp) {
          const tp = p.post.tp, built = tp.fac, frows = [], slots = facSlots(p), free = built.length < slots, th = postTheme(p);
          // who this post is: your name for it and a few words about it
          const nameIn = el('input', { type: 'text', class: 'sl-find', maxlength: 40, value: tp.name || '', placeholder: postName(p), 'aria-label': 'Post name', disabled: locked || null });
          nameIn.addEventListener('change', () => { const v = nameIn.value.trim().slice(0, 40); if (v) tp.name = v; else delete tp.name; save(); draw(); });
          const descIn = el('textarea', { class: 'sl-find sx-desc', maxlength: 220, rows: 2, placeholder: 'What is this post like? (optional)', 'aria-label': 'Post description', disabled: locked || null }, tp.desc || '');
          descIn.addEventListener('change', () => { const v = descIn.value.trim().slice(0, 220); if (v) tp.desc = v; else delete tp.desc; save(); });
          out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Identity'), el('p', { class: 'sl-muted' }, th ? th[0] + ' Its facilities make it a ' + th[1] + '.' : 'Build two or more facilities of one kind (food, science, fun, rest, work, culture) and the post gets a theme.'), nameIn, descIn));
          built.forEach(f => { const lv = f.lv || 1, max = lv >= FAC_MAX, c = facCost(lv + 1);
            const ren = el('button', { type: 'button', class: 'sl-link sx-ren', disabled: locked || null, title: 'Give it your own name', onclick: () => { const v = window.prompt('Name this ' + FAC[f.k][1] + ' (leave empty for the default):', f.name || ''); if (v == null) return; const t = v.trim().slice(0, 32); if (t) f.name = t; else delete f.name; save(); draw(); } }, '✎');
            frows.push(el('div', { class: 'sx-up' }, el('b', {}, FAC[f.k][0] + ' ' + facName(f) + ' ' + lv, ren), el('small', {}, (f.name ? FAC[f.k][1] + '. ' : '') + (max ? 'Max level' : 'Level ' + (lv + 1) + ': bigger numbers in its logs'), ' ', armBtn('Tear down', 'Sure? No refund', () => { tp.fac = tp.fac.filter(x => x !== f); S.cnt.torn = (S.cnt.torn || 0) + 1; pushEv({ c: 'ship', ic: FAC[f.k][0], title: 'Torn down: ' + facName(f), t: 'The ' + facName(f) + ' at ' + postName(p) + ' was cleared to make room.', at: Date.now() }); save(); draw(); }, 'sx-mini')),
              max ? el('span', { class: 'sx-done' }, 'Max') : el('button', { type: 'button', class: 'btn sx-buy', disabled: S.dust < c || null, onclick: () => upgradeFac(p, f) }, '✦ ' + c.toLocaleString()))); });
          if (free) Object.keys(THEMES).forEach(t => { const ks = Object.keys(FAC).filter(k => FAC_THEME[k] === t && !hasFac(p, k)); if (!ks.length) return;
            frows.push(el('p', { class: 'sx-themeh' }, THEMES[t][0] + ' ' + THEMES[t][1].replace(/ (Post|Stop)$/, '').replace('Research', 'Science'))); ks.forEach(k => frows.push(up(FAC[k][0] + ' ' + FAC[k][1], FAC_DESC[k], queue('add:' + p.num + ':' + k), 'unbuilt'))); });
          out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Facilities', el('small', { class: 'sx-h-n' }, ' ' + built.length + ' / ' + slots + ' slots')),
            el('p', { class: 'sl-muted' }, free ? 'Room for ' + (slots - built.length) + ' more. New ones take a study session, upgrades cost resources. Choose what this post is about.' : 'No room left. ' + ((tp.pop || 0) < 1000 ? 'It gets a free slot when it grows into a Town (1,000 settlers). ' : '') + 'Buy more land, or tear one down to build something else.'),
            (tp.extra || 0) < slotBuyMax() ? el('div', { class: 'sx-up sx-slotbuy' }, el('b', {}, '🧱 Buy more land'), el('small', {}, 'One more facility slot (' + (tp.extra || 0) + ' of ' + slotBuyMax() + ' bought, up to ' + FS.max + ' slots in all).'), el('button', { type: 'button', class: 'btn sx-buy', disabled: S.dust < slotCost(p) || null, onclick: () => buySlot(p) }, '✦ ' + slotCost(p).toLocaleString())) : el('p', { class: 'sl-muted' }, 'All the land there is: ' + FS.max + ' slots once it is a Town.'),
            ...frows));
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
      const desc = id => { const { c, r } = parseId(id); return el('small', {}, el('i', { class: 'sx-r-' + r.toLowerCase() }, r), ' ' + ({ cur: 'curiosity', mat: 'material', art: 'artifact', wpn: 'weapon part', tec: 'tech part', spc: 'specimen', rel: 'relic', map: 'star chart', sig: 'signal', fos: 'fossil', coin: 'coin', ano: 'anomaly', stn: 'souvenir' }[c] || 'item') + (S.items[id] ? ', you have ' + S.items[id].n : ', new to you')); };
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
      if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); setClean(!clean); return; }
      if (pv) { if (e.key === 'Escape') { e.preventDefault(); pvClose(); } else if (e.key === 'ArrowLeft') { e.preventDefault(); pvStep(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); pvStep(1); } return; }
      if (/^[1-5]$/.test(e.key)) { const b = misBtns[+e.key - 1]; if (b && !b.disabled && !b.hidden) { e.preventDefault(); b.click(); } }
      else if (e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); startB.click(); }
    });


    // ---------- Planetarium: flip through your charted worlds in 3D on the main screen (allowed during study, it's just looking) ----------
    const pvP = () => pv && pv.list[pv.i] ? pv.list[pv.i].p : null;
    function pvOpen(list, num) {
      list = list && list.length ? list.slice() : S.found.slice().reverse(); if (!list.length) return;
      pv = { list, i: Math.max(0, list.findIndex(f => f.p.num === num)) }; S.cnt.pv = (S.cnt.pv || 0) + 1; tab('timer'); root.classList.add('sx-pv'); drawPv(); draw();
    }
    function pvClose(quiet) { if (!pv) return; pv = null; root.classList.remove('sx-pv'); pvBar.hidden = true; if (!quiet) draw(); }
    function pvStep(d) { if (!pv) return; pv.i = (pv.i + d + pv.list.length) % pv.list.length; drawPv(); drawName(); drawClock(); }
    function drawPv() {
      const p = pvP(); if (!p) { pvClose(); return; } const x = p.x || (p.x = makeExtra(p));
      const bits = [p.star.startsWith('none') ? 'no star' : p.star, p.moons + ' moon' + (p.moons === 1 ? '' : 's'), p.rings ? 'rings' : null, p.life, fmtTemp(p), p.gravity + ' g', p.dist.toLocaleString() + ' ly from Earth'].filter(Boolean);
      pvBar.hidden = false;
      pvBar.replaceChildren(
        el('button', { type: 'button', class: 'btn sx-pv-arrow', 'aria-label': 'Previous world', onclick: () => pvStep(-1) }, '◂'),
        el('div', { class: 'sx-pv-info' }, el('b', {}, '🔭 ' + pad(p.num) + ' · ' + (pv.i + 1) + ' of ' + pv.list.length), el('small', {}, bits.join(' · ')),
          el('div', { class: 'sx-row-l' }, p.node && S.at !== p.num ? el('button', { type: 'button', class: 'sl-link', disabled: !canJump(p) || null, onclick: () => { pvClose(true); jumpTo(p); } }, '⚡ Jump here') : null, el('button', { type: 'button', class: 'sl-link', onclick: () => { const n = p.num; pvClose(true); tab('log'); openWorld(n); } }, 'Open in the Logbook'),
            el('button', { type: 'button', class: 'sl-link', onclick: () => pvClose() }, 'Back to the voyage (Esc)'), el('span', { class: 'sx-pv-time' }))),
        el('button', { type: 'button', class: 'btn sx-pv-arrow', 'aria-label': 'Next world', onclick: () => pvStep(1) }, '▸'));
    }
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
    const HEAD = { node: 'Hyperdrive Node installed · ', outlaw: '🏴 Outlaw-held world · ', freed: '⚔ World liberated · ', new: '★ New world discovered · ', log: 'World ', lucky: '🧭 Coordinator-guided discovery · ', built: '🗼 Listening Post built · ', upgraded: '🏘 Travelers\' Post opened · ', opened: '🏗 New facility · ', last: 'Last discovery · ' };
    function planetCard(p, kind) {
      const tuned = S.tuned === p.num && !!p.post;
      const pic = el('div', { class: 'sl-picwrap' }, el('img', { class: 'sl-pic', src: paint(p, 64), alt: 'Pixel portrait of ' + nm(p), width: 128, height: 128 }),
        p.post ? el('span', { class: 'sl-tower', title: p.post.tp ? 'Travelers\' Post' : 'Listening Post' }, p.post.tp ? '🏘' : '🗼') : null,
        tuned ? el('span', { class: 'sl-orbit', title: 'The ship\'s satellite is tuned to this world' }, el('img', { src: satSprite(), alt: 'Satellite' })) : null);
      return [
        el('div', { class: 'sl-card-h' }, el('span', {}, (HEAD[kind] || '') + pad(p.num)), el('span', { class: 'sl-rar sl-r-' + p.rarity.toLowerCase() }, p.rarity)),
        el('div', { class: 'sl-pl' }, pic,
          el('div', { class: 'sl-pl-t' }, el('b', { class: 'sl-name' }, nm(p), held(p) ? el('span', { class: 'sl-tag sl-tag-bad', title: 'Held by ' + p.outlaw.gang }, '🏴 Outlaws') : null, p.node ? el('span', { class: 'sl-tag sl-tag-coord', title: 'Hyperdrive Node installed: you can jump here' }, 'Node') : null, p.outlaw && p.outlaw.cleared ? el('span', { class: 'sl-tag', title: 'You drove out ' + p.outlaw.gang }, '⚔ Liberated') : null, p.lucky ? el('span', { class: 'sl-tag sl-tag-coord', title: 'Found by following the Interplanetary Coordinator' }, '🧭 Coordinated') : null, p.nudged && p.nudged.length ? el('span', { class: 'sl-tag sl-tag-coord', title: 'Steered by your Coordinator chips' }, '🎛 Steered') : null, tuned ? el('span', { class: 'sl-tag' }, '📡 Tuned') : p.post ? el('span', { class: 'sl-tag off' }, p.post.tp ? '🏘 Travelers\' Post' : '🗼 Post') : null),
            el('div', { class: 'sl-code' }, p.code + ' · ' + p.type + ' · ' + (p.x || (p.x = makeExtra(p))).hab + '% habitable'), el('p', {}, logText(p)))),
        el('details', { class: 'sl-more' }, el('summary', {}, 'Survey data'), facts(p)),
        p.post && p.post.tp ? el('div', { class: 'sx-postid' }, el('b', {}, (postTheme(p) ? postTheme(p)[0] : '🏘') + ' ' + postName(p)), p.post.tp.desc ? el('p', {}, p.post.tp.desc) : null) : null,
        p.post && p.post.tp ? el('div', { class: 'sl-facs', title: 'Facilities at this Travelers\' Post' }, [el('span', { class: 'sl-fac sl-popl' }, '🏙 ' + tierOf(p.post.tp.pop || 0) + ' · ' + (p.post.tp.pop || 0).toLocaleString() + ' settlers'), ...p.post.tp.fac.map(f => el('span', { class: 'sl-fac' }, FAC[f.k][0] + ' ' + facName(f) + ((f.lv || 1) > 1 ? ' ' + '★'.repeat(Math.min(5, f.lv - 1)) + (f.lv > 6 ? '+' : '') : '')))]) : null,
        p.post ? postLog(p) : null,
      ].filter(Boolean);
    }
    function showCard(p, kind) {
      const e = p && p.enc && (kind === 'new' || kind === 'lucky') ? p.enc : null;
      encBox.hidden = !e; encBox.replaceChildren(...(e ? [el('div', { class: 'sl-enc-h' }, '- ' + e.ic + ' ' + e.title + ' -'), el('p', {}, e.t), el('p', { class: 'sl-enc-got' }, 'You gain ✦ ' + e.dust + ' resources')] : []));
      if (!p) { card.hidden = true; card.replaceChildren(); return; }
      card.hidden = false; card.className = 'sl-card' + (kind === 'new' || kind === 'node' || kind === 'built' || kind === 'lucky' || kind === 'upgraded' || kind === 'opened' || kind === 'freed' ? ' new' : kind === 'outlaw' ? ' new sl-held' : '');
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
      const FN = facName(fo), FAME = ['The ' + FN + ' is famous across the sector now.', 'Travelers line up outside the ' + FN + ' every evening.', 'The ' + FN + ' hired ' + (lv * 3) + ' new staff this week.', 'A travel guide gave the ' + FN + ' ' + Math.min(5, lv) + ' stars.'];
      let text = lv >= 3 && r() < .3 ? FAME[Math.floor(r() * FAME.length)] : facLog(p, k, r, S.found.map(f => nm(f.p)).filter(x => x !== nm(p)));
      if (lv > 1) text = text.replace(/\b(\d+)\b/, (m0, d) => String(+d * lv)); // a bigger facility does more of everything
      if (fo.name) text = text.split('The ' + FAC[k][1]).join(fo.name).split('the ' + FAC[k][1]).join(fo.name).split(FAC[k][1]).join(fo.name);
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
      pvClose(true);
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
        } else if (expediting() || hunting() || shifting()) {
          const msg = expediting() ? expLeg(reps) : hunting() ? mwLeg(reps) : stShift(reps);
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
          } else if (target.k === 'node') {
            tp2.node = { at: Date.now() }; S.cnt.nodes = (S.cnt.nodes || 0) + 1;
            msg = 'Hyperdrive Node installed on ' + nm(tp2) + '. You can jump back to it any time from its Logbook page or the Build tab.';
            pushEv({ c: 'ship', ic: '⚡', title: 'Hyperdrive Node: ' + nm(tp2), t: msg, at: Date.now() });
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
          showCard(tp2 || null, target.k === 'post' ? 'built' : target.k === 'upgrade' ? 'upgraded' : target.k === 'node' ? 'node' : 'opened');
          toBreak();
          hint.textContent = msg + ' Now a ' + MODES[mode].toLowerCase() + '.';
        } else if (discovering()) {
          const a = atP(), better = hasT('scan3') && Math.random() < 1 / 3, got = [rollItem(a, better, 'survey')]; if (Math.random() < (hasT('scan1') ? .55 : .3)) got.push(rollItem(a, better, 'survey')); if (hasT('scan4') && Math.random() < .2) got.push(rollItem(a, better, 'survey'));
          const fresh = got.map(it => gainItem(it, a));
          S.mission = 0; S.surveys = (S.surveys || 0) + 1; mwClue(a, 1); const svPay = addDust(E.survey.pay);
          award(20 + 10 * fresh.filter(Boolean).length, 12 + 12 * fresh.filter(Boolean).length + (hasT('scan2') ? 10 : 0) + (hasT('scan4') ? 15 : 0));
          if (!quiet && hooks.tada) hooks.tada();
          if (hooks.show) hooks.show();
          reps.unshift({ ev: { battle: true, ic: '🔍', title: 'Survey of ' + nm(a), t: 'The survey team combed the ' + a.biomes[Math.floor(Math.random() * a.biomes.length)].toLowerCase() + ' and came back with: ' + got.map((it, i) => it.name + ' (' + it.rar + (fresh[i] ? ', new!' : '') + ')').join(' and ') + '.', got: '🎒 Collection ' + itemCount() + ' / ' + ITEM_TOTAL + ' · +' + svPay + ' ✦ for the samples' } });
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
          const station = !outlaws && Math.random() < E.station.chance; chipsReturn();
          if (station) stationArrive(p, reps);
          if (!outlaws && !station && Math.random() < ENC_CHANCE + chipP('lantern', amp) + (hasT('nav1') ? .05 : 0) + .02 * roomLv('deck') + .03 * crewN('Scout')) {
            const [ic, title, tpl, lo, hi] = ENCOUNTERS[Math.floor(Math.random() * ENCOUNTERS.length)];
            const dust = addDust((lo + Math.random() * (hi - lo)) * E.encounters.scale * (RANK[p.rarity] >= 2 ? E.encounters.rareWorldMultiplier : 1)), t = tpl.split('{p}').join(nm(p));
            p.enc = { ic, title, t, dust }; encGot = p.enc; award(10, 5); S.cnt.enc++;
            pushEv({ ic, title, t, got: '+' + dust + ' ✦', at: Date.now() });
          }
          if (!outlaws && !station && Math.random() < E.tradeStation.chance * (hasT('nav3') ? 2 : 1) + chipP('market', amp)) { makeTrader(p); traderNew = S.trader; }
          if (!quiet && hooks.tada) hooks.tada();
          if (hooks.show) hooks.show();
          showCard(p, outlaws ? 'outlaw' : lucky ? 'lucky' : 'new'); foundP = p;
          toBreak();
          hint.textContent = outlaws ? '🏴 Arrived, but ' + p.outlaw.gang + ' control this world! Explore is blocked until you fight them off (one study session). Building and charging still work.'
            : station ? '🛰 Arrived, and there is an Interplanetary Station in orbit! Open the Station tab on the right. It stays until you travel on.' : 'Arrived! ' + (lucky ? 'The Coordinator\'s charge is spent. ' : '') + 'Time for a ' + MODES[mode].toLowerCase() + ': stand up, stretch, drink some water.';
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
        hooks.scene({ mode, kind: pv ? 'view' : kind, pv: !!pv, running, pct, paused: !running && left > 0 && left < length(mode), planet: pv ? pvP() : scenePlanet(kind), coord: !pv && !!S.coord, spot: planetSpot, ship: S.ship, build: !pv && kind === 'build' && building() ? { k: building().k, fac: building().fac } : null, trader: !pv && S.trader ? S.trader.num : null, station: S.station ? S.station.num : null });
        if (pv) { const tm = pvBar.querySelector('.sx-pv-time'); if (tm) tm.textContent = running ? '⏱ ' + fmt(r) + (mode === 'focus' ? ' left to study' : ' of break left') : ''; }
      }
      if (hooks.title) hooks.title(running ? fmt(r) + ' · ' + (mode === 'focus' ? (S.dr ? 'Distress Run' : campaigning() ? 'Following the trail' : expediting() ? 'Expedition' : hunting() ? 'Hunting' : building() ? (building().k === 'upgrade' ? 'Upgrading' : 'Building') : charging() ? 'Charging' : discovering() ? 'Surveying' : heldP() ? 'Fighting' : 'Traveling') : 'Preparing') : 'Solarist');
    }
    // while a study session runs, everything that isn't pure data is put away (back at the break)
    let wasLocked = false, rightPrev = 'up';
    const focusLock = () => running && mode === 'focus';
    function draw() {
      stationCheck();
      const lk = focusLock();
      if (lk !== wasLocked) { wasLocked = lk; if (lk) { rightPrev = rightTab; rightTab = 'tx'; if (!settingsPane.hidden) tab('timer'); } else rightTab = rightPrev || 'up'; }
      root.classList.toggle('sx-lock', lk); tabSet.disabled = lk; tabSet.title = lk ? 'Settings open again at the break' : '';
      drawClock(); drawLv();
      root.dataset.mode = mode;
      modeBtns.forEach(b => { const on = b.dataset.m === mode; b.classList.toggle('on', on); b.disabled = running && !on; });
      startB.textContent = running ? 'Pause' : (left < length(mode) && left > 0 ? 'Resume' : mode === 'focus' ? (S.dr ? (S.dr.n ? 'Continue the Run' : 'Start the Run') : campaigning() ? 'Follow the trail' : expediting() ? 'Continue' : hunting() ? 'Start the hunt' : shifting() ? 'Start the shift' : building() ? (building().k === 'upgrade' ? 'Upgrade' : 'Build') : charging() ? 'Charge' : discovering() ? 'Survey' : heldP() ? 'Fight' : 'Launch') : 'Start break');
      if (!hint.textContent) hint.textContent = mode === 'focus' ? (S.dr ? '🆘 ' + DISTRESS[S.dr.sc][2] + ' Finish this study session to keep going.' : expediting() ? EXPED[S.exp.id][0] + ' Finish this session for leg ' + (S.exp.step + 1) + ' of ' + EXPED[S.exp.id][1] + '.' : hunting() ? '🎯 Finish this session to close in on ' + S.mw.name + '.' : campaigning() ? 'Finish this session to reach the Meridian\'s next log beacon (log ' + (S.camp.n + 1) + ' of ' + CAMP.logs.length + ').' : building() ? 'Finish this session: ' + jobText(building()).replace(/^./, c => c.toLowerCase()) + '.' : charging() ? 'Finish this session to charge the Interplanetary Coordinator. No new world this time, but the next one will be a good one.' : discovering() ? '🔍 Finish this session to survey ' + nm(atP()) + ' (where you are now). You\'ll bring back collectibles made from its materials.' : heldP() ? '🏴 ' + heldP().outlaw.gang.replace(/^the/, 'The') + ' hold ' + nm(heldP()) + '. Finish this study session to drive them out. (Build and Charge still work.)' : S.coord ? '🧭 The Coordinator is charged: this trip has much better odds.' : 'Finish a trip (a study session) to discover a new world.') : 'Break time. The crew is getting the gear ready for the next mission.';
      if (S.mission > 0 && !building()) { S.mission = 0; S.job = null; }
      if (S.mission === -1 && S.coord) S.mission = 0;
      if (S.mission === -2 && !discovering()) S.mission = 0;
      if (S.mission === -3 && campDone()) S.mission = 0;
      if (S.mission === -4 && !S.exp) S.mission = 0;
      if (S.mission === -5 && !mwReady()) S.mission = 0;
      if (S.mission === -6 && !stHere()) S.mission = 0;
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
        if (k === 'shift') { b.hidden = !stHere(); }
        if (k === 'charge') b.title = S.coord ? 'Already charged: your next Explore is a lucky one' : MISSIONS[3][3];
        if (k === 'build') { b.title = canBuild ? MISSIONS[2][3] : 'Nothing left to build'; const bj = building(); b.lastChild.textContent = bj ? 'Build: ' + (bj.k === 'room' ? ROOMS[bj.fac][1] : bj.k === 'node' ? 'Hyperdrive Node' : bj.k === 'post' ? 'Listening Post' : bj.k === 'upgrade' ? 'Travelers\' Post' : FAC[bj.fac][1]) : 'Build'; b.hidden = !bj && cm !== 'build'; }
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
    let shipTab = 'Ship', facPost = 0;
    function drawShip() {
      const group = (title, ...kids) => el('fieldset', { class: 'sl-group' }, el('legend', {}, title), ...kids);
      const cm = curMission(), b = building(), locked = running && mode === 'focus';
      const next = cm === 'discover' && atP() ? '🔍 Survey ' + nm(atP()) + ' for collectibles' : cm === 'build' && b ? (b.k === 'upgrade' ? '🏘 ' : b.k === 'add' ? FAC[b.fac][0] + ' ' : b.k === 'node' ? '' : b.k === 'room' ? ROOMS[b.fac][0] + ' ' : '🗼 ') + jobText(b) : cm === 'explore' && heldP() ? '⚔ Fight ' + heldP().outlaw.gang + ' on ' + nm(heldP()) : cm === 'charge' ? '🧭 Charge the Interplanetary Coordinator' : S.coord ? '🚀 Explore (lucky, Coordinator charged)' : '🚀 Explore a new world';
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
      const SUB = { Ship: shipView(group), Captain: [rtGroup, rank], Medals: medalsView(group), Crew: crewView(group), Goals: [quests, drGroup, bounties, records], Stats: statsView(group) };
      if (!SUB[shipTab]) shipTab = 'Ship';
      const subBtns = Object.keys(SUB).map(k => el('button', { type: 'button', role: 'tab', class: 'sl-stab', 'aria-selected': String(k === shipTab), onclick: () => { shipTab = k; drawShip(); } }, k));
      shipPane.replaceChildren(el('div', { class: 'sl-stabs sl-shiptabs', role: 'tablist' }, subBtns), el('div', { class: 'sl-subpane' }, SUB[shipTab]));
    }

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
    SQ('mall', '🛍', 'No Vacancy', 'Fill every facility slot at a post', () => posts().some(x => x.p.post.tp && x.p.post.tp.fac.length >= facSlots(x.p)));
    SQ('theme', '🎪', 'Theme Park', 'Give a post a theme by building its facilities around one idea', () => posts().some(x => x.p.post.tp && !!postTheme(x.p)));
    SQ('city10', '🌆', 'Skyline', 'Have a Travelers\' Post with 10 facilities', () => posts().some(x => x.p.post.tp && x.p.post.tp.fac.length >= 10));
    tiers('Worlds', 'node', '⚡', [[1, 'Shortcut'], [5, 'Network Engineer'], [15, 'Hyperlane Architect']], () => nodes().length, n => 'Install ' + n + ' Hyperdrive Node' + (n === 1 ? '' : 's'));
    SQ('jumpy', '🐇', 'Jumpy', 'Jump through Hyperdrive Nodes 25 times', () => (S.cnt.jumps || 0) >= 25);
    SQ('named', '🪧', 'Grand Opening', 'Give a Travelers\' Post its own name', () => posts().some(x => x.p.post.tp && !!x.p.post.tp.name));
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
    SQ('ride', '🛋', 'Home Sweet Home', 'Change every decoration in one room', () => ROOM_SPOTS.some(k => roomAt(k) && decFull(k)));
    SQ('deep', '🧘', 'Deep Work', 'Finish a 60-minute study session', () => (S.cnt.maxFocus || 0) >= 60);
    SQ('habit', '📈', 'Habit Forming', 'Study 7 days in a row', () => !!S.cnt.streak && S.cnt.streak.best >= 7);
    tiers('Adventure', 'dl', '📦', [[1, 'First Delivery'], [10, 'Courier'], [50, 'Express Service'], [150, 'Postmaster of the Stars']], () => (S.dl && S.dl.done) || 0, n => 'Finish ' + n + ' deliver' + (n === 1 ? 'y' : 'ies'));
    SQ('perfect', '📬', 'Signed, Sealed, Delivered', 'Make 10 perfect deliveries', () => (S.cnt.dlPerfect || 0) >= 10);
    SQ('closeenough', '🤷', 'Close Enough', 'Deliver early at a world that is less than half of what they asked for', () => (S.cnt.dlClose || 0) >= 1);
    // facility and post side quests
    const tps = () => posts().filter(x => x.p.post.tp).map(x => x.p), facAt = (p, k) => p.post.tp.fac.some(f => f.k === k);
    const themeN = (p, t) => p.post.tp.fac.filter(f => FAC_THEME[f.k] === t).length, cargoN = c => (S.cnt.cargo && S.cnt.cargo[c]) || 0;
    SQ('openmic', '🎤', 'Open Mic Night', 'Have a Karaoke Bar and a Music Hall at the same post', () => tps().some(p => facAt(p, 'karaoke') && facAt(p, 'music')));
    SQ('freeze', '🍦', 'Brain Freeze', 'Build an Ice Cream Parlor on a world colder than −50 °C', () => tps().some(p => facAt(p, 'icecream') && p.temp < -50));
    SQ('catch', '🐟', 'Fresh Catch', 'Build a Fish Market on an Ocean world', () => tps().some(p => facAt(p, 'fishmarket') && p.type === 'Ocean'));
    SQ('gold', '⛏', 'Strike It Rich', 'Build a Mine on an Iron or Crystal world', () => tps().some(p => facAt(p, 'mine') && (p.type === 'Iron' || p.type === 'Crystal')));
    SQ('liftoff', '🚀', 'Easy Liftoff', 'Build a Launch Pad on a world under 0.5 g', () => tps().some(p => facAt(p, 'launchpad') && p.gravity < .5));
    SQ('soldout', '🏟', 'Sold Out', 'Have a Stadium in a City of 10,000 settlers', () => tps().some(p => facAt(p, 'stadium') && (p.post.tp.pop || 0) >= 10000));
    SQ('peace', '🧘', 'Inner Peace', 'Have a Meditation Garden, a Shrine and a Spa at one post', () => tps().some(p => facAt(p, 'zen') && facAt(p, 'shrine') && facAt(p, 'spa')));
    SQ('movie', '🍿', 'Movie Night', 'Have a Cinema and an Ice Cream Parlor at one post', () => tps().some(p => facAt(p, 'cinema') && facAt(p, 'icecream')));
    SQ('court', '🍱', 'Food Court', 'Have 5 food facilities at one post', () => tps().some(p => themeN(p, 'food') >= 5));
    SQ('brains', '🧠', 'Brain Trust', 'Have 5 science facilities at one post', () => tps().some(p => themeN(p, 'sci') >= 5));
    SQ('party', '🎉', 'Party Planet', 'Have 5 fun facilities at one post', () => tps().some(p => themeN(p, 'fun') >= 5));
    SQ('retreat', '🛀', 'Wellness Retreat', 'Have 5 rest facilities at one post', () => tps().some(p => themeN(p, 'rest') >= 5));
    SQ('industry', '🏭', 'Industrial Revolution', 'Have 5 work facilities at one post', () => tps().some(p => themeN(p, 'work') >= 5));
    SQ('renaissance', '🖼', 'Renaissance', 'Have 5 culture facilities at one post', () => tps().some(p => themeN(p, 'art') >= 5));
    SQ('everyone', '🌐', 'Something for Everyone', 'Have a facility from every theme at one post', () => tps().some(p => Object.keys(THEMES).every(t => themeN(p, t) > 0)));
    SQ('twins', '👯', 'Twin Cities', 'Have two posts with the same theme', () => { const t = tps().map(p => postTheme(p)).filter(Boolean).map(x => x[1]); return new Set(t).size < t.length; });
    SQ('tour6', '🗺', 'Grand Tour', 'Have posts of all six themes', () => new Set(tps().map(p => postTheme(p)).filter(Boolean).map(x => x[1])).size >= 6);
    SQ('names5', '🏷', 'Name Dropper', 'Give 5 facilities names of your own', () => tps().reduce((a, p) => a + p.post.tp.fac.filter(f => f.name).length, 0) >= 5);
    SQ('brochure', '📝', 'Glossy Brochure', 'Write a description for a Travelers\' Post', () => tps().some(p => !!p.post.tp.desc));
    SQ('planner', '🏗', 'Urban Planner', 'Buy all the extra land at one post', () => tps().some(p => (p.post.tp.extra || 0) >= slotBuyMax()));
    SQ('wrecking', '🧹', 'Wrecking Ball', 'Tear down 3 facilities', () => (S.cnt.torn || 0) >= 3);
    SQ('stargaze', '🔭', 'Stargazer', 'Open the Planetarium 10 times', () => (S.cnt.pv || 0) >= 10);
    SQ('hyperlane', '🌀', 'Hyperlane Tourist', 'Have Hyperdrive Nodes on worlds of 5 different classes', () => new Set(nodes().map(f => f.p.type)).size >= 5);
    SQ('station', '🛰', 'Big City in Space', 'Find an Interplanetary Station', () => (S.cnt.stations || 0) >= 1);
    SQ('shopper', '🛍', 'Last-Minute Shopper', 'Buy 5 things at Interplanetary Stations', () => (S.cnt.stBuys || 0) >= 5);
    SQ('shift', '🛠', 'Odd Jobs', 'Work 3 shifts at Interplanetary Stations', () => (S.cnt.shifts || 0) >= 3);
    SQ('museum', '🏛', 'Patron of the Arts', 'Donate 10 collectibles to station museums', () => (S.cnt.donated || 0) >= 10);
    SQ('vet', '★', 'Old Hand', 'Hire a veteran at an Interplanetary Station', () => (S.cnt.vets || 0) >= 1);
    SQ('ringrunner', '🛰', 'Station Chic', 'Own 5 station-only decorations', () => decStOwned() >= 5);
    SQ('loan', '🎛', 'Borrowed Power', 'Take the loaner chips from a station', () => (S.cnt.loaned || 0) >= 1);
    SQ('ducks', '🦆', 'Rubber Duck Express', 'Perfectly deliver ten thousand rubber ducks', () => cargoN('ten thousand rubber ducks') > 0);
    SQ('cake', '🎂', 'Special Delivery', 'Perfectly deliver a three-tier wedding cake', () => cargoN('a three-tier wedding cake') > 0);
    SQ('cat', '🐈', 'Cat Courier', 'Perfectly deliver a very patient cat', () => cargoN('a very patient cat') > 0);
    tiers('Rating', 'rt', '◆', RANKS.slice(2).map(([at, name]) => [at, name]), () => rating(), n => 'Reach a Rating of ' + n.toLocaleString());
    tiers('Adventure', 'enc', '✨', [[1, 'Fancy Meeting You'], [10, 'Well Connected'], [50, 'Everyone Knows You']], () => S.cnt.enc, n => 'Have ' + n + ' arrival encounter' + (n === 1 ? '' : 's'));
    tiers('Adventure', 'ev', '☄', [[1, 'Strange Skies'], [25, 'Seen It All']], () => S.cnt.ev, n => 'Witness ' + n + ' deep-space event' + (n === 1 ? '' : 's'));
    tiers('Adventure', 'srv', '🔍', [[1, 'Surveyor'], [25, 'Field Researcher'], [100, 'Planetary Scientist']], () => S.surveys || 0, n => 'Survey ' + n + ' world' + (n === 1 ? '' : 's'));
    tiers('Collection', 'itm', '🎒', [[10, 'Pack Rat'], [50, 'Curator'], [100, 'Museum Wing'], [200, 'Grand Museum']], () => itemCount(), n => 'Own ' + n + ' different collectibles');
    A('Collection', 'itmall', '🏛', 'The Complete Collection', 'Own every collectible in the universe', () => itemCount() >= ITEM_ALL);
    CATS.forEach(([c, name, , need]) => A('Collection', 'cat-' + c, '📚', 'All the ' + name, 'Own every item in ' + name, () => catTotal(c) > 0 && ITEM_RARS.every(r => catList(c, r).every((_, i) => S.items[itemId(c, r, i)])), need === 'shop' ? undefined : need));
    const hasCat = c => Object.keys(S.items).some(k => parseId(k).c === c && itemName(k) !== '???');
    [['sig', '📻', 'Tuned In', 'Find your first Signal'], ['fos', '🦴', 'Bone Collector', 'Find your first Fossil'], ['coin', '🪙', 'Spare Change', 'Find your first Coin'], ['ano', '🌀', 'Please Don\'t Open', 'Find your first Anomaly'], ['stn', '🎁', 'Tourist', 'Buy your first Station Souvenir']].forEach(([c, ic, name, desc]) => A('Collection', 'first-' + c, ic, name, desc, () => hasCat(c), c === 'stn' ? undefined : CATS.find(x => x[0] === c)[3]));
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
    A('Ship', 'design', '🛋', 'Interior Designer', 'Buy your first decoration', () => decOwned() > 0);
    A('Ship', 'designs', '🏠', 'Show Home', 'Own every decoration', () => decOwned() >= decTotal()); A('Ship', 'decor50', '🖼', 'Nesting', 'Own 50 decorations', () => decOwned() >= 50);
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
    function crewView(group) { // who's aboard (hiring happens in the Crew tab on the right)
      const out = [];
      out.push(group('Your crew (' + S.crew.length + ' / ' + bunks() + ' bunks)', S.crew.length ? el('div', { class: 'sl-mods' }, S.crew.map(c => el('div', { class: 'sl-mod' }, el('span', { class: 'sl-mod-i' }, ROLES[c.role][0]),
          el('span', { class: 'sl-row-t' }, el('b', {}, c.name), el('small', {}, c.role + '. ' + c.name.split(' ')[0] + ' ' + c.trait + '. ' + ROLES[c.role][1] + '.'))))) : el('p', { class: 'sl-muted' }, 'Nobody aboard yet. Hire crew from the Crew tab on the right (you need Crew Quarters first). Each one adds a Ship Activity: a little story and a small bonus every session.')));
      return out;
    }
    function shipView(group) { // the ship: walk-through cutaway with decorating, then the numbers
      const nameIn = el('input', { type: 'text', class: 'sl-find', value: S.ship.name, maxlength: 28, 'aria-label': 'Ship name' });
      nameIn.addEventListener('change', () => { S.ship.name = nameIn.value.trim().slice(0, 28) || 'The Lantern'; save(); draw(); });
      const rooms = Object.entries(ROOMS).map(([k, [ic, name, what]]) => { const l = roomLv(k); return el('tr', {}, el('td', {}, ic + ' ' + name), el('td', {}, l ? 'Lv ' + l : '-'), el('td', {}, what)); });
      const mods = Object.entries(MODS).map(([k, [ic, name, eff, what]]) => el('tr', {}, el('td', {}, ic + ' ' + name), el('td', {}, 'Lv ' + lvl(k) + ' / ' + modMax(k)), el('td', {}, eff(lvl(k)) + ' ' + what)));
      return [group('Inside the ' + S.ship.name.replace(/^The /, ''), ...interiorView()), group('Name', nameIn),
        group('Rooms', el('table', { class: 'sl-rec sl-stats' }, el('tbody', {}, rooms))), group('Modules', el('table', { class: 'sl-rec sl-stats' }, el('tbody', {}, mods)))];
    }
    function hangarView() { // right side: hire and manage crew
      const out = [], cost = crewCost(), free = bunks() - S.crew.length, pool = crewPool();
      out.push(el('div', { class: 'sx-res' }, el('b', {}, '✦ ' + S.dust.toLocaleString()), el('small', {}, 'resources')));
      out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Hire crew', el('small', { class: 'sx-h-n' }, ' ' + S.crew.length + ' / ' + bunks() + ' bunks')),
        el('p', { class: 'sl-muted' }, !bunks() ? 'Build the Crew Quarters first (Build tab, "Your ship").' : free > 0 ? 'New faces every day.' : 'No free bunks. Upgrade the Crew Quarters.'),
        ...(pool.length ? pool.map((c, i) => el('div', { class: 'sx-up' }, el('b', {}, ROLES[c.role][0] + ' ' + c.name), el('small', {}, c.role + ', says they ' + c.trait + '. ' + ROLES[c.role][1] + '.'),
          el('button', { type: 'button', class: 'btn sx-buy', disabled: free <= 0 || S.dust < cost || null, onclick: () => recruit(i) }, '✦ ' + cost.toLocaleString()))) : [el('p', { class: 'sl-muted' }, 'Everyone today has been hired. Check back tomorrow.')])));
      if (S.crew.length) out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Aboard'), ...S.crew.map((c, i) => el('div', { class: 'sx-up' }, el('b', {}, ROLES[c.role][0] + ' ' + c.name), el('small', {}, c.role), armBtn('Let go', 'Sure?', () => dismiss(i), 'sx-buy')))));
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
        el('div', { class: 'sx-loghead' }, el('b', {}, S.found.length + ' world' + (S.found.length === 1 ? '' : 's') + ' charted'), S.found.length ? el('button', { type: 'button', class: 'btn', title: 'Flip through the worlds shown below in 3D', onclick: () => pvOpen(shownList) }, '🔭 Planetarium') : null),
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
        el('button', { type: 'button', class: 'btn', onclick: () => pvOpen(shownList, p.num) }, '🔭 View in 3D'),
        jumpBtn(p),
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
  window.Solarist = { mount, makePlanet, makeExtra, paint, lookOf, facTheme: FAC_THEME };
})();
