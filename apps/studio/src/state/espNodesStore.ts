/**
 * espNodesStore — the registry of module ESP32-C3 nodes. This laptop is the master;
 * each MODULE has its own ESP (mod1.local, mod2.local, …) carrying that module's
 * servos (local ids 1..7) AND its 2 end-lock magnets (DRV8833). Both the servo layer
 * (servoLink / ServoController) and the magnet layer (magnetEngine) route through here.
 *
 * A node is bound to a module via `componentId`. Servo/magnet ids are LOCAL to each
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
  /** Last /api/telemetry JSON (servos[] + magnets[] + wifi). Null until first reply. */
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

function load(): EspNode[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (Array.isArray(raw) && raw.length) {
      return raw.map((n) => ({ ...n, connected: false, latencyMs: null, telemetry: null }));
    }
  } catch { /* ignore */ }
  // Seed one default node so a single-board setup works with zero configuration.
  return [{
    id: 'esp_default', name: 'Module 1', url: 'http://mod1.local',
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
        url: n?.url ?? `http://mod${s.nodes.length + 1}.local`,
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
