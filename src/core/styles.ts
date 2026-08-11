export interface StyleDef {
  id: string;
  name: string;
  floor: number;    // пол
  wall: number;     // стены
  ceiling: number;  // потолок
  facade: number;   // фасады мебели
  accent: number;   // акценты (фурнитура, профили)
  wood: number;     // дерево (каркасы, столешницы)
  textile: number;  // текстиль (изголовья, матрасы-чехлы)
}

export const STYLES: StyleDef[] = [
  { id: 'beige-minimal', name: 'Бежевый минимализм', floor: 0xb8a98f, wall: 0xe8e0d2, ceiling: 0xf5f2ec, facade: 0xd8cbb4, accent: 0x222222, wood: 0x9a7b52, textile: 0xcfc6b8 },
  { id: 'light-classic', name: 'Светлая классика', floor: 0xc9b795, wall: 0xf2ede2, ceiling: 0xfaf7f0, facade: 0xffffff, accent: 0xb08d57, wood: 0x8a6a48, textile: 0xe6ddd0 },
  { id: 'dark-contrast', name: 'Тёмный контраст', floor: 0x5a4a3a, wall: 0x3a3a40, ceiling: 0xd8d8d8, facade: 0x2e2e33, accent: 0xc9a227, wood: 0x6b4f35, textile: 0x8a8a92 },
  { id: 'scandi', name: 'Скандинавский', floor: 0xd9cbb0, wall: 0xf5f5f2, ceiling: 0xffffff, facade: 0xffffff, accent: 0x4a4a4a, wood: 0xc4a878, textile: 0xdde3e6 },
];

export function getStyle(id: string): StyleDef {
  return STYLES.find((s) => s.id === id) ?? STYLES[0];
}
