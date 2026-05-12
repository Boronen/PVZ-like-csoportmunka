# 🌿 Garden Defense — Plants vs. Zombies Clone

> A tower defense game built in JavaScript with OOP principles and clean code architecture. Entities live in continuous pixel/float world space — the grid is a placement guide only.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Gameplay Specification](#gameplay-specification)
3. [Architecture & Class Design](#architecture--class-design)
4. [Class Reference](#class-reference)
5. [Game Loop](#game-loop)
6. [Wave System](#wave-system)
7. [Programming Guidelines](#programming-guidelines)
8. [File Structure](#file-structure)
9. [Roadmap](#roadmap)

---

## Project Overview

Garden Defense is a browser-based tower defense game inspired by Plants vs. Zombies. The player places defensive **Units** (plants) to stop incoming **Enemies** (zombies) from reaching the base. The game is built entirely in vanilla JavaScript using object-oriented programming and clean code principles.

All entities exist in **continuous world space** (float pixel coordinates). The grid is a logical overlay used only for snapping unit placement and determining lane membership — it does not constrain movement or positions.

**There is no inheritance hierarchy.** `Unit` and `Enemy` are single concrete classes. All variation between unit and enemy types (stats, sprites, special behaviours) is expressed as **data**, defined in `UNIT_DEFS` and `ENEMY_DEFS`. A `Unit` instance is created by passing one of those config objects to the constructor — no subclassing needed.

**Tech Stack:**
- JavaScript (ES6+ classes)
- HTML5 Canvas (rendering)
- No external frameworks — pure OOP

---

## Gameplay Specification

### Objective

Prevent enemies from crossing the board and reaching the base. The base starts at **100 HP**. When an enemy reaches the base coordinates, HP is deducted. The game ends when base HP reaches 0 or all waves are cleared.

### The Board

The playing field is a **continuous 2D world** rendered on an HTML5 Canvas. All positions are float pixel coordinates — there is no discrete tile grid constraining movement.

**The grid** is a lightweight logical overlay drawn on top of the world. It serves two purposes only:
1. **Snapping** — when the player clicks to place a unit, the click pixel is snapped to the nearest cell center, so units look aligned.
2. **Lane membership** — each enemy is assigned to a horizontal lane (a `laneIndex`) on spawn, which maps to a world-space `y` coordinate. Enemies travel freely along that `y` without being locked to tile steps.

```
World space (pixels)
  x →  0        160      320      480      640      800
  y ↓  ┌────────┬────────┬────────┬────────┬────────┐
  0    │ 🏰 BASE│        │  [U]   │        │        │  ← lane 0  (worldY = 40)
       │        │        │        │        │  👾──► │
  80   ├────────┼────────┼────────┼────────┼────────┤
       │ 🏰 BASE│        │        │  [U]   │        │  ← lane 1  (worldY = 120)
       │        │        │        │        │👾──►   │
  160  ├────────┼────────┼────────┼────────┼────────┤
       │ 🏰 BASE│        │        │        │  [U]   │  ← lane 2  (worldY = 200)
  240  └────────┴────────┴────────┴────────┴────────┘

  Grid lines = visual guide only. Enemies move at fractional x each frame.
  [U] snaps to cell center on placement. 👾 moves continuously leftward.
```

**Key CONFIG values:**

```js
CONFIG.CELL_SIZE   = 80;
CONFIG.COLS        = 10;
CONFIG.ROWS        = 5;
CONFIG.BASE_X      = 80;
CONFIG.LANE_Y      = (laneIndex) => laneIndex * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
```

**Coordinate helpers (in `Grid`):**

```js
Grid.snapToCell(pixelX, pixelY)   → { worldX, worldY, col, row }
Grid.worldToCell(worldX, worldY)  → { col, row }
```

- The **base zone** is any world `x < CONFIG.BASE_X`. An enemy crossing this triggers `player.takeDamage()`.
- **Range** is expressed in pixels (e.g. `range: 400` = 400 px along the same lane).

### Player Resources

| Resource | Starting Value | Notes |
|---|---|---|
| Base HP | 100 | Decreases when enemies reach base |
| Money | Configurable | Spent on placing units |
| Plant Slots | 6 (array) | UNIT_DEFS config references |

### Plant Slots

The player has a **slot bar** of up to 6 unit config references (entries from `UNIT_DEFS`). Selecting a slot and clicking the canvas creates a new `Unit` instance from that config — if the player has enough money and the cell is empty.

```js
player.slots = [UNIT_DEFS.sunflower, UNIT_DEFS.peaShooter, UNIT_DEFS.wallNut, null, null, null];
```

### Placing Units

1. Player selects a slot (0–5).
2. Player clicks anywhere on the canvas.
3. The click pixel is snapped to the nearest cell center via `Grid.snapToCell()`.
4. If `player.money >= config.cost` AND that cell is unoccupied → a new `Unit` is created from the slot config, placed, money deducted, and cooldown starts.
5. The same slot cannot be used again until its cooldown expires.

### Combat

- Units attack enemies in the same lane within pixel range.
- Enemies attack the first unit blocking their path.
- Attack timing is controlled by `attackSpeed` (attacks per second).
- When an enemy's HP reaches 0, it is removed and may drop a money reward.

### Losing / Winning

- **Lose:** Base HP drops to 0.
- **Win:** All waves are cleared with no enemies remaining.

---

## Architecture & Class Design

### Class Map

```
Game              ← main controller; owns everything
├── Grid          ← occupancy map + coordinate helpers
├── Player        ← base HP, money, slots, cooldowns
├── WaveManager   ← wave sequencing and enemy spawning
├── Unit          ← single concrete plant class (data-driven)
├── Enemy         ← single concrete enemy class (data-driven)
├── Projectile    ← travelling attack object
└── Effect        ← status condition applied to an Enemy
```

No base classes. No abstract classes. No inheritance. Every class is standalone and concrete.

### Data-Driven Variation

All differences between unit and enemy *types* live in plain config objects in `src/data/`:

```js
// src/data/unitDefs.js
export const UNIT_DEFS = {
  peaShooter: {
    key: 'peaShooter', label: 'Pea Shooter',
    hp: 100, attackSpeed: 1, damage: 20, range: 400,
    cost: 100, cooldown: 7.5, sprite: 'peashooter.png',
    onAttack: 'projectile',
  },
  sunflower: {
    key: 'sunflower', label: 'Sunflower',
    hp: 100, attackSpeed: 0, damage: 0, range: 0,
    cost: 50, cooldown: 5, sprite: 'sunflower.png',
    onAttack: 'none', incomePerSecond: 10,
  },
  wallNut: {
    key: 'wallNut', label: 'Wall-nut',
    hp: 400, attackSpeed: 0, damage: 0, range: 0,
    cost: 50, cooldown: 30, sprite: 'wallnut.png',
    onAttack: 'none',
  },
  icePeaShooter: {
    key: 'icePeaShooter', label: 'Ice Pea Shooter',
    hp: 100, attackSpeed: 1, damage: 15, range: 400,
    cost: 175, cooldown: 7.5, sprite: 'icepeashooter.png',
    onAttack: 'projectile',
    effectOnHit: { type: 'slow', magnitude: 0.5, duration: 3000 },
  },
};

// src/data/enemyDefs.js
export const ENEMY_DEFS = {
  basicZombie:    { key: 'basicZombie',    hp: 100, movementSpeed: 40, attackSpeed: 0.5, damage: 10, range: 10, reward: 25, sprite: 'basic.png',     effectOnHit: null },
  coneheadZombie: { key: 'coneheadZombie', hp: 280, movementSpeed: 40, attackSpeed: 0.5, damage: 10, range: 10, reward: 50, sprite: 'conehead.png',  effectOnHit: null },
  speedZombie:    { key: 'speedZombie',    hp: 120, movementSpeed: 96, attackSpeed: 0.8, damage:  8, range: 10, reward: 35, sprite: 'speed.png',     effectOnHit: null },
  freezeZombie:   { key: 'freezeZombie',  hp: 200, movementSpeed: 32, attackSpeed: 0.4, damage:  5, range: 10, reward: 60, sprite: 'freeze.png',    effectOnHit: { type: 'slow', magnitude: 0.5, duration: 2000 } },
};
```

### Design Principles

- **Single Responsibility:** Each class has one reason to change.
- **Data over subclasses:** New unit or enemy types are added by adding an entry to `UNIT_DEFS` / `ENEMY_DEFS` — zero new JS files needed.
- **Encapsulation:** State is managed inside each class; no direct property mutation from outside.
- **No magic numbers:** All constants live in `CONFIG`.
- **No global state:** Everything flows from the `Game` instance.
- **Events over direct calls:** A simple `EventEmitter` handles cross-system communication.

---

## Class Reference

### `Unit`

Single concrete class. All behaviour differences are driven by the `config` object.

```js
class Unit {
  constructor({ config, x, y, col, row, laneIndex }) {}

  attack(enemy): void          // fires based on config.onAttack tag
  takeDamage(amount): void     // reduces hp; removes self if dead
  update(deltaTime): void      // advances attack timer; income tick for sunflower
  isDead(): boolean
  draw(ctx): void
}
```

**Creating a unit:**

```js
const { worldX, worldY, col, row } = grid.snapToCell(clickX, clickY);
const unit = new Unit({ config: UNIT_DEFS.peaShooter, x: worldX, y: worldY, col, row, laneIndex: row });
grid.place(col, row, unit);
```

---

### `Enemy`

Single concrete class. All stat and behaviour differences come from `config`.

```js
class Enemy {
  constructor({ config, x, y, laneIndex }) {}

  move(deltaTime): void        // x -= movementSpeed * deltaTime
  attack(target): void         // damages Unit or player base
  takeDamage(amount): void     // reduces hp; triggers death handling
  addEffect(effect): void      // pushes Effect onto this.effects[]
  update(deltaTime): void      // runs move, attack, all effect updates
  isDead(): boolean
  isAtBase(): boolean          // true when x < CONFIG.BASE_X
  draw(ctx): void
}
```

---

### `Effect`

Applies a status condition to an enemy. Multiple effects stack as an array on the enemy.

```js
class Effect {
  constructor({ target, type, duration, magnitude, tickInterval, sprite }) {}

  update(deltaTime): void   // applies effect to target, counts down duration
  remove(): void            // restores original target stats
  isExpired(): boolean
}
```

---

### `Projectile`

Travelling attack spawned by units whose `config.onAttack === 'projectile'`.

```js
class Projectile {
  constructor({ x, y, laneIndex, speed, damage, effect, sprite }) {}

  update(deltaTime, enemies): void   // advances x; checks hit vs same-lane enemies
  draw(ctx): void
  isDone(): boolean                  // true when out of bounds or hit a target
}
```

---

### `Player`

```js
class Player {
  constructor() {
    this.baseHp       = 100;
    this.money        = 150;
    this.slots        = new Array(6).fill(null);   // object | null
    this.selectedSlot = null;                      // number | null
    this.cooldowns    = new Array(6).fill(0);      // number[]
  }

  selectSlot(index): void
  placeUnit(clickX, clickY, grid, game): boolean   // true if placement succeeded
  earnMoney(amount): void
  takeDamage(amount): void
  isAlive(): boolean
  update(deltaTime): void                          // ticks down slot cooldowns
}
```

---

### `Grid`

Logical occupancy map + coordinate helpers.

```js
class Grid {
  constructor(cols, rows, cellSize) {}

  snapToCell(pixelX, pixelY): { worldX, worldY, col, row }
  worldToCell(worldX, worldY): { col, row }
  cellToWorld(col, row): { x, y }
  place(col, row, unit): void       // throws if occupied
  remove(col, row): void
  get(col, row): Unit | null
  isOccupied(col, row): boolean
  isInBounds(col, row): boolean
  draw(ctx): void
}
```

---

### `WaveManager`

```js
class WaveManager {
  constructor(waves) {
    this.waves       = waves;    // object[]
    this.currentWave = 0;        // number
    this.spawnQueue  = [];       // object[]
    this.isComplete  = false;    // boolean
  }

  startNextWave(): void
  update(deltaTime, game): void    // pops spawn entries on timer; pushes Enemy instances
  allWavesCleared(): boolean
}
```

---

### `Game`

```js
class Game {
  constructor() {
    this.grid        = new Grid(10, 5, CONFIG.CELL_SIZE);
    this.player      = new Player();
    this.waveManager = new WaveManager(WAVES);
    this.enemies     = [];       // Enemy[]
    this.units       = [];       // Unit[]
    this.projectiles = [];       // Projectile[]
    this.state       = 'idle';   // string
    this.lastTime    = 0;        // number
  }

  start(): void
  pause(): void
  resume(): void
  gameLoop(timestamp): void
  update(deltaTime): void
  render(): void
  checkCollisions(): void
  handleEnemyDeath(enemy): void
  removeUnit(unit): void
  checkGameOver(): void
}
```

---

## Game Loop

```
requestAnimationFrame
        │
        ▼
  game.gameLoop(timestamp)
        │
        ├── deltaTime = timestamp - lastTime
        │
        ├── game.update(deltaTime)
        │       ├── player.update()         → tick slot cooldowns
        │       ├── waveManager.update()    → spawn queued enemies
        │       ├── enemy.update()          → move + attack + apply effects
        │       ├── unit.update()           → fire at enemies in range; income tick
        │       ├── projectile.update()     → travel + hit detection
        │       ├── checkCollisions()       → base damage, unit damage
        │       └── checkGameOver()
        │
        └── game.render()
                ├── grid.draw()
                ├── unit.draw() for each unit
                ├── enemy.draw() for each enemy
                ├── projectile.draw()
                └── ui.draw()              → HP, money, wave, slots + cooldowns
```

---

## Wave System

Waves are pre-defined in `src/data/waves.js`. The `WaveManager` reads the spawn queue and uses a timer to introduce enemies at `spawnInterval` milliseconds apart per group.

**Enemy types (examples):**

| Key | HP | Speed (px/s) | Damage | Special |
|---|---|---|---|---|
| basicZombie | 100 | 40 | 10 | None |
| coneheadZombie | 280 | 40 | 10 | None |
| bucketheadZombie | 650 | 40 | 10 | None |
| speedZombie | 120 | 96 | 8 | Fast |
| freezeZombie | 200 | 32 | 5 | Applies Slow on hit |

**Unit types (examples):**

| Key | HP | Cost | Damage | Range (px) | Special |
|---|---|---|---|---|---|
| peaShooter | 100 | 100 | 20 | 400 | Projectile |
| sunflower | 100 | 50 | 0 | — | +10 money/sec |
| wallNut | 400 | 50 | 0 | — | Blocks enemies |
| icePeaShooter | 100 | 175 | 15 | 400 | Projectile + Slow |
| cherryBomb | 300 | 150 | 120 | 80 (AoE) | One-time explosion |

**Wave config shape:**

```js
const WAVES = [
  {
    wave: 1,
    enemies: [
      { defKey: 'basicZombie',    count: 5, spawnInterval: 2000, laneIndex: 0 },
      { defKey: 'basicZombie',    count: 3, spawnInterval: 2500, laneIndex: 2 },
    ]
  },
  {
    wave: 2,
    enemies: [
      { defKey: 'coneheadZombie', count: 4, spawnInterval: 1800, laneIndex: 1 },
      { defKey: 'speedZombie',    count: 6, spawnInterval: 1500, laneIndex: 0 },
    ]
  }
];
```

---

## Programming Guidelines

### Clean Code Rules

- **Naming:** Classes = PascalCase, methods/variables = camelCase, constants = UPPER_SNAKE_CASE, config keys = camelCase.
- **Functions:** Do one thing; max ~20 lines. Extract if longer.
- **No magic numbers:** Use `CONFIG.BASE_X`, `CONFIG.CELL_SIZE`, `CONFIG.LANE_Y()`, etc.
- **Comments:** Explain *why*, not *what*.
- **Immutability:** Prefer `const`; only use `let` when a value must change.
- **Error handling:** Validate inputs at class boundaries.

### OOP Rules

- **No inheritance, no abstract classes** — `Unit` and `Enemy` are single concrete classes configured via data.
- **New types = new data, not new files** — add an entry to `UNIT_DEFS` or `ENEMY_DEFS`.
- **Effects are composable** — stack multiple `Effect` instances on a single enemy via `enemy.effects[]`.
- **No global state** — everything lives on the `Game` instance or is passed as arguments.
- **Events over direct calls** — use `EventEmitter` for cross-system communication.

---

## File Structure

```
garden-defense/
├── index.html
├── README.md
├── src/
│   ├── main.js            ← Entry point
│   ├── Game.js
│   ├── Grid.js
│   ├── Player.js
│   ├── WaveManager.js
│   ├── Unit.js            ← Single concrete Unit class
│   ├── Enemy.js           ← Single concrete Enemy class
│   ├── Projectile.js
│   ├── Effect.js
│   ├── ui/
│   │   ├── UI.js
│   │   └── SlotBar.js
│   ├── data/
│   │   ├── unitDefs.js    ← UNIT_DEFS
│   │   ├── enemyDefs.js   ← ENEMY_DEFS
│   │   └── waves.js       ← WAVES
│   └── utils/
│       ├── CONFIG.js
│       ├── EventEmitter.js
│       └── SpriteLoader.js
└── assets/
    ├── sprites/
    │   ├── units/
    │   └── enemies/
    └── sounds/
```

---

## Roadmap

| Phase | Goal | Status |
|---|---|---|
| 1 | Core grid + rendering | 🔲 Planned |
| 2 | Enemy movement + wave system | 🔲 Planned |
| 3 | Unit placement + combat | 🔲 Planned |
| 4 | Effects system | 🔲 Planned |
| 5 | Full UI (HUD, slots, cooldowns) | 🔲 Planned |
| 6 | Data-driven unit & enemy types | 🔲 Planned |
| 7 | Sound & animation polish | 🔲 Planned |
| 8 | Balancing & level data | 🔲 Planned |

---

*Built with ❤️ and clean code.*
