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
