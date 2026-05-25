import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { endpoints } from '@/lib/api';
import { PRIORITY_COLORS, STATUS_CATEGORY_COLORS } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const TYPE_COLORS: Record<string, string> = {
  bug: '#ef4444',
  feature: '#6366f1',
  task: '#06b6d4',
  story: '#8b5cf6',
  epic: '#f59e0b',
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      {children}
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-sm shadow-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
      {label && <p className="font-medium mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
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

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', project?.id],
    queryFn: () => endpoints.projects.analytics(project!.id).then((r) => r.data.data),
    enabled: !!project?.id,
  });

  if (!project || isLoading) return <LoadingSpinner />;

  // Normalize data
  const byStatus = (analytics?.byStatus ?? []).map((s: any) => ({
    name: s.name ?? s.category ?? s.statusId,
    value: s._count ?? s.count ?? 0,
    fill: STATUS_CATEGORY_COLORS[s.category] ?? '#6366f1',
  }));

  const byPriority = Object.entries(PRIORITY_COLORS).map(([key, color]) => {
    const found = (analytics?.byPriority ?? []).find((p: any) => p.priority === key);
    return {
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: found?._count ?? found?.count ?? 0,
      fill: color,
    };
  }).filter((d) => d.value > 0);

  const byType = (analytics?.byType ?? []).map((t: any) => ({
    name: t.type ?? t.issueType,
    value: t._count ?? t.count ?? 0,
    fill: TYPE_COLORS[t.type ?? t.issueType] ?? '#6366f1',
  }));

  const velocity = (analytics?.sprintVelocity ?? analytics?.velocity ?? []).map((s: any) => ({
    sprint: s.sprintName ?? s.name ?? `Sprint ${s.sprintId?.slice(-4)}`,
    completed: s.completed ?? s.completedCount ?? 0,
    total: s.total ?? s.totalCount ?? 0,
  }));

  const RADIAN = Math.PI / 180;
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="600">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{project.name} · {analytics?.total ?? 0} total issues</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Issues by Status */}
        <ChartCard title="Issues by Status">
          {byStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={byStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  dataKey="value"
                  labelLine={false}
                  label={renderCustomLabel}
                >
                  {byStatus.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>No data</div>
          )}
        </ChartCard>

        {/* Issues by Priority */}
        <ChartCard title="Issues by Priority">
          {byPriority.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={byPriority}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  dataKey="value"
                  labelLine={false}
                  label={renderCustomLabel}
                >
                  {byPriority.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>No data</div>
          )}
        </ChartCard>

        {/* Issues by Type */}
        <ChartCard title="Issues by Type">
          {byType.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byType} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                  {byType.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>No data</div>
          )}
        </ChartCard>

        {/* Sprint Velocity */}
        <ChartCard title="Sprint Velocity">
          {velocity.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={velocity} barCategoryGap="30%">
                <XAxis dataKey="sprint" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{v}</span>} />
                <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="total" name="Total" fill="#6366f130" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No sprint data available yet.
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
