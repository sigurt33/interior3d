import { describe, it, expect } from 'vitest';
import { kelvinToRGB, sunState, LIGHT_PRESETS, applyPreset } from '../src/lighting/engine';
import type { LightingState } from '../src/core/model';

describe('kelvinToRGB', () => {
  it('6500K — почти белый', () => {
    const c = kelvinToRGB(6500);
    expect(c.r).toBeGreaterThan(0.9);
    expect(c.g).toBeGreaterThan(0.9);
    expect(c.b).toBeGreaterThan(0.9);
  });

  it('2700K — тёплый: r > g > b', () => {
    const c = kelvinToRGB(2700);
    expect(c.r).toBeGreaterThan(c.g);
    expect(c.g).toBeGreaterThan(c.b);
  });
});

describe('sunState', () => {
  it('полдень: ярко и почти белый свет', () => {
    const s = sunState(13.5);
    expect(s.intensity).toBeGreaterThan(0.8);
    expect(s.color.b).toBeGreaterThan(0.7);
  });

  it('ночь: слабый холодный свет', () => {
    const s = sunState(3);
    expect(s.intensity).toBeLessThan(0.15);
    expect(s.color.b).toBeGreaterThan(s.color.r);
  });

  it('утро: тёплый свет, солнце низко', () => {
    const s = sunState(7);
    expect(s.color.r).toBeGreaterThan(s.color.b);
    expect(s.position.y).toBeLessThan(6);
  });
});

describe('presets', () => {
  it('есть 4 пресета', () => {
    expect(Object.keys(LIGHT_PRESETS)).toEqual(['day', 'evening-cozy', 'night-accent', 'work']);
  });

  it('applyPreset выставляет параметры и имя пресета', () => {
    const state: LightingState = {
      preset: null, sunTime: 13, colorTemp: 4000,
      groups: [
        { id: 'ceiling', on: false, brightness: 1 },
        { id: 'accent', on: false, brightness: 1 },
      ],
    };
    const next = applyPreset(state, 'evening-cozy');
    expect(next.preset).toBe('evening-cozy');
    expect(next.sunTime).toBe(20);
    expect(next.colorTemp).toBe(2700);
    expect(next.groups.find((g) => g.id === 'ceiling')?.on).toBe(true);
    // исходный state не мутирован
    expect(state.preset).toBeNull();
  });
});
