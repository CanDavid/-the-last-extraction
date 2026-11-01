import Phaser from "phaser";
import "./style.css";
import { Board } from "./scene";
import { MAPS, WEAPONS, ROLES, type Weapon } from "./config";
import {
  fresh,
  start,
  active,
  heroes,
  act,
  enemyStep,
  nextTurn,
  recruit,
  visible,
  path,
  tile,
  type State,
  type Pos,
  type Action,
} from "./rules";
import { save, load, validate, exportSave } from "./persistence";
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<div class="rotate">↻<h2>Gira tu dispositivo</h2><p>La operación continúa en horizontal.</p></div><header><a id="brand">✚ <b>THE LAST EXTRACTION</b></a><span class="tag">OPERACIONES DE RESCATE / 1998</span><nav><button id="sound">♫ Sonido</button><button id="help">? Ayuda</button></nav></header><main id="content"></main><footer><span id="save">GUARDADO LOCAL · SIN CUENTA</span><span id="offline">Preparando modo sin conexión…</span><button id="update" hidden>Aplicar actualización</button></footer><dialog id="dialog"></dialog>`;
const content = document.querySelector<HTMLElement>("#content")!,
  dialog = document.querySelector<HTMLDialogElement>("#dialog")!;
let s: State = fresh(),
  exists = false,
  selected = "",
  pending: Action | undefined,
  game: Phaser.Game | undefined,
  board: Board | undefined,
  busy = false,
  muted = false,
  audio: AudioContext | undefined;
const $ = (id: string) => document.getElementById(id)!;
const esc = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
function beep() {
  if (muted) return;
  audio ??= new AudioContext();
  void audio.resume();
  const o = audio.createOscillator(),
    g = audio.createGain();
  o.connect(g);
  g.connect(audio.destination);
  o.type = "square";
  o.frequency.value = 180;
  g.gain.setValueAtTime(0.025, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.09);
  o.start();
  o.stop(audio.currentTime + 0.1);
}
function info(title: string, body: string) {
  dialog.innerHTML = `<h2>${title}</h2>${body}<button id="close" class="primary">Entendido</button>`;
  dialog.showModal();
  $("close").onclick = () => dialog.close();
}
function ask(body: string): Promise<boolean> {
  return new Promise((resolve) => {
    dialog.innerHTML = `<h2>Confirmar operación</h2><p>${body}</p><div class="buttons"><button id="no">Cancelar</button><button id="yes" class="danger">Confirmar</button></div>`;
    dialog.showModal();
    $("yes").onclick = () => {
      dialog.close();
      resolve(true);
    };
    $("no").onclick = () => {
      dialog.close();
      resolve(false);
    };
    dialog.oncancel = (e) => {
      e.preventDefault();
      dialog.close();
      resolve(false);
    };
  });
}
async function persist() {
  try {
    await save(s);
    exists = true;
    $("save").textContent = "✓ GUARDADO EN ESTE DISPOSITIVO";
    return true;
  } catch (e) {
    $("save").textContent = "⚠ ERROR AL GUARDAR · EXPORTA TU PARTIDA";
    console.error(e);
    return false;
  }
}
function destroy() {
  game?.destroy(true);
  game = undefined;
  board = undefined;
}
function render() {
  destroy();
  pending = undefined;
  if (s.screen === "mission") {
    mission();
    return;
  }
  if (s.screen === "result") {
    result();
    return;
  }
  if (s.screen === "shelter") {
    shelter();
    return;
  }
  home();
}
function backup() {
  return `<div class="backup"><button id="export">↓ Exportar partida</button><button id="import">↑ Importar partida</button><input id="file" type="file" accept="application/json,.json" hidden></div>`;
}
function bindBackup() {
  $("export").onclick = () => exportSave(s);
  $("import").onclick = () => ($("file") as HTMLInputElement).click();
  $("file").onchange = async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      if (f.size > 2000000) throw Error("Archivo demasiado grande.");
      const candidate = validate(JSON.parse(await f.text()));
      if (
        await ask(
          "La importación reemplazará la partida de este navegador. ¿Continuar?",
        )
      ) {
        await save(candidate);
        s = candidate;
        exists = true;
        if (s.screen === "mission") selected = heroes(s)[0]?.id ?? "";
        render();
      }
    } catch (e) {
      info("No se pudo importar", `<p>${esc(String(e))}</p>`);
    }
  };
}
function home() {
  content.innerHTML = `<section class="landing"><div class="intro"><div class="eyebrow">PROTOCOLO DE EVACUACIÓN / ACTIVO</div><h1>THE LAST<br><em>EXTRACTION</em></h1><p class="lead">Nadie sale solo.</p><p>Tres supervivientes. Una ciudad perdida.<br>Encuentra a los civiles y llévalos a casa.</p><div class="buttons">${exists ? '<button id="continue" class="primary">Continuar operación →</button>' : ""}<button id="new" class="${exists ? "" : "primary"}">Nueva partida →</button></div><div class="facts"><span>01—03<br><b>SUPERVIVIENTES</b></span><span>5–10 MIN<br><b>POR MISIÓN</b></span><span>POR TURNOS<br><b>A TU RITMO</b></span></div>${backup()}</div><div class="poster"><div class="moon"></div><div class="skyline"></div><div class="road"></div><div class="signal">✚<small>EXTRACTION POINT</small></div><div class="silhouettes">▟ ▟ ▟</div><div class="poster-label">DISTRITO CERO<br><small>ÚLTIMA TRANSMISIÓN · 06:42</small></div></div></section>`;
  $("new").onclick = async () => {
    if (
      exists &&
      !(await ask(
        "Nueva partida borrará el progreso anterior. Puedes exportarlo primero.",
      ))
    )
      return;
    s = fresh();
    start(
      s,
      0,
      s.roster.map((u) => u.id),
    );
    selected = "h1";
    await persist();
    render();
    help();
  };
  if (exists)
    $("continue").onclick = () => {
      if (s.screen === "home") {
        s.screen = "shelter";
      }
      selected = heroes(s)[0]?.id ?? "";
      render();
    };
  bindBackup();
}
function help() {
  info(
    "Rescatar. Proteger. Extraer.",
    `<p>Cada superviviente tiene <b>2 acciones por turno</b>. Toca un personaje y después una casilla para ver la ruta; confirma con el botón. Solo se avanza en horizontal o vertical.</p><p>Toca un infectado para previsualizar daño, balas y ruido. El terreno bloquea movimiento y visión. Machete: adyacente y sin balas. El médico cura a aliados adyacentes o a sí mismo.</p><p>Toca un civil adyacente y confirma el rescate: seguirá automáticamente. Si pierde la escolta, vuelve a rescatarlo. Llévalo a las casillas E; después evacúa explícitamente a tu equipo. Necesitas salvar al menos un civil y un superviviente.</p><p>Oleadas cada 4 turnos. El ruido atrae infectados durante el turno actual y el siguiente. Muertes y abandonos son permanentes.</p><p>Primer acceso con conexión. Exportar permite trasladar manualmente la partida. Borrar datos del navegador puede eliminarla. Safari y la app de inicio pueden usar almacenamientos distintos.</p><p>iPhone/iPad: Safari → Compartir → Añadir a pantalla de inicio.</p>`,
  );
}
$("help").onclick = help;
$("sound").onclick = () => {
  muted = !muted;
  $("sound").textContent = muted ? "♫ Silenciado" : "♫ Sonido";
  if (!muted) beep();
};
$("brand").onclick = async () => {
  if (busy) return;
  await persist();
  destroy();
  home();
};
function mission() {
  if (!heroes(s).some((u) => u.id === selected))
    selected = heroes(s)[0]?.id ?? "";
  content.innerHTML = `<div class="mission-top"><div><span class="eyebrow">OPERACIÓN 0${s.mission + 1}</span><h2>${MAPS[s.mission].title}</h2></div><div class="metrics"><span>TURNO <b id="turn"></b></span><span>RESCATADOS <b id="saved"></b></span><span id="wave"></span></div><button id="end" class="primary">Terminar turno →</button></div><div class="mission-layout"><aside id="squad"></aside><section class="board-wrap"><div id="board"></div><div class="board-caption"><span>◇ CIVIL &nbsp; † INFECTADO &nbsp; E EXTRACCIÓN</span><span id="phase"></span></div></section><aside class="orders"><div class="eyebrow">CENTRO DE MANDO</div><h3 id="name"></h3><div id="stats"></div><div id="weapons"></div><div id="order"></div><button id="evac">↗ Evacuar · 1 PA</button><div id="resources"></div><div class="eyebrow">RADIO / EN DIRECTO</div><div id="log"></div></aside></div>`;
  board = new Board();
  board.state = s;
  board.selected = selected;
  board.click = onTile;
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "board",
    width: 640,
    height: 480,
    backgroundColor: "#1b2b31",
    pixelArt: true,
    antialias: false,
    scene: board,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { noAudio: true },
  });
  $("end").onclick = endTurn;
  $("evac").onclick = async () => {
    if (busy) return;
    if (
      heroes(s).length === 1 &&
      s.units.some(
        (u) =>
          active(u) && u.id !== selected && ["hero", "civil"].includes(u.kind),
      ) &&
      !(await ask(
        "Es el último superviviente activo. Los humanos que queden serán abandonados y se perderán permanentemente.",
      ))
    )
      return;
    await execute({ type: "evacuate" });
  };
  refresh();
}
function refresh() {
  if (s.screen !== "mission") return;
  const h = heroes(s).find((u) => u.id === selected);
  if (!h) {
    selected = heroes(s)[0]?.id ?? "";
    return refresh();
  }
  $("turn").textContent = String(s.turn);
  $("saved").textContent =
    `${s.units.filter((u) => u.kind === "civil" && u.status === "escaped").length}/${s.mission === 0 ? 2 : 3}`;
  const until = 4 - (s.turn % 4);
  $("wave").textContent =
    until === 1 ? "⚠ OLEADA EL PRÓXIMO TURNO" : `OLEADA EN ${until}`;
  $("phase").textContent = busy ? "RESOLVIENDO INFECTADOS…" : "TU TURNO";
  ($("end") as HTMLButtonElement).disabled = busy;
  ($("evac") as HTMLButtonElement).disabled =
    busy || tile(s, h) !== "E" || !h.ap;
  $("squad").innerHTML =
    `<div class="eyebrow">TU EQUIPO</div>` +
    s.units
      .filter((u) => u.kind === "hero")
      .map(
        (u) =>
          `<button class="unit ${u.id === selected ? "selected" : ""}" data-id="${u.id}" ${!active(u) || busy ? "disabled" : ""}><span class="portrait ${u.role}">${u.role === "Soldado" ? "▣" : u.role === "Médico" ? "✚" : "⌁"}</span><b>${esc(u.name)}</b><small>${u.role}</small><span>♥ ${u.hp}/${u.max} &nbsp; ${active(u) ? "◆".repeat(u.ap) + "◇".repeat(2 - u.ap) : u.status === "escaped" ? "A SALVO" : "BAJA"}</span></button>`,
      )
      .join("");
  document.querySelectorAll<HTMLButtonElement>("[data-id]").forEach(
    (b) =>
      (b.onclick = () => {
        selected = b.dataset.id!;
        pending = undefined;
        refresh();
      }),
  );
  $("name").textContent = h.name + " / " + h.role;
  $("stats").textContent =
    `♥ ${h.hp}/${h.max}  ·  ◆ ${h.ap} PA  ·  Movimiento ${ROLES[h.role].move}`;
  $("weapons").innerHTML = Object.entries(WEAPONS)
    .filter(
      ([key]) =>
        key === "melee" || key === s.roster.find((u) => u.id === h.id)?.weapon,
    )
    .map(
      ([key, w]) =>
        `<button class="weapon ${h.weapon === key ? "selected" : ""}" data-weapon="${key}" ${busy ? "disabled" : ""}>${w.label}</button>`,
    )
    .join("");
  document.querySelectorAll<HTMLButtonElement>("[data-weapon]").forEach(
    (b) =>
      (b.onclick = async () => {
        if (busy) return;
        h.weapon = b.dataset.weapon as Weapon;
        pending = undefined;
        await persist();
        refresh();
      }),
  );
  let description = "Selecciona una casilla, civil o infectado.";
  if (pending?.type === "move")
    description = `Mover ${path(s, h, pending.to, ROLES[h.role].move).length} casillas · 1 PA`;
  if (pending?.type === "attack") {
    const w = WEAPONS[h.weapon];
    description = `Atacar · daño ${w.damage + Number(h.role === "Soldado")} · ${h.weapon === "melee" ? 0 : 1} bala · ruido ${w.noise} · 1 PA`;
  }
  if (pending?.type === "rescue")
    description = "Rescatar / asumir escolta · 1 PA";
  if (pending?.type === "heal")
    description = "Curar +5 salud · 1 botiquín · 1 PA";
  $("order").innerHTML =
    `<p>${description}</p>${pending ? '<button id="confirm" class="primary">Confirmar acción</button><button id="cancel">Cancelar</button>' : ""}`;
  if (pending) {
    $("confirm").onclick = () => execute(pending!);
    $("cancel").onclick = () => {
      pending = undefined;
      refresh();
    };
  }
  $("resources").innerHTML =
    `<p>PISTOLA <b>${s.ammo.pistola}</b> &nbsp; ESCOPETA <b>${s.ammo.escopeta}</b><br>BOTIQUINES <b>${s.kits}</b></p>`;
  $("log").innerHTML = s.log
    .slice(0, 3)
    .map((l) => `<p>${esc(l)}</p>`)
    .join("");
  if (board) {
    board.state = s;
    board.selected = selected;
    board.preview = pending?.type === "move" ? pending.to : undefined;
    board.draw();
  }
}
function onTile(p: Pos) {
  if (busy || s.screen !== "mission") return;
  const u = s.units.find(
    (u) =>
      active(u) &&
      u.x === p.x &&
      u.y === p.y &&
      (visible(s, u) || (u.kind === "civil" && u.seen)),
  );
  const h = heroes(s).find((u) => u.id === selected)!;
  if (u?.kind === "hero") {
    if (h.role === "Médico" && u.hp < u.max)
      pending = { type: "heal", target: u.id };
    else {
      selected = u.id;
      pending = undefined;
    }
  } else if (u)
    pending = { type: u.kind === "civil" ? "rescue" : "attack", target: u.id };
  else if (path(s, h, p, ROLES[h.role].move).length)
    pending = { type: "move", to: p };
  else {
    s.log.unshift("Ruta bloqueada o fuera de alcance.");
    pending = undefined;
  }
  refresh();
}
async function execute(a: Action) {
  if (busy) return;
  busy = true;
  const error = act(s, selected, a);
  if (error) s.log.unshift(error);
  else {
    beep();
    const point =
      "target" in a
        ? s.units.find((u) => u.id === a.target)
        : heroes(s).find((u) => u.id === selected);
    if (point)
      board?.effect(
        point,
        {
          attack: "¡Impacto!",
          rescue: "◇ Rescatado",
          heal: "+5",
          move: "↗",
          evacuate: "A salvo",
        }[a.type],
      );
    await persist();
  }
  pending = undefined;
  busy = false;
  if (s.screen !== "mission") render();
  else refresh();
}
async function endTurn() {
  if (busy || s.screen !== "mission") return;
  busy = true;
  pending = undefined;
  refresh();
  const next = structuredClone(s);
  next.phase = "enemy";
  for (const e of next.units.filter(
    (u) => active(u) && ["slow", "fast"].includes(u.kind),
  )) {
    enemyStep(next, e.id);
    if (next.screen !== "mission") break;
    const previous = s;
    s = structuredClone(next);
    refresh();
    s = previous;
    await new Promise((r) => setTimeout(r, 180));
  }
  nextTurn(next);
  s = next;
  busy = false;
  await persist();
  if (s.screen === "mission") refresh();
  else render();
}
function result() {
  const civ = s.units.filter(
    (u) => u.kind === "civil" && u.status === "escaped",
  ).length;
  const win =
    civ > 0 && s.units.some((u) => u.kind === "hero" && u.status === "escaped");
  const complete =
    win &&
    s.units
      .filter((u) => u.kind === "civil")
      .every((u) => u.status === "escaped") &&
    s.units
      .filter((u) => u.kind === "hero" && u.status !== "dead")
      .every((u) => u.status === "escaped");
  content.innerHTML = `<section class="panel result"><div class="eyebrow">INFORME DE OPERACIÓN</div><h1>${complete ? "Todos a salvo." : win ? "Extracción lograda." : "Se perdió la señal."}</h1><p>${civ} civiles rescatados · +${civ * 8} suministros · +${civ * 4} balas de pistola · +${civ * 2} cartuchos</p><div class="results">${s.units
    .filter((u) => ["hero", "civil"].includes(u.kind))
    .map(
      (u) =>
        `<p><b>${esc(u.name)}</b><span>${{ escaped: "↗ Escapó", dead: "† Murió", abandoned: "× Abandonado", active: "En misión" }[u.status]}</span></p>`,
    )
    .join(
      "",
    )}</div><button id="shelter" class="primary">Volver al refugio →</button><button id="replay">Otra operación</button></section>`;
  $("shelter").onclick = $("replay").onclick = async () => {
    s.screen = "shelter";
    await persist();
    render();
  };
}
function shelter() {
  const available = s.roster.filter(active);
  content.innerHTML = `<section class="panel"><div class="eyebrow">ZONA SEGURA / REFUGIO</div><h1>El siguiente rescate.</h1><p>${s.supplies} suministros · ${s.ammo.pistola} balas · ${s.ammo.escopeta} cartuchos · ${s.kits} botiquines</p><div class="shelter-grid"><div><h3>Supervivientes · selecciona hasta tres</h3>${available
    .map(
      (u, i) =>
        `<div class="roster"><label><input type="checkbox" value="${u.id}" ${i < 3 ? "checked" : ""}> <b>${esc(u.name)}</b> · ${u.role} · ♥ ${u.max}</label><select data-equip="${u.id}">${Object.entries(
          WEAPONS,
        )
          .map(
            ([k, w]) =>
              `<option value="${k}" ${u.weapon === k ? "selected" : ""}>${w.label}</option>`,
          )
          .join("")}</select></div>`,
    )
    .join(
      "",
    )}<button id="recruit">+ Reclutar sustituto · ${available.length ? "6 suministros" : "ayuda de emergencia gratis"}</button><p class="muted">Sin supervivientes: ayuda gratuita, arma y munición básica. Especialidades permanentes. La enfermería restaura salud entre misiones.</p></div><div><h3>Operaciones</h3>${MAPS.map((m, i) => `<button class="mission-choice" data-mission="${i}" ${i > 0 && !s.completed.includes(i - 1) ? "disabled" : ""}><b>0${i + 1} / ${m.title}</b><small>${m.sub} ${s.completed.includes(i) ? "✓ Completada" : ""}</small></button>`).join("")}</div></div>${backup()}</section>`;
  $("recruit").onclick = async () => {
    if (!recruit(s))
      info(
        "Faltan suministros",
        "<p>Necesitas 6 suministros. Cada civil rescatado aporta 8.</p>",
      );
    await persist();
    render();
  };
  document.querySelectorAll<HTMLSelectElement>("[data-equip]").forEach(
    (e) =>
      (e.onchange = async () => {
        s.roster.find((u) => u.id === e.dataset.equip)!.weapon =
          e.value as Weapon;
        await persist();
      }),
  );
  document.querySelectorAll<HTMLButtonElement>("[data-mission]").forEach(
    (b) =>
      (b.onclick = async () => {
        const ids = Array.from(
          document.querySelectorAll<HTMLInputElement>("input:checked"),
        ).map((i) => i.value);
        if (!ids.length || ids.length > 3) {
          info(
            "Elige tu equipo",
            "<p>Selecciona entre uno y tres supervivientes.</p>",
          );
          return;
        }
        start(s, Number(b.dataset.mission), ids);
        selected = ids[0];
        await persist();
        render();
      }),
  );
  bindBackup();
}
let registration: ServiceWorkerRegistration | undefined;
async function pwa() {
  if (!("serviceWorker" in navigator)) {
    $("offline").textContent = "Modo offline no disponible";
    return;
  }
  try {
    registration = await navigator.serviceWorker.register(
      import.meta.env.BASE_URL + "sw.js",
      { scope: import.meta.env.BASE_URL },
    );
    navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data?.offline)
        $("offline").textContent = "● LISTO PARA JUGAR SIN CONEXIÓN";
    });
    const check = () => {
      if (registration?.waiting) $("update").hidden = false;
      const worker = registration?.active;
      worker?.postMessage("STATUS");
    };
    navigator.serviceWorker.addEventListener("controllerchange", check);
    registration.addEventListener("updatefound", () =>
      registration?.installing?.addEventListener("statechange", check),
    );
    await navigator.serviceWorker.ready;
    check();
    $("update").onclick = async () => {
      if (s.screen === "mission") {
        info(
          "Actualización preparada",
          "<p>Finaliza la misión antes de aplicar la nueva versión. Tu progreso se conserva.</p>",
        );
        return;
      }
      if (await persist()) {
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => location.reload(),
          { once: true },
        );
        registration?.waiting?.postMessage("ACTIVATE");
      }
    };
  } catch {
    $("offline").textContent =
      "No se pudo preparar offline · reintenta con conexión";
  }
}
try {
  const saved = await load();
  if (saved) {
    s = saved;
    exists = true;
  }
} catch (e) {
  info("Problema con el guardado", `<p>${esc(String(e))}</p>`);
}
home();
void pwa();
