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

  draw(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth   = 1;

    for (let c = 0; c <= this.cols; c++) {
      const x = c * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.rows * this.cellSize);
      ctx.stroke();
    }
    for (let r = 0; r <= this.rows; r++) {
      const y = r * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.cols * this.cellSize, y);
      ctx.stroke();
    }

    // Shade the base column
    ctx.fillStyle = 'rgba(255, 80, 80, 0.08)';
    ctx.fillRect(0, 0, CONFIG.BASE_X, this.rows * this.cellSize);

    ctx.restore();
  }
}
