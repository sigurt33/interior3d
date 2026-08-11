import type { FurnitureItem, LightPoint, Opening, RoomProject, RoomType } from '../core/model';
import { generateBedroom, bedroomLightPoints, BEDROOM_LIGHT_GROUPS } from './bedroom';
import { generateKitchen, kitchenLightPoints, KITCHEN_LIGHT_GROUPS } from './kitchen';

export type { LightPoint } from '../core/model';

export interface Template {
  generate(room: RoomProject['room'], openings: Opening[]): FurnitureItem[];
  lightGroups: string[];
  lightPoints(room: RoomProject['room'], furniture: FurnitureItem[]): LightPoint[];
}

// План 1: спальня; план 2: + кухня
export const TEMPLATES: Partial<Record<RoomType, Template>> = {
  bedroom: { generate: generateBedroom, lightGroups: BEDROOM_LIGHT_GROUPS, lightPoints: bedroomLightPoints },
  kitchen: { generate: generateKitchen, lightGroups: KITCHEN_LIGHT_GROUPS, lightPoints: kitchenLightPoints },
};
