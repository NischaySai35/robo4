/**
 * HardwarePanel — connect to real hardware and stream the model's joints to it
 * (Phase 11). Works with any device: an MCU (ESP32) over USB serial, or a
 * networked device (Raspberry Pi / ROS bridge / sidecar) over WebSocket.
 */
import { useState } from 'react';
import './HardwarePanel.css';
import { useHardwareStore, BOARDS, type BoardKind } from '@/state/hardwareStore';
import { hardwareBridge } from '@/hardware/HardwareBridge';
import { useModelStore } from '@/state/modelStore';
import { commands } from '@/core/commands/index';
import { jointServoDegrees } from '@/hardware/protocol';

// Small Wi-Fi/signal bars (0–100%).
function SignalBars({ pct }: { pct: number }) {
  const bars = [25, 50, 75, 100];
  return (
    <span className="hw-signal" title={`Signal ${pct}%`}>
      {bars.map((b, i) => (
        <span key={i} className="hw-signal-bar" style={{ height: 4 + i * 3, opacity: pct >= b - 12 ? 1 : 0.25 }} />
      ))}
    </span>
  );
}

// Sensors & drivers attached to the board.
function Peripherals() {
  const peripherals = useHardwareStore((s) => s.peripherals);
  const add = useHardwareStore((s) => s.addPeripheral);
  const remove = useHardwareStore((s) => s.removePeripheral);
  const [draft, setDraft] = useState<{ name: string; kind: 'sensor' | 'driver'; type: string; pin: string }>(
    { name: '', kind: 'sensor', type: 'IMU', pin: '' },
  );
  const SENSORS = ['IMU', 'LiDAR', 'Camera', 'Encoder', 'Force', 'Ultrasonic', 'GPS', 'Temperature'];
  const DRIVERS = ['ST3215 bus', 'PWM', 'Stepper', 'DC motor', 'Servo', 'Relay'];
  const opts = draft.kind === 'sensor' ? SENSORS : DRIVERS;
  return (
    <div className="hw-periph">
      <div className="hw-title">SENSORS & DRIVERS</div>
      {peripherals.map((p) => (
        <div key={p.id} className="hw-periph-row">
          <span className={`hw-periph-tag hw-${p.kind}`}>{p.kind}</span>
          <span className="hw-periph-name">{p.name || p.type}</span>
          <span className="hw-periph-type">{p.type}{p.pin ? ` · ${p.pin}` : ''}</span>
          <button onClick={() => remove(p.id)} title="Remove">✕</button>
        </div>
      ))}
      <div className="hw-periph-add">
        <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as any, type: (e.target.value === 'sensor' ? SENSORS : DRIVERS)[0] })}>
          <option value="sensor">Sensor</option><option value="driver">Driver</option>
        </select>
        <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <input placeholder="pin/addr" value={draft.pin} onChange={(e) => setDraft({ ...draft, pin: e.target.value })} />
        <button onClick={() => { add({ name: draft.type, kind: draft.kind, type: draft.type, pin: draft.pin || undefined }); setDraft({ ...draft, pin: '' }); }}>＋</button>
      </div>
    </div>
  );
}

// Feedback Mode: summarise the ring buffer as min/last/max per numeric telemetry field.
function FeedbackHistory() {
  const feedbackMode = useHardwareStore((s) => s.feedbackMode);
  const history = useHardwareStore((s) => s.feedbackHistory);
  if (!feedbackMode) return null;
  if (!history.length) {
    return <div className="hw-foot">Feedback Mode is on — waiting for telemetry to collect…</div>;
  }

  const fields = new Map<string, { min: number; max: number; last: number }>();
  for (const { telemetry } of history) {
    if (!telemetry || typeof telemetry !== 'object') continue;
    for (const [k, v] of Object.entries(telemetry)) {
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      const f = fields.get(k);
      if (!f) fields.set(k, { min: v, max: v, last: v });
      else { f.min = Math.min(f.min, v); f.max = Math.max(f.max, v); f.last = v; }
    }
  }

  return (
    <div className="hw-feedback">
      <div className="hw-title">FEEDBACK · {history.length} samples</div>
      {fields.size === 0 ? (
        <div className="hw-foot">No numeric telemetry fields collected yet.</div>
      ) : (
        <div className="hw-feedback-list">
          {[...fields.entries()].map(([k, f]) => (
            <div key={k} className="hw-feedback-row">
              <span className="hw-feedback-name">{k}</span>
              <span className="hw-feedback-vals">
                <strong>{f.last.toFixed(2)}</strong>
                <span className="hw-feedback-range">min {f.min.toFixed(2)} · max {f.max.toFixed(2)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const MOTOR_TYPES = [
  'ST3215', 'ST3025', 'ST3235', 'ST3215-S',
  'PWM Servo', 'Stepper', 'DC Motor', 'Linear Actuator',
];

// Joint → servo map: every movable joint gets a motor type + servo ID.
// Editing here writes to the joint's model meta, so it's saved with the project and
// used by both live streaming and the exported IDL.
function ServoMap() {
  const doc = useModelStore((s) => s.doc);
  const dispatch = useModelStore((s) => s.dispatch);
  const joints = Object.values(doc.joints).filter((j) => j.type !== 'fixed');
  if (joints.length === 0) {
    return <div className="hw-foot">No movable joints yet. Build a robot (import parts → create joints) to map servos.</div>;
  }
  const setId = (j: any, id: any) => dispatch(commands.updateJoint(j.id, {
    meta: { ...(j.meta ?? {}), servoId: Number.isFinite(id) && id > 0 ? id : null },
  }));
  const setMotorType = (j: any, type: string) => dispatch(commands.updateJoint(j.id, {
    meta: { ...(j.meta ?? {}), motorType: type || null },
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
            <select
              className="hw-map-type"
              value={String(j.meta?.motorType ?? '')}
              onChange={(e) => setMotorType(j, e.target.value)}
              title="Motor type"
            >
              <option value="">— motor —</option>
              {MOTOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              className="hw-map-id"
              type="number"
              min="0"
              placeholder="—"
              value={String(j.meta?.servoId ?? '')}
              onChange={(e) => setId(j, parseInt(e.target.value, 10))}
              title="Servo ID"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HardwarePanel() {
  const status = useHardwareStore((s) => s.status);
  const board = useHardwareStore((s) => s.board);
  const type = useHardwareStore((s) => s.type);
  const baud = useHardwareStore((s) => s.baud);
  const url = useHardwareStore((s) => s.url);
  const pollHz = useHardwareStore((s) => s.pollHz);
  const streaming = useHardwareStore((s) => s.streaming);
  const feedbackMode = useHardwareStore((s) => s.feedbackMode);
  const setFeedbackMode = useHardwareStore((s) => s.setFeedbackMode);
  const telemetry = useHardwareStore((s) => s.telemetry);
  const log = useHardwareStore((s) => s.log);
  const signal = useHardwareStore((s) => s.signal)();
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
        <span className="hw-title">HARDWARE · {hw.boardName}</span>
        <span className={`hw-status hw-${status}`}>
          ● {status}{connected && signal != null && <SignalBars pct={signal} />}
        </span>
      </div>

      <div className="hw-row">
        <select className="hw-select" value={board} disabled={connected || busy}
          onChange={(e) => hw.setBoard(e.target.value as BoardKind)} title="Controller board">
          {(Object.keys(BOARDS) as BoardKind[]).map((b) => <option key={b} value={b}>{BOARDS[b].name}</option>)}
        </select>
      </div>

      <div className="hw-row">
        <select className="hw-select" value={type} disabled={connected || busy}
          onChange={(e) => hw.setType(e.target.value as 'serial' | 'websocket')}>
          <option value="serial">USB Serial (MCU / ESP32 / Arduino)</option>
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

      <label className="hw-field">Poll rate (Hz)
        <input type="number" min={1} max={200} value={pollHz}
          onChange={(e) => hw.setPollHz(parseInt(e.target.value, 10) || 20)} />
      </label>

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

      <label className="hw-check" title="Collect incoming telemetry into a short history (current, load, position, temperature — whatever the device sends) instead of showing only the latest sample.">
        <input type="checkbox" checked={feedbackMode} onChange={(e) => setFeedbackMode(e.target.checked)} />
        <span>Feedback mode</span>
      </label>

      <Peripherals />

      {telemetry && typeof telemetry === 'object' && !feedbackMode && (
        <div className="hw-telemetry">
          {Object.entries(telemetry).slice(0, 8).map(([k, v]) => (
            <div key={k}><span>{k}</span><strong>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</strong></div>
          ))}
        </div>
      )}

      <FeedbackHistory />

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