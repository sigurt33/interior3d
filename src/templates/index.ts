import type { FurnitureItem, Opening, RoomProject, RoomType } from '../core/model';
import { generateBedroom, bedroomLightPoints, BEDROOM_LIGHT_GROUPS } from './bedroom';

// Точка светильника в мм (мировые координаты комнаты). Группа 'ceiling'
// шаблонами не задаётся — потолочную сетку строит assemble универсально.
export interface LightPoint { group: string; x: number; y: number; z: number }

export interface Template {
  generate(room: RoomProject['room'], openings: Opening[]): FurnitureItem[];
  lightGroups: string[];
  lightPoints(room: RoomProject['room'], furniture: FurnitureItem[]): LightPoint[];
}

// План 1: реализована только спальня; остальные типы добавит план 2
export const TEMPLATES: Partial<Record<RoomType, Template>> = {
  bedroom: { generate: generateBedroom, lightGroups: BEDROOM_LIGHT_GROUPS, lightPoints: bedroomLightPoints },
};
