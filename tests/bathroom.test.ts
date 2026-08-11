import { describe, it, expect } from 'vitest';
import { generateBathroom, bathroomLightPoints, BATHROOM_LIGHT_GROUPS } from '../src/templates/bathroom';
import { layoutProblems } from '../src/core/layout';
import type { Opening } from '../src/core/model';

const door: Opening = { kind: 'door', wall: 0, offset: 100, width: 800, height: 2100 };

function room(w: number, l: number) {
  return { type: 'bathroom' as const, width: w, length: l, height: 2700 };
}

describe('generateBathroom', () => {
  it('нормальная ванная: тумба и ванна или душ, раскладка валидна', () => {
    const r = room(2500, 3000);
    const items = generateBathroom(r, [door]);
    expect(items.find((i) => i.type === 'vanity')).toBeTruthy();
    expect(items.some((i) => i.type === 'bathtub' || i.type === 'shower')).toBe(true);
    expect(layoutProblems(items, r, [door])).toEqual([]);
  });

  it('просторная ванная получает ванну, тесная — душ', () => {
    const big = generateBathroom(room(3000, 3500), [door]);
    expect(big.find((i) => i.type === 'bathtub')).toBeTruthy();
    const small = generateBathroom(room(1700, 2000), [door]);
    expect(layoutProblems(small, room(1700, 2000), [door])).toEqual([]);
  });

  it('сетка размеров: всегда валидна, тумба есть от 1700×2000', () => {
    for (let w = 1700; w <= 4000; w += 300) {
      for (let l = 2000; l <= 4000; l += 400) {
        const r = room(w, l);
        const items = generateBathroom(r, [door]);
        expect(layoutProblems(items, r, [door]), `${w}x${l}`).toEqual([]);
        expect(items.find((i) => i.type === 'vanity'), `${w}x${l}: нет тумбы`).toBeTruthy();
      }
    }
  });

  it('группы света и точка зеркала', () => {
    expect(BATHROOM_LIGHT_GROUPS).toEqual(['ceiling', 'mirror']);
    const r = room(2500, 3000);
    const items = generateBathroom(r, [door]);
    const pts = bathroomLightPoints(r, items);
    expect(pts.some((p) => p.group === 'mirror')).toBe(true);
  });
});
