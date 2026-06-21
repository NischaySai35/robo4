/**
 * NumberField — a numeric <input> that commits ONLY on Enter or blur, never on
 * every keystroke. Esc reverts. While the user is typing, the external `value`
 * is ignored (so a live-polling parent can't clobber the edit), and a half-typed
 * / empty value is never pushed upstream — `onCommit` fires only with a finite
 * number. Use this anywhere a raw number input would otherwise apply mid-typing.
 */
import { useEffect, useRef, useState } from 'react';

const fmt = (v: number) => (Number.isFinite(v) ? String(+v.toFixed(4)) : '');

export default function NumberField({
  value, min, max, step, className, onCommit,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  onCommit: (v: number) => void;
}) {
  const [text, setText] = useState(() => fmt(value));
  const editing = useRef(false);

  // Sync from outside only when the field is not being edited.
  useEffect(() => { if (!editing.current) setText(fmt(value)); }, [value]);

  const commit = () => {
    editing.current = false;
    const v = parseFloat(text);
    if (Number.isFinite(v)) onCommit(v);
    else setText(fmt(value)); // revert empty / invalid
  };

  return (
    <input
      type="number"
      className={className}
      value={text}
      min={min}
      max={max}
      step={step}
      onFocus={() => { editing.current = true; }}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { commit(); (e.target as HTMLInputElement).blur(); }
        else if (e.key === 'Escape') {
          editing.current = false;
          setText(fmt(value));
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}
