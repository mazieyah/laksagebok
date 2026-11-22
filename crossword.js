/* ======================================================================
   LaksaCrossword — Teka Silang Laksa: 15 clues drawn from the "Maklumat Laksa
   Gebok" pages (asal-usul, proses pembuatan, resipi), laid out at random on a
   12×12 grid every play (classic rules: every word crosses another, crossings
   agree, no stray adjacent letters); a fixed layout is the fallback.
   ====================================================================== */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  // Word pool (word, clue) from the "Maklumat Laksa Gebok" pages; each play lays 15 of them out at random.
  const POOL = [
    ['GEBOK', 'Alat tradisional tembaga yang menekan doh menjadi mi laksa'],
    ['LAKSA', 'Hidangan tradisional kebanggaan negeri Pahang'],
    ['PAHANG', 'Negeri asal laksa gebok'],
    ['PEKAN', 'Bandar Muzium Sultan Abu Bakar, tempat gebok asal dipamerkan'],
    ['MUZIUM', 'Tempat gebok asal dipamerkan sebagai warisan makanan'],
    ['TEMBAGA', 'Logam gebok tradisional'],
    ['GANDUM', 'Tepung untuk doh mi laksa gebok'],
    ['DOH', 'Diuli daripada tepung dan air, lalu dimasukkan ke dalam gebok'],
    ['REBUS', 'Mi dimasak begini dalam air mendidih lebih kurang 10 minit'],
    ['KEMBUNG', 'Ikan untuk kuah lemak laksa gebok'],
    ['SANTAN', 'Pekat, bahan utama kuah lemak'],
    ['KERISIK', 'Kelapa parut goreng yang ditumbuk ke dalam kuah'],
    ['SERAI', 'Empat batang dalam resipi kuah laksa'],
    ['KETUMBAR', 'Biji rempah yang digoreng tanpa minyak hingga naik bau'],
    ['KESUM', 'Daun ulam laksa yang dihiris nipis'],
    ['SELASIH', 'Daun ulam, dihiris nipis bersama daun kesum'],
    ['KUNYIT', 'Daunnya dihiris halus sebagai ulam laksa gebok'],
    ['TAUGE', 'Kecambah yang ditabur sedikit di atas laksa'],
    ['BELACAN', 'Dibakar, dihidang bersama sambal lada'],
    ['KASTURI', 'Limau yang dibelah dua untuk laksa'],
    ['TIMUN', 'Ulam yang diparut halus'],
    ['KUAH', 'Lemak ikan, dicurah ke atas mi dalam mangkuk'],
    ['SAMBAL', 'Lada kering ditumbuk halus, pedas'],
    ['KENDURI', 'Majlis kampung tempat laksa gebok disediakan beramai-ramai'],
    ['KUANTAN', 'Daerah Kampung Panching, tempat resipi keluarga itu'],
    ['JINTAN', 'Rempah putih dan manis dalam kuah laksa'],
    ['HALIA', '40 g dalam kuah, digoreng berasingan tanpa minyak'],
    ['TENGGIRI', 'Ikan dalam resipi papan Muzium Sultan Abu Bakar'],
    ['ULAM', 'Sayur mentah pelengkap semangkuk laksa'],
    ['TANGAN', 'Orang Pahang kata laksa gebok paling sedap dimakan dengan ini'],
  ];
  const ROWS = 12, COLS = 12, TARGET = 15;
  const FALLBACK = [
    { word: 'TIMUN', row: 0, col: 1, dir: 'A', num: 1, clue: 'Ulam yang diparut halus' },
    { word: 'KUNYIT', row: 2, col: 0, dir: 'A', num: 4, clue: 'Daunnya dihiris halus sebagai ulam laksa gebok' },
    { word: 'KENDURI', row: 4, col: 3, dir: 'A', num: 6, clue: 'Majlis kampung tempat laksa gebok disediakan beramai-ramai' },
    { word: 'KEMBUNG', row: 7, col: 0, dir: 'A', num: 9, clue: 'Ikan untuk kuah lemak laksa gebok' },
    { word: 'KUAH', row: 7, col: 8, dir: 'A', num: 11, clue: 'Lemak ikan, dicurah ke atas mi dalam mangkuk' },
    { word: 'DOH', row: 9, col: 0, dir: 'A', num: 12, clue: 'Diuli daripada tepung dan air, lalu dimasukkan ke dalam gebok' },
    { word: 'MUZIUM', row: 10, col: 4, dir: 'A', num: 13, clue: 'Tempat gebok asal dipamerkan sebagai warisan makanan' },
    { word: 'TAUGE', row: 0, col: 1, dir: 'D', num: 1, clue: 'Kecambah yang ditabur sedikit di atas laksa' },
    { word: 'KASTURI', row: 0, col: 7, dir: 'D', num: 2, clue: 'Limau yang dibelah dua untuk laksa' },
    { word: 'HALIA', row: 1, col: 9, dir: 'D', num: 3, clue: '40 g dalam kuah, digoreng berasingan tanpa minyak' },
    { word: 'TANGAN', row: 2, col: 5, dir: 'D', num: 5, clue: 'Orang Pahang kata laksa gebok paling sedap dimakan dengan ini' },
    { word: 'PAHANG', row: 5, col: 11, dir: 'D', num: 7, clue: 'Negeri asal laksa gebok' },
    { word: 'GEBOK', row: 6, col: 1, dir: 'D', num: 8, clue: 'Alat tradisional tembaga yang menekan doh menjadi mi laksa' },
    { word: 'ULAM', row: 7, col: 4, dir: 'D', num: 10, clue: 'Sayur mentah pelengkap semangkuk laksa' },
    { word: 'KESUM', row: 7, col: 8, dir: 'D', num: 11, clue: 'Daun ulam laksa yang dihiris nipis' },
  ];   // used when no random layout is found in time
  const DATA = { rows: ROWS, cols: COLS, entries: [] };
  // ---- random layout: classic rules (every word crosses another, crossings agree, no stray adjacent letters)
  const cellList = (w, r, c, d) => Array.from({ length: w.length }, (_, i) => [r + (d === 'D' ? i : 0), c + (d === 'A' ? i : 0)]);
  function canPlace(g, w, r, c, d) {
    const cs = cellList(w, r, c, d);
    for (const [rr, cc] of cs) if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) return -1;
    const before = d === 'D' ? [r - 1, c] : [r, c - 1], after = d === 'D' ? [cs[cs.length - 1][0] + 1, c] : [r, cs[cs.length - 1][1] + 1];
    for (const [rr, cc] of [before, after]) if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && g[rr][cc]) return -1;
    let cross = 0;
    for (let i = 0; i < cs.length; i++) {
      const [rr, cc] = cs[i], ch = g[rr][cc];
      if (ch) { if (ch !== w[i]) return -1; cross++; continue; }
      const side = d === 'D' ? [[rr, cc - 1], [rr, cc + 1]] : [[rr - 1, cc], [rr + 1, cc]];
      for (const [nr, nc] of side) if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && g[nr][nc]) return -1;
    }
    return cross;
  }
  function attempt() {
    const g = Array.from({ length: ROWS }, () => Array(COLS).fill(''));
    const pool = POOL.slice().sort(() => Math.random() - 0.5);
    const first = pool.slice(0, 8).reduce((m, p) => (p[0].length > m[0].length ? p : m));
    pool.splice(pool.indexOf(first), 1);
    const placed = [];
    const filled = [];                              // cells that hold a letter, the anchors for crossings
    const put = (w, clue, r, c, d) => { for (const [i, [rr, cc]] of cellList(w, r, c, d).entries()) { if (!g[rr][cc]) filled.push([rr, cc]); g[rr][cc] = w[i]; } placed.push({ word: w, row: r, col: c, dir: d, clue }); };
    put(first[0], first[1], 3 + Math.floor(Math.random() * 5), Math.floor(Math.random() * (COLS - first[0].length + 1)), 'A');
    let stuck = 0;
    while (placed.length < TARGET && pool.length && stuck < 6) {
      let progress = false;
      for (const cand of pool.slice()) {
        const [w, clue] = cand, options = [], seen = new Set();
        for (const [r, c] of filled) {               // only positions that cross a letter already on the grid
          const ch = g[r][c];
          for (let i = 0; i < w.length; i++) {
            if (w[i] !== ch) continue;
            for (const d of ['A', 'D']) {
              const r0 = d === 'D' ? r - i : r, c0 = d === 'A' ? c - i : c, id = d + r0 + ',' + c0;
              if (seen.has(id)) continue;
              seen.add(id);
              const k = canPlace(g, w, r0, c0, d);
              if (k >= 1) options.push([k, r0, c0, d]);
            }
          }
        }
        if (!options.length) continue;
        options.sort(() => Math.random() - 0.5); options.sort((x, y) => y[0] - x[0]);
        const [, r, c, d] = Math.random() < 0.7 ? options[0] : options[Math.floor(Math.random() * options.length)];
        put(w, clue, r, c, d);
        pool.splice(pool.indexOf(cand), 1);
        progress = true;
        if (placed.length >= TARGET) break;
      }
      stuck = progress ? 0 : stuck + 1;
      pool.sort(() => Math.random() - 0.5);
    }
    return placed;
  }
  function validLayout(entries) {               // every run of 2+ letters must be one of the placed words
    const g = Array.from({ length: ROWS }, () => Array(COLS).fill(''));
    for (const e of entries) for (const [i, [r, c]] of cellList(e.word, e.row, e.col, e.dir).entries()) { if (g[r][c] && g[r][c] !== e.word[i]) return false; g[r][c] = e.word[i]; }
    const words = new Set(entries.map((e) => e.word + '@' + e.row + ',' + e.col + e.dir));
    for (const d of ['A', 'D']) for (let a = 0; a < ROWS; a++) {
      let run = '', sr = 0, sc = 0;
      for (let b = 0; b <= COLS; b++) {
        const r = d === 'A' ? a : b, c = d === 'A' ? b : a, ch = b < COLS ? g[r][c] : '';
        if (ch) { if (!run) { sr = r; sc = c; } run += ch; }
        else { if (run.length >= 2 && !words.has(run + '@' + sr + ',' + sc + d)) return false; run = ''; }
      }
    }
    return true;
  }
  function numbered(entries) {                  // clue numbers in reading order of the start cells
    const starts = [...new Set(entries.map((e) => e.row + ',' + e.col))].map((k) => k.split(',').map(Number)).sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const nums = new Map(starts.map((p, i) => [p.join(','), i + 1]));
    for (const e of entries) e.num = nums.get(e.row + ',' + e.col);
    return entries.sort((p, q) => (p.dir === q.dir ? p.num - q.num : p.dir < q.dir ? -1 : 1));
  }
  function layout() {
    const t0 = performance.now();
    for (let k = 0; k < 400 && performance.now() - t0 < 1500; k++) {
      const placed = attempt();
      if (placed.length < TARGET || !validLayout(placed)) continue;
      const across = placed.filter((e) => e.dir === 'A').length;
      if (Math.min(across, placed.length - across) >= 6) return numbered(placed);
    }
    return numbered(FALLBACK.map((e) => Object.assign({}, e)));
  }
  const WORD_POINTS = 50, HINT_COST = 20, TIME_BONUS_MAX = 600;
  let cells = {};              // 'r,c' -> { letter, num, el, entries: [] }
  const key = (r, c) => r + ',' + c;
  function indexCells() {
    cells = {};
    for (const e of DATA.entries) {
      for (let i = 0; i < e.word.length; i++) {
        const r = e.row + (e.dir === 'D' ? i : 0), c = e.col + (e.dir === 'A' ? i : 0), k = key(r, c);
        const cell = cells[k] || (cells[k] = { r, c, letter: e.word[i], entries: [], num: 0 });
        if (cell.letter !== e.word[i]) throw new Error('crossword conflict at ' + k);
        cell.entries.push(e);
        if (i === 0) cell.num = cell.num ? Math.min(cell.num, e.num) : e.num;
      }
    }
  }
  function relayout() { DATA.entries = layout(); indexCells(); build(); }
  let user = {}, sel = null, dir = 'A', open = false, startAt = 0, hints = 0, timer = 0, done = false, checked = {};
  let solved = {}, locked = {}, pts = 0;   // solved entries (by id), their cells (locked green), running points
  let wrongShown = {}, toastTimer = 0;      // a filled-but-wrong word is flagged once until one of its letters changes
  const TOAST_MS = 1000;
  function toast(kind, title, sub) {
    const t = $('xw-toast');
    t.className = 'xw-toast ' + kind; $('xw-toast-title').textContent = title; $('xw-toast-sub').textContent = sub || '';
    t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, TOAST_MS);
  }
  const cellsOf = (e) => { const out = []; for (let i = 0; i < e.word.length; i++) out.push(key(e.row + (e.dir === 'D' ? i : 0), e.col + (e.dir === 'A' ? i : 0))); return out; };
  const isFilled = (e) => cellsOf(e).every((k) => !!user[k]);
  const idOf = (e) => e.dir + e.num + e.word;
  const sfx = () => (window.GebokRun ? window.GebokRun.sfx : null);
  function build() {
    const grid = $('xw-grid');
    grid.replaceChildren();
    grid.style.gridTemplateColumns = 'repeat(' + DATA.cols + ', 1fr)';
    for (let r = 0; r < DATA.rows; r++) for (let c = 0; c < DATA.cols; c++) {
      const cell = cells[key(r, c)];
      const el = document.createElement('div');
      el.className = 'xw-cell' + (cell ? '' : ' black');
      if (cell) {
        cell.el = el;
        el.setAttribute('role', 'gridcell');
        el.tabIndex = -1;
        if (cell.num) { const n = document.createElement('span'); n.className = 'xw-num'; n.textContent = cell.num; el.append(n); }
        const l = document.createElement('span'); l.className = 'xw-letter'; el.append(l);
        el.addEventListener('click', () => select(cell, sel === cell));
      }
      grid.append(el);
    }
    const across = $('xw-across'), down = $('xw-down');
    across.replaceChildren(); down.replaceChildren();
    for (const e of DATA.entries.slice().sort((a, b) => a.num - b.num)) {
      const li = document.createElement('li');
      li.value = e.num;
      li.textContent = e.clue + ' (' + e.word.length + ')';
      li.dataset.id = e.dir + e.num + e.word;
      li.addEventListener('click', () => { dir = e.dir; select(cells[key(e.row, e.col)], false); });
      (e.dir === 'A' ? across : down).append(li);
    }
    const keys = $('xw-keys');
    keys.replaceChildren();
    for (const row of ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM⌫']) {
      const rowEl = document.createElement('div'); rowEl.className = 'xw-keyrow';
      for (const ch of row) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'xw-key' + (ch === '⌫' ? ' wide' : ''); b.textContent = ch;
        b.addEventListener('click', () => { typeChar(ch === '⌫' ? 'Backspace' : ch); });
        rowEl.append(b);
      }
      keys.append(rowEl);
    }
  }
  function wordOf(cell, d) { return cell.entries.find((e) => e.dir === d) || cell.entries[0]; }
  function select(cell, toggle) {
    if (!cell) return;
    if (toggle && cell.entries.length > 1) dir = dir === 'A' ? 'D' : 'A';
    else if (!cell.entries.some((e) => e.dir === dir)) dir = cell.entries[0].dir;
    sel = cell;
    render();
  }
  function render() {
    const active = sel ? wordOf(sel, dir) : null;
    for (const k of Object.keys(cells)) {
      const cell = cells[k], el = cell.el;
      el.querySelector('.xw-letter').textContent = user[k] || '';
      el.classList.toggle('sel', cell === sel);
      el.classList.toggle('inword', !!active && cell.entries.includes(active));
      el.classList.toggle('wrong', !!checked[k] && user[k] && user[k] !== cell.letter);
      el.classList.toggle('ok', !!checked[k] && user[k] === cell.letter);
      el.classList.toggle('locked', !!locked[k]);
    }
    document.querySelectorAll('#xw-across li, #xw-down li').forEach((li) => {
      const e = DATA.entries.find((x) => x.dir + x.num + x.word === li.dataset.id);
      li.classList.toggle('active', e === active);
      li.classList.toggle('solved', isSolved(e));
    });
    $('xw-progress').textContent = DATA.entries.filter(isSolved).length + '/' + DATA.entries.length;
    $('xw-score-val').textContent = total().toLocaleString();
    $('xw-hint').disabled = done || total() < HINT_COST;   // a hint costs 20 points: none to spend, none to take
  }
  function total() { return Math.max(0, pts - hints * HINT_COST); }
  // A newly completed word: a chime, WORD_POINTS, its cells lock green and pop.
  function checkSolved(viaHint) {
    let hit = null;
    for (const e of DATA.entries) {
      if (solved[idOf(e)] || !isSolved(e)) continue;
      solved[idOf(e)] = true; pts += WORD_POINTS; hit = e;
      for (let i = 0; i < e.word.length; i++) {
        const k = key(e.row + (e.dir === 'D' ? i : 0), e.col + (e.dir === 'A' ? i : 0));
        locked[k] = true; checked[k] = true;
        const el = cells[k].el; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      }
    }
    if (!hit) return checkWrong();
    const sc = $('xw-score'); sc.classList.remove('pop'); void sc.offsetWidth; sc.classList.add('pop');
    if (sfx()) sfx().correct();
    $('xw-status').textContent = '\u2713 ' + hit.word + ' betul! +' + WORD_POINTS + ' mata' + (viaHint ? ' (bantuan \u2212' + HINT_COST + ')' : '') + '. Jumlah: ' + total().toLocaleString() + '.';
    toast('ok', 'BETUL! ' + hit.word, '+' + WORD_POINTS + ' mata \u00b7 Jumlah ' + total().toLocaleString());
    return true;
  }
  // A word filled in completely but not matching: a buzz, a red shake and a one-second verdict; flagged once per attempt.
  function checkWrong() {
    const e = DATA.entries.find((x) => !solved[idOf(x)] && !wrongShown[idOf(x)] && isFilled(x));
    if (!e) return false;
    wrongShown[idOf(e)] = true;
    for (const k of cellsOf(e)) { const el = cells[k].el; if (locked[k]) continue; el.classList.remove('bad'); void el.offsetWidth; el.classList.add('bad'); }
    setTimeout(() => { for (const k of cellsOf(e)) cells[k].el.classList.remove('bad'); }, 700);
    if (sfx()) sfx().wrong();
    $('xw-status').textContent = '\u2717 Belum tepat. Semak ejaan dan cuba lagi.';
    toast('bad', 'SALAH', 'Cuba lagi');
    return true;
  }
  function isSolved(e) {
    for (let i = 0; i < e.word.length; i++) {
      const k = key(e.row + (e.dir === 'D' ? i : 0), e.col + (e.dir === 'A' ? i : 0));
      if (user[k] !== e.word[i]) return false;
    }
    return true;
  }
  function step(cell, d, delta) {
    const r = cell.r + (d === 'D' ? delta : 0), c = cell.c + (d === 'A' ? delta : 0);
    return cells[key(r, c)] || null;
  }
  function typeChar(ch) {
    if (!sel || done) return;
    if (ch === 'Backspace') {
      const k = key(sel.r, sel.c);
      if (user[k] && !locked[k]) { delete user[k]; delete checked[k]; for (const e of sel.entries) delete wrongShown[idOf(e)]; }
      else { const prev = step(sel, dir, -1); if (prev) { sel = prev; const pk = key(prev.r, prev.c); if (!locked[pk]) { delete user[pk]; delete checked[pk]; } } }
      render();
      return;
    }
    if (!/^[A-Z]$/.test(ch)) return;
    const k = key(sel.r, sel.c);
    if (!locked[k]) { user[k] = ch; delete checked[k]; for (const e of sel.entries) delete wrongShown[idOf(e)]; }   // a solved word stays as it is
    const next = step(sel, dir, 1);
    if (next) sel = next;
    render();
    if (checkSolved(false)) render();
    if (DATA.entries.every(isSolved)) finish();
  }
  function hint() {
    if (!sel || done || total() < HINT_COST) return;
    const k = key(sel.r, sel.c);
    if (user[k] === sel.letter) { const next = step(sel, dir, 1); if (next) { sel = next; render(); } return; }
    user[k] = sel.letter; checked[k] = true; hints++;
    const next = step(sel, dir, 1);
    if (next) sel = next;
    render();
    $('xw-status').textContent = 'Bantuan digunakan: ' + hints + ' (−' + HINT_COST + ' setiap satu). Jumlah: ' + total().toLocaleString() + '.';
    if (checkSolved(true)) render();
    if (DATA.entries.every(isSolved)) finish();
  }
  function elapsed() { return (performance.now() - startAt) / 1000; }
  function tick() { if (!open || done) return; const t = Math.floor(elapsed()); $('xw-timer').textContent = String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); }
  function score(t) { return Math.max(0, pts + Math.max(0, TIME_BONUS_MAX - Math.floor(t)) - hints * HINT_COST); }   // words + time bonus − hints
  function finish() {
    done = true;
    const t = elapsed(), s = score(t);
    const stats = $('xw-stats');
    stats.replaceChildren();
    for (const [label, val] of [['Skor', s.toLocaleString()], ['Mata perkataan', (pts - hints * HINT_COST).toLocaleString()], ['Bonus masa', String(Math.max(0, TIME_BONUS_MAX - Math.floor(t)))], ['Masa', Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0')], ['Perkataan', DATA.entries.length + ' / ' + DATA.entries.length], ['Bantuan', String(hints)]]) {
      const d = document.createElement('div'); const dt = document.createElement('dt'); dt.textContent = label; const dd = document.createElement('dd'); dd.textContent = val; d.append(dt, dd); stats.append(d);
    }
    $('xw-done').hidden = false;
    if (window.GebokRun) window.GebokRun.sfx.fanfare();
    GebokStore.recordGame('crossword', { at: new Date().toISOString(), level: 1, result: 'won', score: s, time: +t.toFixed(1), hints, words: DATA.entries.length })
      .catch(() => { /* kept on this device only */ });
  }
  function start() {
    relayout();
    user = {}; checked = {}; solved = {}; locked = {}; wrongShown = {}; pts = 0; hints = 0; done = false; startAt = performance.now();
    clearTimeout(toastTimer); $('xw-toast').hidden = true;
    $('xw-done').hidden = true;
    $('xw-status').textContent = 'Klik pada petak, taip jawapan dan lengkapkan semua teka silang. Klik petak yang sama untuk tukar arah.';
    const first = DATA.entries.slice().sort((p, q) => p.num - q.num)[0];
    dir = first.dir;
    select(cells[key(first.row, first.col)], false);
    clearInterval(timer);
    timer = setInterval(tick, 250);
    tick();
  }
  function openGame() {
    window.GebokRun.menu();
    window.GebokRun.pauseRender(true);
    open = true;
    $('crossword').hidden = false;
    start();
  }
  function close() {
    open = false;
    clearInterval(timer);
    window.GebokRun.pauseRender(false);
    window.LaksaArcade.showGames();
  }
  function wire() {
    relayout();
    $('xw-hint').addEventListener('click', hint);
    $('xw-exit').addEventListener('click', close);
    $('xw-again').addEventListener('click', start);
    $('xw-back').addEventListener('click', close);
    window.addEventListener('keydown', (e) => {
      if (!open || done) return;
      if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      const k = e.key;
      if (k === 'Backspace') { typeChar('Backspace'); e.preventDefault(); }
      else if (/^[a-zA-Z]$/.test(k)) { typeChar(k.toUpperCase()); e.preventDefault(); }
      else if (k === 'ArrowRight' || k === 'ArrowLeft' || k === 'ArrowUp' || k === 'ArrowDown') {
        const d = (k === 'ArrowRight' || k === 'ArrowLeft') ? 'A' : 'D';
        const next = sel && step(sel, d, (k === 'ArrowRight' || k === 'ArrowDown') ? 1 : -1);
        if (next) { dir = next.entries.some((x) => x.dir === d) ? d : dir; sel = next; render(); }
        e.preventDefault();
      } else if (k === 'Escape') { close(); e.preventDefault(); }
    });
  }
  window.LaksaCrossword = { open: openGame, close, wire, DATA, layout, select: (r, c, d) => { dir = d || dir; select(cells[key(r, c)], false); }, type: typeChar, get points() { return total(); } };
})();
