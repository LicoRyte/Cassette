/* Solarist: Arrival encounters and deep-space events. */

'use strict';

const EV_CHANCE = 1 / 10; // how often a study session brings a deep-space event

// The arrival roll: one roll per new world (economy.json "encounter"). chance = the chance of any visitor; the weights pick which one,
// so a world never gets two: a chance meeting, a derelict, or someone who trades.
const ENC_BUILT = { meeting: 1, derelict: 1, trade: 1 }; // a weight left out of this list stays quiet
function rollArrival(p) {
  const EN = E.encounter, W = EN.weights, tot = Object.keys(W).filter(k => ENC_BUILT[k]).reduce((a, k) => a + W[k], 0) || 1;
  const bonus = { meeting: hasT('nav1') ? .05 : 0 };
  const ch = {};
  Object.keys(W).forEach(k => { if (!ENC_BUILT[k]) return; ch[k] = Math.max(0, EN.chance * W[k] / tot + (bonus[k] || 0)); });
  const sum = Object.values(ch).reduce((a, n) => a + n, 0);
  if (Math.random() >= Math.min(.9, sum)) return null; // most worlds are quiet
  let x = Math.random() * sum; for (const k of Object.keys(ch)) { x -= ch[k]; if (x < 0) return k; }
  return null;
}
// Chance meetings are written in content/traders.json ("meeting").
if (!S.events) S.events = []; if (!S.fc) S.fc = { n: 0, broken: false };
function rollEvent(force) {
  if (!force && Math.random() >= EV_CHANCE * (hasT('shp3') ? 1.5 : 1)) return null;
  const pk = a => a[Math.floor(Math.random() * a.length)];
  const nameBit = () => { let n = ''; for (let i = 0; i < 2; i++) n += pk(SYL); return n.charAt(0).toUpperCase() + n.slice(1); };
  const pl = posts(); const pool = EVENTS.filter(e => !e[2].includes('{post}') || pl.length);
  const [ic, title, tpl, reward] = pk(pool);
  let t = tpl.replace('{who}', pk(TITLE) + ' ' + nameBit()).replace('{msg}', pk(BOTTLE)).replace('{fix}', pk(FIX))
    .replace('{post}', pl.length ? nm(pk(pl).p) : 'nowhere').replace('{world}', S.found.length ? nm(pk(S.found).p) : nameBit());
  void reward;
  const ev = { ic, title, t, at: Date.now() };
  pushEv(ev); S.cnt.ev++;
  return ev;
}
