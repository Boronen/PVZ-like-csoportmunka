// Central config — no magic numbers anywhere else in the codebase
export const CONFIG = {
  CELL_SIZE:    80,
  COLS:         10,
  ROWS:         5,
  BASE_X:       80,               // x < BASE_X means "enemy reached base"
  CANVAS_WIDTH:  800,
  CANVAS_HEIGHT: 560,             // 5 rows * 80px + 160px UI bar
  UI_HEIGHT:     160,             // slot bar + HUD area at bottom
  GAME_AREA_HEIGHT: 400,          // 5 * 80
  SPAWN_X_OFFSET: 60,             // how far right of canvas enemies spawn

  // Derived helper – lane center Y in world space
  LANE_Y: (laneIndex) => laneIndex * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2,

  // Sprite frame sizes (pixels)
  UNIT_FRAME_W:  96,
  UNIT_FRAME_H:  96,
  ENEMY_FRAME_W: 96,
  ENEMY_FRAME_H: 96,

  // Animation FPS
  UNIT_ANIM_FPS:  3,
  ENEMY_ANIM_FPS: 10,

  // Projectile
  PROJECTILE_SPEED: 600,          // px/s

  // Starting values
  STARTING_MONEY: 150,
  BASE_HP:        100,
};
