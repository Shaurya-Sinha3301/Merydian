import { useState } from 'react';
import { useLogout } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/auth.store';

type Page =
  | 'login'
  | 'customer-dashboard'
  | 'agent-dashboard'
  | 'trip-overview'
  | 'timeline'
  | 'feedback'
  | 'optimization-progress'
  | 'diff-viewer'
  | 'explainability'
  | 'settings';

interface NavigationProps {
  darkMode: boolean;
  onToggleDark: () => void;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export function Navigation({ darkMode, onToggleDark }: NavigationProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user } = useAuthStore();
  const { mutate: logout } = useLogout();
  
  const handleLogout = () => {
    logout({});
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center px-4 gap-4"
      style={{
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--background)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 w-[224px] shrink-0">
        <div
          className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
          style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          M
        </div>
        <span className="font-semibold text-sm tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          merydian
        </span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-sm">
        <button
          className="w-full flex items-center gap-2 h-8 px-3 rounded text-xs transition-colors duration-150 cursor-text"
          style={{
            border: '1px solid var(--border)',
            backgroundColor: 'var(--muted)',
            color: 'var(--muted-foreground)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>Search trips, optimizations…</span>
          <span className="ml-auto font-mono text-[10px] px-1 rounded" style={{ border: '1px solid var(--border)' }}>
            ⌘K
          </span>
        </button>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Dark mode */}
        <button
          onClick={onToggleDark}
          className="w-8 h-8 flex items-center justify-center rounded transition-colors duration-150 hover:bg-muted"
          title={darkMode ? 'Light mode' : 'Dark mode'}
        >
          {darkMode ? (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 1v1M8 14v1M1 8h1M14 8h1M3.05 3.05l.7.7M12.25 12.25l.7.7M3.05 12.95l.7-.7M12.25 3.75l.7-.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M13.5 10.5A6 6 0 015.5 2.5a6.5 6.5 0 108 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="w-8 h-8 flex items-center justify-center rounded transition-colors duration-150 hover:bg-muted relative"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5a5 5 0 015 5v2.5l1 2H2l1-2V6.5a5 5 0 015-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M6.5 13.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          {notifOpen && (
            <div
              className="absolute right-0 top-10 w-72 rounded-lg z-50 py-2"
              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)' }}
            >
              <div className="px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-semibold">Notifications</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border)' }} />
              <p className="px-4 py-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                You're all caught up. Updates about your trip show up here.
              </p>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 h-8 px-2 rounded transition-colors duration-150 hover:bg-muted"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              {user?.role === 'agent' ? 'AG' : 'CU'}
            </div>
            <span className="text-xs font-medium">{user?.full_name || (user?.role === 'agent' ? 'Agent' : 'Traveller')}</span>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ color: 'var(--muted-foreground)' }}>
              <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          
          {profileOpen && (
            <div
              className="absolute right-0 top-10 w-48 rounded-lg z-50 py-1"
              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)' }}
            >
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-muted transition-colors duration-150 text-red-500"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
