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
  const wasBuilding = mode === 'focus' && building(), wasCharging = mode === 'focus' && charging();
  if (mode === 'focus') toBreak(); else setMode('focus');
  hint.textContent = mode === 'focus' ? 'Break skipped. Ready for the next session.' : wasBuilding ? 'Construction stopped early. Nothing was built.' : wasCharging ? 'Charging stopped early. The Coordinator is still empty.' : 'Turned back early. No new world this time.';
  persistRun();
}
function toBreak() { setMode(S.cycle > 0 && S.cycle % S.set.every === 0 ? 'long' : 'short'); }
function loop() { clearInterval(tickT); tickT = setInterval(() => { if (remaining() <= 0) finish(); else drawClock(); }, 250); }
function finish(quiet) {
  pvClose(true);
  clearInterval(tickT); running = false; left = 0;
  if (mode === 'focus') {
    rollDay(); if (S.cnt.lastDay !== today()) { S.cnt.lastDay = today(); S.cnt.days++; }
    rt0 = rating();
    S.total++; S.todayN++; S.cycle++; S.minutes += S.set.focus; S.fc.n++;
    { S.cnt.maxFocus = Math.max(S.cnt.maxFocus || 0, S.set.focus); const st = S.cnt.streak = S.cnt.streak || { last: '', n: 0, best: 0 }, td = today(); if (st.last !== td) { const y = new Date(); y.setDate(y.getDate() - 1); st.n = st.last === dayKey(y) ? st.n + 1 : 1; st.last = td; st.best = Math.max(st.best, st.n); } }
    { (S.cnt.dow = S.cnt.dow || {})[new Date().getDay()] = 1; const hr = new Date().getHours(); if (hr < 4) S.cnt.night = (S.cnt.night || 0) + 1; else if (hr < 7) S.cnt.early = (S.cnt.early || 0) + 1; }
    const target = building();
    // the tuned post reports in every study session (also while building somewhere else)
    const tp = tunedP(), reps = sessionReports();
    const forced = !!S.eventNext; S.eventNext = false;
    const ev = rollEvent(forced); if (ev) reps.unshift({ ev });
    let foundP = null;
    if (S.dr) {
      const msg = drLeg(reps); award(15, 5); showCard(null);
      if (!quiet && hooks.tada) hooks.tada();
      if (hooks.show) hooks.show();
      toBreak();
      hint.textContent = msg + ' Now a ' + MODES[mode].toLowerCase() + '.';
    } else if (chaptering()) {
      const msg = chLegDone(reps);
      if (!quiet && hooks.tada) hooks.tada();
      if (hooks.show) hooks.show();
      showCard(null); toBreak();
      hint.textContent = msg + ' Now a ' + MODES[mode].toLowerCase() + '.';
    } else if (expediting() || investigating() || salvaging() || hunting() || shifting()) {
      const msg = expediting() ? exLegDone(reps) : investigating() ? invDone(reps) : salvaging() ? salvageDone(reps) : hunting() ? mwLeg(reps) : stShift(reps);
      if (!quiet && hooks.tada) hooks.tada();
      if (hooks.show) hooks.show();
      showCard(null); toBreak();
      hint.textContent = msg + ' Now a ' + MODES[mode].toLowerCase() + '.';
    } else if (charging()) {
      const hyper = S.chargeKind === 'hyper'; if (hyper) { S.hyper = (S.hyper || 0) + 1; S.cnt.hyperCharges = (S.cnt.hyperCharges || 0) + 1; } else { S.coord = true; S.cnt.charge++; }
      S.mission = 0; award(15, 0); if (hasT('nav2')) addDust(40 / INCOME);
      if (!quiet && hooks.tada) hooks.tada();
      if (hooks.show) hooks.show();
      toBreak();
      hint.textContent = (hyper ? '⚡ Hyperdrive charged (' + S.hyper + ' of ' + Math.round(E.hyperdrive.max) + '). Jump to any world you\'ve visited from the Star map or its Logbook page.' : '🧭 Interplanetary Coordinator charged. Your next trip will head somewhere promising.') + ' Now a ' + MODES[mode].toLowerCase() + '.';
    } else if (target) {
      const tp2 = target.p; let msg;
      if (target.k === 'room') {
        S.rooms[target.fac] = 1;
        msg = 'The ' + ROOMS[target.fac][1] + ' is ready. ' + ROOMS[target.fac][2] + '.';
      } else if (target.k === 'post') {
        tp2.post = { built: Date.now(), reports: [] };
        const autoTune = !tp; if (autoTune) S.tuned = tp2.num;
        msg = 'Listening Post built on ' + nm(tp2) + '. ' + (autoTune ? 'The satellite is tuned to it, so it reports in every study session.' : 'Tune the satellite to it on the Ship tab to hear from it.');
      } else if (target.k === 'upgrade') {
        tp2.post.tp = { at: Date.now(), fac: [] };
        msg = nm(tp2) + ' is now a Travelers\' Post. It\'ll be heard even when the satellite isn\'t tuned to it, and you can add facilities with the Build mission.';
      } else {
        tp2.post.tp.fac.push({ k: target.fac, at: Date.now() });
        msg = FAC[target.fac][0] + ' ' + FAC[target.fac][1] + ' opened at ' + nm(tp2) + '. When the post is tuned, you\'ll hear what goes on there.';
      }
      award(target.k === 'post' ? 30 : target.k === 'upgrade' ? 40 : 25, 0); S.cnt.builds = (S.cnt.builds || 0) + 1; if (target.k === 'room') pushEv({ ic: ROOMS[target.fac][0], title: 'New room: ' + ROOMS[target.fac][1], t: msg, at: Date.now() });
      S.mission = 0; S.job = null;
      if (!quiet && hooks.tada) hooks.tada();
      if (hooks.show) hooks.show();
      showCard(tp2 || null, target.k === 'post' ? 'built' : target.k === 'upgrade' ? 'upgraded' : 'opened');
      toBreak();
      hint.textContent = msg + ' Now a ' + MODES[mode].toLowerCase() + '.';
    } else if (heldP()) {
      const o = heldP(), pk = a => a[Math.floor(Math.random() * a.length)];
      o.outlaw.cleared = Date.now(); S.outlaw = 0; S.fights = (S.fights || 0) + 1;
      const lootIt = rollItem(o, true), isNew = gainItem(lootIt, o), extra = addDust((E.fight.min + Math.random() * Math.max(0, E.fight.max - E.fight.min)) * (hasT('shp2') ? 1.5 : 1)), loot = 'their hoard: ' + lootIt.name + ' (' + lootIt.rar + (isNew ? ', new to your collection!' : '') + ')';
      S.at = o.num; award(35, isNew ? 12 : 0);
      const story = pk(FIGHT).replace('{G}', o.outlaw.gang.replace(/^the/, 'The')).replace('{g}', o.outlaw.gang).replace('{b}', o.biomes[0].toLowerCase());
      pushEv({ ic: '⚔', title: 'Outlaws driven out of ' + nm(o), t: story + ' Found ' + loot + '.', got: '+' + extra + ' ✦', at: Date.now() });
      if (!quiet && hooks.tada) hooks.tada();
      if (hooks.show) hooks.show();
      showCard(o, 'freed'); reps.unshift({ ev: { battle: true, ic: '⚔', title: 'Victory on ' + nm(o), t: story + ' Found ' + loot + '.', got: '+' + extra + ' ✦ bounty from the outlaws' } });
      toBreak();
      hint.textContent = nm(o) + ' is free! Explore is open again. Now a ' + MODES[mode].toLowerCase() + '.';
    } else if (following()) { // Follow the Signal: the next Meridian world (no visitors there)
      const { p, fresh } = followSignal(); chipsReturn();
      if (!quiet && hooks.tada) hooks.tada();
      if (hooks.show) hooks.show();
      showCard(p, fresh ? 'story' : 'log'); foundP = fresh ? p : null;
      toBreak();
      hint.textContent = '📡 ' + (fresh ? 'The signal led to ' + nm(p) + '. Chapter ' + (p.story.ch + 1) + ' starts here (see Here, on the left).' : 'Back on ' + nm(p) + '. The chapter picks up where you left it.') + ' Now a ' + MODES[mode].toLowerCase() + '.';
    } else {
      const amp = chipAmp(), lucky = !!S.coord && !(ev && ev.got); if (lucky) S.coord = false;
      const p = nudgedPlanet(lucky, .2 * modFrac('scanner'), amp);
      const visit = rollArrival(p, amp), outlaws = visit === 'outlaw'; p.visit = visit || 'none'; // one roll: at most one visitor per world
      if (outlaws) { const pk = a => a[Math.floor(Math.random() * a.length)]; p.outlaw = { gang: 'the ' + pk(GANG_A) + ' ' + pk(GANG_B), at: Date.now() }; S.outlaw = p.num; }
      S.found.push({ at: Date.now(), p }); S.at = p.num; mwSight(p); dlArrive(p);
      if (p.nudged && p.nudged.length) qNotes.push('🎛 Your Coordinator chips steered this trip: ' + p.nudged.map(k => { const f = CHIP_F.find(x => x[0] === k); return f[1] + ' ' + f[2]; }).join(', ') + '.');
      S.cnt.rar[p.rarity] = (S.cnt.rar[p.rarity] || 0) + 1; if (lucky) S.cnt.lucky++; if (outlaws) S.cnt.outlaws++;
      award(20 + ({ Uncommon: 10, Rare: 25, Legendary: 60 }[p.rarity] || 0), 0);
      const station = visit === 'station'; chipsReturn();
      if (station) stationArrive(p, reps);
      if (visit === 'derelict') makeDerelict(p);
      if (visit === 'postal') makePostal(p);
      if (visit === 'cassini') makeCassini(p);
      if (visit === 'meeting') {
        const [ic, title, tpl, lo, hi] = ENCOUNTERS[Math.floor(Math.random() * ENCOUNTERS.length)];
        const dust = addDust((lo + Math.random() * (hi - lo)) * E.encounters.scale * (RANK[p.rarity] >= 2 ? E.encounters.rareWorldMultiplier : 1)), t = tpl.split('{p}').join(nm(p));
        p.enc = { ic, title, t, dust }; encGot = p.enc; award(10, 5); S.cnt.enc++;
        pushEv({ ic, title, t, got: '+' + dust + ' ✦', at: Date.now() });
      }
      if (visit === 'trade') { makeTrader(p); traderNew = S.trader; }
      if (!quiet && hooks.tada) hooks.tada();
      if (hooks.show) hooks.show();
      showCard(p, outlaws ? 'outlaw' : lucky ? 'lucky' : 'new'); foundP = p;
      toBreak();
      hint.textContent = outlaws ? '🏴 Arrived, but ' + p.outlaw.gang + ' control this world! Explore is blocked until you fight them off (one study session). Building and charging still work.'
        : station ? '🛰 Arrived, and there is an Interplanetary Station in orbit! Open the Station tab on the right. It stays until you travel on.'
        : visit === 'postal' ? '📮 Arrived, and there is a Postal office here with delivery jobs (see Here, on the left). Now a ' + MODES[mode].toLowerCase() + '.'
        : visit === 'cassini' ? '🚓 Arrived, and a Cassini Federation Post has a Most Wanted poster for you (see Here, on the left). Now a ' + MODES[mode].toLowerCase() + '.'
        : visit === 'derelict' ? '🛸 Arrived, and a derelict ship is drifting nearby! Salvage it with one study session (see Here, on the left). Now a ' + MODES[mode].toLowerCase() + '.' : 'Arrived! ' + (lucky ? 'The Coordinator\'s charge is spent. ' : '') + 'Time for a ' + MODES[mode].toLowerCase() + ': stand up, stretch, drink some water.';
    }
    sessionEnd(reps, foundP, ev);
    openReport();
  } else {
    S.cnt.breaks = (S.cnt.breaks || 0) + 1;
    if (!quiet && hooks.ding) hooks.ding();
    if (hooks.show) hooks.show();
    const wasLong = mode === 'long';
    setMode('focus');
    hint.textContent = 'Equipment ready. Pick a mission and press Start.';
    if (wasLong) { // Full Cycle: every session and break of the cycle finished, nothing skipped
      if (!S.fc.broken && S.fc.n >= S.set.every) {
        S.fcDay = today(); S.cnt.fc++;
        if (!S.coord) { S.coord = true; hint.textContent = '★ Full Cycle bonus! Nothing skipped all cycle, so the Interplanetary Coordinator is charged for free.'; }
        else { S.eventNext = true; hint.textContent = '★ Full Cycle bonus! Nothing skipped all cycle: something interesting is waiting on your next trip.'; }
        const notes = ['✦ +' + addDust(E.fullCycle.base + (lvl('hull') - 1) * E.fullCycle.perHullLevel) + ' resources (Full Cycle)'];
        checkBounties({ cycle: true }, notes);
        award(40, 0); flushXP(notes);
        showTrans([{ notes }]); showCard(null); encBox.hidden = true; openReport();
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
    hooks.scene({ mode, kind: pv ? 'view' : kind, pv: !!pv, running, pct, paused: !running && left > 0 && left < length(mode), planet: pv ? pvP() : scenePlanet(kind), coord: !pv && !!S.coord, spot: planetSpot, ship: S.ship, build: !pv && kind === 'build' && building() ? { k: building().k, fac: building().fac } : null, trader: !pv && S.trader ? S.trader.num : null, station: S.station ? S.station.num : null });
    if (pv) { const tm = pvBar.querySelector('.sx-pv-time'); if (tm) tm.textContent = running ? '⏱ ' + fmt(r) + (mode === 'focus' ? ' left to study' : ' of break left') : ''; }
  }
  const act = S.dr ? 'Distress Run' : chaptering() ? 'The Meridian' : following() ? 'Following the signal' : expediting() ? 'Exploring' : investigating() ? 'Investigating' : salvaging() ? 'Salvaging' : hunting() ? 'Hunting' : building() ? (building().k === 'upgrade' ? 'Upgrading' : 'Building') : charging() ? 'Charging' : heldP() ? 'Fighting' : 'Traveling';
  if (hooks.title) hooks.title(running ? fmt(r) + ' · ' + (mode === 'focus' ? act : 'Preparing') : 'Solarist');
  if (hooks.presence) { // your Discord status (only sent when it's turned on in Settings)
    const kind = sceneKind(), p = pv ? null : scenePlanet(kind), paused = !running && left > 0 && left < length(mode);
    const details = mode === 'focus' ? (running ? 'Studying · ' + act : paused ? 'Paused · ' + act : 'Ready for launch') : (running ? (mode === 'long' ? 'On a long break' : 'On a break') : paused ? 'Break paused' : 'Break is ready');
    const state = p ? 'At ' + nm(p) + ' · ' + p.type + ' world' : S.dr ? 'Answering a distress call' : 'Between worlds';
    hooks.presence({ details, state, end: running ? endAt : 0, ship: S.ship && S.ship.name });
  }
}
// while a study session runs, everything that isn't pure data is put away (back at the break)
let wasLocked = false, rightPrev = 'up';
const focusLock = () => running && mode === 'focus';
function draw() {
  stationCheck();
  const lk = focusLock();
  if (lk !== wasLocked) { wasLocked = lk; if (lk) { rightPrev = rightTab; rightTab = 'tx'; if (!settingsPane.hidden) tab('timer'); } else rightTab = rightPrev || 'up'; }
  root.classList.toggle('sx-lock', lk); tabSet.disabled = lk; tabSet.title = lk ? 'Settings open again at the break' : '';
  drawClock(); drawLv();
  root.dataset.mode = mode;
  modeBtns.forEach(b => { const on = b.dataset.m === mode; b.classList.toggle('on', on); b.disabled = running && !on; });
  startB.textContent = running ? 'Pause' : (left < length(mode) && left > 0 ? 'Resume' : mode === 'focus' ? (S.dr ? (S.dr.n ? 'Continue the Run' : 'Start the Run') : chaptering() ? 'Continue the chapter' : following() ? 'Follow the Signal' : expediting() ? (exOf(atP()).step ? 'Continue' : 'Set out') : investigating() ? 'Investigate' : salvaging() ? 'Salvage' : hunting() ? 'Start the hunt' : shifting() ? 'Start the shift' : building() ? (building().k === 'upgrade' ? 'Upgrade' : 'Build') : charging() ? 'Charge' : heldP() ? 'Fight' : 'Launch') : 'Start break');
  if (!hint.textContent) hint.textContent = mode === 'focus' ? (S.dr ? '🆘 ' + DISTRESS[S.dr.sc][2] + ' Finish this study session to keep going.' : expediting() ? (gasWorld(atP()) ? '🎈 ' : '🗺 ') + 'Finish this session for the ' + EX_PARTS[exOf(atP()).step].toLowerCase() + ' part of the expedition on ' + nm(atP()) + ' (' + (exOf(atP()).step + 1) + ' of ' + EX_LEN + '). It charts a Point of Interest.' : investigating() ? '🔬 Finish this session to study ' + atP().odd + ' (' + Math.round(invOf(atP()).pct * 100) + '% so far).' : salvaging() ? '🛸 Finish this session to salvage ' + atP().derelict.ship + '.' : hunting() ? '🎯 Finish this session: Manhunt for ' + S.mw.name + ', ' + MH_PARTS[S.mw.hunt.step].toLowerCase() + ' (' + (S.mw.hunt.step + 1) + ' of 3).' : chaptering() ? '📡 Finish this session for chapter ' + (chHere().story.ch + 1) + ', part ' + (chHere().story.step + 1) + ' of ' + ST_LEGS + ' on ' + nm(atP()) + '.' : following() ? '📡 ' + signalText() : building() ? 'Finish this session: ' + jobText(building()).replace(/^./, c => c.toLowerCase()) + '.' : charging() ? (S.chargeKind === 'hyper' ? '⚡ Finish this session to add a hyperdrive charge (' + (S.hyper || 0) + ' of ' + Math.round(E.hyperdrive.max) + ' now). No new world this time.' : 'Finish this session to charge the Interplanetary Coordinator. No new world this time, but the next one will be a good one.') : heldP() ? '🏴 ' + heldP().outlaw.gang.replace(/^the/, 'The') + ' hold ' + nm(heldP()) + '. Finish this study session to drive them out. (Build and Charge still work.)' : S.coord ? '🧭 The Coordinator is charged: this trip has much better odds.' : 'Finish a trip (a study session) to discover a new world.') : 'Break time. The crew is getting the gear ready for the next mission.';
  if (S.mission > 0 && !building()) { S.mission = 0; S.job = null; }
  if (S.mission === -1 && !charging()) S.mission = 0;
  if (S.mission === -8 && !investigating()) S.mission = 0;
  if (S.mission === -2) S.mission = 0; // Discover is gone
  if (S.mission === -3 && !chaptering()) S.mission = 0;
  if (S.exploreKind === 'signal' && !signalOn()) S.exploreKind = 'random';
  if (S.mission === -4 && !expediting()) S.mission = 0;
  if (S.mission === -7 && !salvaging()) S.mission = 0;
  if (S.mission === -5 && !hunting()) S.mission = 0;
  if (S.mission === -6 && !shifting()) S.mission = 0;
  const cm = curMission(), locked = running && mode === 'focus', canBuild = anyBuild();
  mission.classList.toggle('off', mode !== 'focus');
  mission.hidden = !!S.dr; drawDr();
  misBtns.forEach(b => {
    const k = b.dataset.m, on = k === cm;
    b.setAttribute('aria-checked', String(on)); b.classList.toggle('on', on);
    b.disabled = (locked && !on) || (k === 'build' && !canBuild);
    // only what's possible here is shown
    if (k === 'expedition') { const a = atP(); b.hidden = !canExpedition(a) || !!S.dr; if (a) { b.lastChild.textContent = (gasWorld(a) ? 'Cloud dive ' : 'Expedition ') + (exOf(a).step + 1) + '/' + EX_LEN; b.firstChild.textContent = gasWorld(a) ? '🎈' : '🗺'; } }
    if (k === 'salvage') b.hidden = !derelictHere() || !!S.dr;
    if (k === 'investigate') b.hidden = !canInvestigate(atP()) || !!S.dr;
    if (k === 'charge') b.hidden = !canCharge('coord') && !canCharge('hyper') && !on;
    if (k === 'explore') { const o = heldP(); b.firstChild.textContent = o ? '⚔' : '🚀'; b.lastChild.textContent = o ? 'Fight' : S.coord ? 'Explore (lucky)' : 'Explore'; b.title = o ? 'Outlaws hold ' + nm(o) + ': fight them off with one study session before you can travel again' : MISSIONS[0][3]; b.classList.toggle('sl-fight', !!o); }
    if (k === 'campaign') { b.hidden = !chHere() || atDoor() || !!S.dr; }
    if (k === 'hunt') { b.hidden = !mwHere() || !!S.dr; }
    if (k === 'shift') { b.hidden = !shiftsLeft(); }
    if (k === 'charge') b.title = MISSIONS.find(m => m[0] === 'charge')[3];
    if (k === 'build') { b.title = canBuild ? MISSIONS.find(m => m[0] === 'build')[3] : 'Nothing left to build'; const bj = building(); b.lastChild.textContent = bj ? 'Build: ' + (bj.k === 'room' ? ROOMS[bj.fac][1] : bj.k === 'post' ? 'Listening Post' : bj.k === 'upgrade' ? 'Travelers\' Post' : FAC[bj.fac][1]) : 'Build'; b.hidden = !bj && cm !== 'build'; }
  });
  buildSel.hidden = cm !== 'build'; buildSel.disabled = locked;
  misNote.textContent = mode === 'focus' && !S.dr ? misGives(cm) : '';
  if (cm === 'build') { fillBuildSel(buildSel); buildSel.value = jobKey(building()); }
  chargeSel.hidden = cm !== 'charge'; chargeSel.disabled = locked;
  exploreSel.hidden = cm !== 'explore' || !signalOn() || !!heldP() || !!S.dr; exploreSel.disabled = locked;
  if (!exploreSel.hidden) fillExploreSel();
  if (cm === 'charge') fillChargeSel();
  const round = mode === 'focus' ? S.cycle % S.set.every + 1 : (S.cycle % S.set.every || S.set.every);
  const stars = S.fc.broken ? '' : ' ' + '★'.repeat(Math.min(S.set.every, S.fc.n)) + '☆'.repeat(Math.max(0, S.set.every - S.fc.n));
  status.textContent = (mode === 'focus' ? 'Study session ' + round + ' of ' + S.set.every : mode === 'long' ? 'Long break' : 'Short break') + (S.fc.broken ? '. Full Cycle broken' : '. Full Cycle on track') + '. ' + S.todayN + ' today';
  void stars;
  status.title = S.fc.broken ? 'Full Cycle broken this time (something was skipped). It resets after the long break.' : 'Full Cycle: finish every session and break of this cycle without skipping for a bonus after the long break';
  const tp = tunedP();
  status2.textContent = '✦ ' + S.dust.toLocaleString() + ' · ' + S.found.length + ' world' + (S.found.length === 1 ? '' : 's') + (tp ? ' · 📡 ' + nm(tp) : '') + (S.coord ? ' · 🧭 charged' : '');
  tabLog.textContent = 'Logbook ' + S.found.length;
  if (S.trader && S.at !== S.trader.num) S.trader = null;
  drawName(); drawLeft(); drawRight(); drawFeed(); checkAch();
  if (!shipPane.hidden) drawShip();
}
