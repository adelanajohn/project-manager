import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { RefreshCw, Database, Activity, Users, FolderKanban, Layers } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface CountCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}

function CountCard({ label, value, icon: Icon, color }: CountCardProps) {
  return (
    <div
      className="rounded-xl p-4 flex items-center gap-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value ?? 0}</p>
      </div>
    </div>
  );
}

export default function AdminMetricsPage() {
  const { data: metrics, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-metrics-detail'],
    queryFn: () => api.get('/api/v1/admin/metrics').then((r) => r.data.data),
    refetchInterval: 30_000,
  });

  if (isLoading) return <LoadingSpinner />;

  const m = metrics ?? {};

  const counts = [
    { label: 'Total Users', value: m.totalUsers ?? m.users ?? 0, icon: Users, color: '#6366f1' },
    { label: 'Organizations', value: m.totalOrgs ?? m.organizations ?? 0, icon: Layers, color: '#06b6d4' },
    { label: 'Projects', value: m.totalProjects ?? m.projects ?? 0, icon: FolderKanban, color: '#10b981' },
    { label: 'Issues', value: m.totalIssues ?? m.issues ?? 0, icon: Activity, color: '#f59e0b' },
    { label: 'Documents', value: m.totalDocs ?? m.docs ?? 0, icon: Database, color: '#8b5cf6' },
    { label: 'Comments', value: m.totalComments ?? m.comments ?? 0, icon: Activity, color: '#f43f5e' },
  ];

  // Queue depths
  const queues: Record<string, any> = m.queues ?? m.queueDepths ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>System Metrics</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Real-time platform health and usage.</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors hover:opacity-80 disabled:opacity-50"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          <RefreshCw size={13} className={cn(isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Totals */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Totals</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {counts.map((c, i) => (
            <motion.div key={c.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <CountCard {...c} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Queue Depths */}
      {Object.keys(queues).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Queue Depths</h2>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['Queue Name', 'Active', 'Waiting', 'Delayed', 'Completed', 'Failed'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {Object.entries(queues).map(([name, q]: [string, any]) => (
                  <tr key={name} className="hover:opacity-90 transition-opacity" style={{ background: 'var(--bg-card)' }}>
                    <td className="px-4 py-3 font-mono text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{name}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      <span className={cn((q.active ?? 0) > 0 && 'text-indigo-400 font-medium')}>
                        {q.active ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      <span className={cn((q.waiting ?? 0) > 10 && 'text-yellow-400 font-medium')}>
                        {q.waiting ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{q.delayed ?? 0}</td>
                    <td className="px-4 py-3 text-green-400">{q.completed ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={cn('font-medium', (q.failed ?? 0) > 0 ? 'text-red-400' : '')} style={!(q.failed ?? 0) ? { color: 'var(--text-secondary)' } : {}}>
                        {q.failed ?? 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Raw metrics dump for additional data */}
      {m.redis && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Redis</h2>
          <div className="rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {Object.entries(m.redis).map(([key, val]) => (
              <div key={key}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{key}</p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{String(val)}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
