import { describe, it, expect } from 'vitest';
import { generateKids, kidsLightPoints, KIDS_LIGHT_GROUPS } from '../src/templates/kids';
import { layoutProblems } from '../src/core/layout';
import type { Opening } from '../src/core/model';

const door: Opening = { kind: 'door', wall: 0, offset: 100, width: 800, height: 2100 };
const window_: Opening = { kind: 'window', wall: 2, offset: 1000, width: 1500, height: 1400, sill: 900 };

function room(w: number, l: number) {
  return { type: 'kids' as const, width: w, length: l, height: 2700 };
}

describe('generateKids', () => {
  it('нормальная детская: кровать, шкаф, стол у окна, стеллаж; валидна', () => {
    const r = room(3500, 4500);
    const items = generateKids(r, [door, window_]);
    expect(items.find((i) => i.type === 'kidBed')).toBeTruthy();
    expect(items.find((i) => i.type === 'wardrobe')).toBeTruthy();
    expect(items.find((i) => i.type === 'desk')?.wall).toBe(2);
    expect(items.find((i) => i.type === 'toyShelf')).toBeTruthy();
    expect(layoutProblems(items, r, [door, window_])).toEqual([]);
  });

  it('сетка размеров: всегда валидна, кровать есть от 2600', () => {
    for (let w = 2600; w <= 6000; w += 500) {
      for (let l = 2600; l <= 6000; l += 500) {
        const r = room(w, l);
        const items = generateKids(r, [door]);
        expect(layoutProblems(items, r, [door]), `${w}x${l}`).toEqual([]);
        expect(items.find((i) => i.type === 'kidBed'), `${w}x${l}: нет кровати`).toBeTruthy();
      }
    }
  });

  it('крошечная 2000×2000: валидна', () => {
    const r = room(2000, 2000);
    expect(layoutProblems(generateKids(r, [door]), r, [door])).toEqual([]);
  });

  it('группы света: гирлянда-точки над кроватью', () => {
    expect(KIDS_LIGHT_GROUPS).toEqual(['ceiling', 'accent']);
    const r = room(3500, 4500);
    const items = generateKids(r, [door]);
    const pts = kidsLightPoints(r, items);
    expect(pts.filter((p) => p.group === 'accent').length).toBeGreaterThanOrEqual(2);
  });
});
