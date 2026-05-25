import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Edit2, Check, X, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toast } from 'sonner';

function ContentBlock({ block }: { block: any }) {
  if (!block) return null;

  switch (block.type) {
    case 'heading': {
      const text = block.content?.map((c: any) => c.text ?? '').join('') ?? '';
      const level = block.attrs?.level ?? 1;
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      return <Tag className="font-bold mt-4 mb-2" style={{ color: 'var(--text-primary)', fontSize: level === 1 ? '1.25rem' : level === 2 ? '1.1rem' : '1rem' }}>{text}</Tag>;
    }
    case 'paragraph': {
      const text = block.content?.map((c: any) => c.text ?? '').join('') ?? '';
      return <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>{text || <span className="opacity-30">Empty paragraph</span>}</p>;
    }
    case 'bulletList':
      return (
        <ul className="list-disc list-inside space-y-1 mb-2">
          {block.content?.map((item: any, i: number) => (
            <li key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {item.content?.[0]?.content?.map((c: any) => c.text ?? '').join('') ?? ''}
            </li>
          ))}
        </ul>
      );
    case 'orderedList':
      return (
        <ol className="list-decimal list-inside space-y-1 mb-2">
          {block.content?.map((item: any, i: number) => (
            <li key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {item.content?.[0]?.content?.map((c: any) => c.text ?? '').join('') ?? ''}
            </li>
          ))}
        </ol>
      );
    case 'codeBlock': {
      const code = block.content?.map((c: any) => c.text ?? '').join('') ?? '';
      return (
        <pre className="text-xs rounded-lg p-3 mb-2 overflow-auto" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
          {code}
        </pre>
      );
    }
    default:
      return null;
  }
}

function DocContent({ content }: { content: any }) {
  if (!content) {
    return <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>This page is empty. Start editing to add content.</p>;
  }
  if (typeof content === 'string') {
    return <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{content}</p>;
  }
  const blocks = content.content ?? (Array.isArray(content) ? content : []);
  if (blocks.length === 0) {
    return <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>This page is empty.</p>;
  }
  return (
    <div>
      {blocks.map((block: any, i: number) => (
        <ContentBlock key={i} block={block} />
      ))}
    </div>
  );
}

export default function DocDetailPage() {
  const { orgSlug, projectKey, pageId } = useParams<{ orgSlug: string; projectKey: string; pageId: string }>();
  const qc = useQueryClient();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  const { data: doc, isLoading } = useQuery({
    queryKey: ['doc', pageId],
    queryFn: () => api.get(`/api/v1/docs/${pageId}`).then((r) => r.data.data),
    enabled: !!pageId,
  });

  useEffect(() => {
    if (doc) setTitleValue(doc.title ?? '');
  }, [doc?.title]);

  const updateMutation = useMutation({
    mutationFn: (data: { title?: string; content?: any }) =>
      api.patch(`/api/v1/docs/${pageId}`, data),
    onSuccess: () => {
      toast.success('Saved');
      setEditingTitle(false);
      qc.invalidateQueries({ queryKey: ['doc', pageId] });
    },
    onError: () => toast.error('Failed to save'),
  });

  if (isLoading) return <LoadingSpinner />;
  if (!doc) {
    return (
      <div className="flex items-center justify-center p-12">
        <p style={{ color: 'var(--text-muted)' }}>Page not found.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        {/* Breadcrumb */}
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          {orgSlug} / {projectKey} / Docs
        </p>

        {/* Title */}
        {editingTitle ? (
          <div className="flex items-center gap-2">
            <input
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              autoFocus
              className="flex-1 text-2xl font-bold rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') updateMutation.mutate({ title: titleValue });
                if (e.key === 'Escape') { setEditingTitle(false); setTitleValue(doc.title ?? ''); }
              }}
            />
            <button onClick={() => updateMutation.mutate({ title: titleValue })} className="p-2 rounded-lg hover:bg-green-500/10" aria-label="Save">
              <Check size={18} style={{ color: '#10b981' }} />
            </button>
            <button onClick={() => { setEditingTitle(false); setTitleValue(doc.title ?? ''); }} className="p-2 rounded-lg hover:bg-red-500/10" aria-label="Cancel">
              <X size={18} style={{ color: '#ef4444' }} />
            </button>
          </div>
        ) : (
          <div className="group flex items-start gap-2">
            <h1 className="text-2xl font-bold flex-1" style={{ color: 'var(--text-primary)' }}>
              {doc.title || 'Untitled'}
            </h1>
            <button
              onClick={() => setEditingTitle(true)}
              className="p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity mt-1"
              aria-label="Edit title"
            >
              <Edit2 size={15} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-1.5 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Clock size={11} />
          <span>Updated {formatRelativeTime(doc.updatedAt)}</span>
          {doc.author && <span>· by {doc.author.fullName}</span>}
        </div>
      </div>

      {/* Content */}
      <div
        className="rounded-xl p-6 min-h-[300px]"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <DocContent content={doc.content} />
      </div>

      {/* Metadata */}
      <div className="text-xs flex flex-wrap gap-4" style={{ color: 'var(--text-muted)' }}>
        {doc.createdAt && <span>Created {formatRelativeTime(doc.createdAt)}</span>}
        {doc.wordCount && <span>{doc.wordCount} words</span>}
      </div>
    </motion.div>
  );
}
