/* Solarist: the story-first screen. Solarist is an episodic story now (js/game/season.js): every study session plays
   the next episode, and the crew's own moments fill in around it. What used to be game systems is switched off here:
   no missions to pick, no waypoint cards, no points, levels or achievements to chase. The planet is the stage, and
   your crew (made in the crew editor) is the cast. */
'use strict';

S.mission = 0; // every session is the next episode; the ship travels when the story does
// the planet is just the stage now: no waypoints or cards on it (you can still turn and zoom it)
drawGlobe = function () { globeLayer.hidden = true; wpCard.hidden = true; };
// nothing to unlock or chase
checkAch = function () {};
// the status line above the timer: where the story is
headline = function () {
  if (mode !== 'focus') return running ? 'On a break' : 'Docked. Take a breather';
  const s = seasonNow();
  if (!S.season) return running ? 'A new season begins' : 'Next: a new season';
  return (running ? 'Episode ' : 'Next: episode ') + s.ep + ' of ' + s.total + ' · ' + s.title;
};
// the rail under the timer on breaks: a choice the episode left you (or your answer), then what happened
drawBreak = function () {
  const lock = running && mode === 'focus', se = S.season, notes = [];
  if (se && se.ask) notes.push(el('div', { class: 'sx-note sx-choice' }, el('small', { class: 'sx-wp-k' }, 'Your choice'), el('p', { class: 'sx-choice-q' }, se.ask.prompt),
    el('div', { class: 'sx-choice-o' }, se.ask.options.map((o, i) => el('button', { type: 'button', class: 'btn' + (i ? '' : ' sl-go'), disabled: lock || null, onclick: () => seasonChoose(i) }, o.label))),
    el('small', { class: 'sl-muted' }, 'If you don\'t choose, the first one happens.')));
  else if (se && se.answered) notes.push(el('div', { class: 'sx-note sx-choice' }, el('small', { class: 'sx-wp-k' }, 'You chose'), el('p', {}, se.answered)));
  bpNotes.replaceChildren(...notes); bpNotes.hidden = !notes.length || lock;
  const empty = trans.hidden && card.hidden && encBox.hidden;
  bpStoryH.hidden = bpStory.hidden = storyPanel.hidden = empty;
};
