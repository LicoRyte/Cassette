/* Solarist: The timer screen, its buttons, timer settings, mission buttons and level bars. */
'use strict';

/* ---------- UI ---------- */
const tabTimer = el('button', { type: 'button', role: 'tab', 'aria-selected': 'true', onclick: () => tab('timer') }, 'Voyage');
const tabLog = el('button', { type: 'button', role: 'tab', 'aria-selected': 'false', onclick: () => tab('log') }, 'Logbook');
const tabShip = el('button', { type: 'button', role: 'tab', 'aria-selected': 'false', onclick: () => tab('ship') }, 'Ship');
const modeBtns = Object.keys(MODES).map(m => el('button', { type: 'button', class: 'sl-mode', 'data-m': m, onclick: () => { if (!running) setMode(m); } }, MODES[m]));
const bigText = el('span', {}), dots = el('span', { class: 'sl-dots', 'aria-hidden': 'true' });
const timeText = el('div', { class: 'sl-time' }, '25:00');
const screen = el('div', { class: 'sl-screen sunken', 'aria-live': 'off' }, el('div', { class: 'sl-big' }, bigText, dots), timeText);
let dotN = 0, dotT = 0;
function headline() {
  if (shifting() && mode === 'focus') return !running ? (left > 0 && left < length(mode) ? 'Holding position' : 'Ready for a shift at ' + S.station.name) : 'Working a shift at ' + S.station.name;
  if (expediting() && mode === 'focus') { const a = atP(), w = gasWorld(a) ? 'Cloud dive' : 'Expedition'; return !running ? (left > 0 && left < length(mode) ? 'Holding position' : w + ': ' + EX_PARTS[exOf(a).step].toLowerCase() + ' on ' + nm(a)) : (gasWorld(a) ? 'Diving into the clouds of ' : 'Exploring ') + nm(a); }
  if (salvaging() && mode === 'focus') return !running ? (left > 0 && left < length(mode) ? 'Holding position' : 'Ready to salvage') : 'Salvaging ' + atP().derelict.ship;
  if (investigating() && mode === 'focus') return !running ? (left > 0 && left < length(mode) ? 'Holding position' : 'Ready to investigate') : 'Studying ' + atP().odd;
  if (hunting() && mode === 'focus') return !running ? (left > 0 && left < length(mode) ? 'Holding position' : 'Manhunt: ' + MH_PARTS[S.mw.hunt.step].toLowerCase()) : 'Hunting ' + S.mw.name;
  if (chaptering() && mode === 'focus') return !running ? (left > 0 && left < length(mode) ? 'Holding position' : 'Chapter ' + (chHere().story.ch + 1) + ', part ' + (chHere().story.step + 1)) : 'Following the Meridian\'s trail';
  if (following() && mode === 'focus') return !running ? (left > 0 && left < length(mode) ? 'Holding position' : 'Ready to follow the signal') : 'Following the signal';
  if (S.dr && mode === 'focus') return !running ? (left > 0 && left < length(mode) ? 'Holding position' : 'Distress Run: Act ' + roman(S.dr.n + 1)) : 'Answering the distress call';
  const b = building(), c = charging(), o = !b && !c && heldP();
  if (!running) return left > 0 && left < length(mode) ? 'Holding position' : mode === 'focus' ? (b ? (b.k === 'upgrade' ? 'Ready to upgrade' : 'Ready to build') : c ? 'Ready to charge' : o ? 'Outlaws ahead' : S.coord ? 'Ready for a lucky launch' : 'Ready for launch') : 'Docked. Take a breather';
  return mode === 'focus' ? (b ? jobText(b) : c ? (S.chargeKind === 'hyper' ? 'Charging the hyperdrive' : 'Recharging Interplanetary Coordinator') : o ? 'Fighting ' + o.outlaw.gang + ' on ' + nm(o) : S.coord ? 'Following the Coordinator to a promising world' : 'Traveling to an uncharted world') : 'Preparing equipment for the next mission';
}
function drawDots() { const n = running ? dotN % 4 : 0; dots.replaceChildren(...[0, 1, 2].map(i => el('i', { class: i < n ? '' : 'off' }, '.'))); }
const barFill = el('div', { class: 'sl-fill' });
const bar = el('div', { class: 'sl-bar sunken', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100 }, barFill);
const startB = el('button', { type: 'button', class: 'btn sl-go', onclick: () => running ? pause() : start() }, 'Launch');
const resetB = el('button', { type: 'button', class: 'btn', title: 'Start this part over (a trip stopped early finds nothing)', onclick: () => reset() }, 'Reset');
const skipB = el('button', { type: 'button', class: 'btn', title: 'Skip to the next part', onclick: () => skip() }, 'Skip');
const hint = el('div', { class: 'sl-hint' });
const trans = el('div', { class: 'sl-trans', hidden: true });
const card = el('div', { class: 'sl-card', hidden: true });
const encBox = el('div', { class: 'sl-enc', hidden: true, 'aria-live': 'polite' });
const sel = (k, opts) => { const s = el('select', { 'aria-label': k }, opts.map(v => el('option', { value: v, selected: S.set[k] === v || null }, String(v)))); s.addEventListener('change', () => { S.set[k] = +s.value; save(); if (!running && mode === k) { left = length(mode); persistRun(); } draw(); }); return s; };
const settings = el('details', { class: 'sl-set' }, el('summary', {}, 'Settings'),
  el('div', { class: 'sl-set-row' },
    el('label', {}, 'Study ', sel('focus', [1, 10, 15, 20, 25, 30, 40, 45, 50, 60]), ' min'),
    el('label', {}, 'Short break ', sel('short', [3, 5, 7, 8, 10]), ' min'),
    el('label', {}, 'Long break ', sel('long', [10, 15, 20, 30]), ' min'),
    el('label', {}, 'Long break every ', sel('every', [2, 3, 4, 5, 6]), ' study sessions')));
// what the next study session is for: travel to a new world, or build a Listening Post on one you've found
// the mission: what this study session is for. Exactly one is pressed.
const MISSIONS = [['explore', '🚀', 'Explore', 'Find a new world'], ['expedition', '🗺', 'Expedition', 'Explore the world you\'re at: three parts, each charts a Point of Interest'], ['investigate', '🔬', 'Investigate', 'Study the anomaly here: three or four sessions, then its answer goes in the Codex'], ['salvage', '🛸', 'Salvage', 'Salvage the derelict ship drifting here (one session, one find)'], ['build', '🗼', 'Build', 'Build a Listening Post, upgrade one to a Travelers\' Post, or add a facility'], ['charge', '⚡', 'Charge', 'Charge the Interplanetary Coordinator (your next Explore is steered) or the hyperdrive (jump to any world you\'ve visited)'], ['campaign', '📡', 'Chapter', 'The next part of the Meridian chapter on this world'], ['hunt', '🎯', 'Manhunt', 'Catch the Most Wanted who was sighted here (three sessions)'], ['shift', '🛠', 'Shift', 'Work a shift at the Interplanetary Station']];
const curMission = () => S.mission > 0 ? 'build' : S.mission === -1 ? 'charge' : S.mission === -7 ? 'salvage' : S.mission === -8 ? 'investigate' : S.mission === -3 ? 'campaign' : S.mission === -4 ? 'expedition' : S.mission === -5 ? 'hunt' : S.mission === -6 ? 'shift' : 'explore';
function setMission(m, num) {
  if (running && mode === 'focus') return;
  if (m === 'explore') { S.mission = 0; if (num === 'signal' || num === 'random') S.exploreKind = signalOn() ? num : 'random'; }
  else if (m === 'charge') { const k = num === 'coord' || num === 'hyper' ? num : canCharge(S.chargeKind || 'coord') ? (S.chargeKind || 'coord') : canCharge('coord') ? 'coord' : 'hyper'; if (!canCharge(k)) return; S.chargeKind = k; S.mission = -1; }
  else if (m === 'investigate') { if (!canInvestigate(atP())) return; S.mission = -8; }
  else if (m === 'salvage') { if (!derelictHere()) return; S.mission = -7; }
  else if (m === 'campaign') { if (!chHere() || atDoor()) return; S.mission = -3; }
  else if (m === 'expedition') { if (!canExpedition(atP())) return; S.mission = -4; }
  else if (m === 'hunt') { if (!mwHere()) return; S.mission = -5; }
  else if (m === 'shift') { if (!stHere()) return; S.mission = -6; }
  else { if (building()) { S.mission = 1; } else { const o = buildOptions(), first = (o.Facilities[0] || o.Upgrades[0] || o['New Listening Posts'][0]); if (!first) return; S.mission = 1; S.job = { k: first.k, num: first.num, fac: first.fac }; } }
  save(); hint.textContent = ''; draw();
}
const MIS_ORDER = ['explore', 'expedition', 'investigate', 'salvage', 'hunt', 'charge', 'build', 'campaign', 'shift'];
const misBtns = MIS_ORDER.map(k => MISSIONS.find(m => m[0] === k)).map(([k, ic, label, tip], i) => el('button', { type: 'button', class: 'sl-mis', 'data-m': k, 'data-key': i + 1, role: 'radio', title: tip + ' (key ' + (i + 1) + ')', onclick: () => setMission(k) }, el('span', { class: 'sl-mis-i', 'aria-hidden': 'true' }, ic), label));
const buildSel = el('select', { class: 'sl-build-sel', 'aria-label': 'World to build on' });
buildSel.addEventListener('change', () => setJob(buildSel.value));
const misNote = el('p', { class: 'sl-mis-note', 'aria-live': 'polite' });
// Explore picks a random world or, when a Meridian signal is waiting, the signal
const exploreSel = el('select', { class: 'sl-build-sel', 'aria-label': 'Where to explore' });
exploreSel.addEventListener('change', () => setMission('explore', exploreSel.value));
function fillExploreSel() {
  exploreSel.replaceChildren(el('option', { value: 'random' }, '🚀 A random world'), el('option', { value: 'signal' }, '📡 Follow the Signal'));
  exploreSel.value = S.exploreKind === 'signal' ? 'signal' : 'random';
}
// Charge picks what to charge: the Coordinator or the hyperdrive
const chargeSel = el('select', { class: 'sl-build-sel', 'aria-label': 'What to charge' });
chargeSel.addEventListener('change', () => setMission('charge', chargeSel.value));
function fillChargeSel() {
  const hmax = Math.round(E.hyperdrive.max);
  chargeSel.replaceChildren(el('option', { value: 'coord', disabled: !canCharge('coord') || null }, '🧭 Coordinator' + (S.coord ? ' (charged)' : '')), el('option', { value: 'hyper', disabled: !canCharge('hyper') || null }, '⚡ Hyperdrive (' + (S.hyper || 0) + ' of ' + hmax + ')'));
  chargeSel.value = S.chargeKind === 'hyper' ? 'hyper' : 'coord';
}
const mission = el('div', { class: 'sl-missions' }, el('span', { class: 'sl-mis-l' }, 'Mission:'), el('div', { class: 'sl-mis-g', role: 'radiogroup', 'aria-label': 'Mission' }, misBtns), exploreSel, buildSel, chargeSel, misNote);
// one line under the mission buttons: what the chosen mission gives
function misGives(k) {
  const a = atP();
  if (k === 'explore' && following()) return '📡 Follow the Signal to the next Meridian world. No visitors there, just the story.';
  if (k === 'explore') return heldP() ? '⚔ Drive the outlaws off ' + nm(heldP()) + ': bounty and loot.' : '🚀 A new world' + (S.coord ? ', with the Coordinator steering' : '') + '. About 3 in 10 have a visitor.';
  if (k === 'expedition' && a) return (gasWorld(a) ? '🎈 Cloud dive ' : '🗺 Expedition ') + (exOf(a).step + 1) + '/' + EX_LEN + ': charts a Point of Interest, pays ✦ and maybe a collectible' + (exOf(a).step === EX_LEN - 1 ? ' (certain on the finale)' : '') + '.';
  if (k === 'salvage') return '🛸 One session: a sure find from the derelict, plus ✦.';
  if (k === 'investigate' && a) return '🔬 ' + Math.round(invOf(a).pct * 100) + '% studied: about a third more each session, then a Codex entry, Knowledge and an Anomalies find.';
  if (k === 'charge') return S.chargeKind === 'hyper' ? '⚡ One hyperdrive charge: jump to any world you\'ve visited.' : '🧭 No new world this time, but the next one is steered and your chips count double.';
  if (k === 'build') { const b = building(); return b ? '🏗 ' + jobText(b) + '.' : ''; }
  if (k === 'campaign' && chHere()) return '📡 Chapter ' + (chHere().story.ch + 1) + ', part ' + (chHere().story.step + 1) + ' of ' + ST_LEGS + '.';
  if (k === 'hunt' && S.mw && S.mw.hunt) return '🎯 Manhunt ' + (S.mw.hunt.step + 1) + '/3: ' + MH_PARTS[S.mw.hunt.step].toLowerCase() + (S.mw.hunt.step === 2 ? '. The bounty is ✦ ' + Math.round(mwBounty() * INCOME) + '.' : '.');
  if (k === 'shift') return '🛠 Work a shift at the station for ✦.';
  return '';
}
const lvStrip = el('div', { class: 'sl-lv', title: 'Captain Level (XP) and Knowledge Level. Details on Ship → Captain.' });
function lvBar(k, ic, list, full) {
  const i = lvInfo(S[k]), pct = i.need ? Math.round(i.into / i.need * 100) : 100, t = titleOf(list, i.L);
  const bar = el('span', { class: 'sl-lv-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-label': (k === 'xp' ? 'Captain' : 'Knowledge') + ' level progress' },
    el('i', { style: 'width:' + pct + '%' }), el('em', {}, i.need ? i.into + ' / ' + i.need : 'MAX'));
  if (!full) return el('span', { class: 'sl-lv-i sl-lv-' + k }, el('b', {}, ic + ' Lv ' + i.L), el('span', { class: 'sl-lv-t' }, t), bar);
  return el('div', { class: 'sl-lv-row sl-lv-' + k },
    el('div', { class: 'sl-lv-head' }, el('b', {}, ic + ' ' + (k === 'xp' ? 'Captain' : 'Knowledge') + ' Level ' + i.L), el('span', {}, t)), bar,
    el('small', { class: 'sl-muted' }, i.need ? (i.need - i.into) + (k === 'xp' ? ' XP' : ' Knowledge') + ' to Lv ' + (i.L + 1) : 'Maxed out. ' + (S[k] || 0).toLocaleString() + ' total.'));
}
function rtBar(full) {
  const v = rating(), i = rankOf(v), lo = RANKS[i][0], hi = RANKS[i + 1] ? RANKS[i + 1][0] : 0, pct = hi ? Math.round((v - lo) / (hi - lo) * 100) : 100;
  const bar = el('span', { class: 'sl-lv-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-label': 'Rating progress to the next rank' }, el('i', { style: 'width:' + pct + '%' }), el('em', {}, hi ? (v - lo) + ' / ' + (hi - lo) : 'MAX'));
  if (!full) return el('span', { class: 'sl-lv-i sl-lv-rt', title: 'Rating: everything you have done, added up. Details on Ship → Captain.' }, el('b', {}, '◆ ' + v.toLocaleString()), el('span', { class: 'sl-lv-t' }, RANKS[i][1]), bar);
  return el('div', { class: 'sl-lv-row sl-lv-rt' }, el('div', { class: 'sl-lv-head' }, el('b', { class: 'sx-rt-n' }, v.toLocaleString()), el('span', {}, RANKS[i][1])), bar,
    el('small', { class: 'sl-muted' }, hi ? (hi - v).toLocaleString() + ' to ' + RANKS[i + 1][1] : 'The highest rank there is.'));
}
function drawLv() { lvStrip.replaceChildren(rtBar(), lvBar('xp', '⭐', CAPT), lvBar('kn', '📚', KNOW)); }
const drBox = el('div', { class: 'sl-dr', hidden: true });
function drawDr() {
  if (S.dr) {
    const [ic, title] = DISTRESS[S.dr.sc], ab = el('button', { type: 'button', class: 'btn', disabled: (running && mode === 'focus') || null, title: 'Give up today\'s run (no reward, and it still counts as today\'s)' }, 'Abandon');
    ab.addEventListener('click', () => { if (!ab.classList.contains('arm')) { ab.classList.add('arm'); ab.textContent = 'Click again to abandon'; return; } drAbandon(); });
    drBox.hidden = false; drBox.className = 'sl-dr on';
    drBox.replaceChildren(el('div', { class: 'sl-dr-h' }, '🆘 Distress Run: ' + title), el('div', { class: 'sl-dr-legs' }, Array.from({ length: S.dr.need }, (_, i) => el('span', { class: i < S.dr.n ? 'done' : i === S.dr.n ? 'now' : '' }, 'Act ' + roman(i + 1)))), el('div', { class: 'sl-dr-row' }, el('span', { class: 'sl-muted' }, 'Other missions are locked until the run is over.'), ab));
  } else if (drAvail()) {
    drBox.hidden = false; drBox.className = 'sl-dr offer';
    drBox.replaceChildren(el('div', { class: 'sl-dr-h' }, '🆘 Distress call received!'), el('p', {}, 'Someone out there needs help. Answering takes this whole cycle (' + S.set.every + ' study sessions) with no other missions, and pays about ✦ ' + E.distressRun.base + '–' + (E.distressRun.base + E.distressRun.random) + ' plus a random bonus, XP and Knowledge. One run a day.'),
      el('div', { class: 'sl-dr-row' }, el('button', { type: 'button', class: 'btn sl-go', onclick: drAccept }, 'Accept Distress Run')));
  } else { drBox.hidden = true; drBox.replaceChildren(); }
}
