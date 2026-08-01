export function splitmix32(a: number): () => number {
  return function() {
    a |= 0;
    a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}

export class RNGClass {
  public seed: number = 0;
  public random: () => number = Math.random;

  public setSeed(seedStr: string | null) {
    if (!seedStr) {
      this.random = Math.random;
      return;
    }
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) {
      h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    this.seed = (() => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    })();

    this.random = splitmix32(this.seed);
  }

  public randRange(min: number, max: number): number {
    return this.random() * (max - min) + min;
  }

  public randInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min)) + min;
  }
}

export const GameRNG = new RNGClass();
(window as any).GameRNG = GameRNG;
