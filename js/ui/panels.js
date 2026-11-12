/* Solarist: The latest-log line under the timer. (Research is a tech tree in the Workshop: js/ui/crew.js.) */
'use strict';

function drawFeed() {
  let best = null;
  posts().forEach(f => { const r = f.p.post.reports[f.p.post.reports.length - 1]; if (r && (!best || r.at > best.at)) best = { at: r.at, h: nm(f.p) + ', day ' + r.day, t: r.t }; });
  const e = S.events[S.events.length - 1]; if (e && (!best || e.at > best.at)) best = { at: e.at, h: e.title, t: e.t };
  feedLine.hidden = !best; if (best) feedLine.replaceChildren(el('b', {}, best.h + ': '), best.t);
}
