/* Solarist: Outlaws, arrival encounters and deep-space events. */
'use strict';

// Outlaws: some new worlds are held by a gang. While one is, Explore turns into Fight: one study session drives them out.
const OUTLAW_CHANCE = 1 / 8;
const GANG_A = ['Rust', 'Void', 'Red Comet', 'Dust', 'Iron', 'Grinning', 'Black Sun', 'Scrap', 'Howling', 'Neon'], GANG_B = ['Jackals', 'Raiders', 'Vultures', 'Syndicate', 'Rats', 'Wolves', 'Pirates', 'Crows', 'Gang', 'Marauders'];
const FIGHT = ['{G} put up a fight, but the crew drove them off the {b}.', 'A long standoff over the {b}. {G} blinked first and fled.', '{G} tried an ambush in the {b}. It did not go well for them.', 'After a tense chase through the {b}, {g} gave up and jumped away.', '{G} surrendered once the ship\'s floodlights hit their camp in the {b}.', "{G} tried to bluff their way out over the {b}. The crew called the bluff.", "{G} hid in the {b} and waited. The crew waited longer.", "The crew cut {g}'s fuel line in the {b}. They had to walk home.", "{G} threw everything they had at the ship over the {b}. It wasn't enough.", "A short, loud fight over the {b}. Then a long, quiet retreat from {g}.", "{G} ran out of ammunition before the crew ran out of patience.", "{G} tried to outrun the ship through the {b}. They tripped over a rock.", "{G} set up a trap in the {b}. The crew stepped around it.", "The crew lit up the {b} like a stage, and {g} lost their nerve.", "{G} called for backup. Backup didn't come.", "A tense game of hide-and-seek in the {b}. The crew won. {G} went home.", "{G} gave up as soon as the ship's cook started yelling.", "{G} tried to sneak up on the ship in the {b}. They sneezed.", "{G} made a stand in the {b} and lost it fast.", "The crew offered {g} a deal: leave now, keep your ship. They took it."];
// Arrival encounters: about 1 trip in 10, something near the new world pays out a little stardust. {p} = the world's name.
const ENC_CHANCE = E.encounters.chance;
const ENCOUNTERS = [
  ['🔬', 'Intergalactic Research Station Nearby!', 'You settled near an Intergalactic Research Station, reported your findings on {p} and traded a few spare parts.', 40, 90],
  ['🐫', 'Trading Caravan Passing By!', 'A long caravan of cargo haulers drifted past {p}. You swapped star charts for a crate of supplies.', 30, 70],
  ['⛏', 'Abandoned Mining Rig!', 'An old mining rig was still parked in orbit around {p}. Its hoppers weren\'t quite empty.', 50, 110],
  ['🍜', 'Space Diner in Orbit!', 'A floating diner circles {p}. The cook paid the crew to review the soup. (It was fine.)', 20, 50],
  ['🗺', 'Cartographers\' Guild Outpost!', 'The Guild bought your survey of {p} for their next atlas edition.', 40, 100],
  ['☄', 'Comet Tail Harvest!', 'A comet swept past {p} just as you arrived. The crew scooped rare ice and metals straight out of its tail.', 30, 80],
  ['🛰', 'Derelict Satellite Salvaged!', 'A dead satellite was tumbling around {p}. Its solar panels sold for a decent price.', 30, 70],
  ['🎥', 'Film Crew on Location!', 'A film crew is shooting a space opera on {p}. They paid for the use of your ship as a background prop.', 40, 90],
  ['🙏', 'Pilgrim Fleet Blessing!', 'A fleet of pilgrims on their way to {p} shared supplies and wished the crew safe travels.', 20, 60],
  ['📦', 'Lost Cargo Pod!', 'A drifting cargo pod near {p} still had its delivery fee attached. Finders keepers.', 30, 80],
  ['🏛', 'Museum Curator Visit!', 'A museum curator bought your first photos of {p} for a new exhibit.', 40, 100],
  ['🎟', 'Space Lottery Ticket!', 'A ticket stuck to the hull since three jumps ago turned out to be a winner. Small prize, but a prize.', 20, 120],
  ['📮', 'Postal Drone Delivery!', 'A postal drone caught up with the ship near {p} with a refund from a very old order.', 20, 50],
  ['🧪', 'Scientists Rent Your Sensors!', 'A science team stuck near {p} with broken gear rented your scanners for a day.', 40, 90],
  ['🌋', 'Mineral Geyser!', 'One of {p}\'s moons vents glittering dust every few hours. The crew filled every container on board.', 50, 120],
  ['🤝', 'Friendly Smugglers!', 'A smuggler crew near {p} paid well for a "no questions asked" fuel top-up.', 30, 90],
  ['🎓', 'Academy Field Trip!', 'A class of cadets on a field trip to {p} paid for a tour of the ship.', 20, 60],
  ['📡', 'Signal Bounty!', 'The signal you picked up near {p} matched an old bounty notice. Someone had been looking for it.', 40, 100],
  ['🏪', 'Wandering Market!', 'A wandering market set up its stalls in orbit around {p}. You sold off the junk from the cargo bay.', 30, 70],
  ['⚙', 'Mining Guild Finder\'s Fee!', 'The Mining Guild paid a finder\'s fee for the resources you charted on {p}.', 40, 110],
  ["🚑", "Ambulance Ship Refuel!", "A hospital ship near {p} was running low on fuel. They paid double for a top-up and threw in some vitamins.", 30, 80],
  ["🎻", "Traveling Orchestra!", "An orchestra touring {p}'s moons needed a ride for their tuba. They paid in cash and one private concert.", 30, 70],
  ["🛠", "Repair Job!", "A small freighter broke down in orbit around {p}. The crew fixed it in an afternoon and got paid for the parts.", 40, 90],
  ["🐾", "Lost Pet Reward!", "Someone's escaped robot cat was floating near {p}. The reward poster was very generous.", 20, 70],
  ["📚", "Library Ship!", "A library ship orbiting {p} bought your old survey reports. Librarians love a good map.", 30, 70],
  ["🏁", "Comet Race Sponsor!", "The Comet Racing League was practicing near {p}. They paid to put a sticker on your hull.", 40, 100],
  ["🧊", "Ice Hauler Trade!", "An ice hauler around {p} swapped water for some of your spare parts. Good deal for both.", 30, 70],
  ["🎨", "Painter's Commission!", "A painter wanted your ship in the foreground of a painting of {p}. They paid for the pose.", 20, 60],
  ["🔭", "Amateur Astronomers!", "A club of amateur astronomers near {p} paid to borrow your telescope for a night.", 20, 60],
  ["🪙", "Old Coin Cache!", "A hollow asteroid near {p} had a stash of old coins inside. Somebody's savings, long forgotten.", 50, 120],
  ["🍲", "Soup Kitchen Donation!", "A soup kitchen ship near {p} got a hand from the crew, and insisted on paying them back.", 20, 50],
  ["🧯", "Fire Drill Fee!", "A station near {p} hired the crew to test their fire drills. Nobody was harmed. One toaster was.", 30, 70],
  ["🗳", "Census Help!", "The Guild census office paid you to count the settlements on {p}. There were more than expected.", 40, 90],
  ["🎒", "Tour Guide Gig!", "A group of tourists heading for {p} hired the crew as guides for a day. Tips were good.", 30, 80],
  ["🚚", "Moving Day!", "A family moving to {p} needed help with their furniture. The piano was the hard part.", 30, 70],
  ["🧳", "Lost Luggage Reward!", "A suitcase drifting near {p} belonged to a rich tourist. They paid a big reward to get their socks back.", 30, 90],
  ["🔧", "Spare Parts Swap!", "A tinkerer near {p} swapped a box of rare parts for your old junk. They think they won.", 30, 80],
  ["📻", "Radio Show Guest!", "A radio station on {p} paid the crew to tell travel stories live on air.", 20, 60],
  ["🌾", "Harvest Helpers!", "Farmers on {p} needed extra hands for the harvest. They paid in coins and fresh bread.", 30, 70],
  ["🐉", "Kite Festival Prize!", "The ship accidentally won {p}'s kite festival by flying past at the right moment. Prize accepted.", 20, 80],
  ["🚿", "Water Delivery Tip!", "A thirsty mining camp near {p} tipped big for a tank of fresh water.", 30, 80],
  ["🧭", "Navigation Lessons!", "A rookie pilot near {p} paid for a crash course (no crashing) in navigation.", 30, 70],
  ["🎠", "Fairground Ride!", "A traveling fair orbiting {p} hired the ship as a backdrop for its rides.", 20, 60],
  ["🪐", "Ring Ice Sale!", "Ice from {p}'s rings sold for a good price to a passing cocktail bar.", 40, 90],
  ["📷", "Postcard Rights!", "A postcard company bought the rights to your best photos of {p}.", 30, 80],
  ["🏺", "Antique Dealer!", "An antique dealer near {p} paid for an old cup the crew had been using as a pen holder.", 40, 110],
  ["🥫", "Food Drive!", "A charity ship near {p} paid the crew to help hand out meals. Good work, good pay.", 20, 60],
  ["⛽", "Fuel Price Glitch!", "A fuel station near {p} had a pricing glitch. The ship filled up and sold the extra.", 40, 100],
  ["🧑‍🏫", "Guest Lecture!", "A school on {p}'s moon paid the Captain to give a talk. Questions included \"is space cold?\".", 20, 60],
  ["🎣", "Space Fishing Contest!", "A fishing contest in {p}'s ice rings. The crew caught a frozen boot and won \"most creative\".", 20, 70],
  ["🧵", "Tailor's Commission!", "A tailor near {p} paid to borrow the crew's uniforms as patterns. Very stylish.", 20, 60],
  ["🛎", "Hotel Ship Tip!", "A hotel ship orbiting {p} paid the crew to help with check-in during a rush.", 30, 70],
  ["🌌", "Star Map Update!", "The Guild updated their charts of {p} with your data and sent a small payment.", 30, 80],
  ["🎤", "Talent Show Prize!", "The crew entered a talent show near {p}. The cook's juggling won second place.", 20, 70],
  ["🧳", "Courier Job!", "A courier near {p} paid you to carry a small envelope. It was very important. Probably.", 30, 80],
];
let encGot = null, traderNew = null;
const heldP = () => { const f = S.outlaw && byNum(S.outlaw); return f && f.p.outlaw && !f.p.outlaw.cleared ? f.p : null; };
const held = p => !!(p.outlaw && !p.outlaw.cleared);
if (!S.events) S.events = []; if (!S.fc) S.fc = { n: 0, broken: false };
function rollEvent(force) {
  if (!force && Math.random() >= evChance(lvl('comms')) + chipP('storm', chipAmp())) return null;
  const pk = a => a[Math.floor(Math.random() * a.length)];
  const nameBit = () => { let n = ''; for (let i = 0; i < 2; i++) n += pk(SYL); return n.charAt(0).toUpperCase() + n.slice(1); };
  const pl = posts(); const pool = EVENTS.filter(e => !e[2].includes('{post}') || pl.length);
  const [ic, title, tpl, reward] = pk(pool);
  let t = tpl.replace('{who}', pk(TITLE) + ' ' + nameBit()).replace('{msg}', pk(BOTTLE)).replace('{fix}', pk(FIX))
    .replace('{post}', pl.length ? nm(pk(pl).p) : 'nowhere').replace('{world}', S.found.length ? nm(pk(S.found).p) : nameBit());
  let got = null;
  if (reward === 'charge') { if (!S.coord) { S.coord = true; got = '🧭 The Interplanetary Coordinator is charged!'; } else t += ' (The Coordinator was already full.)'; }
  const ev = { ic, title, t, got, at: Date.now() };
  pushEv(ev); S.cnt.ev++;
  return ev;
}
