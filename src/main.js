import { Game } from './Game.js';

// Entry point — wires the DOM to the Game instance.
const canvas    = document.getElementById('gameCanvas');
const startBtn  = document.getElementById('start-btn');

const game = new Game(canvas);

// Preload all sprites, then let the player press Start
game.preload().then(() => {
  // Render a static first frame so the canvas isn't blank
  game.render();
}).catch(err => {
  console.warn('Sprite preload warning (some images may be missing):', err);
  game.render();
});

startBtn.addEventListener('click', () => {
  if (game.state === 'idle') {
    startBtn.textContent = '⏸ Pause';
    game.start();
  } else if (game.state === 'running') {
    startBtn.textContent = '▶ Resume';
    game.pause();
  } else if (game.state === 'paused') {
    startBtn.textContent = '⏸ Pause';
    game.resume();
  } else {
    // win / lose — reload for a new game
    window.location.reload();
  }
});
