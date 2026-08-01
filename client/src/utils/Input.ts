import Phaser from 'phaser';

export class InputManager {
  public static keys: { [key: string]: boolean } = {};
  public static mouse: { x: number; y: number } = { x: 0, y: 0 };
  public static stick: { active: boolean; dx: number; dy: number } = { active: false, dx: 0, dy: 0 };
  public static fireReq: boolean = false;
  public static wantReload: boolean = false;
  public static wantDash: boolean = false;
  public static wantInventory: boolean = false;
  public static wantWalk: boolean = false;
  public static dashDirX: number = 0;
  public static dashDirY: number = 0;

  private scene: Phaser.Scene;
  private joystick: any = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initKeyboard();
    this.initMouse();
    this.initTouch();
  }

  private initKeyboard() {
    this.scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const code = event.code;
      InputManager.keys[code] = true;

      if (code === 'KeyC' || code === 'ControlLeft' || code === 'ControlRight') {
        InputManager.wantWalk = true;
      }
      if (code === 'ShiftLeft' || code === 'ShiftRight') {
        InputManager.wantDash = true;
      }
      if (code === 'KeyR') {
        InputManager.wantReload = true;
      }
      if (code === 'KeyI' || code === 'Tab') {
        event.preventDefault();
        InputManager.wantInventory = true;
      }
    });

    this.scene.input.keyboard?.on('keyup', (event: KeyboardEvent) => {
      const code = event.code;
      InputManager.keys[code] = false;

      if (code === 'KeyC' || code === 'ControlLeft' || code === 'ControlRight') {
        InputManager.wantWalk = false;
      }
    });
  }

  private initMouse() {
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      InputManager.mouse.x = pointer.worldX;
      InputManager.mouse.y = pointer.worldY;
    });

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        InputManager.fireReq = true;
      }
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown()) {
        InputManager.fireReq = false;
      }
    });
  }

  private initTouch() {
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isMobile) return;

    // Показываем блок touch-ui в HTML
    const touchUI = document.getElementById('touch-ui');
    if (touchUI) {
      touchUI.style.display = 'block';
    }

    // Инициализируем Rex Virtual Joystick в Phaser
    const rexJoystickPlugin = this.scene.plugins.get('rexVirtualJoystick') as any;
    if (rexJoystickPlugin) {
      const stickBase = document.getElementById('stick-base');
      let jx = 120;
      let jy = window.innerHeight - 120;

      if (stickBase) {
        const rect = stickBase.getBoundingClientRect();
        jx = rect.left + rect.width / 2;
        jy = rect.top + rect.height / 2;
        stickBase.style.opacity = '0';
      }

      this.joystick = rexJoystickPlugin.add(this.scene, {
        x: jx,
        y: jy,
        radius: 60,
        forceMin: 10,
        enable: true
      });
    }

    const btnReload = document.getElementById('btn-reload');
    btnReload?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      InputManager.wantReload = true;
    }, { passive: false });

    const btnDash = document.getElementById('btn-dash');
    btnDash?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      InputManager.dashDirX = InputManager.stick.dx || 1;
      InputManager.dashDirY = InputManager.stick.dy || 0;
      InputManager.wantDash = true;
    }, { passive: false });

    const btnInventory = document.getElementById('btn-inventory');
    btnInventory?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      InputManager.wantInventory = true;
    }, { passive: false });
  }

  public update() {
    if (this.joystick) {
      const force = this.joystick.force;
      if (force > 0) {
        const angle = this.joystick.angle * (Math.PI / 180);
        const intensity = Math.min(1, force / 60);
        InputManager.stick.active = true;
        InputManager.stick.dx = Math.cos(angle) * intensity;
        InputManager.stick.dy = Math.sin(angle) * intensity;
        InputManager.wantWalk = intensity < 0.6;
      } else {
        InputManager.stick.active = false;
        InputManager.stick.dx = 0;
        InputManager.stick.dy = 0;
      }
    }
  }

  public static getMoveVector(): { mvX: number; mvY: number } {
    let mx = 0;
    let my = 0;

    if (InputManager.keys['KeyW'] || InputManager.keys['ArrowUp']) my -= 1;
    if (InputManager.keys['KeyS'] || InputManager.keys['ArrowDown']) my += 1;
    if (InputManager.keys['KeyA'] || InputManager.keys['ArrowLeft']) mx -= 1;
    if (InputManager.keys['KeyD'] || InputManager.keys['ArrowRight']) mx += 1;

    if (!mx && !my && InputManager.stick.active) {
      mx = InputManager.stick.dx;
      my = InputManager.stick.dy;
    }

    return { mvX: mx, mvY: my };
  }

  public destroy() {
    if (this.joystick) {
      this.joystick.destroy();
    }
  }
}

(window as any).Input = InputManager;
