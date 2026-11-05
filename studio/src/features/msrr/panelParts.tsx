/** Section, Row and LogStrip: the small layout pieces shared by the MSRR and planner v2 panels. */
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

export function Section({ title, info, children }: {
  title: string; info?: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="msrr-section">
      <h3 className="msrr-section-title">
        <span className="msrr-title-text">{title}</span>
        {info && (
          <button
            className={`msrr-info ${open ? 'open' : ''}`}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            title={open ? 'Hide the explanation' : 'What is this?'}
          >
            i
          </button>
        )}
      </h3>
      {info && open && <div className="msrr-info-body">{info}</div>}
      {children}
    </section>
  );
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="msrr-field">
      <span className="msrr-field-label">{label}</span>
      {children}
    </label>
  );
}

/** The panel's message log at the bottom: newest line in view, a Clear button, a hint while empty. */
export function LogStrip({ log, onClear, empty = 'Planner output and tool notes appear here.' }: {
  log: string[]; onClear?: () => void; empty?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [log]);
  return (
    <div className="msrr-log">
      <div className="msrr-log-head">
        <span>Log</span>
        {onClear && <Button variant="ghost" size="xs" onClick={onClear} disabled={!log.length}>Clear</Button>}
      </div>
      <div className="msrr-log-body" ref={ref}>
        {log.length === 0
          ? <div className="msrr-log-line dim">{empty}</div>
          : log.map((l, i) => <div key={i} className="msrr-log-line">{l}</div>)}
      </div>
    </div>
  );
}
