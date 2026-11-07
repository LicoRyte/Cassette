/* Solarist: sessionEnd (everything that happens when a study session ends) and upgrades. */
'use strict';

// everything that happens at the end of a study session, shown together under the timer
function sessionEnd(reps, p, ev) {
  const notes = [];
  let earned = Math.max(E.session.minimum, Math.round(S.set.focus * E.session.perStudyMinute)) + (p ? RAR_BONUS[p.rarity] || 0 : 0) + (ev ? E.session.eventBonus : 0);
  earned *= (1 + (lvl('engine') - 1) * E.engineBonusPerLevel) * (hasT('shp1') ? 1.1 : 1) * (1 + .05 * roomLv('galley'));
  notes.push('✦ +' + addDust(earned) + ' resources');
  if (traderNew) { notes.push('🏪 ' + traderNew.name + ' is docked at ' + nm(p) + '. Visit it under Trade on the right before you travel on.'); traderNew = null; }
  if (encGot) { notes.push(encGot.ic + ' +' + encGot.dust + ' resources (' + encGot.title.replace(/!$/, '') + ')'); encGot = null; }
  const trade = tradeIncome(); if (trade) notes.push('🏘 +' + addDust(trade) + ' resources in trade from your Travelers\' Posts');
  if (p) { checkRecords(p, notes); checkBounties({ planet: p }, notes); }
  checkBounties({ session: true }, notes);
  growPosts(notes);
  shipActivity(reps); if (roomLv('lab')) award(0, 4 * roomLv('lab'));
  if (!S.rec.dayN || S.todayN > S.rec.dayN.v) { if (S.rec.dayN && S.todayN > S.rec.dayN.v) notes.push('🏆 New record! Most sessions in a day: ' + S.todayN); S.rec.dayN = { v: S.todayN, date: Date.now() }; }
  reps.forEach(({ rep }) => { if (rep) award(0, KN_REP[rep.k] || 10); }); // everything heard teaches you something
  if (ev && !ev.battle) award(10, 15);
  if (p) award(0, 10); // the new world's survey log
  notes.push(...qNotes); qNotes = []; wkCheck();
  checkAch(); const rt1 = rating(), rk0 = rankOf(rt0), rk1 = rankOf(rt1);
  notes.push('◆ +' + (rt1 - rt0).toLocaleString() + ' Rating (' + rt1.toLocaleString() + ')' + (rk1 > rk0 ? '. New rank: ' + RANKS[rk1][1] + '!' : ''));
  flushXP(notes);
  showTrans(reps.concat(notes.length ? [{ notes }] : []));
}
function shopXP(n) { award(n, 0); const out = flushXP([]); const msg = out.join(' '); hint.textContent = msg; lvMsg = msg; lvMsgAt = Date.now(); }
let lvMsg = '', lvMsgAt = 0;
const modMax = k => Math.max(2, Math.round((E.moduleCost.maxLevel || {})[k] || 30));
function upgradeMod(k) { const c = modCost(k); if (S.dust < c || lvl(k) >= modMax(k)) return; S.dust -= c; S.mods[k] = lvl(k) + 1; shopXP(15); save(); draw(); }
function upgradeFac(p, f) { const lv = f.lv || 1, c = facCost(lv + 1); if (lv >= FAC_MAX || S.dust < c) return; S.dust -= c; f.lv = lv + 1;
  const st = S.cnt.facRow = S.cnt.facRow || { k: null, n: 0, best: {} }; st.n = st.k === f.k ? st.n + 1 : 1; st.k = f.k; st.best[f.k] = Math.max(st.best[f.k] || 0, st.n); shopXP(10 + 5 * lv); save(); draw(); }
