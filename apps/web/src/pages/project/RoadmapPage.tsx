import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MapPin, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { GanttChart, type GanttItem, type ZoomLevel } from '@pm/ui';
import { cn } from '@/lib/utils';

function useProjectResolver() {
  const { orgSlug, projectKey } = useParams<{ orgSlug: string; projectKey: string }>();

  const { data: orgs } = useQuery({
    queryKey: queryKeys.orgs.all(),
    queryFn: () => endpoints.orgs.list().then((r) => r.data.data),
  });
  const org = orgs?.find((o: any) => o.slug === orgSlug);

  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list(org?.id ?? ''),
    queryFn: () => endpoints.projects.list(org!.id).then((r) => r.data.data),
    enabled: !!org?.id,
  });
  const project = projects?.find(
    (p: any) => p.identifier.toLowerCase() === projectKey?.toLowerCase()
  );

  return { org, project, orgSlug, projectKey };
}

export default function RoadmapPage() {
  const { project } = useProjectResolver();
  const qc = useQueryClient();
  const [zoom, setZoom] = useState<ZoomLevel>('month');
  const [showCreateEpic, setShowCreateEpic] = useState(false);
  const [epicForm, setEpicForm] = useState({ title: '', color: '#6366F1', startDate: '', endDate: '' });

  const { data: roadmap, isLoading } = useQuery({
    queryKey: queryKeys.projects.roadmap(project?.id ?? ''),
    queryFn: () => endpoints.projects.roadmap(project!.id).then((r) => r.data.data),
    enabled: !!project?.id,
  });

  const updateEpicMutation = useMutation({
    mutationFn: ({ id, startDate, endDate }: { id: string; startDate: Date; endDate: Date }) =>
      endpoints.epics.update(id, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects.roadmap(project?.id ?? '') }),
    onError: () => toast.error('Failed to reschedule epic'),
  });

  const createEpicMutation = useMutation({
    mutationFn: () =>
      endpoints.epics.create(project!.id, {
        ...epicForm,
        startDate: epicForm.startDate ? new Date(epicForm.startDate).toISOString() : null,
        endDate: epicForm.endDate ? new Date(epicForm.endDate).toISOString() : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.roadmap(project?.id ?? '') });
      setShowCreateEpic(false);
      setEpicForm({ title: '', color: '#6366F1', startDate: '', endDate: '' });
      toast.success('Epic created');
    },
    onError: () => toast.error('Failed to create epic'),
  });

  // Build GanttItems from roadmap data
  const ganttItems = useMemo<GanttItem[]>(() => {
    if (!roadmap) return [];

    const items: GanttItem[] = [];

    // Epics
    for (const epic of roadmap.epics ?? []) {
      const total = epic.issues?.length ?? 0;
      const done = epic.issues?.filter((i: any) => i.status?.category === 'done').length ?? 0;
      items.push({
        id: epic.id,
        title: epic.title,
        startDate: epic.startDate ? new Date(epic.startDate) : null,
        endDate: epic.endDate ? new Date(epic.endDate) : null,
        color: epic.color ?? '#6366f1',
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
        type: 'epic',
      });
    }

    // Milestones
    for (const ms of roadmap.milestones ?? []) {
      if (ms.dueDate) {
        items.push({
          id: ms.id,
          title: ms.name,
          startDate: new Date(ms.dueDate),
          endDate: new Date(ms.dueDate),
          color: '#f59e0b',
          type: 'milestone',
        });
      }
    }

    // Sprints (as band overlays)
    for (const sprint of roadmap.sprints ?? []) {
      if (sprint.startDate && sprint.endDate) {
        items.push({
          id: sprint.id,
          title: sprint.name,
          startDate: new Date(sprint.startDate),
          endDate: new Date(sprint.endDate),
          color: '#64748b',
          type: 'sprint',
        });
      }
    }

    return items;
  }, [roadmap]);

  if (!project || isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Roadmap</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{project.name}</p>
        </div>
        <button
          onClick={() => setShowCreateEpic(true)}
          className="flex items-center gap-2 px-3 h-8 rounded-md text-sm font-medium text-white"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          <Plus size={14} />
          New Epic
        </button>
      </div>

      {/* Create epic form */}
      {showCreateEpic && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4 flex-shrink-0"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>New Epic</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <input
              value={epicForm.title}
              onChange={(e) => setEpicForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Epic title"
              className="col-span-2 h-8 px-3 rounded-md text-sm outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <input
              type="date"
              value={epicForm.startDate}
              onChange={(e) => setEpicForm((f) => ({ ...f, startDate: e.target.value }))}
              className="h-8 px-3 rounded-md text-sm outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <input
              type="date"
              value={epicForm.endDate}
              onChange={(e) => setEpicForm((f) => ({ ...f, endDate: e.target.value }))}
              className="h-8 px-3 rounded-md text-sm outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => createEpicMutation.mutate()}
              disabled={!epicForm.title || createEpicMutation.isPending}
              className="px-4 h-8 rounded-md text-sm font-medium text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              {createEpicMutation.isPending ? 'Creating…' : 'Create'}
            </button>
            <button
              onClick={() => setShowCreateEpic(false)}
              className="px-4 h-8 rounded-md text-sm"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Gantt chart */}
      {ganttItems.length === 0 ? (
        <div
          className="flex-1 rounded-xl flex flex-col items-center justify-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <MapPin size={32} className="mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No epics or milestones yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Create epics with start and end dates to see them on the roadmap.
          </p>
        </div>
      ) : (
        <div
          className="flex-1 rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)', minHeight: 300 }}
        >
          <GanttChart
            items={ganttItems}
            zoom={zoom}
            onZoomChange={setZoom}
            onItemClick={(item) => {
              // Open epic/milestone detail — could open a sheet
              console.log('Clicked:', item.title);
            }}
            onItemResize={(id, start, end) => {
              updateEpicMutation.mutate({ id, startDate: start, endDate: end });
            }}
          />
        </div>
      )}
    </div>
  );
}
