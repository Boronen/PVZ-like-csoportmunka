# 🔄 Prophecy — Workflow & Team Roles

> Describes who does what, how the project is structured, and how development has progressed.

---

## Table of Contents

1. [Team Members & Roles](#team-members--roles)
2. [Project Workflow](#project-workflow)
3. [Development Progress](#development-progress)
4. [Module Dependency Map](#module-dependency-map)
5. [Branching & Contribution Guidelines](#branching--contribution-guidelines)
6. [Naming & Code Style](#naming--code-style)

---

## Team Members & Roles

### 🛠️ Tomi — Core Systems & Game Architecture

**Responsibilities:**
- `Enemy` class — movement, targeting, attack logic, boss mode, sound hooks, flipX
- `Player` class — HP, money, slots, cooldowns
- `Unit` class — placement, combat, animation state
- `Grid` system — occupancy map, coordinate helpers
- `WaveManager` — PVZ burst spawning, faction-scoped wave sets, progress bar data
- `Effect` system — status conditions
- `CONFIG.js` — all tunable constants
- Data definitions: `enemyDefs.js`, `unitDefs.js`, `waves.js`

---

### 💻 Kevin — AI-assisted Development & Advanced Features

**Responsibilities:**
- `Game` — main controller, faction selection, preload, `timeScale` speed control
- `Projectile` — travel, animated sprite support, `spriteScale`
- `EventEmitter`, `SpriteLoader` utilities
- `Animator.js`, `drawFrame.js`, `SoundPlayer.js` refactor utilities
- `index.html` — layout, CSS, responsive mobile styles, in-game settings panel
- `src/main.js` — intro sequence, menu buttons, faction screen, music system, settings sync
- `debug.html` — animation viewer + spawn arena
- Bug fixes, debugging, AI-assisted code generation

---

### 🎨 Marcell — Art, Visual Code & Animation

**Art responsibilities:**
- All unit sprites (`assets/sprites/allies/`)
- All enemy sprites (`assets/sprites/enemies/`)
- UI assets (`assets/ui/`)
- Background and logo assets
- Sprite sheet layout definitions (communicates cols/rows/total to Tomi for data defs)

**Coding responsibilities:**
- `UI.js` — HUD: HP bar, money counter, PVZ wave progress bar
- `SlotBar.js` — 6-slot bar, cooldown overlay, cost badge, selected highlight
- `draw()` methods in `Unit`, `Enemy`, `Projectile`, `Grid`

---

## Project Workflow

### Adding a New Enemy

```
Marcell draws sprite sheet(s)
        │
        ▼
Delivers to: assets/sprites/enemies/
  <enemy>_moving.png  (or individual PNG folder)
  <enemy>_attack.png
  + measured frame layout: cols × rows × total frames
        │
        ▼
Tomi adds entry to src/data/enemyDefs.js:
  {
    key, label, faction, hp, movementSpeed,
    attackSpeed, damage, range, reward,
    idleSprite, attackSprite,
    idleFrames: { cols, rows, total, rowIndex? },
    attackFrames: { cols, rows, total, rowIndex? },
    drawSize?,        // optional: px bounding box
    drawOffsetX?,     // optional: anchor shift
    flipX?,           // optional: horizontal mirror
    useIndividualFrames?,  // optional: array-of-PNG mode
    sounds?,          // optional: { spawn, move, melee, ranged }
    onAttack, effectOnHit
  }
        │
        ▼
Tomi adds defKey to appropriate wave pool in src/data/waves.js
        │
        ▼
Kevin tests in-game via debug.html, adjusts stats
```

### Adding a New Unit

```
Marcell draws sprite sheet(s)
        │
        ▼
Delivers to: assets/sprites/allies/
  ally_<Name>_idle.png
  ally_<Name>_attack.png
  + frame layout
        │
        ▼
Tomi adds entry to src/data/unitDefs.js:
  {
    key, label, hp, attackSpeed, damage, range, cost, cooldown,
    idleSprite, attackSprite,
    idleFrames, attackFrames,
    drawSize?,
    onAttack: 'melee' | 'projectile',
    effectOnHit,
    projectileSprite?,   // optional animated projectile
    projectileFrames?,
    projectileScale?,
  }
        │
        ▼
Unit auto-appears in slots via Game._setupSlots()
        │
        ▼
Kevin tests + tunes in-game
```

### Adding a New Faction

```
1. Marcell creates enemy sprites for the faction
2. Tomi adds enemy defs in enemyDefs.js with { faction: 'myfaction' }
3. Tomi adds wave entries in waves.js with { faction: 'myfaction' }
4. Kevin adds music paths to FACTION_PLAYLIST in main.js
5. Kevin adds faction button to #faction-screen in index.html
```

---

## Development Progress

### Phase 1 — Foundation ✅

| Task | Owner | Status |
|---|---|---|
| Project structure & ES module system | Kevin | ✅ |
| Canvas setup & game loop | Kevin | ✅ |
| `CONFIG.js` constants | Tomi | ✅ |
| `Grid` — occupancy map + coordinate helpers | Tomi | ✅ |
| `Player` — HP, money, slots, cooldowns | Tomi | ✅ |
| `EventEmitter`, `SpriteLoader` utilities | Kevin | ✅ |

### Phase 2 — Core Gameplay ✅

| Task | Owner | Status |
|---|---|---|
| `Unit` class — placement, combat, animation | Tomi | ✅ |
| `Enemy` class — movement, attack, blocking | Tomi | ✅ |
| `Projectile` — travel + hit detection | Kevin | ✅ |
| `Effect` — slow status condition | Tomi | ✅ |
| `WaveManager` — wave sequencing, spawn queue | Tomi | ✅ |
| `unitDefs.js` — Soldier, Archer | Tomi | ✅ |
| `enemyDefs.js` — Slade | Tomi | ✅ |
| `waves.js` — 4 legacy waves | Tomi | ✅ |

### Phase 3 — UI & Visual Polish ✅

| Task | Owner | Status |
|---|---|---|
| `UI.js` — HUD: HP bar, money, wave progress bar | Marcell | ✅ |
| `SlotBar.js` — 6 slots, cooldown, cost badge | Marcell | ✅ |
| `draw()` methods — Unit, Enemy, Projectile, Grid | Marcell | ✅ |
| PVZ-style wave progress bar | Marcell | ✅ |
| Win / Lose overlay | Kevin | ✅ |
| Pause / resume (P key + button) | Kevin | ✅ |
| Stone floor + isometric grid render | Marcell | ✅ |

### Phase 4 — Enemy Factions ✅

| Task | Owner | Status |
|---|---|---|
| Faction system design + data model | Tomi / Kevin | ✅ |
| Undead faction: Skeleton | Tomi + Marcell | ✅ |
| Undead faction: Rex (fast dog) | Tomi + Marcell | ✅ |
| Undead faction: Jozsi (boss, 3-mode) | Tomi + Marcell | ✅ |
| Egypt faction: Bringer of Death (individual PNG frames) | Tomi + Marcell | ✅ |
| Faction selection screen | Kevin | ✅ |
| Faction-scoped wave sets (12 waves total) | Tomi | ✅ |

### Phase 5 — Advanced Ally Units ✅

| Task | Owner | Status |
|---|---|---|
| Arcana Archer (shared spritesheet, rowIndex) | Tomi + Marcell | ✅ |
| Wizard (horizontal strip, animated projectile 1.6×) | Tomi + Marcell | ✅ |
| Goblin (bomb projectile, 19 frames) | Tomi + Marcell | ✅ |
| Animated projectile sprites | Kevin | ✅ |
| `projectileScale` multiplier | Kevin | ✅ |

### Phase 6 — Audio & Intro ✅

| Task | Owner | Status |
|---|---|---|
| Logo intro sequence (audio `timeupdate`-synced) | Kevin | ✅ |
| Main menu image-buttons + red hover tint | Kevin | ✅ |
| Menu background GIF | Marcell | ✅ |
| Team logo bottom-right corner | Kevin / Marcell | ✅ |
| Dual-track faction music playlist | Kevin | ✅ |
| Enemy SFX (Jozsi, Rex via `SoundPlayer`) | Tomi / Kevin | ✅ |
| In-game settings panel (volume + speed) | Kevin | ✅ |
| Settings sliders synced across both panels | Kevin | ✅ |

### Phase 7 — OOP Refactor & Architecture ✅

| Task | Owner | Status |
|---|---|---|
| `Animator.js` utility | Kevin | ✅ |
| `drawFrame.js` utility | Kevin | ✅ |
| `SoundPlayer.js` utility | Kevin | ✅ |
| Refactor `Unit` + `Enemy` to use shared utils | Kevin | ✅ |
| `Game._collectPreloadSrcs()` cleanup | Kevin | ✅ |
| `Player._canAfford()` + `_startCooldown()` helpers | Kevin | ✅ |
| `UI` layout constant getters | Kevin / Marcell | ✅ |
| `WaveManager` JSDoc + PVZ burst spawning | Kevin | ✅ |

### Phase 8 — Mobile & Polish ✅

| Task | Owner | Status |
|---|---|---|
| Touch event support (`touchstart` → `_handleCanvasClick`) | Kevin | ✅ |
| Responsive canvas (CSS `width: 100%; height: auto`) | Kevin | ✅ |
| iOS scroll/zoom prevention | Kevin | ✅ |
| `SlotBar` enlarged touch targets (`HIT_PADDING = 8`) | Kevin | ✅ |
| Media query layouts (640 px, 480 px) | Kevin | ✅ |
| Asset folder reorganisation (`sprites/`, `sounds/`, `ui/`) | Kevin | ✅ |
| `debug.html` animation viewer + spawn arena | Kevin | ✅ |
| `README.md` + `PLAN.md` + `WORKFLOW.md` updated | Kevin | ✅ |

### Phase 9 — Water Faction & Extended Content 🔲

| Task | Owner | Status |
|---|---|---|
| Water faction enemy designs | Marcell | 🔲 Planned |
| Water faction enemy defs + waves | Tomi | 🔲 Planned |
| Crossbowman, Mage, Knight units | Marcell / Tomi | 🔲 Planned |
| `burn`, `stun`, `weaken` effects | Tomi | 🔲 Planned |
| AoE splash projectile | Kevin | 🔲 Planned |
| Unit death animations | Marcell | 🔲 Planned |
| Particle system (death/hit bursts) | Marcell | 🔲 Planned |
| Save/load progress (localStorage) | Kevin | 🔲 Planned |

---

## Module Dependency Map

```
index.html
  └── src/main.js                ← Kevin: intro, menu, music, faction select
        └── Game.js              ← Kevin: loop, faction filter, preload
              ├── utils/CONFIG.js          (no deps)
              ├── utils/EventEmitter.js    (no deps)
              ├── utils/SpriteLoader.js    (no deps)
              ├── utils/Animator.js        (no deps)   ← shared by Unit + Enemy
              ├── utils/drawFrame.js       (CONFIG)    ← shared by Unit + Enemy
              ├── utils/SoundPlayer.js     (no deps)   ← used by Enemy
              ├── Grid.js                  (CONFIG)
              ├── Player.js                (CONFIG)
              ├── Unit.js                  (CONFIG, Projectile, Animator, drawFrame)
              ├── Enemy.js                 (CONFIG, Effect, Projectile, Animator, drawFrame, SoundPlayer)
              ├── Projectile.js            (CONFIG, Effect)
              ├── Effect.js                (no deps)
              ├── WaveManager.js           (CONFIG, Enemy, ENEMY_DEFS)
              ├── ui/UI.js                 (CONFIG, SlotBar)
              ├── ui/SlotBar.js            (CONFIG)
              ├── data/unitDefs.js         (no imports — pure data)
              ├── data/enemyDefs.js        (no imports — pure data)
              └── data/waves.js            (no imports — pure data)
```

**Key rule:** Data files (`unitDefs`, `enemyDefs`, `waves`) have **zero imports**. Adding new types never requires touching logic files.

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
<type>(<scope>): <description>

Types: feat  fix  art  refactor  chore  docs

Examples:
feat(faction): add water faction enemies and waves
fix(enemy): clamp Jozsi HP bar to game area
art(sprites): add Skeleton_enemy_moving.png (13-frame strip)
chore(audio): update sound paths to assets/sounds/
docs(readme): update roadmap for Phase 9
```

---

## Naming & Code Style

| Convention | Rule |
|---|---|
| Classes | `PascalCase` — `WaveManager`, `SoundPlayer` |
| Methods / variables | `camelCase` — `takeDamage`, `laneIndex` |
| Private | `_camelCase` — `_fireProjectile`, `_drawHealthBar` |
| Constants | `UPPER_SNAKE_CASE` — `CONFIG.CELL_SIZE`, `UNIT_DEFS` |
| Config keys | `camelCase` — `attackSpeed`, `drawSize`, `flipX` |
| Sprite assets | `type_Label_state.png` — `Skeleton_enemy_moving.png` |
| Sound assets | `subject_action.mp3` — `jozsi_smash_v2.mp3` |

**No magic numbers** — always reference `CONFIG.*`.  
**No global state** — everything lives on the `Game` instance.  
**Functions max ~20 lines** — extract private helpers if longer.  
**One responsibility per method** — `_canAfford()`, `_startCooldown()`, not one big `placeUnit()`.
