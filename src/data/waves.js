// Wave definitions — PVZ-style.
// Each wave has a pool of enemy types (with weights) and a total enemy count.
// WaveManager draws randomly from the pool, respecting weights and lane distribution.
export const WAVES = [
  {
    wave:          1,
    totalEnemies:  6,
    spawnInterval: 3000,   // ms between each enemy
    pool: [
      { defKey: 'slade', weight: 1 },
    ],
  },
  {
    wave:          2,
    totalEnemies:  10,
    spawnInterval: 2500,
    pool: [
      { defKey: 'slade', weight: 1 },
    ],
  },
  {
    wave:          3,
    totalEnemies:  15,
    spawnInterval: 2000,
    pool: [
      { defKey: 'slade', weight: 1 },
    ],

  },
    {
    wave:          4,
    totalEnemies:  15,
    spawnInterval: 2000,
    pool: [
      { defKey: 'slade', weight: 1 },
    ],
  },
];
