import { describe, it, expect } from 'vitest';
import { STYLES, getStyle } from '../src/core/styles';

describe('styles', () => {
  it('есть 4 стиля, первый — бежевый минимализм', () => {
    expect(STYLES).toHaveLength(4);
    expect(STYLES[0].id).toBe('beige-minimal');
  });

  it('getStyle находит по id и падает в дефолт', () => {
    expect(getStyle('scandi').id).toBe('scandi');
    expect(getStyle('несуществующий').id).toBe('beige-minimal');
  });
});
