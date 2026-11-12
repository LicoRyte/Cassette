/* Solarist: seasons. The voyage is an episodic story: every finished study session plays the next episode of the
   current season (content/seasons.json). A season is a premise played over 7 to 9 episodes; some episodes take the ship
   to a new world, some end with a choice to make on the break, and a finale picks its ending from those choices.
   Then a new season starts from another premise. Premises come round again, but never quite the same: each run gets
   a different twist, a different crew member in the spotlight, different wording, and callbacks to what came before.
   After the episode, the crew's own little moments fill in the rest (js/game/ship.js, js/game/crewstories.js). */
'use strict';

if (!S.season || typeof S.season !== 'object') S.season = null; // the one being played: { id, n, ep, spot, twist, flags, seen, ask, at }
if (!Array.isArray(S.seasonsDone)) S.seasonsDone = []; // [{ id, n, title, ending, spot, at }]
if (!S.seasonN) S.seasonN = 0;
const premises = () => TEXT.seasons || [];
const premiseOf = id => premises().find(x => x.id === id) || null;
const seasonPerson = id => [S.me].concat(S.crew).find(c => c.id === id) || (S.crew[0] || S.me);
const pickR = L => L[Math.floor(Math.random() * L.length)];
// the words around an episode: the spotlight crew member, someone else aboard, the world, and things remembered
function seasonCtx(se) {
  const spot = seasonPerson(se.spot), others = S.crew.filter(c => c !== spot), other = others.length ? pickR(others) : S.me;
  const pastW = S.found.filter(f => f.p.num !== S.at).map(f => nm(f.p)), pastS = S.seasonsDone.map(x => x.title);
  return Object.assign(atP() ? worldCtx(atP()) : { world: 'the dark between stars', biome: 'dust' }, {
    spot: personCtx(spot), crew: personCtx(other), captain: { name: meName() }, ship: S.ship.name.replace(/^The /, 'the '),
    flags: se.flags, rerun: S.seasonsDone.some(x => x.id === se.id) ? 'yes' : 'no', n: se.n,
    past: { world: pastW.length ? pickR(pastW) : 'the last world', season: pastS.length ? pastS[pastS.length - 1] : 'the first voyage' } });
}
// one of a list of variants that fits, and not the one used last time if there's another
function seasonPick(list, ctx, avoid) {
  const fit = (list || []).filter(v => txFits(v, ctx)); if (!fit.length) return null;
  const fresh = fit.filter((v, i) => fit.length < 2 || i !== avoid), i = fit.indexOf(pickR(fresh.length ? fresh : fit));
  return { i, text: txFill(typeof fit[i] === 'object' ? fit[i].text : fit[i], ctx) };
}
// start a new season: a premise you haven't played (or the one played longest ago), a twist and someone in the spotlight
function seasonStart() {
  const all = premises(); if (!all.length) return null;
  const played = id => S.seasonsDone.filter(x => x.id === id), last = id => { const L = played(id); return L.length ? L[L.length - 1].at : 0; };
  const fresh = all.filter(x => !played(x.id).length), prev = S.seasonsDone.length ? S.seasonsDone[S.seasonsDone.length - 1].id : null;
  const pool = fresh.length ? fresh : all.filter(x => x.id !== prev).sort((a, b) => last(a.id) - last(b.id)).slice(0, 3);
  const d = pickR(pool.length ? pool : all);
  const usedTw = played(d.id).map(x => x.twist), tws = (d.twists || []).filter(t => !usedTw.includes(t.id)), twist = pickR(tws.length ? tws : d.twists || [{ id: '' }]);
  const people = S.crew.length ? S.crew : [S.me], usedSp = played(d.id).map(x => x.spot);
  const fits = people.filter(c => !d.spot || personCtx(c).tags.includes(d.spot)), pool2 = (fits.length ? fits : people).filter(c => !usedSp.includes(c.id));
  const spot = pickR(pool2.length ? pool2 : fits.length ? fits : people);
  S.seasonN++;
  S.season = { id: d.id, n: S.seasonN, ep: 0, spot: spot.id, twist: twist.id || '', flags: {}, seen: (S.seasonSeen || {})[d.id] || {}, ask: null, at: Date.now() };
  return S.season;
}
// the episode for a finished study session. reps: the session report. Returns { msg, travel }
function seasonStep(reps) {
  let se = S.season && premiseOf(S.season.id) ? S.season : seasonStart();
  if (!se) return { msg: '', travel: !atP() };
  const d = premiseOf(se.id);
  se.answered = null;
  if (se.ask) { const o = se.ask.options[0]; se.flags[o.flag] = 'yes'; se.ask = null; } // a choice nobody made: the first one happens
  const beat = d.beats[se.ep], travel = !!beat.travel || se.ep === 0 || !atP();
  return { travel, after: () => seasonText(se, d, beat, reps) }; // the words come after the ship arrives, so they can name the new world
}
function seasonText(se, d, beat, reps) {
  const ctx = seasonCtx(se), seen = se.seen;
  const v = seasonPick(beat.variants, ctx, seen[se.ep]); seen[se.ep] = v ? v.i : null;
  let t = v ? v.text : '';
  const tw = (d.twists || []).find(x => x.id === se.twist); if (tw && tw.at === se.ep) { const w = seasonPick(tw.variants, ctx); if (w) t += ' ' + w.text; }
  const last = se.ep >= d.beats.length - 1, total = d.beats.length;
  let title = 'Season ' + se.n + ' · ' + d.title + ' · Episode ' + (se.ep + 1) + ' of ' + total, got = null;
  if (last) { // the finale: the ending that fits the choices made
    const e = (d.endings || []).find(x => txFits(x, ctx)) || (d.endings || [])[0];
    const ew = e ? seasonPick(e.variants, ctx) : null; if (ew) t += ' ' + ew.text;
    title = 'Season ' + se.n + ' · ' + d.title + ' · Finale';
    got = 'The end of season ' + se.n + '. A new season starts with your next study session.';
    S.seasonsDone.push({ id: d.id, n: se.n, title: d.title, ending: e ? e.id || '' : '', spot: se.spot, twist: se.twist, at: Date.now() });
    (S.seasonSeen = S.seasonSeen || {})[d.id] = seen; S.season = null;
  } else {
    if (beat.choice) { se.ask = { prompt: txFill(beat.choice.prompt, ctx), options: beat.choice.options.map(o => ({ label: txFill(o.label, ctx), flag: o.flag, reply: o.reply })) }; got = 'A choice waits on the break: ' + se.ask.prompt; }
    se.ep++;
  }
  reps.unshift({ ev: { battle: true, ic: '', title, t, got } });
  pushEv({ c: 'season', ic: '', title, t, got, at: Date.now() });
  return last ? 'The season ends: ' + d.title + '.' : 'Episode ' + se.ep + ' of ' + d.title + '.';
}
// the player's answer on the break
function seasonChoose(i) {
  const se = S.season; if (!se || !se.ask) return;
  const o = se.ask.options[i]; if (!o) return;
  se.flags[o.flag] = 'yes';
  const t = txFill(o.reply, seasonCtx(se)); se.ask = null; se.answered = t;
  pushEv({ c: 'season', ic: '', title: 'Your choice: ' + o.label, t, at: Date.now() });
  hint.textContent = t; save(); draw();
}
// what's on now, for the timer's status line
function seasonNow() {
  const se = S.season, d = se && premiseOf(se.id);
  if (!d) return { line: 'A new season starts with your next study session', title: '' };
  return { line: 'Season ' + se.n + ' · ' + d.title, ep: se.ep + 1, total: d.beats.length, title: d.title };
}
