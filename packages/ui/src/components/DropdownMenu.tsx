import { type ReactNode, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

export interface DropdownItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  checked?: boolean;
  items?: DropdownItem[]; // sub-menu
  onSelect?: () => void;
}

export type DropdownSeparator = { type: 'separator' };
export type DropdownSection = { type: 'section'; label: string };
export type DropdownEntry = DropdownItem | DropdownSeparator | DropdownSection;

export interface DropdownMenuProps {
  trigger: ReactNode;
  items: DropdownEntry[];
  align?: 'start' | 'end';
  side?: 'top' | 'bottom';
  className?: string;
}

function isSeparator(item: DropdownEntry): item is DropdownSeparator {
  return (item as any).type === 'separator';
}

function isSection(item: DropdownEntry): item is DropdownSection {
  return (item as any).type === 'section';
}

export function DropdownMenu({ trigger, items, align = 'start', side = 'bottom', className }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const alignClass = align === 'end' ? 'right-0' : 'left-0';
  const sideClass = side === 'top' ? 'bottom-full mb-1' : 'top-full mt-1';

  return (
    <div ref={ref} className="relative inline-flex">
      <div
        onClick={() => setOpen((v) => !v)}
        role="button"
        tabIndex={0}
        aria-haspopup="true"
        aria-expanded={open}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen((v) => !v); }}
      >
        {trigger}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: side === 'top' ? 4 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.1 }}
            className={cn(
              'absolute z-50 min-w-[160px] rounded-xl overflow-hidden shadow-2xl py-1',
              'bg-[var(--bg-card,#141B2D)] border border-[var(--border,#1E2D45)]',
              alignClass,
              sideClass,
              className
            )}
            role="menu"
          >
            {items.map((item, i) => {
              if (isSeparator(item)) {
                return (
                  <div
                    key={i}
                    className="my-1 border-t"
                    style={{ borderColor: 'var(--border, #1E2D45)' }}
                  />
                );
              }

              if (isSection(item)) {
                return (
                  <div
                    key={i}
                    className="px-3 py-1 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {item.label}
                  </div>
                );
              }

              return (
                <button
                  key={item.id}
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    if (!item.disabled && !item.items) {
                      item.onSelect?.();
                      setOpen(false);
                    }
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                    item.danger
                      ? 'text-rose-400 hover:bg-rose-500/10'
                      : 'hover:bg-white/5',
                    !item.danger && 'text-[var(--text-secondary)]'
                  )}
                >
                  {item.checked !== undefined && (
                    <span className="w-4 flex-shrink-0">
                      {item.checked && <Check size={12} style={{ color: '#6366f1' }} />}
                    </span>
                  )}
                  {item.icon && (
                    <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                      {item.icon}
                    </span>
                  )}
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && (
                    <span className="text-xs ml-2 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {item.shortcut}
                    </span>
                  )}
                  {item.items && <ChevronRight size={12} className="flex-shrink-0 ml-1" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
