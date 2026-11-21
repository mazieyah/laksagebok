/* ======================================================================
   Laksa Gebok Run — configuration.
   Every gameplay number lives here, not in game.js: lives, targets, scores,
   speeds, level lengths, obstacle frequency, power-up durations, heritage text.
   ====================================================================== */
window.GebokConfig = {
  lives: 3,                  // hearts for the whole run
  livesCarryOver: true,      // hearts left at the finish line carry into the next level; a game over starts a fresh 3
  invincibleAfterHit: 2.2,   // seconds of safety after losing a heart
  shieldGrace: 1.2,          // seconds of safety after the shield absorbs a hit
  readyCountdown: 2.4,       // seconds of 3-2-1 before a level starts
  scores: { laksa: 10, gebuk: 50, mission: 200, level: 300, flawless: 100, timeBonusPerSecond: 10, timeBonusMax: 600 },
  timeLimit: 120,            // seconds for the whole run: all three levels share this clock
  fastSeconds: 30,           // 'Pantas' badge: a level's missions done within this many seconds
  achievements: [            // shown on the left of the HUD, lit as they are earned in a run
    { id: 'gebuk', icon: '🏺', name: 'Misi gebuk', desc: 'Collect the level\'s gebuk target' },
    { id: 'laksa', icon: '🍜', name: 'Misi laksa', desc: 'Collect the level\'s laksa target' },
    { id: 'power', icon: '🧲', name: 'Power-up', desc: 'Pick up any power-up' },
    { id: 'fast', icon: '⚡', name: 'Pantas', desc: 'Finish the level\'s missions within 30 seconds' },
    { id: 'flawless', icon: '💎', name: 'Tanpa langgaran', desc: 'Finish the level without losing a heart' },
  ],
  powerups: { magnet: 8, boost: 5, boostMultiplier: 1.45, chance: 0.09 },
  music: { src: 'audio/menu-theme.mp4', startAt: 0, loopStart: 10, volume: 0.4, fade: 0.6 },  // menu theme: plays once from startAt (s), then loops loopStart → end; on the register, hub and menu screens only
  // Online player database (Supabase). Run supabase.sql once in the project's SQL editor, then paste the
  // project URL and the anon public key (or the newer publishable key) from Project Settings → API Keys. Both empty = the artifact's database on
  // claude.ai, or this browser's storage anywhere else.
  supabase: { url: 'https://mosmfzlqoecydvtrdrnk.supabase.co', anonKey: 'sb_publishable_Jo05kO4k9O-qLJnTiLmfNw_3HSLP2g5' },
  levels: [
    {
      name: 'KAMPUNG LAKSA', title: 'Kampung Laksa', en: 'Easy', theme: 'A traditional Pahang village', env: 'village',
      need: 3, laksaTarget: 10, gebukEvery: [2, 3],          // rows between gebuk: spacing sets how tight the shared 120 s feel
      speed: { start: 12, max: 20, accel: 0.14 }, gap: { min: 11, seconds: 1.3 },
      twoLane: 0.25, movers: 0, narrow: 0, place: 'easy', powerups: ['magnet'],
      desc: 'Wooden houses, coconut trees and food stalls. Crates, baskets and chickens on the road; the gebuk sits in the open lanes.',
      heritage: {
        title: 'Kampung Laksa',
        text: 'Laksa gebuk is a traditional dish of Pahang. In the villages it is often prepared together for kenduri and family gatherings: rice-flour dough is kneaded, pressed into noodles and served with a thick fish gravy, ulam and sambal.',
      },
    },
    {
      name: 'DAPUR WARISAN', title: 'Dapur Warisan', en: 'Medium', theme: 'A traditional laksa kitchen', env: 'kitchen',
      need: 5, laksaTarget: 15, gebukEvery: [2, 3],
      speed: { start: 14, max: 25, accel: 0.16 }, gap: { min: 10, seconds: 1.1 },
      twoLane: 0.45, movers: 0.25, narrow: 0, place: 'skill', powerups: ['magnet', 'shield'],
      desc: 'Pots, tables, firewood and hanging utensils, with cooks crossing the lanes. Each gebuk floats above a hurdle or hides under a rack: jump or slide.',
      heritage: {
        title: 'Dapur Warisan',
        text: 'The gebuk is the press that gives the dish its name. The dough goes into the brass or wooden cylinder, the plunger is screwed down, and the noodles are pressed straight into a pot of boiling water. The gravy is made from boiled, flaked fish simmered with spices.',
      },
    },
    {
      name: 'JEJAK WARISAN', title: 'Jejak Warisan', en: 'Hard', theme: 'A heritage food market', env: 'market',
      need: 7, laksaTarget: 20, gebukEvery: [2, 3],
      speed: { start: 16, max: 30, accel: 0.18 }, gap: { min: 9, seconds: 0.95 },
      twoLane: 0.6, movers: 0.35, narrow: 0.15, place: 'trap', powerups: ['magnet', 'shield', 'boost'],
      desc: 'Stalls, crowds and moving carts, narrow fenced paths and faster rows. Traffic boxes you in, and the gebuk is on the hurdle in the only open lane.',
      heritage: {
        title: 'Jejak Warisan',
        text: 'A bowl of laksa gebuk carries the taste of Pahang: soft hand-pressed noodles, grey fish gravy, daun kesum, bunga kantan, cucumber, bean sprouts, sambal and a squeeze of lime. A gebuk is displayed at Muzium Pahang as part of the state\'s food heritage.',
      },
    },
  ],
  heritageNote: 'These notes are short summaries written for the game. Verify the details with heritage references or laksa gebuk practitioners before publication.',
};
