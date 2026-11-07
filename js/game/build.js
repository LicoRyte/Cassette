/* Solarist: Build jobs: Listening Posts, Travelers' Posts and their facility slots, plus Coordinator charging. */
'use strict';

// the Build mission is a "job": a new Listening Post, an upgrade to a Travelers' Post, or a facility at one
if (S.mission > 0 && !S.job) S.job = { k: 'post', num: S.mission };
const hasFac = (p, k) => !!(p.post && p.post.tp && p.post.tp.fac.some(x => x.k === k));
// a Travelers' Post only has room for a few facilities: 5, and one more once it grows into a Town
const FS = E.facilitySlots, slotBuyMax = () => Math.max(0, Math.round(FS.max - FS.base - FS.atTown));
const facSlots = p => Math.min(Math.round(FS.max), Math.round(FS.base + ((p.post.tp.pop || 0) >= 1000 ? FS.atTown : 0) + (p.post.tp.extra || 0)));
const slotCost = p => Math.round(FS.buyBase * Math.pow(FS.buyGrowth, p.post.tp.extra || 0));
function buySlot(p) { const tp = p.post.tp, c = slotCost(p); if ((tp.extra || 0) >= slotBuyMax() || S.dust < c) return; S.dust -= c; tp.extra = (tp.extra || 0) + 1; S.cnt.slots = (S.cnt.slots || 0) + 1; shopXP(15); save(); draw(); }
const slotFree = p => !!(p.post && p.post.tp) && p.post.tp.fac.length < facSlots(p);
const facName = f => f.name || FAC[f.k][1];
function postTheme(p) { const c = {}; p.post.tp.fac.forEach(f => { const t = FAC_THEME[f.k]; if (t) c[t] = (c[t] || 0) + 1; }); const top = Object.entries(c).sort((a, b) => b[1] - a[1]); return top.length && top[0][1] >= 2 && (!top[1] || top[0][1] > top[1][1]) ? THEMES[top[0][0]] : null; }
const postName = p => p.post.tp.name || (postTheme(p) ? postTheme(p)[1] + ' on ' + nm(p) : 'Travelers\' Post on ' + nm(p));
function building() {
  if (!(S.mission > 0) || !S.job) return null;
  if (S.job.k === 'room') return ROOMS[S.job.fac] && !roomLv(S.job.fac) ? { k: 'room', fac: S.job.fac, p: null, num: 0 } : null;
  const j = S.job, f = byNum(j.num); if (!f) return null; const p = f.p;
  if (j.k === 'post' && !p.post && !stationAt(p)) return { k: 'post', p };
  if (j.k === 'node' && !p.node && !held(p) && !stationAt(p)) return { k: 'node', p };
  if (j.k === 'upgrade' && p.post && !p.post.tp) return { k: 'upgrade', p };
  if (j.k === 'add' && p.post && p.post.tp && FAC[j.fac] && !hasFac(p, j.fac) && slotFree(p)) return { k: 'add', p, fac: j.fac };
  return null;
}
const jobText = j => j.k === 'room' ? 'Building the ' + ROOMS[j.fac][1] + ' on your ship' : j.k === 'node' ? 'Installing a Hyperdrive Node on ' + nm(j.p) : j.k === 'post' ? 'Building a Listening Post on ' + nm(j.p) : j.k === 'upgrade' ? 'Upgrading ' + nm(j.p) + ' to a Travelers\' Post' : 'Building a ' + FAC[j.fac][1] + ' at ' + nm(j.p);
const jobKey = j => j.k + ':' + (j.p ? j.p.num : j.num) + ':' + (j.fac || '');
function buildOptions() { // every job you could do next, grouped
  const out = { Facilities: [], Upgrades: [], 'New Listening Posts': [], 'Hyperdrive Nodes': [] };
  S.found.slice().reverse().forEach(({ p }) => {
    if (held(p)) return;
    if (!p.node && !stationAt(p)) out['Hyperdrive Nodes'].push({ k: 'node', num: p.num, label: 'Hyperdrive Node on ' + nm(p) + ' (' + pad(p.num) + ')' });
    if (!p.post) { if (!stationAt(p)) out['New Listening Posts'].push({ k: 'post', num: p.num, label: '🗼 Listening Post on ' + nm(p) + ' (' + pad(p.num) + ')' }); }
    else if (!p.post.tp) out.Upgrades.push({ k: 'upgrade', num: p.num, label: '🏘 Upgrade ' + nm(p) + ' to a Travelers\' Post' });
    else if (slotFree(p)) Object.keys(FAC).filter(k => !hasFac(p, k)).forEach(k => out.Facilities.push({ k: 'add', num: p.num, fac: k, label: FAC[k][0] + ' ' + FAC[k][1] + ' at ' + nm(p) }));
  });
  return out;
}
const anyBuild = () => { const o = buildOptions(); return Object.values(o).some(a => a.length); };
function fillBuildSel(selEl, skip) {
  const o = buildOptions();
  selEl.replaceChildren(...Object.entries(o).filter(([g, a]) => a.length && g !== skip).map(([g, a]) => el('optgroup', { label: g }, a.slice(0, 300).map(j => el('option', { value: j.k + ':' + j.num + ':' + (j.fac || '') }, j.label)))));
}
function setJob(key) { const [k, n, fac] = key.split(':'); S.mission = 1; S.job = { k, num: +n, fac: fac || undefined }; save(); hint.textContent = ''; draw(); }
// Interplanetary Coordinator: spend one study session charging it, and your next trip is a lucky one (one charge, no stacking)
const charging = () => S.mission === -1 && !S.coord;
