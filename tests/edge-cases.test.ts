import { it, expect } from "vitest";
import {
  fresh,
  start,
  heroes,
  act,
  enemyStep,
  nextTurn,
  active,
  finish,
} from "../src/rules";
function setup() {
  const s = fresh();
  start(
    s,
    0,
    s.roster.map((u) => u.id),
  );
  return s;
}
it("sin balas no gasta PA, machete sigue siendo válido", () => {
  const s = setup(),
    h = heroes(s)[0],
    e = s.units.find((u) => u.kind === "slow")!;
  e.x = 1;
  e.y = 7;
  s.ammo.escopeta = 0;
  expect(act(s, h.id, { type: "attack", target: e.id })).toBeTruthy();
  expect(h.ap).toBe(2);
  h.weapon = "melee";
  expect(act(s, h.id, { type: "attack", target: e.id })).toBe("");
  expect(e.hp).toBe(2);
});
it("muerte de escolta y rescate por otro superviviente", () => {
  const s = setup(),
    [h, h2] = heroes(s),
    c = s.units.find((u) => u.kind === "civil")!,
    e = s.units.find((u) => u.kind === "slow")!;
  h.x = 6;
  h.y = 4;
  c.x = 7;
  c.y = 4;
  expect(act(s, h.id, { type: "rescue", target: c.id })).toBe("");
  h.hp = 1;
  e.x = 6;
  e.y = 3;
  enemyStep(s, e.id);
  expect(h.status).toBe("dead");
  expect(c.escort).toBeUndefined();
  h2.x = 7;
  h2.y = 5;
  expect(act(s, h2.id, { type: "rescue", target: c.id })).toBe("");
  expect(c.escort).toBe(h2.id);
});
it("equipo sin PA y fase enemiga bloquean órdenes", () => {
  const s = setup(),
    h = heroes(s)[0];
  s.phase = "enemy";
  expect(act(s, h.id, { type: "move", to: { x: 1, y: 7 } })).toBeTruthy();
  expect(h.ap).toBe(2);
  s.phase = "player";
  h.ap = 0;
  expect(act(s, h.id, { type: "move", to: { x: 1, y: 7 } })).toBeTruthy();
  nextTurn(s);
  expect(h.ap).toBe(2);
});
it("extracción parcial clasifica abandonados y no duplica recompensa", () => {
  const s = setup();
  heroes(s).forEach((h) => (h.status = "escaped"));
  s.units.find((u) => u.kind === "civil")!.status = "escaped";
  finish(s);
  expect(
    s.units.some((u) => u.kind === "civil" && u.status === "abandoned"),
  ).toBe(true);
  expect(s.completed).toContain(0);
  expect(s.roster.every(active)).toBe(true);
});
