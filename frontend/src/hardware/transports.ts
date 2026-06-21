/**
 * transports.js — pluggable device transports (Phase 11).
 *
 * Both expose the same interface: connect(opts), send(text), close(), with
 * onLine(line) and onStatus(status) callbacks. This is how TETROBOT talks to ANY
 * hardware — an MCU (ESP32) over USB serial, or a networked device (Raspberry Pi,
 * a ROS bridge) over WebSocket. New transports (BLE, MQTT, DDS) slot in here.
 */

/** USB / UART serial via the Web Serial API (Chromium / Electron). */
/* eslint-disable @typescript-eslint/no-explicit-any */
export class WebSerialTransport {
  onLine: ((line: string) => void) | undefined;
  onStatus: ((status: string) => void) | undefined;
  port: any;
  _enc: TextEncoder | undefined;
  _writer: any;
  _closed = false;
  _readableClosed: any;
  _reader: any;

  constructor({ onLine, onStatus }: { onLine?: (line: string) => void; onStatus?: (status: string) => void }) { this.onLine = onLine; this.onStatus = onStatus; }

  async connect({ baud = 115200 } = {}) {
    const serial = (navigator as any).serial;
    if (!serial) throw new Error('Web Serial not available in this environment.');
    this.port = await serial.requestPort();
    await this.port.open({ baudRate: baud });
    this._enc = new TextEncoder();
    this._writer = this.port.writable.getWriter();
    this._closed = false;
    this._readLoop();
    this.onStatus?.('connected');
  }

  async _readLoop() {
    const decoder = new TextDecoderStream();
    this._readableClosed = this.port.readable.pipeTo(decoder.writable).catch(() => {});
    this._reader = decoder.readable.getReader();
    let buf = '';
    try {
      while (!this._closed) {
        const { value, done } = await this._reader.read();
        if (done) break;
        buf += value;
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).replace(/\r$/, '');
          buf = buf.slice(nl + 1);
          if (line) this.onLine?.(line);
        }
      }
    } catch { /* read aborted on close */ }
  }

  async send(text) {
    if (this._writer) await this._writer.write(this._enc.encode(text + '\n'));
  }

  async close() {
    this._closed = true;
    try { await this._reader?.cancel(); } catch { /* */ }
    try { this._writer?.releaseLock(); } catch { /* */ }
    try { await this.port?.close(); } catch { /* */ }
    this.onStatus?.('disconnected');
  }
}

/** Networked devices (Raspberry Pi, ROS bridge, sidecar) over WebSocket. */
export class WebSocketTransport {
  onLine: ((line: string) => void) | undefined;
  onStatus: ((status: string) => void) | undefined;
  ws: WebSocket | undefined;

  constructor({ onLine, onStatus }: { onLine?: (line: string) => void; onStatus?: (status: string) => void }) { this.onLine = onLine; this.onStatus = onStatus; }

  connect({ url = 'ws://127.0.0.1:8765' } = {}) {
    return new Promise<void>((resolve, reject) => {
      try { this.ws = new WebSocket(url); }
      catch (e) { reject(e); return; }
      this.ws.onopen = () => { this.onStatus?.('connected'); resolve(); };
      this.ws.onmessage = (ev) => String(ev.data).split('\n').forEach((l) => l && this.onLine?.(l));
      this.ws.onclose = () => this.onStatus?.('disconnected');
      this.ws.onerror = () => { this.onStatus?.('error'); reject(new Error('WebSocket connection failed.')); };
    });
  }

  send(text) { if (this.ws?.readyState === 1) this.ws.send(text + '\n'); }
  close() { try { this.ws?.close(); } catch { /* */ } }
}

export const TRANSPORTS = { serial: WebSerialTransport, websocket: WebSocketTransport };