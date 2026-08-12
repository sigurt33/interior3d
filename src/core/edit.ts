import type { RoomProject } from './model';
import { layoutProblems } from './layout';
import { TEMPLATES } from '../templates/index';

// Операции редактирования мебели. Мутируют project только при валидном результате.

// Сдвиг предмета на (dx, dz) мм; false — если сдвиг ломает раскладку
// привязанные предметы (attachedTo) двигаются вместе с хозяином, как и удаляются
export function nudgeItem(project: RoomProject, id: string, dx: number, dz: number): boolean {
  const item = project.furniture.find((f) => f.id === id);
  if (!item) return false;
  const group = project.furniture.filter((f) => f.id === id || f.options.attachedTo === id);
  const rest = project.furniture.filter((f) => !group.includes(f));
  const moved = group.map((f) => ({
    ...f,
    position: { x: f.position.x + dx, z: f.position.z + dz },
  }));
  if (layoutProblems([...rest, ...moved], project.room, project.openings).length > 0) return false;
  group.forEach((f, i) => { f.position = moved[i].position; });
  return true;
}

// привязанные предметы (options.attachedTo) удаляются вместе с хозяином — вытяжка с линией
export function removeItem(project: RoomProject, id: string): boolean {
  const before = project.furniture.length;
  project.furniture = project.furniture.filter(
    (f) => f.id !== id && f.options.attachedTo !== id,
  );
  return project.furniture.length < before;
}

// Полная регенерация расстановки шаблоном комнаты
export function resetFurniture(project: RoomProject): boolean {
  const tpl = TEMPLATES[project.room.type];
  if (!tpl) return false;
  project.furniture = tpl.generate(project.room, project.openings);
  return true;
}
