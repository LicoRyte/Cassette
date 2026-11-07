/* Solarist: The title sequence: the ship's AI greets you on a black screen each time the app opens, and asks for
   your name and your ship's name if it doesn't know them yet. It can be turned off in Settings. */
'use strict';

if (!S.opts) S.opts = { intro: true };
if (!S.ship.named && S.ship.name !== 'The Lantern') S.ship.named = true; // ships renamed before this existed count as named
if (!S.pilot) S.pilot = { name: '', asked: false }; // the player's own name, asked once
const INTRO_SKIP = ['Escape'];
const captain = () => S.pilot.name ? 'Captain ' + S.pilot.name : 'traveler';

function introLines() { // what the AI says; an { ask } line asks for a name ('pilot' or 'ship')
  const back = (S.pilot.asked || S.ship.named) && S.total > 0;
  return [
    ...(S.pilot.asked ? [() => back ? 'Welcome back, ' + captain() + '!' : 'Hello again, ' + captain() + '!']
      : ['Hello, new traveler!', 'What should I call you?', { ask: 'pilot' }, () => S.pilot.name ? 'Nice to meet you, ' + captain() + '.' : 'A traveler of few words. I like that.']),
    'Welcome to the Solarist Interplanetary and Exploration Force.',
    'Our goal is to understand the universe.',
    ...(S.ship.named ? [() => 'The ' + S.ship.name.replace(/^The /, '') + ' is fueled and ready.'] : ['What\'s the name of your ship?', { ask: 'ship' }, () => S.ship.name + '? That sounds lively!']),
    'Thanks for being a part of our team.',
    () => 'See you on the other side, ' + captain() + '.',
  ];
}

let introOn = false;
function playIntro() {
  if (introOn) return; introOn = true;
  const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lines = introLines();
  const text = el('p', { class: 'sx-intro-t', 'aria-live': 'polite' });
  const nameIn = el('input', { type: 'text', class: 'sx-intro-in', maxlength: 28, autocomplete: 'off', spellcheck: 'false' });
  const nameOk = el('button', { type: 'button', class: 'btn sl-go' });
  const ask = el('div', { class: 'sx-intro-ask', hidden: true }, nameIn, nameOk);
  const tip = el('p', { class: 'sx-intro-tip' }, 'Click or press Space to continue');
  const skip = el('button', { type: 'button', class: 'sl-link sx-intro-skip' }, 'Skip');
  const box = el('div', { class: 'sx-intro', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Title sequence' },
    skip, el('div', { class: 'sx-intro-in-w' }, el('p', { class: 'sx-intro-who' }, 'Ship\'s AI'), text, ask, tip));
  document.body.append(box);
  requestAnimationFrame(() => box.classList.add('on'));

  let i = -1, typing = 0, full = '', auto = 0, done = false, asking = null;
  const clearT = () => { clearInterval(typing); typing = 0; clearTimeout(auto); auto = 0; };
  function finishLine() { clearT(); text.textContent = full; text.classList.remove('typing'); auto = setTimeout(next, 1400 + full.length * 35); }
  function next() {
    if (done) return; clearT(); i++;
    if (i >= lines.length) return close();
    const L = lines[i];
    if (L && L.ask) { // a question: show the box
      asking = L.ask; ask.hidden = false; tip.hidden = true; nameIn.value = '';
      nameIn.placeholder = asking === 'ship' ? S.ship.name : 'Your name';
      nameIn.setAttribute('aria-label', asking === 'ship' ? 'Your ship\'s name' : 'Your name');
      nameOk.textContent = asking === 'ship' ? 'That\'s her name' : 'That\'s me';
      setTimeout(() => nameIn.focus(), 50); return;
    }
    asking = null; ask.hidden = true; tip.hidden = false;
    full = typeof L === 'function' ? L() : L;
    if (still) { text.textContent = full; return finishLine(); }
    text.textContent = ''; text.classList.add('typing'); let k = 0;
    typing = setInterval(() => { k++; text.textContent = full.slice(0, k); if (full[k - 1] !== ' ') typeSnd(); if (k >= full.length) finishLine(); }, 32);
  }
  function step() { if (asking) return; if (typing) finishLine(); else next(); } // a click finishes the line, or moves on
  function answer() {
    if (!asking || done) return;
    const v = nameIn.value.trim().slice(0, 28);
    if (asking === 'ship') { if (v) S.ship.name = v; S.ship.named = true; }
    else { S.pilot.name = v; S.pilot.asked = true; }
    save(); draw(); next();
  }
  function close() {
    if (done) return; done = true; clearT(); introOn = false;
    document.removeEventListener('keydown', keys, true);
    if (asking === 'ship') { S.ship.named = true; save(); } // skipped at a question: keep what's there, don't ask again
    if (asking === 'pilot') { S.pilot.asked = true; save(); }
    box.classList.remove('on'); setTimeout(() => box.remove(), still ? 0 : 600);
  }
  function keys(e) { // the title sequence gets the keyboard first, so Space doesn't start the timer underneath
    if (e.target === nameIn) { if (e.key === 'Enter') { e.preventDefault(); answer(); } e.stopImmediatePropagation(); return; }
    if (INTRO_SKIP.includes(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); close(); return; }
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); step(); }
  }
  document.addEventListener('keydown', keys, true);
  box.addEventListener('click', e => { if (e.target === skip) return close(); if (e.target.closest('.sx-intro-ask')) return; step(); });
  nameOk.addEventListener('click', answer);
  setTimeout(next, still ? 0 : 500);
}

// Settings: turn it off, or watch it again
{
  const box = el('input', { type: 'checkbox', checked: S.opts.intro !== false || null });
  box.addEventListener('change', () => { S.opts.intro = box.checked; save(); });
  const snd = el('input', { type: 'checkbox', checked: S.opts.typeSnd !== false || null });
  snd.addEventListener('change', () => { S.opts.typeSnd = snd.checked; save(); });
  settingsPane.append(sec('Title sequence', el('label', { class: 'sx-check' }, box, ' Play the title sequence when Solarist opens'), el('label', { class: 'sx-check' }, snd, ' Typing sound for text that types itself out'),
    el('div', { class: 'sx-row-l' }, el('button', { type: 'button', class: 'btn', onclick: () => { tab('timer'); playIntro(); } }, 'Play it now'))));
}
