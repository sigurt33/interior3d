import type { FurnitureItem, LightPoint, Opening, RoomProject, WallIndex } from '../core/model';
import { GAP, makeTemplateHelpers } from './helpers';

export const KIDS_LIGHT_GROUPS = ['ceiling', 'accent'];

const KID_ACCENT = 0x7fc8c0; // бирюзовый по умолчанию (пол ребёнка мастер пока не спрашивает)

export function generateKids(
  room: RoomProject['room'],
  openings: Opening[],
): FurnitureItem[] {
  const door = openings.find((o) => o.kind === 'door' || o.kind === 'arch');
  const win = openings.find((o) => o.kind === 'window');
  const { placed, wallLen, tryAdd, mk } = makeTemplateHelpers(room, openings);

  // 1. Кровать — каскад ширины/глубины (как в спальне), у стены напротив двери
  //    (окно — в последнюю очередь), со сдвигом к углу (не по центру — центр под игры)
  const bedWidths = [900, 800];
  const bedDepths = [1700, 1600];
  const bedSizes = bedWidths.flatMap((w) => bedDepths.map((d) => ({ w, d, h: 800 })));
  const baseOrder: WallIndex[] = door
    ? ([(door.wall + 2) % 4, (door.wall + 1) % 4, (door.wall + 3) % 4, door.wall] as WallIndex[])
    : [2, 0, 1, 3];
  const wallOrder: WallIndex[] = win
    ? ([...baseOrder.filter((w) => w !== win.wall), win.wall] as WallIndex[])
    : baseOrder;
  let bedWall: WallIndex | -1 = -1;
  outerBed: for (const size of bedSizes) {
    for (const wall of wallOrder) {
      if (wallLen(wall) < size.w) continue;
      for (const off of [GAP, wallLen(wall) - size.w - GAP, (wallLen(wall) - size.w) / 2]) {
        if (off < 0) continue;
        if (tryAdd(mk('bed', 'kidBed', wall, off, size, { accentColor: KID_ACCENT }))) {
          bedWall = wall;
          break outerBed;
        }
      }
    }
  }

  // 2. Шкаф — свободная стена, каскад ширины; стену с окном стараемся оставить
  //    столу — пробуем её в последнюю очередь
  const wardrobeWidths = [1800, 1200, 900, 600];
  const wardrobeWallOrder = ([0, 1, 2, 3] as WallIndex[]).filter((w) => w !== bedWall);
  const wardrobeWalls = win
    ? [...wardrobeWallOrder.filter((w) => w !== win.wall), ...wardrobeWallOrder.filter((w) => w === win.wall)]
    : wardrobeWallOrder;
  for (const wall of wardrobeWalls) {
    const free = wallLen(wall);
    let done = false;
    for (const ww of wardrobeWidths) {
      if (ww > free) continue;
      if (tryAdd(mk('wardrobe', 'wardrobe', wall, (free - ww) / 2, { w: ww, d: 600, h: 2200 }))) {
        done = true;
        break;
      }
    }
    if (done) break;
  }

  // 3. Стол у окна (как в спальне), каскад размеров
  if (win) {
    for (const dw of [1000, 800, 700]) {
      if (wallLen(win.wall) < dw) continue;
      const dSize = { w: dw, d: 500, h: 750 };
      const center = win.offset + win.width / 2;
      const offset = Math.min(Math.max(0, center - dw / 2), Math.max(0, wallLen(win.wall) - dw));
      if (tryAdd(mk('desk', 'desk', win.wall, offset, dSize))) break;
    }
  }

  // 4. Стеллаж для игрушек — любая стена, где влезет, каскад ширины
  for (const wall of [0, 1, 2, 3] as WallIndex[]) {
    const free = wallLen(wall);
    let done = false;
    for (const sw of [800, 600, 450]) {
      if (sw > free) continue;
      for (const off of [GAP, free - sw - GAP, (free - sw) / 2]) {
        if (off < 0) continue;
        if (tryAdd(mk('shelf', 'toyShelf', wall, off, { w: sw, d: 300, h: 1200 }))) {
          done = true;
          break;
        }
      }
      if (done) break;
    }
    if (done) break;
  }

  return placed;
}

// «Гирлянда»: 3 тёплые точки вдоль кровати
export function kidsLightPoints(
  room: RoomProject['room'],
  furniture: FurnitureItem[],
): LightPoint[] {
  const bed = furniture.find((f) => f.type === 'kidBed');
  if (!bed) return [];
  const horizontal = (bed.wall ?? 0) % 2 === 0;
  const pts: LightPoint[] = [];
  for (const t of [-0.35, 0, 0.35]) {
    pts.push({
      group: 'accent',
      x: bed.position.x + (horizontal ? t * bed.size.w : 0),
      y: room.height - 900,
      z: bed.position.z + (horizontal ? 0 : t * bed.size.w),
    });
  }
  return pts;
}
