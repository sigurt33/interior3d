import { describe, it, expect } from 'vitest';
import { validateProject } from '../src/core/validate';
import { defaultProject } from '../src/core/model';

describe('validateProject', () => {
  it('принимает валидный проект', () => {
    const r = validateProject(defaultProject('bedroom', 4000, 5000));
    expect(r.ok).toBe(true);
  });

  it('отклоняет не-объект', () => {
    expect(validateProject('мусор').ok).toBe(false);
    expect(validateProject(null).ok).toBe(false);
  });

  it('отклоняет неверную версию', () => {
    const p = defaultProject('bedroom', 4000, 5000) as any;
    p.meta.version = 99;
    const r = validateProject(p);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toContain('version');
  });

  it('отклоняет размеры вне диапазона', () => {
    const p = defaultProject('bedroom', 500, 5000);
    expect(validateProject(p).ok).toBe(false);
  });

  it('отклоняет битый проём', () => {
    const p = defaultProject('bedroom', 4000, 5000) as any;
    p.openings.push({ kind: 'люк', wall: 7, offset: 0, width: 800, height: 2000 });
    expect(validateProject(p).ok).toBe(false);
  });
});
