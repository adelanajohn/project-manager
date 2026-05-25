import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart2, AlertCircle, Zap, GitBranch, Clock } from 'lucide-react';
import { endpoints } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

function StatCard({ title, value, icon: Icon, color, sub }: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{title}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </motion.div>
  );
}

export default function ProjectDashboard() {
  const { orgSlug, projectKey } = useParams<{ orgSlug: string; projectKey: string }>();

  const { data: orgs } = useQuery({
    queryKey: ['orgs'],
    queryFn: () => endpoints.orgs.list().then((r) => r.data.data),
  });
  const org = orgs?.find((o: any) => o.slug === orgSlug);

  const { data: projects } = useQuery({
    queryKey: ['projects', org?.id],
    queryFn: () => endpoints.projects.list(org!.id).then((r) => r.data.data),
    enabled: !!org?.id,
  });
  const project = projects?.find((p: any) => p.identifier.toLowerCase() === projectKey?.toLowerCase());

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', project?.id],
    queryFn: () => endpoints.projects.analytics(project!.id).then((r) => r.data.data),
    enabled: !!project?.id,
  });

  const { data: sprints } = useQuery({
    queryKey: ['sprints', project?.id],
    queryFn: () => endpoints.sprints.list(project!.id).then((r) => r.data.data),
    enabled: !!project?.id,
  });

  if (!project) return <LoadingSpinner />;

  const activeSprint = sprints?.find((s: any) => s.status === 'active');
  const openIssues = analytics?.byStatus?.filter((s: any) =>
    !['done', 'canceled'].includes(s.category)
  ).reduce((sum: number, s: any) => sum + (s._count ?? s.count ?? 0), 0) ?? 0;

  const navLinks = [
    { label: 'Board', href: `/${orgSlug}/${projectKey}/board` },
    { label: 'Backlog', href: `/${orgSlug}/${projectKey}/backlog` },
    { label: 'Sprints', href: `/${orgSlug}/${projectKey}/sprints` },
    { label: 'Roadmap', href: `/${orgSlug}/${projectKey}/roadmap` },
    { label: 'Analytics', href: `/${orgSlug}/${projectKey}/analytics` },
    { label: 'Docs', href: `/${orgSlug}/${projectKey}/docs` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
          style={{ background: project.color ?? '#6366f1' }}
        >
          {project.identifier?.[0]}
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{project.name}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {project.description ?? 'No description'}
          </p>
        </div>
      </div>

      {/* Quick nav */}
      <div className="flex gap-2 flex-wrap">
        {navLinks.map((l) => (
          <Link
            key={l.href}
            to={l.href}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            {l.label}
          </Link>
        ))}
      </div>

      {/* KPI Cards */}
      {analyticsLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title="Open Issues" value={openIssues} icon={AlertCircle} color="#f59e0b" />
          <StatCard
            title="Active Sprint"
            value={activeSprint?.name ?? 'None'}
            icon={Zap}
            color="#6366f1"
            sub={activeSprint ? `Ends ${formatDate(activeSprint.endDate)}` : 'No active sprint'}
          />
          <StatCard
            title="Total Issues"
            value={analytics?.total ?? project._count?.issues ?? 0}
            icon={BarChart2}
            color="#06b6d4"
          />
          <StatCard
            title="Project Type"
            value={project.type ?? 'software'}
            icon={GitBranch}
            color="#8b5cf6"
            sub={`Created ${formatDate(project.createdAt)}`}
          />
        </div>
      )}

      {/* Status breakdown */}
      {analytics?.byStatus && analytics.byStatus.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Issues by Status</h2>
          <div className="space-y-2">
            {analytics.byStatus.map((s: any) => {
              const count = s._count ?? s.count ?? 0;
              const total = analytics.total ?? 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={s.statusId ?? s.category} className="flex items-center gap-3">
                  <div className="w-24 text-xs truncate" style={{ color: 'var(--text-muted)' }}>{s.name ?? s.category}</div>
                  <div className="flex-1 rounded-full h-2" style={{ background: 'var(--bg-secondary)' }}>
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${pct}%`, background: '#6366f1' }}
                    />
                  </div>
                  <div className="w-8 text-xs text-right" style={{ color: 'var(--text-muted)' }}>{count}</div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Recent activity placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl p-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} style={{ color: 'var(--text-muted)' }} />
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Activity</h2>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Activity feed coming soon.</p>
      </motion.div>
    </div>
  );
}
