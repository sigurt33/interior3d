import type { LightingState } from '../core/model';

export interface RGB { r: number; g: number; b: number }

// Аппроксимация Таннера Хелланда, вход 1000..40000 K, выход 0..1
export function kelvinToRGB(kelvin: number): RGB {
  const t = kelvin / 100;
  let r: number, g: number, b: number;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }
  const clamp = (x: number) => Math.max(0, Math.min(255, x)) / 255;
  return { r: clamp(r), g: clamp(g), b: clamp(b) };
}

export interface SunState {
  intensity: number;
  color: RGB;
  position: { x: number; y: number; z: number }; // метры, относительно центра комнаты
}

export function sunState(time: number): SunState {
  if (time < 6 || time > 21) {
    // ночь: слабая холодная «луна»
    return { intensity: 0.06, color: { r: 0.55, g: 0.65, b: 1 }, position: { x: 5, y: 10, z: 5 } };
  }
  const dayT = (time - 6) / 15; // 0..1 за световой день
  const elevation = Math.sin(dayT * Math.PI); // 0 → 1 → 0
  const kelvin = 2200 + elevation * 4300; // рассвет/закат 2200K → полдень 6500K
  const azimuth = dayT * Math.PI; // восток → запад
  return {
    intensity: 0.15 + elevation * 0.85,
    color: kelvinToRGB(kelvin),
    position: {
      x: Math.cos(azimuth) * 10,
      y: 1.5 + elevation * 9,
      z: -Math.sin(azimuth) * 10,
    },
  };
}

interface PresetDef {
  sunTime: number;
  colorTemp: number;
  groups: Record<string, { on: boolean; brightness: number }>;
}

export const LIGHT_PRESETS: Record<string, PresetDef> = {
  'day': {
    sunTime: 13, colorTemp: 4500,
    groups: { ceiling: { on: false, brightness: 0.5 }, pendants: { on: false, brightness: 0.5 }, accent: { on: false, brightness: 0.5 } },
  },
  'evening-cozy': {
    sunTime: 20, colorTemp: 2700,
    groups: { ceiling: { on: true, brightness: 0.35 }, pendants: { on: true, brightness: 0.7 }, accent: { on: true, brightness: 0.8 } },
  },
  'night-accent': {
    sunTime: 23, colorTemp: 2700,
    groups: { ceiling: { on: false, brightness: 0.3 }, pendants: { on: false, brightness: 0.3 }, accent: { on: true, brightness: 1 } },
  },
  'work': {
    sunTime: 13, colorTemp: 5500,
    groups: { ceiling: { on: true, brightness: 1 }, pendants: { on: true, brightness: 1 }, accent: { on: false, brightness: 0.5 } },
  },
};

export function applyPreset(state: LightingState, presetId: string): LightingState {
  const def = LIGHT_PRESETS[presetId];
  if (!def) return { ...state, groups: state.groups.map((g) => ({ ...g })) };
  return {
    preset: presetId,
    sunTime: def.sunTime,
    colorTemp: def.colorTemp,
    groups: state.groups.map((g) => {
      const pg = def.groups[g.id];
      return pg ? { ...g, on: pg.on, brightness: pg.brightness } : { ...g };
    }),
  };
}
