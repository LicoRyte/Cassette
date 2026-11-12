/* Solarist: Planet cards, log feeds and the session report. */
'use strict';

/* ---------- planet card / details ---------- */
const fmtTemp = p => p.tempNight != null ? p.temp + ' °C day side / ' + p.tempNight + ' °C night side' : p.temp + ' °C';
const pad = n => '#' + String(n).padStart(4, '0');
const logText = p => p.custom ? p.log.split(p.name).join(p.custom) : p.log;
// survey data, split into tabs so the list stays short
const num = n => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
const habLabel = h => h >= 80 ? 'Earth-like: you could live here' : h >= 60 ? 'Livable, with a little help' : h >= 35 ? 'Survivable in a sealed base' : h >= 15 ? 'Hostile' : 'Deadly';
const zoneLabel = { habitable: 'inside the habitable zone ✓', 'too close': 'too close: scorched', 'too far': 'too far: frozen', 'no star': '' };
const meter = (v, cls) => el('span', { class: 'sl-meter' + (cls ? ' ' + cls : '') }, el('i', { style: 'width:' + v + '%' }));
let surveyTab = 'Overview';
function facts(p) {
  if (!p.x) p.x = makeExtra(p);
  const x = p.x, post = p.post, gas = (p.type === 'Gas giant' || p.type === 'Ice giant' || p.type === 'Glass storm');
  const T = {
    Overview: [['Class', p.type + (p.rings ? ', ringed' : '')], ['Habitability', [meter(x.hab, x.hab >= 60 ? 'ok' : x.hab >= 35 ? 'mid' : 'bad'), ' ' + x.hab + '% · ' + habLabel(x.hab)]], ['Star', p.star],
      ['Distance from star', x.au == null ? 'none, it drifts alone' : num(x.au) + ' AU · ' + zoneLabel[x.zone]], ['Distance from Earth', p.dist.toLocaleString() + ' light-years'],
      ['Year', p.year ? p.year.toLocaleString() + ' days' : 'no orbit'], ['Day', p.day == null ? 'never ends on one side' : p.day + ' hours'], ['Age', x.age + ' billion years']],
    Physical: [['Radius', x.radius + '× Earth (' + Math.round(x.radius * 6371).toLocaleString() + ' km)'], ['Mass', num(x.mass) + '× Earth'], ['Gravity', p.gravity + ' g'], ['Escape velocity', x.escape + ' km/s'],
      ['Axial tilt', x.tilt + '°' + (x.tilt < 4 ? ' (no seasons)' : x.tilt < 15 ? ' (mild seasons)' : x.tilt < 35 ? ' (clear seasons)' : x.tilt < 60 ? ' (strong seasons)' : ' (wild seasons)')], ['Moons', String(p.moons)], ['Rings', p.rings ? 'Yes' : 'No'],
      ['Highest peak', x.peak == null ? 'no solid surface' : x.peak + ' km'], ['Magnetic field', x.magnet], ['Albedo', x.albedo + ' (how much light it reflects)']],
    Climate: [['Temperature', fmtTemp(p)], ['Surface pressure', x.pressure == null ? 'no surface' : x.pressure + ' atm'], ['Atmosphere', p.atm], ['Oxygen', x.oxygen + '%'], ['Surface water', x.water + '%'],
      ['Deepest ocean', x.depth == null ? 'none' : x.depth + ' km'], ['Cloud cover', x.clouds + '%'], ['Weather', p.weather], [gas ? 'Layers' : 'Biomes', p.biomes.join(', ')], ['Radiation', x.radiation]],
    Life: [['Life', p.life], ['Biodiversity', x.bio ? [meter(x.bio, 'bio'), ' ' + x.bio + ' / 100'] : 'none detected'], ['Known species', x.species ? 'about ' + Number(x.species.toPrecision(2)).toLocaleString() : '0'],
      ['Native species', post && post.species ? post.species : p.lifeLvl ? (post ? 'still being studied' : 'needs a Listening Post to identify') : 'none']],
    Extra: [['Resources', p.res.join(', ')], ['Core', post && post.core ? post.core : post ? 'scan in progress' : 'needs a Listening Post to scan'], ['Anomaly', p.odd ? p.odd + (post && post.oddX ? ': ' + post.oddX : '') : 'none'],
      [post && post.tp ? 'Travelers\' Post' : 'Listening Post', post ? 'built ' + new Date(post.built).toLocaleDateString() + ', ' + post.reports.length + ' transmission' + (post.reports.length === 1 ? '' : 's') + (post.tp ? ', ' + post.tp.fac.length + ' facilit' + (post.tp.fac.length === 1 ? 'y' : 'ies') : '') : 'none'], ['Catalog code', p.code]].concat(p.custom ? [['Charted as', p.name]] : []),
  };
  const panel = el('dl', { class: 'sl-facts' });
  const tabs = Object.keys(T).map(k => el('button', { type: 'button', role: 'tab', class: 'sl-stab', 'aria-selected': String(k === surveyTab), onclick: () => show(k) }, k));
  function show(k) { surveyTab = k; tabs.forEach(b => b.setAttribute('aria-selected', String(b.textContent === k))); panel.replaceChildren(...T[k].flatMap(([a, b]) => [el('dt', {}, a), el('dd', {}, b)])); }
  show(surveyTab);
  return el('div', { class: 'sl-survey' }, el('div', { class: 'sl-stabs', role: 'tablist' }, tabs), panel);
}
/* ---------- log feeds: grouped by day, one tidy row per message, 20 at a time ---------- */
const KIND = { core: ['🔬', 'sci'], species: ['🔬', 'sci'], odd: ['🔬', 'sci'], secret: ['🤫', 'sec'], log: ['📜', 'log'], fac: ['🏘', 'fac'], ev: ['⚠', 'ev'] };
const dayLabel = t => { const d = new Date(t), a = new Date(); a.setHours(0, 0, 0, 0); const diff = Math.round((a - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: d.getFullYear() === a.getFullYear() ? undefined : 'numeric' }); };
const hhmm = t => new Date(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
const feedLimit = {};
// items: [{ at, p (world, optional), k (kind), icon (optional), title (optional), t (text), extra (optional) }], newest first
function renderFeed(items, key, showWorld, redraw) {
  const lim = feedLimit[key] || 20, out = [];
  let day = null;
  items.slice(0, lim).forEach(it => {
    const d = dayLabel(it.at); if (d !== day) { day = d; out.push(el('div', { class: 'sl-day' }, d)); }
    const [ic, cls] = KIND[it.k] || ['•', 'log'];
    let text = it.t; if (it.k === 'fac' && it.icon) text = text.replace(it.icon + ' ', '');
    out.push(el('div', { class: 'sl-msg sl-m-' + cls },
      showWorld && it.p ? el('img', { class: 'sl-msg-pic', src: paint(it.p, 32), alt: '' }) : el('span', { class: 'sl-msg-ic' }, it.icon || ic),
      el('div', { class: 'sl-msg-b' },
        el('div', { class: 'sl-msg-h' }, showWorld && it.p ? el('b', {}, nm(it.p)) : it.title ? el('b', {}, it.title) : null, showWorld && it.p ? el('span', { class: 'sl-msg-k' }, it.icon || ic) : null,
          it.day ? el('span', { class: 'sl-muted' }, 'Day ' + it.day) : null, el('span', { class: 'sl-msg-t' }, hhmm(it.at))),
        el('div', { class: 'sl-msg-x' }, text, it.extra ? el('b', {}, ' ' + it.extra) : null))));
  });
  if (items.length > lim) out.push(el('button', { type: 'button', class: 'btn sl-older', onclick: () => { feedLimit[key] = lim + 20; redraw(); } }, 'Show older (' + (items.length - lim) + ' more)'));
  return el('div', { class: 'sl-feedbox' }, out);
}
const repItem = (p, r) => ({ at: r.at, p, k: r.k, icon: null, t: r.t, day: r.day }); // an old Listening Post transmission
function postLog(p) {
  const reps = p.post.reports.slice().reverse();
  const box = el('details', { class: 'sl-more sl-postlog' }, el('summary', {}, (p.post.tp ? '🏘 Travelers\' Post log (' : '🗼 Listening Post log (') + reps.length + ')'));
  const fill = () => { box.replaceChildren(box.firstChild, reps.length ? renderFeed(reps.map(r => repItem(p, r)), 'post' + p.num, false, () => { const o = box.open; fill(); box.open = o; }) : el('p', { class: 'sl-muted' }, 'No transmissions yet. Tune the satellite here and study.')); };
  fill();
  return box;
}
// the Points of Interest charted on a world's expedition, with the explored meter
function poiList(p) {
  const x = exOf(p); if (!x.poi.length && (p.story || !p.ex)) return null;
  return el('div', { class: 'sx-pois' }, el('div', { class: 'sx-pois-h' }, el('b', {}, '📍 Points of Interest'), exMeter(p)),
    x.poi.length ? el('ul', {}, x.poi.map(o => el('li', {}, el('b', {}, o.name), el('small', {}, ' ' + EX_PARTS[o.leg] + ' · ' + o.note)))) : el('p', { class: 'sl-muted' }, 'None charted yet. Run an expedition here to find some.'));
}
const exMeter = p => { const n = exOf(p).step, odd = !!p.odd && !p.story, inv = invOf(p).done;
  return el('span', { class: 'sx-exm', title: 'Explored: ' + n + ' of ' + EX_LEN + ' expedition parts' + (odd ? (inv ? ', anomaly solved' : ', anomaly not solved yet') : ''), 'aria-label': 'Explored ' + n + ' of ' + EX_LEN + (odd ? (inv ? ', anomaly solved' : ', anomaly unsolved') : '') },
    Array.from({ length: EX_LEN }, (_, k) => el('i', { class: k < n ? 'on' : '' })), odd ? el('i', { class: 'inv' + (inv ? ' on' : '') }) : null); };
const HEAD = { story: '📡 A Meridian world · ', new: '★ New world discovered · ', log: 'World ' };
function planetCard(p, kind) {
  const pic = el('div', { class: 'sl-picwrap' }, el('img', { class: 'sl-pic', src: paint(p, 64), alt: 'Pixel portrait of ' + nm(p), width: 128, height: 128 }),
    null);
  return [
    el('div', { class: 'sl-card-h' }, el('span', {}, (HEAD[kind] || '') + pad(p.num)), el('span', { class: 'sl-rar sl-r-' + p.rarity.toLowerCase() }, p.rarity)),
    el('div', { class: 'sl-pl' }, pic,
      el('div', { class: 'sl-pl-t' }, el('b', { class: 'sl-name' }, nm(p), invOf(p).done ? el('span', { class: 'sl-tag', title: 'Its anomaly is in your Codex' }, '🔬 Solved') : null, exDone(p) ? el('span', { class: 'sl-tag', title: 'Every part of its expedition is done' }, '✓ Explored') : null, p.story ? el('span', { class: 'sl-tag sl-tag-coord', title: 'A world from the Meridian story' }, '📡 Meridian') : null, p.post ? el('span', { class: 'sl-tag off', title: 'You had a Listening Post here; its old transmissions are below' }, '🗼 Old post') : null),
        el('div', { class: 'sl-code' }, p.code + ' · ' + p.type + ' · ' + (p.x || (p.x = makeExtra(p))).hab + '% habitable'), el('p', {}, logText(p)))),
    el('details', { class: 'sl-more' }, el('summary', {}, 'Survey data'), facts(p)),
    poiList(p),
    p.post ? postLog(p) : null,
  ].filter(Boolean);
}
function showCard(p, kind) {
  const e = p && p.enc && (kind === 'new' || kind === 'lucky') ? p.enc : null;
  encBox.hidden = !e; encBox.replaceChildren(...(e ? [el('div', { class: 'sl-enc-h' }, '- ' + e.ic + ' ' + e.title + ' -'), el('p', {}, e.t)] : []));
  if (!p) { card.hidden = true; card.replaceChildren(); return; }
  card.hidden = false; card.className = 'sl-card' + (kind === 'new' || kind === 'story' ? ' new' : '');
  card.replaceChildren(...planetCard(p, kind));
  // in the report, Survey data opens as a panel to the right instead of growing the report downward
  reportSide.hidden = true; reportSide.replaceChildren();
  const sv = card.querySelector('details.sl-more:not(.sl-postlog)');
  if (sv) {
    const btn = el('button', { type: 'button', class: 'sl-link sx-svbtn', 'aria-expanded': 'false' }, 'Survey data ▸');
    btn.addEventListener('click', () => { const open = reportSide.hidden; reportSide.hidden = !open; btn.setAttribute('aria-expanded', String(open)); btn.textContent = open ? 'Survey data ◂' : 'Survey data ▸';
      if (open && !reportSide.firstChild) reportSide.replaceChildren(el('h3', {}, 'Survey data · ' + nm(p)), facts(p)); });
    sv.replaceWith(btn);
  }
}
// one finished Meridian leg, as shown in the session report and the story log
function storyBlock(ch, legI, pick, got, signal) {
  const c = STD.chapters[ch], leg = c.legs[legI], o = leg[pick] || leg.a;
  return el('div', { class: 'sl-trans-i sx-camp' },
    el('div', { class: 'sx-camp-h' }, el('span', {}, 'Chapter ' + (ch + 1) + ': ' + c.name), el('small', {}, 'Part ' + (legI + 1) + ' · ' + leg.title)),
    ...leg.text.map(t => el('p', {}, t)), el('p', { class: 'sx-story-pick' }, el('b', {}, o[0] + ': '), o[1]),
    got ? el('p', { class: 'sl-ev-got' }, got) : null, signal ? el('p', { class: 'sx-signal' }, '📡 ' + signal) : null);
}
function showTrans(list) {
  if (!list || !list.length) { trans.hidden = true; trans.replaceChildren(); return; }
  trans.hidden = false;
  trans.replaceChildren(...list.map(({ p, rep, passive, ev, notes, story: sy }) => sy ? storyBlock(sy.ch, sy.leg, sy.pick, sy.got, sy.signal) : notes ? el('div', { class: 'sl-trans-i sl-notes' }, notes.map(t => el('p', {}, t))) : ev ? el('div', { class: 'sl-trans-i sl-event' },
      el('div', { class: 'sl-trans-h' }, el('span', { class: 'sl-ev-i' }, ev.ic), (ev.battle ? ' ' : ' Deep-space event: ') + ev.title), el('p', {}, ev.t), ev.got ? el('p', { class: 'sl-ev-got' }, ev.got) : null)
    : el('div', { class: 'sl-trans-i' },
    el('div', { class: 'sl-trans-h' }, el('img', { src: satSprite(), alt: '' }), (passive ? ' Overheard from ' : ' Transmission from ') + nm(p) + ' · Day ' + rep.day), el('p', {}, rep.t))));
}
