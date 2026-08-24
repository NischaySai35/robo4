// Driver Registry — body role definitions with default physics + per-type props.
// Custom drivers created at runtime are merged in by the Inspector from localStorage.

export interface DriverPropDef {
  key: string;
  label: string;
  type: 'number' | 'text' | 'boolean';
  default: number | string | boolean;
  unit?: string;
}

export interface DriverPhysicsDefaults {
  mass: number;            // kg
  currentLimitMin: number; // mA
  currentLimitMax: number; // mA
  torqueLimit: number;     // N·m
}

export interface DriverDef {
  label: string;
  icon: string;
  defaults: DriverPhysicsDefaults;
  props: DriverPropDef[];
}

export const BUILT_IN_DRIVERS: Record<string, DriverDef> = {
  normal: {
    label: 'Normal', icon: '⬡',
    defaults: { mass: 0.05, currentLimitMin: 6, currentLimitMax: 1000, torqueLimit: 2.5 },
    props: [],
  },
  motor: {
    label: 'Motor', icon: '⚙',
    defaults: { mass: 0.12, currentLimitMin: 6, currentLimitMax: 1500, torqueLimit: 5.0 },
    props: [
      { key: 'rpm', label: 'RPM', type: 'number', default: 100 },
      { key: 'gearRatio', label: 'Gear Ratio', type: 'number', default: 1 },
    ],
  },
  camera: {
    label: 'Camera', icon: '⬛',
    defaults: { mass: 0.03, currentLimitMin: 6, currentLimitMax: 500, torqueLimit: 0 },
    props: [
      { key: 'fov', label: 'FOV', type: 'number', default: 60, unit: '°' },
      { key: 'resolution', label: 'Resolution', type: 'text', default: '640×480' },
    ],
  },
  speaker: {
    label: 'Speaker', icon: '◎',
    defaults: { mass: 0.04, currentLimitMin: 6, currentLimitMax: 800, torqueLimit: 0 },
    props: [
      { key: 'wattage', label: 'Wattage', type: 'number', default: 5, unit: 'W' },
      { key: 'freqRange', label: 'Freq range', type: 'text', default: '100Hz–20kHz' },
    ],
  },
  sensor: {
    label: 'Sensor', icon: '◈',
    defaults: { mass: 0.02, currentLimitMin: 6, currentLimitMax: 300, torqueLimit: 0 },
    props: [
      { key: 'sensorType', label: 'Type', type: 'text', default: 'IMU' },
      { key: 'sampleRate', label: 'Sample rate', type: 'number', default: 100, unit: 'Hz' },
    ],
  },
  structural: {
    label: 'Structural', icon: '▣',
    defaults: { mass: 0.08, currentLimitMin: 0, currentLimitMax: 0, torqueLimit: 0 },
    props: [
      { key: 'material', label: 'Material', type: 'text', default: 'Aluminum' },
    ],
  },
};

const CUSTOM_KEY = 'tetrobot:custom-drivers';

export function loadCustomDrivers(): Record<string, DriverDef> {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveCustomDriver(id: string, def: DriverDef) {
  const existing = loadCustomDrivers();
  existing[id] = def;
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(existing));
}

export function deleteCustomDriver(id: string) {
  const existing = loadCustomDrivers();
  delete existing[id];
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(existing));
}

export function getAllDrivers(): Record<string, DriverDef> {
  return { ...BUILT_IN_DRIVERS, ...loadCustomDrivers() };
}
