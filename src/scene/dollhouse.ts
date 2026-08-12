// «Кукольный домик»: стена скрывается, когда камера находится с её внешней стороны —
// обзор снаружи показывает интерьер, как в проекте-предшественнике kuhnya-3d.
// Стены: 0 — z=0, 1 — x=W, 2 — z=L, 3 — x=0 (метры).

export function wallVisibleFor(
  wallIndex: number,
  cam: { x: number; y: number; z: number },
  W: number, L: number,
): boolean {
  switch (wallIndex) {
    case 0: return cam.z >= 0;
    case 1: return cam.x <= W;
    case 2: return cam.z <= L;
    case 3: return cam.x >= 0;
    default: return true;
  }
}
