import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Plus, ChevronRight, ChevronDown, FileText, X } from 'lucide-react';
import { endpoints, api } from '@/lib/api';
import { cn, formatRelativeTime } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toast } from 'sonner';

interface DocPage {
  id: string;
  title: string;
  parentId?: string | null;
  updatedAt: string;
  children?: DocPage[];
}

function buildTree(pages: DocPage[]): DocPage[] {
  const map = new Map<string, DocPage & { children: DocPage[] }>();
  const roots: DocPage[] = [];

  for (const p of pages) {
    map.set(p.id, { ...p, children: [] });
  }
  for (const p of pages) {
    if (p.parentId && map.has(p.parentId)) {
      map.get(p.parentId)!.children.push(map.get(p.id)!);
    } else {
      roots.push(map.get(p.id)!);
    }
  }
  return roots;
}

function DocTreeItem({ page, orgSlug, projectKey, depth = 0 }: {
  page: DocPage;
  orgSlug: string;
  projectKey: string;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = (page.children?.length ?? 0) > 0;

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:opacity-80 transition-opacity group cursor-pointer"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-4 h-4 flex items-center justify-center shrink-0 opacity-60"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {hasChildren ? (
            expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          ) : (
            <span className="w-4" />
          )}
        </button>
        <FileText size={13} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
        <Link
          to={`/${orgSlug}/${projectKey}/docs/${page.id}`}
          className="flex-1 text-sm truncate"
          style={{ color: 'var(--text-primary)' }}
        >
          {page.title || 'Untitled'}
        </Link>
        <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }}>
          {formatRelativeTime(page.updatedAt)}
        </span>
      </div>
      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {page.children!.map((child) => (
              <DocTreeItem key={child.id} page={child} orgSlug={orgSlug} projectKey={projectKey} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DocsPage() {
  const { orgSlug, projectKey } = useParams<{ orgSlug: string; projectKey: string }>();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const { register, handleSubmit, reset } = useForm<{ title: string }>();

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

  const { data: docs, isLoading } = useQuery({
    queryKey: ['docs', project?.id],
    queryFn: () => api.get(`/api/v1/projects/${project!.id}/docs`).then((r) => r.data.data),
    enabled: !!project?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string }) =>
      api.post(`/api/v1/projects/${project!.id}/docs`, data),
    onSuccess: () => {
      toast.success('Page created');
      reset();
      setShowCreate(false);
      qc.invalidateQueries({ queryKey: ['docs', project?.id] });
    },
    onError: () => toast.error('Failed to create page'),
  });

  if (!project) return <LoadingSpinner />;

  const pages: DocPage[] = docs ?? [];
  const tree = buildTree(pages);

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Docs</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{pages.length} page{pages.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
        >
          <Plus size={14} />
          New Page
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
              className="flex gap-2 p-4 rounded-xl"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <input
                {...register('title', { required: true })}
                autoFocus
                placeholder="Page title…"
                className="flex-1 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
              <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </button>
              <button type="button" onClick={() => { setShowCreate(false); reset(); }} className="p-2 rounded-lg hover:opacity-70">
                <X size={16} style={{ color: 'var(--text-muted)' }} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <LoadingSpinner />
      ) : tree.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <FileText size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No docs yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Create your first page to get started.</p>
        </div>
      ) : (
        <div className="rounded-xl py-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {tree.map((page) => (
            <DocTreeItem
              key={page.id}
              page={page as DocPage}
              orgSlug={orgSlug!}
              projectKey={projectKey!}
            />
          ))}
        </div>
      )}
    </div>
  );
}
