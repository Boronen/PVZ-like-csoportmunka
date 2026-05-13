// Unit definitions — all stat and behaviour differences live here.
// Sprite filenames match the assets/ folder naming convention.
export const UNIT_DEFS = {
  soldier: {
    key:          'soldier',
    label:        'Soldier',
    hp:           200,
    attackSpeed:  1.5,        // attacks per second
    damage:       40,
    range:        85,         // melee: attacks when enemy is adjacent
    cost:         100,
    cooldown:     7.5,
    idleSprite:   'assets/ally_Soldier_idle.png',
    attackSprite: 'assets/ally_Soldier_attack.png',
    idleFrames:   { cols: 3, rows: 3, total: 9 },
    attackFrames: { cols: 3, rows: 3, total: 8 },
    onAttack:     'melee',
    effectOnHit:  null,
  },

  archer: {
    key:          'archer',
    label:        'Archer',
    hp:           100,
    attackSpeed:  1.0,        // shots per second
    damage:       25,
    range:        420,        // fires from long distance — enough to reach Slade
    cost:         125,
    cooldown:     8,
    idleSprite:   'assets/ally_Archer_idle.png',
    attackSprite: 'assets/ally_Archer_Shot.png',
    // idle: 1 row × 4 cols = 4 frames
    idleFrames:   { cols: 4, rows: 1, total: 4 },
    // attack: 1 row × 14 cols = 14 frames
    attackFrames: { cols: 14, rows: 1, total: 14 },
    onAttack:     'projectile',
    effectOnHit:  null,
  },
};
