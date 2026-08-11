# interior3d — Контекст проекта

## Описание
Веб-конструктор интерьеров на базе Three.js. SPA без сервера.

## Статус
- **Ветка**: `plan-1-mvp`
- **Последний коммит**: `3eb02b8` — feat: шаринг проекта через lz-string в URL-hash

## Task 1: Каркас проекта (DONE)

### Что сделано
- Созданы все файлы каркаса согласно спецификации:
  - `package.json` — зависимости (three, lz-string, типы) и скрипты
  - `tsconfig.json` — конфиг TypeScript (ES2022, strict mode)
  - `vite.config.ts` — конфиг Vite с поддержкой Vitest
  - `index.html` — точка входа, стили (dark theme)
  - `src/main.ts` — простая проверка работоспособности
  - `.gitignore` — исключения (node_modules, dist)
  - `tests/smoke.test.ts` — smoke-тест 1+1=2

### Результаты проверки
✓ `npm install` — успешно (1635 пакетов)
✓ `npm test` — 1 passed (2ms)
✓ `npm run build` — dist/ собран (0.53 kB, 2 файла)
✓ `git commit` — коммит создан

### Файлы проекта
```
.gitignore
index.html
package.json
package-lock.json
src/main.ts
tests/smoke.test.ts
tsconfig.json
vite.config.ts
```

## Task 2: Модель RoomProject (DONE)

### Что сделано
- Создана система типов всего приложения согласно TDD:
  - Типы: `RoomType`, `OpeningKind`, `WallIndex`, `FurnitureItem`, `LightingState`, `RoomProject`
  - Интерфейсы для дверей/окон/арок (Opening) с поддержкой стен и подоконников
  - Мебель с позицией, размерами и опциями
  - Система освещения с preset, температурой и группами
  - Комнаты с 4 типами (кухня, ванная, спальня, детская)

### Файлы
- `src/core/model.ts` — основные типы и `defaultProject()`
- `tests/model.test.ts` — тесты структуры проекта

### Результаты
✓ `npm test` — 3 passed (smoke.test.ts + 2 теста из model.test.ts)
✓ Все тесты зелёные, коммит создан

## Task 3: Валидация проекта (DONE)

### Что сделано
- Реализована валидация произвольного JSON в RoomProject (защита от мусора в localStorage/шаринг-ссылках)
- TDD подход: тест → красный → реализация → зелёный
- Функция `validateProject(raw: unknown): ValidationResult` с детальными ошибками

### Типы ошибок, которые ловит валидатор
- Не-объект на входе
- Неверная версия мета-информации (должна быть 1)
- Отсутствие/неверность имени проекта
- Неизвестный тип комнаты
- Размеры комнаты вне допустимых диапазонов (1500-30000 мм ширина/длина, 2000-5000 мм высота)
- Неверные проёмы (door/window/arch): стены 0-3, смещение/ширина/высота в допустимых пределах
- Неверная мебель: отсутствие id/type, координаты вне диапазона (-1000 до 31000 мм)
- Отсутствие правильной системы освещения
- Отсутствие палитры стилей

### Файлы
- `src/core/validate.ts` — функция валидации с типами `ValidationResult`
- `tests/validate.test.ts` — 5 падающих тестов (валидный проект, не-объект, версия, размеры, проёмы)

### Результаты
✓ Все 5 новых тестов зелёные
✓ Все 8 тестов проекта зелёные (smoke + model + validate)
✓ Коммит создан: `656d079`

## Task 4: ProjectStore / LocalStorageStore (DONE)

### Что сделано
- Реализована абстракция хранилища проектов согласно TDD
- Интерфейс `ProjectStore` для декаплирования конструктора от реализации (localStorage → серверная позже)
- Класс `LocalStorageStore` с поддержкой инжекции Storage-like объекта (для юнит-тестирования без jsdom)

### Архитектура
- **ProjectListEntry**: `{id, name, updated}` — метаданные для списка проектов
- **ProjectStore** (интерфейс):
  - `list(): Promise<ProjectListEntry[]>` — получить список с метаданными
  - `load(id): Promise<RoomProject | null>` — загрузить проект, null если нет/невалиден
  - `save(id, project): Promise<void>` — сохранить и обновить индекс
  - `remove(id): Promise<void>` — удалить проект и обновить индекс
- **LocalStorageStore**:
  - Хранит проекты под ключами `interior3d:project:{id}`
  - Индекс под `interior3d:index` (JSON массив ProjectListEntry)
  - При save: валидирует, сохраняет, обновляет timestamp
  - При load: валидирует через `validateProject()`, возвращает null при ошибке

### Особенности
- Все методы async (готово к серверной реализации)
- Валидация при load (защита от порченых данных)
- Инжекция хранилища — тестируется с Map вместо localStorage
- Error handling: JSON.parse, валидация — всё возвращает null/empty

### Файлы
- `src/core/store.ts` — интерфейсы и LocalStorageStore
- `tests/store.test.ts` — 3 теста (save+list+load, remove, load несуществующего)

### Результаты
✓ Все 11 тестов зелёные (smoke + model + validate + 3 новых store)
✓ Коммит: `20a4da6`

## Task 5: Шаринг ссылкой через lz-string (DONE)

### Что сделано
- Реализована система шаринга проектов через URL-hash согласно TDD строго
- Функция `encodeShare(project: RoomProject): string` — сжимает JSON через lz-string, результат вида `#p=...`
- Функция `decodeShare(hash: string): RoomProject | null` — извлекает и разжимает, валидирует через `validateProject()`
- Использование встроенной библиотеки lz-string (уже в dependencies)

### Механизм
- Проект JSON → `JSON.stringify()` → `compressToEncodedURIComponent()` → помещается в hash после `#p=`
- При декодировании: парсинг hash regex → `decompressFromEncodedURIComponent()` → `JSON.parse()` → валидация
- Обработка ошибок: возвращает null при неверном формате, битом JSON, невалидном проекте

### Файлы
- `src/core/share.ts` — функции кодирования/декодирования
- `tests/share.test.ts` — 2 теста (кодирование без потерь, отклонение мусора)

### Результаты
✓ Все 13 тестов зелёные (11 старых + 2 новых)
✓ Коммит: `3eb02b8`

## Task 6: Стили интерьера (DONE)

### Что сделано
- Реализована система стилей согласно TDD строго
- 4 именованных стиля: палитра цветов для 7 категорий материалов
- Интерфейс `StyleDef` с полями для пола, стен, потолка, фасадов, акцентов, дерева, текстиля
- Функция `getStyle(id)` — поиск по id с fallback на первый стиль (Бежевый минимализм)

### Стили (палитры hex-цветов для THREE.MeshStandardMaterial)
1. **Бежевый минимализм** (id: `beige-minimal`) — дефолтный
   - Пол 0xb8a98f (тёмный бежевый), стены 0xe8e0d2 (светлый крем), потолок 0xf5f2ec
   - Фасады 0xd8cbb4, акценты 0x222222 (чёрный), дерево 0x9a7b52, текстиль 0xcfc6b8
2. **Светлая классика** (id: `light-classic`)
   - Пол 0xc9b795, стены 0xf2ede2, потолок 0xfaf7f0
   - Фасады 0xffffff (белый), акценты 0xb08d57 (бронза), дерево 0x8a6a48, текстиль 0xe6ddd0
3. **Тёмный контраст** (id: `dark-contrast`)
   - Пол 0x5a4a3a (тёмный), стены 0x3a3a40 (тёмно-серый), потолок 0xd8d8d8
   - Фасады 0x2e2e33 (почти чёрный), акценты 0xc9a227 (золото), дерево 0x6b4f35, текстиль 0x8a8a92
4. **Скандинавский** (id: `scandi`)
   - Пол 0xd9cbb0, стены 0xf5f5f2 (молоко), потолок 0xffffff (белый)
   - Фасады 0xffffff (белый), акценты 0x4a4a4a (серый), дерево 0xc4a878, текстиль 0xdde3e6

### Файлы
- `src/core/styles.ts` — интерфейс `StyleDef`, массив `STYLES`, функция `getStyle()`
- `tests/styles.test.ts` — 2 теста (количество и первый id, поиск с fallback)

### Результаты
✓ npm test: 15 passed (6 тестовых файлов: smoke + model + validate + store + share + styles)
✓ Коммит: `cd6885c`

## Следующие шаги
- Task 7: Конструктор Application (инжекция ProjectStore, управление состоянием, работа с URL-hash)
- Task 8: Базовая сцена Three.js
- Task 9: Rendering 3D стен и полов
- Task 10: UI слой (Canvas + HTML layout)
