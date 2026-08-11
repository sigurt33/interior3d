import type { FurnitureItem, Opening, RoomProject, WallIndex } from '../core/model';
import { layoutProblems, placeAtWall } from '../core/layout';

export const GAP = 100; // мм — зазор между соседними предметами мебели

// Общий каркас шаблона: аккумулятор placed + tryAdd/mk/wallLen.
// Специфика комнат (каскады размеров, порядок стен) остаётся в шаблонах.
export function makeTemplateHelpers(room: RoomProject['room'], openings: Opening[]) {
  const { width: W, length: L } = room;
  const placed: FurnitureItem[] = [];
  const wallLen = (w: number) => (w % 2 === 0 ? W : L);
  const tryAdd = (item: FurnitureItem): boolean => {
    if (layoutProblems([...placed, item], room, openings).length > 0) return false;
    placed.push(item);
    return true;
  };
  const mk = (
    id: string, type: string, wall: WallIndex, offset: number,
    size: { w: number; d: number; h: number },
    options: Record<string, unknown> = {},
  ): FurnitureItem => ({
    id, type, wall, size, options,
    ...placeAtWall(wall, offset, size, W, L),
  });
  return { placed, wallLen, tryAdd, mk };
}
