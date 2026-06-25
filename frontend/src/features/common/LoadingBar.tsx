import './LoadingBar.css';
import { useBusyStore, busySnapshot } from '@/state/busyStore';

export default function LoadingBar() {
  const { active, label } = useBusyStore(busySnapshot);
  const cancel = useBusyStore((s) => s.cancel);
  if (!active) return null;
  return (
    <div className="loadbar" role="status" aria-live="polite">
      <div className="loadbar-track">
        <div className="loadbar-fill" />
        <div className="loadbar-sheen" />
      </div>
      <span className="loadbar-label">{label}</span>
      <button className="loadbar-cancel" title="Cancel import" onClick={cancel}>✕</button>
    </div>
  );
}
