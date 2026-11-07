/* Solarist: Where the ship is, save defaults, and the collectibles you own. */
'use strict';

// where the ship is right now: the last world you reached. Its expedition runs from here.
if (!S.items) S.items = {};
if (S.at == null && S.found.length) S.at = S.found[S.found.length - 1].p.num;
if (!S.nextNum) S.nextNum = S.found.reduce((m, f) => Math.max(m, f.p.num), 0) + 1; // numbers keep counting up even after selling
if (!S.sold) S.sold = { n: 0, dust: 0, ly: 0 };
if (S.txSeen == null) S.txSeen = Date.now();
if (!S.cnt) { // lifetime counters for the Stats page, seeded from what's already in the save
  const key = t => { const x = new Date(t); return x.getFullYear() + '-' + x.getMonth() + '-' + x.getDate(); };
  S.cnt = { rar: {}, lucky: 0, outlaws: 0, enc: 0, ev: (S.events || []).filter(e => e.ic !== '⚔').length, fc: 0, charge: 0, days: new Set(S.found.map(f => key(f.at))).size || (S.total ? 1 : 0), hiDist: 0 };
  if (S.found.some(f => key(f.at) === key(Date.now()))) S.cnt.lastDay = today();
  S.found.forEach(({ p }) => { S.cnt.rar[p.rarity] = (S.cnt.rar[p.rarity] || 0) + 1; if (p.lucky) S.cnt.lucky++; if (p.outlaw) S.cnt.outlaws++; if (p.enc) S.cnt.enc++; });
}
const atP = () => { const f = S.at && byNum(S.at); return f ? f.p : null; };
// the old material × object collection becomes the same number of new items, of the same rarity
const OLD_FORM_R = { Shard: 'Common', Nugget: 'Common', Coin: 'Common', Marble: 'Common', Dice: 'Common', Ring: 'Uncommon', Gear: 'Uncommon', Key: 'Uncommon', Bell: 'Uncommon', Arrowhead: 'Uncommon', Lens: 'Rare', Locket: 'Rare', Compass: 'Rare', Figurine: 'Rare', Idol: 'Legendary', 'Music Box': 'Legendary' };
Object.keys(S.items).filter(k => k.includes('|')).forEach(k => {
  const old = S.items[k], rar = OLD_FORM_R[k.split('|')[1]] || 'Common'; let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const id = rar + ':' + (h % ITEMS[rar].length); delete S.items[k];
  S.items[id] = S.items[id] ? Object.assign(S.items[id], { n: S.items[id].n + old.n }) : old;
});
function gainItem(it, fromP) {
  const k = it.id, cur = S.items[k];
  S.items[k] = cur ? Object.assign(cur, { n: cur.n + 1 }) : { n: 1, at: Date.now(), from: fromP ? fromP.num : 0 };
  return !cur; // true = new to the collection
}
const itemCount = () => Object.keys(S.items).filter(k => itemName(k) !== '???').length;
const posts = () => S.found.filter(f => f.p.post);
