import { CONFIG } from './utils/CONFIG.js';
import { Effect }  from './Effect.js';

// A travelling attack object — spawned by both units (rightward) and enemies (leftward).
export class Projectile {
  /**
   * @param {{ x, y, laneIndex, speed, damage, direction, effectConfig, targets }} opts
   *   direction:  1 = travels right (unit shot toward enemies)
   *              -1 = travels left  (enemy shot toward player base / units)
   *   targets: live array reference — either game.enemies or game.units
   */
  constructor({ x, y, laneIndex, speed, damage, direction = 1, effectConfig, targets }) {
    this.x            = x;
    this.y            = y;
    this.laneIndex    = laneIndex;
    this.speed        = speed ?? CONFIG.PROJECTILE_SPEED;
    this.damage       = damage;
    this.direction    = direction;
    this.effectConfig = effectConfig ?? null;
    this._targets     = targets;   // live array reference passed from Game
    this._done        = false;
    this.radius       = 6;
  }

  update(deltaTime) {
    this.x += this.direction * this.speed * deltaTime;

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
    // ── Ground shadow (small flat ellipse below the projectile) ──
    ctx.save();
    ctx.globalAlpha = 0.30;
    ctx.fillStyle   = '#000';
    ctx.beginPath();
    // Shadow is offset downward and squashed
    ctx.ellipse(this.x, this.y + this.radius * 1.6, this.radius * 1.4, this.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── Projectile orb — green for unit shots, red/orange for enemy shots ──
    ctx.save();
    ctx.fillStyle   = this.direction === 1 ? '#a8ff78' : '#ff6b35';
    ctx.shadowColor = this.direction === 1 ? '#a8ff78' : '#ff6b35';
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright highlight for depth
    ctx.fillStyle   = this.direction === 1 ? 'rgba(255,255,255,0.55)' : 'rgba(255,220,120,0.50)';
    ctx.shadowBlur  = 0;
    ctx.beginPath();
    ctx.arc(this.x - this.radius * 0.28, this.y - this.radius * 0.28, this.radius * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
