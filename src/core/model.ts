export const ROOM_TYPES = ['kitchen', 'bathroom', 'bedroom', 'kids'] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export type OpeningKind = 'door' | 'window' | 'arch';
export type WallIndex = 0 | 1 | 2 | 3;

export interface Opening {
  kind: OpeningKind;
  wall: WallIndex;
  offset: number; // мм от начала стены (обход по часовой сверху)
  width: number;
  height: number;
  sill?: number; // высота подоконника (для окон)
}

export interface FurnitureItem {
  id: string;
  type: string;
  wall?: WallIndex;
  position: { x: number; z: number }; // центр, мм
  rotation: number; // рад, кратно 90°
  size: { w: number; d: number; h: number }; // мм
  options: Record<string, unknown>;
}

export interface LightGroupState {
  id: string;
  on: boolean;
  brightness: number; // 0..1
}

export interface LightingState {
  preset: string | null;
  sunTime: number; // 0..24
  colorTemp: number; // 2700..6500 K
  groups: LightGroupState[];
}

export interface RoomProject {
  meta: { name: string; created: string; version: 1 };
  room: { type: RoomType; width: number; length: number; height: number };
  openings: Opening[];
  style: { palette: string; floorMaterial: string; wallMaterial: string; accentMaterial: string };
  furniture: FurnitureItem[];
  lighting: LightingState;
}

export const ROOM_NAMES: Record<RoomType, string> = {
  kitchen: 'Кухня',
  bathroom: 'Ванная',
  bedroom: 'Спальня',
  kids: 'Детская',
};

export function defaultProject(
  type: RoomType,
  width: number,
  length: number,
  height = 2700
): RoomProject {
  return {
    meta: { name: ROOM_NAMES[type], created: new Date().toISOString(), version: 1 },
    room: { type, width, length, height },
    openings: [],
    style: {
      palette: 'beige-minimal',
      floorMaterial: 'wood',
      wallMaterial: 'paint',
      accentMaterial: 'black',
    },
    furniture: [],
    lighting: { preset: 'day', sunTime: 13, colorTemp: 4000, groups: [] },
  };
}
