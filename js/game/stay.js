/* Solarist: Places and Stay here. Every world has a handful of places to find: its expedition charts three, and
   staying on the world finds the rest. Stay here spends a study session on the world doing something you pick
   (content/activities.json): it writes a little story, and may turn up a new place or a souvenir. */
'use strict';

const STAY = -9; // S.mission while staying
const placesMax = p => 3 + ({ Common: 2, Uncommon: 3, Rare: 4, Legendary: 5 }[p.rarity] || 2) - (gasWorld(p) ? 1 : 0);
const expLeft = p => p.story || exDone(p) ? 0 : EX_LEN - exOf(p).step; // places the expedition will still chart
const placesLeft = p => Math.max(0, placesMax(p) - exOf(p).poi.length - expLeft(p)); // places staying can still find
const placesUnfound = p => Math.max(0, placesMax(p) - exOf(p).poi.length);
const placeName = o => o.custom || o.name;
const actsFor = p => p ? (TEXT.acts || []).filter(a => txFits(a, worldCtx(p))) : [];
function stayAct() { const L = actsFor(atP()); return L.find(a => a.id === S.stayAct) || L[0] || null; }
const staying = () => S.mission === STAY && !!atP() && !!stayAct();

// a place's description: written once from the world it's on, the same every time
function placeDesc(p, o) {
  if (o.desc) return o.desc;
  let h = p.seed >>> 0; for (const ch of o.name) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  o.desc = txLine('place', worldCtx(p), rng(h)) || '';
  return o.desc;
}
function findPlace(p, how) { // one of the world's remaining places, or null when it has no more
  if (placesLeft(p) <= 0) return null;
  const x = p.ex = p.ex || { step: 0, pick: 0, poi: [] };
  const o = { name: poiName(p, Math.floor(Math.random() * EX_LEN)), note: '', leg: -1, at: Date.now(), how };
  placeDesc(p, o); x.poi.push(o); S.cnt.poi = (S.cnt.poi || 0) + 1; S.cnt.staysFound = (S.cnt.staysFound || 0) + 1;
  return o;
}
function renamePlace(p, o) {
  const v = window.prompt('Name this place (leave empty to restore "' + o.name + '"):', placeName(o));
  if (v == null) return;
  const t = v.trim().slice(0, 40);
  if (t && t !== o.name) o.custom = t; else delete o.custom;
  save(); draw(); if (typeof drawLog === 'function' && !logPane.hidden) drawLog();
}

// a finished Stay here session
function stayDone(reps) {
  const p = atP(), a = stayAct(), people = S.crew.length ? S.crew : [S.me], who = people[Math.floor(Math.random() * people.length)];
  const found = exOf(p).poi, spot = found.length && Math.random() < .6 ? placeName(found[Math.floor(Math.random() * found.length)]) : nm(p);
  const t = crewMoment(who, 'act_' + a.id, p, { place: spot }) || capFirst(a.name.toLowerCase()) + ' on ' + nm(p) + '.';
  const got = [];
  if (Math.random() < (a.find || 0)) { const o = findPlace(p, a.id); if (o) got.push('📍 New place: ' + o.name); }
  if (Math.random() < (a.souvenir || 0)) { const it = rollItem(p, false, 'survey'), nw = gainItem(it, p); got.push('🎒 ' + it.name + ' (' + it.rar + (nw ? ', new!' : '') + ')'); }
  award(20 + 10 * got.length, 10 + (got.length ? 5 : 0));
  S.cnt.stays = (S.cnt.stays || 0) + 1; (S.cnt.acts = S.cnt.acts || {})[a.id] = (S.cnt.acts[a.id] || 0) + 1;
  const title = a.ic + ' ' + a.name + ' on ' + nm(p), gotTxt = got.join(' · ') || null;
  reps.unshift({ ev: { battle: true, ic: a.ic, title, t, got: gotTxt } });
  pushEv({ c: 'stay', ic: a.ic, title, t, got: gotTxt, at: Date.now() });
  return a.ic + ' ' + (got.length ? got[0] + '.' : a.name + ' on ' + nm(p) + '.');
}
