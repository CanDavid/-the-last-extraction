export type Role = "Soldado" | "Médico" | "Explorador";
export const ROLES = {
  Soldado: { hp: 12, move: 4, vision: 6 },
  Médico: { hp: 9, move: 4, vision: 6 },
  Explorador: { hp: 8, move: 6, vision: 8 },
};
export const WEAPONS = {
  pistola: { range: 5, damage: 3, noise: 6, label: "Pistola" },
  escopeta: { range: 3, damage: 5, noise: 10, label: "Escopeta · un objetivo" },
  melee: { range: 1, damage: 2, noise: 2, label: "Machete" },
};
export type Weapon = keyof typeof WEAPONS;
export const BALANCE = { wave: 4, cap: 10, heal: 5, reward: 8 };
export const MAPS = [
  {
    title: "Distrito cero",
    sub: "Barrio residencial",
    rows: [
      "................",
      "..CC.....#.....E",
      ".........#.....E",
      "....####.##.##..",
      "....#...........",
      "....#...........",
      "....##.####.....",
      "................",
      "..CC.......CC...",
      "........#.......",
      "........#.......",
      "................",
    ],
  },
  {
    title: "Línea muerta",
    sub: "Terminal de transporte",
    rows: [
      "...............E",
      "...CC..........E",
      ".......#........",
      "..###..#..###...",
      ".......#........",
      "...CC.....CC....",
      ".......#........",
      "..###..#..###...",
      ".......#........",
      "...CC...........",
      "................",
      "................",
    ],
  },
  {
    title: "Última señal",
    sub: "Hospital de campaña",
    rows: [
      "...............E",
      "....#..........E",
      "....#...#####...",
      "....#...#.......",
      "........#.......",
      "..###...###.##..",
      "................",
      "...CC......CC...",
      "........#.......",
      "..####..#..###..",
      "................",
      "................",
    ],
  },
];
