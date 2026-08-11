import { describe, it, expect } from 'vitest';
import { placeAtWall, itemRect, rectsOverlap, layoutProblems } from '../src/core/layout';
import type { FurnitureItem, Opening } from '../src/core/model';

const size = { w: 2000, d: 600, h: 800 };
const room = { type: 'bedroom' as const, width: 4000, length: 5000, height: 2700 };

function item(id: string, wall: 0 | 1 | 2 | 3, offset: number, s = size): FurnitureItem {
  return { id, type: 'test', wall, size: s, options: {}, ...placeAtWall(wall, offset, s, room.width, room.length) };
}

describe('placeAtWall', () => {
  it('стена 0: спина к z=0', () => {
    const p = placeAtWall(0, 1000, size, 4000, 5000);
    expect(p.position).toEqual({ x: 2000, z: 300 });
    expect(p.rotation).toBe(0);
  });

  it('стена 1: спина к x=W', () => {
    const p = placeAtWall(1, 1000, size, 4000, 5000);
    expect(p.position).toEqual({ x: 3700, z: 2000 });
    expect(p.rotation).toBeCloseTo(-Math.PI / 2);
  });

  it('стена 2: отсчёт с другого конца', () => {
    const p = placeAtWall(2, 0, size, 4000, 5000);
    expect(p.position).toEqual({ x: 3000, z: 4700 });
    expect(p.rotation).toBeCloseTo(Math.PI);
  });

  it('стена 3', () => {
    const p = placeAtWall(3, 0, size, 4000, 5000);
    expect(p.position).toEqual({ x: 300, z: 4000 });
    expect(p.rotation).toBeCloseTo(Math.PI / 2);
  });
});

describe('itemRect / rectsOverlap', () => {
  it('учитывает поворот (w и d меняются местами)', () => {
    const r = itemRect(item('a', 1, 1000));
    expect(r.x1 - r.x0).toBeCloseTo(600);
    expect(r.z1 - r.z0).toBeCloseTo(2000);
  });

  it('пересечение и касание', () => {
    const a = itemRect(item('a', 0, 0));
    const b = itemRect(item('b', 0, 1000)); // пересекается с a
    const c = itemRect(item('c', 0, 2000)); // ровно встык с a
    expect(rectsOverlap(a, b)).toBe(true);
    expect(rectsOverlap(a, c)).toBe(false);
  });
});

describe('layoutProblems', () => {
  const door: Opening = { kind: 'door', wall: 0, offset: 100, width: 800, height: 2100 };

  it('пустая комната — нет проблем', () => {
    expect(layoutProblems([], room, [door])).toEqual([]);
  });

  it('ловит выход за стены', () => {
    const bad: FurnitureItem = { id: 'x', type: 't', position: { x: 3900, z: 2000 }, rotation: 0, size, options: {} };
    expect(layoutProblems([bad], room, []).join()).toContain('за стены');
  });

  it('ловит пересечение мебели', () => {
    const a = item('a', 2, 0);
    const b = item('b', 2, 1000);
    expect(layoutProblems([a, b], room, []).join()).toContain('пересекается');
  });

  it('ловит блокировку двери', () => {
    const blocker = item('bl', 0, 0); // у стены 0, перекрывает зону двери
    expect(layoutProblems([blocker], room, [door]).join()).toContain('дверь');
  });

  it('потолочный предмет (options.ceilingMounted) не конфликтует с мебелью и дверью', () => {
    const base = item('run', 2, 0, { w: 2400, d: 600, h: 900 });
    const hood: FurnitureItem = {
      id: 'hood', type: 'hood', position: { ...base.position }, rotation: 0,
      size: { w: 400, d: 400, h: 2200 }, options: { ceilingMounted: true },
    };
    expect(layoutProblems([base, hood], room, [door])).toEqual([]);
    // но выход за стены по-прежнему ловится
    const outside: FurnitureItem = { ...hood, id: 'h2', position: { x: -500, z: 100 } };
    expect(layoutProblems([base, outside], room, [door]).join()).toContain('за стены');
  });
});
