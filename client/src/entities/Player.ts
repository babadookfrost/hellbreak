import Phaser from 'phaser';
import { InputManager } from '../utils/Input';

export interface Operator {
  id: string;
  name: string;
  desc: string;
  statsText: string;
  hpMul: number;
  dmgMul: number;
  weapon: string | null;
  color1: string;
  color2: string;
  cost: number;
  unlockedByDefault: boolean;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  // Игровые характеристики
  public hp: number = 50;
  public maxHp: number = 50;
  public speed: number = 280;
  public weaponId: string = 'fire_staff'; // По умолчанию 'fire_staff' согласно спецификации фэнтези-арсенала
  public ammo: number = 6;
  public reloading: number = 0;
  public cd: number = 0;

  // Характеристики рывка (dash)
  public dashUnlocked: boolean = false;
  public dashCd: number = 0;
  public dashT: number = 0;
  public dashDX: number = 0;
  public dashDY: number = 0;
  public invuln: number = 0;

  public op!: Operator;

  constructor(scene: Phaser.Scene, x: number, y: number, operator: Operator) {
    // Вычисляем индекс кадра на основе оператора
    // recruit: 85 (1, 7), juggernaut: 84 (0, 7), phantom: 88 (4, 7)
    let frame = 85;
    if (operator.id === 'juggernaut') frame = 84;
    else if (operator.id === 'phantom') frame = 88;

    super(scene, x, y, 'tiny-dungeon', frame);

    this.op = operator;
    const baseHp = 50;
    this.hp = Math.floor(baseHp * operator.hpMul);
    this.maxHp = this.hp;
    this.weaponId = operator.weapon || 'fire_staff';

    // Добавляем объект на сцену и включаем физику
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Отключаем сглаживание текстуры (пиксель-арт)
    this.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.setScale(3); // Увеличиваем спрайт под игровой масштаб

    // Настройка физического тела
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    // Делаем хитбокс круглым и немного компактнее спрайта для удобства геймплея
    body.setCircle(6, 2, 2);
  }

  public tryDash(dx: number, dy: number, dashCdMul: number) {
    if (!this.dashUnlocked || this.dashCd > 0) return;
    if (dx === 0 && dy === 0) return;

    const mag = Math.hypot(dx, dy);
    this.dashDX = dx / mag;
    this.dashDY = dy / mag;
    this.dashT = 0.16;
    this.dashCd = 2.6 * dashCdMul;
    this.invuln = 0.24;

    // Визуальные эффекты (screen shake и вспышка будут вызваны сценой через события)
    this.scene.events.emit('player-dash', this.x, this.y);
  }

  public updateMovement(dt: number, speedMul: number, walkMul: number) {
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.invuln = Math.max(0, this.invuln - dt);

    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.dashT > 0) {
      this.dashT -= dt;
      // Во время рывка скорость значительно выше (900)
      body.setVelocity(this.dashDX * 900, this.dashDY * 900);

      // Визуальный след во время рывка
      this.setTint(0x0ea5c7);
    } else {
      const { mvX, mvY } = InputManager.getMoveVector();

      if (InputManager.wantDash) {
        const ddx = InputManager.dashDirX || mvX;
        const ddy = InputManager.dashDirY || mvY;
        this.tryDash(ddx, ddy, 1); // dashCdMul = 1 по умолчанию
        InputManager.wantDash = false;
        InputManager.dashDirX = 0;
        InputManager.dashDirY = 0;
      }

      if (mvX !== 0 || mvY !== 0) {
        const mag = Math.hypot(mvX, mvY);
        const actualSpeed = this.speed * walkMul * speedMul;
        const vx = (mvX / mag) * actualSpeed;
        const vy = (mvY / mag) * actualSpeed;
        body.setVelocity(vx, vy);

        // Устанавливаем поворот персонажа в сторону движения
        this.setRotation(Math.atan2(vy, vx));
      } else {
        body.setVelocity(0, 0);
      }

      // Возвращаем стандартный цвет визора/эффекта
      if (this.invuln > 0) {
        this.setTint(0x0ea5c7); // Голубое свечение при неуязвимости
      } else {
        this.clearTint();
      }
    }
  }
}
