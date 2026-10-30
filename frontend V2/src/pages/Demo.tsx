import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';
import { Photo } from '../ui/Photo';
import { ErrorNote, Loading } from '../ui/Surface';
import { ROUTES } from '../constants/routes';
import { useAuthStore } from '../stores/auth.store';
import { useTripStore } from '../stores/trip.store';
import { demoService } from '../services/demo';
import { photoById } from '../lib/photos';

const PHOTO_FOR: Record<string, string> = {
  Agent: 'LOC_001',
  Family_Vacation: 'LOC_003',
  Luxury_Couple: 'LOC_005',
  Budget_Backpacker: 'LOC_011',
  Elderly_Travelers: 'LOC_013',
  Accessibility_Trip: 'LOC_004',
};

/** The hosted backend sleeps when idle; say so instead of leaving a dead page. */
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

export function Demo() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setCurrentTripId = useTripStore((s) => s.setCurrentTripId);
  const setLastJobId = useTripStore((s) => s.setLastJobId);
  const [entering, setEntering] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const personas = useQuery({ queryKey: ['demo-personas'], queryFn: demoService.listPersonas, retry: 2 });
  const slow = useSlowHint(personas.isLoading || entering !== null);

  const enter = async (id: string) => {
    setEntering(id);
    setError(null);
    try {
      const session = await demoService.enter(id);
      if (!session.access_token) throw new Error('The demo server did not return a session.');
      // Each visit starts clean so one persona's trip never leaks into another
      setCurrentTripId(null);
      setLastJobId(null);
      setAuth(session.user, session.access_token);
      navigate(ROUTES.APP);
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
    <div className="min-h-dvh bg-ground">
      <header className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <Link to={ROUTES.LOGIN} className="text-sm font-bold underline underline-offset-4 decoration-2">
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 pb-14 pt-4 sm:px-6">
        <h1 className="display text-[2.8rem] sm:text-[4.2rem]">
          Step into a <span className="mark mark-cyan">trip</span>.
        </h1>
        <p className="mt-3 max-w-[56ch] text-lg text-ink-2">
          Pick a role. Every trip here is seeded demo data. Approvals and feedback are real, and they change the shared
          demo until it is reset.
        </p>

        <div className="mt-5 space-y-3" aria-live="polite">
          {slow && (
            <p className="rounded-sm bg-yellow px-3 py-2 text-sm font-bold text-paper">
              The demo server runs on a free plan and sleeps when idle. Waking it can take up to a minute.
            </p>
          )}
          {(error || personas.isError) && (
            <div className="flex flex-wrap items-center gap-3">
              <ErrorNote>{error || 'Could not reach the demo server. Try again in a moment.'}</ErrorNote>
              {personas.isError && (
                <Button variant="ink" onClick={() => personas.refetch()}>
                  Retry
                </Button>
              )}
            </div>
          )}
        </div>
        {personas.isLoading && <Loading label="Loading the demo" />}

        {agent && (
          <section className="mt-8">
            <Photo
              photo={photoById(PHOTO_FOR[agent.id])}
              alt="The Red Fort in Delhi"
              scrim
              priority
              className="min-h-64 rounded-3xl shadow-[var(--shadow-card)]"
            >
              <div className="relative flex min-h-64 flex-wrap items-end justify-between gap-6 p-6 pr-[26%] text-paper sm:p-8 sm:pr-[26%]">
                <div className="max-w-[40ch]">
                  <p className="text-sm font-bold opacity-90">Start here</p>
                  <h2 className="display text-5xl sm:text-6xl">Travel agent</h2>
                  <p className="mt-3 font-bold">{agent.description}</p>
                </div>
                <Button size="lg" variant="cyan" loading={entering === agent.id} onClick={() => enter(agent.id)}>
                  Enter as agent
                </Button>
              </div>
            </Photo>
          </section>
        )}

        {travellers.length > 0 && (
          <section className="mt-10" aria-labelledby="travellers">
            <h2 id="travellers" className="title text-3xl sm:text-4xl">
              Or follow a traveller
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {travellers.map((p) => (
                <li key={p.id} className="flex flex-col overflow-hidden border border-rule bg-paper">
                  <Photo photo={photoById(PHOTO_FOR[p.id])} alt="" className="h-40" />
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="text-xl font-extrabold">{p.title}</h3>
                    <p className="mt-1 flex-1 text-ink-2">{p.description}</p>
                    <div className="mt-4">
                      <Button variant="ink" loading={entering === p.id} onClick={() => enter(p.id)}>
                        Enter as traveller
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="mt-6 text-sm text-ink-3">
          Photographs from Wikimedia Commons.{' '}
          <Link to="/credits" className="font-bold text-ink underline underline-offset-4">
            Credits
          </Link>
        </p>
      </main>
    </div>
  );
}
