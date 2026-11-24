# Laksa Arcade

A hub of four mini-games about Pahang's laksa gebuk heritage, sharing one
player record, leaderboard and admin view. After registering (username + email)
the player lands on the games screen ("PILIH PERMAINAN") and picks:

1. **Laksa Gebok Run** – the 3D runner (three.js, procedural models): collect
   laksa bowls and gebuk, finish three levels in one 120-second run.
2. **Laksa Quest** – a side-scrolling platformer (canvas 2D) in the spirit of
   Super Mario: one 3-minute run through a generated kampung world, collecting
   the six components of a bowl of laksa gebok while jumping logs, streams,
   falling rocks, bamboo traps, wild boars and monkeys.
3. **Teka Silang Laksa** – a 12×12 crossword: 15 clues from a 100-question bank (Pahang heritage, the laksa kitchen, laksa gebok), laid out at random every play
   about laksa, gebuk and Pahang.
4. **Cari Kata Laksa** – a word search: 10 panels of 10 Pahang heritage words (100 in all), found from
   Malay clues in a 12×12 letter grid that is arranged fresh every play, 5 minutes per panel.

Each game writes its own records; the leaderboard has a tab per game and the
admin page shows the best score of every game per player.

## Laksa Quest (platformer)

Graphics come from the asset pack sheet sliced into `laksa-quest-atlas.webp`
(110 named frames, table `FR` in platformer.js, built by the scratch scripts
slice.py / slice2.py): player animations (idle, run, jump, hurt, celebrate,
game over), the 18 ingredients, coin, heart, gebok, mortar, basket, spoon,
four bowl states, boars, monkeys, bees, rock, log, crate, bamboo trap, tiles
(grass, stone, floating platform, table, water) and the scenery (house, hut,
stall, palm, tree, bamboo, banana, bushes, bridge, waterfall, fence). Until
the atlas loads, shapes and emoji stand in. The wild boar is drawn from
`boar-sheet.png` (six 169×116 frames a row: idle then five walk poses; row 0
faces right, row 1 left) and the traps and logs from `bamboo-traps.png`
(`TRAP_FR`: hanging trap, fence, log, stake). The bowl pictures in the HUD
are `laksa-bowl.png`.

A 3-minute run (`LIMIT` in platformer.js) on one clock, 3 hearts. The world
is generated as the player advances from hand-made chunks (`CHUNKS`, 11 rows
of ASCII, 16–22 columns each: safe, gap, hazard, enemy, rock, log, stairs,
power, mixed), picked with weights that grow harder after each minute and
never two of a kind in a row. Every chunk has flat ground at both ends, gaps
are at most 4 columns (a jump clears 5.4) and every falling rock is announced
by a sign and a shake. The chunk weights are biased per zone (`bias`). Two
chunks make a zone (`ZONE_CHUNKS`); the zones cycle through Kampung Pahang,
Sungai & Jambatan (gaps are water), Hutan Tropika and Kampung Laksa Gebok,
each painted on its own backdrop (`quest-bg-village.jpg`, `quest-bg-river.jpg`,
`quest-bg-jungle.jpg`, `quest-bg-laksa.jpg`, 1024×341). Only the current
zone's picture is drawn: it fills the screen (cover scale, bottom-aligned)
and pans slowly across the zone (`drawBackgrounds`), so two paintings never
meet on screen. Every zone ends with a flat gate strip (`GATE`, 16 columns,
two coins) whose portal door stands on column 3 (`GATE_DOOR_COL`, `gates[]`);
touching it starts a warp (`warp`, `warpStep`): 0.4 s fade to dark with the
next zone's name, the player lands past the arrival door of the next zone
(`gt.land`, first column with ground, `lastSafe` moved there), 0.4 s fade in.
Doors are wooden arches (`drawPortal`) and every one of them glows all the
time, however often it is entered: an exit glows in the next zone's sky
colours with rising rings and a turning light spiral and carries a plaque
"→ icon NAME"; the arrival door of each zone (column 1.5, `gt.land`) glows in
the previous zone's colours under a "← icon NAME" plaque and warps the player
back onto that zone's gate strip, two tiles before its exit door. A door fires
when the player's centre comes within 22 px of its centre, from either side
(`inDoor` keeps a door from firing twice while the player stands in it). Only
the door at the world's start is closed: nothing lies behind it.
After Kampung Laksa Gebok the door leads back to Kampung Pahang for the next
lap (`lap` on `zoneMarks` and `gates`): the lap opens like the first scene,
a flat start strip with one pickup and one coin (`HOME`, counted as one of
the zone's chunks), and every other chunk of a repeat lap keeps only every
second pickup, coin, rare and power-up (every third from lap 3; `every` in
`appendChunk`). The door plaque, the warp text and the zone banner add
"Pusingan 2" from the second lap on. Losing a life returns the player to the
very start (`repeatWorld`): the layout stays,
every second collected pickup comes back (every third after the next lost
life), stomped boars likewise, rocks are re-armed and a question block's gift
is given once. Nothing behind the player is pruned any more. The pictures are
scenery only: the path sits on row 9 (`GROUND`), platforms, gaps and hazards
keep their own collision tiles, gaps are shaded over the picture, and
`addJumpPlanks` puts a plank within one jump of the path in every chunk.
In the river and jungle zones one plank per chunk is detached as a mover
(`movers`, `detachMover`): it bobs up and down over water and slides sideways
in the jungle, and `rideMovers` carries the player along. Until the pictures
load, the drawn sky, hills, signboards and scenery stand in.

- Opening the game shows "Syarat Permainan" (`#pf-rules`, OK button); the
  world is drawn behind it and the clock starts on OK. MAIN SEMULA skips it.
  The card follows the user's illustrated mockups: a yellow pill title and
  six compact cream rows (`.qr-row`), each with a red number, an icon, the
  rule text behind an orange bar with red lead words, and pictures on the
  right (obstacles, the six ingredient tiles, the power-ups, three hearts).
  Row 3 shows the coin and mortar lines with yellow point pills, and row 6
  "Kawalan Permainan (Komputer)" has three key-cap groups (arrows, SPACE,
  P) separated by orange bars; there is no phone note. The pictures are
  atlas frames: `<span data-spr="name" data-size="px">` placeholders that
  `paintRuleIcons()` fills with a 2x `sprCanvas` when the atlas loads and
  when the card opens; row 4's icon is the golden gebok picture
  (`golden-gebok.png`). The card is `min(700px, 100%)` wide with auto
  margins, so on a short screen it scrolls from the logo (the OK button is
  focused with `preventScroll`); under 600px the pictures move below the
  text and the key groups stack.
- Controls: ← → (or A/D) run, ↑ / W / SPACE jump (coyote time, jump buffer,
  short hop on release; a second press in the air is a double jump at 88% of
  the first, one per flight), P / Escape pause; on touch screens three buttons.
- Ingredients: a bowl needs the six components `NEED` (mi laksa, ikan,
  santan, rempah, daun kesum, ulam) in any order; each is 10 points and the
  almari (`inv`) holds up to 3 copies of each component (6 with Bakul) so
  spares carry into the next bowls; a copy with no room is 5 points. The
  Almari Bahan panel (🧺 Almari button, the slot row, or the I key) lists all
  18 ingredients with their counts and pauses the clock while open. When all six are
  in, `completeBowl()`: +100, bowl counter, a bowl animation over the player,
  a chime, and one of each is taken out (spares stay). The twelve extras
  `EXTRA` (cili kering, bawang merah, bawang putih, halia, serai, bunga
  kantan, timun, tauge, kacang panjang, limau kasturi, sambal belacan,
  kerisik) are 10 points each and count as ingredients. Pickups marked `*` in
  a chunk are dealt 55% components (taking turns so every bowl can be
  finished), 23% extras, 22% coins.
- Collectibles: gold coins (spinning) +5; the rare find `$` Lesung Batu
  (mortar and pestle) +20; power-ups `?`: Alat Gebok 🏺 (8 s: ingredient
  points ×2 and triple pickup reach), Senduk Sakti 🥄 (8 s shield: the next
  hit is absorbed), Bakul 🧺 (12 s: 3 spare copies per component), Hati ❤️
  (+1 life, up to 3); each power-up is +25.
- Obstacles: bamboo traps `^` and logs `L` (static, jump over them), crates
  `X` (solid blocks to climb), falling rocks `O` (a ⚠ sign on the ground, a
  shake, then the drop; the rock rests 1.6 s), wild boars `W` (patrol, turn at
  edges and walls; the `M` and `Z` marks in chunks spawn boars too). Boars
  die when jumped on (+20). Any other contact, a trap, a log, a rock or a fall
  into a stream or pit costs a heart, gives 1.4 s of invincibility and sends
  the player back to the start of the run while the clock keeps running. At
  0 hearts the run ends.
- HUD (after the user's mockup): top-left the Laksa Quest logo, the wooden
  sign "Kumpul 6 bahan lengkap untuk 1 mangkuk laksa!", a dark-wood panel of
  six labelled slots (Mi, Ikan, Santan, Rempah, Kesum, Ulam; green ✓ when
  held, ×n for spares) with an arrow to the bowl picture (shown once all six
  are in, "Mangkuk Lengkap!" glow), and under it a "Boleh dikutip" panel
  listing the twelve extras (`#pf-extras`, grey until held, ×n counts). Top
  centre a purple clock panel (Masa 03:00) with the active power-ups and
  their seconds under it. Top-right the wooden hearts pill with round purple
  buttons (Almari, sound, exit) and the stats panel (Mangkuk Laksa with the
  bowl picture once a bowl is done, Skor as six digits). There is no coin
  counter or pause button in the HUD (P still pauses). Floating "+n" texts
  and sparks on every pickup. On phones the panels narrow and the stats
  stack.
- Scene: the zone picture behind the tiles (see above), rope-hung floating
  platforms, streams in the river zone with floating logs and jumping fish,
  spike runs drawn as a stake, a fence or a hanging trap by length, logs as
  the trap-sheet log. Without the pictures: sky by zone, far mountains with
  snow caps, a far canopy with waterfalls, hills, a parallax row of trees,
  vines in the jungle and a wooden signboard with the zone name at each
  zone's first chunk.
- Question blocks `Q`: solid; hitting one from below bumps it, turns it into a
  stone block and gives a coin (45%) or pops an ingredient onto it.
- End card (`.done-card`): "Syabas!" at 3 minutes ("Berapa banyak mangkuk
  Laksa Gebok berjaya anda hasilkan?") or "Alamak!" at 0 hearts, four stats
  (Skor, Mangkuk, Bahan, Syiling), achievement badges (Mangkuk Pertama, Tukang
  Masak 3, Pakar Laksa Gebok 5, Pemungut Bahan 30, Kaya Syiling 25, Tanpa
  Cedera, Pemburu Jarang 3, Pelompat Handal 5 stomps), MAIN SEMULA, PERMAINAN.
- Records: `GebokStore.recordGame('platform', { result: 'timeout' | 'crashed',
  score, bowls, lives, time, coins, ingredients, rares, hits, stomps })`.
- Sound: the quest uses the shared synthesised engine (`GebokRun.sfx`, Web
  Audio, honoured by the Kesan bunyi switch) with its own set of effects:
  `coin` (two-note blip), `pick(n)` (a pluck that climbs with the bowl's
  progress), `extra` (softer pop), `full` (almari full: dull double tap),
  `bowl` (arpeggio, sizzle and chime), `rare` (Lesung Batu sparkle), `life`
  (heart chime), `stomp` (boar squashed), `bump` (question block), `portal`
  (whoosh into the door) and `arrive` (chime out of it), `splash` (water or
  pit; a hit still uses `crash`), `tick(last)` (each of the last ten seconds,
  higher in the last three), `click` (almari open/close), `land` (thud after
  a fall faster than 420 px/s), `jump2` (double jump) and `powerEnd` (a
  power-up runs out). `jump`, `boost`, `shieldHit`, `smash` (falling rock),
  `fanfare` and `gameover` are the shared ones.
- Test hooks: `LaksaQuest.{start, rulesOk, update(dt), draw, keys, debug(),
  live()}`; `live()` exposes the player, the object lists, `collect(item)`,
  `hurt()`, `setLives(n)` and `setTime(seconds)`.

## Teka Silang Laksa (crossword)

- Click a cell or a clue, then type (physical or on-screen keyboard); click the
  selected cell again to switch between across and down; arrows move.
- BANTUAN fills the selected letter for −20.
- Score: 50 per word (25 for a word with a hinted letter) − 20 per hint; no
  time bonus. 5 minutes per puzzle, counted down in the HUD.
- Opening the puzzle from the hub first shows "Syarat Permainan" (`#xw-rules`,
  `.rules-card.qr-card`): the same illustrated card as Laksa Quest, six rows
  with a mini crossword grid, Melintang/Menurun chips, letter key caps, the
  purple clock, yellow point pills and a "Perkataan − Bantuan = Skor" chip
  formula, then an OK button. The grid is drawn behind it, but typing, hints
  and the clock wait for OK (`rulesOk()`, which opens the card at its logo).
  MAIN SEMULA skips it.

Each correctly completed word plays a chime, locks its cells green and adds
50 points at once; the running total (words minus hints) shows as "SKOR" next
to the timer and is the final score (no time bonus). The Tahniah card shows
the logo with a "Teka Silang Laksa" ribbon, the score and the time, with
MAIN SEMULA and PERMAINAN. A word filled in
completely but wrong buzzes and shakes red; both verdicts also show as a
one-second green or red toast over the grid ("BETUL! KUNYIT · +50 mata",
"SALAH · Cuba lagi"). BANTUAN (−20) is greyed out while the running score is
below 20; taking a hint shows an amber one-second toast with the −20 and the
new total, and a word that contains a hinted letter earns 25 instead of 50 when
it is completed.

The screen is a wooden board over the village scene: a pencil sign, HUD pills
(Skor, time, progress), the grid and a wooden on-screen keyboard on the left,
parchment clue lists with "Melintang" / "Menurun" ribbons, an info box and
BANTUAN / PERMAINAN buttons on the right. There is no SEMAK button: words are
checked as they are completed.

The question bank (`POOL` in crossword.js) holds 97 usable clues for 85
answers; two-word answers are written without spaces (SUNGAIPAHANG), answers
over 12 letters (CAMERON HIGHLANDS, PATIN TEMPOYAK) or under 3 (MI) are left
out, and an answer with several clues appears once per layout with one of them.

## Cari Kata Laksa (word search)

- `PANELS` in `wordsearch.js` holds 10 panels × 10 words = 100 unique words
  about Pahang, each with a Malay clue: food and laksa gebok, history and
  heritage (MATKILAU in panel 9, TOKGAJAH in panel 6, DATOBAHAMAN in panel 10),
  places and tourism, kitchen tools and preparation, nature. Multi-word answers
  are written without spaces (SUNGAIPAHANG, DARULMAKMUR); nothing is longer than 12 letters. Every panel mixes
  the categories. The bank was dealt and checked by `wsbank.py` (scratch
  script): heroes in different panels, every panel placeable on 12×12.
- A panel is drawn at random every play (`nextPanel()`: each of the 10 once,
  in random order, before any repeats, and never the same panel twice in a
  row); the panel number is not shown to the player. The panel's words are fixed; their
  positions and directions (8 directions, `r0,c0 → r1,c1`) are generated every
  play. MAIN SEMULA draws the next panel.
- Opening the game from the hub first shows "Syarat Permainan" (`#ws-rules`,
  `.rules-card.qr-card`, the illustrated card shared with Laksa Quest): six
  rows with a LAKSA letter-tile word, a 3×3 grid with a diagonal hit, arrow
  key caps, first/last letter tiles, the clock, point pills and the score
  formula, then an OK button.
  The grid is already drawn behind it, but nothing can be selected and the
  clock starts only on OK (`rulesOk()`). MAIN SEMULA skips the rules.
- The player sees the clues, not the words: "n. clue (length)". A found word
  is coloured in and its clue line turns green showing the word.
- Drag across the letters of a word (mouse or touch), or tap its first letter
  and then its last. A wrong selection buzzes and flashes red.
- 5 minutes per panel (`LIMIT`), counting down in the HUD (red and pulsing in
  the last 30 s). The time actually used is recorded; the best winning time
  shows on the leaderboard tab and in Keputusan Pemain (`terpantas`).
- Score = 40 per word, 20 for a word whose first letter was shown by BANTUAN
  (−20 per hint). No time bonus. BANTUAN is greyed out below 20 points.
- Done card (same design as the crossword): Tahniah! with Skor and Masa, or
  Masa Tamat (stars hidden, found/total in the text) when the clock runs out.
  Buttons: MAIN SEMULA, PERMAINAN.
- Records: `GebokStore.recordGame('wordsearch', { level: panel, panel, result,
  score, time, hints, words, found })`.

## Laksa Gebok Run (3D runner)

The runner is the Traveller from the 3D short "Jejak Warisan Laksa Gebok".
Three levels, each a different place with its own obstacles and a gebuk mission.

## The run

One run is the three levels in a row on a single clock: **120 seconds and 3
hearts for all of them** (`timeLimit`, `lives` in `config.js`). Each level ends
the moment its gebuk mission is done (laksa bowls are unlimited), and the time left, the hearts left and
the score carry into the next level. The clock running out, at any level, shows
the MASA TAMAT! card (blue ribbon; level, gebuk, laksa, hearts and the run
total, MULA SEMULA / PILIH LEVEL); losing the third heart shows the ALAMAK! card; both restart the run
from level 1. The three cards share the MISI SELESAI parchment design. Finishing level 3 shows the TAHNIAH! Heritage Master card with the run total.

| Level | Place | Mission (badge) | Obstacles and enemies |
|---|---|---|---|
| 1 · Kampung Laksa (easy) | village: houses, palms, stalls, river | 3 gebuk (10 laksa) | logs, barriers, crates, baskets, chickens, laundry lines, signboards, carts, stalls, vehicles; wild boars charging down the open lanes, roosters pacing between lanes |
| 2 · Dapur Warisan (medium) | traditional kitchen: wooden floor, walls with shelves, beams | 5 gebuk (15 laksa) | firewood, pots, baskets, hanging utensils, shelves, tables, big pots, sacks, rolling pots, cooks and a cat crossing lanes; rats scurrying at you |
| 3 · Jejak Warisan (hard) | heritage market at sunset: stalls, lanterns, bunting, crowds | 7 gebuk (20 laksa) | fruit baskets, crates, banners, stalls, crowds, carts crossing lanes, narrow fenced paths, faster rows; monkeys that hunt your lane and fast dogs |

The HUD follows the Kampung Laksa mockup. Top left: the small Laksa Gebok Run
logo and a wooden plate with a map pin and the level's name. Under it the MISI
panel (parchment in a wooden frame, leaves at the corners): one row per
mission with its icon, name and live count, which turns green with a tick
when done. Below that the purple PENCAPAIAN plaque over a wooden panel with
the five achievement tiles, grey until earned and coloured once lit. Top
right: wooden pills for the score (star) and distance, the round wooden pause
button and the sound button, then the hearts in a cream pill with a blue rim,
and the countdown on a dark red plate with an alarm-clock disc (red and
pulsing in the last 10 s). Active power-ups show as wooden pills under the
top row, and a batik band runs along the bottom. On phones the logo is hidden
and both columns shrink to fit side by side. "Restart level" in the pause menu
keeps the hearts the level began with, but the time already spent stays spent.

## Traveller model

The runner is the rigged Traveller from the Meshy "Stylized Traveler Rig"
export (a GLB with a 24-bone Mixamo skeleton, skin weights and five Mixamo
clips: `Running`, `Walking`, `Jump_Run_inplace`, `run_fast_10_inplace` and
`sliding_stumble`). The 15.7 MB source is re-packed for the web by
`export-rig.js` (Node + three.js r128, in the session scratchpad) into
`traveler-rig.json` (884 KB): a glTF JSON with its buffer embedded as base64
(the artifact host does not serve .glb or .bin), 14,445 vertices / 20,929
triangles with int8 normals, uint16 uvs and weights (`KHR_mesh_quantization`),
no tangents, the skeleton with its inverse bind matrices, and only the clips
the game uses, cut from the Mixamo ones and renamed:

| clip in the file | source | game state |
|---|---|---|
| `Running` | `Running`, whole (0.63 s loop) | running, paced by the speed |
| `Jump` | `Jump_Run_inplace` 0–1.1 s | jump, started at 0.38 s (past the crouch) at 0.8× |
| `Slide` | `Jump_Run_inplace` 0–0.25 s (the crouch), held | slide (swipe down) |
| `Fall` | `sliding_stumble` 4.3–5.6 s (trips, lands face down) | hit by an obstacle or enemy; held on the last frame |
| `Idle` | `sliding_stumble` 9.6–11.3 s (standing), lowered 5 cm | menu scene, countdown, level complete, time up |

The exporter drops the bones' constant translation tracks, locks the hips'
horizontal translation (no root motion: the game moves the runner) and
starts the fall after the mocap's floating first seconds. The textures are
WebP copies of the embedded 4096² maps: `traveler-color.webp` (1024) and
`traveler-rough.webp` (512, roughness in G; metalness 0); the normal map is
flat (±2 %) and is left out. `game.js` reads the file with its own small
glTF reader (nodes, one skinned mesh, textures from the material, animation
tracks; no GLTFLoader) and drives a `THREE.AnimationMixer` with one action per
state: run (loop), jump / slide / fall (once, clamped), idle (loop), with
0.15 s crossfades (`TRAVELER` in `game.js`: file, height, facing, state →
clip names in order of preference, jump start/pace, fall pace). The mixer
steps with the frame's dt from `update()`, so it pauses with the game. The
player group still carries the gameplay transforms (lane x, jump height, the
lane-change lean, the crash skid); the procedural bob, stride dip, slide
squash, jump tilt and crash tumble apply only to the voxel runner, which stays
hidden as the fallback if the file is missing or the browser is offline, or
to a state whose clip is missing from the file (a warning lists them).
`gebokDebug.anim()`, `.pose(clip, t)` and `.lowest()` inspect the rig.

## Enemies

Each level has creatures that come at the runner as well as the fixed
obstacles. Chargers run down an open lane towards you on top of the road's
speed (the wild boar in the kampung, rats in the kitchen, monkeys and dogs at
the market), and some of them hunt: a second or two before they arrive they
shift into your lane. A growl sounds when one is about two seconds out, and
the first of each kind in a level is named in a banner ("Babi hutan! Lompat
atau tukar lorong"). Roosters (kampung) and the cat (kitchen) pace between two
lanes like the cooks. All of them are low: jump over them or change lane; a
hit costs a heart like any obstacle, the tudung saji absorbs it, and with the
cili boost you bowl them over for +20. `enemies` in each level of `config.js`
is the chance of a charger per row (rising with the run's clock), `movers`
the chance of a pacing row.

Achievements per level: Misi gebuk, Pengumpul laksa (10 / 15 / 20 bowls in
one level; collecting goes on past it), Power-up, Pantas (gebuk mission done
within 30 s of the level start), Tanpa langgaran (no heart lost). They light up
as they are earned, are listed on the mission-complete screen, counted on the
final screen, and stored on the player's record (`achievements`, by level) and
with every run.

The MISI SELESAI screen follows its mockup: the small Laksa Gebok Run logo
over a parchment card in a gold frame, a purple "MISI SELESAI!" ribbon with
laurels, the traveller celebrating at the left, three stat cards (GEBUK x / need,
MANGKUK LAKSA collected / badge threshold, MASA left), the red SKOR
KESELURUHAN plate with the run total, a small "Skor level" line, the
PENCAPAIAN LEVEL badge tiles and the blue MAIN MISI SETERUSNYA button
(KEPUTUSAN AKHIR after level 3). The level menu and the leaderboard are
reached from the games hub, not from this card. On phones the stat cards
stack and the character is hidden.

The ALAMAK! (game over) and TAHNIAH! (final) screens use the same card. ALAMAK!
has a red ribbon, a gold SKOR TERBAIK BAHARU! pill when the run beat the
player's best, GEBUK x / need, MANGKUK LAKSA and JARAK stat cards, the SKOR
KESELURUHAN plate with the run total, the leaderboard rank line and a MULA
SEMULA button that restarts from level 1. TAHNIAH! keeps the purple ribbon with
a HERITAGE MASTER pill, the run's GEBUK and MANGKUK LAKSA totals and the MASA
left, the run total, a "Pencapaian x / 15" line and two buttons: MAIN SEMULA
(back to the games hub) and KISAH WARISAN (the story). MASA TAMAT still uses
the plain card.

## Scoring

Laksa bowl +10 (no cap) · gebuk +50 · enemy bowled over with the cili boost
+20 · gebuk target reached +200 · level complete +300 · no hearts lost +100 · at the end of level 3, +10 per second left (at most
+600). Scores add up across the three levels; the leaderboard ranks the best run
total. Each level's own score is also kept (`levelBest`).

## Hearts, power-ups, controls

You get 3 hearts for the whole run: a hit costs one, the road ahead is cleared
and the run continues after a short safe period. Hearts left at the finish line
carry into the next level (and into a retry after Mission Incomplete); a game
over restarts the level with 3, and "restart level" from the pause menu uses
the hearts you had when that level began (`livesCarryOver` in `config.js`). Power-ups appear level by
level: 🧲 magnet laksa (level 1+, 8 s), 🛡 tudung saji shield (level 2+, absorbs
one hit), 🌶 cili boost (level 3 and free run, 5 s, smashes obstacles).

| Action | Keyboard | Touch |
|---|---|---|
| Change lane | Left / Right, A / D | swipe left or right |
| Jump | Up, W, Space | swipe up or tap |
| Slide | Down, S, Shift | swipe down |
| Pause | P or Esc, ⏸ button | ⏸ button |

The pause menu offers resume, restart level, main menu and sound.

## Main menu

The menu sits on a painted kampung scene (gebok-scene.jpg: timber houses, a
turquoise lake, forested ridges and the road running into the distance); the
3D stage stays underneath and takes over again as soon as a run starts. The
title is an illustration (gebok-logo.png: LAKSA GEBOK RUN with the golden
gebok and a laksa bowl, and the red "Lari, Kumpul & Terokai Kulinari Warisan
Pahang" ribbon) and the runner (runner-menu.png) sprints in at the bottom
left. In the middle is the CABARAN ANDA board (cabaran-panel.png) with three
illustrated cards: Cabaran Kampung Laksa, Cabaran Dapur Warisan and Cabaran
Jejak Warisan. Each card is a transparent button over the art: an unlocked
card can be selected as the run's starting level (the run still has one 120 s
clock and 3 hearts) and glows gold when selected, a locked card is dimmed
with a padlock badge. The right column holds the three buttons: yellow MULA
LARIAN, blue CARA BERMAIN and red PERMAINAN (back to the games hub); top right
are the wooden gear (tetapan) and speaker (bunyi, with a red slash while
muted) buttons. The leaderboard, Kisah Warisan and Pencapaian are no longer
on this menu: the leaderboard opens from the games hub, the login screen and
the result screens, the story from the final screen, and achievements from
the games hub. On phones the menu stacks: title, board, the three buttons,
then the runner.

## Menu music

`audio/menu-theme.mp4` plays on the registration screen, the games hub, the
runner's menu and every menu sub-screen (how to play, story, leaderboard,
settings, achievements). It plays from the top, then loops the section from
0:10 to the end of the file (`music` in `config.js`: `src`, `startAt`,
`loopStart`, `volume`, `fade`). It starts from the top again when the player
enters the games hub after signing in and whenever a menu returns after a run
or a mini-game; switching sound off or hiding the tab only pauses it. Browsers
only start audio after a tap or key press, so on a fresh page the music begins
at the first interaction.
## Menu music

`audio/menu-theme.mp4` plays on the registration screen, the games hub, the
runner's menu and every menu sub-screen (how to play, story, leaderboard,
settings, achievements). It plays from the top, then loops the section from
0:10 to the end of the file (`music` in `config.js`: `src`, `startAt`,
`loopStart`, `volume`, `fade`). It starts from the top again when the player
enters the games hub after signing in and whenever a menu returns after a run
or a mini-game; switching sound off or hiding the tab only pauses it. Browsers
only start audio after a tap or key press, so on a fresh page the music begins
at the first interaction.

The speaker button at the top right mutes everything, music included, and the
choice is remembered by the browser. On iPhone and iPad a silent looping
`<audio>` element is started on the first tap so the music is heard even with the
ring/silent switch on.

## Heritage intro ("Maklumat Laksa Gebok")

Right after sign-in, a wooden information panel covers the games menu: a
plaque title, a sidebar with the logo and three tabs (Asal-Usul, Proses
Pembuatan, Resepi), and a parchment page with a brush-stroke title, a framed
figure with a red label, icon-led paragraphs or numbered steps, a yellow
callout and a source line. SETERUSNYA and KEMBALI turn the pages; after sign-in
the tabs unlock in order and MULA BERMAIN on page 3 reveals the menu; a
returning player also gets a LANGKAU (skip) button, a newly registered one
does not. The round
"i" button (`nav-info.png`) in the menu's top bar opens the same panel with
every tab free, KEMBALI on page 1 or SELESAI on page 3 closing it. The page
data lives in `config.js` (`heritageIntro`: tab, icon, title, figure, points,
lead, steps, gallery, more, callout, columns, photo, source, sourceUrl) with
`brass-gebok.png`, the eight `proses-*.jpg` photos (from the blog
fiezabard.blogspot.com, credited on the page), `laksa-bowl.png` and
`golden-gebok.png`. On phones the tabs become a row above the page and the
five round menu buttons sit in their own row under the welcome sign.

## Tetapan (settings)

The gear button opens a wooden settings board with three tabs (Bunyi, Akaun,
Tentang; `settingsTab()` in game.js). Bunyi has two green/brown switches,
Muzik (the menu theme) and Kesan bunyi (game effects), each remembered by the
browser (`gebokrun.musicOff`, `gebokrun.sfxOff`; an old `gebokrun.muted` = 1
turns both off once). The quick 🔊 buttons in the menus and the pause screen
toggle both at once: they show 🔇 only when both are off. Akaun shows the
current player with a LOG KELUAR button and a "set semula kemajuan" link for
the runner. Tentang is a box whose studio name, description, credit lines and
version come from `about` in config.js (Synexis Digital). The admin page is no longer
linked from the interface; it is still reachable by adding `#admin` to the
address.

## Keputusan Pemain (player results)

Opened from the hub. Cream score cards on the wooden board, one per game
(`GAMES_INFO` in game.js: art, icon badge, name, "Skor Terbaik" with a cup,
a plays pill "n kali main | Terakhir: date" or "Level selesai", the fastest
time for the puzzles, and a rank pill filled from `fetchLeaderboard`:
"Kedudukan #n daripada m" or "Belum dalam kedudukan"). Clicking a card (or
Enter on it) selects that game in the history. Under the red ribbon
"Sejarah Terkini", filter tabs (Semua plus one per game, `#rs-filters`) and a
table (`.rs-table`: Permainan, Tarikh & Masa, Skor, Masa) of the last 8 runs,
12 when filtered to one game. Dates are written by `whenText` as
"22 Nov 07:30 PTG" (Malay month names, PG/PTG).

## Kedudukan Terkini (leaderboard)

The leaderboard is a wooden board over the village scene: a red ribbon with
the trophy, four icon tabs (Gebok Run, Laksa Quest, Teka Silang Laksa, Cari
Kata Laksa), cream rows with a gold / silver / bronze rank badge, an initial
avatar coloured from the name, the name and a sub-line ("1/3 level | 3 gebuk |
1 run" or "n kali main"), and the score; KEMBALI (red) and REFRESH (blue)
below. It opens from "Kedudukan Terkini" on the sign-in page, the menu's trophy
button and the runner's screens.

## Players, leaderboard, admin

Player names are at most `signIn.nameMaxLength` characters (config.js, 9); the
sign-in page says so under the name field.
The game opens with a sign-in page drawn after the project's mockup: the
village scene with the Traveller and a laksa spread around a wooden panel
(logo, "Jom Main & Terokai Warisan Laksa Pahang!", the four games, the
"Nama Pemain" field and the MULA BERMAIN button). The player types their name
and presses MULA BERMAIN. A pop-up with a loading bar ("Menyemak…") runs for
`signIn.checkSeconds` (config.js, 2 s). A name already on record
(case-insensitive) gets "Nama Pemain Telah Mendaftar" for `signIn.noticeSeconds`
(2 s), which closes by itself and reveals the "Alamat E-Mel" field for
confirmation: SAHKAN & MULA (green) accepts only the e-mail the record was
registered with, and a red BATAL beside it returns to the name step without
signing in; it accepts only the e-mail the record was registered
with ("Pengesahan Berjaya", then the games menu); any other e-mail gets the
"E-Mel Salah" pop-up and no sign-in. A new name gets "Daftar Maklumat Pemain"
with an OK button that reveals the same field, asked once; DAFTAR & MULA shows
"Mendaftar…" and "Pendaftaran Berjaya" before the menu opens, unless the e-mail
already belongs to another player: then "E-Mel Telah Berdaftar" asks for a new
e-mail and nothing is saved. Every pop-up carries an outcome badge (green
tick = right, red cross = wrong, blue "i" = information, amber ring = checking)
and the field concerned shows the same tick or cross inside the input until the
player types again. The name of the player this device
used last is prefilled, so a returning player only confirms it. Nothing lists
other players on the device. The red "Log Keluar" button under the welcome
sign (and LOG KELUAR in the settings) returns to the sign-in page and clears
the current player; the name stays prefilled. "Kedudukan Terkini" at the top right opens the
leaderboard without signing in; KEMBALI returns to the sign-in page. The
database status and the Admin link sit in small print at the foot of the page. Each player record keeps level progress, best run score, best
score per level, totals and a history of every level played (level, result,
level score, run total, laksa, gebuk, distance, time, time left, hearts lost,
badges).

- Supabase (`supabase` in `config.js` filled in): the online database, used
  wherever the page is hosted. See "Supabase" below.
- Published artifact: the shared database. Each claude.ai account writes its
  own `players/<account>/profiles/<profile>` records; only the owner and editors
  read everyone's. Players need Contributor access to save. The leaderboard is a
  separate collection every viewer can read (`leaderboard/<account>`, no emails).
- Local copy / `python3 -m http.server`: `localStorage` in that browser.

The admin page is `#admin` (link shown to owners and editors; online, to
everyone, and it asks for the admin key): summary tiles, a sortable player
table, expandable run histories, CSV export, two-click clear.

## Supabase (online database)

With Supabase every copy of the game (GitHub Pages, a server, the artifact)
shares one player database, so a player name signs in from any device.

1. Create a project at supabase.com. In the dashboard open SQL Editor → New
   query, paste the whole of `supabase.sql` and run it. It creates the
   `players` and `app_settings` tables, the four per-game run tables and the
   `gebok_*` functions; the tables have row-level security on and no
   policies, so the public anon key can only call those functions. Running
   the file again after an update is safe (an existing project only gains
   what is new).
2. Pick a long admin key and run (replace the value):

       insert into public.app_settings (key, value) values ('admin_key', 'tukar-kepada-rahsia-yang-panjang')
         on conflict (key) do update set value = excluded.value;

3. Project Settings → API Keys: copy the Project URL and the anon public key
   (the newer `sb_publishable_…` key works too) into `supabase: { url, anonKey }`
   in `config.js`, then push. Never put the service_role / secret key there.

The sign-in screen then says "Records are saved online". The admin page (open it by adding `#admin` to the address)
(`#admin`) asks for the admin key once per browser; a wrong or changed key just
asks again. The anon key is public by design: it can create a record, continue a
record by player name, save a profile and read the leaderboard (no e-mails), and
nothing else. If Supabase cannot be reached the game falls back to the artifact
database or this browser's storage and says so under the form.

`players.data` holds the profile exactly as the game stores it (same fields as
the artifact database), `players.entry` the public leaderboard entry; both are
updated by `gebok_save` after every run. `gebok_admin_players(key)` returns all
profiles with e-mails for the admin page and CSV export.

### Per-game run tables (analysis)

Every play is also appended as one row to the table of its game, so time
taken and performance can be analysed per mini game with plain SQL or a CSV
export from the Table Editor. `player_id` references `players.id` (rows go
with a deleted player) and `username` is copied in for convenience; every
table also has `played_at`, `result`, `score`, `time_s` (seconds) and
`details` (the record exactly as the game sent it).

| Table | Game | Own columns |
|---|---|---|
| `runner_runs` | Laksa Gebok Run, one row per level played | `level`, `campaign_score`, `laksa`, `laksa_target`, `gebuk`, `gebuk_need`, `distance`, `time_limit`, `time_left`, `time_bonus`, `max_speed`, `lives_lost`, `lives_start`, `mission_done`, `finished`, `achievements` |
| `quest_runs` | Laksa Quest, one row per 3-minute run (`timeout` / `crashed`) | `bowls`, `lives_left`, `coins`, `ingredients`, `rares`, `hits`, `stomps` |
| `crossword_runs` | Teka Silang Laksa (`won` / `timeout`) | `hints`, `words` |
| `wordsearch_runs` | Cari Kata Laksa (`won` / `timeout`) | `panel` (1–10), `hints`, `words`, `found` |

store.js calls `gebok_record_run(p_id, p_game, p_rec)` right after
`gebok_save` in `recordRun` (runner) and `recordGame` (the other three);
`p_game` is `runner`, `platform`, `crossword` or `wordsearch`. The function
copies the known fields into columns (missing or oddly typed values become
NULL, never an error) and keeps the whole record in `details`. A failure
(the tables not installed yet, offline) is ignored: the profile already
holds its own copy of the run, so the game never notices. The tables are
never read by the game. Examples:

    -- time taken and performance per Cari Kata panel
    select panel, count(*) as plays, round(avg(time_s)) as avg_s, round(avg(score)) as avg_score,
           round(avg(hints), 2) as avg_hints, round(100.0 * avg((result = 'won')::int)) as won_pct
      from public.wordsearch_runs group by panel order by panel;

    -- one player's Laksa Quest runs, newest first
    select played_at, result, score, bowls, time_s, hits
      from public.quest_runs where username = 'maziah' order by played_at desc;

### GitHub Pages

The game is static files, so the repository root can be published as is:
Settings → Pages → Deploy from a branch → `main` / root. The empty `.nojekyll`
file keeps GitHub from running Jekyll over the files. `config.js` is part of
the repository, so the Supabase URL and anon key are public there, as they are
in any browser that loads the page; the admin key is not in the repository.

## Heritage notes

The "Kisah Warisan" screen (from the menu) shows three short notes about laksa
gebuk. The texts live in `config.js` and are summaries written for
the game: verify them with heritage references or practitioners before
publication.

## Run it

Open `index.html` directly in a browser, or serve the folder:

    python3 -m http.server 8765

then open http://127.0.0.1:8765/. The 3D engine loads from a CDN, so the first
load needs a connection.

## Files

- `config.js` – every tunable value: lives, targets, scores, speeds, lengths, power-ups, heritage text
- `index.html` – page, HUD and all screens
- `style.css` – styling
- `store.js` – the player database adapter (Supabase, the artifact's shared db, or localStorage)
- `admin.js` – the admin view
- `game.js` – the 3D runner: world, environments, models, obstacles, spawning, levels, collisions, power-ups, audio, screens; it also exposes `window.GebokRun` (open / menu / leaderboard / settings / pauseRender / sfx) for the other games
- `platform.js` – the games hub screen (`window.LaksaArcade`)
- `platformer.js` – Laksa Quest, the platformer (`window.LaksaQuest`)
- `crossword.js` – Teka Silang Laksa (`window.LaksaCrossword`)
- `wordsearch.js` – Cari Kata Laksa, the word search (`window.LaksaWordSearch`)
- `proses-1-uli.jpg` … `proses-8-ulam.jpg` – heritage intro photos of the making process
- `audio/menu-theme.mp4` – the menu music (AAC in an MP4 container, 23 s; `music` in `config.js` sets the loop point)
- `supabase.sql` – the online database: tables, functions and grants to run once in the Supabase SQL editor

`window.gebokDebug` (in `game.js`) steps the simulation from the browser console
without depending on the display's frame rate: `tick(dt)`, `step(dt, n)`,
`state()`, `obstacles()`, `gebuks()`, `powerups()`, `level()`, `setLevel(i, unlocked)`,
`skipReady()`, `applyPowerup(type)`, `startCampaign()`, `start()`, `nextLevel()`, `showGames()`,
`music()` (state of the menu music), `musicSync(on)`.
`window.LaksaQuest.debug()` / `.live()` / `.update(dt)` do the same for the platformer.
