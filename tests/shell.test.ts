import { describe, it, expect } from 'vitest';
import { buildWallWithOpenings, buildRoomShell } from '../src/scene/shell';
import { defaultProject } from '../src/core/model';
import { getStyle } from '../src/core/styles';
import * as THREE from 'three';

const mat = new THREE.MeshStandardMaterial();

describe('buildWallWithOpenings', () => {
  it('глухая стена — 1 сегмент', () => {
    const g = buildWallWithOpenings(4, 2.7, [], mat);
    expect(g.children).toHaveLength(1);
  });

  it('дверь — 2 простенка + перемычка', () => {
    const g = buildWallWithOpenings(4, 2.7, [
      { kind: 'door', wall: 0, offset: 1000, width: 800, height: 2100 },
    ], mat);
    expect(g.children).toHaveLength(3);
  });

  it('окно — 2 простенка + перемычка + подоконная часть', () => {
    const g = buildWallWithOpenings(4, 2.7, [
      { kind: 'window', wall: 0, offset: 1000, width: 1500, height: 1400, sill: 900 },
    ], mat);
    expect(g.children).toHaveLength(4);
  });

  it('дверь в самом углу — без нулевых сегментов', () => {
    const g = buildWallWithOpenings(4, 2.7, [
      { kind: 'door', wall: 0, offset: 0, width: 800, height: 2100 },
    ], mat);
    expect(g.children).toHaveLength(2); // правый простенок + перемычка
  });
});

describe('buildRoomShell', () => {
  it('пол + потолок + 4 стены', () => {
    const p = defaultProject('bedroom', 4000, 5000);
    p.openings.push({ kind: 'door', wall: 0, offset: 100, width: 800, height: 2100 });
    const shell = buildRoomShell(p, getStyle('beige-minimal'));
    const walls = shell.children.filter((c) => c.name.startsWith('wall'));
    expect(walls).toHaveLength(4);
    expect(shell.children.find((c) => c.name === 'floor')).toBeTruthy();
    expect(shell.children.find((c) => c.name === 'ceiling')).toBeTruthy();
    // стена 0 с дверью — 3 сегмента
    expect((walls.find((w) => w.name === 'wall-0') as THREE.Group).children).toHaveLength(3);
  });
});
