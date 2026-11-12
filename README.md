# Solarist

A Pomodoro study timer where every study session is a trip through deep space to a new, randomly generated planet.
Explore each world you reach, build posts, collect oddities, answer distress calls, and level up your captain while you study.

**Play:** https://licoryte.github.io/solarist/

It works offline: open it once and it saves everything it needs. In Chrome or Edge (computer or Android) use **Install app**
(or the browser menu) to get it as its own app with an icon. On iPhone: Share, then Add to Home Screen.

Your progress is saved in this browser.

## Files

| File | What it is |
|---|---|
| `index.html`, `style.css` | The page and its look: black space, floating text, colours from the 46-colour Apollo palette (see `CREDITS.md`) |
| `js/shell.js` | Sounds, notifications, install, offline support, and the planet viewport: a WebGL shader that draws each world as a dithered, palette-snapped 3D sphere (radar sweep while surveying, and so on) |
| `js/world/`, `js/boot.js`, `js/game/`, `js/ui/` | The game: planets, missions, the Meridian, collectibles, research, levels, the Learning log, stats. See **Code layout** below |
| `economy.json` | Tuning numbers (levels, expedition and anomaly odds, arrival chances). Some entries are left over from the old economy and no longer used |
| `art/decor/` | Your own decoration art. Drop PNGs in and list them in `decor.json` to replace built-in decorations or add new ones. See `art/decor/README.md` |
| `expeditions.json` | The text of planet expeditions (landing, crossing and finale parts for every planet type), Point of Interest name parts, derelict salvage scenes and the Codex (an explanation for every anomaly). Edit freely |
| `items.json` | The collectibles, 8 categories with 4 rarities each. Add new ones at the end of a list only (saves remember items by position) |
| `story.json` | **Spoilers.** The Meridian story: fifteen chapters, one world each. Opening it spoils the story and its puzzle |
| `sw.js` | Offline support. Files are always fetched fresh when online, so edits show up on the next reload. Bump `VERSION` and update its file list if you add, rename or remove files |
| `manifest.webmanifest`, `icons/` | App name and icons for installing |
| `fonts/` | Barlow Condensed and Courier Prime (SIL Open Font License, see the OFL files) |
| `sfx/` | Sounds (see `sfx/CREDITS.txt`) |
| `music/`, `music.json` | Break music and its credits |
| `CREDITS.md` | Who made the palette, fonts, sounds and music |


## Controls

`Space` starts or pauses, `H` hides the side panels, `←` `→` flip worlds in the Planetarium, `Esc` closes a page, the report or the ship view.

## What's in it

Solarist is about discovery, not grinding: no resources, shops or upgrades to buy. See `docs/cozy-redesign-plan.md` for where it's heading.

- **An episodic story:** Solarist is a long story told in **seasons** (`content/seasons.json`). Every finished study session plays the next **episode** of the current season: a lighthouse gone dark, a festival on small moons, a ship full of undelivered letters, a planet that sings, the long quiet between stars. A season runs 6 to 9 episodes; some take the ship to a new world, some end with a **choice** you make on the break, and the finale picks its ending from your choices. Then a new season starts.
- **Never quite the same twice:** seasons come round again, but each run picks a different **twist**, puts a different crew member in the **spotlight** (picked by their traits), uses different wording, and remembers what happened before (earlier worlds and seasons come back as callbacks).
- **The crew fills in the rest:** after the episode come the crew's own moments, built from who they are, what they wear and carry, and what's aboard: ship life, two of them together, a crew member's own little storyline (`content/stories.json`), the sky of the day, a campfire before the long break.
- **Your crew is the cast:** under Ship, Crew, a full-page editor: everyone aboard on the left, the one you picked filling the rest. Name, pronouns, age, profession, one or two traits, five clothing slots (hat, accessory, top, bottom, shoes) and one thing to carry, all freely chosen. It all changes how the story is written. "Who's aboard?" opens the same editor on a first start.
- **Your ship:** under Ship, Ship: the cutaway, every room's look, the hull paint and the name.
- **Main screen:** the timer on the left (the time, one bar per study session of the cycle, white while you study and green over it on the break, then Start/Pause and Reset), with what happened under it and a choice when the episode left one. The planet fills the rest: drag it to turn it, scroll to zoom. While you study, only the planet and the timer stay. Space starts or pauses; R resets and S skips while the timer is stopped.
- **Planets:** every world is generated from a few settings (heat, water, air, life, age) and drawn by Solarist's own shader in the 32-colour palette by BurakoIRL: seas, continents, craters, lava rivers, gas bands and drifting clouds, with dithered shading. Its portrait in the Atlas uses the same colours.
- **Pages** (top bar): **Atlas** (Worlds you've been to, and the star map), **Journal** (the story so far and every log, with filters and search, a Learning log, and a reader for one at a time), **Ship** (Crew, Ship) and **Settings**. Text is plain, without emoji.
- **Learning log:** after each study session, write one optional line about what you learned. It's saved with the world you were at.
- **The today line** under the timer: where you are in the cycle, how many sessions today, and the sky of the day.
- **Phones:** one column: the planet, the timer, then the story.
- **Gone on purpose:** research, crafting, collectibles, levels, points, achievements, missions and the old waypoint cards. Their code is still in the project (switched off in `js/ui/season-ui.js`), and saves keep their old data.
- **Full Cycle:** finish every session and break of a cycle without skipping, and something interesting waits on your next trip.

## Code layout

No build step: plain JavaScript files that the browser loads in a fixed order. To try changes, serve the folder
(for example `python -m http.server 8800`) and open http://localhost:8800. Opening `index.html` straight from disk won't work.

| Folder | What's in it |
|---|---|
| `js/world/` | Pure content and generators, loaded by `index.html`: `random.js`, `planet-data.js` (the lists planets are made from), `planet.js` (`makePlanet`), `posts.js` (post transmissions and facilities), `events.js`, `items.js` (collectibles), `paint.js` (palette and pixel art), `economy.js` (default numbers) |
| `js/world/text.js` | The text engine: fills sentence templates from `content/` (slots, pronouns, conditions). How-to for writers at the top of `content/lines.json` |
| `content/` | JSON the text engine uses: `items.json` (equipment, clothing, traits, ship equipment), `stories.json` (crew stories), `seasons.json` (the seasons: the main story), `lines.json` (sentence pieces), `activities.json` (Stay here activities and their lines), `traders.json` (traders, their lines, and chance meetings), `mysteries.json`, `wonders.json`, `extras.json` (campfire and return lines, skies, regions). Listed in `CONTENT_FILES` in `js/boot.js`. Try them in `tools/text-preview.html` |
| `js/boot.js` | Start-up. Holds `GAME_FILES`, the load order of everything below |
| `js/game/` | Rules and saved state, one file per feature: `core.js` (the save `S`, `save()`, `el()`), `voyage.js`, `encounters.js` (arrivals and deep-space events), `research.js`, `ship.js`, `levels.js` (levels, records, save migrations), `people.js` (you, the crew, the stash and crafting), `expedition.js`, `investigate.js`, `stay.js` (places and Stay here), `traders.js` (trades, gifts and giving things away), `mysteries.js`, `wonders.js`, `extras.js` (regions, going back, the sky of the day, campfires, the weekly recap), `story.js` (the Meridian), `session.js`, `timer.js` (`finish()`, the end of every session, and `draw()`), `achievements.js` (achievements and Side Quests), `start.js` |
| `js/ui/` | The screen: `controls.js`, `hud.js` (layout pieces and the session report), `learning.js` (the Learning log), `ship-interior.js`, `layout.js` (pages and tabs), `breakpanel.js` (the rail under the timer), `globe.js` (turning the planet; its waypoints are switched off), `season-ui.js` (the story-first screen), `aboard.js` (Who's aboard? on a first start), `main-screen.js`, `right-panel.js`, `panels.js` (Research), `keyboard.js`, `planetarium.js`, `reports.js`, `ship-page.js`, `star-map.js`, `ship-views.js`, `crew.js` (the Crew page), `logbook.js`, `album.js` (favourites, home planet, postcards), `reader.js`, `intro.js` |
| `tools/discord-presence/` | Optional helper that shows what you're doing and your planet as your Discord status (see its README). Not loaded by the game |

Rules that keep it working:

- **All files share one scope.** A name declared at the top of any file (`const`, `let`, `function`) can be used from every other file,
  so each top-level name must be unique. Reusing one stops the game from starting, and the browser console names the clash.
- **Order matters for code that runs straight away.** Code inside a function can use anything. Code at the top level of a file
  (for example `if (!S.items) S.items = {};` or building a button) runs at start-up, so it can only use names from the same file or an earlier one.
- **Adding a file:** put it in `GAME_FILES` in `js/boot.js` (or a `<script>` tag in `index.html` for `js/world/`), add it to the list in `sw.js`, and bump `VERSION` there.
- **New saved data:** add a default in the feature's own file, like the others do (`if (!S.thing) S.thing = {};`), so older saves keep working.
- If the game doesn't start, open the browser console: errors name the file and line.
