/**
 * Operators (P6, docs/design/p6-operators.md): every user action is a named operation with a
 * label, a test for when it is allowed, and one way to run it. Buttons, menus, the palette,
 * shortcuts and scripts all come here. Pure: no React, no stores.
 */
export interface Operator {
  id: string;
  label: string;
  group: string;
  /** Allowed right now? When false the action is greyed out and its shortcut falls through. */
  poll?: () => boolean;
  exec: (props?: any) => unknown;
  /** Opens a file dialog or similar: skipped by the run-every-operator test. */
  interactive?: boolean;
  /** Not listed in the palette: for keys that only make sense as keys. */
  hidden?: boolean;
}

export type OpResult = { ok: true; value?: unknown } | { ok: false; error: string };

const ops = new Map<string, Operator>();

export function defineOperator(op: Operator) {
  if (ops.has(op.id)) throw new Error(`Operator ${op.id} is defined twice`);
  ops.set(op.id, op);
}

export const listOperators = () => [...ops.values()];
export const getOperator = (id: string) => ops.get(id);
export const canRun = (id: string) => { const o = ops.get(id); return !!o && (o.poll?.() ?? true); };

/** The one entry point. Never throws, and the error says what to do. */
export function runOperator(id: string, props?: unknown): OpResult {
  const op = ops.get(id);
  if (!op) return { ok: false, error: `No operator named "${id}". List them with listOperators().` };
  if (op.poll && !op.poll()) return { ok: false, error: `"${op.label}" can't run right now: check the page and the selection.` };
  try {
    return { ok: true, value: op.exec(props) };
  } catch (e) {
    console.error(`Operator ${id} failed:`, e);
    return { ok: false, error: `"${op.label}" failed: ${e?.message ?? e}` };
  }
}
