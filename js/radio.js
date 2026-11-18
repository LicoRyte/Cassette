/* Cassie: radio. The Radio key in the Tapes drawer opens a station finder in place of your music: search Radio Browser's
   free, community-run directory (radio-browser.info) by name or kind (lofi, jazz, a city...), listen to one right there,
   and keep the ones you like: a kept station sits in your music like a track, so it goes on Side A or B (+A / +B, or drag
   it), and plays live while the timer runs (js/music.js plays it). Only stations that stream securely (https) are listed:
   the site is https, and browsers block plain-http sound on it. What you search goes to radio-browser.info. */
'use strict';

let radioOpen = false, radioQ = '', radioRes = null, radioWait = false, radioErr = '', radioHost = null, radioT = 0, radioAsk = 0;
const RADIO_HOSTS = ['all.api.radio-browser.info', 'de1.api.radio-browser.info', 'fi1.api.radio-browser.info', 'de2.api.radio-browser.info'];
// the directory has several mirrors: the first that answers is kept for the rest of the visit
async function radioApi(path) {
  const hosts = radioHost ? [radioHost, ...RADIO_HOSTS.filter(h => h !== radioHost)] : RADIO_HOSTS;
  for (const h of hosts) {
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 7000);
    try { const r = await fetch('https://' + h + path, { signal: ctl.signal }); if (r.ok) { radioHost = h; return await r.json(); } }
    catch (e) { /* the next mirror */ } finally { clearTimeout(tm); }
  }
  throw new Error('no directory');
}
const radioQs = o => '?' + Object.entries(Object.assign({ hidebroken: 'true', order: 'votes', reverse: 'true', is_https: 'true' }, o)).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
// a station as Cassie keeps it (its id comes from the directory's, so the same station is never kept twice)
function radioItem(s) {
  const tags = String(s.tags || '').split(',').map(t => t.trim()).filter(Boolean).slice(0, 3);
  return { id: 'r' + String(s.stationuuid).replace(/[^a-f0-9]/gi, '').slice(0, 20), name: String(s.name || 'A station').trim().slice(0, 80),
    radio: { url: s.url_resolved || s.url, uuid: s.stationuuid, where: [s.country, ...tags].filter(Boolean).join(' · ').slice(0, 90), home: /^https:\/\//.test(s.homepage || '') ? s.homepage.slice(0, 200) : '', kbps: +s.bitrate || 0 } };
}
const radioOk = s => s && s.stationuuid && /^https:\/\//.test(s.url_resolved || s.url || '') && s.lastcheckok !== 0;
async function radioSearch(q) {
  const ask = ++radioAsk; radioWait = true; radioErr = ''; musicDraw();
  try {
    let list;
    if (q) { // by name and by kind, together, the most liked first
      const [a, b] = await Promise.all([radioApi('/json/stations/search' + radioQs({ name: q, limit: 30 })), radioApi('/json/stations/search' + radioQs({ tag: q.toLowerCase(), limit: 30 }))]);
      list = [...a, ...b];
    } else { // to start with: a few well-liked stations for focus
      const sets = (await Promise.all(['lofi', 'jazz', 'classical', 'ambient'].map(t => radioApi('/json/stations/search' + radioQs({ tag: t, limit: 6 }))))).map(s => s.filter(radioOk));
      list = []; for (let i = 0; i < 6; i++) sets.forEach(s => { if (s[i]) list.push(s[i]); }); // (taking turns: lofi, jazz, classical, ambient)
    }
    if (ask !== radioAsk) return;
    const seen = new Set(); list = list.filter(radioOk).filter(s => !seen.has(s.stationuuid) && seen.add(s.stationuuid));
    if (q) list.sort((x, y) => (y.votes || 0) - (x.votes || 0));
    radioRes = list.slice(0, 40).map(radioItem);
  } catch (e) { if (ask !== radioAsk) return; radioRes = []; radioErr = navigator.onLine === false ? 'You\'re offline: the radio needs the internet.' : 'Can\'t reach the radio directory just now. Try again in a moment.'; }
  radioWait = false; musicDraw();
}
// the directory counts what's listened to, so the stations people like rise (it asks apps to tell it)
function radioCount(t) { if (t && t.radio && t.radio.uuid) fetch('https://' + (radioHost || RADIO_HOSTS[0]) + '/json/url/' + encodeURIComponent(t.radio.uuid)).catch(() => {}); }

function radioFind(open) {
  radioOpen = !!open; if (radioOpen && !radioRes && !radioWait) radioSearch(radioQ);
  musicDraw(); if (radioOpen) setTimeout(() => { const f = tapesMusic.querySelector('.sx-r-find'); if (f) f.focus({ preventScroll: true }); }, 0);
}
// hear it before keeping it (it plays until you stop it, or the timer's music takes over)
function radioListen(t) {
  if (radioOn && radioOn.id === t.id && !radioEl.paused) { radioPreview = false; radioStop(400); return; }
  decks.forEach(a => stopEl(a, 600)); radioPreview = true; radioPlay(t, 600);
}
function radioKeep(t, side) {
  let k = libOf(t.id); if (!k) { k = JSON.parse(JSON.stringify(t)); M.lib.push(k); }
  if (side) { mixNow()[side].push(k.id); deskSfx('pin'); mixApply(); deskToast(k.name + ' is on ' + SIDE_NAME[side]); }
  else { deskSfx('pin'); save(); musicDraw(); deskToast(k.name + ' is in your music'); }
}
function radioPane() {
  const find = el('input', { class: 'sx-r-find', type: 'search', value: radioQ, placeholder: 'Find a station: lofi, jazz, a city…', 'aria-label': 'Find a radio station', spellcheck: 'false' });
  find.addEventListener('input', () => { radioQ = find.value; clearTimeout(radioT); radioT = setTimeout(() => { radioSearch(radioQ.trim()); }, 450); });
  find.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(radioT); radioSearch(radioQ.trim()); } });
  const playing = t => radioOn && radioOn.id === t.id && !radioEl.paused;
  const rows = (radioRes || []).map(t => {
    const kept = !!libOf(t.id);
    return el('li', { class: 'sx-r-row' + (playing(t) ? ' play' : '') },
      el('button', { type: 'button', class: 'sx-r-play', title: playing(t) ? 'Stop' : 'Listen', 'aria-label': (playing(t) ? 'Stop ' : 'Listen to ') + t.name, onclick: () => radioListen(t) }, playing(t) ? '■' : '▶'),
      el('span', { class: 'sx-r-txt' }, el('span', { class: 'sx-trk-n', title: t.name }, t.name), el('small', {}, t.radio.where || 'A live station')),
      el('button', { type: 'button', class: 'sx-add-b' + (kept ? ' on' : ''), title: kept ? 'In your music' : 'Keep it in your music', onclick: () => radioKeep(t) }, kept ? '★' : '☆'),
      el('button', { type: 'button', class: 'sx-add-b', title: 'Put it on Side A (focus)', onclick: () => radioKeep(t, 'A') }, '+A'),
      el('button', { type: 'button', class: 'sx-add-b sx-add-bb', title: 'Put it on Side B (breaks)', onclick: () => radioKeep(t, 'B') }, '+B'));
  });
  const say = radioWait ? 'Tuning in…' : radioErr || (radioRes && !radioRes.length ? 'No stations found. Try a kind of music, like lofi or piano.' : '');
  return el('section', { class: 'sx-mcol sx-libbox sx-radio' },
    el('div', { class: 'sx-mcol-h' }, el('b', {}, 'Radio'), el('span', { class: 'sx-store' }, radioQ.trim() ? 'search' : 'well liked'), el('span', { class: 'sx-gap' }),
      el('button', { type: 'button', class: 'sx-mini-b', title: 'Back to your music', onclick: () => radioFind(false) }, '← Your music')),
    el('div', { class: 'sx-mcol-b' }, find, say ? el('p', { class: 'sl-muted sx-r-say' + (radioErr ? ' err' : '') }, say) : null, rows.length ? el('ul', { class: 'sx-lib sx-r-list' }, ...rows) : null),
    el('p', { class: 'sx-mus-note' }, 'Live stations from radio-browser.info (only the ones that stream securely). ☆ keeps one in your music; +A / +B puts it on a side.'));
}
