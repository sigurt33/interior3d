import type { FurnitureItem, LightPoint, Opening, RoomProject, WallIndex } from '../core/model';
import { GAP, makeTemplateHelpers } from './helpers';

export const BATHROOM_LIGHT_GROUPS = ['ceiling', 'mirror'];

export function generateBathroom(
  room: RoomProject['room'],
  openings: Opening[],
): FurnitureItem[] {
  const door = openings.find((o) => o.kind === 'door' || o.kind === 'arch');
  const doorWall = (door?.wall ?? 0) as WallIndex;
  const { placed, wallLen, tryAdd, mk } = makeTemplateHelpers(room, openings);

  // 1. Тумба с зеркалом — на соседней к двери стене (сначала более длинная), по центру;
  //    каскад ширины. В крайнем случае — стена напротив двери.
  const sideWalls = ([(doorWall + 1) % 4, (doorWall + 3) % 4] as WallIndex[])
    .sort((a, b) => wallLen(b) - wallLen(a));
  const vanityWalls: WallIndex[] = [...sideWalls, ((doorWall + 2) % 4) as WallIndex];
  outer: for (const vw of [1200, 900, 600]) {
    for (const wall of vanityWalls) {
      if (wallLen(wall) < vw) continue;
      if (tryAdd(mk('vanity', 'vanity', wall, (wallLen(wall) - vw) / 2, { w: vw, d: 500, h: 2000 })))
        break outer;
    }
  }

  // 2. Ванна вдоль самой длинной подходящей стены; не влезла — душевая в углу
  const tubWalls: WallIndex[] = ([0, 1, 2, 3] as WallIndex[])
    .filter((w) => w !== doorWall)
    .sort((a, b) => wallLen(b) - wallLen(a));
  let wetDone = false;
  for (const len of [1700, 1500]) {
    for (const wall of tubWalls) {
      if (wallLen(wall) < len) continue;
      // пробуем прижать к углам, затем центр
      for (const off of [0, wallLen(wall) - len, (wallLen(wall) - len) / 2]) {
        if (off < 0) continue;
        if (tryAdd(mk('bathtub', 'bathtub', wall, off, { w: len, d: 750, h: 600 }))) {
          wetDone = true;
          break;
        }
      }
      if (wetDone) break;
    }
    if (wetDone) break;
  }
  if (!wetDone) {
    for (const wall of tubWalls) {
      if (wallLen(wall) < 900) continue;
      for (const off of [0, Math.max(0, wallLen(wall) - 900)]) {
        if (tryAdd(mk('shower', 'shower', wall, off, { w: 900, d: 900, h: 2100 }))) {
          wetDone = true;
          break;
        }
      }
      if (wetDone) break;
    }
  }

  // 3. Унитаз — на стене двери, рядом с дверью (с обеих сторон пробуем)
  if (door) {
    const t = { w: 400, d: 650, h: 800 };
    const after = door.offset + door.width + GAP;
    const before = door.offset - GAP - t.w;
    for (const off of [after, before]) {
      if (off < 0 || off + t.w > wallLen(doorWall)) continue;
      if (tryAdd(mk('toilet', 'toilet', doorWall, off, t))) break;
    }
  }

  return placed;
}

// Точка света над зеркалом тумбы
export function bathroomLightPoints(
  room: RoomProject['room'],
  furniture: FurnitureItem[],
): LightPoint[] {
  const vanity = furniture.find((f) => f.type === 'vanity');
  if (!vanity) return [];
  return [{ group: 'mirror', x: vanity.position.x, y: 1950, z: vanity.position.z }];
}
