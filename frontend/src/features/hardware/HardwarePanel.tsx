/**
 * HardwarePanel — connect to real hardware and stream the model's joints to it
 * (Phase 11). Works with any device: an MCU (ESP32) over USB serial, or a
 * networked device (Raspberry Pi / ROS bridge / sidecar) over WebSocket.
 */
import './HardwarePanel.css';
import { useHardwareStore } from '@/state/hardwareStore';
import { hardwareBridge } from '@/hardware/HardwareBridge';
import { useModelStore } from '@/state/modelStore';
import { commands } from '@/core/commands/index';
import { jointServoDegrees } from '@/hardware/protocol';

// Joint → servo map: every movable joint gets a servo ID (its physical ST3215).
// Editing here writes to the joint's model meta, so it's saved with the project and
// used by both live streaming and the exported IDL.
function ServoMap() {
  const doc = useModelStore((s) => s.doc);
  const dispatch = useModelStore((s) => s.dispatch);
  const joints = Object.values(doc.joints).filter((j) => j.type !== 'fixed');
  if (joints.length === 0) {
    return <div className="hw-foot">No movable joints yet. Build a robot (import parts → create joints) to map servos.</div>;
  }
  const setId = (j, id) => dispatch(commands.updateJoint(j.id, {
    meta: { ...(j.meta ?? {}), servoId: Number.isFinite(id) && id > 0 ? id : null },
  }));
  const autoAssign = () => joints.forEach((j, i) => setId(j, i + 1)); // 1..N

  return (
    <div className="hw-map">
      <div className="hw-map-head">
        <span className="hw-title">JOINT → SERVO</span>
        <button className="hw-map-auto" onClick={autoAssign} title="Assign IDs 1…N in order">Auto 1…N</button>
      </div>
      <div className="hw-map-list">
        {joints.map((j) => (
          <div key={j.id} className="hw-map-row">
            <span className="hw-map-name" title={j.name}>{j.name}</span>
            <span className="hw-map-deg">{jointServoDegrees(j)}°</span>
            <input
              className="hw-map-id"
              type="number"
              min="0"
              placeholder="—"
              value={String(j.meta?.servoId ?? '')}
              onChange={(e) => setId(j, parseInt(e.target.value, 10))}
              title="ST3215 servo ID"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

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
          onChange={(e) => hw.setType(e.target.value as 'serial' | 'websocket')}>
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
      <ServoMap />

      <div className="hw-foot">Sends newline-JSON joint commands (degrees) — see the exported IDL.</div>
    </div>
  );
}