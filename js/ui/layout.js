/* Solarist: Pages and tabs: puts every part of the screen together.
   The planet fills the middle of the screen. The timer is an instrument panel in the top-left corner, under the levels;
   on breaks, what happened sits under it and what next on the right. While you study, only the planet and the timer stay. Pages: Atlas, Journal, Ship, Settings. */
'use strict';

const status = el('span', { class: 'sx-cap' }), status2 = el('span', { hidden: true });
const timeBlock = el('div', { class: 'sx-clock' }, screen, cycleBar, status);
const midCol = el('section', { class: 'sx-mid' }, nameBox, planetSpot, pvBar);
// the timer panel, as wide as the level bars above it: a status line, the time, one bar per study session of the cycle
// (two by two), then Start/Pause and Reset side by side. Skipping is the S key, or Settings.
const cmdBar = el('div', { class: 'sx-cmd' }, startB, resetB);
const corner = el('section', { class: 'sx-corner', 'aria-label': 'Timer' }, timeBlock, cmdBar, hint);
// the break panel: js/ui/breakpanel.js fills it
const bpNotes = el('div', { class: 'sx-bp-notes' });
const bpStoryH = el('h3', { class: 'sx-bp-h' }, 'What happened');
const bpStory = el('div', { class: 'sx-bp-story' }, encBox, trans, card, reportSide, learnBox);
const bpCards = el('div', { class: 'sx-cards', role: 'radiogroup', 'aria-label': 'Next study session' });
const bpDetail = el('div', { class: 'sx-bp-detail' });
const storyPanel = el('aside', { class: 'sx-storyp', 'aria-label': 'What happened' }, bpStoryH, bpStory);
const breakPanel = el('aside', { class: 'sx-breakp', 'aria-label': 'What next' }, bpNotes, el('h3', { class: 'sx-bp-h' }, 'What next?'), bpCards, bpDetail);
settings.open = true;
const appSettings = el('div', { class: 'sx-appset' });
const settingsPane = el('div', { class: 'sl-pane', hidden: true },
  sec('Timer', settings), sec('Your save', saveTools()), sec('Switch the timer by hand', el('p', { class: 'sl-muted' }, 'Normally Solarist moves between study and breaks for you.'), el('div', { class: 'sl-modes' }, modeBtns)), sec('App', appSettings));
const find = el('input', { type: 'search', class: 'sl-find', placeholder: 'Search worlds...', 'aria-label': 'Search your logbook' });
const typeSel = el('select', { 'aria-label': 'Planet class' }, el('option', { value: '' }, 'All classes'), el('option', { value: '@fav' }, '★ Favourites'), ...Object.keys(TYPES).map(t => el('option', { value: t }, t)));
const rarSel = el('select', { 'aria-label': 'Rarity' }, el('option', { value: '' }, 'Any rarity'), ...RARITY.map(([k]) => el('option', { value: k }, k)));
const logHead = el('div', { class: 'sl-ahead' });
const logList = el('div', { class: 'sl-list' });
const logPane = el('div', { class: 'sl-pane', hidden: true }, logHead, el('div', { class: 'sl-tools' }, typeSel, rarSel, find), logList);
const shipPane = el('div', { class: 'sl-pane', hidden: true });
const itemsPane = el('div', { class: 'sl-pane', hidden: true });
const mapPane = el('div', { class: 'sl-pane sx-mappane', hidden: true });
const journalPane = el('div', { class: 'sl-pane sx-journal', hidden: true }, rightCol);
// the top bar: Atlas (worlds, map, collection), Journal (every log), Ship, Settings
let atlasSub = 'log';
const tabAtlas = el('button', { type: 'button', onclick: () => tab(atlasSub) }, 'Atlas');
const tabJournal = el('button', { type: 'button', onclick: () => tab('journal') }, 'Journal');
const tabSet = el('button', { type: 'button', onclick: () => tab('settings') }, 'Settings');
const tabItems = el('button', { type: 'button', hidden: true }), tabMap = el('button', { type: 'button', hidden: true }); // (old names other files still touch)
const atlasNav = el('div', { class: 'sl-stabs sx-atlasnav', role: 'tablist' }, [['log', 'Worlds'], ['map', 'Map'], ['items', 'Collection']].map(([k, label]) =>
  el('button', { type: 'button', role: 'tab', class: 'sl-stab', 'data-k': k, onclick: () => tab(k) }, label)));
// H hides the break panel too (the old "hide panels")
let clean = false;
function setClean(v) { clean = v; root.classList.toggle('sx-nopanel', v); }
const pageTitle = el('h2', { class: 'sx-page-t' });
const page = el('div', { class: 'sx-page', hidden: true },
  el('div', { class: 'sx-page-h' }, pageTitle, el('button', { type: 'button', class: 'btn', onclick: () => tab('timer') }, 'Back to the voyage')),
  atlasNav, el('div', { class: 'sl-body' }, logPane, shipPane, itemsPane, mapPane, journalPane, settingsPane));
[tabTimer, tabLog, tabShip].forEach(b => b.removeAttribute('role'));
root.classList.add('sx', 'sx-v2');
root.replaceChildren(el('header', { class: 'sx-top' }, lvStrip, el('nav', { class: 'sx-nav', 'aria-label': 'Pages' }, tabAtlas, tabJournal, tabShip, tabSet)), midCol, el('div', { class: 'sx-rail' }, corner, storyPanel), breakPanel, report, page,
  el('div', { hidden: true }, skipB, tabTimer, tabLog, tabItems, tabMap, status2, leftCol, feedLine, mission, reportBtn));
function tab(t) {
  if (t === 'log' && !logPane.hidden && !page.hidden) openNum = null; // pressing Worlds again goes back to the grid
  const atlas = t === 'log' || t === 'map' || t === 'items'; if (atlas) atlasSub = t;
  const names = { log: 'Atlas', map: 'Atlas', items: 'Atlas', ship: 'Ship', settings: 'Settings', journal: 'Journal' };
  page.hidden = t === 'timer'; pageTitle.textContent = names[t] || '';
  [[tabAtlas, atlas], [tabJournal, t === 'journal'], [tabShip, t === 'ship'], [tabSet, t === 'settings']].forEach(([b, on]) => { if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  atlasNav.hidden = !atlas; atlasNav.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.k === t)));
  logPane.hidden = t !== 'log'; shipPane.hidden = t !== 'ship'; itemsPane.hidden = t !== 'items'; settingsPane.hidden = t !== 'settings'; mapPane.hidden = t !== 'map'; journalPane.hidden = t !== 'journal';
  root.classList.toggle('paged', t !== 'timer');
  if (t === 'ship') drawShip();
  if (t === 'items') drawItems();
  if (t === 'log') drawLog();
  if (t === 'map') drawMap();
  if (t === 'journal') { rightTab = 'tx'; drawRight(); }
  if (t === 'settings' && hooks.settings) hooks.settings(appSettings);
  if (t !== 'timer') { const bd = root.querySelector('.sl-body'); if (bd && t !== 'log') bd.scrollTop = 0; }
}
