// Скриншоты всех 4 комнат × 2 пресета света. Использование:
//   npm run dev   (в другом терминале)
//   npm run shots [-- http://localhost:5173/]
// Кадры пишутся в ./shots/ (в .gitignore).
//
// Playwright: установите локально (npm i -D playwright) либо укажите путь
// к глобальной установке через переменную окружения PLAYWRIGHT_HOME, например:
//   set PLAYWRIGHT_HOME=%APPDATA%\npm\node_modules\playwright        (Windows cmd)
//   $env:PLAYWRIGHT_HOME="$env:APPDATA\npm\node_modules\playwright"  (PowerShell)
import { mkdirSync } from 'node:fs';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  const p = process.env.PLAYWRIGHT_HOME; // путь к глобальной установке playwright
  if (!p) {
    console.error('playwright не найден. Установите его (npm i -D playwright) или задайте PLAYWRIGHT_HOME=путь к глобальному пакету playwright');
    process.exit(1);
  }
  ({ chromium } = await import('file://' + p.replaceAll('\\', '/') + '/index.mjs'));
}

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
