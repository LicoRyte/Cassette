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
| `js/ui/draw.js`, `js/ui/draw-mode.js` | Drawings: the hand-drawn shapes, and the pen (tools, inks, eraser) |
| `js/ui/export.js` | Saving a board as an image, backups of all boards, loading a backup |
| `js/ui/notes.js` | Rich notes: the formatting toolbar, typing shortcuts, paper colours, text size, and the cleaner that keeps only the tags a note uses |
| `js/ui/feel.js` | The feel: the chimes and desk sounds (made live with Web Audio), the green edge glow on every second, the desk dimming while you focus |
| `js/ui/tape.js` | The session strip and the tape-deck keys under the timer |
| `js/ui/clock.js` | The clock-only Solarist: switches the space game off and adds the console, state colours, power-on, landing and breathing |
| `js/ui/board.js` | The desk: the pannable, zoomable workspace around the clock, with notes, Polaroid photos, drawings, frames, strings, picking and groups, undo, and number-key bookmarks |
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

`Space` starts or pauses, `D` draws, `Ctrl+Z` / `Ctrl+Shift+Z` undo and redo, `Ctrl+G` groups, `Delete` removes what's picked, `1`-`9` glide to a bookmark, `Shift`+`1`-`9` bookmarks the selected note or photo, `0` goes back to the clock, `Esc` puts down the note you're writing or closes a page.

## What's in it

- **The clock:** one centred clock in a console frame with amber corner brackets, over a slowly drifting grain and faint scanlines, with a single line sweeping down the screen once a minute. Above the digits: Ready, Focus or Paused, and which session of the cycle this is. Under them: one strip for the whole cycle (a long segment for each study session, a short one for each break, a longer one for the long break, filling as you go), then two hollow tape-deck keys, Play/Pause and Rewind (Reset), with the key to press written underneath; Play stays latched down while a session runs, and both play a cassette click. Two little tape reels sit either side of the strip: the left holds what's left of the cycle and the right what's done, they turn while the timer runs, ease to a stop when you pause and spin back on Rewind. Under the keys, today's sessions on a three-wheel tape counter that rolls up when a session ends. At 00:00 the screen's edges darken and lift once, like a breath out.
- **Colour tells you where you are:** cream while you focus, warmer in the last minute, mint on a break, dimmed and blinking when paused, quiet silver when ready.
- **The feel:** each digit rolls down into place as it changes, like an odometer, while the old one rolls out underneath and lingers for a moment like phosphor. The colon glows on every second, and the edge of the screen glows green once with it, so you can feel the clock without watching it. Pressing Start switches the digits on like an old screen. In the last ten seconds the roll slows down. At 00:00 the digits hold and glow while a soft, low chime plays, like a bell through a wall (a lighter one ends a break). Breaks don't tick: the digits breathe. Reduced motion keeps all of it still.
- **The tick:** while you focus and Solarist is the window in front, the clock goes tick, tock, never quite the same twice, and softer through the last minute (Settings, Clock: on or off and how loud).
- **Drawing:** press D (or Draw) and the desk becomes paper. Tools: pen, arrow, line, circle, box, frame and eraser (keys P, A, L, C, B, F, E), seven inks and three thicknesses ([ and ]). Everything looks drawn by hand: lines bow a little, circles don't quite close, an arrow bent mid-drag curves. Hold Shift for straight angles, true circles and squares. A fresh stroke is wet for a moment, a little brighter, then dries to its ink. Strokes drawn close together within a moment of each other make one drawing, and a drawing is a thing on the desk like a note: drag it, tie strings to it, bookmark it, group it. The right mouse button and the wheel still move and zoom the desk. D or Esc puts the pen down.
- **Frames:** labelled areas for a topic (Frame in the bar, or the frame tool). Drag a frame by its name or any of its edges and everything inside comes along; drag its corner to resize; pick a colour when it's selected. Bookmark a frame and its number glides there with the whole frame in view.
- **Picking and groups:** Shift+drag on the empty desk draws a box that picks what it touches; Shift+click picks or lets go of one thing. Dragging any picked thing moves them all. Group (Ctrl+G) ties them so they always move together; Ungroup (Ctrl+Shift+G); Delete removes what's picked; Ctrl+A picks everything on the board.
- **Undo:** Ctrl+Z and Ctrl+Shift+Z (or the arrows in the bar) undo and redo any change to the desk: moving, adding, deleting, strings, drawings, frames, groups, colours, boards. Writing in a note counts as one step from when you start to when you click away. Removed photos can come back too (they're only cleared from storage the next time Solarist starts).
- **Saving and loading** (Board ▾): save this board as an image (a PNG of everything on it), save a backup of all boards (one JSON file, photos included), or load a backup (its boards are added next to yours, nothing is replaced). New, rename and delete boards are there too.
- **Notes worth reading:** click a note and its toolbar sits above it: Title and Heading, bold, italic, underline, strikethrough, a highlighter, inline code, bullet, numbered and check lists (click a box to tick it), quotes and Clear. Below that: eight paper colours, smaller or bigger text, and Fit. Drag a note's bottom-right corner to make it bigger (long notes scroll inside). Shortcuts while you type, at the start of a line: `# ` title, `## ` heading, `- ` list, `1. ` numbered list, `[] ` checklist, `> ` quote. Keys: Ctrl+B/I/U, Ctrl+Shift+X strikethrough, Ctrl+Shift+H highlight, Ctrl+` code, Ctrl+Alt+1/2 title/heading, Ctrl+Shift+7/8/9 numbered/bullet/checklist, Tab and Shift+Tab to indent a list, Ctrl+Alt+0 clear. Pasting brings plain text. The note you're working on straightens up while it's selected.
- **The desk while you focus:** leave it alone for a few seconds and everything but the clock dims; move the mouse and it all comes back. Notes are typed in Courier with a little ink bleed and a block cursor. Cards hang from their pin, swing while you carry them and settle with a bounce; strings wobble when you move either end and drop into place when you tie them. The desk has its own sounds, all made live: paper when you pick up and put down, a pin, a string going taut, a tear when you cut one, a camera shutter for photos, and soft key clicks as you write. Settings, Feel turns the glow, the dimming and the desk sounds off one by one.
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
