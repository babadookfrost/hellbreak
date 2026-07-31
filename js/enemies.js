const ENEMY_BASE = {
  melee: { hp: 1, speed: 160, r: 16 },
  shooter: { hp: 2, speed: 50, r: 16, fireCd: 1.5, bulletSpeed: 500 },
  tank: { hp: 6, speed: 95, r: 22 },
  kamikaze: { hp: 1, speed: 220, r: 14 },
  sniper: { hp: 2, speed: 40, r: 14, fireCd: 3.0, bulletSpeed: 900 },
};

function getLevelConfig(li, wave = 1) {
  const effectiveWave = Math.min(20, wave);
  const effectiveLi = (effectiveWave - 1) / 5;
  const shift = li % WEAPON_POOL.length;
  const rotated = WEAPON_POOL.slice(shift).concat(WEAPON_POOL.slice(0, shift));
  const floor = getCurrentFloor(li);
  return {
    index: li,
    name: floor.name,
    weaponOrder: rotated.slice(0, 5),
    weaponWaves: [1, 2, 3, 4, 5], // these will now be offset by floor (e.g. 1, 3, 5 relative to floor start)
    bossWave: 5, // boss is always every 5th wave
    enemyTypes:
      li >= 2
        ? ["melee", "shooter", "tank", "kamikaze", "sniper"]
        : li >= 1
          ? ["melee", "shooter", "tank", "kamikaze"]
          : ["melee", "shooter"],
    hpMul: 1 + effectiveLi * 0.4,
    speedMul: 1 + effectiveLi * 0.18,
    dmgMul: 1 + effectiveLi * 0.3,
    bossHp: 60 + effectiveLi * 50,
  };
}

function playSoundHit(isCrit) {
  if (!audioInitialized) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.type = isCrit ? "sine" : "triangle";
  osc.frequency.setValueAtTime(isCrit ? 800 : 400, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(
    isCrit ? 1200 : 200,
    audioCtx.currentTime + 0.05,
  );

  const vol = typeof getSFXVolume === "function" ? getSFXVolume() : 0.5;
  gain.gain.setValueAtTime(
    (isCrit ? 0.2 : 0.1) * (vol / 0.5),
    audioCtx.currentTime,
  );
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

function playSoundDeath(type) {
  if (!audioInitialized) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.type = "sawtooth";
  let dur = 0.2;
  const vol = typeof getSFXVolume === "function" ? getSFXVolume() : 0.5;
  const v = vol / 0.5;
  if (type === "boss") {
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.5);
    dur = 0.5;
    gain.gain.setValueAtTime(0.3 * v, audioCtx.currentTime);
  } else if (type === "tank") {
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.25);
    dur = 0.25;
    gain.gain.setValueAtTime(0.15 * v, audioCtx.currentTime);
  } else {
    osc.frequency.setValueAtTime(250, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.15);
    dur = 0.15;
    gain.gain.setValueAtTime(0.1 * v, audioCtx.currentTime);
  }

  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + dur);
  osc.start();
  osc.stop(audioCtx.currentTime + dur);
}

function spawnEnemy(Game) {
  const cfg = getLevelConfig(Game.level, Game.wave),
    type = cfg.enemyTypes[Math.floor(GameRNG.random() * cfg.enemyTypes.length)];
  const base = ENEMY_BASE[type];
  const vs = Math.max(Game.effViewW || Game.viewW, Game.effViewH || Game.viewH);
  const spot = randomFloorTileFar(
    Game.map,
    Game.player.x,
    Game.player.y,
    vs * 0.7,
  );
  const power = Math.min(4.5, Game.globalPower);
  const hp = Math.max(
    1,
    Math.round(base.hp * cfg.hpMul * Math.min(2.5, power)),
  );
  Game.enemies.push({
    x: spot.x,
    y: spot.y,
    r: base.r,
    type,
    hp,
    maxHp: hp,
    speed: base.speed * cfg.speedMul * Math.min(2.1, power),
    fireCd: base.fireCd || 0,
    jitter: (GameRNG.random() - 0.5) * 0.5,
    dead: false,
    flash: 0,
    targetOffsetX: 0,
    targetOffsetY: 0,
    offsetUpdateTimer: 0,
    dodgeTimer: 0,
    dodgeAng: 0,
  });
}

function spawnBoss(Game) {
  const isHeart = Game.level % FLOORS.length === 3;
  const isFridgeLevel = Game.level % FLOORS.length === 1;

  const cfg = getLevelConfig(Game.level, Game.wave);
  const spot = randomFloorTileFar(Game.map, Game.player.x, Game.player.y, 500);

  // Decide which boss to spawn
  let bossType = "boss1";
  if (isHeart) {
    bossType = "heart";
  } else if (isFridgeLevel) {
    bossType = "boss2";
  } // Guarantee Boss 2 on Fridge level
  else if (GameRNG.random() > 0.5) {
    bossType = "boss2";
  } // 50/50 otherwise

  Game.boss = {
    x: spot.x,
    y: spot.y,
    r: bossType === "heart" ? 56 : bossType === "boss2" ? 60 : 46,
    hp: cfg.bossHp * (bossType === "heart" ? 1.5 : 1),
    maxHp: cfg.bossHp * (bossType === "heart" ? 1.5 : 1),
    speed: (bossType === "heart" ? 50 : 75) * cfg.speedMul,
    burstCd: bossType === "heart" ? 1.2 : 1.6,
    dead: false,
    flash: 0,
    isBoss: true,
    isHeart: bossType === "heart",
    bossType: bossType,
    targetOffsetX: 0,
    targetOffsetY: 0,
    offsetUpdateTimer: 0,
    dodgeTimer: 0,
    dodgeAng: 0,

    // Boss 2 specific logic
    state: "idle",
    stateTimer: 0,
    dashTarget: null,
    minionCount: 0,
  };

  const title =
    bossType === "heart"
      ? "СЕРДЦЕ МЯСОРУБКИ"
      : bossType === "boss2"
        ? "ШЕФ-ПОВАР"
        : "БОСС ПРИБЫЛ";
  const sub =
    bossType === "heart"
      ? "ОНО ПУЛЬСИРУЕТ"
      : bossType === "boss2"
        ? "БЕРЕГИСЬ РЫВКА"
        : "ВЫЖИВИ";

  spawnBanner(Game, { title: title, subtitle: sub, color: "#d92638" });
  screenFlash(Game, 0.8);
  screenShake(Game, 10);
}

function killEnemy(Game, e) {
  if (e.dead) return;
  e.dead = true;
  playSoundDeath(e.isBoss ? "boss" : e.type);
  Game.hitstop = Math.max(Game.hitstop || 0, 0.06);
  if (!e.isBoss) screenShake(Game, 1.5);

  if (e.type === "kamikaze") {
    burst(Game, e.x, e.y, 40, "#d97706", 300, 100);
    spawnImpact(Game, e.x, e.y, "#d97706", 60);
    screenShake(Game, 8);
    const p = Game.player;
    if (p.invuln <= 0 && Math.hypot(e.x - p.x, e.y - p.y) < 60 + p.r) {
      const pdmg = 20 * Game.stats.dmgTakenMul;
      p.hp -= pdmg;
      p.invuln = 1.2;
      if (typeof updateContractsDamageTaken === "function")
        updateContractsDamageTaken();
      playSoundHit(false);
      spawnFloatingText(
        Game,
        p.x,
        p.y - 20,
        "-" + Math.round(pdmg * 10) / 10,
        "#d92638",
      );
      screenFlash(Game, 0.5);
      if (p.hp <= 0) Game.die();
    }
  }

  if (!Game.loot) Game.loot = [];

  // 25% шанс выпадания HP сферы
  if (GameRNG.random() < 0.1) {
    const item = generateLootItem(
      null,
      Game.floorIndex || 0,
      Game.floorIndex || 0,
    );
    let lx = e.x,
      ly = e.y;
    if (
      (item.rarity === "epic" || item.rarity === "legendary") &&
      Game.enemies.length > 2 &&
      GameRNG.random() < 0.5
    ) {
      // Риск/награда: спавним эпик/легендарку рядом с группой живых врагов
      let target =
        Game.enemies[Math.floor(GameRNG.random() * Game.enemies.length)];
      if (!target.dead && target !== e) {
        lx = target.x + (GameRNG.random() - 0.5) * 40;
        ly = target.y + (GameRNG.random() - 0.5) * 40;
      }
    }
    Game.loot.push({ x: lx, y: ly, type: "item", item: item, r: 10, t: 0 });
  } else if (GameRNG.random() < 0.25) {
    Game.loot.push({ x: e.x, y: e.y, type: "hp", r: 8 });
  }
  // 30% шанс выпадания очков мощи
  else if (GameRNG.random() < 0.3) {
    const rand = GameRNG.random();
    const color =
      rand < 0.05
        ? "#ff6600"
        : rand < 0.2
          ? "#e8a317"
          : rand < 0.5
            ? "#0ea5c7"
            : "#ffffff";
    Game.loot.push({ x: e.x, y: e.y, type: "weapon", color: color, r: 10 });
  }

  let aliveEnemies = 0;
  for (let i = 0; i < Game.enemies.length; i++) {
    if (!Game.enemies[i].dead && Game.enemies[i] !== e) aliveEnemies++;
  }
  if (aliveEnemies === 0 && !Game.boss) Game.shotSlowmo = 0.5;

  if (e.isBoss) {
    Game.kills += 20;
    burst(Game, e.x, e.y, 80, "#d92638", 450, 150);
    screenFlash(Game, 1.0);
    screenShake(Game, 15);
    spawnFloatingText(
      Game,
      e.x,
      e.y - 40,
      e.isHeart ? "СЕРДЦЕ ОСТАНОВЛЕНО" : "BOSS SLAIN",
      e.isHeart ? "#ff0000" : "#e8a317",
    );
    Game.loot.push({
      x: e.x,
      y: e.y,
      type: "item",
      item: generateLootItem(
        GameRNG.random() > 0.5 ? "legendary" : "epic",
        Game.floorIndex || 0,
      ),
      r: 10,
      t: 0,
    });
    Game.onBossDefeated();
    if (typeof checkContractsOnBossKill === "function")
      checkContractsOnBossKill(Game);
    return;
  }

  Game.kills++;
  if (typeof checkContractsOnKill === "function") checkContractsOnKill();
  burst(
    Game,
    e.x,
    e.y,
    14,
    e.type === "shooter"
      ? "#b829dd"
      : e.type === "tank"
        ? "#5a3a86"
        : "#d92638",
    280,
    100,
  );
  spawnFloatingText(Game, e.x, e.y - 15, "+1", "#d92638");
  if (Game.kills % 10 === 0) {
    if (typeof checkContractsOnWaveEnd === "function")
      checkContractsOnWaveEnd();
    Game.wave++;
    Game.bossSpawnedThisWave = false;
    if (typeof checkContractsOnWaveStart === "function")
      checkContractsOnWaveStart(Game.wave);
    const item = generateLootItem(
      null,
      Game.floorIndex || 0,
      Game.floorIndex || 0,
    );
    let lx = Game.player.x + (GameRNG.random() - 0.5) * 40;
    let ly = Game.player.y + (GameRNG.random() - 0.5) * 40;
    if (
      (item.rarity === "epic" || item.rarity === "legendary") &&
      Game.enemies.length > 2 &&
      GameRNG.random() < 0.5
    ) {
      let target =
        Game.enemies[Math.floor(GameRNG.random() * Game.enemies.length)];
      if (!target.dead) {
        lx = target.x + (GameRNG.random() - 0.5) * 40;
        ly = target.y + (GameRNG.random() - 0.5) * 40;
      }
    }
    Game.loot.push({ x: lx, y: ly, type: "item", item: item, r: 10, t: 0 });
  }
}

function updateEnemies(Game, sdt) {
  const p = Game.player,
    list = Game.boss ? Game.enemies.concat([Game.boss]) : Game.enemies;
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (e.dead) continue;
    e.flash = Math.max(0, e.flash - sdt * 5);

    e.offsetUpdateTimer -= sdt;
    if (e.offsetUpdateTimer <= 0) {
      e.targetOffsetX = (GameRNG.random() - 0.5) * 80;
      e.targetOffsetY = (GameRNG.random() - 0.5) * 80;
      e.offsetUpdateTimer = 1.0 + GameRNG.random();
    }
    const targetX = p.x + e.targetOffsetX;
    const targetY = p.y + e.targetOffsetY;
    let dodgeAng = null;
    if (e.dodgeTimer > 0) {
      e.dodgeTimer -= sdt;
      dodgeAng = e.dodgeAng;
    }

    let ang = Math.atan2(targetY - e.y, targetX - e.x) + (e.jitter || 0) * 0.3;
    if (dodgeAng !== null) {
      ang = dodgeAng;
    }
    const c = Math.cos(ang),
      s = Math.sin(ang);

    let speedMod = e.iceSlow > 0 ? 0.5 : 1;
    if (e.iceSlow) e.iceSlow = Math.max(0, e.iceSlow - sdt);

    const oldX = e.x,
      oldY = e.y;
    let attemptedMove = false;
    e.vx = c * e.speed * speedMod;
    e.vy = s * e.speed * speedMod; // Save for visual rotation later

    if (e.isBoss) {
      if (e.bossType === "boss2") {
        e.stateTimer -= sdt;
        if (e.state === "idle") {
          attemptedMove = true;
          moveWithCollision(Game.map, e, c * e.speed * sdt, s * e.speed * sdt);
          if (e.stateTimer <= 0) {
            if (GameRNG.random() > 0.4 && e.minionCount === 0) {
              e.state = "summon";
              e.stateTimer = 0.7; // Faster summon telegraph
            } else {
              e.state = "telegraph";
              e.stateTimer = 0.7; // Faster dash telegraph
              e.dashTarget = { x: p.x, y: p.y };
            }
          }
        } else if (e.state === "telegraph") {
          // Stand still, aiming at dash target
        } else if (e.state === "dash") {
          const dashAng = Math.atan2(
            e.dashTarget.y - e.y,
            e.dashTarget.x - e.x,
          );
          moveWithCollision(
            Game.map,
            e,
            Math.cos(dashAng) * 600 * sdt,
            Math.sin(dashAng) * 600 * sdt,
          );
          if (e.stateTimer <= 0) {
            e.state = "idle";
            e.stateTimer = 0.8 + GameRNG.random() * 0.2;
          } // 0.8 to 1.0s pause between attacks
        } else if (e.state === "summon") {
          // Stand still, invulnerable (handled in hit logic)
          if (e.stateTimer <= 0) {
            // Spawn minions
            const minionsToSpawn = 3;
            for (let m = 0; m < minionsToSpawn; m++) {
              Game.enemies.push({
                x: e.x + (GameRNG.random() - 0.5) * 100,
                y: e.y + (GameRNG.random() - 0.5) * 100,
                r: ENEMY_BASE.kamikaze.r,
                type: "kamikaze",
                hp: 5,
                maxHp: 5,
                speed: ENEMY_BASE.kamikaze.speed * 1.2,
                dead: false,
                flash: 0,
                targetOffsetX: 0,
                targetOffsetY: 0,
                offsetUpdateTimer: 0,
                dodgeTimer: 0,
                dodgeAng: 0,
                isMinion: true,
              });
              e.minionCount++;
            }
            e.state = "invulnerable";
            e.stateTimer = 3.0; // Reduced from 5.0s max time in invuln phase
          }
        } else if (e.state === "invulnerable") {
          attemptedMove = true;
          moveWithCollision(
            Game.map,
            e,
            -c * e.speed * 0.5 * sdt,
            -s * e.speed * 0.5 * sdt,
          ); // slowly back away
          // Check if minions are dead
          let aliveMinions = 0;
          for (let j = 0; j < Game.enemies.length; j++)
            if (Game.enemies[j].isMinion && !Game.enemies[j].dead)
              aliveMinions++;
          if (aliveMinions === 0 || e.stateTimer <= 0) {
            e.minionCount = 0;
            e.state = "idle";
            e.stateTimer = 0.8 + GameRNG.random() * 0.2; // 0.8 to 1.0s pause
          }
        }

        if (e.state === "telegraph" && e.stateTimer <= 0) {
          e.state = "dash";
          e.stateTimer = 0.5; // dash duration
          // Don't update dash target here to dash in the telegraphed direction
        }
      } else {
        attemptedMove = true;
        moveWithCollision(Game.map, e, c * e.speed * sdt, s * e.speed * sdt);
        e.burstCd -= sdt;
        if (e.burstCd <= 0) {
          e.burstCd = e.isHeart ? 0.8 : 1.4 + GameRNG.random() * 0.1; // Reduced from 1.2 (Heart) and 2.2 (Shooter)
          for (let k = 0; k < 12; k++) {
            const a = (k / 12) * Math.PI * 2;
            Game.bullets.push({
              x: e.x,
              y: e.y,
              vx: Math.cos(a) * 420,
              vy: Math.sin(a) * 420,
              r: 7,
              friendly: false,
              dmg: 1,
              pierce: 1,
              dead: false,
              color: "#d92638",
            });
          }
        }
      }
    } else if (e.type === "shooter") {
      const los = raycastClear(Game.map, e.x, e.y, p.x, p.y);
      const dist = Math.hypot(p.x - e.x, p.y - e.y);
      const near = dist < 80;
      const flee = e.hp < e.maxHp * 0.3;
      if (flee && dist < 200) {
        attemptedMove = true;
        moveWithCollision(Game.map, e, -c * e.speed * sdt, -s * e.speed * sdt);
      } else if (!los || !near) {
        attemptedMove = true;
        moveWithCollision(Game.map, e, c * e.speed * sdt, s * e.speed * sdt);
      }
      e.fireCd -= sdt;
      if (e.fireCd <= 0 && los) {
        e.fireCd = ENEMY_BASE.shooter.fireCd;
        const leadTime = dist / ENEMY_BASE.shooter.bulletSpeed;
        const predX = p.x + (p.vx || 0) * leadTime;
        const predY = p.y + (p.vy || 0) * leadTime;
        const shootAng =
          Math.atan2(predY - e.y, predX - e.x) + (e.jitter || 0) * 0.3;
        Game.bullets.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(shootAng) * ENEMY_BASE.shooter.bulletSpeed,
          vy: Math.sin(shootAng) * ENEMY_BASE.shooter.bulletSpeed,
          r: 6,
          friendly: false,
          dmg: 1,
          pierce: 1,
          dead: false,
          color: "#d92638",
        });
      }
    } else if (e.type === "sniper") {
      const los = raycastClear(Game.map, e.x, e.y, p.x, p.y);
      const near = Math.hypot(p.x - e.x, p.y - e.y) < 200;
      if (!los || !near) {
        attemptedMove = true;
        moveWithCollision(Game.map, e, c * e.speed * sdt, s * e.speed * sdt);
      } else if (Math.hypot(p.x - e.x, p.y - e.y) < 100) {
        attemptedMove = true;
        moveWithCollision(Game.map, e, -c * e.speed * sdt, -s * e.speed * sdt);
      }
      e.fireCd -= sdt;
      if (e.fireCd <= 0 && los) {
        e.fireCd = ENEMY_BASE.sniper.fireCd;
        const sniperAng = Math.atan2(p.y - e.y, p.x - e.x);
        Game.bullets.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(sniperAng) * ENEMY_BASE.sniper.bulletSpeed,
          vy: Math.sin(sniperAng) * ENEMY_BASE.sniper.bulletSpeed,
          r: 4,
          friendly: false,
          dmg: 1,
          pierce: 1,
          dead: false,
          color: "#ff00ff",
        });
      }
    } else {
      attemptedMove = true;
      moveWithCollision(Game.map, e, c * e.speed * sdt, s * e.speed * sdt);
    }

    if (attemptedMove && (!e.dodgeTimer || e.dodgeTimer <= 0)) {
      const movedDist = Math.hypot(e.x - oldX, e.y - oldY);
      if (movedDist < e.speed * sdt * 0.1) {
        e.stuckFrames = (e.stuckFrames || 0) + 1;
        if (e.stuckFrames > 3) {
          console.warn(
            `[Enemy Stuck] Type: ${e.type}, x: ${e.x.toFixed(1)}, y: ${e.y.toFixed(1)}`,
          );
          e.dodgeTimer = 0.8 + GameRNG.random() * 0.6;
          // More aggressive dodge angle if they are really stuck
          e.dodgeAng =
            Math.atan2(targetY - e.y, targetX - e.x) +
            (GameRNG.random() < 0.5 ? Math.PI / 1.5 : -Math.PI / 1.5);
          e.stuckFrames = 0;
        }
      } else {
        e.stuckFrames = 0;
      }
    }
    const rr = e.r + p.r;
    if (p.invuln <= 0 && Math.hypot(e.x - p.x, e.y - p.y) < rr) {
      if (e.type === "kamikaze") {
        killEnemy(Game, e);
      } else {
        const pdmg = 10 * Game.stats.dmgTakenMul;
        p.hp -= pdmg;
        p.invuln = 1.2; // 1.2 сек бессмертия при ударе
        playSoundHit(false);
        spawnFloatingText(
          Game,
          p.x,
          p.y - 20,
          "-" + Math.round(pdmg * 10) / 10,
          "#d92638",
        );
        burst(Game, p.x, p.y, 30, "#d92638", 300);
        screenShake(Game, 15);
        screenFlash(Game, 0.5);
        if (p.hp <= 0) Game.die();
      }
    }
  }
}
