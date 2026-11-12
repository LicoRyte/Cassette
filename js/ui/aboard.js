/* Solarist: "Who's aboard?" On a first start, after the title sequence names you and your ship, one screen to make
   the captain and the crew: a name, pronouns, an age, a profession and a trait each. Everything starts filled in, so
   "All aboard" works straight away; the Crew page (Ship, Crew) changes anything later. */
'use strict';

let aboardOn = false;
function aboardNeeded() { return !S.opts.aboard && !S.total && !aboardOn; }
function showAboard() {
  if (!aboardNeeded()) return;
  aboardOn = true;
  if (!S.crew.length) { for (let k = 0; k < 2; k++) S.crew.push(newPerson()); } // two to start with: change them, or let them go
  const list = el('div', { class: 'sx-ab-list' });
  const done = el('button', { type: 'button', class: 'btn sl-go' }, 'All aboard');
  const box = el('div', { class: 'sx-intro sx-aboard', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sx-ab-h' },
    el('div', { class: 'sx-ab-w' },
      el('h2', { id: 'sx-ab-h' }, 'Who\'s aboard?'),
      el('p', { class: 'sl-muted' }, 'You, and up to ' + CREW_MAX + ' crew. They turn up in the stories of every session, shaped by who they are. Change anything later on the Ship page.'),
      list, el('div', { class: 'sx-ab-ft' }, done)));
  const row = (p, isMe, i) => {
    const name = el('input', { type: 'text', class: 'sl-find', maxlength: 28, value: isMe ? (hasMyName() ? meName() : '') : p.name, placeholder: isMe ? 'Your name' : 'Name', 'aria-label': isMe ? 'Your name' : 'Name' });
    name.addEventListener('change', () => { const v = name.value.trim().slice(0, 28); if (isMe) S.pilot = Object.assign(S.pilot || {}, { name: v, asked: true }); else if (v) p.name = v; save(); });
    const pron = el('select', { 'aria-label': 'Pronouns' }, PRONOUNS.map(x => el('option', { value: x, selected: p.pronouns === x || null }, x === 'they' ? 'they / them' : x === 'she' ? 'she / her' : 'he / him')));
    pron.addEventListener('change', () => { p.pronouns = pron.value; save(); });
    const age = el('input', { type: 'text', inputmode: 'numeric', class: 'sl-find sx-ab-age', maxlength: 4, value: String(p.age || ''), 'aria-label': 'Age' });
    age.addEventListener('change', () => { p.age = age.value.trim().slice(0, 4); save(); });
    const role = el('input', { type: 'text', class: 'sl-find', maxlength: 24, value: p.role || '', list: 'sx-prof-list', placeholder: 'Profession', 'aria-label': 'Profession' });
    role.addEventListener('change', () => { p.role = role.value.trim().slice(0, 24); save(); });
    const trait = el('select', { 'aria-label': 'Trait' }, txItems('trait').map(t => el('option', { value: t.id, selected: p.trait === t.id || null }, t.name)));
    trait.addEventListener('change', () => { p.trait = trait.value; save(); });
    const btns = el('div', { class: 'sx-ab-btns' },
      el('button', { type: 'button', class: 'btn sx-mini', onclick: () => { surprise(p); save(); draw1(); } }, 'Surprise me'),
      isMe ? null : el('button', { type: 'button', class: 'btn sx-mini', onclick: () => { S.crew.splice(i, 1); save(); draw1(); } }, 'Not this one'));
    return el('div', { class: 'sx-ab-p' }, el('b', { class: 'sx-ab-who' }, isMe ? 'You' : 'Crew'),
      el('div', { class: 'sx-ab-f' }, name, pron, el('label', { class: 'sx-ab-agel' }, 'Age ', age), role, trait), btns);
  };
  function draw1() {
    const add = S.crew.length < CREW_MAX ? el('button', { type: 'button', class: 'btn', onclick: () => { S.crew.push(newPerson()); save(); draw1(); } }, '+ Someone else') : null;
    list.replaceChildren(row(S.me, true), ...S.crew.map((c, i) => row(c, false, i)), add, profList.isConnected ? null : profList);
  }
  function close() {
    if (!aboardOn) return; aboardOn = false; S.opts.aboard = true;
    // anyone who came aboard gets a line in the logs
    S.crew.forEach(c => pushEv({ c: 'ship', ic: '', title: c.name + ' is aboard', t: crewLine(c), at: Date.now() }));
    save(); draw(); document.removeEventListener('keydown', keys, true);
    box.classList.remove('on'); setTimeout(() => box.remove(), 400);
  }
  function keys(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); } else if (e.key === ' ' && !/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.target.tagName)) e.stopImmediatePropagation(); }
  done.addEventListener('click', close);
  document.addEventListener('keydown', keys, true);
  draw1(); document.body.append(box);
  requestAnimationFrame(() => box.classList.add('on'));
  setTimeout(() => { const f = list.querySelector('input'); if (f) f.focus(); }, 80);
}
