/* Solarist: The ship's cutaway view: rooms, decorations (and your own art), crew. */
'use strict';

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
const drawPlant = (s, qx, FY, ry, rx, a, b) => {
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
      quarters: () => { const n = Math.min(3, Math.ceil(roomPow('quarters') / 2)); for (let b = 0; b < n; b++) { const by = FY - 4 - b * 6; px(mx, by, '#819796', 16, 1); px(mx, by - 2, '#ebede9', 16, 2); px(mx, by - 2, '#73bed3', 4, 2); px(mx, by, '#577277', 1, 4 + b * 6); px(mx + 15, by, '#577277', 1, 4 + b * 6); } },
      galley: () => { px(mx, FY - 8, '#c7cfcc', 18, 1); px(mx, FY - 7, '#7a4841', 18, 7); px(mx + 2, FY - 10, '#394a50', 5, 2); px(mx + 11, FY - 9, '#cf573c', 4, 1); if (!still && Math.floor(t * 3) % 3) px(mx + 4, FY - 12 - (Math.floor(t * 3) & 1), '#c7cfcc'); },
      lab: () => { px(mx, FY - 7, '#c7cfcc', 18, 1); px(mx + 1, FY - 6, '#577277', 1, 6); px(mx + 16, FY - 6, '#577277', 1, 6); px(mx + 3, FY - 10, '#a8ca58', 2, 3); px(mx + 7, FY - 11, '#73bed3', 2, 4); px(mx + 11, FY - 9, '#df84a5', 3, 2); if (blink(1.5)) px(mx + 7, FY - 13, '#a4dddb'); },
      workshop: () => { px(mx, FY - 6, '#a53030', 18, 2); px(mx + 1, FY - 4, '#602c2c', 2, 4); px(mx + 15, FY - 4, '#602c2c', 2, 4); px(mx + 4, FY - 8, '#819796', 5, 2); px(mx + 12, FY - 9, '#e8c170', 1, 3); if (!still && Math.floor(t * 6) % 5 === 0) { px(mx + 8, FY - 10, '#d0da91'); px(mx + 10, FY - 9, '#ebede9'); } },
      deck: () => { px(mx + 6, FY - 2, '#577277', 6, 2); px(mx + 8, FY - 9, '#577277', 2, 7); px(mx + 4, FY - 13, '#c7cfcc', 9, 3); px(mx + 12, FY - 14, '#73bed3', 2, 5); },
      hold: () => { const n = Math.min(6, Math.floor(roomPow('hold')) + 1); for (let b = 0; b < n; b++) { const bx = mx + (b % 3) * 6, by = FY - 5 - Math.floor(b / 3) * 5; px(bx, by, '#be772b', 5, 5); px(bx, by, '#de9e41', 5, 1); px(bx + 2, by + 1, '#884b2b', 1, 4); } },
      medbay: () => { px(mx, FY - 5, '#ebede9', 16, 2); px(mx, FY - 6, '#c7cfcc', 4, 1); px(mx + 1, FY - 3, '#819796', 1, 3); px(mx + 14, FY - 3, '#819796', 1, 3); px(mx + 7, FY - 15, '#cf573c', 4, 1); px(mx + 8, FY - 16, '#cf573c', 2, 3); },
    };
    F[k] && F[k]();
    const fu = d('furn'), fuA = decArt('furn', fu[0]); if (fuA) { const [, h] = artFrame(fuA); artAt(fuA, rx + 2, FY - h); } else if (fu[4] !== 'none') FURN(fu[4], rx + 2, FY, fu[5], fu[6]);
    const pl = d('plant'), plA = decArt('plant', pl[0]); if (plA) { const [w, h] = artFrame(plA); artAt(plA, rx + RW - 2 - w, FY - h); } else if (pl[4] !== 'none') drawPlant(pl[4], rx + RW - 8, FY, ry, rx, pl[5], pl[6]);
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
