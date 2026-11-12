/* Solarist: small extras (content/extras.json). Star regions that open with hours studied; going back to your home
   or favourite worlds; the sky of the day; campfire talks on long breaks; and a gentle weekly recap. */
'use strict';

// ---------- star regions: where Travel on goes. More open as you study ----------
const hoursStudied = () => (S.minutes || 0) / 60;
const regions = () => TEXT.regions || [];
const regionOpen = g => hoursStudied() >= (g.hours || 0);
const regionNow = () => { const L = regions(), g = L.find(x => x.id === S.region); return g && regionOpen(g) ? g : L[0] || null; };
const regionOf = p => regions().find(g => g.id === p.region) || null;
if (!S.regionsSeen) S.regionsSeen = {}; regions().forEach(g => { if (regionOpen(g)) S.regionsSeen[g.id] = S.regionsSeen[g.id] || Date.now(); });
function regionCheck(notes) { // a region opening is worth a line in the report
  regions().forEach(g => { if (!S.regionsSeen[g.id] && regionOpen(g)) { S.regionsSeen[g.id] = Date.now(); notes.push('🌌 A new region is open: ' + g.name + '. ' + g.desc + ' Pick it under Travel on.');
    pushEv({ c: 'ship', ic: '🌌', title: 'New region: ' + g.name, t: g.desc, at: Date.now() }); } });
}

// ---------- going back: Travel on can head home, or to a favourite world ----------
const returnPlaces = () => S.found.map(f => f.p).filter(p => (p.fav || S.home === p.num) && p.num !== S.at && !p.story);
const returning = () => S.mission === 0 && S.exploreKind === 'return' && !!byNum(S.returnTo) && S.returnTo !== S.at;
function returnTrip(reps) {
  const p = byNum(S.returnTo).p, days = Math.max(1, Math.round((Date.now() - (p.lastAt || byNum(p.num).at)) / 86400000));
  const people = S.crew.length ? S.crew : [S.me], c = people[Math.floor(Math.random() * people.length)];
  const t = txLine('return', Object.assign(worldCtx(p), { crew: personCtx(c), days, camped: !!p.camped })) || 'Back on ' + nm(p) + '.';
  S.at = p.num; S.exploreKind = 'random'; S.cnt.returns = (S.cnt.returns || 0) + 1; award(15, 5); oddFind(p, reps);
  reps.unshift({ ev: { battle: true, ic: S.home === p.num ? '🏠' : '★', title: (S.home === p.num ? 'Home again: ' : 'Back on ') + nm(p), t } });
  pushEv({ c: 'stay', ic: S.home === p.num ? '🏠' : '★', title: 'Back on ' + nm(p), t, at: Date.now() });
  return p;
}

// ---------- the sky of the day: the same for everyone on the same day, seen on your first study session ----------
if (!S.skies) S.skies = {}; // day: sky id
function skyToday() { const L = TEXT.skies || []; if (!L.length) return null; let h = 7; for (const ch of today()) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0; return L[h % L.length]; }
function skyCheck(reps) {
  const s = skyToday(), d = today(); if (!s || S.skies[d]) return;
  S.skies[d] = s.id; award(10, 5);
  reps.push({ ev: { battle: true, ic: s.ic, title: 'Today\'s sky: ' + s.name, t: s.text } });
  pushEv({ c: 'ev', ic: s.ic, title: 'Today\'s sky: ' + s.name, t: s.text, at: Date.now() });
}

// ---------- campfire talks: on a long break, the crew sit around and talk about the last few trips ----------
function campfire(reps) {
  const all = [S.me].concat(S.crew), lastW = S.found.length ? S.found[S.found.length - 1].p : null, here = atP() || lastW;
  const spots = here ? exOf(here).poi : [], place = spots.length ? placeName(spots[Math.floor(Math.random() * spots.length)]) : here ? nm(here) : 'the last world';
  const base = Object.assign(here ? worldCtx(here) : {}, { recent: lastW ? nm(lastW) : 'the last world', place, ship: S.ship.name.replace(/^The /, 'the ') });
  const lines = [];
  if (all.length < 2) { const t = txLine('campfire_alone', Object.assign(base, { crew: personCtx(S.me) })); if (t) lines.push(t); }
  else for (let i = 0; i < 2; i++) { const [a, b] = all.slice().sort(() => Math.random() - .5), t = txLine('campfire', Object.assign({}, base, { crew: personCtx(a), other: personCtx(b), bond: S.bond[bondKey(a, b)] || 0 })); if (t && !lines.includes(t)) lines.push(t); }
  if (!lines.length) return;
  S.cnt.campfires = (S.cnt.campfires || 0) + 1;
  reps.push({ ev: { battle: true, ic: '🔥', title: 'Around the campfire', t: lines.join(' ') } });
  pushEv({ ic: '🔥', title: 'Around the campfire', t: lines.join(' '), at: Date.now() });
}

// ---------- a little diary of study time, and the weekly recap ----------
if (!S.daily) S.daily = {}; // day: { m: minutes studied, n: sessions }
function logStudy(mins) { const d = today(), x = S.daily[d] = S.daily[d] || { m: 0, n: 0 }; x.m += mins; x.n++; }
const weekStart = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }; // Monday
function weekRecap() { // once a week, on the first visit: what last week looked like (only when something happened)
  const thisWk = weekStart(Date.now()), key = dayKey(thisWk); if (S.recapWk === key) return;
  const first = S.recapWk == null; S.recapWk = key; save();
  if (first) return; // the week this started: nothing to look back on yet
  const from = new Date(thisWk); from.setDate(from.getDate() - 7); const a = from.getTime(), b = thisWk.getTime(), inWk = t => t >= a && t < b;
  let mins = 0, n = 0; for (let i = 0; i < 7; i++) { const d = new Date(from); d.setDate(d.getDate() + i); const x = S.daily[dayKey(d)]; if (x) { mins += x.m; n += x.n; } }
  const worlds = S.found.filter(f => inWk(f.at)).length, solved = S.events.filter(e => inWk(e.at) && /^Codex: /.test(e.title || '') && e.c === 'codex').length;
  const notes = (S.learn || []).filter(l => inWk(l.at)), subs = {}; notes.forEach(l => { if (l.sub) subs[l.sub] = (subs[l.sub] || 0) + (l.mins || 0) + 1; });
  const top = Object.keys(subs).sort((x, y) => subs[y] - subs[x])[0];
  if (!n && !worlds) return; // a quiet week is fine: no recap, no guilt
  const bits = [n ? Math.round(mins / 6) / 10 + ' hours over ' + n + ' study session' + (n === 1 ? '' : 's') : null, worlds ? worlds + ' new world' + (worlds === 1 ? '' : 's') : null,
    solved ? solved + ' puzzle' + (solved === 1 ? '' : 's') + ' solved' : null, notes.length ? notes.length + ' learning note' + (notes.length === 1 ? '' : 's') : null].filter(Boolean);
  const t = 'Last week: ' + bits.join(', ') + '.' + (top ? ' Most studied: ' + top + '.' : '') + ' Nice going.';
  pushEv({ c: 'ship', ic: '🗓', title: 'Your week', t, at: Date.now() });
  if (typeof showToast === 'function') showToast(['🗓 Your week', t]);
}
