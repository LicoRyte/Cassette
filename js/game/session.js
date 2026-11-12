/* Solarist: sessionEnd: everything that happens when a study session ends, shown together under the timer. */
'use strict';

function sessionEnd(reps, p, ev) {
  const notes = [];
  if (p) checkRecords(p, notes);
  shipActivity(reps); bumpBonds();
  skyCheck(reps); if (mode === 'long') campfire(reps); // the sky of the day; a campfire before the long break
  { const here = atP(); if (here) here.lastAt = Date.now(); }
  regionCheck(notes);
  if (!S.rec.dayN || S.todayN > S.rec.dayN.v) { if (S.rec.dayN && S.todayN > S.rec.dayN.v) notes.push('🏆 New record! Most sessions in a day: ' + S.todayN); S.rec.dayN = { v: S.todayN, date: Date.now() }; }
  if (ev && !ev.battle) award(10, 15);
  if (p) award(0, 10); // the new world's survey log
  gainKp(1, notes); // every finished study session
  checkAch();
  flushXP(notes);
  showTrans(reps.concat(notes.length ? [{ notes }] : []));
}
// small XP for things done at the break (research), shown under the timer
function shopXP(n) { award(n, 0); const out = flushXP([]) || []; const msg = out.join(' '); hint.textContent = msg; lvMsg = msg; lvMsgAt = Date.now(); }
let lvMsg = '', lvMsgAt = 0;
