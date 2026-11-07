/* Solarist: Toasts, medal checks, and the Medals, Crew, Ship, Hangar and Stats views. */
'use strict';

const toast = el('div', { class: 'sx-toast', 'aria-live': 'polite', hidden: true }); root.append(toast);
let toastT = 0;
function showToast(lines) { toast.replaceChildren(...lines.map(t => el('div', {}, t))); toast.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { toast.hidden = true; }, 6000); }
let achFirst = true;
function checkAch() {
  const fresh = ACH.filter(a => !S.ach[a.id] && (!a.req || hasT(a.req)) && (() => { try { return !!a.test(); } catch (e) { return false; } })());
  if (!fresh.length) { achFirst = false; return; }
  fresh.forEach(a => { S.ach[a.id] = Date.now(); });
  if (achFirst && fresh.length > 2) { showToast(['🏅 ' + fresh.length + ' achievements unlocked', 'See them on the Ship page, under Medals.']); }
  else { fresh.forEach(a => pushEv({ ic: '🏅', title: 'Achievement: ' + a.name, t: a.desc + '.', at: Date.now() })); award(10 * fresh.length, 0); flushXP([]); showToast(fresh.slice(0, 3).map(a => '🏅 ' + a.name + ': ' + a.desc)); }
  achFirst = false; save();
}
function medalsView(group) {
  const VIS = ACH.filter(a => !a.req || hasT(a.req) || S.ach[a.id]), hid = ACH.length - VIS.length, got = VIS.filter(a => S.ach[a.id]).length;
  const out = [el('p', { class: 'sl-muted' }, got + ' of ' + VIS.length + ' unlocked.' + (hid ? ' ' + hid + ' more are hidden until you research the right things.' : ''))];
  [...new Set(VIS.map(a => a.grp))].forEach(g => { const list = VIS.filter(a => a.grp === g);
    out.push(group(g + ' (' + list.filter(a => S.ach[a.id]).length + ' / ' + list.length + ')', el('div', { class: 'sx-medals' }, list.map(a => el('div', { class: 'sx-medal' + (S.ach[a.id] ? ' on' : '') }, el('span', { class: 'sx-medal-i' }, a.ic), el('b', {}, a.name), el('small', {}, a.desc + (S.ach[a.id] ? '. ' + new Date(S.ach[a.id]).toLocaleDateString() : '')))))));
  });
  return out;
}
function crewView(group) { // who's aboard (hiring happens in the Crew tab on the right)
  const out = [];
  out.push(group('Your crew (' + S.crew.length + ' / ' + bunks() + ' bunks)', S.crew.length ? el('div', { class: 'sl-mods' }, S.crew.map(c => el('div', { class: 'sl-mod' }, el('span', { class: 'sl-mod-i' }, ROLES[c.role][0]),
      el('span', { class: 'sl-row-t' }, el('b', {}, c.name), el('small', {}, c.role + '. ' + c.name.split(' ')[0] + ' ' + c.trait + '. ' + ROLES[c.role][1] + '.'))))) : el('p', { class: 'sl-muted' }, 'Nobody aboard yet. Hire crew from the Crew tab on the right (you need Crew Quarters first). Each one adds a Ship Activity: a little story and a small bonus every session.')));
  return out;
}
function shipView(group) { // the ship: walk-through cutaway with decorating, then the numbers
  const nameIn = el('input', { type: 'text', class: 'sl-find', value: S.ship.name, maxlength: 28, 'aria-label': 'Ship name' });
  nameIn.addEventListener('change', () => { S.ship.name = nameIn.value.trim().slice(0, 28) || 'The Lantern'; S.ship.named = true; save(); draw(); });
  const pilotIn = el('input', { type: 'text', class: 'sl-find', value: (S.pilot && S.pilot.name) || '', placeholder: 'Your name', maxlength: 28, 'aria-label': 'Your name' });
  pilotIn.addEventListener('change', () => { S.pilot = { name: pilotIn.value.trim().slice(0, 28), asked: true }; save(); draw(); });
  const rooms = Object.entries(ROOMS).map(([k, [ic, name, what]]) => { const l = roomLv(k); return el('tr', {}, el('td', {}, ic + ' ' + name), el('td', {}, l ? 'Lv ' + l : '-'), el('td', {}, what)); });
  const mods = Object.entries(MODS).map(([k, [ic, name, eff, what]]) => el('tr', {}, el('td', {}, ic + ' ' + name), el('td', {}, 'Lv ' + lvl(k) + ' / ' + modMax(k)), el('td', {}, eff(lvl(k)) + ' ' + what)));
  return [group('Inside the ' + S.ship.name.replace(/^The /, ''), ...interiorView()), group('Names', el('label', { class: 'sx-namerow' }, 'Ship ', nameIn), el('label', { class: 'sx-namerow' }, 'Captain ', pilotIn)),
    group('Rooms', el('table', { class: 'sl-rec sl-stats' }, el('tbody', {}, rooms))), group('Modules', el('table', { class: 'sl-rec sl-stats' }, el('tbody', {}, mods)))];
}
function hangarView() { // right side: hire and manage crew
  const out = [], cost = crewCost(), free = bunks() - S.crew.length, pool = crewPool();
  out.push(el('div', { class: 'sx-res' }, el('b', {}, '✦ ' + S.dust.toLocaleString()), el('small', {}, 'resources')));
  out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Hire crew', el('small', { class: 'sx-h-n' }, ' ' + S.crew.length + ' / ' + bunks() + ' bunks')),
    el('p', { class: 'sl-muted' }, !bunks() ? 'Build the Crew Quarters first (Build tab, "Your ship").' : free > 0 ? 'New faces every day.' : 'No free bunks. Upgrade the Crew Quarters.'),
    ...(pool.length ? pool.map((c, i) => el('div', { class: 'sx-up' }, el('b', {}, ROLES[c.role][0] + ' ' + c.name), el('small', {}, c.role + ', says they ' + c.trait + '. ' + ROLES[c.role][1] + '.'),
      el('button', { type: 'button', class: 'btn sx-buy', disabled: free <= 0 || S.dust < cost || null, onclick: () => recruit(i) }, '✦ ' + cost.toLocaleString()))) : [el('p', { class: 'sl-muted' }, 'Everyone today has been hired. Check back tomorrow.')])));
  if (S.crew.length) out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Aboard'), ...S.crew.map((c, i) => el('div', { class: 'sx-up' }, el('b', {}, ROLES[c.role][0] + ' ' + c.name), el('small', {}, c.role), armBtn('Let go', 'Sure?', () => dismiss(i), 'sx-buy')))));
  return out;
}
function statsView(group) { // everything you've done, for bragging rights
  const fmtN = n => (n || 0).toLocaleString(), allP = S.found.map(f => f.p), pl = posts().map(f => f.p), tps = pl.filter(p => p.post.tp);
  const facs = tps.reduce((a, p) => a.concat(p.post.tp.fac), []), facLv = facs.reduce((a, f) => a + (f.lv || 1), 0), maxed = facs.filter(f => (f.lv || 1) >= FAC_MAX).length;
  const settlers = tps.reduce((a, p) => a + (p.post.tp.pop || 0), 0), heard = pl.reduce((a, p) => a + p.post.reports.length, 0);
  const itemsGot = Object.values(S.items).reduce((a, it) => a + it.n, 0), byR = r => CATS.reduce((a, [c]) => a + catList(c, r).filter((_, i) => S.items[itemId(c, r, i)]).length, 0);
  const charted = Object.values(S.cnt.rar).reduce((a, n) => a + n, 0), ly = allP.reduce((a, p) => a + p.dist, 0) + S.sold.ly;
  const modLv = Object.keys(MODS).reduce((a, k) => a + lvl(k), 0), hrs = S.minutes / 60;
  const cx = lvInfo(S.xp), ck = lvInfo(S.kn);
  const T = (title, rows) => group(title, el('table', { class: 'sl-rec sl-stats' }, el('tbody', {}, rows.filter(Boolean).map(([l, v]) => el('tr', {}, el('td', {}, l), el('td', {}, String(v)))))));
  return [
    T('⭐ Captain', [['⭐ Captain Level', cx.L + ' · ' + titleOf(CAPT, cx.L)], ['📚 Knowledge Level', ck.L + ' · ' + titleOf(KNOW, ck.L)], ['Total XP', fmtN(S.xp)], ['Total Knowledge', fmtN(S.kn)]]),
    T('🚀 Voyage', [['Study sessions finished', fmtN(S.total)], ['Hours studied', Math.round(hrs * 10) / 10], ['Days you studied', fmtN(S.cnt.days)], ['Most sessions in a day', S.rec.dayN ? S.rec.dayN.v : 0], ['★ Full Cycles earned', fmtN(S.cnt.fc)], ['🆘 Distress Runs completed', fmtN(S.drN)], ['Light-years traveled', fmtN(ly)]]),
    T('🪐 Worlds', [['Worlds discovered', fmtN(charted)], ...RARITY.map(([k]) => ['· ' + k, fmtN(S.cnt.rar[k])]), ['🧭 Lucky trips', fmtN(S.cnt.lucky)], ['🧭 Coordinator charges', fmtN(S.cnt.charge)], ['In your Logbook now', fmtN(S.found.length)], ['💰 Worlds sold', fmtN(S.sold.n) + ' for ✦ ' + fmtN(S.sold.dust)], ['🏆 Records held', REC.filter(([k]) => S.rec[k]).length]]),
    T('⚠ Adventures', [['Deep-space events', fmtN(S.cnt.ev)], ['Arrival encounters', fmtN(S.cnt.enc)], ['🏴 Outlaw gangs met', fmtN(S.cnt.outlaws)], ['⚔ Outlaw gangs beaten', fmtN(S.fights)], ['🎯 Bounties completed', fmtN(S.bDone)], ['🔍 Surveys', fmtN(S.surveys)]]),
    T('🎒 Collection', [['Unique collectibles', itemCount() + ' / ' + ITEM_TOTAL + ' (' + Math.round(itemCount() / ITEM_TOTAL * 100) + '%)'], ['Collectibles received (with duplicates)', fmtN(itemsGot)], ...ITEM_RARS.map(r => ['· ' + r, byR(r) + ' / ' + CATS.reduce((a, [c]) => a + (catOpen(c) ? catList(c, r).length : 0), 0)]), ...CATS.filter(([c]) => catOpen(c)).map(([c, name]) => ['· ' + name, ITEM_RARS.reduce((a, r) => a + catList(c, r).filter((_, i) => S.items[itemId(c, r, i)]).length, 0) + ' / ' + catTotal(c)])]),
    T('🏘 Posts', [['🗼 Listening Posts', fmtN(pl.length)], ['🏘 Travelers\' Posts', fmtN(tps.length)], ['Facilities built', fmtN(facs.length)], ['Facility levels (total)', fmtN(facLv)], ['Facilities at level ' + FAC_MAX, fmtN(maxed)], ['Settlers', fmtN(settlers)], ['📡 Transmissions heard', fmtN(heard)]]),
    T('✦ Economy', [['Resources now', fmtN(S.dust)], ['Resources earned (all time)', fmtN(S.dustTotal)], ['Resources spent', fmtN(S.dustTotal - S.dust)], ['Ship module levels (total)', fmtN(modLv)], ['Trade per session', fmtN(Math.round(tradeIncome() * INCOME))]]),
  ];
}
