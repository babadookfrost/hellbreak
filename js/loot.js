const LOOT_RARITY = {
  common: { name: 'ОБЫЧНЫЙ', color: '#999', weight: 60, scale: 1 },
  rare: { name: 'РЕДКИЙ', color: 'var(--cyan)', colorVal: '#0ea5c7', weight: 30, scale: 1.5 },
  epic: { name: 'ЭПИЧЕСКИЙ', color: 'var(--ind)', colorVal: '#e8a317', weight: 9, scale: 2 },
  legendary: { name: 'ЛЕГЕНДАРНЫЙ', color: 'var(--blood)', colorVal: '#d92638', weight: 1, scale: 3 }
};

const LOOT_ICONS = ['◆', '▲', '■', '●', '➤', '✹', '★', '✚', '⚡', '♦'];

const AFFIXES_POS = [
  { id: 'dmg', name: 'Урон', val: 0.2, text: '+X% урона оружия' },
  { id: 'pierce', name: 'Пронзание', val: 1, text: '+X пронзания пуль', isInt: true },
  { id: 'dash_cd', name: 'Рывок', val: -0.2, text: 'Кулдаун рывка X%' },
  { id: 'speed', name: 'Скорость', val: 0.15, text: '+X% скор. передвижения' },
  { id: 'slow_time', name: 'Заморозка', val: 0.5, text: 'Время X при ходьбе', isUnique: true },
  { id: 'reload', name: 'Перезарядка', val: -0.25, text: 'Перезарядка быстрее на X%' },
  { id: 'pickup', name: 'Радиус', val: 0.25, text: '+X% радиуса подбора' },
  { id: 'ammo_save', name: 'Патроны', val: 0.1, text: 'X% шанс не тратить патрон' }
];

const AFFIXES_NEG = [
  { id: 'hp_down', name: 'Хрупкость', val: -0.1, text: '-X% макс. HP' },
  { id: 'speed_down', name: 'Тяжесть', val: -0.1, text: '-X% скор. передвижения' },
  { id: 'ammo_down', name: 'Малоемкость', val: -1, text: '-X макс. патрон', isInt: true },
  { id: 'dmg_taken', name: 'Уязвимость', val: 0.2, text: 'Входящий урон +X%' },
  { id: 'reload_up', name: 'Медлительность', val: 0.25, text: 'Перезарядка +X%' },
  { id: 'dmg_down', name: 'Слабость', val: -0.05, text: 'Урон -X%' }
];

function generateLootItem(forcedRarity, floorIndex = 0) {
  let rarityId = forcedRarity;
  if (!rarityId) {
        let epicBonus = 0;
    let legBonus = 0;
    if (floorIndex > 0) {
      const floor = FLOORS[floorIndex % FLOORS.length];
      epicBonus = (floor.lootBonus || 0) * 100;
      legBonus = (floor.lootBonus || 0) * 50;
    }

    // adjust weights temporarily
    const tempRarity = JSON.parse(JSON.stringify(LOOT_RARITY));
    tempRarity.epic.weight += epicBonus;
    tempRarity.legendary.weight += legBonus;

    let totalWeight = 0;
    for (const key in tempRarity) totalWeight += tempRarity[key].weight;

    const r = Math.random() * totalWeight;
    let sum = 0;
    for (const [id, data] of Object.entries(tempRarity)) {
      sum += data.weight;
      if (r <= sum) { rarityId = id; break; }
    }
    if(!rarityId) rarityId = 'common';
  }

  const rarity = LOOT_RARITY[rarityId];
  const pos = AFFIXES_POS[Math.floor(Math.random() * AFFIXES_POS.length)];
  let posVal = pos.val * rarity.scale;
  if (pos.isInt) posVal = Math.max(1, Math.round(posVal));
  if (pos.isUnique) posVal = pos.val;

  const neg = AFFIXES_NEG[Math.floor(Math.random() * AFFIXES_NEG.length)];
  let negVal = neg.val * rarity.scale;
  if (neg.isInt) negVal = Math.round(negVal) || -1;

  return {
    icon: LOOT_ICONS[Math.floor(Math.random() * LOOT_ICONS.length)],
    rarity: rarityId, color: rarity.colorVal,
    pos: { id: pos.id, val: posVal, name: pos.name, text: pos.text.replace('X', pos.isUnique ? posVal : Math.abs(pos.isInt ? posVal : Math.round(posVal * 100))) },
    neg: { id: neg.id, val: negVal, name: neg.name, text: neg.text.replace('X', Math.abs(neg.isInt ? negVal : Math.round(negVal * 100))) }
  };
}

const META_KEY='myasorubka_meta_v1';
let metaState = { shards: 0, hpLvl: 0, dmgLvl: 0, startItem: 0, extraSlot: 0 };
function loadMeta(){try{const r=JSON.parse(localStorage.getItem(META_KEY));if(r)metaState=r;}catch{}}
function saveMeta(){try{localStorage.setItem(META_KEY,JSON.stringify(metaState));}catch{}}
const META_UPGRADES = [
  { id: 'hp', name: '+10% Макс HP', maxLvl: 5, baseCost: 50, costMult: 1.5, desc: 'Увеличивает стартовое здоровье.' },
  { id: 'dmg', name: '+5% Урон', maxLvl: 5, baseCost: 100, costMult: 1.5, desc: 'Увеличивает базовый урон.' },
  { id: 'item', name: 'Стартовый предмет', maxLvl: 1, baseCost: 300, costMult: 1, desc: 'Даёт случайный предмет на старте.' },
  { id: 'slot', name: '+1 Слот инвентаря', maxLvl: 1, baseCost: 500, costMult: 1, desc: 'Увеличивает инвентарь до 5 слотов.' }
];

function getUpgradeCost(id, lvl) {
  const upg = META_UPGRADES.find(u => u.id === id);
  if (lvl >= upg.maxLvl) return Infinity;
  return Math.floor(upg.baseCost * Math.pow(upg.costMult, lvl));
}

function renderUpgradesUI() {
  document.getElementById('upgrade-shards-count').innerText = metaState.shards;
  const list = document.getElementById('upgrades-list');
  list.innerHTML = '';

  META_UPGRADES.forEach(u => {
    let lvl = 0;
    if (u.id === 'hp') lvl = metaState.hpLvl;
    if (u.id === 'dmg') lvl = metaState.dmgLvl;
    if (u.id === 'item') lvl = metaState.startItem;
    if (u.id === 'slot') lvl = metaState.extraSlot;

    const cost = getUpgradeCost(u.id, lvl);
    const maxed = lvl >= u.maxLvl;
    const canAfford = metaState.shards >= cost && !maxed;

    const row = document.createElement('div');
    row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px; border:1px solid #ccc; border-radius:6px; background:#faf8f4; margin-bottom: 8px;';

    row.innerHTML = `
      <div style="flex:1;">
        <div style="font-weight:bold; color:var(--bone); font-size:14px;">${u.name} <span style="color:#7a7a7a;">(${lvl}/${u.maxLvl})</span></div>
        <div style="font-size:11px; color:#7a7a7a;">${u.desc}</div>
      </div>
      <button ${canAfford?'':'disabled'} style="background:${canAfford?'var(--ind)':'#ccc'}; color:${canAfford?'#1a1a1a':'#777'}; border:none; padding:8px 12px; font-weight:bold; border-radius:4px; cursor:${canAfford?'pointer':'not-allowed'}; font-family:'Courier New',monospace; font-size:12px; margin-left:8px;">
        ${maxed ? 'МАКС' : cost + ' ОСК.'}
      </button>
    `;

    const btn = row.querySelector('button');
    if (canAfford) {
      btn.onclick = () => {
        metaState.shards -= cost;
        if (u.id === 'hp') metaState.hpLvl++;
        if (u.id === 'dmg') metaState.dmgLvl++;
        if (u.id === 'item') metaState.startItem++;
        if (u.id === 'slot') metaState.extraSlot++;
        saveMeta();
        renderUpgradesUI();
      };
    }

    list.appendChild(row);
  });
}
