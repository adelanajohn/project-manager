import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart2, Users, AlertCircle, Zap } from 'lucide-react';
import { endpoints } from '@/lib/api';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

function KpiCard({ title, value, icon: Icon, trend, color }: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  trend?: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-5 glass-card"
      style={{ border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{title}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {trend && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{trend}</p>}
    </motion.div>
  );
}

export default function OrgDashboard() {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  const { data: orgsData } = useQuery({
    queryKey: ['orgs'],
    queryFn: () => endpoints.orgs.list().then((r) => r.data.data),
  });

  const org = orgsData?.find((o: any) => o.slug === orgSlug);

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', org?.id],
    queryFn: () => endpoints.projects.list(org!.id).then((r) => r.data.data),
    enabled: !!org?.id,
  });

  if (!org) return <LoadingSpinner />;

  const activeProjects = projects?.filter((p: any) => p.status === 'active') ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{org.name}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Overview of your workspace</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Active Projects" value={activeProjects.length} icon={Zap} color="#6366f1" />
        <KpiCard title="Team Members" value={org._count?.members ?? 0} icon={Users} color="#06b6d4" />
        <KpiCard title="Plan" value={org.plan} icon={BarChart2} color="#8b5cf6" />
        <KpiCard title="Total Projects" value={org._count?.projects ?? 0} icon={AlertCircle} color="#f59e0b" />
      </div>

      {/* Projects list */}
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Active Projects</h2>
        {projectsLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeProjects.map((project: any, i: number) => (
              <motion.a
                key={project.id}
                href={`/${orgSlug}/${project.identifier}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl p-4 block transition-all hover:shadow-card-hover"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: project.color }}
                  >
                    {project.identifier[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{project.name}</p>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{project.identifier}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{project._count?.issues ?? 0} issues</span>
                  <span className="capitalize">{project.type}</span>
                </div>
              </motion.a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
