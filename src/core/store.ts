import type { RoomProject } from './model';
import { validateProject } from './validate';

export interface ProjectListEntry {
  id: string;
  name: string;
  updated: string;
}

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
