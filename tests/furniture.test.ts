import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { FURNITURE_BUILDERS } from '../src/furniture/builders';
import { getStyle } from '../src/core/styles';
import type { FurnitureItem } from '../src/core/model';

const style = getStyle('beige-minimal');

function mk(type: string, w: number, d: number, h: number): FurnitureItem {
  return { id: 't', type, position: { x: 0, z: 0 }, rotation: 0, size: { w, d, h }, options: {} };
}

describe('furniture builders', () => {
  it('есть строители для мебели спальни', () => {
    for (const t of ['bed', 'nightstand', 'wardrobe', 'desk'])
      expect(FURNITURE_BUILDERS[t], t).toBeTypeOf('function');
  });

  it.each([
    ['bed', 1800, 2100, 1000],
    ['nightstand', 450, 450, 500],
    ['wardrobe', 2400, 600, 2200],
    ['desk', 1200, 600, 750],
  ])('%s вписывается в заданный габарит', (type, w, d, h) => {
    const g = FURNITURE_BUILDERS[type](mk(type, w, d, h), style);
    const bb = new THREE.Box3().setFromObject(g);
    const sz = bb.getSize(new THREE.Vector3());
    expect(sz.x).toBeLessThanOrEqual(w / 1000 + 0.01);
    expect(sz.z).toBeLessThanOrEqual(d / 1000 + 0.01);
    expect(sz.y).toBeLessThanOrEqual(h / 1000 + 0.01);
    expect(sz.x).toBeGreaterThan(0.05);
    expect(g.userData.type).toBe(type);
  });
});
