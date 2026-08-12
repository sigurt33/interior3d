import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { pickFurnitureAt, setHighlight } from '../src/scene/picking';
import { assembleScene } from '../src/scene/assemble';
import { defaultProject } from '../src/core/model';
import { generateBedroom, BEDROOM_LIGHT_GROUPS } from '../src/templates/bedroom';
import { M } from '../src/core/units';

function makeAssembled() {
  const p = defaultProject('bedroom', 4000, 5000);
  p.openings.push({ kind: 'door', wall: 0, offset: 100, width: 800, height: 2100 });
  p.furniture = generateBedroom(p.room, p.openings);
  p.lighting.groups = BEDROOM_LIGHT_GROUPS.map((id) => ({ id, on: true, brightness: 0.8 }));
  return { p, a: assembleScene(p) };
}

describe('picking', () => {
  it('луч в кровать возвращает её id', () => {
    const { p, a } = makeAssembled();
    const bed = p.furniture.find((f) => f.type === 'bed')!;
    const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 100);
    camera.position.set(M(bed.position.x), 2.2, M(bed.position.z) - 1.5);
    camera.lookAt(M(bed.position.x), 0.3, M(bed.position.z));
    camera.updateMatrixWorld();
    expect(pickFurnitureAt(0, 0, camera, a.scene)).toBe(bed.id);
  });

  it('луч в потолок/пустоту — null', () => {
    const { a } = makeAssembled();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 100);
    camera.position.set(2, 1.5, 2.5);
    camera.lookAt(2, 10, 2.5); // вертикально вверх, мимо мебели
    camera.updateMatrixWorld();
    expect(pickFurnitureAt(0, 0, camera, a.scene)).toBeNull();
  });

  it('setHighlight включает и снимает подсветку', () => {
    const { p, a } = makeAssembled();
    const bed = p.furniture.find((f) => f.type === 'bed')!;
    setHighlight(a.scene, bed.id);
    const group = a.scene.getObjectByName(`furniture-${bed.id}`)!;
    let highlighted = 0;
    group.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m?.emissive && m.emissive.getHex() !== 0x000000) highlighted++;
    });
    expect(highlighted).toBeGreaterThan(0);
    setHighlight(a.scene, null);
    let still = 0;
    group.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m?.emissive && m.emissive.getHex() !== 0x000000) still++;
    });
    expect(still).toBe(0);
  });
});
