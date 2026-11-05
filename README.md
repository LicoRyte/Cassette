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
| `index.html`, `style.css` | The page and its look (pixel style, colours from the 32-colour palette at the top of `style.css`) |
| `shell.js` | Sounds, notifications, the install button, offline support and the pixel flight scene behind the clock |
| `solarist.js` | The game: timer, planets, missions, posts, collectibles, levels, Distress Runs, stats |
| `economy.json` | Every resource income and price. Edit, commit, reload. Notes inside explain each number |
| `items.json` | The collectibles. Add new ones at the end of a list only (saves remember items by position) |
| `sw.js` | Offline support. **Bump `VERSION` at the top whenever you change any file**, or installed copies keep the old one |
| `manifest.webmanifest`, `icons/` | App name and icons for installing |
| `fonts/` | Pixelify Sans and Atkinson Hyperlegible (both SIL Open Font License, see the .txt files) |
| `sfx/` | Sounds (see `sfx/CREDITS.txt`) |

`economy.json` and `items.json` are always fetched fresh when you're online, so edits to them show up without bumping `VERSION`.
