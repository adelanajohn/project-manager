import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Play, CheckCircle, Plus, X, AlertTriangle } from 'lucide-react';
import { endpoints } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toast } from 'sonner';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  planned: { bg: '#6366f120', text: '#6366f1', label: 'Planned' },
  active: { bg: '#10b98120', text: '#10b981', label: 'Active' },
  completed: { bg: '#64748b20', text: '#64748b', label: 'Completed' },
};

interface CompletionModal {
  sprintId: string;
  sprintName: string;
  incompleteCount: number;
}

function CompleteSprintModal({
  modal,
  onClose,
  onConfirm,
  isPending,
}: {
  modal: CompletionModal;
  onClose: () => void;
  onConfirm: (moveToBacklog: boolean) => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
            Complete "{modal.sprintName}"
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70">
            <X size={18} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {modal.incompleteCount > 0 ? (
          <div className="flex items-start gap-3 p-3 rounded-lg mb-4" style={{ background: '#f59e0b10', border: '1px solid #f59e0b40' }}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: '#f59e0b' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              <strong>{modal.incompleteCount}</strong> incomplete issues will need to be moved.
            </p>
          </div>
        ) : (
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            All issues are complete. Ready to close the sprint.
          </p>
        )}

        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Where should incomplete issues go?
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => onConfirm(true)}
            disabled={isPending}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            Move to Backlog & Complete
          </button>
          <button
            onClick={() => onConfirm(false)}
            disabled={isPending}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            Complete Without Moving
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function SprintsPage() {
  const { orgSlug, projectKey } = useParams<{ orgSlug: string; projectKey: string }>();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [completionModal, setCompletionModal] = useState<CompletionModal | null>(null);

  const { register, handleSubmit, reset } = useForm<{ name: string; startDate: string; endDate: string }>();

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

  const { data: sprints, isLoading } = useQuery({
    queryKey: ['sprints', project?.id],
    queryFn: () => endpoints.sprints.list(project!.id).then((r) => r.data.data),
    enabled: !!project?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => endpoints.sprints.create(project!.id, data),
    onSuccess: () => {
      toast.success('Sprint created');
      reset();
      setShowCreate(false);
      qc.invalidateQueries({ queryKey: ['sprints', project?.id] });
    },
    onError: () => toast.error('Failed to create sprint'),
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => endpoints.sprints.start(id),
    onSuccess: () => {
      toast.success('Sprint started');
      qc.invalidateQueries({ queryKey: ['sprints', project?.id] });
    },
    onError: () => toast.error('Failed to start sprint'),
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => endpoints.sprints.complete(id, data),
    onSuccess: () => {
      toast.success('Sprint completed');
      setCompletionModal(null);
      qc.invalidateQueries({ queryKey: ['sprints', project?.id] });
    },
    onError: () => toast.error('Failed to complete sprint'),
  });

  if (!project) return <LoadingSpinner />;

  const sprintList: any[] = sprints ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Sprints</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{sprintList.length} sprints</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
        >
          <Plus size={14} />
          New Sprint
        </button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleSubmit((d) => createMutation.mutate(d))}
              className="rounded-xl p-4 space-y-3"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  {...register('name', { required: true })}
                  autoFocus
                  placeholder="Sprint name"
                  className="rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 sm:col-span-1"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <input
                  {...register('startDate')}
                  type="date"
                  className="rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <input
                  {...register('endDate')}
                  type="date"
                  className="rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setShowCreate(false); reset(); }} className="px-3 py-1.5 rounded-lg text-sm" style={{ color: 'var(--text-muted)' }}>Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="px-4 py-1.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {createMutation.isPending ? 'Creating…' : 'Create Sprint'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-3">
          {sprintList.map((sprint: any, i: number) => {
            const style = STATUS_STYLES[sprint.status] ?? STATUS_STYLES.planned;
            const issueCount = sprint._count?.issues ?? sprint.issues?.length ?? 0;
            const incompleteCount = sprint.issues?.filter((iss: any) =>
              !['done', 'canceled'].includes(iss.status?.category)
            ).length ?? 0;

            return (
              <motion.div
                key={sprint.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl p-4"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{sprint.name}</h3>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: style.bg, color: style.text }}
                      >
                        {style.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {sprint.startDate && <span>{formatDate(sprint.startDate)} – {sprint.endDate ? formatDate(sprint.endDate) : '?'}</span>}
                      <span>{issueCount} issue{issueCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {sprint.status === 'planned' && (
                      <button
                        onClick={() => startMutation.mutate(sprint.id)}
                        disabled={startMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        <Play size={12} />
                        Start
                      </button>
                    )}
                    {sprint.status === 'active' && (
                      <button
                        onClick={() => setCompletionModal({ sprintId: sprint.id, sprintName: sprint.name, incompleteCount })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle size={12} />
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
          {sprintList.length === 0 && (
            <div className="rounded-xl p-12 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No sprints yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Create a sprint to start planning.</p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {completionModal && (
          <CompleteSprintModal
            modal={completionModal}
            onClose={() => setCompletionModal(null)}
            onConfirm={(moveToBacklog) =>
              completeMutation.mutate({
                id: completionModal.sprintId,
                data: { moveIncompleteToBacklog: moveToBacklog },
              })
            }
            isPending={completeMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
