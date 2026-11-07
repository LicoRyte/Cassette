/* Solarist: The middle of the screen and the left column: world name, cycle bar, quests. */
'use strict';

// the world shown in the middle of the screen
function scenePlanet(kind) {
  const b = building();
  return kind === 'build' ? (b.p || atP()) : kind === 'fight' ? heldP() : kind === 'distress' || (kind === 'campaign' && running) ? null : kind === 'explore' && running ? null : atP();
}
const sceneKind = () => mode !== 'focus' ? 'break' : S.dr ? 'distress' : campaigning() || expediting() ? 'campaign' : hunting() ? 'fight' : shifting() ? 'view' : building() ? (building().k === 'room' ? 'shipbuild' : 'build') : charging() ? 'charge' : discovering() ? 'discover' : heldP() ? 'fight' : 'explore';
function drawName() {
  if (pv && pvP()) { const p = pvP(); nameBox.disabled = false; nameBox.replaceChildren(el('b', {}, nm(p)), el('span', {}, p.type + ' world, ', el('i', { class: 'sx-r-' + p.rarity.toLowerCase() }, p.rarity), ', ' + (p.x || (p.x = makeExtra(p))).hab + '% habitable')); nameBox.onclick = () => { pvClose(true); tab('log'); openWorld(p.num); }; return; }
  const kind = sceneKind(), p = scenePlanet(kind);
  nameBox.disabled = !p;
  nameBox.replaceChildren(...(p ? [el('b', {}, nm(p)), el('span', {}, p.type + ' world, ', el('i', { class: 'sx-r-' + p.rarity.toLowerCase() }, p.rarity), ', ' + (p.x || (p.x = makeExtra(p))).hab + '% habitable' + (held(p) ? ', held by outlaws' : ''))]
    : hunting() && mode === 'focus' ? [el('b', {}, S.mw.name), el('span', {}, 'Most Wanted hunt, Act ' + roman(S.mw.act + 1) + ' of II')]
    : expediting() && mode === 'focus' && !p ? [el('b', {}, EXPED[S.exp.id][1]), el('span', {}, 'Expedition, leg ' + (S.exp.step + 1) + ' of ' + EXP_LEN)]
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
function drawLeft() {
  const drInfo = !S.dr && !drAvail() ? el('p', { class: 'sl-muted' }, S.drDay === today() ? 'Today\'s run is done. A new distress call comes in tomorrow.' : S.fcDay === today() ? 'A distress call comes in at the start of your next cycle.' : 'Finish a whole cycle without skipping (a Full Cycle) and a distress call comes in after the long break.') : null;
  const qs = S.bounties.map(b => el('div', { class: 'sx-q' }, el('span', {}, b.t, el('small', {}, b.k === 'sessions' ? (b.prog || 0) + ' of ' + b.v + ' done' : b.k === 'cycle' ? 'finish a whole cycle, nothing skipped' : 'on any Explore trip')), el('em', {}, '✦ ' + Math.round(b.reward * INCOME))));
  const coordB = !S.coord && !S.dr ? el('button', { type: 'button', class: 'sl-link', disabled: (running && mode === 'focus') || charging() || null, onclick: () => setMission('charge') }, charging() ? 'Charging next session' : 'Charge it next session') : null;
  const lock = running && mode === 'focus';
  const legBar = (n, now, total, label) => el('div', { class: 'sl-dr-legs sx-legs' }, Array.from({ length: total }, (_, k) => el('span', { class: k < n ? 'done' : k === now ? 'now' : '' }, label(k))));
  let expSec;
  if (S.exp) {
    const [ic, title, , legs] = EXPED[S.exp.id], st = S.exp.step, lg = legs[st];
    expSec = sec('Expedition', el('p', { class: 'sx-q-h' }, ic + ' ' + title), legBar(st, st, EXP_LEN, k => k < EXP_LEN - 1 ? String(k + 1) : '★'),
      lg ? el('p', {}, lg[0]) : el('p', {}, 'The last leg. One more session to finish and collect.'),
      lg ? el('div', { class: 'sx-paths', role: 'radiogroup', 'aria-label': 'Path' }, [1, 2].map(o => el('button', { type: 'button', role: 'radio', 'aria-checked': String(S.exp.pick === o - 1), disabled: lock || null, onclick: () => { S.exp.pick = o - 1; save(); drawLeft(); } },
        el('b', {}, lg[o][0]), el('small', {}, o === 1 ? 'Safe: ✦ ' + Math.round(E.quests.expeditionSafe * INCOME) : 'Bold: maybe a collectible')))) : null,
      el('div', { class: 'sx-row-l' }, expediting() ? el('span', { class: 'sl-muted' }, 'Next session continues it. ') : el('button', { type: 'button', class: 'sl-link', disabled: lock || !!S.dr || null, onclick: () => setMission('expedition') }, 'Continue next session'),
        expediting() ? el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => { S.mission = 0; save(); hint.textContent = ''; draw(); } }, 'Pause it') : null, armBtn('Abandon', 'Sure?', expAbandon, 'sx-mini')));
  } else if (expAvail()) {
    const [ic, title, intro] = EXPED[expOffer()];
    expSec = sec('Expedition', el('p', { class: 'sx-q-h' }, ic + ' ' + title), el('p', {}, intro),
      el('p', { class: 'sl-muted' }, EXP_LEN + ' study sessions, any time you like. Pays ✦ ' + Math.round(E.quests.expedition * INCOME) + ' and a Rare or better find.'),
      el('button', { type: 'button', class: 'sl-link', disabled: lock || !!S.dr || null, onclick: expStart }, 'Start the expedition'));
  } else expSec = sec('Expedition', el('p', { class: 'sl-muted' }, 'Back from the last one. A new expedition offer comes tomorrow. ' + (S.expDone || 0) + ' completed so far.'));
  dlCheck();
  const dlRow = r => el('li', {}, DREQ[r.k][1](r.v)), here = atP(), dA = S.dl.active;
  const dlSec = dA ? sec('Interstellar Delivery', el('p', { class: 'sx-q-h' }, '📦 ' + dName(dA)), el('p', { class: 'sl-muted' }, dA.client + ' wants ' + dA.cargo + ' taken to a world with:'),
      el('ul', { class: 'sx-reqs' }, dA.reqs.map(r => el('li', { class: here && here.num !== dA.from && dMet(here, r) ? 'ok' : '' }, DREQ[r.k][1](r.v)))),
      el('p', { class: 'sl-muted' }, 'Pays ✦ ' + Math.round(dA.pay * INCOME) + ' on a perfect match (it delivers itself when you arrive at one).'),
      el('div', { class: 'sx-row-l' }, here && here.num !== dA.from ? el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => dlDeliver(here) }, 'Deliver at ' + nm(here) + ' now (' + Math.round(dlScore(here) * 100) + '% match, ✦ ' + Math.round(dlPayAt(here) * INCOME) + (viaJump(here) ? ', −' + Math.round((1 - E.quests.deliveryViaJump) * 100) + '% jumped here' : '') + ')') : el('span', { class: 'sl-muted' }, 'Travel somewhere new to deliver. '),
        armBtn('Abandon', 'Sure?', dlAbandon, 'sx-mini')))
    : sec('Interstellar Delivery', S.dl.offers.length ? el('p', { class: 'sl-muted' }, 'Pick one job. ' + S.dl.offers.length + ' left today.') : el('p', { class: 'sl-muted' }, 'No more jobs today. New ones come tomorrow. ' + S.dl.done + ' delivered so far.'),
      ...S.dl.offers.map((d, i) => el('div', { class: 'sx-offer' }, el('div', { class: 'sx-q' }, el('span', {}, '📦 ' + dName(d), el('small', {}, d.cargo)), el('em', {}, '✦ ' + Math.round(d.pay * INCOME))),
        el('ul', { class: 'sx-reqs' }, d.reqs.map(dlRow)), el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => dlAccept(i) }, 'Take this job'))));
  const m = S.mw, mwSec = m ? sec('Most Wanted', el('p', { class: 'sx-q-h' }, '🎯 ' + m.name), el('p', { class: 'sl-muted' }, 'Boss of ' + m.gang + '.'),
      legBar(m.clues, m.clues, m.need, () => '🔎'),
      mwReady() ? (hunting() ? el('p', { class: 'sl-muted' }, m.act ? 'Act II next session. ' : 'The hunt starts next session (two sessions). ', el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => { S.mission = 0; save(); hint.textContent = ''; draw(); } }, 'Not yet'))
        : el('button', { type: 'button', class: 'sl-link', disabled: lock || !!S.dr || null, onclick: () => setMission('hunt') }, m.act ? 'Finish the hunt next session' : 'Hunt them down next session'))
        : el('p', { class: 'sl-muted' }, 'Clues ' + m.clues + ' of ' + m.need + '. Explore, survey and fight outlaws to find more.'))
    : sec('Most Wanted', el('p', { class: 'sl-muted' }, 'No poster yet. Drive out ' + Math.max(1, mwAt() - (S.fights || 0)) + ' more outlaw gang' + (mwAt() - (S.fights || 0) === 1 ? '' : 's') + ' and the Guild names a boss to hunt. ' + (S.mwDone || 0) + ' caught so far.'));
  wkCheck();
  const wk = S.wk, wkSec = sec('Guild Contract', ...wk.goals.map(g => { const pr = wkProg(g); return el('div', { class: 'sx-q' + (pr >= g.n ? ' done' : '') }, el('span', {}, WK_GOALS[g.k][0].replace('{n}', g.n)), el('em', {}, pr >= g.n ? '✓' : pr + ' / ' + g.n)); }),
    wk.claimed ? el('p', { class: 'sl-muted' }, 'Paid out. A new contract comes on Monday.')
      : wkDone() ? el('div', { class: 'sx-claim' }, el('p', {}, 'All done! Pick your pay:'), el('div', { class: 'sx-row-l' },
        el('button', { type: 'button', class: 'btn sx-buy', onclick: () => wkClaim('dust') }, '✦ ' + Math.round(E.quests.contract * INCOME)), el('button', { type: 'button', class: 'btn sx-buy', onclick: () => wkClaim('kp') }, E.quests.contractKnowledge + ' Knowledge'), el('button', { type: 'button', class: 'btn sx-buy', onclick: () => wkClaim('item') }, 'A Rare find')))
        : el('p', { class: 'sl-muted' }, 'Finish all three this week (resets Monday).'));
  leftCol.replaceChildren(
    sec('Distress Run', drBox, drInfo), expSec, dlSec, mwSec, wkSec,
    sec('Bounties', ...qs, el('p', { class: 'sl-muted' }, S.bDone + ' completed so far')),
    CAMP ? sec(CAMP.title || 'Campaign', el('div', { class: 'sx-camp-bar' }, el('i', { style: 'width:' + Math.round(S.camp.n / CAMP.logs.length * 100) + '%' })),
      el('p', {}, campDone() ? 'Complete. All ' + CAMP.logs.length + ' logs recovered.' : 'Log ' + S.camp.n + ' of ' + CAMP.logs.length + (S.camp.n ? '. ' + actOf(S.camp.n) : '. A trail of old log beacons left by the lost survey ship Meridian.')),
      campDone() ? null : campaigning() ? el('p', { class: 'sl-muted' }, 'Following the trail next session. ', el('button', { type: 'button', class: 'sl-link', disabled: (running && mode === 'focus') || null, onclick: () => { S.mission = 0; save(); hint.textContent = ''; draw(); } }, 'Stop'))
        : el('button', { type: 'button', class: 'sl-link', disabled: (running && mode === 'focus') || !!S.dr || null, onclick: () => setMission('campaign') }, S.camp.n ? 'Continue next session' : 'Start the campaign next session'),
      S.camp.n ? el('div', {}, el('button', { type: 'button', class: 'sl-link sx-readlogs', onclick: () => { rightTab = 'tx'; txFilter = 'camp'; drawRight(); } }, 'Read the logs')) : null) : null,
    sec('Interplanetary Coordinator', el('p', {}, S.coord ? 'Charged. Next Explore, every chip counts double.' : 'Empty. One study session of Charge doubles your chips for the next Explore.'),
      el('p', { class: 'sl-muted' }, chipsPut() + ' of ' + S.chips.own + ' chips placed' + (chipsPut() ? ': ' + CHIP_F.filter(f => S.chips.put[f[0]]).map(f => f[1] + ' ' + S.chips.put[f[0]]).join('  ') : '.')),
      el('div', { class: 'sx-row-l' }, coordB, el('button', { type: 'button', class: 'sl-link', onclick: () => { rightTab = 'coord'; drawRight(); } }, 'Open the panel'))));
}
