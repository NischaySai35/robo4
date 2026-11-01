/**
 * Segmented — one row of buttons where exactly one is chosen (Image / Video, PNG / JPEG, engines). Built on the shared
 * Button so it looks and behaves like every other control; the chosen one says so to screen readers (aria-pressed).
 */
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SegmentOption<T extends string | number> { value: T; label: React.ReactNode; title?: string; disabled?: boolean }

export function Segmented<T extends string | number>({ value, options, onChange, className, size = 'sm' }: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (v: T) => void;
  className?: string;
  size?: 'xs' | 'sm';
}) {
  return (
    <div role="group" className={cn('tw:flex tw:gap-1', className)}>
      {options.map((o) => (
        <Button key={String(o.value)} size={size} title={o.title} aria-pressed={o.value === value} disabled={o.disabled}
          variant={o.value === value ? 'default' : 'outline'} className="tw:flex-1" onClick={() => onChange(o.value)}>
          {o.label}
        </Button>
      ))}
    </div>
  );
}
