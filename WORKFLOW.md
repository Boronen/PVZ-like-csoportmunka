# 🔄 Garden Defense — Workflow & Team Roles

> Describes who does what, how the project is structured, and how development has progressed over time.

---

## Table of Contents

1. [Team Members & Roles](#team-members--roles)
2. [Project Workflow](#project-workflow)
3. [Development Progress](#development-progress)
4. [How Modules Depend on Each Other](#how-modules-depend-on-each-other)
5. [Branching & Contribution Guidelines](#branching--contribution-guidelines)
6. [Naming & Code Style](#naming--code-style)

---

## Team Members & Roles

### 🛠️ Tomi — Core Systems & Game Architecture

**Strengths:** Great ideas, strong implementation concepts, creative problem-solving.

**Responsibilities:**
- Base `Enemy` class ([`src/Enemy.js`](src/Enemy.js)) — movement, targeting, attack logic
- Base `Player` class ([`src/Player.js`](src/Player.js)) — HP, money, slots, cooldowns
- Base `Unit` class ([`src/Unit.js`](src/Unit.js)) — placement, combat, animation state
- `Grid` system ([`src/Grid.js`](src/Grid.js)) — occupancy map, coordinate helpers
- `WaveManager` ([`src/WaveManager.js`](src/WaveManager.js)) — wave sequencing, spawn queue
- `Effect` system ([`src/Effect.js`](src/Effect.js)) — status conditions (slow, burn, stun)
- Game config ([`src/utils/CONFIG.js`](src/utils/CONFIG.js)) — all tunable constants
- Data definitions ([`src/data/enemyDefs.js`](src/data/enemyDefs.js), [`src/data/unitDefs.js`](src/data/unitDefs.js), [`src/data/waves.js`](src/data/waves.js))

---

### 💻 Kevin — AI-assisted Development & Advanced Features

**Strengths:** Expert at leveraging AI tools (Copilot, ChatGPT, etc.), strong overall coder.

**Responsibilities:**
- `Game` main controller ([`src/Game.js`](src/Game.js)) — game loop, orchestration, input handling
- `Projectile` system ([`src/Projectile.js`](src/Projectile.js)) — travel logic, hit detection
- `EventEmitter` ([`src/utils/EventEmitter.js`](src/utils/EventEmitter.js)) — pub/sub decoupling
- `SpriteLoader` ([`src/utils/SpriteLoader.js`](src/utils/SpriteLoader.js)) — async image loading & caching
- [`index.html`](index.html) — page layout, CSS, canvas setup
- [`src/main.js`](src/main.js) — entry point, start/pause button wiring
- Performance optimisations, debugging, AI-generated code review

---

### 🎨 Marcell — Art, Visual Code & Animation

**Strengths:** Skilled at drawing and animation; responsible for all visual assets **and all rendering code**.

**Art responsibilities:**
- All unit sprite sheets (`assets/ally_*.png`)
- All enemy sprite sheets (`assets/enemy_*.png`)
- Background image (`assets/background.jpg`)
- HTML background gif (`assets/htmlbackground.gif`)
- Future animated assets (new enemies, VFX, UI icons)
- Maintaining consistent art style across all characters
- Defining sprite sheet grid layouts (rows, cols, frame counts) — communicating these to Tomi for data definitions

**Coding responsibilities:**
- `UI` ([`src/ui/UI.js`](src/ui/UI.js)) — HUD: HP bar, money counter, wave counter
- `SlotBar` ([`src/ui/SlotBar.js`](src/ui/SlotBar.js)) — 6-slot bar, cooldown overlays, cost badges, selection highlight
- `ParticleSystem` ([`src/ParticleSystem.js`](src/ParticleSystem.js)) — particle burst effects on death, hit, placement
- `draw()` methods inside [`Unit`](src/Unit.js), [`Enemy`](src/Enemy.js), [`Projectile`](src/Projectile.js), and [`Grid`](src/Grid.js) — all canvas rendering

---

## Project Workflow

### How a New Enemy is Added

```
Marcell draws sprite sheet
        │
        ▼
Marcell delivers:
  assets/enemy_<Name>_moving.png
  assets/enemy_<Name>_shooting.png
  + frame layout (cols × rows × total)
        │
        ▼
Tomi adds entry to src/data/enemyDefs.js:
  {
    key, label, hp, movementSpeed,
    attackSpeed, damage, range, reward,
    idleSprite, attackSprite,
    idleFrames, attackFrames,
    onAttack, effectOnHit
  }
        │
        ▼
Tomi adds defKey to a wave pool in src/data/waves.js
        │
        ▼
Kevin tests in-game, adjusts stats via CONFIG / defs
```

### How a New Unit is Added

```
Marcell draws sprite sheet
        │
        ▼
Marcell delivers:
  assets/ally_<Name>_idle.png
  assets/ally_<Name>_attack.png
  + frame layout
        │
        ▼
Tomi adds entry to src/data/unitDefs.js:
  {
    key, label, hp, attackSpeed,
    damage, range, cost, cooldown,
    idleSprite, attackSprite,
    idleFrames, attackFrames,
    onAttack, effectOnHit
  }
        │
        ▼
Kevin adds unit to player slots in Game._setupSlots()
        │
        ▼
Kevin tests + tunes in-game
```

---

## Development Progress

### Phase 1 — Foundation ✅

| Task | Owner | Status |
|---|---|---|
| Project structure & module system | Kevin | ✅ Done |
| Canvas setup & game loop | Kevin | ✅ Done |
| `CONFIG.js` with all constants | Tomi | ✅ Done |
| `Grid` — occupancy map + coordinate helpers | Tomi | ✅ Done |
| `Player` — HP, money, slots, cooldowns | Tomi | ✅ Done |
| `EventEmitter` utility | Kevin | ✅ Done |
| `SpriteLoader` utility | Kevin | ✅ Done |

### Phase 2 — Core Gameplay ✅

| Task | Owner | Status |
|---|---|---|
| `Unit` class — placement, combat, animation | Tomi | ✅ Done |
| `Enemy` class — movement, attack, blocking | Tomi | ✅ Done |
| `Projectile` — travel + hit detection | Kevin | ✅ Done |
| `Effect` — slow status condition | Tomi | ✅ Done |
| `WaveManager` — wave sequencing, spawn queue | Tomi | ✅ Done |
| `unitDefs.js` — Soldier, Archer | Tomi | ✅ Done |
| `enemyDefs.js` — Slade | Tomi | ✅ Done |
| `waves.js` — 3 waves | Tomi | ✅ Done |
| Sprite sheets for Soldier, Archer, Slade | Marcell | ✅ Done |

### Phase 3 — UI & Polish ✅

| Task | Owner | Status |
|---|---|---|
| `UI.js` — HUD (HP bar, money, wave counter) | Marcell | ✅ Done |
| `SlotBar.js` — 6 slots, cooldown overlay | Marcell | ✅ Done |
| `draw()` methods — Unit, Enemy, Projectile, Grid | Marcell | ✅ Done |
| Background scrolling animation (HTML/CSS) | Kevin | ✅ Done |
| Win / Lose overlay | Kevin | ✅ Done |
| Pause / resume (P key) | Kevin | ✅ Done |
| Background image (`background.jpg`) | Marcell | ✅ Done |

### Phase 4 — More Enemies & Units 🔲

| Task | Owner | Status |
|---|---|---|
| `grunt` enemy sprite + def | Marcell / Tomi | 🔲 Planned |
| `shieldBearer` enemy sprite + def | Marcell / Tomi | 🔲 Planned |
| `scout` enemy sprite + def | Marcell / Tomi | 🔲 Planned |
| `bomber` enemy sprite + def | Marcell / Tomi | 🔲 Planned |
| `tank` boss enemy sprite + def | Marcell / Tomi | 🔲 Planned |
| `crossbowman` unit sprite + def | Marcell / Tomi | 🔲 Planned |
| `mage` unit sprite + def | Marcell / Tomi | 🔲 Planned |
| `knight` unit sprite + def | Marcell / Tomi | 🔲 Planned |
| 10-wave campaign (waves 4–10) | Tomi | 🔲 Planned |

### Phase 5 — Advanced Features 🔲

| Task | Owner | Status |
|---|---|---|
| `ParticleSystem.js` — death/hit/placement bursts | Marcell | ✅ Done |
| AoE projectile / splash damage | Kevin | 🔲 Planned |
| `burn` & `stun` effects | Tomi | 🔲 Planned |
| `healer` unit logic | Tomi / Kevin | 🔲 Planned |
| Sound effects & music | Kevin / Marcell | 🔲 Planned |
| Mobile touch support | Kevin | 🔲 Planned |
| Fast-forward toggle | Kevin | 🔲 Planned |

---

## How Modules Depend on Each Other

```
index.html
  └── src/main.js
        └── Game.js
              ├── utils/CONFIG.js          (constants — no deps)            [Kevin]
              ├── utils/EventEmitter.js    (pub/sub — no deps)               [Kevin]
              ├── utils/SpriteLoader.js    (image cache — no deps)           [Kevin]
              ├── Grid.js                  (logic: Tomi | draw(): Marcell)
              ├── Player.js                (depends on CONFIG)               [Tomi]
              ├── Unit.js                  (logic: Tomi | draw(): Marcell)
              ├── Enemy.js                 (logic: Tomi | draw(): Marcell)
              ├── Projectile.js            (logic: Kevin | draw(): Marcell)
              ├── Effect.js                (no deps — applied to Enemy)      [Tomi]
              ├── WaveManager.js           (depends on CONFIG, Enemy, defs)  [Tomi]
              ├── ParticleSystem.js        (depends on EventEmitter)         [Marcell]
              ├── ui/UI.js                 (depends on CONFIG, SlotBar)      [Marcell]
              ├── ui/SlotBar.js            (depends on CONFIG)               [Marcell]
              ├── data/unitDefs.js         (plain data — no deps)            [Tomi]
              ├── data/enemyDefs.js        (plain data — no deps)            [Tomi]
              └── data/waves.js            (plain data — no deps)            [Tomi]
```

**Key rule:** Data files (`unitDefs`, `enemyDefs`, `waves`) have **zero imports** — they are pure plain objects. Adding a new enemy type never requires touching any logic file.

---

## Branching & Contribution Guidelines

| Branch | Purpose |
|---|---|
| `main` | Stable, always playable |
| `feature/<name>` | New feature work |
| `fix/<name>` | Bug fixes |
| `art/<name>` | New sprite assets only |

### Commit Message Format

```
<type>(<scope>): <short description>

Examples:
feat(enemy): add grunt melee enemy definition
fix(projectile): correct hit-detection radius for archer
art(sprites): add crossbowman idle & attack sprite sheets
chore(config): tune wave 4 spawn interval
```

---

## Naming & Code Style

| Convention | Rule |
|---|---|
| Classes | `PascalCase` — e.g. `WaveManager`, `SpriteLoader` |
| Methods / variables | `camelCase` — e.g. `takeDamage`, `laneIndex` |
| Private methods | `_camelCase` — e.g. `_fireProjectile`, `_drawHealthBar` |
| Constants | `UPPER_SNAKE_CASE` — e.g. `CONFIG.CELL_SIZE`, `UNIT_DEFS` |
| Config keys | `camelCase` — e.g. `attackSpeed`, `effectOnHit` |
| Asset filenames | `type_Label_state.png` — e.g. `ally_Archer_idle.png` |

**No magic numbers** — always reference `CONFIG.*`.  
**No global variables** — everything lives on the `Game` instance or is passed as arguments.  
**Functions max ~20 lines** — extract if longer.
