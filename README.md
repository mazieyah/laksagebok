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
the atlas loads, shapes and emoji stand in.

A 3-minute run (`LIMIT` in platformer.js) on one clock, 3 hearts. The world
is generated as the player advances from hand-made chunks (`CHUNKS`, 11 rows
of ASCII, 16–22 columns each: safe, gap, hazard, enemy, rock, log, stairs,
power, mixed), picked with weights that grow harder after each minute and
never two of a kind in a row. Every chunk has flat ground at both ends, gaps
are at most 4 columns (a jump clears 5.4) and every falling rock is announced
by a sign and a shake. Six chunks make a zone; the zones cycle through
Kampung Melayu, Hutan Tropika, Sungai (gaps are water), Dapur Tradisional
(indoor, plank walls) and Lanskap Kampung, each with its own sky, ground and
decorations.

- Opening the game shows "Syarat Permainan" (`#pf-rules`, OK button); the
  world is drawn behind it and the clock starts on OK. MAIN SEMULA skips it.
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
  edges and walls), monkeys `M` (hop along their plank) and bees `Z` (fly to
  and fro in the air). Enemies die when jumped on (+20). Any other contact, a
  trap, a log or a rock costs a heart and 1.5 s of invincibility; falling into
  a stream or pit costs a heart and returns the player to the last safe
  ground. At 0 hearts the run ends.
- HUD (after the user's mockup): the Laksa Quest logo and a wooden hearts
  pill top-left; in the middle a wooden sign "Kumpul 6 bahan lengkap untuk 1
  mangkuk laksa!" over a dark-wood panel of six labelled slots (Mi, Ikan,
  Santan, Rempah, Kesum, Ulam; green ✓ when held, ×n for spares) and an arrow
  to the bowl icon (empty → full by progress, "Mangkuk Lengkap!" glow on a
  finished bowl); top-right a purple stats panel (Mangkuk Laksa, Skor as six
  digits, Masa) with round purple buttons: coins, Almari, sound, pause, exit.
  Active power-ups with seconds under the slots. Floating "+n" texts and
  sparks on every pickup. On phones the sign hides and the slot panel wraps
  under the logo and stats.
- Scene: sky by zone, far mountains with snow caps, a far canopy with
  waterfalls, hills, a parallax row of trees, vines hanging into the top
  corners, a wooden signboard with the zone name at each zone's first chunk
  ("KAMPUNG / MELAYU / PAHANG"), rope-hung floating platforms outdoors,
  streams in the river zone with floating logs and jumping fish.
- Question blocks `Q`: solid; hitting one from below bumps it, turns it into a
  stone block and gives a coin (45%) or pops an ingredient onto it.
- End card (`.done-card`): "Syabas!" at 3 minutes ("Berapa banyak mangkuk
  Laksa Gebok berjaya anda hasilkan?") or "Alamak!" at 0 hearts, four stats
  (Skor, Mangkuk, Bahan, Syiling), achievement badges (Mangkuk Pertama, Tukang
  Masak 3, Pakar Laksa Gebok 5, Pemungut Bahan 30, Kaya Syiling 25, Tanpa
  Cedera, Pemburu Jarang 3, Pelompat Handal 5 stomps), MAIN SEMULA, PERMAINAN.
- Records: `GebokStore.recordGame('platform', { result: 'timeout' | 'crashed',
  score, bowls, lives, time, coins, ingredients, rares, hits, stomps })`.
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
  `.rules-card`): six rules and an OK button. The grid is drawn behind it, but
  typing, hints and the clock wait for OK (`rulesOk()`). MAIN SEMULA skips it.

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
  `.rules-card`, same card design as the done card): the rules in six lines and an OK button.
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
the moment both of its missions are done, and the time left, the hearts left and
the score carry into the next level. The clock running out, at any level, shows
Masa Tamat; losing the third heart shows Game Over; both restart the run from
level 1. Finishing level 3 shows the Heritage Master screen with the run total.

| Level | Place | Missions | Obstacles |
|---|---|---|---|
| 1 · Kampung Laksa (easy) | village: houses, palms, stalls, river | 3 gebuk, 10 laksa | logs, barriers, crates, baskets, chickens, laundry lines, signboards, carts, stalls, vehicles |
| 2 · Dapur Warisan (medium) | traditional kitchen: wooden floor, walls with shelves, beams | 5 gebuk, 15 laksa | firewood, pots, baskets, hanging utensils, shelves, tables, big pots, sacks, rolling pots, cooks crossing lanes |
| 3 · Jejak Warisan (hard) | heritage market at sunset: stalls, lanterns, bunting, crowds | 7 gebuk, 20 laksa | fruit baskets, crates, banners, stalls, crowds, carts crossing lanes, narrow fenced paths, faster rows |

The HUD shows the level, run score and distance, the mission list with live
counts and ticks, and the five achievement badges on the left; hearts, the
countdown and the pause button on the right. "Restart level" in the pause menu
keeps the hearts the level began with, but the time already spent stays spent.

Achievements per level: Misi gebuk, Misi laksa, Power-up, Pantas (missions done
within 30 s of the level start), Tanpa langgaran (no heart lost). They light up
as they are earned, are listed on the mission-complete screen, counted on the
final screen, and stored on the player's record (`achievements`, by level) and
with every run.

## Scoring

Laksa bowl +10 · gebuk +50 · gebuk target reached +200 · both missions complete
+300 · no hearts lost +100 · at the end of level 3, +10 per second left (at most
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

The menu is drawn over the live 3D scene: the village at golden hour with both
characters from the animation standing on the left (the Traveller and Lelaki
Misteri, the hooded elder with the glowing stone, both procedural models).
Centre: MULA LARIAN, CARA BERMAIN, KISAH WARISAN, PAPAN KEDUDUKAN. Right: the
PILIH LEVEL parchment with three thumbnail cards; an unlocked card can be
selected as the run's starting level (the run still has one 120 s clock and 3
hearts), locked cards stay locked, completed cards show stars from their badges.
Top right: achievements, settings (sound, switch player, reset, admin link) and
sound. On phones the menu stacks vertically.

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

The medal button in the games menu opens the signed-in player's results: one
card per game (best score, plays, level progress or last played, and the
player's leaderboard rank once it loads) and the last eight plays with date,
score and a won/lost mark. KEMBALI returns to the menu.

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
   `players` and `app_settings` tables and the `gebok_*` functions; the tables
   have row-level security on and no policies, so the public anon key can only
   call those functions.
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
