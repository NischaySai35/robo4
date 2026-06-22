/**
 * hardwareStore — connection state, settings, telemetry, and a small log for the
 * hardware bridge (Phase 11).
 */
import { create } from 'zustand';

export type HardwareStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type BoardKind = 'esp32' | 'rpi' | 'arduino' | 'custom';
export interface HwLogEntry { dir: string; line: string; t: number }
export interface Peripheral { id: string; name: string; kind: 'sensor' | 'driver'; type: string; pin?: string }

/** Per-board defaults so the UI + header adapt to the chosen controller. */
export const BOARDS: Record<BoardKind, { name: string; transport: 'serial' | 'websocket'; baud?: number }> = {
  esp32:   { name: 'ESP32-C3',     transport: 'serial',    baud: 115200 },
  arduino: { name: 'Arduino',      transport: 'serial',    baud: 115200 },
  rpi:     { name: 'Raspberry Pi', transport: 'websocket' },
  custom:  { name: 'Custom board', transport: 'websocket' },
};

interface HardwareState {
  status: HardwareStatus;
  board: BoardKind;
  boardName: string;
  type: 'serial' | 'websocket';
  baud: number;
  url: string;
  pollHz: number;
  streaming: boolean;
  peripherals: Peripheral[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  telemetry: any;
  log: HwLogEntry[];
  setStatus: (status: HardwareStatus) => void;
  setBoard: (board: BoardKind) => void;
  setType: (type: 'serial' | 'websocket') => void;
  setBaud: (baud: number) => void;
  setUrl: (url: string) => void;
  setPollHz: (hz: number) => void;
  setStreaming: (streaming: boolean) => void;
  addPeripheral: (p: Omit<Peripheral, 'id'>) => void;
  removePeripheral: (id: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setTelemetry: (telemetry: any) => void;
  pushLog: (dir: string, line: string) => void;
  clearLog: () => void;
  /** Signal strength % from telemetry RSSI (dBm), or null. */
  signal: () => number | null;
}

export const useHardwareStore = create<HardwareState>((set, get) => ({
  status: 'disconnected',
  board: 'esp32',
  boardName: BOARDS.esp32.name,
  type: 'serial',
  baud: 115200,
  url: 'ws://127.0.0.1:8765',
  pollHz: 20,
  streaming: false,
  peripherals: [],
  telemetry: null,
  log: [],

  setStatus: (status) => set({ status }),
  setBoard: (board) => set({ board, boardName: BOARDS[board].name, type: BOARDS[board].transport, baud: BOARDS[board].baud ?? get().baud }),
  setType: (type) => set({ type }),
  setBaud: (baud) => set({ baud }),
  setUrl: (url) => set({ url }),
  setPollHz: (hz) => set({ pollHz: Math.max(1, Math.min(200, Math.round(hz))) }),
  setStreaming: (streaming) => set({ streaming }),
  addPeripheral: (p) => set((s) => ({ peripherals: [...s.peripherals, { ...p, id: `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}` }] })),
  removePeripheral: (id) => set((s) => ({ peripherals: s.peripherals.filter((p) => p.id !== id) })),
  setTelemetry: (telemetry) => set({ telemetry }),
  pushLog: (dir, line) => set((s) => ({ log: [...s.log.slice(-49), { dir, line, t: Date.now() }] })),
  clearLog: () => set({ log: [], telemetry: null }),

  signal: () => {
    const t = get().telemetry;
    const rssi = t && typeof t === 'object' ? (t.rssi ?? t.RSSI ?? null) : null;
    if (rssi == null || !Number.isFinite(rssi)) return null;
    // map -90 dBm → 0%, -40 dBm → 100%
    return Math.max(0, Math.min(100, Math.round(((rssi + 90) / 50) * 100)));
  },
}));
