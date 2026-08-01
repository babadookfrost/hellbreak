import { MAP_W, MAP_H, BLOCK, TILE, MAP_PX_W, MAP_PX_H } from './Constants';
import { GameRNG } from './RNG';

export interface GameMap {
  grid: Uint8Array;
  idx: (x: number, y: number) => number;
  pxW: number;
  pxH: number;
  spawnWorld: { x: number; y: number };
}

export function generateMap(): GameMap {
  const grid = new Uint8Array(MAP_W * MAP_H);
  const idx = (x: number, y: number) => y * MAP_W + x;

  // Окружаем карту внешними стенами
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const edge = x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1;
      grid[idx(x, y)] = edge ? 1 : 0;
    }
  }

  const bx = Math.ceil(MAP_W / BLOCK);
  const by = Math.ceil(MAP_H / BLOCK);

  for (let byi = 0; byi < by; byi++) {
    for (let bxi = 0; bxi < bx; bxi++) {
      if (GameRNG.random() > 0.55) continue;
      const pat = GameRNG.random();
      const y0 = byi * BLOCK + 2;
      const y1 = Math.min(byi * BLOCK + BLOCK, MAP_H - 1);
      const x0 = bxi * BLOCK + 2;
      const x1 = Math.min(bxi * BLOCK + BLOCK, MAP_W - 1);

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const wall =
            pat < 0.4
              ? GameRNG.random() < 0.7
              : pat < 0.7
                ? (x + y) % 2 === 0
                : GameRNG.random() < 0.35;
          if (wall) grid[idx(x, y)] = 1;
        }
      }
    }
  }

  // Очищаем свободную зону в центре карты (точка спавна игрока)
  const cx = Math.floor(MAP_W / 2);
  const cy = Math.floor(MAP_H / 2);
  for (let y = cy - 3; y <= cy + 3; y++) {
    for (let x = cx - 3; x <= cx + 3; x++) {
      if (x > 0 && y > 0 && x < MAP_W - 1 && y < MAP_H - 1) {
        grid[idx(x, y)] = 0;
      }
    }
  }

  return {
    grid,
    idx,
    pxW: MAP_PX_W,
    pxH: MAP_PX_H,
    spawnWorld: { x: (cx + 0.5) * TILE, y: (cy + 0.5) * TILE }
  };
}

export function isWallTile(map: GameMap, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
  return map.grid[map.idx(tx, ty)] === 1;
}

export function isWallWorld(map: GameMap, x: number, y: number): boolean {
  return isWallTile(map, Math.floor(x / TILE), Math.floor(y / TILE));
}

export function circleBlocked(map: GameMap, x: number, y: number, r: number): boolean {
  return (
    isWallWorld(map, x - r, y) ||
    isWallWorld(map, x + r, y) ||
    isWallWorld(map, x, y - r) ||
    isWallWorld(map, x, y + r)
  );
}

export function raycastClear(map: GameMap, x0: number, y0: number, x1: number, y1: number): boolean {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (TILE * 0.5));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isWallWorld(map, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
  }
  return true;
}

export function randomFloorTileFar(
  map: GameMap,
  fx: number,
  fy: number,
  md: number
): { x: number; y: number } {
  for (let a = 0; a < 60; a++) {
    const tx = 1 + Math.floor(GameRNG.random() * (MAP_W - 2));
    const ty = 1 + Math.floor(GameRNG.random() * (MAP_H - 2));
    if (isWallTile(map, tx, ty)) continue;
    const wx = (tx + 0.5) * TILE;
    const wy = (ty + 0.5) * TILE;
    if (Math.hypot(wx - fx, wy - fy) >= md) return { x: wx, y: wy };
  }
  return { x: Math.max(TILE, Math.min(fx + md, MAP_PX_W - TILE)), y: fy };
}

export function getFloorThemeRow(floorIndex: number): number {
  const idx = floorIndex % 4;
  if (idx === 0) return 1; // Floor 1 (ЦЕХ) -> Row 1 (light brown)
  if (idx === 1) return 0; // Floor 2 (ХОЛОДИЛЬНИК) -> Row 0 (blueish grey)
  if (idx === 2) return 2; // Floor 3 (КОТЕЛЬНАЯ) -> Row 2 (reddish brown)
  return 3;                // Floor 4 (ЯДРО) -> Row 3 (dark grey)
}

export function getWallTileCol(map: GameMap, tx: number, ty: number): number {
  const topIsWall = isWallTile(map, tx, ty - 1);
  const bottomIsWall = isWallTile(map, tx, ty + 1);
  const leftIsWall = isWallTile(map, tx - 1, ty);
  const rightIsWall = isWallTile(map, tx + 1, ty);

  if (!bottomIsWall) {
    return 7;
  }
  if (!topIsWall) {
    return 5;
  }
  if (!leftIsWall || !rightIsWall) {
    return 4;
  }

  return 7;
}

export function getFloorTileCol(tx: number, ty: number): number {
  const h = (tx * 37 + ty * 17) % 100;
  if (h < 75) return 0;
  if (h < 85) return 1;
  if (h < 95) return 2;
  return 3;
}
