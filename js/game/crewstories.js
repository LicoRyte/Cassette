/* Solarist: crew stories. Now and then a crew member starts a little storyline of their own (content/stories.json),
   picked to fit who they are: learning to paint, a letter home, the perfect soup. It moves on a step every few study
   sessions, shows in the session report and the Journal ("Crew stories"), and ends with a small scene, sometimes a
   keepsake for the stash. Everyone can have one story going at a time; nobody gets the same one twice. */
'use strict';

if (!S.cstory || typeof S.cstory !== 'object') S.cstory = {}; // person id -> { id, step, log: [lines so far], at }
if (!Array.isArray(S.cstoryDone)) S.cstoryDone = []; // [{ who: person id, name, id, at }]
const storyDef = id => (TEXT.stories || []).find(s => s.id === id) || null;
const storyCtx = c => Object.assign(atP() ? worldCtx(atP()) : {}, { crew: personCtx(c), ship: S.ship.name.replace(/^The /, 'the ') });
const pickOne = L => L[Math.floor(Math.random() * L.length)];
// after every finished study session: maybe a story moves on, or maybe one begins
function crewStoryTick(reps) {
  if (!S.crew.length) return;
  Object.keys(S.cstory).forEach(id => { if (!S.crew.some(c => c.id === id) || !storyDef(S.cstory[id].id)) delete S.cstory[id]; }); // they left, or the story was removed
  const active = S.crew.filter(c => S.cstory[c.id]);
  if (active.length && Math.random() < .4) {
    const c = pickOne(active), o = S.cstory[c.id], d = storyDef(o.id), ctx = storyCtx(c);
    const t = txFill(d.steps[Math.min(o.step, d.steps.length - 1)], ctx); o.log.push(t); o.step++;
    let got = null, title = firstName(c) + ': ' + d.title + ' · ' + o.step + ' of ' + d.steps.length, text = t;
    if (o.step >= d.steps.length) { // the end
      const end = d.end ? txFill(d.end, ctx) : ''; if (end) { o.log.push(end); text = t + ' ' + end; }
      const keep = d.keepsake && itemById(d.keepsake); if (keep) { S.stash.push(keep.id); got = capFirst(keep.name) + ' (a keepsake, in the stash)'; }
      S.cstoryDone.push({ who: c.id, name: c.name, id: d.id, at: Date.now(), log: o.log.slice() }); delete S.cstory[c.id];
      S.cnt.storiesDone = (S.cnt.storiesDone || 0) + 1; award(20, 15); title = firstName(c) + ': ' + d.title + ' (the end)';
    }
    reps.push({ ev: { battle: true, ic: '', title, t: text, got } }); pushEv({ c: 'crew', ic: '', title, t: text, got, at: Date.now() });
    return;
  }
  if (Math.random() >= .2) return; // a new story starts now and then
  const free = S.crew.filter(c => !S.cstory[c.id]); if (!free.length) return;
  const c = pickOne(free), ctx = storyCtx(c), had = new Set(S.cstoryDone.filter(x => x.who === c.id).map(x => x.id)), open = new Set(Object.values(S.cstory).map(o => o.id));
  const fits = (TEXT.stories || []).filter(s => !had.has(s.id) && !open.has(s.id) && txFits(s, ctx)); if (!fits.length) return;
  const tagged = fits.filter(s => s.when && Object.keys(s.when).length), d = pickOne(tagged.length && Math.random() < .8 ? tagged : fits); // stories made for who they are come first
  const t = txFill(d.start, ctx); S.cstory[c.id] = { id: d.id, step: 0, log: [t], at: Date.now() };
  const title = firstName(c) + ': ' + d.title;
  reps.push({ ev: { battle: true, ic: '', title: 'A story begins. ' + title, t } }); pushEv({ c: 'crew', ic: '', title: 'A story begins. ' + title, t, at: Date.now() });
}
// for the crew editor: what's going on with them
function storyOf(c) {
  const o = S.cstory[c.id], d = o && storyDef(o.id), done = S.cstoryDone.filter(x => x.who === c.id).map(x => storyDef(x.id)).filter(Boolean);
  return { now: d ? { title: d.title, step: o.step, total: d.steps.length, log: o.log } : null, done: done.map(x => x.title) };
}
