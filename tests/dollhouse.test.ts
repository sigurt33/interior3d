import { describe, it, expect } from 'vitest';
import { wallVisibleFor } from '../src/scene/dollhouse';

// Комната 4×5 м (метры, как в сцене)
const W = 4, L = 5;

describe('dollhouse', () => {
  it('камера внутри комнаты — все стены видимы', () => {
    for (let i = 0; i < 4; i++)
      expect(wallVisibleFor(i, { x: 2, y: 1.5, z: 2.5 }, W, L), `wall-${i}`).toBe(true);
  });

  it('камера снаружи за углом — две ближние стены скрыты', () => {
    const cam = { x: W * 1.6, y: 4, z: L * 1.3 }; // внешний угол у стен 1 и 2
    expect(wallVisibleFor(1, cam, W, L)).toBe(false);
    expect(wallVisibleFor(2, cam, W, L)).toBe(false);
    expect(wallVisibleFor(0, cam, W, L)).toBe(true);
    expect(wallVisibleFor(3, cam, W, L)).toBe(true);
  });

  it('камера сверху по центру — все стены видимы', () => {
    for (let i = 0; i < 4; i++)
      expect(wallVisibleFor(i, { x: W / 2, y: 7, z: L / 2 }, W, L), `wall-${i}`).toBe(true);
  });
});
