import { CONFIG } from './CONFIG.js';

/**
 * drawFrame — shared sprite-frame renderer for Unit and Enemy.
 *
 * Both classes had an identical `_drawFrame` method.  This module extracts
 * that logic into a single function so there is one source of truth.
 *
 * Scaling strategy
 * ────────────────
 * The natural frame (fw × fh pixels) is scaled proportionally so it fits
 * inside a square bounding box of `drawSize` pixels without distortion.
 * This handles sprites that vary widely in source dimensions
 * (e.g. Wizard 231×190 vs Goblin 48×48).
 *
 * rowIndex override
 * ─────────────────
 * When `layout.rowIndex` is defined that exact row is used regardless of
 * `frameIndex` — needed for multi-row shared spritesheets (Arcana Archer,
 * Skeleton).
 *
 * flipX
 * ─────
 * When `flipX` is true the sprite is mirrored horizontally around the
 * entity's centre-x (used for enemies that face left).
 */

/**
 * Draw one animation frame from a spritesheet onto the canvas.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement}         sprite      The spritesheet image.
 * @param {{ cols?: number, rows?: number, rowIndex?: number }} layout
 *   Frame layout descriptor from the unit/enemy config.
 * @param {number}  frameIndex  Current zero-based frame index.
 * @param {number}  x           Entity centre-x in world space (pixels).
 * @param {number}  y           Entity centre-y in world space (pixels).
 * @param {number}  [drawSize]  Target bounding-box size (pixels).
 *   Defaults to `CONFIG.CELL_SIZE` when omitted.
 * @param {number}  [offsetX=0] Horizontal draw offset (pixels).
 * @param {number}  [offsetY=0] Vertical draw offset (pixels).
 * @param {boolean} [flipX=false] Mirror the frame horizontally.
 */
export function drawSpriteFrame(
  ctx,
  sprite,
  layout,
  frameIndex,
  x,
  y,
  drawSize  = CONFIG.CELL_SIZE,
  offsetX   = 0,
  offsetY   = 0,
  flipX     = false,
) {
  // Number of columns/rows in the spritesheet grid
  const cols = layout.cols ?? 1;
  const rows = layout.rows ?? 1;

  // Natural source-pixel dimensions of one frame
  const fw = sprite.width  / cols;
  const fh = sprite.height / rows;

  // Which column/row of the sheet to sample
  const col = frameIndex % cols;
  const row = (layout.rowIndex !== undefined)
    ? layout.rowIndex
    : Math.floor(frameIndex / cols);

  // Proportional scale so the frame fits inside the target bounding box
  const scale = Math.min(drawSize / fw, drawSize / fh);
  const drawW = fw * scale;
  const drawH = fh * scale;

  // Top-left destination corner (centred on x,y then shifted by offsets)
  const dx = x - drawW / 2 + offsetX;
  const dy = y - drawH / 2 + offsetY;

  if (flipX) {
    // Mirror around (x + offsetX) so the pivot stays at the entity centre
    ctx.save();
    ctx.translate(x + offsetX, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(sprite, col * fw, row * fh, fw, fh, -drawW / 2, dy, drawW, drawH);
    ctx.restore();
  } else {
    ctx.drawImage(sprite, col * fw, row * fh, fw, fh, dx, dy, drawW, drawH);
  }
}
