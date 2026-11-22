/* ======================================================================
   GebokStore — the temporary player database for Gebok Run.

   supabase : an online Postgres database (supabase.sql, `supabase` in
           config.js): used wherever the page is hosted (GitHub Pages, a
           server, the artifact) when the project URL and anon key are set.
           The anon key may only call the gebok_* functions; player names are
           unique and are the sign-in.
   cloud : the published artifact's shared database. Each claude.ai account
           owns players/<account> and the profile documents under
           players/<account>/profiles/<profile>; admins (the artifact's owner
           and editors) read every account.
   local : this browser's localStorage, used when the shared database is not
           available (a local copy, a server, view-only access, no identity).
   The leaderboard is a separate collection every viewer can read: each account
   writes leaderboard/<account> with one entry per profile (no email).
   Either way the game sees the same API.
   ====================================================================== */
(function () {
  'use strict';

  const LS_DB = 'gebokrun.db';            // local fallback store
  const LS_ACCOUNT = 'gebokrun.account';  // local account id
  const LS_PROFILE = 'gebokrun.profile';  // the profile this device used last
  const LS_NAME = 'gebokrun.name';        // its player name (prefilled on the sign-in screen)
  const LS_ADMIN = 'gebokrun.adminKey';   // Supabase mode: the admin key this browser entered
  const MAX_RUNS = 300;                   // run history kept per player

  const S = { mode: 'local', reason: '', db: null, user: null, downloads: null, accountId: null, admin: false, owner: false, current: null, count: 0 };

  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } };
  const lsDel = (k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } };
  const newId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const nowIso = () => new Date().toISOString();
  function readLocal() {
    try { const d = JSON.parse(lsGet(LS_DB)); return d && d.profiles ? d : { profiles: {} }; } catch (e) { return { profiles: {} }; }
  }
  function writeLocal(d) { lsSet(LS_DB, JSON.stringify(d)); }
  function emptyStats() {
    return { runs: 0, bestScore: 0, totalScore: 0, totalLaksa: 0, totalGebuk: 0, totalDistance: 0, totalTime: 0, wins: [0, 0, 0], crashes: 0 };
  }

  const norm = (s) => (s || '').trim().toLowerCase();

  // ---- Supabase: PostgREST calls to the gebok_* functions (supabase.sql) ----
  const SB = (() => { const c = (window.GebokConfig || {}).supabase || {}; return { url: String(c.url || '').trim().replace(/\/+$/, ''), key: String(c.anonKey || '').trim() }; })();
  const sbConfigured = () => !!(SB.url && SB.key);
  async function rpc(name, params) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 12000);
    let res;
    try {
      res = await fetch(SB.url + '/rest/v1/rpc/' + name, {
        method: 'POST', signal: ctl.signal, mode: 'cors',
        // The anon key goes in `apikey`; a legacy JWT anon key is also sent as the bearer token, a publishable key (sb_publishable_…) is not.
        headers: Object.assign({ apikey: SB.key, 'Content-Type': 'application/json', Accept: 'application/json' }, /^eyJ/.test(SB.key) ? { Authorization: 'Bearer ' + SB.key } : {}),
        body: JSON.stringify(params || {}),
      });
    } catch (e) { throw Object.assign(new Error('network'), { code: 'unavailable' }); }
    finally { clearTimeout(timer); }
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch (e) { body = text; }
    if (!res.ok) {
      const msg = (body && typeof body === 'object' && (body.message || body.hint || body.error)) || ('HTTP ' + res.status);
      throw Object.assign(new Error(msg), { code: res.status === 401 || res.status === 403 ? 'refused' : res.status === 404 ? 'not-found' : 'error', status: res.status });
    }
    return body;
  }

  function useLocal(reason) {
    S.mode = 'local';
    S.reason = reason;
    let a = lsGet(LS_ACCOUNT);
    if (!a) { a = 'local-' + newId(); lsSet(LS_ACCOUNT, a); }
    S.accountId = a;
    return 'local';
  }

  // Resolves to 'cloud' or 'local'. The runtime namespaces arrive later than the
  // first script run, so everything that touches data awaits this first.
  const ready = (async () => {
    if (sbConfigured()) {                          // the online database first, wherever the page is hosted
      try {
        await rpc('gebok_ping', {});
        S.mode = 'supabase'; S.accountId = 'supabase'; S.reason = '';
        S.admin = !!lsGet(LS_ADMIN); S.owner = S.admin;
        return 'supabase';
      } catch (e) {                                                                     // then the artifact database or this device
        S.reason = e && e.code === 'not-found' ? 'Supabase: run supabase.sql first' : 'Supabase unreachable: ' + ((e && e.message) || 'error');
      }
    }
    const hasRuntime = !!(window.claude && typeof window.claude.use === 'function');
    if (!hasRuntime) { S.admin = true; S.owner = true; return useLocal(S.reason || 'standalone copy'); }
    const timeout = new Promise((r) => setTimeout(() => r(null), 10000));
    const caps = await Promise.race([
      Promise.all([window.claude.use('db'), window.claude.use('user'), window.claude.use('downloads')]),
      timeout,
    ]);
    const db = caps ? caps[0] : null, user = caps ? caps[1] : null;
    S.downloads = caps ? caps[2] : null;
    if (user) { S.admin = await user.canEdit(); S.owner = await user.isOwner(); }
    if (!db || !user) return useLocal('shared database unavailable');
    const id = await user.id();
    if (!id) return useLocal('no identity on this page');
    if ((await user.can('data.write')) === false) return useLocal('view-only access');
    S.db = db; S.user = user; S.accountId = id; S.mode = 'cloud';
    return 'cloud';
  })();

  const profilesCol = (account) => S.db.collection('players/' + account + '/profiles');
  const fromSnap = (d, account) => Object.assign({ id: d.id, account }, d.data());
  async function withRetry(fn) {
    try { return await fn(); } catch (e) {
      if (e && e.code === 'unavailable') { await new Promise((r) => setTimeout(r, 400 + Math.random() * 600)); return fn(); }
      throw e;
    }
  }

  async function listProfiles() {
    await ready;
    if (S.mode === 'supabase') return [];           // never listed to the game; the admin page uses fetchAll (with the key)
    if (S.mode === 'cloud') {
      try {
        const snap = await withRetry(() => profilesCol(S.accountId).get());
        const rows = snap.docs.filter((d) => d.exists).map((d) => fromSnap(d, S.accountId));
        S.count = rows.length;
        return rows;
      } catch (e) { useLocal('read refused: ' + (e && e.code)); }
    }
    const d = readLocal();
    const rows = Object.keys(d.profiles).map((k) => Object.assign({ id: k, account: S.accountId }, d.profiles[k]));
    S.count = rows.length;
    return rows;
  }
  async function writeProfile(p) {
    const body = Object.assign({}, p);
    delete body.id; delete body.account;
    body.updatedAt = nowIso();
    if (S.mode === 'supabase') {
      try { await rpc('gebok_save', { p_id: p.id, p_data: body, p_entry: entryOf(p) }); return; }
      catch (e) { /* keep a copy on this device; the next save sends the whole profile again */ }
    }
    if (S.mode === 'cloud') {
      try { await withRetry(() => profilesCol(S.accountId).doc(p.id).set(body)); return; }
      catch (e) { useLocal('write refused: ' + (e && e.code)); }   // keep the data on this device instead
    }
    const d = readLocal();
    d.profiles[p.id] = body;
    writeLocal(d);
  }
  // The account document is what the admin page lists, so it must exist.
  async function touchAccount() {
    if (S.mode !== 'cloud') return;
    try { await withRetry(() => S.db.doc('players/' + S.accountId).set({ updatedAt: nowIso(), profiles: S.count })); }
    catch (e) { /* profile writes already succeeded; the next run end tries again */ }
  }

  function select(p) { S.current = p; lsSet(LS_PROFILE, p.id); lsSet(LS_NAME, p.username || ''); }
  function signOut() { S.current = null; lsDel(LS_PROFILE); }   // Log Keluar: the name stays remembered for the sign-in field
  // The record for a player name (case-insensitive) or, failing that, for the e-mail; null for a new player.
  async function findProfile(name, email) {
    await ready;
    if (S.mode === 'supabase') {
      const row = await rpc('gebok_sign_in', { p_name: name || '', p_email: email || '' });
      return row && typeof row === 'object' ? row : null;
    }
    const n = norm(name), m = norm(email);
    const list = await listProfiles();
    return list.find((p) => norm(p.username) === n) || (m ? list.find((p) => norm(p.email) === m) : null) || null;
  }
  // The player name this device used last, for the sign-in screen.
  async function rememberedName() {
    const name = lsGet(LS_NAME);
    if (name) return name;
    const id = lsGet(LS_PROFILE);
    if (!id) return '';
    await ready;
    if (S.mode === 'supabase') return '';
    try { const p = (await listProfiles()).find((x) => x.id === id); return (p && p.username) || ''; } catch (e) { return ''; }
  }
  async function register(username, email) {
    await ready;
    const p = {
      id: newId(), username, email, createdAt: nowIso(), lastPlayedAt: null,
      unlocked: 0, completed: [false, false, false], levelBest: [0, 0, 0], heritageMaster: false,
      stats: emptyStats(), runs: [],
    };
    if (S.mode === 'supabase') {
      const body = Object.assign({}, p); delete body.id;
      const row = await rpc('gebok_register', { p_id: p.id, p_name: username, p_email: email, p_data: body, p_entry: entryOf(p) });
      const got = row && typeof row === 'object' && row.id ? row : p;   // a name taken meanwhile comes back as that record
      select(got);
      return got;
    }
    await writeProfile(p);
    S.count += 1;
    await touchAccount();
    select(p);
    return p;
  }
  async function saveProgress(progress) {
    const p = S.current;
    if (!p) return;
    p.unlocked = progress.unlocked;
    p.completed = progress.completed.slice();
    await writeProfile(p);
  }
  async function recordRun(run, progress) {
    const p = S.current;
    if (!p) return;
    const s = p.stats || (p.stats = emptyStats());
    s.runs += 1;
    s.bestScore = Math.max(s.bestScore || 0, typeof run.campaignScore === 'number' ? run.campaignScore : run.score);   // best run total
    s.totalScore += run.score; s.totalLaksa += run.laksa; s.totalGebuk += run.gebuk;
    s.totalDistance += run.distance; s.totalTime += run.time;
    if (run.result === 'won' && typeof run.level === 'number') {
      s.wins[run.level - 1] = (s.wins[run.level - 1] || 0) + 1;
      p.levelBest = p.levelBest || [0, 0, 0];
      p.levelBest[run.level - 1] = Math.max(p.levelBest[run.level - 1] || 0, run.score);
    } else if (run.result === 'incomplete') s.incomplete = (s.incomplete || 0) + 1;
    else s.crashes += 1;
    if (progress.completed.every(Boolean)) p.heritageMaster = true;
    if (run.achievements && run.achievements.length) {           // union of badges earned, per level key
      p.achievements = p.achievements || {};
      const key = String(run.level);
      const set = new Set(p.achievements[key] || []);
      run.achievements.forEach((a) => set.add(a));
      p.achievements[key] = Array.from(set);
    }
    p.runs = (p.runs || []).concat([run]).slice(-MAX_RUNS);
    p.lastPlayedAt = run.at;
    p.unlocked = progress.unlocked;
    p.completed = progress.completed.slice();
    await writeProfile(p);
    await touchAccount();
    await syncLeaderboard();
  }

  // ---- leaderboard ------------------------------------------------------
  let lbLast = '';
  function entryOf(p) {
    const st = p.stats || {};
    const g = p.games || {};
    return { username: p.username || '', bestScore: st.bestScore || 0, levels: (p.completed || []).filter(Boolean).length,
      platformBest: (g.platform || {}).best || 0, platformPlays: (g.platform || {}).plays || 0,
      crosswordBest: (g.crossword || {}).best || 0, crosswordPlays: (g.crossword || {}).plays || 0, crosswordTime: (g.crossword || {}).bestTime || 0,
      wordsearchBest: (g.wordsearch || {}).best || 0, wordsearchPlays: (g.wordsearch || {}).plays || 0, wordsearchTime: (g.wordsearch || {}).bestTime || 0,
      gebuk: st.totalGebuk || 0, runs: st.runs || 0, updatedAt: p.lastPlayedAt || p.updatedAt || '' };
  }
  // Rewrites this account's leaderboard document when any entry changed.
  async function syncLeaderboard() {
    if (S.mode !== 'cloud') return;
    let profiles;
    try { profiles = await listProfiles(); } catch (e) { return; }
    if (S.mode !== 'cloud') return;
    const entries = {};
    for (const p of profiles) if ((p.stats || {}).runs) entries[p.id] = entryOf(p);
    const key = JSON.stringify(entries);
    if (key === lbLast) return;
    try { await withRetry(() => S.db.doc('leaderboard/' + S.accountId).set({ entries, updatedAt: nowIso() })); lbLast = key; }
    catch (e) { /* the next run end tries again */ }
  }
  // key: 'bestScore' (any run) or 'challengeBest' (the 90-second challenge only)
  async function fetchLeaderboard(limit, key) {
    await ready;
    key = key || 'bestScore';
    let rows = [];
    if (S.mode === 'supabase') {
      const got = await rpc('gebok_leaderboard', { p_key: key, p_limit: 200 });
      rows = Array.isArray(got) ? got.map((r) => Object.assign({ account: 'supabase' }, r)) : [];
    } else if (S.mode === 'cloud') {
      const snap = await withRetry(() => S.db.collection('leaderboard').get());
      for (const d of snap.docs) {
        if (!d.exists) continue;
        const e = (d.data() || {}).entries || {};
        for (const pid of Object.keys(e)) rows.push(Object.assign({ id: pid, account: d.id }, e[pid]));
      }
    } else {
      rows = (await listProfiles()).filter((p) => (p.stats || {}).runs).map((p) => Object.assign({ id: p.id, account: p.account }, entryOf(p)));
    }
    rows = rows.filter((r) => typeof r.bestScore === 'number' && (key === 'bestScore' || (r[key] || 0) > 0));
    rows.sort((a, b) => ((b[key] || 0) - (a[key] || 0)) || (b.levels - a.levels) || (b.gebuk - a.gebuk));
    return { rows: rows.slice(0, limit || 10), all: rows, key };
  }

  // A record from one of the other mini-games (platform, crossword): best score per game, history shared.
  async function recordGame(game, rec) {
    const p = S.current;
    if (!p) return;
    p.games = p.games || {};
    const g = p.games[game] || (p.games[game] = { plays: 0, best: 0, last: null });
    g.plays += 1;
    g.best = Math.max(g.best || 0, rec.score || 0);
    if (rec.result === 'won' && typeof rec.time === 'number') g.bestTime = g.bestTime ? Math.min(g.bestTime, rec.time) : rec.time;
    g.last = rec.at;
    const st = p.stats || (p.stats = emptyStats());
    st.runs += 1;
    st.totalTime += rec.time || 0;
    p.runs = (p.runs || []).concat([Object.assign({ game }, rec)]).slice(-MAX_RUNS);
    p.lastPlayedAt = rec.at;
    await writeProfile(p);
    await touchAccount();
    await syncLeaderboard();
  }

  // ---- admin side -------------------------------------------------------
  const adminKey = () => lsGet(LS_ADMIN) || '';
  async function fetchAll() {
    await ready;
    if (S.mode === 'supabase') {
      if (!adminKey()) throw Object.assign(new Error('admin key needed'), { code: 'admin-key' });
      const got = await rpc('gebok_admin_players', { p_key: adminKey() });
      return Array.isArray(got) ? got : [];
    }
    if (S.mode === 'cloud') {
      const acc = await withRetry(() => S.db.collection('players').get());
      const lists = await Promise.all(acc.docs.map((a) =>
        withRetry(() => profilesCol(a.id).get())
          .then((ps) => ps.docs.filter((d) => d.exists).map((d) => fromSnap(d, a.id)))
          .catch(() => [])));
      return [].concat.apply([], lists);
    }
    return listProfiles();
  }
  // Calls cb with every profile now and whenever the data changes. Returns a stop function.
  function subscribeAll(cb, onErr) {
    let stopped = false, stop = () => { stopped = true; };
    const load = () => fetchAll().then((rows) => { if (!stopped) cb(rows); }).catch((e) => { if (!stopped && onErr) onErr(e); });
    ready.then(() => {
      if (stopped) return;
      load();
      if (S.mode === 'cloud') {
        const unsub = S.db.collection('players').onSnapshot(() => load(), (e) => { if (onErr) onErr(e); });
        const timer = setInterval(load, 45000);
        stop = () => { stopped = true; unsub(); clearInterval(timer); };
      } else if (S.mode === 'supabase') {
        const timer = setInterval(load, 30000);
        stop = () => { stopped = true; clearInterval(timer); };
      } else {
        const timer = setInterval(load, 5000);
        window.addEventListener('storage', load);
        stop = () => { stopped = true; clearInterval(timer); window.removeEventListener('storage', load); };
      }
    });
    return () => stop();
  }
  async function clearAll() {
    await ready;
    if (S.mode === 'supabase') {
      await rpc('gebok_admin_clear', { p_key: adminKey() });
    } else if (S.mode === 'cloud') {
      if (!S.owner) throw new Error('Only the artifact owner can clear the shared database.');
      const acc = await S.db.collection('players').get();
      for (const a of acc.docs) {
        const ps = await profilesCol(a.id).get();
        for (const d of ps.docs) await profilesCol(a.id).doc(d.id).delete();
        await S.db.doc('players/' + a.id).delete();
      }
      const lb = await S.db.collection('leaderboard').get();
      for (const d of lb.docs) await S.db.doc('leaderboard/' + d.id).delete();
    } else {
      lsDel(LS_DB);
    }
    S.current = null; S.count = 0; lbLast = '';
    lsDel(LS_PROFILE);
  }
  async function download(filename, text) {
    await ready;
    if (S.downloads) {
      try { await S.downloads.save({ filename, data: text }); return true; } catch (e) { return false; }
    }
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
      a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      return true;
    } catch (e) { return false; }
  }
  // Supabase mode: the admin page unlocks with the key set in app_settings (supabase.sql). Kept in this browser.
  async function setAdminKey(key) {
    await ready;
    if (S.mode !== 'supabase') return false;
    const ok = (await rpc('gebok_admin_check', { p_key: key || '' })) === true;
    if (ok) { lsSet(LS_ADMIN, key); S.admin = true; S.owner = true; }
    return ok;
  }
  function forgetAdminKey() { lsDel(LS_ADMIN); if (S.mode === 'supabase') { S.admin = false; S.owner = false; } }
  function info() { return { mode: S.mode, reason: S.reason, admin: S.admin, owner: S.owner, account: S.accountId, current: S.current, supabase: sbConfigured() }; }

  window.GebokStore = { ready, info, listProfiles, findProfile, rememberedName, register, select, signOut, remembered: () => lsGet(LS_PROFILE), current: () => S.current, saveProgress, recordRun, recordGame, fetchAll, subscribeAll, clearAll, download, fetchLeaderboard, setAdminKey, forgetAdminKey };
})();
