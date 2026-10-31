/**
 * PropertyPane — the one way to show editable numbers and switches (RESTRUCTURING §4.3): a Tweakpane pane
 * on the app's tokens. Each panel lists its properties; this keeps the controls, their look and their
 * keyboard handling the same everywhere. Values shown follow `values`, so outside changes appear live.
 */
import { useEffect, useRef } from 'react';
import { Pane } from 'tweakpane';
import './PropertyPane.css';

export interface PropDef {
  key: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  /** shown after the label, e.g. "mm" */
  unit?: string;
  /** groups properties under a collapsible heading */
  folder?: string;
  /** folders start closed when true */
  collapsed?: boolean;
}

export default function PropertyPane({ props, values, onChange }: {
  props: PropDef[];
  values: Record<string, number | boolean>;
  onChange: (key: string, value: number | boolean) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef({ ...values });
  const pane = useRef<Pane | null>(null);
  const refreshing = useRef(false);
  const change = useRef(onChange);
  change.current = onChange;

  useEffect(() => {
    const p = new Pane({ container: host.current! });
    const folders = new Map<string, any>();
    for (const d of props) {
      let parent: any = p;
      if (d.folder) {
        if (!folders.has(d.folder)) folders.set(d.folder, p.addFolder({ title: d.folder, expanded: !d.collapsed }));
        parent = folders.get(d.folder);
      }
      const b = parent.addBinding(live.current, d.key, { label: d.unit ? `${d.label} (${d.unit})` : d.label, min: d.min, max: d.max, step: d.step });
      // refresh() below also fires 'change'; passing that back would write stale values over the user's edit.
      b.on('change', (ev: any) => { if (!refreshing.current && ev.last !== false) change.current(d.key, ev.value); });
    }
    pane.current = p;
    return () => { p.dispose(); pane.current = null; };
    // The pane is rebuilt only when the list of properties changes, not on every value.
  }, [JSON.stringify(props)]);

  useEffect(() => {
    let changed = false;
    for (const [k, v] of Object.entries(values)) if (live.current[k] !== v) { live.current[k] = v; changed = true; }
    if (changed) { refreshing.current = true; pane.current?.refresh(); refreshing.current = false; }
  }, [values]);

  return <div ref={host} className="property-pane" />;
}
