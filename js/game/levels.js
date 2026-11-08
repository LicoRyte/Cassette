/* Solarist: Captain and Knowledge levels, Travelers' Post growth, bounties and personal records. */
'use strict';

// Captain Level (XP: everything that moves the game forward) and Knowledge Level (what you learn). 1-100, a new title every 10.
const LV_MAX = 100, lvNeed = L => Math.round(E.levels.base + E.levels.perLevel * L + E.levels.perLevelSquared * L * L); // XP from level L to L+1: gentle at first, steep later
const CAPT = ['Cadet', 'Ensign', 'Pilot', 'Navigator', 'Lieutenant', 'Captain', 'Commander', 'Commodore', 'Admiral', 'Fleet Admiral', 'Star Legend'];
const KNOW = ['Curious Mind', 'Student', 'Apprentice Scholar', 'Scholar', 'Researcher', 'Scientist', 'Archivist', 'Professor', 'Sage', 'Oracle', 'Keeper of the Cosmos'];
function lvInfo(total) { let L = 1, t = total || 0; while (L < LV_MAX && t >= lvNeed(L)) { t -= lvNeed(L); L++; } return { L, into: t, need: L < LV_MAX ? lvNeed(L) : 0 }; }
const titleOf = (list, L) => list[Math.min(10, Math.floor(L / 10))];
let pend = { xp: 0, kn: 0 };
const award = (xp, kn) => { pend.xp += xp || 0; pend.kn += kn || 0; };
function flushXP(notes) { // add what's pending; level-ups go into notes
  const { xp, kn } = pend; pend = { xp: 0, kn: 0 };
  if (!xp && !kn) return;
  const out = notes || [], ups = [];
  [['xp', xp, CAPT, '⭐ Captain'], ['kn', kn, KNOW, '📚 Knowledge']].forEach(([k, n, list, label]) => {
    if (!n) return;
    const b = lvInfo(S[k]).L; S[k] = (S[k] || 0) + n; const a = lvInfo(S[k]).L; if (k === 'kn') S.kp = (S.kp || 0) + n;
    if (a > b) ups.push('🎉 ' + label + ' Level ' + a + '!' + (titleOf(list, a) !== titleOf(list, b) ? ' New title: ' + titleOf(list, a) + '.' : ''));
  });
  out.push((xp ? '⭐ +' + xp + ' XP' : '') + (xp && kn ? ' · ' : '') + (kn ? '📚 +' + kn + ' Knowledge' : ''), ...ups);
  return out;
}
const KN_REP = { core: 25, species: 25, odd: 25, secret: 18, log: 10, fac: 8 };
const RAR_BONUS = E.session.rarityBonus, RANK = { Common: 0, Uncommon: 1, Rare: 2, Legendary: 3 };
// settlements: Travelers' Posts grow a population every study session (faster with more and better facilities)
const TIERS = [[0, 'Outpost'], [100, 'Village'], [1000, 'Town'], [10000, 'City'], [100000, 'Metropolis'], [1000000, 'Megacity']];
const tierOf = n => TIERS.filter(t => n >= t[0]).pop()[1];
// Travelers' Posts pay a little trade every study session: 1 per facility plus 2 per point of Industry, up to the cap
const tradeIncome = () => Math.min(E.trade.cap + (hasT('eco2') ? 40 : 0), Math.round(E.trade.perFacilityLevel * (hasT('eco2') ? 1.5 : 1) * posts().reduce((n, { p }) => n + (p.post.tp ? p.post.tp.fac.length + 2 * postStats(p).ind : 0), 0)));
const statFun = () => Math.min(40, Math.round(allStats().fun / 2)), statSci = () => Math.min(30, Math.round(allStats().sci / 3)); // XP and Knowledge every session
function growPosts(notes) {
  posts().forEach(({ p }) => {
    const t = p.post.tp; if (!t) return;
    const before = t.pop || 0, power = t.fac.reduce((a, f) => a + (f.lv || 1), 0), comfort = 1 + postStats(p).com / 25; // Comfort: settlers move in faster
    t.pop = before + Math.round((3 + Math.random() * 6) * (1 + power) * comfort * (S.tuned === p.num ? 2 : 1) * (1 + before / 2000));
    if (tierOf(before) !== tierOf(t.pop)) notes.push('🏙 ' + nm(p) + ' grew into a ' + tierOf(t.pop) + '! (' + t.pop.toLocaleString() + ' settlers)');
  });
}
// bounties: three small goals at a time; finishing one pays stardust and rolls a new one
const CLASSES = Object.keys(TYPES);
function newBounty() {
  const pk = a => a[Math.floor(Math.random() * a.length)];
  for (let tries = 0; tries < 8; tries++) {
    const k = pk(['class', 'class', 'rarity', 'hab', 'moons', 'rings', 'life', 'sessions', 'sessions', 'cycle', 'temp']); let b;
    if (k === 'class') { const c = pk(CLASSES); b = { v: c, t: 'Find ' + (/^[AEIOU]/.test(c) ? 'an ' : 'a ') + c + ' world', reward: 25 + Math.round(70 / TYPES[c].w) }; }
    else if (k === 'rarity') { const v = pk(['Uncommon', 'Uncommon', 'Rare']); b = { v, t: 'Find ' + (/^[AEIOU]/.test(v) ? 'an ' : 'a ') + v + ' (or rarer) world', reward: v === 'Rare' ? 70 : 35 }; }
    else if (k === 'hab') { const v = pk([60, 70, 80]); b = { v, t: 'Find a world at least ' + v + '% habitable', reward: v - 25 }; }
    else if (k === 'moons') { const v = 3 + Math.floor(Math.random() * 6); b = { v, t: 'Find a world with ' + v + ' or more moons', reward: 20 + v * 4 }; }
    else if (k === 'rings') b = { t: 'Find a ringed world', reward: 35 };
    else if (k === 'life') { const v = pk([3, 4, 5]); b = { v, t: 'Find a world with ' + LIFE[v][0].toLowerCase() + ' (or more)', reward: 20 + v * 10 }; }
    else if (k === 'sessions') { const v = 2 + Math.floor(Math.random() * 4); b = { v, t: 'Finish ' + v + ' study sessions', reward: 15 * v, prog: 0 }; }
    else if (k === 'cycle') b = { t: 'Finish a Full Cycle (nothing skipped)', reward: 60 };
    else { const v = pk(['hot', 'cold']); b = { v, t: v === 'hot' ? 'Find a world hotter than 500 °C' : 'Find a world colder than −150 °C', reward: 35 }; }
    b.k = k; b.id = Date.now() + '' + Math.random(); b.reward = Math.round(b.reward * E.bountyMultiplier);
    if (!S.bounties.some(x => x.t === b.t)) return b;
  }
  return { k: 'sessions', v: 3, t: 'Finish 3 study sessions', reward: 70, prog: 0, id: Date.now() + '' + Math.random() };
}
while (S.bounties.length < 3) S.bounties.push(newBounty());
function bountyHit(b, ctx) {
  const p = ctx.planet;
  if (b.k === 'sessions') { if (ctx.session) b.prog = (b.prog || 0) + 1; return b.prog >= b.v; }
  if (b.k === 'cycle') return !!ctx.cycle;
  if (!p) return false;
  const coldest = p.tempNight != null ? Math.min(p.temp, p.tempNight) : p.temp;
  return b.k === 'class' ? p.type === b.v : b.k === 'rarity' ? RANK[p.rarity] >= RANK[b.v] : b.k === 'hab' ? p.x.hab >= b.v : b.k === 'moons' ? p.moons >= b.v
    : b.k === 'rings' ? p.rings : b.k === 'life' ? (p.lifeLvl || 0) >= b.v : b.k === 'temp' ? (b.v === 'hot' ? p.temp > 500 : coldest < -150) : false;
}
function checkBounties(ctx, notes) {
  S.bounties.forEach((b, i) => { if (bountyHit(b, ctx)) { const got = addDust(b.reward); notes.push('🎯 Bounty complete: ' + b.t + ' (+' + got + ' ✦)'); award(30, 0); S.bDone++; S.bounties[i] = newBounty(); } });
}
// personal records: the extremes of everything you've found
const REC = [
  ['hottest', '🔥', 'Hottest world', p => p.temp, v => v + ' °C', 1], ['coldest', '❄', 'Coldest world', p => p.tempNight != null ? Math.min(p.temp, p.tempNight) : p.temp, v => v + ' °C', -1],
  ['biggest', '🪐', 'Biggest world', p => p.x.radius, v => v + '× Earth', 1], ['smallest', '🪨', 'Smallest world', p => p.x.radius, v => v + '× Earth', -1],
  ['moons', '🌙', 'Most moons', p => p.moons, v => String(v), 1], ['far', '🔭', 'Farthest from Earth', p => p.dist, v => v.toLocaleString() + ' ly', 1],
  ['species', '🦎', 'Most species', p => p.x.species || null, v => 'about ' + Number(v.toPrecision(2)).toLocaleString(), 1], ['hab', '🏡', 'Most habitable', p => p.x.hab, v => v + '%', 1],
  ['gravity', '🏋', 'Strongest gravity', p => p.gravity, v => v + ' g', 1], ['day', '⏳', 'Longest day', p => p.day, v => v + ' hours', 1],
];
function checkRecords(p, notes) {
  REC.forEach(([k, , label, get, f, dir]) => {
    const v = get(p); if (v == null) return;
    const cur = S.rec[k];
    if (!cur || (dir > 0 ? v > cur.v : v < cur.v)) { if (cur && notes && S.found.length > 10) notes.push('🏆 New record! ' + label + ': ' + nm(p) + ' (' + f(v) + ')'); S.rec[k] = { v, num: p.num }; }
  });
}
S.found.forEach(({ p }) => checkRecords(p, null)); // fill records from worlds found before this existed
if (S.xp == null) { // credit saves from before levels existed for what they've already done
  const pl = posts().map(f => f.p), tps = pl.filter(p => p.post.tp), facs = tps.reduce((n, p) => n + p.post.tp.fac.length, 0);
  const modUps = Object.keys(MODS).reduce((n, k) => n + lvl(k) - 1, 0), heard = pl.reduce((n, p) => n + p.post.reports.length, 0);
  S.xp = S.found.length * 20 + pl.length * 30 + tps.length * 40 + facs * 25 + modUps * 15 + (S.fights || 0) * 35 + (S.surveys || 0) * 20 + (S.bDone || 0) * 30;
  S.kn = S.found.length * 10 + heard * 15 + itemCount() * 12 + (S.events || []).length * 15;
}
save();
