/* Solarist: Stardust and save defaults, Research techs, Ship Logs and ship modules. */
'use strict';

/* ---------- Progression: Stardust (earned every study session), ship modules and facility levels to spend it on,
   growing Travelers' Posts, rotating bounties and personal records. None of it ever runs out. ---------- */
if (S.dust == null) S.dust = 0; if (S.dustTotal == null) S.dustTotal = S.dust;
if (!S.mods) S.mods = {}; if (!S.bounties) S.bounties = []; if (!S.rec) S.rec = {}; if (!S.bDone) S.bDone = 0;
const lvl = k => S.mods[k] || 1;
// Research: spend Knowledge points (you earn one for every point of Knowledge) on techs with real effects
if (!S.tech) S.tech = {}; TECH = S.tech; countItems();
if (!S.slog) S.slog = {}; // Ship Logs unlocked by research, by id
Object.keys(S.slog).forEach(k => { if (/^d\d+$/.test(k)) delete S.slog[k]; }); // the old logbook pages were removed
let SEEN_T = null; // titles of arrival encounters and deep-space events, counted for the side challenges
const pushEv = e => { if (!SEEN_T) SEEN_T = new Set(ENCOUNTERS.map(x => x[1]).concat(EVENTS.map(x => x[1]))); if (SEEN_T.has(e.title)) { S.cnt.seen = S.cnt.seen || {}; S.cnt.seen[e.title] = (S.cnt.seen[e.title] || 0) + 1; } S.events.push(e); if (S.events.length > 800) S.events.splice(0, S.events.length - 800); };
if (S.kp == null) S.kp = S.kn || 0;
const hasT = id => !!S.tech[id];
// Research: [id, name, base cost, what it does, what it unlocks]. Costs are base x researchCost from economy.json.
const RESEARCH = [
  ['Survey', [['scan1', 'Deep Scanners', 40, 'Expedition parts find a collectible more often (+15 percentage points).'], ['scan2', 'Xenobiology', 150, 'Living worlds give twice as many specimens, and every expedition part teaches +10 Knowledge.'], ['scan3', 'Archaeology', 320, 'Artifacts and relics turn up far more often, and one expedition part in three digs up rarer things.'],
    ['scan4', 'Core Sampling', 560, 'Expedition parts teach +15 more Knowledge, and one in five brings back an extra collectible.', { logs: ['s1'] }]]],
  ['Navigation', [['nav1', 'Star Charting', 40, 'Chance meetings on new worlds happen more often (+5 percentage points).'], ['nav2', 'Coordinator Tuning', 180, 'Charging the Interplanetary Coordinator also pays 40 resources.'], ['nav3', 'Signal Triangulation', 320, 'Trade Stations show up twice as often.'],
    ['nav4', 'Stellar Cartography', 600, 'Reveals the Star medals: find a world around every kind of star.', { logs: ['n1'] }]]],
  ['Economy', [['eco1', 'Guild Contacts', 50, 'The Cartographers\' Guild pays 15% more for worlds you sell.'], ['eco2', 'Trade Routes', 200, 'Travelers\' Posts pay 50% more trade, and the trade cap goes up by 40.'], ['eco3', 'Master Builders', 400, 'Facility upgrades cost 15% less.'],
    ['eco4', 'Collector\'s License', 580, 'Trade Stations pay 25% more for your spares.', { logs: ['e1'] }]]],
  ['Ship', [['shp1', 'Efficient Engines', 50, 'Every study session pays 10% more resources.'], ['shp2', 'Reinforced Hull', 220, 'Driving out outlaws pays 50% more.'], ['shp3', 'Long-Range Comms', 350, 'Deep-space events happen 50% more often.'],
    ['shp4', 'Black Box Decoder', 640, 'Every Meridian chapter part pays 25% more resources.', { logs: ['k1'] }]]],
  ['Xenology', [['xen1', 'Signal Recording', 80, 'Your antennas start catching old broadcasts on every expedition.', { cat: 'sig', logs: ['x1'] }], ['xen2', 'Paleontology', 240, 'Expeditions can dig up the remains of ancient life, especially on living worlds.', { cat: 'fos', logs: ['x2'] }],
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
const modFrac = (k, l) => ((l == null ? lvl(k) : l) - 1) / Math.max(1, modMax(k) - 1); // 0 at level 1, 1 at the module's max level
const evChance = l => Math.min(.3, (1 / 15 + .12 * modFrac('comms', l)) * (hasT('shp3') ? 1.5 : 1));
const MODS = {
  engine: ['🚀', 'Engine', l => '+' + Math.round((l - 1) * E.engineBonusPerLevel * 100) + '%', 'resources from every session'],
  scanner: ['📡', 'Scanner', l => '+' + Math.round(20 * modFrac('scanner', l) * 10) / 10 + '%', 'chance of an anomaly on new worlds'],
  lab: ['🧪', 'Lab', l => Math.round(50 * modFrac('lab', l)) + '%', 'chance of a bonus transmission from the tuned post'],
  comms: ['📻', 'Comms', l => '1 in ' + Math.round(1 / evChance(l)), 'sessions has a deep-space event'],
  hull: ['🛡', 'Hull', l => '+' + Math.round((E.fullCycle.base + (l - 1) * E.fullCycle.perHullLevel) * E.incomeMultiplier) + ' ✦', 'for every Full Cycle'],
};
