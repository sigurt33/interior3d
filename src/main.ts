import { LocalStorageStore } from './core/store';
import { decodeShare } from './core/share';
import { mountViewer } from './ui/viewer';
import { mountWizard } from './ui/wizard';
import type { RoomProject } from './core/model';

const app = document.querySelector<HTMLDivElement>('#app')!;
const store = new LocalStorageStore();
const CURRENT_ID = 'current';

// mountViewer вызывается максимум один раз за загрузку страницы (нет навигации
// назад из вьюера) — утечка resize-listener невозможна by design.
function openViewer(p: RoomProject) {
  mountViewer(app, p, (proj) => {
    // автосохранение не должно ронять вьюер (например, QuotaExceededError)
    store.save(CURRENT_ID, proj).catch((e) => console.warn('автосохранение не удалось:', e));
  });
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
    store.save(CURRENT_ID, p).catch((e) => console.warn('сохранение не удалось:', e));
    openViewer(p);
  });
}

void boot();
