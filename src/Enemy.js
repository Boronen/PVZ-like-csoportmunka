import { CONFIG }     from './utils/CONFIG.js';
import { Effect }     from './Effect.js';
import { Projectile } from './Projectile.js';

// ── Small audio helper ────────────────────────────────────────────────────────
// Plays a sound from a path string. Returns the Audio instance.
// Uses a tiny per-key cache so we don't create hundreds of objects.
const _audioCache = {};
function _playSound(src, volume = 0.6) {
  if (!src) return null;
  if (!_audioCache[src]) {
    _audioCache[src] = new Audio(src);
    _audioCache[src].volume = volume;
  }
  const a = _audioCache[src];
  a.currentTime = 0;
  a.play().catch(() => {});   // silent if autoplay blocked
  return a;
}

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
    this._animState     = 'idle';
    this._frameIndex    = 0;
    this._frameTimer    = 0;
    this._frameDuration = 1 / CONFIG.ENEMY_ANIM_FPS;

    // Attack timing
    this._attackTimer = 0;
    this._dead        = false;
    this._target      = null;

    // Sound state — throttle looping sounds
    this._moveSoundTimer  = 0;
    this._spawnSoundDone  = false;

    // Play spawn sound if defined
    if (config.sounds?.spawn) {
      _playSound(config.sounds.spawn, 0.65);
      this._spawnSoundDone = true;
    }
  }

  update(deltaTime, units, player) {
    if (this._dead) return;

    this._lastUnits = units;
    this._tickEffects(deltaTime);

    this._target = this._findTarget(units);

    // ── Boss (Jozsi) behaviour switching ─────────────────────────────────────
    if (this.config.isBoss && this._target) {
      const dx   = this.x - this._target.x;
      const dist = Math.abs(dx);
      const meleeRange = 90;

      if (dist <= meleeRange) {
        // Melee mode
        this._bossMode = 'melee';
        this._updateAnimState('melee');
        this._handleAttackWithMode(deltaTime, player, 'melee');
        // stop movement when in melee contact
      } else {
        // Ranged mode — keep walking
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

    // Movement sound (throttled — play every 1.2 s while moving)
    if (this._animState === 'idle' && this.config.sounds?.move) {
      this._moveSoundTimer += deltaTime;
      if (this._moveSoundTimer >= 1.2) {
        this._moveSoundTimer = 0;
        _playSound(this.config.sounds.move, 0.35);
      }
    } else {
      this._moveSoundTimer = 0;
    }

    this._advanceFrame();

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

  // Boss-specific attack handler — picks melee or ranged based on mode
  _handleAttackWithMode(deltaTime, player, mode) {
    this._attackTimer += deltaTime;
    const interval = 1 / this.config.attackSpeed;
    if (this._attackTimer >= interval) {
      this._attackTimer = 0;
      if (mode === 'melee') {
        if (this._target && !this._target.isDead()) {
          this._target.takeDamage(this.config.damage);
          if (this.config.sounds?.melee) {
            const snd = _playSound(this.config.sounds.melee, 0.7);
            // Stop after 2 s so it doesn't overlap the next attack cycle
            if (snd) setTimeout(() => { snd.pause(); snd.currentTime = 0; }, 2000);
          }
        }
      } else {
        // Ranged — fire raven projectile
        this._fireRavenProjectile();
        if (this.config.sounds?.ranged) {
          const snd = _playSound(this.config.sounds.ranged, 0.6);
          if (snd) setTimeout(() => { snd.pause(); snd.currentTime = 0; }, 2000);
        }
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
    const ravenSprite  = this._sprites.raven  ?? null;
    const ravenFrames  = this.config.ravenFrames ?? null;
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
   * The natural frame (fw × fh) is scaled proportionally to fit inside the
   * target box so large sprites (Jozsi 240×426) don't overflow and small
   * sprites aren't blown up.
   *
   * rowIndex override: when layout.rowIndex is defined that row is used
   * directly (Skeleton shared sheet).
   */
  _drawFrame(ctx, sprite, layout) {
    const cols = layout.cols ?? 1;
    const rows = layout.rows ?? 1;
    const fw   = sprite.width  / cols;
    const fh   = sprite.height / rows;

    const col = this._frameIndex % cols;
    const row = (layout.rowIndex !== undefined)
      ? layout.rowIndex
      : Math.floor(this._frameIndex / cols);

    const target  = this.config.drawSize   ?? CONFIG.CELL_SIZE;
    const offsetX = this.config.drawOffsetX ?? 0;
    const offsetY = this.config.drawOffsetY ?? 0;
    const flipX   = this.config.flipX       ?? false;
    const scale   = Math.min(target / fw, target / fh);
    const drawW   = fw * scale;
    const drawH   = fh * scale;

    const dx = this.x - drawW / 2 + offsetX;
    const dy = this.y - drawH / 2 + offsetY;

    if (flipX) {
      ctx.save();
      ctx.translate(this.x + offsetX, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, col * fw, row * fh, fw, fh,
        -drawW / 2, dy, drawW, drawH);
      ctx.restore();
    } else {
      ctx.drawImage(sprite, col * fw, row * fh, fw, fh, dx, dy, drawW, drawH);
    }
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

    const key = files[this._frameIndex % files.length];
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
    // Position bar below the sprite — use actual drawSize, not the fixed CELL_SIZE.
    // For large sprites (Jozsi drawSize=320) this prevents the bar being hidden
    // under the sprite body.
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
