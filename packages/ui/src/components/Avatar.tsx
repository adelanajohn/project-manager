import { type HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

const AVATAR_COLORS = [
  'from-indigo-500 to-violet-500',
  'from-cyan-500 to-blue-500',
  'from-rose-500 to-pink-500',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-teal-500',
];

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
};

export interface AvatarProps {
  name?: string;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
}

export function Avatar({ name = '', src, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover flex-shrink-0', sizeClasses[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 bg-gradient-to-br',
        colorFor(name),
        sizeClasses[size],
        className
      )}
      aria-label={name}
      title={name}
    >
      {getInitials(name) || '?'}
    </div>
  );
}

export interface AvatarGroupProps {
  users: Array<{ name?: string; avatarUrl?: string | null; id?: string }>;
  max?: number;
  size?: AvatarSize;
  className?: string;
}

export function AvatarGroup({ users, max = 4, size = 'sm', className }: AvatarGroupProps) {
  const visible = users.slice(0, max);
  const overflow = users.length - max;

  return (
    <div className={cn('flex -space-x-2', className)} aria-label={`${users.length} members`}>
      {visible.map((u, i) => (
        <div key={u.id ?? i} className="ring-2 ring-[var(--bg-card)] rounded-full" title={u.name}>
          <Avatar name={u.name} src={u.avatarUrl} size={size} />
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            'rounded-full flex items-center justify-center bg-[var(--bg-secondary)] text-[var(--text-muted)] font-medium ring-2 ring-[var(--bg-card)] flex-shrink-0',
            sizeClasses[size]
          )}
          title={`${overflow} more`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
