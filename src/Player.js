import { CONFIG } from './utils/CONFIG.js';

// Owns base HP, money, slot selection, and slot cooldowns.
export class Player {
  constructor() {
    this.baseHp       = CONFIG.BASE_HP;
    this.money        = CONFIG.STARTING_MONEY;
    this.slots        = new Array(6).fill(null);   // filled by Game with UNIT_DEFS entries
    this.selectedSlot = null;                      // index 0-5 | null
    this.cooldowns    = new Array(6).fill(0);      // remaining seconds per slot
  }

  selectSlot(index) {
    if (index < 0 || index >= this.slots.length) return;
    if (!this.slots[index]) return;                // slot not configured
    this.selectedSlot = (this.selectedSlot === index) ? null : index;
  }

  // Attempt to place a unit from the selected slot.
  // Returns the config object on success, null on failure.
  placeUnit(clickX, clickY, grid, game) {
    if (this.selectedSlot === null) return null;
    const config = this.slots[this.selectedSlot];
    if (!config) return null;
    if (this.cooldowns[this.selectedSlot] > 0) return null;
    if (this.money < config.cost) return null;

    const { worldX, worldY, col, row } = grid.snapToCell(clickX, clickY);
    if (grid.isOccupied(col, row)) return null;

    this.money -= config.cost;
    this.cooldowns[this.selectedSlot] = config.cooldown;
    this.selectedSlot = null;

    return { config, worldX, worldY, col, row };
  }

  earnMoney(amount) {
    this.money += amount;
  }

  takeDamage(amount) {
    this.baseHp = Math.max(0, this.baseHp - amount);
  }

  isAlive() {
    return this.baseHp > 0;
  }

  // Tick down all slot cooldowns each frame
  update(deltaTime) {
    for (let i = 0; i < this.cooldowns.length; i++) {
      if (this.cooldowns[i] > 0) {
        this.cooldowns[i] = Math.max(0, this.cooldowns[i] - deltaTime);
      }
    }
  }
}
