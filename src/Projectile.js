import { CONFIG } from './utils/CONFIG.js';
import { Effect }  from './Effect.js';

// A travelling attack object — spawned by both units (rightward) and enemies (leftward).
export class Projectile {
  /**
   * @param {{ x, y, laneIndex, speed, damage, direction, effectConfig, targets,
   *            sprite?, frameLayout? }} opts
   *
   *   direction:   1 = travels right (unit shot toward enemies)
   *               -1 = travels left  (enemy shot toward player base / units)
   *   sprite:      optional HTMLImageElement for an animated projectile
   *   frameLayout: { cols, rows, total } — how to slice the sprite sheet
   *   animFps:     animation speed for the sprite (default 12)
   */
  constructor({ x, y, laneIndex, speed, damage, direction = 1,
                effectConfig, targets, sprite = null, frameLayout = null,
                animFps = 12, spriteScale = 1.0 }) {
    this.x            = x;
    this.y            = y;
    this.laneIndex    = laneIndex;
    this.speed        = speed ?? CONFIG.PROJECTILE_SPEED;
    this.damage       = damage;
    this.direction    = direction;
    this.effectConfig = effectConfig ?? null;
    this._targets     = targets;
    this._done        = false;
    this.radius       = 6;

    // Animated sprite support
    this._sprite      = sprite;
    this._layout      = frameLayout;
    this._spriteScale = spriteScale;
    this._frameIndex  = 0;
    this._frameTimer  = 0;
    this._frameDur    = animFps > 0 ? 1 / animFps : 1 / 12;
  }

  update(deltaTime) {
    this.x += this.direction * this.speed * deltaTime;

    // Advance sprite animation
    if (this._sprite && this._layout) {
      this._frameTimer += deltaTime;
      if (this._frameTimer >= this._frameDur) {
        this._frameTimer -= this._frameDur;
        this._frameIndex = (this._frameIndex + 1) % this._layout.total;
      }
    }

    // Out of canvas — discard
    if (this.x > CONFIG.CANVAS_WIDTH + 40 || this.x < -40) {
      this._done = true;
      return;
    }

    this._checkHit();
  }

  _checkHit() {
    for (const target of this._targets) {
      if (target.isDead()) continue;
      if (target.laneIndex !== this.laneIndex) continue;
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      if (Math.sqrt(dx * dx + dy * dy) < this.radius + 18) {
        target.takeDamage(this.damage);
        if (this.effectConfig && target.addEffect) {
          target.addEffect(new Effect({ target, ...this.effectConfig }));
        }
        this._done = true;
        return;
      }
    }
  }

  isDone() { return this._done; }

  draw(ctx) {
    if (this._sprite && this._layout) {
      this._drawSprite(ctx);
    } else {
      this._drawOrb(ctx);
    }
  }

  _drawSprite(ctx) {
    const layout = this._layout;
    const sprite = this._sprite;
    const cols   = layout.cols ?? 1;
    const rows   = layout.rows ?? 1;
    const fw     = sprite.width  / cols;
    const fh     = sprite.height / rows;
    const col    = this._frameIndex % cols;
    const row    = Math.floor(this._frameIndex / cols);

    // Apply spriteScale — multiplies the natural frame size
    const drawW  = fw * this._spriteScale;
    const drawH  = fh * this._spriteScale;

    ctx.save();
    if (this.direction === -1) {
      ctx.translate(this.x, this.y);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, col * fw, row * fh, fw, fh, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.drawImage(sprite, col * fw, row * fh, fw, fh,
        this.x - drawW / 2, this.y - drawH / 2, drawW, drawH);
    }
    ctx.restore();
  }

  _drawOrb(ctx) {
    // Ground shadow
    ctx.save();
    ctx.globalAlpha = 0.30;
    ctx.fillStyle   = '#000';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.radius * 1.6,
      this.radius * 1.4, this.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Orb — green for unit shots, red/orange for enemy shots
    ctx.save();
    ctx.fillStyle   = this.direction === 1 ? '#a8ff78' : '#ff6b35';
    ctx.shadowColor = this.direction === 1 ? '#a8ff78' : '#ff6b35';
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Inner highlight
    ctx.fillStyle  = this.direction === 1 ? 'rgba(255,255,255,0.55)' : 'rgba(255,220,120,0.50)';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(this.x - this.radius * 0.28, this.y - this.radius * 0.28,
      this.radius * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
