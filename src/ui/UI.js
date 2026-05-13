import { CONFIG }  from '../utils/CONFIG.js';
import { SlotBar } from './SlotBar.js';

// Renders the full HUD: HP bar, money, wave info, and the slot bar.
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

    // Base HP
    this._drawHpBar(ctx, player, 20, y);

    // Money
    ctx.fillStyle = '#fff176';
    ctx.fillText(`💰 $${Math.floor(player.money)}`, 220, y);

    // Wave counter
    const waveLabel = waveManager.isComplete
      ? 'All waves cleared!'
      : `Wave ${waveManager.currentWave} / ${waveManager.waves.length}`;
    ctx.fillStyle = '#80deea';
    ctx.fillText(waveLabel, 380, y);

    // Instructions hint
    ctx.fillStyle = '#888';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Select slot → click grid to place  |  P = pause', CONFIG.CANVAS_WIDTH - 10, y);

    ctx.restore();
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
}
