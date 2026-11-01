import { blocked, occupied, distance, type State, type Pos } from "./rules";
export function path(
  s: State,
  a: Pos,
  b: Pos,
  limit = 192,
  goal = false,
): Pos[] {
  const q: [Pos, Pos[]][] = [[a, []]],
    seen = new Set([`${a.x},${a.y}`]);
  while (q.length) {
    const [p, r] = q.shift()!;
    if (!distance(p, b)) return r;
    if (r.length >= limit) continue;
    for (const n of [
      { x: p.x + 1, y: p.y },
      { x: p.x - 1, y: p.y },
      { x: p.x, y: p.y + 1 },
      { x: p.x, y: p.y - 1 },
    ]) {
      const k = `${n.x},${n.y}`;
      if (
        seen.has(k) ||
        blocked(s, n) ||
        (occupied(s, n) && !(goal && !distance(n, b)))
      )
        continue;
      seen.add(k);
      q.push([n, [...r, n]]);
    }
  }
  return [];
}
export function los(s: State, a: Pos, b: Pos) {
  let x = a.x,
    y = a.y;
  const dx = Math.abs(b.x - x),
    dy = Math.abs(b.y - y),
    sx = x < b.x ? 1 : -1,
    sy = y < b.y ? 1 : -1;
  let e = dx - dy;
  while (x !== b.x || y !== b.y) {
    const e2 = e * 2;
    if (e2 > -dy) {
      e -= dy;
      x += sx;
    }
    if (e2 < dx) {
      e += dx;
      y += sy;
    }
    if (blocked(s, { x, y })) return false;
  }
  return true;
}
