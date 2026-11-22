/* ======================================================================
   LaksaCrossword — Teka Silang Laksa: 15 clues from a 100-question bank on
   Pahang heritage, the laksa kitchen and laksa gebok, laid out at random on a
   12×12 grid every play (classic rules: every word crosses another, crossings
   agree, no stray adjacent letters); a fixed layout is the fallback.
   ====================================================================== */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  // Question bank (100 clues, Pahang heritage and kitchen): answers without spaces; a word with several clues gets one of them, and
  // never appears twice in one layout. Answers over 12 letters or under 3 are left out.
  const POOL = [
    ['PAHANG', 'Negeri yang terkenal dengan Laksa Pahang.'],
    ['LESUNG', 'Alat tradisional untuk menumbuk cili dan rempah.'],
    ['DURIAN', 'Buah yang dikenali sebagai raja buah.'],
    ['LAKSA', 'Makanan tradisional yang menjadi tema utama permainan.'],
    ['PERIUK', 'Peralatan untuk memasak air atau kuah.'],
    ['PEKAN', 'Bandar diraja negeri Pahang.'],
    ['IKAN', 'Bahan utama untuk menghasilkan kuah laksa.'],
    ['SILAT', 'Seni mempertahankan diri tradisional Melayu.'],
    ['ASAM', 'Bahan yang memberikan rasa masam dalam kuah.'],
    ['GEBOK', 'Alat tradisional yang digunakan dalam penyediaan Laksa Gebok.'],
    ['KUANTAN', 'Bandar utama dan ibu negeri Pahang.'],
    ['GULA', 'Bahan yang digunakan untuk memberikan rasa manis.'],
    ['PISAU', 'Alat untuk memotong bahan masakan.'],
    ['TIOMAN', 'Pulau peranginan terkenal di Pahang.'],
    ['CILI', 'Bahan berwarna merah yang memberikan rasa pedas.'],
    ['SONGKET', 'Kain tradisional yang mempunyai corak tenunan.'],
    ['KUAH', 'Cecair yang dihidangkan bersama laksa.'],
    ['KELAPA', 'Tumbuhan yang menghasilkan buah kelapa.'],
    ['CONGKAK', 'Permainan tradisional menggunakan papan berlubang dan buah.'],
    ['GORENG', 'Kaedah memasak menggunakan minyak panas.'],
    ['SENDUK', 'Alat untuk mengacau kuah di dalam periuk.'],
    ['KESUM', 'Daun beraroma yang digunakan dalam masakan laksa.'],
    ['CAWAN', 'Bekas untuk minum air.'],
    ['GUNUNGTAHAN', 'Gunung tertinggi di Semenanjung Malaysia yang terletak di Pahang.'],
    ['BERAS', 'Bahan utama dalam pembuatan nasi.'],
    ['TUMBUK', 'Proses menghancurkan bahan menggunakan lesung.'],
    ['GONG', 'Alat muzik tradisional yang dimainkan dengan dipukul.'],
    ['LIMAU', 'Buah yang sering digunakan untuk memberikan rasa masam.'],
    ['PAPAN', 'Permukaan yang digunakan untuk memotong bahan.'],
    ['GARAM', 'Bahan masakan yang memberikan rasa masin.'],
    ['SUNGAIPAHANG', 'Sungai terkenal yang mengalir di negeri Pahang.'],
    ['TEMPAYAN', 'Bekas tradisional untuk menyimpan makanan.'],
    ['KUPAS', 'Proses membuang kulit bawang.'],
    ['BULUH', 'Tumbuhan yang mempunyai batang beruas dan boleh dijadikan bahan kraf.'],
    ['PEDAS', 'Rasa yang dihasilkan oleh cili dalam masakan.'],
    ['PINGGAN', 'Peralatan untuk menghidangkan makanan.'],
    ['PATIN', 'Haiwan air tawar yang terkenal sebagai hidangan Pahang.'],
    ['GAUL', 'Proses mencampurkan beberapa bahan.'],
    ['BELACAN', 'Bahan yang sering digunakan untuk menghasilkan sambal.'],
    ['TAMANNEGARA', 'Hutan simpan yang terkenal di Pahang.'],
    ['ALU', 'Alat untuk menumbuk bahan masakan.'],
    ['MAKAN', 'Aktiviti menikmati makanan.'],
    ['SERAI', 'Tumbuhan yang digunakan untuk menambah aroma masakan.'],
    ['CINCANG', 'Proses memotong bahan kepada bahagian kecil.'],
    ['GASING', 'Permainan tradisional menggunakan gasing.'],
    ['REBUS', 'Kaedah memasak menggunakan air panas.'],
    ['SANTAN', 'Bahan asas masakan yang diperoleh daripada kelapa.'],
    ['PENAPIS', 'Peralatan untuk menyaring bahan masakan.'],
    ['TUKANGMASAK', 'Orang yang menyediakan makanan.'],
    ['NANGKA', 'Buah tempatan yang mempunyai duri pada kulit.'],
    ['PERSIAPAN', 'Aktiviti menyediakan bahan sebelum memasak.'],
    ['PENGISAR', 'Alat untuk mengisar atau menghancurkan bahan.'],
    ['BAWANG', 'Bahan masakan yang mempunyai aroma kuat.'],
    ['GARAM', 'Bahan yang diperoleh daripada laut dan digunakan dalam masakan.'],
    ['SENDUK', 'Peralatan untuk mengambil makanan berkuah.'],
    ['BASUH', 'Perbuatan menjaga kebersihan bahan makanan.'],
    ['ULAM', 'Makanan yang dihidangkan sebagai pelengkap hidangan utama.'],
    ['BAWANGPUTIH', 'Bahan masakan berwarna putih dan mempunyai aroma kuat.'],
    ['PENGUPAS', 'Alat untuk mengupas kulit sayuran.'],
    ['TRADISI', 'Amalan turun-temurun yang diwarisi daripada generasi terdahulu.'],
    ['REBUS', 'Proses memasak bahan menggunakan air mendidih.'],
    ['SUNGAI', 'Sumber air semula jadi yang mengalir.'],
    ['KUNYIT', 'Tumbuhan yang digunakan dalam masakan dan mempunyai bau harum.'],
    ['KAYU', 'Rumah tradisional Melayu biasanya diperbuat daripada bahan ini.'],
    ['KAYU', 'Bahan api tradisional daripada kayu.'],
    ['TAWAR', 'Rasa makanan yang tidak manis dan tidak masin.'],
    ['KERANG', 'Haiwan bercengkerang yang hidup di sungai atau laut.'],
    ['JAG', 'Bekas untuk menyimpan air.'],
    ['HIDANG', 'Proses memasukkan makanan ke dalam bekas untuk dihidangkan.'],
    ['GURU', 'Individu yang mewariskan ilmu kepada generasi muda.'],
    ['PANDAN', 'Tumbuhan yang menghasilkan daun pandan.'],
    ['HUTAN', 'Kawasan yang mempunyai banyak pokok dan hidupan liar.'],
    ['LADA', 'Bahan masakan yang mempunyai rasa pedas dan aroma tersendiri.'],
    ['BAKUL', 'Alat tradisional untuk menganyam atau membawa barangan.'],
    ['DOKUMENTASI', 'Proses menyimpan resipi dan cara memasak untuk generasi akan datang.'],
    ['BULUH', 'Bahan semula jadi yang digunakan untuk membuat peralatan tradisional.'],
    ['SEGAR', 'Keadaan makanan yang masih baik untuk dimakan.'],
    ['SEDAP', 'Rasa makanan yang menyelerakan.'],
    ['ISI', 'Bahagian putih kelapa yang diperah untuk mendapatkan santan.'],
    ['AIR', 'Cecair yang digunakan untuk membersihkan bahan makanan.'],
    ['MASAK', 'Proses memasak sehingga bahan menjadi lembut.'],
    ['KEROPOK', 'Makanan yang diperbuat daripada ikan dan sagu.'],
    ['GARAM', 'Bahan masakan yang digunakan untuk menambah rasa.'],
    ['AROMA', 'Bau yang menyenangkan daripada makanan.'],
    ['MERAH', 'Warna yang sering dikaitkan dengan cili masak.'],
    ['PEMELIHARAAN', 'Proses mengekalkan budaya supaya tidak hilang.'],
    ['WARISAN', 'Sesuatu yang diwarisi daripada generasi terdahulu.'],
    ['KUALI', 'Peralatan dapur yang digunakan untuk menggoreng makanan.'],
    ['DAUN', 'Daun yang sering digunakan sebagai hiasan makanan.'],
    ['HALIA', 'Rempah yang mempunyai aroma dan rasa tersendiri.'],
    ['TEMPAYAN', 'Peralatan tradisional untuk menyimpan air atau bahan.'],
    ['MASAK', 'Kaedah memasak menggunakan haba.'],
    ['AIR', 'Cecair yang digunakan dalam penyediaan makanan.'],
    ['GAUL', 'Proses mencampurkan bahan sehingga sebati.'],
    ['TARIAN', 'Persembahan seni tradisional yang menggunakan gerakan tubuh.'],
    ['SERAI', 'Tumbuhan yang digunakan dalam penyediaan masakan tradisional.'],
    ['LAKSA', 'Makanan yang mempunyai rasa pedas, masam dan berlemak.'],
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
        if (placed.some((e) => e.word === w)) { pool.splice(pool.indexOf(cand), 1); continue; }   // same answer, other clue: already on the grid
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
        for (let i = pool.length - 1; i >= 0; i--) if (pool[i][0] === w) pool.splice(i, 1);   // drop its other clues too
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
  const WORD_POINTS = 50, HINT_WORD_POINTS = 25, HINT_COST = 20;   // a word completed with a hinted letter earns half; no time bonus
  const LIMIT = 5 * 60;   // the challenge: finish the crossword within 5 minutes
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
  let solved = {}, locked = {}, pts = 0, hinted = {};   // solved entries (by id), their cells (locked green), running points, cells filled by a hint
  let wrongShown = {}, toastTimer = 0;      // a filled-but-wrong word is flagged once until one of its letters changes
  const TOAST_MS = 1000;
  function toast(kind, title, sub) {
    const t = $('xw-toast');
    t.className = 'xw-toast ' + kind; $('xw-toast-title').textContent = title; $('xw-toast-sub').textContent = sub || '';
    t.querySelector('.xw-toast-ico').textContent = kind === 'hint' ? '💡' : '';
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
    let hit = null, gain = 0, withHint = false;
    for (const e of DATA.entries) {
      if (solved[idOf(e)] || !isSolved(e)) continue;
      withHint = cellsOf(e).some((k) => hinted[k]);   // half points if any letter came from a hint
      gain = withHint ? HINT_WORD_POINTS : WORD_POINTS;
      solved[idOf(e)] = true; pts += gain; hit = e;
      for (let i = 0; i < e.word.length; i++) {
        const k = key(e.row + (e.dir === 'D' ? i : 0), e.col + (e.dir === 'A' ? i : 0));
        locked[k] = true; checked[k] = true;
        const el = cells[k].el; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      }
    }
    if (!hit) return checkWrong();
    const sc = $('xw-score'); sc.classList.remove('pop'); void sc.offsetWidth; sc.classList.add('pop');
    if (sfx()) sfx().correct();
    $('xw-status').textContent = '\u2713 ' + hit.word + ' betul! +' + gain + ' mata' + (withHint ? ' (separuh, dengan bantuan)' : '') + (viaHint ? ' \u00b7 bantuan \u2212' + HINT_COST : '') + '. Jumlah: ' + total().toLocaleString() + '.';
    toast('ok', 'BETUL! ' + hit.word, '+' + gain + ' mata' + (withHint ? ' (dengan bantuan)' : '') + ' \u00b7 Jumlah ' + total().toLocaleString());
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
    user[k] = sel.letter; checked[k] = true; hinted[k] = true; hints++;
    const next = step(sel, dir, 1);
    if (next) sel = next;
    render();
    $('xw-status').textContent = 'Bantuan digunakan: ' + hints + ' (−' + HINT_COST + ' setiap satu). Jumlah: ' + total().toLocaleString() + '.';
    const sc = $('xw-score'); sc.classList.remove('pop'); void sc.offsetWidth; sc.classList.add('pop');
    if (sfx()) sfx().swipe();
    toast('hint', 'BANTUAN', '\u2212' + HINT_COST + ' mata \u00b7 Jumlah ' + total().toLocaleString());
    if (checkSolved(true)) render();
    if (DATA.entries.every(isSolved)) finish();
  }
  function elapsed() { return (performance.now() - startAt) / 1000; }
  function clock(t) { t = Math.max(0, Math.floor(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
  function tick() {
    if (!open || done) return;
    const remain = LIMIT - elapsed();
    if (remain <= 0) { $('xw-timer').textContent = '00:00'; $('xw-clock').classList.add('low'); timeUp(); return; }
    const t = Math.ceil(remain);
    $('xw-timer').textContent = String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
    $('xw-clock').classList.toggle('low', remain <= 30);
  }
  function score() { return total(); }   // the final score is the word points minus hints: what the SKOR pill showed all along
  function showCard(won, t) {
    $('xw-done-title').textContent = won ? 'Tahniah!' : 'Masa Tamat';
    for (const star of document.querySelectorAll('#xw-done .done-star')) star.hidden = !won;
    $('xw-done-text').textContent = won
      ? 'Semua 15 perkataan warisan Laksa Pahang berjaya diteka.'
      : 'Cabaran 5 minit sudah tamat sebelum semua perkataan diteka.';
    $('xw-done-score').textContent = score().toLocaleString();
    $('xw-done-time').textContent = clock(t);   // minutes actually used, not the time left
    $('xw-done').hidden = false;
  }
  function record(result, t) {
    GebokStore.recordGame('crossword', { at: new Date().toISOString(), level: 1, result, score: score(), time: +t.toFixed(1), hints, words: DATA.entries.length })
      .catch(() => { /* kept on this device only */ });
    if (window.LaksaArcade) window.LaksaArcade.renderBests();
  }
  function finish() {
    if (done) return;
    done = true;
    const t = Math.min(elapsed(), LIMIT);
    showCard(true, t);
    if (window.GebokRun) window.GebokRun.sfx.fanfare();
    record('won', t);
  }
  function timeUp() {
    if (done) return;
    done = true;
    showCard(false, LIMIT);
    if (window.GebokRun) window.GebokRun.sfx.gameover();
    record('timeout', LIMIT);
  }
  function start() {
    relayout();
    user = {}; checked = {}; solved = {}; locked = {}; hinted = {}; wrongShown = {}; pts = 0; hints = 0; done = false; startAt = performance.now();
    clearTimeout(toastTimer); $('xw-toast').hidden = true;
    $('xw-done').hidden = true;
    $('xw-clock').classList.remove('low');
    $('xw-status').textContent = 'Cabaran: selesaikan dalam 5 minit. Klik pada petak, taip jawapan dan lengkapkan semua teka silang.';
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
    showRules();                              // the rules first; the clock starts on OK
  }
  function showRules() {
    done = true; clearInterval(timer);        // no typing, no hints, no clock, until OK
    $('xw-timer').textContent = '05:00';
    $('xw-rules').hidden = false;
    $('xw-rules-ok').focus();
  }
  function rulesOk() {
    $('xw-rules').hidden = true;
    done = false; startAt = performance.now();
    clearInterval(timer);
    timer = setInterval(tick, 250);
    tick();
    render();
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
    $('xw-rules-ok').addEventListener('click', rulesOk);
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
  window.LaksaCrossword = { open: openGame, close, wire, DATA, layout, select: (r, c, d) => { dir = d || dir; select(cells[key(r, c)], false); }, type: typeChar, rulesOk, get points() { return total(); } };
})();
