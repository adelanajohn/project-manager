import { NavLink, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Shield,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/lib/api';

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { user } = useAuthStore();
  const { orgSlug } = useParams<{ orgSlug?: string }>();

  const { data: orgsData } = useQuery({
    queryKey: ['orgs'],
    queryFn: () => endpoints.orgs.list().then((r) => r.data.data),
  });

  const currentOrg = orgsData?.find((o: any) => o.slug === orgSlug) ?? orgsData?.[0];

  const navItems = currentOrg
    ? [
        { icon: LayoutDashboard, label: 'Dashboard', to: `/${currentOrg.slug}` },
        { icon: FolderOpen, label: 'Projects', to: `/${currentOrg.slug}/projects` },
        { icon: CheckSquare, label: 'My Issues', to: `/${currentOrg.slug}/my-issues` },
        { icon: Bell, label: 'Inbox', to: `/${currentOrg.slug}/inbox` },
        { icon: Settings, label: 'Settings', to: `/${currentOrg.slug}/settings` },
      ]
    : [];

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 240 : 56 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-full flex flex-col overflow-hidden z-20"
      style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border)' }}
      aria-label="Sidebar navigation"
    >
      {/* Logo / Org switcher */}
      <div className="flex items-center h-14 px-3 border-b" style={{ borderColor: 'var(--border)' }}>
        {sidebarOpen ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              {currentOrg?.name?.[0] ?? 'P'}
            </div>
            <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {currentOrg?.name ?? 'Project Manager'}
            </span>
          </div>
        ) : (
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold mx-auto"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            {currentOrg?.name?.[0] ?? 'P'}
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to.split('/').length === 2}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 h-9 mx-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-indigo-500/10 text-indigo-400 font-medium'
                  : 'hover:bg-white/5'
              )
            }
            style={({ isActive }) => ({ color: isActive ? '#818cf8' : 'var(--text-secondary)' })}
            title={!sidebarOpen ? item.label : undefined}
          >
            <item.icon size={16} className="flex-shrink-0" />
            {sidebarOpen && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}

        {/* Platform admin link */}
        {user?.platformRole === 'platform_admin' && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 h-9 mx-2 rounded-md text-sm transition-colors mt-2',
                isActive ? 'bg-rose-500/10 text-rose-400 font-medium' : 'hover:bg-white/5'
              )
            }
            style={({ isActive }) => ({ color: isActive ? '#fb7185' : 'var(--text-secondary)' })}
            title={!sidebarOpen ? 'Admin' : undefined}
          >
            <Shield size={16} className="flex-shrink-0" />
            {sidebarOpen && <span>Admin</span>}
          </NavLink>
        )}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center h-10 border-t transition-colors hover:bg-white/5"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
    </motion.aside>
  );
}
