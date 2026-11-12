/* Solarist: Save tools, the main layout pieces and the session report dialog. */
'use strict';

// ---------- the HUD: everything floats on black space. The page shell draws the planet into .sx-planet ----------
// backup, restore and a fresh start
function saveTools() {
  const box = el('div', {});
  const dl = el('button', { type: 'button', class: 'btn', onclick: () => {
    save(); const blob = new Blob([localStorage.getItem(KEY) || '{}'], { type: 'application/json' }), a = el('a', { href: URL.createObjectURL(blob), download: 'solarist-save-' + today() + '.json' });
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); } }, 'Download a backup');
  const file = el('input', { type: 'file', accept: '.json,application/json', hidden: true });
  file.addEventListener('change', () => { const f = file.files[0]; if (!f) return; f.text().then(t => { const d = JSON.parse(t); if (!d || typeof d !== 'object' || !Array.isArray(d.found)) throw new Error('not a save');
    wiping = true; localStorage.setItem(KEY, t); location.reload(); }).catch(() => { msg.textContent = 'That file isn\'t a Solarist save.'; }); });
  const up = el('button', { type: 'button', class: 'btn', onclick: () => file.click() }, 'Restore a backup');
  const wipe = el('button', { type: 'button', class: 'btn sx-danger' }, 'Start over from scratch');
  let stage = 0;
  wipe.addEventListener('click', () => {
    if (stage === 0) { stage = 1; wipe.classList.add('arm'); wipe.textContent = 'Erase everything? Click again'; setTimeout(() => { if (stage === 1) { stage = 0; wipe.classList.remove('arm'); wipe.textContent = 'Start over from scratch'; } }, 5000); return; }
    wiping = true; clearInterval(tickT); try { localStorage.removeItem(KEY); localStorage.removeItem(OLD_KEY); } catch (e) {} location.reload();
  });
  const msg = el('p', { class: 'sl-muted' }, 'Starting over erases every world, item, note, crew member and level. Download a backup first if you might want it back.');
  box.append(el('div', { class: 'sx-row' }, dl, up, wipe, file), msg);
  return box;
}
const sec = (title, ...kids) => el('div', { class: 'sx-sec' }, title ? el('h3', {}, title) : null, ...kids);
const cycleBar = el('div', { class: 'sx-cycle', 'aria-hidden': 'true' });
const nameBox = el('button', { type: 'button', class: 'sx-name', title: 'Open in the Logbook' });
const planetSpot = el('div', { class: 'sx-planet', 'aria-hidden': 'true' });
const pvBar = el('div', { class: 'sx-pvbar', hidden: true, role: 'region', 'aria-label': 'Planetarium' });
let pv = null; // Planetarium: { list: [found entries], i }
const leftCol = el('section', { class: 'sx-side sx-left', 'aria-label': 'Where you are' });
const rightCol = el('section', { class: 'sx-side sx-right', 'aria-label': 'Transmissions and research' });
const feedLine = el('button', { type: 'button', class: 'sx-feed', title: 'All transmissions and the ship\'s log', onclick: () => { rightTab = 'tx'; txFilter = 'all'; tab('timer'); drawRight(); } });
const reportBtn = el('button', { type: 'button', class: 'sl-link sx-replay', hidden: true, onclick: () => openReport(true) }, 'Last session report');
const reportSide = el('aside', { class: 'sx-report-side', hidden: true, 'aria-label': 'Survey data' });
const report = el('div', { class: 'sx-report', hidden: true, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Session report' },
  el('div', { class: 'sx-report-row' }, el('div', { class: 'sx-report-in' }, el('h2', {}, 'Session report'), encBox, trans, card, el('div', { class: 'sx-report-ft' }, el('button', { type: 'button', class: 'btn sl-go', onclick: () => closeReport() }, 'Continue'))), reportSide));
report.addEventListener('click', e => { if (e.target === report) closeReport(); });
let typeT = 0;
const typeSnd = () => { if (S.opts && S.opts.typeSnd === false) return; if (hooks.tick) hooks.tick(); }; // the typewriter blip (Settings can turn it off)
function typeOut() { // Meridian legs and transmissions print like an old ship terminal; a click on the report finishes them
  clearInterval(typeT);
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ps = [...trans.querySelectorAll('.sx-camp p:not(.sl-ev-got), .sl-trans-i:not(.sl-notes):not(.sl-event) > p')].filter(p => p.textContent.length > 0);
  const full = ps.map(p => p.textContent); ps.forEach(p => { p.textContent = ''; p.classList.add('sx-type'); });
  let i = 0, k = 0;
  const done = () => { clearInterval(typeT); ps.forEach((p, j) => { p.textContent = full[j]; p.classList.remove('sx-type'); }); report.removeEventListener('pointerdown', done); };
  report.addEventListener('pointerdown', done);
  typeT = setInterval(() => { if (i >= ps.length) return done(); k += 2; ps[i].textContent = full[i].slice(0, k); typeSnd(); if (k >= full[i].length) { ps[i].classList.remove('sx-type'); i++; k = 0; } }, 22);
}
function openReport(replay) { if (trans.hidden && card.hidden && encBox.hidden) return; report.hidden = false; reportBtn.hidden = false; if (!replay) typeOut(); const b = report.querySelector('.sx-report-ft .btn'); if (b) b.focus({ preventScroll: true }); }
function closeReport() { learnCommit(); report.hidden = true; }
