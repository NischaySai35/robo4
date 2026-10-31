/** Section and Row: the small layout pieces shared by the MSRR and planner v2 panels. */
import { useState } from 'react';

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
