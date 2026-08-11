import { describe, it, expect } from 'vitest';
import { generateBedroom, BEDROOM_LIGHT_GROUPS, bedroomLightPoints } from '../src/templates/bedroom';
import { layoutProblems } from '../src/core/layout';
import type { Opening } from '../src/core/model';

const door: Opening = { kind: 'door', wall: 0, offset: 100, width: 800, height: 2100 };
const window_: Opening = { kind: 'window', wall: 2, offset: 1000, width: 1500, height: 1400, sill: 900 };

function room(w: number, l: number) {
  return { type: 'bedroom' as const, width: w, length: l, height: 2700 };
}

describe('generateBedroom', () => {
  it('нормальная комната: есть кровать, раскладка валидна', () => {
    const r = room(4000, 5000);
    const items = generateBedroom(r, [door, window_]);
    expect(items.find((i) => i.type === 'bed')).toBeTruthy();
    expect(items.find((i) => i.type === 'wardrobe')).toBeTruthy();
    expect(layoutProblems(items, r, [door, window_])).toEqual([]);
  });

  it('стол появляется под окном', () => {
    const items = generateBedroom(room(4000, 5000), [door, window_]);
    const desk = items.find((i) => i.type === 'desk');
    expect(desk?.wall).toBe(2);
  });

  it('сетка размеров: раскладка всегда валидна, кровать есть от 3×3 м', () => {
    for (let w = 3000; w <= 6000; w += 500) {
      for (let l = 3000; l <= 6000; l += 500) {
        const r = room(w, l);
        const items = generateBedroom(r, [door]);
        expect(layoutProblems(items, r, [door]), `${w}x${l}`).toEqual([]);
        expect(items.find((i) => i.type === 'bed'), `${w}x${l}: нет кровати`).toBeTruthy();
      }
    }
  });

  it('квадратные комнаты от 2600: кровать всегда есть', () => {
    for (let s = 2600; s <= 3000; s += 100) {
      const r = room(s, s);
      const items = generateBedroom(r, [door]);
      expect(layoutProblems(items, r, [door]), `${s}x${s}`).toEqual([]);
      expect(items.find((i) => i.type === 'bed'), `${s}x${s}: нет кровати`).toBeTruthy();
    }
  });

  it('крошечная комната: не падает и не даёт невалидной раскладки', () => {
    const r = room(2000, 2000);
    const items = generateBedroom(r, [door]);
    expect(layoutProblems(items, r, [door])).toEqual([]);
  });

  it('группы света шаблона', () => {
    expect(BEDROOM_LIGHT_GROUPS).toEqual(['ceiling', 'pendants', 'accent']);
  });

  it('bedroomLightPoints: подвесы над тумбочками, подсветка у кровати', () => {
    const r = room(4000, 5000);
    const items = generateBedroom(r, [door, window_]);
    const pts = bedroomLightPoints(r, items);
    const stands = items.filter((i) => i.type === 'nightstand');
    expect(pts.filter((p) => p.group === 'pendants')).toHaveLength(stands.length);
    const accent = pts.filter((p) => p.group === 'accent');
    expect(accent).toHaveLength(1);
    expect(accent[0].y).toBe(150);
  });
});
