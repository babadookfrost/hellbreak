import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { Player } from './Player';
import { distSq } from '../utils/Helpers';

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  public friendly: boolean = true;
  public dmg: number = 1;
  public pierce: number = 1;
  public splash: number = 0;
  public ricochet: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Используем кадр 114 из спрайтшита для пуль
    super(scene, x, y, 'tiny-dungeon', 114);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.setScale(2.5);
  }

  public spawn(
    x: number,
    y: number,
    vx: number,
    vy: number,
    friendly: boolean,
    dmg: number,
    pierce: number,
    tintHex: string,
    splash: number = 0,
    ricochet: boolean = false
  ) {
    this.friendly = friendly;
    this.dmg = dmg;
    this.pierce = pierce;
    this.splash = splash;
    this.ricochet = ricochet;

    this.enableBody(true, x, y, true, true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(4);
    body.setVelocity(vx, vy);

    this.setTint(Phaser.Display.Color.HexStringToColor(tintHex).color);

    // Задаем угол полета на основе направления скорости
    this.setRotation(Math.atan2(vy, vx));
  }

  public hitEnemy(enemy: Enemy, enemiesGroup: Phaser.Physics.Arcade.Group) {
    if (this.dmg <= 0 || !this.active) return;

    enemy.takeDamage(this.dmg);

    // Логика взрыва сплеш-оружия (Void Shard)
    if (this.splash > 0) {
      this.explodeSplash(enemy.x, enemy.y, enemiesGroup);
    }

    // Логика рикошета (Cursed Blade Evolution)
    if (this.ricochet && enemiesGroup) {
      this.handleRicochet(enemy, enemiesGroup);
    } else {
      this.pierce--;
      if (this.pierce <= 0) {
        this.destroyBullet();
      }
    }
  }

  public hitPlayer(player: Player) {
    if (player.invuln <= 0) {
      player.hp = Math.max(0, player.hp - this.dmg);
      player.invuln = 1.2;

      this.scene.events.emit('player-hit', this.dmg);
      this.destroyBullet();
    }
  }

  private explodeSplash(x: number, y: number, enemiesGroup: Phaser.Physics.Arcade.Group) {
    this.scene.events.emit('bullet-splash', x, y, this.splash);
    const rr = this.splash * this.splash;

    enemiesGroup.getChildren().forEach((enemyObj) => {
      const e = enemyObj as Enemy;
      if (e.active && e.hp > 0) {
        if (distSq(x, y, e.x, e.y) < rr) {
          e.takeDamage(this.dmg);
        }
      }
    });
  }

  private handleRicochet(currentEnemy: Enemy, enemiesGroup: Phaser.Physics.Arcade.Group) {
    // Ищем ближайшего врага
    let nearestEnemy: Enemy | null = null;
    let minDist = 200 * 200; // Радиус поиска рикошета (200px)

    enemiesGroup.getChildren().forEach((enemyObj) => {
      const e = enemyObj as Enemy;
      if (e.active && e.hp > 0 && e !== currentEnemy) {
        const d = distSq(this.x, this.y, e.x, e.y);
        if (d < minDist) {
          minDist = d;
          nearestEnemy = e;
        }
      }
    });

    if (nearestEnemy) {
      // Рикошетим пулю в нового врага
      const body = this.body as Phaser.Physics.Arcade.Body;
      const speed = body.velocity.length() || 1000;
      const angle = Math.atan2((nearestEnemy as Enemy).y - this.y, (nearestEnemy as Enemy).x - this.x);

      body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.setRotation(angle);

      this.ricochet = false; // Позволяем только один рикошет
    } else {
      this.pierce--;
      if (this.pierce <= 0) {
        this.destroyBullet();
      }
    }
  }

  public destroyBullet() {
    this.disableBody(true, true);
  }
}
