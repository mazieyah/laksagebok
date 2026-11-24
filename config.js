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
  scores: { laksa: 10, gebuk: 50, enemy: 20, mission: 200, level: 300, flawless: 100, timeBonusPerSecond: 10, timeBonusMax: 600 },   // enemy: bowled over with the cili boost
  timeLimit: 120,            // seconds for the whole run: all three levels share this clock
  fastSeconds: 30,           // 'Pantas' badge: a level's gebuk mission done within this many seconds
  achievements: [            // shown on the left of the HUD, lit as they are earned in a run
    { id: 'gebuk', icon: '🏺', name: 'Misi gebuk', desc: 'Collect the level\'s gebuk target' },
    { id: 'laksa', icon: '🍜', name: 'Pengumpul laksa', desc: 'Collect the level\'s laksa bowl count (10 / 15 / 20) in one level; collecting is unlimited' },
    { id: 'power', icon: '🧲', name: 'Power-up', desc: 'Pick up any power-up' },
    { id: 'fast', icon: '⚡', name: 'Pantas', desc: 'Finish the level\'s gebuk mission within 30 seconds' },
    { id: 'flawless', icon: '💎', name: 'Tanpa langgaran', desc: 'Finish the level without losing a heart' },
  ],
  powerups: { magnet: 8, boost: 5, boostMultiplier: 1.45, chance: 0.09 },
  signIn: { checkSeconds: 2, noticeSeconds: 2, nameMaxLength: 9 },   // sign-in pop-ups and the player-name limit
  // "Tentang" in Tetapan. Edit freely: studio, a short description, credit lines and the version shown.
  about: {
    studio: 'Synexis Digital',
    text: [
      'Laksa Arcade ialah koleksi permainan warisan Laksa Gebok Pahang: Laksa Gebok Run, Laksa Quest, Teka Silang Laksa dan Cari Kata Laksa.',
      'Dibangunkan oleh Synexis Digital sebagai sebahagian daripada projek Jejak Warisan Laksa Gebok, untuk mengenali sejarah, peralatan dan cara pembuatan laksa gebok.',
    ],
    credits: [
      'Rujukan warisan: Muzium Sultan Abu Bakar, Pekan',
      'Demonstrasi gebok: Restoren Laksa Gebok Aki Pian, Temerloh',
      'Proses pembuatan: blog fiezabard.blogspot.com',
    ],
    version: 'Versi 1.1 · 2026',
  },
  music: { src: 'audio/menu-theme.mp4', startAt: 0, loopStart: 10, volume: 0.4, fade: 0.6 },  // menu theme: plays once from startAt (s), then loops loopStart → end; on the register, hub and menu screens only
  // Online player database (Supabase). Run supabase.sql once in the project's SQL editor, then paste the
  // project URL and the anon public key (or the newer publishable key) from Project Settings → API Keys. Both empty = the artifact's database on
  // claude.ai, or this browser's storage anywhere else.
  supabase: { url: 'https://mosmfzlqoecydvtrdrnk.supabase.co', anonKey: 'sb_publishable_Jo05kO4k9O-qLJnTiLmfNw_3HSLP2g5' },
  // Heritage pages ("Maklumat Laksa Gebok") shown right after sign-in, before the games menu, and again from the menu's "i" button.
  // SETERUSNYA / KEMBALI turn the pages; the last page's button opens the menu. Text follows the project's poster and the recipe
  // board photographed at Muzium Sultan Abu Bakar, Pekan. Each page: tab + icon (sidebar), title, figure, points / steps / columns, callout,
  // photo (a picture under the text), lead (a paragraph before the steps), gallery (captioned photos after the steps), more (icon paragraphs
  // after them), source and sourceUrl (the source as a link).
  heritageIntro: [
    {
      tab: 'Asal-Usul', icon: '📖', title: 'Asal-Usul Laksa Gebok',
      figure: { image: 'brass-gebok.png', alt: 'Gebok tembaga', label: 'Gebok', caption: 'Alat tradisional pembuat mi laksa.' },
      points: [
        { icon: '🍜', text: 'Laksa Gebok ialah hidangan tradisional yang menjadi kebanggaan negeri Pahang. Keistimewaannya terletak pada cara pembuatan mi laksa menggunakan alat tradisional yang dikenali sebagai gebok.' },
        { icon: '⚙️', text: 'Gebok ialah penekan mi daripada tembaga atau kayu. Doh dimasukkan ke dalam silinder, dipulas, dan mi keluar ke dalam periuk air mendidih.' },
        { icon: '🏛️', text: 'Sebuah gebok asal dipamerkan di Muzium Sultan Abu Bakar, Pekan, sebagai sebahagian daripada warisan makanan negeri Pahang.' },
      ],
      callout: { image: 'laksa-bowl.png', text: 'Mi laksa yang lembut dihidangkan bersama kuah ikan yang pekat, ulam-ulaman dan sambal. Hidangan ini sering dinikmati bersama keluarga dan diwarisi turun-temurun.' },
      source: 'Sumber: Muzium Sultan Abu Bakar, Pekan dan Restoren Laksa Gebok Aki Pian, Temerloh.',
    },
    {
      tab: 'Proses Pembuatan', icon: '🍲', title: 'Proses Pembuatan Laksa Gebok',
      lead: 'Beginilah laksa gebok disediakan mengikut resipi sebuah keluarga di Kampung Panching, Kuantan, Pahang:',
      steps: [
        'Doh diuli awal pagi daripada tepung gandum dan air sahaja, sehingga sebati dan tidak melekit.',
        'Doh dimasukkan ke dalam gebok tembaga, lebih kurang 1 kg bagi setiap isian. Gebok didudukkan pada papan kayu berlubang supaya kukuh semasa diputar.',
        'Pemulas gebok diputar beramai-ramai; mi keluar melalui lubang-lubang gebok terus ke dalam periuk air mendidih.',
        'Mi dikacau sentiasa supaya tidak melekat, dan direbus lebih kurang 10 minit.',
        'Mi diangkat, diasingkan daripada gebok, dibilas dan ditoskan sebelum dihidangkan.',
      ],
      gallery: [
        { image: 'proses-1-uli.jpg', caption: '1 · Uli doh tepung gandum' },
        { image: 'proses-2-isi.jpg', caption: '2 · Isi doh ke dalam gebok' },
        { image: 'proses-3-putar.jpg', caption: '3 · Putar gebok, mi terus ke air mendidih' },
        { image: 'proses-4-rebus.jpg', caption: '4 · Rebus lebih kurang 10 minit' },
        { image: 'proses-5-angkat.jpg', caption: '5 · Angkat dan bilas mi' },
        { image: 'proses-6-hidang.jpg', caption: 'Hidang bersama kuah, ulam dan sambal' },
        { image: 'proses-7-kuah.jpg', caption: 'Kuah lemak ikan kembung' },
        { image: 'proses-8-ulam.jpg', caption: 'Ulam-ulaman dihiris halus' },
      ],
      more: [
        { icon: '🐟', text: 'Kuah lemak ikan: ikan kembung segar direbus, isi dan tulangnya dikisar berasingan lalu ditapis supaya tiada tulang kasar, kemudian dimasak bersama santan pekat, bawang merah, bawang putih kisar, lada hitam, asam keping dan sedikit garam.' },
        { icon: '🌿', text: 'Ulam dan sambal: kacang panjang, daun kunyit, daun kesum, timun dan daun selasih dihiris halus, ditambah sedikit tauge; sambal lada kering ditumbuk halus dan dihidang bersama belacan serta limau kasturi.' },
      ],
      callout: { image: 'golden-gebok.png', text: 'Mi disusun dalam mangkuk, dicurah kuah, lalu ditabur ulam, tauge dan sambal. Kata orang Pahang, laksa gebok paling sedap dimakan dengan tangan.' },
      source: 'Sumber: Blog fiezabard.blogspot.com',
    },
    {
      tab: 'Resepi', icon: '🍴', title: 'Resepi Laksa Gebok',
      columns: [
        { heading: 'Mi laksa', items: ['500 g tepung gandum', '2 sudu kecil garam halus', '2 sudu besar minyak masak', '230–260 ml air panas'],
          note: 'Campurkan semua bahan dalam satu bekas, tambah air sedikit demi sedikit dan uli sehingga doh tidak melekit. Masukkan doh ke dalam gebok sedikit demi sedikit, rebus mi sehingga masak dan lembut, keluarkan dan toskan.' },
        { heading: 'Kuah laksa', items: ['500 g ikan tenggiri dan 50 g ikan tenggiri jeruk, direbus', '250 g bawang merah, 80 g bawang putih, 40 g halia dan 100 g lada kering, digoreng berasingan tanpa minyak', '4 batang serai', '2 sudu makan biji ketumbar, ½ sudu makan jintan putih dan ½ sudu makan jintan manis, digoreng tanpa minyak hingga naik bau', '100 g kerisik', '3–4 cawan santan pekat', '1 cawan air rebusan ikan'] },
        { heading: 'Cara membuat kuah', ordered: true, items: ['Goreng ketumbar, jintan putih dan jintan manis berasingan tanpa minyak sehingga naik bau.', 'Tumbuk kerisik, bahan yang digoreng dan rempah bersama ½ cawan santan.', 'Buang kulit dan tulang ikan rebus, tumbuk isi ikan bersama ½ cawan santan.', 'Masak semua bahan yang ditumbuk bersama baki santan dan air rebusan ikan.'] },
        { heading: 'Hiasan', items: ['Kacang panjang, daun kesum dan daun selasih dihiris nipis', 'Timun diparut halus', 'Tauge mentah', 'Bawang besar dihiris', 'Limau kasturi dibelah dua', 'Telur masin rebus', 'Sebuku belacan dibakar', 'Lada kering dikisar halus dan garam'] },
      ],
      source: 'Sumber: Muzium Sultan Abu Bakar, Pekan.',
    },
  ],
  levels: [
    {
      name: 'KAMPUNG LAKSA', title: 'Kampung Laksa', en: 'Easy', theme: 'A traditional Pahang village', env: 'village',
      need: 3, laksaTarget: 10, gebukEvery: [2, 3],          // need = gebuk to finish the level; laksaTarget = bowls for the Pengumpul laksa badge (collecting is unlimited); gebukEvery = rows between gebuk
      speed: { start: 12, max: 20, accel: 0.14 }, gap: { min: 11, seconds: 1.3 },
      twoLane: 0.25, movers: 0.15, narrow: 0, enemies: 0.3, place: 'easy', powerups: ['magnet'],   // movers: rooster rows; enemies: chance of a wild boar charging down an open lane
      desc: 'Wooden houses, coconut trees and food stalls. Crates, baskets and chickens on the road, roosters pacing the lanes and wild boars charging at you; the gebuk sits in the open lanes.',
      heritage: {
        title: 'Kampung Laksa',
        text: 'Laksa gebuk is a traditional dish of Pahang. In the villages it is often prepared together for kenduri and family gatherings: rice-flour dough is kneaded, pressed into noodles and served with a thick fish gravy, ulam and sambal.',
      },
    },
    {
      name: 'DAPUR WARISAN', title: 'Dapur Warisan', en: 'Medium', theme: 'A traditional laksa kitchen', env: 'kitchen',
      need: 5, laksaTarget: 15, gebukEvery: [2, 3],
      speed: { start: 14, max: 25, accel: 0.16 }, gap: { min: 10, seconds: 1.1 },
      twoLane: 0.45, movers: 0.25, narrow: 0, enemies: 0.35, place: 'skill', powerups: ['magnet', 'shield'],   // enemies: rats scurrying at you; the cat paces the lanes with the cooks
      desc: 'Pots, tables, firewood and hanging utensils, with cooks and a cat crossing the lanes and rats scurrying at you. Each gebuk floats above a hurdle or hides under a rack: jump or slide.',
      heritage: {
        title: 'Dapur Warisan',
        text: 'The gebuk is the press that gives the dish its name. The dough goes into the brass or wooden cylinder, the plunger is screwed down, and the noodles are pressed straight into a pot of boiling water. The gravy is made from boiled, flaked fish simmered with spices.',
      },
    },
    {
      name: 'JEJAK WARISAN', title: 'Jejak Warisan', en: 'Hard', theme: 'A heritage food market', env: 'market',
      need: 7, laksaTarget: 20, gebukEvery: [2, 3],
      speed: { start: 16, max: 30, accel: 0.18 }, gap: { min: 9, seconds: 0.95 },
      twoLane: 0.6, movers: 0.35, narrow: 0.15, enemies: 0.45, place: 'trap', powerups: ['magnet', 'shield', 'boost'],   // enemies: monkeys that hunt your lane and fast dogs
      desc: 'Stalls, crowds and moving carts, narrow fenced paths and faster rows, with monkeys and dogs charging down the open lanes. Traffic boxes you in, and the gebuk is on the hurdle in the only open lane.',
      heritage: {
        title: 'Jejak Warisan',
        text: 'A bowl of laksa gebuk carries the taste of Pahang: soft hand-pressed noodles, grey fish gravy, daun kesum, bunga kantan, cucumber, bean sprouts, sambal and a squeeze of lime. A gebuk is displayed at Muzium Pahang as part of the state\'s food heritage.',
      },
    },
  ],
  heritageNote: 'These notes are short summaries written for the game. Verify the details with heritage references or laksa gebuk practitioners before publication.',
};
