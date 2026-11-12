/* Solarist: The middle of the screen and the left column: world name, cycle bar, the world you're at and the Meridian. */
'use strict';

// the world shown in the middle of the screen
function scenePlanet(kind) {
  return kind === 'campaign' && running ? null : kind === 'explore' && running ? null : atP();
}
const sceneKind = () => mode !== 'focus' ? 'break' : following() ? 'campaign' : chaptering() || expediting() || investigating() || salvaging() ? 'discover' : 'explore';
function drawName() {
  if (pv && pvP()) { const p = pvP(); nameBox.disabled = false; nameBox.replaceChildren(el('b', {}, nm(p)), el('span', {}, p.type + ' world, ', el('i', { class: 'sx-r-' + p.rarity.toLowerCase() }, p.rarity), ', ' + (p.x || (p.x = makeExtra(p))).hab + '% habitable')); nameBox.onclick = () => { pvClose(true); tab('log'); openWorld(p.num); }; return; }
  const kind = sceneKind(), p = scenePlanet(kind);
  nameBox.disabled = !p;
  nameBox.replaceChildren(...(p ? [el('b', {}, nm(p)), el('span', {}, p.type + ' world, ', el('i', { class: 'sx-r-' + p.rarity.toLowerCase() }, p.rarity), ', ' + (p.x || (p.x = makeExtra(p))).hab + '% habitable')]
    : [el('b', {}, 'Uncharted world'), el('span', {}, 'Somewhere ahead')]));
  nameBox.onclick = p ? () => { tab('log'); openWorld(p.num); } : null;
}
function drawCycle(pct) { // one segment per study session, a short tick per short break, a long one for the long break
  const n = S.set.every, done = mode === 'focus' ? S.cycle % n : (S.cycle % n || n), kids = [];
  for (let i = 0; i < n; i++) {
    const st = i < done ? 'done' : i === done && mode === 'focus' ? 'now' : '';
    kids.push(el('span', { class: 'st ' + st, style: st === 'now' ? '--p:' + pct + '%' : null }));
    const bst = mode !== 'focus' && i === done - 1 ? 'now' : i < done - 1 ? 'done' : '';
    kids.push(el('span', { class: (i === n - 1 ? 'lb ' : 'sb ') + bst, style: bst === 'now' ? '--p:' + pct + '%' : null }));
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
    el('p', { class: 'sl-muted' }, p.type + ' · ' + p.rarity + (p.odd ? ' · ' + p.odd : '')));
  // the visitor, if there is one
  if (p.enc) out.push(el('p', { class: 'sx-visit' }, p.enc.ic + ' ' + p.enc.title.replace(/!$/, '')));
  else if (p.visit === 'none' && !derelictHere()) out.push(el('p', { class: 'sx-visit' }, 'No visitors here. Just you and the world.'));
  // a Meridian chapter on this world
  if (p.story && STD) out.push(...chapterBits(p, lock, legBar));
  // the expedition
  const head = (gas ? '🎈 Cloud dive' : '🗺 Expedition');
  if (exDone(p)) out.push(el('p', { class: 'sx-explored' }, '✓ Fully explored · ' + x.poi.length + ' Points of Interest'));
  else if (canExpedition(p)) {
    const leg = exLeg(p, x.step);
    out.push(el('p', { class: 'sx-q-h sx-q-sub' }, head + ' · ' + EX_PARTS[x.step]), legBar(x.step, x.step, EX_LEN, k => EX_PARTS[k]), el('p', {}, leg[0]),
      pathPick(x.pick, lock, leg, bold => exPathTip(x.step, bold), v => { (p.ex = p.ex || { step: 0, pick: 0, poi: [] }).pick = v; save(); drawLeft(); }),
      el('div', { class: 'sx-row-l' }, expediting() ? el('span', { class: 'sl-muted' }, 'Next session ' + (x.step ? 'continues it' : 'sets out') + '. ') : el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => setMission('expedition') }, x.step ? 'Continue next session' : 'Set out next session'),
        expediting() ? el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => { S.mission = 0; save(); hint.textContent = ''; draw(); } }, 'Not now') : null));
  }
  if (x.poi.length && !exDone(p)) out.push(el('p', { class: 'sl-muted' }, 'Charted: ' + x.poi.map(o => o.name).join(', ') + '.'));
  // the anomaly
  if (p.odd && !p.story) {
    const v = invOf(p);
    if (v.done) out.push(el('p', { class: 'sx-explored' }, '🔬 Anomaly solved. ', el('button', { type: 'button', class: 'sl-link', onclick: () => { rightTab = 'tx'; txFilter = 'codex'; drawRight(); } }, 'Read it in the Codex')));
    else if (canInvestigate(p)) out.push(el('p', { class: 'sx-q-h sx-q-sub' }, '🔬 Anomaly: ' + capFirst(p.odd)), el('div', { class: 'sx-camp-bar' }, el('i', { style: 'width:' + Math.round(v.pct * 100) + '%' })),
      el('div', { class: 'sx-row-l' }, investigating() ? el('span', { class: 'sl-muted' }, Math.round(v.pct * 100) + '% studied. Investigating next session. ') : el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => setMission('investigate') }, (v.pct ? 'Keep investigating (' + Math.round(v.pct * 100) + '%)' : 'Investigate it') + ' next session')));
  }
  // a derelict to salvage
  const d = derelictHere();
  if (d) {
    const leg = derelictLeg(d);
    out.push(el('p', { class: 'sx-q-h sx-q-sub' }, '🛸 Derelict: ' + d.derelict.ship), el('p', {}, leg[0]),
      pathPick(d.derelict.pick, lock, leg, bold => bold ? 'A riskier search, a rarer find' : 'A careful search, a sure find', v => { d.derelict.pick = v; save(); drawLeft(); }),
      el('div', { class: 'sx-row-l' }, salvaging() ? el('span', { class: 'sl-muted' }, 'Salvaging next session. ') : el('button', { type: 'button', class: 'sl-link', disabled: lock || null, onclick: () => setMission('salvage') }, 'Salvage next session')));
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
