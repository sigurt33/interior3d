import { defaultProject, ROOM_NAMES, type Opening, type RoomProject, type RoomType, type WallIndex } from '../core/model';
import { STYLES } from '../core/styles';
import { TEMPLATES } from '../templates/index';

// Мастер: тип → размеры и проёмы → стиль → готово
export function mountWizard(root: HTMLElement, onDone: (p: RoomProject) => void) {
  let type: RoomType = 'bedroom';
  let width = 4000, length = 5000, height = 2700;
  let doorWall: WallIndex = 0, doorOffset = 100;
  let winWall: WallIndex = 2, winOffset = 1200, winWidth = 1500, hasWindow = true;
  let palette = 'beige-minimal';

  const page = (html: string) => {
    root.innerHTML = `<div style="max-width:480px;margin:0 auto;padding:16px;display:flex;flex-direction:column;gap:12px">${html}</div>`;
  };

  const step1 = () => {
    page(`
      <h2>Какая комната?</h2>
      ${(Object.keys(ROOM_NAMES) as RoomType[]).map((t) => {
        const ready = Boolean(TEMPLATES[t]);
        return `<button data-t="${t}" ${ready ? '' : 'disabled'} style="padding:14px;font-size:16px">
          ${ROOM_NAMES[t]}${ready ? '' : ' (скоро)'}</button>`;
      }).join('')}`);
    root.querySelectorAll<HTMLButtonElement>('[data-t]').forEach((b) => {
      b.onclick = () => { type = b.dataset.t as RoomType; step2(); };
    });
  };

  const num = (id: string) => Number(root.querySelector<HTMLInputElement>(`#${id}`)!.value);

  const step2 = () => {
    page(`
      <h2>Размеры и проёмы</h2>
      <label>Ширина, мм <input id="w" type="number" value="${width}" style="width:100%;padding:8px"></label>
      <label>Длина, мм <input id="l" type="number" value="${length}" style="width:100%;padding:8px"></label>
      <label>Высота потолка, мм <input id="h" type="number" value="${height}" style="width:100%;padding:8px"></label>
      <h3>Дверь</h3>
      <label>Стена (0–3, по часовой) <input id="dw" type="number" min="0" max="3" value="${doorWall}" style="width:100%;padding:8px"></label>
      <label>Отступ от угла, мм <input id="do" type="number" value="${doorOffset}" style="width:100%;padding:8px"></label>
      <h3>Окно</h3>
      <label><input id="hw" type="checkbox" ${hasWindow ? 'checked' : ''}> Есть окно</label>
      <label>Стена <input id="ww" type="number" min="0" max="3" value="${winWall}" style="width:100%;padding:8px"></label>
      <label>Отступ, мм <input id="wo" type="number" value="${winOffset}" style="width:100%;padding:8px"></label>
      <label>Ширина окна, мм <input id="wd" type="number" value="${winWidth}" style="width:100%;padding:8px"></label>
      <button id="next" style="padding:14px;font-size:16px">Дальше</button>`);
    root.querySelector<HTMLButtonElement>('#next')!.onclick = () => {
      width = num('w'); length = num('l'); height = num('h');
      doorWall = num('dw') as WallIndex; doorOffset = num('do');
      hasWindow = root.querySelector<HTMLInputElement>('#hw')!.checked;
      winWall = num('ww') as WallIndex; winOffset = num('wo'); winWidth = num('wd');
      step3();
    };
  };

  const step3 = () => {
    page(`
      <h2>Стиль</h2>
      ${STYLES.map((s) => `
        <button data-s="${s.id}" style="padding:14px;font-size:16px;display:flex;align-items:center;gap:10px">
          <span style="width:56px;height:24px;border-radius:4px;background:linear-gradient(90deg,
            #${s.floor.toString(16).padStart(6, '0')},
            #${s.wall.toString(16).padStart(6, '0')},
            #${s.facade.toString(16).padStart(6, '0')})"></span>
          ${s.name}</button>`).join('')}`);
    root.querySelectorAll<HTMLButtonElement>('[data-s]').forEach((b) => {
      b.onclick = () => { palette = b.dataset.s!; finish(); };
    });
  };

  const finish = () => {
    const p = defaultProject(type, width, length, height);
    p.style.palette = palette;
    const openings: Opening[] = [
      { kind: 'door', wall: doorWall, offset: doorOffset, width: 800, height: 2100 },
    ];
    if (hasWindow) openings.push({ kind: 'window', wall: winWall, offset: winOffset, width: winWidth, height: 1400, sill: 900 });
    p.openings = openings;
    const tpl = TEMPLATES[type]!;
    p.furniture = tpl.generate(p.room, p.openings);
    p.lighting.groups = tpl.lightGroups.map((id) => ({ id, on: true, brightness: 0.8 }));
    onDone(p);
  };

  step1();
}
