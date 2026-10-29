import type { ReactNode } from 'react';
import { Navigation } from './Navigation';
import { Sidebar } from './Sidebar';

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

interface AppShellProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  darkMode: boolean;
  onToggleDark: () => void;
  children: ReactNode;
  role?: 'customer' | 'agent';
}

export function AppShell({ currentPage, onNavigate, darkMode, onToggleDark, children, role: roleProp }: AppShellProps) {
  const role = roleProp ?? (currentPage === 'agent-dashboard' ? 'agent' : 'customer');

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Navigation
        darkMode={darkMode}
        onToggleDark={onToggleDark}
        currentPage={currentPage}
        onNavigate={onNavigate}
      />
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} role={role} />
      <main
        className="pt-12 pl-[240px] min-h-screen"
        style={{ backgroundColor: 'var(--background)' }}
      >
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
