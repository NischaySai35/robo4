/** Matching a key press to shortcut entries. The table itself is features/ops/appOps.ts. */
export interface Binding {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  /** For symbols and delete keys, where Shift makes no difference to what is meant. */
  anyShift?: boolean;
  op: string;
  props?: unknown;
  /** Runs even while typing in a text box. */
  whileTyping?: boolean;
  /** Shown in the shortcut list instead of the generated text. */
  label?: string;
}

export interface KeyLike { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }

export function findBindings(map: Binding[], e: KeyLike) {
  const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
  return map.filter((b) => b.key === k && !!b.ctrl === ctrl && (b.anyShift || !!b.shift === e.shiftKey));
}

const NAMES: Record<string, string> = { escape: 'Esc', tab: 'Tab', delete: 'Del', backspace: 'Backspace' };
export const bindingText = (b: Binding) =>
  (b.ctrl ? 'Ctrl+' : '') + (b.shift ? 'Shift+' : '') + (NAMES[b.key] ?? (b.key.length === 1 ? b.key.toUpperCase() : b.key));
