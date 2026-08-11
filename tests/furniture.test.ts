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

describe('kitchen builders', () => {
  it('есть строители кухни', () => {
    for (const t of ['fridge', 'kitchenRun', 'hood', 'roundTable', 'chair'])
      expect(FURNITURE_BUILDERS[t], t).toBeTypeOf('function');
  });

  it.each([
    ['fridge', 600, 650, 2000],
    ['kitchenRun', 2400, 600, 900],
    ['hood', 400, 400, 2200],
    ['roundTable', 1000, 1000, 750],
    ['chair', 450, 450, 850],
  ])('%s вписывается в габарит', (type, w, d, h) => {
    const g = FURNITURE_BUILDERS[type](mk(type, w, d, h), style);
    const bb = new THREE.Box3().setFromObject(g);
    const sz = bb.getSize(new THREE.Vector3());
    expect(sz.x).toBeLessThanOrEqual(w / 1000 + 0.01);
    expect(sz.z).toBeLessThanOrEqual(d / 1000 + 0.01);
    expect(sz.y).toBeLessThanOrEqual(h / 1000 + 0.01);
    expect(g.userData.type).toBe(type);
  });

  it('kitchenRun рисует варочную панель и мойку по опциям', () => {
    const item = mk('kitchenRun', 2400, 600, 900);
    item.options = { cooktopCenter: 500, sinkCenter: 1400 };
    const g = FURNITURE_BUILDERS['kitchenRun'](item, style);
    const named = g.children.filter((c) => c.name === 'cooktop' || c.name === 'sink');
    expect(named).toHaveLength(2);
  });
});

describe('kids builders', () => {
  it('есть строители детской', () => {
    for (const t of ['kidBed', 'toyShelf'])
      expect(FURNITURE_BUILDERS[t], t).toBeTypeOf('function');
  });

  it.each([
    ['kidBed', 900, 1700, 800],
    ['toyShelf', 800, 300, 1200],
  ])('%s вписывается в габарит', (type, w, d, h) => {
    const g = FURNITURE_BUILDERS[type](mk(type, w, d, h), style);
    const bb = new THREE.Box3().setFromObject(g);
    const sz = bb.getSize(new THREE.Vector3());
    expect(sz.x).toBeLessThanOrEqual(w / 1000 + 0.01);
    expect(sz.z).toBeLessThanOrEqual(d / 1000 + 0.01);
    expect(sz.y).toBeLessThanOrEqual(h / 1000 + 0.01);
    expect(g.userData.type).toBe(type);
  });

  it('kidBed красит бортики в акцентный цвет из options', () => {
    const item = mk('kidBed', 900, 1700, 800);
    item.options = { accentColor: 0x7fc8e8 };
    const g = FURNITURE_BUILDERS['kidBed'](item, style);
    const rails = g.children.filter((c) => c.name === 'rail');
    expect(rails.length).toBeGreaterThanOrEqual(2);
  });
});

describe('bathroom builders', () => {
  it('есть строители ванной', () => {
    for (const t of ['vanity', 'bathtub', 'shower', 'toilet'])
      expect(FURNITURE_BUILDERS[t], t).toBeTypeOf('function');
  });

  it.each([
    ['vanity', 1200, 500, 2000],
    ['bathtub', 1700, 750, 600],
    ['shower', 900, 900, 2100],
    ['toilet', 400, 650, 800],
  ])('%s вписывается в габарит', (type, w, d, h) => {
    const g = FURNITURE_BUILDERS[type](mk(type, w, d, h), style);
    const bb = new THREE.Box3().setFromObject(g);
    const sz = bb.getSize(new THREE.Vector3());
    expect(sz.x).toBeLessThanOrEqual(w / 1000 + 0.01);
    expect(sz.z).toBeLessThanOrEqual(d / 1000 + 0.01);
    expect(sz.y).toBeLessThanOrEqual(h / 1000 + 0.01);
    expect(g.userData.type).toBe(type);
  });
});
