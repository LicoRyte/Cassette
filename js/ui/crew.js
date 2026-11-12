/* Solarist: the crew editor (Ship → Crew, and "Who's aboard?" on a first start). On the left, everyone aboard; in the
   main area, everything about the one you picked: who they are, their nature, and what they wear and carry, one
   slot at a time. Everything here is words: nothing changes the numbers. */
'use strict';

let craftMsg = '';
const profList = el('datalist', { id: 'sx-prof-list' }, PROFESSIONS.map(p => el('option', { value: p })));
function letGo(i) { // their things go back in the stash
  const c = S.crew[i]; if (!c || focusLock()) return;
  SLOT_KEYS.map(k => c[k]).concat(c.gear).filter(Boolean).forEach(id => S.stash.push(id));
  dismiss(i); drawShip();
}
const PRON_LABEL = { she: 'she / her', he: 'he / him', they: 'they / them' };
let crewSel = 'me'; // who's open in the editor: a person's id, or 'stash'
/* The editor. opts.create: a first start, where anything can be picked (you're packing for the trip); otherwise
   clothes and gear come from what's aboard (the stash). opts.redraw: draws it again after a change. */
function crewEditor(opts) {
  const create = !!opts.create, lock = !create && focusLock(), people = [S.me].concat(S.crew);
  const redraw = () => { save(); opts.redraw(); };
  if (crewSel !== 'stash' || create) { if (!people.some(x => x.id === crewSel)) crewSel = S.me.id; }
  const p = people.find(x => x.id === crewSel) || null, isMe = p === S.me;
  // the list on the left
  const pick = id => { crewSel = id; opts.redraw(); };
  const who = x => el('button', { type: 'button', class: 'sx-ed-who' + (x.id === crewSel ? ' on' : ''), 'aria-current': x.id === crewSel ? 'true' : null, onclick: () => pick(x.id) },
    el('b', {}, x === S.me ? (hasMyName() ? meName() : 'You') : x.name), el('small', {}, (x === S.me ? 'You · ' : '') + (x.role || 'Crew')));
  const add = () => { const c = create ? newPerson() : addCrew(); if (!c) return; if (create) S.crew.push(c); crewSel = c.id; redraw(); };
  const list = el('nav', { class: 'sx-ed-list', 'aria-label': 'Everyone aboard' },
    el('div', { class: 'sx-ed-lh' }, 'Aboard (' + people.length + ')'), ...people.map(who),
    S.crew.length < CREW_MAX ? el('button', { type: 'button', class: 'sx-ed-add', disabled: lock || null, onclick: add }, '+ Add crew (' + S.crew.length + ' of ' + CREW_MAX + ')')
      : el('small', { class: 'sx-ed-full' }, 'The ship is full: five is a crew, six is a crowd.'),
    create ? null : el('button', { type: 'button', class: 'sx-ed-who sx-ed-stashb' + (crewSel === 'stash' ? ' on' : ''), onclick: () => pick('stash') }, el('b', {}, 'Stash'), el('small', {}, S.stash.length + ' spare thing' + (S.stash.length === 1 ? '' : 's'))));
  // the stash, when it's picked
  if (!p) {
    const stash = S.stash.map(itemById).filter(Boolean).sort((a, b) => (slotOf(a) || '').localeCompare(slotOf(b) || ''));
    const slotName = it => it.kind === 'equipment' ? 'Carry' : (WEAR_SLOTS.find(s => s[0] === slotOf(it)) || [0, 'Wear'])[1];
    return el('div', { class: 'sx-ed' }, list, el('div', { class: 'sx-ed-main' }, el('h2', { class: 'sx-ed-title' }, 'Stash'),
      el('p', { class: 'sl-muted' }, 'Anything nobody is wearing or carrying waits here. Make more in the Workshop, or trade with travelers.'),
      stash.length ? el('section', { class: 'sx-ed-sec' }, ...stash.map(it => el('div', { class: 'sx-ed-row' }, el('span', { class: 'sx-ed-l' }, slotName(it)), el('div', { class: 'sx-ed-v' }, el('b', {}, capFirst(it.name)), el('small', { class: 'sx-ed-d' }, capFirst(it.desc))))))
        : el('p', { class: 'sl-muted' }, 'The stash is empty.')));
  }
  // one setting row: a label, then the control
  const row = (label, ...kids) => el('div', { class: 'sx-ed-row' }, el('span', { class: 'sx-ed-l' }, label), el('div', { class: 'sx-ed-v' }, ...kids));
  const name = el('input', { type: 'text', class: 'sx-ed-name', maxlength: 28, value: isMe ? (hasMyName() ? meName() : '') : p.name, placeholder: isMe ? 'Your name' : 'Name', 'aria-label': 'Name', disabled: lock || null });
  name.addEventListener('change', () => { const v = name.value.trim().slice(0, 28); if (isMe) S.pilot = Object.assign(S.pilot || {}, { name: v, asked: true }); else if (v) p.name = v; redraw(); });
  const pron = el('div', { class: 'sx-ed-seg', role: 'radiogroup', 'aria-label': 'Pronouns' }, PRONOUNS.map(x => el('button', { type: 'button', role: 'radio', 'aria-checked': String(p.pronouns === x), disabled: lock || null, onclick: () => { p.pronouns = x; redraw(); } }, PRON_LABEL[x])));
  const ageN = parseInt(p.age, 10);
  const age = el('input', { type: 'text', inputmode: 'numeric', class: 'sx-ed-age', maxlength: 4, value: String(p.age || ''), 'aria-label': 'Age', disabled: lock || null });
  age.addEventListener('change', () => { p.age = age.value.trim().slice(0, 4); redraw(); });
  const step = d => el('button', { type: 'button', class: 'sx-ed-arr', 'aria-label': d < 0 ? 'Younger' : 'Older', disabled: lock || isNaN(ageN) || null, onclick: () => { p.age = String(Math.max(1, ageN + d)); redraw(); } }, d < 0 ? '−' : '+');
  const role = el('input', { type: 'text', class: 'sx-ed-role', maxlength: 24, value: p.role || '', list: 'sx-prof-list', placeholder: 'Profession', 'aria-label': 'Profession', disabled: lock || null });
  role.addEventListener('change', () => { p.role = role.value.trim().slice(0, 24); redraw(); });
  const tr = itemById(p.trait);
  const traitChips = el('div', { class: 'sx-ed-chips', role: 'radiogroup', 'aria-label': 'Trait' }, txItems('trait').map(t => el('button', { type: 'button', role: 'radio', 'aria-checked': String(p.trait === t.id), disabled: lock || null, onclick: () => { p.trait = t.id; redraw(); } }, t.name)));
  // a clothing or gear slot: the arrows step through what can go there
  const slotRow = (slot, label) => {
    const cur = itemById(p[slot]);
    const choices = create ? [''].concat(slotItems(slot).map(it => it.id)) : [''].concat(cur ? [cur.id] : [], [...new Set(S.stash)].filter(id => slotOf(itemById(id)) === slot));
    const at = Math.max(0, choices.indexOf(cur ? cur.id : ''));
    const go = d => { const id = choices[(at + d + choices.length) % choices.length]; if (create) p[slot] = id; else equip(p, slot, id); redraw(); };
    const many = choices.length > 1 && !lock;
    return el('div', { class: 'sx-ed-row sx-ed-slot' }, el('span', { class: 'sx-ed-l' }, label),
      el('div', { class: 'sx-ed-v' },
        el('div', { class: 'sx-ed-pick' },
          el('button', { type: 'button', class: 'sx-ed-arr', 'aria-label': 'Previous ' + label.toLowerCase(), disabled: !many || null, onclick: () => go(-1) }, '◂'),
          el('b', { class: 'sx-ed-item' + (cur ? '' : ' none') }, cur ? capFirst(cur.name) : 'nothing'),
          el('button', { type: 'button', class: 'sx-ed-arr', 'aria-label': 'Next ' + label.toLowerCase(), disabled: !many || null, onclick: () => go(1) }, '▸'),
          el('small', { class: 'sx-ed-n' }, choices.length > 1 ? (at + 1) + ' / ' + choices.length : '')),
        cur ? el('small', { class: 'sx-ed-d' }, capFirst(cur.desc)) : null));
  };
  const rnd = L => L.length ? L[Math.floor(Math.random() * L.length)].id : '';
  const outfit = () => { SLOT_KEYS.forEach(k => { p[k] = (k === 'hat' || k === 'acc') && Math.random() < .5 ? '' : rnd(slotItems(k)); }); p.gear = rnd(slotItems('gear')); redraw(); };
  const idx = S.crew.indexOf(p);
  const head = el('div', { class: 'sx-ed-head' }, name,
    el('div', { class: 'sx-ed-acts' },
      el('button', { type: 'button', class: 'btn sx-mini', disabled: lock || null, title: isMe ? 'New pronouns, age, profession and trait (your name stays)' : 'A new name, pronouns, age, profession and trait', onclick: () => { surprise(p); redraw(); } }, 'Surprise me'),
      create ? el('button', { type: 'button', class: 'btn sx-mini', onclick: outfit }, 'New outfit') : null,
      isMe ? null : create ? el('button', { type: 'button', class: 'btn sx-mini', onclick: () => { S.crew.splice(idx, 1); crewSel = S.me.id; redraw(); } }, 'Not this one')
        : armBtn('Let go', 'Sure?', () => { crewSel = S.me.id; letGo(idx); }, 'sx-mini')));
  return el('div', { class: 'sx-ed' }, list, el('div', { class: 'sx-ed-main' },
    lock ? el('p', { class: 'sl-muted' }, 'Changes wait until the study session is over. You can still look.') : null,
    head,
    el('div', { class: 'sx-ed-cols' },
      el('div', { class: 'sx-ed-col' },
        el('section', { class: 'sx-ed-sec' }, el('h3', {}, 'Who'), row('Pronouns', pron), row('Age', el('div', { class: 'sx-ed-pick' }, step(-1), age, step(1))), row('Profession', role)),
        el('section', { class: 'sx-ed-sec' }, el('h3', {}, 'Nature'), traitChips, tr ? el('p', { class: 'sx-ed-d' }, capFirst(tr.name) + ': ' + tr.desc) : null),
        el('section', { class: 'sx-ed-sec sx-ed-story' }, el('h3', {}, 'In the stories'), el('p', {}, crewLine(p)), p.quirk ? el('p', { class: 'sl-muted' }, 'Also: ' + firstName(p) + ' ' + p.quirk + '.') : null)),
      el('div', { class: 'sx-ed-col' },
        el('section', { class: 'sx-ed-sec' }, el('h3', {}, 'Outfit'), ...WEAR_SLOTS.map(([k, label]) => slotRow(k, label)),
          create ? null : el('p', { class: 'sx-ed-hint' }, 'Spare clothes wait in the stash. Make more in the Workshop.')),
        el('section', { class: 'sx-ed-sec' }, el('h3', {}, 'Carries'), slotRow('gear', 'Equipment')))),
    profList));
}
// the Crew tab of the Ship page
function crewView() { return [crewEditor({ redraw: drawShip })]; }
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
