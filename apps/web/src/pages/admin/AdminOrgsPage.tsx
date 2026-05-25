import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Ban, CheckCircle, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toast } from 'sonner';

const PLAN_STYLES: Record<string, { bg: string; text: string }> = {
  free: { bg: '#64748b20', text: '#94a3b8' },
  pro: { bg: '#6366f120', text: '#6366f1' },
  enterprise: { bg: '#f59e0b20', text: '#f59e0b' },
};

export default function AdminOrgsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: orgs, isLoading } = useQuery({
    queryKey: ['admin-orgs'],
    queryFn: () => api.get('/api/v1/admin/orgs').then((r) => r.data.data),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) =>
      api.patch(`/api/v1/admin/orgs/${id}`, { suspended }),
    onSuccess: (_, vars) => {
      toast.success(vars.suspended ? 'Organization suspended' : 'Organization reinstated');
      qc.invalidateQueries({ queryKey: ['admin-orgs'] });
    },
    onError: () => toast.error('Failed to update organization'),
  });

  const filtered = (orgs ?? []).filter((o: any) => {
    const q = search.toLowerCase();
    return !q || o.name?.toLowerCase().includes(q) || o.slug?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Organizations</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{orgs?.length ?? 0} total</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orgs…"
            className="pl-9 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
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
                {['Organization', 'Slug', 'Members', 'Projects', 'Plan', 'Created', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : filtered.map((org: any) => {
                const planStyle = PLAN_STYLES[org.plan] ?? PLAN_STYLES.free;
                return (
                  <tr key={org.id} className="hover:opacity-90 transition-opacity" style={{ background: 'var(--bg-card)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg text-white text-xs font-bold flex items-center justify-center" style={{ background: '#6366f1' }}>
                          {org.name?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{org.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{org.slug}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{org._count?.members ?? 0}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{org._count?.projects ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize" style={{ background: planStyle.bg, color: planStyle.text }}>
                        {org.plan ?? 'free'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {org.createdAt ? formatDate(org.createdAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {org.suspended ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">Suspended</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => suspendMutation.mutate({ id: org.id, suspended: !org.suspended })}
                        disabled={suspendMutation.isPending}
                        className={cn(
                          'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                          org.suspended
                            ? 'text-green-400 hover:bg-green-500/10'
                            : 'text-red-400 hover:bg-red-500/10'
                        )}
                      >
                        {org.suspended ? <CheckCircle size={12} /> : <Ban size={12} />}
                        {org.suspended ? 'Reinstate' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No organizations found.
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
