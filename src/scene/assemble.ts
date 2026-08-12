import * as THREE from 'three';
import type { LightingState, RoomProject } from '../core/model';
import { getStyle } from '../core/styles';
import { buildRoomShell } from './shell';
import { FURNITURE_BUILDERS } from '../furniture/builders';
import { kelvinToRGB, sunState } from '../lighting/engine';
import { M } from '../core/units';
import { TEMPLATES } from '../templates/index';

const GROUP_BASE_INTENSITY = 25; // базовая мощность PointLight (physical units)

export interface AssembledScene {
  scene: THREE.Scene;
  sun: THREE.DirectionalLight;
  ambient: THREE.HemisphereLight;
  groupLights: Map<string, THREE.PointLight[]>;
  roomSize: { W: number; L: number; H: number }; // метры
}

export function assembleScene(project: RoomProject): AssembledScene {
  const style = getStyle(project.style.palette);
  const { width, length, height } = project.room;
  const W = M(width), L = M(length), H = M(height);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202025);
  scene.add(buildRoomShell(project, style));

  for (const item of project.furniture) {
    const builder = FURNITURE_BUILDERS[item.type];
    if (!builder) continue;
    const g = builder(item, style);
    g.name = `furniture-${item.id}`;
    g.position.set(M(item.position.x), 0, M(item.position.z));
    g.rotation.y = item.rotation;
    scene.add(g);
  }

  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.position.set(5, 10, 5);
  sun.target.position.set(W / 2, 0, L / 2);
  scene.add(sun, sun.target);

  const ambient = new THREE.HemisphereLight(0xdde4ff, 0x555044, 0.35);
  scene.add(ambient);

  const groupLights = new Map<string, THREE.PointLight[]>();
  const addLight = (gid: string, x: number, y: number, z: number) => {
    const l = new THREE.PointLight(0xffffff, 0, 12, 2);
    l.position.set(x, y, z);
    scene.add(l);
    const arr = groupLights.get(gid) ?? [];
    arr.push(l);
    groupLights.set(gid, arr);
  };

  const wantGroups = new Set(project.lighting.groups.map((g) => g.id));
  if (wantGroups.has('ceiling')) {
    // сетка потолочных точек: 1 на ~6 м², минимум 1
    const count = Math.max(1, Math.round((W * L) / 6));
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++)
        addLight('ceiling', (W * (i + 0.5)) / cols, H - 0.15, (L * (j + 0.5)) / rows);
  }
  const tpl = TEMPLATES[project.room.type];
  if (tpl)
    for (const p of tpl.lightPoints(project.room, project.furniture))
      if (wantGroups.has(p.group)) addLight(p.group, M(p.x), M(p.y), M(p.z));

  const assembled: AssembledScene = { scene, sun, ambient, groupLights, roomSize: { W, L, H } };
  applyLightingToScene(assembled, project.lighting);
  return assembled;
}

export function applyLightingToScene(a: AssembledScene, s: LightingState): void {
  const st = sunState(s.sunTime);
  a.sun.intensity = st.intensity * 3;
  a.sun.color.setRGB(st.color.r, st.color.g, st.color.b);
  a.sun.position.set(
    a.roomSize.W / 2 + st.position.x,
    st.position.y,
    a.roomSize.L / 2 + st.position.z,
  );
  a.ambient.intensity = 0.1 + st.intensity * 0.3;

  const lampColor = kelvinToRGB(s.colorTemp);
  for (const g of s.groups) {
    const lights = a.groupLights.get(g.id) ?? [];
    for (const l of lights) {
      l.intensity = g.on ? g.brightness * GROUP_BASE_INTENSITY : 0;
      l.color.setRGB(lampColor.r, lampColor.g, lampColor.b);
    }
  }
}

// Освобождение GPU-ресурсов перед пересборкой сцены (редактирование мебели)
export function disposeAssembled(a: AssembledScene): void {
  a.scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else if (mat) mat.dispose();
  });
  a.scene.clear();
  a.groupLights.clear();
}
