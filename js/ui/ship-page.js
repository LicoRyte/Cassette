/* Solarist: The Ship page. */
'use strict';

/* ---------- the Ship tab: Coordinator, Listening Posts and all their transmissions in one place ---------- */
let shipTab = 'Ship', facPost = 0;
function drawShip() {
  const group = (title, ...kids) => el('fieldset', { class: 'sl-group' }, el('legend', {}, title), ...kids);
  const cm = curMission(), b = building(), locked = running && mode === 'focus';
  const next = cm === 'expedition' && atP() ? (gasWorld(atP()) ? '🎈 Cloud dive into ' : '🗺 Explore ') + nm(atP()) + ' (' + EX_PARTS[exOf(atP()).step].toLowerCase() + ')' : cm === 'salvage' && derelictHere() ? '🛸 Salvage ' + atP().derelict.ship : cm === 'build' && b ? (b.k === 'upgrade' ? '🏘 ' : b.k === 'add' ? FAC[b.fac][0] + ' ' : b.k === 'node' ? '' : b.k === 'room' ? ROOMS[b.fac][0] + ' ' : '🗼 ') + jobText(b) : cm === 'explore' && heldP() ? '⚔ Fight ' + heldP().outlaw.gang + ' on ' + nm(heldP()) : cm === 'charge' ? '🧭 Charge the Interplanetary Coordinator' : S.coord ? '🚀 Explore (lucky, Coordinator charged)' : '🚀 Explore a new world';
  const bounties = group('🎯 Bounties', el('p', { class: 'sl-muted' }, 'Finish one and a new one takes its place. ' + S.bDone + ' completed so far.'),
    el('div', { class: 'sl-posts' }, S.bounties.map(b => el('div', { class: 'sl-post' }, el('span', { class: 'sl-mod-i' }, '🎯'), el('span', { class: 'sl-row-t' }, el('b', {}, b.t), el('small', {}, b.k === 'sessions' ? (b.prog || 0) + ' / ' + b.v + ' done' : b.k === 'cycle' ? 'finish every session and break of a cycle' : 'on any Explore trip')), el('span', { class: 'sl-reward' }, '✦ ' + Math.round(b.reward * INCOME))))));
  const recRows = REC.filter(([k]) => S.rec[k]).map(([k, ic, label, , f]) => { const r = S.rec[k], fw = byNum(r.num); return el('tr', {}, el('td', {}, ic + ' ' + label), el('td', {}, f(r.v)), el('td', {}, fw ? el('button', { type: 'button', class: 'sl-link', onclick: () => { tab('log'); openWorld(r.num); } }, nm(fw.p)) : '')); });
  if (S.rec.dayN) recRows.unshift(el('tr', {}, el('td', {}, '📅 Most sessions in a day'), el('td', {}, String(S.rec.dayN.v)), el('td', {}, new Date(S.rec.dayN.date).toLocaleDateString())));
  const records = group('🏆 Records', recRows.length ? el('table', { class: 'sl-rec' }, el('tbody', {}, recRows)) : el('p', { class: 'sl-muted' }, 'No records yet. Find some worlds.'));
  const rank = group('⭐ Captain & 📚 Knowledge', el('p', { class: 'sl-muted' }, 'XP comes from everything that moves the game forward: trips, building, upgrades, fights, expeditions, bounties and Full Cycles. Knowledge comes from what you learn: transmissions, logs, events, survey logs and new collectibles. Every 10 levels earns a new title.'),
    lvMsg && Date.now() - lvMsgAt < 10000 ? el('p', { class: 'sl-lv-msg' }, lvMsg) : null, lvBar('xp', '⭐', CAPT, true), lvBar('kn', '📚', KNOW, true));
  const drGroup = group('🆘 Distress Run', el('p', {}, S.dr ? 'In progress: ' + DISTRESS[S.dr.sc][1] + ', Act ' + roman(S.dr.n + 1) + ' of ' + roman(S.dr.need) + '.' : S.drDay === today() ? 'Today\'s run is used up. A new distress call comes in tomorrow.' : S.fcDay === today() ? 'Available at the start of your next cycle (right after a long break).' : 'Earn a ★ Full Cycle today (no skipping for a whole cycle) and a distress call comes in when the long break ends.'),
    el('p', { class: 'sl-muted' }, 'Once a day: a whole cycle of study sessions with no other missions, for about ✦ ' + E.distressRun.base + '–' + (E.distressRun.base + E.distressRun.random) + ', a random bonus, 250 XP and 120 Knowledge. ' + (S.drN || 0) + ' completed so far.'));
  const rtNow = rating(), parts = {};
  RATING.forEach(([g, what, per, f]) => { let n = 0; try { n = f() || 0; } catch (e) { } (parts[g] = parts[g] || []).push([what, n, per * n]); });
  const rtGroup = group('◆ Rating', el('p', { class: 'sl-muted' }, 'One number for how far you have come. Everything counts: every session, world, build, find, quest and medal. It only goes up while you keep playing.'), rtBar(true),
    el('div', { class: 'sx-ranks' }, RANKS.map(([at, name], k) => el('span', { class: rtNow >= at ? 'on' : '' }, el('b', {}, name), el('small', {}, at.toLocaleString())))),
    ...Object.keys(parts).map(g => el('table', { class: 'sl-rec sl-stats sx-rtab' }, el('thead', {}, el('tr', {}, el('th', {}, g), el('th', {}, ''), el('th', {}, parts[g].reduce((a, x) => a + x[2], 0).toLocaleString()))),
      el('tbody', {}, parts[g].filter(x => x[1]).map(([what, n, pts]) => el('tr', {}, el('td', {}, what), el('td', {}, '×' + n.toLocaleString()), el('td', {}, pts.toLocaleString())))))));
  const quests = group('🗺 Quests', el('table', { class: 'sl-rec sl-stats' }, el('tbody', {}, [['Worlds fully explored', S.expDone || 0], ['Points of Interest', S.cnt.poi || 0], ['Derelicts salvaged', S.cnt.salvage || 0], ['Expedition legs', S.cnt.expSteps || 0], ['Guild contracts paid', S.cnt.wk || 0], ['Most Wanted caught', S.mwDone || 0], ['Deliveries', (S.dl && S.dl.done) || 0], ['Distress Runs', S.drN || 0]].map(([a, b]) => el('tr', {}, el('td', {}, a), el('td', {}, String(b)))))));
  const SUB = { Ship: shipView(group), Captain: [rtGroup, rank], Medals: medalsView(group), Crew: crewView(group), Goals: [quests, drGroup, bounties, records], Stats: statsView(group) };
  if (!SUB[shipTab]) shipTab = 'Ship';
  const subBtns = Object.keys(SUB).map(k => el('button', { type: 'button', role: 'tab', class: 'sl-stab', 'aria-selected': String(k === shipTab), onclick: () => { shipTab = k; drawShip(); } }, k));
  shipPane.replaceChildren(el('div', { class: 'sl-stabs sl-shiptabs', role: 'tablist' }, subBtns), el('div', { class: 'sl-subpane' }, SUB[shipTab]));
}
