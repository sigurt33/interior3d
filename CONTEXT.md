# interior3d — Контекст проекта

## Описание
Веб-конструктор интерьеров на базе Three.js. SPA без сервера.

## Статус
- **Ветка**: `plan-1-mvp`
- **Последний коммит**: `20a4da6` — feat: интерфейс ProjectStore и LocalStorageStore

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

## Следующие шаги
- Task 5: Конструктор Application (инжекция ProjectStore, управление состоянием)
- Task 6: Базовая сцена Three.js
- Task 7: Rendering 3D стен и полов
- Task 8: UI слой (Canvas + HTML layout)
