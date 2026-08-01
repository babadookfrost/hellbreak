import Phaser from 'phaser';
import { Player } from './Player';
import { GameMap, raycastClear } from '../utils/MapGenerator';
import { GameRNG } from '../utils/RNG';
import { SoundManager } from '../systems/SoundManager';

export interface EnemyConfig {
  hp: number;
  speed: number;
  r: number;
  fireCd?: number;
  bulletSpeed?: number;
}

export const ENEMY_BASE: { [key: string]: EnemyConfig } = {
  melee: { hp: 1, speed: 160, r: 16 },
  shooter: { hp: 2, speed: 50, r: 16, fireCd: 1.5, bulletSpeed: 500 },
  tank: { hp: 6, speed: 95, r: 22 },
  kamikaze: { hp: 1, speed: 220, r: 14 },
  sniper: { hp: 2, speed: 40, r: 14, fireCd: 3.0, bulletSpeed: 900 }
};

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  public enemyType!: string;
  public hp: number = 1;
  public maxHp: number = 1;
  public speed: number = 100;
  public fireCd: number = 0;
  public jitter: number = 0;
  public flash: number = 0;

  // Смещение цели для создания роевого поведения
  public targetOffsetX: number = 0;
  public targetOffsetY: number = 0;
  public offsetUpdateTimer: number = 0;

  // Уклонение при застревании
  public dodgeTimer: number = 0;
  public dodgeAng: number = 0;
  public stuckFrames: number = 0;

  // Эффект замедления от льда
  public iceSlow: number = 0;

  // Характеристики босса
  public isBoss: boolean = false;
  public isHeart: boolean = false;
  public bossType: string | null = null;
  public burstCd: number = 0;
  public state: string = 'idle'; // Для Босса 2 (idle, telegraph, dash, summon, invulnerable)
  public stateTimer: number = 0;
  public dashTarget: { x: number; y: number } | null = null;
  public minionCount: number = 0;
  public isMinion: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Временно создаем с дефолтным кадром 72
    super(scene, x, y, 'tiny-dungeon', 72);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.setScale(3);
  }

  public spawn(
    x: number,
    y: number,
    type: string,
    speedMul: number,
    hpMul: number,
    globalPower: number,
    isBoss: boolean = false,
    bossType: string | null = null
  ) {
    this.enemyType = type;
    this.isBoss = isBoss;
    this.bossType = bossType;
    this.isHeart = bossType === 'heart';
    this.isMinion = false;

    // Сброс физики и видимости через Phaser Arcade API
    this.enableBody(true, x, y, true, true);

    // Сброс таймеров
    this.flash = 0;
    this.iceSlow = 0;
    this.dodgeTimer = 0;
    this.stuckFrames = 0;
    this.jitter = (GameRNG.random() - 0.5) * 0.5;

    // Конфигурация характеристик
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (isBoss && bossType) {
      this.hp = Math.round(60 * hpMul * (bossType === 'heart' ? 1.5 : 1));
      this.speed = (bossType === 'heart' ? 50 : 75) * speedMul;
      this.burstCd = bossType === 'heart' ? 1.2 : 1.6;
      this.state = 'idle';
      this.stateTimer = 0.8 + GameRNG.random() * 0.2;
      this.dashTarget = null;
      this.minionCount = 0;

      const radius = bossType === 'heart' ? 56 : bossType === 'boss2' ? 60 : 46;
      body.setCircle(radius / 3, radius / 3, radius / 3);
    } else {
      const base = ENEMY_BASE[type] || ENEMY_BASE.melee;
      const power = Math.min(4.5, globalPower);
      this.hp = Math.max(1, Math.round(base.hp * hpMul * Math.min(2.5, power)));
      this.speed = base.speed * speedMul * Math.min(2.1, power);
      this.fireCd = base.fireCd || 0;

      body.setCircle(base.r / 3, base.r / 3, base.r / 3);
    }

    this.maxHp = this.hp;

    // Установка спрайта
    let frame = 72; // melee (0,6)
    if (isBoss) {
      if (bossType === 'heart') frame = 118; // (10, 9)
      else if (bossType === 'boss2') frame = 112; // (4, 9)
      else frame = 110; // boss1 (2, 9)
    } else {
      if (type === 'shooter') frame = 73; // (1, 6)
      else if (type === 'tank') frame = 81; // (9, 6)
      else if (type === 'kamikaze') frame = 74; // (2, 6)
      else if (type === 'sniper') frame = 79; // (7, 6)
    }
    this.setFrame(frame);

    // Сброс цвета
    this.clearTint();
  }

  public takeDamage(amount: number) {
    if (this.hp <= 0) return;
    this.hp -= amount;
    this.flash = 0.2;

    // Воспроизведение звука
    SoundManager.playHit(false);

    // Мерцание белым
    this.setTint(0xffffff);
    this.scene.time.delayedCall(50, () => {
      if (this.active) this.clearTint();
    });

    if (this.hp <= 0) {
      this.die();
    }
  }

  public die() {
    this.hp = 0;
    this.disableBody(true, true);

    SoundManager.playDeath(this.isBoss ? 'boss' : this.enemyType);

    // Вызываем событие смерти на сцене для спавна лута и спецэффектов
    this.scene.events.emit('enemy-died', this);
  }

  public updateAI(dt: number, player: Player, map: GameMap) {
    if (!this.active || this.hp <= 0) return;

    // Обновляем эффект мерцания
    if (this.flash > 0) {
      this.flash -= dt * 5;
    }

    // Роевое смещение цели
    this.offsetUpdateTimer -= dt;
    if (this.offsetUpdateTimer <= 0) {
      this.targetOffsetX = (GameRNG.random() - 0.5) * 80;
      this.targetOffsetY = (GameRNG.random() - 0.5) * 80;
      this.offsetUpdateTimer = 1.0 + GameRNG.random();
    }

    const targetX = player.x + this.targetOffsetX;
    const targetY = player.y + this.targetOffsetY;
    let dodgeAng: number | null = null;

    if (this.dodgeTimer > 0) {
      this.dodgeTimer -= dt;
      dodgeAng = this.dodgeAng;
    }

    let ang = Math.atan2(targetY - this.y, targetX - this.x) + this.jitter * 0.3;
    if (dodgeAng !== null) {
      ang = dodgeAng;
    }

    const c = Math.cos(ang);
    const s = Math.sin(ang);

    let speedMod = this.iceSlow > 0 ? 0.5 : 1.0;
    if (this.iceSlow > 0) {
      this.iceSlow = Math.max(0, this.iceSlow - dt);
    }

    const currentSpeed = this.speed * speedMod;
    const body = this.body as Phaser.Physics.Arcade.Body;

    const oldX = this.x;
    const oldY = this.y;
    let attemptedMove = false;

    if (this.isBoss) {
      if (this.bossType === 'boss2') {
        // Логика Шеф-повара (Босса 2)
        this.stateTimer -= dt;
        if (this.state === 'idle') {
          attemptedMove = true;
          body.setVelocity(c * currentSpeed, s * currentSpeed);

          if (this.stateTimer <= 0) {
            if (GameRNG.random() > 0.4 && this.minionCount === 0) {
              this.state = 'summon';
              this.stateTimer = 0.7; // Время призыва
              body.setVelocity(0, 0);
            } else {
              this.state = 'telegraph';
              this.stateTimer = 0.7; // Наведение перед рывком
              this.dashTarget = { x: player.x, y: player.y };
              body.setVelocity(0, 0);
            }
          }
        } else if (this.state === 'telegraph') {
          // Стоит на месте, готовится к рывку
          body.setVelocity(0, 0);
          if (this.stateTimer <= 0) {
            this.state = 'dash';
            this.stateTimer = 0.5; // Длительность рывка
          }
        } else if (this.state === 'dash') {
          if (this.dashTarget) {
            const dashAng = Math.atan2(this.dashTarget.y - this.y, this.dashTarget.x - this.x);
            body.setVelocity(Math.cos(dashAng) * 600, Math.sin(dashAng) * 600);
          }
          if (this.stateTimer <= 0) {
            this.state = 'idle';
            this.stateTimer = 0.8 + GameRNG.random() * 0.2;
          }
        } else if (this.state === 'summon') {
          body.setVelocity(0, 0);
          if (this.stateTimer <= 0) {
            // Спавним миньонов (событие перехватит GameScene)
            this.scene.events.emit('boss-summon-minions', this);
            this.state = 'invulnerable';
            this.stateTimer = 3.0; // Фаза неуязвимости
          }
        } else if (this.state === 'invulnerable') {
          attemptedMove = true;
          // Медленно пятится назад
          body.setVelocity(-c * currentSpeed * 0.5, -s * currentSpeed * 0.5);

          if (this.stateTimer <= 0 || this.minionCount === 0) {
            this.minionCount = 0;
            this.state = 'idle';
            this.stateTimer = 0.8 + GameRNG.random() * 0.2;
          }
        }
      } else {
        // ...
        attemptedMove = true;
        body.setVelocity(c * currentSpeed, s * currentSpeed);

        this.burstCd -= dt;
        if (this.burstCd <= 0) {
          this.burstCd = this.isHeart ? 0.8 : 1.4 + GameRNG.random() * 0.1;
          this.scene.events.emit('enemy-shoot-radial', this);
        }
      }
    } else if (this.enemyType === 'shooter') {
      const los = raycastClear(map, this.x, this.y, player.x, player.y);
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      const near = dist < 80;
      const flee = this.hp < this.maxHp * 0.3;

      if (flee && dist < 200) {
        attemptedMove = true;
        body.setVelocity(-c * currentSpeed, -s * currentSpeed);
      } else if (!los || !near) {
        attemptedMove = true;
        body.setVelocity(c * currentSpeed, s * currentSpeed);
      } else {
        body.setVelocity(0, 0);
      }

      this.fireCd -= dt;
      if (this.fireCd <= 0 && los) {
        this.fireCd = ENEMY_BASE.shooter.fireCd!;
        this.scene.events.emit('enemy-shoot-lead', this);
      }
    } else if (this.enemyType === 'sniper') {
      const los = raycastClear(map, this.x, this.y, player.x, player.y);
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      const near = dist < 200;

      if (!los || !near) {
        attemptedMove = true;
        body.setVelocity(c * currentSpeed, s * currentSpeed);
      } else if (dist < 100) {
        attemptedMove = true;
        body.setVelocity(-c * currentSpeed, -s * currentSpeed);
      } else {
        body.setVelocity(0, 0);
      }

      this.fireCd -= dt;
      if (this.fireCd <= 0 && los) {
        this.fireCd = ENEMY_BASE.sniper.fireCd!;
        this.scene.events.emit('enemy-shoot-sniper', this);
      }
    } else {
      attemptedMove = true;
      body.setVelocity(c * currentSpeed, s * currentSpeed);
    }

    if (body.velocity.x !== 0 || body.velocity.y !== 0) {
      this.setRotation(Math.atan2(body.velocity.y, body.velocity.x));
    } else if (this.isBoss && this.bossType === 'boss2' && this.dashTarget) {
      this.setRotation(Math.atan2(this.dashTarget.y - this.y, this.dashTarget.x - this.x));
    }

    if (attemptedMove && (!this.dodgeTimer || this.dodgeTimer <= 0)) {
      const movedDist = Math.hypot(this.x - oldX, this.y - oldY);
      if (movedDist < currentSpeed * dt * 0.1) {
        this.stuckFrames++;
        if (this.stuckFrames > 3) {
          this.dodgeTimer = 0.8 + GameRNG.random() * 0.6;
          this.dodgeAng = Math.atan2(targetY - this.y, targetX - this.x) +
            (GameRNG.random() < 0.5 ? Math.PI / 1.5 : -Math.PI / 1.5);
          this.stuckFrames = 0;
        }
      } else {
        this.stuckFrames = 0;
      }
    }
  }
}
