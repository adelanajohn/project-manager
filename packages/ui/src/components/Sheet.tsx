import { type ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

export type SheetSide = 'left' | 'right' | 'bottom';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  side?: SheetSide;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sideVariants = {
  left: {
    initial: { x: '-100%' },
    animate: { x: 0 },
    exit: { x: '-100%' },
  },
  right: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
  },
  bottom: {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
  },
};

const sidePositions: Record<SheetSide, string> = {
  left: 'inset-y-0 left-0',
  right: 'inset-y-0 right-0',
  bottom: 'inset-x-0 bottom-0 rounded-t-xl',
};

const sizeCls = {
  sm: 'w-80',
  md: 'w-[400px]',
  lg: 'w-[560px]',
  xl: 'w-[720px]',
};

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  side = 'right',
  size = 'md',
  className,
}: SheetProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const variants = sideVariants[side];

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'sheet-title' : undefined}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'absolute flex flex-col shadow-2xl overflow-hidden',
              'bg-[var(--bg-card,#141B2D)] border border-[var(--border,#1E2D45)]',
              sidePositions[side],
              side !== 'bottom' && sizeCls[size],
              side === 'bottom' && 'max-h-[90vh]',
              className
            )}
          >
            {/* Header */}
            {(title || description) && (
              <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-[var(--border,#1E2D45)] flex-shrink-0">
                <div>
                  {title && (
                    <h2 id="sheet-title" className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors ml-4 flex-shrink-0"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
