/* Solarist: Default prices and incomes. economy.json overrides any of these numbers. */
'use strict';

// economy defaults; apps/solarist-economy.json (loaded by the page) overrides any of these
const ECON = {
  incomeMultiplier: 1.5, researchCost: 1.5, session: { perStudyMinute: 1.4, minimum: 6, eventBonus: 20, rarityBonus: { Common: 20, Uncommon: 40, Rare: 80, Legendary: 200 } },
  engineBonusPerLevel: .025, fight: { min: 80, max: 130 }, fullCycle: { base: 80, perHullLevel: 4 }, bountyMultiplier: 1.25,
  encounters: { scale: 1.3, rareWorldMultiplier: 1.5 }, trade: { perFacilityLevel: 1, cap: 40 },
  sell: { rarity: { Common: 8, Uncommon: 12, Rare: 30, Legendary: 90 }, perHabitabilityPercent: .15, earthLike: 10, earthLikeAt: 80, perLifeLevel: 2, anomaly: 10, rings: 4, perMoon: .6, moonCap: 6, perRecord: 12 },
  distressRun: { base: 400, random: 130, bonusMin: 70, bonusMax: 130 }, tradeStation: { prices: { Common: 75, Uncommon: 190, Rare: 500, Legendary: 1500 }, sellRatio: .3 }, roomCost: { base: 450, growth: 1.34, maxLevel: 10 }, story: { pay: 70, chapter: 160, ending: 1000 }, crewCost: { base: 200, perCrew: 160 }, decorCost: { t1: 200, t2: 520, t3: 1170, t4: 2340, station: 3500 }, shipStyleCost: { color: 300, design: 800 }, moduleCost: { base: 200, growth: 1.095, maxLevel: { engine: 49, scanner: 41, lab: 27, comms: 49, hull: 49 } }, facilityCost: { base: 80, growth: 1.6, maxLevel: 10 },
  levels: { base: 40, perLevel: 4, perLevelSquared: .2 }, ratingRanks: [0, 400, 1500, 4000, 9000, 18000, 32000, 55000, 90000, 140000, 220000],
  station: { discount: .2, sellBonus: .25, charge: 600, satellite: 1500, contract: 300, intel: 400, chipDiscount: .25, steel: 1000, design: 2500, veteran: 2500, shift: 120, maxShifts: 3 },
  // one roll per new world: chance of any visitor, then weights pick which (postal and cassini arrive in a later update)
  encounter: { chance: .3, weights: { meeting: 25, postal: 22, trade: 18, outlaw: 15, cassini: 12, derelict: 5, station: 12 } },
  // planet expeditions: pay per leg (risky legs pay boldPay x that), finale bonus, find chances, sale bonus per Point of Interest, derelict salvage pay
  expedition: { pay: 60, boldPay: .6, finale: 80, findSafe: .45, findBold: .8, poiSellBonus: .08, salvage: 120 },
  // Investigate: progress per session (random between min and max), and the reward when it's solved
  investigate: { min: .25, max: .35, pay: 250, knowledge: 60 },
  // Hyperdrive: most charges you can hold, and what each removed Hyperdrive Node refunded
  hyperdrive: { max: 3, nodeRefund: 150 },
  // Postal: jobs a Postal office offers, how many you can carry, and what cancelled old jobs paid back (share of their pay)
  postal: { offers: 3, carry: 2, consolation: .25 },
  // Cassini Federation Post: chance the criminal on your poster is sighted on a trip (base, +perTrip for each trip without one, up to cap), and pay per Manhunt leg
  cassini: { base: .08, perTrip: .04, cap: .4, legPay: 55 },
  coordChips: { start: 5, base: 1800, growth: 1.055, max: 45 }, facilitySlots: { base: 5, atTown: 1, max: 10, buyBase: 1500, buyGrowth: 1.8 },
  quests: { delivery: 28, deliveryViaJump: .7, contract: 900, contractKnowledge: 250, bossBase: 350, bossPerCatch: 70 },
};
function mergeEcon(d, o) { // copy numbers from the JSON over the defaults, ignoring notes and anything that isn't the right type
  if (!o || typeof o !== 'object') return d;
  const out = Array.isArray(d) ? d.slice() : Object.assign({}, d);
  Object.keys(d).forEach(k => { const v = o[k]; if (v == null) return; if (typeof d[k] === 'number') { if (typeof v === 'number' && isFinite(v) && v >= 0) out[k] = v; } else if (typeof d[k] === 'object') out[k] = mergeEcon(d[k], v); });
  return out;
}
