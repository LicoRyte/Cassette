/* Solarist: You and your crew. Everyone is a name, pronouns, an age, a profession, a trait, something to wear and something
   to carry. Traits, clothing and equipment are plain text from content/items.json: they change how stories are written,
   never stats. Spare items wait in the ship's stash; crafting turns 1 Knowledge point into a random new one. */
'use strict';

const CREW_MAX = 5;
const PRONOUNS = ['she', 'he', 'they'];
const PROFESSIONS = Object.keys(ROLES).concat(['Botanist', 'Geologist', 'Astronomer', 'Cartographer', 'Navigator', 'Mechanic', 'Artist', 'Musician', 'Linguist', 'Archivist']);
const itemById = id => TEXT.items.find(it => it.id === id) || null;
// what everyone wears: one of each (content/items.json "slot"), and one piece of equipment to carry ('gear')
const WEAR_SLOTS = [['hat', 'Hat'], ['acc', 'Accessory'], ['top', 'Top'], ['bottom', 'Bottom'], ['feet', 'Shoes']];
const SLOT_KEYS = WEAR_SLOTS.map(s => s[0]);
const slotOf = it => !it ? null : it.kind === 'equipment' ? 'gear' : it.kind === 'clothing' ? it.slot || 'top' : null;
const slotItems = slot => slot === 'gear' ? txItems('equipment') : txItems('clothing').filter(it => (it.slot || 'top') === slot);
const worn = p => SLOT_KEYS.map(k => itemById(p[k])).filter(Boolean);
// "a crisp crew uniform" but "cargo trousers": things named in the plural get no article
const aName = n => { const head = n.split(/ (with|on|printed|shaped|full|of) /)[0]; return /[^s]s$/.test(head) ? n : (/^[aeiou]/i.test(n) ? 'an ' : 'a ') + n; };
const pk2 = (a, r) => a[Math.floor((r || Math.random)() * a.length)];

// the captain is S.me (their name stays in S.pilot.name, which the title sequence asks for)
if (!S.me) S.me = {};
if (!Array.isArray(S.stash)) S.stash = []; // item ids nobody is using
if (!Array.isArray(S.shipGear)) S.shipGear = []; // ship equipment (items.json, kind "ship")
if (!S.bond) S.bond = {}; // how many study sessions each pair has shared (never shown: it only changes how they talk)
function fillPerson(p, r) { // give anyone missing a detail something sensible
  if (!p.id) p.id = p === S.me ? 'me' : 'p' + Date.now().toString(36) + Math.floor((r || Math.random)() * 1e6).toString(36);
  if (!PRONOUNS.includes(p.pronouns)) p.pronouns = 'they';
  if (p.age == null || p.age === '') p.age = 20 + Math.floor((r || Math.random)() * 45);
  if (!p.role) p.role = pk2(PROFESSIONS, r);
  if (!itemById(p.trait)) { const t = txRandomItem(r, 'trait'); p.trait = t ? t.id : ''; }
  if (p.trait2 === undefined || p.trait2 === p.trait || (p.trait2 && !itemById(p.trait2))) p.trait2 = ''; // a second trait is optional
  if (p.wear !== undefined) { const w = itemById(p.wear); if (w && !p[slotOf(w)]) p[slotOf(w)] = w.id; else if (w) S.stash.push(w.id); delete p.wear; } // one outfit became five slots
  SLOT_KEYS.forEach(k => { if (p[k] !== undefined) return; const L = slotItems(k), rr = r || Math.random;
    p[k] = L.length && !((k === 'hat' || k === 'acc') && rr() < .5) ? L[Math.floor(rr() * L.length)].id : ''; }); // hats and accessories are optional
  if (p.gear === undefined) { const g = txRandomItem(r, 'equipment'); p.gear = g ? g.id : ''; }
  return p;
}
if (S.me.role == null) Object.assign(S.me, { role: 'Captain' });
{ const fresh = [S.me].concat(S.crew).some(p => p.wear !== undefined || SLOT_KEYS.some(k => p[k] === undefined)); // the five clothing slots are new: keep the outfits they get
  fillPerson(S.me); S.crew.forEach(c => fillPerson(c)); if (fresh) save(); } // anything new since a person was made (like ids) gets filled in
const meName = () => (S.pilot && S.pilot.name) || 'the captain'; // stories read "the captain" until you give a name

// a brand-new crew member: a random name and everything else, which you can change on the Crew page
const secondTrait = (p, r) => { const L = txItems('trait').filter(t => t.id !== p.trait); return (r || Math.random)() < .5 && L.length ? pk2(L, r).id : ''; }; // about half of everyone has two
function newPerson(r) {
  const p = fillPerson({ name: pk2(CREW_FIRST, r) + ' ' + pk2(CREW_LAST, r), joined: Date.now() }, r); p.trait2 = secondTrait(p, r); return p;
}
function surprise(p) { // reroll who someone is (not what they own)
  const n = newPerson(); ['pronouns', 'age', 'role', 'trait', 'trait2'].forEach(k => { p[k] = n[k]; });
  if (p !== S.me) p.name = n.name;
}
function addCrew() {
  if (S.crew.length >= CREW_MAX || focusLock()) return null;
  const c = newPerson(); S.crew.push(c);
  pushEv({ c: 'ship', ic: '👋', title: c.name + ' joined the crew', t: crewLine(c), at: Date.now() });
  save(); return c;
}
const firstName = p => p === S.me ? meName() : String(p.name || '').split(' ')[0] || 'Someone';
const hasMyName = () => !!(S.pilot && S.pilot.name);
const crewLine = p => { const t = itemById(p.trait), t2 = itemById(p.trait2), w = worn(p), g = itemById(p.gear);
  const you = p === S.me && !hasMyName(); // no name yet: "You are the captain", not "the captain is a captain"
  return (you ? 'You are ' : firstName(p) + ' is ') + (p.role ? (p === S.me && /^captain$/i.test(p.role) ? 'the captain' : (/^[AEIOU]/i.test(p.role) ? 'an ' : 'a ') + p.role.toLowerCase()) : 'aboard') + (t ? ', ' + t.name + (t2 ? ' and ' + t2.name : '') : '') + '.' + (w.length ? ' Wears ' + w.map(x => aName(x.name)).join(', ').replace(/, ([^,]*)$/, ' and $1') + '.' : '') + (g ? ' Carries ' + (/^[aeiou]/i.test(g.name) ? 'an ' : 'a ') + g.name + '.' : ''); };

// moving things between people and the stash. slot: one of SLOT_KEYS (clothing) or 'gear' (equipment)
function equip(p, slot, id) {
  if (focusLock()) return;
  const cur = p[slot]; if (cur === id) return;
  if (id) { const i = S.stash.indexOf(id); if (i < 0) return; S.stash.splice(i, 1); }
  if (cur) S.stash.push(cur);
  p[slot] = id || ''; save();
}

// crafting: from a blueprint research taught you (clothes 1 point, equipment 2, ship equipment 4), or 1 point for a surprise
if (!Array.isArray(S.made)) S.made = []; // everything made in the Workshop: [{ id, at }]
const craftCost = it => it.kind === 'ship' ? 4 : it.kind === 'equipment' ? 2 : 1;
function craftItem(id) {
  const it = itemById(id); if (!it || focusLock() || !knownBp().has(id)) return null;
  const cost = craftCost(it); if ((S.kp || 0) < cost) return null;
  if (it.kind === 'ship') { if (S.shipGear.includes(id)) return null; S.shipGear.push(id); S.cnt.shipCrafted = (S.cnt.shipCrafted || 0) + 1; }
  else S.stash.push(id);
  S.kp -= cost; S.cnt.crafted = (S.cnt.crafted || 0) + 1; S.made.push({ id, at: Date.now() });
  pushEv({ c: 'ship', ic: '', title: (it.kind === 'ship' ? 'New on the ship: ' : 'Made: ') + it.name, t: capFirst(it.desc), at: Date.now() });
  save(); return it;
}
// the surprise: 1 point, a random clothing or equipment item, new to you when possible
const owned = () => S.stash.concat([S.me].concat(S.crew).flatMap(p => SLOT_KEYS.map(k => p[k]).concat(p.gear))).filter(Boolean);
function craft() {
  if (focusLock() || (S.kp || 0) < 1) return null;
  const have = new Set(owned()), kinds = Math.random() < .5 ? ['clothing', 'equipment'] : ['equipment', 'clothing'];
  let it = null;
  for (const k of kinds) { const fresh = txItems(k).filter(x => !have.has(x.id)); if (fresh.length) { it = pk2(fresh); break; } }
  if (!it) it = txRandomItem(Math.random, kinds[0]); // you have everything: a second one
  if (!it) return null;
  S.kp -= 1; S.stash.push(it.id); S.cnt.crafted = (S.cnt.crafted || 0) + 1; S.made.push({ id: it.id, at: Date.now(), surprise: true });
  pushEv({ c: 'ship', ic: '🧵', title: 'Crafted: ' + it.name, t: capFirst(it.desc), at: Date.now() });
  save(); return it;
}

// what a person brings to a line of text (see content/lines.json)
function personCtx(p, r) {
  const t = itemById(p.trait), t2 = itemById(p.trait2), all = worn(p), w = itemById(p.top) || all[0] || null, g = itemById(p.gear), held = all.concat(g ? [g] : []);
  return { name: firstName(p), pronouns: p.pronouns, role: p.role, age: p.age, trait: t ? t.name : '', trait2: t2 ? t2.name : '', traits: t ? t.name + (t2 ? ' and ' + t2.name : '') : '', tags: (t ? t.tags : []).concat(t2 ? t2.tags : [], p.role ? [p.role.toLowerCase()] : []),
    wear: w ? w.name : 'clothes', wearTags: [...new Set(all.flatMap(x => x.tags || []))], gear: g ? g.name : 'bag', gearTags: g ? g.tags : [], item: held.length ? pk2(held, r) : null };
}
// a world as the text engine sees it (see content/lines.json): numbers go from 0 to 1
function worldCtx(p) {
  const hrs = new Date().getHours(), x = p.x || (p.x = makeExtra(p));
  return { world: nm(p), place: nm(p), biome: (p.biomes[0] || 'plain').toLowerCase(), temp: Math.max(0, Math.min(1, (p.temp + 100) / 250)), water: (x.water || 0) / 100,
    life: Math.min(1, (p.lifeLvl || 0) / 6), ground: !gasWorld(p), weather: /rain|storm|drizzle|shower/i.test(p.weather || '') ? 'rain' : 'clear', time: hrs < 7 ? 'dawn' : hrs < 17 ? 'noon' : hrs < 21 ? 'dusk' : 'night',
    star: p.star.startsWith('none') ? 'faraway' : p.star, type: p.type, shipTags: shipTags() };
}
// a line about someone, with the world around them when there is one (extra: more context, like { place })
function crewMoment(p, group, world, extra) {
  const r = Math.random, c = personCtx(p, r), it = c.item;
  const ctx = Object.assign({ crew: c, item: it ? { name: it.name, tags: it.tags } : null, ship: S.ship.name.replace(/^The /, 'the '), shipTags: shipTags() }, world ? worldCtx(world) : {}, extra || {});
  if (!it) delete ctx.item;
  return txLine(group, ctx, r);
}

// ship equipment: 4 Knowledge points for a random piece the ship doesn't have yet
const shipTags = () => S.shipGear.map(itemById).filter(Boolean).flatMap(it => it.tags || []);
function craftShip() {
  if (focusLock() || (S.kp || 0) < 4) return null;
  const left = txItems('ship').filter(it => !S.shipGear.includes(it.id)); if (!left.length) return null;
  const it = left[Math.floor(Math.random() * left.length)];
  S.kp -= 4; S.shipGear.push(it.id); S.cnt.shipCrafted = (S.cnt.shipCrafted || 0) + 1;
  pushEv({ c: 'ship', ic: '🛠', title: 'New on the ship: ' + it.name, t: capFirst(it.desc), at: Date.now() });
  save(); return it;
}
// friendships: every finished study session, everyone aboard grows a little closer to everyone else
const bondKey = (a, b) => [a.id, b.id].sort().join('|');
function bumpBonds() { const all = [S.me].concat(S.crew); for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { const k = bondKey(all[i], all[j]); S.bond[k] = (S.bond[k] || 0) + 1; } }
// two people together (content/lines.json, crew_pair)
function pairMoment(a, b, world) {
  const ctx = Object.assign({ crew: personCtx(a), other: personCtx(b), bond: S.bond[bondKey(a, b)] || 0, ship: S.ship.name.replace(/^The /, 'the '), shipTags: shipTags() }, world ? worldCtx(world) : {});
  return txLine('crew_pair', ctx);
}

// ---------- once: crew from before characters existed, and Knowledge points on the new small scale ----------
if (!S.rw7) {
  S.crew.forEach(c => { if (typeof c.trait === 'string' && !itemById(c.trait)) { c.quirk = c.trait; delete c.trait; } fillPerson(c); });
  S.kp = Math.min(50, Math.round((S.kp || 0) / 100)); // research now costs 1-8 points instead of hundreds
  if (S.found.length || S.total) pushEv({ c: 'ship', ic: '🧑‍🚀', title: 'Meet the crew', t: 'You and your crew now have pronouns, ages, professions, traits, clothes and gear. Change any of it on the Ship page, under Crew, and add crew up to five. Knowledge points are counted in small numbers now: one for every finished study session. Spend them on Research or on crafting new clothes and gear.' + (S.kp ? ' You have ' + S.kp + ' to start with.' : ''), at: Date.now() });
  S.rw7 = 1; save();
}
