import Phaser from "phaser";
import {
  type State,
  type Pos,
  type Unit,
  active,
  tile,
  visible,
  path,
  heroes,
  distance,
} from "./rules";
import { ROLES } from "./config";
export class Board extends Phaser.Scene {
  state?: State;
  selected = "";
  preview?: Pos;
  click: (p: Pos) => void = () => {};
  gfx!: Phaser.GameObjects.Graphics;
  labels: Phaser.GameObjects.Text[] = [];
  constructor() {
    super("board");
  }
  create() {
    this.gfx = this.add.graphics();
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) =>
      this.click({ x: Math.floor(p.x / 40), y: Math.floor(p.y / 40) }),
    );
    this.draw();
  }
  effect(p: Pos, label: string) {
    if (!this.gfx) return;
    const f = this.add
      .text(p.x * 40 + 20, p.y * 40 + 4, label, {
        fontFamily: "monospace",
        fontSize: 15,
        color: "#e1f2b6",
        backgroundColor: "#14292a",
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: f,
      y: f.y - 22,
      alpha: 0,
      duration: 650,
      onComplete: () => f.destroy(),
    });
  }
  draw() {
    if (!this.gfx || !this.state) return;
    const s = this.state,
      g = this.gfx;
    g.clear();
    this.labels.forEach((t) => t.destroy());
    this.labels = [];
    const text = (
      x: number,
      y: number,
      t: string,
      color = "#b8c7bc",
      size = 10,
    ) => {
      this.labels.push(
        this.add.text(x, y, t, {
          fontFamily: "monospace",
          fontSize: size,
          color,
        }),
      );
    };
    const h = heroes(s).find((u) => u.id === this.selected);
    for (let y = 0; y < 12; y++)
      for (let x = 0; x < 16; x++) {
        const p = { x, y },
          t = tile(s, p);
        g.fillStyle(
          t === "#"
            ? 0x344849
            : t === "C"
              ? 0x536168
              : t === "E"
                ? 0x204d45
                : (x + y) % 2
                  ? 0x202f33
                  : 0x233337,
        );
        g.fillRect(x * 40 + 1, y * 40 + 1, 38, 38);
        if (t === "#") {
          g.fillStyle(0x526260);
          g.fillRect(x * 40 + 2, y * 40 + 2, 36, 6);
          g.lineStyle(1, 0x1a292e);
          g.strokeRect(x * 40 + 5, y * 40 + 12, 30, 24);
        } else if (t === "C") {
          g.fillStyle(0x192c34);
          g.fillRect(x * 40 + 8, y * 40 + 7, 23, 12);
          g.fillStyle(0x809293);
          g.fillRect(x * 40 + 4, y * 40 + 29, 30, 4);
        } else if (t === "E") {
          g.lineStyle(1, 0x8de3b0);
          g.strokeRect(x * 40 + 4, y * 40 + 4, 32, 32);
          text(x * 40 + 14, y * 40 + 12, "E", "#a5f5bf", 17);
        } else {
          g.fillStyle(0x344449);
          g.fillRect(x * 40 + ((x * 7 + y * 3) % 30) + 3, y * 40 + 30, 4, 2);
        }
        if (
          h &&
          h.ap &&
          s.phase === "player" &&
          path(s, h, p, ROLES[h.role].move).length
        ) {
          g.lineStyle(1, 0x537975, 0.65);
          g.strokeRect(x * 40 + 3, y * 40 + 3, 34, 34);
        }
      }
    if (h && this.preview) {
      for (const p of path(s, h, this.preview, ROLES[h.role].move)) {
        g.fillStyle(0x8be4b0, 0.32);
        g.fillRect(p.x * 40 + 8, p.y * 40 + 8, 24, 24);
      }
      g.lineStyle(2, 0xd7f4bb);
      g.strokeRect(this.preview.x * 40 + 3, this.preview.y * 40 + 3, 34, 34);
    }
    for (const n of s.noise.filter((n) => n.until >= s.turn)) {
      g.lineStyle(1, 0xe6b268, 0.25);
      g.strokeCircle(n.x * 40 + 20, n.y * 40 + 20, n.radius * 40);
    }
    for (const u of s.units.filter(
      (u) => active(u) && (visible(s, u) || (u.kind === "civil" && u.seen)),
    ))
      this.unit(u, text, g, s);
    text(5, 82, "◀ OLEADA", "#ef9479", 9);
    text(544, 367, "OLEADA ▶", "#ef9479", 9);
  }
  unit(
    u: Unit,
    text: (x: number, y: number, t: string, c?: string, size?: number) => void,
    g: Phaser.GameObjects.Graphics,
    s: State,
  ) {
    const x = u.x * 40,
      y = u.y * 40;
    const c =
      u.kind === "hero"
        ? { Soldado: 0x8fc8b6, Médico: 0xe7d3a0, Explorador: 0x9ebbd9 }[u.role]
        : u.kind === "civil"
          ? 0xe1ad6f
          : u.kind === "fast"
            ? 0xcb766e
            : 0x98a075;
    g.fillStyle(0x08161c, 0.6);
    g.fillEllipse(x + 21, y + 33, 26, 9);
    if (u.id === this.selected) {
      g.lineStyle(2, 0xb9f5cc);
      g.strokeRect(x + 2, y + 2, 36, 36);
    }
    g.fillStyle(c);
    g.fillRect(x + 13, y + 15, 15, 15);
    g.fillRect(x + 10, y + 18, 4, 9);
    g.fillRect(x + 28, y + 18, 4, 9);
    g.fillStyle(0xbca58c);
    g.fillRect(x + 15, y + 6, 12, 10);
    g.fillStyle(u.kind === "hero" ? 0x243d48 : 0x383f33);
    g.fillRect(x + 14, y + 5, 14, 4);
    g.fillRect(x + 13, y + 29, 5, 6);
    g.fillRect(x + 23, y + 29, 5, 6);
    g.fillStyle(0x121d22);
    g.fillRect(x + 18, y + 11, 3, 2);
    g.fillRect(x + 25, y + 11, 2, 2);
    g.fillStyle(0x101b20);
    g.fillRect(x + 7, y + 36, 27, 3);
    g.fillStyle(c);
    g.fillRect(x + 7, y + 36, (27 * u.hp) / u.max, 3);
    text(
      x + 2,
      y + 1,
      u.kind === "hero"
        ? String(u.ap)
        : u.kind === "civil"
          ? "◇"
          : u.kind === "fast"
            ? "»"
            : "†",
      undefined,
      9,
    );
    if (!visible(s, u)) text(x + 15, y + 17, "?");
  }
}
