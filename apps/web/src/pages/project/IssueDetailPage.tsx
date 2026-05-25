import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Send, Edit2, Check, X } from 'lucide-react';
import { endpoints } from '@/lib/api';
import { cn, formatDate, formatRelativeTime, PRIORITY_COLORS } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toast } from 'sonner';

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
      <span className="text-xs w-24 shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{children}</div>
    </div>
  );
}

function Avatar({ name, url }: { name?: string; url?: string | null }) {
  if (url) return <img src={url} alt={name} className="w-5 h-5 rounded-full object-cover" />;
  if (!name) return <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>;
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[9px] font-bold">
        {name[0]}
      </div>
      <span>{name}</span>
    </div>
  );
}

function JsonBlock({ data }: { data: any }) {
  if (!data) return <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>No description</p>;
  if (typeof data === 'string') return <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{data}</p>;

  // Try to render block-style content (ProseMirror/TipTap/BlockNote style)
  const content = data.content ?? (Array.isArray(data) ? data : null);
  if (content) {
    return (
      <div className="space-y-2">
        {content.map((block: any, i: number) => {
          if (block.type === 'paragraph') {
            const text = block.content?.map((c: any) => c.text ?? '').join('') ?? '';
            return <p key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>{text || <span className="opacity-40">Empty paragraph</span>}</p>;
          }
          if (block.type === 'heading') {
            const text = block.content?.map((c: any) => c.text ?? '').join('') ?? '';
            return <p key={i} className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{text}</p>;
          }
          return null;
        })}
      </div>
    );
  }

  return (
    <pre className="text-xs rounded-lg p-3 overflow-auto" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function IssueDetailPage() {
  const { orgSlug, projectKey, issueKey } = useParams<{ orgSlug: string; projectKey: string; issueKey: string }>();
  const qc = useQueryClient();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  const { register: regComment, handleSubmit: handleComment, reset: resetComment } = useForm<{ body: string }>();

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

  // Fetch issue by key
  const { data: issuesData } = useQuery({
    queryKey: ['issues', project?.id, issueKey],
    queryFn: () => endpoints.issues.list(project!.id, { key: issueKey }).then((r) => r.data.data),
    enabled: !!project?.id && !!issueKey,
  });
  const issueFromList = issuesData?.issues?.[0] ?? issuesData?.[0];

  const { data: issue, isLoading } = useQuery({
    queryKey: ['issue', issueFromList?.id],
    queryFn: () => endpoints.issues.get(issueFromList!.id).then((r) => r.data.data),
    enabled: !!issueFromList?.id,
  });

  const { data: comments } = useQuery({
    queryKey: ['comments', issue?.id],
    queryFn: () => endpoints.issues.comments(issue!.id).then((r) => r.data.data),
    enabled: !!issue?.id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => endpoints.issues.update(issue!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['issue', issue?.id] });
      setEditingTitle(false);
    },
    onError: () => toast.error('Failed to update issue'),
  });

  const commentMutation = useMutation({
    mutationFn: (data: { body: string }) => endpoints.issues.createComment(issue!.id, data),
    onSuccess: () => {
      toast.success('Comment added');
      resetComment();
      qc.invalidateQueries({ queryKey: ['comments', issue?.id] });
    },
    onError: () => toast.error('Failed to add comment'),
  });

  if (!issue || isLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Title */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                {issue.identifier ?? issue.key}
              </span>
              <span className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{issue.type}</span>
            </div>
            {editingTitle ? (
              <div className="flex gap-2">
                <input
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  autoFocus
                  className="flex-1 text-xl font-bold rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') updateMutation.mutate({ title: titleValue });
                    if (e.key === 'Escape') setEditingTitle(false);
                  }}
                />
                <button onClick={() => updateMutation.mutate({ title: titleValue })} className="p-2 rounded-lg hover:bg-green-500/10">
                  <Check size={16} style={{ color: '#10b981' }} />
                </button>
                <button onClick={() => setEditingTitle(false)} className="p-2 rounded-lg hover:bg-red-500/10">
                  <X size={16} style={{ color: '#ef4444' }} />
                </button>
              </div>
            ) : (
              <div className="group flex items-start gap-2">
                <h1 className="text-xl font-bold flex-1" style={{ color: 'var(--text-primary)' }}>{issue.title}</h1>
                <button
                  onClick={() => { setTitleValue(issue.title); setEditingTitle(true); }}
                  className="p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Edit title"
                >
                  <Edit2 size={14} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Description</h3>
            <JsonBlock data={issue.description} />
          </div>

          {/* Comments */}
          <div className="rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Comments ({comments?.length ?? 0})
              </h3>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {(comments ?? []).map((c: any) => (
                <div key={c.id} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[9px] font-bold">
                      {c.author?.fullName?.[0] ?? '?'}
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.author?.fullName ?? 'Unknown'}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatRelativeTime(c.createdAt)}</span>
                  </div>
                  <p className="text-sm pl-8 whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{c.body}</p>
                </div>
              ))}
              {(comments ?? []).length === 0 && (
                <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>No comments yet.</p>
              )}
            </div>

            {/* Add comment */}
            <form
              onSubmit={handleComment((d) => commentMutation.mutate(d))}
              className="p-4 border-t"
              style={{ borderColor: 'var(--border)' }}
            >
              <textarea
                {...regComment('body', { required: true })}
                rows={3}
                placeholder="Add a comment…"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={commentMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Send size={12} />
                  {commentMutation.isPending ? 'Sending…' : 'Comment'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Metadata sidebar */}
        <div className="space-y-3">
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Details</h3>

            <MetaRow label="Status">
              <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--bg-secondary)' }}>
                {issue.status?.name ?? issue.statusId ?? '—'}
              </span>
            </MetaRow>

            <MetaRow label="Priority">
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: PRIORITY_COLORS[issue.priority] ?? PRIORITY_COLORS.none }}
                />
                <span className="capitalize">{issue.priority ?? 'none'}</span>
              </span>
            </MetaRow>

            <MetaRow label="Assignee">
              <Avatar name={issue.assignee?.fullName} url={issue.assignee?.avatarUrl} />
            </MetaRow>

            <MetaRow label="Reporter">
              <Avatar name={issue.reporter?.fullName} url={issue.reporter?.avatarUrl} />
            </MetaRow>

            <MetaRow label="Estimate">
              {issue.estimate != null ? `${issue.estimate} pts` : '—'}
            </MetaRow>

            <MetaRow label="Created">
              {issue.createdAt ? formatDate(issue.createdAt) : '—'}
            </MetaRow>

            <MetaRow label="Updated">
              {issue.updatedAt ? formatRelativeTime(issue.updatedAt) : '—'}
            </MetaRow>

            {issue.dueDate && (
              <MetaRow label="Due">
                {formatDate(issue.dueDate)}
              </MetaRow>
            )}
          </div>

          {/* Quick status update */}
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Update Status</h3>
            <select
              defaultValue={issue.statusId}
              onChange={(e) => updateMutation.mutate({ statusId: e.target.value })}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              {project?.statuses?.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
