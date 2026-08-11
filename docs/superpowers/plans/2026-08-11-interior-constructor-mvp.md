# План 1: ядро конструктора + спальня end-to-end

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Рабочий веб-конструктор: пользователь вводит размеры спальни, отмечает дверь/окно, выбирает стиль — получает интерактивную 3D с мебелью и полным управлением светом; проект сохраняется и шарится ссылкой.

**Architecture:** SPA без сервера. Вся комната — один JSON-документ `RoomProject`; сцена Three.js — чистая функция от него. Хранилище только через интерфейс `ProjectStore` (localStorage сейчас, бэкенд потом). Модель в миллиметрах, сцена в метрах.

**Tech Stack:** Vite, TypeScript, Three.js (модульный), lz-string, Vitest. Хостинг GitHub Pages.

**Спека:** `docs/superpowers/specs/2026-08-11-interior-constructor-design.md`

**Вне этого плана:** шаблоны кухни/ванной/детской (план 2), редактирование мебели тапом и скриншот-тесты (план 3), фото-рестайл (этап B).

**Соглашения (важно для всех задач):**
- Модель — мм; сцена — метры (`M = mm / 1000`).
- План комнаты: x — ширина `width`, z — длина `length`. Стены: 0 — z=0, 1 — x=W, 2 — z=L, 3 — x=0. Обход по часовой стрелке сверху; `offset` проёма/мебели — от начала стены по обходу.
- Локальная система предмета мебели: центр в origin, «спина» (к стене) — в −z. `placeAtWall` возвращает позицию центра и поворот вокруг Y.
- Повороты мебели кратны 90°.

---

### Task 1: Каркас проекта

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `.gitignore`, `tests/smoke.test.ts`

- [ ] **Step 1: Создать файлы каркаса**

`package.json`:
```json
{
  "name": "interior3d",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "three": "^0.167.0",
    "lz-string": "^1.5.0"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "vite": "^5.4.0",
    "vitest": "^2.0.5",
    "@types/three": "^0.167.0"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true
  },
  "include": ["src", "tests"]
}
```

`vite.config.ts`:
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  test: { environment: 'node' },
});
```

`index.html`:
```html
<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Конструктор интерьеров</title>
  <style>
    * { margin: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #1a1a1e; color: #eee; }
    #app { height: 100dvh; display: flex; flex-direction: column; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

`src/main.ts`:
```ts
document.querySelector<HTMLDivElement>('#app')!.textContent = 'interior3d: каркас работает';
```

`.gitignore`:
```
node_modules
dist
```

`tests/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('тесты запускаются', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 2: Установить зависимости**

Run: `npm install` (в `C:\Users\User\ClaudeC\interior3d`; таймаут ставить 5+ мин — антивирус)
Expected: `node_modules` создан, без ошибок.

- [ ] **Step 3: Проверить тесты и dev-сервер**

Run: `npm test`
Expected: `1 passed`.
Run: `npm run build`
Expected: `dist/` собран без ошибок.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: каркас Vite + TypeScript + Three.js + Vitest"
```

---

### Task 2: Модель RoomProject

**Files:**
- Create: `src/core/model.ts`
- Test: `tests/model.test.ts`

- [ ] **Step 1: Написать падающий тест**

`tests/model.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { defaultProject, ROOM_TYPES } from '../src/core/model';

describe('defaultProject', () => {
  it('создаёт валидный каркас проекта', () => {
    const p = defaultProject('bedroom', 4000, 5000);
    expect(p.meta.version).toBe(1);
    expect(p.room).toEqual({ type: 'bedroom', width: 4000, length: 5000, height: 2700 });
    expect(p.openings).toEqual([]);
    expect(p.furniture).toEqual([]);
    expect(p.lighting.sunTime).toBe(13);
    expect(p.lighting.colorTemp).toBe(4000);
  });

  it('знает 4 типа комнат', () => {
    expect(ROOM_TYPES).toEqual(['kitchen', 'bathroom', 'bedroom', 'kids']);
  });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/core/model'`.

- [ ] **Step 3: Реализовать модель**

`src/core/model.ts`:
```ts
export const ROOM_TYPES = ['kitchen', 'bathroom', 'bedroom', 'kids'] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export type OpeningKind = 'door' | 'window' | 'arch';
export type WallIndex = 0 | 1 | 2 | 3;

export interface Opening {
  kind: OpeningKind;
  wall: WallIndex;
  offset: number; // мм от начала стены (обход по часовой сверху)
  width: number;
  height: number;
  sill?: number; // высота подоконника (для окон)
}

export interface FurnitureItem {
  id: string;
  type: string;
  wall?: number;
  position: { x: number; z: number }; // центр, мм
  rotation: number;                   // рад, кратно 90°
  size: { w: number; d: number; h: number }; // мм
  options: Record<string, unknown>;
}

export interface LightGroupState {
  id: string;
  on: boolean;
  brightness: number; // 0..1
}

export interface LightingState {
  preset: string | null;
  sunTime: number;   // 0..24
  colorTemp: number; // 2700..6500 K
  groups: LightGroupState[];
}

export interface RoomProject {
  meta: { name: string; created: string; version: 1 };
  room: { type: RoomType; width: number; length: number; height: number };
  openings: Opening[];
  style: { palette: string; floorMaterial: string; wallMaterial: string; accentMaterial: string };
  furniture: FurnitureItem[];
  lighting: LightingState;
}

export const ROOM_NAMES: Record<RoomType, string> = {
  kitchen: 'Кухня',
  bathroom: 'Ванная',
  bedroom: 'Спальня',
  kids: 'Детская',
};

export function defaultProject(type: RoomType, width: number, length: number, height = 2700): RoomProject {
  return {
    meta: { name: ROOM_NAMES[type], created: new Date().toISOString(), version: 1 },
    room: { type, width, length, height },
    openings: [],
    style: { palette: 'beige-minimal', floorMaterial: 'wood', wallMaterial: 'paint', accentMaterial: 'black' },
    furniture: [],
    lighting: { preset: 'day', sunTime: 13, colorTemp: 4000, groups: [] },
  };
}
```

- [ ] **Step 4: Убедиться, что тест проходит**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/model.ts tests/model.test.ts
git commit -m "feat: модель RoomProject и defaultProject"
```

---

### Task 3: Валидация проекта

**Files:**
- Create: `src/core/validate.ts`
- Test: `tests/validate.test.ts`

- [ ] **Step 1: Написать падающие тесты**

`tests/validate.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { validateProject } from '../src/core/validate';
import { defaultProject } from '../src/core/model';

describe('validateProject', () => {
  it('принимает валидный проект', () => {
    const r = validateProject(defaultProject('bedroom', 4000, 5000));
    expect(r.ok).toBe(true);
  });

  it('отклоняет не-объект', () => {
    expect(validateProject('мусор').ok).toBe(false);
    expect(validateProject(null).ok).toBe(false);
  });

  it('отклоняет неверную версию', () => {
    const p = defaultProject('bedroom', 4000, 5000) as any;
    p.meta.version = 99;
    const r = validateProject(p);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toContain('version');
  });

  it('отклоняет размеры вне диапазона', () => {
    const p = defaultProject('bedroom', 500, 5000);
    expect(validateProject(p).ok).toBe(false);
  });

  it('отклоняет битый проём', () => {
    const p = defaultProject('bedroom', 4000, 5000) as any;
    p.openings.push({ kind: 'люк', wall: 7, offset: 0, width: 800, height: 2000 });
    expect(validateProject(p).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npm test`
Expected: FAIL — модуля validate нет.

- [ ] **Step 3: Реализовать валидацию**

`src/core/validate.ts`:
```ts
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
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/validate.ts tests/validate.test.ts
git commit -m "feat: валидация RoomProject"
```

---

### Task 4: ProjectStore (localStorage)

**Files:**
- Create: `src/core/store.ts`
- Test: `tests/store.test.ts`

- [ ] **Step 1: Написать падающие тесты**

`tests/store.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { LocalStorageStore } from '../src/core/store';
import { defaultProject } from '../src/core/model';

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe('LocalStorageStore', () => {
  it('сохраняет, отдаёт список и загружает', async () => {
    const store = new LocalStorageStore(fakeStorage());
    const p = defaultProject('bedroom', 4000, 5000);
    await store.save('a1', p);
    const list = await store.list();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('a1');
    expect(list[0].name).toBe('Спальня');
    const loaded = await store.load('a1');
    expect(loaded?.room.width).toBe(4000);
  });

  it('удаляет проект', async () => {
    const store = new LocalStorageStore(fakeStorage());
    await store.save('a1', defaultProject('bedroom', 4000, 5000));
    await store.remove('a1');
    expect(await store.list()).toHaveLength(0);
    expect(await store.load('a1')).toBeNull();
  });

  it('load несуществующего — null', async () => {
    const store = new LocalStorageStore(fakeStorage());
    expect(await store.load('nope')).toBeNull();
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Реализовать стор**

`src/core/store.ts`:
```ts
import type { RoomProject } from './model';
import { validateProject } from './validate';

export interface ProjectListEntry { id: string; name: string; updated: string }

export interface ProjectStore {
  list(): Promise<ProjectListEntry[]>;
  load(id: string): Promise<RoomProject | null>;
  save(id: string, p: RoomProject): Promise<void>;
  remove(id: string): Promise<void>;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const PREFIX = 'interior3d:project:';
const INDEX = 'interior3d:index';

export class LocalStorageStore implements ProjectStore {
  constructor(private storage: StorageLike = globalThis.localStorage) {}

  private readIndex(): ProjectListEntry[] {
    try {
      return JSON.parse(this.storage.getItem(INDEX) ?? '[]');
    } catch {
      return [];
    }
  }

  private writeIndex(entries: ProjectListEntry[]): void {
    this.storage.setItem(INDEX, JSON.stringify(entries));
  }

  async list(): Promise<ProjectListEntry[]> {
    return this.readIndex();
  }

  async load(id: string): Promise<RoomProject | null> {
    const raw = this.storage.getItem(PREFIX + id);
    if (!raw) return null;
    try {
      const r = validateProject(JSON.parse(raw));
      return r.ok ? r.project : null;
    } catch {
      return null;
    }
  }

  async save(id: string, p: RoomProject): Promise<void> {
    this.storage.setItem(PREFIX + id, JSON.stringify(p));
    const index = this.readIndex().filter((e) => e.id !== id);
    index.push({ id, name: p.meta.name, updated: new Date().toISOString() });
    this.writeIndex(index);
  }

  async remove(id: string): Promise<void> {
    this.storage.removeItem(PREFIX + id);
    this.writeIndex(this.readIndex().filter((e) => e.id !== id));
  }
}
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/store.ts tests/store.test.ts
git commit -m "feat: интерфейс ProjectStore и LocalStorageStore"
```

---

### Task 5: Шаринг ссылкой (lz-string)

**Files:**
- Create: `src/core/share.ts`
- Test: `tests/share.test.ts`

- [ ] **Step 1: Написать падающие тесты**

`tests/share.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { encodeShare, decodeShare } from '../src/core/share';
import { defaultProject } from '../src/core/model';

describe('share', () => {
  it('кодирует и декодирует проект без потерь', () => {
    const p = defaultProject('bedroom', 4000, 5000);
    const hash = encodeShare(p);
    expect(hash.startsWith('#p=')).toBe(true);
    const back = decodeShare(hash);
    expect(back).toEqual(p);
  });

  it('возвращает null на мусор', () => {
    expect(decodeShare('#p=абракадабра')).toBeNull();
    expect(decodeShare('#other')).toBeNull();
    expect(decodeShare('')).toBeNull();
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

`src/core/share.ts`:
```ts
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { RoomProject } from './model';
import { validateProject } from './validate';

export function encodeShare(p: RoomProject): string {
  return '#p=' + compressToEncodedURIComponent(JSON.stringify(p));
}

export function decodeShare(hash: string): RoomProject | null {
  const m = hash.match(/#p=(.+)/);
  if (!m) return null;
  try {
    const json = decompressFromEncodedURIComponent(m[1]);
    if (!json) return null;
    const r = validateProject(JSON.parse(json));
    return r.ok ? r.project : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/share.ts tests/share.test.ts
git commit -m "feat: шаринг проекта через lz-string в URL-hash"
```

---

### Task 6: Стили

**Files:**
- Create: `src/core/styles.ts`
- Test: `tests/styles.test.ts`

- [ ] **Step 1: Написать падающий тест**

`tests/styles.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { STYLES, getStyle } from '../src/core/styles';

describe('styles', () => {
  it('есть 4 стиля, первый — бежевый минимализм', () => {
    expect(STYLES).toHaveLength(4);
    expect(STYLES[0].id).toBe('beige-minimal');
  });

  it('getStyle находит по id и падает в дефолт', () => {
    expect(getStyle('scandi').id).toBe('scandi');
    expect(getStyle('несуществующий').id).toBe('beige-minimal');
  });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

`src/core/styles.ts`:
```ts
export interface StyleDef {
  id: string;
  name: string;
  floor: number;    // пол
  wall: number;     // стены
  ceiling: number;  // потолок
  facade: number;   // фасады мебели
  accent: number;   // акценты (фурнитура, профили)
  wood: number;     // дерево (каркасы, столешницы)
  textile: number;  // текстиль (изголовья, матрасы-чехлы)
}

export const STYLES: StyleDef[] = [
  { id: 'beige-minimal', name: 'Бежевый минимализм', floor: 0xb8a98f, wall: 0xe8e0d2, ceiling: 0xf5f2ec, facade: 0xd8cbb4, accent: 0x222222, wood: 0x9a7b52, textile: 0xcfc6b8 },
  { id: 'light-classic', name: 'Светлая классика', floor: 0xc9b795, wall: 0xf2ede2, ceiling: 0xfaf7f0, facade: 0xffffff, accent: 0xb08d57, wood: 0x8a6a48, textile: 0xe6ddd0 },
  { id: 'dark-contrast', name: 'Тёмный контраст', floor: 0x5a4a3a, wall: 0x3a3a40, ceiling: 0xd8d8d8, facade: 0x2e2e33, accent: 0xc9a227, wood: 0x6b4f35, textile: 0x8a8a92 },
  { id: 'scandi', name: 'Скандинавский', floor: 0xd9cbb0, wall: 0xf5f5f2, ceiling: 0xffffff, facade: 0xffffff, accent: 0x4a4a4a, wood: 0xc4a878, textile: 0xdde3e6 },
];

export function getStyle(id: string): StyleDef {
  return STYLES.find((s) => s.id === id) ?? STYLES[0];
}
```

- [ ] **Step 4: Убедиться, что тест проходит**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/styles.ts tests/styles.test.ts
git commit -m "feat: 4 стиля интерьера"
```

---

### Task 7: Движок освещения

**Files:**
- Create: `src/lighting/engine.ts`
- Test: `tests/lighting.test.ts`

- [ ] **Step 1: Написать падающие тесты**

`tests/lighting.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { kelvinToRGB, sunState, LIGHT_PRESETS, applyPreset } from '../src/lighting/engine';
import type { LightingState } from '../src/core/model';

describe('kelvinToRGB', () => {
  it('6500K — почти белый', () => {
    const c = kelvinToRGB(6500);
    expect(c.r).toBeGreaterThan(0.9);
    expect(c.g).toBeGreaterThan(0.9);
    expect(c.b).toBeGreaterThan(0.9);
  });

  it('2700K — тёплый: r > g > b', () => {
    const c = kelvinToRGB(2700);
    expect(c.r).toBeGreaterThan(c.g);
    expect(c.g).toBeGreaterThan(c.b);
  });
});

describe('sunState', () => {
  it('полдень: ярко и почти белый свет', () => {
    const s = sunState(13.5);
    expect(s.intensity).toBeGreaterThan(0.8);
    expect(s.color.b).toBeGreaterThan(0.7);
  });

  it('ночь: слабый холодный свет', () => {
    const s = sunState(3);
    expect(s.intensity).toBeLessThan(0.15);
    expect(s.color.b).toBeGreaterThan(s.color.r);
  });

  it('утро: тёплый свет, солнце низко', () => {
    const s = sunState(7);
    expect(s.color.r).toBeGreaterThan(s.color.b);
    expect(s.position.y).toBeLessThan(6);
  });
});

describe('presets', () => {
  it('есть 4 пресета', () => {
    expect(Object.keys(LIGHT_PRESETS)).toEqual(['day', 'evening-cozy', 'night-accent', 'work']);
  });

  it('applyPreset выставляет параметры и имя пресета', () => {
    const state: LightingState = {
      preset: null, sunTime: 13, colorTemp: 4000,
      groups: [
        { id: 'ceiling', on: false, brightness: 1 },
        { id: 'accent', on: false, brightness: 1 },
      ],
    };
    const next = applyPreset(state, 'evening-cozy');
    expect(next.preset).toBe('evening-cozy');
    expect(next.sunTime).toBe(20);
    expect(next.colorTemp).toBe(2700);
    expect(next.groups.find((g) => g.id === 'ceiling')?.on).toBe(true);
    // исходный state не мутирован
    expect(state.preset).toBeNull();
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Реализовать движок**

`src/lighting/engine.ts`:
```ts
import type { LightingState } from '../core/model';

export interface RGB { r: number; g: number; b: number }

// Аппроксимация Таннера Хелланда, вход 1000..40000 K, выход 0..1
export function kelvinToRGB(kelvin: number): RGB {
  const t = kelvin / 100;
  let r: number, g: number, b: number;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }
  const clamp = (x: number) => Math.max(0, Math.min(255, x)) / 255;
  return { r: clamp(r), g: clamp(g), b: clamp(b) };
}

export interface SunState {
  intensity: number;
  color: RGB;
  position: { x: number; y: number; z: number }; // метры, относительно центра комнаты
}

export function sunState(time: number): SunState {
  if (time < 6 || time > 21) {
    // ночь: слабая холодная «луна»
    return { intensity: 0.06, color: { r: 0.55, g: 0.65, b: 1 }, position: { x: 5, y: 10, z: 5 } };
  }
  const dayT = (time - 6) / 15; // 0..1 за световой день
  const elevation = Math.sin(dayT * Math.PI); // 0 → 1 → 0
  const kelvin = 2200 + elevation * 4300; // рассвет/закат 2200K → полдень 6500K
  const azimuth = dayT * Math.PI; // восток → запад
  return {
    intensity: 0.15 + elevation * 0.85,
    color: kelvinToRGB(kelvin),
    position: {
      x: Math.cos(azimuth) * 10,
      y: 1.5 + elevation * 9,
      z: -Math.sin(azimuth) * 10,
    },
  };
}

interface PresetDef {
  sunTime: number;
  colorTemp: number;
  groups: Record<string, { on: boolean; brightness: number }>;
}

export const LIGHT_PRESETS: Record<string, PresetDef> = {
  'day': {
    sunTime: 13, colorTemp: 4500,
    groups: { ceiling: { on: false, brightness: 0.5 }, pendants: { on: false, brightness: 0.5 }, accent: { on: false, brightness: 0.5 } },
  },
  'evening-cozy': {
    sunTime: 20, colorTemp: 2700,
    groups: { ceiling: { on: true, brightness: 0.35 }, pendants: { on: true, brightness: 0.7 }, accent: { on: true, brightness: 0.8 } },
  },
  'night-accent': {
    sunTime: 23, colorTemp: 2700,
    groups: { ceiling: { on: false, brightness: 0.3 }, pendants: { on: false, brightness: 0.3 }, accent: { on: true, brightness: 1 } },
  },
  'work': {
    sunTime: 13, colorTemp: 5500,
    groups: { ceiling: { on: true, brightness: 1 }, pendants: { on: true, brightness: 1 }, accent: { on: false, brightness: 0.5 } },
  },
};

export function applyPreset(state: LightingState, presetId: string): LightingState {
  const def = LIGHT_PRESETS[presetId];
  if (!def) return state;
  return {
    preset: presetId,
    sunTime: def.sunTime,
    colorTemp: def.colorTemp,
    groups: state.groups.map((g) => {
      const pg = def.groups[g.id];
      return pg ? { ...g, on: pg.on, brightness: pg.brightness } : { ...g };
    }),
  };
}
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lighting/engine.ts tests/lighting.test.ts
git commit -m "feat: движок освещения — кельвины, солнце, пресеты"
```

---

### Task 8: Геометрия раскладки

**Files:**
- Create: `src/core/layout.ts`
- Test: `tests/layout.test.ts`

- [ ] **Step 1: Написать падающие тесты**

`tests/layout.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { placeAtWall, itemRect, rectsOverlap, layoutProblems } from '../src/core/layout';
import type { FurnitureItem, Opening } from '../src/core/model';

const size = { w: 2000, d: 600, h: 800 };
const room = { type: 'bedroom' as const, width: 4000, length: 5000, height: 2700 };

function item(id: string, wall: 0 | 1 | 2 | 3, offset: number, s = size): FurnitureItem {
  return { id, type: 'test', wall, size: s, options: {}, ...placeAtWall(wall, offset, s, room.width, room.length) };
}

describe('placeAtWall', () => {
  it('стена 0: спина к z=0', () => {
    const p = placeAtWall(0, 1000, size, 4000, 5000);
    expect(p.position).toEqual({ x: 2000, z: 300 });
    expect(p.rotation).toBe(0);
  });

  it('стена 1: спина к x=W', () => {
    const p = placeAtWall(1, 1000, size, 4000, 5000);
    expect(p.position).toEqual({ x: 3700, z: 2000 });
    expect(p.rotation).toBeCloseTo(-Math.PI / 2);
  });

  it('стена 2: отсчёт с другого конца', () => {
    const p = placeAtWall(2, 0, size, 4000, 5000);
    expect(p.position).toEqual({ x: 3000, z: 4700 });
    expect(p.rotation).toBeCloseTo(Math.PI);
  });

  it('стена 3', () => {
    const p = placeAtWall(3, 0, size, 4000, 5000);
    expect(p.position).toEqual({ x: 300, z: 4000 });
    expect(p.rotation).toBeCloseTo(Math.PI / 2);
  });
});

describe('itemRect / rectsOverlap', () => {
  it('учитывает поворот (w и d меняются местами)', () => {
    const r = itemRect(item('a', 1, 1000));
    expect(r.x1 - r.x0).toBeCloseTo(600);
    expect(r.z1 - r.z0).toBeCloseTo(2000);
  });

  it('пересечение и касание', () => {
    const a = itemRect(item('a', 0, 0));
    const b = itemRect(item('b', 0, 1000)); // пересекается с a
    const c = itemRect(item('c', 0, 2000)); // ровно встык с a
    expect(rectsOverlap(a, b)).toBe(true);
    expect(rectsOverlap(a, c)).toBe(false);
  });
});

describe('layoutProblems', () => {
  const door: Opening = { kind: 'door', wall: 0, offset: 100, width: 800, height: 2100 };

  it('пустая комната — нет проблем', () => {
    expect(layoutProblems([], room, [door])).toEqual([]);
  });

  it('ловит выход за стены', () => {
    const bad: FurnitureItem = { id: 'x', type: 't', position: { x: 3900, z: 2000 }, rotation: 0, size, options: {} };
    expect(layoutProblems([bad], room, []).join()).toContain('за стены');
  });

  it('ловит пересечение мебели', () => {
    const a = item('a', 2, 0);
    const b = item('b', 2, 1000);
    expect(layoutProblems([a, b], room, []).join()).toContain('пересекается');
  });

  it('ловит блокировку двери', () => {
    const blocker = item('bl', 0, 0); // у стены 0, перекрывает зону двери
    expect(layoutProblems([blocker], room, [door]).join()).toContain('дверь');
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

`src/core/layout.ts`:
```ts
import type { FurnitureItem, Opening, RoomProject, WallIndex } from './model';

export interface Rect { x0: number; z0: number; x1: number; z1: number }

// offset — от начала стены по часовому обходу (вид сверху); возвращает центр и поворот
export function placeAtWall(
  wall: WallIndex, offset: number,
  size: { w: number; d: number; h: number },
  W: number, L: number,
): { position: { x: number; z: number }; rotation: number } {
  const half = size.w / 2;
  const dd = size.d / 2;
  switch (wall) {
    case 0: return { position: { x: offset + half, z: dd }, rotation: 0 };
    case 1: return { position: { x: W - dd, z: offset + half }, rotation: -Math.PI / 2 };
    case 2: return { position: { x: W - offset - half, z: L - dd }, rotation: Math.PI };
    case 3: return { position: { x: dd, z: L - offset - half }, rotation: Math.PI / 2 };
  }
}

export function itemRect(item: FurnitureItem): Rect {
  const quarter = Math.round(item.rotation / (Math.PI / 2));
  const swapped = Math.abs(quarter) % 2 === 1;
  const w = swapped ? item.size.d : item.size.w;
  const d = swapped ? item.size.w : item.size.d;
  return {
    x0: item.position.x - w / 2,
    z0: item.position.z - d / 2,
    x1: item.position.x + w / 2,
    z1: item.position.z + d / 2,
  };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
}

const DOOR_CLEAR = 900; // мм свободного пространства перед дверью/аркой

export function doorClearRect(op: Opening, W: number, L: number): Rect {
  switch (op.wall) {
    case 0: return { x0: op.offset, z0: 0, x1: op.offset + op.width, z1: DOOR_CLEAR };
    case 1: return { x0: W - DOOR_CLEAR, z0: op.offset, x1: W, z1: op.offset + op.width };
    case 2: return { x0: W - op.offset - op.width, z0: L - DOOR_CLEAR, x1: W - op.offset, z1: L };
    case 3: return { x0: 0, z0: L - op.offset - op.width, x1: DOOR_CLEAR, z1: L - op.offset };
  }
}

const EPS = 1; // мм допуска на округления

export function layoutProblems(
  items: FurnitureItem[],
  room: RoomProject['room'],
  openings: Opening[],
): string[] {
  const problems: string[] = [];
  const rects = items.map(itemRect);

  items.forEach((it, i) => {
    const r = rects[i];
    if (r.x0 < -EPS || r.z0 < -EPS || r.x1 > room.width + EPS || r.z1 > room.length + EPS)
      problems.push(`${it.id}: выходит за стены`);
  });

  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++)
      if (rectsOverlap(rects[i], rects[j]))
        problems.push(`${items[i].id} пересекается с ${items[j].id}`);

  for (const op of openings) {
    if (op.kind !== 'door' && op.kind !== 'arch') continue;
    const clear = doorClearRect(op, room.width, room.length);
    items.forEach((it, i) => {
      if (rectsOverlap(rects[i], clear)) problems.push(`${it.id}: блокирует дверь`);
    });
  }
  return problems;
}
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/layout.ts tests/layout.test.ts
git commit -m "feat: геометрия раскладки — слоты у стен, пересечения, зона двери"
```

---

### Task 9: Оболочка комнаты (пол + стены с проёмами)

**Files:**
- Create: `src/scene/shell.ts`
- Test: `tests/shell.test.ts`

- [ ] **Step 1: Написать падающие тесты**

`tests/shell.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildWallWithOpenings, buildRoomShell } from '../src/scene/shell';
import { defaultProject } from '../src/core/model';
import { getStyle } from '../src/core/styles';
import * as THREE from 'three';

const mat = new THREE.MeshStandardMaterial();

describe('buildWallWithOpenings', () => {
  it('глухая стена — 1 сегмент', () => {
    const g = buildWallWithOpenings(4, 2.7, [], mat);
    expect(g.children).toHaveLength(1);
  });

  it('дверь — 2 простенка + перемычка', () => {
    const g = buildWallWithOpenings(4, 2.7, [
      { kind: 'door', wall: 0, offset: 1000, width: 800, height: 2100 },
    ], mat);
    expect(g.children).toHaveLength(3);
  });

  it('окно — 2 простенка + перемычка + подоконная часть', () => {
    const g = buildWallWithOpenings(4, 2.7, [
      { kind: 'window', wall: 0, offset: 1000, width: 1500, height: 1400, sill: 900 },
    ], mat);
    expect(g.children).toHaveLength(4);
  });

  it('дверь в самом углу — без нулевых сегментов', () => {
    const g = buildWallWithOpenings(4, 2.7, [
      { kind: 'door', wall: 0, offset: 0, width: 800, height: 2100 },
    ], mat);
    expect(g.children).toHaveLength(2); // правый простенок + перемычка
  });
});

describe('buildRoomShell', () => {
  it('пол + потолок + 4 стены', () => {
    const p = defaultProject('bedroom', 4000, 5000);
    p.openings.push({ kind: 'door', wall: 0, offset: 100, width: 800, height: 2100 });
    const shell = buildRoomShell(p, getStyle('beige-minimal'));
    const walls = shell.children.filter((c) => c.name.startsWith('wall'));
    expect(walls).toHaveLength(4);
    expect(shell.children.find((c) => c.name === 'floor')).toBeTruthy();
    expect(shell.children.find((c) => c.name === 'ceiling')).toBeTruthy();
    // стена 0 с дверью — 3 сегмента
    expect((walls.find((w) => w.name === 'wall-0') as THREE.Group).children).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

`src/scene/shell.ts`:
```ts
import * as THREE from 'three';
import type { Opening, RoomProject } from '../core/model';
import type { StyleDef } from '../core/styles';

const M = (mm: number) => mm / 1000;
const WALL_T = 0.1; // м

// Стена в локальных координатах: вдоль X от 0 до len (м), Y вверх, толщина по Z
export function buildWallWithOpenings(
  len: number, h: number, openings: Opening[], mat: THREE.Material,
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
    addSeg(cursor, x0, 0, h); // простенок до проёма
    const yBottom = op.kind === 'window' ? M(op.sill ?? 900) : 0;
    const yTop = yBottom + M(op.height);
    addSeg(x0, x1, yTop, h);          // перемычка над проёмом
    if (yBottom > 0) addSeg(x0, x1, 0, yBottom); // подоконная часть
    cursor = x1;
  }
  addSeg(cursor, len, 0, h);
  return g;
}

export function buildRoomShell(project: RoomProject, style: StyleDef): THREE.Group {
  const { width, length, height } = project.room;
  const W = M(width), L = M(length), H = M(height);
  const shell = new THREE.Group();
  shell.name = 'shell';

  const wallMat = new THREE.MeshStandardMaterial({ color: style.wall, side: THREE.DoubleSide });
  const floorMat = new THREE.MeshStandardMaterial({ color: style.floor });
  const ceilMat = new THREE.MeshStandardMaterial({ color: style.ceiling, side: THREE.DoubleSide });

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
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scene/shell.ts tests/shell.test.ts
git commit -m "feat: оболочка комнаты — пол, потолок, стены с проёмами"
```

---

### Task 10: Процедурная мебель спальни

**Files:**
- Create: `src/furniture/builders.ts`
- Test: `tests/furniture.test.ts`

- [ ] **Step 1: Написать падающие тесты**

`tests/furniture.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { FURNITURE_BUILDERS } from '../src/furniture/builders';
import { getStyle } from '../src/core/styles';
import type { FurnitureItem } from '../src/core/model';

const style = getStyle('beige-minimal');

function mk(type: string, w: number, d: number, h: number): FurnitureItem {
  return { id: 't', type, position: { x: 0, z: 0 }, rotation: 0, size: { w, d, h }, options: {} };
}

describe('furniture builders', () => {
  it('есть строители для мебели спальни', () => {
    for (const t of ['bed', 'nightstand', 'wardrobe', 'desk'])
      expect(FURNITURE_BUILDERS[t], t).toBeTypeOf('function');
  });

  it.each([
    ['bed', 1800, 2100, 1000],
    ['nightstand', 450, 450, 500],
    ['wardrobe', 2400, 600, 2200],
    ['desk', 1200, 600, 750],
  ])('%s вписывается в заданный габарит', (type, w, d, h) => {
    const g = FURNITURE_BUILDERS[type](mk(type, w, d, h), style);
    const bb = new THREE.Box3().setFromObject(g);
    const sz = bb.getSize(new THREE.Vector3());
    expect(sz.x).toBeLessThanOrEqual(w / 1000 + 0.01);
    expect(sz.z).toBeLessThanOrEqual(d / 1000 + 0.01);
    expect(sz.y).toBeLessThanOrEqual(h / 1000 + 0.01);
    expect(sz.x).toBeGreaterThan(0.05);
    expect(g.userData.type).toBe(type);
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Реализовать строителей**

`src/furniture/builders.ts`:
```ts
import * as THREE from 'three';
import type { FurnitureItem } from '../core/model';
import type { StyleDef } from '../core/styles';

const M = (mm: number) => mm / 1000;

export type Builder = (item: FurnitureItem, style: StyleDef) => THREE.Group;

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
  g.add(box(w, h, d, style.wood));
  const facade = box(w - 0.04, h - 0.1, 0.02, style.facade);
  facade.position.set(0, 0.05, d / 2 - 0.01);
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
    seam.position.set(-w / 2 + (w / doors) * i, 0.01, d / 2 - 0.002);
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
    leg.position.set(sx * (w / 2 - 0.05), 0, sz * (d / 2 - 0.05));
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
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/furniture/builders.ts tests/furniture.test.ts
git commit -m "feat: процедурная мебель спальни — кровать, тумбочки, шкаф, стол"
```

---

### Task 11: Шаблон спальни

**Files:**
- Create: `src/templates/bedroom.ts`, `src/templates/index.ts`
- Test: `tests/bedroom.test.ts`

- [ ] **Step 1: Написать падающие тесты**

`tests/bedroom.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { generateBedroom, BEDROOM_LIGHT_GROUPS } from '../src/templates/bedroom';
import { layoutProblems } from '../src/core/layout';
import type { Opening } from '../src/core/model';

const door: Opening = { kind: 'door', wall: 0, offset: 100, width: 800, height: 2100 };
const window_: Opening = { kind: 'window', wall: 2, offset: 1000, width: 1500, height: 1400, sill: 900 };

function room(w: number, l: number) {
  return { type: 'bedroom' as const, width: w, length: l, height: 2700 };
}

describe('generateBedroom', () => {
  it('нормальная комната: есть кровать, раскладка валидна', () => {
    const r = room(4000, 5000);
    const items = generateBedroom(r, [door, window_]);
    expect(items.find((i) => i.type === 'bed')).toBeTruthy();
    expect(items.find((i) => i.type === 'wardrobe')).toBeTruthy();
    expect(layoutProblems(items, r, [door, window_])).toEqual([]);
  });

  it('стол появляется под окном', () => {
    const items = generateBedroom(room(4000, 5000), [door, window_]);
    const desk = items.find((i) => i.type === 'desk');
    expect(desk?.wall).toBe(2);
  });

  it('сетка размеров: раскладка всегда валидна, кровать есть от 3×3 м', () => {
    for (let w = 3000; w <= 6000; w += 500) {
      for (let l = 3000; l <= 6000; l += 500) {
        const r = room(w, l);
        const items = generateBedroom(r, [door]);
        expect(layoutProblems(items, r, [door]), `${w}x${l}`).toEqual([]);
        expect(items.find((i) => i.type === 'bed'), `${w}x${l}: нет кровати`).toBeTruthy();
      }
    }
  });

  it('крошечная комната: не падает и не даёт невалидной раскладки', () => {
    const r = room(2000, 2000);
    const items = generateBedroom(r, [door]);
    expect(layoutProblems(items, r, [door])).toEqual([]);
  });

  it('группы света шаблона', () => {
    expect(BEDROOM_LIGHT_GROUPS).toEqual(['ceiling', 'pendants', 'accent']);
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Реализовать шаблон**

`src/templates/bedroom.ts`:
```ts
import type { FurnitureItem, Opening, RoomProject, WallIndex } from '../core/model';
import { layoutProblems, placeAtWall } from '../core/layout';

export const BEDROOM_LIGHT_GROUPS = ['ceiling', 'pendants', 'accent'];

export function generateBedroom(
  room: RoomProject['room'],
  openings: Opening[],
): FurnitureItem[] {
  const { width: W, length: L } = room;
  const wallLen = (w: number) => (w % 2 === 0 ? W : L);
  const door = openings.find((o) => o.kind === 'door' || o.kind === 'arch');
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

  // 1. Кровать — сначала стена напротив двери, затем остальные
  const bedSize = { w: 1800, d: 2100, h: 1000 };
  const wallOrder: WallIndex[] = door
    ? ([(door.wall + 2) % 4, (door.wall + 1) % 4, (door.wall + 3) % 4, door.wall] as WallIndex[])
    : [2, 0, 1, 3];
  let bedWall = -1;
  let bedOffset = 0;
  for (const w of wallOrder) {
    if (wallLen(w) < bedSize.w + 100) continue;
    bedOffset = (wallLen(w) - bedSize.w) / 2;
    if (tryAdd(mk('bed', 'bed', w, bedOffset, bedSize))) {
      bedWall = w;
      break;
    }
  }

  // 2. Тумбочки по бокам кровати
  if (bedWall >= 0) {
    const ns = { w: 450, d: 450, h: 500 };
    tryAdd(mk('nightstand-l', 'nightstand', bedWall as WallIndex, bedOffset - 100 - ns.w, ns));
    tryAdd(mk('nightstand-r', 'nightstand', bedWall as WallIndex, bedOffset + bedSize.w + 100, ns));
  }

  // 3. Шкаф — вдоль свободной стены, ширина подгоняется
  for (const w of ([0, 1, 2, 3] as WallIndex[]).filter((w) => w !== bedWall)) {
    const free = wallLen(w);
    const ww = Math.min(2400, free - 700);
    if (ww < 800) continue;
    if (tryAdd(mk('wardrobe', 'wardrobe', w, (free - ww) / 2, { w: ww, d: 600, h: 2200 }))) break;
  }

  // 4. Стол — под окном, если оно есть
  const win = openings.find((o) => o.kind === 'window');
  if (win) {
    const dSize = { w: 1200, d: 600, h: 750 };
    const center = win.offset + win.width / 2;
    const offset = Math.min(Math.max(0, center - dSize.w / 2), wallLen(win.wall) - dSize.w);
    tryAdd(mk('desk', 'desk', win.wall, offset, dSize));
  }

  return placed;
}
```

`src/templates/index.ts`:
```ts
import type { FurnitureItem, Opening, RoomProject, RoomType } from '../core/model';
import { generateBedroom, BEDROOM_LIGHT_GROUPS } from './bedroom';

export interface Template {
  generate(room: RoomProject['room'], openings: Opening[]): FurnitureItem[];
  lightGroups: string[];
}

// План 1: реализована только спальня; остальные типы добавит план 2
export const TEMPLATES: Partial<Record<RoomType, Template>> = {
  bedroom: { generate: generateBedroom, lightGroups: BEDROOM_LIGHT_GROUPS },
};
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npm test`
Expected: PASS. Если сеточный тест падает на конкретной комбинации размеров — не ослаблять тест, а чинить правила шаблона (это его смысл).

- [ ] **Step 5: Commit**

```bash
git add src/templates/bedroom.ts src/templates/index.ts tests/bedroom.test.ts
git commit -m "feat: шаблон спальни — автоРасстановка с проверкой валидности"
```

---

### Task 12: Сборка сцены + применение света

**Files:**
- Create: `src/scene/assemble.ts`
- Test: `tests/assemble.test.ts`

- [ ] **Step 1: Написать падающие тесты**

`tests/assemble.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { assembleScene, applyLightingToScene } from '../src/scene/assemble';
import { defaultProject } from '../src/core/model';
import { generateBedroom, BEDROOM_LIGHT_GROUPS } from '../src/templates/bedroom';

function makeProject() {
  const p = defaultProject('bedroom', 4000, 5000);
  p.openings.push({ kind: 'door', wall: 0, offset: 100, width: 800, height: 2100 });
  p.furniture = generateBedroom(p.room, p.openings);
  p.lighting.groups = BEDROOM_LIGHT_GROUPS.map((id) => ({ id, on: true, brightness: 0.8 }));
  return p;
}

describe('assembleScene', () => {
  it('сцена содержит оболочку, мебель и свет', () => {
    const a = assembleScene(makeProject());
    expect(a.scene.getObjectByName('shell')).toBeTruthy();
    expect(a.scene.getObjectByName('furniture-bed')).toBeTruthy();
    expect(a.sun).toBeTruthy();
    for (const gid of BEDROOM_LIGHT_GROUPS)
      expect(a.groupLights.get(gid)?.length, gid).toBeGreaterThan(0);
  });

  it('applyLightingToScene: выключенная группа гаснет', () => {
    const p = makeProject();
    const a = assembleScene(p);
    const off = { ...p.lighting, groups: p.lighting.groups.map((g) => ({ ...g, on: false })) };
    applyLightingToScene(a, off);
    for (const lights of a.groupLights.values())
      for (const l of lights) expect(l.intensity).toBe(0);
  });

  it('applyLightingToScene: ночь тусклее полдня', () => {
    const p = makeProject();
    const a = assembleScene(p);
    applyLightingToScene(a, { ...p.lighting, sunTime: 13 });
    const day = a.sun.intensity;
    applyLightingToScene(a, { ...p.lighting, sunTime: 3 });
    expect(a.sun.intensity).toBeLessThan(day);
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Реализовать сборку**

`src/scene/assemble.ts`:
```ts
import * as THREE from 'three';
import type { LightingState, RoomProject } from '../core/model';
import { getStyle } from '../core/styles';
import { buildRoomShell } from './shell';
import { FURNITURE_BUILDERS } from '../furniture/builders';
import { kelvinToRGB, sunState } from '../lighting/engine';

const M = (mm: number) => mm / 1000;
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
  if (wantGroups.has('pendants')) {
    const stands = project.furniture.filter((f) => f.type === 'nightstand');
    for (const s of stands) addLight('pendants', M(s.position.x), H - 0.8, M(s.position.z));
    if (stands.length === 0) addLight('pendants', W / 2, H - 0.8, L / 2);
  }
  if (wantGroups.has('accent')) {
    const bed = project.furniture.find((f) => f.type === 'bed');
    if (bed) addLight('accent', M(bed.position.x), 0.15, M(bed.position.z));
    else addLight('accent', W / 2, 0.15, L / 2);
  }

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
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scene/assemble.ts tests/assemble.test.ts
git commit -m "feat: сборка Three.js-сцены из RoomProject с группами света"
```

---

### Task 13: Вьюер (3D + панель света + шаринг)

**Files:**
- Create: `src/ui/viewer.ts`
- Modify: `src/main.ts`

Юнит-тестов на DOM/WebGL нет — проверка ручная (шаги ниже). Логика, которую вьюер вызывает, уже покрыта тестами задач 7 и 12.

- [ ] **Step 1: Реализовать вьюер**

`src/ui/viewer.ts`:
```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { RoomProject } from '../core/model';
import { assembleScene, applyLightingToScene, type AssembledScene } from '../scene/assemble';
import { LIGHT_PRESETS, applyPreset } from '../lighting/engine';
import { encodeShare } from '../core/share';

const GROUP_NAMES: Record<string, string> = {
  ceiling: 'Потолочный', pendants: 'Подвесы', accent: 'Подсветка',
};
const PRESET_NAMES: Record<string, string> = {
  'day': 'День', 'evening-cozy': 'Вечер уютный', 'night-accent': 'Ночь с подсветкой', 'work': 'Рабочий свет',
};

export function mountViewer(root: HTMLElement, project: RoomProject, onSave?: (p: RoomProject) => void) {
  root.innerHTML = `
    <div style="position:relative;flex:1;min-height:0">
      <canvas id="c" style="width:100%;height:100%;display:block"></canvas>
      <div id="views" style="position:absolute;top:8px;left:8px;display:flex;gap:6px;flex-wrap:wrap"></div>
      <button id="share" style="position:absolute;top:8px;right:8px;padding:8px 12px">Поделиться</button>
      <button id="restyle" style="position:absolute;top:48px;right:8px;padding:8px 12px" disabled>Фото-рестайл (скоро)</button>
    </div>
    <div id="light-panel" style="padding:10px;background:#242429;display:flex;flex-direction:column;gap:8px"></div>
  `;

  const canvas = root.querySelector<HTMLCanvasElement>('#c')!;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  let assembled: AssembledScene = assembleScene(project);
  const { W, L, H } = assembled.roomSize;

  const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 100);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(W / 2, H / 3, L / 2);

  const CAMERA_VIEWS: Record<string, [number, number, number]> = {
    'Общий': [W * 1.6, H * 1.8, L * 1.3],
    'От двери': [W / 2, H * 0.6, L * 0.15],
    'Кровать': [W / 2, H * 0.55, L * 0.75],
    'Сверху': [W / 2, H * 3, L / 2 + 0.01],
  };
  const setView = (name: string) => {
    const [x, y, z] = CAMERA_VIEWS[name];
    camera.position.set(x, y, z);
    controls.update();
  };
  const viewsDiv = root.querySelector('#views')!;
  for (const name of Object.keys(CAMERA_VIEWS)) {
    const b = document.createElement('button');
    b.textContent = name;
    b.style.cssText = 'padding:6px 10px';
    b.onclick = () => setView(name);
    viewsDiv.appendChild(b);
  }
  setView('Общий');

  // --- панель света ---
  const panel = root.querySelector<HTMLDivElement>('#light-panel')!;
  const renderPanel = () => {
    const l = project.lighting;
    panel.innerHTML = `
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${Object.keys(LIGHT_PRESETS).map((id) =>
          `<button data-preset="${id}" style="padding:6px 10px;${l.preset === id ? 'outline:2px solid #7af' : ''}">${PRESET_NAMES[id]}</button>`).join('')}
      </div>
      <label>Время суток: <span id="sunv">${l.sunTime}</span>
        <input id="sun" type="range" min="0" max="24" step="0.5" value="${l.sunTime}" style="width:100%"></label>
      <label>Тепло ← → холод (${l.colorTemp}K)
        <input id="temp" type="range" min="2700" max="6500" step="100" value="${l.colorTemp}" style="width:100%"></label>
      <div style="display:flex;gap:14px;flex-wrap:wrap">
        ${l.groups.map((g) => `
          <label style="display:flex;align-items:center;gap:6px">
            <input type="checkbox" data-group-on="${g.id}" ${g.on ? 'checked' : ''}> ${GROUP_NAMES[g.id] ?? g.id}
            <input type="range" data-group-br="${g.id}" min="0" max="1" step="0.05" value="${g.brightness}" style="width:80px">
          </label>`).join('')}
      </div>`;

    panel.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((b) => {
      b.onclick = () => {
        project.lighting = applyPreset(project.lighting, b.dataset.preset!);
        refresh();
      };
    });
    const custom = () => {
      project.lighting.preset = null;
    };
    panel.querySelector<HTMLInputElement>('#sun')!.oninput = (e) => {
      custom();
      project.lighting.sunTime = Number((e.target as HTMLInputElement).value);
      refresh();
    };
    panel.querySelector<HTMLInputElement>('#temp')!.oninput = (e) => {
      custom();
      project.lighting.colorTemp = Number((e.target as HTMLInputElement).value);
      refresh();
    };
    panel.querySelectorAll<HTMLInputElement>('[data-group-on]').forEach((cb) => {
      cb.onchange = () => {
        custom();
        const g = project.lighting.groups.find((g) => g.id === cb.dataset.groupOn)!;
        g.on = cb.checked;
        refresh();
      };
    });
    panel.querySelectorAll<HTMLInputElement>('[data-group-br]').forEach((sl) => {
      sl.oninput = () => {
        custom();
        const g = project.lighting.groups.find((g) => g.id === sl.dataset.groupBr)!;
        g.brightness = Number(sl.value);
        refresh();
      };
    });
  };

  const refresh = () => {
    applyLightingToScene(assembled, project.lighting);
    renderPanel();
    onSave?.(project);
  };
  renderPanel();

  root.querySelector<HTMLButtonElement>('#share')!.onclick = async () => {
    const url = location.origin + location.pathname + encodeShare(project);
    try {
      await navigator.clipboard.writeText(url);
      alert('Ссылка скопирована:\n' + url);
    } catch {
      prompt('Скопируйте ссылку:', url);
    }
  };

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas.parentElement!;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  resize();

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(assembled.scene, camera);
  });
}
```

- [ ] **Step 2: Подключить в main.ts (временно — демо-проект)**

`src/main.ts` (полная замена):
```ts
import { defaultProject } from './core/model';
import { generateBedroom, BEDROOM_LIGHT_GROUPS } from './templates/bedroom';
import { mountViewer } from './ui/viewer';

const app = document.querySelector<HTMLDivElement>('#app')!;

// Временная демо-инициализация; Task 14 заменит это мастером
const p = defaultProject('bedroom', 4000, 5000);
p.openings.push({ kind: 'door', wall: 0, offset: 100, width: 800, height: 2100 });
p.openings.push({ kind: 'window', wall: 2, offset: 1200, width: 1500, height: 1400, sill: 900 });
p.furniture = generateBedroom(p.room, p.openings);
p.lighting.groups = BEDROOM_LIGHT_GROUPS.map((id) => ({ id, on: true, brightness: 0.8 }));
mountViewer(app, p);
```

- [ ] **Step 3: Ручная проверка**

Run: `npm run dev` (run_in_background), открыть URL из вывода.
Expected:
- видна 3D-спальня: кровать с изголовьем у дальней стены, тумбочки, шкаф, стол под окном;
- в стенах видны проёмы двери и окна;
- кнопки ракурсов работают;
- пресеты света заметно меняют картинку («Ночь с подсветкой» — тёмная комната со светом у кровати);
- слайдер времени суток двигает и перекрашивает солнце; слайдер температуры меняет тёплость ламп;
- «Поделиться» копирует ссылку с `#p=`.
Проверить и на телефоне (или в devtools mobile viewport): панель не разваливается.

- [ ] **Step 4: Проверить, что build и тесты зелёные**

Run: `npm test`
Expected: PASS (все прежние).
Run: `npm run build`
Expected: сборка без ошибок TypeScript.

- [ ] **Step 5: Commit**

```bash
git add src/ui/viewer.ts src/main.ts
git commit -m "feat: вьюер — 3D, ракурсы, панель света, шаринг"
```

---

### Task 14: Мастер создания + маршрутизация + автосохранение

**Files:**
- Create: `src/ui/wizard.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Реализовать мастер**

`src/ui/wizard.ts`:
```ts
import { defaultProject, ROOM_NAMES, type Opening, type RoomProject, type RoomType, type WallIndex } from '../core/model';
import { STYLES } from '../core/styles';
import { TEMPLATES } from '../templates/index';

// Мастер: тип → размеры и проёмы → стиль → готово
export function mountWizard(root: HTMLElement, onDone: (p: RoomProject) => void) {
  let type: RoomType = 'bedroom';
  let width = 4000, length = 5000, height = 2700;
  let doorWall: WallIndex = 0, doorOffset = 100;
  let winWall: WallIndex = 2, winOffset = 1200, winWidth = 1500, hasWindow = true;
  let palette = 'beige-minimal';

  const page = (html: string) => {
    root.innerHTML = `<div style="max-width:480px;margin:0 auto;padding:16px;display:flex;flex-direction:column;gap:12px">${html}</div>`;
  };

  const step1 = () => {
    page(`
      <h2>Какая комната?</h2>
      ${(Object.keys(ROOM_NAMES) as RoomType[]).map((t) => {
        const ready = Boolean(TEMPLATES[t]);
        return `<button data-t="${t}" ${ready ? '' : 'disabled'} style="padding:14px;font-size:16px">
          ${ROOM_NAMES[t]}${ready ? '' : ' (скоро)'}</button>`;
      }).join('')}`);
    root.querySelectorAll<HTMLButtonElement>('[data-t]').forEach((b) => {
      b.onclick = () => { type = b.dataset.t as RoomType; step2(); };
    });
  };

  const num = (id: string) => Number(root.querySelector<HTMLInputElement>(`#${id}`)!.value);

  const step2 = () => {
    page(`
      <h2>Размеры и проёмы</h2>
      <label>Ширина, мм <input id="w" type="number" value="${width}" style="width:100%;padding:8px"></label>
      <label>Длина, мм <input id="l" type="number" value="${length}" style="width:100%;padding:8px"></label>
      <label>Высота потолка, мм <input id="h" type="number" value="${height}" style="width:100%;padding:8px"></label>
      <h3>Дверь</h3>
      <label>Стена (0–3, по часовой) <input id="dw" type="number" min="0" max="3" value="${doorWall}" style="width:100%;padding:8px"></label>
      <label>Отступ от угла, мм <input id="do" type="number" value="${doorOffset}" style="width:100%;padding:8px"></label>
      <h3>Окно</h3>
      <label><input id="hw" type="checkbox" ${hasWindow ? 'checked' : ''}> Есть окно</label>
      <label>Стена <input id="ww" type="number" min="0" max="3" value="${winWall}" style="width:100%;padding:8px"></label>
      <label>Отступ, мм <input id="wo" type="number" value="${winOffset}" style="width:100%;padding:8px"></label>
      <label>Ширина окна, мм <input id="wd" type="number" value="${winWidth}" style="width:100%;padding:8px"></label>
      <button id="next" style="padding:14px;font-size:16px">Дальше</button>`);
    root.querySelector<HTMLButtonElement>('#next')!.onclick = () => {
      width = num('w'); length = num('l'); height = num('h');
      doorWall = num('dw') as WallIndex; doorOffset = num('do');
      hasWindow = root.querySelector<HTMLInputElement>('#hw')!.checked;
      winWall = num('ww') as WallIndex; winOffset = num('wo'); winWidth = num('wd');
      step3();
    };
  };

  const step3 = () => {
    page(`
      <h2>Стиль</h2>
      ${STYLES.map((s) => `
        <button data-s="${s.id}" style="padding:14px;font-size:16px;display:flex;align-items:center;gap:10px">
          <span style="width:56px;height:24px;border-radius:4px;background:linear-gradient(90deg,
            #${s.floor.toString(16).padStart(6, '0')},
            #${s.wall.toString(16).padStart(6, '0')},
            #${s.facade.toString(16).padStart(6, '0')})"></span>
          ${s.name}</button>`).join('')}`);
    root.querySelectorAll<HTMLButtonElement>('[data-s]').forEach((b) => {
      b.onclick = () => { palette = b.dataset.s!; finish(); };
    });
  };

  const finish = () => {
    const p = defaultProject(type, width, length, height);
    p.style.palette = palette;
    const openings: Opening[] = [
      { kind: 'door', wall: doorWall, offset: doorOffset, width: 800, height: 2100 },
    ];
    if (hasWindow) openings.push({ kind: 'window', wall: winWall, offset: winOffset, width: winWidth, height: 1400, sill: 900 });
    p.openings = openings;
    const tpl = TEMPLATES[type]!;
    p.furniture = tpl.generate(p.room, p.openings);
    p.lighting.groups = tpl.lightGroups.map((id) => ({ id, on: true, brightness: 0.8 }));
    onDone(p);
  };

  step1();
}
```

- [ ] **Step 2: Маршрутизация и автосохранение в main.ts**

`src/main.ts` (полная замена):
```ts
import { LocalStorageStore } from './core/store';
import { decodeShare } from './core/share';
import { mountViewer } from './ui/viewer';
import { mountWizard } from './ui/wizard';
import type { RoomProject } from './core/model';

const app = document.querySelector<HTMLDivElement>('#app')!;
const store = new LocalStorageStore();
const CURRENT_ID = 'current';

function openViewer(p: RoomProject) {
  mountViewer(app, p, (proj) => void store.save(CURRENT_ID, proj));
}

async function boot() {
  // 1. Ссылка-шаринг имеет приоритет
  const shared = decodeShare(location.hash);
  if (shared) return openViewer(shared);
  // 2. Последний проект
  const saved = await store.load(CURRENT_ID);
  if (saved) return openViewer(saved);
  // 3. Мастер
  mountWizard(app, (p) => {
    void store.save(CURRENT_ID, p);
    openViewer(p);
  });
}

void boot();
```

Примечание: кнопка «Новая комната» (сброс current и возврат в мастер) сознательно отложена в план 3; пока новый проект — очистить localStorage сайта или открыть в приватном окне.

- [ ] **Step 3: Ручная проверка полного цикла**

Run: `npm run dev` (если не запущен), открыть URL **в приватном окне** (чистый localStorage).
Expected:
- открывается мастер: «Спальня» активна, остальные — «(скоро)»;
- ввод размеров 3500×4500, дверь стена 0, окно стена 2 → выбор стиля «Тёмный контраст» → открывается 3D в тёмном стиле;
- перезагрузка страницы (F5) — открывается сразу вьюер с тем же проектом (автосохранение работает);
- «Поделиться» → открыть ссылку в другом приватном окне → та же комната.

- [ ] **Step 4: Тесты и сборка зелёные**

Run: `npm test && npm run build`
Expected: PASS, сборка без ошибок.

- [ ] **Step 5: Commit**

```bash
git add src/ui/wizard.ts src/main.ts
git commit -m "feat: мастер создания комнаты, маршрутизация, автосохранение"
```

---

### Task 15: Деплой на GitHub Pages

**Files:**
- Create: `.github/workflows/pages.yml`
- Modify: `vite.config.ts` (base)

**Внимание:** публикация публичного репозитория — внешнее действие. Перед `gh repo create` подтвердить у пользователя имя репозитория и публичность (по образцу kuhnya-3d он уже соглашался на public).

- [ ] **Step 1: Workflow для Pages**

`.github/workflows/pages.yml`:
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [master, main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Проверить base в vite.config.ts**

`base: './'` уже стоит с Task 1 — относительные пути работают на Pages без указания имени репозитория. Убедиться, что это так.

- [ ] **Step 3: Создать репозиторий и запушить (после подтверждения пользователя)**

```bash
gh repo create interior3d --public --source . --push
```
Expected: репозиторий создан, ветка запушена, Actions запустился.
Затем включить Pages: Settings → Pages → Source: GitHub Actions (или `gh api -X POST repos/{owner}/interior3d/pages -f build_type=workflow`).

- [ ] **Step 4: Проверить живой сайт**

Run: `gh run watch` до зелёного, затем открыть `https://<owner>.github.io/interior3d/`.
Expected: мастер открывается, полный цикл из Task 14 работает на живом URL. Проверить с телефона.

- [ ] **Step 5: Commit (workflow) и запись в журнал**

```bash
git add .github/workflows/pages.yml
git commit -m "ci: деплой на GitHub Pages"
git push
```
Обновить `CONTEXT.md` в `ClaudeC/kuhnya`: ссылка на живой сайт, статус плана 1.

---

## Self-review (выполнен при написании плана)

- **Покрытие спеки:** модель+валидация (§4) — Task 2–3; стор (§3, §10) — Task 4; шаринг (§10) — Task 5; стили (§6) — Task 6; освещение, все 4 механизма (§8) — Task 7, 12, 13; оболочка с проёмами (§5) — Task 9; процедурная мебель (§7) — Task 10; шаблон с валидной раскладкой (§5, §12) — Task 11; мастер и поток (§9) — Task 14; деплой — Task 15. Кнопка-заглушка фото-рестайла (§3) — в вьюере Task 13. Не покрыто планом 1 (сознательно, отдельные планы): 3 остальных шаблона, редактирование мебели тапом, скриншот-тесты Playwright.
- **Плейсхолдеры:** код полный во всех задачах; UI-задачи проверяются вручную по чек-листу — это осознанное решение для WebGL/DOM.
- **Согласованность типов:** `placeAtWall` (Task 8) используется шаблоном (Task 11) с теми же сигнатурами; `LightingState.groups` (Task 2) совпадает с ожиданиями `applyPreset` (Task 7) и `applyLightingToScene` (Task 12); имена групп `ceiling/pendants/accent` согласованы между Task 7, 11, 12, 13.
