/* Solarist: Investigate: study a world's oddity for 3-4 study sessions. When it's solved, its explanation goes in the Codex
   (a Transmissions filter), with Knowledge and a guaranteed Anomalies find. The text is in expeditions.json "investigate". */
'use strict';

const IVD = (SOLARIST_MOUNT.expd && SOLARIST_MOUNT.expd.investigate) || {};
const IV = E.investigate;
const invOf = p => (p && p.inv) || { pct: 0, done: false };
const canInvestigate = p => !!p && !!p.odd && !p.story && !invOf(p).done;
const investigating = () => S.mission === -8 && canInvestigate(atP());
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
function invDone(reps) {
  const p = atP(), v = p.inv = p.inv || { pct: 0, done: false }, odd = capFirst(p.odd);
  v.pct = Math.min(1, v.pct + IV.min + Math.random() * Math.max(0, IV.max - IV.min));
  S.cnt.invSteps = (S.cnt.invSteps || 0) + 1; award(20, 15);
  const steps = IVD.steps && IVD.steps.length ? IVD.steps : ['The science team studied {odd}.'];
  const line = capFirst(steps[Math.floor(Math.random() * steps.length)].split('{odd}').join(p.odd)), pct = Math.round(v.pct * 100) + '%';
  if (v.pct < 1) {
    reps.unshift({ ev: { battle: true, ic: '🔬', title: 'Investigating ' + nm(p) + ' · ' + pct, t: line + ' The team is ' + pct + ' of the way to an answer.' } });
    return '🔬 ' + pct + ' of the way to explaining ' + p.odd + '.';
  }
  v.done = true; v.at = Date.now(); S.mission = 0; S.cnt.inv = (S.cnt.inv || 0) + 1;
  const ano = catOpen('ano'), it = rollCat(p, ano ? 'ano' : 'art'), nw = gainItem(it, p);
  award(60 + (nw ? 10 : 0), IV.knowledge + (nw ? 12 : 0)); gainKp(1);
  const got = '+' + IV.knowledge + ' Knowledge · 📘 +1 Knowledge point · 🎒 ' + it.name + ' (' + it.rar + (nw ? ', new!' : '') + ')' + (ano ? '' : '. Research Anomaly Containment to bring back true anomalies.');
  pushEv({ c: 'codex', ic: '🔬', title: 'Codex: ' + odd + ' (' + nm(p) + ')', t: codexText(p.odd), at: Date.now() });
  reps.unshift({ ev: { battle: true, ic: '🔬', title: 'Solved: ' + odd, t: line + ' ' + codexText(p.odd), got } });
  return '🔬 Solved! The answer is in the Codex (Transmissions).';
}
