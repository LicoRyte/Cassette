# Solarist

A Pomodoro study timer where every study session is a trip through deep space to a new, randomly generated planet.
Build posts, collect oddities, answer distress calls, and level up your captain while you study.

**Play:** https://licoryte.github.io/solarist/

It works offline: open it once and it saves everything it needs. In Chrome or Edge (computer or Android) use **Install app**
(or the browser menu) to get it as its own app with an icon. On iPhone: Share, then Add to Home Screen.

Your progress is saved in this browser.

## Files

| File | What it is |
|---|---|
| `index.html`, `style.css` | The page and its look: black space, floating text, colours from the 46-colour Apollo palette (see `CREDITS.md`) |
| `js/shell.js` | Sounds, notifications, install, offline support, and the planet viewport: a WebGL shader that draws each world as a dithered, palette-snapped 3D sphere (radar sweep while surveying, construction lights while building, and so on) |
| `js/world/`, `js/boot.js`, `js/game/`, `js/ui/` | The game: planets, missions, posts, collectibles, levels, Distress Runs, stats. See **Code layout** below |
| `economy.json` | Every resource income and price. Edit, commit, reload. Notes inside explain each number |
| `art/decor/` | Your own decoration art. Drop PNGs in and list them in `decor.json` to replace built-in decorations or add new ones. See `art/decor/README.md` |
| `items.json` | The collectibles, 8 categories with 4 rarities each. Add new ones at the end of a list only (saves remember items by position) |
| `campaign.json` | The campaign: 100 logs of the lost survey ship Meridian. Edit the text freely; keep the order |
| `sw.js` | Offline support. Files are always fetched fresh when online, so edits show up on the next reload. Bump `VERSION` and update its file list if you add, rename or remove files |
| `manifest.webmanifest`, `icons/` | App name and icons for installing |
| `fonts/` | Barlow Condensed and Courier Prime (SIL Open Font License, see the OFL files) |
| `sfx/` | Sounds (see `sfx/CREDITS.txt`) |
| `music/`, `music.json` | Break music and its credits |
| `CREDITS.md` | Who made the palette, fonts, sounds and music |


## Controls

`1`-`7` pick the mission, `Space` starts or pauses, `H` hides the side panels, `←` `→` flip worlds in the Planetarium, `Esc` closes a page, the report or the ship view.

## What's in it

- **Main screen:** the planet in the middle with the timer, cycle bar and mission tabs (Explore, Discover, Charge, plus Build or Campaign when chosen).
  Left: Distress Run, the Meridian campaign, bounties, the Coordinator. Right: Upgrades, Build (posts, facilities and your ship's rooms), Research, Sell, Trade (when a Trade Station is docked) and Transmissions.
- **Pages:** Logbook (planet data), Star map, Ship (Captain, Medals, Crew, Meridian logs, Hangar, Goals, Logs, Stats), Collection, Settings (sound, ambient sound, timer lengths).
- **Your ship:** rooms are built with a study session and upgraded with resources. Crew live in the Crew Quarters; each adds a Ship Activity (a small story and bonus every session). Name, hull color and design are in Ship, Hangar.

## Code layout

No build step: plain JavaScript files that the browser loads in a fixed order. To try changes, serve the folder
(for example `python -m http.server 8800`) and open http://localhost:8800. Opening `index.html` straight from disk won't work.

| Folder | What's in it |
|---|---|
| `js/world/` | Pure content and generators, loaded by `index.html`: `random.js`, `planet-data.js` (the lists planets are made from), `planet.js` (`makePlanet`), `posts.js` (post transmissions and facilities), `events.js`, `items.js` (collectibles), `paint.js` (palette and pixel art), `economy.js` (default numbers) |
| `js/boot.js` | Start-up. Holds `GAME_FILES`, the load order of everything below |
| `js/game/` | Rules and saved state, one file per feature: `core.js` (the save `S`, `save()`, `el()`), `build.js`, `encounters.js`, `research.js`, `ship.js`, `levels.js`, `distress.js`, `quests.js`, `delivery.js`, `station.js`, `coordinator.js`, `worlds.js`, `trade.js`, `session.js`, `timer.js` (`finish()`, the end of every session, and `draw()`), `achievements.js` (medals and Side Quests) |
| `js/ui/` | The screen: `controls.js`, `layout.js` (pages and tabs), `main-screen.js`, `right-panel.js`, `panels.js` (Build, Sell, Research, Trade), `reports.js`, `ship-interior.js`, `ship-page.js`, `ship-views.js`, `star-map.js`, `logbook.js`, `keyboard.js`, `planetarium.js` |

Rules that keep it working:

- **All files share one scope.** A name declared at the top of any file (`const`, `let`, `function`) can be used from every other file,
  so each top-level name must be unique. Reusing one stops the game from starting, and the browser console names the clash.
- **Order matters for code that runs straight away.** Code inside a function can use anything. Code at the top level of a file
  (for example `if (!S.items) S.items = {};` or building a button) runs at start-up, so it can only use names from the same file or an earlier one.
- **Adding a file:** put it in `GAME_FILES` in `js/boot.js` (or a `<script>` tag in `index.html` for `js/world/`), add it to the list in `sw.js`, and bump `VERSION` there.
- **New saved data:** add a default in the feature's own file, like the others do (`if (!S.thing) S.thing = {};`), so older saves keep working.
- If the game doesn't start, open the browser console: errors name the file and line.
