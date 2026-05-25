import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Building2, FolderKanban, Activity, Database, Shield } from 'lucide-react';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  sub?: string;
}

function KpiCard({ title, value, icon: Icon, color, sub }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{title}</p>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{value ?? '—'}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </motion.div>
  );
}

export default function AdminDashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => api.get('/api/v1/admin/metrics').then((r) => r.data.data),
  });

  if (isLoading) return <LoadingSpinner />;

  const m = metrics ?? {};

  const cards: KpiCardProps[] = [
    { title: 'Total Users', value: m.totalUsers ?? m.users ?? 0, icon: Users, color: '#6366f1' },
    { title: 'Organizations', value: m.totalOrgs ?? m.organizations ?? 0, icon: Building2, color: '#06b6d4' },
    { title: 'Projects', value: m.totalProjects ?? m.projects ?? 0, icon: FolderKanban, color: '#10b981' },
    { title: 'Total Issues', value: m.totalIssues ?? m.issues ?? 0, icon: Activity, color: '#f59e0b' },
    { title: 'Active Sessions', value: m.activeSessions ?? m.sessions ?? 0, icon: Shield, color: '#8b5cf6' },
    { title: 'Queue Jobs', value: m.pendingJobs ?? m.queueDepth ?? 0, icon: Database, color: '#f43f5e', sub: 'Pending jobs' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Admin Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Platform-wide metrics and controls.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <motion.div key={card.title} transition={{ delay: i * 0.05 }}>
            <KpiCard {...card} />
          </motion.div>
        ))}
      </div>

      {/* Queues */}
      {m.queues && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Queue Status</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['Queue', 'Active', 'Waiting', 'Completed', 'Failed'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {Object.entries(m.queues as Record<string, any>).map(([name, q]: [string, any]) => (
                  <tr key={name} className="hover:opacity-80 transition-opacity">
                    <td className="px-6 py-3 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{name}</td>
                    <td className="px-6 py-3" style={{ color: 'var(--text-secondary)' }}>{q.active ?? 0}</td>
                    <td className="px-6 py-3" style={{ color: 'var(--text-secondary)' }}>{q.waiting ?? 0}</td>
                    <td className="px-6 py-3 text-green-400">{q.completed ?? 0}</td>
                    <td className="px-6 py-3 text-red-400">{q.failed ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
