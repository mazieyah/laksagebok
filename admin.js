/* ======================================================================
   GebokAdmin — the admin view: every player's performance, from GebokStore.
   Opened with #admin. Everything here is other people's input: textContent only.
   ====================================================================== */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const LEVEL = { 1: 'L1 Kampung Laksa', 2: 'L2 Dapur Warisan', 3: 'L3 Jejak Warisan' };
  const num = (n) => Math.round(n || 0).toLocaleString();
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : '–');
  const fmtTime = (sec) => {
    const s = Math.round(sec || 0);
    if (s >= 3600) return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
    if (s >= 60) return Math.floor(s / 60) + 'm ' + (s % 60) + 's';
    return s + 's';
  };
  let unsub = null, rows = [], openIds = new Set(), sortKey = 'bestScore', sortDir = -1, clearArmed = 0;

  const COLS = [
    ['username', 'Player'], ['runs', 'Plays'], ['bestScore', 'Run best'], ['platformBest', 'Quest best'], ['crosswordBest', 'Crossword best'], ['wordsearchBest', 'Word search best'], ['levels', 'Levels'],
    ['totalGebuk', 'Gebuk'], ['totalLaksa', 'Laksa'], ['totalDistance', 'Distance'], ['totalTime', 'Play time'], ['lastPlayedAt', 'Last played'],
  ];
  function derive(p) {
    const s = p.stats || {};
    const done = (p.completed || []).filter(Boolean).length;
    return {
      id: p.id, account: p.account || '', username: p.username || '', email: p.email || '', createdAt: p.createdAt || '',
      runs: s.runs || 0, bestScore: s.bestScore || 0, avgScore: s.runs ? (s.totalScore || 0) / s.runs : 0,
      platformBest: ((p.games || {}).platform || {}).best || 0, crosswordBest: ((p.games || {}).crossword || {}).best || 0, wordsearchBest: ((p.games || {}).wordsearch || {}).best || 0,
      levels: done, completed: p.completed || [false, false, false], wins: s.wins || [0, 0, 0], crashes: s.crashes || 0,
      totalGebuk: s.totalGebuk || 0, totalLaksa: s.totalLaksa || 0, totalDistance: s.totalDistance || 0, totalTime: s.totalTime || 0,
      lastPlayedAt: p.lastPlayedAt || '', history: p.runs || [], levelBest: p.levelBest || [0, 0, 0], heritageMaster: !!p.heritageMaster,
      achievements: p.achievements || {},
    };
  }
  function tile(label, value, sub) {
    const t = el('div', 'tile');
    t.append(el('div', 'tile-label', label), el('div', 'tile-value', value));
    if (sub) t.append(el('div', 'tile-sub', sub));
    return t;
  }
  function render() {
    const data = rows.map(derive);
    data.sort((a, b) => { const x = a[sortKey], y = b[sortKey]; return (x < y ? -1 : x > y ? 1 : 0) * sortDir; });
    const tiles = $('admin-tiles');
    tiles.replaceChildren();
    const totalRuns = data.reduce((n, p) => n + p.runs, 0);
    const scored = data.filter((p) => p.runs > 0);
    const l = [0, 1, 2].map((i) => data.filter((p) => p.completed[i]).length);
    tiles.append(
      tile('Players', num(data.length), scored.length + ' have played'),
      tile('Runs', num(totalRuns), num(data.reduce((n, p) => n + p.crashes, 0)) + ' crashes'),
      tile('Levels completed', l[0] + ' · ' + l[1] + ' · ' + l[2], 'players who finished L1 · L2 · L3'),
      tile('Avg best score', num(scored.length ? scored.reduce((n, p) => n + p.bestScore, 0) / scored.length : 0), 'across players who played'),
      tile('Gebuk collected', num(data.reduce((n, p) => n + p.totalGebuk, 0)), num(data.reduce((n, p) => n + p.totalLaksa, 0)) + ' laksa'),
      tile('Play time', fmtTime(data.reduce((n, p) => n + p.totalTime, 0)), num(data.reduce((n, p) => n + p.totalDistance, 0)) + ' m run'),
    );
    const thead = $('admin-table').querySelector('thead');
    thead.replaceChildren();
    const hr = el('tr');
    for (const [key, label] of COLS) {
      const th = el('th', key === sortKey ? 'sorted' : '', label + (key === sortKey ? (sortDir < 0 ? ' ▾' : ' ▴') : ''));
      th.tabIndex = 0;
      th.addEventListener('click', () => { if (sortKey === key) sortDir = -sortDir; else { sortKey = key; sortDir = key === 'username' ? 1 : -1; } render(); });
      hr.append(th);
    }
    thead.append(hr);
    const tbody = $('admin-table').querySelector('tbody');
    tbody.replaceChildren();
    if (!data.length) {
      const tr = el('tr'); const td = el('td', 'empty', 'No players yet. Records appear here as soon as someone registers and plays.'); td.colSpan = COLS.length; tr.append(td); tbody.append(tr);
      return;
    }
    for (const p of data) {
      const tr = el('tr', 'player-row' + (openIds.has(p.id) ? ' open' : ''));
      const who = el('td');
      who.append(el('div', 'who-name', p.username || '(no name)'), el('div', 'who-mail', p.email));
      tr.append(who,
        el('td', 'n', num(p.runs)), el('td', 'n', num(p.bestScore)), el('td', 'n', p.platformBest ? num(p.platformBest) : '–'), el('td', 'n', p.crosswordBest ? num(p.crosswordBest) : '–'), el('td', 'n', p.wordsearchBest ? num(p.wordsearchBest) : '–'),
        el('td', 'levels', p.completed.map((c, i) => (c ? '✓' : '–')).join(' ')),
        el('td', 'n', num(p.totalGebuk)), el('td', 'n', num(p.totalLaksa)), el('td', 'n', num(p.totalDistance) + ' m'),
        el('td', 'n', fmtTime(p.totalTime)), el('td', '', fmtDate(p.lastPlayedAt)));
      tr.addEventListener('click', () => { if (openIds.has(p.id)) openIds.delete(p.id); else openIds.add(p.id); render(); });
      tbody.append(tr);
      if (openIds.has(p.id)) {
        const dtr = el('tr', 'detail-row'); const td = el('td'); td.colSpan = COLS.length;
        td.append(el('div', 'detail-meta', 'Registered ' + fmtDate(p.createdAt) + ' · wins L1 ' + p.wins[0] + ', L2 ' + p.wins[1] + ', L3 ' + p.wins[2] + ' · game overs ' + p.crashes + ' · best per level ' + (p.levelBest || [0, 0, 0]).map(num).join(' / ') + (p.heritageMaster ? ' · Heritage Master' : '')
          + ' · achievements ' + Object.keys(p.achievements).map((k) => k + ': ' + p.achievements[k].join(', ')).join(' | ')));
        const t = el('table', 'runs-table');
        const h = el('tr');
        for (const c of ['#', 'When', 'Game', 'Level', 'Result', 'Level score', 'Run total', 'Gebuk', 'Laksa', 'Distance', 'Time', 'Time left', 'Hearts lost', 'Badges']) h.append(el('th', '', c));
        t.append(h);
        const hist = p.history.slice().reverse();
        hist.forEach((r, i) => {
          const rr = el('tr', r.result === 'won' ? 'won' : '');
          const label = r.result === 'won' ? 'Level done' : r.result === 'incomplete' ? 'Time up' : 'Game over';
          const gameName = r.game === 'platform' ? 'Laksa Quest' : r.game === 'crossword' ? 'Silang Kata' : r.game === 'wordsearch' ? 'Cari Kata' : 'Gebok Run';
          rr.append(el('td', 'n', String(p.history.length - i)), el('td', '', fmtDate(r.at)), el('td', '', gameName), el('td', '', r.game && r.game !== 'runner' ? String(r.level) : (LEVEL[r.level] || String(r.level))),
            el('td', '', label), el('td', 'n', num(r.score)), el('td', 'n', r.campaignScore == null ? '–' : num(r.campaignScore)),
            el('td', 'n', r.game === 'platform' ? (r.bowls + '/' + r.bowlsNeeded + ' bowls') : (r.game === 'crossword' || r.game === 'wordsearch') ? (r.hints + ' hints') : (r.need ? r.gebuk + '/' + r.need : String(r.gebuk))), el('td', 'n', r.laksa == null ? '–' : num(r.laksa)), el('td', 'n', r.distance == null ? '–' : num(r.distance) + ' m'),
            el('td', 'n', fmtTime(r.time)), el('td', 'n', r.timeLeft == null ? '–' : fmtTime(r.timeLeft)),
            el('td', 'n', r.livesLost == null ? '–' : r.livesLost + '/3'), el('td', '', (r.achievements || []).join(', ') || '–'));
          t.append(rr);
        });
        if (!hist.length) { const rr = el('tr'); const c = el('td', 'empty', 'No runs yet.'); c.colSpan = 14; rr.append(c); t.append(rr); }
        const wrap = el('div', 'table-wrap'); wrap.append(t); td.append(wrap); dtr.append(td); tbody.append(dtr);
      }
    }
  }
  function csvCell(v) { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function csv(rowsArr) { return rowsArr.map((r) => r.map(csvCell).join(',')).join('\n') + '\n'; }
  function playersCsv() {
    const out = [['username', 'email', 'registered', 'last_played', 'plays', 'run_best', 'quest_best', 'crossword_best', 'wordsearch_best', 'avg_level_score', 'level1_done', 'level2_done', 'level3_done', 'wins_l1', 'wins_l2', 'wins_l3', 'game_overs', 'total_gebuk', 'total_laksa', 'total_distance_m', 'total_time_s']];
    for (const p of rows.map(derive)) out.push([p.username, p.email, p.createdAt, p.lastPlayedAt, p.runs, p.bestScore, p.platformBest, p.crosswordBest, p.wordsearchBest, Math.round(p.avgScore), p.completed[0] ? 1 : 0, p.completed[1] ? 1 : 0, p.completed[2] ? 1 : 0, p.wins[0], p.wins[1], p.wins[2], p.crashes, p.totalGebuk, p.totalLaksa, Math.round(p.totalDistance), Math.round(p.totalTime)]);
    return csv(out);
  }
  function runsCsv() {
    const out = [['username', 'email', 'at', 'game', 'level', 'result', 'level_score', 'run_total', 'gebuk', 'gebuk_target', 'laksa', 'laksa_target', 'distance_m', 'time_s', 'time_left_s', 'max_speed', 'hearts_lost', 'achievements', 'bowls', 'bowls_needed', 'hints']];
    for (const p of rows.map(derive)) for (const r of p.history) out.push([p.username, p.email, r.at, r.game || 'runner', r.level, r.result, r.score, r.campaignScore == null ? '' : r.campaignScore, r.gebuk == null ? '' : r.gebuk, r.need == null ? '' : r.need, r.laksa == null ? '' : r.laksa, r.laksaTarget == null ? '' : r.laksaTarget, r.distance == null ? '' : r.distance, r.time, r.timeLeft == null ? '' : r.timeLeft, r.maxSpeed == null ? '' : r.maxSpeed, r.livesLost == null ? '' : r.livesLost, (r.achievements || []).join(' '), r.bowls == null ? '' : r.bowls, r.bowlsNeeded == null ? '' : r.bowlsNeeded, r.hints == null ? '' : r.hints]);
    return csv(out);
  }
  function status(text) { $('admin-status').textContent = text; }

  function show() {
    const info = GebokStore.info();
    const needKey = info.mode === 'supabase' && !info.admin;   // online: unlock with the admin key from supabase.sql
    $('admin').hidden = false;
    $('admin-denied').hidden = !!info.admin || needKey;
    $('admin-key-form').hidden = !needKey;
    $('admin-key-error').hidden = true;
    $('admin-body').hidden = !info.admin;
    $('admin-mode').textContent = info.mode === 'cloud' ? 'shared database' : info.mode === 'supabase' ? 'online database (Supabase)' : 'local storage on this device' + (info.reason ? ' (' + info.reason + ')' : '');
    $('admin-clear').hidden = !(info.owner);
    if (!info.admin) return;
    status('Loading…');
    const timer = setTimeout(() => status('The database has not answered yet. The data shown may be out of date.'), 10000);
    if (unsub) unsub();
    unsub = GebokStore.subscribeAll((r) => { clearTimeout(timer); rows = r; status('Updated ' + new Date().toLocaleTimeString() + ' · ' + r.length + ' player' + (r.length === 1 ? '' : 's')); render(); },
      (e) => {
        clearTimeout(timer);
        if (e && (e.code === 'refused' || e.code === 'admin-key')) { GebokStore.forgetAdminKey(); if (unsub) unsub(); unsub = null; show(); return; }   // the key changed: ask again
        status('Could not load player data (' + ((e && e.code) || 'error') + ').');
      });
  }
  function hide() { if (unsub) unsub(); unsub = null; $('admin').hidden = true; }
  function wire() {
    $('admin-key-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const key = $('admin-key').value.trim();
      const err = $('admin-key-error');
      $('admin-key-btn').disabled = true;
      GebokStore.setAdminKey(key).then((ok) => {
        if (ok) { $('admin-key').value = ''; show(); }
        else { err.textContent = 'Key rejected.'; err.hidden = false; }
      }).catch((e2) => { err.textContent = 'Could not check the key (' + ((e2 && e2.message) || 'error') + ').'; err.hidden = false; })
        .then(() => { $('admin-key-btn').disabled = false; });
    });
    $('admin-refresh').addEventListener('click', () => { status('Refreshing…'); GebokStore.fetchAll().then((r) => { rows = r; status('Updated ' + new Date().toLocaleTimeString()); render(); }).catch(() => status('Refresh failed.')); });
    $('admin-export-players').addEventListener('click', () => GebokStore.download('gebokrun-players.csv', playersCsv()).then((ok) => status(ok ? 'Players CSV offered for download.' : 'Download was not possible here.')));
    $('admin-export-runs').addEventListener('click', () => GebokStore.download('gebokrun-runs.csv', runsCsv()).then((ok) => status(ok ? 'Runs CSV offered for download.' : 'Download was not possible here.')));
    $('admin-clear').addEventListener('click', () => {
      const b = $('admin-clear');
      if (Date.now() - clearArmed < 5000) {
        clearArmed = 0; b.textContent = 'Clearing…';
        GebokStore.clearAll().then(() => { rows = []; openIds.clear(); render(); status('All player data deleted.'); b.textContent = 'Clear all data'; })
          .catch((e) => { status(String(e && e.message || e)); b.textContent = 'Clear all data'; });
      } else {
        clearArmed = Date.now(); b.textContent = 'Click again to delete everything';
        setTimeout(() => { if (clearArmed && Date.now() - clearArmed >= 4900) { clearArmed = 0; b.textContent = 'Clear all data'; } }, 5000);
      }
    });
  }
  window.GebokAdmin = { show, hide, wire, isOpen: () => !$('admin').hidden };
})();
