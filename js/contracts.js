const CONTRACTS_POOL = [
  {
    id: 'survive_wave_8',
    name: 'Дойти живым до волны 8',
    desc: 'Выживи и достигни 8-й волны',
    checkType: 'onWaveStart',
    targetValue: 8
  },
  {
    id: 'boss_specific_weapon',
    name: 'Казнь босса',
    desc: 'Убить босса определенным оружием',
    checkType: 'onBossKillSpecificWeapon'
  },
  {
    id: 'no_damage_60s',
    name: 'Неприкасаемый',
    desc: 'Не получать урон дольше 60 секунд подряд',
    checkType: 'update'
  },
  {
    id: 'floor_2_no_loot',
    name: 'Аскет',
    desc: 'Пройти этаж 2 не подбирая ни одного предмета',
    checkType: 'onFloorChange'
  },
  {
    id: 'kill_50_one_wave',
    name: 'Мясорубка',
    desc: 'Убить 50 врагов за одну волну',
    checkType: 'onWaveEnd'
  },
  {
    id: 'wave_under_40s',
    name: 'Скороход',
    desc: 'Завершить любую волну меньше чем за 40 секунд',
    checkType: 'onWaveEnd'
  },
  {
    id: 'full_inventory',
    name: 'Плюшкин',
    desc: 'Дойти до портала с полным инвентарём (4/4 слота)',
    checkType: 'onPortalSpawn'
  },
  {
    id: 'boss_no_dash',
    name: 'Медленно, но верно',
    desc: 'Убить босса, не используя рывок во время боя с ним',
    checkType: 'onBossKill'
  }
];

let activeContracts = [];
let contractState = {};

function initContractsUI() {
  const container = document.getElementById('contracts-list');
  const btnStart = document.getElementById('btn-contracts-start');
  const btnCancel = document.getElementById('btn-contracts-cancel');

  if (!container) return;

  btnCancel.onclick = () => {
    document.getElementById('contracts-menu').style.display = 'none';
  };

  btnStart.onclick = () => {
    document.getElementById('contracts-menu').style.display = 'none';
    startGameWithContracts();
  };
}

let selectedContractIds = new Set();
let proposedContracts = [];

function showContractsMenu() {
  const container = document.getElementById('contracts-list');
  const btnStart = document.getElementById('btn-contracts-start');
  document.getElementById('contracts-menu').style.display = 'flex';

  // Pick 3 random contracts
  let pool = [...CONTRACTS_POOL];
  pool.sort(() => GameRNG.random() - 0.5);
  proposedContracts = pool.slice(0, 3);

  // For boss_specific_weapon, assign a random weapon
  proposedContracts.forEach(c => {
    if (c.id === 'boss_specific_weapon') {
      const weaponKeys = Object.keys(WEAPONS);
      const randomWeaponId = weaponKeys[Math.floor(GameRNG.random() * weaponKeys.length)];
      c.weaponId = randomWeaponId;
      c.desc = `Убить босса используя ${WEAPONS[randomWeaponId].icon} ${WEAPONS[randomWeaponId].name}`;
    }
  });

  selectedContractIds.clear();
  renderContractsList();
}

function renderContractsList() {
  const container = document.getElementById('contracts-list');
  const btnStart = document.getElementById('btn-contracts-start');
  container.innerHTML = '';

  let stats = JSON.parse(localStorage.getItem('myasorubka_contracts_stats') || '{}');

  proposedContracts.forEach(c => {
    const el = document.createElement('div');
    const isSelected = selectedContractIds.has(c.id);

    el.style.cssText = `
      border: 2px solid ${isSelected ? 'var(--ind)' : '#ccc'};
      background: ${isSelected ? '#faf8f4' : '#fff'};
      border-radius: 6px;
      padding: 12px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 4px;
    `;

    const count = stats[c.id] || 0;

    el.innerHTML = `
      <div style="font-weight:bold; color:${isSelected ? 'var(--ind)' : '#1a1a1a'}">${c.name}</div>
      <div style="font-size:12px; color:#555;">${c.desc}</div>
      <div style="font-size:10px; color:#999; margin-top:4px;">Выполнено раз: ${count}</div>
    `;

    el.onclick = () => {
      if (selectedContractIds.has(c.id)) {
        selectedContractIds.delete(c.id);
      } else {
        if (selectedContractIds.size < 2) {
          selectedContractIds.add(c.id);
        }
      }
      renderContractsList();
    };

    container.appendChild(el);
  });

  btnStart.disabled = selectedContractIds.size !== 2;
  btnStart.innerText = `НАЧАТЬ (Выбрано ${selectedContractIds.size}/2)`;
}

function resetContractsState() {
  activeContracts = [];
  contractState = {};
}

function startGameWithContracts() {
  activeContracts = proposedContracts.filter(c => selectedContractIds.has(c.id)).map(c => ({...c, status: 'active'}));
  contractState = {
    timeWithoutDamage: 0,
    floor2LootPicked: false,
    killsThisWave: 0,
    waveStartTime: Date.now(),
    bossFightStarted: false,
    dashUsedDuringBoss: false,
    currentFloor: 0
  };
  Game.start();
}

function completeContract(c) {
  if (c.status === 'active') {
    c.status = 'completed';
    spawnBanner(Game, {title: 'КОНТРАКТ ВЫПОЛНЕН', subtitle: c.name, color: '#10b981'});
    saveContractStat(c.id);
  }
}

function failContract(c) {
  if (c.status === 'active') {
    c.status = 'failed';
    spawnFloatingText(Game, Game.player.x, Game.player.y - 60, 'КОНТРАКТ ПРОВАЛЕН', '#d92638');
  }
}

function checkContractsOnWaveStart(wave) {
  activeContracts.forEach(c => {
    if (c.id === 'survive_wave_8' && c.status === 'active' && wave >= 8) {
      completeContract(c);
    }
  });
  contractState.killsThisWave = 0;
  contractState.waveStartTime = Date.now();
}

function checkContractsOnWaveEnd() {
  activeContracts.forEach(c => {
    if (c.id === 'kill_50_one_wave' && c.status === 'active') {
      if (contractState.killsThisWave >= 50) completeContract(c);
    }
    if (c.id === 'wave_under_40s' && c.status === 'active') {
      const timeTaken = (Date.now() - contractState.waveStartTime) / 1000;
      if (timeTaken < 40) completeContract(c);
    }
  });
}

function checkContractsOnFloorStart(floorIndex) {
  contractState.currentFloor = floorIndex;

  // Checking floor 2 completion
  activeContracts.forEach(c => {
    if (c.id === 'floor_2_no_loot' && c.status === 'active') {
      // If we just entered floor 3 (index 2) and didn't fail it while on floor 2 (index 1)
      if (floorIndex > 1) {
        completeContract(c);
      }
    }
  });
}

function checkContractsOnKill() {
  contractState.killsThisWave++;
}

function checkContractsOnBossSpawn() {
  contractState.bossFightStarted = true;
  contractState.dashUsedDuringBoss = false;
}

function checkContractsOnBossKill(gameInstance) {
  contractState.bossFightStarted = false;
  activeContracts.forEach(c => {
    if (c.id === 'boss_specific_weapon' && c.status === 'active') {
      if (gameInstance.player.weaponId === c.weaponId) {
        completeContract(c);
      }
    }
    if (c.id === 'boss_no_dash' && c.status === 'active') {
      if (!contractState.dashUsedDuringBoss) {
        completeContract(c);
      } else {
        failContract(c);
      }
    }
  });
}

function updateContractsDash() {
  if (contractState.bossFightStarted) {
    contractState.dashUsedDuringBoss = true;
    activeContracts.forEach(c => {
      if (c.id === 'boss_no_dash' && c.status === 'active') {
        failContract(c);
      }
    });
  }
}

function checkContractsOnLootPicked() {
  if (contractState.currentFloor === 1) { // 1 = Floor 2
    activeContracts.forEach(c => {
      if (c.id === 'floor_2_no_loot' && c.status === 'active') {
        failContract(c);
      }
    });
  }
}

function updateContractsDamageTaken() {
  contractState.timeWithoutDamage = 0;
}

function updateContractsTimer(dt) {
  contractState.timeWithoutDamage += dt;
  activeContracts.forEach(c => {
    if (c.id === 'no_damage_60s' && c.status === 'active') {
      if (contractState.timeWithoutDamage >= 60) {
        completeContract(c);
      }
    }
  });
}

function checkContractsOnPortalSpawn() {
  activeContracts.forEach(c => {
    if (c.id === 'full_inventory' && c.status === 'active') {
      const maxSlots = 4 + (metaState.extraSlot || 0);
      let itemsCount = 0;
      for (let i = 0; i < Game.inventory.length; i++) {
        if (Game.inventory[i]) itemsCount++;
      }
      if (itemsCount >= maxSlots) {
        completeContract(c);
      }
    }
  });
}

function drawContractsHUD(ctx, Game) {
  if (Game.state !== 'play' && Game.state !== 'portal') return;
  if (!activeContracts || activeContracts.length === 0) return;

  const startX = Game.viewW - 220;
  let startY = 60;

  ctx.textAlign = 'right';
  ctx.font = 'bold 12px monospace';

  activeContracts.forEach(c => {
    let color = '#555';
    let statusText = '...';
    if (c.status === 'active') { color = '#e8a317'; statusText = 'активен'; }
    if (c.status === 'completed') { color = '#10b981'; statusText = 'выполнен'; }
    if (c.status === 'failed') { color = '#d92638'; statusText = 'провален'; }

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = c.status === 'active' ? 4 : 0;

    // special progress logic
    let progress = '';
    if (c.status === 'active') {
      if (c.id === 'kill_50_one_wave') progress = ` (${contractState.killsThisWave}/50)`;
      if (c.id === 'no_damage_60s') progress = ` (${Math.floor(contractState.timeWithoutDamage)}s/60s)`;
    }

    ctx.fillText(`${c.name}${progress} [${statusText}]`, startX + 200, startY);
    ctx.shadowBlur = 0;
    startY += 18;
  });
}

function saveContractStat(id) {
  let stats = JSON.parse(localStorage.getItem('myasorubka_contracts_stats') || '{}');
  stats[id] = (stats[id] || 0) + 1;
  localStorage.setItem('myasorubka_contracts_stats', JSON.stringify(stats));
}
