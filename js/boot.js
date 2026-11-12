/* Solarist start-up: a Pomodoro timer for space explorers. Every finished study session is a jump through deep space
   that ends at a brand-new, randomly generated planet. Saved in this browser: the logbook, settings and a running timer.

   How the code is loaded (see "Code layout" in README.md):
   1. index.html loads js/world/*.js (planet generator, content lists, painter, economy defaults), then this file, then js/shell.js.
   2. js/shell.js loads economy.json and items.json, then calls Solarist.mount().
   3. mount() fetches the GAME_FILES below and runs them one after another, in this order, in one go.

   All these files share one scope: a name declared at the top of one file can be used in every other file.
   So every top-level name must be unique across all of them, and code that runs straight away (not inside a function)
   can only use what an earlier file declared. */
'use strict';

const GAME_FILES = [
  // rules and saved state
  'js/game/core.js', 'js/game/voyage.js', 'js/game/encounters.js', 'js/game/research.js', 'js/game/ship.js',
  'js/game/levels.js', 'js/game/people.js', 'js/game/expedition.js', 'js/game/investigate.js', 'js/game/stay.js', 'js/game/traders.js', 'js/game/mysteries.js', 'js/game/crewstories.js', 'js/game/season.js', 'js/game/wonders.js', 'js/game/extras.js', 'js/game/story.js', 'js/game/campaign.js',
  'js/game/session.js',
  // the screen (the timer and achievements sit between them because they use screen parts made above them)
  'js/ui/controls.js', 'js/ui/hud.js', 'js/ui/learning.js', 'js/ui/ship-interior.js', 'js/ui/layout.js', 'js/ui/main-screen.js', 'js/ui/breakpanel.js', 'js/ui/globe.js', 'js/ui/right-panel.js',
  'js/ui/panels.js', 'js/ui/keyboard.js', 'js/ui/planetarium.js', 'js/ui/reports.js', 'js/game/timer.js', 'js/ui/ship-page.js',
  'js/ui/star-map.js', 'js/game/achievements.js', 'js/ui/ship-views.js', 'js/ui/crew.js', 'js/ui/logbook.js', 'js/ui/album.js', 'js/ui/reader.js', 'js/ui/intro.js', 'js/ui/aboard.js',
  // last: resume a running timer and draw the first frame
  'js/ui/season-ui.js', 'js/ui/polish.js', 'js/ui/feel.js', 'js/ui/notes.js', 'js/ui/draw.js', 'js/ui/board.js', 'js/ui/draw-mode.js', 'js/ui/export.js', 'js/ui/clock.js', 'js/ui/tape.js', 'js/ui/help.js', 'js/game/start.js',
];

// content/: the JSON the text engine (js/world/text.js) builds sentences from. Add your own files here; a missing or broken one is skipped
const CONTENT_FILES = ['content/items.json', 'content/lines.json', 'content/activities.json', 'content/traders.json', 'content/mysteries.json', 'content/wonders.json', 'content/extras.json', 'content/stories.json', 'content/seasons.json', 'content/stories/windtrap.json', 'content/stories/second-solarist.json', 'content/stories/lantern.json', 'content/stories/tidebreak.json', 'content/stories/small-hours.json', 'content/reactions.json'];

let SOLARIST_MOUNT = null; // { root, hooks, econ, items, expd, story }, read by js/game/core.js, expedition.js and story.js

window.Solarist = {
  makePlanet, makeExtra, paint, lookOf,
  // root: the element to draw into. hooks: sounds and the planet scene from js/shell.js. econ, items: the JSON files.
  mount(root, hooks, econ, items, camp) {
    SOLARIST_MOUNT = { root, hooks, econ, items, expd: null, story: null };
    const get = f => fetch(f, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error('Could not load ' + f); return r.text(); });
    // expeditions.json: expedition text and Point of Interest names (optional: bad or missing JSON falls back to plain text)
    const opt = f => fetch(f, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
    // story.json: the Meridian story (spoilers; optional: without it there's simply no story)
    return Promise.all([opt('expeditions.json'), opt('story.json'), Promise.all(CONTENT_FILES.map(opt)), ...GAME_FILES.map(get)]).then(([x, st, content, ...codes]) => {
      SOLARIST_MOUNT.expd = x; SOLARIST_MOUNT.story = st;
      content.forEach(txLoad);
      // run each file as its own script, back to back, so nothing else can happen in between
      let failed = null;
      const onError = e => { if (!failed) failed = e.error || new Error(e.message); };
      window.addEventListener('error', onError);
      try {
        for (let i = 0; i < codes.length && !failed; i++) {
          const s = document.createElement('script');
          s.textContent = codes[i] + '\n//# sourceURL=' + new URL(GAME_FILES[i], location.href).href; // error messages name the right file
          document.head.appendChild(s);
        }
      } finally { window.removeEventListener('error', onError); }
      if (failed) throw failed;
    });
  },
};
