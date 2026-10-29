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

interface NavItem {
  label: string;
  page: Page;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  role: 'customer' | 'agent';
}

function NavIcon({ children }: { children: React.ReactNode }) {
  return <span className="w-4 h-4 flex items-center justify-center shrink-0">{children}</span>;
}

const customerNav: NavItem[] = [
  {
    label: 'Dashboard',
    page: 'customer-dashboard',
    icon: (
      <NavIcon>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="1.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="9.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="1.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="9.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </NavIcon>
    ),
  },
  {
    label: 'Trip Overview',
    page: 'trip-overview',
    icon: (
      <NavIcon>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M8 1.5L10 6h4.5L11 9l1.5 4.5L8 11l-4.5 2.5L5 9 1.5 6H6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </NavIcon>
    ),
  },
  {
    label: 'Timeline',
    page: 'timeline',
    icon: (
      <NavIcon>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <line x1="8" y1="1.5" x2="8" y2="14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="4" r="2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="8" cy="9" r="2" stroke="currentColor" strokeWidth="1.5" />
          <line x1="3" y1="4" x2="6" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="3" y1="9" x2="6" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </NavIcon>
    ),
  },
  {
    label: 'Feedback',
    page: 'feedback',
    icon: (
      <NavIcon>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M2 2.5h12a.5.5 0 01.5.5v7a.5.5 0 01-.5.5H5l-3 2.5V3a.5.5 0 01.5-.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </NavIcon>
    ),
  },
  {
    label: 'Optimization',
    page: 'optimization-progress',
    icon: (
      <NavIcon>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 4.5v4l2.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </NavIcon>
    ),
  },
  {
    label: 'Diff Review',
    page: 'diff-viewer',
    icon: (
      <NavIcon>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="1.5" y="2.5" width="5.5" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="9" y="2.5" width="5.5" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <line x1="3.5" y1="6" x2="5.5" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="4.5" y1="5" x2="4.5" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="11" y1="6" x2="13" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </NavIcon>
    ),
  },
  {
    label: 'Explainability',
    page: 'explainability',
    icon: (
      <NavIcon>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="5" r="0.75" fill="currentColor" />
        </svg>
      </NavIcon>
    ),
  },
];

const agentNav: NavItem[] = [
  {
    label: 'Agent Dashboard',
    page: 'agent-dashboard',
    icon: (
      <NavIcon>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="1.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="9.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="1.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="9.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </NavIcon>
    ),
    badge: 3,
  },
  {
    label: 'Assigned Trips',
    page: 'trip-overview',
    icon: (
      <NavIcon>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M8 1.5L10 6h4.5L11 9l1.5 4.5L8 11l-4.5 2.5L5 9 1.5 6H6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </NavIcon>
    ),
  },
  {
    label: 'Diff Review',
    page: 'diff-viewer',
    icon: (
      <NavIcon>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="1.5" y="2.5" width="5.5" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="9" y="2.5" width="5.5" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <line x1="3.5" y1="6" x2="5.5" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="4.5" y1="5" x2="4.5" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="11" y1="6" x2="13" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </NavIcon>
    ),
    badge: 2,
  },
  {
    label: 'Explainability',
    page: 'explainability',
    icon: (
      <NavIcon>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="5" r="0.75" fill="currentColor" />
        </svg>
      </NavIcon>
    ),
  },
];

const bottomNav: NavItem[] = [
  {
    label: 'Settings',
    page: 'settings',
    icon: (
      <NavIcon>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </NavIcon>
    ),
  },
];

export function Sidebar({ currentPage, onNavigate, role }: SidebarProps) {
  const navItems = role === 'agent' ? agentNav : customerNav;
  const fullName = useAuthStore((s) => s.user?.full_name);

  const renderItem = (item: NavItem) => {
    const isActive = currentPage === item.page;
    return (
      <button
        key={item.page}
        onClick={() => onNavigate(item.page)}
        className="w-full flex items-center gap-2.5 h-8 px-3 rounded text-xs font-medium transition-colors duration-150"
        style={{
          color: isActive ? 'var(--primary)' : 'var(--muted-foreground)',
          backgroundColor: isActive ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'transparent',
        }}
        onMouseEnter={e => {
          if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--muted)';
          if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--foreground)';
        }}
        onMouseLeave={e => {
          if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)';
        }}
      >
        {item.icon}
        <span>{item.label}</span>
        {item.badge != null && (
          <span
            className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--warning)', color: '#000' }}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      className="fixed left-0 top-12 bottom-0 w-[240px] flex flex-col py-4 overflow-y-auto"
      style={{ borderRight: '1px solid var(--border)', backgroundColor: 'var(--background)' }}
    >
      {/* Role switcher removed */}

      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(renderItem)}
      </nav>

      <div className="px-3 pt-4 space-y-0.5" style={{ borderTop: '1px solid var(--border)' }}>
        {bottomNav.map(renderItem)}
        <div className="flex items-center gap-2.5 px-3 py-2 mt-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            {(fullName || (role === 'agent' ? 'TA' : 'TR')).slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{fullName || (role === 'agent' ? 'Travel agent' : 'Traveller')}</p>
            <p className="text-[10px] truncate" style={{ color: 'var(--muted-foreground)' }}>
              {role === 'agent' ? 'Travel agent' : 'Traveller'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
