/* Solarist: the Crew page (Ship → Crew): you and up to five crew, each a little card you can change any time,
   plus the stash of spare clothes and gear, and crafting. Everything here is words: nothing changes the numbers. */
'use strict';

let craftMsg = '';
const profList = el('datalist', { id: 'sx-prof-list' }, PROFESSIONS.map(p => el('option', { value: p })));
function letGo(i) { // their things go back in the stash
  const c = S.crew[i]; if (!c || focusLock()) return;
  [c.wear, c.gear].filter(Boolean).forEach(id => S.stash.push(id));
  dismiss(i); drawShip();
}
function personCard(p, isMe, i) {
  const lock = focusLock(), redraw = () => { save(); drawShip(); };
  const name = el('input', { type: 'text', class: 'sl-find sx-p-name', maxlength: 28, value: isMe ? (hasMyName() ? meName() : '') : p.name, placeholder: isMe ? 'Your name' : 'Name', 'aria-label': 'Name', disabled: lock || null });
  name.addEventListener('change', () => { const v = name.value.trim().slice(0, 28); if (isMe) { S.pilot = Object.assign(S.pilot || {}, { name: v, asked: true }); } else if (v) p.name = v; redraw(); });
  const pron = el('select', { 'aria-label': 'Pronouns', disabled: lock || null }, PRONOUNS.map(x => el('option', { value: x, selected: p.pronouns === x || null }, x === 'they' ? 'they / them' : x === 'she' ? 'she / her' : 'he / him')));
  pron.addEventListener('change', () => { p.pronouns = pron.value; redraw(); });
  const age = el('input', { type: 'text', inputmode: 'numeric', class: 'sl-find sx-p-age', maxlength: 4, value: String(p.age || ''), 'aria-label': 'Age', disabled: lock || null });
  age.addEventListener('change', () => { p.age = age.value.trim().slice(0, 4); redraw(); });
  const role = el('input', { type: 'text', class: 'sl-find sx-p-role', maxlength: 24, value: p.role || '', list: 'sx-prof-list', placeholder: 'Profession', 'aria-label': 'Profession', disabled: lock || null });
  role.addEventListener('change', () => { p.role = role.value.trim().slice(0, 24); redraw(); });
  const traits = txItems('trait'), tr = itemById(p.trait);
  const trait = el('select', { 'aria-label': 'Trait', disabled: lock || null }, traits.map(t => el('option', { value: t.id, selected: p.trait === t.id || null }, t.name)));
  trait.addEventListener('change', () => { p.trait = trait.value; redraw(); });
  // what they wear and carry: their own item, or anything of that kind in the stash
  const slotRow = (slot, kind, label) => {
    const cur = itemById(p[slot]), opts = [...new Set(S.stash)].map(itemById).filter(it => it && it.kind === kind && it.id !== p[slot]);
    const s = el('select', { 'aria-label': label, disabled: lock || null }, el('option', { value: '' }, '(nothing)'), cur ? el('option', { value: cur.id, selected: true }, cur.name) : null, opts.map(it => el('option', { value: it.id }, it.name + ' (stash)')));
    if (!cur) s.value = '';
    s.addEventListener('change', () => { equip(p, slot, s.value); drawShip(); });
    return el('div', { class: 'sx-p-slot' }, el('span', { class: 'sx-p-l' }, label), s, cur ? el('small', { class: 'sl-muted' }, capFirst(cur.desc)) : null);
  };
  const reroll = el('button', { type: 'button', class: 'btn sx-mini', disabled: lock || null, title: isMe ? 'New pronouns, age, profession and trait (your name stays)' : 'A new name, pronouns, age, profession and trait (they keep their things)', onclick: () => { surprise(p); redraw(); } }, 'Surprise me');
  return el('div', { class: 'sx-person' },
    el('div', { class: 'sx-p-head' }, el('span', { class: 'sx-p-ic', 'aria-hidden': 'true' }, isMe ? '🧑‍🚀' : (ROLES[p.role] || ['🙂'])[0]), name, reroll, isMe ? null : armBtn('Let go', 'Sure?', () => letGo(i), 'sx-mini')),
    el('div', { class: 'sx-p-row' }, pron, el('label', { class: 'sx-p-agel' }, 'Age ', age), role),
    el('div', { class: 'sx-p-slot' }, el('span', { class: 'sx-p-l' }, 'Trait'), trait, tr ? el('small', { class: 'sl-muted' }, capFirst(tr.desc)) : null),
    slotRow('wear', 'clothing', 'Wears'), slotRow('gear', 'equipment', 'Carries'),
    p.quirk ? el('small', { class: 'sl-muted' }, 'Also: ' + firstName(p) + ' ' + p.quirk + '.') : null);
}
// Crew: you, the crew, and the stash
function crewView(group) {
  const lock = focusLock(), out = [];
  out.push(group('You', personCard(S.me, true)));
  const add = el('button', { type: 'button', class: 'btn', disabled: lock || S.crew.length >= CREW_MAX || null, onclick: () => { addCrew(); drawShip(); } }, '+ Add a crew member');
  out.push(group('Crew (' + S.crew.length + ' / ' + CREW_MAX + ')', el('p', { class: 'sl-muted' }, 'Each crew member brings a little story to every study session, shaped by who they are and what they carry. Change anything, any time.'),
    ...S.crew.map((c, i) => personCard(c, false, i)), S.crew.length < CREW_MAX ? add : el('p', { class: 'sl-muted' }, 'The ship is full: five is a crew, six is a crowd.'), profList));
  const stash = S.stash.map(itemById).filter(Boolean);
  out.push(group('Stash', stash.length ? el('div', { class: 'sx-stash' }, stash.map(it => el('div', { class: 'sx-stash-i' }, el('b', {}, it.name), el('small', {}, it.kind + ' · ' + capFirst(it.desc)))))
    : el('p', { class: 'sl-muted' }, 'The stash is empty. Anything nobody is wearing or carrying waits here. Make new things in the Workshop.')));
  if (lock) out.unshift(el('p', { class: 'sl-muted' }, 'Changes wait until the study session is over. You can still look.'));
  return out;
}
// the ship's equipment (on the Ship tab)
function shipGearView(group) {
  const gear = S.shipGear.map(itemById).filter(Boolean);
  return [group('Ship equipment', el('p', { class: 'sl-muted' }, 'Each piece opens something new to do when you stay on a world. Make more in the Workshop.'),
    gear.length ? el('div', { class: 'sx-stash' }, gear.map(it => el('div', { class: 'sx-stash-i' }, el('b', {}, it.name), el('small', {}, capFirst(it.desc))))) : el('p', { class: 'sl-muted' }, 'Nothing yet.'))];
}
// the Workshop: everything Knowledge points buy, in one place
function workshopView(group) {
  const lock = focusLock(), leftN = txItems('ship').length - S.shipGear.length;
  const craftB = el('button', { type: 'button', class: 'btn', disabled: lock || (S.kp || 0) < 1 || null, onclick: () => { const it = craft(); craftMsg = it ? 'New: ' + it.name + '. ' + capFirst(it.desc) : ''; drawShip(); } }, 'Make clothes or gear · 1 point');
  const shipB = el('button', { type: 'button', class: 'btn', disabled: lock || (S.kp || 0) < 4 || !leftN || null, onclick: () => { const it = craftShip(); craftMsg = it ? 'New on the ship: ' + it.name + '. ' + capFirst(it.desc) : ''; drawShip(); } }, leftN ? 'Make ship equipment · 4 points' : 'The ship has everything');
  return [el('div', { class: 'sx-res sx-kp' }, el('b', {}, String(S.kp || 0)), el('small', {}, 'Knowledge points. You earn one for every finished study session, Full Cycle, solved mystery and Meridian chapter.')),
    group('Make something', el('p', { class: 'sl-muted' }, 'Clothes and gear are random, and new to you when they can be. Ship equipment opens a new thing to do when you stay on a world.'), el('div', { class: 'sx-row-l' }, craftB, shipB), craftMsg ? el('p', { class: 'sx-craftmsg' }, craftMsg) : null),
    group('Research', ...researchView().slice(1))];
}
