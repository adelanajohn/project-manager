import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, Circle } from 'lucide-react';
import { endpoints } from '@/lib/api';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toast } from 'sonner';

const COLOR_SWATCHES = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#f43f5e', '#f97316', '#64748b',
];

interface ProjectForm {
  name: string;
  description: string;
  color: string;
}

interface StatusForm {
  name: string;
  color: string;
  category: string;
}

export default function ProjectSettingsPage() {
  const { orgSlug, projectKey } = useParams<{ orgSlug: string; projectKey: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedColor, setSelectedColor] = useState('');
  const [showAddStatus, setShowAddStatus] = useState(false);

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

  const { register, handleSubmit, setValue, formState: { isDirty } } = useForm<ProjectForm>({
    defaultValues: {
      name: project?.name ?? '',
      description: project?.description ?? '',
      color: project?.color ?? '#6366f1',
    },
  });

  const { register: regStatus, handleSubmit: handleStatusSubmit, reset: resetStatus } = useForm<StatusForm>({
    defaultValues: { color: '#6366f1', category: 'todo' },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ProjectForm) => endpoints.projects.update(project!.id, data),
    onSuccess: () => {
      toast.success('Project updated');
      qc.invalidateQueries({ queryKey: ['projects', org?.id] });
    },
    onError: () => toast.error('Failed to update project'),
  });

  const addStatusMutation = useMutation({
    mutationFn: (data: StatusForm) => endpoints.projects.createStatus(project!.id, data),
    onSuccess: () => {
      toast.success('Status created');
      resetStatus();
      setShowAddStatus(false);
      qc.invalidateQueries({ queryKey: ['projects', org?.id] });
    },
    onError: () => toast.error('Failed to create status'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => endpoints.projects.delete(project!.id),
    onSuccess: () => {
      toast.success('Project deleted');
      navigate(`/${orgSlug}/projects`);
    },
    onError: () => toast.error('Failed to delete project'),
  });

  if (!project) return <LoadingSpinner />;

  const statuses: any[] = project.statuses ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Project Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{project.name} · {project.identifier}</p>
      </div>

      {/* General */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl p-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>General</h3>
        <form onSubmit={handleSubmit((d) => updateMutation.mutate({ ...d, color: selectedColor || project.color }))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Project Name</label>
            <input
              {...register('name', { required: true })}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Description</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setSelectedColor(c); setValue('color', c, { shouldDirty: true }); }}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: c,
                    outline: (selectedColor || project.color) === c ? `2px solid white` : 'none',
                    outlineOffset: '2px',
                    boxShadow: (selectedColor || project.color) === c ? `0 0 0 4px ${c}40` : 'none',
                  }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Statuses */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Statuses</h3>
          <button
            onClick={() => setShowAddStatus(!showAddStatus)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            <Plus size={13} />
            Add Status
          </button>
        </div>

        {showAddStatus && (
          <form
            onSubmit={handleStatusSubmit((d) => addStatusMutation.mutate(d))}
            className="flex gap-3 px-6 py-3 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <input
              {...regStatus('name', { required: true })}
              autoFocus
              placeholder="Status name"
              className="flex-1 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <select
              {...regStatus('category')}
              className="rounded-lg px-3 py-1.5 text-sm outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="backlog">Backlog</option>
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
              <option value="canceled">Canceled</option>
            </select>
            <input
              {...regStatus('color')}
              type="color"
              className="w-10 h-9 rounded-lg cursor-pointer"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            />
            <button type="submit" disabled={addStatusMutation.isPending} className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              Add
            </button>
          </form>
        )}

        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {statuses.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-3">
                <Circle size={12} fill={s.color ?? '#64748b'} style={{ color: s.color ?? '#64748b' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  {s.category}
                </span>
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Position {s.position ?? '—'}</span>
            </div>
          ))}
          {statuses.length === 0 && (
            <p className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>No statuses configured.</p>
          )}
        </div>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl p-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <h3 className="font-semibold mb-1" style={{ color: '#ef4444' }}>Danger Zone</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>This will permanently delete the project and all its data.</p>
        <button
          onClick={() => {
            if (window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) {
              deleteMutation.mutate();
            }
          }}
          disabled={deleteMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          <Trash2 size={14} />
          Delete Project
        </button>
      </motion.div>
    </div>
  );
}
