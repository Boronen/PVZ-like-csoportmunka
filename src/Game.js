import { CONFIG }       from './utils/CONFIG.js';
import { EventEmitter } from './utils/EventEmitter.js';
import { SpriteLoader } from './utils/SpriteLoader.js';
import { Grid }         from './Grid.js';
import { Player }       from './Player.js';
import { Unit }         from './Unit.js';
import { WaveManager }  from './WaveManager.js';
import { UI }           from './ui/UI.js';
import { UNIT_DEFS }    from './data/unitDefs.js';
import { ENEMY_DEFS }   from './data/enemyDefs.js';
import { WAVES }        from './data/waves.js';

// Main controller — owns all subsystems and drives the game loop.
export class Game {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ faction?: string }} opts
   *   faction — which enemy faction to use: 'undead' | 'egypt' | 'legacy'
   *             Defaults to 'undead' if omitted.
   */
  constructor(canvas, { faction = 'undead' } = {}) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    canvas.width  = CONFIG.CANVAS_WIDTH;
    canvas.height = CONFIG.CANVAS_HEIGHT;

    this.faction = faction;

    // Filter waves to the chosen faction
    const factionWaves = WAVES.filter(w => w.faction === faction);

    this.grid        = new Grid(CONFIG.COLS, CONFIG.ROWS, CONFIG.CELL_SIZE);
    this.player      = new Player();
    this.waveManager = new WaveManager(factionWaves);
    this.ui          = new UI();
    this.events      = new EventEmitter();
    this._loader     = new SpriteLoader();

    this.enemies     = [];
    this.units       = [];
    this.projectiles = [];

    this.state     = 'idle';
    this.lastTime  = 0;
    this.timeScale = 1.0;   // multiplied onto deltaTime — set by settings slider
    this._sprites = {};
    this._bgImage     = null;
    this._stoneFloor  = null;
    this._treeMain    = null;

    this._overlay = document.getElementById('overlay');

    this._setupSlots();
    this._bindEvents();
  }

  _setupSlots() {
    const defs = Object.values(UNIT_DEFS);
    for (let i = 0; i < Math.min(defs.length, this.player.slots.length); i++) {
      this.player.slots[i] = defs[i];
    }
  }

  // ── Preload ──────────────────────────────────────────────────────────────

  async preload() {
    const allSrcs = this._collectPreloadSrcs();

    this._sprites = await this._loader.loadAll(allSrcs)
      .catch(() => {
        // Fallback: retry with just unit + enemy sprites, skipping map assets
        const unitSrcs  = Object.values(UNIT_DEFS).flatMap(d => [d.idleSprite, d.attackSprite]);
        const enemySrcs = this._collectEnemySrcs();
        return this._loader.loadAll([...unitSrcs, ...enemySrcs]);
      });

    this._bgImage    = this._sprites['assets/background.jpg']      ?? null;
    this._stoneFloor = this._sprites['assets/map/Stone_floor.jpg'] ?? null;
    this._treeMain   = this._sprites['assets/map/Tree_main.png']   ?? null;

    this.grid.stoneFloorImg = this._stoneFloor;
    this.waveManager.setSprites(this._sprites);
  }

  /**
   * Build a deduplicated array of every asset path that needs to be loaded
   * before the game can start.
   *
   * @returns {string[]}  Unique, non-empty asset paths.
   */
  _collectPreloadSrcs() {
    // Ally unit sprites (idle + attack sheets)
    const unitSprites = Object.values(UNIT_DEFS)
      .flatMap(d => [d.idleSprite, d.attackSprite]);

    // Optional per-unit projectile sprite sheets
    const unitProjectileSprites = Object.values(UNIT_DEFS)
      .filter(d => d.projectileSprite)
      .map(d => d.projectileSprite);

    // Enemy sprites — restricted to the active faction + legacy fallback
    const enemySprites = this._collectEnemySrcs();

    // Static map assets
    const mapSprites = ['assets/map/Stone_floor.jpg', 'assets/map/Tree_main.png'];
    const bgSprite   = 'assets/background.jpg';

    // Flatten, deduplicate, and strip falsy values
    return [...new Set([
      ...unitSprites,
      ...unitProjectileSprites,
      ...enemySprites,
      ...mapSprites,
      bgSprite,
    ].filter(Boolean))];
  }

  /**
   * Collect all sprite paths for enemies belonging to the current faction
   * plus any 'legacy' faction entries.
   *
   * @returns {string[]}
   */
  _collectEnemySrcs() {
    return Object.values(ENEMY_DEFS)
      .filter(d => d.faction === this.faction || d.faction === 'legacy')
      .flatMap(d => {
        const srcs = [d.idleSprite, d.attackSprite];
        if (d.meleeSprite) srcs.push(d.meleeSprite);
        if (d.ravenSprite) srcs.push(d.ravenSprite);
        // Individual frame files (Bringer of Death, etc.)
        if (d.useIndividualFrames) {
          if (d.idleFrameFiles)   srcs.push(...d.idleFrameFiles);
          if (d.attackFrameFiles) srcs.push(...d.attackFrameFiles);
        }
        return srcs;
      });
  }

  // ── Game lifecycle ───────────────────────────────────────────────────────

  start() {
    if (this.state === 'running') return;
    this.state    = 'running';
    this.lastTime = performance.now();
    this.waveManager.startNextWave();
    requestAnimationFrame(ts => this.gameLoop(ts));
  }

  pause() {
    if (this.state !== 'running') return;
    this.state = 'paused';
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state    = 'running';
    this.lastTime = performance.now();
    requestAnimationFrame(ts => this.gameLoop(ts));
  }

  gameLoop(timestamp) {
    if (this.state !== 'running') return;

    const rawDelta  = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    const deltaTime = rawDelta * this.timeScale;
    this.lastTime   = timestamp;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame(ts => this.gameLoop(ts));
  }

  // ── Update ───────────────────────────────────────────────────────────────

  update(deltaTime) {
    this.player.update(deltaTime);
    this._tickPassiveIncome(deltaTime);
    this.waveManager.update(deltaTime, this);

    for (const enemy of this.enemies) {
      enemy.update(deltaTime, this.units, this.player);
    }
    for (const unit of this.units) {
      unit.update(deltaTime, this.enemies, this);
    }
    for (const proj of this.projectiles) {
      proj.update(deltaTime);
    }

    this._cleanup();
    this.checkGameOver();
  }

  _tickPassiveIncome(deltaTime) {
    this.player.earnMoney(5 * deltaTime);
  }

  _cleanup() {
    this.enemies = this.enemies.filter(e => {
      if (e.isDead()) { this.handleEnemyDeath(e); return false; }
      return true;
    });
    this.units = this.units.filter(u => {
      if (u.isDead()) { this.removeUnit(u); return false; }
      return true;
    });
    this.projectiles = this.projectiles.filter(p => !p.isDone());
  }

  handleEnemyDeath(enemy) {
    if (enemy.hp <= 0 && !enemy.isAtBase()) {
      this.player.earnMoney(enemy.config.reward);
    }
    // Track for PVZ progress bar
    if (this.waveManager.enemiesDefeatedThisWave !== undefined) {
      this.waveManager.enemiesDefeatedThisWave++;
    }
    this.events.emit('enemyDied', enemy);
  }

  removeUnit(unit) {
    this.grid.remove(unit.col, unit.row);
    this.events.emit('unitDied', unit);
  }

  checkGameOver() {
    if (!this.player.isAlive()) {
      this._setGameState('lose');
      return;
    }
    if (this.waveManager.allWavesCleared() && this.enemies.length === 0) {
      this._setGameState('win');
    }
  }

  _setGameState(result) {
    this.state = result;
    if (this._overlay) {
      this._overlay.textContent = result === 'win' ? '🏆 You Win!' : '💀 Game Over';
      this._overlay.className   = `visible ${result}`;
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  render() {
    const { ctx } = this;
    ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.GAME_AREA_HEIGHT);

    if (this._bgImage) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.drawImage(this._bgImage, 0, 0, CONFIG.CANVAS_WIDTH, CONFIG.GAME_AREA_HEIGHT);
      ctx.restore();
    }

    this.grid.draw(ctx);
    this._drawDefenseTree(ctx);

    for (const unit  of this.units)       unit.draw(ctx);
    for (const enemy of this.enemies)     enemy.draw(ctx);
    for (const proj  of this.projectiles) proj.draw(ctx);

    this.ui.draw(ctx, this.player, this.waveManager);

    if (this.state === 'paused') this._drawPauseOverlay(ctx);
  }

  _drawDefenseTree(ctx) {
    const cs = CONFIG.CELL_SIZE;
    const treeW = cs * 1.6;
    const treeH = CONFIG.GAME_AREA_HEIGHT * 0.92;
    const tx    = cs * 0.5 - treeW / 2;
    const ty    = CONFIG.GAME_AREA_HEIGHT - treeH;

    ctx.save();
    if (this._treeMain) {
      ctx.drawImage(this._treeMain, tx, ty, treeW, treeH);
    } else {
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(tx + treeW * 0.38, ty + treeH * 0.55, treeW * 0.24, treeH * 0.45);
      ctx.fillStyle = '#2e7d32';
      ctx.beginPath();
      ctx.arc(tx + treeW / 2, ty + treeH * 0.38, treeW * 0.48, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#388e3c';
      ctx.beginPath();
      ctx.arc(tx + treeW / 2, ty + treeH * 0.22, treeW * 0.36, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font      = 'bold 9px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur  = 3;
    ctx.fillText('DEFEND', cs * 0.5, CONFIG.GAME_AREA_HEIGHT - 4);
    ctx.restore();
  }

  _drawPauseOverlay(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.GAME_AREA_HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⏸ PAUSED', CONFIG.CANVAS_WIDTH / 2, CONFIG.GAME_AREA_HEIGHT / 2);
    ctx.restore();
  }

  // ── Input ────────────────────────────────────────────────────────────────

  _bindEvents() {
    this.canvas.addEventListener('click', e => this._handleCanvasClick(e));

    // Touch support — reuse the same click handler by constructing a
    // compatible synthetic event object from the first changed touch.
    this.canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      this._handleCanvasClick({ clientX: touch.clientX, clientY: touch.clientY });
    }, { passive: false });

    window.addEventListener('keydown', e => this._handleKey(e));
  }

  _handleCanvasClick(e) {
    if (this.state !== 'running') return;

    const rect   = this.canvas.getBoundingClientRect();
    const scaleX = CONFIG.CANVAS_WIDTH  / rect.width;
    const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
    const mouseX = (e.clientX - rect.left)  * scaleX;
    const mouseY = (e.clientY - rect.top)   * scaleY;

    if (mouseY >= CONFIG.GAME_AREA_HEIGHT) {
      const slotIdx = this.ui.handleClick(mouseX, mouseY);
      if (slotIdx !== -1) this.player.selectSlot(slotIdx);
      return;
    }

    this._tryPlaceUnit(mouseX, mouseY);
  }

  _tryPlaceUnit(mouseX, mouseY) {
    const result = this.player.placeUnit(mouseX, mouseY, this.grid, this);
    if (!result) return;

    const { config, worldX, worldY, col, row } = result;

    // Resolve sprites — idleSprite and attackSprite may be the same sheet
    const sprites = {
      idle:   this._sprites[config.idleSprite]   ?? null,
      attack: this._sprites[config.attackSprite] ?? null,
    };

    // Resolve optional projectile sprite
    const projSprite = config.projectileSprite
      ? (this._sprites[config.projectileSprite] ?? null)
      : null;

    const unit = new Unit({
      config, x: worldX, y: worldY, col, row,
      laneIndex: row, sprites,
      projectileSprite: projSprite,
      game: this,
    });

    this.grid.place(col, row, unit);
    this.units.push(unit);
    this.events.emit('unitPlaced', unit);
  }

  _handleKey(e) {
    if (e.key === 'p' || e.key === 'P') {
      this.state === 'running' ? this.pause() : this.resume();
    }
    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= 6 && this.state === 'running') {
      this.player.selectSlot(num - 1);
    }
  }
}
