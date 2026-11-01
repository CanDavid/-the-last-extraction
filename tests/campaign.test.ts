import { it, expect } from "vitest";
import {
  fresh,
  start,
  heroes,
  path,
  act,
  enemyStep,
  nextTurn,
  active,
  visible,
  distance,
  los,
  type Pos,
} from "../src/rules";
import { WEAPONS, ROLES } from "../src/config";
it("misión 1 completa con IA, rescates, combate y extracción", () => {
  const s = fresh();
  start(
    s,
    0,
    s.roster.map((u) => u.id),
  );
  for (let round = 0; round < 50 && s.screen === "mission"; round++) {
    for (const h of heroes(s))
      for (let ap = 0; ap < 2 && active(h) && h.ap; ap++) {
        let acted = false;
        const threat = s.units
          .filter(
            (e) =>
              active(e) &&
              ["slow", "fast"].includes(e.kind) &&
              visible(s, e) &&
              distance(h, e) <= WEAPONS[h.weapon].range &&
              los(s, h, e),
          )
          .sort((a, b) => distance(a, h) - distance(b, h))[0];
        if (threat) {
          if (h.weapon !== "melee" && !s.ammo[h.weapon]) h.weapon = "melee";
          if (!act(s, h.id, { type: "attack", target: threat.id }))
            acted = true;
        }
        if (acted) continue;
        const free = s.units.filter(
          (c) =>
            c.kind === "civil" && active(c) && (!c.escort || c.escort === h.id),
        );
        const own = free.find((c) => c.escort === h.id);
        const c =
          own ||
          free
            .filter((c) => !c.escort)
            .sort((a, b) => distance(h, a) - distance(h, b))[0];
        if (c && !c.escort && distance(h, c) === 1) {
          expect(act(s, h.id, { type: "rescue", target: c.id })).toBe("");
          continue;
        }
        if (
          (!c || own) &&
          s.units.every((c) => c.kind !== "civil" || !active(c) || !!c.escort)
        ) {
          if (h.x === 15 && (h.y === 1 || h.y === 2)) {
            act(s, h.id, { type: "evacuate" });
            continue;
          }
        }
        const goals: Pos[] =
          c && !own
            ? [
                { x: c.x + 1, y: c.y },
                { x: c.x - 1, y: c.y },
                { x: c.x, y: c.y + 1 },
                { x: c.x, y: c.y - 1 },
              ]
            : [
                { x: 15, y: 1 },
                { x: 15, y: 2 },
              ];
        const routes = goals
          .map((p) => path(s, h, p))
          .filter((r) => r.length)
          .sort((a, b) => a.length - b.length);
        if (routes[0]) {
          const route = routes[0];
          act(s, h.id, {
            type: "move",
            to: route[Math.min(route.length, ROLES[h.role].move) - 1],
          });
        } else break;
      }
    if (s.screen === "mission") {
      s.phase = "enemy";
      for (const e of s.units.filter(
        (u) => active(u) && ["slow", "fast"].includes(u.kind),
      ))
        enemyStep(s, e.id);
      nextTurn(s);
    }
  }
  expect(s.screen).toBe("result");
  expect(s.completed).toContain(0);
  expect(
    s.units.some((u) => u.kind === "civil" && u.status === "escaped"),
  ).toBe(true);
});
