import { ROOM_TYPES, type RoomProject } from './model';

export type ValidationResult =
  | { ok: true; project: RoomProject }
  | { ok: false; errors: string[] };

const isNum = (v: unknown, min: number, max: number): boolean =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

export function validateProject(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'object') return { ok: false, errors: ['проект — не объект'] };
  const p = raw as any;
  const errors: string[] = [];

  if (p.meta?.version !== 1) errors.push('meta.version должен быть 1');
  if (typeof p.meta?.name !== 'string') errors.push('meta.name отсутствует');

  const room = p.room;
  if (!room || !ROOM_TYPES.includes(room.type)) errors.push('room.type неизвестен');
  if (!isNum(room?.width, 1500, 30000)) errors.push('room.width вне 1500..30000');
  if (!isNum(room?.length, 1500, 30000)) errors.push('room.length вне 1500..30000');
  if (!isNum(room?.height, 2000, 5000)) errors.push('room.height вне 2000..5000');

  if (!Array.isArray(p.openings)) errors.push('openings — не массив');
  else p.openings.forEach((o: any, i: number) => {
    if (!['door', 'window', 'arch'].includes(o?.kind)) errors.push(`openings[${i}].kind неизвестен`);
    if (![0, 1, 2, 3].includes(o?.wall)) errors.push(`openings[${i}].wall вне 0..3`);
    if (!isNum(o?.offset, 0, 30000)) errors.push(`openings[${i}].offset невалиден`);
    if (!isNum(o?.width, 300, 10000)) errors.push(`openings[${i}].width невалиден`);
    if (!isNum(o?.height, 300, 5000)) errors.push(`openings[${i}].height невалиден`);
  });

  if (!Array.isArray(p.furniture)) errors.push('furniture — не массив');
  else p.furniture.forEach((f: any, i: number) => {
    if (typeof f?.id !== 'string' || typeof f?.type !== 'string') errors.push(`furniture[${i}]: нет id/type`);
    if (!isNum(f?.position?.x, -1000, 31000) || !isNum(f?.position?.z, -1000, 31000)) errors.push(`furniture[${i}].position невалиден`);
    if (!isNum(f?.size?.w, 50, 10000) || !isNum(f?.size?.d, 50, 10000) || !isNum(f?.size?.h, 50, 5000)) errors.push(`furniture[${i}].size невалиден`);
  });

  const l = p.lighting;
  if (!l || !isNum(l.sunTime, 0, 24) || !isNum(l.colorTemp, 2000, 8000) || !Array.isArray(l.groups))
    errors.push('lighting невалиден');

  if (typeof p.style?.palette !== 'string') errors.push('style.palette отсутствует');

  return errors.length ? { ok: false, errors } : { ok: true, project: raw as RoomProject };
}
