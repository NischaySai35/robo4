import { useEffect, useMemo, useRef, useState } from 'react';
import './CommandPalette.css';
import { bridge } from '@/viewport/cameraBridge.js';
import { useThemeStore } from '@/state/themeStore.js';

/**
 * Phase 14 — Command palette. A single keyboard-driven launcher (Ctrl/Cmd+K or
 * Ctrl+P) that surfaces and runs every cross-cutting action in the app, so power
 * users never have to hunt through panels. Every command routes through the same
 * bridge / store actions the GUI buttons use, so nothing here is a side door.
 */
export default function CommandPalette({ open, onClose, page, setPage, onToggleConn }) {
  const [query, setQuery]   = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef  = useRef(null);

  const theme       = useThemeStore(s => s.theme);
  const toggleTheme = useThemeStore(s => s.toggleTheme);

  const commands = useMemo(() => [
    { id: 'sim',        title: 'Go to Simulator',        hint: 'View',    keys: '',          run: () => setPage('sim'),               when: page !== 'sim' },
    { id: 'servo',      title: 'Go to Servo Control',    hint: 'View',    keys: '',          run: () => setPage('servo'),             when: page !== 'servo' },
    { id: 'fit',        title: 'Fit view to scene',      hint: 'View',    keys: 'F',         run: () => bridge.fitCamera?.() },
    { id: 'undo',       title: 'Undo',                   hint: 'Edit',    keys: 'Ctrl+Z',    run: () => bridge.undo?.() },
    { id: 'redo',       title: 'Redo',                   hint: 'Edit',    keys: 'Ctrl+Y',    run: () => bridge.redo?.() },
    { id: 'theme',      title: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme', hint: 'View', keys: '', run: () => toggleTheme() },
    { id: 'conn',       title: 'Toggle connection window', hint: 'Hardware', keys: '',        run: () => onToggleConn?.() },
  ].filter(c => c.when !== false), [page, setPage, theme, toggleTheme, onToggleConn]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(c =>
      c.title.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q));
  }, [commands, query]);

  // Reset state each time the palette opens.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // Focus after the element mounts.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  // Keep the active row in view as the user arrows through.
  useEffect(() => {
    const el = listRef.current?.children?.[active];
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const runAt = (idx) => {
    const cmd = filtered[idx];
    if (!cmd) return;
    onClose();
    // Defer so the palette unmounts before the action fires (e.g. focus changes).
    requestAnimationFrame(() => cmd.run());
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown')      { e.preventDefault(); setActive(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter')     { e.preventDefault(); runAt(active); }
    else if (e.key === 'Escape')    { e.preventDefault(); onClose(); }
  };

  return (
    <div className="cmdk-overlay" onMouseDown={onClose}>
      <div className="cmdk-panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cmdk-search">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="cmdk-search-icon">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            className="cmdk-input"
            placeholder="Type a command…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd className="cmdk-esc">Esc</kbd>
        </div>

        <ul className="cmdk-list" ref={listRef}>
          {filtered.length === 0 && (
            <li className="cmdk-empty">No matching commands</li>
          )}
          {filtered.map((cmd, idx) => (
            <li
              key={cmd.id}
              className={`cmdk-item ${idx === active ? 'active' : ''} ${cmd.danger ? 'danger' : ''}`}
              onMouseEnter={() => setActive(idx)}
              onMouseDown={(e) => { e.preventDefault(); runAt(idx); }}
            >
              <span className="cmdk-item-title">{cmd.title}</span>
              <span className="cmdk-item-hint">{cmd.hint}</span>
              {cmd.keys && <kbd className="cmdk-item-keys">{cmd.keys}</kbd>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
