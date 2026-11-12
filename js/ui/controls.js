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
  if (expediting() && mode === 'focus') { const a = atP(), w = gasWorld(a) ? 'Cloud dive' : 'Expedition'; return !running ? (left > 0 && left < length(mode) ? 'Holding position' : w + ': ' + EX_PARTS[exOf(a).step].toLowerCase() + ' on ' + nm(a)) : (gasWorld(a) ? 'Diving into the clouds of ' : 'Exploring ') + nm(a); }
  if (salvaging() && mode === 'focus') return !running ? (left > 0 && left < length(mode) ? 'Holding position' : 'Ready to salvage') : 'Salvaging ' + atP().derelict.ship;
  if (observing() && mode === 'focus') { const m = mysDef(mysPicked().id); return !running ? (left > 0 && left < length(mode) ? 'Holding position' : m.ic + ' Ready to observe') : m.ic + ' Observing: ' + m.title.charAt(0).toLowerCase() + m.title.slice(1); }
  if (staying() && mode === 'focus') { const a = stayAct(); return !running ? (left > 0 && left < length(mode) ? 'Holding position' : a.ic + ' Staying: ' + a.name.toLowerCase()) : a.ic + ' ' + a.name + ' on ' + nm(atP()); }
  if (chaptering() && mode === 'focus') return !running ? (left > 0 && left < length(mode) ? 'Holding position' : 'Chapter ' + (chHere().story.ch + 1) + ', part ' + (chHere().story.step + 1)) : 'Following the Meridian\'s trail';
  if (returning() && mode === 'focus') { const p = byNum(S.returnTo).p; return !running ? (left > 0 && left < length(mode) ? 'Holding position' : 'Ready to head back to ' + nm(p)) : 'Heading back to ' + nm(p); }
  if (following() && mode === 'focus') return !running ? (left > 0 && left < length(mode) ? 'Holding position' : 'Ready to follow the signal') : 'Following the signal';
  if (!running) return left > 0 && left < length(mode) ? 'Holding position' : mode === 'focus' ? 'Ready for launch' : 'Docked. Take a breather';
  return mode === 'focus' ? 'Traveling to an uncharted world' : 'Preparing equipment for the next mission';
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
// the mission: what this study session is for. Exactly one is pressed, and only the ones possible here are shown.
const MISSIONS = [['explore', '', 'Travel on', 'Travel on to a new world'], ['stay', '', 'Stay here', 'Spend the next session on this world, doing something you pick'], ['mystery', '', 'Mystery', 'Observe one of your open mysteries for a session'], ['campaign', '', 'Meridian', 'The next part of the Meridian chapter on this world']];
const curMission = () => S.mission === MYS ? 'mystery' : S.mission === STAY ? 'stay' : S.mission === -3 ? 'campaign' : 'explore';
function setMission(m, num) {
  if (running && mode === 'focus') return;
  if (m === 'explore') { S.mission = 0; if (num === 'signal' || num === 'random') S.exploreKind = signalOn() ? num : 'random'; else if (/^ret:/.test(num || '')) { S.exploreKind = 'return'; S.returnTo = +num.slice(4); } }
  else if (m === 'mystery') { if (num) S.mysPick = num; if (!mysPicked()) return; S.mission = MYS; }
  else if (m === 'stay') { if (!actsFor(atP()).length) return; if (num) S.stayAct = num; S.mission = STAY; }
  else if (m === 'campaign') { if (!chHere() || atDoor()) return; S.mission = -3; }
  save(); hint.textContent = ''; draw();
}
const MIS_ORDER = ['explore', 'stay', 'mystery', 'campaign'];
const misBtns = MIS_ORDER.map(k => MISSIONS.find(m => m[0] === k)).map(([k, ic, label, tip]) => el('button', { type: 'button', class: 'sl-mis', 'data-m': k, role: 'radio', title: tip, onclick: () => setMission(k) }, el('span', { class: 'sl-mis-i', 'aria-hidden': 'true' }, ic), label));
const misNote = el('p', { class: 'sl-mis-note', 'aria-live': 'polite' });
// Explore picks a random world or, when a Meridian signal is waiting, the signal
const exploreSel = el('select', { class: 'sl-build-sel', 'aria-label': 'Where to explore' });
exploreSel.addEventListener('change', () => setMission('explore', exploreSel.value));
function fillExploreSel() {
  const back = returnPlaces().sort((a, b) => (S.home === b.num) - (S.home === a.num));
  exploreSel.replaceChildren(el('option', { value: 'random' }, '🚀 A new world'), signalOn() ? el('option', { value: 'signal' }, '📡 Follow the Signal') : null,
    ...back.map(p => el('option', { value: 'ret:' + p.num }, (S.home === p.num ? '🏠 Home: ' : '★ Back to ') + nm(p))));
  exploreSel.value = S.exploreKind === 'signal' && signalOn() ? 'signal' : returning() ? 'ret:' + S.returnTo : 'random';
}
// Travel on picks a star region (more open as you study)
const regionSel = el('select', { class: 'sl-build-sel', 'aria-label': 'Which region' });
regionSel.addEventListener('change', () => { S.region = regionSel.value; save(); hint.textContent = ''; draw(); });
function fillRegionSel() { const g = regionNow(); regionSel.replaceChildren(...regions().map(x => el('option', { value: x.id, disabled: !regionOpen(x) || null }, '🌌 ' + x.name + (regionOpen(x) ? '' : ' (opens at ' + x.hours + ' hours)')))); if (g) regionSel.value = g.id; }
// Mystery picks which one, when there are several
const mysSel = el('select', { class: 'sl-build-sel', 'aria-label': 'Which mystery' });
mysSel.addEventListener('change', () => setMission('mystery', mysSel.value));
function fillMysSel() { mysSel.replaceChildren(...S.mys.filter(o => mysDef(o.id)).map(o => { const m = mysDef(o.id); return el('option', { value: o.id }, m.ic + ' ' + m.title); })); const o = mysPicked(); if (o) mysSel.value = o.id; }
// Stay here picks what to do
const staySel = el('select', { class: 'sl-build-sel', 'aria-label': 'What to do here' });
staySel.addEventListener('change', () => setMission('stay', staySel.value));
function fillStaySel() { const L = actsFor(atP()), a = stayAct(); staySel.replaceChildren(...L.map(x => el('option', { value: x.id }, x.ic + ' ' + x.name))); if (a) staySel.value = a.id; }
const mission = el('div', { class: 'sl-missions' }, el('span', { class: 'sl-mis-l' }, 'Mission:'), el('div', { class: 'sl-mis-g', role: 'radiogroup', 'aria-label': 'Mission' }, misBtns), exploreSel, regionSel, mysSel, staySel, misNote);
// one line under the mission buttons: what the chosen mission gives
function misGives(k) {
  const a = atP();
  if (k === 'explore' && following()) return '📡 Follow the Signal to the next Meridian world. No visitors there, just the story.';
  if (k === 'explore' && returning()) { const p = byNum(S.returnTo).p; return (S.home === p.num ? '🏠 Home to ' : '★ Back to ') + nm(p) + '. See what changed while you were gone.'; }
  if (k === 'explore') { const g = regionNow(); return '🚀 A new world' + (g && regions().filter(regionOpen).length > 1 ? ' in ' + g.name + ': ' + g.desc.charAt(0).toLowerCase() + g.desc.slice(1) : '. Now and then something is waiting there.'); }
  if (k === 'mystery' && mysPicked()) { const o = mysPicked(), m = mysDef(o.id); return m.ic + ' ' + m.title + ': ' + o.step + ' of ' + m.steps.length + ' observed. It can\'t go wrong: every session gets closer.'; }
  if (k === 'stay' && a && stayAct()) { const s = stayAct(), n = placesLeft(a); return s.ic + ' ' + s.desc + (n ? ' Might find a new place (' + n + ' still out there).' : placesUnfound(a) ? ' The places left here are on the expedition.' : ' Every place here is found.'); }
  if (k === 'campaign' && chHere()) return '📡 Chapter ' + (chHere().story.ch + 1) + ', part ' + (chHere().story.step + 1) + ' of ' + ST_LEGS + '.';
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
function drawLv() { lvStrip.replaceChildren(lvBar('xp', '⭐', CAPT), lvBar('kn', '📚', KNOW)); }
