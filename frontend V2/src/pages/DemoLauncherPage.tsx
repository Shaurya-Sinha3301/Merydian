import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ROUTES } from '../constants/routes';
import { useAuthStore } from '../stores/auth.store';
import { useTripStore } from '../stores/trip.store';
import { demoService } from '../services/demo';

const ICONS: Record<string, string> = {
  Agent: '🧭',
  Family_Vacation: '👨‍👩‍👧',
  Luxury_Couple: '🥂',
  Budget_Backpacker: '🎒',
  Elderly_Travelers: '🌿',
  Accessibility_Trip: '♿',
};

/** The hosted backend sleeps when idle; tell the visitor instead of leaving a dead page. */
function useSlowHint(active: boolean): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(() => setSlow(true), 4000);
    return () => {
      window.clearTimeout(t);
      setSlow(false);
    };
  }, [active]);
  return slow;
}

export function DemoLauncherPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setCurrentTripId = useTripStore((s) => s.setCurrentTripId);
  const setLastJobId = useTripStore((s) => s.setLastJobId);
  const [entering, setEntering] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const personas = useQuery({ queryKey: ['demo-personas'], queryFn: demoService.listPersonas, retry: 2 });
  const slow = useSlowHint(personas.isLoading || entering !== null);

  const handleEnter = async (personaId: string) => {
    setEntering(personaId);
    setError(null);
    try {
      const session = await demoService.enter(personaId);
      if (!session.access_token) throw new Error('The demo server did not return a session.');
      // Start each visit from a clean slate so one persona's trip never leaks into another
      setCurrentTripId(null);
      setLastJobId(null);
      setAuth(session.user, session.access_token);
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string; detail?: string } }; message?: string };
      setError(e.response?.data?.message || e.response?.data?.detail || e.message || 'Could not start the demo.');
    } finally {
      setEntering(null);
    }
  };

  const list = personas.data ?? [];
  const agent = list.find((p) => p.role === 'agent');
  const travellers = list.filter((p) => p.role === 'traveller');

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              Explore Merydian
            </h1>
            <p className="mt-2 max-w-xl" style={{ color: 'var(--muted-foreground)' }}>
              Step into a seeded trip as a traveller to see how feedback re-plans an itinerary, or as the travel agent to
              review what the AI agents did and approve their options.
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate(ROUTES.LANDING)}>
            Back
          </Button>
        </div>

        {slow && (
          <div className="p-4 rounded border text-sm" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}>
            The demo server runs on a free plan and sleeps when idle. Waking it up can take up to a minute.
          </div>
        )}
        {(error || personas.isError) && (
          <div className="p-4 rounded border text-sm" style={{ color: 'var(--error)', borderColor: 'var(--border)' }}>
            {error || 'Could not reach the demo server. Try again in a moment.'}
            {personas.isError && (
              <Button variant="secondary" size="sm" className="ml-3" onClick={() => personas.refetch()}>
                Retry
              </Button>
            )}
          </div>
        )}
        {personas.isLoading && <p className="text-sm">Loading demo personas...</p>}

        {agent && (
          <Card ai padding="md">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="text-4xl">{ICONS[agent.id]}</div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>{agent.title}</h2>
                    <Badge variant="ai">Start here</Badge>
                  </div>
                  <p className="text-sm max-w-lg" style={{ color: 'var(--muted-foreground)' }}>{agent.description}</p>
                </div>
              </div>
              <Button variant="primary" loading={entering === agent.id} onClick={() => handleEnter(agent.id)}>
                Enter as agent
              </Button>
            </div>
          </Card>
        )}

        {travellers.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Or follow a traveller
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {travellers.map((p) => (
                <Card key={p.id} padding="md" className="flex flex-col h-full">
                  <div className="text-3xl mb-3">{ICONS[p.id] ?? '🧳'}</div>
                  <h3 className="text-base font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>{p.title}</h3>
                  <p className="text-sm flex-1 mb-4" style={{ color: 'var(--muted-foreground)' }}>{p.description}</p>
                  <Button
                    variant="secondary"
                    className="w-full"
                    loading={entering === p.id}
                    onClick={() => handleEnter(p.id)}
                  >
                    Enter as traveller
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
