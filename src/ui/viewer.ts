import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { RoomProject } from '../core/model';
import { assembleScene, applyLightingToScene, disposeAssembled, type AssembledScene } from '../scene/assemble';
import { LIGHT_PRESETS, applyPreset } from '../lighting/engine';
import { encodeShare } from '../core/share';
import { wallVisibleFor } from '../scene/dollhouse';
import { pickFurnitureAt, setHighlight } from '../scene/picking';
import { nudgeItem, removeItem, resetFurniture } from '../core/edit';

function showToast(root: HTMLElement, text: string): void {
  const t = document.createElement('div');
  t.textContent = text;
  t.style.cssText = 'position:absolute;bottom:12px;left:50%;transform:translateX(-50%);'
    + 'background:#333;color:#fff;padding:10px 16px;border-radius:8px;z-index:10;max-width:90%';
  root.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

const GROUP_NAMES: Record<string, string> = {
  ceiling: 'Потолочный', pendants: 'Подвесы', accent: 'Подсветка', spots: 'Споты', mirror: 'Подсветка зеркала',
};
const PRESET_NAMES: Record<string, string> = {
  'day': 'День', 'evening-cozy': 'Вечер уютный', 'night-accent': 'Ночь с подсветкой', 'work': 'Рабочий свет',
};
const ITEM_NAMES: Record<string, string> = {
  bed: 'Кровать', nightstand: 'Тумбочка', wardrobe: 'Шкаф', desk: 'Стол',
  fridge: 'Холодильник', kitchenRun: 'Кухонная линия', hood: 'Вытяжка',
  roundTable: 'Обеденный стол', chair: 'Стул',
  vanity: 'Тумба с зеркалом', bathtub: 'Ванна', shower: 'Душевая', toilet: 'Унитаз',
  kidBed: 'Детская кровать', toyShelf: 'Стеллаж',
};

export function mountViewer(root: HTMLElement, project: RoomProject, onSave?: (p: RoomProject) => void, onNewRoom?: () => void) {
  root.innerHTML = `
    <div style="position:relative;flex:1;min-height:0">
      <canvas id="c" style="width:100%;height:100%;display:block"></canvas>
      <div id="views" style="position:absolute;top:8px;left:8px;display:flex;gap:6px;flex-wrap:wrap"></div>
      <button id="share" style="position:absolute;top:8px;right:8px;padding:8px 12px">Поделиться</button>
      <button id="restyle" style="position:absolute;top:48px;right:8px;padding:8px 12px" disabled>Фото-рестайл (скоро)</button>
      <button id="new-room" style="position:absolute;top:88px;right:8px;padding:8px 12px">Новая комната</button>
    </div>
    <div id="light-panel" style="padding:10px;background:#242429;display:flex;flex-direction:column;gap:8px"></div>
  `;

  const canvas = root.querySelector<HTMLCanvasElement>('#c')!;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  let assembled: AssembledScene = assembleScene(project);
  const { W, L, H } = assembled.roomSize;

  let selectedId: string | null = null;

  const rebuild = () => {
    disposeAssembled(assembled);
    assembled = assembleScene(project);
    if (selectedId && !project.furniture.some((f) => f.id === selectedId)) selectedId = null;
    if (selectedId) setHighlight(assembled.scene, selectedId);
    onSave?.(project);
  };

  const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 100);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(W / 2, H / 3, L / 2);

  const CAMERA_VIEWS: Record<string, [number, number, number]> = {
    'Общий': [W * 1.5, H * 1.6, L * 1.25],
    'От двери': [W / 2, H * 0.6, L * 0.15],
    'Детали': [W / 2, H * 0.55, L * 0.75],
    'Сверху': [W / 2, H * 2.5, L / 2 + 0.01],
  };
  const setView = (name: string) => {
    const [x, y, z] = CAMERA_VIEWS[name];
    camera.position.set(x, y, z);
    controls.update();
  };
  const viewsDiv = root.querySelector('#views')!;
  for (const name of Object.keys(CAMERA_VIEWS)) {
    const b = document.createElement('button');
    b.textContent = name;
    b.style.cssText = 'padding:6px 10px';
    b.onclick = () => setView(name);
    viewsDiv.appendChild(b);
  }
  setView('Общий');

  // --- выбор предмета кликом (отличаем от вращения OrbitControls порогом смещения) ---
  let downAt: { x: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    if (moved > 8) return; // вращение камеры, не клик
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    selectedId = pickFurnitureAt(ndcX, ndcY, camera, assembled.scene);
    setHighlight(assembled.scene, selectedId);
    renderPanel();
  });

  // --- панель света ---
  const panel = root.querySelector<HTMLDivElement>('#light-panel')!;
  const renderPanel = () => {
    const l = project.lighting;
    panel.innerHTML = `
      ${selectedId ? `
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:6px;background:#333;border-radius:6px">
        <b>${ITEM_NAMES[project.furniture.find((f) => f.id === selectedId)?.type ?? ''] ?? selectedId}</b>
        <button data-move="-x">←</button><button data-move="+x">→</button>
        <button data-move="-z">↑</button><button data-move="+z">↓</button>
        <button data-del style="color:#f88">Убрать</button>
        <button data-desel>✕</button>
      </div>` : `
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <span style="opacity:.6">Тапните по предмету, чтобы подвинуть или убрать</span>
        <button data-reset>Сбросить расстановку</button>
      </div>`}
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${Object.keys(LIGHT_PRESETS).map((id) =>
          `<button data-preset="${id}" style="padding:6px 10px;${l.preset === id ? 'outline:2px solid #7af' : ''}">${PRESET_NAMES[id]}</button>`).join('')}
      </div>
      <label>Время суток: <span id="sunv">${l.sunTime}</span>
        <input id="sun" type="range" min="0" max="24" step="0.5" value="${l.sunTime}" style="width:100%"></label>
      <label>Тепло ← → холод (${l.colorTemp}K)
        <input id="temp" type="range" min="2700" max="6500" step="100" value="${l.colorTemp}" style="width:100%"></label>
      <div style="display:flex;gap:14px;flex-wrap:wrap">
        ${l.groups.map((g) => `
          <label style="display:flex;align-items:center;gap:6px">
            <input type="checkbox" data-group-on="${g.id}" ${g.on ? 'checked' : ''}> ${GROUP_NAMES[g.id] ?? g.id}
            <input type="range" data-group-br="${g.id}" min="0" max="1" step="0.05" value="${g.brightness}" style="width:80px">
          </label>`).join('')}
      </div>`;

    panel.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((b) => {
      b.onclick = () => {
        project.lighting = applyPreset(project.lighting, b.dataset.preset!);
        refresh();
      };
    });
    const custom = () => {
      project.lighting.preset = null;
    };
    panel.querySelector<HTMLInputElement>('#sun')!.oninput = (e) => {
      custom();
      project.lighting.sunTime = Number((e.target as HTMLInputElement).value);
      refresh();
    };
    panel.querySelector<HTMLInputElement>('#temp')!.oninput = (e) => {
      custom();
      project.lighting.colorTemp = Number((e.target as HTMLInputElement).value);
      refresh();
    };
    panel.querySelectorAll<HTMLInputElement>('[data-group-on]').forEach((cb) => {
      cb.onchange = () => {
        custom();
        const g = project.lighting.groups.find((g) => g.id === cb.dataset.groupOn)!;
        g.on = cb.checked;
        refresh();
      };
    });
    panel.querySelectorAll<HTMLInputElement>('[data-group-br]').forEach((sl) => {
      sl.oninput = () => {
        custom();
        const g = project.lighting.groups.find((g) => g.id === sl.dataset.groupBr)!;
        g.brightness = Number(sl.value);
        refresh();
      };
    });

    const STEP = 100; // мм за нажатие
    const MOVES: Record<string, [number, number]> = { '-x': [-STEP, 0], '+x': [STEP, 0], '-z': [0, -STEP], '+z': [0, STEP] };
    panel.querySelectorAll<HTMLButtonElement>('[data-move]').forEach((b) => {
      b.onclick = () => {
        if (!selectedId) return;
        const [dx, dz] = MOVES[b.dataset.move!];
        if (nudgeItem(project, selectedId, dx, dz)) { rebuild(); renderPanel(); }
      };
    });
    const delBtn = panel.querySelector<HTMLButtonElement>('[data-del]');
    if (delBtn) delBtn.onclick = () => {
      if (selectedId && removeItem(project, selectedId)) { selectedId = null; rebuild(); renderPanel(); }
    };
    const deselBtn = panel.querySelector<HTMLButtonElement>('[data-desel]');
    if (deselBtn) deselBtn.onclick = () => { selectedId = null; setHighlight(assembled.scene, null); renderPanel(); };
    const resetBtn = panel.querySelector<HTMLButtonElement>('[data-reset]');
    if (resetBtn) resetBtn.onclick = () => {
      if (resetFurniture(project)) { selectedId = null; rebuild(); renderPanel(); }
    };
  };

  const refresh = () => {
    applyLightingToScene(assembled, project.lighting);
    renderPanel();
    onSave?.(project);
  };
  renderPanel();

  root.querySelector<HTMLButtonElement>('#share')!.onclick = async () => {
    const url = location.origin + location.pathname + encodeShare(project);
    const container = canvas.parentElement!;
    try {
      await navigator.clipboard.writeText(url);
      showToast(container, 'Ссылка скопирована');
    } catch {
      showToast(container, 'Скопируйте ссылку: ' + url);
    }
  };

  root.querySelector<HTMLButtonElement>('#new-room')!.onclick = () => {
    onNewRoom?.();
  };

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas.parentElement!;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  resize();

  renderer.setAnimationLoop(() => {
    controls.update();
    for (let i = 0; i < 4; i++) {
      const wall = assembled.scene.getObjectByName(`wall-${i}`);
      if (wall) wall.visible = wallVisibleFor(i, camera.position, W, L);
    }
    renderer.render(assembled.scene, camera);
  });
}
