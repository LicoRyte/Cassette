# Solarist cozy redesign: plan

Solarist moves away from grinding and economy. The game is about your surroundings, discovery, looks, feelings and
imagination, and above all about what you actually study.

## The one rule

**Study time is for studying, break time is for playing.**

- During a study session the game plays itself: you travel, the crew explores, events move forward. You never need to touch it.
- During a break you see what happened and make one or two small choices.
- Every feature must pass: "Can I enjoy this in a 5-minute break, or does it happen by itself while I study?"

No streak penalties, no daily chores, nothing that makes missing a day feel bad.

## Cut, keep, replace

| Old | New |
|---|---|
| Economy, resources, trade income | Cut. **Knowledge** is the only thing you earn |
| Trade / Buy / Sell planets | Cut |
| Criminals, outlaws, Most Wanted | Cut |
| Delivery | Cut |
| Quests | Replaced by **Wonders** (sights to see, no rewards beyond the entry) |
| Building, facilities, posts | Replaced by **Stay here** activities and camps |
| Coordinator | Cut |
| Distress Run | Replaced by **Mysteries** |
| Medals | Renamed **Achievements** (Wonders become one group inside it) |
| Ship upgrades bought with resources | Ship looks fully free. **Ship equipment** comes back as things you craft or trade for, and each unlocks new crew interactions or activities |
| Meridian story | Kept as the main storyline (open question 1) |
| Logbook, star map, collection | Kept and grown into the libraries |

## Systems

### 1. Text items: equipment, clothing and traits

Everything a character has is **plain text: a name and a description**. No stats.

```json
{ "id": "patched-scarf", "kind": "clothing", "name": "Patched scarf",
  "desc": "Knitted by someone who loved you, mended by someone who didn't know how.",
  "tags": ["warm", "soft", "keepsake"] }
```

- `kind` is `equipment`, `clothing` or `trait`.
- The description is there so the player can imagine their character.
- `tags` let events find items without naming them. A cold-world event can look for anything `warm`, and a dark cave for a `light`.
- New items are added by writing more entries in a JSON file. There's no code change.

### 2. Characters and crew

- **You:** name, pronouns (she / he / they, used to write sentences), age, profession, a trait, clothing and equipment.
- **Crew:** 0 to 5 members, each built the same way. Players can adopt ready-made ones or press **Surprise me**.
- Everything can be changed later, and setup fits on one screen.
- Profession and traits change **how things are written**, never stats. A botanist notices the plants, and a nervous person jumps at noises.
- **Hidden friendships:** crew who share trips grow closer, and their lines change over time. There's no visible meter.

### 3. Knowledge and crafting

- **Earning:** finished study sessions give **Knowledge**. It's the only thing you earn.
- **Crafting:** spend **1 Knowledge** to get a random equipment item or clothing style.
- **Ship equipment:** crafting costs more. Each piece opens new crew interactions or activities. For example:
  - A telescope adds stargazing.
  - A galley adds cooking scenes.
  - A record player adds dancing.

### 4. Item encounters

Story-driven scenes with a **trader**, meaning anyone who can trade: a passing traveler, planet locals, a civilization.

- **What can happen:** trade one of your items for one of theirs, receive a gift, or lose something.
- **Losing feels like a story, not a punishment.** For example: "You left your scarf with the shivering child at the dock."
- **Item tags pick the scene.** For example, locals admire anything `shiny`.
- **Ship equipment:** it can be traded too.

### 5. Planets from settings

- **How planets are made:** each one comes from settings instead of a fixed type: temperature, water, atmosphere, life, age and gravity.
- **Labels:** the type becomes a label made from the settings, like "a cold, wet, young world".
- **Look:** the look, biomes and descriptions all come from the same numbers, so they always agree. Colours can vary much more (open question 4).
- **Places to discover:** biomes, landmarks, structures, each with a generated description.
- **Naming:** players can name planets and places. A generated name is always filled in, so naming is optional.
- **Staying:** study again on the same planet and the crew finds more places.

### 6. Travel on, or stay here

At the break, choose:

- **Travel on:** the next study session flies to a new world.
- **Stay here:** pick one activity (camp, stargaze, fish, sketch, collect samples, cook, crew picnic...). It plays out during the next session and gives a short log entry and maybe a souvenir.

Souvenirs go into the ship, so after many trips the ship looks like your history.

### 7. Mysteries (replace the Distress Run)

- **What they are:** a strange signal, a moving rock, a sky changing colour. Each needs 2 to 4 study sessions of observing.
- **Rewards:** lore, a Knowledge bonus, a story piece, a Wonder.
- **Rules:** always optional and never failed. If you leave, the Mystery waits.

### 8. Crew life

- **Interactions:** built from blocks: a crew member, plus another crew member or a place, plus traits, items and what happened.
- **Campfire talks:** on long breaks the crew chats about the last few trips. This is a good spot for friendship moments and story hints.

### 9. The libraries

- **Learning log ("What did you learn?"):** an optional one-line box after each session, with subject tags.
  - It's saved with the planet: "Netue IV, where I learned photosynthesis."
  - You can browse "all the worlds where I studied chemistry". This is the main link between the game and real studying.
- **Note library:** game logs and lore, searchable.
- **Planet Collection:** an album of postcards, with favourites, a home planet, filters, and "?" silhouettes for things not seen yet.
- **Postcards:** one tap makes a pixel postcard (planet, crew, caption) to keep or share.

### 10. Soft reasons to come back

- **Sky of the day:** one special event per day (meteor shower, aurora, comet). Nothing is lost if you miss it.
- **Star regions:** they open with **hours studied**, each with its own planet flavours.
- **Return visits:** your old camp is still there, maybe changed by the season.
- **Biome soundscapes during breaks:** rain on jungle worlds, wind on deserts.
- **Gentle weekly recap:** hours, worlds, Mysteries solved, most-studied subject. No guilt.
- **The overall pull:** curiosity ("?" entries, Mysteries, next region), attachment (crew, named places, souvenirs) and reflection (the learning log).

## The foundation: building-block text

Almost every system writes sentences from pieces, so this comes first. Templates live in JSON:

```json
{ "when": { "biome": "salt", "time": "dusk" },
  "text": "At dusk the salt flats turn pink. {crew} says it smells like {crew.home}." }
```

- **Slots:** fill in a crew member, an item, a place, the weather or a pronoun.
- **Conditions:** match on biome, tags, traits and friendship, so text fits the moment.
- **Adding content:** more variety means more JSON, not more code.

## Phases

| Phase | What | Done when |
|---|---|---|
| 0 ✅ | **Text engine** and data formats (items, templates). Built: `js/world/text.js`, `content/`, `tools/text-preview.html` | Sentences generate from JSON with slots and conditions |
| 1 ✅ | **Cut and migrate.** Remove the cut systems, Medals → Achievements, Distress Run removed. Add the **learning log** (cheap, high value) | Old saves load, keep planets and logs; nothing references removed systems |
| 2 ✅ | **Characters and crew**, text items, Knowledge and crafting | You can create yourself and up to 5 crew, and craft items |
| 3 ✅ | **Planets from settings**, places to discover, naming, Travel on / Stay here with activities | Each planet's look, biomes and text agree; staying finds more places |
| 4 ✅ | **Crew life**, item encounters with traders, ship equipment | Crew talk and react; you can trade, receive and lose items |
| 5 ✅ | **Mysteries** | Multi-session events with lore rewards |
| 6 | **Libraries:** album, postcards, note library, Achievements with Wonders | Everything is browsable and shareable |
| 7 | **Extras:** campfire talks, return visits, sky of the day, regions, soundscapes, weekly recap | Each one works and stays light |

## Decisions

1. **Meridian story: kept** as the main storyline.
2. **Old saves carry over:**
   - **Kept:** planets, logs, names, Meridian progress and Achievements (old Medals). Collectibles become souvenirs.
   - **Free:** every ship look is unlocked.
   - **Crew:** hired crew become crew members (up to 5), each given generated clothing, equipment and a trait.
   - **Leftover resources:** turn into starting Knowledge, 1 per 500 resources, capped at 20.
   - **Dropped:** posts, facilities, trade, bounties, the Coordinator and the Distress Run, quietly, with one log entry saying the voyage changed.
3. **Writing: very little by hand, but easy to add.**
   - **Where content lives:** in JSON files in one `content/` folder, one file per kind (items, traders, places, activities, Mysteries, crew lines, Wonders).
   - **Adding things:** a short guide at the top of each file shows how. Copy an entry, change the words, done; no code.
   - **Built-in content:** the game ships with enough building blocks to feel varied, and you add more over time.
4. **Palette: Resurrect 64** (by Kerrie Lake, on Lospec) for planets.
   - **No fixed colour sets.** Planets don't use preset sets. The palette is split into hue families (reds, oranges, yellows, greens, teals, blues, purples, pinks, browns, greys), each ordered dark to light.
   - **Mixing:** each planet picks families freely, steered by its settings (cold worlds lean blue and teal, but can still get a pink sea or a gold sky). That gives combinations, not fixed pairs.
   - **Lighting:** shading stays within a family's own dark-to-light ramp.
   - **UI and sprites stay on Apollo** for now. Moving the whole game to Resurrect 64 can be decided after seeing planets in it.
   - **Credits:** add Resurrect 64 to CREDITS.md. Check the exact 64 colours against the Lospec page when building.
5. **Knowledge pace:**
   - **Earning:** 1 per finished study session, +1 for each Full Cycle, 1–2 for solving a Mystery.
   - **Crafting:** a clothing or equipment item costs 1, and ship equipment costs 4.
   - **Two numbers:** your lifetime Knowledge (Knowledge Level) and what you can spend now. Spending never lowers your level.
   - **Pace:** at a few sessions a day, that's a new item most days and new ship equipment every week or so. It's slow enough to look forward to, without grinding.
