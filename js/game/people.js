/* Solarist: You and your crew. Everyone is a name, pronouns, an age, a profession, a trait, something to wear and something
   to carry. Traits, clothing and equipment are plain text from content/items.json: they change how stories are written,
   never stats. Spare items wait in the ship's stash; crafting turns 1 Knowledge point into a random new one. */
'use strict';

const CREW_MAX = 5;
const PRONOUNS = ['she', 'he', 'they'];
const PROFESSIONS = Object.keys(ROLES).concat(['Botanist', 'Geologist', 'Astronomer', 'Cartographer', 'Navigator', 'Mechanic', 'Artist', 'Musician', 'Linguist', 'Archivist']);
const itemById = id => TEXT.items.find(it => it.id === id) || null;
const pk2 = (a, r) => a[Math.floor((r || Math.random)() * a.length)];

// the captain is S.me (their name stays in S.pilot.name, which the title sequence asks for)
if (!S.me) S.me = {};
if (!Array.isArray(S.stash)) S.stash = []; // item ids nobody is using
function fillPerson(p, r) { // give anyone missing a detail something sensible
  if (!PRONOUNS.includes(p.pronouns)) p.pronouns = 'they';
  if (p.age == null || p.age === '') p.age = 20 + Math.floor((r || Math.random)() * 45);
  if (!p.role) p.role = pk2(PROFESSIONS, r);
  if (!itemById(p.trait)) { const t = txRandomItem(r, 'trait'); p.trait = t ? t.id : ''; }
  if (p.wear === undefined) { const w = txRandomItem(r, 'clothing'); p.wear = w ? w.id : ''; }
  if (p.gear === undefined) { const g = txRandomItem(r, 'equipment'); p.gear = g ? g.id : ''; }
  return p;
}
if (S.me.role == null) Object.assign(S.me, { role: 'Captain' });
fillPerson(S.me);
const meName = () => (S.pilot && S.pilot.name) || 'the captain'; // stories read "the captain" until you give a name

// a brand-new crew member: a random name and everything else, which you can change on the Crew page
function newPerson(r) {
  return fillPerson({ name: pk2(CREW_FIRST, r) + ' ' + pk2(CREW_LAST, r), joined: Date.now() }, r);
}
function surprise(p) { // reroll who someone is (not what they own)
  const n = newPerson(); ['pronouns', 'age', 'role', 'trait'].forEach(k => { p[k] = n[k]; });
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
const crewLine = p => { const t = itemById(p.trait), w = itemById(p.wear), g = itemById(p.gear);
  return firstName(p) + ' is ' + (p.role ? (/^[AEIOU]/i.test(p.role) ? 'an ' : 'a ') + p.role.toLowerCase() : 'aboard') + (t ? ', ' + t.name : '') + '.' + (w ? ' Wears ' + (/^[aeiou]/i.test(w.name) ? 'an ' : 'a ') + w.name + '.' : '') + (g ? ' Carries ' + (/^[aeiou]/i.test(g.name) ? 'an ' : 'a ') + g.name + '.' : ''); };

// moving things between people and the stash. slot: 'wear' (clothing) or 'gear' (equipment)
function equip(p, slot, id) {
  if (focusLock()) return;
  const cur = p[slot]; if (cur === id) return;
  if (id) { const i = S.stash.indexOf(id); if (i < 0) return; S.stash.splice(i, 1); }
  if (cur) S.stash.push(cur);
  p[slot] = id || ''; save();
}

// crafting: 1 Knowledge point, a random clothing or equipment item, new to you when possible
const owned = () => S.stash.concat([S.me].concat(S.crew).flatMap(p => [p.wear, p.gear])).filter(Boolean);
function craft() {
  if (focusLock() || (S.kp || 0) < 1) return null;
  const have = new Set(owned()), kinds = Math.random() < .5 ? ['clothing', 'equipment'] : ['equipment', 'clothing'];
  let it = null;
  for (const k of kinds) { const fresh = txItems(k).filter(x => !have.has(x.id)); if (fresh.length) { it = pk2(fresh); break; } }
  if (!it) it = txRandomItem(Math.random, kinds[0]); // you have everything: a second one
  if (!it) return null;
  S.kp -= 1; S.stash.push(it.id); S.cnt.crafted = (S.cnt.crafted || 0) + 1;
  pushEv({ c: 'ship', ic: '🧵', title: 'Crafted: ' + it.name, t: capFirst(it.desc), at: Date.now() });
  save(); return it;
}

// what a person brings to a line of text (see content/lines.json)
function personCtx(p, r) {
  const t = itemById(p.trait), w = itemById(p.wear), g = itemById(p.gear), held = [w, g].filter(Boolean);
  return { name: firstName(p), pronouns: p.pronouns, role: p.role, age: p.age, trait: t ? t.name : '', tags: (t ? t.tags : []).concat(p.role ? [p.role.toLowerCase()] : []),
    wear: w ? w.name : 'clothes', wearTags: w ? w.tags : [], gear: g ? g.name : 'bag', gearTags: g ? g.tags : [], item: held.length ? pk2(held, r) : null };
}
// a line about someone, with the world around them when there is one
function crewMoment(p, group, world) {
  const r = Math.random, c = personCtx(p, r), it = c.item;
  const ctx = { crew: c, item: it ? { name: it.name, tags: it.tags } : null, ship: S.ship.name.replace(/^The /, 'the ') };
  if (world) { const temp = Math.max(0, Math.min(1, (world.temp + 100) / 250)), hrs = new Date().getHours();
    Object.assign(ctx, { place: nm(world), biome: (world.biomes[0] || 'plain').toLowerCase(), temp, weather: /rain|storm|drizzle|shower/i.test(world.weather || '') ? 'rain' : 'clear', time: hrs < 7 ? 'dawn' : hrs < 17 ? 'noon' : hrs < 21 ? 'dusk' : 'night' }); }
  if (!it) delete ctx.item;
  return txLine(group, ctx, r);
}

// ---------- once: crew from before characters existed, and Knowledge points on the new small scale ----------
if (!S.rw7) {
  S.crew.forEach(c => { if (typeof c.trait === 'string' && !itemById(c.trait)) { c.quirk = c.trait; delete c.trait; } fillPerson(c); });
  S.kp = Math.min(50, Math.round((S.kp || 0) / 100)); // research now costs 1-8 points instead of hundreds
  if (S.found.length || S.total) pushEv({ c: 'ship', ic: '🧑‍🚀', title: 'Meet the crew', t: 'You and your crew now have pronouns, ages, professions, traits, clothes and gear. Change any of it on the Ship page, under Crew, and add crew up to five. Knowledge points are counted in small numbers now: one for every finished study session. Spend them on Research or on crafting new clothes and gear.' + (S.kp ? ' You have ' + S.kp + ' to start with.' : ''), at: Date.now() });
  S.rw7 = 1; save();
}
