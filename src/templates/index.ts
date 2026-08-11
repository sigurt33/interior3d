import type { FurnitureItem, Opening, RoomProject, RoomType } from '../core/model';
import { generateBedroom, BEDROOM_LIGHT_GROUPS } from './bedroom';

export interface Template {
  generate(room: RoomProject['room'], openings: Opening[]): FurnitureItem[];
  lightGroups: string[];
}

// План 1: реализована только спальня; остальные типы добавит план 2
export const TEMPLATES: Partial<Record<RoomType, Template>> = {
  bedroom: { generate: generateBedroom, lightGroups: BEDROOM_LIGHT_GROUPS },
};
