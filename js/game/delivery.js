/* Solarist: Interstellar Delivery: carry cargo to a world that fits the client's wishes. */
'use strict';

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
const CARGO = ['seed stock', 'medical crates', 'a grand piano', 'a three-tier wedding cake', 'spare reactor parts', 'fresh water', 'ten thousand rubber ducks', 'library books', 'a very patient cat', 'mail from home', 'solar panels', 'festival fireworks', 'a time capsule', 'telescope mirrors', 'a crate of hot sauce', 'the Guild\'s lost paperwork', "a crate of birthday candles", "a prize-winning pumpkin", "the world's largest rubber band ball", "a hundred potted cacti", "a sealed love letter", "a box of lost socks", "a whole orchestra's instruments", "a museum's dinosaur skeleton", "a very old grandfather clock", "a pallet of fortune cookies", "a crate of glow-in-the-dark paint", "an antique telescope", "a box of baby chicks", "replacement windows for a lighthouse", "a set of bowling pins", "a whole wedding dress", "a sack of mail from a lost ship", "a giant cheese wheel", "a crate of grandma's jam", "a robot that only speaks in rhymes", "a crate of jigsaw puzzles", "a tiny lighthouse lamp", "a box of glow-worms", "a gold-framed mirror", "forty pairs of moon boots"];
const CLIENT = ['The Halvorsen family', 'A retired pilot', 'The Guild survey office', 'A traveling circus', 'A quiet monastery', 'A brand-new colony', 'A botanist', 'A very famous poet', 'An old couple', 'A school on a moon', 'A mysterious stranger', 'The Comet Racing League', "A lonely lighthouse keeper", "The Moonbase Bakers' Union", "A grumpy retired admiral", "A pair of newlyweds", "The Interstellar Postal Service", "A traveling theater troupe", "A collector of strange things", "A small-town mayor", "The Guild history department", "An eight-year-old with savings", "A worried grandmother", "The Lighthouse Keepers' Club", "A tiny bakery", "A brand-new parent", "The Annual Comet Fair", "A shy inventor", "A retired outlaw (reformed)", "The Station Choir", "A nervous first-time traveler", "The Moonbase Chess Club", "A sleepy astronomer", "The Comet Fair's head judge"];
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
