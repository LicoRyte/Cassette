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
// Research: [id, name, base cost, what it does, what it unlocks]. Costs are base x researchCost from economy.json.
const RESEARCH = [
  ['Survey', [['scan1', 'Deep Scanners', 40, 'Expedition parts find a collectible more often (+15 percentage points).'], ['scan2', 'Xenobiology', 150, 'Living worlds give twice as many specimens, and every expedition part teaches +10 Knowledge.'], ['scan3', 'Archaeology', 320, 'Artifacts and relics turn up far more often, and one expedition part in three digs up rarer things.'],
    ['scan4', 'Core Sampling', 560, 'Expedition parts teach +15 more Knowledge, and one in five brings back an extra collectible.', { logs: ['s1'] }]]],
  ['Navigation', [['nav1', 'Star Charting', 40, 'Chance meetings on new worlds happen more often (+5 percentage points).'],
    ['nav4', 'Stellar Cartography', 600, 'Reveals the Star achievements: find a world around every kind of star.', { logs: ['n1'] }]]],
  ['Ship', [['shp3', 'Long-Range Comms', 350, 'Deep-space events happen 50% more often.'],
    ['shp4', 'Black Box Decoder', 640, 'Every Meridian chapter part teaches +10 Knowledge.', { logs: ['k1'] }]]],
  ['Xenology', [['xen1', 'Signal Recording', 80, 'Your antennas start catching old broadcasts on every expedition.', { cat: 'sig', logs: ['x1'] }], ['xen2', 'Paleontology', 240, 'Expeditions can dig up the remains of ancient life, especially on living worlds.', { cat: 'fos', logs: ['x2'] }],
    ['xen3', 'Numismatics', 400, 'Old wrecks and grateful strangers start turning up old money.', { cat: 'coin', logs: ['x3'] }], ['xen4', 'Anomaly Containment', 700, 'Strange worlds give up their strangest things.', { cat: 'ano', logs: ['x4'] }]]],
  ['Archives', [['arc1', 'Guild Records', 60, 'Open the Cartographers\' Guild archive.', { logs: ['g1', 'g2'] }],
    ['arc4', 'Founders\' Tapes', 520, 'Recordings from the people who built the first Listening Post.', { logs: ['f1', 'f2'] }], ['arc5', 'The Blank Page', 800, 'The last file in the archive.', { logs: ['b1'] }]]],
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
};
const RC = typeof E.researchCost === 'number' ? E.researchCost : 1.5;
const rcost = n => Math.max(1, Math.round(n[2] / 100)); // 1 to 8 points
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
