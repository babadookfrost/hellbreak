import { FLOORS } from './Floors';
import { GameRNG } from './RNG';

export interface LootAffix {
  id: string;
  name: string;
  val: number;
  text: string;
  isPerc?: boolean;
  isInt?: boolean;
  isUnique?: boolean;
}

export interface LootItem {
  name: string;
  icon: string;
  rarity: string;
  color: string;
  pos: {
    id: string;
    val: number;
    name: string;
    desc: string;
    text: string;
  };
  neg: {
    id: string;
    val: number;
    name: string;
    desc: string;
    text: string;
  };
  t?: number;
}

export const LOOT_RARITY: { [key: string]: { name: string; color: string; colorVal: string; weight: number; scale: number } } = {
  common: { name: 'ОБЫЧНЫЙ', color: '#999', colorVal: '#999999', weight: 60, scale: 1 },
  rare: {
    name: 'РЕДКИЙ',
    color: 'var(--cyan)',
    colorVal: '#0ea5c7',
    weight: 30,
    scale: 1.5
  },
  epic: {
    name: 'ЭПИЧЕСКИЙ',
    color: 'var(--ind)',
    colorVal: '#e8a317',
    weight: 9,
    scale: 2
  },
  legendary: {
    name: 'ЛЕГЕНДАРНЫЙ',
    color: 'var(--blood)',
    colorVal: '#d92638',
    weight: 1,
    scale: 3
  }
};

export const LOOT_ICONS = ['◆', '▲', '■', '●', '➤', '✹', '★', '✚', '⚡', '♦'];

export const AFFIXES_POS: LootAffix[] = [
  { id: 'dmg', name: 'Урон', val: 0.2, text: '+X% Урон', isPerc: true },
  { id: 'pierce', name: 'Пронзание', val: 1, text: '+X Целей пробито', isInt: true },
  { id: 'dash_cd', name: 'Рывок', val: -0.2, text: '-X% Перезарядка рывка', isPerc: true },
  { id: 'speed', name: 'Скорость', val: 0.15, text: '+X% Скорость бега', isPerc: true },
  { id: 'slow_time', name: 'Заморозка', val: 0.5, text: 'Замедление времени', isUnique: true },
  { id: 'reload', name: 'Перезарядка', val: -0.25, text: '-X% Время перезарядки', isPerc: true },
  { id: 'pickup', name: 'Радиус', val: 0.25, text: '+X% Радиус лута', isPerc: true },
  { id: 'ammo_save', name: 'Патроны', val: 0.1, text: '+X% Шанс б/п выстрела', isPerc: true }
];

export const AFFIXES_NEG: LootAffix[] = [
  { id: 'hp_down', name: 'Хрупкость', val: -0.1, text: '-X% Здоровье', isPerc: true },
  { id: 'speed_down', name: 'Тяжесть', val: -0.1, text: '-X% Скорость бега', isPerc: true },
  { id: 'ammo_down', name: 'Малоемкость', val: -1, text: '-X Патронов в магазине', isInt: true },
  { id: 'dmg_taken', name: 'Уязвимость', val: 0.2, text: '+X% Урон по вам', isPerc: true },
  { id: 'reload_up', name: 'Медлительность', val: 0.25, text: '+X% Время перезарядки', isPerc: true },
  { id: 'dmg_down', name: 'Слабость', val: -0.05, text: '-X% Урон', isPerc: true }
];

export function generateLootItem(forcedRarity: string | null, floorIndex: number = 0): LootItem {
  let rarityId = forcedRarity;
  if (!rarityId) {
    let epicBonus = 0;
    let legBonus = 0;
    if (floorIndex > 0) {
      const floor = FLOORS[floorIndex % FLOORS.length];
      epicBonus = (floor.lootBonus || 0) * 100;
      legBonus = (floor.lootBonus || 0) * 50;
    }

    const tempRarity = JSON.parse(JSON.stringify(LOOT_RARITY));
    tempRarity.epic.weight += epicBonus;
    tempRarity.legendary.weight += legBonus;

    let totalWeight = 0;
    for (const key in tempRarity) totalWeight += tempRarity[key].weight;

    const r = GameRNG.random() * totalWeight;
    let sum = 0;
    for (const [id, data] of Object.entries<any>(tempRarity)) {
      sum += data.weight;
      if (r <= sum) {
        rarityId = id;
        break;
      }
    }
    if (!rarityId) rarityId = 'common';
  }

  const rarity = LOOT_RARITY[rarityId];
  const pos = AFFIXES_POS[Math.floor(GameRNG.random() * AFFIXES_POS.length)];
  let posVal = pos.val * rarity.scale;
  if (pos.isInt) posVal = Math.max(1, Math.round(posVal));
  if (pos.isUnique) posVal = pos.val;

  const neg = AFFIXES_NEG[Math.floor(GameRNG.random() * AFFIXES_NEG.length)];
  let negVal = neg.val * rarity.scale;
  if (neg.isInt) negVal = Math.round(negVal) || -1;

  const posText = pos.isUnique
    ? pos.text
    : pos.text.replace(
        'X',
        String(Math.abs(pos.isInt ? posVal : Math.round(posVal * 100)))
      );
  const negText = neg.text.replace(
    'X',
    String(Math.abs(neg.isInt ? negVal : Math.round(negVal * 100)))
  );

  return {
    name: rarity.name + ' АРТЕФАКТ',
    icon: LOOT_ICONS[Math.floor(GameRNG.random() * LOOT_ICONS.length)],
    rarity: rarityId,
    color: rarity.colorVal,
    pos: {
      id: pos.id,
      val: posVal,
      name: pos.name,
      desc: posText,
      text: posText
    },
    neg: {
      id: neg.id,
      val: negVal,
      name: neg.name,
      desc: negText,
      text: negText
    }
  };
}

export interface MetaState {
  shards: number;
  hpLvl: number;
  dmgLvl: number;
  startItem: number;
  extraSlot: number;
  unlockedOperators: string[];
  lastOperator: string;
}

export const META_KEY = 'myasorubka_meta_v1';

export let metaState: MetaState = {
  shards: 0,
  hpLvl: 0,
  dmgLvl: 0,
  startItem: 0,
  extraSlot: 0,
  unlockedOperators: ['recruit'],
  lastOperator: 'recruit'
};

export function loadMeta() {
  try {
    const saved = localStorage.getItem(META_KEY);
    if (saved) {
      const r = JSON.parse(saved);
      metaState = { ...metaState, ...r };
      if (!metaState.unlockedOperators) metaState.unlockedOperators = ['recruit'];
      if (!metaState.lastOperator) metaState.lastOperator = 'recruit';
    }
  } catch (e) {
    console.warn('Failed to load metaState:', e);
  }
}

export function saveMeta() {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(metaState));
  } catch (e) {
    console.warn('Failed to save metaState:', e);
  }
}

export const META_UPGRADES = [
  {
    id: 'hp',
    name: '+10% Макс HP',
    maxLvl: 5,
    baseCost: 50,
    costMult: 1.5,
    desc: 'Увеличивает стартовое здоровье.'
  },
  {
    id: 'dmg',
    name: '+5% Урон',
    maxLvl: 5,
    baseCost: 100,
    costMult: 1.5,
    desc: 'Увеличивает базовый урон.'
  },
  {
    id: 'item',
    name: 'Стартовый предмет',
    maxLvl: 1,
    baseCost: 300,
    costMult: 1,
    desc: 'Даёт случайный предмет на старте.'
  },
  {
    id: 'slot',
    name: 'Слот инвентаря',
    maxLvl: 1,
    baseCost: 400,
    costMult: 1,
    desc: 'Дополнительный слот для артефакта.'
  }
];

(window as any).metaState = metaState;
(window as any).loadMeta = loadMeta;
(window as any).saveMeta = saveMeta;
