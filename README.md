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

- **Main screen:** the planet fills the middle. The timer is an instrument panel in the top-left corner, under the levels: as wide as the level bars: a status line, the time, one white bar per study session of the cycle (two to a row), then Start/Pause and Reset side by side. R resets and S skips while the timer is stopped (there is no Skip button). On breaks, **What happened** (last session's story and the report) sits under the timer and **What next?** on the right: up to four choice cards, each with its own small choice: **Travel on** (a new world, the Meridian signal, home or a favourite, and the star region), **Stay here** (explore on foot, search a derelict, or an activity), **Observe** (a mystery) and **Meridian** when a chapter is here. A swap offer or the Meridian door shows above them. While you study, only the planet and the timer stay (H hides the side columns any time).
- **The globe:** the planet is the map of the world you're at. Drag it to turn it, scroll to zoom (double-click to zoom back out). Places you've found are waypoints on its surface, places not found yet are faint "?" marks, and a derelict, a trader, a mystery and the Meridian are pinned where they are. Click one to pick your next session there: "Camp at Ford of Serand" (the story happens at that place), "Explore on foot" for a "?", or Observe for a mystery. Waypoints hide while you study.
- **First start:** the ship's AI asks your name and your ship's name, then "Who's aboard?" opens the same crew editor to make you and your crew (everything starts filled in; change it later on the Ship page).
- **The today line** under the timer: where you are in the cycle, how many sessions today, and the sky of the day ("Session 2 of 4 · 3 sessions today, a comet tonight").
- **Phones:** one column, with the planet and timer on top and the break panel below; swipe the planet sideways to turn it.
- **Pages** (top bar): **Atlas** (Worlds, Map, Collection), **Journal** (every log with filters and search, the Learning log, and a reader for one at a time), **Ship** (Crew, Ship and its equipment, Records, Workshop) and **Settings**. Text is plain, without emoji.
- **Worlds:** each one starts as a few settings (heat, water, air, life, age); its type is whichever fits, and its temperature, colours (from the 32-colour palette by BurakoIRL, in colour families, with dithered shading) and description follow from the same numbers. Every world shows them in words: "Cold, wet, young ocean world".
- **Places:** every world has 5 to 8 places. Its expedition (three study sessions: landing, crossing, finale; gas worlds get a cloud dive) charts three, each with a careful or bold path and maybe a collectible. Staying finds the rest. Every place gets a short description and can be renamed (✎).
- **Travel on or Stay here:** Travel on finds a new world. Stay here spends the session on this one doing something you pick (wander, camp, stargaze, fish, sketch, collect samples, cook, picnic: `content/activities.json`). It writes a little story with your crew and may turn up a new place or a souvenir.
- **Anomalies:** a world's oddity is a mystery: observe it for three sessions and its explanation goes in the Codex, with Knowledge and an Anomalies find.
- **Arrivals:** some new worlds have a visitor: a chance meeting (a small story), a derelict ship to salvage (one session, one find), or someone who trades. Most worlds are quiet.
- **Traders:** travelers, locals and whole civilizations (`content/traders.json`). They might offer a swap for something of yours (Swap or No thanks, above the choice cards), give you something, or a crew member might give something away to someone who needs it. They turn up on arrival and sometimes while you stay.
- **Crew life:** crew show up in each other's stories, and grow closer the more sessions they share. It's never shown as a number: their lines just change, from polite to inside jokes.
- **Mysteries:** something strange turns up now and then (a stone that moves, a voice in the ice, seven notes on the radio: `content/mysteries.json`). The Mystery mission observes one for a session; after 2 to 4 sessions it's solved, with its answer in the Codex, Knowledge points and a Wonder. Mysteries travel with the ship and can't be failed; up to three can be open at once.
- **Wonders:** sights worth seeing (`content/wonders.json`), like a ringed ocean world or rain made of glass. Each unlocks the first time you find a matching world; mysteries leave Wonders too. All of them are on the Ship page, under Achievements, with a hint for the ones still out there.
- **The album:** favourite worlds (★) and a home planet (🏠) from a world's Logbook page, a Favourites filter, and a row of planet types with "?" for the ones not found yet.
- **Postcards:** 📮 on a world's page makes a pixel postcard with a caption, signed by you and the crew. Keep it in the album (Logbook, Postcards) or save it as an image to share.
- **Searching the logs:** the Journal has a search box for every log, the Codex and old transmissions.
- **Star regions:** Travel on can head into different parts of space as you study more (`content/extras.json`): the Near Reaches, the Glass Nebula (10 hours), the Quiet Belt (25), the Green Drift (50), the Ember Reach (100) and the Far Dark (200), each with its own kinds of worlds and colours.
- **Going back:** Travel on can also take you home, or back to a favourite world. A little time has passed, and your old camp might still be there.
- **Little rhythms:** the sky of the day (the same for everyone; your first session of the day sees it), a campfire talk before every long break, and a gentle recap of last week (only when something happened). On breaks, ambient sound plays the world's own soundscape: rain, ocean swell, wind or birdsong.
- **Ship equipment:** bigger things for the ship (a telescope, a record player, a garden, a reading nook, a stove, a game table, hammocks), crafted for 4 Knowledge points in the Ship's Workshop. Each one adds a Stay here activity and new moments aboard.
- **The Meridian:** five people left on a small survey ship and never came back. When their signal is waiting, Explore can Follow the Signal instead of finding a random world. It leads to one of fifteen worlds they left their mark on, each a chapter of five study sessions. Leave mid-chapter and the signal brings you back. Read it all under Transmissions, Meridian.
- **Learning log:** after each study session, write one optional line about what you learned (with a subject). It's saved with the world you were at: see it on that world's Logbook page, or all of it in the Journal, Learning.
- **Your ship:** every room is aboard from the start, and every decoration and hull colour is free to use.
- **You and your crew:** under Ship, Crew, a full-page editor: everyone aboard on the left, the one you picked filling the rest. You and up to five crew each have a name, pronouns, an age, a profession, a trait, five clothing slots (hat, accessory, top, bottom, shoes) and one thing to carry. Arrows step through what can go in each slot: on a first start anything at all, after that whatever is in the stash (crafting and traders bring more). All of it is words (from `content/items.json`), never stats: it changes how the stories are written.
- **Knowledge points:** one for every finished study session, Full Cycle, solved anomaly and Meridian chapter. Spend them in the Ship's Workshop on Research (1 to 8 points) or on crafting (1 point: a random piece of clothing or gear, new to you when it can be).
- **Full Cycle:** finish every session and break of a cycle without skipping, and something interesting waits on your next trip.

## Code layout

No build step: plain JavaScript files that the browser loads in a fixed order. To try changes, serve the folder
(for example `python -m http.server 8800`) and open http://localhost:8800. Opening `index.html` straight from disk won't work.

| Folder | What's in it |
|---|---|
| `js/world/` | Pure content and generators, loaded by `index.html`: `random.js`, `planet-data.js` (the lists planets are made from), `planet.js` (`makePlanet`), `posts.js` (post transmissions and facilities), `events.js`, `items.js` (collectibles), `paint.js` (palette and pixel art), `economy.js` (default numbers) |
| `js/world/text.js` | The text engine: fills sentence templates from `content/` (slots, pronouns, conditions). How-to for writers at the top of `content/lines.json` |
| `content/` | JSON the text engine uses: `items.json` (equipment, clothing, traits), `lines.json` (sentence pieces), `activities.json` (Stay here activities and their lines), `traders.json` (traders, their lines, and chance meetings), `mysteries.json`, `wonders.json`, `extras.json` (campfire and return lines, skies, regions). Listed in `CONTENT_FILES` in `js/boot.js`. Try them in `tools/text-preview.html` |
| `js/boot.js` | Start-up. Holds `GAME_FILES`, the load order of everything below |
| `js/game/` | Rules and saved state, one file per feature: `core.js` (the save `S`, `save()`, `el()`), `voyage.js`, `encounters.js` (arrivals and deep-space events), `research.js`, `ship.js`, `levels.js` (levels, records, save migrations), `people.js` (you, the crew, the stash and crafting), `expedition.js`, `investigate.js`, `stay.js` (places and Stay here), `traders.js` (trades, gifts and giving things away), `mysteries.js`, `wonders.js`, `extras.js` (regions, going back, the sky of the day, campfires, the weekly recap), `story.js` (the Meridian), `session.js`, `timer.js` (`finish()`, the end of every session, and `draw()`), `achievements.js` (achievements and Side Quests), `start.js` |
| `js/ui/` | The screen: `controls.js`, `hud.js` (layout pieces and the session report), `learning.js` (the Learning log), `ship-interior.js`, `layout.js` (pages and tabs), `breakpanel.js` (the break panel and its choice cards), `globe.js` (waypoints on the planet), `aboard.js` (Who's aboard? on a first start), `main-screen.js`, `right-panel.js`, `panels.js` (Research), `keyboard.js`, `planetarium.js`, `reports.js`, `ship-page.js`, `star-map.js`, `ship-views.js`, `crew.js` (the Crew page), `logbook.js`, `album.js` (favourites, home planet, postcards), `reader.js`, `intro.js` |
| `tools/discord-presence/` | Optional helper that shows what you're doing and your planet as your Discord status (see its README). Not loaded by the game |

Rules that keep it working:

- **All files share one scope.** A name declared at the top of any file (`const`, `let`, `function`) can be used from every other file,
  so each top-level name must be unique. Reusing one stops the game from starting, and the browser console names the clash.
- **Order matters for code that runs straight away.** Code inside a function can use anything. Code at the top level of a file
  (for example `if (!S.items) S.items = {};` or building a button) runs at start-up, so it can only use names from the same file or an earlier one.
- **Adding a file:** put it in `GAME_FILES` in `js/boot.js` (or a `<script>` tag in `index.html` for `js/world/`), add it to the list in `sw.js`, and bump `VERSION` there.
- **New saved data:** add a default in the feature's own file, like the others do (`if (!S.thing) S.thing = {};`), so older saves keep working.
- If the game doesn't start, open the browser console: errors name the file and line.
