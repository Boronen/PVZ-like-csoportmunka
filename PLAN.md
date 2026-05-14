# 📋 Garden Defense — Development Plan

> This document describes planned features, future enemy / unit types, sprite requirements, and design guidelines for the next phases of the project.

---

## Table of Contents

1. [Current State](#current-state)
2. [Planned Enemy Types](#planned-enemy-types)
3. [Planned Unit Types](#planned-unit-types)
4. [Sprite & Animation Requirements](#sprite--animation-requirements)
5. [Effect System Extensions](#effect-system-extensions)
6. [Wave Design Roadmap](#wave-design-roadmap)
7. [UI / UX Improvements](#ui--ux-improvements)
8. [Technical Backlog](#technical-backlog)

---

## Current State

### Implemented ✅

| Feature | Status |
|---|---|
| Continuous-world grid (10 × 5, 80 px cells) | ✅ Done |
| Unit placement with cooldown + cost system | ✅ Done |
| Enemy movement (float px/s) with lane targeting | ✅ Done |
| Projectile system (directional, lane-locked) | ✅ Done |
| Status effect system (`slow`, extensible) | ✅ Done |
| Wave manager (weighted pool, random lanes) | ✅ Done |
| Sprite sheet animation (idle / attack states) | ✅ Done |
| HUD: HP bar, money counter, wave counter | ✅ Done |
| 6-slot unit selection bar with cooldown overlay | ✅ Done |
| Pause / resume (`P` key) | ✅ Done |
| Win / Lose overlay | ✅ Done |

### Current Units

| Key | Type | Attack | Cost |
|---|---|---|---|
| `soldier` | Melee | 40 dmg, 1.5/s | $100 |
| `archer` | Projectile | 25 dmg, 1.0/s | $125 |

### Current Enemies

| Key | Type | HP | Speed |
|---|---|---|---|
| `slade` | Ranged projectile | 120 | 50 px/s |

---

## Planned Enemy Types

All new enemies are **data-only additions** — no new JS class files needed. Each entry goes into [`src/data/enemyDefs.js`](src/data/enemyDefs.js).

### Tier 1 — Basic Enemies

| Key | Label | HP | Speed (px/s) | Damage | Attack | Reward | Special |
|---|---|---|---|---|---|---|---|
| `grunt` | Grunt | 80 | 55 | 15 | Melee | 15 | Fast, low HP |
| `shieldBearer` | Shield Bearer | 300 | 35 | 25 | Melee | 40 | High HP tank |
| `scout` | Scout | 60 | 90 | 10 | Melee | 20 | Very fast runner |

### Tier 2 — Mid-Game Enemies

| Key | Label | HP | Speed (px/s) | Damage | Attack | Reward | Special |
|---|---|---|---|---|---|---|---|
| `bomber` | Bomber | 150 | 45 | 30 | Projectile | 35 | Lobs AoE bomb |
| `armored` | Armored Soldier | 400 | 30 | 20 | Melee | 60 | Damage resistance |
| `sprinter` | Sprinter | 100 | 120 | 12 | Melee | 30 | Fastest enemy |

### Tier 3 — Late-Game / Boss Enemies

| Key | Label | HP | Speed (px/s) | Damage | Attack | Reward | Special |
|---|---|---|---|---|---|---|---|
| `commander` | Commander | 500 | 40 | 35 | Projectile | 100 | Buffs nearby enemies |
| `tank` | Heavy Tank | 800 | 20 | 50 | Melee | 150 | Boss unit |
| `freezer` | Freezer | 200 | 35 | 10 | Projectile | 75 | Applies `slow` effect on hit |

### Sprite Requirements per Enemy

Each enemy needs **two sprite sheets** (saved to `assets/`):

```
assets/enemy_<Key>_moving.png    ← idle / walking animation
assets/enemy_<Key>_shooting.png  ← attack animation (or melee swing)
```

Frame layout example (same as current `slade`):

```js
idleFrames:   { cols: 5, rows: 1, total: 4 }
attackFrames: { cols: 5, rows: 3, total: 14 }
```

> Marcell is responsible for drawing and animating all enemy and unit sprites.  
> See [WORKFLOW.md](WORKFLOW.md) for role assignments.

---

## Planned Unit Types

All new units are **data-only additions** in [`src/data/unitDefs.js`](src/data/unitDefs.js).

| Key | Label | HP | Cost | Damage | Range | Attack | Special |
|---|---|---|---|---|---|---|---|
| `crossbowman` | Crossbowman | 120 | 150 | 35 | 500 | Projectile | Long range sniper |
| `mage` | Mage | 80 | 200 | 20 | 380 | Projectile | Applies `slow` on hit |
| `knight` | Knight | 350 | 175 | 50 | 85 | Melee | High HP frontliner |
| `catapult` | Catapult | 150 | 250 | 60 | 320 | Projectile (AoE) | Area damage |
| `healer` | Healer | 100 | 175 | 0 | 80 | None | Restores HP of adjacent units |

---

## Sprite & Animation Requirements

### Naming Convention

```
assets/ally_<Label>_idle.png
assets/ally_<Label>_attack.png
```

### Animation Frame Format

Sprite sheets are loaded as single flat PNG images. The engine reads frames by splitting the image into a grid:

```js
idleFrames:   { cols: <N>, rows: <M>, total: <frames> }
attackFrames: { cols: <N>, rows: <M>, total: <frames> }
```

- Recommended frame size: **96 × 96 px** per frame
- Recommended animation speed: **10 FPS** (set via `CONFIG.UNIT_ANIM_FPS` / `CONFIG.ENEMY_ANIM_FPS`)
- Enemy sprites must **already face left** (they move left; no horizontal flip is applied)
- Unit sprites must **face right** (they attack rightward)

### Asset Checklist

| Asset | Responsible | Status |
|---|---|---|
| `ally_Soldier_idle.png` | Marcell | ✅ Done |
| `ally_Soldier_attack.png` | Marcell | ✅ Done |
| `ally_Archer_idle.png` | Marcell | ✅ Done |
| `ally_Archer_Shot.png` | Marcell | ✅ Done |
| `enemy_Slade_moving.png` | Marcell | ✅ Done |
| `enemy_Slade_shooting.png` | Marcell | ✅ Done |
| `ally_Crossbowman_idle.png` | Marcell | 🔲 Planned |
| `ally_Crossbowman_attack.png` | Marcell | 🔲 Planned |
| `ally_Mage_idle.png` | Marcell | 🔲 Planned |
| `ally_Mage_attack.png` | Marcell | 🔲 Planned |
| `ally_Knight_idle.png` | Marcell | 🔲 Planned |
| `ally_Knight_attack.png` | Marcell | 🔲 Planned |
| `enemy_Grunt_moving.png` | Marcell | 🔲 Planned |
| `enemy_Grunt_shooting.png` | Marcell | 🔲 Planned |
| `enemy_ShieldBearer_moving.png` | Marcell | 🔲 Planned |
| `enemy_ShieldBearer_shooting.png` | Marcell | 🔲 Planned |
| `enemy_Bomber_moving.png` | Marcell | 🔲 Planned |
| `enemy_Bomber_shooting.png` | Marcell | 🔲 Planned |
| `enemy_Tank_moving.png` | Marcell | 🔲 Planned |
| `enemy_Tank_shooting.png` | Marcell | 🔲 Planned |

---

## Effect System Extensions

The [`Effect`](src/Effect.js) class supports composable status conditions. Currently only `slow` is implemented. Planned extensions:

| Type | `magnitude` | `tickInterval` | Description |
|---|---|---|---|
| `slow` | 0.0–1.0 (fraction) | 0 | Reduces `movementSpeed` by `magnitude * 100%` |
| `burn` | dmg per tick | 500 ms | Deals damage every `tickInterval` ms |
| `stun` | — | — | Sets `movementSpeed = 0` for `duration` ms |
| `weaken` | 0.0–1.0 | 0 | Reduces outgoing `damage` by `magnitude * 100%` |

To implement `burn`, extend the `_tick()` method in [`src/Effect.js`](src/Effect.js):

```js
_tick() {
  if (this.type === 'burn') {
    this._target.takeDamage(this.magnitude);
  }
}
```

---

## Wave Design Roadmap

| Wave | Enemies | Notes |
|---|---|---|
| 1 | 6× Slade | Tutorial — slow, ranged only |
| 2 | 10× Slade | More pressure |
| 3 | 15× Slade | Dense swarm |
| 4 | 8× Slade + 4× Grunt | First melee mix |
| 5 | 10× Grunt + 4× ShieldBearer | Tank introduction |
| 6 | 12× Scout + 6× Slade | Speed + range combo |
| 7 | 6× Bomber + 8× Grunt | AoE threat |
| 8 | 10× Armored + 5× Freezer | Damage reduction + slows |
| 9 | 20× mixed | High density swarm |
| 10 | 1× Tank + escort | Boss wave |

---

## UI / UX Improvements

- [ ] Animated unit portraits in slot bar
- [ ] Wave incoming countdown banner
- [ ] Enemy HP labels (show number on hover)
- [ ] "Fast Forward" (2× speed) toggle
- [ ] Sound effects for attacks, placement, death
- [ ] Background music loop
- [ ] Animated particle effects on death

---

## Technical Backlog

- [ ] AoE projectile (damages all enemies in radius on impact)
- [ ] Splash damage radius in `Projectile`
- [ ] `healer` unit: periodic HP restore for nearby allies
- [ ] Enemy "rush" behaviour (ignore units, aim straight for base)
- [ ] Save / load wave progress (localStorage)
- [ ] Mobile touch support
