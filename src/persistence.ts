import { type State } from "./rules";
import { ROLES, WEAPONS } from "./config";
const finite = (n: unknown, min = 0, max = 100000) =>
  typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;
export function validate(data: unknown): State {
  const s = data as State;
  const fail = () => {
    throw Error(
      "Partida dañada o versión incompatible. El guardado actual se conserva.",
    );
  };
  if (
    !s ||
    s.version !== 1 ||
    !["home", "mission", "result", "shelter"].includes(s.screen) ||
    !["enemy", "player"].includes(s.phase) ||
    !finite(s.mission, 0, 2) ||
    !finite(s.turn, 1) ||
    !finite(s.kits) ||
    !finite(s.supplies) ||
    !s.ammo ||
    !finite(s.ammo.pistola) ||
    !finite(s.ammo.escopeta) ||
    !Array.isArray(s.completed) ||
    s.completed.some((n) => !finite(n, 0, 2)) ||
    !Array.isArray(s.noise) ||
    !Array.isArray(s.log) ||
    s.log.some((l) => typeof l !== "string" || l.length > 300) ||
    typeof s.rewarded !== "boolean"
  )
    fail();
  for (const list of [s.units, s.roster]) {
    if (!Array.isArray(list) || list.length > 2000) fail();
    const ids = new Set();
    for (const u of list) {
      if (
        !u ||
        typeof u.id !== "string" ||
        !/^[a-zA-Z0-9_-]{1,64}$/.test(u.id) ||
        ids.has(u.id) ||
        typeof u.name !== "string" ||
        u.name.length > 60 ||
        !["hero", "civil", "slow", "fast"].includes(u.kind) ||
        !Object.hasOwn(ROLES, u.role) ||
        !Object.hasOwn(WEAPONS, u.weapon) ||
        !finite(u.x, 0, 15) ||
        !finite(u.y, 0, 11) ||
        !finite(u.hp, 0, 30) ||
        !finite(u.max, 1, 30) ||
        u.hp > u.max ||
        !finite(u.ap, 0, 2) ||
        !["active", "dead", "escaped", "abandoned"].includes(u.status) ||
        (u.status === "active" && u.hp === 0) ||
        typeof u.seen !== "boolean" ||
        (u.escort !== undefined && typeof u.escort !== "string")
      )
        fail();
      ids.add(u.id);
    }
  }
  for (const n of s.noise)
    if (
      !n ||
      !finite(n.x, 0, 15) ||
      !finite(n.y, 0, 11) ||
      !finite(n.radius, 0, 20) ||
      !finite(n.until)
    )
      fail();
  if (
    s.screen === "mission" &&
    (!s.units.some((u) => u.kind === "hero" && u.status === "active") ||
      s.units
        .filter((u) => u.status === "active")
        .some((u, i, a) =>
          a.some((v, j) => i !== j && v.x === u.x && v.y === u.y),
        ))
  )
    fail();
  return structuredClone(s);
}
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("last-extraction", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("save");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function save(s: State) {
  const copy = validate(s);
  const d = await db();
  try {
    await new Promise<void>((resolve, reject) => {
      const t = d.transaction("save", "readwrite");
      t.objectStore("save").put(copy, "campaign");
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  } finally {
    d.close();
  }
}
export async function load(): Promise<State | null> {
  const d = await db();
  try {
    return await new Promise((resolve, reject) => {
      const r = d.transaction("save").objectStore("save").get("campaign");
      r.onsuccess = () => {
        try {
          resolve(r.result ? validate(r.result) : null);
        } catch (e) {
          reject(e);
        }
      };
      r.onerror = () => reject(r.error);
    });
  } finally {
    d.close();
  }
}
export function exportSave(s: State) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(validate(s), null, 2)], {
      type: "application/json",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "the-last-extraction.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
