/* Solarist: Quests: the Guild's weekly contract (planet expeditions are in expedition.js, Most Wanted in manhunt.js). */
'use strict';

// ---------- Quests: the Guild's weekly contract ----------
const RANKI = r => ITEM_RARS.indexOf(r);
let qNotes = []; // quest lines for this session's report
const rareFind = (p, kind) => { for (let k = 0; k < 40; k++) { const r = rollItem(p, true, kind); if (RANKI(r.rar) >= 2) return r; } return rollItem(p, true, kind); };
// Guild contract: three goals a week, a fresh one every Monday
const dayKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const weekKey = () => { const d = new Date(); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return dayKey(d); };
const WK_GOALS = { // [what, counter, smallest, biggest]
  hours: ['Study for {n} hours', () => S.minutes / 60, 5, 8],
  worlds: ['Discover {n} worlds', () => Object.values(S.cnt.rar).reduce((a, n) => a + n, 0), 5, 9],
  surveys: ['Chart {n} Points of Interest', () => (S.surveys || 0) + (S.cnt.poi || 0), 2, 4], // old saves' surveys count too
  fc: ['Earn {n} Full Cycles', () => S.cnt.fc, 2, 3],
  builds: ['Finish {n} builds', () => S.cnt.builds || 0, 1, 3],
  camp: ['Recover {n} Meridian logs', () => S.camp.n, 3, 5],
  bounty: ['Complete {n} bounties', () => S.bDone || 0, 2, 4],
  fights: ['Drive out {n} outlaw gangs', () => S.fights || 0, 1, 2],
  exp: ['Finish {n} expedition legs', () => S.cnt.expSteps || 0, 3, 5],
};
function wkCheck() {
  const w = weekKey(); if (S.wk && S.wk.wk === w) return;
  const keys = Object.keys(WK_GOALS).filter(k => !(k === 'camp' && (!CAMP || S.camp.n + 5 > CAMP.logs.length))).sort(() => Math.random() - .5).slice(0, 3);
  S.wk = { wk: w, claimed: false, goals: keys.map(k => { const [, f, lo, hi] = WK_GOALS[k]; return { k, n: lo + Math.floor(Math.random() * (hi - lo + 1)), base: f() }; }) };
}
const wkProg = g => Math.max(0, Math.min(g.n, Math.floor(WK_GOALS[g.k][1]() - g.base + 1e-9)));
const wkDone = () => !!S.wk && S.wk.goals.every(g => wkProg(g) >= g.n);
function wkClaim(kind) {
  if (!wkDone() || S.wk.claimed) return;
  S.wk.claimed = true; S.cnt.wk = (S.cnt.wk || 0) + 1; award(200, 40);
  let t;
  if (kind === 'dust') t = '✦ ' + addDust(E.quests.contract).toLocaleString() + ' resources';
  else if (kind === 'kp') { const k = Math.round(E.quests.contractKnowledge); S.kp += k; t = k + ' Knowledge points'; }
  else { const it = rareFind(null, 'trade'), nw = gainItem(it, null); if (nw) award(0, 12); t = it.name + ' (' + it.rar + (nw ? ', new!' : '') + ')'; }
  pushEv({ c: 'quest', ic: '📜', title: 'Guild contract complete', t: 'The Cartographers\' Guild paid out: ' + t + '.', at: Date.now() });
  hint.textContent = '📜 Contract complete. The Guild paid out ' + t + '. A new contract comes on Monday.'; save(); draw();
}
// names for Most Wanted posters (Cassini Federation Posts are in manhunt.js)
const BOSS_F = ['Vex', 'Marlo', 'Ingrid', 'Duke', 'Sable', 'Kaz', 'Odessa', 'Rook', 'Juno', 'Brask', 'Tamsin', 'Gideon'], BOSS_N = ['Rustjaw', 'the Comet', 'Two-Suns', 'Old Smoke', 'Glass Eye', 'the Quiet', 'Mother Static', 'Ninefingers', 'the Last Laugh', 'Halfmoon', 'Velvet', 'Crowbar'];
const pk1 = a => a[Math.floor(Math.random() * a.length)];
