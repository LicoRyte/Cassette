/* Solarist: Cassini Federation Posts and Manhunts. A Cassini Post (an arrival visitor) hands out one Most Wanted poster.
   While you carry it, every trip may bring a sighting; a sighting opens a 3-session Manhunt on that world, ending in the capture.
   The text is in expeditions.json "manhunt" and "cassini". */
'use strict';

const MHD = SOLARIST_MOUNT.expd || {}, CS = E.cassini;
const csPick = (k, fb) => { const l = MHD.cassini && MHD.cassini[k]; return pk1(l && l.length ? l : fb); };
function makeCassini(p) { // a poster waiting at this world's Cassini Post
  const name = csPick('first', BOSS_F) + ' "' + csPick('nick', BOSS_N) + '"';
  p.cassini = { name, gang: 'the ' + pk1(GANG_A) + ' ' + pk1(GANG_B), crime: csPick('crimes', ['robbed a mail ship']), taken: false };
  S.cnt.cassini = (S.cnt.cassini || 0) + 1;
}
const mwBounty = () => Math.round(E.quests.bossBase + E.quests.bossPerCatch * (S.mwDone || 0));
function csTake(p) {
  if (focusLock() || S.mw || !p.cassini || p.cassini.taken) return;
  const c = p.cassini; c.taken = true;
  S.mw = { name: c.name, gang: c.gang, crime: c.crime, misses: 0, sighted: null, hunt: null, at: Date.now() };
  pushEv({ c: 'quest', ic: '🚓', title: 'Most Wanted: ' + c.name, t: 'The Cassini Federation wants ' + c.name + ' of ' + c.gang + ', who ' + c.crime + '. Keep exploring: they could be sighted on any trip.', at: Date.now() });
  hint.textContent = '🚓 Poster taken: ' + c.name + '. Every trip might bring a sighting now.'; save(); draw();
}
function csDrop() { if (!S.mw || focusLock()) return; pushEv({ c: 'quest', ic: '🚓', title: 'Poster handed back: ' + S.mw.name, t: 'You gave the poster back to the Cassini Federation. Someone else can try.', at: Date.now() }); S.mw = null; if (S.mission === -5) S.mission = 0; save(); draw(); }
const sightChance = () => S.mw && S.mw.sighted == null ? Math.min(CS.cap, CS.base + CS.perTrip * (S.mw.misses || 0)) + (S.mw.tip ? .2 : 0) : 0;
function mwSight(p) { // on every new world while you carry a poster
  const m = S.mw; if (!m || m.sighted != null) return;
  const hit = Math.random() < sightChance(); m.tip = false;
  if (!hit) { m.misses = (m.misses || 0) + 1; return; }
  m.sighted = p.num; m.hunt = { step: 0, pick: 0 }; S.cnt.sightings = (S.cnt.sightings || 0) + 1;
  const t = m.name + ' was seen on ' + nm(p) + '. A Manhunt is open here: three study sessions to catch them.';
  pushEv({ c: 'quest', ic: '🎯', title: 'Sighted: ' + m.name, t, at: Date.now() }); qNotes.push('🎯 Sighting! ' + t);
}
const mwHere = () => { const m = S.mw, p = atP(); return m && m.sighted != null && p && p.num === m.sighted && !held(p) ? p : null; };
const hunting = () => S.mission === -5 && !!mwHere() && !S.dr;
function mwLegText(step) { // [scene, [safe, result], [risky, result]], fixed for this criminal and leg
  const m = S.mw, p = byNum(m.sighted) ? byNum(m.sighted).p : atP(), pools = MHD.manhunt;
  let h = 0; for (const ch of m.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const r = rng((h + step * 7919) >>> 0), pool = pools && pools[step] && pools[step].length ? pools[step] : [['{b} is somewhere in the {biome}.', ['Search carefully', 'Slow and thorough.'], ['Move fast', 'Quick and loud.']]];
  const leg = pool[Math.floor(r() * pool.length)], biome = p ? p.biomes[Math.floor(r() * p.biomes.length)].toLowerCase() : 'dark';
  const fill = s => capFirst(s.split('{b}').join(m.name).split('{g}').join(m.gang).split('{p}').join(p ? nm(p) : 'the world').split('{biome}').join(biome));
  return [fill(leg[0]), [leg[1][0], fill(leg[1][1])], [leg[2][0], fill(leg[2][1])]];
}
const MH_PARTS = ['Tracking', 'Closing in', 'Capture'];
function mwLeg(reps) {
  const m = S.mw, x = m.hunt, leg = mwLegText(x.step), opt = leg[x.pick ? 2 : 1], fin = x.step === 2;
  if (!fin) {
    const dust = addDust(CS.legPay); award(30, 10); x.step++; x.pick = 0;
    reps.unshift({ ev: { battle: true, ic: '🎯', title: 'Manhunt: ' + m.name + ' · ' + MH_PARTS[x.step - 1], t: leg[0] + ' ' + opt[1], got: '+' + dust + ' ✦' } });
    return '🎯 ' + MH_PARTS[x.step - 1] + ' done. ' + (3 - x.step) + ' session' + (x.step === 2 ? '' : 's') + ' to the capture.';
  }
  const it = rareFind(null, 'loot'), nw = gainItem(it, null); if (nw) award(0, 12);
  const dust = addDust(mwBounty());
  award(250, 60); S.mwDone = (S.mwDone || 0) + 1; S.mw = null; S.mission = 0;
  const got = '+' + dust + ' ✦ bounty · 🎒 ' + it.name + ' (' + it.rar + (nw ? ', new!' : '') + ')';
  reps.unshift({ ev: { battle: true, ic: '🎯', title: 'Caught: ' + m.name, t: leg[0] + ' ' + opt[1], got } });
  pushEv({ c: 'quest', ic: '🎯', title: 'Most Wanted caught: ' + m.name, t: leg[0] + ' ' + opt[1], got, at: Date.now() });
  return '🎯 ' + m.name + ' is in the brig! ✦ ' + dust + ' and ' + it.name + '.';
}

// ---------- once: the old Most Wanted (clues from fights) becomes a Cassini poster ----------
if (!S.rw2mw) {
  if (S.mw) {
    const o = S.mw; S.mw = { name: o.name, gang: o.gang, crime: 'ran from the Guild', misses: 0, sighted: null, hunt: null, at: o.at || Date.now() };
    pushEv({ c: 'quest', ic: '🚓', title: 'Your poster moved to the Cassini Federation', t: 'Most Wanted posters come from Cassini Federation Posts now, and clues are gone. You still carry ' + o.name + '\'s poster: any trip might bring a sighting, and a sighting opens a three-session Manhunt.', at: Date.now() });
  }
  if (S.mission === -5) S.mission = 0;
  S.rw2mw = 1;
}
