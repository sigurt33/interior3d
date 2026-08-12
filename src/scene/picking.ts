import * as THREE from 'three';

// Поиск предмета мебели по лучу из камеры. ndcX/ndcY — координаты клика в NDC (-1..1).
export function pickFurnitureAt(
  ndcX: number, ndcY: number,
  camera: THREE.Camera, scene: THREE.Scene,
): string | null {
  // Без рендер-цикла matrixWorld объектов может быть не обновлён (напр. в тестах
  // или до первого кадра) — гарантируем актуальные мировые матрицы перед лучом.
  scene.updateMatrixWorld(true);
  const rc = new THREE.Raycaster();
  rc.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  for (const hit of rc.intersectObjects(scene.children, true)) {
    let o: THREE.Object3D | null = hit.object;
    while (o) {
      if (o.name.startsWith('furniture-')) return o.name.slice('furniture-'.length);
      o = o.parent;
    }
  }
  return null;
}

const HIGHLIGHT = 0x554411;

// Подсветка выбранного предмета emissive-каналом; null — снять со всех
export function setHighlight(scene: THREE.Scene, id: string | null): void {
  scene.traverse((obj) => {
    if (!obj.name.startsWith('furniture-')) return;
    const on = id !== null && obj.name === `furniture-${id}`;
    obj.traverse((child) => {
      const m = (child as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m?.emissive) m.emissive.setHex(on ? HIGHLIGHT : 0x000000);
    });
  });
}
