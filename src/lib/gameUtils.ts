export function aabbHits(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function distSq(
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

let _id = 0;
export function nextId(): number {
  return ++_id;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function pickWeighted<T extends string>(
  defs: Record<T, { weight: number }>
): T {
  const total = Object.values(defs).reduce<number>(
    (s, d) => s + (d as { weight: number }).weight,
    0
  );
  let r = Math.random() * total;
  for (const [key, def] of Object.entries(defs) as [
    T,
    { weight: number },
  ][]) {
    r -= def.weight;
    if (r <= 0) return key;
  }
  return Object.keys(defs)[0] as T;
}
