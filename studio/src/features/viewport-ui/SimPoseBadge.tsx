/** SimPoseBadge — says when the view shows a simulated pose that won't be saved, with Keep and Back buttons. */
import { Button } from '@/components/ui/button';
import { useModelStore } from '@/state/modelStore';
import { runOperator } from '@/core/ops/registry';

export default function SimPoseBadge() {
  const on = useModelStore((s) => s.showingSimulation);
  if (!on) return null;
  return (
    <div data-testid="sim-pose" data-ui="a" style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 8px', borderRadius: 4, background: 'var(--overlay-bg)', border: '1px solid var(--warn)', color: 'var(--text)', fontSize: 11, whiteSpace: 'nowrap' }}
      title="Gravity, a drag or an animation moved the robot on screen. Your saved design is unchanged: Keep saves this pose, Back returns to the saved one.">
      <span style={{ color: 'var(--warn)' }}>Moved - not saved</span>
      <Button variant="outline" size="xs" onClick={() => runOperator('pose.apply')}>Keep</Button>
      <Button variant="outline" size="xs" onClick={() => runOperator('pose.revert')}>Back</Button>
    </div>
  );
}
