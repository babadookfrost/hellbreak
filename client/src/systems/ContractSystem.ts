import { WEAPONS } from '../utils/Weapons';
import { GameRNG } from '../utils/RNG';

export interface Contract {
  id: string;
  name: string;
  desc: string;
  checkType: string;
  targetValue?: number;
  weaponId?: string;
}

export const CONTRACTS_POOL: Contract[] = [
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

export class ContractSystem {
  public activeContracts: Contract[] = [];
  public completedContracts: Set<string> = new Set();
  public selectedContractIds: Set<string> = new Set();
  public proposedContracts: Contract[] = [];

  constructor() {
    this.reset();
  }

  public reset() {
    this.activeContracts = [];
    this.completedContracts.clear();
    this.selectedContractIds.clear();
    this.proposedContracts = [];
  }

  public generateProposal() {
    let pool = [...CONTRACTS_POOL];
    // Перемешиваем
    pool.sort(() => GameRNG.random() - 0.5);
    this.proposedContracts = pool.slice(0, 3);

    this.proposedContracts.forEach((c) => {
      if (c.id === 'boss_specific_weapon') {
        const weaponKeys = Object.keys(WEAPONS);
        const randomWeaponId = weaponKeys[Math.floor(GameRNG.random() * weaponKeys.length)];
        c.weaponId = randomWeaponId;
        const w = WEAPONS[randomWeaponId];
        c.desc = `Убить босса используя ${w.icon} ${w.name}`;
      }
    });

    this.selectedContractIds.clear();
  }

  public activateSelected() {
    this.activeContracts = this.proposedContracts.filter(c => this.selectedContractIds.has(c.id));
  }
}
