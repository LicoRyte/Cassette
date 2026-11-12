/* Solarist: Wonders. Sights worth seeing (content/wonders.json): each unlocks the first time you find a world that
   matches it. Solving a mystery leaves a Wonder too (mysteries.js). They're all kept in S.wonders (name: when), with the
   world they were seen on in S.wonderAt, and shown on the Ship page under Achievements. */
'use strict';

if (!S.wonderAt) S.wonderAt = {};
const wonderDefs = () => TEXT.wonders || [];
const wordsOf = s => String(s || '').toLowerCase().split(/[^a-z]+/).filter(Boolean);
function sightCtx(p) { // a world as the Wonder conditions see it
  const x = p.x || (p.x = makeExtra(p));
  return { type: p.type, rarity: p.rarity, star: p.star, rings: !!p.rings, moons: p.moons, lifeLvl: p.lifeLvl || 0, temp: p.temp, hab: x.hab, water: x.water || 0,
    gravity: p.gravity, weatherWords: wordsOf(p.weather), biomeWords: p.biomes.flatMap(wordsOf) };
}
// any new Wonders on world p? reps: the session report (none when crediting old worlds quietly)
function wonderCheck(p, reps) {
  const ctx = sightCtx(p);
  wonderDefs().forEach(w => {
    if (S.wonders[w.name] || !txFits(w, ctx)) return;
    S.wonders[w.name] = Date.now(); S.wonderAt[w.name] = p.num;
    if (!reps) return;
    reps.push({ ev: { battle: true, ic: w.ic, title: '✨ Wonder: ' + w.name, t: 'Seen on ' + nm(p) + '. ' + w.desc.replace(/^Find /, 'You found ') } });
    pushEv({ c: 'ach', ic: w.ic, title: 'Wonder: ' + w.name, t: 'Seen on ' + nm(p) + '.', at: Date.now() });
  });
}
// once: worlds found before Wonders existed count too
if (!S.rw8) { S.found.forEach(f => wonderCheck(f.p, null)); S.rw8 = 1; }
