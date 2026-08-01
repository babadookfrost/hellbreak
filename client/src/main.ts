import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import VirtualJoystickPlugin from 'phaser3-rex-plugins/plugins/virtualjoystick-plugin.js';
import './systems/NetworkManager'; // Автоматический запуск сетевой службы при загрузке

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS, // Использование CANVAS для максимальной совместимости в безголовых браузерах
  canvas: document.getElementById('game') as HTMLCanvasElement,
  width: window.innerWidth,
  height: window.innerHeight,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  plugins: {
    global: [{
      key: 'rexVirtualJoystick',
      plugin: VirtualJoystickPlugin,
      start: true
    }]
  },
  scene: [BootScene, GameScene, UIScene]
};

window.addEventListener('DOMContentLoaded', () => {
  new Phaser.Game(config);
});
