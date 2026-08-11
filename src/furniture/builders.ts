import * as THREE from 'three';
import type { FurnitureItem } from '../core/model';
import type { StyleDef } from '../core/styles';

const M = (mm: number) => mm / 1000;

export type Builder = (item: FurnitureItem, style: StyleDef) => THREE.Group;

// Создаёт box с geometry(w, h, d), центр в (0, h/2, 0), дно на y=0
function box(w: number, h: number, d: number, color: number): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color }),
  );
  m.position.y = h / 2;
  return m;
}

// Локальные координаты: центр предмета в origin, спина (к стене) — в −z
const buildBed: Builder = (item, style) => {
  const g = new THREE.Group();
  const w = M(item.size.w), d = M(item.size.d);
  const base = box(w, 0.3, d - 0.1, style.wood);
  base.position.z = 0.05;
  g.add(base);
  const mattress = box(w - 0.1, 0.2, d - 0.35, style.textile);
  mattress.position.y = 0.3 + 0.1;
  mattress.position.z = 0.1;
  g.add(mattress);
  const headboard = box(w, Math.min(1.0, M(item.size.h)), 0.08, style.textile);
  headboard.position.z = -d / 2 + 0.04;
  g.add(headboard);
  for (const sx of [-1, 1]) {
    const pillow = box(0.6, 0.12, 0.4, 0xffffff);
    pillow.position.set((sx * w) / 5, 0.56, -d / 2 + 0.35);
    g.add(pillow);
  }
  g.userData = { id: item.id, type: 'bed' };
  return g;
};

const buildNightstand: Builder = (item, style) => {
  const g = new THREE.Group();
  const w = M(item.size.w), d = M(item.size.d), h = M(item.size.h);
  const body = box(w, h, d, style.wood);
  g.add(body);
  const facade = box(w - 0.04, h - 0.1, 0.02, style.facade);
  facade.position.set(0, (h - 0.1) / 2, d / 2 - 0.01);
  g.add(facade);
  g.userData = { id: item.id, type: 'nightstand' };
  return g;
};

const buildWardrobe: Builder = (item, style) => {
  const g = new THREE.Group();
  const w = M(item.size.w), d = M(item.size.d), h = M(item.size.h);
  g.add(box(w, h, d, style.facade));
  // вертикальные швы фасада каждые ~600 мм
  const doors = Math.max(2, Math.round(item.size.w / 600));
  for (let i = 1; i < doors; i++) {
    const seam = box(0.008, h - 0.02, 0.008, style.accent);
    seam.position.set(-w / 2 + (w / doors) * i, (h - 0.02) / 2, d / 2 - 0.002);
    g.add(seam);
  }
  g.userData = { id: item.id, type: 'wardrobe' };
  return g;
};

const buildDesk: Builder = (item, style) => {
  const g = new THREE.Group();
  const w = M(item.size.w), d = M(item.size.d), h = M(item.size.h);
  const top = box(w, 0.04, d, style.wood);
  top.position.y = h - 0.02;
  g.add(top);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = box(0.05, h - 0.04, 0.05, style.accent);
    leg.position.set(sx * (w / 2 - 0.05), (h - 0.04) / 2, sz * (d / 2 - 0.05));
    g.add(leg);
  }
  g.userData = { id: item.id, type: 'desk' };
  return g;
};

export const FURNITURE_BUILDERS: Record<string, Builder> = {
  bed: buildBed,
  nightstand: buildNightstand,
  wardrobe: buildWardrobe,
  desk: buildDesk,
};
