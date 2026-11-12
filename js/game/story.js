/* Solarist: The Meridian story: fifteen authored planets (story.json, spoilers), reached only by Follow the Signal.
   Each chapter is five legs on its planet, one study session each, with two choices that change the wording only.
   The fifth leg reveals the next signal. The last leg of the last chapter is a door with a puzzle: its answer is only
   ever checked as a SHA-256 hash, never stored. */
'use strict';

const STD = SOLARIST_MOUNT.story && Array.isArray(SOLARIST_MOUNT.story.chapters) && SOLARIST_MOUNT.story.chapters.length ? SOLARIST_MOUNT.story : null;
const ST_N = STD ? STD.chapters.length : 0, ST_LEGS = 5;
const DOOR_HASH = '4932d183a0bd0924e90b35ffecd879c6eab576280a83503c20c3ad834a88e4da';
if (!S.story || !Array.isArray(S.story.nums)) S.story = { ch: 0, nums: [], log: [], wrong: 0, solved: false, done: false };
const stP = i => { const f = S.story.nums[i] && byNum(S.story.nums[i]); return f ? f.p : null; };
const storyDone = () => !STD || S.story.done;
const isLastCh = i => i === ST_N - 1;
// the signal leads to the current chapter's world: made the first time you follow it, and back there if you left mid-chapter
const signalOn = () => !!STD && !S.story.done && S.at !== S.story.nums[S.story.ch];
const signalText = () => !STD ? '' : S.story.ch === 0 ? STD.firstSignal : STD.chapters[S.story.ch - 1].signal;
const following = () => S.mission === 0 && S.exploreKind === 'signal' && signalOn();
// the chapter on the world you're at, and its next leg (the door doesn't need a study session)
const chHere = () => { const p = atP(); return STD && !S.story.done && p && p.story && p.story.ch === S.story.ch ? p : null; };
const atDoor = () => { const p = chHere(); return !!p && isLastCh(p.story.ch) && p.story.step === ST_LEGS - 1; };
const chaptering = () => S.mission === -3 && !!chHere() && !atDoor();
const chLeg = p => STD.chapters[p.story.ch].legs[p.story.step];

function makeStoryPlanet(i) { // the chapter's world, looking exactly as written
  const c = STD.chapters[i], num = S.nextNum++;
  let p = null;
  for (let k = 0; k < 6000 && !p; k++) { const q = makePlanet((0x51A7 * (i + 1) + k * 7919) >>> 0, num, false, 0); if (q.type === c.type) p = q; }
  if (!p) p = makePlanet((0x51A7 * (i + 1)) >>> 0, num, false, 0);
  const L = c.look || {};
  Object.assign(p, { type: c.type, name: c.name, star: /^no star/.test(c.star) ? 'none (lit by the Lantern)' : c.star, odd: c.odd, log: c.desc, rarity: 'Rare', rings: !!L.rings, visit: 'none', story: { ch: i, step: 0, pick: 0 } });
  if (L.moons != null) p.moons = L.moons;
  if (/^none/.test(p.star)) { p.year = 0; }
  p.look = Object.assign({}, p.look, { pal: (L.pal || p.look.pal).slice(), clouds: !!L.clouds || p.look.clouds, ringCol: L.ringCol || p.look.ringCol });
  delete p.lucky; delete p.nudged;
  p.x = makeExtra(p);
  return p;
}
function followSignal() { // arrive at the current chapter's world
  let p = stP(S.story.ch), fresh = false;
  if (!p) { p = makeStoryPlanet(S.story.ch); S.found.push({ at: Date.now(), p }); S.story.nums[S.story.ch] = p.num; fresh = true; S.cnt.rar[p.rarity] = (S.cnt.rar[p.rarity] || 0) + 1; }
  S.at = p.num; S.exploreKind = 'random';
  award(fresh ? 40 : 15, fresh ? 15 : 0);
  return { p, fresh };
}
function chLegDone(reps) {
  const p = chHere(), st = p.story, ch = st.ch, leg = chLeg(p), pick = st.pick ? 'b' : 'a', c = STD.chapters[ch];
  const kn = 20 + (hasT('shp4') ? 10 : 0); award(25, kn);
  S.story.log.push({ ch, leg: st.step, pick, at: Date.now() }); S.cnt.storyLegs = (S.cnt.storyLegs || 0) + 1;
  { const cd = S.cnt.campDay = S.cnt.campDay || { d: '', n: 0, best: 0 }; if (cd.d !== today()) { cd.d = today(); cd.n = 0; } cd.n++; cd.best = Math.max(cd.best, cd.n); }
  st.step++; st.pick = 0;
  let msg, extra = '';
  if (st.step >= ST_LEGS) { // chapter done: the next signal
    S.story.ch++; S.mission = 0; award(60, 30); gainKp(1); extra = ' · Chapter complete: +30 Knowledge, 📘 +1 Knowledge point';
    msg = '📡 Chapter ' + (ch + 1) + ' complete. A new signal is waiting: Follow the Signal from Explore.';
  } else if (isLastCh(ch) && st.step === ST_LEGS - 1) { S.mission = 0; msg = '📡 Only one thing is left on ' + nm(p) + '. It\'s waiting on the left, under the timer.'; }
  else msg = '📡 Chapter ' + (ch + 1) + ', part ' + st.step + ' of ' + ST_LEGS + ' done.';
  reps.unshift({ story: { ch, leg: st.step - 1, pick, got: null, signal: st.step >= ST_LEGS ? c.signal : null } });
  pushEv({ c: 'camp', ic: '📡', title: 'Chapter ' + (ch + 1) + ' · ' + leg.title, t: leg.text.join(' ') + ' (' + leg[pick][0] + ') ' + leg[pick][1], at: Date.now() });
  return msg;
}
// the door: the answer is normalized (lowercase a-z only) and compared as a hash; nothing about it is stored
async function doorTry(input) {
  if (!atDoor() || S.story.solved || focusLock()) return;
  const norm = String(input || '').toLowerCase().replace(/[^a-z]/g, '');
  let hex = '';
  try { const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(norm)); hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join(''); }
  catch (e) { doorMsg = 'The door can\'t hear you here. (It needs the game opened from https or localhost.)'; drawLeft(); return; }
  if (norm && hex === DOOR_HASH) { S.story.solved = true; doorMsg = ''; S.cnt.doorTries = (S.story.wrong || 0) + 1; pushEv({ c: 'camp', ic: '🚪', title: 'The door opened', t: STD.chapters[ST_N - 1].legs[ST_LEGS - 1].success.join(' '), at: Date.now() }); save(); draw(); return; }
  S.story.wrong = (S.story.wrong || 0) + 1;
  const hints = (STD.hints || []).filter(([n]) => S.story.wrong >= n).map(([, t]) => t);
  doorMsg = [STD.wrong || 'The door stays quiet.'].concat(hints.length ? [hints[hints.length - 1]] : []).join(' ');
  save(); drawLeft();
}
let doorMsg = '';
function storyEnd(pick) { // the last choice after the door opens
  const p = chHere(); if (!p || !S.story.solved || S.story.done || focusLock()) return;
  const leg = chLeg(p), k = pick ? 'b' : 'a';
  S.story.log.push({ ch: p.story.ch, leg: p.story.step, pick: k, at: Date.now() }); p.story.step++;
  S.story.done = true; S.story.ending = k; S.cnt.storyLegs = (S.cnt.storyLegs || 0) + 1;
  const it = rareFind(p, 'gift'), nw = gainItem(it, p); award(300, 150);
  const got = '+150 Knowledge · 🎒 ' + it.name + ' (' + it.rar + (nw ? ', new!' : '') + ')';
  pushEv({ c: 'camp', ic: '📡', title: 'The Meridian story is complete', t: '(' + leg[k][0] + ') ' + leg[k][1], got, at: Date.now() });
  hint.textContent = '📡 ' + leg[k][1] + ' The Meridian story is complete. ' + got; save(); flushXP([]); draw();
}

// ---------- once: the old 100-log campaign is replaced by the new story ----------
if (!S.rw3) {
  if (S.camp) {
    S.cnt.oldLogs = S.camp.n || 0;
    if (S.camp.n) pushEv({ c: 'camp', ic: '📡', title: 'A new Meridian story', t: 'The old Meridian logs are gone. In their place: fifteen worlds the Meridian crew left their mark on, reached only by following their signal. The story starts from the beginning: pick Follow the Signal when you Explore.', at: Date.now() });
    delete S.camp;
  }
  if (S.mission === -3) S.mission = 0;
  S.rw3 = 1;
}
