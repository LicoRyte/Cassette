# Solarist: juice, polish and the final commit

The goal: studying with Solarist should feel calm while you work and rewarding when you stop. Every moment that
matters (launch, arrival, a finished session, something found, something made) gets a small, satisfying beat:
motion, a sound and a clear readout. Everything stays inside the 32-colour palette, plain text, pixel art and
dithering. Reduced motion and the sound setting are always respected: with them on, the beats become still and silent.

## A. The session report becomes a transmission

When a study session ends, the screen dims around the planet and the report plays like an incoming transmission:

- A header strip: "TRANSMISSION · Session 3 of 4", the world's name, a small portrait.
- Entries one at a time, in large readable type (about 20px), typed out with the typewriter blip: the story, crew
  moments, a crew story step, places found, clues. Click or press Space to finish the line, then again for the next.
- The last card is a summary: XP and Knowledge points counting up into their bars, the session bar filling white,
  things found listed with a small "stamp" for new ones (NEW PLACE, NEW WORLD, RARE).
- "Back to the ship" closes it. The full story stays in the left column, and the Journal keeps it as before.
- Settings gets "Show the report after each session" (on by default) for anyone who prefers it quiet.

## B. Game juice

| Moment | Beat |
|---|---|
| Launch | The button presses in, the timer digits flick over, the stars streak (already there), a low engine hum swells |
| Every minute | The minute digit rolls over instead of jumping |
| A session bar completes | The bar fills to white with a short shine running along it |
| Arrival at a new world | The silhouette dissolves in (already there), then a stamp slides in: "NEW WORLD · #0098 · RARE". Rare and Legendary worlds get a dithered sparkle burst and their own chime |
| A place is found | Its "?" waypoint flips into a place with a ping ring on the planet |
| XP, Knowledge, points | "+25 XP" and "+1 point" float up from the report into the top bar, which fills smoothly |
| Level up | The level bar flashes and the new title types in |
| Research | The upgrade card fills, and the line to the next tier lights up |
| Crafting | The made item flips in like a card; the stash count ticks up |
| Waypoint picked | The card's button settles into "Picked" with a check |
| Break starts | A soft chime; the timer turns green; the cards and waypoints fade in (partly there) |

Sounds use the existing sound system: short, soft, low-volume, and one setting turns them all off.

## C. Design pass

- **Study view:** while you study, everything but the planet, the timer and the next-session line fades back. Stars drift slowly. Waypoints and labels hide (already). An optional "quiet study" setting hides the levels too.
- **The next session, always visible:** a line under the timer buttons ("Next: Camp at Ford of Serand"). Clicking it opens that waypoint's card.
- **Timer digits:** drawn as chunky pixel digits in the palette, so the timer matches the planets. Kept as text underneath for screen readers.
- **Top bar:** level bars become segmented pixel bars; points get a small chip.
- **One panel style everywhere:** thin borders, an amber rule on the active panel, small caps for labels, one heading per page. Atlas cards lift a little on hover.
- **Reading:** the Journal, the Reader and the report share the same calm typography.

## D. Final polish, checks and the commit

- Check the fixes not yet tested in the browser: accessory arrows, stash hints, bigger waypoints.
- Phone check of everything new (crew editor, Workshop, Ship page, the transmission).
- Keyboard and screen reader pass: focus rings, labels, Esc everywhere.
- A full play-through on a fresh save: first start, Who's aboard, first trip, arrival, a stay, a break, research, crafting, a crew story.
- README, docs and memory updated.
- One final commit of everything since the last commit.

## Order

A first, since it was asked for already. Then B and C together, page by page. Then D, ending with the commit.
