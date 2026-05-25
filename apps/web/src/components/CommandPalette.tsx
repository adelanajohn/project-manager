import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useUIStore } from '@/stores/ui.store';
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';

export default function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { data: searchData } = useQuery({
    queryKey: ['search', query],
    queryFn: () => endpoints.search({ q: query }).then((r) => r.data.data),
    enabled: query.trim().length >= 2,
    staleTime: 10_000,
  });

  useHotkeys('escape', () => setCommandPaletteOpen(false), { enabled: commandPaletteOpen });

  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [commandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  const issues = searchData?.issues ?? [];
  const docs = searchData?.docs ?? [];
  const hasResults = issues.length > 0 || docs.length > 0;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={(e) => { if (e.target === e.currentTarget) setCommandPaletteOpen(false); }}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.12 }}
          className="w-full max-w-xl mx-4 rounded-xl shadow-2xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {/* Input */}
          <div className="flex items-center gap-3 px-4 h-14 border-b" style={{ borderColor: 'var(--border)' }}>
            <Search size={18} style={{ color: 'var(--text-muted)' }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search issues, docs, members..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
            <button onClick={() => setCommandPaletteOpen(false)} aria-label="Close">
              <X size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {query.trim().length >= 2 && !hasResults && (
              <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                No results for "{query}"
              </div>
            )}

            {issues.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Issues
                </div>
                {issues.map((issue: any) => (
                  <button
                    key={issue.id}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-white/5"
                    onClick={() => {
                      navigate(`/${issue.project?.identifier?.toLowerCase()}/${issue.project?.identifier}/issues/${issue.issueKey}`);
                      setCommandPaletteOpen(false);
                    }}
                  >
                    <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{issue.issueKey}</span>
                    <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{issue.title}</span>
                    {issue.project && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                        {issue.project.name}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {docs.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Docs
                </div>
                {docs.map((doc: any) => (
                  <button
                    key={doc.id}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-white/5"
                    onClick={() => {
                      navigate(`/docs/${doc.id}`);
                      setCommandPaletteOpen(false);
                    }}
                  >
                    <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{doc.title}</span>
                  </button>
                ))}
              </div>
            )}

            {query.trim().length < 2 && (
              <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                Type at least 2 characters to search
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
