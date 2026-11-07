/* Solarist: Build, Sell, Research and Trade panels. */
'use strict';

// Build: pick a world, then everything you can build or upgrade there, in order
let buildNum = null;
function buildView() {
  const locked = running && mode === 'focus', bj = building(), out = [];
  const up = (name, small, btn, cls) => el('div', { class: 'sx-up' + (cls ? ' ' + cls : '') }, el('b', {}, name), small ? el('small', {}, small) : null, btn || null);
  const queue = key => { const on = bj && jobKey(bj) === key; return el('button', { type: 'button', class: 'btn sx-buy' + (on ? ' on' : ''), disabled: locked || on || !!S.dr || null, title: 'Your next study session builds it', onclick: () => setJob(key) }, on ? 'Queued' : 'Queue'); };
  // what's queued
  out.push(el('div', { class: 'sx-queue' + (bj ? ' on' : '') }, el('small', {}, 'Next study session'),
    el('b', {}, bj ? jobText(bj) : S.dr ? 'The Distress Run comes first' : 'Nothing queued'),
    bj && !locked ? el('button', { type: 'button', class: 'sl-link', onclick: () => { S.mission = 0; S.job = null; save(); hint.textContent = ''; draw(); } }, 'Cancel') : null));
  const all = S.found.slice().reverse().map(f => f.p);
  if (!all.length) buildNum = 0;
  if (buildNum == null || (buildNum !== 0 && !byNum(buildNum))) { const a = atP(); buildNum = (a && !held(a) ? a : posts().length ? posts()[posts().length - 1].p : all[0]).num; }
  const label = p => nm(p) + (S.at === p.num ? ' (here)' : '') + (p.post ? (p.post.tp ? ', Travelers\' Post' : ', Listening Post') : '') + (p.node ? ', Node' : '') + (held(p) ? ', outlaws' : '');
  const withPost = all.filter(p => p.post || p.node), without = all.filter(p => !p.post && !p.node);
  const pick = el('select', { class: 'sx-wpick', 'aria-label': 'World to build on' },
    el('option', { value: 0, selected: buildNum === 0 || null }, 'Your ship: ' + S.ship.name),
    withPost.length ? el('optgroup', { label: 'Your posts' }, withPost.map(p => el('option', { value: p.num, selected: p.num === buildNum || null }, label(p)))) : null,
    without.length ? el('optgroup', { label: 'Other worlds' }, without.slice(0, 300).map(p => el('option', { value: p.num, selected: p.num === buildNum || null }, label(p)))) : null);
  pick.addEventListener('change', () => { buildNum = +pick.value; drawRight(); });
  out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Where'), pick));
  if (buildNum === 0) { // rooms on your own ship
    const rows = Object.entries(ROOMS).map(([k, [ic, name, what]]) => { const lv = roomLv(k), c = roomCost(lv + 1);
      return up(ic + ' ' + name + (lv ? ' ' + lv : ''), what + (lv ? '' : '. Takes one study session.'), !lv ? queue('room:0:' + k) : lv >= ROOM_MAX ? el('span', { class: 'sx-done' }, 'Max') : el('button', { type: 'button', class: 'btn sx-buy', disabled: S.dust < c || null, onclick: () => upgradeRoom(k) }, '✦ ' + c.toLocaleString()), lv ? '' : 'unbuilt'); });
    out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Rooms'), el('p', { class: 'sl-muted' }, 'New rooms take a study session. Upgrades cost resources. Crew live in the Crew Quarters (Ship page, Crew).'), ...rows));
    return out;
  }
  const p = byNum(buildNum).p, rows = [];
  if (held(p)) rows.push(el('p', { class: 'sl-muted' }, 'Outlaws hold ' + nm(p) + '. Fight them off (Explore turns into Fight) before building here.'));
  else {
    // step 1 and 2: the post itself
    rows.push(p.post ? up('Listening Post', 'Built. ' + p.post.reports.length + ' transmissions so far.', el('span', { class: 'sx-done' }, 'Built'), 'built')
      : stationAt(p) ? up('Listening Post', 'Not while an Interplanetary Station is parked here.', null, 'locked') : up('Listening Post', 'Hear transmissions from this world. One study session.', queue('post:' + p.num + ':')));
    rows.push(p.post && p.post.tp ? up('Travelers\' Post', tierOf(p.post.tp.pop || 0) + ', ' + (p.post.tp.pop || 0).toLocaleString() + ' settlers. Pays trade every session.', el('span', { class: 'sx-done' }, 'Built'), 'built')
      : p.post ? up('Travelers\' Post', 'Settlers, trade and facilities. One study session.', queue('upgrade:' + p.num + ':'))
        : up('Travelers\' Post', 'Needs a Listening Post first.', null, 'locked'));
    if (p.post) rows.push(el('div', { class: 'sx-row sx-postact' },
      S.tuned === p.num ? el('button', { type: 'button', class: 'btn', onclick: () => { S.tuned = 0; save(); draw(); } }, 'Untune satellite') : el('button', { type: 'button', class: 'btn', title: 'The tuned post reports every study session', onclick: () => { S.tuned = p.num; save(); draw(); } }, 'Tune satellite here'),
      el('button', { type: 'button', class: 'btn', onclick: () => rename(p) }, 'Rename world')));
    rows.push(p.node ? up('Hyperdrive Node', S.at === p.num ? 'Installed. You are here.' : 'Installed. Jump back any time.', jumpBtn(p, 'btn sx-buy') || el('span', { class: 'sx-done' }, 'Built'), 'built')
      : stationAt(p) ? up('Hyperdrive Node', 'Not while an Interplanetary Station is parked here.', null, 'locked') : up('Hyperdrive Node', 'Lets the ship jump back here from anywhere. One study session.', queue('node:' + p.num + ':')));
    out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Post'), ...rows));
    // step 3: facilities
    if (p.post && p.post.tp) {
      const tp = p.post.tp, built = tp.fac, frows = [], slots = facSlots(p), free = built.length < slots, th = postTheme(p);
      // who this post is: your name for it and a few words about it
      const nameIn = el('input', { type: 'text', class: 'sl-find', maxlength: 40, value: tp.name || '', placeholder: postName(p), 'aria-label': 'Post name', disabled: locked || null });
      nameIn.addEventListener('change', () => { const v = nameIn.value.trim().slice(0, 40); if (v) tp.name = v; else delete tp.name; save(); draw(); });
      const descIn = el('textarea', { class: 'sl-find sx-desc', maxlength: 220, rows: 2, placeholder: 'What is this post like? (optional)', 'aria-label': 'Post description', disabled: locked || null }, tp.desc || '');
      descIn.addEventListener('change', () => { const v = descIn.value.trim().slice(0, 220); if (v) tp.desc = v; else delete tp.desc; save(); });
      out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Identity'), el('p', { class: 'sl-muted' }, th ? th[0] + ' Its facilities make it a ' + th[1] + '.' : 'Build two or more facilities of one kind (food, science, fun, rest, work, culture) and the post gets a theme.'), nameIn, descIn));
      built.forEach(f => { const lv = f.lv || 1, max = lv >= FAC_MAX, c = facCost(lv + 1);
        const ren = el('button', { type: 'button', class: 'sl-link sx-ren', disabled: locked || null, title: 'Give it your own name', onclick: () => { const v = window.prompt('Name this ' + FAC[f.k][1] + ' (leave empty for the default):', f.name || ''); if (v == null) return; const t = v.trim().slice(0, 32); if (t) f.name = t; else delete f.name; save(); draw(); } }, '✎');
        frows.push(el('div', { class: 'sx-up' }, el('b', {}, FAC[f.k][0] + ' ' + facName(f) + ' ' + lv, ren), el('small', {}, (f.name ? FAC[f.k][1] + '. ' : '') + (max ? 'Max level' : 'Level ' + (lv + 1) + ': bigger numbers in its logs'), ' ', armBtn('Tear down', 'Sure? No refund', () => { tp.fac = tp.fac.filter(x => x !== f); S.cnt.torn = (S.cnt.torn || 0) + 1; pushEv({ c: 'ship', ic: FAC[f.k][0], title: 'Torn down: ' + facName(f), t: 'The ' + facName(f) + ' at ' + postName(p) + ' was cleared to make room.', at: Date.now() }); save(); draw(); }, 'sx-mini')),
          max ? el('span', { class: 'sx-done' }, 'Max') : el('button', { type: 'button', class: 'btn sx-buy', disabled: S.dust < c || null, onclick: () => upgradeFac(p, f) }, '✦ ' + c.toLocaleString()))); });
      if (free) Object.keys(THEMES).forEach(t => { const ks = Object.keys(FAC).filter(k => FAC_THEME[k] === t && !hasFac(p, k)); if (!ks.length) return;
        frows.push(el('p', { class: 'sx-themeh' }, THEMES[t][0] + ' ' + THEMES[t][1].replace(/ (Post|Stop)$/, '').replace('Research', 'Science'))); ks.forEach(k => frows.push(up(FAC[k][0] + ' ' + FAC[k][1], FAC_DESC[k], queue('add:' + p.num + ':' + k), 'unbuilt'))); });
      out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Facilities', el('small', { class: 'sx-h-n' }, ' ' + built.length + ' / ' + slots + ' slots')),
        el('p', { class: 'sl-muted' }, free ? 'Room for ' + (slots - built.length) + ' more. New ones take a study session, upgrades cost resources. Choose what this post is about.' : 'No room left. ' + ((tp.pop || 0) < 1000 ? 'It gets a free slot when it grows into a Town (1,000 settlers). ' : '') + 'Buy more land, or tear one down to build something else.'),
        (tp.extra || 0) < slotBuyMax() ? el('div', { class: 'sx-up sx-slotbuy' }, el('b', {}, '🧱 Buy more land'), el('small', {}, 'One more facility slot (' + (tp.extra || 0) + ' of ' + slotBuyMax() + ' bought, up to ' + FS.max + ' slots in all).'), el('button', { type: 'button', class: 'btn sx-buy', disabled: S.dust < slotCost(p) || null, onclick: () => buySlot(p) }, '✦ ' + slotCost(p).toLocaleString())) : el('p', { class: 'sl-muted' }, 'All the land there is: ' + FS.max + ' slots once it is a Town.'),
        ...frows));
    }
  }
  return out;
}
// Sell: survey rights go to the Cartographers' Guild
let sellShow = 20;
function sellView() {
  const out = [el('p', { class: 'sl-muted' }, 'The Cartographers\' Guild buys survey rights. The price follows the world\'s condition and how much it stands out. A sold world leaves your Logbook; records and collectibles stay.')];
  const list = S.found.map(f => f.p).filter(p => p.rarity === bulkR && !sellBlock(p) && !isRecord(p)), total = list.reduce((a, p) => a + sellPrice(p), 0);
  const rs = el('select', { 'aria-label': 'Rarity to sell' }, ['Common', 'Uncommon', 'Rare', 'Legendary'].map(r => el('option', { value: r, selected: r === bulkR || null }, r)));
  rs.addEventListener('change', () => { bulkR = rs.value; drawRight(); });
  out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Sell many at once'), el('div', { class: 'sx-row' }, rs, list.length ? armBtn('Sell ' + list.length + ' for ✦ ' + total.toLocaleString(), 'Click again to sell ' + list.length, () => { const got = sellWorlds(list); hint.textContent = 'Sold ' + list.length + ' ' + bulkR + ' world' + (list.length === 1 ? '' : 's') + ' for ✦ ' + got + '.'; draw(); }, 'sx-buy') : el('span', { class: 'sl-muted' }, 'None to sell')),
    el('p', { class: 'sl-muted' }, 'Skips posts, where you are, outlaw worlds, your next build and record holders.')));
  const sellable = S.found.slice().reverse().map(f => f.p).filter(p => !sellBlock(p)).map(p => [p, sellPrice(p)]).sort((a, b) => b[1] - a[1]);
  const rows = sellable.slice(0, sellShow).map(([p, v]) => el('div', { class: 'sx-up sx-sellrow' }, el('b', {}, nm(p)), el('small', {}, el('i', { class: 'sx-r-' + p.rarity.toLowerCase() }, p.rarity), ' ' + p.type + ', ' + p.x.hab + '% habitable' + (isRecord(p) ? ', holds a record' : '')),
    armBtn('✦ ' + v.toLocaleString(), 'Sell?', () => { const got = sellWorlds([p]); hint.textContent = 'Sold the survey rights to ' + nm(p) + ' for ✦ ' + got + '.'; draw(); }, 'sx-buy')));
  out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'One at a time'), sellable.length ? null : el('p', { class: 'sl-muted' }, 'Nothing to sell right now.'), ...rows,
    sellable.length > sellShow ? el('button', { type: 'button', class: 'sl-link', onclick: () => { sellShow += 20; drawRight(); } }, 'Show more (' + (sellable.length - sellShow) + ')') : null));
  return out;
}
function researchView() {
  const out = [el('div', { class: 'sx-res sx-kp' }, el('b', {}, S.kp.toLocaleString()), el('small', {}, 'Knowledge points. You earn one for every point of Knowledge.'))];
  RESEARCH.forEach(([branch, list]) => {
    const nDone = list.filter(n => hasT(n[0])).length;
    out.push(el('div', { class: 'sx-sec' }, el('h3', {}, branch, el('small', { class: 'sx-h-n' }, ' ' + nDone + ' / ' + list.length)), ...list.map((node, i) => {
      const [id, name, , what, un] = node, cost = rcost(node);
      const done = hasT(id), prev = list[i - 1], lockedBy = prev && !hasT(prev[0]) ? prev[1] : null;
      const u = un || {}, md = ACH.filter(a => a.req === id).length, tags = [];
      if (u.cat) tags.push('🎒 ' + catName(u.cat));
      if (u.logs) tags.push('🗄 ' + u.logs.length + ' Ship Log' + (u.logs.length > 1 ? 's' : ''));
      if (md) tags.push('🏅 ' + md + ' medal' + (md > 1 ? 's' : ''));
      const unl = tags.length ? el('span', { class: 'sx-unl' }, (done ? 'Unlocked: ' : 'Unlocks: ') + tags.join(' · '),
        done && u.logs ? el('button', { type: 'button', class: 'sl-link', onclick: () => { rightTab = 'tx'; txFilter = 'arc'; drawRight(); } }, 'Read') : null) : null;
      return el('div', { class: 'sx-up' + (done ? ' built' : lockedBy ? ' locked' : '') }, el('b', {}, name), el('small', {}, lockedBy ? 'Needs ' + lockedBy + '. ' + what : what, unl),
        done ? el('span', { class: 'sx-done' }, 'Done') : lockedBy ? el('span', { class: 'sx-max' }, cost + ' pts') : el('button', { type: 'button', class: 'btn sx-buy', disabled: S.kp < cost || null, onclick: () => doResearch(id) }, cost + ' pts'));
    })));
  });
  return out;
}
function tradeView() {
  const T = S.trader, here = byNum(T.num), out = [];
  const desc = id => { const { c, r } = parseId(id); return el('small', {}, el('i', { class: 'sx-r-' + r.toLowerCase() }, r), ' ' + ({ cur: 'curiosity', mat: 'material', art: 'artifact', wpn: 'weapon part', tec: 'tech part', spc: 'specimen', rel: 'relic', map: 'star chart', sig: 'signal', fos: 'fossil', coin: 'coin', ano: 'anomaly', stn: 'souvenir' }[c] || 'item') + (S.items[id] ? ', you have ' + S.items[id].n : ', new to you')); };
  out.push(el('div', { class: 'sx-queue on sx-trader' }, el('small', {}, 'Trade Station'), el('b', {}, T.name), el('span', { class: 'sl-muted' }, 'Docked at ' + (here ? nm(here.p) : 'a world') + '. It leaves when you travel on.')));
  out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'For sale'), T.stock.length ? null : el('p', { class: 'sl-muted' }, 'Sold out.'),
    ...T.stock.map((o, i) => el('div', { class: 'sx-up' }, el('b', {}, itemName(o.id)), desc(o.id), el('button', { type: 'button', class: 'btn sx-buy', disabled: S.dust < o.price || null, onclick: () => traderBuy(i) }, '✦ ' + o.price.toLocaleString())))));
  out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Swaps'), T.wants.length ? el('p', { class: 'sl-muted' }, 'They want something you have, and give something in return.') : el('p', { class: 'sl-muted' }, 'Nothing they want right now.'),
    ...T.wants.map((w, i) => { const has = S.items[w.want], only = has && has.n === 1;
      const act = () => traderSwap(i);
      return el('div', { class: 'sx-up sx-swap' }, el('b', {}, itemName(w.give)), el('small', {}, 'for your ' + itemName(w.want) + (has ? (only ? ' (your only one)' : ' (you have ' + has.n + ')') : ' (you don\'t have it)')),
        !has ? el('span', { class: 'sx-max' }, 'Need it') : only ? armBtn('Swap', 'Sure?', act, 'sx-buy') : el('button', { type: 'button', class: 'btn sx-buy', onclick: act }, 'Swap')); })));
  const spares = Object.keys(S.items).filter(k => S.items[k].n > 1 && itemName(k) !== '???').sort((a, b) => ITEM_RARS.indexOf(parseId(b).r) - ITEM_RARS.indexOf(parseId(a).r));
  out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Sell spares'), spares.length ? el('p', { class: 'sl-muted' }, 'Duplicates only. You always keep at least one.') : el('p', { class: 'sl-muted' }, 'No duplicates to sell.'),
    ...spares.slice(0, 12).map(id => el('div', { class: 'sx-up' }, el('b', {}, itemName(id) + ' ×' + S.items[id].n), desc(id), el('button', { type: 'button', class: 'btn sx-buy', onclick: () => traderSell(id) }, '+✦ ' + spareP(id))))));
  return out;
}
function drawFeed() {
  let best = null;
  posts().forEach(f => { const r = f.p.post.reports[f.p.post.reports.length - 1]; if (r && (!best || r.at > best.at)) best = { at: r.at, h: nm(f.p) + ', day ' + r.day, t: r.t }; });
  const e = S.events[S.events.length - 1]; if (e && (!best || e.at > best.at)) best = { at: e.at, h: e.title, t: e.t };
  feedLine.hidden = !best; if (best) feedLine.replaceChildren(el('b', {}, best.h + ': '), best.t);
}
