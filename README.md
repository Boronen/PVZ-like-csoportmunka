# ⚔️ Prophecy — Tower Defense

> A browser-based PVZ-style tower defense game built in **vanilla JavaScript** (ES6+) with HTML5 Canvas. Features three enemy factions, animated sprite heroes, boss enemies, a dual-track music system, full mobile touch support, and a PVZ-inspired wave progress bar.  
> **Tech:** Pure OOP · No libraries · ES Modules · HTML5 Canvas

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Team & Roles](#team--roles)
3. [Gameplay Specification](#gameplay-specification)
4. [Architecture & Class Design](#architecture--class-design)
5. [Class Reference](#class-reference)
6. [Utility Modules](#utility-modules)
7. [Data Definitions](#data-definitions)
8. [Enemy Factions](#enemy-factions)
9. [Ally Units](#ally-units)
10. [Wave System](#wave-system)
11. [Audio System](#audio-system)
12. [File Structure](#file-structure)
13. [Programming Guidelines](#programming-guidelines)
14. [Roadmap](#roadmap)

---

## Project Overview

**Prophecy** is a PVZ-style tower defense game. The player places defensive **Ally Units** on a 10×5 grid to stop enemy factions from reaching the ancient tree on the left. Enemies spawn from the right, travel leftward along horizontal lanes, and attack units blocking their path.

### Key Features

| Feature | Status |
|---|---|
| Three enemy factions (Undead, Egypt, Water placeholder) | ✅ |
| Faction selection screen before each game | ✅ |
| Boss enemy (Jozsi — 3-mode: move / ranged / melee) | ✅ |
| Individual-frame enemy rendering (Bringer of Death) | ✅ |
| PVZ-style wave progress bar | ✅ |
| PVZ-style burst spawning (random rushes) | ✅ |
| Animated logo intro sequence with music sync | ✅ |
| Main menu image-buttons with hover red tint | ✅ |
| Dual-track faction music playlist | ✅ |
| In-game settings panel (volume + speed) visible while paused | ✅ |
| Animated projectile sprites (Wizard, Arcana Archer, Goblin bomb) | ✅ |
| `drawSize` + proportional sprite scaling | ✅ |
| `flipX` horizontal mirror for facing direction | ✅ |
| OOP refactor with shared `Animator`, `drawFrame`, `SoundPlayer` utilities | ✅ |
| Full mobile touch support + responsive canvas | ✅ |
| Debug animation viewer + spawn arena (`debug.html`) | ✅ |

---

## Team & Roles

| Person | Role | Responsibilities |
|---|---|---|
| **Tomi** | Core Systems & Game Design | `Enemy`, `Player`, `Unit` logic, `Grid`, `WaveManager`, `Effect`, data definitions, `CONFIG` |
| **Kevin** | AI-assisted Development & Advanced Features | `Game`, `Projectile`, `EventEmitter`, `SpriteLoader`, `index.html`, `main.js`, refactor utilities |
| **Marcell** | Art, Visual Code & Animation | `UI`, `SlotBar`, all `draw()` methods, all sprite sheets, background art |

---

## Gameplay Specification

### Objective

Prevent enemies from crossing the board and reaching the base (Ancient Tree).
- Base starts at **100 HP**.
- Each enemy that reaches `x < CONFIG.BASE_X` deals damage and disappears.
- **Win** when all waves are cleared and no enemies remain.
- **Lose** when base HP drops to 0.

### The Board

```
World space (pixels)
  x →  0       80      160     ...    720     800
  y ↓  ┌───────┬───────┬───────┬──────┬───────┐
  0    │🌳BASE │       │  [U]  │      │       │  ← lane 0
       │       │       │       │      │  👾──► │
  80   ├───────┼───────┼───────┼──────┼───────┤
       │🌳BASE │       │       │ [U]  │       │  ← lane 1
  160  ├───────┼───────┼───────┼──────┼───────┤
       │🌳BASE │       │       │      │ 💀──► │  ← lane 2
  240  ├───────┼───────┼───────┼──────┼───────┤
  320  ├───────┼───────┼───────┼──────┼───────┤
       │🌳BASE │       │ [U]   │      │ 🏺──► │  ← lane 3
  400  └───────┴───────┴───────┴──────┴───────┘
       ─────────────── UI Panel (160 px) ────────────
  560
```

### Key Constants (`CONFIG.js`)

| Constant | Value | Meaning |
|---|---|---|
| `CELL_SIZE` | 80 px | Grid cell size |
| `COLS` | 10 | Grid columns |
| `ROWS` | 5 | Lanes |
| `BASE_X` | 80 px | Enemy threshold for base damage |
| `CANVAS_WIDTH` | 800 px | Total canvas width |
| `CANVAS_HEIGHT` | 560 px | Total canvas height |
| `GAME_AREA_HEIGHT` | 400 px | Playfield (5 × 80 px) |
| `UI_HEIGHT` | 160 px | Bottom HUD panel |
| `STARTING_MONEY` | 150 | Starting money |
| `BASE_HP` | 100 | Starting base HP |
| `PROJECTILE_SPEED` | 600 px/s | Default projectile speed |
| `UNIT_ANIM_FPS` | 10 | Unit animation framerate |
| `ENEMY_ANIM_FPS` | 10 | Enemy animation framerate |

### Controls

| Input | Action |
|---|---|
| Click a slot (bottom bar) | Select unit type |
| `1`–`6` keys | Select slot by number |
| Click the canvas (game area) | Place selected unit |
| `P` key | Pause / Resume |
| Touch (mobile) | Full touch support — tap slots, tap grid |
| ⚙ button (in-game) | Toggle in-game settings panel |

### Player Resources

| Resource | Start | Notes |
|---|---|---|
| Base HP | 100 | Reduced when an enemy passes `BASE_X` |
| Money | 150 | Spent on placing units; +5/s passive income |
| Slots | 6 | Populated from `UNIT_DEFS` |
| Cooldowns | 6 timers | One per slot; seconds countdown |

---

## Architecture & Class Design

### Class Hierarchy

```
Game                     ← Main controller; owns all subsystems
├── Grid                 ← 2D occupancy map + coordinate helpers
├── Player               ← Base HP, money, slots, cooldowns
├── WaveManager          ← Wave sequencing, PVZ burst spawn queue
├── Unit[]               ← Ally units (data-driven, one concrete class)
├── Enemy[]              ← Enemy units (data-driven, boss logic included)
├── Projectile[]         ← Travelling attack objects (animated sprite support)
├── Effect               ← Status conditions applied to enemies
├── UI                   ← HUD rendering (HP bar, money, wave progress bar)
│   └── SlotBar          ← 6-slot selection bar with cooldown overlay
└── EventEmitter         ← Pub/sub event bus

Utility modules (no game logic):
├── CONFIG               ← All constants and derived helpers
├── SpriteLoader         ← Async image cache
├── Animator             ← Shared frame-advance helpers (createAnim, advanceFrame)
├── drawFrame            ← Shared sprite-frame renderer (drawSpriteFrame)
└── SoundPlayer          ← Per-entity audio cache helper (play, playLimited)
```

**No inheritance. No abstract classes.** All type variation is data — add entries to `UNIT_DEFS` / `ENEMY_DEFS`, no new JS files needed.

---

## Class Reference

### [`Game`](src/Game.js)

Main controller. Accepts `{ faction }` option to select enemy faction.

| Method | Description |
|---|---|
| `preload()` | Loads all sprite/projectile assets for the chosen faction |
| `start()` | Begins game loop and first wave |
| `pause()` / `resume()` | Toggles state |
| `gameLoop(ts)` | `requestAnimationFrame` callback — applies `timeScale` for speed control |
| `update(dt)` | Ticks all systems, runs cleanup and game-over check |
| `render()` | Background → grid → tree → units → enemies → projectiles → HUD |
| `handleEnemyDeath(e)` | Awards money, increments `waveManager.enemiesDefeatedThisWave` |
| `_collectPreloadSrcs()` | Builds deduplicated asset load list |
| `_collectEnemySrcs()` | Faction-filtered enemy sprite list |

---

### [`Grid`](src/Grid.js)

Logical occupancy map. Does **not** constrain movement.

| Method | Description |
|---|---|
| `snapToCell(px, py)` | Returns `{ worldX, worldY, col, row }` — snapped to cell center |
| `place(col, row, unit)` | Marks cell as occupied |
| `remove(col, row)` | Clears cell |
| `draw(ctx)` | Draws isometric-style stone floor + orange grid lines + danger zone |

---

### [`Player`](src/Player.js)

| Method | Description |
|---|---|
| `selectSlot(i)` | Toggles slot selection |
| `placeUnit(x, y, grid, game)` | Validates via `_canAfford` + `_startCooldown` helpers |
| `takeDamage(n)` | Reduces `baseHp` (min 0) |
| `earnMoney(n)` | Increases `money` |
| `update(dt)` | Ticks all slot cooldowns |

---

### [`Unit`](src/Unit.js)

Single concrete ally class. Uses `Animator` + `drawSpriteFrame` utilities.

| Config property | Effect |
|---|---|
| `onAttack` | `'melee'` or `'projectile'` |
| `drawSize` | Target bounding box px (proportional scaling) |
| `projectileSprite` / `projectileFrames` | Animated projectile sprite |
| `projectileScale` | Size multiplier for projectile sprite |
| `rowIndex` | Fixed row override for shared spritesheets |

---

### [`Enemy`](src/Enemy.js)

Single concrete enemy class. Supports boss logic, sound hooks, flip, offset.

| Config property | Effect |
|---|---|
| `isBoss: true` | Enables 3-mode behaviour (move/ranged/melee) |
| `drawSize` | Proportional scaling bounding box |
| `drawOffsetX/Y` | Render anchor shift |
| `flipX: true` | Horizontal mirror (for right-facing sprites) |
| `useIndividualFrames` | Array-of-PNG animation mode |
| `sounds` | `{ spawn, move, ranged, melee }` paths → `SoundPlayer` |

---

### [`Projectile`](src/Projectile.js)

`direction = 1` → right (unit shot); `direction = -1` → left (enemy shot).

| Constructor option | Effect |
|---|---|
| `sprite` / `frameLayout` | Animated sprite projectile |
| `animFps` | Sprite animation speed |
| `spriteScale` | Size multiplier (e.g. Wizard projectile `1.6×`) |

---

### [`WaveManager`](src/WaveManager.js)

PVZ-style time-based spawning with burst rushes.

| Property | Description |
|---|---|
| `enemiesDefeatedThisWave` | Incremented by `Game.handleEnemyDeath()` |
| `totalEnemiesThisWave` | Set when a wave starts |
| `currentWaveLabel` | `"Wave N / M"` string for progress bar |

`_buildRandomQueue()` generates ~25% burst groups (2–4 enemies 150 ms apart) to create PVZ-style pressure peaks. Spawning is **time-based** — enemies appear on schedule regardless of whether earlier enemies are still alive.

---

### [`UI`](src/ui/UI.js) / [`SlotBar`](src/ui/SlotBar.js)

`UI._drawWaveProgressBar()` renders the PVZ-style red fill bar with 🧟 icon at the progress head and wave label below. Layout constants extracted to `_hpBarLayout` and `_waveBarLayout` getters.

`SlotBar.hitTest()` uses `HIT_PADDING = 8` to expand tap targets for mobile.

---

## Utility Modules

### [`src/utils/Animator.js`](src/utils/Animator.js)

Shared frame-timing helpers used by both `Unit` and `Enemy`.

```js
createAnim(fps)              → { frameIndex, frameTimer, frameDuration }
advanceFrame(anim, layout)   → mutates anim in place
resetAnim(anim)              → resets to frame 0
```

### [`src/utils/drawFrame.js`](src/utils/drawFrame.js)

Single source-of-truth sprite renderer.

```js
drawSpriteFrame(ctx, sprite, layout, frameIndex, x, y, drawSize, offsetX, offsetY, flipX)
```

Features: proportional fit-inside scaling, `rowIndex` row override, `flipX` horizontal mirror.

### [`src/utils/SoundPlayer.js`](src/utils/SoundPlayer.js)

Per-entity audio cache.

```js
this._sfx = new SoundPlayer(config.sounds ?? {});
this._sfx.play('spawn', 0.65);
this._sfx.playLimited('melee', 0.7, 2000);  // auto-stops after 2 s
```

---

## Data Definitions

### Ally Units (`src/data/unitDefs.js`)

| Key | Label | HP | Cost | Damage | Range | Attack |
|---|---|---|---|---|---|---|
| `soldier` | Soldier | 200 | $100 | 40 | 85 px | Melee |
| `archer` | Archer | 100 | $125 | 25 | 420 px | Projectile |
| `arcanaArcher` | Arcana Archer | 100 | $150 | 30 | 460 px | Projectile (animated) |
| `wizard` | Wizard | 120 | $175 | 35 | 400 px | Projectile (animated, 1.6× size) |
| `goblin` | Goblin | 80 | $75 | 20 | 200 px | Projectile (Bomb_sprite) |

### Enemy Factions (`src/data/enemyDefs.js`)

See [Enemy Factions](#enemy-factions) below.

### Wave Structure (`src/data/waves.js`)

```js
{
  wave: 1,
  faction: 'undead',        // filters to this faction's wave set
  totalEnemies: 6,
  spawnInterval: 3000,      // ms between spawn groups
  pool: [
    { defKey: 'skeleton', weight: 3 },
    { defKey: 'rex',      weight: 1 },
  ]
}
```

---

## Enemy Factions

Each game starts with the player selecting a faction on the **Faction Selection Screen**.

### 💀 Undead (4 waves)

| Key | Label | HP | Speed | Damage | Special |
|---|---|---|---|---|---|
| `skeleton` | Skeleton | 110 | 55 | 22 | 13-frame sprite, `flipX` |
| `rex` | Rex | 90 | **160** | 18 | Fastest enemy; spawn/run sounds |
| `jozsi` | Jozsi (Boss) | 800 | 30 | 55 | 3 sprites: move/ranged/melee; raven projectile; drawSize 320 |

Music: `main_theme_faction_undead.mp3` → `main_theme_faction_undead_v2.mp3`

### 🏺 Egypt (4 waves)

| Key | Label | HP | Speed | Damage | Special |
|---|---|---|---|---|---|
| `bringerOfDeath` | Bringer of Death | 350 | 40 | 45 | Individual PNG frames (8 walk + 10 attack) |

Music: `main_theme_faction_egypt.mp3` → `main_theme_faction_egypt_v2.mp3`

### 🌊 Water (reserved)

Music: `main_theme_faction_water.mp3`

### 🌿 Legacy / Classic (4 waves)

| Key | Label | HP | Speed | Damage | Special |
|---|---|---|---|---|---|
| `slade` | Slade | 120 | 50 | 20 | Original ranged enemy (projectile) |

---

## Wave System

- Waves are **faction-scoped** — `WaveManager` is initialised with `WAVES.filter(w => w.faction === faction)`.
- Spawning is **time-based**: enemies appear at scheduled `spawnAt` timestamps regardless of living enemies.
- **Burst mechanic**: ~25% chance per spawn group creates 2–4 enemies 150 ms apart (PVZ flag rush effect).
- Between waves: **5-second pause** then next wave starts automatically.
- Progress tracked by `enemiesDefeatedThisWave / totalEnemiesThisWave` → rendered as the PVZ progress bar.

---

## Audio System

### Intro
- `assets/sounds/logoReveal.mp3` — plays 2 s after page load; logo appears at exactly 7 s (`timeupdate`-driven, not `setTimeout`).

### Main Menu
- `assets/sounds/main_theme_faction_egypt.mp3` — loops as background music on all menu screens.

### In-Game Faction Playlists
Two tracks per faction play sequentially, looping back to track 0 when both finish:

| Faction | Track 0 | Track 1 |
|---|---|---|
| Undead | `main_theme_faction_undead.mp3` | `main_theme_faction_undead_v2.mp3` |
| Egypt | `main_theme_faction_egypt.mp3` | `main_theme_faction_egypt_v2.mp3` |
| Water | `main_theme_faction_water.mp3` | — |

### Enemy SFX (`SoundPlayer`)
- **Jozsi**: `jozsi_moving.mp3`, `jozsi_raven_attack.mp3`, `jozsi_smash_v2.mp3` (auto-stops at 2 s)
- **Rex**: `bones_spawn.mp3` (on spawn), `bones.mp3` (movement, throttled 1.2 s)

### Settings
Music volume and game speed (0.5× – 2×) are adjustable via:
1. Settings screen (accessible from main menu)
2. In-game settings panel (⚙ button during gameplay / pause)

Both panels are kept in sync — changing one updates the other.

---

## File Structure

```
PVZ-like-csoportmunka/
├── index.html                  ← Page layout, CSS, responsive mobile styles
├── debug.html                  ← Animation viewer + spawn arena
├── README.md                   ← This file
├── PLAN.md                     ← Feature roadmap & asset checklist
├── assets/
│   ├── background.jpg          ← In-game background overlay
│   ├── logo.png                ← Team logo (intro + bottom-right corner)
│   ├── htmlbackground.gif      ← Legacy background (unused)
│   ├── effects/                ← VFX spritesheets
│   │   ├── Projectile 2 w blur.png   ← Wizard projectile (16 frames)
│   │   └── ...
│   ├── map/
│   │   ├── Stone_floor.jpg
│   │   └── Tree_main.png
│   ├── sounds/                 ← All .mp3 audio files
│   │   ├── logoReveal.mp3
│   │   ├── main_theme_faction_*.mp3
│   │   ├── jozsi_*.mp3
│   │   ├── bones*.mp3
│   │   └── ...
│   ├── sprites/
│   │   ├── allies/             ← All ally unit sprites
│   │   │   ├── ally_Soldier_idle.png
│   │   │   ├── ally_Soldier_attack.png
│   │   │   ├── ally_archer_idle.png
│   │   │   ├── ally_archer_attack.png
│   │   │   ├── Arcane archer/
│   │   │   │   ├── spritesheet.png
│   │   │   │   └── projectile.png
│   │   │   ├── Wizard Pack/
│   │   │   │   ├── Idle.png
│   │   │   │   └── Attack2.png
│   │   │   └── Monster_Creatures_Fantasy(Version 1.3)/
│   │   │       └── Goblin/
│   │   │           ├── Attack3.png
│   │   │           └── Bomb_sprite.png
│   │   └── enemies/            ← All enemy sprites
│   │       ├── enemy_Jozsi_moving.png
│   │       ├── enemy_Jozsi_ranged_attack.png
│   │       ├── enemy_Jozsi_meele_attack.png
│   │       ├── enemy_Jozsi_raven_ranged_attack.png
│   │       ├── enemy_Rex_moving.png
│   │       ├── enemy_Slade_moving.png
│   │       ├── enemy_Slade_shooting.png
│   │       ├── Skeleton_enemy_moving.png
│   │       ├── Skeleton_enemy_attack.png
│   │       └── Bringer-Of-Death/
│   │           └── Individual Sprite/
│   │               ├── Walk/   ← 8 PNGs
│   │               └── Attack/ ← 10 PNGs
│   └── ui/                     ← Menu buttons, logo, background GIF
│       ├── background.gif
│       ├── game_logo.png
│       ├── main_start_nActive.png / main_start_Active.png
│       ├── main_music_nActive.png / main_music_Active.png
│       └── main_credits_nActive.png / main_credits_Active.png
└── src/
    ├── main.js                 ← Entry point; intro sequence, menu, music
    ├── Game.js                 ← Main controller & game loop
    ├── Grid.js                 ← Occupancy map + isometric floor rendering
    ├── Player.js               ← HP, money, slots, cooldowns
    ├── Unit.js                 ← Ally class (data-driven)
    ├── Enemy.js                ← Enemy class (boss logic, sounds, flipX)
    ├── Projectile.js           ← Travelling attack (animated sprite + scale)
    ├── Effect.js               ← Status conditions (slow, extensible)
    ├── WaveManager.js          ← Wave sequencing, PVZ burst spawning
    ├── ui/
    │   ├── UI.js               ← HUD: HP bar, money, wave progress bar
    │   └── SlotBar.js          ← 6-slot selection bar (mobile touch targets)
    ├── data/
    │   ├── unitDefs.js         ← UNIT_DEFS (5 units)
    │   ├── enemyDefs.js        ← ENEMY_DEFS (6 enemies, 3 factions)
    │   └── waves.js            ← WAVES (12 waves across 3 factions)
    └── utils/
        ├── CONFIG.js           ← All constants
        ├── EventEmitter.js     ← Pub/sub bus
        ├── SpriteLoader.js     ← Async image cache
        ├── Animator.js         ← Shared frame-timing helpers
        ├── drawFrame.js        ← Shared sprite renderer
        └── SoundPlayer.js      ← Per-entity audio cache
```

---

## Programming Guidelines

### Naming
- Classes: `PascalCase` — methods/variables: `camelCase` — private: `_camelCase` — constants: `UPPER_SNAKE_CASE`

### OOP Rules
- **No inheritance** — `Unit` and `Enemy` are single concrete data-driven classes
- **New types = new data entries** in `unitDefs.js` / `enemyDefs.js`, no new JS files
- **Effects are composable** — stack multiple `Effect` instances on any enemy
- **No global state** — everything lives on `Game` or passed as parameters
- **Events over direct calls** — `EventEmitter` for cross-system signals

### Sprite System
- `drawSize` controls the bounding-box px; frames are scaled proportionally (no squashing)
- `rowIndex` on `idleFrames`/`attackFrames` selects a fixed row from a multi-row shared spritesheet
- `flipX: true` mirrors enemies that face right in their source artwork
- `useIndividualFrames: true` cycles through arrays of individual PNG paths (Bringer of Death)

---

## Roadmap

| Phase | Feature | Status |
|---|---|---|
| 1–6 | Core grid, rendering, game loop, units, enemies, effects | ✅ Done |
| 7 | Faction system (Undead, Egypt, Water) + faction selection screen | ✅ Done |
| 8 | Animated sprites: Jozsi boss, Bringer of Death, Arcana Archer, Wizard, Goblin | ✅ Done |
| 9 | Animated projectiles (Arcana Archer, Wizard, Goblin bomb) | ✅ Done |
| 10 | Logo intro sequence (audio-synced), main menu image buttons | ✅ Done |
| 11 | Dual-track faction music playlist | ✅ Done |
| 12 | In-game settings panel (volume + speed during gameplay) | ✅ Done |
| 13 | PVZ wave progress bar | ✅ Done |
| 14 | PVZ burst spawning (random rushes) | ✅ Done |
| 15 | OOP refactor (Animator, drawFrame, SoundPlayer utilities) | ✅ Done |
| 16 | Mobile touch support + responsive canvas | ✅ Done |
| 17 | Asset folder reorganisation (sprites/, sounds/, ui/) | ✅ Done |
| 18 | Debug viewer (`debug.html`) — animation cards + spawn arena | ✅ Done |
| — | Water faction enemies | 🔲 Planned |
| — | Effects: `burn`, `stun`, `weaken` | 🔲 Planned |
| — | Splash-damage projectiles | 🔲 Planned |
| — | Save/load wave progress (localStorage) | 🔲 Planned |
| — | Unit death animations | 🔲 Planned |

---

*Built with ❤️ by Tomi, Kevin & Marcell · MKT Games*
