import { type HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

export function Kbd({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium',
        'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)]',
        'shadow-[0_1px_0_var(--border)]',
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
