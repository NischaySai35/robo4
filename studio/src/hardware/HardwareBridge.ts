/**
 * HardwareBridge — orchestrates a transport + the protocol + the model.
 *
 * Connect to any device, stream the model's joint values to it (live or one-shot),
 * and route incoming telemetry into the store. Backend reads the model and emits
 * commands — it never mutates the model (consistent with the platform rules).
 */
import { TRANSPORTS } from './transports';
import { formatJointCommand, parseTelemetry } from './protocol';
import { useHardwareStore } from '@/state/hardwareStore';
import { useModelStore } from '@/state/modelStore';

class Bridge {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transport: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _unsubStream: any;
  constructor() { this.transport = null; this._unsubStream = null; }

  async connect(type: any, opts: any) {
    const Transport = TRANSPORTS[type as keyof typeof TRANSPORTS];
    if (!Transport) throw new Error(`Unknown transport: ${type}`);
    const hw = useHardwareStore.getState();
    hw.setStatus('connecting');
    this.transport = new Transport({
      onLine: (line: any) => this._onLine(line),
      onStatus: (status: any) => useHardwareStore.getState().setStatus(status),
    });
    try {
      await this.transport.connect(opts);
    } catch (e) {
      hw.setStatus('error');
      this.transport = null;
      throw e;
    }
  }

  disconnect() {
    this.setStreaming(false);
    try { this.transport?.close(); } catch { /* */ }
    this.transport = null;
  }

  get connected() { return useHardwareStore.getState().status === 'connected'; }

  sendJoints() {
    if (!this.transport) return;
    const line = formatJointCommand(useModelStore.getState().doc);
    this.transport.send(line);
    useHardwareStore.getState().pushLog('tx', line);
  }

  /** Live-stream joint values: re-send (throttled) whenever the model changes. */
  setStreaming(on: any) {
    useHardwareStore.getState().setStreaming(on);
    if (on && !this._unsubStream) {
      let last = 0;
      this._unsubStream = useModelStore.subscribe(() => {
        const now = performance.now();
        if (now - last < 50) return; // ~20 Hz cap
        last = now;
        this.sendJoints();
      });
      this.sendJoints(); // send initial pose immediately
    } else if (!on && this._unsubStream) {
      this._unsubStream();
      this._unsubStream = null;
    }
  }

  _onLine(line: any) {
    useHardwareStore.getState().pushLog('rx', line);
    const p = parseTelemetry(line);
    if (p?.type === 'json' && p.data) {
      useHardwareStore.getState().setTelemetry(p.data.values ?? p.data);
    }
  }
}

export const hardwareBridge = new Bridge();