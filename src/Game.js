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

  async preload() {
    const unitSrcs  = Object.values(UNIT_DEFS).flatMap(d => [d.idleSprite, d.attackSprite]);
    const enemySrcs = Object.values(ENEMY_DEFS).flatMap(d => [d.idleSprite, d.attackSprite]);
    const mapSrcs   = ['assets/map/Stone_floor.jpg', 'assets/map/Tree_main.png'];
    const bgSrc     = 'assets/background.jpg';

    this._sprites = await this._loader.loadAll([...unitSrcs, ...enemySrcs, ...mapSrcs, bgSrc])
      .catch(() => this._loader.loadAll([...unitSrcs, ...enemySrcs]));

    this._bgImage    = this._sprites['assets/background.jpg']      ?? null;
    this._stoneFloor = this._sprites['assets/map/Stone_floor.jpg'] ?? null;
    this._treeMain   = this._sprites['assets/map/Tree_main.png']   ?? null;

    // Pass stone floor to grid so it can tile it
    this.grid.stoneFloorImg = this._stoneFloor;

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

    // 2. Background image — subtle atmospheric overlay behind all game objects
    if (this._bgImage) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.drawImage(this._bgImage, 0, 0, CONFIG.CANVAS_WIDTH, CONFIG.GAME_AREA_HEIGHT);
      ctx.restore();
    }

    // 3. 3D-style tiled floor (stone + danger zone overlay) via Grid
    this.grid.draw(ctx);

    // 4. Big Tree at danger zone (col 0) — the object to defend
    this._drawDefenseTree(ctx);

    // 5. Game objects
    for (const unit  of this.units)       unit.draw(ctx);
    for (const enemy of this.enemies)     enemy.draw(ctx);
    for (const proj  of this.projectiles) proj.draw(ctx);

    // 6. HUD
    this.ui.draw(ctx, this.player, this.waveManager);

    if (this.state === 'paused') this._drawPauseOverlay(ctx);
  }

  /**
   * Draw the big Tree_main sprite centred in the danger column (col 0).
   * The tree is larger than one cell — it spans the full game-area height
   * and is anchored to the bottom of the game area so it looks "planted".
   */
  _drawDefenseTree(ctx) {
    const cs = CONFIG.CELL_SIZE;

    // Tree occupies col 0 horizontally; vertically fills the game area
    const treeW = cs * 1.6;
    const treeH = CONFIG.GAME_AREA_HEIGHT * 0.92;
    const tx    = cs * 0.5 - treeW / 2;           // centred in col 0
    const ty    = CONFIG.GAME_AREA_HEIGHT - treeH; // planted at bottom

    ctx.save();

    if (this._treeMain) {
      ctx.drawImage(this._treeMain, tx, ty, treeW, treeH);
    } else {
      // Fallback: draw a stylised tree shape
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

    // Label so it's always clear what is being defended
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
