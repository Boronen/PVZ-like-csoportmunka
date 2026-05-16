// Wave definitions — PVZ-style.
// Each wave has a pool of enemy types (with weights) and a total enemy count.
// WaveManager draws randomly from the pool, respecting weights and lane distribution.
//
// faction: which enemy faction set this wave belongs to.
//   'undead' — Jozsi, Rex, Skeleton
//   'egypt'  — Bringer of Death
//   'legacy' — original Slade (for testing / mixed)
export const WAVES = [

  // ── UNDEAD FACTION ──────────────────────────────────────────────────────────
  {
    wave:          1,
    faction:       'undead',
    totalEnemies:  6,
    spawnInterval: 3000,
    pool: [
      { defKey: 'skeleton', weight: 1 },
    ],
  },
  {
    wave:          2,
    faction:       'undead',
    totalEnemies:  10,
    spawnInterval: 2500,
    pool: [
      { defKey: 'skeleton', weight: 3 },
      { defKey: 'rex',      weight: 1 },
    ],
  },
  {
    wave:          3,
    faction:       'undead',
    totalEnemies:  14,
    spawnInterval: 2200,
    pool: [
      { defKey: 'skeleton', weight: 2 },
      { defKey: 'rex',      weight: 2 },
    ],
  },
  {
    wave:          4,
    faction:       'undead',
    totalEnemies:  12,
    spawnInterval: 2000,
    pool: [
      { defKey: 'skeleton', weight: 3 },
      { defKey: 'rex',      weight: 2 },
      { defKey: 'jozsi',    weight: 1 },
    ],
  },

  // ── EGYPT FACTION ────────────────────────────────────────────────────────────
  {
    wave:          1,
    faction:       'egypt',
    totalEnemies:  6,
    spawnInterval: 3000,
    pool: [
      { defKey: 'bringerOfDeath', weight: 1 },
    ],
  },
  {
    wave:          2,
    faction:       'egypt',
    totalEnemies:  10,
    spawnInterval: 2500,
    pool: [
      { defKey: 'bringerOfDeath', weight: 1 },
    ],
  },
  {
    wave:          3,
    faction:       'egypt',
    totalEnemies:  14,
    spawnInterval: 2200,
    pool: [
      { defKey: 'bringerOfDeath', weight: 1 },
    ],
  },
  {
    wave:          4,
    faction:       'egypt',
    totalEnemies:  12,
    spawnInterval: 2000,
    pool: [
      { defKey: 'bringerOfDeath', weight: 1 },
    ],
  },

  // ── LEGACY (testing / fallback) ──────────────────────────────────────────────
  {
    wave:          1,
    faction:       'legacy',
    totalEnemies:  6,
    spawnInterval: 3000,
    pool: [
      { defKey: 'slade', weight: 1 },
    ],
  },
  {
    wave:          2,
    faction:       'legacy',
    totalEnemies:  10,
    spawnInterval: 2500,
    pool: [
      { defKey: 'slade', weight: 1 },
    ],
  },
  {
    wave:          3,
    faction:       'legacy',
    totalEnemies:  15,
    spawnInterval: 2000,
    pool: [
      { defKey: 'slade', weight: 1 },
    ],
  },
  {
    wave:          4,
    faction:       'legacy',
    totalEnemies:  15,
    spawnInterval: 2000,
    pool: [
      { defKey: 'slade', weight: 1 },
    ],
  },
];
