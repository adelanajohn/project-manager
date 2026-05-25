import { Bell, Search, Sun, Moon, ChevronRight } from 'lucide-react';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { cn, getInitials } from '@/lib/utils';
import { endpoints } from '@/lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

export default function Header() {
  const { theme, toggleTheme, setCommandPaletteOpen } = useUIStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { orgSlug, projectKey } = useParams<{ orgSlug?: string; projectKey?: string }>();

  const handleLogout = async () => {
    try {
      await endpoints.auth.logout();
    } catch {}
    logout();
    navigate('/login');
  };

  return (
    <header
      className="flex items-center h-14 px-4 gap-4 border-b flex-shrink-0"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm min-w-0 flex-1">
        {orgSlug && (
          <>
            <span className="text-sm font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
              {orgSlug}
            </span>
            {projectKey && (
              <>
                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  {projectKey}
                </span>
              </>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 h-8 rounded-md text-sm transition-colors hover:bg-white/5"
          style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          aria-label="Open command palette"
        >
          <Search size={14} />
          <span className="hidden sm:block">Search</span>
          <kbd className="hidden sm:flex items-center gap-0.5 text-xs px-1 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <button
          className="w-8 h-8 rounded-md flex items-center justify-center transition-colors hover:bg-white/5 relative"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Notifications"
        >
          <Bell size={16} />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-md flex items-center justify-center transition-colors hover:bg-white/5"
          style={{ color: 'var(--text-muted)' }}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Avatar */}
        <div className="relative group">
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            aria-label="User menu"
            aria-haspopup="true"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full rounded-full object-cover" />
            ) : (
              getInitials(user?.fullName ?? 'U')
            )}
          </button>

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1 w-48 rounded-lg shadow-lg opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all z-50"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user?.fullName}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-white/5 rounded-b-lg"
              style={{ color: 'var(--text-secondary)' }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
