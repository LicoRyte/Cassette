/* Solarist: the left rail under the timer, on breaks: anything waiting for you (the Meridian door), then what happened
   last session. Choosing the next session happens on the planet itself: each waypoint opens a title card
   (js/ui/globe.js), and Travel on waits in orbit beside the planet. */
'use strict';

const bpLegBar = (n, now, total, label) => el('div', { class: 'sl-dr-legs sx-legs' }, Array.from({ length: total }, (_, k) => el('span', { class: k < n ? 'done' : k === now ? 'now' : '' }, label(k))));
function drawBreak() {
  const p = atP(), lock = running && mode === 'focus';
  // things waiting for an answer: the Meridian door (a swap waits on the trader's waypoint)
  const notes = [];
  if (p && p.story && STD && atDoor()) notes.push(el('div', { class: 'sx-note' }, ...chapterBits(p, lock, bpLegBar)));
  bpNotes.replaceChildren(...notes); bpNotes.hidden = !notes.length || lock;
  // what happened (the last session's story; the planet card when there's no story yet)
  const empty = trans.hidden && card.hidden && encBox.hidden;
  bpStoryH.hidden = bpStory.hidden = storyPanel.hidden = empty;
}
