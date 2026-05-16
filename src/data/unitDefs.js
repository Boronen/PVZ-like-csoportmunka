// Unit definitions — all stat and behaviour differences live here.
//
// Frame layout is derived from the ACTUAL measured image dimensions:
//
//   ally_archer_attack.png  : 480×600  → 5 col × 4 row → frame 96×150
//   ally_archer_idle.png    : 220×330  → 2 col × 3 row → frame 110×110
//   Wizard Pack/Idle.png    : 1386×190 → 6 col × 1 row → frame 231×190 (horizontal strip)
//   Wizard Pack/Attack2.png : 1848×190 → 8 col × 1 row → frame 231×190
//   Arcane archer/spritesheet.png : 512×512 → 8 col × 8 row → frame 64×64
//
// drawSize (optional): target pixel size to render the entity on screen.
//   The renderer scales the natural frame to fit this box while preserving
//   the aspect ratio.  Defaults to CONFIG.CELL_SIZE (80) if omitted.
//
// rowIndex (optional): forces a fixed row on a multi-row shared spritesheet.
//
// projectileSprite / projectileFrames: optional animated projectile.
export const UNIT_DEFS = {

  soldier: {
    key:          'soldier',
    label:        'Soldier',
    hp:           200,
    attackSpeed:  1.5,
    damage:       40,
    range:        85,
    cost:         100,
    cooldown:     7.5,
    idleSprite:   'assets/sprites/allies/ally_Soldier_idle.png',
    attackSprite: 'assets/sprites/allies/ally_Soldier_attack.png',
    idleFrames:   { cols: 3, rows: 3, total: 9 },
    attackFrames: { cols: 3, rows: 3, total: 8 },
    onAttack:     'melee',
    effectOnHit:  null,
    drawSize:     80,
  },

  /**
   * Regular Archer
   *   attack: 480×600  → 5 col × 4 row, 17 usable frames, frame 96×150
   *   idle:   220×330  → 2 col × 3 row,  5 usable frames, frame 110×110
   */
  archer: {
    key:          'archer',
    label:        'Archer',
    hp:           100,
    attackSpeed:  1.0,
    damage:       25,
    range:        420,
    cost:         125,
    cooldown:     8,
    idleSprite:   'assets/sprites/allies/ally_archer_idle.png',
    attackSprite: 'assets/sprites/allies/ally_archer_attack.png',
    // ally_archer_idle.png   : 220×330 → 2col×3row → frame 110×110
    idleFrames:   { cols: 2, rows: 3, total: 5 },
    // ally_archer_attack.png : 480×600 → 4col×5row → frame 120×120 (square)
    attackFrames: { cols: 4, rows: 5, total: 17 },
    onAttack:     'projectile',
    effectOnHit:  null,
    drawSize:     80,
  },

  /**
   * Arcana Archer
   *   Spritesheet: 512×512 → 8 col × 8 row → frame 64×64
   *   Idle:   row 8 (rowIndex: 7) — 2 frames
   *   Attack: row 4 (rowIndex: 3) — 7 frames
   *   Projectile: Arcane archer/projectile.png
   */
  arcanaArcher: {
    key:          'arcanaArcher',
    label:        'Arcana Archer',
    hp:           100,
    attackSpeed:  1.0,
    damage:       30,
    range:        460,
    cost:         150,
    cooldown:     9,
    idleSprite:   'assets/sprites/allies/Arcane archer/spritesheet.png',
    attackSprite: 'assets/sprites/allies/Arcane archer/spritesheet.png',
    // 512×512 / 8 cols / 8 rows → 64×64 per frame
    idleFrames:   { cols: 8, rows: 8, total: 2, rowIndex: 7 },
    attackFrames: { cols: 8, rows: 8, total: 7, rowIndex: 3 },
    onAttack:     'projectile',
    effectOnHit:  null,
    drawSize:     80,
    projectileSprite: 'assets/sprites/allies/Arcane archer/projectile.png',
    projectileFrames: { cols: 1, rows: 1, total: 1 },
  },

  /**
   * Wizard
   *   Idle:   Wizard Pack/Idle.png    → 1386×190 → 6 col × 1 row (horizontal strip)
   *                                     frame 231×190
   *   Attack: Wizard Pack/Attack2.png → 1848×190 → 8 col × 1 row
   *                                     frame 231×190
   *   Projectile: effects/Projectile 2 w blur.png → 16 col × 1 row
   */
  wizard: {
    key:          'wizard',
    label:        'Wizard',
    hp:           120,
    attackSpeed:  1.2,
    damage:       35,
    range:        400,
    cost:         175,
    cooldown:     9,
    idleSprite:   'assets/sprites/allies/Wizard Pack/Idle.png',
    attackSprite: 'assets/sprites/allies/Wizard Pack/Attack2.png',
    // 1386×190 / 6 cols → 231×190 per frame (horizontal strip, 1 row)
    idleFrames:   { cols: 6, rows: 1, total: 6 },
    // 1848×190 / 8 cols → 231×190 per frame
    attackFrames: { cols: 8, rows: 1, total: 8 },
    onAttack:     'projectile',
    effectOnHit:  null,
    // 1.3× standard cell
    drawSize:     125,
    projectileSprite: 'assets/effects/Projectile 2 w blur.png',
    projectileFrames: { cols: 16, rows: 1, total: 16 },
    // 1.6× scale applied when drawing the projectile sprite
    projectileScale:  1.6,
  },

  /**
   * Goblin — Monster Creatures Fantasy pack.
   * Lobs bombs at medium range (projectile attack).
   *   Attack3.png   : 1800×150 → 12 col × 1 row → frame 150×150
   *   Bomb_sprite.png : 2850×150 → 19 col × 1 row → frame 150×150
   */
  goblin: {
    key:          'goblin',
    label:        'Goblin',
    hp:           80,
    attackSpeed:  2.0,
    damage:       20,
    range:        200,
    cost:         75,
    cooldown:     6,
    idleSprite:   'assets/sprites/allies/Monster_Creatures_Fantasy(Version 1.3)/Goblin/Attack3.png',
    attackSprite: 'assets/sprites/allies/Monster_Creatures_Fantasy(Version 1.3)/Goblin/Attack3.png',
    // Attack3.png : 1800×150 → 12 col × 1 row → frame 150×150 (perfect square)
    idleFrames:   { cols: 12, rows: 1, total: 12 },
    attackFrames: { cols: 12, rows: 1, total: 12 },
    onAttack:     'projectile',
    effectOnHit:  null,
    drawSize:     96,
    projectileSprite: 'assets/sprites/allies/Monster_Creatures_Fantasy(Version 1.3)/Goblin/Bomb_sprite.png',
    projectileFrames: { cols: 19, rows: 1, total: 19 },
  },

};
