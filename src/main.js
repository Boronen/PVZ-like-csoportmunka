import { Game } from './Game.js';

// Prevent iOS rubber-band scroll and double-tap zoom on the game canvas
document.addEventListener('touchmove', e => {
  if (e.target.closest('#game-container')) e.preventDefault();
}, { passive: false });

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
  logoMusic = new Audio('assets/sounds/logoReveal.mp3');
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
  menuMusic = new Audio('assets/sounds/main_theme_faction_egypt.mp3');
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

// ── Faction music playlists ───────────────────────────────────────────────────
//
// Two-track sequential playlists per faction.
// Track 0 plays first; when it ends, track 1 starts.
// When track 1 ends, track 0 plays again (playlist loops forever).
const FACTION_PLAYLIST = {
  undead: [
    'assets/sounds/main_theme_faction_undead.mp3',
    'assets/sounds/main_theme_faction_undead_v2.mp3',
  ],
  egypt: [
    'assets/sounds/main_theme_faction_egypt.mp3',
    'assets/sounds/main_theme_faction_egypt_v2.mp3',
  ],
  water: [
    'assets/sounds/main_theme_faction_water.mp3',
  ],
  legacy: [
    'assets/sounds/main_theme_faction_egypt.mp3',
    'assets/sounds/main_theme_faction_egypt_v2.mp3',
  ],
};

let gameMusic        = null;   // currently playing Audio node
let _gmPlaylist      = [];     // active playlist array
let _gmTrackIndex    = 0;      // which track is playing

function _playTrack(index) {
  const src = _gmPlaylist[index];
  if (!src) return;

  // Tear down the previous node without nulling gameMusic yet
  if (gameMusic) {
    gameMusic.pause();
    gameMusic.onended = null;
  }

  const vol = Number(document.getElementById('vol-music')?.value ?? 60) / 100;
  gameMusic = new Audio(src);
  gameMusic.volume = vol;
  _gmTrackIndex = index;

  // When this track ends, advance to next (wraps around)
  gameMusic.addEventListener('ended', () => {
    const next = (_gmTrackIndex + 1) % _gmPlaylist.length;
    _playTrack(next);
  });

  gameMusic.play().catch(() => {});
}

function startGameMusic(faction) {
  stopGameMusic();
  _gmPlaylist   = FACTION_PLAYLIST[faction] ?? FACTION_PLAYLIST.legacy;
  _gmTrackIndex = 0;
  _playTrack(0);
}

function stopGameMusic() {
  if (!gameMusic) return;
  gameMusic.pause();
  gameMusic.onended = null;
  gameMusic.currentTime = 0;
  gameMusic     = null;
  _gmPlaylist   = [];
  _gmTrackIndex = 0;
}

// ── DOM refs ─────────────────────────────────────────────────────────────────
const mainMenu        = document.getElementById('main-menu');
const factionScr      = document.getElementById('faction-screen');
const settingsScr     = document.getElementById('settings-screen');
const creditsScr      = document.getElementById('credits-screen');
const gameWrapper     = document.getElementById('game-wrapper');
const canvas          = document.getElementById('gameCanvas');
const pauseBtn        = document.getElementById('pause-btn');
const menuBtnIngame   = document.getElementById('menu-btn-ingame');
const bgMenu          = document.getElementById('bg-menu');
const btnIngameSettings = document.getElementById('btn-ingame-settings');
const ingameSettings    = document.getElementById('ingame-settings');

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

// ── Game instance (declared early — syncPair closures reference it) ──────────
let game = null;

// ── Settings sliders — wired to live audio + game speed ──────────────────────
//
// bindRange wires a single <input type=range> to its display span and an
// optional onChange callback.  syncPair keeps a main-screen slider and an
// in-game slider in lock-step so both always reflect the same value.

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

// Keeps a main-screen slider and an in-game slider perfectly in sync.
// Whichever one the user moves, the other mirrors it immediately.
function syncPair(mainId, igId, fmt, onChange) {
  const main = document.getElementById(mainId);
  const ig   = document.getElementById(igId);
  if (!main || !ig) return;

  function applyValue(val) {
    const num = Number(val);
    main.value = num;
    ig.value   = num;
    const mainDisp = document.getElementById(mainId + '-val');
    const igDisp   = document.getElementById(igId   + '-val');
    if (mainDisp) mainDisp.textContent = fmt(num);
    if (igDisp)   igDisp.textContent   = fmt(num);
    if (onChange) onChange(num);
  }

  // Initialise both displays from main slider's current value
  applyValue(main.value);

  main.addEventListener('input', () => applyValue(main.value));
  ig.addEventListener('input',   () => applyValue(ig.value));
}

// Music volume: synced across both panels; updates whichever track plays
syncPair('vol-music', 'ig-vol-music', v => v, vol => {
  const normalized = vol / 100;
  if (menuMusic) menuMusic.volume = normalized;
  if (gameMusic) gameMusic.volume = normalized;
});

bindRange('vol-sfx', 'vol-sfx-val', v => v);

// Game speed: synced across both panels; feeds into game.timeScale
syncPair('game-speed', 'ig-game-speed', v => (v / 100) + '×', speed => {
  if (game) game.timeScale = speed / 100;
});

// ── In-game settings toggle ───────────────────────────────────────────────────
btnIngameSettings?.addEventListener('click', () => {
  if (!ingameSettings) return;
  const isVisible = ingameSettings.style.display === 'block';
  ingameSettings.style.display = isVisible ? 'none' : 'block';
});

// ── Game launch ───────────────────────────────────────────────────────────────
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
