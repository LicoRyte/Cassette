/* Solarist: Captain and Knowledge levels, and personal records. */
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
    const b = lvInfo(S[k]).L; S[k] = (S[k] || 0) + n; const a = lvInfo(S[k]).L;
    if (a > b) ups.push('🎉 ' + label + ' Level ' + a + '!' + (titleOf(list, a) !== titleOf(list, b) ? ' New title: ' + titleOf(list, a) + '.' : ''));
  });
  out.push((xp ? '⭐ +' + xp + ' XP' : '') + (xp && kn ? ' · ' : '') + (kn ? '📚 +' + kn + ' Knowledge' : ''), ...ups);
  return out;
}
const RANK = { Common: 0, Uncommon: 1, Rare: 2, Legendary: 3 };
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
  S.xp = S.found.length * 20 + (S.surveys || 0) * 20;
  S.kn = S.found.length * 10 + itemCount() * 12 + (S.events || []).length * 15;
}
save();

// one Knowledge point (the small number you spend on Research and crafting), with a line for the report
const gainKp = (n, notes) => { S.kp = (S.kp || 0) + n; if (notes) notes.push('📘 +' + n + ' Knowledge point' + (n === 1 ? '' : 's') + ' (' + S.kp + ' to spend)'); };

// ---------- once: the cozy redesign. Selling, trade, posts, outlaws, bounties, deliveries, Distress Runs and the Coordinator are gone ----------
if (!S.rw6) {
  const dust = S.dust || 0, kp = Math.min(20, Math.floor(dust / 500)); // leftover resources become a little Knowledge for Research
  if (kp) S.kp = (S.kp || 0) + kp;
  ['atTown', 'bDone', 'bounties', 'chargeKind', 'chips', 'coord', 'crewPool', 'dl', 'dr', 'drDay', 'drN', 'drSat', 'dust', 'dustTotal', 'fcDay', 'fights', 'hyper', 'job', 'jumped', 'mods',
    'mw', 'mwDone', 'outlaw', 'station', 'trader', 'tuned', 'wk', 'rw2dl', 'rw2hd', 'rw2mw', 'rw4', 'rw5'].forEach(k => { delete S[k]; });
  S.found.forEach(({ p }) => { ['outlaw', 'postal', 'cassini', 'nudged', 'lucky'].forEach(k => { delete p[k]; }); if (p.visit && p.visit !== 'meeting' && p.visit !== 'derelict') p.visit = 'none'; if (p.enc) delete p.enc.dust; });
  if (S.mission > 0 || [-1, -2, -5, -6].includes(S.mission)) S.mission = 0;
  if (S.found.length || S.total) pushEv({ c: 'ship', ic: '🌌', title: 'The voyage has changed', t: 'No more resources, selling, building, bounties, outlaws, deliveries or Distress Runs: the voyage is about discovery now. Your worlds, logs, collection and achievements are all still here, every decoration and hull colour is free, and your Listening Posts\' old transmissions stay readable.' + (kp ? ' Your leftover resources became ' + kp + ' Knowledge points for Research.' : ''), at: Date.now() });
  S.rw6 = 1; save();
}
