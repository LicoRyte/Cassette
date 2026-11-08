/* Solarist: Rating: one number that only goes up as you play. */
'use strict';

// ---------- Rating: one number that only goes up as you play ----------
const RATING = [ // [group, what, points each, how many]
  ['Study', 'Study sessions', 10, () => S.total], ['Study', 'Minutes studied', 1, () => S.minutes], ['Study', 'Full Cycles', 20, () => S.cnt.fc],
  ['Exploration', 'Common worlds', 5, () => S.cnt.rar.Common || 0], ['Exploration', 'Uncommon worlds', 12, () => S.cnt.rar.Uncommon || 0], ['Exploration', 'Rare worlds', 30, () => S.cnt.rar.Rare || 0], ['Exploration', 'Legendary worlds', 80, () => S.cnt.rar.Legendary || 0],
  ['Exploration', 'Points of Interest', 10, () => (S.surveys || 0) + (S.cnt.poi || 0)], ['Exploration', 'Deep-space events', 5, () => S.cnt.ev], ['Exploration', 'Arrival encounters', 10, () => S.cnt.enc],
  ['Adventure', 'Outlaw gangs beaten', 25, () => S.fights || 0], ['Adventure', 'Bounties', 30, () => S.bDone || 0], ['Adventure', 'Distress Runs', 120, () => S.drN || 0], ['Adventure', 'Expedition parts', 20, () => S.cnt.expSteps || 0],
  ['Adventure', 'Worlds fully explored', 200, () => S.expDone || 0], ['Adventure', 'Guild contracts', 250, () => S.cnt.wk || 0], ['Adventure', 'Most Wanted caught', 300, () => S.mwDone || 0], ['Adventure', 'Deliveries', 40, () => (S.dl && S.dl.done) || 0], ['Adventure', 'Meridian chapter parts', 15, () => (S.cnt.oldLogs || 0) + S.story.log.length],
  ['Building', 'Listening Posts', 40, () => posts().length], ['Building', 'Travelers\' Posts', 80, () => posts().filter(f => f.p.post.tp).length], ['Building', 'Post Culture (best)', 15, () => S.cnt.cultureBest || 0], ['Exploration', 'Anomalies solved', 60, () => S.cnt.inv || 0], ['Exploration', 'Hyperdrive jumps', 10, () => S.cnt.jumps || 0], ['Building', 'Hyperdrive Nodes (retired)', 30, () => S.cnt.nodes || 0], ['Exploration', 'Interplanetary Stations found', 100, () => S.cnt.stations || 0], ['Adventure', 'Station shifts', 15, () => S.cnt.shifts || 0], ['Exploration', 'Museum donations', 5, () => S.cnt.donated || 0], ['Building', 'Facility slots bought', 20, () => S.cnt.slots || 0], ['Building', 'Facility levels', 15, () => posts().reduce((a, f) => a + (f.p.post.tp ? f.p.post.tp.fac.reduce((b, x) => b + (x.lv || 1), 0) : 0), 0)],
  ['Building', 'Decorations owned', 12, () => decOwned()], ['Building', 'Ship room levels', 30, () => Object.keys(ROOMS).reduce((a, k) => a + roomLv(k), 0)], ['Building', 'Ship module upgrades', 8, () => Object.keys(MODS).reduce((a, k) => a + lvl(k) - 1, 0)], ['Building', 'Crew aboard', 25, () => S.crew.length], ['Building', 'Coordinator chips', 30, () => S.chips.own],
  ['Knowledge', 'Research done', 50, () => Object.keys(S.tech).length], ['Knowledge', 'Common collectibles', 3, () => itemsOf('Common')], ['Knowledge', 'Uncommon collectibles', 6, () => itemsOf('Uncommon')], ['Knowledge', 'Rare collectibles', 15, () => itemsOf('Rare')],
  ['Knowledge', 'Legendary collectibles', 40, () => itemsOf('Legendary')], ['Knowledge', 'Medals', 20, () => Object.keys(S.ach).length],
];
const itemsOf = r => Object.keys(S.items).filter(k => parseId(k).r === r && itemName(k) !== '???').length;
const rating = () => RATING.reduce((a, [, , per, f]) => { try { return a + per * (f() || 0); } catch (e) { return a; } }, 0);
const RANKS = ['Stowaway', 'Deckhand', 'Drifter', 'Wayfarer', 'Surveyor', 'Pathfinder', 'Voyager', 'Star Captain', 'Trailblazer', 'Living Legend', 'Myth of the Void'].map((n, i) => [i ? Math.max(1, Math.round(E.ratingRanks[i] || 0)) : 0, n]); // Rating needed for each rank (economy.json ratingRanks)
const rankOf = v => { let i = 0; while (i + 1 < RANKS.length && v >= RANKS[i + 1][0]) i++; return i; };
let rt0 = 0; // the rating when this session ended, before its rewards
wkCheck();
