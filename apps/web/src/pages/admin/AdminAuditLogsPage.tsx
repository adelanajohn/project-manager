import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatRelativeTime } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const ACTION_COLORS: Record<string, string> = {
  create: '#10b981',
  update: '#6366f1',
  delete: '#ef4444',
  login: '#06b6d4',
  logout: '#64748b',
  invite: '#8b5cf6',
};

function getActionColor(action: string): string {
  for (const [key, color] of Object.entries(ACTION_COLORS)) {
    if (action?.toLowerCase().includes(key)) return color;
  }
  return '#64748b';
}

export default function AdminAuditLogsPage() {
  const [search, setSearch] = useState('');

  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () => api.get('/api/v1/admin/audit-logs').then((r) => r.data.data),
    refetchInterval: 30_000,
  });

  const filtered = (logs ?? []).filter((l: any) => {
    const q = search.toLowerCase();
    return (
      !q ||
      l.action?.toLowerCase().includes(q) ||
      l.actor?.email?.toLowerCase().includes(q) ||
      l.actor?.fullName?.toLowerCase().includes(q) ||
      l.resource?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Audit Logs</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{logs?.length ?? 0} recent events</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter logs…"
              className="pl-9 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg transition-colors hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            aria-label="Refresh"
          >
            <RefreshCw size={14} className={cn(isFetching && 'animate-spin')} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                {['Actor', 'Action', 'Resource', 'IP', 'When'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : filtered.map((log: any, i: number) => {
                const actionColor = getActionColor(log.action);
                return (
                  <tr key={log.id ?? i} className="hover:opacity-90 transition-opacity" style={{ background: 'var(--bg-card)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                          {log.actor?.fullName?.[0] ?? log.actor?.email?.[0] ?? '?'}
                        </div>
                        <div>
                          <p className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>
                            {log.actor?.fullName ?? log.actorId ?? 'System'}
                          </p>
                          {log.actor?.email && (
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{log.actor.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-mono font-medium"
                        style={{ background: `${actionColor}20`, color: actionColor }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                          {log.resourceType ?? log.resource ?? '—'}
                        </p>
                        {log.resourceId && (
                          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{log.resourceId}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {log.ipAddress ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {log.createdAt ? formatRelativeTime(log.createdAt) : '—'}
                    </td>
                  </tr>
                );
              })}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No audit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
