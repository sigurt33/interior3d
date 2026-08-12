import { describe, it, expect } from 'vitest';
import { assembleScene, applyLightingToScene, disposeAssembled } from '../src/scene/assemble';
import { defaultProject } from '../src/core/model';
import { generateBedroom, BEDROOM_LIGHT_GROUPS } from '../src/templates/bedroom';

function makeProject() {
  const p = defaultProject('bedroom', 4000, 5000);
  p.openings.push({ kind: 'door', wall: 0, offset: 100, width: 800, height: 2100 });
  p.furniture = generateBedroom(p.room, p.openings);
  p.lighting.groups = BEDROOM_LIGHT_GROUPS.map((id) => ({ id, on: true, brightness: 0.8 }));
  return p;
}

describe('assembleScene', () => {
  it('сцена содержит оболочку, мебель и свет', () => {
    const a = assembleScene(makeProject());
    expect(a.scene.getObjectByName('shell')).toBeTruthy();
    expect(a.scene.getObjectByName('furniture-bed')).toBeTruthy();
    expect(a.sun).toBeTruthy();
    for (const gid of BEDROOM_LIGHT_GROUPS)
      expect(a.groupLights.get(gid)?.length, gid).toBeGreaterThan(0);
  });

  it('applyLightingToScene: выключенная группа гаснет', () => {
    const p = makeProject();
    const a = assembleScene(p);
    const off = { ...p.lighting, groups: p.lighting.groups.map((g) => ({ ...g, on: false })) };
    applyLightingToScene(a, off);
    for (const lights of a.groupLights.values())
      for (const l of lights) expect(l.intensity).toBe(0);
  });

  it('applyLightingToScene: ночь тусклее полдня', () => {
    const p = makeProject();
    const a = assembleScene(p);
    applyLightingToScene(a, { ...p.lighting, sunTime: 13 });
    const day = a.sun.intensity;
    applyLightingToScene(a, { ...p.lighting, sunTime: 3 });
    expect(a.sun.intensity).toBeLessThan(day);
  });

  it('disposeAssembled очищает сцену и освобождает геометрии', () => {
    const a = assembleScene(makeProject());
    let disposed = 0;
    a.scene.traverse((o) => {
      const m = o as { geometry?: { addEventListener: (t: string, f: () => void) => void } };
      if (m.geometry) m.geometry.addEventListener('dispose', () => disposed++);
    });
    disposeAssembled(a);
    expect(a.scene.children).toHaveLength(0);
    expect(disposed).toBeGreaterThan(0);
  });
});
