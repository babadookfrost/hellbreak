const FLOORS = [
  {
    id: 1,
    name: 'ЦЕХ',
    subtitle: 'МЕСТО СБОРКИ',
    palette: {
      '--bg': '#f5f0e8',
      '--bone': '#1a1a1a',
      '--blood': '#d92638',
      '--ind': '#e8a317',
      '--cyan': '#0ea5c7',
      mapBg: '#e8e2d6',
      mapWall1: '#c4b8a8',
      mapWall2: '#b8aa98',
      mapFloor1: '#f0ebe0',
      mapFloor2: '#ebe5d8',
      mapStroke: 'rgba(100,80,60,0.25)',
      minimapBg: 'rgba(240,235,224,0.85)',
      minimapWall: '#c4b8a8'
    },
    lootBonus: 0
  },
  {
    id: 2,
    name: 'ХОЛОДИЛЬНИК',
    subtitle: 'ОНИ СТАЛИ БЫСТРЕЕ',
    palette: {
      '--bg': '#e1e9f0',
      '--bone': '#0f1a24',
      '--blood': '#c42343',
      '--ind': '#2c8ebb',
      '--cyan': '#5dbcd2',
      mapBg: '#d5e0e8',
      mapWall1: '#a5b8c7',
      mapWall2: '#95aab8',
      mapFloor1: '#d8e5ec',
      mapFloor2: '#cedce4',
      mapStroke: 'rgba(60,80,100,0.25)',
      minimapBg: 'rgba(215,225,235,0.85)',
      minimapWall: '#a5b8c7'
    },
    lootBonus: 0.05
  },
  {
    id: 3,
    name: 'КОТЕЛЬНАЯ',
    subtitle: 'ПЕКЛО',
    palette: {
      '--bg': '#261b1b',
      '--bone': '#e8dada',
      '--blood': '#f23333',
      '--ind': '#d65c20',
      '--cyan': '#e8a317',
      mapBg: '#1c1212',
      mapWall1: '#472a2a',
      mapWall2: '#381e1e',
      mapFloor1: '#211616',
      mapFloor2: '#1a1010',
      mapStroke: 'rgba(150,50,50,0.25)',
      minimapBg: 'rgba(30,20,20,0.85)',
      minimapWall: '#472a2a'
    },
    lootBonus: 0.10
  },
  {
    id: 4,
    name: 'ЯДРО',
    subtitle: 'СЕРДЦЕ МЯСОРУБКИ',
    palette: {
      '--bg': '#120a0a',
      '--bone': '#f5d5d5',
      '--blood': '#ff0000',
      '--ind': '#ff7700',
      '--cyan': '#ff3333',
      mapBg: '#080303',
      mapWall1: '#3a1212',
      mapWall2: '#2b0b0b',
      mapFloor1: '#0d0606',
      mapFloor2: '#0a0404',
      mapStroke: 'rgba(200,30,30,0.25)',
      minimapBg: 'rgba(15,5,5,0.85)',
      minimapWall: '#3a1212'
    },
    lootBonus: 0.15
  }
];

function getCurrentFloor(floorIndex) {
  // floorIndex starts at 0, floors 1..4 maps to indices 0..3, then loop.
  return FLOORS[floorIndex % FLOORS.length];
}

function applyFloorPalette(floorIndex) {
  const floor = getCurrentFloor(floorIndex);
  const root = document.documentElement;
  for (const [key, value] of Object.entries(floor.palette)) {
    if (key.startsWith('--')) {
      root.style.setProperty(key, value);
    }
  }
  return floor;
}
