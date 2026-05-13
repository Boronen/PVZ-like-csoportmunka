// A status condition applied to an Enemy instance (e.g. slow, burn).
// Multiple effects can be stacked — each lives in enemy.effects[].
export class Effect {
  /**
   * @param {{ target: Enemy, type: string, duration: number,
   *            magnitude: number, tickInterval?: number }} opts
   */
  constructor({ target, type, duration, magnitude, tickInterval = 0 }) {
    this._target       = target;
    this.type          = type;
    this._duration     = duration;      // ms remaining
    this.magnitude     = magnitude;
    this._tickInterval = tickInterval;
    this._tickTimer    = 0;
    this._applied      = false;

    this._apply();
  }

  _apply() {
    if (this._applied) return;
    this._applied = true;
    if (this.type === 'slow') {
      // Store original so we can restore it on removal
      this._originalSpeed           = this._target.movementSpeed;
      this._target.movementSpeed   *= (1 - this.magnitude);
    }
  }

  remove() {
    if (!this._applied) return;
    this._applied = false;
    if (this.type === 'slow') {
      this._target.movementSpeed = this._originalSpeed;
    }
  }

  update(deltaTime) {
    const dtMs = deltaTime * 1000;
    this._duration -= dtMs;
    if (this._tickInterval > 0) {
      this._tickTimer += dtMs;
      if (this._tickTimer >= this._tickInterval) {
        this._tickTimer -= this._tickInterval;
        this._tick();
      }
    }
  }

  _tick() {
    // Extend here for damage-over-time effects
  }

  isExpired() {
    return this._duration <= 0;
  }
}
