import Phaser from 'phaser';
import { Player, Operator } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Bullet } from '../entities/Bullet';
import { InputManager } from '../utils/Input';
import { GameMap, generateMap, isWallTile, getFloorThemeRow, getWallTileCol, getFloorTileCol } from '../utils/MapGenerator';
import { TILE, MAP_W, MAP_H } from '../utils/Constants';
import { WaveManager } from '../systems/WaveManager';
import { SoundManager } from '../systems/SoundManager';
import { WeaponSystem } from '../systems/WeaponSystem';
import { GameRNG } from '../utils/RNG';

export class GameScene extends Phaser.Scene {
  public player!: Player;
  public mapData!: GameMap;
  public tilemap!: Phaser.Tilemaps.Tilemap;
  public mapLayer!: Phaser.Tilemaps.TilemapLayer;

  public enemiesGroup!: Phaser.Physics.Arcade.Group;
  public playerBullets!: Phaser.Physics.Arcade.Group;
  public enemyBullets!: Phaser.Physics.Arcade.Group;

  public waveManager!: WaveManager;
  public weaponSystem!: WeaponSystem;

  private inputManager!: InputManager;
  public floorIndex: number = 0;

  constructor() {
    super('GameScene');
  }

  create() {
    // Инициализация звуков
    SoundManager.init(this);

    // 1. Процедурная генерация карты
    this.mapData = generateMap();

    // Настройка границ мира физики
    this.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);

    // 2. Создание тайлмапа Phaser 3
    this.tilemap = this.make.tilemap({
      tileWidth: 16,
      tileHeight: 16,
      width: MAP_W,
      height: MAP_H
    });

    const tileset = this.tilemap.addTilesetImage('tiny-dungeon', 'tiny-dungeon');
    if (tileset) {
      this.mapLayer = this.tilemap.createBlankLayer('MapLayer', tileset) as Phaser.Tilemaps.TilemapLayer;
      this.mapLayer.setScale(TILE / 16);

      const floorIndex = this.floorIndex;
      for (let ty = 0; ty < MAP_H; ty++) {
        for (let tx = 0; tx < MAP_W; tx++) {
          const isWall = isWallTile(this.mapData, tx, ty);
          const row = getFloorThemeRow(floorIndex);
          let col = 0;

          if (isWall) {
            const isEdge = tx === 0 || ty === 0 || tx === MAP_W - 1 || ty === MAP_H - 1;
            col = isEdge ? getWallTileCol(this.mapData, tx, ty) : 8;
          } else {
            col = getFloorTileCol(tx, ty);
          }

          const tileIndex = row * 12 + col;
          this.mapLayer.putTileAt(tileIndex, tx, ty);

          if (isWall) {
            const tile = this.mapLayer.getTileAt(tx, ty);
            if (tile) {
              tile.setCollision(true);
            }
          }
        }
      }

      this.physics.add.existing(this.mapLayer, true);
    }

    // 3. Создаем группы объектов
    this.enemiesGroup = this.physics.add.group({
      classType: Enemy,
      runChildUpdate: false
    });

    this.playerBullets = this.physics.add.group({
      classType: Bullet,
      runChildUpdate: false
    });

    this.enemyBullets = this.physics.add.group({
      classType: Bullet,
      runChildUpdate: false
    });

    // 4. Создаем игрока
    const spawnX = this.mapData.spawnWorld.x;
    const spawnY = this.mapData.spawnWorld.y;

    const recruitOperator: Operator = {
      id: 'recruit',
      name: 'Рекрут',
      desc: 'Базовый оперативник',
      statsText: 'Нет бонусов',
      hpMul: 1.0,
      dmgMul: 1.0,
      weapon: null,
      color1: '#1a1a1a',
      color2: '#fff',
      cost: 0,
      unlockedByDefault: true
    };

    this.player = new Player(this, spawnX, spawnY, recruitOperator);

    // 5. Инициализация систем
    this.waveManager = new WaveManager(this, this.player, this.mapData, this.enemiesGroup);
    this.weaponSystem = new WeaponSystem(this, this.player, this.playerBullets, this.enemiesGroup);

    // 6. Настройка коллизий
    this.physics.add.collider(this.player, this.mapLayer);
    this.physics.add.collider(this.enemiesGroup, this.mapLayer);

    // Коллизии пуль с картой (стенами)
    this.physics.add.collider(this.playerBullets, this.mapLayer, (bulletObj) => {
      (bulletObj as Bullet).destroyBullet();
    });

    this.physics.add.collider(this.enemyBullets, this.mapLayer, (bulletObj) => {
      (bulletObj as Bullet).destroyBullet();
    });

    // Нанесение урона врагам пулями игрока
    this.physics.add.overlap(this.playerBullets, this.enemiesGroup, (bulletObj, enemyObj) => {
      (bulletObj as Bullet).hitEnemy(enemyObj as Enemy, this.enemiesGroup);
    });

    // Нанесение урона игроку пулями врагов
    this.physics.add.overlap(this.player, this.enemyBullets, (playerObj, bulletObj) => {
      (bulletObj as Bullet).hitPlayer(playerObj as Player);
    });

    // Столкновение игрока с врагами
    this.physics.add.overlap(this.player, this.enemiesGroup, (playerObj, enemyObj) => {
      this.handlePlayerEnemyCollision(playerObj as Player, enemyObj as Enemy);
    });

    // 7. Инициализируем менеджер ввода
    this.inputManager = new InputManager(this);

    // 8. Настройка камеры
    this.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);

    // 9. Подписка на игровые события
    this.events.on('player-dash', () => {
      this.cameras.main.shake(100, 0.008);
    });

    this.events.on('boss-spawned', (data: { title: string; subtitle: string }) => {
      this.cameras.main.shake(500, 0.02);
      this.cameras.main.flash(400, 217, 38, 56, false);
      console.log(`[БОСС] ${data.title}: ${data.subtitle}`);
    });

    this.events.on('enemy-died', (enemy: Enemy) => {
      this.waveManager.recordKill(enemy);
      this.cameras.main.shake(80, 0.005);
      this.spawnBloodParticles(enemy.x, enemy.y);
    });

    this.events.on('boss-summon-minions', (boss: Enemy) => {
      const minionsToSpawn = 3;
      for (let m = 0; m < minionsToSpawn; m++) {
        const mx = boss.x + (GameRNG.random() - 0.5) * 100;
        const my = boss.y + (GameRNG.random() - 0.5) * 100;

        let minion = this.enemiesGroup.getFirstDead(false) as Enemy;
        if (!minion) {
          minion = new Enemy(this, mx, my);
          this.enemiesGroup.add(minion);
        }

        minion.spawn(mx, my, 'kamikaze', 1.2, 5, this.waveManager.globalPower);
        minion.isMinion = true;

        minion.once('inactive', () => {
          if (boss.active) boss.minionCount = Math.max(0, boss.minionCount - 1);
        });
      }
    });

    this.events.on('enemy-shoot-radial', (enemy: Enemy) => {
      const count = enemy.isHeart ? 12 : 8;
      for (let k = 0; k < count; k++) {
        const a = (k / count) * Math.PI * 2;
        this.spawnEnemyBullet(enemy.x, enemy.y, Math.cos(a) * 420, Math.sin(a) * 420, '#d92638');
      }
    });

    this.events.on('enemy-shoot-lead', (enemy: Enemy) => {
      const dist = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y);
      const bulletSpeed = 500;
      const leadTime = dist / bulletSpeed;

      const body = this.player.body as Phaser.Physics.Arcade.Body;
      const predX = this.player.x + body.velocity.x * leadTime;
      const predY = this.player.y + body.velocity.y * leadTime;

      const shootAng = Math.atan2(predY - enemy.y, predX - enemy.x) + enemy.jitter * 0.3;
      this.spawnEnemyBullet(enemy.x, enemy.y, Math.cos(shootAng) * bulletSpeed, Math.sin(shootAng) * bulletSpeed, '#d92638');
    });

    this.events.on('enemy-shoot-sniper', (enemy: Enemy) => {
      const bulletSpeed = 900;
      const shootAng = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
      this.spawnEnemyBullet(enemy.x, enemy.y, Math.cos(shootAng) * bulletSpeed, Math.sin(shootAng) * bulletSpeed, '#ff00ff');
    });

    this.events.on('player-hit', () => {
      this.cameras.main.shake(100, 0.01);
      this.cameras.main.flash(100, 217, 38, 56, false);

      if (this.player.hp <= 0) {
        console.log('Игрок погиб.');
      }
    });

    this.events.on('bullet-splash', (x: number, y: number, radius: number) => {
      this.spawnSplashEffect(x, y, radius);
    });

    console.log('GameScene: Враги, оружие и события подключены.');
  }

  private spawnEnemyBullet(x: number, y: number, vx: number, vy: number, tintHex: string) {
    let bullet = this.enemyBullets.getFirstDead(false) as Bullet;
    if (!bullet) {
      bullet = new Bullet(this, x, y);
      this.enemyBullets.add(bullet);
    }
    bullet.spawn(x, y, vx, vy, false, 10, 1, tintHex);
  }

  private handlePlayerEnemyCollision(player: Player, enemy: Enemy) {
    if (player.invuln <= 0) {
      const dmg = enemy.enemyType === 'kamikaze' ? 20 : 10;

      player.hp = Math.max(0, player.hp - dmg);
      player.invuln = 1.2;

      this.events.emit('player-hit', dmg);

      if (enemy.enemyType === 'kamikaze') {
        enemy.die(); // Взрыв камикадзе
      } else {
        SoundManager.playHit(false);
      }
    }
  }

  private spawnBloodParticles(x: number, y: number) {
    const blood = this.add.graphics();
    blood.fillStyle(0xd92638, 0.85);
    blood.fillCircle(x, y, 10);

    this.tweens.add({
      targets: blood,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 300,
      onComplete: () => {
        blood.destroy();
      }
    });
  }

  private spawnSplashEffect(x: number, y: number, radius: number) {
    const splash = this.add.graphics();
    splash.fillStyle(0x4b0082, 0.4);
    splash.lineStyle(2, 0x4b0082, 0.8);
    splash.fillCircle(x, y, radius);
    splash.strokeCircle(x, y, radius);

    this.tweens.add({
      targets: splash,
      alpha: 0,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 250,
      onComplete: () => {
        splash.destroy();
      }
    });
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;

    // Обновляем ввод
    this.inputManager.update();

    // Обновляем движение игрока
    const walkMul = InputManager.wantWalk ? 0.5 : 1.0;
    this.player.updateMovement(dt, 1.0, walkMul);

    // Обновляем боевую систему игрока
    // По умолчанию: dmgMul = 1.0, reloadMul = 1.0, ammoAdd = 0
    this.weaponSystem.update(dt, 1.0, 1.0, 0);

    // Обновляем WaveManager
    this.waveManager.update(dt, this.floorIndex);

    // Обновляем ИИ активных врагов
    this.enemiesGroup.getChildren().forEach((enemyObj) => {
      const enemy = enemyObj as Enemy;
      if (enemy.active) {
        enemy.updateAI(dt, this.player, this.mapData);
      }
    });
  }
}
