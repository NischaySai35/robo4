/**
 * HardwareBridge — orchestrates a transport + the protocol + the model.
 *
 * Connect to any device, stream the model's joint values to it (live or one-shot),
 * and route incoming telemetry into the store. Backend reads the model and emits
 * commands — it never mutates the model (consistent with the platform rules).
 */
import { TRANSPORTS } from './transports.js';
import { formatJointCommand, parseTelemetry } from './protocol.js';
import { useHardwareStore } from '@/state/hardwareStore.js';
import { useModelStore } from '@/state/modelStore.js';

class Bridge {
  constructor() { this.transport = null; this._unsubStream = null; }

  async connect(type, opts) {
    const Transport = TRANSPORTS[type];
    if (!Transport) throw new Error(`Unknown transport: ${type}`);
    const hw = useHardwareStore.getState();
    hw.setStatus('connecting');
    this.transport = new Transport({
      onLine: (line) => this._onLine(line),
      onStatus: (status) => useHardwareStore.getState().setStatus(status),
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
  setStreaming(on) {
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

  _onLine(line) {
    useHardwareStore.getState().pushLog('rx', line);
    const p = parseTelemetry(line);
    if (p?.type === 'json' && p.data) {
      useHardwareStore.getState().setTelemetry(p.data.values ?? p.data);
    }
  }
}

export const hardwareBridge = new Bridge();
