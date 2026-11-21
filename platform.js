/* ======================================================================
   LaksaArcade — the game hub: one player record, three mini-games.
   Needs GebokRun (game.js), LaksaQuest (platformer.js), LaksaCrossword (crossword.js).
   ====================================================================== */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const num = (n) => Math.round(n || 0).toLocaleString();
  function renderBests() {
    const p = GebokStore.current() || {};
    const g = p.games || {};
    $('games-player').textContent = p.username || '';
    $('gbest-runner').textContent = num((p.stats || {}).bestScore);
    $('gbest-platform').textContent = num((g.platform || {}).best);
    $('gbest-crossword').textContent = num((g.crossword || {}).best);
    $('gbest-wordsearch').textContent = num((g.wordsearch || {}).best);
  }
  function showGames() {
    window.GebokRun.menu();              // hides every screen, stops the 3D run, shows the sunset stage
    renderBests();
    $('games').hidden = false;
  }
  function wire() {
    $('game-runner').addEventListener('click', () => window.GebokRun.open());
    $('game-platform').addEventListener('click', () => window.LaksaQuest.open());
    $('game-crossword').addEventListener('click', () => window.LaksaCrossword.open());
    $('game-wordsearch').addEventListener('click', () => window.LaksaWordSearch.open());
    $('games-lb').addEventListener('click', () => window.GebokRun.leaderboard());
    $('games-settings').addEventListener('click', () => window.GebokRun.settings());
    $('games-achv').addEventListener('click', () => window.GebokRun.achievements());
    $('games-switch').addEventListener('click', () => window.GebokRun.register());
  }
  window.LaksaArcade = { showGames, renderBests, wire };
})();
