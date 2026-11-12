/* Solarist: "Who's aboard?" On a first start, after the title sequence names you and your ship, the crew editor
   (js/ui/crew.js) fills the screen to make the captain and the crew. Everything starts filled in, so "All aboard"
   works straight away, and anything can be picked to wear: you're packing for the trip. Ship, Crew changes it later. */
'use strict';

let aboardOn = false;
function aboardNeeded() { return !S.opts.aboard && !S.total && !aboardOn; }
function showAboard() {
  if (!aboardNeeded()) return;
  aboardOn = true;
  if (!S.crew.length) { for (let k = 0; k < 2; k++) S.crew.push(newPerson()); } // two to start with: change them, or let them go
  crewSel = S.me.id;
  const body = el('div', { class: 'sx-ab-body' });
  const done = el('button', { type: 'button', class: 'btn sl-go' }, 'All aboard');
  const box = el('div', { class: 'sx-intro sx-aboard', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sx-ab-h' },
    el('div', { class: 'sx-ab-w' },
      el('header', { class: 'sx-ab-top' }, el('div', {}, el('h2', { id: 'sx-ab-h' }, 'Who\'s aboard?'),
        el('p', { class: 'sl-muted' }, 'You, and up to ' + CREW_MAX + ' crew. They turn up in the stories of every session, shaped by who they are and what they wear. Change anything later on the Ship page.')), done),
      body));
  const draw1 = () => body.replaceChildren(crewEditor({ create: true, redraw: draw1 }));
  function close() {
    if (!aboardOn) return; aboardOn = false; S.opts.aboard = true;
    S.crew.forEach(c => pushEv({ c: 'ship', ic: '', title: c.name + ' is aboard', t: crewLine(c), at: Date.now() })); // a line in the logs for everyone who came
    save(); draw(); document.removeEventListener('keydown', keys, true);
    box.classList.remove('on'); setTimeout(() => box.remove(), 400);
  }
  function keys(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); } else if (e.key === ' ' && !/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.target.tagName)) e.stopImmediatePropagation(); }
  done.addEventListener('click', close);
  document.addEventListener('keydown', keys, true);
  draw1(); document.body.append(box);
  requestAnimationFrame(() => box.classList.add('on'));
  setTimeout(() => { const f = body.querySelector('.sx-ed-name'); if (f) f.focus(); }, 80);
}
