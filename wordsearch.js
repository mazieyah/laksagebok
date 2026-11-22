/* ======================================================================
   LaksaWordSearch — Cari Kata Laksa: find 14 words from the "Maklumat Laksa
   Gebok" pages hidden in a 12×12 letter grid. A new grid is generated every play. Select a word by
   dragging across its letters (or tap its first letter, then its last).
   ====================================================================== */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const N = 12;
  const WORDS = [                                 // from the "Maklumat Laksa Gebok" pages
    ['LAKSA', 'hidangan kebanggaan Pahang'], ['GEBOK', 'alat tembaga penekan mi'], ['TEMBAGA', 'logam gebok tradisional'], ['PEKAN', 'bandar Muzium Sultan Abu Bakar'],
    ['GANDUM', 'tepung untuk doh mi'], ['KEMBUNG', 'ikan kuah lemak'], ['SANTAN', 'pekat, dalam kuah'], ['KERISIK', 'kelapa goreng tumbuk'],
    ['SERAI', 'empat batang dalam kuah'], ['KETUMBAR', 'biji rempah digoreng tanpa minyak'], ['SELASIH', 'daun ulam dihiris nipis'], ['KUNYIT', 'daunnya ulam laksa'],
    ['BELACAN', 'dibakar, bersama sambal'], ['KASTURI', 'limau dibelah dua'],
  ];
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1], [0, -1], [-1, 0], [-1, -1], [-1, 1]];
  const FILL = 'AAABCDEGHIIJKKLMMNNPRSSTUU';          // the fill leans on letters common in Malay
  const WORD_POINTS = 40, HINT_COST = 20, TIME_BONUS_MAX = 600;
  let grid = [], placed = [], cellEls = [], open = false, done = false, startAt = 0, hints = 0, timer = 0, pts = 0;
  const sfx = () => (window.GebokRun ? window.GebokRun.sfx : null);
  const total = () => Math.max(0, pts - hints * HINT_COST);   // the running score: words found minus hints
  let drag = null, anchor = null, hintTimer = 0;

  function generate() {
    for (let attempt = 0; attempt < 200; attempt++) {
      const g = Array.from({ length: N }, () => Array(N).fill(''));
      const out = [];
      const words = WORDS.slice().sort((a, b) => b[0].length - a[0].length);
      let ok = true;
      for (const [w, clue] of words) {
        let put = false;
        for (let t = 0; t < 400 && !put; t++) {
          const d = DIRS[Math.random() < 0.72 ? Math.floor(Math.random() * 4) : 4 + Math.floor(Math.random() * 4)];
          const r0 = Math.floor(Math.random() * N), c0 = Math.floor(Math.random() * N);
          const r1 = r0 + d[0] * (w.length - 1), c1 = c0 + d[1] * (w.length - 1);
          if (r1 < 0 || r1 >= N || c1 < 0 || c1 >= N) continue;
          let fits = true, overlap = 0;
          for (let i = 0; i < w.length; i++) { const ch = g[r0 + d[0] * i][c0 + d[1] * i]; if (ch) { if (ch !== w[i]) { fits = false; break; } overlap++; } }
          if (!fits || overlap === w.length) continue;
          for (let i = 0; i < w.length; i++) g[r0 + d[0] * i][c0 + d[1] * i] = w[i];
          out.push({ word: w, clue, r0, c0, r1, c1, found: false });
          put = true;
        }
        if (!put) { ok = false; break; }
      }
      if (!ok) continue;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!g[r][c]) g[r][c] = FILL[Math.floor(Math.random() * FILL.length)];
      out.sort((a, b) => a.word.localeCompare(b.word));
      return { g, out };
    }
    throw new Error('could not build a word-search grid');
  }
  function build() {
    const res = generate();
    grid = res.g; placed = res.out;
    const el = $('ws-grid');
    el.replaceChildren();
    el.style.gridTemplateColumns = 'repeat(' + N + ', 1fr)';
    cellEls = [];
    for (let r = 0; r < N; r++) { cellEls.push([]); for (let c = 0; c < N; c++) {
      const d = document.createElement('div'); d.className = 'ws-cell'; d.textContent = grid[r][c]; d.dataset.r = r; d.dataset.c = c;
      el.append(d); cellEls[r].push(d);
    } }
    const list = $('ws-words');
    list.replaceChildren();
    placed.forEach((p, i) => { const li = document.createElement('li'); li.textContent = p.word; li.title = p.clue; li.dataset.i = i; list.append(li); });
    renderList();
  }
  function renderList() {
    for (const li of $('ws-words').children) li.classList.toggle('found', placed[+li.dataset.i].found);
    $('ws-progress').textContent = placed.filter((p) => p.found).length + ' / ' + placed.length;
    $('ws-score').textContent = 'SKOR ' + total().toLocaleString();
    $('ws-hint').disabled = done || total() < HINT_COST || placed.every((p) => p.found);   // a hint costs 20 points
  }
  function cellAt(x, y) {
    const rect = $('ws-grid').getBoundingClientRect();
    const c = Math.floor((x - rect.left) / (rect.width / N)), r = Math.floor((y - rect.top) / (rect.height / N));
    return { r: Math.max(0, Math.min(N - 1, r)), c: Math.max(0, Math.min(N - 1, c)) };
  }
  // The straight line from a start cell toward a target cell, snapped to one of the 8 directions and kept inside the grid.
  function lineTo(a, b) {
    const dr = b.r - a.r, dc = b.c - a.c, ar = Math.abs(dr), ac = Math.abs(dc);
    let d, len;
    if (!ar && !ac) { d = [0, 0]; len = 0; }
    else if (ac >= 2 * ar) { d = [0, Math.sign(dc)]; len = ac; }
    else if (ar >= 2 * ac) { d = [Math.sign(dr), 0]; len = ar; }
    else { d = [Math.sign(dr), Math.sign(dc)]; len = Math.min(ar, ac); }
    const cells = [];
    for (let i = 0; i <= len; i++) { const r = a.r + d[0] * i, c = a.c + d[1] * i; if (r < 0 || r >= N || c < 0 || c >= N) break; cells.push({ r, c }); }
    return cells;
  }
  function paintSel(cells) {
    for (const row of cellEls) for (const d of row) d.classList.remove('sel');
    for (const q of cells) cellEls[q.r][q.c].classList.add('sel');
  }
  function submit(cells) {
    paintSel([]);
    if (done || cells.length < 2) return false;
    const s = cells.map((q) => grid[q.r][q.c]).join(''), rs = s.split('').reverse().join('');
    const hit = placed.find((p) => !p.found && (p.word === s || p.word === rs));
    if (!hit) {                              // not a listed word: a buzz and a red flash on the letters picked
      $('ws-status').textContent = s.length > 2 ? '\u2717 "' + s + '" bukan perkataan dalam senarai.' : '';
      for (const q of cells) { const el = cellEls[q.r][q.c]; el.classList.remove('bad'); void el.offsetWidth; el.classList.add('bad'); }
      setTimeout(() => { for (const q of cells) cellEls[q.r][q.c].classList.remove('bad'); }, 700);
      if (sfx()) sfx().wrong();
      return false;
    }
    hit.found = true;
    const idx = placed.indexOf(hit);
    for (const q of cells) { const el = cellEls[q.r][q.c]; el.classList.add('found'); el.style.setProperty('--ws-col', 'hsl(' + ((idx * 47) % 360) + ' 70% 78%)'); }
    pts += WORD_POINTS;
    $('ws-status').textContent = '\u2713 ' + hit.word + ' (' + hit.clue + ') +' + WORD_POINTS + ' mata. Jumlah: ' + total().toLocaleString() + '.';
    if (sfx()) sfx().correct();
    renderList();
    const sc = $('ws-score'); sc.classList.remove('pop'); void sc.offsetWidth; sc.classList.add('pop');
    if (placed.every((p) => p.found)) finish();
    return true;
  }
  function hint() {
    if (done || total() < HINT_COST) return;
    const left = placed.filter((p) => !p.found);
    if (!left.length) return;
    const p = left[Math.floor(Math.random() * left.length)];
    hints++;
    clearTimeout(hintTimer);
    for (const row of cellEls) for (const d of row) d.classList.remove('hint');
    const el = cellEls[p.r0][p.c0]; el.classList.add('hint');
    hintTimer = setTimeout(() => el.classList.remove('hint'), 2500);
    $('ws-status').textContent = 'Bantuan: huruf pertama "' + p.word + '" berkelip (−' + HINT_COST + '). Jumlah: ' + total().toLocaleString() + '.';
    renderList();
  }
  function elapsed() { return (performance.now() - startAt) / 1000; }
  function fmt(t) { t = Math.floor(t); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
  function tick() { if (!open || done) return; $('ws-timer').textContent = fmt(elapsed()); }
  function score(t) { return Math.max(0, pts + Math.max(0, TIME_BONUS_MAX - Math.floor(t)) - hints * HINT_COST); }   // words + time bonus − hints
  function finish() {
    done = true;
    const t = elapsed(), s = score(t);
    const stats = $('ws-stats');
    stats.replaceChildren();
    for (const [label, val] of [['Skor', s.toLocaleString()], ['Mata perkataan', (pts - hints * HINT_COST).toLocaleString()], ['Bonus masa', String(Math.max(0, TIME_BONUS_MAX - Math.floor(t)))], ['Masa', fmt(t)], ['Perkataan', placed.length + ' / ' + placed.length], ['Bantuan', String(hints)]]) {
      const d = document.createElement('div'); const dt = document.createElement('dt'); dt.textContent = label; const dd = document.createElement('dd'); dd.textContent = val; d.append(dt, dd); stats.append(d);
    }
    $('ws-done').hidden = false;
    if (window.GebokRun) window.GebokRun.sfx.fanfare();
    GebokStore.recordGame('wordsearch', { at: new Date().toISOString(), level: 1, result: 'won', score: s, time: +t.toFixed(1), hints, words: placed.length })
      .catch(() => { /* kept on this device only */ });
    if (window.LaksaArcade) window.LaksaArcade.renderBests();
  }
  function start() {
    build();
    hints = 0; pts = 0; done = false; startAt = performance.now(); drag = null; anchor = null;
    renderList();
    $('ws-done').hidden = true;
    $('ws-status').textContent = 'Seret merentasi huruf, atau ketik huruf pertama kemudian huruf terakhir.';
    clearInterval(timer);
    timer = setInterval(tick, 250);
    tick();
  }
  function openGame() {
    window.GebokRun.menu();
    window.GebokRun.pauseRender(true);
    open = true;
    $('wordsearch').hidden = false;
    start();
  }
  function close() {
    open = false;
    clearInterval(timer);
    window.GebokRun.pauseRender(false);
    window.LaksaArcade.showGames();
  }
  function wire() {
    const g = $('ws-grid');
    g.addEventListener('pointerdown', (e) => {
      if (done) return;
      e.preventDefault();
      const cell = cellAt(e.clientX, e.clientY);
      if (anchor) {                         // second tap completes a tap-tap selection
        const cells = lineTo(anchor, cell);
        anchor = null;
        if (cells.length > 1) { submit(cells); return; }
      }
      drag = { start: cell, moved: false, id: e.pointerId };
      try { g.setPointerCapture(e.pointerId); } catch (err) { /* capture unavailable */ }
      paintSel([cell]);
    });
    g.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const cell = cellAt(e.clientX, e.clientY);
      if (cell.r !== drag.start.r || cell.c !== drag.start.c) drag.moved = true;
      paintSel(lineTo(drag.start, cell));
    });
    const up = (e) => {
      if (!drag) return;
      const cell = cellAt(e.clientX, e.clientY);
      const cells = lineTo(drag.start, cell);
      const d = drag; drag = null;
      if (!d.moved || cells.length < 2) { anchor = d.start; paintSel([d.start]); $('ws-status').textContent = 'Sekarang ketik huruf terakhir perkataan itu.'; return; }
      submit(cells);
    };
    g.addEventListener('pointerup', up);
    g.addEventListener('pointercancel', () => { drag = null; paintSel(anchor ? [anchor] : []); });
    $('ws-hint').addEventListener('click', hint);
    $('ws-exit').addEventListener('click', close);
    $('ws-again').addEventListener('click', start);
    $('ws-back').addEventListener('click', close);
    window.addEventListener('keydown', (e) => { if (open && e.key === 'Escape') { close(); e.preventDefault(); } });
  }
  window.LaksaWordSearch = { open: openGame, close, wire, N, WORDS,
    debug: () => ({ placed: placed.map((p) => Object.assign({}, p)), grid: grid.map((r) => r.join('')), hints, done, found: placed.filter((p) => p.found).length }),
    select: (r0, c0, r1, c1) => submit(lineTo({ r: r0, c: c0 }, { r: r1, c: c1 })), lineTo, hint };
})();
