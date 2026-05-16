/**
 * Animator — shared frame-advance helpers for Unit and Enemy.
 *
 * Instead of duplicating the same timer/frame logic in both classes we keep
 * it here as a pair of pure functions that operate on a plain anim-state
 * object.  The object is created once per entity with `createAnim` and then
 * mutated in-place each tick by `advanceFrame`.
 */

/**
 * Create a fresh animation-state object.
 *
 * @param {number} fps  Desired playback speed (frames per second).
 * @returns {{ frameIndex: number, frameTimer: number, frameDuration: number }}
 */
export function createAnim(fps) {
  return {
    frameIndex:    0,
    frameTimer:    0,
    frameDuration: 1 / fps,
  };
}

/**
 * Advance the animation by one simulation tick.
 *
 * Accumulates time and increments `frameIndex` (wrapping at `layout.total`)
 * whenever a full `frameDuration` has elapsed.
 *
 * @param {{ frameIndex: number, frameTimer: number, frameDuration: number }} anim
 *   The mutable anim-state object returned by `createAnim`.
 * @param {{ total: number }} layout
 *   The current frame layout — only `total` is needed for wrapping.
 */
export function advanceFrame(anim, layout) {
  // Use a fixed 1/60 s tick so animation speed is decoupled from deltaTime
  // fluctuations (same behaviour as the original hand-rolled code).
  anim.frameTimer += 1 / 60;
  if (anim.frameTimer >= anim.frameDuration) {
    anim.frameTimer  -= anim.frameDuration;
    anim.frameIndex   = (anim.frameIndex + 1) % layout.total;
  }
}

/**
 * Reset the animation state to frame 0 (called on state transitions).
 *
 * @param {{ frameIndex: number, frameTimer: number }} anim
 */
export function resetAnim(anim) {
  anim.frameIndex = 0;
  anim.frameTimer = 0;
}
