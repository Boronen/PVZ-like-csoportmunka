import { CONFIG }     from './utils/CONFIG.js';
import { Projectile } from './Projectile.js';

// Single concrete ally unit class — all type differences live in config.
export class Unit {
  /**
   * @param {{ config, x, y, col, row, laneIndex,
   *            sprites: { idle, attack }, game }} opts
   */
  constructor({ config, x, y, col, row, laneIndex, sprites, game }) {
    this.config     = config;
    this.x          = x;
    this.y          = y;
    this.col        = col;
    this.row        = row;
    this.laneIndex  = laneIndex;

    this.hp         = config.hp;
    this.maxHp      = config.hp;

    this._sprites   = sprites;   // { idle, attack }
    this._game      = game;      // for pushing projectiles

    // Animation state
    this._animState     = 'idle';
    this._frameIndex    = 0;
    this._frameTimer    = 0;
    this._frameDuration = 1 / CONFIG.UNIT_ANIM_FPS;

    // Attack timing
    this._attackTimer = 0;
    this._dead        = false;
  }

  update(deltaTime, enemies, game) {
    if (this._dead) return;

    const target = this._findTarget(enemies);

    this._updateAnimState(target !== null);
    this._advanceFrame();

    this._attackTimer += deltaTime;
    const attackInterval = 1 / this.config.attackSpeed;

    if (target && this._attackTimer >= attackInterval) {
      this._attackTimer = 0;
      this.attack(target, game);
    }
  }

  // Find the nearest enemy in the same lane within range (enemy is to the right)
  _findTarget(enemies) {
    let closest     = null;
    let closestDist = Infinity;

    for (const enemy of enemies) {
      if (enemy.isDead()) continue;
      if (enemy.laneIndex !== this.laneIndex) continue;
      // dx > 0: enemy is to the right — approaching from the right
      const dx   = enemy.x - this.x;
      const dist = Math.abs(dx);
      if (dx >= -20 && dist <= this.config.range && dist < closestDist) {
        closestDist = dist;
        closest = enemy;
      }
    }

    return closest;
  }

  attack(enemy, game) {
    if (this.config.onAttack === 'melee') {
      enemy.takeDamage(this.config.damage);
    } else if (this.config.onAttack === 'projectile') {
      this._fireProjectile(game);
    }
  }

  _fireProjectile(game) {
    if (!game) return;
    const proj = new Projectile({
      x:            this.x + CONFIG.CELL_SIZE / 2,
      y:            this.y,
      laneIndex:    this.laneIndex,
      speed:        CONFIG.PROJECTILE_SPEED,
      damage:       this.config.damage,
      direction:    1,     // travels RIGHT toward enemies
      effectConfig: this.config.effectOnHit ?? null,
      targets:      game.enemies,
    });
    game.projectiles.push(proj);
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) this._dead = true;
  }

  isDead() { return this._dead; }

  _updateAnimState(hasTarget) {
    const desired = hasTarget ? 'attack' : 'idle';
    if (desired !== this._animState) {
      this._animState  = desired;
      this._frameIndex = 0;
      this._frameTimer = 0;
    }
  }

  _advanceFrame() {
    this._frameTimer += 1 / 60;
    if (this._frameTimer >= this._frameDuration) {
      this._frameTimer -= this._frameDuration;
      const layout = this._currentLayout();
      this._frameIndex = (this._frameIndex + 1) % layout.total;
    }
  }

  _currentLayout() {
    return this._animState === 'attack'
      ? this.config.attackFrames
      : this.config.idleFrames;
  }

  draw(ctx) {
    if (this._dead) return;

    const layout = this._currentLayout();
    const sprite = this._animState === 'attack'
      ? this._sprites.attack
      : this._sprites.idle;

    if (sprite) {
      this._drawFrame(ctx, sprite, layout);
    } else {
      this._drawFallback(ctx);
    }

    this._drawHealthBar(ctx);
  }

  _drawFrame(ctx, sprite, layout) {
    const fw = sprite.width  / layout.cols;
    const fh = sprite.height / layout.rows;
    const col = this._frameIndex % layout.cols;
    const row = Math.floor(this._frameIndex / layout.cols);

    const drawW = CONFIG.CELL_SIZE;
    const drawH = CONFIG.CELL_SIZE;

    ctx.drawImage(
      sprite,
      col * fw, row * fh, fw, fh,
      this.x - drawW / 2, this.y - drawH / 2, drawW, drawH
    );
  }

  _drawFallback(ctx) {
    ctx.save();
    ctx.fillStyle = this._animState === 'attack' ? '#ff9800' : '#4caf50';
    ctx.fillRect(this.x - 24, this.y - 24, 48, 48);
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.config.label ?? 'U', this.x, this.y + 4);
    ctx.restore();
  }

  _drawHealthBar(ctx) {
    const barW  = 48;
    const barH  = 5;
    const bx    = this.x - barW / 2;
    const by    = this.y - CONFIG.CELL_SIZE / 2 - 8;
    const ratio = this.hp / this.maxHp;

    ctx.save();
    ctx.fillStyle = '#333';
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = ratio > 0.5 ? '#4caf50' : ratio > 0.25 ? '#ff9800' : '#f44336';
    ctx.fillRect(bx, by, barW * ratio, barH);
    ctx.restore();
  }
}
