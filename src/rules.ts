import { path, los } from "./navigation";
export { path, los } from "./navigation";
export { enemyStep } from "./ai";
import {
  ROLES,
  WEAPONS,
  MAPS,
  BALANCE,
  type Role,
  type Weapon,
} from "./config";
export type Pos = { x: number; y: number };
export type Unit = Pos & {
  id: string;
  name: string;
  kind: "hero" | "civil" | "slow" | "fast";
  role: Role;
  hp: number;
  max: number;
  ap: number;
  weapon: Weapon;
  status: "active" | "dead" | "escaped" | "abandoned";
  escort?: string;
  seen: boolean;
};
export type State = {
  version: 1;
  screen: "home" | "mission" | "result" | "shelter";
  mission: number;
  turn: number;
  phase: "player" | "enemy";
  units: Unit[];
  roster: Unit[];
  ammo: { pistola: number; escopeta: number };
  kits: number;
  supplies: number;
  completed: number[];
  noise: (Pos & { radius: number; until: number })[];
  log: string[];
  rewarded: boolean;
};
export const distance = (a: Pos, b: Pos) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const active = (u: Unit) => u.status === "active";
export const heroes = (s: State) =>
  s.units.filter((u) => u.kind === "hero" && active(u));
export const tile = (s: State, p: Pos) =>
  MAPS[s.mission].rows[p.y]?.[p.x] ?? "#";
export const blocked = (s: State, p: Pos) => "#C".includes(tile(s, p));
export const occupied = (s: State, p: Pos) =>
  s.units.some((u) => active(u) && distance(u, p) === 0);
export const visible = (s: State, u: Unit) =>
  u.kind === "hero" ||
  heroes(s).some((h) => distance(h, u) <= ROLES[h.role].vision && los(s, h, u));
export function reveal(s: State) {
  s.units.forEach((u) => {
    if (visible(s, u)) u.seen = true;
  });
}
export function makeHero(id: string, name: string, role: Role): Unit {
  return {
    id,
    name,
    role,
    kind: "hero",
    x: 0,
    y: 0,
    hp: ROLES[role].hp,
    max: ROLES[role].hp,
    ap: 2,
    weapon: role === "Soldado" ? "escopeta" : "pistola",
    status: "active",
    seen: true,
  };
}
export function fresh(): State {
  return {
    version: 1,
    screen: "home",
    mission: 0,
    turn: 1,
    phase: "player",
    units: [],
    roster: [
      makeHero("h1", "Vega", "Soldado"),
      makeHero("h2", "Inés", "Médico"),
      makeHero("h3", "Leo", "Explorador"),
    ],
    ammo: { pistola: 22, escopeta: 10 },
    kits: 4,
    supplies: 10,
    completed: [],
    noise: [],
    log: [],
    rewarded: false,
  };
}
function spawn(s: State, x: number, y: number, i: number) {
  if (occupied(s, { x, y }) || blocked(s, { x, y })) return;
  s.units.push({
    ...makeHero(
      `e${s.turn}-${i}-${s.units.length}`,
      "Infectado " + (i % 2 ? "rápido" : "lento"),
      "Soldado",
    ),
    kind: i % 2 ? "fast" : "slow",
    x,
    y,
    hp: i % 2 ? 3 : 5,
    max: i % 2 ? 3 : 5,
    seen: false,
  });
}
export function start(s: State, m: number, ids: string[]) {
  s.mission = m;
  s.turn = 1;
  s.phase = "player";
  s.screen = "mission";
  s.rewarded = false;
  s.noise = [];
  s.log = ["Rescata civiles y evacúa por la zona E."];
  s.units = s.roster
    .filter((u) => ids.includes(u.id) && active(u))
    .slice(0, 3)
    .map((u, i) => ({ ...u, x: 1, y: 8 + i, hp: u.max, ap: 2 }));
  (m === 0
    ? [
        [7, 4],
        [12, 6],
      ]
    : [
        [6, 1],
        [12, 4],
        [5, 7],
      ]
  ).forEach(([x, y], i) =>
    s.units.push({
      ...makeHero("c" + i, ["Alma", "Bruno", "Nora"][i], "Explorador"),
      kind: "civil",
      x,
      y,
      hp: 5,
      max: 5,
      seen: false,
    }),
  );
  [
    [11, 2],
    [10, 7],
    [14, 10],
    [13, 6],
  ]
    .slice(0, 2 + m)
    .forEach(([x, y], i) => spawn(s, x, y, i));
  reveal(s);
}
export function hurt(s: State, u: Unit, n: number) {
  u.hp = Math.max(0, u.hp - n);
  if (!u.hp) {
    u.status = "dead";
    s.log.unshift(`${u.name} ha muerto.`);
    s.units.filter((c) => c.escort === u.id).forEach((c) => delete c.escort);
  }
}
function followers(s: State, h: Unit) {
  for (const c of s.units.filter((c) => active(c) && c.escort === h.id)) {
    const r = path(s, c, h, 192, true);
    for (const p of r.slice(0, -1)) {
      if (occupied(s, p)) break;
      Object.assign(c, p);
    }
    if (tile(s, c) === "E") c.status = "escaped";
  }
}
export type Action =
  | { type: "move"; to: Pos }
  | { type: "attack" | "rescue" | "heal"; target: string }
  | { type: "evacuate" };
export function act(s: State, id: string, a: Action) {
  const h = s.units.find((u) => u.id === id);
  if (
    s.screen !== "mission" ||
    s.phase !== "player" ||
    !h ||
    h.kind !== "hero" ||
    !active(h) ||
    h.ap < 1
  )
    return "Sin acciones disponibles.";
  const t = "target" in a ? s.units.find((u) => u.id === a.target) : undefined;
  if (a.type === "move") {
    const r = path(s, h, a.to, ROLES[h.role].move);
    if (!r.length) return "Ruta bloqueada o demasiado larga.";
    for (const p of r) {
      Object.assign(h, p);
      followers(s, h);
    }
  }
  if (a.type === "attack") {
    const w = WEAPONS[h.weapon];
    if (
      !t ||
      !active(t) ||
      !["slow", "fast"].includes(t.kind) ||
      !visible(s, t) ||
      distance(h, t) > w.range ||
      !los(s, h, t)
    )
      return "Fuera de alcance o sin visión.";
    if (h.weapon !== "melee" && s.ammo[h.weapon] < 1)
      return "Sin munición. Usa el machete.";
    if (h.weapon !== "melee") s.ammo[h.weapon]--;
    const damage = w.damage + Number(h.role === "Soldado");
    hurt(s, t, damage);
    s.noise.push({ x: h.x, y: h.y, radius: w.noise, until: s.turn + 1 });
    s.log.unshift(`${h.name}: ${damage} de daño · ruido ${w.noise}.`);
  }
  if (a.type === "rescue") {
    if (!t || t.kind !== "civil" || !active(t) || distance(h, t) !== 1)
      return "Acércate al civil.";
    t.escort = h.id;
    followers(s, h);
    s.log.unshift(`${t.name} sigue a ${h.name}.`);
  }
  if (a.type === "heal") {
    if (
      h.role !== "Médico" ||
      !s.kits ||
      !t ||
      t.kind !== "hero" ||
      !active(t) ||
      distance(h, t) > 1 ||
      t.hp === t.max
    )
      return "Requiere médico, botiquín y aliado herido cercano.";
    s.kits--;
    t.hp = Math.min(t.max, t.hp + BALANCE.heal);
  }
  if (a.type === "evacuate") {
    if (tile(s, h) !== "E") return "Entra en la zona E.";
    followers(s, h);
    h.status = "escaped";
    s.units.filter((c) => c.escort === h.id).forEach((c) => delete c.escort);
  }
  h.ap--;
  reveal(s);
  finish(s);
  return "";
}
export function nextTurn(s: State) {
  if (s.screen !== "mission") return;
  s.turn++;
  s.noise = s.noise.filter((n) => n.until >= s.turn);
  if (s.turn % BALANCE.wave === 0) {
    for (const [x, y] of [
      [15, 9],
      [0, 2],
    ])
      if (
        s.units.filter((u) => active(u) && ["slow", "fast"].includes(u.kind))
          .length < BALANCE.cap
      )
        spawn(s, x, y, s.units.length);
    s.log.unshift("¡Refuerzos en los bordes!");
  }
  heroes(s).forEach((h) => (h.ap = 2));
  s.phase = "player";
  reveal(s);
}
export function finish(s: State) {
  if (heroes(s).length) return;
  s.screen = "result";
  if (s.rewarded) return;
  s.rewarded = true;
  for (const u of s.units) {
    if (active(u)) u.status = "abandoned";
    if (u.kind === "hero") {
      const r = s.roster.find((r) => r.id === u.id);
      if (r) {
        const equipment = r.weapon;
        Object.assign(r, u);
        r.weapon = equipment;
        if (r.status === "escaped") {
          r.status = "active";
          r.hp = r.max;
        }
      }
    }
  }
  const saved = s.units.filter(
    (u) => u.kind === "civil" && u.status === "escaped",
  ).length;
  const win =
    saved > 0 &&
    s.units.some((u) => u.kind === "hero" && u.status === "escaped");
  s.supplies += saved * BALANCE.reward;
  s.ammo.pistola += saved * 4;
  s.ammo.escopeta += saved * 2;
  if (win && !s.completed.includes(s.mission)) s.completed.push(s.mission);
}
export function recruit(s: State) {
  if (s.supplies < 6 && s.roster.some(active)) return false;
  if (s.supplies >= 6) s.supplies -= 6;
  s.roster.push(
    makeHero(
      "r" + s.roster.length,
      "Recluta " + (s.roster.length - 2),
      (["Soldado", "Médico", "Explorador"] as Role[])[s.roster.length % 3],
    ),
  );
  s.ammo.pistola = Math.max(6, s.ammo.pistola);
  s.kits = Math.max(1, s.kits);
  return true;
}
