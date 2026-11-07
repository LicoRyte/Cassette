/* Solarist: The Reader: every log (the Transmissions feed) read one at a time like the title sequence.
   Left: filters and the list (click one to start there). Right: the log typed out, with Previous and Next. */
'use strict';

let rdFilter = 'all', rdOld = true, rdOn = false; // rdOld: oldest first, so Next reads forward in time
try { rdOld = localStorage.getItem('solarist-rd-order') !== 'new'; } catch (e) { }
const rdTitle = it => it.title || (it.p ? 'Transmission from ' + nm(it.p) : 'Log');
const rdCat = c => (TXF.find(f => f[0] === c) || [, 'Log'])[1];

function openReader(startAt) {
  if (rdOn) return; rdOn = true;
  const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let list = [], idx = 0, typing = 0, full = '';
  const chips = el('div', { class: 'sx-chips sx-rd-chips', role: 'tablist', 'aria-label': 'Filter' });
  const order = el('button', { type: 'button', class: 'sl-link sx-rd-order' });
  const items = el('div', { class: 'sx-rd-list', role: 'listbox', 'aria-label': 'Logs' });
  const head = el('p', { class: 'sx-intro-who sx-rd-cat' }), title = el('h2', { class: 'sx-rd-title' }), meta = el('p', { class: 'sx-rd-meta' });
  const body = el('div', { class: 'sx-rd-body', 'aria-live': 'polite' }), got = el('p', { class: 'sl-ev-got sx-rd-got' });
  const prev = el('button', { type: 'button', class: 'btn' }, '◂ Previous'), next = el('button', { type: 'button', class: 'btn sl-go' }, 'Next ▸'), pos = el('span', { class: 'sl-muted' });
  const close = el('button', { type: 'button', class: 'btn sx-rd-close', 'aria-label': 'Close the Reader' }, 'Close');
  const stage = el('div', { class: 'sx-rd-stage' }, el('div', { class: 'sx-rd-text' }, head, title, meta, body, got), el('div', { class: 'sx-rd-nav' }, prev, pos, next));
  const win = el('div', { class: 'sx-rd', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Reader' },
    el('div', { class: 'sx-rd-top' }, el('b', {}, 'Reader'), el('span', { class: 'sl-muted' }, '← → to move, Space to finish the line, Esc to close'), close),
    el('div', { class: 'sx-rd-cols' }, el('div', { class: 'sx-rd-side' }, chips, order, items), stage));
  document.body.append(win);
  requestAnimationFrame(() => win.classList.add('on'));

  function build(keepAt) { // the filtered list, oldest or newest first
    const feed = txFeed(), cnt = {}; feed.forEach(it => { cnt[it.c] = (cnt[it.c] || 0) + 1; });
    chips.replaceChildren(...TXF.filter(([k]) => k === 'all' || cnt[k]).map(([k, label]) => el('button', { type: 'button', role: 'tab', 'aria-selected': String(rdFilter === k), onclick: () => { rdFilter = k; build(); show(0); } },
      label, el('small', {}, String(k === 'all' ? feed.length : cnt[k])))));
    list = (rdFilter === 'all' ? feed : feed.filter(it => it.c === rdFilter)).slice();
    if (rdOld) list.reverse();
    order.textContent = rdOld ? 'Oldest first ⇅' : 'Newest first ⇅';
    items.replaceChildren(...list.map((it, i) => el('button', { type: 'button', role: 'option', class: 'sx-rd-item', 'data-i': i, onclick: () => show(i) },
      el('span', { class: 'sx-rd-ic', 'aria-hidden': 'true' }, it.icon || '•'), el('span', {}, el('b', {}, rdTitle(it)), el('small', {}, dayLabel(it.at) + ' · ' + hhmm(it.at))))));
    if (!list.length) items.replaceChildren(el('p', { class: 'sl-muted' }, 'Nothing here yet.'));
    if (keepAt != null) { const j = list.indexOf(keepAt); idx = j >= 0 ? j : 0; }
  }
  function stopType() { clearInterval(typing); typing = 0; }
  function show(i) { // one log, typed out like the title sequence
    stopType();
    if (!list.length) { head.textContent = ''; title.textContent = 'Nothing to read yet'; meta.textContent = ''; body.replaceChildren(); got.hidden = true; pos.textContent = ''; prev.disabled = next.disabled = true; return; }
    idx = Math.max(0, Math.min(list.length - 1, i));
    const it = list[idx];
    head.textContent = rdCat(it.c); title.textContent = (it.icon ? it.icon + ' ' : '') + rdTitle(it);
    meta.textContent = new Date(it.at).toLocaleString() + (it.day ? ' · Day ' + it.day : '');
    got.textContent = it.extra || ''; got.hidden = true;
    pos.textContent = (idx + 1) + ' of ' + list.length; prev.disabled = idx === 0 || null; next.disabled = idx === list.length - 1 || null;
    items.querySelectorAll('.sx-rd-item').forEach(b => { const on = +b.dataset.i === idx; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); if (on) b.scrollIntoView({ block: 'nearest' }); });
    full = String(it.t || ''); const p = el('p', { class: 'sx-rd-p' }); body.replaceChildren(p);
    if (still || !full) { p.textContent = full; got.hidden = !it.extra; return; }
    p.classList.add('typing'); let k = 0; const per = full.length > 400 ? 4 : full.length > 160 ? 2 : 1; // long logs type faster
    typing = setInterval(() => { k += per; p.textContent = full.slice(0, k); if (k >= full.length) { stopType(); p.classList.remove('typing'); got.hidden = !it.extra; } }, 24);
  }
  function finishOrNext() { if (typing) { stopType(); const p = body.firstChild; if (p) { p.textContent = full; p.classList.remove('typing'); } got.hidden = !got.textContent; } else show(idx + 1); }
  function shut() { stopType(); rdOn = false; document.removeEventListener('keydown', keys, true); win.classList.remove('on'); setTimeout(() => win.remove(), still ? 0 : 300); }
  function keys(e) { // the Reader gets the keyboard first, so Space doesn't start the timer underneath
    const k = e.key;
    if (k === 'Escape') shut(); else if (k === 'ArrowRight' || k === 'ArrowDown') show(idx + 1); else if (k === 'ArrowLeft' || k === 'ArrowUp') show(idx - 1);
    else if (k === ' ' || k === 'Enter') { if (e.target.closest && e.target.closest('.sx-rd-side button, .sx-rd-top button, .sx-rd-nav button')) return; finishOrNext(); }
    else return;
    e.preventDefault(); e.stopImmediatePropagation();
  }
  document.addEventListener('keydown', keys, true);
  prev.addEventListener('click', () => show(idx - 1)); next.addEventListener('click', () => show(idx + 1)); close.addEventListener('click', shut);
  stage.addEventListener('click', e => { if (!e.target.closest('button')) finishOrNext(); });
  order.addEventListener('click', () => { const cur = list[idx]; rdOld = !rdOld; try { localStorage.setItem('solarist-rd-order', rdOld ? 'old' : 'new'); } catch (e) { } build(cur); show(idx); });
  build();
  show(startAt === 'latest' ? (rdOld ? list.length - 1 : 0) : 0);
}

// the button in the top-right bar
{
  const readB = el('button', { type: 'button', title: 'Read every log one at a time', onclick: () => openReader('latest') }, 'Reader');
  root.querySelector('.sx-nav').insertBefore(readB, tabSet);
}
