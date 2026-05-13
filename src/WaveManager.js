import { CONFIG }     from './utils/CONFIG.js';
import { Enemy }      from './Enemy.js';
import { ENEMY_DEFS } from './data/enemyDefs.js';

// Controls wave sequencing and PVZ-style random enemy spawning.
export class WaveManager {
  constructor(waves) {
    this.waves         = waves;
    this.currentWave   = 0;       // index into this.waves (0-based)
    this.spawnQueue    = [];       // { defKey, laneIndex, spawnAt }[]
    this.isComplete    = false;
    this._elapsed      = 0;       // ms since current wave started
    this._waitingNext  = false;
    this._betweenDelay = 5000;    // ms pause between waves
    this._betweenTimer = 0;
    this._sprites      = {};      // set by Game.preload()
    this._game         = null;    // set by Game
  }

  setSprites(sprites) { this._sprites = sprites; }
  setGame(game)       { this._game = game; }

  startNextWave() {
    if (this.currentWave >= this.waves.length) {
      this.isComplete = true;
      return;
    }

    const waveDef     = this.waves[this.currentWave];
    this._elapsed     = 0;
    this.spawnQueue   = this._buildRandomQueue(waveDef);
    this.currentWave++;
    this._waitingNext = false;
  }

  // Build a flat timed spawn list by drawing randomly from the wave's pool.
  // Lanes are also assigned randomly across all available rows.
  _buildRandomQueue(waveDef) {
    const queue = [];
    for (let i = 0; i < waveDef.totalEnemies; i++) {
      const defKey    = this._drawFromPool(waveDef.pool);
      const laneIndex = Math.floor(Math.random() * CONFIG.ROWS);
      queue.push({
        defKey,
        laneIndex,
        spawnAt: waveDef.spawnInterval * i,   // ms from wave start
      });
    }
    return queue;   // already sorted by spawnAt (sequential)
  }

  // Weighted random draw from pool entries: [{ defKey, weight }, ...]
  _drawFromPool(pool) {
    const total  = pool.reduce((sum, e) => sum + e.weight, 0);
    let   roll   = Math.random() * total;
    for (const entry of pool) {
      roll -= entry.weight;
      if (roll <= 0) return entry.defKey;
    }
    return pool[pool.length - 1].defKey;
  }

  allWavesCleared() {
    return this.isComplete && this.spawnQueue.length === 0;
  }

  // One enemy spawns at a time — next one only enters when the field is clear.
  update(deltaTime, game) {
    if (this.isComplete) return;

    if (this._waitingNext) {
      this._betweenTimer -= deltaTime * 1000;
      if (this._betweenTimer <= 0) this.startNextWave();
      return;
    }

    this._elapsed += deltaTime * 1000;

    const hasLiving = game.enemies.some(e => !e.isDead());
    if (!hasLiving && this.spawnQueue.length > 0 &&
        this.spawnQueue[0].spawnAt <= this._elapsed) {
      const entry = this.spawnQueue.shift();
      const enemy = this._spawnEnemy(entry, game);
      game.enemies.push(enemy);
    }

    // All queued enemies defeated → move to next wave
    if (this.spawnQueue.length === 0 && !hasLiving) {
      if (this.currentWave >= this.waves.length) {
        this.isComplete = true;
      } else {
        this._waitingNext  = true;
        this._betweenTimer = this._betweenDelay;
      }
    }
  }

  _spawnEnemy(entry, game) {
    const config = ENEMY_DEFS[entry.defKey];
    if (!config) throw new Error(`WaveManager: unknown enemy key "${entry.defKey}"`);

    const sprites = {
      idle:   this._sprites[config.idleSprite]   ?? null,
      attack: this._sprites[config.attackSprite] ?? null,
    };

    return new Enemy({
      config,
      x:         CONFIG.CANVAS_WIDTH + CONFIG.SPAWN_X_OFFSET,
      y:         CONFIG.LANE_Y(entry.laneIndex),
      laneIndex: entry.laneIndex,
      sprites,
      game,     // pass game reference so enemy can push projectiles
    });
  }
}
