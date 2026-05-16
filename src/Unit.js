import { CONFIG }          from './utils/CONFIG.js';
import { Projectile }      from './Projectile.js';
import { createAnim, advanceFrame, resetAnim } from './utils/Animator.js';
import { drawSpriteFrame } from './utils/drawFrame.js';

// Single concrete ally unit class — all type differences live in config.
export class Unit {
  /**
   * @param {{ config, x, y, col, row, laneIndex,
   *            sprites: { idle, attack },
   *            projectileSprite?: HTMLImageElement,
   *            game }} opts
   */
  constructor({ config, x, y, col, row, laneIndex, sprites,
                projectileSprite = null, game }) {
    this.config     = config;
    this.x          = x;
    this.y          = y;
    this.col        = col;
    this.row        = row;
    this.laneIndex  = laneIndex;

    this.hp         = config.hp;
    this.maxHp      = config.hp;

    this._sprites          = sprites;
    this._projectileSprite = projectileSprite;
    this._game             = game;

    this._animState = 'idle';
    // Shared anim-state object — mutated in place by advanceFrame()
    this._anim      = createAnim(CONFIG.UNIT_ANIM_FPS);

    this._attackTimer = 0;
    this._dead        = false;
  }

  update(deltaTime, enemies, game) {
    if (this._dead) return;

    const target = this._findTarget(enemies);
    this._updateAnimState(target !== null);
    advanceFrame(this._anim, this._currentLayout());

    this._attackTimer += deltaTime;
    const attackInterval = 1 / this.config.attackSpeed;
    if (target && this._attackTimer >= attackInterval) {
      this._attackTimer = 0;
      this.attack(target, game);
    }
  }

  _findTarget(enemies) {
    let closest     = null;
    let closestDist = Infinity;
    for (const enemy of enemies) {
      if (enemy.isDead()) continue;
      if (enemy.laneIndex !== this.laneIndex) continue;
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
    const projSprite = this._projectileSprite ?? null;
    const projFrames = this.config.projectileFrames ?? null;
    const projScale  = this.config.projectileScale  ?? 1.0;
    const proj = new Projectile({
      x:           this.x + CONFIG.CELL_SIZE / 2,
      y:           this.y,
      laneIndex:   this.laneIndex,
      speed:       CONFIG.PROJECTILE_SPEED,
      damage:      this.config.damage,
      direction:   1,
      effectConfig: this.config.effectOnHit ?? null,
      targets:     game.enemies,
      sprite:      projSprite,
      frameLayout: projFrames,
      animFps:     12,
      spriteScale: projScale,
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
      this._animState = desired;
      resetAnim(this._anim);
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
      // Unit configs don't use flipX or draw offsets — pass defaults
      drawSpriteFrame(
        ctx, sprite, layout, this._anim.frameIndex,
        this.x, this.y,
        this.config.drawSize ?? CONFIG.CELL_SIZE,
      );
    } else {
      this._drawFallback(ctx);
    }
    this._drawHealthBar(ctx);
  }

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

  _drawFallback(ctx) {
    ctx.save();
    ctx.fillStyle = this._animState === 'attack' ? '#ff9800' : '#4caf50';
    ctx.fillRect(this.x - 24, this.y - 24, 48, 48);
    ctx.fillStyle   = '#fff';
    ctx.font        = '10px sans-serif';
    ctx.textAlign   = 'center';
    ctx.fillText(this.config.label ?? 'U', this.x, this.y + 4);
    ctx.restore();
  }

  _drawHealthBar(ctx) {
    const barW  = 48;
    const barH  = 5;
    const bx    = this.x - barW / 2;
    // Use actual drawSize so bar clears the sprite body for large units (Wizard 125px etc.)
    const half  = (this.config.drawSize ?? CONFIG.CELL_SIZE) / 2;
    const by    = this.y + half + 3;
    const ratio = this.hp / this.maxHp;
    ctx.save();
    ctx.fillStyle = '#222';
    ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
    ctx.fillStyle = '#333';
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = ratio > 0.5 ? '#4caf50' : ratio > 0.25 ? '#ff9800' : '#f44336';
    ctx.fillRect(bx, by, barW * ratio, barH);
    ctx.restore();
  }
}
