import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { GameMap, randomFloorTileFar } from '../utils/MapGenerator';
import { GameRNG } from '../utils/RNG';
import { getCurrentFloor } from '../utils/Floors';

export interface LevelConfig {
  index: number;
  name: string;
  weaponOrder: string[];
  weaponWaves: number[];
  bossWave: number;
  enemyTypes: string[];
  hpMul: number;
  speedMul: number;
  dmgMul: number;
  bossHp: number;
}

export function getLevelConfig(floorIndex: number, wave: number): LevelConfig {
  const effectiveWave = Math.min(20, wave);
  const effectiveLi = (effectiveWave - 1) / 5;
  const floor = getCurrentFloor(floorIndex);

  // Допустимые типы врагов на основе уровня пола
  let enemyTypes = ['melee', 'shooter'];
  if (floorIndex >= 2) {
    enemyTypes = ['melee', 'shooter', 'tank', 'kamikaze', 'sniper'];
  } else if (floorIndex >= 1) {
    enemyTypes = ['melee', 'shooter', 'tank', 'kamikaze'];
  }

  return {
    index: floorIndex,
    name: floor.name,
    weaponOrder: ['pistol'], // Будет переопределено системой оружия
    weaponWaves: [1, 2, 3, 4, 5],
    bossWave: 5,
    enemyTypes,
    hpMul: 1 + effectiveLi * 0.4,
    speedMul: 1 + effectiveLi * 0.18,
    dmgMul: 1 + effectiveLi * 0.3,
    bossHp: 60 + effectiveLi * 50
  };
}

export class WaveManager {
  public wave: number = 1;
  public kills: number = 0;
  public globalPower: number = 1.0;
  public scaleT: number = 5.0;
  public spawnT: number = 0.5;
  public bossSpawnedThisWave: boolean = false;

  private scene: Phaser.Scene;
  private player: Player;
  private mapData: GameMap;
  private enemiesGroup: Phaser.Physics.Arcade.Group;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    mapData: GameMap,
    enemiesGroup: Phaser.Physics.Arcade.Group
  ) {
    this.scene = scene;
    this.player = player;
    this.mapData = mapData;
    this.enemiesGroup = enemiesGroup;
  }

  public update(dt: number, floorIndex: number) {
    // 1. Нарастание сложности (globalPower)
    this.scaleT -= dt;
    if (this.scaleT <= 0) {
      this.scaleT = 5.0;
      this.globalPower = Math.min(4.5, this.globalPower * 1.11);
    }

    // 2. Логика спавна босса
    const hasActiveBoss = this.enemiesGroup.getChildren().some(
      (e) => e.active && (e as Enemy).isBoss
    );

    if (this.wave % 5 === 0 && !this.bossSpawnedThisWave && !hasActiveBoss) {
      this.bossSpawnedThisWave = true;
      this.spawnBoss(floorIndex);
    }
    // 3. Обычный спавн волн врагов (только если нет активного босса)
    else if (!hasActiveBoss) {
      this.spawnT -= dt;
      const effectiveWave = Math.min(20, this.wave);
      const cap = Math.min(25, 10 + effectiveWave * 2);

      const activeEnemiesCount = this.enemiesGroup.countActive(true);

      if (this.spawnT <= 0 && activeEnemiesCount < cap) {
        this.spawnT = Math.max(
          0.8,
          1.8 - effectiveWave * 0.08 - (this.globalPower - 1) * 0.1
        );
        this.spawnNormalEnemy(floorIndex);
      }
    }
  }

  private spawnNormalEnemy(floorIndex: number) {
    const cfg = getLevelConfig(floorIndex, this.wave);
    const type = cfg.enemyTypes[Math.floor(GameRNG.random() * cfg.enemyTypes.length)];

    // Спавним за экраном, на безопасном расстоянии
    const spot = randomFloorTileFar(
      this.mapData,
      this.player.x,
      this.player.y,
      600
    );

    // Достаем свободного врага из пула или создаем нового
    let enemy = this.enemiesGroup.getFirstDead(false) as Enemy;
    if (!enemy) {
      enemy = new Enemy(this.scene, spot.x, spot.y);
      this.enemiesGroup.add(enemy);
    }

    enemy.spawn(spot.x, spot.y, type, cfg.speedMul, cfg.hpMul, this.globalPower);
  }

  private spawnBoss(floorIndex: number) {
    const isHeart = floorIndex % 4 === 3;
    const isFridgeLevel = floorIndex % 4 === 1;

    const cfg = getLevelConfig(floorIndex, this.wave);
    const spot = randomFloorTileFar(this.mapData, this.player.x, this.player.y, 500);

    // Выбор типа босса
    let bossType = 'boss1';
    if (isHeart) {
      bossType = 'heart';
    } else if (isFridgeLevel) {
      bossType = 'boss2';
    } else if (GameRNG.random() > 0.5) {
      bossType = 'boss2';
    }

    let enemy = this.enemiesGroup.getFirstDead(false) as Enemy;
    if (!enemy) {
      enemy = new Enemy(this.scene, spot.x, spot.y);
      this.enemiesGroup.add(enemy);
    }

    enemy.spawn(
      spot.x,
      spot.y,
      bossType === 'heart' ? 'melee' : 'tank', // Физический тип-наследник
      cfg.speedMul,
      cfg.hpMul,
      this.globalPower,
      true, // isBoss
      bossType
    );

    // Генерация названия и подзаголовка для баннера
    const title = bossType === 'heart'
      ? 'СЕРДЦЕ МЯСОРУБКИ'
      : bossType === 'boss2'
        ? 'ШЕФ-ПОВАР'
        : 'БОСС ПРИБЫЛ';
    const sub = bossType === 'heart'
      ? 'ОНО ПУЛЬСИРУЕТ'
      : bossType === 'boss2'
        ? 'БЕРЕГИСЬ РЫВКА'
        : 'ВЫЖИВИ';

    // Оповещаем сцену о спавне босса для отрисовки баннера и вспышки
    this.scene.events.emit('boss-spawned', { title, subtitle: sub });
  }

  public recordKill(enemy: Enemy) {
    if (enemy.isBoss) {
      this.kills += 20;
    } else {
      this.kills++;
    }

    // Каждые 10 убийств увеличивают волну
    if (this.kills > 0 && this.kills % 10 === 0) {
      this.wave++;
      this.bossSpawnedThisWave = false;

      this.scene.events.emit('wave-changed', this.wave);
    }
  }
}
