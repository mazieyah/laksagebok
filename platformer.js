/* ======================================================================
   LaksaQuest — a side-scrolling platformer in the spirit of Super Mario,
   themed on laksa gebok. One 3-minute clock: run, jump, dodge the kampung's
   obstacles and collect ingredients. Six components make a bowl (noodles,
   fish, santan, spices, kesum, ulam, in any order; up to three spare copies
   of each are kept in the "almari" for the next bowls). The run ends when
   the clock or the hearts run out. The world is generated from hand-made
   chunks as the player advances and cycles through five Pahang settings.
   Graphics come from laksa-quest-atlas.webp (sliced from the asset pack,
   frames in FR); until it loads, simple shapes and emoji stand in.
   Canvas 2D, tile physics. Records go to GebokStore.
   ====================================================================== */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const T = 48, W = 960, H = 540, ROWS = 11;
  const GRAV = 2000, JUMP = -860, RUN = 300, MAXFALL = 1000;   // airtime ≈ 0.86 s ≈ 5.4 tiles of travel, 4 tiles of height
  const REACH = 12;                                              // pickup padding around the player box (coins feel generous)
  const LIMIT = 180;                                             // seconds for the whole run
  // [emoji fallback, name, atlas frame]
  const NEED = { n: ['🍝', 'Mi laksa', 'noodles'], i: ['🐟', 'Ikan', 'fish'], m: ['🥥', 'Santan', 'santan'], r: ['🧂', 'Rempah', 'belacan'], k: ['🌿', 'Daun kesum', 'kesum'], u: ['🥗', 'Ulam', 'ulam'] };
  const TYPES = Object.keys(NEED);
  const EXTRA = { a: ['🌶', 'Cili kering', 'chilli'], b: ['🧅', 'Bawang merah', 'shallot'], d: ['🧄', 'Bawang putih', 'garlic'], e: ['🌰', 'Halia', 'ginger'], f: ['🎋', 'Serai', 'lemongrass'], g: ['🌸', 'Bunga kantan', 'kantan'],
    j: ['🥒', 'Timun', 'cucumber'], l: ['🌱', 'Tauge', 'sprouts'], o: ['🥬', 'Kacang panjang', 'longbean'], p: ['🍋', 'Limau kasturi', 'calamansi'], q: ['🥣', 'Sambal belacan', 'sambal'], s: ['🍘', 'Kerisik', 'kerisik'] };
  const EXTRAS = Object.keys(EXTRA);
  const RARE = ['🏺', 'Lesung Batu', 'mortar'];                 // the rare find: +20
  const POWER = { G: ['🏺', 'Alat Gebok', 'bahan ×2, jangkauan luas', 'gebok'], S: ['🥄', 'Senduk Sakti', 'perlindungan', 'spoon'], B: ['🧺', 'Bakul', 'almari lebih besar', 'basket'], h: ['❤️', 'Hati', '+1 nyawa', 'heart'] };
  const PW = { G: 8, S: 8, B: 12 };                              // seconds a power-up lasts
  const SC = { item: 10, extra: 10, dup: 5, bowl: 100, coin: 5, rare: 20, power: 25, stomp: 20, life: 50 };
  const CAP = 3, CAP_BAKUL = 6;                                  // copies of a component the almari holds (one in use + spares)
  const ZONES = [
    { name: 'Kampung Melayu', icon: '🏡', sky: ['#5fb5ef', '#bfe6f8', '#f8d79a'], hill1: '#7fb59c', hill2: '#5f9a7a', earth: '#8a5a2b', grass: '#6fa84f', blade: '#4ea845', ground: 'grass1', plank: 'platform', deco: [['house', 1.5], ['stall', 1.4], ['palm', 1.5], ['bushflower', 1.1], ['fence', 1.2]] },
    { name: 'Hutan Tropika', icon: '🌳', sky: ['#2f7a5a', '#8fcfae', '#dff0c8'], hill1: '#3f7a52', hill2: '#2f5f3e', earth: '#6b4a2e', grass: '#3f9a3f', blade: '#2f7a2f', ground: 'grass2', plank: 'platform', deco: [['tree', 1.6], ['bamboo', 1.6], ['banana', 1.4], ['bushrock', 1.2], ['bushflower', 1.1]] },
    { name: 'Sungai', icon: '🌊', sky: ['#4aa3df', '#bfe3f7', '#e2f3f9'], hill1: '#8bbfa0', hill2: '#6aa585', earth: '#b9955a', grass: '#8fcf6a', blade: '#6ab04a', ground: 'grass1', plank: 'platform', deco: [['waterfall', 1.6], ['bushrock', 1.2], ['palm', 1.5], ['bridge', 1.3]], water: true },
    { name: 'Dapur Tradisional', icon: '🍳', sky: ['#6b4a2e', '#b98a5a', '#e8cfa0'], hill1: '#a97b4a', hill2: '#8a5a2b', earth: '#7a4a24', grass: '#c08a4a', blade: '#8a5a2b', ground: 'stone', plank: 'table', deco: [['hut', 1.6], ['crate', 1.0], ['basket', 1.0]], indoor: true },
    { name: 'Lanskap Kampung', icon: '🌾', sky: ['#ff9a5a', '#ffd39a', '#fff0c8'], hill1: '#a8c47a', hill2: '#7fa85a', earth: '#8a5a2b', grass: '#9ac85a', blade: '#6fa84f', ground: 'grass1', plank: 'platform', deco: [['house', 1.5], ['tree', 1.6], ['fence', 1.2], ['bushflower', 1.1], ['stall', 1.4]] },
  ];
  const ZONE_CHUNKS = 6;                                         // chunks per setting before the next one
  // Chunks. Legend: # earth, = plank, X crate (solid), P start, * a pickup (component / extra / coin), c coin, $ rare,
  // ? power-up, ^ bamboo trap, L log (jump it), W wild boar, M monkey (on a plank), Z bee (in the air), O falling rock (row 0).
  // Ground is rows 8-10; a gap is a stream (river) or a pit. Jumps clear 4 columns and 3 rows.
  const C = (tag, rows) => ({ tag, rows, w: rows[0].length });
  const START = C('start', [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '...P.....*..*...',
    '................',
    '################',
    '################',
    '################']);
  const CHUNKS = [
    C('safe', [
      '................',
      '................',
      '................',
      '................',
      '................',
      '....c..*..c.....',
      '..*.........*...',
      '................',
      '################',
      '################',
      '################']),
    C('safe', [
      '................',
      '................',
      '................',
      '......c.c.......',
      '.....c...c......',
      '....c.===.c.....',
      '..*........*..*.',
      '................',
      '################',
      '################',
      '################']),
    C('safe', [
      '................',
      '................',
      '................',
      '................',
      '................',
      '......*.........',
      '..*.....*...*...',
      '......X.X.X.....',
      '################',
      '################',
      '################']),
    C('gap', [
      '................',
      '................',
      '................',
      '................',
      '.......c........',
      '......c.c.......',
      '..*..........*..',
      '................',
      '######...#######',
      '######...#######',
      '######...#######']),
    C('gap', [
      '..................',
      '..................',
      '..................',
      '..................',
      '........*.........',
      '.......===........',
      '..*...........*...',
      '..................',
      '######....########',
      '######....########',
      '######....########']),
    C('gap', [
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '......c......c......',
      '..*.......*.......*.',
      '....................',
      '#####..####..#######',
      '#####..####..#######',
      '#####..####..#######']),
    C('hazard', [
      '................',
      '................',
      '................',
      '................',
      '................',
      '.......c........',
      '..*..........*..',
      '......^^........',
      '################',
      '################',
      '################']),
    C('hazard', [
      '..................',
      '..................',
      '..................',
      '......*...........',
      '.....=====........',
      '..................',
      '..*...........*...',
      '.....^^^^.........',
      '##################',
      '##################',
      '##################']),
    C('enemy', [
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '........*...........',
      '..*.........*.....*.',
      '.........W..........',
      '####################',
      '####################',
      '####################']),
    C('enemy', [
      '..................',
      '..................',
      '..................',
      '.......M..........',
      '.....=====........',
      '...c.......c......',
      '..*...........*...',
      '..................',
      '##################',
      '##################',
      '##################']),
    C('enemy', [
      '..................',
      '..................',
      '..................',
      '........Z.........',
      '..................',
      '...c.........c....',
      '..*.....*.....*...',
      '..................',
      '##################',
      '##################',
      '##################']),
    C('rock', [
      '......O......O....',
      '..................',
      '..................',
      '..................',
      '..................',
      '..........c.......',
      '..*...........*...',
      '..................',
      '##################',
      '##################',
      '##################']),
    C('log', [
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '......c......c......',
      '..*.........*.....*.',
      '......L......L......',
      '####################',
      '####################',
      '####################']),
    C('stairs', [
      '....................',
      '....................',
      '.............$......',
      '...........===......',
      '.......c............',
      '......===...........',
      '..*.........*.......',
      '....................',
      '####################',
      '####################',
      '####################']),
    C('power', [
      '................',
      '................',
      '.......?........',
      '......===.......',
      '................',
      '...c.......c....',
      '..*.........*...',
      '................',
      '################',
      '################',
      '################']),
    C('mixed', [
      '......................',
      '......................',
      '......................',
      '......................',
      '......................',
      '...........c..........',
      '..*.........*.......*.',
      '......W...............',
      '##############...#####',
      '##############...#####',
      '##############...#####']),
    C('mixed', [
      '......................',
      '......................',
      '......................',
      '..............M.......',
      '............=====.....',
      '....c....Z............',
      '..*..........*......*.',
      '.....^^...............',
      '######################',
      '######################',
      '######################']),
  ];
  for (const ch of [START].concat(CHUNKS)) if (ch.rows.length !== ROWS || ch.rows.some((r) => r.length !== ch.w)) throw new Error('LaksaQuest: bad chunk ' + ch.tag);
  const ACHV = [
    ['🍜', 'Mangkuk Pertama', () => bowls >= 1], ['👨‍🍳', 'Tukang Masak', () => bowls >= 3], ['🏆', 'Pakar Laksa Gebok', () => bowls >= 5],
    ['🧺', 'Pemungut Bahan', () => ingredients >= 30], ['💰', 'Kaya Syiling', () => coins >= 25], ['🛡️', 'Tanpa Cedera', () => hits === 0 && runTime >= LIMIT - 0.5],
    ['🏺', 'Pemburu Jarang', () => rares >= 3], ['👟', 'Pelompat Handal', () => stomps >= 5],
  ];
  // ---- the atlas (laksa-quest-atlas.webp): name → [x, y, w, h] ----
  const FR = {
    bamboo: [0, 0, 63, 94], banana: [264, 0, 113, 94], basket: [580, 178, 66, 65], bee0: [719, 371, 51, 46], bee1: [469, 425, 50, 45], bee2: [521, 425, 52, 45],
    bee3: [962, 425, 50, 43], bee4: [482, 472, 48, 40], bee5: [627, 425, 50, 44], bee6: [0, 472, 49, 43], belacan: [400, 425, 67, 45], boar0: [609, 371, 59, 49],
    boar1: [0, 371, 71, 52], boar2: [647, 313, 74, 53], boulder: [618, 472, 53, 39], boulder2: [503, 371, 57, 50], boulders: [291, 371, 90, 51], bowl0: [127, 249, 87, 62],
    bowl1: [719, 178, 89, 63], bowl2: [855, 96, 90, 70], bowl3: [567, 96, 131, 71], bridge: [828, 0, 168, 81], bushflower: [700, 96, 78, 71], bushrock: [0, 178, 82, 69],
    calamansi: [117, 313, 74, 55], celebrate0: [190, 96, 54, 78], celebrate1: [131, 96, 57, 79], celebrate2: [0, 96, 53, 80], chilli: [0, 249, 60, 62], climb0: [216, 249, 34, 61],
    climb1: [395, 249, 35, 60], climb2: [432, 249, 34, 60], climb3: [468, 249, 35, 60], climb4: [505, 249, 35, 60], coin: [799, 249, 57, 58], crate: [220, 371, 69, 51],
    cucumber: [316, 313, 66, 54], duck0: [68, 313, 47, 55], duck1: [384, 313, 47, 53], duck2: [0, 425, 49, 45], duck3: [670, 371, 47, 46], duck4: [562, 371, 45, 49],
    fence: [309, 472, 171, 42], fish: [316, 425, 82, 45], gameover0: [309, 178, 85, 66], gameover1: [454, 178, 52, 65], garlic: [454, 371, 47, 50], gebok: [246, 96, 98, 78],
    ginger: [247, 313, 67, 54], grass1: [772, 371, 51, 46], grass2: [825, 371, 52, 46], heart: [585, 313, 60, 53], house: [379, 0, 144, 93], hurt0: [780, 96, 73, 70],
    hurt1: [654, 249, 74, 58], hut: [525, 0, 109, 87], idle0: [346, 96, 43, 72], idle1: [391, 96, 42, 72], idle2: [435, 96, 42, 72], idle3: [479, 96, 42, 72],
    idle4: [523, 96, 42, 72], jump0: [858, 249, 43, 57], jump1: [252, 249, 48, 60], jump2: [607, 249, 45, 58], jump3: [302, 249, 48, 60], jump4: [352, 249, 41, 60],
    kantan: [903, 249, 48, 57], kerisik: [0, 313, 66, 56], kesum: [898, 313, 65, 52], lemongrass: [730, 249, 67, 58], log: [532, 472, 84, 39], longbean: [433, 313, 77, 53],
    monkey0: [193, 313, 52, 55], monkey1: [723, 313, 55, 53], monkey2: [780, 313, 56, 53], monkey3: [838, 313, 58, 53], mortar: [508, 178, 70, 65], noodles: [383, 371, 69, 50],
    palm: [65, 0, 88, 94], pebbles: [673, 472, 37, 32], platform: [679, 425, 99, 44], push0: [759, 0, 67, 81], push1: [55, 96, 74, 80], rock: [73, 371, 74, 52],
    run0: [84, 178, 56, 67], run1: [142, 178, 55, 67], run2: [199, 178, 55, 67], run3: [396, 178, 56, 65], run4: [256, 178, 51, 67], sambal: [953, 249, 68, 56],
    santan: [542, 249, 63, 60], shallot: [62, 249, 63, 62], sign: [810, 178, 71, 63], slope: [879, 371, 131, 46], spikepit: [51, 472, 94, 43], spikes: [209, 472, 98, 42],
    spoon: [648, 178, 69, 65], sprouts: [149, 371, 69, 51], stall: [636, 0, 121, 85], stone: [147, 472, 60, 43], swim0: [51, 425, 72, 45], swim1: [125, 425, 54, 45],
    swim2: [575, 425, 50, 44], swim3: [181, 425, 53, 45], swim4: [236, 425, 78, 45], table: [780, 425, 91, 44], tree: [155, 0, 107, 94], ulam: [512, 313, 71, 53],
    water: [873, 425, 87, 44], waterfall: [883, 178, 115, 63],
  };
  const ATLAS = new Image();
  let atlasOk = false;
  ATLAS.onload = () => { atlasOk = true; if (open) hud(); };
  ATLAS.src = 'laksa-quest-atlas.webp';
  function drawSpr(g, name, x, y, w, h, flip) {                 // a frame scaled into the box x, y, w, h
    const f = FR[name];
    if (!f || !atlasOk) return false;
    if (flip) { g.save(); g.translate(x + w / 2, 0); g.scale(-1, 1); g.drawImage(ATLAS, f[0], f[1], f[2], f[3], -w / 2, y, w, h); g.restore(); }
    else g.drawImage(ATLAS, f[0], f[1], f[2], f[3], x, y, w, h);
    return true;
  }
  function drawFit(g, name, cx, bottom, hgt, flip) {            // keep the aspect, anchor at the bottom centre
    const f = FR[name];
    if (!f || !atlasOk) return false;
    const w = f[2] * hgt / f[3];
    return drawSpr(g, name, cx - w / 2, bottom - hgt, w, hgt, flip);
  }
  function sprCanvas(name, size) {                              // a small canvas with one frame, for the HUD and the almari
    const c = document.createElement('canvas'); c.width = c.height = size; c.className = 'pf-spr';
    const f = FR[name];
    if (f && atlasOk) { const g = c.getContext('2d'); const s = Math.min(size / f[2], size / f[3]); const w = f[2] * s, h = f[3] * s; g.drawImage(ATLAS, f[0], f[1], f[2], f[3], (size - w) / 2, (size - h) / 2, w, h); }
    return c;
  }
  const canvas = $('pf-canvas');
  const ctx = canvas.getContext('2d');
  const sfx = () => window.GebokRun.sfx;
  let open = false, raf = 0, last = 0, started = false;
  let map = [], cols = 0, solids = new Set(), colZone = [], zoneMarks = [], zoneIdx = 0, chunkN = 0, lastChunk = null, needIdx = 0;
  let player, items = [], enemies = [], hazards = [], rocks = [], deco = [], parts = [], floats = [], spawn = { x: 2 * T, y: 6 * T }, lastSafe;
  let lives, score, bowls, inv = {}, extraInv = {}, coins, ingredients, extras, rares, hits, stomps, powerT = { G: 0, S: 0, B: 0 }, bowlAnimT = 0, hurtT = 0;
  let camX, time, runTime, invT, banner = '', bannerT = 0, over = false, paused = false, almariOpen = false, lastSec = -1, curZone = -1, pruneN = 0;
  const keys = { left: false, right: false, jump: false }, held = { jump: false };
  let coyote = 0, jumpBuf = 0;
  const clouds = Array.from({ length: 7 }, (_, i) => ({ x: i * 260 + 40, y: 40 + (i % 3) * 36, w: 90 + (i % 4) * 30 }));

  // ---- world generation ----
  const item = (x, y, type) => ({ x: x + 10, y: y + 10, w: 28, h: 28, type, got: false });
  function randomPickup() {                                   // the components take turns, so every bowl can be finished
    const r = Math.random();
    if (r < 0.55) return TYPES[needIdx++ % TYPES.length];
    if (r < 0.78) return EXTRAS[Math.floor(Math.random() * EXTRAS.length)];
    return 'c';
  }
  function randomPower() { const r = Math.random(); return r < 0.3 ? 'G' : r < 0.6 ? 'S' : r < 0.8 ? 'B' : 'h'; }
  const groundBelow = (x, y) => { const c = Math.floor(x / T); for (let r = Math.max(0, Math.floor(y / T)); r < ROWS; r++) if (solids.has(c * 16 + r)) return r; return -1; };
  function appendChunk(ch) {
    const base = cols;
    const zone = ZONES[zoneIdx];
    const standing = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < ch.w; c++) {
      let t = ch.rows[r][c] || '.';
      const x = (base + c) * T, y = r * T;
      let keep = '.';
      if (t === '#' || t === '=' || t === 'X') { keep = t; solids.add((base + c) * 16 + r); }
      else if (t === 'P') spawn = { x: x + 7, y: y + T - 56 };
      else if (t === '*') t = randomPickup();
      else if (t === '?') t = randomPower();
      if (t === 'c') items.push(item(x, y, 'c'));
      else if (t === '$') items.push(item(x, y, '$'));
      else if (NEED[t] || EXTRA[t] || POWER[t]) items.push(item(x, y, t));
      else if (t === 'W') { const e = { kind: 'W', x: x + 2, y, w: 44, h: 34, vx: -90, dir: -1, alive: true }; enemies.push(e); standing.push(e); }
      else if (t === 'M') { const e = { kind: 'M', x: x + 6, y, w: 36, h: 36, vx: 70, dir: 1, alive: true, t: Math.random() * 3, x0: x - 2 * T, x1: x + 2 * T + T - 36 }; enemies.push(e); standing.push(e); }
      else if (t === 'Z') enemies.push({ kind: 'Z', x: x + 6, y: y + 8, w: 36, h: 28, vx: -80, dir: -1, alive: true, t: Math.random() * 3, x0: x - 3 * T, x1: x + 3 * T, baseY: y + 8 });
      else if (t === '^') { const hz = { kind: '^', x: x + 3, y, w: T - 6, h: T * 0.6 }; hazards.push(hz); standing.push(hz); }
      else if (t === 'L') { const hz = { kind: 'L', x: x - 8, y, w: T + 16, h: 30 }; hazards.push(hz); standing.push(hz); }
      else if (t === 'O') rocks.push({ cx: x + T / 2, x: x + 6, y: -44, w: 36, h: 36, vy: 0, state: 'wait', t: 0 });
      map[r].push(keep);
    }
    for (let c = 0; c < ch.w; c++) colZone.push(zoneIdx);
    cols += ch.w;
    for (const o of standing) { const g = groundBelow(o.x + o.w / 2, o.y); if (g > 0) o.y = g * T - o.h; if (o.kind === 'M') o.baseY = o.y; }
    if (ch !== START) { const d = zone.deco[Math.floor(Math.random() * zone.deco.length)]; deco.push({ x: (base + 2 + Math.random() * (ch.w - 5)) * T, name: d[0], scale: d[1] }); }
    chunkN += 1;
    if (chunkN % ZONE_CHUNKS === 0) { zoneIdx = (zoneIdx + 1) % ZONES.length; zoneMarks.push({ x: cols * T, zone: zoneIdx }); }
  }
  function pickChunk() {
    const diff = Math.min(2, Math.floor(runTime / 60));            // a little harder after each minute
    const weights = { safe: 3 - diff, gap: 3, hazard: 2 + diff, enemy: 2 + diff, rock: 2 + diff, log: 2 + diff, stairs: 2, power: 2, mixed: diff };
    const pool = [];
    for (const ch of CHUNKS) for (let k = 0; k < (weights[ch.tag] || 0); k++) pool.push(ch);
    let ch, tries = 0;
    do { ch = pool[Math.floor(Math.random() * pool.length)]; tries++; }
    while (tries < 20 && lastChunk && (ch === lastChunk || (ch.tag !== 'safe' && ch.tag === lastChunk.tag)));   // no two of a kind in a row
    lastChunk = ch;
    return ch;
  }
  function ensure(col) { while (cols < col) appendChunk(pickChunk()); }
  const solidAt = (c, r) => (r < 0 || r >= ROWS || c < 0 ? false : solids.has(c * 16 + r));
  const zoneAt = (x) => { let z = 0; for (const m of zoneMarks) if (m.x <= x) z = m.zone; return z; };
  function overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  // ---- a run ----
  function resetPlayer(at) {
    player = { x: at.x, y: at.y, w: 34, h: 56, vx: 0, vy: 0, face: 1, ground: false, anim: 0 };
    invT = 1.5;
  }
  function startRun() {
    map = Array.from({ length: ROWS }, () => []); cols = 0; solids = new Set(); colZone = []; zoneMarks = [{ x: 0, zone: 0 }]; zoneIdx = 0; chunkN = 0; lastChunk = null; needIdx = 0;
    items = []; enemies = []; hazards = []; rocks = []; deco = []; parts = []; floats = [];
    score = 0; lives = 3; bowls = 0; inv = {}; extraInv = {}; coins = 0; ingredients = 0; extras = 0; rares = 0; hits = 0; stomps = 0; powerT = { G: 0, S: 0, B: 0 }; bowlAnimT = 0; hurtT = 0;
    camX = 0; time = 0; runTime = 0; lastSec = -1; over = false; paused = false; almariOpen = false; curZone = -1; pruneN = 0;
    appendChunk(START);
    ensure(Math.ceil(W * 2 / T));
    resetPlayer(spawn); invT = 0; lastSafe = { x: spawn.x, y: spawn.y };
    $('pf-overlay').hidden = true; $('pf-almari').hidden = true;
    started = true;
    say('Kutip 6 bahan untuk semangkuk Laksa Gebok. 3 minit bermula!', 2.5);
    hud(); timerText();
  }
  function showRules() {
    started = false;                                            // the world is drawn behind the card; the clock waits for OK
    $('pf-rules').hidden = false;
    $('pf-rules-ok').focus();
  }
  function rulesOk() {
    $('pf-rules').hidden = true;
    started = true; last = performance.now();
    say('Kutip 6 bahan untuk semangkuk Laksa Gebok. 3 minit bermula!', 2.5);
  }
  const filledCount = () => TYPES.filter((k) => (inv[k] || 0) > 0).length;
  const bowlFrame = () => { const n = filledCount(); return bowlAnimT > 0 ? 'bowl3' : n >= 4 ? 'bowl2' : n >= 2 ? 'bowl1' : 'bowl0'; };
  function hud() {
    const z = ZONES[Math.max(0, curZone)];
    $('pf-level').textContent = 'LAKSA QUEST · ' + z.icon + ' ' + z.name.toUpperCase();
    $('pf-score').textContent = score.toLocaleString();
    $('pf-lives').textContent = '♥'.repeat(Math.max(0, lives)) + '♡'.repeat(Math.max(0, 3 - Math.max(0, lives)));
    $('pf-coins').replaceChildren(atlasOk ? sprCanvas('coin', 18) : Object.assign(document.createElement('i'), { className: 'pf-coin-ico' }), document.createTextNode(' ' + coins));
    const slots = $('pf-bowl');
    slots.replaceChildren();
    for (const t of TYPES) {
      const n = inv[t] || 0;
      const s = document.createElement('span'); s.className = 'pf-slot' + (n ? ' lit' : ''); s.title = NEED[t][1] + (n ? ' ×' + n : '');
      if (atlasOk) s.append(sprCanvas(NEED[t][2], 26)); else s.textContent = NEED[t][0];
      if (n > 1) { const x = document.createElement('i'); x.className = 'pf-x'; x.textContent = '×' + n; s.append(x); }
      slots.append(s);
    }
    const b = $('pf-bowls');
    b.replaceChildren();
    if (atlasOk) b.append(sprCanvas(bowlFrame(), 26)); else b.append(document.createTextNode('🍜'));
    b.append(document.createTextNode(' Mangkuk ' + bowls));
    const pw = [];
    for (const k of ['G', 'S', 'B']) if (powerT[k] > 0) pw.push(POWER[k][0] + ' ' + Math.ceil(powerT[k]) + 's');
    $('pf-power').textContent = pw.join('  ');
  }
  function renderAlmari() {                                   // every ingredient of the run, with its count
    const cap = powerT.B > 0 ? CAP_BAKUL : CAP;
    $('pf-almari-sub').textContent = '6 komponen untuk semangkuk Laksa Gebok · ' + filledCount() + '/6 sedia · simpan hingga ' + cap + ' setiap satu';
    const cell = (frame, emoji, name, n, need) => {
      const d = document.createElement('div'); d.className = 'pf-alm' + (n ? '' : ' none');
      if (atlasOk) d.append(sprCanvas(frame, 40)); else { const e = document.createElement('span'); e.className = 'pf-alm-emoji'; e.textContent = emoji; d.append(e); }
      const b = document.createElement('b'); b.textContent = need ? (n ? '×' + n : '–') : '×' + n;
      const s = document.createElement('span'); s.textContent = name;
      d.append(b, s); return d;
    };
    $('pf-almari-need').replaceChildren(...TYPES.map((t) => cell(NEED[t][2], NEED[t][0], NEED[t][1], inv[t] || 0, true)));
    $('pf-almari-extra').replaceChildren(...EXTRAS.map((k) => cell(EXTRA[k][2], EXTRA[k][0], EXTRA[k][1], extraInv[k] || 0, false)));
    $('pf-almari-foot').textContent = 'Mangkuk siap: ' + bowls + ' · bahan dikutip: ' + ingredients + ' · Lesung Batu: ' + rares;
  }
  function openAlmari() {
    if (!started || over || almariOpen) return;
    almariOpen = true; renderAlmari();
    $('pf-almari').hidden = false;
    $('pf-almari-close').focus();
  }
  function closeAlmari() {
    almariOpen = false;
    $('pf-almari').hidden = true;
    last = performance.now();
  }
  function timerText() {
    const rem = Math.max(0, LIMIT - runTime), s = Math.ceil(rem);
    if (s === lastSec) return;
    lastSec = s;
    $('pf-timer').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    $('pf-timer').classList.toggle('low', rem <= 30);
  }
  function say(text, secs) { banner = text; bannerT = secs || 2; }
  function spark(x, y, color, n) { for (let i = 0; i < (n || 8); i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 260, t: 0.5 + Math.random() * 0.3, color }); }
  function floater(x, y, text, color, secs) { floats.push({ x, y, text, color: color || '#fff', t: secs || 1, t0: secs || 1 }); }
  function hurt(from) {
    if (invT > 0 || over || !started) return;
    const p = player;
    if (powerT.S > 0) {                                         // Senduk Sakti takes the hit
      powerT.S = 0; invT = 1;
      sfx().shieldHit(); spark(p.x + 17, p.y + 28, '#9ad4ff', 12); say('🥄 Senduk Sakti melindungi!', 1.3);
      if (from === 'fall') resetPlayer(lastSafe);
      hud(); return;
    }
    lives -= 1; hits += 1; hurtT = 0.5;
    sfx().crash();
    spark(p.x + 17, p.y + 28, '#ff5a5a', 14);
    floater(p.x + 17, p.y - 6, '−1 ♥', '#ff8a8a');
    if (lives <= 0) { over = true; hud(); endRun('crashed'); return; }
    if (from === 'fall') resetPlayer(lastSafe); else { invT = 1.5; p.vy = -380; p.ground = false; }
    say('♥ ' + lives + ' lagi', 1.2);
    hud();
  }
  function collect(it) {
    it.got = true;
    const cx = it.x + 14, cy = it.y + 14, t = it.type;
    if (t === 'c') { coins += 1; score += SC.coin; floater(cx, cy, '+' + SC.coin, '#ffe08a', 0.7); spark(cx, cy, '#ffd45a', 4); sfx().collect(1); hud(); return; }
    if (t === '$') { rares += 1; ingredients += 1; score += SC.rare; floater(cx, cy, RARE[0] + ' +' + SC.rare, '#fff0b0'); spark(cx, cy, '#ff9ad4', 10); say(RARE[1] + ' jarang! +' + SC.rare, 1.3); sfx().power(); hud(); return; }
    if (t === 'h') { lives = Math.min(3, lives + 1); score += SC.life; floater(cx, cy, '❤️ +1'); spark(cx, cy, '#ff6b8a'); say('❤️ Nyawa dipulihkan!', 1.3); sfx().power(); hud(); return; }
    if (POWER[t]) { score += SC.power; powerT[t] = PW[t]; floater(cx, cy, POWER[t][0] + ' +' + SC.power); spark(cx, cy, '#9ad4ff', 10); say(POWER[t][0] + ' ' + POWER[t][1] + ': ' + POWER[t][2] + ' (' + PW[t] + ' s)', 2); sfx().boost(); hud(); return; }
    const boost = powerT.G > 0 ? 2 : 1;
    if (EXTRA[t]) { ingredients += 1; extras += 1; extraInv[t] = (extraInv[t] || 0) + 1; const gain = SC.extra * boost; score += gain; floater(cx, cy, EXTRA[t][0] + ' +' + gain, '#d8ffd0', 0.9); spark(cx, cy, '#b8f0a0', 5); sfx().collect(2); hud(); return; }
    ingredients += 1;                                           // a component of the bowl
    const have = inv[t] || 0, cap = powerT.B > 0 ? CAP_BAKUL : CAP;
    if (have >= cap) { score += SC.dup; floater(cx, cy, '+' + SC.dup, '#ffe08a', 0.7); sfx().collect(1); hud(); return; }   // the almari is full of this one: points only
    inv[t] = have + 1;
    const gain = SC.item * boost;
    score += gain;
    floater(cx, cy, NEED[t][0] + ' +' + gain, '#fff');
    spark(cx, cy, '#ffd45a');
    const filled = filledCount();
    sfx().collect(filled);
    if (filled === TYPES.length) completeBowl(); else say(NEED[t][1] + ' ' + filled + '/6', 1.1);
    hud();
  }
  function completeBowl() {
    for (const k of TYPES) inv[k] -= 1;                         // spare copies stay for the next bowl
    bowls += 1; score += SC.bowl; bowlAnimT = 1.6;
    say('🍜 Semangkuk Laksa Gebok siap! +' + SC.bowl, 2.2);
    floater(player.x + 17, player.y - 14, '+' + SC.bowl, '#ffe27a', 1.6);
    spark(player.x + 17, player.y + 20, '#ffd45a', 18);
    sfx().gebuk();
  }
  const clock = (t) => { t = Math.max(0, Math.floor(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
  function endRun(result) {
    over = true;
    if (result === 'timeout') sfx().fanfare(); else sfx().gameover();
    const won = result === 'timeout';
    $('pf-title').textContent = won ? 'Syabas!' : 'Alamak!';
    for (const s of document.querySelectorAll('#pf-overlay .done-star')) s.hidden = !won;
    $('pf-text').textContent = won
      ? 'Berapa banyak mangkuk Laksa Gebok berjaya anda hasilkan? ' + bowls + ' mangkuk dalam 3 minit!'
      : 'Kehabisan nyawa selepas ' + clock(runTime) + '. ' + bowls + ' mangkuk Laksa Gebok siap.';
    const stats = $('pf-stats');
    stats.replaceChildren();
    for (const [ico, label, val] of [['🏆', 'Skor', score.toLocaleString()], ['🍜', 'Mangkuk', String(bowls)], ['🧺', 'Bahan', String(ingredients)], ['🪙', 'Syiling', String(coins)]]) {
      const d = document.createElement('div'); d.className = 'done-stat';
      const i = document.createElement('span'); i.className = 'done-stat-emoji'; i.textContent = ico;
      const tx = document.createElement('span'); tx.className = 'done-stat-text';
      const l = document.createElement('span'); l.className = 'done-stat-label'; l.textContent = label;
      const v = document.createElement('strong'); v.textContent = val;
      tx.append(l, v); d.append(i, tx); stats.append(d);
    }
    const box = $('pf-achv');
    box.replaceChildren();
    const got = ACHV.filter((a) => a[2]());
    if (got.length) for (const a of got) { const b = document.createElement('span'); b.className = 'pf-badge'; b.textContent = a[0] + ' ' + a[1]; box.append(b); }
    else { const n = document.createElement('span'); n.className = 'pf-achv-none'; n.textContent = 'Belum ada pencapaian. Cuba lagi!'; box.append(n); }
    $('pf-overlay').hidden = false;
    GebokStore.recordGame('platform', { at: new Date().toISOString(), level: 1, result, score, bowls, lives, time: +Math.min(runTime, LIMIT).toFixed(1), coins, ingredients, rares, hits, stomps })
      .catch(() => { /* kept on this device only */ });
    window.LaksaArcade.renderBests();
  }

  // ---- simulation ----
  function update(dt) {
    if (!started || paused || almariOpen || over) return;
    time += dt; runTime += dt;
    timerText();
    if (runTime >= LIMIT) { endRun('timeout'); return; }
    if (bannerT > 0) bannerT -= dt;
    if (invT > 0) invT -= dt;
    if (hurtT > 0) hurtT -= dt;
    if (bowlAnimT > 0) { bowlAnimT -= dt; if (bowlAnimT <= 0) hud(); }
    let pwChanged = false;
    for (const k of ['G', 'S', 'B']) if (powerT[k] > 0) { const before = Math.ceil(powerT[k]); powerT[k] = Math.max(0, powerT[k] - dt); if (Math.ceil(powerT[k]) !== before) pwChanged = true; if (powerT[k] === 0) say(POWER[k][0] + ' ' + POWER[k][1] + ' tamat', 1); }
    if (pwChanged) hud();
    ensure(Math.floor((camX + W) / T) + 24);
    const p = player;
    const ax = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    p.vx = ax * RUN;
    if (ax) p.face = ax;
    coyote = p.ground ? 0.09 : Math.max(0, coyote - dt);
    jumpBuf = keys.jump && !held.jump ? 0.12 : Math.max(0, jumpBuf - dt);
    if (jumpBuf > 0 && coyote > 0) { p.vy = JUMP; p.ground = false; coyote = 0; jumpBuf = 0; sfx().jump(); }
    if (!keys.jump && p.vy < -250) p.vy = -250;
    held.jump = keys.jump;
    p.vy = Math.min(MAXFALL, p.vy + GRAV * dt);
    p.x += p.vx * dt;
    if (p.x < 0) p.x = 0;
    for (const [r, c] of tilesAround(p)) if (solidAt(c, r) && overlaps(p, { x: c * T, y: r * T, w: T, h: T })) {
      if (p.vx > 0) p.x = c * T - p.w; else if (p.vx < 0) p.x = c * T + T;
    }
    p.y += p.vy * dt;
    p.ground = false;
    for (const [r, c] of tilesAround(p)) if (solidAt(c, r) && overlaps(p, { x: c * T, y: r * T, w: T, h: T })) {
      if (p.vy > 0) { p.y = r * T - p.h; p.vy = 0; p.ground = true; }
      else if (p.vy < 0) { p.y = r * T + T; p.vy = 0; }
    }
    if (p.y > ROWS * T + 60) { hurt('fall'); return; }
    if (p.ground) {                                             // remember solid ground under both feet, for the way back from a stream
      const fr = Math.floor((p.y + p.h + 2) / T);
      if (solidAt(Math.floor((p.x + 2) / T), fr) && solidAt(Math.floor((p.x + p.w - 2) / T), fr) && !hazards.some((hz) => Math.abs(hz.x - p.x) < 80)) lastSafe = { x: p.x, y: p.y };
    }
    p.anim += dt * (p.ground && ax ? 12 : 0);
    // enemies: boars patrol the ground, monkeys hop along their plank, bees fly to and fro
    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.kind === 'W') {
        e.x += e.vx * dt;
        const fr = Math.floor((e.y + e.h + 2) / T), fc = Math.floor((e.vx > 0 ? e.x + e.w + 2 : e.x - 2) / T), hr = Math.floor((e.y + e.h - 4) / T);
        if (!solidAt(fc, fr) || solidAt(fc, hr) || e.x < 0) { e.vx = -e.vx; e.dir = -e.dir; }
      } else if (e.kind === 'M') {
        e.t += dt; e.x += e.vx * dt;
        if (e.x < e.x0 || e.x > e.x1) { e.x = Math.max(e.x0, Math.min(e.x1, e.x)); e.vx = -e.vx; e.dir = -e.dir; }
        e.y = e.baseY - Math.abs(Math.sin(e.t * 3.5)) * 44;
      } else {
        e.t += dt; e.x += e.vx * dt;
        if (e.x < e.x0 || e.x > e.x1) { e.x = Math.max(e.x0, Math.min(e.x1, e.x)); e.vx = -e.vx; e.dir = -e.dir; }
        e.y = e.baseY + Math.sin(e.t * 3) * 16;
      }
      if (overlaps(p, e)) {
        if (p.vy > 60 && p.y + p.h - e.y < 24) {
          e.alive = false; p.vy = -450; stomps += 1; score += SC.stomp;
          spark(e.x + 20, e.y + 10, '#f4f4f4', 10); floater(e.x + 20, e.y - 6, '+' + SC.stomp, '#fff'); sfx().smash();
          say((e.kind === 'W' ? 'Babi hutan' : e.kind === 'M' ? 'Monyet' : 'Lebah') + ' lari! +' + SC.stomp, 1); hud();
        } else hurt();
      }
    }
    for (const hz of hazards) if (overlaps(p, hz)) { hurt(); break; }
    // falling rocks: a sign on the ground, a shake, then the drop
    for (const R of rocks) {
      if (R.state === 'done') continue;
      if (R.state === 'wait') { if (p.x > R.cx - 230 && p.x < R.cx + 60) { R.state = 'shake'; R.t = 0.5; } continue; }
      if (R.state === 'shake') { R.t -= dt; if (R.t <= 0) { R.state = 'fall'; R.vy = 0; } continue; }
      if (R.state === 'fall') {
        R.vy = Math.min(900, R.vy + 1500 * dt); R.y += R.vy * dt;
        const gr = Math.floor((R.y + R.h) / T), gc = Math.floor(R.cx / T);
        if (solidAt(gc, gr)) { R.y = gr * T - R.h; R.state = 'rest'; R.t = 1.6; spark(R.cx, R.y + R.h, '#b9a98a', 8); sfx().smash(); }
        else if (R.y > ROWS * T + 60) R.state = 'done';
      } else if (R.state === 'rest') { R.t -= dt; if (R.t <= 0) R.state = 'done'; }
      if (overlaps(p, R)) hurt();
    }
    const reach = powerT.G > 0 ? REACH * 3 : REACH;
    const box = { x: p.x - reach, y: p.y - reach, w: p.w + reach * 2, h: p.h + reach * 2 };
    for (const it of items) if (!it.got && overlaps(box, it)) collect(it);
    for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 600 * dt; if (q.t <= 0) parts.splice(i, 1); }
    for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.t -= dt; f.y -= 42 * dt; if (f.t <= 0) floats.splice(i, 1); }
    camX += ((p.x + p.w / 2 - W * 0.4) - camX) * Math.min(1, dt * 6);
    camX = Math.max(0, camX);
    const z = zoneAt(p.x + p.w / 2);
    if (z !== curZone) { curZone = z; if (runTime > 1) say(ZONES[z].icon + ' ' + ZONES[z].name, 2); hud(); }
    if (++pruneN % 120 === 0) {                                 // forget what is far behind
      const lim = camX - 600;
      items = items.filter((it) => !it.got && it.x > lim); enemies = enemies.filter((e) => e.alive && e.x > lim); deco = deco.filter((d) => d.x > lim);
      rocks = rocks.filter((R) => R.state !== 'done'); hazards = hazards.filter((hz) => hz.x > lim);
    }
    $('pf-score').textContent = score.toLocaleString();
  }
  function tilesAround(b) {
    const out = [];
    for (let r = Math.floor(b.y / T) - 1; r <= Math.floor((b.y + b.h) / T) + 1; r++) for (let c = Math.floor(b.x / T) - 1; c <= Math.floor((b.x + b.w) / T) + 1; c++) if (r >= 0 && c >= 0) out.push([r, c]);
    return out;
  }

  // ---- drawing ----
  function draw() {
    const g = ctx;
    const z = ZONES[Math.max(0, curZone)];
    g.setTransform(1, 0, 0, 1, 0, 0);
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, z.sky[0]); sky.addColorStop(0.65, z.sky[1]); sky.addColorStop(1, z.sky[2]);
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    if (z.indoor) {                                             // the kitchen: plank walls, a shelf of pots
      g.fillStyle = 'rgba(0,0,0,.08)';
      for (let i = 0; i < 9; i++) g.fillRect(0, 36 + i * 44, W, 3);
      for (let i = 0; i < 6; i++) {
        const x = ((i * 320 - camX * 0.3) % (W + 320) + W + 320) % (W + 320) - 160;
        g.fillStyle = '#5a3a1c'; g.fillRect(x - 70, 150, 140, 8);
        if (!drawFit(g, i % 2 ? 'basket' : 'mortar', x, 150, 44)) { g.font = '30px serif'; g.textAlign = 'center'; g.fillText(i % 2 ? '🍲' : '🥘', x, 146); }
      }
    } else {
      g.fillStyle = z.hill1;
      for (let i = 0; i < 8; i++) { const x = ((i * 300 - camX * 0.2) % (W + 600) + W + 600) % (W + 600) - 300; g.beginPath(); g.ellipse(x, 400, 220, 120, 0, Math.PI, 0); g.fill(); }
      g.fillStyle = z.hill2;
      for (let i = 0; i < 10; i++) { const x = ((i * 240 - camX * 0.35) % (W + 480) + W + 480) % (W + 480) - 240; g.beginPath(); g.ellipse(x, 440, 170, 90, 0, Math.PI, 0); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,.9)';
      for (const c of clouds) { const x = ((c.x - camX * 0.1 + time * 8) % (W + 300) + W + 300) % (W + 300) - 150; g.beginPath(); g.ellipse(x, c.y, c.w / 2, 18, 0, 0, Math.PI * 2); g.ellipse(x - c.w * 0.25, c.y + 6, c.w / 3, 14, 0, 0, Math.PI * 2); g.ellipse(x + c.w * 0.25, c.y + 6, c.w / 3, 14, 0, 0, Math.PI * 2); g.fill(); }
    }
    g.save();
    g.translate(-Math.round(camX), 0);
    const c0 = Math.max(0, Math.floor(camX / T) - 1), c1 = Math.min(cols - 1, Math.ceil((camX + W) / T) + 1);
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    for (const d of deco) if (d.x > camX - 200 && d.x < camX + W + 200) {        // scenery behind the action
      const f = FR[d.name];
      if (!drawFit(g, d.name, d.x, 8 * T + 2, (f ? f[3] : 60) * d.scale)) { g.font = '48px serif'; g.fillText('🌴', d.x, 8 * T - 2); }
    }
    for (let c = c0; c <= c1; c++) {
      const zc = ZONES[colZone[c] || 0];
      if ((map[8][c] || '.') !== '#') {                         // a gap: a stream or a pit
        if (zc.water) {
          if (!drawSpr(g, 'water', c * T, 8 * T + 10, T, T)) { g.fillStyle = '#3f9fe0'; g.fillRect(c * T, 8 * T + 14, T, T); }
          g.fillStyle = '#2f86c8'; g.fillRect(c * T, 9 * T + 10, T, H - 9 * T);
          g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(c * T + 6 + Math.sin(time * 3 + c) * 4, 8 * T + 22, 18, 3);
        } else { const pit = g.createLinearGradient(0, 8 * T, 0, H); pit.addColorStop(0, 'rgba(0,0,0,.35)'); pit.addColorStop(1, '#1a120a'); g.fillStyle = pit; g.fillRect(c * T, 8 * T + 10, T, H - 8 * T); }
      }
      for (let r = 0; r < ROWS; r++) {
        const ch = map[r][c] || '.';
        const x = c * T, y = r * T;
        if (ch === '#') {
          const top = r === 0 || (map[r - 1][c] || '.') !== '#';
          const f = FR[zc.ground];
          if (f && atlasOk) {
            if (top) g.drawImage(ATLAS, f[0], f[1], f[2], f[3], x, y, T, T);
            else { const cut = Math.round(f[3] * 0.42); g.drawImage(ATLAS, f[0], f[1] + cut, f[2], f[3] - cut, x, y, T, T); }
          } else {
            g.fillStyle = zc.earth; g.fillRect(x, y, T, T);
            g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x + 4, y + 4, T - 8, T - 8);
            if (top) { g.fillStyle = zc.grass; g.fillRect(x, y, T, 12); g.fillStyle = zc.blade; for (let k = 0; k < 4; k++) g.fillRect(x + k * 12 + 3, y - 4, 4, 8); }
          }
        } else if (ch === 'X') {
          if (!drawSpr(g, 'crate', x, y, T, T)) { g.fillStyle = '#c08a4a'; g.fillRect(x + 2, y + 2, T - 4, T - 4); g.strokeStyle = '#8a5a2b'; g.lineWidth = 3; g.strokeRect(x + 4, y + 4, T - 8, T - 8); }
        }
      }
    }
    for (let r = 0; r < ROWS; r++) for (let c = Math.max(0, c0 - 6); c <= c1; c++) {     // planks: one piece per run
      if ((map[r][c] || '.') !== '=' || (map[r][c - 1] || '.') === '=') continue;
      let n = 1; while ((map[r][c + n] || '.') === '=') n++;
      const x = c * T, y = r * T, zc = ZONES[colZone[c] || 0];
      if (!drawSpr(g, zc.plank, x - 4, y - 2, n * T + 8, T * 0.62)) {
        g.fillStyle = '#c08a4a'; g.fillRect(x, y, n * T, T * 0.55); g.fillStyle = '#8a5a2b'; g.fillRect(x, y, n * T, 5); g.fillRect(x, y + T * 0.55 - 5, n * T, 5);
      }
    }
    for (const hz of hazards) if (hz.x > camX - 120 && hz.x < camX + W + 120) {
      if (hz.kind === 'L') { if (!drawSpr(g, 'log', hz.x - 2, hz.y - 4, hz.w + 4, hz.h + 6)) { g.fillStyle = '#8a5a2b'; g.fillRect(hz.x, hz.y, hz.w, hz.h); } continue; }
      if (!drawSpr(g, 'bamboo', hz.x - 3, hz.y - 2, hz.w + 6, hz.h + 4)) {
        for (let k = 0; k < 4; k++) { const sx = hz.x + 4 + k * 10; g.fillStyle = '#9ccc5a'; g.fillRect(sx, hz.y + 8, 5, hz.h - 8); g.fillStyle = '#e9f5c8'; g.beginPath(); g.moveTo(sx - 1, hz.y + 9); g.lineTo(sx + 2.5, hz.y); g.lineTo(sx + 6, hz.y + 9); g.fill(); }
      }
    }
    g.textBaseline = 'middle';
    for (const it of items) if (!it.got && it.x > camX - 60 && it.x < camX + W + 60) {
      const bob = Math.sin(time * 4 + it.x) * 3;
      const cx = it.x + 14, cy = it.y + 14 + bob;
      if (it.type === 'c') {                                    // a spinning gold coin
        const sx = Math.max(0.15, Math.abs(Math.cos(time * 5 + it.x * 0.05)));
        g.save(); g.translate(cx, cy); g.scale(sx, 1);
        if (!drawSpr(g, 'coin', -13, -13, 26, 26)) {
          g.fillStyle = '#b8780f'; g.beginPath(); g.arc(0, 0, 12, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#f2b63c'; g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2); g.fill();
        }
        g.restore();
        continue;
      }
      if (POWER[it.type] || it.type === '$') { g.strokeStyle = it.type === '$' ? 'rgba(255,160,220,.8)' : 'rgba(150,220,255,.85)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 21 + Math.sin(time * 6) * 2, 0, Math.PI * 2); g.stroke(); }
      const def = it.type === '$' ? RARE : NEED[it.type] || EXTRA[it.type] || POWER[it.type];
      const frame = it.type === '$' ? RARE[2] : POWER[it.type] ? POWER[it.type][3] : def[2];
      if (!drawFit(g, frame, cx, cy + 17, EXTRA[it.type] ? 32 : 34)) { g.font = (EXTRA[it.type] ? 24 : 27) + 'px serif'; g.fillText(def[0], cx, cy); }
    }
    for (const R of rocks) if (R.state !== 'done' && R.cx > camX - 80 && R.cx < camX + W + 80) {
      if (R.state === 'wait' || R.state === 'shake') {
        const jit = R.state === 'shake' ? (Math.random() - 0.5) * 6 : 0;
        g.font = '22px serif'; g.fillText('⚠️', R.cx, 8 * T - 16);
        drawRock(g, R.cx - 18 + jit, 6 + jit);
      } else drawRock(g, R.x, R.y);
    }
    g.font = '34px serif';
    for (const e of enemies) if (e.alive && e.x > camX - 80 && e.x < camX + W + 80) {
      const flip = e.dir > 0;                                   // the sprites face left
      let frame;
      if (e.kind === 'W') frame = 'boar' + (Math.floor(time * 8 + e.x) % 3);
      else if (e.kind === 'M') frame = 'monkey' + (Math.floor(e.t * 6) % 4);
      else frame = 'bee' + (Math.floor(time * 14 + e.x) % 7);
      if (!drawFit(g, frame, e.x + e.w / 2, e.y + e.h + (e.kind === 'W' ? 4 : 2), e.kind === 'Z' ? 34 : 42, flip)) {
        g.save(); g.translate(e.x + e.w / 2, e.y + e.h / 2); g.scale(flip ? -1 : 1, 1); g.fillText(e.kind === 'W' ? '🐗' : e.kind === 'M' ? '🐒' : '🐝', 0, 2); g.restore();
      }
    }
    for (const q of parts) { g.fillStyle = q.color; g.globalAlpha = Math.max(0, q.t * 1.6); g.fillRect(q.x, q.y, 5, 5); }
    g.globalAlpha = 1;
    drawPlayer(g);
    if (bowlAnimT > 0) {                                        // the finished bowl rises over the player
      const k = 1 - bowlAnimT / 1.6, s = 1 + Math.sin(k * Math.PI) * 0.5;
      g.save(); g.globalAlpha = Math.min(1, (1 - k) * 2); g.translate(player.x + 17, player.y - 20 - k * 70); g.scale(s, s);
      if (!drawFit(g, 'bowl3', 0, 22, 44)) { g.font = '40px serif'; g.fillText('🍜', 0, 0); }
      g.restore();
    }
    g.font = 'bold 16px Nunito, Arial, sans-serif';
    for (const f of floats) { g.globalAlpha = Math.max(0, Math.min(1, f.t / f.t0 * 1.5)); g.fillStyle = 'rgba(0,0,0,.5)'; g.fillText(f.text, f.x + 1, f.y + 1); g.fillStyle = f.color; g.fillText(f.text, f.x, f.y); }
    g.globalAlpha = 1;
    g.restore();
  }
  function drawRock(g, x, y) {
    if (drawSpr(g, 'boulder', x - 3, y - 2, 42, 40)) return;
    g.fillStyle = '#7d7366'; g.beginPath(); g.moveTo(x + 4, y + 30); g.lineTo(x, y + 14); g.lineTo(x + 10, y + 2); g.lineTo(x + 26, y); g.lineTo(x + 36, y + 12); g.lineTo(x + 33, y + 32); g.lineTo(x + 14, y + 36); g.closePath(); g.fill();
    g.fillStyle = '#a79c8c'; g.beginPath(); g.moveTo(x + 10, y + 8); g.lineTo(x + 24, y + 5); g.lineTo(x + 20, y + 16); g.closePath(); g.fill();
  }
  function playerFrame() {
    const p = player;
    if (over && lives <= 0) return 'gameover1';
    if (hurtT > 0) return 'hurt' + (Math.floor(time * 10) % 2);
    if (!p.ground) return 'jump' + (p.vy < -400 ? 0 : p.vy < -100 ? 1 : p.vy < 100 ? 2 : p.vy < 400 ? 3 : 4);
    if (bowlAnimT > 0 && !p.vx) return 'celebrate' + (Math.floor(time * 6) % 3);
    if (p.vx) return 'run' + (Math.floor(p.anim) % 5);
    return 'idle' + (Math.floor(time * 4) % 5);
  }
  function drawPlayer(g) {
    const p = player;
    if (powerT.S > 0) { g.strokeStyle = 'rgba(120,210,255,' + (0.5 + Math.sin(time * 8) * 0.25) + ')'; g.lineWidth = 4; g.beginPath(); g.ellipse(p.x + p.w / 2, p.y + p.h / 2, 34, 42, 0, 0, Math.PI * 2); g.stroke(); }
    if (powerT.G > 0) { g.strokeStyle = 'rgba(255,214,90,' + (0.4 + Math.sin(time * 10) * 0.25) + ')'; g.lineWidth = 3; g.beginPath(); g.ellipse(p.x + p.w / 2, p.y + p.h / 2, 46, 52, 0, 0, Math.PI * 2); g.stroke(); }
    if (invT > 0 && hurtT <= 0 && Math.floor(invT * 12) % 2) return;
    if (drawFit(g, playerFrame(), p.x + p.w / 2, p.y + p.h + 2, 66, p.face < 0)) {
      if (powerT.B > 0) drawFit(g, 'basket', p.x + p.w / 2 - p.face * 22, p.y + 30, 22);
      return;
    }
    g.save();
    g.translate(p.x + p.w / 2, p.y);
    g.scale(p.face, 1);
    const stride = Math.sin(p.anim) * (p.ground ? 1 : 0.3);
    g.fillStyle = '#25306e'; g.fillRect(-20, 16, 12, 26);                       // backpack
    g.fillStyle = '#4a3220'; g.fillRect(-9, 36, 8, 14 + stride * 4); g.fillRect(2, 36, 8, 14 - stride * 4);   // legs
    g.fillStyle = '#f5f5f5'; g.fillRect(-10, 50 + stride * 4, 10, 6); g.fillRect(1, 50 - stride * 4, 11, 6);  // shoes
    g.fillStyle = '#6e4b2c'; g.fillRect(-11, 14, 22, 24);                        // jacket
    g.fillStyle = '#6e4b2c'; g.fillRect(-16, 16, 6, 14); g.fillRect(10, 16 + stride * 3, 6, 14);  // arms
    g.fillStyle = '#f1c9a3'; g.fillRect(-9, -4, 18, 18);                        // head
    g.fillStyle = '#1b1b20'; g.fillRect(-10, -8, 20, 7); g.fillRect(-16, -5, 8, 4);  // cap + back brim
    g.fillStyle = '#d6249a'; g.fillRect(-12, 2, 4, 8); g.fillRect(8, 2, 4, 8); g.fillRect(-12, -2, 24, 3);   // headphones
    g.fillStyle = '#1a1a1a'; g.fillRect(3, 2, 3, 3);                              // eye
    g.restore();
  }
  function frame(now) {
    if (!open) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt);
    draw();
    const b = $('pf-banner');
    b.hidden = bannerT <= 0;
    if (bannerT > 0) b.textContent = banner;
  }
  function fit() {
    const box = $('platform');
    const scale = Math.min(box.clientWidth / W, box.clientHeight / H);
    canvas.width = W; canvas.height = H;
    canvas.style.width = Math.floor(W * scale) + 'px';
    canvas.style.height = Math.floor(H * scale) + 'px';
  }
  function openGame() {
    window.GebokRun.menu();
    window.GebokRun.pauseRender(true);
    $('platform').hidden = false;
    open = true;
    fit();
    startRun();
    showRules();
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }
  function close() {
    open = false;
    cancelAnimationFrame(raf);
    window.GebokRun.pauseRender(false);
    window.LaksaArcade.showGames();
  }
  function wire() {
    window.addEventListener('resize', () => { if (open) fit(); });
    window.addEventListener('keydown', (e) => {
      if (!open) return;
      if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      const k = e.key;
      if (almariOpen) { if (k === 'Escape' || k === 'i' || k === 'I') { closeAlmari(); e.preventDefault(); } return; }
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = true;
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = true;
      else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ') { if (!started && !$('pf-rules').hidden) return; keys.jump = true; }
      else if (k === 'i' || k === 'I') openAlmari();
      else if (k === 'p' || k === 'P' || k === 'Escape') { if (!started || over) return; paused = !paused; say(paused ? 'REHAT · tekan P' : 'Sambung!', paused ? 999 : 1); if (!paused) bannerT = 1; }
      else return;
      e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
      else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ') keys.jump = false;
    });
    const touch = (id, prop) => {
      const el = $(id);
      const on = (e) => { keys[prop] = true; e.preventDefault(); };
      const off = (e) => { keys[prop] = false; e.preventDefault(); };
      el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
    };
    touch('pf-left', 'left'); touch('pf-right', 'right'); touch('pf-jump', 'jump');
    $('pf-pause').addEventListener('click', () => { if (!started || over) return; paused = !paused; say(paused ? 'REHAT' : 'Sambung!', paused ? 999 : 1); });
    $('pf-exit').addEventListener('click', close);
    $('pf-rules-ok').addEventListener('click', rulesOk);
    $('pf-primary').addEventListener('click', () => { startRun(); last = performance.now(); });
    $('pf-secondary').addEventListener('click', close);
    $('pf-almari-btn').addEventListener('click', openAlmari);
    $('pf-bowl').addEventListener('click', openAlmari);
    $('pf-almari-close').addEventListener('click', closeAlmari);
  }
  window.LaksaQuest = {
    open: openGame, close, wire, start: startRun, rulesOk, openAlmari, closeAlmari, update, draw, keys, LIMIT, NEED, EXTRA, RARE, POWER, ZONES, CHUNKS, SC, FR,
    get atlasReady() { return atlasOk; },
    debug: () => ({ lives, score, bowls, inv: Object.assign({}, inv), extraInv: Object.assign({}, extraInv), coins, ingredients, extras, rares, hits, stomps, powerT: Object.assign({}, powerT), runTime: +runTime.toFixed(2), zone: curZone, cols,
      player: player && { x: Math.round(player.x), y: Math.round(player.y), ground: player.ground, frame: playerFrame() }, items: items.filter((i) => !i.got).length, enemies: enemies.filter((e) => e.alive).length, rocks: rocks.length,
      started, over, paused, almariOpen, banner, bannerT: +bannerT.toFixed(2), invT: +invT.toFixed(2) }),
    live: () => ({ player, items, enemies, hazards, rocks, map, deco, setLives: (n) => { lives = n; hud(); }, setTime: (t) => { runTime = t; lastSec = -1; timerText(); }, collect, hurt, lastSafe: () => lastSafe }),
  };
})();
