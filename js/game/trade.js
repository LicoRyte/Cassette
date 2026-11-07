/* Solarist: Trade Stations: buy, swap and sell collectibles. */
'use strict';

// Trade Stations: sometimes one is docked at the world you reach. It sells collectibles, swaps them for ones it wants,
// and buys your spares. It leaves when you travel on.
const TRADERS = ['The Wandering Bazaar', 'Kessa Freeport', 'The Rusty Ledger', 'Station Halfway', 'The Collector\'s Barge', 'Moonlight Exchange', 'The Last Stop Market', 'Brother Ilo\'s Curio Shop', 'The Orbit Swap', 'Dockside Antiques', "The Lucky Magpie", "Grandma Tova's Odds and Ends", "Sector Seven Swap Meet", "The Floating Pawnshop", "Copperhead Trading Co.", "The Velvet Hold", "Old Man Ruskin's Barge", "The Midnight Bazaar", "The Tin Lantern", "Odessa's Odds", "The Crossroads Cart", "Galactic Flea Market", "The Patchwork Barge", "Mother Kessa's Pantry", "The Pocketful Market", "Uncle Vey's Bargain Bin", "The Last Coin"];
const TPRICE = r => Math.round(E.tradeStation.prices[r] || 100);
const buyDisc = () => 1 - Math.min(.3, .1 * crewN('Trader'));
function loseItem(id) { const it = S.items[id]; if (!it) return; it.n -= 1; if (it.n <= 0) delete S.items[id]; }
function makeTrader(p) {
  const stock = [], seen = new Set();
  for (let k = 0; k < 16 && stock.length < 4 + Math.floor(roomPow('hold')); k++) { const it = rollItem(p, true, 'trade'); if (seen.has(it.id)) continue; seen.add(it.id); stock.push({ id: it.id, price: Math.round(TPRICE(it.rar) * (.85 + Math.random() * .3) * buyDisc()) }); }
  const owned = Object.keys(S.items).filter(k => itemName(k) !== '???').sort((a, b) => S.items[b].n - S.items[a].n), wants = [];
  owned.slice(0, 6).sort(() => Math.random() - .5).slice(0, 2).forEach(want => {
    const r = parseId(want).r, up = ITEM_RARS[Math.min(3, ITEM_RARS.indexOf(r) + (Math.random() < .35 ? 1 : 0))];
    for (let k = 0; k < 30; k++) { const it = rollItem(p, true, 'trade'); if (it.rar === up && !S.items[it.id] && !seen.has(it.id)) { seen.add(it.id); wants.push({ want, give: it.id }); break; } }
  });
  S.trader = { num: p.num, name: TRADERS[Math.floor(Math.random() * TRADERS.length)], stock, wants, at: Date.now() };
  S.cnt.traders = (S.cnt.traders || 0) + 1;
}
function tradeLog(t) { pushEv({ ic: '🏪', title: S.trader.name, t, at: Date.now() }); }
function traderBuy(i) { const o = S.trader.stock[i]; if (!o || S.dust < o.price) return; S.dust -= o.price; const nw = gainItem({ id: o.id }, byNum(S.trader.num) && byNum(S.trader.num).p); if (nw) award(0, 12); award(5, 0); S.trader.stock.splice(i, 1); S.cnt.bought = (S.cnt.bought || 0) + 1; tradeLog('Bought ' + itemName(o.id) + ' for ✦ ' + o.price + '.'); shopXP(0); save(); draw(); }
function traderSwap(i) { const w = S.trader.wants[i]; if (!w || !S.items[w.want]) return; loseItem(w.want); const nw = gainItem({ id: w.give }, byNum(S.trader.num) && byNum(S.trader.num).p); if (nw) award(0, 12); award(8, 0); S.trader.wants.splice(i, 1); S.cnt.swaps = (S.cnt.swaps || 0) + 1; tradeLog('Swapped ' + itemName(w.want) + ' for ' + itemName(w.give) + '.'); shopXP(0); save(); draw(); }
const spareP = id => Math.round(TPRICE(parseId(id).r) * E.tradeStation.sellRatio * INCOME * (1 + .05 * roomPow('hold')) * (hasT('eco4') ? 1.25 : 1) * stSell());
function traderSell(id) { const it = S.items[id]; if (!it || it.n < 2) return; const v = spareP(id); loseItem(id); S.dust += v; S.dustTotal += v; S.cnt.spares = (S.cnt.spares || 0) + 1; save(); draw(); }
