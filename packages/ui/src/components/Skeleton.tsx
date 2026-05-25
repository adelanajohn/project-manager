import { type HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, width, height, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded animate-pulse bg-gradient-to-r from-[var(--bg-card)] via-[var(--border)] to-[var(--bg-card)] bg-[length:200%_100%]',
        '[animation:shimmer_1.5s_infinite]',
        className
      )}
      style={{ width, height, ...style }}
      aria-hidden="true"
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={14}
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn('rounded-xl p-4 space-y-3', className)}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3">
        <Skeleton width={32} height={32} className="rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <Skeleton height={12} width="60%" />
          <Skeleton height={10} width="40%" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}
