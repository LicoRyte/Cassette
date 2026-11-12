/* Solarist: the Learning log. After each study session the report asks, in one optional line, what you learned.
   Each note is saved with the world you were at, so your studying becomes a map: "Netue IV, where I learned photosynthesis". */
'use strict';

if (!Array.isArray(S.learn)) S.learn = []; // [{ at, t: what you learned, sub: subject, num: the world, mins: session length }]
const learnSubjects = () => [...new Set(S.learn.map(l => l.sub).filter(Boolean))].sort((a, b) => a.localeCompare(b));
const learnedAt = num => S.learn.filter(l => l.num === num);

// the box in the session report
const learnText = el('input', { type: 'text', class: 'sx-learn-t', maxlength: 140, placeholder: 'What did you learn? (optional)', 'aria-label': 'What did you learn this session?' });
const learnSub = el('input', { type: 'text', class: 'sx-learn-s', maxlength: 30, placeholder: 'Subject', 'aria-label': 'Subject', list: 'sx-learn-subs' });
const learnList = el('datalist', { id: 'sx-learn-subs' });
const learnMsg = el('small', { class: 'sl-muted sx-learn-m' });
const learnSave = el('button', { type: 'button', class: 'btn' }, 'Save');
const learnBox = el('div', { class: 'sx-learn', hidden: true }, el('div', { class: 'sx-learn-row' }, learnText, learnSub, learnSave, learnList), learnMsg);
let learnPending = null; // the session waiting for a note: { at, num, mins }
function learnAsk(on) { // called when a session ends (on) or a break ends (off)
  learnBox.hidden = !on; learnPending = on ? { at: Date.now(), num: S.at, mins: S.set.focus } : null;
  learnText.value = ''; learnMsg.textContent = ''; learnText.disabled = learnSub.disabled = learnSave.disabled = false;
  learnList.replaceChildren(...learnSubjects().map(s => el('option', { value: s })));
  const last = S.learn[S.learn.length - 1]; learnSub.value = last && last.sub ? last.sub : '';
}
function learnCommit() { // save the note, if there is one (Save, Enter, or closing the report)
  const t = learnText.value.trim(); if (!learnPending || !t) return;
  const sub = learnSub.value.trim().replace(/\s+/g, ' ');
  S.learn.push(Object.assign({}, learnPending, { t, sub }));
  learnPending = null; save();
  learnMsg.textContent = '📖 Saved to your Learning log' + (byNum(S.learn[S.learn.length - 1].num) ? ', at ' + nm(byNum(S.learn[S.learn.length - 1].num).p) : '') + '.';
  learnText.disabled = learnSub.disabled = learnSave.disabled = true;
}
learnSave.addEventListener('click', learnCommit);
[learnText, learnSub].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); learnCommit(); } }));
report.querySelector('.sx-report-ft').prepend(learnBox);

// one note as a row: what, subject, where, when
function learnRow(l, showWorld) {
  const w = byNum(l.num);
  return el('div', { class: 'sx-learn-i' }, el('b', {}, l.t),
    el('small', { class: 'sl-muted' }, (l.sub ? l.sub + ' · ' : '') + (showWorld && w ? '' : '') + new Date(l.at).toLocaleDateString(),
      showWorld && w ? el('span', {}, ' · ', el('button', { type: 'button', class: 'sl-link', onclick: () => { tab('log'); openWorld(l.num); } }, nm(w.p))) : null));
}
// on a world's Logbook page
function learnedHere(num) {
  const list = learnedAt(num); if (!list.length) return null;
  return el('div', { class: 'sx-sec sx-learn-here' }, el('h3', {}, '📖 Learned here'), ...list.map(l => learnRow(l, false)));
}
// the Learning tab on the Ship page: everything, newest first, with a subject filter
let learnFilter = '';
function learningView(group) {
  const subs = learnSubjects(); if (learnFilter && !subs.includes(learnFilter)) learnFilter = '';
  const list = S.learn.filter(l => !learnFilter || l.sub === learnFilter).slice().reverse();
  const mins = s => S.learn.filter(l => l.sub === s).reduce((a, l) => a + (l.mins || 0), 0);
  const chips = subs.length ? el('div', { class: 'sx-chips', role: 'tablist' }, [['', 'All', S.learn.length], ...subs.map(s => [s, s, S.learn.filter(l => l.sub === s).length])].map(([k, label, n]) =>
    el('button', { type: 'button', role: 'tab', 'aria-selected': String(learnFilter === k), title: k ? Math.round(mins(k) / 6) / 10 + ' hours of study notes' : '', onclick: () => { learnFilter = k; if (!journalPane.hidden) drawRight(); else drawShip(); } }, label, el('small', {}, String(n))))) : null;
  return [group('📖 Learning log', el('p', { class: 'sl-muted' }, S.learn.length ? S.learn.length + ' note' + (S.learn.length === 1 ? '' : 's') + ' from your study sessions, each saved with the world you were at.' : 'Nothing yet. After a study session, write one line about what you learned. It\'s saved with the world you were at.'),
    chips, ...list.slice(0, 300).map(l => learnRow(l, true)))];
}
