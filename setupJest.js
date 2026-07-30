// Set up global mocks to allow js/game.js to load without a real DOM/canvas
document.body.innerHTML = '<canvas id="game"></canvas>';
window.HTMLCanvasElement.prototype.getContext = () => {
  return {
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(),
    putImageData: jest.fn(),
    createImageData: jest.fn(),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    fillText: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
  };
};

window.GameRNG = {
    random: () => 0.5
};

window.Input = {
    mouse: { x: 0, y: 0 }
};

window.Game = {
    camera: { x: 0, y: 0 },
    init: jest.fn()
};

window.loadMeta = jest.fn();
global.loadMeta = window.loadMeta;

window.loadLeaderboard = jest.fn(() => []);
global.loadLeaderboard = window.loadLeaderboard;
