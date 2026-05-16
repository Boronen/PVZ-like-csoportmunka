import { CONFIG } from '../utils/CONFIG.js';

// Extra pixels added to each side of a slot's hit-test rectangle so that
// tapping near (but not exactly on) a slot still registers on touch screens.
const HIT_PADDING = 8;

// Renders the 6-slot plant selection bar at the bottom of the canvas.
export class SlotBar {
  constructor() {
    this.slotW  = 72;
    this.slotH  = 72;
    this.gap    = 10;
    this.padX   = 20;
  }

  // Returns the slot index (0-5) for a given canvas click, or -1 if no slot hit.
  // The hit area is expanded by HIT_PADDING on every side for easier touch input.
  hitTest(mouseX, mouseY, barY) {
    for (let i = 0; i < 6; i++) {
      const x = this.padX + i * (this.slotW + this.gap);
      const y = barY + (CONFIG.UI_HEIGHT / 2 - this.slotH / 2);
      if (mouseX >= x - HIT_PADDING && mouseX <= x + this.slotW + HIT_PADDING &&
          mouseY >= y - HIT_PADDING && mouseY <= y + this.slotH + HIT_PADDING) {
        return i;
      }
    }
    return -1;
  }

  draw(ctx, player, barY) {
    for (let i = 0; i < 6; i++) {
      const config  = player.slots[i];
      const cd      = player.cooldowns[i];
      const isSelected = player.selectedSlot === i;
      const x = this.padX + i * (this.slotW + this.gap);
      const y = barY + (CONFIG.UI_HEIGHT / 2 - this.slotH / 2);

      this._drawSlotBackground(ctx, x, y, config, isSelected);
      if (config) {
        this._drawSlotLabel(ctx, x, y, config);
        this._drawCostBadge(ctx, x, y, config, player.money);
        if (cd > 0) this._drawCooldownOverlay(ctx, x, y, cd, config.cooldown);
      }
      if (isSelected) this._drawSelectionBorder(ctx, x, y);
    }
  }

  _drawSlotBackground(ctx, x, y, config, isSelected) {
    ctx.save();
    ctx.fillStyle = config ? '#2e7d32' : '#1b1b2f';
    ctx.strokeStyle = isSelected ? '#ffeb3b' : '#4caf50';
    ctx.lineWidth = isSelected ? 3 : 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, this.slotW, this.slotH, 6);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  _drawSlotLabel(ctx, x, y, config) {
    ctx.save();
    ctx.fillStyle   = '#fff';
    ctx.font        = 'bold 11px sans-serif';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.label ?? config.key, x + this.slotW / 2, y + this.slotH / 2 - 6);
    ctx.restore();
  }

  _drawCostBadge(ctx, x, y, config, money) {
    ctx.save();
    ctx.fillStyle = money >= config.cost ? '#fff176' : '#ef9a9a';
    ctx.font      = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`$${config.cost}`, x + this.slotW / 2, y + this.slotH - 10);
    ctx.restore();
  }

  _drawCooldownOverlay(ctx, x, y, cd, maxCd) {
    const ratio = cd / maxCd;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(x, y, this.slotW, this.slotH * ratio, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font      = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cd.toFixed(1) + 's', x + this.slotW / 2, y + this.slotH / 2);
    ctx.restore();
  }

  _drawSelectionBorder(ctx, x, y) {
    ctx.save();
    ctx.strokeStyle = '#ffeb3b';
    ctx.lineWidth   = 3;
    ctx.shadowColor = '#ffeb3b';
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.roundRect(x - 2, y - 2, this.slotW + 4, this.slotH + 4, 8);
    ctx.stroke();
    ctx.restore();
  }
}
