/**
 * HardwarePanel — connect to real hardware and stream the model's joints to it
 * (Phase 11). Works with any device: an MCU (ESP32) over USB serial, or a
 * networked device (Raspberry Pi / ROS bridge / sidecar) over WebSocket.
 */
import './HardwarePanel.css';
import { useHardwareStore } from '@/state/hardwareStore.js';
import { hardwareBridge } from '@/hardware/HardwareBridge.js';

export default function HardwarePanel() {
  const status = useHardwareStore((s) => s.status);
  const type = useHardwareStore((s) => s.type);
  const baud = useHardwareStore((s) => s.baud);
  const url = useHardwareStore((s) => s.url);
  const streaming = useHardwareStore((s) => s.streaming);
  const telemetry = useHardwareStore((s) => s.telemetry);
  const log = useHardwareStore((s) => s.log);
  const hw = useHardwareStore.getState();

  const connected = status === 'connected';
  const busy = status === 'connecting';

  const connect = async () => {
    try {
      await hardwareBridge.connect(type, type === 'serial' ? { baud } : { url });
    } catch (e) { alert(`Connect failed: ${e.message}`); }
  };
  const disconnect = () => hardwareBridge.disconnect();

  return (
    <div className="hw-panel">
      <div className="hw-head">
        <span className="hw-title">HARDWARE</span>
        <span className={`hw-status hw-${status}`}>● {status}</span>
      </div>

      <div className="hw-row">
        <select className="hw-select" value={type} disabled={connected || busy}
          onChange={(e) => hw.setType(e.target.value)}>
          <option value="serial">USB Serial (MCU / ESP32)</option>
          <option value="websocket">WebSocket (Pi / ROS / network)</option>
        </select>
      </div>

      {type === 'serial' ? (
        <label className="hw-field">Baud
          <input type="number" value={baud} disabled={connected || busy}
            onChange={(e) => hw.setBaud(parseInt(e.target.value, 10) || 115200)} />
        </label>
      ) : (
        <label className="hw-field">URL
          <input type="text" value={url} disabled={connected || busy}
            onChange={(e) => hw.setUrl(e.target.value)} />
        </label>
      )}

      <div className="hw-actions">
        {!connected
          ? <button className="hw-connect" onClick={connect} disabled={busy}>{busy ? 'Connecting…' : 'Connect'}</button>
          : <button className="hw-disconnect" onClick={disconnect}>Disconnect</button>}
      </div>

      {connected && (
        <div className="hw-stream">
          <label className="hw-check">
            <input type="checkbox" checked={streaming}
              onChange={(e) => hardwareBridge.setStreaming(e.target.checked)} />
            <span>Stream joints live</span>
          </label>
          <button className="hw-send" onClick={() => hardwareBridge.sendJoints()}>Send once</button>
        </div>
      )}

      {telemetry && typeof telemetry === 'object' && (
        <div className="hw-telemetry">
          {Object.entries(telemetry).slice(0, 8).map(([k, v]) => (
            <div key={k}><span>{k}</span><strong>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</strong></div>
          ))}
        </div>
      )}

      {log.length > 0 && (
        <div className="hw-log">
          {log.slice(-6).map((e, i) => (
            <div key={i} className={`hw-log-line hw-log-${e.dir}`}>
              <span>{e.dir === 'tx' ? '▲' : '▼'}</span> {e.line.slice(0, 80)}
            </div>
          ))}
        </div>
      )}
      <div className="hw-foot">Sends newline-JSON joint commands (degrees) — see the exported IDL.</div>
    </div>
  );
}
