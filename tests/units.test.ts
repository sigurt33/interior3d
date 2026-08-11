import { describe, it, expect } from 'vitest';
import { M } from '../src/core/units';

describe('units', () => {
  it('M конвертирует мм в метры', () => {
    expect(M(1000)).toBe(1);
    expect(M(2500)).toBe(2.5);
    expect(M(0)).toBe(0);
  });
});
