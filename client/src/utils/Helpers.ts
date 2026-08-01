export function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

export function distSq(x1: number, y1: number, x2: number, y2: number): number {
  return (x2 - x1) ** 2 + (y2 - y1) ** 2;
}

export function removeSwap<T>(arr: T[], index: number): void {
  const last = arr.pop();
  if (last !== undefined && index < arr.length) {
    arr[index] = last;
  }
}
