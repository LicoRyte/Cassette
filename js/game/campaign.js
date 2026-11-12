/* Solarist: stories. The game is a shelf of long stories; you pick one to play, switch whenever you like, and each
   keeps its own place. Every finished study session plays the next episode of the story you're playing.
   Three kinds of story:
   - the Meridian (story.json, spoilers: never shown outside the game), told as three seasons of five chapters, each
     chapter its own fixed world: one episode to follow the signal there, then its five parts;
   - authored campaigns (content/stories/*.json): fixed worlds, seasons of written episodes, choices that set flags;
   - Voyages (content/seasons.json, js/game/season.js): short random seasons, endless. */
'use strict';

if (!S.camp || typeof S.camp !== 'object') S.camp = {}; // authored campaign id -> { s, e, flags, worlds: { worldId: num }, ask, answered, done, at }
const CAMPAIGNS = () => TEXT.campaigns || [];
const campOf = id => CAMPAIGNS().find(c => c.id === id) || null;
// a campaign's fixed world: made the first time the story goes there, the same every time after
function campWorld(c, wid) {
  const st = S.camp[c.id], f = st.worlds[wid] && byNum(st.worlds[wid]); if (f) return { p: f.p, fresh: false };
  const w = (c.worlds || {})[wid] || {}, num = S.nextNum++;
  let h = 2166136261; for (const ch of c.id + ':' + wid) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  let p = null; for (let k = 0; k < 4000 && !p; k++) { const q = makePlanet((h + k * 7919) >>> 0, num, false, 0); if (!w.type || q.type === w.type) p = q; }
  if (!p) p = makePlanet(h, num, false, 0);
  Object.assign(p, { name: w.name || nm(p), rarity: 'Rare', visit: 'none', log: w.desc || p.log }); if (w.star) p.star = w.star; if (w.rings != null) p.rings = !!w.rings;
  if (w.pal) p.look = Object.assign({}, p.look, { pal: w.pal.slice(), land: w.land || p.look.land, clouds: w.clouds != null ? !!w.clouds : p.look.clouds });
  delete p.lucky; p.x = makeExtra(p);
  S.found.push({ at: Date.now(), p }); st.worlds[wid] = p.num; S.cnt.rar[p.rarity] = (S.cnt.rar[p.rarity] || 0) + 1;
  return { p, fresh: true };
}
const campState = c => S.camp[c.id] = S.camp[c.id] || { s: 0, e: 0, flags: {}, worlds: {}, ask: null, answered: null, done: false, at: 0 };
const campCtx = (c, st) => Object.assign(atP() ? worldCtx(atP()) : {}, { crew: personCtx(S.crew.length ? S.crew[Math.floor(Math.random() * S.crew.length)] : S.me), captain: { name: meName() }, ship: S.ship.name.replace(/^The /, 'the '), flags: st.flags });
const campText = (list, ctx) => (list || []).filter(t => txFits(t, ctx)).map(t => txFill(typeof t === 'object' ? t.text : t, ctx));

/* ---------- the shelf: every story as { id, title, hook, themes, kind, place(), play(reps), notes(lock), line(), done() } ---------- */
function stories() {
  const out = [];
  if (STD) out.push({ id: 'meridian', kind: 'authored', title: 'The Meridian', themes: ['mystery', 'loss', 'what we leave behind'],
    hook: 'Five people left on a small survey ship and never came back. Their signal is still out there, leading somewhere.',
    done: () => S.story.done,
    place: () => { if (S.story.done) return 'Finished'; const ch = S.story.ch, p = chHere(); return 'Season ' + (Math.floor(ch / 5) + 1) + ' of 3 · Chapter ' + (ch + 1) + (p ? ', part ' + (Math.min(p.story.step, ST_LEGS - 1) + 1) + ' of ' + ST_LEGS : ': follow the signal'); },
    line: () => S.story.done ? 'The Meridian is finished' : chHere() ? (atDoor() ? 'The door is waiting' : 'Chapter ' + (S.story.ch + 1) + ', part ' + (chHere().story.step + 1) + ' of ' + ST_LEGS) : 'Follow the signal to chapter ' + (S.story.ch + 1),
    play: reps => {
      if (S.story.done) return { msg: 'The Meridian is finished. Pick another story on the Stories page.' };
      if (signalOn() && stP(S.story.ch)) { const { p } = followSignal(); if (chHere() && !atDoor()) return { p, how: 'log', msg: chLegDone(reps).replace(/Follow the Signal from Explore\./, 'Your next session follows it.').replace(/^📡 /, '') }; } // back to a chapter you'd started: the trip is part of the episode
      if (signalOn()) { const ch = S.story.ch, { p, fresh } = followSignal();
        reps.unshift({ ev: { battle: true, ic: '', title: 'The Meridian · Season ' + (Math.floor(ch / 5) + 1) + ' · Chapter ' + (ch + 1) + ': ' + nm(p), t: fresh ? 'The signal leads the ship down to ' + nm(p) + '. Whatever the Meridian left here is waiting.' : 'Back on ' + nm(p) + '. The chapter picks up where you left it.' } });
        return { p: fresh ? p : null, how: fresh ? 'story' : 'log', msg: 'Chapter ' + (ch + 1) + ' begins.' }; }
      if (chHere() && !atDoor()) return { msg: chLegDone(reps).replace(/Follow the Signal from Explore\./, 'Your next session follows it.').replace(/^📡 /, '') };
      return { msg: 'The door is waiting, under the timer.' };
    },
    notes: lock => { const p = chHere(); if (p) return chapterBits(p, lock, bpLegBar);
      if (!S.story.done && signalOn()) return [el('small', { class: 'sx-wp-k' }, 'The signal'), el('p', {}, signalText()), el('p', { class: 'sl-muted' }, 'Your next study session follows it.')]; return []; } });
  CAMPAIGNS().forEach(c => out.push({ id: c.id, kind: 'authored', title: c.title, themes: c.themes || [], hook: c.hook || '',
    done: () => !!(S.camp[c.id] && S.camp[c.id].done),
    place: () => { const st = S.camp[c.id]; if (c.loop) return st ? 'Moment ' + (st.e + 1) + ' of ' + c.seasons[0].episodes.length + ' (they come round again)' : 'Any time'; if (!st) return 'Not started'; if (st.done) return 'Finished'; const se = c.seasons[st.s]; return 'Season ' + (st.s + 1) + ' of ' + c.seasons.length + ' · Episode ' + (st.e + 1) + ' of ' + se.episodes.length; },
    line: () => { const st = campState(c); if (c.loop) return c.title + ': a quiet moment aboard'; if (st.done) return c.title + ' is finished'; const se = c.seasons[st.s]; return 'Episode ' + (st.e + 1) + ' of ' + se.episodes.length + ' · ' + se.title; },
    play: reps => campPlay(c, reps),
    notes: lock => campNotes(c, lock) }));
  out.push({ id: 'voyages', kind: 'voyage', title: 'Voyages', themes: ['short', 'always different'], hook: 'Short seasons that are never quite the same twice: a lighthouse gone dark, a festival on small moons, letters for nobody.',
    done: () => false,
    place: () => { const n = seasonNow(); return S.season ? n.line + ' · Episode ' + n.ep + ' of ' + n.total : 'A new season starts when you play'; },
    line: () => { const n = seasonNow(); return S.season ? 'Episode ' + n.ep + ' of ' + n.total + ' · ' + n.title : 'A new season'; },
    play: reps => { const st = seasonStep(reps); let p = null;
      if (st.travel) { p = makePlanet((Math.random() * 4294967296) >>> 0, S.nextNum++, false, .05, regionNow()); p.visit = 'none'; S.found.push({ at: Date.now(), p }); S.at = p.num; S.cnt.rar[p.rarity] = (S.cnt.rar[p.rarity] || 0) + 1; }
      return { p, how: 'new', msg: st.after ? st.after() : '' }; },
    notes: lock => voyageNotes(lock) });
  return out;
}
const storyById = id => stories().find(s => s.id === id) || null;
if (!S.activeStory || !storyById(S.activeStory)) S.activeStory = STD && !S.story.done ? 'meridian' : 'voyages';
const activeStory = () => { const s = storyById(S.activeStory) || storyById('voyages'); return s.done() && storyById('small-hours') ? storyById('small-hours') : s; }; // a finished story: quiet moments aboard until you pick the next
function setStory(id) { if (!storyById(id) || (running && mode === 'focus')) return; S.activeStory = id; S.lastStoryAt = Object.assign(S.lastStoryAt || {}, { [id]: Date.now() }); save(); draw(); }

/* ---------- authored campaigns ---------- */
function campPlay(c, reps) {
  const st = campState(c); if (st.done) return { msg: c.title + ' is finished. Pick another story on the Stories page.' };
  st.answered = null; if (st.ask) { st.flags[st.ask.options[0].flag] = 'yes'; st.ask = null; } // a choice nobody made: the first one happens
  const se = c.seasons[st.s], ep = se.episodes[st.e];
  let p = null, how = 'log';
  const wid = ep.world || st.cur; // the episode's world, or the one the story was last on (after playing something else, the ship flies back)
  if (wid) { st.cur = wid; const f = st.worlds[wid] && byNum(st.worlds[wid]); if (!f || S.at !== f.p.num) { const w = campWorld(c, wid); S.at = w.p.num; p = w.p; how = w.fresh ? 'new' : 'log'; } }
  const ctx = campCtx(c, st), t = campText(ep.text, ctx).join('\n\n'); // paragraphs stay paragraphs
  const last = st.e >= se.episodes.length - 1, title = c.loop ? c.title + ' · ' + ep.title : c.title + ' · Season ' + (st.s + 1) + ': ' + se.title + ' · ' + (last ? 'Finale' : 'Episode ' + (st.e + 1)) + (ep.title ? ': ' + ep.title : ''); // Small Hours: standalone moments, no seasons
  let got = null;
  if (ep.choice) { st.ask = { prompt: txFill(ep.choice.prompt, ctx), options: ep.choice.options.map(o => ({ label: txFill(o.label, ctx), flag: o.flag, reply: o.reply })) }; got = 'A choice waits on the break.'; }
  reps.unshift({ ev: { battle: true, ic: '', title, t, got } }); pushEv({ c: 'season', ic: '', title, t, got, at: Date.now() });
  st.at = Date.now();
  if (last) { st.e = 0; st.s++; if (st.s >= c.seasons.length) { if (c.loop) { st.s = 0; return { p, how, msg: '' }; } st.done = true; return { p, how, msg: 'The end of ' + c.title + '. Until you pick another story, Small Hours plays.' }; } return { p, how, msg: 'The end of season ' + st.s + '. Season ' + (st.s + 1) + ' starts with your next session.' }; }
  st.e++;
  return { p, how, msg: 'Episode ' + st.e + ' of ' + se.title + '.' };
}
function campNotes(c, lock) {
  const st = campState(c);
  if (st.ask) return [el('small', { class: 'sx-wp-k' }, 'Your choice'), el('p', { class: 'sx-choice-q' }, st.ask.prompt),
    el('div', { class: 'sx-choice-o' }, st.ask.options.map((o, i) => el('button', { type: 'button', class: 'btn' + (i ? '' : ' sl-go'), disabled: lock || null, onclick: () => campChoose(c, i) }, o.label))),
    el('small', { class: 'sl-muted' }, 'If you don\'t choose, the first one happens.')];
  if (st.answered) return [el('small', { class: 'sx-wp-k' }, 'You chose'), el('p', {}, st.answered)];
  return [];
}
function campChoose(c, i) {
  const st = campState(c), o = st.ask && st.ask.options[i]; if (!o) return;
  st.flags[o.flag] = 'yes'; const t = txFill(o.reply, campCtx(c, st)); st.ask = null; st.answered = t;
  pushEv({ c: 'season', ic: '', title: c.title + ': ' + o.label, t, at: Date.now() }); hint.textContent = t; save(); draw();
}
// Voyages' own choice and answer, in the same place as the others
function voyageNotes(lock) { const se = S.season; if (se && se.ask) return [el('small', { class: 'sx-wp-k' }, 'Your choice'), el('p', { class: 'sx-choice-q' }, se.ask.prompt),
  el('div', { class: 'sx-choice-o' }, se.ask.options.map((o, i) => el('button', { type: 'button', class: 'btn' + (i ? '' : ' sl-go'), disabled: lock || null, onclick: () => seasonChoose(i) }, o.label))),
  el('small', { class: 'sl-muted' }, 'If you don\'t choose, the first one happens.')];
  if (se && se.answered) return [el('small', { class: 'sx-wp-k' }, 'You chose'), el('p', {}, se.answered)]; return []; }
