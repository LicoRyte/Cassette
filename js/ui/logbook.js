/* Solarist: The Logbook and the Collection page. */
'use strict';

/* ---------- logbook ---------- */
// the Logbook: a grid of every world you've found; click one to open its own page (Back returns to the grid)
let openNum = null, gridScroll = 0, shownList = [];
const body = () => root.querySelector('.sl-body');
function openWorld(n) { if (openNum == null) gridScroll = body().scrollTop; openNum = n; drawLog(); body().scrollTop = 0; }
function closeWorld() { openNum = null; drawLog(); body().scrollTop = gridScroll; }
function drawLog() {
  const tools = logPane.querySelector('.sl-tools');
  if (openNum === 'items') openNum = null;
  const f0 = openNum != null && byNum(openNum);
  logHead.hidden = tools.hidden = !!f0;
  if (f0) { drawWorld(f0); return; }
  openNum = null;
  const ly = S.found.reduce((a, f) => a + f.p.dist, 0);
  const counts = {}; S.found.forEach(f => { counts[f.p.rarity] = (counts[f.p.rarity] || 0) + 1; });
  const tp = tunedP(), pc = posts().length;
  logHead.replaceChildren(
    el('div', { class: 'sx-loghead' }, el('b', {}, S.found.length + ' world' + (S.found.length === 1 ? '' : 's') + ' charted'), S.found.length ? el('button', { type: 'button', class: 'btn', title: 'Flip through the worlds shown below in 3D', onclick: () => pvOpen(shownList) }, '🔭 Planetarium') : null),
    el('div', { class: 'sl-muted' }, (ly + S.sold.ly).toLocaleString() + ' light-years of travel · ' + Math.round(S.minutes / 60 * 10) / 10 + ' hours studying' + (S.sold.n ? ' · 💰 ' + S.sold.n + ' sold for ✦ ' + S.sold.dust.toLocaleString() : '')),
    el('div', { class: 'sl-rarcount' }, RARITY.map(([k]) => el('span', { class: 'sl-rar sl-r-' + k.toLowerCase() }, k + ' ' + (counts[k] || 0)))),
    el('div', { class: 'sl-muted' }, pc ? pc + ' post' + (pc === 1 ? '' : 's') + (tp ? '. Satellite tuned to ' + nm(tp) : '. Satellite not tuned') + '. Manage them under Build on the main screen.' : 'No posts yet. Use Build on the right side of the main screen.'));
  logList.className = 'sl-list';
  if (!S.found.length) { logList.replaceChildren(el('p', { class: 'sl-empty' }, 'No worlds yet. Finish a trip on the Voyage tab to discover your first planet.')); return; }
  const q = find.value.trim().toLowerCase(), ty = typeSel.value, ra = rarSel.value;
  shownList = S.found.slice().reverse().filter(f => (!ty || (ty === '@post' ? !!f.p.post : f.p.type === ty)) && (!ra || f.p.rarity === ra) && (!q || ((f.p.custom || '') + ' ' + f.p.name + ' ' + f.p.code + ' ' + f.p.log + ' ' + f.p.biomes.join(' ')).toLowerCase().includes(q)));
  if (!shownList.length) { logList.replaceChildren(el('p', { class: 'sl-empty' }, 'No worlds match.')); return; }
  logList.className = 'sl-grid';
  const plain = !q && !ty && !ra, ROW = 12, blanks = plain ? Math.max(ROW, Math.ceil((shownList.length + 1) / ROW) * ROW) - shownList.length : 0;
  const unknown = () => el('span', { class: 'sl-tile sl-unknown', title: 'Still out there. Finish a study session to find it.' }, el('span', { class: 'sl-tile-pic' }, '???'), el('b', {}, '???'), el('small', {}, 'uncharted'));
  logList.replaceChildren(...shownList.slice(0, 400).map(f => {
    const p = f.p, tuned = S.tuned === p.num && !!p.post;
    const marks = (held(p) ? '🏴' : '') + (p.post ? (p.post.tp ? '🏘' : '🗼') : '') + (tuned ? '📡' : '');
    return el('button', { type: 'button', class: 'sl-tile sl-t-' + p.rarity.toLowerCase(), title: nm(p) + ' · ' + p.type + ' · ' + p.rarity, onclick: () => openWorld(p.num) },
      el('span', { class: 'sl-tile-pic' }, el('img', { src: paint(p, 32), alt: '' }), marks ? el('span', { class: 'sl-tile-m' }, marks) : null),
      el('b', {}, nm(p)), el('small', {}, pad(p.num) + ' · ' + p.type), exMeter(p));
  }), ...Array.from({ length: blanks }, unknown));
}
let bulkR = 'Common';
let itemCatTab = 'cur';
function drawItems() {
  const have = (c, r) => catList(c, r).filter((_, i) => S.items[itemId(c, r, i)]).length, catHave = c => ITEM_RARS.reduce((a, r) => a + have(c, r), 0);
  const nav = el('div', { class: 'sl-wnav' }, el('b', {}, 'Collection: ' + itemCount() + ' / ' + ITEM_TOTAL), el('span', { class: 'sl-muted' }, Math.round(itemCount() / ITEM_TOTAL * 100) + '% found'));
  const tabs = el('div', { class: 'sl-stabs', role: 'tablist' }, CATS.map(([c, name]) => el('button', { type: 'button', role: 'tab', class: 'sl-stab' + (catOpen(c) ? '' : ' sx-lockt'), 'aria-selected': String(c === itemCatTab), onclick: () => { itemCatTab = c; drawItems(); } }, catOpen(c) ? name + ' ' + catHave(c) + '/' + catTotal(c) : '🔒 ' + name)));
  const [c, cname, blurb, need] = CATS.find(x => x[0] === itemCatTab) || CATS[0];
  const needN = need && !catOpen(c) ? RES_ALL.find(n => n[0] === need) : null;
  const groups = needN ? [el('p', { class: 'sx-lockmsg' }, '🔒 ' + catTotal(c) + ' ' + cname.toLowerCase() + ' to find. Research ' + needN[1] + ' (Xenology, ' + rcost(needN) + ' pts) and they start turning up.')] : ITEM_RARS.filter(r => catList(c, r).length).map(r => {
    const list = catList(c, r), h = have(c, r);
    return el('div', { class: 'sl-col-g' }, el('div', { class: 'sl-col-h' }, el('span', { class: 'sl-rar sl-r-' + r.toLowerCase() }, r), el('span', { class: 'sl-muted' }, h + ' / ' + list.length)),
      h ? el('ul', { class: 'sl-col-l' }, list.map((name, i) => [name, S.items[itemId(c, r, i)]]).filter(x => x[1]).sort((x, y) => x[0].localeCompare(y[0])).map(([name, it]) =>
        el('li', { class: 'sl-col-i sl-ci-' + r.toLowerCase(), title: 'First found ' + new Date(it.at).toLocaleDateString() + (it.from && byNum(it.from) ? ' on ' + nm(byNum(it.from).p) : '') }, name, it.n > 1 ? el('small', {}, ' ×' + it.n) : null))) : null,
      h < list.length ? el('div', { class: 'sl-col-more' }, (list.length - h) + ' more ' + r.toLowerCase() + ' ' + (list.length - h === 1 ? 'item' : 'items') + ' still out there') : el('div', { class: 'sl-col-more done' }, 'All ' + r.toLowerCase() + ' ' + cname.toLowerCase() + ' found!'));
  });
  itemsPane.replaceChildren(el('div', { class: 'sl-wpage' }, nav, el('p', { class: 'sl-muted' }, 'Expeditions turn them up on the worlds you explore, and derelicts hide a few more. What you find depends on the world: living worlds give specimens, strange ones give artifacts and relics. Outlaws drop weapon and tech parts. Trade Stations sell and swap them.'), tabs, el('p', { class: 'sl-muted' }, blurb + '.'), ...groups));
}
function drawWorld(f) {
  const p = f.p;
  const list = shownList.length ? shownList : S.found.slice().reverse(), i = list.findIndex(x => x.p.num === p.num);
  const prev = i > 0 ? list[i - 1] : null, next = i >= 0 && i < list.length - 1 ? list[i + 1] : null;
  const nav = el('div', { class: 'sl-wnav' },
    el('button', { type: 'button', class: 'btn', onclick: closeWorld }, '◂ Logbook'),
    el('button', { type: 'button', class: 'btn', onclick: () => pvOpen(shownList, p.num) }, '🔭 View in 3D'),
    jumpBtn(p),
    el('span', { class: 'sl-muted' }, i >= 0 ? (i + 1) + ' of ' + list.length : ''),
    el('span', { class: 'sl-wnav-r' },
      el('button', { type: 'button', class: 'btn', title: prev ? 'Previous: ' + nm(prev.p) : '', disabled: !prev || null, onclick: () => prev && openWorld(prev.p.num) }, '◂'),
      el('button', { type: 'button', class: 'btn', title: next ? 'Next: ' + nm(next.p) : '', disabled: !next || null, onclick: () => next && openWorld(next.p.num) }, '▸')));
  const cardEl = el('div', { class: 'sl-card sl-world' }, ...planetCard(p, 'log'));
  const sv = cardEl.querySelector('details.sl-more'); if (sv) sv.open = true;
  logList.className = 'sl-wpage';
  logList.replaceChildren(nav, el('div', { class: 'sl-muted sl-found-on' }, (S.at === p.num ? '📍 You are here · ' : '') + 'Discovered ' + new Date(f.at).toLocaleString()), cardEl);
}
logPane.addEventListener('keydown', e => { if (openNum == null || e.target.closest('input, select')) return; if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); closeWorld(); } });
function rename(p) {
  const v = window.prompt('Name this world (leave empty to restore "' + p.name + '"):', nm(p));
  if (v == null) return;
  const t = v.trim().slice(0, 32);
  if (t && t !== p.name) p.custom = t; else delete p.custom;
  save(); drawLog(); draw();
}
find.addEventListener('input', drawLog); typeSel.addEventListener('change', drawLog); rarSel.addEventListener('change', drawLog);
