# 📋 Prophecy — Game Development Plan

> This document describes the full feature set, implementation details, enemy/unit specifications, sprite requirements, and design guidelines for the Prophecy tower-defense game.

---

## Table of Contents

1. [Current State](#current-state)
2. [Intro Sequence](#intro-sequence)
3. [Main Menu](#main-menu)
4. [Wave Progress Bar](#wave-progress-bar)
5. [Enemy Factions](#enemy-factions)
6. [Ally Units](#ally-units)
7. [Sprite & Animation Requirements](#sprite--animation-requirements)
8. [Effect System Extensions](#effect-system-extensions)
9. [Wave Design Roadmap](#wave-design-roadmap)
10. [UI / UX Improvements](#ui--ux-improvements)
11. [Technical Backlog](#technical-backlog)

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
| HUD: HP bar, money counter | ✅ Done |
| 6-slot unit selection bar with cooldown overlay | ✅ Done |
| Pause / resume (`P` key) | ✅ Done |
| Win / Lose overlay | ✅ Done |

### Current Units

| Key | Type | Attack | Cost |
|---|---|---|---|
| `soldier` | Melee | 40 dmg, 1.5/s | $100 |
| `archer` | Projectile | 25 dmg, 1.0/s | $125 |

### Current Enemies

| Key | Faction | HP | Speed |
|---|---|---|---|
| `slade` | — | 120 | 50 px/s |

---

## Intro Sequence

The game opens with a **full-screen logo reveal sequence** before showing the main menu.

### Sequence Timeline

| Timestamp | Event |
|---|---|
| `0:00` | Screen is fully black; logo music (`assets/musics/logoReveal.mp3`) begins playing |
| `0:07` (7 s mark) | Game logo (`assets/UI/game_logo.png`) fades in and plays a **brief shake animation** |
| After animation | Logo settles; main menu fades in and becomes interactive |

### Implementation Notes

- The intro overlay is a `<div id="intro-screen">` layered above everything else (`z-index: 10`).
- Background is `#000000` (pure black) during the sequence.
- Logo image: `assets/UI/game_logo.png` — centred horizontally and vertically.
- The **shake animation** is a CSS `@keyframes` that applies rapid `translate` offsets (e.g., ±6 px X/Y, 5 cycles in ~0.4 s).
- The logo is hidden (`opacity: 0`) until exactly the 7-second mark, then class `logo-visible` is added via JS `setTimeout`.
- Music is played via `new Audio('assets/musics/logoReveal.mp3')` called immediately when the page loads (before any user interaction — autoplay policy note: may require a click-to-start fallback on some browsers).
- After the reveal animation completes (approx. 7.5 s total), the intro overlay transitions out (`opacity → 0`, `pointer-events: none`) and the main menu becomes visible.

### CSS Keyframes

```css
@keyframes logoShake {
  0%,100% { transform: translate(0,0); }
  15%     { transform: translate(-6px, 3px); }
  30%     { transform: translate(6px, -4px); }
  45%     { transform: translate(-4px, 5px); }
  60%     { transform: translate(5px, -3px); }
  75%     { transform: translate(-3px, 4px); }
  90%     { transform: translate(4px, -2px); }
}
```

---

## Main Menu

### Layout

The main menu (`<div id="main-menu">`) displays:
- The game logo at the top.
- Three interactive buttons on the right side (matching the screenshot).

### Button Assets

All button images are located in `assets/UI/`:

| Button | Normal State Asset | Active/Hover Asset |
|---|---|---|
| Play / Start | `assets/UI/main_start_nActive.png` | `assets/UI/main_start_Active.png` |
| Music | `assets/UI/main_music_nActive.png` | `assets/UI/main_music_Active.png` |
| Credits | `assets/UI/main_credits_nActive.png` | `assets/UI/main_credits_Active.png` |

### Hover Behaviour

- On `mouseenter`: swap `src` to the Active variant **and** apply CSS `filter: hue-rotate` or `tint` to shift button color to **red**.
- On `mouseleave`: revert to the nActive variant and remove the tint.
- Implemented in `src/main.js` by iterating over button `<img>` elements and attaching `mouseover`/`mouseout` event listeners.

### Button Implementation

Buttons are rendered as `<button>` elements with `<img>` children rather than background images, so the sprite swap is a straightforward `img.src` change:

```js
btn.addEventListener('mouseenter', () => {
  img.src = btn.dataset.activeImg;
  btn.style.filter = 'sepia(1) saturate(5) hue-rotate(310deg)'; // red tint
});
btn.addEventListener('mouseleave', () => {
  img.src = btn.dataset.normalImg;
  btn.style.filter = '';
});
```

---

## Wave Progress Bar

### Replacement

The existing **wave text counter** (`Wave N / M`) in the HUD is **replaced** by a PVZ-style progress bar that visually tracks enemy wave advancement across the top-right of the HUD panel.

### PVZ Progress Bar Design

```
[==============================>  🧟  ]  ← direction of enemy advance
  ██████████████░░░░░░░░░░░░░░░░░░
  Wave 2 / 4
```

| Property | Value |
|---|---|
| Position | Top of the HUD panel, right-aligned |
| Width | ~340 px |
| Height | ~20 px |
| Fill direction | Left → Right (progress = enemies defeated / total enemies in wave) |
| Fill color | `#e53935` (red, enemy-wave themed) |
| Background color | `#333` |
| Enemy icon | Small enemy silhouette drawn at the current progress head |
| Border | 1 px `#888` with 3 px border-radius |

### Progress Calculation

```js
const progress = waveManager.enemiesDefeatedThisWave / waveManager.totalEnemiesThisWave;
// Clamp 0–1; if between waves, show full bar from previous wave
```

### `WaveManager` additions required

The `WaveManager` must expose:
- `enemiesDefeatedThisWave` — incremented in `Game.handleEnemyDeath()`.
- `totalEnemiesThisWave` — set when a new wave starts (equal to `wave.totalEnemies`).
- `currentWaveLabel` — string `"Wave N / M"` drawn below the bar.

### `UI._drawWaveProgressBar(ctx, waveManager)` signature

Replaces the `fillText` wave label in `UI._drawHUD()`:

```js
_drawWaveProgressBar(ctx, waveManager) {
  const x = 380, y = this.barY + 8, w = 340, h = 20;
  const progress = Math.min(
    waveManager.enemiesDefeatedThisWave / (waveManager.totalEnemiesThisWave || 1),
    1
  );
  // Background track
  ctx.fillStyle = '#333';
  ctx.fillRect(x, y, w, h);
  // Fill
  ctx.fillStyle = '#e53935';
  ctx.fillRect(x, y, w * progress, h);
  // Border
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  // Enemy icon at progress head
  ctx.font = '14px sans-serif';
  ctx.fillText('🧟', x + w * progress - 8, y + 15);
  // Wave label
  ctx.fillStyle = '#80deea';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(waveManager.currentWaveLabel, x + w / 2, y + h + 13);
}
```

---

## Enemy Factions

There are **three distinct enemy factions** in Prophecy. All new enemies are data-only additions to [`src/data/enemyDefs.js`](src/data/enemyDefs.js).

---

### Faction 1 — Undead

Music: `assets/musics/main_theme_faction_undead_v2.mp3`

#### Jozsi (Boss)

The boss unit of the Undead faction. Has **three distinct behaviour modes**, each backed by its own sprite:

| Behaviour | Description | Sprite |
|---|---|---|
| `ranged` | Launches **ravens as projectiles** toward allies | `assets/enemy_Jozsi_ranged_attack.png` / `assets/enemy_Jozsi_raven_ranged_attack.png` |
| `melee` | Close-range physical strike | `assets/enemy_Jozsi_meele_attack.png` |
| `move` | Standard walking/movement animation | `assets/enemy_Jozsi_moving.png` |

**Data entry:**

```js
jozsi: {
  key:           'jozsi',
  label:         'Jozsi',
  faction:       'undead',
  hp:            800,
  movementSpeed: 30,
  attackSpeed:   0.6,
  damage:        55,
  range:         340,
  reward:        200,
  isBoss:        true,
  idleSprite:    'assets/enemy_Jozsi_moving.png',
  attackSprite:  'assets/enemy_Jozsi_ranged_attack.png',
  meleeSprite:   'assets/enemy_Jozsi_meele_attack.png',
  ravenSprite:   'assets/enemy_Jozsi_raven_ranged_attack.png',
  idleFrames:    { cols: 6, rows: 1, total: 6 },
  attackFrames:  { cols: 6, rows: 1, total: 6 },
  meleeFrames:   { cols: 6, rows: 1, total: 6 },
  onAttack:      'projectile',   // ranged raven projectile at distance
  effectOnHit:   null,
}
```

**Behaviour switching logic** (in `Enemy.update()`):
- If target is within melee range (`< 90 px`): use `meleeSprite` / `meleeFrames`, `onAttack = 'melee'`.
- If target is within ranged range: use `attackSprite` (raven), `onAttack = 'projectile'`.
- Sound on raven launch: `assets/musics/jozsi_raven_attack.mp3`.
- Sound on melee strike: `assets/musics/jozsi_smash_v2.mp3`.

---

#### Rex

A dog enemy unit with **exceptionally high movement speed** and **rapid attack speed**.

```js
rex: {
  key:           'rex',
  label:         'Rex',
  faction:       'undead',
  hp:            90,
  movementSpeed: 160,         // very fast — fastest basic enemy
  attackSpeed:   3.0,         // attacks very rapidly
  damage:        18,
  range:         70,          // melee only
  reward:        30,
  idleSprite:    'assets/enemy_Rex_moving.png',
  attackSprite:  'assets/enemy_Rex_moving.png',  // same sheet, different row if needed
  idleFrames:    { cols: 6, rows: 1, total: 6 },
  attackFrames:  { cols: 6, rows: 1, total: 6 },
  onAttack:      'melee',
  effectOnHit:   null,
}
```

---

#### Skeleton

Uses a **single spritesheet** (`assets/Skeleton enemy/Skeleton enemy.png`) with multiple rows:

| Row | Content |
|---|---|
| Row 1 (index 0) | **Attack** frames |
| Row 3 (index 2) | **Movement / idle** frames |

```js
skeleton: {
  key:           'skeleton',
  label:         'Skeleton',
  faction:       'undead',
  hp:            110,
  movementSpeed: 55,
  attackSpeed:   1.2,
  damage:        22,
  range:         80,
  reward:        20,
  idleSprite:    'assets/Skeleton enemy/Skeleton enemy.png',
  attackSprite:  'assets/Skeleton enemy/Skeleton enemy.png',
  // Movement frames: row index 2 (3rd row)
  idleFrames:    { cols: 13, rows: 4, total: 13, rowIndex: 2 },
  // Attack frames: row index 0 (1st row)
  attackFrames:  { cols: 13, rows: 4, total: 13, rowIndex: 0 },
  onAttack:      'melee',
  effectOnHit:   null,
}
```

> **Implementation note:** The `rowIndex` property requires a small change to `Enemy._drawFrame()` — instead of computing `row` from `_frameIndex / layout.cols`, use `layout.rowIndex` directly when it is defined:
>
> ```js
> const row = (layout.rowIndex !== undefined)
>   ? layout.rowIndex
>   : Math.floor(this._frameIndex / layout.cols);
> ```

---

### Faction 2 — Egypt

Music: `assets/musics/main_theme_faction_egypt_v2.mp3`

#### Bringer of Death

Uses **individual sprite frame files** (not a spritesheet). The attack and walk animations are loaded as arrays of separate PNG images.

**Asset paths:**
- Attack frames: `assets/Bringer-Of-Death/Individual Sprite/Attack/Bringer-of-Death_Attack_1.png` … `_Attack_10.png` (10 frames)
- Walk frames: `assets/Bringer-Of-Death/Individual Sprite/Walk/Bringer-of-Death_Walk_1.png` … `_Walk_8.png` (8 frames)

**Data entry:**

```js
bringerOfDeath: {
  key:              'bringerOfDeath',
  label:            'Bringer of Death',
  faction:          'egypt',
  hp:               350,
  movementSpeed:    40,
  attackSpeed:      0.8,
  damage:           45,
  range:            90,
  reward:           80,
  // Individual frames mode — no single spritesheet
  useIndividualFrames: true,
  idleFrameFiles:   Array.from({ length: 8 },  (_, i) =>
    `assets/Bringer-Of-Death/Individual Sprite/Walk/Bringer-of-Death_Walk_${i + 1}.png`),
  attackFrameFiles: Array.from({ length: 10 }, (_, i) =>
    `assets/Bringer-Of-Death/Individual Sprite/Attack/Bringer-of-Death_Attack_${i + 1}.png`),
  onAttack:         'melee',
  effectOnHit:      null,
}
```

**Individual-frame rendering** in `Enemy.draw()`:

```js
if (this.config.useIndividualFrames) {
  const files  = this._animState === 'attack'
    ? this.config.attackFrameFiles
    : this.config.idleFrameFiles;
  const imgKey = files[this._frameIndex % files.length];
  const img    = this._sprites[imgKey];
  if (img) ctx.drawImage(img, this.x - dw/2, this.y - dh/2, dw, dh);
  return;
}
```

All individual frame images must be included in `SpriteLoader.loadAll()` during `Game.preload()`.

---

### Faction 3 — (Reserved for future expansion)

Music: `assets/musics/main_theme_faction_water.mp3`

This faction slot is reserved. No enemy definitions yet.

---

## Ally Units

All units are data-only entries in [`src/data/unitDefs.js`](src/data/unitDefs.js).

---

### Wizard

Sourced from the **Wizard Pack** assets (`assets/Wizard Pack/`).

| Animation | Asset | Notes |
|---|---|---|
| Attack | `assets/Wizard Pack/Attack2.png` | Use **Attack 2** only (not Attack 1) |
| Idle | `assets/Wizard Pack/Idle.png` | Standard idle spritesheet |

```js
wizard: {
  key:          'wizard',
  label:        'Wizard',
  hp:           120,
  attackSpeed:  1.2,
  damage:       35,
  range:        400,
  cost:         175,
  cooldown:     9,
  idleSprite:   'assets/Wizard Pack/Idle.png',
  attackSprite: 'assets/Wizard Pack/Attack2.png',
  idleFrames:   { cols: 6, rows: 1, total: 6 },
  attackFrames: { cols: 7, rows: 1, total: 7 },
  onAttack:     'projectile',
  effectOnHit:  null,
}
```

---

### Arcana Archer

Previously referenced as `ally_Archer_Shot.png`. **All references must be updated** to the new filename `attack`.

| Animation | Old Asset | New Asset |
|---|---|---|
| Attack | `assets/ally_Archer_Shot.png` | `assets/Arcane archer/spritesheet.png` (row 4, index 3) |
| Idle | `assets/ally_archer_idle.png` | `assets/Arcane archer/spritesheet.png` (last row) |

The Arcana Archer uses a **single spritesheet** (`assets/Arcane archer/spritesheet.png`) with multiple rows:

| Row | Content |
|---|---|
| Row 4 (index 3) | **Attack** animation frames |
| Last row | **Idle** animation frames |

**Updated data entry:**

```js
archer: {
  key:          'archer',
  label:        'Arcana Archer',
  hp:           100,
  attackSpeed:  1.0,
  damage:       25,
  range:        420,
  cost:         125,
  cooldown:     8,
  // Both animations share the same spritesheet; rowIndex differentiates them
  idleSprite:   'assets/Arcane archer/spritesheet.png',
  attackSprite: 'assets/Arcane archer/spritesheet.png',
  // Last row (determine total rows by inspecting sheet; assume 5 rows → index 4)
  idleFrames:   { cols: 8, rows: 5, total: 8, rowIndex: 4 },
  // 4th row = index 3
  attackFrames: { cols: 8, rows: 5, total: 8, rowIndex: 3 },
  onAttack:     'projectile',
  effectOnHit:  null,
}
```

> `rowIndex` support in `Unit._drawFrame()` follows the same pattern as for the Skeleton enemy (see [Skeleton](#skeleton) above).

**Find-and-replace:** Search entire codebase for `ally_Archer_Shot` and `ally_archer_idle` and replace with the new spritesheet path.

---

### Goblin

New ally unit using assets from `assets/Monster_Creatures_Fantasy(Version 1.3)/Goblin/`.

| Animation | Asset |
|---|---|
| Attack | `assets/Monster_Creatures_Fantasy(Version 1.3)/Goblin/Attack3.png` |
| Idle | *(use Attack3.png for both, or supply a dedicated idle sheet)* |

```js
goblin: {
  key:          'goblin',
  label:        'Goblin',
  hp:           80,
  attackSpeed:  2.0,         // fast attacker
  damage:       20,
  range:        75,          // melee
  cost:         75,
  cooldown:     6,
  idleSprite:   'assets/Monster_Creatures_Fantasy(Version 1.3)/Goblin/Attack3.png',
  attackSprite: 'assets/Monster_Creatures_Fantasy(Version 1.3)/Goblin/Attack3.png',
  idleFrames:   { cols: 8, rows: 1, total: 8 },
  attackFrames: { cols: 8, rows: 1, total: 8 },
  onAttack:     'melee',
  effectOnHit:  null,
}
```

---

## Sprite & Animation Requirements

### Naming Convention

```
assets/ally_<Label>_idle.png          ← legacy allies
assets/ally_<Label>_attack.png        ← legacy allies
assets/<PackFolder>/<Animation>.png   ← pack-based allies/enemies
```

### Animation Frame Format

Sprite sheets are loaded as single flat PNG images. The engine reads frames by splitting the image into a grid:

```js
idleFrames:   { cols: <N>, rows: <M>, total: <frames>, rowIndex?: <R> }
attackFrames: { cols: <N>, rows: <M>, total: <frames>, rowIndex?: <R> }
```

- `rowIndex` (optional): when set, forces the renderer to use that specific row instead of computing it from the frame counter. Required for multi-row sheets where only one row is needed.
- Recommended frame size: **96 × 96 px** per frame.
- Recommended animation speed: **10 FPS** (`CONFIG.ENEMY_ANIM_FPS`).
- Enemy sprites must **already face left** (no horizontal flip applied).
- Unit sprites must **face right** (attack rightward).

### Asset Checklist

| Asset | Type | Status |
|---|---|---|
| `assets/ally_Soldier_idle.png` | Unit | ✅ Done |
| `assets/ally_Soldier_attack.png` | Unit | ✅ Done |
| `assets/Arcane archer/spritesheet.png` | Unit (Arcana Archer) | ✅ Available |
| `assets/Wizard Pack/Attack2.png` | Unit (Wizard) | ✅ Available |
| `assets/Wizard Pack/Idle.png` | Unit (Wizard) | ✅ Available |
| `assets/Monster_Creatures_Fantasy(Version 1.3)/Goblin/Attack3.png` | Unit (Goblin) | ✅ Available |
| `assets/enemy_Jozsi_moving.png` | Enemy (Jozsi) | ✅ Available |
| `assets/enemy_Jozsi_ranged_attack.png` | Enemy (Jozsi) | ✅ Available |
| `assets/enemy_Jozsi_meele_attack.png` | Enemy (Jozsi) | ✅ Available |
| `assets/enemy_Jozsi_raven_ranged_attack.png` | Enemy (Jozsi) | ✅ Available |
| `assets/enemy_Rex_moving.png` | Enemy (Rex) | ✅ Available |
| `assets/Skeleton enemy/Skeleton enemy.png` | Enemy (Skeleton) | ✅ Available |
| `assets/Bringer-Of-Death/Individual Sprite/Attack/Bringer-of-Death_Attack_*.png` | Enemy (Bringer of Death) | ✅ Available |
| `assets/Bringer-Of-Death/Individual Sprite/Walk/Bringer-of-Death_Walk_*.png` | Enemy (Bringer of Death) | ✅ Available |
| `assets/UI/game_logo.png` | UI / Intro | ✅ Available |
| `assets/UI/main_start_nActive.png` | UI / Menu button | ✅ Available |
| `assets/UI/main_start_Active.png` | UI / Menu button | ✅ Available |
| `assets/UI/main_music_nActive.png` | UI / Menu button | ✅ Available |
| `assets/UI/main_music_Active.png` | UI / Menu button | ✅ Available |
| `assets/UI/main_credits_nActive.png` | UI / Menu button | ✅ Available |
| `assets/UI/main_credits_Active.png` | UI / Menu button | ✅ Available |
| `assets/musics/logoReveal.mp3` | Audio / Intro | ✅ Available |
| `assets/musics/main_theme_faction_undead_v2.mp3` | Audio / Faction | ✅ Available |
| `assets/musics/main_theme_faction_egypt_v2.mp3` | Audio / Faction | ✅ Available |
| `assets/musics/main_theme_faction_water.mp3` | Audio / Faction | ✅ Available |
| `assets/musics/jozsi_raven_attack.mp3` | Audio / SFX | ✅ Available |
| `assets/musics/jozsi_smash_v2.mp3` | Audio / SFX | ✅ Available |

---

## Effect System Extensions

The [`Effect`](src/Effect.js) class supports composable status conditions. Currently only `slow` is implemented.

| Type | `magnitude` | `tickInterval` | Description |
|---|---|---|---|
| `slow` | 0.0–1.0 (fraction) | 0 | Reduces `movementSpeed` by `magnitude * 100%` |
| `burn` | dmg per tick | 500 ms | Deals damage every `tickInterval` ms |
| `stun` | — | — | Sets `movementSpeed = 0` for `duration` ms |
| `weaken` | 0.0–1.0 | 0 | Reduces outgoing `damage` by `magnitude * 100%` |

To implement `burn`, extend `_tick()` in [`src/Effect.js`](src/Effect.js):

```js
_tick() {
  if (this.type === 'burn') {
    this._target.takeDamage(this.magnitude);
  }
}
```

---

## Wave Design Roadmap

### Undead Faction Waves (Waves 1–4)

| Wave | Enemies | Notes |
|---|---|---|
| 1 | 6× Skeleton | Tutorial — slow, melee |
| 2 | 8× Skeleton + 2× Rex | Speed threat introduced |
| 3 | 10× Skeleton + 4× Rex | Dense pack |
| 4 | 6× Skeleton + 2× Rex + 1× Jozsi (Boss) | Boss wave |

### Egypt Faction Waves (Waves 5–8)

| Wave | Enemies | Notes |
|---|---|---|
| 5 | 6× Bringer of Death | New faction introduction |
| 6 | 10× Bringer of Death | Heavier pressure |
| 7 | 12× Bringer of Death + 4× Skeleton | Cross-faction mix |
| 8 | 8× Bringer of Death + 1× Jozsi | Boss returns with new allies |

### Mixed / Endgame Waves (Waves 9–10)

| Wave | Enemies | Notes |
|---|---|---|
| 9 | 20× mixed all factions | High density swarm |
| 10 | 2× Jozsi + escort swarm | Final boss wave |

---

## UI / UX Improvements

- [x] PVZ-style wave progress bar (replaces wave text counter)
- [x] Animated logo intro sequence with music
- [x] Main menu image-buttons with hover red tint
- [ ] Animated unit portraits in slot bar
- [ ] Wave incoming countdown banner
- [ ] Enemy HP labels (show number on hover)
- [ ] "Fast Forward" (2× speed) toggle
- [ ] Sound effects for attacks, placement, death
- [ ] Background music loop (faction-specific)
- [ ] Animated particle effects on death

---

## Technical Backlog

- [ ] `rowIndex` support in `Enemy._drawFrame()` and `Unit._drawFrame()` for multi-row shared spritesheets
- [ ] Individual-frame mode in `Enemy` class for `Bringer of Death`
- [ ] Multi-sprite boss support (Jozsi: move / melee / ranged sprites per behaviour)
- [ ] AoE projectile (damages all enemies in radius on impact)
- [ ] Splash damage radius in `Projectile`
- [ ] `healer` unit: periodic HP restore for nearby allies
- [ ] Enemy "rush" behaviour (ignore units, aim straight for base)
- [ ] Save / load wave progress (localStorage)
- [ ] Mobile touch support
- [ ] Faction-based music switching in `WaveManager`
