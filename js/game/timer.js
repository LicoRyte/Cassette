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
    } else if (campaigning()) {
      const n = S.camp.n, log = CAMP.logs[n]; S.camp.n++; { const cd = S.cnt.campDay = S.cnt.campDay || { d: '', n: 0, best: 0 }; if (cd.d !== today()) { cd.d = today(); cd.n = 0; } cd.n++; cd.best = Math.max(cd.best, cd.n); }
      const got = addDust((E.campaign.base + E.campaign.perLog * n) * (hasT('shp4') ? 1.25 : 1)); S.camp.at[n] = Date.now(); award(15, 20);
      reps.unshift({ camp: log, n: n + 1, got });
      if (!quiet && hooks.tada) hooks.tada();
      if (hooks.show) hooks.show();
      showCard(null); toBreak();
      hint.textContent = (campDone() ? 'That was the last log. The campaign is complete.' : 'Log ' + (n + 1) + ' of ' + CAMP.logs.length + ' recovered.') + ' Now a ' + MODES[mode].toLowerCase() + '.';
    } else if (expediting() || hunting() || shifting()) {
      const msg = expediting() ? expLeg(reps) : hunting() ? mwLeg(reps) : stShift(reps);
      if (!quiet && hooks.tada) hooks.tada();
      if (hooks.show) hooks.show();
      showCard(null); toBreak();
      hint.textContent = msg + ' Now a ' + MODES[mode].toLowerCase() + '.';
    } else if (charging()) {
      S.coord = true; S.mission = 0; award(15, 0); S.cnt.charge++; if (hasT('nav2')) addDust(40 / INCOME);
      if (!quiet && hooks.tada) hooks.tada();
      if (hooks.show) hooks.show();
      toBreak();
      hint.textContent = '🧭 Interplanetary Coordinator charged. Your next trip will head somewhere promising. Now a ' + MODES[mode].toLowerCase() + '.';
    } else if (target) {
      const tp2 = target.p; let msg;
      if (target.k === 'room') {
        S.rooms[target.fac] = 1;
        msg = 'The ' + ROOMS[target.fac][1] + ' is ready. ' + ROOMS[target.fac][2] + '.';
      } else if (target.k === 'post') {
        tp2.post = { built: Date.now(), reports: [] };
        const autoTune = !tp; if (autoTune) S.tuned = tp2.num;
        msg = 'Listening Post built on ' + nm(tp2) + '. ' + (autoTune ? 'The satellite is tuned to it, so it reports in every study session.' : 'Tune the satellite to it on the Ship tab to hear from it.');
      } else if (target.k === 'node') {
        tp2.node = { at: Date.now() }; S.cnt.nodes = (S.cnt.nodes || 0) + 1;
        msg = 'Hyperdrive Node installed on ' + nm(tp2) + '. You can jump back to it any time from its Logbook page or the Build tab.';
        pushEv({ c: 'ship', ic: '⚡', title: 'Hyperdrive Node: ' + nm(tp2), t: msg, at: Date.now() });
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
      showCard(tp2 || null, target.k === 'post' ? 'built' : target.k === 'upgrade' ? 'upgraded' : target.k === 'node' ? 'node' : 'opened');
      toBreak();
      hint.textContent = msg + ' Now a ' + MODES[mode].toLowerCase() + '.';
    } else if (discovering()) {
      const a = atP(), better = hasT('scan3') && Math.random() < 1 / 3, got = [rollItem(a, better, 'survey')]; if (Math.random() < (hasT('scan1') ? .55 : .3)) got.push(rollItem(a, better, 'survey')); if (hasT('scan4') && Math.random() < .2) got.push(rollItem(a, better, 'survey'));
      const fresh = got.map(it => gainItem(it, a));
      S.mission = 0; S.surveys = (S.surveys || 0) + 1; mwClue(a, 1); const svPay = addDust(E.survey.pay);
      award(20 + 10 * fresh.filter(Boolean).length, 12 + 12 * fresh.filter(Boolean).length + (hasT('scan2') ? 10 : 0) + (hasT('scan4') ? 15 : 0));
      if (!quiet && hooks.tada) hooks.tada();
      if (hooks.show) hooks.show();
      reps.unshift({ ev: { battle: true, ic: '🔍', title: 'Survey of ' + nm(a), t: 'The survey team combed the ' + a.biomes[Math.floor(Math.random() * a.biomes.length)].toLowerCase() + ' and came back with: ' + got.map((it, i) => it.name + ' (' + it.rar + (fresh[i] ? ', new!' : '') + ')').join(' and ') + '.', got: '🎒 Collection ' + itemCount() + ' / ' + ITEM_TOTAL + ' · +' + svPay + ' ✦ for the samples' } });
      showCard(a, 'last');
      toBreak();
      hint.textContent = 'Survey done: ' + got.map(it => it.name).join(' and ') + '. Now a ' + MODES[mode].toLowerCase() + '.';
    } else if (heldP()) {
      const o = heldP(), pk = a => a[Math.floor(Math.random() * a.length)];
      o.outlaw.cleared = Date.now(); S.outlaw = 0; S.fights = (S.fights || 0) + 1; mwSpawn(); mwClue(o, 2);
      const lootIt = rollItem(o, true), isNew = gainItem(lootIt, o), extra = addDust((E.fight.min + Math.random() * Math.max(0, E.fight.max - E.fight.min)) * (hasT('shp2') ? 1.5 : 1)), loot = 'their hoard: ' + lootIt.name + ' (' + lootIt.rar + (isNew ? ', new to your collection!' : '') + ')';
      S.at = o.num; award(35, isNew ? 12 : 0);
      const story = pk(FIGHT).replace('{G}', o.outlaw.gang.replace(/^the/, 'The')).replace('{g}', o.outlaw.gang).replace('{b}', o.biomes[0].toLowerCase());
      pushEv({ ic: '⚔', title: 'Outlaws driven out of ' + nm(o), t: story + ' Found ' + loot + '.', got: '+' + extra + ' ✦', at: Date.now() });
      if (!quiet && hooks.tada) hooks.tada();
      if (hooks.show) hooks.show();
      showCard(o, 'freed'); reps.unshift({ ev: { battle: true, ic: '⚔', title: 'Victory on ' + nm(o), t: story + ' Found ' + loot + '.', got: '+' + extra + ' ✦ bounty from the outlaws' } });
      toBreak();
      hint.textContent = nm(o) + ' is free! Explore is open again. Now a ' + MODES[mode].toLowerCase() + '.';
    } else {
      const amp = chipAmp(), lucky = !!S.coord && !(ev && ev.got); if (lucky) S.coord = false;
      const p = nudgedPlanet(lucky, Math.min(.2, (lvl('scanner') - 1) * .01), amp);
      const outlaws = Math.random() < Math.max(0, OUTLAW_CHANCE + chipP('siren', amp) - chipP('hush', amp)) && p.type !== 'Rogue';
      if (outlaws) { const pk = a => a[Math.floor(Math.random() * a.length)]; p.outlaw = { gang: 'the ' + pk(GANG_A) + ' ' + pk(GANG_B), at: Date.now() }; S.outlaw = p.num; }
      S.found.push({ at: Date.now(), p }); S.at = p.num; mwClue(p, 1); dlArrive(p);
      if (p.nudged && p.nudged.length) qNotes.push('🎛 Your Coordinator chips steered this trip: ' + p.nudged.map(k => { const f = CHIP_F.find(x => x[0] === k); return f[1] + ' ' + f[2]; }).join(', ') + '.');
      S.cnt.rar[p.rarity] = (S.cnt.rar[p.rarity] || 0) + 1; if (lucky) S.cnt.lucky++; if (outlaws) S.cnt.outlaws++;
      award(20 + ({ Uncommon: 10, Rare: 25, Legendary: 60 }[p.rarity] || 0), 0);
      const station = !outlaws && Math.random() < E.station.chance; chipsReturn();
      if (station) stationArrive(p, reps);
      if (!outlaws && !station && Math.random() < ENC_CHANCE + chipP('lantern', amp) + (hasT('nav1') ? .05 : 0) + .02 * roomLv('deck') + .03 * crewN('Scout')) {
        const [ic, title, tpl, lo, hi] = ENCOUNTERS[Math.floor(Math.random() * ENCOUNTERS.length)];
        const dust = addDust((lo + Math.random() * (hi - lo)) * E.encounters.scale * (RANK[p.rarity] >= 2 ? E.encounters.rareWorldMultiplier : 1)), t = tpl.split('{p}').join(nm(p));
        p.enc = { ic, title, t, dust }; encGot = p.enc; award(10, 5); S.cnt.enc++;
        pushEv({ ic, title, t, got: '+' + dust + ' ✦', at: Date.now() });
      }
      if (!outlaws && !station && Math.random() < E.tradeStation.chance * (hasT('nav3') ? 2 : 1) + chipP('market', amp)) { makeTrader(p); traderNew = S.trader; }
      if (!quiet && hooks.tada) hooks.tada();
      if (hooks.show) hooks.show();
      showCard(p, outlaws ? 'outlaw' : lucky ? 'lucky' : 'new'); foundP = p;
      toBreak();
      hint.textContent = outlaws ? '🏴 Arrived, but ' + p.outlaw.gang + ' control this world! Explore is blocked until you fight them off (one study session). Building and charging still work.'
        : station ? '🛰 Arrived, and there is an Interplanetary Station in orbit! Open the Station tab on the right. It stays until you travel on.' : 'Arrived! ' + (lucky ? 'The Coordinator\'s charge is spent. ' : '') + 'Time for a ' + MODES[mode].toLowerCase() + ': stand up, stretch, drink some water.';
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
  if (hooks.title) hooks.title(running ? fmt(r) + ' · ' + (mode === 'focus' ? (S.dr ? 'Distress Run' : campaigning() ? 'Following the trail' : expediting() ? 'Expedition' : hunting() ? 'Hunting' : building() ? (building().k === 'upgrade' ? 'Upgrading' : 'Building') : charging() ? 'Charging' : discovering() ? 'Surveying' : heldP() ? 'Fighting' : 'Traveling') : 'Preparing') : 'Solarist');
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
  startB.textContent = running ? 'Pause' : (left < length(mode) && left > 0 ? 'Resume' : mode === 'focus' ? (S.dr ? (S.dr.n ? 'Continue the Run' : 'Start the Run') : campaigning() ? 'Follow the trail' : expediting() ? 'Continue' : hunting() ? 'Start the hunt' : shifting() ? 'Start the shift' : building() ? (building().k === 'upgrade' ? 'Upgrade' : 'Build') : charging() ? 'Charge' : discovering() ? 'Survey' : heldP() ? 'Fight' : 'Launch') : 'Start break');
  if (!hint.textContent) hint.textContent = mode === 'focus' ? (S.dr ? '🆘 ' + DISTRESS[S.dr.sc][2] + ' Finish this study session to keep going.' : expediting() ? EXPED[S.exp.id][0] + ' Finish this session for leg ' + (S.exp.step + 1) + ' of ' + EXPED[S.exp.id][1] + '.' : hunting() ? '🎯 Finish this session to close in on ' + S.mw.name + '.' : campaigning() ? 'Finish this session to reach the Meridian\'s next log beacon (log ' + (S.camp.n + 1) + ' of ' + CAMP.logs.length + ').' : building() ? 'Finish this session: ' + jobText(building()).replace(/^./, c => c.toLowerCase()) + '.' : charging() ? 'Finish this session to charge the Interplanetary Coordinator. No new world this time, but the next one will be a good one.' : discovering() ? '🔍 Finish this session to survey ' + nm(atP()) + ' (where you are now). You\'ll bring back collectibles made from its materials.' : heldP() ? '🏴 ' + heldP().outlaw.gang.replace(/^the/, 'The') + ' hold ' + nm(heldP()) + '. Finish this study session to drive them out. (Build and Charge still work.)' : S.coord ? '🧭 The Coordinator is charged: this trip has much better odds.' : 'Finish a trip (a study session) to discover a new world.') : 'Break time. The crew is getting the gear ready for the next mission.';
  if (S.mission > 0 && !building()) { S.mission = 0; S.job = null; }
  if (S.mission === -1 && S.coord) S.mission = 0;
  if (S.mission === -2 && !discovering()) S.mission = 0;
  if (S.mission === -3 && campDone()) S.mission = 0;
  if (S.mission === -4 && !S.exp) S.mission = 0;
  if (S.mission === -5 && !mwReady()) S.mission = 0;
  if (S.mission === -6 && !stHere()) S.mission = 0;
  const cm = curMission(), locked = running && mode === 'focus', canBuild = anyBuild();
  mission.classList.toggle('off', mode !== 'focus');
  mission.hidden = !!S.dr; drawDr();
  misBtns.forEach(b => {
    const k = b.dataset.m, on = k === cm;
    b.setAttribute('aria-checked', String(on)); b.classList.toggle('on', on);
    b.disabled = (locked && !on) || (k === 'build' && !canBuild) || (k === 'charge' && !!S.coord && !on) || (k === 'discover' && !on && (!atP() || held(atP())));
    if (k === 'discover') b.title = !atP() ? 'Find a world first' : held(atP()) ? 'Outlaws hold ' + nm(atP()) + '. Drive them out first' : 'Survey ' + nm(atP()) + ' (where you are now) for collectibles';
    if (k === 'explore') { const o = heldP(); b.firstChild.textContent = o ? '⚔' : '🚀'; b.lastChild.textContent = o ? 'Fight' : S.coord ? 'Explore (lucky)' : 'Explore'; b.title = o ? 'Outlaws hold ' + nm(o) + ': fight them off with one study session before you can travel again' : MISSIONS[0][3]; b.classList.toggle('sl-fight', !!o); }
    if (k === 'campaign') { b.hidden = !campaigning(); }
    if (k === 'expedition') { b.hidden = !expediting(); }
    if (k === 'hunt') { b.hidden = !hunting(); }
    if (k === 'shift') { b.hidden = !stHere(); }
    if (k === 'charge') b.title = S.coord ? 'Already charged: your next Explore is a lucky one' : MISSIONS[3][3];
    if (k === 'build') { b.title = canBuild ? MISSIONS[2][3] : 'Nothing left to build'; const bj = building(); b.lastChild.textContent = bj ? 'Build: ' + (bj.k === 'room' ? ROOMS[bj.fac][1] : bj.k === 'node' ? 'Hyperdrive Node' : bj.k === 'post' ? 'Listening Post' : bj.k === 'upgrade' ? 'Travelers\' Post' : FAC[bj.fac][1]) : 'Build'; b.hidden = !bj && cm !== 'build'; }
  });
  buildSel.hidden = cm !== 'build'; buildSel.disabled = locked;
  if (cm === 'build') { fillBuildSel(buildSel); buildSel.value = jobKey(building()); }
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
