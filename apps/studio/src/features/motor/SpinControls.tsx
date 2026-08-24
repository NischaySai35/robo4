/**
 * SpinControls — CW / Stop / CCW buttons (and optional rpm field) for a spinnable
 * motor joint. Reused by the joint Inspector and the body right-click context menu.
 */
import './SpinControls.css';
import { useEffect } from 'react';
import { toggleSpin, stopSpin, useSpin, DEFAULT_SPIN_RPM } from './spinEngine';
import { canJointSpin } from './spinFreedom';
import { useModelStore } from '@/state/modelStore';
import { commands } from '@/core/commands/index';

export default function SpinControls({ jointId, showRpm = true, compact = false }:
  { jointId: string; showRpm?: boolean; compact?: boolean }) {
  const dir = useSpin(jointId);
  const doc = useModelStore((s) => s.doc);
  const joint: any = (doc.joints as any)[jointId];
  const dispatch = useModelStore((s) => s.dispatch);
  const free = joint ? canJointSpin(doc, jointId) : true;

  // If a lock forms while this motor is spinning, halt it — it can no longer turn.
  useEffect(() => { if (!free && dir !== 0) stopSpin(jointId); }, [free, dir, jointId]);

  if (!joint) return null;
  const rpm = joint.meta?.spinRpm ?? DEFAULT_SPIN_RPM;

  return (
    <div className={`spin-ctl${compact ? ' spin-ctl--compact' : ''}`}>
      <div className="spin-btns">
        <button
          className={`spin-btn${dir === -1 ? ' spin-btn--on' : ''}`}
          title={free ? 'Rotate counter-clockwise continuously (click again to stop)'
            : 'Locked — both ends are fixed to another module (rigid loop), so it can\'t spin'}
          disabled={!free}
          onClick={() => toggleSpin(jointId, -1)}>↺ CCW</button>
        <button
          className="spin-btn spin-btn--stop"
          title="Stop rotating"
          disabled={dir === 0}
          onClick={() => stopSpin(jointId)}>■ Stop</button>
        <button
          className={`spin-btn${dir === 1 ? ' spin-btn--on' : ''}`}
          title={free ? 'Rotate clockwise continuously (click again to stop)'
            : 'Locked — both ends are fixed to another module (rigid loop), so it can\'t spin'}
          disabled={!free}
          onClick={() => toggleSpin(jointId, 1)}>↻ CW</button>
      </div>
      {!free && (
        <div className="spin-locked-note">🔒 Trapped in a rigid loop — free an end connector to spin.</div>
      )}
      {showRpm && (
        <label className="spin-rpm">
          <span>Speed (rpm)</span>
          <input type="number" min={0} step={1} value={rpm}
            onChange={(e) => dispatch(commands.updateJoint(jointId, {
              meta: { ...joint.meta, spinRpm: Math.max(0, parseFloat(e.target.value) || 0) },
            }))} />
        </label>
      )}
    </div>
  );
}
