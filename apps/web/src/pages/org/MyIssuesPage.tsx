import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PRIORITY_COLORS, formatDate } from '@/lib/utils';
import { Circle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MyIssuesPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { user } = useAuthStore();

  const { data: orgs } = useQuery({ queryKey: ['orgs'], queryFn: () => endpoints.orgs.list().then(r => r.data.data) });
  const org = orgs?.find((o: any) => o.slug === orgSlug);

  const { data: projects } = useQuery({
    queryKey: ['projects', org?.id],
    queryFn: () => endpoints.projects.list(org!.id).then(r => r.data.data),
    enabled: !!org?.id,
  });

  const allIssuesQueries = useQuery({
    queryKey: ['my-issues', org?.id, user?.id],
    queryFn: async () => {
      if (!projects || !user) return [];
      const results = await Promise.all(
        projects.map((p: any) =>
          endpoints.issues.list(p.id, { assigneeId: user.id }).then(r => r.data.data.map((i: any) => ({ ...i, project: p })))
        )
      );
      return results.flat();
    },
    enabled: !!projects && !!user,
  });

  const issues = allIssuesQueries.data ?? [];

  if (allIssuesQueries.isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>My Issues</h1>

      {issues.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
          <Circle size={40} className="mx-auto mb-3 opacity-30" />
          <p>No issues assigned to you</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {issues.map((issue: any, i: number) => (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-white/5 transition-colors cursor-pointer"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIORITY_COLORS[issue.priority] }} />
              <span className="text-xs font-mono w-20 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{issue.issueKey}</span>
              <span className="flex-1 text-sm truncate" style={{ color: 'var(--text-primary)' }}>{issue.title}</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: issue.status?.color + '20', color: issue.status?.color }}>{issue.status?.name}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{issue.project?.name}</span>
              {issue.dueDate && (
                <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <Clock size={12} />
                  {formatDate(issue.dueDate)}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
