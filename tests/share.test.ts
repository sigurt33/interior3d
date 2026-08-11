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
