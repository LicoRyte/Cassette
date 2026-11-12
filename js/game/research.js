/* Solarist: Save defaults, Research techs and Ship Logs. */
'use strict';

if (!S.rec) S.rec = {};
// Research: spend Knowledge points (one for every finished study session, and a few milestones) on lore and small perks
if (!S.tech) S.tech = {}; TECH = S.tech; countItems();
if (!S.slog) S.slog = {}; // Ship Logs unlocked by research, by id
Object.keys(S.slog).forEach(k => { if (/^d\d+$/.test(k)) delete S.slog[k]; }); // the old logbook pages were removed
let SEEN_T = null; // titles of arrival encounters and deep-space events, counted for the side challenges
const pushEv = e => { if (!SEEN_T) SEEN_T = new Set((TEXT.lines.meeting || []).map(x => x.title).concat(EVENTS.map(x => x[1]))); if (SEEN_T.has(e.title)) { S.cnt.seen = S.cnt.seen || {}; S.cnt.seen[e.title] = (S.cnt.seen[e.title] || 0) + 1; } S.events.push(e); if (S.events.length > 800) S.events.splice(0, S.events.length - 800); };
if (S.kp == null) S.kp = S.kn || 0;
const hasT = id => !!S.tech[id];
/* Research is a tech tree: [branch, nodes]. A node is [id, name, base cost, what it does, unlocks]. It needs the node
   above it in its branch, unless unlocks.req says otherwise ([] for a root, or other ids, even in other branches).
   Unlocks: cat (a new kind of collectible), logs (Ship Logs), bp (blueprints: things you can make in the Workshop).
   Cost in Knowledge points is base / 100, from 1 to 8. */
const RESEARCH = [
  ['Survey', [['scan1', 'Deep Scanners', 40, 'Expedition parts find a collectible more often (+15 percentage points).'], ['scan2', 'Xenobiology', 150, 'Living worlds give twice as many specimens, and every expedition part teaches +10 Knowledge.'], ['scan3', 'Archaeology', 320, 'Artifacts and relics turn up far more often, and one expedition part in three digs up rarer things.'],
    ['scan4', 'Core Sampling', 560, 'Expedition parts teach +15 more Knowledge, and one in five brings back an extra collectible.', { logs: ['s1'] }]]],
  ['Navigation', [['nav1', 'Star Charting', 40, 'Chance meetings on new worlds happen more often (+5 percentage points).'],
    ['nav5', 'Sky Lore', 220, 'The old names people gave to the stars, and the stories that went with them.', { logs: ['n2', 'n3'] }],
    ['nav4', 'Stellar Cartography', 600, 'Reveals the Star achievements: find a world around every kind of star.', { logs: ['n1'] }],
    ['shp3', 'Long-Range Comms', 350, 'Deep-space events happen 50% more often.', { req: ['nav1'] }],
    ['shp4', 'Black Box Decoder', 640, 'Every Meridian chapter part teaches +10 Knowledge.', { logs: ['k1'] }]]],
  ['Xenology', [['xen1', 'Signal Recording', 80, 'Your antennas start catching old broadcasts on every expedition.', { cat: 'sig', logs: ['x1'] }], ['xen2', 'Paleontology', 240, 'Expeditions can dig up the remains of ancient life, especially on living worlds.', { cat: 'fos', logs: ['x2'] }],
    ['xen3', 'Numismatics', 400, 'Old wrecks and grateful strangers start turning up old money.', { cat: 'coin', logs: ['x3'] }], ['xen4', 'Anomaly Containment', 700, 'Strange worlds give up their strangest things.', { cat: 'ano', logs: ['x4'] }]]],
  ['Archives', [['arc1', 'Guild Records', 60, 'Open the Cartographers\' Guild archive.', { logs: ['g1', 'g2'] }],
    ['arc6', 'Crew Diaries', 200, 'Diaries left behind by crews of other ships, from the boring days in between.', { logs: ['d1', 'd2'] }],
    ['arc7', 'Letters Home', 300, 'A sack of undelivered letters, finally opened.', { logs: ['h1', 'h2'], req: ['arc1'] }],
    ['arc4', 'Founders\' Tapes', 520, 'Recordings from the people who built the first Listening Post.', { logs: ['f1', 'f2'], req: ['arc6'] }],
    ['arc5', 'The Blank Page', 800, 'The last file in the archive.', { logs: ['b1'], req: ['arc4', 'arc7'] }]]],
  ['Making', [['mk1', 'Mending', 60, 'Patch, darn and knit: the simple clothes anybody can make with a needle and some patience.', { bp: ['knit-beanie', 'patched-scarf', 'flannel-shirt', 'thumbhole-hoodie', 'cargo-trousers', 'patched-jeans', 'worn-sneakers', 'fuzzy-slippers'] }],
    ['mk2', 'Tailoring', 160, 'Proper patterns: shirts, skirts, trousers and a uniform to be proud of.', { bp: ['star-sweater', 'poet-shirt', 'lab-coat', 'crew-uniform', 'pleated-skirt', 'corduroy-trousers', 'wool-leggings', 'pyjama-bottoms', 'pocket-shorts', 'night-cap'] }],
    ['mk3', 'Weatherproofing', 200, 'Clothes for rain, wind, sun and the bottom of the sea.', { bp: ['yellow-raincoat', 'rain-poncho', 'reflective-vest', 'mechanic-overalls', 'diving-suit', 'explorer-hat', 'straw-hat', 'bucket-hat', 'hiking-boots', 'moss-boots', 'spacer-boots'], req: ['mk1'] }],
    ['mk4', 'Trinkets', 260, 'Small things worn for luck, for love or for no reason at all.', { bp: ['beaded-necklace', 'friendship-bracelet', 'moon-earrings', 'pin-collection', 'star-bandana', 'knit-mittens', 'round-glasses', 'thick-goggles', 'antenna-band'], req: ['mk2'] }],
    ['mk5', 'Fine Cloth', 420, 'Cloaks, crowns and the jacket everyone secretly wants.', { bp: ['silver-cloak', 'flight-jacket', 'flower-crown', 'pilot-cap', 'mirror-visor', 'sandals-socks'], req: ['mk3', 'mk4'] }]]],
  ['Tinkering', [['tk1', 'Tinkering', 60, 'Simple, sturdy tools to carry everywhere.', { bp: ['multitool', 'rope-coil', 'rock-hammer', 'glow-sticks', 'knitting'] }],
    ['tk2', 'Field Kit', 160, 'Everything a long walk on a strange world needs.', { bp: ['field-journal', 'sample-jars', 'thermos', 'pocket-stove', 'picnic-blanket', 'seed-pouch', 'tea-tin', 'fishing-rod', 'flower-press'] }],
    ['tk3', 'Instruments', 260, 'Lenses, radios and things that look further than eyes can.', { bp: ['pocket-telescope', 'spyglass', 'binoculars', 'camera', 'old-radio', 'brass-lantern', 'compass'] }],
    ['tk4', 'Curios', 380, 'Things for music, games and quiet evenings.', { bp: ['harmonica', 'music-box', 'kite', 'sketchbook', 'watercolours', 'card-deck', 'riddle-book'] }]]],
  ['Ship fittings', [['sf1', 'Home Comforts', 200, 'Make the ship feel lived in. Each piece opens something new to do when you stay on a world.', { bp: ['ship-hammocks', 'ship-books', 'ship-stove', 'ship-teaset'], req: ['tk1'] }],
    ['sf2', 'Hobbies', 350, 'Music, games and films for the long nights between worlds.', { bp: ['ship-records', 'ship-games', 'ship-piano', 'ship-projector'] }],
    ['sf3', 'Greenhouse', 400, 'Living things aboard: a garden and an aquarium.', { bp: ['ship-garden', 'ship-aquarium'], req: ['sf1'] }],
    ['sf4', 'Observatory', 600, 'A telescope, a darkroom and a proper workbench.', { bp: ['ship-telescope', 'ship-darkroom', 'ship-workbench'], req: ['sf2', 'sf3'] }]]],
];
const SHIP_LOGS = { // [title, text]. {ship} becomes your ship's name
  g1: ['Charter of the Cartographers\' Guild', 'Article One: whoever finds a world may name it. Article Two: whoever names it must write down what they saw, honestly, even if it was boring. Article Three: especially if it was boring. Boring worlds are where people end up living.'],
  g2: ['Guild Memo, Survey Department', 'Reminder to all surveyors: "looks fine" is not a planetary description. Neither is "rock". We received four hundred reports this quarter that just say "rock". One of them was about a gas giant. Please try harder.'],
  f1: ['Founders\' Tape 1: The First Post', 'We built the first Listening Post out of a cargo pod and a radio from a junkyard. It caught exactly one message in its first year. It was a wrong number. We were so happy we cried.'],
  f2: ['Founders\' Tape 2: Why We Listen', 'People ask why we put ears on every world. It\'s simple. Space is big and quiet, and the worst thing that can happen out here is to call for help and have nobody hear it. So we hear it. All of it. Even the wrong numbers.'],
  b1: ['The Blank Page', 'The last file in the archive is empty except for one line: "This page is for whoever comes next. Write down what you saw. Honestly. Even if it was boring." Below it, someone has started a list of ships. The {ship} is already on it.'],
  s1: ['Field Notes: What\'s Underneath', 'Every world has a heartbeat if you drill deep enough. Iron worlds thud, slow and heavy. Ocean worlds slosh. Crystal worlds ring like a bell somebody struck a million years ago and nobody ever stopped.'],
  n1: ['The Edge of the Map', 'Every chart ends somewhere. Past the last line, old sea maps used to draw monsters. Ours just say "Quiet Zone". A few ships went in to see what was there. The ones that came back never mention monsters. They talk about a light.'],
  k1: ['Black Box: Meridian, Partial', 'Decoded fragment, badly damaged: "...day 412... five crew... coffee supply..." The rest of the recording is a song. Seven notes, played over and over, slower each time, like someone humming themselves to sleep.'],
  x1: ['Listening Notes', 'Space isn\'t silent. It\'s just far apart. Every radio show, every engine, every lullaby anyone ever broadcast is still out there, getting quieter forever. With the right gear you can catch some of them on the way past.'],
  x2: ['On Fossils', 'A fossil is a living thing that kept a promise: it stayed. Long after the rest of its world forgot it, it held its shape, waiting for somebody to come along and say "oh, there you are".'],
  x3: ['A Short History of Money', 'Every civilization invents money eventually. Most invent it twice: once to trade, and once more after the first kind falls apart. The coins that survive say a lot about what people thought was worth keeping.'],
  x4: ['Containment Protocol', 'Anomalies must be kept in a sealed box, clearly labeled, and never, under any circumstances, observed on a Monday. Nobody remembers why. The rule stays. Nobody has volunteered to find out.'],
  n2: ['Sky Lore: The Kettle', 'Old ship crews named one constellation the Kettle, because it rose whenever someone put the kettle on. It does not look like a kettle. It looks like eleven stars. But ask any old spacer what time it is and they will check whether the Kettle is up.'],
  n3: ['Sky Lore: The Patient Sister', 'A faint star that only shows when you stop looking for it. The story says she waits for travelers who are late, so nobody arrives anywhere to an empty sky. Pilots wave at her on the way out. Nobody admits to it.'],
  d1: ['Crew Diary, day 211', 'Nothing happened today. I want to write that down properly, because I think I will miss days like this. Toast for breakfast. Somebody sang badly in the shower. The stars went past. Nothing happened, and it was lovely.'],
  d2: ['Crew Diary, day 380', 'We have started a rule: whoever finds the best rock of the week gets the window seat at dinner. The competition has become fierce. Tomas painted a face on his. The judges say that is cheating. The judges are also Tomas.'],
  h1: ['Undelivered: To My Sister', 'You asked what it is like out here. It is like being a long way from the kitchen at home, but the kitchen is still warm when you think about it. That is the whole trick. You keep it warm by thinking about it. I think about it a lot.'],
  h2: ['Undelivered: To Whoever Finds This', 'If you are reading this, the post is very, very late. Sorry. Here is what I wanted to say to somebody: the worlds are beautiful, the crew is kind, and I was not lonely, not once. Pass it on.'],
};
const RC = typeof E.researchCost === 'number' ? E.researchCost : 1.5;
const rcost = n => Math.max(1, Math.round(n[2] / 100)); // 1 to 8 points
const RES_ALL = RESEARCH.flatMap(([, list]) => list);
const resBranch = id => (RESEARCH.find(([, l]) => l.some(n => n[0] === id)) || [''])[0];
// what a node needs: the one above it in its branch, unless it says otherwise
function reqOf(node) { const u = node[4] || {}; if (u.req) return u.req; const list = (RESEARCH.find(([, l]) => l.includes(node)) || [, []])[1], i = list.indexOf(node); return i > 0 ? [list[i - 1][0]] : []; }
const resName = id => (RES_ALL.find(n => n[0] === id) || [, id])[1];
// blueprints: what research has taught you to make
const knownBp = () => new Set(RES_ALL.filter(n => hasT(n[0])).flatMap(n => (n[4] && n[4].bp) || []));
const bpNode = id => RES_ALL.find(n => n[4] && n[4].bp && n[4].bp.includes(id)) || null;
const catName = c => (CATS.find(x => x[0] === c) || [, c])[1];
const slogText = t => t.replace('{ship}', S.ship && S.ship.name ? S.ship.name : 'your ship');
function doResearch(id) {
  const node = RES_ALL.find(n => n[0] === id); if (!node || hasT(id)) return;
  const cost = rcost(node);
  if (!reqOf(node).every(hasT)) return;
  if (S.kp < cost) return;
  S.kp -= cost; S.tech[id] = Date.now(); award(25, 0); shopXP(0);
  const un = node[4] || {}, bits = [];
  if (un.cat) { countItems(); bits.push('new collectibles (' + catName(un.cat) + ')'); }
  if (un.logs) { un.logs.forEach(k => { S.slog[k] = Date.now(); }); bits.push(un.logs.length + ' Ship Log' + (un.logs.length > 1 ? 's' : '')); }
  if (un.bp) bits.push(un.bp.length + ' blueprints to make in the Workshop');
  const md = ACH.filter(a => a.req === id).length; if (md) bits.push(md + ' new achievement' + (md > 1 ? 's' : ''));
  const t = node[3] + (bits.length ? ' Unlocked: ' + bits.join(', ') + '.' : '');
  pushEv({ c: 'res', ic: '🔬', title: 'Research complete: ' + node[1], t, at: Date.now() });
  hint.textContent = 'Research complete: ' + node[1] + '. ' + t;
  save(); draw();
}
// once: techs that belonged to removed systems (selling, trade, outlaws, the Coordinator, resource boosts) give their points back
if (!S.rw6r) {
  const GONE = { eco1: 50, eco2: 200, eco3: 400, eco4: 580, shp1: 50, shp2: 220, nav2: 180, nav3: 320, arc2: 180, arc3: 320 };
  const back = Object.keys(GONE).filter(id => S.tech[id]).reduce((a, id) => { delete S.tech[id]; return a + Math.max(5, Math.round(GONE[id] * RC / 5) * 5); }, 0); // on the old scale: converted with everything else below
  if (back) { S.kp += back; pushEv({ c: 'res', ic: '🔬', title: 'Research refunded', t: 'Some research belonged to things the voyage no longer has (selling, trade, outlaws, the Coordinator). Its ' + back + ' Knowledge points are back for you to spend.', at: Date.now() }); }
  S.rw6r = 1;
}
