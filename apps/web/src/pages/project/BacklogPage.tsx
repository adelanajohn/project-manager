import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Plus, ChevronUp, GitBranch, Bug, Zap, BookOpen } from 'lucide-react';
import { endpoints } from '@/lib/api';
import { cn, PRIORITY_COLORS } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toast } from 'sonner';

const TYPE_ICONS: Record<string, React.ElementType> = {
  feature: Zap,
  bug: Bug,
  task: GitBranch,
  story: BookOpen,
  epic: BookOpen,
};

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

interface CreateIssueForm {
  title: string;
  priority: string;
  type: string;
}

export default function BacklogPage() {
  const { orgSlug, projectKey } = useParams<{ orgSlug: string; projectKey: string }>();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<CreateIssueForm>({
    defaultValues: { priority: 'none', type: 'task' },
  });

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

  const { data: backlog, isLoading } = useQuery({
    queryKey: ['backlog', project?.id],
    queryFn: () => endpoints.projects.backlog(project!.id).then((r) => r.data.data),
    enabled: !!project?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateIssueForm) =>
      endpoints.issues.create(project!.id, data),
    onSuccess: () => {
      toast.success('Issue created');
      reset();
      setShowCreate(false);
      qc.invalidateQueries({ queryKey: ['backlog', project?.id] });
    },
    onError: () => toast.error('Failed to create issue'),
  });

  if (!project) return <LoadingSpinner />;

  const issues: any[] = backlog?.issues ?? backlog ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Backlog</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{issues.length} issues</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
        >
          <Plus size={14} />
          New Issue
        </button>
      </div>

      {/* Inline create form */}
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
              <div className="flex gap-3">
                <input
                  {...register('title', { required: true })}
                  autoFocus
                  placeholder="Issue title…"
                  className="flex-1 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <select
                  {...register('type')}
                  className="rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  <option value="task">Task</option>
                  <option value="bug">Bug</option>
                  <option value="feature">Feature</option>
                  <option value="story">Story</option>
                </select>
                <select
                  {...register('priority')}
                  className="rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  <option value="none">No Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); reset(); }}
                  className="px-3 py-1.5 rounded-lg text-sm"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Creating…' : 'Create Issue'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Issues list */}
      {isLoading ? (
        <LoadingSpinner />
      ) : issues.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Backlog is empty</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Create an issue to get started.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {issues.map((issue: any, i: number) => {
              const TypeIcon = TYPE_ICONS[issue.type] ?? GitBranch;
              return (
                <motion.div
                  key={issue.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 px-4 py-3 hover:opacity-90 transition-opacity"
                  style={{ background: 'var(--bg-card)' }}
                >
                  <span className="text-xs font-mono w-16 shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {issue.rank ? (
                      <ChevronUp size={10} className="inline mr-0.5" />
                    ) : null}
                    {issue.identifier ?? issue.key}
                  </span>
                  <TypeIcon size={14} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <PriorityDot priority={issue.priority} />
                  <span className="flex-1 text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {issue.title}
                  </span>
                  <Avatar name={issue.assignee?.fullName} url={issue.assignee?.avatarUrl} />
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
