# План 3: редактирование мебели, dollhouse-обзор, полировка

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Пользователь редактирует комнату тапом (выбрать предмет → подвинуть/убрать/сбросить расстановку), обзорные ракурсы показывают комнату снаружи «кукольным домиком», дневной свет не пересвечен; плюс скриншот-скрипт и мелкий UX.

**Architecture:** Редактирование — чистые функции над RoomProject (`core/edit.ts`) + пересборка сцены с dispose; выбор предмета — raycast по группам `furniture-*`; dollhouse — per-frame скрытие стен между камерой и комнатой (чистая функция видимости). Всё по образцу планов 1–2: TDD, тестируемая логика отделена от DOM.

**Tech Stack:** без изменений (Vite, TS, Three.js, Vitest; Playwright для скриншотов). Деплой: `npm run build && npx gh-pages -d dist`.

**База:** master после плана 2 (85 тестов). Ветка: `plan-3-editing` от master.

**Спека:** §9 «редактирование: тап по предмету → подвинуть (по слотам)/убрать» — реализуем «подвинуть/убрать/сбросить»; «заменить» откладывается (нужен UI каталога — вне плана 3, зафиксировать в журнале.)

**Вне плана 3 (сознательно):** замена предмета, разделение builders.ts, pixel-diff скриншотов (нет CI), фото-рестайл.

---

### Task 1: disposeAssembled — освобождение сцены

**Files:**
- Modify: `src/scene/assemble.ts` (добавить функцию)
- Test: `tests/assemble.test.ts` (добавить 1 тест)

- [ ] **Step 1: Падающий тест** — добавить в `tests/assemble.test.ts` (импорт дополнить `disposeAssembled`):

```ts
it('disposeAssembled очищает сцену и освобождает геометрии', () => {
  const a = assembleScene(makeProject());
  let disposed = 0;
  a.scene.traverse((o) => {
    const m = o as { geometry?: { addEventListener: (t: string, f: () => void) => void } };
    if (m.geometry) m.geometry.addEventListener('dispose', () => disposed++);
  });
  disposeAssembled(a);
  expect(a.scene.children).toHaveLength(0);
  expect(disposed).toBeGreaterThan(0);
});
```

- [ ] **Step 2:** `npm test` → FAIL.

- [ ] **Step 3: Реализация** — добавить в конец `src/scene/assemble.ts`:

```ts
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
```

- [ ] **Step 4:** `npm test` → PASS (86), `npx tsc --noEmit` чисто.

- [ ] **Step 5: Commit**

```bash
git add src/scene/assemble.ts tests/assemble.test.ts
git commit -m "feat: disposeAssembled — освобождение сцены перед пересборкой"
```

---

### Task 2: Операции редактирования (core/edit.ts)

**Files:**
- Create: `src/core/edit.ts`
- Test: `tests/edit.test.ts`

- [ ] **Step 1: Падающие тесты** `tests/edit.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { nudgeItem, removeItem, resetFurniture } from '../src/core/edit';
import { defaultProject } from '../src/core/model';
import { generateBedroom } from '../src/templates/bedroom';
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

  it('resetFurniture восстанавливает расстановку шаблоном', () => {
    const p = makeProject();
    removeItem(p, 'bed');
    removeItem(p, 'wardrobe');
    expect(resetFurniture(p)).toBe(true);
    expect(p.furniture.find((f) => f.type === 'bed')).toBeTruthy();
    expect(layoutProblems(p.furniture, p.room, p.openings)).toEqual([]);
  });
});
```

- [ ] **Step 2:** `npm test` → FAIL.

- [ ] **Step 3: Реализация** `src/core/edit.ts`:

```ts
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

export function removeItem(project: RoomProject, id: string): boolean {
  const before = project.furniture.length;
  project.furniture = project.furniture.filter((f) => f.id !== id);
  return project.furniture.length < before;
}

// Полная регенерация расстановки шаблоном комнаты
export function resetFurniture(project: RoomProject): boolean {
  const tpl = TEMPLATES[project.room.type];
  if (!tpl) return false;
  project.furniture = tpl.generate(project.room, project.openings);
  return true;
}
```

- [ ] **Step 4:** `npm test` → PASS (91), `npx tsc --noEmit` чисто.

- [ ] **Step 5: Commit**

```bash
git add src/core/edit.ts tests/edit.test.ts
git commit -m "feat: операции редактирования — сдвиг, удаление, сброс расстановки"
```

---

### Task 3: Выбор предмета лучом (scene/picking.ts)

**Files:**
- Create: `src/scene/picking.ts`
- Test: `tests/picking.test.ts`

- [ ] **Step 1: Падающие тесты** `tests/picking.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { pickFurnitureAt, setHighlight } from '../src/scene/picking';
import { assembleScene } from '../src/scene/assemble';
import { defaultProject } from '../src/core/model';
import { generateBedroom, BEDROOM_LIGHT_GROUPS } from '../src/templates/bedroom';
import { M } from '../src/core/units';

function makeAssembled() {
  const p = defaultProject('bedroom', 4000, 5000);
  p.openings.push({ kind: 'door', wall: 0, offset: 100, width: 800, height: 2100 });
  p.furniture = generateBedroom(p.room, p.openings);
  p.lighting.groups = BEDROOM_LIGHT_GROUPS.map((id) => ({ id, on: true, brightness: 0.8 }));
  return { p, a: assembleScene(p) };
}

describe('picking', () => {
  it('луч в кровать возвращает её id', () => {
    const { p, a } = makeAssembled();
    const bed = p.furniture.find((f) => f.type === 'bed')!;
    const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 100);
    camera.position.set(M(bed.position.x), 2.2, M(bed.position.z) - 1.5);
    camera.lookAt(M(bed.position.x), 0.3, M(bed.position.z));
    camera.updateMatrixWorld();
    expect(pickFurnitureAt(0, 0, camera, a.scene)).toBe(bed.id);
  });

  it('луч в потолок/пустоту — null', () => {
    const { a } = makeAssembled();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 100);
    camera.position.set(2, 1.5, 2.5);
    camera.lookAt(2, 10, 2.5); // вертикально вверх, мимо мебели
    camera.updateMatrixWorld();
    expect(pickFurnitureAt(0, 0, camera, a.scene)).toBeNull();
  });

  it('setHighlight включает и снимает подсветку', () => {
    const { p, a } = makeAssembled();
    const bed = p.furniture.find((f) => f.type === 'bed')!;
    setHighlight(a.scene, bed.id);
    const group = a.scene.getObjectByName(`furniture-${bed.id}`)!;
    let highlighted = 0;
    group.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m?.emissive && m.emissive.getHex() !== 0x000000) highlighted++;
    });
    expect(highlighted).toBeGreaterThan(0);
    setHighlight(a.scene, null);
    let still = 0;
    group.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m?.emissive && m.emissive.getHex() !== 0x000000) still++;
    });
    expect(still).toBe(0);
  });
});
```

- [ ] **Step 2:** `npm test` → FAIL.

- [ ] **Step 3: Реализация** `src/scene/picking.ts`:

```ts
import * as THREE from 'three';

// Поиск предмета мебели по лучу из камеры. ndcX/ndcY — координаты клика в NDC (-1..1).
export function pickFurnitureAt(
  ndcX: number, ndcY: number,
  camera: THREE.Camera, scene: THREE.Scene,
): string | null {
  const rc = new THREE.Raycaster();
  rc.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  for (const hit of rc.intersectObjects(scene.children, true)) {
    let o: THREE.Object3D | null = hit.object;
    while (o) {
      if (o.name.startsWith('furniture-')) return o.name.slice('furniture-'.length);
      o = o.parent;
    }
    // луч упёрся в стену/пол раньше мебели — предмет не выбран
    if (hit.object.name === 'floor' || hit.object.parent?.name.startsWith('wall-')) continue;
  }
  return null;
}

const HIGHLIGHT = 0x554411;

// Подсветка выбранного предмета emissive-каналом; null — снять со всех
export function setHighlight(scene: THREE.Scene, id: string | null): void {
  scene.traverse((obj) => {
    if (!obj.name.startsWith('furniture-')) return;
    const on = id !== null && obj.name === `furniture-${id}`;
    obj.traverse((child) => {
      const m = (child as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m?.emissive) m.emissive.setHex(on ? HIGHLIGHT : 0x000000);
    });
  });
}
```

- [ ] **Step 4:** `npm test` → PASS (94). Если тест «луч в кровать» падает — проверь позицию камеры относительно кровати (кровать может стоять у другой стены; бери позицию из p.furniture, как в тесте), не подгоняй ожидание.

- [ ] **Step 5: Commit**

```bash
git add src/scene/picking.ts tests/picking.test.ts
git commit -m "feat: выбор предмета лучом и подсветка выделения"
```

---

### Task 4: Dollhouse — стены не заслоняют обзор снаружи

**Files:**
- Create: `src/scene/dollhouse.ts`
- Modify: `src/ui/viewer.ts` (рендер-луп + вернуть внешние ракурсы)
- Test: `tests/dollhouse.test.ts`

- [ ] **Step 1: Падающие тесты** `tests/dollhouse.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { wallVisibleFor } from '../src/scene/dollhouse';

// Комната 4×5 м (метры, как в сцене)
const W = 4, L = 5;

describe('dollhouse', () => {
  it('камера внутри комнаты — все стены видимы', () => {
    for (let i = 0; i < 4; i++)
      expect(wallVisibleFor(i, { x: 2, y: 1.5, z: 2.5 }, W, L), `wall-${i}`).toBe(true);
  });

  it('камера снаружи за углом — две ближние стены скрыты', () => {
    const cam = { x: W * 1.6, y: 4, z: L * 1.3 }; // внешний угол у стен 1 и 2
    expect(wallVisibleFor(1, cam, W, L)).toBe(false);
    expect(wallVisibleFor(2, cam, W, L)).toBe(false);
    expect(wallVisibleFor(0, cam, W, L)).toBe(true);
    expect(wallVisibleFor(3, cam, W, L)).toBe(true);
  });

  it('камера сверху по центру — все стены видимы', () => {
    for (let i = 0; i < 4; i++)
      expect(wallVisibleFor(i, { x: W / 2, y: 7, z: L / 2 }, W, L), `wall-${i}`).toBe(true);
  });
});
```

- [ ] **Step 2:** `npm test` → FAIL.

- [ ] **Step 3: Реализация** `src/scene/dollhouse.ts`:

```ts
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
```

В `src/ui/viewer.ts`:
1. Импорт: `import { wallVisibleFor } from '../scene/dollhouse';`
2. В CAMERA_VIEWS вернуть внешний обзор: `'Общий': [W * 1.5, H * 1.6, L * 1.25]` (координаты «Сверху»/«От двери»/«Детали» не менять).
3. В рендер-луп (`renderer.setAnimationLoop`) перед `renderer.render(...)` добавить:

```ts
    for (let i = 0; i < 4; i++) {
      const wall = assembled.scene.getObjectByName(`wall-${i}`);
      if (wall) wall.visible = wallVisibleFor(i, camera.position, W, L);
    }
```

- [ ] **Step 4:** `npm test` → PASS (97), `npm run build` чисто.

- [ ] **Step 5: Скриншот-проверка** (dev-сервер, Playwright, scratchpad): спальня по умолчанию, ракурс «Общий» → кадр `p3-dollhouse.png`: комната видна СНАРУЖИ сверху-сбоку, ближние стены невидимы, интерьер (кровать, шкаф, стол) виден целиком, дальние стены на месте. ПОСМОТРЕТЬ кадр. Если стены мигают или скрываются не те — проверь соответствие индексов стен конвенции.

- [ ] **Step 6: Commit**

```bash
git add src/scene/dollhouse.ts src/ui/viewer.ts tests/dollhouse.test.ts
git commit -m "feat: dollhouse-обзор — стены не заслоняют комнату снаружи"
```

---

### Task 5: Полировка света — день без пересвета

**Files:**
- Modify: `src/ui/viewer.ts` (tone mapping), `src/scene/assemble.ts` (интенсивности)

Юнит-тестов нет (визуальная задача) — проверка скриншотами до/после.

- [ ] **Step 1: Скриншот «до»** (dev-сервер, Playwright): спальня, пресет «День», ракурс «Общий» → scratchpad `p3-light-before.png`.

- [ ] **Step 2: Реализация.**

В `src/ui/viewer.ts` после создания renderer:

```ts
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
```

В `src/scene/assemble.ts` (`applyLightingToScene`): `a.sun.intensity = st.intensity * 3` → `* 2`; `a.ambient.intensity = 0.1 + st.intensity * 0.3` → `0.08 + st.intensity * 0.25`.

- [ ] **Step 3: Скриншот «после»** → `p3-light-after.png`. Критерий: стены и пол днём различимы по тону (нет сплошных белых пятен), грани мебели читаются, при этом комната не тёмная. Сравни до/после (Read обоих). Если всё ещё пересвет — уменьшай `toneMappingExposure` шагами 0.1 до 0.8 и/или sun до *1.6; если темно — верни к *2.5. Подобранные значения зафиксируй в отчёте.

- [ ] **Step 4: Проверь остальные пресеты** («Вечер уютный», «Ночь с подсветкой» — по кадру каждый): ночь не должна стать чёрной (tone mapping давит слабый свет — при необходимости подними GROUP_BASE_INTENSITY с 25 до 35). Кадры посмотреть.

- [ ] **Step 5:** `npm test` (97 — числовые тесты света проверяют относительные величины и не должны сломаться; если сломались — проверь, что менял только множители из Step 2), `npm run build`.

- [ ] **Step 6: Commit**

```bash
git add src/ui/viewer.ts src/scene/assemble.ts
git commit -m "feat: тонемаппинг ACES и приглушённый день — без пересвета"
```

---

### Task 6: Панель предмета — подвинуть/убрать/сбросить + «Новая комната»

**Files:**
- Modify: `src/ui/viewer.ts` (клик-выбор, панель предмета, кнопки), `src/main.ts` (обработчик «Новая комната»)

Логика уже покрыта тестами (Task 2, 3); эта задача — DOM-обвязка, проверка скриншотами.

- [ ] **Step 1: Реализация в `src/ui/viewer.ts`.**

1. Импорты: `import { pickFurnitureAt, setHighlight } from '../scene/picking';`, `import { nudgeItem, removeItem, resetFurniture } from '../core/edit';`, `import { disposeAssembled } from '../scene/assemble';` (дополнить существующий импорт assemble).
2. Русские имена предметов (рядом с GROUP_NAMES):

```ts
const ITEM_NAMES: Record<string, string> = {
  bed: 'Кровать', nightstand: 'Тумбочка', wardrobe: 'Шкаф', desk: 'Стол',
  fridge: 'Холодильник', kitchenRun: 'Кухонная линия', hood: 'Вытяжка',
  roundTable: 'Обеденный стол', chair: 'Стул',
  vanity: 'Тумба с зеркалом', bathtub: 'Ванна', shower: 'Душевая', toilet: 'Унитаз',
  kidBed: 'Детская кровать', toyShelf: 'Стеллаж',
};
```

3. Состояние выбора и пересборка (внутри mountViewer, после объявления `assembled`):

```ts
  let selectedId: string | null = null;

  const rebuild = () => {
    disposeAssembled(assembled);
    assembled = assembleScene(project);
    if (selectedId && !project.furniture.some((f) => f.id === selectedId)) selectedId = null;
    if (selectedId) setHighlight(assembled.scene, selectedId);
    onSave?.(project);
  };
```

4. Выбор по клику — различаем клик и вращение камеры (порог смещения):

```ts
  let downAt: { x: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    if (moved > 8) return; // это было вращение OrbitControls, не клик
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    selectedId = pickFurnitureAt(ndcX, ndcY, camera, assembled.scene);
    setHighlight(assembled.scene, selectedId);
    renderPanel();
  });
```

5. Блок предмета в renderPanel — добавить В НАЧАЛО шаблона panel.innerHTML (перед пресетами):

```ts
      ${selectedId ? `
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:6px;background:#333;border-radius:6px">
        <b>${ITEM_NAMES[project.furniture.find((f) => f.id === selectedId)?.type ?? ''] ?? selectedId}</b>
        <button data-move="-x">←</button><button data-move="+x">→</button>
        <button data-move="-z">↑</button><button data-move="+z">↓</button>
        <button data-del style="color:#f88">Убрать</button>
        <button data-desel>✕</button>
      </div>` : `
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <span style="opacity:.6">Тапните по предмету, чтобы подвинуть или убрать</span>
        <button data-reset>Сбросить расстановку</button>
      </div>`}
```

6. Обработчики в renderPanel (после существующих):

```ts
    const STEP = 100; // мм за нажатие
    const MOVES: Record<string, [number, number]> = { '-x': [-STEP, 0], '+x': [STEP, 0], '-z': [0, -STEP], '+z': [0, STEP] };
    panel.querySelectorAll<HTMLButtonElement>('[data-move]').forEach((b) => {
      b.onclick = () => {
        if (!selectedId) return;
        const [dx, dz] = MOVES[b.dataset.move!];
        if (nudgeItem(project, selectedId, dx, dz)) { rebuild(); renderPanel(); }
      };
    });
    const delBtn = panel.querySelector<HTMLButtonElement>('[data-del]');
    if (delBtn) delBtn.onclick = () => {
      if (selectedId && removeItem(project, selectedId)) { selectedId = null; rebuild(); renderPanel(); }
    };
    const deselBtn = panel.querySelector<HTMLButtonElement>('[data-desel]');
    if (deselBtn) deselBtn.onclick = () => { selectedId = null; setHighlight(assembled.scene, null); renderPanel(); };
    const resetBtn = panel.querySelector<HTMLButtonElement>('[data-reset]');
    if (resetBtn) resetBtn.onclick = () => {
      if (resetFurniture(project)) { selectedId = null; rebuild(); renderPanel(); }
    };
```

7. Кнопка «Новая комната» в разметке mountViewer (рядом с #share): `<button id="new-room" style="position:absolute;top:88px;right:8px;padding:8px 12px">Новая комната</button>`, обработчик:

```ts
  root.querySelector<HTMLButtonElement>('#new-room')!.onclick = () => {
    onNewRoom?.();
  };
```

8. Сигнатура: `export function mountViewer(root, project, onSave?, onNewRoom?: () => void)`.

- [ ] **Step 2: `src/main.ts`** — в обоих вызовах mountViewer передать четвёртым аргументом:

```ts
  () => {
    store.remove(CURRENT_ID).catch(() => undefined);
    location.hash = '';
    location.reload();
  }
```
(в openViewer — вынести в именованную функцию `startNewRoom` и передавать её).

- [ ] **Step 3:** `npm test` (97) и `npm run build` — чисто.

- [ ] **Step 4: Скриншот-проверка полного цикла редактирования** (dev-сервер, Playwright, чистый контекст):
1. Спальня по умолчанию → клик в центр кровати (вычисли экранные координаты: кровать по центру нижней части сцены; надёжнее — программный клик по центру canvas после ракурса «Детали») → кадр `p3-edit-selected.png`: панель показывает «Кровать» с кнопками, кровать подсвечена.
2. 3 клика «→» → кадр `p3-edit-moved.png`: кровать сместилась.
3. Выбрать тумбочку или клик «Убрать» на текущем → `p3-edit-removed.png`: предмета нет.
4. «Сбросить расстановку» → `p3-edit-reset.png`: исходная расстановка вернулась.
5. «Новая комната» → мастер открылся → `p3-new-room.png`.
ПОСМОТРЕТЬ каждый кадр. Клик не срабатывает / панель не обновляется / сцена мигает — чинить.

- [ ] **Step 5: Commit**

```bash
git add src/ui/viewer.ts src/main.ts
git commit -m "feat: редактирование тапом — панель предмета, сброс, новая комната"
```

---

### Task 7: Тост вместо alert + валидация в store.save

**Files:**
- Modify: `src/ui/viewer.ts` (share-обработчик), `src/core/store.ts` (save)
- Test: `tests/store.test.ts` (добавить 1 тест)

- [ ] **Step 1: Падающий тест** — добавить в `tests/store.test.ts`:

```ts
it('save отклоняет невалидный проект', async () => {
  const store = new LocalStorageStore(fakeStorage());
  const bad = defaultProject('bedroom', 4000, 5000) as any;
  bad.room.width = -5;
  await expect(store.save('a1', bad)).rejects.toThrow();
  expect(await store.list()).toHaveLength(0);
});
```

- [ ] **Step 2:** `npm test` → FAIL.

- [ ] **Step 3: Реализация.**

`src/core/store.ts` — в начало `save()`:

```ts
    const v = validateProject(p);
    if (!v.ok) throw new Error('невалидный проект: ' + v.errors[0]);
```

`src/ui/viewer.ts` — заменить alert/prompt в share-обработчике на тост:

```ts
function showToast(root: HTMLElement, text: string): void {
  const t = document.createElement('div');
  t.textContent = text;
  t.style.cssText = 'position:absolute;bottom:12px;left:50%;transform:translateX(-50%);'
    + 'background:#333;color:#fff;padding:10px 16px;border-radius:8px;z-index:10;max-width:90%';
  root.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
```
(функция на уровне модуля; в обработчике share: успех → `showToast(root, 'Ссылка скопирована')`; ошибка clipboard → `showToast(root, 'Скопируйте ссылку: ' + url)` — prompt больше не используется. root здесь — контейнер с canvas, position:relative уже есть.)

- [ ] **Step 4:** `npm test` → PASS (98), `npm run build` чисто. Автосохранение в main.ts уже обёрнуто в .catch — reject от save не уронит вьюер (проверь глазами код main.ts).

- [ ] **Step 5: Commit**

```bash
git add src/core/store.ts src/ui/viewer.ts tests/store.test.ts
git commit -m "feat: валидация при сохранении и тост вместо alert"
```

---

### Task 8: Скриншот-скрипт в репозитории

**Files:**
- Create: `scripts/shots.mjs`
- Modify: `package.json` (script), `.gitignore` (+shots/)

- [ ] **Step 1: Скрипт** `scripts/shots.mjs` (Playwright из глобальной установки; предполагает запущенный dev-сервер на 5173 или аргумент URL):

```js
// Скриншоты всех 4 комнат × 2 пресета света. Использование:
//   npm run dev   (в другом терминале)
//   npm run shots [-- http://localhost:5173/]
// Кадры пишутся в ./shots/ (в .gitignore).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:5173/';
const OUT = 'shots';
mkdirSync(OUT, { recursive: true });

const ROOMS = [
  { key: 'kitchen', btn: 'Кухня', style: 'Бежевый минимализм' },
  { key: 'bathroom', btn: 'Ванная', style: 'Скандинавский' },
  { key: 'bedroom', btn: 'Спальня', style: 'Бежевый минимализм' },
  { key: 'kids', btn: 'Детская', style: 'Бежевый минимализм' },
];

const browser = await chromium.launch();
for (const room of ROOMS) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.getByRole('button', { name: room.btn, exact: true }).click();
  await page.getByRole('button', { name: 'Дальше' }).click();
  await page.getByRole('button', { name: room.style }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${room.key}-day.png` });
  await page.getByRole('button', { name: 'Вечер уютный' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${room.key}-evening.png` });
  await ctx.close();
  console.log(`✓ ${room.key}`);
}
await browser.close();
```

`package.json` scripts: `"shots": "node scripts/shots.mjs"`. `.gitignore`: добавить строку `shots`.

- [ ] **Step 2: Прогон** — `npm run dev` в фоне, `npm run shots`; убедиться: 8 PNG в shots/, каждый ПОСМОТРЕТЬ бегло (не пустые/не чёрные). Остановить dev-сервер.

- [ ] **Step 3:** `npm test` (98) — не задето.

- [ ] **Step 4: Commit**

```bash
git add scripts/shots.mjs package.json .gitignore
git commit -m "feat: npm run shots — скриншоты всех комнат для ручной сверки"
```

---

### Task 9: Финал — прогон, мердж, деплой, журнал

- [ ] **Step 1:** `npm test` (98) && `npm run build` — чисто.

- [ ] **Step 2: Финальные скриншоты** (dev-сервер): полный цикл редактирования кухни (выбрать стул → подвинуть → убрать → сбросить) — 2-3 кадра, посмотреть; dollhouse-обзор каждой комнаты через `npm run shots` — кадры теперь снаружи, интерьер целиком.

- [ ] **Step 3: Мердж и пуш**

```bash
git checkout master
git merge plan-3-editing --no-ff -m "Merge plan-3-editing: редактирование тапом, dollhouse, полировка света"
git push origin master plan-3-editing
```

- [ ] **Step 4: Деплой**

```bash
npm run build
npx gh-pages -d dist
```
Через 60-90с: curl 200; Playwright на живом URL: пройти спальню, кликнуть по кровати → панель предмета появилась → кадр `p3-live-edit.png`, посмотреть.

- [ ] **Step 5: Журнал** — CONTEXT.md interior3d (план 3 выполнен: редактирование, dollhouse, свет, тосты, npm run shots; «заменить предмет» отложено) отдельным коммитом, пуш.

---

## Self-review (выполнен при написании плана)

- **Покрытие**: спека §9 редактирование — Tasks 2/3/6 (подвинуть/убрать/сбросить; «заменить» явно отложено и фиксируется в журнале); отложенные пункты планов 1-2: dispose (Task 1), пересвет (Task 5), тесный «Общий» (Task 4 — решён dollhouse-подходом), валидация store.save + alert→UX (Task 7), кнопка «Новая комната» (Task 6), скриншот-скрипт (Task 8).
- **Placeholder scan**: код полный; визуальные задачи (5, 6, 8) проверяются скриншотами с явными критериями.
- **Type consistency**: `disposeAssembled(a)` (Task 1) используется в Task 6; `pickFurnitureAt(ndcX, ndcY, camera, scene)` и `setHighlight(scene, id|null)` (Task 3) — в Task 6; `nudgeItem(project, id, dx, dz)` / `removeItem` / `resetFurniture` (Task 2) — в Task 6; `wallVisibleFor(i, camPos, W, L)` (Task 4) — в рендер-лупе; сигнатура mountViewer расширена опциональным onNewRoom (Task 6) — main.ts обновлён там же.
- **Риск**: тест picking «луч в кровать» чувствителен к позиции кровати — тест берёт позицию из сгенерированной мебели (не хардкод), риск снижен.
