/* Solarist start-up: a Pomodoro timer for space explorers. Every finished study session is a jump through deep space
   that ends at a brand-new, randomly generated planet. Saved in this browser: the logbook, settings and a running timer.

   How the code is loaded (see "Code layout" in README.md):
   1. index.html loads js/world/*.js (planet generator, content lists, painter, economy defaults), then this file, then js/shell.js.
   2. js/shell.js loads economy.json, items.json and campaign.json, then calls Solarist.mount().
   3. mount() fetches the GAME_FILES below and runs them one after another, in this order, in one go.

   All these files share one scope: a name declared at the top of one file can be used in every other file.
   So every top-level name must be unique across all of them, and code that runs straight away (not inside a function)
   can only use what an earlier file declared. */
'use strict';

const GAME_FILES = [
  // rules and saved state
  'js/game/core.js', 'js/game/build.js', 'js/game/voyage.js', 'js/game/encounters.js', 'js/game/research.js', 'js/game/ship.js',
  'js/game/levels.js', 'js/game/distress.js', 'js/game/quests.js', 'js/game/delivery.js', 'js/game/station.js', 'js/game/rating.js',
  'js/game/coordinator.js', 'js/game/worlds.js', 'js/game/trade.js', 'js/game/session.js',
  // the screen (the timer and medals sit between them because they use screen parts made above them)
  'js/ui/controls.js', 'js/ui/hud.js', 'js/ui/ship-interior.js', 'js/ui/layout.js', 'js/ui/main-screen.js', 'js/ui/right-panel.js',
  'js/ui/panels.js', 'js/ui/keyboard.js', 'js/ui/planetarium.js', 'js/ui/reports.js', 'js/game/timer.js', 'js/ui/ship-page.js',
  'js/ui/star-map.js', 'js/game/achievements.js', 'js/ui/ship-views.js', 'js/ui/logbook.js',
  // last: resume a running timer and draw the first frame
  'js/game/start.js',
];

let SOLARIST_MOUNT = null; // { root, hooks, econ, items, camp }, read by js/game/core.js

window.Solarist = {
  makePlanet, makeExtra, paint, lookOf, facTheme: FAC_THEME,
  // root: the element to draw into. hooks: sounds and the planet scene from js/shell.js. econ, items, camp: the JSON files.
  mount(root, hooks, econ, items, camp) {
    SOLARIST_MOUNT = { root, hooks, econ, items, camp };
    const get = f => fetch(f, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error('Could not load ' + f); return r.text(); });
    return Promise.all(GAME_FILES.map(get)).then(codes => {
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
