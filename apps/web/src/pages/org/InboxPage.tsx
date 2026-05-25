import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Bell, CheckCheck } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function InboxPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();

  const { data: orgs } = useQuery({ queryKey: ['orgs'], queryFn: () => endpoints.orgs.list().then(r => r.data.data) });
  const org = orgs?.find((o: any) => o.slug === orgSlug);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', org?.id],
    queryFn: () => endpoints.orgs.notifications(org!.id).then(r => r.data.data),
    enabled: !!org?.id,
    refetchInterval: 30_000,
  });

  const markAllRead = useMutation({
    mutationFn: endpoints.notifications.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (isLoading) return <LoadingSpinner />;

  const notifications = data?.notifications ?? [];

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Inbox</h1>
        {notifications.some((n: any) => !n.readAt) && (
          <button onClick={() => markAllRead.mutate()} className="flex items-center gap-2 text-sm px-3 h-8 rounded-md" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
          <Bell size={40} className="mx-auto mb-3 opacity-30" />
          <p>You're all caught up!</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {notifications.map((n: any, i: number) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-start gap-3 px-4 py-3 border-b last:border-b-0"
              style={{ borderColor: 'var(--border)', background: n.readAt ? undefined : 'rgba(99,102,241,0.05)' }}
            >
              {!n.readAt && <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#6366f1' }} />}
              {n.readAt && <div className="w-2 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{n.payload?.title ?? n.type}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatRelativeTime(n.createdAt)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
