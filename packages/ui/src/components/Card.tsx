import { type HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  hover?: boolean;
}

export function Card({ glass = false, hover = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border',
        glass
          ? 'bg-[#141B2D]/70 backdrop-blur-md border-white/5'
          : 'bg-[var(--bg-card)] border-[var(--border)]',
        hover && 'transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)] cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-5 py-4 border-b border-[var(--border)]', className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-sm font-semibold text-[var(--text-primary)]', className)}
      {...props}
    >
      {children}
    </h3>
  );
}
