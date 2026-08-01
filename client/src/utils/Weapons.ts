export interface Weapon {
  id: string;
  name: string;
  icon: string;
  color: string;
  cd: number;
  pellets: number;
  spread: number;
  jitter: number;
  speed: number;
  dmg: number;
  ammoMax: number;
  reload: number;
  pierce: number;
  auto: boolean;
  splash?: number;
  ricochet?: boolean;
  evolved?: boolean;
}

export const WEAPON_POOL: string[] = [
  'fire_staff',
  'ice_wand',
  'cursed_blade',
  'necro_crossbow',
  'storm_staff',
  'void_shard'
];

export const WEAPONS: { [key: string]: Weapon } = {
  fire_staff: {
    id: 'fire_staff',
    name: 'Посох Огня',
    icon: '🔥',
    color: '#ff4400',
    cd: 0.28,
    pellets: 3,
    spread: 0.07,
    jitter: 0.02,
    speed: 1200,
    dmg: 1,
    ammoMax: 6,
    reload: 1.3,
    pierce: 1,
    auto: false
  },
  ice_wand: {
    id: 'ice_wand',
    name: 'Ледяной Жезл',
    icon: '❄️',
    color: '#00ccff',
    cd: 0.8,
    pellets: 8,
    spread: 0.24,
    jitter: 0.05,
    speed: 900,
    dmg: 1,
    ammoMax: 2,
    reload: 1.7,
    pierce: 1,
    auto: false
  },
  cursed_blade: {
    id: 'cursed_blade',
    name: 'Проклятый Клинок',
    icon: '🗡️',
    color: '#8a2be2',
    cd: 0.09,
    pellets: 1,
    spread: 0,
    jitter: 0.08,
    speed: 1300,
    dmg: 1,
    ammoMax: 30,
    reload: 1.5,
    pierce: 1,
    auto: true
  },
  necro_crossbow: {
    id: 'necro_crossbow',
    name: 'Арбалет Некроманта',
    icon: '🏹',
    color: '#00fa9a',
    cd: 0.055,
    pellets: 1,
    spread: 0,
    jitter: 0.11,
    speed: 1300,
    dmg: 1,
    ammoMax: 80,
    reload: 2.2,
    pierce: 1,
    auto: true
  },
  storm_staff: {
    id: 'storm_staff',
    name: 'Посох Бури',
    icon: '⚡',
    color: '#ffff00',
    cd: 0.5,
    pellets: 1,
    spread: 0,
    jitter: 0,
    speed: 1000,
    dmg: 4,
    ammoMax: 5,
    reload: 1.0,
    pierce: 99,
    auto: false
  },
  void_shard: {
    id: 'void_shard',
    name: 'Осколок Бездны',
    icon: '🔮',
    color: '#4b0082',
    cd: 0.85,
    pellets: 1,
    spread: 0,
    jitter: 0,
    speed: 800,
    dmg: 5,
    ammoMax: 4,
    reload: 2.0,
    pierce: 1,
    auto: false,
    splash: 140
  },

  // Эволюционировавшее оружие
  inferno: {
    id: 'inferno',
    name: 'Посох Инферно',
    icon: '🌋',
    color: '#ff0000',
    cd: 0.4,
    pellets: 1,
    spread: 0,
    jitter: 0,
    speed: 1400,
    dmg: 6,
    ammoMax: 4,
    reload: 1.0,
    pierce: 1,
    auto: false,
    splash: 60,
    evolved: true
  },
  winter_wand: {
    id: 'winter_wand',
    name: 'Жезл Вечной Зимы',
    icon: '🥶',
    color: '#00ffff',
    cd: 0.7,
    pellets: 14,
    spread: 0.18,
    jitter: 0.03,
    speed: 1000,
    dmg: 2,
    ammoMax: 3,
    reload: 1.5,
    pierce: 3,
    auto: false,
    evolved: true
  },
  cursed_blade_evo: {
    id: 'cursed_blade_evo',
    name: 'Клинок Тысячи Проклятий',
    icon: '🗡️+',
    color: '#ff00ff',
    cd: 0.03,
    pellets: 1,
    spread: 0,
    jitter: 0.15,
    speed: 1500,
    dmg: 1,
    ammoMax: 120,
    reload: 2.0,
    pierce: 2,
    auto: true,
    ricochet: true,
    evolved: true
  },
  necro_crossbow_evo: {
    id: 'necro_crossbow_evo',
    name: 'Арбалет Восставших',
    icon: '🏹+',
    color: '#00fa9a',
    cd: 0.055,
    pellets: 1,
    spread: 0,
    jitter: 0.11,
    speed: 1300,
    dmg: 1,
    ammoMax: 80,
    reload: 2.2,
    pierce: 3,
    auto: true,
    evolved: true
  },
  storm_staff_evo: {
    id: 'storm_staff_evo',
    name: 'Посох Грозового Импульса',
    icon: '⚡+',
    color: '#0ea5c7',
    cd: 0.6,
    pellets: 1,
    spread: 0,
    jitter: 0,
    speed: 2500,
    dmg: 10,
    ammoMax: 3,
    reload: 1.5,
    pierce: 999,
    auto: false,
    evolved: true
  },
  void_shard_evo: {
    id: 'void_shard_evo',
    name: 'Сердце Бездны',
    icon: '🔮+',
    color: '#4b0082',
    cd: 0.85,
    pellets: 1,
    spread: 0,
    jitter: 0,
    speed: 800,
    dmg: 7,
    ammoMax: 4,
    reload: 2.0,
    pierce: 1,
    auto: false,
    splash: 180,
    evolved: true
  }
};

export interface EvolutionRule {
  affix: string;
  target: string;
}

export const EVOLUTIONS: { [key: string]: EvolutionRule } = {
  fire_staff: { affix: 'dmg', target: 'inferno' },
  ice_wand: { affix: 'speed', target: 'winter_wand' },
  cursed_blade: { affix: 'ammo_save', target: 'cursed_blade_evo' },
  necro_crossbow: { affix: 'reload_up', target: 'necro_crossbow_evo' },
  storm_staff: { affix: 'pierce', target: 'storm_staff_evo' },
  void_shard: { affix: 'splash', target: 'void_shard_evo' }
};

export function getWeaponTileInfo(weaponId: string) {
  if (weaponId === 'cursed_blade') return { col: 0, row: 8, tint: '#8a2be2' };
  if (weaponId === 'cursed_blade_evo') return { col: 0, row: 8, tint: '#ff00ff' };

  if (weaponId === 'necro_crossbow') return { col: 2, row: 8, tint: '#00fa9a' };
  if (weaponId === 'necro_crossbow_evo') return { col: 2, row: 8, tint: '#00fa9a' };

  if (weaponId === 'fire_staff') return { col: 4, row: 8, tint: '#ff4400' };
  if (weaponId === 'inferno') return { col: 4, row: 8, tint: '#ff0000' };

  if (weaponId === 'ice_wand') return { col: 4, row: 8, tint: '#00ccff' };
  if (weaponId === 'winter_wand') return { col: 4, row: 8, tint: '#00ffff' };

  if (weaponId === 'storm_staff') return { col: 4, row: 8, tint: '#ffff00' };
  if (weaponId === 'storm_staff_evo') return { col: 4, row: 8, tint: '#0ea5c7' };

  if (weaponId === 'void_shard') return { col: 6, row: 8, tint: '#4b0082' };
  if (weaponId === 'void_shard_evo') return { col: 6, row: 8, tint: '#4b0082' };

  return { col: 0, row: 8, tint: '#ffffff' }; // fallback/pistol
}
