import type { FurnitureItem, Opening, RoomProject, WallIndex } from '../core/model';
import { layoutProblems, placeAtWall } from '../core/layout';

export const BEDROOM_LIGHT_GROUPS = ['ceiling', 'pendants', 'accent'];

const GAP = 100; // мм — зазор между соседними предметами мебели

export function generateBedroom(
  room: RoomProject['room'],
  openings: Opening[],
): FurnitureItem[] {
  const { width: W, length: L } = room;
  const wallLen = (w: number) => (w % 2 === 0 ? W : L);
  const door = openings.find((o) => o.kind === 'door' || o.kind === 'arch');
  const placed: FurnitureItem[] = [];

  const tryAdd = (item: FurnitureItem): boolean => {
    if (layoutProblems([...placed, item], room, openings).length > 0) return false;
    placed.push(item);
    return true;
  };

  const mk = (
    id: string, type: string, wall: WallIndex, offset: number,
    size: { w: number; d: number; h: number },
  ): FurnitureItem => ({
    id, type, wall, size, options: {},
    ...placeAtWall(wall, offset, size, W, L),
  });

  // 1. Кровать — приоритетно стена напротив двери, по центру стены; затем остальные стены,
  //    с уменьшением размера кровати, если полноразмерная нигде не влезает.
  //    Каскад и по ширине (двуспальная → односпальная), и по глубине (2100 → 1700;
  //    глубже сокращать нельзя — перестаёт быть кроватью). Кровать — главный предмет:
  //    перебор комбинаций размеров × стен исчерпывается прежде, чем шаблон сдаётся.
  const bedWidths = [1800, 1400, 900]; // двуспальная, полутороспальная, односпальная
  const bedDepths = [2100, 1900, 1700];
  const bedSizes = bedWidths.flatMap((w) => bedDepths.map((d) => ({ w, d, h: 1000 })));
  const win = openings.find((o) => o.kind === 'window');
  const baseWallOrder: WallIndex[] = door
    ? ([(door.wall + 2) % 4, (door.wall + 1) % 4, (door.wall + 3) % 4, door.wall] as WallIndex[])
    : [2, 0, 1, 3];
  // Стену с окном стараемся оставить свободной под стол — пробуем её в последнюю очередь
  const wallOrder: WallIndex[] = win
    ? ([...baseWallOrder.filter((w) => w !== win.wall), win.wall] as WallIndex[])
    : baseWallOrder;
  let bedWall: WallIndex | -1 = -1;
  let bedOffset = 0;
  let bedSize = bedSizes[0];
  outer: for (const size of bedSizes) {
    for (const w of wallOrder) {
      if (wallLen(w) < size.w) continue;
      const offset = (wallLen(w) - size.w) / 2;
      if (tryAdd(mk('bed', 'bed', w, offset, size))) {
        bedWall = w;
        bedOffset = offset;
        bedSize = size;
        break outer;
      }
    }
  }

  // 2. Тумбочки по бокам кровати (пропускаются, если не помещаются — не критично)
  if (bedWall >= 0) {
    const ns = { w: 450, d: 450, h: 500 };
    tryAdd(mk('nightstand-l', 'nightstand', bedWall as WallIndex, bedOffset - GAP - ns.w, ns));
    tryAdd(mk('nightstand-r', 'nightstand', bedWall as WallIndex, bedOffset + bedSize.w + GAP, ns));
  }

  // 3. Шкаф — вдоль свободной стены, ширина подгоняется под остаток места
  // Стена с окном не исключается: layoutProblems не проверяет окна, шкаф может встать
  // под окном — для спальни это осознанно допустимо (План 2: в кухне это пересмотреть)
  const wardrobeWidths = [2400, 1800, 1200, 900, 600];
  for (const w of ([0, 1, 2, 3] as WallIndex[]).filter((w) => w !== bedWall)) {
    const free = wallLen(w);
    for (const ww of wardrobeWidths) {
      if (ww > free) continue;
      if (tryAdd(mk('wardrobe', 'wardrobe', w, (free - ww) / 2, { w: ww, d: 600, h: 2200 }))) break;
    }
    if (placed.some((i) => i.type === 'wardrobe')) break;
  }

  // 4. Стол — под окном, если оно есть; при нехватке места уменьшается или пропускается
  if (win) {
    const deskWidths = [1200, 900, 700];
    for (const dw of deskWidths) {
      const dSize = { w: dw, d: 600, h: 750 };
      const center = win.offset + win.width / 2;
      const offset = Math.min(Math.max(0, center - dSize.w / 2), Math.max(0, wallLen(win.wall) - dSize.w));
      if (wallLen(win.wall) < dSize.w) continue;
      if (tryAdd(mk('desk', 'desk', win.wall, offset, dSize))) break;
    }
  }

  return placed;
}
