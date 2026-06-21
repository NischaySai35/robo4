/**
 * hardwareStore — connection state, settings, telemetry, and a small log for the
 * hardware bridge (Phase 11).
 */
import { create } from 'zustand';

export type HardwareStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export interface HwLogEntry { dir: string; line: string; t: number }
interface HardwareState {
  status: HardwareStatus;
  type: 'serial' | 'websocket';
  baud: number;
  url: string;
  streaming: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  telemetry: any;
  log: HwLogEntry[];
  setStatus: (status: HardwareStatus) => void;
  setType: (type: 'serial' | 'websocket') => void;
  setBaud: (baud: number) => void;
  setUrl: (url: string) => void;
  setStreaming: (streaming: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setTelemetry: (telemetry: any) => void;
  pushLog: (dir: string, line: string) => void;
  clearLog: () => void;
}

export const useHardwareStore = create<HardwareState>((set, get) => ({
  status: 'disconnected', // 'disconnected' | 'connecting' | 'connected' | 'error'
  type: 'serial',         // 'serial' | 'websocket'
  baud: 115200,
  url: 'ws://127.0.0.1:8765',
  streaming: false,       // push model joint values live
  telemetry: null,        // last parsed telemetry object
  log: [],                // recent lines (rx/tx)

  setStatus: (status) => set({ status }),
  setType: (type) => set({ type }),
  setBaud: (baud) => set({ baud }),
  setUrl: (url) => set({ url }),
  setStreaming: (streaming) => set({ streaming }),
  setTelemetry: (telemetry) => set({ telemetry }),
  pushLog: (dir, line) => set((s) => ({ log: [...s.log.slice(-49), { dir, line, t: Date.now() }] })),
  clearLog: () => set({ log: [], telemetry: null }),
}));
