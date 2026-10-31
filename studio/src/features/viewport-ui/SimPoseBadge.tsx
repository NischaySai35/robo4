/** SimPoseBadge — says when the view shows a simulated pose that won't be saved, with Keep and Back buttons. */
import { useModelStore } from '@/state/modelStore';
import { runOperator } from '@/core/ops/registry';

export default function SimPoseBadge() {
  const on = useModelStore((s) => s.showingSimulation);
  if (!on) return null;
  const btn: React.CSSProperties = { background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3, padding: '2px 8px', cursor: 'pointer', font: 'inherit' };
  return (
    <div data-testid="sim-pose" style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 8px', borderRadius: 4, background: 'var(--overlay-bg)', border: '1px solid var(--warn)', color: 'var(--text)', fontSize: 11, whiteSpace: 'nowrap' }}
      title="Physics, animation or IK moved the robot. Saving keeps your design pose unless you press Keep.">
      <span style={{ color: 'var(--warn)' }}>Simulated pose, not saved</span>
      <button style={btn} onClick={() => runOperator('pose.apply')}>Keep</button>
      <button style={btn} onClick={() => runOperator('pose.revert')}>Back to design</button>
    </div>
  );
}
