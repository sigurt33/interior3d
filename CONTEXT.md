# interior3d — Контекст проекта

## Описание
Веб-конструктор интерьеров на базе Three.js. SPA без сервера.

## Статус
- **Ветка**: `plan-1-mvp`
- **Последний коммит**: `6e1b0de` — feat: модель RoomProject и defaultProject

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

## Следующие шаги
- Task 3: Базовая сцена Three.js
- Task 4: Renderering 3D стен и полов
- Task 5: UI слой (Canvas + HTML layout)
