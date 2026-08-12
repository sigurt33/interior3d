import type { RoomProject } from './model';
import { layoutProblems } from './layout';
import { TEMPLATES } from '../templates/index';

// Операции редактирования мебели. Мутируют project только при валидном результате.

// Сдвиг предмета на (dx, dz) мм; false — если сдвиг ломает раскладку
export function nudgeItem(project: RoomProject, id: string, dx: number, dz: number): boolean {
  const item = project.furniture.find((f) => f.id === id);
  if (!item) return false;
  const moved = { ...item, position: { x: item.position.x + dx, z: item.position.z + dz } };
  const rest = project.furniture.filter((f) => f.id !== id);
  if (layoutProblems([...rest, moved], project.room, project.openings).length > 0) return false;
  item.position = moved.position;
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
