# Solarist

A Pomodoro study timer where every study session is a trip through deep space to a new, randomly generated planet.
Build posts, collect oddities, answer distress calls, and level up your captain while you study.

**Play:** https://licoryte.github.io/solarist/

It works offline: open it once and it saves everything it needs. In Chrome or Edge (computer or Android) use **Install app**
(or the browser menu) to get it as its own app with an icon. On iPhone: Share, then Add to Home Screen.

Your progress is saved in this browser (the same save as the Solarist window on licoryte.github.io).

## Files

| File | What it is |
|---|---|
| `index.html`, `style.css` | The page and its look: black space, floating text, colours from the 32-colour palette at the top of `style.css` |
| `shell.js` | Sounds, notifications, install, offline support, and the planet viewport: a WebGL shader that draws each world as a dithered, palette-snapped 3D sphere (radar sweep while surveying, construction lights while building, and so on) |
| `solarist.js` | The game: timer, planets, missions, posts, collectibles, levels, Distress Runs, stats |
| `economy.json` | Every resource income and price. Edit, commit, reload. Notes inside explain each number |
| `items.json` | The collectibles. Add new ones at the end of a list only (saves remember items by position) |
| `sw.js` | Offline support. Files are always fetched fresh when online, so edits show up on the next reload. Bump `VERSION` only if you add or remove files |
| `manifest.webmanifest`, `icons/` | App name and icons for installing |
| `fonts/` | Barlow and Barlow Condensed (SIL Open Font License, see `fonts/OFL-Barlow.txt`) |
| `sfx/` | Sounds (see `sfx/CREDITS.txt`) |


## Controls

`1`-`4` pick the mission, `Space` starts or pauses, `Esc` closes a page or the session report.
