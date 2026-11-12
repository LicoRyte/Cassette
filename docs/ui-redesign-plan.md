# Solarist UI redesign: plan

Less button, less navigation. The game has two moments, so the screen has two states, and the planet itself becomes
the main interface.

## Decisions

- **One palette for everything** (planets and UI): the 32 colours below. Solid colours; shading comes from dithering,
  not from extra in-between colours.
- **Plain text instead of emoji** everywhere.
- **Desktop first.** Phones should still work, but desktop is designed first.
- **Investigate merges into Mysteries.** Anomalies become mysteries.
- **Expedition and Salvage become Stay activities** ("Explore on foot", "Search the derelict").
- **The Meridian signal becomes a Travel on option** when it's waiting.
- So there are three verbs: **Travel**, **Stay**, **Observe**, plus the Meridian card when it's your turn.

## The palette (32 colours by BurakoIRL, in ramps)

```
#43002a #890027 #d9243c #ff6157 #ffb762   wine to peach
#c76e46 #73392e #34111f #030710           copper to black
#273b2d #458239 #9cb93b #ffd832           forest to yellow
#ff823b #d1401f #7c191a #310c1b           orange to ember
#833f34 #eb9c6e #ffdaac #ffffe4           clay to cream
#bfc3c6 #6d8a8d #293b49 #041528           silver to night
#033e5e #1c92a7 #77d6c1                   deep sea to mint
#ffe0dc #ff88a9 #c03b94 #601761           blush to plum
```

## The screens

**Study screen.** The planet, the timer, pause, and one quiet line of what's happening. Nothing else.

**Break screen.** What happened types out (crew moments, places found, clues, the sky of the day). Then "What next?":
2 to 4 choice cards made from what's possible right now, one already picked, and one Start button.

**The globe.** The planet is the map. Drag to turn it, scroll to zoom. Places are waypoints on its surface; places not
found yet are faint "?" marks; mysteries, derelicts and traders are pinned where they are. Clicking a waypoint picks
the next session there ("Camp at Ford of Serand").

## Navigation: three places and a gear

| Place | What's in it |
|---|---|
| **Atlas** | Worlds grid, star map (a toggle), album, postcards, collectibles |
| **Journal** | One timeline of every log, with search and a few filters; any entry opens in reading mode |
| **Ship** | **Crew** (people, stash), **Ship** (cutaway, rooms, decor, equipment), **Records** (achievements, Wonders, stats) |
| **Workshop** (inside Ship) | Everything Knowledge points buy, in one list: research, crafting, ship equipment |
| Gear | Settings |

Levels and Knowledge points sit small in one corner. A "today" line under the timer replaces the cycle text and feed
line: "3 sessions today, a comet tonight".

## Visual direction

- Cards with space around them instead of lists; one strong heading per screen.
- Calm motion: text types out, cards fade in, the planet turns. Nothing else moves.
- First start: after naming the ship, a "Who's aboard?" screen to make the captain and crew.

## Phases

| Phase | What | Done when |
|---|---|---|
| A ✅ | **Palette**: the 32 colours for planets and UI, dithered shading, fewer colours per world | Every colour on screen is from the palette |
| B ✅ | **Merges**: Investigate into Mysteries, Expedition and Salvage into Stay activities, the Meridian as a Travel option | Three verbs, old saves converted |
| C ✅ | **Layout**: Study and Break screens with choice cards, Atlas / Journal / Ship, the Workshop, plain text | No side columns; at most 4 things to press at the break |
| D ✅ | **The globe**: drag, zoom, waypoints, picking a waypoint | Sessions can be chosen on the planet |
| E ✅ | **Polish**: "Who's aboard?" on first start, the today line, motion, phone check | Feels finished |
