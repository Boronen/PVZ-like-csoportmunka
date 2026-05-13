// Enemy definitions — all stat and behaviour differences live here.
// onAttack: 'projectile' = fires a shot; 'melee' = damages on contact
export const ENEMY_DEFS = {
  slade: {
    key:           'slade',
    label:         'Slade',
    hp:            120,
    movementSpeed: 50,          // px/s while walking
    attackSpeed:   1.0,         // shots per second
    damage:        20,          // damage per shot
    range:         350,         // px — Slade shoots from a distance
    reward:        25,
    idleSprite:    'assets/enemy_Slade_moving.png',
    attackSprite:  'assets/enemy_Slade_shooting.png',
    idleFrames:    { cols: 5, rows: 1, total: 4 },
    attackFrames:  { cols: 5, rows: 3, total: 14 },
    onAttack:      'projectile',
    effectOnHit:   null,
  },
};
