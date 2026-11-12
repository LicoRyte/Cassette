/* Solarist: Traders. Now and then someone who trades turns up (content/traders.json): a passing traveler, locals,
   a whole civilization. They might offer a swap (you choose on the Here card), give you something, or a crew member
   might give something of theirs away. Everything is words: losing a thing is a small story, never a punishment. */
'use strict';

const tradeable = id => { const it = itemById(id); return !!it && (it.kind === 'clothing' || it.kind === 'equipment'); };
// everything you own that could change hands: [{ id, who (a person, or null for the stash), slot }]
function ownedThings() {
  const out = S.stash.filter(tradeable).map(id => ({ id, who: null, slot: null }));
  [S.me].concat(S.crew).forEach(p => SLOT_KEYS.concat('gear').forEach(slot => { if (p[slot] && tradeable(p[slot])) out.push({ id: p[slot], who: p, slot }); }));
  return out;
}
const personById = id => [S.me].concat(S.crew).find(p => p.id === id) || null;
function takeThing(t) { // remove one owned thing from wherever it is
  if (t.who) { if (t.who[t.slot] === t.id) t.who[t.slot] = ''; } else { const i = S.stash.indexOf(t.id); if (i >= 0) S.stash.splice(i, 1); }
}
function tradeCtx(p, def, want, give, who) {
  const w = want && itemById(want), g = give && itemById(give), people = S.crew.length ? S.crew : [S.me];
  const c = who || people[Math.floor(Math.random() * people.length)];
  return Object.assign(worldCtx(p), { trader: { name: def.name, plural: !!def.plural }, crew: personCtx(c), want: w ? { name: w.name, tags: w.tags } : null, give: g ? { name: g.name, tags: g.tags } : null });
}
// someone who trades turns up on world p; reps: the session report
function meetTrader(p, reps) {
  const defs = (TEXT.traders || []).filter(d => txFits(d, worldCtx(p))); if (!defs.length || p.trade) return;
  const def = defs[Math.floor(Math.random() * defs.length)], mine = ownedThings();
  const liked = mine.filter(t => (itemById(t.id).tags || []).some(tag => (def.wants || []).includes(tag)));
  const want = liked.length ? liked[Math.floor(Math.random() * liked.length)] : mine[Math.floor(Math.random() * mine.length)];
  const have = new Set(mine.map(t => t.id)), kind = want ? itemById(want.id).kind : Math.random() < .5 ? 'clothing' : 'equipment';
  const fresh = txItems(kind).filter(it => !have.has(it.id)), gi = fresh.length ? fresh[Math.floor(Math.random() * fresh.length)] : txRandomItem(Math.random, kind);
  const roll = Math.random(), how = !want ? 'gift' : roll < .6 ? 'offer' : roll < .85 ? 'gift' : 'lose';
  const ctx = tradeCtx(p, def, want && want.id, gi && gi.id, want && want.who);
  S.cnt.traders = (S.cnt.traders || 0) + 1;
  let t, got = null;
  if (how === 'offer') {
    t = txLine('trade_offer', ctx);
    p.trade = { tr: def.id, ic: def.ic, name: def.name, plural: !!def.plural, want: want.id, owner: want.who ? want.who.id : null, slot: want.slot, give: gi.id, t };
    got = '↔ Swap or keep it: their waypoint is on the planet';
  } else if (how === 'gift' && gi) {
    t = txLine('trade_gift', ctx); S.stash.push(gi.id); S.cnt.gifts = (S.cnt.gifts || 0) + 1; got = '🎁 ' + gi.name + ' (in the stash)';
  } else {
    t = txLine('trade_lose', ctx); takeThing(want); S.cnt.gaveAway = (S.cnt.gaveAway || 0) + 1; got = '💛 ' + itemById(want.id).name + ' given away';
  }
  const title = def.ic + ' ' + capFirst(def.name);
  reps.unshift({ ev: { battle: true, ic: def.ic, title, t, got } });
  pushEv({ c: 'trade', ic: def.ic, title, t, got, at: Date.now() });
}
// the player's answer to an offer
function answerTrade(p, yes) {
  const o = p && p.trade; if (!o || focusLock()) return;
  const def = (TEXT.traders || []).find(d => d.id === o.tr) || { name: o.name, plural: o.plural, ic: o.ic };
  const who = o.owner ? personById(o.owner) : null;
  const still = ownedThings().find(t => t.id === o.want && (o.owner ? t.who === who && t.slot === o.slot : !t.who)) || ownedThings().find(t => t.id === o.want);
  const ctx = tradeCtx(p, def, o.want, o.give, who);
  let t;
  if (yes && still) {
    takeThing(still);
    if (still.who && slotOf(itemById(o.give)) === still.slot && !still.who[still.slot]) still.who[still.slot] = o.give; else S.stash.push(o.give);
    t = txLine('trade_done', ctx); S.cnt.trades = (S.cnt.trades || 0) + 1;
  } else t = yes ? 'The ' + itemById(o.want).name + ' isn\'t aboard any more, so the swap is off. ' + capFirst(def.name) + ' understands.' : txLine('trade_decline', ctx);
  delete p.trade;
  pushEv({ c: 'trade', ic: o.ic, title: capFirst(o.name) + (yes ? ': a swap' : ': no swap'), t, at: Date.now() });
  hint.textContent = o.ic + ' ' + t; save(); draw();
}
