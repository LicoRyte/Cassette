/* Solarist: The right column: Research and Transmissions. */
'use strict';

// the right side has two tabs: Research (what Knowledge points unlock) and Transmissions (everything the ship heard and logged)
let rightTab = 'tx';
// every kind of log in one place: the ship's log, Meridian logs, Ship Logs from research, achievements, and old Listening Post transmissions
const TXF = [['all', 'All'], ['post', 'Posts'], ['camp', 'Meridian'], ['arc', 'Ship Logs'], ['quest', 'Quests'], ['ship', 'Ship'], ['ev', 'Events'], ['stay', 'Stays'], ['trade', 'Traders'], ['codex', 'Codex'], ['res', 'Research'], ['ach', 'Achievements']];
let txFilter = 'all';
const evCat = e => e.c || (/^Research/.test(e.title || '') ? 'res' : /^Achievement/.test(e.title || '') ? 'ach' : /^Ship activity|joined the crew|left the crew|^New room/.test(e.title || '') ? 'ship' : /^Distress/.test(e.title || '') ? 'quest' : 'ev');
function txFeed() {
  const feed = [];
  posts().forEach(f => f.p.post.reports.forEach(r => feed.push(Object.assign(repItem(f.p, r), { c: 'post' }))));
  S.events.forEach(e => feed.push({ at: e.at, k: 'ev', icon: e.ic, title: e.title, t: e.t, extra: e.got, c: evCat(e) }));
  Object.keys(S.slog).forEach(k => { const L = SHIP_LOGS[k]; if (L) feed.push({ at: S.slog[k], k: 'ev', icon: '🗄', title: L[0], t: slogText(L[1]), c: 'arc' }); });
  return feed.sort((a, b) => b.at - a.at);
}
function shipLogsView() { // Ship Logs read like a book: grouped by the research that unlocked them, locked ones listed at the end
  const out = [], locked = [];
  RESEARCH.forEach(([branch, list]) => list.forEach(([id, name, , , un]) => { if (!un || !un.logs) return;
    const got = un.logs.filter(k => S.slog[k] && SHIP_LOGS[k]);
    if (!got.length) { locked.push([name, branch, un.logs.length]); return; }
    out.push(el('div', { class: 'sx-arc' }, el('div', { class: 'sx-arc-h' }, el('span', {}, name), el('small', {}, branch)),
      got.map(k => el('div', { class: 'sx-arc-i' }, el('b', {}, SHIP_LOGS[k][0]), el('p', {}, slogText(SHIP_LOGS[k][1]))))));
  }));
  if (!out.length) out.push(el('p', { class: 'sl-muted' }, 'No Ship Logs yet. Research unlocks them: try Guild Records in the Archives branch.'));
  if (locked.length) out.push(el('div', { class: 'sx-arc locked' }, el('div', { class: 'sx-arc-h' }, el('span', {}, '🔒 ' + locked.reduce((a, l) => a + l[2], 0) + ' more in the Research tab')),
    el('p', { class: 'sl-muted' }, locked.map(([n, b]) => n + ' (' + b + ')').join(' · '))));
  return out;
}
function meridianView() { // the Meridian story so far, chapter by chapter, like a book
  if (!STD) return [el('p', { class: 'sl-muted' }, 'The story file (story.json) could not be loaded.')];
  if (!S.story.log.length) return [el('p', { class: 'sl-muted' }, 'Nothing yet. When a signal is waiting, pick Follow the Signal on Explore.')];
  const out = [];
  STD.chapters.forEach((c, ch) => { const legs = S.story.log.filter(l => l.ch === ch); if (!legs.length) return;
    out.push(el('div', { class: 'sx-sec' }, el('h3', {}, 'Chapter ' + (ch + 1) + ': ' + c.name), ...legs.map(l => {
      const leg = c.legs[l.leg];
      if (leg.success) return el('div', { class: 'sl-trans-i sx-camp' }, el('div', { class: 'sx-camp-h' }, el('span', {}, leg.title)), ...leg.success.map(t => el('p', {}, t)), el('p', { class: 'sx-story-pick' }, el('b', {}, leg[l.pick][0] + ': '), leg[l.pick][1]));
      return storyBlock(ch, l.leg, l.pick); })));
  });
  return out;
}
const txUnread = () => txFeed().filter(it => it.at > (S.txSeen || 0)).length;
function drawRight() {
  const unread = txUnread();
  if (rightTab === 'tx' && unread) { S.txPrev = S.txSeen || 0; S.txSeen = Date.now(); save(); }
  const rt = (k, label, extra) => el('button', { type: 'button', role: 'tab', 'aria-selected': String(rightTab === k), onclick: () => { rightTab = k; drawRight(); } }, label, extra || null);
  const tabsR = focusLock() ? el('div', { class: 'sx-rtabs', role: 'tablist' }, rt('tx', 'Transmissions'), el('span', { class: 'sx-locknote' }, '🔒 Everything else is back at the break'))
    : el('div', { class: 'sx-rtabs', role: 'tablist' }, rt('tx', '📡 Transmissions', rightTab !== 'tx' && unread ? el('i', { class: 'sx-dot', 'aria-label': unread + ' new' }, String(unread)) : null), rt('research', 'Research'));
  if (rightTab === 'research') { rightCol.replaceChildren(tabsR, ...researchView()); return; }
  rightTab = 'tx';
  {
    const feed = txFeed(), seen = S.txPrev || 0, cnt = {}, fresh = {};
    feed.forEach(it => { cnt[it.c] = (cnt[it.c] || 0) + 1; if (it.at > seen) fresh[it.c] = 1; });
    const chips = el('div', { class: 'sx-chips', role: 'tablist' }, TXF.filter(([k]) => k === 'all' || cnt[k] || k === 'camp' || k === 'arc').map(([k, label]) =>
      el('button', { type: 'button', role: 'tab', 'aria-selected': String(txFilter === k), class: fresh[k] || (k === 'all' && Object.keys(fresh).length) ? 'new' : null, onclick: () => { txFilter = k; drawRight(); rightCol.scrollTop = 0; } }, label, el('small', {}, String(k === 'all' ? feed.length : cnt[k] || 0)))));
    let body;
    if (txFilter === 'camp') body = meridianView();
    else if (txFilter === 'arc') body = shipLogsView();
    else { const list = txFilter === 'all' ? feed : feed.filter(it => it.c === txFilter);
      body = [list.length ? el('div', { class: 'sx-tx' }, renderFeed(list, 'rtx' + txFilter, true, drawRight))
        : el('p', { class: 'sl-muted' }, txFilter === 'all' ? 'Nothing yet. Deep-space events, crew chatter, Meridian logs, research and achievements all land here.' : 'Nothing here yet.')]; }
    rightCol.replaceChildren(el('div', { class: 'sx-rhead' }, tabsR, chips), ...body);
    return;
  }
}
// two-click buttons for things that can't be undone
const armBtn = (label, armed, act, cls) => { const b = el('button', { type: 'button', class: 'btn ' + (cls || '') }, label);
  b.addEventListener('click', () => { if (!b.classList.contains('arm')) { b.classList.add('arm'); b.textContent = armed; setTimeout(() => { if (b.isConnected) { b.classList.remove('arm'); b.textContent = label; } }, 4000); return; } act(); }); return b; };
