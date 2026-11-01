import { describe, it, expect } from "vitest";
import "fake-indexeddb/auto";
import {
  fresh,
  start,
  act,
  path,
  los,
  enemyStep,
  nextTurn,
  heroes,
  finish,
  recruit,
  type State,
} from "../src/rules";
import { validate, save, load } from "../src/persistence";
function setup() {
  const s = fresh();
  start(
    s,
    0,
    s.roster.map((u) => u.id),
  );
  return s;
}
describe("reglas", () => {
  it("movimiento ortogonal, bloqueo y acciones inválidas", () => {
    const s = setup(),
      h = heroes(s)[0];
    const r = path(s, h, { x: 4, y: 8 }, 4);
    expect(r.length).toBe(0);
    expect(act(s, h.id, { type: "move", to: { x: 1, y: 5 } })).toBe("");
    expect(h.ap).toBe(1);
    expect(h.y).toBe(5);
    expect(act(s, h.id, { type: "move", to: { x: 4, y: 4 } })).toBeTruthy();
    expect(h.ap).toBe(1);
  });
  it("daño seguro y munición, alcance y LOS", () => {
    const s = setup(),
      h = heroes(s)[0],
      e = s.units.find((u) => u.kind === "slow")!;
    e.x = 1;
    e.y = 6;
    expect(act(s, h.id, { type: "attack", target: e.id })).toBe("");
    expect(s.ammo.escopeta).toBe(9);
    expect(e.status).toBe("dead");
    expect(s.noise.length).toBe(1);
    expect(los(s, { x: 8, y: 1 }, { x: 10, y: 1 })).toBe(false);
  });
  it("ruido atrae sin conocer humanos ocultos", () => {
    const s = setup();
    s.units = s.units.filter((u) => u.kind !== "civil");
    const e = s.units.find((u) => u.kind === "slow")!;
    e.x = 14;
    e.y = 7;
    s.noise = [{ x: 14, y: 5, radius: 6, until: 2 }];
    enemyStep(s, e.id);
    expect(e.y).toBe(5);
  });
  it("rescatar, seguir sin atravesar, cambiar escolta y extraer", () => {
    const s = setup(),
      h = heroes(s)[0],
      c = s.units.find((u) => u.kind === "civil")!;
    h.x = 13;
    h.y = 1;
    c.x = 12;
    c.y = 1;
    expect(act(s, h.id, { type: "rescue", target: c.id })).toBe("");
    expect(c.escort).toBe(h.id);
    expect(act(s, h.id, { type: "move", to: { x: 15, y: 2 } })).toBe("");
    expect(c.status).toBe("escaped");
    h.ap = 1;
    expect(act(s, h.id, { type: "evacuate" })).toBe("");
    expect(h.status).toBe("escaped");
  });
  it("oleadas y límite", () => {
    const s = setup();
    s.turn = 3;
    nextTurn(s);
    expect(s.turn).toBe(4);
    expect(
      s.units.filter((u) => u.kind === "slow" || u.kind === "fast").length,
    ).toBe(4);
  });
  it("permadeath y ayuda de emergencia", () => {
    const s = setup();
    heroes(s).forEach((u) => (u.status = "dead"));
    finish(s);
    expect(s.screen).toBe("result");
    expect(s.roster.every((u) => u.status === "dead")).toBe(true);
    s.supplies = 0;
    expect(recruit(s)).toBe(true);
    expect(s.roster.filter((u) => u.status === "active").length).toBe(1);
  });
  it("recompensas idempotentes", () => {
    const s = setup();
    s.units
      .filter((u) => u.kind === "hero" || u.kind === "civil")
      .forEach((u) => (u.status = "escaped"));
    finish(s);
    const n = s.supplies;
    finish(s);
    expect(s.supplies).toBe(n);
    expect(s.completed).toEqual([0]);
  });
});
describe("persistencia", () => {
  it("roundtrip IndexedDB y exportación JSON", async () => {
    const s = setup();
    await save(s);
    expect(await load()).toEqual(s);
    expect(validate(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it("rechaza archivos inválidos y conserva guardado", async () => {
    const s = setup();
    await save(s);
    for (const bad of [
      null,
      {},
      { ...s, version: 9 },
      { ...s, ammo: { pistola: -1, escopeta: 2 } },
      { ...s, units: [{ ...s.units[0], hp: NaN }] },
    ])
      expect(() => validate(bad)).toThrow();
    expect(await load()).toEqual(s);
  });
  it("cada mapa tiene rutas desde inicio a civiles y extracción", () => {
    for (let m = 0; m < 3; m++) {
      const s = fresh();
      start(
        s,
        m,
        s.roster.map((u) => u.id),
      );
      const h = heroes(s)[0];
      for (const c of s.units.filter((u) => u.kind === "civil"))
        expect(path(s, h, c, 192, true).length).toBeGreaterThan(0);
      expect(path(s, h, { x: 15, y: 1 }).length).toBeGreaterThan(0);
    }
  });
});
