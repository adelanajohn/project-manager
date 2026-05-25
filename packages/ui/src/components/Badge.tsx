import { type HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

export type BadgeVariant = 'default' | 'urgent' | 'high' | 'medium' | 'low' | 'none' | 'success' | 'warning' | 'danger';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]',
  urgent: 'bg-rose-500/15 text-rose-400',
  high: 'bg-orange-500/15 text-orange-400',
  medium: 'bg-amber-500/15 text-amber-400',
  low: 'bg-cyan-500/15 text-cyan-400',
  none: 'bg-[var(--bg-secondary)] text-[var(--text-muted)]',
  success: 'bg-emerald-500/15 text-emerald-400',
  warning: 'bg-amber-500/15 text-amber-400',
  danger: 'bg-rose-500/15 text-rose-400',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-[var(--text-muted)]',
  urgent: 'bg-rose-400',
  high: 'bg-orange-400',
  medium: 'bg-amber-400',
  low: 'bg-cyan-400',
  none: 'bg-[var(--text-muted)]',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-rose-400',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export function Badge({ variant = 'default', dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant])} />
      )}
      {children}
    </span>
  );
}
