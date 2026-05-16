// ── Prophecy Debug Viewer — main script ──────────────────────────────────────
// Loaded as type="module" by debug.html

import { UNIT_DEFS }  from './data/unitDefs.js';
import { ENEMY_DEFS } from './data/enemyDefs.js';
import { CONFIG }     from './utils/CONFIG.js';

const ANIM_FPS = 10;

// ── Image loader ──────────────────────────────────────────────────────────────
const imageCache = {};
function loadImage(src) {
  if (imageCache[src]) return Promise.resolve(imageCache[src]);
  return new Promise((res) => {
    const img = new Image();
    img.onload  = () => { imageCache[src] = img; res(img); };
    img.onerror = () => { imageCache[src] = null; res(null); };
    img.src = src;
  });
}
async function loadImages(srcs) {
  await Promise.all([...new Set(srcs.filter(Boolean))].map(loadImage));
}

// ── Section toggle ─────────────────────────────────────────────────────────────
window.showSection = function(which) {
  document.getElementById('sprite-grid').style.display    = which === 'sprites' ? 'flex' : 'none';
  document.getElementById('spawn-section').classList.toggle('visible', which === 'spawn');
  document.getElementById('btn-show-sprites').classList.toggle('active', which === 'sprites');
  document.getElementById('btn-show-spawn').classList.toggle('active',  which === 'spawn');
};

// ── Sprite card renderer ───────────────────────────────────────────────────────
class SpriteCard {
  constructor(label, config, type) {
    this.label  = label;
    this.config = config;
    this.type   = type;   // 'unit' | 'enemy'

    this.state       = 'idle';
    this.frameIndex  = 0;
    this.frameTimer  = 0;
    this.frameDur    = 1 / ANIM_FPS;

    this.idleImg    = null;
    this.attackImg  = null;
    this.meleeImg   = null;
    this.idleImgs   = [];
    this.attackImgs = [];

    this.canvas = document.createElement('canvas');
    this.canvas.width  = 160;
    this.canvas.height = 160;
    this.ctx = this.canvas.getContext('2d');

    this.frameFill = null;
    this._buildCard();
  }

  _buildCard() {
    const card = document.createElement('div');
    card.className = 'card';

    const h3 = document.createElement('h3');
    h3.textContent = this.label + (this.config.faction ? ` [${this.config.faction}]` : '');
    card.appendChild(h3);
    card.appendChild(this.canvas);

    // Frame progress bar
    const bar  = document.createElement('div'); bar.className = 'frame-bar';
    const fill = document.createElement('div'); fill.className = 'frame-fill';
    bar.appendChild(fill);
    this.frameFill = fill;
    card.appendChild(bar);

    // State toggle button
    const btn = document.createElement('button');
    btn.className   = 'state-btn';
    btn.textContent = '▶ Toggle idle/attack';
    btn.onclick = () => {
      this.state = this.state === 'idle' ? 'attack' : 'idle';
      this.frameIndex = 0;
      this.frameTimer = 0;
    };
    card.appendChild(btn);

    // Meta info
    const meta = document.createElement('div');
    meta.className = 'meta';
    const idle   = this.config.idleFrames   ?? {};
    const attack = this.config.attackFrames ?? {};
    const dsize  = this.config.drawSize ?? CONFIG.CELL_SIZE;
    meta.innerHTML =
      `idle: ${idle.cols ?? '?'}c × ${idle.rows ?? '?'}r = ${idle.total ?? '?'} fr` +
      (idle.rowIndex !== undefined ? ` (row ${idle.rowIndex})` : '') + '<br>' +
      `attack: ${attack.cols ?? '?'}c × ${attack.rows ?? '?'}r = ${attack.total ?? '?'} fr` +
      (this.config.meleeFrames ? `<br>melee: ${this.config.meleeFrames.cols}c × ${this.config.meleeFrames.rows}r` : '') +
      `<br>drawSize: ${dsize}px` +
      (this.config.useIndividualFrames ? '<br><em>individual PNGs</em>' : '');
    card.appendChild(meta);

    // Boss: extra melee button
    if (this.config.isBoss) {
      const btn2 = document.createElement('button');
      btn2.className   = 'state-btn';
      btn2.textContent = '⚔ Melee anim';
      btn2.onclick = () => { this.state = 'melee'; this.frameIndex = 0; };
      card.appendChild(btn2);
    }

    card.addEventListener('mouseenter', () => {
      document.getElementById('info-label').textContent =
        `${this.label} | state:${this.state} | frame:${this.frameIndex}`;
    });

    document.getElementById('sprite-grid').appendChild(card);
  }

  async load() {
    if (this.config.useIndividualFrames) {
      if (this.config.idleFrameFiles)   this.idleImgs   = await Promise.all(this.config.idleFrameFiles.map(loadImage));
      if (this.config.attackFrameFiles) this.attackImgs = await Promise.all(this.config.attackFrameFiles.map(loadImage));
    } else {
      [this.idleImg, this.attackImg] = await Promise.all([
        loadImage(this.config.idleSprite),
        loadImage(this.config.attackSprite),
      ]);
      if (this.config.meleeSprite) this.meleeImg = await loadImage(this.config.meleeSprite);
    }
  }

  update(dt) {
    this.frameTimer += dt;
    if (this.frameTimer >= this.frameDur) {
      this.frameTimer -= this.frameDur;
      let total;
      if (this.config.useIndividualFrames) {
        total = (this.state === 'attack' ? this.attackImgs.length : this.idleImgs.length) || 1;
      } else {
        total = this._layout()?.total ?? 1;
      }
      this.frameIndex = (this.frameIndex + 1) % total;
    }
  }

  _layout() {
    if (this.state === 'melee')  return this.config.meleeFrames   ?? this.config.attackFrames;
    if (this.state === 'attack') return this.config.attackFrames  ?? null;
    return this.config.idleFrames ?? null;
  }

  draw() {
    const ctx = this.ctx;
    const cw  = this.canvas.width;
    const ch  = this.canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    // Checkerboard background
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? '#1a2a1a' : '#223022';
        ctx.fillRect(col * 20, row * 20, 20, 20);
      }
    }

    const cx       = cw / 2;
    const cy       = ch / 2;
    const drawSize = this.config.drawSize ?? CONFIG.CELL_SIZE;

    if (this.config.useIndividualFrames) {
      this._drawIndividual(ctx, cx, cy, drawSize);
    } else {
      this._drawSheet(ctx, cx, cy, drawSize);
    }

    // Cross-hair
    ctx.strokeStyle = 'rgba(255,255,100,0.25)';
    ctx.lineWidth   = 0.5;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, ch); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(cw, cy); ctx.stroke();

    // Frame counter overlay
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, ch - 16, cw, 16);
    ctx.fillStyle  = '#adf';
    ctx.font       = '10px monospace';
    ctx.textAlign  = 'left';
    ctx.fillText(`[${this.state}] frame ${this.frameIndex}`, 4, ch - 4);

    // Update progress bar
    if (this.frameFill) {
      const layout = this._layout();
      const total  = layout?.total ?? 1;
      this.frameFill.style.width = ((this.frameIndex + 1) / total * 100).toFixed(1) + '%';
    }
  }

  _drawSheet(ctx, cx, cy, drawSize) {
    let sprite, layout;
    if (this.state === 'melee') {
      sprite = this.meleeImg ?? this.attackImg;
      layout = this.config.meleeFrames ?? this.config.attackFrames;
    } else if (this.state === 'attack') {
      sprite = this.attackImg; layout = this.config.attackFrames;
    } else {
      sprite = this.idleImg;   layout = this.config.idleFrames;
    }
    if (!sprite || !layout) { this._drawFallback(ctx, cx, cy); return; }

    const cols  = layout.cols ?? 1;
    const rows  = layout.rows ?? 1;
    const fw    = sprite.width  / cols;
    const fh    = sprite.height / rows;
    const col   = this.frameIndex % cols;
    const row   = (layout.rowIndex !== undefined)
      ? layout.rowIndex
      : Math.floor(this.frameIndex / cols);
    const scale = Math.min(drawSize / fw, drawSize / fh);
    ctx.drawImage(sprite, col * fw, row * fh, fw, fh,
      cx - fw * scale / 2, cy - fh * scale / 2, fw * scale, fh * scale);
  }

  _drawIndividual(ctx, cx, cy, drawSize) {
    const imgs = this.state === 'attack' ? this.attackImgs : this.idleImgs;
    const img  = imgs[this.frameIndex % (imgs.length || 1)];
    if (!img) { this._drawFallback(ctx, cx, cy); return; }
    const scale = Math.min(drawSize / img.width, drawSize / img.height);
    ctx.drawImage(img, cx - img.width * scale / 2, cy - img.height * scale / 2,
      img.width * scale, img.height * scale);
  }

  _drawFallback(ctx, cx, cy) {
    ctx.fillStyle = '#663';
    ctx.fillRect(cx - 24, cy - 24, 48, 48);
    ctx.fillStyle  = '#ff8';
    ctx.font       = '10px monospace';
    ctx.textAlign  = 'center';
    ctx.fillText('NO SPRITE', cx, cy + 4);
  }
}

// ── Global toggle ──────────────────────────────────────────────────────────────
const allCards = [];
let globalState = 'idle';
window.toggleAllState = function() {
  globalState = globalState === 'idle' ? 'attack' : 'idle';
  allCards.forEach(c => { c.state = globalState; c.frameIndex = 0; });
};

// ── Spawn Arena ────────────────────────────────────────────────────────────────
class SpawnArena {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.sprites = [];
  }

  spawn(config, isEnemy, x, y) {
    const s = {
      config, isEnemy,
      x: x ?? (isEnemy ? this.canvas.width + 40 : 80 + Math.random() * 200),
      y: y ?? (80 + Math.random() * (this.canvas.height - 160)),
      frameIndex: 0, frameTimer: 0, state: 'idle',
      vx: isEnemy ? -(30 + Math.random() * 60) : 0,
      idleImg:   imageCache[config.idleSprite]   ?? null,
      attackImg: imageCache[config.attackSprite] ?? null,
      meleeImg:  config.meleeSprite ? imageCache[config.meleeSprite] ?? null : null,
    };
    if (config.useIndividualFrames) {
      s.idleImgs   = (config.idleFrameFiles   ?? []).map(k => imageCache[k] ?? null);
      s.attackImgs = (config.attackFrameFiles ?? []).map(k => imageCache[k] ?? null);
    }
    this.sprites.push(s);
  }

  update(dt) {
    for (const s of this.sprites) {
      s.frameTimer += dt;
      const layout = s.state === 'attack' ? s.config.attackFrames : s.config.idleFrames;
      const total  = layout?.total ?? (s.idleImgs?.length || 1);
      if (s.frameTimer >= 1 / ANIM_FPS) {
        s.frameTimer -= 1 / ANIM_FPS;
        s.frameIndex = (s.frameIndex + 1) % total;
      }
      if (s.isEnemy) {
        s.x += s.vx * dt;
        if (s.x < -80) s.x = this.canvas.width + 40;
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    const cw  = this.canvas.width;
    const ch  = this.canvas.height;
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(0, 0, cw, ch);
    ctx.strokeStyle = '#2a3a2a'; ctx.lineWidth = 1;
    for (let lane = 0; lane <= 5; lane++) {
      const y = lane * (ch / 5);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
    }
    for (const s of this.sprites) {
      s.config.useIndividualFrames ? this._drawIndividual(ctx, s) : this._drawSheet(ctx, s);
      ctx.fillStyle  = '#adf'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
      ctx.fillText(s.config.label ?? '?', s.x, s.y + (s.config.drawSize ?? 40) / 2 + 10);
    }
  }

  _drawSheet(ctx, s) {
    const state  = s.state;
    const sprite = state === 'attack' ? s.attackImg  : s.idleImg;
    const layout = state === 'attack' ? s.config.attackFrames : s.config.idleFrames;
    if (!sprite || !layout) return;
    const cols = layout.cols ?? 1; const rows = layout.rows ?? 1;
    const fw   = sprite.width / cols; const fh = sprite.height / rows;
    const col  = s.frameIndex % cols;
    const row  = (layout.rowIndex !== undefined) ? layout.rowIndex : Math.floor(s.frameIndex / cols);
    const ds   = s.config.drawSize ?? CONFIG.CELL_SIZE;
    const sc   = Math.min(ds / fw, ds / fh);
    ctx.drawImage(sprite, col * fw, row * fh, fw, fh,
      s.x - fw * sc / 2, s.y - fh * sc / 2, fw * sc, fh * sc);
  }

  _drawIndividual(ctx, s) {
    const imgs = s.state === 'attack' ? s.attackImgs : s.idleImgs;
    const img  = imgs?.[s.frameIndex % (imgs?.length || 1)];
    if (!img) return;
    const ds = s.config.drawSize ?? CONFIG.CELL_SIZE;
    const sc = Math.min(ds / img.width, ds / img.height);
    ctx.drawImage(img, s.x - img.width * sc / 2, s.y - img.height * sc / 2,
      img.width * sc, img.height * sc);
  }
}

// ── Bootstrap ──────────────────────────────────────────────────────────────────
async function main() {
  const allSrcs = [];
  for (const d of Object.values(UNIT_DEFS)) {
    allSrcs.push(d.idleSprite, d.attackSprite);
    if (d.projectileSprite) allSrcs.push(d.projectileSprite);
  }
  for (const d of Object.values(ENEMY_DEFS)) {
    allSrcs.push(d.idleSprite, d.attackSprite);
    if (d.meleeSprite) allSrcs.push(d.meleeSprite);
    if (d.ravenSprite) allSrcs.push(d.ravenSprite);
    if (d.useIndividualFrames) {
      allSrcs.push(...(d.idleFrameFiles ?? []), ...(d.attackFrameFiles ?? []));
    }
  }
  await loadImages(allSrcs);

  for (const def of Object.values(UNIT_DEFS)) {
    const card = new SpriteCard(`🟢 ${def.label}`, def, 'unit');
    await card.load(); allCards.push(card);
  }
  for (const def of Object.values(ENEMY_DEFS)) {
    const card = new SpriteCard(`🔴 ${def.label}`, def, 'enemy');
    await card.load(); allCards.push(card);
  }

  // ── Spawn arena ──────────────────────────────────────────────────────────────
  const spawnCanvas = document.getElementById('spawn-canvas');
  const arena    = new SpawnArena(spawnCanvas);
  const controls = document.getElementById('spawn-controls');
  const log      = document.getElementById('spawn-log');

  function addLog(msg) {
    const line = document.createElement('div');
    line.textContent = new Date().toLocaleTimeString() + ' — ' + msg;
    log.prepend(line);
    if (log.children.length > 20) log.lastChild.remove();
  }

  for (const def of Object.values(ENEMY_DEFS)) {
    const btn = document.createElement('button');
    btn.className = 'spawn-btn'; btn.textContent = `👾 Spawn ${def.label}`;
    btn.onclick = () => { arena.spawn(def, true); addLog(`Spawned ${def.label}`); };
    controls.appendChild(btn);
  }
  for (const def of Object.values(UNIT_DEFS)) {
    const btn = document.createElement('button');
    btn.className = 'spawn-btn'; btn.textContent = `🟢 Place ${def.label}`;
    btn.onclick = () => {
      arena.spawn(def, false, 80 + Math.random() * 300, 60 + Math.random() * 300);
      addLog(`Placed ${def.label}`);
    };
    controls.appendChild(btn);
  }

  const atkBtn = document.createElement('button');
  atkBtn.className = 'spawn-btn'; atkBtn.textContent = '⚔ Toggle All Attack';
  atkBtn.onclick = () => {
    arena.sprites.forEach(s => { s.state = s.state === 'idle' ? 'attack' : 'idle'; s.frameIndex = 0; });
  };
  controls.appendChild(atkBtn);

  const clearBtn = document.createElement('button');
  clearBtn.className = 'spawn-btn'; clearBtn.textContent = '🗑 Clear Arena';
  clearBtn.onclick = () => { arena.sprites = []; addLog('Cleared'); };
  controls.appendChild(clearBtn);

  // ── Main loop ─────────────────────────────────────────────────────────────────
  let lastTs = 0, frames = 0, fpsAcc = 0;

  function loop(ts) {
    const dt = Math.min((ts - lastTs) / 1000, 0.1);
    lastTs = ts;
    fpsAcc += dt; frames++;
    if (fpsAcc >= 0.5) {
      document.getElementById('fps-label').textContent = `FPS: ${Math.round(frames / fpsAcc)}`;
      frames = fpsAcc = 0;
    }
    for (const card of allCards) { card.update(dt); card.draw(); }
    if (document.getElementById('spawn-section').classList.contains('visible')) {
      arena.update(dt); arena.draw();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

main();
