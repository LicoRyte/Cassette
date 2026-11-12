/* Solarist: the building-block text engine. Sentences are written in JSON (the content/ folder) as templates with
   slots, and each template can say when it fits. The game fills them from what's happening right now (the context).
   The how-to for writers is at the top of content/lines.json; this file is the code side.

   Template text:
     {crew}            a value from the context. A person or item shows its name. A list gives a random entry.
     {crew.name}       a field inside it (any depth: {place.biome})
     {Crew}            capital first letter
     {crew.they}       pronouns from the person's "pronouns" (she / he / they): they, them, their, theirs, themself
     {crew:is|are}     the first word for she / he (or "plural": false), the second for they (or "plural": true). Use it right after a pronoun ("{crew.they} {crew:laughs|laugh}");
                       after a name the verb is always the first form ("{Crew} laughs")
     {a:item}          with "a" or "an" in front
     {@group}          a line from another group (so sentences can be built from smaller pieces)
     [quiet|still|hushed]   one of these, at random
   Template conditions ("when"): every key must match the context.
     "biome": "salt"           equal (when the context holds a list, the list must contain it)
     "biome": ["salt", "ice"]  any of these
     "temp": ">0.6"            a number above (or "<0.3" below)
     "weather": "!rain"        anything but this
     "crew.tags": "brave"      a field inside, same rules
   Each template can also have "weight" (default 1): 2 is picked twice as often. */
'use strict';

const TEXT = { lines: {}, items: [], acts: [], traders: [], mysteries: [], wonders: [], skies: [], regions: [], stories: [], seasons: [], warn: [] }; // filled from the content/ files by txLoad

// add one content file. Groups with the same name in different files are joined, so new files can add to old groups
function txLoad(json) {
  if (!json || typeof json !== 'object') return;
  const L = json.lines;
  if (L && typeof L === 'object') Object.keys(L).forEach(g => { if (Array.isArray(L[g])) TEXT.lines[g] = (TEXT.lines[g] || []).concat(L[g]); });
  if (Array.isArray(json.items)) TEXT.items = TEXT.items.concat(json.items.filter(it => it && it.name));
  if (Array.isArray(json.activities)) TEXT.acts = TEXT.acts.concat(json.activities.filter(a => a && a.id && a.name));
  if (Array.isArray(json.traders)) TEXT.traders = TEXT.traders.concat(json.traders.filter(t => t && t.id && t.name));
  if (Array.isArray(json.skies)) TEXT.skies = TEXT.skies.concat(json.skies.filter(s => s && s.id && s.name));
  if (Array.isArray(json.regions)) TEXT.regions = TEXT.regions.concat(json.regions.filter(g => g && g.id && g.name));
  if (Array.isArray(json.wonders)) TEXT.wonders = TEXT.wonders.concat(json.wonders.filter(w => w && w.id && w.name));
  if (Array.isArray(json.mysteries)) TEXT.mysteries = TEXT.mysteries.concat(json.mysteries.filter(m => m && m.id && Array.isArray(m.steps) && m.steps.length));
  if (Array.isArray(json.seasons)) TEXT.seasons = TEXT.seasons.concat(json.seasons.filter(s => s && s.id && Array.isArray(s.beats) && s.beats.length));
  if (Array.isArray(json.stories)) TEXT.stories = TEXT.stories.concat(json.stories.filter(s => s && s.id && s.start && Array.isArray(s.steps) && s.steps.length));
}

// read a dotted path out of the context: "crew.trait.name"
function txGet(ctx, path) {
  let v = ctx;
  for (const k of path.split('.')) { if (v == null) return undefined; v = v[k]; }
  return v;
}

const TX_PRON = {
  she: { they: 'she', them: 'her', their: 'her', theirs: 'hers', themself: 'herself' },
  he: { they: 'he', them: 'him', their: 'his', theirs: 'his', themself: 'himself' },
  they: { they: 'they', them: 'them', their: 'their', theirs: 'theirs', themself: 'themself' },
};
const txPron = who => TX_PRON[who && who.pronouns] || TX_PRON.they;

// does one condition value match what the context has?
function txMatchOne(want, have) {
  if (Array.isArray(want)) return want.some(w => txMatchOne(w, have));
  if (typeof want === 'string' && want[0] === '!') return !txMatchOne(want.slice(1), have);
  if (Array.isArray(have)) return have.some(h => txMatchOne(want, h));
  if (have && typeof have === 'object') return txMatchOne(want, have.id != null ? have.id : have.name);
  if (typeof want === 'string' && /^[<>]-?\d/.test(want)) { const n = +want.slice(1), h = +have; return !isNaN(h) && (want[0] === '>' ? h > n : h < n); }
  return have !== undefined && String(have).toLowerCase() === String(want).toLowerCase();
}
const txFits = (t, ctx) => !t || typeof t !== 'object' || !t.when || Object.keys(t.when).every(k => txMatchOne(t.when[k], txGet(ctx, k)));

// one template from a group that fits the context, picked by weight. null when none fits
function txPick(group, ctx, r) {
  const list = (TEXT.lines[group] || []).filter(t => txFits(t, ctx));
  if (!list.length) return null;
  const w = t => (t && typeof t === 'object' && t.weight > 0 ? t.weight : 1), total = list.reduce((a, t) => a + w(t), 0);
  let x = (r || Math.random)() * total;
  for (const t of list) { if ((x -= w(t)) < 0) return t; }
  return list[list.length - 1];
}

// turn a value into words: a person or item gives its name, a list one random entry
function txWord(v, r) {
  if (Array.isArray(v)) return v.length ? txWord(v[Math.floor((r || Math.random)() * v.length)], r) : '';
  if (v && typeof v === 'object') return v.name != null ? String(v.name) : '';
  return v == null ? '' : String(v);
}
const txCap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

// fill one template's text
function txFill(text, ctx, r, depth) {
  r = r || Math.random; depth = depth || 0;
  let s = String(text);
  // [a|b|c]: pick one (innermost first, so choices can sit inside choices)
  for (let i = 0; i < 20 && /\[[^\[\]]*\]/.test(s); i++) s = s.replace(/\[([^\[\]]*)\]/g, (_, opts) => { const o = opts.split('|'); return o[Math.floor(r() * o.length)]; });
  return s.replace(/\{([^{}]+)\}/g, (all, body) => {
    if (body[0] === '@') { // a line from another group
      if (depth > 6) return '';
      const t = txPick(body.slice(1), ctx, r);
      if (!t) { TEXT.warn.push('No line in "' + body.slice(1) + '" fits here'); return ''; }
      return txFill(typeof t === 'object' ? t.text : t, ctx, r, depth + 1);
    }
    const verb = body.match(/^([\w.]+):([^|]*)\|(.*)$/); // {crew:is|are}
    if (verb) { const who = txGet(ctx, verb[1]), many = who && typeof who.plural === 'boolean' ? who.plural : txPron(who) === TX_PRON.they; return many ? verb[3] : verb[2]; }
    const art = body.match(/^a:([\w.]+)$/i); // {a:item}
    if (art) { const w = txWord(txGet(ctx, art[1]), r); if (!w) return ''; const a = (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w; return body[0] === 'A' ? txCap(a) : a; }
    const cap = body[0] !== body[0].toLowerCase(), path = cap ? body[0].toLowerCase() + body.slice(1) : body;
    const dot = path.lastIndexOf('.'), last = dot < 0 ? '' : path.slice(dot + 1);
    let v;
    if (TX_PRON.they[last] && dot > 0) { const who = txGet(ctx, path.slice(0, dot)); v = who && typeof who === 'object' ? txPron(who)[last] : undefined; }
    if (v === undefined) v = txGet(ctx, path);
    if (v === undefined) { TEXT.warn.push('Nothing for {' + body + '}'); return ''; }
    const w = txWord(v, r);
    return cap ? txCap(w) : w;
  }).replace(/ {2,}/g, ' ').trim();
}

// the whole thing: a filled line from a group, or '' when nothing fits
function txLine(group, ctx, r) {
  const t = txPick(group, ctx || {}, r);
  return t ? txFill(typeof t === 'object' ? t.text : t, ctx || {}, r) : '';
}

// equipment, clothing and traits: filter by kind and (optionally) a tag
const txItems = (kind, tag) => TEXT.items.filter(it => (!kind || it.kind === kind) && (!tag || (it.tags || []).includes(tag)));
const txRandomItem = (r, kind, tag) => { const l = txItems(kind, tag); return l.length ? l[Math.floor((r || Math.random)() * l.length)] : null; };
