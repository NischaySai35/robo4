/** cn: join class names and let the last conflicting Tailwind class win. Used by components/ui. */
import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// tokens.css uses the tw prefix, and tailwind-merge has to be told or it treats tw:* as unknown.
const merge = extendTailwindMerge({ prefix: 'tw' });

export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs));
}
