import { Game } from './Game.js';

// ── DOM refs ────────────────────────────────────────────────────────────────
const mainMenu      = document.getElementById('main-menu');
const settingsScr   = document.getElementById('settings-screen');
const creditsScr    = document.getElementById('credits-screen');
const gameWrapper   = document.getElementById('game-wrapper');
const canvas        = document.getElementById('gameCanvas');
const pauseBtn      = document.getElementById('pause-btn');
const menuBtnIngame = document.getElementById('menu-btn-ingame');

// ── Settings live-update ─────────────────────────────────────────────────────
function bindRange(id, displayId, fmt) {
  const el  = document.getElementById(id);
  const disp = document.getElementById(displayId);
  el.addEventListener('input', () => { disp.textContent = fmt(el.value); });
}
bindRange('vol-music',   'vol-music-val',   v => v);
bindRange('vol-sfx',     'vol-sfx-val',     v => v);
bindRange('game-speed',  'game-speed-val',  v => (v / 100) + '×');

// ── Navigation helpers ───────────────────────────────────────────────────────
function showOnly(el) {
  [mainMenu, settingsScr, creditsScr, gameWrapper].forEach(s => {
    if (s === el) {
      s.classList.add('visible');
      s.style.display = '';
    } else {
      s.classList.remove('visible');
      s.style.display = 'none';
    }
  });
}

// Hide everything except main menu on load
settingsScr.style.display  = 'none';
creditsScr.style.display   = 'none';
gameWrapper.style.display  = 'none';

document.getElementById('btn-settings').addEventListener('click', () => showOnly(settingsScr));
document.getElementById('btn-credits').addEventListener('click',  () => showOnly(creditsScr));
document.getElementById('settings-back').addEventListener('click', () => showOnly(mainMenu));
document.getElementById('credits-back').addEventListener('click',  () => showOnly(mainMenu));

// ── Game instance (created once) ─────────────────────────────────────────────
let game = null;

document.getElementById('btn-start').addEventListener('click', async () => {
  showOnly(gameWrapper);

  if (!game) {
    game = new Game(canvas);
    try      { await game.preload(); }
    catch(e) { console.warn('Preload warning:', e); }
  }

  // Reset to fresh state if coming back from a finished game
  if (game.state === 'win' || game.state === 'lose') {
    game = new Game(canvas);
    try { await game.preload(); } catch(e) { /* ok */ }
  }

  game.render();
  pauseBtn.textContent = '⏸ Pause';
  game.start();
});

// ── Pause / Resume ───────────────────────────────────────────────────────────
pauseBtn.addEventListener('click', () => {
  if (!game) return;
  if (game.state === 'running') {
    game.pause();
    pauseBtn.textContent = '▶ Resume';
  } else if (game.state === 'paused') {
    game.resume();
    pauseBtn.textContent = '⏸ Pause';
  } else {
    // win / lose — restart
    game = null;
    document.getElementById('btn-start').click();
  }
});

// ── Back to menu ─────────────────────────────────────────────────────────────
menuBtnIngame.addEventListener('click', () => {
  if (game) { game.pause(); }
  showOnly(mainMenu);
});

// ── Keyboard shortcut P ──────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  if ((e.key === 'p' || e.key === 'P') && game) {
    if (game.state === 'running') {
      game.pause();
      pauseBtn.textContent = '▶ Resume';
    } else if (game.state === 'paused') {
      game.resume();
      pauseBtn.textContent = '⏸ Pause';
    }
  }
});
