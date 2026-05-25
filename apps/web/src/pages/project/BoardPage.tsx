import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import { endpoints } from '@/lib/api';
import { cn, PRIORITY_COLORS } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toast } from 'sonner';

function PriorityDot({ priority }: { priority: string }) {
  return (
    <span
      className="w-2 h-2 rounded-full shrink-0"
      style={{ background: PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.none }}
      title={priority}
    />
  );
}

function Avatar({ name, url }: { name?: string; url?: string | null }) {
  if (url) return <img src={url} alt={name} className="w-5 h-5 rounded-full object-cover" />;
  if (!name) return null;
  return (
    <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
      {name[0].toUpperCase()}
    </div>
  );
}

interface Issue {
  id: string;
  key: string;
  title: string;
  priority: string;
  statusId: string;
  rank: string;
  assignee?: { fullName: string; avatarUrl?: string | null };
}

function IssueCard({ issue, overlay = false }: { issue: Issue; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: issue.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const card = (
    <div
      className={cn(
        'rounded-lg p-3 cursor-grab active:cursor-grabbing space-y-2',
        overlay && 'shadow-xl rotate-1'
      )}
      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start gap-2">
        <PriorityDot priority={issue.priority} />
        <p className="text-xs font-medium leading-snug flex-1" style={{ color: 'var(--text-primary)' }}>
          {issue.title}
        </p>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{issue.key}</span>
        <Avatar name={issue.assignee?.fullName} url={issue.assignee?.avatarUrl} />
      </div>
    </div>
  );

  if (overlay) return card;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {card}
    </div>
  );
}

function BoardColumn({ column, issues }: { column: any; issues: Issue[] }) {
  return (
    <div className="flex flex-col w-72 shrink-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: column.color ?? '#64748b' }}
          />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{column.name}</span>
          <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
            {issues.length}
          </span>
        </div>
        <button className="p-1 rounded hover:opacity-70 transition-opacity" aria-label="Add issue">
          <Plus size={14} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div
          className="flex-1 rounded-xl p-2 space-y-2 min-h-[120px]"
          style={{ background: 'var(--bg-secondary)' }}
        >
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
          {issues.length === 0 && (
            <div className="flex items-center justify-center h-20 text-xs" style={{ color: 'var(--text-muted)' }}>
              Drop issues here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function BoardPage() {
  const { orgSlug, projectKey } = useParams<{ orgSlug: string; projectKey: string }>();
  const qc = useQueryClient();
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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

  const { data: board, isLoading } = useQuery({
    queryKey: ['board', project?.id],
    queryFn: () => endpoints.projects.board(project!.id).then((r) => r.data.data),
    enabled: !!project?.id,
  });

  const rankMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => endpoints.issues.updateRank(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', project?.id] }),
    onError: () => toast.error('Failed to move issue'),
  });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (!board) return;
    const allIssues: Issue[] = board.columns?.flatMap((col: any) => col.issues ?? []) ?? [];
    const issue = allIssues.find((i) => i.id === event.active.id);
    if (issue) setActiveIssue(issue);
  }, [board]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveIssue(null);
    const { active, over } = event;
    if (!over || !board) return;

    // Find target column
    const columns: any[] = board.columns ?? [];
    let targetStatusId: string | null = null;

    for (const col of columns) {
      if (col.statusId === over.id || col.id === over.id) {
        targetStatusId = col.statusId ?? col.id;
        break;
      }
      const found = (col.issues ?? []).find((i: any) => i.id === over.id);
      if (found) {
        targetStatusId = col.statusId ?? col.id;
        break;
      }
    }

    if (!targetStatusId) return;

    rankMutation.mutate({
      id: active.id as string,
      data: { statusId: targetStatusId, rank: null },
    });
  }, [board, rankMutation]);

  if (!project || isLoading) return <LoadingSpinner />;

  const columns: any[] = board?.columns ?? board?.statuses?.map((s: any) => ({
    ...s,
    statusId: s.id,
    issues: board?.issues?.filter((i: any) => i.statusId === s.id) ?? [],
  })) ?? [];

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Board</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{project.name}</p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {columns.map((col) => (
            <BoardColumn
              key={col.statusId ?? col.id}
              column={col}
              issues={col.issues ?? []}
            />
          ))}
          {columns.length === 0 && (
            <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
              No columns configured for this project.
            </div>
          )}
        </div>

        <DragOverlay>
          {activeIssue && <IssueCard issue={activeIssue} overlay />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
