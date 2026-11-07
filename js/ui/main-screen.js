/* Solarist: The middle of the screen and the left column: world name, cycle bar, quests. */
'use strict';

// the world shown in the middle of the screen
function scenePlanet(kind) {
  const b = building();
  return kind === 'build' ? (b.p || atP()) : kind === 'fight' ? heldP() : kind === 'distress' || (kind === 'campaign' && running) ? null : kind === 'explore' && running ? null : atP();
}
const sceneKind = () => mode !== 'focus' ? 'break' : S.dr ? 'distress' : following() ? 'campaign' : chaptering() || expediting() || investigating() || salvaging() ? 'discover' : hunting() ? 'fight' : shifting() ? 'view' : building() ? (building().k === 'room' ? 'shipbuild' : 'build') : charging() ? 'charge' : heldP() ? 'fight' : 'explore';
function drawName() {
  if (pv && pvP()) { const p = pvP(); nameBox.disabled = false; nameBox.replaceChildren(el('b', {}, nm(p)), el('span', {}, p.type + ' world, ', el('i', { class: 'sx-r-' + p.rarity.toLowerCase() }, p.rarity), ', ' + (p.x || (p.x = makeExtra(p))).hab + '% habitable')); nameBox.onclick = () => { pvClose(true); tab('log'); openWorld(p.num); }; return; }
  const kind = sceneKind(), p = scenePlanet(kind);
  nameBox.disabled = !p;
  nameBox.replaceChildren(...(p ? [el('b', {}, nm(p)), el('span', {}, p.type + ' world, ', el('i', { class: 'sx-r-' + p.rarity.toLowerCase() }, p.rarity), ', ' + (p.x || (p.x = makeExtra(p))).hab + '% habitable' + (held(p) ? ', held by outlaws' : ''))]
    : hunting() && mode === 'focus' ? [el('b', {}, S.mw.name), el('span', {}, 'Most Wanted hunt, Act ' + roman(S.mw.act + 1) + ' of II')]
    : kind === 'distress' ? [el('b', {}, DISTRESS[S.dr.sc][1]), el('span', {}, 'Distress Run, Act ' + roman(S.dr.n + 1) + ' of ' + roman(S.dr.need))]
      : [el('b', {}, 'Uncharted world'), el('span', {}, S.coord ? 'Following the Coordinator' : 'Somewhere ahead')]));
  nameBox.onclick = p ? () => { tab('log'); openWorld(p.num); } : null;
}
function drawCycle(pct) { // one segment per study session, a short tick per short break, a long one for the long break
  const n = S.set.every, done = mode === 'focus' ? S.cycle % n : (S.cycle % n || n), kids = [];
  for (let i = 0; i < n; i++) {
    const st = i < done ? 'done' : i === done && mode === 'focus' ? 'now' : '';
    kids.push(el('span', { class: 'st ' + st, style: st === 'now' ? '--p:' + pct + '%' : null }));
    const bst = mode !== 'focus' && i === done - 1 ? 'now' : i < done - 1 ? 'done' : '';
    kids.push(el('span', { class: (i === n - 1 ? 'lb ' : 'sb ') + bst, style: bst === 'now' ? '--p:' + pct + '%' : null }));
  }
  cycleBar.replaceChildren(...kids);
  cycleBar.classList.toggle('broken', !!S.fc.broken);
}
// the left side has tabs like the right: Here (the world you're at), Quests, the Meridian and Travel. The last one you picked is remembered.
let leftTab = 'here'; try { leftTab = localStorage.getItem('solarist-ltab') || 'here'; } catch (e) { }
function drawLeft() {
  const drInfo = !S.dr && !drAvail() ? el('p', { class: 'sl-muted' }, S.drDay === today() ? 'Today\'s run is done. A new distress call comes in tomorrow.' : S.fcDay === today() ? 'A distress call comes in at the start of your next cycle.' : 'Finish a whole cycle without skipping (a Full Cycle) and a distress call comes in after the long break.') : null;
  const qs = S.bounties.map(b => el('div', { class: 'sx-q' }, el('span', {}, b.t, el('small', {}, b.k === 'sessions' ? (b.prog || 0) + ' of ' + b.v + ' done' : b.k === 'cycle' ? 'finish a whole cycle, nothing skipped' : 'on any Explore trip')), el('em', {}, '✦ ' + Math.round(b.reward * INCOME))));
  const coordB = !S.coord && !S.dr ? el('button', { type: 'button', class: 'sl-link', disabled: (running && mode === 'focus') || (charging() && S.chargeKind !== 'hyper') || null, onclick: () => setMission('charge', 'coord') }, charging() && S.chargeKind !== 'hyper' ? 'Charging next session' : 'Charge it next session') : null;
  const hyperB = canCharge('hyper') && !S.dr ? el('button', { type: 'button', class: 'sl-link', disabled: (running && mode === 'focus') || (charging() && S.chargeKind === 'hyper') || null, onclick: () => setMission('charge', 'hyper') }, charging() && S.chargeKind === 'hyper' ? 'Charging next session' : 'Charge one next session') : null;
  const lock = running && mode === 'focus';
  const legBar = (n, now, total, label) => el('div', { class: 'sl-dr-legs sx-legs' }, Array.from({ length: total }, (_, k) => el('span', { class: k < n ? 'done' : k === now ? 'now' : '' }, label(k))));
  const hereS = hereSec(lock, legBar);
  dlCheck();
  // carried delivery jobs (taken from Postal offices) and the Most Wanted poster (from a Cassini Federation Post)
  const here = atP(), dlSec = sec('Deliveries ' + S.dl.carry.length + '/' + DLMAX(), ...(S.dl.carry.length ? S.dl.carry.map(d => el('div', { class: 'sx-offer' },
      el('div', { class: 'sx-q' }, el('span', {}, '📦 ' + dName(d), el('small', {}, d.client + ': ' + d.cargo)), el('em', {}, '✦ ' + Math.round(d.pay * INCOME))),
      el('ul', { class: 'sx-reqs' }, d.reqs.map(r => el('li', { class: here && here.num !== d.from && dMet(here, r) ? 'ok' : '' }, DREQ[r.k][1](r.v)))),
      el('div', { class: 'sx-row-l' }, here && here.num !== d.from ? el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => dlDeliver(here, d) }, 'Deliver at ' + nm(here) + ' now (' + Math.round(dlScore(here, d) * 100) + '% match, ✦ ' + Math.round(dlPayAt(here, d) * INCOME) + (viaJump(here) ? ', −' + Math.round((1 - E.quests.deliveryViaJump) * 100) + '% jumped here' : '') + ')') : el('span', { class: 'sl-muted' }, 'Travel somewhere new to deliver. '),
        armBtn('Drop', 'Sure?', () => dlAbandon(d), 'sx-mini'))))
    : [el('p', { class: 'sl-muted' }, 'No jobs in your hold. Postal offices turn up on new worlds now and then. ' + S.dl.done + ' delivered so far.')]),
    S.dl.carry.length ? el('p', { class: 'sl-muted' }, 'A perfect match delivers itself when you arrive.') : null);
  const m = S.mw, mwSec = m ? sec('Most Wanted', el('p', { class: 'sx-q-h' }, '🎯 ' + m.name), el('p', { class: 'sl-muted' }, 'Of ' + m.gang + '. Wanted for: ' + m.crime + '. Bounty ✦ ' + Math.round(mwBounty() * INCOME) + '.'),
      m.sighted == null ? el('p', {}, '🔭 ' + Math.round(sightChance() * 100) + '% chance of a sighting on your next trip.' + (m.tip ? ' (Station tip-off included.)' : ''))
        : mwHere() ? el('p', {}, '🎯 Sighted here! The Manhunt is on the Here tab.')
        : el('div', {}, el('p', {}, '🎯 Sighted on ' + (byNum(m.sighted) ? nm(byNum(m.sighted).p) : 'a world you left') + '. The trail waits for you there.'), byNum(m.sighted) ? jumpBtn(byNum(m.sighted).p, 'sl-link') : null),
      el('div', { class: 'sx-row-l' }, armBtn('Hand back the poster', 'Sure?', csDrop, 'sx-mini')))
    : sec('Most Wanted', el('p', { class: 'sl-muted' }, 'No poster. Cassini Federation Posts turn up on new worlds now and then and hand them out. ' + (S.mwDone || 0) + ' caught so far.'));
  wkCheck();
  const wk = S.wk, wkSec = sec('Guild Contract', ...wk.goals.map(g => { const pr = wkProg(g); return el('div', { class: 'sx-q' + (pr >= g.n ? ' done' : '') }, el('span', {}, WK_GOALS[g.k][0].replace('{n}', g.n)), el('em', {}, pr >= g.n ? '✓' : pr + ' / ' + g.n)); }),
    wk.claimed ? el('p', { class: 'sl-muted' }, 'Paid out. A new contract comes on Monday.')
      : wkDone() ? el('div', { class: 'sx-claim' }, el('p', {}, 'All done! Pick your pay:'), el('div', { class: 'sx-row-l' },
        el('button', { type: 'button', class: 'btn sx-buy', onclick: () => wkClaim('dust') }, '✦ ' + Math.round(E.quests.contract * INCOME)), el('button', { type: 'button', class: 'btn sx-buy', onclick: () => wkClaim('kp') }, E.quests.contractKnowledge + ' Knowledge'), el('button', { type: 'button', class: 'btn sx-buy', onclick: () => wkClaim('item') }, 'A Rare find')))
        : el('p', { class: 'sl-muted' }, 'Finish all three this week (resets Monday).'));
  const travelS = sec('Coordinator & Hyperdrive', el('p', {}, '⚡ Hyperdrive: ' + (S.hyper || 0) + ' of ' + Math.round(E.hyperdrive.max) + ' charges. A charge jumps you to any world you\'ve visited (Star map or Logbook). ', hyperB),
      el('p', {}, S.coord ? '🧭 Coordinator charged. Next Explore, every chip counts double.' : '🧭 Coordinator empty. One study session of Charge doubles your chips for the next Explore.'),
      el('p', { class: 'sl-muted' }, chipsPut() + ' of ' + S.chips.own + ' chips placed' + (chipsPut() ? ': ' + CHIP_F.filter(f => S.chips.put[f[0]]).map(f => f[1] + ' ' + S.chips.put[f[0]]).join('  ') : '.')),
      el('div', { class: 'sx-row-l' }, coordB, el('button', { type: 'button', class: 'sl-link', onclick: () => { rightTab = 'coord'; drawRight(); } }, 'Open the panel')));
  // quests, with whatever needs you first: an open distress call or contract pay, a sighting, jobs you carry, then the rest
  const wkReady = wkDone() && !S.wk.claimed, drNow = !!S.dr || drAvail(), sighted = !!S.mw && S.mw.sighted != null;
  const quests = [[drNow ? 0 : 9, sec('Distress Run', drBox, drInfo)], [wkReady ? 0 : S.wk.claimed ? 8 : 4, wkSec], [sighted ? 1 : S.mw ? 3 : 7, mwSec],
    [S.dl.carry.length ? 2 : 6, dlSec], [5, sec('Bounties', ...qs, el('p', { class: 'sl-muted' }, S.bDone + ' completed so far'))]].sort((a, b) => a[0] - b[0]).map(x => x[1]);
  // a "!" on a tab when something there is waiting for you
  const p = atP(), hereNew = !!p && (!!(p.postal && p.postal.offers.length && S.dl.carry.length < DLMAX()) || !!(p.cassini && !p.cassini.taken && !S.mw) || !!derelictHere() || !!mwHere() || atDoor());
  const tabs = [['here', '📍 Here', hereNew], ['quests', 'Quests', drAvail() || wkReady || (sighted && !mwHere())], STD ? ['story', '📡 Meridian', signalOn() && !following()] : null, ['travel', '⚡ Travel', false]].filter(Boolean);
  if (!tabs.some(t => t[0] === leftTab)) leftTab = 'here';
  const lt = ([k, label, dot]) => el('button', { type: 'button', role: 'tab', 'aria-selected': String(leftTab === k), onclick: () => { leftTab = k; try { localStorage.setItem('solarist-ltab', k); } catch (e) { } drawLeft(); leftCol.scrollTop = 0; } },
    label, dot && leftTab !== k ? el('i', { class: 'sx-dot sx-dot-amber' }, '!') : null);
  const page = leftTab === 'quests' ? quests : leftTab === 'story' ? [storySec()] : leftTab === 'travel' ? [travelS] : [hereS];
  leftCol.replaceChildren(el('div', { class: 'sx-rtabs', role: 'tablist', 'aria-label': 'Left panel' }, tabs.map(lt)), ...page);
}
// the briefing card: the world you're at, its visitor, and what you can do here
function pathPick(cur, lock, leg, tip, set) {
  return el('div', { class: 'sx-paths', role: 'radiogroup', 'aria-label': 'Path' }, [1, 2].map(o => el('button', { type: 'button', role: 'radio', 'aria-checked': String(cur === o - 1), disabled: lock || null, onclick: () => set(o - 1) },
    el('b', {}, leg[o][0]), el('small', {}, tip(o === 2)))));
}
function hereSec(lock, legBar) {
  const p = atP();
  if (!p) return sec(null, el('p', { class: 'sl-muted' }, 'Deep space. Explore to find your first world.'));
  const x = exOf(p), gas = gasWorld(p), out = [];
  out.push(el('p', { class: 'sx-q-h' }, el('button', { type: 'button', class: 'sl-link sx-here-n', onclick: () => { tab('log'); openWorld(p.num); } }, nm(p))),
    el('p', { class: 'sl-muted' }, p.type + ' · ' + p.rarity + (p.odd ? ' · ' + p.odd : '')));
  // the visitor, if there is one
  const visit = [];
  if (held(p)) visit.push('🏴 ' + p.outlaw.gang.replace(/^the/, 'The') + ' hold this world. Explore turns into Fight until you drive them out.');
  if (stationAt(p)) visit.push(el('span', {}, '🛰 ' + S.station.name + ' is in orbit. ', el('button', { type: 'button', class: 'sl-link', onclick: () => { rightTab = 'station'; drawRight(); } }, 'Visit the station')));
  if (S.trader && S.trader.num === p.num) visit.push(el('span', {}, '🏪 ' + S.trader.name + ' is docked here. ', el('button', { type: 'button', class: 'sl-link', onclick: () => { rightTab = 'trade'; drawRight(); } }, 'Trade')));
  if (p.enc) visit.push(p.enc.ic + ' ' + p.enc.title.replace(/!$/, '') + ' (paid ✦ ' + p.enc.dust + ')');
  if (!visit.length && p.visit === 'none' && !p.postal && !p.cassini) visit.push('No visitors here. Just you and the world.');
  visit.forEach(v => out.push(el('p', { class: 'sx-visit' }, v)));
  if (p.postal && p.postal.offers.length) {
    const full = S.dl.carry.length >= DLMAX();
    out.push(el('p', { class: 'sx-visit' }, '📮 ' + p.postal.name + ' has ' + p.postal.offers.length + ' job' + (p.postal.offers.length === 1 ? '' : 's') + (full ? '. Your hold is full (' + DLMAX() + ').' : '. You can carry ' + DLMAX() + ' at a time.')),
      ...p.postal.offers.map((d, i) => el('div', { class: 'sx-offer' }, el('div', { class: 'sx-q' }, el('span', {}, '📦 ' + dName(d), el('small', {}, d.cargo)), el('em', {}, '✦ ' + Math.round(d.pay * INCOME))),
        el('ul', { class: 'sx-reqs' }, d.reqs.map(r => el('li', {}, DREQ[r.k][1](r.v)))), el('button', { type: 'button', class: 'sl-link', disabled: lock || full || null, onclick: () => dlTake(p, i) }, 'Take this job'))));
  }
  if (p.cassini && !p.cassini.taken) {
    const c = p.cassini;
    out.push(el('p', { class: 'sx-visit' }, '🚓 A Cassini Federation Post has a poster: ', el('b', {}, c.name), ' of ' + c.gang + ', who ' + c.crime + '. Bounty ✦ ' + Math.round(mwBounty() * INCOME) + '.'),
      S.mw ? el('p', { class: 'sl-muted' }, 'You already carry a poster (' + S.mw.name + '). Hand it back to take this one.') : el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => csTake(p) }, 'Take the poster'));
  }
  // a Meridian chapter on this world
  if (p.story && STD) out.push(...chapterBits(p, lock, legBar));
  // the expedition
  const head = (gas ? '🎈 Cloud dive' : '🗺 Expedition');
  if (exDone(p)) out.push(el('p', { class: 'sx-explored' }, '✓ Fully explored · ' + x.poi.length + ' Points of Interest'));
  else if (canExpedition(p)) {
    const leg = exLeg(p, x.step);
    out.push(el('p', { class: 'sx-q-h sx-q-sub' }, head + ' · ' + EX_PARTS[x.step]), legBar(x.step, x.step, EX_LEN, k => EX_PARTS[k]), el('p', {}, leg[0]),
      pathPick(x.pick, lock, leg, bold => exPathTip(x.step, bold), v => { (p.ex = p.ex || { step: 0, pick: 0, poi: [] }).pick = v; save(); drawLeft(); }),
      el('div', { class: 'sx-row-l' }, expediting() ? el('span', { class: 'sl-muted' }, 'Next session ' + (x.step ? 'continues it' : 'sets out') + '. ') : el('button', { type: 'button', class: 'sl-link', disabled: lock || !!S.dr || null, onclick: () => setMission('expedition') }, x.step ? 'Continue next session' : 'Set out next session'),
        expediting() ? el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => { S.mission = 0; save(); hint.textContent = ''; draw(); } }, 'Not now') : null));
  }
  if (x.poi.length && !exDone(p)) out.push(el('p', { class: 'sl-muted' }, 'Charted: ' + x.poi.map(o => o.name).join(', ') + '.'));
  // the anomaly
  if (p.odd && !p.story) {
    const v = invOf(p);
    if (v.done) out.push(el('p', { class: 'sx-explored' }, '🔬 Anomaly solved. ', el('button', { type: 'button', class: 'sl-link', onclick: () => { rightTab = 'tx'; txFilter = 'codex'; drawRight(); } }, 'Read it in the Codex')));
    else if (canInvestigate(p)) out.push(el('p', { class: 'sx-q-h sx-q-sub' }, '🔬 Anomaly: ' + capFirst(p.odd)), el('div', { class: 'sx-camp-bar' }, el('i', { style: 'width:' + Math.round(v.pct * 100) + '%' })),
      el('div', { class: 'sx-row-l' }, investigating() ? el('span', { class: 'sl-muted' }, Math.round(v.pct * 100) + '% studied. Investigating next session. ') : el('button', { type: 'button', class: 'sl-link', disabled: lock || !!S.dr || null, onclick: () => setMission('investigate') }, (v.pct ? 'Keep investigating (' + Math.round(v.pct * 100) + '%)' : 'Investigate it') + ' next session')));
  }
  // the Manhunt, if your Most Wanted was sighted here
  if (mwHere()) {
    const x = S.mw.hunt, leg = mwLegText(x.step);
    out.push(el('p', { class: 'sx-q-h sx-q-sub' }, '🎯 Manhunt: ' + S.mw.name), legBar(x.step, x.step, 3, k => MH_PARTS[k]), el('p', {}, leg[0]),
      pathPick(x.pick, lock, leg, bold => x.step === 2 ? (bold ? 'Same bounty, the bold way' : 'Same bounty, the careful way') : '✦ ' + Math.round(CS.legPay * INCOME), v => { x.pick = v; save(); drawLeft(); }),
      el('div', { class: 'sx-row-l' }, hunting() ? el('span', { class: 'sl-muted' }, 'Hunting next session. ') : el('button', { type: 'button', class: 'sl-link', disabled: lock || !!S.dr || null, onclick: () => setMission('hunt') }, x.step ? 'Continue the Manhunt next session' : 'Start the Manhunt next session')));
  }
  // a derelict to salvage
  const d = derelictHere();
  if (d) {
    const leg = derelictLeg(d);
    out.push(el('p', { class: 'sx-q-h sx-q-sub' }, '🛸 Derelict: ' + d.derelict.ship), el('p', {}, leg[0]),
      pathPick(d.derelict.pick, lock, leg, bold => bold ? 'A rarer find, less ✦' : 'A sure find and ✦ ' + Math.round(EXP.salvage * INCOME), v => { d.derelict.pick = v; save(); drawLeft(); }),
      el('div', { class: 'sx-row-l' }, salvaging() ? el('span', { class: 'sl-muted' }, 'Salvaging next session. ') : el('button', { type: 'button', class: 'sl-link', disabled: lock || !!S.dr || null, onclick: () => setMission('salvage') }, 'Salvage next session')));
  }
  return sec(null, ...out);
}
// the Meridian story on the left: where the signal is, or what's left
function storySec() {
  if (!STD) return null;
  const lock = running && mode === 'focus', st = S.story, bits = [];
  bits.push(el('div', { class: 'sx-camp-bar' }, el('i', { style: 'width:' + Math.round((st.done ? ST_N : st.ch) / ST_N * 100) + '%' })), el('p', { class: 'sl-muted' }, (st.done ? ST_N : st.ch) + ' of ' + ST_N + ' chapters'));
  if (st.done) bits.push(el('p', {}, 'Complete. The light stays on the Star map, so you can go back whenever you like.'));
  else if (signalOn()) bits.push(el('p', {}, '📡 ' + signalText()), heldP() ? el('p', { class: 'sl-muted' }, 'Drive the outlaws off first.') : following() ? el('p', { class: 'sl-muted' }, 'Following the signal next session. ', el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => setMission('explore', 'random') }, 'Not now'))
    : el('button', { type: 'button', class: 'sl-link', disabled: lock || !!S.dr || null, onclick: () => setMission('explore', 'signal') }, 'Follow the Signal next session'));
  else bits.push(el('p', {}, atDoor() ? '📡 Something is waiting for you here. See the Here tab.' : '📡 Chapter ' + (st.ch + 1) + ' is here. See the Here tab.'));
  if (st.log.length) bits.push(el('button', { type: 'button', class: 'sl-link sx-readlogs', onclick: () => { rightTab = 'tx'; txFilter = 'camp'; drawRight(); } }, 'Read the story so far'));
  return sec(null, ...bits);
}
// the chapter part of the Here card: the next leg with its two choices, or the door
function chapterBits(p, lock, legBar) {
  const c = STD.chapters[p.story.ch], out = [el('p', { class: 'sx-q-h sx-q-sub' }, '📡 Chapter ' + (p.story.ch + 1) + ': ' + c.name)];
  if (p.story.ch !== S.story.ch || S.story.done) { out.push(el('p', { class: 'sl-muted' }, 'You finished this chapter. Its parts are in the story log.')); return out; }
  const st = p.story, leg = c.legs[st.step];
  out.push(legBar(st.step, st.step, ST_LEGS, k => String(k + 1)), el('p', { class: 'sx-q-sub' }, el('b', {}, leg.title)), ...leg.text.map(t => el('p', { class: 'sx-story' }, t)));
  if (!atDoor()) {
    out.push(pathPick(st.pick, lock, [null, leg.a, leg.b], () => 'Changes the words, not the story', v => { st.pick = v; save(); drawLeft(); }),
      el('div', { class: 'sx-row-l' }, chaptering() ? el('span', { class: 'sl-muted' }, 'Next session follows the chapter. ') : el('button', { type: 'button', class: 'sl-link', disabled: lock || !!S.dr || null, onclick: () => setMission('campaign') }, 'Follow the chapter next session')));
    return out;
  }
  if (!S.story.solved) { // the door: a text field, no penalty for wrong answers
    const inp = el('input', { type: 'text', class: 'sx-door-in', 'aria-label': 'Your answer', autocomplete: 'off', spellcheck: 'false', disabled: lock || null });
    const go = () => doorTry(inp.value);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    out.push(el('div', { class: 'sx-door' }, inp, el('button', { type: 'button', class: 'btn', disabled: lock || null, onclick: go }, 'Try')), doorMsg ? el('p', { class: 'sx-door-msg' }, doorMsg) : null);
    return out;
  }
  out.push(...leg.success.map(t => el('p', { class: 'sx-story' }, t)), el('div', { class: 'sx-paths' }, [leg.a, leg.b].map((o, i) => el('button', { type: 'button', disabled: lock || null, onclick: () => storyEnd(i) }, el('b', {}, o[0])))));
  return out;
}
