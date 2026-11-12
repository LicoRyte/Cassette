/* Solarist: The middle of the screen and the left column: world name, cycle bar, the world you're at and the Meridian. */
'use strict';

// the world shown in the middle of the screen
function scenePlanet(kind) {
  return kind === 'campaign' && running ? null : kind === 'explore' && running ? null : atP();
}
const sceneKind = () => mode !== 'focus' ? 'break' : following() ? 'campaign' : chaptering() || staying() || observing() ? 'discover' : 'explore';
function drawName() {
  if (pv && pvP()) { const p = pvP(); nameBox.disabled = false; nameBox.replaceChildren(el('b', {}, nm(p)), el('span', {}, worldLabel(p) + ', ', el('i', { class: 'sx-r-' + p.rarity.toLowerCase() }, p.rarity), ', ' + (p.x || (p.x = makeExtra(p))).hab + '% habitable')); nameBox.onclick = () => { pvClose(true); tab('log'); openWorld(p.num); }; return; }
  const kind = sceneKind(), p = scenePlanet(kind);
  nameBox.disabled = !p;
  nameBox.replaceChildren(...(p ? [el('b', {}, nm(p)), el('span', {}, worldLabel(p) + ', ', el('i', { class: 'sx-r-' + p.rarity.toLowerCase() }, p.rarity), ', ' + (p.x || (p.x = makeExtra(p))).hab + '% habitable')]
    : [el('b', {}, 'Uncharted world'), el('span', {}, 'Somewhere ahead')]));
  nameBox.onclick = p ? () => { tab('log'); openWorld(p.num); } : null;
}
function drawCycle(pct) { // one bar per study session of the cycle, two to a row: done ones full, the one you're on filling up
  const n = S.set.every, done = mode === 'focus' ? S.cycle % n : (S.cycle % n || n), kids = [];
  for (let i = 0; i < n; i++) {
    const st = i < done ? 'done' : i === done && mode === 'focus' ? 'now' : '';
    kids.push(el('span', { class: 'st ' + st, style: st === 'now' ? '--p:' + pct + '%' : null }));
  }
  cycleBar.replaceChildren(...kids);
  cycleBar.classList.toggle('broken', !!S.fc.broken);
}
// the left side has tabs like the right: Here (the world you're at) and the Meridian. The last one you picked is remembered.
let leftTab = 'here'; try { leftTab = localStorage.getItem('solarist-ltab') || 'here'; } catch (e) { }
function drawLeft() {
  const lock = running && mode === 'focus';
  const legBar = (n, now, total, label) => el('div', { class: 'sl-dr-legs sx-legs' }, Array.from({ length: total }, (_, k) => el('span', { class: k < n ? 'done' : k === now ? 'now' : '' }, label(k))));
  // a "!" on a tab when something there is waiting for you
  const hereNew = !!derelictHere() || atDoor();
  const tabs = [['here', 'Here', hereNew], STD ? ['story', 'Meridian', signalOn() && !following()] : null].filter(Boolean);
  if (!tabs.some(t => t[0] === leftTab)) leftTab = 'here';
  const lt = ([k, label, dot]) => el('button', { type: 'button', role: 'tab', 'aria-selected': String(leftTab === k), onclick: () => { leftTab = k; try { localStorage.setItem('solarist-ltab', k); } catch (e) { } drawLeft(); leftCol.scrollTop = 0; } },
    label, dot && leftTab !== k ? el('i', { class: 'sx-dot sx-dot-amber' }, '!') : null);
  const page = leftTab === 'story' ? [storySec()] : [hereSec(lock, legBar)];
  leftCol.replaceChildren(el('div', { class: 'sx-rtabs', role: 'tablist', 'aria-label': 'Left panel' }, tabs.map(lt)), ...page);
}
// the briefing card: the world you're at, its visitor, and what you can do here
function pathPick(cur, lock, leg, tip, set) {
  return el('div', { class: 'sx-paths', role: 'radiogroup', 'aria-label': 'Path' }, [1, 2].map(o => el('button', { type: 'button', role: 'radio', 'aria-checked': String(cur === o - 1), disabled: lock || null, onclick: () => set(o - 1) },
    el('b', {}, leg[o][0]), el('small', {}, tip(o === 2)))));
}
function hereSec(lock, legBar) {
  const p = atP();
  if (!p) return sec(null, el('p', { class: 'sl-muted' }, 'Deep space. Explore to find your first world.'));
  const x = exOf(p), gas = gasWorld(p), out = [];
  out.push(el('p', { class: 'sx-q-h' }, el('button', { type: 'button', class: 'sl-link sx-here-n', onclick: () => { tab('log'); openWorld(p.num); } }, nm(p))),
    skyLine(), el('p', { class: 'sl-muted' }, (regionOf(p) ? regionOf(p).name + ' · ' : '') + worldLabel(p) + ' · ' + p.rarity + (p.odd ? ' · ' + p.odd : '')));
  // the visitor, if there is one
  if (p.enc) out.push(el('p', { class: 'sx-visit' }, p.enc.ic + ' ' + p.enc.title.replace(/!$/, '')));
  else if (p.visit === 'none' && !derelictHere()) out.push(el('p', { class: 'sx-visit' }, 'No visitors here. Just you and the world.'));
  // someone offering a swap
  if (p.trade) { const o = p.trade, w = itemById(o.want), g = itemById(o.give);
    out.push(el('div', { class: 'sx-offer' }, el('p', { class: 'sx-visit' }, o.ic + ' ' + o.t),
      el('p', { class: 'sl-muted' }, 'You give: ' + (w ? w.name : '?') + '. You get: ' + (g ? g.name + ' (' + g.desc.charAt(0).toLowerCase() + g.desc.slice(1, -1) + ')' : '?') + '.'),
      el('div', { class: 'sx-row-l' }, el('button', { type: 'button', class: 'btn sx-buy', disabled: lock || null, onclick: () => answerTrade(p, true) }, 'Swap'), el('button', { type: 'button', class: 'btn sx-mini', disabled: lock || null, onclick: () => answerTrade(p, false) }, 'No thanks')))); }
  // open mysteries (they travel with the ship)
  S.mys.filter(o => mysDef(o.id)).forEach(o => { const m = mysDef(o.id), on = observing() && mysPicked() === o;
    out.push(el('p', { class: 'sx-q-h sx-q-sub' }, '🔎 ' + m.title), el('div', { class: 'sx-camp-bar' }, el('i', { style: 'width:' + Math.round(o.step / m.steps.length * 100) + '%' })),
      el('p', { class: 'sx-story' }, o.log[o.log.length - 1]), el('small', { class: 'sl-muted' }, 'Found on ' + o.origin + ' · ' + o.step + ' of ' + m.steps.length + ' observed'),
      el('div', { class: 'sx-row-l' }, on ? el('span', { class: 'sl-muted' }, 'Observing next session.') : el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => setMission('mystery', o.id) }, 'Observe it next session'))); });
  // a Meridian chapter on this world
  if (p.story && STD) out.push(...chapterBits(p, lock, legBar));
  // the expedition
  const head = (gas ? '🎈 Cloud dive' : '🗺 Expedition');
  if (exDone(p)) out.push(el('p', { class: 'sx-explored' }, '✓ Fully explored · ' + x.poi.length + ' Points of Interest'));
  else if (canExpedition(p)) {
    const leg = exLeg(p, x.step);
    out.push(el('p', { class: 'sx-q-h sx-q-sub' }, head + ' · ' + EX_PARTS[x.step]), legBar(x.step, x.step, EX_LEN, k => EX_PARTS[k]), el('p', {}, leg[0]),
      pathPick(x.pick, lock, leg, bold => exPathTip(x.step, bold), v => { (p.ex = p.ex || { step: 0, pick: 0, poi: [] }).pick = v; save(); drawLeft(); }),
      el('div', { class: 'sx-row-l' }, expediting() ? el('span', { class: 'sl-muted' }, 'Next session ' + (x.step ? 'continues it' : 'sets out') + '. ') : el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => setMission('stay', 'expedition') }, x.step ? 'Continue next session' : 'Set out next session'),
        expediting() ? el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => { S.mission = 0; save(); hint.textContent = ''; draw(); } }, 'Not now') : null));
  }
  // places: what's been found here, and staying to find the rest
  if (!p.story) {
    const nLeft = placesLeft(p), onExp = placesUnfound(p) - nLeft, a = stayAct();
    out.push(el('p', { class: 'sx-q-h sx-q-sub' }, '📍 Places · ' + x.poi.length + ' of ' + placesMax(p) + ' found'));
    if (x.poi.length) out.push(el('ul', { class: 'sx-places' }, x.poi.map(o => el('li', {}, el('b', {}, placeName(o)), ' ', el('button', { type: 'button', class: 'sl-link sx-ren', title: 'Rename this place', disabled: lock || null, onclick: () => renamePlace(p, o) }, '✎')))));
    if (a) out.push(el('div', { class: 'sx-row-l' }, staying() ? el('span', { class: 'sl-muted' }, a.ic + ' Staying next session: ' + a.name.toLowerCase() + '. ') : el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => setMission('stay') }, '🏕 Stay here next session'),
      el('span', { class: 'sl-muted' }, nLeft ? ' ' + nLeft + ' more place' + (nLeft === 1 ? '' : 's') + ' to find by staying' + (onExp ? ', and ' + onExp + ' on the expedition.' : '.') : onExp ? ' The other ' + onExp + ' place' + (onExp === 1 ? ' is' : 's are') + ' on the expedition.' : ' Every place is found.')));
  }
  // a derelict to salvage
  const d = derelictHere();
  if (d) {
    const leg = derelictLeg(d);
    out.push(el('p', { class: 'sx-q-h sx-q-sub' }, '🛸 Derelict: ' + d.derelict.ship), el('p', {}, leg[0]),
      pathPick(d.derelict.pick, lock, leg, bold => bold ? 'A riskier search, a rarer find' : 'A careful search, a sure find', v => { d.derelict.pick = v; save(); drawLeft(); }),
      el('div', { class: 'sx-row-l' }, salvaging() ? el('span', { class: 'sl-muted' }, 'Salvaging next session. ') : el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => setMission('stay', 'salvage') }, 'Salvage next session')));
  }
  return sec(null, ...out);
}
// the Meridian story on the left: where the signal is, or what's left
function storySec() {
  if (!STD) return null;
  const lock = running && mode === 'focus', st = S.story, bits = [];
  bits.push(el('div', { class: 'sx-camp-bar' }, el('i', { style: 'width:' + Math.round((st.done ? ST_N : st.ch) / ST_N * 100) + '%' })), el('p', { class: 'sl-muted' }, (st.done ? ST_N : st.ch) + ' of ' + ST_N + ' chapters'));
  if (st.done) bits.push(el('p', {}, 'Complete. The light stays on the Star map, so you can go back whenever you like.'));
  else if (signalOn()) bits.push(el('p', {}, '📡 ' + signalText()), following() ? el('p', { class: 'sl-muted' }, 'Following the signal next session. ', el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => setMission('explore', 'random') }, 'Not now'))
    : el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => setMission('explore', 'signal') }, 'Follow the Signal next session'));
  else bits.push(el('p', {}, atDoor() ? '📡 Something is waiting for you here. See the Here tab.' : '📡 Chapter ' + (st.ch + 1) + ' is here. See the Here tab.'));
  if (st.log.length) bits.push(el('button', { type: 'button', class: 'sl-link sx-readlogs', onclick: () => { rightTab = 'tx'; txFilter = 'camp'; drawRight(); } }, 'Read the story so far'));
  return sec(null, ...bits);
}
// the chapter part of the Here card: the next leg with its two choices, or the door
function chapterBits(p, lock, legBar) {
  const c = STD.chapters[p.story.ch], out = [el('p', { class: 'sx-q-h sx-q-sub' }, '📡 Chapter ' + (p.story.ch + 1) + ': ' + c.name)];
  if (p.story.ch !== S.story.ch || S.story.done) { out.push(el('p', { class: 'sl-muted' }, 'You finished this chapter. Its parts are in the story log.')); return out; }
  const st = p.story, leg = c.legs[st.step];
  out.push(legBar(st.step, st.step, ST_LEGS, k => String(k + 1)), el('p', { class: 'sx-q-sub' }, el('b', {}, leg.title)), ...leg.text.map(t => el('p', { class: 'sx-story' }, t)));
  if (!atDoor()) {
    out.push(pathPick(st.pick, lock, [null, leg.a, leg.b], () => 'Changes the words, not the story', v => { st.pick = v; save(); drawLeft(); }),
      el('div', { class: 'sx-row-l' }, chaptering() ? el('span', { class: 'sl-muted' }, 'Next session follows the chapter. ') : el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => setMission('campaign') }, 'Follow the chapter next session')));
    return out;
  }
  if (!S.story.solved) { // the door: a text field, no penalty for wrong answers
    const inp = el('input', { type: 'text', class: 'sx-door-in', 'aria-label': 'Your answer', autocomplete: 'off', spellcheck: 'false', disabled: lock || null });
    const go = () => doorTry(inp.value);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    out.push(el('div', { class: 'sx-door' }, inp, el('button', { type: 'button', class: 'btn', disabled: lock || null, onclick: go }, 'Try')), doorMsg ? el('p', { class: 'sx-door-msg' }, doorMsg) : null);
    return out;
  }
  out.push(...leg.success.map(t => el('p', { class: 'sx-story' }, t)), el('div', { class: 'sx-paths' }, [leg.a, leg.b].map((o, i) => el('button', { type: 'button', disabled: lock || null, onclick: () => storyEnd(i) }, el('b', {}, o[0])))));
  return out;
}
// the sky of the day, at the top of the Here card
function skyLine() { const s = skyToday(); if (!s) return null; const seen = S.skies[today()] === s.id;
  return el('p', { class: 'sx-sky' }, s.ic + ' Today\'s sky: ' + s.name + (seen ? '. You saw it.' : '. Finish a study session today to see it.')); }

