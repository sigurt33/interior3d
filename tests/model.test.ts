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
