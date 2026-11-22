/* ======================================================================
   LAKSA GEBOK RUN — game.js
   three.js r128 (global build). Every model is procedural: no asset files.
   Gameplay numbers live in config.js (window.GebokConfig), player records in
   store.js, the admin view in admin.js.

   Sections: track geometry · DOM · renderer and world · environments ·
   geometry kit and models · obstacle catalogue · state · spawning ·
   effects, audio and menu music · actions · game flow and screens · update loop ·
   input · debug hook.
   ====================================================================== */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  if (typeof THREE === 'undefined') {
    $('register').hidden = true;
    $('nolib').hidden = false;
    return;
  }
  const CFG = window.GebokConfig;
  const LEVELS = CFG.levels, FREE = LEVELS.length, SC = CFG.scores, PW = CFG.powerups;

  /* ------------------------------------------------------ track geometry */
  const LANE_W = 2.2;
  const LANE_X = [-LANE_W, 0, LANE_W];
  const ROAD_W = LANE_W * 3 + 0.6;
  const ROAD_LEN = 180;
  const TILE = 6;                  // texture tile length in world units
  const SPAWN_AHEAD = 135;         // track units ahead of the runner
  const KILL_BEHIND = 18;          // track units behind the runner
  const GRAVITY = 27;
  const JUMP_V = 9.4;
  const SLAM_V = -15;
  const ROLL_TIME = 0.8;
  const LATERAL_SPEED = 13;
  const PLAYER_H = 1.9;
  const ROLL_H = 0.95;
  const PLAYER_HALF_W = 0.45;
  const PLAYER_HALF_D = 0.35;
  const LAKSA_STEP = 1.7;
  const MAGNET_RADIUS = 9;
  const SIDE = ROAD_W / 2 + 1.0;   // where the roadside begins
  const RIVER_X = SIDE + 6.5;
  const RIVER_W = 30;
  const BEST_KEY = 'gebokrun.best';
  const MUTE_KEY = 'gebokrun.muted';
  const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  /* ------------------------------------------------------------------ DOM */
  const ids = ['hud', 'score', 'dist', 'level-label', 'missions', 'm-gebuk', 'm-gebuk-n', 'm-laksa', 'm-laksa-n', 'achievements', 'c-ach', 'i-laksa-target', 'f-ach',
    'power-magnet', 'power-magnet-fill', 'power-shield', 'power-boost', 'power-boost-fill', 'pause-btn', 'banner', 'countdown', 'hint', 'hitflash', 'mute',
    'register', 'register-form', 'username', 'email', 'email-field', 'register-note', 'register-error', 'register-btn', 'register-btn-text', 'register-lb', 'store-status', 'admin-link',
    'login-popup', 'login-popup-card', 'login-popup-title', 'login-popup-text', 'login-popup-bar', 'login-popup-fill', 'login-popup-ok',
    'hub', 'hub-player', 'hub-switch', 'hub-howto', 'hub-story', 'hub-lb', 'hub-games', 'reset', 'admin-link-hub', 'games', 'games-sound', 'platform', 'crossword', 'wordsearch', 'lb-tabs',
    'howto', 'howto-back', 'best-start', 'story', 'story-cards', 'story-note', 'story-back',
    'leaderboard', 'lb-list', 'lb-status', 'lb-me', 'lb-back', 'lb-refresh',
    'pause', 'resume', 'restart', 'pause-menu', 'pause-sound',
    'complete', 'complete-title', 'complete-badge', 'complete-level', 'c-laksa', 'c-gebuk', 'c-lives', 'c-score',
    'b-laksa', 'b-gebuk', 'b-mission', 'b-level', 'b-flawless', 'b-total', 'complete-rank', 'next', 'complete-menu', 'complete-lb',
    'incomplete', 'i-gebuk', 'i-need', 'i-laksa', 'i-score', 'i-lives', 'retry-inc', 'inc-menu',
    'over', 'new-best', 'final-score', 'final-laksa', 'final-gebuk', 'final-dist', 'final-mission', 'final-rank', 'again', 'over-menu', 'over-lb',
    'final', 'f-score', 'f-laksa', 'f-gebuk', 'final-replay', 'final-story', 'final-lb',
    'timer', 'b-time', 'hub-start', 'c-timeleft', 'c-total', 'i-level', 'f-time', 'f-lives',
    'hub-achv', 'hub-settings', 'hub-sound', 'hub-note', 'settings', 'settings-sound', 'settings-switch', 'settings-back', 'achv', 'achv-list', 'achv-back',
    'intro', 'intro-tabs', 'intro-body', 'intro-back', 'intro-dots', 'intro-pager', 'intro-next', 'intro-next-text'];
  const ui = {};
  for (const id of ids) {
    ui[id.replace(/-([a-z])/g, (m, c) => c.toUpperCase())] = $(id);
    if (!$(id)) console.warn('missing element #' + id);
  }
  ui.hearts = Array.from(document.querySelectorAll('#hearts .heart'));
  ui.cards = Array.from(document.querySelectorAll('.level-card'));
  const SCREENS = ['register', 'games', 'platform', 'crossword', 'wordsearch', 'hub', 'howto', 'story', 'leaderboard', 'pause', 'complete', 'incomplete', 'over', 'final', 'settings', 'achv'];
  let backTo = 'hub';                     // where KEMBALI goes from the shared screens: the runner hub or the games hub
  let renderPaused = false;               // the 3D loop idles while another mini-game owns the screen

  function loadNum(key) {
    try { const v = parseInt(localStorage.getItem(key), 10); return isNaN(v) ? 0 : v; } catch (e) { return 0; }
  }
  function saveVal(key, v) {
    try { localStorage.setItem(key, String(v)); } catch (e) { /* storage unavailable: play on */ }
  }
  let best = loadNum(BEST_KEY);
  ui.bestStart.textContent = best;

  /* ------------------------------------------------- renderer and world */
  const canvas = $('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fd9f6);
  scene.fog = new THREE.Fog(0x9fd9f6, 40, 170);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.5, 500);
  let baseFov = 60;

  const hemi = new THREE.HemisphereLight(0xe3f4ff, 0x5f8a3f, 0.8);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d0, 1.0);
  sun.position.set(-20, 30, -8);
  sun.target.position.set(0, 0, -18);
  sun.castShadow = true;
  const shadowRes = coarse ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowRes, shadowRes);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 110;
  sun.shadow.camera.left = -28;
  sun.shadow.camera.right = 28;
  sun.shadow.camera.top = 45;
  sun.shadow.camera.bottom = -45;
  sun.shadow.bias = -0.0006;
  scene.add(sun, sun.target);

  /* ---------------------------------------------------------- textures */
  function canvasTexture(w, h, draw, repeatX, repeatY) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }
  function laneGuides(x, w, h, color, alpha) {
    x.fillStyle = color; x.globalAlpha = alpha;
    x.fillRect(86, 20, 6, 110); x.fillRect(164, 20, 6, 110);
    x.globalAlpha = 1;
  }
  const TEX = {
    asphalt: canvasTexture(256, 256, (x, w, h) => {
      x.fillStyle = '#50545c'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 1400; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)'; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      x.fillStyle = '#eceae2'; x.fillRect(5, 0, 5, h); x.fillRect(w - 10, 0, 5, h);
      laneGuides(x, w, h, '#f3e7b4', 1);
    }, 1, ROAD_LEN / TILE),
    grass: canvasTexture(128, 128, (x, w, h) => {
      x.fillStyle = '#6fa84f'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 700; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(40,110,40,0.35)' : 'rgba(190,230,120,0.25)'; x.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    }, 120 / TILE, ROAD_LEN / TILE),
    water: canvasTexture(128, 128, (x, w, h) => {
      x.fillStyle = '#3f8fc9'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.08 + Math.random() * 0.15) + ')'; x.fillRect(Math.random() * w, Math.random() * h, 10 + Math.random() * 30, 2); }
    }, RIVER_W / TILE, ROAD_LEN / TILE),
    planks: canvasTexture(256, 256, (x, w, h) => {
      for (let i = 0; i < 8; i++) {
        const shade = 150 + Math.floor(Math.random() * 40);
        x.fillStyle = 'rgb(' + shade + ',' + Math.floor(shade * 0.62) + ',' + Math.floor(shade * 0.36) + ')';
        x.fillRect(0, i * 32, w, 32);
        x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, i * 32, w, 2);
        for (let k = 0; k < 6; k++) { x.fillStyle = 'rgba(0,0,0,0.08)'; x.fillRect(Math.random() * w, i * 32 + 4 + Math.random() * 24, 30 + Math.random() * 60, 1); }
        x.fillStyle = '#3a2a1c'; x.fillRect(12, i * 32 + 14, 3, 3); x.fillRect(w - 16, i * 32 + 14, 3, 3);
      }
      x.fillStyle = '#f3e7b4'; x.globalAlpha = 0.7; x.fillRect(4, 0, 5, h); x.fillRect(w - 9, 0, 5, h); x.globalAlpha = 1;
      laneGuides(x, w, h, '#fff3c4', 0.75);
    }, 1, ROAD_LEN / TILE),
    planksDark: canvasTexture(128, 128, (x, w, h) => {
      for (let i = 0; i < 4; i++) {
        x.fillStyle = 'rgb(' + (70 + i * 6) + ',' + (46 + i * 3) + ',' + (28 + i * 2) + ')';
        x.fillRect(0, i * 32, w, 32);
        x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(0, i * 32, w, 2);
      }
    }, 120 / TILE, ROAD_LEN / TILE),
    cobble: canvasTexture(256, 256, (x, w, h) => {
      x.fillStyle = '#6b6560'; x.fillRect(0, 0, w, h);
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const g = 120 + Math.floor(Math.random() * 50);
        x.fillStyle = 'rgb(' + g + ',' + (g - 6) + ',' + (g - 14) + ')';
        const ox = (r % 2) * 16;
        x.beginPath(); x.ellipse(c * 32 + 16 + ox, r * 32 + 16, 14, 13, 0, 0, Math.PI * 2); x.fill();
      }
      laneGuides(x, w, h, '#f3e7b4', 0.45);
    }, 1, ROAD_LEN / TILE),
    paving: canvasTexture(128, 128, (x, w, h) => {
      x.fillStyle = '#b8a37e'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 500; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(90,70,40,0.25)' : 'rgba(255,240,200,0.25)'; x.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    }, 120 / TILE, ROAD_LEN / TILE),
  };
  function textTexture(lines, bg, fg, w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, w, h);
    x.strokeStyle = fg; x.lineWidth = 8; x.strokeRect(12, 12, w - 24, h - 24);
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
    const lh = h / (lines.length + 0.5);
    lines.forEach((ln, i) => {
      x.font = 'bold ' + Math.min(lh * 0.8, w / (ln.length * 0.62)) + 'px Arial, Helvetica, sans-serif';
      x.fillText(ln, w / 2, lh * (i + 0.75));
    });
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }
  const SIGN_TEXTS = [
    ['SELAMAT DATANG', 'KE PAHANG'], ['KUANTAN', '15 km'], ['TEMERLOH', '42 km'],
    ['PEKAN', '60 km'], ['HATI-HATI', 'DI JALAN RAYA'], ['CAMERON HIGHLANDS', '180 km'],
    ['JERANTUT', '95 km'], ['TELUK CEMPEDAK', '5 km'],
  ];
  const signMats = SIGN_TEXTS.map((t) => new THREE.MeshLambertMaterial({ map: textTexture(t, '#1a5f33', '#ffffff', 512, 168) }));
  const bannerMats = [['JEJAK WARISAN'], ['PESTA LAKSA GEBOK'], ['WARISAN PAHANG'], ['LAKSA GEBOK', 'ASLI PAHANG']]
    .map((t) => new THREE.MeshLambertMaterial({ map: textTexture(t, '#8a1f1f', '#ffe08a', 512, 168), side: THREE.DoubleSide }));
  const stallSignMat = new THREE.MeshLambertMaterial({ map: textTexture(['GERAI LAKSA', 'PAHANG'], '#f6e7b4', '#8a1f1f', 512, 160) });
  const marketSignMat = new THREE.MeshLambertMaterial({ map: textTexture(['GERAI', 'WARISAN'], '#f6e7b4', '#1a5f33', 512, 160) });
  const signGeo = new THREE.PlaneGeometry(2.2, 0.72);
  const stallSignGeo = new THREE.PlaneGeometry(1.8, 0.56);
  const bannerGeo = new THREE.PlaneGeometry(2.2, 0.7);

  /* ------------------------------------------------------------ ground */
  const zCenter = -ROAD_LEN / 2 + 25;
  function plane(w, l, tex, color, x, y) {
    const mat = tex ? new THREE.MeshLambertMaterial({ map: tex }) : new THREE.MeshLambertMaterial({ color });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, zCenter);
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }
  const sidePlane = plane(120, ROAD_LEN, TEX.grass, 0, 0, -0.06);
  const roadPlane = plane(ROAD_W, ROAD_LEN, TEX.asphalt, 0, 0, 0);
  const sandPlane = plane(1.4, ROAD_LEN, null, 0xd9c79a, RIVER_X - 0.7, -0.015);
  const waterPlane = plane(RIVER_W, ROAD_LEN, TEX.water, 0, RIVER_X + RIVER_W / 2, -0.03);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W + 4.6, ROAD_LEN), new THREE.MeshLambertMaterial({ color: 0x4a3222 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 5.8, zCenter);
  ceiling.visible = false;
  scene.add(ceiling);
  let curRoad = TEX.asphalt, curSide = TEX.grass;

  // Gradient sky dome: top colour to horizon colour, per environment (and a sunset for the menu).
  const skyDome = (() => {
    const g = new THREE.SphereGeometry(400, 24, 12);
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    m.renderOrder = -1;
    scene.add(m);
    return m;
  })();
  function setSky(top, horizon, bottom) {
    const pos = skyDome.geometry.attributes.position, col = skyDome.geometry.attributes.color;
    const t = new THREE.Color(top), h = new THREE.Color(horizon), b = new THREE.Color(bottom == null ? horizon : bottom), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 400;
      if (y >= 0) c.copy(h).lerp(t, Math.min(1, Math.pow(y, 0.55))); else c.copy(h).lerp(b, Math.min(1, -y * 2));
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
  }
  // Sky dressing: sun, hazy Titiwangsa range, drifting clouds.
  const skyGroup = new THREE.Group();
  scene.add(skyGroup);
  const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff3b0, fog: false }));
  sunMesh.position.set(-55, 48, -180);
  skyGroup.add(sunMesh);
  const mtnMat = new THREE.MeshLambertMaterial({ color: 0x5f8f86 });
  [[-110, 34, 50], [-70, 38, 55], [-25, 30, 40], [20, 42, 60], [65, 32, 45], [100, 36, 50]].forEach(([x, h, r]) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), mtnMat);
    m.position.set(x, h / 2 - 2, -130);
    skyGroup.add(m);
  });
  const clouds = [];

  /* ------------------------------------------------------ geometry kit */
  const MAT = {
    vc: new THREE.MeshLambertMaterial({ vertexColors: true }),
    shiny: new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 70, specular: 0x666666 }),
  };
  const G = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 14),
    cyl6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
    wheel: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
    pyr: new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4),
    cone: new THREE.ConeGeometry(0.5, 1, 12),
    sphere: new THREE.SphereGeometry(0.5, 12, 9),
    bowl: new THREE.CylinderGeometry(0.5, 0.3, 0.3, 22),
    rim: new THREE.TorusGeometry(0.5, 0.03, 6, 26),
    noodle: new THREE.TorusGeometry(0.21, 0.085, 8, 20),
  };
  const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3();
  function part(geo, color, x, y, z, sx, sy, sz, rx, ry, rz) {
    _p.set(x || 0, y || 0, z || 0);
    _e.set(rx || 0, ry || 0, rz || 0);
    _q.setFromEuler(_e);
    _s.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
    return { geo, color, matrix: new THREE.Matrix4().compose(_p, _q, _s) };
  }
  const box = (c, x, y, z, w, h, d, rx, ry, rz) => part(G.box, c, x, y, z, w, h, d, rx, ry, rz);
  const ball = (c, x, y, z, r, ry) => part(G.sphere, c, x, y, z, r * 2, (ry == null ? r : ry) * 2, r * 2);
  const tube = (c, x, y, z, r, h, rx, ry, rz) => part(G.cyl, c, x, y, z, r * 2, h, r * 2, rx, ry, rz);
  function merge(parts) {
    const pieces = parts.map((p) => {
      let g = p.geo.clone();
      if (g.index) g = g.toNonIndexed();
      g.applyMatrix4(p.matrix);
      return { g, color: new THREE.Color(p.color) };
    });
    const total = pieces.reduce((n, p) => n + p.g.attributes.position.count, 0);
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3);
    let off = 0;
    for (const { g, color } of pieces) {
      const n = g.attributes.position.count;
      pos.set(g.attributes.position.array, off * 3);
      nor.set(g.attributes.normal.array, off * 3);
      for (let i = 0; i < n; i++) { const k = (off + i) * 3; col[k] = color.r; col[k + 1] = color.g; col[k + 2] = color.b; }
      off += n;
      g.dispose();
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return out;
  }
  function solid(geo, mat) { const m = new THREE.Mesh(geo, mat || MAT.vc); m.castShadow = true; return m; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  const cloudGeo = merge([ball(0xffffff, 0, 0, 0, 4, 2.4), ball(0xffffff, 3.6, -0.4, 0.5, 3, 1.8), ball(0xffffff, -3.8, -0.5, -0.3, 3.2, 1.9)]);
  const cloudMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(cloudGeo, cloudMat);
    m.position.set(-120 + i * 40 + Math.random() * 20, 30 + Math.random() * 10, -120 - Math.random() * 30);
    m.scale.setScalar(0.8 + Math.random() * 0.8);
    skyGroup.add(m);
    clouds.push(m);
  }

  /* -------------------------------------------------------- the models */
  const laksaGeo = merge([
    part(G.bowl, 0xfbf7ef, 0, 0.15, 0),
    tube(0x2e63b8, 0, 0.2, 0, 0.45, 0.05),
    part(G.rim, 0x2e63b8, 0, 0.3, 0, 1, 1, 1, Math.PI / 2),
    tube(0xc8b394, 0, 0.31, 0, 0.45, 0.035),
    part(G.noodle, 0xf6e8c3, 0, 0.345, 0, 1, 1, 1, Math.PI / 2),
    ball(0xd63a2f, 0.15, 0.4, 0.07, 0.075), ball(0x3f8f3d, -0.15, 0.39, 0.05, 0.07),
    ball(0xe9d34f, 0.0, 0.385, -0.17, 0.075, 0.035), ball(0xd0609c, 0.04, 0.4, 0.17, 0.06), ball(0xf4f0e6, -0.05, 0.39, -0.03, 0.05),
  ]);
  const ringGeo = new THREE.TorusGeometry(0.5, 0.05, 6, 24);
  const BRASS = 0xb8963f, BRASS_D = 0x8c7336;
  const gebukGeo = merge([
    tube(BRASS, 0, 0.4, 0, 0.32, 0.8), tube(BRASS_D, 0, 0.82, 0, 0.345, 0.05), tube(BRASS, 0, 0.95, 0, 0.39, 0.24), tube(BRASS_D, 0, 1.08, 0, 0.3, 0.04),
    box(BRASS, 0.34, 1.24, 0, 0.08, 0.5, 0.16), box(BRASS, -0.34, 1.24, 0, 0.08, 0.5, 0.16), box(BRASS, 0, 1.24, 0.34, 0.16, 0.5, 0.08), box(BRASS, 0, 1.24, -0.34, 0.16, 0.5, 0.08),
    tube(BRASS_D, 0, 1.15, 0, 0.2, 0.3), tube(BRASS, 0, 1.36, 0, 0.12, 0.12), tube(BRASS_D, 0, 1.46, 0, 0.14, 0.06), tube(BRASS, 0, 1.54, 0, 0.12, 0.1), tube(BRASS_D, 0, 1.62, 0, 0.14, 0.06),
    part(ringGeo, BRASS, 0, 1.86, 0, 0.5, 0.5, 0.5), box(BRASS_D, 0.2, 0.55, 0.33, 0.1, 0.3, 0.04),
  ]);
  const beamGeo = new THREE.CylinderGeometry(0.45, 0.45, 7, 12, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffd45a, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.8 });
  function makeGebuk() {
    const g = new THREE.Group();
    const body = solid(gebukGeo, MAT.shiny); body.scale.setScalar(0.85); g.add(body);
    const beam = new THREE.Mesh(beamGeo, beamMat); beam.position.y = 3.2; g.add(beam);
    const halo = new THREE.Mesh(ringGeo, haloMat); halo.scale.setScalar(1.3); halo.rotation.x = Math.PI / 2; halo.position.y = 0.1; g.add(halo);
    return g;
  }
  // Power-up pickups: a red magnet, a woven tudung saji (food cover) and a cili api.
  const POWER_GEO = {
    magnet: merge([
      box(0xd62828, -0.22, -0.05, 0, 0.16, 0.5, 0.16), box(0xd62828, 0.22, -0.05, 0, 0.16, 0.5, 0.16), box(0xd62828, 0, 0.26, 0, 0.6, 0.18, 0.16),
      box(0xf4f4f4, -0.22, -0.36, 0, 0.16, 0.12, 0.16), box(0xf4f4f4, 0.22, -0.36, 0, 0.16, 0.12, 0.16),
      part(ringGeo, 0xffe08a, 0, 0, 0, 1.5, 1.5, 1.5),
    ]),
    shield: merge([
      part(G.cone, 0xd9a35a, 0, 0.05, 0, 1.0, 0.7, 1.0), part(ringGeo, 0x8a5a2b, 0, -0.2, 0, 0.9, 0.9, 0.9, Math.PI / 2),
      part(ringGeo, 0x8a5a2b, 0, 0.02, 0, 0.55, 0.55, 0.55, Math.PI / 2), ball(0x8a5a2b, 0, 0.44, 0, 0.07),
      part(ringGeo, 0xffe08a, 0, 0, 0, 1.5, 1.5, 1.5),
    ]),
    boost: merge([
      part(G.sphere, 0xd62828, 0, 0, 0, 0.3, 0.3, 0.9, 0, 0, 0.5), part(G.sphere, 0xd62828, 0.1, 0.22, 0.34, 0.26, 0.26, 0.5, 0, 0, 0.9),
      tube(0x3f8f3d, 0.28, 0.45, 0.46, 0.05, 0.2, 0, 0, 0.6),
      part(ringGeo, 0xffe08a, 0, 0, 0, 1.5, 1.5, 1.5),
    ]),
  };
  function buildPalmGeo(seed) {
    const p = [];
    const h = 4.4 + seed * 0.8, segs = 5, lean = 0.5 + seed * 0.15;
    for (let i = 0; i < segs; i++) {
      const t = (i + 0.5) / segs;
      p.push(part(G.cyl6, i % 2 ? 0x8d6a46 : 0x7a5a3a, lean * t * t, t * h, 0, 0.44 - t * 0.14, h / segs + 0.06, 0.44 - t * 0.14, 0, 0, -0.08 * t));
    }
    const tx = lean, ty = h + 0.1;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + seed * 0.7;
      const col = i % 2 ? 0x3d8c38 : 0x4ea845;
      p.push(part(G.box, col, tx + Math.cos(a) * 1.15, ty - 0.3, Math.sin(a) * 1.15, 2.5, 0.1, 0.55, 0, -a, -0.5));
      p.push(part(G.box, col, tx + Math.cos(a) * 2.6, ty - 1.45, Math.sin(a) * 2.6, 1.3, 0.08, 0.35, 0, -a, -1.0));
    }
    for (let i = 0; i < 3; i++) { const a = i * 2.1; p.push(ball(0x6d4b2a, tx + Math.cos(a) * 0.3, ty - 0.35, Math.sin(a) * 0.3, 0.18)); }
    return merge(p);
  }
  function buildHouseGeo(wall) {
    const w = 5.2, d = 4.4, fy = 1.7, wh = 2.4, p = [];
    for (const x of [-w / 2 + 0.3, 0, w / 2 - 0.3]) for (const z of [-d / 2 + 0.3, d / 2 - 0.3]) p.push(box(0x5e3f26, x, fy / 2, z, 0.26, fy, 0.26));
    p.push(box(0x7a5636, 0, fy, 0, w + 0.4, 0.22, d + 0.4));
    p.push(box(wall, 0, fy + wh / 2, 0, w, wh, d));
    p.push(box(0x27303b, -1.5, fy + 1.45, d / 2 + 0.03, 1.0, 0.95, 0.08)); p.push(box(0x27303b, 1.5, fy + 1.45, d / 2 + 0.03, 1.0, 0.95, 0.08));
    p.push(box(0xffffff, -1.5, fy + 1.98, d / 2 + 0.06, 1.12, 0.1, 0.1)); p.push(box(0xffffff, 1.5, fy + 1.98, d / 2 + 0.06, 1.12, 0.1, 0.1));
    p.push(box(0x5a3a22, 0, fy + 0.95, d / 2 + 0.03, 0.95, 1.75, 0.08));
    for (let i = 0; i < 5; i++) p.push(box(0x7a5636, 0, (i + 1) * fy / 10, d / 2 + 1.7 - i * 0.34, 1.1, (i + 1) * fy / 5, 0.36));
    p.push(part(G.pyr, 0xb5432e, 0, fy + wh + 0.8, 0, w + 1.4, 1.6, d + 1.4));
    return merge(p);
  }
  const bushGeo = merge([
    ball(0x3f8f3d, 0, 0.5, 0, 0.7), ball(0x4ea845, 0.5, 0.4, 0.2, 0.55), ball(0x357f33, -0.45, 0.42, -0.1, 0.5),
    ball(0xe0452f, 0.2, 0.95, 0.3, 0.09), ball(0xe0452f, -0.3, 0.8, 0.35, 0.08), ball(0xe0452f, 0.55, 0.75, -0.2, 0.08),
  ]);
  const boatGeo = merge([
    part(G.sphere, 0x7a4a24, 0, 0.15, 0, 1.4, 0.5, 4.2), part(G.sphere, 0x3a2412, 0, 0.3, 0, 1.0, 0.3, 3.6),
    box(0x8d6a46, 0, 0.35, 0.6, 1.0, 0.08, 0.3), box(0x8d6a46, 0, 0.35, -0.9, 1.0, 0.08, 0.3),
    box(0x2b6fd6, 0, 0.7, -0.9, 0.42, 0.55, 0.3), ball(0xd9a066, 0, 1.12, -0.9, 0.17),
    part(G.cone, 0xd8c08a, 0, 1.32, -0.9, 1.1, 0.25, 1.1), box(0x6b4a2e, 0.55, 0.9, -0.6, 0.06, 1.9, 0.06, 0, 0, 0.35),
  ]);
  function buildStallGeo(canopy) {
    return merge([
      box(0x6b4a2e, -0.85, 1.1, -0.7, 0.1, 2.2, 0.1), box(0x6b4a2e, 0.85, 1.1, -0.7, 0.1, 2.2, 0.1),
      box(0x6b4a2e, -0.85, 1.1, 0.7, 0.1, 2.2, 0.1), box(0x6b4a2e, 0.85, 1.1, 0.7, 0.1, 2.2, 0.1),
      box(0x8a5a2b, 0, 0.85, 0, 1.9, 0.1, 1.6), box(0xa8763d, 0, 0.42, 0, 1.8, 0.75, 1.4),
      tube(0x2b2b2b, -0.45, 1.1, -0.2, 0.35, 0.45), tube(0xc8b394, -0.45, 1.33, -0.2, 0.31, 0.03),
      part(G.bowl, 0xfbf7ef, 0.45, 1.0, 0.2, 0.7, 0.7, 0.7), part(G.bowl, 0xfbf7ef, 0.25, 1.0, -0.35, 0.7, 0.7, 0.7),
      part(G.pyr, canopy, 0, 2.55, 0, 2.8, 0.75, 2.5), box(canopy, 0, 2.17, 0, 2.8, 0.06, 2.5),
    ]);
  }
  const stallGeos = [0xf0742e, 0x2e63b8, 0xd62828, 0x3f8f3d].map(buildStallGeo);
  function makeStall(sign, canopyIndex) {
    const g = new THREE.Group();
    g.add(solid(stallGeos[canopyIndex == null ? 0 : canopyIndex]));
    const s = new THREE.Mesh(stallSignGeo, sign || stallSignMat);
    s.position.set(0, 1.95, 1.3);
    g.add(s);
    return g;
  }
  // A simple villager / cook / market-goer.
  function personParts(x, baju, hat) {
    const p = [
      box(0x3a3a3a, x - 0.12, 0.35, 0, 0.2, 0.7, 0.22), box(0x3a3a3a, x + 0.12, 0.35, 0, 0.2, 0.7, 0.22),
      box(baju, x, 1.05, 0, 0.6, 0.7, 0.36), ball(0xd9a066, x, 1.65, 0, 0.22),
      box(baju, x - 0.4, 1.15, 0, 0.16, 0.55, 0.16), box(baju, x + 0.4, 1.15, 0, 0.16, 0.55, 0.16),
    ];
    if (hat === 'songkok') p.push(tube(0x141414, x, 1.9, 0, 0.2, 0.16));
    else if (hat === 'chef') p.push(tube(0xf4f4f4, x, 1.95, 0, 0.2, 0.26));
    else if (hat === 'tudung') { p.push(ball(hat === 'tudung' ? 0xd0609c : baju, x, 1.72, 0, 0.26, 0.24)); }
    else if (hat === 'terendak') p.push(part(G.cone, 0xd8c08a, x, 1.9, 0, 1.0, 0.25, 1.0));
    return p;
  }
  const crowdGeo = merge([].concat(personParts(-0.65, 0x2e63b8, 'songkok'), personParts(0.05, 0xd0609c, 'tudung'), personParts(0.7, 0xf2b63c, 'terendak')));
  const cookGeo = merge([].concat(personParts(0, 0x2e63b8, 'chef'), [
    box(0xf4f4f4, 0, 0.95, -0.19, 0.5, 0.6, 0.02),
    box(0xc9a35a, 0, 1.15, -0.5, 0.7, 0.04, 0.4),
    part(G.bowl, 0xfbf7ef, -0.18, 1.2, -0.5, 0.5, 0.5, 0.5), part(G.bowl, 0xfbf7ef, 0.18, 1.2, -0.5, 0.5, 0.5, 0.5),
  ]));
  const VEHICLE_COLORS = [0xe0452f, 0x2f7fd9, 0xf2b63c, 0xf4f4f4, 0x3aa65a, 0x8f49c4];
  function wheels(p, xs, zs, r, y) { for (const x of xs) for (const z of zs) p.push(part(G.wheel, 0x1a1a1a, x, y, z, r * 2, 0.3, r * 2, 0, 0, Math.PI / 2)); }
  function buildCarGeo(color) {
    const p = [box(color, 0, 0.62, 0, 1.75, 0.6, 3.7), box(color, 0, 1.12, -0.1, 1.55, 0.55, 1.9), box(0x1b2a3a, 0, 1.14, -0.1, 1.58, 0.42, 1.6),
      box(0xfff1a8, -0.55, 0.65, 1.86, 0.4, 0.2, 0.05), box(0xfff1a8, 0.55, 0.65, 1.86, 0.4, 0.2, 0.05),
      box(0xd42b2b, -0.55, 0.65, -1.86, 0.4, 0.2, 0.05), box(0xd42b2b, 0.55, 0.65, -1.86, 0.4, 0.2, 0.05)];
    wheels(p, [-0.85, 0.85], [1.15, -1.15], 0.36, 0.36);
    return merge(p);
  }
  function buildTruckGeo(color) {
    const p = [box(color, 0, 1.0, 1.65, 1.85, 1.7, 1.5), box(0x1b2a3a, 0, 1.3, 2.41, 1.6, 0.7, 0.05), box(0xd8d4c8, 0, 1.35, -0.85, 1.95, 2.3, 3.3),
      box(0x6b6b6b, 0, 0.35, 0, 1.6, 0.3, 4.9), box(0xfff1a8, -0.65, 0.6, 2.41, 0.35, 0.2, 0.05), box(0xfff1a8, 0.65, 0.6, 2.41, 0.35, 0.2, 0.05)];
    wheels(p, [-0.9, 0.9], [1.6, -0.6, -1.9], 0.45, 0.45);
    return merge(p);
  }
  const carGeos = VEHICLE_COLORS.map(buildCarGeo);
  const truckGeos = [0xe0452f, 0x2f7fd9, 0x3aa65a].map(buildTruckGeo);
  const gantryGeo = merge([
    box(0x7d838c, -1.08, 1.3, 0, 0.16, 2.6, 0.16), box(0x7d838c, 1.08, 1.3, 0, 0.16, 2.6, 0.16), box(0x7d838c, 0, 2.63, 0, 2.4, 0.1, 0.16),
    box(0x1a5f33, 0, 1.75, 0, 2.3, 0.8, 0.1), box(0x55595f, -1.08, 0.05, 0, 0.4, 0.1, 0.4), box(0x55595f, 1.08, 0.05, 0, 0.4, 0.1, 0.4),
  ]);
  const logGeo = merge([
    part(G.cyl6, 0x8b5a2b, 0, 0.32, 0, 0.64, 2.1, 0.64, 0, 0, Math.PI / 2), part(G.cyl6, 0x6f4522, -1.06, 0.32, 0, 0.5, 0.06, 0.5, 0, 0, Math.PI / 2),
    part(G.cyl6, 0x6f4522, 1.06, 0.32, 0, 0.5, 0.06, 0.5, 0, 0, Math.PI / 2), part(G.cyl6, 0x8b5a2b, 0.4, 0.62, 0.1, 0.22, 0.5, 0.22, 0.5, 0, 0.3), ball(0x4ea845, 0.4, 0.88, 0.16, 0.24),
  ]);
  const barrierGeo = merge([
    box(0xf4f4f4, 0, 0.6, 0, 1.9, 0.5, 0.26), box(0xd42b2b, -0.65, 0.6, 0, 0.32, 0.52, 0.28), box(0xd42b2b, 0, 0.6, 0, 0.32, 0.52, 0.28), box(0xd42b2b, 0.65, 0.6, 0, 0.32, 0.52, 0.28),
    box(0x4a4f57, -0.75, 0.18, 0, 0.1, 0.36, 0.5), box(0x4a4f57, 0.75, 0.18, 0, 0.1, 0.36, 0.5),
  ]);
  function crateParts(x) {
    const c = 0xb07a3a, d = 0x7a4f22;
    return [box(c, x, 0.45, 0, 0.95, 0.9, 0.9), box(d, x, 0.45, 0.455, 0.97, 0.08, 0.02), box(d, x, 0.45, -0.455, 0.97, 0.08, 0.02),
      box(d, x, 0.45, 0.455, 0.08, 0.92, 0.02), box(d, x, 0.45, -0.455, 0.08, 0.92, 0.02), box(d, x + 0.48, 0.45, 0, 0.02, 0.08, 0.92), box(d, x - 0.48, 0.45, 0, 0.02, 0.08, 0.92)];
  }
  const crateGeo = merge([].concat(crateParts(-0.5), crateParts(0.5)));
  function basketParts(x, contents) {
    const p = [part(G.bowl, 0xc48a3c, x, 0.38, 0, 1.6, 2.5, 1.6), part(ringGeo, 0x8a5a2b, x, 0.76, 0, 1.6, 1.6, 1.6, Math.PI / 2)];
    contents.forEach((col, i) => p.push(ball(col, x + Math.cos(i * 2.1) * 0.3, 0.8, Math.sin(i * 2.1) * 0.3, 0.17)));
    return p;
  }
  const basketGeo = merge([].concat(basketParts(-0.5, [0x3f8f3d, 0xd62828, 0xf2b63c]), basketParts(0.5, [0xf28c28, 0x3f8f3d, 0xd0609c])));
  const vegBasketGeo = merge([].concat(basketParts(-0.5, [0x3f8f3d, 0x4ea845, 0x2e7d32]), basketParts(0.5, [0xe9d34f, 0x3f8f3d, 0xd62828])));
  const fruitBasketGeo = merge([].concat(basketParts(-0.5, [0xf28c28, 0xf2d94e, 0xd62828]), basketParts(0.5, [0x8f49c4, 0xf28c28, 0x3f8f3d])));
  function chickenParts(x) {
    return [part(G.sphere, 0xf6f1e4, x, 0.38, 0, 0.55, 0.45, 0.75), ball(0xf6f1e4, x, 0.66, -0.32, 0.15), box(0xd62828, x, 0.8, -0.32, 0.04, 0.12, 0.14),
      box(0xf28c28, x, 0.64, -0.48, 0.06, 0.05, 0.1), box(0xd62828, x, 0.56, -0.4, 0.04, 0.08, 0.05), box(0xd9d2c0, x, 0.55, 0.4, 0.15, 0.2, 0.12, 0.5),
      box(0xf28c28, x - 0.08, 0.1, 0, 0.04, 0.2, 0.04), box(0xf28c28, x + 0.08, 0.1, 0, 0.04, 0.2, 0.04)];
  }
  const chickenGeo = merge([].concat(chickenParts(-0.5), chickenParts(0.55)));
  const laundryGeo = merge([
    tube(0x8d6a46, -1.05, 1.1, 0, 0.06, 2.2), tube(0x8d6a46, 1.05, 1.1, 0, 0.06, 2.2), box(0x333333, 0, 2.05, 0, 2.2, 0.03, 0.03),
    box(0xd9442c, -0.65, 1.72, 0, 0.5, 0.66, 0.04), box(0x2e63b8, 0, 1.7, 0.02, 0.55, 0.62, 0.04), box(0xf2b63c, 0.65, 1.73, 0, 0.5, 0.64, 0.04),
  ]);
  const cartGeo = merge([
    box(0x8a5a2b, 0, 0.95, 0, 1.7, 0.5, 2.2), box(0x6b4a2e, -0.85, 1.25, 0, 0.06, 0.4, 2.2), box(0x6b4a2e, 0.85, 1.25, 0, 0.06, 0.4, 2.2),
    part(G.wheel, 0x3a2a1c, -0.9, 0.5, 0.3, 1.0, 0.16, 1.0, 0, 0, Math.PI / 2), part(G.wheel, 0x3a2a1c, 0.9, 0.5, 0.3, 1.0, 0.16, 1.0, 0, 0, Math.PI / 2),
    box(0x6b4a2e, -0.5, 1.0, 1.45, 0.08, 0.08, 0.9), box(0x6b4a2e, 0.5, 1.0, 1.45, 0.08, 0.08, 0.9),
    box(0x6b4a2e, -0.6, 0.35, -0.8, 0.08, 0.7, 0.08), box(0x6b4a2e, 0.6, 0.35, -0.8, 0.08, 0.7, 0.08),
    ball(0xd8c08a, -0.4, 1.45, 0, 0.36), ball(0xd8c08a, 0.4, 1.4, -0.3, 0.33), ball(0xcdb37c, 0.1, 1.42, 0.5, 0.3),
  ]);
  const firewoodGeo = merge([
    part(G.cyl6, 0x7a4a24, 0, 0.16, -0.34, 0.32, 1.9, 0.32, 0, 0, Math.PI / 2), part(G.cyl6, 0x8b5a2b, 0, 0.16, 0, 0.32, 1.9, 0.32, 0, 0, Math.PI / 2),
    part(G.cyl6, 0x7a4a24, 0, 0.16, 0.34, 0.32, 1.9, 0.32, 0, 0, Math.PI / 2), part(G.cyl6, 0x8b5a2b, 0, 0.44, -0.17, 0.32, 1.8, 0.32, 0, 0, Math.PI / 2),
    part(G.cyl6, 0x7a4a24, 0, 0.44, 0.17, 0.32, 1.8, 0.32, 0, 0, Math.PI / 2), part(G.cyl6, 0x8b5a2b, 0, 0.7, 0, 0.3, 1.7, 0.3, 0, 0, Math.PI / 2),
  ]);
  function potParts(x) {
    return [tube(0x2a2a2a, x, 0.32, 0, 0.42, 0.64), part(G.sphere, 0x3a3a3a, x, 0.66, 0, 0.9, 0.24, 0.9), ball(0x6a6a6a, x, 0.8, 0, 0.07),
      box(0x3a3a3a, x - 0.48, 0.45, 0, 0.1, 0.06, 0.3), box(0x3a3a3a, x + 0.48, 0.45, 0, 0.1, 0.06, 0.3)];
  }
  const potGeo = merge([].concat(potParts(-0.5), potParts(0.5)));
  const utensilsGeo = merge([
    tube(0x6b4a2e, -1.05, 1.2, 0, 0.07, 2.4), tube(0x6b4a2e, 1.05, 1.2, 0, 0.07, 2.4), box(0x6b4a2e, 0, 2.35, 0, 2.3, 0.08, 0.08),
    box(0x8a8a8a, -0.6, 1.88, 0, 0.04, 0.86, 0.04), ball(0x8a8a8a, -0.6, 1.47, 0, 0.13, 0.08),
    box(0xc9a35a, 0, 1.9, 0, 0.05, 0.9, 0.05), box(0xc9a35a, 0, 1.47, 0, 0.18, 0.07, 0.08),
    box(0x333333, 0.6, 1.95, 0, 0.04, 0.7, 0.04), ball(0x333333, 0.6, 1.55, 0, 0.26, 0.1),
  ]);
  const shelfBarGeo = merge([
    tube(0x6b4a2e, -1.05, 1.2, 0, 0.07, 2.4), tube(0x6b4a2e, 1.05, 1.2, 0, 0.07, 2.4), box(0x8a5a2b, 0, 1.47, 0, 2.3, 0.08, 0.5),
    tube(0xd9c7a0, -0.7, 1.7, 0, 0.18, 0.36), tube(0xc8b394, 0, 1.68, 0, 0.16, 0.32), tube(0xd9c7a0, 0.7, 1.7, 0, 0.18, 0.36),
    tube(0x8a5a2b, -0.7, 1.9, 0, 0.19, 0.05), tube(0x8a5a2b, 0, 1.86, 0, 0.17, 0.05), tube(0x8a5a2b, 0.7, 1.9, 0, 0.19, 0.05),
  ]);
  const tableGeo = merge([
    box(0x8a5a2b, 0, 1.0, 0, 1.9, 0.1, 2.0), box(0x6b4a2e, -0.85, 0.5, 0.9, 0.1, 1.0, 0.1), box(0x6b4a2e, 0.85, 0.5, 0.9, 0.1, 1.0, 0.1),
    box(0x6b4a2e, -0.85, 0.5, -0.9, 0.1, 1.0, 0.1), box(0x6b4a2e, 0.85, 0.5, -0.9, 0.1, 1.0, 0.1),
    part(G.bowl, 0xfbf7ef, -0.5, 1.07, 0.5, 0.7, 0.7, 0.7), part(G.bowl, 0xfbf7ef, 0.45, 1.07, -0.4, 0.7, 0.7, 0.7), tube(0x2a2a2a, 0.3, 1.2, 0.5, 0.25, 0.3),
    box(0x4ea845, -0.4, 1.1, -0.5, 0.5, 0.1, 0.3),
  ]);
  const kawahGeo = merge([
    box(0x8a4b2b, 0, 0.3, 0, 1.6, 0.6, 1.4), box(0x6b3a22, 0, 0.3, 0.71, 1.4, 0.4, 0.02), box(0xf28c28, 0, 0.3, 0.72, 0.5, 0.25, 0.02),
    part(G.bowl, 0x222222, 0, 0.95, 0, 1.6, 2.4, 1.6), part(ringGeo, 0x444444, 0, 1.3, 0, 1.6, 1.6, 1.6, Math.PI / 2), tube(0xc8b394, 0, 1.28, 0, 0.74, 0.03),
    ball(0xf4f4f4, 0.1, 1.62, 0, 0.18), ball(0xf4f4f4, -0.15, 1.88, 0.1, 0.14),
  ]);
  const sacksGeo = merge([
    part(G.sphere, 0xd8c08a, -0.45, 0.4, 0, 1.0, 0.8, 0.9), part(G.sphere, 0xd8c08a, 0.45, 0.4, 0.1, 1.0, 0.8, 0.9), part(G.sphere, 0xcdb37c, 0, 1.05, 0, 1.0, 0.8, 0.9),
    box(0x8a5a2b, -0.45, 0.78, 0, 0.3, 0.06, 0.3), box(0x8a5a2b, 0.45, 0.78, 0.1, 0.3, 0.06, 0.3), box(0x8a5a2b, 0, 1.43, 0, 0.3, 0.06, 0.3),
  ]);
  const rollingPotGeo = merge([part(G.cyl, 0x2a2a2a, 0, 0.4, 0, 0.8, 1.7, 0.8, 0, 0, Math.PI / 2), part(G.cyl, 0x444444, 0, 0.4, 0, 0.6, 1.74, 0.6, 0, 0, Math.PI / 2)]);
  const fenceParts = [];
  for (let z = -5; z <= 5; z += 2) fenceParts.push(box(0x8a5a2b, 0, 0.6, z, 0.12, 1.2, 0.12));
  fenceParts.push(box(0x8a5a2b, 0, 0.95, 0, 0.08, 0.1, 12), box(0x8a5a2b, 0, 0.5, 0, 0.08, 0.1, 12));
  for (let z = -5.5; z <= 5.5; z += 1) fenceParts.push(part(G.pyr, [0xd62828, 0xf2b63c, 0x2e63b8, 0x3f8f3d][Math.floor((z + 6)) % 4], 0, 1.18, z, 0.3, 0.3, 0.05, Math.PI));
  const fenceGeo = merge(fenceParts);
  function makeBanner() {
    const g = new THREE.Group();
    g.add(solid(merge([tube(0x6b4a2e, -1.15, 1.25, 0, 0.06, 2.5), tube(0x6b4a2e, 1.15, 1.25, 0, 0.06, 2.5), box(0x333333, 0, 2.45, 0, 2.4, 0.03, 0.03)])));
    const cloth = new THREE.Mesh(bannerGeo, pick(bannerMats));
    cloth.position.set(0, 1.78, 0);
    g.add(cloth);
    return g;
  }
  function makeGantry() {
    const g = new THREE.Group();
    g.add(solid(gantryGeo));
    const sign = new THREE.Mesh(signGeo, pick(signMats));
    sign.position.set(0, 1.75, 0.06);
    g.add(sign);
    return g;
  }
  // Kitchen walls and props.
  function buildWallGeo(variant) {
    const p = [box(0x6b4a2e, 0, 3.0, 0, 0.3, 6.0, 6.0), box(0x4a3222, 0, 0.15, 0, 0.36, 0.3, 6.0)];
    for (let y = 0.9; y < 5.9; y += 0.8) p.push(box(0x5a3c22, 0, y, 0, 0.34, 0.05, 6.0));
    if (variant === 0) p.push(box(0xffe9a8, 0, 2.7, 0, 0.36, 1.1, 1.5), box(0x4a3222, 0, 2.7, 0, 0.38, 0.06, 1.5), box(0x4a3222, 0, 2.7, 0, 0.38, 1.1, 0.06));
    if (variant === 1) {
      p.push(box(0x8a5a2b, 0.35, 1.9, 0, 0.5, 0.06, 2.6), box(0x8a5a2b, 0.35, 3.0, 0, 0.5, 0.06, 2.6));
      [-0.9, -0.3, 0.3, 0.9].forEach((z, i) => p.push(tube([0xd9c7a0, 0xc8b394, 0x8a1f1f, 0x3f8f3d][i], 0.35, 2.1, z, 0.16, 0.36), tube(0x8a5a2b, 0.35, 2.3, z, 0.17, 0.05)));
      [-0.6, 0.6].forEach((z) => p.push(ball(0x2a2a2a, 0.35, 3.25, z, 0.22, 0.18)));
    }
    if (variant === 2) { p.push(box(0x5a3c22, 0.2, 3.6, 0, 0.08, 0.08, 2.2)); [-0.8, 0, 0.8].forEach((z) => p.push(box(0x333333, 0.28, 3.3, z, 0.06, 0.5, 0.06), ball(0x2a2a2a, 0.3, 2.95, z, 0.25, 0.2))); }
    if (variant === 3) p.push(box(0xd9442c, 0.2, 2.6, 0, 0.06, 1.4, 1.1), box(0xf2b63c, 0.23, 2.6, 0, 0.04, 0.5, 0.5));
    return merge(p);
  }
  const wallGeos = [0, 1, 2, 3].map(buildWallGeo);
  const beamBarGeo = merge([box(0x5a3c22, 0, 5.6, 0, ROAD_W + 3.6, 0.28, 0.3)]);
  const stoveGeo = merge([box(0x8a4b2b, 0, 0.35, 0, 1.4, 0.7, 1.0), box(0xf28c28, 0, 0.4, 0.51, 0.5, 0.3, 0.02), tube(0x2a2a2a, 0, 0.95, 0, 0.42, 0.5), tube(0xc8b394, 0, 1.2, 0, 0.36, 0.03), ball(0xf4f4f4, 0.05, 1.5, 0, 0.15)]);
  const tempayanGeo = merge([part(G.sphere, 0x4a3a2a, 0, 0.55, 0, 1.1, 1.0, 1.1), tube(0x4a3a2a, 0, 1.05, 0, 0.3, 0.2), tube(0x2a1a0a, 0, 1.15, 0, 0.26, 0.03)]);
  // Market props.
  const lanternGeo = merge([tube(0x6b4a2e, 0, 1.6, 0, 0.07, 3.2), box(0x6b4a2e, 0.4, 3.15, 0, 0.8, 0.06, 0.06), box(0x333333, 0.75, 2.95, 0, 0.02, 0.4, 0.02),
    part(G.sphere, 0xd62828, 0.75, 2.5, 0, 0.6, 0.7, 0.6), tube(0xf2b63c, 0.75, 2.88, 0, 0.14, 0.06), tube(0xf2b63c, 0.75, 2.12, 0, 0.14, 0.06)]);
  // Bunting runs along the roadside between the stalls, never across the road, so it stays out of the view.
  const buntingParts = [box(0x333333, 0, 3.3, 0, 0.03, 0.03, 6.0), tube(0x6b4a2e, 0, 1.65, -3, 0.05, 3.3), tube(0x6b4a2e, 0, 1.65, 3, 0.05, 3.3)];
  for (let i = 0; i < 8; i++) buntingParts.push(part(G.pyr, [0xd62828, 0xf2b63c, 0x2e63b8, 0x3f8f3d, 0xf4f4f4][i % 5], 0, 3.08, -2.6 + i * 0.74, 0.05, 0.42, 0.4, Math.PI));
  const buntingGeo = merge(buntingParts);
  const palmGeos = [0, 1, 2].map(buildPalmGeo);
  const houseGeos = [0xf2e2c4, 0x8fd1c9, 0xf0b89a, 0xcfe3f5].map(buildHouseGeo);
  const peopleGeos = [[0x2e63b8, 'songkok'], [0xd0609c, 'tudung'], [0xf2b63c, 'terendak'], [0x3f8f3d, 'songkok']].map(([c, h]) => merge(personParts(0, c, h)));

  /* ------------------------------------------------ obstacle catalogue */
  // kind -> type (low: jump over, high: slide under, block: change lane), depth, width, and a factory.
  const OB = {};
  function def(kind, type, depth, extra, make) { OB[kind] = Object.assign({ kind, type, depth, halfW: 1.0, make }, extra); }
  def('log', 'low', 0.7, { height: 0.62 }, () => solid(logGeo));
  def('barrier', 'low', 0.5, { height: 0.86 }, () => solid(barrierGeo));
  def('crate', 'low', 0.9, { height: 0.9 }, () => solid(crateGeo));
  def('basket', 'low', 1.6, { height: 0.85 }, () => solid(basketGeo));
  def('vegBasket', 'low', 1.6, { height: 0.85 }, () => solid(vegBasketGeo));
  def('fruitBasket', 'low', 1.6, { height: 0.85 }, () => solid(fruitBasketGeo));
  def('chicken', 'low', 0.8, { height: 0.8 }, () => solid(chickenGeo));
  def('firewood', 'low', 1.0, { height: 0.86 }, () => solid(firewoodGeo));
  def('pot', 'low', 0.9, { height: 0.85 }, () => solid(potGeo));
  def('rollingPot', 'low', 0.8, { height: 0.8, spin: true }, () => solid(rollingPotGeo));
  def('gantry', 'high', 0.4, { clearance: 1.35, halfW: 1.1 }, makeGantry);
  def('laundry', 'high', 0.3, { clearance: 1.38 }, () => solid(laundryGeo));
  def('utensils', 'high', 0.3, { clearance: 1.4 }, () => solid(utensilsGeo));
  def('shelfBar', 'high', 0.5, { clearance: 1.42 }, () => solid(shelfBarGeo));
  def('banner', 'high', 0.3, { clearance: 1.42 }, makeBanner);
  def('car', 'block', 3.8, {}, () => solid(pick(carGeos)));
  def('truck', 'block', 5.0, {}, () => solid(pick(truckGeos)));
  def('cart', 'block', 3.0, {}, () => solid(cartGeo));
  def('stall', 'block', 2.2, {}, () => makeStall(stallSignMat, 0));
  def('marketStall', 'block', 2.2, {}, () => makeStall(marketSignMat, 1 + Math.floor(Math.random() * 3)));
  def('table', 'block', 2.0, {}, () => solid(tableGeo));
  def('kawah', 'block', 1.6, {}, () => solid(kawahGeo));
  def('sacks', 'block', 1.2, {}, () => solid(sacksGeo));
  def('crowd', 'block', 0.8, {}, () => solid(crowdGeo));
  def('cook', 'block', 1.0, { halfW: 0.6 }, () => solid(cookGeo));
  def('cartMover', 'block', 3.0, { halfW: 0.9 }, () => solid(cartGeo));
  def('fence', 'block', 12, { halfW: 0.5 }, () => solid(fenceGeo));
  const POOLS = {
    village: { low: ['log', 'barrier', 'crate', 'basket', 'chicken'], high: ['gantry', 'laundry'], block: ['cart', 'stall', 'car', 'truck'], lateral: [], narrow: [] },
    kitchen: { low: ['firewood', 'pot', 'vegBasket', 'rollingPot'], high: ['utensils', 'shelfBar'], block: ['table', 'kawah', 'sacks'], lateral: ['cook'], narrow: [] },
    market: { low: ['fruitBasket', 'crate', 'barrier'], high: ['banner', 'gantry'], block: ['marketStall', 'crowd', 'cart'], lateral: ['cartMover'], narrow: ['fence'] },
  };
  /* ------------------------------------------------------ environments */
  const ENVS = {
    village: { sky: 0x9fd9f6, dome: [0x3f95e0, 0xbfe6f8], fog: [40, 170], road: 'asphalt', side: 'grass', river: true, sky3d: true, ceiling: false, mtn: 0x5f8f86, sunColor: 0xfff3b0,
      hemi: [0xe3f4ff, 0x5f8a3f, 0.8], sun: [0xfff1d0, 1.0], sunPos: [-20, 30, -8], cam: { y: 4.7, z: 7.6, lookY: 1.3 } },
    kitchen: { sky: 0x2a1c12, dome: [0x2a1c12, 0x2a1c12], fog: [22, 90], road: 'planks', side: 'planksDark', river: false, sky3d: false, ceiling: true, mtn: 0x5f8f86, sunColor: 0xfff3b0,
      hemi: [0xffd9a8, 0x3a2a1c, 1.1], sun: [0xffc98a, 0.9], sunPos: [-6, 18, -4], cam: { y: 3.4, z: 7.2, lookY: 1.2 } },   // low camera: the ceiling stays well above it
    market: { sky: 0xf0a060, dome: [0x6a5aa8, 0xf7a35c], fog: [38, 150], road: 'cobble', side: 'paving', river: false, sky3d: true, ceiling: false, mtn: 0x7a5a7a, sunColor: 0xffb070,
      hemi: [0xffe0b3, 0x6b5a3a, 0.85], sun: [0xffcf9a, 1.0], sunPos: [20, 22, -10], cam: { y: 4.7, z: 7.6, lookY: 1.3 } },
    // the main menu: the village at golden hour, as in the reference art
    menu: { sky: 0xf6b06a, dome: [0x3f8fd8, 0xf8b26a, 0xf9c98a], fog: [60, 220], road: 'asphalt', side: 'grass', river: true, sky3d: true, ceiling: false, mtn: 0x6b6a8a, sunColor: 0xffd58a,
      hemi: [0xffe3b8, 0x5f7a3a, 0.9], sun: [0xffcf8a, 1.1], sunPos: [26, 16, -30], cam: { y: 4.7, z: 7.6, lookY: 1.3 } },
  };
  let envCam = ENVS.village.cam;
  let envName = '';
  function applyEnv(name) {
    if (name === envName) return;
    envName = name;
    const e = ENVS[name];
    scene.background.setHex(e.sky);
    scene.fog.color.setHex(e.sky); scene.fog.near = e.fog[0]; scene.fog.far = e.fog[1];
    curRoad = TEX[e.road]; roadPlane.material.map = curRoad; roadPlane.material.needsUpdate = true;
    curSide = TEX[e.side]; sidePlane.material.map = curSide; sidePlane.material.needsUpdate = true;
    waterPlane.visible = sandPlane.visible = e.river;
    skyGroup.visible = e.sky3d;
    skyDome.visible = e.sky3d;
    setSky(e.dome[0], e.dome[1], e.dome[2]);
    ceiling.visible = e.ceiling;
    mtnMat.color.setHex(e.mtn);
    sunMesh.material.color.setHex(e.sunColor);
    hemi.color.setHex(e.hemi[0]); hemi.groundColor.setHex(e.hemi[1]); hemi.intensity = e.hemi[2];
    sun.color.setHex(e.sun[0]); sun.intensity = e.sun[1]; sun.position.set(e.sunPos[0], e.sunPos[1], e.sunPos[2]);
    envCam = e.cam;
    clearList(scenery);
    nextScenS = dist - 5;
  }

  /* ------------------------------------------------------------ player */
  // The runner is the Traveller from "Jejak Warisan Laksa Gebok".
  function buildPlayer() {
    const SKIN = 0xf1c9a3, HAIR = 0x161618, CAP = 0x1b1b20, PINK = 0xd6249a, PINK_D = 0x7d1259;
    const JACKET = 0x6e4b2c, PANTS = 0x4a3220, NAVY = 0x25306e, NAVY_D = 0x1a2250;
    const GREEN = 0x79b23a, GREEN_D = 0x4f7f23, SHOE = 0xf5f5f5, BLACK = 0x1a1a1a;
    const g = new THREE.Group();
    g.add(solid(merge([
      box(JACKET, 0, 1.04, 0, 0.64, 0.74, 0.38), box(NAVY, 0, 1.02, -0.195, 0.05, 0.66, 0.015), box(NAVY, 0, 1.39, 0, 0.5, 0.1, 0.4),
      part(G.cyl, GREEN, 0.14, 1.14, -0.2, 0.2, 0.02, 0.2, Math.PI / 2), part(G.cyl, GREEN_D, 0.14, 1.14, -0.215, 0.08, 0.02, 0.08, Math.PI / 2),
      box(NAVY, 0, 1.05, 0.34, 0.52, 0.62, 0.28), box(NAVY_D, 0, 0.88, 0.49, 0.42, 0.26, 0.04),
      box(NAVY, -0.2, 1.24, 0, 0.08, 0.34, 0.44), box(NAVY, 0.2, 1.24, 0, 0.08, 0.34, 0.44),
      part(G.cyl, GREEN, 0, 1.2, 0.485, 0.22, 0.02, 0.22, Math.PI / 2), part(G.cyl, GREEN_D, 0, 1.2, 0.5, 0.09, 0.02, 0.09, Math.PI / 2),
      box(SKIN, 0, 1.46, 0, 0.2, 0.14, 0.2), box(SKIN, 0, 1.72, 0, 0.5, 0.48, 0.46), box(HAIR, 0, 1.9, 0.03, 0.52, 0.14, 0.5),
      box(BLACK, 0.1, 1.76, -0.235, 0.08, 0.08, 0.02), box(BLACK, -0.1, 1.76, -0.235, 0.08, 0.08, 0.02),
      box(HAIR, 0.1, 1.85, -0.235, 0.11, 0.03, 0.02), box(HAIR, -0.1, 1.85, -0.235, 0.11, 0.03, 0.02), box(0x9a5a48, 0.03, 1.62, -0.235, 0.14, 0.025, 0.02),
      box(CAP, 0, 1.95, 0, 0.56, 0.1, 0.52), ball(CAP, 0, 1.96, 0, 0.3, 0.17), box(CAP, 0, 1.97, 0.4, 0.34, 0.05, 0.28, -0.18),
      box(PINK, 0, 2.15, 0, 0.64, 0.06, 0.1), box(PINK, -0.31, 1.95, 0, 0.06, 0.44, 0.1), box(PINK, 0.31, 1.95, 0, 0.06, 0.44, 0.1),
      part(G.cyl, PINK, -0.33, 1.72, 0, 0.3, 0.12, 0.3, 0, 0, Math.PI / 2), part(G.cyl, PINK, 0.33, 1.72, 0, 0.3, 0.12, 0.3, 0, 0, Math.PI / 2),
      part(G.cyl, PINK_D, -0.3, 1.72, 0, 0.22, 0.05, 0.22, 0, 0, Math.PI / 2), part(G.cyl, PINK_D, 0.3, 1.72, 0, 0.22, 0.05, 0.22, 0, 0, Math.PI / 2),
    ])));
    const limb = (parts) => { const pivot = new THREE.Group(); pivot.add(solid(merge(parts))); return pivot; };
    const leg = (side) => limb([
      box(PANTS, 0, -0.26, 0, 0.22, 0.52, 0.24), box(SHOE, 0, -0.61, -0.03, 0.24, 0.18, 0.34),
      box(BLACK, side * 0.125, -0.6, -0.03, 0.012, 0.14, 0.04, 0.7), box(BLACK, side * 0.125, -0.6, -0.03, 0.012, 0.14, 0.04, -0.7),
      box(BLACK, 0, -0.69, -0.03, 0.25, 0.025, 0.35),
    ]);
    const arm = () => limb([box(JACKET, 0, -0.24, 0, 0.2, 0.48, 0.22), box(SKIN, 0, -0.55, 0, 0.17, 0.14, 0.18)]);
    const legL = leg(-1), legR = leg(1);
    legL.position.set(-0.17, 0.7, 0); legR.position.set(0.17, 0.7, 0);
    const armL = arm(), armR = arm();
    armL.position.set(-0.42, 1.36, 0); armR.position.set(0.42, 1.36, 0);
    const aura = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.06, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffd45a, transparent: true, opacity: 0.85 }));
    aura.rotation.x = Math.PI / 2; aura.position.y = 1.0; aura.visible = false;
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(1.25, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffd45a, transparent: true, opacity: 0.22, depthWrite: false }));
    bubble.position.y = 1.0; bubble.visible = false;
    g.add(legL, legR, armL, armR, aura, bubble);
    scene.add(g);
    return { group: g, legL, legR, armL, armR, aura, bubble, lane: 1, x: 0, y: 0, vy: 0, jumping: false, rolling: false, rollT: 0, queuedRoll: false };
  }
  const player = buildPlayer();
  // Lelaki Misteri: the hooded elder from "Jejak Warisan Laksa Gebok", holding a glowing stone.
  function buildElder() {
    const ROBE = 0xf1e4cf, CAPE = 0x6f8a3a, SKIN = 0xd9a066, BEARD = 0xf4f4f4, SASH = 0xc9a35a, DARK = 0x1a1a1a;
    const g = new THREE.Group();
    g.add(solid(merge([
      part(G.bowl, ROBE, 0, 0.56, 0, 1.9, 3.7, 1.9, Math.PI),            // robe skirt, wide at the hem
      box(ROBE, 0, 1.4, 0, 0.8, 0.95, 0.56), box(SASH, 0, 1.1, 0, 0.82, 0.16, 0.58),
      box(CAPE, 0, 1.5, 0.24, 1.0, 1.6, 0.22), box(CAPE, -0.52, 1.45, 0.06, 0.16, 1.4, 0.52), box(CAPE, 0.52, 1.45, 0.06, 0.16, 1.4, 0.52),
      box(SKIN, 0, 2.04, -0.06, 0.46, 0.5, 0.42),
      part(G.sphere, CAPE, 0, 2.18, 0.12, 0.82, 0.78, 0.78), box(CAPE, 0, 1.86, 0.16, 0.84, 0.5, 0.56),
      box(0x556b2e, 0, 2.34, -0.2, 0.5, 0.08, 0.12),                      // hood rim above the brow
      box(BEARD, 0, 1.75, -0.22, 0.36, 0.36, 0.16), box(BEARD, 0, 1.95, -0.29, 0.26, 0.06, 0.04),
      box(BEARD, -0.11, 2.12, -0.29, 0.14, 0.04, 0.03), box(BEARD, 0.11, 2.12, -0.29, 0.14, 0.04, 0.03),
      box(DARK, -0.1, 2.05, -0.29, 0.08, 0.07, 0.03), box(DARK, 0.1, 2.05, -0.29, 0.08, 0.07, 0.03), box(SKIN, 0, 1.97, -0.31, 0.1, 0.12, 0.06),
      box(ROBE, -0.32, 1.28, -0.3, 0.2, 0.2, 0.55, 0, -0.45, 0), box(ROBE, 0.32, 1.28, -0.3, 0.2, 0.2, 0.55, 0, 0.45, 0),
      box(SKIN, -0.16, 1.28, -0.56, 0.16, 0.14, 0.16), box(SKIN, 0.16, 1.28, -0.56, 0.16, 0.14, 0.16),
    ])));
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffe36b }));
    orb.position.set(0, 1.38, -0.6);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffd45a, transparent: true, opacity: 0.28, depthWrite: false }));
    glow.position.copy(orb.position);
    const light = new THREE.PointLight(0xffd27a, 0.7, 5);
    light.position.copy(orb.position);
    g.add(orb, glow, light);
    g.visible = false;
    scene.add(g);
    return { group: g, orb, glow, light };
  }
  const elder = buildElder();
  // Stage positions: the pair stands on the camera's left; portrait screens push them back and left.
  let stageOn = false;
  const camLook = new THREE.Vector3(0, 1.3, -14);
  // The pair stands on the left of the frame whatever the screen shape: x is a fraction of the
  // visible half-width at each character's depth.
  function stagePose(portrait) {
    const cam = portrait ? { pos: [0, 2.5, 8.6], look: [0, 2.0, -8] } : { pos: [0, 2.4, 8.6], look: [0, 1.9, -8] };
    const tanHalf = Math.tan((camera.fov * Math.PI / 180) / 2) * camera.aspect;
    const ez = portrait ? 2.0 : 3.2, tz = portrait ? 2.6 : 3.8;
    const eHalf = (cam.pos[2] - ez) * tanHalf, tHalf = (cam.pos[2] - tz) * tanHalf;
    return { elder: [-eHalf * (portrait ? 0.6 : 0.66), 0, ez], traveller: [-tHalf * (portrait ? 0.28 : 0.42), 0, tz], cam };
  }
  function setStage(on) {
    const was = stageOn;
    stageOn = on;
    elder.group.visible = on;
    if (on) {
      envName = ''; applyEnv('menu');
      if (!was) {                                              // snap the camera to the menu view, then drift
        const pose = stagePose(window.innerWidth < window.innerHeight).cam;
        camera.position.set(pose.pos[0], pose.pos[1], pose.pos[2]);
        camLook.set(pose.look[0], pose.look[1], pose.look[2]);
        camera.lookAt(camLook);
      }
    }
  }

  /* ------------------------------------------------------------- state */
  let state = 'menu';            // menu | ready | playing | paused | hit | dead | won | incomplete | final
  let time = 0, dist = 0, runDist = 0, speed = 12, score = 0, laksaCount = 0, runTime = 0;
  let nextS = 0, nextScenS = -6, patternCount = 0, magnetT = 0, combo = 0, lastCollect = -10;
  let camX = 0, shake = 0, runPhase = 0, deathT = 0, deathY = 0, overShown = false, isNewBest = false, hintTimer = 0;
  let gebukWait = 0, gebukRun = 0, bannerTimer = 0, lastStep = 0, wonT = 0, readyT = 0, countdownShown = '', countTimer = 0;
  let lives = CFG.lives, livesLost = 0, livesAtLevelStart = CFG.lives, invT = 0, speedBeforeHit = 0, shield = false, boostT = 0, hitObstacle = null;
  let levelStart = 0, clock = 0, lastBeep = -1;
  let campaignUsed = 0, campaignScore = 0, campaignLaksa = 0, campaignGebuk = 0, campaignAch = 0, levelBanked = false;
  const earned = new Set();      // achievements earned in this run
  const ACH = CFG.achievements;
  let runStats = null;
  const obstacles = [], laksas = [], powerups = [], gebuks = [], scenery = [], fx = [];
  let progress = { unlocked: 0, completed: LEVELS.map(() => false) };
  let level = 0;                 // the level being played
  let selectedLevel = 0;         // the unlocked level picked on the menu as the run's starting point
  let levelCount = 0;            // gebuk collected toward this level's target, this run
  const curLevel = () => LEVELS[level];
  // One run = the three levels in a row on a single clock; score, hearts and time left carry over.
  const timeLeft = () => Math.max(0, CFG.timeLimit - campaignUsed - clock);
  const runTotal = () => campaignScore + (levelBanked ? 0 : score);
  function saveProgress() { GebokStore.saveProgress(progress).catch(() => { /* kept in memory for this session */ }); }
  function clearList(list) { for (const it of list) scene.remove(it.mesh); list.length = 0; }
  function freshRunStats() { return { laksa: 0, gebuk: 0, laksaPts: 0, gebukPts: 0, mission: 0, levelBonus: 0, flawless: 0, timeBonus: 0, finished: false, missionDone: false }; }
  const fmtClock = (sec) => { const t = Math.max(0, Math.floor(sec)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };

  /* ---------------------------------------------------------- spawning */
  function spawnObstacle(kind, lane, s, mover) {
    const d = OB[kind];
    const mesh = d.make();
    const o = { mesh, kind: d.type, name: kind, x: LANE_X[lane], s: s + d.depth / 2, depth: d.depth, halfW: d.halfW, height: d.height || 0, clearance: d.clearance || 0, mover: mover || null, spin: !!d.spin };
    mesh.position.set(o.x, 0, dist - o.s);
    scene.add(mesh);
    obstacles.push(o);
    return o;
  }
  function spawnLaksa(s, lane, y) {
    const mesh = solid(laksaGeo, MAT.shiny);
    const L = { mesh, s, x: LANE_X[lane], y: y == null ? 0.55 : y };
    mesh.position.set(L.x, L.y, dist - s);
    scene.add(mesh);
    laksas.push(L);
  }
  function spawnLaksaLine(s, lane, n) { for (let i = 0; i < n; i++) spawnLaksa(s + i * LAKSA_STEP, lane); return n * LAKSA_STEP; }
  function spawnLaksaArc(sc, lane) { for (let k = -2; k <= 2; k++) { const t = k / 2; spawnLaksa(sc + k * 1.4, lane, 0.55 + 1.25 * (1 - t * t)); } }
  function spawnPowerup(type, s, lane) {
    const mesh = solid(POWER_GEO[type], MAT.shiny);
    const P = { mesh, type, s, x: LANE_X[lane], y: 1.0 };
    mesh.position.set(P.x, P.y, dist - s);
    scene.add(mesh);
    powerups.push(P);
  }
  function spawnGebuk(s, lane, y) {
    const mesh = makeGebuk();
    const Gk = { mesh, s, x: LANE_X[lane], y };
    mesh.position.set(Gk.x, Gk.y, dist - s);
    scene.add(mesh);
    gebuks.push(Gk);
  }
  function rollGebukWait() {
    const m = curLevel();
    const e = m.gebukEvery || [2, 4];
    gebukWait = e[0] + Math.floor(Math.random() * (e[1] - e[0] + 1));
  }
  function pickType(hard) {
    const r = Math.random();
    if (r < 0.42 - 0.12 * hard) return 'low';
    if (r < 0.68 - 0.08 * hard) return 'high';
    return 'block';
  }
  function spawnMoverRow(s, pools) {
    const kind = pick(pools.lateral);
    const pair = pick([[0, 1], [1, 2]]);
    const o = spawnObstacle(kind, pair[0], s, { kind: 'lateral', a: LANE_X[pair[0]], b: LANE_X[pair[1]], period: 2.4 + Math.random() * 1.2, phase: Math.random() * Math.PI * 2 });
    const freeLane = pair[0] === 0 ? 2 : 0;
    if (Math.random() < 0.7) spawnLaksaLine(s - 1, freeLane, 4 + Math.floor(Math.random() * 3));
    return Math.max(o.depth, 6);
  }
  function spawnNarrowRow(s, pools, lanes) {
    const kind = pick(pools.narrow);
    const freeLane = lanes[0];
    let len = 0;
    for (const lane of [0, 1, 2]) if (lane !== freeLane) len = spawnObstacle(kind, lane, s).depth;
    spawnLaksaLine(s + 1, freeLane, 6);
    return len;
  }
  // One row of obstacles across the lanes with laksa to tempt you, then a gap scaled to the speed.
  function spawnPattern(s) {
    const L = curLevel();
    const hard = Math.min(1, (campaignUsed + clock) / CFG.timeLimit);
    const gap = Math.max(L.gap.min, speed * (L.gap.seconds - 0.4 * hard));
    patternCount++;
    if (patternCount <= 2) return spawnLaksaLine(s, patternCount === 1 ? 1 : pick([0, 2]), 7) + gap;
    let place = null;
    if (--gebukWait <= 0) { place = L.place; rollGebukWait(); }
    const pools = POOLS[L.env];
    const lanes = shuffle([0, 1, 2]);
    if (!place) {
      const r = Math.random();
      if (pools.lateral.length && r < L.movers) return spawnMoverRow(s, pools) + gap;
      if (pools.narrow.length && r < L.movers + L.narrow) return spawnNarrowRow(s, pools, lanes) + gap;
    }
    const two = place === 'trap' || Math.random() < L.twoLane + 0.2 * hard;
    const blocked = lanes.slice(0, two ? 2 : 1), free = lanes.slice(two ? 2 : 1);
    const skillLane = place === 'skill' ? blocked[0] : -1;
    let len = 0;
    for (const lane of blocked) {
      let type = pickType(hard);
      if (lane === skillLane) type = Math.random() < 0.55 ? 'low' : 'high';     // the gebuk needs a jump or a slide
      else if (place === 'trap') type = 'block';                                 // walls either side
      let kind = pick(pools[type]);
      if (lane === skillLane && OB[kind].spin) kind = pools[type].find((k) => !OB[k].spin) || kind;
      const o = spawnObstacle(kind, lane, s);
      len = Math.max(len, o.depth);
      if (lane === skillLane) spawnGebuk(o.s, lane, type === 'low' ? 2.1 : 0.45);
      else if (type === 'low' && Math.random() < 0.65) spawnLaksaArc(o.s, lane);
    }
    let laksaLanes = free.slice();
    if (place === 'trap') {
      const lane = free[0];
      const type = Math.random() < 0.55 ? 'low' : 'high';
      const kind = pools[type].find((k) => !OB[k].spin) || pick(pools[type]);
      const o = spawnObstacle(kind, lane, s + Math.max(0, len / 2 - 0.35));
      spawnGebuk(o.s, lane, type === 'low' ? 2.1 : 0.45);
      laksaLanes = [];
    } else if (place === 'easy') {
      const lane = pick(free);
      spawnGebuk(s + len / 2, lane, 0.5);
      laksaLanes = free.filter((l) => l !== lane);
    }
    if (laksaLanes.length && Math.random() < 0.8) {
      const n = 4 + Math.floor(Math.random() * 5);
      len = Math.max(len, spawnLaksaLine(s - 1, pick(laksaLanes), n) - 1);
    }
    if (L.powerups.length && Math.random() < PW.chance) { spawnPowerup(pick(L.powerups), s + len + 2.5, pick(free)); len += 3.5; }
    return len + gap;
  }
  function addScenery(mesh, x, s, rot) {
    mesh.position.set(x, 0, dist - s);
    mesh.rotation.y = rot || 0;
    scene.add(mesh);
    scenery.push({ mesh, s });
  }
  function spawnVillage(s) {
    const r = Math.random(), rot = Math.random() * Math.PI * 2;
    if (r < 0.34) addScenery(solid(pick(palmGeos)), -(SIDE + 0.6 + Math.random() * 3), s, rot);
    else if (r < 0.58) addScenery(solid(pick(houseGeos)), -(SIDE + 5 + Math.random() * 3), s, (Math.random() - 0.5) * 0.3);
    else if (r < 0.68) addScenery(makeStall(stallSignMat, 0), -(SIDE + 1.8), s, 0);
    else addScenery(solid(bushGeo), -(SIDE + Math.random() * 2.5), s, rot);
    if (Math.random() < 0.7) {
      const r2 = Math.random(), s2 = s + Math.random() * 3;
      if (r2 < 0.45) addScenery(solid(pick(palmGeos)), SIDE + 0.5 + Math.random() * 2.5, s2, rot);
      else if (r2 < 0.75) addScenery(solid(bushGeo), SIDE + Math.random() * 2.5, s2, rot);
      else addScenery(solid(boatGeo), RIVER_X + 3 + Math.random() * 12, s2, (Math.random() - 0.5) * 0.6);
    }
    return 4.5 + Math.random() * 4;
  }
  function spawnKitchen(s) {
    const left = new THREE.Mesh(pick(wallGeos), MAT.vc), right = new THREE.Mesh(pick(wallGeos), MAT.vc);
    addScenery(left, -(SIDE + 0.9), s, 0);
    addScenery(right, SIDE + 0.9, s, Math.PI);
    addScenery(solid(beamBarGeo), 0, s + 3, 0);
    const r = Math.random();
    if (r < 0.3) addScenery(solid(stoveGeo), (Math.random() < 0.5 ? -1 : 1) * (SIDE + 0.1), s + 1 + Math.random() * 3, 0);
    else if (r < 0.5) addScenery(solid(tempayanGeo), (Math.random() < 0.5 ? -1 : 1) * (SIDE + 0.1), s + 1 + Math.random() * 3, 0);
    else if (r < 0.65) addScenery(solid(sacksGeo), (Math.random() < 0.5 ? -1 : 1) * (SIDE + 0.2), s + 1 + Math.random() * 3, 0);
    return 6;
  }
  function spawnMarket(s) {
    const r = Math.random();
    if (r < 0.5) addScenery(makeStall(marketSignMat, Math.floor(Math.random() * 4)), -(SIDE + 1.6), s, 0.2);
    else if (r < 0.75) addScenery(solid(lanternGeo), -(SIDE + 0.6), s, 0);
    else addScenery(solid(pick(peopleGeos)), -(SIDE + 0.5 + Math.random()), s, Math.random() * 6);
    const r2 = Math.random(), s2 = s + Math.random() * 2;
    if (r2 < 0.5) addScenery(makeStall(marketSignMat, Math.floor(Math.random() * 4)), SIDE + 1.6, s2, -0.2);
    else if (r2 < 0.75) addScenery(solid(lanternGeo), SIDE + 0.6, s2, Math.PI);
    else addScenery(solid(pick(peopleGeos)), SIDE + 0.5 + Math.random(), s2, Math.random() * 6);
    if (Math.random() < 0.35) addScenery(solid(buntingGeo), -(SIDE + 1.1), s + 1, 0);
    if (Math.random() < 0.35) addScenery(solid(buntingGeo), SIDE + 1.1, s + 1, 0);
    return 5 + Math.random() * 3;
  }
  function spawnScenery(s) {
    if (envName === 'kitchen') return spawnKitchen(s);
    if (envName === 'market') return spawnMarket(s);
    return spawnVillage(s);
  }

  /* ----------------------------------------------------------- effects */
  function burst(x, y, z, color) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: color || 0xffd45a, transparent: true, opacity: 0.9 }));
    m.position.set(x, y, z);
    m.rotation.x = Math.PI / 2;
    scene.add(m);
    fx.push({ mesh: m, t: 0, life: 0.35 });
  }
  function updateFx(dt, step) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      f.t += dt;
      const p = f.t / f.life;
      f.mesh.scale.setScalar(0.6 + p * 2.4);
      f.mesh.material.opacity = 0.9 * (1 - p);
      f.mesh.position.z += step;
      if (p >= 1) { scene.remove(f.mesh); f.mesh.material.dispose(); fx.splice(i, 1); }
    }
  }
  function pulse(el) { if (!el) return; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  function flashHit() { ui.hitflash.classList.remove('on'); void ui.hitflash.offsetWidth; ui.hitflash.classList.add('on'); }
  function showBanner(text, secs) {
    ui.banner.textContent = text;
    ui.banner.hidden = false;
    pulse(ui.banner);
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { ui.banner.hidden = true; }, (secs || 2.4) * 1000);
  }

  /* ------------------------------------------------------------- audio */
  const sfx = (() => {
    let ctx = null;
    let muted = false;
    try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { /* ignore */ }
    function ensure() {
      if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } }
      if (ctx && ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone(freq, dur, type, vol, slideTo) {
      const c = ensure();
      if (!c || muted) return;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, c.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.15, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + dur + 0.02);
    }
    function noise(dur, vol, cutoff) {
      const c = ensure();
      if (!c || muted) return;
      const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = c.createBufferSource(); src.buffer = buf;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff || 900;
      const g = c.createGain(); g.gain.value = vol || 0.4;
      src.connect(f); f.connect(g); g.connect(c.destination);
      src.start();
    }
    const seq = (notes, step, dur, type, vol) => notes.forEach((f, i) => setTimeout(() => tone(f, dur, type, vol), i * step));
    return {
      unlock: ensure,
      collect(n) { const base = 740 + Math.min(n, 12) * 40; tone(base, 0.09, 'triangle', 0.12); setTimeout(() => tone(base * 1.5, 0.12, 'triangle', 0.1), 60); },
      jump() { tone(320, 0.18, 'square', 0.05, 640); },
      roll() { tone(220, 0.15, 'sawtooth', 0.04, 120); },
      swipe() { tone(520, 0.06, 'sine', 0.05, 430); },
      power() { seq([523, 659, 784, 1046], 70, 0.16, 'triangle', 0.12); },
      crash() { noise(0.5, 0.5); tone(160, 0.5, 'sawtooth', 0.15, 50); },
      gebuk() {
        if (!ensure() || muted) return;
        noise(0.07, 0.3, 3200);
        [[440, 1.4, 0.2], [880, 1.1, 0.12], [1214, 0.9, 0.08], [1760, 0.7, 0.06], [2378, 0.5, 0.04]].forEach(([f, dur, vol]) => tone(f, dur, 'sine', vol));
        setTimeout(() => tone(1318, 0.45, 'triangle', 0.1), 140);
        setTimeout(() => tone(1760, 0.7, 'triangle', 0.09), 280);
      },
      mission() { seq([659, 784, 1046, 1318], 90, 0.25, 'triangle', 0.13); },
      fanfare() { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => setTimeout(() => tone(f, i === 6 ? 0.6 : 0.18, 'triangle', 0.13), i * 110)); },
      gameover() { seq([392, 330, 262, 196], 180, 0.35, 'sawtooth', 0.08); },
      shieldHit() { tone(1200, 0.25, 'sine', 0.12, 600); noise(0.1, 0.2, 2000); },
      smash() { noise(0.15, 0.3, 1500); tone(200, 0.12, 'square', 0.06, 80); },
      boost() { tone(200, 0.5, 'sawtooth', 0.08, 1200); },
      count(go) { if (go) tone(880, 0.5, 'square', 0.08); else tone(440, 0.12, 'square', 0.07); },
      get muted() { return muted; },
      get ctx() { return ctx; },
      toggle() { muted = !muted; saveVal(MUTE_KEY, muted ? 1 : 0); return muted; },
    };
  })();
  function syncSoundLabels() {
    ui.mute.textContent = sfx.muted ? '🔇' : '🔊';
    ui.mute.setAttribute('aria-pressed', sfx.muted ? 'true' : 'false');
    ui.hubSound.textContent = sfx.muted ? '🔇' : '🔊';
    ui.gamesSound.classList.toggle('is-muted', sfx.muted);
    ui.gamesSound.setAttribute('aria-pressed', sfx.muted ? 'true' : 'false');
    ui.pauseSound.textContent = 'BUNYI: ' + (sfx.muted ? 'OFF' : 'ON');
    ui.settingsSound.textContent = 'BUNYI: ' + (sfx.muted ? 'OFF' : 'ON');
  }
  syncSoundLabels();

  /* ------------------------------------------------------------- music */
  // Menu theme (config.js → music): plays on the register screen and every menu / hub screen, pauses
  // while a game is running, while the page is hidden or while sound is off. It starts from the top when the
  // player enters the games hub after signing in and whenever a menu screen returns after a game.
  // The track plays once from `startAt`, then loops the section from `loopStart` to the end of the file.
  // Web Audio gives a gapless loop; an <audio> element is the fallback (file://, decode failure).
  const music = (() => {
    const M = Object.assign({ src: '', startAt: 0, loopStart: 0, volume: 0.35, fade: 0.5 }, CFG.music || {});
    let buf = null, node = null, gain = null, el = null, loading = null, failed = false;
    let wanted = false, hooked = null, startedAt = 0, offset = M.startAt;
    const loopLen = () => (buf ? Math.max(0.5, buf.duration - M.loopStart) : 0);
    function position() {                      // seconds into the file, folding the loop region
      if (el) return el.currentTime;
      if (!node || !hooked) return offset;
      let pos = offset + (hooked.currentTime - startedAt);
      if (buf && pos >= buf.duration) pos = M.loopStart + ((pos - M.loopStart) % loopLen());
      return pos;
    }
    function hook(c) { if (hooked !== c) { hooked = c; c.addEventListener('statechange', poke); } }
    function load(c) {
      if (loading || failed || buf) return;
      loading = fetch(M.src).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.arrayBuffer(); })
        .then((ab) => new Promise((ok, no) => c.decodeAudioData(ab, ok, no)))
        .then((b) => { buf = b; poke(); })
        .catch(() => { failed = true; poke(); });     // → <audio> fallback
    }
    function playEl() {
      if (!el) {
        el = new Audio(M.src);
        el.preload = 'auto';
        el.addEventListener('timeupdate', () => { if (el.duration && el.currentTime >= el.duration - 0.15) el.currentTime = M.loopStart; });
        el.addEventListener('ended', () => { el.currentTime = M.loopStart; if (wanted) el.play().catch(() => { /* needs a gesture */ }); });
        el.currentTime = offset;
      }
      if (!el.paused) return;
      el.volume = M.volume;
      el.play().catch(() => { /* starts on the next tap / key */ });
    }
    function play() {
      if (!M.src) return;
      const c = sfx.ctx || sfx.unlock();
      if (!c) { playEl(); return; }
      hook(c);
      if (failed) { playEl(); return; }
      if (!buf) { load(c); return; }
      if (c.state !== 'running' || node) return;   // starts on the first tap / key (statechange → poke)
      gain = c.createGain();
      gain.gain.setValueAtTime(0.0001, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(M.volume, c.currentTime + M.fade);
      gain.connect(c.destination);
      node = c.createBufferSource();
      node.buffer = buf;
      node.loop = true; node.loopStart = M.loopStart; node.loopEnd = buf.duration;
      node.connect(gain);
      if (offset >= buf.duration) offset = M.loopStart;
      node.start(0, offset);
      startedAt = c.currentTime;
    }
    function stop() {
      if (el) { offset = el.currentTime; el.pause(); }
      if (!node) return;
      const c = hooked, n = node, g = gain, t = c.currentTime;
      offset = position();
      node = null; gain = null;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      n.stop(t + 0.32);
      n.onended = () => { try { n.disconnect(); g.disconnect(); } catch (e) { /* ignore */ } };
    }
    function poke() { if (wanted) play(); }
    function restart() {                       // back to the top (the intro): now if playing, otherwise on the next play
      if (el) { el.currentTime = M.startAt; return; }
      const was = !!node;
      if (was) stop();
      offset = M.startAt;
      if (was) play();
    }
    // fromTop: while off for this reason (a game is running) the next play starts from the top again;
    // off for other reasons (sound off, tab hidden) it resumes where it stopped.
    function sync(want, fromTop) {
      want = !!want;
      if (want !== wanted) { wanted = want; if (want) play(); else stop(); }
      else if (want && !node && !el) play();       // keep trying until the file is decoded and the context runs
      if (!want && fromTop) { offset = M.startAt; if (el && el.currentTime !== M.startAt) el.currentTime = M.startAt; }
    }
    return {
      sync, poke, restart, position, config: M,
      get playing() { return !!node || !!(el && !el.paused); },
      get wanted() { return wanted; }, get loaded() { return !!buf; }, get failed() { return failed; },
      get mode() { return el ? 'element' : 'buffer'; }, get duration() { return buf ? buf.duration : (el ? el.duration || 0 : 0); },
      get loop() { return node ? { loop: node.loop, start: node.loopStart, end: +node.loopEnd.toFixed(3) } : null; },
    };
  })();
  // iPhone / iPad: Web Audio is silenced by the ring/silent switch unless a media element is playing, so a silent
  // looping <audio> started on the first gesture lets the music through (the same trick as unmute.js).
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let iosUnmute = null;
  function silentWavUrl(seconds, rate) {
    const n = Math.floor(seconds * rate), ab = new ArrayBuffer(44 + n * 2), v = new DataView(ab);
    const str = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true);
    return URL.createObjectURL(new Blob([ab], { type: 'audio/wav' }));
  }
  function iosUnlock() {
    if (!isIOS || iosUnmute) return;
    try {
      iosUnmute = new Audio(silentWavUrl(0.5, 8000));
      iosUnmute.loop = true;
      iosUnmute.play().catch(() => { iosUnmute = null; });   // not in a gesture yet: try again on the next one
    } catch (e) { iosUnmute = null; }
  }
  // Browsers only start audio after a tap or key press: unlock the context on the first one so the menu music can begin.
  const unlockAudio = () => { sfx.unlock(); iosUnlock(); music.poke(); };
  ['pointerdown', 'keydown', 'touchend'].forEach((ev) => document.addEventListener(ev, unlockAudio, { passive: true }));

  /* ----------------------------------------------------------- actions */
  function move(dir) {
    if (state !== 'playing') return;
    const nl = Math.min(2, Math.max(0, player.lane + dir));
    if (nl !== player.lane) { player.lane = nl; sfx.swipe(); }
  }
  function jump() {
    if (state !== 'playing' || player.jumping) return;
    player.rolling = false;
    player.jumping = true;
    player.vy = JUMP_V;
    sfx.jump();
  }
  function startRoll() { player.rolling = true; player.rollT = ROLL_TIME; sfx.roll(); }
  function roll() {
    if (state !== 'playing') return;
    if (player.jumping) { player.vy = Math.min(player.vy, SLAM_V); player.queuedRoll = true; return; }
    startRoll();
  }
  function togglePause() {
    if (state === 'playing' || state === 'ready') { pausedFrom = state; state = 'paused'; ui.pause.hidden = false; }
    else if (state === 'paused') { state = pausedFrom; ui.pause.hidden = true; }
  }
  let pausedFrom = 'playing';

  /* --------------------------------------------------------- game flow */
  function hideScreens() { for (const id of SCREENS) ui[id].hidden = true; ui.intro.hidden = true; }
  // startLives: the hearts this attempt begins with (a fresh CFG.lives, or the hearts carried over).
  function resetRun(startLives) {
    clearList(obstacles); clearList(laksas); clearList(powerups); clearList(gebuks);
    for (const f of fx) { scene.remove(f.mesh); f.mesh.material.dispose(); }
    fx.length = 0;
    const L = curLevel();
    speed = L.speed.start; score = 0; laksaCount = 0; runTime = 0; runDist = 0; magnetT = 0; patternCount = 0; combo = 0;
    gebukRun = 0; levelCount = 0; livesLost = 0; invT = 0; shield = false; boostT = 0; hitObstacle = null;
    lives = Math.max(1, Math.min(CFG.lives, typeof startLives === 'number' ? startLives : CFG.lives));
    livesAtLevelStart = lives;
    runStats = freshRunStats();
    levelStart = dist; clock = 0; lastBeep = -1; levelBanked = false;
    earned.clear();
    ui.timer.classList.remove('low');
    rollGebukWait();
    nextS = dist + 28;
    player.lane = 1; player.x = 0; player.y = 0; player.vy = 0;
    player.jumping = false; player.rolling = false; player.rollT = 0; player.queuedRoll = false;
    player.group.rotation.set(0, 0, 0); player.group.position.set(0, 0, 0); player.group.scale.set(1, 1, 1); player.group.visible = true;
    player.aura.visible = false; player.bubble.visible = false;
  }
  function startGame(startLives) {
    setStage(false);
    envName = '';
    applyEnv(curLevel().env);
    ui.mute.hidden = false;
    resetRun(typeof startLives === 'number' ? startLives : CFG.lives);
    state = 'ready';
    readyT = CFG.readyCountdown;
    countdownShown = '';
    overShown = false;
    hideScreens();
    ui.hud.hidden = false;
    ui.banner.hidden = true;
    ui.hint.textContent = coarse
      ? 'Swipe ◂ ▸ to change lane · swipe ▴ or tap to jump · swipe ▾ to slide'
      : '◂ ▸ change lane · ▴ or Space to jump · ▾ or Shift to slide · P to pause';
    ui.hint.hidden = false;
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { ui.hint.hidden = true; }, 6000);
    sfx.unlock();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    updateHearts();
    updateMissionHud();
    updatePowerHud();
    renderAchievements(ui.achievements);
    updateHud();
  }
  function updateHearts() {
    ui.hearts.forEach((h, i) => {
      const lost = i >= lives;
      if (lost && !h.classList.contains('lost')) pulse(h);
      h.classList.toggle('lost', lost);
    });
  }
  function removeObstacle(o) {
    const i = obstacles.indexOf(o);
    if (i >= 0) { scene.remove(o.mesh); obstacles.splice(i, 1); }
  }
  function crash(o) {
    hitObstacle = o || null;
    if (shield) {                          // the tudung saji takes the hit
      shield = false;
      updatePowerHud();
      invT = CFG.shieldGrace;
      shake = 0.3;
      sfx.shieldHit();
      flashHit();
      if (o) { burst(o.x, 1.0, dist - o.s, 0xffffff); removeObstacle(o); }
      showBanner('Tudung saji pecah!', 1.4);
      return;
    }
    deathT = 0; deathY = player.y; shake = 0.6; speedBeforeHit = speed;
    sfx.crash();
    flashHit();
    lives -= 1; livesLost += 1;
    updateHearts();
    magnetT = 0; boostT = 0;
    updatePowerHud();
    player.aura.visible = false;
    player.legL.rotation.x = -1.2; player.legR.rotation.x = 0.8; player.armL.rotation.x = -2.6; player.armR.rotation.x = -2.2;
    if (lives > 0) {
      state = 'hit';
      showBanner('♥ ' + lives + ' left', 1.6);
      return;
    }
    state = 'dead';
    sfx.gameover();
    logRun('crashed');
    const s = runTotal();
    isNewBest = s > best && s > 0;
    if (isNewBest) { best = s; saveVal(BEST_KEY, best); }
    ui.hint.hidden = true;
  }
  // Back on the road after a lost heart: clear the obstacles just ahead, slow down a little, blink safely.
  function revive() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const z = dist - obstacles[i].s;
      if (z > -45 && z < 6) { scene.remove(obstacles[i].mesh); obstacles.splice(i, 1); }
    }
    player.y = 0; player.vy = 0; player.jumping = false; player.rolling = false; player.queuedRoll = false;
    player.group.rotation.set(0, 0, 0);
    player.group.position.set(player.x, 0, 0);
    player.group.scale.set(1, 1, 1);
    speed = Math.max(curLevel().speed.start, speedBeforeHit * 0.75);
    invT = CFG.invincibleAfterHit;
    state = 'playing';
  }
  function updateHit(dt) {
    deathT += dt;
    const g = player.group;
    g.rotation.x = Math.min(Math.PI / 2, deathT * 4.5);
    g.position.z = Math.min(2.5, deathT * 4);
    g.position.y = Math.max(0, deathY - deathT * 6);
    if (deathT > 1.0) revive();
  }
  function updateDeath(dt) {
    deathT += dt;
    const g = player.group;
    g.rotation.x = Math.min(Math.PI / 2, deathT * 4.5);
    g.position.z = Math.min(2.5, deathT * 4);
    g.position.y = Math.max(0, deathY - deathT * 6);
    if (deathT > 1.1 && !overShown) showGameOver();
  }
  function renderAchievements(container) {
    container.replaceChildren();
    for (const a of ACH) {
      const el = document.createElement('span');
      el.className = 'ach' + (earned.has(a.id) ? ' lit' : '');
      el.textContent = a.icon;
      el.title = a.name + ': ' + a.desc;
      el.dataset.id = a.id;
      container.append(el);
    }
  }
  function award(id) {
    if (earned.has(id)) return;
    earned.add(id);
    const el = ui.achievements.querySelector('[data-id="' + id + '"]');
    if (el) { el.classList.add('lit'); pulse(el); }
    const a = ACH.find((x) => x.id === id);
    if (a) showBanner(a.icon + ' ' + a.name + '!', 1.6);
  }
  // A level is done the moment both of its missions are complete, before the clock runs out.
  function checkMissions() {
    if (state !== 'playing') return;
    const L = curLevel();
    if (levelCount < L.need || laksaCount < L.laksaTarget) return;
    runStats.levelBonus = SC.level; score += SC.level;
    if (livesLost === 0) { runStats.flawless = SC.flawless; score += SC.flawless; award('flawless'); }
    if (clock <= CFG.fastSeconds) award('fast');
    if (level === FREE - 1) {                                  // the time bonus comes once, at the end of the run
      runStats.timeBonus = Math.min(SC.timeBonusMax, Math.floor(timeLeft()) * SC.timeBonusPerSecond);
      score += runStats.timeBonus;
    }
    runStats.finished = true;
    completeLevel();
  }
  function levelTimeUp() {
    state = 'incomplete';
    wonT = 0; overShown = false;
    ui.hint.hidden = true;
    magnetT = 0; boostT = 0; updatePowerHud();
    player.aura.visible = false; player.bubble.visible = false;
    const tot = runTotal();
    if (tot > best) { best = tot; saveVal(BEST_KEY, best); }
    logRun('incomplete');
    sfx.gameover();
    showBanner('MASA TAMAT', 2.5);
  }
  function completeLevel() {
    progress.completed[level] = true;
    progress.unlocked = Math.max(progress.unlocked, Math.min(FREE, level + 1));
    campaignUsed += clock;                 // bank this level into the run
    campaignScore += score; campaignLaksa += laksaCount; campaignGebuk += gebukRun; campaignAch += earned.size;
    levelBanked = true;
    if (campaignScore > best) { best = campaignScore; saveVal(BEST_KEY, best); }
    logRun('won');                        // also saves the new progress with the player's record
    state = 'won';
    wonT = 0;
    overShown = false;
    ui.hint.hidden = true;
    player.aura.visible = false; player.bubble.visible = false;
    sfx.fanfare();
    showBanner('LEVEL ' + (level + 1) + ' SELESAI! +' + (runStats.levelBonus + runStats.flawless + runStats.timeBonus), 3);
  }
  function updateWon(dt) {
    wonT += dt;
    const g = player.group;
    g.position.set(player.x, Math.abs(Math.sin(wonT * 7)) * 0.5, 0);
    g.rotation.set(0, Math.sin(wonT * 3) * 0.35, 0);
    g.scale.set(1, 1, 1);
    player.armL.rotation.x = -2.8; player.armR.rotation.x = -2.8;
    player.legL.rotation.x = 0.3; player.legR.rotation.x = -0.3;
    if (wonT > 1.8 && !overShown) showComplete();
  }
  function updateIncomplete(dt) {
    wonT += dt;
    const g = player.group;
    g.position.set(player.x, 0, 0);
    g.rotation.set(0.15, 0, 0);
    player.armL.rotation.x = 0.2; player.armR.rotation.x = 0.2; player.legL.rotation.x = 0; player.legR.rotation.x = 0;
    if (wonT > 1.4 && !overShown) showIncomplete();
  }
  function fmt(n) { return Math.floor(n).toLocaleString(); }
  function showComplete() {
    overShown = true;
    ui.hud.hidden = true;
    const L = curLevel(), nextIdx = level + 1;
    ui.completeTitle.textContent = 'MISI SELESAI!';
    ui.completeLevel.textContent = 'Level ' + (level + 1) + ' · ' + L.title + ' · missions done in ' + fmtClock(clock)
      + (nextIdx < FREE ? ' · ' + '♥'.repeat(lives) + ' and ' + fmtClock(timeLeft()) + ' carried into level ' + (nextIdx + 1) : '');
    ui.cLaksa.textContent = laksaCount + ' / ' + L.laksaTarget;
    ui.cGebuk.textContent = levelCount + ' / ' + L.need;
    ui.cLives.textContent = '♥'.repeat(lives) + '♡'.repeat(CFG.lives - lives);
    ui.cScore.textContent = fmt(score);
    ui.cTotal.textContent = fmt(campaignScore);
    ui.cTimeleft.textContent = fmtClock(timeLeft());
    ui.bLaksa.textContent = laksaCount + ' × ' + SC.laksa + ' = ' + fmt(runStats.laksaPts);
    ui.bGebuk.textContent = gebukRun + ' × ' + SC.gebuk + ' = ' + fmt(runStats.gebukPts);
    ui.bMission.textContent = '+' + fmt(runStats.mission);
    ui.bLevel.textContent = '+' + fmt(runStats.levelBonus);
    ui.bFlawless.textContent = runStats.flawless ? '+' + fmt(runStats.flawless) : '–';
    ui.bTime.textContent = level === FREE - 1 ? fmtClock(timeLeft()) + ' left · +' + fmt(runStats.timeBonus) : fmtClock(timeLeft()) + ' carried to the next level';
    renderAchievements(ui.cAch);
    ui.bTotal.textContent = fmt(score);
    if (nextIdx < FREE) {
      ui.completeBadge.textContent = 'LEVEL ' + (nextIdx + 1) + ' DIBUKA';
      ui.next.textContent = 'MAIN LEVEL ' + (nextIdx + 1);
    } else {
      ui.completeBadge.textContent = 'HERITAGE MASTER';
      ui.next.textContent = 'KEPUTUSAN AKHIR';
    }
    ui.bestStart.textContent = best;
    showRank(ui.completeRank);
    ui.complete.hidden = false;
  }
  function showIncomplete() {
    overShown = true;
    ui.hud.hidden = true;
    ui.iLevel.textContent = 'The ' + CFG.timeLimit + ' seconds ran out during level ' + (level + 1) + ' · ' + curLevel().title + '. Start the run again from level 1.';
    ui.iGebuk.textContent = Math.min(levelCount, curLevel().need);
    ui.iNeed.textContent = curLevel().need;
    ui.iLaksa.textContent = Math.min(laksaCount, curLevel().laksaTarget);
    ui.iLaksaTarget.textContent = curLevel().laksaTarget;
    ui.iScore.textContent = fmt(runTotal());
    ui.iLives.textContent = '♥'.repeat(lives) + '♡'.repeat(CFG.lives - lives) + (CFG.livesCarryOver ? ' (kept for the retry)' : '');
    ui.incomplete.hidden = false;
  }
  function showGameOver() {
    overShown = true;
    ui.hud.hidden = true;
    ui.finalScore.textContent = fmt(runTotal());
    ui.finalLaksa.textContent = laksaCount;
    ui.finalGebuk.textContent = levelCount + ' / ' + curLevel().need;
    ui.finalDist.textContent = Math.floor(runDist) + ' m';
    ui.newBest.hidden = !isNewBest;
    ui.finalMission.textContent = 'Level ' + (level + 1) + ' · ' + curLevel().title + ' · all ' + CFG.lives + ' ♥ lost · ' + fmtClock(timeLeft()) + ' was left';
    ui.bestStart.textContent = best;
    showRank(ui.finalRank);
    ui.over.hidden = false;
  }
  function showFinal() {
    state = 'menu';
    hideScreens();
    ui.hud.hidden = true; ui.banner.hidden = true;
    ui.fScore.textContent = fmt(campaignScore);
    ui.fTime.textContent = fmtClock(timeLeft());
    ui.fLives.textContent = '♥'.repeat(lives) + '♡'.repeat(CFG.lives - lives);
    ui.fAch.textContent = campaignAch + ' / ' + (ACH.length * 3);
    ui.fLaksa.textContent = fmt(campaignLaksa);
    ui.fGebuk.textContent = fmt(campaignGebuk);
    resetRun();
    ui.final.hidden = false;
  }
  function startCampaign(from) {
    level = typeof from === 'number' ? Math.max(0, Math.min(progress.unlocked, Math.min(FREE - 1, from))) : 0;
    campaignUsed = 0; campaignScore = 0; campaignLaksa = 0; campaignGebuk = 0; campaignAch = 0;
    startGame(CFG.lives);
  }
  const startSelected = () => startCampaign(selectedLevel);
  const carried = () => (CFG.livesCarryOver ? lives : CFG.lives);
  function nextLevel() {
    if (level + 1 >= FREE) { showFinal(); return; }
    level += 1;
    startGame(carried());                 // hearts and time left come along; the level clock restarts at 0
  }
  function menuState() {
    resetRun();
    state = 'menu';
    overShown = false;
    hideScreens();
    ui.hud.hidden = true; ui.banner.hidden = true; ui.countdown.hidden = true;
    ui.mute.hidden = false;
    setStage(true);
  }
  function goBack() {
    if (backTo === 'register') showRegister();                                   // the leaderboard opened from the sign-in page
    else if (backTo === 'games' && window.LaksaArcade) window.LaksaArcade.showGames();
    else showHub();
  }
  function showHub() {
    menuState();
    backTo = 'hub';
    if (selectedLevel > progress.unlocked) selectedLevel = progress.unlocked;
    renderLevelSelect();
    ui.mute.hidden = true;                 // the menu has its own sound button
    ui.hub.hidden = false;
  }
  function showSettings() { menuState(); syncSoundLabels(); ui.settings.hidden = false; }
  function showAchievements() {
    menuState();
    ui.achvList.replaceChildren();
    const got = ((GebokStore.current() || {}).achievements) || {};
    LEVELS.forEach((L, i) => {
      const row = document.createElement('div'); row.className = 'achv-row';
      const name = document.createElement('div'); name.className = 'achv-level'; name.textContent = 'Level ' + (i + 1) + ' · ' + L.title;
      const badges = document.createElement('div'); badges.className = 'achievements';
      const mine = new Set(got[String(i + 1)] || []);
      for (const a of ACH) {
        const el = document.createElement('span');
        el.className = 'ach' + (mine.has(a.id) ? ' lit' : '');
        el.textContent = a.icon; el.title = a.name + ': ' + a.desc;
        badges.append(el);
      }
      const count = document.createElement('span'); count.className = 'lb-sub'; count.textContent = mine.size + ' / ' + ACH.length;
      row.append(name, badges, count);
      ui.achvList.append(row);
    });
    ui.achv.hidden = false;
  }
  function showHowto() { menuState(); ui.bestStart.textContent = best; ui.howto.hidden = false; }
  function showStory() {
    menuState();
    ui.storyCards.replaceChildren();
    LEVELS.forEach((L, i) => {
      const card = document.createElement('div'); card.className = 'story-card';
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); icon.setAttribute('class', 'gebuk-icon');
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use'); use.setAttribute('href', '#gebuk-svg'); icon.append(use);
      const body = document.createElement('div');
      const t = document.createElement('div'); t.className = 'story-title'; t.textContent = 'Level ' + (i + 1) + ' · ' + L.heritage.title;
      const x = document.createElement('div'); x.className = 'story-text'; x.textContent = L.heritage.text;
      body.append(t, x); card.append(icon, body); ui.storyCards.append(card);
    });
    ui.storyNote.textContent = CFG.heritageNote;
    ui.story.hidden = false;
  }
  function renderLevelSelect() {
    const got = ((GebokStore.current() || {}).achievements) || {};
    ui.cards.forEach((b) => {
      const i = +b.dataset.level;
      const done = progress.completed[i], locked = i > progress.unlocked;
      const st = b.querySelector('.lv-status');
      b.disabled = locked;
      b.classList.toggle('done', done);
      b.classList.toggle('locked', locked);
      b.classList.toggle('selected', i === selectedLevel && !locked);
      b.setAttribute('aria-pressed', i === selectedLevel ? 'true' : 'false');
      st.classList.toggle('lock', locked);
      if (locked) st.textContent = '🔒';
      else if (done) { const n = (got[String(i + 1)] || []).length; st.textContent = n >= ACH.length ? '★★★' : n >= 3 ? '★★☆' : '★☆☆'; }
      else st.textContent = '▶ Sedia';
      b.title = locked ? 'Selesaikan level ' + i + ' dahulu' : LEVELS[i].need + ' gebuk · ' + LEVELS[i].laksaTarget + ' laksa · ' + LEVELS[i].theme;
    });
    const L = LEVELS[selectedLevel];
    ui.hubNote.textContent = 'Mula dari Level ' + (selectedLevel + 1) + ' · ' + L.need + ' gebuk · ' + L.laksaTarget + ' laksa · ' + CFG.timeLimit + ' s dan 3 ♥ untuk larian';
    ui.hubPlayer.textContent = (GebokStore.current() || {}).username || '';
  }
  function selectLevel(i) {
    if (i > progress.unlocked) return;
    selectedLevel = i;
    renderLevelSelect();
    sfx.swipe();
  }

  /* ---------------------------------------------- players and records */
  let lastLog = Promise.resolve();
  function logRun(result) {
    const run = {
      at: new Date().toISOString(), level: level + 1, result,
      score: Math.floor(score), campaignScore: runTotal(), laksa: laksaCount, gebuk: gebukRun, need: curLevel().need,
      laksaTarget: curLevel().laksaTarget, distance: Math.floor(runDist), time: +clock.toFixed(1),
      timeLimit: CFG.timeLimit, timeLeft: +timeLeft().toFixed(1), timeBonus: runStats.timeBonus, achievements: Array.from(earned),
      maxSpeed: +Math.max(speed, speedBeforeHit).toFixed(1), livesLost, livesStart: livesAtLevelStart, missionDone: runStats.missionDone, finished: runStats.finished,
    };
    lastLog = GebokStore.recordRun(run, progress).catch(() => { /* the run stays in this session's HUD only */ });
  }
  function showRank(el) {
    el.textContent = '';
    const me = GebokStore.current();
    if (!me) return;
    lastLog.then(() => GebokStore.fetchLeaderboard(1)).then((lb) => {
      const i = lb.all.findIndex((r) => r.id === me.id);
      if (i >= 0) el.textContent = 'Leaderboard rank #' + (i + 1) + ' of ' + lb.all.length + ' · best run ' + (lb.all[i].bestScore || 0).toLocaleString();
    }).catch(() => { /* no rank shown */ });
  }
  let lbTimer = 0, lbKey = 'bestScore';
  const LB_EMPTY = { bestScore: 'No scores yet. Finish a run to appear here.', platformBest: 'Belum ada skor Laksa Quest. Tamatkan satu level untuk muncul di sini.', crosswordBest: 'Belum ada skor Teka Silang Laksa. Lengkapkan teka silang kata untuk muncul di sini.', wordsearchBest: 'Belum ada skor Cari Kata Laksa. Jumpai semua perkataan untuk muncul di sini.' };
  function lbSub(r) {
    if (lbKey === 'platformBest') return 'Laksa Quest · ' + (r.platformPlays || 0) + ' play' + (r.platformPlays === 1 ? '' : 's');
    if (lbKey === 'crosswordBest') return 'Teka Silang Laksa · ' + (r.crosswordPlays || 0) + ' play' + (r.crosswordPlays === 1 ? '' : 's');
    if (lbKey === 'wordsearchBest') return 'Cari Kata Laksa · ' + (r.wordsearchPlays || 0) + ' play' + (r.wordsearchPlays === 1 ? '' : 's');
    return r.levels + '/3 levels · ' + (r.gebuk || 0) + ' gebuk · ' + (r.runs || 0) + ' run' + (r.runs === 1 ? '' : 's');
  }
  function renderLeaderboard(lb) {
    const me = GebokStore.current();
    ui.lbList.replaceChildren();
    if (!lb.rows.length) { const li = document.createElement('li'); li.className = 'lb-empty'; li.textContent = LB_EMPTY[lbKey] || LB_EMPTY.bestScore; ui.lbList.append(li); }
    const medals = ['🥇', '🥈', '🥉'];
    lb.rows.forEach((r, i) => {
      const li = document.createElement('li');
      li.className = 'lb-row' + (me && r.id === me.id ? ' me' : '');
      const rank = document.createElement('span'); rank.className = 'lb-rank' + (i < 3 ? ' top' : ''); rank.textContent = i < 3 ? medals[i] : String(i + 1);
      const who = document.createElement('span');
      const name = document.createElement('div'); name.className = 'lb-name'; name.textContent = r.username || '(no name)';
      const sub = document.createElement('div'); sub.className = 'lb-sub';
      sub.textContent = lbSub(r);
      who.append(name, sub);
      const sc = document.createElement('span'); sc.className = 'lb-score'; sc.textContent = (r[lbKey] || 0).toLocaleString();
      li.append(rank, who, sc);
      ui.lbList.append(li);
    });
    const i = me ? lb.all.findIndex((r) => r.id === me.id) : -1;
    ui.lbMe.hidden = i < 0;
    if (i >= 0) ui.lbMe.textContent = 'You (' + me.username + '): rank #' + (i + 1) + ' of ' + lb.all.length + ' · best ' + (lb.all[i][lbKey] || 0).toLocaleString();
  }
  function setLbTab(key) {
    lbKey = key;
    for (const b of ui.lbTabs.querySelectorAll('.lb-tab')) { const on = b.dataset.key === key; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); }
    loadLeaderboard();
  }
  function loadLeaderboard() {
    ui.lbStatus.textContent = 'Loading…';
    clearTimeout(lbTimer);
    lbTimer = setTimeout(() => { ui.lbStatus.textContent = 'The database has not answered yet. Scores may be out of date.'; }, 10000);
    const key = lbKey;
    lastLog.then(() => GebokStore.fetchLeaderboard(10, key)).then((lb) => {
      if (key !== lbKey) return;
      clearTimeout(lbTimer);
      renderLeaderboard(lb);
      ui.lbStatus.textContent = 'Top ' + lb.rows.length + ' of ' + lb.all.length + ' player' + (lb.all.length === 1 ? '' : 's') + ' · updated ' + new Date().toLocaleTimeString();
    }).catch(() => { clearTimeout(lbTimer); ui.lbStatus.textContent = 'Could not load the leaderboard.'; });
  }
  function showLeaderboard() {
    menuState();
    ui.leaderboard.hidden = false;
    loadLeaderboard();
  }
  function updateStoreStatus(text) {
    if (text) { ui.storeStatus.textContent = text; return; }
    const i = GebokStore.info();
    ui.storeStatus.textContent = i.mode === 'cloud'
      ? 'Records are saved to the shared database.'
      : i.mode === 'supabase' ? 'Records are saved online.'
        : 'Records are saved on this device only' + (i.reason && i.reason !== 'standalone copy' ? ' (' + i.reason + ')' : '') + '.';
    const adminLink = i.admin || i.mode === 'supabase';   // online: the admin page asks for its key
    ui.adminLink.hidden = !adminLink;
    ui.adminLinkHub.hidden = !adminLink;
  }
  // Sign-in is by player name. A new name asks for the e-mail once ('register'); a registered name asks for its e-mail to confirm it ('verify').
  const STEP_LABEL = { name: 'MULA BERMAIN', register: 'DAFTAR & MULA', verify: 'SAHKAN & MULA' };
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const normText = (t) => (t || '').trim().toLowerCase();
  let stepMode = 'name', pendingProfile = null;   // pendingProfile: the registered record waiting for its e-mail
  let signInRun = 0;                               // bumped by showRegister(): a sign-in flow from before the reset stops quietly
  function registerStep(mode) {
    stepMode = mode;
    if (mode !== 'verify') pendingProfile = null;
    const withEmail = mode !== 'name';
    ui.emailField.hidden = !withEmail;
    ui.registerNote.hidden = !withEmail;
    ui.registerNote.textContent = mode === 'register' ? 'Daftar Alamat E-Mel: alamat e-mel diminta untuk kali pertama sahaja.'
      : mode === 'verify' ? 'Pengesahan E-Mel: masukkan alamat e-mel yang didaftarkan untuk ' + (pendingProfile ? pendingProfile.username : 'nama ini') + '.' : '';
    ui.registerBtnText.textContent = STEP_LABEL[mode];
    ui.registerError.hidden = true;
    if (withEmail) ui.email.value = '';
    if (mode === 'name') fieldState(ui.username.parentElement, '');
    fieldState(ui.emailField, '');
  }
  // 'ok' = green tick, 'error' = red cross inside the input, '' = plain (cleared again as soon as the player types)
  function fieldState(field, state) { if (state) field.dataset.state = state; else delete field.dataset.state; }
  async function refreshStore() {
    updateStoreStatus('Connecting to the database…');
    try { await GebokStore.ready; } catch (e) { /* info() reports the fallback */ }
    updateStoreStatus();
    try {                                        // the player this device used last only confirms the name
      const name = await GebokStore.rememberedName();
      if (name && !ui.username.value) ui.username.value = name;
    } catch (e) { /* ignore */ }
  }
  function showRegister() {
    menuState();
    signInRun++;
    popupHide();
    ui.register.hidden = false;
    ui.username.value = ''; ui.email.value = '';
    registerStep('name');
    refreshStore();
  }
  function useProfile(p) {
    GebokStore.select(p);
    progress = { unlocked: Math.min(FREE, Math.max(0, p.unlocked | 0)), completed: LEVELS.map((_, i) => !!(p.completed && p.completed[i])) };
    level = 0;
    music.restart();                       // the menu page opens with the theme from the top
    window.LaksaArcade.showGames();
    intro.show(true);                      // the heritage pages cover the menu until the last one is read
  }
  // Heritage intro (CFG.heritageIntro): "Maklumat Laksa Gebok" over the games menu. show(true) right after sign-in, when every
  // page must be turned before the menu; show(false) from the menu's "i" button, when the tabs are free and KEMBALI on page 1 closes.
  const intro = (() => {
    const pages = CFG.heritageIntro || [];
    let i = 0, seen = 0, required = false;
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
    function list(items, ordered) { const l = el(ordered ? 'ol' : 'ul'); for (const t of items || []) l.append(el('li', '', t)); return l; }
    function img(src, alt) { const m = el('img'); m.src = src; m.alt = alt || ''; m.loading = 'lazy'; return m; }
    function tabs() {
      ui.introTabs.replaceChildren(...pages.map((p, k) => {
        const b = el('button', 'intro-tab' + (k === i ? ' on' : ''));
        b.type = 'button';
        b.disabled = required && k > seen;         // after sign-in the pages open in order
        b.setAttribute('aria-current', k === i ? 'page' : 'false');
        b.append(el('span', 'intro-tab-ico', p.icon || ''), el('span', 'intro-tab-label', p.tab || p.title));
        b.addEventListener('click', () => go(k));
        return b;
      }));
    }
    function render() {
      const p = pages[i];
      const body = ui.introBody;
      body.replaceChildren();
      const title = el('h3', 'intro-title'); title.append(el('span', '', p.title)); body.append(title);
      const page = el('div', 'intro-page' + (p.figure ? '' : ' no-figure'));
      if (p.figure) {
        const fig = el('figure', 'intro-figure');
        fig.append(img(p.figure.image, p.figure.alt));
        if (p.figure.label) fig.append(el('span', 'intro-brush', p.figure.label));
        if (p.figure.caption) fig.append(el('figcaption', '', p.figure.caption));
        page.append(fig);
      }
      const text = el('div', 'intro-text');
      const pointRows = (arr) => { for (const pt of arr || []) { const row = el('div', 'intro-point'); row.append(el('span', 'intro-ico', pt.icon || '•'), el('p', '', pt.text)); text.append(row); } };
      if (p.lead) text.append(el('p', 'intro-lead', p.lead));
      pointRows(p.points);
      if (p.steps) { const steps = list(p.steps, true); steps.className = 'intro-steps'; text.append(steps); }
      if (p.gallery) {                         // captioned photos of the steps
        const g = el('div', 'intro-gallery');
        for (const ph of p.gallery) { const f = el('figure'); f.append(img(ph.image, ph.caption || '')); if (ph.caption) f.append(el('figcaption', '', ph.caption)); g.append(f); }
        text.append(g);
      }
      pointRows(p.more);
      if (p.callout) {
        const c = el('div', 'intro-callout');
        if (p.callout.image) c.append(img(p.callout.image, ''));
        c.append(el('p', '', p.callout.text));
        text.append(c);
      }
      if (text.childElementCount) page.append(text);
      if (p.columns) {
        const cols = el('div', 'intro-cols');
        for (const c of p.columns) {
          const col = el('section', 'intro-col');
          col.append(el('h3', '', c.heading), list(c.items, c.ordered));
          if (c.note) col.append(el('p', 'intro-note', c.note));
          cols.append(col);
        }
        page.append(cols);
      }
      if (p.photo) {                           // a picture under the text, e.g. the handwritten recipe board
        const f = el('figure', 'intro-photo');
        f.append(img(p.photo.image, p.photo.alt));
        if (p.photo.caption) f.append(el('figcaption', '', p.photo.caption));
        page.append(f);
      }
      if (p.source) {
        const src = el('p', 'intro-source');
        if (p.sourceUrl) { const a = el('a', '', p.source); a.href = p.sourceUrl; a.target = '_blank'; a.rel = 'noopener'; src.append(a); }
        else src.textContent = p.source;
        page.append(src);
      }
      body.append(page);
      body.scrollTop = 0;
      tabs();
      ui.introDots.replaceChildren(...pages.map((_, k) => el('i', k === i ? 'on' : '')));
      ui.introPager.textContent = (i + 1) + ' / ' + pages.length;
      ui.introBack.disabled = i === 0 && required;
      ui.introNextText.textContent = i < pages.length - 1 ? 'SETERUSNYA' : required ? 'MULA BERMAIN' : 'SELESAI';
    }
    function go(k) { if (k < 0 || k >= pages.length) return; i = k; seen = Math.max(seen, i); render(); }
    function show(mustFinish) { if (!pages.length) return; required = !!mustFinish; i = 0; seen = 0; render(); ui.intro.hidden = false; ui.introNext.focus(); }
    function hide() { ui.intro.hidden = true; }
    function next() { if (i < pages.length - 1) { go(i + 1); ui.introNext.focus(); } else hide(); }
    function back() { if (i > 0) go(i - 1); else if (!required) hide(); }
    return { show, hide, next, back, go, get open() { return !ui.intro.hidden; }, get page() { return i; }, get required() { return required; } };
  })();
  // Sign-in pop-ups (CFG.signIn): a checking bar, then "telah mendaftar" (auto-close -> menu) or "Daftar Maklumat Pemain" (OK -> e-mail field).
  let popupOk = null;
  function popupShow(o) {                      // o.kind: 'wait' (spinner) | 'ok' (green tick) | 'error' (red cross) | 'info' (blue i)
    ui.loginPopupCard.dataset.kind = o.kind || 'info';
    ui.loginPopupTitle.textContent = o.title;
    ui.loginPopupText.textContent = o.text || '';
    ui.loginPopupBar.hidden = !o.bar;
    if (o.bar) {                               // restart the fill animation at the requested length
      ui.loginPopupFill.style.animation = 'none';
      void ui.loginPopupFill.offsetWidth;
      ui.loginPopupFill.style.setProperty('--bar-secs', (o.bar / 1000) + 's');
      ui.loginPopupFill.style.animation = '';
    }
    ui.loginPopupOk.hidden = !o.ok;
    ui.loginPopup.hidden = false;
    if (o.ok) ui.loginPopupOk.focus();
  }
  function popupHide() { ui.loginPopup.hidden = true; const r = popupOk; popupOk = null; if (r) r(); }   // a waiting OK is released
  const popupWaitOk = () => new Promise((r) => { popupOk = r; });
  const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
  async function onRegister(e) {
    e.preventDefault();
    const username = ui.username.value.trim(), email = ui.email.value.trim();
    let mode = stepMode;
    if (mode === 'verify' && (!pendingProfile || normText(username) !== normText(pendingProfile.username))) mode = 'name';   // the name was changed: check it again
    const withEmail = mode !== 'name';
    const err = username.length < 2 ? 'Nama pemain perlu sekurang-kurangnya 2 aksara.'
      : withEmail && !EMAIL_RE.test(email) ? 'Masukkan alamat e-mel yang sah.' : '';
    ui.registerError.textContent = err;
    ui.registerError.hidden = !err;
    if (err) { fieldState(username.length < 2 ? ui.username.parentElement : ui.emailField, 'error'); (username.length < 2 ? ui.username : ui.email).focus(); return; }
    if (ui.registerBtn.disabled) return;         // a check is already running
    ui.registerBtn.disabled = true;
    ui.registerBtnText.textContent = mode === 'register' ? 'MENYIMPAN…' : mode === 'verify' ? 'MENGESAHKAN…' : 'MENYEMAK…';
    const S = CFG.signIn || {};
    const checkMs = (S.checkSeconds == null ? 2 : S.checkSeconds) * 1000;
    const noticeMs = (S.noticeSeconds == null ? 2 : S.noticeSeconds) * 1000;
    const run = signInRun;
    const stale = () => run !== signInRun;       // showRegister() ran meanwhile: leave the screen as it reset it
    const notice = async (kind, title, text) => {   // a notice the player closes with OK
      popupShow({ kind, title, text, ok: true });
      await popupWaitOk();
      popupHide();
      await sleep(60);                           // the Enter that pressed OK must not reach the input that gets focus next
    };
    const enter = async (title, text, p) => {    // a green closing notice, then the games menu
      popupShow({ kind: 'ok', title, text: text + ', ' + p.username + '! Membuka menu utama…' });
      await sleep(noticeMs);
      popupHide();
      ui.username.value = ''; ui.email.value = '';
      pendingProfile = null;
      useProfile(p);
    };
    try {
      if (mode === 'verify') {                   // a registered name: only its own e-mail logs in
        popupShow({ kind: 'wait', title: 'Mengesahkan…', text: 'Menyemak alamat e-mel…', bar: checkMs });
        await sleep(checkMs);
        if (stale()) return;
        if (normText(email) !== normText(pendingProfile.email)) {
          fieldState(ui.emailField, 'error');
          await notice('error', 'E-Mel Salah', 'Alamat e-mel tidak sepadan dengan nama pemain "' + pendingProfile.username + '". Sila cuba lagi.');
          if (stale()) return;
          ui.email.select();
        } else {
          fieldState(ui.emailField, 'ok');
          await enter('Pengesahan Berjaya', 'Selamat kembali', pendingProfile);
        }
      } else {
        popupShow({ kind: 'wait', title: mode === 'register' ? 'Mendaftar…' : 'Menyemak…', text: mode === 'register' ? 'Menyimpan maklumat pemain…' : 'Menyemak nama pemain…', bar: checkMs });
        const started = Date.now();
        const existing = await GebokStore.findProfile(username, mode === 'register' ? email : '');
        const byName = !!existing && normText(existing.username) === normText(username);
        const p = mode === 'register' && !existing ? await GebokStore.register(username, email) : null;   // a used e-mail is never registered twice
        await sleep(checkMs - (Date.now() - started));   // the bar fills to the end
        if (stale()) return;
        if (mode === 'name') {
          if (existing) {                        // registered: say so (green: the name is right), then ask for the e-mail
            pendingProfile = existing;
            fieldState(ui.username.parentElement, 'ok');
            popupShow({ kind: 'ok', title: 'Nama Pemain Telah Mendaftar', text: 'Nama "' + existing.username + '" sudah berdaftar. Masukkan alamat e-mel yang didaftarkan untuk pengesahan.' });
            await sleep(noticeMs);
            popupHide();
            if (stale()) return;
            registerStep('verify');
          } else {                               // a new name: ask for a new e-mail, this once
            await notice('info', 'Daftar Maklumat Pemain', 'Nama pemain "' + username + '" belum didaftarkan. Tekan OK untuk daftar alamat e-mel (kali pertama sahaja).');
            if (stale()) return;
            registerStep('register');
          }
          ui.email.focus();
        } else if (p) {
          fieldState(ui.emailField, 'ok');
          await enter('Pendaftaran Berjaya', 'Selamat datang', p);
        } else if (byName) {                     // the name was taken while the e-mail was typed
          await notice('error', 'Nama Telah Berdaftar', 'Nama pemain "' + username + '" baru sahaja didaftarkan oleh pemain lain. Sila gunakan nama lain.');
          if (stale()) return;
          registerStep('name');
          fieldState(ui.username.parentElement, 'error');
          ui.username.select();
        } else {                                 // the e-mail already belongs to another player
          fieldState(ui.emailField, 'error');
          await notice('error', 'E-Mel Telah Berdaftar', 'Alamat e-mel ini telah berdaftar untuk pemain lain. Sila gunakan e-mel baru.');
          if (stale()) return;
          ui.email.select();
        }
      }
    } catch (e2) {
      popupHide();
      ui.registerError.textContent = 'Pemain tidak dapat disimpan. Cuba lagi.';
      ui.registerError.hidden = false;
    } finally {
      ui.registerBtn.disabled = false;
      ui.registerBtnText.textContent = STEP_LABEL[stepMode];
    }
  }
  function route() {
    if (location.hash === '#admin') { menuState(); GebokAdmin.show(); }
    else if (GebokAdmin.isOpen()) { GebokAdmin.hide(); if (GebokStore.current()) window.LaksaArcade.showGames(); else showRegister(); }
  }

  /* ------------------------------------------------------- collecting */
  function collect(L, i) {
    scene.remove(L.mesh);
    laksas.splice(i, 1);
    laksaCount++; combo++; lastCollect = time;
    score += SC.laksa; runStats.laksaPts += SC.laksa;
    burst(L.mesh.position.x, L.mesh.position.y + 0.3, L.mesh.position.z);
    sfx.collect(combo);
    pulse(ui.mLaksa);
    if (laksaCount === curLevel().laksaTarget) award('laksa');
    updateMissionHud();
    checkMissions();
  }
  function collectGebuk(Gk, i, z) {
    scene.remove(Gk.mesh);
    gebuks.splice(i, 1);
    score += SC.gebuk; runStats.gebukPts += SC.gebuk;
    gebukRun++;
    burst(Gk.x, Gk.y + 0.9, z, 0xffd45a);
    burst(Gk.x, Gk.y + 0.3, z, BRASS);
    sfx.gebuk();
    pulse(ui.mGebuk);
    levelCount++;
    if (levelCount === curLevel().need && !runStats.missionDone) {
      runStats.missionDone = true;
      runStats.mission = SC.mission; score += SC.mission;
      sfx.mission();
      showBanner('MISI GEBUK SELESAI! +' + SC.mission, 2.5);
      award('gebuk');
    } else showBanner('GEBUK ' + Math.min(levelCount, curLevel().need) + '/' + curLevel().need + '  +' + SC.gebuk);
    updateMissionHud();
    checkMissions();
  }
  function applyPowerup(type) {
    if (type === 'magnet') magnetT = PW.magnet;
    else if (type === 'shield') shield = true;
    else if (type === 'boost') { boostT = PW.boost; sfx.boost(); }
    if (type !== 'boost') sfx.power();
    showBanner(type === 'magnet' ? '🧲 Magnet laksa!' : type === 'shield' ? '🛡 Tudung saji!' : '🌶 Cili boost!', 1.6);
    updatePowerHud();
    award('power');
  }

  /* ------------------------------------------------------------ update */
  function updateObstacles(playing, dt) {
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i], z = dist - o.s;
      if (o.mover && o.mover.kind === 'lateral') {
        const t = time / o.mover.period * Math.PI * 2 + o.mover.phase;
        o.x = o.mover.a + (o.mover.b - o.mover.a) * (0.5 - 0.5 * Math.cos(t));
        o.mesh.position.x = o.x;
        o.mesh.rotation.y = Math.sin(t) * (o.mover.b > o.mover.a ? 1 : -1) * 0.6;
      }
      if (o.spin && playing) o.mesh.rotation.x -= dt * 4;
      o.mesh.position.z = z;
      if (z - o.depth / 2 > KILL_BEHIND) { scene.remove(o.mesh); obstacles.splice(i, 1); continue; }
      if (!playing || invT > 0) continue;
      if (z + o.depth / 2 > -PLAYER_HALF_D && z - o.depth / 2 < PLAYER_HALF_D && Math.abs(o.x - player.x) < o.halfW + PLAYER_HALF_W - 0.2) {
        const top = player.y + (player.rolling ? ROLL_H : PLAYER_H);
        let hit;
        if (o.kind === 'low') hit = player.y < o.height - 0.08;
        else if (o.kind === 'high') hit = top > o.clearance;
        else hit = true;
        if (!hit) continue;
        if (boostT > 0) {                   // cili boost: smash straight through
          burst(o.x, 1.0, z, 0xff6a3d); sfx.smash(); shake = Math.max(shake, 0.25);
          scene.remove(o.mesh); obstacles.splice(i, 1);
          continue;
        }
        crash(o);
        return;
      }
    }
  }
  function updateLaksas(dt, playing) {
    const ph = player.rolling ? ROLL_H : PLAYER_H;
    const cy = player.y + ph * 0.5;
    for (let i = laksas.length - 1; i >= 0; i--) {
      const L = laksas[i], z = dist - L.s;
      if (z > KILL_BEHIND) { scene.remove(L.mesh); laksas.splice(i, 1); continue; }
      if (playing && magnetT > 0 && z > -MAGNET_RADIUS && z < 1.5 && Math.abs(L.x - player.x) < LANE_W * 1.6) {
        const k = Math.min(1, dt * 9);
        L.x += (player.x - L.x) * k;
        L.y += (cy - 0.25 - L.y) * k;
      }
      L.mesh.position.set(L.x, L.y + Math.sin(time * 3 + L.s) * 0.07, z);
      L.mesh.rotation.y += dt * 1.8;
      if (playing && z > -0.9 && z - lastStep < 0.9 && Math.abs(L.x - player.x) < 1.0 && L.y < player.y + ph + 0.15 && L.y + 0.45 > player.y - 0.15) collect(L, i);
    }
  }
  function updatePowerups(dt, playing) {
    for (let i = powerups.length - 1; i >= 0; i--) {
      const P = powerups[i], z = dist - P.s;
      if (z > KILL_BEHIND) { scene.remove(P.mesh); powerups.splice(i, 1); continue; }
      P.mesh.position.set(P.x, P.y + Math.sin(time * 4 + P.s) * 0.12, z);
      P.mesh.rotation.y += dt * 3;
      if (playing && z > -1.0 && z - lastStep < 1.0 && Math.abs(P.x - player.x) < 1.0 && P.y < player.y + PLAYER_H + 0.3 && P.y + 0.5 > player.y - 0.2) {
        scene.remove(P.mesh); powerups.splice(i, 1);
        burst(P.x, P.y, z, 0xffffff);
        applyPowerup(P.type);
      }
    }
  }
  function updateGebuks(dt, playing) {
    const ph = player.rolling ? ROLL_H : PLAYER_H;
    for (let i = gebuks.length - 1; i >= 0; i--) {
      const Gk = gebuks[i], z = dist - Gk.s;
      if (z > KILL_BEHIND) { scene.remove(Gk.mesh); gebuks.splice(i, 1); continue; }
      Gk.mesh.position.set(Gk.x, Gk.y + Math.sin(time * 2.5 + Gk.s) * 0.1, z);
      Gk.mesh.rotation.y += dt * 1.2;
      if (playing && z > -0.45 && z - lastStep < 0.45 && Math.abs(Gk.x - player.x) < 1.0 && Gk.y < player.y + ph + 0.15 && Gk.y + 0.9 > player.y - 0.15) collectGebuk(Gk, i, z);
    }
  }
  function updateScenery() {
    for (let i = scenery.length - 1; i >= 0; i--) {
      const sc = scenery[i], z = dist - sc.s;
      sc.mesh.position.z = z;
      if (z > 24) { scene.remove(sc.mesh); scenery.splice(i, 1); }
    }
  }
  function animateStage(dt) {
    const portrait = window.innerWidth < window.innerHeight;
    const pose = stagePose(portrait);
    const P = player, g = P.group;
    g.position.set(pose.traveller[0], Math.abs(Math.sin(time * 1.6)) * 0.03, pose.traveller[2]);
    g.rotation.set(0, Math.PI - 0.55 + Math.sin(time * 0.7) * 0.05, 0);
    g.scale.set(1, 1 + Math.sin(time * 1.6) * 0.012, 1);
    P.legL.rotation.x = 0.15; P.legR.rotation.x = -0.1; P.armL.rotation.x = 0.35; P.armR.rotation.x = -0.25;
    P.aura.visible = false; P.bubble.visible = false; g.visible = true;
    const E = elder.group;
    E.position.set(pose.elder[0], 0, pose.elder[2]);
    E.rotation.set(0, Math.PI - 0.08 + Math.sin(time * 0.5) * 0.04, 0);
    E.scale.set(1.0, 1.0 + Math.sin(time * 1.1) * 0.01, 1.0);
    const pulse = 0.75 + Math.sin(time * 3) * 0.25;
    elder.glow.scale.setScalar(0.9 + pulse * 0.35);
    elder.glow.material.opacity = 0.18 + pulse * 0.2;
    elder.light.intensity = 0.5 + pulse * 0.5;
    elder.orb.position.y = elder.glow.position.y = elder.light.position.y = 1.38 + Math.sin(time * 2) * 0.04;
  }
  function animatePlayer(dt) {
    if (stageOn && state === 'menu') { animateStage(dt); return; }
    if (state === 'dead' || state === 'won' || state === 'hit' || state === 'incomplete') return;
    const P = player, g = P.group;
    g.position.set(P.x, P.y, 0);
    const lean = THREE.MathUtils.clamp((LANE_X[P.lane] - P.x) * 0.35, -0.45, 0.45);
    g.rotation.z = -lean;
    g.rotation.y = lean * 0.6;
    if (P.rolling) {
      g.scale.y = 0.5; g.rotation.x = -0.35;
      P.legL.rotation.x = 1.3; P.legR.rotation.x = 1.3; P.armL.rotation.x = 1.6; P.armR.rotation.x = 1.6;
    } else if (P.jumping) {
      g.scale.y = 1; g.rotation.x = -0.1;
      P.legL.rotation.x = -0.9; P.legR.rotation.x = 0.5; P.armL.rotation.x = -2.4; P.armR.rotation.x = -2.0;
    } else {
      g.scale.y = 1; g.rotation.x = -0.08;
      runPhase += dt * Math.max(speed, state === 'ready' ? 4 : 0) * 0.95;
      const sw = Math.sin(runPhase);
      P.legL.rotation.x = sw * 0.95; P.legR.rotation.x = -sw * 0.95;
      P.armL.rotation.x = -sw * 0.9; P.armR.rotation.x = sw * 0.9;
      g.position.y += Math.abs(Math.cos(runPhase)) * 0.07;
    }
    P.aura.visible = magnetT > 0 || boostT > 0;
    if (P.aura.visible) {
      P.aura.material.color.setHex(boostT > 0 ? 0xff5a2d : 0xffd45a);
      P.aura.rotation.z += dt * (boostT > 0 ? 9 : 4);
      P.aura.position.y = 1.0 + Math.sin(time * 5) * 0.1;
    }
    P.bubble.visible = shield;
    if (shield) P.bubble.scale.setScalar(1 + Math.sin(time * 4) * 0.04);
  }
  function updateCamera(dt) {
    if (stageOn && state === 'menu') {                       // the menu's gentle, slowly drifting camera
      const pose = stagePose(window.innerWidth < window.innerHeight).cam;
      const tx = pose.pos[0] + Math.sin(time * 0.35) * 0.12, ty = pose.pos[1] + Math.sin(time * 0.5) * 0.06, tz = pose.pos[2];
      camera.position.lerp(new THREE.Vector3(tx, ty, tz), Math.min(1, dt * 2.5));
      camLook.lerp(new THREE.Vector3(pose.look[0], pose.look[1], pose.look[2]), Math.min(1, dt * 2.5));
      camera.lookAt(camLook);
      if (Math.abs(camera.fov - baseFov) > 0.05) { camera.fov += (baseFov - camera.fov) * Math.min(1, dt * 6); camera.updateProjectionMatrix(); }
      return;
    }
    camX += (player.x * 0.45 - camX) * Math.min(1, dt * 7);
    if (shake > 0) shake = Math.max(0, shake - dt);
    const sx = (Math.random() - 0.5) * shake * 0.5, sy = (Math.random() - 0.5) * shake * 0.5;
    const bob = state === 'playing' && !player.jumping && !player.rolling ? Math.sin(runPhase * 2) * 0.03 : 0;
    camera.position.set(camX + sx, envCam.y + bob + sy, envCam.z);
    camLook.set(camX * 0.8, envCam.lookY, -14);
    camera.lookAt(camLook);
    const targetFov = baseFov + (boostT > 0 ? 9 : 0);
    if (Math.abs(camera.fov - targetFov) > 0.05) { camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 6); camera.updateProjectionMatrix(); }
  }
  function updateMissionHud() {
    const L = curLevel();
    ui.levelLabel.textContent = 'LEVEL ' + (level + 1) + ' / ' + FREE + ' · ' + L.name;
    ui.mGebukN.textContent = Math.min(levelCount, L.need) + ' / ' + L.need;
    ui.mLaksaN.textContent = Math.min(laksaCount, L.laksaTarget) + ' / ' + L.laksaTarget;
    ui.mGebuk.classList.toggle('done', levelCount >= L.need);
    ui.mLaksa.classList.toggle('done', laksaCount >= L.laksaTarget);
    ui.timer.hidden = false;
  }
  function updatePowerHud() {
    ui.powerMagnet.hidden = !(magnetT > 0);
    ui.powerShield.hidden = !shield;
    ui.powerBoost.hidden = !(boostT > 0);
  }
  function updateHud() {
    ui.score.textContent = fmt(runTotal());
    ui.dist.textContent = Math.floor(runDist) + ' m';
    const left = timeLeft(), t = Math.ceil(left);
    ui.timer.textContent = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
    ui.timer.classList.toggle('low', left <= 10);
    if (magnetT > 0) ui.powerMagnetFill.style.width = (magnetT / PW.magnet * 100) + '%';
    if (boostT > 0) ui.powerBoostFill.style.width = (boostT / PW.boost * 100) + '%';
  }

  function update(dt) {
    if (state === 'paused') return;
    time += dt;
    if (state === 'playing' && timeLeft() <= 0) levelTimeUp();
    const playing = state === 'playing';
    const L = curLevel();
    if (state === 'ready') {
      speed = 0;
      readyT -= dt;
      const label = readyT > 0 ? String(Math.ceil(readyT / CFG.readyCountdown * 3)) : 'LARI!';
      if (label !== countdownShown) {
        countdownShown = label;
        ui.countdown.textContent = label; ui.countdown.hidden = false; pulse(ui.countdown);
        sfx.count(label === 'LARI!');
        if (label === 'LARI!') { clearTimeout(countTimer); countTimer = setTimeout(() => { ui.countdown.hidden = true; }, 700); }
      }
      if (readyT <= 0) { state = 'playing'; speed = L.speed.start; }
    } else if (playing) {
      runTime += dt;
      speed = Math.min(L.speed.max, speed + L.speed.accel * dt);
    } else if (state === 'menu') {
      speed = stageOn ? 0 : 7;                                 // the menu scene stands still; only clouds and characters move
    } else if (state === 'dead' || state === 'hit') {
      speed = Math.max(0, speed - dt * 60);
    } else if (state === 'won' || state === 'incomplete') {
      speed = Math.max(0, speed - dt * 30);
    }
    const effSpeed = speed * (boostT > 0 ? PW.boostMultiplier : 1);
    const step = effSpeed * dt;
    lastStep = step;
    dist += step;
    if (playing) {
      runDist += step;
      const tx = LANE_X[player.lane], dx = tx - player.x, mv = LATERAL_SPEED * dt;
      player.x = Math.abs(dx) <= mv ? tx : player.x + Math.sign(dx) * mv;
      if (player.jumping) {
        player.vy -= GRAVITY * dt;
        player.y += player.vy * dt;
        if (player.y <= 0) {
          player.y = 0; player.vy = 0; player.jumping = false;
          if (player.queuedRoll) { player.queuedRoll = false; startRoll(); }
        }
      }
      if (player.rolling) { player.rollT -= dt; if (player.rollT <= 0) player.rolling = false; }
      if (magnetT > 0) { magnetT -= dt; if (magnetT <= 0) updatePowerHud(); }
      if (boostT > 0) { boostT -= dt; if (boostT <= 0) updatePowerHud(); }
      if (time - lastCollect > 1.2) combo = 0;
      if (invT > 0) {
        invT -= dt;
        player.group.visible = invT <= 0 || Math.floor(invT * 10) % 2 === 0;
      }
    }

    while (nextScenS < dist + SPAWN_AHEAD) nextScenS += spawnScenery(nextScenS);
    if (playing) while (nextS < dist + SPAWN_AHEAD) nextS += spawnPattern(nextS);

    updateScenery();
    updateObstacles(playing, dt);
    updateLaksas(dt, state === 'playing');
    updatePowerups(dt, state === 'playing');
    updateGebuks(dt, state === 'playing');
    updateFx(dt, step);
    if (state === 'dead') updateDeath(dt);
    if (state === 'hit') updateHit(dt);
    if (state === 'won') updateWon(dt);
    if (state === 'incomplete') updateIncomplete(dt);
    if (state === 'playing' || state === 'hit') {                           // the clock also runs while you tumble
      clock += dt;
      const left = timeLeft();
      if (left <= 5 && left > 0 && Math.ceil(left) !== lastBeep) { lastBeep = Math.ceil(left); sfx.count(false); }
    }

    const o = (dist / TILE) % 1;
    curRoad.offset.y = o;
    curSide.offset.y = o;
    TEX.water.offset.y = (dist * 0.7 / TILE) % 1;
    TEX.water.offset.x = (time * 0.02) % 1;
    for (const c of clouds) { c.position.x += dt * 0.6; if (c.position.x > 160) c.position.x = -160; }

    animatePlayer(dt);
    updateCamera(dt);
    if (state === 'playing' || state === 'ready') updateHud();
  }

  /* ------------------------------------------------------------- input */
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (!ui.register.hidden || !ui.games.hidden || !ui.platform.hidden || !ui.crossword.hidden || !ui.wordsearch.hidden || GebokAdmin.isOpen()) return;
    const k = e.key;
    if (k === 'p' || k === 'P' || k === 'Escape') {
      if (state === 'menu') { if (!ui.hub.hidden) window.LaksaArcade.showGames(); else if (GebokStore.current() || backTo === 'register') goBack(); }
      else togglePause();
      e.preventDefault();
      return;
    }
    if (k === ' ' || k === 'Enter') {
      if (state === 'menu') { if (!ui.hub.hidden) startSelected(); else if (!ui.final.hidden) showHub(); else if (GebokStore.current()) goBack(); e.preventDefault(); return; }
      if (state === 'dead' && overShown) { startCampaign(); e.preventDefault(); return; }
      if (state === 'incomplete' && overShown) { startCampaign(); e.preventDefault(); return; }
      if (state === 'won' && overShown) { nextLevel(); e.preventDefault(); return; }
    }
    if (state !== 'playing') return;
    switch (k) {
      case 'ArrowLeft': case 'a': case 'A': move(-1); break;
      case 'ArrowRight': case 'd': case 'D': move(1); break;
      case 'ArrowUp': case 'w': case 'W': case ' ': jump(); break;
      case 'ArrowDown': case 's': case 'S': case 'Shift': roll(); break;
      default: return;
    }
    e.preventDefault();
  });
  let touchStart = null;
  window.addEventListener('touchstart', (e) => {
    if (e.target.closest('button, a, input')) return;
    const t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
    touchStart = null;
    if (state !== 'playing') return;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) { jump(); return; }
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
    else if (dy < 0) jump();
    else roll();
  }, { passive: true });
  window.addEventListener('touchmove', (e) => { if (state === 'playing') e.preventDefault(); }, { passive: false });
  ui.registerForm.addEventListener('submit', onRegister);
  ui.registerLb.addEventListener('click', () => { backTo = 'register'; showLeaderboard(); });   // Kedudukan Terkini
  ui.loginPopupOk.addEventListener('click', () => { if (popupOk) popupOk(); });
  ui.introNext.addEventListener('click', () => intro.next());
  ui.introBack.addEventListener('click', () => intro.back());
  ui.username.addEventListener('input', () => { fieldState(ui.username.parentElement, ''); ui.registerError.hidden = true; });
  ui.email.addEventListener('input', () => { fieldState(ui.emailField, ''); ui.registerError.hidden = true; });
  ui.hubSwitch.addEventListener('click', showRegister);
  ui.hubHowto.addEventListener('click', showHowto);
  ui.hubStory.addEventListener('click', showStory);
  ui.hubLb.addEventListener('click', showLeaderboard);
  ui.howtoBack.addEventListener('click', showHub);
  ui.storyBack.addEventListener('click', showHub);
  ui.lbBack.addEventListener('click', goBack);
  ui.hubGames.addEventListener('click', () => window.LaksaArcade.showGames());
  for (const b of ui.lbTabs.querySelectorAll('.lb-tab')) b.addEventListener('click', () => setLbTab(b.dataset.key));
  ui.lbRefresh.addEventListener('click', loadLeaderboard);
  ui.cards.forEach((b) => b.addEventListener('click', () => selectLevel(+b.dataset.level)));
  ui.hubStart.addEventListener('click', startSelected);
  ui.hubAchv.addEventListener('click', showAchievements);
  ui.hubSettings.addEventListener('click', showSettings);
  ui.hubSound.addEventListener('click', () => { sfx.toggle(); syncSoundLabels(); ui.hubSound.blur(); });
  ui.gamesSound.addEventListener('click', () => { sfx.toggle(); syncSoundLabels(); ui.gamesSound.blur(); });
  ui.settingsSound.addEventListener('click', () => { sfx.toggle(); syncSoundLabels(); });
  ui.settingsSwitch.addEventListener('click', showRegister);
  ui.settingsBack.addEventListener('click', goBack);
  ui.achvBack.addEventListener('click', goBack);
  ui.pauseBtn.addEventListener('click', () => { togglePause(); ui.pauseBtn.blur(); });
  ui.resume.addEventListener('click', togglePause);
  ui.restart.addEventListener('click', () => { ui.pause.hidden = true; campaignUsed += clock; startGame(livesAtLevelStart); });   // the time spent is gone
  ui.pauseMenu.addEventListener('click', showHub);
  ui.pauseSound.addEventListener('click', () => { sfx.toggle(); syncSoundLabels(); });
  ui.mute.addEventListener('click', () => { sfx.toggle(); syncSoundLabels(); ui.mute.blur(); });
  ui.next.addEventListener('click', nextLevel);
  ui.completeMenu.addEventListener('click', showHub);
  ui.completeLb.addEventListener('click', showLeaderboard);
  ui.retryInc.addEventListener('click', startCampaign);
  ui.incMenu.addEventListener('click', showHub);
  ui.again.addEventListener('click', startCampaign);
  ui.overMenu.addEventListener('click', showHub);
  ui.overLb.addEventListener('click', showLeaderboard);
  ui.finalReplay.addEventListener('click', showHub);
  ui.finalStory.addEventListener('click', showStory);
  ui.finalLb.addEventListener('click', showLeaderboard);
  let resetArmed = 0;
  ui.reset.addEventListener('click', () => {
    if (Date.now() - resetArmed < 4000) {
      progress = { unlocked: 0, completed: LEVELS.map(() => false) };
      saveProgress();
      level = 0;
      resetArmed = 0;
      selectedLevel = 0;
      renderLevelSelect();
      ui.reset.textContent = 'Progress reset. Only level 1 is open.';
      setTimeout(() => { ui.reset.textContent = 'Reset progress'; }, 2500);
    } else {
      resetArmed = Date.now();
      ui.reset.textContent = 'Tap again to lock levels 2, 3 and the free run';
      setTimeout(() => { if (resetArmed && Date.now() - resetArmed >= 3900) { resetArmed = 0; ui.reset.textContent = 'Reset progress'; } }, 4000);
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && (state === 'playing' || state === 'ready')) togglePause(); });
  window.addEventListener('blur', () => { if (state === 'playing' || state === 'ready') togglePause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) music.sync(false); });
  window.addEventListener('hashchange', route);

  /* -------------------------------------------------------------- loop */
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    baseFov = w < h ? 78 : 60;
    camera.fov = baseFov;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();
  // Public surface for the arcade hub and the other mini-games (platform.js, platformer.js, crossword.js).
  window.GebokRun = {
    open: showHub,                                   // the runner's own level menu
    menu() { menuState(); ui.mute.hidden = true; },  // hide everything, stop any run, show the sunset stage; the arcade screens have their own sound buttons
    leaderboard() { backTo = 'games'; showLeaderboard(); },
    settings() { backTo = 'games'; showSettings(); },
    achievements() { backTo = 'games'; showAchievements(); },
    intro() { intro.show(false); },                  // the heritage pages again, from the menu's Maklumat button
    register: showRegister,
    pauseRender(on) { renderPaused = !!on; if (!on) last = performance.now(); },
    setStage, sfx,
  };
  applyEnv('village');
  setStage(true);
  GebokAdmin.wire();
  window.LaksaArcade.wire();
  window.LaksaQuest.wire();
  window.LaksaCrossword.wire();
  window.LaksaWordSearch.wire();
  route();
  if (!GebokAdmin.isOpen()) showRegister();
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const inMenu = state === 'menu' && !renderPaused && !GebokAdmin.isOpen();
    music.sync(inMenu && !sfx.muted && !document.hidden, !inMenu);
    if (renderPaused) { last = now; return; }
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;
    update(dt);
    renderer.render(scene, camera);
  }

  /* --------------------------------------------------- debug / testing */
  // Lets a test harness step the simulation without relying on the display's frame rate.
  window.gebokDebug = {
    step(dt, n) { for (let i = 0; i < (n || 1); i++) update(dt); renderer.render(scene, camera); },
    tick(dt) { update(dt); },
    state() {
      return { state, speed, score: Math.floor(score), runTotal: runTotal(), laksaCount, runDist: Math.floor(runDist), lane: player.lane, lives, livesLost, invT: +invT.toFixed(2), clock: +clock.toFixed(1), campaignUsed: +campaignUsed.toFixed(1), timeLeft: +timeLeft().toFixed(1), earned: Array.from(earned),
        x: +player.x.toFixed(2), y: +player.y.toFixed(2), jumping: player.jumping, rolling: player.rolling, shield, boostT: +boostT.toFixed(2), magnetT: +magnetT.toFixed(2),
        levelCount, gebukRun, env: envName, obstacles: obstacles.length, laksas: laksas.length, powerups: powerups.length, gebuks: gebuks.length, scenery: scenery.length,
        runStats: Object.assign({}, runStats), drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
    },
    obstacles() { return obstacles.map((o) => ({ kind: o.kind, name: o.name, x: +o.x.toFixed(2), z: +(dist - o.s).toFixed(2), depth: o.depth, mover: !!o.mover })); },
    gebuks() { return gebuks.map((g) => ({ x: g.x, y: g.y, z: +(dist - g.s).toFixed(2) })); },
    powerups() { return powerups.map((p) => ({ type: p.type, x: p.x, z: +(dist - p.s).toFixed(2) })); },
    level() { return { level, levelCount, gebukRun, progress: JSON.parse(JSON.stringify(progress)) }; },
    setLevel(i, unlocked) {
      if (typeof unlocked === 'number') { progress.unlocked = unlocked; saveProgress(); }
      level = Math.max(0, Math.min(FREE - 1, i)); renderLevelSelect(); updateMissionHud();
    },
    startCampaign, selectLevel, showSettings, showAchievements, setStage, elder,
    skipReady() { if (state === 'ready') { readyT = 0; update(0); } },
    move, jump, roll, start: (l) => startGame(typeof l === 'number' ? l : undefined), nextLevel, showHub, showRegister, showLeaderboard, showStory, showFinal,
    register: (u, e) => GebokStore.register(u, e).then((p) => { useProfile(p); return p; }),
    store: window.GebokStore, player, sfx, applyPowerup,
    showGames: () => window.LaksaArcade.showGames(), setLbTab, goBack, intro,
    music: () => ({ playing: music.playing, wanted: music.wanted, loaded: music.loaded, failed: music.failed, mode: music.mode,
      position: +music.position().toFixed(2), duration: +music.duration.toFixed(2), loop: music.loop, ctx: sfx.ctx ? sfx.ctx.state : null, config: music.config }),
    musicSync: (want, fromTop) => music.sync(want, fromTop), musicRestart: () => music.restart(),   // tests: the frame loop drives this normally
  };

  requestAnimationFrame(frame);
})();
