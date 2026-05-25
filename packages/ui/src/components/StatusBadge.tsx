import { cn } from '../lib/utils';

export type StatusCategory = 'backlog' | 'todo' | 'in_progress' | 'done' | 'canceled';

const categoryConfig: Record<StatusCategory, { color: string; pulse: boolean; label: string }> = {
  backlog: { color: '#64748b', pulse: false, label: 'Backlog' },
  todo: { color: '#6366f1', pulse: false, label: 'Todo' },
  in_progress: { color: '#06b6d4', pulse: true, label: 'In Progress' },
  done: { color: '#10b981', pulse: false, label: 'Done' },
  canceled: { color: '#ef4444', pulse: false, label: 'Canceled' },
};

export interface StatusBadgeProps {
  category?: StatusCategory;
  name?: string;
  color?: string;
  className?: string;
}

export function StatusBadge({ category, name, color, className }: StatusBadgeProps) {
  const cfg = category ? categoryConfig[category] : null;
  const dotColor = color ?? cfg?.color ?? '#64748b';
  const label = name ?? cfg?.label ?? category ?? '';
  const pulse = cfg?.pulse ?? false;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
        className
      )}
      style={{ background: `${dotColor}18`, color: dotColor }}
    >
      <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
        {pulse && (
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: dotColor }}
          />
        )}
        <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: dotColor }} />
      </span>
      {label}
    </span>
  );
}
