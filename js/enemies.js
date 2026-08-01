function enemyIsWallTile(map, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= 48 || ty >= 48) return true;
  return map.grid[ty * 48 + tx] === 1;
}

function findAStarPath(map, startX, startY, endX, endY) {
  const startTx = Math.floor(startX / 80);
  const startTy = Math.floor(startY / 80);
  const endTx = Math.floor(endX / 80);
  const endTy = Math.floor(endY / 80);

  if (startTx === endTx && startTy === endTy) {
    return [{ x: endX, y: endY }];
  }

  // If target tile is a wall, find an adjacent tile that is not a wall
  let targetTx = endTx;
  let targetTy = endTy;
  if (enemyIsWallTile(map, targetTx, targetTy)) {
    let found = false;
    const dirs = [
      [0, -1], [0, 1], [-1, 0], [1, 0],
      [-1, -1], [-1, 1], [1, -1], [1, 1]
    ];
    for (const [dx, dy] of dirs) {
      if (!enemyIsWallTile(map, targetTx + dx, targetTy + dy)) {
        targetTx += dx;
        targetTy += dy;
        found = true;
        break;
      }
    }
    if (!found) return [{ x: endX, y: endY }];
  }

  const MAP_W = 48;
  const MAP_H = 48;
  const size = MAP_W * MAP_H;

  const openSet = [];
  const closedSet = new Uint8Array(size);
  const gScore = new Float32Array(size);
  gScore.fill(Infinity);
  const parent = new Int16Array(size);
  parent.fill(-1);

  const startIdx = startTy * MAP_W + startTx;
  const endIdx = targetTy * MAP_W + targetTx;

  gScore[startIdx] = 0;
  openSet.push({ idx: startIdx, f: Math.hypot(startTx - targetTx, startTy - targetTy) });

  let foundPath = false;

  while (openSet.length > 0) {
    let bestIdx = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[bestIdx].f) {
        bestIdx = i;
      }
    }
    const current = openSet[bestIdx];
    const currIdx = current.idx;

    if (currIdx === endIdx) {
      foundPath = true;
      break;
    }

    // Remove from open set
    openSet[bestIdx] = openSet[openSet.length - 1];
    openSet.pop();

    closedSet[currIdx] = 1;

    const currX = currIdx % MAP_W;
    const currY = Math.floor(currIdx / MAP_W);

    const dirs = [
      [0, -1, 1], [0, 1, 1], [-1, 0, 1], [1, 0, 1],
      [-1, -1, 1.414], [-1, 1, 1.414], [1, -1, 1.414], [1, 1, 1.414]
    ];

    for (const [dx, dy, cost] of dirs) {
      const nx = currX + dx;
      const ny = currY + dy;

      if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) continue;
      if (enemyIsWallTile(map, nx, ny)) continue;

      // Corner cutting check
      if (dx !== 0 && dy !== 0) {
        if (enemyIsWallTile(map, currX + dx, currY) || enemyIsWallTile(map, currX, currY + dy)) {
          continue;
        }
      }

      const nIdx = ny * MAP_W + nx;
      if (closedSet[nIdx]) continue;

      const tentativeG = gScore[currIdx] + cost;
      if (tentativeG < gScore[nIdx]) {
        parent[nIdx] = currIdx;
        gScore[nIdx] = tentativeG;
        const h = Math.hypot(nx - targetTx, ny - targetTy);
        const f = tentativeG + h;

        let existing = openSet.find(o => o.idx === nIdx);
        if (existing) {
          existing.f = f;
        } else {
          openSet.push({ idx: nIdx, f });
        }
      }
    }
  }

  if (!foundPath) {
    return [{ x: endX, y: endY }];
  }

  const path = [];
  let curr = endIdx;
  while (curr !== -1) {
    const tx = curr % MAP_W;
    const ty = Math.floor(curr / MAP_W);
    path.push({
      x: (tx + 0.5) * 80,
      y: (ty + 0.5) * 80
    });
    curr = parent[curr];
  }
  path.reverse();

  if (path.length > 0) {
    path[path.length - 1] = { x: endX, y: endY };
  }
  return path;
}

function findCoverTile(Game, e) {
  const p = Game.player;
  const startTx = Math.floor(e.x / 80);
  const startTy = Math.floor(e.y / 80);

  let bestX = null;
  let bestY = null;
  let bestDist = Infinity;

  // Search in a 4x4 grid around the enemy
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const tx = startTx + dx;
      const ty = startTy + dy;

      if (tx < 0 || tx >= 48 || ty < 0 || ty >= 48) continue;
      if (enemyIsWallTile(Game.map, tx, ty)) continue;

      const wx = (tx + 0.5) * 80;
      const wy = (ty + 0.5) * 80;

      // Check if it blocks LOS to player
      if (!raycastClear(Game.map, p.x, p.y, wx, wy)) {
        // Find if it has a neighboring wall (good cover)
        let nearWall = false;
        const neighbors = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        for (const [nx, ny] of neighbors) {
          if (enemyIsWallTile(Game.map, tx + nx, ty + ny)) {
            nearWall = true;
            break;
          }
        }

        if (nearWall) {
          const dist = Math.hypot(wx - e.x, wy - e.y);
          if (dist < bestDist) {
            bestDist = dist;
            bestX = wx;
            bestY = wy;
          }
        }
      }
    }
  }

  if (bestX !== null) {
    return { x: bestX, y: bestY };
  }
  return null;
}

function updateSquadLeader(Game) {
  if (Game.squadLeader && !Game.squadLeader.dead) {
    return;
  }
  // Find a new leader among alive enemies
  let best = null;
  let maxHp = -1;
  for (let i = 0; i < Game.enemies.length; i++) {
    const e = Game.enemies[i];
    if (!e.dead && !e.isBoss && !e.isMinion) {
      if (e.hp > maxHp) {
        maxHp = e.hp;
        best = e;
      }
    }
  }
  if (best) {
    Game.squadLeader = best;
    best.isLeader = true;
    spawnFloatingText(Game, best.x, best.y - 25, "Я ЛИДЕР! ЗА МНОЙ!", "#ff0055");
    playAISoundCue("aggression");
  } else {
    Game.squadLeader = null;
  }
}

function coordinateSquad(Game, sdt) {
  updateSquadLeader(Game);

  // Count how many enemies are currently near the player
  const p = Game.player;
  let nearCount = 0;
  for (let i = 0; i < Game.enemies.length; i++) {
    const e = Game.enemies[i];
    if (!e.dead) {
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      if (dx*dx + dy*dy < 120*120) {
        nearCount++;
      }
    }
  }
  Game.enemiesNearPlayerCount = nearCount;

  // Distribute flanking / vanguard roles among alive enemies
  let aliveCount = 0;
  for (let i = 0; i < Game.enemies.length; i++) {
    const e = Game.enemies[i];
    if (e.dead) continue;
    aliveCount++;

    // Assign role if not present
    if (!e.role) {
      if (e.type === "shooter" || e.type === "sniper") {
        e.role = "supporter";
      } else if (e.type === "tank") {
        e.role = "vanguard";
      } else {
        // Melee or others
        e.role = (aliveCount % 2 === 0) ? "flanker" : "vanguard";
      }
    }
  }
}

function followCachedPath(Game, e, targetX, targetY, sdt) {
  if (e.pathTimer === undefined) e.pathTimer = 0;
  e.pathTimer -= sdt;

  const needsRecalc = !e.path || e.path.length === 0 || e.pathIndex >= e.path.length || e.pathTimer <= 0;
  if (needsRecalc) {
    e.path = findAStarPath(Game.map, e.x, e.y, targetX, targetY);
    e.pathIndex = 0;
    e.pathTimer = 0.2 + GameRNG.random() * 0.15; // Jitter to prevent spikes
  }

  if (e.path && e.pathIndex < e.path.length) {
    const node = e.path[e.pathIndex];
    const dx = node.x - e.x;
    const dy = node.y - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 20) {
      e.pathIndex++;
    }
    if (e.pathIndex < e.path.length) {
      const nextNode = e.path[e.pathIndex];
      return Math.atan2(nextNode.y - e.y, nextNode.x - e.x);
    }
  }
  return Math.atan2(targetY - e.y, targetX - e.x);
}

function playAISoundCue(type) {
  if (!audioInitialized || !audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const vol = typeof getSFXVolume === "function" ? getSFXVolume() : 0.5;
  const v = vol / 0.5;

  if (type === "aggression") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(350, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.08 * v, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } else if (type === "retreat") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.06 * v, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } else if (type === "leader_lost") {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(180, audioCtx.currentTime);
    osc.frequency.setValueAtTime(120, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1 * v, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  }
}

const ENEMY_BASE = {
  melee: { hp: 1, speed: 160, r: 16 },
  shooter: { hp: 2, speed: 50, r: 16, fireCd: 1.5, bulletSpeed: 500 },
  tank: { hp: 6, speed: 95, r: 22 },
  kamikaze: { hp: 1, speed: 220, r: 14 },
  sniper: { hp: 2, speed: 40, r: 14, fireCd: 3.0, bulletSpeed: 900 },
  rider_scout: { hp: 4, speed: 175, r: 16 },
  rider_taran: { hp: 9, speed: 120, r: 20 },
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

function playRiderLaugh() {
  if (!audioInitialized) return;
  const vol = typeof getSFXVolume === "function" ? getSFXVolume() : 0.5;
  const v = vol / 0.5;
  const now = audioCtx.currentTime;
  const tones = [520, 440, 360];
  const duration = 0.08;
  const gap = 0.12;

  tones.forEach((freq, idx) => {
    const startTime = now + idx * gap;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq - 100, startTime + duration);

    gain.gain.setValueAtTime(0.06 * v, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  });
}

function spawnEnemy(Game) {
  const cfg = getLevelConfig(Game.level, Game.wave);
  const hasActiveRider = Game.enemies.some(e => !e.dead && (e.type === 'rider_scout' || e.type === 'rider_taran'));
  const isRiderSpawn = Game.wave >= 3 && !hasActiveRider && GameRNG.random() < 0.12;
  const type = isRiderSpawn
    ? (GameRNG.random() < 0.5 ? 'rider_scout' : 'rider_taran')
    : cfg.enemyTypes[Math.floor(GameRNG.random() * cfg.enemyTypes.length)];

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
    laughTimer: isRiderSpawn ? 3 + GameRNG.random() * 2 : 0,
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

  if (e.type === "rider_scout" || e.type === "rider_taran") {
    let rarityId = "rare";
    const rand = GameRNG.random();
    if (rand < 0.05) {
      rarityId = "legendary";
    } else if (rand < 0.25) {
      rarityId = "epic";
    } else {
      rarityId = "rare";
    }
    const item = generateLootItem(rarityId, Game.floorIndex || 0);
    Game.loot.push({ x: e.x, y: e.y, type: "item", item: item, r: 10, t: 0 });
  } else {
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
  const p = Game.player;
  const list = Game.boss ? Game.enemies.concat([Game.boss]) : Game.enemies;

  // Handle debug AI overlay toggle via key 'KeyO'
  if (typeof Input !== "undefined" && Input.keys && Input.keys["KeyO"]) {
    if (!Game.debugKeyWasDown) {
      Game.debugKeyWasDown = true;
      Game.aiDebugEnabled = !Game.aiDebugEnabled;
      spawnFloatingText(Game, Game.player.x, Game.player.y - 40, Game.aiDebugEnabled ? "DEBUG AI: ON" : "DEBUG AI: OFF", "#00ffcc");
    }
  } else {
    Game.debugKeyWasDown = false;
  }

  // 1. Group Coordination & Adaptive Behavior Blackboard Update
  coordinateSquad(Game, sdt);

  // Manage dynamic behavioral assessment
  if (!Game.behaviorTimer) Game.behaviorTimer = 0;
  Game.behaviorTimer -= sdt;
  if (Game.behaviorTimer <= 0) {
    Game.behaviorTimer = 2.0;
    const pSpeed = Math.hypot(p.vx || 0, p.vy || 0);
    if (pSpeed > 120) {
      Game.playerBehavior = "kiting";
    } else if (pSpeed < 30) {
      Game.playerBehavior = "standing";
    } else {
      Game.playerBehavior = "normal";
    }
  }

  const playerLowHp = p.hp < p.maxHp * 0.35;

  // Coordinated Attack Warning Trigger with Sound & Particle effects
  if (playerLowHp) {
    if (!Game.lastCoordinatedAttackTime || Game.time - Game.lastCoordinatedAttackTime > 15) {
      Game.lastCoordinatedAttackTime = Game.time;
      spawnFloatingText(Game, p.x, p.y - 45, "ОНИ ОБЪЕДИНЯЮТСЯ!", "#ff0000");
      spawnImpact(Game, p.x, p.y, "#ff0000", 60);
      playAISoundCue("aggression");
      for (let idx = 0; idx < list.length; idx++) {
        const enemy = list[idx];
        if (!enemy.dead && !enemy.isBoss) {
          spawnImpact(Game, enemy.x, enemy.y, "#ff3300", 25);
        }
      }
    }
  }

  // Difficulty Multipliers: standard vs Daily
  const modeMultiplier = Game.isDaily ? 1.25 : 1.0;

  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (e.dead) continue;

    // Manage flash visual effect
    e.flash = Math.max(0, e.flash - sdt * 5);

    const isRider = e.type === "rider_scout" || e.type === "rider_taran";

    // 2. Laughing behavior for riders
    if (isRider) {
      if (e.laughTimer === undefined || e.laughTimer === null) {
        e.laughTimer = 3 + GameRNG.random() * 2;
      }
      e.laughTimer -= sdt;
      if (e.laughTimer <= 0) {
        e.laughTimer = 3.0 + GameRNG.random() * 2.0;
        const RIDER_LAUGHS = ["ХА-ХА-ХА!", "НЕ УБЕЖИШЬ!", "ДОГОНЮ!", "КУДА ТЫ?", "ХЕ-ХЕ-ХЕ!"];
        const phrase = RIDER_LAUGHS[Math.floor(GameRNG.random() * RIDER_LAUGHS.length)];
        spawnFloatingText(Game, e.x, e.y - 20, phrase, "#ff7700");
        playRiderLaugh();
      }
    }

    // 3. Mutual Separation (Personal space) - maintain minimum 40px between non-boss enemies
    for (let j = i + 1; j < list.length; j++) {
      const other = list[j];
      if (other !== e && !other.dead && !e.isBoss && !other.isBoss) {
        const dx = other.x - e.x;
        const dy = other.y - e.y;
        const distSq = dx * dx + dy * dy;
        const minDist = 40;
        if (distSq < minDist * minDist && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const push = (minDist - dist) * 0.5;
          const px = (dx / dist) * push;
          const py = (dy / dist) * push;
          moveWithCollision(Game.map, e, -px, -py);
          moveWithCollision(Game.map, other, px, py);
        }
      }
    }

    // 4. Slowdown from status effects (iceSlow)
    let speedMod = e.iceSlow > 0 ? 0.5 : 1;
    if (e.iceSlow) e.iceSlow = Math.max(0, e.iceSlow - sdt);

    const oldX = e.x;
    const oldY = e.y;
    let attemptedMove = false;
    let ang = 0;

    // Check line of sight (LOS) to player
    const hasLos = raycastClear(Game.map, e.x, e.y, p.x, p.y);
    const distToPlayer = Math.hypot(p.x - e.x, p.y - e.y);

    // Initialize enemy state machine if needed
    if (!e.state) e.state = "CHASE";

    // 5. DECIDE STATE & TACTICAL TARGETS (FSM)
    let targetX = p.x;
    let targetY = p.y;

    if (e.isBoss) {
      // Boss-Specific Multi-Phase AI logic
      const isPhase2 = e.hp < e.maxHp * 0.5;
      if (isPhase2 && !e.phase2Announced) {
        e.phase2Announced = true;
        const phaseName = e.isHeart ? "СЕРДЦЕБИЕНИЕ УСКОРЯЕТСЯ!" : "БОСС: ФАЗА 2!";
        spawnFloatingText(Game, e.x, e.y - 45, phaseName, "#ff0033");
        spawnImpact(Game, e.x, e.y, "#ff0033", 75);
        playAISoundCue("aggression");
      }

      if (e.bossType === "boss2") {
        e.stateTimer -= sdt;
        if (e.state === "idle") {
          attemptedMove = true;
          const bossSpeed = e.speed * (isPhase2 ? 1.4 : 1.0);
          const desiredAngle = Math.atan2(p.y - e.y, p.x - e.x) + 0.3;
          ang = desiredAngle;
          moveWithCollision(Game.map, e, Math.cos(ang) * bossSpeed * speedMod * sdt, Math.sin(ang) * bossSpeed * speedMod * sdt);
          if (e.stateTimer <= 0) {
            if (GameRNG.random() > 0.4 && e.minionCount === 0) {
              e.state = "summon";
              e.stateTimer = isPhase2 ? 0.4 : 0.7;
            } else {
              e.state = "telegraph";
              e.stateTimer = isPhase2 ? 0.4 : 0.7;
              e.dashTarget = { x: p.x, y: p.y };
            }
          }
        } else if (e.state === "telegraph") {
          ang = Math.atan2(p.y - e.y, p.x - e.x);
        } else if (e.state === "dash") {
          const dashAng = Math.atan2(e.dashTarget.y - e.y, e.dashTarget.x - e.x);
          ang = dashAng;
          const dashSpeed = isPhase2 ? 750 : 600;
          moveWithCollision(Game.map, e, Math.cos(dashAng) * dashSpeed * sdt, Math.sin(dashAng) * dashSpeed * sdt);
          if (e.stateTimer <= 0) {
            e.state = "idle";
            e.stateTimer = isPhase2 ? 0.5 + GameRNG.random() * 0.15 : 0.8 + GameRNG.random() * 0.2;
          }
        } else if (e.state === "summon") {
          if (e.stateTimer <= 0) {
            const minionsToSpawn = isPhase2 ? 5 : 3;
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
            e.stateTimer = isPhase2 ? 2.0 : 3.0;
          }
        } else if (e.state === "invulnerable") {
          attemptedMove = true;
          const backAng = Math.atan2(p.y - e.y, p.x - e.x) + Math.PI;
          ang = backAng;
          moveWithCollision(Game.map, e, Math.cos(backAng) * e.speed * 0.5 * sdt, Math.sin(backAng) * e.speed * 0.5 * sdt);
          let aliveMinions = 0;
          for (let j = 0; j < Game.enemies.length; j++) {
            if (Game.enemies[j].isMinion && !Game.enemies[j].dead) aliveMinions++;
          }
          if (aliveMinions === 0 || e.stateTimer <= 0) {
            e.minionCount = 0;
            e.state = "idle";
            e.stateTimer = 0.8 + GameRNG.random() * 0.2;
          }
        }
        if (e.state === "telegraph" && e.stateTimer <= 0) {
          e.state = "dash";
          e.stateTimer = 0.5;
        }
      } else {
        // Heart Boss or other boss behavior (Circle around player, shoot circular burst)
        attemptedMove = true;
        ang = Math.atan2(p.y - e.y, p.x - e.x);
        moveWithCollision(Game.map, e, Math.cos(ang) * e.speed * sdt, Math.sin(ang) * e.speed * sdt);

        e.burstCd -= sdt;
        if (e.burstCd <= 0) {
          // Special spiral pattern and faster firecd for Phase 2 Heart Boss
          e.burstCd = isPhase2 ? 0.4 : 0.8;
          const numBullets = isPhase2 ? 16 : 12;
          const offsetAng = isPhase2 ? (Game.time * 2) % (Math.PI * 2) : 0;
          for (let k = 0; k < numBullets; k++) {
            const a = (k / numBullets) * Math.PI * 2 + offsetAng;
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
    } else {
      // REGULAR ENEMY ROLE-BASED AI
      const isLowHp = e.hp < e.maxHp * 0.3;
      const alreadyTooManyMelee = Game.enemiesNearPlayerCount >= 3;

      // 6. ADAPTIVE STATE TRANSLATIONS
      if (playerLowHp) {
        e.state = "CHASE";
      } else if (isLowHp && e.type !== "kamikaze") {
        if (e.state !== "RETREAT") {
          e.state = "RETREAT";
          playAISoundCue("retreat");
        }
      } else if (e.type === "shooter" || e.type === "sniper") {
        if (distToPlayer < 120) {
          e.state = "RETREAT";
        } else if (e.fireCd > 0.5 && hasLos) {
          e.state = "COVER";
        } else {
          e.state = "CHASE";
        }
      } else if (e.type === "melee" || e.type === "tank") {
        if (alreadyTooManyMelee && e.role === "flanker") {
          e.state = "FLANK";
        } else {
          e.state = "CHASE";
        }
      }

      // 7. ROLE ACTIONS & PATH TARGETS
      if (e.state === "CHASE") {
        targetX = p.x;
        targetY = p.y;

        // Intercept calculations
        const pSpeed = Math.hypot(p.vx || 0, p.vy || 0);
        if (pSpeed > 30) {
          targetX += (p.vx || 0) * 0.4;
          targetY += (p.vy || 0) * 0.4;
        }

        e.offsetUpdateTimer -= sdt;
        if (e.offsetUpdateTimer <= 0) {
          e.targetOffsetX = (GameRNG.random() - 0.5) * 40;
          e.targetOffsetY = (GameRNG.random() - 0.5) * 40;
          e.offsetUpdateTimer = 1.0 + GameRNG.random();
        }
        if (!isRider) {
          targetX += e.targetOffsetX;
          targetY += e.targetOffsetY;
        }

        // Navigate
        if (hasLos && (e.type === "melee" || isRider)) {
          ang = Math.atan2(targetY - e.y, targetX - e.x);
        } else {
          ang = followCachedPath(Game, e, targetX, targetY, sdt);
        }
        attemptedMove = true;
      }
      else if (e.state === "FLANK") {
        const baseAng = Math.atan2(e.y - p.y, e.x - p.x);
        const flankOffset = (e.role === "flanker" ? 1.0 : -1.0) * (Math.PI / 3);
        const flankAng = baseAng + flankOffset;
        targetX = p.x + Math.cos(flankAng) * 160;
        targetY = p.y + Math.sin(flankAng) * 160;

        ang = followCachedPath(Game, e, targetX, targetY, sdt);
        attemptedMove = true;
      }
      else if (e.state === "RETREAT") {
        const oppositeAng = Math.atan2(e.y - p.y, e.x - p.x);
        targetX = e.x + Math.cos(oppositeAng) * 200;
        targetY = e.y + Math.sin(oppositeAng) * 200;

        if (hasLos) {
          ang = oppositeAng;
        } else {
          ang = followCachedPath(Game, e, targetX, targetY, sdt);
        }
        attemptedMove = true;
      }
      else if (e.state === "COVER") {
        if (!e.coverTile || GameRNG.random() < 0.05) {
          e.coverTile = findCoverTile(Game, e);
        }

        if (e.coverTile) {
          targetX = e.coverTile.x;
          targetY = e.coverTile.y;
          ang = followCachedPath(Game, e, targetX, targetY, sdt);
        } else {
          const oppositeAng = Math.atan2(e.y - p.y, e.x - p.x);
          targetX = p.x + Math.cos(oppositeAng) * 250;
          targetY = p.y + Math.sin(oppositeAng) * 250;
          ang = followCachedPath(Game, e, targetX, targetY, sdt);
        }
        attemptedMove = true;
      }

      // Dodge roll mechanism
      if (e.type === "melee" && distToPlayer < 100 && GameRNG.random() < 0.01 && (!e.dodgeTimer || e.dodgeTimer <= 0)) {
        e.dodgeTimer = 0.5;
        e.dodgeAng = Math.atan2(p.y - e.y, p.x - e.x) + (GameRNG.random() < 0.5 ? Math.PI/2 : -Math.PI/2);
        spawnFloatingText(Game, e.x, e.y - 15, "УВОРОТ!", "#ffaa00");
      }

      let dodgeAng = null;
      if (e.dodgeTimer > 0) {
        e.dodgeTimer -= sdt;
        dodgeAng = e.dodgeAng;
      }

      if (dodgeAng !== null) {
        ang = dodgeAng;
      }

      // 8. MOVE EXECUTION (Multiplied by mode difficulty)
      if (attemptedMove) {
        const finalSpeed = e.speed * speedMod * modeMultiplier;
        moveWithCollision(Game.map, e, Math.cos(ang) * finalSpeed * sdt, Math.sin(ang) * finalSpeed * sdt);
      }

      // 9. SHOOTING & PREDICTIVE AIMING FOR SHOOTERS/SNIPERS
      if (e.type === "shooter") {
        e.fireCd -= sdt;
        if (e.fireCd <= 0 && hasLos) {
          e.fireCd = ENEMY_BASE.shooter.fireCd;

          e.shotsFired = (e.shotsFired || 0) + 1;
          if (e.shotsFired >= 4) {
            e.shotsFired = 0;
            e.coverTile = null;
            e.state = "COVER";
          }

          const leadTime = distToPlayer / ENEMY_BASE.shooter.bulletSpeed;
          const predX = p.x + (p.vx || 0) * leadTime;
          const predY = p.y + (p.vy || 0) * leadTime;
          const shootAng = Math.atan2(predY - e.y, predX - e.x) + (e.jitter || 0) * 0.3;

          Game.bullets.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(shootAng) * ENEMY_BASE.shooter.bulletSpeed * modeMultiplier,
            vy: Math.sin(shootAng) * ENEMY_BASE.shooter.bulletSpeed * modeMultiplier,
            r: 6,
            friendly: false,
            dmg: 1,
            pierce: 1,
            dead: false,
            color: "#d92638",
          });
        }
      }
      else if (e.type === "sniper") {
        e.fireCd -= sdt;
        if (e.fireCd <= 0 && hasLos) {
          e.fireCd = ENEMY_BASE.sniper.fireCd;

          e.shotsFired = (e.shotsFired || 0) + 1;
          if (e.shotsFired >= 3) {
            e.shotsFired = 0;
            e.coverTile = null;
            e.state = "COVER";
          }

          const leadTime = distToPlayer / ENEMY_BASE.sniper.bulletSpeed;
          const predX = p.x + (p.vx || 0) * leadTime;
          const predY = p.y + (p.vy || 0) * leadTime;
          const sniperAng = Math.atan2(predY - e.y, predX - e.x);

          Game.bullets.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(sniperAng) * ENEMY_BASE.sniper.bulletSpeed * modeMultiplier,
            vy: Math.sin(sniperAng) * ENEMY_BASE.sniper.bulletSpeed * modeMultiplier,
            r: 4,
            friendly: false,
            dmg: 1,
            pierce: 1,
            dead: false,
            color: "#ff00ff",
          });
        }
      }
    }

    // 10. SAVE VELOCITY FOR VISUALS
    e.vx = Math.cos(ang) * e.speed * speedMod;
    e.vy = Math.sin(ang) * e.speed * speedMod;

    // 11. STUCK RECOVERY
    if (attemptedMove && (!e.dodgeTimer || e.dodgeTimer <= 0)) {
      const movedDist = Math.hypot(e.x - oldX, e.y - oldY);
      if (movedDist < e.speed * sdt * 0.1) {
        e.stuckFrames = (e.stuckFrames || 0) + 1;
        if (e.stuckFrames > 3) {
          e.dodgeTimer = 0.8 + GameRNG.random() * 0.6;
          e.dodgeAng = Math.atan2(p.y - e.y, p.x - e.x) + (GameRNG.random() < 0.5 ? Math.PI / 1.5 : -Math.PI / 1.5);
          e.stuckFrames = 0;
        }
      } else {
        e.stuckFrames = 0;
      }
    }

    // 12. PLAYER COLLISION / MELEE DAMAGE
    const rr = e.r + p.r;
    if (p.invuln <= 0 && Math.hypot(e.x - p.x, e.y - p.y) < rr) {
      if (e.type === "kamikaze") {
        killEnemy(Game, e);
      } else {
        let baseDmg = 10;
        if (e.type === "rider_taran") baseDmg = 25;
        else if (e.type === "rider_scout") baseDmg = 12;
        const pdmg = baseDmg * Game.stats.dmgTakenMul;
        p.hp -= pdmg;
        p.invuln = 1.2;
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
