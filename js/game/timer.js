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
    S.total++; S.todayN++; S.cycle++; S.minutes += S.set.focus; S.fc.n++;
    { S.cnt.maxFocus = Math.max(S.cnt.maxFocus || 0, S.set.focus); const st = S.cnt.streak = S.cnt.streak || { last: '', n: 0, best: 0 }, td = today(); if (st.last !== td) { const y = new Date(); y.setDate(y.getDate() - 1); st.n = st.last === dayKey(y) ? st.n + 1 : 1; st.last = td; st.best = Math.max(st.best, st.n); } }
    { (S.cnt.dow = S.cnt.dow || {})[new Date().getDay()] = 1; const hr = new Date().getHours(); if (hr < 4) S.cnt.night = (S.cnt.night || 0) + 1; else if (hr < 7) S.cnt.early = (S.cnt.early || 0) + 1; }
    const reps = [];
    const forced = !!S.eventNext; S.eventNext = false;
    const ev = rollEvent(forced); if (ev) reps.unshift({ ev });
    let foundP = null;
    const then = () => ' Now a ' + MODES[mode].toLowerCase() + '.';
    if (chaptering()) {
      const msg = chLegDone(reps); done(msg); hint.textContent += then();
    } else if (expediting() || investigating() || salvaging()) {
      const msg = expediting() ? exLegDone(reps) : investigating() ? invDone(reps) : salvageDone(reps); done(msg); hint.textContent += then();
    } else if (following()) { // Follow the Signal: the next Meridian world (no visitors there)
      const { p, fresh } = followSignal(); foundP = fresh ? p : null;
      done('', p, fresh ? 'story' : 'log');
      hint.textContent = '📡 ' + (fresh ? 'The signal led to ' + nm(p) + '. Chapter ' + (p.story.ch + 1) + ' starts here (see Here, on the left).' : 'Back on ' + nm(p) + '. The chapter picks up where you left it.') + then();
    } else { // Explore: a brand-new world
      const p = makePlanet((Math.random() * 4294967296) >>> 0, S.nextNum++, false, .05);
      const visit = rollArrival(p); p.visit = visit || 'none'; // one roll: at most one visitor per world
      S.found.push({ at: Date.now(), p }); S.at = p.num;
      S.cnt.rar[p.rarity] = (S.cnt.rar[p.rarity] || 0) + 1;
      award(20 + ({ Uncommon: 10, Rare: 25, Legendary: 60 }[p.rarity] || 0), 0);
      if (visit === 'derelict') makeDerelict(p);
      if (visit === 'meeting') {
        const [ic, title, tpl] = ENCOUNTERS[Math.floor(Math.random() * ENCOUNTERS.length)], t = tpl.split('{p}').join(nm(p));
        p.enc = { ic, title, t }; award(10, 5); S.cnt.enc++;
        pushEv({ ic, title, t, at: Date.now() });
      }
      foundP = p;
      done('', p, 'new');
      hint.textContent = visit === 'derelict' ? '🛸 Arrived, and a derelict ship is drifting nearby! Salvage it with one study session (see Here, on the left).' + then() : 'Arrived! Time for a ' + MODES[mode].toLowerCase() + ': stand up, stretch, drink some water.';
    }
    sessionEnd(reps, foundP, ev);
    learnAsk(true); openReport();
  } else {
    S.cnt.breaks = (S.cnt.breaks || 0) + 1;
    if (!quiet && hooks.ding) hooks.ding();
    if (hooks.show) hooks.show();
    const wasLong = mode === 'long';
    setMode('focus');
    hint.textContent = 'Equipment ready. Pick a mission and press Start.';
    if (wasLong) { // Full Cycle: every session and break of the cycle finished, nothing skipped
      if (!S.fc.broken && S.fc.n >= S.set.every) {
        S.fcDay = today(); S.cnt.fc++; S.eventNext = true;
        hint.textContent = '★ Full Cycle! Nothing skipped all cycle: something interesting is waiting on your next trip.';
        const notes = ['★ Full Cycle: something interesting is waiting on your next trip.'];
        award(40, 0); gainKp(1, notes); flushXP(notes);
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
  const hl = headline(); if (bigText.textContent !== hl) bigText.textContent = hl;
  if (running && !dotT) dotT = setInterval(() => { dotN++; drawDots(); }, 450);
  if (!running && dotT) { clearInterval(dotT); dotT = 0; dotN = 0; }
  drawDots(); drawCycle(pct);
  barFill.style.width = pct + '%'; bar.setAttribute('aria-valuenow', Math.round(pct));
  if (hooks.scene) { // what the flight scene should show
    const kind = sceneKind();
    hooks.scene({ mode, kind: pv ? 'view' : kind, pv: !!pv, running, pct, paused: !running && left > 0 && left < length(mode), planet: pv ? pvP() : scenePlanet(kind), spot: planetSpot, ship: S.ship });
    if (pv) { const tm = pvBar.querySelector('.sx-pv-time'); if (tm) tm.textContent = running ? '⏱ ' + fmt(r) + (mode === 'focus' ? ' left to study' : ' of break left') : ''; }
  }
  const act = chaptering() ? 'The Meridian' : following() ? 'Following the signal' : expediting() ? 'Exploring' : investigating() ? 'Investigating' : salvaging() ? 'Salvaging' : 'Traveling';
  if (hooks.title) hooks.title(running ? fmt(r) + ' · ' + (mode === 'focus' ? act : 'Preparing') : 'Solarist');
  if (hooks.presence) { // your Discord status (only sent when it's turned on in Settings)
    const kind = sceneKind(), p = pv ? null : scenePlanet(kind), paused = !running && left > 0 && left < length(mode);
    const details = mode === 'focus' ? (running ? 'Studying · ' + act : paused ? 'Paused · ' + act : 'Ready for launch') : (running ? (mode === 'long' ? 'On a long break' : 'On a break') : paused ? 'Break paused' : 'Break is ready');
    const state = p ? 'At ' + nm(p) + ' · ' + p.type + ' world' : 'Between worlds';
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
  startB.textContent = running ? 'Pause' : (left < length(mode) && left > 0 ? 'Resume' : mode === 'focus' ? (chaptering() ? 'Continue the chapter' : following() ? 'Follow the Signal' : expediting() ? (exOf(atP()).step ? 'Continue' : 'Set out') : investigating() ? 'Investigate' : salvaging() ? 'Salvage' : 'Launch') : 'Start break');
  if (!hint.textContent) hint.textContent = mode === 'focus' ? (expediting() ? (gasWorld(atP()) ? '🎈 ' : '🗺 ') + 'Finish this session for the ' + EX_PARTS[exOf(atP()).step].toLowerCase() + ' part of the expedition on ' + nm(atP()) + ' (' + (exOf(atP()).step + 1) + ' of ' + EX_LEN + '). It charts a Point of Interest.' : investigating() ? '🔬 Finish this session to study ' + atP().odd + ' (' + Math.round(invOf(atP()).pct * 100) + '% so far).' : salvaging() ? '🛸 Finish this session to salvage ' + atP().derelict.ship + '.' : chaptering() ? '📡 Finish this session for chapter ' + (chHere().story.ch + 1) + ', part ' + (chHere().story.step + 1) + ' of ' + ST_LEGS + ' on ' + nm(atP()) + '.' : following() ? '📡 ' + signalText() : 'Finish a trip (a study session) to discover a new world.') : 'Break time. The crew is getting the gear ready for the next mission.';
  // a mission whose reason is gone (the world changed, or it's finished) falls back to Explore
  if (S.mission > 0 || [-1, -2, -5, -6].includes(S.mission)) S.mission = 0; // missions that no longer exist
  if (S.mission === -8 && !investigating()) S.mission = 0;
  if (S.mission === -3 && !chaptering()) S.mission = 0;
  if (S.exploreKind === 'signal' && !signalOn()) S.exploreKind = 'random';
  if (S.mission === -4 && !expediting()) S.mission = 0;
  if (S.mission === -7 && !salvaging()) S.mission = 0;
  const cm = curMission(), locked = running && mode === 'focus';
  mission.classList.toggle('off', mode !== 'focus');
  misBtns.forEach(b => {
    const k = b.dataset.m, on = k === cm;
    b.setAttribute('aria-checked', String(on)); b.classList.toggle('on', on);
    b.disabled = locked && !on;
    // only what's possible here is shown
    if (k === 'expedition') { const a = atP(); b.hidden = !canExpedition(a); if (a) { b.lastChild.textContent = (gasWorld(a) ? 'Cloud dive ' : 'Expedition ') + (exOf(a).step + 1) + '/' + EX_LEN; b.firstChild.textContent = gasWorld(a) ? '🎈' : '🗺'; } }
    if (k === 'salvage') b.hidden = !derelictHere();
    if (k === 'investigate') b.hidden = !canInvestigate(atP());
    if (k === 'campaign') b.hidden = !chHere() || atDoor();
  });
  misNote.textContent = mode === 'focus' ? misGives(cm) : '';
  exploreSel.hidden = cm !== 'explore' || !signalOn(); exploreSel.disabled = locked;
  if (!exploreSel.hidden) fillExploreSel();
  const round = mode === 'focus' ? S.cycle % S.set.every + 1 : (S.cycle % S.set.every || S.set.every);
  status.textContent = (mode === 'focus' ? 'Study session ' + round + ' of ' + S.set.every : mode === 'long' ? 'Long break' : 'Short break') + (S.fc.broken ? '. Full Cycle broken' : '. Full Cycle on track') + '. ' + S.todayN + ' today';
  status.title = S.fc.broken ? 'Full Cycle broken this time (something was skipped). It resets after the long break.' : 'Full Cycle: finish every session and break of this cycle without skipping for a bonus after the long break';
  status2.textContent = S.found.length + ' world' + (S.found.length === 1 ? '' : 's');
  tabLog.textContent = 'Logbook ' + S.found.length;
  drawName(); drawLeft(); drawRight(); drawFeed(); checkAch();
  if (!shipPane.hidden) drawShip();
}
