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
  constructor(canvas) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    canvas.width  = CONFIG.CANVAS_WIDTH;
    canvas.height = CONFIG.CANVAS_HEIGHT;

    this.grid        = new Grid(CONFIG.COLS, CONFIG.ROWS, CONFIG.CELL_SIZE);
    this.player      = new Player();
    this.waveManager = new WaveManager(WAVES);
    this.ui          = new UI();
    this.events      = new EventEmitter();
    this._loader     = new SpriteLoader();

    this.enemies     = [];
    this.units       = [];
    this.projectiles = [];

    this.state    = 'idle';
    this.lastTime = 0;
    this._sprites = {};
    this._bgImage = null;

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

  async preload() {
    const unitSrcs  = Object.values(UNIT_DEFS).flatMap(d => [d.idleSprite, d.attackSprite]);
    const enemySrcs = Object.values(ENEMY_DEFS).flatMap(d => [d.idleSprite, d.attackSprite]);
    const bgSrc     = 'assets/background.jpg';

    this._sprites = await this._loader.loadAll([...unitSrcs, ...enemySrcs, bgSrc])
      .catch(() => this._loader.loadAll([...unitSrcs, ...enemySrcs]));

    this._bgImage = this._sprites['assets/background.jpg'] ?? null;
    this.waveManager.setSprites(this._sprites);
  }

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

    const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime   = timestamp;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame(ts => this.gameLoop(ts));
  }

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

  // Passively drip 5 money per second
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

  render() {
    const { ctx } = this;
    ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // 1. Solid dark ground as base layer
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.GAME_AREA_HEIGHT);

    // 2. Background image rendered as semi-transparent atmospheric overlay
    //    on top of the ground colour but BEHIND all game objects.
    if (this._bgImage) {
      ctx.save();
      ctx.globalAlpha = 0.35;   // subtle — doesn't obscure sprites
      ctx.drawImage(this._bgImage, 0, 0, CONFIG.CANVAS_WIDTH, CONFIG.GAME_AREA_HEIGHT);
      ctx.restore();
    }

    // 3. Grid lines
    this.grid.draw(ctx);

    // 4. Game objects
    for (const unit  of this.units)       unit.draw(ctx);
    for (const enemy of this.enemies)     enemy.draw(ctx);
    for (const proj  of this.projectiles) proj.draw(ctx);

    // 5. HUD
    this.ui.draw(ctx, this.player, this.waveManager);

    if (this.state === 'paused') this._drawPauseOverlay(ctx);
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
    window.addEventListener('keydown',   e => this._handleKey(e));
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
    const sprites = {
      idle:   this._sprites[config.idleSprite]   ?? null,
      attack: this._sprites[config.attackSprite] ?? null,
    };

    const unit = new Unit({
      config, x: worldX, y: worldY, col, row,
      laneIndex: row, sprites,
      game: this,   // pass game so Unit can fire projectiles
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
