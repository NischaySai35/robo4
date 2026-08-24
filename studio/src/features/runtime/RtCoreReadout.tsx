/**
 * RtCoreReadout — live view of RT Core controller feedback (progress + tracking error).
 *
 * Reads the rtStatusStore, which a transport to the native rtcored daemon feeds with
 * `rtcore.controller_status` messages. This is the visual end of the RT Core → Studio
 * feedback loop: the operator sees trajectory progress, completion, and per-joint
 * tracking error exactly as the 1 kHz controller reports it.
 */
import { useEffect, useRef, useState } from 'react';
import { useRtStatusStore } from '@/state/rtStatusStore';
import { summarizeStatus } from '@/robotics/runtime/rtStatus';
import { connectRtCore, DEFAULT_RTCORE_URL, type RtConnState, type RtConnection } from '@/robotics/runtime/rtSocket';
import { timeParameterize, blendCorners } from '@/robotics/planning/trajectory';
import { exportRtTrajectory } from '@/robotics/planning/rtExport';

const STATE_COLOR: Record<string, string> = { idle: '#888', running: '#3b82f6', done: '#22c55e' };
const CONN_COLOR: Record<RtConnState, string> = { connecting: '#f59e0b', open: '#22c55e', closed: '#888' };

// A small 3-DOF demo move the operator can push to RT Core (blended + jerk-limited).
function sampleTrajectory() {
  const path = [[0, 0, 0], [0.3, -0.2, 0.1], [0.6, -0.4, 0.25]];
  const traj = timeParameterize(blendCorners(path, 0.1), { vMax: [1, 1, 1], aMax: [3, 3, 3], jMax: [20, 20, 20] });
  return exportRtTrajectory(traj, ['J1', 'J2', 'J3'], 0.05);
}

function ConnectBar() {
  const [conn, setConn] = useState<RtConnState>('closed');
  const connRef = useRef<RtConnection | null>(null);

  // tidy up on unmount
  useEffect(() => () => connRef.current?.disconnect(), []);

  const toggle = () => {
    if (connRef.current) {
      connRef.current.disconnect();
      connRef.current = null;
      setConn('closed');
    } else {
      connRef.current = connectRtCore(DEFAULT_RTCORE_URL, setConn);
    }
  };

  const connected = !!connRef.current;
  const btn = { padding: '3px 8px', fontSize: 11, cursor: 'pointer' } as const;
  return (
    <div style={{ borderBottom: '1px solid rgba(128,128,128,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: CONN_COLOR[conn] }} />
        <span style={{ fontSize: 12, opacity: 0.8 }}>{conn}</span>
        <code style={{ fontSize: 11, opacity: 0.6 }}>{DEFAULT_RTCORE_URL}</code>
        <button className="rt-btn" style={{ marginLeft: 'auto' }} onClick={toggle}>
          {connected ? 'Disconnect' : 'Connect'}
        </button>
      </div>
      {connected && (
        <div style={{ display: 'flex', gap: 6, padding: '0 12px 8px', flexWrap: 'wrap' }}>
          <button className="rt-btn" style={btn} onClick={() => connRef.current?.sendTrajectory(sampleTrajectory())}>
            Send sample move
          </button>
          <button className="rt-btn" style={{ ...btn, color: '#fff', background: '#e11d48' }} onClick={() => connRef.current?.sendEstop(true)}>
            ■ E-STOP
          </button>
          <button className="rt-btn" style={btn} onClick={() => connRef.current?.sendEstop(false)}>
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

export default function RtCoreReadout() {
  const status = useRtStatusStore((s) => s.status);

  if (!status) {
    return (
      <div>
        <ConnectBar />
        <div className="rt-empty" style={{ padding: 12, lineHeight: 1.5 }}>
          No RT Core feedback yet.
          <br />
          Start the native daemon (<code>cargo run -p rtcored -- --serve</code>) and click
          {' '}<strong>Connect</strong>: it streams <code>rtcore.controller_status</code>
          {' '}messages (progress + tracking error) that appear here live.
        </div>
      </div>
    );
  }

  const { percent, maxAbsError, state } = summarizeStatus(status);
  const color = STATE_COLOR[state] ?? '#888';

  return (
    <div>
      <ConnectBar />
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: color }} />
        <strong>{status.name || 'controller'}</strong>
        <span style={{ marginLeft: 'auto', textTransform: 'uppercase', fontSize: 11, color }}>{state}</span>
      </div>

      {/* progress bar */}
      <div style={{ background: 'rgba(128,128,128,0.2)', borderRadius: 4, height: 10, overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: color, transition: 'width 0.1s linear' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.85 }}>
        <span>{percent}%</span>
        <span>{status.elapsed.toFixed(2)}s / {status.duration.toFixed(2)}s</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ opacity: 0.7 }}>max tracking error</span>
        <span style={{ fontVariantNumeric: 'tabular-nums', color: maxAbsError > 0.05 ? '#e11d48' : 'inherit' }}>
          {(maxAbsError * 1000).toFixed(2)} mrad
        </span>
      </div>

      {/* per-joint error bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {status.error.map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <span style={{ width: 24, opacity: 0.6 }}>J{i + 1}</span>
            <div style={{ flex: 1, background: 'rgba(128,128,128,0.15)', height: 6, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, Math.abs(e) / 0.1 * 100)}%`, height: '100%', background: Math.abs(e) > 0.05 ? '#e11d48' : '#06b6d4' }} />
            </div>
            <span style={{ width: 64, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{(e * 1000).toFixed(2)} mrad</span>
          </div>
        ))}
      </div>

        {status.finished && <div style={{ fontSize: 12, color: '#22c55e' }}>✓ trajectory complete</div>}
      </div>
    </div>
  );
}
