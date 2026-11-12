/* Solarist: the break panel, on the right of the main screen. Anything waiting for you (a swap, the Meridian door),
   what happened last session, then "What next?": up to four choice cards (Travel on, Stay here, Observe, Meridian),
   one always picked, each with its own small choice inside, and the details of the picked one below. */
'use strict';

const bpLegBar = (n, now, total, label) => el('div', { class: 'sl-dr-legs sx-legs' }, Array.from({ length: total }, (_, k) => el('span', { class: k < n ? 'done' : k === now ? 'now' : '' }, label(k))));
function choiceCard(k, title, sub, picker) {
  const on = curMission() === k, lock = running && mode === 'focus';
  const c = el('div', { class: 'sx-cardc' + (on ? ' on' : ''), role: 'radio', tabindex: lock ? -1 : 0, 'aria-checked': String(on), 'aria-disabled': String(lock),
    onclick: e => { if (lock || e.target.closest('select')) return; setMission(k); }, onkeydown: e => { if ((e.key === 'Enter' || e.key === ' ') && !lock) { e.preventDefault(); setMission(k); } } },
    el('b', {}, title), el('small', {}, sub), picker || null);
  return c;
}
let bpWasLock = true, bpFadeT = 0; // the cards fade in once when a break starts (and when the app opens), not on every redraw
function drawBreak() {
  const p = atP(), lock = running && mode === 'focus';
  if (bpWasLock && !lock) { bpCards.classList.add('sx-fade'); clearTimeout(bpFadeT); bpFadeT = setTimeout(() => bpCards.classList.remove('sx-fade'), 900); }
  bpWasLock = lock;
  // things waiting for an answer
  const notes = [];
  if (p && p.trade) { const o = p.trade, w = itemById(o.want), g = itemById(o.give);
    notes.push(el('div', { class: 'sx-offer sx-note' }, el('p', {}, o.t), el('p', { class: 'sl-muted' }, 'You give: ' + (w ? w.name : '?') + '. You get: ' + (g ? g.name : '?') + '.'),
      el('div', { class: 'sx-row-l' }, el('button', { type: 'button', class: 'btn sx-buy', disabled: lock || null, onclick: () => answerTrade(p, true) }, 'Swap'), el('button', { type: 'button', class: 'btn sx-mini', disabled: lock || null, onclick: () => answerTrade(p, false) }, 'No thanks')))); }
  if (p && p.story && STD && atDoor()) notes.push(el('div', { class: 'sx-note' }, ...chapterBits(p, lock, bpLegBar)));
  bpNotes.replaceChildren(...notes); bpNotes.hidden = !notes.length;
  // what happened (the last session's story; the planet card when there's no story yet)
  const empty = trans.hidden && card.hidden && encBox.hidden;
  bpStoryH.hidden = bpStory.hidden = empty;
  // what next: the cards
  const cards = [];
  const back = returning() && byNum(S.returnTo), reg = regionNow(), regs = regions().filter(regionOpen).length;
  const travelSub = following() ? 'Follow the Meridian signal' : back ? (S.home === back.p.num ? 'Home to ' : 'Back to ') + nm(back.p) : 'A new world' + (reg && regs > 1 ? ' in ' + reg.name : '');
  const tp = el('div', { class: 'sx-cardpick' }, exploreSel.hidden ? null : exploreSel, regionSel.hidden ? null : regionSel);
  cards.push(choiceCard('explore', 'Travel on', travelSub, tp.childNodes.length ? tp : null));
  const acts = actsFor(p);
  if (acts.length) { const a = stayAct(), left = p ? placesLeft(p) : 0; const at = stayPlace(); cards.push(choiceCard('stay', 'Stay here', a.name + (at ? ' at ' + placeName(at) : '') + (left ? ' · ' + left + ' place' + (left === 1 ? '' : 's') + ' to find' : ''), el('div', { class: 'sx-cardpick' }, staySel))); }
  const mo = mysPicked(); if (mo) { const m = mysDef(mo.id); cards.push(choiceCard('mystery', 'Observe', m.title + ' · ' + mo.step + ' of ' + m.steps.length, S.mys.length > 1 ? el('div', { class: 'sx-cardpick' }, mysSel) : null)); }
  if (p && chHere() && !atDoor()) cards.push(choiceCard('campaign', 'Meridian', 'Chapter ' + (p.story.ch + 1) + ', part ' + (p.story.step + 1)));
  bpCards.replaceChildren(...cards);
  // the picked card's details
  const cm = curMission(), det = [];
  if (cm === 'stay' && expediting()) { const x = exOf(p), leg = exLeg(p, x.step);
    det.push(bpLegBar(x.step, x.step, EX_LEN, k => EX_PARTS[k]), el('p', {}, leg[0]), pathPick(x.pick, lock, leg, bold => exPathTip(x.step, bold), v => { (p.ex = p.ex || { step: 0, pick: 0, poi: [] }).pick = v; save(); drawBreak(); })); }
  else if (cm === 'stay' && salvaging()) { const leg = derelictLeg(p);
    det.push(el('p', {}, leg[0]), pathPick(p.derelict.pick, lock, leg, bold => bold ? 'A riskier search, a rarer find' : 'A careful search, a sure find', v => { p.derelict.pick = v; save(); drawBreak(); })); }
  else if (cm === 'campaign' && p && chHere()) det.push(...chapterBits(p, lock, bpLegBar));
  else if (cm === 'mystery' && mo) det.push(el('p', { class: 'sx-story' }, mo.log[mo.log.length - 1]), el('small', { class: 'sl-muted' }, 'Found on ' + mo.origin));
  else { const g = misGives(cm); if (g) det.push(el('p', { class: 'sl-muted' }, g)); }
  bpDetail.replaceChildren(...det);
}
