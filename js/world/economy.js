/* Solarist: Default prices and incomes. economy.json overrides any of these numbers. */
'use strict';

// economy defaults; apps/solarist-economy.json (loaded by the page) overrides any of these
const ECON = {
  incomeMultiplier: 1.3, researchCost: 1.5, session: { perStudyMinute: .8, minimum: 6, eventBonus: 20, rarityBonus: { Common: 0, Uncommon: 10, Rare: 30, Legendary: 80 } },
  engineBonusPerLevel: .03, fight: { min: 40, max: 80 }, fullCycle: { base: 50, perHullLevel: 15 }, bountyMultiplier: 1.5,
  encounters: { scale: 1, rareWorldMultiplier: 1.5 }, trade: { perFacilityLevel: 1, cap: 60 },
  sell: { rarity: { Common: 6, Uncommon: 15, Rare: 45, Legendary: 140 }, perHabitabilityPercent: .25, earthLike: 15, earthLikeAt: 80, perLifeLevel: 4, anomaly: 15, rings: 5, perMoon: 1, moonCap: 10, perRecord: 30 },
  distressRun: { base: 500, random: 200, bonusMin: 100, bonusMax: 250 }, tradeStation: { prices: { Common: 75, Uncommon: 190, Rare: 500, Legendary: 1500 }, sellRatio: .3 }, roomCost: { base: 160, growth: 1.7, maxLevel: 5 }, story: { pay: 80, chapter: 200, ending: 1000 }, crewCost: { base: 200, perCrew: 160 }, decorCost: { t1: 150, t2: 400, t3: 900, t4: 1800, station: 2500 }, shipStyleCost: { color: 300, design: 800 }, moduleCost: { base: 70, growth: 1.27, maxLevel: { engine: 30, scanner: 21, lab: 14, comms: 25, hull: 30 } }, facilityCost: { base: 80, growth: 1.6, maxLevel: 10 },
  levels: { base: 40, perLevel: 4, perLevelSquared: .2 }, ratingRanks: [0, 400, 1500, 4000, 9000, 18000, 32000, 55000, 90000, 140000, 220000],
  station: { discount: .2, sellBonus: .25, charge: 600, satellite: 1500, contract: 300, intel: 400, chipDiscount: .25, steel: 1000, design: 2500, veteran: 2500, shift: 220 },
  // one roll per new world: chance of any visitor, then weights pick which (postal and cassini arrive in a later update)
  encounter: { chance: .3, weights: { meeting: 25, postal: 22, trade: 18, outlaw: 15, cassini: 12, derelict: 5, station: 12 } },
  // planet expeditions: pay per leg (risky legs pay boldPay x that), finale bonus, find chances, sale bonus per Point of Interest, derelict salvage pay
  expedition: { pay: 150, boldPay: .6, finale: 100, findSafe: .45, findBold: .8, poiSellBonus: .08, salvage: 120 },
  // Investigate: progress per session (random between min and max), and the reward when it's solved
  investigate: { min: .25, max: .35, pay: 120, knowledge: 60 },
  // Hyperdrive: most charges you can hold, and what each removed Hyperdrive Node refunded
  hyperdrive: { max: 3, nodeRefund: 150 },
  // Postal: jobs a Postal office offers, how many you can carry, and what cancelled old jobs paid back (share of their pay)
  postal: { offers: 3, carry: 2, consolation: .25 },
  // Cassini Federation Post: chance the criminal on your poster is sighted on a trip (base, +perTrip for each trip without one, up to cap), and pay per Manhunt leg
  cassini: { base: .08, perTrip: .04, cap: .4, legPay: 60 },
  coordChips: { start: 5, base: 1500, growth: 1.25, max: 60 }, facilitySlots: { base: 5, atTown: 1, max: 10, buyBase: 1500, buyGrowth: 1.8 },
  quests: { delivery: 55, deliveryViaJump: .7, contract: 900, contractKnowledge: 250, bossBase: 700, bossPerCatch: 150 },
};
function mergeEcon(d, o) { // copy numbers from the JSON over the defaults, ignoring notes and anything that isn't the right type
  if (!o || typeof o !== 'object') return d;
  const out = Array.isArray(d) ? d.slice() : Object.assign({}, d);
  Object.keys(d).forEach(k => { const v = o[k]; if (v == null) return; if (typeof d[k] === 'number') { if (typeof v === 'number' && isFinite(v) && v >= 0) out[k] = v; } else if (typeof d[k] === 'object') out[k] = mergeEcon(d[k], v); });
  return out;
}
