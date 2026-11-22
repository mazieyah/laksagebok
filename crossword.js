/* ======================================================================
   LaksaCrossword — Teka Silang Laksa: 15 clues about laksa gebuk and Pahang.
   Grid generated offline and validated: every crossing letter agrees and no
   stray adjacent letters.
   ====================================================================== */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const DATA = { rows: 12, cols: 12, entries: [
    { word: 'KUAH', row: 1, col: 1, dir: 'A', num: 2, clue: 'Cecair pekat yang disiram ke atas mi' },
    { word: 'TIMUN', row: 4, col: 7, dir: 'A', num: 7, clue: 'Ulam hijau yang dihiris halus' },
    { word: 'LAKSA', row: 5, col: 3, dir: 'A', num: 8, clue: 'Hidangan mi tradisi Pahang dengan kuah ikan' },
    { word: 'TEPUNG', row: 7, col: 1, dir: 'A', num: 10, clue: 'Bahan asas adunan mi (tepung beras)' },
    { word: 'MUZIUM', row: 10, col: 5, dir: 'A', num: 12, clue: 'Tempat gebuk dipamerkan di Pahang' },
    { word: 'REBUS', row: 11, col: 0, dir: 'A', num: 13, clue: 'Cara memasak mi laksa: terus dalam air mendidih' },
    { word: 'SAMBAL', row: 0, col: 3, dir: 'D', num: 1, clue: 'Pedas, disendukkan ke atas laksa' },
    { word: 'KESUM', row: 1, col: 1, dir: 'D', num: 2, clue: 'Daun ulam yang wajib ada dalam laksa' },
    { word: 'KANTAN', row: 1, col: 7, dir: 'D', num: 3, clue: 'Bunga yang dihiris nipis sebagai ulam' },
    { word: 'ULAM', row: 1, col: 9, dir: 'D', num: 4, clue: 'Sayur mentah pelengkap laksa' },
    { word: 'KENDURI', row: 2, col: 11, dir: 'D', num: 5, clue: 'Majlis kampung tempat laksa dihidang beramai-ramai' },
    { word: 'IKAN', row: 4, col: 5, dir: 'D', num: 6, clue: 'Bahan utama kuah laksa' },
    { word: 'LIMAU', row: 6, col: 9, dir: 'D', num: 9, clue: 'Diperah untuk rasa masam' },
    { word: 'TAUGE', row: 7, col: 1, dir: 'D', num: 10, clue: 'Kecambah kacang hijau dalam laksa' },
    { word: 'GEBUK', row: 7, col: 6, dir: 'D', num: 11, clue: 'Acuan loyang yang menekan adunan menjadi mi laksa' },
  ] };
  const WORD_POINTS = 50, HINT_COST = 20, TIME_BONUS_MAX = 600;
  const cells = {};            // 'r,c' -> { letter, num, el, entries: [] }
  const key = (r, c) => r + ',' + c;
  for (const e of DATA.entries) {
    for (let i = 0; i < e.word.length; i++) {
      const r = e.row + (e.dir === 'D' ? i : 0), c = e.col + (e.dir === 'A' ? i : 0), k = key(r, c);
      const cell = cells[k] || (cells[k] = { r, c, letter: e.word[i], entries: [], num: 0 });
      if (cell.letter !== e.word[i]) throw new Error('crossword conflict at ' + k);
      cell.entries.push(e);
      if (i === 0) cell.num = cell.num ? Math.min(cell.num, e.num) : e.num;
    }
  }
  let user = {}, sel = null, dir = 'A', open = false, startAt = 0, hints = 0, timer = 0, done = false, checked = {};
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
    }
    document.querySelectorAll('#xw-across li, #xw-down li').forEach((li) => {
      const e = DATA.entries.find((x) => x.dir + x.num + x.word === li.dataset.id);
      li.classList.toggle('active', e === active);
      li.classList.toggle('solved', isSolved(e));
    });
    $('xw-progress').textContent = DATA.entries.filter(isSolved).length + ' / ' + DATA.entries.length;
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
      if (user[k]) { delete user[k]; delete checked[k]; }
      else { const prev = step(sel, dir, -1); if (prev) { sel = prev; delete user[key(prev.r, prev.c)]; delete checked[key(prev.r, prev.c)]; } }
      render();
      return;
    }
    if (!/^[A-Z]$/.test(ch)) return;
    const k = key(sel.r, sel.c);
    user[k] = ch; delete checked[k];
    const next = step(sel, dir, 1);
    if (next) sel = next;
    render();
    if (DATA.entries.every(isSolved)) finish();
  }
  function check() {
    for (const k of Object.keys(cells)) if (user[k]) checked[k] = true;
    render();
    const wrong = Object.keys(cells).filter((k) => user[k] && user[k] !== cells[k].letter).length;
    $('xw-status').textContent = wrong ? wrong + ' huruf salah ditanda merah.' : 'Semua huruf yang diisi betul.';
  }
  function hint() {
    if (!sel || done) return;
    const k = key(sel.r, sel.c);
    if (user[k] === sel.letter) { const next = step(sel, dir, 1); if (next) { sel = next; render(); } return; }
    user[k] = sel.letter; checked[k] = true; hints++;
    const next = step(sel, dir, 1);
    if (next) sel = next;
    render();
    $('xw-status').textContent = 'Bantuan digunakan: ' + hints + ' (−' + HINT_COST + ' setiap satu).';
    if (DATA.entries.every(isSolved)) finish();
  }
  function elapsed() { return (performance.now() - startAt) / 1000; }
  function tick() { if (!open || done) return; const t = Math.floor(elapsed()); $('xw-timer').textContent = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
  function score(t) { return Math.max(0, DATA.entries.length * WORD_POINTS + Math.max(0, TIME_BONUS_MAX - Math.floor(t)) - hints * HINT_COST); }
  function finish() {
    done = true;
    const t = elapsed(), s = score(t);
    const stats = $('xw-stats');
    stats.replaceChildren();
    for (const [label, val] of [['Skor', s.toLocaleString()], ['Masa', Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0')], ['Perkataan', DATA.entries.length + ' / ' + DATA.entries.length], ['Bantuan', String(hints)]]) {
      const d = document.createElement('div'); const dt = document.createElement('dt'); dt.textContent = label; const dd = document.createElement('dd'); dd.textContent = val; d.append(dt, dd); stats.append(d);
    }
    $('xw-done').hidden = false;
    if (window.GebokRun) window.GebokRun.sfx.fanfare();
    GebokStore.recordGame('crossword', { at: new Date().toISOString(), level: 1, result: 'won', score: s, time: +t.toFixed(1), hints, words: DATA.entries.length })
      .catch(() => { /* kept on this device only */ });
  }
  function start() {
    user = {}; checked = {}; hints = 0; done = false; startAt = performance.now();
    $('xw-done').hidden = true;
    $('xw-status').textContent = 'Klik petak atau petunjuk, kemudian taip. Klik petak yang sama untuk tukar arah.';
    dir = 'A';
    select(cells[key(1, 1)], false);
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
    build();
    $('xw-check').addEventListener('click', check);
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
  window.LaksaCrossword = { open: openGame, close, wire, DATA };
})();
