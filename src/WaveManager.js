import { CONFIG }     from './utils/CONFIG.js';
import { Enemy }      from './Enemy.js';
import { ENEMY_DEFS } from './data/enemyDefs.js';

// Controls wave sequencing and PVZ-style random enemy spawning.
export class WaveManager {
  /** @param {object[]} waves  Array of wave definition objects from waves.js. */
  constructor(waves) {
    this.waves         = waves;
    this.currentWave   = 0;       // index into this.waves (0-based)
    this.spawnQueue    = [];       // { defKey, laneIndex, spawnAt }[]
    this.isComplete    = false;
    this._elapsed      = 0;       // ms elapsed since the current wave started
    this._waitingNext  = false;   // true while counting down between waves
    this._betweenDelay = 5000;    // ms pause between waves
    this._betweenTimer = 0;       // countdown (ms) until the next wave begins
    this._sprites      = {};      // set by Game.preload() via setSprites()
    this._game         = null;    // set by Game via setGame()

    // ── PVZ progress bar data ───────────────────────────────────────────────
    // Exposed to UI._drawWaveProgressBar() and incremented by Game.handleEnemyDeath()
    this.enemiesDefeatedThisWave = 0;
    this.totalEnemiesThisWave    = 0;
    this.currentWaveLabel        = 'Wave — / —';
  }

  /** @param {Record<string, HTMLImageElement>} sprites */
  setSprites(sprites) { this._sprites = sprites; }

  /** @param {Game} game */
  setGame(game)       { this._game = game; }

  /**
   * Kick off the next wave in sequence.
   * Builds the spawn queue, resets the progress bar counters, and
   * increments `currentWave`.  Does nothing if all waves are already done.
   */
  startNextWave() {
    if (this.currentWave >= this.waves.length) {
      this.isComplete       = true;
      this.currentWaveLabel = 'All waves cleared!';
      return;
    }

    const waveDef = this.waves[this.currentWave];
    this._elapsed = 0;

    // Build a timed list of enemies to spawn during this wave
    this.spawnQueue = this._buildRandomQueue(waveDef);

    this.currentWave++;
    this._waitingNext = false;

    // Reset progress bar counters for the incoming wave
    this.enemiesDefeatedThisWave = 0;
    this.totalEnemiesThisWave    = waveDef.totalEnemies;
    this.currentWaveLabel        = `Wave ${this.currentWave} / ${this.waves.length}`;
  }

  /**
   * Build a flat timed spawn list by drawing randomly from the wave's pool.
   *
   * Each entry is spaced `waveDef.spawnInterval` ms apart and assigned a
   * random lane.
   *
   * @param {{ totalEnemies: number, spawnInterval: number,
   *            pool: { defKey: string, weight: number }[] }} waveDef
   * @returns {{ defKey: string, laneIndex: number, spawnAt: number }[]}
   */
  _buildRandomQueue(waveDef) {
    const queue = [];
    let   t     = 0;   // running spawn timestamp (ms)
    let   i     = 0;   // enemies scheduled so far

    while (i < waveDef.totalEnemies) {
      // ── PVZ-style burst decision ──────────────────────────────────────────
      // ~25% chance of a small burst (2–4 enemies) at the same timestamp,
      // simulating the PVZ "flag" rushes.  The burst can't exceed what's left.
      const roll      = Math.random();
      const burstSize = (roll < 0.25)
        ? Math.min(2 + Math.floor(Math.random() * 3), waveDef.totalEnemies - i)
        : 1;

      // Spread burst members 150 ms apart on different lanes
      for (let b = 0; b < burstSize; b++) {
        const defKey    = this._drawFromPool(waveDef.pool);
        const laneIndex = Math.floor(Math.random() * CONFIG.ROWS);
        queue.push({ defKey, laneIndex, spawnAt: t + b * 150 });
        i++;
      }

      // Advance time by the wave's base interval after each spawn group
      t += waveDef.spawnInterval;
    }

    // Sort chronologically in case burst offsets created out-of-order entries
    queue.sort((a, b) => a.spawnAt - b.spawnAt);
    return queue;
  }

  /**
   * Weighted random selection from a pool entry array.
   *
   * Each entry must have a `weight` (higher = more likely) and a `defKey`.
   *
   * @param {{ defKey: string, weight: number }[]} pool
   * @returns {string}  The selected enemy definition key.
   */
  _drawFromPool(pool) {
    // Sum all weights to find the upper bound of the random roll
    const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let roll          = Math.random() * totalWeight;

    // Walk the pool, subtracting weights until the roll is exhausted
    for (const entry of pool) {
      roll -= entry.weight;
      if (roll <= 0) return entry.defKey;
    }

    // Fallback in case of floating-point edge case
    return pool[pool.length - 1].defKey;
  }

  /**
   * Returns true once the last wave's spawn queue is empty and all waves
   * have been processed.
   *
   * @returns {boolean}
   */
  allWavesCleared() {
    return this.isComplete && this.spawnQueue.length === 0;
  }

  /**
   * Called every game tick.  Handles between-wave countdown and spawning
   * enemies from the current wave's queue.
   *
   * @param {number} deltaTime  Seconds since last tick.
   * @param {Game}   game       Reference to the main game object.
   */
  update(deltaTime, game) {
    if (this.isComplete) return;

    // ── Between-wave countdown ────────────────────────────────────────────
    if (this._waitingNext) {
      this._betweenTimer -= deltaTime * 1000;
      if (this._betweenTimer <= 0) this.startNextWave();
      return;
    }

    this._elapsed += deltaTime * 1000;

    const hasLivingEnemies = game.enemies.some(e => !e.isDead());

    // PVZ-style time-based spawning — spawn whenever the clock reaches the
    // scheduled time, regardless of whether earlier enemies are still alive.
    // Drain all entries whose spawnAt has been reached this tick.
    while (this.spawnQueue.length > 0 &&
           this.spawnQueue[0].spawnAt <= this._elapsed) {
      const entry = this.spawnQueue.shift();
      const enemy = this._spawnEnemy(entry, game);
      game.enemies.push(enemy);
    }

    // All enemies spawned and killed — either end or wait for next wave
    if (this.spawnQueue.length === 0 && !hasLivingEnemies) {
      if (this.currentWave >= this.waves.length) {
        this.isComplete       = true;
        this.currentWaveLabel = 'All waves cleared!';
      } else {
        this._waitingNext  = true;
        this._betweenTimer = this._betweenDelay;
      }
    }
  }

  /**
   * Instantiate an `Enemy` from a spawn-queue entry.
   *
   * Resolves all sprites (idle, attack, and optional boss extras) from the
   * preloaded sprite map and positions the enemy just off the right edge
   * of the canvas.
   *
   * @param {{ defKey: string, laneIndex: number }} entry
   * @param {Game} game
   * @returns {Enemy}
   */
  _spawnEnemy(entry, game) {
    const config = ENEMY_DEFS[entry.defKey];
    if (!config) throw new Error(`WaveManager: unknown enemy key "${entry.defKey}"`);

    // Standard sprite lookup (idle + attack)
    const sprites = {
      idle:   this._sprites[config.idleSprite]   ?? null,
      attack: this._sprites[config.attackSprite] ?? null,
    };

    // Boss extra sprites (Jozsi: separate melee and raven-projectile sheets)
    if (config.meleeSprite) sprites.melee = this._sprites[config.meleeSprite] ?? null;
    if (config.ravenSprite) sprites.raven = this._sprites[config.ravenSprite] ?? null;

    return new Enemy({
      config,
      x:         CONFIG.CANVAS_WIDTH + CONFIG.SPAWN_X_OFFSET,
      y:         CONFIG.LANE_Y(entry.laneIndex),
      laneIndex: entry.laneIndex,
      sprites,
      game,
    });
  }
}
