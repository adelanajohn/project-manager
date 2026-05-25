import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  CheckCircle, Users, AlertCircle, Zap, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import { endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { formatRelativeTime, cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ProgressBar } from '@pm/ui';

function KpiCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
  loading,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  trend?: number;
  color: string;
  loading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-5"
      style={{
        background: 'rgba(20,27,45,0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{title}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      {loading ? (
        <div className="skeleton h-8 w-16 rounded" />
      ) : (
        <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      )}
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-1.5 text-xs">
          {trend > 0 ? (
            <><TrendingUp size={12} className="text-rose-400" /><span className="text-rose-400">+{trend} this week</span></>
          ) : trend < 0 ? (
            <><TrendingDown size={12} className="text-emerald-400" /><span className="text-emerald-400">{trend} this week</span></>
          ) : (
            <><Minus size={12} style={{ color: 'var(--text-muted)' }} /><span style={{ color: 'var(--text-muted)' }}>No change</span></>
          )}
        </div>
      )}
    </motion.div>
  );
}

const CustomTooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-xs shadow-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <p className="font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p style={{ color: '#6366f1' }}>{payload[0].value} completed</p>
    </div>
  );
};

export default function OrgDashboard() {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  const { data: orgs } = useQuery({
    queryKey: queryKeys.orgs.all(),
    queryFn: () => endpoints.orgs.list().then((r) => r.data.data),
  });
  const org = orgs?.find((o: any) => o.slug === orgSlug);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: queryKeys.orgs.dashboard(org?.id ?? ''),
    queryFn: () => endpoints.orgs.dashboard(org!.id).then((r) => r.data.data),
    enabled: !!org?.id,
    refetchInterval: 60_000,
  });

  if (!org) return <LoadingSpinner />;

  const kpis = dashboard?.kpis;
  const throughput: Array<{ day: string; count: number }> = dashboard?.throughput ?? [];
  const sprintProgress: any[] = dashboard?.sprintProgress ?? [];
  const recentActivity: any[] = dashboard?.recentActivity ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{org.name}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Workspace overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Open Issues"
          value={kpis?.openIssues ?? 0}
          icon={CheckCircle}
          trend={kpis?.openIssueTrend}
          color="#6366f1"
          loading={isLoading}
        />
        <KpiCard
          title="Active Sprints"
          value={kpis?.activeSprints ?? 0}
          icon={Zap}
          color="#06b6d4"
          loading={isLoading}
        />
        <KpiCard
          title="Overdue"
          value={kpis?.overdueIssues ?? 0}
          icon={AlertCircle}
          color="#f43f5e"
          loading={isLoading}
        />
        <KpiCard
          title="Members"
          value={kpis?.memberCount ?? org._count?.members ?? 0}
          icon={Users}
          color="#10b981"
          loading={isLoading}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Throughput area chart */}
        <div
          className="xl:col-span-2 rounded-xl p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Issues Completed (last 30 days)
          </h3>
          {isLoading ? (
            <div className="skeleton h-40 rounded" />
          ) : throughput.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No completed issues yet — keep shipping!
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={throughput} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="throughput-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#throughput-gradient)"
                  isAnimationActive
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Activity feed */}
        <div
          className="rounded-xl p-5 flex flex-col"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <h3 className="text-sm font-semibold mb-3 flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
            Recent Activity
          </h3>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-8 rounded" />)}
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No activity yet
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto flex-1">
              {recentActivity.slice(0, 8).map((event: any, i: number) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-start gap-2"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 mt-0.5"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                  >
                    {event.actor?.fullName?.[0] ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                      <span className="font-medium">{event.actor?.fullName ?? 'System'}</span>
                      {' · '}
                      <span style={{ color: 'var(--text-muted)' }}>{event.action.replace('.', ' ')}</span>
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatRelativeTime(event.createdAt)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Sprint progress */}
      {sprintProgress.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Active Sprints
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sprintProgress.map((sprint: any, i: number) => (
              <motion.div
                key={sprint.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl p-4"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: sprint.project?.color ?? '#6366f1' }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {sprint.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {sprint.project?.name}
                    </p>
                  </div>
                </div>
                <ProgressBar
                  value={sprint.pct}
                  showValue
                  size="sm"
                  className="mb-2"
                />
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{sprint.done} / {sprint.total} issues</span>
                  {sprint.endDate && (
                    <span>{formatRelativeTime(sprint.endDate)}</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
