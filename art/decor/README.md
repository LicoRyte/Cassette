# Your own decoration art

Drop PNG files in this folder and list them in `decor.json`. Anything you don't replace keeps its built-in look, so you can do it one item at a time.

## Quick start

1. Draw a PNG with a transparent background, at **1× size** (the game scales it up with crisp pixels).
2. Save it as `art/decor/<category>/<id>.png`, for example `art/decor/plant/fern.png`.
3. Add it to `decor.json` under `replace`:

```json
{
  "replace": {
    "plant/fern": {}
  },
  "custom": []
}
```
4. Reload the game. That's it.

## Animation

Put the frames side by side in one PNG (a horizontal strip), then say how many and how fast:

```json
"furn/tank": { "frames": 4, "fps": 6 }
```

Each frame is the image width divided by `frames`.

## Other options for `replace`

- `"file": "my-folder/whatever.png"` uses a different file name (the path is relative to `art/decor/`).

## Brand new decorations (`custom`)

```json
"custom": [
  { "cat": "plant", "id": "cactusking", "name": "Cactus King", "tier": 3 },
  { "cat": "light", "id": "lavalight", "name": "Lava light", "tier": 2, "glow": "#cf573c", "frames": 2, "fps": 3 },
  { "cat": "furn", "id": "throne", "name": "Captain's throne", "tier": 5, "station": true }
]
```

- `cat`: one of `wall`, `floor`, `light`, `plant`, `art`, `furn`, `window`, `ceil`, `lights`.
- `id`: a short name with no spaces. The image is `art/decor/<cat>/<id>.png` unless you give `file`.
- `tier`: price. 1 = ✦150, 2 = ✦400, 3 = ✦900, 4 = ✦1,800, 5 = ✦2,500 (the `decorCost` numbers in `economy.json`).
- `station: true` makes it a station-only item: it is sold only at Interplanetary Stations.
- `glow` (lights only): the color of the light's glow.
- `frames`, `fps`: animation, same as above.

If something doesn't show up, open the browser console: the game says which file it couldn't load or which name it didn't recognise.

## Palette

The game uses the Apollo palette (see `CREDITS.md`). You don't have to, but your art will match better if you do.

## Every built-in decoration

Use these as `<category>/<id>` in `replace`. 🛰 = station-only.

### Wall (`wall`)

Size: any size, tiled across the wall (the wall is 44 × 26 px). A 44 × 26 image fills it exactly; a small one like 8 × 8 repeats.

| id | name |
|---|---|
| `panels` | Steel panels |
| `navy` | Navy plating |
| `wood` | Walnut paneling |
| `birch` | Birch paneling |
| `brick` | Red brick |
| `wbrick` | White brick |
| `stripe` | Pink stripes |
| `mstripe` | Mint stripes |
| `dots` | Polka dots |
| `stars` | Starry wallpaper |
| `checker` | Checker tiles |
| `mint` | Green diamonds |
| `waves` | Ocean waves |
| `hex` | Hex plating |
| `plaid` | Cabin plaid |
| `chrome` | Station chrome 🛰 |
| `circuit` | Circuit board 🛰 |
| `marble` | Marble 🛰 |
| `nebula` | Nebula bubbles 🛰 |
| `goldleaf` | Gold leaf 🛰 |

### Floor (`floor`)

Size: any size, tiled across the floor strip (44 × 4 px). A 44 × 4 image fills it exactly.

| id | name |
|---|---|
| `grate` | Steel grate |
| `planks` | Oak planks |
| `dark` | Dark planks |
| `chess` | Checkerboard |
| `red` | Red carpet |
| `blue` | Blue carpet |
| `purple` | Purple carpet |
| `grass` | Grass mat |
| `tiles` | White tiles |
| `terra` | Terracotta |
| `herring` | Herringbone |
| `mosaic` | Blue mosaic |
| `rubber` | Rubber mat |
| `sand` | Beach sand |
| `ice` | Ice tiles |
| `gold` | Gold tiles 🛰 |
| `grid` | Neon grid 🛰 |
| `fmarble` | Marble floor 🛰 |
| `fstars` | Glass over stars 🛰 |
| `moss` | Living moss 🛰 |

### Light (`light`)

Size: about 9 × 9 px. Hangs from the middle of the ceiling (top edge of the image = ceiling). The soft glow is still drawn for you.

| id | name |
|---|---|
| `bulb` | Bare bulb |
| `pblue` | Blue pendant |
| `pred` | Red pendant |
| `strip` | Strip light |
| `lantern` | Paper lantern |
| `plantern` | Pink lantern |
| `fairy` | Fairy lights |
| `neon` | Pink neon ring |
| `neonb` | Blue neon ring |
| `orb` | Ice orb |
| `sun` | Sun orb |
| `cage` | Cage lamp |
| `spots` | Spotlights |
| `chand` | Chandelier |
| `candles` | Candle ring |
| `disco` | Disco ball 🛰 |
| `jelly` | Jellyfish lamp 🛰 |
| `star` | Star lamp 🛰 |
| `moon` | Crescent moon 🛰 |
| `plasma` | Plasma globe 🛰 |

### Plant (`plant`)

Size: about 8 × 16 px. Stands on the floor in the right-hand corner (bottom edge of the image = floor).

| id | name |
|---|---|
| `none` | No plant |
| `cactus` | Little cactus |
| `fern` | Potted fern |
| `sunflower` | Sunflower |
| `ivy` | Hanging ivy |
| `bonsai` | Bonsai |
| `palm` | Tall palm |
| `tulips` | Red tulips |
| `ytulips` | Yellow tulips |
| `succ` | Succulents |
| `snake` | Snake plant |
| `monstera` | Monstera |
| `bamboo` | Lucky bamboo |
| `rose` | Rose bush |
| `herbs` | Herb box |
| `shroom` | Glow mushrooms 🛰 |
| `crystal` | Crystal sprout 🛰 |
| `tentacle` | Alien tendril 🛰 |
| `trap` | Space flytrap 🛰 |
| `lily` | Star lily 🛰 |

### Wall art (`art`)

Size: about 12 × 11 px. Centered on the right half of the wall.

| id | name |
|---|---|
| `none` | Bare wall |
| `chart` | Star chart |
| `photo` | Crew photo |
| `cat` | Cat poster |
| `clock` | Wall clock |
| `planet` | Planet painting |
| `pennant` | Pennant |
| `mirror` | Round mirror |
| `land` | Landscape |
| `abstract` | Abstract art |
| `map` | Old map |
| `cert` | Pilot license |
| `guitar` | Wall guitar |
| `dart` | Dartboard |
| `kid` | Kid's drawing |
| `open` | Neon "OPEN" sign 🛰 |
| `heart` | Neon heart 🛰 |
| `gold` | Gold record 🛰 |
| `wanted` | Wanted poster 🛰 |
| `tickets` | Ticket stub wall 🛰 |

### Furniture (`furn`)

Size: about 12 × 16 px. Stands on the floor at the left (bottom edge of the image = floor).

| id | name |
|---|---|
| `none` | Nothing extra |
| `chair` | Armchair |
| `beanbag` | Beanbag |
| `books` | Bookshelf |
| `records` | Record player |
| `lava` | Lava lamp |
| `tank` | Fish tank |
| `sofa` | Little sofa |
| `globe` | Globe |
| `tv` | Old TV |
| `coffee` | Coffee machine |
| `easel` | Easel |
| `punch` | Punching bag |
| `piano` | Upright piano |
| `arcade` | Arcade cabinet |
| `catbed` | Station cat (with bed) 🛰 |
| `robodog` | Robot dog 🛰 |
| `jukebox` | Jukebox 🛰 |
| `gumball` | Gumball machine 🛰 |
| `holo` | Hologram projector 🛰 |

### Window (`window`)

Size: about 20 × 14 px. Centered on the left half of the wall.

| id | name |
|---|---|
| `none` | No window |
| `port` | Porthole |
| `brass` | Brass porthole |
| `ports` | Twin portholes |
| `wide` | Wide window |
| `dawn` | Sunrise window |
| `tall` | Tall window |
| `arch` | Arched window |
| `hexw` | Hex window |
| `triple` | Triple portholes |
| `diamond` | Diamond window |
| `big` | Big porthole |
| `slit` | Slit window |
| `cred` | Porthole, red curtains |
| `cblue` | Porthole, blue curtains |
| `neb` | Nebula view 🛰 |
| `rings` | Ringed planet view 🛰 |
| `comet` | Comet porthole 🛰 |
| `stview` | Station lights view 🛰 |
| `galaxy` | Galaxy porthole 🛰 |

### Ceiling (whole ship) (`ceil`)

Size: any width. Narrower than 44 px: hangs at the top-left of every room. 44 px or wider: starts at the room's left edge. Top edge = ceiling.

| id | name |
|---|---|
| `none` | Plain ceiling |
| `vent` | Air vents |
| `pipes` | Steel pipes |
| `copper` | Copper pipes |
| `ac` | Air conditioners |
| `fan` | Ceiling fans |
| `cables` | Cable trays |
| `sprink` | Sprinklers |
| `duct` | Big duct |
| `chains` | Hanging chains |
| `bunting` | Party bunting |
| `hangp` | Hanging plants |
| `wires` | Messy wires |
| `mobile` | Planet mobile |
| `beams` | Wooden beams |
| `tubes` | Neon tubes 🛰 |
| `proj` | Star projector 🛰 |
| `ticker` | News ticker 🛰 |
| `gtrim` | Gold trim 🛰 |
| `bubbles` | Bubble machine 🛰 |

### Hull lights (whole ship) (`lights`)

Size: about 1 × 1 to 3 × 3 px. One light, repeated along the top and bottom edges of the hull every 6 px.

| id | name |
|---|---|
| `none` | No hull lights |
| `white` | White |
| `amber` | Amber |
| `red` | Red |
| `green` | Green |
| `blue` | Blue |
| `pink` | Pink |
| `purple` | Purple |
| `nav` | Red and green |
| `twinkle` | Twinkling white |
| `pulse` | Pulsing blue |
| `gold` | Gold |
| `ice` | Ice |
| `xmas` | Holiday |
| `chase` | Rainbow chase |
| `police` | Patrol strobes 🛰 |
| `sweep` | Lightning sweep 🛰 |
| `comet` | Comet trail 🛰 |
| `neon` | Neon pink chase 🛰 |
| `beacon` | Station beacons 🛰 |
