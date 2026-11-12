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
  const create = !!opts.create, free = create || !!opts.free, lock = !create && focusLock(), people = [S.me].concat(S.crew);
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
    free ? null : el('button', { type: 'button', class: 'sx-ed-who sx-ed-stashb' + (crewSel === 'stash' ? ' on' : ''), onclick: () => pick('stash') }, el('b', {}, 'Stash'), el('small', {}, S.stash.length + ' spare thing' + (S.stash.length === 1 ? '' : 's'))));
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
  const tr = itemById(p.trait), tr2 = itemById(p.trait2);
  // one or two traits: click to add a second, click a picked one to drop it (the first can't be dropped, only replaced)
  const tapTrait = id => { if (p.trait === id) { if (p.trait2) { p.trait = p.trait2; p.trait2 = ''; } } else if (p.trait2 === id) p.trait2 = ''; else p.trait2 = id; redraw(); };
  const traitChips = el('div', { class: 'sx-ed-chips', role: 'group', 'aria-label': 'Traits: pick one or two' }, txItems('trait').map(t => { const n = p.trait === t.id ? 1 : p.trait2 === t.id ? 2 : 0;
    return el('button', { type: 'button', 'aria-pressed': String(!!n), class: n ? 'on' : '', disabled: lock || null, onclick: () => tapTrait(t.id) }, t.name, n ? el('i', { class: 'sx-ed-tn' }, String(n)) : null); }));
  // a clothing or gear slot: the arrows step through what can go there
  const slotRow = (slot, label) => {
    const cur = itemById(p[slot]);
    // always in the same order (the order of content/items.json), so the arrows cycle through everything predictably
    const pool = new Set(free ? slotItems(slot).map(it => it.id) : (cur ? [cur.id] : []).concat(S.stash.filter(id => slotOf(itemById(id)) === slot)));
    const choices = [''].concat(slotItems(slot).map(it => it.id).filter(id => pool.has(id)));
    const at = Math.max(0, choices.indexOf(cur ? cur.id : ''));
    const go = d => { const id = choices[(at + d + choices.length) % choices.length]; if (free) p[slot] = id; else equip(p, slot, id); redraw(); };
    const many = choices.length > 1 && !lock;
    return el('div', { class: 'sx-ed-row sx-ed-slot' }, el('span', { class: 'sx-ed-l' }, label),
      el('div', { class: 'sx-ed-v' },
        el('div', { class: 'sx-ed-pick' },
          el('button', { type: 'button', class: 'sx-ed-arr', 'aria-label': 'Previous ' + label.toLowerCase(), disabled: !many || null, onclick: () => go(-1) }, '◂'),
          el('b', { class: 'sx-ed-item' + (cur ? '' : ' none') }, cur ? capFirst(cur.name) : 'nothing'),
          el('button', { type: 'button', class: 'sx-ed-arr', 'aria-label': 'Next ' + label.toLowerCase(), disabled: !many || null, onclick: () => go(1) }, '▸'),
          el('small', { class: 'sx-ed-n' }, choices.length > 1 ? (at + 1) + ' / ' + choices.length : '')),
        cur ? el('small', { class: 'sx-ed-d' }, capFirst(cur.desc)) : null,
        !free && choices.length < 2 ? el('small', { class: 'sx-ed-d' }, 'Nothing spare in the stash for this. Make one in the Workshop, Crafting.') : null));
  };
  const rnd = L => L.length ? L[Math.floor(Math.random() * L.length)].id : '';
  const outfit = () => { SLOT_KEYS.forEach(k => { p[k] = (k === 'hat' || k === 'acc') && Math.random() < .5 ? '' : rnd(slotItems(k)); }); p.gear = rnd(slotItems('gear')); redraw(); };
  const idx = S.crew.indexOf(p);
  const head = el('div', { class: 'sx-ed-head' }, name,
    el('div', { class: 'sx-ed-acts' },
      el('button', { type: 'button', class: 'btn sx-mini', disabled: lock || null, title: isMe ? 'New pronouns, age, profession and trait (your name stays)' : 'A new name, pronouns, age, profession and trait', onclick: () => { surprise(p); redraw(); } }, 'Surprise me'),
      free ? el('button', { type: 'button', class: 'btn sx-mini', disabled: lock || null, onclick: outfit }, 'New outfit') : null,
      isMe ? null : create ? el('button', { type: 'button', class: 'btn sx-mini', onclick: () => { S.crew.splice(idx, 1); crewSel = S.me.id; redraw(); } }, 'Not this one')
        : armBtn('Let go', 'Sure?', () => { crewSel = S.me.id; letGo(idx); }, 'sx-mini')));
  return el('div', { class: 'sx-ed' }, list, el('div', { class: 'sx-ed-main' },
    lock ? el('p', { class: 'sl-muted' }, 'Changes wait until the study session is over. You can still look.') : null,
    head,
    el('div', { class: 'sx-ed-cols' },
      el('div', { class: 'sx-ed-col' },
        el('section', { class: 'sx-ed-sec' }, el('h3', {}, 'Who'), row('Pronouns', pron), row('Age', el('div', { class: 'sx-ed-pick' }, step(-1), age, step(1))), row('Profession', role)),
        el('section', { class: 'sx-ed-sec' }, el('h3', {}, 'Nature'), el('p', { class: 'sx-ed-hint sx-ed-hint-top' }, 'Pick one or two. Click a picked one to drop it.'), traitChips, tr ? el('p', { class: 'sx-ed-d' }, capFirst(tr.name) + ': ' + tr.desc) : null, tr2 ? el('p', { class: 'sx-ed-d sx-ed-d2' }, capFirst(tr2.name) + ': ' + tr2.desc) : null),
        el('section', { class: 'sx-ed-sec sx-ed-story' }, el('h3', {}, 'In the stories'), el('p', {}, crewLine(p)), p.quirk ? el('p', { class: 'sl-muted' }, 'Also: ' + firstName(p) + ' ' + p.quirk + '.') : null),
        isMe || create ? null : (() => { const st = storyOf(p); return el('section', { class: 'sx-ed-sec sx-ed-story' }, el('h3', {}, 'Their story'),
          st.now ? [el('p', { class: 'sx-ed-st' }, st.now.title + ' · ' + st.now.step + ' of ' + st.now.total), ...st.now.log.map(t => el('p', {}, t))]
            : el('p', { class: 'sl-muted' }, 'Nothing going on right now. A story of their own starts now and then, picked for who they are.'),
          st.done.length ? el('p', { class: 'sl-muted' }, 'Finished: ' + st.done.join(', ') + '.') : null); })()),
      el('div', { class: 'sx-ed-col' },
        el('section', { class: 'sx-ed-sec' }, el('h3', {}, 'Outfit'), ...WEAR_SLOTS.map(([k, label]) => slotRow(k, label)),
          free ? null : el('p', { class: 'sx-ed-hint' }, 'Spare clothes wait in the stash. Make more in the Workshop.')),
        el('section', { class: 'sx-ed-sec' }, el('h3', {}, 'Carries'), slotRow('gear', 'Equipment')))),
    profList));
}
// the Crew tab of the Ship page
function crewView() { return [crewEditor({ redraw: drawShip, free: true })]; } // anything can be worn: customizing your crew is the point
// the ship's equipment (on the Ship tab)
function shipGearView() { // a short line under the decorating: what's aboard (made in the Workshop)
  const gear = S.shipGear.map(itemById).filter(Boolean);
  return [el('p', { class: 'sx-ed-hint sx-deck-gear' }, gear.length ? 'Aboard: ' + gear.map(it => it.name).join(', ') + '.' : '')];
}
// the Workshop: everything Knowledge points buy. Research (a tech tree), Crafting (make a thing from a blueprint), Made.
let wsTab = 'Research', craftCat = 'top', resSel = null;
const CRAFT_CATS = WEAR_SLOTS.concat([['gear', 'Equipment'], ['ship', 'Ship']]);
const kpBox = () => el('div', { class: 'sx-ws-kp' }, el('b', {}, String(S.kp || 0)), el('span', {}, 'Knowledge points', el('small', {}, 'One for every finished study session, Full Cycle, solved mystery and Meridian chapter.')));
// where something you made is now
function madeWhere(id) {
  const who = [S.me].concat(S.crew).find(p => SLOT_KEYS.concat('gear').some(k => p[k] === id));
  if (who) return who === S.me ? 'You have it' : firstName(who) + ' has it';
  if (S.stash.includes(id)) return 'In the stash';
  if (S.shipGear.includes(id)) return 'On the ship';
  return 'Traded or given away';
}
const kindName = it => it.kind === 'ship' ? 'Ship' : it.kind === 'equipment' ? 'Equipment' : (WEAR_SLOTS.find(s => s[0] === slotOf(it)) || [0, 'Clothes'])[1];
// Research: one column per branch, each upgrade below the ones it needs; click one to see it
function researchTree() {
  const lock = focusLock(), state = n => hasT(n[0]) ? 'done' : reqOf(n).every(hasT) ? 'open' : 'locked';
  if (!resSel || !RES_ALL.some(n => n[0] === resSel)) resSel = (RES_ALL.find(n => state(n) === 'open') || RES_ALL[0])[0];
  const cols = RESEARCH.map(([branch, list]) => {
    const depth = new Map(); list.forEach(n => { const inside = reqOf(n).filter(r => list.some(m => m[0] === r)); depth.set(n[0], inside.length ? Math.max(...inside.map(r => depth.get(r) || 0)) + 1 : 0); });
    const tiers = []; list.forEach(n => { const k = depth.get(n[0]); (tiers[k] = tiers[k] || []).push(n); });
    const done = list.filter(n => hasT(n[0])).length;
    return el('div', { class: 'sx-tt-col' }, el('div', { class: 'sx-tt-h' }, branch, el('small', {}, done + ' / ' + list.length)),
      ...tiers.filter(Boolean).map((row, k) => el('div', { class: 'sx-tt-tier' + (k ? ' joined' : '') }, row.map(n => {
        const st = state(n);
        return el('button', { type: 'button', class: 'sx-tt-n ' + st + (resSel === n[0] ? ' sel' : ''), 'aria-pressed': String(resSel === n[0]), onclick: () => { resSel = n[0]; drawShip(); } },
          el('b', {}, n[1]), el('small', {}, st === 'done' ? 'Done' : rcost(n) + ' pt' + (rcost(n) === 1 ? '' : 's')));
      }))));
  });
  // the picked upgrade
  const n = RES_ALL.find(x => x[0] === resSel), st = state(n), u = n[4] || {}, cost = rcost(n), md = ACH.filter(a => a.req === n[0]).length;
  const unl = [];
  if (u.bp) unl.push(el('div', { class: 'sx-tt-u' }, el('span', {}, 'Blueprints'), el('div', {}, u.bp.map(itemById).filter(Boolean).map(it => capFirst(it.name)).join(', '))));
  if (u.cat) unl.push(el('div', { class: 'sx-tt-u' }, el('span', {}, 'Collectibles'), el('div', {}, catName(u.cat))));
  if (u.logs) unl.push(el('div', { class: 'sx-tt-u' }, el('span', {}, 'Ship Logs'), el('div', {}, u.logs.length + ' to read' + (st === 'done' ? ' in the Journal' : ''))));
  if (md) unl.push(el('div', { class: 'sx-tt-u' }, el('span', {}, 'Achievements'), el('div', {}, md + ' new')));
  const needs = reqOf(n);
  const detail = el('div', { class: 'sx-tt-d' },
    el('small', { class: 'sx-wp-k' }, resBranch(n[0])), el('h3', {}, n[1]), el('p', {}, n[3]),
    needs.length ? el('div', { class: 'sx-tt-u' }, el('span', {}, 'Needs'), el('div', {}, needs.map(r => resName(r) + (hasT(r) ? ' (done)' : '')).join(', '))) : null,
    ...unl,
    st === 'done' ? el('p', { class: 'sx-tt-done' }, 'Researched') :
      el('button', { type: 'button', class: 'btn sl-go', disabled: lock || st !== 'open' || (S.kp || 0) < cost || null, onclick: () => { doResearch(n[0]); drawShip(); } },
        st === 'locked' ? 'Needs ' + needs.filter(r => !hasT(r)).map(resName).join(' and ') : 'Research · ' + cost + ' point' + (cost === 1 ? '' : 's')));
  return [el('div', { class: 'sx-tt' }, el('div', { class: 'sx-tt-grid' }, cols), detail)];
}
// Crafting: pick a kind, then make exactly the thing you want from what you know
function craftingView() {
  const lock = focusLock(), known = knownBp();
  const chips = el('div', { class: 'sx-ed-seg sx-ws-cats', role: 'tablist' }, CRAFT_CATS.map(([k, label]) => { const all = k === 'ship' ? txItems('ship') : slotItems(k), n = all.filter(it => known.has(it.id)).length;
    return el('button', { type: 'button', role: 'tab', 'aria-selected': String(craftCat === k), 'aria-checked': String(craftCat === k), onclick: () => { craftCat = k; craftMsg = ''; drawShip(); } }, label, el('small', {}, ' ' + n + '/' + all.length)); }));
  const items = craftCat === 'ship' ? txItems('ship') : slotItems(craftCat), have = owned();
  const rows = items.map(it => {
    const k = known.has(it.id), cost = craftCost(it), onShip = it.kind === 'ship' && S.shipGear.includes(it.id), n = have.filter(x => x === it.id).length;
    if (!k) { const node = bpNode(it.id); return el('div', { class: 'sx-ws-row locked' }, el('div', {}, el('b', {}, capFirst(it.name)), el('small', {}, 'Blueprint from research: ' + (node ? node[1] : '?'))), el('span', { class: 'sx-ws-c' }, cost + ' pt' + (cost === 1 ? '' : 's'))); }
    return el('div', { class: 'sx-ws-row' }, el('div', {}, el('b', {}, capFirst(it.name)), el('small', {}, capFirst(it.desc)), onShip ? el('small', { class: 'sx-ws-have' }, 'On the ship') : n ? el('small', { class: 'sx-ws-have' }, 'You have ' + n) : null),
      onShip ? el('span', { class: 'sx-ws-c' }, 'Built') : el('button', { type: 'button', class: 'btn sl-go', disabled: lock || (S.kp || 0) < cost || null, onclick: () => { const x = craftItem(it.id); craftMsg = x ? (x.kind === 'ship' ? 'New on the ship: ' : 'Made: ') + x.name + (x.kind === 'ship' ? '. Something new to do when you stay on a world.' : '. It\'s in the stash: dress someone in it on the Crew tab.') : ''; drawShip(); } }, 'Make · ' + cost));
  });
  const surprise = el('div', { class: 'sx-ws-sur' }, el('div', {}, el('b', {}, 'Surprise me'), el('small', {}, 'Any clothes or equipment at all, even without a blueprint. New to you when it can be.')),
    el('button', { type: 'button', class: 'btn', disabled: lock || (S.kp || 0) < 1 || null, onclick: () => { const it = craft(); craftMsg = it ? 'Surprise: ' + it.name + '. ' + capFirst(it.desc) : ''; drawShip(); } }, 'Make · 1'));
  return [lock ? el('p', { class: 'sl-muted' }, 'Making things waits until the study session is over.') : null, chips, craftMsg ? el('p', { class: 'sx-craftmsg' }, craftMsg) : null, el('div', { class: 'sx-ws-list' }, rows), surprise].filter(Boolean);
}
// Made: everything you've made, and every blueprint you know
function madeView() {
  const known = knownBp(), all = txItems('clothing').concat(txItems('equipment'), txItems('ship'));
  const list = S.made.slice().reverse().map(m => ({ m, it: itemById(m.id) })).filter(x => x.it);
  const byCat = CRAFT_CATS.map(([k, label]) => { const its = (k === 'ship' ? txItems('ship') : slotItems(k)).filter(it => known.has(it.id)); return its.length ? el('div', { class: 'sx-tt-u' }, el('span', {}, label), el('div', {}, its.map(it => capFirst(it.name)).join(', '))) : null; }).filter(Boolean);
  return [el('p', { class: 'sx-ws-sum' }, 'You know ' + known.size + ' of ' + all.length + ' blueprints and have made ' + S.made.length + ' thing' + (S.made.length === 1 ? '' : 's') + '.'),
    el('section', { class: 'sx-ed-sec' }, el('h3', {}, 'Made so far'), list.length ? el('div', { class: 'sx-ws-list' }, list.slice(0, 200).map(({ m, it }) => el('div', { class: 'sx-ws-row' },
      el('div', {}, el('b', {}, capFirst(it.name)), el('small', {}, kindName(it) + (m.surprise ? ' · a surprise' : '') + ' · ' + new Date(m.at).toLocaleDateString())), el('span', { class: 'sx-ws-c' }, madeWhere(it.id)))))
      : el('p', { class: 'sl-muted' }, 'Nothing yet. Research a blueprint, then make it on the Crafting tab.')),
    el('section', { class: 'sx-ed-sec' }, el('h3', {}, 'Blueprints you know'), byCat.length ? el('div', {}, byCat) : el('p', { class: 'sl-muted' }, 'None yet. Mending, Tinkering and Home Comforts in the Research tree are a good start.'))];
}
function workshopView() {
  const tabs = el('div', { class: 'sx-ws-tabs', role: 'tablist' }, ['Research', 'Crafting', 'Made'].map(k => el('button', { type: 'button', role: 'tab', class: 'sl-stab', 'aria-selected': String(wsTab === k), onclick: () => { wsTab = k; craftMsg = ''; drawShip(); } }, k)));
  const body = wsTab === 'Crafting' ? craftingView() : wsTab === 'Made' ? madeView() : researchTree();
  return [el('div', { class: 'sx-ws-head' }, tabs, kpBox()), ...body];
}
