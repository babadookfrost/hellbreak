const OPERATORS = {
  recruit: {
    id: 'recruit',
    name: 'Рекрут',
    desc: 'Базовый оперативник без ярко выраженных слабостей.',
    statsText: 'Нет бонусов и штрафов.',
    hpMul: 1.0,
    dmgMul: 1.0,
    weapon: null, // Использовать стандартное (pistol или из конфига уровня)
    color1: '#1a1a1a', // Базовый цвет тела
    color2: '#fff', // Базовый цвет визора
    cost: 0,
    unlockedByDefault: true
  },
  juggernaut: {
    id: 'juggernaut',
    name: 'Джаггернаут',
    desc: 'Тяжелая броня позволяет выживать дольше.',
    statsText: '+20% макс. HP, -10% базового урона.',
    hpMul: 1.2,
    dmgMul: 0.9,
    weapon: null,
    color1: '#5a3a86', // Танковый/фиолетовый оттенок
    color2: '#e8a317', // Желтый визор
    cost: 400,
    unlockedByDefault: false
  },
  phantom: {
    id: 'phantom',
    name: 'Призрак',
    desc: 'Хрупкий, но смертоносный ассасин.',
    statsText: '+20% базового урона, -15% макс. HP. Начинает с Проклятым Клинком.',
    hpMul: 0.85,
    dmgMul: 1.2,
    weapon: 'cursed_blade',
    color1: '#111', // Очень темный
    color2: '#8a2be2', // Фиолетовый/агрессивный визор
    cost: 600,
    unlockedByDefault: false
  }
};
