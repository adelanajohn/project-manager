import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Archive, Settings } from 'lucide-react';
import { endpoints } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ProjectsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', identifier: '', type: 'scrum' as 'scrum' | 'kanban', color: '#6366F1' });

  const { data: orgs } = useQuery({ queryKey: ['orgs'], queryFn: () => endpoints.orgs.list().then(r => r.data.data) });
  const org = orgs?.find((o: any) => o.slug === orgSlug);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', org?.id],
    queryFn: () => endpoints.projects.list(org!.id).then(r => r.data.data),
    enabled: !!org?.id,
  });

  const createMutation = useMutation({
    mutationFn: () => endpoints.projects.create(org!.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      setShowCreate(false);
      setForm({ name: '', identifier: '', type: 'scrum', color: '#6366F1' });
      toast.success('Project created');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Failed to create project'),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Projects</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 h-9 rounded-md text-sm font-medium text-white"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>New Project</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full h-9 px-3 rounded-md text-sm outline-none" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} placeholder="Engineering" />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Identifier</label>
              <input value={form.identifier} onChange={e => setForm(f => ({ ...f, identifier: e.target.value.toUpperCase() }))} className="w-full h-9 px-3 rounded-md text-sm font-mono outline-none" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} placeholder="ENG" maxLength={10} />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))} className="w-full h-9 px-3 rounded-md text-sm outline-none" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <option value="scrum">Scrum</option>
                <option value="kanban">Kanban</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Color</label>
              <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="h-9 w-full rounded-md" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.name || !form.identifier} className="px-4 h-9 rounded-md text-sm font-medium text-white disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 h-9 rounded-md text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects?.map((project: any, i: number) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl p-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: project.color }}>
                  {project.identifier[0]}
                </div>
                <div>
                  <Link to={`/${orgSlug}/${project.identifier.toLowerCase()}`} className="font-semibold text-sm hover:text-indigo-400" style={{ color: 'var(--text-primary)' }}>
                    {project.name}
                  </Link>
                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{project.identifier}</p>
                </div>
              </div>
              {project.status === 'archived' && <Archive size={14} className="text-amber-400" />}
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              <span>{project._count?.issues ?? 0} issues</span>
              <span className="capitalize">{project.type}</span>
              <span>{project._count?.members ?? 0} members</span>
            </div>
          </motion.div>
        ))}
      </div>

      {projects?.length === 0 && (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
          <p className="text-lg mb-2">No projects yet</p>
          <p className="text-sm">Create your first project to get started.</p>
        </div>
      )}
    </div>
  );
}
