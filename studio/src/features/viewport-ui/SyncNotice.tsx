/**
 * SyncNotice — the small window at the top of the viewport while Sync is on (Nischay 12 Nov): which sim module drives which
 * real board, and a warning when the counts differ (more real boards than sim modules, or the other way round). Green
 * "linked" notes fade by themselves; warnings stay until closed or Sync goes off. State: syncAssign.useSyncAssign.
 * REUSE-CHECKED: toast|notice|banner|warning hud -> DragWarningHud (one red line while dragging, no close, pointer-events none),
 * SimPoseBadge (one fixed message), EspTtlPage's ettl-toast (a page-local string): none takes kinds, lines and a close.
 */
import './SyncUi.css';
import { useEffect, useState } from 'react';
import { useSyncAssign, dismissSyncNotice } from '@/features/connection/syncAssign';

const OK_MS = 4000;

export default function SyncNotice() {
  const notice = useSyncAssign((s) => s.notice);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    setLeaving(false);
    if (notice?.kind !== 'ok') return;
    const a = setTimeout(() => setLeaving(true), OK_MS), b = setTimeout(dismissSyncNotice, OK_MS + 260);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [notice?.key]);
  if (!notice) return null;
  const close = () => { setLeaving(true); setTimeout(dismissSyncNotice, 240); };
  return (
    <div key={notice.key} className={`sync-notice sync-notice--${notice.kind}${leaving ? ' sync-notice--leave' : ''}`}
      role={notice.kind === 'warn' ? 'alert' : 'status'} data-testid="sync-notice" data-ui="a">
      <span className="sync-notice-icon" aria-hidden>{notice.kind === 'ok' ? '✓' : '!'}</span>
      <div className="sync-notice-body">
        <div className="sync-notice-title">{notice.title}</div>
        {notice.lines.map((l) => <div key={l} className="sync-notice-line">{l}</div>)}
      </div>
      <button className="sync-notice-x" onClick={close} title="Close" aria-label="Close">×</button>
    </div>
  );
}
