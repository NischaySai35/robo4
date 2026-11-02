/**
 * TabBar — the one row of tabs used on every page (P7). The open tab is underlined and says so to screen readers
 * (role=tab, aria-selected); Left/Right/Home/End move between tabs from the keyboard, as in any desktop app.
 */
import { useRef } from 'react';
import { cn } from '@/lib/utils';

export interface TabSpec<T extends string> { id: T; label: React.ReactNode; title?: string; testId?: string }

export function TabBar<T extends string>({ value, tabs, onChange, className, size = 'md' }: {
  value: T;
  tabs: TabSpec<T>[];
  onChange: (id: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const row = useRef<HTMLDivElement>(null);
  const move = (e: React.KeyboardEvent, i: number) => {
    const n = tabs.length;
    const to = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    onChange(tabs[to].id);
    (row.current?.querySelectorAll<HTMLButtonElement>('[role=tab]')[to])?.focus();
  };
  return (
    <div ref={row} role="tablist" className={cn('tw:flex tw:gap-0.5 tw:border-b tw:border-border tw:overflow-x-auto', className)}>
      {tabs.map((t, i) => {
        const on = t.id === value;
        return (
          <button key={t.id} role="tab" aria-selected={on} tabIndex={on ? 0 : -1} title={t.title} data-testid={t.testId}
            onClick={() => onChange(t.id)} onKeyDown={(e) => move(e, i)}
            className={cn('tw:font-[inherit] tw:cursor-pointer tw:bg-transparent tw:whitespace-nowrap tw:border-0 tw:border-b-2 tw:-mb-px tw:transition-colors',
              size === 'sm' ? 'tw:px-2 tw:py-1 tw:text-xs' : 'tw:px-3 tw:py-1.5 tw:text-sm',
              on ? 'tw:border-primary tw:text-foreground tw:font-semibold' : 'tw:border-transparent tw:text-muted-foreground tw:hover:text-foreground tw:hover:bg-muted/40')}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
