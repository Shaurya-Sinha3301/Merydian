import { LoginForm } from '../features/authentication/LoginForm';

import { useNavigate } from 'react-router-dom';
import { useTheme } from '../providers/ThemeProvider';
import { ROUTES } from '../constants/routes';

export function LoginPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  
  const handleLogin = () => {
    navigate(ROUTES.DASHBOARD);
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--background)' }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 p-12"
        style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
      >
        <div>
          <div className="flex items-center gap-2 mb-16">
            <div
              className="w-7 h-7 rounded flex items-center justify-center text-sm font-bold"
              style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
            >
              M
            </div>
            <span className="font-semibold text-base tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              merydian
            </span>
          </div>
          <h1
            className="text-3xl font-bold leading-tight mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            AI-powered itinerary optimization for travel professionals.
          </h1>
          <p className="text-sm leading-relaxed" style={{ opacity: 0.6 }}>
            Every change the AI proposes is explained. Every decision is yours.
          </p>
        </div>

        <div className="space-y-6">
          {[
            { label: 'Explained', value: 'Every change comes with a reason' },
            { label: 'Human in the loop', value: 'Agents approve before anything is final' },
          ].map(stat => (
            <div key={stat.label} style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }} className="pt-4">
              <p className="text-base font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{stat.value}</p>
              <p className="text-xs mt-1" style={{ opacity: 0.5 }}>{stat.label}</p>
            </div>
          ))}
        </div>

        <p className="text-xs" style={{ opacity: 0.4 }}>An academic project. Demo data only.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              M
            </div>
            <span className="font-semibold text-sm" style={{ fontFamily: 'var(--font-display)' }}>merydian</span>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)' }}>
              Sign in to your account
            </h2>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              No account?{' '}
              <button type="button" onClick={() => navigate(ROUTES.DEMO)} style={{ color: 'var(--primary)' }}>Explore the demo</button>
            </p>
          </div>

          <LoginForm onLogin={handleLogin} />
        </div>

        {/* Dark mode */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="fixed top-4 right-4 w-8 h-8 flex items-center justify-center rounded transition-colors duration-150"
          style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--muted-foreground)' }}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </div>
  );
}
