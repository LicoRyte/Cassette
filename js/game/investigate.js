/* Solarist: anomalies. A world's oddity is a mystery now (mysteries.js): observing it takes three sessions, and solving it
   writes its explanation in the Codex, with Knowledge and a guaranteed Anomalies find. The text is in expeditions.json "investigate". */
'use strict';

const IVD = (SOLARIST_MOUNT.expd && SOLARIST_MOUNT.expd.investigate) || {};
const IV = E.investigate;
const invOf = p => (p && p.inv) || { pct: 0, done: false };
const canInvestigate = p => !!p && !!p.odd && !p.story && !invOf(p).done;
const codexText = odd => (IVD.codex && IVD.codex[odd]) || IVD.fallback || 'A rare natural process, the kind that only happens when everything lines up just so.';
// one collectible from a chosen category (anomalies need their Xenology research first; until then the find is an artifact)
function rollCat(p, c) {
  const W = ITEM_W.better, tot = ITEM_RARS.reduce((a, r) => a + W[r], 0);
  for (let k = 0; k < 10; k++) {
    let x = Math.random() * tot, rar = 'Common'; for (const r of ITEM_RARS) { x -= W[r]; if (x < 0) { rar = r; break; } }
    const list = catList(c, rar); if (!list.length) continue;
    const i = Math.floor(Math.random() * list.length); return { id: itemId(c, rar, i), name: list[i], rar, cat: c };
  }
  return rollItem(p, true, 'survey');
}
// a world's oddity as a mystery definition: three steps from the investigation text, its Codex entry as the answer
function oddDef(num) {
  const f = byNum(num); if (!f || !f.p.odd) return null; const p = f.p;
  const steps = IVD.steps && IVD.steps.length ? IVD.steps : ['The science team studied {odd}.'], r = rng((p.seed ^ 0x0DD) >>> 0), pick = [];
  while (pick.length < 3) { const t = steps[Math.floor(r() * steps.length)]; if (!pick.includes(t) || pick.length >= steps.length) pick.push(t); }
  return { id: 'odd:' + num, odd: true, num, ic: '?', title: capFirst(p.odd), kp: 1, steps: pick.map(t => capFirst(t.split('{odd}').join(p.odd))), answer: codexText(p.odd) };
}
// arriving at (or coming back to) a world with an oddity adds it to your mysteries
function oddFind(p, reps) {
  if (!p || !p.odd || p.story || invOf(p).done || S.mys.some(m => m.id === 'odd:' + p.num)) return;
  const o = { id: 'odd:' + p.num, num: p.num, origin: nm(p), step: Math.min(2, Math.round(invOf(p).pct * 3)), at: Date.now(), log: ['Something odd on ' + nm(p) + ': ' + p.odd + '.'] };
  S.mys.push(o);
  if (reps) reps.unshift({ ev: { battle: true, ic: '?', title: 'A mystery: ' + capFirst(p.odd), t: o.log[0], got: 'Observe it with the Mystery mission, whenever you like. It travels with you.' } });
}
// solving one: the old investigation's rewards
function oddSolved(o, reps) {
  const f = byNum(o.num); if (!f) return '';
  const p = f.p, v = p.inv = p.inv || { pct: 0, done: false }; v.pct = 1; v.done = true; v.at = Date.now(); S.cnt.inv = (S.cnt.inv || 0) + 1;
  const ano = catOpen('ano'), it = rollCat(p, ano ? 'ano' : 'art'), nw = gainItem(it, p); award(0, IV.knowledge + (nw ? 12 : 0));
  return it.name + ' (' + it.rar + (nw ? ', new!' : '') + ')';
}
