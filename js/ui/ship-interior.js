/* Solarist: The ship's cutaway view: rooms, decorations (and your own art), crew. */
'use strict';

// ---------- Ship interior: a 2D side-view cutaway on the Ship page, rooms you decorate, crew who stay put ----------
const ROOM_SPOTS = ['bridge', 'quarters', 'galley', 'lab', 'workshop', 'deck', 'hold', 'medbay'];
const DECKS = [['quarters', 'galley', 'lab', 'bridge'], ['hold', 'workshop', 'medbay', 'deck']]; // top deck, bottom deck; the nose is on the right
const ROLE_C = { Engineer: '#ffb762', Cook: '#ffe0dc', Scientist: '#bfc3c6', Pilot: '#1c92a7', Scout: '#9cb93b', Trader: '#ffdaac', Medic: '#c76e46', Storyteller: '#ff88a9' };
const ROOM_NAME = k => k === 'bridge' ? ['🧭', 'Bridge', 'Where the ship is flown from'] : ROOMS[k];
const roomAt = k => k === 'bridge' ? 1 : roomLv(k);
// decorations: [id, name, price tier (0 free), station only, ...look]. Buy once, use in every room. 15 regular + 5 station-only per category
const DECOR = {
  wall: ['Wall', [['panels', 'Steel panels', 0, 0, 'seams', '#293b49', '#293b49'], ['navy', 'Navy plating', 1, 0, 'rivets', '#293b49', '#6d8a8d'], ['wood', 'Walnut paneling', 2, 0, 'planks', '#833f34', '#73392e'], ['birch', 'Birch paneling', 2, 0, 'planks', '#eb9c6e', '#eb9c6e'],
    ['brick', 'Red brick', 2, 0, 'brick', '#833f34', '#73392e'], ['wbrick', 'White brick', 2, 0, 'brick', '#bfc3c6', '#bfc3c6'], ['stripe', 'Pink stripes', 1, 0, 'stripe', '#c03b94', '#c03b94'], ['mstripe', 'Mint stripes', 1, 0, 'stripe', '#9cb93b', '#9cb93b'],
    ['dots', 'Polka dots', 1, 0, 'dots', '#1c92a7', '#77d6c1'], ['stars', 'Starry wallpaper', 3, 0, 'stars', '#041528', '#ffb762'], ['checker', 'Checker tiles', 2, 0, 'checker', '#bfc3c6', '#bfc3c6'], ['mint', 'Green diamonds', 3, 0, 'diamond', '#9cb93b', '#9cb93b'],
    ['waves', 'Ocean waves', 3, 0, 'waves', '#6d8a8d', '#1c92a7'], ['hex', 'Hex plating', 2, 0, 'hex', '#6d8a8d', '#6d8a8d'], ['plaid', 'Cabin plaid', 3, 0, 'plaid', '#833f34', '#73392e'],
    ['chrome', 'Station chrome', 5, 1, 'sheen', '#6d8a8d', '#bfc3c6'], ['circuit', 'Circuit board', 5, 1, 'circuit', '#273b2d', '#9cb93b'], ['marble', 'Marble', 5, 1, 'veins', '#ffe0dc', '#bfc3c6'], ['nebula', 'Nebula bubbles', 5, 1, 'bubbles', '#293b49', '#c03b94'], ['goldleaf', 'Gold leaf', 5, 1, 'diamond', '#eb9c6e', '#ffb762']]],
  floor: ['Floor', [['grate', 'Steel grate', 0, 0, 'grate', '#6d8a8d', '#293b49'], ['planks', 'Oak planks', 1, 0, 'planks', '#c76e46', '#833f34'], ['dark', 'Dark planks', 1, 0, 'planks', '#833f34', '#73392e'], ['chess', 'Checkerboard', 2, 0, 'chess', '#ffe0dc', '#34111f'],
    ['red', 'Red carpet', 2, 0, 'edge', '#833f34', '#c76e46'], ['blue', 'Blue carpet', 2, 0, 'edge', '#6d8a8d', '#1c92a7'], ['purple', 'Purple carpet', 2, 0, 'edge', '#601761', '#c03b94'], ['grass', 'Grass mat', 3, 0, 'tufts', '#9cb93b', '#9cb93b'],
    ['tiles', 'White tiles', 1, 0, 'tiles', '#bfc3c6', '#bfc3c6'], ['terra', 'Terracotta', 2, 0, 'tiles', '#c76e46', '#833f34'], ['herring', 'Herringbone', 3, 0, 'herring', '#eb9c6e', '#c76e46'], ['mosaic', 'Blue mosaic', 3, 0, 'dots', '#77d6c1', '#6d8a8d'],
    ['rubber', 'Rubber mat', 1, 0, 'dots', '#293b49', '#273b2d'], ['sand', 'Beach sand', 3, 0, 'dots', '#eb9c6e', '#ffdaac'], ['ice', 'Ice tiles', 3, 0, 'tiles', '#bfc3c6', '#ffe0dc'],
    ['gold', 'Gold tiles', 5, 1, 'tiles', '#eb9c6e', '#ffb762'], ['grid', 'Neon grid', 5, 1, 'grid', '#041528', '#ff88a9'], ['fmarble', 'Marble floor', 5, 1, 'veins', '#ffe0dc', '#bfc3c6'], ['fstars', 'Glass over stars', 5, 1, 'stars', '#030710', '#ffe0dc'], ['moss', 'Living moss', 5, 1, 'tufts', '#273b2d', '#458239']]],
  light: ['Light', [['bulb', 'Bare bulb', 0, 0, 'bulb', '#ffb762'], ['pblue', 'Blue pendant', 1, 0, 'pendant', '#ffb762', '#1c92a7'], ['pred', 'Red pendant', 1, 0, 'pendant', '#ffb762', '#833f34'], ['strip', 'Strip light', 1, 0, 'strip', '#ffe0dc'],
    ['lantern', 'Paper lantern', 2, 0, 'lantern', '#eb9c6e', '#c76e46'], ['plantern', 'Pink lantern', 2, 0, 'lantern', '#ff88a9', '#c03b94'], ['fairy', 'Fairy lights', 3, 0, 'fairy', '#ffb762'], ['neon', 'Pink neon ring', 3, 0, 'neon', '#ff88a9'],
    ['neonb', 'Blue neon ring', 3, 0, 'neon', '#77d6c1'], ['orb', 'Ice orb', 2, 0, 'orb', '#bfc3c6', '#ffe0dc'], ['sun', 'Sun orb', 2, 0, 'orb', '#ffb762', '#ffe0dc'], ['cage', 'Cage lamp', 2, 0, 'cage', '#ffb762', '#6d8a8d'],
    ['spots', 'Spotlights', 3, 0, 'spots', '#ffe0dc', '#293b49'], ['chand', 'Chandelier', 4, 0, 'chand', '#ffb762', '#eb9c6e'], ['candles', 'Candle ring', 4, 0, 'candles', '#eb9c6e', '#833f34'],
    ['disco', 'Disco ball', 5, 1, 'disco', '#ffe0dc'], ['jelly', 'Jellyfish lamp', 5, 1, 'jelly', '#ff88a9', '#c03b94'], ['star', 'Star lamp', 5, 1, 'star', '#ffb762'], ['moon', 'Crescent moon', 5, 1, 'moon', '#bfc3c6'], ['plasma', 'Plasma globe', 5, 1, 'plasma', '#ff88a9', '#c03b94']]],
  plant: ['Plant', [['none', 'No plant', 0, 0, 'none'], ['cactus', 'Little cactus', 1, 0, 'cactus', '#9cb93b', '#ff88a9'], ['fern', 'Potted fern', 1, 0, 'fern', '#9cb93b', '#9cb93b'], ['sunflower', 'Sunflower', 2, 0, 'sunflower', '#ffb762', '#833f34'],
    ['ivy', 'Hanging ivy', 2, 0, 'ivy', '#9cb93b', '#9cb93b'], ['bonsai', 'Bonsai', 3, 0, 'bonsai', '#9cb93b', '#9cb93b'], ['palm', 'Tall palm', 3, 0, 'palm', '#9cb93b', '#833f34'], ['tulips', 'Red tulips', 2, 0, 'tulips', '#c76e46', '#9cb93b'],
    ['ytulips', 'Yellow tulips', 2, 0, 'tulips', '#ffb762', '#9cb93b'], ['succ', 'Succulents', 1, 0, 'succ', '#9cb93b', '#77d6c1'], ['snake', 'Snake plant', 2, 0, 'snake', '#458239', '#ffdaac'], ['monstera', 'Monstera', 3, 0, 'monstera', '#458239', '#9cb93b'],
    ['bamboo', 'Lucky bamboo', 2, 0, 'bamboo', '#9cb93b', '#9cb93b'], ['rose', 'Rose bush', 3, 0, 'rose', '#833f34', '#458239'], ['herbs', 'Herb box', 1, 0, 'herbs', '#9cb93b', '#9cb93b'],
    ['shroom', 'Glow mushrooms', 5, 1, 'shroom', '#77d6c1', '#bfc3c6'], ['crystal', 'Crystal sprout', 5, 1, 'crystal', '#bfc3c6', '#ff88a9'], ['tentacle', 'Alien tendril', 5, 1, 'tentacle', '#c03b94', '#ff88a9'], ['trap', 'Space flytrap', 5, 1, 'trap', '#9cb93b', '#c76e46'], ['lily', 'Star lily', 5, 1, 'lily', '#ffe0dc', '#ffb762']]],
  art: ['Wall art', [['none', 'Bare wall', 0, 0, 'none'], ['chart', 'Star chart', 1, 0, 'chart', '#ffb762', '#293b49'], ['photo', 'Crew photo', 1, 0, 'photo', '#ffe0dc', '#77d6c1'], ['cat', 'Cat poster', 2, 0, 'cat', '#ff88a9', '#34111f'],
    ['clock', 'Wall clock', 2, 0, 'clock', '#bfc3c6', '#ffe0dc'], ['planet', 'Planet painting', 3, 0, 'planet', '#c76e46', '#c76e46'], ['pennant', 'Pennant', 1, 0, 'pennant', '#c76e46', '#bfc3c6'], ['mirror', 'Round mirror', 2, 0, 'mirror', '#eb9c6e', '#bfc3c6'],
    ['land', 'Landscape', 3, 0, 'land', '#833f34', '#9cb93b'], ['abstract', 'Abstract art', 3, 0, 'abstract', '#ffe0dc', '#c76e46'], ['map', 'Old map', 2, 0, 'map', '#eb9c6e', '#833f34'], ['cert', 'Pilot license', 1, 0, 'cert', '#ffe0dc', '#eb9c6e'],
    ['guitar', 'Wall guitar', 3, 0, 'guitar', '#c76e46', '#73392e'], ['dart', 'Dartboard', 2, 0, 'dart', '#34111f', '#c76e46'], ['kid', 'Kid\'s drawing', 1, 0, 'kid', '#ffe0dc', '#1c92a7'],
    ['open', 'Neon "OPEN" sign', 5, 1, 'open', '#ff88a9', '#34111f'], ['heart', 'Neon heart', 5, 1, 'heart', '#c76e46', '#34111f'], ['gold', 'Gold record', 5, 1, 'goldrec', '#ffb762', '#34111f'], ['wanted', 'Wanted poster', 5, 1, 'wanted', '#eb9c6e', '#73392e'], ['tickets', 'Ticket stub wall', 5, 1, 'tickets', '#ffb762', '#ff88a9']]],
  ceil: ['Ceiling', [['none', 'Plain ceiling', 0, 0, 'none'], ['vent', 'Air vents', 1, 0, 'vent', '#6d8a8d'], ['pipes', 'Steel pipes', 1, 0, 'pipes', '#6d8a8d'], ['copper', 'Copper pipes', 2, 0, 'pipes', '#c76e46'], ['ac', 'Air conditioners', 2, 0, 'ac', '#bfc3c6'],
    ['fan', 'Ceiling fans', 3, 0, 'fan', '#bfc3c6'], ['cables', 'Cable trays', 2, 0, 'cables', '#293b49'], ['sprink', 'Sprinklers', 1, 0, 'sprink', '#c76e46'], ['duct', 'Big duct', 2, 0, 'duct', '#6d8a8d'], ['chains', 'Hanging chains', 2, 0, 'chains', '#6d8a8d'],
    ['bunting', 'Party bunting', 2, 0, 'bunting', '#c76e46'], ['hangp', 'Hanging plants', 3, 0, 'hangp', '#9cb93b'], ['wires', 'Messy wires', 1, 0, 'wires', '#34111f'], ['mobile', 'Planet mobile', 3, 0, 'mobile', '#ffb762'], ['beams', 'Wooden beams', 2, 0, 'beams', '#833f34'],
    ['tubes', 'Neon tubes', 5, 1, 'tubes', '#ff88a9'], ['proj', 'Star projector', 5, 1, 'proj', '#ffe0dc'], ['ticker', 'News ticker', 5, 1, 'ticker', '#9cb93b'], ['gtrim', 'Gold trim', 5, 1, 'gtrim', '#ffb762'], ['bubbles', 'Bubble machine', 5, 1, 'bubbles', '#bfc3c6']]],
  lights: ['Hull lights', [['none', 'No hull lights', 0, 0, 'none'], ['white', 'White', 1, 0, 'steady', '#ffe0dc'], ['amber', 'Amber', 1, 0, 'steady', '#ffb762'], ['red', 'Red', 1, 0, 'steady', '#c76e46'], ['green', 'Green', 1, 0, 'steady', '#9cb93b'],
    ['blue', 'Blue', 1, 0, 'steady', '#77d6c1'], ['pink', 'Pink', 1, 0, 'steady', '#ff88a9'], ['purple', 'Purple', 1, 0, 'steady', '#c03b94'], ['nav', 'Red and green', 2, 0, 'alt', '#c76e46', '#9cb93b'], ['twinkle', 'Twinkling white', 2, 0, 'twinkle', '#ffe0dc'],
    ['pulse', 'Pulsing blue', 2, 0, 'pulse', '#77d6c1'], ['gold', 'Gold', 3, 0, 'steady', '#eb9c6e'], ['ice', 'Ice', 3, 0, 'twinkle', '#bfc3c6'], ['xmas', 'Holiday', 3, 0, 'chase', '#c76e46', '#9cb93b', '#ffb762'], ['chase', 'Rainbow chase', 4, 0, 'chase', '#c76e46', '#ffb762', '#9cb93b', '#77d6c1', '#ff88a9'],
    ['police', 'Patrol strobes', 5, 1, 'strobe', '#c76e46', '#1c92a7'], ['sweep', 'Lightning sweep', 5, 1, 'sweep', '#ffe0dc'], ['comet', 'Comet trail', 5, 1, 'comet', '#ffb762'], ['neon', 'Neon pink chase', 5, 1, 'chase', '#ff88a9', '#c03b94'], ['beacon', 'Station beacons', 5, 1, 'pulse', '#ffb762']]],
  furn: ['Furniture', [['none', 'Nothing extra', 0, 0, 'none'], ['chair', 'Armchair', 1, 0, 'chair', '#c03b94', '#c03b94'], ['beanbag', 'Beanbag', 1, 0, 'beanbag', '#1c92a7', '#77d6c1'], ['books', 'Bookshelf', 2, 0, 'books', '#73392e'],
    ['records', 'Record player', 2, 0, 'records', '#833f34', '#c76e46'], ['lava', 'Lava lamp', 2, 0, 'lava', '#c03b94', '#eb9c6e'], ['tank', 'Fish tank', 3, 0, 'tank', '#1c92a7', '#eb9c6e'], ['sofa', 'Little sofa', 2, 0, 'sofa', '#458239', '#9cb93b'],
    ['globe', 'Globe', 2, 0, 'globe', '#1c92a7', '#9cb93b'], ['tv', 'Old TV', 2, 0, 'tv', '#833f34', '#77d6c1'], ['coffee', 'Coffee machine', 3, 0, 'coffee', '#293b49', '#c76e46'], ['easel', 'Easel', 2, 0, 'easel', '#c76e46', '#ff88a9'],
    ['punch', 'Punching bag', 2, 0, 'punch', '#833f34', '#293b49'], ['piano', 'Upright piano', 4, 0, 'piano', '#34111f', '#ffe0dc'], ['arcade', 'Arcade cabinet', 4, 0, 'arcade', '#6d8a8d', '#ff88a9'],
    ['catbed', 'Station cat (with bed)', 5, 1, 'catbed', '#833f34', '#ffb762'], ['robodog', 'Robot dog', 5, 1, 'robodog', '#bfc3c6', '#77d6c1'], ['jukebox', 'Jukebox', 5, 1, 'jukebox', '#833f34', '#ffb762'], ['gumball', 'Gumball machine', 5, 1, 'gumball', '#c76e46', '#ffe0dc'], ['holo', 'Hologram projector', 5, 1, 'holo', '#293b49', '#77d6c1']]],
  window: ['Window', [['none', 'No window', 0, 0, 'none'], ['port', 'Porthole', 1, 0, 'port', '#6d8a8d', 'stars'], ['brass', 'Brass porthole', 2, 0, 'port', '#eb9c6e', 'stars'], ['ports', 'Twin portholes', 2, 0, 'ports', '#6d8a8d', 'stars'],
    ['wide', 'Wide window', 3, 0, 'wide', '#6d8a8d', 'planet'], ['dawn', 'Sunrise window', 3, 0, 'wide', '#6d8a8d', 'dawn'], ['tall', 'Tall window', 2, 0, 'tall', '#6d8a8d', 'stars'], ['arch', 'Arched window', 3, 0, 'arch', '#bfc3c6', 'stars'],
    ['hexw', 'Hex window', 2, 0, 'hexw', '#6d8a8d', 'stars'], ['triple', 'Triple portholes', 3, 0, 'triple', '#6d8a8d', 'stars'], ['diamond', 'Diamond window', 2, 0, 'diam', '#bfc3c6', 'stars'], ['big', 'Big porthole', 3, 0, 'big', '#6d8a8d', 'planet'],
    ['slit', 'Slit window', 1, 0, 'slit', '#6d8a8d', 'stars'], ['cred', 'Porthole, red curtains', 2, 0, 'curt', '#833f34', 'stars'], ['cblue', 'Porthole, blue curtains', 2, 0, 'curt', '#6d8a8d', 'stars'],
    ['neb', 'Nebula view', 5, 1, 'wide', '#bfc3c6', 'nebula'], ['rings', 'Ringed planet view', 5, 1, 'wide', '#ffb762', 'rings'], ['comet', 'Comet porthole', 5, 1, 'big', '#ffb762', 'comet'], ['stview', 'Station lights view', 5, 1, 'wide', '#6d8a8d', 'station'], ['galaxy', 'Galaxy porthole', 5, 1, 'big', '#eb9c6e', 'galaxy']]],
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
    DEC_ALL[o.cat][1].push([o.id, o.name || o.id, Math.max(1, Math.min(5, o.tier | 0 || 1)), o.station ? 1 : 0, 'img', o.cat === 'light' || o.cat === 'lights' ? (o.glow || '#ffb762') : undefined]); load(o.cat + ':' + o.id, o.file || o.cat + '/' + o.id + '.png', o); });
  if (typeof drawShip === 'function' && !shipPane.hidden) drawShip();
}).catch(() => { });
const decItem = (cat, id) => DEC_ALL[cat][1].find(x => x[0] === id) || DEC_ALL[cat][1][0];
const decKey = (cat, id) => cat + ':' + id;
if (!S.decor) S.decor = { own: {}, room: {}, ship: {} };
const decOwn = () => true; // every decoration is free to use
const decOf = (k, cat) => (S.decor.room[k] && S.decor.room[k][cat]) || DECOR[cat][1][0][0];
if (S.decor.ship && (S.decor.ship.ceil || S.decor.ship.lights)) { ROOM_SPOTS.forEach(r => { S.decor.room[r] = S.decor.room[r] || {}; ['ceil', 'lights'].forEach(c => { if (S.decor.ship[c] && !S.decor.room[r][c]) S.decor.room[r][c] = S.decor.ship[c]; }); }); S.decor.ship = {}; }
const decOwned = () => Object.keys(S.decor.own).length;
const decTotal = () => Object.values(DEC_ALL).reduce((a, [, L]) => a + L.filter(x => x[2]).length, 0);
const decStOwned = () => Object.entries(DEC_ALL).reduce((a, [c, [, L]]) => a + L.filter(x => x[3] && S.decor.own[decKey(c, x[0])]).length, 0);
const decFull = k => Object.keys(DECOR).every(c => decOf(k, c) !== DECOR[c][1][0][0]);
function decBuy(cat, id, cost, roomK) { // use a decoration (the first time counts as a new one for your stats)
  const ship = !!SHIP_DECOR[cat], k = decKey(cat, id), it = decItem(cat, id);
  if (focusLock()) return;
  if (it[2] && !S.decor.own[k]) { S.decor.own[k] = Date.now(); S.cnt.decor = (S.cnt.decor || 0) + 1; }
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
  const t = Z.t, bg = v === 'nebula' ? '#041528' : v === 'dawn' ? '#34111f' : '#030710'; px(sx, sy, bg, w, h);
  if (v === 'dawn') { px(sx, sy + h - 3, '#c76e46', w, 1); px(sx, sy + h - 2, '#eb9c6e', w, 2); px(sx + w / 2 - 2, sy + h - 4, '#ffb762', 4, 2); }
  if (v === 'nebula') { px(sx + 2, sy + 2, '#293b49', w - 4, h - 4); px(sx + 4, sy + 3, '#601761', w / 2, h / 2); px(sx + w / 2, sy + h / 2, '#c03b94', 3, 2); }
  if (v === 'galaxy') { for (let q = -4; q <= 4; q++) px(sx + w / 2 + q, sy + h / 2 + Math.round(q * .4), Math.abs(q) < 2 ? '#ffe0dc' : '#c03b94'); px(sx + w / 2 - 1, sy + h / 2 - 1, '#ffb762', 2, 2); }
  for (let q = 0; q < w * h / 9; q++) { const a = (q * 37 + sx * 3) % w, b = (q * 19 + sy) % h; if ((q + Math.floor(t * .5)) % 7 && !(q % 3)) px(sx + a, sy + b, '#ffe0dc'); }
  if (v === 'planet') { px(sx + w - 7, sy + h - 4, '#1c92a7', 7, 4); px(sx + w - 5, sy + h - 5, '#1c92a7', 5, 1); px(sx + w - 6, sy + h - 4, '#77d6c1', 2, 1); }
  if (v === 'rings') { px(sx + w / 2 - 2, sy + 2, '#eb9c6e', 5, 5); px(sx + w / 2 - 6, sy + 4, '#ffb762', 13, 1); px(sx + w / 2 - 1, sy + 3, '#ffb762'); }
  if (v === 'comet') { const u = Z.still ? .5 : (t * .15) % 1, cxp = sx + Math.round(u * (w + 6)) - 3, cyp = sy + 2 + Math.round(u * (h - 4)); for (let q = 0; q < 4; q++) px(cxp - q, cyp - Math.round(q / 2), q ? '#bfc3c6' : '#ffe0dc'); }
  if (v === 'station') { px(sx + 2, sy + h - 4, '#293b49', w - 4, 3); for (let q = 3; q < w - 3; q += 3) px(sx + q, sy + h - 3, (q + Math.floor(t)) % 4 ? '#ffb762' : '#77d6c1'); }
};
const WIN = (s, rx, ry, fr, v) => {
  const hole = (x, y, n) => { px(x - 1, y - 1, fr, n + 2, n + 2); VIEW(v, x, y, n, n); px(x, y, fr); px(x + n - 1, y, fr); px(x, y + n - 1, fr); px(x + n - 1, y + n - 1, fr); };
  if (s === 'port') hole(rx + 8, ry + 6, 7); if (s === 'ports') { hole(rx + 5, ry + 6, 7); hole(rx + 14, ry + 6, 7); }
  if (s === 'triple') [rx + 3, rx + 10, rx + 17].forEach(x => hole(x, ry + 7, 5)); if (s === 'big') hole(rx + 6, ry + 4, 11);
  if (s === 'wide') { px(rx + 3, ry + 4, fr, 20, 11); VIEW(v, rx + 4, ry + 5, 18, 9); }
  if (s === 'tall') { px(rx + 9, ry + 3, fr, 8, 18); VIEW(v, rx + 10, ry + 4, 6, 16); px(rx + 9, ry + 12, fr, 8, 1); }
  if (s === 'arch') { px(rx + 6, ry + 5, fr, 13, 14); VIEW(v, rx + 7, ry + 7, 11, 11); px(rx + 8, ry + 6, fr === '#bfc3c6' ? '#030710' : '#030710', 9, 1); px(rx + 7, ry + 7, fr); px(rx + 17, ry + 7, fr); px(rx + 12, ry + 7, fr, 1, 11); }
  if (s === 'hexw') { px(rx + 7, ry + 5, fr, 11, 11); VIEW(v, rx + 8, ry + 6, 9, 9); [[0, 0], [1, 0], [0, 1], [8, 0], [7, 0], [8, 1], [0, 8], [0, 7], [1, 8], [8, 8], [7, 8], [8, 7]].forEach(([a, b]) => px(rx + 8 + a, ry + 6 + b, fr)); }
  if (s === 'diam') { for (let y = -6; y <= 6; y++) { const w = 6 - Math.abs(y); px(rx + 12 - w - 1, ry + 11 + y, fr, w * 2 + 3, 1); } for (let y = -5; y <= 5; y++) { const w = 5 - Math.abs(y); VIEW(v, rx + 12 - w, ry + 11 + y, w * 2 + 1, 1); } }
  if (s === 'slit') { px(rx + 3, ry + 8, fr, 22, 4); VIEW(v, rx + 4, ry + 9, 20, 2); }
  if (s === 'curt') { hole(rx + 9, ry + 6, 7); px(rx + 6, ry + 4, '#6d8a8d', 14, 1); px(rx + 6, ry + 5, fr, 3, 11); px(rx + 17, ry + 5, fr, 3, 11); px(rx + 7, ry + 5, '#ffe0dc', 1, 11); }
};
const ART = (s, ax, ay, a, b) => {
  const t = Z.t;
  if (s === 'chart') { px(ax, ay, a, 11, 8); px(ax + 1, ay + 1, b, 9, 6); [[2, 2], [5, 4], [7, 2], [3, 5]].forEach(([u, v]) => px(ax + u, ay + v, '#ffe0dc')); px(ax + 3, ay + 3, '#77d6c1', 2, 1); }
  if (s === 'photo') { px(ax + 1, ay, a, 8, 7); px(ax + 2, ay + 1, b, 6, 3); px(ax + 3, ay + 3, '#73392e', 1, 2); px(ax + 5, ay + 3, '#73392e', 1, 2); px(ax + 7, ay + 3, '#73392e', 1, 2); px(ax + 2, ay + 4, '#9cb93b', 6, 2); }
  if (s === 'cat') { px(ax, ay, a, 9, 11); px(ax + 2, ay + 3, b, 5, 4); px(ax + 2, ay + 2, b); px(ax + 6, ay + 2, b); px(ax + 3, ay + 4, '#ffb762'); px(ax + 5, ay + 4, '#ffb762'); px(ax + 1, ay + 8, '#ffe0dc', 7, 1); }
  if (s === 'clock') { px(ax + 2, ay, a, 7, 7); px(ax + 3, ay + 1, b, 5, 5); px(ax + 5, ay + 2, '#34111f', 1, 2); const m = Math.floor(t) % 4; px(ax + 5 + [0, 1, 0, -1][m], ay + 3 + [-1, 0, 1, 0][m], '#c76e46'); }
  if (s === 'planet') { px(ax - 1, ay, a, 13, 10); px(ax, ay + 1, '#041528', 11, 8); px(ax + 3, ay + 3, b, 5, 4); px(ax + 4, ay + 2, b, 3, 6); px(ax + 4, ay + 3, '#ffb762', 2, 1); px(ax + 1, ay + 5, '#ffb762', 9, 1); }
  if (s === 'pennant') { px(ax, ay, b, 1, 8); for (let q = 0; q < 8; q++) px(ax + 1 + q, ay + Math.round(q / 3), a, 1, Math.max(1, 6 - Math.round(q * .7))); }
  if (s === 'mirror') { px(ax + 1, ay, a, 8, 9); px(ax, ay + 1, a, 10, 7); px(ax + 2, ay + 1, b, 6, 7); px(ax + 1, ay + 2, b, 8, 5); px(ax + 3, ay + 2, '#ffe0dc', 1, 3); }
  if (s === 'land') { px(ax - 1, ay, a, 13, 10); px(ax, ay + 1, '#77d6c1', 11, 5); px(ax, ay + 6, b, 11, 3); px(ax + 3, ay + 3, '#6d8a8d', 3, 3); px(ax + 4, ay + 2, '#ffe0dc'); px(ax + 8, ay + 2, '#ffb762', 2, 2); }
  if (s === 'abstract') { px(ax, ay, a, 10, 10); px(ax + 1, ay + 1, b, 4, 4); px(ax + 5, ay + 5, '#1c92a7', 4, 4); px(ax + 6, ay + 1, '#ffb762', 3, 2); px(ax + 1, ay + 7, '#34111f', 3, 1); }
  if (s === 'map') { px(ax, ay, a, 11, 8); px(ax + 1, ay + 2, b, 4, 3); px(ax + 6, ay + 4, b, 3, 2); for (let q = 0; q < 4; q++) px(ax + 4 + q, ay + 5 - (q & 1), '#833f34'); px(ax, ay, '#eb9c6e', 1, 8); }
  if (s === 'cert') { px(ax, ay + 1, '#73392e', 11, 8); px(ax + 1, ay + 2, a, 9, 6); px(ax + 2, ay + 3, '#6d8a8d', 6, 1); px(ax + 2, ay + 5, '#6d8a8d', 4, 1); px(ax + 7, ay + 5, b, 2, 2); }
  if (s === 'guitar') { px(ax + 2, ay + 5, a, 5, 5); px(ax + 3, ay + 4, a, 3, 1); px(ax + 4, ay - 2, b, 1, 7); px(ax + 4, ay + 7, b); px(ax + 3, ay - 3, b, 3, 1); }
  if (s === 'dart') { px(ax + 2, ay, a, 7, 7); px(ax + 1, ay + 1, a, 9, 5); px(ax + 3, ay + 1, b, 5, 5); px(ax + 4, ay + 2, '#ffe0dc', 3, 3); px(ax + 5, ay + 3, b); px(ax + 7, ay + 2, '#ffb762', 2, 1); }
  if (s === 'kid') { px(ax, ay, a, 10, 9); px(ax + 2, ay + 2, '#ffb762', 2, 2); px(ax + 1, ay + 7, '#9cb93b', 8, 1); px(ax + 5, ay + 4, b, 3, 3); px(ax + 6, ay + 3, '#c76e46'); }
  if (s === 'open') { const on = Z.still || (Math.floor(t * 1.3) % 5); px(ax - 1, ay + 1, b, 13, 6); px(ax, ay + 2, on ? a : '#c03b94', 11, 1); px(ax, ay + 5, on ? a : '#c03b94', 11, 1); [0, 3, 6, 9].forEach(q => px(ax + q, ay + 3, on ? '#ffe0dc' : '#c03b94', 2, 2)); }
  if (s === 'heart') { const on = Z.still || (Math.floor(t * 1.1) % 4); px(ax, ay, b, 11, 9); const c = on ? a : '#73392e'; px(ax + 2, ay + 2, c, 3, 2); px(ax + 6, ay + 2, c, 3, 2); px(ax + 2, ay + 4, c, 7, 1); px(ax + 3, ay + 5, c, 5, 1); px(ax + 4, ay + 6, c, 3, 1); px(ax + 5, ay + 7, c); }
  if (s === 'goldrec') { px(ax, ay, '#73392e', 11, 10); px(ax + 1, ay + 1, b, 9, 8); px(ax + 3, ay + 2, a, 5, 5); px(ax + 2, ay + 3, a, 7, 3); px(ax + 5, ay + 4, b); px(ax + 4, ay + 2, '#ffe0dc'); }
  if (s === 'wanted') { px(ax, ay, a, 9, 11); px(ax + 1, ay + 1, b, 7, 1); px(ax + 3, ay + 3, b, 3, 3); px(ax + 2, ay + 6, b, 5, 2); px(ax + 1, ay + 9, '#833f34', 7, 1); }
  if (s === 'tickets') { [[0, 0, a], [5, 1, b], [2, 5, '#77d6c1'], [7, 6, '#9cb93b']].forEach(([u, v, c]) => { px(ax + u, ay + v, c, 5, 3); px(ax + u + 1, ay + v + 1, '#34111f', 2, 1); }); }
};
const LIGHT = (s, lx, ry, a, b) => {
  const t = Z.t, glowC = s === 'disco' || s === 'spots' ? '#ffe0dc' : a; alpha(.12, () => { for (let y = 0; y < RH - 6; y++) { const w = 3 + y * .9; px(lx - w, ry + 3 + y, glowC, w * 2, 1); } });
  const cord = n => px(lx, ry, '#293b49', 1, n);
  if (s === 'bulb') { cord(3); px(lx - 1, ry + 3, a, 3, 2); }
  if (s === 'pendant') { cord(4); px(lx - 3, ry + 4, b, 7, 2); px(lx - 2, ry + 3, b, 5, 1); px(lx - 1, ry + 6, a, 3, 1); }
  if (s === 'strip') { px(lx - 8, ry, '#bfc3c6', 17, 1); px(lx - 7, ry + 1, a, 15, 1); }
  if (s === 'lantern') { cord(3); px(lx - 2, ry + 3, b, 5, 5); px(lx - 1, ry + 4, a, 3, 3); px(lx - 2, ry + 5, b, 5, 1); }
  if (s === 'fairy') for (let x = -16; x <= 16; x += 4) { const y = ry + 2 + Math.round(Math.abs(Math.sin((x + 16) / 32 * Math.PI)) * 3); px(lx + x, y - 1, '#293b49'); px(lx + x, y, ['#c76e46', '#ffb762', '#9cb93b', '#77d6c1'][((x + 16) / 4 + (Z.still ? 0 : Math.floor(t * 2))) % 4]); }
  if (s === 'neon') { cord(2); px(lx - 3, ry + 2, a, 7, 1); px(lx - 3, ry + 6, a, 7, 1); px(lx - 4, ry + 3, a, 1, 3); px(lx + 4, ry + 3, a, 1, 3); }
  if (s === 'orb') { cord(3); px(lx - 2, ry + 3, a, 5, 5); px(lx - 3, ry + 4, a, 7, 3); px(lx - 1, ry + 4, b, 2, 2); }
  if (s === 'cage') { cord(2); px(lx - 2, ry + 2, b, 5, 6); px(lx - 1, ry + 3, a, 3, 4); px(lx - 2, ry + 4, b, 5, 1); px(lx, ry + 3, b, 1, 4); }
  if (s === 'spots') { px(lx - 10, ry, b, 21, 1); [-8, 0, 8].forEach(q => { px(lx + q - 1, ry + 1, b, 3, 2); px(lx + q, ry + 3, a); }); }
  if (s === 'chand') { cord(3); px(lx - 5, ry + 3, b, 11, 1); [-5, -2, 1, 4].forEach(q => { px(lx + q, ry + 2, a, 2, 1); px(lx + q, ry + 4, b, 2, 1); }); px(lx, ry + 5, a, 1, 2); }
  if (s === 'candles') { cord(3); px(lx - 4, ry + 3, b, 9, 1); [-4, -1, 2, 4].forEach((q, n) => { px(lx + q, ry + 1, '#ffe0dc', 1, 2); px(lx + q, ry, blink(3, n) ? a : '#ffb762'); }); }
  if (s === 'disco') { cord(3); px(lx - 2, ry + 3, '#bfc3c6', 5, 5); px(lx - 1, ry + 4, a); if (!Z.still) for (let q = 0; q < 6; q++) { const u = t * 1.5 + q; px(lx - RW / 2 + 4 + 2 + ((Math.sin(u) * .5 + .5) * (RW - 8)), ry + 8 + ((q * 5) % 14), ['#ff88a9', '#77d6c1', '#ffb762', '#9cb93b'][q % 4], 2, 1); } }
  if (s === 'jelly') { cord(2); const w = Z.still ? 0 : Math.round(Math.sin(t * 2)); px(lx - 3, ry + 2, a, 7, 3); px(lx - 2, ry + 1, a, 5, 1); for (let q = -2; q <= 2; q += 2) px(lx + q + (q ? w : 0), ry + 5, b, 1, 3 + (q ? 0 : 1)); }
  if (s === 'star') { cord(2); px(lx, ry + 2, a, 1, 7); px(lx - 3, ry + 5, a, 7, 1); px(lx - 1, ry + 4, a, 3, 3); }
  if (s === 'moon') { cord(2); px(lx - 2, ry + 2, a, 3, 7); px(lx - 3, ry + 3, a, 1, 5); px(lx + 1, ry + 2, a, 2, 1); px(lx + 1, ry + 8, a, 2, 1); }
  if (s === 'plasma') { cord(2); px(lx - 3, ry + 2, '#293b49', 7, 6); px(lx, ry + 4, b, 1, 2); if (!Z.still) for (let q = 0; q < 3; q++) { const u = t * 3 + q * 2; px(lx + Math.round(Math.cos(u) * 2.5), ry + 3 + Math.round(Math.sin(u) * 2) + 1, a); } }
};
const drawPlant = (s, qx, FY, ry, rx, a, b) => {
  const t = Z.t, pot = (c) => { px(qx, FY - 3, c || '#c76e46', 5, 3); px(qx - 1, FY - 4, c ? '#293b49' : '#833f34', 7, 1); };
  if (s === 'cactus') { pot(); px(qx + 2, FY - 9, a, 2, 5); px(qx + 1, FY - 7, a, 1, 2); px(qx + 4, FY - 8, a, 1, 2); px(qx + 2, FY - 10, b); }
  if (s === 'fern') { pot(); [[-2, -6], [-1, -8], [1, -9], [3, -8], [5, -6], [2, -7]].forEach(([u, v]) => { px(qx + 2 + u / 2, FY - 4 + v / 2, b); px(qx + 2 + u, FY - 4 + v, a, 2, 1); }); px(qx + 2, FY - 8, a, 1, 4); }
  if (s === 'sunflower') { pot(); px(qx + 2, FY - 12, '#9cb93b', 1, 8); px(qx + 3, FY - 8, '#9cb93b', 2, 1); px(qx, FY - 16, a, 5, 5); px(qx + 1, FY - 15, b, 3, 3); }
  if (s === 'bonsai') { px(qx - 1, FY - 2, '#6d8a8d', 7, 2); px(qx + 2, FY - 6, '#833f34', 1, 4); px(qx + 1, FY - 6, '#833f34'); px(qx - 1, FY - 9, a, 5, 3); px(qx + 2, FY - 10, b, 4, 3); }
  if (s === 'palm') { pot(); px(qx + 2, FY - 18, b, 1, 14); [[-4, 2], [-3, -1], [3, -1], [4, 2], [-2, -2], [2, -2], [0, -3]].forEach(([u, v]) => px(qx + 2 + u, FY - 18 + v, a, 2, 1)); }
  if (s === 'tulips') { pot(); [0, 2, 4].forEach((u, n) => { px(qx + u, FY - 9 + (n & 1), b, 1, 5); px(qx + u, FY - 11 + (n & 1), a, 1, 2); px(qx + u - (n ? 0 : 0), FY - 11 + (n & 1), a, 1, 1); }); }
  if (s === 'succ') { px(qx - 1, FY - 3, '#bfc3c6', 7, 3); px(qx, FY - 5, a, 2, 2); px(qx + 3, FY - 6, b, 2, 3); px(qx + 1, FY - 6, a); }
  if (s === 'snake') { pot(); [0, 2, 4].forEach((u, n) => { const h = [8, 11, 7][n]; px(qx + u, FY - 4 - h, a, 1, h); px(qx + u, FY - 4 - h, b); }); }
  if (s === 'monstera') { pot(); px(qx + 2, FY - 9, '#458239', 1, 5); [[-3, -12], [2, -14], [-1, -10]].forEach(([u, v]) => { px(qx + 2 + u, FY + v, a, 4, 3); px(qx + 3 + u, FY + v + 1, '#34111f'); px(qx + 2 + u, FY + v, b); }); }
  if (s === 'bamboo') { px(qx, FY - 3, '#bfc3c6', 5, 3); [1, 3].forEach((u, n) => { px(qx + u, FY - 13 + n * 2, a, 1, 10 - n * 2); px(qx + u, FY - 9, '#458239'); px(qx + u + 1, FY - 12 + n * 2, b); }); }
  if (s === 'rose') { pot(); px(qx - 1, FY - 9, b, 7, 5); [[0, -9], [3, -8], [1, -6], [4, -6]].forEach(([u, v]) => px(qx + u, FY + v, a, 2, 1)); }
  if (s === 'herbs') { px(qx - 2, FY - 3, '#833f34', 9, 3); for (let q = 0; q < 8; q += 2) { px(qx - 2 + q, FY - 6 + (q % 4 ? 1 : 0), a, 1, 3); px(qx - 1 + q, FY - 5, b); } }
  if (s === 'ivy') { px(rx + RW - 8, ry, '#c76e46', 5, 2); for (let q = 0; q < 10; q++) { px(rx + RW - 6 + (q % 2), ry + 2 + q, a); if (q % 2) px(rx + RW - 7 + (q % 3), ry + 2 + q, b); } }
  if (s === 'shroom') { const gl = Z.still ? 1 : .6 + .4 * Math.sin(t * 1.5); alpha(.25 * gl, () => px(qx - 3, FY - 10, a, 11, 10)); [[0, 5], [3, 7], [5, 4]].forEach(([u, h]) => { px(qx + u + 1, FY - h + 2, '#bfc3c6', 1, h - 2); px(qx + u, FY - h, a, 3, 2); px(qx + u + 1, FY - h, b); }); }
  if (s === 'crystal') { pot('#6d8a8d'); px(qx + 1, FY - 10, a, 2, 6); px(qx + 3, FY - 8, b, 2, 4); px(qx + 1, FY - 11, '#ffe0dc'); if (blink(1.3)) px(qx + 4, FY - 9, '#ffe0dc'); }
  if (s === 'tentacle') { pot('#293b49'); for (let q = 0; q < 3; q++) for (let y = 0; y < 9; y++) px(qx + q * 2 + Math.round(Math.sin(t * 1.5 + y * .6 + q) * (y / 6)), FY - 4 - y, y > 6 ? b : a); }
  if (s === 'trap') { pot(); px(qx + 2, FY - 8, '#458239', 1, 4); const o = blink(.4) ? 1 : 0; px(qx, FY - 11 - o, a, 5, 2); px(qx, FY - 9 + o, a, 5, 1); px(qx + 1, FY - 10, b, 3, 1); }
  if (s === 'lily') { pot('#6d8a8d'); px(qx + 2, FY - 10, '#458239', 1, 6); alpha(.3, () => px(qx - 2, FY - 15, b, 9, 7)); px(qx + 2, FY - 14, a, 1, 5); px(qx, FY - 12, a, 5, 1); px(qx + 2, FY - 12, b); }
};
const FURN = (s, fx, FY, a, b) => {
  const t = Z.t;
  if (s === 'chair') { px(fx, FY - 8, a, 3, 8); px(fx, FY - 4, b, 9, 2); px(fx + 7, FY - 6, a, 2, 4); px(fx + 1, FY - 2, '#34111f', 1, 2); px(fx + 7, FY - 2, '#34111f', 1, 2); }
  if (s === 'beanbag') { px(fx + 1, FY - 4, a, 8, 4); px(fx + 2, FY - 5, a, 6, 1); px(fx + 2, FY - 4, b, 3, 1); }
  if (s === 'books') { px(fx, FY - 16, a, 10, 16); [[-15, ['#c76e46', '#1c92a7', '#ffb762', '#9cb93b']], [-10, ['#ff88a9', '#77d6c1', '#9cb93b']], [-5, ['#ffb762', '#833f34', '#6d8a8d', '#ffe0dc']]].forEach(([oy, cs]) => cs.forEach((c, q) => px(fx + 1 + q * 2, FY + oy, c, 2, 4))); }
  if (s === 'records') { px(fx, FY - 6, a, 9, 6); px(fx + 1, FY - 8, '#34111f', 7, 2); px(fx + 3 + (Z.still ? 0 : Math.floor(t * 4) % 3), FY - 8, b); if (blink(1)) px(fx + 8, FY - 12, '#ffe0dc'); }
  if (s === 'lava') { px(fx + 3, FY - 2, '#6d8a8d', 4, 2); px(fx + 3, FY - 10, a, 4, 8); const q = Z.still ? 0 : Math.round(Math.sin(t * .8) * 2); px(fx + 4, FY - 7 + q, b, 2, 2); px(fx + 4, FY - 4 - q, '#ffb762', 2, 1); px(fx + 3, FY - 11, '#6d8a8d', 4, 1); }
  if (s === 'tank') { px(fx, FY - 8, '#6d8a8d', 11, 8); px(fx + 1, FY - 9, a, 9, 6); px(fx + 1, FY - 9, '#77d6c1', 9, 1); const f = Z.still ? 3 : Math.floor((t * 3) % 14), q = f < 7 ? f : 13 - f; px(fx + 2 + q, FY - 6, b, 2, 1); px(fx + 5, FY - 5, '#9cb93b', 1, 2); }
  if (s === 'sofa') { px(fx, FY - 7, a, 12, 4); px(fx, FY - 4, b, 12, 2); px(fx, FY - 6, a, 2, 4); px(fx + 10, FY - 6, a, 2, 4); px(fx + 1, FY - 2, '#34111f', 1, 2); px(fx + 10, FY - 2, '#34111f', 1, 2); }
  if (s === 'globe') { px(fx + 2, FY - 2, '#833f34', 6, 2); px(fx + 4, FY - 4, '#833f34', 2, 2); px(fx + 2, FY - 10, a, 6, 6); px(fx + 3, FY - 9, b, 2, 2); px(fx + 5, FY - 7, b, 2, 2); px(fx + 1, FY - 10, '#eb9c6e', 1, 6); }
  if (s === 'tv') { px(fx, FY - 3, '#73392e', 10, 3); px(fx, FY - 11, a, 10, 8); px(fx + 1, FY - 10, blink(.7) ? b : '#bfc3c6', 7, 6); px(fx + 8, FY - 9, '#ffb762'); px(fx + 3, FY - 13, '#6d8a8d', 1, 2); px(fx + 6, FY - 13, '#6d8a8d', 1, 2); }
  if (s === 'coffee') { px(fx + 1, FY - 11, a, 8, 11); px(fx + 2, FY - 10, '#273b2d', 6, 3); px(fx + 3, FY - 5, '#ffe0dc', 3, 3); px(fx + 7, FY - 9, b); if (!Z.still && Math.floor(t * 2) % 3) px(fx + 4, FY - 7 - Math.floor(t * 3) % 2, '#bfc3c6'); }
  if (s === 'easel') { px(fx + 2, FY - 13, a, 1, 13); px(fx + 7, FY - 13, a, 1, 13); px(fx + 1, FY - 13, '#ffe0dc', 8, 7); px(fx + 2, FY - 12, b, 3, 2); px(fx + 5, FY - 10, '#77d6c1', 3, 2); }
  if (s === 'punch') { px(fx + 4, FY - 22, '#6d8a8d', 1, 4); const w = Z.still ? 0 : Math.round(Math.sin(t * 1.4)); px(fx + 2 + w, FY - 18, a, 5, 10); px(fx + 2 + w, FY - 18, b, 5, 1); px(fx + 2 + w, FY - 9, b, 5, 1); }
  if (s === 'piano') { px(fx, FY - 13, a, 12, 13); px(fx - 1, FY - 6, a, 14, 1); px(fx, FY - 7, b, 12, 1); for (let q = 1; q < 12; q += 2) px(fx + q, FY - 7, '#34111f'); px(fx + 2, FY - 11, '#73392e', 8, 3); }
  if (s === 'arcade') { px(fx, FY - 15, a, 9, 15); px(fx + 1, FY - 13, blink(3) ? '#9cb93b' : '#77d6c1', 7, 5); px(fx + 1, FY - 6, '#34111f', 7, 2); px(fx + 2, FY - 6, '#c76e46'); px(fx + 5, FY - 6, '#ffb762'); px(fx + 1, FY - 15, b, 7, 1); }
  if (s === 'catbed') { px(fx, FY - 3, a, 11, 3); px(fx + 1, FY - 4, '#c76e46', 9, 1); px(fx + 3, FY - 6, b, 5, 3); px(fx + 3, FY - 7, b); px(fx + 7, FY - 7, b); px(fx + 7, FY - 5, '#34111f'); if (!Z.still && Math.floor(t * .6) % 4 === 0) px(fx + 9, FY - 9, '#ffe0dc'); }
  if (s === 'robodog') { const w = Z.still ? 0 : Math.round(Math.sin(t * 1.2) * 2); const x = fx + 2 + w; px(x, FY - 5, a, 7, 3); px(x + 6, FY - 7, a, 3, 3); px(x + 7, FY - 6, b); px(x, FY - 2, '#6d8a8d', 1, 2); px(x + 5, FY - 2, '#6d8a8d', 1, 2); px(x - 1, FY - 6, a); }
  if (s === 'jukebox') { px(fx, FY - 14, a, 10, 14); px(fx + 1, FY - 13, b, 8, 3); px(fx + 2, FY - 9, '#34111f', 6, 4); for (let q = 0; q < 4; q++) px(fx + 1 + q * 2, FY - 4, ['#c76e46', '#ffb762', '#9cb93b', '#77d6c1'][(q + Math.floor(t * 3)) % 4], 1, 2); }
  if (s === 'gumball') { px(fx + 3, FY - 3, a, 5, 3); px(fx + 4, FY - 4, '#6d8a8d', 3, 1); px(fx + 2, FY - 11, b, 7, 7); [[3, -10, '#c76e46'], [5, -9, '#ffb762'], [4, -7, '#77d6c1'], [6, -6, '#9cb93b'], [3, -6, '#ff88a9']].forEach(([u, v, c]) => px(fx + u, FY + v, c)); }
  if (s === 'holo') { px(fx + 2, FY - 2, a, 7, 2); alpha(Z.still ? .6 : .45 + .2 * Math.sin(t * 3), () => { px(fx + 3, FY - 10, b, 5, 8); px(fx + 4, FY - 12, b, 3, 2); }); px(fx + 5, FY - 9, '#ffe0dc'); }
};
const CEIL = (s, rx, ry, a) => {
  const t = Z.t, cx2 = rx + 5;
  if (s === 'vent') { px(cx2, ry, a, 8, 3); px(cx2 + 1, ry + 1, '#293b49', 6, 1); }
  if (s === 'ac') { px(cx2, ry, a, 10, 4); px(cx2 + 1, ry + 3, '#6d8a8d', 8, 1); px(cx2 + 8, ry + 1, blink(1.5) ? '#9cb93b' : '#9cb93b'); if (!Z.still && Math.floor(t * 2) % 3 === 0) px(cx2 + 3, ry + 5 + Math.floor(t * 4) % 2, '#bfc3c6'); }
  if (s === 'fan') { px(cx2 + 4, ry, '#6d8a8d', 1, 2); const f = blink(8); px(cx2 + (f ? 1 : 0), ry + 2, a, f ? 7 : 9, 1); px(cx2 + 3, ry + 2, '#6d8a8d', 3, 1); }
  if (s === 'cables') { px(rx, ry + 1, a, RW, 1); for (let x = 0; x < RW; x += 4) px(rx + x, ry + 2, ['#c76e46', '#1c92a7', '#ffb762'][(x / 4) % 3], 2, 1); }
  if (s === 'pipes') { px(rx, ry, a, RW, 2); px(rx, ry + 2, '#293b49', RW, 1); for (let x = 3; x < RW; x += 14) px(rx + x, ry, '#bfc3c6', 2, 3); }
  if (s === 'sprink') [10, 32].forEach(x => { px(rx + x, ry, '#bfc3c6', 1, 2); px(rx + x - 1, ry + 2, a, 3, 1); });
  if (s === 'duct') { px(rx, ry, a, RW, 3); for (let x = 5; x < RW; x += 10) px(rx + x, ry, '#6d8a8d', 1, 3); }
  if (s === 'chains') [6, 14].forEach((x, n) => { for (let y = 0; y < 5 + n * 2; y += 2) px(rx + x, ry + y, a); px(rx + x - 1, ry + 6 + n * 2, '#6d8a8d', 3, 1); });
  if (s === 'bunting') for (let x = 0; x < RW; x += 4) { const y = ry + 1 + Math.round(Math.sin(x / RW * Math.PI) * 3); px(rx + x, y, '#293b49', 4, 1); px(rx + x + 1, y + 1, ['#c76e46', '#ffb762', '#77d6c1', '#9cb93b'][(x / 4) % 4], 2, 2); }
  if (s === 'hangp') [8, 20].forEach(x => { px(rx + x, ry, '#bfc3c6', 1, 3); px(rx + x - 2, ry + 3, '#c76e46', 5, 2); px(rx + x - 2, ry + 5, a, 1, 3); px(rx + x + 2, ry + 5, a, 1, 2); px(rx + x, ry + 5, '#9cb93b', 1, 4); });
  if (s === 'wires') for (let x = 0; x < RW; x++) { px(rx + x, ry + 1 + Math.round(Math.abs(Math.sin(x / 7)) * 2), a); px(rx + x, ry + 2 + Math.round(Math.abs(Math.sin(x / 5 + 1)) * 2), '#833f34'); }
  if (s === 'mobile') { px(cx2 + 4, ry, '#6d8a8d', 1, 3); px(cx2, ry + 3, '#6d8a8d', 9, 1); const w = Z.still ? 0 : Math.round(Math.sin(t)); [[0, a], [4, '#77d6c1'], [8, '#c76e46']].forEach(([u, c], n) => { px(cx2 + u, ry + 4, '#6d8a8d', 1, 2 + n); px(cx2 + u - 1 + w * (n - 1), ry + 6 + n, c, 2, 2); }); }
  if (s === 'beams') { px(rx, ry, a, RW, 2); [4, 22, 38].forEach(x => px(rx + x, ry + 2, '#73392e', 2, 2)); }
  if (s === 'tubes') { px(rx + 2, ry + 1, blink(.5) || Z.still ? a : '#c03b94', RW - 4, 1); px(rx + 2, ry, '#293b49', 1, 2); px(rx + RW - 3, ry, '#293b49', 1, 2); }
  if (s === 'proj') { px(cx2 + 2, ry, '#293b49', 3, 2); for (let q = 0; q < 7; q++) { const x = (q * 13 + Math.floor(t * 2) * 3) % (RW - 4), y = 4 + (q * 7) % 16; if ((q + Math.floor(t)) % 3) px(rx + 2 + x, ry + y, a); } }
  if (s === 'ticker') { px(rx + 2, ry, '#34111f', RW - 4, 3); for (let x = 0; x < RW - 6; x++) if (((x + Math.floor(t * 8)) % 7) < 4 && x % 2) px(rx + 3 + x, ry + 1, a); }
  if (s === 'gtrim') { px(rx, ry, a, RW, 1); for (let x = 1; x < RW; x += 3) px(rx + x, ry + 1, '#eb9c6e'); }
  if (s === 'bubbles') { px(cx2, ry, '#6d8a8d', 5, 3); if (!Z.still) for (let q = 0; q < 4; q++) { const u = (t * .4 + q * .25) % 1; px(cx2 + 3 + Math.round(u * 26 + Math.sin(t * 3 + q) * 2), ry + 3 + Math.round(u * 16), a); } }
};
function drawInterior(now) {
  if (!inCv.isConnected) { inRaf = 0; return; }
  const g = inCv.getContext('2d'), t = now / 1000, W = inCv.width, H = inCv.height; Z.g = g; Z.t = t; Z.still = matchMedia('(prefers-reduced-motion: reduce)').matches; const still = Z.still;
  g.clearRect(0, 0, W, H);
  const hull = HULL_COLORS[S.ship.color] || '#bfc3c6', P = k => inPrev && inPrev[0] === k ? inPrev : null;
  // the hull: a body around both decks, an engine at the back and a pointed nose up front
  const x0 = IX - 4, x1 = IX + RW * 4 + 3, y0 = IY - 4, y1 = IY + RH * 2 + 2 + 3, mid = (y0 + y1) / 2;
  px(x0, y0, hull, x1 - x0, y1 - y0); px(x0 + 1, y1 - 2, 'rgba(0,0,0,.25)', x1 - x0 - 1, 2);
  for (let y = y0; y < y1; y++) { const w = Math.max(0, Math.round(20 - Math.abs(y - mid) * 20 / ((y1 - y0) / 2))); px(x1, y, hull, w, 1); if (w) px(x1 + w - 1, y, 'rgba(0,0,0,.2)'); } // nose
  px(x0 - 8, y0 + 8, '#6d8a8d', 8, y1 - y0 - 16); px(x0 - 10, y0 + 10, '#293b49', 2, y1 - y0 - 20); // engine block
  if (!still) { px(x0 - 13 - blink(5), y0 + 14, '#77d6c1', 3 + blink(5), y1 - y0 - 28); px(x0 - 15 - blink(5) * 2, y0 + 16, '#bfc3c6', 2, y1 - y0 - 32); }
  DECKS.forEach(row => row.forEach(k => {
    const [rx, ry] = roomXY(k), lv = roomAt(k);
    const d = cat => { const p = P(k), id = p && p[1] === cat ? p[2] : decOf(k, cat); return decItem(cat, id); };
    if (!lv) { // locked: a metal shutter with hazard stripes and a padlock
      px(rx, ry, '#6d8a8d', RW, RH); for (let y = 2; y < RH - 4; y += 3) px(rx, ry + y, '#293b49', RW, 1);
      for (let x = 0; x < RW; x++) px(rx + x, ry + RH - 4, ((x >> 2) & 1) ? '#ffb762' : '#041528', 1, 4);
      const lx = rx + RW / 2 - 3, ly = ry + RH / 2 - 4; px(lx + 1, ly - 3, '#bfc3c6', 1, 3); px(lx + 4, ly - 3, '#bfc3c6', 1, 3); px(lx + 1, ly - 3, '#bfc3c6', 4, 1); px(lx, ly, '#ffb762', 6, 5); px(lx + 2, ly + 2, '#833f34', 2, 2);
      if (inHover === k) alpha(.18, () => px(rx, ry, '#ffb762', RW, RH));
      px(rx + RW - 1, ry, 'rgba(0,0,0,.35)', 1, RH); return;
    }
    const wl = d('wall'), pw = PAT[wl[4]], wa = decArt('wall', wl[0]); if (wa) artTile(wa, rx, ry, RW, RH - 4); else { px(rx, ry, wl[5] || '#293b49', RW, RH - 4); for (let y = 0; y < RH - 4; y++) for (let x = 0; x < RW; x++) if (pw && pw(x, y)) px(rx + x, ry + y, wl[6]); }
    const wn = d('window'), wnA = decArt('window', wn[0]); if (wnA) { const [w, h] = artFrame(wnA); artAt(wnA, rx + 13 - w / 2, ry + 10 - h / 2); } else if (wn[4] !== 'none') WIN(wn[4], rx, ry, wn[5], wn[6]);
    const ar = d('art'), arA = decArt('art', ar[0]); if (arA) { const [w, h] = artFrame(arA); artAt(arA, rx + 32 - w / 2, ry + 10 - h / 2); } else if (ar[4] !== 'none') ART(ar[4], rx + 27, ry + 5, ar[5], ar[6]);
    const fl = d('floor'), pf = PAT[fl[4]], flA = decArt('floor', fl[0]); if (flA) artTile(flA, rx, ry + RH - 4, RW, 4); else { px(rx, ry + RH - 4, fl[5] || '#6d8a8d', RW, 4); for (let x = 0; x < RW; x++) for (let y = 0; y < 4; y++) if (pf && pf(x, y)) px(rx + x, ry + RH - 4 + y, fl[6]); }
    px(rx, ry + RH - 5, 'rgba(0,0,0,.25)', RW, 1);
    const FY = ry + RH - 4, mx = rx + 15; // floor line, and where the room's own furniture stands
    const F = {
      bridge: () => { px(mx + 2, FY - 7, '#293b49', 16, 7); px(mx + 3, FY - 6, '#77d6c1', 6, 2); px(mx + 11, FY - 6, blink(2) ? '#9cb93b' : '#9cb93b', 5, 2); px(mx + 4, FY - 3, '#ffb762'); px(mx + 7, FY - 3, '#c76e46'); px(mx + 10, FY - 3, '#9cb93b'); px(mx - 3, FY - 6, '#833f34', 4, 4); px(mx - 3, FY - 2, '#34111f', 1, 2); },
      quarters: () => { const n = Math.min(3, Math.ceil(roomPow('quarters') / 2)); for (let b = 0; b < n; b++) { const by = FY - 4 - b * 6; px(mx, by, '#6d8a8d', 16, 1); px(mx, by - 2, '#ffe0dc', 16, 2); px(mx, by - 2, '#77d6c1', 4, 2); px(mx, by, '#6d8a8d', 1, 4 + b * 6); px(mx + 15, by, '#6d8a8d', 1, 4 + b * 6); } },
      galley: () => { px(mx, FY - 8, '#bfc3c6', 18, 1); px(mx, FY - 7, '#833f34', 18, 7); px(mx + 2, FY - 10, '#293b49', 5, 2); px(mx + 11, FY - 9, '#c76e46', 4, 1); if (!still && Math.floor(t * 3) % 3) px(mx + 4, FY - 12 - (Math.floor(t * 3) & 1), '#bfc3c6'); },
      lab: () => { px(mx, FY - 7, '#bfc3c6', 18, 1); px(mx + 1, FY - 6, '#6d8a8d', 1, 6); px(mx + 16, FY - 6, '#6d8a8d', 1, 6); px(mx + 3, FY - 10, '#9cb93b', 2, 3); px(mx + 7, FY - 11, '#77d6c1', 2, 4); px(mx + 11, FY - 9, '#ff88a9', 3, 2); if (blink(1.5)) px(mx + 7, FY - 13, '#bfc3c6'); },
      workshop: () => { px(mx, FY - 6, '#833f34', 18, 2); px(mx + 1, FY - 4, '#73392e', 2, 4); px(mx + 15, FY - 4, '#73392e', 2, 4); px(mx + 4, FY - 8, '#6d8a8d', 5, 2); px(mx + 12, FY - 9, '#ffb762', 1, 3); if (!still && Math.floor(t * 6) % 5 === 0) { px(mx + 8, FY - 10, '#ffdaac'); px(mx + 10, FY - 9, '#ffe0dc'); } },
      deck: () => { px(mx + 6, FY - 2, '#6d8a8d', 6, 2); px(mx + 8, FY - 9, '#6d8a8d', 2, 7); px(mx + 4, FY - 13, '#bfc3c6', 9, 3); px(mx + 12, FY - 14, '#77d6c1', 2, 5); },
      hold: () => { const n = Math.min(6, Math.floor(roomPow('hold')) + 1); for (let b = 0; b < n; b++) { const bx = mx + (b % 3) * 6, by = FY - 5 - Math.floor(b / 3) * 5; px(bx, by, '#c76e46', 5, 5); px(bx, by, '#eb9c6e', 5, 1); px(bx + 2, by + 1, '#833f34', 1, 4); } },
      medbay: () => { px(mx, FY - 5, '#ffe0dc', 16, 2); px(mx, FY - 6, '#bfc3c6', 4, 1); px(mx + 1, FY - 3, '#6d8a8d', 1, 3); px(mx + 14, FY - 3, '#6d8a8d', 1, 3); px(mx + 7, FY - 15, '#c76e46', 4, 1); px(mx + 8, FY - 16, '#c76e46', 2, 3); },
    };
    F[k] && F[k]();
    const fu = d('furn'), fuA = decArt('furn', fu[0]); if (fuA) { const [, h] = artFrame(fuA); artAt(fuA, rx + 2, FY - h); } else if (fu[4] !== 'none') FURN(fu[4], rx + 2, FY, fu[5], fu[6]);
    const pl = d('plant'), plA = decArt('plant', pl[0]); if (plA) { const [w, h] = artFrame(plA); artAt(plA, rx + RW - 2 - w, FY - h); } else if (pl[4] !== 'none') drawPlant(pl[4], rx + RW - 8, FY, ry, rx, pl[5], pl[6]);
    const ce = d('ceil'), ceA = decArt('ceil', ce[0]); if (ceA) { const [w] = artFrame(ceA); artAt(ceA, w >= RW ? rx : rx + 5, ry); } else if (ce[4] !== 'none') CEIL(ce[4], rx, ry, ce[5]);
    const li = d('light'), liA = decArt('light', li[0]), lx = rx + RW / 2 + 4; if (liA) { const [w] = artFrame(liA); alpha(.12, () => { for (let y = 0; y < RH - 6; y++) { const gw = 3 + y * .9; px(lx - gw, ry + 3 + y, li[5] || '#ffb762', gw * 2, 1); } }); artAt(liA, lx - Math.floor(w / 2), ry); } else LIGHT(li[4], lx, ry, li[5], li[6]);
    // crew: they stay in their room this session, shuffling about a little
    crewIn(k).forEach((c, m, all) => {
      const ph = m * 2.1 + c.name.length, base = rx + 8 + (m + 1) * (RW - 16) / (all.length + 1), bx = Math.round(base + (still ? 0 : Math.sin(t * .5 + ph) * 3)), step = !still && Math.abs(Math.cos(t * .5 + ph)) > .3 ? blink(4, m) : 0;
      px(bx, FY - 9, '#73392e', 2, 1); px(bx, FY - 8, '#ffb762', 2, 2); px(bx, FY - 6, ROLE_C[c.role] || '#bfc3c6', 2, 4); px(bx + step, FY - 2, '#34111f', 1, 2); px(bx + 1 - step, FY - 2, '#34111f', 1, 2); if (c.vet) px(bx, FY - 10, '#ffb762', 2, 1);
    });
    // this room's stretch of hull lights: along the top edge for the upper deck, the bottom edge for the lower deck
    const hl = d('lights'), hlA = decArt('lights', hl[0]), hm = hlA && hl[4] === 'img' ? 'steady' : hl[4], deck = DECKS[0].includes(k) ? 0 : 1, col = DECKS[deck].indexOf(k);
    if (hm !== 'none') { const cs = hl.slice(5), N = Math.floor(RW / 6), hy = deck ? IY + RH * 2 + 2 + 1 : IY - 3;
      for (let q = 0; q < N; q++) { const n = col * N + q, x = rx + 3 + q * 6; let c = cs[0] || '#ffb762', on = true;
        if (hm === 'alt') c = cs[n % 2]; if (hm === 'twinkle') on = still || ((n * 7 + Math.floor(t * 2)) % 5) > 0; if (hm === 'pulse') on = still || Math.floor(t * 1.5) % 2 === 0;
        if (hm === 'chase') c = cs[(n + Math.floor(t * 4)) % cs.length]; if (hm === 'strobe') { c = cs[Math.floor(t * 4) % 2]; on = still || (n % 2) === Math.floor(t * 4) % 2; }
        if (hm === 'sweep') on = still || Math.abs(q - (t * 10) % (N + 4)) < 1.5; if (hm === 'comet') { const dd = ((t * 6) % (N + 4)) - q; on = still || (dd >= 0 && dd < 4); if (dd > 0) c = dd < 1 ? '#ffe0dc' : cs[0]; }
        if (on) { if (hlA) { const [w, h] = artFrame(hlA); artAt(hlA, x - Math.floor(w / 2), hy - Math.floor(h / 2)); } else px(x, hy, c); } } }
    const edge = c => { px(rx, ry, c, RW, 1); px(rx, ry + RH - 1, c, RW, 1); px(rx, ry, c, 1, RH); px(rx + RW - 1, ry, c, 1, RH); };
    if (inSel === k) edge('#ffb762'); else if (inHover === k) alpha(.5, () => edge('#ffdaac'));
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
inCv.addEventListener('mousemove', e => { const k = inRoomAt(e); if (k !== inHover) { inHover = k; inTip.textContent = plain(inTipFor(k || inSel)); inCv.style.cursor = k ? 'pointer' : ''; } });
inCv.addEventListener('mouseleave', () => { inHover = null; inTip.textContent = plain(inTipFor(inSel)); });
inCv.addEventListener('click', e => { const k = inRoomAt(e); if (!k) return; if (!roomAt(k)) { inTip.textContent = plain(inTipFor(k)); return; } inSel = k; drawShip(); });
function interiorView() { // the Ship page: cutaway on top, decorating below
  if (!roomAt(inSel)) inSel = 'bridge';
  if (!inRaf) inRaf = requestAnimationFrame(drawInterior);
  inTip.textContent = plain(inTipFor(inSel));
  const lock = focusLock(), [ic, name] = ROOM_NAME(inSel);
  const itemBtn = (cat, it, on) => {
    const b = el('button', { type: 'button', class: 'sx-dec' + (on ? ' on' : ''), disabled: lock || null, onclick: () => decBuy(cat, it[0]) },
      el('b', {}, it[1]), el('small', {}, on ? 'In use' : 'Use here'));
    const prev = () => { inPrev = SHIP_DECOR[cat] ? null : [inSel, cat, it[0]]; }, unprev = () => { inPrev = null; };
    b.addEventListener('mouseenter', prev); b.addEventListener('mouseleave', unprev); b.addEventListener('focus', prev); b.addEventListener('blur', unprev);
    return b; };
  const catBtns = ['wall', 'floor', 'window', 'art', 'light', 'plant', 'furn', 'ceil', 'lights'].map(k => [k, DECOR[k]]).map(([k, [label]]) => el('button', { type: 'button', role: 'tab', class: 'sl-stab', 'aria-selected': String(k === inCat), onclick: () => { inCat = k; drawShip(); } }, label));
  const colors = Object.entries(HULL_COLORS).map(([k, hex]) => { const on = S.ship.color === k;
    return el('button', { type: 'button', class: 'sx-swatch' + (on ? ' on' : ''), title: k, disabled: lock || null, onclick: () => buyStyle('color', k) }, el('i', { style: 'background:' + hex }), el('span', {}, k)); });
  return [el('div', { class: 'sx-interior' }, inCv, inTip),
    el('div', { class: 'sx-sec' }, el('h3', {}, 'Decorate: ' + ic + ' ' + name), el('p', { class: 'sl-muted' }, lock ? 'Decorating waits until the study session is over. You can still look.' : 'Every decoration is yours to use, in any room. Hover one to preview it. Click a room above to pick it.'),
      el('div', { class: 'sl-stabs', role: 'tablist' }, catBtns), el('div', { class: 'sx-decs' }, DECOR[inCat][1].map(it => itemBtn(inCat, it, decOf(inSel, inCat) === it[0])))),
    el('div', { class: 'sx-sec' }, el('h3', {}, 'Whole ship'), el('div', { class: 'sx-decrow' }, el('h4', {}, 'Hull paint'), el('div', { class: 'sx-swatches' }, colors)),
      el('p', { class: 'sl-muted' }, decOwned() + ' of ' + decTotal() + ' decorations tried so far.'))];
}
