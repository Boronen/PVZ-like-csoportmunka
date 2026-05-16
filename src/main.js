import { Game } from './Game.js';

// ── Intro Sequence ───────────────────────────────────────────────────────────
//
// Timing is driven by the AUDIO POSITION (timeupdate), NOT by setTimeout.
// This keeps it perfectly in sync on every page load, even when the audio
// is served from cache (which changes actual load latency on repeat visits).
//
//   t = 0 s       : pure black screen, no music
//   t = 2 s       : logoReveal.mp3 starts → setTimeout is only used for this
//                   one fixed wall-clock delay before audio starts
//   audio @ 7 s   : timeupdate fires → logo fades in + infinite shake
//   audio 'ended' : shake stops, intro fades out, main menu + menu music start

const introScreen = document.getElementById('intro-screen');
const introLogo   = document.getElementById('intro-logo');

let logoMusic        = null;
let logoShownInIntro = false;   // guard: show logo only once per load

function _startIntroAudio() {
  logoMusic = new Audio('assets/musics/logoReveal.mp3');
  logoMusic.volume = 0.85;

  // ── Drive logo reveal from audio currentTime ──────────────────────────────
  logoMusic.addEventListener('timeupdate', () => {
    if (!logoShownInIntro && logoMusic.currentTime >= 7.0) {
      logoShownInIntro = true;
      introLogo.classList.add('logo-visible');
    }
  });

  // ── Song finished → end intro ─────────────────────────────────────────────
  logoMusic.addEventListener('ended', _endIntro);

  logoMusic.play().catch(() => {
    // Autoplay blocked — retry on first user gesture
    const retry = () => {
      logoMusic.play().then(() => {}).catch(() => {});
    };
    document.addEventListener('pointerdown', retry, { once: true });
    document.addEventListener('keydown',     retry, { once: true });
  });
}

function _endIntro() {
  introLogo.classList.remove('logo-visible');   // stop infinite shake
  introScreen.classList.add('fade-out');
  setTimeout(() => {
    introScreen.style.display = 'none';
    startMenuMusic();
  }, 850);
}

// 2-second wall-clock wait before audio starts — this part is fine as
// setTimeout because it only fires once per page load, before any audio.
setTimeout(_startIntroAudio, 2000);

// ── Menu Music ───────────────────────────────────────────────────────────────
//
// Main menu background music: main_theme_faction_egypt.mp3 (loops).
// Stopped when the game starts; restored when returning to menu.

let menuMusic = null;

function startMenuMusic() {
  if (menuMusic) return;
  menuMusic = new Audio('assets/musics/main_theme_faction_egypt.mp3');
  menuMusic.loop   = true;
  menuMusic.volume = 0.5;
  menuMusic.play().catch(() => {
    document.addEventListener('pointerdown',
      () => menuMusic.play().catch(() => {}), { once: true });
  });
}

function stopMenuMusic() {
  if (!menuMusic) return;
  menuMusic.pause();
  menuMusic.currentTime = 0;
}

// ── Faction music map ─────────────────────────────────────────────────────────
//
// Each faction gets its own looping background track during gameplay.
const FACTION_MUSIC = {
  undead: 'assets/musics/main_theme_faction_undead_v2.mp3',
  egypt:  'assets/musics/main_theme_faction_egypt_v2.mp3',
  water:  'assets/musics/main_theme_faction_water.mp3',
  legacy: 'assets/musics/main_theme_faction_egypt.mp3',
};

let gameMusic = null;

function startGameMusic(faction) {
  stopGameMusic();
  const src = FACTION_MUSIC[faction] ?? FACTION_MUSIC.legacy;
  gameMusic = new Audio(src);
  gameMusic.loop   = true;
  gameMusic.volume = 0.45;
  gameMusic.play().catch(() => {});
}

function stopGameMusic() {
  if (!gameMusic) return;
  gameMusic.pause();
  gameMusic.currentTime = 0;
  gameMusic = null;
}

// ── DOM refs ─────────────────────────────────────────────────────────────────
const mainMenu      = document.getElementById('main-menu');
const factionScr    = document.getElementById('faction-screen');
const settingsScr   = document.getElementById('settings-screen');
const creditsScr    = document.getElementById('credits-screen');
const gameWrapper   = document.getElementById('game-wrapper');
const canvas        = document.getElementById('gameCanvas');
const pauseBtn      = document.getElementById('pause-btn');
const menuBtnIngame = document.getElementById('menu-btn-ingame');
const bgMenu        = document.getElementById('bg-menu');

// ── Screen management ─────────────────────────────────────────────────────────
const ALL_SCREENS = [mainMenu, factionScr, settingsScr, creditsScr, gameWrapper];

function showOnly(el) {
  ALL_SCREENS.forEach(s => {
    if (!s) return;
    if (s === el) {
      s.classList.add('visible');
      s.style.display = '';
    } else {
      s.classList.remove('visible');
      s.style.display = 'none';
    }
  });

  // GIF background: show on all menu screens, hide in-game
  if (bgMenu) bgMenu.style.display = (el === gameWrapper) ? 'none' : 'block';
}

// Initial state
if (factionScr)  factionScr.style.display  = 'none';
if (settingsScr) settingsScr.style.display  = 'none';
if (creditsScr)  creditsScr.style.display   = 'none';
if (gameWrapper) gameWrapper.style.display  = 'none';
if (bgMenu)      bgMenu.style.display       = 'block';

// ── Image-button hover → red tint ────────────────────────────────────────────
const RED_TINT = 'sepia(1) saturate(6) hue-rotate(310deg) brightness(1.1)';

document.querySelectorAll('.menu-img-btn').forEach(btn => {
  const img       = btn.querySelector('img');
  const normalSrc = btn.dataset.normalImg;
  const activeSrc = btn.dataset.activeImg;

  btn.addEventListener('mouseenter', () => {
    if (img && activeSrc) img.src = activeSrc;
    btn.style.filter = RED_TINT;
  });
  btn.addEventListener('mouseleave', () => {
    if (img && normalSrc) img.src = normalSrc;
    btn.style.filter = '';
  });
});

// ── Navigation ────────────────────────────────────────────────────────────────
document.getElementById('btn-start')?.addEventListener('click', () => showOnly(factionScr));
document.getElementById('btn-settings')?.addEventListener('click', () => showOnly(settingsScr));
document.getElementById('btn-credits')?.addEventListener('click', () => showOnly(creditsScr));
document.getElementById('settings-back')?.addEventListener('click', () => showOnly(mainMenu));
document.getElementById('credits-back')?.addEventListener('click',  () => showOnly(mainMenu));
document.getElementById('faction-back')?.addEventListener('click',  () => showOnly(mainMenu));

// ── Settings sliders — wired to live audio + game speed ──────────────────────
function bindRange(id, displayId, fmt, onChange) {
  const el   = document.getElementById(id);
  const disp = document.getElementById(displayId);
  if (!el) return;
  if (disp) disp.textContent = fmt(el.value);
  el.addEventListener('input', () => {
    if (disp) disp.textContent = fmt(el.value);
    if (onChange) onChange(Number(el.value));
  });
}

// Music volume: live-updates whichever track is currently playing
bindRange('vol-music', 'vol-music-val', v => v, vol => {
  const normalized = vol / 100;
  if (menuMusic) menuMusic.volume = normalized;
  if (gameMusic) gameMusic.volume = normalized;
});

bindRange('vol-sfx', 'vol-sfx-val', v => v);

// Game speed: feeds into game.timeScale so the loop multiplies deltaTime
bindRange('game-speed', 'game-speed-val', v => (v / 100) + '×', speed => {
  if (game) game.timeScale = speed / 100;
});

// ── Game instance ─────────────────────────────────────────────────────────────
let game = null;

async function launchGame(faction) {
  stopMenuMusic();
  showOnly(gameWrapper);

  game = new Game(canvas, { faction });
  try      { await game.preload(); }
  catch(e) { console.warn('Preload warning:', e); }

  game.render();
  if (pauseBtn) pauseBtn.textContent = '⏸ Pause';

  startGameMusic(faction);
  game.start();
}

document.querySelectorAll('.faction-btn[data-faction]').forEach(btn => {
  btn.addEventListener('click', () => launchGame(btn.dataset.faction ?? 'undead'));
});

// ── Pause / Resume ────────────────────────────────────────────────────────────
pauseBtn?.addEventListener('click', () => {
  if (!game) return;
  if (game.state === 'running') {
    game.pause();
    pauseBtn.textContent = '▶ Resume';
  } else if (game.state === 'paused') {
    game.resume();
    pauseBtn.textContent = '⏸ Pause';
  } else {
    // win / lose → back to faction select
    stopGameMusic();
    showOnly(factionScr);
    startMenuMusic();
    game = null;
  }
});

// ── Back to menu ──────────────────────────────────────────────────────────────
menuBtnIngame?.addEventListener('click', () => {
  if (game) game.pause();
  stopGameMusic();
  showOnly(mainMenu);
  startMenuMusic();
});

// ── Keyboard shortcut P ───────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  if ((e.key === 'p' || e.key === 'P') && game) {
    if (game.state === 'running') {
      game.pause();
      if (pauseBtn) pauseBtn.textContent = '▶ Resume';
    } else if (game.state === 'paused') {
      game.resume();
      if (pauseBtn) pauseBtn.textContent = '⏸ Pause';
    }
  }
});
