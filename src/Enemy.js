import { CONFIG }     from './utils/CONFIG.js';
import { Effect }     from './Effect.js';
import { Projectile } from './Projectile.js';

// Single concrete enemy class — all type differences live in config.
export class Enemy {
  /**
   * @param {{ config: object, x: number, y: number, laneIndex: number,
   *            sprites: { idle: HTMLImageElement, attack: HTMLImageElement },
   *            game: Game }} opts
   */
  constructor({ config, x, y, laneIndex, sprites, game }) {
    this.config        = config;
    this.x             = x;
    this.y             = y;
    this.laneIndex     = laneIndex;

    this.hp            = config.hp;
    this.maxHp         = config.hp;
    this.movementSpeed = config.movementSpeed;

    this._sprites      = sprites;   // { idle, attack }
    this._game         = game;      // needed to push projectiles
    this.effects       = [];

    // Animation state
    this._animState     = 'idle';
    this._frameIndex    = 0;
    this._frameTimer    = 0;
    this._frameDuration = 1 / CONFIG.ENEMY_ANIM_FPS;

    // Attack timing
    this._attackTimer = 0;
    this._dead        = false;
    this._target      = null;
  }

  update(deltaTime, units, player) {
    if (this._dead) return;

    this._lastUnits = units;   // stored so move() can run collision without extra params
    this._tickEffects(deltaTime);

    this._target = this._findTarget(units);

    if (this._target) {
      this._handleAttack(deltaTime, player);

      if (this.config.onAttack === 'melee') {
        // Melee enemies stop and face their target
        this._updateAnimState('attack');
      } else {
        // Projectile enemies keep walking and shoot while moving
        this._updateAnimState('attack');
        this.move(deltaTime);
      }
    } else {
      this._updateAnimState('idle');
      this.move(deltaTime);
    }

    this._advanceFrame();

    if (this.isAtBase()) {
      player.takeDamage(this.config.damage);
      this._dead = true;
    }
  }

  move(deltaTime) {
    // Physical blocking: don't overlap a unit's body
    if (this._isBlockedBy(this._lastUnits)) return;
    this.x -= this.movementSpeed * deltaTime;
  }

  // True when a same-lane unit is close enough to physically block this enemy
  _isBlockedBy(units) {
    if (!units) return false;
    const bodyRadius = CONFIG.CELL_SIZE * 0.55;   // ~44px — half a cell
    for (const unit of units) {
      if (unit.isDead()) continue;
      if (unit.laneIndex !== this.laneIndex) continue;
      const dx = this.x - unit.x;
      // Unit is directly ahead (to the left) and within body radius
      if (dx >= 0 && dx <= bodyRadius) return true;
    }
    return false;
  }

  // Find the closest unit in the same lane that is within attack range.
  // A small forward tolerance (CELL_SIZE/2) prevents the enemy from walking
  // past a unit due to frame-timing before the target lock fires.
  _findTarget(units) {
    let closest     = null;
    let closestDist = Infinity;

    for (const unit of units) {
      if (unit.isDead()) continue;
      if (unit.laneIndex !== this.laneIndex) continue;
      // dx > 0: unit is to the LEFT of the enemy (in its path)
      const dx   = this.x - unit.x;
      const dist = Math.abs(dx);
      // Allow small negative dx so Slade locks on even if 1 frame late
      if (dx >= -(CONFIG.CELL_SIZE / 2) && dist <= this.config.range && dist < closestDist) {
        closestDist = dist;
        closest = unit;
      }
    }

    return closest;
  }

  _handleAttack(deltaTime, player) {
    this._attackTimer += deltaTime;
    const interval = 1 / this.config.attackSpeed;
    if (this._attackTimer >= interval) {
      this._attackTimer = 0;
      this.attack(this._target, player);
    }
  }

  attack(target, player) {
    if (!target || target.isDead()) return;

    if (this.config.onAttack === 'projectile') {
      this._fireProjectile();
    } else {
      // Melee: damage directly
      target.takeDamage(this.config.damage);
    }
  }

  _fireProjectile() {
    if (!this._game) return;
    const proj = new Projectile({
      x:          this.x - CONFIG.CELL_SIZE / 2,
      y:          this.y,
      laneIndex:  this.laneIndex,
      speed:      CONFIG.PROJECTILE_SPEED,
      damage:     this.config.damage,
      direction:  -1,          // travels LEFT toward units / base
      effectConfig: this.config.effectOnHit ?? null,
      targets:    this._game.units,
    });
    this._game.projectiles.push(proj);
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) this._dead = true;
  }

  addEffect(effect) {
    this.effects.push(effect);
  }

  _tickEffects(deltaTime) {
    for (const e of this.effects) e.update(deltaTime);
    this.effects = this.effects.filter(e => {
      if (e.isExpired()) { e.remove(); return false; }
      return true;
    });
  }

  isDead()   { return this._dead; }
  isAtBase() { return this.x < CONFIG.BASE_X; }

  _updateAnimState(desired) {
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

    this._drawShadow(ctx);

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

  /** Soft blob shadow on the floor beneath the enemy */
  _drawShadow(ctx) {
    const shadowY  = this.y + CONFIG.CELL_SIZE * 0.42;
    const shadowRX = CONFIG.CELL_SIZE * 0.30;
    const shadowRY = CONFIG.CELL_SIZE * 0.09;

    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.fillStyle   = '#000';
    ctx.beginPath();
    ctx.ellipse(this.x, shadowY, shadowRX, shadowRY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawFrame(ctx, sprite, layout) {
    const fw = sprite.width  / layout.cols;
    const fh = sprite.height / layout.rows;
    const col = this._frameIndex % layout.cols;
    const row = Math.floor(this._frameIndex / layout.cols);

    const drawW = CONFIG.CELL_SIZE;
    const drawH = CONFIG.CELL_SIZE;

    // The Slade sprite sheet already faces left — draw it straight.
    ctx.drawImage(
      sprite,
      col * fw, row * fh, fw, fh,
      this.x - drawW / 2, this.y - drawH / 2, drawW, drawH
    );
  }

  _drawFallback(ctx) {
    ctx.save();
    ctx.fillStyle = this._animState === 'attack' ? '#e53935' : '#9c27b0';
    ctx.fillRect(this.x - 24, this.y - 24, 48, 48);
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.config.label ?? 'E', this.x, this.y + 4);
    ctx.restore();
  }

  _drawHealthBar(ctx) {
    const barW  = 48;
    const barH  = 5;
    const bx    = this.x - barW / 2;
    // Place the bar a few pixels BELOW the bottom edge of the sprite
    const by    = this.y + CONFIG.CELL_SIZE / 2 + 3;
    const ratio = this.hp / this.maxHp;

    ctx.save();
    // Dark background track for visibility
    ctx.fillStyle = '#222';
    ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
    ctx.fillStyle = '#333';
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = ratio > 0.5 ? '#4caf50' : ratio > 0.25 ? '#ff9800' : '#f44336';
    ctx.fillRect(bx, by, barW * ratio, barH);
    ctx.restore();
  }
}
