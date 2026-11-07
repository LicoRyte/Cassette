/* Solarist: Planetarium: flip through your charted worlds. */
'use strict';

// ---------- Planetarium: flip through your charted worlds in 3D on the main screen (allowed during study, it's just looking) ----------
const pvP = () => pv && pv.list[pv.i] ? pv.list[pv.i].p : null;
function pvOpen(list, num) {
  list = list && list.length ? list.slice() : S.found.slice().reverse(); if (!list.length) return;
  pv = { list, i: Math.max(0, list.findIndex(f => f.p.num === num)) }; S.cnt.pv = (S.cnt.pv || 0) + 1; tab('timer'); root.classList.add('sx-pv'); drawPv(); draw();
}
function pvClose(quiet) { if (!pv) return; pv = null; root.classList.remove('sx-pv'); pvBar.hidden = true; if (!quiet) draw(); }
function pvStep(d) { if (!pv) return; pv.i = (pv.i + d + pv.list.length) % pv.list.length; drawPv(); drawName(); drawClock(); }
function drawPv() {
  const p = pvP(); if (!p) { pvClose(); return; } const x = p.x || (p.x = makeExtra(p));
  const bits = [p.star.startsWith('none') ? 'no star' : p.star, p.moons + ' moon' + (p.moons === 1 ? '' : 's'), p.rings ? 'rings' : null, p.life, fmtTemp(p), p.gravity + ' g', p.dist.toLocaleString() + ' ly from Earth'].filter(Boolean);
  pvBar.hidden = false;
  pvBar.replaceChildren(
    el('button', { type: 'button', class: 'btn sx-pv-arrow', 'aria-label': 'Previous world', onclick: () => pvStep(-1) }, '◂'),
    el('div', { class: 'sx-pv-info' }, el('b', {}, '🔭 ' + pad(p.num) + ' · ' + (pv.i + 1) + ' of ' + pv.list.length), el('small', {}, bits.join(' · ')),
      el('div', { class: 'sx-row-l' }, S.at !== p.num ? el('button', { type: 'button', class: 'sl-link', disabled: !canJump(p) || null, title: jumpTip(p), onclick: () => { pvClose(true); jumpTo(p); } }, '⚡ Jump here (' + S.hyper + ')') : null, el('button', { type: 'button', class: 'sl-link', onclick: () => { const n = p.num; pvClose(true); tab('log'); openWorld(n); } }, 'Open in the Logbook'),
        el('button', { type: 'button', class: 'sl-link', onclick: () => pvClose() }, 'Back to the voyage (Esc)'), el('span', { class: 'sx-pv-time' }))),
    el('button', { type: 'button', class: 'btn sx-pv-arrow', 'aria-label': 'Next world', onclick: () => pvStep(1) }, '▸'));
}
