/* Solarist: Mysteries (content/mysteries.json). Something strange turns up on a world: a stone that moves, a voice in
   the ice, seven notes on the radio. It takes a few study sessions of observing (the Mystery mission) to understand.
   Mysteries travel with the ship, so leaving the world never loses one, and they can't be failed. Solving one gives its
   answer (in the Codex), Knowledge points, and a Wonder. */
'use strict';

const MYS = -10, MYS_MAX = 3; // S.mission while observing; how many can be open at once
if (!Array.isArray(S.mys)) S.mys = []; // open mysteries: { id, num, origin, step, at, log: [lines so far] }
if (!S.mysDone) S.mysDone = {}; if (!S.wonders) S.wonders = {}; // solved mysteries (id: times), Wonders (name: when)
const mysDef = id => (TEXT.mysteries || []).find(m => m.id === id) || null;
const mysPicked = () => S.mys.find(m => m.id === S.mysPick && mysDef(m.id)) || S.mys.find(m => mysDef(m.id)) || null;
const observing = () => S.mission === MYS && !!mysPicked();
function mysCtx(o, p) { // whoever is watching, and where
  const people = S.crew.length ? S.crew : [S.me], c = people[Math.floor(Math.random() * people.length)];
  return Object.assign(p ? worldCtx(p) : {}, { crew: personCtx(c), origin: o.origin, world: p ? nm(p) : o.origin });
}
// maybe a new mystery on world p (chance 0 to 1); reps: the session report
function mysFind(p, reps, chance) {
  if (!p || p.story || Math.random() >= chance || S.mys.length >= MYS_MAX) return null;
  const open = new Set(S.mys.map(m => m.id)), ctx = worldCtx(p);
  const fits = (TEXT.mysteries || []).filter(m => !open.has(m.id) && txFits(m, ctx)), fresh = fits.filter(m => !S.mysDone[m.id]), pool = fresh.length ? fresh : fits;
  if (!pool.length) return null;
  const m = pool[Math.floor(Math.random() * pool.length)], o = { id: m.id, num: p.num, origin: nm(p), step: 0, at: Date.now(), log: [] };
  const t = txFill(m.found, mysCtx(o, p)); o.log.push(t); S.mys.push(o); S.cnt.mysFound = (S.cnt.mysFound || 0) + 1;
  reps.unshift({ ev: { battle: true, ic: m.ic, title: '🔎 A mystery: ' + m.title, t, got: 'Observe it with the Mystery mission, whenever you like. It travels with you.' } });
  pushEv({ c: 'mystery', ic: m.ic, title: 'A mystery: ' + m.title, t, at: Date.now() });
  return o;
}
// a finished study session of observing
function mysStep(reps) {
  const o = mysPicked(), m = mysDef(o.id), p = atP(), ctx = mysCtx(o, p);
  const t = txFill(m.steps[Math.min(o.step, m.steps.length - 1)], ctx);
  o.log.push(t); o.step++; award(20, 15); S.cnt.mysSteps = (S.cnt.mysSteps || 0) + 1;
  if (o.step < m.steps.length) {
    const title = m.title + ' · ' + o.step + ' of ' + m.steps.length;
    reps.unshift({ ev: { battle: true, ic: m.ic, title: '🔎 ' + title, t } }); pushEv({ c: 'mystery', ic: m.ic, title, t, at: Date.now() });
    return '🔎 ' + capFirst(m.title.replace(/^(a|an|the) /i, '')) + ': ' + o.step + ' of ' + m.steps.length + '. Getting closer.';
  }
  // solved
  const kp = m.kp || 1, answer = txFill(m.answer, ctx);
  gainKp(kp); award(60, 40);
  S.mys.splice(S.mys.indexOf(o), 1); S.mysDone[m.id] = (S.mysDone[m.id] || 0) + 1; S.cnt.mysSolved = (S.cnt.mysSolved || 0) + 1; S.mission = 0;
  if (m.wonder && !S.wonders[m.wonder]) S.wonders[m.wonder] = Date.now();
  const got = '📘 +' + kp + ' Knowledge point' + (kp === 1 ? '' : 's') + (m.wonder ? ' · ✨ Wonder: ' + m.wonder : '');
  pushEv({ c: 'codex', ic: m.ic, title: 'Codex: ' + m.title, t: answer, at: Date.now() });
  reps.unshift({ ev: { battle: true, ic: m.ic, title: '🔎 Solved: ' + m.title, t: t + ' ' + answer, got } });
  return '🔎 Solved: ' + m.title + '. The answer is in the Codex.';
}
