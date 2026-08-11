import type { FurnitureItem, Opening, RoomProject, WallIndex } from './model';

export interface Rect { x0: number; z0: number; x1: number; z1: number }

// offset — от начала стены по часовому обходу (вид сверху); возвращает центр и поворот
export function placeAtWall(
  wall: WallIndex, offset: number,
  size: { w: number; d: number; h: number },
  W: number, L: number,
): { position: { x: number; z: number }; rotation: number } {
  const half = size.w / 2;
  const dd = size.d / 2;
  switch (wall) {
    case 0: return { position: { x: offset + half, z: dd }, rotation: 0 };
    case 1: return { position: { x: W - dd, z: offset + half }, rotation: -Math.PI / 2 };
    case 2: return { position: { x: W - offset - half, z: L - dd }, rotation: Math.PI };
    case 3: return { position: { x: dd, z: L - offset - half }, rotation: Math.PI / 2 };
  }
}

export function itemRect(item: FurnitureItem): Rect {
  const quarter = Math.round(item.rotation / (Math.PI / 2));
  const swapped = Math.abs(quarter) % 2 === 1;
  const w = swapped ? item.size.d : item.size.w;
  const d = swapped ? item.size.w : item.size.d;
  return {
    x0: item.position.x - w / 2,
    z0: item.position.z - d / 2,
    x1: item.position.x + w / 2,
    z1: item.position.z + d / 2,
  };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
}

const DOOR_CLEAR = 900; // мм свободного пространства перед дверью/аркой

export function doorClearRect(op: Opening, W: number, L: number): Rect {
  switch (op.wall) {
    case 0: return { x0: op.offset, z0: 0, x1: op.offset + op.width, z1: DOOR_CLEAR };
    case 1: return { x0: W - DOOR_CLEAR, z0: op.offset, x1: W, z1: op.offset + op.width };
    case 2: return { x0: W - op.offset - op.width, z0: L - DOOR_CLEAR, x1: W - op.offset, z1: L };
    case 3: return { x0: 0, z0: L - op.offset - op.width, x1: DOOR_CLEAR, z1: L - op.offset };
  }
}

const EPS = 1; // мм допуска на округления

export function layoutProblems(
  items: FurnitureItem[],
  room: RoomProject['room'],
  openings: Opening[],
): string[] {
  const problems: string[] = [];
  const rects = items.map(itemRect);
  // потолочные предметы (вытяжка) живут выше мебели — 2D-коллизии к ним не применяются
  const ceiling = items.map((it) => it.options.ceilingMounted === true);

  items.forEach((it, i) => {
    const r = rects[i];
    if (r.x0 < -EPS || r.z0 < -EPS || r.x1 > room.width + EPS || r.z1 > room.length + EPS)
      problems.push(`${it.id}: выходит за стены`);
  });

  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++)
      if (!ceiling[i] && !ceiling[j] && rectsOverlap(rects[i], rects[j]))
        problems.push(`${items[i].id} пересекается с ${items[j].id}`);

  for (const op of openings) {
    if (op.kind !== 'door' && op.kind !== 'arch') continue;
    const clear = doorClearRect(op, room.width, room.length);
    items.forEach((it, i) => {
      if (!ceiling[i] && rectsOverlap(rects[i], clear)) problems.push(`${it.id}: блокирует дверь`);
    });
  }
  return problems;
}
