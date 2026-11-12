/* Solarist: the story-first screen. Solarist is a shelf of long stories (js/game/campaign.js): every study session
   plays the next episode of the one you're playing, and the crew's own moments fill in around it. What used to be
   game systems is switched off here: no missions, no waypoint cards, no points, levels or achievements.
   Also here: the Stories page (pick a story, switch any time) and the episode reader that opens after a session. */
'use strict';

S.mission = 0; // every session is the next episode; the ship travels when the story does
drawGlobe = function () { globeLayer.hidden = true; wpCard.hidden = true; }; // the planet is the stage: turn and zoom it, nothing to click on it
checkAch = function () {};
// the status line above the timer: where the story is
headline = function () {
  if (mode !== 'focus') return running ? 'On a break' : 'Docked. Take a breather';
  const s = activeStory();
  return (running ? 'Now: ' : 'Next: ') + s.line();
};
// the rail under the timer on breaks: what happened, then whatever the story left you (a choice, the signal, the door)
drawBreak = function () {
  const lock = running && mode === 'focus', bits = activeStory().notes(lock) || [];
  bpNotes.replaceChildren(...(bits.length ? [el('div', { class: 'sx-note sx-choice' }, ...bits)] : []));
  bpNotes.hidden = !bits.length || lock;
  const empty = trans.hidden && card.hidden && encBox.hidden;
  bpStoryH.hidden = bpStory.hidden = storyPanel.hidden = empty;
};

/* ---------- the Stories page ---------- */
const storiesPane = el('div', { class: 'sl-pane sx-stories', hidden: true });
page.querySelector('.sl-body').append(storiesPane);
const tabStories = el('button', { type: 'button', onclick: () => tab('stories') }, 'Stories');
root.querySelector('.sx-nav').prepend(tabStories);
const tabBase = tab;
tab = function (t) {
  if (t !== 'stories') { storiesPane.hidden = true; tabStories.removeAttribute('aria-current'); return tabBase(t); }
  tabBase('settings'); settingsPane.hidden = true; tabSet.removeAttribute('aria-current');
  storiesPane.hidden = false; tabStories.setAttribute('aria-current', 'page'); pageTitle.textContent = 'Stories'; drawStories();
};
function drawStories() {
  const lock = running && mode === 'focus', cur = S.activeStory, list = stories();
  storiesPane.replaceChildren(...[ // (replaceChildren would print an empty slot as the word null, so the list is filtered)
    el('p', { class: 'sx-st-lead' }, 'Every study session plays the next episode of the story you\'re playing. Switch whenever you like: each story keeps its own place and remembers your choices.'),
    lock ? el('p', { class: 'sl-muted' }, 'You can switch stories when this study session is over.') : null,
    el('div', { class: 'sx-st-shelf' }, list.map(s => {
      const on = s.id === cur, started = s.place() !== 'Not started';
      return el('article', { class: 'sx-st-card' + (on ? ' on' : '') + (s.done() ? ' done' : '') },
        el('small', { class: 'sx-wp-k' }, on ? 'Playing now' : s.kind === 'voyage' ? 'Endless' : s.done() ? 'Finished' : started ? 'In progress' : 'A new story'),
        el('h3', {}, s.title), el('p', { class: 'sx-st-hook' }, s.hook),
        s.themes.length ? el('p', { class: 'sx-st-th' }, s.themes.join(' · ')) : null,
        el('p', { class: 'sx-st-place' }, s.place()),
        on ? el('button', { type: 'button', class: 'btn', onclick: () => tab('timer') }, 'Back to it')
          : el('button', { type: 'button', class: 'btn sl-go', disabled: lock || null, onclick: () => { setStory(s.id); tab('timer'); } }, s.done() ? 'Read it again' : started ? 'Continue' : 'Start'));
    }))].filter(Boolean));
}

/* ---------- the episode reader: after a study session, the story fills the screen, one part at a time ---------- */
if (!S.opts) S.opts = {};
let rdrOn = false;
function openEpisodeReader() {
  if (rdrOn || S.opts.reader === false) return;
  const head = n => { const a = n.querySelector('.sl-trans-h'); if (a) return a.textContent.trim(); const b = n.querySelector('.sx-camp-h'); return b ? [...b.children].map(x => x.textContent.trim()).join(' · ') : ''; };
  const parts = [...trans.querySelectorAll('.sl-trans-i')].map(n => ({ h: head(n), camp: n.classList.contains('sx-camp'), ps: [...n.querySelectorAll('p')].map(p => ({ t: p.textContent, got: p.classList.contains('sl-ev-got') })) })).filter(x => x.ps.length);
  if (!parts.length) return;
  rdrOn = true;
  const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const kick = el('small', { class: 'sx-rdr-k' }), h = el('h2', { class: 'sx-rdr-h' }), body = el('div', { class: 'sx-rdr-b', 'aria-live': 'polite' });
  const next = el('button', { type: 'button', class: 'btn sl-go' }), pos = el('span', { class: 'sl-muted' });
  const box = el('div', { class: 'sx-rdr', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Episode' },
    el('div', { class: 'sx-rdr-in' }, kick, h, body, el('div', { class: 'sx-rdr-nav' }, pos, next)));
  document.body.append(box); requestAnimationFrame(() => box.classList.add('on'));
  let i = 0, typing = 0;
  const finishType = () => { clearInterval(typing); typing = 0; body.querySelectorAll('p').forEach(p => { p.textContent = p.dataset.full; p.classList.remove('sx-type'); }); };
  function show() {
    const x = parts[i], m = x.h.match(/^(.*?) · (Episode .*|Finale.*|Chapter .*)$/);
    kick.textContent = x.camp ? 'The Meridian' : m ? m[1] : (i ? 'Aboard' : 'Episode'); h.textContent = m ? m[2] : x.h;
    body.replaceChildren(...x.ps.map(p => el('p', { class: p.got ? 'sx-rdr-got' : '', 'data-full': p.t }, still ? p.t : '')));
    pos.textContent = (i + 1) + ' of ' + parts.length; next.textContent = i < parts.length - 1 ? 'Next' : 'Back to the ship';
    if (still) return;
    const ps = [...body.querySelectorAll('p')]; let k = 0, c = 0;
    typing = setInterval(() => { const p = ps[k]; if (!p) return finishType(); c += 2; p.textContent = p.dataset.full.slice(0, c); p.classList.add('sx-type'); if (c % 4 === 0) typeSnd(); if (c >= p.dataset.full.length) { p.classList.remove('sx-type'); k++; c = 0; } }, 24);
  }
  function step() { if (typing) return finishType(); if (i < parts.length - 1) { i++; show(); } else close(); }
  function close() { finishType(); rdrOn = false; document.removeEventListener('keydown', keys, true); box.classList.remove('on'); setTimeout(() => box.remove(), 300); draw(); }
  function keys(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); } else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); step(); } }
  next.addEventListener('click', step); box.addEventListener('click', e => { if (e.target === box) step(); });
  document.addEventListener('keydown', keys, true);
  show(); setTimeout(() => next.focus(), 50);
}
const openReportBase = openReport;
openReport = function (replay) { openReportBase(replay); if (!replay && mode !== 'focus') setTimeout(openEpisodeReader, 400); }; // after a study session (the break has just started)
// Settings: turn the reader off
{ const box = el('input', { type: 'checkbox', checked: S.opts.reader !== false || null });
  box.addEventListener('change', () => { S.opts.reader = box.checked; save(); });
  settingsPane.append(sec('Reading', el('label', { class: 'sx-check' }, box, ' Show each episode full screen when a study session ends'))); }
