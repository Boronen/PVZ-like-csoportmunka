import { CONFIG }          from './utils/CONFIG.js';
import { Effect }          from './Effect.js';
import { Projectile }      from './Projectile.js';
import { createAnim, advanceFrame, resetAnim } from './utils/Animator.js';
import { drawSpriteFrame } from './utils/drawFrame.js';
import { SoundPlayer }     from './utils/SoundPlayer.js';

// Single concrete enemy class — all type differences live in config.
export class Enemy {
  /**
   * @param {{ config: object, x: number, y: number, laneIndex: number,
   *            sprites: { idle: HTMLImageElement, attack: HTMLImageElement,
   *                       melee?: HTMLImageElement, raven?: HTMLImageElement },
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

    this._sprites      = sprites;   // { idle, attack, melee?, raven? }
    this._game         = game;
    this.effects       = [];

    // Animation state
    this._animState = 'idle';
    // Shared anim-state object — mutated in place by advanceFrame()
    this._anim      = createAnim(CONFIG.ENEMY_ANIM_FPS);

    // Attack timing
    this._attackTimer = 0;
    this._dead        = false;
    this._target      = null;

    // Sound subsystem — encapsulates the per-key Audio cache and throttle logic
    this._sfx = new SoundPlayer(config.sounds ?? {});

    // Movement-sound throttle timer (seconds since last move-sound played)
    this._moveSoundTimer = 0;

    // Play spawn sound once if defined
    if (config.sounds?.spawn) {
      this._sfx.play('spawn', 0.65);
    }
  }

  update(deltaTime, units, player) {
    if (this._dead) return;

    this._lastUnits = units;
    this._tickEffects(deltaTime);

    this._target = this._findTarget(units);

    // ── Boss (Jozsi) behaviour switching ─────────────────────────────────────
    if (this.config.isBoss && this._target) {
      const dx         = this.x - this._target.x;
      const dist       = Math.abs(dx);
      const meleeRange = 90;

      if (dist <= meleeRange) {
        // Close enough for melee — stop moving, swing
        this._bossMode = 'melee';
        this._updateAnimState('melee');
        this._handleAttackWithMode(deltaTime, player, 'melee');
      } else {
        // Out of melee range — use ranged attack while closing in
        this._bossMode = 'ranged';
        this._updateAnimState('attack');
        this._handleAttackWithMode(deltaTime, player, 'ranged');
        this.move(deltaTime);
      }
    } else if (this._target) {
      this._handleAttack(deltaTime, player);
      if (this.config.onAttack === 'melee') {
        this._updateAnimState('attack');
      } else {
        this._updateAnimState('attack');
        this.move(deltaTime);
      }
    } else {
      this._bossMode = null;
      this._updateAnimState('idle');
      this.move(deltaTime);
    }

    // Movement sound — throttled to once every 1.2 s while the enemy is walking
    if (this._animState === 'idle' && this._sfx.has('move')) {
      this._moveSoundTimer += deltaTime;
      if (this._moveSoundTimer >= 1.2) {
        this._moveSoundTimer = 0;
        this._sfx.play('move', 0.35);
      }
    } else {
      this._moveSoundTimer = 0;
    }

    advanceFrame(this._anim, this._currentLayout());

    if (this.isAtBase()) {
      player.takeDamage(this.config.damage);
      this._dead = true;
    }
  }

  move(deltaTime) {
    if (this._isBlockedBy(this._lastUnits)) return;
    this.x -= this.movementSpeed * deltaTime;
  }

  _isBlockedBy(units) {
    if (!units) return false;
    const bodyRadius = CONFIG.CELL_SIZE * 0.55;
    for (const unit of units) {
      if (unit.isDead()) continue;
      if (unit.laneIndex !== this.laneIndex) continue;
      const dx = this.x - unit.x;
      if (dx >= 0 && dx <= bodyRadius) return true;
    }
    return false;
  }

  _findTarget(units) {
    let closest     = null;
    let closestDist = Infinity;
    for (const unit of units) {
      if (unit.isDead()) continue;
      if (unit.laneIndex !== this.laneIndex) continue;
      const dx   = this.x - unit.x;
      const dist = Math.abs(dx);
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

  // Boss-specific attack handler — picks melee or ranged based on current mode
  _handleAttackWithMode(deltaTime, player, mode) {
    this._attackTimer += deltaTime;
    const interval = 1 / this.config.attackSpeed;
    if (this._attackTimer >= interval) {
      this._attackTimer = 0;
      if (mode === 'melee') {
        // Deal direct damage and play melee SFX (auto-stopped after 2 s)
        if (this._target && !this._target.isDead()) {
          this._target.takeDamage(this.config.damage);
          this._sfx.playLimited('melee', 0.7, 2000);
        }
      } else {
        // Ranged — launch a raven projectile and play ranged SFX
        this._fireRavenProjectile();
        this._sfx.playLimited('ranged', 0.6, 2000);
      }
    }
  }

  attack(target, player) {
    if (!target || target.isDead()) return;
    if (this.config.onAttack === 'projectile') {
      this._fireProjectile();
    } else {
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
      direction:  -1,
      effectConfig: this.config.effectOnHit ?? null,
      targets:    this._game.units,
    });
    this._game.projectiles.push(proj);
  }

  // Jozsi's raven projectile — uses the raven sprite sheet if available
  _fireRavenProjectile() {
    if (!this._game) return;
    const ravenSprite = this._sprites.raven  ?? null;
    const ravenFrames = this.config.ravenFrames ?? null;
    const proj = new Projectile({
      x:          this.x - CONFIG.CELL_SIZE / 2,
      y:          this.y,
      laneIndex:  this.laneIndex,
      speed:      CONFIG.PROJECTILE_SPEED * 0.8,
      damage:     this.config.damage,
      direction:  -1,
      effectConfig: null,
      targets:    this._game.units,
      sprite:     ravenSprite,
      frameLayout: ravenFrames,
      animFps:    10,
    });
    this._game.projectiles.push(proj);
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) this._dead = true;
  }

  addEffect(effect) { this.effects.push(effect); }

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
      this._animState = desired;
      resetAnim(this._anim);
    }
  }

  _currentLayout() {
    if (this._animState === 'melee' && this.config.meleeFrames) {
      return this.config.meleeFrames;
    }
    return this._animState === 'attack'
      ? this.config.attackFrames
      : this.config.idleFrames;
  }

  _currentSprite() {
    if (this._animState === 'melee' && this._sprites.melee) {
      return this._sprites.melee;
    }
    return this._animState === 'attack'
      ? this._sprites.attack
      : this._sprites.idle;
  }

  draw(ctx) {
    if (this._dead) return;

    this._drawShadow(ctx);

    // ── Individual-frame mode (Bringer of Death, etc.) ────────────────────────
    if (this.config.useIndividualFrames) {
      this._drawIndividualFrame(ctx);
      this._drawHealthBar(ctx);
      return;
    }

    const layout = this._currentLayout();
    const sprite = this._currentSprite();

    if (sprite) {
      drawSpriteFrame(
        ctx, sprite, layout, this._anim.frameIndex,
        this.x, this.y,
        this.config.drawSize   ?? CONFIG.CELL_SIZE,
        this.config.drawOffsetX ?? 0,
        this.config.drawOffsetY ?? 0,
        this.config.flipX       ?? false,
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

  /**
   * Individual-frame rendering (e.g. Bringer of Death).
   * Each PNG is scaled to fit config.drawSize, preserving aspect ratio.
   */
  _drawIndividualFrame(ctx) {
    const files = (this._animState === 'attack')
      ? this.config.attackFrameFiles
      : this.config.idleFrameFiles;
    if (!files || files.length === 0) { this._drawFallback(ctx); return; }

    const key = files[this._anim.frameIndex % files.length];
    const img = this._game?._sprites?.[key] ?? null;

    if (img) {
      const target = this.config.drawSize ?? CONFIG.CELL_SIZE;
      const scale  = Math.min(target / img.width, target / img.height);
      const drawW  = img.width  * scale;
      const drawH  = img.height * scale;
      ctx.drawImage(img, this.x - drawW / 2, this.y - drawH / 2, drawW, drawH);
    } else {
      this._drawFallback(ctx);
    }
  }

  _drawFallback(ctx) {
    ctx.save();
    ctx.fillStyle = this._animState === 'attack' ? '#e53935' : '#9c27b0';
    ctx.fillRect(this.x - 24, this.y - 24, 48, 48);
    ctx.fillStyle   = '#fff';
    ctx.font        = '10px sans-serif';
    ctx.textAlign   = 'center';
    ctx.fillText(this.config.label ?? 'E', this.x, this.y + 4);
    ctx.restore();
  }

  _drawHealthBar(ctx) {
    const barW  = 48;
    const barH  = 5;
    const bx    = this.x - barW / 2;
    // Clamp the bar to stay inside the game area.
    // Use at most 36 px below centre so large bosses (Jozsi drawSize=320)
    // don't push the bar off the bottom of the canvas.
    const halfClamped = Math.min((this.config.drawSize ?? CONFIG.CELL_SIZE) / 2, 36);
    const rawBy = this.y + halfClamped + 3;
    const by    = Math.min(rawBy, CONFIG.GAME_AREA_HEIGHT - barH - 4);
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
