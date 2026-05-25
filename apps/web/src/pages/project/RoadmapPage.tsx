import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Info } from 'lucide-react';
import { endpoints } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const EPIC_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 rounded-full h-1.5" style={{ background: 'var(--bg-secondary)' }}>
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs tabular-nums w-8 text-right" style={{ color: 'var(--text-muted)' }}>
        {Math.round(pct)}%
      </span>
    </div>
  );
}

export default function RoadmapPage() {
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

  const { data: roadmap, isLoading } = useQuery({
    queryKey: ['roadmap', project?.id],
    queryFn: () => endpoints.projects.roadmap(project!.id).then((r) => r.data.data),
    enabled: !!project?.id,
  });

  // Fallback: epics list if roadmap not available
  const { data: epicsData } = useQuery({
    queryKey: ['epics', project?.id],
    queryFn: () => endpoints.epics.list(project!.id).then((r) => r.data.data),
    enabled: !!project?.id && !roadmap,
  });

  if (!project || isLoading) return <LoadingSpinner />;

  const items: any[] = roadmap?.epics ?? roadmap?.items ?? epicsData ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Roadmap</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{project.name}</p>
        </div>
      </div>

      {/* Coming soon notice */}
      <div
        className="flex items-start gap-3 rounded-xl p-4"
        style={{ background: '#6366f110', border: '1px solid #6366f130' }}
      >
        <Info size={16} className="mt-0.5 shrink-0" style={{ color: '#6366f1' }} />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          <strong>Full Gantt view coming soon.</strong> Currently showing epics with dates and progress.
        </p>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <MapPin size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No epics yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Create epics to plan your roadmap.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((epic: any, i: number) => {
            const color = EPIC_COLORS[i % EPIC_COLORS.length];
            const completed = epic.completedIssues ?? epic._count?.completedIssues ?? 0;
            const total = epic.totalIssues ?? epic._count?.issues ?? epic._count?.totalIssues ?? 0;

            return (
              <motion.div
                key={epic.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl p-4"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-3 h-3 rounded-full mt-1 shrink-0"
                    style={{ background: color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{epic.title ?? epic.name}</h3>
                        {epic.description && (
                          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                            {typeof epic.description === 'string' ? epic.description : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {epic.startDate && (
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            {formatDate(epic.startDate)}
                          </span>
                        )}
                        {epic.endDate && (
                          <>
                            <span>→</span>
                            <span>{formatDate(epic.endDate)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {total > 0 && (
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span>{completed} / {total} issues</span>
                        </div>
                        <ProgressBar value={completed} max={total} color={color} />
                      </div>
                    )}

                    {epic.status && (
                      <div className="mt-2">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: `${color}20`, color }}
                        >
                          {epic.status}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
