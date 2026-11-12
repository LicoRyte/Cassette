/* Solarist: The timer: start, pause, skip, finish (the end of every session) and draw(). */
'use strict';

/* ---------- timer ---------- */
const fmt = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
function remaining() { return running ? Math.max(0, endAt - Date.now()) : left; }
function persistRun() { S.run = { mode, left: remaining(), endAt: running ? endAt : 0, running }; save(); }
function setMode(m) { mode = m; left = length(m); hint.textContent = ''; draw(); persistRun(); }
function start() { if (running) return; if (left <= 0) left = length(mode); running = true; endAt = Date.now() + left; persistRun(); loop(); draw(); }
function pause() { if (!running) return; left = remaining(); running = false; clearInterval(tickT); persistRun(); draw(); }
function reset() { running = false; clearInterval(tickT); left = length(mode); persistRun(); draw(); }
function skip() {
  running = false; clearInterval(tickT);
  S.cnt.skips = (S.cnt.skips || 0) + 1;
  S.fc.broken = true; // skipping anything breaks this cycle's Full Cycle bonus
  if (mode === 'focus') toBreak(); else setMode('focus');
  hint.textContent = mode === 'focus' ? 'Break skipped. Ready for the next session.' : 'Turned back early. No new world this time.';
  persistRun();
}
function toBreak() { setMode(S.cycle > 0 && S.cycle % S.set.every === 0 ? 'long' : 'short'); }
function loop() { clearInterval(tickT); tickT = setInterval(() => { if (remaining() <= 0) finish(); else drawClock(); }, 250); }
function finish(quiet) {
  pvClose(true);
  clearInterval(tickT); running = false; left = 0;
  const done = (msg, cardP, how) => { // the shared ending: a sound, the card, then the break
    if (!quiet && hooks.tada) hooks.tada();
    if (hooks.show) hooks.show();
    showCard(cardP || null, how); toBreak();
    hint.textContent = msg;
  };
  if (mode === 'focus') {
    rollDay(); if (S.cnt.lastDay !== today()) { S.cnt.lastDay = today(); S.cnt.days++; }
    S.total++; S.todayN++; S.cycle++; S.minutes += S.set.focus; S.fc.n++; logStudy(S.set.focus);
    { S.cnt.maxFocus = Math.max(S.cnt.maxFocus || 0, S.set.focus); const st = S.cnt.streak = S.cnt.streak || { last: '', n: 0, best: 0 }, td = today(); if (st.last !== td) { const y = new Date(); y.setDate(y.getDate() - 1); st.n = st.last === dayKey(y) ? st.n + 1 : 1; st.last = td; st.best = Math.max(st.best, st.n); } }
    { (S.cnt.dow = S.cnt.dow || {})[new Date().getDay()] = 1; const hr = new Date().getHours(); if (hr < 4) S.cnt.night = (S.cnt.night || 0) + 1; else if (hr < 7) S.cnt.early = (S.cnt.early || 0) + 1; }
    const reps = [];
    // the story: the next episode of the season (js/game/season.js). It may take the ship to a new world first
    let foundP = null;
    const then = () => ' Now a ' + MODES[mode].toLowerCase() + '.';
    const st = seasonStep(reps);
    if (st.travel) {
      const p = makePlanet((Math.random() * 4294967296) >>> 0, S.nextNum++, false, .05, regionNow());
      p.visit = 'none'; S.found.push({ at: Date.now(), p }); S.at = p.num; S.cnt.rar[p.rarity] = (S.cnt.rar[p.rarity] || 0) + 1;
      foundP = p;
    }
    const msg = st.after ? st.after() : '';
    done('', foundP, foundP ? 'new' : 'log');
    hint.textContent = (foundP ? 'Arrived at ' + nm(foundP) + '. ' : '') + msg + then();
    const ev = null;
    sessionEnd(reps, foundP, ev);
    learnAsk(true); openReport();
  } else {
    S.cnt.breaks = (S.cnt.breaks || 0) + 1;
    if (!quiet && hooks.ding) hooks.ding();
    if (hooks.show) hooks.show();
    const wasLong = mode === 'long';
    setMode('focus');
    hint.textContent = 'Break over. The next episode is ready when you are.';
    if (wasLong) { // Full Cycle: every session and break of the cycle finished, nothing skipped
      if (!S.fc.broken && S.fc.n >= S.set.every) {
        S.fcDay = today(); S.cnt.fc++; S.eventNext = true;
        hint.textContent = '★ Full Cycle: every session and break, nothing skipped. Well done.';
        const notes = ['★ Full Cycle: every session and break of the cycle, nothing skipped.'];
        showTrans([{ notes }]); showCard(null); encBox.hidden = true; learnAsk(false); openReport();
      }
      S.fc = { n: 0, broken: false };
    }
  }
  persistRun(); draw();
}
function drawClock() {
  const r = remaining(), pct = Math.min(100, Math.max(0, 100 - (r / length(mode)) * 100));
  timeText.textContent = fmt(r);
  const hl = plain(headline()); if (bigText.textContent !== hl) bigText.textContent = hl;
  if (running && !dotT) dotT = setInterval(() => { dotN++; drawDots(); }, 450);
  if (!running && dotT) { clearInterval(dotT); dotT = 0; dotN = 0; }
  drawDots(); drawCycle(pct);
  barFill.style.width = pct + '%'; bar.setAttribute('aria-valuenow', Math.round(pct));
  if (hooks.scene) { // what the flight scene should show
    const kind = sceneKind();
    hooks.scene({ mode, kind: pv ? 'view' : kind, pv: !!pv, running, pct, paused: !running && left > 0 && left < length(mode), planet: pv ? pvP() : scenePlanet(kind), spot: planetSpot, ship: S.ship });
    if (pv) { const tm = pvBar.querySelector('.sx-pv-time'); if (tm) tm.textContent = running ? '⏱ ' + fmt(r) + (mode === 'focus' ? ' left to study' : ' of break left') : ''; }
  }
  const act = returning() ? 'Heading back' : observing() ? 'Observing a mystery' : staying() ? 'Staying on a world' : chaptering() ? 'The Meridian' : following() ? 'Following the signal' : expediting() ? 'Exploring' : salvaging() ? 'Salvaging' : 'Traveling';
  if (hooks.title) hooks.title(running ? fmt(r) + ' · ' + (mode === 'focus' ? act : 'Preparing') : 'Solarist');
  if (hooks.presence) { // your Discord status (only sent when it's turned on in Settings)
    const kind = sceneKind(), p = pv ? null : scenePlanet(kind), paused = !running && left > 0 && left < length(mode);
    const details = mode === 'focus' ? (running ? 'Studying · ' + act : paused ? 'Paused · ' + act : 'Ready for launch') : (running ? (mode === 'long' ? 'On a long break' : 'On a break') : paused ? 'Break paused' : 'Break is ready');
    const state = p ? 'At ' + nm(p) + ' · ' + worldLabel(p) : 'Between worlds';
    hooks.presence({ details, state, ship: S.ship && S.ship.name });
  }
}
// while a study session runs, everything that isn't pure data is put away (back at the break)
let wasLocked = false, rightPrev = 'up';
const focusLock = () => running && mode === 'focus';
function draw() {
  const lk = focusLock();
  if (lk !== wasLocked) { wasLocked = lk; if (lk) { rightPrev = rightTab; rightTab = 'tx'; if (!settingsPane.hidden) tab('timer'); } else rightTab = rightPrev || 'tx'; }
  root.classList.toggle('sx-lock', lk); tabSet.disabled = lk; tabSet.title = lk ? 'Settings open again at the break' : '';
  drawClock(); drawLv();
  root.dataset.mode = mode;
  modeBtns.forEach(b => { const on = b.dataset.m === mode; b.classList.toggle('on', on); b.disabled = running && !on; });
  startB.textContent = running ? 'Pause' : (left < length(mode) && left > 0 ? 'Resume' : mode === 'focus' ? (returning() ? 'Head back' : observing() ? 'Observe' : expediting() ? (exOf(atP()).step ? 'Continue' : 'Set out') : salvaging() ? 'Salvage' : staying() ? 'Stay' : chaptering() ? 'Continue the chapter' : following() ? 'Follow the Signal' : expediting() ? (exOf(atP()).step ? 'Continue' : 'Set out') : salvaging() ? 'Salvage' : 'Launch') : 'Start break');
  if (!hint.textContent) hint.textContent = mode === 'focus' ? (returning() ? '🏠 Finish this session to travel back to ' + nm(byNum(S.returnTo).p) + '.' : observing() ? '🔎 Finish this session to observe ' + mysDef(mysPicked().id).title.charAt(0).toLowerCase() + mysDef(mysPicked().id).title.slice(1) + '.' : staying() ? stayAct().ic + ' Finish this session to ' + stayAct().name.toLowerCase() + ' on ' + nm(atP()) + '.' : expediting() ? (gasWorld(atP()) ? '🎈 ' : '🗺 ') + 'Finish this session for the ' + EX_PARTS[exOf(atP()).step].toLowerCase() + ' part of the expedition on ' + nm(atP()) + ' (' + (exOf(atP()).step + 1) + ' of ' + EX_LEN + '). It charts a Point of Interest.' : salvaging() ? '🛸 Finish this session to salvage ' + atP().derelict.ship + '.' : chaptering() ? '📡 Finish this session for chapter ' + (chHere().story.ch + 1) + ', part ' + (chHere().story.step + 1) + ' of ' + ST_LEGS + ' on ' + nm(atP()) + '.' : following() ? '📡 ' + signalText() : 'Finish a trip (a study session) to discover a new world.') : 'Break time. The crew is getting the gear ready for the next mission.';
  // a mission whose reason is gone (the world changed, or it's finished) falls back to Explore
  if (S.mission > 0 || [-1, -2, -5, -6].includes(S.mission)) S.mission = 0; // missions that no longer exist
  if (S.mission === -3 && !chaptering()) S.mission = 0;
  if (S.exploreKind === 'signal' && !signalOn()) S.exploreKind = 'random';
  if (S.exploreKind === 'return' && !returning()) S.exploreKind = 'random';
  if ([-4, -7, -8].includes(S.mission)) S.mission = 0; // old missions (now Stay activities and mysteries)
  if (S.mission === STAY && !staying()) S.mission = 0;
  if (S.mission === MYS && !observing()) S.mission = 0;
  const cm = curMission(), locked = running && mode === 'focus';
  mission.classList.toggle('off', mode !== 'focus');
  misBtns.forEach(b => {
    const k = b.dataset.m, on = k === cm;
    b.setAttribute('aria-checked', String(on)); b.classList.toggle('on', on);
    b.disabled = locked && !on;
    // only what's possible here is shown
    if (k === 'stay') b.hidden = !actsFor(atP()).length;
    if (k === 'mystery') b.hidden = !mysPicked();
    if (k === 'campaign') b.hidden = !chHere() || atDoor();
  });
  misNote.textContent = mode === 'focus' ? misGives(cm) : '';
  exploreSel.hidden = cm !== 'explore' || !(signalOn() || returnPlaces().length); exploreSel.disabled = locked;
  regionSel.hidden = cm !== 'explore' || S.exploreKind !== 'random' || regions().filter(regionOpen).length < 2; regionSel.disabled = locked; if (!regionSel.hidden) fillRegionSel();
  if (!exploreSel.hidden) fillExploreSel();
  mysSel.hidden = cm !== 'mystery' || S.mys.length < 2; mysSel.disabled = locked; if (!mysSel.hidden) fillMysSel();
  staySel.hidden = cm !== 'stay'; staySel.disabled = locked; if (!staySel.hidden) fillStaySel();
  const round = mode === 'focus' ? S.cycle % S.set.every + 1 : (S.cycle % S.set.every || S.set.every);
  const sky = skyToday(); // the today line: where you are in the cycle, today's count, today's sky
  status.textContent = (mode === 'focus' ? 'Session ' + round + ' of ' + S.set.every : mode === 'long' ? 'Long break' : 'Short break') + ' · ' + (S.todayN ? S.todayN + ' session' + (S.todayN === 1 ? '' : 's') + ' today' : 'nothing yet today') + (sky ? ', ' + sky.name + (S.skies[today()] ? ' seen' : ' tonight') : '') + (S.fc.broken ? ' · Full Cycle broken' : '');
  status.title = S.fc.broken ? 'Full Cycle broken this time (something was skipped). It resets after the long break.' : 'Full Cycle: finish every session and break of this cycle without skipping for a bonus after the long break';
  status2.textContent = S.found.length + ' world' + (S.found.length === 1 ? '' : 's');
  tabLog.textContent = 'Logbook ' + S.found.length;
  drawName(); drawBreak(); drawGlobe(); if (!journalPane.hidden) drawRight(); checkAch();
  hint.textContent = plain(hint.textContent);
  if (!shipPane.hidden) drawShip();
}
