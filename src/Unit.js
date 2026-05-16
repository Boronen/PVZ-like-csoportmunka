import { CONFIG }     from './utils/CONFIG.js';
import { Projectile } from './Projectile.js';

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

    this._animState     = 'idle';
    this._frameIndex    = 0;
    this._frameTimer    = 0;
    this._frameDuration = 1 / CONFIG.UNIT_ANIM_FPS;

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

  /**
   * Draw a single animation frame, scaled to fit config.drawSize.
   *
   * Each unit definition can specify a drawSize (px) which acts as the
   * bounding box.  The natural frame (fw × fh) is scaled down proportionally
   * so it fits inside that box without distortion.  This handles sprites whose
   * source artwork varies wildly in pixel dimensions (e.g. Wizard 231×190 vs
   * Goblin 48×48).
   *
   * rowIndex override: when layout.rowIndex is defined, that row is used
   * directly (needed for multi-row shared spritesheets like Arcana Archer).
   */
  _drawFrame(ctx, sprite, layout) {
    const cols = layout.cols ?? 1;
    const rows = layout.rows ?? 1;
    const fw   = sprite.width  / cols;   // natural frame width  (source px)
    const fh   = sprite.height / rows;   // natural frame height (source px)

    const col = this._frameIndex % cols;
    const row = (layout.rowIndex !== undefined)
      ? layout.rowIndex
      : Math.floor(this._frameIndex / cols);

    // Scale frame to fit within the target box while preserving aspect ratio
    const target = this.config.drawSize ?? CONFIG.CELL_SIZE;
    const scale  = Math.min(target / fw, target / fh);
    const drawW  = fw * scale;
    const drawH  = fh * scale;

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
    const by    = this.y + CONFIG.CELL_SIZE / 2 + 3;
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
