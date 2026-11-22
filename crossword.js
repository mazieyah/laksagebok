/* ======================================================================
   LaksaCrossword — Teka Silang Laksa: 15 clues drawn from the "Maklumat Laksa
   Gebok" pages (asal-usul, proses pembuatan, resipi). Grid generated offline
   (scratchpad xwgen.py) and validated: every crossing letter agrees and no
   stray adjacent letters.
   ====================================================================== */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const DATA = { rows: 12, cols: 12, entries: [
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
    $('xw-progress').textContent = DATA.entries.filter(isSolved).length + ' / ' + DATA.entries.length;
    $('xw-score').textContent = 'SKOR ' + total().toLocaleString();
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
  function check() {
    for (const k of Object.keys(cells)) if (user[k]) checked[k] = true;
    render();
    const wrong = Object.keys(cells).filter((k) => user[k] && user[k] !== cells[k].letter).length;
    $('xw-status').textContent = wrong ? wrong + ' huruf salah ditanda merah.' : 'Semua huruf yang diisi betul.';
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
  function tick() { if (!open || done) return; const t = Math.floor(elapsed()); $('xw-timer').textContent = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
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
    user = {}; checked = {}; solved = {}; locked = {}; wrongShown = {}; pts = 0; hints = 0; done = false; startAt = performance.now();
    clearTimeout(toastTimer); $('xw-toast').hidden = true;
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
  window.LaksaCrossword = { open: openGame, close, wire, DATA, select: (r, c, d) => { dir = d || dir; select(cells[key(r, c)], false); }, type: typeChar, get points() { return total(); } };
})();
