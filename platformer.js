/* ======================================================================
   LaksaQuest — a side-scrolling platformer. Jump through the kampung, collect
   the five laksa ingredients (noodles, fish, kesum, kantan, sambal) to finish a
   bowl, finish the level's bowl mission and reach the laksa stall.
   Canvas 2D, procedural drawing, ASCII levels. Records go to GebokStore.
   ====================================================================== */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const T = 48, W = 960, H = 540;
  const GRAV = 2000, JUMP = -860, RUN = 300, MAXFALL = 1000;   // airtime ≈ 0.86 s ≈ 5.4 tiles of travel, 4 tiles of height
  const REACH = 12;                                              // pickup padding around the player box (coins feel generous)
  const ITEMS = { n: ['🍝', 'Mi laksa'], i: ['🐟', 'Ikan'], k: ['🌿', 'Daun kesum'], b: ['🌸', 'Bunga kantan'], s: ['🌶', 'Sambal'] };
  const TYPES = Object.keys(ITEMS);
  const SC = { item: 10, dup: 5, bowl: 100, level: 300, stomp: 20, life: 50 };
  // Legend: # earth, = plank, P start, F laksa stall (finish), E chicken, ^ hot pot, C checkpoint,
  // h heart, n i k b s ingredients. 11 rows each.
  const LEVELS = [
    { name: 'Kampung', bowls: 2, map: [
      '....................................................................................................',
      '....................................................................................................',
      '....................................................................................................',
      '....................................................................................................',
      '....................................................................................................',
      '...................................................n...............................n................',
      '...P.......n...E.i.k.......b...s.E.n...i..k.b.s......i.C.k.E.b.s.n..i.k...E.b...s..............F....',
      '............................................===.....................................................',
      '#######################...########################..##############################..################',
      '#######################...########################..##############################..################',
      '#######################...########################..##############################..################',
    ] },
    { name: 'Sungai', bowls: 3, map: [
      '............................................................................................................................................',
      '............................................................................................................................................',
      '............................................................................................................................................',
      '............................................................................................................................................',
      '..................................................................................................h.s.......................................',
      '..................................................................................................===....n..................................',
      '...P.....n.i...E............k.b.s.E.n.i.k..b.s.n...........i.k.b.....s.n...i.^^^.C..k.b.s...n...i.b........i.k...E.b.s......n..........F....',
      '.............................................===...........===..............................................................................',
      '#######################....#########################....#########...####################################..##################################',
      '#######################....#########################....#########...####################################..##################################',
      '#######################....#########################....#########...####################################..##################################',
    ] },
    { name: 'Pasar', bowls: 4, map: [
      '....................................................................................................................................................................',
      '....................................................................................................................................................................',
      '....................................................................................................................................................................',
      '....................................................................................................................................................................',
      '................................h.n.i........................................b.n................................................k.s............b.n..................',
      '.........................n......=====....b...................................===................................................===....n.......===..................',
      '...P.....n.i...E.k.b.s......i.k.s.....k.......s.n.i......k.b.s.E.n...i.....k.s.i.k......b.C...E.s...n..i...k...b.^^^.s...n....i.b.........i.k...s...i..........F....',
      '..............................................====..................................................................................................................',
      '#######################....#############...############################...#########....###############################################...#############..############',
      '#######################....#############...############################...#########....###############################################...#############..############',
      '#######################....#############...############################...#########....###############################################...#############..############',
    ] },
  ];
  const canvas = $('pf-canvas');
  const ctx = canvas.getContext('2d');
  let open = false, raf = 0, last = 0;
  let lvl = 0, map = [], cols = 0, rows = 0, solids = new Set();
  let player, items, enemies, hazards, finish, checkpoint, spawn, parts;
  let lives, score, bowls, bowl, bowlsNeeded, camX, time, runTime, invT, banner = '', bannerT = 0, finishHintT = 0, levelDone = false, over = false, paused = false, runScore = 0, levelStartScore = 0;
  const keys = { left: false, right: false, jump: false }, held = { jump: false };
  let coyote = 0, jumpBuf = 0;
  const clouds = Array.from({ length: 7 }, (_, i) => ({ x: i * 260 + 40, y: 40 + (i % 3) * 36, w: 90 + (i % 4) * 30 }));

  function parse(def) {
    map = def.map; rows = map.length; cols = Math.max(...map.map((r) => r.length));
    solids = new Set(); items = []; enemies = []; hazards = []; finish = null; checkpoint = null; spawn = { x: 2 * T, y: 6 * T }; parts = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const ch = map[r][c] || '.';
      const x = c * T, y = r * T;
      if (ch === '#' || ch === '=') solids.add(r * 1000 + c);
      else if (ch === 'P') spawn = { x: x + 7, y: y + T - 56 };
      else if (ch === 'F') finish = { x, y: y - T, w: T * 2, h: T * 2 };
      else if (ch === 'C') checkpoint = { x, y: y - T * 0.4, w: T, h: T * 1.4, hit: false };
      else if (ch === 'E') enemies.push({ x: x + 4, y: y + T - 36, w: 40, h: 36, vx: -60, dir: -1, alive: true });
      else if (ch === '^') hazards.push({ x: x + 4, y: y + T * 0.45, w: T - 8, h: T * 0.55 });
      else if (ch === 'h') items.push({ x: x + 10, y: y + 10, w: 28, h: 28, type: 'h', got: false });
      else if (ITEMS[ch]) items.push({ x: x + 10, y: y + 10, w: 28, h: 28, type: ch, got: false });
    }
    // Enemies, hot pots, the checkpoint flag and the stall stand on the ground below the cell they were drawn in.
    const groundBelow = (x, y) => { const c = Math.floor(x / T); for (let r = Math.max(0, Math.floor(y / T)); r < rows; r++) if (solids.has(r * 1000 + c)) return r; return -1; };
    for (const o of enemies.concat(hazards, finish ? [finish] : [], checkpoint ? [checkpoint] : [])) { const g = groundBelow(o.x + o.w / 2, o.y); if (g > 0) o.y = g * T - o.h; }
    bowlsNeeded = def.bowls;
  }
  const solidAt = (c, r) => (r >= rows ? false : solids.has(r * 1000 + c));
  function overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function resetPlayer(at) {
    player = { x: at.x, y: at.y, w: 34, h: 56, vx: 0, vy: 0, face: 1, ground: false, anim: 0 };
    invT = 1.2;
  }
  function startLevel(i) {
    if (!(lives > 0)) { lives = 3; score = 0; }   // a level started outside a run (debug) begins a fresh game
    lvl = i;
    parse(LEVELS[i]);
    resetPlayer(spawn);
    invT = 0;
    bowls = 0; bowl = new Set(); camX = 0; time = 0; runTime = 0; levelDone = false; over = false; paused = false; finishHintT = 0;
    levelStartScore = score;
    banner = 'Level ' + (i + 1) + ' · ' + LEVELS[i].name + ' · siapkan ' + bowlsNeeded + ' mangkuk laksa'; bannerT = 3;
    $('pf-overlay').hidden = true;
    hud();
  }
  function startRun() { score = 0; lives = 3; startLevel(0); }
  function hud() {
    $('pf-level').textContent = 'LAKSA QUEST · LEVEL ' + (lvl + 1) + ' / ' + LEVELS.length + ' · ' + LEVELS[lvl].name.toUpperCase();
    $('pf-score').textContent = score.toLocaleString();
    $('pf-lives').textContent = '♥'.repeat(Math.max(0, lives)) + '♡'.repeat(Math.max(0, 3 - Math.max(0, lives)));
    const slots = $('pf-bowl');
    slots.replaceChildren();
    for (const t of TYPES) { const s = document.createElement('span'); s.className = 'pf-slot' + (bowl.has(t) ? ' lit' : ''); s.textContent = ITEMS[t][0]; s.title = ITEMS[t][1]; slots.append(s); }
    $('pf-bowls').textContent = '🍜 Mangkuk ' + bowls + ' / ' + bowlsNeeded;
  }
  function say(text, secs) { banner = text; bannerT = secs || 2; }
  function spark(x, y, color, n) { for (let i = 0; i < (n || 8); i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 260, t: 0.5 + Math.random() * 0.3, color }); }
  function hurt() {
    if (invT > 0 || levelDone || over) return;
    lives -= 1;
    window.GebokRun.sfx.crash();
    spark(player.x + 17, player.y + 28, '#ff5a5a', 14);
    if (lives <= 0) { over = true; hud(); showOverlay('ALAMAK!', 'Kehabisan nyawa di Level ' + (lvl + 1) + '. Cuba lagi dari Level 1.', 'crashed'); return; }
    resetPlayer(checkpoint && checkpoint.hit ? { x: checkpoint.x + 6, y: checkpoint.y + checkpoint.h - 56 } : spawn);
    say('♥ ' + lives + ' lagi', 1.5);
    hud();
  }
  function collect(it) {
    it.got = true;
    if (it.type === 'h') { lives = Math.min(3, lives + 1); score += SC.life; say('♥ Nyawa tambahan!', 1.5); spark(it.x + 14, it.y + 14, '#ff6b8a'); window.GebokRun.sfx.power(); hud(); return; }
    if (bowl.has(it.type)) { score += SC.dup; spark(it.x + 14, it.y + 14, '#ffe08a', 5); window.GebokRun.sfx.collect(1); hud(); return; }
    bowl.add(it.type); score += SC.item;
    spark(it.x + 14, it.y + 14, '#ffd45a');
    window.GebokRun.sfx.collect(bowl.size);
    if (bowl.size === TYPES.length) {
      bowls += 1; score += SC.bowl; bowl = new Set();
      say('🍜 Semangkuk laksa siap! +' + SC.bowl + (bowls >= bowlsNeeded ? ' · pergi ke gerai!' : ''), 2.5);
      window.GebokRun.sfx.gebuk();
    } else say(ITEMS[it.type][1] + ' ' + bowl.size + '/5', 1.2);
    hud();
  }
  function showOverlay(title, text, result) {
    const stats = $('pf-stats');
    stats.replaceChildren();
    for (const [label, val] of [['Skor', score.toLocaleString()], ['Mangkuk', bowls + ' / ' + bowlsNeeded], ['Nyawa', '♥'.repeat(lives) + '♡'.repeat(Math.max(0, 3 - lives))], ['Masa', Math.floor(runTime) + ' s']]) {
      const d = document.createElement('div'); const dt = document.createElement('dt'); dt.textContent = label; const dd = document.createElement('dd'); dd.textContent = val; d.append(dt, dd); stats.append(d);
    }
    $('pf-title').textContent = title;
    $('pf-text').textContent = text;
    const p = $('pf-primary'), s = $('pf-secondary');
    if (result === 'won' && lvl + 1 < LEVELS.length) { p.textContent = 'LEVEL ' + (lvl + 2); p.onclick = () => startLevel(lvl + 1); }
    else if (result === 'won') { p.textContent = 'MAIN SEMULA'; p.onclick = startRun; }
    else { p.textContent = 'CUBA LAGI'; p.onclick = startRun; }
    s.textContent = 'PERMAINAN'; s.onclick = close;
    $('pf-overlay').hidden = false;
    GebokStore.recordGame('platform', { at: new Date().toISOString(), level: lvl + 1, result, score, levelScore: score - levelStartScore, bowls, bowlsNeeded, lives, time: +runTime.toFixed(1) })
      .catch(() => { /* kept on this device only */ });
    window.LaksaArcade.renderBests();
  }
  function completeLevel() {
    levelDone = true;
    score += SC.level + lives * SC.life;
    hud();
    window.GebokRun.sfx.fanfare();
    const last = lvl + 1 >= LEVELS.length;
    showOverlay(last ? 'TAHNIAH!' : 'LEVEL SELESAI!', (last ? 'Semua level Laksa Quest selesai. ' : '') + bowls + ' mangkuk laksa dihidang. +' + SC.level + ' level, +' + (lives * SC.life) + ' nyawa tinggal.', 'won');
  }
  function update(dt) {
    if (paused || levelDone || over) return;
    time += dt; runTime += dt;
    if (bannerT > 0) bannerT -= dt;
    if (finishHintT > 0) finishHintT -= dt;
    if (invT > 0) invT -= dt;
    const p = player;
    // run
    const ax = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    p.vx = ax * RUN;
    if (ax) p.face = ax;
    // jump with coyote time and a small buffer
    coyote = p.ground ? 0.09 : Math.max(0, coyote - dt);
    jumpBuf = keys.jump && !held.jump ? 0.12 : Math.max(0, jumpBuf - dt);
    if (jumpBuf > 0 && coyote > 0) { p.vy = JUMP; p.ground = false; coyote = 0; jumpBuf = 0; window.GebokRun.sfx.jump(); }
    if (!keys.jump && p.vy < -250) p.vy = -250;          // let go early for a shorter hop
    held.jump = keys.jump;
    p.vy = Math.min(MAXFALL, p.vy + GRAV * dt);
    // horizontal move + collide
    p.x += p.vx * dt;
    if (p.x < 0) p.x = 0;
    if (p.x > cols * T - p.w) p.x = cols * T - p.w;      // the map ends with a wall, not a drop
    for (const [r, c] of tilesAround(p)) if (solidAt(c, r) && overlaps(p, { x: c * T, y: r * T, w: T, h: T })) {
      if (p.vx > 0) p.x = c * T - p.w; else if (p.vx < 0) p.x = c * T + T;
    }
    // vertical move + collide
    p.y += p.vy * dt;
    p.ground = false;
    for (const [r, c] of tilesAround(p)) if (solidAt(c, r) && overlaps(p, { x: c * T, y: r * T, w: T, h: T })) {
      if (p.vy > 0) { p.y = r * T - p.h; p.vy = 0; p.ground = true; }
      else if (p.vy < 0) { p.y = r * T + T; p.vy = 0; }
    }
    if (p.y > rows * T + 60) { hurt(); return; }
    p.anim += dt * (p.ground && ax ? 12 : 0);
    // enemies
    for (const e of enemies) {
      if (!e.alive) continue;
      e.x += e.vx * dt;
      const fr = Math.floor((e.y + e.h + 2) / T), fc = Math.floor((e.vx > 0 ? e.x + e.w + 2 : e.x - 2) / T), hc = Math.floor((e.vx > 0 ? e.x + e.w + 2 : e.x - 2) / T), hr = Math.floor((e.y + e.h - 4) / T);
      if (!solidAt(fc, fr) || solidAt(hc, hr) || e.x < 0) { e.vx = -e.vx; e.dir = -e.dir; }
      if (overlaps(p, e)) {
        if (p.vy > 60 && p.y + p.h - e.y < 22) { e.alive = false; p.vy = -450; score += SC.stomp; spark(e.x + 20, e.y + 10, '#f4f4f4', 10); window.GebokRun.sfx.smash(); say('Ayam lari! +' + SC.stomp, 1); hud(); }
        else hurt();
      }
    }
    for (const h of hazards) if (overlaps(p, h)) { hurt(); break; }
    const reach = { x: p.x - REACH, y: p.y - REACH, w: p.w + REACH * 2, h: p.h + REACH * 2 };
    for (const it of items) if (!it.got && overlaps(reach, it)) collect(it);
    if (checkpoint && !checkpoint.hit && overlaps(p, checkpoint)) { checkpoint.hit = true; say('🚩 Titik semak!', 1.5); window.GebokRun.sfx.swipe(); }
    if (finish && overlaps(p, finish)) {
      if (bowls >= bowlsNeeded) completeLevel();
      else if (finishHintT <= 0) { finishHintT = 2.5; say('Gerai perlukan ' + (bowlsNeeded - bowls) + ' mangkuk lagi!', 2); }
    }
    for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 600 * dt; if (q.t <= 0) parts.splice(i, 1); }
    camX += ((p.x + p.w / 2 - W * 0.4) - camX) * Math.min(1, dt * 6);
    camX = Math.max(0, Math.min(cols * T - W, camX));
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
    g.setTransform(1, 0, 0, 1, 0, 0);
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#5fb5ef'); sky.addColorStop(0.65, '#bfe6f8'); sky.addColorStop(1, '#f8d79a');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    // hills (parallax)
    g.fillStyle = '#7fb59c';
    for (let i = 0; i < 8; i++) { const x = ((i * 300 - camX * 0.2) % (W + 600) + W + 600) % (W + 600) - 300; g.beginPath(); g.ellipse(x, 400, 220, 120, 0, Math.PI, 0); g.fill(); }
    g.fillStyle = '#5f9a7a';
    for (let i = 0; i < 10; i++) { const x = ((i * 240 - camX * 0.35) % (W + 480) + W + 480) % (W + 480) - 240; g.beginPath(); g.ellipse(x, 440, 170, 90, 0, Math.PI, 0); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.9)';
    for (const c of clouds) { const x = ((c.x - camX * 0.1 + time * 8) % (W + 300) + W + 300) % (W + 300) - 150; g.beginPath(); g.ellipse(x, c.y, c.w / 2, 18, 0, 0, Math.PI * 2); g.ellipse(x - c.w * 0.25, c.y + 6, c.w / 3, 14, 0, 0, Math.PI * 2); g.ellipse(x + c.w * 0.25, c.y + 6, c.w / 3, 14, 0, 0, Math.PI * 2); g.fill(); }
    g.save();
    g.translate(-Math.round(camX), 0);
    const c0 = Math.max(0, Math.floor(camX / T) - 1), c1 = Math.min(cols - 1, Math.ceil((camX + W) / T) + 1);
    for (let r = 0; r < rows; r++) for (let c = c0; c <= c1; c++) {
      const ch = map[r][c] || '.';
      const x = c * T, y = r * T;
      if (ch === '#') {
        g.fillStyle = '#8a5a2b'; g.fillRect(x, y, T, T);
        g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x + 4, y + 4, T - 8, T - 8);
        if (r === 0 || (map[r - 1][c] || '.') !== '#') { g.fillStyle = '#6fa84f'; g.fillRect(x, y, T, 12); g.fillStyle = '#4ea845'; for (let k = 0; k < 4; k++) g.fillRect(x + k * 12 + 3, y - 4, 4, 8); }
      } else if (ch === '=') {
        g.fillStyle = '#c08a4a'; g.fillRect(x, y, T, T * 0.55); g.fillStyle = '#8a5a2b'; g.fillRect(x, y, T, 5); g.fillRect(x, y + T * 0.55 - 5, T, 5); g.fillStyle = '#5a3a1c'; g.fillRect(x + 6, y + 8, 3, 3); g.fillRect(x + T - 9, y + 8, 3, 3);
      }
    }
    g.fillStyle = '#2a2a2a';
    for (const hz of hazards) { g.fillStyle = '#2a2a2a'; g.beginPath(); g.ellipse(hz.x + hz.w / 2, hz.y + hz.h * 0.6, hz.w / 2, hz.h * 0.42, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ff6a3d'; g.beginPath(); g.ellipse(hz.x + hz.w / 2, hz.y + hz.h * 0.35, hz.w / 2 - 4, 6, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(hz.x + hz.w / 2 + Math.sin(time * 3 + hz.x) * 6, hz.y - 10 - (time * 20 % 14), 7, 10, 0, 0, Math.PI * 2); g.fill(); }
    if (checkpoint) { g.fillStyle = '#8a5a2b'; g.fillRect(checkpoint.x + 6, checkpoint.y, 5, checkpoint.h); g.fillStyle = checkpoint.hit ? '#3f8f3d' : '#d62828'; g.beginPath(); g.moveTo(checkpoint.x + 11, checkpoint.y); g.lineTo(checkpoint.x + 40, checkpoint.y + 10); g.lineTo(checkpoint.x + 11, checkpoint.y + 20); g.fill(); }
    if (finish) {
      const f = finish;
      g.fillStyle = '#6b4a2e'; g.fillRect(f.x + 8, f.y + 30, 6, f.h - 30); g.fillRect(f.x + f.w - 14, f.y + 30, 6, f.h - 30);
      g.fillStyle = '#a8763d'; g.fillRect(f.x + 4, f.y + f.h - 38, f.w - 8, 20);
      g.fillStyle = '#f0742e'; g.beginPath(); g.moveTo(f.x - 6, f.y + 34); g.lineTo(f.x + f.w / 2, f.y + 2); g.lineTo(f.x + f.w + 6, f.y + 34); g.closePath(); g.fill();
      g.fillStyle = '#fff'; g.font = 'bold 13px Nunito, Arial, sans-serif'; g.textAlign = 'center'; g.fillText('GERAI LAKSA', f.x + f.w / 2, f.y + 50);
      g.font = '26px serif'; g.fillText('🍜', f.x + f.w / 2, f.y + f.h - 44);
    }
    g.font = '26px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const it of items) if (!it.got) g.fillText(it.type === 'h' ? '❤️' : ITEMS[it.type][0], it.x + 14, it.y + 14 + Math.sin(time * 4 + it.x) * 3);
    g.font = '34px serif';
    for (const e of enemies) if (e.alive) { g.save(); g.translate(e.x + 20, e.y + 18); g.scale(e.dir < 0 ? 1 : -1, 1); g.fillText('🐔', 0, 2); g.restore(); }
    for (const q of parts) { g.fillStyle = q.color; g.globalAlpha = Math.max(0, q.t * 1.6); g.fillRect(q.x, q.y, 5, 5); }
    g.globalAlpha = 1;
    drawPlayer(g);
    g.restore();
  }
  function drawPlayer(g) {
    const p = player;
    if (invT > 0 && Math.floor(invT * 12) % 2) return;
    g.save();
    g.translate(p.x + p.w / 2, p.y);
    g.scale(p.face, 1);
    const stride = Math.sin(p.anim) * (p.ground ? 1 : 0.3);
    g.fillStyle = '#25306e'; g.fillRect(-20, 16, 12, 26);                       // backpack
    g.fillStyle = '#4a3220'; g.fillRect(-9, 36, 8, 14 + stride * 4); g.fillRect(2, 36, 8, 14 - stride * 4);   // legs
    g.fillStyle = '#f5f5f5'; g.fillRect(-10, 50 + stride * 4, 10, 6); g.fillRect(1, 50 - stride * 4, 11, 6);  // shoes
    g.fillStyle = '#6e4b2c'; g.fillRect(-11, 14, 22, 24);                        // jacket
    g.fillStyle = '#79b23a'; g.beginPath(); g.arc(4, 24, 3, 0, Math.PI * 2); g.fill();  // emblem
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
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = true;
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = true;
      else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ') keys.jump = true;
      else if (k === 'p' || k === 'P' || k === 'Escape') { paused = !paused; say(paused ? 'REHAT · tekan P' : 'Sambung!', paused ? 999 : 1); if (!paused) bannerT = 1; }
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
    $('pf-pause').addEventListener('click', () => { paused = !paused; say(paused ? 'REHAT' : 'Sambung!', paused ? 999 : 1); });
    $('pf-exit').addEventListener('click', close);
  }
  window.LaksaQuest = { open: openGame, close, wire, LEVELS, debug: () => ({ lvl, lives, score, bowls, bowl: Array.from(bowl), player: player && { x: Math.round(player.x), y: Math.round(player.y), ground: player.ground }, items: items.filter((i) => !i.got).length, enemies: enemies.filter((e) => e.alive).length, levelDone, over, banner, bannerT: +bannerT.toFixed(2), invT: +invT.toFixed(2), paused }), live: () => ({ player, items, enemies, hazards, finish, checkpoint, setLives: (n) => { lives = n; hud(); } }), keys, startLevel, update, draw };
})();
