# План 2: шаблоны кухни, ванной и детской

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Все 4 типа комнат работают end-to-end: мастер разблокирует кухню/ванную/детскую, каждая получает автоРасстановку, свою мебель и свои группы света; сайт передеплоен.

**Architecture:** По образцу спальни (план 1): процедурная мебель из боксов + шаблон через tryAdd→layoutProblems (валидность by construction) + каскады размеров при тесноте. Два подготовительных рефакторинга из финального ревью плана 1: общий хелпер единиц `M()` и перенос расстановки групп света из assemble в шаблоны (`Template.lightPoints`).

**Tech Stack:** без изменений — Vite, TypeScript, Three.js, Vitest. Деплой: `npm run build && npx gh-pages -d dist` (CI отложен — нет workflow-scope).

**Спека:** `docs/superpowers/specs/2026-08-11-interior-constructor-design.md` (§5 шаблоны, §7 мебель, §8 свет)
**База:** план 1 выполнен (master, 51 тест). Кнопки комнат в мастере разблокируются АВТОМАТИЧЕСКИ при добавлении записи в `TEMPLATES` — правок мастера не требуется.

**Соглашения (как в плане 1):** модель в мм, сцена в метрах; стены 0—z=0, 1—x=W, 2—z=L, 3—x=0, обход по часовой сверху, offset от начала стены; мебель спиной к стене через `placeAtWall`; повороты кратны 90°. Freestanding-предметы (стол, стулья) задают `position`/`rotation` напрямую — `layoutProblems` работает и с ними.

**Ветка:** работать в `plan-2-rooms` от master (`git checkout master && git pull && git checkout -b plan-2-rooms`).

---

### Task 1: Общий хелпер единиц M()

**Files:**
- Create: `src/core/units.ts`
- Modify: `src/furniture/builders.ts:5`, `src/scene/shell.ts:5`, `src/scene/assemble.ts:8` (удалить локальные `const M = ...`, импортировать)
- Test: `tests/units.test.ts`

- [ ] **Step 1: Падающий тест** `tests/units.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { M } from '../src/core/units';

describe('units', () => {
  it('M конвертирует мм в метры', () => {
    expect(M(1000)).toBe(1);
    expect(M(2500)).toBe(2.5);
    expect(M(0)).toBe(0);
  });
});
```

- [ ] **Step 2:** `npm test` → FAIL (модуля нет).

- [ ] **Step 3: Реализация** `src/core/units.ts`:

```ts
// Единственное место конвертации модели (мм) в сцену (метры)
export const M = (mm: number) => mm / 1000;
```

В `src/furniture/builders.ts`, `src/scene/shell.ts`, `src/scene/assemble.ts`: удалить строку `const M = (mm: number) => mm / 1000;` и добавить импорт `import { M } from '../core/units';`.

- [ ] **Step 4:** `npm test` → PASS (52), `npx tsc --noEmit` чисто.

- [ ] **Step 5: Commit**

```bash
git add src/core/units.ts src/furniture/builders.ts src/scene/shell.ts src/scene/assemble.ts tests/units.test.ts
git commit -m "refactor: общий хелпер единиц M() вместо трёх копий"
```

---

### Task 2: Свет — расстановка точек переезжает в шаблоны

Сейчас `assemble.ts` жёстко знает про pendants-над-тумбочками и accent-под-кроватью (спальня). Кухня/ванная/детская принесут свои группы — расстановку задаёт шаблон.

**Files:**
- Modify: `src/templates/index.ts` (интерфейс), `src/templates/bedroom.ts` (добавить bedroomLightPoints), `src/scene/assemble.ts:66-75` (заменить хардкод на вызов шаблона)
- Test: `tests/bedroom.test.ts` (добавить 1 тест)

- [ ] **Step 1: Падающий тест** — добавить в `tests/bedroom.test.ts` (импорты дополнить: `bedroomLightPoints` из bedroom):

```ts
it('bedroomLightPoints: подвесы над тумбочками, подсветка у кровати', () => {
  const r = room(4000, 5000);
  const items = generateBedroom(r, [door, window_]);
  const pts = bedroomLightPoints(r, items);
  const stands = items.filter((i) => i.type === 'nightstand');
  expect(pts.filter((p) => p.group === 'pendants')).toHaveLength(stands.length);
  const accent = pts.filter((p) => p.group === 'accent');
  expect(accent).toHaveLength(1);
  expect(accent[0].y).toBe(150);
});
```

- [ ] **Step 2:** `npm test` → FAIL.

- [ ] **Step 3: Реализация.**

В `src/templates/index.ts` — полная замена:

```ts
import type { FurnitureItem, Opening, RoomProject, RoomType } from '../core/model';
import { generateBedroom, bedroomLightPoints, BEDROOM_LIGHT_GROUPS } from './bedroom';

// Точка светильника в мм (мировые координаты комнаты). Группа 'ceiling'
// шаблонами не задаётся — потолочную сетку строит assemble универсально.
export interface LightPoint { group: string; x: number; y: number; z: number }

export interface Template {
  generate(room: RoomProject['room'], openings: Opening[]): FurnitureItem[];
  lightGroups: string[];
  lightPoints(room: RoomProject['room'], furniture: FurnitureItem[]): LightPoint[];
}

export const TEMPLATES: Partial<Record<RoomType, Template>> = {
  bedroom: { generate: generateBedroom, lightGroups: BEDROOM_LIGHT_GROUPS, lightPoints: bedroomLightPoints },
};
```

В `src/templates/bedroom.ts` — добавить в конец файла (импорт `LightPoint` из './index' создал бы цикл — объявляем структурно совместимый возврат без импорта типа):

```ts
// Точки света спальни: подвесы над тумбочками (fallback — центр), подсветка у кровати
export function bedroomLightPoints(
  room: RoomProject['room'],
  furniture: FurnitureItem[],
): { group: string; x: number; y: number; z: number }[] {
  const pts: { group: string; x: number; y: number; z: number }[] = [];
  const stands = furniture.filter((f) => f.type === 'nightstand');
  for (const s of stands)
    pts.push({ group: 'pendants', x: s.position.x, y: room.height - 800, z: s.position.z });
  if (stands.length === 0)
    pts.push({ group: 'pendants', x: room.width / 2, y: room.height - 800, z: room.length / 2 });
  const bed = furniture.find((f) => f.type === 'bed');
  pts.push({
    group: 'accent',
    x: bed?.position.x ?? room.width / 2,
    y: 150,
    z: bed?.position.z ?? room.length / 2,
  });
  return pts;
}
```

В `src/scene/assemble.ts`: добавить импорт `import { TEMPLATES } from '../templates/index';` и заменить блоки `if (wantGroups.has('pendants')) {...}` и `if (wantGroups.has('accent')) {...}` (строки 66-75) на:

```ts
  const tpl = TEMPLATES[project.room.type];
  if (tpl)
    for (const p of tpl.lightPoints(project.room, project.furniture))
      if (wantGroups.has(p.group)) addLight(p.group, M(p.x), M(p.y), M(p.z));
```

- [ ] **Step 4:** `npm test` → PASS (53; тесты assemble проверяют те же группы и должны остаться зелёными без правок), `npx tsc --noEmit` чисто.

- [ ] **Step 5: Commit**

```bash
git add src/templates/index.ts src/templates/bedroom.ts src/scene/assemble.ts tests/bedroom.test.ts
git commit -m "refactor: расстановка точек света переехала из assemble в шаблоны"
```

---

### Task 3: Мебель кухни

5 строителей: холодильник, нижняя линия со столешницей (с опциональными варочной панелью и мойкой), вытяжка, круглый стол, стул.

**Files:**
- Modify: `src/furniture/builders.ts` (добавить строители и записи в FURNITURE_BUILDERS)
- Test: `tests/furniture.test.ts` (добавить тесты)

- [ ] **Step 1: Падающие тесты** — добавить в `tests/furniture.test.ts`:

```ts
describe('kitchen builders', () => {
  it('есть строители кухни', () => {
    for (const t of ['fridge', 'kitchenRun', 'hood', 'roundTable', 'chair'])
      expect(FURNITURE_BUILDERS[t], t).toBeTypeOf('function');
  });

  it.each([
    ['fridge', 600, 650, 2000],
    ['kitchenRun', 2400, 600, 900],
    ['hood', 400, 400, 2200],
    ['roundTable', 1000, 1000, 750],
    ['chair', 450, 450, 850],
  ])('%s вписывается в габарит', (type, w, d, h) => {
    const g = FURNITURE_BUILDERS[type](mk(type, w, d, h), style);
    const bb = new THREE.Box3().setFromObject(g);
    const sz = bb.getSize(new THREE.Vector3());
    expect(sz.x).toBeLessThanOrEqual(w / 1000 + 0.01);
    expect(sz.z).toBeLessThanOrEqual(d / 1000 + 0.01);
    expect(sz.y).toBeLessThanOrEqual(h / 1000 + 0.01);
    expect(g.userData.type).toBe(type);
  });

  it('kitchenRun рисует варочную панель и мойку по опциям', () => {
    const item = mk('kitchenRun', 2400, 600, 900);
    item.options = { cooktopCenter: 500, sinkCenter: 1400 };
    const g = FURNITURE_BUILDERS['kitchenRun'](item, style);
    const named = g.children.filter((c) => c.name === 'cooktop' || c.name === 'sink');
    expect(named).toHaveLength(2);
  });
});
```

- [ ] **Step 2:** `npm test` → FAIL.

- [ ] **Step 3: Реализация** — добавить в `src/furniture/builders.ts` перед `FURNITURE_BUILDERS` (конвенции те же: центр в origin, спина к −z, низ на y=0; `box()` ставит центр на h/2 — при явном позиционировании пересчитывать y как `выражение_высоты / 2 + смещение_низа`):

```ts
const buildFridge: Builder = (item, style) => {
  const g = new THREE.Group();
  const w = M(item.size.w), d = M(item.size.d), h = M(item.size.h);
  g.add(box(w, h, d, style.facade));
  const seam = box(0.008, h - 0.04, 0.008, style.accent); // шов двери
  seam.position.set(0, (h - 0.04) / 2, d / 2 - 0.002);
  g.add(seam);
  const handle = box(0.02, 0.35, 0.02, style.accent);
  handle.position.set(w / 4, h * 0.55, d / 2 + 0.005);
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
```

В `FURNITURE_BUILDERS` добавить записи: `fridge: buildFridge, kitchenRun: buildKitchenRun, hood: buildHood, roundTable: buildRoundTable, chair: buildChair`.

- [ ] **Step 4:** `npm test` → PASS (59). Если тест габаритов падает — чинить позиционирование (пересчёт y), допуски не трогать.

- [ ] **Step 5: Commit**

```bash
git add src/furniture/builders.ts tests/furniture.test.ts
git commit -m "feat: мебель кухни — холодильник, линия, вытяжка, стол, стулья"
```

---

### Task 4: Шаблон кухни

Правила из спеки §5: рабочая линия вдоль стены с окном (холодильник → плита → мойка), обеденная зона у окна. Нижняя линия h900 не перекрывает окно с подоконником 900.

**Files:**
- Create: `src/templates/kitchen.ts`
- Modify: `src/templates/index.ts` (запись kitchen)
- Test: `tests/kitchen.test.ts`

- [ ] **Step 1: Падающие тесты** `tests/kitchen.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateKitchen, kitchenLightPoints, KITCHEN_LIGHT_GROUPS } from '../src/templates/kitchen';
import { layoutProblems } from '../src/core/layout';
import type { Opening } from '../src/core/model';

const door: Opening = { kind: 'door', wall: 0, offset: 100, width: 800, height: 2100 };
const window_: Opening = { kind: 'window', wall: 2, offset: 1000, width: 1500, height: 1400, sill: 900 };

function room(w: number, l: number) {
  return { type: 'kitchen' as const, width: w, length: l, height: 2700 };
}

describe('generateKitchen', () => {
  it('нормальная кухня: линия с холодильником, плитой и мойкой, раскладка валидна', () => {
    const r = room(4000, 5000);
    const items = generateKitchen(r, [door, window_]);
    expect(items.find((i) => i.type === 'fridge')).toBeTruthy();
    const run = items.find((i) => i.type === 'kitchenRun');
    expect(run).toBeTruthy();
    expect(typeof run!.options.cooktopCenter).toBe('number');
    expect(typeof run!.options.sinkCenter).toBe('number');
    expect(items.find((i) => i.type === 'hood')).toBeTruthy();
    expect(layoutProblems(items, r, [door, window_])).toEqual([]);
  });

  it('рабочая линия — на стене с окном', () => {
    const items = generateKitchen(room(4000, 5000), [door, window_]);
    expect(items.find((i) => i.type === 'kitchenRun')?.wall).toBe(2);
  });

  it('обеденная зона: стол и стулья в нормальной кухне', () => {
    const items = generateKitchen(room(4000, 5000), [door, window_]);
    expect(items.find((i) => i.type === 'roundTable')).toBeTruthy();
    expect(items.filter((i) => i.type === 'chair').length).toBeGreaterThanOrEqual(2);
  });

  it('сетка размеров: всегда валидна, линия есть от 2500', () => {
    for (let w = 2500; w <= 6000; w += 500) {
      for (let l = 2500; l <= 6000; l += 500) {
        const r = room(w, l);
        const items = generateKitchen(r, [door]);
        expect(layoutProblems(items, r, [door]), `${w}x${l}`).toEqual([]);
        expect(items.find((i) => i.type === 'kitchenRun'), `${w}x${l}: нет линии`).toBeTruthy();
      }
    }
  });

  it('крошечная кухня 2000×2000: валидна, не падает', () => {
    const r = room(2000, 2000);
    expect(layoutProblems(generateKitchen(r, [door]), r, [door])).toEqual([]);
  });

  it('группы света и точки', () => {
    expect(KITCHEN_LIGHT_GROUPS).toEqual(['ceiling', 'spots', 'pendants']);
    const r = room(4000, 5000);
    const items = generateKitchen(r, [door, window_]);
    const pts = kitchenLightPoints(r, items);
    expect(pts.some((p) => p.group === 'spots')).toBe(true);
    expect(pts.some((p) => p.group === 'pendants')).toBe(items.some((i) => i.type === 'roundTable'));
  });
});
```

- [ ] **Step 2:** `npm test` → FAIL.

- [ ] **Step 3: Реализация** `src/templates/kitchen.ts`:

```ts
import type { FurnitureItem, Opening, RoomProject, WallIndex } from '../core/model';
import { layoutProblems, placeAtWall } from '../core/layout';

export const KITCHEN_LIGHT_GROUPS = ['ceiling', 'spots', 'pendants'];

const GAP = 100; // мм — зазор между соседними предметами

export function generateKitchen(
  room: RoomProject['room'],
  openings: Opening[],
): FurnitureItem[] {
  const { width: W, length: L } = room;
  const wallLen = (w: number) => (w % 2 === 0 ? W : L);
  const door = openings.find((o) => o.kind === 'door' || o.kind === 'arch');
  const win = openings.find((o) => o.kind === 'window');
  const placed: FurnitureItem[] = [];

  const tryAdd = (item: FurnitureItem): boolean => {
    if (layoutProblems([...placed, item], room, openings).length > 0) return false;
    placed.push(item);
    return true;
  };

  const mk = (
    id: string, type: string, wall: WallIndex, offset: number,
    size: { w: number; d: number; h: number },
    options: Record<string, unknown> = {},
  ): FurnitureItem => ({
    id, type, wall, size, options,
    ...placeAtWall(wall, offset, size, W, L),
  });

  // 1. Рабочая стена: со окном (линия h900 не перекрывает окно с подоконником 900),
  //    иначе напротив двери; затем остальные.
  const baseOrder: WallIndex[] = door
    ? ([(door.wall + 2) % 4, (door.wall + 1) % 4, (door.wall + 3) % 4, door.wall] as WallIndex[])
    : [2, 0, 1, 3];
  const workOrder: WallIndex[] = win
    ? ([win.wall, ...baseOrder.filter((w) => w !== win.wall)] as WallIndex[])
    : baseOrder;

  // Холодильник у края стены + линия на остаток. Каскад ширины линии.
  const fridgeSize = { w: 600, d: 650, h: 2000 };
  const runWidths = [3000, 2400, 1800, 1200];
  let workWall: WallIndex | -1 = -1;
  for (const wall of workOrder) {
    const free = wallLen(wall);
    for (const rw of runWidths) {
      if (600 + GAP + rw > free) continue;
      const start = (free - (600 + GAP + rw)) / 2;
      const fridge = mk('fridge', 'fridge', wall, start, fridgeSize);
      if (!tryAdd(fridge)) continue;
      // плита в 500 мм от холодильника, мойка ещё через 900
      const cooktopCenter = Math.min(500, rw - 400);
      const sinkCenter = Math.min(cooktopCenter + 900, rw - 300);
      const run = mk('run', 'kitchenRun', wall, start + 600 + GAP, { w: rw, d: 600, h: 900 },
        { cooktopCenter, sinkCenter });
      if (tryAdd(run)) {
        workWall = wall;
        // 2. Вытяжка над плитой (совпадает по координате с cooktop)
        tryAdd(mk('hood', 'hood', wall, start + 600 + GAP + cooktopCenter - 200,
          { w: 400, d: 400, h: room.height - 500 < 2200 ? room.height - 500 : 2200 }));
        break;
      }
      placed.pop(); // откат холодильника, линия не встала
    }
    if (workWall >= 0) break;
  }

  // 3. Обеденная зона: круглый стол в свободной половине (дальней от рабочей стены),
  //    freestanding; стулья по бокам. Каскад диаметра, стулья опциональны.
  const centerFor = (wall: number, frac: number): { x: number; z: number } => {
    // точка на глубине frac (0..1) от рабочей стены к противоположной
    switch (wall) {
      case 0: return { x: W / 2, z: L * frac };
      case 1: return { x: W * (1 - frac), z: L / 2 };
      case 2: return { x: W / 2, z: L * (1 - frac) };
      default: return { x: W * frac, z: L / 2 };
    }
  };
  const tableWall = workWall >= 0 ? workWall : 0;
  for (const dia of [1000, 800]) {
    const c = centerFor(tableWall, 0.68);
    const table: FurnitureItem = {
      id: 'table', type: 'roundTable', position: { x: c.x, z: c.z }, rotation: 0,
      size: { w: dia, d: dia, h: 750 }, options: {},
    };
    if (!tryAdd(table)) continue;
    // стулья по обе стороны стола вдоль рабочей стены, спинкой от стола
    const chairSize = { w: 450, d: 450, h: 850 };
    const off = dia / 2 + GAP + chairSize.d / 2;
    const horizontal = tableWall % 2 === 0; // рабочая стена вдоль x → стулья по x
    for (const s of [-1, 1]) {
      const chair: FurnitureItem = {
        id: `chair-${s > 0 ? 'r' : 'l'}`, type: 'chair',
        position: {
          x: c.x + (horizontal ? s * off : 0),
          z: c.z + (horizontal ? 0 : s * off),
        },
        rotation: horizontal ? (s > 0 ? Math.PI / 2 : -Math.PI / 2) : (s > 0 ? Math.PI : 0),
        size: chairSize, options: {},
      };
      tryAdd(chair);
    }
    break;
  }

  return placed;
}

// Точки света: споты вдоль рабочей линии, подвес над столом
export function kitchenLightPoints(
  room: RoomProject['room'],
  furniture: FurnitureItem[],
): { group: string; x: number; y: number; z: number }[] {
  const pts: { group: string; x: number; y: number; z: number }[] = [];
  const run = furniture.find((f) => f.type === 'kitchenRun');
  if (run) {
    // 2-3 спота вдоль линии на высоте потолок-200
    const n = Math.max(2, Math.round(run.size.w / 1200));
    const horizontal = (run.wall ?? 0) % 2 === 0;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n - 0.5; // -0.5..0.5 вдоль линии
      pts.push({
        group: 'spots',
        x: run.position.x + (horizontal ? t * run.size.w : 0),
        y: room.height - 200,
        z: run.position.z + (horizontal ? 0 : t * run.size.w),
      });
    }
  }
  const table = furniture.find((f) => f.type === 'roundTable');
  if (table)
    pts.push({ group: 'pendants', x: table.position.x, y: room.height - 900, z: table.position.z });
  return pts;
}
```

В `src/templates/index.ts`: добавить импорт `import { generateKitchen, kitchenLightPoints, KITCHEN_LIGHT_GROUPS } from './kitchen';` и запись:

```ts
  kitchen: { generate: generateKitchen, lightGroups: KITCHEN_LIGHT_GROUPS, lightPoints: kitchenLightPoints },
```

- [ ] **Step 4:** `npm test` → PASS (65). Если сеточный тест падает на комбинации — чинить ПРАВИЛА (порядок стен, каскады, отступы), не тест. Отлаживать конкретную комбинацию выводом items+problems.

- [ ] **Step 5: Commit**

```bash
git add src/templates/kitchen.ts src/templates/index.ts tests/kitchen.test.ts
git commit -m "feat: шаблон кухни — рабочая линия, вытяжка, обеденная зона"
```

---

### Task 5: Мебель ванной

4 строителя: тумба с раковиной и зеркалом, ванна, душевая кабина, унитаз.

**Files:**
- Modify: `src/furniture/builders.ts`
- Test: `tests/furniture.test.ts`

- [ ] **Step 1: Падающие тесты** — добавить в `tests/furniture.test.ts`:

```ts
describe('bathroom builders', () => {
  it('есть строители ванной', () => {
    for (const t of ['vanity', 'bathtub', 'shower', 'toilet'])
      expect(FURNITURE_BUILDERS[t], t).toBeTypeOf('function');
  });

  it.each([
    ['vanity', 1200, 500, 2000],
    ['bathtub', 1700, 750, 600],
    ['shower', 900, 900, 2100],
    ['toilet', 400, 650, 800],
  ])('%s вписывается в габарит', (type, w, d, h) => {
    const g = FURNITURE_BUILDERS[type](mk(type, w, d, h), style);
    const bb = new THREE.Box3().setFromObject(g);
    const sz = bb.getSize(new THREE.Vector3());
    expect(sz.x).toBeLessThanOrEqual(w / 1000 + 0.01);
    expect(sz.z).toBeLessThanOrEqual(d / 1000 + 0.01);
    expect(sz.y).toBeLessThanOrEqual(h / 1000 + 0.01);
    expect(g.userData.type).toBe(type);
  });
});
```

- [ ] **Step 2:** `npm test` → FAIL.

- [ ] **Step 3: Реализация** — добавить в `src/furniture/builders.ts`:

```ts
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
  g.add(box(w, h, d, 0xffffff)); // корпус
  const inner = box(w - 0.14, 0.04, d - 0.14, 0xe8f0f2); // «вода/дно»
  inner.position.y = h - 0.02 - 0.02;
  g.add(inner);
  const apron = box(w, h - 0.02, 0.015, style.floor); // экран из плитки
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
```

В `FURNITURE_BUILDERS` добавить: `vanity: buildVanity, bathtub: buildBathtub, shower: buildShower, toilet: buildToilet`.

- [ ] **Step 4:** `npm test` → PASS (70).

- [ ] **Step 5: Commit**

```bash
git add src/furniture/builders.ts tests/furniture.test.ts
git commit -m "feat: мебель ванной — тумба с зеркалом, ванна, душевая, унитаз"
```

---

### Task 6: Шаблон ванной

Правила: тумба у стены сбоку от двери; ванна вдоль самой длинной подходящей стены, при тесноте — душевая в углу; унитаз на стене двери рядом с ней.

**Files:**
- Create: `src/templates/bathroom.ts`
- Modify: `src/templates/index.ts`
- Test: `tests/bathroom.test.ts`

- [ ] **Step 1: Падающие тесты** `tests/bathroom.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateBathroom, bathroomLightPoints, BATHROOM_LIGHT_GROUPS } from '../src/templates/bathroom';
import { layoutProblems } from '../src/core/layout';
import type { Opening } from '../src/core/model';

const door: Opening = { kind: 'door', wall: 0, offset: 100, width: 800, height: 2100 };

function room(w: number, l: number) {
  return { type: 'bathroom' as const, width: w, length: l, height: 2700 };
}

describe('generateBathroom', () => {
  it('нормальная ванная: тумба и ванна или душ, раскладка валидна', () => {
    const r = room(2500, 3000);
    const items = generateBathroom(r, [door]);
    expect(items.find((i) => i.type === 'vanity')).toBeTruthy();
    expect(items.some((i) => i.type === 'bathtub' || i.type === 'shower')).toBe(true);
    expect(layoutProblems(items, r, [door])).toEqual([]);
  });

  it('просторная ванная получает ванну, тесная — душ', () => {
    const big = generateBathroom(room(3000, 3500), [door]);
    expect(big.find((i) => i.type === 'bathtub')).toBeTruthy();
    const small = generateBathroom(room(1700, 2000), [door]);
    expect(layoutProblems(small, room(1700, 2000), [door])).toEqual([]);
  });

  it('сетка размеров: всегда валидна, тумба есть от 1700×2000', () => {
    for (let w = 1700; w <= 4000; w += 300) {
      for (let l = 2000; l <= 4000; l += 400) {
        const r = room(w, l);
        const items = generateBathroom(r, [door]);
        expect(layoutProblems(items, r, [door]), `${w}x${l}`).toEqual([]);
        expect(items.find((i) => i.type === 'vanity'), `${w}x${l}: нет тумбы`).toBeTruthy();
      }
    }
  });

  it('группы света и точка зеркала', () => {
    expect(BATHROOM_LIGHT_GROUPS).toEqual(['ceiling', 'mirror']);
    const r = room(2500, 3000);
    const items = generateBathroom(r, [door]);
    const pts = bathroomLightPoints(r, items);
    expect(pts.some((p) => p.group === 'mirror')).toBe(true);
  });
});
```

- [ ] **Step 2:** `npm test` → FAIL.

- [ ] **Step 3: Реализация** `src/templates/bathroom.ts`:

```ts
import type { FurnitureItem, Opening, RoomProject, WallIndex } from '../core/model';
import { layoutProblems, placeAtWall } from '../core/layout';

export const BATHROOM_LIGHT_GROUPS = ['ceiling', 'mirror'];

const GAP = 100;

export function generateBathroom(
  room: RoomProject['room'],
  openings: Opening[],
): FurnitureItem[] {
  const { width: W, length: L } = room;
  const wallLen = (w: number) => (w % 2 === 0 ? W : L);
  const door = openings.find((o) => o.kind === 'door' || o.kind === 'arch');
  const doorWall = (door?.wall ?? 0) as WallIndex;
  const placed: FurnitureItem[] = [];

  const tryAdd = (item: FurnitureItem): boolean => {
    if (layoutProblems([...placed, item], room, openings).length > 0) return false;
    placed.push(item);
    return true;
  };

  const mk = (
    id: string, type: string, wall: WallIndex, offset: number,
    size: { w: number; d: number; h: number },
  ): FurnitureItem => ({
    id, type, wall, size, options: {},
    ...placeAtWall(wall, offset, size, W, L),
  });

  // 1. Тумба с зеркалом — на соседней к двери стене (сначала более длинная), по центру;
  //    каскад ширины. В крайнем случае — стена напротив двери.
  const sideWalls = ([(doorWall + 1) % 4, (doorWall + 3) % 4] as WallIndex[])
    .sort((a, b) => wallLen(b) - wallLen(a));
  const vanityWalls: WallIndex[] = [...sideWalls, ((doorWall + 2) % 4) as WallIndex];
  outer: for (const vw of [1200, 900, 600]) {
    for (const wall of vanityWalls) {
      if (wallLen(wall) < vw) continue;
      if (tryAdd(mk('vanity', 'vanity', wall, (wallLen(wall) - vw) / 2, { w: vw, d: 500, h: 2000 })))
        break outer;
    }
  }

  // 2. Ванна вдоль самой длинной подходящей стены; не влезла — душевая в углу
  const tubWalls: WallIndex[] = ([0, 1, 2, 3] as WallIndex[])
    .filter((w) => w !== doorWall)
    .sort((a, b) => wallLen(b) - wallLen(a));
  let wetDone = false;
  for (const len of [1700, 1500]) {
    for (const wall of tubWalls) {
      if (wallLen(wall) < len) continue;
      // пробуем прижать к углам, затем центр
      for (const off of [0, wallLen(wall) - len, (wallLen(wall) - len) / 2]) {
        if (off < 0) continue;
        if (tryAdd(mk('bathtub', 'bathtub', wall, off, { w: len, d: 750, h: 600 }))) {
          wetDone = true;
          break;
        }
      }
      if (wetDone) break;
    }
    if (wetDone) break;
  }
  if (!wetDone) {
    for (const wall of tubWalls) {
      for (const off of [0, Math.max(0, wallLen(wall) - 900)]) {
        if (wallLen(wall) < 900) continue;
        if (tryAdd(mk('shower', 'shower', wall, off, { w: 900, d: 900, h: 2100 }))) {
          wetDone = true;
          break;
        }
      }
      if (wetDone) break;
    }
  }

  // 3. Унитаз — на стене двери, рядом с дверью (с обеих сторон пробуем)
  if (door) {
    const t = { w: 400, d: 650, h: 800 };
    const after = door.offset + door.width + GAP;
    const before = door.offset - GAP - t.w;
    for (const off of [after, before]) {
      if (off < 0 || off + t.w > wallLen(doorWall)) continue;
      if (tryAdd(mk('toilet', 'toilet', doorWall, off, t))) break;
    }
  }

  return placed;
}

// Точка света над зеркалом тумбы
export function bathroomLightPoints(
  room: RoomProject['room'],
  furniture: FurnitureItem[],
): { group: string; x: number; y: number; z: number }[] {
  const vanity = furniture.find((f) => f.type === 'vanity');
  if (!vanity) return [];
  return [{ group: 'mirror', x: vanity.position.x, y: 1950, z: vanity.position.z }];
}
```

В `src/templates/index.ts`: импорт и запись `bathroom: { generate: generateBathroom, lightGroups: BATHROOM_LIGHT_GROUPS, lightPoints: bathroomLightPoints }`.

- [ ] **Step 4:** `npm test` → PASS (74). Сеточный тест падает — чинить правила (порядок стен/углов, каскады).

- [ ] **Step 5: Commit**

```bash
git add src/templates/bathroom.ts src/templates/index.ts tests/bathroom.test.ts
git commit -m "feat: шаблон ванной — тумба, ванна/душ, унитаз"
```

---

### Task 7: Мебель детской

2 новых строителя: кровать с бортиками и стеллаж для игрушек (шкаф и стол переиспользуются из спальни).

**Files:**
- Modify: `src/furniture/builders.ts`
- Test: `tests/furniture.test.ts`

- [ ] **Step 1: Падающие тесты** — добавить в `tests/furniture.test.ts`:

```ts
describe('kids builders', () => {
  it('есть строители детской', () => {
    for (const t of ['kidBed', 'toyShelf'])
      expect(FURNITURE_BUILDERS[t], t).toBeTypeOf('function');
  });

  it.each([
    ['kidBed', 900, 1700, 800],
    ['toyShelf', 800, 300, 1200],
  ])('%s вписывается в габарит', (type, w, d, h) => {
    const g = FURNITURE_BUILDERS[type](mk(type, w, d, h), style);
    const bb = new THREE.Box3().setFromObject(g);
    const sz = bb.getSize(new THREE.Vector3());
    expect(sz.x).toBeLessThanOrEqual(w / 1000 + 0.01);
    expect(sz.z).toBeLessThanOrEqual(d / 1000 + 0.01);
    expect(sz.y).toBeLessThanOrEqual(h / 1000 + 0.01);
    expect(g.userData.type).toBe(type);
  });

  it('kidBed красит бортики в акцентный цвет из options', () => {
    const item = mk('kidBed', 900, 1700, 800);
    item.options = { accentColor: 0x7fc8e8 };
    const g = FURNITURE_BUILDERS['kidBed'](item, style);
    const rails = g.children.filter((c) => c.name === 'rail');
    expect(rails.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2:** `npm test` → FAIL.

- [ ] **Step 3: Реализация** — добавить в `src/furniture/builders.ts`:

```ts
// Детская кровать с бортиками; options.accentColor — цвет бортиков (number)
const buildKidBed: Builder = (item, style) => {
  const g = new THREE.Group();
  const w = M(item.size.w), d = M(item.size.d);
  const accent = typeof item.options.accentColor === 'number'
    ? (item.options.accentColor as number)
    : 0x7fc8c0;
  const base = box(w, 0.25, d, style.wood);
  g.add(base);
  const mattress = box(w - 0.08, 0.14, d - 0.12, style.textile);
  mattress.position.y = 0.25 + 0.07;
  g.add(mattress);
  const headboard = box(w, 0.55, 0.06, accent);
  headboard.position.set(0, 0.275, -d / 2 + 0.03);
  g.add(headboard);
  for (const sx of [-1, 1]) {
    const rail = box(0.05, 0.3, d * 0.6, accent); // бортики
    rail.name = 'rail';
    rail.position.set(sx * (w / 2 - 0.025), 0.25 + 0.15, -d * 0.1);
    g.add(rail);
  }
  const pillow = box(0.45, 0.1, 0.32, 0xffffff);
  pillow.position.set(0, 0.39 + 0.05, -d / 2 + 0.28);
  g.add(pillow);
  g.userData = { id: item.id, type: 'kidBed' };
  return g;
};

// Открытый стеллаж: боковины + полки + пара цветных «игрушек»
const buildToyShelf: Builder = (item, style) => {
  const g = new THREE.Group();
  const w = M(item.size.w), d = M(item.size.d), h = M(item.size.h);
  for (const sx of [-1, 1]) {
    const side = box(0.02, h, d, style.wood);
    side.position.x = sx * (w / 2 - 0.01);
    g.add(side);
  }
  const shelves = 4;
  for (let i = 0; i < shelves; i++) {
    const shelf = box(w - 0.04, 0.02, d, style.wood);
    shelf.position.y = 0.02 + (h - 0.04) * (i / (shelves - 1));
    g.add(shelf);
  }
  const toyColors = [0xe86a6a, 0x6ab0e8, 0xe8c76a];
  toyColors.forEach((c, i) => {
    const toy = box(0.12, 0.12, 0.12, c);
    toy.position.set(-w / 4 + (i * w) / 4, 0.04 + (h - 0.04) * ((i % 3) / 3) + 0.06, 0);
    g.add(toy);
  });
  g.userData = { id: item.id, type: 'toyShelf' };
  return g;
};
```

В `FURNITURE_BUILDERS` добавить: `kidBed: buildKidBed, toyShelf: buildToyShelf`.

- [ ] **Step 4:** `npm test` → PASS (77).

- [ ] **Step 5: Commit**

```bash
git add src/furniture/builders.ts tests/furniture.test.ts
git commit -m "feat: мебель детской — кровать с бортиками, стеллаж для игрушек"
```

---

### Task 8: Шаблон детской

Правила из спеки §5 (детские): кровать у стены, шкаф, стол у окна, стеллаж; акцент — бирюзовый по умолчанию.

**Files:**
- Create: `src/templates/kids.ts`
- Modify: `src/templates/index.ts`
- Test: `tests/kids.test.ts`

- [ ] **Step 1: Падающие тесты** `tests/kids.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateKids, kidsLightPoints, KIDS_LIGHT_GROUPS } from '../src/templates/kids';
import { layoutProblems } from '../src/core/layout';
import type { Opening } from '../src/core/model';

const door: Opening = { kind: 'door', wall: 0, offset: 100, width: 800, height: 2100 };
const window_: Opening = { kind: 'window', wall: 2, offset: 1000, width: 1500, height: 1400, sill: 900 };

function room(w: number, l: number) {
  return { type: 'kids' as const, width: w, length: l, height: 2700 };
}

describe('generateKids', () => {
  it('нормальная детская: кровать, шкаф, стол у окна, стеллаж; валидна', () => {
    const r = room(3500, 4500);
    const items = generateKids(r, [door, window_]);
    expect(items.find((i) => i.type === 'kidBed')).toBeTruthy();
    expect(items.find((i) => i.type === 'wardrobe')).toBeTruthy();
    expect(items.find((i) => i.type === 'desk')?.wall).toBe(2);
    expect(items.find((i) => i.type === 'toyShelf')).toBeTruthy();
    expect(layoutProblems(items, r, [door, window_])).toEqual([]);
  });

  it('сетка размеров: всегда валидна, кровать есть от 2600', () => {
    for (let w = 2600; w <= 6000; w += 500) {
      for (let l = 2600; l <= 6000; l += 500) {
        const r = room(w, l);
        const items = generateKids(r, [door]);
        expect(layoutProblems(items, r, [door]), `${w}x${l}`).toEqual([]);
        expect(items.find((i) => i.type === 'kidBed'), `${w}x${l}: нет кровати`).toBeTruthy();
      }
    }
  });

  it('крошечная 2000×2000: валидна', () => {
    const r = room(2000, 2000);
    expect(layoutProblems(generateKids(r, [door]), r, [door])).toEqual([]);
  });

  it('группы света: гирлянда-точки над кроватью', () => {
    expect(KIDS_LIGHT_GROUPS).toEqual(['ceiling', 'accent']);
    const r = room(3500, 4500);
    const items = generateKids(r, [door]);
    const pts = kidsLightPoints(r, items);
    expect(pts.filter((p) => p.group === 'accent').length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2:** `npm test` → FAIL.

- [ ] **Step 3: Реализация** `src/templates/kids.ts`:

```ts
import type { FurnitureItem, Opening, RoomProject, WallIndex } from '../core/model';
import { layoutProblems, placeAtWall } from '../core/layout';

export const KIDS_LIGHT_GROUPS = ['ceiling', 'accent'];

const GAP = 100;
const KID_ACCENT = 0x7fc8c0; // бирюзовый по умолчанию (пол ребёнка мастер пока не спрашивает)

export function generateKids(
  room: RoomProject['room'],
  openings: Opening[],
): FurnitureItem[] {
  const { width: W, length: L } = room;
  const wallLen = (w: number) => (w % 2 === 0 ? W : L);
  const door = openings.find((o) => o.kind === 'door' || o.kind === 'arch');
  const win = openings.find((o) => o.kind === 'window');
  const placed: FurnitureItem[] = [];

  const tryAdd = (item: FurnitureItem): boolean => {
    if (layoutProblems([...placed, item], room, openings).length > 0) return false;
    placed.push(item);
    return true;
  };

  const mk = (
    id: string, type: string, wall: WallIndex, offset: number,
    size: { w: number; d: number; h: number },
    options: Record<string, unknown> = {},
  ): FurnitureItem => ({
    id, type, wall, size, options,
    ...placeAtWall(wall, offset, size, W, L),
  });

  // 1. Кровать 900×1700 — у стены напротив двери (окно — в последнюю очередь),
  //    НЕ по центру, а со сдвигом к углу (детская: центр остаётся под игры)
  const bedSize = { w: 900, d: 1700, h: 800 };
  const baseOrder: WallIndex[] = door
    ? ([(door.wall + 2) % 4, (door.wall + 1) % 4, (door.wall + 3) % 4, door.wall] as WallIndex[])
    : [2, 0, 1, 3];
  const wallOrder: WallIndex[] = win
    ? ([...baseOrder.filter((w) => w !== win.wall), win.wall] as WallIndex[])
    : baseOrder;
  let bedWall: WallIndex | -1 = -1;
  for (const wall of wallOrder) {
    if (wallLen(wall) < bedSize.w) continue;
    for (const off of [GAP, wallLen(wall) - bedSize.w - GAP, (wallLen(wall) - bedSize.w) / 2]) {
      if (off < 0) continue;
      if (tryAdd(mk('bed', 'kidBed', wall, off, bedSize, { accentColor: KID_ACCENT }))) {
        bedWall = wall;
        break;
      }
    }
    if (bedWall >= 0) break;
  }

  // 2. Шкаф — свободная стена, каскад ширины
  for (const wall of ([0, 1, 2, 3] as WallIndex[]).filter((w) => w !== bedWall)) {
    const free = wallLen(wall);
    let done = false;
    for (const ww of [1800, 1200, 900, 600]) {
      if (ww > free) continue;
      if (tryAdd(mk('wardrobe', 'wardrobe', wall, (free - ww) / 2, { w: ww, d: 600, h: 2200 }))) {
        done = true;
        break;
      }
    }
    if (done) break;
  }

  // 3. Стол у окна (как в спальне)
  if (win) {
    for (const dw of [1000, 800, 700]) {
      if (wallLen(win.wall) < dw) continue;
      const center = win.offset + win.width / 2;
      const offset = Math.min(Math.max(0, center - dw / 2), Math.max(0, wallLen(win.wall) - dw));
      if (tryAdd(mk('desk', 'desk', win.wall, offset, { w: dw, d: 550, h: 750 }))) break;
    }
  }

  // 4. Стеллаж для игрушек — любая стена, где влезет
  for (const wall of [0, 1, 2, 3] as WallIndex[]) {
    const free = wallLen(wall);
    if (free < 800) continue;
    let done = false;
    for (const off of [GAP, free - 800 - GAP, (free - 800) / 2]) {
      if (off < 0) continue;
      if (tryAdd(mk('shelf', 'toyShelf', wall, off, { w: 800, d: 300, h: 1200 }))) {
        done = true;
        break;
      }
    }
    if (done) break;
  }

  return placed;
}

// «Гирлянда»: 3 тёплые точки вдоль кровати
export function kidsLightPoints(
  room: RoomProject['room'],
  furniture: FurnitureItem[],
): { group: string; x: number; y: number; z: number }[] {
  const bed = furniture.find((f) => f.type === 'kidBed');
  if (!bed) return [];
  const horizontal = (bed.wall ?? 0) % 2 === 0;
  const pts: { group: string; x: number; y: number; z: number }[] = [];
  for (const t of [-0.35, 0, 0.35]) {
    pts.push({
      group: 'accent',
      x: bed.position.x + (horizontal ? t * bed.size.w : 0),
      y: room.height - 900,
      z: bed.position.z + (horizontal ? 0 : t * bed.size.w),
    });
  }
  return pts;
}
```

В `src/templates/index.ts`: импорт и запись `kids: { generate: generateKids, lightGroups: KIDS_LIGHT_GROUPS, lightPoints: kidsLightPoints }`.

- [ ] **Step 4:** `npm test` → PASS (81). Сеточный тест падает — чинить правила.

- [ ] **Step 5: Commit**

```bash
git add src/templates/kids.ts src/templates/index.ts tests/kids.test.ts
git commit -m "feat: шаблон детской — кровать с бортиками, шкаф, стол, стеллаж"
```

---

### Task 9: Пресеты и подписи для новых групп света

Новые группы (`spots`, `mirror`) должны управляться пресетами и иметь русские подписи; ракурс «Кровать» переименовывается в универсальный.

**Files:**
- Modify: `src/lighting/engine.ts` (LIGHT_PRESETS), `src/ui/viewer.ts` (GROUP_NAMES, CAMERA_VIEWS)
- Test: `tests/lighting.test.ts` (добавить 1 тест)

- [ ] **Step 1: Падающий тест** — добавить в `tests/lighting.test.ts` (в describe('presets')):

```ts
it('пресеты управляют новыми группами spots и mirror', () => {
  const state: LightingState = {
    preset: null, sunTime: 13, colorTemp: 4000,
    groups: [
      { id: 'spots', on: false, brightness: 1 },
      { id: 'mirror', on: false, brightness: 1 },
    ],
  };
  const work = applyPreset(state, 'work');
  expect(work.groups.find((g) => g.id === 'spots')?.on).toBe(true);
  expect(work.groups.find((g) => g.id === 'mirror')?.on).toBe(true);
  const night = applyPreset(state, 'night-accent');
  expect(night.groups.find((g) => g.id === 'spots')?.on).toBe(false);
});
```

- [ ] **Step 2:** `npm test` → FAIL.

- [ ] **Step 3: Реализация.**

В `src/lighting/engine.ts` дополнить `groups` каждого пресета записями:

- `'day'`: `spots: { on: false, brightness: 0.5 }, mirror: { on: false, brightness: 0.5 }`
- `'evening-cozy'`: `spots: { on: true, brightness: 0.4 }, mirror: { on: true, brightness: 0.5 }`
- `'night-accent'`: `spots: { on: false, brightness: 0.3 }, mirror: { on: false, brightness: 0.3 }`
- `'work'`: `spots: { on: true, brightness: 1 }, mirror: { on: true, brightness: 1 }`

В `src/ui/viewer.ts`:
- `GROUP_NAMES` дополнить: `spots: 'Споты', mirror: 'Подсветка зеркала'`.
- В `CAMERA_VIEWS` переименовать ключ `'Кровать'` → `'Детали'` (координаты те же — [W / 2, H * 0.55, L * 0.75]).

- [ ] **Step 4:** `npm test` → PASS (82), `npm run build` чисто.

- [ ] **Step 5: Commit**

```bash
git add src/lighting/engine.ts src/ui/viewer.ts tests/lighting.test.ts
git commit -m "feat: пресеты и подписи для групп spots/mirror, ракурс «Детали»"
```

---

### Task 10: Скриншот-проверка всех комнат, мердж и деплой

**Files:** нет изменений src (только проверка, мердж, деплой, журнал)

- [ ] **Step 1: Скриншоты всех 4 комнат (Playwright, dev-сервер, чистые контексты)**

Скрипт в scratchpad. Для каждого типа комнаты — отдельный incognito-контекст:
1. Кухня: мастер → «Кухня» → размеры по умолчанию → «Бежевый минимализм» → 2500мс → `plan2-kitchen.png`. Ожидается: линия с холодильником и вытяжкой, стол со стульями.
2. Ванная: «Ванная» → ширина 2500, длина 3000 → стиль любой → `plan2-bathroom.png`. Ожидается: тумба с зеркалом, ванна, унитаз.
3. Детская: «Детская» → 3500×4500 → `plan2-kids.png`. Ожидается: кровать с бирюзовыми бортиками, шкаф, стол, стеллаж.
4. Спальня (регрессия): дефолтный проход → `plan2-bedroom.png` — как в плане 1.
5. В каждой комнате кликнуть пресет «Вечер уютный» → скриншот `plan2-<type>-evening.png` — свет заметно меняется (у кухни включаются споты, у ванной подсветка зеркала).

ПОСМОТРЕТЬ каждый кадр (Read). Пустая комната, мебель в стенах, чёрный кадр — баг, разбираться (вывести items и layoutProblems для этих размеров).

- [ ] **Step 2: Полный прогон**

Run: `npm test && npm run build`
Expected: все тесты зелёные, сборка чистая.

- [ ] **Step 3: Мердж в master**

```bash
git checkout master
git merge plan-2-rooms --no-ff -m "Merge plan-2-rooms: шаблоны кухни, ванной и детской"
git push origin master plan-2-rooms
```

- [ ] **Step 4: Деплой и проверка живого сайта**

```bash
npm run build
npx gh-pages -d dist
```
Подождать ~1-2 мин, проверить https://sigurt33.github.io/interior3d/ (curl 200 + Playwright: мастер показывает ВСЕ 4 комнаты активными, пройти кухню до 3D, скриншот `plan2-live.png`, посмотреть).

- [ ] **Step 5: Журнал**

Обновить `CONTEXT.md` interior3d (план 2 выполнен, все 4 комнаты живые) отдельным коммитом, запушить. Обновить `CONTEXT.md` в `ClaudeC/kuhnya` и память.

---

## Self-review (выполнен при написании плана)

- **Покрытие спеки:** §5 «4 типа: кухня, ванная, спальня, детская» — закрывается полностью (Task 4, 6, 8 + спальня из плана 1); правила кухни из спеки (линия вдоль стены с окном, обеденная зона) — Task 4; §7 процедурная мебель — Task 3, 5, 7; §8 группы света шаблонов — Task 2 (механизм) + точки в каждом шаблоне + пресеты Task 9. Мастер правок не требует (кнопки разблокируются реестром TEMPLATES). Вне плана 2 (сознательно): редактирование мебели, скриншот-тесты в CI — план 3.
- **Placeholder scan:** код полный во всех задачах; UI-проверки — скриншотами с явными ожиданиями.
- **Type consistency:** `Template.lightPoints(room, furniture)` (Task 2) совпадает с сигнатурами kitchen/bathroom/kids (Task 4/6/8); `LightPoint {group,x,y,z}` в мм — конвертация M() только в assemble; имена групп `spots`/`mirror`/`accent`/`pendants`/`ceiling` согласованы между шаблонами (Task 4/6/8), пресетами и GROUP_NAMES (Task 9); типы мебели в шаблонах (`kitchenRun`, `roundTable`, `chair`, `vanity`, `bathtub`, `shower`, `toilet`, `kidBed`, `toyShelf`) совпадают с ключами FURNITURE_BUILDERS (Task 3/5/7).
- **Известный риск:** сеточные тесты шаблонов (Task 4/6/8) могут потребовать итераций правил — это заложено в Step 4 каждой задачи («чинить правила, не тест»), как в плане 1.
