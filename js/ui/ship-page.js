/* Solarist: The Ship page. */
'use strict';

/* ---------- the Ship page: your ship, your levels, achievements, crew, discoveries and stats ---------- */
let shipTab = 'Crew';
function drawShip() {
  const group = (title, ...kids) => el('fieldset', { class: 'sl-group' }, el('legend', {}, title), ...kids);
  const recRows = REC.filter(([k]) => S.rec[k]).map(([k, ic, label, , f]) => { const r = S.rec[k], fw = byNum(r.num); return el('tr', {}, el('td', {}, ic + ' ' + label), el('td', {}, f(r.v)), el('td', {}, fw ? el('button', { type: 'button', class: 'sl-link', onclick: () => { tab('log'); openWorld(r.num); } }, nm(fw.p)) : '')); });
  if (S.rec.dayN) recRows.unshift(el('tr', {}, el('td', {}, '📅 Most sessions in a day'), el('td', {}, String(S.rec.dayN.v)), el('td', {}, new Date(S.rec.dayN.date).toLocaleDateString())));
  const records = group('🏆 Records', recRows.length ? el('table', { class: 'sl-rec' }, el('tbody', {}, recRows)) : el('p', { class: 'sl-muted' }, 'No records yet. Find some worlds.'));
  const rank = group('⭐ Captain & 📚 Knowledge', el('p', { class: 'sl-muted' }, 'XP comes from everything that moves the voyage forward: trips, expeditions, salvage, the Meridian and Full Cycles. Knowledge comes from what you learn: logs, events, survey logs, anomalies and new collectibles. Every 10 levels earns a new title.'),
    lvMsg && Date.now() - lvMsgAt < 10000 ? el('p', { class: 'sl-lv-msg' }, lvMsg) : null, lvBar('xp', '⭐', CAPT, true), lvBar('kn', '📚', KNOW, true));
  const found = group('🗺 Discoveries', el('table', { class: 'sl-rec sl-stats' }, el('tbody', {}, [['Worlds fully explored', S.expDone || 0], ['Points of Interest', S.cnt.poi || 0], ['Anomalies solved', S.cnt.inv || 0], ['Mysteries solved', S.cnt.mysSolved || 0], ['✨ Wonders', Object.keys(S.wonders || {}).length], ['Derelicts salvaged', S.cnt.salvage || 0], ['Expedition parts', S.cnt.expSteps || 0]].map(([a, b]) => el('tr', {}, el('td', {}, a), el('td', {}, String(b)))))));
  const SUB = { Crew: () => crewView(group), Ship: () => shipView().concat(shipGearView()), };
  if (!SUB[shipTab]) shipTab = 'Crew';
  const subBtns = Object.keys(SUB).map(k => el('button', { type: 'button', role: 'tab', class: 'sl-stab', 'aria-selected': String(k === shipTab), onclick: () => { shipTab = k; drawShip(); } }, k));
  shipPane.replaceChildren(el('div', { class: 'sl-stabs sl-shiptabs', role: 'tablist' }, subBtns), el('div', { class: 'sl-subpane' }, SUB[shipTab]()));
}
