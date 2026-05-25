import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, Shield } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const ROLE_STYLES: Record<string, { bg: string; text: string }> = {
  platform_admin: { bg: '#f43f5e20', text: '#f43f5e' },
  user: { bg: '#6366f120', text: '#6366f1' },
};

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/api/v1/admin/users').then((r) => r.data.data),
  });

  const filtered = (users ?? []).filter((u: any) => {
    const q = search.toLowerCase();
    return !q || u.email?.toLowerCase().includes(q) || u.fullName?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Users</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{users?.length ?? 0} total</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users…"
            className="pl-9 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                {['User', 'Email', 'Role', 'Email Verified', 'Joined', 'Last Active'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : filtered.map((user: any) => {
                const roleStyle = ROLE_STYLES[user.platformRole ?? 'user'] ?? ROLE_STYLES.user;
                return (
                  <tr key={user.id} className="hover:opacity-90 transition-opacity" style={{ background: 'var(--bg-card)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.fullName} className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                            {user.fullName?.[0] ?? user.email?.[0] ?? '?'}
                          </div>
                        )}
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{user.fullName ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 w-fit"
                        style={{ background: roleStyle.bg, color: roleStyle.text }}
                      >
                        {user.platformRole === 'platform_admin' && <Shield size={10} />}
                        {user.platformRole ?? 'user'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.emailVerifiedAt ? (
                        <span className="text-xs text-green-400">Verified</span>
                      ) : (
                        <span className="text-xs text-yellow-400">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {user.createdAt ? formatDate(user.createdAt) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {user.lastActiveAt ? formatRelativeTime(user.lastActiveAt) : '—'}
                    </td>
                  </tr>
                );
              })}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
