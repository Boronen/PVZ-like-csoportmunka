import { CONFIG }  from '../utils/CONFIG.js';
import { SlotBar } from './SlotBar.js';

// Renders the full HUD: HP bar, money, PVZ-style wave progress bar, and the slot bar.
export class UI {
  constructor() {
    this.slotBar = new SlotBar();
    this.barY    = CONFIG.GAME_AREA_HEIGHT;   // pixel Y where UI panel starts
  }

  // Returns the slot index clicked, or -1
  handleClick(mouseX, mouseY) {
    return this.slotBar.hitTest(mouseX, mouseY, this.barY);
  }

  draw(ctx, player, waveManager) {
    this._drawPanel(ctx);
    this._drawHUD(ctx, player, waveManager);
    this.slotBar.draw(ctx, player, this.barY);
  }

  _drawPanel(ctx) {
    ctx.save();
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, this.barY, CONFIG.CANVAS_WIDTH, CONFIG.UI_HEIGHT);
    ctx.strokeStyle = '#4caf50';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.barY);
    ctx.lineTo(CONFIG.CANVAS_WIDTH, this.barY);
    ctx.stroke();
    ctx.restore();
  }

  _drawHUD(ctx, player, waveManager) {
    const y = this.barY + 22;

    ctx.save();
    ctx.font      = 'bold 14px sans-serif';
    ctx.textAlign = 'left';

    // Base HP bar
    this._drawHpBar(ctx, player, 20, y);

    // Money
    ctx.fillStyle = '#fff176';
    ctx.font      = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`💰 $${Math.floor(player.money)}`, 220, y);

    // Instructions hint (right side)
    ctx.fillStyle = '#888';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Select slot → click grid to place  |  P = pause', CONFIG.CANVAS_WIDTH - 10, y);

    ctx.restore();

    // PVZ-style wave progress bar — replaces the old wave text counter
    this._drawWaveProgressBar(ctx, waveManager);
  }

  _drawHpBar(ctx, player, x, y) {
    const barW = 160;
    const barH = 14;
    const ratio = player.baseHp / CONFIG.BASE_HP;

    ctx.fillStyle = '#333';
    ctx.fillRect(x, y - 10, barW, barH);
    ctx.fillStyle = ratio > 0.5 ? '#4caf50' : ratio > 0.25 ? '#ff9800' : '#f44336';
    ctx.fillRect(x, y - 10, barW * ratio, barH);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🏰 ${player.baseHp} / ${CONFIG.BASE_HP}`, x + barW / 2, y + 1);
  }

  /**
   * PVZ-style wave progress bar.
   *
   * Tracks how many enemies in the current wave have been defeated.
   * The bar fills left→right; an enemy icon floats at the progress head.
   * Below the bar a "Wave N / M" label is shown.
   *
   * Reads from waveManager:
   *   • enemiesDefeatedThisWave  {number}
   *   • totalEnemiesThisWave     {number}
   *   • currentWaveLabel         {string}  e.g. "Wave 2 / 4"
   */
  _drawWaveProgressBar(ctx, waveManager) {
    const x = 380;
    const y = this.barY + 8;
    const w = 340;
    const h = 20;

    const defeated = waveManager.enemiesDefeatedThisWave  ?? 0;
    const total    = waveManager.totalEnemiesThisWave     ?? 1;
    const label    = waveManager.currentWaveLabel
      ?? (waveManager.isComplete
          ? 'All waves cleared!'
          : `Wave ${waveManager.currentWave} / ${waveManager.waves.length}`);

    const progress = Math.min(defeated / Math.max(total, 1), 1);

    ctx.save();

    // ── Background track ──────────────────────────────────────────────────────
    ctx.fillStyle   = '#1a1a2e';
    ctx.strokeStyle = '#555';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    this._roundRect(ctx, x, y, w, h, 4);
    ctx.fill();
    ctx.stroke();

    // ── Fill bar (red — enemy-wave themed, matching PVZ danger feel) ──────────
    if (progress > 0) {
      ctx.fillStyle = '#e53935';
      ctx.save();
      ctx.beginPath();
      this._roundRect(ctx, x, y, w * progress, h, 4);
      ctx.fill();
      ctx.restore();
    }

    // ── Subtle inner highlight (top edge) ────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x + 2, y + 1, (w - 4) * progress, 4);

    // ── Enemy icon at the progress head ──────────────────────────────────────
    const iconX = x + w * progress;
    ctx.font      = '15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🧟', Math.min(iconX, x + w - 8), y + 14);

    // ── Wave label below the bar ──────────────────────────────────────────────
    ctx.fillStyle   = '#80deea';
    ctx.font        = 'bold 11px sans-serif';
    ctx.textAlign   = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur  = 3;
    ctx.fillText(label, x + w / 2, y + h + 13);
    ctx.shadowBlur  = 0;

    ctx.restore();
  }

  /**
   * Helper — draw a rounded rectangle path.
   * Canvas does not have a native roundRect in all targets, so we trace it manually.
   */
  _roundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h,     x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y,         x + r, y);
    ctx.closePath();
  }
}
