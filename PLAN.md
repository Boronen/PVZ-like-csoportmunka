# 📋 Prophecy — Development Plan

> This document tracks the current state, implemented features, and planned extensions for the Prophecy tower-defense game.

---

## Table of Contents

1. [Current State](#current-state)
2. [Enemy Factions](#enemy-factions)
3. [Ally Units](#ally-units)
4. [Sprite & Animation System](#sprite--animation-system)
5. [Audio System](#audio-system)
6. [Wave Design](#wave-design)
7. [UI / UX Features](#ui--ux-features)
8. [Technical Architecture](#technical-architecture)
9. [Effect System](#effect-system)
10. [Asset Checklist](#asset-checklist)
11. [Backlog](#backlog)

---

## Current State

### Implemented ✅

| Feature | Notes |
|---|---|
| Grid (10×5, 80 px cells) | Isometric stone floor, orange grid lines, danger zone |
| Unit placement (cooldown + cost) | 6-slot bar, keyboard shortcuts 1–6 |
| Enemy movement (float px/s, lane-locked) | Physical body blocking, ranged pursuit |
| Projectile system (directional, lane-locked) | Animated sprite support + scale multiplier |
| Status effect system (`slow`) | Extensible; stacks on `enemy.effects[]` |
| Wave manager — PVZ-style | Time-based, burst spawning (~25% rush groups) |
| Wave manager — faction scoping | Each game plays only the selected faction's waves |
| Sprite animation (`Animator` + `drawFrame`) | `drawSize` proportional scaling, `rowIndex`, `flipX` |
| HP bars (units + enemies) | Clamped to canvas, proportional to `drawSize` |
| HUD: base HP bar, money counter | Styled, with colour gradient |
| PVZ-style wave progress bar | Red fill, 🧟 icon, wave label |
| 6-slot unit selection bar | Cooldown overlay, cost badge, selected border |
| Pause / resume (`P` key + button) | Full state preservation |
| Win / Lose overlay | Win 🏆, Lose 💀 |
| Boss enemy (Jozsi) | 3-mode: move / ranged (raven projectile) / melee |
| Individual-frame enemy (Bringer of Death) | 8 walk + 10 attack PNGs cycled in sequence |
| `SoundPlayer` per-entity audio | `play()`, `playLimited()`, shared Audio cache |
| Faction selection screen | Before each game; 3 factions |
| Logo intro sequence | Audio-synced: `timeupdate` at 7 s, logo.png, infinite shake |
| Main menu image-buttons | Hover → Active sprite + red CSS tint |
| Dual-track faction music playlist | Track 0 ends → track 1 → track 0 loop |
| In-game settings panel | ⚙ toggle; volume + speed sliders, synced with Settings screen |
| Game speed control | `game.timeScale` multiplier from settings slider |
| OOP refactor | `Animator.js`, `drawFrame.js`, `SoundPlayer.js` utilities |
| Mobile touch support | `touchstart` → `_handleCanvasClick`, iOS scroll prevention |
| Responsive canvas | CSS `width: 100%; height: auto`; `scaleX/Y` hit-correction |
| Enlarged touch targets (SlotBar) | `HIT_PADDING = 8` expands tap area 8 px each side |
| Asset folder reorganisation | `sprites/`, `sounds/`, `ui/` hierarchy |
| Debug viewer (`debug.html`) | Animation card grid + spawn arena |

---

## Enemy Factions

All enemies are **data-only additions** in [`src/data/enemyDefs.js`](src/data/enemyDefs.js).

### Faction: Undead

| Key | Label | HP | Speed | Damage | Range | Reward | Special |
|---|---|---|---|---|---|---|---|
| `skeleton` | Skeleton | 110 | 55 | 22 | 80 | 20 | 13-frame strip, `flipX: true` |
| `rex` | Rex | 90 | **160** | 18 | 70 | 30 | Fastest basic; spawn + run sounds |
| `jozsi` | Jozsi (Boss) | 800 | 30 | 55 | 340 | 200 | Boss; 3 sprites; raven projectile; `drawSize: 320` |

**Jozsi behaviour modes:**

| Mode | Condition | Sprite | Sound |
|---|---|---|---|
| `move` | No target in range | `enemy_Jozsi_moving.png` | `jozsi_moving.mp3` |
| `ranged` | Target > 90 px | `enemy_Jozsi_ranged_attack.png` | `jozsi_raven_attack.mp3` |
| `melee` | Target ≤ 90 px | `enemy_Jozsi_meele_attack.png` | `jozsi_smash_v2.mp3` |

Raven projectile uses `enemy_Jozsi_raven_ranged_attack.png` (3×4 sheet, 12 frames).

---

### Faction: Egypt

| Key | Label | HP | Speed | Damage | Range | Reward | Special |
|---|---|---|---|---|---|---|---|
| `bringerOfDeath` | Bringer of Death | 350 | 40 | 45 | 90 | 80 | Individual PNGs; `drawSize: 120` |

Uses `useIndividualFrames: true`:
- Walk: `Bringer-Of-Death/Individual Sprite/Walk/Bringer-of-Death_Walk_1.png` … `_Walk_8.png`
- Attack: `Bringer-Of-Death/Individual Sprite/Attack/Bringer-of-Death_Attack_1.png` … `_Attack_10.png`

---

### Faction: Water *(reserved)*

Slot reserved. No enemies defined yet. Music: `main_theme_faction_water.mp3`.

---

### Legacy (Testing)

| Key | Label | HP | Speed | Notes |
|---|---|---|---|---|
| `slade` | Slade | 120 | 50 | Original ranged enemy |

---

## Ally Units

All units are **data-only additions** in [`src/data/unitDefs.js`](src/data/unitDefs.js).

### Current Units

| Key | Label | HP | Cost | Cooldown | Damage | Range | Attack | Projectile |
|---|---|---|---|---|---|---|---|---|
| `soldier` | Soldier | 200 | $100 | 7.5 s | 40 | 85 px | Melee | — |
| `archer` | Archer | 100 | $125 | 8 s | 25 | 420 px | Projectile | Default orb |
| `arcanaArcher` | Arcana Archer | 100 | $150 | 9 s | 30 | 460 px | Projectile | `projectile.png` |
| `wizard` | Wizard | 120 | $175 | 9 s | 35 | 400 px | Projectile | `Projectile 2 w blur.png` (16 fr, 1.6× scale) |
| `goblin` | Goblin | 80 | $75 | 6 s | 20 | 200 px | Projectile | `Bomb_sprite.png` (19 fr) |

### Adding New Units

Add an entry to `UNIT_DEFS` in [`src/data/unitDefs.js`](src/data/unitDefs.js) with these fields:

```js
myUnit: {
  key, label, hp, attackSpeed, damage, range, cost, cooldown,
  idleSprite, attackSprite,
  idleFrames:   { cols, rows, total, rowIndex? },
  attackFrames: { cols, rows, total, rowIndex? },
  onAttack:     'melee' | 'projectile',
  effectOnHit:  null | { type, magnitude, duration },
  drawSize:     96,      // optional: target bounding box px
  projectileSprite: ..., // optional animated projectile sheet
  projectileFrames: { cols, rows, total },
  projectileScale:  1.0, // optional size multiplier
}
```

No new JS file required.

---

## Sprite & Animation System

### Frame Layout Format

```js
{ cols: N, rows: M, total: T, rowIndex?: R }
```

| Field | Description |
|---|---|
| `cols` | Columns in the spritesheet grid |
| `rows` | Rows in the spritesheet grid |
| `total` | Usable frame count (may be less than `cols × rows`) |
| `rowIndex` | Optional — forces a fixed row for multi-row shared sheets |

### Rendering Properties

| Property | Description |
|---|---|
| `drawSize` | Bounding-box px; frame is scaled proportionally to fit inside |
| `drawOffsetX/Y` | Pixel shift of the render anchor (for attack swing overflow) |
| `flipX: true` | Horizontal mirror (for sprites that face right) |
| `useIndividualFrames` | Cycles `idleFrameFiles[]` / `attackFrameFiles[]` arrays |

### Measured Image Dimensions

| Asset | Image size | cols×rows | Frame size |
|---|---|---|---|
| `ally_archer_attack.png` | 480×600 | 4×5 | 120×120 |
| `ally_archer_idle.png` | 220×330 | 2×3 | 110×110 |
| `ally_Soldier_attack.png` | — | 3×3 | — |
| `Arcane archer/spritesheet.png` | 512×512 | 8×8 | 64×64 |
| `Wizard Pack/Idle.png` | 1386×190 | 6×1 | 231×190 |
| `Wizard Pack/Attack2.png` | 1848×190 | 8×1 | 231×190 |
| `Goblin/Attack3.png` | 1800×150 | 12×1 | 150×150 |
| `Goblin/Bomb_sprite.png` | — | 19×1 | — |
| `enemy_Jozsi_moving.png` | 960×1280 | 3×4 | 320×320 |
| `enemy_Jozsi_ranged_attack.png` | 960×1280 | 3×4 | 320×320 |
| `enemy_Jozsi_meele_attack.png` | 1280×1280 | 4×4 | 320×320 |
| `enemy_Jozsi_raven_ranged_attack.png` | 660×600 | 3×4 | 220×150 |
| `enemy_Rex_moving.png` | 440×440 | 4×4 | 110×110 |
| `Skeleton_enemy_moving.png` | 832×64 | 13×1 | 64×64 |
| `Skeleton_enemy_attack.png` | 832×64 | 13×1 | 64×64 |
| `effects/Projectile 2 w blur.png` | — | 16×1 | — |

---

## Audio System

### Intro Sequence

| Timestamp | Event |
|---|---|
| `t = 0 s` | Black screen; no music |
| `t = 2 s` | `logoReveal.mp3` starts (2 s `setTimeout` — fires once per load) |
| `audio @ 7 s` | `timeupdate` fires → `logo.png` fades in + infinite `logoShake` CSS animation |
| `audio 'ended'` | Shake stops → intro fades out → `startMenuMusic()` |

> **Sync method:** logo reveal is driven by `audio.currentTime >= 7.0` in a `timeupdate` listener — NOT by `setTimeout` — ensuring perfect sync on every load including cached audio.

### Menu Music

`assets/sounds/main_theme_faction_egypt.mp3` — loops.

### Faction Playlists

Implemented as a two-track sequential loop in `startGameMusic(faction)`:

```
track 0 plays → ends → track 1 plays → ends → track 0 plays → ...
```

| Faction | Track 0 | Track 1 |
|---|---|---|
| `undead` | `main_theme_faction_undead.mp3` | `main_theme_faction_undead_v2.mp3` |
| `egypt` | `main_theme_faction_egypt.mp3` | `main_theme_faction_egypt_v2.mp3` |
| `water` | `main_theme_faction_water.mp3` | *(single track)* |
| `legacy` | `main_theme_faction_egypt.mp3` | `main_theme_faction_egypt_v2.mp3` |

### Enemy SFX

| Enemy | Sound key | File | Notes |
|---|---|---|---|
| Jozsi (move) | `move` | `jozsi_moving.mp3` | Throttled 1.2 s |
| Jozsi (ranged) | `ranged` | `jozsi_raven_attack.mp3` | Auto-stop 2 s |
| Jozsi (melee) | `melee` | `jozsi_smash_v2.mp3` | Auto-stop 2 s |
| Rex (spawn) | `spawn` | `bones_spawn.mp3` | Once on creation |
| Rex (move) | `move` | `bones.mp3` | Throttled 1.2 s |

---

## Wave Design

### Undead Waves

| Wave | Enemies | Interval |
|---|---|---|
| 1 | 6× Skeleton | 3000 ms |
| 2 | 10× (Skeleton 75%, Rex 25%) | 2500 ms |
| 3 | 14× (Skeleton 50%, Rex 50%) | 2200 ms |
| 4 | 12× (Skeleton 43%, Rex 29%, Jozsi 14%) | 2000 ms |

### Egypt Waves

| Wave | Enemies | Interval |
|---|---|---|
| 1 | 6× Bringer of Death | 3000 ms |
| 2 | 10× Bringer of Death | 2500 ms |
| 3 | 14× Bringer of Death | 2200 ms |
| 4 | 12× Bringer of Death | 2000 ms |

### Legacy Waves

| Wave | Enemies | Interval |
|---|---|---|
| 1–4 | Slade (6→10→15→15) | 3000→2000 ms |

### Spawning Mechanics

- **Time-based**: enemies appear at scheduled `spawnAt` timestamps; living enemies do not block spawning.
- **Burst system**: ~25% chance per slot generates 2–4 enemies 150 ms apart (PVZ flag rush feel).
- **Between waves**: 5-second pause then `startNextWave()` is called automatically.

---

## UI / UX Features

### In-game HUD

| Element | Notes |
|---|---|
| Base HP bar | Top-left of UI panel; colour: green → orange → red |
| Money counter | `💰 $N` |
| Wave progress bar | PVZ-style red fill; 🧟 icon at head; `Wave N / M` label |
| 6-slot unit bar | Icons, cost badge, cooldown overlay, selected highlight |

### In-game Settings Panel (`#ingame-settings`)

Accessible via ⚙ button during gameplay or while paused:
- Music Volume slider (synced with Settings screen)
- Game Speed slider (0.5× – 2×, synced with Settings screen)

### Main Menu

- Animated GIF background (`assets/ui/background.gif`)
- `assets/ui/game_logo.png` at top
- Image buttons: normal + active sprites; hover → red CSS filter tint
- Bottom-right corner: team logo (`assets/logo.png`) always visible

### Faction Selection Screen

Three styled buttons: Undead (purple), Egypt (gold), Classic (green).

---

## Technical Architecture

### Key Design Patterns

| Pattern | Usage |
|---|---|
| Data-driven entities | `UNIT_DEFS` / `ENEMY_DEFS` — zero new JS files for new types |
| Shared utilities | `Animator`, `drawFrame`, `SoundPlayer` — no duplication between `Unit` and `Enemy` |
| `timeScale` multiplier | All physics use `deltaTime * timeScale` → game speed slider |
| Faction scoping | `WAVES.filter(w => w.faction === faction)` on `WaveManager` init |
| Audio `timeupdate` sync | Intro logo reveal driven by actual audio position, not wall clock |

### Mobile Support

- Canvas: `width: 100%; height: auto` (CSS) + `800×560` attribute (game coordinates unchanged)
- `getBoundingClientRect() + scaleX/scaleY` corrects all click and touch coordinates
- `touchstart` with `{ passive: false }` + `e.preventDefault()` prevents scroll/zoom
- `HIT_PADDING = 8` on `SlotBar` expands tap targets
- Media queries at 640 px and 480 px adapt button sizes and hide instructions

---

## Effect System

Currently only `slow` is implemented. To add new types, extend `_apply()` and `_tick()` in [`src/Effect.js`](src/Effect.js):

| Type | `magnitude` | `tickInterval` | Description |
|---|---|---|---|
| `slow` ✅ | 0.0–1.0 | 0 | Reduces `movementSpeed` |
| `burn` 🔲 | dmg/tick | 500 ms | Periodic damage |
| `stun` 🔲 | — | — | Sets `movementSpeed = 0` |
| `weaken` 🔲 | 0.0–1.0 | 0 | Reduces outgoing damage |

---

## Asset Checklist

### Ally Sprites

| Asset | Status |
|---|---|
| `ally_Soldier_idle.png` | ✅ |
| `ally_Soldier_attack.png` | ✅ |
| `ally_archer_idle.png` | ✅ |
| `ally_archer_attack.png` | ✅ |
| `Arcane archer/spritesheet.png` | ✅ |
| `Arcane archer/projectile.png` | ✅ |
| `Wizard Pack/Idle.png` | ✅ |
| `Wizard Pack/Attack2.png` | ✅ |
| `Monster_Creatures_Fantasy/Goblin/Attack3.png` | ✅ |
| `Monster_Creatures_Fantasy/Goblin/Bomb_sprite.png` | ✅ |

### Enemy Sprites

| Asset | Status |
|---|---|
| `enemy_Jozsi_moving.png` | ✅ |
| `enemy_Jozsi_ranged_attack.png` | ✅ |
| `enemy_Jozsi_meele_attack.png` | ✅ |
| `enemy_Jozsi_raven_ranged_attack.png` | ✅ |
| `enemy_Rex_moving.png` | ✅ |
| `enemy_Slade_moving.png` | ✅ |
| `enemy_Slade_shooting.png` | ✅ |
| `Skeleton_enemy_moving.png` | ✅ |
| `Skeleton_enemy_attack.png` | ✅ |
| `Bringer-Of-Death/Individual Sprite/Walk/*.png` (8) | ✅ |
| `Bringer-Of-Death/Individual Sprite/Attack/*.png` (10) | ✅ |

### Audio

| Asset | Status |
|---|---|
| `logoReveal.mp3` | ✅ |
| `main_theme_faction_egypt.mp3` | ✅ |
| `main_theme_faction_egypt_v2.mp3` | ✅ |
| `main_theme_faction_undead.mp3` | ✅ |
| `main_theme_faction_undead_v2.mp3` | ✅ |
| `main_theme_faction_water.mp3` | ✅ |
| `jozsi_moving.mp3` | ✅ |
| `jozsi_raven_attack.mp3` | ✅ |
| `jozsi_smash_v2.mp3` | ✅ |
| `bones_spawn.mp3` | ✅ |
| `bones.mp3` | ✅ |

### UI

| Asset | Status |
|---|---|
| `ui/game_logo.png` | ✅ |
| `ui/background.gif` | ✅ |
| `ui/main_start_nActive.png` / `Active.png` | ✅ |
| `ui/main_music_nActive.png` / `Active.png` | ✅ |
| `ui/main_credits_nActive.png` / `Active.png` | ✅ |
| `logo.png` (team logo) | ✅ |

---

## Backlog

- [ ] Water faction enemies (3–4 new enemies)
- [ ] Water faction waves
- [ ] Effect types: `burn`, `stun`, `weaken`
- [ ] AoE projectile (splash radius on impact)
- [ ] Unit death animations (play once then remove)
- [ ] Particle system (visual burst on death/hit)
- [ ] Healer unit (periodic HP restore for adjacent allies)
- [ ] Enemy "rush" behaviour (ignore units, aim for base)
- [ ] Save / load wave progress (localStorage)
- [ ] Crossbowman, Mage, Knight unit additions
- [ ] Faction-switching mid-campaign
- [ ] Commander enemy (buffs nearby allies)
