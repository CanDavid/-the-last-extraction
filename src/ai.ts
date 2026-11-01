import {
  active,
  distance,
  los,
  path,
  occupied,
  reveal,
  hurt,
  finish,
  type State,
} from "./rules";
export function enemyStep(s: State, id: string) {
  const e = s.units.find((u) => u.id === id);
  if (!e || !active(e)) return;
  const target = s.units
    .filter(
      (h) =>
        active(h) &&
        ["hero", "civil"].includes(h.kind) &&
        distance(h, e) <= 6 &&
        los(s, e, h),
    )
    .sort((a, b) => distance(a, e) - distance(b, e))[0];
  const noise = [...s.noise]
    .reverse()
    .find((n) => n.until >= s.turn && distance(n, e) <= n.radius);
  const goal = target || noise;
  if (goal) {
    if (target && distance(e, target) === 1)
      hurt(s, target, e.kind === "fast" ? 2 : 3);
    else {
      for (const p of path(s, e, goal, 192, true).slice(
        0,
        e.kind === "fast" ? 3 : 2,
      )) {
        if (occupied(s, p)) break;
        Object.assign(e, p);
      }
      if (target && distance(e, target) === 1)
        hurt(s, target, e.kind === "fast" ? 2 : 3);
    }
  }
  reveal(s);
  finish(s);
}
