import * as THREE from 'three';
import type { Opening, RoomProject } from '../core/model';
import type { StyleDef } from '../core/styles';

const M = (mm: number) => mm / 1000;
const WALL_T = 0.1; // м

// Стена в локальных координатах: вдоль X от 0 до lenM (м), Y вверх, толщина по Z
// lenM/hM — метры; openings (offset/width/height/sill) — мм, конвертируются внутри
export function buildWallWithOpenings(
  lenM: number, hM: number, openings: Opening[], mat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();
  const addSeg = (x0: number, x1: number, y0: number, y1: number) => {
    if (x1 - x0 <= 0.001 || y1 - y0 <= 0.001) return;
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, WALL_T), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, -WALL_T / 2);
    g.add(m);
  };
  const sorted = [...openings].sort((a, b) => a.offset - b.offset);
  let cursor = 0;
  for (const op of sorted) {
    const x0 = M(op.offset);
    const x1 = M(op.offset + op.width);
    addSeg(cursor, x0, 0, hM); // простенок до проёма
    // arch — как дверь, проём от пола без подоконника
    const yBottom = op.kind === 'window' ? M(op.sill ?? 900) : 0;
    const yTop = yBottom + M(op.height);
    addSeg(x0, x1, yTop, hM);          // перемычка над проёмом
    if (yBottom > 0) addSeg(x0, x1, 0, yBottom); // подоконная часть
    cursor = x1;
  }
  addSeg(cursor, lenM, 0, hM);
  return g;
}

export function buildRoomShell(project: RoomProject, style: StyleDef): THREE.Group {
  const { width, length, height } = project.room;
  const W = M(width), L = M(length), H = M(height);
  const shell = new THREE.Group();
  shell.name = 'shell';

  const wallMat = new THREE.MeshStandardMaterial({ color: style.wall, side: THREE.DoubleSide });
  const floorMat = new THREE.MeshStandardMaterial({ color: style.floor });
  const ceilMat = new THREE.MeshStandardMaterial({ color: style.ceiling });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.05, L), floorMat);
  floor.name = 'floor';
  floor.position.set(W / 2, -0.025, L / 2);
  shell.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, L), ceilMat);
  ceiling.name = 'ceiling';
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(W / 2, H, L / 2);
  shell.add(ceiling);

  // Стены: 0 — z=0, 1 — x=W, 2 — z=L, 3 — x=0 (обход по часовой сверху)
  const wallDefs: { len: number; pos: [number, number, number]; rotY: number }[] = [
    { len: W, pos: [0, 0, 0], rotY: 0 },
    { len: L, pos: [W, 0, 0], rotY: -Math.PI / 2 },
    { len: W, pos: [W, 0, L], rotY: Math.PI },
    { len: L, pos: [0, 0, L], rotY: Math.PI / 2 },
  ];
  wallDefs.forEach((def, i) => {
    const ops = project.openings.filter((o) => o.wall === i);
    const wall = buildWallWithOpenings(def.len, H, ops, wallMat);
    wall.name = `wall-${i}`;
    wall.position.set(...def.pos);
    wall.rotation.y = def.rotY;
    shell.add(wall);
  });
  return shell;
}
