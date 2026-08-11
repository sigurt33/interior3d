import * as THREE from 'three';
import type { FurnitureItem } from '../core/model';
import type { StyleDef } from '../core/styles';
import { M } from '../core/units';

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

const buildFridge: Builder = (item, style) => {
  const g = new THREE.Group();
  const w = M(item.size.w), d = M(item.size.d), h = M(item.size.h);
  const body = box(w, h, d - 0.02, style.facade); // корпус тоньше габарита — ручка и шов выступают над фасадом
  body.position.z = -0.01;
  g.add(body);
  const seam = box(0.008, h - 0.04, 0.008, style.accent); // шов двери
  seam.position.set(0, (h - 0.04) / 2, d / 2 - 0.018);
  g.add(seam);
  const handle = box(0.02, 0.35, 0.02, style.accent);
  handle.position.set(w / 4, h * 0.55, d / 2 - 0.01);
  g.add(handle);
  g.userData = { id: item.id, type: 'fridge' };
  return g;
};

// Нижняя линия кухни: корпус с фасадами + столешница.
// options.cooktopCenter / options.sinkCenter — мм от левого края линии (локальный x от -w/2)
const buildKitchenRun: Builder = (item, style) => {
  const g = new THREE.Group();
  const w = M(item.size.w), d = M(item.size.d), h = M(item.size.h);
  const body = box(w, h - 0.04, d - 0.02, style.facade);
  body.position.z = -0.01;
  g.add(body);
  const counter = box(w, 0.04, d, style.wood); // столешница
  counter.position.y = h - 0.02;
  g.add(counter);
  const doors = Math.max(1, Math.round(item.size.w / 600)); // швы фасадов
  for (let i = 1; i < doors; i++) {
    const seam = box(0.008, h - 0.1, 0.008, style.accent);
    seam.position.set(-w / 2 + (w / doors) * i, (h - 0.1) / 2, d / 2 - 0.004);
    g.add(seam);
  }
  const panelAt = (centerMm: number, name: string, pw: number, pd: number) => {
    const p = box(pw, 0.012, pd, style.accent);
    p.name = name;
    p.position.set(-w / 2 + M(centerMm), h + 0.006, 0);
    g.add(p);
  };
  const opts = item.options as { cooktopCenter?: number; sinkCenter?: number };
  if (typeof opts.cooktopCenter === 'number') panelAt(opts.cooktopCenter, 'cooktop', 0.56, 0.5);
  if (typeof opts.sinkCenter === 'number') panelAt(opts.sinkCenter, 'sink', 0.5, 0.4);
  g.userData = { id: item.id, type: 'kitchenRun' };
  return g;
};

// Вытяжка: чёрный цилиндр под потолком; item.size.h — полная высота предмета,
// труба занимает верхнюю часть (низ предмета «пустой» — bbox.min.y > 0, это ок)
const buildHood: Builder = (item, style) => {
  const g = new THREE.Group();
  const h = M(item.size.h);
  const tubeH = Math.min(0.7, h - 1.5);
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.17, tubeH, 24),
    new THREE.MeshStandardMaterial({ color: style.accent }),
  );
  tube.position.y = h - tubeH / 2;
  g.add(tube);
  g.userData = { id: item.id, type: 'hood' };
  return g;
};

const buildRoundTable: Builder = (item, style) => {
  const g = new THREE.Group();
  const r = Math.min(M(item.size.w), M(item.size.d)) / 2;
  const h = M(item.size.h);
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, 0.04, 32),
    new THREE.MeshStandardMaterial({ color: style.wood }),
  );
  top.position.y = h - 0.02;
  g.add(top);
  const leg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, h - 0.06, 12),
    new THREE.MeshStandardMaterial({ color: style.accent }),
  );
  leg.position.y = (h - 0.06) / 2;
  g.add(leg);
  const foot = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.45, r * 0.45, 0.02, 24),
    new THREE.MeshStandardMaterial({ color: style.accent }),
  );
  foot.position.y = 0.01;
  g.add(foot);
  g.userData = { id: item.id, type: 'roundTable' };
  return g;
};

const buildChair: Builder = (item, style) => {
  const g = new THREE.Group();
  const w = M(item.size.w), d = M(item.size.d), h = M(item.size.h);
  const seatH = 0.45;
  const seat = box(w - 0.05, 0.05, d - 0.05, style.wood);
  seat.position.y = seatH;
  g.add(seat);
  const back = box(w - 0.05, h - seatH - 0.05, 0.04, style.wood); // спинка к −z
  back.position.set(0, seatH + (h - seatH - 0.05) / 2 + 0.05, -d / 2 + 0.045);
  g.add(back);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = box(0.035, seatH, 0.035, style.accent);
    leg.position.set(sx * (w / 2 - 0.05), seatH / 2, sz * (d / 2 - 0.05));
    g.add(leg);
  }
  g.userData = { id: item.id, type: 'chair' };
  return g;
};

// Тумба с раковиной и зеркалом; item.size.h — полная высота с зеркалом
const buildVanity: Builder = (item, style) => {
  const g = new THREE.Group();
  const w = M(item.size.w), d = M(item.size.d);
  const cab = box(w, 0.5, d, style.facade); // навесная тумба
  cab.position.y = 0.35 + 0.25;
  g.add(cab);
  const basin = box(Math.min(0.55, w - 0.1), 0.12, d - 0.1, 0xffffff);
  basin.position.y = 0.85 + 0.06;
  g.add(basin);
  const tap = box(0.03, 0.2, 0.03, style.accent);
  tap.position.set(0, 0.97 + 0.1, -d / 2 + 0.06);
  g.add(tap);
  const mirrorH = Math.min(0.8, M(item.size.h) - 1.1);
  const mirror = box(w - 0.2, mirrorH, 0.02, 0xbfd4dd); // зеркало на стене
  mirror.position.set(0, 1.1 + mirrorH / 2, -d / 2 + 0.01);
  g.add(mirror);
  g.userData = { id: item.id, type: 'vanity' };
  return g;
};

const buildBathtub: Builder = (item, style) => {
  const g = new THREE.Group();
  const w = M(item.size.w), d = M(item.size.d), h = M(item.size.h);
  g.add(box(w, h, d - 0.02, 0xffffff)); // корпус чуть тоньше — экран выступает
  const inner = box(w - 0.14, 0.04, d - 0.16, 0xe8f0f2); // «вода/дно»
  inner.position.y = h - 0.06;
  g.add(inner);
  const apron = box(w, h - 0.02, 0.015, style.floor); // экран из плитки спереди
  apron.position.set(0, (h - 0.02) / 2, d / 2 - 0.008);
  g.add(apron);
  g.userData = { id: item.id, type: 'bathtub' };
  return g;
};

const buildShower: Builder = (item, style) => {
  const g = new THREE.Group();
  const w = M(item.size.w), d = M(item.size.d), h = M(item.size.h);
  const tray = box(w, 0.06, d, 0xffffff);
  g.add(tray);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xcfe8ee, transparent: true, opacity: 0.25,
  });
  const front = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, h - 0.1, 0.01), glassMat);
  front.position.set(0, (h - 0.1) / 2 + 0.06, d / 2 - 0.01);
  g.add(front);
  const side = new THREE.Mesh(new THREE.BoxGeometry(0.01, h - 0.1, d - 0.02), glassMat);
  side.position.set(w / 2 - 0.01, (h - 0.1) / 2 + 0.06, 0);
  g.add(side);
  for (const [px, pz] of [[-w / 2 + 0.02, d / 2 - 0.01], [w / 2 - 0.01, -d / 2 + 0.02]] as const) {
    const profile = box(0.02, h - 0.08, 0.02, style.accent); // чёрный профиль
    profile.position.set(px, (h - 0.08) / 2 + 0.06, pz);
    g.add(profile);
  }
  g.userData = { id: item.id, type: 'shower' };
  return g;
};

const buildToilet: Builder = (item, _style) => {
  const g = new THREE.Group();
  const w = M(item.size.w), d = M(item.size.d);
  const tank = box(w, 0.35, 0.16, 0xffffff); // бачок у стены (−z)
  tank.position.set(0, 0.45 + 0.175, -d / 2 + 0.08);
  g.add(tank);
  const bowl = box(w - 0.03, 0.4, d - 0.2, 0xffffff);
  bowl.position.set(0, 0.2, 0.06);
  g.add(bowl);
  g.userData = { id: item.id, type: 'toilet' };
  return g;
};

export const FURNITURE_BUILDERS: Record<string, Builder> = {
  bed: buildBed,
  nightstand: buildNightstand,
  wardrobe: buildWardrobe,
  desk: buildDesk,
  fridge: buildFridge,
  kitchenRun: buildKitchenRun,
  hood: buildHood,
  roundTable: buildRoundTable,
  chair: buildChair,
  vanity: buildVanity,
  bathtub: buildBathtub,
  shower: buildShower,
  toilet: buildToilet,
};
