import { describe, it, expect } from 'vitest';
import { nudgeItem, removeItem, resetFurniture } from '../src/core/edit';
import { defaultProject } from '../src/core/model';
import { generateBedroom } from '../src/templates/bedroom';
import { TEMPLATES } from '../src/templates/index';
import { layoutProblems } from '../src/core/layout';

function makeProject() {
  const p = defaultProject('bedroom', 4000, 5000);
  p.openings.push({ kind: 'door', wall: 0, offset: 100, width: 800, height: 2100 });
  p.furniture = generateBedroom(p.room, p.openings);
  return p;
}

describe('edit operations', () => {
  it('nudgeItem сдвигает предмет, раскладка остаётся валидной', () => {
    const p = makeProject();
    const bed = p.furniture.find((f) => f.id === 'bed')!;
    const x0 = bed.position.x;
    expect(nudgeItem(p, 'bed', -100, 0)).toBe(true);
    expect(bed.position.x).toBe(x0 - 100);
    expect(layoutProblems(p.furniture, p.room, p.openings)).toEqual([]);
  });

  it('nudgeItem отклоняет сдвиг в стену или в мебель', () => {
    const p = makeProject();
    const bed = p.furniture.find((f) => f.id === 'bed')!;
    const before = { ...bed.position };
    expect(nudgeItem(p, 'bed', 0, 10000)).toBe(false); // далеко за стену
    expect(bed.position).toEqual(before);
  });

  it('nudgeItem по несуществующему id — false', () => {
    expect(nudgeItem(makeProject(), 'nope', 100, 0)).toBe(false);
  });

  it('removeItem удаляет предмет', () => {
    const p = makeProject();
    expect(removeItem(p, 'wardrobe')).toBe(true);
    expect(p.furniture.find((f) => f.id === 'wardrobe')).toBeUndefined();
    expect(removeItem(p, 'wardrobe')).toBe(false); // второй раз — нечего удалять
  });

  it('removeItem каскадно удаляет привязанные предметы (вытяжка с линией)', () => {
    const p = defaultProject('kitchen', 4000, 5000);
    p.openings.push({ kind: 'door', wall: 0, offset: 100, width: 800, height: 2100 });
    p.furniture = TEMPLATES.kitchen!.generate(p.room, p.openings);
    expect(p.furniture.find((f) => f.id === 'hood')).toBeTruthy();
    expect(removeItem(p, 'run')).toBe(true);
    expect(p.furniture.find((f) => f.id === 'hood')).toBeUndefined();
  });

  it('nudgeItem двигает привязанные предметы вместе с хозяином', () => {
    const p = defaultProject('kitchen', 4000, 5000);
    p.openings.push({ kind: 'door', wall: 0, offset: 100, width: 800, height: 2100 });
    p.furniture = TEMPLATES.kitchen!.generate(p.room, p.openings);
    const hood = p.furniture.find((f) => f.id === 'hood')!;
    const run = p.furniture.find((f) => f.id === 'run')!;
    const hx = hood.position.x, rx = run.position.x;
    expect(nudgeItem(p, 'run', -100, 0)).toBe(true);
    expect(run.position.x).toBe(rx - 100);
    expect(hood.position.x).toBe(hx - 100); // вытяжка следует за линией
  });

  it('resetFurniture восстанавливает расстановку шаблоном', () => {
    const p = makeProject();
    removeItem(p, 'bed');
    removeItem(p, 'wardrobe');
    expect(resetFurniture(p)).toBe(true);
    expect(p.furniture.find((f) => f.type === 'bed')).toBeTruthy();
    expect(layoutProblems(p.furniture, p.room, p.openings)).toEqual([]);
  });
});
