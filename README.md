# Solarist

A focus timer and nothing else: one big clock in a vintage sci-fi console, made to be satisfying to watch while it runs.
No rewards, no streaks to protect, no story to chase. Just the time passing nicely. Around it, a desk you can move across for your own notes and photos.

**Play:** https://licoryte.github.io/solarist/

It works offline: open it once and it saves everything it needs. In Chrome or Edge (computer or Android) use **Install app**
(or the browser menu) to get it as its own app with an icon. On iPhone: Share, then Add to Home Screen.

Your progress is saved in this browser.

## Files

| File | What it is |
|---|---|
| `index.html`, `style.css` | The page and its look: a dark console, colours from the 32-colour palette by BurakoIRL (see `CREDITS.md`) |
| `js/ui/clock.js` | The clock-only Solarist: switches the space game off and adds the console, state colours, power-on, landing and breathing |
| `js/ui/board.js` | The desk: the pannable, zoomable workspace around the clock, with notes, Polaroid photos, strings and number-key bookmarks |
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

`Space` starts or pauses, `1`-`9` glide to a bookmark, `Shift`+`1`-`9` bookmarks the selected note or photo, `0` goes back to the clock, `Esc` puts down the note you're writing or closes a page.

## What's in it

- **The clock:** one centred clock in a console frame with amber corner brackets, over a slowly drifting grain and faint scanlines, with a single line sweeping down the screen once a minute. Above the digits: Ready, Focus or Paused, and which session of the cycle this is. Under them: the session bars, Start/Pause and Reset, and how many sessions you've done today.
- **Colour tells you where you are:** cream while you focus, warmer in the last minute, mint on a break, dimmed and blinking when paused, quiet silver when ready.
- **The feel:** each digit fades in as it changes and the old one lingers for a moment like phosphor. The colon glows on every second. Pressing Start switches the digits on like an old screen. In the last ten seconds the fade slows down. At 00:00 the digits hold and glow for a moment before letting go. Breaks don't tick: the digits breathe. Reduced motion keeps all of it still.
- **The tick:** while you focus and Solarist is the window in front, the clock ticks once a second, softer through the last minute (Settings, Clock: on or off and how loud).
- **The desk:** the whole screen is one big workspace with the clock in the middle. Drag empty space (or the clock's face) to move around, scroll to zoom, double-click anywhere to pin a note there, and drop photos straight on (they hang as Polaroids with a caption). Drag from a red pin onto something else to tie a string; click a string to cut it. **Bookmarks:** click a note or photo and press Shift+1 to 9 to give it a number; 1 to 9 glides the camera there and 0 glides back to the clock (the 0 button shows the time while the clock is out of sight). The bar along the bottom switches, makes, renames and deletes desks. Photos are kept in this browser (IndexedDB), shrunk to 640 px.
- **Gone on purpose:** the space game (planets, the crew, the stories, the Atlas, the Journal, the ship). Its code and content are still in the project, switched off by `js/ui/clock.js`, and the full space version is kept in git under the tag `space-game` (`git checkout space-game`).

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
| `js/ui/` | The screen: `controls.js`, `hud.js` (layout pieces and the session report), `learning.js` (the Learning log), `ship-interior.js`, `layout.js` (pages and tabs), `breakpanel.js` (the rail under the timer), `globe.js` (turning the planet; its waypoints are switched off), `season-ui.js` (the story-first screen, the Stories page and the episode reader), `polish.js` (the timer digits, the clock tick, shines and stamps), `board.js` (the Board), `aboard.js` (Who's aboard? on a first start), `main-screen.js`, `right-panel.js`, `panels.js` (Research), `keyboard.js`, `planetarium.js`, `reports.js`, `ship-page.js`, `star-map.js`, `ship-views.js`, `crew.js` (the Crew page), `logbook.js`, `album.js` (favourites, home planet, postcards), `reader.js`, `intro.js` |
| `tools/discord-presence/` | Optional helper that shows what you're doing and your planet as your Discord status (see its README). Not loaded by the game |

Rules that keep it working:

- **All files share one scope.** A name declared at the top of any file (`const`, `let`, `function`) can be used from every other file,
  so each top-level name must be unique. Reusing one stops the game from starting, and the browser console names the clash.
- **Order matters for code that runs straight away.** Code inside a function can use anything. Code at the top level of a file
  (for example `if (!S.items) S.items = {};` or building a button) runs at start-up, so it can only use names from the same file or an earlier one.
- **Adding a file:** put it in `GAME_FILES` in `js/boot.js` (or a `<script>` tag in `index.html` for `js/world/`), add it to the list in `sw.js`, and bump `VERSION` there.
- **New saved data:** add a default in the feature's own file, like the others do (`if (!S.thing) S.thing = {};`), so older saves keep working.
- If the game doesn't start, open the browser console: errors name the file and line.
