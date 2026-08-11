import { describe, it, expect } from 'vitest';
import { generateKitchen, kitchenLightPoints, KITCHEN_LIGHT_GROUPS } from '../src/templates/kitchen';
import { layoutProblems } from '../src/core/layout';
import type { Opening } from '../src/core/model';

const door: Opening = { kind: 'door', wall: 0, offset: 100, width: 800, height: 2100 };
const window_: Opening = { kind: 'window', wall: 2, offset: 1000, width: 1500, height: 1400, sill: 900 };

function room(w: number, l: number) {
  return { type: 'kitchen' as const, width: w, length: l, height: 2700 };
}

describe('generateKitchen', () => {
  it('нормальная кухня: линия с холодильником, плитой и мойкой, раскладка валидна', () => {
    const r = room(4000, 5000);
    const items = generateKitchen(r, [door, window_]);
    expect(items.find((i) => i.type === 'fridge')).toBeTruthy();
    const run = items.find((i) => i.type === 'kitchenRun');
    expect(run).toBeTruthy();
    expect(typeof run!.options.cooktopCenter).toBe('number');
    expect(typeof run!.options.sinkCenter).toBe('number');
    expect(items.find((i) => i.type === 'hood')).toBeTruthy();
    expect(layoutProblems(items, r, [door, window_])).toEqual([]);
  });

  it('рабочая линия — на стене с окном', () => {
    const items = generateKitchen(room(4000, 5000), [door, window_]);
    expect(items.find((i) => i.type === 'kitchenRun')?.wall).toBe(2);
  });

  it('обеденная зона: стол и стулья в нормальной кухне', () => {
    const items = generateKitchen(room(4000, 5000), [door, window_]);
    expect(items.find((i) => i.type === 'roundTable')).toBeTruthy();
    expect(items.filter((i) => i.type === 'chair').length).toBeGreaterThanOrEqual(2);
  });

  it('сетка размеров: всегда валидна, линия есть от 2500', () => {
    for (let w = 2500; w <= 6000; w += 500) {
      for (let l = 2500; l <= 6000; l += 500) {
        const r = room(w, l);
        const items = generateKitchen(r, [door]);
        expect(layoutProblems(items, r, [door]), `${w}x${l}`).toEqual([]);
        expect(items.find((i) => i.type === 'kitchenRun'), `${w}x${l}: нет линии`).toBeTruthy();
      }
    }
  });

  it('крошечная кухня 2000×2000: валидна, не падает', () => {
    const r = room(2000, 2000);
    expect(layoutProblems(generateKitchen(r, [door]), r, [door])).toEqual([]);
  });

  it('группы света и точки', () => {
    expect(KITCHEN_LIGHT_GROUPS).toEqual(['ceiling', 'spots', 'pendants']);
    const r = room(4000, 5000);
    const items = generateKitchen(r, [door, window_]);
    const pts = kitchenLightPoints(r, items);
    expect(pts.some((p) => p.group === 'spots')).toBe(true);
    expect(pts.some((p) => p.group === 'pendants')).toBe(items.some((i) => i.type === 'roundTable'));
  });
});
