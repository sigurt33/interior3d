import type { FurnitureItem, LightPoint, Opening, RoomProject, WallIndex } from '../core/model';
import { layoutProblems, placeAtWall } from '../core/layout';

export const KITCHEN_LIGHT_GROUPS = ['ceiling', 'spots', 'pendants'];

const GAP = 100; // мм — зазор между соседними предметами

export function generateKitchen(
  room: RoomProject['room'],
  openings: Opening[],
): FurnitureItem[] {
  const { width: W, length: L } = room;
  const wallLen = (w: number) => (w % 2 === 0 ? W : L);
  const door = openings.find((o) => o.kind === 'door' || o.kind === 'arch');
  const win = openings.find((o) => o.kind === 'window');
  const placed: FurnitureItem[] = [];

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

  // 1. Рабочая стена: с окном (линия h900 не перекрывает окно с подоконником 900),
  //    иначе напротив двери; затем остальные.
  const baseOrder: WallIndex[] = door
    ? ([(door.wall + 2) % 4, (door.wall + 1) % 4, (door.wall + 3) % 4, door.wall] as WallIndex[])
    : [2, 0, 1, 3];
  const workOrder: WallIndex[] = win
    ? ([win.wall, ...baseOrder.filter((w) => w !== win.wall)] as WallIndex[])
    : baseOrder;

  // Холодильник у края стены + линия на остаток. Каскад ширины линии.
  const fridgeSize = { w: 600, d: 650, h: 2000 };
  const runWidths = [3000, 2400, 1800, 1200, 900, 600];
  let workWall: WallIndex | -1 = -1;
  for (const wall of workOrder) {
    const free = wallLen(wall);
    for (const rw of runWidths) {
      if (600 + GAP + rw > free) continue;
      const start = (free - (600 + GAP + rw)) / 2;
      const fridge = mk('fridge', 'fridge', wall, start, fridgeSize);
      if (!tryAdd(fridge)) continue;
      // плита в 500 мм от холодильника, мойка ещё через 900
      const cooktopCenter = Math.min(500, rw - 400);
      const sinkCenter = Math.min(cooktopCenter + 900, rw - 300);
      const run = mk('run', 'kitchenRun', wall, start + 600 + GAP, { w: rw, d: 600, h: 900 },
        { cooktopCenter, sinkCenter });
      if (tryAdd(run)) {
        workWall = wall;
        // 2. Вытяжка над плитой (совпадает по координате с cooktop); ceilingMounted —
        //    висит выше мебели, layoutProblems не применяет к ней 2D-коллизии
        tryAdd(mk('hood', 'hood', wall, start + 600 + GAP + cooktopCenter - 200,
          { w: 400, d: 400, h: room.height - 500 < 2200 ? room.height - 500 : 2200 },
          { ceilingMounted: true }));
        break;
      }
      placed.pop(); // откат холодильника, линия не встала
    }
    if (workWall >= 0) break;
  }

  // Крошечные кухни: если даже минимальная линия+холодильник не влезли ни на одной стене —
  // пробуем линию без холодильника (компактный гарнитур без отдельного корпуса холодильника).
  if (workWall < 0) {
    for (const wall of workOrder) {
      const free = wallLen(wall);
      for (const rw of runWidths) {
        if (rw > free) continue;
        const run = mk('run', 'kitchenRun', wall, (free - rw) / 2, { w: rw, d: 600, h: 900 },
          { cooktopCenter: Math.min(300, rw - 200), sinkCenter: Math.min(900, rw - 100) });
        if (tryAdd(run)) {
          workWall = wall;
          break;
        }
      }
      if (workWall >= 0) break;
    }
  }

  // 3. Обеденная зона: круглый стол в свободной половине (дальней от рабочей стены),
  //    freestanding; стулья по бокам. Каскад диаметра, стулья опциональны.
  const centerFor = (wall: number, frac: number): { x: number; z: number } => {
    // точка на глубине frac (0..1) от рабочей стены к противоположной
    switch (wall) {
      case 0: return { x: W / 2, z: L * frac };
      case 1: return { x: W * (1 - frac), z: L / 2 };
      case 2: return { x: W / 2, z: L * (1 - frac) };
      default: return { x: W * frac, z: L / 2 };
    }
  };
  const tableWall = workWall >= 0 ? workWall : 0;
  for (const dia of [1000, 800, 700]) {
    let placedTable = false;
    for (const frac of [0.68, 0.5, 0.32]) {
      const c = centerFor(tableWall, frac);
      const table: FurnitureItem = {
        id: 'table', type: 'roundTable', position: { x: c.x, z: c.z }, rotation: 0,
        size: { w: dia, d: dia, h: 750 }, options: {},
      };
      if (!tryAdd(table)) continue;
      placedTable = true;
      // стулья по обе стороны стола вдоль рабочей стены, спинкой от стола
      const chairSize = { w: 450, d: 450, h: 850 };
      const off = dia / 2 + GAP + chairSize.d / 2;
      const horizontal = tableWall % 2 === 0; // рабочая стена вдоль x → стулья по x
      for (const s of [-1, 1]) {
        const chair: FurnitureItem = {
          id: `chair-${s > 0 ? 'r' : 'l'}`, type: 'chair',
          position: {
            x: c.x + (horizontal ? s * off : 0),
            z: c.z + (horizontal ? 0 : s * off),
          },
          rotation: horizontal ? (s > 0 ? Math.PI / 2 : -Math.PI / 2) : (s > 0 ? Math.PI : 0),
          size: chairSize, options: {},
        };
        tryAdd(chair);
      }
      break;
    }
    if (placedTable) break;
  }

  return placed;
}

// Точки света: споты вдоль рабочей линии, подвес над столом
export function kitchenLightPoints(
  room: RoomProject['room'],
  furniture: FurnitureItem[],
): LightPoint[] {
  const pts: LightPoint[] = [];
  const run = furniture.find((f) => f.type === 'kitchenRun');
  if (run) {
    // 2-3 спота вдоль линии на высоте потолок-200
    const n = Math.max(2, Math.round(run.size.w / 1200));
    const horizontal = (run.wall ?? 0) % 2 === 0;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n - 0.5; // -0.5..0.5 вдоль линии
      pts.push({
        group: 'spots',
        x: run.position.x + (horizontal ? t * run.size.w : 0),
        y: room.height - 200,
        z: run.position.z + (horizontal ? 0 : t * run.size.w),
      });
    }
  }
  const table = furniture.find((f) => f.type === 'roundTable');
  if (table)
    pts.push({ group: 'pendants', x: table.position.x, y: room.height - 900, z: table.position.z });
  return pts;
}
