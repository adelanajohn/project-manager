import { cn } from '../lib/utils';

export interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  gradient?: boolean;
  label?: string;
  showValue?: boolean;
  className?: string;
  animate?: boolean;
}

const sizeClasses = { sm: 'h-1', md: 'h-2', lg: 'h-3' };

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  gradient = true,
  label,
  showValue = false,
  className,
  animate = true,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('w-full', className)} role="progressbar" aria-valuenow={value} aria-valuemax={max} aria-label={label}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-xs text-[var(--text-muted)]">{label}</span>}
          {showValue && <span className="text-xs font-medium text-[var(--text-secondary)]">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        className={cn('w-full rounded-full overflow-hidden bg-[var(--bg-secondary)]', sizeClasses[size])}
      >
        <div
          className={cn(
            'h-full rounded-full',
            animate && 'transition-all duration-500 ease-out',
            gradient
              ? 'bg-gradient-to-r from-indigo-500 to-violet-500'
              : 'bg-indigo-500'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
