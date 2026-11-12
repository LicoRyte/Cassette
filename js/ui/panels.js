/* Solarist: The Research panel and the latest-log line under the timer. */
'use strict';

function researchView() {
  const out = [el('div', { class: 'sx-res sx-kp' }, el('b', {}, S.kp.toLocaleString()), el('small', {}, 'Knowledge points to spend, here or on crafting (Ship, Crew). You earn one for every finished study session, Full Cycle, solved anomaly and Meridian chapter.'))];
  RESEARCH.forEach(([branch, list]) => {
    const nDone = list.filter(n => hasT(n[0])).length;
    out.push(el('div', { class: 'sx-sec' }, el('h3', {}, branch, el('small', { class: 'sx-h-n' }, ' ' + nDone + ' / ' + list.length)), ...list.map((node, i) => {
      const [id, name, , what, un] = node, cost = rcost(node);
      const done = hasT(id), prev = list[i - 1], lockedBy = prev && !hasT(prev[0]) ? prev[1] : null;
      const u = un || {}, md = ACH.filter(a => a.req === id).length, tags = [];
      if (u.cat) tags.push('🎒 ' + catName(u.cat));
      if (u.logs) tags.push('🗄 ' + u.logs.length + ' Ship Log' + (u.logs.length > 1 ? 's' : ''));
      if (md) tags.push('🏅 ' + md + ' achievement' + (md > 1 ? 's' : ''));
      const unl = tags.length ? el('span', { class: 'sx-unl' }, (done ? 'Unlocked: ' : 'Unlocks: ') + tags.join(' · '),
        done && u.logs ? el('button', { type: 'button', class: 'sl-link', onclick: () => { rightTab = 'tx'; txFilter = 'arc'; drawRight(); } }, 'Read') : null) : null;
      return el('div', { class: 'sx-up' + (done ? ' built' : lockedBy ? ' locked' : '') }, el('b', {}, name), el('small', {}, lockedBy ? 'Needs ' + lockedBy + '. ' + what : what, unl),
        done ? el('span', { class: 'sx-done' }, 'Done') : lockedBy ? el('span', { class: 'sx-max' }, cost + ' pts') : el('button', { type: 'button', class: 'btn sx-buy', disabled: S.kp < cost || null, onclick: () => doResearch(id) }, cost + ' pts'));
    })));
  });
  return out;
}
function drawFeed() {
  let best = null;
  posts().forEach(f => { const r = f.p.post.reports[f.p.post.reports.length - 1]; if (r && (!best || r.at > best.at)) best = { at: r.at, h: nm(f.p) + ', day ' + r.day, t: r.t }; });
  const e = S.events[S.events.length - 1]; if (e && (!best || e.at > best.at)) best = { at: e.at, h: e.title, t: e.t };
  feedLine.hidden = !best; if (best) feedLine.replaceChildren(el('b', {}, best.h + ': '), best.t);
}
