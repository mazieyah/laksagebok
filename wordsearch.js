/* ======================================================================
   LaksaWordSearch — Cari Kata Laksa: 10 panels of 10 hidden words about
   Pahang (food and laksa gebok, history and heritage, places, kitchen tools,
   nature), 100 words in all, found from Malay clues in a 12×12 letter grid.
   The panel's words are fixed; their arrangement is generated every play.
   A panel is drawn at random every play (each of the 10 once before any
   repeats, never the same one twice in a row). Select a word by dragging
   across its letters (or tap its first letter, then its last). Five minutes
   per panel; the time taken is recorded.
   ====================================================================== */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const N = 12;
  const PANELS = [
    [
      ['KUNYIT', 'Rempah kuning; daunnya dijadikan ulam laksa'],
      ['ISTANA', 'Kediaman rasmi Sultan, contohnya di Pekan'],
      ['TAMANNEGARA', 'Hutan hujan tertua yang dilindungi di Pahang'],
      ['GAUL', 'Mencampurkan bahan sehingga sebati'],
      ['PANTAI', 'Pinggir laut berpasir'],
      ['KUAH', 'Cecair pekat yang dicurah ke atas mi'],
      ['SEJARAH', 'Kisah peristiwa masa lampau sesebuah negeri'],
      ['SUNGAIPAHANG', 'Sungai terpanjang di Semenanjung Malaysia'],
      ['LESUNG', 'Alat batu untuk menumbuk cili dan rempah'],
      ['KELAPA', 'Pokok yang buahnya diperah menjadi santan'],
    ],
    [
      ['SAMBAL', 'Pedas, dihidang bersama laksa'],
      ['KENDURI', 'Majlis makan beramai-ramai di kampung'],
      ['CHINI', 'Tasik yang terkenal dengan lagenda naga dan teratai'],
      ['REBUS', 'Memasak dalam air mendidih'],
      ['NANGKA', 'Buah besar berduri lembut dan berisi kuning'],
      ['LIMAU', 'Diperah untuk rasa masam pada laksa'],
      ['TENUN', 'Kain tenunan diraja warisan Pahang'],
      ['GUNUNGTAHAN', 'Puncak tertinggi di Semenanjung Malaysia'],
      ['TEMPAYAN', 'Bekas tembikar besar untuk menyimpan air atau makanan'],
      ['HARIMAU', 'Haiwan belang, lambang kebanggaan Malaysia'],
    ],
    [
      ['DURIAN', 'Raja buah yang juga dibuat tempoyak'],
      ['ABUBAKAR', 'Nama Sultan yang diabadikan pada muzium negeri di Pekan'],
      ['JERANTUT', 'Bandar pintu masuk ke Taman Negara'],
      ['BULUH', 'Batang beruas untuk membakar lemang dan membuat kraf'],
      ['TAPIR', 'Haiwan hitam putih yang ada di Taman Negara'],
      ['TEPUNG', 'Bahan asas doh mi laksa'],
      ['BUDAYA', 'Cara hidup, adat dan kesenian sesuatu bangsa'],
      ['ROMPIN', 'Daerah di selatan Pahang dengan Taman Negeri Endau-___'],
      ['ALU', 'Pasangan lesung untuk menumbuk'],
      ['HUTAN', 'Kawasan pokok tebal dengan hidupan liar'],
    ],
    [
      ['IKAN', 'Bahan utama kuah laksa'],
      ['PAHLAWAN', 'Gelaran bagi wira yang mempertahankan tanah air'],
      ['LIPIS', 'Kuala ___, bekas ibu negeri Pahang'],
      ['PERIUK', 'Bekas untuk merebus air atau kuah'],
      ['GAJAH', 'Haiwan besar berbelalai yang ada di hutan Pahang'],
      ['ULAM', 'Sayur mentah pelengkap semangkuk laksa'],
      ['KERIS', 'Senjata tradisional Melayu berbilah berkeluk'],
      ['FRASER', 'Bukit ___, tanah tinggi peranginan di daerah Raub'],
      ['GORENG', 'Memasak dengan minyak panas'],
      ['BUKIT', 'Tanah tinggi yang lebih rendah daripada gunung'],
    ],
    [
      ['LAKSA', 'Hidangan mi tradisional Pahang berkuah ikan'],
      ['GAMELAN', 'Muzik tradisional istana yang berkembang di Pahang'],
      ['MARAN', 'Daerah Pahang di tebing Sungai Pahang'],
      ['KUKUS', 'Memasak dengan wap air panas'],
      ['AIRTERJUN', 'Air yang jatuh dari tempat tinggi'],
      ['HALIA', 'Rempah pedas hangat dalam kuah laksa'],
      ['SULTAN', 'Gelaran pemerintah tertinggi negeri Pahang'],
      ['BENTONG', 'Bandar pintu masuk Pahang yang terkenal dengan halia'],
      ['KAYU', 'Bahan api tradisional untuk memasak'],
      ['SUNGAI', 'Aliran air semula jadi yang panjang'],
    ],
    [
      ['BELACAN', 'Pes udang dibakar untuk sambal laksa'],
      ['SONGKET', 'Kain tenunan bersulam benang emas'],
      ['BALOK', 'Pantai dekat Kuantan yang popular untuk sukan layar'],
      ['BASUH', 'Membersihkan bahan dengan air'],
      ['EMAS', 'Logam berharga yang pernah dilombong di Raub'],
      ['SERAI', 'Batang beraroma dalam kuah laksa'],
      ['TOKGAJAH', 'Tokoh pejuang Pahang dan bapa kepada Mat Kilau'],
      ['KUANTAN', 'Ibu negeri Pahang di pantai timur'],
      ['DAPUR', 'Tempat memasak di rumah'],
      ['SELADANG', 'Lembu liar besar di hutan Pahang'],
    ],
    [
      ['TAUGE', 'Kecambah kacang hijau di atas laksa'],
      ['SILAT', 'Seni mempertahankan diri tradisional Melayu'],
      ['CAMERON', 'Tanah tinggi peranginan dengan ladang teh'],
      ['PINGGAN', 'Bekas leper untuk menghidang makanan'],
      ['PANDAN', 'Daun wangi untuk masakan'],
      ['TEMPOYAK', 'Durian yang diperam, dimasak bersama ikan patin'],
      ['WARISAN', 'Sesuatu yang diwarisi daripada generasi terdahulu'],
      ['PEKAN', 'Bandar diraja negeri Pahang'],
      ['MASAK', 'Menyediakan makanan dengan haba'],
      ['GUA', 'Rongga dalam bukit batu kapur, contohnya Gua Charas'],
    ],
    [
      ['KERISIK', 'Kelapa parut goreng yang ditumbuk ke dalam kuah'],
      ['DARULMAKMUR', 'Gelaran kebesaran negeri Pahang'],
      ['GENTING', 'Tanah tinggi peranginan di sempadan Pahang dan Selangor'],
      ['TUMBUK', 'Menghancurkan bahan dengan lesung'],
      ['KUALA', 'Tempat sungai bertemu laut atau sungai lain'],
      ['PATIN', 'Ikan sungai yang terkenal dimasak bersama tempoyak di Temerloh'],
      ['GASING', 'Permainan tradisional yang diputar dengan tali'],
      ['RAUB', 'Bandar bersejarah perlombongan emas di Pahang'],
      ['KUALI', 'Bekas memasak untuk menggoreng'],
      ['GEBOK', 'Alat tradisional tembaga untuk menekan mi laksa'],
    ],
    [
      ['TRADISI', 'Amalan turun-temurun sesuatu masyarakat'],
      ['TIOMAN', 'Pulau peranginan terkenal di Pahang'],
      ['PISAU', 'Alat memotong bahan masakan'],
      ['SANTAN', 'Perahan kelapa yang memekatkan kuah laksa'],
      ['MATKILAU', 'Pahlawan Pahang yang menentang penjajahan British'],
      ['BERA', 'Tasik semula jadi terbesar di Semenanjung, di Pahang'],
      ['SENDUK', 'Alat menceduk kuah dari periuk'],
      ['KEROPOK', 'Makanan ringan daripada ikan dan sagu, digoreng rangup'],
      ['PEJUANG', 'Orang yang berjuang menentang penjajah'],
      ['PANCHING', 'Kampung dekat Kuantan dengan Gua Charas'],
    ],
    [
      ['CINCANG', 'Memotong bahan menjadi kecil-kecil'],
      ['ASAM', 'Bahan yang memberi rasa masam pada kuah'],
      ['MUZIUM', 'Tempat gebok asal dipamerkan di Pekan'],
      ['TEMERLOH', 'Bandar yang terkenal dengan ikan patin'],
      ['CILI', 'Bahan pedas berwarna merah untuk sambal'],
      ['DATOBAHAMAN', 'Pembesar dan pejuang Pahang yang menentang British'],
      ['CHERATING', 'Pantai peranginan dekat Kuantan yang terkenal dengan penyu'],
      ['KESUM', 'Daun beraroma yang wajib ada dalam laksa'],
      ['CONGKAK', 'Permainan tradisional papan berlubang dengan buah'],
      ['CEMPEDAK', 'Teluk ___, pantai terkenal di Kuantan'],
    ],
  ];
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1], [0, -1], [-1, 0], [-1, -1], [-1, 1]];
  const FILL = 'AAABCDEGHIIJKKLMMNNPRSSTUU';          // the fill leans on letters common in Malay
  const WORD_POINTS = 40, HINT_WORD_POINTS = 20, HINT_COST = 20;   // a word whose first letter was shown by a hint earns half
  const LIMIT = 5 * 60;                               // seconds per panel; the time actually used is what gets recorded
  let grid = [], placed = [], cellEls = [], open = false, done = false, startAt = 0, hints = 0, timer = 0, pts = 0, panelIdx = 0;
  let order = [];                                    // panels still to come this session: every panel once, in random order
  const sfx = () => (window.GebokRun ? window.GebokRun.sfx : null);
  const total = () => Math.max(0, pts - hints * HINT_COST);   // the running score: words found minus hints
  let drag = null, anchor = null, hintTimer = 0;

  function generate() {
    for (let attempt = 0; attempt < 200; attempt++) {
      const g = Array.from({ length: N }, () => Array(N).fill(''));
      const out = [];
      const words = PANELS[panelIdx].slice().sort((a, b) => b[0].length - a[0].length);
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
      out.sort((a, b) => PANELS[panelIdx].findIndex((x) => x[0] === a.word) - PANELS[panelIdx].findIndex((x) => x[0] === b.word));   // clue order = panel order
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
    placed.forEach((p, i) => { const li = document.createElement('li'); li.dataset.i = i; list.append(li); });
    renderList();
  }
  function renderList() {                     // clues; a found word is shown beside its clue
    for (const li of $('ws-words').children) {
      const p = placed[+li.dataset.i], n = +li.dataset.i + 1;
      li.classList.toggle('found', p.found);
      li.replaceChildren();
      const num = document.createElement('b'); num.textContent = n + '.';
      const txt = document.createElement('span'); txt.textContent = p.found ? p.word + ' \u2014 ' + p.clue : p.clue + ' (' + p.word.length + ')';
      li.append(num, txt);
    }
    $('ws-progress').textContent = placed.filter((p) => p.found).length + '/' + placed.length;
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
    const gain = hit.hinted ? HINT_WORD_POINTS : WORD_POINTS;
    const idx = placed.indexOf(hit);
    for (const q of cells) { const el = cellEls[q.r][q.c]; el.classList.add('found'); el.style.setProperty('--ws-col', 'hsl(' + ((idx * 47) % 360) + ' 70% 78%)'); }
    pts += gain;
    $('ws-status').textContent = '\u2713 ' + hit.word + ' (' + hit.clue + ') +' + gain + ' mata' + (hit.hinted ? ' (separuh, dengan bantuan)' : '') + '. Jumlah: ' + total().toLocaleString() + '.';
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
    hints++; p.hinted = true;
    clearTimeout(hintTimer);
    for (const row of cellEls) for (const d of row) d.classList.remove('hint');
    const el = cellEls[p.r0][p.c0]; el.classList.add('hint');
    hintTimer = setTimeout(() => el.classList.remove('hint'), 2500);
    $('ws-status').textContent = 'Bantuan: huruf pertama "' + p.word + '" berkelip (−' + HINT_COST + '). Jumlah: ' + total().toLocaleString() + '.';
    renderList();
  }
  function elapsed() { return (performance.now() - startAt) / 1000; }
  function fmt(t) { t = Math.max(0, Math.floor(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
  function tick() {
    if (!open || done) return;
    const remain = LIMIT - elapsed();
    if (remain <= 0) { $('ws-timer').textContent = '00:00'; timeUp(); return; }
    const t = Math.ceil(remain);
    $('ws-timer').textContent = String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
    $('ws-timer').classList.toggle('low', remain <= 30);
  }
  function score() { return total(); }        // word points minus hints, as the SKOR pill shows
  function showCard(won, t) {
    $('ws-done-title').textContent = won ? 'Tahniah!' : 'Masa Tamat';
    for (const star of document.querySelectorAll('#ws-done .done-star')) star.hidden = !won;
    const found = placed.filter((p) => p.found).length;
    $('ws-done-text').textContent = won
      ? 'Semua ' + placed.length + ' perkataan berjaya dijumpai.'
      : 'Masa 5 minit tamat: ' + found + ' daripada ' + placed.length + ' perkataan dijumpai.';
    $('ws-done-score').textContent = score().toLocaleString();
    $('ws-done-time').textContent = fmt(t);
    $('ws-done').hidden = false;
  }
  function record(result, t) {
    GebokStore.recordGame('wordsearch', { at: new Date().toISOString(), level: panelIdx + 1, panel: panelIdx + 1, result, score: score(), time: +t.toFixed(1), hints, words: placed.length, found: placed.filter((p) => p.found).length })
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
    paintSel([]); drag = null; anchor = null;
    showCard(false, LIMIT);
    if (window.GebokRun) window.GebokRun.sfx.gameover();
    record('timeout', LIMIT);
  }
  function nextPanel() {                     // a random panel, different from the one just played
    if (!order.length) {
      order = PANELS.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      if (placed.length && order[order.length - 1] === panelIdx) order.unshift(order.pop());
    }
    return order.pop();
  }
  function start(idx) {
    panelIdx = idx == null ? nextPanel() : Math.max(0, Math.min(PANELS.length - 1, idx));
    build();
    hints = 0; pts = 0; done = false; startAt = performance.now(); drag = null; anchor = null;
    $('ws-timer').classList.remove('low');
    renderList();
    $('ws-done').hidden = true;
    $('ws-status').textContent = 'Cari ' + placed.length + ' perkataan mengikut petunjuk dalam 5 minit. Seret merentasi huruf, atau ketik huruf pertama kemudian huruf terakhir.';
    clearInterval(timer);
    timer = setInterval(tick, 250);
    tick();
  }
  function openGame() {
    window.GebokRun.menu();
    window.GebokRun.pauseRender(true);
    open = true;
    $('wordsearch').hidden = false;
    start();                                  // a random panel every play
    showRules();                              // the rules first; the clock starts on OK
  }
  function showRules() {
    done = true; clearInterval(timer);        // no play, no clock, until OK
    $('ws-timer').textContent = '05:00';
    $('ws-rules').hidden = false;
    $('ws-rules-ok').focus();
  }
  function rulesOk() {
    $('ws-rules').hidden = true;
    done = false; startAt = performance.now();
    clearInterval(timer);
    timer = setInterval(tick, 250);
    tick();
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
    $('ws-rules-ok').addEventListener('click', rulesOk);
    $('ws-exit').addEventListener('click', close);
    $('ws-again').addEventListener('click', () => start());   // another panel
    $('ws-back').addEventListener('click', close);
    window.addEventListener('keydown', (e) => { if (open && e.key === 'Escape') { close(); e.preventDefault(); } });
  }
  window.LaksaWordSearch = { open: openGame, close, wire, N, PANELS, LIMIT, start, rulesOk, get panel() { return panelIdx; }, get points() { return total(); },
    debug: () => ({ placed: placed.map((p) => Object.assign({}, p)), grid: grid.map((r) => r.join('')), hints, done, found: placed.filter((p) => p.found).length }),
    select: (r0, c0, r1, c1) => submit(lineTo({ r: r0, c: c0 }, { r: r1, c: c1 })), lineTo, hint };
})();
