import { CONFIG } from './utils/CONFIG.js';

// Logical occupancy map + coordinate helpers.
// The grid is a visual overlay — it does NOT constrain continuous movement.
export class Grid {
  constructor(cols, rows, cellSize) {
    this.cols     = cols;
    this.rows     = rows;
    this.cellSize = cellSize;
    // 2-D array: null = empty, Unit = occupied
    this._cells   = Array.from({ length: rows }, () => new Array(cols).fill(null));

    // Loaded externally by Game after preload
    this.stoneFloorImg = null;
  }

  // Snap a canvas pixel coordinate to the nearest cell center in world space
  snapToCell(pixelX, pixelY) {
    const col    = Math.floor(pixelX / this.cellSize);
    const row    = Math.floor(pixelY / this.cellSize);
    const cCol   = Math.max(1, Math.min(this.cols - 1, col));  // col 0 is the base column
    const cRow   = Math.max(0, Math.min(this.rows - 1, row));
    const worldX = cCol * this.cellSize + this.cellSize / 2;
    const worldY = cRow * this.cellSize + this.cellSize / 2;
    return { worldX, worldY, col: cCol, row: cRow };
  }

  worldToCell(worldX, worldY) {
    return {
      col: Math.floor(worldX / this.cellSize),
      row: Math.floor(worldY / this.cellSize),
    };
  }

  cellToWorld(col, row) {
    return {
      x: col * this.cellSize + this.cellSize / 2,
      y: row * this.cellSize + this.cellSize / 2,
    };
  }

  isInBounds(col, row) {
    return col >= 1 && col < this.cols && row >= 0 && row < this.rows;
  }

  isOccupied(col, row) {
    if (!this.isInBounds(col, row)) return false;
    return this._cells[row][col] !== null;
  }

  place(col, row, unit) {
    if (!this.isInBounds(col, row)) throw new Error(`Grid.place: (${col},${row}) out of bounds`);
    if (this.isOccupied(col, row))  throw new Error(`Grid.place: cell (${col},${row}) is occupied`);
    this._cells[row][col] = unit;
  }

  remove(col, row) {
    if (!this.isInBounds(col, row)) return;
    this._cells[row][col] = null;
  }

  get(col, row) {
    if (!this.isInBounds(col, row)) return null;
    return this._cells[row][col];
  }

  /**
   * Draw the 3D-perspective floor.
   *
   * Visual concept (matches the reference image):
   *  • Col 0          → danger zone (red tint)
   *  • Cols 1..COLS-2 → playfield (stone floor tile)
   *  • Col COLS-1     → enemy-spawn margin (lighter, semi-transparent)
   *
   * A subtle horizontal shear + slight vertical scale give the
   * "looking-down at a 3D floor" impression without moving any
   * gameplay coordinates.
   */
  draw(ctx) {
    ctx.save();

    const cs   = this.cellSize;
    const cols = this.cols;
    const rows = this.rows;

    // ── 1. Isometric skew transform ──────────────────────────────────────────
    //   We shear the floor-tile layer only; sprites are drawn AFTER restore().
    //   The shear is subtle so the tile positions stay roughly aligned
    //   with the sprite world positions.
    const SHEAR_X   =  0.13;   // horizontal shear (x += y * SHEAR_X)
    const SCALE_Y   =  0.92;   // slight foreshortening
    const OFFSET_X  = -CONFIG.GAME_AREA_HEIGHT * SHEAR_X * 0.5; // re-centre
    const OFFSET_Y  =  CONFIG.GAME_AREA_HEIGHT * (1 - SCALE_Y) * 0.5;

    // ctx.transform(a=scaleX, b=skewY, c=skewX, d=scaleY, e=tx, f=ty)
    ctx.transform(1, 0, SHEAR_X, SCALE_Y, OFFSET_X, OFFSET_Y);

    // ── 2. Draw each cell ────────────────────────────────────────────────────
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cs;
        const y = r * cs;

        const isDanger = (c === 0);
        const isSpawn  = (c === cols - 1);

        // — Floor tile —
        if (this.stoneFloorImg) {
          ctx.drawImage(this.stoneFloorImg, x, y, cs, cs);
        } else {
          ctx.fillStyle = isDanger ? '#6b1010' : isSpawn ? '#555' : '#3a3a3a';
          ctx.fillRect(x, y, cs, cs);
        }

        // — Colour overlay —
        if (isDanger) {
          // Red danger zone
          ctx.fillStyle = 'rgba(180, 20, 20, 0.52)';
          ctx.fillRect(x, y, cs, cs);
        } else if (isSpawn) {
          // Lighter spawn-side margin
          ctx.fillStyle = 'rgba(220, 220, 200, 0.22)';
          ctx.fillRect(x, y, cs, cs);
        } else {
          // Mild green tint for the playfield
          ctx.fillStyle = 'rgba(30, 90, 30, 0.28)';
          ctx.fillRect(x, y, cs, cs);
        }

        // — Per-row depth gradient (darker toward top → lighter at bottom for 3-D cue) —
        const depthAlpha = 0.04 + (rows - 1 - r) * 0.025;
        ctx.fillStyle = `rgba(0,0,0,${depthAlpha})`;
        ctx.fillRect(x, y, cs, cs);

        // — Grid lines (orange like the reference image) —
        ctx.strokeStyle = 'rgba(255, 160, 30, 0.70)';
        ctx.lineWidth   = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
      }
    }

    ctx.restore();

    // ── 3. Vertical depth shadow strips (outside shear — flat overlay) ───────
    //   Simulate ambient occlusion at the left edge without shearing sprites.
    ctx.save();
    const grad = ctx.createLinearGradient(0, 0, cs * 1.5, 0);
    grad.addColorStop(0,   'rgba(0,0,0,0.45)');
    grad.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cs * 1.5, rows * cs);
    ctx.restore();
  }
}
