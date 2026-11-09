/**
 * espNodesStore — the registry of module ESP32-C3 nodes. This laptop is the master;
 * each MODULE has its own ESP (reached at http://127.0.4.N over the ESP-NOW bridge, or modN.local on Wi-Fi) carrying that module's
 * servos. The servo layer (servoLink / ServoController) routes through here.
 *
 * A node is bound to a module via `componentId`. Servo ids are LOCAL to each
 * ESP, so the same id 1..7 exists on every board — routing is (module → node → id).
 */
import { create } from 'zustand';

export interface EspNode {
  id: string;
  name: string;                 // display, e.g. "Module 1"
  url: string;                  // http://mod1.local
  componentId: string | null;   // which module (component) this board drives
  connected: boolean;
  latencyMs: number | null;
  /** Last /api/telemetry JSON (servos[] + wifi). Null until first reply. */
  telemetry: unknown | null;
}

interface EspNodesState {
  nodes: EspNode[];
  addNode: (n?: Partial<EspNode>) => string;
  updateNode: (id: string, patch: Partial<EspNode>) => void;
  removeNode: (id: string) => void;
  setNodeTelemetry: (id: string, telemetry: unknown, latencyMs: number) => void;
  setNodeConnected: (id: string, ok: boolean, latencyMs?: number | null) => void;
  nodeForModule: (moduleId: string | null | undefined) => EspNode | null;
}

const LS_KEY = 'robo4:espNodes';
const LS_ESPNOW = 'robo4:espNodes:espnow';   // set once the saved addresses were moved to the ESP-NOW bridge

/** Module N through the ESP-NOW bridge (USB dongle, `gos robot bridge`, started with the Studio): http://127.0.4.N.
 *  It answers like the board itself (gos/python/gos/espnow.py module_address). Nischay always plugs the dongle in
 *  (6 Nov 2026), so this is the default; the board's Wi-Fi address (http://modN.local) still works when typed in. */
export const espNowUrl = (n: number) => `http://127.0.4.${n}`;
/** The ESP-NOW gateway's list (gos/python/gos/espnow.py Gateway.status): the modules it hears over the radio, plus every
 *  module's remembered Wi-Fi address (it also searches the network for them: gos hardware.find_modules). */
export const GATEWAY_URL = 'http://127.0.0.1:8790';

// Once: saved http://modN.local -> the bridge address. Only once, so a Wi-Fi address typed in later stays.
function toEspNow(nodes: EspNode[]): EspNode[] {
  try {
    if (localStorage.getItem(LS_ESPNOW)) return nodes;
    localStorage.setItem(LS_ESPNOW, '1');
  } catch { return nodes; }
  const moved = nodes.map((n) => {
    const m = /^https?:\/\/mod(\d{1,3})\.local\/?$/i.exec(n.url);
    return m ? { ...n, url: espNowUrl(Number(m[1])) } : n;
  });
  persist(moved);
  return moved;
}

function load(): EspNode[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (Array.isArray(raw) && raw.length) {
      return toEspNow(raw.map((n) => ({ ...n, connected: false, latencyMs: null, telemetry: null })));
    }
  } catch { /* ignore */ }
  // Seed one default node so a single-board setup works with zero configuration.
  return [{
    id: 'esp_default', name: 'Module 1', url: espNowUrl(1),
    componentId: null, connected: false, latencyMs: null, telemetry: null,
  }];
}

// Persist only the durable fields (not live telemetry/connection).
function persist(nodes: EspNode[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(
      nodes.map(({ id, name, url, componentId }) => ({ id, name, url, componentId })),
    ));
  } catch { /* ignore */ }
}

export const useEspNodesStore = create<EspNodesState>((set, get) => ({
  nodes: load(),

  addNode: (n) => {
    const id = `esp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
    set((s) => {
      const nodes = [...s.nodes, {
        id,
        name: n?.name ?? `Module ${s.nodes.length + 1}`,
        url: n?.url ?? espNowUrl(s.nodes.length + 1),
        componentId: n?.componentId ?? null,
        connected: false, latencyMs: null, telemetry: null,
      }];
      persist(nodes);
      return { nodes };
    });
    return id;
  },
  updateNode: (id, patch) => set((s) => {
    const nodes = s.nodes.map((nd) => (nd.id === id ? { ...nd, ...patch } : nd));
    // Persist when a durable field changed (url/name/binding), not for telemetry churn.
    if ('url' in patch || 'name' in patch || 'componentId' in patch) persist(nodes);
    return { nodes };
  }),
  removeNode: (id) => set((s) => { const nodes = s.nodes.filter((nd) => nd.id !== id); persist(nodes); return { nodes }; }),
  setNodeTelemetry: (id, telemetry, latencyMs) => set((s) => ({
    nodes: s.nodes.map((nd) => (nd.id === id ? { ...nd, telemetry, connected: true, latencyMs } : nd)),
  })),
  setNodeConnected: (id, ok, latencyMs) => set((s) => ({
    nodes: s.nodes.map((nd) => (nd.id === id ? { ...nd, connected: ok, latencyMs: latencyMs ?? (ok ? nd.latencyMs : null) } : nd)),
  })),
  nodeForModule: (moduleId) => (moduleId ? get().nodes.find((nd) => nd.componentId === moduleId) ?? null : null),
}));
