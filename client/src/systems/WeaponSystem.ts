import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Bullet } from '../entities/Bullet';
import { WEAPONS, Weapon } from '../utils/Weapons';
import { InputManager } from '../utils/Input';
import { GameRNG } from '../utils/RNG';
import { SoundManager } from './SoundManager';
import { Enemy } from '../entities/Enemy';

export class WeaponSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private playerBullets: Phaser.Physics.Arcade.Group;
  private enemiesGroup: Phaser.Physics.Arcade.Group;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    playerBullets: Phaser.Physics.Arcade.Group,
    enemiesGroup: Phaser.Physics.Arcade.Group
  ) {
    this.scene = scene;
    this.player = player;
    this.playerBullets = playerBullets;
    this.enemiesGroup = enemiesGroup;
  }

  public update(dt: number, dmgMul: number, reloadMul: number, ammoAdd: number) {
    // 1. Обработка таймеров перезарядки и перезапуска
    const weapon = WEAPONS[this.player.weaponId] || WEAPONS.fire_staff;

    if (this.player.reloading > 0) {
      this.player.reloading -= dt;
      if (this.player.reloading <= 0) {
        this.player.ammo = Math.max(1, weapon.ammoMax + ammoAdd);
      }
    }

    if (this.player.cd > 0) {
      this.player.cd -= dt;
    }

    // Обработка ручной перезарядки
    if (InputManager.wantReload && this.player.reloading <= 0 && this.player.ammo < weapon.ammoMax + ammoAdd) {
      InputManager.wantReload = false;
      this.player.reloading = weapon.reload * reloadMul;
    }

    // 2. Определение цели прицеливания (мышь на ПК или автоприцел на мобильных)
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    let targetX = InputManager.mouse.x;
    let targetY = InputManager.mouse.y;

    if (isMobile) {
      // Авто-прицеливание: находим ближайшего живого врага к игроку
      let nearestEnemy: Enemy | null = null;
      let minDist = 999999;

      this.enemiesGroup.getChildren().forEach((enemyObj) => {
        const e = enemyObj as Enemy;
        if (e.active && e.hp > 0) {
          const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
          if (dist < minDist) {
            minDist = dist;
            nearestEnemy = e;
          }
        }
      });

      if (nearestEnemy) {
        targetX = (nearestEnemy as Enemy).x;
        targetY = (nearestEnemy as Enemy).y;
        InputManager.fireReq = true; // На мобайле стрельба автоматическая при наличии врага
      } else {
        InputManager.fireReq = false;
      }
    }

    // 3. Выстрел из оружия
    if (
      InputManager.fireReq &&
      this.player.cd <= 0 &&
      this.player.reloading <= 0 &&
      this.player.ammo > 0
    ) {
      this.fireWeapon(weapon, targetX, targetY, dmgMul);
    }
  }

  private fireWeapon(weapon: Weapon, tx: number, ty: number, dmgMul: number) {
    this.player.ammo--;
    this.player.cd = weapon.cd;

    const baseAngle = Math.atan2(ty - this.player.y, tx - this.player.x);

    // Вращаем персонажа в сторону стрельбы
    this.player.setRotation(baseAngle);

    // Стреляем снарядами/дробинками
    for (let i = 0; i < weapon.pellets; i++) {
      const spreadAngle = (i - (weapon.pellets - 1) / 2) * weapon.spread;
      const jitterAngle = (GameRNG.random() - 0.5) * weapon.jitter;
      const finalAngle = baseAngle + spreadAngle + jitterAngle;

      const vx = Math.cos(finalAngle) * weapon.speed;
      const vy = Math.sin(finalAngle) * weapon.speed;

      // Извлекаем свободную пулю из пула
      let bullet = this.playerBullets.getFirstDead(false) as Bullet;
      if (!bullet) {
        bullet = new Bullet(this.scene, this.player.x, this.player.y);
        this.playerBullets.add(bullet);
      }

      bullet.spawn(
        this.player.x,
        this.player.y,
        vx,
        vy,
        true, // friendly
        Math.round(weapon.dmg * dmgMul),
        weapon.pierce,
        weapon.color,
        weapon.splash || 0,
        weapon.ricochet || false
      );
    }

    // Воспроизведение звука выстрела
    SoundManager.playShoot(weapon.id);

    // Запускаем автоперезарядку, если патроны закончились
    if (this.player.ammo <= 0) {
      this.player.reloading = weapon.reload;
    }
  }
}
