/* Solarist: Pages and tabs: puts every part of the screen together. */
'use strict';

const status = el('span', { class: 'sx-cap' }), status2 = el('span', { hidden: true });
const timeBlock = el('div', { class: 'sx-clock' }, screen, cycleBar, status);
const midCol = el('section', { class: 'sx-mid' }, nameBox, planetSpot, pvBar, timeBlock, mission, el('div', { class: 'sl-btns' }, startB, resetB, skipB), hint, reportBtn);
settings.open = true;
const appSettings = el('div', { class: 'sx-appset' });
const settingsPane = el('div', { class: 'sl-pane', hidden: true },
  sec('Timer', settings), sec('Your save', saveTools()), sec('Switch the timer by hand', el('p', { class: 'sl-muted' }, 'Normally Solarist moves between study and breaks for you.'), el('div', { class: 'sl-modes' }, modeBtns)), sec('App', appSettings));
const find = el('input', { type: 'search', class: 'sl-find', placeholder: 'Search worlds...', 'aria-label': 'Search your logbook' });
const typeSel = el('select', { 'aria-label': 'Planet class' }, el('option', { value: '' }, 'All classes'), el('option', { value: '@post' }, 'With a Listening Post'), ...Object.keys(TYPES).map(t => el('option', { value: t }, t)));
const rarSel = el('select', { 'aria-label': 'Rarity' }, el('option', { value: '' }, 'Any rarity'), ...RARITY.map(([k]) => el('option', { value: k }, k)));
const logHead = el('div', { class: 'sl-ahead' });
const logList = el('div', { class: 'sl-list' });
const logPane = el('div', { class: 'sl-pane', hidden: true }, logHead, el('div', { class: 'sl-tools' }, typeSel, rarSel, find), logList);
const shipPane = el('div', { class: 'sl-pane', hidden: true });
const itemsPane = el('div', { class: 'sl-pane', hidden: true });
const tabItems = el('button', { type: 'button', onclick: () => tab('items') }, 'Collection');
const tabSet = el('button', { type: 'button', onclick: () => tab('settings') }, 'Settings');
// clean view: hide the quest and resource panels (levels, pages, timer and controls stay)
let clean = false; try { clean = localStorage.getItem('solarist-clean') === '1'; } catch (e) { }
const cleanB = el('button', { type: 'button', class: 'sx-cleanb', title: 'Hide or show the side panels (H)' });
function setClean(v) { clean = v; root.classList.toggle('sx-clean', v); cleanB.replaceChildren(v ? '◨' : '◧', el('span', { class: 'sx-cleant' }, v ? ' Show panels' : ' Hide panels')); cleanB.setAttribute('aria-label', v ? 'Show panels' : 'Hide panels'); cleanB.setAttribute('aria-pressed', String(v)); try { localStorage.setItem('solarist-clean', v ? '1' : '0'); } catch (e) { } }
cleanB.addEventListener('click', () => setClean(!clean)); setClean(clean);
const tabMap = el('button', { type: 'button', onclick: () => tab('map') }, 'Star map');
const mapPane = el('div', { class: 'sl-pane sx-mappane', hidden: true });
const pageTitle = el('h2', { class: 'sx-page-t' });
const page = el('div', { class: 'sx-page', hidden: true },
  el('div', { class: 'sx-page-h' }, pageTitle, el('button', { type: 'button', class: 'btn', onclick: () => tab('timer') }, 'Back to the voyage')),
  el('div', { class: 'sl-body' }, logPane, shipPane, itemsPane, mapPane, settingsPane));
[tabTimer, tabLog, tabShip].forEach(b => b.removeAttribute('role'));
root.classList.add('sx');
root.replaceChildren(el('header', { class: 'sx-top' }, lvStrip, el('nav', { class: 'sx-nav', 'aria-label': 'Pages' }, cleanB, tabLog, tabMap, tabShip, tabItems, tabSet)), leftCol, midCol, rightCol, feedLine, report, page, el('div', { hidden: true }, tabTimer, status2));
function tab(t) {
  if (t === 'log' && !logPane.hidden && !page.hidden) openNum = null; // pressing Logbook again goes back to the grid
  const names = { log: 'Logbook', ship: 'Ship', items: 'Collection', settings: 'Settings', map: 'Star map' };
  page.hidden = t === 'timer'; pageTitle.textContent = names[t] || '';
  [[tabLog, 'log'], [tabMap, 'map'], [tabShip, 'ship'], [tabItems, 'items'], [tabSet, 'settings']].forEach(([b, k]) => { if (k === t) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  logPane.hidden = t !== 'log'; shipPane.hidden = t !== 'ship'; itemsPane.hidden = t !== 'items'; settingsPane.hidden = t !== 'settings'; mapPane.hidden = t !== 'map';
  root.classList.toggle('paged', t !== 'timer');
  if (t === 'ship') drawShip();
  if (t === 'items') drawItems();
  if (t === 'log') drawLog();
  if (t === 'map') drawMap();
  if (t === 'settings' && hooks.settings) hooks.settings(appSettings);
  if (t !== 'timer') { const bd = root.querySelector('.sl-body'); if (bd && t !== 'log') bd.scrollTop = 0; }
}
