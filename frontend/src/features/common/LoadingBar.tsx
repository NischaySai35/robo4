/**
 * LoadingBar — a slim indeterminate progress bar pinned to the bottom of the app,
 * shown whenever the busyStore has an active task (heavy mesh ops, imports, etc.).
 * Non-blocking: it sits above the footer and never intercepts pointer events, so
 * the user can keep working while a long task runs.
 */
import './LoadingBar.css';
import { useBusyStore, busySnapshot } from '@/state/busyStore';

export default function LoadingBar() {
  const { active, label } = useBusyStore(busySnapshot);
  if (!active) return null;
  return (
    <div className="loadbar" role="status" aria-live="polite">
      <div className="loadbar-track"><div className="loadbar-fill" /></div>
      <span className="loadbar-label">{label}</span>
    </div>
  );
}