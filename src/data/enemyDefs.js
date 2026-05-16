// Enemy definitions — all stat and behaviour differences live here.
//
// rowIndex (optional): forces the renderer to use a specific row of a shared spritesheet.
// useIndividualFrames: when true, idleFrameFiles/attackFrameFiles are arrays of PNG paths.
//
// sounds: optional keyed audio paths played by the Enemy class at the appropriate moments.
export const ENEMY_DEFS = {

  // ── Legacy ──────────────────────────────────────────────────────────────────
  slade: {
    key:           'slade',
    label:         'Slade',
    faction:       'legacy',
    hp:            120,
    movementSpeed: 50,
    attackSpeed:   1.0,
    damage:        20,
    range:         350,
    reward:        25,
    idleSprite:    'assets/enemy_Slade_moving.png',
    attackSprite:  'assets/enemy_Slade_shooting.png',
    idleFrames:    { cols: 5, rows: 1, total: 4 },
    attackFrames:  { cols: 5, rows: 3, total: 14 },
    onAttack:      'projectile',
    effectOnHit:   null,
  },

  // ── Faction: Undead ──────────────────────────────────────────────────────────

  /**
   * Jozsi — Boss unit of the Undead faction.
   *
   * Three sprite sets, chosen by target distance:
   *   moving (no target)  : idleSprite    3 col × 3 row, 12 frames
   *   ranged (> 90 px)    : attackSprite  4 col × 3 row, 12 frames
   *   melee  (≤ 90 px)    : meleeSprite   4 col × 4 row, 15 frames
   *
   * Ranged projectile uses ravenSprite: 3 col × 4 row, 12 frames
   *
   * Sounds:
   *   moving  → assets/musics/jozsi_moving.mp3
   *   ranged  → assets/musics/jozsi_raven_attack.mp3
   *   melee   → assets/musics/jozsi_smash_v2.mp3
   */
  jozsi: {
    key:           'jozsi',
    label:         'Jozsi',
    faction:       'undead',
    hp:            800,
    movementSpeed: 30,
    attackSpeed:   0.6,
    damage:        55,
    range:         340,
    reward:        200,
    isBoss:        true,

    // Moving sprite — 960×1280 → 3 col × 4 row → frame 320×320 px (integer!)
    idleSprite:    'assets/enemy_Jozsi_moving.png',
    idleFrames:    { cols: 3, rows: 4, total: 12 },

    // Ranged attack sprite — 960×1280 → 3 col × 4 row → frame 320×320 px
    attackSprite:  'assets/enemy_Jozsi_ranged_attack.png',
    attackFrames:  { cols: 3, rows: 4, total: 12 },

    // Melee attack sprite — 1280×1280 → 4 col × 4 row → frame 320×320 px
    meleeSprite:   'assets/enemy_Jozsi_meele_attack.png',
    meleeFrames:   { cols: 4, rows: 4, total: 15 },

    // Raven projectile sprite — 660×600 → 3 col × 4 row → frame 220×150 px
    ravenSprite:   'assets/enemy_Jozsi_raven_ranged_attack.png',
    ravenFrames:   { cols: 3, rows: 4, total: 12 },

    // Boss — 2× standard, dominates the screen
    drawSize:      320,

    onAttack:      'projectile',
    effectOnHit:   null,

    sounds: {
      move:   'assets/musics/jozsi_moving.mp3',
      ranged: 'assets/musics/jozsi_raven_attack.mp3',
      melee:  'assets/musics/jozsi_smash_v2.mp3',
    },
  },

  /**
   * Rex — Undead dog enemy.
   * Very fast movement and rapid attack speed.
   * Spritesheet: 4 col × 4 row, 15 frames
   *
   * Sounds:
   *   spawn   → assets/musics/bones_spawn.mp3
   *   running → assets/musics/bones.mp3
   */
  rex: {
    key:           'rex',
    label:         'Rex',
    faction:       'undead',
    hp:            90,
    movementSpeed: 160,
    attackSpeed:   3.0,
    damage:        18,
    range:         70,
    reward:        30,

    // 440×440 → 4 col × 4 row → frame 110×110 px
    idleSprite:    'assets/enemy_Rex_moving.png',
    attackSprite:  'assets/enemy_Rex_moving.png',
    idleFrames:    { cols: 4, rows: 4, total: 15 },
    attackFrames:  { cols: 4, rows: 4, total: 15 },
    drawSize:      72,

    onAttack:      'melee',
    effectOnHit:   null,

    sounds: {
      spawn: 'assets/musics/bones_spawn.mp3',
      move:  'assets/musics/bones.mp3',
    },
  },

  /**
   * Skeleton — Undead spritesheet enemy.
   * Remade sprites — two separate single-row sheets:
   *   skeleton_enemy_moving.png : 832×64 → 13 col × 1 row → frame 64×64
   *   skeleton_enemy_attack.png : 832×64 → 13 col × 1 row → frame 64×64
   * No rowIndex needed — each file is its own single strip.
   */
  skeleton: {
    key:           'skeleton',
    label:         'Skeleton',
    faction:       'undead',
    hp:            110,
    movementSpeed: 55,
    attackSpeed:   1.2,
    damage:        22,
    range:         80,
    reward:        20,

    // 832×64 → 13 col × 1 row → frame 64×64 (perfect square)
    idleSprite:    'assets/skeleton_enemy_moving.png',
    attackSprite:  'assets/skeleton_enemy_attack.png',
    // 12 usable frames (last frame is blank/useless)
    idleFrames:    { cols: 13, rows: 1, total: 12 },
    attackFrames:  { cols: 13, rows: 1, total: 13 },
    drawSize:      72,
    drawOffsetX:   18,
    // Sprite faces right — flip horizontally so it faces left (enemy direction)
    flipX:         true,

    onAttack:      'melee',
    effectOnHit:   null,
  },

  // ── Faction: Egypt ───────────────────────────────────────────────────────────

  /**
   * Bringer of Death — Egypt faction.
   * Uses individual sprite frame files.
   *   Walk:   8 files (Bringer-of-Death_Walk_1..8)
   *   Attack: 10 files (Bringer-of-Death_Attack_1..10)
   */
  bringerOfDeath: {
    key:              'bringerOfDeath',
    label:            'Bringer of Death',
    faction:          'egypt',
    hp:               350,
    movementSpeed:    40,
    attackSpeed:      0.8,
    damage:           45,
    range:            90,
    reward:           80,

    useIndividualFrames: true,
    idleFrameFiles:   Array.from({ length: 8 }, (_, i) =>
      `assets/Bringer-Of-Death/Individual Sprite/Walk/Bringer-of-Death_Walk_${i + 1}.png`),
    attackFrameFiles: Array.from({ length: 10 }, (_, i) =>
      `assets/Bringer-Of-Death/Individual Sprite/Attack/Bringer-of-Death_Attack_${i + 1}.png`),
    // Fallback / preload anchor sprites
    idleSprite:       'assets/Bringer-Of-Death/Individual Sprite/Walk/Bringer-of-Death_Walk_1.png',
    attackSprite:     'assets/Bringer-Of-Death/Individual Sprite/Attack/Bringer-of-Death_Attack_1.png',
    idleFrames:       { cols: 1, rows: 1, total: 1 },
    attackFrames:     { cols: 1, rows: 1, total: 1 },
    // 1.5× standard cell size
    drawSize:         120,

    onAttack:         'melee',
    effectOnHit:      null,
  },

};
