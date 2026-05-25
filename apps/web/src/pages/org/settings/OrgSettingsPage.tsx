import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Settings, Users, Shield, Mail, Trash2, Crown, ChevronRight } from 'lucide-react';
import { endpoints } from '@/lib/api';
import { cn, formatRelativeTime } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toast } from 'sonner';

type Tab = 'general' | 'members' | 'security';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'security', label: 'Security', icon: Shield },
];

const ROLE_COLORS: Record<string, string> = {
  owner: '#f43f5e',
  admin: '#f97316',
  member: '#6366f1',
  viewer: '#64748b',
};

function GeneralTab({ org }: { org: any }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { isDirty } } = useForm({
    defaultValues: { name: org.name, slug: org.slug },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => endpoints.orgs.update(org.id, data),
    onSuccess: () => {
      toast.success('Organization updated');
      qc.invalidateQueries({ queryKey: ['orgs'] });
    },
    onError: () => toast.error('Failed to update organization'),
  });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="rounded-xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Organization Details</h3>
        <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Organization Name
            </label>
            <input
              {...register('name', { required: true })}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Slug
            </label>
            <div className="flex items-center">
              <span className="px-3 py-2 rounded-l-lg text-sm" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRight: 'none', color: 'var(--text-muted)' }}>
                pm.app/
              </span>
              <input
                {...register('slug', { required: true })}
                className="flex-1 rounded-r-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!isDirty || updateMutation.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h3 className="font-semibold mb-1" style={{ color: '#ef4444' }}>Danger Zone</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Irreversible actions for this organization.</p>
        <button className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2">
          <Trash2 size={14} />
          Delete Organization
        </button>
      </div>
    </motion.div>
  );
}

function MembersTab({ org }: { org: any }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset } = useForm<{ email: string; role: string }>({
    defaultValues: { role: 'member' },
  });

  const { data: members, isLoading } = useQuery({
    queryKey: ['org-members', org.id],
    queryFn: () => endpoints.orgs.members(org.id).then((r) => r.data.data),
  });

  const inviteMutation = useMutation({
    mutationFn: (data: any) => endpoints.orgs.invite(org.id, data),
    onSuccess: () => {
      toast.success('Invite sent');
      reset();
      qc.invalidateQueries({ queryKey: ['org-members', org.id] });
    },
    onError: () => toast.error('Failed to send invite'),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => endpoints.orgs.removeMember(org.id, userId),
    onSuccess: () => {
      toast.success('Member removed');
      qc.invalidateQueries({ queryKey: ['org-members', org.id] });
    },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Invite form */}
      <div className="rounded-xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Invite Member</h3>
        <form onSubmit={handleSubmit((d) => inviteMutation.mutate(d))} className="flex gap-3">
          <input
            {...register('email', { required: true })}
            type="email"
            placeholder="Email address"
            className="flex-1 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <select
            {...register('role')}
            className="rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            type="submit"
            disabled={inviteMutation.isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <Mail size={14} />
            {inviteMutation.isPending ? 'Sending…' : 'Send Invite'}
          </button>
        </form>
      </div>

      {/* Members list */}
      <div className="rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Members <span className="text-sm font-normal ml-1" style={{ color: 'var(--text-muted)' }}>({members?.length ?? 0})</span>
          </h3>
        </div>
        {isLoading ? (
          <div className="p-6 flex justify-center"><LoadingSpinner /></div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {members?.map((m: any) => (
              <div key={m.userId} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                    {m.user?.fullName?.[0] ?? m.user?.email?.[0] ?? '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{m.user?.fullName ?? m.user?.email}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: `${ROLE_COLORS[m.role] ?? '#6366f1'}20`, color: ROLE_COLORS[m.role] ?? '#6366f1' }}
                  >
                    {m.role === 'owner' && <Crown size={10} className="inline mr-1" />}
                    {m.role}
                  </span>
                  {m.role !== 'owner' && (
                    <button
                      onClick={() => removeMutation.mutate(m.userId)}
                      className="p-1 rounded hover:bg-red-500/10 transition-colors"
                      aria-label="Remove member"
                    >
                      <Trash2 size={14} style={{ color: 'var(--text-muted)' }} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SecurityTab() {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => endpoints.auth.sessions().then((r) => r.data.data),
  });
  const qc = useQueryClient();

  const revokeMutation = useMutation({
    mutationFn: (id: string) => endpoints.auth.revokeSession(id),
    onSuccess: () => {
      toast.success('Session revoked');
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Active Sessions</h3>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Manage where you're logged in.</p>
        </div>
        {isLoading ? (
          <div className="p-6 flex justify-center"><LoadingSpinner /></div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {sessions?.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {s.userAgent ?? 'Unknown device'}
                    {s.isCurrent && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-green-500/20 text-green-400">Current</span>
                    )}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {s.ipAddress} · Last active {formatRelativeTime(s.lastUsedAt ?? s.createdAt)}
                  </p>
                </div>
                {!s.isCurrent && (
                  <button
                    onClick={() => revokeMutation.mutate(s.id)}
                    disabled={revokeMutation.isPending}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors border"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function OrgSettingsPage() {
  const { orgSlug, tab } = useParams<{ orgSlug: string; tab?: string }>();
  const [activeTab, setActiveTab] = useState<Tab>((tab as Tab) ?? 'general');

  const { data: orgs } = useQuery({
    queryKey: ['orgs'],
    queryFn: () => endpoints.orgs.list().then((r) => r.data.data),
  });
  const org = orgs?.find((o: any) => o.slug === orgSlug);

  if (!org) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Organization Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage {org.name}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center',
              activeTab === t.id
                ? 'text-white shadow-sm'
                : 'hover:opacity-80'
            )}
            style={activeTab === t.id
              ? { background: 'var(--bg-card)', color: 'var(--text-primary)' }
              : { color: 'var(--text-muted)' }
            }
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'general' && <GeneralTab key="general" org={org} />}
        {activeTab === 'members' && <MembersTab key="members" org={org} />}
        {activeTab === 'security' && <SecurityTab key="security" />}
      </AnimatePresence>
    </div>
  );
}
